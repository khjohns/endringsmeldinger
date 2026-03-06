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

### 7. Partsidentifikasjon (Party Names, Not Roles)
Der en handling er utfort av en part, bruk faktisk selskapsnavn (f.eks. «Veidekke Entreprenor AS», «Statens vegvesen»), IKKE abstrakte rollekoder (TE/BH). Brukeren kjenner partene — rollekoder er intern sjargong som skaper avstand.

- **Historikk-entries:** Partsnavn (12px, weight 600, ink-secondary) erstatter rolle-badge
- **Editor-header:** Ingen rolle-badge — brukeren vet hvem de er
- **Ingen rolle-farge:** Blatt/lilla for TE/BH er fjernet. Partene identifiseres ved navn, ikke fargekodet rolle. Fargereservering: kun semantisk (amber/rose/emerald for status)

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
felt bg, wire border (0.08 alpha — within 0.05-0.12 range for dark mode), sm radius, 12px 16px padding, 4px gap mellom seksjoner.

Hover: felt-hover bg, wire-strong border. Active: felt-active bg. Transition: 150ms ease.

**Header:** flex space-between center. Spor-navn: 13px, 600, uppercase, 0.02em. Stempel + aksjonsknappe hoyre.

**Hendelse-kontekst:** Siste hendelse + nokkeltall (font-data 13px 600 tabular-nums, margin-left auto) pa samme rad. 11px ink-secondary.

**Data-linje:** Subordinert kontekst (hjemmel, kategori). 11px ink-muted. Kun vist nar relevant.

**Hendelseslogg:** border-top wire, margin-top 8px padding-top 8px. Event-linjer: baseline gap 8px, padding 4px 8px. Dato: ink-ghost. Tekst: ink-secondary. Fokusert: amber venstekant (border-left-color vekt) + felt-hover bg. Click aktiverer forhåndsvisning (ikke hover).

**"+ Nytt internt notat":** Dashed border-top wire, ink-ghost tekst, hover -> vekt.

### Forhåndsvisningspanel (360px)
Border-left wire-strong. Padding 24px. Slide-in animasjon (opacity 0->1, translateX 12->0, 200ms).

Close-button: absolut top-right, ink-ghost, hover->ink.

Header: ikon + handling + meta (auto margin-left). Separator: 1px wire.

Seksjonslabels: 10px uppercase ink-ghost. Tekst: 12px ink-secondary. Spordetalj-lenke: flex-end, 11px ink-muted, hover->vekt.

### SammendragKort (forhandlingsbordet)
Arver SakPanel-strukturen. INGEN kort-boks — flat seksjonsinndeling integrert i skjemaets midtpanel. Brukeren sitter ved forhandlingsbordet og leser kravet direkte, ikke et sammendragskort *om* kravet.

**Header (border-bottom wire-strong, padding-bottom 16px, margin-bottom 20px):**
- sak-id: font-data 10px ink-muted + optional versjon-badge (felt-active bg, wire border, sm radius)
- tittel: 16px weight 600 ink
- status: 11px uppercase ink-secondary, tracking 0.04em

**Kontraktsforhold-seksjon:**
- seksjon-label: 10px 600 uppercase tracking 0.08em ink-muted
- kategori-badge: kombinert hovedkategori + underkategori ("Svikt i BH ytelse — Grunnforhold"). font-data 11px 500, felt-active bg, wire border, sm radius, align-self flex-start
- begrunnelse: 13px ink-secondary line-height 1.6 (rich-text HTML)
- dato-linje: border-top wire, 11px ink-muted label + font-data 12px 500 ink-secondary verdi

**Ingen dekorativ venstrekant.** Handlingskant-monsteret er reservert for status (rose/amber/wire), ikke rolle.

### BegrunnelseThread (hoyrepanel, forhandlingsbordet)
Sticky panel, felt bg, border-left wire-strong. Tre faner med amber underline pa aktiv.

**Begrunnelse-fane (skriveflate):** Kun editor + vedlegg. Ren arbeidsflate uten lesestoff — TEs begrunnelse er fullt lesbar i midtpanelet (SammendragKort).

**Historikk-fane (arkiv):** Collapsible entries med faktisk partsnavn (f.eks. «Veidekke», «Statens vegvesen»), versjon, dato, resultat. Ingen rolle-farget venstrekant — noytralt. Kronologisk trad over alle versjoner. Referansedokument, ikke arbeidsverktoy.

**Filer-fane:** Vedlegg og dokumenter (placeholder).

