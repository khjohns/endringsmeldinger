<script lang="ts">
  import { ChevronLeft, RotateCcw, Sun, Moon } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { TE, BH, S } from './data.js';
  import type { Role, Mode } from './types.js';

  let {
    role,
    mode,
    dark = false,
    mobileView = 'matrix',
    onrolechange,
    onback,
    ondarkchange,
  }: {
    role: Role;
    mode: Mode;
    dark?: boolean;
    mobileView?: 'matrix' | 'detail';
    onrolechange: (r: Role) => void;
    onback: () => void;
    ondarkchange?: (v: boolean) => void;
  } = $props();
</script>

<header class="header">
  <div class="gold-stripe"></div>
  <div class="left">
    {#if mode === 'form'}
      <button class="back-btn" onclick={onback}>
        <ChevronLeft size={16} /> <span class="back-text">Oversikt</span>
      </button>
    {/if}
    {#if mobileView === 'detail' && mode === 'read'}
      <button class="back-btn mobile-only-back" onclick={onback}>
        <ChevronLeft size={16} />
      </button>
    {/if}
    <div class="ns-badge">
      <span class="ns-text">NS 8407</span>
    </div>
    <div class="project-info">
      <span class="project-name">Kystveien Vest</span>
      <span class="project-parties">{TE} → {BH}</span>
    </div>
  </div>
  <div class="right">
    <button
      class="theme-btn"
      onclick={() => ondarkchange?.(!dark)}
      title={dark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
    >
      {#if dark}
        <Sun size={14} />
      {:else}
        <Moon size={14} />
      {/if}
    </button>
    <button class="reset-btn" onclick={() => store.reset()} title="Nullstill mockup">
      <RotateCcw size={12} /> <span class="reset-text">Nullstill</span>
    </button>
    <span class="font-mono role-label">VIS SOM</span>
    <div class="role-toggle">
      {#each ['TE', 'BH'] as r}
        <button
          class="font-mono role-btn"
          class:active={role === r}
          style:border-right={r === 'TE' ? 'var(--edge)' : 'none'}
          onclick={() => onrolechange(r as Role)}>{r}</button
        >
      {/each}
    </div>
  </div>
</header>

<style>
  .header {
    height: 52px;
    border-bottom: var(--edge);
    background: var(--canvas);
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 30;
    position: relative;
  }
  .gold-stripe {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gold);
  }
  .left {
    display: flex;
    align-items: center;
  }
  .back-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-3);
    background: none;
    border: none;
    cursor: pointer;
    border-right: var(--rule);
    height: 100%;
  }
  .mobile-only-back {
    display: none;
  }
  .ns-badge {
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-right: var(--edge);
    height: 100%;
    background: var(--plate);
    color: var(--gold);
  }
  .ns-text {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .project-info {
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .project-name {
    font-size: 14px;
    font-weight: 700;
  }
  .project-parties {
    font-size: 12px;
    color: var(--ink-3);
    font-weight: 500;
  }
  .right {
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
  }
  .role-label {
    font-size: 10px;
    color: var(--ink-4);
    letter-spacing: 0.06em;
  }
  .role-toggle {
    display: flex;
    border: var(--edge);
    border-radius: 4px;
    overflow: hidden;
  }
  .role-btn {
    padding: 4px 14px;
    font-size: 11px;
    font-weight: 700;
    background: var(--paper);
    color: var(--ink-3);
    border: none;
    cursor: pointer;
    transition: all 80ms;
  }
  .role-btn.active {
    background: var(--plate);
    color: white;
  }
  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--ink-4);
    background: transparent;
    border: 1px solid var(--ink-4);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .theme-btn:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
  .reset-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-4);
    background: transparent;
    border: 1px solid var(--ink-4);
    border-radius: 4px;
    cursor: pointer;
    transition: all 80ms;
  }
  .reset-btn:hover {
    color: var(--ink);
    border-color: var(--ink);
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .header {
      height: auto;
      min-height: 44px;
      flex-wrap: wrap;
    }
    .left {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    .ns-badge {
      padding: 0 10px;
    }
    .project-info {
      padding: 0 10px;
      gap: 6px;
      min-width: 0;
    }
    .project-name {
      font-size: 13px;
    }
    .project-parties {
      display: none;
    }
    .back-btn {
      padding: 0 10px;
    }
    .back-text {
      display: none;
    }
    .mobile-only-back {
      display: flex;
    }
    .right {
      padding: 0 10px;
      gap: 8px;
    }
    .role-label {
      display: none;
    }
    .reset-text {
      display: none;
    }
    .reset-btn {
      padding: 4px 6px;
    }
  }
</style>
