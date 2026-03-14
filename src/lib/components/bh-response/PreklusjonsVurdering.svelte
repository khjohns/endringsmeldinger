<script lang="ts">
  import { boolToSegment } from '$lib/utils/formatters';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';

  export interface PreklusjonsLinje {
    key: string;
    label: string;
    value: boolean | undefined;
  }

  interface Props {
    linjer: PreklusjonsLinje[];
    onchange: (key: string, value: boolean) => void;
  }

  let { linjer, onchange }: Props = $props();

  const preklusjonsOptions = [
    { value: 'ja', label: 'Ja, i tide' },
    { value: 'nei', label: 'Nei, prekludert', colorScheme: 'red' as const },
  ];
</script>

<FormSection>
  <SectionHeading title="Preklusjon" paragrafRef="§34.1.2 / §34.1.3" />
  <p class="helptext">Er kravene varslet innen kontraktens varslingsfrister?</p>

  {#each linjer as linje (linje.key)}
    <div class="preklusjons-rad">
      <span class="preklusjons-label">{linje.label}</span>
      <SegmentedButtons
        options={preklusjonsOptions}
        selected={boolToSegment(linje.value)}
        onselect={(v) => onchange(linje.key, v === 'ja')}
        size="sm"
      />
    </div>
  {/each}
</FormSection>

<style>
  .preklusjons-rad {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
  }

  .preklusjons-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-ink);
  }
</style>
