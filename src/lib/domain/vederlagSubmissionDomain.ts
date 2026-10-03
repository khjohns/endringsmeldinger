/**
 * Domenelogikk for totalentreprenørens vederlagskrav, NS 8407:2011 § 34.
 */

import type { VederlagsMetode } from '../constants/paymentMethods';

export type VederlagSubmissionScenario = 'new' | 'edit';

export interface VederlagSubmissionFormState {
  metode: VederlagsMetode | undefined;
  belopDirekte: number | undefined;
  kostnadsOverslag: number | undefined;
  kreverJustertEp: boolean;
  varsletForOppstart: boolean;
  harRiggKrav: boolean;
  belopRigg: number | undefined;
  datoKlarOverRigg: string | undefined;
  harProduktivitetKrav: boolean;
  belopProduktivitet: number | undefined;
  datoKlarOverProduktivitet: string | undefined;
  begrunnelse: string;
  begrunnelseValidationError: string | undefined;
}

export interface VederlagSubmissionDefaultsConfig {
  scenario: VederlagSubmissionScenario;
  existing?: {
    metode?: VederlagsMetode;
    belop_direkte?: number;
    kostnads_overslag?: number;
    krever_justert_ep?: boolean;
    varslet_for_oppstart?: boolean;
    begrunnelse?: string;
    saerskilt_krav?: {
      rigg_drift?: { belop?: number; dato_klar_over?: string };
      produktivitet?: { belop?: number; dato_klar_over?: string };
    } | null;
  };
}

export interface VederlagSubmissionVisibility {
  showBelopDirekte: boolean;
  showKostnadsOverslag: boolean;
  showJustertEp: boolean;
  showVarsletForOppstart: boolean;
}

export interface VederlagSubmissionBuildConfig {
  scenario: VederlagSubmissionScenario;
  grunnlagEventId: string;
  originalEventId?: string;
}

export interface VederlagSubmissionEventData {
  grunnlag_event_id: string;
  metode: VederlagsMetode;
  belop_direkte: number | undefined;
  kostnads_overslag: number | undefined;
  begrunnelse: string;
  krever_justert_ep: boolean | undefined;
  varslet_for_oppstart: boolean | undefined;
  saerskilt_krav: {
    rigg_drift?: { belop?: number; dato_klar_over?: string };
    produktivitet?: { belop?: number; dato_klar_over?: string };
  } | null;
  original_event_id?: string;
}

export function getDefaults(config: VederlagSubmissionDefaultsConfig): VederlagSubmissionFormState {
  if (config.scenario === 'edit' && config.existing) {
    const e = config.existing;
    return {
      metode: e.metode,
      belopDirekte: e.belop_direkte,
      kostnadsOverslag: e.kostnads_overslag,
      kreverJustertEp: e.krever_justert_ep ?? false,
      varsletForOppstart: e.varslet_for_oppstart ?? true,
      harRiggKrav: (e.saerskilt_krav?.rigg_drift?.belop ?? 0) > 0,
      belopRigg: e.saerskilt_krav?.rigg_drift?.belop,
      datoKlarOverRigg: e.saerskilt_krav?.rigg_drift?.dato_klar_over,
      harProduktivitetKrav: (e.saerskilt_krav?.produktivitet?.belop ?? 0) > 0,
      belopProduktivitet: e.saerskilt_krav?.produktivitet?.belop,
      datoKlarOverProduktivitet: e.saerskilt_krav?.produktivitet?.dato_klar_over,
      begrunnelse: e.begrunnelse ?? '',
      begrunnelseValidationError: undefined,
    };
  }

  return {
    metode: undefined,
    belopDirekte: undefined,
    kostnadsOverslag: undefined,
    kreverJustertEp: false,
    varsletForOppstart: true,
    harRiggKrav: false,
    belopRigg: undefined,
    datoKlarOverRigg: undefined,
    harProduktivitetKrav: false,
    belopProduktivitet: undefined,
    datoKlarOverProduktivitet: undefined,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
  };
}

