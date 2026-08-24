<script lang="ts">
  import { Pencil, Circle } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { fmt, BESTRIDT_LABEL } from './utils.js';
  import { SPOR_KEYS } from './scenarios.js';
  import type { SporKey } from './types.js';

  let {
    sel,
    draftCount,
    onselect,
  }: {
    sel: SporKey;
    draftCount: number;
    onselect: (key: SporKey, draftText: string) => void;
  } = $props();
</script>

<div class="strip">
  <span class="strip-label">Dine svar:</span>
  {#each SPOR_KEYS as k}
    {@const display = store.display(k)}
    {@const ui = store.getUI(k)}
    {@const hasDraft = ui.draft !== null}
    {@const active = k === sel}
    <button
      class="strip-btn"
      class:active
      class:has-draft={hasDraft}
      onclick={() => onselect(k, ui.draft?.text || '')}
    >
      {#if hasDraft}
        <Pencil size={10} />
      {:else}
        <Circle size={10} />
      {/if}
      <span>{display.label}:</span>
      <span class="font-mono strip-value">
        {#if !hasDraft}—{:else if k === 'ansvar'}{BESTRIDT_LABEL}{:else if ui.draft?.value}{fmt(
            ui.draft.value
          )},-{:else}Kladd{/if}
      </span>
    </button>
  {/each}
  <span class="font-mono strip-count">{draftCount}/3 påbegynt</span>
</div>

<style>
  .strip {
    border-bottom: 1px solid #d9d5cc;
    background: var(--draft-bg);
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }
  .strip-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--draft);
  }
  .strip-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    font-size: 13px;
    font-weight: 500;
    font-family: var(--font-sans);
    color: var(--ink-4);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 80ms;
  }
  .strip-btn.has-draft {
    color: var(--ink-2);
  }
  .strip-btn.active {
    font-weight: 700;
    color: var(--draft);
    background: var(--surface);
  }
  .strip-value {
    font-size: 12px;
    font-weight: 700;
  }
  .strip-count {
    font-size: 11px;
    color: var(--ink-4);
    margin-left: auto;
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .strip {
      padding: 6px 12px;
      gap: 4px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .strip-label {
      display: none;
    }
    .strip-btn {
      padding: 6px 8px;
      font-size: 12px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .strip-count {
      flex-shrink: 0;
    }
  }
</style>
