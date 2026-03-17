<script lang="ts">
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import { getVederlagsmetodeLabel } from '$lib/constants/paymentMethods';
  import { formatCurrency } from '$lib/utils/formatters';

  interface KravlinjeData {
    label: string;
    belop: number;
  }

  interface Props {
    metode?: string;
    kravlinjer: KravlinjeData[];
    sumKrevd: number;
    begrunnelseHtml?: string;
  }

  let { metode, kravlinjer, sumKrevd, begrunnelseHtml }: Props = $props();

  let utvidet = $state(false);
  let begrunnelseEl = $state<HTMLElement | null>(null);
  const erAvkortet = $derived(
    begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false
  );
</script>

<div class="vederlag-sammendrag">
  <SectionHeading title="Vederlagskrav" paragrafRef="§34.1" />

  {#if metode}
    <div class="metode-linje">
      <span class="metode-label">Beregningsmetode:</span>
      <span class="metode-verdi">{getVederlagsmetodeLabel(metode)}</span>
    </div>
  {/if}

  <div class="kravlinjer">
    {#each kravlinjer as linje}
      <div class="kravlinje">
        <span class="kravlinje-label">{linje.label}</span>
        <span class="kravlinje-belop">{formatCurrency(linje.belop)}</span>
      </div>
    {/each}
    {#if kravlinjer.length > 1}
      <div class="kravlinje kravlinje-sum">
        <span class="kravlinje-label">Sum krevd</span>
        <span class="kravlinje-belop">{formatCurrency(sumKrevd)}</span>
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
  .vederlag-sammendrag {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .metode-linje {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-2);
    font-size: 13px;
  }

  .metode-label {
    color: var(--color-ink-muted);
  }

  .metode-verdi {
    font-family: var(--font-data);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  .kravlinjer {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .kravlinje {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 2px 0;
  }

  .kravlinje-label {
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  .kravlinje-belop {
    font-family: var(--font-data);
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink);
  }

  .kravlinje-sum {
    border-top: 1px solid var(--color-wire);
    padding-top: var(--spacing-2);
    margin-top: var(--spacing-1);
  }

  .kravlinje-sum .kravlinje-label {
    font-weight: 600;
    color: var(--color-ink);
  }

  .kravlinje-sum .kravlinje-belop {
    font-weight: 600;
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
