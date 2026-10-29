<!--
  Arbeidet i sporet (Varden, prinsipp 8): hovedkolonnen med det brukeren gjør nå, og høyre
  kolonne med det som støtter arbeidet. Visningen er handlingsorientert, så den har ingen
  egen overskrift over arbeidet (oppdragsgiver 29.10, #1391). Mens et brev leses ved siden
  av, er kolonnene like brede. Under 1024 px legger høyre kolonne seg under arbeidet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    leser = false,
    hoved,
    hoeyre,
  }: {
    /** Et brev leses i høyre kolonne. */
    leser?: boolean;
    hoved: Snippet;
    hoeyre?: Snippet;
  } = $props();
</script>

<div class="flate" class:leser>
  <div class="hoved">{@render hoved()}</div>
  {#if hoeyre}
    <div class="hoeyre">{@render hoeyre()}</div>
  {/if}
</div>

<style>
  .flate {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: var(--spacing-6);
    align-items: start;
  }
  .flate.leser {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .hoved {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  /* Høyre kolonne er like høy som arbeidet, så panelet i den kan følge rullingen. */
  .hoeyre {
    align-self: stretch;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    min-width: 0;
  }
  @media (max-width: 1023px) {
    .flate,
    .flate.leser {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
