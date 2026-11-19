<!--
  Brevtråden, felles for sidene for forholdet, vederlaget og fristen (#1898, system.md «Brevene»):
  brevene nyest først, med parten i ringen, datoen, hva brevet er og brevnummeret, og en kortere rad
  for registrert korrespondanse (U-5 og U-8 i BF-44). Kalleren velger brevene med `brevITraaden`.
  «Les brevet» viser brevet slik det ble sendt i høyre kolonne, og under 1181 px i raden (U-16).
  Handlingen står ved brevet den svarer på. Under hodet på et brev om forholdet står TEs
  beskrivelse og datoen TE oppgir, eller byggherrens standpunkter med lagene brevet ga dem (OV-U32)
  og begrunnelsen.
-->
<script lang="ts">
  import { File } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { stor } from '#kjerne/frosset/brevdeler.ts';
  import type { Spor } from '#kjerne/typer.ts';
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import Sitat from './Sitat.svelte';
  import type { Brevet, Brevref, Innlegget } from './lesing';
  import { FORHOLDET, LEGG_TIL, TRAADEN, kortDatoMedAar } from './tekster';

  let {
    brev,
    spor,
    innlegg = new Map(),
    fulgtOpp = new Map(),
    eldreKrav = new Set(),
    dokumentasjon,
    sammeDag = new Map(),
    venterPaaSvar,
    korrigerbare = [],
    lukket = false,
    vist = null,
    smal = false,
    onles,
    onkorriger,
    handlingVed = null,
    handling,
    brevet,
    oeverst,
    nederst,
    leggTilKorrespondanse,
  }: {
    /** Brevene i tråden i rekkefølgen i journalen (`brevITraaden`). Tråden viser dem nyest først. */
    brev: Brevet[];
    /** Siden tråden står på, som gir overskriften. */
    spor: Spor;
    /** Innholdet i brevene med krav eller svar om forholdet (`innleggene`). */
    innlegg?: Map<string, Innlegget>;
    /** Brevet som følger opp et eldre krav, etter brevet med det eldre (`oppfoelgingene`). */
    fulgtOpp?: Map<string, Brevref>;
    /**
     * Brevene med et krav et senere krav i sporet følger opp (`eldreKravISporet`). Tallet i
     * kravet øverst står dempet, også når tittelen ikke er det fordi brevet har et krav som
     * gjelder i et annet spor (U-5 i BF-44).
     */
    eldreKrav?: ReadonlySet<string>;
    /** De registrerte brevene kjernen ikke vurderer innholdet i (OV-U19). */
    dokumentasjon: string[];
    /** Brevene kjernen har sammenliknet med et brev sendt samme dag (`sendtSammeDag`, OV-U104). */
    sammeDag?: ReadonlyMap<string, readonly Brevref[]>;
    /** Sporets betegnelse er «Svar ikke registrert» (MM-U30). */
    venterPaaSvar: boolean;
    /** Opplysningene om datoen kjernen tilbyr å korrigere (`korrigere:<id>`, MM-U55 punkt 10). */
    korrigerbare?: string[];
    /** Saken er lukket etter GR-U27, så korrigeringen endrer ikke utfallet (MM-U51). */
    lukket?: boolean;
    /** Brevet som vises ved siden av tråden, eller i raden når `smal`. */
    vist?: string | null;
    /** Under 1181 px står brevet i raden, ikke i høyre kolonne (U-16). */
    smal?: boolean;
    onles: (id: string) => void;
    onkorriger?: (opplysning: string) => void;
    /** Brevet handlingen svarer på (U-16). */
    handlingVed?: string | null;
    handling?: Snippet;
    /** Brevet slik det ble sendt, i raden. */
    brevet?: Snippet<[Brevet]>;
    /**
     * Det siden viser først under hodet på brevet, som beløpet i et krav (U-12 i BF-44). Tallet i
     * kravet har klassen `kravtall`.
     */
    oeverst?: Snippet<[Brevet]>;
    /** Det siden viser sist under brevet, over handlingen, som akseptfristen (U-11 i BF-44). */
    nederst?: Snippet<[Brevet]>;
    leggTilKorrespondanse?: Snippet;
  } = $props();
  const uid = $props.id();

  const nyestFoerst = $derived(brev.map((b, n) => ({ b, n })).reverse());
</script>

<div class="traadhode">
  <h3 id={`${uid}-tittel`}>{TRAADEN.tittel(spor)}</h3>
  {@render leggTilKorrespondanse?.()}
</div>
<ol class="traad" aria-labelledby={`${uid}-tittel`}>
  {#if venterPaaSvar}
    <li class="innlegg tom">
      <span class="part" aria-hidden="true">BH</span>
      <p>{FORHOLDET.svarIkkeRegistrert}</p>
    </li>
  {/if}
  {#each nyestFoerst as { b, n } (b.id)}
    {@const registrert = b.art === 'registrert'}
    {@const i = innlegg.get(b.id)}
    {@const fulgt = fulgtOpp.get(b.id)}
    <!-- OV-U104: merknaden står ved korrespondansen som er lagt til, ikke ved brevet fra løsningen. -->
    {@const samme = registrert ? (sammeDag.get(b.id) ?? []) : []}
    {@const hva = TRAADEN.hva(b)}
    {@const valgt = vist === b.id}
    {@const tilHoeyre = valgt && !smal}
    <!-- Datoen er når brevet kom i saken; sendedatoen parten oppgir for et registrert brev står
         i linja under (svar 1 A i #1999). -->
    {@const datoen = b.registrert}
    <li
      class="innlegg"
      class:kompakt={registrert}
      class:eldre={!!fulgt}
      class:valgt={tilHoeyre}
      aria-current={tilHoeyre ? 'true' : undefined}
    >
      <!-- Partene skilles med form: BH har fylt ring, TE åpen (oppdragsgiver 06.11, #1646). -->
      <span class="part" class:bh={b.avsender === 'BH'} aria-hidden="true">{b.avsender}</span>
      <div class="rad">
        <span class="dato">
          {kortDatoMedAar(
            datoen
          )}{#if b.nummer !== null}{` · ${TRAADEN.nummer(b.nummer)}`}{/if}{#if fulgt}{TRAADEN.fulgtOpp(
              fulgt
            )}{/if}
        </span>
        <span class="meta">
          {#if registrert && dokumentasjon.includes(b.id)}<span>{TRAADEN.dokumentasjon}</span>{/if}
          {#if b.avsnitt}
            {#if tilHoeyre}
              <span class="vises">{TRAADEN.vises}</span>
            {:else}
              <Knapp
                variant="lenke"
                kompakt
                aria-label={TRAADEN.knappenavn(valgt ? TRAADEN.lukk : TRAADEN.les, b, hva)}
                aria-expanded={smal ? valgt : undefined}
                data-les={b.id}
                onclick={() => onles(b.id)}>{valgt ? TRAADEN.lukk : TRAADEN.les}</Knapp
              >
            {/if}
          {/if}
        </span>
        <h4 id={`${uid}-${b.id}`}>
          {hva}<span class="visually-hidden">{TRAADEN.fra(b.avsender)}</span>
        </h4>
      </div>
      {#if registrert || i || b.vedlegg.length || oeverst || nederst || samme.length}
        <div class="innhold">
          {#if oeverst}
            <div class="oeverst" class:eldre-krav={eldreKrav.has(b.id)}>{@render oeverst(b)}</div>
          {/if}
          {#if registrert}
            <p class="datolinje">{TRAADEN.registrert(b.avsender, b.sendt, b.registrert)}</p>
          {/if}
          {#if samme.length}
            <Melding art="info" levende={false}>{LEGG_TIL.sammeDag(samme)}</Melding>
          {/if}
          {#if i}
            {#if i.standpunkter.some((l) => l.lag)}
              <ul class="lagene" aria-label={FORHOLDET.lagene}>
                {#each i.standpunkter as l, j (l.standpunkt.id)}
                  <li class:under={j > 0 && l.lag !== i.standpunkter[0]?.lag}>
                    {#if l.lag}<b>{stor(l.lag)}</b>{/if}
                    <span>{FORHOLDET.standpunkt(l.standpunkt, l.brev, l.ordene)}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              {#each i.standpunkter as l (l.standpunkt.id)}
                <p class="standpunkt">{FORHOLDET.standpunkt(l.standpunkt, l.brev, l.ordene)}</p>
              {/each}
            {/if}
            {#if i.utdypning || i.oppgitt}
              <Sitat
                etikett={i.utdypning
                  ? b.art === 'svar'
                    ? FORHOLDET.begrunnelsen
                    : i.opplysning?.korrigering
                      ? FORHOLDET.forklaringen
                      : FORHOLDET.beskrivelse(i.gjelderPaalegg)
                  : null}
              >
                {#if i.utdypning}
                  <!-- Teksten kan være flere sider, så tråden viser de første tre linjene; hele står i brevet
                     (oppdragsgiver 06.11, #1646). -->
                  <p class="utdrag" class:bh={b.avsender === 'BH'}>«{i.utdypning}»</p>
                {/if}
                {#if i.oppgitt}
                  {@const o = i.opplysning}
                  <!-- Handlingen står ved datoen, og etter en korrigering ved den siste (U-1 i BF-02A). -->
                  <div class="datolinje">
                    <p>
                      {FORHOLDET.oppgitt(i.oppgitt.hva, i.oppgitt.dato, b.avsender)}
                      {#if o?.forrige}{FORHOLDET.korrigerer(o.forrige)}{/if}
                      {#if o?.korrigertI}{FORHOLDET.korrigertI(o.korrigertI)}{/if}
                    </p>
                    {#if o && onkorriger && korrigerbare.includes(o.id)}
                      <Knapp
                        variant="lenke"
                        aria-label={FORHOLDET.korrigerNavn(o.hva)}
                        onclick={() => onkorriger(o.id)}>{FORHOLDET.korriger}</Knapp
                      >
                    {/if}
                  </div>
                {/if}
              </Sitat>
            {/if}
            {#if i.sisteOpplysningVedSvaret}
              <Melding art="info" levende={false}
                >{FORHOLDET.sisteOpplysningVedSvaret(i.sisteOpplysningVedSvaret)}</Melding
              >
            {/if}
            {#if i.opplysning && !i.opplysning.korrigering && lukket && onkorriger && korrigerbare.includes(i.opplysning.id)}
              <!-- Under brevet, ikke i det parten skrev (oppdragsgiver 06.11, #1646). -->
              <Melding art="info" levende={false}>{FORHOLDET.korrigerILukket}</Melding>
            {/if}
            {#if i.opplysning?.korrigering}
              {@const staar = FORHOLDET.korrigeringenStaar(
                lukket,
                brev.slice(0, n).findLast((x) => x.art === 'svar' && x.spor.includes('forhold')) ??
                  null
              )}
              {#if staar}<Melding art="info" levende={false}>{staar}</Melding>{/if}
            {/if}
          {/if}
          {#if b.vedlegg.length}
            <ul class="filer" aria-label={TRAADEN.vedlegg(b)}>
              {#each b.vedlegg as fil, k (k)}
                <li class="fil"><File size={14} aria-hidden="true" /><span>{fil}</span></li>
              {/each}
            </ul>
          {/if}
          {@render nederst?.(b)}
        </div>
      {/if}
      {#if valgt && smal && brevet}<div class="brevplass">{@render brevet(b)}</div>{/if}
      {#if handling && handlingVed === b.id}<div class="handling">{@render handling()}</div>{/if}
    </li>
  {/each}
</ol>

<style>
  .traadhode {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--spacing-4) var(--spacing-5) 0;
  }
  .traadhode h3 {
    font-size: 16px;
    font-weight: 600;
  }
  .traad {
    list-style: none;
    margin: var(--spacing-2) 0 0;
    padding: 0 0 var(--spacing-2);
  }
  .innlegg {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-5);
  }
  .innlegg + .innlegg {
    border-top: var(--rule-subtle);
  }
  /* Streken mellom ringene binder brevene sammen til én tråd. */
  .innlegg::before {
    content: '';
    position: absolute;
    left: 35px;
    top: 0;
    bottom: 0;
    border-left: 1px solid var(--rule-strong-color);
  }
  .innlegg:first-child::before {
    top: var(--spacing-5);
  }
  .innlegg:last-child::before {
    bottom: auto;
    height: var(--spacing-5);
  }
  .innlegg:only-child::before {
    display: none;
  }
  /* Brevet som vises til høyre, har en strek i blekk og sier det i tekst (U-16). */
  .innlegg.valgt {
    box-shadow: inset 3px 0 0 var(--ink);
  }
  .part {
    position: absolute;
    left: var(--spacing-5);
    top: var(--spacing-3);
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface);
    border: 1.5px solid var(--ink);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--ink);
    z-index: 1;
  }
  .part.bh {
    background: var(--ink);
    color: var(--surface);
  }
  .rad,
  .innhold,
  .brevplass,
  .handling,
  .tom p {
    margin-left: 48px;
  }
  .rad {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0 var(--spacing-3);
    align-items: baseline;
    min-height: 32px;
  }
  .dato {
    color: var(--ink-3);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  h4 {
    grid-column: 1 / -1;
    min-width: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: var(--ink);
  }
  .eldre h4 {
    color: var(--ink-2);
    font-weight: 500;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    min-height: 24px;
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  /* Lenkeknappen står i flukt med teksten over; luften til siden er treffflate. */
  .datolinje :global(.knapp) {
    margin-left: calc(-1 * var(--spacing-2));
  }
  .vises {
    font-size: 14px;
    color: var(--ink-2);
  }
  .innhold {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .oeverst {
    display: contents;
  }
  /* Beløpet eller dagene i kravet (U-12 i BF-44), dempet i et eldre krav som tittelen (U-5). */
  .oeverst :global(.kravtall) {
    font-size: 16px;
    font-weight: 500;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .oeverst.eldre-krav :global(.kravtall) {
    font-weight: 400;
    color: var(--ink-2);
  }
  .kompakt {
    padding-top: var(--spacing-2);
    padding-bottom: var(--spacing-2);
  }
  .kompakt .part {
    top: 9px;
    left: 24px;
    width: 24px;
    height: 24px;
    font-size: 10px;
  }
  .kompakt h4 {
    font-size: 14px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .datolinje {
    font-size: 14px;
    color: var(--ink-2);
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: var(--spacing-3);
  }
  .standpunkt {
    font-weight: 500;
    color: var(--ink);
  }
  .lagene {
    display: grid;
    gap: var(--spacing-2);
    font-size: 14px;
  }
  .lagene li {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: var(--spacing-1) var(--spacing-3);
  }
  .lagene b {
    font-weight: 600;
  }
  .lagene .under {
    color: var(--ink-3);
  }
  .lagene .under b {
    font-weight: 500;
  }
  /* Partens ord står i avsenderens brevskrift (system.md, «Typografi»; oppdragsgiver 07.11, #1659). */
  .utdrag {
    font-family: var(--font-brev);
    font-size: 16px;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }
  .utdrag.bh {
    font-family: var(--font-brev-bh);
    font-size: 11pt;
  }
  .filer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }
  .fil {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 32px;
    max-width: 100%;
    padding: var(--spacing-1) 10px;
    border: var(--rule);
    border-radius: var(--r-felt);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .fil :global(svg) {
    flex: none;
    color: var(--ink-3);
  }
  .brevplass {
    position: relative;
    z-index: 1;
  }
  .handling {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
    padding-top: var(--spacing-1);
  }
  .tom p {
    font-size: 14px;
    color: var(--ink-3);
    line-height: 32px;
  }
  .tom .part {
    border-style: dashed;
    color: var(--ink-3);
  }
  @media (max-width: 720px) {
    .lagene li {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 560px) {
    .innlegg {
      padding-left: var(--spacing-4);
      padding-right: var(--spacing-4);
    }
    .rad,
    .innhold,
    .brevplass,
    .handling,
    .tom p {
      margin-left: 40px;
    }
    .part {
      left: var(--spacing-3);
    }
    .kompakt .part {
      left: var(--spacing-4);
    }
    .innlegg::before {
      left: 27px;
    }
    /* På smal skjerm går brevet ut til kantene av kortet (U-16). */
    .brevplass {
      margin-left: calc(-1 * var(--spacing-4));
      margin-right: calc(-1 * var(--spacing-4));
    }
  }
</style>
