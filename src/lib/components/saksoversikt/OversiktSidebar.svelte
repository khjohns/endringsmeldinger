<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { SaksoversiktItem, SporHendelseType, SaksoversiktVisning } from '$lib/mocks/saksoversikt';
	import { formatCurrencyCompact } from '$lib/utils/formatters';
	import { AKTIVE_OVERORDNET_STATUSER } from '$lib/constants/statusLabels';
	import { page } from '$app/state';

	interface Props {
		saker: SaksoversiktItem[];
		prosjektNavn: string;
		entreprise: string;
		visning: SaksoversiktVisning;
		onvisning: (v: SaksoversiktVisning) => void;
		aktivtSpor: SporHendelseType | null;
		onspor: (spor: SporHendelseType | null) => void;
	}

	let { saker, prosjektNavn, entreprise, visning, onvisning, aktivtSpor, onspor }: Props = $props();

	const prosjektId = $derived(page.params.prosjektId);

	// Single-pass aggregation over all saker + hendelser
	const stats = $derived.by(() => {
		let totalKrevd = 0, totalGodkjent = 0, totalDagerKrevd = 0, totalDagerGodkjent = 0;
		let aktiveSaker = 0;
		let sporK = 0, sporV = 0, sporF = 0;
		let ubesvartK = 0, ubesvartV = 0, ubesvartF = 0;

		for (const sak of saker) {
			totalKrevd += sak.cached_sum_krevd ?? 0;
			totalGodkjent += sak.cached_sum_godkjent ?? 0;
			totalDagerKrevd += sak.cached_dager_krevd ?? 0;
			totalDagerGodkjent += sak.cached_dager_godkjent ?? 0;
			if (sak.cached_status && AKTIVE_OVERORDNET_STATUSER.includes(sak.cached_status as any)) aktiveSaker++;

			for (const h of sak.hendelser) {
				if (h.type === 'K') sporK++;
				else if (h.type === 'V') sporV++;
				else sporF++;

				if (!h.besvart) {
					if (h.type === 'K') ubesvartK++;
					else if (h.type === 'V') ubesvartV++;
					else ubesvartF++;
				}
			}
		}

		return {
			totalKrevd, totalGodkjent,
			totalOmtvistet: Math.max(0, totalKrevd - totalGodkjent),
			totalDagerKrevd, totalDagerGodkjent,
			aktiveSaker,
			sporTelling: { K: sporK, V: sporV, F: sporF },
			ubesvartTelling: { K: ubesvartK, V: ubesvartV, F: ubesvartF },
		};
	});

	const SPOR_CONFIG: { key: SporHendelseType; label: string }[] = [
		{ key: 'K', label: 'Kontrakt' },
		{ key: 'V', label: 'Vederlag' },
		{ key: 'F', label: 'Frist' },
	];

	function toggleSpor(spor: SporHendelseType) {
		onspor(aktivtSpor === spor ? null : spor);
	}
</script>

