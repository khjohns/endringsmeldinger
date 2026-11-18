<!--
  TEs nye versjon av påberopelsen (BF-10): «Oppdater påberopelse», før og etter byggherrens svar.
  Arbeidsflaten har to roller (oppdragsgiver 06.11, PR 1650):
  brevet TE skriver står til venstre, med teksten fra versjonen som erstattes (S-3 B), og
  brevene TE bygger på står til høyre sammen med «Se brevet før sending». Byggherrens svar er åpent fra start, og ett brev om forholdet leses om
  gangen. Tidslinja står lagt sammen under. Datoen og korrigeringen av den står på oversikten. Brevet sendes fra brevkontrollen,
  som de andre brevene (S-4b). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { lagBrevtittel } from '#kjerne/frosset/brevtittel.ts';
  import { tick } from 'svelte';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import { sendeflyt } from './sendeflyt.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { utkastetsHode } from './utkastetsHode';
  import Forkastutkast from './Forkastutkast.svelte';
  import Sendeknapp from './Sendeknapp.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import { nyVersjonAvPaaberopelsen } from './kommandoer';
  import { brevetVedSiden } from './medie.svelte';
  import { brevene, datoerISporet, innleggene, type Brevet } from './lesing';
  import Tekstomraade from './Tekstomraade.svelte';
  import { HOVEDLINJER, KRAVSKJEMA, NYVERSJON, brevtittel, dato } from './tekster';

  let {
    kjernesak,
    u,
    tekst = $bindable(null),
    onbrevkontroll,
    onforkast,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Teksten TE har skrevet, `null` før TE har åpnet skjemaet. Den står mens TE er på oversikten. */
    tekst?: string | null;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    onforkast: () => void;
    /** Brevene leses ved siden av utkastet, så kolonnene er like brede. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const brev = $derived(brevene(u));
  const finn = (dokument: string | undefined) => brev.find((b) => b.id === dokument) ?? null;
  const kravet = $derived(u.spor.forhold.gjeldendeKrav!);
  const hode = $derived(
    utkastetsHode(
      u,
      kjernesak.sak?.merking,
      lagBrevtittel({ krav: [kravet], svar: [], utsagn: [] }) ?? 'Påberopelse av forholdet'
    )
  );
  const kravbrev = $derived(finn(kravet.dokument));
  const svarbrevet = $derived(finn(u.spor.forhold.gjeldendeSvar?.dokument));
  const enig = $derived(!!u.spor.forhold.enighet && !!svarbrevet);

  const sporbrev = $derived(brev.filter((b) => b.spor.includes('forhold')));
  // Nyeste først: svaret TE følger opp, står øverst.
  const tidligere = $derived([...sporbrev].reverse());

  // Teksten står slik den sist ble sendt (S-3 B i BF-10).
  $effect.pre(() => {
    if (tekst === null) tekst = innleggene(u).get(kravet.dokument)?.utdypning ?? '';
  });

  const kommando = $derived(nyVersjonAvPaaberopelsen(u, tekst ?? ''));
  const flyt = sendeflyt(() => kjernesak, id('hindring'));

  // Begrunnelsen kreves; beskjeden står under feltet etter et forsøk (oppdragsgiver 07.11, MM-U32).
  const mangler = $derived(flyt.forsoekt && !(tekst ?? '').trim());

  function tilForhaandsvisningen() {
    return flyt.send({
      mangler: (tekst ?? '').trim() ? null : () => felt,
      kommando,
      kanIkkeLages: NYVERSJON.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({
          kommando,
          ...brevet,
          // Brevrelasjonene i brevkontrollen sier hva brevet erstatter og viser til.
          detteSender: [],
          virkninger: enig ? [NYVERSJON.enighet(svarbrevet!)] : [],
        }),
    });
  }

  // Brevene står ved siden av utkastet, og på smal skjerm under det, der høyre kolonne står
  // under arbeidet (mønsteret i vederlagssvaret, oppdragsgiver 29.10, #1391).
  const side = brevetVedSiden(() => onvedsiden);

  // Ett brev er åpent om gangen: byggherrens svar fra start, ellers det nyeste.
  let valgtId = $state<string | null>(null);
  const valgt = $derived(
    tidligere.find((b) => b.id === valgtId) ?? svarbrevet ?? tidligere[0] ?? null
  );
  let rulle = $state<HTMLElement | null>(null);
  async function vis(b: Brevet) {
    valgtId = b.id;
    await tick();
    rulle?.scrollTo?.({ top: 0 });
  }

  let felt = $state<HTMLTextAreaElement | null>(null);
</script>

<Arbeidsflate leser={side.vedSiden} deling="utkast">
  {#snippet hoved()}
    <Utkastkort id={id('emne')} {...hode} avsender="TE" novalidate onsubmit={tilForhaandsvisningen}>
      {#snippet referanse()}
        {#if kravbrev}<span>{KRAVSKJEMA.folgerOpp(kravbrev, svarbrevet)}</span>{/if}
      {/snippet}
      <div class="begrunnelse">
        <Tekstomraade
          id={id('tekst')}
          etikett={NYVERSJON.tekst}
          vokser
          paakrevd
          feil={mangler ? NYVERSJON.manglerTekst : null}
          bind:verdi={() => tekst ?? '', (v) => (tekst = v)}
          bind:felt
        />
      </div>
      <div class="bunn">
        <Forkastutkast tekst={NYVERSJON.forkastTekst} {onforkast} />
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    <div class="stoette">
      <div class="handling">
        <Sendeknapp {flyt} onclick={tilForhaandsvisningen}>{HOVEDLINJER.seBrevet}</Sendeknapp>
      </div>
      {#if valgt}
        <section class="tidligere" aria-labelledby={id('tidligere')}>
          <h2 id={id('tidligere')}>{NYVERSJON.tidligere}</h2>
          <ul class="velger">
            {#each tidligere as b (b.id)}
              <li>
                <button
                  type="button"
                  class="rad"
                  aria-current={b.id === valgt.id ? 'true' : undefined}
                  aria-controls={id('brevet')}
                  onclick={() => vis(b)}
                >
                  <span class="radtittel"
                    ><span class="part" aria-hidden="true">{b.avsender}</span>{NYVERSJON.brevrad(
                      b
                    )}</span
                  >
                  <span class="raddato">{dato(b.sendt ?? b.registrert)}</span>
                </button>
              </li>
            {/each}
          </ul>
          <!-- Brevet ruller for seg selv, så det må kunne nås med tastaturet. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="brevrulle"
            id={id('brevet')}
            tabindex="0"
            role="region"
            aria-label={NYVERSJON.brevrad(valgt)}
            bind:this={rulle}
          >
            {#if valgt.avsnitt}
              <Brev
                avsender={valgt.avsender}
                sak={kjernesak.saksbilde?.tittel ?? ''}
                merking={valgt.merking}
                deresRef={valgt.deresRef}
                dato={dato(valgt.registrert)}
                tittel={brevtittel(valgt)}
                avsnitt={valgt.avsnitt}
                ramme="innfelt"
                dempet
              />
            {:else}
              <p class="utenTekst">{NYVERSJON.utenTekst}</p>
            {/if}
          </div>
        </section>
      {/if}

      <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'forhold')} aapen={false} />
    </div>
  {/snippet}
</Arbeidsflate>

<style>
  .begrunnelse,
  .bunn {
    padding: var(--spacing-5) var(--spacing-6);
  }
  .bunn {
    border-top: var(--rule);
  }
  .handling {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-5);
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  /* Et langt brev ruller i rammen. */
  .stoette {
    position: sticky;
    top: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    max-height: calc(100dvh - var(--spacing-10));
  }
  .tidligere {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    overflow: hidden;
  }
  .tidligere h2 {
    padding: var(--spacing-3) var(--spacing-5) var(--spacing-1);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .velger {
    margin: 0;
    padding: 0;
    list-style: none;
    border-bottom: var(--rule);
  }
  .rad {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0 var(--spacing-3);
    width: 100%;
    min-height: 40px;
    align-items: center;
    padding: var(--spacing-1) var(--spacing-5);
    border: 0;
    border-left: 4px solid transparent;
    background: none;
    font: inherit;
    font-size: 14px;
    text-align: left;
    color: var(--ink-2);
    cursor: pointer;
  }
  .rad:hover {
    background: var(--surface-inset);
  }
  .radtittel {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  .part {
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: 1px solid var(--rule-strong-color);
    border-radius: 50%;
    background: var(--surface);
    font-size: 12px;
    font-weight: 600;
    color: var(--ink);
  }
  .rad[aria-current='true'] {
    border-left-color: var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
    font-weight: 600;
  }
  .rad:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .raddato {
    font-weight: 400;
    color: var(--ink-3);
  }
  .brevrulle {
    flex: 1;
    min-height: 12rem;
    overflow-y: auto;
  }
  .brevrulle:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .utenTekst {
    padding: var(--spacing-5);
    font-size: 14px;
    color: var(--ink-3);
  }
  @media (max-width: 1180px) {
    .stoette {
      position: static;
      max-height: none;
    }
  }
</style>
