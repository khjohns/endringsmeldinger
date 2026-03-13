<script lang="ts">
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import { formatDateShort } from '$lib/utils/formatters';

  interface Props {
    varselType?: string;
    krevdDager: number;
    begrunnelseHtml?: string;
    datoVarslet?: string;
  }

  let { varselType, krevdDager, begrunnelseHtml, datoVarslet }: Props = $props();

  const VARSELTYPE_LABELS: Record<string, string> = {
    varsel: 'Varsel',
    spesifisert: 'Spesifisert krav',
    begrunnelse_utsatt: 'Utsatt beregning',
  };

  const varselTypeLabel = $derived(
    varselType ? (VARSELTYPE_LABELS[varselType] ?? varselType) : undefined
  );

  let utvidet = $state(false);
  let begrunnelseEl = $state<HTMLElement | null>(null);
  const erAvkortet = $derived(
    begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false
  );
</script>

<div class="frist-sammendrag">
  <SectionHeading title="Fristkrav" paragrafRef="§33" />

  <div class="detaljer">
    {#if varselTypeLabel}
      <div class="detalj-rad">
        <span class="detalj-label">Type:</span>
        <span class="detalj-verdi">{varselTypeLabel}</span>
      </div>
    {/if}

    {#if krevdDager > 0}
      <div class="detalj-rad">
        <span class="detalj-label">Krevd:</span>
        <span class="detalj-dager">{krevdDager} dager</span>
      </div>
    {/if}

    {#if datoVarslet}
      <div class="detalj-rad">
        <span class="detalj-label">Varslet:</span>
        <span class="detalj-verdi">{formatDateShort(datoVarslet)}</span>
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
    gap: var(--spacing-2);
    font-size: 13px;
  }

  .detalj-label {
    color: var(--color-ink-muted);
  }

  .detalj-verdi {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  .detalj-dager {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
  }

  .begrunnelse {
    font-family: var(--font-prose);
    font-size: 14px;
    font-weight: 450;
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
