<!--
  Kortet øverst på siden for et krav, med overskriften og hjemmelen dempet etter (U-1 i BF-44 og
  BF-45) og brevtråden under.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Brevet } from './lesing';
  import { TRAADEN } from './tekster';

  let {
    tittel,
    hjemmel,
    siste = null,
    merknad,
    children,
  }: {
    tittel: string;
    hjemmel?: string;
    siste?: Brevet | null;
    merknad?: Snippet;
    children: Snippet;
  } = $props();
  const uid = $props.id();
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="sporhode">
    <h2 id={`${uid}-tittel`} tabindex="-1">
      {tittel}{#if hjemmel}{' '}
        <span class="hjemmel">{hjemmel}</span>{/if}
    </h2>
    {#if siste}<p>{TRAADEN.siste(siste)}</p>{/if}
    {@render merknad?.()}
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
  .sporhode p {
    margin-top: var(--spacing-1);
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
