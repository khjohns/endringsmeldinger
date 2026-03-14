<script lang="ts">
  import { goto } from '$app/navigation';
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
  import { isHtmlEmpty } from '$lib/utils/formatters';

  import VederlagSammendrag from './VederlagSammendrag.svelte';
  import VederlagKonsekvens from './VederlagKonsekvens.svelte';
  import PreklusjonsVurdering from './PreklusjonsVurdering.svelte';
  import BeregningsmetodeVurdering from './BeregningsmetodeVurdering.svelte';
  import KravlinjeVurdering from './KravlinjeVurdering.svelte';
  import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
  import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';

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
    version: number;
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
    version,
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
    hovedkravVarsletITide?: boolean;
    riggVarsletITide?: boolean;
    produktivitetVarsletITide?: boolean;
    akseptererMetode?: boolean;
    oensketMetode?: VederlagsMetode;
    hovedkravVurdering?: BelopVurdering;
    hovedkravGodkjentBelop?: number;
    riggVurdering?: BelopVurdering;
    riggGodkjentBelop?: number;
    produktivitetVurdering?: BelopVurdering;
    produktivitetGodkjentBelop?: number;
    bhBegrunnelseHtml: string;
  }
  const dk = draftKey('svar-vederlag', sakId);
  const draft = loadDraft<VederlagResponseDraft>(dk);

  // --- Form state ---
  const initialDefaults = getDefaults({
    isUpdateMode,
    lastResponseEvent: lastResponseData,
  });

  // Port 1: Preklusjon
  let hovedkravVarsletITide = $state<boolean | undefined>(
    draft?.hovedkravVarsletITide ?? initialDefaults.hovedkravVarsletITide
  );
  let riggVarsletITide = $state<boolean | undefined>(
    draft?.riggVarsletITide ?? initialDefaults.riggVarsletITide
  );
  let produktivitetVarsletITide = $state<boolean | undefined>(
    draft?.produktivitetVarsletITide ?? initialDefaults.produktivitetVarsletITide
  );

  // Port 2: Metode
  let akseptererMetode = $state<boolean | undefined>(
    draft?.akseptererMetode ?? initialDefaults.akseptererMetode
  );
  let oensketMetode = $state<VederlagsMetode | undefined>(
    draft?.oensketMetode ?? initialDefaults.oensketMetode
  );

  // Port 3: Beløp
  let hovedkravVurdering = $state<BelopVurdering | undefined>(
    draft?.hovedkravVurdering ?? initialDefaults.hovedkravVurdering
  );
  let hovedkravGodkjentBelop = $state<number | undefined>(
    draft?.hovedkravGodkjentBelop ?? initialDefaults.hovedkravGodkjentBelop
  );
  let riggVurdering = $state<BelopVurdering | undefined>(
    draft?.riggVurdering ?? initialDefaults.riggVurdering
  );
  let riggGodkjentBelop = $state<number | undefined>(
    draft?.riggGodkjentBelop ?? initialDefaults.riggGodkjentBelop
  );
  let produktivitetVurdering = $state<BelopVurdering | undefined>(
    draft?.produktivitetVurdering ?? initialDefaults.produktivitetVurdering
  );
  let produktivitetGodkjentBelop = $state<number | undefined>(
    draft?.produktivitetGodkjentBelop ?? initialDefaults.produktivitetGodkjentBelop
  );

  // Port 4: Begrunnelse
  let bhBegrunnelseHtml = $state(draft?.bhBegrunnelseHtml ?? forrigeBegrunnelseHtml ?? '');

  // Submission
  let submitting = $state(false);
  let submitError = $state<string | null>(null);

  // Auto-save draft
  $effect(() => {
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

  // --- Validation ---
  const kanSende = $derived.by(() => {
    if (submitting) return false;
    // Port 1: Preklusjon fields must be answered when visible
    if (computed.harPreklusjonsSteg) {
      if (computed.har34_1_2_Preklusjon && hovedkravVarsletITide === undefined) return false;
      if (krav.harRiggKrav && riggVarsletITide === undefined) return false;
      if (krav.harProduktivitetKrav && produktivitetVarsletITide === undefined) return false;
    }
    // Port 2: Metode
    if (akseptererMetode === undefined) return false;
    if (akseptererMetode === false && !oensketMetode) return false;
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
</script>

<FormWithRightPanel
  entries={tidligereSvar}
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
    sumKrevd={computed.totalKrevdInklPrekludert}
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
    <PreklusjonsVurdering
      har34_1_2_Preklusjon={computed.har34_1_2_Preklusjon}
      harRiggKrav={krav.harRiggKrav}
      harProduktivitetKrav={krav.harProduktivitetKrav}
      {hovedkravVarsletITide}
      {riggVarsletITide}
      {produktivitetVarsletITide}
      onhovedkrav={(v) => (hovedkravVarsletITide = v)}
      onrigg={(v) => (riggVarsletITide = v)}
      onproduktivitet={(v) => (produktivitetVarsletITide = v)}
    />
  {/if}

  <!-- Port 2: Beregningsmetode -->
  <BeregningsmetodeVurdering
    teMetode={krav.metode}
    {akseptererMetode}
    {oensketMetode}
    onaksepterer={(v) => {
      akseptererMetode = v;
      if (v) oensketMetode = undefined;
    }}
    onoensket={(v) => (oensketMetode = v)}
  />

  <!-- Port 3: Per-kravlinje evaluering -->
  <KravlinjeVurdering
    title="Hovedkrav"
    paragrafRef="§34.1.1–34.1.2"
    krevdBelop={krav.hovedkravBelop}
    prekludert={computed.hovedkravPrekludert}
    vurdering={hovedkravVurdering}
    godkjentBelop={hovedkravGodkjentBelop}
    onvurdering={(v) => (hovedkravVurdering = v)}
    ongodkjentbelop={(v) => (hovedkravGodkjentBelop = v)}
  />

  {#if krav.harRiggKrav}
    <KravlinjeVurdering
      title="Rigg og drift"
      paragrafRef="§34.1.3"
      krevdBelop={krav.riggBelop}
      prekludert={computed.riggPrekludert}
      vurdering={riggVurdering}
      godkjentBelop={riggGodkjentBelop}
      onvurdering={(v) => (riggVurdering = v)}
      ongodkjentbelop={(v) => (riggGodkjentBelop = v)}
    />
  {/if}

  {#if krav.harProduktivitetKrav}
    <KravlinjeVurdering
      title="Produktivitetstap"
      paragrafRef="§34.1.3"
      krevdBelop={krav.produktivitetBelop}
      prekludert={computed.produktivitetPrekludert}
      vurdering={produktivitetVurdering}
      godkjentBelop={produktivitetGodkjentBelop}
      onvurdering={(v) => (produktivitetVurdering = v)}
      ongodkjentbelop={(v) => (produktivitetGodkjentBelop = v)}
    />
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
</style>
