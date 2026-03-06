<script lang="ts">
	import type { SporType, SakState, TimelineEvent, EventType } from '$lib/types/timeline';
	import { extractEventType } from '$lib/types/timeline';
	import { getEventTypeLabel } from '$lib/constants/eventLabels';
	import { beregnVarslingStatus } from '$lib/utils/varslingStatus';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import SporkortHeader from './SporkortHeader.svelte';
	import SporkortData from './SporkortData.svelte';
	import SporkortHistorikk from './SporkortHistorikk.svelte';

	interface Props {
		sporType: SporType;
		state: SakState;
		events: TimelineEvent[];
		prosjektId: string;
		sakId: string;
		onFocusEvent?: (event: TimelineEvent | null) => void;
	}

	let { sporType, state: sakState, events, prosjektId, sakId, onFocusEvent }: Props = $props();

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

	// User role — reactive via storage event from ActionBanner toggle
	let userRole = $state<'TE' | 'BH' | null>(
		browser ? (localStorage.getItem('koe-user-role') as 'TE' | 'BH' | null) : null
	);

	onMount(() => {
		function onStorage(e: StorageEvent) {
			if (e.key === 'koe-user-role') userRole = e.newValue as 'TE' | 'BH' | null;
		}
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});

	// TE send label depends on track type
	const teSendLabel = $derived(sporType === 'grunnlag' ? 'Varsle' : 'Send krav');

	// Visual state computation
	type BorderVariant = 'critical' | 'godkjent' | 'avslatt' | 'handling' | 'venter' | 'bortfalt' | 'default';

	interface CardVisualState {
		bgClass: string;
		borderClass: string;
		borderVariant: BorderVariant;
		action: { label: string; urgent: boolean } | null;
	}

	// Role-aware action: TE sends krav/varsel, BH responds
	function roleAction(teAction: { label: string; urgent: boolean } | null, bhAction: { label: string; urgent: boolean } | null): { label: string; urgent: boolean } | null {
		if (userRole === 'TE') return teAction;
		if (userRole === 'BH') return bhAction;
		return null; // no role set → no action buttons
	}

	const visualState = $derived.by<CardVisualState>(() => {
		const status = trackState.status;

		// Passivitet overrides everything for grunnlag — BH must respond
		if (hasPassivitet) {
			return {
				bgClass: 'bg-critical',
				borderClass: 'border-critical',
				borderVariant: 'critical' as BorderVariant,
				action: roleAction(null, { label: 'Svar nå', urgent: true }),
			};
		}

		// Godkjent / låst — no actions
		if (status === 'godkjent' || status === 'laast') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-godkjent',
				borderVariant: 'godkjent' as BorderVariant,
				action: null,
			};
		}

		// Avslått — TE can consider forsering
		if (status === 'avslatt') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-avslatt',
				borderVariant: 'avslatt' as BorderVariant,
				action: roleAction({ label: 'Forsering?', urgent: false }, null),
			};
		}

		// Delvis godkjent / under forhandling — BH responds, TE can update
		if (status === 'delvis_godkjent' || status === 'under_forhandling') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-handling',
				borderVariant: 'handling' as BorderVariant,
				action: roleAction({ label: 'Oppdater', urgent: false }, { label: 'Svar', urgent: false }),
			};
		}

		// Sendt / under_behandling — BH should respond
		if (status === 'sendt' || status === 'under_behandling') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-venter',
				borderVariant: 'venter' as BorderVariant,
				action: roleAction(null, { label: 'Svar', urgent: false }),
			};
		}

		// Trukket — bortfalt
		if (status === 'trukket') {
			return {
				bgClass: 'bg-default',
				borderClass: 'border-bortfalt',
				borderVariant: 'bortfalt' as BorderVariant,
				action: null,
			};
		}

		// Default (utkast, ikke_relevant) — TE can send
		return {
			bgClass: 'bg-default',
			borderClass: 'border-venter',
			borderVariant: 'default' as BorderVariant,
			action: roleAction({ label: teSendLabel, urgent: false }, null),
		};
	});

	// --- Hendelse-kontekst: siste hendelse for dette sporet ---

	function getEventIcon(eventType: EventType | null): { symbol: string; color: string } {
		if (!eventType) return { symbol: '·', color: 'var(--color-ink-muted)' };
		if (eventType.includes('sendt')) return { symbol: '\u2192', color: 'var(--color-ink-muted)' };
		if (eventType.includes('opprettet') && !eventType.includes('oppdatert'))
			return { symbol: '\u2691', color: 'var(--color-ink-muted)' };
		if (eventType.includes('oppdatert') || eventType.includes('spesifisert'))
			return { symbol: '\u21BB', color: 'var(--color-vekt-dim)' };
		if (eventType.startsWith('respons_') && !eventType.includes('oppdatert'))
			return { symbol: '\u25C7', color: 'var(--color-score-high)' };
		if (eventType.includes('aksept')) return { symbol: '\u2713', color: 'var(--color-score-high)' };
		if (eventType.includes('trukket') || eventType.includes('avslatt'))
			return { symbol: '\u2715', color: 'var(--color-score-low)' };
		return { symbol: '·', color: 'var(--color-ink-muted)' };
	}

	const latestEvent = $derived(events.length > 0 ? events[0] : null);

	const hendelseKontekst = $derived.by(() => {
		if (!latestEvent) return null;
		const eventType = extractEventType(latestEvent.type);
		const icon = getEventIcon(eventType);
		const label = latestEvent.summary ?? getEventTypeLabel(eventType);
		const actor = latestEvent.actorrole === 'BH' ? 'Byggherre' : latestEvent.actorrole === 'TE' ? 'Entreprenør' : null;

		// Revisjon: antall_versjoner > 1 betyr Rev. N (N = antall_versjoner - 1)
		const versjoner = trackState.antall_versjoner;
		const revision = versjoner > 1 ? `Rev. ${versjoner - 1}` : null;

		// Ekstra kontekst fra BH-respons
		let detalj: string | null = null;
		if (sporType === 'vederlag' && sakState.vederlag.godkjent_belop !== undefined && sakState.vederlag.godkjent_belop !== null) {
			const godkjent = sakState.vederlag.godkjent_belop;
			const krevd = sakState.vederlag.krevd_belop ?? sakState.vederlag.netto_belop;
			if (krevd !== undefined && krevd !== null && godkjent !== krevd) {
				detalj = `Godkjent ${Math.round(godkjent / 1000)}k av ${Math.round(krevd / 1000)}k`;
			}
		}
		if (sporType === 'frist' && sakState.frist.godkjent_dager !== undefined && sakState.frist.godkjent_dager !== null) {
			const godkjent = sakState.frist.godkjent_dager;
			const krevd = sakState.frist.krevd_dager;
			if (krevd !== undefined && krevd !== null) {
				detalj = `Godkjent ${godkjent} av ${krevd} dager`;
			}
		}

		return { icon, label, actor, revision, detalj };
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
		avslatt: 'Avslått',
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

<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
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

	{#if hendelseKontekst}
		<div class="hendelse-kontekst">
			<span class="hendelse-ikon" style="color: {hendelseKontekst.icon.color}" aria-hidden="true">{hendelseKontekst.icon.symbol}</span>
			<span class="hendelse-tekst">
				{hendelseKontekst.label}
				{#if hendelseKontekst.actor}
					<span class="hendelse-aktor">av {hendelseKontekst.actor}</span>
				{/if}
			</span>
			{#if hendelseKontekst.revision}
				<span class="hendelse-separator" aria-hidden="true">&middot;</span>
				<span class="hendelse-rev">{hendelseKontekst.revision}</span>
			{/if}
			{#if hendelseKontekst.detalj}
				<span class="hendelse-separator" aria-hidden="true">&middot;</span>
				<span class="hendelse-detalj">{hendelseKontekst.detalj}</span>
			{/if}
		</div>
	{/if}

	<SporkortData
		{sporType}
		grunnlag={sporType === 'grunnlag' ? sakState.grunnlag : undefined}
		vederlag={sporType === 'vederlag' ? sakState.vederlag : undefined}
		frist={sporType === 'frist' ? sakState.frist : undefined}
	/>

	<SporkortHistorikk {events} expanded={loggExpanded} onToggle={handleLoggToggle} {onFocusEvent} />

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
		gap: 8px;
		background: var(--color-felt);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		padding: 16px;
		text-decoration: none;
		cursor: pointer;
		transition: background 150ms ease, border-color 150ms ease;
		position: relative;
	}

	.sporkort:hover {
		background: var(--color-felt-hover);
		border-color: var(--color-wire-focus);
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

	/* Left border variants (Handlingskant / Vektlinjen) */
	.border-critical {
		border-left: 2px solid var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.border-critical:hover {
		background: rgba(225, 29, 72, 0.12);
	}

	.border-godkjent {
		border-left: 1px solid var(--color-score-high);
		opacity: 0.7;
	}

	.border-godkjent:hover {
		opacity: 1;
	}

	.border-avslatt {
		border-left: 2px solid var(--color-score-low);
	}

	.border-handling {
		border-left: 2px solid var(--color-vekt);
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
		margin-top: 4px;
	}

	/* Hendelse-kontekstlinje */
	.hendelse-kontekst {
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-ink-secondary);
		margin-top: -2px;
	}

	.hendelse-ikon {
		flex-shrink: 0;
		font-size: 11px;
		line-height: 1;
	}

	.hendelse-tekst {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.hendelse-aktor {
		color: var(--color-ink-muted);
	}

	.hendelse-separator {
		color: var(--color-ink-ghost);
		flex-shrink: 0;
	}

	.hendelse-rev {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		color: var(--color-ink-muted);
		flex-shrink: 0;
	}

	.hendelse-detalj {
		font-size: 11px;
		color: var(--color-ink-muted);
		white-space: nowrap;
		flex-shrink: 0;
	}

	@media (max-width: 1023px) {
		.sporkort {
			padding: 12px;
			border-radius: 0;
			overflow: hidden;
		}

		.hendelse-kontekst {
			font-size: 11px;
			gap: 4px;
		}

		.hendelse-detalj {
			display: none;
		}
	}
</style>
