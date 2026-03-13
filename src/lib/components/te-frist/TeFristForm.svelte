<script lang="ts">
  import {
    getDefaults,
    beregnVisibility,
    beregnCanSubmit,
    buildEventData,
    getEventType,
  } from '$lib/domain/fristSubmissionDomain';
  import type {
    SubmissionScenario,
    FristSubmissionFormState,
    FristSubmissionDefaultsConfig,
  } from '$lib/domain/fristSubmissionDomain';
  import { goto } from '$app/navigation';
  import { submitEvent } from '$lib/api/events';
  import type { EventType } from '$lib/types/timeline';
  import { useQueryClient } from '@tanstack/svelte-query';
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  import NumberInput from '$lib/components/primitives/NumberInput.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import Alert from '$lib/components/primitives/Alert.svelte';

  interface FormActions {
    submitLabel: string;
    kanSende: boolean;
    submitting: boolean;
    submitError: string;
    onsubmit: () => void;
    onavbryt: () => void;
  }

  interface Props {
    scenario: SubmissionScenario;
    existing?: FristSubmissionDefaultsConfig['existing'];
    existingVarselDato?: string;
    prosjektId: string;
    sakId: string;
    grunnlagEventId: string;
    originalEventId?: string;
    erSvarPaForesporsel?: boolean;
    begrunnelseHtml: string;
    onactions?: (actions: FormActions) => void;
  }

  let {
    scenario,
    existing,
    existingVarselDato,
    prosjektId,
    sakId,
    grunnlagEventId,
    originalEventId,
    erSvarPaForesporsel = false,
    begrunnelseHtml = $bindable(''),
    onactions,
  }: Props = $props();

  const queryClient = useQueryClient();

  // --- Initialize from domain defaults ---
  const defaults = getDefaults({ scenario, existing, existingVarselDato });

  let varselType = $state<string | undefined>(defaults.varselType);
  let antallDager = $state<number | undefined>(defaults.antallDager || undefined);
  let submitting = $state(false);
  let submitError = $state('');

  // --- Derived ---
  const visibility = $derived(
    beregnVisibility(
      { varselType: varselType as FristSubmissionFormState['varselType'] },
      { scenario }
    )
  );

  const mappedState: FristSubmissionFormState = $derived({
    varselType: varselType as FristSubmissionFormState['varselType'],
    tidligereVarslet: scenario === 'spesifisering' || scenario === 'edit',
    varselDato: scenario === 'spesifisering' ? existingVarselDato : undefined,
    antallDager: antallDager ?? 0,
    nySluttdato: undefined,
    begrunnelse: begrunnelseHtml,
    begrunnelseValidationError: undefined,
    vilkarOppfylt: undefined,
  });

  const kanSende = $derived(beregnCanSubmit(mappedState, { scenario }));

  const submitLabel = $derived.by(() => {
    switch (scenario) {
      case 'edit':
        return 'Oppdater fristkrav §33';
      case 'spesifisering':
        return 'Spesifiser krav §33';
      case 'foresporsel':
        return 'Svar på forespørsel §33';
      default:
        return 'Send fristkrav §33';
    }
  });

  async function handleSubmit() {
    if (!kanSende) return;
    submitting = true;
    submitError = '';

    try {
      const eventData = buildEventData(mappedState, {
        scenario,
        grunnlagEventId,
        erSvarPaForesporsel,
        originalEventId,
      });

      const eventType = getEventType({ scenario });

      await submitEvent(
        sakId,
        eventType as EventType,
        eventData as unknown as Record<string, unknown>
      );
      await queryClient.invalidateQueries({ queryKey: ['case-context', sakId] });
      goto(`/${prosjektId}/${sakId}`);
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Kunne ikke sende krav';
      submitting = false;
    }
  }

  function handleAvbryt() {
    goto(`/${prosjektId}/${sakId}`);
  }

  $effect(() => {
    onactions?.({
      submitLabel,
      kanSende,
      submitting,
      submitError,
      onsubmit: handleSubmit,
      onavbryt: handleAvbryt,
    });
  });

  const segmentOptions = $derived(
    visibility.segmentOptions.map((o) => ({ id: o.value, label: o.label }))
  );
</script>

<div class="te-frist-form">
  <!-- KRAVTYPE -->
  {#if visibility.showSegmentedControl}
    <FormSection>
      <SectionHeading title="Kravtype" paragrafRef="§33.4 / §33.6" />
      <div class="field-auto">
        <SegmentedControl
          value={varselType ?? ''}
          options={segmentOptions}
          onchange={(v) => {
            varselType = v;
          }}
        />
      </div>
    </FormSection>
  {/if}

  <!-- FORESPORSEL ALERT -->
  {#if visibility.showForesporselAlert}
    <Alert variant="info">
      BH har bedt om spesifisering (§33.6.2). Svar med antall dager eller begrunn hvorfor
      beregningsgrunnlag ikke foreligger.
    </Alert>
  {/if}

  <!-- FRISTFORLENGELSE (antall dager) -->
  {#if visibility.showKravSection}
    <FormSection>
      <SectionHeading title="Fristforlengelse" paragrafRef="§33.6" />
      <div class="field-amount">
        <NumberInput
          label="Antall dager"
          suffix="dager"
          value={antallDager ?? null}
          onchange={(v) => (antallDager = v ?? undefined)}
        />
      </div>
    </FormSection>
  {/if}
</div>

<style>
  .te-frist-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
  }
</style>
