<script lang="ts">
  import type { VederlagsMetode } from '$lib/types/timeline';
  import { getVederlagsmetodeShortLabel } from '$lib/constants/paymentMethods';
  import { boolToSegment } from '$lib/utils/formatters';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';

  interface MetodeOption {
    value: string;
    label: string;
  }

  interface Props {
    teMetode: VederlagsMetode | undefined;
    akseptererMetode: boolean | undefined;
    oensketMetode: VederlagsMetode | undefined;
    metodeAlternativer: MetodeOption[];
    onaksepterer: (v: boolean) => void;
    onoensket: (v: VederlagsMetode) => void;
  }

  let {
    teMetode,
    akseptererMetode,
    oensketMetode,
    metodeAlternativer,
    onaksepterer,
    onoensket,
  }: Props = $props();
</script>

<FormSection>
  <SectionHeading title="Beregningsmetode" paragrafRef="§34.2" />
  <p class="helptext">
    TE krever {getVederlagsmetodeShortLabel(teMetode)?.toLowerCase() ?? 'ukjent metode'}. Aksepterer
    du beregningsmetoden?
  </p>
  <SegmentedButtons
    options={[
      { value: 'ja', label: 'Ja' },
      { value: 'nei', label: 'Nei' },
    ]}
    selected={boolToSegment(akseptererMetode)}
    onselect={(v) => onaksepterer(v === 'ja')}
    size="sm"
  />
  {#if akseptererMetode === false}
    <div class="foretrukket-metode">
      <span class="foretrukket-label">Foretrukket metode:</span>
      <SegmentedButtons
        options={metodeAlternativer}
        selected={oensketMetode}
        onselect={(v) => onoensket(v as VederlagsMetode)}
        size="sm"
      />
    </div>
  {/if}
</FormSection>

<style>
  .foretrukket-metode {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding-top: var(--spacing-2);
  }

  .foretrukket-label {
    font-size: 12px;
    color: var(--color-ink-muted);
  }
</style>
