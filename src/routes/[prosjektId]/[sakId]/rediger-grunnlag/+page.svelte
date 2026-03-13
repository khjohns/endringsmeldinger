<script lang="ts">
  import { page } from '$app/state';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import { getHjemmelObj } from '$lib/constants/categories';
  import type { GrunnlagResponsResultat } from '$lib/types/timeline';
  import TeGrunnlagRevisjon from '$lib/components/te-revision/TeGrunnlagRevisjon.svelte';
  import PageLoadingShell from '$lib/components/shared/PageLoadingShell.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  const query = createCaseContextQuery(() => sakId);

  // Derive krav data from case state
  const krav = $derived.by(() => {
    const state = query.data?.state;
    if (!state) return null;

    const grunnlag = state.grunnlag;

    const underkategori = Array.isArray(grunnlag.underkategori)
      ? grunnlag.underkategori[0]
      : grunnlag.underkategori;

    const hjemmel = getHjemmelObj(underkategori);
    const hjemmelRef = hjemmel ? `§${hjemmel.hjemmel_basis}` : undefined;

    return {
      tittel: state.sakstittel,
      hovedkategori: grunnlag.hovedkategori ?? 'ENDRING',
      underkategori,
      hjemmelRef,
      datoVarslet: grunnlag.grunnlag_varsel?.dato_sendt,
      versjon: grunnlag.antall_versjoner ?? 1,
    };
  });

  // Extract all timeline-derived values in a single pass
  const timelineData = $derived.by(() => {
    const timeline = query.data?.timeline;
    const state = query.data?.state;
    if (!timeline)
      return {
        originalEventId: '',
        teBegrunnelseHtml: '',
        bhSvar: null as {
          resultat: GrunnlagResponsResultat;
          varsletITide?: boolean;
          begrunnelseHtml: string;
          dato?: string;
        } | null,
        tidligereSvar: [] as {
          rolle: 'TE' | 'BH';
          versjon: number;
          html: string;
          dato?: string;
          resultat?: string;
        }[],
      };

    const isGrunnlagEvent = (type: string) =>
      type === 'no.oslo.koe.grunnlag_opprettet' ||
      type === 'grunnlag_opprettet' ||
      type === 'no.oslo.koe.grunnlag_oppdatert' ||
      type === 'grunnlag_oppdatert';

    const grunnlagEvents = timeline.filter((e) => isGrunnlagEvent(e.type));
    const responsEvents = timeline.filter((e) => e.type.includes('respons_grunnlag'));

    // TE's latest begrunnelse
    const latestGrunnlag =
      grunnlagEvents.length > 0 ? grunnlagEvents[grunnlagEvents.length - 1] : null;
    const latestGrunnlagData = latestGrunnlag?.data as unknown as
      | Record<string, unknown>
      | undefined;

    // BH's latest response
    const latestResponse =
      responsEvents.length > 0 ? responsEvents[responsEvents.length - 1] : null;
    const latestResponseData = latestResponse?.data as unknown as
      | Record<string, unknown>
      | undefined;

    // Thread entries (all grunnlag + response events)
    const threadEvents = timeline.filter(
      (e) => isGrunnlagEvent(e.type) || e.type.includes('respons_grunnlag')
    );

    return {
      originalEventId: latestGrunnlag?.id ?? '',
      teBegrunnelseHtml: (latestGrunnlagData?.begrunnelse as string) ?? '',
      bhSvar:
        state?.grunnlag.bh_resultat != null
          ? {
              resultat: state.grunnlag.bh_resultat!,
              varsletITide: state.grunnlag.grunnlag_varslet_i_tide,
              begrunnelseHtml: (latestResponseData?.begrunnelse as string) ?? '',
              dato: latestResponse?.time,
            }
          : null,
      tidligereSvar: threadEvents.map((e) => {
        const d = e.data as unknown as Record<string, unknown> | undefined;
        const isResponse = e.type.includes('respons_grunnlag');
        return {
          rolle: (isResponse ? 'BH' : 'TE') as 'TE' | 'BH',
          versjon: (d?.versjon as number) ?? 1,
          html: (d?.begrunnelse as string) ?? '',
          dato: e.time,
          resultat: isResponse ? (d?.resultat as string) : undefined,
        };
      }),
    };
  });

  const teNavn = $derived(query.data?.state?.entreprenor);
  const bhNavn = $derived(query.data?.state?.byggherre);
</script>

<PageLoadingShell loading={query.isLoading} error={query.isError} ready={!!krav}>
  {#if krav}
    <TeGrunnlagRevisjon
      {prosjektId}
      {sakId}
      {krav}
      originalEventId={timelineData.originalEventId}
      teBegrunnelseHtml={timelineData.teBegrunnelseHtml}
      bhSvar={timelineData.bhSvar}
      tidligereSvar={timelineData.tidligereSvar}
      {teNavn}
      {bhNavn}
    />
  {/if}
</PageLoadingShell>
