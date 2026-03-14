/**
 * Varslingsstatus — beregner compliance-status for varsling per spor.
 *
 * Basert på NS 8407 krav til varsling og spesifisering.
 */

import type { SakState, SporType } from '$lib/types/timeline';

export type VarslingStatusType = 'ok' | 'warning' | 'breach' | 'na';

export interface VarslingItem {
  label: string;
  paragrafRef: string;
  status: VarslingStatusType;
  spor: SporType;
}

interface VarslingRegel {
  spor: SporType;
  paragrafRef: string;
  erRelevant: (state: SakState) => boolean;
  harVarsel: (state: SakState) => boolean;
  labelVarslet: (state: SakState) => string;
  labelIkkeVarslet: string;
  erForSent: (state: SakState) => boolean;
}

const VEDERLAG_AKTIVE_STATUSER = new Set([
  'sendt',
  'under_behandling',
  'godkjent',
  'delvis_godkjent',
  'avslatt',
  'under_forhandling',
  'laast',
]);

const REGLER: VarslingRegel[] = [
  {
    spor: 'grunnlag',
    paragrafRef: '§32.2',
    erRelevant: (s) => s.grunnlag.status !== 'ikke_relevant',
    harVarsel: (s) => !!s.grunnlag.grunnlag_varsel?.dato_sendt,
    labelVarslet: (s) =>
      s.grunnlag.grunnlag_varslet_i_tide === false ? 'Endring varslet sent' : 'Endring varslet',
    labelIkkeVarslet: 'Endring ikke varslet',
    erForSent: (s) => s.grunnlag.grunnlag_varslet_i_tide === false,
  },
  {
    spor: 'frist',
    paragrafRef: '§33.4',
    erRelevant: (s) => s.frist.status !== 'ikke_relevant',
    harVarsel: (s) => !!s.frist.frist_varsel?.dato_sendt,
    labelVarslet: (s) =>
      s.frist.frist_varsel_ok === false ? 'Frist: varslet sent' : 'Frist: varslet',
    labelIkkeVarslet: 'Frist: ikke varslet',
    erForSent: (s) => s.frist.frist_varsel_ok === false,
  },
  {
    spor: 'frist',
    paragrafRef: '§33.6',
    erRelevant: (s) => s.frist.status !== 'ikke_relevant',
    harVarsel: (s) => !!s.frist.spesifisert_varsel?.dato_sendt,
    labelVarslet: (s) =>
      s.frist.spesifisert_krav_ok === false ? 'Frist: ikke spesifisert' : 'Frist: spesifisert',
    labelIkkeVarslet: 'Frist: ikke spesifisert',
    erForSent: (s) => s.frist.spesifisert_krav_ok === false,
  },
  {
    spor: 'vederlag',
    paragrafRef: '§34.1',
    erRelevant: (s) => s.vederlag.status !== 'ikke_relevant',
    harVarsel: (s) => VEDERLAG_AKTIVE_STATUSER.has(s.vederlag.status),
    labelVarslet: () => 'Vederlag: varslet',
    labelIkkeVarslet: 'Vederlag: ikke varslet',
    erForSent: () => false,
  },
];

/**
 * Beregner varslingsstatus fra SakState.
 *
 * Returnerer en liste med VarslingItem for:
 * 1. Grunnlag: Endring varslet (§32.2)
 * 2. Frist: varslet (§33.4)
 * 3. Frist: spesifisert (§33.6)
 * 4. Vederlag: varslet (§34.1)
 */
export function beregnVarslingStatus(state: SakState): VarslingItem[] {
  const items: VarslingItem[] = [];

  for (const regel of REGLER) {
    if (!regel.erRelevant(state)) continue;

    if (regel.harVarsel(state)) {
      items.push({
        label: regel.labelVarslet(state),
        paragrafRef: regel.paragrafRef,
        status: regel.erForSent(state) ? 'warning' : 'ok',
        spor: regel.spor,
      });
    } else {
      items.push({
        label: regel.labelIkkeVarslet,
        paragrafRef: regel.paragrafRef,
        status: 'na',
        spor: regel.spor,
      });
    }
  }

  return items;
}

const VARSLING_SYMBOLER: Record<VarslingStatusType, string> = {
  ok: '✓',
  warning: '⚠',
  breach: '✕',
  na: '–',
};

/** Symbol for display */
export function varslingSymbol(status: VarslingStatusType): string {
  return VARSLING_SYMBOLER[status];
}
