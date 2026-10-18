/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem, og sammenlikningen av en
 * revisjon med svaret den erstatter (HF-U5, HF-U14). Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene.
 */

import { HJEMMEL } from '../format/format.ts';
import { standpunkterISvaret } from '../format/leser.ts';
import { grunnlagsstandpunkter } from '../frosset/frysing.ts';
import type { Svarutkast } from './kommando.ts';
import { varseletFoerSvaret, type Utledning } from '../utledning/utled.ts';
import { senketInnroemmelse } from '../utledning/innroemmelse.ts';
import type { Krav, Svar } from '../typer.ts';

type Data = Record<string, unknown>;

/** Standpunktene byggherren har tatt, i rekkefølgen brevet setter dem. En vurdering som ikke er gjort, utelates (KA-U4). */
export function standpunkter(s: Svarutkast, krav: Krav, u: Utledning, nyId: () => string): Data[] {
  const v = s.vurderinger;
  const ut: Data[] = [];
  if (s.spor === 'grunnlag') {
    ut.push(...grunnlagsstandpunkter(v, krav, nyId));
  } else if (s.spor === 'vederlag') {
    // HF-U1: varselet etter § 34.1.2 er ikke et eget element ennå (OV-U5). Det første
    // vederlagskravet er det første varselet appen kjenner (arbeidsvalget i #479).
    if (typeof v.hovedkrav_varslet_i_tide === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: u.spor.vederlag.krav[0]!.id,
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
    // VS-U20, OV-U5, HF-U1: varselet før svaret. Svaret skrives nå, så et registrert varsel
    // står før det.
    if (typeof v.frist_varsel_ok === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: varseletFoerSvaret(
          u.spor.frist.varsel ? [u.spor.frist.varsel] : [],
          u.spor.frist.krav,
          () => true
        )!,
        hjemmel: HJEMMEL.frist,
        i_tide: v.frist_varsel_ok,
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

/**
 * HF-U5, HF-U14: det revisjonen senker av det svaret innrømmer (`senketInnroemmelse`).
 * `revisjon` er standpunktene slik skrivingen lager dem, og `server` serverens utregning av
 * revisjonen.
 */
export const senketStandpunkt = (
  forrige: Pick<Svar, 'spor' | 'standpunkter' | 'beslutningsgrunnlag'>,
  revisjon: Data[],
  server: Data
): string | null =>
  senketInnroemmelse(
    forrige,
    standpunkterISvaret(forrige.spor, { standpunkter: revisjon, utregning: server })
  );
