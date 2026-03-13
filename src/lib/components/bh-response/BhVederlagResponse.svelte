<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    beregnAlt,
    buildEventData,
    getDefaults,
    erSubsidiaer as erSubsidiaerFn,
    erHelVederlagSubsidiaerPgaGrunnlag,
  } from '$lib/domain/vederlagDomain';
  import type {
    VederlagFormState,
    VederlagDomainConfig,
    VederlagLastResponseData,
    BelopVurdering,
  } from '$lib/domain/vederlagDomain';
  import type { VederlagsMetode, EventType } from '$lib/types/timeline';
  import { submitEvent } from '$lib/api/events';
  import { draftKey, loadDraft, saveDraft, clearDraft } from '$lib/utils/draft';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { isHtmlEmpty, formatCurrency } from '$lib/utils/formatters';
  import {
    getVederlagsmetodeShortLabel,
    VEDERLAGSMETODER_OPTIONS,
  } from '$lib/constants/paymentMethods';

  import VederlagSammendrag from './VederlagSammendrag.svelte';
  import VederlagKonsekvens from './VederlagKonsekvens.svelte';
  import SegmentedButtons from './SegmentedButtons.svelte';
  import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
  import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
  import FormSection from '$lib/components/shared/FormSection.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import NumberInput from '$lib/components/primitives/NumberInput.svelte';

  interface KravData {
    metode?: VederlagsMetode;
    hovedkravBelop: number;
    riggBelop?: number;
    produktivitetBelop?: number;
    harRiggKrav: boolean;
    harProduktivitetKrav: boolean;
    begrunnelseHtml?: string;
  }

  interface Props {
    prosjektId: string;
    sakId: string;
    saksnr: number;
    tittel: string;
    krav: KravData;
    domainConfig: VederlagDomainConfig;
    tidligereSvar?: Array<{ rolle: 'TE' | 'BH'; versjon: number; html: string; dato?: string }>;
    isUpdateMode?: boolean;
    lastResponseData?: VederlagLastResponseData;
    forrigeBegrunnelseHtml?: string;
    vederlagKravId: string;
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
    tidligereSvar = [],
    isUpdateMode = false,
    lastResponseData,
    forrigeBegrunnelseHtml,
    vederlagKravId,
    teNavn,
    bhNavn,
    prosjektNavn,
  }: Props = $props();

  const queryClient = useQueryClient();

  // --- Draft ---
  interface VederlagResponseDraft {
    hovedkravVarsletITide: boolean;
    riggVarsletITide: boolean;
    produktivitetVarsletITide: boolean;
    akseptererMetode: boolean;
    oensketMetode?: VederlagsMetode;
    hovedkravVurdering: BelopVurdering;
    hovedkravGodkjentBelop?: number;
    riggVurdering?: BelopVurdering;
    riggGodkjentBelop?: number;
    produktivitetVurdering?: BelopVurdering;
    produktivitetGodkjentBelop?: number;
    bhBegrunnelseHtml: string;
  }
  const dk = draftKey('svar-vederlag', sakId);
  const draft = loadDraft<VederlagResponseDraft>(dk);
  let draftReady = $state(false);

  // --- Form state ---
  const defaults = $derived(
    getDefaults({
      isUpdateMode,
      lastResponseEvent: lastResponseData,
    })
  );

  // Port 1: Preklusjon
  let hovedkravVarsletITide = $state<boolean>(draft?.hovedkravVarsletITide ?? true);
  let riggVarsletITide = $state<boolean>(draft?.riggVarsletITide ?? true);
  let produktivitetVarsletITide = $state<boolean>(draft?.produktivitetVarsletITide ?? true);

  // Port 2: Metode
  let akseptererMetode = $state<boolean>(draft?.akseptererMetode ?? true);
  let oensketMetode = $state<VederlagsMetode | undefined>(draft?.oensketMetode ?? undefined);

  // Port 3: Beløp
  let hovedkravVurdering = $state<BelopVurdering>(draft?.hovedkravVurdering ?? 'godkjent');
  let hovedkravGodkjentBelop = $state<number | undefined>(
    draft?.hovedkravGodkjentBelop ?? undefined
  );
  let riggVurdering = $state<BelopVurdering | undefined>(draft?.riggVurdering ?? undefined);
  let riggGodkjentBelop = $state<number | undefined>(draft?.riggGodkjentBelop ?? undefined);
  let produktivitetVurdering = $state<BelopVurdering | undefined>(
    draft?.produktivitetVurdering ?? undefined
  );
  let produktivitetGodkjentBelop = $state<number | undefined>(
    draft?.produktivitetGodkjentBelop ?? undefined
  );

  // Port 4: Begrunnelse
  let bhBegrunnelseHtml = $state(draft?.bhBegrunnelseHtml ?? '');

  // Submission
  let submitting = $state(false);
  let submitError = $state<string | null>(null);
  let hasInitialized = $state(!!draft);

  // Pre-fill in update mode (skipped if draft loaded)
  $effect(() => {
    if (defaults && !hasInitialized) {
      hovedkravVarsletITide = defaults.hovedkravVarsletITide;
      riggVarsletITide = defaults.riggVarsletITide;
      produktivitetVarsletITide = defaults.produktivitetVarsletITide;
      akseptererMetode = defaults.akseptererMetode;
      oensketMetode = defaults.oensketMetode;
      hovedkravVurdering = defaults.hovedkravVurdering;
      hovedkravGodkjentBelop = defaults.hovedkravGodkjentBelop;
      riggVurdering = defaults.riggVurdering;
      riggGodkjentBelop = defaults.riggGodkjentBelop;
      produktivitetVurdering = defaults.produktivitetVurdering;
      produktivitetGodkjentBelop = defaults.produktivitetGodkjentBelop;
      if (forrigeBegrunnelseHtml) bhBegrunnelseHtml = forrigeBegrunnelseHtml;
      hasInitialized = true;
      draftReady = true;
    }
  });

  onMount(() => {
    draftReady = true;
  });

  // Auto-save draft
  $effect(() => {
    if (!draftReady) return;
    saveDraft(dk, {
      hovedkravVarsletITide,
      riggVarsletITide,
      produktivitetVarsletITide,
      akseptererMetode,
      oensketMetode,
      hovedkravVurdering,
      hovedkravGodkjentBelop,
      riggVurdering,
      riggGodkjentBelop,
      produktivitetVurdering,
      produktivitetGodkjentBelop,
      bhBegrunnelseHtml,
    });
  });

  // --- Domain computations ---
  const formState: VederlagFormState = $derived({
    hovedkravVarsletITide,
    riggVarsletITide,
    produktivitetVarsletITide,
    akseptererMetode,
    oensketMetode,
    holdTilbake: false,
    hovedkravVurdering,
    hovedkravGodkjentBelop,
    riggVurdering,
    riggGodkjentBelop,
    produktivitetVurdering,
    produktivitetGodkjentBelop,
    begrunnelse: bhBegrunnelseHtml,
  });

  const computed = $derived(beregnAlt(formState, domainConfig));

  // --- UI visibility ---
  const subsidiærKontekst = $derived(erSubsidiaerFn(domainConfig));
  const subsidiærGrunn = $derived.by(() => {
    if (domainConfig.grunnlagStatus === 'avslatt') return 'grunnlag_avslatt' as const;
    if (erHelVederlagSubsidiaerPgaGrunnlag(domainConfig)) return 'grunnlag_32_2' as const;
    return null;
  });

  // Kravlinjer for sammendrag
  const sammendragKravlinjer = $derived.by(() => {
    const linjer: Array<{ label: string; belop: number }> = [];
    linjer.push({ label: 'Hovedkrav', belop: krav.hovedkravBelop });
    if (krav.harRiggKrav && krav.riggBelop) {
      linjer.push({ label: 'Rigg og drift', belop: krav.riggBelop });
    }
    if (krav.harProduktivitetKrav && krav.produktivitetBelop) {
      linjer.push({ label: 'Produktivitetstap', belop: krav.produktivitetBelop });
    }
    return linjer;
  });

  const sumKrevd = $derived(computed.totalKrevdInklPrekludert);

  // Begrunnelse entries for thread panel
  const begrunnelseEntries = $derived.by(() => {
    const entries: Array<{ rolle: 'TE' | 'BH'; versjon: number; html: string; dato?: string }> = [];
    for (const svar of tidligereSvar) {
      entries.push(svar);
    }
    return entries;
  });

  // Metode-alternativer (ekskluder TEs valgte)
  const metodeAlternativer = $derived(
    VEDERLAGSMETODER_OPTIONS.filter((o) => o.value && o.value !== krav.metode).map((o) => ({
      value: o.value,
      label: o.label,
    }))
  );

  // --- Validation ---
  const kanSende = $derived.by(() => {
    if (submitting) return false;
    if (!akseptererMetode && !oensketMetode) return false;
    if (!hovedkravVurdering) return false;
    if (
      hovedkravVurdering === 'delvis' &&
      (hovedkravGodkjentBelop === undefined || hovedkravGodkjentBelop === null)
    )
      return false;
    if (krav.harRiggKrav) {
      if (!riggVurdering) return false;
      if (
        riggVurdering === 'delvis' &&
        (riggGodkjentBelop === undefined || riggGodkjentBelop === null)
      )
        return false;
    }
    if (krav.harProduktivitetKrav) {
      if (!produktivitetVurdering) return false;
      if (
        produktivitetVurdering === 'delvis' &&
        (produktivitetGodkjentBelop === undefined || produktivitetGodkjentBelop === null)
      )
        return false;
    }
    if (isHtmlEmpty(bhBegrunnelseHtml)) return false;
    return true;
  });

  // --- Submit ---
  async function handleSubmit() {
    if (!kanSende) return;
    submitting = true;
    submitError = null;

    try {
      const { eventType, data } = buildEventData(
        formState,
        domainConfig,
        computed,
        {
          vederlagKravId,
          lastResponseEventId: lastResponseData?.eventId,
          isUpdateMode,
        },
        '',
        computed.subsidiaerTriggers
      );

      await submitEvent(sakId, eventType as EventType, data);
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
  const vurderingOptions = [
    { value: 'godkjent', label: 'Godkjent', icon: 'check' as const, colorScheme: 'green' as const },
    { value: 'delvis', label: 'Delvis godkjent' },
    { value: 'avslatt', label: 'Avslått', icon: 'cross' as const, colorScheme: 'red' as const },
  ];

  const preklusjonsOptions = [
    { value: 'ja', label: 'Ja, i tide' },
    { value: 'nei', label: 'Nei, prekludert', colorScheme: 'red' as const },
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
    eyebrow={isUpdateMode ? 'Oppdater svar' : 'Svar på vederlagskrav'}
    {prosjektNavn}
    {teNavn}
    {bhNavn}
    {saksnr}
    {tittel}
  />

  <!-- TE's vederlagskrav -->
  <VederlagSammendrag
    metode={krav.metode}
    kravlinjer={sammendragKravlinjer}
    {sumKrevd}
    begrunnelseHtml={krav.begrunnelseHtml}
  />

  <!-- Standpunkt-overgang -->
  <SectionHeading title="Byggherrens standpunkt" />

  <!-- Subsidiær kontekst-banner -->
  {#if subsidiærKontekst}
    <div class="subsidiaer-banner" role="note">
      {#if subsidiærGrunn === 'grunnlag_avslatt'}
        <p>
          Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel
          godkjennes.
        </p>
      {:else if subsidiærGrunn === 'grunnlag_32_2'}
        <p>Grunnlaget ble varslet for sent (§32.2). Hele vederlagskravet behandles subsidiært.</p>
      {/if}
    </div>
  {/if}

  <!-- Port 1: Preklusjon -->
  {#if computed.harPreklusjonsSteg}
    <FormSection>
      <SectionHeading title="Preklusjon" paragrafRef="§34.1.2 / §34.1.3" />
      <p class="helptext">Er kravene varslet innen kontraktens varslingsfrister?</p>

      {#if computed.har34_1_2_Preklusjon}
        <div class="preklusjons-rad">
          <span class="preklusjons-label">Hovedkrav (§34.1.2)</span>
          <SegmentedButtons
            options={preklusjonsOptions}
            selected={hovedkravVarsletITide ? 'ja' : 'nei'}
            onselect={(v) => (hovedkravVarsletITide = v === 'ja')}
            size="sm"
          />
        </div>
      {/if}

      {#if krav.harRiggKrav}
        <div class="preklusjons-rad">
          <span class="preklusjons-label">Rigg og drift (§34.1.3)</span>
          <SegmentedButtons
            options={preklusjonsOptions}
            selected={riggVarsletITide ? 'ja' : 'nei'}
            onselect={(v) => (riggVarsletITide = v === 'ja')}
            size="sm"
          />
        </div>
      {/if}

      {#if krav.harProduktivitetKrav}
        <div class="preklusjons-rad">
          <span class="preklusjons-label">Produktivitetstap (§34.1.3)</span>
          <SegmentedButtons
            options={preklusjonsOptions}
            selected={produktivitetVarsletITide ? 'ja' : 'nei'}
            onselect={(v) => (produktivitetVarsletITide = v === 'ja')}
            size="sm"
          />
        </div>
      {/if}
    </FormSection>
  {/if}

  <!-- Port 2: Beregningsmetode -->
  <FormSection>
    <SectionHeading title="Beregningsmetode" paragrafRef="§34.2" />
    <p class="helptext">
      TE krever {getVederlagsmetodeShortLabel(krav.metode)?.toLowerCase() ?? 'ukjent metode'}.
      Aksepterer du beregningsmetoden?
    </p>
    <SegmentedButtons
      options={[
        { value: 'ja', label: 'Ja' },
        { value: 'nei', label: 'Nei' },
      ]}
      selected={akseptererMetode ? 'ja' : 'nei'}
      onselect={(v) => {
        akseptererMetode = v === 'ja';
        if (v === 'ja') oensketMetode = undefined;
      }}
      size="sm"
    />
    {#if !akseptererMetode}
      <div class="foretrukket-metode">
        <span class="foretrukket-label">Foretrukket metode:</span>
        <SegmentedButtons
          options={metodeAlternativer}
          selected={oensketMetode}
          onselect={(v) => (oensketMetode = v as VederlagsMetode)}
          size="sm"
        />
      </div>
    {/if}
  </FormSection>

  <!-- Port 3: Per-kravlinje evaluering -->
  <FormSection>
    <SectionHeading title="Hovedkrav" paragrafRef="§34.1.1–34.1.2" />
    {#if computed.hovedkravPrekludert}
      <div class="subsidiaer-markering">Subsidiært</div>
    {/if}
    <div class="krevd-linje">
      Krevd: <span class="krevd-belop">{formatCurrency(krav.hovedkravBelop)}</span>
    </div>
    <SegmentedButtons
      options={vurderingOptions}
      selected={hovedkravVurdering}
      onselect={(v) => (hovedkravVurdering = v as BelopVurdering)}
    />
    {#if hovedkravVurdering === 'delvis'}
      <div class="field-amount">
        <NumberInput
          value={hovedkravGodkjentBelop ?? null}
          label="Godkjent beløp"
          suffix="kr"
          max={krav.hovedkravBelop}
          referenceValue={krav.hovedkravBelop}
          onchange={(v) => (hovedkravGodkjentBelop = v ?? undefined)}
        />
      </div>
    {/if}
  </FormSection>

  {#if krav.harRiggKrav}
    <FormSection>
      <SectionHeading title="Rigg og drift" paragrafRef="§34.1.3" />
      {#if computed.riggPrekludert}
        <div class="subsidiaer-markering">Subsidiært</div>
      {/if}
      <div class="krevd-linje">
        Krevd: <span class="krevd-belop">{formatCurrency(krav.riggBelop)}</span>
      </div>
      <SegmentedButtons
        options={vurderingOptions}
        selected={riggVurdering}
        onselect={(v) => (riggVurdering = v as BelopVurdering)}
      />
      {#if riggVurdering === 'delvis'}
        <div class="field-amount">
          <NumberInput
            value={riggGodkjentBelop ?? null}
            label="Godkjent beløp"
            suffix="kr"
            max={krav.riggBelop}
            referenceValue={krav.riggBelop}
            onchange={(v) => (riggGodkjentBelop = v ?? undefined)}
          />
        </div>
      {/if}
    </FormSection>
  {/if}

  {#if krav.harProduktivitetKrav}
    <FormSection>
      <SectionHeading title="Produktivitetstap" paragrafRef="§34.1.3" />
      {#if computed.produktivitetPrekludert}
        <div class="subsidiaer-markering">Subsidiært</div>
      {/if}
      <div class="krevd-linje">
        Krevd: <span class="krevd-belop">{formatCurrency(krav.produktivitetBelop)}</span>
      </div>
      <SegmentedButtons
        options={vurderingOptions}
        selected={produktivitetVurdering}
        onselect={(v) => (produktivitetVurdering = v as BelopVurdering)}
      />
      {#if produktivitetVurdering === 'delvis'}
        <div class="field-amount">
          <NumberInput
            value={produktivitetGodkjentBelop ?? null}
            label="Godkjent beløp"
            suffix="kr"
            max={krav.produktivitetBelop}
            referenceValue={krav.produktivitetBelop}
            onchange={(v) => (produktivitetGodkjentBelop = v ?? undefined)}
          />
        </div>
      {/if}
    </FormSection>
  {/if}

  <!-- Konsekvens -->
  <VederlagKonsekvens
    prinsipaltResultat={computed.prinsipaltResultat}
    totalKrevd={computed.totalKrevdInklPrekludert}
    totalGodkjent={computed.totalGodkjent}
    visSubsidiaert={computed.visSubsidiaertResultat}
    subsidiaertResultat={computed.subsidiaertResultat}
    totalGodkjentSubsidiaert={computed.totalGodkjentInklPrekludert}
    subsidiaerTriggers={computed.subsidiaerTriggers}
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
