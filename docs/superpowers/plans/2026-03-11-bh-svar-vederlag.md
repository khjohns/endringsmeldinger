# BH Svar på Vederlagskrav — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the BH response page for TE's vederlagskrav — four-port evaluation (preklusjon, metode, beløp, begrunnelse) with per-kravlinje subsidiary logic.

**Architecture:** Route file derives data from `createCaseContextQuery` and passes to `BhVederlagResponse` component, which owns `FormWithRightPanel`. Domain logic lives entirely in existing `vederlagDomain.ts` — no domain changes needed. Four new UI components + route file.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TanStack Query, existing design system tokens.

**Spec:** `docs/superpowers/specs/2026-03-11-bh-svar-vederlag-design.md`

---

## File Structure

### Create

| File | Responsibility |
|---|---|
| `src/routes/[prosjektId]/[sakId]/svar-vederlag/+page.svelte` | Route — data derivation from query, delegates to BhVederlagResponse |
| `src/lib/components/bh-response/BhVederlagResponse.svelte` | Form orchestrator — state, domain computation, submit logic |
| `src/lib/components/bh-response/VederlagSammendrag.svelte` | Read-only display of TE's vederlagskrav (metode + kravlinjer + sum + begrunnelse) |
| `src/lib/components/bh-response/VederlagKonsekvens.svelte` | Result callout — prinsipalt + subsidiært resultat med beløp |

### Existing (no modifications)

| File | Used for |
|---|---|
| `src/lib/domain/vederlagDomain.ts` | All domain logic: `beregnAlt`, `buildEventData`, `getDefaults`, types |
| `src/lib/constants/paymentMethods.ts` | `getVederlagsmetodeLabel`, `VEDERLAGSMETODER_OPTIONS` |
| `src/lib/components/shared/FormWithRightPanel.svelte` | Two-panel layout with BegrunnelseThread |
| `src/lib/components/shared/FormPageHeader.svelte` | Page header with back link, eyebrow, context |
| `src/lib/components/shared/FormSection.svelte` | Section wrapper with gap + helptext/field-amount |
| `src/lib/components/primitives/SectionHeading.svelte` | Title + §-ref heading |
| `src/lib/components/primitives/NumberInput.svelte` | Amount input with formatting |
| `src/lib/components/bh-response/SegmentedButtons.svelte` | Radio-style verdict buttons |
| `src/lib/components/bh-response/BegrunnelseThread.svelte` | Right panel: editor + historikk + filer |
| `src/lib/api/events.ts` | `submitEvent` for API submission |
| `src/lib/queries/caseContext.ts` | `createCaseContextQuery` for data loading |

---

## Chunk 1: VederlagSammendrag + VederlagKonsekvens Components

### Task 1: VederlagSammendrag — TE's krav read-only display

**Files:**
- Create: `src/lib/components/bh-response/VederlagSammendrag.svelte`

- [ ] **Step 1: Create VederlagSammendrag component**

```svelte
<script lang="ts">
	import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
	import { getVederlagsmetodeLabel } from '$lib/constants/paymentMethods';
	import { formatCurrency } from '$lib/utils/formatters';

	interface KravlinjeData {
		label: string;
		belop: number;
	}

	interface Props {
		metode?: string;
		kravlinjer: KravlinjeData[];
		sumKrevd: number;
		begrunnelseHtml?: string;
	}

	let { metode, kravlinjer, sumKrevd, begrunnelseHtml }: Props = $props();

	let utvidet = $state(false);
	let begrunnelseEl = $state<HTMLElement | null>(null);
	const erAvkortet = $derived(
		begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false,
	);
</script>

<div class="vederlag-sammendrag">
	<SectionHeading title="Vederlagskrav" paragrafRef="§34.1" />

	{#if metode}
		<div class="metode-linje">
			<span class="metode-label">Beregningsmetode:</span>
			<span class="metode-verdi">{getVederlagsmetodeLabel(metode)}</span>
		</div>
	{/if}

	<div class="kravlinjer">
		{#each kravlinjer as linje}
			<div class="kravlinje">
				<span class="kravlinje-label">{linje.label}</span>
				<span class="kravlinje-belop">{formatCurrency(linje.belop)}</span>
			</div>
		{/each}
		{#if kravlinjer.length > 1}
			<div class="kravlinje kravlinje-sum">
				<span class="kravlinje-label">Sum krevd</span>
				<span class="kravlinje-belop">{formatCurrency(sumKrevd)}</span>
			</div>
		{/if}
	</div>

	{#if begrunnelseHtml}
		<div
			class="begrunnelse"
			class:avkortet={!utvidet}
			bind:this={begrunnelseEl}
		>
			{@html begrunnelseHtml}
		</div>
		{#if erAvkortet || utvidet}
			<button class="vis-mer-btn" onclick={() => (utvidet = !utvidet)}>
				{utvidet ? 'Vis mindre' : 'Vis mer'}
			</button>
		{/if}
	{/if}
</div>

<style>
	.vederlag-sammendrag {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.metode-linje {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-2);
		font-size: 13px;
	}

	.metode-label {
		color: var(--color-ink-muted);
	}

	.metode-verdi {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		background: var(--color-felt-active);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: 2px 8px;
	}

	.kravlinjer {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.kravlinje {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 2px 0;
	}

	.kravlinje-label {
		font-size: 13px;
		color: var(--color-ink-secondary);
	}

	.kravlinje-belop {
		font-family: var(--font-data);
		font-size: 13px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
	}

	.kravlinje-sum {
		border-top: 1px solid var(--color-wire);
		padding-top: var(--spacing-2);
		margin-top: var(--spacing-1);
	}

	.kravlinje-sum .kravlinje-label {
		font-weight: 600;
		color: var(--color-ink);
	}

	.kravlinje-sum .kravlinje-belop {
		font-weight: 600;
	}

	.begrunnelse {
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-ink-secondary);
		overflow: hidden;
	}

	.begrunnelse :global(p) {
		margin: 0 0 0.5em;
	}

	.avkortet {
		max-height: calc(1.6em * 10);
	}

	.vis-mer-btn {
		align-self: flex-start;
		background: none;
		border: none;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
		cursor: pointer;
		padding: 0;
	}

	.vis-mer-btn:hover {
		color: var(--color-vekt);
	}
</style>
```

