<!--
  Kravene om vederlagsjustering og fristforlengelse i saken (#1449, kriterium 3), som treet i
  prototypen `grunnlagsoversikt.html`: forholdet med svaret øverst, og under det hvert krav med
  betegnelsen i MM-U30, det TE krevde og det byggherren svarte, med laget og brevet, og hvorfor
  svaret er subsidiært til forholdet (vedtaket 05.10). «Åpne» fører til kravet.
-->
<script lang="ts">
  import type { Betegnelse } from '$kjerne/utledning/visning';
  import type { Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import { dager, kroner } from '$kjerne/frosset/standpunkt';
  import { ChevronRight } from 'lucide-svelte';
  import Knapp from './Knapp.svelte';
  import { brevForLinja, brevet, forholdetISaken, tilknyttetKrav, type Brevet } from './lesing';
  import { BETEGNELSE, FORHOLDET, SPORNAVN, brevref, brevrefFra, metodenavn } from './tekster';

  let {
    u,
    betegnelser,
    brev,
    onspor,
  }: {
    u: Utledning;
    betegnelser: Record<Spor, Betegnelse | null>;
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
              ...tilknyttetKrav(u, spor),
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
    const r = s?.standpunkter.find((x) => x.art === 'forhold');
    const b = s && brevet(u, s.dokument);
    return r && r.art === 'forhold' && b
      ? { resultat: FORHOLDET.resultat[r.resultat], brev: b }
      : null;
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
  const stor = (t: string) => t[0].toUpperCase() + t.slice(1);
</script>

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
              <h3 class="navn">{SPORNAVN[k.spor]}</h3>
              <span class="merke">{k.betegnelse}</span>
              {#if k.trukket}<span class="brev">{brevrefFra(k.siste, k.siste.avsender)}</span>{/if}
              {#if onspor}<Knapp
                  variant="lenke"
                  aria-label={FORHOLDET.aapneNavn(k.spor)}
                  onclick={() => onspor(k.spor)}
                  >{FORHOLDET.aapne}<ChevronRight size={16} aria-hidden="true" /></Knapp
                >{/if}
            </div>
            <dl class="tall">
              {#if k.krevd}
                <div>
                  <dt>{FORHOLDET.krevd}</dt>
                  <dd>
                    {#if k.krevd.tall !== null}<span class="num">{tall(k.spor, k.krevd.tall)}</span
                      >{:else}{stor(metodenavn(k.krevd.metode))}{/if}
                    <span class="brev">{brevref(k.krevd.brev)}</span>
                  </dd>
                </div>
              {/if}
              <div>
                <dt>{FORHOLDET.byggherren}</dt>
                <dd>
                  {#if k.svaret}
                    {#each k.svaret.poster as p, i (i)}
                      <span class="post">
                        <span class="num">{tall(k.spor, p.tall)}</span>
                        {#if p.lag}<span class="lag">{p.lag}</span>{/if}
                      </span>
                    {/each}
                    <span class="brev">{brevref(k.svaret.brev)}</span>
                  {:else}
                    <span class="dempet">{FORHOLDET.ikkeSvart}</span>
                  {/if}
                </dd>
              </div>
            </dl>
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
  ul {
    list-style: none;
    margin: 0 0 0 7px;
    padding: 0;
    border-left: 1px solid var(--rule-strong-color);
  }
  li {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    margin-left: var(--spacing-4);
    padding: var(--spacing-4) 0;
  }
  li + li {
    border-top: var(--rule-subtle);
  }
  /* Grenen fra treet til kravet. */
  li::before {
    content: '';
    position: absolute;
    left: calc(-1 * var(--spacing-4));
    top: calc(var(--spacing-4) + 0.75em);
    width: calc(var(--spacing-4) - var(--spacing-1));
    border-top: 1px solid var(--rule-strong-color);
  }
  .kravhode {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-2) var(--spacing-3);
  }
  .kravhode > :global(.knapp) {
    margin-left: auto;
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
  .tall {
    display: grid;
    gap: var(--spacing-1);
  }
  .tall div {
    display: grid;
    grid-template-columns: 8rem minmax(0, 1fr);
    gap: var(--spacing-3);
    align-items: baseline;
  }
  dt {
    color: var(--ink-2);
  }
  dd {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--spacing-1) var(--spacing-3);
  }
  .post {
    display: inline-flex;
    gap: var(--spacing-2);
    align-items: baseline;
  }
  .num {
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
  .lag {
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
  @media (max-width: 560px) {
    .tall div {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
