import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseList } from '$lib/api/cases';
import type { CaseListResponse } from '$lib/types/api';

export function createCaseListQuery() {
  return createQuery<CaseListResponse>({
    queryKey: ['cases'],
    queryFn: () => fetchCaseList(),
  });
}
