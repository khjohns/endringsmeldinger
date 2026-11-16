<!--
  Et spørsmål i svarskjemaet: overskriften med bestemmelsen i NS 8407 som dempet tekst (OV-U75,
  «Høyst tre nivåer av flater» i `system.md`), et infotips og feltene under (#1925, #2035).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Infotips from './Infotips.svelte';
  import Hjemmel from './Hjemmel.svelte';

  let {
    id,
    tittel,
    tillegg,
    hjemmel,
    info,
    children,
  }: {
    /** ID-en til overskriften, som navngir spørsmålet. */
    id: string;
    tittel: string;
    /** Et tall etter tittelen, som det samlede beløpet. */
    tillegg?: string;
    /** Punktene i NS 8407, uten «pkt.». */
    hjemmel?: readonly string[];
    info?: { navn: string; tekst: string };
    children: Snippet;
  } = $props();
</script>

<section class="spoersmaal" aria-labelledby={id}>
  <div class="sp-hode">
    <h3 {id}>
      {#if tillegg}{`${tittel} · `}<span class="num">{tillegg}</span>{:else}{tittel}{/if}
    </h3>
    {#if info}<Infotips navn={info.navn} tekst={info.tekst} />{/if}
    {#if hjemmel}<Hjemmel numre={hjemmel} />{/if}
  </div>
  {@render children()}
</section>

<style>
  .spoersmaal {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .sp-hode {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
  }
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .num {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
