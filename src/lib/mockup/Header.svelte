<script lang="ts">
  import { ChevronLeft } from 'lucide-svelte';
  import { TE, BH, S } from './data.js';
  import type { Role, Mode } from './types.js';

  let {
    role,
    mode,
    saving = false,
    onrolechange,
    onback,
  }: {
    role: Role;
    mode: Mode;
    saving?: boolean;
    onrolechange: (r: Role) => void;
    onback: () => void;
  } = $props();
</script>

<header class="header">
  <div class="ochre-stripe"></div>
  <div class="left">
    {#if mode === 'form'}
      <button class="back-btn" onclick={onback}>
        <ChevronLeft size={16} /> Oversikt
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
    {#if mode === 'form'}
      <div class="save-indicator">
        <div class="save-dot" style:background={saving ? 'var(--ochre)' : 'var(--green)'}></div>
        <span class="font-mono save-text">{saving ? 'Lagrer...' : 'Lagret'}</span>
      </div>
    {/if}
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
    background: var(--paper);
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 30;
    position: relative;
  }
  .ochre-stripe {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--ochre);
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
  .ns-badge {
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-right: var(--edge);
    height: 100%;
    background: var(--plate);
    color: var(--ochre);
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
  .save-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 12px;
  }
  .save-dot {
    width: 6px;
    height: 6px;
    transition: background 200ms;
  }
  .save-text {
    font-size: 10px;
    color: var(--ink-4);
  }
  .role-label {
    font-size: 10px;
    color: var(--ink-4);
    letter-spacing: 0.06em;
  }
  .role-toggle {
    display: flex;
    border: var(--edge);
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
</style>
