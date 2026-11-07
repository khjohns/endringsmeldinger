<!--
  Utkastkortet rundt et skjema som blir et brev (svaret på S-4 og S-4b i BF-10, oppdragsgiver
  06.11): stiplet kant rundt hele kortet og et hode med «Utkast · ikke sendt», brevhodet når
  kjernen har laget det, mottakeren og at utkastet bare er synlig for teamet. Skjemaet står i
  kortet, og brevet vises i brevkontrollen etter «Se brevet før sending».
-->
<script lang="ts">
  import { Lock } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import { BREVKONTROLL, SKJEMA } from './tekster';

  let {
    id,
    tittel = null,
    mottaker,
    nivaa = 2,
    novalidate = false,
    onsubmit,
    infotips,
    children,
  }: {
    /** ID-en til overskriften, som skjemaet er merket med. */
    id: string;
    /** Brevhodet eller skjemaets navn etter merket, `null` før kjernen har laget brevet. */
    tittel?: string | null;
    /** «Til byggherren (BH)» eller «Til totalentreprenøren (TE)». */
    mottaker: string;
    /** Overskriftsnivået: 1 når skjemaet er det eneste på siden. */
    nivaa?: 1 | 2;
    novalidate?: boolean;
    onsubmit?: () => void;
    infotips?: Snippet;
    children: Snippet;
  } = $props();
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
      <svelte:element this={`h${nivaa}`} class="tittel" {id}>
        <span class="merke-utkast">{BREVKONTROLL.utkast}</span>
        {#if tittel}<span>{tittel}</span>{/if}
      </svelte:element>
      {@render infotips?.()}
    </div>
    <p class="dempet">{mottaker}</p>
    <p class="dempet synlig"><Lock size={14} aria-hidden="true" />{SKJEMA.synlig}</p>
  </header>
  {@render children()}
</form>

<style>
  .utkast {
    background: var(--surface);
    border: 1.5px dashed var(--draft-border);
    border-radius: var(--r-kort);
  }
  .utkasthode {
    background: var(--draft-bg);
    border-radius: calc(var(--r-kort) - 1.5px) calc(var(--r-kort) - 1.5px) 0 0;
    padding: var(--spacing-5) var(--spacing-6);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .tittelrad {
    display: flex;
    align-items: flex-start;
  }
  .tittel {
    flex: 1;
    display: flex;
    line-height: 1.4;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: var(--sperring-20);
  }
  .merke-utkast {
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: var(--r-merke);
    background: var(--surface);
    font-size: 12px;
    font-weight: 500;
  }
  .synlig {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
</style>
