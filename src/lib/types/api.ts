/**
 * API Client Types
 *
 * Type definitions for API requests and responses.
 * These types define the contract between frontend and backend.
 */

/**
 * Sakslisten fra `GET /api/projects/<p>/saker` (#1022, #1029). Feltnavnene er
 * kontrakter (B-17); betydningen står i domenetabellen, raden «Linja i sakslisten».
 * Saken har ingen samlet status, bare en betegnelse i de fire tilfellene i MM-U22.
 */
export type Saksbetegnelse =
  | 'ikke_forstaatt'
  | 'avslaget_paa_forholdet_godtatt'
  | 'paaberopelsen_trukket'
  | 'kravene_avgjort';

/** Appens lesing av enighetens virkning (GR-U7, MM-U3 (opphevet av MM-U50), KA-U6), som `enighetensVirkning` i kjernen. */
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

export interface Forholdslinje extends Foreligger {
  svar: { resultat: 'godkjent' | 'avslaatt' | 'paalegg_frafalt' } | null;
}

export interface Vederlagslinje extends Foreligger {
  /** Kravet står slik nøkkeltallene teller det; serveren avgjør det (#1068). */
  kravet_staar: boolean;
  har_varsel: boolean;
  ingen_krav: boolean;
  /**
   * `beloep` er summen av de faste beløpene, eller `null` når ingen post har et fast beløp, og
   * `antall_uten_fast_beloep` er kravpostene summen ikke regner med (#1779).
   */
  krav: { beloep: number | null; antall_uten_fast_beloep: number } | null;
  svar: {
    resultat: 'godkjent' | 'delvis_godkjent' | 'avslaatt' | 'tilbakeholdelse';
    beloep: number | null;
    antall_uten_fast_beloep: number;
    subsidiaert: boolean;
  } | null;
  /** `uten_fast_beloep`: kravpostene uten fast beløp prinsipalt, som `beloep` ikke regner med (OV-U73). */
  enighet: {
    beloep: number | null;
    uten_fast_beloep: string[];
    virkning: Enighetsvirkning;
  } | null;
}

export interface Fristlinje extends Foreligger {
  kravet_staar: boolean;
  har_varsel: boolean;
  ingen_krav: boolean;
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
  /** Sakens siste brev med avsenderen og brevets dato (ÅÅÅÅ-MM-DD); `null` uten brev eller forståelse. */
  siste_brev: { avsender: 'TE' | 'BH'; dato: string } | null;
  hovedkategori: string | null;
  /** Forholdet TE påberoper, med kjernens kode (arbeidsvalg 03.11 i #1450). */
  underkategori: string | null;
  forstaatt: boolean;
  saksbetegnelse: Saksbetegnelse | null;
  /** Saken har registrert korrespondanse, som tillegget til «kravene avgjort» i OV-U10. */
  brev_utenfor_appen: boolean;
  forhold: Forholdslinje;
  vederlag: Vederlagslinje;
  frist: Fristlinje;
}

export interface CaseListResponse {
  success: boolean;
  /** Leserens kontraktsside fra serveren. Rollevalget i klienten gjelder bare visningen. */
  part: 'TE' | 'BH' | null;
  saker: Sakslinje[];
}
