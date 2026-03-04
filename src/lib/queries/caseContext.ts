import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseContext } from '$lib/api/state';
import type { CaseContextResponse } from '$lib/types/api';

export function createCaseContextQuery(sakId: string) {
  return createQuery<CaseContextResponse>({
    queryKey: ['case-context', sakId],
    queryFn: () => fetchCaseContext(sakId),
    enabled: !!sakId,
  });
}
