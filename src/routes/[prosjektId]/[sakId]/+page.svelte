<script lang="ts">
	import { page } from '$app/state';
	import type { TimelineEvent } from '$lib/types/timeline';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import Sidebar from '$lib/components/forhandlingsbord/Sidebar.svelte';
	import ActionBanner from '$lib/components/forhandlingsbord/ActionBanner.svelte';
	import Timeline from '$lib/components/forhandlingsbord/Timeline.svelte';
	import Forhandsvisning from '$lib/components/forhandlingsbord/Forhandsvisning.svelte';

	const prosjektId = $derived(page.params.prosjektId ?? '');
	const sakId = $derived(page.params.sakId ?? '');

	const query = $derived(createCaseContextQuery(sakId));

	let focusedEvent = $state<TimelineEvent | null>(null);
	let sidebarOpen = $state(false);

	function handleFocusEvent(event: TimelineEvent | null) {
		focusedEvent = event;
	}

	const hasPanel = $derived(focusedEvent !== null);
</script>

<!-- Sidebar-toggle: alltid synlig øverst til venstre -->
<button
	class="sidebar-toggle"
	class:er-open={sidebarOpen}
	onclick={() => (sidebarOpen = !sidebarOpen)}
	aria-label={sidebarOpen ? 'Skjul saksinformasjon' : 'Vis saksinformasjon'}
>
	{sidebarOpen ? '✕' : '☰'}
</button>

<!-- Sidebar drawer -->
{#if sidebarOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="sidebar-backdrop" onclick={() => (sidebarOpen = false)}></div>
	<div class="sidebar-drawer">
		{#if $query.data}
			<Sidebar state={$query.data.state} />
		{/if}
	</div>
{/if}

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
	<div class="forhandlingsbord" class:har-panel={hasPanel}>
		<main class="main-content">
			<ActionBanner sakState={$query.data.state} />
			<div class="timeline-container">
				<Timeline
					state={$query.data.state}
					timeline={$query.data.timeline}
					{prosjektId}
					{sakId}
					onFocusEvent={handleFocusEvent}
				/>
			</div>
		</main>
		{#if hasPanel}
			<div class="panel-overlay">
				<button class="mobil-tilbake" onclick={() => (focusedEvent = null)}>← Tilbake</button>
				<Forhandsvisning event={focusedEvent} {prosjektId} {sakId} />
			</div>
		{/if}
	</div>
{:else}
	<div class="empty">
		<p class="empty-text">Ingen data for sak {sakId}</p>
	</div>
{/if}

<style>
	/* ── Sidebar toggle-knapp ── */
	.sidebar-toggle {
		position: fixed;
		top: 8px;
		left: 16px;
		z-index: 26;
		width: 30px;
		height: 30px;
		background: var(--color-felt);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-md);
		color: var(--color-ink-secondary);
		font-size: 14px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 100ms ease-out, background 100ms ease-out;
	}

	.sidebar-toggle:hover {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.sidebar-toggle.er-open {
		color: var(--color-ink);
		background: var(--color-felt-raised);
	}

	/* ── Sidebar drawer ── */
	.sidebar-backdrop {
		position: fixed;
		inset: 0;
		z-index: 21;
		background: rgba(0, 0, 0, 0.45);
	}

	.sidebar-drawer {
		position: fixed;
		left: 0;
		top: 0;
		height: 100vh;
		z-index: 22;
		box-shadow: 4px 0 16px rgba(0, 0, 0, 0.4);
	}

	.sidebar-drawer :global(.sidebar) {
		position: static;
		height: 100vh;
		width: 260px;
	}

	/* ── Forhandlingsbord ── */
	.forhandlingsbord {
		display: grid;
		grid-template-columns: 1fr;
		min-height: 100vh;
		background: var(--color-canvas);
	}

	.forhandlingsbord.har-panel {
		grid-template-columns: 1fr 360px;
	}

	/* panel-overlay: transparent i grid på desktop */
	.panel-overlay {
		display: contents;
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

	/* Tilbake-knapp: kun synlig på mobil */
	.mobil-tilbake {
		display: none;
	}

	/* ── Mobil (<768px): Forhandsvisning som fast overlay ── */
	@media (max-width: 767px) {
		.forhandlingsbord.har-panel {
			grid-template-columns: 1fr;
		}

		.panel-overlay {
			display: flex;
			flex-direction: column;
			position: fixed;
			inset: 0;
			z-index: 25;
			background: var(--color-canvas);
			overflow-y: auto;
		}

		.panel-overlay :global(.forhandsvisning) {
			position: static;
			height: auto;
			border-left: none;
		}

		.mobil-tilbake {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 12px 16px;
			position: sticky;
			top: 0;
			z-index: 1;
			background: var(--color-felt);
			border: none;
			border-bottom: 1px solid var(--color-wire);
			font-family: var(--font-ui);
			font-size: 13px;
			color: var(--color-ink-secondary);
			cursor: pointer;
			width: 100%;
			text-align: left;
			flex-shrink: 0;
		}

		.mobil-tilbake:hover {
			color: var(--color-ink);
		}

		.main-content {
			height: auto;
			position: static;
			overflow-y: visible;
		}

		.timeline-container {
			overflow-y: visible;
			padding: 0 16px;
		}
	}
</style>
