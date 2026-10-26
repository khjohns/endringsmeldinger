/**
 * Domenelogikk for byggherrens svar på vederlagskrav, NS 8407:2011 § 34 og § 30.2.
 */

import type {
  VederlagsMetode,
  VederlagBeregningResultat,
  SubsidiaerTrigger,
} from '../types/timeline';
import { REGELVERSJON } from './regelversjon';
import { erEndringMed32_2 } from './grunnlagDomain';

export type BelopVurdering = 'godkjent' | 'delvis' | 'avslatt';

/**
 * Flat representasjon av alle BH-valg i vederlagsresponsen, gruppert etter port.
 */
export interface VederlagFormState {
  // Port 1: Preklusjon
  hovedkravVarsletITide: boolean | undefined; // §34.1.2 (kun SVIKT/ANDRE)
  riggVarsletITide: boolean | undefined; // §34.1.3
  produktivitetVarsletITide: boolean | undefined; // §34.1.3

  // Port 2: Metode
  akseptererMetode: boolean | undefined;
  oensketMetode?: VederlagsMetode;
  epJusteringVarsletITide?: boolean; // §34.3.3
  epJusteringAkseptert?: boolean;
  holdTilbake: boolean;

  // Port 3: Beløp
  hovedkravVurdering: BelopVurdering | undefined;
  hovedkravGodkjentBelop?: number;
  riggVurdering?: BelopVurdering;
  riggGodkjentBelop?: number;
  produktivitetVurdering?: BelopVurdering;
  produktivitetGodkjentBelop?: number;
  /** VS-U5: det byggherren godtar for posten etter begrensningen etter § 34.1.3, som kan være 0. */
  produktivitetBegrensetBelop?: number;

  // Port 4: Begrunnelse
  begrunnelse: string;
}

/**
 * Kontekst fra TE-kravet og sak-state. Leses, aldri muteres.
 */
export interface VederlagDomainConfig {
  metode?: VederlagsMetode;
  /** OV-U23: kravet kan bestå av de særskilte kravene alene, uten beløp for justeringen ellers. */
  harHovedkrav: boolean;
  hovedkravBelop: number;
  riggBelop?: number;
  produktivitetBelop?: number;
  harRiggKrav: boolean;
  harProduktivitetKrav: boolean;
  kreverJustertEp: boolean;
  kostnadsOverslag?: number;
  hovedkategori?: 'ENDRING' | 'SVIKT' | 'ANDRE' | 'FORCE_MAJEURE';
  underkategori?: string;
  grunnlagVarsletForSent: boolean;
  grunnlagStatus?: 'godkjent' | 'avslatt' | 'frafalt';
  /**
   * Saken er en TS-sak (B-17): skjemaet godtar «delvis» bare med mer enn 0 kr og mindre enn
   * det krevde (KA-U42). Python-saken viser ikke feilen (DL-U2).
   */
  erKjernesak?: boolean;
}

/**
 * Beregnede verdier fra form state + config. Alle avledninger samlet.
 */
export interface VederlagComputedValues {
  // Preklusjon
  har34_1_2_Preklusjon: boolean;
  erHelVederlagSubsidiaerPgaGrunnlag: boolean;
  erSubsidiaer: boolean;
  hovedkravPrekludert: boolean;
  riggPrekludert: boolean;
  produktivitetPrekludert: boolean;
  harPrekludertKrav: boolean;
  harPreklusjonsSteg: boolean;

  // Metode-avledninger
  kanHoldeTilbake: boolean;
  maSvarePaJustering: boolean;

  // Beløp-totaler
  totalKrevd: number;
  totalKrevdInklPrekludert: number;
  totalGodkjent: number;
  totalGodkjentInklPrekludert: number;
  harMetodeendring: boolean;

  // Resultater
  prinsipaltResultat: VederlagBeregningResultat;
  subsidiaertResultat: VederlagBeregningResultat;
  visSubsidiaertResultat: boolean;
  subsidiaerTriggers: SubsidiaerTrigger[];
}

