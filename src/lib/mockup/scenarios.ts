/**
 * Scenariodata for mockup-appen.
 *
 * Hver scenario kombinerer:
 * - SakState (produksjonstype) fra mocks/caseState.ts
 * - Timeline (CloudEvents) fra mocks/timeline.ts
 * - Lokal UI-state (kladder, vedlegg, notater)
 */
import {
  scenario1_3AktiveSpor,
  scenario2_BlandetTilstand,
  scenario4_Omforent,
} from '$lib/mocks/caseState';
import {
  timeline1_3AktiveSpor,
  timeline2_BlandetTilstand,
  timeline4_Omforent,
} from '$lib/mocks/timeline';
import type { SakState, TimelineEvent } from '$lib/types/timeline';
import type { Draft, Attachment, InternalNote } from './types.js';

export type SporKey = 'ansvar' | 'vederlag' | 'frist';
export const SPOR_KEYS: SporKey[] = ['ansvar', 'vederlag', 'frist'];

export interface SporUIState {
  draft: Draft | null;
  att: Attachment[];
  note: InternalNote | null;
}

export interface ScenarioUIState {
  ansvar: SporUIState;
  vederlag: SporUIState;
  frist: SporUIState;
}

export interface Scenario {
  id: string;
  label: string;
  sak: SakState;
  timeline: TimelineEvent[];
  ui: ScenarioUIState;
}

const emptyUI: SporUIState = { draft: null, att: [], note: null };

/**
 * Variant av scenario 1 med pre-avslått grunnlag — demonstrerer subsidiær-UI.
 */
const scenario1_Subsidiaer: SakState = {
  ...scenario1_3AktiveSpor,
  sak_id: 'KOE-2024-047-SUB',
  grunnlag: {
    ...scenario1_3AktiveSpor.grunnlag,
    bh_resultat: 'avslatt',
    bh_begrunnelse:
      'Forbeholdet i geoteknisk rapport pkt. 4.2 dekker variasjoner i fjellkoter. Avvist.',
    bh_respondert_versjon: 0,
  },
  er_subsidiaert_vederlag: true,
  er_subsidiaert_frist: true,
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'scenario1',
    label: 'KOE-047 — 3 aktive spor',
    sak: scenario1_3AktiveSpor,
    timeline: timeline1_3AktiveSpor,
    ui: {
      ansvar: { ...emptyUI },
      vederlag: { ...emptyUI },
      frist: { ...emptyUI },
    },
  },
  {
    id: 'scenario1sub',
    label: 'KOE-047 — Subsidiært (grunnlag avslått)',
    sak: scenario1_Subsidiaer,
    timeline: timeline1_3AktiveSpor,
    ui: {
      ansvar: {
        draft: { text: 'Vi fastholder at forbeholdet i pkt. 4.2 er tilstrekkelig klart.' },
        att: [{ n: 'Geoteknisk rapport rev. B', p: 42 }, { n: 'Foto byggegrop 11.04' }],
        note: { d: '14.04', t: 'Sjekk pkt. 4.2 — gjelder kun vertikale avvik.' },
      },
      vederlag: {
        draft: { text: 'Vurderer 280k — borerigg-argumentet har noe for seg.', value: 280000 },
        att: [{ n: 'Kostnadsoppstilling', p: 3 }],
        note: null,
      },
      frist: { ...emptyUI, att: [{ n: 'Fremdriftsplan rev. 4', p: 8 }] },
    },
  },
  {
    id: 'scenario2',
    label: 'KOE-031 — Blandet tilstand',
    sak: scenario2_BlandetTilstand,
    timeline: timeline2_BlandetTilstand,
    ui: {
      ansvar: { ...emptyUI },
      vederlag: { ...emptyUI },
      frist: { ...emptyUI },
    },
  },
  {
    id: 'scenario4',
    label: 'KOE-019 — Omforent',
    sak: scenario4_Omforent,
    timeline: timeline4_Omforent,
    ui: {
      ansvar: { ...emptyUI },
      vederlag: { ...emptyUI },
      frist: { ...emptyUI },
    },
  },
];

export const DEFAULT_SCENARIO = SCENARIOS[1]; // Subsidiært som default — rikest UI
