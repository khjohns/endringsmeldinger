<!--
  Brevet før sending (Varden, skjerm C): den låste teksten kjernen lager for kommandoen som
  lesespalte, og sendepanelet med virkningen av brevet. Kommandoen sendes med den
  teksten avsenderen har sett, og serveren avviser en annen (LV-U2). «Send» er alltid aktiv;
  mangler avkrysningen, står det ved den (MM-U32).
-->
<script module lang="ts">
  import type { Kontrollbrev } from './nysak';
  import { harTekst, laastTekstI, type Brev as Kjernebrev } from '#lib/kjernesak/brevtekst.ts';

  /**
   * Brevet kjernen lager for kommandoen, slik brevkontrollen viser det: avsnittene med punktene
   * og utdypningene (#1824), og Vår ref., Deres ref. og tittelen kjernen fryser i raden
   * forhåndsvisningen gir (LV-U27, LV-U49, LV-U53). Nettleseren regner dem ikke ut selv, og de
   * er en del av det avsenderen godkjenner (LV-U2, U-4 i BF-07).
   */
  /**
   * Det avsenderen godkjenner i brevet, som én tekst: endres en av delene, kontrolleres brevet
   * på nytt (LV-U2, LV-U46).
   */
  export const detSomKontrolleres = (b: Kontrollbrev): string =>
    JSON.stringify([b.merking, b.deresRef, b.tittel, laastTekstI(b)]);

  /**
   * Det et skjema sender til brevkontrollen: kommandoen, brevet kjernen lager av den og det
   * panelet sier om sendingen (#1856).
   */
  export type TilBrevkontrollen = Kontrollbrev & {
    kommando: Record<string, unknown>;
    detteSender: { tekst: string; lag: string | null }[];
    virkninger: string[];
  };

  /**
   * Brevet til kontrollen, eller `null` når kjernen ikke lager et brev med tekst: en avvisning,
   * en programfeil, saken uten merking eller et brev uten tekst, som et registrert brev. Årsaken
   * står i `b`, og `brevaarsak(b)` er `null` for de to siste.
   */
  export function kontrollbrev(
    b: Kjernebrev | { programfeil: string } | null
  ): Kontrollbrev | null {
    if (!harTekst(b)) return null;
    return { avsnitt: b.avsnitt, merking: b.merking, deresRef: b.deresRef, tittel: b.brevtittel };
  }
</script>

