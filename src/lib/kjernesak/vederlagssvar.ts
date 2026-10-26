/**
 * BHs svar på vederlagskravet i TS-saken (#1047 C2 del 2). `VederlagForm` regner svaret
 * med `VederlagDomainConfig`, og her bygges configen fra kjernens utledning, og
 * skjemaets data oversettes til kommandoen `brev` med ett `Svarutkast`. Rigg og drift
 * er ikke i kjernens format, så configen har ingen slik post og svaret sender ingen
 * `rigg_*` (#1171). Resultatet som sendes, regnes av kjernen fra vurderingene, ikke av
 * skjemaet (#1301), og kjernen regner det på nytt når kommandoen tas imot (B-13).
 */

import {
  BELOEPSVURDERING_FRA_KATALOGEN,
  GRUNNLAGSRESULTAT_FRA_KATALOGEN,
  HOVEDKATEGORI_FRA_KATALOGEN,
  METODE_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
  fraKatalogen,
  tilKatalogen,
} from '$kjerne/format/koder';
import { foersteUnderkategori } from '$kjerne/regler/grunnlag';
import {
  etikett,
  grunnerFraGrunnlaget,
  harHovedbeloep,
  laget,
  regnUtSvar,
  standpunktet,
  type Svarvurdering,
} from '$kjerne/frosset/standpunkt';
import { UgyldigBeloep } from '$kjerne/regler/beloep';
import { UgyldigVurdering } from '$kjerne/regler/feil';
import type { Regelsett } from '$kjerne/regler/regelsett';
import type { Subsidiaergrunn } from '$kjerne/regler/grunnlag';
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
    // GR-U26: bare et svar på gjeldende versjon av grunnlaget gir preklusjonen som lag.
    grunnlagVarsletForSent: grunnlagssvar
      ? grunnerFraGrunnlaget(grunnlagssvar, grunnlagssvar.beslutningsgrunnlag.virkninger).includes(
          'prekludert'
        )
      : false,
    grunnlagStatus: grunnlag
      ? (tilKatalogen(
          GRUNNLAGSRESULTAT_FRA_KATALOGEN,
          grunnlag.resultat
        ) as VederlagDomainConfig['grunnlagStatus'])
      : undefined,
    erKjernesak: true,
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
 * Resultatet kjernen regner av vurderingene. Er de ugyldige, er det tomt, og kjernen avviser
 * kommandoen med `UGYLDIG_VURDERING` og meldingen fra utregningen før brevet.
 */
function resultatet(
  v: Svarvurdering,
  krav: Krav,
  u: Utledning,
  regler: Regelsett
): Record<string, unknown> {
  try {
    return regnUtSvar(
      'vederlag',
      v,
      { krav, grunnlagskrav: u.spor.grunnlag.gjeldendeKrav },
      regler
    );
  } catch (feil) {
    if (feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep) return {};
    throw feil;
  }
}

/**
 * Kommandoen for BHs svar fra dataene `buildEventData` gir. Svaret gjelder kravet kjernen har
 * i sporet. Begrunnelsen BH skriver i skjemaet, blir utdypningen under den låste teksten
 * (KA-U24, KA-U41). Resultatet regnes av kjernen (#1301), ikke av skjemaet.
 */
export function vederlagssvarFraSkjema(
  data: Record<string, unknown>,
  u: Utledning,
  regler: Regelsett
): { type: 'brev'; svar: Svarutkast[] } {
  const krav = u.spor.vederlag.gjeldendeKrav;
  if (!krav) throw new Error('Saken har ikke noe vederlagskrav å svare på.');
  const utdypning = letterText(data.begrunnelse ?? '').trim();
  const v = vurderinger(data, krav);
  return {
    type: 'brev',
    svar: [
      {
        spor: 'vederlag',
        gjelder: krav.id,
        regelversjon: regler.versjon,
        vurderinger: v,
        resultat: resultatet(v, krav, u, regler),
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

/**
 * Det brevet setter foran BHs svar på vederlaget, lest av saken før svaret: grunnene i
 * gjeldende svar på grunnlaget, som hver er ett lag foran sporet (A2, OV-U32, OV-U33), og
 * forbeholdet når grunnlaget er ubesvart og ikke avklart ved frafall (GR-U26, GR-U23). Et
 * frafall gir ingen grunn (GR-U7). Brevteksten leser de samme feltene.
 */
export function grunnlagetForSvaret(u: Utledning): {
  grunner: Subsidiaergrunn[];
  forbehold: boolean;
} {
  const g = u.spor.grunnlag.gjeldendeSvar;
  return {
    grunner: g ? grunnerFraGrunnlaget(g, g.beslutningsgrunnlag.virkninger) : [],
    forbehold: !g && !u.frafalt,
  };
}

/**
 * Forbeholdet etter GR-U26 med brevets ord, uten brevet kravet står i. Testen av lagene
 * prøver at brevet kjernen lager, har begge delene.
 */
export const FORBEHOLDET = [
  'Byggherren har ennå ikke svart på grunnlaget',
  'Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger.',
] as const;

/** Ett beløp i svaret, med etiketten for laget det står i i brevet. */
export interface Lagrad {
  saerskilt: boolean;
  /** Beløpet etter begrensningen etter § 34.1.3, ikke posten selv (VS-U5). */
  begrenset: boolean;
  beloep: number;
  /** `null` når brevet har ett lag, eller beløpet står uten lag. */
  etikett: string | null;
}

export interface Vederlagslag {
  /** Kjernens sammendrag av standpunktene i svaret (`beslutningsgrunnlag.linje`). */
  linje: string;
  /** Svaret godkjenner hele kravet (GR-U7). */
  sammenfall: boolean;
  rader: Lagrad[];
}

/**
 * Lagene i BHs svar på vederlaget slik brevet skriver dem (#1261): `foer` er saken før
 * svaret, `etter` saken med svaret kjernen forhåndsviser. Laget er det kjernen frøs for
 * standpunktet, flyttet ned med lagene fra grunnlaget, og etiketten står bare når brevet
 * har mer enn ett lag (OV-U32, OV-U33, LV-U4 punkt 4).
 */
export function vederlagslag(foer: Utledning, etter: Utledning): Vederlagslag | null {
  const svar = etter.spor.vederlag.gjeldendeSvar;
  if (!svar) return null;
  const { virkninger, linje, sammenfall } = svar.beslutningsgrunnlag;
  const forskyvning = grunnlagetForSvaret(foer).grunner.length;
  const lagFor = (id: string) => laget(virkninger.find((v) => v.standpunkt === id)!.virkning);
  const ordnet = forskyvning > 0 || virkninger.some((v) => (laget(v.virkning) ?? 0) > 1);
  const etiketten = (lag: number | null) =>
    ordnet && lag !== null ? etikett(lag + forskyvning) : null;
  const rader = svar.standpunkter.flatMap((s): Lagrad[] => {
    if (s.art === 'beloep')
      return [
        {
          saerskilt: s.saerskilt !== undefined,
          begrenset: false,
          beloep: s.godkjent,
          etikett: etiketten(lagFor(s.id)),
        },
      ];
    const lag = s.art === 'rettidighet' && s.hjemmel === '34.1.3' ? lagFor(s.id) : null;
    if (s.art === 'rettidighet' && s.begrenset !== undefined && lag !== null)
      return [{ saerskilt: true, begrenset: true, beloep: s.begrenset, etikett: etiketten(lag) }];
    return [];
  });
  return { linje, sammenfall, rader };
}
