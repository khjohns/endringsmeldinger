<!--
  Vederlaget eller fristen uten varsel eller krav fra totalentreprenøren, i hodet på siden for
  sporet (U-2 i BF-51, OV-U125): betegnelsen, linja om det saken har, og handlingene kalleren gir.
  Brevtråden under har brevene lagt til som dokumentasjon. Ingen frist og ingen melding (OV-U126).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { BETEGNELSE, TOMT_SPOR } from './tekster';

  let { spor, handlinger }: { spor: 'vederlag' | 'frist'; handlinger?: Snippet } = $props();
</script>

<div class="tomt">
  <p class="betegnelse">{BETEGNELSE.ingen_varsel_eller_krav}</p>
  <p class="linje">{TOMT_SPOR.linje(spor)}</p>
  {#if handlinger}<div class="handlinger">{@render handlinger()}</div>{/if}
</div>

<style>
  .tomt {
    display: grid;
    gap: var(--spacing-1);
    margin-top: var(--spacing-3);
  }
  .betegnelse {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .linje {
    font-size: 14px;
    color: var(--ink-2);
  }
  .handlinger {
    margin-top: var(--spacing-3);
  }
</style>