<script lang="ts">
  import { ChevronLeft, Send } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { Part } from '#kjerne/typer.ts';
  import type { Brevref } from './lesing';
  import type { Brevsending } from './nysak';
  import { fokuser } from './mangler';
  import Brev from './Brev.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import { organisasjonene } from './kontrakt';
  import { BREVKONTROLL, SENDEFEIL, USIKKERT_UTFALL } from './tekster';
  import { PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';

  let {
    kjernesak,
    kommando,
    avsnitt,
    merking,
    deresRef,
    tittel,
    handling,
    bareMottaker = false,
    svarerPaa,
    relasjoner = [],
    henvisning = BREVKONTROLL.svarerPaa,
    detteSender,
    virkninger,
    kanIkkeGjoeresOm = false,
    sendTekst,
    tilbakeTil,
    visTilbake = true,
    gjenopptar = false,
    ontilbake,
    onsendt,
    onavvist,
  }: TilBrevkontrollen & {
    /** Saken brevet sendes i. Ved en ny sak er det skjemaets sending (`NySak.svelte`). */
    kjernesak: Brevsending;
    /** Det avsenderen gjør, eller emnet i utkastet, som overskrift i panelet. */
    handling: string;
    /**
     * Bare mottakeren i faktaene, uten avsenderen, som er TE selv (oppdragsgiver 07.11, PR 1650).
     */
    bareMottaker?: boolean;
    svarerPaa: Brevref | null;
    /** Ordet foran brevet i `svarerPaa`: «Svarer på», eller «Viser til» for en korrigering. */
    henvisning?: string;
    /**
     * Brevene dette brevet står i forhold til, som «Erstatter» og «Viser til» for en ny versjon
     * (oppdragsgiver 06.11, PR 1650). De står i stedet for `svarerPaa`.
     */
    relasjoner?: { hva: string; brev: string }[];
    /**
     * Handlingen kan ikke gjøres om, som trekket av påberopelsen. Virkningen står da i svak rød,
     * bare her i brevkontrollen (oppdragsgiver 06.11, #1615).
     */
    kanIkkeGjoeresOm?: boolean;
    sendTekst: string;
    tilbakeTil: string;
    visTilbake?: boolean;
    gjenopptar?: boolean;
    ontilbake: () => void;
    onsendt: () => void;
    /**
     * Sendingen ble ikke lagret. Saken kan være lastet på nytt, så eieren lager brevet igjen
     * mot saken slik den står (LV-U2, LV-U51, D-5 i BF-07).
     */
    onavvist?: () => void;
  } = $props();
  const uid = $props.id();
  let sendtMedMerking = $state<string | null>(null);
  const avvisningsstatus = $derived(kjernesak.sendeavvisning?.status);
  const nummerEndret = $derived(
    kjernesak.nummerEndret ||
      (avvisningsstatus === 409 && !!merking && !!sendtMedMerking && merking !== sendtMedMerking)
  );
  const avvisning = $derived.by(() => {
    if (nummerEndret) return SENDEFEIL.nyttNummer;
    if (avvisningsstatus === 403) return SENDEFEIL.ingenTilgang;
    if (avvisningsstatus !== undefined && avvisningsstatus >= 500) return SENDEFEIL.serverfeil;
    return null;
  });
  const innlogging = $derived(
    page.url
      ? `${resolve('/login')}?return_to=${encodeURIComponent(page.url.pathname + page.url.search)}`
      : resolve('/login')
  );

  const avsender = $derived(kjernesak.part as Part);
  const mottaker = $derived<Part>(avsender === 'TE' ? 'BH' : 'TE');
  const hentOrganisasjoner = organisasjonene();
  const partnavn = (p: Part) => hentOrganisasjoner()[p] ?? stor(PARTEN[p]);
  // Teksten kommandoen bærer, og som serveren sammenligner med sin egen (LV-U2).
  const tekst = $derived(laastTekstI({ avsnitt })!);
  let kontrollert = $state(false);
  // Et brev som er endret, for eksempel med et nytt nummer eller en ny Deres ref., kontrolleres
  // på nytt (LV-U46, LV-U51).
  let kontrollertTekst: string | null = null;
  $effect.pre(() => {
    const naa = detSomKontrolleres({ avsnitt, merking, deresRef, tittel });
    if (kontrollertTekst !== null && naa !== kontrollertTekst) kontrollert = false;
    kontrollertTekst = naa;
  });
  let manglerKontroll = $state(false);
  let avkrysning = $state<HTMLInputElement | null>(null);
  let tittelen = $state<HTMLElement | null>(null);
  // Bare en feil fra sendingen her vises, ikke en som står igjen fra et tidligere forsøk (#1393).
  let harSendt = $state(false);
  const proevIgjen = $derived(
    (harSendt || gjenopptar) && !!kjernesak.venterPaa?.(kommando) ? kjernesak.provIgjen : undefined
  );
  // Fokus til panelet når brevkontrollen åpnes, så tastatur og skjermleser starter der.
  onMount(() => tittelen?.focus());

  // Feilen fra et tidligere forsøk står ikke over brevet når avsenderen kommer tilbake (#1393).
  function tilbake() {
    kjernesak.fjernFeil();
    ontilbake();
  }

  async function send() {
    if (!proevIgjen && !kontrollert) {
      manglerKontroll = true;
      // Beskjeden og aria-describedby må stå før fokus flyttes, så skjermleseren leser dem.
      await fokuser(() => avkrysning);
      return;
    }
    harSendt = true;
    sendtMedMerking = merking;
    const sendt = await (proevIgjen ? proevIgjen() : kjernesak.send(kommando, tekst));
    if (sendt) onsendt();
    else if (!kjernesak.venterPaa?.(kommando)) onavvist?.();
  }
</script>

<div class="kontroll">
  <!-- Lenken står over begge kolonnene, så brevet og sendepanelet begynner på samme høyde. -->
  {#if visTilbake && !proevIgjen}<p class="tilbake">
      <Knapp variant="lenke" onclick={tilbake}
        ><ChevronLeft size={16} aria-hidden="true" />{BREVKONTROLL.tilbake(tilbakeTil)}</Knapp
      >
    </p>{/if}
  <div class="venstre" id={`${uid}-brevet`} tabindex="-1">
    <Brev
      {avsender}
      sak={kjernesak.saksbilde?.tittel ?? ''}
      {merking}
      {deresRef}
      dato={BREVKONTROLL.datoSettes}
      tittel={tittel ?? ''}
      {avsnitt}
      utkast
    />
  </div>

  <section class="panel" aria-label="Sending">
    <header class="hode">
      <h2 tabindex="-1" bind:this={tittelen}>{handling}</h2>
    </header>
    <dl class="fakta">
      {#if bareMottaker}
        <dt>{BREVKONTROLL.mottaker}</dt>
        <dd>{partnavn(mottaker)}</dd>
      {:else}
        <dt>{BREVKONTROLL.fra}</dt>
        <dd>{partnavn(avsender)}</dd>
        <dt>{BREVKONTROLL.til}</dt>
        <dd>{partnavn(mottaker)}</dd>
      {/if}
      {#each relasjoner as r (r.hva)}
        <dt>{r.hva}</dt>
        <dd>{r.brev}</dd>
      {:else}
        {#if svarerPaa}
          <dt>{henvisning}</dt>
          <dd>{BREVKONTROLL.svarerPaaBrev(svarerPaa)}</dd>
        {/if}
      {/each}
    </dl>
    {#if detteSender.length}
      <div class="sender">
        <h3>{BREVKONTROLL.detteSender}</h3>
        <ul>
          {#each detteSender as l, i (i)}
            <li>{l.lag ? `${stor(l.lag)}: ` : ''}{l.tekst}.</li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if virkninger.length}
      <div class="virkning">
        <h3>{BREVKONTROLL.naarDuSender}</h3>
        <div class="virkninger" class:endelig={kanIkkeGjoeresOm}>
          {#each virkninger as b, i (i)}<p>{b}</p>{/each}
        </div>
      </div>
    {/if}
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
        {kjernesak.sender
          ? BREVKONTROLL.sender
          : proevIgjen
            ? USIKKERT_UTFALL.proevIgjen
            : sendTekst}
      </Knapp>
      {#if proevIgjen && !kjernesak.sender}
        <Melding art="info" role="alert">
          <strong>{USIKKERT_UTFALL.tittel}</strong>
          <p>{USIKKERT_UTFALL.forklaring}</p>
        </Melding>
      {:else if harSendt && kjernesak.feil && !kjernesak.sender}<Melding art="feil"
          >{#if avvisning}
            <strong>{SENDEFEIL.tittel}</strong>
            <p>{avvisning}</p>
            {#if nummerEndret}
              <p><a href={`#${uid}-brevet`}>{SENDEFEIL.seOverBrevet}</a></p>
            {:else if avvisningsstatus === 403}
              <p><a href={innlogging} target="_blank" rel="noopener">{SENDEFEIL.loggInn}</a></p>
            {:else if avvisning === SENDEFEIL.serverfeil}
              <p>{SENDEFEIL.proevSenere}</p>
            {/if}
          {:else}{kjernesak.feil}{/if}</Melding
        >{/if}
    </div>
  </section>
</div>

<style>
  strong {
    font-weight: 600;
  }
  .kontroll {
    display: grid;
    grid-template-columns: minmax(0, var(--varden-ark)) var(--varden-stoette);
    justify-content: center;
    gap: var(--spacing-3) var(--spacing-6);
    align-items: start;
  }
  .tilbake {
    grid-column: 1 / -1;
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
  .virkning,
  .send {
    padding: var(--spacing-5);
  }
  .hode,
  .fakta,
  .sender,
  .virkning {
    border-bottom: var(--rule);
  }
  h2 {
    margin-top: var(--spacing-2);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: var(--sperring-20);
  }
  .fakta {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: var(--spacing-2) var(--spacing-5);
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
    display: grid;
    gap: var(--spacing-2);
    list-style: disc;
    padding-left: var(--spacing-5);
    margin-bottom: var(--spacing-3);
    font-size: 14px;
  }
  ul:last-child {
    margin-bottom: 0;
  }
  .virkninger {
    display: grid;
    gap: var(--spacing-2);
    font-size: 14px;
  }
  /* Bare for en handling som ikke kan gjøres om, og teksten sier det selv (system.md). */
  .virkninger.endelig {
    margin-top: var(--spacing-3);
    padding: var(--spacing-1) var(--spacing-3) var(--spacing-3);
    border-left: 3px solid var(--danger);
    background: var(--danger-bg);
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
  .avkryss:has(input:focus-visible) input {
    outline: none;
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
  @media (max-width: 1180px) {
    .kontroll {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
