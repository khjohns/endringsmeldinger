/**
 * Lagene i et svarutkast i hvert spor (`Utkastlag`, #1400, #1778). Vederlaget og fristen (M-8 i
 * BF-20) har dem, og forholdet har ingen lag i utkastet.
 */

import { iSporet } from '../frosset/byggeklosser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { lagIFristen, type LagIFristen } from '../spor/frist/kommando.ts';
import { lagIVederlaget, type LagIVederlaget } from '../spor/vederlag/kommando.ts';
import type { Spor } from '../typer.ts';
import type { Utledning } from '../utledning/utled.ts';
import type { Svarutkast } from './kommando.ts';

/** Lagene i et svarutkast i ett spor, med sporets egen type for lagene (`Utkastlag`). */
export type Sporslag<L> = (utkast: Svarutkast, u: Utledning, regler: Regelsett) => L;

const LAG: Record<Spor, Sporslag<LagIVederlaget | LagIFristen> | null> = {
  forhold: null,
  vederlag: lagIVederlaget,
  frist: lagIFristen,
};

/** Lagene i svarutkastet, med sporets type. Kaster for forholdet, som ikke har lag i utkastet. */
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'vederlag' },
  u: Utledning,
  regler: Regelsett
): LagIVederlaget;
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'frist' },
  u: Utledning,
  regler: Regelsett
): LagIFristen;
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
): LagIVederlaget | LagIFristen;
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
): LagIVederlaget | LagIFristen {
  const lag = iSporet(LAG, utkast.spor);
  if (!lag) throw new Error(`Forholdet har ingen lag i svarutkastet (${utkast.spor})`);
  return lag(utkast, u, regler);
}
