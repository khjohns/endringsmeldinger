/**
 * Kommandoene Varden sender (#1331), i kjernens format. Svaret på vederlagskravet har
 * vurderingene BH har valgt i skjemaet, og resultatet regnes av kjernen (`regnUtSvar`), som
 * i dagens skjema (#1301). Er vurderingene ufullstendige, er resultatet tomt, og kjernen
 * avviser kommandoen med sin egen melding før brevet vises.
 */

import { regnUtSvar } from '$kjerne/frosset/utregning';
import { type Svarvurdering } from '$kjerne/frosset/byggeklosser';
import { UgyldigBeloep } from '$kjerne/regler/beloep';
import { UgyldigVurdering } from '$kjerne/regler/feil';
import type { Regelsett } from '$kjerne/regler/regelsett';
import type { Svarutkast } from '$kjerne/kommandoer/kommando';
import type { Krav, Spor } from '$kjerne/typer';
import { KRAVINNHOLD, oppgittDato } from '$kjerne/format/format';
import type { Utledning } from '$kjerne/utledning/utled';
import { lesKroner } from '$lib/utils/belop';
import { kravposterI } from '$kjerne/spor/vederlag/format';

export type Beloepsvalg = 'hele' | 'deler' | 'ingenting';

/** Oppgjørsformen BH godkjenner (`tilbud`) eller mener for en kravpost med fast sum (§ 34.2.2, KA-U57 (d)). */
export type Formvalg = 'tilbud' | 'enhetspriser' | 'regningsarbeid';

/** Det BH har valgt for én kravpost. `null` er ikke besvart. */
export interface Postvalg {
  form: Formvalg | null;
  beloep: Beloepsvalg | null;
  /** Teksten BH skrev i beløpsfeltet, lest med `lesKroner` (OV-U58). */
  delbeloep: string;
}

/**
 * Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt. Svaret på
 * hver kravpost står under betegnelsen, som er unik i kravet (KA-U53).
 */
export interface Svarvalg {
  iTide: boolean | null;
  poster: Record<string, Postvalg>;
  begrunnelse: string;
}

export const tomPost = (): Postvalg => ({ form: null, beloep: null, delbeloep: '' });

export const tomtSvar = (): Svarvalg => ({ iTide: null, poster: {}, begrunnelse: '' });

/** Valgene for kravposten med betegnelsen, eller en ubesvart post. */
export const postvalget = (v: Svarvalg, betegnelse: string): Postvalg =>
  v.poster[betegnelse] ?? tomPost();

/**
 * Skjemaet spør om beløpet bare når BH ikke mener en annen oppgjørsform (KA-U72). Valget for
 * beløpet står likevel, så det er der igjen om BH godkjenner fast sum.
 */
export const spoerOmBeloepet = (p: Postvalg): boolean =>
  p.form !== 'enhetspriser' && p.form !== 'regningsarbeid';

/** Valget for beløpet, eller `null` når det ikke er besvart eller skjemaet ikke spør (KA-U72). */
export const beloepsvalget = (p: Postvalg): Beloepsvalg | null =>
  spoerOmBeloepet(p) ? p.beloep : null;

const VURDERING: Record<Beloepsvalg, string> = {
  hele: 'godkjent',
  deler: 'delvis',
  ingenting: 'avslaatt',
};

const kroner = (tekst: string) => {
  const lest = lesKroner(tekst);
  return 'verdi' in lest ? lest.verdi : undefined;
};

const definert = <T extends object>(felt: T): T =>
  Object.fromEntries(Object.entries(felt).filter(([, x]) => x !== undefined)) as T;

/** Ett svar per kravpost (KA-U57); kjernen hindrer svaret på en post etter en beregningsregel. */
function vurderingene(v: Svarvalg, krav: Krav): Svarvurdering {
  const poster = kravposterI(krav);
  return definert({
    hovedkrav_varslet_i_tide: v.iTide ?? undefined,
    kravposter: poster.length
      ? poster.map((post) => {
          const p = postvalget(v, post.betegnelse);
          const beloep = beloepsvalget(p);
          return definert({
            gjelder: post.id,
            vurdering: beloep ? VURDERING[beloep] : undefined,
            godkjent_beloep:
              beloep === 'hele'
                ? post.beloep
                : beloep === 'ingenting'
                  ? 0
                  : beloep === 'deler'
                    ? kroner(p.delbeloep)
                    : undefined,
            aksepterer: p.form === null ? undefined : p.form === 'tilbud',
            oensket_oppgjoersform: p.form === null || p.form === 'tilbud' ? undefined : p.form,
          });
        })
      : undefined,
  });
}

