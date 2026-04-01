<script lang="ts">
  import {
    Paperclip,
    ExternalLink,
    Plus,
    Pencil,
    Upload,
    Bold,
    Italic,
    List,
    ListOrdered,
    RotateCcw,
    RotateCw,
  } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { S } from './data.js';
  import DateSeparator from './DateSeparator.svelte';
  import type { Track, Mode, RightTab } from './types.js';

  let {
    d,
    mode,
    tab,
    begr,
    ontabchange,
    onbegrchange,
    onclose,
  }: {
    d: Track;
    mode: Mode;
    tab: RightTab;
    begr: string;
    ontabchange: (t: RightTab) => void;
    onbegrchange: (v: string) => void;
    onclose?: () => void;
  } = $props();

  const readTabs: RightTab[] = ['bestemmelser', 'historikk', 'vedlegg'];
  const formTabs: RightTab[] = ['bestemmelser', 'historikk', 'filer'];
  const tabs = $derived(mode === 'read' ? readTabs : formTabs);

  const tabLabels: Record<RightTab, string> = {
    bestemmelser: 'Bestemmelser',
    historikk: 'Historikk',
    vedlegg: 'Vedlegg',
    begrunnelse: 'Begrunnelse',
    filer: 'Filer',
  };

  const toolbarIcons = [Bold, Italic, List, ListOrdered, RotateCcw, RotateCw];
</script>

