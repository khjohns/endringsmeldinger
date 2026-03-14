<script lang="ts">
  import type { BelopVurdering } from '$lib/domain/vederlagDomain';
  import { formatCurrency } from '$lib/utils/formatters';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import NumberInput from '$lib/components/primitives/NumberInput.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';

  interface Props {
    title: string;
    paragrafRef: string;
    krevdBelop: number | undefined;
    prekludert: boolean;
    vurdering: BelopVurdering | undefined;
    godkjentBelop: number | undefined;
    onvurdering: (v: BelopVurdering) => void;
    ongodkjentbelop: (v: number | undefined) => void;
  }

  let {
    title,
    paragrafRef,
    krevdBelop,
    prekludert,
    vurdering,
    godkjentBelop,
    onvurdering,
    ongodkjentbelop,
  }: Props = $props();

  const vurderingOptions = [
    { value: 'godkjent', label: 'Godkjent', icon: 'check' as const, colorScheme: 'green' as const },
    { value: 'delvis', label: 'Delvis godkjent' },
    { value: 'avslatt', label: 'Avslått', icon: 'cross' as const, colorScheme: 'red' as const },
  ];
</script>

<FormSection>
  <SectionHeading {title} {paragrafRef} />
  {#if prekludert}
    <div class="subsidiaer-markering">Subsidiært</div>
  {/if}
  <div class="krevd-linje">
    Krevd: <span class="krevd-belop">{formatCurrency(krevdBelop)}</span>
  </div>
  <SegmentedButtons
    options={vurderingOptions}
    selected={vurdering}
    onselect={(v) => onvurdering(v as BelopVurdering)}
  />
  {#if vurdering === 'delvis'}
    <div class="field-amount">
      <NumberInput
        value={godkjentBelop}
        label="Godkjent beløp"
        suffix="kr"
        max={krevdBelop}
        referenceValue={krevdBelop}
        onchange={ongodkjentbelop}
      />
    </div>
  {/if}
</FormSection>

<style>
  .subsidiaer-markering {
    font-family: var(--font-data);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-vekt);
    padding: 2px 6px;
    background: var(--color-vekt-bg);
    border: 1px dashed var(--color-vekt);
    border-radius: var(--radius-sm);
    align-self: flex-start;
  }

  .krevd-linje {
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  .krevd-belop {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--color-ink);
  }
</style>
