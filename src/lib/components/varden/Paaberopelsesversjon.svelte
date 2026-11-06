<!--
  TEs nye versjon av påberopelsen (BF-10): «Oppdater påberopelse» etter byggherrens svar og
  «Send ny versjon» før svaret. Forholdet, hjemmelen, endringsordren og datoen står som låste
  verdier, med veien til korrigeringen av datoen og til en ny sak (U-2). Teksten står slik den
  sist ble sendt, i ett felt (S-3). Brevet sendes fra brevkontrollen, som de andre brevene
  (S-4b). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { FileText } from 'lucide-svelte';
  import { tick } from 'svelte';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { forholdet } from '$kjerne/frosset/forholdene';
  import { foersteUnderkategori } from '$kjerne/regler/forhold';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { nyVersjonAvPaaberopelsen } from './kommandoer';
  import { brevene, datoerISporet, datoopplysningene, innleggene } from './lesing';
  import { FORHOLDET, HANDLINGENE, NYVERSJON, SKJEMA, brevhode } from './tekster';

  let {
    kjernesak,
    u,
    tekst = $bindable(null),
    nySak,
    onkorriger,
    onbrevkontroll,
    onforkast,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Teksten TE har skrevet, `null` før TE har åpnet skjemaet. Den står mens TE korrigerer datoen. */
    tekst?: string | null;
    /** Lenken til skjemaet for ny sak, for en annen hjemmel eller endringsordre (GR-U22, OV-U57). */
    nySak?: string;
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
    }) => void;
    onforkast: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const brev = $derived(brevene(u));
  const finn = (dokument: string | undefined) => brev.find((b) => b.id === dokument) ?? null;
  const kravet = $derived(u.spor.forhold.gjeldendeKrav!);
  const kravbrevet = $derived(finn(kravet.dokument));
  const svarbrevet = $derived(finn(u.spor.forhold.gjeldendeSvar?.dokument));
  const enig = $derived(!!u.spor.forhold.enighet && !!svarbrevet);
  const forhold = $derived(
    forholdet(
      foersteUnderkategori(kravet.innhold.underkategori as string | string[] | null | undefined)
    )
  );
  const endringsordre = $derived(
    typeof kravet.innhold.endringsordre === 'string' ? kravet.innhold.endringsordre : null
  );
  // Datoen er TEs siste opplysning (MM-U52 punkt 10), med brevet den ble oppgitt i (U-2).
  const datoen = $derived(datoopplysningene(u).findLast((o) => o.siste) ?? null);
  const kanKorrigere = $derived(
    !!datoen && kjernesak.handlinger.includes(`korrigere:${datoen.id}`)
  );
  const sporbrev = $derived(brev.filter((b) => b.spor.includes('forhold')));

  // Teksten står slik den sist ble sendt (S-3 B i BF-10).
  $effect.pre(() => {
    if (tekst === null) tekst = innleggene(u).get(kravet.dokument)?.utdypning ?? '';
  });

  const kommando = $derived(nyVersjonAvPaaberopelsen(u, tekst ?? ''));
  const utkastbrev = $derived.by(() => {
    const b = kjernesak.brev(kommando);
    return b && 'tekst' in b ? b : null;
  });
  let hindring = $state<string | null>(null);

  const virkning = $derived(HANDLINGENE.virkning.nyVersjon('forhold', kravbrevet, svarbrevet));
  const linjer = $derived(
    (tekst ?? '').trim()
      ? [
          ...(kravbrevet ? [{ tekst: NYVERSJON.linjeErstatter(kravbrevet), lag: null }] : []),
          ...(datoen ? [{ tekst: NYVERSJON.linjeDato(datoen.hva, datoen.dato), lag: null }] : []),
          { tekst: NYVERSJON.linjeTekst, lag: null },
        ]
      : []
  );

  async function seBrevet() {
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
    aria-describedby={hindring ? id('hindring') : undefined}>{NYVERSJON.seBrevet}</Knapp
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
        ? brevhode({ merking: utkastbrev.merking, art: 'krav', brevtittel: utkastbrev.brevtittel })
        : svarbrevet
          ? FORHOLDET.oppdater
          : FORHOLDET.nyVersjon}
      mottaker={SKJEMA.tilBH}
      onsubmit={seBrevet}
    >
      <div class="gjelder">
        <FileText size={16} aria-hidden="true" />
        <dl>
          {#if forhold}
            <div>
              <dt>{NYVERSJON.forholdet}</dt>
              <dd>{forhold.navn} ({NYVERSJON.hjemmel(forhold.hjemmel)})</dd>
            </div>
          {/if}
          {#if endringsordre}
            <div>
              <dt>{NYVERSJON.endringsordre}</dt>
              <dd>{endringsordre}</dd>
            </div>
          {/if}
          {#if datoen}
            <div>
              <dt>{NYVERSJON.datoen(datoen.hva)}</dt>
              <dd>{NYVERSJON.sisteOpplysning(datoen.dato, datoen.brev)}</dd>
            </div>
          {/if}
        </dl>
      </div>

      <div class="innhold">
        <div class="virkning">
          <p>{virkning}</p>
          {#if enig}<p>{NYVERSJON.enighet(svarbrevet!)}</p>{/if}
        </div>

        {#if datoen}
          <div class="vei">
            <p>{NYVERSJON.datoHjelp}</p>
            {#if kanKorrigere}
              <p>
                <Knapp variant="lenke" onclick={() => onkorriger(datoen!.id)}
                  >{NYVERSJON.korriger}</Knapp
                >
              </p>
              <p class="hjelp">{NYVERSJON.beholdes}</p>
            {/if}
          </div>
        {/if}

        <div class="felt">
          <label for={id('tekst')}>{NYVERSJON.tekst(forhold?.kode === 'irregulaer_endring')}</label>
          <p class="hjelp" id={id('tekst-hjelp')}>
            {svarbrevet ? NYVERSJON.tekstHjelpEtterSvar(svarbrevet) : NYVERSJON.tekstHjelp}
          </p>
          <textarea
            id={id('tekst')}
            rows="10"
            bind:value={tekst}
            aria-describedby={id('tekst-hjelp')}
          ></textarea>
        </div>

        <div class="vei">
          <p>{NYVERSJON.nySak}</p>
          {#if nySak}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
            <p><a href={nySak} target="_blank" rel="noopener">{NYVERSJON.nySakLenke}</a></p>
          {/if}
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
    <div class="feste">
      <Hovedlinjer
        tittel={NYVERSJON.panel}
        tom={NYVERSJON.panelTom}
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
    grid-template-columns: 12rem 1fr;
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
  .vei {
    display: grid;
    gap: var(--spacing-1);
    color: var(--ink-2);
    font-size: 14px;
  }
  .vei a {
    color: var(--ink);
    text-underline-offset: 3px;
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
