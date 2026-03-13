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

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');

  // Mock project metadata (same pattern as svar-grunnlag)
  const projectMeta: Record<string, { name: string }> = {
    P001: { name: 'Operatunnelen' },
  };
  const prosjektNavn = $derived(prosjektId ? projectMeta[prosjektId]?.name : undefined);

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
    const vederlagEvent = query.data?.timeline?.find(
      (e) => e.type === 'vederlag_krav_sendt' || e.type === 'no.oslo.koe.vederlag_krav_sendt'
    );
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
    const kravEvent = timeline.find(
      (e) => e.type === 'vederlag_krav_sendt' || e.type === 'no.oslo.koe.vederlag_krav_sendt'
    );

    // Find existing BH responses
    const responsEvents = timeline.filter((e) => e.type.includes('respons_vederlag'));
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

{#if query.isLoading}
  <div class="loading">
    <p class="loading-text">Laster sak…</p>
  </div>
{:else if query.isError}
  <div class="error">
    <p class="error-text">Kunne ikke laste sak</p>
  </div>
{:else if krav && domainConfig}
  <BhVederlagResponse
    {prosjektId}
    {sakId}
    {saksnr}
    {tittel}
    {krav}
    {domainConfig}
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

<style>
  .loading,
  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .loading-text {
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  .error-text {
    font-size: 14px;
    color: var(--color-score-low);
  }
</style>
