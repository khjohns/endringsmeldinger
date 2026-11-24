<!--
  Kortet «Kravet og svaret» på siden for vederlaget (BF-44, U-2–U-4, U-13 og U-14): målestokken
  med kravet åpent og det byggherren godkjenner i hvert lag fylt, vilkåret og det laget bygger på
  ved beløpet, tabellen per post slik brevet har den, og forbeholdet én gang. Regningsarbeid står
  som liste. Tallene og standpunktene er de byggherren sendte i brevet (MM-U50).
-->
<script lang="ts">
  import { brevMedUtsagn, type Brevet } from './lesing';
  import { kroner } from '#kjerne/frosset/tekst.ts';
  import Forbeholdet from './Forbeholdet.svelte';
  import Kravkort from './Kravkort.svelte';
  import Maalrad, { maalestokken } from './Maalrad.svelte';
  import { utenKr, VEDERLAGET } from './tekster';
  import { postIRaden, type KravetOgSvaret } from './vederlagsoversikt';
  import type { Utledning } from '#kjerne/utledning/utled.ts';

  let {
    k,
    u,
    alle,
    onforholdet,
  }: {
    k: KravetOgSvaret;
    u: Utledning;
    /** Brevene i saken (`brevene(u)`). */
    alle: Brevet[];
    /** Brukeren går til siden for forholdet fra forbeholdet (U-3). */
    onforholdet?: () => void;
  } = $props();
  const uid = $props.id();

  const regning = $derived(k.poster.filter((p) => p.oppgjoersform === 'regningsarbeid'));
  const fast = $derived(k.poster.filter((p) => p.oppgjoersform !== 'regningsarbeid'));
  // Tabellen slik brevet har den (U-14, OV-U73), og uten tabell i brevet postene i kravet (U-4).
  const tabellen = $derived.by(() => {
    if (k.tabell) {
      const [kolonner, ...rader] = k.tabell;
      return {
        kolonner,
        rader: rader.map((celler, r) => ({
          celler,
          post: postIRaden(k, r),
          sum: r === rader.length - 1,
        })),
      };
    }
    if (!fast.length) return null;
    return {
      kolonner: [VEDERLAGET.post, VEDERLAGET.krevd],
      rader: fast.map((p) => ({
        celler: [p.navn, p.krevd === null ? '' : kroner(p.krevd)],
        post: p,
        sum: false,
      })),
    };
  });
  const stoerst = $derived(Math.max(k.krevd ?? 0, ...k.lagene.map((l) => l.beloep ?? 0)));
  const { trinn, andel, steg, ende } = $derived(maalestokken(stoerst, true));
  const sist = $derived(k.lagene.findLast((l) => l.beloep !== null));
  const avstand = $derived(k.krevd !== null && sist?.beloep != null ? k.krevd - sist.beloep : 0);
  // Byggherrens standpunkt til oppgjørsformen for en kravpost med regningsarbeid (U-13).
  const formen = (kravpost: string) =>
    k.lagene
      .flatMap((l) => l.standpunkter)
      .find((s) => s.standpunkt.art === 'oppgjoersform' && s.standpunkt.gjelder === kravpost)
      ?.standpunkt;
</script>

