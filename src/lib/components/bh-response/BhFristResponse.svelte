<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { beregnAlt, buildEventData, getDefaults } from '$lib/domain/fristDomain';
  import type { FristFormState, FristDomainConfig } from '$lib/domain/fristDomain';
  import { generateFristResponseBegrunnelse } from '$lib/domain/begrunnelse/fristBegrunnelse';
  import type { FristResponseInput } from '$lib/domain/begrunnelse/fristBegrunnelse';
  import { tokensToHtml } from '$lib/editor/tokenConverter';
  import type { FristTilstand, EventType } from '$lib/types/timeline';
  import { submitEvent } from '$lib/api/events';
  import { draftKey, loadDraft, saveDraft, clearDraft } from '$lib/utils/draft';
  import { boolToSegment } from '$lib/utils/formatters';
  import { useQueryClient } from '@tanstack/svelte-query';

  import FristSammendrag from './FristSammendrag.svelte';
  import FristKonsekvens from './FristKonsekvens.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';
  import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
  import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import NumberInput from '$lib/components/primitives/NumberInput.svelte';
  import Alert from '$lib/components/primitives/Alert.svelte';
  import Checkbox from '$lib/components/primitives/Checkbox.svelte';

  interface KravData {
    krevdDager: number;
    begrunnelseHtml?: string;
    datoVarslet?: string;
    datoFremsatt?: string;
  }

  interface TidligereSvar {
    rolle: 'TE' | 'BH';
    versjon: number;
    html: string;
    dato?: string;
  }

  interface FristTimelineData {
    tidligereSvar: TidligereSvar[];
    fristKravId: string;
    lastResponseData?: { eventId: string; godkjent_dager?: number };
    forrigeBegrunnelseHtml?: string;
  }

  interface Props {
    prosjektId: string;
    sakId: string;
    saksnr: number;
    tittel: string;
    krav: KravData;
    domainConfig: FristDomainConfig;
    timelineData: FristTimelineData;
    version: number;
    isUpdateMode?: boolean;
    fristTilstand?: Partial<FristTilstand>;
    teNavn?: string;
    bhNavn?: string;
    prosjektNavn?: string;
  }

  let {
    prosjektId,
    sakId,
    saksnr,
    tittel,
    krav,
    domainConfig,
    timelineData,
    version,
    isUpdateMode = false,
    fristTilstand,
    teNavn,
    bhNavn,
    prosjektNavn,
  }: Props = $props();

  const tidligereSvar = $derived(timelineData.tidligereSvar);
  const fristKravId = $derived(timelineData.fristKravId);
  const lastResponseData = $derived(timelineData.lastResponseData);
  const forrigeBegrunnelseHtml = $derived(timelineData.forrigeBegrunnelseHtml);

  const queryClient = useQueryClient();

  // --- Draft ---
  interface FristResponseDraft {
    fristVarselOk?: boolean;
    spesifisertKravOk?: boolean;
    foresporselSvarOk?: boolean;
    vilkarOppfylt?: boolean;
    sendForesporsel: boolean;
    godkjentDager?: number;
    bhBegrunnelseHtml: string;
    userHasEditedBegrunnelse?: boolean;
  }
  const dk = draftKey('svar-frist', sakId);
  const draft = loadDraft<FristResponseDraft>(dk);
  let draftReady = $state(false);

  // --- Form state (initialized from domain defaults) ---
  const initialDefaults = getDefaults({
    krevdDager: domainConfig.krevdDager,
    isUpdateMode,
    lastResponseEvent: lastResponseData,
    fristTilstand,
  });

  // Port 1: Foreløpig varsel + Fremsatt krav
  let fristVarselOk = $state<boolean | undefined>(
    draft?.fristVarselOk ?? initialDefaults.fristVarselOk
  );
  let spesifisertKravOk = $state<boolean | undefined>(
    draft?.spesifisertKravOk ?? initialDefaults.spesifisertKravOk
  );
  let foresporselSvarOk = $state<boolean | undefined>(
    draft?.foresporselSvarOk ?? initialDefaults.foresporselSvarOk
  );

  // Port 2: Årsakssammenheng
  let vilkarOppfylt = $state<boolean | undefined>(
    draft?.vilkarOppfylt ?? initialDefaults.vilkarOppfylt
  );

  // Port 3: Utmåling
  let sendForesporsel = $state<boolean>(draft?.sendForesporsel ?? initialDefaults.sendForesporsel);
  let godkjentDager = $state<number | undefined>(
    draft?.godkjentDager ?? initialDefaults.godkjentDager
  );

  // Begrunnelse
  let bhBegrunnelseHtml = $state(draft?.bhBegrunnelseHtml ?? forrigeBegrunnelseHtml ?? '');
  let userHasEdited = $state(
    draft?.userHasEditedBegrunnelse ?? (isUpdateMode && !!forrigeBegrunnelseHtml)
  );

  // Submission
  let submitting = $state(false);
  let submitError = $state<string | null>(null);

  onMount(() => {
    draftReady = true;
  });

  // Auto-save draft
  $effect(() => {
    if (!draftReady) return;
    saveDraft(dk, {
      fristVarselOk,
      spesifisertKravOk,
      foresporselSvarOk,
      vilkarOppfylt,
      sendForesporsel,
      godkjentDager,
      bhBegrunnelseHtml,
      userHasEditedBegrunnelse: userHasEdited,
    });
  });

  // --- Domain computations ---
  const formState: FristFormState = $derived({
    fristVarselOk,
    spesifisertKravOk,
    foresporselSvarOk,
    vilkarOppfylt,
    sendForesporsel,
    godkjentDager,
    begrunnelse: bhBegrunnelseHtml,
    begrunnelseValidationError: undefined,
  });

  const computed = $derived(beregnAlt(formState, domainConfig));

  // --- Auto-begrunnelse ---
  const canGenerateBegrunnelse = $derived(
    sendForesporsel || (vilkarOppfylt !== undefined && godkjentDager !== undefined)
  );

  const fristBegrunnelseInput: FristResponseInput = $derived({
    varselType: domainConfig.varselType,
    krevdDager: domainConfig.krevdDager,
    fristVarselOk,
    spesifisertKravOk,
    foresporselSvarOk,
    sendForesporsel,
    vilkarOppfylt: vilkarOppfylt ?? false,
    godkjentDager: godkjentDager ?? 0,
    erPrekludert: computed.erPrekludert,
    erForesporselSvarForSent: foresporselSvarOk === false,
    erRedusert_33_6_1: computed.erRedusert,
    harTidligereVarselITide: domainConfig.harTidligereVarselITide,
    erGrunnlagSubsidiaer: domainConfig.erGrunnlagSubsidiaer,
    erGrunnlagPrekludert: domainConfig.erHelFristSubsidiaerPgaGrunnlag,
    prinsipaltResultat: computed.prinsipaltResultat,
    subsidiaertResultat: computed.subsidiaertResultat,
    visSubsidiaertResultat: computed.visSubsidiaertResultat,
  });

  const autoBegrunnelseHtml = $derived.by(() => {
    if (!canGenerateBegrunnelse) return '';
    const tokens = generateFristResponseBegrunnelse(fristBegrunnelseInput, { useTokens: true });
    return tokensToHtml(tokens);
  });

  // Auto-populate editor when form is filled and user hasn't manually edited
  $effect(() => {
    if (!userHasEdited && autoBegrunnelseHtml) {
      bhBegrunnelseHtml = autoBegrunnelseHtml;
    }
  });

  function handleRegenerate() {
    if (autoBegrunnelseHtml) {
      bhBegrunnelseHtml = autoBegrunnelseHtml;
      userHasEdited = false;
    }
  }

  // --- Subsidiary context ---
  const visSubsidiaerBanner = $derived(
    domainConfig.erGrunnlagSubsidiaer || domainConfig.erHelFristSubsidiaerPgaGrunnlag
  );

  // Begrunnelse entries for thread panel
  const begrunnelseEntries = $derived(tidligereSvar);

  // --- Validation ---
  const kanSende = $derived.by(() => {
    if (submitting) return false;
    if (sendForesporsel) return true; // Forespørsel requires no further field selections
    if (computed.visibility.showFristVarselOk && fristVarselOk === undefined) return false;
    if (computed.visibility.showSpesifisertKravOk && spesifisertKravOk === undefined) return false;
    if (computed.visibility.showForesporselSvarOk && foresporselSvarOk === undefined) return false;
    if (vilkarOppfylt === undefined) return false;
    if (computed.showGodkjentDager && godkjentDager === undefined) return false;
    return true;
  });

  // --- Submit ---
  async function handleSubmit() {
    if (!kanSende) return;
    submitting = true;
    submitError = null;

    try {
      const autoBegrunnelse = generateFristResponseBegrunnelse(fristBegrunnelseInput);
      const data = buildEventData(
        formState,
        domainConfig,
        {
          prinsipaltResultat: computed.prinsipaltResultat,
          subsidiaertResultat: computed.subsidiaertResultat,
          visSubsidiaertResultat: computed.visSubsidiaertResultat,
          subsidiaerTriggers: computed.subsidiaerTriggers,
        },
        fristKravId,
        autoBegrunnelse
      );

      const eventType = isUpdateMode ? 'respons_frist_oppdatert' : 'respons_frist';

      await submitEvent(sakId, eventType as EventType, data, { expectedVersion: version });
      clearDraft(dk);
      await queryClient.invalidateQueries({ queryKey: ['case-context', sakId] });
      goto(`/${prosjektId}/${sakId}`);
    } catch (err) {
      submitError = err instanceof Error ? err.message : 'Kunne ikke sende svar';
      submitting = false;
    }
  }

  function handleAvbryt() {
    goto(`/${prosjektId}/${sakId}`);
  }

  // --- Options ---
  const preklusjonsOptions = [
    { value: 'ja', label: 'Ja, i tide' },
    { value: 'nei', label: 'Nei, prekludert', colorScheme: 'red' as const },
  ];

  const reduksjonsOptions = [
    { value: 'ja', label: 'Ja, i tide' },
    { value: 'nei', label: 'Nei, for sent', colorScheme: 'red' as const },
  ];

  const hindringOptions = [
    { value: 'ja', label: 'Ja, hindring' },
    { value: 'nei', label: 'Nei, ingen hindring', colorScheme: 'red' as const },
  ];
