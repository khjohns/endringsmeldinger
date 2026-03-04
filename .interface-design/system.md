# KOE Design System — Analysebordet + Forhandlingsbordet

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

---

## Forhandlingsbordet — Fase 2 Patterns

### Signaturelement: Handlingskant

Forhandlingsbordet arver Vektlinjen-konseptet men refortolker det: venstre kant = handlingsstatus.

| Tilstand | Bakgrunn | Venstre kant | Handling |
|---|---|---|---|
| Handling — normal | --felt | 3px solid --vekt | → Svar |
| Handling — kritisk | --score-low-bg | 3px solid --score-low | → Svar nå |
| Venter på motpart | --felt | 1px solid --wire-strong | Ingen |
| Godkjent | --felt | 2px solid --score-high | Ingen, ✓ badge |
| Avslått | --felt | 2px solid --score-low | → Forsering? |
| Bortfalt | --felt | 1px dashed --ink-ghost | → Se sak |

### Layout: To-kolonne

```
┌──────────────────────┬────────────────────────────────┐
│ Sidebar (260px)      │ Tidslinje (1fr, max 820px)     │
│ sticky, 100vh        │                                │
└──────────────────────┴────────────────────────────────┘
```

Grid: `260px 1fr`. Sidebar: sticky top 0, height 100vh, overflow-y auto, border-right 1px --wire.

### Sidebar

Seksjoner separert med 1px --wire. Padding sp-4 (16px).

**Saksidentitet:** sak_id (font-data, 12px, ink-muted), tittel (font-ui, 16px, weight 600, ink), undertittel (13px, ink-secondary).

**Parter:** Label (TE/BH) i font-data 10px ink-ghost, navn i font-ui 13px ink.

**FRISTER:** Section-label-mønster (11px uppercase). Urgency-sortert — mest presserende øverst. Tre fargenivåer:
- Kritisk (passivitet): score-low, weight 600, uppercase "PASSIVITET"
- Advarsel: vekt
- Normal: ink-secondary
- Dager: font-data, mono

**VARSLING:** Section-label-mønster. Symboler + menneskelig tekst:
- ✓ ok: score-high
- ⚠ warning: vekt
- ✕ breach: score-low
- – na: ink-ghost
- §-referanse i title-attr (tooltip for juristen)

### Tidslinjespine

Vertikal linje: 1px solid --wire-strong, venstre for kortene.

**Datomerke:** ink-muted, 11px, uppercase, tracking 0.06em. Relativ tid: "I DAG", "I GÅR", dato.
**Datopunkt:** 6px sirkel, ink-muted.
**Sak opprettet:** ○ + tekst, ink-muted.

### ActionBanner

Sticky øverst i tidslinjen. Én linje.

```
⚠ N handlinger venter på deg
```

- Fargekodet etter mest urgent: score-low-bg (passivitet), vekt-bg (normal), transparent (ingen)
- font-ui, 12px, weight 600
- Ikon ⚠ i matchende farge
- Null-tilstand: "Ingen handlinger. Venter på TE." i ink-muted

### Sporkort

Kompakt 2-3 linjer. Hele kortet klikkbart (cursor pointer) → spordetalj.

```
Bakgrunn: --felt (normal), --score-low-bg (kritisk/passivitet)
Border: 1px solid --wire
Border-left: se differensieringstabell over
Hover: --felt-hover
Radius: --r-md (4px)
Padding: sp-3 (12px) top/bottom, sp-4 (16px) left/right
Gap mellom linjer: sp-1 (4px)
Focus-visible: 2px solid --wire-focus, offset -2px
Transition: background 150ms ease
```

**Header-linje (flex, center, gap sp-2):**
- Spornavn: font-ui, 12px, weight 600, ink. ANSVARSGRUNNLAG / VEDERLAG / FRISTFORLENGELSE
- Statusbadge: 10px, uppercase, weight 600, tracking 0.06em, ink-secondary, pill (1px 6px, r-sm, felt-active bg)
- Varslingsflagg: font-ui, 10px, ink-muted. Symboler fargekodede (✓ score-high, ⚠ vekt, ✕ score-low). §-ref i title-attr.
- Handlingsknapp (ml-auto): font-ui, 11px, weight 600. Normal: vekt tekst, vekt-bg bg. Kritisk: score-low tekst, score-low-bg bg. Hover: sterkere bg.

**Data-linje:**
- font-data, 12px, ink
- Prikk-separert (· med sp-1)
- Rev. N i vanlig tekst
- Frist i ink-muted: "(DD.MM)" etter dager

**Historikk-linje:**
- font-ui, 10px, ink-muted
- Prikk-separert
- Relativ tid: "i dag", "i går", dato

### Hendelseslogg (innfelt i sporkort, 4+ hendelser)

**Toggle-bar (under historikk-linjen):**
```
Bakgrunn: --canvas (innfelt)
Border-top: 1px solid --wire
Radius: 0 0 r-md r-md
Hover: rgba(255,255,255,0.03)
Tekst: "N hendelser" font-data 10px ink-muted
Chevron: 8px ink-ghost, roterer 90° ved expand (▸ → ▾)
```

**Ekspandert tilstand:**
- Kortet: felt-raised bg, wire-strong border
- Toggle-bar: border-bottom 1px wire (separator)
- StopPropagation på hele toggle/logg-area

**Hendelseslinje-anatomi:**
```
[ikon 14px] [dato 38px mono 10px] [tekst flex 11px] [rev 9px ghost] [part 20px mono 10px ghost]
```

**Hendelsesikoner:**
| Ikon | Betydning | Farge |
|---|---|---|
| → | Sendt/krevd | ink-muted |
| ⚑ | Varslet | ink-muted |
| ↻ | Revidert | vekt-dim |
| ◇ | Svar fra motpart | score-high |
| ✓ | Godkjent | score-high |
| ✕ | Trukket/avslått | score-low |

### Saksliste (tabell)

Full-width tabell med felt-bg, wire border, sticky header.
- Header: 10px, uppercase, tracking 0.08em, ink-muted
- Rader: hover → felt-hover, cursor pointer, hele raden klikkbar (lenke)
- Tall-kolonner: font-data, tabular-nums
- Status: Badge-primitiv
- Sorteringsikon: ▴/▾ i ink-ghost, aktiv = ink

### Fargekartlegging Analysebordet → Forhandlingsbordet

| Analysebordet | Forhandlingsbordet | Prinsipp |
|---|---|---|
| vekt = vekting | vekt = handling kreves | Amber = "viktig" |
| score-high = god score | score-high = godkjent | Grønn = "bra" |
| score-low = dårlig score | score-low = kritisk/avslått | Rose = "problem" |
| Vektlinjen (vertikal spine) | Handlingskant (venstre border) | Kant-accent = anker |
