<!--
  Kravene om vederlagsjustering og fristforlengelse i saken (#1449, kriterium 3), som treet i
  prototypen `grunnlagsoversikt.html`: forholdet med svaret øverst, og under det hvert krav med
  betegnelsen i MM-U30, det TE krevde og det byggherren svarte, med laget og brevet, og hvorfor
  svaret er subsidiært til forholdet (vedtaket 05.10). «Åpne» fører til kravet.
-->
<script lang="ts">
  import type { Betegnelse } from '#kjerne/utledning/visning.ts';
  import type { Spor } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import { dager, kroner } from '#kjerne/frosset/tekst.ts';
  import { ChevronRight } from 'lucide-svelte';
  import Knapp from './Knapp.svelte';
  import {
    brevForLinja,
    brevet,
    forholdetISaken,
    innleggene,
    tilknyttetKrav,
    type Brevet,
    type Lagraden,
    type TilknyttetKrav,
  } from './lesing';
  import { BETEGNELSE, FORHOLDET, FRISTEN, SPORNAVN, brevref, brevrefFra } from './tekster';

  let {
    u,
    betegnelser,
    brev,
    onspor,
  }: {
    u: Utledning;
    betegnelser: Record<Spor, Betegnelse | null>;
    /** Brevene i saken (`brevene(u)`). */
    brev: Brevet[];
    /** Uten den står kravene uten lenke, som i komponentdemoen. */
    onspor?: (spor: Spor) => void;
  } = $props();
  const uid = $props.id();

  const kravene = $derived(
    (['vederlag', 'frist'] as const).flatMap((spor) => {
      const b = betegnelser[spor];
      const siste = brevForLinja(brev, spor, b === 'trukket');
      return b && siste
        ? [
            {
              ...tilknyttetKrav(u, spor, brev),
              betegnelse: BETEGNELSE[b],
              trukket: b === 'trukket',
              siste,
            },
          ]
        : [];
    })
  );
  const forholdssvaret = $derived.by(() => {
    const s = u.spor.forhold.gjeldendeSvar;
    const b = s && brevet(u, s.dokument);
    const rader = s && innleggene(u).get(s.dokument)?.standpunkter;
    return rader && b ? { rader, brev: b } : null;
  });
  const rot = $derived(
    FORHOLDET.forholdsrot(forholdetISaken(u)?.navn ?? FORHOLDET.utenNavn, forholdssvaret)
  );
  // Hvorfor svaret er, eller blir, subsidiært til forholdet. Et trukket krav har ikke noe vilkår.
  const vilkaaret = (k: (typeof kravene)[number]): string | null =>
    !k.grunner.length || k.trukket
      ? null
      : k.svaret
        ? FORHOLDET.gjelderHvis(k.grunner)
        : forholdssvaret && FORHOLDET.blirSubsidiaert(forholdssvaret.brev);
  const tall = (spor: Spor, n: number) => (spor === 'frist' ? dager(n) : kroner(n));
  /** Et lag etter det første heter etter vilkåret i kortform, som på siden for kravet (D1 A). */
  const lagnavn = (spor: Spor, l: Lagraden): string | null =>
    l.vilkaar.length ? FRISTEN.radnavn(l.vilkaar, l.heller, spor === 'vederlag') : null;
  const fristnavn = (f: { nummer: string | null; navn: string }) =>
    f.nummer ? `${FRISTEN.frist(f.nummer)} ${f.navn}` : f.navn;

  interface Rad {
    navn: string;
    verdi: string | null;
    under: boolean;
  }
  /**
   * Radene under «Byggherren»: det første laget på linja med overskriften, og de andre lagene med
   * vilkåret. Med flere frister står lagene for alle fristene først, og så hver frist (KA-U74).
   */
  function svarradene(k: TilknyttetKrav): { hode: string | null; rader: Rad[] } {
    const s = k.svaret!;
    const rad = (l: Lagraden, under = true): Rad => ({
      navn: lagnavn(k.spor, l) ?? '',
      verdi: tall(k.spor, l.tall),
      under,
    });
    if (!k.frister.length) {
      const [foerste, ...resten] = s.lagene;
      const hode = foerste && !foerste.vilkaar.length ? foerste : null;
      return {
        hode: hode && tall(k.spor, hode.tall),
        rader: (hode ? resten : s.lagene).map((l) => rad(l)),
      };
    }
    const gruppe = (tittel: string, lagene: Lagraden[]): Rad[] => {
      const [foerste, ...resten] = lagene;
      if (foerste && !foerste.vilkaar.length)
        return [
          { navn: tittel, verdi: tall(k.spor, foerste.tall), under: false },
          ...resten.map((l) => rad(l)),
        ];
      return [
        { navn: tittel, verdi: lagene.length ? null : FORHOLDET.ikkeISvaret, under: false },
        ...lagene.map((l) => rad(l)),
      ];
    };
    return {
      hode: null,
      rader: [
        ...(s.forAlle.length ? gruppe(FRISTEN.forAlle, s.forAlle) : []),
        ...k.frister.flatMap((f) => gruppe(fristnavn(f), f.lagene)),
      ],
    };
  }
</script>

<!-- Skillet står med hardt mellomrom etter beløpet, så ingen linje begynner med «·». -->
{#snippet utenFast(n: number)}&nbsp;<span class="uten"
    ><span aria-hidden="true">·</span> {FORHOLDET.utenFastBeloep(n)}</span
  >{/snippet}

{#snippet radene(rader: Rad[])}
  {#if rader.length}
    <ul class="rader">
      {#each rader as r, i (i)}
        <li class:under={r.under}>
          <span class="rnavn">{r.navn}</span>
          {#if r.verdi}<span
              class:num={!r.verdi.startsWith(FORHOLDET.ikkeISvaret)}
              class:dempet={r.verdi === FORHOLDET.ikkeISvaret}>{r.verdi}</span
            >{/if}
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <header class="hode">
    <h2 id={`${uid}-tittel`}>{FORHOLDET.tilknyttede}</h2>
    <p class="kilde">{FORHOLDET.tilknyttedeKilde}</p>
  </header>
  {#if kravene.length}
    <div class="tre">
      <p class="rot"><span class="ring" aria-hidden="true"></span>{rot}</p>
      <ul>
        {#each kravene as k (k.spor)}
          <li>
            <div class="kravhode">
              <div class="tittel">
                <h3 class="navn">{SPORNAVN[k.spor]}</h3>
                <span class="merke">{k.betegnelse}</span>
                {#if k.trukket}<span class="brev">{brevrefFra(k.siste, k.siste.avsender)}</span
                  >{/if}
              </div>
              {#if onspor}<Knapp
                  variant="lenke"
                  aria-label={FORHOLDET.aapneNavn(k.spor)}
                  onclick={() => onspor(k.spor)}
                  >{FORHOLDET.aapne}<ChevronRight size={16} aria-hidden="true" /></Knapp
                >{/if}
            </div>
            {#if k.krevd}
              <div class="del">
                <p class="delhode">
                  <span class="part">{FORHOLDET.krevd}</span>
                  <span class="brev">{brevref(k.krevd.brev)}</span>
                  {#if !k.frister.length}<span class="verdi"
                      >{#if k.krevd.tall !== null}<span class="num"
                          >{tall(k.spor, k.krevd.tall)}</span
                        >{#if k.krevd.utenFast}{@render utenFast(
                            k.krevd.utenFast
                          )}{/if}{:else if k.spor === 'vederlag'}{FORHOLDET.ingenFastBeloep}{/if}</span
                    >{/if}
                </p>
                <!-- KA-U74: dagene står per frist og legges ikke sammen. -->
                {@render radene(
                  k.frister.map((f) => ({
                    navn: fristnavn(f),
                    verdi: dager(f.krevd),
                    under: false,
                  }))
                )}
              </div>
            {/if}
            <div class="del">
              {#if k.svaret}
                {@const s = svarradene(k)}
                <p class="delhode">
                  <span class="part">{FORHOLDET.byggherren}</span>
                  <span class="brev">{brevref(k.svaret.brev)}</span>
                  {#if s.hode || (!k.frister.length && k.svaret.utenFast)}<span class="verdi"
                      >{#if s.hode}<span class="num">{s.hode}</span
                        >{#if k.svaret.utenFast}{@render utenFast(
                            k.svaret.utenFast
                          )}{/if}{:else}{FORHOLDET.ingenFastBeloep}{/if}</span
                    >{/if}
                </p>
                {@render radene(s.rader)}
              {:else}
                <p class="delhode">
                  <span class="part">{FORHOLDET.byggherren}</span>
                  <span class="verdi dempet">{FORHOLDET.ikkeSvart}</span>
                </p>
              {/if}
            </div>
            {#if vilkaaret(k)}<p class="vilkaar">{vilkaaret(k)}</p>{/if}
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <p class="tomt">{FORHOLDET.ingenKrav}</p>
  {/if}
</section>

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-1) var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-3);
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  .kilde {
    font-size: 12px;
    color: var(--ink-3);
  }
  .tre {
    padding: 0 var(--spacing-5) var(--spacing-5);
  }
  .rot {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: 14px;
    color: var(--ink-3);
  }
  .ring {
    flex: none;
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--rule-strong-color);
    border-radius: 50%;
    background: var(--surface);
  }
  .tre > ul {
    list-style: none;
    margin: 0 0 0 7px;
    padding: 0;
    border-left: 1px solid var(--rule-strong-color);
  }
  .tre > ul > li {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-left: var(--spacing-4);
    padding: var(--spacing-4) 0;
  }
  .tre > ul > li + li {
    border-top: var(--rule-subtle);
  }
  /* Grenen fra treet til kravet. */
  .tre > ul > li::before {
    content: '';
    position: absolute;
    left: calc(-1 * var(--spacing-4));
    top: calc(var(--spacing-4) + 0.75em);
    width: calc(var(--spacing-4) - var(--spacing-1));
    border-top: 1px solid var(--rule-strong-color);
  }
  .kravhode {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  .kravhode .tittel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-1) var(--spacing-3);
  }
  .kravhode > :global(.knapp) {
    flex: none;
  }
  .navn {
    font-size: 16px;
    font-weight: 600;
  }
  .merke {
    font-size: 12px;
    font-weight: 600;
    padding: 1px var(--spacing-2);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-merke);
  }
  .del {
    display: grid;
    gap: var(--spacing-1);
  }
  /* Parten og brevet til venstre, tallet til høyre, så tallene står under hverandre. */
  .delhode,
  .rader li {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-1) var(--spacing-2);
  }
  .delhode .verdi,
  .rader li > :last-child:not(.rnavn) {
    margin-left: auto;
    text-align: right;
  }
  .part {
    font-weight: 600;
  }
  .rader {
    display: grid;
    gap: var(--spacing-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .rader li.under {
    padding-left: var(--spacing-3);
    font-size: 14px;
    color: var(--ink-2);
  }
  .rnavn {
    min-width: 0;
  }
  .num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .delhode .num {
    font-size: 16px;
  }
  .uten {
    color: var(--ink-2);
  }
  .brev,
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .vilkaar {
    font-size: 14px;
    color: var(--ink-2);
  }
  .tomt {
    padding: var(--spacing-3) var(--spacing-5) var(--spacing-5);
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
