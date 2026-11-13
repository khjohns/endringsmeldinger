/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem. Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene. Standpunktene i hvert spor står i
 * `STANDPUNKTER` (#1783).
 */

import { iSporet, type Svarvurdering } from '../frosset/byggeklosser.ts';
import { STANDPUNKTER_I_VEDERLAGET } from '../spor/vederlag/kommando.ts';
import type { Svarutkast } from './kommando.ts';
import type { Utledning } from '../utledning/utled.ts';
import { STANDPUNKTER_I_FRISTEN } from '../spor/frist/kommando.ts';
import type { Krav, Spor } from '../typer.ts';
import { STANDPUNKTER_I_FORHOLDET } from '../spor/forhold/kommando.ts';

type Data = Record<string, unknown>;

/** Standpunktene i svaret i ett spor, i rekkefølgen brevet setter dem. */
export type Sporsstandpunkter = (
  v: Svarvurdering,
  krav: Krav,
  u: Utledning,
  nyId: () => string
) => Data[];

/** Standpunktene byggherren har tatt, i rekkefølgen brevet setter dem. En vurdering som ikke er gjort, utelates (KA-U4). */
export function standpunkter(s: Svarutkast, krav: Krav, u: Utledning, nyId: () => string): Data[] {
  return iSporet(STANDPUNKTER, s.spor)(s.vurderinger, krav, u, nyId);
}

/** Standpunktene i hvert spor. */
const STANDPUNKTER: Record<Spor, Sporsstandpunkter> = {
  forhold: STANDPUNKTER_I_FORHOLDET,
  vederlag: STANDPUNKTER_I_VEDERLAGET,
  frist: STANDPUNKTER_I_FRISTEN,
};
