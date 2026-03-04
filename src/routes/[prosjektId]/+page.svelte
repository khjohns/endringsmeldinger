<script lang="ts">
	import { page } from '$app/state';
	import { createCaseListQuery } from '$lib/queries/caseList';
	import CaseListTable from '$lib/components/case-list/CaseListTable.svelte';

	const prosjektId = $derived(page.params.prosjektId);
	const query = createCaseListQuery();
</script>

<div class="page">
	<header class="page-header">
		<h1 class="page-title">Saker</h1>
		{#if $query.data}
			<span class="case-count">{$query.data.cases.length} saker</span>
		{/if}
	</header>

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
		<CaseListTable cases={$query.data.cases} prosjektId={prosjektId ?? ''} />
	{/if}
</div>

<style>
	.page {
		padding: var(--spacing-6);
		max-width: 1200px;
	}

	.page-header {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-3);
		margin-bottom: var(--spacing-4);
	}

	.page-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
	}

	.case-count {
		font-size: 12px;
		color: var(--color-ink-ghost);
		font-family: var(--font-data);
	}

	.state-message {
		padding: var(--spacing-8) var(--spacing-4);
		text-align: center;
	}

	.state-text {
		font-size: 13px;
		color: var(--color-ink-muted);
	}

	.state-error .state-text {
		color: var(--color-score-low);
	}
</style>
