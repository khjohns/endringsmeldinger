<!--
  Arket mens brevet skrives, med sammenfoldet brevhode og utkaststempel (system.md, #2178).
  Brevkontrollen viser hele brevhodet når avsenderen har fylt ut skjemaet.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Part } from '#kjerne/typer.ts';
  import { PARTEN } from '#kjerne/frosset/brevdeler.ts';
  import Utkaststempel from './Utkaststempel.svelte';

  let {
    id,
    tittel,
    saken = null,
    avsender,
    nummer = null,
    merking = null,
    nivaa = 2,
    novalidate = false,
    sendes = true,
    merke,
    onsubmit,
    referanse,
    leselenke,
    children,
  }: {
    id: string;
    tittel: string;
    /** Saken tittelen slutter med, som «sak KOE-17» (`utkastetsHode`). */
    saken?: string | null;
    avsender: Part;
    nummer?: number | null;
    merking?: string | null;
    nivaa?: 1 | 2;
    novalidate?: boolean;
    sendes?: boolean;
    /** Stempelet når brevet ikke sendes herfra, som «Utkast · ikke lagt til». */
    merke?: string;
    onsubmit?: () => void;
    referanse?: Snippet;
    leselenke?: Snippet;
    children: Snippet;
  } = $props();
  const mottaker = $derived(PARTEN[avsender === 'TE' ? 'BH' : 'TE']);
  // Saken («sak KOE-1») brytes ikke, heller ikke ved bindestreken (#2359).
  const tittelen = $derived(
    saken && tittel.endsWith(saken)
      ? [
          { del: tittel.slice(0, -saken.length), saksnummer: false },
          { del: saken, saksnummer: true },
        ]
      : [{ del: tittel, saksnummer: false }]
  );
</script>

<form
  class="utkast"
  aria-labelledby={id}
  {novalidate}
  onsubmit={(e) => {
    e.preventDefault();
    onsubmit?.();
  }}
>
  <header class="utkasthode">
    <div class="tittelrad">
      <svelte:element
        this={`h${nivaa}`}
        class="tittel"
        class:bh={avsender === 'BH'}
        {id}
        tabindex="-1"
      >
        {#each tittelen as t, i (i)}{#if t.saksnummer}<span class="saksnummer">{t.del}</span
            >{:else}{t.del}{/if}{/each}
      </svelte:element>
      <Utkaststempel tekst={merke} />
    </div>
    <div class="referanser">
      <div class="referansetekst">
        {#if sendes}<span>{nummer === null ? 'Brev' : `Brev ${nummer}`} til {mottaker}</span>{/if}
        {@render referanse?.()}
        {#if sendes}
          {#if merking}<span>Vår ref. {merking}</span>{/if}
          <span>Datoen settes ved sending</span>
        {/if}
      </div>
      {#if leselenke}
        <div class="leselenke">{@render leselenke()}</div>
      {/if}
    </div>
  </header>
  {@render children()}
</form>

<style>
  .utkast {
    background: var(--surface);
    border: 1px dashed var(--draft);
    border-radius: var(--r-kort);
  }
  .utkasthode {
    padding: var(--spacing-5) var(--spacing-6);
    border-bottom: var(--rule);
  }
  .tittelrad {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    column-gap: var(--spacing-4);
  }
  .tittel {
    margin: 0;
    font: 600 20px / 1.3 var(--font-brev);
    overflow-wrap: anywhere;
  }
  .saksnummer {
    white-space: nowrap;
  }
  .tittel.bh {
    font-family: var(--font-brev-bh);
  }
  .tittel:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .referanser {
    display: flex;
    align-items: baseline;
    gap: 0 var(--spacing-4);
    margin-top: var(--spacing-2);
    color: var(--ink-3);
    font-size: 13px;
  }
  .referansetekst {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 var(--spacing-4);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .leselenke {
    flex: none;
    margin-inline-start: auto;
  }
  @media (max-width: 640px) {
    .referanser {
      flex-wrap: wrap;
    }
    .referansetekst {
      width: 100%;
    }
    .tittelrad {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--spacing-2);
    }
    .tittel {
      grid-row: 2;
    }
  }
</style>
