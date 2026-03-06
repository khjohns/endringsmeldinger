<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		erEndringMed32_2,
		erPaalegg,
		erSnuoperasjon,
		erPrekludert,
		getVerdictOptions,
		getDynamicPlaceholder,
	} from '$lib/domain/grunnlagDomain';
	import type { GrunnlagFormState, GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';
	import type { GrunnlagResponsResultat } from '$lib/types/timeline';
	import SammendragKort from './SammendragKort.svelte';
	import SegmentedButtons from './SegmentedButtons.svelte';
	import KonsekvensCallout from './KonsekvensCallout.svelte';
	import BegrunnelseThread from './BegrunnelseThread.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Alert from '$lib/components/primitives/Alert.svelte';

	interface KravData {
		tittel: string;
		hovedkategori: string;
		underkategori?: string;
		hjemmelRef?: string;
		datoVarslet?: string;
		versjon: number;
		begrunnelseHtml: string;
	}

	interface TidligereSvar {
		rolle: 'TE' | 'BH';
		versjon: number;
		html: string;
		dato?: string;
	}

	interface Props {
		prosjektId: string;
		sakId: string;
		saksnr: number;
		krav: KravData;
		tidligereSvar?: TidligereSvar[];
		forrigeResultat?: GrunnlagResponsResultat;
		isUpdateMode?: boolean;
	}

	let {
		prosjektId,
		sakId,
		saksnr,
		krav,
		tidligereSvar = [],
		forrigeResultat,
		isUpdateMode = false,
	}: Props = $props();

	// --- Form state ---
	let varsletITide = $state<boolean | undefined>(undefined);
	let resultat = $state<string | undefined>(undefined);
	let bhBegrunnelseHtml = $state('');
	let submitting = $state(false);
	let activeTab = $state<'begrunnelse' | 'historikk' | 'filer'>('begrunnelse');

	// --- Domain config ---
	const domainConfig: GrunnlagDomainConfig = $derived({
		grunnlagEvent: {
			hovedkategori: krav.hovedkategori,
			underkategori: krav.underkategori,
		},
		isUpdateMode,
		forrigeResultat,
		harSubsidiaereSvar: false,
	});

	// --- Derived ---
	const visVarsling = $derived(erEndringMed32_2(domainConfig.grunnlagEvent));
	const visFrafalt = $derived(erPaalegg(domainConfig.grunnlagEvent));

	const formState: GrunnlagFormState = $derived({
		varsletITide: varsletITide ?? true,
		resultat,
		resultatError: false,
		begrunnelse: bhBegrunnelseHtml,
		begrunnelseValidationError: undefined,
	});

	const prekludert = $derived(erPrekludert(formState, domainConfig));
	const snuoperasjon = $derived(erSnuoperasjon(formState, domainConfig));

	const verdictOptions = $derived(getVerdictOptions(domainConfig));

	const editorPlaceholder = $derived(getDynamicPlaceholder(resultat, prekludert));

	const kategoriTag = $derived.by(() => {
		const labels: Record<string, string> = {
			ENDRING: 'ENDRING',
			SVIKT: 'SVIKT',
			ANDRE: 'ANDRE',
			FORCE_MAJEURE: 'FORCE_MAJ',
		};
		const main = labels[krav.hovedkategori] ?? krav.hovedkategori;
		return krav.underkategori ? `${main}/${krav.underkategori}` : main;
	});

	const varslingTag = $derived.by(() => {
		if (!visVarsling) return null;
		if (varsletITide === undefined) return '§32.2 ?';
		return varsletITide ? '§32.2 ✓' : '§32.2 ✗';
	});

	// Build begrunnelse entries for thread panel
	const begrunnelseEntries = $derived.by(() => {
		const entries: Array<{
			rolle: 'TE' | 'BH';
			versjon: number;
			html: string;
			dato?: string;
			readonly: boolean;
		}> = [];

		// Previous exchange (TE v1 → BH v1 → TE v2 → ...)
		for (const svar of tidligereSvar) {
			entries.push({
				rolle: svar.rolle,
				versjon: svar.versjon,
				html: svar.html,
				dato: svar.dato,
				readonly: true,
			});
		}

		// Current TE begrunnelse (latest version)
		entries.push({
			rolle: 'TE',
			versjon: krav.versjon,
			html: krav.begrunnelseHtml,
			readonly: true,
		});

		return entries;
	});

	// Validation
	const kanSende = $derived.by(() => {
		if (!resultat) return false;
		if (visVarsling && varsletITide === undefined) return false;
		if (submitting) return false;
		return true;
	});

	async function handleSubmit() {
		if (!kanSende) return;
		// TODO: Submit via API
		submitting = true;
		// Placeholder for actual submission
		submitting = false;
	}

	function handleAvbryt() {
		goto(`/${prosjektId}/${sakId}`);
	}
</script>

<div class="bh-response-layout">
	<!-- Context line -->
	<div class="context-line">
		<button class="tilbake-btn" onclick={handleAvbryt}>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
				<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Tilbake til saksark
		</button>
		<span class="context-separator">·</span>
		<span class="context-saksnr">#{saksnr}</span>
		<span class="context-kategori">{kategoriTag}</span>
		{#if varslingTag}
			<span class="context-varsling" class:varsling-ok={varsletITide === true} class:varsling-fail={varsletITide === false}>
				{varslingTag}
			</span>
		{/if}
	</div>

	<!-- Two-panel content -->
	<div class="response-panels">
		<!-- MIDTPANEL: Form -->
		<main class="midtpanel">
			<div class="midtpanel-scroll">
				<!-- Sammendragskort -->
				<SammendragKort
					tittel={krav.tittel}
					hovedkategori={krav.hovedkategori}
					underkategori={krav.underkategori}
					hjemmelRef={krav.hjemmelRef}
					datoVarslet={krav.datoVarslet}
					versjon={krav.versjon}
				/>

				<!-- Varsling §32.2 -->
				{#if visVarsling}
					<section class="form-section">
						<div class="section-header">
							<h3 class="section-label">Varsling §32.2</h3>
							<span class="section-ref">Varslet i tide?</span>
						</div>
						<SegmentedButtons
							options={[
								{ value: 'ja', label: 'Ja, i tide' },
								{ value: 'nei', label: 'Nei, prekludert' },
							]}
							selected={varsletITide === undefined ? undefined : varsletITide ? 'ja' : 'nei'}
							onselect={(v) => (varsletITide = v === 'ja')}
							size="sm"
						/>
						{#if varsletITide === false}
							<Alert variant="warning">
								<strong>Preklusjon</strong> — Varselet vurderes som for sent. Grunnlaget kan fortsatt vurderes subsidiært.
							</Alert>
						{/if}
					</section>
				{/if}

				<!-- Resultat -->
				<section class="form-section">
					<div class="section-header">
						<h3 class="section-label">Resultat</h3>
					</div>
					<SegmentedButtons
						options={verdictOptions.map(o => ({
							value: o.value,
							label: o.label,
							icon: o.icon,
							colorScheme: o.colorScheme,
						}))}
						selected={resultat}
						onselect={(v) => (resultat = v)}
					/>
				</section>

				<!-- Konsekvens-callout -->
				<KonsekvensCallout
					{resultat}
					erPrekludert={prekludert}
					erPaalegg={visFrafalt}
					erSnuoperasjon={snuoperasjon}
				/>

				<!-- Footer -->
				<div class="form-footer">
					<Button variant="secondary" onclick={handleAvbryt}>
						Avbryt
					</Button>
					<Button variant="primary" disabled={!kanSende} loading={submitting} onclick={handleSubmit}>
						Send svar
					</Button>
				</div>
			</div>
		</main>

		<!-- HØYREPANEL: Begrunnelsetråd -->
		<BegrunnelseThread
			entries={begrunnelseEntries}
			bind:bhBegrunnelseHtml
			editorPlaceholder={editorPlaceholder}
			{activeTab}
			ontabchange={(tab) => (activeTab = tab)}
		/>
	</div>
</div>

<style>
	.bh-response-layout {
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
		flex-wrap: wrap;
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
		font-size: 13px;
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: color 0.12s, background-color 0.12s;
	}

	.tilbake-btn:hover {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.context-separator {
		color: var(--color-ink-ghost);
		font-size: 12px;
	}

	.context-saksnr {
		font-family: var(--font-data);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.context-kategori {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.04em;
		padding: 2px var(--spacing-2);
		border-radius: 9999px;
		background: var(--color-felt-raised);
		color: var(--color-ink-muted);
	}

	.context-varsling {
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

	/* --- Two-panel layout --- */
	.response-panels {
		display: grid;
		grid-template-columns: 1fr 380px;
		flex: 1;
		min-height: 0;
		overflow: hidden;
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

	/* --- Form sections --- */
	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
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

	.section-ref {
		font-size: 11px;
		color: var(--color-ink-ghost);
	}

	/* --- Footer --- */
	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--spacing-4);
		border-top: 1px solid var(--color-wire);
	}

	/* --- Mobile --- */
	@media (max-width: 1023px) {
		.response-panels {
			grid-template-columns: 1fr;
		}

		.midtpanel-scroll {
			max-width: none;
			padding: var(--spacing-4);
		}
	}
</style>
