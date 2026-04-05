/**
 * Adapter: SakState → display-data og domain configs for mockup-komponenter.
 *
 * Ren TypeScript — ingen Svelte-avhengigheter.
 */
import type { SakState } from '$lib/types/timeline';
import type { VederlagDomainConfig } from '$lib/domain/vederlagDomain';
import type { FristDomainConfig } from '$lib/domain/fristDomain';
import type { GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';

export type SporKey = 'ansvar' | 'vederlag' | 'frist';

export interface TrackDisplay {
  label: string;
  num: string;
  // Grunnlag (binary)
  tePosition?: string;
  teRef?: string;
  bhPosition?: string;
  bhRef?: string;
  // Vederlag/Frist (numeric)
  krevdValue?: number;
  krevdUnit?: string;
  bhPrinsipal?: number;
  bhSubsidiaer?: number;
  bhUnit?: string;
  // Tekst
  teText: string;
  bhText: string;
  // Status
  isBinary: boolean;
  isDisputed: boolean;
  isSubsidiary: boolean;
}

const TRACK_META: Record<SporKey, { label: string; num: string }> = {
  ansvar: { label: 'Ansvarsgrunnlag', num: 'I' },
  vederlag: { label: 'Økonomi', num: 'II' },
  frist: { label: 'Frist', num: 'III' },
};

export function deriveTrackDisplay(sak: SakState, spor: SporKey): TrackDisplay {
  const meta = TRACK_META[spor];

  if (spor === 'ansvar') {
    const g = sak.grunnlag;
    return {
      ...meta,
      isBinary: true,
      tePosition: g.hovedkategori?.toUpperCase(),
      teRef: '§ 23.1',
      bhPosition:
        g.bh_resultat === 'godkjent'
          ? 'Godkjent'
          : g.bh_resultat === 'frafalt'
            ? 'Frafalt'
            : 'Avvist',
      bhRef: '§ 23.1 (2)',
      teText: g.beskrivelse ?? '',
      bhText: g.bh_begrunnelse ?? '',
      isDisputed: g.bh_resultat === 'avslatt' || !g.bh_resultat,
      isSubsidiary: false,
    };
  }

  if (spor === 'vederlag') {
    const v = sak.vederlag;
    return {
      ...meta,
      isBinary: false,
      krevdValue: v.krevd_belop ?? v.netto_belop ?? 0,
      krevdUnit: ',-',
      bhPrinsipal: v.godkjent_belop ?? 0,
      bhSubsidiaer: v.subsidiaer_godkjent_belop ?? v.godkjent_belop ?? 0,
      bhUnit: ',-',
      teText: v.begrunnelse ?? '',
      bhText: v.bh_begrunnelse ?? '',
      isDisputed: v.bh_resultat === 'avslatt',
      isSubsidiary: sak.er_subsidiaert_vederlag,
    };
  }

  // frist
  const f = sak.frist;
  return {
    ...meta,
    isBinary: false,
    krevdValue: f.krevd_dager ?? 0,
    krevdUnit: ' dgr',
    bhPrinsipal: f.godkjent_dager ?? 0,
    bhSubsidiaer: f.subsidiaer_godkjent_dager ?? f.godkjent_dager ?? 0,
    bhUnit: ' dgr',
    teText: f.begrunnelse ?? '',
    bhText: f.bh_begrunnelse ?? '',
    isDisputed: f.bh_resultat === 'avslatt',
    isSubsidiary: sak.er_subsidiaert_frist,
  };
}

export function deriveVederlagDomainConfig(sak: SakState): VederlagDomainConfig {
  const v = sak.vederlag;
  const g = sak.grunnlag;
  return {
    metode: v.metode,
    hovedkravBelop: v.krevd_belop ?? v.netto_belop ?? 0,
    riggBelop: v.saerskilt_krav?.rigg_drift?.belop,
    produktivitetBelop: v.saerskilt_krav?.produktivitet?.belop,
    harRiggKrav: !!v.saerskilt_krav?.rigg_drift,
    harProduktivitetKrav: !!v.saerskilt_krav?.produktivitet,
    kreverJustertEp: v.krever_justert_ep ?? false,
    kostnadsOverslag: v.kostnads_overslag,
    hovedkategori: g.hovedkategori as VederlagDomainConfig['hovedkategori'],
    grunnlagVarsletForSent: g.grunnlag_varslet_i_tide === false,
    grunnlagStatus: g.bh_resultat as VederlagDomainConfig['grunnlagStatus'],
  };
}

export function deriveFristDomainConfig(sak: SakState): FristDomainConfig {
  const f = sak.frist;
  const g = sak.grunnlag;
  return {
    varselType: f.varsel_type,
    krevdDager: f.krevd_dager ?? 0,
    erSvarPaForesporsel: !!f.har_bh_foresporsel,
    harTidligereVarselITide: f.frist_varsel_ok !== false,
    erGrunnlagSubsidiaer: g.bh_resultat === 'avslatt',
    erHelFristSubsidiaerPgaGrunnlag: g.grunnlag_varslet_i_tide === false,
  };
}

export function deriveGrunnlagDomainConfig(sak: SakState): GrunnlagDomainConfig {
  const g = sak.grunnlag;
  return {
    grunnlagEvent: {
      hovedkategori: g.hovedkategori,
      underkategori: Array.isArray(g.underkategori) ? g.underkategori[0] : g.underkategori,
    },
    isUpdateMode: (g.bh_respondert_versjon ?? -1) >= 0,
    forrigeResultat: g.bh_resultat,
    harSubsidiaereSvar: sak.er_subsidiaert_vederlag || sak.er_subsidiaert_frist,
  };
}
