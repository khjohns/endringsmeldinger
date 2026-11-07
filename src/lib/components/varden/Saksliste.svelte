<!--
  Sakslisten i prosjektet (#1450): prototypen `docs/design/prototyper/saksliste-v2.html` og
  MM-U37–MM-U39. Panelet har sakstypene KOE og EO (KT-U9, M4). Lista viser det TE har
  krevd, og merket for endringsordren (EO-U13). Byggherrens svar og enigheten står i saken.
  Halvdelen for endringsordrene i nøkkeltallene kommer med EO-saken (#1423): til da finnes
  ingen tall å vise, og ukjent er ikke 0.
-->
<script lang="ts">
  import type { Part } from '$kjerne/typer';
  import type { Sakslinje } from '$lib/types/api';
  import { Plus } from 'lucide-svelte';
  import { kroner } from '$kjerne/frosset/standpunkt';
  import Knapp from './Knapp.svelte';
  import Vardenskall from './Vardenskall.svelte';
  import type { Kontrakt } from './kontrakt';
  import {
    FANENE,
    fanen,
    forholdet,
    iUtvalg,
    krevd,
    noekkeltall,
    saksmerke,
    sorter,
    treff,
    type Endringsordrer,
    type Fane,
    type Sortering,
    type Utvalg,
  } from './saksliste';
  import { dato, SAKEN, SAKSLISTE } from './tekster';

  let {
    saker,
    part,
    laster = false,
    feil = null,
    prosjektNavn,
    kontrakt,
    sakslenke,
    nyttKrav,
    prosjekter,
    bruker = null,
    endringsordrer = {},
    onproevIgjen,
  }: {
    saker: Sakslinje[];
    /** Rollen fra serveren (KT-U10), aldri fra klienten. */
    part: Part | null;
    laster?: boolean;
    feil?: string | null;
    prosjektNavn: string;
    kontrakt?: Kontrakt;
    sakslenke: (sakId: string) => string;
    /** Lenken til skjemaet for ny sak (#1481). */
    nyttKrav: string;
    /** Lenken til prosjektene, «Varden» først i stien. */
    prosjekter?: string;
    /** Den innloggede, i topplinja. */
    bruker?: { name: string } | null;
    /**
     * Dokumentkoden til den sendte endringsordren som omfatter KOE-saken (EO-U13, EO-U14).
     * Serveren gir den ikke før EO-saken og brevkoden er bygget (#1423, #1174).
     */
    endringsordrer?: Endringsordrer;
    onproevIgjen?: () => void;
  } = $props();

  const sti = $derived([{ tekst: SAKEN.merkenavn, href: prosjekter }, { tekst: prosjektNavn }]);

  const FANENAVN: Record<Fane, string> = { koe: SAKSLISTE.koe, eo: SAKSLISTE.eo };

  let fane = $state<Fane>('koe');
  const antall = $derived(
    Object.fromEntries(FANENE.map((f) => [f, saker.filter((s) => fanen(s) === f).length]))
  );
  const iFanen = $derived(saker.filter((s) => fanen(s) === fane));
  const tall = $derived(noekkeltall(iFanen, endringsordrer));

  const UTVALGENE: [Utvalg, string][] = [
    ['alle', SAKSLISTE.alle],
    ['eo', SAKSLISTE.iEo],
    ['ikke-eo', SAKSLISTE.ikkeIEo],
    ['avsluttet', SAKSLISTE.avsluttet],
  ];
  const SORTERINGENE: [Sortering, string][] = [
    ['siste-brev', SAKSLISTE.sisteBrev],
    ['opprettet', SAKSLISTE.opprettet],
  ];
  let utvalg = $state<Utvalg>('alle');
  let sortering = $state<Sortering>('siste-brev');
  let soek = $state('');
  const synlige = $derived(
    sorter(
      iFanen.filter((s) => iUtvalg(s, utvalg, endringsordrer) && treff(s, soek, endringsordrer)),
      sortering
    )
  );
  function visAlle() {
    utvalg = 'alle';
    soek = '';
  }

  // Infotipset ved hvert kort: åpnes med klikk eller tastatur, Escape lukker og gir fokus tilbake.
  let aapentTips = $state<string | null>(null);
  function tipsTast(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !aapentTips) return;
    const knapp = document.querySelector<HTMLButtonElement>(`[aria-controls="${aapentTips}"]`);
    aapentTips = null;
    knapp?.focus();
  }
</script>

<svelte:window onkeydown={tipsTast} onclick={() => (aapentTips = null)} />

{#snippet tips(id: string, spor: string, tekst: string)}
  <span class="tips">
    <button
      type="button"
      class="info"
      aria-expanded={aapentTips === id}
      aria-controls={id}
      aria-label={SAKSLISTE.omTallene(spor)}
      onclick={(e) => {
        e.stopPropagation();
        aapentTips = aapentTips === id ? null : id;
      }}>i</button
    >
    <span class="lapp" {id} role="note" hidden={aapentTips !== id}>{tekst}</span>
  </span>
{/snippet}

<Vardenskall {sti} {bruker} {kontrakt}>
  {#snippet panel()}
    <nav aria-labelledby="saker-etikett">
      <p class="etikett" id="saker-etikett">{SAKSLISTE.saker}</p>
      <ul class="valgene">
        {#each FANENE as f (f)}
          <li>
            <button
              type="button"
              class="valg"
              aria-current={fane === f ? 'page' : undefined}
              onclick={() => (fane = f)}
            >
              <span>{FANENAVN[f]}</span>
              <span class="under">{laster || feil ? '' : SAKSLISTE.antall(antall[f])}</span>
            </button>
          </li>
        {/each}
      </ul>
    </nav>
  {/snippet}

  <main class="arbeid">
    <section class="kort" aria-labelledby="liste-tittel">
      <div class="liste-hode">
        <div>
          <p class="over">{prosjektNavn}</p>
          <h1 id="liste-tittel">{FANENAVN[fane]}</h1>
        </div>
        <!-- Bare TE kan kreve endringsordre, og «Ny endringsordre» venter på EO-saken (KT-U10, #1423). -->
        {#if part === 'TE' && fane === 'koe'}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
          <a class="ny" href={nyttKrav}><Plus size={16} aria-hidden="true" />{SAKSLISTE.nyKoe}</a>
        {/if}
      </div>

      {#if feil}
        <div class="tilstand" role="alert">
          <h2>{SAKSLISTE.lastefeil}</h2>
          <p>{SAKSLISTE.lastefeilBeklager}</p>
          <p class="detaljer">{SAKEN.lastefeilDetaljer(feil)}</p>
          {#if onproevIgjen}<Knapp onclick={onproevIgjen}>{SAKEN.proevIgjen}</Knapp>{/if}
        </div>
      {:else if laster}
        <p class="tilstand" role="status">{SAKSLISTE.laster}</p>
      {:else if iFanen.length === 0}
        <div class="tilstand tom">
          {#if fane === 'eo'}
            <p>{SAKSLISTE.tomEo}</p>
            <p class="detaljer">{SAKSLISTE.tomEoForklaring}</p>
          {:else}
            <p>{part === 'TE' ? SAKSLISTE.tomKoeTe : SAKSLISTE.tomKoe}</p>
          {/if}
        </div>
      {:else}
        <div class="noekkel" role="group" aria-label={SAKSLISTE.tallene}>
          <section class="spor-kort" aria-labelledby="nk-vederlag">
            <!-- Tipset står utenfor overskriften, så kortet bare heter det overskriften sier (#1511). -->
            <div class="spor-tittel">
              <h2 id="nk-vederlag">
                {SAKSLISTE.vederlag} <span class="enhet">{SAKSLISTE.eksMva}</span>
              </h2>
              {@render tips('tips-vederlag', SAKSLISTE.vederlag, SAKSLISTE.omVederlag)}
            </div>
            <div class="halv">
              <span class="hl">{SAKSLISTE.krevdUtenforEo}</span>
              <span class="hv"
                >{kroner(tall.vederlag.sum).replace(/\s?kr$/, '')} <small>kr</small></span
              >
              <span class="hm"
                >{[
                  SAKSLISTE.krav(tall.vederlag.krav),
                  tall.vederlag.varslet ? SAKSLISTE.varsletAntall(tall.vederlag.varslet) : null,
                  tall.vederlag.utenBeloep ? SAKSLISTE.utenBeloep(tall.vederlag.utenBeloep) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}</span
              >
            </div>
          </section>
          <section class="spor-kort" aria-labelledby="nk-frist">
            <div class="spor-tittel">
              <h2 id="nk-frist">
                {SAKSLISTE.fristforlengelse}
              </h2>
              {@render tips('tips-frist', SAKSLISTE.fristforlengelse, SAKSLISTE.omFrist)}
            </div>
            <div class="halv">
              <span class="hl">{SAKSLISTE.krevdUtenforEo}</span>
              <span class="hv">{tall.frist.krav} <small>krav</small></span>
              <span class="hm"
                >{tall.frist.varslet ? SAKSLISTE.varsletAntall(tall.frist.varslet) : ''}</span
              >
            </div>
          </section>
        </div>

        <div class="verktoy">
          <div class="utvalg" role="group" aria-label={SAKSLISTE.utvalg}>
            {#each UTVALGENE as [u, navn] (u)}
              <button type="button" aria-pressed={utvalg === u} onclick={() => (utvalg = u)}
                >{navn}</button
              >
            {/each}
          </div>
          <div class="sortering" role="group" aria-label={SAKSLISTE.sorterEtter}>
            <span class="sort-etikett" aria-hidden="true">{SAKSLISTE.sorterEtter}</span>
            {#each SORTERINGENE as [n, navn] (n)}
              <button type="button" aria-pressed={sortering === n} onclick={() => (sortering = n)}
                >{navn}</button
              >
            {/each}
          </div>
          <input
            class="sok"
            type="search"
            placeholder={SAKSLISTE.soek}
            aria-label={SAKSLISTE.soek}
            bind:value={soek}
          />
        </div>

        <div class="radhode" aria-hidden="true">
          <span>{SAKSLISTE.sak}</span>
          <span class="h"
            >{SAKSLISTE.krevdVederlag} <span class="enhet">{SAKSLISTE.eksMva}</span></span
          >
          <span class="h">{SAKSLISTE.krevdFrist}</span>
          <span>{SAKSLISTE.sisteBrev}</span>
        </div>
        <!-- Statusområdet står fast, så skjermleseren melder at utvalget ikke gir treff (WCAG 4.1.3). -->
        <div class="ingen-treff" class:aapen={synlige.length === 0}>
          <p role="status">
            {#if synlige.length === 0}
              {soek.trim() ? SAKSLISTE.ingenTreffSoek(soek.trim()) : SAKSLISTE.ingenTreff[utvalg]}
            {/if}
          </p>
          {#if synlige.length === 0}
            <button type="button" class="lenkeknapp" onclick={visAlle}>{SAKSLISTE.visAlle}</button>
          {/if}
        </div>
        {#if synlige.length > 0}
          <ul class="rader" aria-labelledby="liste-tittel">
            {#each synlige as s (s.sak_id)}
              {@const f = forholdet(s)}
              {@const merke = saksmerke(s)}
              {@const eo = endringsordrer[s.sak_id]}
              <li class="rad">
                <div class="saken">
                  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
                  <a class="tittel" href={sakslenke(s.sak_id)}
                    >{s.sakstittel ?? SAKSLISTE.utenTittel}</a
                  >
                  {#if f}<span class="forhold">{f}</span>{/if}
                  {#if merke || eo}
                    <div class="merker">
                      {#if eo}<span class="merke">{SAKSLISTE.inngaarIEo(eo)}</span>{/if}
                      {#if merke}<span class="merke">{merke}</span>{/if}
                    </div>
                  {/if}
                </div>
                {#each ['vederlag', 'frist'] as const as spor (spor)}
                  {@const k = krevd(s, spor, Boolean(eo))}
                  <div class="krevd" class:tall={k?.tall} class:dempet={k?.dempet}>
                    <span class="kolonnenavn"
                      >{spor === 'vederlag' ? SAKSLISTE.krevdVederlag : SAKSLISTE.krevdFrist}</span
                    >
                    {#if k}
                      <span class="verdi">{k.tekst}</span>
                      {#if k.merknad}<span class="merknad">{k.merknad}</span>{/if}
                    {/if}
                  </div>
                {/each}
                <div class="siste-brev">
                  <span class="kolonnenavn">{SAKSLISTE.sisteBrev}</span>
                  <span class="brevet">
                    {#if s.siste_brev}
                      <b>{SAKSLISTE.brevFra(s.siste_brev.avsender)}</b>
                      {dato(s.siste_brev.dato)}
                    {:else}
                      {SAKSLISTE.ingenBrev}
                    {/if}
                  </span>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </section>
  </main>
</Vardenskall>

<style>
  .arbeid {
    min-width: 0;
    padding: 28px var(--kant) 64px;
  }
  .kort {
    max-width: var(--varden-arbeid);
    margin: 0 auto;
    border: 1px solid var(--rule-color);
    border-radius: var(--r-kort);
    background: var(--surface);
  }
  .liste-hode {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-3) var(--spacing-6);
    padding: var(--spacing-5) var(--spacing-5) var(--spacing-4);
  }
  .over {
    color: var(--ink-3);
    font-size: 12px;
  }
  h1 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: var(--sperring-24);
  }
  /* Primærknappen i Varden (`Knapp.svelte`), som lenke fordi den åpner skjemaet. */
  .ny {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 48px;
    padding: 0 var(--spacing-5);
    border: 1px solid var(--brand);
    border-radius: var(--r-knapp);
    background: var(--brand);
    color: var(--on-brand);
    font-weight: 600;
    text-decoration: none;
    transition: background-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ny:hover {
    background: var(--ink-2);
  }
  .ny:active {
    background: var(--ink-3);
  }
  .ny:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .tilstand {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding: var(--spacing-6) var(--spacing-5) var(--spacing-8);
    border-top: 1px solid var(--rule-color);
    color: var(--ink-2);
  }
  .tilstand h2 {
    color: var(--ink);
    font-size: 18px;
    font-weight: 600;
  }
  .tilstand .detaljer {
    color: var(--ink-3);
    font-size: 14px;
  }
  .radhode,
  .rad {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 200px 112px 136px;
    gap: var(--spacing-1) var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-5);
  }
  .radhode {
    padding-block: var(--spacing-2);
    border-block: 1px solid var(--rule-color);
    background: var(--surface-warm);
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  /* Cellene står på grunnlinjen til tittelen, selv om skriften er ulik. */
  .rad {
    position: relative;
    align-items: baseline;
    border-bottom: 1px solid var(--rule-subtle-color);
  }
  .rad:last-child {
    border-bottom: 0;
    border-radius: 0 0 var(--r-kort) var(--r-kort);
  }
  .rad:hover {
    background: var(--surface-warm);
  }
  .radhode .h {
    text-align: right;
  }
  .radhode .enhet {
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
  }
  .saken,
  .krevd {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  /* Tallene står i mono og høyrestilt, så de kan leses nedover kolonnen. */
  .krevd {
    align-items: flex-end;
    color: var(--ink-3);
    font-size: 12px;
    text-align: right;
  }
  .krevd.tall .verdi {
    color: var(--ink);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  /* Dempet: ikke med i summene (MM-U38). */
  .krevd.dempet .verdi {
    color: var(--ink-3);
  }
  .siste-brev {
    color: var(--ink-2);
    font-size: 14px;
  }
  .siste-brev b {
    display: block;
    color: var(--ink);
    font-weight: 500;
  }
  .tittel {
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
  }
  /* Hele raden kan klikkes, men lenken er tittelen. */
  .tittel::after {
    content: '';
    position: absolute;
    inset: 0;
  }
  .tittel:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .tittel:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .forhold {
    color: var(--ink-2);
    font-size: 14px;
  }
  .merker {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1);
    margin-top: var(--spacing-2);
  }
  .merke {
    padding: 0 var(--spacing-2);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-merke);
    color: var(--ink);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  /* Kolonnenavnet leses opp i hver celle, fordi radhodet er skjult for skjermleseren. */
  .kolonnenavn {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  /* Nøkkeltallene: ett kort per spor. Halvdelen for endringsordrene kommer med #1423. */
  .noekkel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-3);
    padding: 0 var(--spacing-5) var(--spacing-4);
  }
  .spor-kort {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    min-width: 0;
    padding: var(--spacing-3) var(--spacing-4);
    border: 1px solid var(--rule-color);
    border-radius: var(--r-innfelt);
  }
  /* Lappen henger under overskriften og holder seg innenfor kortet på smal skjerm. */
  .spor-tittel {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
  }
  .spor-tittel h2 {
    margin: 0;
    font: inherit;
  }
  .spor-tittel .enhet {
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 400;
  }
  .halv {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .hl,
  .hm {
    color: var(--ink-3);
    font-size: 12px;
  }
  .hl {
    color: var(--ink-2);
  }
  .hv {
    color: var(--ink);
    font-size: 20px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    letter-spacing: var(--sperring-20);
  }
  .hv small {
    color: var(--ink-3);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 400;
  }
  .info {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 1px solid var(--rule-strong-color);
    border-radius: 50%;
    background: none;
    color: var(--ink-2);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  /* Treffflaten er 44 px, selv om knappen er liten. */
  .info::after {
    content: '';
    position: absolute;
    inset: -12px;
  }
  .info:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .lapp {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 5;
    width: min(300px, 100%);
    padding: var(--spacing-3);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-innfelt);
    background: var(--surface);
    box-shadow: var(--overlay-shadow-sm);
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
  }
  .verktoy {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3) var(--spacing-5);
    padding: 0 var(--spacing-5) var(--spacing-4);
  }
  .utvalg,
  .sortering {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2);
  }
  .utvalg button {
    min-height: 40px;
    padding: 0 var(--spacing-3);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-knapp);
    background: var(--surface);
    color: var(--ink);
    font-size: 14px;
    cursor: pointer;
  }
  .utvalg button:hover {
    background: var(--surface-inset);
  }
  .utvalg button[aria-pressed='true'] {
    border-color: var(--brand);
    background: var(--brand);
    color: var(--on-brand);
  }
  .sort-etikett {
    color: var(--ink-3);
    font-size: 12px;
  }
  .sortering button {
    min-height: 40px;
    padding: 0 var(--spacing-3);
    border: 0;
    border-radius: var(--r-felt);
    background: none;
    color: var(--ink-2);
    font-size: 14px;
    cursor: pointer;
  }
  .sortering button:hover {
    background: var(--surface-inset);
  }
  .sortering button[aria-pressed='true'] {
    background: var(--surface-selected);
    color: var(--ink);
    font-weight: 600;
  }
  .utvalg button:focus-visible,
  .sortering button:focus-visible,
  .lenkeknapp:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .sok {
    min-height: 40px;
    margin-left: auto;
    padding: 0 var(--spacing-3);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-felt);
    background: var(--surface-inset);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
  }
  .sok:focus-visible {
    outline: none;
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
  .ingen-treff:not(.aapen) {
    display: contents;
  }
  .ingen-treff.aapen {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding: var(--spacing-6) var(--spacing-5) var(--spacing-8);
    color: var(--ink-2);
  }
  .lenkeknapp {
    min-height: 32px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  @media (max-width: 900px) {
    .radhode {
      display: none;
    }
    .noekkel {
      grid-template-columns: minmax(0, 1fr);
    }
    .sok {
      width: 100%;
      margin-left: 0;
    }
    .rad {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--spacing-2);
    }
    .krevd,
    .siste-brev {
      display: flex;
      flex-direction: row;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--spacing-3);
    }
    .brevet {
      text-align: right;
    }
    .kolonnenavn {
      position: static;
      width: auto;
      height: auto;
      overflow: visible;
      clip-path: none;
      color: var(--ink-3);
      font-size: 12px;
      font-weight: 600;
    }
  }
  @media (max-width: 860px) {
    .arbeid {
      padding: var(--spacing-4);
    }
    .liste-hode {
      padding: var(--spacing-4);
    }
    .rad {
      padding-inline: var(--spacing-4);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ny {
      transition: none;
    }
  }
</style>
