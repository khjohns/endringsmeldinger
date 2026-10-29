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
import type { Utledning } from '$kjerne/utledning/utled';
import { lesKroner } from '$lib/utils/belop';

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
    hovedkrav_godkjent_belop:
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
  const vurderinger = vurderingene(v, krav.innhold.beloep as number);
  let resultat: Record<string, unknown> = {};
  try {
    resultat = regnUtSvar(
      'vederlag',
      vurderinger,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
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

/** TEs aksept av svaret `svar`, med regelversjonen brevet forhåndsvises med (KA-U10). */
export const aksepten = (spor: Spor, svar: string, regelversjon: number) => ({
  type: 'aksept' as const,
  spor,
  svar,
  regelversjon,
});
