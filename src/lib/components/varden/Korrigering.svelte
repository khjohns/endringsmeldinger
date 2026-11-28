<!--
  TE korrigerer datoen pålegget ble mottatt, eller når TE ble klar over forholdet, i et eget brev
  (BF-02A, BF-02C og BF-02D; MM-U59 punkt 10, 11 og 24). Skjemaet har utkastkortet, opplysningen
  som korrigeres, datofeltet og forklaringen, og panelet til høyre har hovedlinjene og «Se brevet
  før sending». Brevet sendes fra brevkontrollen, som de andre brevene (svaret på S-4b i BF-10,
  oppdragsgiver 06.11). Kjernen lager brevet og avviser det den ikke godtar.
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
  import { korrigeringen, type Korrigeringsvalg } from './kommandoer';
  import { brevene, datoerISporet, datoopplysningene } from './lesing';
  import { FORHOLDET, KORRIGERING, dagensDato } from './tekster';

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
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** TE har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
  } = $props();
  const uid = $props.id();

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
  const lukket = $derived(avsluttetAvTe(u));
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes('forhold')));

  // Dagens dato i Oslo, som datofeltet ikke kan gå forbi (U-3).
  const idag = dagensDato();

  const kommando = $derived(korrigeringen(valg, opplysningen));
  const hode = $derived(utkastetsHode(u, kjernesak.sak?.merking, UTSAGNSTITTEL.korrigering));

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
  const flyt = sendeflyt(() => kjernesak, `${uid}-hindring`);
  const visDatofeil = $derived(flyt.forsoekt ? datofeil : null);

  const linjer = $derived(
    valg.dato && !datofeil
      ? [
          { tekst: KORRIGERING.linjeNy(opplysningen.hva, valg.dato), lag: null },
          { tekst: KORRIGERING.linjeTidligere(opplysningen), lag: null },
          ...(valg.forklaring.trim() ? [{ tekst: KORRIGERING.linjeForklaring, lag: null }] : []),
        ]
      : []
  );

  function seBrevet() {
    return flyt.send({
      mangler: datofeil ? () => document.getElementById(`${uid}-dato`) : null,
      kommando,
      kanIkkeLages: KORRIGERING.kanIkkeLages,
      tilBrevkontrollen: (brevet) =>
        onbrevkontroll({
          kommando,
          ...brevet,
          virkninger: [FORHOLDET.korrigeringenStaar(lukket, svarbrevet)].filter((v) => v !== null),
        }),
    });
  }
</script>

{#snippet sendeknapp()}
  <Sendeknapp {flyt} onclick={seBrevet}>{KORRIGERING.seBrevet}</Sendeknapp>
{/snippet}
{#snippet tidslinje()}
  <Tidslinje brev={sporbrev} datoer={datoerISporet(u, 'forhold')} />
{/snippet}

<Datobrev
  id={uid}
  {hode}
  onsubmit={seBrevet}
  rader={[
    { dt: KORRIGERING.duKorrigerer, dd: KORRIGERING.opplysningen(opplysningen) },
    { dt: KORRIGERING.oppgittI, dd: KORRIGERING.brevet(opplysningen.brev) },
  ]}
  virkninger={[
    KORRIGERING.egetBrev(paaberopelsen, svarbrevet),
    ...(lukket ? [KORRIGERING.lukket] : []),
  ]}
  dato={{
    etikett: KORRIGERING.nyDato(opplysningen.hva),
    hjelp: KORRIGERING.datoHjelp,
    maks: idag,
    feil: visDatofeil || null,
  }}
  bind:datoen={valg.dato}
  forklaring={{ etikett: KORRIGERING.forklaring, hjelp: KORRIGERING.forklaringHjelp }}
  bind:forklaringen={valg.forklaring}
  panel={{ tittel: KORRIGERING.panel, tom: KORRIGERING.panelTom, linjer }}
  {sendeknapp}
  {tidslinje}
  forkastTekst={KORRIGERING.forkastTekst}
  {onforkast}
/>
