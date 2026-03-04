<script lang="ts">
	import type { SakState } from '$lib/types/timeline';
	import { beregnVarslingStatus } from '$lib/utils/varslingStatus';
	import FristerSection from './FristerSection.svelte';
	import VarslingSection from './VarslingSection.svelte';

	interface Props {
		state: SakState;
	}

	let { state }: Props = $props();

	const varslingItems = $derived(beregnVarslingStatus(state));
</script>

<aside class="sidebar" aria-label="Saksinformasjon">
	<!-- Saksidentitet -->
	<div class="section section-identity">
		<span class="sak-id">{state.sak_id}</span>
		<h2 class="sak-tittel">{state.sakstittel}</h2>
		{#if state.prosjekt_navn}
			<span class="prosjekt-navn">{state.prosjekt_navn}</span>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- Parter -->
	<div class="section section-parties">
		{#if state.entreprenor}
			<div class="party">
				<span class="party-role">TE</span>
				<span class="party-name">{state.entreprenor}</span>
			</div>
		{/if}
		{#if state.byggherre}
			<div class="party">
				<span class="party-role">BH</span>
				<span class="party-name">{state.byggherre}</span>
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- Frister -->
	<FristerSection {state} />

	<div class="divider"></div>

	<!-- Varsling -->
	<VarslingSection items={varslingItems} />
</aside>

<style>
	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		width: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		border-right: 1px solid var(--color-wire);
		background: var(--color-felt);
		display: flex;
		flex-direction: column;
	}

	.section {
		padding: 16px;
	}

	.section-identity {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.sak-id {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.sak-tittel {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0;
		line-height: 1.4;
	}

	.prosjekt-navn {
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.section-parties {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.party {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
	}

	.party-name {
		color: var(--color-ink);
	}

	.party-role {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
		width: 20px;
		flex-shrink: 0;
	}

	.divider {
		height: 1px;
		background: var(--color-wire);
		margin: 0;
	}

	/* Collapsed icon mode: 1024–1279px */
	@media (max-width: 1279px) and (min-width: 1024px) {
		.sidebar {
			width: 48px;
			align-items: center;
		}

		/* Hide text content, keep only role badges and symbols */
		.sak-id,
		.sak-tittel,
		.prosjekt-navn,
		.party-name {
			display: none;
		}

		.section {
			padding: 8px 0;
			width: 48px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 8px;
		}

		.section-identity {
			align-items: center;
		}

		.section-parties {
			align-items: center;
		}

		.party {
			justify-content: center;
		}

		.party-role {
			font-size: 11px;
			color: var(--color-ink-muted);
		}

		/* Child components: hide section labels and text, keep symbols only */
		:global(.sidebar .section-label) {
			display: none;
		}

		:global(.sidebar .frist-label),
		:global(.sidebar .frist-value) {
			display: none;
		}

		:global(.sidebar .varsling-label) {
			display: none;
		}

		:global(.sidebar .frister-section),
		:global(.sidebar .varsling-section) {
			padding: 8px 0;
			width: 48px;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		:global(.sidebar .frister-list),
		:global(.sidebar .varsling-list) {
			align-items: center;
		}

		:global(.sidebar .frist-item),
		:global(.sidebar .varsling-item) {
			justify-content: center;
		}

		:global(.sidebar .frist-icon),
		:global(.sidebar .varsling-symbol) {
			width: auto;
		}
	}
</style>
