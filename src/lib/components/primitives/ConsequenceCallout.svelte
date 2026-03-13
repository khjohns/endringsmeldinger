<script lang="ts">
  import { CircleCheck, TriangleAlert, CircleX, Info } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { fly } from 'svelte/transition';

  interface Props {
    variant?: 'godkjent' | 'advarsel' | 'kritisk' | 'info';
    children: Snippet;
  }

  let { variant = 'info', children }: Props = $props();
</script>

<div class="callout callout-{variant}" in:fly={{ y: -4, duration: 200 }}>
  {#if variant === 'godkjent'}
    <CircleCheck class="callout-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {:else if variant === 'advarsel'}
    <TriangleAlert class="callout-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {:else if variant === 'kritisk'}
    <CircleX class="callout-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {:else}
    <Info class="callout-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
  {/if}
  <div class="callout-content">
    {@render children()}
  </div>
</div>

<style>
  .callout {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-left: 3px solid;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    font-family: var(--font-ui);
    font-size: 13px;
    line-height: 1.5;
  }

  .callout-godkjent {
    border-left-color: var(--color-score-high);
    background: var(--color-score-high-bg);
    color: var(--color-ink);
  }

  .callout-godkjent .callout-icon {
    color: var(--color-score-high);
  }

  .callout-advarsel {
    border-left-color: var(--color-vekt);
    background: var(--color-vekt-bg);
    color: var(--color-ink);
  }

  .callout-advarsel .callout-icon {
    color: var(--color-vekt);
  }

  .callout-kritisk {
    border-left-color: var(--color-score-low);
    background: var(--color-score-low-bg);
    color: var(--color-ink);
  }

  .callout-kritisk .callout-icon {
    color: var(--color-score-low);
  }

  .callout-info {
    border-left-color: var(--color-wire-strong);
    background: var(--color-felt);
    color: var(--color-ink-secondary);
  }

  .callout-info .callout-icon {
    color: var(--color-ink-muted);
  }

  .callout-icon {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .callout-content {
    flex: 1;
    min-width: 0;
  }
</style>
