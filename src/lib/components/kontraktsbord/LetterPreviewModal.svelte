<script lang="ts">
  import { X } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import LetterHtmlPreview from './LetterHtmlPreview.svelte';
  import type { BrevInnhold } from './letterTypes';
  let {
    brevInnhold,
    onclose,
    draft = false,
  }: { brevInnhold: BrevInnhold; onclose: () => void; draft?: boolean } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => dialog.showModal());
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
    <button class="btn btn-secondary" onclick={onclose}>Lukk</button>
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
  @media (max-width: 768px) {
    .preview-scroll {
      padding: 12px;
    }
    footer {
      flex-wrap: wrap;
    }
  }
</style>
