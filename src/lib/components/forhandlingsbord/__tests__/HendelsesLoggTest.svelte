<script lang="ts">
	import type { TimelineEvent } from '$lib/types/timeline';
	import HendelsesLogg from '../HendelsesLogg.svelte';

	interface Props {
		events: TimelineEvent[];
		expanded?: boolean;
		onToggle?: () => void;
	}

	let {
		events,
		expanded = false,
		onToggle = () => {},
	}: Props = $props();
</script>

<HendelsesLogg {events} {expanded} {onToggle} />
