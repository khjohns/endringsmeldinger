<!--
  TE oppgir datoen TE ble klar over at utgiftene etter punkt 34.1.3 annet ledd ville påløpe, eller
  en annen dato, i et eget brev (BF-48, VS-U86 punkt 14, VS-U82). Skjemaet har utkastkortet,
  varselet og TEs siste opplysning, datofeltet og forklaringen, og panelet til høyre har
  hovedlinjene og «Se brevet før sending», som skjemaet for korrigeringen av datoen
  (`Korrigering.svelte`, U-5). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { FileText } from 'lucide-svelte';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { UTSAGNSTITTEL } from '#kjerne/frosset/brevtittel.ts';
  import { utkastetsHode } from './utkastetsHode';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import { sendeflyt } from './sendeflyt.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Datofelt from './Datofelt.svelte';
  import Forkastutkast from './Forkastutkast.svelte';
  import Hovedlinjer from './Hovedlinjer.svelte';
  import Sendeknapp from './Sendeknapp.svelte';
  import Tekstomraade from './Tekstomraade.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import Utkastkort from './Utkastkort.svelte';
  import { kunnskapsdatoen, type Korrigeringsvalg } from './kommandoer';
  import { brevMedElement, brevene, datoerISporet, kunnskapsdatoene } from './lesing';
  import { KUNNSKAPSDATO } from './tekster';

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
    /** Varselet etter § 34.1.3 kjernen tilbyr handlingen for (`oppgi_kunnskapsdato:<id>`). */
    gjelder: string;
    /** Datoen og forklaringen står når TE går til brevkontrollen og tilbake. */
    valg?: Korrigeringsvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** TE har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
  } = $props();
  const uid = $props.id();
  const id = (felt: string) => `${uid}-${felt}`;

  const siste = $derived(kunnskapsdatoene(u).find((o) => o.siste) ?? null);
  const varselbrevet = $derived(brevMedElement(u, gjelder)!);
  const svarbrevet = $derived.by(() => {
    const s = u.spor.vederlag.gjeldendeSvar;
    return s ? (brevene(u).find((b) => b.id === s.dokument) ?? null) : null;
  });
  const lukket = $derived(u.forholdAvvist);
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes('vederlag')));

  // Dagens dato i Oslo, som datofeltet ikke kan gå forbi (U-6).
  const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());

  const kommando = $derived(kunnskapsdatoen(valg, gjelder));
  const hode = $derived(utkastetsHode(u, kjernesak.sak?.merking, UTSAGNSTITTEL.kunnskapsdato));

  // Det som hindrer, med skjemaets ord, før brevkontrollen (U-6, MM-U32). Kjernen avviser det
  // samme med `DATOEN_ER_UENDRET` og `DATO_ETTER_BREVET`.
  const datofeil = $derived(
    !valg.dato
      ? KUNNSKAPSDATO.skrivDatoen
      : siste && valg.dato === siste.dato
        ? KUNNSKAPSDATO.uendret(siste)
        : valg.dato > idag
          ? KUNNSKAPSDATO.etterIdag(valg.dato, idag)
          : null
  );
  const flyt = sendeflyt(() => kjernesak, id('hindring'));
  const visDatofeil = $derived(flyt.forsoekt ? datofeil : null);

  const linjer = $derived(
    valg.dato && !datofeil
      ? [
          { tekst: KUNNSKAPSDATO.linjeNy(valg.dato), lag: null },
          { tekst: KUNNSKAPSDATO.linjeTidligere(siste), lag: null },
          ...(valg.forklaring.trim() ? [{ tekst: KUNNSKAPSDATO.linjeForklaring, lag: null }] : []),
        ]
      : []
  );
  const utfylt = $derived(
    valg.dato && !datofeil
      ? [{ naar: valg.dato, hva: KUNNSKAPSDATO.tidslinje, kilde: KUNNSKAPSDATO.linjeNy(valg.dato) }]
      : []
  );

  function seBrevet() {
    return flyt.send({
      mangler: datofeil ? () => document.getElementById(id('dato')) : null,
      kommando,
      kanIkkeLages: KUNNSKAPSDATO.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({
          kommando,
          ...brevet,
          virkninger: [KUNNSKAPSDATO.staar(lukket, svarbrevet)].filter((v) => v !== null),
        }),
    });
  }
</script>

{#snippet sendeknapp()}
  <Sendeknapp {flyt} onclick={seBrevet}>{KUNNSKAPSDATO.seBrevet}</Sendeknapp>
{/snippet}

<Arbeidsflate>
  {#snippet hoved()}
    <Utkastkort id={id('tittel')} {...hode} avsender="TE" onsubmit={seBrevet}>
      <div class="gjelder">
        <FileText size={16} aria-hidden="true" />
        <dl>
          <div>
            <dt>{KUNNSKAPSDATO.gjelder}</dt>
            <dd>{KUNNSKAPSDATO.varselet(varselbrevet)}</dd>
          </div>
          <div>
            <dt>{KUNNSKAPSDATO.sisteOpplysning}</dt>
            <dd>{KUNNSKAPSDATO.opplysningen(siste)}</dd>
          </div>
        </dl>
      </div>

      <div class="innhold">
        <div class="virkning">
          <p>{KUNNSKAPSDATO.egetBrev(svarbrevet)}</p>
          {#if lukket}<p>{KUNNSKAPSDATO.lukket}</p>{/if}
        </div>

        <Datofelt
          id={id('dato')}
          etikett={KUNNSKAPSDATO.nyDato}
          hjelp={KUNNSKAPSDATO.datoHjelp}
          maks={idag}
          bind:verdi={valg.dato}
          paakrevd
          feil={visDatofeil || null}
        />

        <Tekstomraade
          id={id('forklaring')}
          etikett={KUNNSKAPSDATO.forklaring}
          valgfri
          hjelp={KUNNSKAPSDATO.forklaringHjelp}
          rader={4}
          bind:verdi={valg.forklaring}
        />

        <div class="skjemafot">
          <Forkastutkast tekst={KUNNSKAPSDATO.forkastTekst} {onforkast} />
        </div>
      </div>
    </Utkastkort>
  {/snippet}

  {#snippet hoeyre()}
    <div class="feste">
      <Hovedlinjer
        tittel={KUNNSKAPSDATO.panel}
        tom={KUNNSKAPSDATO.panelTom}
        {linjer}
        alternativer={false}
        handling={sendeknapp}
      />
    </div>
    <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'vederlag')} {utfylt} />
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
  .skjemafot {
    padding-top: var(--spacing-4);
    border-top: var(--rule);
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
