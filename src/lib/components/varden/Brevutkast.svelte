<!--
  Utkastet som et brev under arbeid (oppdragsgiver 06.11, PR 1650): et grunt, lyst gult brevhode
  med emnet og mottakeren og brevet det gjelder under, og en hvit flate for teksten, med samme
  venstrekant. Status, meny og primærhandling står i arbeidsraden over (`Utkastrad`).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    id,
    emne,
    linje,
    onsubmit,
    children,
  }: {
    /** ID-en til emnet, som skjemaet er merket med. */
    id: string;
    /** Det brevet gjelder, med størst skrift. */
    emne: string;
    /** Mottakeren og brevet det gjelder, under emnet. */
    linje: Snippet;
    onsubmit: () => void;
    children: Snippet;
  } = $props();
</script>

<form
  class="brevutkast"
  aria-labelledby={id}
  onsubmit={(e) => {
    e.preventDefault();
    onsubmit();
  }}
>
  <header class="hode">
    <h2 class="emne" {id}>{emne}</h2>
    <p class="linje">{@render linje()}</p>
  </header>
  <div class="flate">{@render children()}</div>
</form>

<style>
  .brevutkast {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: grid;
    gap: var(--spacing-1);
    padding: var(--spacing-4) var(--spacing-6);
    background: var(--draft-bg);
    border-bottom: 1px solid var(--draft-border);
    border-radius: calc(var(--r-kort) - 1px) calc(var(--r-kort) - 1px) 0 0;
  }
  .emne {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .linje {
    font-size: 14px;
    color: var(--ink-2);
  }
  .flate {
    padding: var(--spacing-5) var(--spacing-6) var(--spacing-6);
  }
</style>
