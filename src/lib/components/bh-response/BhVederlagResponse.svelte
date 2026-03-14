<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    beregnAlt,
    buildEventData,
    getDefaults,
    erSubsidiaer as erSubsidiaerFn,
    erHelVederlagSubsidiaerPgaGrunnlag,
    erKravlinjeGyldig,
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

  // Preklusjonslinjer for data-drevet PreklusjonsVurdering
  const preklusjonsLinjer = $derived.by(() => {
    const linjer: Array<{ key: string; label: string; value: boolean | undefined }> = [];
    if (computed.har34_1_2_Preklusjon) {
      linjer.push({ key: 'hovedkrav', label: 'Hovedkrav (§34.1.2)', value: hovedkravVarsletITide });
    }
    if (krav.harRiggKrav) {
      linjer.push({ key: 'rigg', label: 'Rigg og drift (§34.1.3)', value: riggVarsletITide });
    }
    if (krav.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        label: 'Produktivitetstap (§34.1.3)',
        value: produktivitetVarsletITide,
      });
    }
    return linjer;
  });

  function handlePreklusjon(key: string, value: boolean) {
    if (key === 'hovedkrav') hovedkravVarsletITide = value;
    else if (key === 'rigg') riggVarsletITide = value;
    else produktivitetVarsletITide = value;
  }

  // Kravlinjer for data-drevet KravlinjeVurdering
  interface KravlinjeItem {
    key: string;
    title: string;
    paragrafRef: string;
    krevdBelop: number | undefined;
    prekludert: boolean;
    vurdering: BelopVurdering | undefined;
    godkjentBelop: number | undefined;
  }

  const kravlinjer = $derived.by(() => {
    const linjer: KravlinjeItem[] = [
      {
        key: 'hovedkrav',
        title: 'Hovedkrav',
        paragrafRef: '§34.1.1–34.1.2',
        krevdBelop: krav.hovedkravBelop,
        prekludert: computed.hovedkravPrekludert,
        vurdering: hovedkravVurdering,
        godkjentBelop: hovedkravGodkjentBelop,
      },
    ];
    if (krav.harRiggKrav) {
      linjer.push({
        key: 'rigg',
        title: 'Rigg og drift',
        paragrafRef: '§34.1.3',
        krevdBelop: krav.riggBelop,
        prekludert: computed.riggPrekludert,
        vurdering: riggVurdering,
        godkjentBelop: riggGodkjentBelop,
      });
    }
    if (krav.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        title: 'Produktivitetstap',
        paragrafRef: '§34.1.3',
        krevdBelop: krav.produktivitetBelop,
        prekludert: computed.produktivitetPrekludert,
        vurdering: produktivitetVurdering,
        godkjentBelop: produktivitetGodkjentBelop,
      });
    }
    return linjer;
  });

  function handleKravlinjeVurdering(key: string, v: BelopVurdering) {
    if (key === 'hovedkrav') hovedkravVurdering = v;
    else if (key === 'rigg') riggVurdering = v;
    else produktivitetVurdering = v;
  }

  function handleKravlinjeBelop(key: string, v: number | undefined) {
    if (key === 'hovedkrav') hovedkravGodkjentBelop = v;
    else if (key === 'rigg') riggGodkjentBelop = v;
    else produktivitetGodkjentBelop = v;
  }

  // --- Validation ---
  const kanSende = $derived.by(() => {
    if (submitting) return false;
    // Port 1: Preklusjon — alle synlige linjer må besvares
    if (computed.harPreklusjonsSteg && preklusjonsLinjer.some((l) => l.value === undefined))
      return false;
    // Port 2: Metode
    if (akseptererMetode === undefined) return false;
    if (akseptererMetode === false && !oensketMetode) return false;
    // Port 3: Beløp — alle kravlinjer må ha gyldig vurdering
    if (kravlinjer.some((l) => !erKravlinjeGyldig(l.vurdering, l.godkjentBelop))) return false;
    // Port 4: Begrunnelse
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
    <PreklusjonsVurdering linjer={preklusjonsLinjer} onchange={handlePreklusjon} />
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
  {#each kravlinjer as linje (linje.key)}
    <KravlinjeVurdering
      title={linje.title}
      paragrafRef={linje.paragrafRef}
      krevdBelop={linje.krevdBelop}
      prekludert={linje.prekludert}
      vurdering={linje.vurdering}
      godkjentBelop={linje.godkjentBelop}
      onvurdering={(v) => handleKravlinjeVurdering(linje.key, v)}
      ongodkjentbelop={(v) => handleKravlinjeBelop(linje.key, v)}
    />
  {/each}

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
