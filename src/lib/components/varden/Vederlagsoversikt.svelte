<!--
  Siden for vederlaget i oppsett B (BF-44, U-16): hodet med overskriften og hjemmelen dempet etter,
  brevtråden med beløpet i hvert krav ved brevet (U-12) og akseptfristen over handlingene ved
  byggherrens svar (U-11), og under den kortet «Kravet og svaret» (U-2–U-4). Brevtråden er den
  samme som på siden for forholdet (#1898).
-->
<script lang="ts">
  import Brevtraad from './Brevtraad.svelte';
  import Datolinjer from './Datolinjer.svelte';
  import Sporside from './Sporside.svelte';
  import KravetOgSvaret from './KravetOgSvaret.svelte';
  import {
    brevITraaden,
    brevene,
    eldreKravISporet,
    klarOverForholdet,
    oppfoelgingene,
    type Brevet,
    type Sideprops,
    sendtSammeDag,
  } from './lesing';
  import { TRAADEN, VEDERLAGET } from './tekster';
  import { varseletFoerKravet } from '$lib/kjernesak/vederlagskrav';
  import { kravbeloepene, kravetOgSvaret, varsleneIKravene } from './vederlagsoversikt';
  import { akseptfristen } from './svarlagene';

  let {
    u,
    betegnelser,
    vist = null,
    smal = false,
    onles,
    onspor,
    handlingVed = null,
    handling,
    brevet,
    levering = new Map(),
  }: Sideprops = $props();

  const alle = $derived(brevene(u));
  const k = $derived(kravetOgSvaret(u, alle));
  const beloepene = $derived(kravbeloepene(u));
  const varslene = $derived(varsleneIKravene(u, alle));
  const fulgtOpp = $derived(oppfoelgingene(u, alle));
  const eldreKrav = $derived(eldreKravISporet(u, 'vederlag', alle));
  const akseptfrist = $derived(akseptfristen(u, 'vederlag'));
  // Datoen TE oppgir for når TE ble klar over forholdet, under brevet med varselet etter punkt
  // 34.1.2, med avstanden i kalenderdager (U-8, G-6).
  const varselbrevet = $derived(varseletFoerKravet(u, '34.1.2'));
  const klar = $derived(klarOverForholdet(u));
</script>

<!-- Beløpet i kravet ved brevet med kravet, med hjemlene kravet også varsler etter (U-12), og
     leveringen til Catenda ved svaret med akseptfristen og ved et brev som ikke er levert ennå
     (G-5 og U-11, HF-U23 punkt 4). -->
{#snippet oeverst(b: Brevet)}
  {@const n = beloepene.get(b.id)}
  {@const levert = levering.get(b.id)}
  {#if n !== undefined}<p class="kravtall">
      {VEDERLAGET.kravbeloep(n, varslene.get(b.id))}
    </p>{/if}
  {#if levert !== undefined && (levert === null || akseptfrist?.brev === b.id)}
    <p class="levering">{TRAADEN.levering(b.registrert, levert)}</p>
  {/if}
{/snippet}

{#snippet fristen(b: Brevet)}
  <Datolinjer {b} {klar} varselbrev={varselbrevet} {akseptfrist} />
{/snippet}

<Sporside tittel={VEDERLAGET.tittel} hjemmel={VEDERLAGET.hjemmel}>
  <Brevtraad
    brev={brevITraaden(alle, 'vederlag')}
    spor="vederlag"
    {fulgtOpp}
    {eldreKrav}
    dokumentasjon={u.ikkeVurderteBrev}
    sammeDag={sendtSammeDag(u)}
    venterPaaSvar={betegnelser.vederlag === 'venter_paa_svar'}
    {oeverst}
    nederst={fristen}
    {vist}
    {smal}
    {onles}
    {handlingVed}
    {handling}
    {brevet}
  />
</Sporside>

{#if k}<KravetOgSvaret {k} {u} {alle} onforholdet={onspor && (() => onspor('forhold'))} />{/if}

<style>
  .levering {
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
