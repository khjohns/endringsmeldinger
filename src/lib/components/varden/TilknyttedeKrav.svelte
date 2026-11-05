<!--
  Kravene om vederlagsjustering og fristforlengelse i saken (#1449, kriterium 3): hvert krav med
  betegnelsen i MM-U30, siste brev i sporet og lenken til sporet. Tallene og teksten om hva et
  svar gjelder, venter på oversiktene for sporene (#1402) og designsløyfa for BHs svar.
-->
<script lang="ts">
  import { betegnelse } from '$kjerne/utledning/visning';
  import type { Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { ChevronRight } from 'lucide-svelte';
  import Knapp from './Knapp.svelte';
  import { brevForLinja, type Brevet } from './lesing';
  import { BETEGNELSE, FORHOLDET, SAKEN, SPORNAVN } from './tekster';

  let {
    u,
    brev,
    onspor,
  }: {
    u: Utledning;
    brev: Brevet[];
    /** Uten den står kravene uten lenke, som i komponentdemoen. */
    onspor?: (spor: Spor) => void;
  } = $props();
  const uid = $props.id();

  const kravene = $derived(
    (['vederlag', 'frist'] as const).flatMap((spor) => {
      const b = betegnelse(u, spor);
      const siste = brevForLinja(brev, spor, b === 'trukket');
      return b && siste ? [{ spor, betegnelse: BETEGNELSE[b], siste }] : [];
    })
  );
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="hode">
    <h2 id={`${uid}-tittel`}>{FORHOLDET.tilknyttede}</h2>
    <p class="kilde">{FORHOLDET.tilknyttedeKilde}</p>
  </header>
  {#if kravene.length}
    <ul>
      {#each kravene as k (k.spor)}
        <li>
          <div>
            <p class="navn">{SPORNAVN[k.spor]}</p>
            <p class="linje">{SAKEN.betegnelse(k.betegnelse, k.siste, k.siste.avsender)}</p>
          </div>
          {#if onspor}<Knapp variant="lenke" onclick={() => onspor(k.spor)}
              >{FORHOLDET.aapne(SPORNAVN[k.spor])}<ChevronRight
                size={16}
                aria-hidden="true"
              /></Knapp
            >{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="tomt">{FORHOLDET.ingenKrav}</p>
  {/if}
</section>

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-1) var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-3);
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  .kilde {
    font-size: 12px;
    color: var(--ink-3);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2) var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-5);
    border-top: var(--rule);
  }
  .navn {
    font-size: 16px;
    font-weight: 600;
  }
  .linje {
    font-size: 14px;
    color: var(--ink-3);
  }
  .tomt {
    padding: var(--spacing-3) var(--spacing-5) var(--spacing-5);
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
