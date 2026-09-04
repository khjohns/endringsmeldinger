<script lang="ts">
  import { ChevronLeft, RotateCcw, Sun, Moon, Plus } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import type { Role, Mode } from './types.js';

  let {
    role,
    mode,
    dark = false,
    mobileView = 'matrix',
    creatingCase = false,
    onrolechange,
    onback,
    onnewcase,
    ondarkchange,
  }: {
    role: Role;
    mode: Mode;
    dark?: boolean;
    mobileView?: 'matrix' | 'detail';
    creatingCase?: boolean;
    onrolechange: (r: Role) => void;
    onback: () => void;
    onnewcase?: () => void;
    ondarkchange?: (v: boolean) => void;
  } = $props();
</script>

<header class="header header-offset" class:header-full={creatingCase}>
  <div class="left">
    {#if mode === 'form' || creatingCase}
      <button class="back-btn" onclick={onback}>
        <ChevronLeft size={16} />
        <span class="back-text">{creatingCase ? 'Saksoversikt' : 'Oversikt'}</span>
      </button>
    {/if}
    {#if mobileView === 'detail' && mode === 'read'}
      <button class="back-btn mobile-only-back" onclick={onback}>
        <ChevronLeft size={16} />
      </button>
    {/if}
    <div class="project-info">
      <span class="project-name">{store.sak.prosjekt_navn ?? 'Kystveien Vest'}</span>
      <span class="breadcrumb-separator">/</span>
      <span class="project-case">
        {creatingCase ? 'Ny sak' : store.scenario.label.split(' — ')[0]}
      </span>
    </div>
  </div>
  <div class="right">
    {#if !creatingCase}
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
    {/if}
    {#if role === 'TE' && !creatingCase && onnewcase}
      <button class="new-case-btn" onclick={onnewcase}><Plus size={13} /> Ny sak</button>
    {/if}
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
    {#if !creatingCase}
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
    {:else}
      <span class="role-context">TE</span>
    {/if}
  </div>
</header>

<style>
  .header {
    height: var(--mockup-topbar-height);
    border-bottom: var(--rule);
    background: var(--surface);
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 30;
    position: relative;
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
    border-right: var(--rule);
    height: 100%;
    font-family: var(--font-sans);
  }
  .back-btn:hover {
    background: var(--surface-inset);
  }
  .mobile-only-back {
    display: none;
  }
  .header-offset {
    width: calc(100% - var(--mockup-sidebar-width));
    margin-left: var(--mockup-sidebar-width);
  }
  .header-full {
    width: 100%;
    margin-left: 0;
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
  .breadcrumb-separator {
    font-size: 13px;
    color: var(--ink-3);
    font-weight: 400;
  }
  .project-case {
    font-size: 13px;
    color: var(--ink-2);
    font-weight: 600;
  }
  .right {
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
  }
  .role-toggle {
    display: flex;
    gap: 8px;
  }
  .role-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    font-size: 12px;
    font-weight: 700;
    font-family: var(--font-sans);
    background: var(--canvas);
    color: var(--ink-3);
    border: var(--control-border);
    border-radius: 999px;
    cursor: pointer;
    transition: all 120ms;
  }
  .role-btn + .role-btn {
    border-left: 1px solid #c6d7cd;
  }
  .role-btn.active {
    background: var(--brand);
    color: white;
    border-color: var(--brand);
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
    font-family: var(--font-sans);
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 999px;
    padding: 4px 8px;
    color: var(--ink-2);
  }
  .theme-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    color: var(--ink-3);
    background: transparent;
    border: var(--control-border);
    border-radius: 999px;
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
    border: var(--control-border);
    border-radius: 999px;
    cursor: pointer;
    transition: all 80ms;
  }
  .new-case-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: white;
    background: var(--brand-2);
    border: 1px solid var(--brand-2);
    border-radius: 999px;
    cursor: pointer;
  }
  .new-case-btn:hover {
    background: var(--brand);
  }
  .role-context {
    display: grid;
    width: 30px;
    height: 30px;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    color: white;
    background: var(--brand);
    border-radius: 999px;
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
    .header-offset {
      width: 100%;
      margin-left: 0;
    }
    .project-info {
      padding: 0 12px;
      gap: 6px;
      min-width: 0;
    }
    .project-name {
      font-size: 14px;
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
