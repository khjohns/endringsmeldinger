<!--
  Postene i et svar med én åpen post om gangen; de andre står som en leselinje med svaret slik
  det står i brevet (#1739, system.md). Lista er felles for sporene med poster, og valgene i
  den åpne posten er sporets eget (#1778).
-->
<script lang="ts" generics="P extends { id: string }">
  import type { Snippet } from 'svelte';
  import { fokuser } from './mangler';
  import Knapp from './Knapp.svelte';
  import { SKJEMA, SVARSKJEMA } from './tekster';

  let {
    poster,
    prefiks,
    kolonne,
    valgt = $bindable(null),
    navn,
    brevoverskrift,
    aktiv,
    beskrivelse,
    krever,
    kravet,
    leselinje,
    foersteFelt,
    kontrollerVedFerdig,
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
    brevoverskrift?: (p: P) => string | undefined;
    aktiv?: (p: P) => boolean;
    /** Det TE kalte posten, etter navnet. Med én post står den alene. */
    beskrivelse?: (p: P) => string;
    /** Kravet i posten, som en setning under navnet i den åpne posten. */
    krever: (p: P) => string;
    /** Kravet i kortform, i kolonnen «Kravet» i en lukket post. */
    kravet: (p: P) => string;
    /** Svaret i en lukket post, én linje per standpunkt. Tom før posten er besvart. */
    leselinje: (p: P) => string[];
    /** Feltet som får fokus når posten åpnes. */
    foersteFelt: (p: P) => string;
    /** ID-en til et felt som må rettes før posten kan lukkes. */
    kontrollerVedFerdig?: (p: P) => string | null;
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
    await fokuser(() => {
      const p = poster.find((x) => x.id === id);
      return document.getElementById(fokus ?? (p ? foersteFelt(p) : ''));
    });
  }
  async function kanLukkes(p: P) {
    const feilfelt = kontrollerVedFerdig?.(p);
    if (feilfelt) {
      await fokuser(() => document.getElementById(feilfelt));
      return false;
    }
    return true;
  }
  async function aapneFraRad(id: string) {
    const p = poster.find((rad) => rad.id === aapen);
    if (!p || (await kanLukkes(p))) await aapne(id);
  }
  async function lukk(p: P) {
    if (!(await kanLukkes(p))) return;
    valgt = '';
    await fokuser(() => document.getElementById(`${prefiks}-endre-${p.id}`));
  }
</script>

{#snippet tittel(p: P, alene: boolean)}
  {@const b = beskrivelse?.(p)}
  {@const overskrift = brevoverskrift?.(p)}
  <h4>
    {#if overskrift}{overskrift}{:else}
      {#if !alene || !b}<span class="navn">{navn(p)}</span>{/if}
      {b}
    {/if}
  </h4>
  {#if overskrift}<p class="dempet">
      {navn(p)}{#if b}
        {b}{/if}
    </p>{/if}
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
    <li class="post" class:aapen={aapen === p.id} class:aktiv={aktiv?.(p)}>
      {#if aapen === p.id}
        <div class="posthode">
          {@render tittel(p, !flere)}
          <p class="dempet">{krever(p)}</p>
        </div>
        {@render valgene(p)}
        {#if flere}
          <div class="postfot">
            <Knapp onclick={() => lukk(p)}>{SKJEMA.ferdig}</Knapp>
          </div>
        {/if}
      {:else}
        {@const lest = leselinje(p)}
        <div class="postlinje">
          {@render tittel(p, false)}
          <p class="krav">
            <span class="visually-hidden">{SVARSKJEMA.kravetKolonne}:</span>
            {kravet(p)}
          </p>
          <div class="lest">
            <span class="visually-hidden">{SVARSKJEMA.svaret}:</span>
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
            onclick={() => aapneFraRad(p.id)}>{lest.length ? SKJEMA.endre : SKJEMA.svarPaa}</Knapp
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
  }
  .poster.flere > .post.aktiv {
    padding-inline-start: var(--spacing-4);
    box-shadow: inset 3px 0 0 var(--ink);
  }
  .poster.flere > .post.aktiv :global(legend) {
    font-size: 20px;
    line-height: 1.3;
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
    /* Handlingen har fast bredde, så kolonnene står likt i overskriften og hver rad. */
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.2fr) 5rem;
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
  .postlinje :global(button) {
    justify-self: end;
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
