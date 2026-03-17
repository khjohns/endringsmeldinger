<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { listProjects } from '$lib/api/projects';
  import type { Project } from '$lib/types/project';

  let projects = $state<Project[]>([]);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      projects = await listProjects();
      // Auto-redirect if exactly one project
      if (projects.length === 1) {
        goto(`/${projects[0].id}`, { replaceState: true });
        return;
      }
    } catch {
      error = 'Kunne ikke laste prosjekter.';
    } finally {
      loading = false;
    }
  });
</script>

<div class="page">
  <div class="container">
    <h1 class="title">Endringsmeldinger</h1>
    <p class="subtitle">Velg prosjekt</p>

    {#if loading}
      <p class="state-text">Laster prosjekter...</p>
    {:else if error}
      <p class="state-text error">{error}</p>
    {:else if projects.length === 0}
      <p class="state-text">Ingen prosjekter funnet.</p>
    {:else}
      <ul class="project-list">
        {#each projects as project (project.id)}
          <li>
            <a href="/{project.id}" class="project-card">
              <span class="project-name">{project.name}</span>
              {#if project.description}
                <span class="project-desc">{project.description}</span>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .page {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-canvas);
    color: var(--color-ink);
  }

  .container {
    text-align: center;
    max-width: 480px;
    padding: var(--spacing-8);
  }

  .title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 4px;
  }

  .subtitle {
    font-size: 13px;
    color: var(--color-ink-secondary);
    margin: 0 0 var(--spacing-6);
  }

  .state-text {
    font-size: 13px;
    color: var(--color-ink-muted);
  }

  .state-text.error {
    color: var(--color-score-low);
  }

  .project-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .project-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--spacing-3) var(--spacing-4);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: inherit;
    transition:
      border-color 150ms,
      background 150ms;
  }

  .project-card:hover {
    border-color: var(--color-wire-strong);
    background: var(--color-felt);
  }

  .project-name {
    font-size: 14px;
    font-weight: 500;
  }

  .project-desc {
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
</style>
