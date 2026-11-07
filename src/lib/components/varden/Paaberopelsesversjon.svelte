<!--
  TEs nye versjon av påberopelsen (BF-10): «Oppdater påberopelse», før og etter byggherrens svar.
  Arbeidsflaten har to roller (oppdragsgiver 06.11, PR 1650):
  brevet TE skriver står til venstre, med teksten fra versjonen som erstattes (S-3 B), og
  brevene TE bygger på står til høyre. Arbeidsraden over begge sier hvilket brev som skrives, og
  har «Forhåndsvis brevet». Byggherrens svar er åpent fra start, og ett brev om forholdet leses om
  gangen. Tidslinja står lagt sammen under. Datoen og korrigeringen av den står på oversikten. Brevet sendes fra brevkontrollen,
  som de andre brevene (S-4b). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { ChevronLeft } from 'lucide-svelte';
  import { tick } from 'svelte';
  import { brevaarsak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Brevutkast from './Brevutkast.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastrad from './Utkastrad.svelte';
  import { nyVersjonAvPaaberopelsen } from './kommandoer';
  import { brevene, datoerISporet, innleggene, type Brevet } from './lesing';
  import { FORHOLDET, NYVERSJON, brevtittel, dato } from './tekster';

  let {
    kjernesak,
    u,
    tekst = $bindable(null),
    onbrevkontroll,
    onforkast,
    ontilbake,
    onvedsiden,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    /** Teksten TE har skrevet, `null` før TE har åpnet skjemaet. Den står mens TE er på oversikten. */
    tekst?: string | null;
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
    /** Tilbake til oversikten over forholdet. Teksten står til TE kommer tilbake. */
    ontilbake: () => void;
    /** Brevene leses ved siden av utkastet, så kolonnene er like brede. */
    onvedsiden?: (vedSiden: boolean) => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const brev = $derived(brevene(u));
  const finn = (dokument: string | undefined) => brev.find((b) => b.id === dokument) ?? null;
  const kravet = $derived(u.spor.forhold.gjeldendeKrav!);
  // Det neste nummeret i saken. Forhåndsvisningen viser nummeret brevet får.
  const nummer = $derived(Math.max(0, ...brev.map((b) => b.nummer ?? 0)) + 1);
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
  let hindring = $state<string | null>(null);

  // Begrunnelsen kreves; beskjeden står under feltet etter et forsøk (oppdragsgiver 07.11, MM-U32).
  let provd = $state(false);
  const mangler = $derived(provd && !(tekst ?? '').trim());

  async function tilForhaandsvisningen() {
    hindring = null;
    if (!(tekst ?? '').trim()) {
      provd = true;
      await tick();
      felt?.focus();
      return;
    }
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
      // Brevrelasjonene i brevkontrollen sier hva brevet erstatter og viser til.
      detteSender: [],
      virkninger: enig ? [NYVERSJON.enighet(svarbrevet!)] : [],
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
    });
  }

  // Brevene står ved siden av utkastet, og på smal skjerm under det, der høyre kolonne står
  // under arbeidet (mønsteret i vederlagssvaret, oppdragsgiver 29.10, #1391).
  let smal = $state(false);
  $effect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1180px)');
    const sett = () => (smal = mq.matches);
    sett();
    mq.addEventListener('change', sett);
    return () => mq.removeEventListener('change', sett);
  });
  $effect(() => {
    onvedsiden?.(!smal);
    return () => onvedsiden?.(false);
  });

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

  // Feltet vokser med teksten, så én setning ikke står i en stor tom boks.
  let felt = $state<HTMLTextAreaElement | null>(null);
  $effect(() => {
    void tekst;
    if (!felt) return;
    felt.style.height = 'auto';
    felt.style.height = `${felt.scrollHeight + 2}px`;
  });
</script>

<Arbeidsflate leser={!smal} deling="utkast">
  {#snippet rad()}
    <Utkastrad tittel={NYVERSJON.radtittel(nummer)} linje={NYVERSJON.til}>
      {#snippet tilbake()}
        <!-- Sakslisten er felt inn mens brevene leses ved siden av, så veien tilbake står i raden,
             og brevet begynner på samme høyde som i brevkontrollen. -->
        <Knapp variant="lenke" onclick={ontilbake}
          ><ChevronLeft size={16} aria-hidden="true" />{FORHOLDET.tilbake}</Knapp
        >
      {/snippet}
      {#snippet handling()}
        <Knapp
          variant="primaer"
          onclick={tilForhaandsvisningen}
          aria-describedby={hindring ? id('hindring') : undefined}>{NYVERSJON.forhaandsvis}</Knapp
        >
        {#if hindring}
          <Melding art="feil" levende={false} id={id('hindring')} tabindex="-1">{hindring}</Melding>
        {/if}
      {/snippet}
    </Utkastrad>
  {/snippet}

  {#snippet hoved()}
    <Brevutkast
      id={id('emne')}
      emne={kjernesak.saksbilde?.tittel ?? ''}
      onsubmit={tilForhaandsvisningen}
    >
      {#snippet bunn()}
        <Forkastutkast tekst={NYVERSJON.forkastTekst} {onforkast} />
      {/snippet}
      <div class="felt">
        <label for={id('tekst')}>{NYVERSJON.tekst}</label>
        <textarea
          id={id('tekst')}
          rows="3"
          required
          aria-invalid={mangler ? 'true' : undefined}
          aria-describedby={mangler ? id('mangler') : undefined}
          bind:value={tekst}
          bind:this={felt}
        ></textarea>
        {#if mangler}<p class="mangler" id={id('mangler')}>{NYVERSJON.manglerTekst}</p>{/if}
      </div>
    </Brevutkast>
  {/snippet}

  {#snippet hoeyre()}
    <div class="stoette">
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
                innfelt
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
  .felt {
    display: grid;
    gap: var(--spacing-2);
  }
  .mangler {
    font-size: 14px;
    font-weight: 500;
    color: var(--danger);
  }
  label {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  textarea {
    font: inherit;
    line-height: 1.6;
    min-height: 6lh;
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
    color: var(--ink);
    resize: none;
    overflow: hidden;
  }
  textarea[aria-invalid='true'] {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  /* Høyre kolonne følger rullingen under arbeidsraden og er høyst like høy som vinduet under
     den, med samme avstand til raden som før rullingen. `--radhoeyde` er den målte høyden på
     raden med flaten bak den (`Arbeidsflate`). Et langt brev ruller i rammen. */
  .stoette {
    position: sticky;
    top: calc(var(--radhoeyde, 0px) - var(--spacing-3) + var(--spacing-6));
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    max-height: calc(100dvh - var(--radhoeyde, 0px) - var(--spacing-10));
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
