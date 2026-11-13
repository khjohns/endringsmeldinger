<!--
  Brevet slik det ble sendt, ved siden av brevtråden (U-16 i BF-44, prototypen
  `vederlagsoversikt.html` i oppsett B). I høyre kolonne står rammen fast og slutter i vinduet,
  så brevet ruller i den over linja «Sendt herfra …». Under 1181 px står brevet i raden.
-->
<script lang="ts">
  import Brev from './Brev.svelte';
  import type { Brevet } from './lesing';
  import { MOTTATT, TRAADEN, brevtittel, dato } from './tekster';

  let {
    brev,
    sak,
    iRaden = false,
  }: {
    brev: Brevet & { avsnitt: NonNullable<Brevet['avsnitt']> };
    /** Sakens tittel, som brevhodet viser. */
    sak: string;
    /** Brevet står i raden i tråden, under 1181 px. */
    iRaden?: boolean;
  } = $props();
  const uid = $props.id();
</script>

<!-- Rammen kan rulles, så den kan få fokus med tastaturet (WCAG 2.1.1). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<section
  class="brevpanel"
  class:iRaden
  tabindex="0"
  aria-labelledby={`${uid}-tittel`}
  data-brevpanel={brev.id}
>
  {#if !iRaden}
    <div class="hode">
      <h2 id={`${uid}-tittel`}>{TRAADEN.brevet}</h2>
      {#if brev.nummer !== null}<span>{TRAADEN.nummer(brev.nummer)}</span>{/if}
    </div>
  {:else}
    <h2 id={`${uid}-tittel`} class="visually-hidden">{TRAADEN.brevetSomSendt(brev)}</h2>
  {/if}
  <Brev
    avsender={brev.avsender}
    {sak}
    merking={brev.merking}
    deresRef={brev.deresRef}
    dato={dato(brev.registrert)}
    tittel={brevtittel(brev)}
    avsnitt={brev.avsnitt}
    sendt={brev.registrert}
    innfelt
  >
    {#snippet fot()}{MOTTATT.sendt(brev.registrert)}{/snippet}
  </Brev>
</section>

<style>
  .brevpanel {
    position: sticky;
    top: var(--spacing-6);
    max-height: calc(100vh - 2 * var(--spacing-6));
    overflow: auto;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .brevpanel:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .hode {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-1) var(--spacing-4);
    padding: var(--spacing-4) var(--spacing-6) 0;
    font-size: 12px;
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
  }
  h2 {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  /* Linja «Sendt herfra …» står fast nederst i rammen, og brevet ruller over den (U-16). */
  .brevpanel :global(.fot) {
    position: sticky;
    bottom: 0;
    margin: var(--spacing-8) calc(-1 * var(--spacing-6)) calc(-1 * var(--spacing-6));
    padding: var(--spacing-3) var(--spacing-6) var(--spacing-4);
    background: var(--surface);
  }
  /* I raden står brevet innfelt i tråden, uten egen ramme, og ruller med siden. */
  .brevpanel.iRaden {
    position: static;
    max-height: none;
    overflow: visible;
    background: var(--surface-inset);
    border: 0;
    border-radius: var(--r-innfelt);
  }
  .brevpanel.iRaden :global(.brev) {
    background: transparent;
  }
  .brevpanel.iRaden :global(.fot) {
    position: static;
    margin: var(--spacing-8) 0 0;
    padding: var(--spacing-4) 0 0;
    background: transparent;
  }
</style>
