import { apiFetch } from './client';
import type { EOKonsekvenser, SakState, VederlagsMetode } from '$lib/types/timeline';

export interface EOCandidate {
  sak_id: string;
  tittel: string;
  overordnet_status: string;
  sum_godkjent: number;
  godkjent_dager: number | null;
  har_vederlagskrav?: boolean;
  har_fristkrav?: boolean;
}

export interface CreateEORequest {
  eo_nummer: string;
  beskrivelse: string;
  koe_sak_ids: string[];
  konsekvenser: EOKonsekvenser;
  konsekvens_beskrivelse?: string;
  oppgjorsform?: VederlagsMetode;
  kompensasjon_belop?: number;
  fradrag_belop?: number;
  er_estimat: boolean;
  frist_dager?: number;
  ny_sluttdato?: string;
}

export function fetchEOCandidates(projectId: string) {
  return apiFetch<{ kandidat_saker: EOCandidate[] }>('/api/endringsordre/kandidater', {
    headers: { 'X-Project-ID': projectId },
  });
}

export function fetchNextEONumber(projectId: string) {
  return apiFetch<{ neste_nummer: string }>('/api/endringsordre/neste-nummer', {
    headers: { 'X-Project-ID': projectId },
  });
}

export function createEndringsordre(projectId: string, payload: CreateEORequest) {
  return apiFetch<{ success: boolean; sak_id: string; catenda_synced: boolean }>(
    '/api/endringsordre/opprett',
    { method: 'POST', headers: { 'X-Project-ID': projectId }, body: JSON.stringify(payload) }
  );
}

export function fetchEOContext(projectId: string, sakId: string) {
  return apiFetch<{ sak_states: Record<string, SakState> }>(
    `/api/endringsordre/${encodeURIComponent(sakId)}/kontekst`,
    { headers: { 'X-Project-ID': projectId } }
  );
}
