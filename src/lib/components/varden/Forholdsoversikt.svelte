<!--
  Siden for forholdet (#1449, prototypen `grunnlagsoversikt-v2.html` for det som er særskilt for
  forholdet): sporhodet har forholdet som tittel (OV-U78) og sier under den hvor saken står (BF-05
  U-10, oppdragsgiver 06.11, PR 1650), trekket (GR-U30), brevtråden med alle brevene i saken
  (#1898) og «Tilknyttede krav». Brevtråden er den samme som på sidene for kravene.
-->
<script lang="ts">
  import { avsluttetAvTe } from '#lib/kjernesak/kontekst.svelte.ts';
  import Brevtraad from './Brevtraad.svelte';
  import Sporside from './Sporside.svelte';
  import TilknyttedeKrav from './TilknyttedeKrav.svelte';
  import {
    brevITraaden,
    brevene,
    forholdetISaken,
    brevinnholdene,
    oppfoelgingene,
    type Sideprops,
    sendtSammeDag,
  } from './lesing';
  import { FORHOLDET } from './tekster';

  let {
    u,
    betegnelser,
    korrigerbare = [],
    vist = null,
    smal = false,
    onles,
    datoene,
    rettbare = [],
    onrett,
    onspor,
    onkorriger,
    handlingerVed = [],
    handling,
    brevet,
    traadlenkene,
  }: Sideprops = $props();

  const alle = $derived(brevene(u));
  const traad = $derived(brevITraaden(alle, 'forhold'));
  const innhold = $derived(brevinnholdene(u));
  const fulgtOpp = $derived(oppfoelgingene(u, alle));
  const forholdsbrev = $derived(alle.filter((b) => b.spor.includes('forhold')));
  const forholdet = $derived(forholdetISaken(u));
  const merke = $derived(betegnelser.forhold);
  const trekket = $derived(
    u.spor.forhold.trukket ? (forholdsbrev.findLast((b) => b.art === 'trekk') ?? null) : undefined
  );
</script>

<Sporside tittel={forholdet?.navn ?? FORHOLDET.utenNavn} siste={traad.at(-1)}>
  {#snippet merknad()}
    {#if trekket !== undefined}
      <p class="trukket" role="note">{FORHOLDET.trukket(trekket)}</p>
    {/if}
  {/snippet}
  <Brevtraad
    {traadlenkene}
    brev={traad}
    spor="forhold"
    {innhold}
    {fulgtOpp}
    dokumentasjon={u.ikkeVurderteBrev}
    sammeDag={sendtSammeDag(u)}
    venterPaaSvar={merke === 'venter_paa_svar'}
    {vist}
    {smal}
    {onles}
    {datoene}
    {rettbare}
    {onrett}
    {korrigerbare}
    {onkorriger}
    lukket={avsluttetAvTe(u)}
    {handlingerVed}
    {handling}
    {brevet}
  />
</Sporside>

<TilknyttedeKrav {u} {betegnelser} brev={alle} {onspor} />

<style>
  .trukket {
    margin-top: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
