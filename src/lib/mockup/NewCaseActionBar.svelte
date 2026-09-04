<script lang="ts">
  import { Send } from 'lucide-svelte';

  let {
    canSend,
    sendLabel,
    oncancel,
    onsend,
  }: {
    canSend: boolean;
    sendLabel: string;
    oncancel: () => void;
    onsend: () => void;
  } = $props();
</script>

<div class="action-bar">
  <div class="draft-status">
    <span class="status-dot"></span>
    <div>
      <span class="status-label">Ny sak · Kladd</span>
      <strong>Autolagret</strong>
    </div>
  </div>
  <div class="actions">
    <button class="btn btn-secondary" onclick={oncancel}>Avbryt</button>
    <button class="btn btn-primary" disabled={!canSend} onclick={onsend}>
      <Send size={14} />
      {sendLabel}
    </button>
  </div>
</div>

<style>
  .action-bar {
    position: sticky;
    bottom: 12px;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    width: calc(100% - 32px);
    max-width: 808px;
    margin: 0 auto 12px;
    padding: 10px 12px 10px 16px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-lg);
  }
  .draft-status {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    background: var(--green);
    border-radius: 50%;
    box-shadow: 0 0 0 4px var(--green-bg);
  }
  .status-label {
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--ink-4);
  }
  .draft-status strong {
    font-size: 13px;
    color: var(--ink-2);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .actions :global(.btn) {
    min-height: 38px;
    padding: 8px 16px;
    font-size: 13px;
  }

  @media (max-width: 768px) {
    .draft-status {
      display: none;
    }
    .actions {
      flex: 1;
      justify-content: flex-end;
    }
  }
</style>
