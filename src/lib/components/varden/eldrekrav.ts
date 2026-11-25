/**
 * Et krav lagt til, sendt før totalentreprenørens siste krav i sporet (OV-U118, OV-U119). Kjernen
 * avgjør hvilke kravversjoner det prøves mot (`kravversjoneneKravetProevesMot`), og skjemaet tar
 * utgangspunkt i den siste av dem, så det bare trekker det den versjonen hadde. Skjemaet har da et
 * eget utkast, så totalentreprenørens utkast til neste krav i sporet står.
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
