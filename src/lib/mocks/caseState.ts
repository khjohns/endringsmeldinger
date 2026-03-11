/**
 * Mock SakState data for development.
 *
 * Three scenarios from the design document:
 * 1. scenario1_3AktiveSpor — BH with three active tracks (passivitet)
 * 2. scenario2_BlandetTilstand — Mixed state across tracks
 * 3. scenario3_TomSak — Newly created case, no tracks
 */

import type { SakState } from '$lib/types/timeline';

// 19 days ago — triggers passivitet (>14 days)
const niTtenDagerSiden = new Date(Date.now() - 19 * 86400000).toISOString();
const toDagerSiden = new Date(Date.now() - 2 * 86400000).toISOString();
const femDagerSiden = new Date(Date.now() - 5 * 86400000).toISOString();

/**
 * Scenario 1: Tre aktive spor
 *
 * BH (byggherre) har mottatt krav på alle tre spor.
 * Grunnlag-sporet har passivitet (ikke svart på >14 dager).
 * Frist-sporet har spesifisert krav på 45 dager.
 * Vederlag-sporet er nytt krav via regningsarbeid.
 */
export const scenario1_3AktiveSpor: SakState = {
  sak_id: 'KOE-2024-047',
  sakstittel: 'Endrede grunnforhold ved akse C5–C8',
  prosjekt_navn: 'Operatunnelen — Parsell 3',
  entreprenor: 'Veidekke Entreprenør AS',
  byggherre: 'Statens vegvesen',
  sakstype: 'standard',

  grunnlag: {
    status: 'sendt',
    tittel: 'Endrede grunnforhold ved akse C5–C8',
    hovedkategori: 'SVIKT',
    underkategori: 'GRUNNFORHOLD',
    beskrivelse:
      'Under utgraving ved akse C5–C8 ble det påtruffet ukjente leirelag som ikke fremgår av de ' +
      'geotekniske rapportene i anbudsgrunnlaget. Dette medfører behov for ekstra peling og ' +
      'forsterkningstiltak.',
    dato_oppdaget: '2026-01-10',
    grunnlag_varsel: {
      dato_sendt: '2026-01-13',
      metode: ['e-post', 'Catenda'],
    },
    laast: false,
    antall_versjoner: 1,
    siste_event_id: 'evt-001',
    siste_oppdatert: niTtenDagerSiden,
  },

  frist: {
    status: 'sendt',
    varsel_type: 'spesifisert',
    frist_varsel: {
      dato_sendt: '2026-01-13',
      metode: ['e-post'],
    },
    spesifisert_varsel: {
      dato_sendt: '2026-01-20',
      metode: ['e-post', 'Catenda'],
    },
    krevd_dager: 45,
    begrunnelse:
      'Ekstraarbeidet med peling og forsterkning vil ligge på kritisk linje og forsinke ' +
      'betongarbeider ved akse C5–C8 med estimert 45 virkedager.',
    antall_versjoner: 1,
    siste_event_id: 'evt-004',
    siste_oppdatert: toDagerSiden,
  },

  vederlag: {
    status: 'sendt',
    metode: 'REGNINGSARBEID',
    kostnads_overslag: 2400000,
    krevd_belop: 2930000,
    netto_belop: 2930000,
    begrunnelse:
      'Kostnadsoverslag for ekstra peling (type RD 219/12), spunt og forsterkningstiltak. ' +
      'Arbeidet er igangsatt etter varsling. Detaljert fakturaoversikt vedlegges.',
    varslet_for_oppstart: true,
    saerskilt_krav: {
      rigg_drift: { belop: 350000, dato_klar_over: '2026-01-20' },
      produktivitet: { belop: 180000, dato_klar_over: '2026-01-25' },
    },
    antall_versjoner: 1,
    siste_event_id: 'evt-006',
    siste_oppdatert: toDagerSiden,
  },

  // Computed
  er_subsidiaert_vederlag: false,
  er_subsidiaert_frist: false,
  visningsstatus_vederlag: 'sendt',
  visningsstatus_frist: 'sendt',
  overordnet_status: 'SENDT',
  kan_utstede_eo: false,
  neste_handling: {
    rolle: 'BH',
    handling: 'Svar på grunnlag, frist og vederlag',
    spor: 'grunnlag',
  },
  sum_krevd: 2930000,
  sum_godkjent: 0,
  antall_events: 6,
  opprettet: '2026-01-13T09:00:00Z',
  siste_aktivitet: toDagerSiden,
  dagmulktsats: 50000,
};

/**
 * Scenario 2: Blandet tilstand
 *
 * Grunnlag: godkjent av BH.
 * Vederlag: nytt krav fra TE, BH har ikke svart.
 * Frist: delvis godkjent av BH (20 av 30 dager).
 */
