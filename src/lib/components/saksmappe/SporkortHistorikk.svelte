<script lang="ts">
  import type { TimelineEvent, SporType } from '$lib/types/timeline';
  import HendelsesLogg from './HendelsesLogg.svelte';

  interface Props {
    events: TimelineEvent[];
    expanded: boolean;
    onToggle: () => void;
    onFocusEvent?: (event: TimelineEvent | null) => void;
    focusedEvent?: TimelineEvent | null;
    teNavn?: string;
    bhNavn?: string;
    sakId: string;
    sporType: SporType;
  }

  let {
    events,
    expanded,
    onToggle,
    onFocusEvent,
    focusedEvent = null,
    teNavn,
    bhNavn,
    sakId,
    sporType,
  }: Props = $props();

  // Events with time, sorted newest first
  const sortedEvents = $derived.by(() => {
    return [...events]
      .filter((e) => e.time)
      .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime());
  });
</script>

{#if sortedEvents.length > 0}
  <HendelsesLogg
    events={sortedEvents}
    {expanded}
    {onToggle}
    {onFocusEvent}
    {focusedEvent}
    {teNavn}
    {bhNavn}
    {sakId}
    {sporType}
  />
{/if}
