<!--
  Sakslisten i prosjektet (#1450): prototypen `docs/design/prototyper/saksliste.html` med
  svarene på M1–M8 og avklaringene 02.11. Panelet har sakstypene KOE og EO (KT-U9, M4), og
  lista har saken, «Vederlag» og «Frist» (M7). Tallene øverst, «Siste brev», utvalget og søket
  kommer i økt B.
-->
<script lang="ts">
  import type { Part } from '$kjerne/typer';
  import type { Sakslinje } from '$lib/types/api';
  import { Plus } from 'lucide-svelte';
  import Knapp from './Knapp.svelte';
  import Vardenskall from './Vardenskall.svelte';
  import type { Kontrakt } from './kontrakt';
  import { FANENE, fanen, forholdet, saksmerke, sporcelle, type Fane } from './saksliste';
  import { SAKEN, SAKSLISTE } from './tekster';

  let {
    saker,
    part,
    laster = false,
    feil = null,
    prosjektNavn,
    kontrakt,
    sakslenke,
    nyttKrav,
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
    /**
     * Dokumentkoden til den sendte endringsordren som omfatter KOE-saken (EO-U13, EO-U14).
     * Serveren gir den ikke før EO-saken og brevkoden er bygget (#1423, #1174).
     */
    endringsordrer?: Record<string, string>;
    onproevIgjen?: () => void;
  } = $props();

  const FANENAVN: Record<Fane, string> = { koe: SAKSLISTE.koe, eo: SAKSLISTE.eo };

  let fane = $state<Fane>('koe');
  const antall = $derived(
    Object.fromEntries(FANENE.map((f) => [f, saker.filter((s) => fanen(s) === f).length]))
  );
  const synlige = $derived(saker.filter((s) => fanen(s) === fane));
</script>

<Vardenskall {part} {kontrakt}>
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
        {#if part === 'TE'}
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
      {:else if synlige.length === 0}
        <div class="tilstand tom">
          {#if fane === 'eo'}
            <p>{SAKSLISTE.tomEo}</p>
            <p class="detaljer">{SAKSLISTE.tomEoForklaring}</p>
          {:else}
            <p>{part === 'TE' ? SAKSLISTE.tomKoeTe : SAKSLISTE.tomKoe}</p>
          {/if}
        </div>
      {:else}
        <div class="radhode" aria-hidden="true">
          <span>{SAKSLISTE.sak}</span><span>{SAKSLISTE.vederlag}</span><span>{SAKSLISTE.frist}</span
          >
        </div>
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
                {#if f?.navn}<span class="forhold">{f.navn}</span>{/if}
                {#if f?.betegnelse}<span class="betegnelse">{f.betegnelse}</span>{/if}
                {#if f?.under}<span class="resultat">{f.under}</span>{/if}
                {#if merke || eo}
                  <div class="merker">
                    {#if eo}<span class="merke">{SAKSLISTE.inngaarIEo(eo)}</span>{/if}
                    {#if merke}<span class="merke">{merke}</span>{/if}
                  </div>
                {/if}
              </div>
              {#each ['vederlag', 'frist'] as const as spor (spor)}
                {@const c = sporcelle(s, spor)}
                <div class="spor">
                  <span class="kolonnenavn">{SAKSLISTE[spor]}</span>
                  {#if c}
                    {#if c.verdier.length}
                      <dl class="verdier">
                        {#each c.verdier as v (v.etikett)}
                          <div>
                            <dt>{v.etikett}</dt>
                            <dd>{v.tekst}</dd>
                          </div>
                        {/each}
                      </dl>
                    {:else if c.ikkeKrevd}
                      <span class="resultat">{SAKSLISTE.ikkeKrevd}</span>
                    {/if}
                    {#if c.betegnelse}<span class="betegnelse">{c.betegnelse}</span>{/if}
                    {#if c.under}<span class="resultat">{c.under}</span>{/if}
                  {/if}
                </div>
              {/each}
            </li>
          {/each}
        </ul>
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
    letter-spacing: -0.015em;
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
    grid-template-columns: minmax(0, 1fr) 176px 148px;
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
  .rad {
    position: relative;
    align-items: start;
    border-bottom: 1px solid var(--rule-subtle-color);
  }
  .rad:last-child {
    border-bottom: 0;
    border-radius: 0 0 var(--r-kort) var(--r-kort);
  }
  .rad:hover {
    background: var(--surface-warm);
  }
  .saken,
  .spor {
    display: flex;
    flex-direction: column;
    min-width: 0;
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
  .betegnelse {
    color: var(--ink);
    font-size: 14px;
  }
  .resultat {
    color: var(--ink-3);
    font-size: 12px;
  }
  .saken .betegnelse {
    margin-top: var(--spacing-1);
  }
  .merker {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1) 6px;
    margin-top: 6px;
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
  .verdier div {
    display: flex;
    gap: var(--spacing-2);
    align-items: baseline;
  }
  .verdier dt {
    min-width: 2.75rem;
    color: var(--ink-3);
    font-size: 12px;
  }
  .verdier dd {
    font-family: var(--font-mono);
    font-size: 14px;
  }
  .verdier div + div dd {
    color: var(--ink-2);
  }
  @media (max-width: 900px) {
    .radhode {
      display: none;
    }
    .rad {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: var(--spacing-3) var(--spacing-4);
    }
    .saken {
      grid-column: 1 / -1;
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
