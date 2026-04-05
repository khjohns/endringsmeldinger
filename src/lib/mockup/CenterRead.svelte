<script lang="ts">
  import { XSquare, Pencil } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { TRACK_ICONS } from './data.js';
  import { fmt } from './utils.js';
  import Stamp from './Stamp.svelte';
  import SubStripe from './SubStripe.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import type { SporKey, Role } from './types.js';

  let {
    sel,
    role,
    onform,
  }: {
    sel: SporKey;
    role: Role;
    onform: (key: SporKey) => void;
  } = $props();

  const display = $derived(store.display(sel));
  const ui = $derived(store.getUI(sel));
  const isSub = $derived(display.isSubsidiary);
  const TrackIcon = $derived(TRACK_ICONS[sel]);
</script>

<div class="read-content">
  <CaseAnchor />

  <div class="section-heading">
    <div class="heading-row">
      <TrackIcon size={18} style="color: var(--ink-2)" />
      <h2 class="heading-text">{display.num}. {display.label}{isSub ? ' (Sub.)' : ''}</h2>
    </div>
  </div>

  <!-- TE-blokk: prinsipalt krav, alltid utenfor stripe -->
  <div class="doc-panel te-panel">
    <div class="doc-sidebar te-sidebar">
      <div class="party-name te-name">{store.teNavn}</div>
      {#if display.isBinary}
        <div class="font-mono te-position">{display.tePosition}</div>
        <div class="font-mono te-ref">{display.teRef}</div>
      {:else}
        <div class="font-mono te-value">{fmt(display.krevdValue!)}{display.krevdUnit}</div>
      {/if}
    </div>
    <div class="doc-content">
      <p class="font-serif argument-text">{display.teText}</p>
    </div>
  </div>

  {#snippet bhBlock()}
    <div
      class="doc-panel bh-panel"
      style:background={display.isDisputed ? 'var(--red-bg)' : 'var(--paper)'}
    >
      <div
        class="doc-sidebar bh-sidebar"
        style:background={display.isDisputed ? 'var(--red)' : 'var(--paper-sub)'}
        style:color={display.isDisputed ? 'white' : 'var(--ink)'}
      >
        <div
          class="party-name"
          style:font-weight={display.isDisputed ? '700' : '500'}
          style:color={display.isDisputed ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)'}
        >
          {store.bhNavn}
        </div>
        {#if display.isDisputed}
          <div class="rejected-badge">
            <XSquare size={18} />
            <span class="rejected-text">Avslått</span>
          </div>
          <div class="sidebar-stamp">
            <Stamp variant="red" small>Bestridt</Stamp>
          </div>
        {:else}
          <div class="font-mono bh-value">{fmt(display.bhSubsidiaer!)}{display.bhUnit}</div>
        {/if}
      </div>
      <div class="doc-content">
        <p
          class="font-serif argument-text"
          style:color={display.isDisputed ? 'var(--red)' : 'var(--ink-2)'}
        >
          {display.bhText}
        </p>
      </div>
    </div>

    {#if ui.draft}
      <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
      <div class="draft-section draft-clickable" onclick={() => onform(sel)}>
        <div class="draft-header">
          <div class="draft-meta">
            <Stamp variant="draft" small>Kladd</Stamp>
            <Pencil size={12} style="color: var(--draft)" />
            <span class="draft-label">Internt — ikke synlig for motpart</span>
            {#if ui.draft.value}
              <span class="font-mono draft-value">{fmt(ui.draft.value)},-</span>
            {/if}
          </div>
        </div>
        <p class="font-serif draft-text">{ui.draft.text}</p>
      </div>
    {/if}
  {/snippet}

  {#if isSub}
    <SubStripe
      notice="Ansvarsgrunnlaget er prinsipalt bestridt. Utmåling er utelukkende subsidiær — ingen erkjennelse av ansvar."
    >
      {@render bhBlock()}
    </SubStripe>
  {:else}
    {@render bhBlock()}
  {/if}
</div>

<style>
  .read-content {
    max-width: 840px;
    margin: 0 auto;
    padding: 40px 40px 120px;
  }
  .section-heading {
    border-bottom: 2px solid var(--gold);
    padding-bottom: 12px;
    margin-bottom: 32px;
  }
  .heading-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .heading-text {
    font-size: 20px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: -0.01em;
  }
  .doc-panel {
    display: flex;
    border-left: var(--rule);
    border-right: var(--rule);
  }
  .te-panel {
    border-top: var(--rule);
    border-bottom: var(--rule);
    border-radius: 4px 4px 0 0;
    background: var(--paper);
  }
  .bh-panel {
    border-top: var(--rule);
    border-bottom: var(--rule);
    border-radius: 0 0 4px 4px;
    position: relative;
  }
  .doc-sidebar {
    width: 180px;
    flex-shrink: 0;
    padding: 16px;
    border-right: var(--rule);
    display: flex;
    flex-direction: column;
  }
  .te-sidebar {
    background: var(--paper-sub);
  }
  .party-name {
    font-size: 12px;
    margin-bottom: 12px;
  }
  .te-name {
    font-weight: 700;
    color: var(--ink);
  }
  .te-position {
    font-size: 11px;
    font-weight: 700;
    background: var(--plate);
    color: white;
    padding: 4px 8px;
    border-radius: 2px;
    display: inline-block;
    width: fit-content;
    margin-bottom: 8px;
  }
  .te-ref {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .te-value,
  .bh-value {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .rejected-badge {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rejected-text {
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .doc-content {
    flex: 1;
    padding: 24px;
  }
  .argument-text {
    font-size: 16px;
    line-height: 1.75;
  }
  .sidebar-stamp {
    margin-top: auto;
    padding-top: 16px;
  }
  .draft-section {
    padding: 16px 24px;
    background: var(--draft-bg);
    border: 1.5px dashed var(--draft-border);
    border-radius: 4px;
    margin-top: 8px;
  }
  .draft-clickable {
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .draft-clickable:hover {
    border-color: var(--draft);
    background: color-mix(in srgb, var(--draft-bg) 80%, var(--draft) 5%);
  }
  .draft-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .draft-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .draft-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--draft);
  }
  .draft-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--draft);
    margin-left: 8px;
  }
  .draft-text {
    font-size: 15px;
    line-height: 1.65;
    font-style: italic;
    color: var(--draft);
  }
  /* ── Mobile ── */
  @media (max-width: 768px) {
    .read-content {
      padding: 20px 16px 120px;
    }
    .heading-text {
      font-size: 16px;
    }
    .doc-panel {
      flex-direction: column;
    }
    .doc-sidebar {
      width: 100%;
      padding: 12px 16px;
      border-right: none;
      border-bottom: var(--rule);
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .party-name {
      margin-bottom: 0;
    }
    .te-value,
    .bh-value {
      font-size: 18px;
    }
    .rejected-badge {
      gap: 6px;
    }
    .rejected-text {
      font-size: 13px;
    }
    .doc-content {
      padding: 16px;
    }
    .argument-text {
      font-size: 15px;
      line-height: 1.6;
    }
    .draft-section {
      padding: 16px;
    }
    .draft-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .draft-meta {
      flex-wrap: wrap;
      gap: 8px;
    }
  }
</style>
