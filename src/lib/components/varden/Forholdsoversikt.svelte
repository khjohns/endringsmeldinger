<!--
  Siden for forholdet (#1449, prototypen `grunnlagsoversikt.html`): sporhodet med gruppen
  (OV-U77), forholdet som tittel (OV-U78) og siste brev, trekket (GR-U30), brevtråden med begge
  partenes brev og «Tilknyttede krav». Siden viser bare. Handlingspanelet, utkastet og telleren
  venter på designsløyfa for BHs svar (#1380, #1384).
-->
<script lang="ts">
  import { betegnelse } from '$kjerne/utledning/visning';
  import type { Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Brevtraad from './Brevtraad.svelte';
  import TilknyttedeKrav from './TilknyttedeKrav.svelte';
  import { brevene, forholdetISaken } from './lesing';
  import { FORHOLDET } from './tekster';

  let {
    u,
    onles,
    onspor,
  }: {
    u: Utledning;
    onles: (id: string) => void;
    onspor?: (spor: Spor) => void;
  } = $props();
  const uid = $props.id();

  const alle = $derived(brevene(u));
  const traad = $derived(alle.filter((b) => b.spor.includes('forhold')));
  const forholdet = $derived(forholdetISaken(u));
  const siste = $derived(traad.at(-1) ?? null);
  const merke = $derived(betegnelse(u, 'forhold'));
  const trekket = $derived(
    u.spor.forhold.trukket ? (traad.findLast((b) => b.art === 'trekk') ?? null) : undefined
  );
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="sporhode">
    {#if forholdet}<p class="over">{forholdet.gruppe}</p>{/if}
    <h2 id={`${uid}-tittel`}>{forholdet?.navn ?? FORHOLDET.utenNavn}</h2>
    {#if siste}<p class="siste">{FORHOLDET.siste(siste, siste.avsender)}</p>{/if}
    {#if trekket !== undefined}
      <p class="trukket" role="note">{FORHOLDET.trukket(trekket)}</p>
    {/if}
  </header>
  <Brevtraad
    brev={traad}
    dokumentasjon={u.ikkeVurderteBrev}
    venterPaaSvar={merke === 'venter_paa_svar'}
    {onles}
  />
</section>

<TilknyttedeKrav {u} brev={alle} {onspor} />

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    padding: var(--spacing-5);
  }
  .sporhode {
    padding-bottom: var(--spacing-4);
    border-bottom: var(--rule-subtle);
  }
  .over {
    font-size: 12px;
    color: var(--ink-3);
  }
  h2 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: var(--ink);
  }
  .siste {
    margin-top: var(--spacing-1);
    font-size: 14px;
    color: var(--ink-2);
  }
  .trukket {
    margin-top: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
