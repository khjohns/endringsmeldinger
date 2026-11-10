/**
 * Tilgangen til kravinnholdet: kategorien i påberopelsen og kravpostene og de krevde beløpene
 * i vederlagskravet, lest av den lagrede kravversjonen. Utregningen, kontrollene og brevet
 * leser kravet herfra (#508, #1695).
 */

import { beloep, UgyldigBeloep, type Oere } from '../regler/beloep.ts';
import { foersteUnderkategori } from '../regler/forhold.ts';
import { tekst } from '../format/skjema.ts';
import type { Krav, Kravpost, OppgittDatofelt } from '../typer.ts';

/**
 * Påberopelsen av forholdet, etter `KRAVINNHOLD.forhold`. Kategorien er tekst og ikke
 * `Hovedkategori`: det syntetiske kravet i `svaretBlirEndringsordre` er ikke lest mot skjemaet.
 * Datoene er valgfrie (VS-U26).
 */
export interface Forholdsinnhold {
  hovedkategori: string | null;
  underkategori: string | null;
  endringsordre: string | null;
  datoer: Readonly<Record<OppgittDatofelt, string | null>>;
}

/** Vederlagskravet, etter `KRAVINNHOLD.vederlag`: kravpostene, postene utenfor dem og trekket. */
export interface Vederlagsinnhold {
  kravposter: readonly Kravpost[];
  saerskilt: { produktivitet?: { beloep: number }; rigg_og_drift?: { beloep: number } };
  trekker: readonly string[];
}

/** Fristkravet, etter `KRAVINNHOLD.frist`. */
export interface Fristinnhold {
  dager: number;
}

/** Påberopelsen av forholdet i kravet. Uten krav er alle feltene `null`. */
export function innholdIForholdet(krav: Pick<Krav, 'innhold'> | null | undefined): Forholdsinnhold {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: foersteUnderkategori(innhold.underkategori as string | string[] | null),
    endringsordre: tekst(innhold.endringsordre),
    datoer: {
      paalegg_mottatt: tekst(innhold.paalegg_mottatt),
      klar_over_forholdet: tekst(innhold.klar_over_forholdet),
    },
  };
}

/** Vederlagskravet i kravet. */
export function innholdIVederlaget(krav: Pick<Krav, 'innhold'>): Vederlagsinnhold {
  const innhold = krav.innhold as Partial<Vederlagsinnhold>;
  return {
    kravposter: innhold.kravposter ?? [],
    saerskilt: innhold.saerskilt ?? {},
    trekker: innhold.trekker ?? [],
  };
}

/** Fristkravet i kravet. */
export const innholdIFristen = (krav: Pick<Krav, 'innhold'>): Fristinnhold => ({
  dager: krav.innhold.dager as number,
});

/** Hovedkategorien og den første underkategorien i påberopelsen. */
export function kategori(krav: Pick<Krav, 'innhold'> | null | undefined) {
  const { hovedkategori, underkategori } = innholdIForholdet(krav);
  return { hovedkategori, underkategori };
}

/**
 * Et krevd beløp i vederlagskravet, i øre, eller `null` når det ikke står i kravet. Et
 * beløp som ikke er et tall, kaster `Error` og ikke `UgyldigBeloep`: det står i kravet,
 * så det er en feil på serveren og ikke byggherrens ugyldige vurdering (#766).
 */
function lesKrevd(krav: Krav, verdi: number | undefined): Oere | null {
  try {
    return beloep(verdi);
  } catch (feil) {
    if (!(feil instanceof UgyldigBeloep)) throw feil;
    throw new Error(`Det krevde beløpet i kravet ${krav.id} kan ikke leses: ${feil.message}.`);
  }
}

/** OV-U23: kravet krever posten etter § 34.1.3 annet ledd (`saerskilt.produktivitet`). */
export const harProduktivitetspost = (krav: Krav): boolean =>
  innholdIVederlaget(krav).saerskilt.produktivitet !== undefined;

/** Kravpostene i en lagret kravversjon (OV-U95 punkt 19). */
export const kravposterI = (krav: Pick<Krav, 'innhold'>): readonly Kravpost[] =>
  innholdIVederlaget(krav).kravposter;

/** OV-U95 punkt 19: kravet har kravposter i vederlagsjusteringen, i tillegg til eller uten postene utenfor. */
export const harHovedbeloep = (krav: Krav): boolean => kravposterI(krav).length > 0;

/**
 * Det som hindrer byggherrens svar med standpunktene i dag, eller `null` når svaret kan gis.
 * Svaret på rigg og drift er ikke bygget; posten går i en egen bestilling (arbeidsvalg 5 i
 * spørsmålsfila 10.11 for #1663).
 */
export function hindrerSvarPaaKravet(krav: Krav): string | null {
  return krevdRigg(krav) !== null ? 'Kravet har rigg og drift i forlenget byggetid' : null;
}

/** Det krevde beløpet i en kravpost med fast sum, i øre, eller `null` etter en beregningsregel. */
export const krevdIKravposten = (krav: Krav, post: Kravpost): Oere | null =>
  post.oppgjoersform === 'tilbud' ? lesKrevd(krav, post.beloep) : null;

/** Det krevde beløpet for rigg og drift i forlenget byggetid, i øre, eller `null` uten posten (OV-U89 punkt 17). */
export const krevdRigg = (krav: Krav): Oere | null =>
  lesKrevd(krav, innholdIVederlaget(krav).saerskilt.rigg_og_drift?.beloep);

/** Det krevde beløpet i posten etter § 34.1.3 annet ledd, i øre, eller `null` uten posten. */
export const krevdProduktivitet = (krav: Krav): Oere | null =>
  lesKrevd(krav, innholdIVederlaget(krav).saerskilt.produktivitet?.beloep);

/**
 * Summen av de krevde faste beløpene i kravet, i øre: kravpostene med fast sum, kravet etter
 * § 34.1.3 annet ledd og rigg og drift. En kravpost etter en beregningsregel har ikke et krevd
 * beløp og regnes ikke med (OV-U95 punkt 2 og 19, OV-U73).
 */
export const krevdSamlet = (krav: Krav): Oere =>
  kravposterI(krav).reduce((sum, p) => sum + (krevdIKravposten(krav, p) ?? 0n), 0n) +
  (krevdProduktivitet(krav) ?? 0n) +
  (krevdRigg(krav) ?? 0n);
