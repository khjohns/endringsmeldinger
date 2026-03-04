# KOE Design System — Analysebordet

## Intent

**Who:** Kontraktsadministrator i NS 8407-forhandlinger. Jobber med juridiske posisjoner, vederlagskrav, fristberegninger. Trenger presisjon og oversikt over komplekse tall.

**What:** Evaluere krav, ta rettslige standpunkter, skrive begrunnelser. Tett analytisk arbeid der feil koster penger.

**Feel:** Finansanalytikens skrivebord — kaldt, presist, datadrevet. Tallene ER innholdet. Ikke varmt, ikke vennlig. Autoritativt og nøkternt som en kontraktsprotokoll.

## Direction

**Domain:** Kontraktsrett, byggebransje, forhandlingsbord, protokoller, §-referanser, tidslinjer, beløpsberegninger.

**Color world:** Mørke kontorflater (canvas #0c0e14), kald stål-blå for paneler, ravgul (amber) for vekting og aksent — som gullskrift på mørkt skinn. Grønn for godkjent, rød for avslått, dempet for uavklart.

**Signature:** Vektlinjen — en vertikal ravgul aksent (3px border-left) som løper ned venstrekanten. Gjør abstrakt vekting fysisk skannbar. Amber er den eneste varme fargen i et kaldt system.

**Depth:** Borders-only. Ingen skygger. Mørk bakgrunn + tett data = borders definerer struktur stille. Surface shifts (felt → felt-raised) erstatter drop shadows.

## Tokens (implementert i src/app.css)

### Surfaces
- `canvas` #0c0e14 — arbeidsflate
- `felt` #12151e — kort, paneler
- `felt-raised` #181c28 — dropdowns, popovers
- `felt-hover` #1e2233
- `felt-active` #242840

### Ink (tekst-hierarki)
- `ink` #e2e5ef — primærtekst
- `ink-secondary` #8890a4 — støttetekst
- `ink-muted` #7b829b — labels, metadata
- `ink-ghost` #5a6178 — disabled, placeholder

### Wire (borders)
- `wire` rgba(255,255,255,0.06) — standard separasjon
- `wire-strong` rgba(255,255,255,0.10) — gruppedeling
- `wire-focus` rgba(232,168,56,0.35) — fokusringer (amber)

### Vekt (aksent — amber)
- `vekt` #e8a838 — primær vektfarge
- `vekt-dim` #c49030 — sekundær
- `vekt-bg` rgba(232,168,56,0.08) — tint
- `vekt-bg-strong` rgba(232,168,56,0.14) — emphasis

### Score (semantisk)
- `score-high` #3d9a6e / bg rgba(61,154,110,0.10) — godkjent, høy
- `score-mid` #8890a4 — delvis, nøytral
- `score-low` #c45858 / bg rgba(196,88,88,0.10) — avslått, lav

## Typography
- **UI:** Inter — labels, knapper, brødtekst
- **Data:** JetBrains Mono — tall, beløp, datoer, prosent
- **Section labels:** 11px, weight 600, uppercase, tracking 0.08em, ink-muted
- **Body/labels:** 13px, weight 500
- **Data values:** 13px, font-data, tabular-nums

## Spacing
4px base grid: 4/8/12/16/20/24/32/40/48

## Radius
Skarpere enn standard — kontraktdokument-karakter:
- `sm` 2px — inputs, knapper, badges
- `md` 4px — kort, segmented controls
- `lg` 6px — containere, modaler

## Component Patterns

### Knapper
36px høyde, r-sm, font-ui 13px weight 600. Varianter via semantiske farger.

### Badges
10-11px uppercase, weight 600, tracking 0.06em, padding 2px 8px, r-sm.

### Section headers
11px uppercase, tracking 0.06em, border-bottom 1px wire, optional §-ref i ink-muted.

### Key-value rows
Label (ink-secondary) + dotted leader + verdi (ink eller font-data). Brukt overalt i midtpanelet.

### Verdict buttons
Horisontal gruppe, 36px, semantisk farge per valg. Kun én aktiv.

### Number inputs
font-data, tabular-nums, 36px høyde, canvas-bg (inset), suffix i ink-muted.

### Checkboxes
16x16px, canvas-bg, wire-strong border. Checked: vekt-bg + vekt-border. Label først (mennesketekst), §-ref sekundært i ink-muted.

### Segmented controls
felt-bg container, r-md, 3px padding. Aktiv segment: vekt-bg-strong + vekt tekst.

### Consequence callouts
Border-left 3px (semantisk farge), padding 12px 16px, ikon + tekst.

### Locked value tokens
Inline i rich text: {{type:value:display}}. Fargekoding: dager=blå, beløp=grønn, prosent=lilla, paragraf=nøytral.
