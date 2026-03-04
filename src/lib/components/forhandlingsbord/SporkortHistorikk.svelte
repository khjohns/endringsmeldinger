<script lang="ts">
	import type { TimelineEvent, EventType } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';

	interface Props {
		events: TimelineEvent[];
	}

	let { events }: Props = $props();

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

	function getEventTypeLabel(eventType: EventType | null): string {
		if (!eventType) return 'hendelse';
		return EVENT_TYPE_LABELS[eventType] ?? 'hendelse';
	}

	function formatRelativeDate(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'i dag';
		if (diffDays === 1) return 'i gar';

		// Short date: DD.MM
		const day = date.getDate().toString().padStart(2, '0');
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		return `${day}.${month}`;
	}

	// Last 3 events, sorted newest first
	const recentEvents = $derived.by(() => {
		return [...events]
			.filter((e) => e.time)
			.sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
			.slice(0, 3);
	});

	const entries = $derived(
		recentEvents.map((e) => {
			const eventType = extractEventType(e.type);
			const role = e.actorrole ?? '';
			const label = getEventTypeLabel(eventType);
			const dateLabel = formatRelativeDate(e.time);
			return { dateLabel, role, label };
		})
	);
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
