/**
 * Mock timeline events for development.
 *
 * CloudEvents v1.0 format matching the backend.
 *
 * Two sets:
 * - timeline1_3AktiveSpor — 8 events across 3 tracks for scenario 1
 * - timeline2_BlandetTilstand — 5 events for scenario 2
 */

import type { TimelineEvent } from '$lib/types/timeline';

const SOURCE_P1 = '/projects/P001/cases/KOE-2024-047';
const SAK1 = 'KOE-2024-047';

const SOURCE_P2 = '/projects/P001/cases/KOE-2024-031';
const SAK2 = 'KOE-2024-031';

// ========== SCENARIO 1: Tre aktive spor (KOE-2024-047) ==========

export const timeline1_3AktiveSpor: TimelineEvent[] = [
  // --- Grunnlag ---
  {
    specversion: '1.0',
    id: 'evt-001',
    source: SOURCE_P1,
    type: 'no.oslo.koe.sak_opprettet',
    time: '2026-01-13T09:00:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: null,
    summary: 'Sak opprettet av TE',
  },
  {
    specversion: '1.0',
    id: 'evt-002',
    source: SOURCE_P1,
    type: 'no.oslo.koe.grunnlag_opprettet',
    time: '2026-01-13T09:05:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'grunnlag',
    summary: 'TE varslet om endrede grunnforhold ved akse C5–C8',
    data: {
      tittel: 'Endrede grunnforhold ved akse C5–C8',
      hovedkategori: 'SVIKT',
      underkategori: 'GRUNNFORHOLD',
      beskrivelse:
        'Under utgraving ved akse C5–C8 ble det påtruffet ukjente leirelag som ikke fremgår av de ' +
        'geotekniske rapportene i anbudsgrunnlaget.',
      dato_oppdaget: '2026-01-10',
      grunnlag_varsel: {
        dato_sendt: '2026-01-13',
        metode: ['e-post', 'Catenda'],
      },
    },
  },
  {
    specversion: '1.0',
    id: 'evt-003',
    source: SOURCE_P1,
    type: 'no.oslo.koe.grunnlag_oppdatert',
    time: '2026-01-14T11:20:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'grunnlag',
    summary: 'TE oppdaterte grunnlagsvarselet med tilleggsdokumentasjon',
    data: {
      original_event_id: 'evt-002',
      beskrivelse:
        'Under utgraving ved akse C5–C8 ble det påtruffet ukjente leirelag som ikke fremgår av de ' +
        'geotekniske rapportene i anbudsgrunnlaget. Geoteknisk notat vedlegges.',
      endrings_begrunnelse: 'Lagt til geoteknisk notat fra rådgiver.',
    },
  },

  // --- Frist ---
  {
    specversion: '1.0',
    id: 'evt-004',
    source: SOURCE_P1,
    type: 'no.oslo.koe.frist_krav_sendt',
    time: '2026-01-20T10:00:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'frist',
    summary: 'TE sendte spesifisert fristkrav: 45 virkedager',
    data: {
      varsel_type: 'spesifisert',
      frist_varsel: {
        dato_sendt: '2026-01-13',
        metode: ['e-post'],
      },
      spesifisert_varsel: {
        dato_sendt: '2026-01-20',
        metode: ['e-post', 'Catenda'],
      },
      antall_dager: 45,
      begrunnelse:
        'Ekstraarbeidet med peling og forsterkning vil ligge på kritisk linje og forsinke ' +
        'betongarbeider ved akse C5–C8 med estimert 45 virkedager.',
    },
  },
  {
    specversion: '1.0',
    id: 'evt-005',
    source: SOURCE_P1,
    type: 'no.oslo.koe.frist_krav_oppdatert',
    time: '2026-01-28T14:00:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'frist',
    summary: 'TE reviderte fristkravet etter ny fremdriftsanalyse',
    data: {
      original_event_id: 'evt-004',
      nytt_antall_dager: 45,
      begrunnelse:
        'Fremdriftsanalyse bekrefter 45 virkedager. Vedlegger oppdatert Gantt-diagram.',
      dato_revidert: '2026-01-28',
    },
  },

  // --- Vederlag ---
  {
    specversion: '1.0',
    id: 'evt-006',
    source: SOURCE_P1,
    type: 'no.oslo.koe.vederlag_krav_sendt',
    time: '2026-01-22T09:30:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'vederlag',
    summary: 'TE sendte vederlagskrav: kr 2 400 000 (regningsarbeid)',
    data: {
      metode: 'REGNINGSARBEID',
      kostnads_overslag: 2400000,
      begrunnelse:
        'Kostnadsoverslag for ekstra peling (type RD 219/12), spunt og forsterkningstiltak.',
      varslet_for_oppstart: true,
    },
  },
  {
    specversion: '1.0',
    id: 'evt-007',
    source: SOURCE_P1,
    type: 'no.oslo.koe.vederlag_krav_oppdatert',
    time: '2026-02-03T10:15:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'vederlag',
    summary: 'TE oppdaterte kostnadsoverslaget til kr 2 400 000',
    data: {
      original_event_id: 'evt-006',
      nytt_kostnads_overslag: 2400000,
      begrunnelse: 'Oppdatert etter tilbud fra underkontraktør for pelingarbeid.',
      dato_revidert: '2026-02-03',
    },
  },
  {
    specversion: '1.0',
    id: 'evt-008',
    source: SOURCE_P1,
    type: 'no.oslo.koe.vederlag_krav_oppdatert',
    time: '2026-02-10T08:45:00Z',
    subject: SAK1,
    actorrole: 'TE',
    actor: 'Knut Larsen',
    spor: 'vederlag',
    summary: 'TE bekreftet endelig krav med vedlegg',
    data: {
      original_event_id: 'evt-007',
      nytt_kostnads_overslag: 2400000,
      begrunnelse: 'Endelig fakturaoversikt og timelister vedlagt.',
      dato_revidert: '2026-02-10',
    },
  },
];

