<script lang="ts">
  import { ChevronDown, File as FileIcon, Upload, X, RefreshCw } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import Button from '$lib/components/primitives/Button.svelte';
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  import { getPartsNavn } from '$lib/utils/partsNavn';
  import { GRUNNLAG_RESULTAT_LABELS } from '$lib/constants/responseOptions';
  import LockedValueNode from '$lib/editor/LockedValueNode';

  import type { BegrunnelseEntry } from '$lib/types';

  interface Props {
    entries: BegrunnelseEntry[];
    bhBegrunnelseHtml: string;
    editorRolle?: 'TE' | 'BH';
    teNavn?: string;
    bhNavn?: string;
    activeTab?: 'begrunnelse' | 'historikk' | 'filer';
    ontabchange?: (tab: 'begrunnelse' | 'historikk' | 'filer') => void;
    submitLabel?: string;
    submitDisabled?: boolean;
    submitLoading?: boolean;
    submitError?: string | null;
    onsubmit?: () => void;
    onavbryt?: () => void;
    availableTags?: string[];
    showRegenerate?: boolean;
    onregenerate?: () => void;
    onuseredited?: () => void;
  }

  let {
    entries,
    bhBegrunnelseHtml = $bindable(''),
    editorRolle = 'BH',
    teNavn,
    bhNavn,
    activeTab = 'begrunnelse',
    ontabchange,
    submitLabel = 'Send svar',
    submitDisabled = false,
    submitLoading = false,
    submitError = null,
    onsubmit,
    onavbryt,
    availableTags = [],
    showRegenerate = false,
    onregenerate,
    onuseredited,
  }: Props = $props();

  const editorLabel = $derived(editorRolle === 'TE' ? 'Din reviderte begrunnelse' : 'Ditt svar');

  // --- Editor API for programmatic content updates ---
  let editorApi: { setContent: (html: string) => void } | undefined;
  let prevBhHtml: string | undefined = undefined;

  // Sync editor when bhBegrunnelseHtml changes from outside (auto-generation, regeneration)
  $effect(() => {
    if (editorApi && bhBegrunnelseHtml !== prevBhHtml) {
      editorApi.setContent(bhBegrunnelseHtml);
      prevBhHtml = bhBegrunnelseHtml;
    }
  });

  function handleEditorReady(api: { setContent: (html: string) => void }) {
    editorApi = api;
    // Sync any content that arrived before the editor was ready
    api.setContent(bhBegrunnelseHtml);
    prevBhHtml = bhBegrunnelseHtml;
  }

  function handleEditorChange(newHtml: string) {
    prevBhHtml = newHtml;
    bhBegrunnelseHtml = newHtml;
    onuseredited?.();
  }

  let charCount = $state(0);
  let collapsedEntries = $state<Set<number>>(new Set());

  function toggleEntry(index: number) {
    const next = new Set(collapsedEntries);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    collapsedEntries = next;
  }

  const tabs = [
    { id: 'begrunnelse' as const, label: 'Begrunnelse' },
    { id: 'historikk' as const, label: 'Historikk' },
    { id: 'filer' as const, label: 'Filer' },
  ];

  // --- Attachment state (local files, real API upload in later phase) ---
  interface Attachment {
    id: string;
    name: string;
    size: string;
    file: File;
    tags: Set<string>;
  }

  let attachments = $state<Attachment[]>([]);
  let fileInput: HTMLInputElement | undefined = $state();
  let dragOver = $state(false);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addFiles(files: FileList | File[]) {
    const newAttachments = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: formatFileSize(file.size),
      file,
      tags: new Set<string>(),
    }));
    attachments = [...attachments, ...newAttachments];
  }

  function removeAttachment(id: string) {
    attachments = attachments.filter((a) => a.id !== id);
  }

  function toggleTag(attachmentId: string, tag: string) {
    attachments = attachments.map((a) => {
      if (a.id !== attachmentId) return a;
      const next = new Set(a.tags);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return { ...a, tags: next };
    });
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      addFiles(input.files);
      input.value = '';
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  const filTabLabel = $derived(attachments.length > 0 ? `Filer (${attachments.length})` : 'Filer');
</script>

<aside class="begrunnelse-thread">
  <!-- Tabs -->
  <div class="thread-tabs" role="tablist">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:tab-active={activeTab === tab.id}
        role="tab"
        aria-selected={activeTab === tab.id}
        onclick={() => ontabchange?.(tab.id)}
      >
        {tab.id === 'filer' ? filTabLabel : tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'begrunnelse'}
    <div class="thread-content">
      <!-- Editor -->
      <section class="editor-section">
        <div class="editor-header">
          <h3 class="section-label">{editorLabel}</h3>
          <div class="editor-header-right">
            {#if showRegenerate}
              <button
                class="regenerate-btn"
                onclick={onregenerate}
                title="Regenerer fra skjemadata"
              >
                <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
                Regenerer
              </button>
            {/if}
            <span class="char-count">{charCount} tegn</span>
          </div>
        </div>
        <RichTextEditor
          body={bhBegrunnelseHtml}
          onchange={handleEditorChange}
          onready={handleEditorReady}
          extensions={[LockedValueNode]}
          maxHeight="none"
          oncharcount={(c) => (charCount = c)}
        />
        <button class="vedlegg-hint" onclick={() => ontabchange?.('filer')}>
          <FileIcon size={14} strokeWidth={1.5} aria-hidden="true" />
          Last opp vedlegg i Filer-fanen
          {#if attachments.length > 0}
            <span class="hint-count">{attachments.length}</span>
          {/if}
        </button>
      </section>

      <!-- Actions -->
      {#if onsubmit}
        <section class="action-section">
          {#if submitError}
            <div class="submit-error">{submitError}</div>
          {/if}
          <div class="action-buttons">
            {#if onavbryt}
              <Button variant="secondary" onclick={onavbryt}>Avbryt</Button>
            {/if}
            <Button
              variant="primary"
              disabled={submitDisabled}
              loading={submitLoading}
              onclick={onsubmit}
            >
              {submitLabel}
            </Button>
          </div>
        </section>
      {/if}
    </div>
  {:else if activeTab === 'historikk'}
    <div class="thread-content">
      {#if entries.length > 0}
        {#each entries as entry, i}
          <div class="entry">
            <button
              class="entry-header"
              onclick={() => toggleEntry(i)}
              aria-expanded={!collapsedEntries.has(i)}
            >
              <div class="entry-header-left">
                <span class="entry-partsnavn">{getPartsNavn(entry.rolle, teNavn, bhNavn)}</span>
                <span class="entry-versjon">v{entry.versjon}</span>
                {#if entry.resultat}
                  <span class="entry-resultat resultat-{entry.resultat}"
                    >{GRUNNLAG_RESULTAT_LABELS[entry.resultat] ?? entry.resultat}</span
                  >
                {/if}
                {#if entry.dato}
                  <span class="entry-dato">{formatDateShortNorwegian(entry.dato)}</span>
                {/if}
              </div>
              <ChevronDown
                class={`chevron${collapsedEntries.has(i) ? ' chevron-collapsed' : ''}`}
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </button>
            {#if !collapsedEntries.has(i)}
              <div class="entry-body">
                {@html entry.html}
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <div class="placeholder-content">
          <p class="placeholder-text">Ingen tidligere hendelser.</p>
        </div>
      {/if}
    </div>
  {:else if activeTab === 'filer'}
    <div class="thread-content filer-content">
      <!-- Hidden file input -->
      <input
        bind:this={fileInput}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        class="sr-only"
        onchange={handleFileSelect}
      />

      <!-- Upload zone -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="upload-zone"
        class:upload-zone-active={dragOver}
        role="button"
        tabindex="0"
        onclick={() => fileInput?.click()}
        onkeydown={(e) => {
          if (e.key === 'Enter') fileInput?.click();
        }}
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
      >
        <Upload class="upload-icon" size={20} strokeWidth={1.5} aria-hidden="true" />
        <span class="upload-tekst">Dra filer hit eller klikk for å laste opp</span>
        <span class="upload-format">PDF, DOCX, XLSX, JPG</span>
      </div>

      <!-- Attachment list -->
      {#if attachments.length > 0}
        <div class="attachment-list">
          {#each attachments as att (att.id)}
            <div class="attachment-item">
              <div class="att-header">
                <div class="att-info">
                  <FileIcon class="att-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span class="att-name">{att.name}</span>
                </div>
                <div class="att-actions">
                  <span class="att-size">{att.size}</span>
                  <button
                    class="att-remove"
                    onclick={() => removeAttachment(att.id)}
                    aria-label="Fjern {att.name}"
                  >
                    <X size={14} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {#if availableTags.length > 0}
                <div class="tag-row">
                  {#each availableTags as tag}
                    <button
                      class="tag-pill"
                      class:tag-active={att.tags.has(tag)}
                      onclick={() => toggleTag(att.id, tag)}
                    >
                      {tag}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="filer-empty">Ingen vedlegg lastet opp enda.</p>
      {/if}
    </div>
  {/if}
</aside>

<style>
  .begrunnelse-thread {
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background: var(--color-canvas);
    border-left: 1px solid var(--color-wire-strong);
  }

  /* --- Tabs --- */
  .thread-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-wire-strong);
    background: var(--color-canvas);
    position: sticky;
    top: 0;
    z-index: 1;
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: var(--spacing-3) var(--spacing-3);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: none;
    background: transparent;
    color: var(--color-ink-muted);
    cursor: pointer;
    transition:
      color 0.12s,
      border-color 0.12s;
    border-bottom: 2px solid transparent;
  }

  .tab-btn:hover {
    color: var(--color-ink-secondary);
  }

  .tab-active {
    color: var(--color-ink);
    border-bottom-color: var(--color-vekt);
  }

  /* --- Thread content --- */
  .thread-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  /* --- Entry (read-only begrunnelse block) --- */
  .entry {
    border-bottom: 1px solid var(--color-wire);
  }

  .entry-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: var(--font-ui);
  }

  .entry-header:hover {
    background: var(--color-felt-hover);
  }

  .entry-header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .entry-partsnavn {
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary);
  }

  .entry-versjon {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-muted);
  }

  .entry-dato {
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  .entry-resultat {
    font-family: var(--font-data);
    font-size: 10px;
    font-weight: 600;
    padding: 1px var(--spacing-1);
    border-radius: var(--radius-sm);
  }

  .resultat-godkjent {
    color: var(--color-score-high);
    background: var(--color-score-high-bg);
  }

  .resultat-avslatt {
    color: var(--color-score-low);
    background: var(--color-score-low-bg);
  }

  .resultat-frafalt {
    color: var(--color-ink-muted);
    background: var(--color-felt-raised);
  }

  .chevron {
    color: var(--color-ink-ghost);
    transition: transform 0.15s;
    flex-shrink: 0;
  }

  .chevron-collapsed {
    transform: rotate(-90deg);
  }

  .entry-body {
    padding: 0 var(--spacing-4) var(--spacing-4);
    font-family: var(--font-prose);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--color-ink-secondary);
  }

  .entry-body :global(p) {
    margin: 0 0 0.5em;
  }

  .entry-body :global(p:last-child) {
    margin-bottom: 0;
  }

  /* --- Editor section --- */
  .editor-section {
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    flex: 1;
    min-height: 0;
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--spacing-2);
    border-bottom: 1px solid var(--color-wire);
  }

  .editor-header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }

  .regenerate-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 2px var(--spacing-2);
    background: transparent;
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition:
      color 0.12s,
      border-color 0.12s,
      background 0.12s;
  }

  .regenerate-btn:hover {
    color: var(--color-ink);
    border-color: var(--color-ink-muted);
    background: var(--color-felt-hover);
  }

  .char-count {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
  }

  /* --- Vedlegg hint (in begrunnelse tab) --- */
  .vedlegg-hint {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 12px;
    color: var(--color-ink-muted);
    transition: color 0.12s;
  }

  .vedlegg-hint:hover {
    color: var(--color-ink);
  }

  .hint-count {
    font-family: var(--font-data);
    font-size: 10px;
    font-weight: 600;
    min-width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-wire-strong);
    color: var(--color-ink-secondary);
    border-radius: 9999px;
  }

  /* --- Filer tab --- */
  .filer-content {
    padding: var(--spacing-4);
    gap: var(--spacing-4);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-4);
    border: 1px dashed var(--color-wire-strong);
    border-radius: var(--radius-md);
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background-color 0.15s;
  }

  .upload-zone:hover,
  .upload-zone-active {
    border-color: var(--color-vekt-dim);
    background: var(--color-vekt-bg);
  }

  .upload-icon {
    color: var(--color-ink-ghost);
  }
  .upload-tekst {
    font-size: 13px;
  }
  .upload-format {
    font-size: 11px;
    color: var(--color-ink-muted);
  }

  /* --- Attachment list --- */
  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .attachment-item {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    padding: var(--spacing-3);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .att-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-2);
  }

  .att-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-width: 0;
  }

  .att-icon {
    color: var(--color-ink-ghost);
    flex-shrink: 0;
  }

  .att-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .att-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex-shrink: 0;
  }

  .att-size {
    font-family: var(--font-data);
    font-size: 10px;
    color: var(--color-ink-muted);
  }

  .att-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-ink-ghost);
    cursor: pointer;
    transition:
      color 0.12s,
      background 0.12s;
  }

  .att-remove:hover {
    color: var(--color-score-low);
    background: rgba(225, 29, 72, 0.1);
  }

  .tag-row {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .tag-pill {
    background: transparent;
    border: 1px solid var(--color-wire-strong);
    color: var(--color-ink-secondary);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4px 10px;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .tag-pill:hover {
    border-color: var(--color-ink-ghost);
    color: var(--color-ink);
  }

  .tag-pill.tag-active {
    background: var(--color-ink);
    color: var(--color-canvas);
    border-color: var(--color-ink);
  }

  .filer-empty {
    font-size: 13px;
    color: var(--color-ink-muted);
    margin: 0;
  }

  /* --- Action footer --- */
  .action-section {
    padding: var(--spacing-4);
    border-top: 1px solid var(--color-wire);
    margin-top: auto;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .submit-error {
    font-size: 12px;
    color: var(--color-score-low);
    margin-bottom: var(--spacing-3);
  }

  /* --- Placeholder --- */
  .placeholder-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
  }

  .placeholder-text {
    font-size: 13px;
    color: var(--color-ink-muted);
  }
</style>
