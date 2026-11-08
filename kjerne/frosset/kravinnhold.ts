/**
 * Tilgangen til kravinnholdet: kategorien i påberopelsen og kravpostene og de krevde beløpene
 * i vederlagskravet, lest av den lagrede kravversjonen. Utregningen, kontrollene og brevet
 * leser kravet herfra (#508, #1695).
 */

import { beloep, UgyldigBeloep, type Oere } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { foersteUnderkategori } from '../regler/forhold.ts';
import { tekst } from '../format/skjema.ts';
import type { Krav, Kravpost, Oppgjoersform } from '../typer.ts';

/** Hovedkategorien og den første underkategorien i påberopelsen. */
export function kategori(krav: Pick<Krav, 'innhold'> | null | undefined) {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: foersteUnderkategori(innhold.underkategori as string | string[] | null),
  };
}

/**
 * Et krevd beløp i vederlagskravet, i øre, eller `null` når det ikke står i kravet. Et
 * beløp som ikke er et tall, kaster `Error` og ikke `UgyldigBeloep`: det står i kravet,
 * så det er en feil på serveren og ikke byggherrens ugyldige vurdering (#766).
 */
function lesKrevd(krav: Krav, verdi: unknown): Oere | null {
  try {
    return beloep(verdi as number | undefined);
  } catch (feil) {
    if (!(feil instanceof UgyldigBeloep)) throw feil;
    throw new Error(`Det krevde beløpet i kravet ${krav.id} kan ikke leses: ${feil.message}.`);
  }
}

/** OV-U23: kravet krever posten etter § 34.1.3 annet ledd (`saerskilt.produktivitet`). */
export const harProduktivitetspost = (krav: Krav): boolean =>
  (krav.innhold.saerskilt as { produktivitet?: unknown } | undefined)?.produktivitet !== undefined;

/** Kravpostene i en lagret kravversjon (OV-U95 punkt 19). */
export const kravposterI = (krav: Pick<Krav, 'innhold'>): readonly Kravpost[] =>
  (krav.innhold.kravposter as Kravpost[] | undefined) ?? [];

/** OV-U95 punkt 19: kravet har kravposter i vederlagsjusteringen, i tillegg til eller uten postene utenfor. */
export const harHovedbeloep = (krav: Krav): boolean => kravposterI(krav).length > 0;

/**
 * Det som hindrer byggherrens svar med standpunktene i dag, eller `null` når svaret kan gis:
 * høyst én kravpost, med fast sum, og ikke rigg og drift. Svaret per kravpost (KA-U59,
 * OV-U95 punkt 23) er ikke bygget (#1663), og et svar med ett beløp for flere poster ville
 * bryte det.
 */
export function hindrerSvarMedEttBeloep(krav: Krav): string | null {
  const poster = kravposterI(krav);
  if (poster.length > 1) return `Kravet har ${poster.length} kravposter`;
  if (poster.some((p) => p.oppgjoersform !== 'tilbud'))
    return `Kravposten ${poster[0]!.betegnelse} følger en beregningsregel`;
  if (krevdRigg(krav) !== null) return 'Kravet har rigg og drift i forlenget byggetid';
  return null;
}

/**
 * Det krevde beløpet i kravposten, i øre, slik utregningen, kontrollen av begrunnelsen og
 * brevet leser det (#508). Har kravet ikke nøyaktig én kravpost med fast sum, kaster den
 * `UgyldigVurdering`, så et svar med ett beløp avvises og ikke gir en feil på serveren. Et
 * krav med bare postene utenfor leses med `harHovedbeloep` først (OV-U23), og svaret tilbys
 * ikke for et krav `hindrerSvarMedEttBeloep` gir et hinder for.
 */
export function krevdBeloep(krav: Krav): Oere {
  const poster = kravposterI(krav);
  if (poster.length !== 1 || poster[0].oppgjoersform !== 'tilbud')
    throw new UgyldigVurdering({
      hovedkrav_vurdering: `kravet ${krav.id} har ikke nøyaktig én kravpost med fast sum`,
    });
  const krevd = lesKrevd(krav, poster[0].beloep);
  if (krevd === null) throw new Error(`Det krevde beløpet mangler i kravet ${krav.id}.`);
  return krevd;
}

/**
 * Oppgjørsformen når alle kravpostene har samme, ellers `null`. Visningen leser den til
 * svaret per kravpost er bygget (økt 2 i #1663); ingen regel leser den.
 */
export function fellesOppgjoersform(krav: Pick<Krav, 'innhold'>): Oppgjoersform | null {
  const former = new Set(kravposterI(krav).map((p) => p.oppgjoersform));
  return former.size === 1 ? [...former][0]! : null;
}

/**
 * Beløpet i kroner når kravet har nøyaktig én kravpost, med fast sum, ellers `undefined`.
 * Visningen leser det til svaret per kravpost er bygget (økt 2 i #1663); ingen regel leser det.
 */
export function fastSumIKroner(krav: Pick<Krav, 'innhold'>): number | undefined {
  const poster = kravposterI(krav);
  return poster.length === 1 && poster[0]!.oppgjoersform === 'tilbud'
    ? poster[0]!.beloep
    : undefined;
}

/** Det krevde beløpet i en kravpost med fast sum, i øre, eller `null` etter en beregningsregel. */
export const krevdIKravposten = (krav: Krav, post: Kravpost): Oere | null =>
  post.oppgjoersform === 'tilbud' ? lesKrevd(krav, post.beloep) : null;

/** Det krevde beløpet for rigg og drift i forlenget byggetid, i øre, eller `null` uten posten (OV-U89 punkt 17). */
export const krevdRigg = (krav: Krav): Oere | null =>
  lesKrevd(
    krav,
    (krav.innhold.saerskilt as { rigg_og_drift?: { beloep?: unknown } } | undefined)?.rigg_og_drift
      ?.beloep
  );

/** Det krevde beløpet i posten etter § 34.1.3 annet ledd, i øre, eller `null` uten posten. */
export const krevdProduktivitet = (krav: Krav): Oere | null =>
  lesKrevd(
    krav,
    (krav.innhold.saerskilt as { produktivitet?: { beloep?: unknown } } | undefined)?.produktivitet
      ?.beloep
  );

/**
 * Summen av de krevde faste beløpene i kravet, i øre: kravpostene med fast sum, kravet etter
 * § 34.1.3 annet ledd og rigg og drift. En kravpost etter en beregningsregel har ikke et krevd
 * beløp og regnes ikke med (OV-U95 punkt 2 og 19, OV-U73).
 */
export const krevdSamlet = (krav: Krav): Oere =>
  kravposterI(krav).reduce((sum, p) => sum + (krevdIKravposten(krav, p) ?? 0n), 0n) +
  (krevdProduktivitet(krav) ?? 0n) +
  (krevdRigg(krav) ?? 0n);
