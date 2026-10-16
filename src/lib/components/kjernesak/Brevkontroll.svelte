<!--
  Brevkontrollen på TS-stien (#666): den låste teksten kjernen lager for kravet, og
  TEs utdypning under. Kommandoen bærer den samme teksten, og serveren avviser en
  annen (LV-U2). Teksten rettes i skjemaet, ikke her.
-->
<script lang="ts">
  import { ArrowLeft, Send } from 'lucide-svelte';
  import ApprovalPanel from '$lib/components/approval/ApprovalPanel.svelte';

  let {
    tekst,
    utdypning,
    sakstittel,
    onbekreft,
    onavbryt,
  }: {
    /** De låste avsnittene, i rekkefølgen kommandoen bærer dem. */
    tekst: string[];
    utdypning?: string;
    sakstittel: string;
    onbekreft: () => void;
    onavbryt: () => void;
  } = $props();
  let kontrollert = $state(false);
  const tilToppen = (node: HTMLElement) => node.scrollIntoView?.({ block: 'start' });
</script>

<section class="brevkontroll" aria-label="Brevkontroll" use:tilToppen>
  <div class="verktoey">
    <button type="button" class="tekstknapp" onclick={onavbryt}
      ><ArrowLeft size={15} />Tilbake til skjemaet</button
    >
  </div>
  <div class="oppsett">
    <article class="dokument">
      <h2>Grunnlag – {sakstittel}</h2>
      <p class="hjelp">Teksten lages av appen fra valgene i skjemaet og kan ikke endres her.</p>
      <div data-testid="laast-tekst">
        {#each tekst as avsnitt, i (i)}<p>{avsnitt}</p>{/each}
      </div>
      {#if utdypning}
        <h3>Utdypning</h3>
        <p class="utdypning" data-testid="utdypning">{utdypning}</p>
      {/if}
    </article>
    <aside>
      <ApprovalPanel
        eyebrow="Utkast · ikke sendt"
        title="Du sender kravet"
        description="Saken er opprettet. Kravet sendes først når du bekrefter."
        confirmLabel="Jeg har kontrollert brevet."
        bind:confirmed={kontrollert}
        primaryLabel="Send til byggherren"
        onprimary={onbekreft}
        footnote="Innsendt brev kan ikke endres, bare følges opp med en ny versjon."
      >
        {#snippet primaryIcon()}<Send size={15} />{/snippet}
      </ApprovalPanel>
    </aside>
  </div>
</section>

<style>
  .brevkontroll {
    padding: 20px 32px 64px;
    color: var(--ink);
  }
  .verktoey {
    max-width: 1180px;
    margin: 0 auto 24px;
  }
  .tekstknapp {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    padding: 8px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    border-radius: 8px;
  }
  .tekstknapp:hover {
    background: var(--surface-inset);
    color: var(--ink);
  }
  .tekstknapp:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  .oppsett {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 28px;
    max-width: 1180px;
    margin: 0 auto;
    align-items: start;
  }
  .dokument {
    min-width: 0;
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
  @media (max-width: 1000px) {
    .oppsett {
      grid-template-columns: 1fr;
    }
    aside :global(.approval-panel) {
      position: static;
    }
  }
  @media (max-width: 600px) {
    .brevkontroll {
      padding: 16px 12px 48px;
    }
  }
</style>
