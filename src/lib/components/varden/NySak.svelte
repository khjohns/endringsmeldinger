<!--
  Skjemaet for ny sak (BF-05, #1481): TE velger forholdet, skriver tittelen og beskrivelsen,
  oppgir datoen og kontrollerer brevet før det sendes. Saken finnes først når påberopelsen
  er sendt (KT-U11), så skjemaet sender gjennom grensen `send` og ikke gjennom en sak.
  Feilene står ved feltet før brevkontrollen (F-4, MM-U32). «Se brevet før sending» står i
  panelet til høyre, som i de andre skjemaene i Varden (F-1). Varselet som alt er sendt, fylles
  ut etter OV-U79 (D-8), men kan ikke legges til før lagringen finnes (#807, #1487).
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { KJERNE } from '$kjerne/versjon';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brevkontroll from './Brevkontroll.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Knapp from './Knapp.svelte';
  import Valg from './Valg.svelte';
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
  } from './nysak';
  import { NYSAK } from './tekster';

  let {
    sakId,
    send,
    onsendt,
    onavbrutt,
  }: {
    /** ID-en saken får (`NySak.sakId`). */
    sakId: string;
    send: SendNySak;
    onsendt: (sakId: string) => void;
    onavbrutt: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  let forhold = $state<Forholdsvalg | null>(null);
  let velgerAapen = $state(true);
  let aapenGruppe = $state<string | null>(null);
  let sok = $state('');
  let tittel = $state('');
  let beskrivelse = $state('');
  let dato = $state('');
  let endringsordre = $state('');
  let alleredeVarslet = $state<boolean | null>(false);
  let varseltype = $state<string | null>(null);
  let sendemaate = $state<string | null>(null);
  let varseldato = $state('');
  let varselbeskrivelse = $state('');
  let feil = $state<Record<string, string>>({});
  let avbryter = $state(false);
  let oppsummering = $state<HTMLElement | null>(null);
  let kontroll = $state<{ tekst: string[]; kommando: Record<string, unknown> } | null>(null);

  const felt = $derived(forhold ? feltene(forhold, KJERNE) : FELTENE_UTEN_FORHOLD);
  const valgt = $derived(forhold ? forholdet(forhold) : null);
  // Dagens dato i norsk tid, som `dagensDato` i `skjemadata.ts` (VS-U8).
  const iDag = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
  const varselet = $derived(felt.punkt322 && alleredeVarslet === true);
  // Panelet og tidslinja står fast når de får plass i vinduet, som panelet i vederlagssvaret.
  // Ellers står bare panelet fast, og tidslinja ruller under det (oppdragsgiver 02.11).
  let panel = $state<HTMLElement | null>(null);
  let linja = $state<HTMLElement | null>(null);
  let panelhoeyde = $state(0);
  let faarPlass = $state(true);
  $effect(() => {
    const p = panel;
    const l = linja;
    if (!p || !l || typeof ResizeObserver === 'undefined') return;
    const maal = () => {
      panelhoeyde = p.offsetHeight;
      faarPlass = p.offsetHeight + 16 + l.offsetHeight + 32 <= window.innerHeight;
    };
    const ro = new ResizeObserver(maal);
    ro.observe(p);
    ro.observe(l);
    window.addEventListener('resize', maal);
    maal();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', maal);
    };
  });

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
        varseldato && {
          naar: varseldato,
          hva: NYSAK.tidslinjeVarselet,
          kilde: NYSAK.sendtFoerSaken,
        },
      { naar: iDag, hva: NYSAK.tidslinjeSendes, kilde: NYSAK.naarDuSender },
    ].filter((d): d is { naar: string; hva: string; kilde: string } => !!d)
  );

  // Panelet viser det brevet sier, i brevets rekkefølge (F-1, GR-U31, VS-U38).
  const linjer = $derived(
    [
      valgt && { lag: NYSAK.linjeForholdet, tekst: `${valgt.navn}, punkt ${valgt.punkt}` },
      felt.punkt322 && { lag: NYSAK.linjeVarsel, tekst: NYSAK.varslerEtter322 },
      tittel.trim() && { lag: NYSAK.linjeTittel, tekst: tittel.trim() },
      varselet && {
        lag: NYSAK.linjeVarselet,
        tekst: NYSAK.varseltyper.find((t) => t.verdi === varseltype)?.tekst ?? NYSAK.linjeVarselet,
      },
      // Filvalget finnes ikke ennå (F-7, #1037). Dokumentet med varselet legges ved brevet (VS-U38).
      valgt && {
        lag: NYSAK.linjeVedlegg,
        tekst: varselet ? NYSAK.varseldokumentetVedlegges : NYSAK.ingenVedlegg,
      },
    ].filter((l): l is { lag: string; tekst: string } => !!l)
  );
  const utfylling = () => ({ forhold: forhold!, tittel, beskrivelse, dato, endringsordre });

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
    if (varselet) {
      if (!varseltype) ny.varseltype = NYSAK.velgVarseltypen;
      if (varseltype === 'brev' && !sendemaate) ny.sendemaate = NYSAK.velgSendemaaten;
      if (!varseldato) ny.varseldato = NYSAK.oppgiVarseldatoen;
      if (!varselbeskrivelse.trim()) ny.varselbeskrivelse = NYSAK.beskrivVarselet;
      if (!ny.varseltype && !ny.sendemaate && !ny.varseldato && !ny.varselbeskrivelse)
        ny.varselLagres = NYSAK.varseletKanIkkeLagres;
    }
    if (forhold && !ny.tittel && !ny.dato && !ny.endringsordre) {
      // Kjernen prøver påberopelsen slik serveren gjør, med kravet til beskrivelsen (GR-U15).
      const brev = brevet(utfylling(), sakId, KJERNE);
      if ('programfeil' in brev) ny.kjernen = brev.programfeil;
      else if ('avvisning' in brev) {
        if (brev.avvisning.regel === 'BESKRIVELSE_MANGLER')
          ny.beskrivelse = NYSAK.beskriv(felt.beskrivelse.endsWith('pålegget'));
        else ny.kjernen = brev.avvisning.melding;
      } else if (!Object.keys(ny).length && brev.tekst) {
        feil = {};
        kontroll = { tekst: brev.tekst, kommando: kommandoene(utfylling(), KJERNE).paaberopelse };
        return;
      }
    }
    feil = ny;
    await tick();
    oppsummering?.focus();
  }

  let sender = $state(false);
  let sendefeil = $state<string | null>(null);
  const sending: Brevsending = {
    part: 'TE',
    // `sak_opprettet` er versjon 1, så påberopelsen blir brev 2 i saken til #1489 (VS-U37).
    versjon: 1,
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
        const { opprettelse, paaberopelse } = kommandoene(utfylling(), KJERNE);
        await send({ sakId, opprettelse, paaberopelse, tekst: tekst ?? [] });
        return true;
      } catch (e) {
        sendefeil = e instanceof Error ? e.message : String(e);
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
    if (f === 'sendemaate') return varselet && varseltype === 'brev';
    if (f.startsWith('varsel')) return varselet;
    return true;
  }

  const FELTENE = [
    'forhold',
    'tittel',
    'beskrivelse',
    'dato',
    'endringsordre',
    'varseltype',
    'sendemaate',
    'varseldato',
    'varselbeskrivelse',
    'varselLagres',
    'kjernen',
  ];
  const synligeFeil = $derived(FELTENE.filter((f) => feil[f] && vises(f)));
