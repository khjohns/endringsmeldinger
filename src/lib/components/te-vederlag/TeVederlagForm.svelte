<script lang="ts">
	import type { VederlagsMetode } from '$lib/constants/paymentMethods';
	import {
		VEDERLAGSMETODE_DESCRIPTIONS,
	} from '$lib/constants/paymentMethods';
	import {
		getDefaults,
		beregnVisibility,
		beregnCanSubmit,
		getDynamicPlaceholder,
		buildEventData,
		getEventType,
	} from '$lib/domain/vederlagSubmissionDomain';
	import type {
		VederlagSubmissionFormState,
		VederlagSubmissionScenario,
	} from '$lib/domain/vederlagSubmissionDomain';
	import { goto } from '$app/navigation';
	import { submitEvent } from '$lib/api/events';
	import type { EventType } from '$lib/types/timeline';
	import { useQueryClient } from '@tanstack/svelte-query';
	import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
	import NumberInput from '$lib/components/primitives/NumberInput.svelte';
	import Checkbox from '$lib/components/primitives/Checkbox.svelte';
	import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';

	interface FormActions {
		submitLabel: string;
		kanSende: boolean;
		submitting: boolean;
		submitError: string;
		onsubmit: () => void;
		onavbryt: () => void;
	}

	interface ExistingData {
		metode?: VederlagsMetode;
		belop_direkte?: number;
		kostnads_overslag?: number;
		krever_justert_ep?: boolean;
		varslet_for_oppstart?: boolean;
		begrunnelse?: string;
		saerskilt_krav?: {
			rigg_drift?: { belop?: number };
			produktivitet?: { belop?: number };
		} | null;
	}

	interface Props {
		scenario: VederlagSubmissionScenario;
		existing?: ExistingData;
		prosjektId: string;
		sakId: string;
		grunnlagEventId: string;
		originalEventId?: string;
		begrunnelseHtml: string;
		onplaceholder?: (placeholder: string) => void;
		onactions?: (actions: FormActions) => void;
		onkravlinjer?: (linjer: string[]) => void;
	}

	let {
		scenario,
		existing,
		prosjektId,
		sakId,
		grunnlagEventId,
		originalEventId,
		begrunnelseHtml = $bindable(''),
		onplaceholder,
		onactions,
		onkravlinjer,
	}: Props = $props();

	const queryClient = useQueryClient();

	// --- Initialize from domain defaults ---
	const defaults = getDefaults({ scenario, existing });

	let metode = $state<VederlagsMetode | undefined>(defaults.metode);
	let belopDirekte = $state<number | undefined>(defaults.belopDirekte);
	let kostnadsOverslag = $state<number | undefined>(defaults.kostnadsOverslag);
	let kreverJustertEp = $state(defaults.kreverJustertEp);
	let varsletForOppstart = $state(defaults.varsletForOppstart);
	let belopRigg = $state<number | undefined>(defaults.belopRigg);
	let belopProduktivitet = $state<number | undefined>(defaults.belopProduktivitet);
	let submitting = $state(false);
	let submitError = $state('');

	// --- Derived ---
	const harRiggKrav = $derived((belopRigg ?? 0) > 0);
	const harProduktivitetKrav = $derived((belopProduktivitet ?? 0) > 0);
	const visibility = $derived(beregnVisibility({ metode }));
	const metodeDescription = $derived(
		metode ? VEDERLAGSMETODE_DESCRIPTIONS[metode] : undefined
	);
	const isLocked = $derived(scenario === 'edit');

	const mappedState: VederlagSubmissionFormState = $derived({
		metode,
		belopDirekte,
		kostnadsOverslag,
		kreverJustertEp,
		varsletForOppstart,
		harRiggKrav,
		belopRigg,
		datoKlarOverRigg: undefined,
		harProduktivitetKrav,
		belopProduktivitet,
		datoKlarOverProduktivitet: undefined,
		begrunnelse: begrunnelseHtml,
		begrunnelseValidationError: undefined,
	});

	const kanSende = $derived(beregnCanSubmit(mappedState));
	const placeholder = $derived(getDynamicPlaceholder(metode));

	// --- Expose kravlinjer for vedlegg-tagging ---
	const aktiveTags = $derived.by(() => {
		const tags: string[] = [];
		if (metode) tags.push('Hovedkrav');
		if (harRiggKrav) tags.push('Rigg/Drift');
		if (harProduktivitetKrav) tags.push('Produktivitet');
		return tags;
	});

	$effect(() => {
		onplaceholder?.(placeholder);
	});

	$effect(() => {
		onkravlinjer?.(aktiveTags);
	});

	const submitLabel = $derived(
		scenario === 'edit' ? 'Oppdater krav §34' : 'Send krav §34'
	);

	async function handleSubmit() {
		if (!kanSende) return;
		submitting = true;
		submitError = '';

		try {
			const eventData = buildEventData(mappedState, {
				scenario,
				grunnlagEventId,
				originalEventId,
			});

			const eventType = getEventType({ scenario });

			await submitEvent(sakId, eventType as EventType, eventData as unknown as Record<string, unknown>);
			await queryClient.invalidateQueries({ queryKey: ['case-context', sakId] });
			goto(`/${prosjektId}/${sakId}`);
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Kunne ikke sende krav';
			submitting = false;
		}
	}

	function handleAvbryt() {
		goto(`/${prosjektId}/${sakId}`);
	}

	$effect(() => {
		onactions?.({
			submitLabel,
			kanSende,
			submitting,
			submitError,
			onsubmit: handleSubmit,
			onavbryt: handleAvbryt,
		});
	});

	const METODE_OPTIONS = [
		{ id: 'ENHETSPRISER' as const, label: 'Enhetspriser' },
		{ id: 'REGNINGSARBEID' as const, label: 'Regningsarbeid' },
		{ id: 'FASTPRIS_TILBUD' as const, label: 'Fastpris' },
	];
