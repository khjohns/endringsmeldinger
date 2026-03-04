<script lang="ts">
	import type { TimelineEvent } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';
	import { getEventTypeLabel } from '$lib/constants/eventLabels';
	import HendelsesLogg from './HendelsesLogg.svelte';

	interface Props {
		events: TimelineEvent[];
		expanded: boolean;
		onToggle: () => void;
		onFocusEvent?: (event: TimelineEvent | null) => void;
	}

	let { events, expanded, onToggle, onFocusEvent }: Props = $props();

	function formatRelativeDate(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'i dag';
		if (diffDays === 1) return 'i går';

		// Short date: DD.MM
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		return `${day}.${month}`;
	}

	// Events with time, sorted newest first (single pass for both mini-historikk and logg)
	const sortedEvents = $derived.by(() => {
		return [...events]
			.filter((e) => e.time)
			.sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime());
	});

	const entries = $derived(
		sortedEvents.slice(0, 3).map((e) => {
			const eventType = extractEventType(e.type);
			const role = e.actorrole ?? '';
			const label = getEventTypeLabel(eventType);
			const dateLabel = formatRelativeDate(e.time);
			return { dateLabel, role, label };
		})
	);

	const showLogg = $derived(sortedEvents.length > 3);
</script>

{#if entries.length > 0}
	<div class="historikk-line">
		{#each entries as entry, i (i)}
			{#if i > 0}
				<span class="dot-sep" aria-hidden="true">&middot;</span>
			{/if}
			<span class="entry">
				{entry.dateLabel}
				{#if entry.role}
					<span class="entry-role">{entry.role}</span>
				{/if}
				{entry.label}
			</span>
		{/each}
	</div>
{/if}

{#if showLogg}
	<HendelsesLogg events={sortedEvents} {expanded} {onToggle} {onFocusEvent} />
{/if}

<style>
	.historikk-line {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.entry {
		font-family: var(--font-ui);
		font-size: 10px;
		color: var(--color-ink-muted);
		letter-spacing: 0.01em;
		white-space: nowrap;
	}

	.entry-role {
		font-weight: 600;
	}

	.dot-sep {
		font-family: var(--font-ui);
		font-size: 10px;
		color: var(--color-ink-muted);
	}
</style>
