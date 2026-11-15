<!--
  Boksen med datoene ved spørsmålet om varselet i svarskjemaene: datoen totalentreprenøren
  oppgir, når kravet ble sendt og dagene mellom. Byggherren vurderer selv om varselet kom i tide.
-->
<script lang="ts">
  let {
    linjer,
  }: {
    /** `avstand` er dagene mellom datoene, og `dempet` en merknad under dem. */
    linjer: { tekst: string; art?: 'avstand' | 'dempet' }[];
  } = $props();
</script>

<div class="datoer">
  {#each linjer as l, i (i)}
    {#if l.art === 'avstand'}<p><strong>{l.tekst}</strong></p>
    {:else}<p class={l.art}>{l.tekst}</p>{/if}
  {/each}
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
