<!--
  Skallet for brevkontrollen før TE sender (#711): tilbakeknappen, dokumentkolonnen og
  ApprovalPanel med bekreftelsen, i siden og ikke i et modalvindu. Brukerne leverer bare
  dokumentet og tekstene i panelet: Brevkontroll den låste teksten på TS-stien,
  ClaimLetterView brevet på Python-stien.
-->
<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte';
  import { ArrowLeft, Send } from 'lucide-svelte';
  import ApprovalPanel from './ApprovalPanel.svelte';

  let {
    tilbakeTekst,
    steg,
    panel,
    onsend,
    onavbryt,
    dokument,
  }: {
    tilbakeTekst: string;
    /** Navnet på redigeringssteget kontrollen går tilbake til. Uten det vises ingen fremdrift. */
    steg?: string;
    panel: Pick<
      ComponentProps<typeof ApprovalPanel>,
      'title' | 'description' | 'content' | 'confirmLabel' | 'primaryLabel' | 'footnote'
    >;
    onsend: () => void;
    onavbryt: () => void;
    dokument: Snippet;
  } = $props();
  let kontrollert = $state(false);
  // Brevet erstatter skjemaet i samme rullebeholder: start øverst.
  const tilToppen = (node: HTMLElement) => node.scrollIntoView?.({ block: 'start' });
</script>

<section class="brevskall" aria-label="Brevkontroll" use:tilToppen>
  <div class="verktoey">
    <button type="button" class="tekstknapp" onclick={onavbryt}
      ><ArrowLeft size={15} />{tilbakeTekst}</button
    >
    {#if steg}
      <ol class="steg" aria-label="Fremdrift">
        <li>1 <span>{steg}</span></li>
        <li class="gjeldende">2 <span>Kontroller og send</span></li>
      </ol>
    {/if}
  </div>
  <div class="oppsett">
    <div class="dokumentkolonne">
      {@render dokument()}
    </div>
    <aside>
      <ApprovalPanel
        eyebrow="Utkast · ikke sendt"
        {...panel}
        bind:confirmed={kontrollert}
        onprimary={onsend}
      >
        {#snippet primaryIcon()}<Send size={15} />{/snippet}
      </ApprovalPanel>
    </aside>
  </div>
</section>

<style>
  .brevskall {
    scroll-margin-top: var(--mockup-topbar-height, 0px);
    padding: 20px 32px 64px;
    color: var(--ink);
  }
  .verktoey {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 20px;
    max-width: 1180px;
    margin: 0 auto 24px;
  }
  .steg {
    display: flex;
    gap: 18px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    color: var(--ink-4);
  }
  .steg li {
    font-family: var(--font-data);
  }
  .steg span {
    font-family: var(--font-ui);
  }
  .steg .gjeldende {
    color: var(--ink);
    font-weight: 600;
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
  .dokumentkolonne {
    min-width: 0;
    overflow-x: auto;
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
    .brevskall {
      padding: 16px 12px 48px;
    }
  }
</style>
