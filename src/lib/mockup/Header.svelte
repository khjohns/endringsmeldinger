<script lang="ts">
  import { ChevronLeft, RotateCcw, Sun, Moon } from 'lucide-svelte';
  import { store } from './store.svelte.js';
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
  <div class="brand-stripe"></div>
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
    <div class="logo">
      <span class="logo-oslo">Oslo</span> / <span class="logo-bygg">Oslobygg</span>
    </div>
    <div class="project-info">
      <span class="project-name">{store.scenario.label.split(' — ')[0] || 'Kystveien Vest'}</span>
      <span class="project-parties">{store.teNavn} → {store.bhNavn}</span>
    </div>
  </div>
  <div class="right">
    <div class="scenario-select">
      <select
        class="font-mono"
        value={store.scenario.id}
        onchange={(e) => store.selectScenario(e.currentTarget.value)}
      >
        {#each store.scenarios as s}
          <option value={s.id}>{s.label}</option>
        {/each}
      </select>
    </div>
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
    <button
      class="reset-btn"
      onclick={() => store.selectScenario(store.scenario.id)}
      title="Nullstill mockup"
    >
      <RotateCcw size={12} /> <span class="reset-text">Nullstill</span>
    </button>
    <div class="role-toggle">
      {#each ['TE', 'BH'] as r}
        <button class="role-btn" class:active={role === r} onclick={() => onrolechange(r as Role)}
          >{r}</button
        >
      {/each}
    </div>
  </div>
</header>

<style>
  .header {
    height: 56px;
    border-bottom: 1px solid #d9d5cc;
    background: var(--surface);
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 30;
    position: relative;
  }
  .brand-stripe {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--brand);
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
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    background: none;
    border: none;
    cursor: pointer;
    border-right: 1px solid #d9d5cc;
    height: 100%;
    font-family: var(--font-sans);
  }
  .back-btn:hover {
    background: var(--surface-inset);
  }
  .mobile-only-back {
    display: none;
  }
  .logo {
    display: flex;
    align-items: center;
    padding: 0 20px;
    border-right: 1px solid #d9d5cc;
    height: 100%;
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    gap: 4px;
  }
  .logo-oslo {
    font-weight: 700;
    color: var(--brand);
  }
  .logo-bygg {
    font-weight: 600;
  }
  .project-info {
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .project-name {
    font-size: 15px;
    font-weight: 600;
  }
  .project-parties {
    font-size: 13px;
    color: var(--ink-3);
    font-weight: 400;
  }
  .right {
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
  }
  .role-toggle {
    display: flex;
    border: 1px solid #d9d5cc;
    border-radius: 4px;
    overflow: hidden;
  }
  .role-btn {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-sans);
    background: var(--surface);
    color: var(--ink-3);
    border: none;
    cursor: pointer;
    transition: all 120ms;
  }
  .role-btn + .role-btn {
    border-left: 1px solid #d9d5cc;
  }
  .role-btn.active {
    background: var(--brand);
    color: white;
  }
  .role-btn:hover:not(.active) {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .scenario-select {
    display: flex;
    align-items: center;
    height: 100%;
  }
  .scenario-select select {
    font-size: 12px;
    font-family: var(--font-mono);
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 4px;
    padding: 4px 8px;
    color: var(--ink-2);
  }
  .theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    color: var(--ink-3);
    background: transparent;
    border: 1px solid #d9d5cc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .theme-btn:hover {
    color: var(--brand);
    border-color: var(--brand);
  }
  .reset-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-sans);
    color: var(--ink-3);
    background: transparent;
    border: 1px solid #d9d5cc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 80ms;
  }
  .reset-btn:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .header {
      height: auto;
      min-height: 48px;
      flex-wrap: wrap;
    }
    .left {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    .logo {
      padding: 0 12px;
      border-right: none;
    }
    .project-info {
      padding: 0 12px;
      gap: 6px;
      min-width: 0;
    }
    .project-name {
      font-size: 14px;
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
    .reset-text {
      display: none;
    }
    .reset-btn {
      padding: 6px 8px;
    }
  }
</style>