// ========== SCENARIO 2: Blandet tilstand (KOE-2024-031) ==========

export const timeline2_BlandetTilstand: TimelineEvent[] = [
  {
    specversion: '1.0',
    id: 'evt-101',
    source: SOURCE_P2,
    type: 'no.oslo.koe.grunnlag_opprettet',
    time: '2025-11-07T08:00:00Z',
    subject: SAK2,
    actorrole: 'TE',
    actor: 'Maria Andersen',
    spor: 'grunnlag',
    summary: 'TE varslet om forsinkede tegningsleveranser fra ARK',
    data: {
      tittel: 'Forsinkede tegningsleveranser fra ARK',
      hovedkategori: 'ENDRING',
      underkategori: 'IRREG',
      begrunnelse:
        '<p>Arkitektfirmaet (BHs prosjekterende) leverte detaljerte armerings- og beklednings\u00ADtegninger ' +
        'for akse 4–8 vesentlig forsinket i forhold til omforent fremdriftsplan. Tegningene var avtalt ' +
        'levert innen 15. oktober 2025, men ble ikke mottatt før 5. november 2025.</p>' +
        '<p>Forsinkelsen medførte at TE ikke kunne starte armering og forskaling iht. plan, noe som har ' +
        'påført TE økte rigg- og driftskostnader samt krav om forsert innsats for å holde øvrig fremdrift. ' +
        'TE anser forholdet som en irregulær endring jf. NS 8407 §32.1.</p>',
      dato_oppdaget: '2025-11-05',
      grunnlag_varsel: {
        dato_sendt: '2025-11-07',
        metode: ['e-post'],
      },
    },
  },
  {
    specversion: '1.0',
    id: 'evt-102',
    source: SOURCE_P2,
    type: 'no.oslo.koe.frist_krav_sendt',
    time: '2025-11-14T10:00:00Z',
    subject: SAK2,
    actorrole: 'TE',
    actor: 'Maria Andersen',
    spor: 'frist',
    summary: 'TE sendte fristkrav: 30 virkedager',
    data: {
      varsel_type: 'spesifisert',
      frist_varsel: {
        dato_sendt: '2025-11-07',
        metode: ['e-post'],
      },
      antall_dager: 30,
      begrunnelse: 'Forsinkede tegningsleveranser medførte stans i produksjon i 30 virkedager.',
    },
  },
  {
    specversion: '1.0',
    id: 'evt-103',
    source: SOURCE_P2,
    type: 'no.oslo.koe.respons_grunnlag',
    time: '2025-12-01T14:30:00Z',
    subject: SAK2,
    actorrole: 'BH',
    actor: 'Hanne Sørensen',
    spor: 'grunnlag',
    summary: 'BH godkjente grunnlag',
    data: {
      resultat: 'godkjent',
      begrunnelse:
        'BH erkjenner at tegningsleveransen var forsinket i henhold til omforent fremdriftsplan.',
    },
  },
  {
    specversion: '1.0',
    id: 'evt-104',
    source: SOURCE_P2,
    type: 'no.oslo.koe.respons_frist',
    time: '2025-12-15T10:00:00Z',
    subject: SAK2,
    actorrole: 'BH',
    actor: 'Hanne Sørensen',
    spor: 'frist',
    summary: 'BH delvis godkjente fristkrav: 20 av 30 virkedager',
    data: {
      beregnings_resultat: 'delvis_godkjent',
      godkjent_dager: 20,
      begrunnelse:
        'BH anerkjenner 20 dager forsinkelse. De resterende 10 dagene anses ikke å være på kritisk linje.',
      frist_varsel_ok: true,
      spesifisert_krav_ok: true,
      vilkar_oppfylt: true,
    },
  },
  {
    specversion: '1.0',
    id: 'evt-105',
    source: SOURCE_P2,
    type: 'no.oslo.koe.vederlag_krav_sendt',
    time: '2026-01-10T09:00:00Z',
    subject: SAK2,
    actorrole: 'TE',
    actor: 'Maria Andersen',
    spor: 'vederlag',
    summary: 'TE sendte vederlagskrav: kr 850 000 (fastpris)',
    data: {
      metode: 'FASTPRIS_TILBUD',
      belop_direkte: 850000,
      begrunnelse:
        'Fastpristilbud for ekstraarbeid som fulgte av forsinkelsen: omrigging av mannskap, ' +
        'tapt produktivitet og tilleggsbetong ved sektor D.',
    },
  },
  // Internal note
  {
    specversion: '1.0',
    id: 'evt-106',
    source: SOURCE_P2,
    type: 'no.oslo.koe.internt_notat',
    time: '2025-12-16T10:45:00Z',
    subject: SAK2,
    actorrole: 'TE',
    actor: 'Maria Andersen',
    spor: 'frist',
    summary: 'Sjekk med underentreprenør om de kan forsere støpingen.',
  },
];
