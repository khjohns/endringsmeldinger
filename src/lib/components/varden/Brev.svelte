<!--
  Brevet som lesespalte (Varden, skjerm C og D). Hodet følger `godkjenning-vederlagssvar.html:276-283`
  og LV-U23 så langt løsningen har opplysningene: avsender med organisasjon og part, mottakeren,
  referansene og datoen. Referansene står på faste plasser som i Oslo kommunes brevmal
  (system.md, «Typografi»), ikke i rekkefølgen i prototypen. Et sendt brev har stempelet «Sendt …». Teksten kommer fra kjernen,
  som frosset tekst i et sendt brev eller som låst tekst før sending. Visningen endrer den ikke.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Avsnitt, Part } from '$kjerne/typer';
  import { cellene, erKravpostpunkt, erLagslinje, OVERSIKTEN } from '$kjerne/frosset/tekst';
  import { organisasjonene } from './kontrakt';
  import { MOTTATT, PARTNAVN } from './tekster';

  let {
    avsender,
    sak,
    merking,
    deresRef = [],
    dato,
    tittel,
    avsnitt,
    sendt,
    fot,
    innfelt = false,
    hode = true,
    dempet = false,
  }: {
    avsender: Part;
    sak: string;
    /** Vår ref., merkingen kjernen fryser (LV-U53, LV-U27). Uten den står ingen «Vår ref.». */
    merking: string | null;
    /**
     * Deres ref., kodene kjernen fryser, én per linje (LV-U27, LV-U49, U-2 i BF-07). Uten koder
     * står ingen «Deres ref.» (U-3).
     */
    deresRef?: string[];
    dato: string;
    tittel: string;
    /** Avsnittene kjernen lager. Et punkt med overskrift har den først i `laast` (#1824). */
    avsnitt: Pick<Avsnitt, 'laast' | 'punkt' | 'overskrift' | 'utdypning'>[];
    /** Tidspunktet brevet ble sendt. Bare et sendt brev har stempelet. */
    sendt?: string;
    fot?: Snippet;
    /** Brevet står i en ramme som har kanten, som ved lesing ved siden av. */
    innfelt?: boolean;
    /**
     * Partene og referansene øverst. Uten dem står bare tittelen og teksten, der raden over
     * brevet allerede sier hvem som sendte det og når (lesepanelet i BF-10).
     */
    hode?: boolean;
    /** Tittelen ett hakk ned, når brevet leses ved siden av et utkast og raden over navngir det. */
    dempet?: boolean;
  } = $props();

  const mottaker = $derived<Part>(avsender === 'TE' ? 'BH' : 'TE');
  const hentOrganisasjoner = organisasjonene();
  const organisasjoner = $derived(hentOrganisasjoner());
  const stor = (s: string) => s[0].toUpperCase() + s.slice(1);

  /**
   * Avsnittene i et punkt, uten overskriften, som står først i den låste delen. Står den ikke
   * først, vises hele den låste delen, så ingen tekst faller bort.
   */
  const underOverskriften = (a: Pick<Avsnitt, 'laast' | 'overskrift'>): string[] =>
    (a.overskrift && a.laast.startsWith(a.overskrift)
      ? a.laast.slice(a.overskrift.length).trimStart()
      : a.laast
    )
      .split('\n\n')
      .filter((del) => del !== '');
</script>

