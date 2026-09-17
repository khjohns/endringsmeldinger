<!--
  The contractor's letter check before sending, in the page — not a modal. Same anatomy as the
  employer's approval step: the letter is the document, ApprovalPanel carries the send action.
  The contractor has no internal approval yet, so the panel never shows a chain.
-->
<script lang="ts">
  import { ArrowLeft, Send } from 'lucide-svelte';
  import type { LetterConfirmation } from '$lib/approval/claimReview.svelte';
  import ApprovalPanel from '$lib/components/approval/ApprovalPanel.svelte';
  import LetterHtmlPreview from './LetterHtmlPreview.svelte';

  let {
    review,
    stepLabel = 'Krav',
  }: {
    review: Pick<LetterConfirmation, 'letter' | 'confirm' | 'cancel'>;
    /** Name of the editing step the check returns to */
    stepLabel?: string;
  } = $props();
  let confirmed = $state(false);
  // The letter replaces the form in the same scroll container: start at its top.
  const toTop = (node: HTMLElement) => node.scrollIntoView?.({ block: 'start' });
  const recipient = $derived(review.letter?.mottaker.navn ?? 'byggherren');
</script>

{#if review.letter}
  <section class="letter-view" aria-label="Brevkontroll" use:toTop>
    <div class="toolbar">
      <button type="button" class="text-button" onclick={() => review.cancel()}
        ><ArrowLeft size={15} />Tilbake til kravet</button
      >
      <ol class="steps" aria-label="Fremdrift">
        <li>1 <span>{stepLabel}</span></li>
        <li class="current">2 <span>Kontroller og send</span></li>
      </ol>
    </div>
    <div class="layout">
      <div class="document">
        <LetterHtmlPreview brevInnhold={review.letter} />
      </div>
      <aside>
        <ApprovalPanel
          eyebrow="Utkast · ikke sendt"
          title="Du sender brevet"
          description="Brevet henter opplysninger og begrunnelse fra kravet. Endringer gjøres i skjemaet."
          content={{
            label: 'Innhold:',
            value: review.letter.tittel,
            actionLabel: 'Endre',
            onaction: () => review.cancel(),
          }}
          confirmLabel="Jeg har kontrollert brevet og vedleggene."
          bind:confirmed
          primaryLabel="Send til byggherren"
          onprimary={() => review.confirm()}
          footnote={`${recipient} får brevet straks. Innsendt brev kan ikke endres, bare følges opp med en ny revisjon.`}
        >
          {#snippet primaryIcon()}<Send size={15} />{/snippet}
        </ApprovalPanel>
      </aside>
    </div>
  </section>
{/if}

<style>
  .letter-view {
    scroll-margin-top: var(--mockup-topbar-height, 0px);
    padding: 20px 32px 64px;
    color: var(--ink);
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 20px;
    max-width: 1180px;
    margin: 0 auto 24px;
  }
  .steps {
    display: flex;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--ink-4);
  }
  .steps li {
    font-family: var(--font-data);
  }
  .steps span {
    font-family: var(--font-ui);
  }
  .steps .current {
    color: var(--ink);
    font-weight: 600;
  }
  .text-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    padding: 8px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    border-radius: 8px;
  }
  .text-button:hover {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .text-button:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
    max-width: 1180px;
    margin: 0 auto;
    align-items: start;
  }
  .document {
    min-width: 0;
    overflow-x: auto;
  }
  @media (max-width: 1000px) {
    .layout {
      grid-template-columns: 1fr;
    }
    aside :global(.approval-panel) {
      position: static;
    }
  }
  @media (max-width: 600px) {
    .letter-view {
      padding: 16px 12px 48px;
    }
  }
</style>
