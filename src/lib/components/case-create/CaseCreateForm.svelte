<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { ValgtHjemmel } from '$lib/types/hjemmel';
	import { submitEvent } from '$lib/api/events';
	import { beregnDagerSiden, getPreklusjonsvarsel } from '$lib/utils/preklusjonssjekk';
	import HjemmelVelger from './HjemmelVelger.svelte';
	import Alert from '$lib/components/primitives/Alert.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import DatePicker from '$lib/components/primitives/DatePicker.svelte';

	interface Props {
		begrunnelseHtml: string;
		onplaceholder?: (placeholder: string) => void;
	}

	let { begrunnelseHtml = $bindable(''), onplaceholder }: Props = $props();

	// --- Form state ---
	let valgtHjemmel = $state<ValgtHjemmel | null>(null);
	let tittel = $state('');
	let datoOppdaget = $state('');
	let submitting = $state(false);
	let submitError = $state('');

	// --- Derived ---
	const prosjektId = $derived(page.params.prosjektId);

	const erEndringUtenEO = $derived(
		valgtHjemmel?.kontraktsforhold.kode === 'ENDRING' &&
		valgtHjemmel?.hjemmel?.kode !== 'EO'
	);

	const erForceMajeure = $derived(
		valgtHjemmel?.kontraktsforhold.kode === 'FORCE_MAJEURE'
	);

	const dagerSidenOppdaget = $derived(
		datoOppdaget ? beregnDagerSiden(datoOppdaget) : 0
	);

	const preklusjonsvarsel = $derived.by(() => {
		if (!erEndringUtenEO || !datoOppdaget || dagerSidenOppdaget <= 0) return null;
		return getPreklusjonsvarsel(dagerSidenOppdaget, undefined, 'ENDRING').alert ?? null;
	});

	const datoHint = $derived.by(() => {
		if (!datoOppdaget || dagerSidenOppdaget <= 0) return '';
		if (dagerSidenOppdaget === 1) return '1 dag siden';
		return `${dagerSidenOppdaget} dager siden`;
	});

	const datoHintFarge = $derived.by(() => {
		if (!erEndringUtenEO) return 'normal';
		if (dagerSidenOppdaget > 14) return 'kritisk';
		if (dagerSidenOppdaget > 3) return 'varsel';
		return 'normal';
	});

	const begrunnelsePlaceholder = $derived(
		erForceMajeure
			? 'Beskriv den ekstraordinære hendelsen og hvorfor den er utenfor din kontroll. Henvis til kontraktsbestemmelser og dokumentasjon.'
			: 'Beskriv bakgrunnen for kravet og henvis til relevant kontraktsbestemmelse. Legg ved dokumentasjon som underbygger kravet.'
	);

	const submitLabel = $derived(erEndringUtenEO ? 'Send varsel' : 'Opprett sak');

	const submitRef = $derived.by(() => {
		if (erEndringUtenEO) return '§32.2';
		if (erForceMajeure) return '§33.3';
		if (valgtHjemmel?.hjemmel) return `§${valgtHjemmel.hjemmel.hjemmel_basis}`;
		return '';
	});

	// Validering
	const valideringsfeil = $derived.by(() => {
		const feil: string[] = [];
		if (!valgtHjemmel) feil.push('Velg kontraktshjemmel');
		if (!tittel.trim() || tittel.trim().length < 5) feil.push('Tittel må ha minst 5 tegn');
		if (!datoOppdaget) feil.push('Dato oppdaget er påkrevd');
		return feil;
	});

	const kanSende = $derived(valideringsfeil.length === 0 && !submitting);

	$effect(() => {
		onplaceholder?.(begrunnelsePlaceholder);
	});

	async function handleSubmit() {
		if (!kanSende || !valgtHjemmel) return;
		submitting = true;
		submitError = '';

		try {
			const sakId = crypto.randomUUID();

			await submitEvent(sakId, 'sak_opprettet', {
				prosjekt_id: prosjektId,
				sakstype: 'standard',
				tittel: tittel.trim(),
			});

			await submitEvent(sakId, 'grunnlag_opprettet', {
				tittel: tittel.trim(),
				hovedkategori: valgtHjemmel.kontraktsforhold.kode,
				underkategori: valgtHjemmel.hjemmel?.kode ?? null,
				dato_oppdaget: datoOppdaget,
				begrunnelse: begrunnelseHtml.trim() || undefined,
			});

			await goto(`/${prosjektId}/${sakId}`);
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Kunne ikke opprette saken. Prøv igjen.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="create-form">
	<!-- TITTEL -->
	<div class="field tittel-field">
		<input
			id="tittel"
			type="text"
			class="tittel-input"
			placeholder="Navn på kravet"
			bind:value={tittel}
			autofocus
		/>
	</div>

	<!-- KONTRAKTSHJEMMEL -->
	<section class="form-section">
		<div class="section-header">
			<h3 class="section-label">Kontraktshjemmel</h3>
		</div>
		<HjemmelVelger valgt={valgtHjemmel} onvelg={(valg) => (valgtHjemmel = valg)} />
	</section>

	{#if erForceMajeure}
		<Alert variant="info">
			<strong>Force Majeure</strong> <span class="alert-ref">§33.3</span> — Gir kun rett til fristforlengelse, ikke vederlag.
		</Alert>
	{/if}

	<!-- DATO OPPDAGET -->
	<section class="form-section">
		<div class="section-header">
			<h3 class="section-label">Dato oppdaget</h3>
		</div>
		<div class="field">
			<DatePicker
				label=""
				value={datoOppdaget}
				onchange={(v) => (datoOppdaget = v)}
			/>
			{#if datoHint}
				<div class="dato-elapsed dato-{datoHintFarge}">
					{datoHint}
				</div>
			{/if}
		</div>

		{#if preklusjonsvarsel}
			<Alert variant={preklusjonsvarsel.variant === 'danger' ? 'danger' : 'warning'}>
				<strong>{preklusjonsvarsel.title}</strong> — {preklusjonsvarsel.message}
			</Alert>
		{/if}
	</section>

	{#if submitError}
		<Alert variant="danger">
			<strong>Feil ved opprettelse</strong> — {submitError}
		</Alert>
	{/if}

	<!-- FOOTER -->
	<div class="form-footer">
		<Button variant="secondary" onclick={() => goto(`/${prosjektId}`)}>
			Avbryt
		</Button>
		<div class="footer-right">
			{#if valideringsfeil.length > 0 && (tittel || datoOppdaget || valgtHjemmel)}
				<span class="validation-hint">{valideringsfeil[0]}</span>
			{/if}
			<Button variant="primary" disabled={!kanSende} loading={submitting} onclick={handleSubmit}>
				{submitLabel}
				{#if submitRef}
					<span class="btn-ref">{submitRef}</span>
				{/if}
			</Button>
		</div>
	</div>
</div>

<style>
	.create-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
	}

	/* --- Hero tittel --- */
	.tittel-field {
		margin-bottom: var(--spacing-2);
	}

	.tittel-input {
		width: 100%;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-wire);
		font-family: var(--font-ui);
		font-size: 18px;
		font-weight: 600;
		color: var(--color-ink);
		padding: 0 0 var(--spacing-2);
		outline: none;
		transition: border-color 0.12s;
	}

	.tittel-input:hover {
		border-color: var(--color-wire-strong);
	}

	.tittel-input:focus {
		border-color: var(--color-wire-focus);
	}

	.tittel-input::placeholder {
		color: var(--color-ink-ghost);
		font-weight: 400;
	}

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

	.alert-ref {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 500;
	}

	/* --- Fields --- */
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.field-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	.field-control {
		width: 100%;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-ink);
		padding: 0 var(--spacing-3);
		outline: none;
		transition: border-color 0.12s;
		height: 32px;
	}

	.field-control:hover {
		border-color: var(--color-wire-strong);
	}

	.field-control:focus {
		border-color: var(--color-wire-focus);
	}

	.field-control::placeholder {
		color: var(--color-ink-ghost);
	}

	/* --- Dato elapsed hint --- */
	.dato-elapsed {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		margin-top: var(--spacing-1);
	}

	.dato-normal { color: var(--color-ink-muted); }
	.dato-varsel { color: var(--color-vekt); }
	.dato-kritisk { color: var(--color-score-low); }

	/* --- Footer --- */
	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--spacing-4);
		border-top: 1px solid var(--color-wire);
	}

	.footer-right {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.validation-hint {
		font-size: 11px;
		color: var(--color-ink-ghost);
	}

	.btn-ref {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 400;
		opacity: 0.7;
		margin-left: var(--spacing-1);
	}

	@media (max-width: 480px) {
		.form-footer {
			flex-direction: column-reverse;
			gap: var(--spacing-3);
			align-items: stretch;
		}

		.footer-right {
			flex-direction: column;
			align-items: stretch;
		}

		.validation-hint {
			text-align: center;
		}
	}
</style>
