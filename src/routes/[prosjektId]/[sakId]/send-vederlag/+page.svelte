<script lang="ts">
  import { page } from '$app/state';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import TeVederlagForm from '$lib/components/te-vederlag/TeVederlagForm.svelte';
  import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
  import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
  import InlineBegrunnelse from '$lib/components/shared/InlineBegrunnelse.svelte';
  import type {
    VederlagSubmissionScenario,
    VederlagSubmissionDefaultsConfig,
  } from '$lib/domain/vederlagSubmissionDomain';
  import { sporBestemmelser } from '$lib/utils/bestemmelser';

  import { projectToMeta } from '$lib/constants/projectMeta';
  import { projectStore } from '$lib/stores/project.svelte';
  import PageLoadingShell from '$lib/components/shared/PageLoadingShell.svelte';
  import { isVederlagKravEvent, isGrunnlagEvent } from '$lib/constants/eventTypes';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  const meta = $derived(projectToMeta(projectStore.current, prosjektId));

  const query = createCaseContextQuery(() => sakId);
  const bestemmelser = sporBestemmelser('vederlag');

  // Derive scenario from timeline
  const vederlagData = $derived.by(() => {
    const timeline = query.data?.timeline;
    if (!timeline)
      return {
        scenario: 'new' as VederlagSubmissionScenario,
        existing: undefined,
        entries: [],
        grunnlagEventId: '',
        originalEventId: undefined as string | undefined,
      };

    const vederlagEvent = timeline.find((e) => isVederlagKravEvent(e.type));

    const grunnlagEvent = timeline.find((e) => isGrunnlagEvent(e.type));

    if (vederlagEvent) {
      const existing = vederlagEvent.data as
        | VederlagSubmissionDefaultsConfig['existing']
        | undefined;
      return {
        scenario: 'edit' as VederlagSubmissionScenario,
        existing,
        entries: [
          {
            rolle: 'TE' as const,
            versjon: 1,
            html: existing?.begrunnelse ?? '',
            dato: vederlagEvent.time,
          },
        ],
        grunnlagEventId: grunnlagEvent?.id ?? '',
        originalEventId: vederlagEvent.id,
      };
    }

    return {
      scenario: 'new' as VederlagSubmissionScenario,
      existing: undefined,
      entries: [],
      grunnlagEventId: grunnlagEvent?.id ?? '',
      originalEventId: undefined as string | undefined,
    };
  });

  const saksnr = $derived(1); // TODO: derive from case list position
  const tittel = $derived(query.data?.state?.sakstittel);
  const teNavn = $derived(query.data?.state?.entreprenor);
  const bhNavn = $derived(query.data?.state?.byggherre);

  let begrunnelseHtml = $state('');
  let aktiveTags = $state<string[]>([]);

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
    if (
      vederlagData.scenario === 'edit' &&
      vederlagData.existing?.begrunnelse &&
      !hasInitializedBegrunnelse
    ) {
      begrunnelseHtml = vederlagData.existing.begrunnelse;
      hasInitializedBegrunnelse = true;
    }
  });
</script>

<PageLoadingShell loading={query.isLoading} error={query.isError}>
  <FormWithRightPanel
    {bestemmelser}
    entries={vederlagData.entries}
    {teNavn}
    {bhNavn}
    availableTags={aktiveTags}
  >
    <FormPageHeader
      tilbakeHref="/{prosjektId}/{sakId}"
      tilbakeTekst="Tilbake til saksmappe"
      eyebrow={vederlagData.scenario === 'edit' ? 'Oppdater vederlagskrav' : 'Nytt vederlagskrav'}
      prosjektNavn={meta?.name}
      teNavn={meta?.te ?? teNavn}
      bhNavn={meta?.bh ?? bhNavn}
      {saksnr}
      {tittel}
    />

    <TeVederlagForm
      scenario={vederlagData.scenario}
      existing={vederlagData.existing}
      {prosjektId}
      {sakId}
      version={query.data?.version ?? 0}
      grunnlagEventId={vederlagData.grunnlagEventId}
      originalEventId={vederlagData.scenario === 'edit' ? vederlagData.originalEventId : undefined}
      bind:begrunnelseHtml
      onactions={(a) => (formActions = a)}
      onkravlinjer={(t) => (aktiveTags = t)}
    />

    <InlineBegrunnelse
      bind:html={begrunnelseHtml}
      label="Begrunnelse"
      submitLabel={formActions?.submitLabel}
      submitDisabled={!formActions?.kanSende}
      submitLoading={formActions?.submitting}
      submitError={formActions?.submitError}
      onsubmit={formActions?.onsubmit}
      onavbryt={formActions?.onavbryt}
    />
  </FormWithRightPanel>
</PageLoadingShell>
