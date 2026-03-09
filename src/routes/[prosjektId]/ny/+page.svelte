<script lang="ts">
	import { page } from '$app/state';
	import CaseCreateForm from '$lib/components/case-create/CaseCreateForm.svelte';
	import BegrunnelsePanel from '$lib/components/case-create/BegrunnelsePanel.svelte';
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
	let begrunnelsePlaceholder = $state(
		'Beskriv bakgrunnen for kravet og henvis til relevant kontraktsbestemmelse. Legg ved dokumentasjon som underbygger kravet.'
	);
	let mobilPanelOpen = $state(false);

	const harBegrunnelse = $derived(begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length > 0);
</script>

<div class="ny-sak-layout">
	<main class="ny-sak-main">
		<div class="ny-sak-inner">
			<a class="tilbake-lenke" href="/{prosjektId}">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Tilbake til saksoversikt
			</a>

			<header class="ny-sak-header">
				<span class="ny-sak-eyebrow">Nytt varsel</span>
				<div class="ny-sak-context">
					{#if meta}
						<span class="context-prosjekt">{meta.name}</span>
						<span class="context-sep">·</span>
						<span class="context-part">{meta.te}</span>
						<span class="context-sep">→</span>
						<span class="context-part">{meta.bh}</span>
					{/if}
					<span class="context-sep">·</span>
					<span class="context-nr">#{saksnr}</span>
				</div>
			</header>

			<CaseCreateForm
				bind:begrunnelseHtml
				onplaceholder={(p) => (begrunnelsePlaceholder = p)}
			/>
		</div>
	</main>

	<!-- Desktop: inline panel -->
	<div class="desktop-panel">
		<BegrunnelsePanel
			placeholder={begrunnelsePlaceholder}
			bind:html={begrunnelseHtml}
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
		/>
	</div>
{/if}

<style>
	.ny-sak-layout {
		display: grid;
		grid-template-columns: 1fr 340px;
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
		display: contents;
	}

	.tilbake-lenke {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-1);
		font-size: 12px;
		color: var(--color-ink-ghost);
		text-decoration: none;
		transition: color 0.12s;
		margin-bottom: var(--spacing-6);
	}

	.tilbake-lenke:hover {
		color: var(--color-vekt);
	}

	.ny-sak-header {
		margin-bottom: var(--spacing-4);
	}

	.ny-sak-eyebrow {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.ny-sak-context {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px var(--spacing-2);
		margin-top: var(--spacing-1);
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.context-prosjekt {
		font-weight: 500;
	}

	.context-part {
		color: var(--color-ink-muted);
	}

	.context-sep {
		color: var(--color-ink-ghost);
	}

	.context-nr {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-muted);
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

		.tilbake-lenke {
			margin-bottom: var(--spacing-4);
		}

		.ny-sak-header {
			margin-bottom: var(--spacing-3);
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
