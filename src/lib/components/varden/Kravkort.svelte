<!--
  Kortet under tråden på siden for et krav: overskriften, brevene kortet leser av, og innholdet
  (U-2 i BF-44 og BF-45). `--steg` settes på kroppen, så målestokken i kortet arver den.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    tittel,
    kilde = null,
    steg = null,
    children,
  }: {
    tittel: string;
    /** Brevene kortet leser kravet og svaret av, som «Kravet i brev 3 og svaret i brev 4». */
    kilde?: string | null;
    /** Avstanden mellom strekene i målestokken (`maalestokken`). */
    steg?: string | null;
    children: Snippet;
  } = $props();
  const uid = $props.id();
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <div class="hode">
    <h2 id={`${uid}-tittel`}>{tittel}</h2>
    {#if kilde}<span class="kilde">{kilde}</span>{/if}
  </div>
  <div class="kropp" style:--steg={steg}>
    {@render children()}
  </div>
</section>

<style>
  .kort {
    min-width: 0;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1) var(--spacing-4);
    align-items: baseline;
    justify-content: space-between;
    padding: 18px var(--spacing-5) 0;
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  .kilde {
    font-size: 12px;
    color: var(--ink-3);
  }
  .kropp {
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
  }
</style>
