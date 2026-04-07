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

  const draftCount = $derived(
    SPOR_KEYS.filter((k) => scenario.ui[k].draft !== null).length
  );

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
    scenario.sak.grunnlag.beskrivelse = begrunnelse;
  }

  function sendTeVederlag(belop: number) {
    scenario.sak.vederlag.krevd_belop = belop;
    scenario.sak.vederlag.netto_belop = belop;
  }

  function sendTeFrist(dager: number) {
    scenario.sak.frist.krevd_dager = dager;
  }

  return {
    get sak() { return scenario.sak; },
    get scenario() { return scenario; },
    get timeline() { return scenario.timeline; },
    get teNavn() { return teNavn; },
    get bhNavn() { return bhNavn; },
    get vederlagDomainConfig() { return vederlagDomainConfig; },
    get fristDomainConfig() { return fristDomainConfig; },
    get grunnlagDomainConfig() { return grunnlagDomainConfig; },
    get draftCount() { return draftCount; },
    get scenarios() { return SCENARIOS; },
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
  };
}

export const store = createStore();
