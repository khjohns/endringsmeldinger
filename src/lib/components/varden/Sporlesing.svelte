<!--
  Sporet med siste brev i sin helhet (Varden, skjerm D). I forholdet står siden for forholdet i
  stedet, og «Les brevet» der viser brevet her (#1449): brevet slik det ble frosset da det ble
  sendt, ikke en ny gjengivelse av dataene. Handlingene står synlige i kortet «Det du kan gjøre nå»
  øverst i høyre kolonne, uten panel (oppdragsgiver 06.11, #1631): én primærhandling og resten
  under «Andre handlinger». «Godta svaret» går rett til brevet med aksepten, der virkningen
  kjernen regner ut, står før sendingen.
-->
<script lang="ts">
  import { ArrowRight, ChevronRight } from 'lucide-svelte';
  import { tick } from 'svelte';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { brevaarsak } from '$lib/kjernesak/kontekst.svelte';
  import type { Part, Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Brevtyper from './Brevtyper.svelte';
  import Forholdsoversikt from './Forholdsoversikt.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Tidslinje from './Tidslinje.svelte';
  import { aksepten } from './kommandoer';
  import {
    betegnelsene,
    brevene,
    handlingerISporet,
    datoerISporet,
    hovedkategorien,
  } from './lesing';
  import {
    BREVTYPER,
    HANDLINGENE,
    FORHOLDET,
    MOTTATT,
    STILLING,
    brevhode,
    brevtittel,
    dato,
    varselet,
  } from './tekster';

  let {
    kjernesak,
    u,
    spor,
    onvelg,
    onspor,
    onkorriger,
    onakseptbrev,
    nySak,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: Spor;
    /** Brukeren valgte en brevtype i menyen, som `svare:vederlag`. */
    onvelg: (noekkel: string) => void;
    /** Brukeren valgte et annet spor på siden for forholdet. */
    onspor?: (spor: Spor) => void;
    /** Lenken til skjemaet for ny sak, når TE kan sende en ny versjon av påberopelsen (BF-10 U-2). */
    nySak?: string;
    /** TE velger «Korriger datoen» ved opplysningen (U-1 i BF-02A). */
    onkorriger?: (opplysning: string) => void;
    onakseptbrev: (k: {
      kommando: Record<string, unknown>;
      tekst: string[];
      /** Virkningen av aksepten slik kjernen regner den, til brevkontrollen. */
      virkninger: string[];
      merking: string | null;
      deresRef: string[];
      tittel: string | null;
    }) => void;
  } = $props();
  const uid = $props.id();

  const part = $derived(kjernesak.part as Part);
  const sporbrev = $derived(brevene(u).filter((b) => b.spor.includes(spor)));
  const siste = $derived(sporbrev.at(-1) ?? null);
  const iSporet = $derived(handlingerISporet(kjernesak.tilbudte, spor));
  const noekler = $derived(iSporet.map((h) => h.noekkel));
  const handlingen = (n: string) => iSporet.find((h) => h.noekkel === n);
  const svaret = $derived(u.spor[spor].gjeldendeSvar);
  const kanGodta = $derived(svaret !== null && noekler.includes(`godta:${spor}`));
  const svarbrevet = $derived(svaret ? sporbrev.find((b) => b.id === svaret.dokument) : undefined);
  // Brevet brukeren valgte å lese på siden for forholdet, og `null` på selve siden.
  let lest = $state<string | null>(null);
  const oversikt = $derived(spor === 'forhold' && lest === null);
  const lestBrev = $derived(lest === null ? undefined : sporbrev.find((b) => b.id === lest));
  const vist = $derived(lestBrev ?? (kanGodta && svarbrevet ? svarbrevet : siste));
  // Handlingene står i et kort øverst i høyre kolonne, på linje med kortet i midten, i alle
  // tilstandene til sporet, som i prototypen `grunnlagsoversikt.html` (oppdragsgiver 05.11, #1631).
  // Primærhandlingen er svaret på motpartens siste brev når kjernen tilbyr det, og etter
  // byggherrens svar TEs nye versjon. Ellers har kortet ingen (oppdragsgiver 06.11, #1649).
  const primaer = $derived(
    noekler.includes(`svare:${spor}`)
      ? `svare:${spor}`
      : kanGodta && noekler.includes(`krav:${spor}`)
        ? `krav:${spor}`
        : null
  );
  const harPrimaer = $derived(primaer !== null);
  // Skjemaene Varden har: svaret på vederlagskravet og den nye versjonen av påberopelsen (BF-10).
  const bygget = $derived([
    'godta',
    ...(spor === 'vederlag' ? ['svare'] : spor === 'forhold' ? ['krav'] : []),
  ]);
  const primaerBygget = $derived(!!primaer && bygget.includes(handlingen(primaer)!.type));
  let primaerIkkeBygget = $state(false);
  // Korrigeringen av datoen står ved datoen i brevtråden, ikke i lista (U-1 i BF-02A, #1615).
  const korrigerbare = $derived(
    kjernesak.tilbudte.flatMap((h) => (h.type === 'korrigere' && h.gjelder ? [h.gjelder] : []))
  );
  // Innsigelsen om at et brev kom for sent er ikke en handling i Varden. Den hører hjemme i
  // svaret på brevet eller i et innlegg (oppdragsgiver 06.11, PR 1650).
  const menyvalg = $derived(
    iSporet
      .filter((h) => h.noekkel !== primaer && h.type !== 'korrigere' && h.type !== 'innsigelse')
      .map((h) => h.noekkel)
  );
  const avslag = $derived(
    svaret?.standpunkter.some((s) => s.art === 'forhold' && s.resultat === 'avslaatt') ?? false
  );

  async function lesBrevet(id: string) {
    lest = id;
    await tick();
    document.getElementById(`${uid}-brevtittel`)?.focus();
  }

  async function tilbakeTilForholdet() {
    const id = lest;
    lest = null;
    await tick();
    document.querySelector<HTMLElement>(`[data-les="${id}"]`)?.focus();
  }

  let hindring = $state<string | null>(null);

  const akseptkommando = $derived(
    kanGodta && svaret ? aksepten(spor, svaret.id, kjernesak.regelversjon) : null
  );
  // Virkningen av aksepten slik kjernen regner den, av svaret slik det ble sendt (KA-U10, MM-U50).
  const enighet = $derived(
    akseptkommando ? (kjernesak.forhaandsvist(akseptkommando)?.spor[spor].enighet ?? null) : null
  );
  const paaberopt = $derived(
    svaret?.standpunkter.find((s) => s.art === 'rettidighet' && !s.iTide) ?? null
  );

  /** Teksten for et varsel med hjemmelen, og for handlingene i forholdet og etter svaret. */
  function innsigelsestekst(n: string): string | null {
    const h = handlingen(n);
    if (h?.hjemmel) return varselet(h.type, h.hjemmel);
    if (n === 'trekke:forhold') return FORHOLDET.trekk;
    if (n === `godta:${spor}`) return HANDLINGENE.godta(avslag);
    if (n === 'svare:forhold')
      return u.spor.forhold.krav.length > 1 ? FORHOLDET.svarNyVersjon : FORHOLDET.svar;
    if (n === 'krav:forhold') return FORHOLDET.oppdater;
    if (h?.type === 'krav' && kanGodta) return HANDLINGENE.revidertKrav;
    return null;
  }

  /** Linja under handlingen: hva den gjør med saken. */
  function virkningen(n: string): string | null {
    if (n === `godta:${spor}` && svarbrevet) return HANDLINGENE.virkning.godta(svarbrevet);
    if (n === 'trekke:forhold') return HANDLINGENE.virkning.trekkForholdet;
    if (n.startsWith('trekke:')) return HANDLINGENE.virkning.trekkKravet;
    if (n.startsWith('krav:')) {
      const krav = sporbrev.find((b) => b.id === u.spor[spor].gjeldendeKrav?.dokument) ?? null;
      if (kanGodta)
        return spor === 'forhold'
          ? HANDLINGENE.virkning.oppdaterPaaberopelse(hovedkategorien(u))
          : HANDLINGENE.virkning.reviderKrav;
      return HANDLINGENE.virkning.nyVersjon(spor, krav, svarbrevet ?? null);
    }
    return null;
  }

  /** Det aksepten omfatter, og beløpet og vilkåret kjernen regner ut, av svaret slik det ble sendt. */
  function akseptensVirkning(): string[] {
    if (!svarbrevet) return [];
    return [
      ...(paaberopt?.art === 'rettidighet' ? [STILLING.omfatter(paaberopt.hjemmel)] : []),
      ...(enighet?.grunnlag.utfall.beloep !== undefined
        ? [STILLING.beloep(enighet.grunnlag.utfall.beloep, svarbrevet)]
        : []),
      ...(enighet?.grunnlag.vilkaar === 'forhold_avklart' && !u.forholdAvklart
        ? [STILLING.vilkaar]
        : []),
      STILLING.kilde(svarbrevet),
    ];
  }

  function velg(n: string) {
    hindring = null;
    if (n === `godta:${spor}`) seAksepten();
    else onvelg(n);
  }

  function seAksepten() {
    const b = kjernesak.brev(akseptkommando!, undefined, true);
    if (!b || !('tekst' in b) || !b.tekst) {
      hindring = (b && brevaarsak(b)) ?? STILLING.godta;
      return;
    }
    onakseptbrev({
      kommando: akseptkommando!,
      tekst: b.tekst,
      virkninger: akseptensVirkning(),
      merking: b.merking,
      deresRef: b.deresRef,
      tittel: b.brevtittel,
    });
  }
</script>

{#snippet meny()}
  <Brevtyper
    tittel={harPrimaer ? HANDLINGENE.andre : null}
    handlinger={menyvalg}
    {bygget}
    tekstFor={innsigelsestekst}
    beskrivelseFor={virkningen}
    onvelg={velg}
  />
{/snippet}

<Arbeidsflate>
  {#snippet hoved()}
    {#if oversikt}
      <Forholdsoversikt
        {u}
        betegnelser={betegnelsene(kjernesak.saksbilde)}
        onles={lesBrevet}
        {onspor}
        {korrigerbare}
        {onkorriger}
      />
    {:else if vist}
      {#if lestBrev}
        <p class="tilbake">
          <Knapp variant="lenke" onclick={tilbakeTilForholdet}>{FORHOLDET.tilbake}</Knapp>
        </p>
      {/if}
      <div class="linje">
        <h2 id={`${uid}-brevtittel`} tabindex="-1">
          {brevhode(vist)}
          <span class="dempet">
            · {vist.avsender} · {vist.avsender === part || vist.sendt ? 'sendt' : 'mottatt'}
            {dato(vist.sendt ?? vist.registrert)}</span
          >
        </h2>
      </div>
      {#if vist.avsnitt}
        <Brev
          avsender={vist.avsender}
          sak={kjernesak.saksbilde?.tittel ?? ''}
          merking={vist.merking}
          deresRef={vist.deresRef}
          dato={dato(vist.registrert)}
          tittel={brevtittel(vist)}
          avsnitt={vist.avsnitt}
          sendt={vist.registrert}
        >
          {#snippet fot()}{MOTTATT.sendt(vist.registrert)}{/snippet}
        </Brev>
      {/if}
    {:else}
      <p class="tomt">{MOTTATT.ingenBrev}</p>
    {/if}
  {/snippet}

  {#snippet hoeyre()}
    {#if menyvalg.length || harPrimaer}
      <section class="kort handlinger" aria-labelledby={`${uid}-handlinger`}>
        <h2 id={`${uid}-handlinger`}>{FORHOLDET.handlinger}</h2>
        {#if primaer}
          {@const linje = virkningen(primaer)}
          {@const tekst =
            innsigelsestekst(primaer) ??
            BREVTYPER.find((b) => b.type === handlingen(primaer!)!.type)!.tekst}
          <div class="primaer">
            {#if primaerBygget}
              <Knapp
                variant="primaer"
                onclick={() => velg(primaer!)}
                aria-describedby={linje ? `${uid}-primaer` : undefined}
                >{tekst}<ChevronRight size={16} aria-hidden="true" /></Knapp
              >
            {:else}
              <Knapp
                variant="primaer"
                onclick={() => (primaerIkkeBygget = true)}
                aria-describedby={linje ? `${uid}-primaer` : undefined}
                >{tekst}<ChevronRight size={16} aria-hidden="true" /></Knapp
              >
            {/if}
            {#if linje}<p class="dempet" id={`${uid}-primaer`}>{linje}</p>{/if}
            {#if !primaerBygget}
              <!-- Den levende regionen står fra start, så teksten leses opp når den kommer (#1636). -->
              <p class="dempet" role="status">
                {primaerIkkeBygget ? HANDLINGENE.ikkeBygget : ''}
              </p>
            {/if}
          </div>
        {/if}
        {@render meny()}
        {#if hindring}<Melding art="feil">{hindring}</Melding>{/if}
      </section>
    {/if}
    {#if nySak}
      <!-- Under kortet, ikke i det: kortet samler valgene i denne saken, og lenken starter en annen. -->
      <p class="annen">
        {FORHOLDET.annen}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
        <a href={nySak} target="_blank" rel="noopener"
          >{FORHOLDET.annenLenke}<ArrowRight size={16} aria-hidden="true" /><span
            class="visually-hidden">{FORHOLDET.nyFane}</span
          ></a
        >
      </p>
    {/if}
    <Tidslinje brev={sporbrev} datoer={datoerISporet(u, spor)} />
  {/snippet}
</Arbeidsflate>

<style>
  .linje {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  /* Tittelen brytes før menyen flyttes til en egen linje. */
  .linje > :first-child {
    flex: 1 1 18rem;
  }
  .linje .dempet {
    font-weight: 400;
  }
  /* Lenken står i flukt med overskriften; knappen har luft til siden for treffflaten. */
  .tilbake {
    margin-left: calc(-1 * var(--spacing-2));
  }
  .handlinger {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-5);
  }
  .primaer {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }
  .annen {
    display: grid;
    justify-items: start;
    gap: var(--spacing-1);
    padding: var(--spacing-2) var(--spacing-5) var(--spacing-2);
    font-size: 14px;
    color: var(--ink-3);
  }
  .annen a {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    color: var(--ink);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .annen a:hover {
    text-decoration-thickness: 2px;
  }
  .tomt {
    padding: var(--spacing-6);
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    color: var(--ink-2);
  }
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
</style>
