<script lang="ts">
  import type { SakState, TimelineEvent, SporType } from '$lib/types/timeline';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import Sporkort from '../Sporkort.svelte';

  interface Props {
    sporType: SporType;
    state: SakState;
    events?: TimelineEvent[];
    prosjektId?: string;
    sakId?: string;
  }

  let { sporType, state, events = [], prosjektId = 'P001', sakId = 'SAK-001' }: Props = $props();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
</script>

<QueryClientProvider client={queryClient}>
  <Sporkort {sporType} {state} {events} {prosjektId} {sakId} />
</QueryClientProvider>
