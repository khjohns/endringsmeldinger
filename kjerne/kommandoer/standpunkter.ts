/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem. Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene. Standpunktene i hvert spor står i
 * `STANDPUNKTER` (#1783).
 */

import { HJEMMEL } from '../format/format.ts';
import { iSporet, type Svarvurdering } from '../frosset/byggeklosser.ts';
import { STANDPUNKTER_I_VEDERLAGET } from '../spor/vederlag/kommando.ts';
import type { Svarutkast } from './kommando.ts';
import {
  foresporselForFristsvar,
  varseletForNyttSvar,
  type Utledning,
} from '../utledning/utled.ts';
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

/** Standpunktene i fristen, til sporet flyttes (#1745). */
function fristensStandpunkter(
  v: Svarvurdering,
  krav: Krav,
  u: Utledning,
  nyId: () => string
): Data[] {
  const ut: Data[] = [];
  // VS-U20, OV-U5, HF-U1: varselet før svaret.
  if (typeof v.frist_varsel_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: varseletForNyttSvar(u, '33.4'),
      hjemmel: HJEMMEL.frist,
      i_tide: v.frist_varsel_ok,
    });
  // VS-U17, VS-U29: svaret på forespørselen etter § 33.6.2, som kravet eller begrunnelsen.
  const f = foresporselForFristsvar(u);
  if (typeof v.foresporsel_svar_ok === 'boolean' && f)
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder: f.gjelder,
      hjemmel: '33.6.2',
      i_tide: v.foresporsel_svar_ok,
    });
  if (typeof v.vilkar_oppfylt === 'boolean')
    ut.push({ id: nyId(), art: 'hindring', oppfylt: v.vilkar_oppfylt });
  if (typeof v.spesifisert_krav_ok === 'boolean')
    ut.push({
      id: nyId(),
      art: 'spesifisering',
      gjelder: krav.id,
      hjemmel: '33.6.1',
      i_tide: v.spesifisert_krav_ok,
      ...(v.spesifisert_krav_ok ? {} : { dager: v.dager_maatte_forstaa }),
    });
  ut.push({ id: nyId(), art: 'dager' });
  return ut;
}

/** Standpunktene i hvert spor. Fristen står her til den flyttes (#1745). */
const STANDPUNKTER: Record<Spor, Sporsstandpunkter> = {
  forhold: STANDPUNKTER_I_FORHOLDET,
  vederlag: STANDPUNKTER_I_VEDERLAGET,
  frist: fristensStandpunkter,
};
