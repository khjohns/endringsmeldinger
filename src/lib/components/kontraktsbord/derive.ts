/**
 * Adapter: SakState → display-data og domain configs for mockup-komponenter.
 *
 * Ren TypeScript — ingen Svelte-avhengigheter.
 * Domain config-avledninger er delt via $lib/domain/deriveConfig.
 */
import type { SakState } from '$lib/types/timeline';
import { getHjemmelLabel, getHjemmelObj } from '$lib/constants/categories.js';
import { GRUNNLAG_RESULTAT_LABELS } from '$lib/constants/responseOptions.js';
import type { SporKey } from './types.js';

// Re-export shared domain config derivation functions
export {
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from '$lib/domain/deriveConfig';

export interface TrackDisplay {
  label: string;
  num: string;
  // Grunnlag (binary)
  tePosition?: string;
  teRef?: string;
  bhPosition?: string;
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
  unspecified?: boolean;
  hasNotice?: boolean;
  isDisputed: boolean;
  isSubsidiary: boolean;
  isWithdrawn: boolean;
  withdrawnReason?: string;
  withdrawnViaGrunnlag?: boolean;
  // Oppdatering
  sisteOppdatert?: string;
  antallVersjoner: number;
}

const TRACK_META: Record<SporKey, { label: string; num: string }> = {
  ansvar: { label: 'Ansvarsgrunnlag', num: '' },
  vederlag: { label: 'Vederlag', num: '' },
  frist: { label: 'Fristforlengelse', num: '' },
};

export function deriveTrackDisplay(sak: SakState, spor: SporKey): TrackDisplay {
  const meta = TRACK_META[spor];

  if (spor === 'ansvar') {
    const g = sak.grunnlag;
    const hjemmel = getHjemmelObj(g.underkategori);
    return {
      ...meta,
      isBinary: true,
      tePosition: getHjemmelLabel(g.underkategori),
      teRef: hjemmel ? `§ ${hjemmel.hjemmel_basis}` : undefined,
      bhPosition: g.bh_resultat
        ? (GRUNNLAG_RESULTAT_LABELS[g.bh_resultat] ?? g.bh_resultat)
        : 'Ikke besvart',
      teText: g.beskrivelse ?? '',
      bhText: g.bh_begrunnelse ?? '',
      isDisputed: g.bh_resultat === 'avslatt',
      isSubsidiary: false,
      isWithdrawn: g.status === 'trukket',
      withdrawnReason: g.trukket_begrunnelse,
      sisteOppdatert: g.siste_oppdatert,
      antallVersjoner: g.antall_versjoner,
    };
  }

  if (spor === 'vederlag') {
    const v = sak.vederlag;
    return {
      ...meta,
      isBinary: false,
      unspecified: !v.metode,
      hasNotice: Boolean(v.varsler?.length),
      krevdValue: v.krevd_belop ?? v.netto_belop ?? 0,
      krevdUnit: ',-',
      bhPrinsipal: v.bh_resultat ? v.godkjent_belop : undefined,
      bhSubsidiaer: v.bh_resultat ? (v.subsidiaer_godkjent_belop ?? v.godkjent_belop) : undefined,
      bhUnit: ',-',
      teText: v.begrunnelse ?? '',
      bhText: v.bh_begrunnelse ?? '',
      isDisputed: v.bh_resultat === 'avslatt',
      isSubsidiary: sak.er_subsidiaert_vederlag,
      isWithdrawn: v.status === 'trukket',
      withdrawnReason: v.trukket_begrunnelse,
      withdrawnViaGrunnlag: v.trukket_via_grunnlag,
      sisteOppdatert: v.siste_oppdatert,
      antallVersjoner: v.antall_versjoner,
    };
  }

  // frist
  const f = sak.frist;
  return {
    ...meta,
    isBinary: false,
    unspecified: f.varsel_type !== 'spesifisert' && f.krevd_dager == null,
    hasNotice: Boolean(f.frist_varsel),
    krevdValue: f.krevd_dager ?? 0,
    krevdUnit: ' dager',
    bhPrinsipal: f.bh_resultat ? f.godkjent_dager : undefined,
    bhSubsidiaer: f.bh_resultat ? (f.subsidiaer_godkjent_dager ?? f.godkjent_dager) : undefined,
    bhUnit: ' dager',
    teText: f.begrunnelse ?? '',
    bhText: f.bh_begrunnelse ?? '',
    isDisputed: f.bh_resultat === 'avslatt',
    isSubsidiary: sak.er_subsidiaert_frist,
    isWithdrawn: f.status === 'trukket',
    withdrawnReason: f.trukket_begrunnelse,
    withdrawnViaGrunnlag: f.trukket_via_grunnlag,
    sisteOppdatert: f.siste_oppdatert,
    antallVersjoner: f.antall_versjoner,
  };
}

/** Ubesvarte krav inngår ikke i bestridt omfang. */
export function assessedGap(claimed: number, assessed: number | undefined): number | undefined {
  return assessed === undefined ? undefined : Math.max(0, claimed - assessed);
}

export function formatExposure(amount: number | undefined, days: number | undefined): string {
  const parts = [
    amount === undefined ? null : `${amount.toLocaleString('nb-NO')},-`,
    days === undefined ? null : `${days} dager`,
  ];
  return parts.filter(Boolean).join(' + ') || 'Ikke vurdert';
}
