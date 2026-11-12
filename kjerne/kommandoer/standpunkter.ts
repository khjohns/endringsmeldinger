/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem. Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene.
 */

import { HJEMMEL } from '../format/format.ts';
import { kravposterI, OPPGJOERSHJEMMEL } from '../spor/vederlag/format.ts';
import { forholdsstandpunkter } from '../frosset/frysing.ts';
import { vederlagsposter, type Kravpostvurdering } from '../frosset/utregning.ts';
import { varselhjemmel } from '../utledning/kravposter.ts';
import { beloep, tilTall } from '../regler/beloep.ts';
import type { Svarutkast } from './kommando.ts';
import {
  foresporselForFristsvar,
  varseletForNyttSvar,
  type Utledning,
} from '../utledning/utled.ts';
import { type Krav, utenGren } from '../typer.ts';

type Data = Record<string, unknown>;

/** Standpunktene byggherren har tatt, i rekkefølgen brevet setter dem. En vurdering som ikke er gjort, utelates (KA-U4). */
export function standpunkter(s: Svarutkast, krav: Krav, u: Utledning, nyId: () => string): Data[] {
  const v = s.vurderinger;
  const ut: Data[] = [];
  if (s.spor === 'forhold') {
    // VS-U43 punkt 6 og 10: påberopelsen gjelder det registrerte varselet etter § 32.2, ellers
    // det første grunnlagskravet, ikke versjonen svaret gjelder. Med et registrert varsel
    // avviser forutsetningene svaret til #1600 er bygget.
    ut.push(...forholdsstandpunkter(v, varseletForNyttSvar(u, '32.2'), nyId));
  } else if (s.spor === 'vederlag') {
    // VS-U20, OV-U5, HF-U1: varselet før svaret, som i fristen.
    if (typeof v.hovedkrav_varslet_i_tide === 'boolean')
      ut.push({
        id: nyId(),
        art: 'rettidighet',
        gjelder: varseletForNyttSvar(u, '34.1.2'),
        hjemmel: HJEMMEL.vederlag,
        i_tide: v.hovedkrav_varslet_i_tide,
      });
    // OV-U26, OV-U28, KA-U57: oppgjørsformen og beløpet for kravposten, begrensningen etter
    // § 34.1.3 og posten etter annet ledd, hver for seg. Beløpet etter begrensningen er det
    // byggherren oppgir (VS-U5).
    for (const post of vederlagsposter(v, krav)) {
      if ('gjelder' in post) ut.push(...kravpoststandpunkter(post.gjelder, post.svar, krav, nyId));
      if ('saerskilt' in post && typeof v.produktivitet_varslet_i_tide === 'boolean')
        ut.push({
          id: nyId(),
          art: 'rettidighet',
          gjelder: varseletForNyttSvar(u, '34.1.3'),
          hjemmel: '34.1.3',
          i_tide: v.produktivitet_varslet_i_tide,
          ...(v.produktivitet_varslet_i_tide
            ? {}
            : { begrenset_beloep: tilTall(beloep(v.produktivitet_begrenset_beloep as number)!) }),
        });
      // KA-U72: uten aksept av tilbudet står standpunktet til beløpet uten beløp.
      ut.push({
        id: nyId(),
        art: 'beloep',
        ...(post.godkjent === null ? {} : { beloep: post.godkjent }),
        ...('gjelder' in post ? { gjelder: post.gjelder } : { saerskilt: post.saerskilt }),
      });
    }
  } else if (s.spor === 'frist') {
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
  } else utenGren(s.spor);
  return ut;
}

/**
 * Standpunktene for én kravpost foran beløpet: oppgjørsformen med kravet om tilbud (KA-U69,
 * KA-U71), varselet etter § 34.3.3 eller § 34.4 (KA-U64) og justeringen (KA-U68).
 */
function kravpoststandpunkter(
  gjelder: string,
  svar: Kravpostvurdering,
  krav: Krav,
  nyId: () => string
): Data[] {
  const kravpost = kravposterI(krav).find((p) => p.id === gjelder)!;
  const ut: Data[] = [];
  if (typeof svar.aksepterer === 'boolean')
    ut.push({
      id: nyId(),
      art: 'oppgjoersform',
      gjelder,
      hjemmel: OPPGJOERSHJEMMEL[kravpost.oppgjoersform],
      aksepterer: svar.aksepterer,
      ...(svar.oensket_oppgjoersform != null
        ? { oensket_oppgjoersform: svar.oensket_oppgjoersform }
        : {}),
      ...(svar.krever_tilbud === true ? { krever_tilbud: true } : {}),
    });
  const hjemmel = varselhjemmel(kravpost);
  if (hjemmel && typeof svar.varslet_i_tide === 'boolean')
    ut.push({
      id: nyId(),
      art: 'rettidighet',
      gjelder,
      hjemmel,
      i_tide: svar.varslet_i_tide,
    });
  if (typeof svar.godtar_justering === 'boolean')
    ut.push({
      id: nyId(),
      art: 'justering',
      gjelder,
      hjemmel: '34.3.2',
      godtar: svar.godtar_justering,
    });
  return ut;
}
