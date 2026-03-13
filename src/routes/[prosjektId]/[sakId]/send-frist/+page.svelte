<script lang="ts">
  import { page } from '$app/state';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import TeFristForm from '$lib/components/te-frist/TeFristForm.svelte';
  import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
  import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
  import type {
    SubmissionScenario,
    FristSubmissionDefaultsConfig,
  } from '$lib/domain/fristSubmissionDomain';

  import { PROJECT_META } from '$lib/constants/projectMeta';
  import PageLoadingShell from '$lib/components/shared/PageLoadingShell.svelte';
  import {
    isFristKravEvent,
    isFristKravSendtEvent,
    isGrunnlagEvent,
  } from '$lib/constants/eventTypes';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  const meta = $derived(prosjektId ? (PROJECT_META[prosjektId] ?? null) : null);

  const query = createCaseContextQuery(() => sakId);

  // Derive scenario from timeline and frist state
  interface FristRouteData {
    scenario: SubmissionScenario;
    existing: FristSubmissionDefaultsConfig['existing'] | undefined;
    existingVarselDato: string | undefined;
    entries: Array<{ rolle: 'TE'; versjon: number; html: string; dato?: string }>;
    grunnlagEventId: string;
    originalEventId: string | undefined;
    erSvarPaForesporsel: boolean;
  }

  const fristData: FristRouteData = $derived.by(() => {
    const timeline = query.data?.timeline;
    const state = query.data?.state;
    if (!timeline || !state)
      return {
        scenario: 'new' as SubmissionScenario,
        existing: undefined,
        existingVarselDato: undefined,
        entries: [],
        grunnlagEventId: '',
        originalEventId: undefined,
        erSvarPaForesporsel: false,
      };

    const frist = state.frist;
    const grunnlagEvent = timeline.find((e) => isGrunnlagEvent(e.type));

    // Check for BH foresporsel first
    if (frist?.har_bh_foresporsel) {
      const kravEvent = timeline.find((e) => isFristKravSendtEvent(e.type));
      return {
        scenario: 'foresporsel' as SubmissionScenario,
        existing: undefined,
        existingVarselDato: frist.frist_varsel?.dato_sendt,
        entries: [],
        grunnlagEventId: grunnlagEvent?.id ?? '',
        originalEventId: kravEvent?.id,
        erSvarPaForesporsel: true,
      };
    }

    // Check for existing krav events
    const kravEvent = timeline.find((e) => isFristKravEvent(e.type));

    if (kravEvent) {
      const eventData = kravEvent.data as Record<string, unknown> | undefined;
      const existingVarselType = eventData?.varsel_type as string | undefined;

      // If only a varsel was sent (not spesifisert), this is a spesifisering scenario
      if (existingVarselType === 'varsel') {
        return {
          scenario: 'spesifisering' as SubmissionScenario,
          existing: undefined,
          existingVarselDato: frist?.frist_varsel?.dato_sendt,
          entries: [
            {
              rolle: 'TE' as const,
              versjon: 1,
              html: (eventData?.begrunnelse as string) ?? '',
              dato: kravEvent.time,
            },
          ],
          grunnlagEventId: grunnlagEvent?.id ?? '',
          originalEventId: kravEvent.id,
          erSvarPaForesporsel: false,
        };
      }

      // Otherwise it's an edit of existing krav
      return {
        scenario: 'edit' as SubmissionScenario,
        existing: eventData as FristSubmissionDefaultsConfig['existing'],
        existingVarselDato: frist?.frist_varsel?.dato_sendt,
        entries: [
          {
            rolle: 'TE' as const,
            versjon: 1,
            html: (eventData?.begrunnelse as string) ?? '',
            dato: kravEvent.time,
          },
        ],
        grunnlagEventId: grunnlagEvent?.id ?? '',
        originalEventId: kravEvent.id,
        erSvarPaForesporsel: false,
      };
    }

    return {
      scenario: 'new' as SubmissionScenario,
      existing: undefined,
      existingVarselDato: undefined,
      entries: [],
      grunnlagEventId: grunnlagEvent?.id ?? '',
      originalEventId: undefined as string | undefined,
      erSvarPaForesporsel: false,
    };
  });

  const EYEBROW_LABELS: Record<SubmissionScenario, string> = {
    new: 'Nytt fristkrav',
    spesifisering: 'Fremsett krav',
    foresporsel: 'Svar på forespørsel',
    edit: 'Oppdater fristkrav',
  };

  const saksnr = $derived(1); // TODO: derive from case list position
  const tittel = $derived(query.data?.state?.sakstittel);
  const teNavn = $derived(query.data?.state?.entreprenor);
  const bhNavn = $derived(query.data?.state?.byggherre);

  let begrunnelseHtml = $state('');

  let formActions = $state<{
    submitLabel: string;
    kanSende: boolean;
    submitting: boolean;
    submitError: string;
    onsubmit: () => void;
    onavbryt: () => void;
  } | null>(null);

  // Pre-fill begrunnelse in edit mode
  let hasInitializedBegrunnelse = $state(false);

  $effect(() => {
    const eventData = fristData.existing as Record<string, unknown> | undefined;
    if (fristData.scenario === 'edit' && eventData?.begrunnelse && !hasInitializedBegrunnelse) {
      begrunnelseHtml = eventData.begrunnelse as string;
      hasInitializedBegrunnelse = true;
    }
  });
</script>

<PageLoadingShell loading={query.isLoading} error={query.isError}>
  <FormWithRightPanel
    entries={fristData.entries}
    bind:bhBegrunnelseHtml={begrunnelseHtml}
    editorRolle="TE"
    {teNavn}
    {bhNavn}
    submitLabel={formActions?.submitLabel}
    submitDisabled={!formActions?.kanSende}
    submitLoading={formActions?.submitting}
    submitError={formActions?.submitError}
    onsubmit={formActions?.onsubmit}
    onavbryt={formActions?.onavbryt}
  >
    <FormPageHeader
      tilbakeHref="/{prosjektId}/{sakId}"
      tilbakeTekst="Tilbake til saksmappe"
      eyebrow={EYEBROW_LABELS[fristData.scenario]}
      prosjektNavn={meta?.name}
      teNavn={meta?.te ?? teNavn}
      bhNavn={meta?.bh ?? bhNavn}
      {saksnr}
      {tittel}
    />

    <TeFristForm
      scenario={fristData.scenario}
      existing={fristData.existing}
      existingVarselDato={fristData.existingVarselDato}
      {prosjektId}
      {sakId}
      version={query.data?.version ?? 0}
      grunnlagEventId={fristData.grunnlagEventId}
      originalEventId={fristData.scenario !== 'new' ? fristData.originalEventId : undefined}
      erSvarPaForesporsel={fristData.erSvarPaForesporsel}
      bind:begrunnelseHtml
      onactions={(a) => (formActions = a)}
    />
  </FormWithRightPanel>
</PageLoadingShell>
