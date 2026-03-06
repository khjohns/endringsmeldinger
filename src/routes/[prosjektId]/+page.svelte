<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { createCaseListQuery } from '$lib/queries/caseList';
	import CaseListTable from '$lib/components/case-list/CaseListTable.svelte';
	import Saksoversikt from '$lib/components/saksoversikt/Saksoversikt.svelte';
	import OversiktSidebar from '$lib/components/saksoversikt/OversiktSidebar.svelte';
	import { mockSaksoversikt } from '$lib/mocks/saksoversikt';
	import type { SporHendelseType } from '$lib/mocks/saksoversikt';

	const prosjektId = $derived(page.params.prosjektId);
	const query = createCaseListQuery();

	// Mock project metadata — will come from API later
	const projectNames: Record<string, { name: string; entreprise: string }> = {
		P001: { name: 'Operatunnelen', entreprise: 'Entreprise NS 8407' },
	};
	const projectMeta = $derived(prosjektId ? projectNames[prosjektId] ?? null : null);

	type Visning = 'tidslinje' | 'tabell';
	const STORAGE_KEY = 'koe-saksoversikt-visning';

	let visning = $state<Visning>(
		browser ? (localStorage.getItem(STORAGE_KEY) as Visning) ?? 'tidslinje' : 'tidslinje'
	);

	let aktivtSpor = $state<SporHendelseType | null>(null);

	function byttVisning(v: Visning) {
		visning = v;
		if (browser) localStorage.setItem(STORAGE_KEY, v);
	}

	function byttSpor(spor: SporHendelseType | null) {
		aktivtSpor = spor;
	}
</script>

<div class="page-layout">
	<OversiktSidebar
		saker={mockSaksoversikt}
		prosjektNavn={projectMeta?.name ?? prosjektId ?? ''}
		entreprise={projectMeta?.entreprise ?? ''}
		{visning}
		onvisning={byttVisning}
		{aktivtSpor}
		onspor={byttSpor}
	/>

	<div class="page-content">
		{#if $query.isLoading}
			<div class="state-message" role="status" aria-live="polite">
				<span class="state-text">Laster saker...</span>
			</div>
		{:else if $query.isError}
			<div class="state-message state-error" role="alert">
				<span class="state-text">
					Kunne ikke laste saker.
					{$query.error instanceof Error ? $query.error.message : 'Ukjent feil.'}
				</span>
			</div>
		{:else if $query.data && $query.data.cases.length === 0}
			<div class="state-message" role="status">
				<span class="state-text">Ingen saker funnet i dette prosjektet.</span>
			</div>
		{:else if $query.data}
			{#if visning === 'tidslinje'}
				<Saksoversikt saker={mockSaksoversikt} prosjektId={prosjektId ?? ''} {aktivtSpor} />
			{:else}
				<div class="tabell-wrap">
					<CaseListTable cases={$query.data.cases} prosjektId={prosjektId ?? ''} />
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.page-layout {
		display: flex;
		height: 100%;
		overflow: hidden;
	}

	.page-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.tabell-wrap {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-6);
		max-width: 1200px;
	}

	.state-message {
		padding: var(--spacing-8) var(--spacing-4);
		text-align: center;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.state-text {
		font-size: 13px;
		color: var(--color-ink-muted);
	}

	.state-error .state-text {
		color: var(--color-score-low);
	}
</style>