export function beregnVisibility(
  state: Pick<VederlagSubmissionFormState, 'metode'>
): VederlagSubmissionVisibility {
  const metode = state.metode;
  return {
    showBelopDirekte: metode === 'ENHETSPRISER' || metode === 'FASTPRIS_TILBUD',
    showKostnadsOverslag: metode === 'REGNINGSARBEID',
    showJustertEp: metode === 'ENHETSPRISER',
    showVarsletForOppstart: metode === 'REGNINGSARBEID',
  };
}

export function beregnCanSubmit(state: VederlagSubmissionFormState): boolean {
  if (!state.metode) return false;

  if (state.metode === 'REGNINGSARBEID') {
    // Kostnadsoverslag is optional per §30.2 but begrunnelse is required
  } else {
    if (state.belopDirekte === undefined) return false;
  }

  if (state.begrunnelse.length < 10) return false;

  return true;
}

export function getDynamicPlaceholder(metode: VederlagsMetode | undefined): string {
  if (!metode) return 'Velg beregningsmetode for å begynne...';
  if (metode === 'ENHETSPRISER')
    return 'Begrunn kravets omfang med referanse til kontraktens enhetspriser (§34.3)...';
  if (metode === 'REGNINGSARBEID')
    return 'Begrunn behovet for regningsarbeid og estimer omfanget (§34.4)...';
  return 'Begrunn tilbudt fastpris (§34.2.1)...';
}

export interface TeStatusSummaryConfig {
  scenario: VederlagSubmissionScenario;
  existingBelop?: number;
}

export function beregnTeStatusSummary(
  state: Pick<VederlagSubmissionFormState, 'metode' | 'belopDirekte' | 'kostnadsOverslag'>,
  config: TeStatusSummaryConfig
): string | null {
  if (!state.metode) return null;

  const belop = state.metode === 'REGNINGSARBEID' ? state.kostnadsOverslag : state.belopDirekte;

  if (config.scenario === 'edit') {
    if (belop !== undefined && belop > 0) {
      if (config.existingBelop && config.existingBelop !== belop) {
        return `Justerer krav fra kr ${formatCompact(config.existingBelop)} til kr ${formatCompact(belop)}`;
      }
      return `Oppdaterer krav om kr ${formatCompact(belop)}`;
    }
    return 'Oppdaterer vederlagskrav';
  }

  if (belop !== undefined && belop > 0) {
    return `Krav om kr ${formatCompact(belop)} i vederlag`;
  }
  return 'Sender vederlagskrav';
}

function formatCompact(n: number): string {
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 });
}

export function buildEventData(
  state: VederlagSubmissionFormState,
  config: VederlagSubmissionBuildConfig
): VederlagSubmissionEventData {
  if (!state.metode) throw new Error('metode is required');

  const isRegning = state.metode === 'REGNINGSARBEID';
  const isEnhetspriser = state.metode === 'ENHETSPRISER';

  // § 34.1.3
  const saerskiltKrav =
    state.harRiggKrav || state.harProduktivitetKrav
      ? {
          rigg_drift: state.harRiggKrav
            ? { belop: state.belopRigg, dato_klar_over: state.datoKlarOverRigg }
            : undefined,
          produktivitet: state.harProduktivitetKrav
            ? { belop: state.belopProduktivitet, dato_klar_over: state.datoKlarOverProduktivitet }
            : undefined,
        }
      : null;

  const result: VederlagSubmissionEventData = {
    grunnlag_event_id: config.grunnlagEventId,
    metode: state.metode,
    belop_direkte: isRegning ? undefined : state.belopDirekte,
    kostnads_overslag: isRegning ? state.kostnadsOverslag : undefined,
    begrunnelse: state.begrunnelse,
    krever_justert_ep: isEnhetspriser ? state.kreverJustertEp : undefined,
    varslet_for_oppstart: isRegning ? state.varsletForOppstart : undefined,
    saerskilt_krav: saerskiltKrav,
  };

  if (config.originalEventId) {
    result.original_event_id = config.originalEventId;
  }

  return result;
}

export function getEventType(config: { scenario: VederlagSubmissionScenario }): string {
  switch (config.scenario) {
    case 'new':
      return 'vederlag_krav_sendt';
    case 'edit':
      return 'vederlag_krav_oppdatert';
  }
}
