<!--
  Brevet som lesespalte (Varden, skjerm C og D): brevhode med avsender, mottaker, brevnummer
  og dato, og teksten avsnitt for avsnitt med utdypningen under. Teksten kommer fra kjernen,
  som frosset tekst i et sendt brev eller som låst tekst før sending. Visningen endrer den ikke.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Part } from '$kjerne/typer';
  import { PARTNAVN } from './prototypetekst';

  let {
    avsender,
    sak,
    nummer,
    dato,
    tittel,
    avsnitt,
    fot,
    innfelt = false,
  }: {
    avsender: Part;
    sak: string;
    /** Brevnummeret, eller teksten som står før det er satt. */
    nummer: string;
    dato: string;
    tittel: string;
    avsnitt: { laast: string; utdypning?: string }[];
    fot?: Snippet;
    /** Brevet står i en ramme som har kanten, som ved lesing ved siden av. */
    innfelt?: boolean;
  } = $props();

  const mottaker = $derived<Part>(avsender === 'TE' ? 'BH' : 'TE');
  const stor = (s: string) => s[0].toUpperCase() + s.slice(1);
</script>

<article class="brev" class:innfelt aria-label={tittel}>
  <header class="hode">
    <div class="avsender">
      <span class="navn">{stor(PARTNAVN[avsender])}</span>
      <span class="rolle">{avsender}</span>
    </div>
    <dl class="meta">
      <dt>Sak</dt>
      <dd>{sak}</dd>
      <dt>Brev</dt>
      <dd>{nummer}</dd>
      <dt>Dato</dt>
      <dd>{dato}</dd>
      <dt>Til</dt>
      <dd>{stor(PARTNAVN[mottaker])} ({mottaker})</dd>
    </dl>
  </header>
  <h2>{tittel}</h2>
  <div class="tekst" data-testid="laast-tekst">
    {#each avsnitt as a, i (i)}
      <p>{a.laast}</p>
      {#if a.utdypning}<p class="utdypning" data-testid="utdypning">{a.utdypning}</p>{/if}
    {/each}
  </div>
  {#if fot}<footer class="fot">{@render fot()}</footer>{/if}
</article>

<style>
  .brev {
    max-width: var(--varden-ark);
    padding: var(--spacing-10) var(--spacing-12);
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    font-family: var(--font-legal);
    color: var(--ink);
    line-height: 1.6;
  }
  .brev.innfelt {
    padding: var(--spacing-6);
    border: 0;
    border-radius: 0;
  }
  .hode {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--spacing-4);
    padding-bottom: var(--spacing-6);
    margin-bottom: var(--spacing-6);
    border-bottom: var(--rule);
  }
  .avsender {
    display: flex;
    flex-direction: column;
  }
  .navn {
    font-weight: 600;
  }
  .rolle {
    color: var(--ink-3);
    font-size: 14px;
  }
  .meta {
    display: grid;
    grid-template-columns: auto auto;
    column-gap: var(--spacing-4);
    font-size: 14px;
  }
  .meta dt {
    color: var(--ink-3);
    text-align: right;
  }
  h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: var(--spacing-4);
  }
  .tekst p {
    white-space: pre-line;
  }
  .tekst p + p {
    margin-top: var(--spacing-3);
  }
  .tekst .utdypning {
    white-space: pre-wrap;
  }
  .fot {
    margin-top: var(--spacing-8);
    padding-top: var(--spacing-4);
    border-top: var(--rule);
    color: var(--ink-3);
    font-family: var(--font-sans);
    font-size: 13px;
  }
  @media (max-width: 767px) {
    .brev {
      padding: var(--spacing-6) var(--spacing-4);
    }
  }
</style>
