<script lang="ts">
  import { goto } from '$app/navigation';
  import { beregnAlt, buildEventData, getDefaults } from '$lib/domain/fristDomain';
  import type { FristFormState, FristDomainConfig } from '$lib/domain/fristDomain';
  import type { FristTilstand, EventType } from '$lib/types/timeline';
  import { submitEvent } from '$lib/api/events';
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

  // --- Form state (initialized from domain defaults) ---
  const initialDefaults = getDefaults({
    krevdDager: domainConfig.krevdDager,
    isUpdateMode,
    lastResponseEvent: lastResponseData,
    fristTilstand,
  });

  // Port 1: Foreløpig varsel + Fremsatt krav
  let fristVarselOk = $state<boolean>(initialDefaults.fristVarselOk);
  let spesifisertKravOk = $state<boolean>(initialDefaults.spesifisertKravOk);
  let foresporselSvarOk = $state<boolean>(initialDefaults.foresporselSvarOk);

  // Port 2: Årsakssammenheng
  let vilkarOppfylt = $state<boolean>(initialDefaults.vilkarOppfylt);

  // Port 3: Utmåling
  let sendForesporsel = $state<boolean>(initialDefaults.sendForesporsel);
  let godkjentDager = $state<number>(initialDefaults.godkjentDager);

  // Begrunnelse
  let bhBegrunnelseHtml = $state(forrigeBegrunnelseHtml ?? '');

  // Submission
  let submitting = $state(false);
  let submitError = $state<string | null>(null);

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

  // --- Subsidiary context ---
  const visSubsidiaerBanner = $derived(
    domainConfig.erGrunnlagSubsidiaer || domainConfig.erHelFristSubsidiaerPgaGrunnlag
  );

  // Begrunnelse entries for thread panel
  const begrunnelseEntries = $derived([...tidligereSvar]);

  // --- Validation ---
  const kanSende = $derived(!submitting);

  // --- Auto begrunnelse ---
  function genererAutoBegrunnelse(): string {
    const r = computed.prinsipaltResultat;
    if (sendForesporsel) return 'Forespørsel om spesifisering sendt (§ 33.6.2).';
    if (r === 'godkjent')
      return `Fristforlengelse godkjent: ${godkjentDager} av ${domainConfig.krevdDager} dager.`;
    if (r === 'delvis_godkjent')
      return `Fristforlengelse delvis godkjent: ${godkjentDager} av ${domainConfig.krevdDager} dager.`;
    return `Fristforlengelse avslått.`;
  }

  // --- Submit ---
  async function handleSubmit() {
    if (!kanSende) return;
    submitting = true;
    submitError = null;

    try {
      const autoBegrunnelse = genererAutoBegrunnelse();
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

      await submitEvent(sakId, eventType as EventType, data);
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
        selected={fristVarselOk ? 'ja' : 'nei'}
        onselect={(v) => (fristVarselOk = v === 'ja')}
        size="sm"
      />
      {#if !fristVarselOk}
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
      <SegmentedButtons
        options={reduksjonsOptions}
        selected={spesifisertKravOk ? 'ja' : 'nei'}
        onselect={(v) => (spesifisertKravOk = v === 'ja')}
        size="sm"
      />
      {#if !spesifisertKravOk}
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
        selected={foresporselSvarOk ? 'ja' : 'nei'}
        onselect={(v) => (foresporselSvarOk = v === 'ja')}
        size="sm"
      />
      {#if !foresporselSvarOk}
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
      selected={vilkarOppfylt ? 'ja' : 'nei'}
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
      <div class="field-amount">
        <NumberInput
          value={godkjentDager}
          label="Godkjent dager"
          suffix="dager"
          max={domainConfig.krevdDager > 0 ? domainConfig.krevdDager : undefined}
          onchange={(v) => (godkjentDager = v ?? 0)}
        />
      </div>
    </FormSection>
  {/if}

  <!-- Konsekvens -->
  <FristKonsekvens
    prinsipaltResultat={computed.prinsipaltResultat}
    krevdDager={domainConfig.krevdDager}
    {godkjentDager}
    visSubsidiaert={computed.visSubsidiaertResultat}
    subsidiaertResultat={computed.subsidiaertResultat}
    subsidiaerGodkjentDager={computed.visSubsidiaertResultat ? godkjentDager : undefined}
    subsidiaerTriggers={computed.subsidiaerTriggers}
    {sendForesporsel}
    erRedusert={computed.erRedusert}
  />
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
</style>
