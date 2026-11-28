<!--
  Datoene for et varsel eller et krav TE har lagt til som korrespondanse, under brevet i tråden
  (U-1 og U-5 i BF-50): ved brevet med varselet eller kravet datoen som gjelder med brevet den
  kommer fra, og hver tidligere dato, den opprinnelige først, med «Rett datoen» når kjernen tilbyr
  den. Ved brevet med rettingen datoen den retter fra og til, og brevet som rettet den på nytt.
-->
<script lang="ts">
  import Knapp from './Knapp.svelte';
  import type { Datolinjene } from './lesing';
  import { RETTING, dato } from './tekster';

  let {
    linjene,
    rettbare,
    onrett,
  }: {
    linjene: Datolinjene;
    /** Varslene og kravene kjernen tilbyr TE å rette datoen for (`rette_datoen:<id>`). */
    rettbare: readonly string[];
    onrett?: (gjelder: string) => void;
  } = $props();

  const flere = $derived(linjene.lagtTil.length > 1);
</script>

{#each linjene.lagtTil as r (r.gjelder)}
  {@const gjelder = r.datoene.at(-1)!}
  {@const rettet = r.datoene.length > 1}
  {@const kanRette = !!onrett && rettbare.includes(r.gjelder)}
  {#if rettet || kanRette}
    <div class="datolinje">
      {#if rettet}
        <p>
          {#if flere}{RETTING.gjelderDet(r.det)}{/if}
          {RETTING.gjelder} <b>{dato(gjelder.dato)}</b>.
          <span class="tidligere">{RETTING.historikken(r.datoene)}</span>
        </p>
      {/if}
      {#if kanRette}
        <Knapp
          variant="lenke"
          aria-label={RETTING.rettNavn(r.det)}
          onclick={() => onrett?.(r.gjelder)}>{RETTING.rett}</Knapp
        >
      {/if}
    </div>
  {/if}
{/each}
{#if linjene.retting}
  {@const { rettingene: r, plass } = linjene.retting}
  {@const neste = r.datoene[plass + 1]}
  <p class="datolinje">
    {RETTING.retter(r.det, r.brev, r.datoene[plass - 1]!.dato, r.datoene[plass]!.dato)}
    {#if neste}{RETTING.rettetIgjen(neste.brev)}{/if}
  </p>
{/if}

<style>
  .datolinje {
    font-size: 14px;
    color: var(--ink-2);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    row-gap: var(--spacing-1);
  }
  .datolinje b {
    font-weight: 600;
    color: var(--ink);
  }
  .tidligere {
    display: block;
  }
  .datolinje :global(.knapp) {
    margin-left: calc(-1 * var(--spacing-2));
  }
</style>
