<!--
  Skallet i Varden: panelet til venstre med avsenderen, innholdet kalleren gir og kontrakten,
  og arbeidsflaten med topplinja. Saken og sakslisten bruker det samme skallet (#1450).
-->
<script lang="ts" module>
  /** Et ledd i stien i topplinja. Det siste leddet er siden brukeren står på. */
  export type Smule = { tekst: string; href?: string };
</script>

<script lang="ts">
  import '$lib/components/kontraktsbord/theme.css';
  import type { Snippet } from 'svelte';
  import osloLogo from '../../../../public/logos/Oslo-logo-hvit-RGB.png?inline';
  import { kontraktFraProsjektet, type Kontrakt } from './kontrakt';
  import { SAKEN, initialer } from './tekster';

  let {
    sti = [],
    bruker = null,
    kontrakt,
    visKontrakten = true,
    innfelt = false,
    panel,
    topplinje,
    children,
  }: {
    /** Stien til siden, fra «Varden» til saken (prototypen `grunnlagsoversikt.html`). */
    sti?: Smule[];
    /**
     * Den innloggede, med navnet fra sesjonen. Firmanavnet venter på at serveren leser teamet i
     * Catenda: kontraktssiden er ikke organisasjonen (AGENTS.md, «Domenet»).
     */
    bruker?: { name: string } | null;
    /** Prosjektet og partene i demoruta. Ellers leses de av prosjektet (#1398). */
    kontrakt?: Kontrakt;
    visKontrakten?: boolean;
    /** Panelet er felt inn, så arbeidsflaten får hele bredden (oppdragsgiver 30.10, #1391). */
    innfelt?: boolean;
    panel?: Snippet;
    topplinje?: Snippet;
    children: Snippet;
  } = $props();

  // Et navn som mangler, står ikke der (#1398).
  const kontraktsrader = $derived.by(() => {
    const k = kontrakt ?? kontraktFraProsjektet();
    return [
      [SAKEN.prosjekt, k.prosjekt],
      [SAKEN.kontraktsform, k.kontraktsform],
      [SAKEN.byggherre, k.byggherre],
      [SAKEN.entreprenoer, k.entreprenoer],
    ].filter((r): r is [string, string] => !!r[1]);
  });
</script>

<div class="varden tema-varden" class:innfelt>
  <div class="panelkolonne" hidden={innfelt}>
    <div class="panel">
      <div class="avsender">
        <div class="logo" style:background-image={`url(${osloLogo})`} aria-hidden="true"></div>
        <p><span class="kommune">{SAKEN.kommune}</span><span>{SAKEN.foretak}</span></p>
      </div>
      {@render panel?.()}
      <!-- Prosjektet og partene hører til kontrakten, ikke saken (oppdragsgiver 30.10). -->
      {#if visKontrakten && kontraktsrader.length}
        <section class="kontrakten" aria-labelledby="kontrakt-etikett">
          <h2 class="etikett" id="kontrakt-etikett">{SAKEN.kontrakten}</h2>
          <dl class="meta">
            {#each kontraktsrader as [etikett, verdi] (etikett)}
              <div>
                <dt>{etikett}</dt>
                <dd>{verdi}</dd>
              </div>
            {/each}
          </dl>
        </section>
      {/if}
      <p class="prototype">{SAKEN.prototype}</p>
    </div>
  </div>

  <div class="flate">
    <div class="topplinje">
      {#if sti.length}
        <nav class="sti" aria-label={SAKEN.stien}>
          <ol>
            {#each sti as smule, i (i)}
              <li class:merkenavn={i === 0}>
                {#if i > 0}<span class="skille" aria-hidden="true">›</span>{/if}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
                {#if smule.href}<a href={smule.href}>{smule.tekst}</a>{:else}<span
                    aria-current={i === sti.length - 1 ? 'page' : undefined}>{smule.tekst}</span
                  >{/if}
              </li>
            {/each}
          </ol>
        </nav>
      {/if}
      {@render topplinje?.()}
      {#if bruker?.name}
        <p class="bruker">
          <span class="initialer" aria-hidden="true">{initialer(bruker.name)}</span>
          <span class="navn">{bruker.name}</span>
        </p>
      {/if}
    </div>
    {@render children()}
  </div>
</div>

<style>
  .varden {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    min-height: 100vh;
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  .panelkolonne {
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
  }
  .panel {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-8);
    height: 100vh;
    overflow-y: auto;
    padding: 0 var(--spacing-5) var(--spacing-6);
  }
  /* Like høy som topplinja, så byvåpenet står på linje med rollen. */
  .avsender {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    min-height: var(--mockup-topbar-height);
  }
  /* Samme utsnitt av logoen som dagens visning (LeftSidebar.svelte): bare byvåpenet. */
  .logo {
    flex: 0 0 36px;
    width: 36px;
    height: 43px;
    background-position: -22px -22px;
    background-repeat: no-repeat;
    background-size: 128px auto;
  }
  .avsender p {
    display: flex;
    flex-direction: column;
    color: var(--sidebar-muted);
    font-size: 12px;
    line-height: 1.3;
  }
  .kommune {
    color: var(--sidebar-text);
    font-size: 14px;
    font-weight: 600;
  }
  /* Etiketten, metadataene og valgene i panelet er felles for saken og sakslisten. */
  .panel :global(.meta) {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  /* Etiketten står over verdien, så lange navn får plass (som «Prosjektet i korte trekk»). */
  .panel :global(.meta div) {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .panel :global(.meta dt) {
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .panel :global(.meta dd) {
    color: var(--sidebar-text);
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .panel :global(.etikett) {
    margin: 0 0 var(--spacing-2);
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .panel :global(.valgene) {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .panel :global(.valg) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 48px;
    padding: var(--spacing-2) var(--spacing-3);
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0 var(--r-felt) var(--r-felt) 0;
    background: none;
    font: inherit;
    color: var(--sidebar-text);
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .panel :global(.valg:hover) {
    background: var(--sidebar-hover);
  }
  .panel :global(.valg[aria-current='page']) {
    border-left-color: var(--sidebar-text);
    background: var(--sidebar-active);
    font-weight: 600;
  }
  .panel :global(.valg:focus-visible) {
    outline: 2px solid var(--sidebar-focus);
    outline-offset: -2px;
  }
  .panel :global(.valg .under) {
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 400;
  }
  /* Kontrakten står nederst i panelet, som i dagens oversikt (oppdragsgiver 30.10). */
  .kontrakten,
  .prototype {
    margin-top: auto;
  }
  .kontrakten + .prototype {
    margin-top: 0;
  }
  .prototype {
    align-self: flex-start;
    padding: 0 var(--spacing-2);
    border: 1px solid var(--sidebar-border);
    border-radius: var(--r-merke);
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  /* Topplinja og arbeidet har de samme kantene, og arbeidet står midtstilt. */
  .flate {
    --kant: max(var(--spacing-6), calc((100% - var(--varden-arbeid)) / 2));
    min-width: 0;
  }
  .varden.innfelt {
    grid-template-columns: minmax(0, 1fr);
  }
  .innfelt .flate {
    --kant: max(var(--spacing-6), calc((100% - 2 * var(--varden-ark) - var(--spacing-6)) / 2));
  }
  .topplinje {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    min-height: var(--mockup-topbar-height);
    padding: 0 var(--kant);
    border-bottom: var(--rule);
    background: var(--surface);
    font-size: 14px;
  }
  .sti {
    margin-right: auto;
    min-width: 0;
  }
  .sti ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-1) var(--spacing-2);
    color: var(--ink-3);
  }
  .sti li {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .sti a {
    color: var(--ink-2);
    text-decoration: none;
  }
  .sti a:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
    border-radius: var(--r-felt);
  }
  .sti a:hover {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sti [aria-current] {
    color: var(--ink);
    font-weight: 500;
  }
  .sti .merkenavn :is(a, span) {
    color: var(--ink);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .bruker {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    margin-left: auto;
  }
  .initialer {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--brand);
    color: var(--on-brand);
    font-size: 12px;
    font-weight: 600;
  }
  .bruker .navn {
    font-weight: 600;
  }
  @media (max-width: 560px) {
    .bruker .navn {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  }
  @media (max-width: 860px) {
    .varden {
      grid-template-columns: minmax(0, 1fr);
    }
    .panel {
      position: static;
      height: auto;
      gap: var(--spacing-5);
      padding: var(--spacing-4);
    }
    .avsender {
      min-height: 44px;
    }
    /* «Vederlagsjustering» og «Krav om endringsordre» får ikke plass i tre kolonner på en
       telefon, så valgene bryter i rader (design-reviewet 01.11, #1450). */
    .panel :global(.valgene) {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--spacing-2);
    }
    .kontrakten,
    .prototype {
      margin-top: 0;
    }
    .topplinje {
      flex-wrap: wrap;
      padding: var(--spacing-2) var(--spacing-4);
    }
  }
</style>
