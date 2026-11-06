<!--
  TEs nye versjon av påberopelsen (BF-10): «Oppdater påberopelse» etter byggherrens svar og
  «Send ny versjon» før svaret. Mens TE skriver, står feltet med teksten fra versjonen som
  erstattes (S-3 B), og kortet til høyre sier hva TE svarer på: byggherrens standpunkt i svaret,
  med svaret ved siden av utkastet når TE ber om det, og primærhandlingen. Tidslinja står under.
  Datoen står ved feltet bare når byggherren sier at varselet kom for sent; ellers står den i
  forhåndsvisningen med veien til korrigeringen (oppdragsgiver 06.11, PR 1650). Brevet sendes
  fra brevkontrollen, som de andre brevene (S-4b). Kjernen lager brevet og avviser det den ikke
  godtar.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { nyVersjonAvPaaberopelsen } from './kommandoer';
  import { brevene, datoerISporet, datoopplysningene, innleggene } from './lesing';
  import { FORHOLDET, HANDLINGENE, NYVERSJON, SKJEMA, brevhode, brevtittel, dato } from './tekster';

  let {
    kjernesak,
    u,
    tekst = $bindable(null),
    onkorriger,
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Teksten TE har skrevet, `null` før TE har åpnet skjemaet. Den står mens TE korrigerer datoen. */
    tekst?: string | null;
    /** TE velger «Korriger datoen i et eget brev» (BF-02A U-7). */
    onkorriger: (opplysning: string) => void;
    onbrevkontroll: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      utdypning?: string;
      detteSender: { tekst: string; lag: string | null }[];
      virkninger: string[];
      merking: string | null;
      deresRef: string[];
      tittel: string | null;
      /** Datoopplysningen TE kan korrigere fra forhåndsvisningen, ellers `null`. */
      korrigerbar: string | null;
    }) => void;
    onforkast: () => void;
    /** Svaret leses i en ramme ved siden av utkastet, eller ikke lenger. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const brev = $derived(brevene(u));
  const finn = (dokument: string | undefined) => brev.find((b) => b.id === dokument) ?? null;
  const kravet = $derived(u.spor.forhold.gjeldendeKrav!);
  const kravbrevet = $derived(finn(kravet.dokument));
  const svarbrevet = $derived(finn(u.spor.forhold.gjeldendeSvar?.dokument));
  const enig = $derived(!!u.spor.forhold.enighet && !!svarbrevet);
  // Datoen er TEs siste opplysning (MM-U52 punkt 10), med brevet den ble oppgitt i (U-2).
  const datoen = $derived(datoopplysningene(u).findLast((o) => o.siste) ?? null);
  const kanKorrigere = $derived(
    !!datoen && kjernesak.handlinger.includes(`korrigere:${datoen.id}`)
  );
  // Byggherren sier i svaret at varselet kom for sent (§ 32.2). Da trenger TE datoen mens TE skriver.
  const datoenBestrides = $derived(
    !!u.spor.forhold.gjeldendeSvar?.standpunkter.some((s) => s.art === 'rettidighet' && !s.iTide)
  );

  const sporbrev = $derived(brev.filter((b) => b.spor.includes('forhold')));
  // Byggherrens standpunkter i svaret, med kjernens ord, som i brevtråden.
  const standpunktene = $derived(u.spor.forhold.gjeldendeSvar?.standpunkter ?? []);

  // Teksten står slik den sist ble sendt (S-3 B i BF-10).
  $effect.pre(() => {
    if (tekst === null) tekst = innleggene(u).get(kravet.dokument)?.utdypning ?? '';
  });

  const kommando = $derived(nyVersjonAvPaaberopelsen(u, tekst ?? ''));
  let hindring = $state<string | null>(null);

  const virkning = $derived(HANDLINGENE.virkning.nyVersjon('forhold', kravbrevet, svarbrevet));
  const linjer = $derived([
    ...(kravbrevet ? [{ tekst: NYVERSJON.linjeErstatter(kravbrevet), lag: null }] : []),
    ...(datoen ? [{ tekst: NYVERSJON.linjeDato(datoen.hva, datoen.dato), lag: null }] : []),
  ]);

  async function tilForhaandsvisningen() {
    hindring = null;
    const b = kjernesak.brev(kommando, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      hindring = brevaarsak(b) ?? NYVERSJON.kanIkkeLages;
      await tick();
      document.getElementById(id('hindring'))?.focus();
      return;
    }
    onbrevkontroll({
      kommando,
      tekst: b.tekst,
      utdypning: kommando.utdypning,
      detteSender: linjer,
      virkninger: [virkning, ...(enig ? [NYVERSJON.enighet(svarbrevet!)] : [])],
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
      korrigerbar: kanKorrigere ? datoen!.id : null,
    });
  }

  // Svaret leses i en ramme ved siden av utkastet, og på smal skjerm over feltet, der høyre
  // kolonne står under arbeidet (mønsteret i vederlagssvaret, oppdragsgiver 29.10, #1391).
  let smal = $state(false);
  $effect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1180px)');
    const sett = () => (smal = mq.matches);
    sett();
    mq.addEventListener('change', sett);
    return () => mq.removeEventListener('change', sett);
  });
  let leser = $state(false);
  $effect(() => {
    onvedsiden?.(leser && !smal);
    return () => onvedsiden?.(false);
  });
  // Kortet byttes ut med svaret, så fokus følger med begge veier.
  async function veksleLesing() {
    leser = !leser;
    await tick();
    document.getElementById(id(leser ? 'lukk' : 'les'))?.focus();
  }

  let bekreftForkast = $state(false);
  let forkastSpoersmaal = $state<HTMLElement | null>(null);
  async function spoerOmForkast() {
    bekreftForkast = true;
    await tick();
    forkastSpoersmaal?.focus();
  }
  async function behold() {
    bekreftForkast = false;
    await tick();
    document.getElementById(id('forkast'))?.focus();
  }
</script>

{#snippet svaret(innfelt: boolean)}
  {#if svarbrevet}
    <Brev
      avsender={svarbrevet.avsender}
      sak={kjernesak.saksbilde?.tittel ?? ''}
      merking={svarbrevet.merking}
      deresRef={svarbrevet.deresRef}
      dato={dato(svarbrevet.registrert)}
      tittel={brevtittel(svarbrevet)}
      avsnitt={svarbrevet.avsnitt ?? []}
      {innfelt}
    />
  {/if}
{/snippet}

{#snippet handling()}
  <Knapp
    variant="primaer"
    onclick={tilForhaandsvisningen}
    aria-describedby={hindring ? id('hindring') : undefined}>{NYVERSJON.seBrevet}</Knapp
  >
  {#if hindring}
    <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{hindring}</Melding>
  {/if}
{/snippet}

<Arbeidsflate leser={leser && !smal}>
  {#snippet hoved()}
    <Utkastkort
      id={id('tittel')}
      tittel={svarbrevet ? FORHOLDET.oppdater : FORHOLDET.nyVersjon}
      mottaker={SKJEMA.tilBH}
      onsubmit={tilForhaandsvisningen}
    >
      <div class="innhold">
        {#if datoenBestrides && datoen}
          <!-- Datoen ved feltet når byggherren bestrider at varselet kom i tide (U-2, BF-02A U-7). -->
          <div class="dato">
            <p>
              <span class="etikett">{NYVERSJON.datoen(datoen.hva)}:</span>
              {NYVERSJON.sisteOpplysning(datoen.dato, datoen.brev)}
            </p>
            <p class="vei">{NYVERSJON.datoHjelp}</p>
            {#if kanKorrigere}
              <Knapp variant="lenke" onclick={() => onkorriger(datoen!.id)}
                >{NYVERSJON.korriger}</Knapp
              >
            {/if}
          </div>
        {/if}

        <div class="felt">
          <label for={id('tekst')}>{NYVERSJON.tekst}</label>
          <textarea id={id('tekst')} rows="12" bind:value={tekst}></textarea>
        </div>

        <div class="skjemafot">
          {#if bekreftForkast}
            <div class="bekreft" role="group" aria-labelledby={id('forkast-spoersmaal')}>
              <p id={id('forkast-spoersmaal')} tabindex="-1" bind:this={forkastSpoersmaal}>
                {NYVERSJON.forkastSpoersmaal}
              </p>
              <div class="knapper">
                <Knapp onclick={onforkast}>{SKJEMA.forkastJa}</Knapp>
                <Knapp variant="lenke" onclick={behold}>{SKJEMA.behold}</Knapp>
              </div>
            </div>
          {:else}
            <Knapp variant="lenke" id={id('forkast')} onclick={spoerOmForkast}
              >{SKJEMA.forkast}</Knapp
            >
          {/if}
        </div>
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    {#if leser && !smal && svarbrevet}
      <section class="leseramme" id={id('svaret')} aria-labelledby={id('lesetittel')}>
        <div class="lesehode">
          <h2 class="lesetittel" id={id('lesetittel')}>
            {brevhode(svarbrevet)}
            <span class="dempet">· {svarbrevet.avsender} · {dato(svarbrevet.registrert)}</span>
          </h2>
          <Knapp variant="lenke" id={id('lukk')} onclick={veksleLesing} aria-expanded="true"
            >{NYVERSJON.lukkSvaret}</Knapp
          >
        </div>
        <!-- Rammen ruller for seg selv, så den må kunne nås med tastaturet. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="brevrulle" tabindex="0" role="region" aria-labelledby={id('lesetittel')}>
          {@render svaret(true)}
        </div>
        <div class="bunn">{@render handling()}</div>
      </section>
    {:else}
      <section class="kort feste" aria-labelledby={id('kontekst')}>
        <h2 class="hode" id={id('kontekst')}>
          {#if svarbrevet}
            {NYVERSJON.svaret(svarbrevet)}
            <span class="hodedato">{dato(svarbrevet.registrert)}</span>
          {:else if kravbrevet}
            {NYVERSJON.paaberopelsen(kravbrevet)}
            <span class="hodedato">{dato(kravbrevet.registrert)}</span>
          {/if}
        </h2>
        <div class="kontekst">
          {#if svarbrevet}
            {#each standpunktene as s (s.id)}<p>{FORHOLDET.standpunkt(s, null)}</p>{/each}
            <Knapp
              variant="lenke"
              id={id('les')}
              onclick={veksleLesing}
              aria-expanded={leser}
              aria-controls={id('svaret')}
              >{leser
                ? NYVERSJON.lukkSvaret
                : smal
                  ? NYVERSJON.lesSvaretHer
                  : NYVERSJON.lesSvaret}</Knapp
            >
            {#if leser && smal}
              <div class="innebrev" id={id('svaret')}>{@render svaret(false)}</div>
            {/if}
          {:else}
            <p>{NYVERSJON.ikkeSvart}</p>
          {/if}
          {#if kravbrevet}<p class="dempet">{NYVERSJON.erstatter(kravbrevet)}</p>{/if}
        </div>
        <div class="bunn">{@render handling()}</div>
      </section>
      <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'forhold')} />
    {/if}
  {/snippet}
</Arbeidsflate>

<style>
  .innhold {
    display: grid;
    gap: var(--spacing-5);
    padding: var(--spacing-5) var(--spacing-6) var(--spacing-6);
  }
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .feste {
    position: sticky;
    top: var(--spacing-4);
    z-index: 1;
  }
  .hode {
    padding: var(--spacing-4) var(--spacing-5);
    border-bottom: var(--rule);
    font-size: 16px;
    font-weight: 600;
  }
  .hodedato {
    display: block;
    font-size: 14px;
    font-weight: 400;
    color: var(--ink-3);
  }
  .lesehode > :global(.knapp) {
    flex: none;
    white-space: nowrap;
  }
  .kontekst {
    display: grid;
    gap: var(--spacing-2);
    justify-items: start;
    padding: var(--spacing-4) var(--spacing-5);
    font-size: 14px;
  }
  .kontekst p {
    margin: 0;
    color: var(--ink);
  }
  .kontekst p.dempet {
    margin-top: var(--spacing-2);
    color: var(--ink-3);
  }
  .innebrev {
    justify-self: stretch;
  }
  .bunn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
    border-top: var(--rule);
  }
  .dato {
    display: grid;
    gap: var(--spacing-1);
    justify-items: start;
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-felt);
    font-size: 14px;
  }
  .dato p {
    margin: 0;
    color: var(--ink);
  }
  .etikett {
    color: var(--ink-3);
  }
  .dato p.vei {
    color: var(--ink-3);
  }
  .felt {
    display: grid;
    gap: var(--spacing-2);
  }
  label {
    font-weight: 600;
    color: var(--ink);
  }
  textarea {
    font: inherit;
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
    color: var(--ink);
    resize: vertical;
  }
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .skjemafot {
    padding-top: var(--spacing-4);
    border-top: var(--rule);
  }
  .bekreft {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
  }
  /* Lesing ved siden av, som i vederlagssvaret: rammen følger rullingen og er høyst like høy
     som vinduet under topplinja. Et langt svar ruller i den. */
  .leseramme {
    position: sticky;
    top: var(--spacing-4);
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - var(--mockup-topbar-height) - var(--spacing-10));
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    overflow: hidden;
  }
  .lesehode {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-2) var(--spacing-3) var(--spacing-2) var(--spacing-5);
    border-bottom: var(--rule);
  }
  .lesetittel {
    font-size: 16px;
    font-weight: 600;
  }
  .dempet {
    font-weight: 400;
    color: var(--ink-3);
  }
  .brevrulle {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .brevrulle:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
</style>
