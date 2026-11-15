<!--
  Kortet øverst på siden for et krav, med overskriften og hjemmelen dempet etter (U-1 i BF-44 og
  BF-45) og brevtråden under.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { tittel, hjemmel, children }: { tittel: string; hjemmel: string; children: Snippet } =
    $props();
  const uid = $props.id();
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="sporhode">
    <h2 id={`${uid}-tittel`}>{tittel} <span class="hjemmel">{hjemmel}</span></h2>
  </header>
  {@render children()}
</section>

<style>
  .kort {
    min-width: 0;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .sporhode {
    padding: var(--spacing-5) var(--spacing-5) 18px;
    border-bottom: var(--rule-subtle);
  }
  h2 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-24);
    color: var(--ink);
  }
  .hjemmel {
    margin-left: var(--spacing-1);
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--ink-3);
  }
</style>
