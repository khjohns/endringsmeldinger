<!--
  Hovedlinjene i brevet (Varden, skjerm B): standpunktene og beløpene slik kjernen
  forhåndsviser brevet, i brevets rekkefølge og med laget. Alternative beløp summeres ikke.
  Lista er en `aria-live`-region, så en endret linje leses opp. Skjemaet for ny sak bruker
  panelet med egen tittel (BF-05, F-1).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { HOVEDLINJER } from './prototypetekst';

  let {
    linjer,
    alternativer,
    handling,
    tittel = HOVEDLINJER.tittel,
    tom = HOVEDLINJER.tom,
  }: {
    linjer: { tekst: string; lag: string | null }[];
    /** Svaret har beløp i mer enn ett lag. */
    alternativer: boolean;
    /** Primærhandlingen. Uten den har panelet ingen bunn. */
    handling?: Snippet;
    tittel?: string;
    /** Teksten før det finnes en linje. */
    tom?: string;
  } = $props();
  const uid = $props.id();

  /** Beløpene slik `kroner()` i kjernen skriver dem, så de kan stå med mono (#1465, A4). */
  const BELOEP = /(−?\d{1,3}(?:\u00a0\d{3})*(?:,\d{2})?\u00a0kr)/;
  const deler = (tekst: string) =>
    tekst.split(BELOEP).map((del, i) => ({ del, beloep: i % 2 === 1 }));
</script>

<section class="kort" aria-labelledby={`${uid}-hovedlinjer-tittel`}>
  <h2 class="hode" id={`${uid}-hovedlinjer-tittel`}>{tittel}</h2>
  <div class="linjer" aria-live="polite">
    {#if linjer.length}
      <ul>
        {#each linjer as l, i (i)}
          <li>
            {#if l.lag}<span class="lag">{l.lag}</span>{/if}
            <span
              >{#each deler(l.tekst) as d, j (j)}{#if d.beloep}<span class="num">{d.del}</span
                  >{:else}{d.del}{/if}{/each}</span
            >
          </li>
        {/each}
      </ul>
      {#if alternativer}<p class="merknad">Beløpene er {HOVEDLINJER.alternativer}.</p>{/if}
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
  .num {
    font-family: var(--font-mono);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .lag {
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
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
