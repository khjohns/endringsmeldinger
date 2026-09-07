import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseList } from '$lib/api/cases';
import { getActiveProjectId } from '$lib/api/client';
import type { CaseListResponse } from '$lib/types/api';

export function createCaseListQuery(getProsjektId: () => string = getActiveProjectId) {
  return createQuery<CaseListResponse>(() => {
    const prosjektId = getProsjektId();
    return {
      queryKey: ['cases', prosjektId],
      queryFn: () => fetchCaseList(undefined, prosjektId),
      enabled: !!prosjektId,
    };
  });
}