</script>

{#if kontroll && valgt}
  <Brevkontroll
    kjernesak={sending}
    kommando={kontroll.kommando}
    tekst={kontroll.tekst}
    utdypning={beskrivelse.trim()}
    tittel={NYSAK.brevtittel(valgt.navn)}
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
      <form class="nysak" novalidate onsubmit={(e) => (e.preventDefault(), seBrevet())}>
        <header class="hode">
          <p class="over">{NYSAK.over}</p>
          <h1>{NYSAK.tittel}</h1>
        </header>

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
                <strong>{valgt.navn}</strong>
                <span class="punkt">punkt {valgt.punkt}</span>
              </div>
              {#if valgt.regel}
                <p>{valgt.regel.regel}</p>
                <p>{valgt.regel.konsekvens}</p>
              {:else}
                <p>{valgt.beskrivelse}</p>
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
                    <span>{g.navn}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                  <div
                    class="forholdene"
                    id={gid}
                    role="radiogroup"
                    aria-label={g.navn}
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
                        <span class="navn">{f.navn}</span>
                        <span class="punkt">punkt {f.punkt}</span>
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

        <div class="felt">
          <label for={id('tittel')}>{NYSAK.sakstittel}</label>
          <p class="hjelp" id={id('tittel-hjelp')}>{NYSAK.sakstittelHjelp}</p>
          <input
            id={id('tittel')}
            bind:value={tittel}
            aria-required="true"
            aria-invalid={!!feil.tittel}
            aria-describedby={`${id('tittel-hjelp')}${feil.tittel ? ` ${id('tittel-feil')}` : ''}`}
            oninput={() => delete feil.tittel}
          />
          {#if feil.tittel}<p class="feil" id={id('tittel-feil')}>{feil.tittel}</p>{/if}
        </div>

        <div class="felt">
          <label for={id('beskrivelse')}>{felt.beskrivelse}</label>
          <p class="hjelp" id={id('beskrivelse-hjelp')}>{NYSAK.beskrivelseHjelp}</p>
          <textarea
            id={id('beskrivelse')}
            rows="6"
            bind:value={beskrivelse}
            aria-required="true"
            aria-invalid={!!feil.beskrivelse}
            aria-describedby={`${id('beskrivelse-hjelp')}${feil.beskrivelse ? ` ${id('beskrivelse-feil')}` : ''}`}
            oninput={() => delete feil.beskrivelse}
          ></textarea>
          {#if feil.beskrivelse}<p class="feil" id={id('beskrivelse-feil')}>
              {feil.beskrivelse}
            </p>{/if}
        </div>

        {#if felt.datotekst}
          <div class="felt">
            <label for={id('dato')}>{felt.datotekst}</label>
            <input
              id={id('dato')}
              type="date"
              max={iDag}
              bind:value={dato}
              aria-required="true"
              aria-invalid={!!feil.dato}
              aria-describedby={feil.dato ? id('dato-feil') : undefined}
              oninput={() => delete feil.dato}
            />
            {#if feil.dato}<p class="feil" id={id('dato-feil')}>{feil.dato}</p>{/if}
          </div>
        {/if}

        {#if felt.endringsordre}
          <div class="felt">
            <label for={id('endringsordre')}>{NYSAK.endringsordre}</label>
            <input
              id={id('endringsordre')}
              class="kort-felt"
              bind:value={endringsordre}
              aria-required="true"
              aria-invalid={!!feil.endringsordre}
              aria-describedby={feil.endringsordre ? id('endringsordre-feil') : undefined}
              oninput={() => delete feil.endringsordre}
            />
            {#if feil.endringsordre}<p class="feil" id={id('endringsordre-feil')}>
                {feil.endringsordre}
              </p>{/if}
          </div>
        {/if}

        <div class="felt">
          <span class="etikett">{NYSAK.vedlegg}</span>
          <p class="hjelp">{NYSAK.vedleggIkkeLaget}</p>
        </div>

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
            <p class="kapittel-b" id={id('kapittel-b')}>{NYSAK.kapittelB}</p>
          </div>
          {#if varselet}
            <div class="varselet">
              <Valg
                navn={id('varseltype')}
                spoersmaal={NYSAK.varseltype}
                valg={NYSAK.varseltyper}
                stablet
                bind:verdi={
                  () => varseltype,
                  (v) => {
                    varseltype = v;
                    delete feil.varseltype;
                    delete feil.varselLagres;
                  }
                }
                feil={feil.varseltype ?? null}
              />
              {#if varseltype === 'brev'}
                <Valg
                  navn={id('sendemaate')}
                  spoersmaal={NYSAK.sendemaate}
                  valg={NYSAK.sendemaater}
                  stablet
                  bind:verdi={
                    () => sendemaate,
                    (v) => {
                      sendemaate = v;
                      delete feil.sendemaate;
                    }
                  }
                  feil={feil.sendemaate ?? null}
                />
              {/if}
              <div class="felt">
                <label for={id('varseldato')}>{NYSAK.varseldato}</label>
                <p class="hjelp" id={id('varseldato-hjelp')}>{NYSAK.varseldatoHjelp}</p>
                <input
                  id={id('varseldato')}
                  type="date"
                  max={iDag}
                  bind:value={varseldato}
                  aria-required="true"
                  aria-invalid={!!feil.varseldato}
                  aria-describedby={`${id('varseldato-hjelp')}${feil.varseldato ? ` ${id('varseldato-feil')}` : ''}`}
                  oninput={() => delete feil.varseldato}
                />
                {#if feil.varseldato}<p class="feil" id={id('varseldato-feil')}>
                    {feil.varseldato}
                  </p>{/if}
              </div>
              <div class="felt">
                <span class="etikett">{NYSAK.varseldokument}</span>
                <p class="hjelp">{NYSAK.varseldokumentIkkeLaget}</p>
              </div>
              <div class="felt">
                <label for={id('varselbeskrivelse')}>{NYSAK.varselbeskrivelse}</label>
                <p class="hjelp" id={id('varselbeskrivelse-hjelp')}>
                  {NYSAK.varselbeskrivelseHjelp}
                </p>
                <textarea
                  id={id('varselbeskrivelse')}
                  rows="3"
                  bind:value={varselbeskrivelse}
                  aria-required="true"
                  aria-invalid={!!feil.varselbeskrivelse}
                  aria-describedby={`${id('varselbeskrivelse-hjelp')}${feil.varselbeskrivelse ? ` ${id('varselbeskrivelse-feil')}` : ''}`}
                  oninput={() => delete feil.varselbeskrivelse}
                ></textarea>
                {#if feil.varselbeskrivelse}<p class="feil" id={id('varselbeskrivelse-feil')}>
                    {feil.varselbeskrivelse}
                  </p>{/if}
              </div>
              <p class="merknad">{NYSAK.varselMerknad}</p>
              {#if feil.varselLagres}<p class="feil" id={id('varselLagres')} tabindex="-1">
                  {feil.varselLagres}
                </p>{/if}
            </div>
          {/if}
        {/if}

        {#if feil.kjernen}<p class="feil" id={id('kjernen')}>{feil.kjernen}</p>{/if}

        <div class="handlinger">
          <Knapp variant="lenke" onclick={() => (avbryter = true)}>{NYSAK.avbryt}</Knapp>
        </div>
        {#if avbryter}
          <div class="avbryt" role="group" aria-label={NYSAK.avbryt}>
            <p>{NYSAK.avbrytSpoersmaal}</p>
            <Knapp variant="sekundaer" onclick={onavbrutt}>{NYSAK.avbrytJa}</Knapp>
            <Knapp variant="lenke" onclick={() => (avbryter = false)}>{NYSAK.avbrytNei}</Knapp>
          </div>
        {/if}
      </form>
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
        class:fast={faarPlass}
        style:--panelhoeyde={`${panelhoeyde}px`}
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
  /* Skjemaet står i et kort midt på flaten, som i skissen versjon 3. */
  .nysak {
    display: grid;
    gap: var(--spacing-6);
    padding: var(--spacing-6);
    border: var(--rule);
    border-radius: var(--r-kort);
    background: var(--surface);
  }
  .hode {
    display: grid;
    gap: var(--spacing-1);
  }
  .over {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
  }
  .felt {
    display: grid;
    gap: var(--spacing-2);
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend,
  label,
  .etikett {
    font-weight: 600;
    color: var(--ink);
  }
  .hjelp {
    margin: 0;
    color: var(--ink-3);
  }
  input:not([type='radio']),
  textarea {
    font: inherit;
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
    color: var(--ink);
  }
  /* Feltene er så brede som svaret de venter: en dato er kort, en tittel er en linje. */
  input[type='date'] {
    inline-size: 12rem;
    max-inline-size: 100%;
  }
  .kort-felt {
    inline-size: 20rem;
    max-inline-size: 100%;
  }
  /* Like spesifikk som regelen for feltene, så feilkanten vises også på input. */
  input:not([type='radio'])[aria-invalid='true'],
  textarea[aria-invalid='true'] {
    border-color: var(--danger);
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
    font-weight: 400;
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
    font-size: 1rem;
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
  .handlinger,
  .avbryt {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    align-items: center;
  }
  .avbryt p {
    flex-basis: 100%;
    margin: 0;
  }
</style>
