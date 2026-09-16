<script lang="ts">
  import { ChevronDown, Paperclip, ExternalLink, Pencil } from 'lucide-svelte';
  import { getCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
  const store = getCaseWorkspace();
  import { S, sporBestemmelser } from './data.js';
  import CaseHistory from './CaseHistory.svelte';
  import VedleggPanel from './VedleggPanel.svelte';
  import type { SporKey, Mode, RightTab } from './types.js';
  import type { TimelineEvent } from '$lib/types/timeline';

  let {
    sel,
    mode,
    tab,
    activeEvent = null,
    ontabchange,
    onclose,
    oneventclick,
    onletterclick,
  }: {
    sel: SporKey;
    mode: Mode;
    tab: RightTab;
    activeEvent?: TimelineEvent | null;
    ontabchange: (t: RightTab) => void;
    onclose?: () => void;
    oneventclick?: (ev: TimelineEvent) => void;
    onletterclick?: (ev: TimelineEvent) => void;
  } = $props();

  const ui = $derived(store.getUI(sel));
  const best = $derived(sporBestemmelser(sel));

  const readTabs: RightTab[] = ['bestemmelser', 'historikk', 'vedlegg'];
  const formTabs: RightTab[] = ['bestemmelser', 'historikk', 'filer'];
  const tabs = $derived(mode === 'read' ? readTabs : formTabs);

  const tabLabels: Record<RightTab, string> = {
    bestemmelser: 'Bestemmelser',
    historikk: 'Historikk',
    vedlegg: 'Vedlegg',
    filer: 'Filer',
  };
</script>

{#snippet attList(showPages: boolean)}
  {#each ui.att as v (v.n)}
    <div class="att" style="margin-bottom: {S.sm}px">
      <Paperclip size={14} style="color: var(--ink-4); flex-shrink: 0" />
      <div class="att-info">
        <div class="att-name">{v.n}</div>
        {#if showPages && v.p}<div class="font-mono att-pages">{v.p} sider</div>{/if}
      </div>
      <ExternalLink size={14} style="color: var(--ink-4); flex-shrink: 0" />
    </div>
  {/each}
{/snippet}

<aside class="right-sidebar">
  <div class="tab-bar">
    {#each tabs as t (t)}
      <button class="tab" class:on={tab === t} onclick={() => ontabchange(t)}>
        {tabLabels[t]}
      </button>
    {/each}
    {#if onclose}
      <button class="mobile-close-btn" onclick={onclose} aria-label="Lukk panel">✕</button>
    {/if}
  </div>

  <div class="tab-content">
    {#if tab === 'bestemmelser'}
      <p class="provisions-intro">Bestemmelser for dette sporet. Åpne dem du vil lese.</p>
      {#key sel}
        {#each best as b, i (b.ref)}
          <details class="provision" open={i === 0}>
            <summary class="provision-summary">
              <span class="provision-heading">
                <span class="font-mono best-ref">{b.ref}</span>
                <span class="best-title">{b.title}</span>
              </span>
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            </summary>
            <div class="provision-body">
              <p class="best-text">{b.text}</p>
              {#if b.note}
                <p class="best-note">{b.note}</p>
              {/if}
            </div>
          </details>
        {/each}
      {/key}
    {/if}

    {#if tab === 'historikk'}
      <CaseHistory events={store.timeline} {sel} {activeEvent} {oneventclick} {onletterclick} />
    {/if}

    {#if tab === 'vedlegg'}
      {#if store.isDemo}
        {@render attList(true)}
      {:else}
        <VedleggPanel sakId={store.sakId} kanLasteOpp={false} />
      {/if}

      {#if ui.note}
        <div class="note-sep"></div>
        <div class="internal-note">
          <div class="note-header">
            <Pencil size={12} style="color: var(--draft)" />
            <span class="note-date font-mono">{ui.note.d}</span>
            <span class="note-label">Internt, ikke synlig for motpart</span>
          </div>
          <p class="note-text">{ui.note.t}</p>
        </div>
      {/if}
    {/if}

    {#if tab === 'filer'}
      {#if store.isDemo}
        {@render attList(false)}
      {:else}
        <VedleggPanel sakId={store.sakId} />
      {/if}
    {/if}
  </div>
</aside>

<style>
  .right-sidebar {
    width: var(--mockup-drawer-width);
    flex-shrink: 0;
    border-left: var(--rule);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface);
  }
  .tab-bar {
    display: flex;
    flex-shrink: 0;
    border-bottom: var(--rule);
  }
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    font-family: var(--font-legal);
  }

  /* Bestemmelser */
  .provisions-intro {
    margin: 0 0 18px;
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.5;
  }
  .provision {
    border-bottom: var(--rule);
  }
  .provision-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0;
    list-style: none;
    cursor: pointer;
  }
  .provision-summary::-webkit-details-marker {
    display: none;
  }
  .provision-summary:hover .best-title {
    color: var(--ink);
  }
  .provision-summary:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 4px;
    border-radius: 4px;
  }
  .provision-summary :global(svg) {
    flex-shrink: 0;
    color: var(--ink-3);
  }
  .provision[open] .provision-summary :global(svg) {
    transform: rotate(180deg);
  }
  .provision-heading {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .best-ref {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-3);
  }
  .best-title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .provision-body {
    padding: 0 0 20px;
  }
  .best-text,
  .best-note {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--ink-2);
  }
  .best-note {
    margin-top: 14px;
    padding-top: 14px;
    border-top: var(--rule-subtle);
  }

  /* Vedlegg */
  .att-info {
    flex: 1;
    min-width: 0;
  }
  .att-name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .att-pages {
    font-size: 11px;
    color: var(--ink-4);
  }
  .note-sep {
    height: 1px;
    background: var(--accent);
    margin: 16px 0;
    opacity: 0.5;
  }
  .internal-note {
    padding: 12px;
    background: var(--draft-bg);
    border: 1.5px dashed var(--draft-border);
    border-radius: 4px;
  }
  .note-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .note-date {
    font-size: 11px;
    font-weight: 700;
    color: var(--draft);
  }
  .note-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--draft);
  }
  .note-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--draft);
  }
  .mobile-close-btn {
    display: none;
    margin-left: auto;
    padding: 8px 14px;
    font-size: 18px;
    font-weight: 700;
    color: var(--ink-3);
    background: none;
    border: none;
    cursor: pointer;
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .right-sidebar {
      width: 100%;
      border-left: none;
      border-top: 1px solid #d9d5cc;
    }
    .mobile-close-btn {
      display: block;
    }
  }
</style>
