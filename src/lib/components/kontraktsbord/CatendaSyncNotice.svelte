<script lang="ts">
  import type { CaseContextResponse } from '$lib/types/api';
  let { status }: { status: NonNullable<CaseContextResponse['catenda_sync']>['status'] } = $props();
</script>

{#if status !== 'clear'}
  <div class="catenda-sync-notice" role="status" aria-live="polite">
    {#if status === 'failed'}
      <strong>Lagret i appen, men ikke synkronisert til Catenda</strong>
      <p>Én eller flere leveranser til Catenda feilet. Du trenger ikke sende endringen på nytt.</p>
    {:else}
      <strong>Synkronisering til Catenda er ikke bekreftet</strong>
      <p>Endringene er lagret i appen. Vi har ennå ikke bekreftet at alt er levert til Catenda.</p>
    {/if}
  </div>
{/if}

<style>
  .catenda-sync-notice {
    flex-shrink: 0;
    padding: 12px 24px;
    border-bottom: 2px solid var(--color-vekt);
    background: var(--color-canvas);
    color: var(--color-ink);
    font-size: 13px;
  }
  p {
    margin: 4px 0 0;
  }
</style>
