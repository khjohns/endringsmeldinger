<!--
  Varden: eksperimentell saksvisning (#1331, konseptet i docs/design/konsept-varden/). Den
  kompakte saksoverskriften, sporene i venstre kolonne og arbeidet i sporet, med tidslinja og
  panelene i høyre kolonne (valget 27.10). Saken er den samme `lagKjernesak` gir dagens
  visning: brevteksten, handlingene og avvisningene kommer fra kjernen.
-->
<script lang="ts">
  import '$lib/components/kontraktsbord/theme.css';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Spor } from '$kjerne/typer';
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

  let { kjernesak }: { kjernesak: Kjernesakkontekst } = $props();

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
  };
  type Arbeid = { art: 'les' } | { art: 'svar' } | ({ art: 'kontroll' } & Kontroll);

  const SPORENE: Spor[] = ['grunnlag', 'vederlag', 'frist'];
  let valgt = $state<Spor>('vederlag');
  let arbeid = $state<Arbeid>({ art: 'les' });
  let svarvalg = $state(tomtSvar());
  let melding = $state<string | null>(null);

  const u = $derived(kjernesak.utledning);
  const brev = $derived(u ? brevene(u) : []);

  function velgSpor(s: Spor) {
    valgt = s;
    arbeid = { art: 'les' };
    melding = null;
  }

  function sendt() {
    arbeid = { art: 'les' };
    svarvalg = tomtSvar();
    melding = MOTTATT.dittBrev;
  }
</script>

<div class="varden tema-varden">
  <p class="prototype">{SAKEN.prototype}</p>
  {#if (!u || !kjernesak.saksbilde) && kjernesak.feil}
    <div class="lastefeil" role="alert">
      <h1>{SAKEN.lastefeil}</h1>
      <p>{kjernesak.feil}</p>
      <Knapp onclick={() => kjernesak.last()}>{SAKEN.proevIgjen}</Knapp>
    </div>
  {:else if !u || !kjernesak.saksbilde}
    <p class="laster" role="status">{SAKEN.laster}</p>
  {:else}
    <header class="sakshode">
      <h1>{kjernesak.saksbilde.tittel}</h1>
      <p class="meta">
        <span>BH byggherren</span>
        <span>TE entreprenøren</span>
        {#if brev[0]}<span>Opprettet {dato(brev[0].registrert)} av {brev[0].avsender}</span>{/if}
        <span>Du er {kjernesak.part}</span>
      </p>
    </header>

    <div class="rom">
      <nav class="venstre" aria-label={SAKEN.nav}>
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
                  {#if valgt === s && arbeid.art !== 'les'}<span class="merke-utkast"
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

      <main class="arbeid">
        <p class="melding" role="status">{melding ?? ''}</p>
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
              if (n === 'svare:vederlag') arbeid = { art: 'svar' };
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
                tilbake: { art: 'les' },
              };
            }}
          />
        {/if}
      </main>
    </div>
  {/if}
</div>

<style>
  .varden {
    min-height: 100vh;
    padding: var(--spacing-6) var(--spacing-10) var(--spacing-12);
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 16px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }
  .prototype {
    display: inline-block;
    margin-bottom: var(--spacing-4);
    padding: 0 var(--spacing-2);
    border: 1px solid var(--rule-strong-color);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-3);
    font-size: 12px;
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
  .sakshode {
    margin-bottom: var(--spacing-6);
  }
  h1 {
    font-size: 24px;
    font-weight: 600;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-5);
    color: var(--ink-2);
    font-size: 14px;
  }
  .rom {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: var(--spacing-8);
    align-items: start;
  }
  .venstre {
    padding-right: var(--spacing-4);
    border-right: var(--rule);
  }
  .etikett {
    margin: 0 0 var(--spacing-2) var(--spacing-4);
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .spor {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 48px;
    padding: var(--spacing-2) var(--spacing-4);
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0 4px 4px 0;
    background: none;
    font: inherit;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .spor:hover {
    background: var(--surface-inset);
  }
  .spor[aria-current='page'] {
    border-left-color: var(--ink);
    background: var(--surface-selected);
    font-weight: 600;
  }
  .spor:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .navn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .sist {
    color: var(--ink-3);
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
  }
  .arbeid {
    min-width: 0;
  }
  .melding:empty {
    display: none;
  }
  .melding {
    margin-bottom: var(--spacing-4);
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--success-bg);
    border-radius: 4px;
  }
  @media (max-width: 1023px) {
    .varden {
      padding: var(--spacing-4);
    }
    .rom {
      grid-template-columns: minmax(0, 1fr);
    }
    .venstre {
      border-right: 0;
      padding-right: 0;
    }
    .venstre ul {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-2);
    }
    .spor {
      width: auto;
    }
  }
</style>
