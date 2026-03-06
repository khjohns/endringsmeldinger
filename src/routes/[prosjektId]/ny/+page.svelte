<script lang="ts">
	import { page } from '$app/state';
	import CaseCreateForm from '$lib/components/case-create/CaseCreateForm.svelte';
	import BegrunnelsePanel from '$lib/components/case-create/BegrunnelsePanel.svelte';

	const prosjektId = $derived(page.params.prosjektId);

	let begrunnelseHtml = $state('');
	let begrunnelsePlaceholder = $state(
		'Beskriv bakgrunnen for kravet og henvis til relevant kontraktsbestemmelse. Legg ved dokumentasjon som underbygger kravet.'
	);
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

	<BegrunnelsePanel
		placeholder={begrunnelsePlaceholder}
		bind:html={begrunnelseHtml}
		onchange={(h) => (begrunnelseHtml = h)}
	/>
</div>

<style>
	.ny-sak-layout {
		display: grid;
		grid-template-columns: 1fr 340px;
		height: 100%;
		overflow: hidden;
	}

	.ny-sak-main {
		overflow-y: auto;
		padding: var(--spacing-6) var(--spacing-6);
	}

	/* Constrain form width within the scrollable area */
	.ny-sak-main > :global(*) {
		max-width: 680px;
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

	@media (max-width: 480px) {
		.ny-sak-main {
			padding: var(--spacing-4) var(--spacing-3);
		}
	}
</style>
