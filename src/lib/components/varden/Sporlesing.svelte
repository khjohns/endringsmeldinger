<!--
  Sporet med siste brev i sin helhet (Varden, skjerm D). Handlingene står synlige i kortet «Det du
  kan gjøre nå» øverst i høyre kolonne, uten panel (oppdragsgiver 06.11, #1631): én primærhandling
  og resten under «Andre handlinger». I forholdet står siden for forholdet i stedet, med brevtråden
  og brevet slik det ble sendt i høyre kolonne, og handlingen ved brevet den svarer på (oppsett B,
  U-16 i BF-44, #1898). «Godta svaret» går rett til brevet med aksepten, der virkningen kjernen
  regner ut, står før sendingen.
-->
<script lang="ts">
  import { ArrowRight, ChevronRight } from 'lucide-svelte';
  import { tick } from 'svelte';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { brevaarsak } from '$lib/kjernesak/kontekst.svelte';
  import type { Part, Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { kontrollbrev, type TilBrevkontrollen } from './Brevkontroll.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brev from './Brev.svelte';
  import Brevpanel from './Brevpanel.svelte';
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
    kravposterUtenFastBeloep,
    type Brevet,
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
    skjemaene,
    onvelg,
    onspor,
    onkorriger,
    onakseptbrev,
    nySak,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: Spor;
    /** Nøklene kalleren åpner et skjema for med `onvelg`, som `svare:vederlag`. */
    skjemaene: string[];
    /** Brukeren valgte en brevtype i menyen, som `svare:vederlag`. */
    onvelg: (noekkel: string) => void;
    /** Brukeren valgte et annet spor på siden for forholdet. */
    onspor?: (spor: Spor) => void;
    /** Lenken til skjemaet for ny sak, når TE kan sende en ny versjon av påberopelsen (BF-10 U-2). */
    nySak?: string;
    /** TE velger «Korriger datoen» ved opplysningen (U-1 i BF-02A). */
    onkorriger?: (opplysning: string) => void;
    /** Aksepten til brevkontrollen, med virkningen slik kjernen regner den. */
    onakseptbrev: (k: Omit<TilBrevkontrollen, 'detteSender'>) => void;
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
  const vist = $derived(kanGodta && svarbrevet ? svarbrevet : siste);
  const oversikt = $derived(spor === 'forhold');
  // Under 1181 px står brevet i raden i tråden, og ellers i høyre kolonne (U-16 i BF-44).
  let smal = $state(false);
  $effect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(max-width: 1180px)');
    smal = mq.matches;
    const endret = () => (smal = mq.matches);
    mq.addEventListener('change', endret);
    return () => mq.removeEventListener('change', endret);
  });
  // Brevet brukeren valgte å lese. I høyre kolonne står det siste brevet med tekst fra start.
  let lest = $state<string | null>(null);
  const alleBrev = $derived(brevene(u));
  const visesId = $derived(
    lest ?? (smal ? null : (alleBrev.findLast((b) => b.avsnitt !== null)?.id ?? null))
  );
  const visesBrev = $derived(alleBrev.find((b) => b.id === visesId && b.avsnitt !== null));
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
  // Aksepten åpnes her, og resten av skjemaene hos kalleren (#1663).
  const bygget = $derived([...(kanGodta ? [`godta:${spor}`] : []), ...skjemaene]);
  const primaerBygget = $derived(!!primaer && bygget.includes(primaer));
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
  // Handlingen står ved brevet den svarer på: kravet når parten kan svare, ellers svaret (U-16).
  const handlingVed = $derived(
    primaer === `svare:${spor}`
      ? (u.spor[spor].gjeldendeKrav?.dokument ?? null)
      : primaer || kanGodta
        ? (svarbrevet?.id ?? null)
        : null
  );
  const godtaVedBrevet = $derived(oversikt && kanGodta && handlingVed !== null);
  const andre = $derived(godtaVedBrevet ? menyvalg.filter((n) => n !== `godta:${spor}`) : menyvalg);
  const avslag = $derived(
    svaret?.standpunkter.some((s) => s.art === 'forhold' && s.resultat === 'avslaatt') ?? false
  );

  async function lesBrevet(id: string) {
    // I raden lukker knappen brevet igjen. I høyre kolonne blir knappen teksten «Vises til
    // høyre», så fokus går til brevet.
    if (smal && visesId === id) {
      lest = null;
      return;
    }
    lest = id;
    await tick();
    if (!smal) document.querySelector<HTMLElement>(`[data-brevpanel="${id}"]`)?.focus();
  }

  let hindring = $state<string | null>(null);

  const akseptkommando = $derived(
    kanGodta && svaret ? aksepten(spor, svaret.id, kjernesak.regelversjon) : null
  );
  // Virkningen av aksepten slik kjernen regner den, av svaret slik det ble sendt (KA-U10, MM-U50).
  const enighet = $derived(
    akseptkommando ? (kjernesak.forhaandsvist(akseptkommando)?.spor[spor].enighet ?? null) : null
  );
  // Hjemlene for innsigelsene mot varslene som har virkning, uten § 34.4 (KA-U64), hver én gang.
  const paaberopt = $derived([
    ...new Set(
      (svaret?.standpunkter ?? []).flatMap((s) =>
        s.art === 'rettidighet' && !s.iTide && s.hjemmel !== '34.4' ? [s.hjemmel] : []
      )
    ),
  ]);

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
      ...paaberopt.map((h) => STILLING.omfatter(h)),
      ...(enighet?.grunnlag.utfall.beloep !== undefined
        ? STILLING.beloepet(
            enighet.grunnlag.utfall.beloep,
            kravposterUtenFastBeloep(enighet.grunnlag.utfall, u.spor[spor].krav),
            svarbrevet
          )
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
    const brevet = kontrollbrev(b);
    if (!brevet) {
      hindring = (b && brevaarsak(b)) ?? STILLING.godta;
      return;
    }
    onakseptbrev({
      kommando: akseptkommando!,
      ...brevet,
      virkninger: akseptensVirkning(),
    });
  }
</script>

{#snippet meny(handlinger: string[], tittel: string | null)}
  <Brevtyper
    {tittel}
    {handlinger}
    {bygget}
    tekstFor={innsigelsestekst}
    beskrivelseFor={virkningen}
    onvelg={velg}
  />
{/snippet}

{#snippet primaerknapp(p: string, beskrevetAv: string | undefined)}
  {@const tekst =
    innsigelsestekst(p) ?? BREVTYPER.find((b) => b.type === handlingen(p)!.type)!.tekst}
  {#if primaerBygget}
    <Knapp variant="primaer" onclick={() => velg(p)} aria-describedby={beskrevetAv}
      >{tekst}<ChevronRight size={16} aria-hidden="true" /></Knapp
    >
  {:else}
    <Knapp
      variant="primaer"
      onclick={() => (primaerIkkeBygget = true)}
      aria-describedby={beskrevetAv}>{tekst}<ChevronRight size={16} aria-hidden="true" /></Knapp
    >
  {/if}
{/snippet}

{#snippet ikkeBygget()}
  {#if primaer && !primaerBygget}
    <!-- Den levende regionen står fra start, så teksten leses opp når den kommer (#1636). -->
    <p class="dempet" role="status">{primaerIkkeBygget ? HANDLINGENE.ikkeBygget : ''}</p>
  {/if}
{/snippet}

{#snippet nySaklenke()}
  {#if nySak}
    <!-- Under handlingene, ikke blant dem: de gjelder denne saken, og lenken starter en annen. -->
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
{/snippet}

<!-- Handlingen ved brevet den svarer på, med én linje om hva den gjør (U-16 i BF-44). -->
{#snippet vedBrevet()}
  {@const linje = [
    primaer ? virkningen(primaer) : null,
    godtaVedBrevet ? virkningen(`godta:${spor}`) : null,
  ]
    .filter(Boolean)
    .join(' ')}
  <div class="knapper">
    {#if primaer}{@render primaerknapp(primaer, linje ? `${uid}-vedbrevet` : undefined)}{/if}
    {#if godtaVedBrevet}
      <Knapp
        onclick={() => velg(`godta:${spor}`)}
        aria-describedby={linje ? `${uid}-vedbrevet` : undefined}>{HANDLINGENE.godta(avslag)}</Knapp
      >
    {/if}
  </div>
  {#if linje}<p class="dempet" id={`${uid}-vedbrevet`}>{linje}</p>{/if}
  {@render ikkeBygget()}
  {#if hindring}<Melding art="feil">{hindring}</Melding>{/if}
{/snippet}

{#snippet lestBrevet(b: Brevet)}
  {#if b.avsnitt}
    <Brevpanel brev={{ ...b, avsnitt: b.avsnitt }} sak={kjernesak.saksbilde?.tittel ?? ''} iRaden />
  {/if}
{/snippet}

{#if oversikt}
  <Arbeidsflate leser>
    {#snippet hoved()}
      <Forholdsoversikt
        {u}
        betegnelser={betegnelsene(kjernesak.saksbilde)}
        vist={visesId}
        {smal}
        onles={lesBrevet}
        {onspor}
        {korrigerbare}
        {onkorriger}
        handlingVed={primaer || godtaVedBrevet ? handlingVed : null}
        handling={vedBrevet}
        brevet={lestBrevet}
      />
      {#if andre.length || nySak}
        <section class="kort andre" aria-label={HANDLINGENE.andre}>
          {#if andre.length}{@render meny(andre, HANDLINGENE.andre)}{/if}
          {@render nySaklenke()}
        </section>
      {/if}
    {/snippet}
    {#snippet hoeyre()}
      {#if visesBrev && !smal}
        {#key visesBrev.id}
          <Brevpanel
            brev={{ ...visesBrev, avsnitt: visesBrev.avsnitt! }}
            sak={kjernesak.saksbilde?.tittel ?? ''}
          />
        {/key}
      {/if}
    {/snippet}
  </Arbeidsflate>
{:else}
  <Arbeidsflate>
    {#snippet hoved()}
      {#if vist}
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
            <div class="primaer">
              {@render primaerknapp(primaer, linje ? `${uid}-primaer` : undefined)}
              {#if linje}<p class="dempet" id={`${uid}-primaer`}>{linje}</p>{/if}
              {@render ikkeBygget()}
            </div>
          {/if}
          {@render meny(menyvalg, harPrimaer ? HANDLINGENE.andre : null)}
          {#if hindring}<Melding art="feil">{hindring}</Melding>{/if}
        </section>
      {/if}
      {@render nySaklenke()}
      <Tidslinje brev={sporbrev} datoer={datoerISporet(u, spor)} />
    {/snippet}
  </Arbeidsflate>
{/if}

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
  .knapper {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2) var(--spacing-5);
  }
  .andre {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
  }
  .andre .annen {
    padding: var(--spacing-2) 0 0;
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
