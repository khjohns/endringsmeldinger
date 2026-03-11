# Dokumentbordet Color Theme Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace zinc-based color tokens with warm "Dokumentbordet" palette for both light and dark themes, achieving WCAG AA compliance for all informational text.

**Architecture:** All color tokens live in `src/app.css` as CSS custom properties (`--koe-*`) under `:root` (light) and `.dark` (dark). The `@theme inline` block maps them to Tailwind `--color-*` aliases. Components use `var(--color-*)` exclusively. `src/contrast-check.js` validates all token combinations against WCAG 2.1.

**Tech Stack:** CSS custom properties, Tailwind v4 `@theme inline`, WCAG 2.1 contrast math

**Spec:** `docs/superpowers/specs/2026-03-11-dokumentbordet-fargetema-design.md`

---

## Chunk 1: Token Replacement & Verification

### Task 1: Replace light theme tokens in app.css

**Files:**
- Modify: `src/app.css:62-95` (`:root` block)

- [ ] **Step 1: Replace surface tokens**

Replace lines 63-67 in the `:root` block:

```css
--koe-canvas: #f3f1ec;
--koe-felt: #faf8f4;
--koe-felt-raised: #f3f1ec;
--koe-felt-hover: #efede7;
--koe-felt-active: #e5e2da;
```

- [ ] **Step 2: Replace ink tokens**

Replace lines 69-72:

```css
--koe-ink: #21201c;
--koe-ink-secondary: #57524b;
--koe-ink-muted: #655f56;
--koe-ink-ghost: #8d8578;
```

- [ ] **Step 3: Replace wire tokens**

Replace lines 74-76:

```css
--koe-wire: rgba(33, 28, 18, 0.06);
--koe-wire-strong: rgba(33, 28, 18, 0.12);
--koe-wire-focus: rgba(33, 28, 18, 0.20);
```

- [ ] **Step 4: Replace vekt tokens**

Replace lines 78-81:

```css
--koe-vekt: #925609;
--koe-vekt-dim: #7c4a0a;
--koe-vekt-bg: rgba(146, 86, 9, 0.06);
--koe-vekt-bg-strong: rgba(146, 86, 9, 0.12);
```

- [ ] **Step 5: Replace score tokens**

Replace lines 83-87:

```css
--koe-score-high: #047d56;
--koe-score-high-bg: #eff5ee;
--koe-score-mid: #655f56;
--koe-score-low: #c01b3d;
--koe-score-low-bg: #f5eeef;
```

- [ ] **Step 6: Remove tipex tokens from light theme**

Delete lines 89-93 (the `--koe-tipex-*` block). These are dead code since Tipex was replaced with direct Tiptap.

### Task 2: Replace dark theme tokens in app.css

**Files:**
- Modify: `src/app.css:98-131` (`.dark` block)

- [ ] **Step 1: Replace surface tokens**

Replace lines 99-103 in the `.dark` block:

```css
--koe-canvas: #0f0d0a;
--koe-felt: #16140f;
--koe-felt-raised: #1e1b16;
--koe-felt-hover: #1a1815;
--koe-felt-active: #282520;
```

- [ ] **Step 2: Replace ink tokens**

Replace lines 105-108:

```css
--koe-ink: #f5f3ee;
--koe-ink-secondary: #a8a29a;
--koe-ink-muted: #908b82;
--koe-ink-ghost: #666157;
```

- [ ] **Step 3: Replace wire tokens**

Replace lines 110-112:

```css
--koe-wire: rgba(245, 235, 220, 0.08);
--koe-wire-strong: rgba(245, 235, 220, 0.15);
--koe-wire-focus: rgba(245, 235, 220, 0.25);
```

- [ ] **Step 4: Replace vekt tokens (dark stays the same)**

Verify lines 114-117 are unchanged — dark vekt tokens are already correct:

```css
--koe-vekt: #f59e0b;
--koe-vekt-dim: #d97706;
--koe-vekt-bg: rgba(245, 158, 11, 0.08);
--koe-vekt-bg-strong: rgba(245, 158, 11, 0.14);
```

- [ ] **Step 5: Replace score tokens**

Replace lines 119-123:

```css
--koe-score-high: #10b981;
--koe-score-high-bg: rgba(16, 185, 129, 0.10);
--koe-score-mid: #908b82;
--koe-score-low: #f03e5f;
--koe-score-low-bg: rgba(240, 62, 95, 0.08);
```

