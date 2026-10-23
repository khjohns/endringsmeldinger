/**
 * BHs svar på vederlagskravet i TS-saken (#1047 C2 del 2). `VederlagForm` regner svaret
 * med `VederlagDomainConfig`, og her bygges configen fra kjernens utledning, og
 * skjemaets data oversettes til kommandoen `brev` med ett `Svarutkast`. Rigg og drift
 * er ikke i kjernens format, så configen har ingen slik post og svaret sender ingen
 * `rigg_*` (#1171). Skjemaets resultat sendes og regnes på nytt av kjernen (B-13).
 */

import {
  BELOEPSVURDERING_FRA_KATALOGEN,
  GRUNNLAGSRESULTAT_FRA_KATALOGEN,
  HOVEDKATEGORI_FRA_KATALOGEN,
  METODE_FRA_KATALOGEN,
  RESULTAT_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
  fraKatalogen,
  tilKatalogen,
} from '$kjerne/format/koder';
import { foersteUnderkategori } from '$kjerne/regler/grunnlag';
import { harHovedbeloep, standpunktet, type Svarvurdering } from '$kjerne/frosset/standpunkt';
import type { Svarutkast } from '$kjerne/kommandoer/kommando';
import type { Krav, Svar } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { letterText } from '$lib/approval/letter';
import type {
  BelopVurdering,
  VederlagDomainConfig,
  VederlagLastResponseData,
} from '$lib/domain/vederlagDomain';
import type { VederlagsMetode } from '$lib/types/timeline';

const produktivitetsbeloep = (krav: Krav) =>
  (krav.innhold.saerskilt as { produktivitet?: { beloep?: number } } | undefined)?.produktivitet
    ?.beloep;

/**
 * Configen for skjemaet fra kravet kjernen har i sporet, eller `null` uten krav. Kjernens
 * krav er et tilbud (OV-U1) uten krav om justerte enhetspriser, med hovedbeløpet og posten
 * etter § 34.1.3 annet ledd, hver for seg eller sammen (OV-U23).
 */
export function vederlagConfigFraKjernen(u: Utledning): VederlagDomainConfig | null {
  const krav = u.spor.vederlag.gjeldendeKrav;
  if (!krav) return null;
  const grunnlagskrav = u.spor.grunnlag.gjeldendeKrav?.innhold ?? {};
  const grunnlagssvar = u.spor.grunnlag.gjeldendeSvar;
  const grunnlag = grunnlagssvar ? standpunktet(grunnlagssvar, 'grunnlag') : undefined;
  const produktivitet = produktivitetsbeloep(krav);
  const harHovedkrav = harHovedbeloep(krav);
  return {
    metode: tilKatalogen(METODE_FRA_KATALOGEN, krav.innhold.metode) as VederlagsMetode,
    harHovedkrav,
    hovedkravBelop: harHovedkrav ? (krav.innhold.beloep as number) : 0,
    produktivitetBelop: produktivitet,
    harRiggKrav: false,
    harProduktivitetKrav: produktivitet !== undefined,
    kreverJustertEp: false,
    hovedkategori: tilKatalogen(
      HOVEDKATEGORI_FRA_KATALOGEN,
      grunnlagskrav.hovedkategori
    ) as VederlagDomainConfig['hovedkategori'],
    underkategori: tilKatalogen(
      UNDERKATEGORI_FRA_KATALOGEN,
      foersteUnderkategori(grunnlagskrav.underkategori as string | string[] | null | undefined)
    ) as string | undefined,
    grunnlagVarsletForSent: u.spor.vederlag.subsidiaer.includes('prekludert'),
    grunnlagStatus: grunnlag
      ? (tilKatalogen(
          GRUNNLAGSRESULTAT_FRA_KATALOGEN,
          grunnlag.resultat
        ) as VederlagDomainConfig['grunnlagStatus'])
      : undefined,
  };
}

/**
 * Feltene fra `buildEventData` kjernen tar imot, med kjernens koder. Ingen `rigg_*` (#1171), og
 * ingen `produktivitet_*` når kravet ikke har posten: skjemaet gir da beløpet 0 (OV-U23).
 */
