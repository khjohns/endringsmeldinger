<!--
  Postene i et svar med én åpen post om gangen; de andre står som en leselinje med svaret slik
  det står i brevet (#1739, system.md). Lista er felles for sporene med poster, og valgene i
  den åpne posten er sporets eget (#1778).
-->
<script lang="ts" generics="P extends { id: string }">
  import { tick, type Snippet } from 'svelte';
  import Knapp from './Knapp.svelte';
  import { SVARSKJEMA } from './svarskjema';
  import { SKJEMA } from './tekster';

  let {
    poster,
    prefiks,
    kolonne,
    valgt = $bindable(null),
    navn,
    beskrivelse,
    krever,
    leselinje,
    foersteFelt,
    valgene,
  }: {
    poster: readonly P[];
    /** Starten på ID-ene i lista, så feltene i posten kan nås fra oppsummeringen. */
    prefiks: string;
    /** Overskriften over navnene, som «Post» eller «Frist» (prototypen `fristkrav-te.html#svar`). */
    kolonne: string;
    /** `id` til den åpne posten: `null` er den første, og en tom streng er ingen. */
    valgt?: string | null;
    /** Navnet posten står med, som betegnelsen på kravposten eller fristen. */
    navn: (p: P) => string;
    /** Det TE kalte posten, etter navnet. Med én post står den alene. */
    beskrivelse?: (p: P) => string;
    /** Kravet i posten. */
    krever: (p: P) => string;
    /** Svaret i en lukket post, én linje per standpunkt. Tom før posten er besvart. */
    leselinje: (p: P) => string[];
    /** Feltet som får fokus når posten åpnes. */
    foersteFelt: (p: P) => string;
    /** Valgene i den åpne posten. */
    valgene: Snippet<[P]>;
  } = $props();

  const flere = $derived(poster.length > 1);
  const aapen = $derived(flere ? (valgt ?? poster[0]?.id) : poster[0]?.id);

  export const erAapen = (id: string) => aapen === id;

  /** Åpner posten uten å flytte fokus, som når oppsummeringen over skal få det. */
  export function velg(id: string) {
    valgt = id;
  }

  export async function aapne(id: string, fokus?: string) {
    valgt = id;
    await tick();
    const p = poster.find((x) => x.id === id);
    document.getElementById(fokus ?? (p ? foersteFelt(p) : ''))?.focus();
  }
  async function lukk(id: string) {
    valgt = '';
    await tick();
    document.getElementById(`${prefiks}-endre-${id}`)?.focus();
  }
</script>

{#snippet tittel(p: P, alene: boolean)}
  {@const b = beskrivelse?.(p)}
  <h4>
    {#if !alene || !b}<span class="navn">{navn(p)}</span>{/if}
    {b}
  </h4>
{/snippet}

{#if flere}
  <!-- Overskriftene over de lukkede postene; hver rad sier det samme for skjermleseren. -->
  <div class="kolonner" aria-hidden="true">
    <span>{kolonne}</span>
    <span>{SVARSKJEMA.kravetKolonne}</span>
    <span>{SVARSKJEMA.svaretKolonne}</span>
  </div>
{/if}
<ul class="poster" class:flere>
  {#each poster as p (p.id)}
    <li class="post" class:aapen={aapen === p.id}>
      {#if aapen === p.id}
        <div class="posthode">
          {@render tittel(p, !flere)}
          <p class="dempet">{krever(p)}</p>
        </div>
        {@render valgene(p)}
        {#if flere}
          <div class="postfot">
            <Knapp onclick={() => lukk(p.id)}>{SKJEMA.ferdig}</Knapp>
          </div>
        {/if}
      {:else}
        {@const lest = leselinje(p)}
        <div class="postlinje">
          {@render tittel(p, false)}
          <p class="krav">{krever(p)}</p>
          <div class="lest">
            <span class="visually-hidden">{SKJEMA.svaretKolonne}:</span>
            {#if lest.length}
              <ul>
                {#each lest as l, i (i)}<li>{l}</li>{/each}
              </ul>
            {:else}
              <span class="dempet">{SKJEMA.ikkeBesvart}</span>
            {/if}
          </div>
          <Knapp
            variant="lenke"
            id={`${prefiks}-endre-${p.id}`}
            aria-label={lest.length ? SKJEMA.endrePost(navn(p)) : SKJEMA.svarPaaPost(navn(p))}
            onclick={() => aapne(p.id)}>{lest.length ? SKJEMA.endre : SKJEMA.svarPaa}</Knapp
          >
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .poster {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .poster.flere > .post {
    border-bottom: var(--rule);
  }
  .post {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .poster.flere > .post.aapen {
    padding: var(--spacing-4) 0 var(--spacing-4) var(--spacing-4);
    border-left: 3px solid var(--ink);
  }
  h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }
  .navn {
    margin-right: var(--spacing-2);
    font-variant-numeric: tabular-nums;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .posthode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  /* De lukkede postene står i kolonner under overskriftene: posten, kravet, svaret slik det står
     i brevet og handlingen (prototypen `fristkrav-te.html#svar`). */
  .kolonner,
  .postlinje {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.2fr) auto;
    column-gap: var(--spacing-4);
    align-items: baseline;
  }
  .kolonner {
    padding-bottom: var(--spacing-2);
    border-bottom: var(--rule-strong);
    color: var(--ink-3);
    font-size: 12px;
  }
  /* Overskriften har ingen celle over handlingen. */
  .kolonner span:last-child {
    grid-column: 3 / -1;
  }
  .postlinje {
    row-gap: var(--spacing-2);
    padding: var(--spacing-3) 0;
  }
  .krav {
    color: var(--ink-2);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .lest {
    font-size: 14px;
    color: var(--ink-2);
  }
  .lest ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .postfot {
    display: flex;
    justify-content: flex-end;
  }
  /* Smalt står posten og kravet over svaret, og overskriftene faller bort. */
  @media (max-width: 640px) {
    .kolonner {
      display: none;
    }
    .poster.flere {
      border-top: var(--rule-strong);
    }
    .postlinje {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .postlinje h4,
    .krav,
    .lest {
      grid-column: 1;
    }
    .postlinje :global(button) {
      grid-column: 2;
      grid-row: 1;
    }
  }
</style>
