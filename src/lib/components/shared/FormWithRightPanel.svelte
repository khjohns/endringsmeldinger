<script lang="ts">
  import { BookOpen, ChevronLeft } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import KontekstPanel from './KontekstPanel.svelte';
  import type { Bestemmelse, BegrunnelseEntry } from '$lib/types';

  interface Props {
    /** Left panel content (form + InlineBegrunnelse) */
    children: Snippet;

    /** Bestemmelser for right panel */
    bestemmelser?: Bestemmelse[];

    /** Historikk entries for right panel */
    entries?: BegrunnelseEntry[];

    /** Party names for historikk display */
    teNavn?: string;
    bhNavn?: string;

    /** Tags for file attachments */
    availableTags?: string[];
  }

  let {
    children,
    bestemmelser = [],
    entries = [],
    teNavn,
    bhNavn,
    availableTags = [],
  }: Props = $props();

  let mobilPanelOpen = $state(false);
  let activeTab = $state<'bestemmelser' | 'historikk' | 'filer'>('bestemmelser');
</script>

<div class="form-layout">
  <div class="form-panels">
    <!-- Left panel: form content -->
    <main class="midtpanel">
      <div class="midtpanel-scroll">
        {@render children()}
      </div>
    </main>

    <!-- Right panel: context (bestemmelser/historikk/filer) -->
    <div class="desktop-panel">
      <KontekstPanel
        {bestemmelser}
        {entries}
        {teNavn}
        {bhNavn}
        {activeTab}
        ontabchange={(tab) => (activeTab = tab)}
        {availableTags}
      />
    </div>
  </div>
</div>

<!-- Mobile: FAB for context panel -->
<button class="kontekst-fab" onclick={() => (mobilPanelOpen = true)}>
  <BookOpen size={16} strokeWidth={1.5} aria-hidden="true" />
  Bestemmelser
</button>

<!-- Mobile: fullscreen overlay -->
{#if mobilPanelOpen}
  <div class="mobil-panel-overlay">
    <button class="panel-tilbake" onclick={() => (mobilPanelOpen = false)}>
      <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
      Tilbake til skjema
    </button>
    <KontekstPanel
      {bestemmelser}
      {entries}
      {teNavn}
      {bhNavn}
      {activeTab}
      ontabchange={(tab) => (activeTab = tab)}
      {availableTags}
    />
  </div>
{/if}

<style>
  .form-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-canvas);
  }

  .form-panels {
    display: grid;
    grid-template-columns: 3fr 2fr;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .desktop-panel {
    overflow-y: auto;
  }

  .midtpanel {
    overflow-y: auto;
  }

  .midtpanel-scroll {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    padding: var(--spacing-6);
    max-width: 640px;
    margin: 0 auto;
  }

  /* FAB + mobile overlay: hidden on desktop */
  .kontekst-fab {
    display: none;
  }
  .mobil-panel-overlay {
    display: none;
  }

  .panel-tilbake {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-3) var(--spacing-4);
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--color-felt);
    border: none;
    border-bottom: 1px solid var(--color-wire);
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--color-ink-secondary);
    cursor: pointer;
    width: 100%;
    text-align: left;
    flex-shrink: 0;
  }

  .panel-tilbake:hover {
    color: var(--color-ink);
  }

  @media (max-width: 767px) {
    .form-panels {
      grid-template-columns: 1fr;
    }
    .desktop-panel {
      display: none;
    }
    .midtpanel-scroll {
      max-width: none;
      padding: var(--spacing-5) var(--spacing-4);
    }

    .kontekst-fab {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      position: fixed;
      bottom: var(--spacing-5);
      right: var(--spacing-4);
      z-index: 20;
      padding: var(--spacing-2) var(--spacing-4);
      background: var(--color-felt-raised);
      border: 1px solid var(--color-wire-strong);
      border-radius: 9999px;
      font-family: var(--font-ui);
      font-size: 13px;
      font-weight: 500;
      color: var(--color-ink-secondary);
      cursor: pointer;
      transition:
        background 0.12s,
        border-color 0.12s;
    }

    .kontekst-fab:hover {
      background: var(--color-felt-hover);
      border-color: var(--color-ink-muted);
    }

    .mobil-panel-overlay {
      display: flex;
      flex-direction: column;
      position: fixed;
      inset: 0;
      z-index: 30;
      background: var(--color-canvas);
      overflow-y: auto;
    }

    .mobil-panel-overlay :global(.kontekst-panel) {
      position: static;
      height: auto;
      border-left: none;
    }
  }
</style>
