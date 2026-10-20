import { apiFetch } from './client';
import type { CaseListResponse } from '../types/api';

/** Sakslisten i prosjektet, regnet av TS-kjernen ved lesing (#1022). */
export async function fetchCaseList(prosjektId: string): Promise<CaseListResponse> {
  return apiFetch<CaseListResponse>(`/api/projects/${encodeURIComponent(prosjektId)}/saker`, {
    headers: { 'X-Project-ID': prosjektId },
  });
}