function vurderinger(d: Record<string, unknown>, krav: Krav): Svarvurdering {
  const felt: Svarvurdering = {
    hovedkrav_vurdering: fraKatalogen(BELOEPSVURDERING_FRA_KATALOGEN, d.hovedkrav_vurdering),
    hovedkrav_godkjent_belop: d.hovedkrav_godkjent_belop,
    hovedkrav_varslet_i_tide: d.hovedkrav_varslet_i_tide,
    produktivitet_vurdering: fraKatalogen(
      BELOEPSVURDERING_FRA_KATALOGEN,
      d.produktivitet_vurdering
    ),
    produktivitet_godkjent_belop: d.produktivitet_godkjent_belop,
    produktivitet_varslet_i_tide: d.produktivitet_varslet_i_tide,
    produktivitet_begrenset_belop: d.produktivitet_begrenset_belop,
    aksepterer_metode: d.aksepterer_metode,
    oensket_metode: fraKatalogen(METODE_FRA_KATALOGEN, d.oensket_metode),
  };
  const harPosten = produktivitetsbeloep(krav) !== undefined;
  return Object.fromEntries(
    Object.entries(felt).filter(
      ([k, v]) => v !== undefined && (harPosten || !k.startsWith('produktivitet_'))
    )
  );
}

/**
 * Kommandoen for BHs svar fra dataene `buildEventData` gir. Svaret gjelder kravet kjernen har
 * i sporet. Begrunnelsen i skjemaet, den genererte og BHs tillegg, blir utdypningen under den
 * låste teksten (KA-U24).
 */
export function vederlagssvarFraSkjema(
  data: Record<string, unknown>,
  u: Utledning,
  regelversjon: number
): { type: 'brev'; svar: Svarutkast[] } {
  const krav = u.spor.vederlag.gjeldendeKrav;
  if (!krav) throw new Error('Saken har ikke noe vederlagskrav å svare på.');
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  const resultat: Record<string, unknown> = {
    resultat: fraKatalogen(RESULTAT_FRA_KATALOGEN, data.beregnings_resultat),
    godkjent_beloep: data.total_godkjent_belop,
  };
  if (data.subsidiaer_resultat !== undefined) {
    resultat.subsidiaert_resultat = fraKatalogen(RESULTAT_FRA_KATALOGEN, data.subsidiaer_resultat);
    resultat.subsidiaert_godkjent_beloep = data.subsidiaer_godkjent_belop;
  }
  return {
    type: 'brev',
    svar: [
      {
        spor: 'vederlag',
        gjelder: krav.id,
        regelversjon,
        vurderinger: vurderinger(data, krav),
        resultat,
        ...(utdypning ? { utdypning } : {}),
      },
    ],
  };
}

const vurderingAv = (krevd: number, godkjent: number): BelopVurdering =>
  godkjent >= krevd ? 'godkjent' : godkjent === 0 ? 'avslatt' : 'delvis';

/**
 * Skjemaets utgangspunkt for en revisjon, fra standpunktene i BHs gjeldende svar på kravet
 * `krav`. Vurderingen av en post leses av beløpet BH godtok mot det krevde, som i brevet.
 */
export function forrigeVederlagssvar(svar: Svar, krav: Krav): VederlagLastResponseData {
  const forrige: VederlagLastResponseData = { eventId: svar.id };
  for (const s of svar.standpunkter) {
    if (s.art === 'rettidighet' && s.hjemmel === '34.1.2') forrige.hovedkravVarsletITide = s.iTide;
    if (s.art === 'rettidighet' && s.hjemmel === '34.1.3') {
      forrige.produktivitetVarsletITide = s.iTide;
      forrige.produktivitetBegrensetBelop = s.begrenset;
    }
    if (s.art === 'metode') {
      forrige.akseptererMetode = s.aksepterer;
      forrige.oensketMetode = s.oensket
        ? (tilKatalogen(METODE_FRA_KATALOGEN, s.oensket) as VederlagsMetode)
        : undefined;
    }
    if (s.art === 'beloep' && s.saerskilt === 'produktivitet') {
      forrige.produktivitetVurdering = vurderingAv(produktivitetsbeloep(krav) ?? 0, s.godkjent);
      forrige.produktivitetGodkjentBelop = s.godkjent;
    } else if (s.art === 'beloep') {
      forrige.hovedkravVurdering = vurderingAv(krav.innhold.beloep as number, s.godkjent);
      forrige.hovedkravGodkjentBelop = s.godkjent;
    }
  }
  return forrige;
}
