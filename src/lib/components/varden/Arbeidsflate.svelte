<!--
  Arbeidet i sporet (Varden, prinsipp 8): hovedkolonnen med det brukeren gjør nå, og høyre
  kolonne med det som støtter arbeidet. Visningen er handlingsorientert, så den har ingen
  egen overskrift over arbeidet (oppdragsgiver 29.10, #1391). Hovedkolonnen er høyst like
  bred som brevet, og kolonnene står midtstilt (oppdragsgiver 30.10). Mens et brev leses ved
  siden av, er kolonnene like brede, eller 60/40 når utkastet er arbeidet og brevene i høyre
  kolonne støtter det (BF-10). En arbeidsrad over begge kolonnene følger rullingen. På 1180 px og
  smalere legger høyre kolonne seg under arbeidet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    leser = false,
    deling = 'lik',
    rad,
    hoved,
    hoeyre,
  }: {
    /** Et brev leses i høyre kolonne. */
    leser?: boolean;
    /** Mens et brev leses: like brede kolonner, eller utkastet bredest (60/40). */
    deling?: 'lik' | 'utkast';
    /** Arbeidsraden over begge kolonnene, med status og primærhandling. */
    rad?: Snippet;
    hoved: Snippet;
    hoeyre?: Snippet;
  } = $props();

  // Høyden på arbeidsraden, så høyre kolonne kan følge rullingen rett under den.
  let radEl = $state<HTMLElement | null>(null);
  let radhoeyde = $state(0);
  $effect(() => {
    if (!radEl) return;
    const el = radEl;
    radhoeyde = el.offsetHeight;
    if (typeof ResizeObserver !== 'function') return;
    const maal = new ResizeObserver(() => (radhoeyde = el.offsetHeight));
    maal.observe(el);
    return () => maal.disconnect();
  });
</script>

<div
  class="flate"
  class:leser
  class:utkast={deling === 'utkast'}
  style:--radhoeyde={rad ? `${radhoeyde}px` : undefined}
>
  {#if rad}<div class="rad" bind:this={radEl}>{@render rad()}</div>{/if}
  <div class="hoved">{@render hoved()}</div>
  {#if hoeyre}
    <div class="hoeyre">{@render hoeyre()}</div>
  {/if}
</div>

<style>
  .flate {
    display: grid;
    grid-template-columns: minmax(0, var(--varden-ark)) var(--varden-stoette);
    justify-content: center;
    gap: var(--spacing-6);
    align-items: start;
  }
  .flate.leser {
    grid-template-columns: repeat(2, minmax(0, var(--varden-ark)));
  }
  .flate.leser.utkast {
    grid-template-columns: minmax(0, var(--varden-ark)) minmax(0, calc(var(--varden-ark) * 2 / 3));
  }
  /* Raden står over begge kolonnene og følger rullingen, med flaten bak seg. */
  .rad {
    grid-column: 1 / -1;
    position: sticky;
    top: 0;
    z-index: 2;
    margin: calc(-1 * var(--spacing-3)) 0;
    padding: var(--spacing-3) 0;
    background: var(--canvas);
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
  @media (max-width: 1180px) {
    .flate,
    .flate.leser,
    .flate.leser.utkast {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
