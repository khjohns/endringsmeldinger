<!--
  Varden: eksperimentell saksvisning (#1331, konseptet i docs/design/konsept-varden/). Panelet
  til venstre har logoen, saken og sporene, som i dagens visning (oppdragsgiver 29.10, #1391).
  Arbeidet i sporet står under topplinja, med tidslinja og panelene i høyre kolonne (valget 27.10). Saken er den samme `lagKjernesak` gir dagens
  visning: brevteksten, handlingene og avvisningene kommer fra kjernen.
-->
<script lang="ts">
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Spor } from '$kjerne/typer';
  import { tick, untrack, type Snippet } from 'svelte';
  import { sakensKode } from '$kjerne/frosset/brevtittel';
  import Brevkontroll from './Brevkontroll.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Sporlesing from './Sporlesing.svelte';
  import Vardenskall, { type Smule } from './Vardenskall.svelte';
  import Vederlagssvar from './Vederlagssvar.svelte';
  import { tomtSvar } from './kommandoer';
  import { kontraktFraProsjektet, settOrganisasjoner, type Kontrakt } from './kontrakt';
  import { brevene, forholdetISaken, type Brevref } from './lesing';
  import { BREVKONTROLL, MOTTATT, NYSAK, SAKEN, SPORNAVN, STILLING, dato } from './tekster';

  let {
    kjernesak,
    kontrakt,
    kvittering,
    saksliste,
    prosjekter,
    bruker = null,
    nySak,
    spor,
    dagensVisning,
  }: {
    kjernesak: Kjernesakkontekst;
    /** Sporet saken åpner i. Uten det står saken i vederlaget, eller i forholdet etter opprettelsen. */
    spor?: Spor;
    /** Kvitteringen for brevet som opprettet saken (BF-05 steg 6, F-6). */
    kvittering?: string;
    /** Lenken til sakslisten, i stien og der saken ikke finnes (#1473). */
    saksliste?: string;
    /** Lenken til prosjektene, «Varden» først i stien. */
    prosjekter?: string;
    /** Den innloggede, i topplinja. Demoruta har ingen. */
    bruker?: { name: string } | null;
    /** Skjemaet for ny sak, som står i arbeidsflaten før saken finnes (BF-05, KT-U11). */
    nySak?: Snippet;
    /** Lenken til saken i dagens visning, for brevtypene Varden ikke kan åpne. */
    dagensVisning?: string;
    /** Prosjektet og partene i demoruta. Ellers leses de av prosjektet (#1398). */
    kontrakt?: Kontrakt;
  } = $props();
  // Serveren gir partsnavnene når driften har satt dem, men ikke kontraktsformen (#1398).
  settOrganisasjoner(() => {
    const k = kontrakt ?? kontraktFraProsjektet();
    // Et tomt navn er ikke et navn (#1398), som i kontraktsradene.
    return { BH: k.byggherre || undefined, TE: k.entreprenoer || undefined };
  });

  type Kontroll = {
    kommando: Record<string, unknown>;
    tekst: string[];
    utdypning?: string;
    detteSender: { tekst: string; lag: string | null }[];
    virkninger: string[];
    merking: string | null;
    deresRef: string[];
    tittel: string | null;
    handling: string;
    sendTekst: string;
    tilbakeTil: string;
    svarerPaa: Brevref | null;
    tilbake: Arbeid;
    /** Brevet er svarutkastet, som tømmes når det er sendt. */
    erUtkastet: boolean;
  };
  type Arbeid = { art: 'les' } | { art: 'svar' } | ({ art: 'kontroll' } & Kontroll);

  const SPORGRUPPENE: { id: string; etikett: string; spor: Spor[] }[] = [
    { id: 'forholdet', etikett: SAKEN.kontraktsforhold, spor: ['forhold'] },
    { id: 'kravene', etikett: SAKEN.krav, spor: ['vederlag', 'frist'] },
  ];
  // Etter opprettelsen står saken i forholdet, med påberopelsen (BF-05 steg 6).
  let valgt = $state<Spor>(untrack(() => spor ?? (kvittering ? 'forhold' : 'vederlag')));
  let arbeid = $state<Arbeid>({ art: 'les' });
  let svarvalg = $state(tomtSvar());
  // Mens brevet leses ved siden av skjemaet, felles panelet til venstre inn, så brevet blir
  // omtrent like bredt som ellers (oppdragsgiver 30.10, #1391).
  let vedSiden = $state(false);
  // Utkastet til svaret står til det er sendt eller forkastet, også når BH velger et annet
  // spor (BF-01 S-8). Merket i panelet vises bare når et annet spor er valgt (#1391).
  let utkastAapent = $state(false);
  let melding = $state<{ tekst: string; art: 'sendt' | 'forkastet' } | null>(
    untrack(() => (kvittering ? { tekst: kvittering, art: 'sendt' } : null))
  );
  let meldingen = $state<HTMLElement | null>(null);
  let proever = $state(false);
  let sistForsoekt = $state<string | null>(null);

  const u = $derived(kjernesak.utledning);
  const brev = $derived(u ? brevene(u) : []);
  // Forholdet heter det TE påberoper i sporlista, som i sporhodet (OV-U78).
  const forholdsnavn = $derived((u && forholdetISaken(u)?.navn) ?? SPORNAVN.forhold);
  const sakskode = $derived.by(() => {
    const kode = kjernesak.sak?.merking?.sakskode;
    return kode ? sakensKode(kode) : null;
  });
  // Stien som i prototypen: Varden › prosjektet › saken, med sakens kode (LV-U46).
  const sti = $derived.by((): Smule[] => {
    const prosjekt = (kontrakt ?? kontraktFraProsjektet()).prosjekt;
    return [
      { tekst: SAKEN.merkenavn, href: prosjekter },
      ...(prosjekt ? [{ tekst: prosjekt, href: saksliste }] : []),
      { tekst: nySak ? NYSAK.over : (sakskode ?? SAKEN.nav) },
    ];
  });

  function velgSpor(s: Spor) {
    valgt = s;
    arbeid = s === 'vederlag' && utkastAapent ? { art: 'svar' } : { art: 'les' };
    melding = null;
  }

  async function proevIgjen() {
    proever = true;
    try {
      await kjernesak.last();
    } finally {
      proever = false;
      sistForsoekt = new Date().toISOString();
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

  /**
   * Etter en avvist sending kan saken være lastet på nytt, med et nytt brev fra motparten eller
   * et nytt nummer. Brevet lages da igjen av den samme kommandoen, så teksten og hodet avsenderen
   * godkjenner, er det som sendes (LV-U2, LV-U51, D-5 i BF-07). Avviser kjernen kommandoen nå,
   * står brevet og meldingen fra sendingen.
   */
  function byggPaaNytt(k: Kontroll) {
    const b = kjernesak.brev(k.kommando, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) return;
    if (arbeid.art !== 'kontroll' || arbeid.kommando !== k.kommando) return;
    arbeid = {
      ...arbeid,
      tekst: b.tekst,
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
    };
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

<Vardenskall
  {sti}
  {bruker}
  {kontrakt}
  visKontrakten={!!(nySak || (u && kjernesak.saksbilde))}
  innfelt={vedSiden}
>
  {#snippet panel()}
    {#if !nySak && u && kjernesak.saksbilde}
      <header class="sakshode">
        <div class="tittel">
          {#if sakskode}<p class="kode">{sakskode}</p>{/if}
          <h1>{kjernesak.saksbilde.tittel}</h1>
        </div>
        {#if brev[0]}
          <dl class="meta">
            <div>
              <dt>{SAKEN.opprettet}</dt>
              <dd>{dato(brev[0].registrert)} av {brev[0].avsender}</dd>
            </div>
          </dl>
        {/if}
      </header>

      <!-- Forholdet og kravene som bygger på det, i hver sin gruppe (oppdragsgiver 06.11, #1631). -->
      <nav class="sporene" aria-label={SAKEN.nav}>
        {#each SPORGRUPPENE as gruppe (gruppe.id)}
          <div class="gruppe">
            <p class="etikett" id={`spor-${gruppe.id}`}>{gruppe.etikett}</p>
            <ul class="valgene" aria-labelledby={`spor-${gruppe.id}`}>
              {#each gruppe.spor as s (s)}
                <li>
                  <button
                    type="button"
                    class="valg"
                    aria-current={valgt === s ? 'page' : undefined}
                    onclick={() => velgSpor(s)}
                  >
                    <span class="navn">
                      {s === 'forhold' ? forholdsnavn : SPORNAVN[s]}
                      {#if s === 'vederlag' && utkastAapent && valgt !== s}<span
                          class="merke-utkast">{SAKEN.utkast}</span
                        >{/if}
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    {/if}
  {/snippet}

  {#if nySak}
    <main class="arbeid">
      <!-- Kvitteringen etter «Avbryt» står over skjemaet, som etter sendingen. -->
      {#if melding}<div class="melding" role="status">
          <Melding art="kvittering" levende={false}>{melding.tekst}</Melding>
        </div>{/if}
      {@render nySak()}
    </main>
  {:else if kjernesak.finnes === false}
    <div class="lastefeil" role="alert">
      <h1>{SAKEN.finnesIkke}</h1>
      <p>{SAKEN.finnesIkkeForklaring}</p>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
      {#if saksliste}<p><a href={saksliste}>{SAKEN.tilSakslisten}</a></p>{/if}
    </div>
  {:else if (!u || !kjernesak.saksbilde) && kjernesak.feil}
    <div class="lastefeil" role="alert">
      <h1>{SAKEN.lastefeil}</h1>
      <p>{SAKEN.lastefeilBeklager}</p>
      <p class="detaljer">{SAKEN.lastefeilDetaljer(kjernesak.feil)}</p>
      {#if sistForsoekt && !proever}<p class="detaljer">
          {SAKEN.sistForsoekt(sistForsoekt)}
        </p>{/if}
      <Knapp opptatt={proever} onclick={proevIgjen}
        >{proever ? SAKEN.proever : SAKEN.proevIgjen}</Knapp
      >
    </div>
  {:else if !u || !kjernesak.saksbilde}
    <p class="laster" role="status">{SAKEN.laster}</p>
  {:else}
    <main class="arbeid">
      <div class="melding" class:tom={!melding} role="status" tabindex="-1" bind:this={meldingen}>
        {#if melding}<Melding art="kvittering" levende={false}>{melding.tekst}</Melding>{/if}
      </div>
      {#if arbeid.art === 'kontroll'}
        {@const k = arbeid}
        <Brevkontroll
          {kjernesak}
          kommando={k.kommando}
          tekst={k.tekst}
          utdypning={k.utdypning}
          merking={k.merking}
          deresRef={k.deresRef}
          tittel={k.tittel}
          handling={k.handling}
          svarerPaa={k.svarerPaa}
          detteSender={k.detteSender}
          virkninger={k.virkninger}
          sendTekst={k.sendTekst}
          tilbakeTil={k.tilbakeTil}
          ontilbake={() => (arbeid = k.tilbake)}
          onsendt={sendt}
          onavvist={() => byggPaaNytt(k)}
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
              handling: BREVKONTROLL.sendSvaret,
              sendTekst: BREVKONTROLL.sendSvaret,
              tilbakeTil: 'utkastet',
              svarerPaa: krav ?? null,
              tilbake: { art: 'svar' },
              erUtkastet: true,
            };
          }}
        />
      {:else}
        {#key valgt}
          <Sporlesing
            {kjernesak}
            {u}
            spor={valgt}
            {dagensVisning}
            onspor={velgSpor}
            onvelg={(n) => {
              melding = null;
              if (n === 'svare:vederlag') {
                utkastAapent = true;
                arbeid = { art: 'svar' };
              }
            }}
            onakseptbrev={({ kommando, tekst, virkninger, merking, deresRef, tittel }) => {
              const svaret = brev.find((b) => b.id === u.spor[valgt].gjeldendeSvar?.dokument);
              arbeid = {
                art: 'kontroll',
                kommando,
                tekst,
                detteSender: svaret ? [{ tekst: STILLING.godtarBrev(svaret), lag: null }] : [],
                virkninger,
                merking,
                deresRef,
                tittel,
                handling: BREVKONTROLL.sendAksepten,
                sendTekst: BREVKONTROLL.sendAksepten,
                tilbakeTil: 'saken',
                svarerPaa: svaret ?? null,
                tilbake: valgt === 'vederlag' && utkastAapent ? { art: 'svar' } : { art: 'les' },
                erUtkastet: false,
              };
            }}
          />
        {/key}
      {/if}
    </main>
  {/if}
</Vardenskall>

<style>
  h1 {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.01em;
    text-wrap: balance;
  }
  .sakshode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .sakshode h1 {
    font-size: 20px;
  }
  .tittel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .kode {
    color: var(--sidebar-muted);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.02em;
  }
  .sporene {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }
  .navn {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border-radius: var(--r-merke);
    font-size: 12px;
    font-weight: 500;
    border: 1px dashed var(--draft-border);
    background: var(--surface);
    color: var(--draft);
  }
  .arbeid {
    min-width: 0;
    padding: 28px var(--kant) 64px;
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
  .lastefeil .detaljer {
    color: var(--ink-3);
    font-size: 14px;
  }
  .melding.tom {
    display: none;
  }
  .melding {
    max-width: var(--varden-arbeid);
    margin: 0 auto var(--spacing-4);
  }
  .melding:focus {
    outline: none;
  }
  @media (max-width: 860px) {
    .arbeid,
    .laster,
    .lastefeil {
      padding: var(--spacing-4);
    }
  }
</style>
