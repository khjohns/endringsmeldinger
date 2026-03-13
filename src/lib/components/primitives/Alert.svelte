<script lang="ts">
  import { TriangleAlert, CircleX, Info } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'warning' | 'danger' | 'info';
    children: Snippet;
  }

  let { variant = 'info', children }: Props = $props();
</script>

<div class="alert alert-{variant}" role="alert">
  {#if variant === 'warning'}
    <TriangleAlert class="alert-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {:else if variant === 'danger'}
    <CircleX class="alert-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {:else}
    <Info class="alert-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {/if}
  <div class="alert-content">
    {@render children()}
  </div>
</div>

<style>
  .alert {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-md);
    border-left: 3px solid;
    font-family: var(--font-ui);
    font-size: 13px;
    line-height: 1.5;
  }

  .alert-warning {
    border-left-color: var(--color-vekt);
    background: var(--color-vekt-bg);
    color: var(--color-ink);
  }

  .alert-warning .alert-icon {
    color: var(--color-vekt);
  }

  .alert-danger {
    border-left-color: var(--color-score-low);
    background: var(--color-score-low-bg);
    color: var(--color-ink);
  }

  .alert-danger .alert-icon {
    color: var(--color-score-low);
  }

  .alert-info {
    border-left-color: var(--color-wire-strong);
    background: var(--color-felt);
    color: var(--color-ink-secondary);
  }

  .alert-info .alert-icon {
    color: var(--color-ink-muted);
  }

  .alert-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .alert-content {
    flex: 1;
    min-width: 0;
  }
</style>