/** Subset av forrige respons-event for update mode */
export interface VederlagLastResponseData {
  eventId: string;
  hovedkravVarsletITide?: boolean;
  riggVarsletITide?: boolean;
  produktivitetVarsletITide?: boolean;
  akseptererMetode?: boolean;
  oensketMetode?: VederlagsMetode;
  epJusteringVarsletITide?: boolean;
  epJusteringAkseptert?: boolean;
  holdTilbake?: boolean;
  hovedkravVurdering?: BelopVurdering;
  hovedkravGodkjentBelop?: number;
  riggVurdering?: BelopVurdering;
  riggGodkjentBelop?: number;
  produktivitetVurdering?: BelopVurdering;
  produktivitetGodkjentBelop?: number;
  produktivitetBegrensetBelop?: number;
  godkjentBelop?: number;
}

export interface VederlagDefaultsConfig {
  isUpdateMode: boolean;
  lastResponseEvent?: VederlagLastResponseData;
}

export function getDefaults(config: VederlagDefaultsConfig): VederlagFormState {
  if (config.isUpdateMode && config.lastResponseEvent) {
    const prev = config.lastResponseEvent;
    return {
      hovedkravVarsletITide: prev.hovedkravVarsletITide ?? true,
      // OV-U25: varslingen for rigg og drift kan ikke påberopes, heller ikke i et tidligere svar.
      riggVarsletITide: true,
      produktivitetVarsletITide: prev.produktivitetVarsletITide ?? true,
      akseptererMetode: prev.akseptererMetode ?? true,
      oensketMetode: prev.oensketMetode,
      epJusteringVarsletITide: prev.epJusteringVarsletITide,
      epJusteringAkseptert: prev.epJusteringAkseptert,
      holdTilbake: prev.holdTilbake ?? false,
      hovedkravVurdering: prev.hovedkravVurdering ?? 'godkjent',
      hovedkravGodkjentBelop: prev.hovedkravGodkjentBelop,
      riggVurdering: prev.riggVurdering,
      riggGodkjentBelop: prev.riggGodkjentBelop,
      produktivitetVurdering: prev.produktivitetVurdering,
      produktivitetGodkjentBelop: prev.produktivitetGodkjentBelop,
      produktivitetBegrensetBelop: prev.produktivitetBegrensetBelop,
      begrunnelse: '',
    };
  }
  // New mode: no pre-selection — user must make explicit choices
  return {
    hovedkravVarsletITide: undefined,
    riggVarsletITide: undefined,
    produktivitetVarsletITide: undefined,
    akseptererMetode: undefined,
    holdTilbake: false,
    hovedkravVurdering: undefined,
    begrunnelse: '',
  };
}

// Preklusjon (§ 34.1.2, § 34.1.3, § 32.2)

/**
 * §34.1.2 preklusjon gjelder KUN for SVIKT/ANDRE kategorier.
 * IKKE for ENDRING med §32.2-preklusjon.
 */
export function har34_1_2Preklusjon(config: Pick<VederlagDomainConfig, 'hovedkategori'>): boolean {
  return config.hovedkategori === 'SVIKT' || config.hovedkategori === 'ANDRE';
}

/**
 * §32.2: Når BH har påberopt at grunnlagsvarselet kom for sent (endring som ikke er
 * formell endringsordre), er hele vederlagskravet automatisk subsidiært.
 */
export function erHelVederlagSubsidiaerPgaGrunnlag(
  config: Pick<VederlagDomainConfig, 'hovedkategori' | 'underkategori' | 'grunnlagVarsletForSent'>
): boolean {
  return erEndringMed32_2(config) && config.grunnlagVarsletForSent === true;
}

/**
 * Vederlag behandles subsidiært når:
 * 1. Grunnlag er avslått av BH, ELLER
 * 2. Grunnlag er prekludert pga §32.2
 */
export function erSubsidiaer(
  config: Pick<
    VederlagDomainConfig,
    'grunnlagStatus' | 'hovedkategori' | 'underkategori' | 'grunnlagVarsletForSent'
  >
): boolean {
  return config.grunnlagStatus === 'avslatt' || erHelVederlagSubsidiaerPgaGrunnlag(config);
}

export function beregnHovedkravPrekludert(
  state: Pick<VederlagFormState, 'hovedkravVarsletITide'>,
  config: Pick<VederlagDomainConfig, 'hovedkategori'>
): boolean {
  return har34_1_2Preklusjon(config) && state.hovedkravVarsletITide === false;
}

