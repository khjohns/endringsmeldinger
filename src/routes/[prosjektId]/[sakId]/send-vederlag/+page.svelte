<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import TeVederlagForm from '$lib/components/te-vederlag/TeVederlagForm.svelte';
	import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
	import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
	import type { VederlagSubmissionScenario, VederlagSubmissionDefaultsConfig } from '$lib/domain/vederlagSubmissionDomain';

	const prosjektId = $derived(page.params.prosjektId ?? '');
	const sakId = $derived(page.params.sakId ?? '');

	const projectMeta: Record<string, { name: string; te: string; bh: string }> = {
		P001: { name: 'Operatunnelen', te: 'Vestlandsentreprisen AS', bh: 'Oslobygg' },
	};
	const meta = $derived(prosjektId ? projectMeta[prosjektId] ?? null : null);

	const query = createCaseContextQuery(() => sakId);

	// Derive scenario from timeline
	const vederlagData = $derived.by(() => {
		const timeline = query.data?.timeline;
		if (!timeline) return {
			scenario: 'new' as VederlagSubmissionScenario,
			existing: undefined,
			entries: [],
			grunnlagEventId: '',
			originalEventId: undefined as string | undefined,
		};

		const vederlagEvent = timeline.find(
			(e) => e.type === 'vederlag_krav_sendt' || e.type === 'no.oslo.koe.vederlag_krav_sendt'
		);

		const grunnlagEvent = timeline.find(
			(e) => e.type === 'no.oslo.koe.grunnlag_opprettet' || e.type === 'grunnlag_opprettet'
		);

		if (vederlagEvent) {
			const existing = vederlagEvent.data as VederlagSubmissionDefaultsConfig['existing'] | undefined;
			return {
				scenario: 'edit' as VederlagSubmissionScenario,
				existing,
				entries: [{
					rolle: 'TE' as const,
					versjon: 1,
					html: existing?.begrunnelse ?? '',
					dato: vederlagEvent.time,
				}],
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
	let begrunnelsePlaceholder = $state('');
	let aktiveTags = $state<string[]>([]);

	let formActions = $state<{
		submitLabel: string; kanSende: boolean;
		submitting: boolean; submitError: string;
		onsubmit: () => void; onavbryt: () => void;
	} | null>(null);

	// Pre-fill begrunnelse in edit mode
	let hasInitializedBegrunnelse = $state(false);

	$effect(() => {
		if (vederlagData.scenario === 'edit' && vederlagData.existing?.begrunnelse && !hasInitializedBegrunnelse) {
			begrunnelseHtml = vederlagData.existing.begrunnelse;
			hasInitializedBegrunnelse = true;
		}
	});
</script>

{#if query.isLoading}
	<div class="loading"><p class="loading-text">Laster sak...</p></div>
{:else if query.isError}
	<div class="error"><p class="error-text">Kunne ikke laste sak</p></div>
{:else}
	<FormWithRightPanel
		entries={vederlagData.entries}
		bind:bhBegrunnelseHtml={begrunnelseHtml}
		editorRolle="TE"
		{teNavn}
		{bhNavn}
		availableTags={aktiveTags}
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
			grunnlagEventId={vederlagData.grunnlagEventId}
			originalEventId={vederlagData.scenario === 'edit' ? vederlagData.originalEventId : undefined}
			bind:begrunnelseHtml
			onplaceholder={(p) => (begrunnelsePlaceholder = p)}
			onactions={(a) => (formActions = a)}
			onkravlinjer={(t) => (aktiveTags = t)}
		/>
	</FormWithRightPanel>
{/if}

<style>
	.loading, .error {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
	}

	.loading-text { font-size: 14px; color: var(--color-ink-secondary); }
	.error-text { font-size: 14px; color: var(--color-score-low); }
</style>