- [ ] **Step 6: Remove tipex tokens from dark theme**

Delete lines 125-129 (the `--koe-tipex-*` block).

### Task 3: Remove tipex token aliases from @theme inline

**Files:**
- Modify: `src/app.css:53-57` (`@theme inline` block)

- [ ] **Step 1: Delete tipex alias lines**

Remove these 5 lines from the `@theme inline` block:

```css
--color-tipex-bg: var(--koe-tipex-bg);
--color-tipex-text: var(--koe-tipex-text);
--color-tipex-toolbar-bg: var(--koe-tipex-toolbar-bg);
--color-tipex-toolbar-text: var(--koe-tipex-toolbar-text);
--color-tipex-accent: var(--koe-tipex-accent);
```

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds with no errors about missing tipex tokens.

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "Replace zinc tokens with Dokumentbordet warm palette

Light: paper-inspired surfaces (#f3f1ec/#faf8f4), iron-ink hierarchy
Dark: warm charcoal surfaces (#0f0d0a/#16140f), warm white ink
Remove dead tipex tokens (Tipex replaced by direct Tiptap)"
```

### Task 4: Update contrast-check.js with new token values

**Files:**
- Modify: `src/contrast-check.js:15-77` (light and dark token objects)

- [ ] **Step 1: Update light theme tokens**

Replace the `light` const (lines 15-44):

```javascript
const light = {
	surfaces: {
		'canvas':       '#f3f1ec',
		'felt':         '#faf8f4',
		'felt-raised':  '#f3f1ec',
		'felt-hover':   '#efede7',
		'felt-active':  '#e5e2da',
		'score-high-bg':'#eff5ee',
		'score-low-bg': '#f5eeef',
		'vekt-bg':      null,
		'vekt-bg-strong': null,
	},
	surfacesRgba: {
		'vekt-bg':        { r: 146, g: 86, b: 9, a: 0.06 },
		'vekt-bg-strong': { r: 146, g: 86, b: 9, a: 0.12 },
	},
	inks: {
		'ink':           '#21201c',
		'ink-secondary': '#57524b',
		'ink-muted':     '#655f56',
		'ink-ghost':     '#8d8578',
	},
	accents: {
		'vekt':       '#925609',
		'vekt-dim':   '#7c4a0a',
		'score-high': '#047d56',
		'score-mid':  '#655f56',
		'score-low':  '#c01b3d',
	},
};
```

- [ ] **Step 2: Update dark theme tokens**

Replace the `dark` const (lines 46-77):

```javascript
const dark = {
	surfaces: {
		'canvas':       '#0f0d0a',
		'felt':         '#16140f',
		'felt-raised':  '#1e1b16',
		'felt-hover':   '#1a1815',
		'felt-active':  '#282520',
		'score-high-bg': null,
		'score-low-bg':  null,
		'vekt-bg':       null,
		'vekt-bg-strong': null,
	},
	surfacesRgba: {
		'score-high-bg':  { r: 16, g: 185, b: 129, a: 0.10 },
		'score-low-bg':   { r: 240, g: 62,  b: 95,  a: 0.08 },
		'vekt-bg':        { r: 245, g: 158, b: 11,  a: 0.08 },
		'vekt-bg-strong': { r: 245, g: 158, b: 11,  a: 0.14 },
	},
	inks: {
		'ink':           '#f5f3ee',
		'ink-secondary': '#a8a29a',
		'ink-muted':     '#908b82',
		'ink-ghost':     '#666157',
	},
	accents: {
		'vekt':       '#f59e0b',
		'vekt-dim':   '#d97706',
		'score-high': '#10b981',
		'score-mid':  '#908b82',
		'score-low':  '#f03e5f',
	},
};
```

- [ ] **Step 3: Run contrast check**

Run: `node src/contrast-check.js`
Expected: 0 FAIL for any usage where fg is NOT `ink-ghost`. ink-ghost usages will show FAIL — this is expected and acceptable per the ghost policy.

- [ ] **Step 4: Commit**

```bash
git add src/contrast-check.js
git commit -m "Update contrast-check tokens to match Dokumentbordet palette"
```

## Chunk 2: Ghost Audit & Documentation

### Task 5: Audit ink-ghost usages

**Files (60+ ink-ghost usages across these files):**
- Audit: `src/lib/components/saksmappe/HendelsesLogg.svelte`
- Audit: `src/lib/components/saksmappe/Forhandsvisning.svelte`
- Audit: `src/lib/components/saksmappe/Sporkort.svelte`
- Audit: `src/lib/components/saksmappe/Sidebar.svelte`
- Audit: `src/lib/components/bh-response/BegrunnelseThread.svelte`
- Audit: `src/lib/components/primitives/DatePicker.svelte`
- Audit: `src/lib/components/primitives/NumberInput.svelte`
- Audit: `src/lib/components/primitives/SectionHeading.svelte`
- Audit: `src/lib/components/primitives/Badge.svelte`
- Audit: `src/lib/components/primitives/YesNoButtons.svelte`
- Audit: `src/lib/components/shared/FormPageHeader.svelte`
- Audit: `src/lib/components/te-revision/TeGrunnlagRevisjon.svelte`
- Audit: `src/lib/components/case-create/CaseCreateForm.svelte`
- Audit: `src/lib/components/case-create/BegrunnelsePanel.svelte`
- Audit: `src/lib/components/case-create/HjemmelVelger.svelte`
- Audit: `src/lib/components/bh-response/BhGrunnlagResponse.svelte`
- Audit: `src/lib/components/saksmappe/VarslingSection.svelte`
- Audit: `src/lib/components/saksmappe/SporkortData.svelte`
- Audit: `src/lib/components/case-list/CaseListTable.svelte`
- Audit: `src/lib/components/saksoversikt/OversiktSidebar.svelte`
- Audit: `src/lib/components/saksoversikt/Saksoversikt.svelte`
- Audit: `src/lib/components/saksoversikt/SakPanel.svelte`
- Audit: `src/lib/components/saksoversikt/NodeCluster.svelte`
- Audit: `src/routes/[prosjektId]/+layout.svelte`

- [ ] **Step 1: Classify each ink-ghost usage**

For each of the ~60 usages, determine if ghost is:
- **Decorative** (OK to keep): timestamps also shown in context, dashed borders, decorative dividers
- **Informational** (must change to ink-muted): text carrying standalone meaning the user cannot get elsewhere

**Decision framework:** If removing the text would lose information the user needs, it's informational → ink-muted. If the information is redundant (also shown via position, icons, other text), it's decorative → keep ghost.

Likely changes needed (based on grep results and contrast-check usages):
- `NumberInput.svelte:159` — suffiks "NOK" carries meaning → `ink-muted`
- `BegrunnelseThread.svelte` — upload format hint ("PDF, DOCX") → `ink-muted`
- `BegrunnelseThread.svelte` — versjonsnummer (v1, v2) carries meaning → `ink-muted`
- `BegrunnelseThread.svelte` — dato i historikk-oppforing carries meaning → `ink-muted`
- `BegrunnelsePanel.svelte` — same upload format hint → `ink-muted`
- `FormPageHeader.svelte:71` — prosjekt-info may carry meaning → evaluate
- `DatePicker.svelte` — placeholder text → `ink-muted` (WCAG requires 4.5:1 for placeholders)
- `HjemmelVelger.svelte:111,170` — §-referanse text if it carries standalone info → `ink-muted`
- `CaseCreateForm.svelte:222,284` — check if decorative or informational
- `VarslingSection.svelte:78` — varsling/alert text likely informational → `ink-muted`
- `SporkortData.svelte:91` — data cell text, evaluate if informational

Keep as ghost (decorative):
- `HendelsesLogg.svelte` — timestamps (also shown by timeline position)
- `Sporkort.svelte:449` — "+Nytt internt notat" hover target (decorative affordance)
- `Sporkort.svelte:409` — dashed border (decorative)
- `Forhandsvisning.svelte:304` — border (decorative)
- `SectionHeading.svelte:40` — decorative trailing count
- `Sidebar.svelte:219,313` — role labels (BH/TE) shown alongside names

- [ ] **Step 2: Apply changes**

For each informational usage, change `var(--color-ink-ghost)` to `var(--color-ink-muted)`.

- [ ] **Step 3: Verify no remaining WCAG issues**

Run: `node src/contrast-check.js`
Verify: All non-ghost usages pass AA. Ghost usages are correctly classified as decorative.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Audit ink-ghost usages: promote informational text to ink-muted

Move standalone-meaning text from ghost (~3:1) to muted (4.5:1+).
Keep ghost only for decorative timestamps, borders, and redundant labels."
```

### Task 6: Update system.md

**Files:**
- Modify: `.interface-design/system.md`

- [ ] **Step 1: Update Direction section**

Replace the "Color world" line (line 15) from:
```
**Color world:** Zinc-notral morke flater (base #09090b). Kald, ren, ingen bla tint. Amber (#f59e0b) som eneste varme farge — brukes KUN for handling kreves.
```
to:
```
**Color world:** Dokumentbordet — varme papir-inspirerte flater. Lys: #f3f1ec canvas, #faf8f4 felt. Mork: #0f0d0a canvas, #16140f felt. Jernblekk-hierarki med golden amber aksent (#925609 lys / #f59e0b mork).
```

- [ ] **Step 2: Update Tokens section surface values**

Replace the surface tokens (lines 31-36) with Dokumentbordet values for both light and dark. Note both light and dark values since the system now has a light default.

```markdown
### Surfaces (Dokumentbordet — varme papirtoner)

**Light (default):**
- `canvas` #f3f1ec — bakgrunn
- `felt` #faf8f4 — kort, paneler
- `felt-raised` #f3f1ec — toolbar, headers
- `felt-hover` #efede7
- `felt-active` #e5e2da

**Dark:**
- `canvas` #0f0d0a — bakgrunn
- `felt` #16140f — kort, paneler
- `felt-raised` #1e1b16 — toolbar, headers
- `felt-hover` #1a1815
- `felt-active` #282520
```

- [ ] **Step 3: Update ink token values**

Replace ink tokens (lines 38-42) with both themes:

```markdown
### Ink (jernblekk-hierarki)

**Light:**
- `ink` #21201c — primaertekst
- `ink-secondary` #57524b — stottetekst
- `ink-muted` #655f56 — labels, metadata (WCAG AA 4.5:1+)
- `ink-ghost` #8d8578 — KUN dekorativt (~3:1, under AA)

**Dark:**
- `ink` #f5f3ee
- `ink-secondary` #a8a29a
- `ink-muted` #908b82
- `ink-ghost` #666157
```

- [ ] **Step 4: Update wire token values**

Replace wire tokens (lines 44-47):

```markdown
### Wire (borders — ALLTID RGBA, varm tint)
**Light:** rgba(33,28,18, 0.06/0.12/0.20)
**Dark:** rgba(245,235,220, 0.08/0.15/0.25)
```

- [ ] **Step 5: Update vekt token values for light theme**

Replace vekt tokens (lines 49-53) — light theme changes, dark stays:

```markdown
### Vekt (aksent — amber)
**Light:** `vekt` #925609, `vekt-dim` #7c4a0a, `vekt-bg` rgba(146,86,9, 0.06/0.12)
**Dark:** `vekt` #f59e0b, `vekt-dim` #d97706, `vekt-bg` rgba(245,158,11, 0.08/0.14)
```

- [ ] **Step 6: Update score token values**

Replace score tokens (lines 55-58):

```markdown
### Score (semantisk)
**Light:** high #047d56 / bg #eff5ee, mid #655f56, low #c01b3d / bg #f5eeef
**Dark:** high #10b981 / bg rgba(16,185,129,0.10), mid #908b82, low #f03e5f / bg rgba(240,62,95,0.08)
```

- [ ] **Step 7: Add ink-ghost policy note**

After the ink section, add:

```markdown
**ink-ghost policy:** Ghost (~3:1) is intentionally below WCAG AA. Use ONLY for decorative timestamps (redundant with timeline position) and decorative divider labels. All informational text must use ink-muted (4.5:1+) or higher. Placeholders must use ink-muted.
```

- [ ] **Step 8: Commit**

```bash
git add .interface-design/system.md
git commit -m "Update design system docs for Dokumentbordet palette"
```

### Task 7: Final verification

- [ ] **Step 1: Run contrast check one final time**

Run: `node src/contrast-check.js`
Expected: 0 FAIL for informational text. Only decorative ghost usages show as expected sub-AA.

- [ ] **Step 2: Run type check**

Run: `npm run check`
Expected: No new errors.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: All tests pass.
