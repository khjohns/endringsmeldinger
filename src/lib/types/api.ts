/**
 * API Client Types
 *
 * Type definitions for API requests and responses.
 * These types define the contract between frontend and backend.
 */

import type { SakState, TimelineEvent } from './timeline';

// ========== API RESPONSES ==========

/**
 * Combined context response from /api/cases/{sak_id}/context.
 * Returns state + timeline + historikk in a single request.
 */
export interface CaseContextResponse {
  catenda_sync?: { status: 'clear' | 'pending' | 'failed' | 'unknown'; outstanding?: number };
  version: number;
  state: SakState;
  timeline: TimelineEvent[];
  historikk: {
    grunnlag: GrunnlagHistorikkEntry[];
    vederlag: VederlagHistorikkEntry[];
    frist: FristHistorikkEntry[];
  };
}

// ========== HISTORIKK (REVISION HISTORY) ==========

export interface AktorInfo {
  navn: string;
  rolle: 'TE' | 'BH';
  tidsstempel: string;
}

export type GrunnlagEndringType =
  | 'opprettet'
  | 'oppdatert'
  | 'trukket'
  | 'respons'
  | 'respons_oppdatert'
  | 'akseptert';
export type VederlagEndringType =
  | 'sendt'
  | 'oppdatert'
  | 'trukket'
  | 'respons'
  | 'respons_oppdatert'
  | 'akseptert';
export type FristEndringType =
  | 'sendt'
  | 'oppdatert'
  | 'trukket'
  | 'respons'
  | 'respons_oppdatert'
  | 'spesifisert'
  | 'akseptert'
  | 'innsigelse'
  | 'foresporsel';

export interface GrunnlagHistorikkEntry {
  versjon: number;
  tidsstempel: string;
  aktor: AktorInfo;
  endring_type: GrunnlagEndringType;
  event_id: string;

  // TE-krav felter (for opprettet/oppdatert/trukket)
  tittel?: string | null;
  hovedkategori?: string | null;
  underkategori?: string | string[] | null;
  beskrivelse?: string | null;
  dato_oppdaget?: string | null; // Kritisk for preklusjonsvurdering (§33.4)

  // BH-respons felter (for respons/respons_oppdatert)
  bh_resultat?: string | null;
  bh_resultat_label?: string | null;
  bh_begrunnelse?: string | null;
}

export interface VederlagHistorikkEntry {
  versjon: number;
  tidsstempel: string;
  aktor: AktorInfo;
  endring_type: VederlagEndringType;
  event_id: string;

  // TE-krav felter (for sendt/oppdatert/trukket)
  krav_belop?: number | null;
  metode?: string | null;
  metode_label?: string | null;
  begrunnelse?: string | null;
  inkluderer_rigg_drift?: boolean | null;
  inkluderer_produktivitet?: boolean | null;
  rigg_drift_belop?: number | null; // Særskilt krav §34.1.3
  produktivitet_belop?: number | null; // Særskilt krav §34.1.3

  // BH-respons felter (for respons/respons_oppdatert)
  bh_resultat?: string | null;
  bh_resultat_label?: string | null;
  godkjent_belop?: number | null; // Total (sum av alle komponenter)
  bh_begrunnelse?: string | null;
  hold_tilbake?: boolean | null; // §30.2 tilbakeholdelse

  // BH-respons: Oppdelt godkjent beløp
  hovedkrav_godkjent_belop?: number | null; // Hovedkrav godkjent
  rigg_godkjent_belop?: number | null; // Rigg/drift godkjent (§34.1.3)
  produktivitet_godkjent_belop?: number | null; // Produktivitet godkjent (§34.1.3)

  // Subsidiært standpunkt (inkluderer prekluderte krav)
  subsidiaer_resultat?: string | null;
  subsidiaer_godkjent_belop?: number | null; // Total subsidiært (inkl. prekluderte)
}

export interface FristHistorikkEntry {
  versjon: number;
  tidsstempel: string;
  aktor: AktorInfo;
  endring_type: FristEndringType;
  event_id: string;

  // TE-krav felter (for sendt/oppdatert/trukket)
  krav_dager?: number | null;
  varsel_type?: string | null;
  varsel_type_label?: string | null;
  begrunnelse?: string | null;
  ny_sluttdato?: string | null;
  frist_varsel_dato?: string | null; // §33.4 varseldato
  spesifisert_varsel_dato?: string | null; // §33.6 varseldato

