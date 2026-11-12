<!--
  Siden for forholdet (#1449, prototypen `grunnlagsoversikt.html`): sporhodet har forholdet som
  tittel (OV-U78) og sier under den hvor saken står (BF-05 U-10, oppdragsgiver 06.11, PR 1650),
  trekket (GR-U30), brevtråden med begge partenes brev og «Tilknyttede krav». Brevnummer,
  avsender og dato står på brevraden. Siden viser bare.
-->
<script lang="ts">
  import type { Betegnelse } from '$kjerne/utledning/visning';
  import type { Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Brevtraad from './Brevtraad.svelte';
  import TilknyttedeKrav from './TilknyttedeKrav.svelte';
  import { brevene, forholdetISaken, innleggene } from './lesing';
  import { FORHOLDET } from './tekster';

  let {
    u,
    betegnelser,
    korrigerbare = [],
    onles,
    onspor,
    onkorriger,
  }: {
    u: Utledning;
    /** Betegnelsen i MM-U30 for hvert spor, fra saksbildet (`betegnelsene`). */
    betegnelser: Record<Spor, Betegnelse | null>;
    /** Opplysningene om datoen TE kan korrigere (`korrigere:<id>`). */
    korrigerbare?: string[];
    onles: (id: string) => void;
    onspor?: (spor: Spor) => void;
    onkorriger?: (opplysning: string) => void;
  } = $props();
  const uid = $props.id();

  const alle = $derived(brevene(u));
  const traad = $derived(alle.filter((b) => b.spor.includes('forhold')));
  const forholdet = $derived(forholdetISaken(u));
  const siste = $derived(traad.at(-1) ?? null);
  const merke = $derived(betegnelser.forhold);
  const trekket = $derived(
    u.spor.forhold.trukket ? (traad.findLast((b) => b.art === 'trekk') ?? null) : undefined
  );
  // Hvor saken står, i vanlig språk: byggherrens standpunkt når svaret er siste brev, og at svaret
  // ikke er registrert når påberopelsen er det. Ellers siste brev.
  const status = $derived.by(() => {
    if (!siste || siste === trekket) return null;
    const svar = u.spor.forhold.gjeldendeSvar;
    const s = svar?.standpunkter.find((x) => x.art === 'forhold');
    if (svar?.dokument === siste.id && s?.art === 'forhold')
      return FORHOLDET.utfall(s.resultat, siste.registrert);
    if (u.spor.forhold.gjeldendeKrav?.dokument === siste.id)
      return FORHOLDET.venter(siste.registrert);
    return FORHOLDET.siste(siste, siste.avsender);
  });
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="sporhode">
    <h2 id={`${uid}-tittel`}>{forholdet?.navn ?? FORHOLDET.utenNavn}</h2>
    {#if status}<p class="status">{status}</p>{/if}
    {#if trekket !== undefined}
      <p class="trukket" role="note">{FORHOLDET.trukket(trekket)}</p>
    {/if}
  </header>
  <Brevtraad
    brev={traad}
    innlegg={innleggene(u)}
    dokumentasjon={u.ikkeVurderteBrev}
    venterPaaSvar={merke === 'venter_paa_svar'}
    {onles}
    {korrigerbare}
    {onkorriger}
    lukket={u.forholdAvvist}
  />
</section>

<TilknyttedeKrav {u} {betegnelser} brev={alle} {onspor} />

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    padding: var(--spacing-5);
  }
  .sporhode {
    padding-bottom: var(--spacing-6);
    border-bottom: var(--rule-subtle);
  }
  h2 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-24);
    color: var(--ink);
  }
  .status {
    margin-top: var(--spacing-1);
    font-size: 16px;
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
