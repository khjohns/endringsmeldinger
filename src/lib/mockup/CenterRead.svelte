<script lang="ts">
  import { XSquare, Pencil, ArrowRight } from 'lucide-svelte';
  import { TE, BH, S } from './data.js';
  import { fmt, act } from './utils.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import type { Track, TrackKey, Role } from './types.js';

  let {
    d,
    sel,
    role,
    onform,
  }: {
    d: Track;
    sel: TrackKey;
    role: Role;
    onform: (key: TrackKey) => void;
  } = $props();

  const isSub = $derived(sel !== 'ansvar');
</script>

<div class="read-content">
  <CaseAnchor />

  <div class="section-heading">
    <div class="heading-row">
      <d.icon size={18} style="color: var(--ink-2)" />
      <h2 class="heading-text">{d.num}. {d.label}{isSub ? ' (Sub.)' : ''}</h2>
    </div>
  </div>

  {#if isSub}
    <div style="margin-bottom: {S.section}px">
      <div class="sub-zone sub-notice">
        <Stamp variant="ochre" small>Subsidiært</Stamp>
        <p class="font-serif sub-notice-text">
          Ansvarsgrunnlaget er prinsipalt bestridt. Utmåling er utelukkende subsidiær — ingen
          erkjennelse av ansvar.
        </p>
      </div>
    </div>
  {/if}

  <div class={isSub ? 'sub-zone' : ''}>
    <div class="doc-panel te-panel">
      <div class="doc-sidebar te-sidebar">
        <div class="party-name te-name">{TE}</div>
        {#if d.type === 'binary'}
          <div class="font-mono te-position">{d.te.position?.toUpperCase()}</div>
          <div class="font-mono te-ref">{d.te.ref}</div>
        {:else}
          <div class="font-mono te-value">{fmt(d.te.value!)}{d.te.unit}</div>
        {/if}
      </div>
      <div class="doc-content">
        <p class="font-serif argument-text">{d.teT}</p>
      </div>
    </div>

    <div
      class="doc-panel bh-panel"
      style:background={d.status === 'disputed' ? 'var(--red-bg)' : 'var(--paper)'}
    >
      <div
        class="doc-sidebar bh-sidebar"
        style:background={d.status === 'disputed' ? 'var(--red)' : 'var(--paper-sub)'}
        style:color={d.status === 'disputed' ? 'white' : 'var(--ink)'}
      >
        <div
          class="party-name"
          style:font-weight={d.status === 'disputed' ? '700' : '500'}
          style:color={d.status === 'disputed' ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)'}
        >
          {BH}
        </div>
        {#if d.status === 'disputed'}
          <div class="rejected-badge">
            <XSquare size={18} />
            <span class="rejected-text">Avslått</span>
          </div>
          <div class="font-mono principally-disputed">PRINSIPALT BESTRIDT</div>
        {:else}
          <div class="font-mono bh-value">{fmt(d.bh.subsidiaer!)}{d.bh.unit}</div>
        {/if}
      </div>
      <div class="doc-content" style="position: relative">
        {#if d.status === 'disputed'}
          <div class="stamp-position">
            <Stamp variant="red">Bestridt</Stamp>
          </div>
        {/if}
        {#if d.status === 'subsidiary'}
          <div class="stamp-position">
            <Stamp variant="ochre">Subsidiært</Stamp>
          </div>
        {/if}
        <div
          class="bh-argument-box"
          style:background={d.status === 'disputed'
            ? 'rgba(255,255,255,0.5)'
            : 'var(--paper-inset)'}
          style:margin-top={d.status ? `${S.section}px` : '0'}
        >
          <p
            class="font-serif argument-text"
            style:color={d.status === 'disputed' ? 'var(--red)' : 'var(--ink-2)'}
          >
            {d.bhT}
          </p>
        </div>
      </div>
    </div>

    {#if d.draft}
      <div class="draft-section">
        <div class="draft-header">
          <div class="draft-meta">
            <Stamp variant="draft" small>Kladd</Stamp>
            <Pencil size={12} style="color: var(--draft)" />
            <span class="draft-label">Internt — ikke synlig for motpart</span>
            {#if d.draft.value}
              <span class="font-mono draft-value">{fmt(d.draft.value)},-</span>
            {/if}
          </div>
          <button class="btn btn-secondary btn-sm" onclick={() => onform(sel)}>
            <Pencil size={12} /> Fortsett
          </button>
        </div>
        <p class="font-serif draft-text">{d.draft.text}</p>
      </div>
    {/if}

    {#if !d.draft}
      <div class="action-row">
        <button class="btn btn-primary" onclick={() => onform(sel)}>
          {act(d.draftState, role)}
          <ArrowRight size={14} />
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .read-content {
    max-width: 840px;
    margin: 0 auto;
    padding: 40px 40px 120px;
  }
  .section-heading {
    border-bottom: 2px solid var(--ochre);
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
  .sub-notice {
    background: var(--ochre-bg);
    padding: 16px 20px;
    border: var(--rule-subtle);
  }
  .sub-notice-text {
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
    font-style: italic;
    margin-top: 8px;
  }
  .doc-panel {
    display: flex;
    border-left: var(--rule);
    border-right: var(--rule);
  }
  .te-panel {
    border-top: var(--edge);
    border-bottom: var(--rule);
    background: var(--paper);
  }
  .bh-panel {
    border-top: var(--edge);
    border-bottom: var(--rule);
    position: relative;
  }
  .doc-sidebar {
    width: 180px;
    flex-shrink: 0;
    padding: 20px;
    border-right: var(--edge);
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
    padding: 3px 8px;
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
  .principally-disputed {
    font-size: 9px;
    font-weight: 700;
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    opacity: 0.8;
  }
  .doc-content {
    flex: 1;
    padding: 24px;
  }
  .argument-text {
    font-size: 17px;
    line-height: 1.75;
  }
  .stamp-position {
    position: absolute;
    top: 16px;
    right: 20px;
  }
  .bh-argument-box {
    border: var(--rule-subtle);
    padding: 20px;
  }
  .draft-section {
    padding: 20px 24px;
    background: var(--draft-bg);
    border: 2px dashed var(--draft-border);
    margin-top: 8px;
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
  .action-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
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
      border-bottom: var(--edge);
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
    .principally-disputed {
      margin-top: 0;
      padding-top: 0;
      border-top: none;
      margin-left: auto;
    }
    .doc-content {
      padding: 16px;
    }
    .argument-text {
      font-size: 15px;
      line-height: 1.6;
    }
    .stamp-position {
      top: 12px;
      right: 12px;
    }
    .bh-argument-box {
      padding: 12px;
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
    .sub-notice {
      margin-left: 0;
      padding-left: 16px;
    }
  }
</style>
