<!--
  Arbeidsraden over utkastet (oppdragsgiver 06.11 og 07.11, PR 1650): et gult, stiplet kort med
  «Utkast» med lås, brevet som skrives («Brev 3 · Oppdatert påberopelse») og mottakeren under, og
  primærhandlingen ytterst til høyre. Raden følger rullingen, så handlingen står ved brevet den
  gjelder.
-->
<script lang="ts">
  import { Lock } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { BREVUTKAST, SKJEMA } from './tekster';

  let {
    tittel,
    linje,
    handling,
  }: {
    /** Brevet som skrives, som «Brev 3 · Oppdatert påberopelse». */
    tittel: string;
    /** Mottakeren, under tittelen. */
    linje: string;
    /** Primærhandlingen, ytterst til høyre. */
    handling: Snippet;
  } = $props();
</script>

<div class="utkastrad">
  <div class="status">
    <span class="merke"
      ><Lock size={12} aria-hidden="true" />{BREVUTKAST.utkast}<span class="visually-hidden"
        >, {SKJEMA.synlig.toLowerCase()}</span
      ></span
    >
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
    align-items: center;
    gap: var(--spacing-4);
    min-width: 0;
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
  .handling {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-2);
  }
</style>
