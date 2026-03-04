<script lang="ts">
	import type { TimelineEvent, SporType } from '$lib/types/timeline';
	import HendelsesLogg from '../HendelsesLogg.svelte';

	interface Props {
		events: TimelineEvent[];
		sporType?: SporType;
		expanded?: boolean;
		onToggle?: () => void;
	}

	let {
		events,
		sporType = 'grunnlag',
		expanded = false,
		onToggle = () => {},
	}: Props = $props();
</script>

<HendelsesLogg {events} {sporType} {expanded} {onToggle} />
