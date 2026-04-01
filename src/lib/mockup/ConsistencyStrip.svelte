<script lang="ts">
  import { Pencil, Circle } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { S } from './data.js';
  import { fmt } from './utils.js';
  import type { TrackKey } from './types.js';

  let {
    sel,
    draftCount,
    onselect,
  }: {
    sel: TrackKey;
    draftCount: number;
    onselect: (key: TrackKey, draftText: string) => void;
  } = $props();
</script>

<div class="strip">
  <span class="font-mono strip-label">Dine svar:</span>
  {#each Object.entries(store.tracks) as [k, dd]}
    {@const active = k === sel}
    {@const ds = dd.draftState}
    <button
      class="strip-btn"
      class:active
      class:has-draft={ds === 'draft'}
      onclick={() => onselect(k as TrackKey, dd.draft?.text || '')}
    >
      {#if ds === 'draft'}
        <Pencil size={10} />
      {:else}
        <Circle size={10} />
      {/if}
      <span>{dd.label}:</span>
      <span class="font-mono strip-value">
        {#if ds === 'empty'}—{:else if k === 'ansvar'}Bestridt{:else if dd.draft?.value}{fmt(
            dd.draft.value
          )},-{:else}Kladd{/if}
      </span>
    </button>
  {/each}
  <span class="font-mono strip-count">{draftCount}/3 påbegynt</span>
</div>

<style>
  .strip {
    border-bottom: var(--rule);
    background: var(--draft-bg);
    padding: 8px 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
  }
  .strip-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--draft);
  }
  .strip-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-4);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 80ms;
  }
  .strip-btn.has-draft {
    color: var(--ink-2);
  }
  .strip-btn.active {
    font-weight: 700;
    color: var(--draft);
    background: rgba(107, 94, 47, 0.08);
  }
  .strip-value {
    font-size: 11px;
    font-weight: 700;
  }
  .strip-count {
    font-size: 10px;
    color: var(--ink-4);
    margin-left: auto;
  }
</style>
