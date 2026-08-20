import { createQuery } from '@tanstack/svelte-query';
import { mockCaseList } from '$lib/mocks/caseList';
import type { CaseListResponse } from '$lib/types/api';

export function createCaseListQuery(getProsjektId?: () => string) {
  return createQuery<CaseListResponse>(() => ({
    queryKey: ['cases', getProsjektId?.() ?? 'default'],
    queryFn: async (): Promise<CaseListResponse> => mockCaseList,
  }));
}
