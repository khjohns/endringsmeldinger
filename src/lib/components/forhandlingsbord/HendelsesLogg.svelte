<script lang="ts">
	import type { TimelineEvent, EventType } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';
	import { getEventTypeLabel } from '$lib/constants/eventLabels';
	import { slide } from 'svelte/transition';

	interface Props {
		events: TimelineEvent[];
		expanded: boolean;
		onToggle: () => void;
	}

	let { events, expanded, onToggle }: Props = $props();

	interface EventIcon {
		symbol: string;
		color: string;
	}

	function getEventIcon(eventType: EventType | null): EventIcon {
		if (!eventType) return { symbol: '·', color: 'var(--color-ink-muted)' };

		// sendt/krav_sendt
		if (eventType.includes('sendt') || eventType === 'frist_krav_sendt' || eventType === 'vederlag_krav_sendt') {
			return { symbol: '\u2192', color: 'var(--color-ink-muted)' };
		}
		// opprettet (varsel)
		if (eventType.includes('opprettet') && !eventType.includes('oppdatert')) {
			return { symbol: '\u2691', color: 'var(--color-ink-muted)' };
		}
		// oppdatert/spesifisert
		if (eventType.includes('oppdatert') || eventType.includes('spesifisert')) {
			return { symbol: '\u21BB', color: 'var(--color-vekt-dim)' };
		}
		// respons (ny — not oppdatert)
		if (eventType.startsWith('respons_') && !eventType.includes('oppdatert')) {
			return { symbol: '\u25C7', color: 'var(--color-score-high)' };
		}
		// akseptert
		if (eventType.includes('aksept')) {
			return { symbol: '\u2713', color: 'var(--color-score-high)' };
		}
		// trukket/avslatt
		if (eventType.includes('trukket') || eventType.includes('avslatt')) {
			return { symbol: '\u2715', color: 'var(--color-score-low)' };
		}

		return { symbol: '·', color: 'var(--color-ink-muted)' };
	}

	function getEventLabel(event: TimelineEvent, eventType: EventType | null): string {
		if (event.summary) return event.summary;
		return getEventTypeLabel(eventType);
	}

	function formatDateShort(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		return `${day}.${month}`;
	}

	function getRevision(event: TimelineEvent): string | null {
		// Events with data that contain revision info
		const data = event.data as Record<string, unknown> | undefined;
		if (!data) return null;

		// Check for respondert_versjon (BH responses)
		if ('respondert_versjon' in data && typeof data.respondert_versjon === 'number') {
			return `Rev. ${data.respondert_versjon}`;
		}

		return null;
	}

	// Events are pre-sorted (newest first) and pre-filtered (time != null) by parent
	const showToggle = $derived(events.length > 3);

	const eventEntries = $derived(
		events.map((e) => {
			const eventType = extractEventType(e.type);
			const icon = getEventIcon(eventType);
			const label = getEventLabel(e, eventType);
			const dateLabel = formatDateShort(e.time);
			const role = e.actorrole ?? '';
			const revision = getRevision(e);
			return { id: e.id, icon, dateLabel, label, role, revision };
		})
	);

	function handleToggleClick(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		onToggle();
	}

	function handleToggleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.stopPropagation();
			e.preventDefault();
			onToggle();
		}
	}

	function handleLogClick(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
	}
</script>

{#if showToggle}
	<div
		class="toggle-bar"
		class:toggle-bar-expanded={expanded}
		role="button"
		tabindex="0"
		aria-expanded={expanded}
		aria-label="{events.length} hendelser"
		onclick={handleToggleClick}
		onkeydown={handleToggleKeydown}
	>
		<span class="toggle-label">{events.length} hendelser</span>
		<span class="toggle-chevron" class:toggle-chevron-expanded={expanded} aria-hidden="true">
			{expanded ? '\u25BE' : '\u25B8'}
		</span>
	</div>

	{#if expanded}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="events-list"
			transition:slide={{ duration: 200 }}
			onclick={handleLogClick}
			onkeydown={(e) => e.stopPropagation()}
		>
			{#each eventEntries as entry (entry.id)}
				<div class="event-line">
					<span class="event-icon" style="color: {entry.icon.color}" aria-hidden="true"
						>{entry.icon.symbol}</span
					>
					<span class="event-date">{entry.dateLabel}</span>
					<span class="event-text">{entry.label}</span>
					{#if entry.revision}
						<span class="event-rev">{entry.revision}</span>
					{/if}
					<span class="event-part">{entry.role}</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.toggle-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--color-canvas);
		border-top: 1px solid var(--color-wire);
		padding: 6px 16px;
		margin: 8px -16px -12px;
		border-radius: 0 0 var(--radius-md) var(--radius-md);
		cursor: pointer;
		user-select: none;
	}

	.toggle-bar:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.toggle-bar-expanded {
		border-bottom: 1px solid var(--color-wire);
		border-radius: 0;
	}

	.toggle-label {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		letter-spacing: 0.01em;
	}

	.toggle-chevron {
		font-size: 8px;
		color: var(--color-ink-ghost);
		transition: transform 150ms ease;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 16px 12px;
		margin: 0 -16px -12px;
		background: var(--color-canvas);
		border-radius: 0 0 var(--radius-md) var(--radius-md);
	}

	.event-line {
		display: flex;
		align-items: center;
		gap: 4px;
		min-height: 20px;
	}

	.event-icon {
		width: 14px;
		flex-shrink: 0;
		font-size: 11px;
		text-align: center;
		line-height: 1;
	}

	.event-date {
		width: 38px;
		flex-shrink: 0;
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		letter-spacing: 0.01em;
	}

	.event-text {
		flex: 1;
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.event-rev {
		font-family: var(--font-ui);
		font-size: 9px;
		color: var(--color-ink-ghost);
		flex-shrink: 0;
	}

	.event-part {
		width: 20px;
		flex-shrink: 0;
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		text-align: right;
	}
</style>