/**
 * OV-U25: kravet om rigg og drift har ingen særskilt varslingsplikt etter § 34.1.3, så byggherren
 * kan ikke påberope at det er varslet for sent.
 */
export function beregnRiggPrekludert(): boolean {
  return false;
}

export function beregnProduktivitetPrekludert(
  state: Pick<VederlagFormState, 'produktivitetVarsletITide'>,
  config: Pick<VederlagDomainConfig, 'harProduktivitetKrav'>
): boolean {
  return config.harProduktivitetKrav && state.produktivitetVarsletITide === false;
}

/** Varslingssteget vises for produktivitetstapet (§ 34.1.3, OV-U25) og for § 34.1.2. */
export function harPreklusjonsSteg(config: VederlagDomainConfig): boolean {
  return config.harProduktivitetKrav || har34_1_2Preklusjon(config);
}

/** §30.2: BH kan holde tilbake betaling for regningsarbeid uten kostnadsoverslag */
export function kanHoldeTilbake(
  config: Pick<VederlagDomainConfig, 'metode' | 'kostnadsOverslag'>
): boolean {
  return config.metode === 'REGNINGSARBEID' && !config.kostnadsOverslag;
}

/** §34.3.3: BH må svare på EP-justering "uten ugrunnet opphold" */
export function maSvarePaJustering(
  config: Pick<VederlagDomainConfig, 'metode' | 'kreverJustertEp'>
): boolean {
  return config.metode === 'ENHETSPRISER' && config.kreverJustertEp === true;
}

export function beregnGodkjentBelop(
  vurdering: BelopVurdering | undefined,
  krevdBelop: number,
  delvisGodkjentBelop: number | undefined,
  prekludert?: boolean
): number {
  if (prekludert) return 0;
  switch (vurdering) {
    case 'godkjent':
      return krevdBelop;
    case 'delvis':
      return delvisGodkjentBelop ?? 0;
    default:
      return 0;
  }
}

function rundHalvOpp(verdi: number): number {
  return Math.sign(verdi) * Math.round(Math.abs(verdi));
}

function tilOre(belop: number): number {
  return rundHalvOpp(Number((belop * 100).toPrecision(15))) / 100;
}

export interface VederlagTotaler {
  totalKrevd: number;
  totalKrevdInklPrekludert: number;
  totalGodkjent: number;
  totalGodkjentInklPrekludert: number;
  harMetodeendring: boolean;
  harPrekludertKrav: boolean;
}

/**
 * Beregn alle beløp-totaler (prinsipalt og subsidiært).
 */
export function beregnTotaler(
  state: VederlagFormState,
  config: VederlagDomainConfig,
  preklusjon: { hovedkrav: boolean; rigg: boolean; produktivitet: boolean }
): VederlagTotaler {
  // Postene som i kjernen (`poster` i kjerne/regler/vederlag.ts): det krevde, det godtatte uten
  // begrensning, og det prinsipale. VS-U5, OV-U22: en begrensning etter § 34.1.3 gir posten
  // beløpet etter begrensningen prinsipalt. OV-U27: § 34.1.2 gjelder hele kravet.
  const poster: [krevd: number, godkjent: number, prinsipalt: number][] = [];
  const post = (
    krevdBelop: number | undefined,
    vurdering: BelopVurdering | undefined,
    delvis: number | undefined,
    prinsipalt: (godkjent: number) => number
  ) => {
    const krevd = tilOre(krevdBelop ?? 0);
    const godkjent = tilOre(beregnGodkjentBelop(vurdering, krevd, delvis));
    poster.push([krevd, godkjent, preklusjon.hovedkrav ? 0 : tilOre(prinsipalt(godkjent))]);
  };
  if (config.harHovedkrav) {
    post(config.hovedkravBelop, state.hovedkravVurdering, state.hovedkravGodkjentBelop, (g) => g);
  }
  if (config.harRiggKrav) {
    post(config.riggBelop, state.riggVurdering, state.riggGodkjentBelop, (g) =>
      preklusjon.rigg ? 0 : g
    );
  }
  if (config.harProduktivitetKrav) {
    post(
      config.produktivitetBelop,
      state.produktivitetVurdering,
      state.produktivitetGodkjentBelop,
      (g) => (preklusjon.produktivitet ? (state.produktivitetBegrensetBelop ?? 0) : g)
    );
  }
  const sum = (i: 0 | 1 | 2) => tilOre(poster.reduce((a, p) => a + p[i], 0));
  const totalKrevdInklPrekludert = sum(0);
  // Det krevde uten postene som er rammet av en påberopelse etter § 34.1.3.
  const rammet =
    (config.harRiggKrav && preklusjon.rigg ? tilOre(config.riggBelop ?? 0) : 0) +
    (config.harProduktivitetKrav && preklusjon.produktivitet
      ? tilOre(config.produktivitetBelop ?? 0)
      : 0);

  return {
    totalKrevd: tilOre(totalKrevdInklPrekludert - rammet),
    totalKrevdInklPrekludert,
    totalGodkjent: sum(2),
    totalGodkjentInklPrekludert: sum(1),
    harMetodeendring: state.akseptererMetode === false,
    harPrekludertKrav: preklusjon.hovedkrav || preklusjon.rigg || preklusjon.produktivitet,
  };
}

