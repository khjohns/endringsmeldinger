<script lang="ts">
  import { Download, X } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import LetterHtmlPreview from './LetterHtmlPreview.svelte';
  import type { BrevInnhold } from './letterTypes';
  let {
    brevInnhold,
    onclose,
    draft = false,
  }: { brevInnhold: BrevInnhold; onclose: () => void; draft?: boolean } = $props();
  let dialog: HTMLDialogElement;
  let isDownloading = $state(false);
  let error = $state('');
  onMount(() => dialog.showModal());
  async function downloadPdf() {
    isDownloading = true;
    error = '';
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/letter/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brev_innhold: {
            tittel: `${draft ? 'UTKAST – ' : ''}${brevInnhold.tittel}`,
            mottaker: brevInnhold.mottaker,
            avsender: brevInnhold.avsender,
            referanser: {
              sak_id: brevInnhold.referanser.sakId,
              sakstittel: brevInnhold.referanser.sakstittel,
              event_id: brevInnhold.referanser.eventId,
              spor_type: brevInnhold.referanser.sporType,
              dato: brevInnhold.referanser.dato,
            },
            seksjoner: Object.fromEntries(
              Object.entries(brevInnhold.seksjoner).map(([key, value]) => [
                key,
                value.redigertTekst,
              ])
            ),
          },
        }),
      });
      if (!resp.ok) throw new Error('PDF-en kunne ikke genereres. Prøv igjen.');
      const url = URL.createObjectURL(await resp.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draft ? 'utkast-' : ''}brev-${brevInnhold.referanser.sakId}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Nedlasting feilet.';
    } finally {
      isDownloading = false;
    }
  }
</script>

<dialog bind:this={dialog} class="letter-modal" {onclose} aria-labelledby="letter-title">
  <header>
    <div>
      <span>{draft ? 'Utkast – ikke sendt' : 'Brev fra sakshistorikken'}</span>
      <h2 id="letter-title">{brevInnhold.tittel}</h2>
    </div>
    <button aria-label="Lukk brev" onclick={onclose}><X size={20} /></button>
  </header>
  <div class="preview-scroll"><LetterHtmlPreview {brevInnhold} /></div>
  <footer>
    {#if error}<p role="alert">{error}</p>{/if}<button class="btn btn-secondary" onclick={onclose}
      >Lukk</button
    ><button class="btn btn-primary" onclick={downloadPdf} disabled={isDownloading}
      ><Download size={14} />{isDownloading
        ? 'Laster ned …'
        : draft
          ? 'Last ned utkast'
          : 'Last ned PDF'}</button
    >
  </footer>
</dialog>

<style>
  .letter-modal {
    width: min(960px, 96vw);
    max-width: 96vw;
    height: 94vh;
    max-height: 94vh;
    padding: 0;
    background: var(--canvas);
    color: var(--ink);
    border: var(--rule);
    border-radius: 12px;
  }
  .letter-modal[open] {
    display: flex;
    flex-direction: column;
  }
  .letter-modal::backdrop {
    background: rgb(20 30 24 / 55%);
  }
  header {
    padding: 18px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    border-bottom: var(--rule);
  }
  header span {
    font-size: 11px;
    color: var(--ink-3);
  }
  h2 {
    font-size: 16px;
    margin: 4px 0 0;
  }
  header button {
    border: 0;
    background: transparent;
    color: inherit;
    padding: 10px;
    cursor: pointer;
  }
  .preview-scroll {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }
  footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    padding: 16px 24px;
    border-top: var(--rule);
  }
  footer p {
    color: var(--danger);
    font-size: 12px;
    margin-right: auto;
  }
  @media (max-width: 768px) {
    .preview-scroll {
      padding: 12px;
    }
    footer {
      flex-wrap: wrap;
    }
  }
</style>
