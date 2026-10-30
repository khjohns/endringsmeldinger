<!--
  Varden: eksperimentell saksvisning (#1331, konseptet i docs/design/konsept-varden/). Panelet
  til venstre har logoen, saken og sporene, som i dagens visning (oppdragsgiver 29.10, #1391).
  Arbeidet i sporet står under topplinja, med tidslinja og panelene i høyre kolonne (valget 27.10). Saken er den samme `lagKjernesak` gir dagens
  visning: brevteksten, handlingene og avvisningene kommer fra kjernen.
-->
<script lang="ts">
  import '$lib/components/kontraktsbord/theme.css';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Spor } from '$kjerne/typer';
  import { tick } from 'svelte';
  import { Link } from 'lucide-svelte';
  import osloLogo from '../../../../public/logos/Oslo-logo-hvit-RGB.png?inline';
  import Brevkontroll from './Brevkontroll.svelte';
  import Knapp from './Knapp.svelte';
  import Sporlesing from './Sporlesing.svelte';
  import Vederlagssvar from './Vederlagssvar.svelte';
  import { tomtSvar } from './kommandoer';
  import { brevene } from './lesing';
  import {
    BREVKONTROLL,
    MOTTATT,
    SAKEN,
    SPORNAVN,
    STILLING,
    brevtittel,
    dato,
  } from './prototypetekst';

  let {
    kjernesak,
    kontrakt = {},
  }: {
    kjernesak: Kjernesakkontekst;
    /** Prosjektet og partene. Et navn som mangler, vises ikke (#1398). */
    kontrakt?: { prosjekt?: string; byggherre?: string; entreprenoer?: string };
  } = $props();
  const kontraktsrader = $derived(
    [
      [SAKEN.prosjekt, kontrakt.prosjekt],
      [SAKEN.byggherre, kontrakt.byggherre],
      [SAKEN.entreprenoer, kontrakt.entreprenoer],
    ].filter((r): r is [string, string] => !!r[1])
  );

  type Kontroll = {
    kommando: Record<string, unknown>;
    tekst: string[];
    utdypning?: string;
    detteSender: { tekst: string; lag: string | null }[];
    virkninger: string[];
    tittel: string;
    handling: string;
    sendTekst: string;
    tilbakeTil: string;
    svarerPaa: { nummer: number; registrert: string } | null;
    tilbake: Arbeid;
    /** Brevet er svarutkastet, som tømmes når det er sendt. */
    erUtkastet: boolean;
  };
  type Arbeid = { art: 'les' } | { art: 'svar' } | ({ art: 'kontroll' } & Kontroll);

  const SPORENE: Spor[] = ['grunnlag', 'vederlag', 'frist'];
  let valgt = $state<Spor>('vederlag');
  let arbeid = $state<Arbeid>({ art: 'les' });
  let svarvalg = $state(tomtSvar());
  // Mens brevet leses ved siden av skjemaet, felles panelet til venstre inn, så brevet blir
  // omtrent like bredt som ellers (oppdragsgiver 30.10, #1391).
  let vedSiden = $state(false);
  // Utkastet til svaret står til det er sendt eller forkastet, også når BH velger et annet
  // spor (BF-01 S-8). Merket i panelet vises bare når et annet spor er valgt (#1391).
  let utkastAapent = $state(false);
  let melding = $state<{ tekst: string; art: 'sendt' | 'forkastet' } | null>(null);
  let meldingen = $state<HTMLElement | null>(null);
  let lenkestatus = $state('');

  const u = $derived(kjernesak.utledning);
  const brev = $derived(u ? brevene(u) : []);

  function velgSpor(s: Spor) {
    valgt = s;
    arbeid = s === 'vederlag' && utkastAapent ? { art: 'svar' } : { art: 'les' };
    melding = null;
  }

  async function kopierLenke() {
    // Tømmes først, så en lik melding ved neste klikk leses opp igjen.
    lenkestatus = '';
    await tick();
    try {
      await navigator.clipboard.writeText(location.href);
      lenkestatus = SAKEN.lenkeKopiert;
    } catch {
      lenkestatus = SAKEN.lenkeIkkeKopiert;
    }
  }

  function sendt() {
    // Bare det sendte svaret tømmer utkastet; en aksept i et annet spor lar det stå (BF-01 S-8).
    if (arbeid.art === 'kontroll' && arbeid.erUtkastet) {
      svarvalg = tomtSvar();
      utkastAapent = false;
    }
    arbeid = { art: 'les' };
    melding = { tekst: MOTTATT.dittBrev, art: 'sendt' };
  }

  async function forkast() {
    arbeid = { art: 'les' };
    svarvalg = tomtSvar();
    utkastAapent = false;
    melding = { tekst: MOTTATT.forkastet, art: 'forkastet' };
    await tick();
    meldingen?.focus();
  }
</script>

<div class="varden tema-varden" class:innfelt={vedSiden}>
  <div class="panelkolonne" hidden={vedSiden}>
    <div class="panel">
      <div class="avsender">
        <div class="logo" style:background-image={`url(${osloLogo})`} aria-hidden="true"></div>
        <p><span class="kommune">{SAKEN.kommune}</span><span>{SAKEN.foretak}</span></p>
      </div>
      {#if u && kjernesak.saksbilde}
        <header class="sakshode">
          <h1>{kjernesak.saksbilde.tittel}</h1>
          {#if brev[0]}
            <dl class="meta">
              <div>
                <dt>{SAKEN.opprettet}</dt>
                <dd>{dato(brev[0].registrert)} av {brev[0].avsender}</dd>
              </div>
            </dl>
          {/if}
        </header>

        <nav class="sporene" aria-label={SAKEN.nav}>
          <p class="etikett" id="spor-etikett">{SAKEN.spor}</p>
          <ul aria-labelledby="spor-etikett">
            {#each SPORENE as s (s)}
              {@const sisteBrev = brev.filter((b) => b.spor.includes(s)).at(-1)}
              <li>
                <button
                  type="button"
                  class="spor"
                  aria-current={valgt === s ? 'page' : undefined}
                  onclick={() => velgSpor(s)}
                >
                  <span class="navn">
                    {SPORNAVN[s]}
                    {#if s === 'vederlag' && utkastAapent && valgt !== s}<span class="merke-utkast"
                        >{SAKEN.utkast}</span
                      >{/if}
                  </span>
                  <span class="sist"
                    >{sisteBrev
                      ? SAKEN.sist(sisteBrev.nummer, sisteBrev.avsender)
                      : SAKEN.ingenBrev}</span
                  >
                </button>
              </li>
            {/each}
          </ul>
        </nav>

        <!-- Prosjektet og partene hører til kontrakten, ikke saken (oppdragsgiver 30.10). -->
        {#if kontraktsrader.length}
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
      {/if}
      <p class="prototype">{SAKEN.prototype}</p>
    </div>
  </div>

  <div class="flate">
    <div class="topplinje">
      {#if kjernesak.part}<p class="rolle">{SAKEN.duEr(kjernesak.part)}</p>{/if}
      <p class="lenkestatus" role="status">{lenkestatus}</p>
      <Knapp variant="lenke" onclick={kopierLenke}
        ><Link size={16} aria-hidden="true" />{SAKEN.kopierLenke}</Knapp
      >
    </div>

    {#if (!u || !kjernesak.saksbilde) && kjernesak.feil}
      <div class="lastefeil" role="alert">
        <h1>{SAKEN.lastefeil}</h1>
        <p>{kjernesak.feil}</p>
        <Knapp onclick={() => kjernesak.last()}>{SAKEN.proevIgjen}</Knapp>
      </div>
    {:else if !u || !kjernesak.saksbilde}
      <p class="laster" role="status">{SAKEN.laster}</p>
    {:else}
      <main class="arbeid">
        <p
          class="melding"
          class:sendt={melding?.art === 'sendt'}
          class:tom={!melding}
          role="status"
          tabindex="-1"
          bind:this={meldingen}
        >
          {melding?.tekst ?? ''}
        </p>
        {#if arbeid.art === 'kontroll'}
          {@const k = arbeid}
          <Brevkontroll
            {kjernesak}
            kommando={k.kommando}
            tekst={k.tekst}
            utdypning={k.utdypning}
            tittel={k.tittel}
            handling={k.handling}
            svarerPaa={k.svarerPaa}
            detteSender={k.detteSender}
            virkninger={k.virkninger}
            sendTekst={k.sendTekst}
            tilbakeTil={k.tilbakeTil}
            ontilbake={() => (arbeid = k.tilbake)}
            onsendt={sendt}
          />
        {:else if arbeid.art === 'svar' && valgt === 'vederlag' && kjernesak.handlinger.includes('svare:vederlag')}
          <Vederlagssvar
            {kjernesak}
            {u}
            bind:valg={svarvalg}
            onforkast={forkast}
            onvedsiden={(v) => (vedSiden = v)}
            onbrevkontroll={(k) => {
              const krav = brev.find((b) => b.id === u.spor.vederlag.gjeldendeKrav?.dokument);
              arbeid = {
                art: 'kontroll',
                ...k,
                tittel: brevtittel({ art: 'svar', spor: ['vederlag'] }),
                handling: BREVKONTROLL.sendSvaret,
                sendTekst: BREVKONTROLL.sendSvaret,
                tilbakeTil: 'utkastet',
                svarerPaa: krav ? { nummer: krav.nummer, registrert: krav.registrert } : null,
                tilbake: { art: 'svar' },
                erUtkastet: true,
              };
            }}
          />
        {:else}
          <Sporlesing
            {kjernesak}
            {u}
            spor={valgt}
            onvelg={(n) => {
              melding = null;
              if (n === 'svare:vederlag') {
                utkastAapent = true;
                arbeid = { art: 'svar' };
              }
            }}
            onakseptbrev={({ kommando, tekst }) => {
              const svaret = brev.find((b) => b.id === u.spor[valgt].gjeldendeSvar?.dokument);
              arbeid = {
                art: 'kontroll',
                kommando,
                tekst,
                detteSender: svaret
                  ? [{ tekst: STILLING.godtarBrev(svaret.nummer), lag: null }]
                  : [],
                virkninger: [],
                tittel: brevtittel({ art: 'aksept', spor: [valgt] }),
                handling: BREVKONTROLL.sendAksepten,
                sendTekst: BREVKONTROLL.sendAksepten,
                tilbakeTil: 'saken',
                svarerPaa: svaret ? { nummer: svaret.nummer, registrert: svaret.registrert } : null,
                tilbake: valgt === 'vederlag' && utkastAapent ? { art: 'svar' } : { art: 'les' },
                erUtkastet: false,
              };
            }}
          />
        {/if}
      </main>
    {/if}
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
    font-size: 13px;
    line-height: 1.3;
  }
  .kommune {
    color: var(--sidebar-text);
    font-size: 15px;
    font-weight: 600;
  }
  .sakshode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  h1 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }
  .sakshode h1 {
    font-size: 20px;
  }
  /* Etiketten står over verdien, så lange navn får plass (som «Prosjektet i korte trekk»). */
  .meta {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .meta div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .meta dt {
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  .meta dd {
    color: var(--sidebar-text);
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .etikett {
    margin: 0 0 var(--spacing-2);
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .sporene ul {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .spor {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 48px;
    padding: var(--spacing-2) var(--spacing-3);
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0 4px 4px 0;
    background: none;
    font: inherit;
    color: var(--sidebar-text);
    text-align: left;
    cursor: pointer;
  }
  .spor:hover {
    background: var(--sidebar-hover);
  }
  .spor[aria-current='page'] {
    border-left-color: var(--sidebar-text);
    background: var(--sidebar-active);
    font-weight: 600;
  }
  .spor:focus-visible {
    outline: 2px solid var(--sidebar-focus);
    outline-offset: -2px;
  }
  .navn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .sist {
    color: var(--sidebar-muted);
    font-size: 12px;
    font-weight: 400;
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    border: 1px dashed var(--draft-border);
    background: var(--draft-bg);
    color: var(--draft);
  }
  .prototype {
    align-self: flex-start;
    margin-top: auto;
    padding: 0 var(--spacing-2);
    border: 1px solid var(--sidebar-border);
    border-radius: 999px;
    color: var(--sidebar-muted);
    font-size: 12px;
  }
  /* Topplinja, meldingen og lastingen har samme kanter som arbeidet, som står midtstilt. */
  .flate {
    --kant: max(var(--spacing-10), calc((100% - var(--varden-arbeid)) / 2));
    min-width: 0;
  }
  .varden.innfelt {
    grid-template-columns: minmax(0, 1fr);
  }
  .innfelt .flate {
    --kant: max(var(--spacing-10), calc((100% - 2 * var(--varden-ark) - var(--spacing-6)) / 2));
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
  .rolle {
    color: var(--ink-2);
  }
  .lenkestatus {
    margin-left: auto;
    color: var(--ink-3);
  }
  .arbeid {
    padding: var(--spacing-6) var(--spacing-10) var(--spacing-12);
  }
  .laster,
  .lastefeil {
    padding: var(--spacing-6) var(--kant) var(--spacing-12);
  }
  .laster {
    color: var(--ink-2);
  }
  .lastefeil {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-3);
  }
  .arbeid {
    min-width: 0;
  }
  .melding.tom {
    display: none;
  }
  .melding {
    max-width: var(--varden-arbeid);
    margin: 0 auto var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: 4px;
  }
  .melding.sendt {
    background: var(--success-bg);
  }
  .melding:focus {
    outline: none;
  }
  @media (max-width: 1023px) {
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
    /* «Vederlagsjustering» får ikke plass i tre kolonner på en telefon. */
    .sporene ul {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--spacing-2);
    }
    .prototype {
      margin-top: 0;
    }
    .topplinje {
      flex-wrap: wrap;
      padding: var(--spacing-2) var(--spacing-4);
    }
    .arbeid,
    .laster,
    .lastefeil {
      padding: var(--spacing-4);
    }
  }
</style>
