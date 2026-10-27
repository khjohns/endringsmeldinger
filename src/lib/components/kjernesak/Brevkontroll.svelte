<!--
  Brevkontrollen på TS-stien (#666, #667): den låste teksten kjernen lager for kravet, og
  TEs utdypning under. Kommandoen bærer den samme teksten, og serveren avviser en
  annen (LV-U2). Teksten rettes i skjemaet, ikke her.
-->
<script lang="ts">
  import Brevskall from '$lib/components/approval/Brevskall.svelte';
  import type { Kjernebrev } from '$lib/kjernesak/kravkontroll.svelte';

  import type { Snippet } from 'svelte';

  let {
    brev,
    beskrivelse,
    merknad,
    onbekreft,
    onavbryt,
  }: {
    /** Brevet som vises, og som avkrysningen gjelder: endres det, krysses det av på nytt (#864). */
    brev: Kjernebrev;
    /** Det som skjer når TE bekrefter, i panelet ved siden av brevet. */
    beskrivelse: string;
    /** Det som står over brevet i dokumentkolonnen, og ikke i brevteksten. */
    merknad?: Snippet;
    onbekreft: () => void;
    onavbryt: () => void;
  } = $props();
</script>

<Brevskall
  brev={JSON.stringify(brev)}
  tilbakeTekst="Tilbake til skjemaet"
  panel={{
    title: brev.handling ?? 'Du sender kravet',
    description: beskrivelse,
    confirmLabel: 'Jeg har kontrollert brevet.',
    primaryLabel: brev.sendes ?? 'Send til byggherren',
    footnote: 'Innsendt brev kan ikke endres, bare følges opp med en ny versjon.',
  }}
  onsend={onbekreft}
  {onavbryt}
>
  {#snippet dokument()}
    {@render merknad?.()}
    <article class="dokument">
      <h2>{brev.tittel}</h2>
      <p class="hjelp">Teksten lages av appen fra valgene i skjemaet og kan ikke endres her.</p>
      <div data-testid="laast-tekst">
        {#each brev.tekst as avsnitt, i (i)}<p>{avsnitt}</p>{/each}
      </div>
      {#if brev.utdypning}
        <h3>Utdypning</h3>
        <p class="utdypning" data-testid="utdypning">{brev.utdypning}</p>
      {/if}
    </article>
  {/snippet}
</Brevskall>

<style>
  .dokument {
    padding: 28px 32px;
    border: var(--rule);
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
