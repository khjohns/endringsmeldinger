import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseList } from '$lib/api/cases';
import type { CaseListResponse } from '$lib/types/api';

export function createCaseListQuery(getProsjektId?: () => string) {
  return createQuery<CaseListResponse>(() => ({
    queryKey: ['cases', getProsjektId?.() ?? 'default'],
    queryFn: async () => {
      try {
        const result = await fetchCaseList();
        if (result.cases.length > 0) return result;
        // API returned empty — fall back to mock data
        const { mockCaseList } = await import('$lib/mocks/caseList');
        return mockCaseList;
      } catch {
        // Backend not running — fall back to mock data
        const { mockCaseList } = await import('$lib/mocks/caseList');
        return mockCaseList;
      }
    },
  }));
}
