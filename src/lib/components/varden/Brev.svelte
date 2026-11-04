<!--
  Brevet som lesespalte (Varden, skjerm C og D). Hodet følger `godkjenning-vederlagssvar.html:276-283`
  og LV-U23 så langt løsningen har opplysningene: avsender med organisasjon og part, mottakeren,
  referansene og datoen. Et sendt brev har stempelet «Sendt …». Teksten kommer fra kjernen,
  som frosset tekst i et sendt brev eller som låst tekst før sending. Visningen endrer den ikke.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Part } from '$kjerne/typer';
  import { organisasjonene } from './kontrakt';
  import { MOTTATT, PARTNAVN } from './tekster';

  let {
    avsender,
    sak,
    nummer,
    dato,
    tittel,
    avsnitt,
    svarerPaa,
    sendt,
    fot,
    innfelt = false,
  }: {
    avsender: Part;
    sak: string;
    /** Brevnummeret (LV-U44). Et brev uten nummer har ingen «Vår ref.» (LV-U45). */
    nummer: string | null;
    dato: string;
    tittel: string;
    avsnitt: { laast: string; utdypning?: string }[];
    /** Brevet dette svarer på, som «Brev 5», under «Deres ref.». */
    svarerPaa?: string;
    /** Tidspunktet brevet ble sendt. Bare et sendt brev har stempelet. */
    sendt?: string;
    fot?: Snippet;
    /** Brevet står i en ramme som har kanten, som ved lesing ved siden av. */
    innfelt?: boolean;
  } = $props();

  const mottaker = $derived<Part>(avsender === 'TE' ? 'BH' : 'TE');
  const hentOrganisasjoner = organisasjonene();
  const organisasjoner = $derived(hentOrganisasjoner());
  const stor = (s: string) => s[0].toUpperCase() + s.slice(1);
</script>

<article class="brev" class:innfelt aria-label={tittel}>
  <header class="hode">
    <div class="topp">
      <p class="avsender">
        <b>{organisasjoner[avsender] ?? stor(PARTNAVN[avsender])}</b>
        {#if organisasjoner[avsender]}<span>{stor(PARTNAVN[avsender])}</span>{/if}
      </p>
      {#if sendt}<span class="stempel" data-testid="stempel">{MOTTATT.sendtMerke(sendt)}</span>{/if}
    </div>
    <p class="mottaker">
      {#if organisasjoner[mottaker]}{organisasjoner[mottaker]}<br />{/if}{stor(PARTNAVN[mottaker])}
    </p>
    <dl class="ref">
      <div>
        <dt>Sak:</dt>
        <dd>{sak}</dd>
      </div>
      {#if svarerPaa}<div>
          <dt>Deres ref.:</dt>
          <dd>{svarerPaa}</dd>
        </div>{/if}
      {#if nummer !== null}<div>
          <dt>Vår ref.:</dt>
          <dd>Brev {nummer}</dd>
        </div>{/if}
      <div>
        <dt>Dato:</dt>
        <dd>{dato}</dd>
      </div>
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
    padding: 28px var(--spacing-10) 36px;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
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
    flex-direction: column;
    gap: var(--spacing-5);
    padding-bottom: var(--spacing-6);
    margin-bottom: var(--spacing-6);
    border-bottom: var(--rule);
  }
  .topp {
    font-family: var(--font-sans);
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  .avsender {
    display: flex;
    flex-direction: column;
  }
  .avsender b {
    font-size: 16px;
    font-weight: 600;
  }
  .avsender span {
    color: var(--ink-3);
    font-size: 12px;
  }
  .stempel {
    padding: 2px var(--spacing-2);
    border: 1px solid var(--ink);
    border-radius: var(--r-merke);
    color: var(--ink);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .ref {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7rem, auto));
    gap: 2px 20px;
    font-family: var(--font-sans);
    font-size: 12px;
  }
  .ref dt {
    color: var(--ink-3);
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
    font-size: 14px;
  }
  @media (max-width: 860px) {
    .brev {
      padding: var(--spacing-5) var(--spacing-4) 28px;
    }
  }
</style>