<Kravkort tittel={VEDERLAGET.kortet} kilde={VEDERLAGET.kilde(k.kravbrev, k.svarbrev)}>
  {#if k.krevd !== null}
    <div class="maalestokk" style:--steg={steg}>
      <div>
        <Maalrad
          navn={VEDERLAGET.krever}
          verdi={kroner(k.krevd)}
          andel={andel(k.krevd)}
          aapen={k.kravbrev.avsender === 'TE'}
          trinn={k.lagene.length ? [] : trinn}
          {ende}
        />
      </div>
      {#if k.lagene.length}
        <!-- Hvert lag sier «Byggherren godkjenner» ved beløpet, så navnet på lista er for skjermleseren. -->
        <p class="visually-hidden" id={`${uid}-lag`}>{VEDERLAGET.godkjenner}</p>
        <ul class="lagene" aria-labelledby={`${uid}-lag`}>
          {#each k.lagene as l, i (l.lag)}
            <li>
              {#if l.vilkaar.length}<p class:dempet={i > 0}>
                  {VEDERLAGET.lagetVilkaar(l.vilkaar, l.heller)}
                </p>{/if}
              {#each VEDERLAGET.laget(l) as tekst, j (j)}<p class:dempet={i > 0}>{tekst}</p>{/each}
              <Maalrad
                navn={l.beloep === null ? '' : VEDERLAGET.godkjenner}
                verdi={l.beloep === null ? null : kroner(l.beloep)}
                andel={l.beloep === null ? null : andel(l.beloep)}
                aapen={k.svarbrev?.avsender === 'TE'}
                dempet={i > 0}
                trinn={i === k.lagene.length - 1 ? trinn : []}
                {ende}
              />
            </li>
          {/each}
        </ul>
      {:else}
        <p class="ikke-svart">{VEDERLAGET.ikkeSvart}</p>
      {/if}
    </div>
    {#if k.lagene.length && avstand > 0}
      <p class="gap">
        {VEDERLAGET.skiller(avstand, k.lagene.length > 1)}
        {VEDERLAGET.eksMva}
      </p>
    {/if}
  {/if}

  {#if tabellen}
    <!-- Tabellen kan rulles på smal skjerm, så rammen kan få fokus med tastaturet (WCAG 2.1.1). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="tabell"
      role="region"
      aria-labelledby={`${uid}-perpost`}
      tabindex="0"
      style:--kolonner={tabellen.kolonner.length - 1}
    >
      <!-- Rollene står i markeringen, så tabellen beholder dem når radene blir rutenett på smal
             skjerm (WCAG 1.3.1). -->
      <!-- svelte-ignore a11y_no_redundant_roles -->
      <table role="table">
        <caption id={`${uid}-perpost`}>{VEDERLAGET.perPost}</caption>
        <!-- svelte-ignore a11y_no_redundant_roles -->
        <thead role="rowgroup">
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <tr role="row"
            >{#each tabellen.kolonner as c, m (m)}<th
                scope="col"
                role="columnheader"
                class:krevdkol={m === 1}>{c}</th
              >{/each}</tr
          >
        </thead>
        <!-- svelte-ignore a11y_no_redundant_roles -->
        <tbody role="rowgroup">
          {#each tabellen.rader as { celler, post, sum }, r (r)}
            <!-- svelte-ignore a11y_no_redundant_roles -->
            <tr role="row" class:sum>
              <th scope="row" role="rowheader"
                >{celler[0]}{#if post}<span class="hj"
                    >{VEDERLAGET.oppgjoersform(post.oppgjoersform)}</span
                  >{#if post.innsigelser.length}<span class="hj"
                      >{VEDERLAGET.postvilkaar(post.innsigelser)}</span
                    >{/if}{/if}</th
              >
              {#each celler.slice(1) as c, m (m)}
                <td role="cell" class:krevdkol={m === 0}>{utenKr(c)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#each regning as p (p.navn)}
    {@const s = p.kravpost ? formen(p.kravpost.id) : undefined}
    {@const varsel = p.kravpost?.varsel ? brevMedUtsagn(u, p.kravpost.varsel) : null}
    <dl class="fakta">
      <div>
        <dt>{VEDERLAGET.regning.oppgjoersform}</dt>
        <dd>
          <b>{VEDERLAGET.regning.regningsarbeid}</b>
          {#if s?.art === 'oppgjoersform' && k.svarbrev}{s.aksepterer
              ? VEDERLAGET.regning.godkjent(k.svarbrev)
              : VEDERLAGET.regning.ikkeGodkjent(k.svarbrev)}{/if}
        </dd>
      </div>
      {#if varsel}
        <div>
          <dt>{VEDERLAGET.regning.varsel}</dt>
          <dd>{VEDERLAGET.regning.varselet(varsel)}</dd>
        </div>
      {/if}
      {#if p.kravpost?.kostnadsoverslag !== undefined}
        <div>
          <dt>{VEDERLAGET.regning.overslag}</dt>
          <dd>{VEDERLAGET.regning.overslaget(p.kravpost.kostnadsoverslag, k.kravbrev)}</dd>
        </div>
      {/if}
    </dl>
  {/each}

  {#if k.forbehold && k.svarbrev}
    <Forbeholdet svarbrev={k.svarbrev} {u} {alle} {onforholdet} />
  {/if}
</Kravkort>

<style>
  /* Kravet er åpent og det godkjente fylt, som ringene i tråden (U-2). */
  .maalestokk {
    --steg: 25%;
    display: grid;
    gap: var(--spacing-4);
    margin-top: var(--spacing-1);
  }
  .lagene {
    padding-top: var(--spacing-3);
    border-top: var(--rule-subtle);
    display: grid;
    gap: var(--spacing-4);
  }
  .lagene p {
    color: var(--ink);
  }
  .lagene p.dempet {
    color: var(--ink-3);
  }
  .lagene p,
  .gap,
  .ikke-svart {
    margin-top: 6px;
    font-size: 14px;
  }
  .gap,
  .ikke-svart {
    color: var(--ink-2);
  }
  .gap {
    margin-top: var(--spacing-5);
  }
  .tabell {
    margin-top: var(--spacing-6);
    overflow-x: auto;
  }
  .tabell:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  caption {
    padding-bottom: 2px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  th,
  td {
    padding: 10px 0 10px var(--spacing-4);
    text-align: right;
    vertical-align: top;
    border-bottom: var(--rule-subtle);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  th:first-child {
    padding-left: 0;
    text-align: left;
    white-space: normal;
  }
  thead th {
    font-weight: 600;
    border-bottom: 1px solid var(--rule-strong-color);
    vertical-align: bottom;
    line-height: 1.3;
  }
  tbody th {
    font-weight: 400;
  }
  .hj {
    display: block;
    font-size: 12px;
    color: var(--ink-3);
  }
  tr.sum th,
  tr.sum td {
    font-weight: 600;
    border-bottom: 0;
    border-top: 1px solid var(--rule-strong-color);
  }
  .krevdkol {
    color: var(--ink-2);
  }
  .fakta {
    display: grid;
    gap: var(--spacing-2);
    font-size: 14px;
  }
  .fakta + .fakta {
    margin-top: var(--spacing-4);
    padding-top: var(--spacing-4);
    border-top: var(--rule-subtle);
  }
  .fakta div {
    display: grid;
    grid-template-columns: 13rem minmax(0, 1fr);
    gap: var(--spacing-1) var(--spacing-4);
  }
  .fakta dt {
    color: var(--ink-2);
  }
  .fakta b {
    font-weight: 600;
  }
  /* Smal skjerm: posten står over beløpene sine, så alle lagene er synlige uten vannrett rulling. */
  @media (max-width: 720px) {
    .tabell tr {
      display: grid;
      grid-template-columns: repeat(var(--kolonner), minmax(0, 1fr));
      column-gap: var(--spacing-2);
    }
    .tabell thead,
    .tabell tbody {
      display: block;
    }
    .tabell th,
    .tabell td {
      padding: 0 0 10px;
      border-bottom: 0;
    }
    .tabell thead th {
      font-size: 12px;
      padding-bottom: 6px;
      white-space: normal;
    }
    /* «Post» står for skjermleseren; posten står over beløpene sine. */
    .tabell thead th:first-child {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .tabell tbody th {
      grid-column: 1 / -1;
      padding: 10px 0 var(--spacing-1);
    }
    .tabell thead tr {
      border-bottom: 1px solid var(--rule-strong-color);
    }
    .tabell tbody tr {
      border-bottom: var(--rule-subtle);
    }
    .tabell tr.sum th,
    .tabell tr.sum td {
      border-top: 0;
    }
    .fakta div {
      grid-template-columns: 1fr;
    }
  }
</style>
