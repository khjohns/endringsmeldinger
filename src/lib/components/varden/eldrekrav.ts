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

export type Eldrekrav = ReturnType<typeof kravversjoneneKravetProevesMot>;

/**
 * Kravversjonene kravet lagt til med `lagtTil` prøves mot (`tidligere`) og de andre i sporet
 * (`andre`), når det er sendt før det siste kravet i sporet. Ellers `null`.
 */
export function eldreKrav(
  u: Utledning,
  spor: Kravspor,
  lagtTil: Korrespondansevalg | null
): Eldrekrav | null {
  const dag = lagtTil?.dato || null;
  if (dag === null || !sendtFoerSisteKrav(u, spor, dag)) return null;
  return kravversjoneneKravetProevesMot(u, spor, dag);
}

/** Kravversjonen skjemaet tar utgangspunkt i: den siste kravet prøves mot, eller gjeldende krav. */
export const utgangspunktet = (
  u: Utledning,
  spor: Kravspor,
  eldre: Eldrekrav | null
): Krav | null => (eldre ? (eldre.tidligere.at(-1) ?? null) : u.spor[spor].gjeldendeKrav);

/**
 * Nøkkelen et utkast har for utgangspunktet: `undefined` for et krav fra løsningen eller sendt etter
 * det siste, ellers kravversjonen det startet fra, eller `''` uten en. Et utkast med en annen nøkkel
 * startes på nytt, så det ikke trekker poster eller frister utgangspunktet ikke hadde.
 */
export const utgangspunktnoekkel = (
  u: Utledning,
  spor: Kravspor,
  eldre: Eldrekrav | null
): string | undefined => (eldre ? (utgangspunktet(u, spor, eldre)?.id ?? '') : undefined);
