<script lang="ts">
  import { X } from 'lucide-svelte';
  import { Dialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    variant?: 'default' | 'destructive';
    children: Snippet;
    actions?: Snippet;
    onOpenChange?: (open: boolean) => void;
  }

  let {
    open = $bindable(false),
    title,
    variant = 'default',
    children,
    actions,
    onOpenChange,
  }: Props = $props();

  function handleOpenChange(v: boolean) {
    open = v;
    onOpenChange?.(v);
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="modal-overlay" />
    <Dialog.Content class="modal-content modal-{variant}">
      <div class="modal-header">
        <Dialog.Title class="modal-title">{title}</Dialog.Title>
        <Dialog.Close class="modal-close" aria-label="Lukk">
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </Dialog.Close>
      </div>
      <div class="modal-body">
        {@render children()}
      </div>
      {#if actions}
        <div class="modal-actions">
          {@render actions()}
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.modal-overlay) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.6);
    animation: overlay-in 0.15s ease-out;
  }

  :global(.modal-content) {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: calc(100% - 32px);
    max-width: 480px;
    background: var(--color-felt-raised);
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    animation: modal-in 0.15s ease-out;
  }

  :global(.modal-destructive) {
    border-color: rgba(196, 88, 88, 0.3);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: 1px solid var(--color-wire);
  }

  :global(.modal-title) {
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
  }

  :global(.modal-destructive .modal-title) {
    color: var(--color-score-low);
  }

  :global(.modal-close) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-ink-muted);
    cursor: pointer;
    transition:
      background-color 0.1s,
      color 0.1s;
  }

  :global(.modal-close:hover) {
    background: var(--color-felt-hover);
    color: var(--color-ink);
  }

  :global(.modal-close:focus-visible) {
    outline: none;
    border-color: var(--color-wire-focus);
  }

  .modal-body {
    padding: var(--spacing-5);
    font-family: var(--font-ui);
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-ink-secondary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    border-top: 1px solid var(--color-wire);
  }

  @keyframes overlay-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
</style>
