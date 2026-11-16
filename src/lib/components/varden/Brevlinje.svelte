<!--
  Linja øverst i et skjema om brevet skjemaet følger opp, med lenken som åpner det. På smal skjerm
  står brevet under linja; ellers står det i `Leseramme` ved siden av skjemaet (oppdragsgiver
  29.10, #1391).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { FileText } from 'lucide-svelte';
  import Knapp from './Knapp.svelte';

  let {
    id,
    leser = $bindable(),
    smal,
    lenke,
    children,
    brev,
  }: {
    /** ID-en til brevet lenken åpner, under linja eller i `Leseramme`. */
    id: string;
    leser: boolean;
    smal: boolean;
    lenke: { les: string; lesHer: string; lukk: string };
    children: Snippet;
    /** Brevet slik det står under linja på smal skjerm. */
    brev: Snippet;
  } = $props();
</script>

<div class="linje">
  <FileText size={16} aria-hidden="true" />
  <span>{@render children()}</span>
  <Knapp variant="lenke" onclick={() => (leser = !leser)} aria-expanded={leser} aria-controls={id}>
    {leser ? lenke.lukk : smal ? lenke.lesHer : lenke.les}
  </Knapp>
</div>
{#if leser && smal}
  <div class="innebrev" {id}>{@render brev()}</div>
{/if}

<style>
  .linje {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
    font-size: 14px;
  }
  .linje > span {
    margin-right: auto;
  }
  .innebrev {
    padding: var(--spacing-4) var(--spacing-4) 0;
  }
</style>
