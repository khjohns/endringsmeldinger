/**
 * grunnlagDomain.ts — Ren NS 8407 domenelogikk for kontraktsforhold (grunnlag).
 *
 * Ingen React-avhengigheter. Alle funksjoner er rene (input → output).
 * Importeres av useGrunnlagBridge.ts som tynn React-adapter.
 *
 * Ref: ADR-003 L14, §25.2 / §32.2 NS 8407:2011
 */

import { differenceInDays } from 'date-fns';
import type { GrunnlagResponsResultat } from '../types/timeline';

// ============================================================================
// TYPES
// ============================================================================

export interface GrunnlagFormState {
  varsletITide: boolean;
  resultat: string | undefined;
  resultatError: boolean;
  begrunnelse: string;
  begrunnelseValidationError: string | undefined;
}

export interface GrunnlagDomainConfig {
  grunnlagEvent?: {
    hovedkategori?: string;
    underkategori?: string;
    dato_varslet?: string;
  };
  isUpdateMode: boolean;
  forrigeResultat?: GrunnlagResponsResultat;
  harSubsidiaereSvar: boolean;
}

export interface VerdictOption {
  value: string;
  label: string;
  description: string;
  icon: 'check' | 'cross' | 'undo';
  colorScheme: 'green' | 'red' | 'gray';
}

export interface GrunnlagDefaultsConfig {
  isUpdateMode: boolean;
  lastResponseEvent?: {
    resultat: GrunnlagResponsResultat;
  };
}

// ============================================================================
// DEFAULTS
// ============================================================================

export function getDefaults(config: GrunnlagDefaultsConfig): GrunnlagFormState {
  if (config.isUpdateMode && config.lastResponseEvent) {
    return {
      varsletITide: true,
      resultat: config.lastResponseEvent.resultat,
      resultatError: false,
      begrunnelse: '',
      begrunnelseValidationError: undefined,
    };
  }
  return {
    varsletITide: true,
    resultat: undefined,
    resultatError: false,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
  };
}

// ============================================================================
// CATEGORY CHECKS
// ============================================================================

export function erEndringMed32_2(event?: { hovedkategori?: string; underkategori?: string }): boolean {
  return event?.hovedkategori === 'ENDRING' && event?.underkategori !== 'EO';
}

export function erPaalegg(event?: { hovedkategori?: string; underkategori?: string }): boolean {
  return event?.hovedkategori === 'ENDRING' &&
    (event?.underkategori === 'IRREG' || event?.underkategori === 'VALGRETT');
}

export function erForceMajeure(event?: { hovedkategori?: string }): boolean {
  return event?.hovedkategori === 'FORCE_MAJEURE';
}

// ============================================================================
// PRECLUSION
// ============================================================================

export function erPrekludert(
  state: Pick<GrunnlagFormState, 'varsletITide'>,
  config: GrunnlagDomainConfig,
): boolean {
  return erEndringMed32_2(config.grunnlagEvent) && state.varsletITide === false;
}

// ============================================================================
// PASSIVITY (§32.3)
// ============================================================================

export function beregnPassivitet(
  event?: { hovedkategori?: string; underkategori?: string; dato_varslet?: string },
): { erPassiv: boolean; dagerSidenVarsel: number } {
  const dagerSidenVarsel = event?.dato_varslet
    ? differenceInDays(new Date(), new Date(event.dato_varslet))
    : 0;

  const erPassiv = erEndringMed32_2(event) && dagerSidenVarsel > 10;

  return { erPassiv, dagerSidenVarsel };
}

// ============================================================================
// SNUOPERASJON
// ============================================================================

export function erSnuoperasjon(
  state: Pick<GrunnlagFormState, 'resultat'>,
  config: GrunnlagDomainConfig,
): boolean {
  if (!config.isUpdateMode || config.forrigeResultat !== 'avslatt') return false;
  return state.resultat === 'godkjent';
}

// ============================================================================
// VERDICT OPTIONS
// ============================================================================

export function getVerdictOptions(config: GrunnlagDomainConfig): VerdictOption[] {
  const opts: VerdictOption[] = [
    { value: 'godkjent', label: 'Godkjent', description: 'Grunnlag anerkjent', icon: 'check', colorScheme: 'green' },
    { value: 'avslatt', label: 'Avslått', description: 'Grunnlag avvist', icon: 'cross', colorScheme: 'red' },
  ];
  if (erPaalegg(config.grunnlagEvent)) {
    opts.push({ value: 'frafalt', label: 'Frafalt', description: 'Pålegget frafalles', icon: 'undo', colorScheme: 'gray' });
  }
  return opts;
}

// ============================================================================
// DYNAMIC PLACEHOLDER
// ============================================================================

export function getDynamicPlaceholder(
  resultat: string | undefined,
  prekludert: boolean,
): string {
  if (!resultat) return 'Velg resultat i kortet til venstre, deretter skriv begrunnelse...';
  if (prekludert && resultat === 'godkjent') return 'Begrunn din preklusjonsinnsigelse og din subsidiære godkjenning...';
  if (prekludert && resultat === 'avslatt') return 'Begrunn din preklusjonsinnsigelse og ditt subsidiære avslag...';
  if (resultat === 'godkjent') return 'Begrunn din vurdering av kontraktsforholdet...';
  if (resultat === 'avslatt') return 'Forklar hvorfor forholdet ikke gir grunnlag for krav...';
  if (resultat === 'frafalt') return 'Begrunn hvorfor pålegget frafalles...';
  return 'Begrunn din vurdering...';
}