</script>

<div class="te-vederlag-form">
	<!-- BEREGNINGSMETODE §34 -->
	<section class="form-section">
		<SectionHeading title="Beregningsmetode" paragrafRef="§34" />
		<SegmentedControl
			value={metode ?? ''}
			options={METODE_OPTIONS}
			onchange={(v) => { metode = v as VederlagsMetode; }}
			disabled={isLocked}
		/>
		{#if metodeDescription}
			<p class="metode-description">{metodeDescription}</p>
		{/if}
	</section>

	<!-- METODE-SPESIFIKKE FELT -->
	{#if metode}
		<section class="form-section">
			{#if visibility.showBelopDirekte}
				<NumberInput
					label="Beløp"
					suffix="kr"
					value={belopDirekte ?? null}
					onchange={(v) => (belopDirekte = v ?? undefined)}
				/>
			{/if}
			{#if visibility.showKostnadsOverslag}
				<NumberInput
					label="Kostnadsoverslag"
					suffix="kr"
					value={kostnadsOverslag ?? null}
					onchange={(v) => (kostnadsOverslag = v ?? undefined)}
				/>
			{/if}
			{#if visibility.showJustertEp}
				<Checkbox
					checked={kreverJustertEp}
					label="Krever justerte enhetspriser"
					paragrafRef="§34.3.3"
					onchange={(v) => (kreverJustertEp = v)}
				/>
			{/if}
			{#if visibility.showVarsletForOppstart}
				<Checkbox
					checked={varsletForOppstart}
					label="Varslet før oppstart"
					paragrafRef="§34.2.2"
					onchange={(v) => (varsletForOppstart = v)}
				/>
			{/if}
		</section>
	{/if}

	<!-- SÆRSKILTE KRAV §34.1.3 -->
	{#if metode}
		<section class="form-section">
			<div class="kravlinje-container">
				<span class="kravlinje-label">Særskilte krav §34.1.3</span>
				<p class="kravlinje-helptext">Oppgi beløp hvis relevant</p>

				<div class="kravlinje">
					<NumberInput
						label="Rigg og drift"
						suffix="kr"
						value={belopRigg ?? null}
						onchange={(v) => (belopRigg = v ?? undefined)}
					/>
				</div>

				<div class="kravlinje-separator"></div>

				<div class="kravlinje">
					<NumberInput
						label="Produktivitetstap"
						suffix="kr"
						value={belopProduktivitet ?? null}
						onchange={(v) => (belopProduktivitet = v ?? undefined)}
					/>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.te-vederlag-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.metode-description {
		font-size: 13px;
		color: var(--color-ink-secondary);
		line-height: 1.5;
		margin: 0;
	}

	/* Kravlinje-container: innfelt canvas-boks */
	.kravlinje-container {
		position: relative;
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		padding: var(--spacing-4);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.kravlinje-label {
		position: absolute;
		top: -8px;
		left: var(--spacing-4);
		background: var(--color-felt);
		padding: 0 var(--spacing-2);
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-ghost);
	}

	.kravlinje-helptext {
		font-size: 12px;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.kravlinje-separator {
		border-bottom: 1px dashed var(--color-wire);
	}
</style>
