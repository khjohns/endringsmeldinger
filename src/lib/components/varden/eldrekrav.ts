/**
 * Et krav lagt til, sendt før totalentreprenørens siste krav i sporet (OV-U118, OV-U119). Kjernen
 * avgjør hvilke kravversjoner det prøves mot (`kravversjoneneKravetProevesMot`), og skjemaet tar
 * utgangspunkt i den siste av dem, så det bare trekker det den versjonen hadde.
 */

import type { Krav, Kravspor } from '#kjerne/typer.ts';
import {
  kravversjoneneKravetProevesMot,
  sendtFoerSisteKrav,
  type Utledning,
} from '#kjerne/utledning/utled.ts';
import type { Korrespondansevalg } from './korrespondansen';

/** Kravversjonene kravet prøves mot (`tidligere`), de andre i sporet (`andre`), og den siste av dem
 * kravet prøves mot (`utgangspunkt`). */
export type Eldrekrav = ReturnType<typeof kravversjoneneKravetProevesMot> & {
  utgangspunkt: Krav | null;
};

/**
 * Kravversjonene kravet lagt til med `lagtTil` prøves mot, når det er sendt før det siste kravet i
 * sporet. Ellers `null`.
 */
export function eldreKrav(
  u: Utledning,
  spor: Kravspor,
  lagtTil: Korrespondansevalg | null
): Eldrekrav | null {
  if (!lagtTil?.dato || !sendtFoerSisteKrav(u, spor, lagtTil.dato)) return null;
  const k = kravversjoneneKravetProevesMot(u, spor, lagtTil.dato);
  return { ...k, utgangspunkt: k.tidligere.at(-1) ?? null };
}

/** Kravversjonen skjemaet tar utgangspunkt i: den siste kravet prøves mot, eller gjeldende krav. */
export const utgangspunktet = (
  u: Utledning,
  spor: Kravspor,
  eldre: Eldrekrav | null
): Krav | null => (eldre ? eldre.utgangspunkt : u.spor[spor].gjeldendeKrav);

/**
 * Nøkkelen et utkast har for utgangspunktet: `undefined` for et krav fra løsningen eller sendt etter
 * det siste, ellers kravversjonen det startet fra, eller `''` uten en.
 */
export const utgangspunktnoekkel = (eldre: Eldrekrav | null): string | undefined =>
  eldre ? (eldre.utgangspunkt?.id ?? '') : undefined;

/**
 * Utkastet startes på nytt når det mangler eller har et annet utgangspunkt, så det ikke trekker
 * poster eller frister utgangspunktet ikke hadde.
 */
export const startesPaaNytt = (
  valg: { utgangspunkt?: string } | null | undefined,
  eldre: Eldrekrav | null
): boolean => !valg || valg.utgangspunkt !== utgangspunktnoekkel(eldre);
