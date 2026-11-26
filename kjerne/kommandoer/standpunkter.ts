/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem. Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene. Standpunktene i hvert spor står i
 * `STANDPUNKTER` (#1783).
 */

import { iSporet, type Svarvurdering } from '../frosset/byggeklosser.ts';
import { STANDPUNKTER_I_VEDERLAGET, standpunkterPaaVarselet } from '../spor/vederlag/kommando.ts';
import type { Svarutkast } from './kommando.ts';
import type { Utledning } from '../utledning/utled.ts';
import { STANDPUNKTER_I_FRISTEN } from '../spor/frist/kommando.ts';
import type { Krav, Spor, Vederlagsvarselhjemmel } from '../typer.ts';
import { STANDPUNKTER_I_FORHOLDET } from '../spor/forhold/kommando.ts';

type Data = Record<string, unknown>;

/** Standpunktene i svaret i ett spor, i rekkefølgen brevet setter dem. */
export type Sporsstandpunkter = (
  v: Svarvurdering,
  krav: Krav,
  u: Utledning,
  nyId: () => string
) => Data[];

/** Varselet som står alene, et svar gjelder (VS-U79, VS-U87 punkt 30–32). */
export interface Svaretsvarsel {
  id: string;
  hjemmel: Vederlagsvarselhjemmel;
}

/**
 * Standpunktene byggherren har tatt, i rekkefølgen brevet setter dem. En vurdering som ikke er
 * gjort, utelates (KA-U4). `maal` er kravversjonen eller varselet svaret gjelder.
 */
export function standpunkter(
  s: Svarutkast,
  maal: Krav | Svaretsvarsel,
  u: Utledning,
  nyId: () => string
): Data[] {
  if ('hjemmel' in maal) return standpunkterPaaVarselet(s.vurderinger, maal, nyId);
  return iSporet(STANDPUNKTER, s.spor)(s.vurderinger, maal, u, nyId);
}

/** Standpunktene i hvert spor. */
const STANDPUNKTER: Record<Spor, Sporsstandpunkter> = {
  forhold: STANDPUNKTER_I_FORHOLDET,
  vederlag: STANDPUNKTER_I_VEDERLAGET,
  frist: STANDPUNKTER_I_FRISTEN,
};
