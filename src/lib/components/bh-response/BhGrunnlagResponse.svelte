<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    erEndringMed32_2,
    erPaalegg,
    erSnuoperasjon,
    erPrekludert,
    getVerdictOptions,
    getBhUpdateDefaults,
    detekterEndringer,
    buildEventData,
  } from '$lib/domain/grunnlagDomain';
  import type { GrunnlagFormState, GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';
  import { submitEvent } from '$lib/api/events';
  import { useQueryClient } from '@tanstack/svelte-query';
  import type { GrunnlagResponsResultat } from '$lib/types/timeline';
  import SammendragKort from './SammendragKort.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';
  import KonsekvensCallout from './KonsekvensCallout.svelte';
  import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
  import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import Alert from '$lib/components/primitives/Alert.svelte';

  interface KravData {
    tittel: string;
    hovedkategori: string;
    underkategori?: string;
    hjemmelRef?: string;
    datoVarslet?: string;
    versjon: number;
    begrunnelseHtml: string;
  }

  interface TidligereSvar {
    rolle: 'TE' | 'BH';
    versjon: number;
    html: string;
    dato?: string;
  }

  interface Props {
    prosjektId: string;
    sakId: string;
    saksnr: number;
    krav: KravData;
    tidligereSvar?: TidligereSvar[];
    forrigeResultat?: GrunnlagResponsResultat;
    isUpdateMode?: boolean;
    forrigeVarsletITide?: boolean;
    forrigeBegrunnelseHtml?: string;
    lastResponseEventId?: string;
    grunnlagEventId?: string;
    teNavn?: string;
    bhNavn?: string;
    prosjektNavn?: string;
  }

  let {
    prosjektId,
    sakId,
    saksnr,
    krav,
    tidligereSvar = [],
    forrigeResultat,
    isUpdateMode = false,
    forrigeVarsletITide,
    forrigeBegrunnelseHtml,
    lastResponseEventId,
    grunnlagEventId = '',
    teNavn,
    bhNavn,
    prosjektNavn,
  }: Props = $props();

  const queryClient = useQueryClient();

  // --- Form state (pre-filled in update mode) ---
  const updateDefaults = $derived.by(() => {
    if (!isUpdateMode || !forrigeResultat) return null;
    return getBhUpdateDefaults({
      forrigeResultat,
      forrigeVarsletITide,
      forrigeBegrunnelseHtml,
    });
  });

  let varsletITide = $state<boolean | undefined>(undefined);
  let resultat = $state<string | undefined>(undefined);
  let bhBegrunnelseHtml = $state('');
  let submitting = $state(false);
  let submitError = $state<string | null>(null);
  let hasInitialized = $state(false);

  // Pre-fill once when updateDefaults becomes available
  $effect(() => {
    if (updateDefaults && !hasInitialized) {
      varsletITide = updateDefaults.varsletITide;
      resultat = updateDefaults.resultat;
      bhBegrunnelseHtml = updateDefaults.begrunnelse;
      hasInitialized = true;
    }
  });

  // --- Domain config ---
  const domainConfig: GrunnlagDomainConfig = $derived({
    grunnlagEvent: {
      hovedkategori: krav.hovedkategori,
      underkategori: krav.underkategori,
    },
    isUpdateMode,
    forrigeResultat,
    harSubsidiaereSvar: false,
  });

  // --- Derived ---
  const visVarsling = $derived(erEndringMed32_2(domainConfig.grunnlagEvent));
  const visFrafalt = $derived(erPaalegg(domainConfig.grunnlagEvent));

  const formState: GrunnlagFormState = $derived({
    varsletITide: varsletITide ?? true,
    resultat,
    resultatError: false,
    begrunnelse: bhBegrunnelseHtml,
    begrunnelseValidationError: undefined,
  });

  const prekludert = $derived(erPrekludert(formState, domainConfig));
  const snuoperasjon = $derived(erSnuoperasjon(formState, domainConfig));

  const verdictOptions = $derived(getVerdictOptions(domainConfig));

  // Change detection in update mode
  const endringsInfo = $derived.by(() => {
    if (!isUpdateMode || !forrigeResultat) return null;
    return detekterEndringer(
      { resultat, varsletITide: varsletITide ?? true, begrunnelse: bhBegrunnelseHtml },
      {
        resultat: forrigeResultat,
        varsletITide: forrigeVarsletITide,
        begrunnelse: forrigeBegrunnelseHtml,
      }
    );
  });

  // Build begrunnelse entries for thread panel
  const begrunnelseEntries = $derived.by(() => {
    const entries: Array<{
      rolle: 'TE' | 'BH';
      versjon: number;
      html: string;
      dato?: string;
    }> = [];

    for (const svar of tidligereSvar) {
      entries.push({
        rolle: svar.rolle,
        versjon: svar.versjon,
        html: svar.html,
        dato: svar.dato,
      });
    }

    entries.push({
      rolle: 'TE',
      versjon: krav.versjon,
      html: krav.begrunnelseHtml,
    });

    return entries;
  });

  // Validation
  const kanSende = $derived.by(() => {
    if (!resultat) return false;
    if (visVarsling && varsletITide === undefined) return false;
    if (submitting) return false;
    return true;
  });

  async function handleSubmit() {
    if (!kanSende) return;
    submitting = true;
    submitError = null;

    try {
      const eventData = buildEventData(formState, {
        ...domainConfig,
        grunnlagEventId,
        lastResponseEventId,
      });

      const eventType = isUpdateMode ? 'respons_grunnlag_oppdatert' : 'respons_grunnlag';

      await submitEvent(sakId, eventType, eventData);

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
    eyebrow={isUpdateMode ? 'Oppdater svar' : 'Svar på grunnlag'}
    {prosjektNavn}
    {teNavn}
    {bhNavn}
    {saksnr}
    tittel={krav.tittel}
  />

  <!-- Kontraktsforhold -->
  <SammendragKort
    hideHeader
    tittel={krav.tittel}
    hovedkategori={krav.hovedkategori}
    underkategori={krav.underkategori}
    hjemmelRef={krav.hjemmelRef}
    datoVarslet={krav.datoVarslet}
    begrunnelseHtml={krav.begrunnelseHtml}
    versjon={krav.versjon}
  />

  <!-- Standpunkt — overgang fra TE-henvendelse til BH-svar -->
  <SectionHeading title="Byggherrens standpunkt" />

  <!-- Varsling §32.2 -->
  {#if visVarsling}
    <FormSection>
      <SectionHeading title="Varsling" paragrafRef="§32.2" />
      <p class="helptext">Ble varselet sendt uten ugrunnet opphold?</p>
      <SegmentedButtons
        options={[
          { value: 'ja', label: 'Ja, i tide' },
          { value: 'nei', label: 'Nei, prekludert' },
        ]}
        selected={varsletITide === undefined ? undefined : varsletITide ? 'ja' : 'nei'}
        onselect={(v) => (varsletITide = v === 'ja')}
        size="sm"
      />
      {#if varsletITide === false}
        <Alert variant="warning">
          <strong>Preklusjon</strong> — Varselet vurderes som for sent. Grunnlaget kan fortsatt vurderes
          subsidiært.
        </Alert>
      {/if}
      {#if endringsInfo}
        {@const varslingEndring = endringsInfo.endringer.find((e) => e.felt === 'varsletITide')}
        {#if varslingEndring}
          <Alert variant={varslingEndring.type === 'frafaller_innsigelse' ? 'info' : 'warning'}>
            {varslingEndring.beskrivelse}
          </Alert>
        {/if}
      {/if}
    </FormSection>
  {/if}

  <!-- Resultat -->
  <FormSection>
    <SectionHeading title="Resultat" />
    <SegmentedButtons
      options={verdictOptions.map((o) => ({
        value: o.value,
        label: o.label,
        icon: o.icon,
        colorScheme: o.colorScheme,
      }))}
      selected={resultat}
      onselect={(v) => (resultat = v)}
    />
    {#if endringsInfo}
      {@const resultatEndring = endringsInfo.endringer.find((e) => e.felt === 'resultat')}
      {#if resultatEndring}
        <Alert variant="warning">
          <strong>{resultatEndring.type === 'snuoperasjon' ? 'Snuoperasjon' : 'Endring'}</strong> — {resultatEndring.beskrivelse}
        </Alert>
      {/if}
    {/if}
  </FormSection>

  <!-- Konsekvens-callout -->
  <KonsekvensCallout
    {resultat}
    erPrekludert={prekludert}
    erPaalegg={visFrafalt}
    erSnuoperasjon={snuoperasjon}
  />
</FormWithRightPanel>
