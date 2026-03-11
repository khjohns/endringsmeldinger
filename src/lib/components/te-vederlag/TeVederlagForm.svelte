<script lang="ts">
	import type { VederlagsMetode } from '$lib/constants/paymentMethods';
	import {
		VEDERLAGSMETODE_DESCRIPTIONS,
	} from '$lib/constants/paymentMethods';
	import {
		getDefaults,
		beregnCanSubmit,
		getDynamicPlaceholder,
		buildEventData,
		getEventType,
	} from '$lib/domain/vederlagSubmissionDomain';
	import type {
		VederlagSubmissionFormState,
		VederlagSubmissionScenario,
		VederlagSubmissionDefaultsConfig,
	} from '$lib/domain/vederlagSubmissionDomain';
	import { goto } from '$app/navigation';
	import { submitEvent } from '$lib/api/events';
	import type { EventType } from '$lib/types/timeline';
	import { useQueryClient } from '@tanstack/svelte-query';
	import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
	import NumberInput from '$lib/components/primitives/NumberInput.svelte';
	import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
	import FormSection from '$lib/components/shared/FormSection.svelte';

	interface FormActions {
		submitLabel: string;
		kanSende: boolean;
		submitting: boolean;
		submitError: string;
		onsubmit: () => void;
		onavbryt: () => void;
	}

	interface Props {
		scenario: VederlagSubmissionScenario;
		existing?: VederlagSubmissionDefaultsConfig['existing'];
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
	const isLocked = $derived(scenario === 'edit');

	// Dynamic label for the main amount field based on method
	const hovedkravLabel = $derived.by(() => {
		if (metode === 'ENHETSPRISER') return 'Anslått beløp';
		if (metode === 'REGNINGSARBEID') return 'Kostnadsoverslag';
		if (metode === 'FASTPRIS_TILBUD') return 'Fast pris';
		return 'Beløp';
	});

	// Route value to correct state var based on method
	const hovedkravValue = $derived(
		metode === 'REGNINGSARBEID' ? kostnadsOverslag : belopDirekte
	);

	function handleHovedkravChange(v: number | null) {
		if (metode === 'REGNINGSARBEID') {
			kostnadsOverslag = v ?? undefined;
		} else {
			belopDirekte = v ?? undefined;
		}
	}

	const metodeDescription = $derived(
		metode ? VEDERLAGSMETODE_DESCRIPTIONS[metode] : undefined
	);

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
	const KRAVLINJER = ['Hovedkrav', 'Rigg/Drift', 'Produktivitet'];

	$effect(() => {
		onplaceholder?.(placeholder);
	});

	$effect(() => {
		onkravlinjer?.(KRAVLINJER);
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
	<FormSection>
		<SectionHeading title="Beregningsmetode" paragrafRef="§34.2" />
		<div class="field-auto">
			<SegmentedControl
				value={metode ?? ''}
				options={METODE_OPTIONS}
				onchange={(v) => { metode = v as VederlagsMetode; }}
				disabled={isLocked}
			/>
		</div>
		{#if metodeDescription}
			<p class="helptext">{metodeDescription}</p>
		{/if}
	</FormSection>

	<!-- HOVEDKRAV §34.2–34.4 -->
	<FormSection>
		<SectionHeading title="Hovedkrav" paragrafRef="§34.1.1–34.1.2" />
		<div class="field-amount">
			<NumberInput
				label={hovedkravLabel}
				suffix="kr"
				value={hovedkravValue ?? null}
				onchange={handleHovedkravChange}
			/>
		</div>
	</FormSection>

	<!-- SÆRSKILTE KRAV §34.1.3 -->
	<FormSection>
		<SectionHeading title="Særskilte krav" paragrafRef="§34.1.3" />
		<p class="helptext">Eventuelle tilleggskrav for rigg/drift-kostnader eller produktivitetstap som følge av endringen.</p>
		<div class="field-amount">
			<NumberInput
				label="Rigg og drift"
				suffix="kr"
				value={belopRigg ?? null}
				onchange={(v) => (belopRigg = v ?? undefined)}
			/>
		</div>
		<div class="field-amount">
			<NumberInput
				label="Produktivitetstap"
				suffix="kr"
				value={belopProduktivitet ?? null}
				onchange={(v) => (belopProduktivitet = v ?? undefined)}
			/>
		</div>
	</FormSection>
</div>

<style>
	.te-vederlag-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-6);
	}
</style>
