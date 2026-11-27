<!--
  Siden for fristforlengelsen i oppsett B (BF-45, U-1 og U-14, som BF-44 U-16): hodet med overskriften
  og hjemmelen dempet etter, brevtråden med dagene for hver frist ved brevet med kravet (U-12),
  varselet med avstanden fra datoen TE oppgir (U-8), veiledningen under byggherrens forespørsel
  (U-9) og akseptfristen over handlingene ved byggherrens svar (U-11). Under tråden står kortet
  «Kravet og svaret» (U-2–U-5), eller kortet om kravet når dagene ikke er angitt (U-9).
-->
<script lang="ts">
  import Brevtraad from './Brevtraad.svelte';
  import Datolinjer from './Datolinjer.svelte';
  import Kravkort from './Kravkort.svelte';
  import Sporside from './Sporside.svelte';
  import KravetOgSvaretIFristen from './KravetOgSvaretIFristen.svelte';
  import Melding from './Melding.svelte';
  import {
    brevITraaden,
    brevMedUtsagn,
    brevene,
    eldreKravISporet,
    klarOverForholdet,
    oppfoelgingene,
    type Brevet,
    type Sideprops,
    sendtSammeDag,
  } from './lesing';
  import { FRISTEN, dagensDato, kalenderdager } from './tekster';
  import { kravdagene, kravetOgSvaretIFristen } from './fristoversikt';
  import { akseptfristen } from '#lib/kjernesak/kontekst.svelte.ts';

  let {
    u,
    betegnelser,
    fristtabell = { datoer: [] },
    vist = null,
    smal = false,
    onles,
    onspor,
    handlingerVed = [],
    handling,
    brevet,
    traadlenkene,
    merknad,
  }: Sideprops = $props();

  const alle = $derived(brevene(u));
  const traad = $derived(brevITraaden(alle, 'frist'));
  const k = $derived(kravetOgSvaretIFristen(u, alle));
  const dagene = $derived(kravdagene(u));
  const eldreKrav = $derived(eldreKravISporet(u, 'frist', alle));
  const akseptfrist = $derived(akseptfristen(u, 'frist'));
  const varsel = $derived(u.spor.frist.varsler['33.4'] ?? null);
  const klar = $derived(klarOverForholdet(u));
  // Forespørselen etter punkt 33.6.2 som ikke er besvart, med brevet den står i (U-9, D-10).
  const foresporsel = $derived.by(() => {
    const f = u.spor.frist.foresporsler.findLast((x) => x.svar === null);
    return f ? brevMedUtsagn(u, f.foresporsel) : null;
  });
  const varselbrev = $derived(varsel ? (alle.find((b) => b.id === varsel.dokument) ?? null) : null);
</script>

<!-- Dagene for hver frist ved brevet med kravet (U-12), og varselet uten dager (U-8). -->
{#snippet oeverst(b: Brevet)}
  {@const frister = dagene.get(b.id)}
  {#if frister}
    <p class="kravtall">{FRISTEN.kravdagene(frister)}</p>
  {:else if varsel?.dokument === b.id && b.art !== 'registrert'}
    <p class="kravtall">{FRISTEN.varselUtenDager}</p>
  {/if}
{/snippet}

<!-- Datoen under brevet med varselet, veiledningen under forespørselen og akseptfristen over
     handlingene ved byggherrens svar (U-8, U-9, U-11, HF-U23 punkt 4). -->
{#snippet nederst(b: Brevet)}
  {#if foresporsel?.id === b.id}
    <Melding art="info" levende={false}>
      {FRISTEN.foresporsel(b.registrert, kalenderdager(b.registrert, dagensDato()))}
    </Melding>
  {/if}
  <Datolinjer {b} {klar} varselbrev={varsel?.dokument ?? null} {akseptfrist} />
{/snippet}

<Sporside tittel={FRISTEN.tittel} hjemmel={FRISTEN.hjemmel} siste={traad.at(-1)} {merknad}>
  <Brevtraad
    brev={traad}
    {traadlenkene}
    spor="frist"
    fulgtOpp={oppfoelgingene(u, alle)}
    {eldreKrav}
    dokumentasjon={u.ikkeVurderteBrev}
    sammeDag={sendtSammeDag(u)}
    venterPaaSvar={betegnelser.frist === 'venter_paa_svar'}
    {oeverst}
    {nederst}
    {vist}
    {smal}
    {onles}
    {handlingerVed}
    {handling}
    {brevet}
  />
</Sporside>

{#if k}
  <KravetOgSvaretIFristen
    {k}
    {u}
    {alle}
    {fristtabell}
    onforholdet={onspor && (() => onspor('forhold'))}
  />
{:else if varselbrev}
  <Kravkort tittel={FRISTEN.utenKrav}>
    <p class="ikke-angitt">{FRISTEN.ikkeAngitt(varselbrev)}</p>
  </Kravkort>
{/if}

<style>
  .ikke-angitt {
    font-size: 14px;
    color: var(--ink-2);
  }
</style>
