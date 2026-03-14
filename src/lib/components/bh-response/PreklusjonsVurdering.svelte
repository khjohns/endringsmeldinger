<script lang="ts">
  import { boolToSegment } from '$lib/utils/formatters';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';

  interface Props {
    har34_1_2_Preklusjon: boolean;
    harRiggKrav: boolean;
    harProduktivitetKrav: boolean;
    hovedkravVarsletITide: boolean | undefined;
    riggVarsletITide: boolean | undefined;
    produktivitetVarsletITide: boolean | undefined;
    onhovedkrav: (v: boolean) => void;
    onrigg: (v: boolean) => void;
    onproduktivitet: (v: boolean) => void;
  }

  let {
    har34_1_2_Preklusjon,
    harRiggKrav,
    harProduktivitetKrav,
    hovedkravVarsletITide,
    riggVarsletITide,
    produktivitetVarsletITide,
    onhovedkrav,
    onrigg,
    onproduktivitet,
  }: Props = $props();

  const preklusjonsOptions = [
    { value: 'ja', label: 'Ja, i tide' },
    { value: 'nei', label: 'Nei, prekludert', colorScheme: 'red' as const },
  ];
</script>

<FormSection>
  <SectionHeading title="Preklusjon" paragrafRef="§34.1.2 / §34.1.3" />
  <p class="helptext">Er kravene varslet innen kontraktens varslingsfrister?</p>

  {#if har34_1_2_Preklusjon}
    <div class="preklusjons-rad">
      <span class="preklusjons-label">Hovedkrav (§34.1.2)</span>
      <SegmentedButtons
        options={preklusjonsOptions}
        selected={boolToSegment(hovedkravVarsletITide)}
        onselect={(v) => onhovedkrav(v === 'ja')}
        size="sm"
      />
    </div>
  {/if}

  {#if harRiggKrav}
    <div class="preklusjons-rad">
      <span class="preklusjons-label">Rigg og drift (§34.1.3)</span>
      <SegmentedButtons
        options={preklusjonsOptions}
        selected={boolToSegment(riggVarsletITide)}
        onselect={(v) => onrigg(v === 'ja')}
        size="sm"
      />
    </div>
  {/if}

  {#if harProduktivitetKrav}
    <div class="preklusjons-rad">
      <span class="preklusjons-label">Produktivitetstap (§34.1.3)</span>
      <SegmentedButtons
        options={preklusjonsOptions}
        selected={boolToSegment(produktivitetVarsletITide)}
        onselect={(v) => onproduktivitet(v === 'ja')}
        size="sm"
      />
    </div>
  {/if}
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
