<script lang="ts">
  import { page } from '$app/state';
  import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
  import ThemeToggle from '$lib/components/primitives/ThemeToggle.svelte';
  import RoleToggle from '$lib/components/primitives/RoleToggle.svelte';
  import { PROJECT_META } from '$lib/constants/projectMeta';

  let { children } = $props();

  const prosjektId = $derived(page.params.prosjektId);
  const sakId = $derived(page.params.sakId ?? null);
  const pathname = $derived(page.url.pathname);
  const isNySak = $derived(!sakId && pathname.endsWith('/ny'));
  const subRouteName = $derived.by(() => {
    if (!sakId) return null;
    if (pathname.endsWith('/svar-grunnlag')) return 'Svar på grunnlag';
    if (pathname.endsWith('/rediger-grunnlag')) return 'Rediger grunnlag';
    if (pathname.endsWith('/send-vederlag')) return 'Send vederlagskrav';
    return null;
  });

  const queryClient = new QueryClient();

  const projectMeta = $derived(prosjektId ? (PROJECT_META[prosjektId] ?? null) : null);
</script>

<QueryClientProvider client={queryClient}>
  <div class="app-shell">
    <header class="top-nav">
      <nav class="nav-breadcrumbs" aria-label="Brodsmuler">
        <a href="/{prosjektId}" class="crumb">{projectMeta?.name ?? prosjektId}</a>
        {#if isNySak}
          <span class="sep">/</span>
          <span class="current">Ny sak</span>
        {:else if sakId}
          <span class="sep">/</span>
          <a href="/{prosjektId}" class="crumb">Saker</a>
          <span class="sep">/</span>
          {#if subRouteName}
            <a href="/{prosjektId}/{sakId}" class="crumb">{sakId}</a>
            <span class="sep">/</span>
            <span class="current">{subRouteName}</span>
          {:else}
            <span class="current">{sakId}</span>
          {/if}
        {/if}
      </nav>
      <div class="nav-actions">
        <div class="role-toggle-wrap">
          <RoleToggle />
        </div>
        <div class="theme-toggle-wrap">
          <ThemeToggle />
        </div>
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

  .nav-breadcrumbs .crumb {
    color: var(--color-ink-secondary);
    text-decoration: none;
    transition: color 100ms ease;
  }

  .nav-breadcrumbs .crumb:hover {
    color: var(--color-ink);
  }

  .nav-breadcrumbs .sep {
    color: var(--color-ink-ghost);
  }

  .nav-breadcrumbs .current {
    color: var(--color-ink);
    font-weight: 500;
  }

  .nav-actions {
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
      padding-left: 54px; /* plass til ☰ hamburger */
    }

    .nav-breadcrumbs {
      min-width: 0;
    }

    .nav-breadcrumbs .crumb {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
    }

    .nav-actions .user-org,
    .nav-actions .avatar {
      display: none;
    }

    /* Flytt toggles til høyre, samme rad som sidebar-hamburger (☰ top:8 left:16) */
    .nav-actions {
      position: fixed;
      top: 8px;
      right: 16px;
      z-index: 26;
      gap: 6px;
    }

    /* Ikon-only: skjul label, matcher 30×30 sidebar-toggle */
    .theme-toggle-wrap :global(.theme-label) {
      display: none;
    }

    .theme-toggle-wrap :global(.theme-toggle) {
      width: 30px;
      height: 30px;
      padding: 0;
      justify-content: center;
    }
  }
</style>
