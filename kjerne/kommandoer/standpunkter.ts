/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem. Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene.
 */

import { HJEMMEL } from '../format/format.ts';
import { grunnlagsstandpunkter } from '../frosset/frysing.ts';
import type { Svarutkast } from './kommando.ts';
import {
  foresporselForFristsvar,
  varseletForNyttSvar,
  type Utledning,
} from '../utledning/utled.ts';
import type { Krav } from '../typer.ts';

type Data = Record<string, unknown>;

/** Standpunktene byggherren har tatt, i rekkefølgen brevet setter dem. En vurdering som ikke er gjort, utelates (KA-U4). */
export function standpunkter(s: Svarutkast, krav: Krav, u: Utledning, nyId: () => string): Data[] {
  const v = s.vurderinger;
  const ut: Data[] = [];
  if (s.spor === 'grunnlag') {
    ut.push(...grunnlagsstandpunkter(v, krav, nyId));
  } else if (s.spor === 'vederlag') {
    // VS-U20, OV-U5, HF-U1: varselet før svaret, som i fristen.
    if (typeof v.hovedkrav_varslet_i_tide === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: varseletForNyttSvar(u, 'vederlag'),
        hjemmel: HJEMMEL.vederlag,
        i_tide: v.hovedkrav_varslet_i_tide,
      });
    if (typeof v.aksepterer_metode === 'boolean')
      ut.push({
        id: nyId(),
        art: 'metode',
        hjemmel: '34.2.2',
        aksepterer: v.aksepterer_metode,
        ...(v.aksepterer_metode ? {} : { oensket_metode: v.oensket_metode }),
      });
    ut.push({ id: nyId(), art: 'beloep' });
  } else {
    // VS-U20, OV-U5, HF-U1: varselet før svaret.
    if (typeof v.frist_varsel_ok === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: varseletForNyttSvar(u, 'frist'),
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
  }
  return ut;
}
