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
import type { BelopVurdering, SubsidiaerTrigger, VederlagsMetode } from '$lib/types/timeline.js';

export interface VederlagSvarDetaljer {
  hovedkravVarsletITide?: boolean;
  riggVarsletITide?: boolean;
  produktivitetVarsletITide?: boolean;
  akseptererMetode?: boolean;
  oensketMetode?: VederlagsMetode;
  hovedkravVurdering?: BelopVurdering;
  hovedkravGodkjentBelop?: number;
  riggVurdering?: BelopVurdering;
  riggGodkjentBelop?: number;
  produktivitetVurdering?: BelopVurdering;
  produktivitetGodkjentBelop?: number;
  subsidiaerGodkjentBelop?: number;
  begrunnelse?: string;
}

export interface FristSvarDetaljer {
  fristVarselOk?: boolean;
  spesifisertKravOk?: boolean;
  foresporselSvarOk?: boolean;
  sendForesporsel?: boolean;
  vilkarOppfylt?: boolean;
  subsidiaerTriggers?: SubsidiaerTrigger[];
  subsidiaerGodkjentDager?: number;
  begrunnelse?: string;
}

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

  function sendVederlagSvar(godkjentBelop: number, detaljer?: VederlagSvarDetaljer) {
    const vederlag = scenario.sak.vederlag;
    const krevd = vederlag.krevd_belop ?? 0;
    const resultat =
      godkjentBelop >= krevd ? 'godkjent' : godkjentBelop > 0 ? 'delvis_godkjent' : 'avslatt';
    const teVersionCount = Math.max(
      vederlag.antall_versjoner,
      scenario.timeline.filter((event) => event.spor === 'vederlag' && event.actorrole === 'TE')
        .length,
      1
    );
    const respondertVersjon = teVersionCount - 1;
    const now = new Date().toISOString();
    const eventId = `evt-vederlag-response-${Date.now()}`;

    vederlag.bh_resultat = resultat;
    vederlag.godkjent_belop = godkjentBelop;
    vederlag.bh_begrunnelse = detaljer?.begrunnelse;
    vederlag.bh_respondert_versjon = respondertVersjon;
    vederlag.subsidiaer_godkjent_belop = detaljer?.subsidiaerGodkjentBelop;
    vederlag.siste_event_id = eventId;
    vederlag.siste_oppdatert = now;
    scenario.ui.vederlag.draft = null;

    scenario.timeline.push({
      specversion: '1.0',
      id: eventId,
      source: `/projects/P001/cases/${scenario.sak.sak_id}`,
      type: 'no.oslo.koe.respons_vederlag',
      time: now,
      subject: scenario.sak.sak_id,
      actorrole: 'BH',
      actor: scenario.sak.byggherre ?? 'BH',
      spor: 'vederlag',
      summary: `Byggherren ${resultat === 'godkjent' ? 'godkjente' : resultat === 'avslatt' ? 'avslo' : 'godkjente deler av'} kravet om vederlagsjustering`,
      data: {
        respondert_versjon: respondertVersjon,
        hovedkrav_varslet_i_tide: detaljer?.hovedkravVarsletITide,
        rigg_varslet_i_tide: detaljer?.riggVarsletITide,
        produktivitet_varslet_i_tide: detaljer?.produktivitetVarsletITide,
        aksepterer_metode: detaljer?.akseptererMetode,
        oensket_metode: detaljer?.oensketMetode,
        hovedkrav_vurdering: detaljer?.hovedkravVurdering,
        hovedkrav_godkjent_belop: detaljer?.hovedkravGodkjentBelop,
        rigg_vurdering: detaljer?.riggVurdering,
        rigg_godkjent_belop: detaljer?.riggGodkjentBelop,
        produktivitet_vurdering: detaljer?.produktivitetVurdering,
        produktivitet_godkjent_belop: detaljer?.produktivitetGodkjentBelop,
        beregnings_resultat: resultat,
        total_godkjent_belop: godkjentBelop,
        total_krevd_belop: krevd,
        subsidiaer_resultat:
          detaljer?.subsidiaerGodkjentBelop === undefined
            ? undefined
            : detaljer.subsidiaerGodkjentBelop >= krevd
              ? 'godkjent'
              : detaljer.subsidiaerGodkjentBelop > 0
                ? 'delvis_godkjent'
                : 'avslatt',
        subsidiaer_godkjent_belop: detaljer?.subsidiaerGodkjentBelop,
        begrunnelse: detaljer?.begrunnelse,
      } as unknown as import('$lib/types/timeline').EventData,
    });
  }

  function sendFristSvar(godkjentDager: number, detaljer?: FristSvarDetaljer) {
    const frist = scenario.sak.frist;
    const krevd = frist.krevd_dager ?? 0;
    const resultat =
      godkjentDager >= krevd ? 'godkjent' : godkjentDager > 0 ? 'delvis_godkjent' : 'avslatt';
    const teVersionCount = Math.max(
      frist.antall_versjoner,
      scenario.timeline.filter((event) => event.spor === 'frist' && event.actorrole === 'TE')
        .length,
      1
    );
    const respondertVersjon = teVersionCount - 1;
    const now = new Date().toISOString();
    const eventId = `evt-frist-response-${Date.now()}`;
    const subsidiaerResultat =
      detaljer?.subsidiaerGodkjentDager === undefined
        ? undefined
        : detaljer.subsidiaerGodkjentDager >= krevd
          ? 'godkjent'
          : detaljer.subsidiaerGodkjentDager > 0
            ? 'delvis_godkjent'
            : 'avslatt';

    frist.frist_varsel_ok = detaljer?.fristVarselOk;
    frist.spesifisert_krav_ok = detaljer?.spesifisertKravOk;
    frist.foresporsel_svar_ok = detaljer?.foresporselSvarOk;
    frist.har_bh_foresporsel = detaljer?.sendForesporsel;
    frist.dato_bh_foresporsel = detaljer?.sendForesporsel ? now.slice(0, 10) : undefined;
    frist.vilkar_oppfylt = detaljer?.vilkarOppfylt;
    frist.bh_resultat = resultat;
    frist.godkjent_dager = godkjentDager;
    frist.bh_begrunnelse = detaljer?.begrunnelse;
    frist.subsidiaer_triggers = detaljer?.subsidiaerTriggers;
    frist.subsidiaer_resultat = subsidiaerResultat;
    frist.subsidiaer_godkjent_dager = detaljer?.subsidiaerGodkjentDager;
    frist.har_subsidiaert_standpunkt = subsidiaerResultat !== undefined;
    frist.bh_respondert_versjon = respondertVersjon;
    frist.siste_event_id = eventId;
    frist.siste_oppdatert = now;
    scenario.ui.frist.draft = null;

    scenario.timeline.push({
      specversion: '1.0',
      id: eventId,
      source: `/projects/P001/cases/${scenario.sak.sak_id}`,
      type: 'no.oslo.koe.respons_frist',
      time: now,
      subject: scenario.sak.sak_id,
      actorrole: 'BH',
      actor: scenario.sak.byggherre ?? 'BH',
      spor: 'frist',
      summary: detaljer?.sendForesporsel
        ? 'Byggherren ba om spesifisering av fristkravet'
        : `Byggherren ${resultat === 'godkjent' ? 'godkjente' : resultat === 'avslatt' ? 'avslo' : 'godkjente deler av'} fristkravet`,
      data: {
        respondert_versjon: respondertVersjon,
        frist_varsel_ok: detaljer?.fristVarselOk,
        spesifisert_krav_ok: detaljer?.spesifisertKravOk,
        foresporsel_svar_ok: detaljer?.foresporselSvarOk,
        har_bh_foresporsel: detaljer?.sendForesporsel,
        dato_bh_foresporsel: detaljer?.sendForesporsel ? now.slice(0, 10) : undefined,
        vilkar_oppfylt: detaljer?.vilkarOppfylt,
        beregnings_resultat: resultat,
        godkjent_dager: godkjentDager,
        subsidiaer_triggers: detaljer?.subsidiaerTriggers,
        subsidiaer_resultat: subsidiaerResultat,
        subsidiaer_godkjent_dager: detaljer?.subsidiaerGodkjentDager,
        begrunnelse: detaljer?.begrunnelse,
      } as unknown as import('$lib/types/timeline').EventData,
    });
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
