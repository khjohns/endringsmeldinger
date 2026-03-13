<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    loading: boolean;
    error: boolean;
    ready?: boolean;
    children: Snippet;
  }

  let { loading, error, ready = true, children }: Props = $props();
</script>

{#if loading}
  <div class="shell-state">
    <p class="shell-loading">Laster sak…</p>
  </div>
{:else if error}
  <div class="shell-state">
    <p class="shell-error">Kunne ikke laste sak</p>
  </div>
{:else if ready}
  {@render children()}
{/if}

<style>
  .shell-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .shell-loading {
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  .shell-error {
    font-size: 14px;
    color: var(--color-score-low);
  }
</style>
