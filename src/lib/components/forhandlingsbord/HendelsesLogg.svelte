<script lang="ts">
	import type { TimelineEvent, EventType, SporType } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';
	import { slide } from 'svelte/transition';

	interface Props {
		events: TimelineEvent[];
		sporType: SporType;
		expanded: boolean;
		onToggle: () => void;
	}

	let { events, sporType, expanded, onToggle }: Props = $props();

	const EVENT_TYPE_LABELS: Record<string, string> = {
		sak_opprettet: 'opprettet',
		grunnlag_opprettet: 'varslet',
		grunnlag_oppdatert: 'oppdatert',
		grunnlag_trukket: 'trukket',
		vederlag_krav_sendt: 'sendte krav',
		vederlag_krav_oppdatert: 'oppdaterte krav',
		vederlag_krav_trukket: 'trukket',
		frist_krav_sendt: 'sendte krav',
		frist_krav_oppdatert: 'oppdaterte krav',
		frist_krav_spesifisert: 'spesifiserte',
		frist_krav_trukket: 'trukket',
		respons_grunnlag: 'responderte',
		respons_grunnlag_oppdatert: 'oppdaterte svar',
		respons_vederlag: 'responderte',
		respons_vederlag_oppdatert: 'oppdaterte svar',
		respons_frist: 'responderte',
		respons_frist_oppdatert: 'oppdaterte svar',
		forsering_varsel: 'varslet forsering',
		forsering_stoppet: 'stoppet forsering',
		forsering_respons: 'responderte forsering',
		te_aksepterer_respons: 'aksepterte',
	};

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
		if (!eventType) return 'hendelse';
		return EVENT_TYPE_LABELS[eventType] ?? 'hendelse';
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

	// All events sorted newest first
	const allEvents = $derived.by(() => {
		return [...events]
			.filter((e) => e.time)
			.sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime());
	});

	const showToggle = $derived(allEvents.length > 3);

	const eventEntries = $derived(
		allEvents.map((e) => {
			const eventType = extractEventType(e.type);
			const icon = getEventIcon(eventType);
			const label = getEventLabel(e, eventType);
			const dateLabel = formatDateShort(e.time);
			const role = e.actorrole ?? '';
			const revision = getRevision(e);
			return { icon, dateLabel, label, role, revision };
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
		aria-label="{allEvents.length} hendelser"
		onclick={handleToggleClick}
		onkeydown={handleToggleKeydown}
	>
		<span class="toggle-label">{allEvents.length} hendelser</span>
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
			{#each eventEntries as entry, i (i)}
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
		padding: 6px 12px;
		margin: 8px -12px -8px;
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
		font-size: 10px;
		color: var(--color-ink-muted);
		transition: transform 150ms ease;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 12px 8px;
		margin: 0 -12px -8px;
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
		font-size: 12px;
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
		font-size: 10px;
		color: var(--color-ink-muted);
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
