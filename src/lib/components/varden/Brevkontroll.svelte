<!--
  Brevet før sending (Varden, skjerm C): den låste teksten kjernen lager for kommandoen som
  lesespalte, og sendepanelet med virkningen av brevet. Kommandoen sendes med den
  teksten avsenderen har sett, og serveren avviser en annen (LV-U2). «Send» er alltid aktiv;
  mangler avkrysningen, står det ved den (MM-U32).
-->
<script lang="ts">
  import { ChevronLeft, Send } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';
  import type { Part } from '$kjerne/typer';
  import type { Brevsending } from './nysak';
  import Brev from './Brev.svelte';
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import { organisasjonene } from './kontrakt';
  import { BREVKONTROLL, PARTNAVN, dato } from './prototypetekst';

  let {
    kjernesak,
    kommando,
    tekst,
    utdypning,
    tittel,
    handling,
    svarerPaa,
    detteSender,
    virkninger,
    sendTekst,
    tilbakeTil,
    ontilbake,
    onsendt,
  }: {
    /** Saken brevet sendes i. Ved en ny sak er det skjemaets sending (`NySak.svelte`). */
    kjernesak: Brevsending;
    kommando: Record<string, unknown>;
    tekst: string[];
    utdypning?: string;
    tittel: string;
    /** Det avsenderen gjør, som overskrift i panelet. */
    handling: string;
    svarerPaa: { nummer: number; registrert: string } | null;
    detteSender: { tekst: string; lag: string | null }[];
    virkninger: string[];
    sendTekst: string;
    tilbakeTil: string;
    ontilbake: () => void;
    onsendt: () => void;
  } = $props();
  const uid = $props.id();

  const avsender = $derived(kjernesak.part as Part);
  const mottaker = $derived<Part>(avsender === 'TE' ? 'BH' : 'TE');
  const hentOrganisasjoner = organisasjonene();
  const partnavn = (p: Part) => `${hentOrganisasjoner()[p] ?? stor(PARTNAVN[p])} (${p})`;
  let kontrollert = $state(false);
  let manglerKontroll = $state(false);
  let avkrysning = $state<HTMLInputElement | null>(null);
  let tittelen = $state<HTMLElement | null>(null);
  // Bare en feil fra sendingen her vises, ikke en som står igjen fra et tidligere forsøk (#1393).
  let harSendt = $state(false);
  // Fokus til panelet når brevkontrollen åpnes, så tastatur og skjermleser starter der.
  onMount(() => tittelen?.focus());
  const stor = (s: string) => s[0].toUpperCase() + s.slice(1);

  // Feilen fra et tidligere forsøk står ikke over brevet når avsenderen kommer tilbake (#1393).
  function tilbake() {
    kjernesak.fjernFeil();
    ontilbake();
  }

  async function send() {
    if (!kontrollert) {
      manglerKontroll = true;
      // Beskjeden og aria-describedby må stå før fokus flyttes, så skjermleseren leser dem.
      await tick();
      avkrysning?.focus();
      return;
    }
    harSendt = true;
    if (await kjernesak.send(kommando, tekst)) onsendt();
  }
</script>

