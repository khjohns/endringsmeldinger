<!--
  Kortet «Kravet og svaret» på siden for fristforlengelsen (BF-45, U-2–U-5 og U-13): lagene som
  gjelder hele kravet én gang under «For alle fristene», og under «Per frist» vilkårene for lagene
  én gang og én blokk per frist med gjeldende frist og en målestokk i dager, med kravet åpent og
  hvert lag fylt. Alle fristene har samme skala. Dagene og standpunktene er de byggherren sendte i
  brevet (MM-U50), og den nye fristen er regnet fra gjeldende frist (G-4).
-->
<script lang="ts">
  import { dager } from '#kjerne/frosset/tekst.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import Forbeholdet from './Forbeholdet.svelte';
  import Gjeldendefrist from './Gjeldendefrist.svelte';
  import Kravkort from './Kravkort.svelte';
  import Maalrad, { maalestokken } from './Maalrad.svelte';
  import type { Brevet, Fristtabellen } from './lesing';
  import { FRISTEN, VEDERLAGET } from './tekster';
  import {
    gjeldendeFrist,
    nyFrist,
    stoerstAntall,
    type KravetOgSvaretIFristen,
  } from './fristoversikt';

  let {
    k,
    u,
    alle,
    fristtabell,
    onforholdet,
  }: {
    k: KravetOgSvaretIFristen;
    u: Utledning;
    /** Brevene i saken (`brevene(u)`). */
    alle: Brevet[];
    fristtabell: Fristtabellen;
    /** Brukeren går til siden for forholdet fra forbeholdet. */
    onforholdet?: () => void;
  } = $props();
  const uid = $props.id();

  const svart = $derived(k.svarbrev !== null);
  const stoerst = $derived(stoerstAntall(k));
  const { trinn, andel, steg, ende } = $derived(maalestokken(stoerst, true));
  const sistePerFrist = $derived(k.perFrist.at(-1)?.lag);
</script>

<Kravkort tittel={FRISTEN.kortet} kilde={VEDERLAGET.kilde(k.kravbrev, k.svarbrev)} {steg}>
  {#if k.felles.length || k.utenLag.length}
    <section class="del" aria-labelledby={`${uid}-alle`}>
      <h3 id={`${uid}-alle`}>{FRISTEN.forAlle}</h3>
      {#each k.felles as l, i (l.lag)}
        <div class="lag" class:under={i > 0}>
          {#if l.vilkaar.length}<p>{FRISTEN.vilkaar(l.vilkaar, l.heller)}</p>{/if}
          {#each VEDERLAGET.laget(l) as tekst, j (j)}<p>{tekst}</p>{/each}
          {#if l.dager !== null}<Maalrad
              navn={FRISTEN.godkjent}
              verdi={dager(l.dager)}
              kompakt
              dempet={i > 0}
            />{/if}
        </div>
      {/each}
      {#each k.utenLag as s (s.id)}
        <p class="uten-lag">{FRISTEN.utenLag(s)}</p>
      {/each}
    </section>
  {/if}

  <section class="del" aria-labelledby={svart ? `${uid}-per` : undefined}>
    {#if svart}<h3 id={`${uid}-per`}>{FRISTEN.perFrist}</h3>{/if}
    {#if k.perFrist.length > 1 || (k.perFrist.length === 1 && k.perFrist[0]!.etikett)}
      <ul class="vilkaar">
        {#each k.perFrist as l (l.lag)}
          {@const grunnlag = FRISTEN.grunnlaget(
            l.standpunkter.map((s) => s.standpunkt),
            l.lag === sistePerFrist
          )}
          <li>
            {#if l.vilkaar.length}<b>{FRISTEN.vilkaar(l.vilkaar, l.heller)}</b>{/if}
            {#each grunnlag as tekst, i (i)}<p>{tekst}</p>{/each}
          </li>
        {/each}
      </ul>
    {/if}
    <p class="dempet">{FRISTEN.kalenderdager}</p>

    {#each k.frister as f (f.id)}
      {@const g = gjeldendeFrist(f.fristId, fristtabell)}
      {@const nyKrav = nyFrist(g, f.krevd)}
      <section class="frist" aria-labelledby={`${uid}-${f.id}`}>
        <h4 id={`${uid}-${f.id}`}>
          {#if f.nummer}<span class="nr">{FRISTEN.frist(f.nummer)}</span>{/if}
          {f.navn}
        </h4>
        <Gjeldendefrist {g} registrert={f.fristId !== null} sakslenke={fristtabell.sakslenke} />
        <ul class="rader" aria-label={f.navn}>
          <li>
            <Maalrad
              navn={FRISTEN.krevd}
              verdi={dager(f.krevd)}
              etter={nyKrav ? FRISTEN.nyFrist(nyKrav) : null}
              andel={andel(f.krevd)}
              aapen={k.kravbrev.avsender === 'TE'}
              kompakt
              trinn={f.lagene.length ? [] : trinn}
              {ende}
            />
          </li>
          {#each f.lagene as l, i (l.lag)}
            {@const ny = nyFrist(g, l.dager)}
            <li>
              <Maalrad
                navn={FRISTEN.godkjent}
                verdi={dager(l.dager)}
                etter={ny ? FRISTEN.nyFrist(ny) : null}
                andel={l.dager > 0 && l.dager !== f.lagene[i - 1]?.dager ? andel(l.dager) : null}
                aapen={k.svarbrev?.avsender === 'TE'}
                kompakt
                dempet={i > 0}
                trinn={i === f.lagene.length - 1 ? trinn : []}
                {ende}
              />
            </li>
          {/each}
        </ul>
        {#if f.avslag}
          <p class="avslag">{FRISTEN.avslag(f.avslag.begrunnelse)}</p>
        {/if}
      </section>
    {/each}
    {#if !svart}<p class="ikke-svart">{FRISTEN.ikkeSvart}</p>{/if}
  </section>

  {#if k.forbehold && k.svarbrev}
    <Forbeholdet svarbrev={k.svarbrev} {u} {alle} {onforholdet} />
  {/if}
</Kravkort>

<style>
  .del + .del {
    margin-top: var(--spacing-5);
    padding-top: var(--spacing-5);
    border-top: var(--rule-subtle);
  }
  h3 {
    margin-bottom: var(--spacing-2);
    font-size: 14px;
    font-weight: 600;
  }
  .lag + .lag {
    margin-top: var(--spacing-3);
  }
  .lag p,
  .vilkaar,
  .dempet,
  .avslag,
  .ikke-svart {
    white-space: pre-line;
    margin-top: 6px;
    font-size: 14px;
    color: var(--ink-2);
  }
  .uten-lag {
    margin-top: var(--spacing-3);
    padding-left: var(--spacing-3);
    border-left: 2px solid var(--rule-strong-color);
    font-size: 14px;
    color: var(--ink-2);
  }
  .lag p {
    color: var(--ink);
  }
  .lag.under p {
    color: var(--ink-3);
  }
  .vilkaar {
    display: grid;
    gap: var(--spacing-1);
    color: var(--ink);
  }
  .vilkaar b {
    font-weight: 600;
  }
  .dempet {
    margin-top: var(--spacing-2);
  }
  .frist {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: var(--rule-subtle);
  }
  h4 {
    font-size: 14px;
    font-weight: 600;
  }
  .nr {
    margin-right: var(--spacing-1);
    font-weight: 400;
    color: var(--ink-2);
  }
  .rader {
    display: grid;
    gap: var(--spacing-3);
    margin-top: var(--spacing-3);
  }
</style>
