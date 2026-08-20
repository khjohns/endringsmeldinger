import { createQuery } from '@tanstack/svelte-query';
import type { CaseContextResponse } from '$lib/types/api';
import {
  scenario1_3AktiveSpor,
  scenario2_BlandetTilstand,
  scenario3_TomSak,
  scenario4_Omforent,
} from '$lib/mocks/caseState';
import {
  timeline1_3AktiveSpor,
  timeline2_BlandetTilstand,
  timeline4_Omforent,
} from '$lib/mocks/timeline';

const stateMap: Record<string, typeof scenario1_3AktiveSpor> = {
  'KOE-2024-047': scenario1_3AktiveSpor,
  'KOE-2024-019': scenario4_Omforent,
  'KOE-2024-031': scenario2_BlandetTilstand,
  'KOE-2024-058': scenario3_TomSak,
};

const timelineMap: Record<string, typeof timeline1_3AktiveSpor> = {
  'KOE-2024-047': timeline1_3AktiveSpor,
  'KOE-2024-019': timeline4_Omforent,
  'KOE-2024-031': timeline2_BlandetTilstand,
};

export function createCaseContextQuery(getSakId: () => string) {
  return createQuery<CaseContextResponse>(() => {
    const sakId = getSakId();
    return {
      queryKey: ['case-context', sakId],
      queryFn: async (): Promise<CaseContextResponse> => {
        const state = stateMap[sakId] ?? scenario1_3AktiveSpor;
        const timeline = timelineMap[sakId] ?? [];

        return {
          version: 1,
          state,
          timeline,
          historikk: { grunnlag: [], vederlag: [], frist: [] },
        };
      },
      enabled: !!sakId,
    };
  });
}
