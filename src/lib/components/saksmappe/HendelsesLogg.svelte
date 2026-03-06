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
		// internt notat
		if (eventType === 'internt_notat') {
			return { symbol: '\u270E', color: 'var(--color-vekt)' };
		}

		return { symbol: '·', color: 'var(--color-ink-muted)' };
	}

	function getEventLabel(event: TimelineEvent, eventType: EventType | null): string {
		if (event.summary) return event.summary;
		return getEventTypeLabel(eventType);
	}

	function getActorSuffix(event: TimelineEvent): string | null {
		// Only show actor suffix when there's no summary (summary already includes actor context)
		if (event.summary) return null;
		if (!event.actorrole) return null;
		return event.actorrole === 'BH' ? 'av Byggherre' : 'av Entreprenør';
	}

	function isInterntNotat(eventType: EventType | null): boolean {
		return eventType === 'internt_notat';
	}

	function formatDateShort(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const now = new Date();

		// Check if today or yesterday — show clock time
		const isToday =
			date.getFullYear() === now.getFullYear() &&
			date.getMonth() === now.getMonth() &&
			date.getDate() === now.getDate();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const isYesterday =
			date.getFullYear() === yesterday.getFullYear() &&
			date.getMonth() === yesterday.getMonth() &&
			date.getDate() === yesterday.getDate();

		if (isToday || isYesterday) {
			const hh = date.getHours().toString().padStart(2, '0');
			const mm = date.getMinutes().toString().padStart(2, '0');
			return `${hh}:${mm}`;
		}

		// Older events — short date
		const MONTH_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
		return `${date.getDate()}. ${MONTH_SHORT[date.getMonth()]}`;
	}

	function getRevision(event: TimelineEvent): string | null {
		const data = event.data as Record<string, unknown> | undefined;
		if (!data) return null;
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
		const revision = getRevision(e);
		const actorSuffix = getActorSuffix(e);
		const internt = isInterntNotat(eventType);
		return { id: e.id, icon, dateLabel, label, revision, actorSuffix, internt };
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

	function handleEventClick(index: number, e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		emitFocus(index);
	}
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
				class:event-line-internt={entry.internt}
				role="option"
				aria-selected={focusedIndex === i}
				onclick={(e: MouseEvent) => handleEventClick(i, e)}
			>
				<span class="event-icon" style="color: {entry.icon.color}" aria-hidden="true"
					>{entry.icon.symbol}</span
				>
				<span class="event-date">{entry.dateLabel}</span>
				{#if entry.internt}
					<span class="event-text internt-label"><span class="kun-internt">KUN INTERNT:</span> {entry.label}</span>
				{:else}
					<span class="event-text">{entry.label}</span>
				{/if}
				{#if entry.actorSuffix && !entry.internt}
					<span class="event-actor">{entry.actorSuffix}</span>
				{/if}
				{#if entry.revision}
					<span class="event-rev">{entry.revision}</span>
				{/if}
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
							class:event-line-internt={entry.internt}
							role="option"
							aria-selected={focusedIndex === j + VISIBLE_COUNT}
							onclick={(e: MouseEvent) => handleEventClick(j + VISIBLE_COUNT, e)}
						>
							<span class="event-icon" style="color: {entry.icon.color}" aria-hidden="true"
								>{entry.icon.symbol}</span
							>
							<span class="event-date">{entry.dateLabel}</span>
							{#if entry.internt}
								<span class="event-text internt-label"><span class="kun-internt">KUN INTERNT:</span> {entry.label}</span>
							{:else}
								<span class="event-text">{entry.label}</span>
							{/if}
							{#if entry.actorSuffix && !entry.internt}
								<span class="event-actor">{entry.actorSuffix}</span>
							{/if}
							{#if entry.revision}
								<span class="event-rev">{entry.revision}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
		<button
			class="btn-tilfoj-notat"
			type="button"
			onclick={(e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); }}
		>
			+ Nytt internt notat
		</button>
	</div>
{/if}

<style>
	.toggle-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 8px;
		margin-top: 4px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		user-select: none;
	}

	.toggle-bar:hover {
		background: var(--color-felt-hover);
	}

	.toggle-bar-expanded {
		margin-bottom: 4px;
	}

	.toggle-label {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
		letter-spacing: 0.01em;
	}

	.toggle-chevron {
		font-size: 8px;
		color: var(--color-ink-ghost);
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--color-wire);
	}

	.remaining-events {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.event-line {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
		border-left: 2px solid transparent;
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		transition: background 150ms ease;
	}

	.event-line:hover {
		background: var(--color-felt-hover);
	}

	.event-line-focused {
		border-left-color: var(--color-vekt);
		background: var(--color-felt-hover);
	}

	.event-icon {
		width: 12px;
		flex-shrink: 0;
		font-size: 10px;
		text-align: center;
		line-height: 1;
	}

	.event-date {
		min-width: 40px;
		flex-shrink: 0;
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
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
		font-family: var(--font-data);
		font-size: 9px;
		color: var(--color-ink-ghost);
		flex-shrink: 0;
		margin-left: auto;
	}

	/* Gul Lapp — internal note styling */
	.event-line-internt {
		background: var(--color-vekt-bg);
		border-left: 2px dashed var(--color-vekt);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		margin: 2px 0;
	}

	.event-line-internt:hover {
		background: var(--color-vekt-bg-strong);
	}

	.kun-internt {
		color: var(--color-vekt);
		font-weight: 600;
		font-size: 10px;
		letter-spacing: 0.02em;
	}

	.internt-label {
		color: var(--color-ink-secondary);
	}

	.event-actor {
		flex-shrink: 0;
		font-size: 10px;
		color: var(--color-ink-ghost);
		white-space: nowrap;
	}

	.btn-tilfoj-notat {
		width: 100%;
		text-align: left;
		padding: 8px 8px;
		margin-top: 4px;
		font-size: 11px;
		color: var(--color-ink-ghost);
		background: transparent;
		border: none;
		border-top: 1px dashed var(--color-wire);
		cursor: pointer;
		transition: color 150ms ease;
		font-family: var(--font-ui);
	}

	.btn-tilfoj-notat:hover {
		color: var(--color-vekt);
	}
</style>
