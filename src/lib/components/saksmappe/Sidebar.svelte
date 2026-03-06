<script lang="ts">
	import type { SakState } from '$lib/types/timeline';
	import FristerSection from './FristerSection.svelte';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		state: SakState;
	}

	let { state }: Props = $props();

	// Build status summary text
	const statusSummary = $derived.by(() => {
		const parts: string[] = [];
		const g = state.grunnlag;
		const v = state.vederlag;
		const f = state.frist;

		if (g.status === 'godkjent') parts.push('Grunnlag er akseptert.');
		else if (g.status === 'avslatt') parts.push('Grunnlag er avslatt.');
		else if (g.status === 'sendt') parts.push('Grunnlag sendt, venter pa svar.');

		if (v.status === 'under_forhandling' || v.status === 'delvis_godkjent')
			parts.push('Pagaende tvist om vederlag.');
		else if (v.status === 'godkjent') parts.push('Vederlag godkjent.');
		else if (v.status === 'avslatt') parts.push('Vederlag avslatt.');
		else if (v.status === 'sendt') parts.push('Vederlag sendt.');

		if (f.status === 'sendt' || f.status === 'under_behandling')
			parts.push('Frist avventer vurdering.');
		else if (f.status === 'godkjent') parts.push('Frist godkjent.');

		if (parts.length === 0) parts.push(state.neste_handling.handling);
		return parts.join(' ');
	});

	// Financial summary
	const krevdVederlag = $derived(state.vederlag.krevd_belop ?? state.vederlag.netto_belop ?? 0);
	const godkjentVederlag = $derived(state.vederlag.godkjent_belop ?? 0);
	const omtvistet = $derived(Math.max(0, krevdVederlag - godkjentVederlag));
	const krevdDager = $derived(state.frist.krevd_dager ?? 0);

	// Tidsrisiko calculations
	const dagmulktsats = $derived(state.dagmulktsats ?? 0);
	const dagmulktEksponering = $derived(krevdDager * dagmulktsats);
	const maksForsering = $derived(Math.round(dagmulktEksponering * 1.3));
</script>

<aside class="sidebar" aria-label="Saksinformasjon">
	<!-- Saksidentitet -->
	<div class="sidebar-section">
		<span class="sys-id">{state.sak_id}</span>
		<h2 class="sak-tittel">{state.sakstittel}</h2>
		{#if state.prosjekt_navn}
			<span class="sak-undertittel">{state.prosjekt_navn}</span>
		{/if}

		<div class="samlet-status-boks">
			<div class="status-header">Gjeldende status</div>
			<div class="status-verdi">{statusSummary}</div>
		</div>
	</div>

	<!-- Parter -->
	<div class="sidebar-section">
		<div class="section-label">Parter</div>
		{#if state.byggherre}
			<div class="party-row">
				<span class="party-label">BH</span>
				<span class="party-name">{state.byggherre}</span>
			</div>
		{/if}
		{#if state.entreprenor}
			<div class="party-row">
				<span class="party-label">TE</span>
				<span class="party-name">{state.entreprenor}</span>
			</div>
		{/if}
	</div>

	<!-- Frister -->
	<div class="sidebar-section">
		<FristerSection {state} />
	</div>

	<!-- Dokumentasjon -->
	<div class="sidebar-section">
		<div class="section-label">Dokumentasjon</div>
		<button class="btn-vedlegg" type="button">
			<span>Alle vedlegg</span>
			<span class="vedlegg-badge">0</span>
		</button>
	</div>

	<!-- Nokkeltall -->
	{#if krevdVederlag > 0 || krevdDager > 0}
		<div class="sidebar-section sidebar-section-last">
			<div class="section-label">Nøkkeltall (NOK)</div>

			{#if krevdVederlag > 0}
				<div class="finans-rad">
					<span class="finans-label">Krevd vederlag</span>
					<span class="finans-verdi krav">{formatCurrency(krevdVederlag)}</span>
				</div>
				{#if godkjentVederlag > 0}
					<div class="finans-rad">
						<span class="finans-label"><span class="finans-symbol godkjent" aria-hidden="true">✓</span> Godkjent</span>
						<span class="finans-verdi godkjent">{formatCurrency(godkjentVederlag)}</span>
					</div>
				{/if}
				{#if omtvistet > 0}
					<div class="finans-rad">
						<span class="finans-label">Omtvistet</span>
						<span class="finans-verdi omtvistet">{formatCurrency(omtvistet)}</span>
					</div>
				{/if}
			{/if}

			{#if krevdDager > 0}
				<div class="finans-divider"></div>
				<div class="finans-undergruppe">Tidsrisiko ({krevdDager} dager)</div>
				{#if dagmulktEksponering > 0}
					<div class="finans-rad finans-rad-sub">
						<span class="finans-label">Dagmulkteksponering</span>
						<span class="finans-verdi omtvistet">- {formatCurrency(dagmulktEksponering)}</span>
					</div>
					<div class="finans-rad finans-rad-sub">
						<span class="finans-label">Maks. forseringskostnad</span>
						<span class="finans-verdi krav">{formatCurrency(maksForsering)}</span>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</aside>

<style>
	.sidebar {
		position: sticky;
		top: 0;
		height: 100%;
		width: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		border-right: 1px solid var(--color-wire-strong);
		background: var(--color-canvas);
		display: flex;
		flex-direction: column;
	}

	.sidebar-section {
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-wire);
	}

	.sidebar-section-last {
		border-bottom: none;
	}

	.sys-id {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
		margin-bottom: 4px;
		display: block;
	}

	.sak-tittel {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0 0 2px 0;
		line-height: 1.4;
	}

	.sak-undertittel {
		font-size: 13px;
		color: var(--color-ink-secondary);
	}

	.samlet-status-boks {
		background: var(--color-felt);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		padding: 12px;
		margin-top: 16px;
	}

	.status-header {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-secondary);
		margin-bottom: 4px;
	}

	.status-verdi {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink);
		line-height: 1.4;
	}

	.section-label {
		margin-bottom: 12px;
	}

	.party-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
	}

	.party-label {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
	}

	.party-name {
		font-weight: 500;
		font-size: 13px;
	}

	.btn-vedlegg {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		background: var(--color-felt);
		color: var(--color-ink-secondary);
		border: 1px solid var(--color-wire);
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 12px;
		transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
	}

	.btn-vedlegg:hover {
		background: var(--color-felt-hover);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
	}

	.vedlegg-badge {
		font-family: var(--font-data);
		color: var(--color-ink-muted);
	}

	/* Nokkeltall */
	.finans-rad {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
		font-size: 12px;
	}

	.finans-label {
		color: var(--color-ink-secondary);
	}

	.finans-verdi {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}

	.finans-verdi.krav {
		color: var(--color-ink);
	}

	.finans-verdi.godkjent {
		color: var(--color-score-high);
	}

	.finans-verdi.omtvistet {
		color: var(--color-vekt);
		font-weight: 600;
	}

	.finans-symbol {
		font-size: 10px;
	}

	.finans-symbol.godkjent {
		color: var(--color-score-high);
	}

	.finans-rad-sub {
		font-size: 11px;
	}

	.finans-rad-sub .finans-label {
		color: var(--color-ink-muted);
	}

	.finans-divider {
		height: 1px;
		background: var(--color-wire);
		margin: 12px 0 16px 0;
	}

	.finans-undergruppe {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-ghost);
		margin-bottom: 8px;
	}

	@media (max-width: 1023px) {
		.sidebar {
			width: 100%;
		}

		.sidebar-section {
			padding: 12px 16px;
		}
	}
</style>
