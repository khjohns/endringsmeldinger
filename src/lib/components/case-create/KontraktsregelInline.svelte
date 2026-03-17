<script lang="ts">
  import { getKontraktsregel } from '$lib/constants/kontraktsregler';

  interface Props {
    /** §-referanse uten §-tegn, f.eks. "32.1" */
    hjemmelRef: string;
    /** Fallback-tittel hvis ingen regeltekst finnes */
    tittel?: string;
    /** Fallback-beskrivelse hvis ingen regeltekst finnes */
    beskrivelse?: string;
  }

  let { hjemmelRef, tittel = '', beskrivelse = '' }: Props = $props();

  const regel = $derived(getKontraktsregel(hjemmelRef));
</script>

<div class="kontraktsregel">
  <div class="kr-hjemmel">§{hjemmelRef}</div>

  {#if regel}
    <p class="kr-tekst">{regel.regel}</p>
    <p class="kr-konsekvens">{regel.konsekvens}</p>
  {:else if tittel}
    <p class="kr-tekst"><strong>{tittel}</strong> — {beskrivelse}</p>
  {:else}
    <p class="kr-tekst">{beskrivelse}</p>
  {/if}
</div>

<style>
  .kontraktsregel {
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-left: 3px solid var(--color-vekt-dim);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    padding: var(--spacing-3) var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .kr-hjemmel {
    font-family: var(--font-data);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-vekt);
    font-variant-numeric: tabular-nums;
  }

  .kr-tekst {
    font-family: var(--font-prose);
    font-size: 13px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--color-ink-secondary);
    margin: 0;
  }

  .kr-konsekvens {
    font-family: var(--font-prose);
    font-size: 13px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--color-ink-muted);
    margin: 0;
  }

  .kr-tekst :global(strong) {
    color: var(--color-ink);
    font-weight: 600;
  }
</style>
