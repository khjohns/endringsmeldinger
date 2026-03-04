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
				<span class="party-name">{state.entreprenor}</span>
				<span class="party-role">(TE)</span>
			</div>
		{/if}
		{#if state.byggherre}
			<div class="party">
				<span class="party-name">{state.byggherre}</span>
				<span class="party-role">(BH)</span>
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
		font-size: 14px;
		font-weight: 500;
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
		color: var(--color-ink-muted);
		font-size: 12px;
	}

	.divider {
		height: 1px;
		background: var(--color-wire);
		margin: 0;
	}
</style>
