/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem. Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene. Standpunktene i hvert spor står i
 * `STANDPUNKTER` (#1783).
 */

import { iSporet, type Svarvurdering } from '../frosset/byggeklosser.ts';
import {
  STANDPUNKTER_I_VEDERLAGET,
  standpunkterPaaVarselet,
  varseletSvaretGjelder,
} from '../spor/vederlag/kommando.ts';
import type { Svarutkast } from './kommando.ts';
import type { Utledning } from '../utledning/utled.ts';
import {
  fristvarseletSvaretGjelder,
  STANDPUNKTER_I_FRISTEN,
  standpunkterPaaFristvarselet,
} from '../spor/frist/kommando.ts';
import type { Krav, Spor, SvarbarVarselhjemmel } from '../typer.ts';
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
export interface Svaretsvarsel<H extends SvarbarVarselhjemmel = SvarbarVarselhjemmel> {
  id: string;
  hjemmel: H;
}

/**
 * Varselet som står alene, et svar med `gjelder` gjelder, eller `null` når svaret gjelder et krav:
 * et varsel i vederlaget (VS-U79) eller varselet etter § 33.4 (VS-U96 punkt 32).
 */
export const svaretsVarsel = (u: Utledning, gjelder: string): Svaretsvarsel | null =>
  varseletSvaretGjelder(u, gjelder) ?? fristvarseletSvaretGjelder(u, gjelder);

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
  if ('hjemmel' in maal)
    return maal.hjemmel === '33.4'
      ? standpunkterPaaFristvarselet(s.vurderinger, { id: maal.id, hjemmel: '33.4' }, nyId)
      : standpunkterPaaVarselet(s.vurderinger, { id: maal.id, hjemmel: maal.hjemmel }, nyId);
  return iSporet(STANDPUNKTER, s.spor)(s.vurderinger, maal, u, nyId);
}

/** Standpunktene i hvert spor. */
const STANDPUNKTER: Record<Spor, Sporsstandpunkter> = {
  forhold: STANDPUNKTER_I_FORHOLDET,
  vederlag: STANDPUNKTER_I_VEDERLAGET,
  frist: STANDPUNKTER_I_FRISTEN,
};
