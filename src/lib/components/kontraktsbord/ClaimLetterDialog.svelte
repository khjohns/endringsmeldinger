<script lang="ts">
  import { onMount } from 'svelte';
  import type { LetterConfirmation } from '$lib/approval/claimReview.svelte';
  import LetterHtmlPreview from './LetterHtmlPreview.svelte';
  let { review }: { review: Pick<LetterConfirmation, 'letter' | 'confirm' | 'cancel'> } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => dialog.showModal());
</script>

<dialog bind:this={dialog} oncancel={() => review.cancel()} aria-labelledby="claim-letter-title">
  <header>
    <div>
      <span>Utkast · ikke sendt</span>
      <h2 id="claim-letter-title">Kontroller brevet før sending</h2>
    </div>
    <button class="btn btn-secondary" onclick={() => review.cancel()}>Tilbake til kravet</button>
  </header>
  <div class="content">
    {#if review.letter}<LetterHtmlPreview brevInnhold={review.letter} />{/if}
  </div>
  <footer>
    <p>Brevet henter opplysninger og begrunnelse fra kravet. Endringer gjøres i skjemaet.</p>
    <button class="btn btn-primary" onclick={() => review.confirm()}>Send til byggherren</button>
  </footer>
</dialog>

<style>
  dialog {
    width: min(960px, 96vw);
    max-width: 96vw;
    height: 94vh;
    max-height: 94vh;
    padding: 0;
    border: var(--rule);
    border-radius: 12px;
    color: var(--ink);
    background: var(--canvas);
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
  }
  dialog::backdrop {
    background: rgb(20 30 24 / 55%);
  }
  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 24px;
  }
  header {
    border-bottom: var(--rule);
  }
  header span {
    font-size: 11px;
    color: var(--ink-3);
  }
  h2 {
    margin: 4px 0 0;
    font-size: 18px;
  }
  .content {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }
  footer {
    border-top: var(--rule);
  }
  footer p {
    font-size: 12px;
    max-width: 420px;
    line-height: 1.6;
    color: var(--ink-3);
  }
  @media (max-width: 600px) {
    header,
    footer {
      flex-wrap: wrap;
    }
    .content {
      padding: 12px;
    }
  }
</style>