- [ ] **Step 2: Verify component renders**

Run: `npm run check`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/bh-response/VederlagSammendrag.svelte
git commit -m "feat: add VederlagSammendrag component for TE krav display"
```

---

### Task 2: VederlagKonsekvens — Result callout with prinsipalt/subsidiært

**Files:**
- Create: `src/lib/components/bh-response/VederlagKonsekvens.svelte`

- [ ] **Step 1: Create VederlagKonsekvens component**

This component shows the computed result from `beregnAlt`. It extends `KonsekvensCallout`'s visual language but handles vederlag-specific results: prinsipalt with amounts, and optional subsidiært standpunkt.

```svelte
<script lang="ts">
	import type { VederlagBeregningResultat, SubsidiaerTrigger } from '$lib/types/timeline';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		prinsipaltResultat?: VederlagBeregningResultat;
		totalKrevd: number;
		totalGodkjent: number;
		visSubsidiaert: boolean;
		subsidiaertResultat?: VederlagBeregningResultat;
		totalGodkjentSubsidiaert?: number;
		subsidiaerTriggers?: SubsidiaerTrigger[];
	}

	let {
		prinsipaltResultat,
		totalKrevd,
		totalGodkjent,
		visSubsidiaert,
		subsidiaertResultat,
		totalGodkjentSubsidiaert,
		subsidiaerTriggers = [],
	}: Props = $props();

	const TRIGGER_LABELS: Record<SubsidiaerTrigger, string> = {
		grunnlag_avslatt: 'Grunnlaget avslått',
		grunnlag_prekludert_32_2: 'Grunnlag varslet for sent (§32.2)',
		forseringsrett_avslatt: 'Forseringsrett avslått',
		preklusjon_hovedkrav: 'Hovedkrav prekludert (§34.1.2)',
		preklusjon_rigg: 'Rigg og drift prekludert (§34.1.3)',
		preklusjon_produktivitet: 'Produktivitetstap prekludert (§34.1.3)',
		reduksjon_ep_justering: 'EP-justering varslet for sent (§34.3.3)',
		preklusjon_varsel: 'Varsel for sent (§33.4)',
		reduksjon_spesifisert: 'Spesifisert krav for sent (§33.6)',
		ingen_hindring: 'Ingen reell fremdriftshindring',
		metode_avslatt: 'Beregningsmetode avslått',
	};

	const RESULTAT_LABELS: Record<VederlagBeregningResultat, string> = {
		godkjent: 'Godkjent',
		delvis_godkjent: 'Delvis godkjent',
		avslatt: 'Avslått',
		hold_tilbake: 'Tilbakeholdt',
	};

	const variant = $derived.by(() => {
		if (!prinsipaltResultat) return null;
		if (prinsipaltResultat === 'godkjent') return 'positive' as const;
		if (prinsipaltResultat === 'avslatt') return 'negative' as const;
		return 'mixed' as const;
	});
</script>