/** VS-U5 og kjernens kontroll: 0 ≤ beløpet etter begrensningen ≤ det byggherren godtar for posten. */
export function erBegrensetBelopGyldig(
  state: Pick<
    VederlagFormState,
    | 'produktivitetVarsletITide'
    | 'produktivitetVurdering'
    | 'produktivitetGodkjentBelop'
    | 'produktivitetBegrensetBelop'
  >,
  config: Pick<VederlagDomainConfig, 'harProduktivitetKrav' | 'produktivitetBelop'>
): boolean {
  if (!beregnProduktivitetPrekludert(state, config)) return true;
  const begrenset = state.produktivitetBegrensetBelop;
  if (begrenset === undefined || begrenset === null || !Number.isFinite(begrenset)) return false;
  const godkjent = beregnGodkjentBelop(
    state.produktivitetVurdering,
    config.produktivitetBelop ?? 0,
    state.produktivitetGodkjentBelop
  );
  return begrenset >= 0 && tilOre(begrenset) <= tilOre(godkjent);
}

/**
 * B-13 (3.1, 24.09): «godkjent» bare når hele kravet er godkjent, til nærmeste
 * krone (ROUND_HALF_UP via øre, som `backend/regler/vederlag.py`). 0 kr er
 * «avslått».
 */
function resultatAvBelop(
  krevd: number,
  godkjent: number,
  harMetodeendring: boolean
): VederlagBeregningResultat {
  const godkjentOre = tilOre(godkjent);
  if (godkjentOre === 0) return 'avslatt';
  if (rundHalvOpp(godkjentOre) >= rundHalvOpp(tilOre(krevd)) && !harMetodeendring) {
    return 'godkjent';
  }
  return 'delvis_godkjent';
}

export function beregnPrinsipaltResultat(computed: {
  totalKrevdInklPrekludert: number;
  totalGodkjent: number;
  harMetodeendring: boolean;
  holdTilbake: boolean;
}): VederlagBeregningResultat {
  if (computed.holdTilbake) return 'hold_tilbake';
  return resultatAvBelop(
    computed.totalKrevdInklPrekludert,
    computed.totalGodkjent,
    computed.harMetodeendring
  );
}

/**
 * Beregn subsidiært resultat (ignorerer preklusjon, evaluerer alle beløp).
 * Brukes når særskilte krav er prekludert men BH evaluerer subsidiært.
 */
export function beregnSubsidiaertResultat(computed: {
  totalKrevdInklPrekludert: number;
  totalGodkjentInklPrekludert: number;
  harMetodeendring: boolean;
}): VederlagBeregningResultat {
  return resultatAvBelop(
    computed.totalKrevdInklPrekludert,
    computed.totalGodkjentInklPrekludert,
    computed.harMetodeendring
  );
}

