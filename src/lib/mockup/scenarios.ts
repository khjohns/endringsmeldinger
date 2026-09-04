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
      'Forbeholdet i geoteknisk rapport pkt. 4.2 dekker variasjoner i fjellkoter. Avslått.',
    bh_respondert_versjon: 0,
  },
  vederlag: {
    ...scenario1_3AktiveSpor.vederlag,
    status: 'avslatt',
    bh_resultat: 'avslatt',
    bh_begrunnelse:
      'Ansvarsgrunnlaget er avslått, og vederlagskravet avslås derfor prinsipalt. Subsidiært godkjennes kr 2 100 000 av hovedkravet. Kravet om rigg og drift anses varslet for sent, men kr 280 000 godkjennes subsidiært. Produktivitetstapet på kr 180 000 godkjennes subsidiært.',
    bh_metode: 'REGNINGSARBEID',
    godkjent_belop: 0,
    bh_respondert_versjon: 2,
    subsidiaer_triggers: ['grunnlag_avslatt', 'preklusjon_rigg'],
    subsidiaer_resultat: 'delvis_godkjent',
    subsidiaer_godkjent_belop: 2560000,
    subsidiaer_begrunnelse:
      'Dersom ansvarsgrunnlaget likevel fører frem, godkjennes samlet kr 2 560 000.',
    differanse: 2930000,
    godkjenningsgrad_prosent: 0,
    har_subsidiaert_standpunkt: true,
    siste_event_id: 'evt-009',
    siste_oppdatert: '2026-02-16T13:20:00Z',
  },
  er_subsidiaert_vederlag: true,
  er_subsidiaert_frist: true,
  visningsstatus_vederlag: 'avslatt',
  antall_events: 9,
  siste_aktivitet: '2026-02-16T13:20:00Z',
  neste_handling: {
    rolle: 'BH',
    handling: 'Svar på fristkravet',
    spor: 'frist',
  },
};

const timeline1_Subsidiaer: TimelineEvent[] = [
  ...timeline1_3AktiveSpor,
  {
    specversion: '1.0',
    id: 'evt-009',
    source: '/projects/P001/cases/KOE-2024-047-SUB',
    type: 'no.oslo.koe.respons_vederlag',
    time: '2026-02-16T13:20:00Z',
    subject: 'KOE-2024-047-SUB',
    actorrole: 'BH',
    actor: 'Statens vegvesen',
    spor: 'vederlag',
    summary: 'BH avslo kravet prinsipalt og godkjente kr 2 560 000 subsidiært',
    data: {
      vederlag_krav_id: 'evt-008',
      respondert_versjon: 2,
      hovedkrav_varslet_i_tide: true,
      rigg_varslet_i_tide: false,
      produktivitet_varslet_i_tide: true,
      aksepterer_metode: true,
      vederlagsmetode: 'REGNINGSARBEID',
      hovedkrav_vurdering: 'delvis',
      hovedkrav_godkjent_belop: 2100000,
      rigg_vurdering: 'delvis',
      rigg_godkjent_belop: 280000,
      produktivitet_vurdering: 'godkjent',
      produktivitet_godkjent_belop: 180000,
      beregnings_resultat: 'avslatt',
      total_godkjent_belop: 0,
      total_krevd_belop: 2930000,
      begrunnelse:
        'Ansvarsgrunnlaget er avslått, og vederlagskravet avslås derfor prinsipalt. Subsidiært godkjennes kr 2 100 000 av hovedkravet. Kravet om rigg og drift anses varslet for sent, men kr 280 000 godkjennes subsidiært. Produktivitetstapet på kr 180 000 godkjennes subsidiært.',
      subsidiaer_triggers: ['grunnlag_avslatt', 'preklusjon_rigg'],
      subsidiaer_resultat: 'delvis_godkjent',
      subsidiaer_godkjent_belop: 2560000,
      subsidiaer_begrunnelse:
        'Dersom ansvarsgrunnlaget likevel fører frem, godkjennes samlet kr 2 560 000.',
    },
  },
];

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
    timeline: timeline1_Subsidiaer,
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
