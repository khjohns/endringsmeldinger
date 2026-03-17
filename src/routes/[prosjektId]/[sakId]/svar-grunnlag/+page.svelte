<script lang="ts">
  import { page } from '$app/state';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import { getHjemmelObj } from '$lib/constants/categories';
  import BhGrunnlagResponse from '$lib/components/bh-response/BhGrunnlagResponse.svelte';
  import PageLoadingShell from '$lib/components/shared/PageLoadingShell.svelte';
  import { isGrunnlagEvent, isResponsGrunnlagEvent } from '$lib/constants/eventTypes';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  import { projectStore } from '$lib/stores/project.svelte';

  const prosjektNavn = $derived(projectStore.current?.name ?? prosjektId);

  const query = createCaseContextQuery(() => sakId);

  // Derive krav data from case state
  const krav = $derived.by(() => {
    const state = query.data?.state;
    if (!state) return null;

    const grunnlag = state.grunnlag;

    // Normalize underkategori (can be string | string[])
    const underkategori = Array.isArray(grunnlag.underkategori)
      ? grunnlag.underkategori[0]
      : grunnlag.underkategori;

    // Find the original grunnlag_opprettet event for begrunnelse text
    const grunnlagEvent = query.data?.timeline?.find((e) => isGrunnlagEvent(e.type));

    const eventData = grunnlagEvent?.data as unknown as Record<string, unknown> | undefined;

    const hjemmel = getHjemmelObj(underkategori);
    const hjemmelRef = hjemmel ? `§${hjemmel.hjemmel_basis}` : undefined;

    return {
      tittel: state.sakstittel,
      hovedkategori: grunnlag.hovedkategori ?? 'ENDRING',
      underkategori,
      hjemmelRef,
      datoVarslet: grunnlag.grunnlag_varsel?.dato_sendt,
      versjon: grunnlag.antall_versjoner ?? 1,
      begrunnelseHtml:
        (eventData?.begrunnelse as string) ?? '<p>Begrunnelse fra TE vil vises her.</p>',
    };
  });

  // Derive saksnr from case list (same pattern as ny/ page)
  const saksnr = $derived(1); // TODO: derive from case list position

  // Extract all timeline-derived values in a single pass
  const timelineData = $derived.by(() => {
    const timeline = query.data?.timeline;
    if (!timeline)
      return {
        tidligereSvar: [],
        grunnlagEventId: '',
        lastResponseEventId: undefined as string | undefined,
        forrigeBegrunnelseHtml: undefined as string | undefined,
      };

    const responsEvents = timeline.filter((e) => isResponsGrunnlagEvent(e.type));
    const grunnlagEvent = timeline.find((e) => isGrunnlagEvent(e.type));

    const lastResponse = responsEvents.length > 0 ? responsEvents[responsEvents.length - 1] : null;
    const lastResponseData = lastResponse?.data as unknown as Record<string, unknown> | undefined;

    return {
      tidligereSvar: responsEvents.map((e) => {
        const d = e.data as unknown as Record<string, unknown> | undefined;
        return {
          rolle: (e.actorrole ?? 'BH') as 'TE' | 'BH',
          versjon: (d?.versjon as number) ?? 1,
          html: (d?.begrunnelse as string) ?? '',
          dato: e.time,
        };
      }),
      grunnlagEventId: grunnlagEvent?.id ?? '',
      lastResponseEventId: lastResponse?.id,
      forrigeBegrunnelseHtml: (lastResponseData?.begrunnelse as string) ?? undefined,
    };
  });

  const forrigeResultat = $derived(query.data?.state?.grunnlag.bh_resultat ?? undefined);
  const isUpdateMode = $derived(!!forrigeResultat);
  const forrigeVarsletITide = $derived(query.data?.state?.grunnlag.grunnlag_varslet_i_tide);

  const teNavn = $derived(query.data?.state?.entreprenor);
  const bhNavn = $derived(query.data?.state?.byggherre);
</script>

<PageLoadingShell loading={query.isLoading} error={query.isError} ready={!!krav}>
  {#if krav}
    <BhGrunnlagResponse
      {prosjektId}
      {sakId}
      {saksnr}
      {krav}
      version={query.data?.version ?? 0}
      tidligereSvar={timelineData.tidligereSvar}
      {forrigeResultat}
      {isUpdateMode}
      {forrigeVarsletITide}
      forrigeBegrunnelseHtml={timelineData.forrigeBegrunnelseHtml}
      lastResponseEventId={timelineData.lastResponseEventId}
      grunnlagEventId={timelineData.grunnlagEventId}
      {teNavn}
      {bhNavn}
      {prosjektNavn}
    />
  {/if}
</PageLoadingShell>
