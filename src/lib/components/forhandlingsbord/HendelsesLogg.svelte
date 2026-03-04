<script lang="ts">
	import type { TimelineEvent, EventType } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';
	import { getEventTypeLabel } from '$lib/constants/eventLabels';
	import { slide } from 'svelte/transition';

	interface Props {
		events: TimelineEvent[];
		expanded: boolean;
		onToggle: () => void;
		onFocusEvent?: (event: TimelineEvent | null) => void;
	}

	let { events, expanded, onToggle, onFocusEvent }: Props = $props();

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

	const VISIBLE_COUNT = 3;

	// Events are pre-sorted (newest first) and pre-filtered (time != null) by parent
	const hasMore = $derived(events.length > VISIBLE_COUNT);

	function mapEntry(e: TimelineEvent) {
		const eventType = extractEventType(e.type);
		const icon = getEventIcon(eventType);
		const label = getEventLabel(e, eventType);
		const dateLabel = formatDateShort(e.time);
		const role = e.actorrole ?? '';
		const revision = getRevision(e);
		return { id: e.id, icon, dateLabel, label, role, revision };
	}

	const visibleEntries = $derived(events.slice(0, VISIBLE_COUNT).map(mapEntry));
	const remainingEntries = $derived(events.slice(VISIBLE_COUNT).map(mapEntry));
	const allEntries = $derived([...visibleEntries, ...remainingEntries]);

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

	// Track focused event index for arrow-key navigation
	let focusedIndex = $state(-1);

	// Stable ID generated once (not derived, to avoid re-computation on reactive updates)
	const listboxId = `logg-listbox-${Math.random().toString(36).slice(2, 8)}`;
	const activeDescendantId = $derived(
		focusedIndex >= 0 && focusedIndex < allEntries.length
			? `${listboxId}-option-${focusedIndex}`
			: undefined
	);

	function emitFocus(index: number) {
		focusedIndex = index;
		if (index >= 0 && index < events.length) {
			onFocusEvent?.(events[index]);
		} else {
			onFocusEvent?.(null);
		}
	}

	function handleListKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Escape') {
			e.preventDefault();
			emitFocus(-1);
			onToggle();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			const maxIndex = expanded ? allEntries.length - 1 : visibleEntries.length - 1;
			emitFocus(Math.min(focusedIndex + 1, maxIndex));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			emitFocus(Math.max(focusedIndex - 1, 0));
		}
	}

	function handleEventMouseEnter(index: number) {
		emitFocus(index);
	}

	// No mouseleave clear — focus stays sticky until logg closes.
	// This prevents grid flicker from panel mount/unmount on every hover exit.
</script>

{#if events.length > 0}
	<div
		id={listboxId}
		class="events-list"
		role="listbox"
		tabindex="-1"
		aria-activedescendant={activeDescendantId}
		onclick={handleLogClick}
		onkeydown={handleListKeydown}
	>
		{#each visibleEntries as entry, i (entry.id)}
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<div
				id="{listboxId}-option-{i}"
				class="event-line"
				class:event-line-focused={focusedIndex === i}
				role="option"
				aria-selected={focusedIndex === i}
				onmouseenter={() => handleEventMouseEnter(i)}
			>
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

		{#if hasMore}
			<div
				class="toggle-bar"
				class:toggle-bar-expanded={expanded}
				role="button"
				tabindex="0"
				aria-expanded={expanded}
				aria-label="{remainingEntries.length} hendelser til"
				onclick={handleToggleClick}
				onkeydown={handleToggleKeydown}
			>
				<span class="toggle-label">{remainingEntries.length} hendelser til</span>
				<span class="toggle-chevron" aria-hidden="true">
					{expanded ? '\u25BE' : '\u25B8'}
				</span>
			</div>

			{#if expanded}
				<div class="remaining-events" transition:slide={{ duration: 200 }}>
					{#each remainingEntries as entry, j (entry.id)}
						<!-- svelte-ignore a11y_interactive_supports_focus -->
						<div
							id="{listboxId}-option-{j + VISIBLE_COUNT}"
							class="event-line"
							class:event-line-focused={focusedIndex === j + VISIBLE_COUNT}
							role="option"
							aria-selected={focusedIndex === j + VISIBLE_COUNT}
							onmouseenter={() => handleEventMouseEnter(j + VISIBLE_COUNT)}
						>
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
	</div>
{/if}

<style>
	.toggle-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--color-wire);
		padding: 4px 8px;
		margin-top: 4px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		user-select: none;
	}

	.toggle-bar:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.toggle-bar-expanded {
		border-bottom: 1px solid var(--color-wire);
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		margin-bottom: 4px;
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
		padding-top: 4px;
	}

	.remaining-events {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.event-line {
		display: flex;
		align-items: center;
		gap: 4px;
		min-height: 24px;
		padding: 2px 8px;
		border-left: 2px solid transparent;
		border-radius: var(--radius-sm);
	}

	.event-line-focused {
		background: var(--color-felt-hover);
		border-left-color: var(--color-vekt);
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
