<script lang="ts">
	import { goto } from '$app/navigation';
	import { buildTeRevisionEventData } from '$lib/domain/grunnlagDomain';
	import type { GrunnlagResponsResultat } from '$lib/types/timeline';
	import { submitEvent } from '$lib/api/events';
	import { useQueryClient } from '@tanstack/svelte-query';
	import SammendragKort from '$lib/components/bh-response/SammendragKort.svelte';
	import BegrunnelseThread from '$lib/components/bh-response/BegrunnelseThread.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Alert from '$lib/components/primitives/Alert.svelte';
	import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
	import { GRUNNLAG_RESULTAT_LABELS } from '$lib/constants/responseOptions';

	interface KravData {
		tittel: string;
		hovedkategori: string;
		underkategori?: string;
		hjemmelRef?: string;
		datoVarslet?: string;
		versjon: number;
	}

	interface BhSvar {
		resultat: GrunnlagResponsResultat;
		varsletITide?: boolean;
		begrunnelseHtml: string;
		dato?: string;
	}

	interface TidligereSvarEntry {
		rolle: 'TE' | 'BH';
		versjon: number;
		html: string;
		dato?: string;
		resultat?: string;
	}

	interface Props {
		prosjektId: string;
		sakId: string;
		krav: KravData;
		originalEventId: string;
		teBegrunnelseHtml: string;
		bhSvar: BhSvar | null;
		tidligereSvar?: TidligereSvarEntry[];
	}

	let {
		prosjektId,
		sakId,
		krav,
		originalEventId,
		teBegrunnelseHtml,
		bhSvar,
		tidligereSvar = [],
	}: Props = $props();

	const queryClient = useQueryClient();

	// --- Form state ---
	let begrunnelseHtml = $state('');
	let hasInitialized = $state(false);
	let submitting = $state(false);

	// Pre-fill begrunnelse from TE's latest version
	$effect(() => {
		if (teBegrunnelseHtml && !hasInitialized) {
			begrunnelseHtml = teBegrunnelseHtml;
			hasInitialized = true;
		}
	});
	let submitError = $state<string | null>(null);
	let activeTab = $state<'begrunnelse' | 'historikk' | 'filer'>('begrunnelse');
	let mobilPanelOpen = $state(false);

	const harBegrunnelse = $derived(begrunnelseHtml.replace(/<[^>]*>/g, '').trim().length > 0);

	// Build thread entries: previous exchange as read-only
	const threadEntries = $derived.by(() => {
		return tidligereSvar.map((s) => ({
			rolle: s.rolle,
			versjon: s.versjon,
			html: s.html,
			dato: s.dato,
			readonly: true as const,
			resultat: s.resultat,
		}));
	});

	// Validation
	const kanSende = $derived(harBegrunnelse && !submitting);

	async function handleSubmit() {
		if (!kanSende) return;
		submitting = true;
		submitError = null;

		try {
			const eventData = buildTeRevisionEventData({
				originalEventId,
				begrunnelseHtml,
			});

			await submitEvent(sakId, 'grunnlag_oppdatert', eventData);

			await queryClient.invalidateQueries({ queryKey: ['case-context', sakId] });

			goto(`/${prosjektId}/${sakId}`);
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Kunne ikke sende revisjon';
			submitting = false;
		}
	}

	function handleAvbryt() {
		goto(`/${prosjektId}/${sakId}`);
	}
</script>

