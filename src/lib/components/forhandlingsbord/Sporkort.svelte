<script lang="ts">
	import type { SporType, SakState, TimelineEvent } from '$lib/types/timeline';
	import { beregnVarslingStatus } from '$lib/utils/varslingStatus';
	import SporkortHeader from './SporkortHeader.svelte';
	import SporkortData from './SporkortData.svelte';
	import SporkortHistorikk from './SporkortHistorikk.svelte';

	interface Props {
		sporType: SporType;
		state: SakState;
		events: TimelineEvent[];
		prosjektId: string;
		sakId: string;
	}

	let { sporType, state: sakState, events, prosjektId, sakId }: Props = $props();

	// Expanded state for hendelseslogg — lives here so card can shift visually
	let loggExpanded = $state(false);

	function handleLoggToggle() {
		loggExpanded = !loggExpanded;
	}

	// Get the track state for this spor type
	const trackState = $derived(sakState[sporType]);

	// Compute varsling items for all tracks (header will filter per track)
	const varsling = $derived(beregnVarslingStatus(sakState));

	// Compute days since last event for passivitet check
	const daysSinceLastEvent = $derived.by(() => {
		if (!trackState.siste_oppdatert) return 0;
		const lastDate = new Date(trackState.siste_oppdatert);
		const now = new Date();
		return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
	});

	// Passivitet: grunnlag sent > 14 days without response
	const hasPassivitet = $derived(
		sporType === 'grunnlag' &&
			sakState.grunnlag.status === 'sendt' &&
			daysSinceLastEvent > 14
	);

	// Visual state computation
	type BorderVariant = 'critical' | 'godkjent' | 'avslatt' | 'handling' | 'venter' | 'bortfalt' | 'default';

	interface CardVisualState {
		bgClass: string;
		borderClass: string;
		borderVariant: BorderVariant;
		action: { label: string; urgent: boolean } | null;
	}

	const visualState = $derived.by<CardVisualState>(() => {
		const status = trackState.status;

		// Passivitet overrides everything for grunnlag
		if (hasPassivitet) {
			return {
				bgClass: 'bg-critical',
				borderClass: 'border-critical',
				borderVariant: 'critical' as BorderVariant,
				action: { label: 'Svar nå', urgent: true },
			};
		}

		// Godkjent
		if (status === 'godkjent' || status === 'laast') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-godkjent',
				borderVariant: 'godkjent' as BorderVariant,
				action: null,
			};
		}

		// Avslatt
		if (status === 'avslatt') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-avslatt',
				borderVariant: 'avslatt' as BorderVariant,
				action: { label: 'Forsering?', urgent: false },
			};
		}

		// Delvis godkjent / under forhandling
		if (status === 'delvis_godkjent' || status === 'under_forhandling') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-handling',
				borderVariant: 'handling' as BorderVariant,
				action: { label: 'Svar', urgent: false },
			};
		}

		// Sendt / under_behandling — waiting state
		if (status === 'sendt' || status === 'under_behandling') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-venter',
				borderVariant: 'venter' as BorderVariant,
				action: null,
			};
		}

		// Trukket — bortfalt
		if (status === 'trukket') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-bortfalt',
				borderVariant: 'bortfalt' as BorderVariant,
				action: { label: 'Se sak', urgent: false },
			};
		}

		// Default (utkast, ikke_relevant)
		return {
			bgClass: 'bg-default',
			borderClass: 'border-venter',
			borderVariant: 'default' as BorderVariant,
			action: null,
		};
	});

	const href = $derived(`/${prosjektId}/${sakId}/${sporType}`);

	const SPOR_NAMES: Record<SporType, string> = {
		grunnlag: 'Ansvarsgrunnlag',
		vederlag: 'Vederlagskrav',
		frist: 'Fristkrav',
	};

	const STATUS_LABELS: Record<string, string> = {
		ikke_relevant: 'Ikke relevant',
		utkast: 'Utkast',
		sendt: 'Sendt',
		under_behandling: 'Under behandling',
		godkjent: 'Godkjent',
		delvis_godkjent: 'Delvis godkjent',
		avslatt: 'Avslatt',
		under_forhandling: 'Under forhandling',
		trukket: 'Trukket',
		laast: 'Låst',
	};

	const ariaLabel = $derived(
		`${SPOR_NAMES[sporType]} — ${STATUS_LABELS[trackState.status] ?? trackState.status}`
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === ' ') {
			// Toggle hendelseslogg on Space if there are 4+ events
			if (events.length >= 4) {
				e.preventDefault();
				handleLoggToggle();
			}
		}
	}
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<a {href}
	class="sporkort {visualState.bgClass} {visualState.borderClass}"
	class:sporkort-expanded={loggExpanded}
	data-spor={sporType}
	data-status={trackState.status}
	data-border={visualState.borderVariant}
	role="article"
	aria-label={ariaLabel}
	onkeydown={handleKeydown}
>
	<SporkortHeader
		{sporType}
		status={trackState.status}
		{varsling}
		action={visualState.action}
		{prosjektId}
		{sakId}
	/>

	<SporkortData
		{sporType}
		grunnlag={sporType === 'grunnlag' ? sakState.grunnlag : undefined}
		vederlag={sporType === 'vederlag' ? sakState.vederlag : undefined}
		frist={sporType === 'frist' ? sakState.frist : undefined}
	/>

	<SporkortHistorikk {events} {sporType} expanded={loggExpanded} onToggle={handleLoggToggle} />

	{#if hasPassivitet}
		<div class="passivitet-warning" role="alert">
			{daysSinceLastEvent}d uten svar — du kan miste retten til å protestere
		</div>
	{/if}
</a>

<style>
	.sporkort {
		display: flex;
		flex-direction: column;
		gap: 4px;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		padding: 12px 16px;
		text-decoration: none;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.sporkort:hover {
		background: var(--color-felt-hover);
	}

	.sporkort-expanded {
		background: var(--color-felt-raised);
		border-color: var(--color-wire-strong);
	}

	.sporkort:focus-visible {
		outline: 2px solid var(--color-wire-focus);
		outline-offset: -2px;
	}

	.bg-default {
		background: var(--color-felt);
	}

	.bg-critical {
		background: var(--color-score-low-bg);
	}

	/* Left border variants */
	.border-critical {
		border-left: 3px solid var(--color-score-low);
	}

	.border-godkjent {
		border-left: 2px solid var(--color-score-high);
	}

	.border-avslatt {
		border-left: 2px solid var(--color-score-low);
	}

	.border-handling {
		border-left: 3px solid var(--color-vekt);
	}

	.border-venter {
		border-left: 1px solid var(--color-wire-strong);
	}

	.border-bortfalt {
		border-left: 1px dashed var(--color-ink-ghost);
	}

	.passivitet-warning {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-score-low);
		margin-top: 2px;
	}
</style>
