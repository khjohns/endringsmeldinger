<!--
  Siden for vederlaget i oppsett B (BF-44, U-16): hodet med overskriften og hjemmelen dempet etter,
  brevtråden med beløpet i hvert krav ved brevet (U-12) og akseptfristen over handlingene ved
  byggherrens svar (U-11), og under den kortet «Kravet og svaret» (U-2–U-4). Brevtråden er den
  samme som på siden for forholdet (#1898).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Brevtraad from './Brevtraad.svelte';
  import KravetOgSvaret from './KravetOgSvaret.svelte';
  import { brevITraaden, brevene, oppfoelgingene, type Brevet } from './lesing';
  import { VEDERLAGET } from './tekster';
  import { kravbeloepene, kravetOgSvaret } from './vederlagsoversikt';

  let {
    u,
    venterPaaSvar,
    vist = null,
    smal = false,
    onles,
    onforholdet,
    handlingVed = null,
    handling,
    brevet,
  }: {
    u: Utledning;
    /** Sporets betegnelse er «Svar ikke registrert» (MM-U30). */
    venterPaaSvar: boolean;
    /** Brevet som vises ved siden av tråden, eller i raden når `smal`. */
    vist?: string | null;
    smal?: boolean;
    onles: (id: string) => void;
    onforholdet?: () => void;
    /** Brevet handlingen svarer på (U-16). */
    handlingVed?: string | null;
    handling?: Snippet;
    brevet?: Snippet<[Brevet]>;
  } = $props();
  const uid = $props.id();

  const alle = $derived(brevene(u));
  const k = $derived(kravetOgSvaret(u));
  // Akseptfristen står ved byggherrens svar så lenge det ikke er godtatt (U-11, HF-U23 punkt 4).
  const akseptfrist = $derived.by(() => {
    const s = u.spor.vederlag.gjeldendeSvar;
    return s?.akseptfrist && !u.spor.vederlag.enighet
      ? { brev: s.dokument, dato: s.akseptfrist }
      : null;
  });
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="sporhode">
    <h2 id={`${uid}-tittel`}>
      {VEDERLAGET.tittel} <span class="hjemmel">{VEDERLAGET.hjemmel}</span>
    </h2>
  </header>
  <Brevtraad
    brev={brevITraaden(alle, 'vederlag')}
    spor="vederlag"
    fulgtOpp={oppfoelgingene(u, alle)}
    dokumentasjon={u.ikkeVurderteBrev}
    {venterPaaSvar}
    beloep={kravbeloepene(u)}
    {akseptfrist}
    {vist}
    {smal}
    {onles}
    {handlingVed}
    {handling}
    {brevet}
  />
</section>

{#if k}<KravetOgSvaret {k} {u} {onforholdet} />{/if}

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