<div class="kontroll">
  <div class="venstre">
    <Knapp variant="lenke" onclick={tilbake}
      ><ChevronLeft size={16} aria-hidden="true" />{BREVKONTROLL.tilbake(tilbakeTil)}</Knapp
    >
    <Brev
      {avsender}
      sak={kjernesak.saksbilde?.tittel ?? ''}
      nummer={String((kjernesak.versjon ?? 0) + 1)}
      dato={BREVKONTROLL.datoSettes}
      {tittel}
      svarerPaa={svarerPaa ? `Brev ${svarerPaa.nummer}` : undefined}
      avsnitt={tekst.map((laast, i) => ({
        laast,
        utdypning: i === tekst.length - 1 ? utdypning : undefined,
      }))}
    />
  </div>

  <section class="panel" aria-label="Sending">
    <header class="hode">
      <span class="merke-utkast">{BREVKONTROLL.utkast}</span>
      <h2 tabindex="-1" bind:this={tittelen}>
        {handling}<Infotips navn={BREVKONTROLL.omBrevet} tekst={BREVKONTROLL.laast} />
      </h2>
    </header>
    <dl class="fakta">
      <dt>{BREVKONTROLL.fra}</dt>
      <dd>{partnavn(avsender)}</dd>
      <dt>{BREVKONTROLL.til}</dt>
      <dd>{partnavn(mottaker)}</dd>
      {#if svarerPaa}
        <dt>{BREVKONTROLL.svarerPaa}</dt>
        <dd>Brev {svarerPaa.nummer}, {dato(svarerPaa.registrert)}</dd>
      {/if}
    </dl>
    <div class="sender">
      <h3>{BREVKONTROLL.detteSender}</h3>
      <ul>
        {#each detteSender as l, i (i)}
          <li>{l.lag ? `${stor(l.lag)}: ` : ''}{l.tekst}.</li>
        {/each}
      </ul>
      {#each virkninger as b, i (i)}<p>{b}</p>{/each}
    </div>
    <div class="send">
      <label class="avkryss" class:ugyldig={manglerKontroll && !kontrollert}>
        <input
          type="checkbox"
          bind:checked={kontrollert}
          bind:this={avkrysning}
          aria-describedby={manglerKontroll && !kontrollert
            ? `${uid}-hvorfor-ikke-send`
            : undefined}
          aria-invalid={manglerKontroll && !kontrollert ? 'true' : undefined}
        />
        <span>{BREVKONTROLL.kontrollert}</span>
      </label>
      {#if manglerKontroll && !kontrollert}<p id={`${uid}-hvorfor-ikke-send`} class="feilmelding">
          {BREVKONTROLL.hvorforIkke}
        </p>{/if}
      <Knapp variant="primaer" opptatt={kjernesak.sender} onclick={send}>
        <Send size={16} aria-hidden="true" />
        {kjernesak.sender ? BREVKONTROLL.sender : sendTekst}
      </Knapp>
      {#if harSendt && kjernesak.feil && !kjernesak.sender}<Melding art="feil"
          >{kjernesak.feil}</Melding
        >{/if}
    </div>
  </section>
</div>

<style>
  .kontroll {
    display: grid;
    grid-template-columns: minmax(0, var(--varden-ark)) var(--varden-stoette);
    justify-content: center;
    gap: var(--spacing-6);
    align-items: start;
  }
  .venstre {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-3);
    min-width: 0;
  }
  .panel {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode,
  .fakta,
  .sender,
  .send {
    padding: var(--spacing-5);
  }
  .hode,
  .fakta,
  .sender {
    border-bottom: var(--rule);
  }
  .merke-utkast {
    display: inline-block;
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: var(--r-merke);
    background: var(--draft-bg);
    color: var(--ink);
    font-size: 12px;
  }
  h2 {
    margin-top: var(--spacing-2);
    font-size: 20px;
    font-weight: 600;
  }
  .fakta {
    display: grid;
    grid-template-columns: 96px 1fr;
    row-gap: var(--spacing-2);
    font-size: 14px;
  }
  .fakta dt {
    color: var(--ink-3);
  }
  h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: var(--spacing-2);
  }
  ul {
    list-style: disc;
    padding-left: var(--spacing-5);
    margin-bottom: var(--spacing-3);
    font-size: 14px;
  }
  .sender p {
    font-size: 14px;
    margin-top: var(--spacing-2);
  }
  .send {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .avkryss {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    min-height: 48px;
    padding: 0 var(--spacing-4);
    border: var(--rule-strong);
    border-radius: var(--r-felt);
    cursor: pointer;
  }
  .avkryss:has(input:focus-visible) {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .avkryss.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  .avkryss input {
    width: 20px;
    height: 20px;
    accent-color: var(--ink);
  }
  @media (max-width: 1180px) {
    .kontroll {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
