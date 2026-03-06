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
	import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';

	// --- Form state ---
	let valgtHjemmel = $state<ValgtHjemmel | null>(null);
	let tittel = $state('');
	let beskrivelse = $state('');
	let datoOppdaget = $state('');
	let begrunnelseHtml = $state('');
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
		if (!beskrivelse.trim()) feil.push('Beskrivelse er påkrevd');
		if (!datoOppdaget) feil.push('Dato oppdaget er påkrevd');
		return feil;
	});

	const kanSende = $derived(valideringsfeil.length === 0 && !submitting);

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
				beskrivelse: beskrivelse.trim(),
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

	<!-- DETALJER -->
	<section class="form-section">
		<div class="section-header">
			<h3 class="section-label">Detaljer</h3>
		</div>

		<div class="field">
			<label class="field-label" for="tittel">Tittel</label>
			<input
				id="tittel"
				type="text"
				class="field-control"
				placeholder="Kort beskrivelse av forholdet"
				bind:value={tittel}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="beskrivelse">Beskrivelse</label>
			<textarea
				id="beskrivelse"
				class="field-control field-textarea"
				placeholder="Hva har skjedd? Beskriv forholdet som utløser kravet."
				bind:value={beskrivelse}
			></textarea>
		</div>

		<div class="field">
			<DatePicker
				label="Dato oppdaget"
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

	<!-- BEGRUNNELSE -->
	<section class="form-section">
		<div class="section-header">
			<h3 class="section-label">Begrunnelse</h3>
			<span class="rolle-badge">TE</span>
		</div>
		<RichTextEditor
			placeholder={begrunnelsePlaceholder}
			bind:html={begrunnelseHtml}
			hint="Referer til kontraktsbestemmelser med §-tegn."
			maxHeight="40vh"
		/>
	</section>

	<!-- VEDLEGG -->
	<section class="form-section">
		<div class="section-header">
			<h3 class="section-label">Vedlegg</h3>
		</div>
		<div class="upload-zone">
			<svg class="upload-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<path d="M10 4V14M10 4L6 8M10 4L14 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M3 14V15C3 16.1046 3.89543 17 5 17H15C16.1046 17 17 16.1046 17 15V14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<span class="upload-tekst">Dra filer hit eller klikk for å laste opp</span>
			<span class="upload-format">PDF, DOCX, XLSX, JPG</span>
		</div>
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
			{#if valideringsfeil.length > 0 && (tittel || beskrivelse || datoOppdaget || valgtHjemmel)}
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
		gap: var(--spacing-6);
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

	.rolle-badge {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 9999px;
		background: rgba(96, 165, 250, 0.12);
		color: #60a5fa;
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
		font-weight: 400;
		color: var(--color-ink-secondary);
	}

	.field-control {
		width: 100%;
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-ink);
		padding: 0 var(--spacing-3);
		outline: none;
		transition: border-color 0.12s;
		height: 36px;
	}

	.field-control:focus {
		border-color: var(--color-wire-focus);
	}

	.field-control::placeholder {
		color: var(--color-ink-ghost);
	}

	.field-textarea {
		min-height: 80px;
		height: auto;
		line-height: 1.5;
		padding: var(--spacing-2) var(--spacing-3);
		resize: vertical;
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

	/* --- Upload zone --- */
	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-6) var(--spacing-4);
		border: 1px dashed var(--color-wire-strong);
		border-radius: var(--radius-md);
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: border-color 0.15s, background-color 0.15s;
	}

	.upload-zone:hover {
		border-color: var(--color-vekt-dim);
		background: var(--color-vekt-bg);
	}

	.upload-icon { color: var(--color-ink-ghost); }
	.upload-tekst { font-size: 13px; }
	.upload-format { font-size: 11px; color: var(--color-ink-ghost); }

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