  // BH-respons felter (for respons/respons_oppdatert)
  bh_resultat?: string | null;
  bh_resultat_label?: string | null;
  godkjent_dager?: number | null;
  bh_begrunnelse?: string | null;

  // Subsidiært standpunkt
  subsidiaer_resultat?: string | null;
  subsidiaer_godkjent_dager?: number | null;
}

// ========== CASE LIST ==========

export interface CaseListHendelse {
  id?: string;
  rolle?: 'TE' | 'BH';
  type: 'K' | 'V' | 'F';
  dato: string;
  label: string;
  besvart?: boolean;
}

/**
 * Sakslisten fra `GET /api/projects/<p>/saker` (#1022, #1029). Feltnavnene er
 * kontrakter (B-17); betydningen står i domenetabellen, raden «Linja i sakslisten».
 * Saken har ingen samlet status, bare en betegnelse i de fire tilfellene i MM-U22.
 */
export type Saksbetegnelse =
  | 'ikke_forstaatt'
  | 'avslaget_paa_grunnlaget_godtatt'
  | 'grunnlaget_trukket'
  | 'kravene_avgjort';

/** Appens lesing av enighetens virkning (MM-U28). */
export type Enighetsvirkning = 'betinget' | 'virksom' | 'uten_virkning';

/** Betegnelsen per spor fra den faste lista i MM-U30 (`BETEGNELSER` i `kjerne/utledning/visning.ts`). */
export type Betegnelse =
  | 'trukket'
  | 'spesifisert_krav_etterspurt'
  | 'venter_paa_svar'
  | 'paalegg_frafalt'
  | 'enige'
  | 'svar_ikke_godtatt'
  | 'krav_sendt'
  | 'ingen_krav'
  | 'varslet';

interface Foreligger {
  betegnelse: Betegnelse | null;
  venter_paa_svar: boolean;
  svar_ikke_godtatt: boolean;
}

export interface Grunnlagslinje extends Foreligger {
  svar: { resultat: 'godkjent' | 'avslaatt' | 'paalegg_frafalt' } | null;
}

export interface Vederlagslinje extends Foreligger {
  /** Kravet står slik nøkkeltallene teller det; serveren avgjør det (#1068). */
  kravet_staar: boolean;
  krav: { beloep: number; metode: string } | null;
  svar: {
    resultat: 'godkjent' | 'delvis_godkjent' | 'avslaatt' | 'tilbakeholdelse';
    beloep: number;
    subsidiaert: boolean;
  } | null;
  enighet: { beloep: number | null; virkning: Enighetsvirkning } | null;
}

export interface Fristlinje extends Foreligger {
  kravet_staar: boolean;
  krav: { dager: number } | null;
  svar: {
    resultat: 'godkjent' | 'delvis_godkjent' | 'avslaatt';
    dager: number;
    subsidiaert: boolean;
  } | null;
  enighet: { dager: number | null; virkning: Enighetsvirkning } | null;
}

export interface Sakslinje {
  sak_id: string;
  sakstype: string;
  sakstittel: string | null;
  opprettet: string;
  /** Tidsstempelet på den siste hendelsen i journalen, ikke brevets dato. */
  siste_hendelse: string;
  hovedkategori: string | null;
  forstaatt: boolean;
  saksbetegnelse: Saksbetegnelse | null;
  /** Saken har registrert korrespondanse, som tillegget til «kravene avgjort» i OV-U10. */
  brev_utenfor_appen: boolean;
  grunnlag: Grunnlagslinje;
  vederlag: Vederlagslinje;
  frist: Fristlinje;
}

/** Regnet i serveren. Ukjent er ikke 0, og fristdagene summeres ikke (MM-U28). */
export interface Noekkeltall {
  saker: number;
  ikke_forstaatt: number;
  vederlag: {
    krav_antall: number;
    krav_sum: number;
    venter_paa_svar: number;
    svar_subsidiaert_sum: number;
    enighet_virksom_sum: number;
    enighet_betinget_sum: number;
    enighet_uten_beloep: number;
  };
  frist: { krav_antall: number; venter_paa_svar: number };
}

export interface CaseListResponse {
  success: boolean;
  /** Leserens kontraktsside fra serveren. Rollevalget i klienten gjelder bare visningen. */
  part: 'TE' | 'BH' | null;
  saker: Sakslinje[];
  noekkeltall: Noekkeltall;
}