</script>

<FormWithRightPanel
  entries={begrunnelseEntries}
  bind:bhBegrunnelseHtml
  {teNavn}
  {bhNavn}
  submitLabel={isUpdateMode ? 'Oppdater svar' : 'Send svar'}
  submitDisabled={!kanSende}
  submitLoading={submitting}
  {submitError}
  onsubmit={handleSubmit}
  onavbryt={handleAvbryt}
  showRegenerate={userHasEdited && !!autoBegrunnelseHtml}
  onregenerate={handleRegenerate}
  onuseredited={() => (userHasEdited = true)}
>
  <FormPageHeader
    tilbakeHref="/{prosjektId}/{sakId}"
    tilbakeTekst="Tilbake til saksmappe"
    eyebrow={isUpdateMode ? 'Oppdater svar' : 'Svar på fristkrav'}
    {prosjektNavn}
    {teNavn}
    {bhNavn}
    {saksnr}
    {tittel}
  />

  <!-- TEs fristkrav -->
  <FristSammendrag
    krevdDager={krav.krevdDager}
    begrunnelseHtml={krav.begrunnelseHtml}
    datoVarslet={krav.datoVarslet}
    datoFremsatt={krav.datoFremsatt}
  />

  <!-- Standpunkt-overgang -->
  <SectionHeading title="Byggherrens standpunkt" />

  <!-- Subsidiaer kontekst-banner -->
  {#if visSubsidiaerBanner}
    <div class="subsidiaer-banner" role="note">
      {#if domainConfig.erGrunnlagSubsidiaer}
        <p>
          Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel
          godkjennes.
        </p>
      {:else if domainConfig.erHelFristSubsidiaerPgaGrunnlag}
        <p>Grunnlaget ble varslet for sent (§32.2). Hele fristkravet behandles subsidiært.</p>
      {/if}
    </div>
  {/if}

  <!-- Port 1: Foreløpig varsel + Fremsatt krav -->
  {#if computed.visibility.showFristVarselOk}
    <FormSection>
      <SectionHeading title="Foreløpig varsel" paragrafRef="§ 33.4" />
      <p class="helptext">Ble varselet om fristforlengelse fremsatt uten ugrunnet opphold?</p>
      <SegmentedButtons
        options={preklusjonsOptions}
        selected={boolToSegment(fristVarselOk)}
        onselect={(v) => (fristVarselOk = v === 'ja')}
        size="sm"
      />
      {#if fristVarselOk === false}
        <Alert variant="warning">
          <strong>Preklusjon</strong> — Det foreløpige varselet vurderes som for sent. Kravet er tapt
          (§ 33.4).
        </Alert>
      {/if}
    </FormSection>
  {/if}

  {#if computed.visibility.showSpesifisertKravOk}
    <FormSection>
      <SectionHeading title="Fremsatt krav" paragrafRef="§ 33.6.1" />
      <p class="helptext">Ble kravet fremsatt uten ugrunnet opphold?</p>
      {#if computed.port1bErSubsidiaer}
        <div class="subsidiaer-markering">Subsidiært</div>
      {/if}
      <SegmentedButtons
        options={reduksjonsOptions}
        selected={boolToSegment(spesifisertKravOk)}
        onselect={(v) => (spesifisertKravOk = v === 'ja')}
        size="sm"
      />
      {#if spesifisertKravOk === false}
        <Alert variant="warning">
          <strong>Reduksjon</strong> — Det fremsatte kravet vurderes som for sent. Fristforlengelsen reduseres
          til det åpenbare (§ 33.6.1).
        </Alert>
      {/if}
    </FormSection>
  {/if}

  {#if computed.visibility.showForesporselSvarOk}
    <FormSection>
      <SectionHeading title="Svar på forespørsel" paragrafRef="§ 33.6.2" />
      <p class="helptext">Svarte TE på forespørsel om spesifisering uten ugrunnet opphold?</p>
      <SegmentedButtons
        options={preklusjonsOptions}
        selected={boolToSegment(foresporselSvarOk)}
        onselect={(v) => (foresporselSvarOk = v === 'ja')}
        size="sm"
      />
      {#if foresporselSvarOk === false}
        <Alert variant="warning">
          <strong>Preklusjon</strong> — Svaret vurderes som for sent. Kravet er tapt (§ 33.6.2).
        </Alert>
      {/if}
    </FormSection>
  {/if}

  <!-- Port 2: Årsakssammenheng -->
  <FormSection>
    <SectionHeading title="Årsakssammenheng" paragrafRef="§ 33.1" />
    <p class="helptext">
      Foreligger det en hindring på fremdriften som følge av det påberopte kontraktsforholdet?
    </p>
    {#if computed.port2ErSubsidiaer}
      <div class="subsidiaer-markering">Subsidiært</div>
    {/if}
    <SegmentedButtons
      options={hindringOptions}
      selected={boolToSegment(vilkarOppfylt)}
      onselect={(v) => (vilkarOppfylt = v === 'ja')}
    />
  </FormSection>

  <!-- Port 3: Utmåling -->
  {#if computed.visibility.showSendForesporsel}
    <FormSection>
      <Checkbox
        checked={sendForesporsel}
        label="Send forespørsel om spesifisering"
        paragrafRef="§ 33.6.2"
        description="Be TE spesifisere kravet med antall dager og begrunnelse."
        onchange={(v) => (sendForesporsel = v)}
      />
    </FormSection>
  {/if}

  {#if computed.showGodkjentDager && !sendForesporsel}
    <FormSection>
      <SectionHeading title="Utmåling" paragrafRef="§ 33.5" />
      <p class="helptext">
        Fristforlengelsen skal svare til den virkning kontraktsforholdet har hatt på fremdriften,
        herunder avbrudd, forskyvning til ugunstig årstid og samlet virkning av tidligere varslede
        forhold.
      </p>
      {#if computed.port3ErSubsidiaer}
        <div class="subsidiaer-markering">Subsidiært</div>
      {/if}
      {#if domainConfig.krevdDager > 0}
        <div class="krevd-linje">
          Krevd: <span class="krevd-dager">{domainConfig.krevdDager} dager</span>
        </div>
      {/if}
      <div class="field-dager">
        <NumberInput
          value={godkjentDager}
          label="Godkjent dager"
          suffix="dager"
          max={domainConfig.krevdDager > 0 ? domainConfig.krevdDager : undefined}
          onchange={(v) => (godkjentDager = v)}
        />
      </div>
    </FormSection>
  {/if}

  <!-- Konsekvens -->
  <FristKonsekvens
    prinsipaltResultat={computed.prinsipaltResultat}
    krevdDager={domainConfig.krevdDager}
    godkjentDager={godkjentDager ?? 0}
    visSubsidiaert={computed.visSubsidiaertResultat}
    subsidiaertResultat={computed.subsidiaertResultat}
    subsidiaerGodkjentDager={computed.visSubsidiaertResultat ? godkjentDager : undefined}
    {sendForesporsel}
    erRedusert={computed.erRedusert}
  />

  <!-- Forsering-risiko -->
  {#if !sendForesporsel && computed.prinsipaltResultat === 'avslatt'}
    <Alert variant="warning">
      <strong>§ 33.8 Forsering-risiko</strong> — Hvis avslaget er uberettiget, kan entreprenøren velge
      å anse det som et pålegg om forsering.
    </Alert>
  {/if}
</FormWithRightPanel>

<style>
  .subsidiaer-banner {
    background: var(--color-vekt-bg);
    border-left: 2px dashed var(--color-vekt);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    padding: var(--spacing-3) var(--spacing-4);
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-ink-secondary);
  }

  .subsidiaer-banner p {
    margin: 0;
  }

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

  .krevd-dager {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--color-ink);
  }

  .field-dager {
    max-width: 140px;
  }
</style>
