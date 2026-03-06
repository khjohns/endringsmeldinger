<script lang="ts">
	import { page } from '$app/state';
	import CaseCreateForm from '$lib/components/case-create/CaseCreateForm.svelte';
	import BegrunnelsePanel from '$lib/components/case-create/BegrunnelsePanel.svelte';

	const prosjektId = $derived(page.params.prosjektId);

	let begrunnelseHtml = $state('');
	let begrunnelsePlaceholder = $state(
		'Beskriv bakgrunnen for kravet og henvis til relevant kontraktsbestemmelse. Legg ved dokumentasjon som underbygger kravet.'
	);
	let mobilPanelOpen = $state(false);

	const harBegrunnelse = $derived(begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length > 0);
</script>

<div class="ny-sak-layout">
	<main class="ny-sak-main">
		<a class="tilbake-lenke" href="/{prosjektId}">
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
				<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Tilbake til saksoversikt
		</a>

		<header class="ny-sak-header">
			<h1 class="ny-sak-tittel">Nytt varsel</h1>
			<span class="ny-sak-id">Ny KOE-sak</span>
		</header>

		<CaseCreateForm
			bind:begrunnelseHtml
			onplaceholder={(p) => (begrunnelsePlaceholder = p)}
		/>
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
		padding: var(--spacing-6);
	}

	/* Constrain form width within the scrollable area */
	.ny-sak-main > :global(*) {
		max-width: 680px;
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
		margin-bottom: var(--spacing-4);
	}

	.tilbake-lenke:hover {
		color: var(--color-vekt);
	}

	.ny-sak-header {
		margin-bottom: var(--spacing-6);
	}

	.ny-sak-tittel {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0;
	}

	.ny-sak-id {
		font-family: var(--font-data);
		font-size: 11px;
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
			padding: var(--spacing-4) var(--spacing-3);
		}

		.desktop-panel {
			display: none;
		}

		.begrunnelse-fab {
			display: flex;
			align-items: center;
			gap: 6px;
			position: fixed;
			bottom: 20px;
			right: 16px;
			z-index: 20;
			padding: 10px 16px;
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
