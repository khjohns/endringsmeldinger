<!--
  Skjemaet for ny sak (BF-05, #1481): TE velger forholdet, skriver tittelen og beskrivelsen,
  oppgir datoen og kontrollerer brevet før det sendes. Saken finnes først når påberopelsen
  er sendt (KT-U11), så skjemaet sender gjennom grensen `send` og ikke gjennom en sak.
  Feilene står ved feltet før brevkontrollen (F-4, MM-U32). «Se brevet før sending» står i
  panelet til høyre, som i de andre skjemaene i Varden (F-1). Varselet som alt er sendt, fylles
  ut etter OV-U79 (D-8), men kan ikke legges til før lagringen finnes (#807, #1487).
  Vedleggene lastes opp før saken finnes og bindes av påberopelsen (#1037).
-->
<script lang="ts">
  import { KJERNE } from '#kjerne/versjon.ts';
  import type { Saksmerking } from '#lib/kjernesak/brevtekst.ts';
  import { tekstenKanVaereUtdatert } from '#lib/kjernesak/kontekst.svelte.ts';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brevkontroll, {
    detSomKontrolleres,
    kontrollbrev,
    type TilBrevkontrollen,
  } from './Brevkontroll.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Knapp from './Knapp.svelte';
  import Valg from './Valg.svelte';
  import Filvalg from './Filvalg.svelte';
  import Korrespondansen from './Korrespondansen.svelte';
  import Datofelt from './Datofelt.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Tallfelt from './Tallfelt.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { faarPlass } from './fastlinje.svelte';
  import { fokuser } from './mangler';
  import { ChevronDown } from 'lucide-svelte';
  import {
    FELTENE_UTEN_FORHOLD,
    FORHOLDENE,
    brevet,
    feltene,
    forholdet,
    kommandoene,
    type Brevsending,
    type Forholdsvalg,
    type SendNySak,
    type Kjernevedlegg,
    type Utfylling,
    type VedleggForNySak,
  } from './nysak';
  import { KORRESPONDANSEN, NYSAK, SKJEMA, dagensDato, haerdet, punkt } from './tekster';
  import {
    korrespondansefeilene,
    korrespondansenoekkel,
    KORRESPONDANSEFELTENE,
    tomKorrespondanse,
  } from './korrespondansen';

  let {
    sakId,
    send,
    hentMerking,
    vedleggForNySak,
    utkast = null,
    onsendt,
    onavbrutt,
  }: {
    /** ID-en saken får (`NySak.sakId`). */
    sakId: string;
    send: SendNySak;
    /** Koden saken vil få og kontraktsforkortelsen, lest før brevet vises (LV-U46). */
    hentMerking: () => Promise<Saksmerking>;
    vedleggForNySak: VedleggForNySak;
    /** Skjemaet fra et forsøk med usikkert utfall, så et nytt forsøk sender det samme (#1526). */
    utkast?: Utfylling | null;
    onsendt: (sakId: string) => void;
    onavbrutt: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  // Skjemaet starter fra utkastet én gang; det følger ikke propen etterpå.
  const start = (() => utkast)();
  let forhold = $state<Forholdsvalg | null>(start?.forhold ?? null);
  let velgerAapen = $state(!start);
  let aapenGruppe = $state<string | null>(null);
  let sok = $state('');
  let tittel = $state(start?.tittel ?? '');
  let beskrivelse = $state(start?.beskrivelse ?? '');
  let dato = $state(start?.dato ?? '');
  let endringsordre = $state(start?.endringsordre ?? '');
  let vedlegg = $state<Kjernevedlegg[]>(start?.vedlegg ?? []);
  let lasterOpp = $state(false);
  let alleredeVarslet = $state<boolean | null>(false);
  let varsel = $state(tomKorrespondanse());
  // Dokumentet med varselet kan ikke legges ved før påberopelsen sier det (#1488).
  const varseldokumentet: VedleggForNySak | null = null;
  let feil = $state<Record<string, string>>({});
  let oppsummering = $state<HTMLElement | null>(null);
  let kontroll = $state<Omit<TilBrevkontrollen, 'detteSender' | 'virkninger'> | null>(null);

  const felt = $derived(forhold ? feltene(forhold, KJERNE) : FELTENE_UTEN_FORHOLD);
  const valgt = $derived(forhold ? forholdet(forhold) : null);
  const iDag = dagensDato();
  const varselet = $derived(felt.punkt322 && alleredeVarslet === true);
  // Panelet og tidslinja står fast når de får plass i vinduet, som panelet i vederlagssvaret.
  // Ellers står bare panelet fast, og tidslinja ruller under det (oppdragsgiver 02.11).
  let panel = $state<HTMLElement | null>(null);
  let linja = $state<HTMLElement | null>(null);
  const plass = faarPlass(() => [panel, linja]);

  // Tidslinja viser datoene etter hvert som TE fyller dem ut, og dagen brevet sendes. Datoene
  // står der og ikke i panelet (oppdragsgiver 02.11, #1492).
  const tidslinja = $derived(
    [
      felt.datotekst &&
        dato && {
          naar: dato,
          hva: NYSAK.tidslinjeDato(felt.beskrivelse.endsWith('pålegget')),
          kilde: NYSAK.oppgisIBrevet,
        },
      varselet &&
        varsel.dato && {
          naar: varsel.dato,
          hva: NYSAK.tidslinjeVarselet,
          kilde: NYSAK.sendtFoerSaken,
        },
      { naar: iDag, hva: NYSAK.tidslinjeSendes, kilde: NYSAK.naarDuSender },
    ].filter((d): d is { naar: string; hva: string; kilde: string } => !!d)
  );

  // Panelet viser det brevet sier, i brevets rekkefølge (F-1, GR-U31, VS-U38).
  const linjer = $derived(
    [
      valgt && {
        lag: NYSAK.linjeForholdet,
        tekst: haerdet(`${valgt.navn}, ${punkt(valgt.punkt)}`),
      },
      felt.punkt322 && { lag: NYSAK.linjeVarsel, tekst: NYSAK.varslerEtter322 },
      tittel.trim() && { lag: NYSAK.linjeTittel, tekst: tittel.trim() },
      varselet && {
        lag: NYSAK.linjeVarselet,
        tekst:
          KORRESPONDANSEN.typer.find((t) => t.verdi === varsel.type)?.tekst ?? NYSAK.linjeVarselet,
      },
      // Dokumentet med varselet legges ved brevet (VS-U38).
      valgt && {
        lag: NYSAK.linjeVedlegg,
        tekst:
          [
            ...(varselet ? [NYSAK.varseldokumentetVedlegges] : []),
            ...vedlegg.map((v) => v.filnavn),
          ].join(', ') || NYSAK.ingenVedlegg,
      },
    ].filter((l): l is { lag: string; tekst: string } => !!l)
  );
  const utfylling = (): Utfylling => ({
    forhold: forhold!,
    tittel,
    beskrivelse,
    dato,
    endringsordre,
    vedlegg,
  });

  // Velgeren fra `/mockup` (arbeidsvalg 02.11): gruppene er felt sammen til TE åpner én,
  // og et søk åpner alle gruppene med treff.
  const sokeord = $derived(sok.trim().toLocaleLowerCase('nb-NO'));
  const treff = (...tekster: string[]) =>
    tekster.some((t) => t.toLocaleLowerCase('nb-NO').includes(sokeord));
  const grupper = $derived(
    FORHOLDENE.map((g) => ({
      ...g,
      forhold: treff(g.navn)
        ? g.forhold
        : g.forhold.filter((f) => treff(f.navn, f.punkt, f.beskrivelse)),
    })).filter((g) => g.forhold.length)
  );
  const antallTreff = $derived(grupper.reduce((n, g) => n + g.forhold.length, 0));

  function velg(gruppe: string, kode: string) {
    forhold = { gruppe, kode };
    velgerAapen = false;
    sok = '';
    delete feil.forhold;
  }

  function endre() {
    velgerAapen = true;
    aapenGruppe = FORHOLDENE.find((g) => g.forhold.some((f) => f.kode === forhold?.kode))!.navn;
  }

  async function seBrevet() {
    const ny: Record<string, string> = {};
    if (!forhold) ny.forhold = NYSAK.velgForholdet;
    if (!tittel.trim()) ny.tittel = NYSAK.skrivTittelen;
    if (felt.datotekst && !dato) ny.dato = NYSAK.oppgiDatoen;
    if (felt.endringsordre && !endringsordre.trim()) ny.endringsordre = NYSAK.oppgiEndringsordren;
    if (lasterOpp) ny.vedlegg = NYSAK.ventPaaOpplastingen;
    if (varselet) {
      const mangler = korrespondansefeilene(varsel, 'varsel', {
        dokument: varseldokumentet !== null,
      });
      for (const [f, tekst] of mangler) ny[f] = tekst;
      if (!mangler.length) ny.varselLagres = NYSAK.varseletKanIkkeLagres;
    }
    if (forhold && !ny.tittel && !ny.dato && !ny.endringsordre && !ny.vedlegg) {
      // Kjernen prøver påberopelsen slik serveren gjør, med kravet til beskrivelsen (GR-U15).
      const brev = await brevetMedNummer();
      const lest = kontrollbrev(brev);
      if (!brev) ny.kjernen = NYSAK.ingenMerking;
      else if ('programfeil' in brev) ny.kjernen = brev.programfeil;
      else if ('avvisning' in brev) {
        if (brev.avvisning.regel === 'BESKRIVELSE_MANGLER')
          ny.beskrivelse = NYSAK.beskriv(felt.beskrivelse.endsWith('pålegget'));
        else ny.kjernen = brev.avvisning.melding;
      } else if (!Object.keys(ny).length && lest) {
        feil = {};
        kontroll = { ...lest, kommando: kommandoene(utfylling(), KJERNE).paaberopelse };
        return;
      }
    }
    feil = ny;
    await fokuser(() => oppsummering);
  }

  /** Brevet med nummeret saken vil få nå (LV-U46), eller `null` når nummeret ikke kan hentes. */
  async function brevetMedNummer() {
    try {
      return brevet(utfylling(), sakId, await hentMerking(), KJERNE);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  let sender = $state(false);
  let sendefeil = $state<string | null>(null);
  const sending: Brevsending = {
    part: 'TE',
    get saksbilde() {
      return { tittel: tittel.trim() };
    },
    get sender() {
      return sender;
    },
    get feil() {
      return sendefeil;
    },
    async send(_kommando, tekst) {
      sender = true;
      sendefeil = null;
      try {
        const utkast = utfylling();
        const { opprettelse, paaberopelse } = kommandoene(utkast, KJERNE);
        await send({ sakId, opprettelse, paaberopelse, tekst: tekst ?? [], utkast });
        return true;
      } catch (e) {
        sendefeil = e instanceof Error ? e.message : String(e);
        if (tekstenKanVaereUtdatert(e)) {
          // Avsenderen ser brevet med det nye nummeret og godkjenner det på nytt (LV-U46).
          const lest = kontrollbrev(await brevetMedNummer());
          // Et annet brev kontrolleres på nytt. Bare en ny Vår ref. betyr at en annen sak tok
          // nummeret; ellers står serverens melding.
          if (lest && kontroll && detSomKontrolleres(lest) !== detSomKontrolleres(kontroll)) {
            const nyttNummer = lest.merking !== kontroll.merking;
            kontroll = { ...kontroll, ...lest };
            if (nyttNummer) sendefeil = NYSAK.nyttNummer;
          }
        }
        return false;
      } finally {
        sender = false;
      }
    },
    fjernFeil() {
      sendefeil = null;
    },
  };

  // Feil for et felt som ikke lenger vises, står ikke i oppsummeringen (F-4).
  function vises(f: string) {
    if (f === 'dato') return !!felt.datotekst;
    if (f === 'endringsordre') return felt.endringsordre;
    if (f === korrespondansenoekkel('varsel', 'sendemaate'))
      return varselet && varsel.type === 'brev';
    if (f.startsWith('varsel')) return varselet;
    return true;
  }

  const FELTENE = [
    'forhold',
    'tittel',
    'beskrivelse',
    'dato',
    'endringsordre',
    'vedlegg',
    ...KORRESPONDANSEFELTENE.map((f) => korrespondansenoekkel('varsel', f)),
    'varselLagres',
    'kjernen',
  ];
  const synligeFeil = $derived(FELTENE.filter((f) => feil[f] && vises(f)));
</script>

{#if kontroll && valgt}
  <Brevkontroll
    kjernesak={sending}
    {...kontroll}
    handling={NYSAK.handling}
    svarerPaa={null}
    detteSender={[
      {
        tekst: NYSAK.detteSender(valgt.navn, valgt.punkt),
        lag: null,
      },
    ]}
    virkninger={[NYSAK.virkning]}
    sendTekst={NYSAK.sendTekst}
    tilbakeTil={NYSAK.tilbakeTil}
    ontilbake={() => (kontroll = null)}
    onsendt={() => onsendt(sakId)}
  />
{:else}
  <Arbeidsflate>
    {#snippet hoved()}
      <Utkastkort
        id={id('utkast')}
        tittel={NYSAK.tittel}
        mottaker={SKJEMA.tilBH}
        nivaa={1}
        novalidate
        onsubmit={seBrevet}
      >
        <div class="nysak">
          {#if synligeFeil.length}
            <div
              class="oppsummering"
              tabindex="-1"
              bind:this={oppsummering}
              role="group"
              aria-labelledby={id('mangler')}
            >
              <h2 id={id('mangler')}>{NYSAK.mangler}</h2>
              <ul>
                {#each synligeFeil as f (f)}
                  <li><a href={`#${id(f)}`}>{feil[f]}</a></li>
                {/each}
              </ul>
              <p>{NYSAK.ingenSak}</p>
            </div>
          {/if}

          <fieldset
            class="felt"
            id={id('forhold')}
            tabindex="-1"
            aria-describedby={`${id('forhold-hjelp')}${feil.forhold ? ` ${id('forhold-feil')}` : ''}`}
          >
            <legend>{NYSAK.forholdet}</legend>
            <p class="hjelp" id={id('forhold-hjelp')}>{NYSAK.forholdetHjelp}</p>
            {#if feil.forhold}<p class="feil" id={id('forhold-feil')}>{feil.forhold}</p>{/if}
            <p class="visually-hidden" role="status">
              {velgerAapen && sok.trim() ? NYSAK.antallTreff(antallTreff) : ''}
            </p>
            {#if valgt && !velgerAapen}
              <div class="valgt">
                <div>
                  <strong>{haerdet(valgt.navn)}</strong>
                  <span class="punkt">{punkt(valgt.punkt)}</span>
                </div>
                {#if valgt.regel}
                  <p>{haerdet(valgt.regel.regel)}</p>
                  <p>{haerdet(valgt.regel.konsekvens)}</p>
                {:else}
                  <p>{haerdet(valgt.beskrivelse)}</p>
                {/if}
                <Knapp variant="lenke" onclick={endre}>{NYSAK.endre}</Knapp>
              </div>
            {:else}
              <label class="sok">
                <span class="etikett">{NYSAK.sok}</span>
                <input type="search" bind:value={sok} />
              </label>
              <div class="grupper">
                {#each grupper as g (g.navn)}
                  {@const aapen = aapenGruppe === g.navn || !!sokeord}
                  {@const gid = id(`gruppe-${FORHOLDENE.findIndex((x) => x.navn === g.navn)}`)}
                  <div class="gruppe">
                    <button
                      type="button"
                      class="gruppenavn"
                      aria-expanded={aapen}
                      aria-controls={gid}
                      onclick={() => (aapenGruppe = aapenGruppe === g.navn ? null : g.navn)}
                    >
                      <span>{haerdet(g.navn)}</span>
                      <ChevronDown size={18} aria-hidden="true" />
                    </button>
                    <div
                      class="forholdene"
                      id={gid}
                      role="radiogroup"
                      aria-label={haerdet(g.navn)}
                      hidden={!aapen}
                    >
                      {#each g.forhold as f (f.kode)}
                        <label class="forhold">
                          <input
                            type="radio"
                            name={id('forholdet')}
                            checked={forhold?.kode === f.kode}
                            onchange={() => velg(f.gruppe, f.kode)}
                          />
                          <span class="navn">{haerdet(f.navn)}</span>
                          <span class="punkt">{punkt(f.punkt)}</span>
                        </label>
                      {/each}
                    </div>
                  </div>
                {:else}
                  <p class="hjelp">{NYSAK.ingenTreff}</p>
                {/each}
              </div>
            {/if}
            <p class="staarfast">
              <strong>{NYSAK.staarFastInnledning}</strong>
              {NYSAK.staarFast}
            </p>
          </fieldset>

          <Tallfelt
            id={id('tittel')}
            etikett={NYSAK.sakstittel}
            hjelp={NYSAK.sakstittelHjelp}
            bredde="tekst"
            bind:verdi={tittel}
            paakrevd
            feil={feil.tittel ?? null}
            oninput={() => delete feil.tittel}
          />

          <Tekstomraade
            id={id('beskrivelse')}
            etikett={felt.beskrivelse}
            hjelp={NYSAK.beskrivelseHjelp}
            rader={6}
            bind:verdi={beskrivelse}
            paakrevd
            feil={feil.beskrivelse ?? null}
            oninput={() => delete feil.beskrivelse}
          />

          {#if felt.datotekst}
            <Datofelt
              id={id('dato')}
              etikett={felt.datotekst}
              maks={iDag}
              bind:verdi={dato}
              paakrevd
              feil={feil.dato ?? null}
              oninput={() => delete feil.dato}
            />
          {/if}

          {#if felt.endringsordre}
            <Tallfelt
              id={id('endringsordre')}
              etikett={NYSAK.endringsordre}
              hjelp={NYSAK.endringsordreHjelp}
              bredde="kort"
              bind:verdi={endringsordre}
              paakrevd
              feil={feil.endringsordre ?? null}
              oninput={() => delete feil.endringsordre}
            />
          {/if}

          <Filvalg
            id={id('vedlegg')}
            etikett={NYSAK.vedlegg}
            valgfri
            hjelp={NYSAK.vedleggHjelp}
            grense={vedleggForNySak}
            bind:vedlegg
            bind:laster={
              () => lasterOpp,
              (v) => {
                lasterOpp = v;
                if (!v) delete feil.vedlegg;
              }
            }
            feil={feil.vedlegg ?? null}
          />

          {#if felt.punkt322}
            <div class="felt">
              <Valg
                navn={id('varslet')}
                spoersmaal={NYSAK.alleredeVarslet(felt.beskrivelse.endsWith('pålegget'))}
                valg={[
                  { verdi: false, tekst: 'Nei' },
                  { verdi: true, tekst: 'Ja' },
                ]}
                bind:verdi={alleredeVarslet}
                beskrevetAv={id('kapittel-b')}
              />
              <p class="kapittel-b" id={id('kapittel-b')}>{KORRESPONDANSEN.kapittelB}</p>
            </div>
            {#if varselet}
              <div class="varselet">
                <Korrespondansen
                  id={(f) => id(korrespondansenoekkel('varsel', f))}
                  bind:valg={varsel}
                  feil={(f) => feil[korrespondansenoekkel('varsel', f)] ?? null}
                  grense={varseldokumentet}
                  endret={(f) => {
                    delete feil[korrespondansenoekkel('varsel', f)];
                    delete feil.varselLagres;
                  }}
                />
                <p class="merknad">{NYSAK.varselMerknad}</p>
                {#if feil.varselLagres}<p class="feil" id={id('varselLagres')} tabindex="-1">
                    {feil.varselLagres}
                  </p>{/if}
              </div>
            {/if}
          {/if}

          {#if feil.kjernen}<p class="feil" id={id('kjernen')}>{feil.kjernen}</p>{/if}

          <div class="handlinger">
            <Forkastutkast
              knapp={NYSAK.avbryt}
              tittel={NYSAK.forkastTittel}
              tekst={NYSAK.forkastTekst}
              onforkast={onavbrutt}
            />
          </div>
        </div>
      </Utkastkort>
    {/snippet}
    {#snippet hoeyre()}
      <div class="feste" bind:this={panel}>
        <Hovedlinjer
          tittel={NYSAK.panel}
          tom={NYSAK.panelTom}
          {linjer}
          alternativer={false}
          handling={sendeknapp}
        />
      </div>
      <div
        class="linja"
        class:fast={plass.faarPlass}
        style:--panelhoeyde={`${plass.hoeyder[0] ?? 0}px`}
        bind:this={linja}
      >
        <Tidslinje brev={[]} datoer={[]} utfylt={tidslinja} />
      </div>
    {/snippet}
  </Arbeidsflate>
{/if}

{#snippet sendeknapp()}
  <Knapp variant="primaer" onclick={seBrevet}>{NYSAK.seBrevet}</Knapp>
  <p class="sendes-til">{NYSAK.sendesTil}</p>
{/snippet}

<style>
  /* Skjemaet står i utkastkortet, som i de andre skjemaene (svaret på S-4 i BF-10). */
  .nysak {
    display: grid;
    gap: var(--spacing-6);
    padding: var(--spacing-6);
  }
  .felt {
    display: grid;
    gap: var(--spacing-2);
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend,
  .etikett {
    font-weight: 600;
    color: var(--ink);
  }
  .hjelp {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  input:not([type='radio']) {
    font: inherit;
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
    color: var(--ink);
  }
  .feil {
    margin: 0;
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  .grupper {
    display: grid;
    border-top: var(--rule);
  }
  .gruppe {
    border-bottom: var(--rule);
  }
  .gruppenavn {
    display: flex;
    width: 100%;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .gruppenavn :global(svg) {
    flex-shrink: 0;
    color: var(--ink-3);
    transition: transform 0.15s ease-out;
  }
  .gruppenavn:hover :global(svg) {
    color: var(--ink);
  }
  .gruppenavn[aria-expanded='true'] :global(svg) {
    transform: rotate(180deg);
  }
  .gruppenavn:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .forholdene {
    display: grid;
    padding-bottom: var(--spacing-2);
  }
  .forholdene[hidden] {
    display: none;
  }
  .forhold {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
    min-height: 44px;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--r-felt);
  }
  .forhold:hover {
    background: var(--canvas);
    cursor: pointer;
  }
  .forhold:has(input:checked) {
    background: var(--canvas);
  }
  .forhold .navn {
    flex: 1;
  }
  .forhold input {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--ink);
  }
  .punkt {
    color: var(--ink-3);
    font-weight: 400;
    white-space: nowrap;
  }
  .valgt {
    display: grid;
    gap: var(--spacing-3);
    justify-items: start;
    padding: var(--spacing-4);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .valgt p {
    margin: 0;
  }
  .staarfast {
    margin: var(--spacing-2) 0 0;
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--r-felt);
    background: var(--canvas);
    color: var(--ink-2);
  }
  .staarfast strong {
    color: var(--ink);
  }
  .feste {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
  }
  /* Dekker stripa over panelet, så tidslinja ikke synes der når den ruller under det. */
  .feste::before {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--spacing-4)) 0 calc(100% - var(--r-kort));
    z-index: -1;
    background: var(--canvas);
  }
  .linja.fast {
    position: sticky;
    top: calc(2 * var(--spacing-4) + var(--panelhoeyde));
  }
  .sendes-til {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  /* Varselet som alt er sendt, hører til svaret «Ja», så det står innrykket under spørsmålet. */
  .varselet {
    display: grid;
    gap: var(--spacing-5);
    padding-left: var(--spacing-5);
    border-left: 2px solid var(--rule-strong-color);
  }
  .merknad {
    margin: 0;
    color: var(--ink-2);
  }
  .kapittel-b {
    margin: 0;
    color: var(--ink-2);
  }
  /* Søket hjelper velgeren og er ikke et felt i saken, så etiketten er lettere enn ledetekstene. */
  .sok .etikett {
    font-weight: 400;
    color: var(--ink-2);
  }
  .sok {
    display: grid;
    gap: var(--spacing-2);
    margin-top: var(--spacing-2);
  }
  .oppsummering {
    padding: var(--spacing-4);
    border: 2px solid var(--danger);
    border-radius: var(--r-kort);
  }
  .oppsummering h2 {
    margin: 0 0 var(--spacing-2);
    font-size: 16px;
    font-weight: 600;
  }
  .oppsummering ul {
    margin: 0 0 var(--spacing-3);
    padding-left: var(--spacing-5);
  }
  .oppsummering a {
    color: var(--danger);
    font-weight: 600;
  }
  .oppsummering p {
    margin: 0;
    color: var(--ink-3);
  }
  .oppsummering:focus-visible {
    outline: 2px solid var(--control-focus);
  }
  .handlinger {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    align-items: center;
  }
</style>