/** BHs svar på gjeldende vederlagskrav, eller `null` når saken ikke har et krav. */
export function vederlagssvaret(
  v: Svarvalg,
  u: Utledning,
  regler: Regelsett
): { type: 'brev'; svar: Svarutkast[] } | null {
  const krav = u.spor.vederlag.gjeldendeKrav;
  if (!krav) return null;
  const vurderinger = vurderingene(v, krav);
  let resultat: Record<string, unknown> = {};
  try {
    resultat = regnUtSvar(
      'vederlag',
      vurderinger,
      { krav, paaberopelse: u.spor.forhold.gjeldendeKrav },
      regler
    );
  } catch (feil) {
    if (!(feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep)) throw feil;
  }
  const utdypning = v.begrunnelse.trim();
  return {
    type: 'brev',
    svar: [
      {
        spor: 'vederlag',
        gjelder: krav.id,
        regelversjon: regler.versjon,
        vurderinger,
        resultat,
        ...(utdypning ? { utdypning } : {}),
      },
    ],
  };
}

/** TEs aksept av svaret `svar`, med regelversjonen brevet forhåndsvises med (KA-U10, MM-U50). */
export const aksepten = (spor: Spor, svar: string, regelversjon: number) => ({
  type: 'aksept' as const,
  spor,
  svar,
  regelversjon,
});

/** Det TE har skrevet i skjemaet for korrigeringen av datoen. */
export interface Korrigeringsvalg {
  /** «2026-09-20», tom før TE har skrevet den. */
  dato: string;
  forklaring: string;
}

/**
 * TEs korrigering av opplysningen om datoen (MM-U52 punkt 10), i feltet opplysningen har. Den
 * valgfrie forklaringen er `utdypning` (MM-U53). Kjernen avviser en uendret dato og en dato
 * etter brevets dato.
 */
export function korrigeringen(
  v: Korrigeringsvalg,
  opplysning: { id: string; hva: 'paalegg_mottatt' | 'klar_over_forholdet' }
) {
  const utdypning = v.forklaring.trim();
  return {
    type: 'korrigering' as const,
    gjelder: opplysning.id,
    [opplysning.hva]: v.dato,
    ...(utdypning ? { utdypning } : {}),
  } as {
    type: 'korrigering';
    gjelder: string;
    paalegg_mottatt?: string;
    klar_over_forholdet?: string;
    utdypning?: string;
  };
}

/**
 * TEs nye versjon av påberopelsen (BF-10, KA-U52): kategoriene og endringsordren står som i
 * gjeldende versjon (MM-U52 punkt 14), datoen er TEs siste opplysning, også etter en korrigering
 * (MM-U52 punkt 10, #1617), og teksten er utdypningen (S-3 i BF-10). Kjernen avviser en annen
 * dato og en annen kategori.
 */
export function nyVersjonAvPaaberopelsen(u: Utledning, tekst: string) {
  const gjeldende = u.spor.forhold.gjeldendeKrav?.innhold ?? {};
  const innhold: Record<string, unknown> = Object.fromEntries(
    Object.entries(gjeldende).filter(([felt]) =>
      Object.hasOwn(KRAVINNHOLD.forhold.properties, felt)
    )
  );
  const felt = oppgittDato(gjeldende.hovedkategori, gjeldende.underkategori);
  // TEs siste opplysning i feltet, som `sisteDatoopplysning` i kjernen (lesepunktet er `$lib/kjernesak/`).
  const siste = felt === null ? null : u.datoopplysninger.findLast((o) => o.felt === felt);
  if (felt !== null && siste) innhold[felt] = siste.dato;
  const utdypning = tekst.trim();
  return {
    type: 'krav' as const,
    spor: 'forhold' as const,
    innhold,
    ...(utdypning ? { utdypning } : {}),
  };
}

/**
 * Utkastet kjernen regner lagene for beløpet av (#1400, S1-A og S2-A). En kravpost uten valgt
 * oppgjørsform står uten den, siden kjernen ikke forstår en avslått metode uten ønsket metode.
 * De andre kravpostene beholder sitt eget svar på oppgjørsformen (KA-U57).
 */
export function utkastForBeloepet(utkast: Svarutkast, v: Svarvalg, krav: Krav): Svarutkast {
  const ubesvarte = new Set<unknown>(
    kravposterI(krav)
      .filter((p) => postvalget(v, p.betegnelse).form === null)
      .map((p) => p.id)
  );
  const vurderte = (utkast.vurderinger.kravposter ?? []) as Record<string, unknown>[];
  const kravposter = vurderte.map((p) =>
    ubesvarte.has(p.gjelder)
      ? { gjelder: p.gjelder, vurdering: p.vurdering, godkjent_beloep: p.godkjent_beloep }
      : p
  );
  return { ...utkast, vurderinger: { ...utkast.vurderinger, kravposter } };
}
