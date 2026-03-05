# Saksmappe Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the saksmappe page (`/[prosjektId]/[sakId]`) to match the forhandlingsbordet mock — shifting from blue-steel tokens to a zinc-neutral legal-document aesthetic, with richer sidebar, flat date-divider timeline, larger sporkort with internal notes, and polished preview panel.

**Architecture:** The existing component structure (Sidebar, Timeline, Sporkort, Forhandsvisning) is preserved but each component gets a significant visual overhaul. Token architecture shifts from blue-tinted (`canvas: #0c0e14`) to zinc-neutral (`base: #09090b`). The timeline spine is replaced with flat date-dividers (skilleark pattern). Sidebar gains financial summary and status box. Sporkort gain internal notes (gule lapper) and milepael tags.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, Tailwind v4 `@theme inline`, Vitest + @testing-library/svelte

**Mock reference:** `docs/design/forhandlingsbordet-mock.html`

**Design system:** `.interface-design/system.md` (must be updated at the end)

---

## Task 1: Update Token Architecture in app.css

**Files:**
- Modify: `src/app.css`

**Context:** The mock uses a zinc-neutral palette that reads more like a legal document. The existing blue-steel tokens need to shift to pure zinc grays with brighter whites. This is the foundation — everything else depends on it.

**Step 1: Update tokens**

Replace the `@theme inline` block in `src/app.css` with the new zinc-neutral token architecture:

```css
@theme inline {
	/* -- Forhandlingsbordet -- zinc-neutral dark theme tokens -- */

	/* Canvas & surfaces (zinc-neutral, no blue tint) */
	--color-base: #09090b;
	--color-canvas: #09090b;
	--color-felt: #121214;
	--color-felt-raised: #1c1c1f;
	--color-felt-hover: #18181b;
	--color-felt-active: #27272a;

	/* Ink hierarchy (brighter, purer whites) */
	--color-ink: #fafafa;
	--color-ink-secondary: #a1a1aa;
	--color-ink-muted: #71717a;
	--color-ink-ghost: #52525b;

	/* Wire -- borders (RGBA for blending, never solid hex) */
	--color-wire: rgba(255, 255, 255, 0.08);
	--color-wire-strong: rgba(255, 255, 255, 0.15);
	--color-wire-focus: rgba(255, 255, 255, 0.25);

	/* Vekt -- action accent (amber) -- the only warm color */
	--color-vekt: #f59e0b;
	--color-vekt-dim: #d97706;
	--color-vekt-bg: rgba(245, 158, 11, 0.08);
	--color-vekt-bg-strong: rgba(245, 158, 11, 0.14);

	/* Score semantics */
	--color-score-high: #10b981;
	--color-score-high-bg: rgba(16, 185, 129, 0.10);
	--color-score-mid: #a1a1aa;
	--color-score-low: #e11d48;
	--color-score-low-bg: rgba(225, 29, 72, 0.08);

	/* Tipex editor */
	--color-tipex-bg: #09090b;
	--color-tipex-text: #fafafa;
	--color-tipex-toolbar-bg: #1c1c1f;
	--color-tipex-toolbar-text: #a1a1aa;
	--color-tipex-accent: #f59e0b;

	/* Typography */
	--font-data: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
	--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

	/* Spacing (4px grid) */
	--spacing-1: 4px;
	--spacing-2: 8px;
	--spacing-3: 12px;
	--spacing-4: 16px;
	--spacing-5: 20px;
	--spacing-6: 24px;
	--spacing-8: 32px;
	--spacing-10: 40px;
	--spacing-12: 48px;

	/* Radius (sharp -- legal document character) */
	--radius-sm: 2px;
	--radius-md: 2px;
	--radius-lg: 6px;
}
```

