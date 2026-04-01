<script lang="ts">
  import { Check, XSquare, Send } from 'lucide-svelte';
  import { TE, S } from './data.js';
  import { fmt } from './utils.js';
  import type { Mode, Role } from './types.js';

  let {
    mode,
    role,
    subV,
    subF,
    prinV,
    prinF,
    oncloseform,
  }: {
    mode: Mode;
    role: Role;
    subV: number;
    subF: number;
    prinV: number;
    prinF: number;
    oncloseform: () => void;
  } = $props();
</script>

<div class="action-bar">
  <div class="action-inner">
    <div class="status-section">
      <div class="status-dot"></div>
      <div>
        <div class="font-mono status-label">
          {mode === 'form' ? 'REDIGERER KLADD' : 'SAKSSTATUS'}
        </div>
        <div class="status-text">
          {#if mode === 'form'}
            <span style="color: var(--ink-2)">Autolagret — lukk eller send</span>
          {:else}
            <span style="color: var(--ochre)">Subs. {fmt(subV)},- / {subF}d</span>
            <span class="status-sep">·</span>
            <span style="color: var(--red)">Prins. {fmt(prinV)},- / {prinF}d</span>
          {/if}
        </div>
      </div>
    </div>
    <div class="action-buttons">
      {#if mode === 'form'}
        <button class="btn btn-secondary" onclick={oncloseform}>Lukk kladd</button>
        <button class="btn btn-primary"><Send size={14} /> Send svar</button>
      {:else if role === 'TE'}
        <button class="btn btn-danger"><XSquare size={14} /> Trekk</button>
        <button class="btn btn-primary"><Check size={14} /> Godta</button>
      {:else}
        <div class="waiting-box">
          <div class="waiting-dot"></div>
          <span class="waiting-text">Avventer {TE}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .action-bar {
    position: sticky;
    bottom: 0;
    background: var(--paper);
    border-top: var(--edge);
    padding: 12px 24px;
    z-index: 20;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.05);
  }
  .action-inner {
    max-width: 840px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .status-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    background: var(--ochre);
  }
  .status-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .status-text {
    font-size: 13px;
    font-weight: 700;
  }
  .status-sep {
    color: var(--ink-4);
    margin: 0 8px;
  }
  .action-buttons {
    display: flex;
    gap: 8px;
  }
  .waiting-box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    border: var(--rule);
    background: var(--paper-inset);
  }
  .waiting-dot {
    width: 6px;
    height: 6px;
    background: var(--ochre);
  }
  .waiting-text {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
  }
</style>
