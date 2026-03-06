<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { createCaseListQuery } from '$lib/queries/caseList';
	import CaseListTable from '$lib/components/case-list/CaseListTable.svelte';
	import Saksoversikt from '$lib/components/saksoversikt/Saksoversikt.svelte';
	import OversiktSidebar from '$lib/components/saksoversikt/OversiktSidebar.svelte';
	import { mockSaksoversikt } from '$lib/mocks/saksoversikt';
	import type { SporHendelseType, SaksoversiktVisning } from '$lib/mocks/saksoversikt';

	const prosjektId = $derived(page.params.prosjektId);
	const query = createCaseListQuery();

	// Mock project metadata — will come from API later
	const projectNames: Record<string, { name: string; entreprise: string }> = {
		P001: { name: 'Operatunnelen', entreprise: 'Entreprise NS 8407' },
	};
	const projectMeta = $derived(prosjektId ? projectNames[prosjektId] ?? null : null);

	const STORAGE_KEY = 'koe-saksoversikt-visning';

	let visning = $state<SaksoversiktVisning>(
		browser ? (localStorage.getItem(STORAGE_KEY) as SaksoversiktVisning) ?? 'tidslinje' : 'tidslinje'
	);

	let sidebarOpen = $state(false);
	let sidebarSpor = $state<SporHendelseType | null>(null);
	let tastaturSpor = $state<SporHendelseType | null>(null);
	const aktivtSpor = $derived(tastaturSpor ?? sidebarSpor);

	const SPOR_TASTER: Record<string, SporHendelseType> = { k: 'K', v: 'V', f: 'F' };

	function byttVisning(v: SaksoversiktVisning) {
		visning = v;
		if (browser) localStorage.setItem(STORAGE_KEY, v);
	}

	function byttSpor(spor: SporHendelseType | null) {
		sidebarSpor = spor;
	}

	function erRedigerbart(target: EventTarget | null): boolean {
		if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
		return target instanceof Element && target.closest('[contenteditable="true"]') !== null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (erRedigerbart(e.target)) return;
		if (e.repeat) return;
		const spor = SPOR_TASTER[e.key.toLowerCase()];
		if (spor) tastaturSpor = spor;
	}

	function handleKeyup(e: KeyboardEvent) {
		const spor = SPOR_TASTER[e.key.toLowerCase()];
		if (spor && tastaturSpor === spor) tastaturSpor = null;
	}

	function handleBlur() {
		tastaturSpor = null;
	}

	const sidebarProps = $derived({
		saker: mockSaksoversikt,
		prosjektNavn: projectMeta?.name ?? prosjektId ?? '',
		entreprise: projectMeta?.entreprise ?? '',
		visning,
		onvisning: byttVisning,
		aktivtSpor,
		onspor: byttSpor,
	});
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} onblur={handleBlur} />

<div class="page-layout">
	<!-- Desktop sidebar -->
	<div class="desktop-sidebar">
		<OversiktSidebar {...sidebarProps} />
	</div>

	<!-- Mobile toggle -->
	<button
		class="sidebar-toggle"
		class:er-open={sidebarOpen}
		onclick={() => (sidebarOpen = !sidebarOpen)}
		aria-label={sidebarOpen ? 'Skjul meny' : 'Vis meny'}
	>
		{sidebarOpen ? '\u2715' : '\u2630'}
	</button>

	<!-- Mobile drawer -->
	{#if sidebarOpen}
		<div class="sidebar-backdrop" role="presentation" onclick={() => (sidebarOpen = false)}></div>
		<div class="sidebar-drawer">
			<OversiktSidebar {...sidebarProps} />
		</div>
	{/if}

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

	/* Mobile: hidden by default */
	.sidebar-toggle {
		display: none;
	}

	.sidebar-backdrop {
		display: none;
	}

	.sidebar-drawer {
		display: none;
	}

	@media (max-width: 1023px) {
		.desktop-sidebar {
			display: none;
		}

		.sidebar-toggle {
			display: flex;
			align-items: center;
			justify-content: center;
			position: fixed;
			top: 8px;
			left: 16px;
			z-index: 26;
			width: 30px;
			height: 30px;
			background: var(--color-felt);
			border: 1px solid var(--color-wire-strong);
			border-radius: var(--radius-sm);
			color: var(--color-ink-secondary);
			font-size: 16px;
			cursor: pointer;
			line-height: 1;
			transition: background 150ms, color 150ms;
		}

		.sidebar-toggle:hover,
		.sidebar-toggle.er-open {
			background: var(--color-felt-active);
			color: var(--color-ink);
		}

		.sidebar-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 21;
			background: rgba(0, 0, 0, 0.45);
		}

		.sidebar-drawer {
			display: flex;
			position: fixed;
			left: 0;
			top: 0;
			height: 100vh;
			z-index: 22;
			width: 280px;
			box-shadow: 4px 0 16px rgba(0, 0, 0, 0.4);
		}
	}
</style>
