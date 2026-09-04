/**
 * Reaktiv mockup-store. Wrapper SakState + lokal UI-state.
 * Scenariovalg bytter hele SakState + timeline + UI-state.
 */
import { SCENARIOS, DEFAULT_SCENARIO, SPOR_KEYS } from './scenarios.js';
import type { Scenario, SporUIState, SporKey } from './scenarios.js';
import {
  deriveTrackDisplay,
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from './derive.js';
import type { TrackDisplay } from './derive.js';
import type { Draft } from './types.js';
import { getPartsNavn } from '$lib/utils/partsNavn.js';

const INACTIVE_STATUSES = new Set(['ikke_relevant', 'utkast', 'trukket']);

function createStore() {
  let scenario: Scenario = $state(structuredClone(DEFAULT_SCENARIO));

  const teNavn = $derived(getPartsNavn('TE', scenario.sak.entreprenor, scenario.sak.byggherre));
  const bhNavn = $derived(getPartsNavn('BH', scenario.sak.entreprenor, scenario.sak.byggherre));

  const displays: Record<SporKey, TrackDisplay> = $derived({
    ansvar: deriveTrackDisplay(scenario.sak, 'ansvar'),
    vederlag: deriveTrackDisplay(scenario.sak, 'vederlag'),
    frist: deriveTrackDisplay(scenario.sak, 'frist'),
  });

  const vederlagDomainConfig = $derived(deriveVederlagDomainConfig(scenario.sak));
  const fristDomainConfig = $derived(deriveFristDomainConfig(scenario.sak));
  const grunnlagDomainConfig = $derived(deriveGrunnlagDomainConfig(scenario.sak));

  const draftCount = $derived(SPOR_KEYS.filter((k) => scenario.ui[k].draft !== null).length);

  function selectScenario(id: string) {
    const found = SCENARIOS.find((s) => s.id === id);
    if (found) scenario = structuredClone(found);
  }

  function display(spor: SporKey): TrackDisplay {
    return displays[spor];
  }

  function getUI(spor: SporKey): SporUIState {
    return scenario.ui[spor];
  }

  function setDraft(spor: SporKey, draft: Draft | null) {
    scenario.ui[spor].draft = draft;
  }

  function sendGrunnlagSvar(resultat: 'godkjent' | 'avslatt' | 'frafalt') {
    scenario.sak.grunnlag.bh_resultat = resultat;
    scenario.sak.grunnlag.bh_respondert_versjon = 0;
    scenario.ui.ansvar.draft = null;
  }

  function sendVederlagSvar(godkjentBelop: number) {
    const krevd = scenario.sak.vederlag.krevd_belop ?? 0;
    scenario.sak.vederlag.bh_resultat =
      godkjentBelop >= krevd ? 'godkjent' : godkjentBelop > 0 ? 'delvis_godkjent' : 'avslatt';
    scenario.sak.vederlag.godkjent_belop = godkjentBelop;
    scenario.sak.vederlag.bh_respondert_versjon = 0;
    scenario.ui.vederlag.draft = null;
  }

  function sendFristSvar(godkjentDager: number) {
    const krevd = scenario.sak.frist.krevd_dager ?? 0;
    scenario.sak.frist.bh_resultat =
      godkjentDager >= krevd ? 'godkjent' : godkjentDager > 0 ? 'delvis_godkjent' : 'avslatt';
    scenario.sak.frist.godkjent_dager = godkjentDager;
    scenario.sak.frist.bh_respondert_versjon = 0;
    scenario.ui.frist.draft = null;
  }

  function sendTeGrunnlag(begrunnelse: string) {
    const grunnlag = scenario.sak.grunnlag;
    const now = new Date().toISOString();
    const previousEventId =
      scenario.timeline
        .filter((event) => event.spor === 'grunnlag' && event.actorrole === 'TE')
        .at(-1)?.id ??
      grunnlag.siste_event_id ??
      'grunnlag-opprettet';
    const currentVersionCount = Math.max(
      grunnlag.antall_versjoner,
      scenario.timeline.filter((event) => event.spor === 'grunnlag' && event.actorrole === 'TE')
        .length,
      1
    );
    const eventId = `evt-grunnlag-update-${Date.now()}`;

    grunnlag.beskrivelse = begrunnelse;
    grunnlag.antall_versjoner = currentVersionCount + 1;
    grunnlag.siste_event_id = eventId;
    grunnlag.siste_oppdatert = now;
    scenario.ui.ansvar.draft = null;

    scenario.timeline.push({
      specversion: '1.0',
      id: eventId,
      source: `/projects/P001/cases/${scenario.sak.sak_id}`,
      type: 'no.oslo.koe.grunnlag_oppdatert',
      time: now,
      subject: scenario.sak.sak_id,
      actorrole: 'TE',
      actor: scenario.sak.entreprenor ?? 'TE',
      spor: 'grunnlag',
      summary: 'Totalentreprenøren oppdaterte begrunnelsen for ansvarsgrunnlaget',
      data: {
        original_event_id: previousEventId,
        beskrivelse: begrunnelse,
        endrings_begrunnelse: 'Oppdatert redegjørelse.',
      } as import('$lib/types/timeline').EventData,
    });
  }

  function sendTeVederlag(belop: number) {
    scenario.sak.vederlag.krevd_belop = belop;
    scenario.sak.vederlag.netto_belop = belop;
  }

  function sendTeFrist(dager: number) {
    scenario.sak.frist.krevd_dager = dager;
  }

  function withdrawTrack(spor: SporKey, begrunnelse?: string) {
    const inactiveStatuses = INACTIVE_STATUSES;
    const now = new Date().toISOString();

    if (spor === 'ansvar') {
      // Forward cascade: grunnlag → vederlag + frist
      scenario.sak.grunnlag.status = 'trukket';
      scenario.sak.grunnlag.trukket_begrunnelse = begrunnelse;
      addWithdrawEvent('grunnlag_trukket', 'grunnlag', begrunnelse, now);

      if (!inactiveStatuses.has(scenario.sak.vederlag.status)) {
        scenario.sak.vederlag.status = 'trukket';
        scenario.sak.vederlag.trukket_via_grunnlag = true;
      }
      if (!inactiveStatuses.has(scenario.sak.frist.status)) {
        scenario.sak.frist.status = 'trukket';
        scenario.sak.frist.trukket_via_grunnlag = true;
      }
    } else if (spor === 'vederlag') {
      scenario.sak.vederlag.status = 'trukket';
      scenario.sak.vederlag.trukket_begrunnelse = begrunnelse;
      addWithdrawEvent('vederlag_krav_trukket', 'vederlag', begrunnelse, now);
      checkReverseCascade(now);
    } else {
      scenario.sak.frist.status = 'trukket';
      scenario.sak.frist.trukket_begrunnelse = begrunnelse;
      addWithdrawEvent('frist_krav_trukket', 'frist', begrunnelse, now);
      checkReverseCascade(now);
    }

    // Clear drafts for withdrawn tracks
    if (spor === 'ansvar') {
      scenario.ui.ansvar.draft = null;
      scenario.ui.vederlag.draft = null;
      scenario.ui.frist.draft = null;
    } else {
      scenario.ui[spor].draft = null;
    }
  }

  function checkReverseCascade(now: string) {
    const inactiveStatuses = INACTIVE_STATUSES;
    const vedInactive = inactiveStatuses.has(scenario.sak.vederlag.status);
    const fristInactive = inactiveStatuses.has(scenario.sak.frist.status);
    const grunnlagActive = !inactiveStatuses.has(scenario.sak.grunnlag.status);

    if (grunnlagActive && vedInactive && fristInactive) {
      scenario.sak.grunnlag.status = 'trukket';
      scenario.sak.grunnlag.trukket_alle_krav = true;
    }
  }

  function addWithdrawEvent(
    eventType: string,
    spor: string,
    begrunnelse: string | undefined,
    time: string
  ) {
    scenario.timeline.unshift({
      specversion: '1.0',
      id: `evt-withdraw-${Date.now()}`,
      source: `/projects/P001/cases/${scenario.sak.sak_id}`,
      type: `no.oslo.koe.${eventType}`,
      time,
      subject: scenario.sak.sak_id,
      actorrole: 'TE',
      actor: scenario.sak.entreprenor ?? 'TE',
      spor: spor as 'grunnlag' | 'vederlag' | 'frist',
      summary: begrunnelse || 'Kravet er trukket tilbake',
      data: {
        begrunnelse: begrunnelse || undefined,
      } as unknown as import('$lib/types/timeline').EventData,
    });
  }

  return {
    get sak() {
      return scenario.sak;
    },
    get scenario() {
      return scenario;
    },
    get timeline() {
      return scenario.timeline;
    },
    get teNavn() {
      return teNavn;
    },
    get bhNavn() {
      return bhNavn;
    },
    get vederlagDomainConfig() {
      return vederlagDomainConfig;
    },
    get fristDomainConfig() {
      return fristDomainConfig;
    },
    get grunnlagDomainConfig() {
      return grunnlagDomainConfig;
    },
    get draftCount() {
      return draftCount;
    },
    get scenarios() {
      return SCENARIOS;
    },
    display,
    selectScenario,
    getUI,
    setDraft,
    sendGrunnlagSvar,
    sendVederlagSvar,
    sendFristSvar,
    sendTeGrunnlag,
    sendTeVederlag,
    sendTeFrist,
    withdrawTrack,
  };
}

export const store = createStore();
