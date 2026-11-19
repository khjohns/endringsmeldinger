<!--
  Hovedlinjene i brevet (Varden, skjerm B): standpunktene og beløpene slik kjernen
  forhåndsviser brevet, i brevets rekkefølge og med laget. Alternative beløp summeres ikke.
  Lista er en `aria-live`-region, så en endret linje leses opp. Skjemaet for ny sak bruker
  panelet med egen tittel (BF-05, F-1).
-->
<script lang="ts">
  import type { Innsigelsen } from './svarlagene';
  import type { Snippet } from 'svelte';
  import type { Skjemapunkt } from './svarskjema';
  import { HOVEDLINJER, VEDERLAGET } from './tekster';

  let {
    linjer,
    alternativer,
    handling,
    tittel = HOVEDLINJER.tittel,
    tom = HOVEDLINJER.tom,
    punkter,
  }: {
    linjer: { tekst: string; lag: string | null; vilkaar?: Innsigelsen[] }[];
    /** Svaret har beløp i mer enn ett lag. */
    alternativer: boolean;
    /** Primærhandlingen. Uten den har panelet ingen bunn. */
    handling?: Snippet;
    tittel?: string;
    /** Teksten før det finnes en linje. */
    tom?: string;
    punkter?: readonly Skjemapunkt[];
  } = $props();
  const uid = $props.id();

  /** Beløpene slik `kroner()` i kjernen skriver dem, så de kan stå med mono (#1465, A4). */
  const BELOEP = /(−?\d{1,3}(?:\u00a0\d{3})*(?:,\d{2})?\u00a0kr)/;
  const deler = (tekst: string) =>
    tekst.split(BELOEP).map((del, i) => ({ del, beloep: i % 2 === 1 }));
</script>

{#snippet standpunkt(l: { tekst: string; lag: string | null; vilkaar?: Innsigelsen[] })}
  {#if l.vilkaar?.length}<span class="lag">{VEDERLAGET.lagetVilkaar(l.vilkaar)}</span>{/if}
  <span
    >{#each deler(l.tekst) as d, j (j)}{#if d.beloep}<span class="num">{d.del}</span
        >{:else}{d.del}{/if}{/each}</span
  >
{/snippet}

<section class="kort" aria-labelledby={`${uid}-hovedlinjer-tittel`}>
  <h2 class="hode" id={`${uid}-hovedlinjer-tittel`}>{tittel}</h2>
  <div class="linjer" aria-live="polite">
    {#if punkter?.length}
      <ul class="punkter">
        {#each punkter as p (p.punkt)}
          <li class:aktiv={p.aktiv} aria-current={p.aktiv ? 'step' : undefined}>
            <strong>{p.navn}</strong>
            {#each p.linjer ?? [] as l, i (i)}
              <span class="punktstatus">{@render standpunkt(l)}</span>
            {/each}
          </li>
        {/each}
      </ul>
      {#if alternativer}<p class="merknad">{HOVEDLINJER.alternativer}</p>{/if}
    {:else if linjer.length}
      <ul>
        {#each linjer as l, i (i)}
          <li>
            {@render standpunkt(l)}
          </li>
        {/each}
      </ul>
      {#if alternativer}<p class="merknad">{HOVEDLINJER.alternativer}</p>{/if}
    {:else}
      <p class="merknad">{tom}</p>
    {/if}
  </div>
  {#if handling}<div class="bunn">{@render handling()}</div>{/if}
</section>

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: var(--rule);
    font-size: 16px;
    font-weight: 600;
  }
  .linjer {
    padding: var(--spacing-4) var(--spacing-5);
  }
  ul {
    display: flex;
    flex-direction: column;
  }
  li {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-2) 0;
    border-bottom: var(--rule-subtle);
    font-size: 14px;
  }
  li:last-child {
    border-bottom: 0;
  }
  .punkter .aktiv {
    box-shadow: inset 3px 0 0 var(--ink);
    padding-inline-start: var(--spacing-3);
  }
  .punktstatus {
    color: var(--ink-2);
  }
  .punktstatus .lag {
    margin-inline-end: var(--spacing-1);
  }
  .num {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .lag {
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 500;
  }
  .merknad {
    color: var(--ink-3);
    font-size: 14px;
    margin-top: var(--spacing-2);
  }
  .bunn {
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
    border-top: var(--rule);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
</style>
