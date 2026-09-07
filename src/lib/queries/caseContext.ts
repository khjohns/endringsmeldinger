import { createQuery } from '@tanstack/svelte-query';
import { getActiveProjectId } from '$lib/api/client';
import { fetchCaseContext } from '$lib/api/state';
import type { CaseContextResponse } from '$lib/types/api';

export function createCaseContextQuery(
  getSakId: () => string,
  getProsjektId: () => string = getActiveProjectId
) {
  return createQuery<CaseContextResponse>(() => {
    const sakId = getSakId();
    const prosjektId = getProsjektId();
    return {
      // Preserve the case prefix used by existing mutation invalidations.
      queryKey: ['case-context', sakId, prosjektId],
      queryFn: () => fetchCaseContext(sakId, prosjektId),
      enabled: !!sakId && !!prosjektId,
    };
  });
}
