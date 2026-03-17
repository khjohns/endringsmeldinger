<script lang="ts">
  import { page } from '$app/state';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import BhFristResponse from '$lib/components/bh-response/BhFristResponse.svelte';
  import type { FristDomainConfig } from '$lib/domain/fristDomain';

  import PageLoadingShell from '$lib/components/shared/PageLoadingShell.svelte';
  import { isFristKravEvent, isResponsFristEvent } from '$lib/constants/eventTypes';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  const prosjektNavn = $derived(page.data.project?.name ?? prosjektId);

  const query = createCaseContextQuery(() => sakId);

  // Derive krav data from case state
  const krav = $derived.by(() => {
    const state = query.data?.state;
    if (!state) return null;

    const frist = state.frist;

    // Find TE's frist event for begrunnelse
    const fristEvent = query.data?.timeline?.find((e) => isFristKravEvent(e.type));
    const eventData = fristEvent?.data as unknown as Record<string, unknown> | undefined;

    return {
      krevdDager: frist.krevd_dager ?? 0,
      begrunnelseHtml: (eventData?.begrunnelse as string) ?? undefined,
      datoVarslet: frist.frist_varsel?.dato_sendt,
      datoFremsatt: frist.spesifisert_varsel?.dato_sendt,
    };
  });

  // Derive domain config from case state
  const domainConfig = $derived.by((): FristDomainConfig | null => {
    const state = query.data?.state;
    if (!state) return null;

    const frist = state.frist;
    const grunnlag = state.grunnlag;

    return {
      varselType: frist.varsel_type as FristDomainConfig['varselType'],
      krevdDager: frist.krevd_dager ?? 0,
      erSvarPaForesporsel: frist.har_bh_foresporsel === true,
      harTidligereVarselITide: !!frist.frist_varsel,
      erGrunnlagSubsidiaer: grunnlag.bh_resultat === 'avslatt',
      erHelFristSubsidiaerPgaGrunnlag: grunnlag.grunnlag_varslet_i_tide === false,
    };
  });

  // Extract timeline-derived values
  const timelineData = $derived.by(() => {
    const timeline = query.data?.timeline;
    if (!timeline)
      return {
        tidligereSvar: [] as Array<{
          rolle: 'TE' | 'BH';
          versjon: number;
          html: string;
          dato?: string;
        }>,
        fristKravId: '',
        lastResponseData: undefined as { eventId: string; godkjent_dager?: number } | undefined,
        forrigeBegrunnelseHtml: undefined as string | undefined,
      };

    // Find TE's krav event
    const kravEvent = timeline.find((e) => isFristKravEvent(e.type));

    // Find existing BH responses
    const responsEvents = timeline.filter((e) => isResponsFristEvent(e.type));
    const lastResponse = responsEvents.length > 0 ? responsEvents[responsEvents.length - 1] : null;
    const lastData = lastResponse?.data as unknown as Record<string, unknown> | undefined;

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
      fristKravId: kravEvent?.id ?? '',
      lastResponseData: lastResponse
        ? {
            eventId: lastResponse.id,
            godkjent_dager: lastData?.godkjent_dager as number | undefined,
          }
        : undefined,
      forrigeBegrunnelseHtml: (lastData?.begrunnelse as string) ?? undefined,
    };
  });

  const isUpdateMode = $derived(!!query.data?.state?.frist.bh_resultat);
  const fristTilstand = $derived(query.data?.state?.frist);
  const saksnr = $derived(1); // TODO: derive from case list position
  const teNavn = $derived(query.data?.state?.entreprenor);
  const bhNavn = $derived(query.data?.state?.byggherre);
  const tittel = $derived(query.data?.state?.sakstittel ?? '');
</script>

<PageLoadingShell loading={query.isLoading} error={query.isError} ready={!!krav && !!domainConfig}>
  {#if krav && domainConfig}
    <BhFristResponse
      {prosjektId}
      {sakId}
      {saksnr}
      {tittel}
      {krav}
      {domainConfig}
      {timelineData}
      version={query.data?.version ?? 0}
      {isUpdateMode}
      {fristTilstand}
      {teNavn}
      {bhNavn}
      {prosjektNavn}
    />
  {/if}
</PageLoadingShell>
