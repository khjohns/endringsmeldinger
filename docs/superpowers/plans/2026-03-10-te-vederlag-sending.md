# TE Vederlagskrav Sending — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TE vederlag submission page (`/[prosjektId]/[sakId]/send-vederlag/`) following existing patterns from ny/ and svar-grunnlag pages.

**Architecture:** Route page loads case context, derives scenario (new/edit), passes data to TeVederlagForm (form state + fields) and BegrunnelseThread (right panel with editor, vedlegg tagging, submit/cancel). All domain logic delegated to existing `vederlagSubmissionDomain.ts`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TanStack Query, existing primitives (SegmentedControl, NumberInput, Checkbox, SectionHeading), BegrunnelseThread.

**Spec:** `docs/superpowers/specs/2026-03-10-te-vederlag-sending-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte` | Create | Route: load case context, derive scenario, two-panel grid layout |
| `src/lib/components/te-vederlag/TeVederlagForm.svelte` | Create | Form state, domain logic integration, all form sections |
| `src/lib/components/bh-response/BegrunnelseThread.svelte` | Modify | Add vedlegg-tagging: `availableTags` prop + tag-pill UI per attachment |

---

## Chunk 1: TeVederlagForm Component

### Task 1: TeVederlagForm — Metode selection + method-specific fields

**Files:**
- Create: `src/lib/components/te-vederlag/TeVederlagForm.svelte`

This is the core form component. It owns all `$state`, calls domain functions for visibility/validation, and exposes `onactions` callback for the right panel's submit/cancel buttons.

- [ ] **Step 1: Create TeVederlagForm with metode selection**

Create `src/lib/components/te-vederlag/TeVederlagForm.svelte`:

```svelte
<script lang="ts">
	import type { VederlagsMetode } from '$lib/constants/paymentMethods';
	import {
		VEDERLAGSMETODE_DESCRIPTIONS,
		getVederlagsmetodeShortLabel,
	} from '$lib/constants/paymentMethods';
	import {
		getDefaults,
		beregnVisibility,
		beregnCanSubmit,
		getDynamicPlaceholder,
		type VederlagSubmissionFormState,
		type VederlagSubmissionScenario,
	} from '$lib/domain/vederlagSubmissionDomain';
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
		begrunnelseHtml: string;
		onplaceholder?: (placeholder: string) => void;
		onactions?: (actions: FormActions) => void;
		onkravlinjer?: (linjer: string[]) => void;
		onsubmitRequest?: () => Promise<VederlagSubmissionFormState>;
	}

	let {
		scenario,
		existing,
		begrunnelseHtml = $bindable(''),
		onplaceholder,
		onactions,
		onkravlinjer,
	}: Props = $props();

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

	// Stub — actual submit wired in Task 3
	function handleSubmit() {}
	function handleAvbryt() {}

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
			onchange={(v) => { if (!isLocked) metode = v as VederlagsMetode; }}
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
```

- [ ] **Step 2: Verify the component renders**

Run: `npm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/te-vederlag/TeVederlagForm.svelte
git commit -m "feat: add TeVederlagForm with metode selection and kravlinjer"
```

---

### Task 2: Route page — send-vederlag/+page.svelte

**Files:**
- Create: `src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte`

The route page loads case context, derives scenario (new/edit), sets up the two-panel grid layout, and wires TeVederlagForm to BegrunnelseThread.

- [ ] **Step 1: Create the route page**

Create `src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { createCaseContextQuery } from '$lib/queries/caseContext';
	import TeVederlagForm from '$lib/components/te-vederlag/TeVederlagForm.svelte';
	import BegrunnelseThread from '$lib/components/bh-response/BegrunnelseThread.svelte';
	import FormPageHeader from '$lib/components/shared/FormPageHeader.svelte';
	import type { VederlagSubmissionScenario } from '$lib/domain/vederlagSubmissionDomain';

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
		if (!timeline) return { scenario: 'new' as VederlagSubmissionScenario, existing: undefined, entries: [], grunnlagEventId: '' };

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
					metode: d.metode as string | undefined,
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
			};
		}

		return {
			scenario: 'new' as VederlagSubmissionScenario,
			existing: undefined,
			entries: [],
			grunnlagEventId: grunnlagEvent?.id ?? '',
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
</script>

{#if query.isLoading}
	<div class="loading"><p class="loading-text">Laster sak…</p></div>
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
					availableTags={aktiveTags}
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
				availableTags={aktiveTags}
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
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run check`
Expected: May show warning about `availableTags` prop not yet on BegrunnelseThread — that's expected and fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte
git commit -m "feat: add send-vederlag route page with two-panel layout"
```

---

### Task 3: Wire submit logic in TeVederlagForm

**Files:**
- Modify: `src/lib/components/te-vederlag/TeVederlagForm.svelte`

Connect the form's submit handler to the domain's `buildEventData` and `getEventType`, call `submitEvent`, invalidate query cache, and navigate back.

- [ ] **Step 1: Add submit logic**

In `TeVederlagForm.svelte`, add imports at top of `<script>`:

```typescript
import { goto } from '$app/navigation';
import { submitEvent } from '$lib/api/events';
import { useQueryClient } from '@tanstack/svelte-query';
import {
	buildEventData,
	getEventType,
} from '$lib/domain/vederlagSubmissionDomain';
```

Add new props to the Props interface:

```typescript
interface Props {
	// ... existing props ...
	prosjektId: string;
	sakId: string;
	grunnlagEventId: string;
	originalEventId?: string;
}
```

Destructure the new props:

```typescript
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
```

Add query client:

```typescript
const queryClient = useQueryClient();
```

Replace the stub `handleSubmit` and `handleAvbryt`:

```typescript
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

		await submitEvent(sakId, eventType, eventData);
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
```

- [ ] **Step 2: Pass new props from route page**

In `send-vederlag/+page.svelte`, update the `<TeVederlagForm>` invocation:

```svelte
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
```

Also add `originalEventId` to the `vederlagData` derived block — in the edit branch, add:

```typescript
originalEventId: vederlagEvent.id,
```

And update the return type to include `originalEventId?: string`.

- [ ] **Step 3: Verify type-check**

Run: `npm run check`
Expected: Pass (except `availableTags` prop warning — fixed in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/te-vederlag/TeVederlagForm.svelte src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte
git commit -m "feat: wire submit logic for TE vederlag form"
```

