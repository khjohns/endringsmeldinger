<script lang="ts">
	import { page } from '$app/state';
	import CaseCreateForm from '$lib/components/case-create/CaseCreateForm.svelte';
	import BegrunnelsePanel from '$lib/components/case-create/BegrunnelsePanel.svelte';
	import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
	import { createCaseListQuery } from '$lib/queries/caseList';

	const prosjektId = $derived(page.params.prosjektId);

	// Mock project metadata — same pattern as layout (will come from API)
	const projectMeta: Record<string, { name: string; te: string; bh: string }> = {
		P001: { name: 'Operatunnelen', te: 'Vestlandsentreprisen AS', bh: 'Oslobygg' },
	};
	const meta = $derived(prosjektId ? projectMeta[prosjektId] ?? null : null);

	const caseListQuery = createCaseListQuery();
	const saksnr = $derived((caseListQuery.data?.cases.length ?? 0) + 1);

	let begrunnelseHtml = $state('');
	let begrunnelsePlaceholder = $state('');
	let mobilPanelOpen = $state(false);

	// Form actions exposed by CaseCreateForm
	let formActions = $state<{
		submitLabel: string; kanSende: boolean;
		submitting: boolean; submitError: string;
		onsubmit: () => void; onavbryt: () => void;
	} | null>(null);

	const harBegrunnelse = $derived(begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length > 0);
</script>

<div class="ny-sak-layout">
	<main class="ny-sak-main">
		<div class="ny-sak-inner">
			<FormPageHeader
				tilbakeHref="/{prosjektId}"
				tilbakeTekst="Tilbake til saksoversikt"
				eyebrow="Nytt varsel"
				prosjektNavn={meta?.name}
				teNavn={meta?.te}
				bhNavn={meta?.bh}
				{saksnr}
			/>

			<CaseCreateForm
				bind:begrunnelseHtml
				onplaceholder={(p) => (begrunnelsePlaceholder = p)}
				onactions={(a) => (formActions = a)}
			/>
		</div>
	</main>

	<!-- Desktop: inline panel -->
	<div class="desktop-panel">
		<BegrunnelsePanel
			placeholder={begrunnelsePlaceholder}
			bind:html={begrunnelseHtml}
			submitLabel={formActions?.submitLabel}
			submitDisabled={!formActions?.kanSende}
			submitLoading={formActions?.submitting}
			submitError={formActions?.submitError}
			onsubmit={formActions?.onsubmit}
			onavbryt={formActions?.onavbryt}
		/>
	</div>
</div>

<!-- Mobil: FAB -->
<button class="begrunnelse-fab" onclick={() => (mobilPanelOpen = true)}>
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M2 3h12M2 7h8M2 11h10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
	</svg>
	Begrunnelse
	{#if harBegrunnelse}
		<span class="fab-badge"></span>
	{/if}
</button>

<!-- Mobil: fullscreen overlay -->
{#if mobilPanelOpen}
	<div class="mobil-panel-overlay">
		<BegrunnelsePanel
			placeholder={begrunnelsePlaceholder}
			bind:html={begrunnelseHtml}
			overlay
			onclose={() => (mobilPanelOpen = false)}
			submitLabel={formActions?.submitLabel}
			submitDisabled={!formActions?.kanSende}
			submitLoading={formActions?.submitting}
			submitError={formActions?.submitError}
			onsubmit={formActions?.onsubmit}
			onavbryt={formActions?.onavbryt}
		/>
	</div>
{/if}

<style>
	.ny-sak-layout {
		display: grid;
		grid-template-columns: 3fr 2fr;
		height: 100%;
		overflow: hidden;
	}

	.ny-sak-main {
		overflow-y: auto;
		padding: var(--spacing-8) var(--spacing-6);
	}

	.ny-sak-inner {
		max-width: 600px;
		margin: 0 auto;
	}

	.desktop-panel {
		overflow-y: auto;
	}

	/* FAB + mobil overlay: skjult på desktop */
	.begrunnelse-fab {
		display: none;
	}

	.mobil-panel-overlay {
		display: none;
	}

	/* ── Mobil (<768px) ── */
	@media (max-width: 767px) {
		.ny-sak-layout {
			grid-template-columns: 1fr;
		}

		.ny-sak-main {
			padding: var(--spacing-5) var(--spacing-4);
			padding-bottom: 72px; /* plass til FAB */
		}

		.desktop-panel {
			display: none;
		}

		.begrunnelse-fab {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			position: fixed;
			bottom: var(--spacing-5);
			right: var(--spacing-4);
			z-index: 20;
			padding: var(--spacing-2) var(--spacing-4);
			background: var(--color-felt-raised);
			border: 1px solid var(--color-vekt-dim);
			border-radius: 9999px;
			font-family: var(--font-ui);
			font-size: 13px;
			font-weight: 500;
			color: var(--color-vekt);
			cursor: pointer;
			transition: background 0.12s, border-color 0.12s;
		}

		.begrunnelse-fab:hover {
			background: var(--color-vekt-bg);
			border-color: var(--color-vekt);
		}

		.fab-badge {
			width: 6px;
			height: 6px;
			border-radius: 9999px;
			background: var(--color-vekt);
		}

		.mobil-panel-overlay {
			display: contents;
		}
	}
</style>
