<!--
  Kortet «Kravet og svaret» på siden for fristforlengelsen (BF-45, U-2–U-5 og U-13): lagene som
  gjelder hele kravet én gang under «For alle fristene», og under «Per frist» vilkårene for lagene
  én gang og én blokk per frist med gjeldende frist og en målestokk i dager, med kravet åpent og
  hvert lag fylt. Alle fristene har samme skala. Dagene og standpunktene er de byggherren sendte i
  brevet (MM-U50), og den nye fristen er regnet fra gjeldende frist (G-4).
-->
<script lang="ts">
  import { dager, sakensKode } from '$kjerne/frosset/tekst';
  import { stor } from '$kjerne/frosset/brevdeler';
  import type { Utledning } from '$kjerne/utledning/utled';
  import Forbeholdet from './Forbeholdet.svelte';
  import Maalrad, { maalestokken } from './Maalrad.svelte';
  import type { Brevet, Fristtabellen } from './lesing';
  import { FRISTEN, VEDERLAGET } from './tekster';
  import {
    gjeldendeFrist,
    nyFrist,
    stoerstAntall,
    type GjeldendeFrist,
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
  const { trinn, andel, steg } = $derived(maalestokken(stoerst));
  const sistePerFrist = $derived(k.perFrist.at(-1)?.lag);
</script>

{#snippet gjeldende(g: GjeldendeFrist, fristId: number | null)}
  {#if g?.art === 'kjent' && g.forlengelser.length}
    <p class="gjeldende">
      {FRISTEN.forlenget(g.dato, g.iKontrakten)}
      {#each g.forlengelser as f, i (i)}{#if i}{i === g.forlengelser.length - 1
            ? ' og '
            : ', '}{/if}{FRISTEN.forlengelsen(f.dager)}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
        {#if fristtabell.sakslenke}<a href={fristtabell.sakslenke(f.sakId)}
            >{f.sakskode ? sakensKode(f.sakskode) : f.sakId}</a
          >{:else}{f.sakskode ? sakensKode(f.sakskode) : f.sakId}{/if}{/each}.
    </p>
  {:else if g?.art === 'kjent'}
    <p class="gjeldende">{FRISTEN.somIKontrakten(g.dato)}</p>
  {:else if g?.art === 'ukjent'}
    <p class="gjeldende">{FRISTEN.ukjent(g.iKontrakten)}</p>
  {:else if fristId === null}
    <p class="gjeldende">{FRISTEN.ikkeRegistrert}</p>
  {/if}
{/snippet}

<section class="kort" aria-labelledby={`${uid}-tittel`}>
  <div class="hode">
    <h2 id={`${uid}-tittel`}>{FRISTEN.kortet}</h2>
    <span class="kilde">{VEDERLAGET.kilde(k.kravbrev, k.svarbrev)}</span>
  </div>
  <div class="kropp" style:--steg={steg}>
    {#if k.felles.length || k.utenLag.length}
      <section class="del" aria-labelledby={`${uid}-alle`}>
        <h3 id={`${uid}-alle`}>{FRISTEN.forAlle}</h3>
        {#each k.felles as l (l.lag)}
          {@const tekst = VEDERLAGET.laget(l)}
          <div class="lag">
            <Maalrad
              navn={l.etikett ? stor(l.etikett) : FRISTEN.godkjent}
              verdi={l.dager === null ? null : dager(l.dager)}
              kompakt
            />
            {#if tekst}<p>{tekst}</p>{/if}
          </div>
        {/each}
        {#each k.utenLag as s (s.standpunkt.id)}
          <p class="uten-lag">{FRISTEN.utenLag(s.standpunkt, s.vilkaar)}</p>
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
              <b>{stor(l.etikett ?? '')}</b>{#if l.vilkaar.length}, {FRISTEN.vilkaar(
                  l.vilkaar,
                  l.lag > 2
                )}{/if}{#if grunnlag}: {grunnlag}{/if}
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
          {@render gjeldende(g, f.fristId)}
          <ul class="rader" aria-label={f.navn}>
            <li>
              <Maalrad
                navn={FRISTEN.krevd}
                verdi={dager(f.krevd)}
                etter={nyKrav ? FRISTEN.nyFrist(nyKrav) : null}
                andel={andel(f.krevd)}
                aapen
                kompakt
                trinn={f.lagene.length ? [] : trinn}
              />
            </li>
            {#each f.lagene as l, i (l.lag)}
              {@const ny = nyFrist(g, l.dager)}
              <li>
                <Maalrad
                  navn={l.etikett ? stor(l.etikett) : FRISTEN.godkjent}
                  verdi={dager(l.dager)}
                  etter={ny ? FRISTEN.nyFrist(ny) : null}
                  andel={andel(l.dager)}
                  kompakt
                  sterk={false}
                  trinn={i === f.lagene.length - 1 ? trinn : []}
                />
              </li>
            {/each}
          </ul>
          {#if f.avslag}
            <p class="avslag">{FRISTEN.avslag(f.avslag.etikett, f.avslag.begrunnelse)}</p>
          {/if}
        </section>
      {/each}
      {#if !svart}<p class="ikke-svart">{FRISTEN.ikkeSvart}</p>{/if}
    </section>

    {#if k.forbehold && k.svarbrev}
      <Forbeholdet svarbrev={k.svarbrev} {u} {alle} {onforholdet} />
    {/if}
  </div>
</section>

<style>
  .kort {
    min-width: 0;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-1) var(--spacing-4);
    align-items: baseline;
    justify-content: space-between;
    padding: 18px var(--spacing-5) 0;
  }
  h2 {
    font-size: 16px;
    font-weight: 600;
  }
  .kilde {
    font-size: 12px;
    color: var(--ink-3);
  }
  .kropp {
    --steg: 25%;
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
  }
  .del + .del {
    margin-top: var(--spacing-5);
    padding-top: var(--spacing-5);
    border-top: var(--rule-subtle);
  }
  h3 {
    margin-bottom: var(--spacing-2);
    font-size: 15px;
    font-weight: 600;
  }
  .lag + .lag {
    margin-top: var(--spacing-3);
  }
  .lag p,
  .vilkaar,
  .dempet,
  .gjeldende,
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
  .gjeldende {
    margin-top: var(--spacing-1);
  }
  .gjeldende a {
    color: inherit;
  }
  .rader {
    display: grid;
    gap: var(--spacing-3);
    margin-top: var(--spacing-3);
  }
</style>