export const scenario2_BlandetTilstand: SakState = {
  sak_id: 'KOE-2024-031',
  sakstittel: 'Tilleggskrav — forsinkede tegningsleveranser',
  prosjekt_navn: 'Operatunnelen — Parsell 3',
  entreprenor: 'Veidekke Entreprenør AS',
  byggherre: 'Statens vegvesen',
  sakstype: 'standard',

  grunnlag: {
    status: 'godkjent',
    tittel: 'Forsinkede tegningsleveranser fra ARK',
    hovedkategori: 'ENDRING',
    underkategori: 'IRREG',
    beskrivelse:
      'Arkitektfirmaet leverte detaljerte armerings- og bekledingstegninger vesentlig forsinket ' +
      'i forhold til fremdriftsplanen, noe som medførte stanset produksjon i sektor D.',
    dato_oppdaget: '2025-11-05',
    grunnlag_varsel: {
      dato_sendt: '2025-11-07',
      metode: ['e-post'],
    },
    bh_resultat: 'godkjent',
    bh_begrunnelse:
      'BH erkjenner at tegningsleveransen var forsinket i henhold til omforent fremdriftsplan.',
    bh_respondert_versjon: 0,
    laast: false,
    antall_versjoner: 1,
    siste_event_id: 'evt-101',
    siste_oppdatert: '2025-12-01T14:30:00Z',
  },

  vederlag: {
    status: 'sendt',
    metode: 'FASTPRIS_TILBUD',
    belop_direkte: 850000,
    krevd_belop: 1125000,
    netto_belop: 1125000,
    begrunnelse:
      'Fastpristilbud for ekstraarbeid som fulgte av forsinkelsen: omrigging av mannskap, ' +
      'tapt produktivitet og tilleggsbetong ved sektor D.',
    saerskilt_krav: {
      rigg_drift: { belop: 180000, dato_klar_over: '2025-11-20' },
      produktivitet: { belop: 95000, dato_klar_over: '2025-12-01' },
    },
    antall_versjoner: 1,
    siste_event_id: 'evt-105',
    siste_oppdatert: femDagerSiden,
  },

  frist: {
    status: 'delvis_godkjent',
    varsel_type: 'spesifisert',
    frist_varsel: {
      dato_sendt: '2025-11-07',
      metode: ['e-post'],
    },
    krevd_dager: 30,
    begrunnelse: 'Forsinkede tegningsleveranser medførte stans i produksjon i 30 virkedager.',
    bh_resultat: 'delvis_godkjent',
    bh_begrunnelse:
      'BH anerkjenner 20 dager forsinkelse. De resterende 10 dagene anses ikke å være på kritisk linje.',
    godkjent_dager: 20,
    bh_respondert_versjon: 0,
    antall_versjoner: 1,
    siste_event_id: 'evt-102',
    siste_oppdatert: '2025-12-15T10:00:00Z',
  },

  // Computed
  er_subsidiaert_vederlag: false,
  er_subsidiaert_frist: false,
  visningsstatus_vederlag: 'sendt',
  visningsstatus_frist: 'delvis_godkjent',
  overordnet_status: 'UNDER_BEHANDLING',
  kan_utstede_eo: false,
  neste_handling: {
    rolle: 'BH',
    handling: 'Svar på vederlagskrav',
    spor: 'vederlag',
  },
  sum_krevd: 1125000,
  sum_godkjent: 0,
  antall_events: 6,
  opprettet: '2025-11-07T08:00:00Z',
  siste_aktivitet: femDagerSiden,
  dagmulktsats: 80000,
};

/**
 * Scenario 3: Tom sak
 *
 * Saken er opprettet men ingen spor er startet.
 * Alle spor har status 'ikke_relevant'.
 */
export const scenario3_TomSak: SakState = {
  sak_id: 'KOE-2024-058',
  sakstittel: 'Ny sak under opprettelse',
  prosjekt_navn: 'Operatunnelen — Parsell 3',
  entreprenor: 'Veidekke Entreprenør AS',
  byggherre: 'Statens vegvesen',
  sakstype: 'standard',

  grunnlag: {
    status: 'ikke_relevant',
    laast: false,
    antall_versjoner: 0,
  },

  vederlag: {
    status: 'ikke_relevant',
    antall_versjoner: 0,
  },

  frist: {
    status: 'ikke_relevant',
    antall_versjoner: 0,
  },

  // Computed
  er_subsidiaert_vederlag: false,
  er_subsidiaert_frist: false,
  visningsstatus_vederlag: 'ikke_relevant',
  visningsstatus_frist: 'ikke_relevant',
  overordnet_status: 'UTKAST',
  kan_utstede_eo: false,
  neste_handling: {
    rolle: 'TE',
    handling: 'Send grunnlagvarsel',
    spor: 'grunnlag',
  },
  sum_krevd: 0,
  sum_godkjent: 0,
  antall_events: 1,
  opprettet: new Date().toISOString(),
  siste_aktivitet: new Date().toISOString(),
};