<aside class="sidebar" aria-label="Prosjektoversikt">
	<!-- Prosjektidentitet -->
	<div class="sidebar-section">
		<h2 class="prosjekt-navn">{prosjektNavn}</h2>
		<span class="prosjekt-entreprise">{entreprise}</span>
		<div class="sak-telling">
			<span class="telling-verdi">{saker.length}</span>
			<span class="telling-label">saker</span>
			<span class="telling-sep">&middot;</span>
			<span class="telling-aktiv">{stats.aktiveSaker} aktive</span>
		</div>
		<a class="ny-sak-btn" href="/{prosjektId}/ny">
			<Plus size={14} strokeWidth={1.5} aria-hidden="true" />
			Ny sak
		</a>
	</div>

	<!-- Visning -->
	<div class="sidebar-section">
		<div class="section-label">Visning</div>
		<div class="visning-toggle">
			<button
				class="visning-btn"
				class:visning-aktiv={visning === 'tidslinje'}
				onclick={() => onvisning('tidslinje')}
				type="button"
			>Tidslinje</button>
			<button
				class="visning-btn"
				class:visning-aktiv={visning === 'tabell'}
				onclick={() => onvisning('tabell')}
				type="button"
			>Tabell</button>
		</div>
	</div>

	<!-- Spor-fokus -->
	<div class="sidebar-section">
		<div class="section-label">Spor</div>
		<div class="spor-knapper">
			{#each SPOR_CONFIG as { key, label } (key)}
				<button
					class="spor-btn spor-{key.toLowerCase()}"
					class:spor-aktiv={aktivtSpor === key}
					onclick={() => toggleSpor(key)}
					type="button"
				>
					<span class="spor-ikon spor-ikon-{key.toLowerCase()}">{key}</span>
					<span class="spor-tekst">{label}</span>
					<span class="spor-tall">{stats.sporTelling[key]}</span>
					{#if stats.ubesvartTelling[key] > 0}
						<span class="spor-ubesvart">{stats.ubesvartTelling[key]}</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Nøkkeltall -->
	<div class="sidebar-section sidebar-section-last">
		<div class="section-label">Nøkkeltall (NOK)</div>
		<div class="finans-rad">
			<span class="finans-label">Krevd</span>
			<span class="finans-verdi krav">{formatCurrencyCompact(stats.totalKrevd)}</span>
		</div>
		{#if stats.totalGodkjent > 0}
			<div class="finans-rad">
				<span class="finans-label">Godkjent</span>
				<span class="finans-verdi godkjent">{formatCurrencyCompact(stats.totalGodkjent)}</span>
			</div>
		{/if}
		{#if stats.totalOmtvistet > 0}
			<div class="finans-rad">
				<span class="finans-label">Omtvistet</span>
				<span class="finans-verdi omtvistet">{formatCurrencyCompact(stats.totalOmtvistet)}</span>
			</div>
		{/if}
		{#if stats.totalDagerKrevd > 0}
			<div class="finans-divider"></div>
			<div class="finans-rad">
				<span class="finans-label">Dager krevd</span>
				<span class="finans-verdi krav">{stats.totalDagerKrevd}d</span>
			</div>
			{#if stats.totalDagerGodkjent > 0}
				<div class="finans-rad">
					<span class="finans-label">Dager godkjent</span>
					<span class="finans-verdi godkjent">{stats.totalDagerGodkjent}d</span>
				</div>
			{/if}
		{/if}
	</div>

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
		flex-shrink: 0;
	}

	.sidebar-section {
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-wire);
	}

	.sidebar-section-last {
		border-bottom: none;
	}

	.prosjekt-navn {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0 0 2px 0;
		line-height: 1.4;
	}

	.prosjekt-entreprise {
		font-size: 13px;
		color: var(--color-ink-secondary);
		display: block;
	}

	.sak-telling {
		margin-top: 12px;
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.telling-verdi {
		font-family: var(--font-data);
		font-size: 20px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		line-height: 1;
	}

	.telling-label {
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.telling-sep {
		color: var(--color-ink-ghost);
		font-size: 12px;
	}

	.telling-aktiv {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-secondary);
		font-weight: 500;
	}

	.ny-sak-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-2);
		margin-top: 12px;
		padding: 6px 12px;
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
		border: 1px solid rgba(245, 158, 11, 0.20);
		border-radius: var(--radius-sm);
		text-decoration: none;
		transition: background-color 0.12s, border-color 0.12s;
		cursor: pointer;
	}

	.ny-sak-btn:hover {
		background: var(--color-vekt-bg-strong);
		border-color: rgba(245, 158, 11, 0.30);
	}

	.section-label {
		margin-bottom: 12px;
	}

	/* Visning toggle */
	.visning-toggle {
		display: flex;
		gap: 1px;
		background: var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.visning-btn {
		flex: 1;
		padding: 8px 12px;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		border: none;
		cursor: pointer;
		background: var(--color-felt);
		color: var(--color-ink-muted);
		transition: background 150ms, color 150ms;
	}

	.visning-btn:hover {
		background: var(--color-felt-hover);
		color: var(--color-ink-secondary);
	}

	.visning-aktiv {
		background: var(--color-felt-active);
		color: var(--color-ink);
		font-weight: 600;
	}

	/* Spor-fokus knapper */
	.spor-knapper {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.spor-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-ink-secondary);
		transition: background 150ms, border-color 150ms, color 150ms;
		width: 100%;
		text-align: left;
	}

	.spor-btn:hover {
		background: var(--color-felt);
		border-color: var(--color-wire);
	}

	.spor-aktiv {
		background: var(--color-felt);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
	}

	.spor-ikon {
		width: 16px;
		height: 16px;
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 8px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.spor-ikon-k {
		border: 1px solid var(--color-ink-ghost);
		color: var(--color-ink-muted);
	}

	.spor-ikon-v {
		border: 1px solid var(--color-vekt);
		color: var(--color-vekt);
	}

	.spor-ikon-f {
		border: 1px solid var(--color-score-low);
		color: var(--color-score-low);
	}

	.spor-aktiv .spor-ikon-k {
		background: var(--color-ink-ghost);
		color: var(--color-canvas);
	}

	.spor-aktiv .spor-ikon-v {
		background: var(--color-vekt);
		color: var(--color-canvas);
	}

	.spor-aktiv .spor-ikon-f {
		background: var(--color-score-low);
		color: var(--color-canvas);
	}

	.spor-tekst {
		flex: 1;
	}

	.spor-tall {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-muted);
	}

	.spor-ubesvart {
		font-family: var(--font-data);
		font-size: 9px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-canvas);
		background: var(--color-vekt);
		border-radius: 1px;
		padding: 1px 4px;
		line-height: 1.2;
	}

	/* Nøkkeltall */
	.finans-rad {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
		font-size: 13px;
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

	.finans-divider {
		height: 1px;
		background: var(--color-wire);
		margin: 12px 0 16px 0;
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
