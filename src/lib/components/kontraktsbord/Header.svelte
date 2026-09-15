<script lang="ts">
  import { ChevronLeft, RotateCcw, SlidersHorizontal, Plus } from 'lucide-svelte';
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  import type { Role, Mode } from './types.js';
  const store = getCaseWorkspace();
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
    overviewHref = store.isDemo ? '/mockup/oversikt' : undefined,
  }: {
    role: Role;
    mode: Mode;
    dark?: boolean;
    mobileView?: 'matrix' | 'detail';
    creatingCase?: boolean;
    onrolechange: (role: Role) => void;
    onback: () => void;
    onnewcase?: () => void;
    ondarkchange?: (dark: boolean) => void;
    overviewHref?: string;
  } = $props();
  let demoTools: HTMLDetailsElement | undefined = $state();
</script>

<svelte:window
  onclick={(event) => {
    if (demoTools?.open && event.target instanceof Node && !demoTools.contains(event.target))
      demoTools.open = false;
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape' && demoTools?.open) {
      demoTools.open = false;
      demoTools.querySelector('summary')?.focus();
    }
  }}
/>
<div class="header-offset" class:header-full={creatingCase}>
  <AppTopbar
    projectName={store.sak.prosjekt_navn ?? 'Prosjekt'}
    projectHref={overviewHref}
    caseLabel={creatingCase ? 'Ny sak' : store.sak.sak_id}
    {role}
    {onrolechange}
    lockedRole={creatingCase}
  >
    {#snippet leading()}
      {#if mode === 'form' || creatingCase || mobileView === 'detail'}
        <button
          class="back-btn"
          class:mobile-only={mode === 'read' && !creatingCase}
          onclick={onback}
          aria-label={creatingCase ? 'Til saksoversikt' : 'Til oversikt'}
          ><ChevronLeft size={17} /></button
        >
      {/if}
    {/snippet}
    {#snippet actions()}
      {#if role === 'TE' && !creatingCase && onnewcase}<button
          class="new-case-btn"
          onclick={onnewcase}><Plus size={14} />Ny sak</button
        >{/if}
      {#if store.demo && !creatingCase}
        <details class="demo-tools" bind:this={demoTools}>
          <summary aria-label="Demoverktøy" title="Demoverktøy"
            ><SlidersHorizontal size={17} /></summary
          >
          <div class="demo-popover">
            <strong>Demoverktøy</strong>
            <label for="demo-scenario">Eksempelsak</label>
            <select
              id="demo-scenario"
              aria-label="Scenario"
              value={store.demo.scenario.id}
              onchange={(event) => store.demo?.selectScenario(event.currentTarget.value)}
            >
              {#each store.demo.scenarios as scenario (scenario.id)}<option value={scenario.id}
                  >{scenario.label}</option
                >{/each}
            </select>
            <button
              class="reset-btn"
              onclick={() => store.demo?.selectScenario(store.demo.scenario.id)}
              ><RotateCcw size={14} />Nullstill eksempelsaken</button
            >
            <p>Gjenoppretter opprinnelige krav, svar og kladder i denne eksempelsaken.</p>
            {#if ondarkchange}<label class="theme-option"
                ><input
                  type="checkbox"
                  checked={dark}
                  onchange={(event) => ondarkchange?.(event.currentTarget.checked)}
                />Mørk visning</label
              >{/if}
          </div>
        </details>
      {/if}
    {/snippet}
  </AppTopbar>
</div>

<style>
  .header-offset {
    width: calc(100% - var(--mockup-sidebar-width));
    margin-left: var(--mockup-sidebar-width);
    position: relative;
    z-index: 30;
    flex-shrink: 0;
  }
  .header-full {
    width: 100%;
    margin-left: 0;
  }
  .back-btn,
  .demo-tools summary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ink-3);
    cursor: pointer;
  }
  .back-btn:hover,
  .demo-tools summary:hover {
    background: var(--surface-inset);
  }
  .mobile-only {
    display: none;
  }
  .demo-tools {
    position: relative;
  }
  .demo-tools summary {
    list-style: none;
  }
  .demo-tools summary::-webkit-details-marker {
    display: none;
  }
  .demo-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 12px);
    width: min(340px, calc(100vw - 32px));
    padding: 20px;
    border: var(--rule);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: var(--overlay-shadow-lg);
    font-size: 12px;
  }
  .demo-popover strong {
    display: block;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .demo-popover label {
    display: block;
    margin-bottom: 6px;
    color: var(--ink-3);
  }
  select {
    width: 100%;
    padding: 8px;
    color: var(--ink-2);
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 5px;
    font: inherit;
  }
  .reset-btn {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 16px;
    padding: 8px 10px;
    border: var(--rule);
    border-radius: 5px;
    background: var(--surface);
    color: var(--ink-2);
    font: inherit;
    cursor: pointer;
  }
  .demo-popover p {
    margin: 8px 0 16px;
    line-height: 1.5;
    color: var(--ink-3);
  }
  .demo-popover .theme-option {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 0;
  }
  .new-case-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 0;
    border-radius: 6px;
    color: white;
    background: var(--brand);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  button:focus-visible,
  summary:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  @media (max-width: 768px) {
    .header-offset {
      width: 100%;
      margin-left: 0;
    }
    .mobile-only {
      display: flex;
    }
    .demo-popover {
      position: fixed;
      top: 64px;
      right: 12px;
    }
  }
</style>
