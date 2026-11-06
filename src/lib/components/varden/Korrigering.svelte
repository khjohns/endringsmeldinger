<!--
  TE korrigerer datoen pålegget ble mottatt, eller når TE ble klar over forholdet, i et eget brev
  (BF-02A, BF-02C og BF-02D; MM-U52 punkt 10, 11 og 24). Skjemaet har utkastkortet, opplysningen
  som korrigeres, datofeltet og forklaringen, og panelet til høyre har hovedlinjene og «Se brevet
  før sending». Brevet sendes fra brevkontrollen, som de andre brevene (svaret på S-4b i BF-10,
  oppdragsgiver 06.11). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { FileText } from 'lucide-svelte';
  import { tick } from 'svelte';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Infotips from './Infotips.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { korrigeringen, type Korrigeringsvalg } from './kommandoer';
  import { brevene, datoerISporet, datoopplysningene } from './lesing';
  import { FORHOLDET, KORRIGERING, SKJEMA, brevhode } from './tekster';

  let {
    kjernesak,
    u,
    gjelder,
    valg = $bindable({ dato: '', forklaring: '' }),
    onbrevkontroll,
    onforkast,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Opplysningen som korrigeres, TEs siste (`korrigere:<id>`). */
    gjelder: string;
    /** Datoen og forklaringen står når TE går til brevkontrollen og tilbake. */
    valg?: Korrigeringsvalg;
    onbrevkontroll: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      utdypning?: string;
      detteSender: { tekst: string; lag: string | null }[];
      virkninger: string[];
      merking: string | null;
      deresRef: string[];
      tittel: string | null;
    }) => void;
    /** TE har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const opplysningen = $derived(datoopplysningene(u).find((o) => o.id === gjelder)!);
  const svarbrevet = $derived.by(() => {
    const s = u.spor.forhold.gjeldendeSvar;
    return s ? (brevene(u).find((b) => b.id === s.dokument) ?? null) : null;
  });
  // Påberopelsen er den første opplysningen i rekken av korrigeringer.
  const paaberopelsen = $derived.by(() => {
    let o = opplysningen;
    while (o.forrige) o = o.forrige;
    return o.brev;
  });
  const lukket = $derived(u.forholdAvvist);
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes('forhold')));

  // Dagens dato i Oslo, som datofeltet ikke kan gå forbi (U-3).
  const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());

  const kommando = $derived(korrigeringen(valg, opplysningen));
  const utkastbrev = $derived.by(() => {
    const b = valg.dato ? kjernesak.brev(kommando) : null;
    return b && 'tekst' in b ? b : null;
  });

  // Det som hindrer, med skjemaets ord, før brevkontrollen (U-3, MM-U32). Kjernen avviser det
  // samme med `DATOEN_ER_UENDRET` og datosperren.
  const datofeil = $derived(
    !valg.dato
      ? KORRIGERING.skrivDatoen(opplysningen.hva)
      : valg.dato === opplysningen.dato
        ? KORRIGERING.uendret(opplysningen)
        : valg.dato > idag
          ? KORRIGERING.etterIdag
          : null
  );
  let forsoekt = $state(false);
  const visDatofeil = $derived(forsoekt ? datofeil : null);
  let hindring = $state<string | null>(null);

  const linjer = $derived(
    valg.dato && !datofeil
      ? [
          { tekst: KORRIGERING.linjeNy(opplysningen.hva, valg.dato), lag: null },
          { tekst: KORRIGERING.linjeTidligere(opplysningen), lag: null },
          ...(valg.forklaring.trim() ? [{ tekst: KORRIGERING.linjeForklaring, lag: null }] : []),
        ]
      : []
  );

  async function seBrevet() {
    hindring = null;
    if (datofeil) {
      forsoekt = true;
      await tick();
      document.getElementById(id('dato'))?.focus();
      return;
    }
    const b = kjernesak.brev(kommando, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      hindring = brevaarsak(b) ?? KORRIGERING.kanIkkeLages;
      await tick();
      document.getElementById(id('hindring'))?.focus();
      return;
    }
    onbrevkontroll({
      kommando,
      tekst: b.tekst,
      utdypning: kommando.utdypning,
      detteSender: linjer,
      virkninger: [FORHOLDET.korrigeringenStaar(lukket, svarbrevet)].filter((v) => v !== null),
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
    });
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

{#snippet sendeknapp()}
  <Knapp
    variant="primaer"
    onclick={seBrevet}
    aria-describedby={hindring ? id('hindring') : undefined}>{KORRIGERING.seBrevet}</Knapp
  >
  {#if hindring}
    <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{hindring}</Melding>
  {/if}
{/snippet}

<Arbeidsflate>
  {#snippet hoved()}
    <Utkastkort
      id={id('tittel')}
      tittel={utkastbrev
        ? brevhode({ merking: utkastbrev.merking, art: 'annet', brevtittel: utkastbrev.brevtittel })
        : KORRIGERING.tittel(opplysningen.hva)}
      mottaker={SKJEMA.tilBH}
      onsubmit={seBrevet}
    >
      {#snippet infotips()}<Infotips
          navn={FORHOLDET.omKorrigeringen}
          tekst={FORHOLDET.avgjoerIkke}
        />{/snippet}
      <div class="gjelder">
        <FileText size={16} aria-hidden="true" />
        <dl>
          <div>
            <dt>{KORRIGERING.duKorrigerer}</dt>
            <dd>{KORRIGERING.opplysningen(opplysningen)}</dd>
          </div>
          <div>
            <dt>{KORRIGERING.oppgittI}</dt>
            <dd>{KORRIGERING.brevet(opplysningen.brev)}</dd>
          </div>
        </dl>
      </div>

      <div class="innhold">
        <div class="virkning">
          <p>{KORRIGERING.egetBrev(paaberopelsen, svarbrevet)}</p>
          {#if lukket}<p>{KORRIGERING.lukket}</p>{/if}
        </div>

        <div class="felt">
          <label for={id('dato')}>{KORRIGERING.nyDato(opplysningen.hva)}</label>
          <p class="hjelp" id={id('dato-hjelp')}>{KORRIGERING.datoHjelp}</p>
          {#if visDatofeil}<p class="feil" id={id('dato-feil')}>{visDatofeil}</p>{/if}
          <input
            id={id('dato')}
            type="date"
            max={idag}
            bind:value={valg.dato}
            aria-required="true"
            aria-invalid={!!visDatofeil}
            aria-describedby={`${id('dato-hjelp')}${visDatofeil ? ` ${id('dato-feil')}` : ''}`}
          />
        </div>

        <div class="felt">
          <label for={id('forklaring')}>{KORRIGERING.forklaring}</label>
          <p class="hjelp" id={id('forklaring-hjelp')}>{KORRIGERING.forklaringHjelp}</p>
          <textarea
            id={id('forklaring')}
            rows="4"
            bind:value={valg.forklaring}
            aria-describedby={id('forklaring-hjelp')}
          ></textarea>
        </div>

        <div class="skjemafot">
          {#if bekreftForkast}
            <div class="bekreft" role="group" aria-labelledby={id('forkast-spoersmaal')}>
              <p id={id('forkast-spoersmaal')} tabindex="-1" bind:this={forkastSpoersmaal}>
                {KORRIGERING.forkastSpoersmaal}
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
    <div class="feste">
      <Hovedlinjer
        tittel={KORRIGERING.panel}
        tom={KORRIGERING.panelTom}
        {linjer}
        alternativer={false}
        handling={sendeknapp}
      />
    </div>
    <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'forhold')} />
  {/snippet}
</Arbeidsflate>

<style>
  .gjelder {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
    font-size: 14px;
  }
  .gjelder :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .gjelder dl {
    display: grid;
    gap: var(--spacing-1);
    margin: 0;
  }
  .gjelder dl > div {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: var(--spacing-3);
  }
  .gjelder dt {
    color: var(--ink-3);
  }
  .gjelder dd {
    margin: 0;
    color: var(--ink);
  }
  .innhold {
    display: grid;
    gap: var(--spacing-6);
    padding: var(--spacing-5) var(--spacing-6) var(--spacing-6);
  }
  .virkning {
    display: grid;
    gap: var(--spacing-2);
    color: var(--ink-2);
  }
  .felt {
    display: grid;
    gap: var(--spacing-2);
  }
  label {
    font-weight: 600;
    color: var(--ink);
  }
  .hjelp {
    margin: 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  .feil {
    margin: 0;
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  input,
  textarea {
    font: inherit;
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
    color: var(--ink);
  }
  input {
    inline-size: 12rem;
    max-inline-size: 100%;
    min-height: 44px;
  }
  textarea {
    resize: vertical;
  }
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
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
  .feste {
    position: sticky;
    top: var(--spacing-6);
  }
  @media (max-width: 560px) {
    .gjelder dl > div {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
