<!--
  Brevkontrollen på TS-stien (#666, #667): den låste teksten kjernen lager for kravet, og
  TEs utdypning under. Kommandoen bærer den samme teksten, og serveren avviser en
  annen (LV-U2). Teksten rettes i skjemaet, ikke her.
-->
<script lang="ts">
  import Brevskall from '$lib/components/approval/Brevskall.svelte';

  let {
    tekst,
    utdypning,
    tittel,
    beskrivelse,
    onbekreft,
    onavbryt,
  }: {
    /** De låste avsnittene, i rekkefølgen kommandoen bærer dem. */
    tekst: string[];
    utdypning?: string;
    /** Brevets overskrift, som «Grunnlag – sakstittel». */
    tittel: string;
    /** Det som skjer når TE bekrefter, i panelet ved siden av brevet. */
    beskrivelse: string;
    onbekreft: () => void;
    onavbryt: () => void;
  } = $props();
</script>

<Brevskall
  brev={JSON.stringify([tittel, tekst, utdypning ?? null])}
  tilbakeTekst="Tilbake til skjemaet"
  panel={{
    title: 'Du sender kravet',
    description: beskrivelse,
    confirmLabel: 'Jeg har kontrollert brevet.',
    primaryLabel: 'Send til byggherren',
    footnote: 'Innsendt brev kan ikke endres, bare følges opp med en ny versjon.',
  }}
  onsend={onbekreft}
  {onavbryt}
>
  {#snippet dokument()}
    <article class="dokument">
      <h2>{tittel}</h2>
      <p class="hjelp">Teksten lages av appen fra valgene i skjemaet og kan ikke endres her.</p>
      <div data-testid="laast-tekst">
        {#each tekst as avsnitt, i (i)}<p>{avsnitt}</p>{/each}
      </div>
      {#if utdypning}
        <h3>Utdypning</h3>
        <p class="utdypning" data-testid="utdypning">{utdypning}</p>
      {/if}
    </article>
  {/snippet}
</Brevskall>

<style>
  .dokument {
    padding: 28px 32px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    line-height: 1.6;
  }
  .dokument h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  .dokument h3 {
    margin: 24px 0 6px;
    font-size: 14px;
  }
  .hjelp {
    margin: 0 0 20px;
    color: var(--ink-3);
    font-size: 12px;
  }
  .utdypning {
    white-space: pre-wrap;
  }
</style>
