<!--
  Brevet før sending (Varden, skjerm C): den låste teksten kjernen lager for kommandoen som
  lesespalte, og sendepanelet med virkningen av brevet. Kommandoen sendes med den
  teksten avsenderen har sett, og serveren avviser en annen (LV-U2). «Send» er alltid aktiv;
  mangler avkrysningen, står det ved den (MM-U32).
-->
<script lang="ts">
  import { ChevronLeft, Lock, Send } from 'lucide-svelte';
  import { onMount, tick } from 'svelte';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Part } from '$kjerne/typer';
  import Brev from './Brev.svelte';
  import Knapp from './Knapp.svelte';
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
    kjernesak: Kjernesakkontekst;
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
  let kontrollert = $state(false);
  let manglerKontroll = $state(false);
  let avkrysning = $state<HTMLInputElement | null>(null);
  let tittelen = $state<HTMLElement | null>(null);
  // Fokus til panelet når brevkontrollen åpnes, så tastatur og skjermleser starter der.
  onMount(() => tittelen?.focus());
  const stor = (s: string) => s[0].toUpperCase() + s.slice(1);

  async function send() {
    if (!kontrollert) {
      manglerKontroll = true;
      // Beskjeden og aria-describedby må stå før fokus flyttes, så skjermleseren leser dem.
      await tick();
      avkrysning?.focus();
      return;
    }
    if (await kjernesak.send(kommando, tekst)) onsendt();
  }
</script>

<div class="kontroll">
  <div class="venstre">
    <Knapp variant="lenke" onclick={ontilbake}
      ><ChevronLeft size={16} aria-hidden="true" />{BREVKONTROLL.tilbake(tilbakeTil)}</Knapp
    >
    <Brev
      {avsender}
      sak={kjernesak.saksbilde?.tittel ?? ''}
      nummer={String((kjernesak.versjon ?? 0) + 1)}
      dato={BREVKONTROLL.datoSettes}
      {tittel}
      avsnitt={tekst.map((laast, i) => ({
        laast,
        utdypning: i === tekst.length - 1 ? utdypning : undefined,
      }))}
    >
      {#snippet fot()}{BREVKONTROLL.skjermvisning}{/snippet}
    </Brev>
  </div>

  <section class="panel" aria-label="Sending">
    <header class="hode">
      <span class="merke-utkast">{BREVKONTROLL.utkast}</span>
      <h2 tabindex="-1" bind:this={tittelen}>{handling}</h2>
      <p class="laast"><Lock size={14} aria-hidden="true" />{BREVKONTROLL.laast}</p>
    </header>
    <dl class="fakta">
      <dt>{BREVKONTROLL.fra}</dt>
      <dd>{stor(PARTNAVN[avsender])} ({avsender})</dd>
      <dt>{BREVKONTROLL.til}</dt>
      <dd>{stor(PARTNAVN[mottaker])} ({mottaker})</dd>
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
      {#each virkninger as b, i (i)}<p class:sterk={i === 0}>{b}</p>{/each}
      <p class="dempet">{BREVKONTROLL.ikkeEndres}</p>
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
      {#if kjernesak.feil}<p class="feil" role="alert">{kjernesak.feil}</p>{/if}
    </div>
  </section>
</div>

<style>
  .kontroll {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 380px;
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
    border-radius: 12px;
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
    border-radius: 999px;
    background: var(--draft-bg);
    color: var(--ink);
    font-size: 12px;
  }
  h2 {
    margin-top: var(--spacing-2);
    font-size: 18px;
    font-weight: 600;
  }
  .laast {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    margin-top: var(--spacing-2);
    color: var(--ink-3);
    font-size: 13px;
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
  .sterk {
    font-weight: 600;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 13px;
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
    border-radius: 4px;
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
  .feil {
    padding: var(--spacing-3);
    background: var(--danger-bg);
    border: 1px solid var(--danger-border);
    border-radius: 4px;
    color: var(--ink);
    font-size: 14px;
  }
  @media (max-width: 1023px) {
    .kontroll {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
