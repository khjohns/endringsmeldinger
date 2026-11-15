<!--
  Et spørsmål i svarskjemaet: overskriften, et infotips og merket med bestemmelsen i NS 8407
  (OV-U75), og feltene under (#1925).
-->
<script lang="ts">
  import { BookOpen } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import Infotips from './Infotips.svelte';
  import { SVARSKJEMA } from './svarskjema';

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
      {tittel}{#if tillegg}{' · '}<span class="num">{tillegg}</span>{/if}
    </h3>
    {#if info}<Infotips navn={info.navn} tekst={info.tekst} />{/if}
    {#if hjemmel}
      <span class="hjemmel"
        ><BookOpen size={14} aria-hidden="true" />{SVARSKJEMA.hjemmel(hjemmel)}</span
      >
    {/if}
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
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: var(--rule-strong);
    border-radius: var(--r-merke);
    color: var(--ink-2);
    font-size: 12px;
    white-space: nowrap;
  }
</style>
