<script lang="ts">
  import { RefreshCw } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import Button from '$lib/components/primitives/Button.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { isHtmlEmpty } from '$lib/utils/formatters';

  interface Props {
    /** Bindable HTML content */
    html: string;
    /** Label above editor */
    label?: string;
    /** Show regenerate button */
    showRegenerate?: boolean;
    onregenerate?: () => void;
    /** Called when user manually edits content */
    onuseredited?: () => void;
    /** Submit controls */
    submitLabel?: string;
    submitDisabled?: boolean;
    submitLoading?: boolean;
    submitError?: string | null;
    onsubmit?: () => void;
    onavbryt?: () => void;
  }

  let {
    html = $bindable(''),
    label = 'Begrunnelse',
    showRegenerate = false,
    onregenerate,
    onuseredited,
    submitLabel = 'Send svar',
    submitDisabled = false,
    submitLoading = false,
    submitError = null,
    onsubmit,
    onavbryt,
  }: Props = $props();

  // --- Editor API for programmatic content updates ---
  let editorApi: { setContent: (html: string) => void } | undefined;
  let prevHtml: string | undefined = undefined;

  // Sync editor when html changes from outside (auto-generation, regeneration)
  $effect(() => {
    if (editorApi && html !== prevHtml) {
      editorApi.setContent(html);
      prevHtml = html;
    }
  });

  function handleEditorReady(api: { setContent: (html: string) => void }) {
    editorApi = api;
    api.setContent(html);
    prevHtml = html;
  }

  function handleEditorChange(newHtml: string) {
    prevHtml = newHtml;
    html = newHtml;
    onuseredited?.();
  }

  let charCount = $state(0);

  const harInnhold = $derived(!isHtmlEmpty(html));
</script>

<section class="inline-begrunnelse">
  <div class="begrunnelse-header">
    <SectionHeading title={label} />
    <div class="header-right">
      {#if showRegenerate}
        <button class="regenerate-btn" onclick={onregenerate} title="Regenerer fra skjemadata">
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          Regenerer
        </button>
      {/if}
      <span class="char-count">{charCount} tegn</span>
    </div>
  </div>

  <div class="editor-wrapper">
    <RichTextEditor
      body={html}
      onchange={handleEditorChange}
      onready={handleEditorReady}
      extensions={[LockedValueNode]}
      maxHeight="none"
      oncharcount={(c) => (charCount = c)}
    />
  </div>

  <!-- Actions -->
  {#if onsubmit}
    <div class="action-section">
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
    </div>
  {/if}
</section>

<style>
  .inline-begrunnelse {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .begrunnelse-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-3);
  }

  /* Let SectionHeading take full width of its side */
  .begrunnelse-header :global(.section-heading) {
    flex: 1;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex-shrink: 0;
    padding-bottom: var(--spacing-2);
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

  .editor-wrapper {
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  /* --- Action footer --- */
  .action-section {
    padding-top: var(--spacing-3);
    border-top: 1px solid var(--color-wire);
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
</style>
