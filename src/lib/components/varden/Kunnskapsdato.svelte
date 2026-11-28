<!--
  TE oppgir datoen TE ble klar over at utgiftene etter punkt 34.1.3 annet ledd ville påløpe, eller
  en annen dato, i et eget brev (BF-48, VS-U86 punkt 14, VS-U82). Skjemaet har utkastkortet,
  varselet og TEs siste opplysning, datofeltet og forklaringen, og panelet til høyre har
  hovedlinjene og «Se brevet før sending», som skjemaet for korrigeringen av datoen
  (`Korrigering.svelte`, U-5). Kjernen lager brevet og avviser det den ikke godtar.
-->
<script lang="ts">
  import { avsluttetAvTe, type Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { UTSAGNSTITTEL } from '#kjerne/frosset/brevtittel.ts';
  import { utkastetsHode } from './utkastetsHode';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import { sendeflyt } from './sendeflyt.svelte';
  import Datobrev from './Datobrev.svelte';
  import Sendeknapp from './Sendeknapp.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import { kunnskapsdatoen, type Korrigeringsvalg } from './kommandoer';
  import { brevMedElement, brevene, datoerISporet, sisteKunnskapsdatoen } from './lesing';
  import { KUNNSKAPSDATO, OPPGITT, dagensDato } from './tekster';

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

  const siste = $derived(sisteKunnskapsdatoen(u));
  const varselbrevet = $derived(brevMedElement(u, gjelder)!);
  const svarbrevet = $derived.by(() => {
    const s = u.spor.vederlag.gjeldendeSvar;
    return s ? (brevene(u).find((b) => b.id === s.dokument) ?? null) : null;
  });
  // GR-U27, VS-U84: saken er lukket når TE har godtatt avslaget på forholdet eller trukket det.
  const lukket = $derived(avsluttetAvTe(u));
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes('vederlag')));

  // Dagens dato i Oslo, som datofeltet ikke kan gå forbi (U-6).
  const idag = dagensDato();

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
  const flyt = sendeflyt(() => kjernesak, `${uid}-hindring`);
  const visDatofeil = $derived(flyt.forsoekt ? datofeil : null);

  const gyldig = $derived(!!valg.dato && !datofeil);
  const linjer = $derived(
    gyldig
      ? [
          { tekst: KUNNSKAPSDATO.linjeNy(valg.dato), lag: null },
          { tekst: KUNNSKAPSDATO.linjeTidligere(siste), lag: null },
          ...(valg.forklaring.trim() ? [{ tekst: KUNNSKAPSDATO.linjeForklaring, lag: null }] : []),
        ]
      : []
  );
  const utfylt = $derived(
    gyldig
      ? [
          {
            naar: valg.dato,
            hva: OPPGITT.klar_over_utgiftene,
            kilde: KUNNSKAPSDATO.linjeNy(valg.dato),
          },
        ]
      : []
  );

  function seBrevet() {
    return flyt.send({
      mangler: datofeil ? () => document.getElementById(`${uid}-dato`) : null,
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
{#snippet tidslinje()}
  <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'vederlag')} {utfylt} />
{/snippet}

<Datobrev
  id={uid}
  {hode}
  onsubmit={seBrevet}
  rader={[
    { dt: KUNNSKAPSDATO.gjelder, dd: KUNNSKAPSDATO.varselet(varselbrevet) },
    { dt: KUNNSKAPSDATO.sisteOpplysning, dd: KUNNSKAPSDATO.opplysningen(siste) },
  ]}
  virkninger={[KUNNSKAPSDATO.egetBrev(svarbrevet), ...(lukket ? [KUNNSKAPSDATO.lukket] : [])]}
  dato={{
    etikett: KUNNSKAPSDATO.etikett,
    hjelp: KUNNSKAPSDATO.datoHjelp,
    maks: idag,
    feil: visDatofeil || null,
  }}
  bind:datoen={valg.dato}
  forklaring={{ etikett: KUNNSKAPSDATO.forklaring, hjelp: KUNNSKAPSDATO.forklaringHjelp }}
  bind:forklaringen={valg.forklaring}
  panel={{ tittel: KUNNSKAPSDATO.panel, tom: KUNNSKAPSDATO.panelTom, linjer }}
  {sendeknapp}
  {tidslinje}
  forkastTekst={KUNNSKAPSDATO.forkastTekst}
  {onforkast}
/>
