<!--
  Et spørsmål i svarskjemaet: overskriften med bestemmelsen i NS 8407 som dempet tekst (OV-U75,
  «Høyst tre nivåer av flater» i `system.md`), et infotips og feltene under (#1925, #2035).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Infotips from './Infotips.svelte';
  import { hjemmelsmerke } from './tekster';

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
    /** Punktet i NS 8407, uten «pkt.». */
    hjemmel?: string;
    info?: { navn: string; tekst: string };
    children: Snippet;
  } = $props();
</script>

<section class="spoersmaal" aria-labelledby={id}>
  <div class="sp-hode">
    <h3 {id}>
      {#if tillegg}{`${tittel} · `}<span class="num">{tillegg}</span>{:else}{tittel}{/if}
      {#if hjemmel}<span class="hjemmel">{hjemmelsmerke(hjemmel)}</span>{/if}
    </h3>
    {#if info}<Infotips navn={info.navn} tekst={info.tekst} />{/if}
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
  .hjemmel {
    margin-left: var(--spacing-1);
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
    white-space: nowrap;
  }
</style>
