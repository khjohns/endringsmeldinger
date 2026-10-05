/**
 * Domenelogikk for kontraktsforhold (grunnlag), NS 8407:2011 § 25.2 og § 32.2.
 */

import { differenceInDays } from 'date-fns';
import type { GrunnlagResponsResultat } from '../types/timeline';
import { REGELVERSJON } from './regelversjon';

export interface GrunnlagFormState {
  varsletITide: boolean | undefined;
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
  // New mode: no pre-selection — user must make explicit choices
  return {
    varsletITide: undefined,
    resultat: undefined,
    resultatError: false,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
  };
}

/** Eldre saker har underkategorien som liste; første gjelder. Speiler `forste_underkategori`. */
export function forsteUnderkategori(underkategori?: string | string[] | null): string | undefined {
  return (Array.isArray(underkategori) ? underkategori[0] : underkategori) ?? undefined;
}

export function erEndringMed32_2(event?: {
  hovedkategori?: string;
  underkategori?: string;
}): boolean {
  return event?.hovedkategori === 'ENDRING' && event?.underkategori !== 'EO';
}

/** Hele vederlaget og hele fristen er subsidiære. Speiler `er_grunnlag_subsidiaert` i backend. */
export function erGrunnlagetSubsidiaert(grunnlag: {
  resultat?: string | null;
  hovedkategori?: string | null;
  underkategori?: string | string[] | null;
  varsletITide?: boolean | null;
}): boolean {
  return (
    grunnlag.resultat === 'avslatt' ||
    (erEndringMed32_2({
      hovedkategori: grunnlag.hovedkategori ?? undefined,
      underkategori: forsteUnderkategori(grunnlag.underkategori),
    }) &&
      grunnlag.varsletITide === false)
  );
}

export function erPaalegg(event?: { hovedkategori?: string; underkategori?: string }): boolean {
  return (
    event?.hovedkategori === 'ENDRING' &&
    (event?.underkategori === 'IRREG' || event?.underkategori === 'VALGRETT')
  );
}

export function erPrekludert(
  state: Pick<GrunnlagFormState, 'varsletITide'>,
  config: GrunnlagDomainConfig
): boolean {
  return erEndringMed32_2(config.grunnlagEvent) && state.varsletITide === false;
}

// Passivitet (§ 32.3)
export function beregnPassivitet(event?: {
  hovedkategori?: string;
  underkategori?: string;
  dato_varslet?: string;
}): { erPassiv: boolean; dagerSidenVarsel: number } {
  const dagerSidenVarsel = event?.dato_varslet
    ? differenceInDays(new Date(), new Date(event.dato_varslet))
    : 0;

  const erPassiv = erEndringMed32_2(event) && dagerSidenVarsel > 10;

  return { erPassiv, dagerSidenVarsel };
}

export function getVerdictOptions(config: GrunnlagDomainConfig): VerdictOption[] {
  const opts: VerdictOption[] = [
    {
      value: 'godkjent',
      label: 'Godkjent',
      description: 'Grunnlag anerkjent',
      icon: 'check',
      colorScheme: 'green',
    },
    {
      value: 'avslatt',
      label: 'Avslått',
      description: 'Grunnlag avvist',
      icon: 'cross',
      colorScheme: 'red',
    },
  ];
  if (erPaalegg(config.grunnlagEvent)) {
    opts.push({
      value: 'frafalt',
      label: 'Frafalt',
      description: 'Pålegget frafalles',
      icon: 'undo',
      colorScheme: 'gray',
    });
  }
  return opts;
}

export function buildEventData(
  state: GrunnlagFormState,
  config: GrunnlagDomainConfig & {
    grunnlagEventId: string;
    lastResponseEventId?: string;
  }
): Record<string, unknown> {
  const isEndring = erEndringMed32_2(config.grunnlagEvent);
  const { dagerSidenVarsel } = beregnPassivitet(config.grunnlagEvent);

  if (config.isUpdateMode && config.lastResponseEventId) {
    return {
      regelversjon: REGELVERSJON,
      original_respons_id: config.lastResponseEventId,
      resultat: state.resultat,
      begrunnelse: state.begrunnelse,
      grunnlag_varslet_i_tide: isEndring ? state.varsletITide : undefined,
      dato_endret: new Date().toISOString().split('T')[0],
    };
  }

  return {
    regelversjon: REGELVERSJON,
    grunnlag_event_id: config.grunnlagEventId,
    resultat: state.resultat,
    begrunnelse: state.begrunnelse,
    grunnlag_varslet_i_tide: isEndring ? state.varsletITide : undefined,
    dager_siden_varsel: dagerSidenVarsel > 0 ? dagerSidenVarsel : undefined,
  };
}

export function buildTeRevisionEventData(config: {
  originalEventId: string;
  begrunnelseHtml: string;
  grunnlag?: import('$lib/types/timeline').GrunnlagTilstand;
}): Record<string, unknown> {
  return {
    ...(config.grunnlag
      ? {
          tittel: config.grunnlag.tittel,
          hovedkategori: config.grunnlag.hovedkategori,
          underkategori: config.grunnlag.underkategori,
          dato_oppdaget: config.grunnlag.dato_oppdaget,
          grunnlag_varsel: config.grunnlag.grunnlag_varsel,
          beskrivelse: config.begrunnelseHtml,
        }
      : {}),
    original_event_id: config.originalEventId,
    begrunnelse: config.begrunnelseHtml,
    dato_revidert: new Date().toISOString().split('T')[0],
  };
}
