<script lang="ts">
	import { page } from '$app/state';
	import CaseCreateForm from '$lib/components/case-create/CaseCreateForm.svelte';

	const prosjektId = $derived(page.params.prosjektId);
</script>

<div class="ny-sak-side">
	<div class="ny-sak-container">
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

		<CaseCreateForm />
	</div>
</div>

<style>
	.ny-sak-side {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-6) var(--spacing-4);
	}

	.ny-sak-container {
		max-width: 680px;
		margin: 0 auto;
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
</style>
