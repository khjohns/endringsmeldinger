<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import { getHjemmelObj } from '$lib/constants/categories';
	import BhGrunnlagResponse from '$lib/components/bh-response/BhGrunnlagResponse.svelte';

	const prosjektId = $derived(page.params.prosjektId ?? '');
	const sakId = $derived(page.params.sakId ?? '');

	const query = $derived(createCaseContextQuery(sakId));

	// Derive krav data from case state
	const krav = $derived.by(() => {
		const state = $query.data?.state;
		if (!state) return null;

		const grunnlag = state.grunnlag;

		// Normalize underkategori (can be string | string[])
		const underkategori = Array.isArray(grunnlag.underkategori)
			? grunnlag.underkategori[0]
			: grunnlag.underkategori;

		// Find the original grunnlag_opprettet event for begrunnelse text
		const grunnlagEvent = $query.data?.timeline?.find(
			(e) => e.type === 'no.oslo.koe.grunnlag_opprettet' || e.type === 'grunnlag_opprettet'
		);

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
			begrunnelseHtml: (eventData?.begrunnelse as string) ?? '<p>Begrunnelse fra TE vil vises her.</p>',
		};
	});

	// Derive saksnr from case list (same pattern as ny/ page)
	const saksnr = $derived(1); // TODO: derive from case list position

	// Derive previous responses for the thread
	const tidligereSvar = $derived.by(() => {
		const timeline = $query.data?.timeline;
		if (!timeline) return [];

		return timeline
			.filter((e) => e.type.includes('respons_grunnlag'))
			.map((e) => {
				const d = e.data as unknown as Record<string, unknown> | undefined;
				return {
					rolle: (e.actorrole ?? 'BH') as 'TE' | 'BH',
					versjon: (d?.versjon as number) ?? 1,
					html: (d?.begrunnelse as string) ?? '',
					dato: e.time,
				};
			});
	});

	const forrigeResultat = $derived.by(() => {
		const state = $query.data?.state;
		return state?.grunnlag.bh_resultat ?? undefined;
	});

	const isUpdateMode = $derived(!!forrigeResultat);

	// Previous BH response details for pre-fill in update mode
	const forrigeVarsletITide = $derived.by(() => {
		const state = $query.data?.state;
		return state?.grunnlag.grunnlag_varslet_i_tide;
	});

	const lastResponseEvent = $derived.by(() => {
		const timeline = $query.data?.timeline;
		if (!timeline) return null;

		// Find latest BH grunnlag response event
		const responsEvents = timeline.filter(
			(e) => e.type.includes('respons_grunnlag')
		);
		return responsEvents.length > 0 ? responsEvents[responsEvents.length - 1] : null;
	});

	const forrigeBegrunnelseHtml = $derived.by(() => {
		if (!lastResponseEvent) return undefined;
		const d = lastResponseEvent.data as unknown as Record<string, unknown> | undefined;
		return (d?.begrunnelse as string) ?? undefined;
	});

	const lastResponseEventId = $derived(lastResponseEvent?.id);

	// Grunnlag event ID (the original TE grunnlag_opprettet event)
	const grunnlagEventId = $derived.by(() => {
		const timeline = $query.data?.timeline;
		if (!timeline) return '';
		const grunnlagEvent = timeline.find(
			(e) => e.type === 'no.oslo.koe.grunnlag_opprettet' || e.type === 'grunnlag_opprettet'
		);
		return grunnlagEvent?.id ?? '';
	});
</script>

{#if $query.isLoading}
	<div class="loading">
		<p class="loading-text">Laster sak…</p>
	</div>
{:else if $query.isError}
	<div class="error">
		<p class="error-text">Kunne ikke laste sak</p>
	</div>
{:else if krav}
	<BhGrunnlagResponse
		{prosjektId}
		{sakId}
		{saksnr}
		{krav}
		{tidligereSvar}
		{forrigeResultat}
		{isUpdateMode}
		{forrigeVarsletITide}
		{forrigeBegrunnelseHtml}
		{lastResponseEventId}
		{grunnlagEventId}
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
