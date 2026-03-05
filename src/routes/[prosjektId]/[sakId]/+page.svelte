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
	let activeTab = $state<'hendelser' | 'sak'>('hendelser');

	function handleFocusEvent(event: TimelineEvent | null) {
		focusedEvent = event;
	}

	const hasPanel = $derived(focusedEvent !== null);
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
	<div
		class="forhandlingsbord"
		class:har-panel={hasPanel}
		class:tab-sak={activeTab === 'sak'}
		class:tab-hendelser={activeTab === 'hendelser'}
	>
		<div class="sidebar-container">
			<Sidebar state={$query.data.state} />
		</div>
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
	<nav class="tabbar" aria-label="Navigasjon">
		<button
			class="tab"
			class:aktiv={activeTab === 'hendelser'}
			onclick={() => {
				activeTab = 'hendelser';
				focusedEvent = null;
			}}
		>
			Hendelser
		</button>
		<button
			class="tab"
			class:aktiv={activeTab === 'sak'}
			onclick={() => {
				activeTab = 'sak';
				focusedEvent = null;
			}}
		>
			Sak
		</button>
	</nav>
{:else}
	<div class="empty">
		<p class="empty-text">Ingen data for sak {sakId}</p>
	</div>
{/if}

<style>
	/* ── Desktop grid ── */

	.forhandlingsbord {
		display: grid;
		grid-template-columns: 260px 1fr;
		min-height: 100vh;
		background: var(--color-canvas);
	}

	.forhandlingsbord.har-panel {
		grid-template-columns: 260px 1fr 360px;
	}

	/* Transparent wrappers — don't affect grid layout on desktop */
	.sidebar-container,
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

	/* Tab bar + tilbake-knapp — skjult på desktop */
	.tabbar {
		display: none;
	}

	.tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-ui);
		font-size: 14px;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		border-top: 2px solid transparent;
		cursor: pointer;
		transition: color 100ms ease-out;
	}

	.tab.aktiv {
		color: var(--color-ink);
		border-top-color: var(--color-vekt);
	}

	.mobil-tilbake {
		display: none;
	}

	/* ── 1024–1279px: sidebar collapses to 48px icon mode ── */
	@media (max-width: 1279px) and (min-width: 1024px) {
		.forhandlingsbord {
			grid-template-columns: 48px 1fr;
		}

		.forhandlingsbord.har-panel {
			grid-template-columns: 48px 1fr 320px;
		}
	}

	/* ── Mobil (<1024px): tab-drevet enkeltkolonne ── */
	@media (max-width: 1023px) {
		.forhandlingsbord {
			display: block;
			padding-bottom: 56px;
		}

		/* Sidebar: full bredde, statisk posisjonering */
		.sidebar-container {
			display: block;
		}

		.sidebar-container :global(.sidebar) {
			width: 100%;
			position: static;
			height: auto;
			min-height: calc(100vh - 56px);
		}

		/* Skjul sidebar på hendelser-fanen */
		.forhandlingsbord.tab-hendelser .sidebar-container {
			display: none;
		}

		/* Main content: siden scroller, ikke intern container */
		.main-content {
			height: auto;
			position: static;
			overflow-y: visible;
		}

		.timeline-container {
			overflow-y: visible;
			padding: 0 16px;
		}

		/* Skjul main på sak-fanen */
		.forhandlingsbord.tab-sak .main-content {
			display: none;
		}

		/* Forhandsvisning: fast overlay */
		.panel-overlay {
			display: flex;
			flex-direction: column;
			position: fixed;
			inset: 0;
			z-index: 20;
			background: var(--color-canvas);
			overflow-y: auto;
		}

		.panel-overlay :global(.forhandsvisning) {
			position: static;
			height: auto;
			border-left: none;
		}

		/* Tilbake-knapp */
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

		/* Tabbar */
		.tabbar {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			height: 56px;
			background: var(--color-felt);
			border-top: 1px solid var(--color-wire-strong);
			z-index: 10;
		}

		/* Skjul tabbar når overlay er åpen */
		.forhandlingsbord.har-panel ~ .tabbar {
			display: none;
		}
	}
</style>
