/**
 * Standpunktene i et svarutkast, slik brevet lagrer dem, og sammenlikningen av en
 * revisjon med svaret den erstatter (HF-U5, HF-U14). Skrivingen og
 * nyttelastkontrollen bruker de samme standpunktene.
 */

import { beloep } from '../regler/beloep.ts';
import { HJEMMEL } from '../format/format.ts';
import { standpunkterISvaret } from '../format/leser.ts';
import { grunnlagsstandpunkter } from '../frosset/frysing.ts';
import { kroner } from '../frosset/standpunkt.ts';
import type { Svarutkast } from './kommando.ts';
import { varseletFoerSvaret, type Utledning } from '../utledning/utled.ts';
import type { Grunnlagsresultat } from '../regler/typer.ts';
import type { Krav, Standpunkt, Svar } from '../typer.ts';

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

/** Arbeidsvalget i kartleggingen 16.10 på #502: godkjenning over frafall over avslag. */
const RANG: Record<Grunnlagsresultat, number> = { avslaatt: 0, paalegg_frafalt: 1, godkjent: 2 };

const GRUNNLAG: Record<Grunnlagsresultat, string> = {
  godkjent: 'godkjent',
  paalegg_frafalt: 'pålegget frafalt',
  avslaatt: 'avslått',
};

const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/**
 * HF-U5, HF-U14: det revisjonen senker av det byggherren har innrømmet i svaret den
 * erstatter, standpunkt for standpunkt, som en setning til meldingen, eller `null`.
 * Beløpet og dagene sammenliknes slik de står, prinsipalt eller subsidiært, så en
 * revisjon som senker ett standpunkt, avvises også når den hever et annet.
 * Rettidigheten sammenliknes ikke her: et «i tide» sperres av `SAGT_I_TIDE` (HF-U4).
 * Byggherrens ønskede metode sammenliknes ikke (MM-U12). `revisjon` er standpunktene
 * slik skrivingen lager dem, og `server` serverens utregning av revisjonen.
 */
export function senketStandpunkt(
  forrige: Pick<Svar, 'spor' | 'standpunkter' | 'beslutningsgrunnlag'>,
  revisjon: Data[],
  server: Data
): string | null {
  const nye = standpunkterISvaret(forrige.spor, { standpunkter: revisjon, utregning: server });
  const ny = <A extends Standpunkt['art']>(art: A) =>
    nye.find((p): p is Extract<Standpunkt, { art: A }> => p.art === art);
  const subsidiaert = (id: string) =>
    forrige.beslutningsgrunnlag.virkninger.some(
      (p) => p.standpunkt === id && p.virkning === 'subsidiaert'
    )
      ? 'subsidiært '
      : '';
  for (const f of forrige.standpunkter) {
    if (f.art === 'grunnlag') {
      const n = ny('grunnlag')!;
      if (RANG[n.resultat] < RANG[f.resultat])
        return `I svaret er grunnlaget ${subsidiaert(f.id)}${GRUNNLAG[f.resultat]}, og revisjonen endrer det til ${GRUNNLAG[n.resultat]}`;
    } else if (f.art === 'beloep') {
      const n = ny('beloep')!;
      if (beloep(n.godkjent)! < beloep(f.godkjent)!)
        return `Svaret godkjenner ${subsidiaert(f.id)}${kroner(f.godkjent)}, og revisjonen senker beløpet til ${kroner(n.godkjent)}`;
    } else if (f.art === 'dager') {
      const n = ny('dager')!;
      if (n.vurdert < f.vurdert)
        return `Svaret godkjenner ${subsidiaert(f.id)}${dager(f.vurdert)}, og revisjonen senker dagene til ${dager(n.vurdert)}`;
    } else if (f.art === 'spesifisering' && !f.iTide) {
      // VS-U4: dagene byggherren måtte forstå at TE hadde krav på, når begge svar sier «for sent».
      const n = ny('spesifisering');
      if (n && !n.iTide && n.dager! < f.dager!)
        return `Svaret sier at byggherren måtte forstå at TE hadde krav på ${dager(f.dager!)} (§ 33.6.1), og revisjonen senker det til ${dager(n.dager!)}`;
    } else if (f.art === 'hindring' && f.oppfylt) {
      if (ny('hindring')?.oppfylt === false)
        return 'Svaret godtar at fremdriften er hindret som følge av forholdet (§ 33.1), og revisjonen tar det tilbake';
    } else if (f.art === 'metode' && f.aksepterer) {
      if (ny('metode')?.aksepterer === false)
        return 'Svaret aksepterer beregningsmåten i tilbudet (§ 34.2.2, HF-U14), og revisjonen tar aksepten tilbake';
    }
  }
  return null;
}
