<script lang="ts">
  import { Download, RotateCcw, X } from 'lucide-svelte';
  import LetterHtmlPreview from './LetterHtmlPreview.svelte';
  import { isSeksjonEdited, resetSeksjon } from './letterTypes';
  import type { BrevInnhold, BrevSeksjoner } from './letterTypes';

  let {
    brevInnhold,
    onclose,
  }: {
    brevInnhold: BrevInnhold;
    onclose: () => void;
  } = $props();

  let activeTab: 'editor' | 'preview' = $state('editor');
  let seksjoner: BrevSeksjoner = $state(structuredClone(brevInnhold.seksjoner));
  let isDownloading = $state(false);

  const currentBrev = $derived({
    ...brevInnhold,
    seksjoner,
  });

  const seksjonKeys = ['innledning', 'begrunnelse', 'avslutning'] as const;

  function handleReset(key: keyof BrevSeksjoner) {
    seksjoner[key] = resetSeksjon(seksjoner[key]);
  }

  async function downloadPdf() {
    isDownloading = true;
    try {
      const resp = await fetch('/api/letter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brev_innhold: {
            tittel: brevInnhold.tittel,
            mottaker: brevInnhold.mottaker,
            avsender: brevInnhold.avsender,
            referanser: {
              sak_id: brevInnhold.referanser.sakId,
              sakstittel: brevInnhold.referanser.sakstittel,
              event_id: brevInnhold.referanser.eventId,
              spor_type: brevInnhold.referanser.sporType,
              dato: brevInnhold.referanser.dato,
            },
            seksjoner: {
              innledning: seksjoner.innledning.redigertTekst,
              begrunnelse: seksjoner.begrunnelse.redigertTekst,
              avslutning: seksjoner.avslutning.redigertTekst,
            },
          },
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brev-${brevInnhold.referanser.sakId}-${brevInnhold.referanser.sporType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Backend may not be running in mockup mode
    } finally {
      isDownloading = false;
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="letter-backdrop" onclick={onclose}>
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="letter-modal" onclick={(e) => e.stopPropagation()}>
    <!-- Header -->
    <div class="letter-modal-header">
      <h3 class="letter-modal-title">{brevInnhold.tittel}</h3>
      <button class="letter-close-btn" onclick={onclose}>
        <X size={18} />
      </button>
    </div>

    <!-- Tabs -->
    <div class="letter-tabs">
      <button class="tab" class:on={activeTab === 'editor'} onclick={() => (activeTab = 'editor')}>
        Rediger
      </button>
      <button
        class="tab"
        class:on={activeTab === 'preview'}
        onclick={() => (activeTab = 'preview')}
      >
        Forhandsvis
      </button>
    </div>

    <!-- Content -->
    <div class="letter-modal-content">
      {#if activeTab === 'editor'}
        <div class="editor-sections">
          {#each seksjonKeys as key}
            {@const seksjon = seksjoner[key]}
            {@const edited = isSeksjonEdited(seksjon)}
            <div class="editor-section" class:editor-section-edited={edited}>
              <div class="editor-section-header">
                <label class="font-mono editor-label" for="letter-{key}">{seksjon.tittel}</label>
                {#if edited}
                  <button class="editor-reset" onclick={() => handleReset(key)}>
                    <RotateCcw size={12} /> Nullstill
                  </button>
                {/if}
              </div>
              <textarea
                id="letter-{key}"
                class="font-serif editor-textarea"
                bind:value={seksjon.redigertTekst}
                rows={key === 'begrunnelse' ? 8 : 4}
              ></textarea>
            </div>
          {/each}
        </div>
      {:else}
        <div class="preview-scroll">
          <LetterHtmlPreview brevInnhold={currentBrev} />
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="letter-modal-footer">
      <button class="btn btn-secondary" onclick={onclose}>Lukk</button>
      <button class="btn btn-primary" onclick={downloadPdf} disabled={isDownloading}>
        <Download size={14} />
        {isDownloading ? 'Laster ned...' : 'Last ned PDF'}
      </button>
    </div>
  </div>
</div>

<style>
  .letter-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 25, 23, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeUp 0.1s ease-out;
  }
  .letter-modal {
    width: 720px;
    max-width: 95vw;
    max-height: 90vh;
    background: var(--canvas);
    border: var(--rule);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--overlay-shadow-lg);
  }
  .letter-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: var(--rule);
  }
  .letter-modal-title {
    font-size: 14px;
    font-weight: 700;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .letter-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: none;
    color: var(--ink-3);
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .letter-close-btn:hover {
    background: var(--paper-inset);
    color: var(--ink);
  }
  .letter-tabs {
    display: flex;
    border-bottom: var(--rule);
    flex-shrink: 0;
  }
  .letter-modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  .letter-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: var(--rule);
    flex-shrink: 0;
  }

  /* Editor */
  .editor-sections {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .editor-section {
    border: var(--rule);
    border-radius: 4px;
    padding: 16px;
  }
  .editor-section-edited {
    border-color: var(--gold-border);
    background: var(--gold-bg);
  }
  .editor-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .editor-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .editor-reset {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: var(--gold);
    background: none;
    border: none;
    cursor: pointer;
  }
  .editor-reset:hover {
    color: var(--ink);
  }
  .editor-textarea {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    line-height: 1.6;
    background: var(--paper);
    border: var(--control-border);
    border-radius: 4px;
    color: var(--ink);
    outline: none;
    resize: vertical;
  }
  .editor-textarea:focus {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }

  /* Preview */
  .preview-scroll {
    overflow-x: auto;
  }
</style>