<article class="brev" class:innfelt class:dempet class:bh={avsender === 'BH'} aria-label={tittel}>
  {#if hode}<header class="hode">
      <div class="topp">
        <p class="avsender">
          <b>{organisasjoner[avsender] ?? stor(PARTNAVN[avsender])}</b>
          {#if organisasjoner[avsender]}<span>{stor(PARTNAVN[avsender])}</span>{/if}
        </p>
        {#if sendt}<span class="stempel" data-testid="stempel">{MOTTATT.sendtMerke(sendt)}</span
          >{/if}
      </div>
      <p class="mottaker">
        {#if organisasjoner[mottaker]}{organisasjoner[mottaker]}<br />{/if}{stor(
          PARTNAVN[mottaker]
        )}
      </p>
      <dl class="ref">
        <div class="sak">
          <dt>Sak:</dt>
          <dd>{sak}</dd>
        </div>
        {#if deresRef.length}<div class="deres">
            <dt>Deres ref.:</dt>
            <dd data-testid="deres-ref">
              {#each deresRef as kode, i (i)}{#if i}<br />{/if}{kode}{/each}
            </dd>
          </div>{/if}
        {#if merking !== null}<div class="vaar">
            <dt>Vår ref.:</dt>
            <dd data-testid="vaar-ref">{merking}</dd>
          </div>{/if}
        <div class="dato">
          <dt>Dato:</dt>
          <dd>{dato}</dd>
        </div>
      </dl>
    </header>{/if}
  <h2>{tittel}</h2>
  <div class="tekst" data-testid="laast-tekst">
    {#each avsnitt as a, i (i)}
      {#if a.punkt !== undefined}
        {#if a.overskrift}<h3>{a.overskrift}</h3>{/if}
        {#if a.punkt === OVERSIKTEN}
          {#each underOverskriften(a) as del, k (k)}
            {@const [kolonner, ...rader] = cellene(del)}
            <!-- Tabellen kan rulles på smal skjerm, så rammen kan få fokus med tastaturet (WCAG 2.1.1). -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div class="tabell" role="region" aria-label={a.overskrift} tabindex="0">
              <table>
                <thead>
                  <tr
                    >{#each kolonner as c, m (m)}<th scope="col">{c}</th>{/each}</tr
                  >
                </thead>
                <tbody>
                  {#each rader as rad, r (r)}
                    <tr class:sum={r === rader.length - 1}>
                      {#each rad as c, m (m)}
                        {#if m === 0}<th scope="row">{c}</th>{:else}<td>{c}</td>{/if}
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/each}
        {:else}
          {#each underOverskriften(a) as del, k (k)}
            {#if erLagslinje(del)}
              {@const [etikett, ...vilkaar] = del.split(', ')}
              <p class="lagslinje">
                <b>{etikett}</b>{vilkaar.length ? `, ${vilkaar.join(', ')}` : ''}
              </p>
            {:else if k === 0 && erKravpostpunkt(a.punkt) && del.startsWith(`${a.punkt} `)}
              <p class="postlinje"><b>{a.punkt}</b>{del.slice(a.punkt!.length)}</p>
            {:else}
              <p>{del}</p>
            {/if}
          {/each}
        {/if}
      {:else}
        <p>{a.laast}</p>
      {/if}
      {#if a.utdypning}<p class="utdypning" data-testid="utdypning">{a.utdypning}</p>{/if}
    {/each}
  </div>
  {#if fot}<footer class="fot">{@render fot()}</footer>{/if}
</article>

<style>
  .brev {
    max-width: var(--varden-ark);
    padding: 28px var(--spacing-10) 36px;
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    font-family: var(--font-brev);
    font-size: 16px;
    color: var(--ink);
    line-height: 1.6;
  }
  /* Oslo Sans i 11 pt har samme x-høyde som Source Serif 4 i 16 px (system.md, «Typografi»). */
  .brev.bh {
    font-family: var(--font-brev-bh);
    font-size: 11pt;
  }
  .brev.innfelt {
    padding: var(--spacing-6);
    border: 0;
    border-radius: 0;
  }
  .hode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5);
    padding-bottom: var(--spacing-6);
    margin-bottom: var(--spacing-6);
    border-bottom: var(--rule);
  }
  .topp {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-3);
  }
  .avsender {
    display: flex;
    flex-direction: column;
  }
  .avsender b {
    font-size: 16px;
    font-weight: 600;
  }
  .avsender span {
    color: var(--ink-3);
    font-size: 12px;
  }
  .stempel {
    font-family: var(--font-sans);
    padding: 2px var(--spacing-2);
    border: 1px solid var(--ink);
    border-radius: var(--r-merke);
    color: var(--ink);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  /* Faste plasser (system.md, «Typografi»). Et felt som mangler, står tomt. */
  .ref {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'sak deres'
      'vaar dato';
    gap: var(--spacing-3) var(--spacing-5);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .ref .sak {
    grid-area: sak;
  }
  .ref .deres {
    grid-area: deres;
  }
  .ref .vaar {
    grid-area: vaar;
  }
  .ref .dato {
    grid-area: dato;
  }
  .ref dd {
    overflow-wrap: anywhere;
  }
  .ref dt {
    color: var(--ink-3);
  }
  h2 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: var(--spacing-4);
  }
  /* Samme størrelse som brødteksten hos begge parter; vekten bærer tittelen (oppdragsgiver 07.11, #1659). */
  .dempet h2 {
    font-size: 1em;
    margin-bottom: var(--spacing-3);
  }
  .tekst p {
    white-space: pre-line;
  }
  .tekst p + p {
    margin-top: var(--spacing-3);
  }
  /* Overskriften i et punkt har brødtekstens størrelse; vekten bærer den, som tittelen i et dempet brev. */
  .tekst h3 {
    font-size: 1em;
    font-weight: 600;
    line-height: 1.3;
    margin-top: var(--spacing-5);
    margin-bottom: var(--spacing-2);
  }
  .tekst h3:first-child {
    margin-top: 0;
  }
  /* I et dempet brev har tittelen samme størrelse og vekt; fargen skiller punktene fra den. */
  .dempet .tekst h3 {
    color: var(--ink-2);
  }
  .tekst .utdypning {
    white-space: pre-wrap;
  }
  /* Lagslinjen står over standpunktet i laget (LV-U34); etiketten bærer vekten. */
  .tekst .lagslinje {
    color: var(--ink-3);
    font-size: 0.875em;
  }
  .tekst .lagslinje b {
    color: var(--ink);
    font-weight: 600;
  }
  .tekst .lagslinje + p {
    margin-top: var(--spacing-1);
  }
  /* Kravposten med betegnelsen og en venstrelinje, som i prototype v4 i BF-14 (#1849). */
  .tekst .postlinje {
    padding-left: var(--spacing-3);
    border-left: 2px solid var(--rule-strong-color);
  }
  .tekst .postlinje b {
    font-weight: 600;
  }
  .tabell {
    overflow-x: auto;
    margin-top: var(--spacing-2);
  }
  .tabell:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .tabell table {
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  .tabell th,
  .tabell td {
    padding: var(--spacing-1) var(--spacing-3);
    border-bottom: var(--rule);
    text-align: right;
    white-space: nowrap;
  }
  .tabell th[scope='row'],
  .tabell th:first-child {
    text-align: left;
    padding-left: 0;
  }
  .tabell thead th {
    font-weight: 600;
  }
  .tabell th[scope='row'] {
    font-weight: 400;
  }
  .tabell tr.sum > * {
    font-weight: 600;
    border-top: 1px solid var(--ink-3);
    border-bottom: 0;
  }
  .fot {
    margin-top: var(--spacing-8);
    padding-top: var(--spacing-4);
    border-top: var(--rule);
    color: var(--ink-3);
    font-family: var(--font-sans);
    font-size: 14px;
  }
  @media (max-width: 860px) {
    .brev {
      padding: var(--spacing-5) var(--spacing-4) 28px;
    }
  }
</style>
