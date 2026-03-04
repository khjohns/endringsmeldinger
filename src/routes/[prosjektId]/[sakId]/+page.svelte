<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import Sidebar from '$lib/components/forhandlingsbord/Sidebar.svelte';

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
			<div class="placeholder">
				<h1 class="placeholder-title">Forhandlingsbordet — {$query.data.state.sak_id}</h1>
				<p class="placeholder-description">
					Tidslinje og sporkort implementeres i neste oppgave.
				</p>
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
		padding: 24px;
		overflow-y: auto;
	}

	.placeholder {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.placeholder-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0;
	}

	.placeholder-description {
		font-size: 14px;
		color: var(--color-ink-secondary);
		margin: 0;
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
