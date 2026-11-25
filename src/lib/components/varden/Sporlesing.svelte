<!--
  Siden for sporet i oppsett B (U-16 i BF-44, U-6 og U-14 i BF-45, #1898): brevtråden med
  handlingen ved brevet den svarer på, brevet slik det ble sendt i høyre kolonne, og «Andre
  handlinger» nederst. Sidene for forholdet, vederlaget og fristen har samme props (#1997).
  «Godta svaret» går rett til brevet med aksepten, der virkningen kjernen regner ut, står før
  sendingen.
-->
<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import type { Component, Snippet } from 'svelte';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { forseringKanVelges } from '#lib/kjernesak/kontekst.svelte.ts';
  import type { Part, Spor } from '#kjerne/typer.ts';
  import type { TilbudtHandling } from '#kjerne/kommandoer/handlinger.ts';
  import { hjemmelenForVarselet } from '#lib/kjernesak/vederlagskrav.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { TilBrevkontrollen } from './Brevkontroll.svelte';
  import Arbeidsflate from './Arbeidsflate.svelte';
  import Brevpanel from './Brevpanel.svelte';
  import Brevtyper from './Brevtyper.svelte';
  import Forholdsoversikt from './Forholdsoversikt.svelte';
  import Fristoversikt from './Fristoversikt.svelte';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Vederlagsoversikt from './Vederlagsoversikt.svelte';
  import { aksepten } from './kommandoer';
  import { fokuser } from './mangler';
  import { sendeflyt } from './sendeflyt.svelte';
  import { medietreff, SMAL } from './medie.svelte';
  import {
    betegnelsene,
    brevMedUtsagn,
    brevene,
    brevITraaden,
    fristtabellen,
    handlingerISporet,
    kravposterUtenFastBeloep,
    leveringene,
    type Brevet,
    type Sideprops,
  } from './lesing';
  import {
    BREVTYPER,
    FRISTEN,
    HANDLINGENE,
    FORHOLDET,
    LEGG_TIL,
    STILLING,
    VARSELSVARET,
    varselet,
  } from './tekster';

  /** Siden for hvert spor, med samme props (#1997). */
  const SIDENE: Record<Spor, Component<Sideprops>> = {
    forhold: Forholdsoversikt,
    vederlag: Vederlagsoversikt,
    frist: Fristoversikt,
  };
  /** Raden for forsering etter punkt 33.8, som ikke er en handling i kjernen (U-6 i BF-45, OV-U2). */
  const FORSERING = 'forsering:frist';

  let {
    kjernesak,
    u,
    spor,
    skjemaene,
    onvelg,
    onspor,
    utkast,
    onkorriger,
    onakseptbrev,
    nySak,
    sakslenke,
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
    /** Utkastene som kan fortsettes fra oversikten. */
    utkast?: Snippet;
    /** Lenken til skjemaet for ny sak, når TE kan sende en ny versjon av påberopelsen (BF-10 U-2). */
    nySak?: string;
    /** TE velger «Korriger datoen» ved opplysningen (U-1 i BF-02A). */
    onkorriger?: (opplysning: string) => void;
    /** Aksepten til brevkontrollen, med virkningen slik kjernen regner den. */
    onakseptbrev: (k: TilBrevkontrollen) => void;
    /** Lenken til en annen sak i prosjektet, som en forlengelse av en frist står i (BF-45 U-5). */
    sakslenke?: (sakId: string) => string;
  } = $props();
  const uid = $props.id();

  const part = $derived(kjernesak.part as Part);
  const alleBrev = $derived(brevene(u));
  const sporbrev = $derived(alleBrev.filter((b) => b.spor.includes(spor)));
  const iSporet = $derived(handlingerISporet(kjernesak.tilbudte, spor));
  const noekler = $derived(iSporet.map((h) => h.noekkel));
  const handlingen = (n: string) => iSporet.find((h) => h.noekkel === n);
  const svaret = $derived(u.spor[spor].gjeldendeSvar);
  const kanGodta = $derived(svaret !== null && noekler.includes(`godta:${spor}`));
  const svarbrevet = $derived(svaret ? sporbrev.find((b) => b.id === svaret.dokument) : undefined);
  const Side = $derived(SIDENE[spor]);
  const fristtabell = $derived(fristtabellen(kjernesak, sakslenke));
  const levering = $derived(leveringene(kjernesak.sak?.leveringsoppdrag ?? []));
  // Under 1181 px står brevet i raden i tråden, og ellers i høyre kolonne (U-16 i BF-44).
  const smalt = medietreff(SMAL);
  const smal = $derived(smalt.treff);
  // Før brukeren velger et brev, viser høyre kolonne det nyeste brevet med tekst i tråden.
  let lest = $state<string | null>(null);
  const visesId = $derived(
    lest ??
      (smal ? null : (brevITraaden(alleBrev, spor).findLast((b) => b.avsnitt !== null)?.id ?? null))
  );
  const visesBrev = $derived(alleBrev.find((b) => b.id === visesId && b.avsnitt !== null));
  // Svaret på byggherrens forespørsel etter punkt 33.6.2 står ved forespørselen (U-6 i BF-45).
  const foresporsel = $derived(iSporet.find((h) => h.type === 'svare_paa_foresporsel') ?? null);
  // Svaret på et varsel som står alene, står ved varselet (G-9 i BF-14, VS-U79).
  const varselhjemmel = (h: TilbudtHandling | undefined) =>
    h?.gjelder && (h.type === 'svare' || h.type === 'revidere')
      ? hjemmelenForVarselet(u, h.gjelder)
      : null;
  const varselsvarene = $derived(iSporet.filter((h) => h.type === 'svare' && varselhjemmel(h)));
  // Et svar uten skjema står under «Andre handlinger», også det første.
  const svarPaaVarselet = $derived(
    varselsvarene.find((h) => skjemaene.includes(h.noekkel)) ?? null
  );
  // Primærhandlingen er svaret på motpartens siste brev når kjernen tilbyr det, og etter
  // byggherrens svar TEs nye versjon (oppdragsgiver 06.11, #1649).
  const primaer = $derived(
    noekler.includes(`svare:${spor}`)
      ? `svare:${spor}`
      : foresporsel
        ? foresporsel.noekkel
        : svarPaaVarselet
          ? svarPaaVarselet.noekkel
          : kanGodta && noekler.includes(`krav:${spor}`)
            ? `krav:${spor}`
            : null
  );
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
  // Byggherrens nye svar står ved byggherrens svar, når det ikke er noe annet å svare på (U-16).
  const revidere = $derived(
    !primaer && !kanGodta && svarbrevet && noekler.includes(`revidere:${spor}`)
      ? `revidere:${spor}`
      : null
  );
  /** Teksten, linja under og brevet handlingen står ved, for én type handling. */
  interface Omtale {
    /** Teksten på knappen eller raden; uten den gjelder teksten i `BREVTYPER`. */
    tekst?: () => string | null;
    /** Hva handlingen gjør med saken. */
    linje?: () => string | null;
    /** Brevet handlingen står ved når den er primærhandlingen. */
    ved?: () => string | null;
  }
  const kravbrevet = () => u.spor[spor].gjeldendeKrav?.dokument ?? null;
  const vedSvaret = () => svarbrevet?.id ?? null;
  // Handlingene etter type (`TilbudtHandling.type`), og forseringen, som ikke er en handling i
  // kjernen (#2000). Et varsel med hjemmel har teksten fra `varselet`.
  const OMTALE: Record<string, Omtale> = {
    godta: {
      tekst: () => HANDLINGENE.godta(avslag),
      ved: vedSvaret,
    },
    svare: {
      tekst: () =>
        spor !== 'forhold'
          ? null
          : u.spor.forhold.krav.length > 1
            ? FORHOLDET.svarNyVersjon
            : FORHOLDET.svar,
      ved: () =>
        primaer === svarPaaVarselet?.noekkel
          ? (brevMedUtsagn(u, svarPaaVarselet!.gjelder!)?.id ?? null)
          : kravbrevet(),
    },
    krav: {
      tekst: () =>
        spor === 'forhold' ? FORHOLDET.oppdater : kanGodta ? HANDLINGENE.revidertKrav : null,
      ved: vedSvaret,
    },
    revidere: {
      ved: vedSvaret,
    },
    trekke: {
      tekst: () => (spor === 'forhold' ? FORHOLDET.trekk : null),
      linje: () =>
        spor === 'forhold'
          ? HANDLINGENE.virkning.trekkForholdet
          : spor === 'frist'
            ? svaret
              ? FRISTEN.trekkEtterSvar
              : FRISTEN.trekk
            : svaret
              ? HANDLINGENE.virkning.trekkKravetEtterSvar
              : HANDLINGENE.virkning.trekkKravet,
    },
    svare_paa_foresporsel: {
      tekst: () => FRISTEN.svarPaaForesporsel,
      ved: () => (foresporsel ? (brevMedUtsagn(u, foresporsel.gjelder!)?.id ?? null) : null),
    },
    forsering: { linje: () => FRISTEN.forseringLinje },
  };
  const omtalen = (n: string): Omtale | undefined =>
    OMTALE[n === FORSERING ? 'forsering' : (handlingen(n)?.type ?? '')];

  const handlingVed = $derived.by(() => {
    const n = primaer ?? (kanGodta ? `godta:${spor}` : revidere);
    return n ? (omtalen(n)?.ved?.() ?? null) : null;
  });
  // Svaret på hvert varsel som står alene, står ved brevet med varselet (U-16 i BF-44,
  // oppdragsgiver 25.11 i #2360). Det første er primærhandlingen når saken ikke har annet.
  const varselVed = $derived.by(() => {
    const ved: Record<string, string[]> = {};
    // Et svar uten skjema, eller et brev utenfor tråden, står fortsatt under «Andre handlinger».
    const iTraaden = new Set(brevITraaden(alleBrev, spor).map((b) => b.id));
    for (const h of varselsvarene) {
      if (h.noekkel === primaer || !bygget.includes(h.noekkel)) continue;
      const b = brevMedUtsagn(u, h.gjelder!)?.id;
      if (b && iTraaden.has(b)) ved[b] = [...(ved[b] ?? []), h.noekkel];
    }
    return ved;
  });
  const handlingerVed = $derived([
    ...(handlingVed === null ? [] : [handlingVed]),
    ...Object.keys(varselVed).filter((b) => b !== handlingVed),
  ]);
  const vedVarslene = $derived(Object.values(varselVed).flat());
  const godtaVedBrevet = $derived(kanGodta && handlingVed !== null);
  // Kjernen sier om forseringen kan velges (`forseringKanVelges`, FO-U1, U-6 i BF-45), og
  // `kanGodta` om serveren lar totalentreprenøren svare på svaret. «Andre handlinger» setter den
  // foran «Trekk kravet» (`BREVTYPER`, svar 3 A).
  const forsering = $derived(
    spor === 'frist' && part === 'TE' && kanGodta && forseringKanVelges(u)
  );
  const andre = $derived([
    ...menyvalg.filter(
      (n) =>
        !(godtaVedBrevet && n === `godta:${spor}`) && n !== revidere && !vedVarslene.includes(n)
    ),
    ...(forsering ? [FORSERING] : []),
  ]);
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
    await fokuser(() =>
      smal ? null : document.querySelector<HTMLElement>(`[data-brevpanel="${id}"]`)
    );
  }

  const flyt = sendeflyt(() => kjernesak, `${uid}-hindring`);

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

  /** Teksten for et varsel med hjemmelen, og ellers teksten i `OMTALE`. */
  function innsigelsestekst(n: string): string | null {
    const h = handlingen(n);
    if (h?.hjemmel) return varselet(h.type, h.hjemmel);
    const v = varselhjemmel(h);
    if (v) {
      const flere = iSporet.some((x) => x !== h && x.type === h!.type && varselhjemmel(x) === v);
      const brev = flere ? (brevMedUtsagn(u, h!.gjelder!) ?? undefined) : undefined;
      return h!.type === 'svare' ? VARSELSVARET.svar(v, brev) : VARSELSVARET.nyttSvar(v, brev);
    }
    return omtalen(n)?.tekst?.() ?? null;
  }

  /** Linja under handlingen: hva den gjør med saken. */
  const virkningen = (n: string): string | null => omtalen(n)?.linje?.() ?? null;

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

  /** Hindringen for aksepten, som knappen som åpner den, viser til. */
  const hindringFor = (n: string) =>
    n === `godta:${spor}` && flyt.hindring ? flyt.hindringId : undefined;

  function velg(n: string) {
    flyt.kontroller(null);
    if (n === `godta:${spor}`) seAksepten();
    else onvelg(n);
  }

  function seAksepten() {
    const kommando = akseptkommando!;
    void flyt.send({
      mangler: null,
      kommando,
      kanIkkeLages: STILLING.godta,
      tilBrevkontrollen: (brevet) =>
        onakseptbrev({ kommando, ...brevet, virkninger: akseptensVirkning() }),
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
    beskrevetAv={hindringFor}
    onvelg={velg}
  />
{/snippet}

{#snippet primaerknapp(p: string)}
  {@const tekst =
    innsigelsestekst(p) ?? BREVTYPER.find((b) => b.type === handlingen(p)!.type)!.tekst}
  <Knapp
    variant={utkast ? 'sekundaer' : 'primaer'}
    onclick={() => (primaerBygget ? velg(p) : (primaerIkkeBygget = true))}>{tekst}</Knapp
  >
{/snippet}

{#snippet ikkeBygget()}
  {#if (primaer && !primaerBygget) || (revidere && !bygget.includes(revidere))}
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

<!-- Handlingen står ved brevet den svarer på (U-16 i BF-44). -->
{#snippet vedBrevet()}
  <div class="knapper">
    {#if primaer}{@render primaerknapp(primaer)}{/if}
    {#if revidere}
      {@const r = revidere}
      <!-- Kantstilt med linja under og i samme størrelse, som i prototypene (#2000). -->
      <Knapp
        variant="lenke"
        kompakt
        onclick={() => (bygget.includes(r) ? velg(r) : (primaerIkkeBygget = true))}
        >{innsigelsestekst(r) ?? BREVTYPER.find((b) => b.type === 'revidere')!.tekst}</Knapp
      >
    {/if}
    {#if godtaVedBrevet}
      <Knapp onclick={() => velg(`godta:${spor}`)} aria-describedby={hindringFor(`godta:${spor}`)}
        >{HANDLINGENE.godta(avslag)}</Knapp
      >
    {/if}
  </div>
  {@render ikkeBygget()}
  {#if flyt.hindring}
    <Melding art="feil" levende={false} id={flyt.hindringId} tabindex="-1">{flyt.hindring}</Melding>
  {/if}
{/snippet}

<!-- Handlingene ved brevet `id`: primærhandlingen og svaret på varselet i brevet. -->
{#snippet vedBrevene(id: string)}
  {#if id === handlingVed}{@render vedBrevet()}{/if}
  {#if varselVed[id]?.length}
    <div class="knapper">
      {#each varselVed[id] as n (n)}
        <Knapp variant={utkast ? 'sekundaer' : 'primaer'} onclick={() => velg(n)}
          >{innsigelsestekst(n)}</Knapp
        >
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet lestBrevet(b: Brevet)}
  <Brevpanel brev={b} sak={kjernesak.saksbilde?.tittel ?? ''} iRaden />
{/snippet}

{#snippet leggTilKorrespondanse()}
  {#if kjernesak.handlinger.includes('registrere_brev') && skjemaene.includes('registrere_brev')}
    <Knapp variant="lenke" kompakt onclick={() => onvelg('registrere_brev')}>
      {LEGG_TIL.tittel}
    </Knapp>
  {/if}
{/snippet}

<Arbeidsflate leser>
  {#snippet hoved()}
    {@render utkast?.()}
    <Side
      {u}
      betegnelser={betegnelsene(kjernesak.saksbilde)}
      {fristtabell}
      vist={visesId}
      {smal}
      onles={lesBrevet}
      {onspor}
      {korrigerbare}
      {onkorriger}
      {handlingerVed}
      handling={vedBrevene}
      brevet={lestBrevet}
      {levering}
      {leggTilKorrespondanse}
    />
    {#if handlingVed === null && (primaer || flyt.hindring)}
      <!-- Uten et brev å stå ved står handlingen over de andre, så den aldri faller bort. -->
      <section class="kort andre" aria-label={FORHOLDET.handlinger}>
        {@render vedBrevet()}
      </section>
    {/if}
    {#if andre.length || nySak}
      <section class="andre" aria-label={HANDLINGENE.andre}>
        {#if andre.length}{@render meny(andre, HANDLINGENE.andre)}{/if}
        {@render nySaklenke()}
      </section>
    {/if}
  {/snippet}
  {#snippet hoeyre()}
    {#if visesBrev && !smal}
      {#key visesBrev.id}
        <Brevpanel brev={visesBrev} sak={kjernesak.saksbilde?.tittel ?? ''} />
      {/key}
    {/if}
  {/snippet}
</Arbeidsflate>

<style>
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
