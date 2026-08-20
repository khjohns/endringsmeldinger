<script lang="ts">
  import { Check, XSquare, Send, BookOpen, ArrowRight } from 'lucide-svelte';
  import { fmt } from './utils.js';
  import type { Mode, Role, SporKey } from './types.js';

  let {
    mode,
    role,
    sel,
    hasDraft,
    subV,
    subF,
    prinV,
    prinF,
    oncloseform,
    onform,
    ontogglecontext,
    onsend,
    canSend = false,
    onwithdraw,
  }: {
    mode: Mode;
    role: Role;
    sel: SporKey;
    hasDraft: boolean;
    subV: number;
    subF: number;
    prinV: number;
    prinF: number;
    oncloseform: () => void;
    onform: (key: SporKey) => void;
    ontogglecontext?: () => void;
    onsend?: () => void;
    canSend?: boolean;
    onwithdraw?: () => void;
  } = $props();
</script>

<div class="action-bar">
  <div class="action-inner">
    <div class="status-section">
      <div class="status-dot"></div>
      <div>
        <div class="status-label">
          {mode === 'form' ? 'Redigerer kladd' : 'Saksstatus'}
        </div>
        <div class="status-text">
          {#if mode === 'form'}
            <span style="color: var(--ink-2)">Autolagret — lukk eller send</span>
          {:else}
            <span style="color: var(--green)">Subs. {fmt(subV)},- / {subF}d</span>
            <span class="status-sep">·</span>
            <span style="color: var(--danger)">Prins. {fmt(prinV)},- / {prinF}d</span>
          {/if}
        </div>
      </div>
    </div>
    <div class="action-buttons">
      {#if ontogglecontext}
        <button class="btn btn-secondary context-btn" onclick={ontogglecontext}>
          <BookOpen size={14} />
          <span class="context-btn-text">Kontekst</span>
        </button>
      {/if}
      {#if mode === 'form'}
        <button class="btn btn-secondary" onclick={oncloseform}>Lukk kladd</button>
        <button class="btn btn-primary" disabled={!canSend} onclick={onsend}
          ><Send size={14} /> Send svar</button
        >
      {:else if role === 'TE'}
        <button class="btn btn-danger" onclick={onwithdraw}><XSquare size={14} /> Trekk</button>
        <button class="btn btn-primary"><Check size={14} /> Godta</button>
      {:else}
        <button class="btn btn-primary" onclick={() => onform(sel)}>
          {hasDraft ? 'Fortsett' : 'Besvar'}
          <ArrowRight size={14} />
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .action-bar {
    position: sticky;
    bottom: 0;
    max-width: 840px;
    margin: 0 auto;
    background: var(--surface);
    border: 1px solid #d9d5cc;
    border-radius: 4px 4px 0 0;
    padding: 14px 24px;
    z-index: 20;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  }
  .action-inner {
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
    border-radius: 50%;
    background: var(--accent);
  }
  .status-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--ink-4);
  }
  .status-text {
    font-size: 14px;
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
  .context-btn {
    display: none;
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .action-bar {
      padding: 10px 12px;
    }
    .action-inner {
      gap: 8px;
    }
    .status-section {
      display: none;
    }
    .action-buttons {
      flex: 1;
      justify-content: flex-end;
    }
    .context-btn {
      display: inline-flex;
      margin-right: auto;
    }
    .context-btn-text {
      display: none;
    }
  }
</style>
