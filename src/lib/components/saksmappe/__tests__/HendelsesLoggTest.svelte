<script lang="ts">
  import type { TimelineEvent, SporType } from '$lib/types/timeline';
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
</script>

<HendelsesLogg {events} {expanded} {onToggle} {sakId} {sporType} />