Key changes from existing:
- `canvas` shifts from `#0c0e14` (blue) to `#09090b` (zinc)
- `felt` shifts from `#12151e` (blue) to `#121214` (zinc)
- `ink` shifts from `#e2e5ef` to `#fafafa` (brighter)
- `score-low` shifts from `#c45858` to `#e11d48` (rose, more vivid)
- `score-high` shifts from `#3d9a6e` to `#10b981` (emerald, more vivid)
- `vekt` shifts from `#e8a838` to `#f59e0b` (standard amber)
- `wire-focus` shifts from amber-tinted to white (neutral)
- `radius-md` shifts from `4px` to `2px` (sharper)
- Added `--color-base` alias for `--color-canvas`

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds (no broken token references)

**Step 3: Run existing tests**

Run: `npm run test`
Expected: All 376 tests pass (token changes are CSS-only, tests shouldn't break)

**Step 4: Commit**

```bash
git add src/app.css
git commit -m "design: shift token architecture from blue-steel to zinc-neutral"
```

---

## Task 2: Update Layout — Top Nav Breadcrumbs

**Files:**
- Modify: `src/routes/[prosjektId]/+layout.svelte`

**Context:** The mock has a proper breadcrumb navigation bar at the top with project context and user info. The current layout has a minimal "Prosjekt {id}" header. We update this to match the mock's top-nav pattern with breadcrumb path.

**Step 1: Rewrite the layout**

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';

	let { children } = $props();

	const prosjektId = $derived(page.params.prosjektId);
	const sakId = $derived(page.params.sakId ?? null);

	const queryClient = new QueryClient();
</script>

<QueryClientProvider client={queryClient}>
	<div class="app-shell">
		<header class="top-nav">
			<nav class="nav-breadcrumbs" aria-label="Brødsmuler">
				<span>{prosjektId}</span>
				{#if sakId}
					<span class="sep">/</span>
					<span>Saker</span>
					<span class="sep">/</span>
					<span class="current">{sakId}</span>
				{/if}
			</nav>
			<div class="nav-user">
				<span class="user-org">Hent AS</span>
				<div class="avatar">AM</div>
			</div>
		</header>
		<main class="app-main">
			{@render children()}
		</main>
	</div>
</QueryClientProvider>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
		background: var(--color-canvas);
		color: var(--color-ink);
	}

	.top-nav {
		height: 48px;
		border-bottom: 1px solid var(--color-wire-strong);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24px;
		flex-shrink: 0;
		background: var(--color-canvas);
	}

	.nav-breadcrumbs {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.nav-breadcrumbs .sep {
		color: var(--color-ink-ghost);
	}

	.nav-breadcrumbs .current {
		color: var(--color-ink);
		font-weight: 500;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	.avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-wire-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.app-main {
		flex: 1;
		overflow: hidden;
	}

	@media (max-width: 1023px) {
		.top-nav {
			padding: 0 16px;
		}

		.nav-user .user-org {
			display: none;
		}
	}
</style>
```

**Step 2: Update CasePage grid to fit new layout**

In `src/routes/[prosjektId]/[sakId]/+page.svelte`, change `.saksmappe` from `min-height: 100vh` to `height: 100%` since the layout shell now handles full-screen.

```css
.saksmappe {
	display: grid;
	grid-template-columns: 260px 1fr;
	height: 100%;
	background: var(--color-canvas);
	overflow: hidden;
}
```

Also update `.main-content` to remove `height: 100vh` and use `height: 100%` + `overflow-y: auto`.

**Step 3: Build and verify**

Run: `npm run build && npm run test`
Expected: All pass

**Step 4: Commit**

```bash
git add src/routes/[prosjektId]/+layout.svelte src/routes/[prosjektId]/[sakId]/+page.svelte
git commit -m "design: add breadcrumb top-nav and fix layout shell"
```

---

## Task 3: Rebuild Sidebar — Status Box, Parter, Frister

**Files:**
- Modify: `src/lib/components/saksmappe/Sidebar.svelte`
- Modify: `src/lib/components/saksmappe/FristerSection.svelte`

**Context:** The mock's sidebar is substantially richer. It adds:
1. A "Gjeldende Status" summary box below the title
2. Parter section with BH/TE labels (already exists, needs spacing tweak)
3. Redesigned Frister with colored urgency pills (critical=rose bg, warning=amber bg)
4. New "Dokumentasjon" section with vedlegg button
5. New "Nokkeltall (NOK)" financial summary section

The VarslingSection is removed from the sidebar — its information is folded into the sporkort headers and the status summary.

**Step 1: Rewrite Sidebar.svelte**

The sidebar should now show:
- Saksidentitet (sak_id, tittel, undertittel)
- Gjeldende Status box (summary text from `state.neste_handling`)
- Parter (BH/TE)
- Frister (urgency-colored pills)
- Dokumentasjon (vedlegg count button)
- Nokkeltall (NOK) with financial breakdown

```svelte
<script lang="ts">
	import type { SakState } from '$lib/types/timeline';
	import FristerSection from './FristerSection.svelte';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		state: SakState;
	}

	let { state }: Props = $props();

	// Build status summary text
	const statusSummary = $derived.by(() => {
		const parts: string[] = [];
		const g = state.grunnlag;
		const v = state.vederlag;
		const f = state.frist;

		if (g.status === 'godkjent') parts.push('Grunnlag er akseptert.');
		else if (g.status === 'avslatt') parts.push('Grunnlag er avslatt.');
		else if (g.status === 'sendt') parts.push('Grunnlag sendt, venter pa svar.');

		if (v.status === 'under_forhandling' || v.status === 'delvis_godkjent')
			parts.push('Pagaende tvist om vederlag.');
		else if (v.status === 'godkjent') parts.push('Vederlag godkjent.');
		else if (v.status === 'avslatt') parts.push('Vederlag avslatt.');
		else if (v.status === 'sendt') parts.push('Vederlag sendt.');

		if (f.status === 'sendt' || f.status === 'under_behandling')
			parts.push('Frist avventer vurdering.');
		else if (f.status === 'godkjent') parts.push('Frist godkjent.');

		if (parts.length === 0) parts.push(state.neste_handling.handling);
		return parts.join(' ');
	});

	// Financial summary
	const krevdVederlag = $derived(state.vederlag.krevd_belop ?? state.vederlag.netto_belop ?? 0);
	const godkjentVederlag = $derived(state.vederlag.godkjent_belop ?? 0);
	const omtvistet = $derived(Math.max(0, krevdVederlag - godkjentVederlag));
	const krevdDager = $derived(state.frist.krevd_dager ?? 0);
</script>

<aside class="sidebar" aria-label="Saksinformasjon">
	<!-- Saksidentitet -->
	<div class="sidebar-section">
		<span class="sys-id">{state.sak_id}</span>
		<h2 class="sak-tittel">{state.sakstittel}</h2>
		{#if state.prosjekt_navn}
			<span class="sak-undertittel">{state.prosjekt_navn}</span>
		{/if}

		<div class="samlet-status-boks">
			<div class="status-header">Gjeldende status</div>
			<div class="status-verdi">{statusSummary}</div>
		</div>
	</div>

	<!-- Parter -->
	<div class="sidebar-section">
		<div class="section-label">Parter</div>
		{#if state.byggherre}
			<div class="party-row">
				<span class="party-label">BH</span>
				<span class="party-name">{state.byggherre}</span>
			</div>
		{/if}
		{#if state.entreprenor}
			<div class="party-row">
				<span class="party-label">TE</span>
				<span class="party-name">{state.entreprenor}</span>
			</div>
		{/if}
	</div>

	<!-- Frister -->
	<div class="sidebar-section">
		<FristerSection {state} />
	</div>

	<!-- Dokumentasjon -->
	<div class="sidebar-section">
		<div class="section-label">Dokumentasjon</div>
		<button class="btn-vedlegg" type="button">
			<span>Alle vedlegg</span>
			<span class="badge">0</span>
		</button>
	</div>

	<!-- Nokkeltall -->
	{#if krevdVederlag > 0 || krevdDager > 0}
		<div class="sidebar-section sidebar-section-last">
			<div class="section-label">Nokkeltall (NOK)</div>

			{#if krevdVederlag > 0}
				<div class="finans-rad">
					<span class="finans-label">Krevd vederlag</span>
					<span class="finans-verdi krav">{formatCurrency(krevdVederlag)}</span>
				</div>
				{#if godkjentVederlag > 0}
					<div class="finans-rad">
						<span class="finans-label">Godkjent</span>
						<span class="finans-verdi godkjent">{formatCurrency(godkjentVederlag)}</span>
					</div>
				{/if}
				{#if omtvistet > 0}
					<div class="finans-rad">
						<span class="finans-label">Omtvistet</span>
						<span class="finans-verdi omtvistet">{formatCurrency(omtvistet)}</span>
					</div>
				{/if}
			{/if}

			{#if krevdDager > 0}
				<div class="finans-divider"></div>
				<div class="finans-undergruppe">Tidsrisiko ({krevdDager} dager)</div>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.sidebar {
		position: sticky;
		top: 0;
		height: 100%;
		width: 260px;
		overflow-y: auto;
		overflow-x: hidden;
		border-right: 1px solid var(--color-wire-strong);
		background: var(--color-canvas);
		display: flex;
		flex-direction: column;
	}

	.sidebar-section {
		padding: 16px 24px;
		border-bottom: 1px solid var(--color-wire);
	}

	.sidebar-section-last {
		border-bottom: none;
	}

	.sys-id {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
		margin-bottom: 4px;
		display: block;
	}

	.sak-tittel {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		margin: 0 0 2px 0;
		line-height: 1.4;
	}

	.sak-undertittel {
		font-size: 13px;
		color: var(--color-ink-secondary);
	}

	.samlet-status-boks {
		background: var(--color-felt);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		padding: 12px;
		margin-top: 16px;
	}

	.status-header {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-secondary);
		margin-bottom: 4px;
	}

	.status-verdi {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink);
		line-height: 1.4;
	}

	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin-bottom: 12px;
	}

	.party-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
	}

	.party-label {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-ghost);
	}

	.party-name {
		font-weight: 500;
		font-size: 13px;
	}

	.btn-vedlegg {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		background: var(--color-felt);
		color: var(--color-ink-secondary);
		border: 1px solid var(--color-wire);
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 12px;
		transition: all 150ms ease;
	}

	.btn-vedlegg:hover {
		background: var(--color-felt-hover);
		border-color: var(--color-wire-strong);
		color: var(--color-ink);
	}

	.btn-vedlegg .badge {
		font-family: var(--font-data);
		color: var(--color-ink-muted);
	}

	/* Nokkeltall */
	.finans-rad {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
		font-size: 12px;
	}

	.finans-label {
		color: var(--color-ink-secondary);
	}

	.finans-verdi {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
	}

	.finans-verdi.krav { color: var(--color-ink); }
	.finans-verdi.godkjent { color: var(--color-score-high); }
	.finans-verdi.omtvistet { color: var(--color-vekt); font-weight: 600; }

	.finans-divider {
		height: 1px;
		background: var(--color-wire);
		margin: 12px 0 16px 0;
	}

	.finans-undergruppe {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-ink-ghost);
		margin-bottom: 8px;
	}
</style>
```

**Step 2: Redesign FristerSection with urgency pills**

Update `FristerSection.svelte` to use the mock's colored pill layout:

```svelte
<!-- FristerSection: section-label already provided by parent sidebar-section -->
<div class="section-label">Frister</div>
{#each fristItems as item}
	<div class="frist-item" class:critical={item.urgency === 'critical'} class:warning={item.urgency === 'warning'}>
		<span class="frist-label">{item.label}</span>
		<span class="frist-days">{item.days}d</span>
	</div>
{/each}
```

CSS:
```css
.frist-item {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 8px;
	padding: 6px 8px;
	border-radius: var(--radius-sm);
}

.frist-item.critical {
	background: var(--color-score-low-bg);
	border: 1px solid rgba(225, 29, 72, 0.2);
}

.frist-item.warning {
	background: var(--color-vekt-bg);
	border: 1px solid rgba(245, 158, 11, 0.2);
}

.frist-label {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
}

.frist-item.critical .frist-label { color: var(--color-score-low); }
.frist-item.warning .frist-label { color: var(--color-vekt); }

.frist-days {
	font-family: var(--font-data);
	font-size: 12px;
	font-variant-numeric: tabular-nums;
	font-weight: 600;
}

.frist-item.critical .frist-days { color: var(--color-score-low); }
.frist-item.warning .frist-days { color: var(--color-vekt); }
```

**Step 3: Run tests**

Run: `npm run test`
Expected: FristerSection tests may need updates for new HTML structure (class names changed). Update test assertions.

**Step 4: Commit**

```bash
git add src/lib/components/saksmappe/Sidebar.svelte src/lib/components/saksmappe/FristerSection.svelte
git commit -m "design: rebuild sidebar with status box and financial summary"
```

---

## Task 4: Rebuild Timeline — Flat Date Dividers (Skilleark)

**Files:**
- Modify: `src/lib/components/saksmappe/Timeline.svelte`

**Context:** The mock replaces the vertical timeline spine with flat horizontal date-dividers. The documents lie in stacks under these date headers, like paper in a physical filing system. The document area is centered with `max-width: 820px` and generous padding.

**Step 1: Rewrite Timeline.svelte**

Key changes:
- Remove `.spine-segment`, `.spine-tail`, `.opprettet-group` elements
- Replace with flat `.date-divider` elements: `<span class="date-text">` + `::after` horizontal rule
- Cards container loses `border-left` spine
- Increase gap between sporkort to `16px`
- Center alignment handled by parent `.document-area`

The `date-divider` pattern from mock:
```css
.date-divider {
	display: flex;
	align-items: center;
	gap: 16px;
	margin-bottom: 12px;
	margin-top: 16px;
}

.date-divider::after {
	content: '';
	flex: 1;
	height: 1px;
	background: var(--color-wire);
}

.date-text {
	font-family: var(--font-data);
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--color-ink-muted);
	white-space: nowrap;
}
```

Cards container:
```css
.spor-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}
```

The timeline wrapper becomes a centered document area:
```css
.timeline {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	max-width: 820px;
	margin: 0 auto;
	padding: 32px 32px 120px 32px;
}
```

**Step 2: Run tests**

Run: `npm run test`
Expected: Pass (Timeline has no dedicated unit tests)

**Step 3: Commit**

```bash
git add src/lib/components/saksmappe/Timeline.svelte
git commit -m "design: replace timeline spine with flat date-dividers (skilleark)"
```

---

## Task 5: Update CasePage Grid and Main Content

**Files:**
- Modify: `src/routes/[prosjektId]/[sakId]/+page.svelte`

**Context:** The page layout needs to:
1. Use the new centered document-area pattern
2. Remove ActionBanner from the main area (role toggle moves elsewhere)
3. Main content area centers cards with `justify-content: center`
4. Preview panel uses `auto` width in grid instead of fixed `360px`

**Step 1: Update the page layout**

Key changes to `.saksmappe`:
```css
.saksmappe {
	display: grid;
	grid-template-columns: 260px 1fr;
	height: 100%;
	background: var(--color-canvas);
	overflow: hidden;
	transition: grid-template-columns 200ms ease;
}

.saksmappe.har-panel {
	grid-template-columns: 260px 1fr 360px;
}
```

Main content:
```css
.main-content {
	height: 100%;
	overflow-y: auto;
	display: flex;
	justify-content: center;
}
```

Remove the `timeline-container` wrapper and its padding — Timeline now handles its own centering internally.

Keep the ActionBanner but move it into the sticky position within main-content, before the timeline.

**Step 2: Run tests and verify**

Run: `npm run build && npm run test`

**Step 3: Commit**

```bash
git add src/routes/[prosjektId]/[sakId]/+page.svelte
git commit -m "design: update page grid for centered document area"
```

---

## Task 6: Redesign Sporkort — Larger Cards with Mock Styling

**Files:**
- Modify: `src/lib/components/saksmappe/Sporkort.svelte`
- Modify: `src/lib/components/saksmappe/SporkortHeader.svelte`
- Modify: `src/lib/components/saksmappe/SporkortData.svelte`

**Context:** Mock sporkort are substantially different:
- Larger padding (`16px`)
- `border-radius: 2px` (sharp)
- Bigger key metric (`15px` font)
- `border: 1px solid --wire-strong` (brighter border)
- New button styles: `.btn-critical` (solid rose bg, white text), `.btn-action` (amber outline)
- Header layout: `justify-content: space-between` (button far right)
- Stempel badges use colored outlines instead of solid bg

**Step 1: Update Sporkort.svelte styles**

```css
.sporkort {
	display: flex;
	flex-direction: column;
	gap: 8px;
	background: var(--color-felt);
	border: 1px solid var(--color-wire-strong);
	border-radius: var(--radius-sm);
	padding: 16px;
	text-decoration: none;
	cursor: pointer;
	transition: background 150ms ease, border-color 150ms ease;
	position: relative;
}

.sporkort:hover {
	background: var(--color-felt-hover);
	border-color: var(--color-wire-focus);
}
```

Border variants:
```css
.border-critical { border-left: 2px solid var(--color-score-low); background: var(--color-score-low-bg); }
.border-critical:hover { background: rgba(225, 29, 72, 0.12); }
.border-handling { border-left: 2px solid var(--color-vekt); }
.border-godkjent { border-left: 1px solid var(--color-score-high); opacity: 0.7; }
.border-godkjent:hover { opacity: 1; }
```

**Step 2: Update SporkortHeader — new button styles and stempel badges**

Replace Badge component with inline stempel styling:

```svelte
<span class="stempel" class:stempel-critical={...} class:stempel-waiting={...} class:stempel-approved={...}>
	{STATUS_LABELS[status]}
</span>
```

Button styles:
```css
.action-btn {
	font-family: var(--font-ui);
	font-size: 11px;
	font-weight: 600;
	padding: 6px 12px;
	border-radius: var(--radius-sm);
	border: 1px solid transparent;
	cursor: pointer;
	transition: all 150ms ease;
	white-space: nowrap;
}

.action-btn.action-normal {
	background: var(--color-vekt-bg);
	color: var(--color-vekt);
	border-color: rgba(245, 158, 11, 0.3);
}

.action-btn.action-urgent {
	background: var(--color-score-low);
	color: #fff;
}
```

**Step 3: Update SporkortData — larger metric**

```css
.key-metric {
	font-family: var(--font-data);
	font-size: 15px;
	font-weight: 600;
	color: var(--color-ink);
	font-variant-numeric: tabular-nums;
}
```

Add milepael-tag for frist track when applicable:
```svelte
{#if sporType === 'frist' && frist?.krevd_dager && frist.krevd_dager > 14}
	<div class="milepael-tag">Pavirker milepael</div>
{/if}
```

**Step 4: Run tests**

Run: `npm run test`
Expected: Sporkort tests may need updates for changed HTML/class names. Fix any broken assertions.

**Step 5: Commit**

```bash
git add src/lib/components/saksmappe/Sporkort.svelte src/lib/components/saksmappe/SporkortHeader.svelte src/lib/components/saksmappe/SporkortData.svelte
git commit -m "design: redesign sporkort with larger cards and mock styling"
```

---

## Task 7: Add Internal Notes (Gule Lapper) to HendelsesLogg

**Files:**
- Modify: `src/lib/components/saksmappe/HendelsesLogg.svelte`

**Context:** The mock introduces two new elements in the logg:
1. **Internal notes ("Gule Lapper")**: Lines with dashed amber left border, amber bg tint, lock icon, "KUN INTERNT:" prefix. These break the strict log aesthetic to signal private content.
2. **"+ Nytt internt notat" button**: Below the log, dashed top border, ghost text that turns amber on hover.

For now, internal notes will be a visual pattern — the data model doesn't support them yet, so we add the UI pattern with a placeholder button that's non-functional.

**Step 1: Add the "add note" button to HendelsesLogg**

After the events list, add:
```svelte
<button
	class="btn-tilfoj-notat"
	type="button"
	onclick={(e) => { e.stopPropagation(); e.preventDefault(); }}
>
	+ Nytt internt notat
</button>
```

CSS:
```css
.btn-tilfoj-notat {
	width: 100%;
	text-align: left;
	padding: 8px 10px;
	margin-top: 4px;
	font-size: 11px;
	color: var(--color-ink-ghost);
	background: transparent;
	border: none;
	border-top: 1px dashed var(--color-wire);
	cursor: pointer;
	transition: color 150ms;
	font-family: var(--font-ui);
}

.btn-tilfoj-notat:hover {
	color: var(--color-vekt);
}
```

**Step 2: Update event line styles to match mock**

Increase padding and font sizes slightly:
```css
.event-line {
	display: flex;
	align-items: baseline;
	gap: 12px;
	padding: 6px 10px;
	font-size: 12px;
	cursor: pointer;
	border-left: 2px solid transparent;
	transition: background 100ms;
}

.event-line:hover {
	background: rgba(255, 255, 255, 0.02);
}

.event-line-focused {
	border-left: 2px solid var(--color-vekt);
	background: var(--color-felt-hover);
}
```

Update `.logg-dato` to be 48px wide (match mock), `.logg-rev` to 9px.

**Step 3: Add container border-top separator**

```css
.events-list {
	margin-top: 16px;
	padding-top: 8px;
	border-top: 1px solid var(--color-wire);
}
```

**Step 4: Run tests**

Run: `npm run test`
Expected: HendelsesLogg tests should still pass (new button doesn't affect existing test queries)

**Step 5: Commit**

```bash
git add src/lib/components/saksmappe/HendelsesLogg.svelte
git commit -m "design: add internal notes button and polish hendelseslogg"
```

---

## Task 8: Polish Forhandsvisning Panel

**Files:**
- Modify: `src/lib/components/saksmappe/Forhandsvisning.svelte`
- Modify: `src/routes/[prosjektId]/[sakId]/+page.svelte`

**Context:** The mock's preview panel has:
1. A close button (x) in the top-right corner
2. Icon + title on same line with meta right-aligned
3. Separator line
4. Section labels in uppercase ghost
5. "Apne spordetalj ->" link at the bottom (already exists)

The close button needs to emit an event to the parent page to clear `focusedEvent`.

**Step 1: Add close button and restructure header**

Add `onClose` callback prop:
```svelte
interface Props {
	event: TimelineEvent | null;
	prosjektId: string;
	sakId: string;
	onClose?: () => void;
}
```

Add close button:
```svelte
{#if event}
	<button class="fv-close" onclick={() => onClose?.()} aria-label="Lukk forhåndsvisning">&times;</button>
{/if}
```

Restructure header to match mock:
```svelte
<div class="fv-header">
	<span class="fv-ikon {icon.cssClass}" aria-hidden="true">{icon.symbol}</span>
	<span class="fv-handling">{handling}</span>
	<span class="fv-meta">{meta}</span>
</div>
```

**Step 2: Wire close in page**

In `+page.svelte`:
```svelte
<Forhandsvisning event={focusedEvent} {prosjektId} {sakId} onClose={() => focusedEvent = null} />
```

**Step 3: Update styles**

```css
.fv-close {
	position: absolute;
	top: 24px;
	right: 24px;
	background: none;
	border: none;
	color: var(--color-ink-ghost);
	cursor: pointer;
	font-size: 16px;
	padding: 4px;
	line-height: 1;
}

.fv-close:hover {
	color: var(--color-ink);
}

.forhandsvisning {
	position: relative;
}

.fv-header {
	display: flex;
	align-items: baseline;
	gap: 8px;
	padding-right: 24px;
}

.fv-meta {
	margin-left: auto;
}
```

**Step 4: Run tests**

Run: `npm run test`

**Step 5: Commit**

```bash
git add src/lib/components/saksmappe/Forhandsvisning.svelte src/routes/[prosjektId]/[sakId]/+page.svelte
git commit -m "design: add close button and polish preview panel"
```

---

## Task 9: Fix Tests for New Structure

**Files:**
- Modify: `src/lib/components/saksmappe/__tests__/FristerSectionTest.svelte` (if needed)
- Modify: `src/lib/components/saksmappe/__tests__/SporkortTest.svelte` (if needed)
- Modify: `src/lib/components/saksmappe/__tests__/HendelsesLoggTest.svelte` (if needed)
- Modify related `.test.ts` files

**Context:** After the redesign, some tests may break due to changed class names, removed elements, or restructured HTML. This task is a sweep to make all 376 tests green again.

**Step 1: Run all tests**

Run: `npm run test`

**Step 2: Fix each failing test**

Common issues:
- Badge component may no longer be used in SporkortHeader (replaced with inline stempel)
- FristerSection HTML structure changed (pills instead of simple rows)
- New sidebar sections may affect snapshot-like assertions

Update test assertions to match the new HTML structure without changing test intent.

**Step 3: Verify all pass**

Run: `npm run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -A
git commit -m "test: fix tests for saksmappe redesign"
```

---

## Task 10: Update Design System Documentation

**Files:**
- Modify: `.interface-design/system.md`

**Context:** The design system doc needs to reflect the new token architecture and component patterns.

**Step 1: Update system.md**

Key sections to update:

1. **Intent** section: Update to reflect the "fysisk skrivebord med juridiske dokumenter" narrative
2. **Tokens** section: Replace all color values with new zinc-neutral palette
3. **Depth Strategy**: Add explicit "Borders-only. No drop-shadows." statement
4. **Vektlinjen** pattern: Clarify it's now "Handlingskant" in saksmappen
5. **Sporkort** section: Update padding, radius, border, button styles
6. **Sidebar** section: Document new sections (Gjeldende Status, Nokkeltall, Dokumentasjon)
7. **Timeline** section: Document skilleark pattern replacing spine
8. **Add** "Gule Lapper" pattern for internal notes
9. **Add** "Stempler" pattern (sharp-cornered status badges)
10. **Token Architecture** section: Document the RGBA border principle

Remove references to the old blue-steel palette values.

**Step 2: Commit**

```bash
git add .interface-design/system.md
git commit -m "docs: update design system for zinc-neutral saksmappe redesign"
```

---

## Task 11: Visual Verification and Polish

**Files:** Various — depends on findings

**Context:** Open the dev server and visually compare each component against the mock. Fix any discrepancies.

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Compare against mock**

Open `docs/design/forhandlingsbordet-mock.html` in browser alongside the running app. Check:
- [ ] Top nav breadcrumb height and spacing
- [ ] Sidebar width and section spacing
- [ ] Gjeldende Status box background and border
- [ ] Party labels alignment (BH/TE right-aligned names)
- [ ] Frister urgency pills (rose bg for critical, amber bg for warning)
- [ ] Nokkeltall financial rows
- [ ] Date divider line rendering
- [ ] Sporkort border-left colors per state
- [ ] Sporkort button styles (SVAR NA = solid rose, BEHANDLE = amber outline)
- [ ] Key metric font size (15px)
- [ ] Logg line spacing and focus state (amber left border)
- [ ] Internal note button ("+ Nytt internt notat")
- [ ] Preview panel slide-in animation
- [ ] Preview panel close button
- [ ] Mobile responsive behavior (<1024px)

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "design: polish saksmappe to match forhandlingsbordet mock"
```

---

## Summary of all commits

1. `design: shift token architecture from blue-steel to zinc-neutral`
2. `design: add breadcrumb top-nav and fix layout shell`
3. `design: rebuild sidebar with status box and financial summary`
4. `design: replace timeline spine with flat date-dividers (skilleark)`
5. `design: update page grid for centered document area`
6. `design: redesign sporkort with larger cards and mock styling`
7. `design: add internal notes button and polish hendelseslogg`
8. `design: add close button and polish preview panel`
9. `test: fix tests for saksmappe redesign`
10. `docs: update design system for zinc-neutral saksmappe redesign`
11. `design: polish saksmappe to match forhandlingsbordet mock`

## Dependencies

- Task 1 (tokens) must be first — everything depends on it
- Tasks 2-8 can be done in order but have mild interdependencies (layout affects component sizing)
- Task 9 (tests) should run after all component changes
- Task 10 (docs) can run anytime after components are stable
- Task 11 (polish) must be last