### Saksliste (tabell)
Full-width tabell med felt-bg, wire border, sticky header.
- Header: 10px, uppercase, tracking 0.08em, ink-muted
- Rader: hover -> felt-hover, cursor pointer
- Tall-kolonner: font-data, tabular-nums

### Saksoversikt (tidslinje)
HUD-inspirert tidslinjevisning av alle saker. Rad-per-sak med horisontale tidslinje-noder.

**Layout:** 260px meta (sak-id + tittel) + flex tidslinje-canvas. 52px radhøyde.

**Noder (16px):**
- K (kontrakt): border ink-ghost, tekst ink-muted
- V (vederlag): border vekt, tekst vekt
- F (frist): border score-low, tekst score-low
- Bakgrunn: canvas. Border-radius: 1px. Font: font-data 8px weight 600.
- **Ubesvart:** Filled bakgrunn (typefarge), canvas tekst — krever oppmerksomhet.
- **Besvart:** Outline only, opacity 0.6 — avklart, lavere prioritet.

**Klynge-logikk:** Hendelser innenfor 5% av tidslinjebredden grupperes. Cluster-tag (12px) med prioritet F > V > K.

**Spor-fokusering:** Sidebar K/V/F-knapper aktiverer globalt filter. Klynger uten match: opacity 0.15. Enkelt-noder som ikke matcher: opacity 0.12. Viser handlingsmønster på tvers av saker.

**Eksplosjons-hover:** Noder i klynge translaterer ut (8px) ved hover. 200ms ease-out.

**Digital Ink-Flow:** SVG dashed lines (stroke-dasharray: 2 3) mellom klynger. Farge: wire.

**Tidsakse:** Sticky header med maanedslabels (font-data 9px ink-ghost). "I DAG" hoyre-justert (ink, weight 600). Labels filtreres: min 10% avstand, maks 92% posisjon.

**Akse-label:** "TIDSLINJE" i akse-spacer (260px). Section-label stil (font-data 10px 600 uppercase 0.08em ink-muted).

**Dot grid bakgrunn:** radial-gradient(circle at 1px 1px, wire 0.5px, transparent 0), 32px spacing.

**Aktiv rad:** border-left 2px solid vekt, felt bg, wire border.

**Detaljpanel (460px):**
- Slide-in fra hoyre, position absolute. Transition: 300ms cubic-bezier(0.05, 0.7, 0.1, 1).
- Double-wire: border-left wire-strong + inner pseudo rgba(255,255,255,0.04).
- Header: sak-id (font-data 10px ink-muted), tittel (16px weight 600), status (11px uppercase ink-secondary).
- Escape lukker panelet.

**Panelstruktur (tre seksjoner):**
1. **Kontraktsforhold:** kategori-badge (felt-active bg, wire border, sm radius) + begrunnelse-tekst (13px ink-secondary, line-height 1.6). Narrativ kontekst, ingen hendelser.
2. **Hendelsesforlop:** Alle K/V/F kronologisk. Dato (font-data 10px ink-ghost, 48px) + farget node (16px, besvart=outline 0.6 / ubesvart=filled) + label. Vertikal wire-linje. Siste ubesvarte fremhevet (ink, weight 500) — viser hvem som har ballen.
3. **Krav:** Kompakte rader (wire border, sm radius, 8px 12px padding) med spor-ikon (V amber, F rose) + navn + hoyre-justert verdi (font-data 13px tabular-nums). Godkjent i score-high etter skrastrek. Forsering-rad med palopt/maks.
4. "Apne saksmappe" lenke: 12px ink-muted, hover vekt, border-top wire, margin-top auto.

**OversiktSidebar (260px):** Canvas bg, wire-strong border-right. Seksjoner: Prosjektidentitet (navn, entreprise, telling), Visning (toggle Tidslinje/Tabell med section-label), Spor (K/V/F-knapper med tellinger + ubesvart-badges), Nøkkeltall (NOK). Toggle: inactive ink-ghost, active ink + weight 600, felt/felt-active bg. Preferanse i localStorage.

## Narrativskille

| Visning | Metafor | Formal | Modus |
|---|---|---|---|
| `/[prosjektId]` (tidslinje) | Kontrollrommet | Scan alle saker, triage | Radar, oversikt |
| `/[prosjektId]` (tabell) | Sakslisten | Sortere, filtrere | Tabellmodus |
| `/[prosjektId]/[sakId]` | Saksmappen | Scan status, triage | Lesing, scanning |
| `/[prosjektId]/[sakId]/[spor]` | Forhandlingsbordet | Svar, ta standpunkt | Arbeid, skriving |
