<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import Sidebar from '$lib/components/forhandlingsbord/Sidebar.svelte';
	import ActionBanner from '$lib/components/forhandlingsbord/ActionBanner.svelte';
	import Timeline from '$lib/components/forhandlingsbord/Timeline.svelte';

	const prosjektId = $derived(page.params.prosjektId ?? '');
	const sakId = $derived(page.params.sakId ?? '');

	const query = $derived(createCaseContextQuery(sakId));
</script>

{#if $query.isLoading}
	<div class="loading">
		<p class="loading-text">Laster sak {sakId}…</p>
	</div>
{:else if $query.isError}
	<div class="error">
		<p class="error-text">Kunne ikke laste sak {sakId}</p>
		<p class="error-detail">{$query.error?.message ?? 'Ukjent feil'}</p>
	</div>
{:else if $query.data}
	<div class="forhandlingsbord">
		<Sidebar state={$query.data.state} />
		<main class="main-content">
			<ActionBanner state={$query.data.state} />
			<div class="timeline-container">
				<Timeline
					state={$query.data.state}
					timeline={$query.data.timeline}
					{prosjektId}
					{sakId}
				/>
			</div>
		</main>
	</div>
{:else}
	<div class="empty">
		<p class="empty-text">Ingen data for sak {sakId}</p>
	</div>
{/if}

<style>
	.forhandlingsbord {
		display: grid;
		grid-template-columns: 260px 1fr;
		min-height: 100vh;
		background: var(--color-canvas);
	}

	.main-content {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		height: 100vh;
		position: sticky;
		top: 0;
	}

	.timeline-container {
		flex: 1;
		padding: 0 24px;
		overflow-y: auto;
	}

	.loading,
	.error,
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		gap: 8px;
	}

	.loading-text {
		font-size: 14px;
		color: var(--color-ink-secondary);
	}

	.error-text {
		font-size: 14px;
		color: var(--color-score-low);
	}

	.error-detail {
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.empty-text {
		font-size: 14px;
		color: var(--color-ink-muted);
	}
</style>
