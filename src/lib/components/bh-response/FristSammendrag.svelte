<script lang="ts">
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import { formatDateShort } from '$lib/utils/formatters';

  interface Props {
    krevdDager: number;
    begrunnelseHtml?: string;
    datoVarslet?: string;
    datoFremsatt?: string;
  }

  let { krevdDager, begrunnelseHtml, datoVarslet, datoFremsatt }: Props = $props();

  let utvidet = $state(false);
  let begrunnelseEl = $state<HTMLElement | null>(null);
  const erAvkortet = $derived(
    begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false
  );
</script>

<div class="frist-sammendrag">
  <SectionHeading title="Fristkrav" paragrafRef="§ 33.1" />

  <div class="detaljer">
    {#if datoVarslet}
      <div class="detalj-rad">
        <span class="detalj-label">Varslet om fristforlengelse</span>
        <span class="detalj-dato">{formatDateShort(datoVarslet)}</span>
      </div>
    {/if}

    {#if krevdDager > 0}
      <div class="detalj-rad">
        <span class="detalj-label">Krevd ({krevdDager} dager)</span>
        {#if datoFremsatt}
          <span class="detalj-dato">{formatDateShort(datoFremsatt)}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if begrunnelseHtml}
    <div class="begrunnelse" class:avkortet={!utvidet} bind:this={begrunnelseEl}>
      {@html begrunnelseHtml}
    </div>
    {#if erAvkortet || utvidet}
      <button class="vis-mer-btn" onclick={() => (utvidet = !utvidet)}>
        {utvidet ? 'Vis mindre' : 'Vis mer'}
      </button>
    {/if}
  {/if}
</div>

<style>
  .frist-sammendrag {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .detaljer {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .detalj-rad {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 13px;
  }

  .detalj-label {
    color: var(--color-ink-muted);
  }

  .detalj-dato {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-secondary);
  }

  .begrunnelse {
    font-family: var(--font-prose);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.6;
    color: var(--color-ink-secondary);
    overflow: hidden;
  }

  .begrunnelse :global(p) {
    margin: 0 0 0.5em;
  }

  .avkortet {
    max-height: calc(1.6em * 10);
  }

  .vis-mer-btn {
    align-self: flex-start;
    background: none;
    border: none;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
    cursor: pointer;
    padding: 0;
  }

  .vis-mer-btn:hover {
    color: var(--color-vekt);
  }
</style>
