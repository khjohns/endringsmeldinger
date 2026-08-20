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
    FileText,
  } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { S, sporBestemmelser } from './data.js';
  import { getEventTypeLabel } from '$lib/constants/eventTypeLabels.js';
  import type { SporKey, Mode, RightTab } from './types.js';
  import type { TimelineEvent } from '$lib/types/timeline';

  let {
    sel,
    mode,
    tab,
    begr,
    activeEvent = null,
    ontabchange,
    onbegrchange,
    onclose,
    oneventclick,
    onletterclick,
  }: {
    sel: SporKey;
    mode: Mode;
    tab: RightTab;
    begr: string;
    activeEvent?: TimelineEvent | null;
    ontabchange: (t: RightTab) => void;
    onbegrchange: (v: string) => void;
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
    begrunnelse: 'Begrunnelse',
    filer: 'Filer',
  };

  const toolbarIcons = [Bold, Italic, List, ListOrdered, RotateCcw, RotateCw];
</script>

{#snippet attList(showPages: boolean)}
  {#each ui.att as v}
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
      <button class="mobile-close-btn" onclick={onclose} aria-label="Lukk panel">✕</button>
    {/if}
  </div>

  <div class="tab-content">
    {#if tab === 'bestemmelser'}
      {#each best as b}
        <div class="best-card" style="margin-bottom: {S.lg}px">
          <div class="font-mono best-ref">{b.ref} {b.title}</div>
          <p class="best-text">{b.text}</p>
          {#if b.note}
            <p class="best-note">{b.note}</p>
          {/if}
        </div>
      {/each}
    {/if}

    {#if tab === 'historikk'}
      <div class="history" style="position: relative">
        <div class="history-line"></div>
        {#each store.timeline as event, i}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div
            class="history-event"
            class:history-event-active={activeEvent?.id === event.id}
            class:history-event-clickable={!!oneventclick}
            class:history-event-first={i === 0}
            onclick={() => oneventclick?.(event)}
          >
            <div
              class="event-marker font-mono"
              style:background={event.actorrole === 'TE' ? 'var(--brand)' : 'var(--surface)'}
              style:color={event.actorrole === 'TE' ? 'white' : 'var(--ink)'}
              style:border-color={event.actorrole === 'TE' ? 'var(--brand)' : 'var(--ink-3)'}
            >
              {event.actorrole ?? '?'}
            </div>
            <div class="event-time font-mono">
              {event.time
                ? new Date(event.time).toLocaleString('nb-NO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  })
                : ''}
            </div>
            <div class="event-subject">
              {getEventTypeLabel(event.type?.replace('no.oslo.koe.', '') ?? '')}
            </div>
            {#if event.summary}
              <div class="event-detail">{event.summary}</div>
            {/if}
            {#if onletterclick}
              <button
                class="event-letter-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  onletterclick!(event);
                }}
              >
                <FileText size={11} /> Brev
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if tab === 'vedlegg'}
      {@render attList(true)}

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

      <button class="dashed-action-btn">
        <Plus size={14} /> Nytt notat
      </button>
    {/if}

    {#if tab === 'begrunnelse'}
      <div class="reasoning-header">
        <span class="reasoning-label">Ditt svar</span>
        <span class="font-mono reasoning-count">{begr.length} tegn</span>
      </div>
      <textarea
        value={begr}
        oninput={(e) => onbegrchange(e.currentTarget.value)}
        placeholder="Skriv din begrunnelse her..."
        class="reasoning-textarea"
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
    width: 330px;
    flex-shrink: 0;
    border-left: 1px solid #d9d5cc;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface);
  }
  .tab-bar {
    display: flex;
    flex-shrink: 0;
    border-bottom: 1px solid #d9d5cc;
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
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .best-text {
    font-size: 15px;
    line-height: 1.6;
    color: var(--ink-2);
  }
  .best-note {
    font-size: 14px;
    line-height: 1.5;
    color: var(--green);
    margin-top: 12px;
  }

  /* Historikk */
  .history-line {
    position: absolute;
    left: 10px;
    top: 8px;
    bottom: 0;
    width: 1px;
    background: #d9d5cc;
  }
  .history-event {
    position: relative;
    padding-left: 36px;
    margin-bottom: 20px;
    transition: opacity 100ms;
    opacity: 0.5;
  }
  .history-event-first,
  .history-event-active {
    opacity: 1;
  }
  .history-event:hover {
    opacity: 1;
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
    font-size: 10px;
    font-weight: 700;
    z-index: 1;
    border: 1.5px solid;
    border-radius: 4px;
  }
  .event-time {
    font-size: 11px;
    color: var(--ink-4);
    margin-bottom: 2px;
  }
  .event-subject {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .event-detail {
    font-size: 14px;
    color: var(--ink-3);
  }
  .history-event-clickable {
    cursor: pointer;
    border-radius: 4px;
    padding-right: 8px;
    transition:
      background 80ms,
      opacity 100ms;
  }
  .history-event-clickable:hover {
    background: var(--surface-inset);
  }
  .history-event-active {
    background: var(--gold-bg);
    border-left: 2px solid var(--accent);
    padding-left: 34px;
  }
  .history-event-active .event-marker {
    border-color: var(--accent);
  }
  .event-letter-btn {
    display: none;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--ink-3);
    background: var(--surface);
    border: var(--rule);
    border-radius: 3px;
    cursor: pointer;
    transition: all 80ms;
  }
  .event-letter-btn:hover {
    color: var(--ink);
    border-color: var(--ink-3);
  }
  .history-event:hover .event-letter-btn {
    display: inline-flex;
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
  .dashed-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 12px;
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font-sans);
    color: var(--ink-3);
    background: var(--surface);
    border: 1.5px dashed var(--ink-4);
    border-radius: 4px;
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
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--ink-3);
  }
  .reasoning-count {
    font-size: 12px;
    color: var(--ink-4);
  }
  .reasoning-textarea {
    flex: 1;
    width: 100%;
    padding: 16px;
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.65;
    resize: none;
    background: var(--surface);
    border: var(--control-border);
    border-radius: 4px;
    color: var(--ink);
    outline: none;
    min-height: 280px;
    transition: border-color 120ms;
  }
  .reasoning-textarea:focus {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
  .toolbar {
    display: flex;
    gap: 2px;
    margin-top: 12px;
    padding: 4px;
    background: var(--surface-inset);
    border: var(--rule-subtle);
    border-radius: 4px;
  }
  .toolbar-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink-4);
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    transition:
      color 80ms,
      background 80ms;
  }
  .toolbar-btn:hover {
    color: var(--ink);
    background: var(--surface);
  }
  .upload-hint {
    font-size: 12px;
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
