<!--
  Utkastet til brevet (oppdragsgiver 06.11 og 07.11, PR 1650): et hvitt kort med emnet øverst,
  feltene under og «Forkast utkast» nederst, adskilt fra primærhandlingen i arbeidsraden over
  (`Utkastrad`). Det gule er arbeidsraden; kortet er flaten TE skriver på.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    id,
    emne,
    onsubmit,
    bunn,
    children,
  }: {
    /** ID-en til emnet, som skjemaet er merket med. */
    id: string;
    /** Det brevet gjelder. */
    emne: string;
    onsubmit: () => void;
    /** Nederst i kortet, under en linje: «Forkast utkast». */
    bunn?: Snippet;
    children: Snippet;
  } = $props();
</script>

<form
  class="brevutkast"
  aria-labelledby={id}
  novalidate
  onsubmit={(e) => {
    e.preventDefault();
    onsubmit();
  }}
>
  <h3 class="emne" {id}>{emne}</h3>
  {@render children()}
  {#if bunn}<div class="bunn">{@render bunn()}</div>{/if}
</form>

<style>
  .brevutkast {
    display: grid;
    gap: var(--spacing-5);
    padding: var(--spacing-6);
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .emne {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--ink);
  }
  .bunn {
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
</style>
