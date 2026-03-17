<script lang="ts">
  import type { TimelineEvent, SporType } from '$lib/types/timeline';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import HendelsesLogg from '../HendelsesLogg.svelte';

  interface Props {
    events: TimelineEvent[];
    expanded?: boolean;
    onToggle?: () => void;
    sakId?: string;
    sporType?: SporType;
  }

  let {
    events,
    expanded = false,
    onToggle = () => {},
    sakId = 'test-sak',
    sporType = 'grunnlag',
  }: Props = $props();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
</script>

<QueryClientProvider client={queryClient}>
  <HendelsesLogg {events} {expanded} {onToggle} {sakId} {sporType} />
</QueryClientProvider>