export function beregnSubsidiaerTriggers(
  state: VederlagFormState,
  config: VederlagDomainConfig,
  preklusjon: { hovedkrav: boolean; rigg: boolean; produktivitet: boolean }
): SubsidiaerTrigger[] {
  const triggers: SubsidiaerTrigger[] = [];

  if (preklusjon.hovedkrav) triggers.push('preklusjon_hovedkrav');
  if (preklusjon.rigg) triggers.push('preklusjon_rigg');
  if (preklusjon.produktivitet) triggers.push('preklusjon_produktivitet');

  // §34.3.3: EP-justering begrenset hvis TE varslet for sent
  if (config.kreverJustertEp && state.epJusteringVarsletITide === false) {
    triggers.push('reduksjon_ep_justering');
  }

  if (state.akseptererMetode === false) triggers.push('metode_avslatt');

  return triggers;
}

export function erKravlinjeGyldig(
  vurdering: BelopVurdering | undefined,
  godkjentBelop: number | undefined
): boolean {
  if (!vurdering) return false;
  if (vurdering === 'delvis' && (godkjentBelop === undefined || godkjentBelop === null))
    return false;
  return true;
}

export function buildEventData(
  state: VederlagFormState,
  config: VederlagDomainConfig,
  computed: Pick<
    VederlagComputedValues,
    | 'har34_1_2_Preklusjon'
    | 'prinsipaltResultat'
    | 'subsidiaertResultat'
    | 'visSubsidiaertResultat'
    | 'totalGodkjent'
    | 'totalKrevdInklPrekludert'
    | 'totalGodkjentInklPrekludert'
  >,
  refs: {
    vederlagKravId: string;
    lastResponseEventId?: string;
    isUpdateMode: boolean;
  },
  subsidiaerTriggers: SubsidiaerTrigger[]
): { eventType: string; data: Record<string, unknown> } {
  const begrunnelseTekst = state.begrunnelse;

  const hovedkravGodkjentBelop = !config.harHovedkrav
    ? undefined
    : state.hovedkravVurdering === 'godkjent'
      ? config.hovedkravBelop
      : state.hovedkravVurdering === 'delvis'
        ? state.hovedkravGodkjentBelop
        : 0;

  const riggGodkjentBelop =
    state.riggVurdering === 'godkjent'
      ? (config.riggBelop ?? 0)
      : state.riggVurdering === 'delvis'
        ? state.riggGodkjentBelop
        : 0;

  const produktivitetGodkjentBelop =
    state.produktivitetVurdering === 'godkjent'
      ? (config.produktivitetBelop ?? 0)
      : state.produktivitetVurdering === 'delvis'
        ? state.produktivitetGodkjentBelop
        : 0;

  const commonData: Record<string, unknown> = {
    regelversjon: REGELVERSJON,
    // Port 1: Preklusjon
    hovedkrav_varslet_i_tide: computed.har34_1_2_Preklusjon
      ? state.hovedkravVarsletITide
      : undefined,
    // OV-U25: ingen påberopelse for rigg og drift. Kjernen og Python krever svaret når posten finnes.
    rigg_varslet_i_tide: config.harRiggKrav ? true : undefined,
    produktivitet_varslet_i_tide: state.produktivitetVarsletITide,

    // Port 2: Beregningsmetode
    aksepterer_metode: state.akseptererMetode,
    oensket_metode: state.oensketMetode,
    ep_justering_varslet_i_tide: state.epJusteringVarsletITide,
    ep_justering_akseptert: state.epJusteringAkseptert,
    hold_tilbake: state.holdTilbake,

    // Port 3: Beløp
    // OV-U23: kjernen avviser en vurdering av en post kravet ikke har.
    hovedkrav_vurdering: config.harHovedkrav ? state.hovedkravVurdering : undefined,
    hovedkrav_godkjent_belop: hovedkravGodkjentBelop,
    rigg_vurdering: state.riggVurdering,
    rigg_godkjent_belop: riggGodkjentBelop,
    produktivitet_vurdering: state.produktivitetVurdering,
    produktivitet_godkjent_belop: produktivitetGodkjentBelop,
    produktivitet_begrenset_belop:
      config.harProduktivitetKrav && state.produktivitetVarsletITide === false
        ? state.produktivitetBegrensetBelop
        : undefined,

    // Begrunnelse
    begrunnelse: begrunnelseTekst,

    // I TS-saken regner kjernen resultatet (#1301, #1317), så skjemaet sender ikke sitt eget.
    ...(config.erKjernesak
      ? {}
      : {
          // Automatisk beregnet (prinsipalt)
          beregnings_resultat: computed.prinsipaltResultat,
          total_godkjent_belop: computed.totalGodkjent,
          total_krevd_belop: computed.totalKrevdInklPrekludert,

          // Subsidiært standpunkt (kun når relevant)
          subsidiaer_triggers: subsidiaerTriggers.length > 0 ? subsidiaerTriggers : undefined,
          subsidiaer_resultat: computed.visSubsidiaertResultat
            ? computed.subsidiaertResultat
            : undefined,
          subsidiaer_godkjent_belop: computed.visSubsidiaertResultat
            ? computed.totalGodkjentInklPrekludert
            : undefined,
          subsidiaer_begrunnelse: computed.visSubsidiaertResultat ? begrunnelseTekst : undefined,
        }),
  };

  if (refs.isUpdateMode && refs.lastResponseEventId) {
    return {
      eventType: 'respons_vederlag_oppdatert',
      data: {
        original_respons_id: refs.lastResponseEventId,
        dato_endret: new Date().toISOString().split('T')[0],
        vurdering_begrunnelse: begrunnelseTekst,
        ...commonData,
      },
    };
  }

  return {
    eventType: 'respons_vederlag',
    data: {
      vederlag_krav_id: refs.vederlagKravId,
      ...commonData,
    },
  };
}

