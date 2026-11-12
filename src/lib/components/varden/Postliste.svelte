<!--
  Postene i et svar med én åpen post om gangen; de andre står som en leselinje med svaret slik
  det står i brevet (#1739, system.md). Lista er felles for sporene med poster, og valgene i
  den åpne posten er sporets eget (#1778).
-->
<script lang="ts" generics="P extends { id: string; betegnelse: string; beskrivelse: string }">
  import { tick, type Snippet } from 'svelte';
  import Knapp from './Knapp.svelte';
  import { SKJEMA } from './tekster';

  let {
    poster,
    prefiks,
    valgt = $bindable(null),
    krever,
    leselinje,
    foersteFelt,
    valgene,
  }: {
    poster: readonly P[];
    /** Starten på ID-ene i lista, så feltene i posten kan nås fra oppsummeringen. */
    prefiks: string;
    /** `null` er den første posten, og en tom streng er ingen. */
    valgt?: string | null;
    /** Kravet i posten, under navnet. */
    krever: (p: P) => string;
    /** Svaret i en lukket post, én linje per standpunkt. Tom før posten er besvart. */
    leselinje: (p: P) => string[];
    /** Feltet som får fokus når posten åpnes. */
    foersteFelt: (betegnelse: string) => string;
    /** Valgene i den åpne posten. */
    valgene: Snippet<[P]>;
  } = $props();

  const flere = $derived(poster.length > 1);
  const aapen = $derived(flere ? (valgt ?? poster[0]?.betegnelse) : poster[0]?.betegnelse);

  export const erAapen = (betegnelse: string) => aapen === betegnelse;

  export async function aapne(betegnelse: string, fokus?: string) {
    valgt = betegnelse;
    await tick();
    document.getElementById(fokus ?? foersteFelt(betegnelse))?.focus();
  }
  async function lukk(betegnelse: string) {
    valgt = '';
    await tick();
    document.getElementById(`${prefiks}-endre-${betegnelse}`)?.focus();
  }
</script>

<ul class="poster" class:flere>
  {#each poster as p (p.id)}
    <li class="post" class:aapen={aapen === p.betegnelse}>
      {#if aapen === p.betegnelse}
        <div class="posthode">
          <h4>
            {#if flere}<span class="betegnelse">{p.betegnelse}</span>{/if}
            {p.beskrivelse}
          </h4>
          <p class="dempet">{krever(p)}</p>
        </div>
        {@render valgene(p)}
        {#if flere}
          <div class="postfot">
            <Knapp onclick={() => lukk(p.betegnelse)}>{SKJEMA.ferdig}</Knapp>
          </div>
        {/if}
      {:else}
        {@const lest = leselinje(p)}
        <div class="postlinje">
          <div class="postnavn">
            <h4>
              <span class="betegnelse">{p.betegnelse}</span>
              {p.beskrivelse}
            </h4>
            <p class="dempet">{krever(p)}</p>
          </div>
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
            id={`${prefiks}-endre-${p.betegnelse}`}
            aria-label={lest.length
              ? SKJEMA.endrePost(p.betegnelse)
              : SKJEMA.svarPaaPost(p.betegnelse)}
            onclick={() => aapne(p.betegnelse)}>{lest.length ? SKJEMA.endre : SKJEMA.svarPaa}</Knapp
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
  .poster.flere {
    border-top: var(--rule-strong);
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
  .betegnelse {
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
  /* Den lukkede posten: post og krav til venstre, svaret slik det står i brevet i midten. */
  .postlinje {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr) auto;
    column-gap: var(--spacing-4);
    row-gap: var(--spacing-2);
    align-items: start;
    padding: var(--spacing-3) 0;
  }
  .postnavn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
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
  @media (max-width: 640px) {
    .postlinje {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .lest {
      grid-column: 1;
      grid-row: 2;
    }
    .postlinje :global(button) {
      grid-column: 2;
      grid-row: 1;
    }
  }
</style>
