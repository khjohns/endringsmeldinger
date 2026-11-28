<!--
  TE retter datoen for et varsel eller et krav TE har lagt til som korrespondanse, i et eget brev
  (BF-50, MM-U59 punkt 8 og 18, MM-U63). Skjemaet har utkastkortet, varselet eller kravet med
  datoen som gjelder, datofeltet og forklaringen, og panelet til høyre har hovedlinjene og «Se
  brevet før sending», som korrigeringen av datoen (`Korrigering.svelte`, U-2). Kjernen lager
  brevet og avviser det den ikke godtar, også en dato før påberopelsen (D-7).
-->
<script lang="ts">
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { RETTINGSTITTEL } from '#kjerne/frosset/brevtittel.ts';
  import { utkastetsHode } from './utkastetsHode';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import { sendeflyt } from './sendeflyt.svelte';
  import Datobrev from './Datobrev.svelte';
  import Sendeknapp from './Sendeknapp.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import { rettingen, type Korrigeringsvalg } from './kommandoer';
  import { brevene, datoerISporet, datorettingene } from './lesing';
  import { RETTING, dagensDato } from './tekster';

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
    /** Varselet eller kravet kjernen tilbyr handlingen for (`rette_datoen:<id>`). */
    gjelder: string;
    /** Datoen og forklaringen står når TE går til brevkontrollen og tilbake. */
    valg?: Korrigeringsvalg;
    onbrevkontroll: (k: TilBrevkontrollen) => void;
    /** TE har bekreftet at utkastet skal forkastes. */
    onforkast: () => void;
  } = $props();
  const uid = $props.id();

  // Kalleren viser skjemaet bare når kjernen tilbyr handlingen, og da finnes datoene.
  const r = $derived(datorettingene(u, gjelder)!);
  const gjeldende = $derived(r.datoene.at(-1)!);
  const lukket = $derived(u.forholdAvvist);
  const spor = $derived(brevene(u).find((b) => b.id === r.brev.id)?.spor[0] ?? 'forhold');
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes(spor)));

  // Dagens dato i Oslo, som datofeltet ikke kan gå forbi (U-9).
  const idag = dagensDato();

  const kommando = $derived(rettingen(valg, gjelder));
  const hode = $derived(utkastetsHode(u, kjernesak.sak?.merking, RETTINGSTITTEL[r.det.art]));

  // Det som hindrer, med skjemaets ord, før brevkontrollen (U-9). Kjernen avviser det samme med
  // `DATOEN_ER_UENDRET` og `DATO_ETTER_BREVET`, og en dato før påberopelsen med sin egen melding.
  const datofeil = $derived(
    !valg.dato
      ? RETTING.skrivDatoen
      : valg.dato === gjeldende.dato
        ? RETTING.uendret(gjeldende)
        : valg.dato > idag
          ? RETTING.etterIdag(valg.dato, idag)
          : null
  );
  const flyt = sendeflyt(() => kjernesak, `${uid}-hindring`);
  const visDatofeil = $derived(flyt.forsoekt ? datofeil : null);

  const gyldig = $derived(!!valg.dato && !datofeil);
  const linjer = $derived(
    gyldig
      ? [
          { tekst: RETTING.linjeNy(valg.dato), lag: null },
          { tekst: RETTING.linjeGjelder(gjeldende), lag: null },
          ...(valg.forklaring.trim() ? [{ tekst: RETTING.linjeForklaring, lag: null }] : []),
        ]
      : []
  );
  const utfylt = $derived(
    gyldig
      ? [{ naar: valg.dato, hva: RETTING.tidslinje(r.det), kilde: RETTING.tidslinjeKilde }]
      : []
  );
  const virkninger = $derived([RETTING.straks, ...(lukket ? [RETTING.lukket] : [])]);

  function seBrevet() {
    return flyt.send({
      mangler: datofeil ? () => document.getElementById(`${uid}-dato`) : null,
      kommando,
      kanIkkeLages: RETTING.kanIkkeLages,
      tilBrevkontrollen: (brevet) => onbrevkontroll({ kommando, ...brevet, virkninger }),
    });
  }
</script>

{#snippet sendeknapp()}
  <Sendeknapp {flyt} onclick={seBrevet}>{RETTING.seBrevet}</Sendeknapp>
{/snippet}
{#snippet tidslinje()}
  <Tidslinje brev={sporbrev} datoer={datoerISporet(u, spor)} {utfylt} />
{/snippet}

<Datobrev
  id={uid}
  {hode}
  onsubmit={seBrevet}
  rader={[
    { dt: RETTING.gjelderRad, dd: RETTING.detSomRettes(r.det, r.brev) },
    { dt: RETTING.datoenRad, dd: RETTING.datoenVerdi(gjeldende) },
  ]}
  virkninger={[RETTING.egetBrev(r.brev), ...virkninger]}
  dato={{
    etikett: RETTING.etikett,
    hjelp: RETTING.datoHjelp,
    maks: idag,
    feil: visDatofeil || null,
  }}
  bind:datoen={valg.dato}
  forklaring={{ etikett: RETTING.forklaring, hjelp: RETTING.forklaringHjelp }}
  bind:forklaringen={valg.forklaring}
  panel={{ tittel: RETTING.panel, tom: RETTING.panelTom, linjer }}
  {sendeknapp}
  {tidslinje}
  forkastTekst={RETTING.forkastTekst}
  {onforkast}
/>
