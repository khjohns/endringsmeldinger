<!--
  The contractor's letter check before sending on the Python path, in Brevskall: the letter is the
  document. The contractor has no internal approval yet, so the panel never shows a chain.
-->
<script lang="ts">
  import type { LetterConfirmation } from '$lib/approval/claimReview.svelte';
  import Brevskall from '$lib/components/approval/Brevskall.svelte';
  import LetterHtmlPreview from './LetterHtmlPreview.svelte';

  let {
    review,
    stepLabel = 'Krav',
  }: {
    review: Pick<LetterConfirmation, 'letter' | 'confirm' | 'cancel'>;
    /** Name of the editing step the check returns to */
    stepLabel?: string;
  } = $props();
  const recipient = $derived(review.letter?.mottaker.navn ?? 'byggherren');
  const tilTe = $derived(review.letter?.mottaker.rolle === 'TE');
</script>

{#if review.letter}
  {@const letter = review.letter}
  <Brevskall
    tilbakeTekst={tilTe ? 'Tilbake til skjemaet' : 'Tilbake til kravet'}
    steg={stepLabel}
    panel={{
      title: 'Du sender brevet',
      description: `Brevet henter opplysninger og begrunnelse fra ${tilTe ? 'skjemaet' : 'kravet'}. Endringer gjøres i skjemaet.`,
      content: {
        label: 'Innhold:',
        value: letter.tittel,
        actionLabel: 'Endre',
        onaction: () => review.cancel(),
      },
      confirmLabel: 'Jeg har kontrollert brevet og vedleggene.',
      primaryLabel: tilTe ? 'Send til entreprenøren' : 'Send til byggherren',
      footnote: `${recipient} får brevet straks. Innsendt brev kan ikke endres, bare følges opp med en ny revisjon.`,
    }}
    onsend={() => review.confirm()}
    onavbryt={() => review.cancel()}
  >
    {#snippet dokument()}<LetterHtmlPreview brevInnhold={letter} />{/snippet}
  </Brevskall>
{/if}
