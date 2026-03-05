<script lang="ts">
	import { page } from '$app/state';
	import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';

	let { children } = $props();

	const prosjektId = $derived(page.params.prosjektId);
	const sakId = $derived(page.params.sakId ?? null);

	const queryClient = new QueryClient();

	// Mock project metadata — will come from API later
	const projectNames: Record<string, { name: string; entreprise: string }> = {
		P001: { name: 'Operatunnelen', entreprise: 'Entreprise NS 8407' },
	};
	const projectMeta = $derived(prosjektId ? projectNames[prosjektId] ?? null : null);
</script>

<QueryClientProvider client={queryClient}>
	<div class="app-shell">
		<header class="top-nav">
			<nav class="nav-breadcrumbs" aria-label="Brodsmuler">
				<span>{projectMeta?.name ?? prosjektId}</span>
				{#if projectMeta?.entreprise}
					<span class="sep">/</span>
					<span>{projectMeta.entreprise}</span>
				{/if}
				{#if sakId}
					<span class="sep">/</span>
					<span>Saker</span>
					<span class="sep">/</span>
					<span class="current">{sakId}</span>
				{/if}
			</nav>
			<div class="nav-user">
				<span class="user-org">Hent AS</span>
				<div class="avatar">AM</div>
			</div>
		</header>
		<main class="app-main">
			{@render children()}
		</main>
	</div>
</QueryClientProvider>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
		background: var(--color-canvas);
		color: var(--color-ink);
	}

	.top-nav {
		height: 48px;
		border-bottom: 1px solid var(--color-wire-strong);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24px;
		flex-shrink: 0;
		background: var(--color-canvas);
	}

	.nav-breadcrumbs {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.nav-breadcrumbs .sep {
		color: var(--color-ink-ghost);
	}

	.nav-breadcrumbs .current {
		color: var(--color-ink);
		font-weight: 500;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-wire-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.app-main {
		flex: 1;
		overflow: hidden;
	}

	@media (max-width: 1023px) {
		.top-nav {
			padding: 0 16px;
		}

		.nav-user .user-org {
			display: none;
		}
	}
</style>
