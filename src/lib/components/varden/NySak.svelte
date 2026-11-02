<!--
  Skjemaet for ny sak (BF-05, #1481): TE velger forholdet, skriver tittelen og beskrivelsen,
  oppgir datoen og kontrollerer brevet før det sendes. Saken finnes først når påberopelsen
  er sendt (KT-U11), så skjemaet sender gjennom grensen `send` og ikke gjennom en sak.
  Feilene står ved feltet før brevkontrollen (F-4, MM-U32).
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { KJERNE } from '$kjerne/versjon';
  import Brevkontroll from './Brevkontroll.svelte';
  import Knapp from './Knapp.svelte';
  import Valg from './Valg.svelte';
  import {
    FORHOLDENE,
    forholdsnavn,
    brevet,
    feltene,
    forholdet,
    kommandoene,
    type Brevsending,
    type Forholdsvalg,
    type SendNySak,
  } from './nysak';
  import { NYSAK } from './prototypetekst';

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
  let sok = $state('');
  let tittel = $state('');
  let beskrivelse = $state('');
  let dato = $state('');
  let endringsordre = $state('');
  let alleredeVarslet = $state<boolean | null>(false);
  let feil = $state<Record<string, string>>({});
  let avbryter = $state(false);
  let oppsummering = $state<HTMLElement | null>(null);
  let kontroll = $state<{ tekst: string[]; kommando: Record<string, unknown> } | null>(null);

  const felt = $derived(forhold ? feltene(forhold, KJERNE) : null);
  const valgt = $derived(forhold ? forholdet(forhold) : null);
  const iDag = new Date().toISOString().slice(0, 10);
  const utfylling = () => ({ forhold: forhold!, tittel, beskrivelse, dato, endringsordre });

  const treff = (...tekster: string[]) =>
    tekster.some((t) => t.toLowerCase().includes(sok.trim().toLowerCase()));
  const grupper = $derived(
    FORHOLDENE.map((g) => ({
      ...g,
      hjemler: g.hjemler.filter((h) => treff(g.label, h.label, h.hjemmel_basis, h.beskrivelse)),
    })).filter((g) => g.hjemler.length)
  );
  const antallTreff = $derived(grupper.reduce((n, g) => n + g.hjemler.length, 0));

  function velg(gruppe: string, kode: string) {
    forhold = { gruppe, kode };
    velgerAapen = false;
    delete feil.forhold;
  }

  async function seBrevet() {
    const ny: Record<string, string> = {};
    if (!forhold) ny.forhold = NYSAK.velgForholdet;
    if (!tittel.trim()) ny.tittel = NYSAK.skrivTittelen;
    if (felt?.dato && !dato) ny.dato = NYSAK.oppgiDatoen;
    if (felt?.endringsordre && !endringsordre.trim()) ny.endringsordre = NYSAK.oppgiEndringsordren;
    if (felt?.punkt322 && alleredeVarslet) ny.varslet = NYSAK.alleredeVarsletIkkeLaget;
    if (forhold && !ny.tittel && !ny.dato && !ny.endringsordre) {
      // Kjernen prøver påberopelsen slik serveren gjør, med kravet til beskrivelsen (GR-U15).
      const brev = brevet(utfylling(), sakId, KJERNE);
      if ('avvisning' in brev) {
        if (brev.avvisning.regel === 'BESKRIVELSE_MANGLER')
          ny.beskrivelse = NYSAK.beskriv(felt!.beskrivelse.endsWith('pålegget'));
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
    versjon: 0,
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

  const FELTENE = [
    'forhold',
    'tittel',
    'beskrivelse',
    'dato',
    'endringsordre',
    'varslet',
    'kjernen',
  ];
</script>

{#if kontroll && valgt}
  <Brevkontroll
    kjernesak={sending}
    kommando={kontroll.kommando}
    tekst={kontroll.tekst}
    utdypning={beskrivelse.trim()}
    tittel={NYSAK.brevtittel(forholdsnavn(valgt.hjemmel.label))}
    handling={NYSAK.handling}
    svarerPaa={null}
    detteSender={[
      {
        tekst: NYSAK.detteSender(forholdsnavn(valgt.hjemmel.label), valgt.hjemmel.hjemmel_basis),
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
  <form class="nysak" novalidate onsubmit={(e) => (e.preventDefault(), seBrevet())}>
    <p class="over">{NYSAK.over}</p>
    <h1>{NYSAK.tittel}</h1>

    {#if Object.keys(feil).length}
      <div
        class="oppsummering"
        tabindex="-1"
        bind:this={oppsummering}
        role="group"
        aria-labelledby={id('mangler')}
      >
        <h2 id={id('mangler')}>{NYSAK.mangler}</h2>
        <ul>
          {#each FELTENE.filter((f) => feil[f]) as f (f)}
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
      {#if valgt && !velgerAapen}
        <div class="valgt">
          <div>
            <strong>{forholdsnavn(valgt.hjemmel.label)}</strong>
            <span class="punkt">pkt. {valgt.hjemmel.hjemmel_basis}</span>
          </div>
          {#if valgt.regel}
            <p>{valgt.regel.regel}</p>
            <p>{valgt.regel.konsekvens}</p>
          {:else}
            <p>{valgt.hjemmel.beskrivelse}</p>
          {/if}
          <Knapp variant="lenke" onclick={() => (velgerAapen = true)}>{NYSAK.endre}</Knapp>
        </div>
      {:else}
        <label class="sok">
          <span class="etikett">{NYSAK.sok}</span>
          <input type="search" bind:value={sok} />
        </label>
        <p class="visually-hidden" role="status">
          {sok.trim() ? NYSAK.antallTreff(antallTreff) : ''}
        </p>
        {#each grupper as g (g.kode)}
          <div class="gruppe" role="radiogroup" aria-label={g.label}>
            <p class="gruppenavn">{g.label} <span class="punkt">pkt. {g.hjemmel_frist}</span></p>
            {#each g.hjemler as h (h.kode)}
              <label class="forhold">
                <input
                  type="radio"
                  name={id('forholdet')}
                  checked={forhold?.kode === h.kode}
                  onchange={() => velg(g.kode, h.kode)}
                />
                <span>
                  {forholdsnavn(h.label)}
                  <span class="punkt">pkt. {h.hjemmel_basis}</span>
                </span>
              </label>
            {/each}
          </div>
        {:else}
          <p class="hjelp">{NYSAK.ingenTreff}</p>
        {/each}
      {/if}
      <p class="staarfast">{NYSAK.staarFast}</p>
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

    {#if felt}
      <div class="felt">
        <label for={id('beskrivelse')}>{felt.beskrivelse}</label>
        <p class="hjelp" id={id('beskrivelse-hjelp')}>{NYSAK.beskrivelseHjelp}</p>
        <textarea
          id={id('beskrivelse')}
          rows="6"
          bind:value={beskrivelse}
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
            bind:value={endringsordre}
            aria-required="true"
            aria-invalid={!!feil.endringsordre}
            aria-describedby={feil.endringsordre ? id('endringsordre-feil') : undefined}
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
        <div class="felt" id={id('varslet')} tabindex="-1">
          <Valg
            navn={id('alleredeVarslet')}
            spoersmaal={NYSAK.alleredeVarslet}
            valg={[
              { verdi: false, tekst: 'Nei' },
              { verdi: true, tekst: 'Ja' },
            ]}
            bind:verdi={alleredeVarslet}
            feil={feil.varslet ?? null}
          />
        </div>
      {/if}
    {/if}

    {#if feil.kjernen}<p class="feil" id={id('kjernen')}>{feil.kjernen}</p>{/if}

    <div class="handlinger">
      <Knapp variant="primaer" type="submit">{NYSAK.seBrevet}</Knapp>
      <Knapp variant="sekundaer" onclick={() => (avbryter = true)}>{NYSAK.avbryt}</Knapp>
    </div>
    {#if avbryter}
      <div class="avbryt" role="group" aria-label={NYSAK.avbryt}>
        <p>{NYSAK.avbrytSpoersmaal}</p>
        <Knapp variant="sekundaer" onclick={onavbrutt}>{NYSAK.avbrytJa}</Knapp>
        <Knapp variant="lenke" onclick={() => (avbryter = false)}>{NYSAK.avbrytNei}</Knapp>
      </div>
    {/if}
  </form>
{/if}

<style>
  .nysak {
    max-width: var(--varden-ark);
    display: grid;
    gap: var(--spacing-6);
  }
  .over {
    margin: 0;
    color: var(--ink-3);
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
  [aria-invalid='true'] {
    border-color: var(--danger);
  }
  .feil {
    margin: 0;
    color: var(--danger);
    font-weight: 600;
  }
  .gruppe {
    display: grid;
  }
  .gruppenavn {
    margin: var(--spacing-4) 0 var(--spacing-1);
    font-weight: 600;
  }
  .forhold {
    display: flex;
    gap: var(--spacing-3);
    align-items: center;
    font-weight: 400;
    min-height: 44px;
    padding: var(--spacing-1) 0;
  }
  .forhold input {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--ink);
  }
  .punkt {
    margin-left: var(--spacing-1);
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
