<script lang="ts">
  import { page } from '$app/state';
  import { createCaseContextQuery } from '$lib/queries/caseContext';
  import BhVederlagResponse from '$lib/components/bh-response/BhVederlagResponse.svelte';
  import type {
    VederlagDomainConfig,
    VederlagLastResponseData,
    BelopVurdering,
  } from '$lib/domain/vederlagDomain';
  import type { VederlagsMetode } from '$lib/types/timeline';

  import { PROJECT_META } from '$lib/constants/projectMeta';
  import PageLoadingShell from '$lib/components/shared/PageLoadingShell.svelte';
  import { isVederlagKravEvent, isResponsVederlagEvent } from '$lib/constants/eventTypes';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  const prosjektNavn = $derived(prosjektId ? PROJECT_META[prosjektId]?.name : undefined);

  const query = createCaseContextQuery(() => sakId);

  // Derive TE's vederlagskrav from case state
  const krav = $derived.by(() => {
    const state = query.data?.state;
    if (!state) return null;

    const v = state.vederlag;
    const hovedkravBelop = v.belop_direkte ?? v.kostnads_overslag ?? 0;
    const riggBelop = v.saerskilt_krav?.rigg_drift?.belop;
    const produktivitetBelop = v.saerskilt_krav?.produktivitet?.belop;

    // Find TE's vederlag_krav_sendt event for begrunnelseHtml
    const vederlagEvent = query.data?.timeline?.find((e) => isVederlagKravEvent(e.type));
    const eventData = vederlagEvent?.data as unknown as Record<string, unknown> | undefined;

    return {
      metode: v.metode,
      hovedkravBelop,
      riggBelop,
      produktivitetBelop,
      harRiggKrav: (riggBelop ?? 0) > 0,
      harProduktivitetKrav: (produktivitetBelop ?? 0) > 0,
      begrunnelseHtml: (eventData?.begrunnelse as string) ?? undefined,
    };
  });

  // Derive domain config from case state
  const domainConfig = $derived.by((): VederlagDomainConfig | null => {
    const state = query.data?.state;
    if (!state || !krav) return null;

    const v = state.vederlag;
    const g = state.grunnlag;

    return {
      metode: v.metode,
      hovedkravBelop: krav.hovedkravBelop,
      riggBelop: krav.riggBelop,
      produktivitetBelop: krav.produktivitetBelop,
      harRiggKrav: krav.harRiggKrav,
      harProduktivitetKrav: krav.harProduktivitetKrav,
      kreverJustertEp: v.krever_justert_ep ?? false,
      kostnadsOverslag: v.kostnads_overslag,
      hovedkategori: g.hovedkategori as VederlagDomainConfig['hovedkategori'],
      grunnlagVarsletForSent: g.grunnlag_varslet_i_tide === false,
      grunnlagStatus: g.bh_resultat as VederlagDomainConfig['grunnlagStatus'],
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
        vederlagKravId: '',
        lastResponseData: undefined as VederlagLastResponseData | undefined,
        forrigeBegrunnelseHtml: undefined as string | undefined,
      };

    // Find TE's krav event
    const kravEvent = timeline.find((e) => isVederlagKravEvent(e.type));

    // Find existing BH responses
    const responsEvents = timeline.filter((e) => isResponsVederlagEvent(e.type));
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
      vederlagKravId: kravEvent?.id ?? '',
      lastResponseData: lastResponse
        ? ({
            eventId: lastResponse.id,
            hovedkravVarsletITide: lastData?.hovedkrav_varslet_i_tide as boolean | undefined,
            riggVarsletITide: lastData?.rigg_varslet_i_tide as boolean | undefined,
            produktivitetVarsletITide: lastData?.produktivitet_varslet_i_tide as
              | boolean
              | undefined,
            akseptererMetode: lastData?.aksepterer_metode as boolean | undefined,
            oensketMetode: lastData?.oensket_metode as VederlagsMetode | undefined,
            holdTilbake: lastData?.hold_tilbake as boolean | undefined,
            hovedkravVurdering: lastData?.hovedkrav_vurdering as BelopVurdering | undefined,
            hovedkravGodkjentBelop: lastData?.hovedkrav_godkjent_belop as number | undefined,
            riggVurdering: lastData?.rigg_vurdering as BelopVurdering | undefined,
            riggGodkjentBelop: lastData?.rigg_godkjent_belop as number | undefined,
            produktivitetVurdering: lastData?.produktivitet_vurdering as BelopVurdering | undefined,
            produktivitetGodkjentBelop: lastData?.produktivitet_godkjent_belop as
              | number
              | undefined,
          } satisfies VederlagLastResponseData)
        : undefined,
      forrigeBegrunnelseHtml: (lastData?.begrunnelse as string) ?? undefined,
    };
  });

  const isUpdateMode = $derived(!!query.data?.state?.vederlag.bh_resultat);
  const saksnr = $derived(1); // TODO: derive from case list position
  const teNavn = $derived(query.data?.state?.entreprenor);
  const bhNavn = $derived(query.data?.state?.byggherre);
  const tittel = $derived(query.data?.state?.sakstittel ?? '');
</script>

<PageLoadingShell loading={query.isLoading} error={query.isError} ready={!!krav && !!domainConfig}>
  {#if krav && domainConfig}
    <BhVederlagResponse
      {prosjektId}
      {sakId}
      {saksnr}
      {tittel}
      {krav}
      {domainConfig}
      version={query.data?.version ?? 0}
      tidligereSvar={timelineData.tidligereSvar}
      {isUpdateMode}
      lastResponseData={timelineData.lastResponseData}
      forrigeBegrunnelseHtml={timelineData.forrigeBegrunnelseHtml}
      vederlagKravId={timelineData.vederlagKravId}
      {teNavn}
      {bhNavn}
      {prosjektNavn}
    />
  {/if}
</PageLoadingShell>