---

## Chunk 2: BegrunnelseThread Vedlegg-tagging

### Task 4: Add vedlegg-tagging to BegrunnelseThread

**Files:**
- Modify: `src/lib/components/bh-response/BegrunnelseThread.svelte`

Add an `availableTags` prop. When tags are provided and attachments exist, show tag-pills under each attachment. Tags are toggleable per attachment.

- [ ] **Step 1: Add availableTags prop to BegrunnelseThread**

In `BegrunnelseThread.svelte`, add to the Props interface:

```typescript
interface Props {
	// ... existing props ...
	availableTags?: string[];
}
```

Destructure:

```typescript
let {
	// ... existing destructuring ...
	availableTags = [],
}: Props = $props();
```

- [ ] **Step 2: Add tag state and mock attachment state**

Add state for mock attachments (real file upload comes later):

```typescript
// Mock attachment state (real upload logic comes in a later phase)
interface Attachment {
	id: string;
	name: string;
	size: string;
	tags: Set<string>;
}

let attachments = $state<Attachment[]>([]);

function toggleTag(attachmentId: string, tag: string) {
	attachments = attachments.map((a) => {
		if (a.id !== attachmentId) return a;
		const next = new Set(a.tags);
		if (next.has(tag)) {
			next.delete(tag);
		} else {
			next.add(tag);
		}
		return { ...a, tags: next };
	});
}

// Placeholder: simulate adding a file
function handleMockUpload() {
	const id = crypto.randomUUID();
	attachments = [
		...attachments,
		{ id, name: `dokument_${attachments.length + 1}.pdf`, size: '— KB', tags: new Set() },
	];
}
```

- [ ] **Step 3: Update the vedlegg section in the begrunnelse tab**

Replace the existing upload-zone section (inside `{#if activeTab === 'begrunnelse'}`) with:

```svelte
<!-- Vedlegg -->
<section class="vedlegg-section">
	<div class="vedlegg-header">
		<h3 class="section-label">Vedlegg</h3>
	</div>

	{#if attachments.length > 0}
		<div class="attachment-list">
			{#each attachments as att (att.id)}
				<div class="attachment-item">
					<div class="att-header">
						<span class="att-name">{att.name}</span>
						<span class="att-size">{att.size}</span>
					</div>
					{#if availableTags.length > 0}
						<div class="tag-row">
							{#each availableTags as tag}
								<button
									class="tag-pill"
									class:tag-active={att.tags.has(tag)}
									onclick={() => toggleTag(att.id, tag)}
								>
									{tag}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<div class="upload-zone" role="button" tabindex="0" onclick={handleMockUpload} onkeydown={(e) => { if (e.key === 'Enter') handleMockUpload(); }}>
		<svg class="upload-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
			<path d="M10 4V14M10 4L6 8M10 4L14 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
			<path d="M3 14V15C3 16.1046 3.89543 17 5 17H15C16.1046 17 17 16.1046 17 15V14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
		<span class="upload-tekst">Dra filer hit eller klikk for å laste opp</span>
		<span class="upload-format">PDF, DOCX, XLSX, JPG</span>
	</div>
</section>
```

- [ ] **Step 4: Add tag-pill styles**

Add to the `<style>` block:

```css
/* --- Attachment with tags --- */
.attachment-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2);
}

.attachment-item {
	background: var(--color-canvas);
	border: 1px solid var(--color-wire);
	border-radius: var(--radius-sm);
	padding: var(--spacing-3);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3);
}

.att-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.att-name {
	font-size: 12px;
	font-weight: 500;
	color: var(--color-ink);
}

.att-size {
	font-family: var(--font-data);
	font-size: 10px;
	color: var(--color-ink-muted);
}

.tag-row {
	display: flex;
	gap: var(--spacing-2);
	flex-wrap: wrap;
}

.tag-pill {
	background: transparent;
	border: 1px solid var(--color-wire-strong);
	color: var(--color-ink-secondary);
	font-family: var(--font-ui);
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	padding: 4px 10px;
	border-radius: 9999px;
	cursor: pointer;
	transition: all 0.12s;
}

.tag-pill:hover {
	border-color: var(--color-ink-ghost);
	color: var(--color-ink);
}

.tag-pill.tag-active {
	background: var(--color-ink);
	color: var(--color-canvas);
	border-color: var(--color-ink);
}
```

- [ ] **Step 5: Verify type-check and visual**

Run: `npm run check`
Expected: Pass.

Run: `npm run dev` — navigate to send-vederlag page, verify form renders and tag-pills appear when adding a mock attachment.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/bh-response/BegrunnelseThread.svelte
git commit -m "feat: add vedlegg-tagging with dynamic tag-pills to BegrunnelseThread"
```

---

## Chunk 3: Edit mode pre-fill + SegmentedControl disabled state

### Task 5: Add disabled prop to SegmentedControl

**Files:**
- Modify: `src/lib/components/primitives/SegmentedControl.svelte`

- [ ] **Step 1: Add disabled prop**

In `SegmentedControl.svelte`, add to Props:

```typescript
interface Props {
	value: T;
	options: SegmentOption[];
	onchange: (value: T) => void;
	disabled?: boolean;
}

let { value, options, onchange, disabled = false }: Props = $props();
```

Update the button:

```svelte
<button
	class="segment-btn"
	class:segment-active={value === option.id}
	class:segment-disabled={disabled}
	role="radio"
	aria-checked={value === option.id}
	aria-disabled={disabled}
	onclick={() => { if (!disabled) onchange(option.id); }}
>
```

Add style:

```css
.segment-disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
```

- [ ] **Step 2: Use disabled in TeVederlagForm**

In `TeVederlagForm.svelte`, update the SegmentedControl invocation:

```svelte
<SegmentedControl
	value={metode ?? ''}
	options={METODE_OPTIONS}
	onchange={(v) => { metode = v as VederlagsMetode; }}
	disabled={isLocked}
/>
```

And remove the inline `if (!isLocked)` guard from the onchange — the disabled prop handles it now.

- [ ] **Step 3: Verify edit mode pre-fill works**

Run: `npm run check`
Expected: Pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/primitives/SegmentedControl.svelte src/lib/components/te-vederlag/TeVederlagForm.svelte
git commit -m "feat: add disabled prop to SegmentedControl, use in edit mode"
```

---

### Task 6: Pre-fill begrunnelse in edit mode

**Files:**
- Modify: `src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte`

- [ ] **Step 1: Pre-fill begrunnelseHtml from existing data**

In `send-vederlag/+page.svelte`, after the `vederlagData` derived block, add an effect to pre-fill begrunnelse in edit mode:

```typescript
let hasInitializedBegrunnelse = $state(false);

$effect(() => {
	if (vederlagData.scenario === 'edit' && vederlagData.existing?.begrunnelse && !hasInitializedBegrunnelse) {
		begrunnelseHtml = vederlagData.existing.begrunnelse;
		hasInitializedBegrunnelse = true;
	}
});
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte
git commit -m "feat: pre-fill begrunnelse in edit mode for TE vederlag"
```

---

## Chunk 4: Smoke test + visual verification

### Task 7: Manual smoke test

- [ ] **Step 1: Run dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to send-vederlag**

Open `http://localhost:5173/P001/KOE-2024-047/send-vederlag/`

Verify:
- FormPageHeader shows "Nytt vederlagskrav" with project metadata
- SegmentedControl shows three method options
- Selecting "Regningsarbeid" shows kostnadsoverslag + varslet før oppstart
- Selecting "Enhetspriser" shows beløp + justert EP checkbox
- Selecting "Fastpris" shows beløp
- Særskilte krav container shows with helptext and two NumberInput fields
- Right panel: BegrunnelseThread with tabs (Begrunnelse/Historikk/Filer)
- Editor placeholder updates when method changes
- Submit button disabled until method selected + begrunnelse ≥ 10 chars
- Tag-pills appear on attachments, toggleable, dynamic based on kravlinjer with beløp

- [ ] **Step 3: Run full type-check and lint**

Run: `npm run check && npm run lint`
Expected: Pass.

- [ ] **Step 4: Run existing tests to ensure no regressions**

Run: `npm run test`
Expected: All existing tests pass.

- [ ] **Step 5: Commit any fixes**

If any fixes were needed during smoke test, commit them:

```bash
git add -A
git commit -m "fix: smoke test fixes for send-vederlag page"
```