{#if variant && prinsipaltResultat}
	<div class="vederlag-konsekvens konsekvens-{variant}" role="status">
		<div class="konsekvens-header">
			{#if variant === 'positive'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M4 8.5L6.5 11L12 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{:else if variant === 'negative'}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M5 5L11 11M11 5L5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.25"/>
					<path d="M5 8H11" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
				</svg>
			{/if}
			<span class="konsekvens-tittel">{RESULTAT_LABELS[prinsipaltResultat]}</span>
		</div>

		<div class="belop-rad">
			<span class="belop-label">Krevd</span>
			<span class="belop-verdi">{formatCurrency(totalKrevd)}</span>
			<span class="belop-pil">→</span>
			<span class="belop-label">Godkjent</span>
			<span class="belop-verdi belop-godkjent">{formatCurrency(totalGodkjent)}</span>
		</div>

		{#if visSubsidiaert && subsidiaertResultat}
			<div class="subsidiaert-seksjon">
				<div class="subsidiaert-header">
					<span class="subsidiaert-label">Subsidiært: {RESULTAT_LABELS[subsidiaertResultat]}</span>
					<span class="belop-verdi">{formatCurrency(totalGodkjentSubsidiaert)}</span>
				</div>
				{#if subsidiaerTriggers.length > 0}
					<ul class="trigger-liste">
						{#each subsidiaerTriggers as trigger}
							<li>{TRIGGER_LABELS[trigger]}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.vederlag-konsekvens {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		padding: var(--spacing-3) var(--spacing-4);
		border-radius: var(--radius-md);
		border-left: 3px solid;
		font-size: 13px;
		line-height: 1.5;
	}

	.konsekvens-positive {
		border-left-color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.konsekvens-negative {
		border-left-color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.konsekvens-mixed {
		border-left-color: var(--color-vekt);
		background: var(--color-vekt-bg);
	}

	.konsekvens-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.konsekvens-positive .konsekvens-header {
		color: var(--color-score-high);
	}

	.konsekvens-negative .konsekvens-header {
		color: var(--color-score-low);
	}

	.konsekvens-mixed .konsekvens-header {
		color: var(--color-vekt);
	}

	.konsekvens-tittel {
		font-weight: 600;
	}

	.belop-rad {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-2);
		color: var(--color-ink-secondary);
	}

	.belop-verdi {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}

	.belop-pil {
		color: var(--color-ink-ghost);
	}

	.subsidiaert-seksjon {
		border-top: 1px dashed var(--color-wire);
		padding-top: var(--spacing-2);
		margin-top: var(--spacing-1);
	}

	.subsidiaert-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.subsidiaert-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
	}

	.trigger-liste {
		margin: var(--spacing-1) 0 0;
		padding-left: var(--spacing-4);
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.trigger-liste li {
		margin-bottom: 2px;
	}
</style>
```

- [ ] **Step 2: Verify component renders**

Run: `npm run check`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/bh-response/VederlagKonsekvens.svelte
git commit -m "feat: add VederlagKonsekvens component for prinsipalt/subsidiaert result"
```

---

## Chunk 2: BhVederlagResponse — The Form Orchestrator

### Task 3: BhVederlagResponse component

**Files:**
- Create: `src/lib/components/bh-response/BhVederlagResponse.svelte`

This is the main form component. It follows `BhGrunnlagResponse.svelte` exactly in structure but with vederlag-specific domain logic.

- [ ] **Step 1: Create BhVederlagResponse component**

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		beregnAlt,
		buildEventData,
		getDefaults,
		har34_1_2Preklusjon,
		harPreklusjonsSteg as harPreklusjonsStegFn,
		erSubsidiaer as erSubsidiaerFn,
		erHelVederlagSubsidiaerPgaGrunnlag,
	} from '$lib/domain/vederlagDomain';
	import type {
		VederlagFormState,
		VederlagDomainConfig,
		VederlagLastResponseData,
		BelopVurdering,
	} from '$lib/domain/vederlagDomain';
	import type { VederlagsMetode } from '$lib/types/timeline';
	import { submitEvent } from '$lib/api/events';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { isHtmlEmpty } from '$lib/utils/formatters';
	import { getVederlagsmetodeLabel, getVederlagsmetodeShortLabel, VEDERLAGSMETODER_OPTIONS } from '$lib/constants/paymentMethods';
	import { formatCurrency } from '$lib/utils/formatters';

	import VederlagSammendrag from './VederlagSammendrag.svelte';
	import VederlagKonsekvens from './VederlagKonsekvens.svelte';
	import SegmentedButtons from './SegmentedButtons.svelte';
	import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
	import FormWithRightPanel from '$lib/components/shared/FormWithRightPanel.svelte';
	import FormSection from '$lib/components/shared/FormSection.svelte';
	import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
	import NumberInput from '$lib/components/primitives/NumberInput.svelte';

	// --- Types ---
	interface KravData {
		metode?: VederlagsMetode;
		hovedkravBelop: number;
		riggBelop?: number;
		produktivitetBelop?: number;
		harRiggKrav: boolean;
		harProduktivitetKrav: boolean;
		begrunnelseHtml?: string;
	}

	interface Props {
		prosjektId: string;
		sakId: string;
		saksnr: number;
		tittel: string;
		krav: KravData;
		domainConfig: VederlagDomainConfig;
		tidligereSvar?: Array<{ rolle: 'TE' | 'BH'; versjon: number; html: string; dato?: string }>;
		isUpdateMode?: boolean;
		lastResponseData?: VederlagLastResponseData;
		forrigeBegrunnelseHtml?: string;
		vederlagKravId: string;
		teNavn?: string;
		bhNavn?: string;
		prosjektNavn?: string;
	}

	let {
		prosjektId,
		sakId,
		saksnr,
		tittel,
		krav,
		domainConfig,
		tidligereSvar = [],
		isUpdateMode = false,
		lastResponseData,
		forrigeBegrunnelseHtml,
		vederlagKravId,
		teNavn,
		bhNavn,
		prosjektNavn,
	}: Props = $props();

	const queryClient = useQueryClient();

	// --- Form state ---
	const defaults = $derived(getDefaults({
		isUpdateMode,
		lastResponseEvent: lastResponseData,
	}));

	// Port 1: Preklusjon
	let hovedkravVarsletITide = $state<boolean>(true);
	let riggVarsletITide = $state<boolean>(true);
	let produktivitetVarsletITide = $state<boolean>(true);

	// Port 2: Metode
	let akseptererMetode = $state<boolean>(true);
	let oensketMetode = $state<VederlagsMetode | undefined>(undefined);

	// Port 3: Beløp
	let hovedkravVurdering = $state<BelopVurdering>('godkjent');
	let hovedkravGodkjentBelop = $state<number | undefined>(undefined);
	let riggVurdering = $state<BelopVurdering | undefined>(undefined);
	let riggGodkjentBelop = $state<number | undefined>(undefined);
	let produktivitetVurdering = $state<BelopVurdering | undefined>(undefined);
	let produktivitetGodkjentBelop = $state<number | undefined>(undefined);

	// Port 4: Begrunnelse
	let bhBegrunnelseHtml = $state('');

	// Submission
	let submitting = $state(false);
	let submitError = $state<string | null>(null);
	let hasInitialized = $state(false);

	// Pre-fill in update mode
	$effect(() => {
		if (defaults && !hasInitialized) {
			hovedkravVarsletITide = defaults.hovedkravVarsletITide;
			riggVarsletITide = defaults.riggVarsletITide;
			produktivitetVarsletITide = defaults.produktivitetVarsletITide;
			akseptererMetode = defaults.akseptererMetode;
			oensketMetode = defaults.oensketMetode;
			hovedkravVurdering = defaults.hovedkravVurdering;
			hovedkravGodkjentBelop = defaults.hovedkravGodkjentBelop;
			riggVurdering = defaults.riggVurdering;
			riggGodkjentBelop = defaults.riggGodkjentBelop;
			produktivitetVurdering = defaults.produktivitetVurdering;
			produktivitetGodkjentBelop = defaults.produktivitetGodkjentBelop;
			if (forrigeBegrunnelseHtml) bhBegrunnelseHtml = forrigeBegrunnelseHtml;
			hasInitialized = true;
		}
	});

	// --- Domain computations ---
	const formState: VederlagFormState = $derived({
		hovedkravVarsletITide,
		riggVarsletITide,
		produktivitetVarsletITide,
		akseptererMetode,
		oensketMetode,
		holdTilbake: false, // Droppet fra UI — alltid false
		hovedkravVurdering,
		hovedkravGodkjentBelop,
		riggVurdering,
		riggGodkjentBelop,
		produktivitetVurdering,
		produktivitetGodkjentBelop,
		begrunnelse: bhBegrunnelseHtml,
	});

	const computed = $derived(beregnAlt(formState, domainConfig));

	// --- UI visibility ---
	const visPreklusjon = $derived(computed.harPreklusjonsSteg);
	const visHar34_1_2 = $derived(computed.har34_1_2_Preklusjon);
	const subsidiærKontekst = $derived(erSubsidiaerFn(domainConfig));
	const subsidiærGrunn = $derived.by(() => {
		if (domainConfig.grunnlagStatus === 'avslatt') return 'grunnlag_avslatt' as const;
		if (erHelVederlagSubsidiaerPgaGrunnlag(domainConfig)) return 'grunnlag_32_2' as const;
		return null;
	});

	// Kravlinjer for sammendrag
	const sammendragKravlinjer = $derived.by(() => {
		const linjer: Array<{ label: string; belop: number }> = [];
		linjer.push({ label: 'Hovedkrav', belop: krav.hovedkravBelop });
		if (krav.harRiggKrav && krav.riggBelop) {
			linjer.push({ label: 'Rigg og drift', belop: krav.riggBelop });
		}
		if (krav.harProduktivitetKrav && krav.produktivitetBelop) {
			linjer.push({ label: 'Produktivitetstap', belop: krav.produktivitetBelop });
		}
		return linjer;
	});

	const sumKrevd = $derived(computed.totalKrevdInklPrekludert);

	// Begrunnelse entries for thread panel
	const begrunnelseEntries = $derived.by(() => {
		const entries: Array<{ rolle: 'TE' | 'BH'; versjon: number; html: string; dato?: string }> = [];
		for (const svar of tidligereSvar) {
			entries.push(svar);
		}
		return entries;
	});

	// Metode-alternativer for "foretrukket metode" (ekskluder TEs valgte)
	const metodeAlternativer = $derived(
		VEDERLAGSMETODER_OPTIONS
			.filter((o) => o.value && o.value !== krav.metode)
			.map((o) => ({ value: o.value, label: o.label })),
	);

	// --- Validation ---
	const kanSende = $derived.by(() => {
		if (submitting) return false;

		// Port 1: Preklusjon — alle synlige toggler satt (de har defaults, alltid ok)
		// Port 2: Metode — akseptererMetode har default, ok. Sjekk ønsketMetode ved avslag.
		if (!akseptererMetode && !oensketMetode) return false;

		// Port 3: Beløp — alle kravlinjer må ha vurdering
		if (!hovedkravVurdering) return false;
		if (hovedkravVurdering === 'delvis' && (hovedkravGodkjentBelop === undefined || hovedkravGodkjentBelop === null)) return false;
		if (krav.harRiggKrav) {
			if (!riggVurdering) return false;
			if (riggVurdering === 'delvis' && (riggGodkjentBelop === undefined || riggGodkjentBelop === null)) return false;
		}
		if (krav.harProduktivitetKrav) {
			if (!produktivitetVurdering) return false;
			if (produktivitetVurdering === 'delvis' && (produktivitetGodkjentBelop === undefined || produktivitetGodkjentBelop === null)) return false;
		}

		// Port 4: Begrunnelse
		if (isHtmlEmpty(bhBegrunnelseHtml)) return false;

		return true;
	});

	// --- Submit ---
	async function handleSubmit() {
		if (!kanSende) return;
		submitting = true;
		submitError = null;

		try {
			const { eventType, data } = buildEventData(
				formState,
				domainConfig,
				computed,
				{
					vederlagKravId,
					lastResponseEventId: lastResponseData?.eventId,
					isUpdateMode,
				},
				'', // autoBegrunnelse — not used in this UI
				computed.subsidiaerTriggers,
			);

			await submitEvent(sakId, eventType as import('$lib/types/timeline').EventType, data);
			await queryClient.invalidateQueries({ queryKey: ['case-context', sakId] });
			goto(`/${prosjektId}/${sakId}`);
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Kunne ikke sende svar';
			submitting = false;
		}
	}

	function handleAvbryt() {
		goto(`/${prosjektId}/${sakId}`);
	}

	// --- Verdict options per kravlinje ---
	const vurderingOptions = [
		{ value: 'godkjent', label: 'Godkjent', icon: 'check' as const, colorScheme: 'green' as const },
		{ value: 'delvis', label: 'Delvis godkjent' },
		{ value: 'avslatt', label: 'Avslått', icon: 'cross' as const, colorScheme: 'red' as const },
	];

	const preklusjonsOptions = [
		{ value: 'ja', label: 'Ja, i tide' },
		{ value: 'nei', label: 'Nei, prekludert', colorScheme: 'red' as const },
	];
</script>

<FormWithRightPanel
	entries={begrunnelseEntries}
	bind:bhBegrunnelseHtml
	{teNavn}
	{bhNavn}
	submitLabel={isUpdateMode ? 'Oppdater svar' : 'Send svar'}
	submitDisabled={!kanSende}
	submitLoading={submitting}
	{submitError}
	onsubmit={handleSubmit}
	onavbryt={handleAvbryt}
>
	<FormPageHeader
		tilbakeHref="/{prosjektId}/{sakId}"
		tilbakeTekst="Tilbake til saksmappe"
		eyebrow={isUpdateMode ? 'Oppdater svar' : 'Svar på vederlagskrav'}
		{prosjektNavn}
		{teNavn}
		{bhNavn}
		{saksnr}
		{tittel}
	/>

	<!-- TE's vederlagskrav -->
	<VederlagSammendrag
		metode={krav.metode}
		kravlinjer={sammendragKravlinjer}
		{sumKrevd}
		begrunnelseHtml={krav.begrunnelseHtml}
	/>

	<!-- Standpunkt-overgang -->
	<SectionHeading title="Byggherrens standpunkt" />

	<!-- Subsidiær kontekst-banner -->
	{#if subsidiærKontekst}
		<div class="subsidiaer-banner" role="note">
			{#if subsidiærGrunn === 'grunnlag_avslatt'}
				<p>Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel godkjennes.</p>
			{:else if subsidiærGrunn === 'grunnlag_32_2'}
				<p>Grunnlaget ble varslet for sent (§32.2). Hele vederlagskravet behandles subsidiært.</p>
			{/if}
		</div>
	{/if}

	<!-- Port 1: Preklusjon -->
	{#if visPreklusjon}
		<FormSection>
			<SectionHeading title="Preklusjon" paragrafRef="§34.1.2 / §34.1.3" />
			<p class="helptext">Er kravene varslet innen kontraktens varslingsfrister?</p>

			{#if visHar34_1_2}
				<div class="preklusjons-rad">
					<span class="preklusjons-label">Hovedkrav (§34.1.2)</span>
					<SegmentedButtons
						options={preklusjonsOptions}
						selected={hovedkravVarsletITide ? 'ja' : 'nei'}
						onselect={(v) => (hovedkravVarsletITide = v === 'ja')}
						size="sm"
					/>
				</div>
			{/if}

			{#if krav.harRiggKrav}
				<div class="preklusjons-rad">
					<span class="preklusjons-label">Rigg og drift (§34.1.3)</span>
					<SegmentedButtons
						options={preklusjonsOptions}
						selected={riggVarsletITide ? 'ja' : 'nei'}
						onselect={(v) => (riggVarsletITide = v === 'ja')}
						size="sm"
					/>
				</div>
			{/if}

			{#if krav.harProduktivitetKrav}
				<div class="preklusjons-rad">
					<span class="preklusjons-label">Produktivitetstap (§34.1.3)</span>
					<SegmentedButtons
						options={preklusjonsOptions}
						selected={produktivitetVarsletITide ? 'ja' : 'nei'}
						onselect={(v) => (produktivitetVarsletITide = v === 'ja')}
						size="sm"
					/>
				</div>
			{/if}
		</FormSection>
	{/if}

	<!-- Port 2: Beregningsmetode -->
	<FormSection>
		<SectionHeading title="Beregningsmetode" paragrafRef="§34.2" />
		<p class="helptext">TE krever {getVederlagsmetodeShortLabel(krav.metode)?.toLowerCase() ?? 'ukjent metode'}. Aksepterer du beregningsmetoden?</p>
		<SegmentedButtons
			options={[
				{ value: 'ja', label: 'Ja' },
				{ value: 'nei', label: 'Nei' },
			]}
			selected={akseptererMetode ? 'ja' : 'nei'}
			onselect={(v) => {
				akseptererMetode = v === 'ja';
				if (v === 'ja') oensketMetode = undefined;
			}}
			size="sm"
		/>
		{#if !akseptererMetode}
			<div class="foretrukket-metode">
				<span class="foretrukket-label">Foretrukket metode:</span>
				<SegmentedButtons
					options={metodeAlternativer}
					selected={oensketMetode}
					onselect={(v) => (oensketMetode = v as VederlagsMetode)}
					size="sm"
				/>
			</div>
		{/if}
	</FormSection>

	<!-- Port 3: Per-kravlinje evaluering -->
	<FormSection>
		<SectionHeading title="Hovedkrav" paragrafRef="§34.1.1–34.1.2" />
		{#if computed.hovedkravPrekludert}
			<div class="subsidiaer-markering">Subsidiært</div>
		{/if}
		<div class="krevd-linje">
			Krevd: <span class="krevd-belop">{formatCurrency(krav.hovedkravBelop)}</span>
		</div>
		<SegmentedButtons
			options={vurderingOptions}
			selected={hovedkravVurdering}
			onselect={(v) => (hovedkravVurdering = v as BelopVurdering)}
		/>
		{#if hovedkravVurdering === 'delvis'}
			<div class="field-amount">
				<NumberInput
					value={hovedkravGodkjentBelop ?? null}
					label="Godkjent beløp"
					suffix="kr"
					max={krav.hovedkravBelop}
					referenceValue={krav.hovedkravBelop}
					onchange={(v) => (hovedkravGodkjentBelop = v ?? undefined)}
				/>
			</div>
		{/if}
	</FormSection>

	{#if krav.harRiggKrav}
		<FormSection>
			<SectionHeading title="Rigg og drift" paragrafRef="§34.1.3" />
			{#if computed.riggPrekludert}
				<div class="subsidiaer-markering">Subsidiært</div>
			{/if}
			<div class="krevd-linje">
				Krevd: <span class="krevd-belop">{formatCurrency(krav.riggBelop)}</span>
			</div>
			<SegmentedButtons
				options={vurderingOptions}
				selected={riggVurdering}
				onselect={(v) => (riggVurdering = v as BelopVurdering)}
			/>
			{#if riggVurdering === 'delvis'}
				<div class="field-amount">
					<NumberInput
						value={riggGodkjentBelop ?? null}
						label="Godkjent beløp"
						suffix="kr"
						max={krav.riggBelop}
						referenceValue={krav.riggBelop}
						onchange={(v) => (riggGodkjentBelop = v ?? undefined)}
					/>
				</div>
			{/if}
		</FormSection>
	{/if}

	{#if krav.harProduktivitetKrav}
		<FormSection>
			<SectionHeading title="Produktivitetstap" paragrafRef="§34.1.3" />
			{#if computed.produktivitetPrekludert}
				<div class="subsidiaer-markering">Subsidiært</div>
			{/if}
			<div class="krevd-linje">
				Krevd: <span class="krevd-belop">{formatCurrency(krav.produktivitetBelop)}</span>
			</div>
			<SegmentedButtons
				options={vurderingOptions}
				selected={produktivitetVurdering}
				onselect={(v) => (produktivitetVurdering = v as BelopVurdering)}
			/>
			{#if produktivitetVurdering === 'delvis'}
				<div class="field-amount">
					<NumberInput
						value={produktivitetGodkjentBelop ?? null}
						label="Godkjent beløp"
						suffix="kr"
						max={krav.produktivitetBelop}
						referenceValue={krav.produktivitetBelop}
						onchange={(v) => (produktivitetGodkjentBelop = v ?? undefined)}
					/>
				</div>
			{/if}
		</FormSection>
	{/if}

	<!-- Konsekvens -->
	<VederlagKonsekvens
		prinsipaltResultat={computed.prinsipaltResultat}
		totalKrevd={computed.totalKrevdInklPrekludert}
		totalGodkjent={computed.totalGodkjent}
		visSubsidiaert={computed.visSubsidiaertResultat}
		subsidiaertResultat={computed.subsidiaertResultat}
		totalGodkjentSubsidiaert={computed.totalGodkjentInklPrekludert}
		subsidiaerTriggers={computed.subsidiaerTriggers}
	/>
</FormWithRightPanel>

<style>
	.subsidiaer-banner {
		background: var(--color-vekt-bg);
		border-left: 2px dashed var(--color-vekt);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		padding: var(--spacing-3) var(--spacing-4);
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-ink-secondary);
	}

	.subsidiaer-banner p {
		margin: 0;
	}

	.preklusjons-rad {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-3);
		padding: var(--spacing-2) 0;
	}

	.preklusjons-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
	}

	.foretrukket-metode {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		padding-top: var(--spacing-2);
	}

	.foretrukket-label {
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.subsidiaer-markering {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-vekt);
		padding: 2px 6px;
		background: var(--color-vekt-bg);
		border: 1px dashed var(--color-vekt);
		border-radius: var(--radius-sm);
		align-self: flex-start;
	}

	.krevd-linje {
		font-size: 13px;
		color: var(--color-ink-secondary);
	}

	.krevd-belop {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		color: var(--color-ink);
	}
</style>
```

- [ ] **Step 2: Verify types**

Run: `npm run check`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/bh-response/BhVederlagResponse.svelte
git commit -m "feat: add BhVederlagResponse form orchestrator with four-port evaluation"
```

---

## Chunk 3: Route File + Wiring

### Task 4: Route page — data derivation and wiring

**Files:**
- Create: `src/routes/[prosjektId]/[sakId]/svar-vederlag/+page.svelte`

This follows the exact pattern from `svar-grunnlag/+page.svelte`: query case context → derive krav data from state → derive timeline data → pass to component.

- [ ] **Step 1: Create route file**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import BhVederlagResponse from '$lib/components/bh-response/BhVederlagResponse.svelte';
	import type { VederlagDomainConfig, VederlagLastResponseData } from '$lib/domain/vederlagDomain';
	import type { VederlagsMetode } from '$lib/types/timeline';

	const prosjektId = $derived(page.params.prosjektId ?? '');
	const sakId = $derived(page.params.sakId ?? '');

	// Mock project metadata (same pattern as svar-grunnlag)
	const projectMeta: Record<string, { name: string }> = {
		P001: { name: 'Operatunnelen' },
	};
	const prosjektNavn = $derived(prosjektId ? projectMeta[prosjektId]?.name : undefined);

	const query = createCaseContextQuery(() => sakId);

	// Derive TE's vederlagskrav from case state
	const krav = $derived.by(() => {
		const state = query.data?.state;
		if (!state) return null;

		const v = state.vederlag;
		const hovedkravBelop = v.belop_direkte ?? v.kostnads_overslag ?? 0;
		const riggBelop = v.saerskilt_krav?.rigg_drift?.belop;
		const produktivitetBelop = v.saerskilt_krav?.produktivitet?.belop;

		// Find TE's vederlag_krav_sendt event for begrunnelseHtml
		const vederlagEvent = query.data?.timeline?.find(
			(e) => e.type === 'vederlag_krav_sendt' || e.type === 'no.oslo.koe.vederlag_krav_sendt',
		);
		const eventData = vederlagEvent?.data as unknown as Record<string, unknown> | undefined;

		return {
			metode: v.metode,
			hovedkravBelop,
			riggBelop,
			produktivitetBelop,
			harRiggKrav: (riggBelop ?? 0) > 0,
			harProduktivitetKrav: (produktivitetBelop ?? 0) > 0,
			begrunnelseHtml: (eventData?.begrunnelse as string) ?? undefined,
		};
	});

	// Derive domain config from case state
	const domainConfig = $derived.by((): VederlagDomainConfig | null => {
		const state = query.data?.state;
		if (!state || !krav) return null;

		const v = state.vederlag;
		const g = state.grunnlag;

		return {
			metode: v.metode,
			hovedkravBelop: krav.hovedkravBelop,
			riggBelop: krav.riggBelop,
			produktivitetBelop: krav.produktivitetBelop,
			harRiggKrav: krav.harRiggKrav,
			harProduktivitetKrav: krav.harProduktivitetKrav,
			kreverJustertEp: v.krever_justert_ep ?? false,
			kostnadsOverslag: v.kostnads_overslag,
			hovedkategori: g.hovedkategori as VederlagDomainConfig['hovedkategori'],
			grunnlagVarsletForSent: g.grunnlag_varslet_i_tide === false,
			grunnlagStatus: g.bh_resultat as VederlagDomainConfig['grunnlagStatus'],
		};
	});

	// Extract timeline-derived values
	const timelineData = $derived.by(() => {
		const timeline = query.data?.timeline;
		if (!timeline) return {
			tidligereSvar: [] as Array<{ rolle: 'TE' | 'BH'; versjon: number; html: string; dato?: string }>,
			vederlagKravId: '',
			lastResponseData: undefined as VederlagLastResponseData | undefined,
			forrigeBegrunnelseHtml: undefined as string | undefined,
		};

		// Find TE's krav event
		const kravEvent = timeline.find(
			(e) => e.type === 'vederlag_krav_sendt' || e.type === 'no.oslo.koe.vederlag_krav_sendt',
		);

		// Find existing BH responses
		const responsEvents = timeline.filter((e) => e.type.includes('respons_vederlag'));
		const lastResponse = responsEvents.length > 0 ? responsEvents[responsEvents.length - 1] : null;
		const lastData = lastResponse?.data as unknown as Record<string, unknown> | undefined;

		return {
			tidligereSvar: responsEvents.map((e) => {
				const d = e.data as unknown as Record<string, unknown> | undefined;
				return {
					rolle: (e.actorrole ?? 'BH') as 'TE' | 'BH',
					versjon: (d?.versjon as number) ?? 1,
					html: (d?.begrunnelse as string) ?? '',
					dato: e.time,
				};
			}),
			vederlagKravId: kravEvent?.id ?? '',
			lastResponseData: lastResponse ? {
				eventId: lastResponse.id,
				hovedkravVarsletITide: lastData?.hovedkrav_varslet_i_tide as boolean | undefined,
				riggVarsletITide: lastData?.rigg_varslet_i_tide as boolean | undefined,
				produktivitetVarsletITide: lastData?.produktivitet_varslet_i_tide as boolean | undefined,
				akseptererMetode: lastData?.aksepterer_metode as boolean | undefined,
				oensketMetode: lastData?.oensket_metode as VederlagsMetode | undefined,
				holdTilbake: lastData?.hold_tilbake as boolean | undefined,
				hovedkravVurdering: lastData?.hovedkrav_vurdering as import('$lib/domain/vederlagDomain').BelopVurdering | undefined,
				hovedkravGodkjentBelop: lastData?.hovedkrav_godkjent_belop as number | undefined,
				riggVurdering: lastData?.rigg_vurdering as import('$lib/domain/vederlagDomain').BelopVurdering | undefined,
				riggGodkjentBelop: lastData?.rigg_godkjent_belop as number | undefined,
				produktivitetVurdering: lastData?.produktivitet_vurdering as import('$lib/domain/vederlagDomain').BelopVurdering | undefined,
				produktivitetGodkjentBelop: lastData?.produktivitet_godkjent_belop as number | undefined,
			} satisfies VederlagLastResponseData : undefined,
			forrigeBegrunnelseHtml: (lastData?.begrunnelse as string) ?? undefined,
		};
	});

	const isUpdateMode = $derived(!!query.data?.state?.vederlag.bh_resultat);
	const saksnr = $derived(1); // TODO: derive from case list position
	const teNavn = $derived(query.data?.state?.entreprenor);
	const bhNavn = $derived(query.data?.state?.byggherre);
	const tittel = $derived(query.data?.state?.sakstittel ?? '');
</script>

{#if query.isLoading}
	<div class="loading">
		<p class="loading-text">Laster sak…</p>
	</div>
{:else if query.isError}
	<div class="error">
		<p class="error-text">Kunne ikke laste sak</p>
	</div>
{:else if krav && domainConfig}
	<BhVederlagResponse
		{prosjektId}
		{sakId}
		{saksnr}
		{tittel}
		{krav}
		{domainConfig}
		tidligereSvar={timelineData.tidligereSvar}
		{isUpdateMode}
		lastResponseData={timelineData.lastResponseData}
		forrigeBegrunnelseHtml={timelineData.forrigeBegrunnelseHtml}
		vederlagKravId={timelineData.vederlagKravId}
		{teNavn}
		{bhNavn}
		{prosjektNavn}
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
```

- [ ] **Step 2: Verify the full page compiles**

Run: `npm run check`
Expected: No type errors

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Navigate to: `http://localhost:5173/P001/SAK001/svar-vederlag`
Expected: Page loads with FormPageHeader, VederlagSammendrag, standpunkt heading, form sections, and right-panel BegrunnelseThread. Data comes from mock data in case context query.

- [ ] **Step 4: Commit**

```bash
git add src/routes/[prosjektId]/[sakId]/svar-vederlag/+page.svelte
git commit -m "feat: add svar-vederlag route with data derivation from case context"
```

---

## Chunk 4: Tests

### Task 5: Domain integration tests for BH vederlag response flow

**Files:**
- Modify: `src/lib/domain/__tests__/vederlagDomain.test.ts` (add new test group)

Existing tests in `vederlagDomain.test.ts` already cover the pure domain functions extensively. We add a new describe block that tests the end-to-end scenarios matching our UI flow: form state → beregnAlt → buildEventData.

- [ ] **Step 1: Add UI-focused integration tests**

Add this describe block at the end of the existing test file. These tests verify the scenarios our UI creates:

```typescript
describe('BH Svar-Vederlag UI Scenarios', () => {
  // Base configs matching typical case states
  const baseConfig: VederlagDomainConfig = {
    metode: 'REGNINGSARBEID',
    hovedkravBelop: 1_000_000,
    riggBelop: 200_000,
    produktivitetBelop: 150_000,
    harRiggKrav: true,
    harProduktivitetKrav: true,
    kreverJustertEp: false,
    kostnadsOverslag: 1_200_000,
    hovedkategori: 'ENDRING',
    grunnlagVarsletForSent: false,
    grunnlagStatus: 'godkjent',
  };

  const godkjentAlleState: VederlagFormState = {
    hovedkravVarsletITide: true,
    riggVarsletITide: true,
    produktivitetVarsletITide: true,
    akseptererMetode: true,
    holdTilbake: false,
    hovedkravVurdering: 'godkjent',
    riggVurdering: 'godkjent',
    produktivitetVurdering: 'godkjent',
    begrunnelse: '<p>Godkjent.</p>',
  };

  it('godkjent alle — prinsipalt godkjent, ingen subsidiært', () => {
    const computed = beregnAlt(godkjentAlleState, baseConfig);
    expect(computed.prinsipaltResultat).toBe('godkjent');
    expect(computed.visSubsidiaertResultat).toBe(false);
    expect(computed.totalGodkjent).toBe(1_350_000);
    expect(computed.totalKrevdInklPrekludert).toBe(1_350_000);
  });

  it('delvis godkjent hovedkrav — prinsipalt delvis', () => {
    const state: VederlagFormState = {
      ...godkjentAlleState,
      hovedkravVurdering: 'delvis',
      hovedkravGodkjentBelop: 600_000,
    };
    const computed = beregnAlt(state, baseConfig);
    expect(computed.prinsipaltResultat).toBe('delvis_godkjent');
    expect(computed.totalGodkjent).toBe(600_000 + 200_000 + 150_000);
  });

  it('prekludert rigg — vises subsidiært', () => {
    const state: VederlagFormState = {
      ...godkjentAlleState,
      riggVarsletITide: false,
    };
    const computed = beregnAlt(state, baseConfig);
    expect(computed.riggPrekludert).toBe(true);
    expect(computed.visSubsidiaertResultat).toBe(true);
    expect(computed.subsidiaerTriggers).toContain('preklusjon_rigg');
    // Prinsipalt eksluderer rigg
    expect(computed.totalGodkjent).toBe(1_000_000 + 150_000);
    // Subsidiært inkluderer rigg
    expect(computed.totalGodkjentInklPrekludert).toBe(1_350_000);
  });

  it('metode avslått — trigger i subsidiært', () => {
    const state: VederlagFormState = {
      ...godkjentAlleState,
      akseptererMetode: false,
      oensketMetode: 'ENHETSPRISER',
    };
    const computed = beregnAlt(state, baseConfig);
    expect(computed.subsidiaerTriggers).toContain('metode_avslatt');
    expect(computed.prinsipaltResultat).toBe('delvis_godkjent'); // metode endring → delvis
  });

  it('grunnlag avslått → hele vederlag subsidiært', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      grunnlagStatus: 'avslatt',
    };
    const computed = beregnAlt(godkjentAlleState, config);
    expect(computed.erSubsidiaer).toBe(true);
  });

  it('SVIKT kategori → har §34.1.2 preklusjon for hovedkrav', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      hovedkategori: 'SVIKT',
    };
    const computed = beregnAlt(godkjentAlleState, config);
    expect(computed.har34_1_2_Preklusjon).toBe(true);
    expect(computed.harPreklusjonsSteg).toBe(true);
  });

  it('SVIKT + hovedkrav prekludert → prinsipalt avslått, subsidiært delvis', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      hovedkategori: 'SVIKT',
    };
    const state: VederlagFormState = {
      ...godkjentAlleState,
      hovedkravVarsletITide: false,
      // Hovedkrav er prekludert → prinsipalt mister 1M
      // rigg+prod godkjent → prinsipalt 350k av 1.35M
    };
    const computed = beregnAlt(state, config);
    expect(computed.hovedkravPrekludert).toBe(true);
    expect(computed.visSubsidiaertResultat).toBe(true);
    expect(computed.subsidiaerTriggers).toContain('preklusjon_hovedkrav');
    expect(computed.prinsipaltResultat).toBe('delvis_godkjent');
    // Subsidiært inkluderer hovedkrav
    expect(computed.subsidiaertResultat).toBe('godkjent');
  });

  it('buildEventData produces correct event for new response', () => {
    const computed = beregnAlt(godkjentAlleState, baseConfig);
    const { eventType, data } = buildEventData(
      godkjentAlleState, baseConfig, computed,
      { vederlagKravId: 'evt-123', isUpdateMode: false },
      '', computed.subsidiaerTriggers,
    );
    expect(eventType).toBe('respons_vederlag');
    expect(data.vederlag_krav_id).toBe('evt-123');
    expect(data.beregnings_resultat).toBe('godkjent');
    expect(data.total_godkjent_belop).toBe(1_350_000);
  });

  it('buildEventData produces correct event for update', () => {
    const computed = beregnAlt(godkjentAlleState, baseConfig);
    const { eventType, data } = buildEventData(
      godkjentAlleState, baseConfig, computed,
      { vederlagKravId: 'evt-123', lastResponseEventId: 'resp-456', isUpdateMode: true },
      '', computed.subsidiaerTriggers,
    );
    expect(eventType).toBe('respons_vederlag_oppdatert');
    expect(data.original_respons_id).toBe('resp-456');
  });

  it('bare hovedkrav (ingen særskilte) — ingen preklusjonsSteg for ENDRING', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      harRiggKrav: false,
      harProduktivitetKrav: false,
      riggBelop: undefined,
      produktivitetBelop: undefined,
    };
    const computed = beregnAlt(godkjentAlleState, config);
    // ENDRING har ikke §34.1.2, og ingen særskilte → ingen preklusjon
    expect(computed.harPreklusjonsSteg).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/lib/domain/__tests__/vederlagDomain.test.ts`
Expected: All new tests pass alongside existing tests

- [ ] **Step 3: Commit**

```bash
git add src/lib/domain/__tests__/vederlagDomain.test.ts
git commit -m "test: add UI-scenario integration tests for BH vederlag response"
```

---

## Chunk 5: Verification + Cleanup

### Task 6: Full verification

- [ ] **Step 1: Type check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 4: Dev server smoke test**

Run: `npm run dev`
Navigate to a svar-vederlag URL and verify:
1. FormPageHeader renders with back link, eyebrow, context
2. VederlagSammendrag shows TE's krav (metode, kravlinjer, sum)
3. "Byggherrens standpunkt" heading appears
4. Preklusjon section shows if applicable
5. Beregningsmetode section shows with Ja/Nei
6. Per-kravlinje evaluation sections show with verdict buttons
7. VederlagKonsekvens updates reactively as selections change
8. BegrunnelseThread in right panel works
9. Send-knapp is disabled until all required fields are filled
10. Subsidiær-markering appears on prekluderte kravlinjer

- [ ] **Step 5: Final commit (if any cleanup needed)**