{#snippet attList(showPages: boolean)}
  {#each d.att as v}
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
    {#each tabs as t}
      <button class="tab" class:on={tab === t} onclick={() => ontabchange(t)}>
        {tabLabels[t]}
      </button>
    {/each}
    {#if onclose}
      <button class="mobile-close-btn" onclick={onclose}>✕</button>
    {/if}
  </div>

  <div class="tab-content">
    {#if tab === 'bestemmelser'}
      {#each d.best as b}
        <div class="best-card" style="margin-bottom: {S.lg}px">
          <div class="font-mono best-ref">{b.ref} {b.title}</div>
          <p class="font-serif best-text">{b.text}</p>
          {#if b.note}
            <p class="font-serif best-note">{b.note}</p>
          {/if}
        </div>
      {/each}
    {/if}

    {#if tab === 'historikk'}
      <div class="history" style="position: relative">
        <div class="history-line"></div>
        {#each Object.entries(store.evtGrouped) as [date, events], gi}
          <DateSeparator {date} />
          {#each events as e}
            <div
              class="history-event"
              style="opacity: {gi === 0 ? 1 : 0.5}"
              onmouseenter={(ev) => {
                ev.currentTarget.style.opacity = '1';
              }}
              onmouseleave={(ev) => {
                ev.currentTarget.style.opacity = gi === 0 ? '1' : '0.5';
              }}
            >
              <div
                class="font-mono event-marker"
                style:background={e.a === 'TE' ? 'var(--plate)' : 'var(--paper)'}
                style:color={e.a === 'TE' ? 'white' : 'var(--ink)'}
              >
                {e.a}
              </div>
              <div class="font-mono event-time">{e.t}</div>
              <div class="event-subject">{e.n}: {e.s}</div>
              <div class="event-detail">{e.x}</div>
            </div>
          {/each}
        {/each}
      </div>
    {/if}

    {#if tab === 'vedlegg'}
      {@render attList(true)}

      {#if d.note}
        <div class="note-sep"></div>
        <div class="internal-note">
          <div class="note-header">
            <Pencil size={11} style="color: var(--draft)" />
            <span class="font-mono note-date">{d.note.d}</span>
            <span class="note-label">Internt</span>
          </div>
          <p class="font-serif note-text">{d.note.t}</p>
        </div>
      {/if}

      <button class="dashed-action-btn">
        <Plus size={14} /> Nytt notat
      </button>
    {/if}

    {#if tab === 'begrunnelse'}
      <div class="reasoning-header">
        <span class="font-mono reasoning-label">Ditt svar</span>
        <span class="font-mono reasoning-count">{begr.length} tegn</span>
      </div>
      <textarea
        value={begr}
        oninput={(e) => onbegrchange(e.currentTarget.value)}
        placeholder="Skriv din begrunnelse her..."
        class="font-serif reasoning-textarea"
      ></textarea>
      <div class="toolbar">
        {#each toolbarIcons as Icon}
          <button class="toolbar-btn">
            <Icon size={14} />
          </button>
        {/each}
      </div>
      <p class="upload-hint">
        <Upload size={14} /> Last opp vedlegg i Filer-fanen
      </p>
    {/if}

    {#if tab === 'filer'}
      {@render attList(false)}
      <button class="dashed-action-btn" style="margin-top: 16px; padding: 12px 16px">
        <Upload size={14} /> Last opp nytt vedlegg
      </button>
    {/if}
  </div>
</aside>

<style>
  .right-sidebar {
    width: 300px;
    flex-shrink: 0;
    border-left: var(--edge);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--paper);
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
  }

  /* Bestemmelser */
  .best-ref {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .best-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  .best-note {
    font-size: 13px;
    line-height: 1.5;
    color: var(--ochre);
    font-style: italic;
    margin-top: 12px;
  }

  /* Historikk */
  .history-line {
    position: absolute;
    left: 10px;
    top: 8px;
    bottom: 0;
    width: 2px;
    background: rgba(28, 25, 23, 0.06);
  }
  .history-event {
    position: relative;
    padding-left: 36px;
    margin-bottom: 20px;
    transition: opacity 100ms;
  }
  .event-marker {
    position: absolute;
    left: 0;
    top: 1px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    z-index: 1;
    border: 2px solid var(--plate);
  }
  .event-time {
    font-size: 10px;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .event-subject {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .event-detail {
    font-size: 12px;
    color: var(--ink-3);
  }

  /* Vedlegg */
  .att-info {
    flex: 1;
    min-width: 0;
  }
  .att-name {
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .att-pages {
    font-size: 10px;
    color: var(--ink-4);
  }
  .note-sep {
    height: 1px;
    background: var(--ochre-border);
    margin: 16px 0;
    opacity: 0.5;
  }
  .internal-note {
    padding: 12px;
    background: var(--draft-bg);
    border: 2px dashed var(--draft-border);
  }
  .note-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .note-date {
    font-size: 9px;
    font-weight: 700;
    color: var(--draft);
  }
  .note-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--draft);
  }
  .note-text {
    font-size: 13px;
    line-height: 1.5;
    font-style: italic;
    color: var(--draft);
  }
  .dashed-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 12px;
    width: 100%;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-3);
    background: var(--paper);
    border: 2px dashed var(--ink-4);
    cursor: pointer;
    transition: all 80ms;
  }
  .dashed-action-btn:hover {
    border-color: var(--ink);
    color: var(--ink);
  }

  /* Begrunnelse */
  .reasoning-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .reasoning-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .reasoning-count {
    font-size: 10px;
    color: var(--ink-4);
  }
  .reasoning-textarea {
    flex: 1;
    width: 100%;
    padding: 16px;
    font-size: 15px;
    line-height: 1.65;
    resize: none;
    background: var(--paper);
    border: var(--rule);
    color: var(--ink);
    outline: none;
    min-height: 280px;
    transition: border-color 120ms;
  }
  .reasoning-textarea:focus {
    border-color: rgba(28, 25, 23, 0.3);
  }
  .toolbar {
    display: flex;
    gap: 2px;
    margin-top: 12px;
    padding: 4px;
    background: var(--paper);
    border: var(--rule-subtle);
  }
  .toolbar-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-4);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 80ms;
  }
  .toolbar-btn:hover {
    color: var(--ink);
  }
  .upload-hint {
    font-size: 11px;
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-4);
  }
  .mobile-close-btn {
    display: none;
    margin-left: auto;
    padding: 8px 14px;
    font-size: 16px;
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
      border-top: var(--edge);
    }
    .mobile-close-btn {
      display: block;
    }
  }
</style>
