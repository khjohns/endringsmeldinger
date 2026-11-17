import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseList } from '#lib/api/cases.ts';
import { getActiveProjectId } from '#lib/api/client.ts';
import type { CaseListResponse } from '#lib/types/api.ts';

export function createCaseListQuery(getProsjektId: () => string | null = getActiveProjectId) {
  return createQuery<CaseListResponse>(() => {
    const prosjektId = getProsjektId();
    return {
      queryKey: ['saker', prosjektId],
      queryFn: () => fetchCaseList(prosjektId!),
      enabled: !!prosjektId,
    };
  });
}
