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
  import { onMount } from 'svelte';
  import { submitEvent } from '$lib/api/events';
  import { draftKey, loadDraft, saveDraft, clearDraft } from '$lib/utils/draft';
  import type { EventType } from '$lib/types/timeline';
  import { useQueryClient } from '@tanstack/svelte-query';
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  import NumberInput from '$lib/components/primitives/NumberInput.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import Alert from '$lib/components/primitives/Alert.svelte';
  import { formatDateShort } from '$lib/utils/formatters';

  const iDag = formatDateShort(new Date().toISOString().split('T')[0]);

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
    version: number;
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
    version,
    begrunnelseHtml = $bindable(''),
    onactions,
  }: Props = $props();

  const queryClient = useQueryClient();

  // --- Draft ---
  interface FristDraft {
    varselType?: string;
    antallDager?: number;
    begrunnelseHtml: string;
  }
  const dk = draftKey('send-frist', sakId);
  const draft = loadDraft<FristDraft>(dk);
  let draftReady = $state(false);

  // --- Initialize from domain defaults ---
  const defaults = getDefaults({ scenario, existing, existingVarselDato });

  let varselType = $state<string | undefined>(draft?.varselType ?? defaults.varselType);
  let antallDager = $state<number | undefined>(
    draft?.antallDager ?? (defaults.antallDager || undefined)
  );
  let submitting = $state(false);
  let submitError = $state('');

  onMount(() => {
    if (draft?.begrunnelseHtml) {
      begrunnelseHtml = draft.begrunnelseHtml;
    }
    draftReady = true;
  });

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
        return 'Oppdater fristkrav § 33';
      case 'spesifisering':
        return 'Spesifiser krav § 33';
      case 'foresporsel':
        return 'Svar på forespørsel § 33';
      default:
        return 'Send fristkrav § 33';
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
        eventData as unknown as Record<string, unknown>,
        { expectedVersion: version }
      );
      clearDraft(dk);
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

  // Auto-save draft
  $effect(() => {
    if (!draftReady) return;
    saveDraft(dk, { varselType, antallDager, begrunnelseHtml });
  });

  const segmentOptions = $derived(
    visibility.segmentOptions.map((o) => ({ id: o.value, label: o.label }))
  );
</script>

<div class="te-frist-form">
  <!-- VARSLING -->
  <FormSection>
    <SectionHeading title="Varsling" paragrafRef="§ 33.4 / § 33.6" />
    <div class="field-auto">
      <SegmentedControl
        value={varselType ?? ''}
        options={segmentOptions}
        onchange={(v) => {
          varselType = v;
        }}
      />
    </div>
    {#if varselType === 'varsel'}
      <p class="helptext">
        Varselet registreres med dato {iDag}. Antall dager kan spesifiseres når grunnlaget for å
        beregne omfanget foreligger (§ 33.6.1).
      </p>
    {:else if varselType === 'spesifisert'}
      <p class="helptext">
        Angi og begrunn det antall dager du krever som fristforlengelse. Kravet registreres med dato {iDag}
        (§ 33.6.1).
      </p>
    {/if}
  </FormSection>

  <!-- FORESPORSEL ALERT -->
  {#if visibility.showForesporselAlert}
    <Alert variant="info">
      BH har bedt om spesifisering (§ 33.6.2). Svar med antall dager eller begrunn hvorfor
      beregningsgrunnlag ikke foreligger.
    </Alert>
  {/if}

  <!-- ÅRSAKSSAMMENHENG -->
  {#if visibility.showKravSection}
    <FormSection>
      <SectionHeading title="Årsakssammenheng" paragrafRef="§ 33.1" />
      <p class="helptext">
        Begrunnelsen må vise at det foreligger (1) en hindring på fremdriften og (2) at hindringen
        er forårsaket av det påberopte kontraktsforholdet.
      </p>
    </FormSection>
  {/if}

  <!-- UTMÅLING -->
  {#if visibility.showKravSection}
    <FormSection>
      <SectionHeading title="Utmåling" paragrafRef="§ 33.5" />
      <p class="helptext">
        Fristforlengelsen skal svare til den virkning kontraktsforholdet har hatt på fremdriften,
        herunder avbrudd, forskyvning til ugunstig årstid og samlet virkning av tidligere varslede
        forhold.
      </p>
      <div class="field-dager">
        <NumberInput
          label="Antall dager"
          suffix="dager"
          value={antallDager}
          onchange={(v) => (antallDager = v)}
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

  .field-dager {
    max-width: 140px;
  }
</style>
