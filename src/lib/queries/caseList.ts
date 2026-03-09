import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseList } from '$lib/api/cases';
import type { CaseListResponse } from '$lib/types/api';

export function createCaseListQuery() {
  return createQuery<CaseListResponse>(() => ({
    queryKey: ['cases'],
    queryFn: async () => {
      try {
        return await fetchCaseList();
      } catch {
        // Fallback to mock data in development (backend not running)
        const { mockCaseList } = await import('$lib/mocks/caseList');
        return mockCaseList;
      }
    },
  }));
}