export function beregnAlt(
  state: VederlagFormState,
  config: VederlagDomainConfig
): VederlagComputedValues {
  const _har34_1_2 = har34_1_2Preklusjon(config);
  const _erHelSubsidiaer = erHelVederlagSubsidiaerPgaGrunnlag(config);
  const _erSubsidiaer = erSubsidiaer(config);

  const hovedkravPrekludert = beregnHovedkravPrekludert(state, config);
  const riggPrekludert = beregnRiggPrekludert();
  const produktivitetPrekludert = beregnProduktivitetPrekludert(state, config);
  const preklusjon = {
    hovedkrav: hovedkravPrekludert,
    rigg: riggPrekludert,
    produktivitet: produktivitetPrekludert,
  };

  const totaler = beregnTotaler(state, config, preklusjon);
  const _kanHoldeTilbake = kanHoldeTilbake(config);
  const _maSvarePaJustering = maSvarePaJustering(config);

  const prinsipaltResultat = beregnPrinsipaltResultat({
    totalKrevdInklPrekludert: totaler.totalKrevdInklPrekludert,
    totalGodkjent: totaler.totalGodkjent,
    harMetodeendring: totaler.harMetodeendring,
    holdTilbake: state.holdTilbake,
  });

  const subsidiaertResultat = beregnSubsidiaertResultat({
    totalKrevdInklPrekludert: totaler.totalKrevdInklPrekludert,
    totalGodkjentInklPrekludert: totaler.totalGodkjentInklPrekludert,
    harMetodeendring: totaler.harMetodeendring,
  });

  const visSubsidiaertResultat = totaler.harPrekludertKrav;

  const subsidiaerTriggers = beregnSubsidiaerTriggers(state, config, preklusjon);

  return {
    har34_1_2_Preklusjon: _har34_1_2,
    erHelVederlagSubsidiaerPgaGrunnlag: _erHelSubsidiaer,
    erSubsidiaer: _erSubsidiaer,
    hovedkravPrekludert,
    riggPrekludert,
    produktivitetPrekludert,
    harPrekludertKrav: totaler.harPrekludertKrav,
    harPreklusjonsSteg: harPreklusjonsSteg(config),
    kanHoldeTilbake: _kanHoldeTilbake,
    maSvarePaJustering: _maSvarePaJustering,
    totalKrevd: totaler.totalKrevd,
    totalKrevdInklPrekludert: totaler.totalKrevdInklPrekludert,
    totalGodkjent: totaler.totalGodkjent,
    totalGodkjentInklPrekludert: totaler.totalGodkjentInklPrekludert,
    harMetodeendring: totaler.harMetodeendring,
    prinsipaltResultat,
    subsidiaertResultat,
    visSubsidiaertResultat,
    subsidiaerTriggers,
  };
}
