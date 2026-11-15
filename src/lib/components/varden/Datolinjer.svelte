<!--
  Datoene under et brev i tråden på siden for et krav: datoen TE oppgir og avstanden til varselet
  under brevet med varselet (U-8 i BF-44 og BF-45, uten vurdering av fristen, MM-U50), og
  akseptfristen over handlingene ved byggherrens svar (U-11, HF-U23 punkt 4).
-->
<script lang="ts">
  import type { Brevet, OppgittDato } from './lesing';
  import { TRAADEN, dato, kalenderdager } from './tekster';

  let {
    b,
    klar,
    varselbrev,
    akseptfrist,
  }: {
    b: Brevet;
    /** Datoen TE oppgir for når TE ble klar over forholdet (`klarOverForholdet`). */
    klar: OppgittDato | null;
    /** Brevet med varselet, som datoen står under. */
    varselbrev: string | null;
    /** Akseptfristen i svaret, med brevet (`akseptfristen`). */
    akseptfrist: { brev: string; dato: string } | null;
  } = $props();
</script>

{#if klar && varselbrev === b.id}
  <p class="datolinje">
    {TRAADEN.klarOver(klar.dato, klar.brev, kalenderdager(klar.dato, b.sendt ?? b.registrert))}
  </p>
{/if}
{#if akseptfrist?.brev === b.id}
  <p class="akseptfrist">{TRAADEN.akseptfrist} <b>{dato(akseptfrist.dato)}</b>.</p>
{/if}

<style>
  .datolinje {
    font-size: 14px;
    color: var(--ink-2);
  }
  .akseptfrist {
    padding-top: var(--spacing-2);
    font-size: 14px;
    color: var(--ink-2);
  }
  .akseptfrist b {
    font-weight: 600;
    color: var(--ink);
  }
</style>
