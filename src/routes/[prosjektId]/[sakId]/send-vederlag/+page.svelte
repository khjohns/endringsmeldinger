<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import TeVederlagForm from '$lib/components/te-vederlag/TeVederlagForm.svelte';
	import BegrunnelseThread from '$lib/components/bh-response/BegrunnelseThread.svelte';
	import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
	import type { VederlagSubmissionScenario } from '$lib/domain/vederlagSubmissionDomain';
	import type { VederlagsMetode } from '$lib/constants/paymentMethods';

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
		if (!timeline) return { scenario: 'new' as VederlagSubmissionScenario, existing: undefined, entries: [], grunnlagEventId: '', originalEventId: undefined as string | undefined };

		const vederlagEvent = timeline.find(
			(e) => e.type === 'vederlag_krav_sendt' || e.type === 'no.oslo.koe.vederlag_krav_sendt'
		);

		const grunnlagEvent = timeline.find(
			(e) => e.type === 'no.oslo.koe.grunnlag_opprettet' || e.type === 'grunnlag_opprettet'
		);

		if (vederlagEvent) {
			const d = vederlagEvent.data as Record<string, unknown> | undefined;
			return {
				scenario: 'edit' as VederlagSubmissionScenario,
				existing: d ? {
					metode: d.metode as VederlagsMetode | undefined,
					belop_direkte: d.belop_direkte as number | undefined,
					kostnads_overslag: d.kostnads_overslag as number | undefined,
					krever_justert_ep: d.krever_justert_ep as boolean | undefined,
					varslet_for_oppstart: d.varslet_for_oppstart as boolean | undefined,
					begrunnelse: d.begrunnelse as string | undefined,
					saerskilt_krav: d.saerskilt_krav as { rigg_drift?: { belop?: number }; produktivitet?: { belop?: number } } | null | undefined,
				} : undefined,
				entries: [{
					rolle: 'TE' as const,
					versjon: 1,
					html: (d?.begrunnelse as string) ?? '',
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
	let mobilPanelOpen = $state(false);
	let activeTab = $state<'begrunnelse' | 'historikk' | 'filer'>('begrunnelse');
	let aktiveTags = $state<string[]>([]);

	let formActions = $state<{
		submitLabel: string; kanSende: boolean;
		submitting: boolean; submitError: string;
		onsubmit: () => void; onavbryt: () => void;
	} | null>(null);

	const harBegrunnelse = $derived(begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length > 0);

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
	<div class="send-vederlag-layout">
		<div class="send-vederlag-panels">
			<!-- MIDTPANEL -->
			<main class="midtpanel">
				<div class="midtpanel-scroll">
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
				</div>
			</main>

			<!-- HØYREPANEL: Desktop -->
			<div class="desktop-panel">
				<BegrunnelseThread
					entries={vederlagData.entries}
					bind:bhBegrunnelseHtml={begrunnelseHtml}
					editorRolle="TE"
					{teNavn}
					{bhNavn}
					{activeTab}
					ontabchange={(tab) => (activeTab = tab)}
					submitLabel={formActions?.submitLabel}
					submitDisabled={!formActions?.kanSende}
					submitLoading={formActions?.submitting}
					submitError={formActions?.submitError}
					onsubmit={formActions?.onsubmit}
					onavbryt={formActions?.onavbryt}
				/>
			</div>
		</div>
	</div>

	<!-- Mobil: FAB -->
	<button class="begrunnelse-fab" onclick={() => (mobilPanelOpen = true)}>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M2 3h12M2 7h8M2 11h10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
		</svg>
		Begrunnelse
		{#if harBegrunnelse}
			<span class="fab-badge"></span>
		{/if}
	</button>

	<!-- Mobil: fullscreen overlay -->
	{#if mobilPanelOpen}
		<div class="mobil-panel-overlay">
			<button class="panel-tilbake" onclick={() => (mobilPanelOpen = false)}>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Tilbake til skjema
			</button>
			<BegrunnelseThread
				entries={vederlagData.entries}
				bind:bhBegrunnelseHtml={begrunnelseHtml}
				editorRolle="TE"
				{teNavn}
				{bhNavn}
				{activeTab}
				ontabchange={(tab) => (activeTab = tab)}
				submitLabel={formActions?.submitLabel}
				submitDisabled={!formActions?.kanSende}
				submitLoading={formActions?.submitting}
				submitError={formActions?.submitError}
				onsubmit={formActions?.onsubmit}
				onavbryt={formActions?.onavbryt}
			/>
		</div>
	{/if}
{/if}

<style>
	.send-vederlag-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-canvas);
	}

	.send-vederlag-panels {
		display: grid;
		grid-template-columns: 3fr 2fr;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.desktop-panel {
		overflow-y: auto;
	}

	.midtpanel {
		overflow-y: auto;
	}

	.midtpanel-scroll {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
		padding: var(--spacing-6);
		max-width: 640px;
		margin: 0 auto;
	}

	.loading, .error {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
	}

	.loading-text { font-size: 14px; color: var(--color-ink-secondary); }
	.error-text { font-size: 14px; color: var(--color-score-low); }

	/* FAB + mobil */
	.begrunnelse-fab { display: none; }
	.mobil-panel-overlay { display: none; }

	.panel-tilbake {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
		padding: var(--spacing-3) var(--spacing-4);
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--color-felt);
		border: none;
		border-bottom: 1px solid var(--color-wire);
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-ink-secondary);
		cursor: pointer;
		width: 100%;
		text-align: left;
		flex-shrink: 0;
	}

	.panel-tilbake:hover { color: var(--color-ink); }

	@media (max-width: 767px) {
		.send-vederlag-panels { grid-template-columns: 1fr; }
		.desktop-panel { display: none; }
		.midtpanel-scroll {
			max-width: none;
			padding: var(--spacing-5) var(--spacing-4);
			padding-bottom: 72px;
		}

		.begrunnelse-fab {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			position: fixed;
			bottom: var(--spacing-5);
			right: var(--spacing-4);
			z-index: 20;
			padding: var(--spacing-2) var(--spacing-4);
			background: var(--color-felt-raised);
			border: 1px solid var(--color-vekt-dim);
			border-radius: 9999px;
			font-family: var(--font-ui);
			font-size: 13px;
			font-weight: 500;
			color: var(--color-vekt);
			cursor: pointer;
			transition: background 0.12s, border-color 0.12s;
		}

		.begrunnelse-fab:hover {
			background: var(--color-vekt-bg);
			border-color: var(--color-vekt);
		}

		.fab-badge {
			width: 6px;
			height: 6px;
			border-radius: 9999px;
			background: var(--color-vekt);
		}

		.mobil-panel-overlay {
			display: flex;
			flex-direction: column;
			position: fixed;
			inset: 0;
			z-index: 30;
			background: var(--color-canvas);
			overflow-y: auto;
		}

		.mobil-panel-overlay :global(.begrunnelse-thread) {
			position: static;
			height: auto;
			border-left: none;
		}
	}
</style>
