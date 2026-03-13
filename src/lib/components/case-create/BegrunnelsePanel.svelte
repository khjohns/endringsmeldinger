<script lang="ts">
  import { ChevronLeft, Upload } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import Button from '$lib/components/primitives/Button.svelte';

  interface Props {
    placeholder: string;
    html: string;
    onclose?: () => void;
    overlay?: boolean;
    submitLabel?: string;
    submitDisabled?: boolean;
    submitLoading?: boolean;
    submitError?: string;
    onsubmit?: () => void;
    onavbryt?: () => void;
  }

  let {
    placeholder,
    html = $bindable(),
    onclose,
    overlay = false,
    submitLabel = 'Opprett sak',
    submitDisabled = false,
    submitLoading = false,
    submitError = '',
    onsubmit,
    onavbryt,
  }: Props = $props();

  let charCount = $state(0);
</script>

<aside class="begrunnelse-panel" class:overlay>
  {#if overlay}
    <button class="panel-tilbake" onclick={onclose}>
      <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />
      Tilbake til skjema
    </button>
  {/if}

  <!-- Begrunnelse -->
  <section class="panel-section editor-section">
    <div class="panel-header">
      <h3 class="panel-label">Begrunnelse for kravet</h3>
      <span class="char-count">{charCount} tegn</span>
    </div>
    <RichTextEditor {placeholder} bind:html maxHeight="none" oncharcount={(c) => (charCount = c)} />
  </section>

  <!-- Vedlegg -->
  <section class="panel-section">
    <div class="panel-header">
      <h3 class="panel-label">Vedlegg</h3>
    </div>
    <div class="upload-zone">
      <Upload class="upload-icon" size={20} strokeWidth={1.5} aria-hidden="true" />
      <span class="upload-tekst">Dra filer hit eller klikk for å laste opp</span>
      <span class="upload-format">PDF, DOCX, XLSX, JPG</span>
    </div>
  </section>

  <!-- Handlinger -->
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
</aside>

<style>
  .begrunnelse-panel {
    height: 100%;
    overflow-y: auto;
    border-left: 1px solid var(--color-wire-strong);
    background: var(--color-canvas);
    display: flex;
    flex-direction: column;
  }

  .begrunnelse-panel.overlay {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 30;
    border-left: none;
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

  .panel-section {
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .editor-section {
    flex: 1;
    min-height: 0;
  }

  .panel-section + .panel-section {
    border-top: 1px solid var(--color-wire);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--spacing-2);
    border-bottom: 1px solid var(--color-wire);
  }

  .panel-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-ink-muted);
    margin: 0;
  }

  .char-count {
    font-size: 11px;
    font-family: var(--font-data);
    color: var(--color-ink-muted);
    font-variant-numeric: tabular-nums;
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

  /* --- Upload zone --- */
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3);
    border: 1px dashed var(--color-wire-strong);
    border-radius: var(--radius-md);
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background-color 0.15s;
  }

  .upload-zone:hover {
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
</style>