<div class="te-revision-layout">
	<!-- Context line -->
	<div class="context-line">
		<button class="tilbake-btn" onclick={handleAvbryt}>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
				<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Tilbake til saksark
		</button>
		<span class="context-separator">·</span>
		<span class="context-label">Revider grunnlag</span>
		{#if krav.versjon > 1}
			<span class="context-versjon">Rev. {krav.versjon - 1} → {krav.versjon}</span>
		{:else}
			<span class="context-versjon">→ Rev. 1</span>
		{/if}
	</div>

	<!-- Two-panel content -->
	<div class="revision-panels">
		<!-- MIDTPANEL: Read-only context -->
		<main class="midtpanel">
			<div class="midtpanel-scroll">
				<!-- Sammendragskort -->
				<SammendragKort
					sakId={sakId}
					tittel={krav.tittel}
					hovedkategori={krav.hovedkategori}
					underkategori={krav.underkategori}
					hjemmelRef={krav.hjemmelRef}
					datoVarslet={krav.datoVarslet}
					versjon={krav.versjon}
				/>

				<!-- Info callout -->
				<Alert variant="info">
					Du kan oppdatere din begrunnelse i panelet til høyre. Kategori og hjemmel kan ikke endres.
				</Alert>

				<!-- BH's gjeldende standpunkt -->
				{#if bhSvar}
					<section class="bh-standpunkt">
						<div class="section-header">
							<h3 class="section-label">Byggherrens standpunkt</h3>
							{#if bhSvar.dato}
								<span class="section-dato">{formatDateShortNorwegian(bhSvar.dato)}</span>
							{/if}
						</div>

						<div class="standpunkt-resultat resultat-{bhSvar.resultat}">
							<span class="resultat-badge">{GRUNNLAG_RESULTAT_LABELS[bhSvar.resultat] ?? bhSvar.resultat}</span>
							{#if bhSvar.varsletITide !== undefined}
								<span class="varsling-tag" class:varsling-ok={bhSvar.varsletITide} class:varsling-fail={!bhSvar.varsletITide}>
									§32.2 {bhSvar.varsletITide ? '✓' : '✗'}
								</span>
							{/if}
						</div>

						{#if bhSvar.begrunnelseHtml}
							<div class="standpunkt-begrunnelse">
								{@html bhSvar.begrunnelseHtml}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Footer -->
				{#if submitError}
					<Alert variant="warning">{submitError}</Alert>
				{/if}
				<div class="form-footer">
					<Button variant="secondary" onclick={handleAvbryt}>
						Avbryt
					</Button>
					<Button variant="primary" disabled={!kanSende} loading={submitting} onclick={handleSubmit}>
						Send revisjon
					</Button>
				</div>
			</div>
		</main>

		<!-- HØYREPANEL: TE editor -->
		<div class="desktop-panel">
			<BegrunnelseThread
				entries={threadEntries}
				bind:bhBegrunnelseHtml={begrunnelseHtml}
				editorPlaceholder="Oppdater din begrunnelse for kontraktsforholdet..."
				editorRolle="TE"
				{activeTab}
				ontabchange={(tab) => (activeTab = tab)}
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
			entries={threadEntries}
			bind:bhBegrunnelseHtml={begrunnelseHtml}
			editorPlaceholder="Oppdater din begrunnelse for kontraktsforholdet..."
			editorRolle="TE"
			{activeTab}
			ontabchange={(tab) => (activeTab = tab)}
		/>
	</div>
{/if}

<style>
	.te-revision-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-canvas);
	}

	/* --- Context line --- */
	.context-line {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-2) var(--spacing-4);
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire-strong);
		flex-shrink: 0;
	}

	.tilbake-btn {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
		padding: var(--spacing-1) var(--spacing-2);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-ink-ghost);
		cursor: pointer;
		transition: color 0.12s;
	}

	.tilbake-btn:hover {
		color: var(--color-vekt);
	}

	.context-separator {
		color: var(--color-ink-ghost);
		font-size: 12px;
	}

	.context-label {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.context-versjon {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		padding: 2px var(--spacing-2);
		border-radius: 9999px;
		background: var(--color-felt-raised);
		color: var(--color-ink-muted);
	}

	/* --- Two-panel layout --- */
	.revision-panels {
		display: grid;
		grid-template-columns: 1fr 380px;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.desktop-panel {
		display: contents;
	}

	/* --- Midtpanel --- */
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

	/* --- BH standpunkt --- */
	.bh-standpunkt {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
		padding: var(--spacing-4);
		border: 1px solid var(--color-wire-strong);
		border-left: 3px solid var(--color-role-bh-text);
		border-radius: var(--radius-sm);
		background: var(--color-felt);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: var(--spacing-2);
		border-bottom: 1px solid var(--color-wire);
	}

	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.section-dato {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-ghost);
	}

	.standpunkt-resultat {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.resultat-badge {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 600;
		padding: 2px var(--spacing-2);
		border-radius: var(--radius-sm);
	}

	.resultat-godkjent .resultat-badge {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.resultat-avslatt .resultat-badge {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.resultat-frafalt .resultat-badge {
		color: var(--color-ink-muted);
		background: var(--color-felt-raised);
	}

	.varsling-tag {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		padding: 2px var(--spacing-2);
		border-radius: 9999px;
		background: var(--color-felt-raised);
		color: var(--color-ink-ghost);
	}

	.varsling-ok {
		background: var(--color-score-high-bg);
		color: var(--color-score-high);
	}

	.varsling-fail {
		background: var(--color-score-low-bg);
		color: var(--color-score-low);
	}

	.standpunkt-begrunnelse {
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-ink-secondary);
	}

	.standpunkt-begrunnelse :global(p) {
		margin: 0 0 0.5em;
	}

	.standpunkt-begrunnelse :global(p:last-child) {
		margin-bottom: 0;
	}

	/* --- Footer --- */
	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--spacing-4);
		border-top: 1px solid var(--color-wire);
	}

	/* FAB + mobil overlay: skjult på desktop */
	.begrunnelse-fab {
		display: none;
	}

	.mobil-panel-overlay {
		display: none;
	}

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

	.panel-tilbake:hover {
		color: var(--color-ink);
	}

	/* --- Mobil (<1024px) --- */
	@media (max-width: 1023px) {
		.revision-panels {
			grid-template-columns: 1fr;
		}

		.desktop-panel {
			display: none;
		}

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

		.form-footer {
			flex-direction: column-reverse;
			gap: var(--spacing-3);
			align-items: stretch;
		}
	}
</style>
