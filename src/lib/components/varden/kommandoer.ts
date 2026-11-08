/**
 * Kommandoene Varden sender (#1331), i kjernens format. Svaret på vederlagskravet har
 * vurderingene BH har valgt i skjemaet, og resultatet regnes av kjernen (`regnUtSvar`), som
 * i dagens skjema (#1301). Er vurderingene ufullstendige, er resultatet tomt, og kjernen
 * avviser kommandoen med sin egen melding før brevet vises.
 */

import { regnUtSvar, type Svarvurdering } from '$kjerne/frosset/standpunkt';
import { UgyldigBeloep } from '$kjerne/regler/beloep';
import { UgyldigVurdering } from '$kjerne/regler/feil';
import type { Regelsett } from '$kjerne/regler/regelsett';
import type { Svarutkast } from '$kjerne/kommandoer/kommando';
import type { Spor } from '$kjerne/typer';
import { KRAVINNHOLD, oppgittDato } from '$kjerne/format/format';
import type { Utledning } from '$kjerne/utledning/utled';
import { lesKroner } from '$lib/utils/belop';
import { fastSumIKroner } from '$kjerne/frosset/kravinnhold';

export type Beloepsvalg = 'hele' | 'deler' | 'ingenting';

/** Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt. */
export interface Svarvalg {
  iTide: boolean | null;
  metode: boolean | null;
  oensket: 'enhetspriser' | 'regningsarbeid' | null;
  beloep: Beloepsvalg | null;
  /** Teksten BH skrev i beløpsfeltet, lest med `lesKroner` (OV-U58). */
  delbeloep: string;
  begrunnelse: string;
}

export const tomtSvar = (): Svarvalg => ({
  iTide: null,
  metode: null,
  oensket: null,
  beloep: null,
  delbeloep: '',
  begrunnelse: '',
});

const VURDERING: Record<Beloepsvalg, string> = {
  hele: 'godkjent',
  deler: 'delvis',
  ingenting: 'avslaatt',
};

const kroner = (tekst: string) => {
  const lest = lesKroner(tekst);
  return 'verdi' in lest ? lest.verdi : undefined;
};

function vurderingene(v: Svarvalg, krevd: number): Svarvurdering {
  const felt: Svarvurdering = {
    hovedkrav_vurdering: v.beloep ? VURDERING[v.beloep] : undefined,
    hovedkrav_godkjent_beloep:
      v.beloep === 'hele'
        ? krevd
        : v.beloep === 'ingenting'
          ? 0
          : v.beloep === 'deler'
            ? kroner(v.delbeloep)
            : undefined,
    hovedkrav_varslet_i_tide: v.iTide ?? undefined,
    aksepterer_metode: v.metode ?? undefined,
    oensket_metode: v.metode === false ? (v.oensket ?? undefined) : undefined,
  };
  return Object.fromEntries(Object.entries(felt).filter(([, x]) => x !== undefined));
}

/** BHs svar på gjeldende vederlagskrav, eller `null` når saken ikke har et krav. */
export function vederlagssvaret(
  v: Svarvalg,
  u: Utledning,
  regler: Regelsett
): { type: 'brev'; svar: Svarutkast[] } | null {
  const krav = u.spor.vederlag.gjeldendeKrav;
  if (!krav) return null;
  const vurderinger = vurderingene(v, fastSumIKroner(krav) as number);
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
