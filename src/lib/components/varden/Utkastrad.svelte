<!--
  Arbeidsraden over utkastet (oppdragsgiver 06.11 og 07.11, PR 1650): et gult, stiplet kort med
  veien tilbake, «Utkast», brevet som skrives («Brev 3 · Oppdatert påberopelse») og mottakeren under, og
  primærhandlingen ytterst til høyre. Raden følger rullingen, så handlingen står ved brevet den
  gjelder.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { BREVUTKAST } from './tekster';

  let {
    tittel,
    linje,
    tilbake,
    handling,
  }: {
    /** Brevet som skrives, som «Brev 3 · Oppdatert påberopelse». */
    tittel: string;
    /** Mottakeren, under tittelen. */
    linje: string;
    /** Veien tilbake, først i kortet. Den følger rullingen med raden. */
    tilbake?: Snippet;
    /** Primærhandlingen, ytterst til høyre. */
    handling: Snippet;
  } = $props();
</script>

<div class="utkastrad">
  <div class="status">
    {#if tilbake}<div class="tilbake">{@render tilbake()}</div>{/if}
    <span class="merke">{BREVUTKAST.utkast}</span>
    <div class="tekst">
      <h2>{tittel}</h2>
      <p class="linje">{linje}</p>
    </div>
  </div>
  <div class="handling">{@render handling()}</div>
</div>

<style>
  .utkastrad {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3) var(--spacing-5);
    padding: var(--spacing-3) var(--spacing-5);
    background: var(--draft-bg);
    border: 1px dashed var(--draft-border);
    border-radius: var(--r-kort);
  }
  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2) var(--spacing-4);
    min-width: 0;
  }
  /* Lenken er skilt fra brevet med en linje, så den ikke leses som en del av tittelen. */
  .tilbake {
    flex-shrink: 0;
    margin-left: calc(-1 * var(--spacing-2));
    padding-right: var(--spacing-4);
    border-right: 1px solid var(--draft-border);
  }
  .merke {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: var(--r-merke);
    background: var(--surface);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .tekst {
    min-width: 0;
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ink);
  }
  .linje {
    font-size: 14px;
    color: var(--ink-2);
  }
  /* På smal skjerm står veien tilbake på en egen linje over brevet. */
  @media (max-width: 640px) {
    .tilbake {
      flex-basis: 100%;
      padding-right: 0;
      border-right: 0;
    }
  }
  .handling {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-2);
  }
</style>