// ============================================================================
// BUILD EVENT DATA
// ============================================================================

export function buildEventData(
  state: GrunnlagFormState,
  config: GrunnlagDomainConfig & {
    grunnlagEventId: string;
    lastResponseEventId?: string;
  },
): Record<string, unknown> {
  const isEndring = erEndringMed32_2(config.grunnlagEvent);
  const { dagerSidenVarsel } = beregnPassivitet(config.grunnlagEvent);

  if (config.isUpdateMode && config.lastResponseEventId) {
    return {
      original_respons_id: config.lastResponseEventId,
      resultat: state.resultat,
      begrunnelse: state.begrunnelse,
      grunnlag_varslet_i_tide: isEndring ? state.varsletITide : undefined,
      dato_endret: new Date().toISOString().split('T')[0],
    };
  }

  return {
    grunnlag_event_id: config.grunnlagEventId,
    resultat: state.resultat,
    begrunnelse: state.begrunnelse,
    grunnlag_varslet_i_tide: isEndring ? state.varsletITide : undefined,
    dager_siden_varsel: dagerSidenVarsel > 0 ? dagerSidenVarsel : undefined,
  };
}

// ============================================================================
// BH UPDATE DEFAULTS
// ============================================================================

export interface BhUpdateConfig {
  forrigeResultat: GrunnlagResponsResultat;
  forrigeVarsletITide?: boolean;
  forrigeBegrunnelseHtml?: string;
}

/**
 * Pre-fill form state for BH update mode.
 * Includes varsling and begrunnelse from previous response.
 */
export function getBhUpdateDefaults(config: BhUpdateConfig): GrunnlagFormState {
  return {
    varsletITide: config.forrigeVarsletITide ?? true,
    resultat: config.forrigeResultat,
    resultatError: false,
    begrunnelse: config.forrigeBegrunnelseHtml ?? '',
    begrunnelseValidationError: undefined,
  };
}

// ============================================================================
// ENDRINGSDETEKSJON (BH oppdatering)
// ============================================================================

export interface EndringItem {
  felt: 'resultat' | 'varsletITide' | 'begrunnelse';
  type: 'snuoperasjon' | 'trekker_godkjenning' | 'frafaller_innsigelse' | 'ny_innsigelse' | 'endret';
  beskrivelse: string;
}

export interface EndringsInfo {
  harEndring: boolean;
  endringer: EndringItem[];
}

/**
 * Detect what BH has changed compared to their previous response.
 * Used for inline warnings (snuoperasjon, frafaller innsigelse, etc.)
 */
export function detekterEndringer(
  state: Pick<GrunnlagFormState, 'resultat' | 'varsletITide' | 'begrunnelse'>,
  forrige: { resultat: GrunnlagResponsResultat; varsletITide?: boolean; begrunnelse?: string },
): EndringsInfo {
  const endringer: EndringItem[] = [];

  // Resultat changes
  if (state.resultat && state.resultat !== forrige.resultat) {
    if (forrige.resultat === 'avslatt' && state.resultat === 'godkjent') {
      endringer.push({
        felt: 'resultat',
        type: 'snuoperasjon',
        beskrivelse: 'Snuoperasjon: endrer fra avslått til godkjent',
      });
    } else if (forrige.resultat === 'godkjent' && state.resultat === 'avslatt') {
      endringer.push({
        felt: 'resultat',
        type: 'trekker_godkjenning',
        beskrivelse: 'Trekker tilbake godkjenning',
      });
    } else {
      endringer.push({
        felt: 'resultat',
        type: 'endret',
        beskrivelse: `Endrer resultat fra ${forrige.resultat} til ${state.resultat}`,
      });
    }
  }

  // Varsling changes
  if (forrige.varsletITide !== undefined && state.varsletITide !== forrige.varsletITide) {
    if (forrige.varsletITide === false && state.varsletITide === true) {
      endringer.push({
        felt: 'varsletITide',
        type: 'frafaller_innsigelse',
        beskrivelse: 'Frafaller innsigelse om varsling (§32.2)',
      });
    } else if (forrige.varsletITide === true && state.varsletITide === false) {
      endringer.push({
        felt: 'varsletITide',
        type: 'ny_innsigelse',
        beskrivelse: 'Ny innsigelse om varsling (§32.2)',
      });
    }
  }

  // Begrunnelse changes (simple text comparison)
  if (forrige.begrunnelse && state.begrunnelse !== forrige.begrunnelse) {
    endringer.push({
      felt: 'begrunnelse',
      type: 'endret',
      beskrivelse: 'Begrunnelse er endret',
    });
  }

  return {
    harEndring: endringer.length > 0,
    endringer,
  };
}

// ============================================================================
// TE REVISION EVENT DATA
// ============================================================================

/**
 * Build event payload for TE revising their grunnlag begrunnelse.
 */
export function buildTeRevisionEventData(config: {
  originalEventId: string;
  begrunnelseHtml: string;
}): Record<string, unknown> {
  return {
    original_event_id: config.originalEventId,
    begrunnelse: config.begrunnelseHtml,
    dato_revidert: new Date().toISOString().split('T')[0],
  };
}
