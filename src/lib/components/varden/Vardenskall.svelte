<!--
  Skallet i Varden: panelet til venstre som et saksomslag, med innholdet kalleren gir øverst og
  avsenderen nederst (panel B i `vederlagsoversikt.html`, #1899), og arbeidsflaten med topplinja.
  Saken og sakslisten bruker det samme skallet (#1450). Der panelet er felt inn, står sakens
  tittel i stien og sporene i en rad under den (U-16 i BF-44).
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
  import { medietreff } from './medie.svelte';
  import { SAKEN, initialer } from './tekster';

  let {
    sti = [],
    bruker = null,
    kontrakt,
    visKontrakten = true,
    innfelt = false,
    bred = false,
    toArk = false,
    sakstittel = null,
    panel,
    topplinje,
    sporrad,
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
    /** Panelet står fra 1900 px, og er felt inn fra 1181 px og opp til det (U-16 i BF-44). */
    bred?: boolean;
    /** Arbeidet er to ark ved siden av hverandre, så topplinja følger de kantene. */
    toArk?: boolean;
    /** Sakens tittel, som står i stien der panelet er felt inn. */
    sakstittel?: string | null;
    panel?: Snippet;
    /** Lenkene i topplinja, som gjelder hele saken eller prosjektet. */
    topplinje?: Snippet;
    /** Sporene i topplinja der panelet er felt inn. */
    sporrad?: Snippet;
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
  // Panelet felles inn fra 1181 px opp til 1900 px på en side med `bred` (U-16 i BF-44). Sporene og
  // sakens tittel står da i topplinja, og bare da, så sporene står ett sted om gangen.
  const mellombred = medietreff('(min-width: 1181px) and (max-width: 1899px)', () => bred);
  const panelInne = $derived(innfelt || (bred && mellombred.treff));

  // Avsenderen nederst har prosjektet og kontraktsformen når kontrakten ikke står over (panel B).
  const fotlinjer = $derived.by(() => {
    const k = kontrakt ?? kontraktFraProsjektet();
    return [k.prosjekt, k.kontraktsform].filter((x): x is string => !!x);
  });
</script>

<div class="varden tema-varden" class:innfelt={panelInne} class:toArk={toArk || innfelt}>
  <div class="panelkolonne" hidden={panelInne}>
    <div class="panel">
      {@render panel?.()}
      <div class="bunn">
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
        <div class="avsender">
          <div class="logo" style:background-image={`url(${osloLogo})`} aria-hidden="true"></div>
          <p>
            <span class="kommune">{SAKEN.kommune}</span><span>{SAKEN.foretak}</span>
            {#if !visKontrakten}{#each fotlinjer as linje (linje)}<span>{linje}</span>{/each}{/if}
          </p>
        </div>
        <p class="prototype">{SAKEN.prototype}</p>
      </div>
    </div>
  </div>

  <div class="flate">
    <!-- Der panelet er felt inn, er sakens tittel overskriften for siden, som i omslaget. -->
    {#if panelInne && sakstittel}<h1 class="visually-hidden">{sakstittel}</h1>{/if}
    <div class="topplinje">
      {#if sti.length}
        <nav class="sti" aria-label={SAKEN.stien}>
          <ol>
            {#each sti as smule, i (i)}
              <li class:merkenavn={i === 0}>
                {#if i > 0}<span class="skille" aria-hidden="true">›</span>{/if}
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
                {#if smule.href}<a href={smule.href}>{smule.tekst}</a>{:else}<span
                    aria-current={i === sti.length - 1 ? 'page' : undefined}
                    >{smule.tekst}{#if panelInne && sakstittel && i === sti.length - 1}<span
                        class="sakstittel">{` · ${sakstittel}`}</span
                      >{/if}</span
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
      {#if panelInne && sporrad}<div class="sporrad">{@render sporrad()}</div>{/if}
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
    gap: 28px;
    height: 100vh;
    overflow-y: auto;
    padding: var(--spacing-5) var(--spacing-5) var(--spacing-6);
  }
  /* Avsenderen står nederst, som på et saksomslag (panel B, oppdragsgiver 13.11). */
  .bunn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    margin-top: auto;
  }
  .avsender {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding-top: var(--spacing-4);
    border-top: 1px solid var(--sidebar-border);
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
  .toArk .flate {
    --kant: max(var(--spacing-6), calc((100% - 2 * var(--varden-ark) - var(--spacing-6)) / 2));
  }
  .topplinje {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--spacing-6);
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
  .innfelt .topplinje {
    padding-top: var(--spacing-3);
  }
  .sporrad {
    display: flex;
    flex-basis: 100%;
    font-size: 14px;
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
    .bunn {
      display: none;
    }
    /* «Vederlagsjustering» og «Krav om endringsordre» får ikke plass i tre kolonner på en
       telefon, så valgene bryter i rader (design-reviewet 01.11, #1450). */
    .panel :global(.valgene) {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--spacing-2);
    }
    .topplinje {
      flex-wrap: wrap;
      padding: var(--spacing-2) var(--spacing-4);
    }
  }
</style>
