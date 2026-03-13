import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseContext } from '$lib/api/state';
import type { CaseContextResponse } from '$lib/types/api';

export function createCaseContextQuery(getSakId: () => string) {
  return createQuery<CaseContextResponse>(() => {
    const sakId = getSakId();
    return {
      queryKey: ['case-context', sakId],
      queryFn: async () => {
        try {
          return await fetchCaseContext(sakId);
        } catch {
          // Fallback to mock data in development (backend not running)
          const [
            {
              scenario1_3AktiveSpor,
              scenario2_BlandetTilstand,
              scenario3_TomSak,
              scenario4_Omforent,
            },
            { timeline1_3AktiveSpor, timeline2_BlandetTilstand, timeline4_Omforent },
          ] = await Promise.all([import('$lib/mocks/caseState'), import('$lib/mocks/timeline')]);

          // Pick mock state by sak_id; fall back to scenario 1
          const stateMap: Record<string, typeof scenario1_3AktiveSpor> = {
            'KOE-2024-047': scenario1_3AktiveSpor,
            'KOE-2024-019': scenario4_Omforent,
            'KOE-2024-031': scenario2_BlandetTilstand,
            'KOE-2024-058': scenario3_TomSak,
          };
          const state = stateMap[sakId] ?? scenario1_3AktiveSpor;

          const timelineMap: Record<string, typeof timeline1_3AktiveSpor> = {
            'KOE-2024-047': timeline1_3AktiveSpor,
            'KOE-2024-019': timeline4_Omforent,
            'KOE-2024-031': timeline2_BlandetTilstand,
          };
          const timeline = timelineMap[sakId] ?? [];

          const response: CaseContextResponse = {
            version: 1,
            state,
            timeline,
            historikk: { grunnlag: [], vederlag: [], frist: [] },
          };
          return response;
        }
      },
      enabled: !!sakId,
    };
  });
}
