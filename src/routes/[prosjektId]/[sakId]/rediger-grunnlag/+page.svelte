<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import { getHjemmelObj } from '$lib/constants/categories';
	import TeGrunnlagRevisjon from '$lib/components/te-revision/TeGrunnlagRevisjon.svelte';

	const prosjektId = $derived(page.params.prosjektId ?? '');
	const sakId = $derived(page.params.sakId ?? '');

	const query = $derived(createCaseContextQuery(sakId));

	// Derive krav data from case state
	const krav = $derived.by(() => {
		const state = $query.data?.state;
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

	// Find the original grunnlag event (or latest grunnlag_oppdatert)
	const originalEventId = $derived.by(() => {
		const timeline = $query.data?.timeline;
		if (!timeline) return '';

		// Find latest grunnlag event (could be original or updated)
		const grunnlagEvents = timeline.filter(
			(e) =>
				e.type === 'no.oslo.koe.grunnlag_opprettet' ||
				e.type === 'grunnlag_opprettet' ||
				e.type === 'no.oslo.koe.grunnlag_oppdatert' ||
				e.type === 'grunnlag_oppdatert'
		);

		return grunnlagEvents.length > 0
			? grunnlagEvents[grunnlagEvents.length - 1].id
			: '';
	});

	// TE's current begrunnelse (from latest grunnlag event)
	const teBegrunnelseHtml = $derived.by(() => {
		const timeline = $query.data?.timeline;
		if (!timeline) return '';

		const grunnlagEvents = timeline.filter(
			(e) =>
				e.type === 'no.oslo.koe.grunnlag_opprettet' ||
				e.type === 'grunnlag_opprettet' ||
				e.type === 'no.oslo.koe.grunnlag_oppdatert' ||
				e.type === 'grunnlag_oppdatert'
		);

		if (grunnlagEvents.length === 0) return '';

		const latest = grunnlagEvents[grunnlagEvents.length - 1];
		const d = latest.data as unknown as Record<string, unknown> | undefined;
		return (d?.begrunnelse as string) ?? '';
	});

	// BH's latest response
	const bhSvar = $derived.by(() => {
		const state = $query.data?.state;
		if (!state?.grunnlag.bh_resultat) return null;

		const timeline = $query.data?.timeline;
		const responsEvent = timeline
			?.filter((e) => e.type.includes('respons_grunnlag'))
			.at(-1);

		const d = responsEvent?.data as unknown as Record<string, unknown> | undefined;

		return {
			resultat: state.grunnlag.bh_resultat,
			varsletITide: state.grunnlag.grunnlag_varslet_i_tide,
			begrunnelseHtml: (d?.begrunnelse as string) ?? '',
			dato: responsEvent?.time,
		};
	});

	// Build thread entries for BegrunnelseThread
	const tidligereSvar = $derived.by(() => {
		const timeline = $query.data?.timeline;
		if (!timeline) return [];

		return timeline
			.filter(
				(e) =>
					e.type.includes('respons_grunnlag') ||
					e.type.includes('grunnlag_opprettet') ||
					e.type.includes('grunnlag_oppdatert')
			)
			.map((e) => {
				const d = e.data as unknown as Record<string, unknown> | undefined;
				const isResponse = e.type.includes('respons_grunnlag');
				return {
					rolle: (isResponse ? 'BH' : 'TE') as 'TE' | 'BH',
					versjon: (d?.versjon as number) ?? 1,
					html: (d?.begrunnelse as string) ?? '',
					dato: e.time,
					resultat: isResponse ? (d?.resultat as string) : undefined,
				};
			});
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
	<TeGrunnlagRevisjon
		{prosjektId}
		{sakId}
		{krav}
		{originalEventId}
		{teBegrunnelseHtml}
		{bhSvar}
		{tidligereSvar}
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
