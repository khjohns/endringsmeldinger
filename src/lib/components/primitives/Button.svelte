<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'destructive' | 'accept';
    disabled?: boolean;
    loading?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  let {
    variant = 'primary',
    disabled = false,
    loading = false,
    onclick,
    children,
  }: Props = $props();
</script>

<button class="btn btn-{variant}" disabled={disabled || loading} {onclick} aria-busy={loading}>
  {#if loading}
    <svg
      class="btn-spinner"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-dasharray="28"
        stroke-dashoffset="8"
      />
    </svg>
  {/if}
  <span class="btn-label" class:btn-label-hidden={loading}>
    {@render children()}
  </span>
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    height: 36px;
    padding: 0 var(--spacing-4);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 0.12s,
      border-color 0.12s,
      color 0.12s;
    position: relative;
    white-space: nowrap;
  }

  .btn:focus-visible {
    outline: none;
    border-color: var(--color-wire-focus);
    box-shadow: 0 0 0 2px var(--color-vekt-bg);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Primary — amber/vekt */
  .btn-primary {
    background: var(--color-vekt);
    color: var(--color-canvas);
    border-color: var(--color-vekt);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-vekt-dim);
    border-color: var(--color-vekt-dim);
  }

  /* Secondary — transparent + border */
  .btn-secondary {
    background: transparent;
    color: var(--color-ink);
    border-color: var(--color-wire-strong);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-felt-hover);
  }

  /* Destructive — score-low */
  .btn-destructive {
    background: var(--color-score-low-bg);
    color: var(--color-score-low);
    border-color: transparent;
  }

  .btn-destructive:hover:not(:disabled) {
    background: rgba(196, 88, 88, 0.18);
  }

  /* Accept — score-high */
  .btn-accept {
    background: var(--color-score-high-bg);
    color: var(--color-score-high);
    border-color: transparent;
  }

  .btn-accept:hover:not(:disabled) {
    background: rgba(61, 154, 110, 0.18);
  }

  /* Spinner */
  .btn-spinner {
    animation: spin 0.8s linear infinite;
    position: absolute;
  }

  .btn-label-hidden {
    visibility: hidden;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
