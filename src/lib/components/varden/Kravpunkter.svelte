<!--
  Panelet til høyre i TEs krav om vederlagsjustering (U-5, U-15 og U-16 i BF-14): ett punkt per
  avsnitt i skjemaet med status, kravpostene under vederlagsjusteringen, summene, fordelingen på
  PNS og hva kravet er. Et punkt lenker til avsnittet. «Se brevet før sending» står fast nederst,
  med «Utkast» og «Ikke sendt» ved knappen (`system.md`, «Utkastet sier det selv»).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { kroner } from '$kjerne/frosset/tekst';
  import { KRAVSKJEMA } from './tekster';
  import { PNS_GRENSE } from './vederlagskrav';

  let {
    punkter,
    faste,
    anslag,
    pns,
    pnsOver,
    hvaKravetEr,
    handling,
    aktiv = null,
  }: {
    punkter: {
      id: string;
      nummer: string;
      tittel: string;
      status: string;
      poster?: {
        noekkel: string;
        /** Id-en til kravposten i skjemaet. */
        anker: string;
        betegnelse: string;
        beskrivelse: string;
        verdi: string;
        trukket: boolean;
      }[];
    }[];
    faste: number;
    anslag: number;
    pns: { pns: string; faste: number; anslag: number }[];
    pnsOver: string[];
    hvaKravetEr: string[];
    handling: Snippet;
    /** Punktet for avsnittet som er i syne. */
    aktiv?: string | null;
  } = $props();
  const uid = $props.id();
</script>

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <div class="hode">
    <h2 id={`${uid}-tittel`}>{KRAVSKJEMA.punktene}</h2>
    <p class="dempet">{KRAVSKJEMA.punkteneHjelp}</p>
  </div>
  <ol class="punkter">
    {#each punkter as p (p.id)}
      <li class:aktiv={aktiv === p.id}>
        <span class="nummer" aria-hidden="true">{p.nummer}</span>
        <div class="innhold">
          <a href={`#${p.id}`} aria-current={aktiv === p.id ? 'location' : undefined}>{p.tittel}</a>
          <span class="status">{p.status}</span>
          {#if p.poster?.length}
            <ul class="poster">
              {#each p.poster as q (q.noekkel)}
                <li class:trukket={q.trukket}>
                  <a href={`#${q.anker}`}>
                    <span class="betegnelse">{q.betegnelse}</span>
                    <span class="beskrivelse">{q.beskrivelse}</span>
                    <span class="verdi">{q.verdi}</span>
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
  <dl class="summer" aria-live="polite">
    <div>
      <dt>{KRAVSKJEMA.fasteBeloep}</dt>
      <dd>{kroner(faste)}</dd>
    </div>
    {#if anslag}
      <div>
        <dt>{KRAVSKJEMA.anslagIkkeKrevd}</dt>
        <dd>{kroner(anslag)}</dd>
      </div>
    {/if}
  </dl>
  {#if pns.length}
    <div class="pns">
      <h3>{KRAVSKJEMA.fordelingPns}</h3>
      <dl>
        {#each pns as r (r.pns)}
          <div>
            <dt>{r.pns}</dt>
            <dd>{KRAVSKJEMA.pnsRad(r.faste, r.anslag)}</dd>
          </div>
        {/each}
      </dl>
      {#if pnsOver.length}<p class="dempet">{KRAVSKJEMA.pnsOver(pnsOver, PNS_GRENSE)}</p>{/if}
    </div>
  {/if}
  {#if hvaKravetEr.length}
    <div class="kravet">
      {#each hvaKravetEr as t, i (i)}<p>{t}</p>{/each}
    </div>
  {/if}
  <div class="bunn">
    {@render handling()}
    <p class="status-utkast">
      <span class="merke">{KRAVSKJEMA.utkast}</span>
      <span class="dempet">{KRAVSKJEMA.ikkeSendt}</span>
    </p>
  </div>
</section>

<style>
  .kort {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode,
  .punkter,
  .summer,
  .pns,
  .kravet,
  .bunn {
    padding: var(--spacing-4) var(--spacing-5);
  }
  .hode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 12px;
  }
  .punkter {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    margin: 0;
    padding-top: 0;
    list-style: none;
  }
  .punkter > li {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: start;
    gap: var(--spacing-3);
  }
  .nummer {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1.5px solid var(--ink);
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .innhold {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .innhold a {
    color: var(--ink);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
  }
  /* Tittelen er lenken, som en blokk over hele bredden, og fokus vises som i resten av Varden. */
  .innhold a {
    display: block;
    min-height: 24px;
    padding-block: var(--spacing-1);
  }
  .innhold a:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .innhold a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .status {
    color: var(--ink-3);
    font-size: 12px;
  }
  .poster {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: var(--spacing-2) 0 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--ink-2);
  }
  .poster a {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: var(--spacing-2);
    color: inherit;
    font-size: inherit;
    font-weight: 400;
    min-height: 24px;
    padding-block: 2px;
  }
  /* Punktet du står i: flaten for valgt og blekk i kanten, som i prototype v4 (U-15). */
  .punkter > li {
    padding: var(--spacing-1) var(--spacing-2);
    border-left: 3px solid transparent;
    border-radius: var(--r-felt);
  }
  .punkter > li.aktiv {
    background: var(--surface-selected);
    border-left-color: var(--ink);
  }
  .punkter > li.aktiv > .innhold > a {
    font-weight: 600;
  }
  .poster .beskrivelse {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .poster .trukket .beskrivelse {
    text-decoration: line-through;
  }
  .betegnelse,
  .verdi,
  dd {
    font-variant-numeric: tabular-nums;
  }
  .summer,
  .pns,
  .kravet,
  .bunn {
    border-top: var(--rule);
  }
  .summer {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin: 0;
  }
  .summer div,
  .pns dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-3);
    font-size: 14px;
  }
  .summer div:first-child {
    font-weight: 600;
  }
  .summer dd,
  .pns dd {
    margin: 0;
    white-space: nowrap;
  }
  .pns dl {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    margin: 0 0 var(--spacing-2);
  }
  .kravet {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    font-size: 14px;
    color: var(--ink-2);
  }
  .bunn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  /* Midtstilt under knappen (oppdragsgiver 12.11, #1663). */
  .status-utkast {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--spacing-2);
  }
  .merke {
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: var(--r-merke);
    background: var(--draft-bg);
    color: var(--draft);
    font-size: 12px;
    font-weight: 500;
  }
</style>
