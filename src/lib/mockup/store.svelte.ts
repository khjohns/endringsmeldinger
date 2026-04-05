/**
 * Reaktiv mockup-store. Wrapper SakState + lokal UI-state.
 *
 * Scenariovalg bytter hele SakState + timeline + UI-state.
 * Domain configs utledes reaktivt fra SakState.
 */
import { SCENARIOS, DEFAULT_SCENARIO, SPOR_KEYS } from './scenarios.js';
import type { Scenario, SporUIState, SporKey } from './scenarios.js';
import {
  deriveTrackDisplay,
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from './derive.js';
import type { Draft } from './types.js';
import { getPartsNavn } from '$lib/utils/partsNavn.js';

function createStore() {
  let scenario: Scenario = $state(structuredClone(DEFAULT_SCENARIO));

  // Derived — SakState
  const sak = $derived(scenario.sak);
  const timeline = $derived(scenario.timeline);

  // Partsnavn (erstatter gamle TE/BH-konstanter)
  const teNavn = $derived(getPartsNavn('TE', sak.entreprenor, sak.byggherre));
  const bhNavn = $derived(getPartsNavn('BH', sak.entreprenor, sak.byggherre));

  // Display-data per spor
  const ansvarDisplay = $derived(deriveTrackDisplay(sak, 'ansvar'));
  const vederlagDisplay = $derived(deriveTrackDisplay(sak, 'vederlag'));
  const fristDisplay = $derived(deriveTrackDisplay(sak, 'frist'));

  // Domain configs for BH-skjemaer
  const vederlagDomainConfig = $derived(deriveVederlagDomainConfig(sak));
  const fristDomainConfig = $derived(deriveFristDomainConfig(sak));
  const grunnlagDomainConfig = $derived(deriveGrunnlagDomainConfig(sak));

  // UI-state
  const draftCount = $derived(
    SPOR_KEYS.filter(
      (k) => scenario.ui[k].draft !== null
    ).length
  );

  function selectScenario(id: string) {
    const found = SCENARIOS.find((s) => s.id === id);
    if (found) scenario = structuredClone(found);
  }

  function getUI(spor: SporKey): SporUIState {
    return scenario.ui[spor];
  }

  function setDraft(spor: SporKey, draft: Draft | null) {
    scenario.ui[spor] = { ...scenario.ui[spor], draft };
  }

  function display(spor: SporKey) {
    if (spor === 'ansvar') return ansvarDisplay;
    if (spor === 'vederlag') return vederlagDisplay;
    return fristDisplay;
  }

  // BH-handlinger — direkte mutasjon for Svelte 5 fine-grained reactivity
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
    get sak() { return sak; },
    get scenario() { return scenario; },
    get timeline() { return timeline; },
    get teNavn() { return teNavn; },
    get bhNavn() { return bhNavn; },
    get ansvarDisplay() { return ansvarDisplay; },
    get vederlagDisplay() { return vederlagDisplay; },
    get fristDisplay() { return fristDisplay; },
    get vederlagDomainConfig() { return vederlagDomainConfig; },
    get fristDomainConfig() { return fristDomainConfig; },
    get grunnlagDomainConfig() { return grunnlagDomainConfig; },
    get draftCount() { return draftCount; },
    get scenarios() { return SCENARIOS; },
    selectScenario,
    display,
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
