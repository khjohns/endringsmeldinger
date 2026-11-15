<!--
  Datoene ved spørsmålet om varselet i svarskjemaet: når TE ble klar over forholdet, når kravet
  ble sendt og avstanden mellom dem. Byggherren vurderer selv om varselet kom i tide.
-->
<script lang="ts">
  import type { Utledning } from '$kjerne/utledning/utled';
  import { klarOverForholdet, type Brevet } from './lesing';
  import { kravbrevetI, kravetSendt } from './svarskjema';
  import { SKJEMA, kalenderdager } from './tekster';

  let {
    u,
    spor,
    sendt,
  }: {
    u: Utledning;
    spor: 'vederlag' | 'frist';
    /** Linjen om når kravet ble sendt, med sporets ord. */
    sendt: (dato: string, brev: Brevet) => string;
  } = $props();

  const kravbrevet = $derived(kravbrevetI(u, spor));
  const klarOver = $derived(klarOverForholdet(u));
  const kravSendt = $derived(kravetSendt(kravbrevet));
</script>

<div class="datoer">
  {#if klarOver}<p>{SKJEMA.klarOver(klarOver.dato, klarOver.brev)}</p>{/if}
  <p>{sendt(kravSendt ?? kravbrevet.registrert, kravbrevet)}</p>
  {#if klarOver && kravSendt}
    <p><strong>{SKJEMA.avstand(kalenderdager(klarOver.dato, kravSendt))}</strong></p>
  {/if}
  <p class="dempet">{SKJEMA.datoGrense}</p>
</div>

<style>
  .datoer {
    padding: var(--spacing-3) var(--spacing-4);
    background: var(--surface-inset);
    border-radius: var(--r-innfelt);
    font-size: 14px;
  }
  .dempet {
    color: var(--ink-3);
  }
</style>
