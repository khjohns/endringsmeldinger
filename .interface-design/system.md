# KOE Design System — Forhandlingsbordet

## Intent

**Who:** Prosjektledere, anleggsledere og jurister (Entreprenor/Byggherre). Under tidspress pa byggeplassen eller i kontraktsmoter. Stort okonomisk ansvar.

**What:** Triage av pagaende tvister (NS 8405/8407). Umiddelbart forsta hva som brenner, hvem som har ballen, og hva den okonomiske risikoen er.

**Feel:** Et fysisk skrivebord med juridiske dokumenter. Knallhardt, presist, teknisk og blottet for unodvendig pynt. Ingen myke skygger, ingen lekenhet. Det skal foles som en kontrakt.

## Direction

**Domain:** Kontraktsrett, byggebransje, forhandlingsbord, protokoller, paragraf-referanser, tidslinjer, belopsberegninger.

**Color world:** Zinc-notral morke flater (base #09090b). Kald, ren, ingen bla tint. Amber (#f59e0b) som eneste varme farge — brukes KUN for handling kreves.

**Signature:** Handlingskanten — en venstre kant (2px border-left) pa sporkort som indikerer umiddelbar status. Rose = Kritisk, Amber = Handling kreves, Wire = Venter.

**Depth:** Borders-only. Ingen drop-shadows brukes noe sted. Dybde skapes utelukkende ved subtile overflateskift og lav-opasitets borders.

## Architecture & Depth Strategy

**Level 0 (Base Canvas):** `--color-canvas` (#09090b). Top-nav, sidebar, hovedflate og panel deler denne fargen. Separeres kun med `--wire`. Forhindrer at appen fragmenteres i soner.

**Level 1 (Dokumenter/Sporkort):** `--color-felt` (#121214). Mikro-loft fra base. Arkene ligger oppa skrivebordet.

**Level 2 (Hover/Fokus):** `--color-felt-hover` (#18181b). Indikerer interaktivitet uten a bryte dybdeillusjonen.

## Tokens (implementert i src/app.css)

### Surfaces (zinc-neutral, ingen bla tint)
- `canvas` #09090b — arbeidsflate (alias: `base`)
- `felt` #121214 — kort, paneler
- `felt-raised` #1c1c1f — dropdowns, popovers
- `felt-hover` #18181b
- `felt-active` #27272a

### Ink (tekst-hierarki, brighter purer whites)
- `ink` #fafafa — primaertekst
- `ink-secondary` #a1a1aa — stottetekst
- `ink-muted` #71717a — labels, metadata
- `ink-ghost` #52525b — disabled, placeholder

### Wire (borders — ALLTID RGBA, aldri solid hex)
- `wire` rgba(255,255,255,0.08) — standard separasjon
- `wire-strong` rgba(255,255,255,0.15) — seksjonsinndeling
- `wire-focus` rgba(255,255,255,0.25) — fokusringer

### Vekt (aksent — amber, eneste varme farge)
- `vekt` #f59e0b — primaer aksent
- `vekt-dim` #d97706 — sekundaer
- `vekt-bg` rgba(245,158,11,0.08) — tint
- `vekt-bg-strong` rgba(245,158,11,0.14) — emphasis

### Score (semantisk)
- `score-high` #10b981 / bg rgba(16,185,129,0.10) — godkjent, emerald
- `score-mid` #a1a1aa — noytralt
- `score-low` #e11d48 / bg rgba(225,29,72,0.08) — kritisk, rose

### Fargebruk (Umotivert farge er stoy)
- **Amber (vekt):** KUN nar handling kreves, eller for a markere intern tvil/omtvistede midler.
- **Rose (score-low):** KUN for kritisk fare: Dagmulkt, passivitet, avviste krav.
- **Emerald (score-high):** KUN for avklarte, godkjente elementer.

## Typography
- **UI:** Inter — labels, knapper, brodtekst
- **Data:** JetBrains Mono — tall, belop, datoer, prosent
- **Section labels:** 10px, weight 600, uppercase, tracking 0.08em, ink-muted
- **Body/labels:** 13px, weight 500
- **Data values:** 13px, font-data, tabular-nums

## Spacing
4px base grid: 4/8/12/16/20/24/32/40/48

## Radius
Skarpt — kontraktdokument-karakter. Ingen runde hjorner:
- `sm` 2px — inputs, knapper, badges, kort
- `md` 2px — kort, segmented controls (bevisst lik sm)
- `lg` 6px — containere, modaler

## Key Patterns

### 1. Handlingskant (The Action Edge)
Venstre kant av et sporkort (border-left: 2px solid) er reservert for umiddelbar statusavlesning. Oyet skanner denne aksen forst.

| Tilstand | Bakgrunn | Venstre kant |
|---|---|---|
| Kritisk/Passivitet | score-low-bg | 2px solid score-low |
| Handling kreves | felt | 2px solid vekt |
| Godkjent | felt, opacity 0.7 | 1px solid score-high |
| Avslatt | felt | 2px solid score-low |
| Venter | felt | 1px solid wire-strong |
| Bortfalt | felt | 1px dashed ink-ghost |

### 2. Hoyreforankret Metrikk (The Tabular Wall)
Alle tallverdier forankres til hoyre marg, formatert med JetBrains Mono (font-variant-numeric: tabular-nums). 15px font-size for nokkeltall i sporkort.

### 3. Skilleark (Date Dividers)
Flat date-divider med `::after` horizontal rule. Ingen vertikal tidslinje-spine. Dokumenter grupperes under horisontale datolinjer. Nyeste overst, eldste nederst.

```css
.date-divider { display: flex; align-items: center; gap: 16px; }
.date-divider::after { content: ''; flex: 1; height: 1px; background: var(--wire); }
.date-text { font-data, 10px, 600, uppercase, 0.08em tracking, ink-muted }
```

### 4. Stempler (Skarpe kanter)
Alle status-indikatorer har skarpe hjorner (2px radius). De skal foles som blekkstempler, ikke systemkomponenter.

Varianter:
- `critical`: score-low tekst + score-low border + score-low bg 10%
- `waiting`: ink-secondary tekst + wire-strong border
- `approved`: score-high tekst + score-high border 30%
- `action`: vekt tekst + vekt border 30%

### 5. Gule Lapper (Interne Notater)
Interne elementer markeres med svak amber-bakgrunn (vekt-bg) og stiplet venstrekant (dashed). Bryter bevisst med den strenge logg-estetikken for a signalisere at "dette gar ikke ut av huset".

```css
.internt-notat {
  background: var(--vekt-bg);
  border-left: 2px dashed var(--vekt);
  border-radius: 0 2px 2px 0;
}
```

### 6. Aksjonsknapper
To varianter:
- **Normal (amber outline):** vekt-bg bakgrunn, vekt tekst, vekt border 30%. For "BEHANDLE ->".
- **Kritisk (solid rose):** score-low bakgrunn, hvit tekst. For "SVAR NA ->".

## Component Patterns

### Top-Nav Breadcrumbs
48px hoyde, border-bottom wire-strong. Breadcrumbs: 12px, ink-secondary. Current: ink, weight 500. Bruker-info hoyre-justert med avatar (24px sirkel).

### Sidebar (260px)
Bakgrunn: canvas (IKKE felt — unified med hovedflaten). Border-right: wire-strong.

Seksjoner separert med 1px wire. Padding 16px 24px per seksjon.

**Saksidentitet:** sys-id (font-data, 11px, ink-muted), tittel (16px, weight 600), undertittel (13px, ink-secondary).

**Gjeldende Status boks:** felt bg, wire-strong border, sm radius, 12px padding. Header: 10px uppercase ink-secondary. Verdi: 12px ink, weight 500.

**Parter:** Label (BH/TE) i font-data 10px ink-ghost, navn hoyre-justert, font-ui 13px weight 500.

**Frister:** Urgency-pills med farget bakgrunn. Critical: score-low-bg + score-low border 20%. Warning: vekt-bg + vekt border 20%. Bare warning/critical vises.

**Dokumentasjon:** Vedlegg-knapp med felt bg, wire border, sm radius.

**Nokkeltall (NOK):** Finans-rader med label (ink-secondary) og verdi (font-data, tabular-nums). Krav=ink, Godkjent=score-high, Omtvistet=vekt. Divider + undergruppe for tidsrisiko.

### Sporkort
felt bg, wire-strong border, sm radius, 16px padding, 8px gap mellom seksjoner.

Hover: felt-hover bg, wire-focus border. Transition: 150ms ease.

**Header:** flex space-between. Spor-navn: 13px, 600, uppercase. Stempel + aksjonsknappe hoyre.

**Data-linje:** flex space-between baseline. Venstre: prikk-separerte deskriptive segmenter (12px ink-secondary). Hoyre: nokkeltall (font-data 15px 600 tabular-nums) + evt milepael-tag.

**Hendelseslogg:** border-top wire, margin-top 16px. Event-linjer: baseline gap 12px. Fokusert: amber venstekant (2px solid vekt) + felt-hover bg.

**"+ Nytt internt notat":** Dashed border-top, ink-ghost tekst, hover -> vekt.

### Forhåndsvisningspanel (360px)
Border-left wire-strong. Padding 24px. Slide-in animasjon (opacity 0->1, translateX 12->0, 200ms).

Close-button: absolut top-right, ink-ghost, hover->ink.

Header: ikon + handling + meta (auto margin-left). Separator: 1px wire.

Seksjonslabels: 10px uppercase ink-ghost. Tekst: 12px ink-secondary. Spordetalj-lenke: flex-end, 11px ink-muted, hover->vekt.

### Saksliste (tabell)
Full-width tabell med felt-bg, wire border, sticky header.
- Header: 10px, uppercase, tracking 0.08em, ink-muted
- Rader: hover -> felt-hover, cursor pointer
- Tall-kolonner: font-data, tabular-nums

## Narrativskille: Saksmappe vs Forhandlingsbord

| Visning | Metafor | Formal | Modus |
|---|---|---|---|
| `/[prosjektId]/[sakId]` | Saksmappen | Scan status, triage | Lesing, scanning |
| `/[prosjektId]/[sakId]/[spor]` | Forhandlingsbordet | Svar, ta standpunkt | Arbeid, skriving |
