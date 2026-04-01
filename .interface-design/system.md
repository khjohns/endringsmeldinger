# KOE Design System — Forhandlingsbordet

## Intent

**Who:** Prosjektledere, anleggsledere og jurister (Entreprenor/Byggherre). Under tidspress pa byggeplassen eller i kontraktsmoter. Stort okonomisk ansvar.

**What:** Triage av pagaende tvister (NS 8405/8407). Umiddelbart forsta hva som brenner, hvem som har ballen, og hva den okonomiske risikoen er.

**Feel:** Et fysisk skrivebord med juridiske dokumenter. Knallhardt, presist, teknisk og blottet for unodvendig pynt. Ingen myke skygger, ingen lekenhet. Det skal foles som en kontrakt.

## Direction

**Domain:** Kontraktsrett, byggebransje, forhandlingsbord, protokoller, paragraf-referanser, tidslinjer, belopsberegninger.

**Color world:** Dokumentbordet — varme papir-inspirerte flater. Lys: #f3f1ec canvas, #faf8f4 felt. Mork: #0f0d0a canvas, #16140f felt. Jernblekk-hierarki med stalblaa aksent (#2c5a8c lys / #7b9ec8 mork). Kald aksent mot varme flater gir profesjonell spenning — gjenkjennelig for byggebransjen (blakopi, stalkonstruksjon, institusjonelle dokumenter).

**Signature:** Handlingskanten — en venstre kant (2px border-left) pa sporkort som indikerer umiddelbar status. Rose = Kritisk, Amber = Handling kreves, Wire = Venter.

**Depth:** Borders-only. Ingen drop-shadows brukes noe sted. Dybde skapes utelukkende ved subtile overflateskift og lav-opasitets borders.

## Architecture & Depth Strategy

**Level 0 (Base Canvas):** `--color-canvas` (lys #f3f1ec / mork #0f0d0a). Top-nav, sidebar, hovedflate og panel deler denne fargen. Separeres kun med `--wire`. Forhindrer at appen fragmenteres i soner.

**Level 1 (Dokumenter/Sporkort):** `--color-felt` (lys #faf8f4 / mork #16140f). Mikro-loft fra base. Arkene ligger oppa skrivebordet.

**Level 2 (Hover/Fokus):** `--color-felt-hover` (lys #efede7 / mork #1a1815). Indikerer interaktivitet uten a bryte dybdeillusjonen.

## Tokens (implementert i src/app.css)

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

**ink-ghost policy:** Ghost (~3:1) er bevisst under WCAG AA. Bruk KUN for dekorative timestamps (redundant med tidslinje-posisjon) og dekorative divider-labels. All informativ tekst maa bruke ink-muted (4.5:1+) eller hoyere. Placeholders maa bruke ink-muted.

### Wire (borders — ALLTID RGBA, varm tint)
**Light:** rgba(33,28,18, 0.06/0.12/0.20)
**Dark:** rgba(245,235,220, 0.08/0.15/0.25)

### Vekt (aksent — stal)
**Light:** `vekt` #2c5a8c, `vekt-dim` #214a76, `vekt-bg` rgba(44,90,140, 0.06/0.12)
**Dark:** `vekt` #7b9ec8, `vekt-dim` #5f83b0, `vekt-bg` rgba(123,158,200, 0.08/0.14)

### Score (semantisk)
**Light:** high #047d56 / bg #eff5ee, mid #655f56, low #c01b3d / bg #f5eeef
**Dark:** high #10b981 / bg rgba(16,185,129,0.10), mid #908b82, low #f03e5f / bg rgba(240,62,95,0.08)

### Fargebruk (Umotivert farge er stoy)
- **Stal (vekt):** KUN nar handling kreves, eller for a markere intern tvil/omtvistede midler.
- **Rose (score-low):** KUN for kritisk fare: Dagmulkt, passivitet, avviste krav.
- **Emerald (score-high):** KUN for avklarte, godkjente elementer.

## Typography

### Tre fonter
- **UI (`--font-ui`: Inter):** Labels, knapper, navigasjon, metadata, statusfraser, seksjonsoverskrifter (uppercase). Tekst du *skanner*. Hoy x-hoyde og apne aperturer gir best lesbarhet ved 10-13px pa HiDPI-skjermer.
- **Prosa (`--font-prose`: IBM Plex Sans):** Begrunnelser, kontraktstekst, juridiske redegjoerelser, rich text-editor, dokumenttitler. Tekst du *leser og skriver*. Mekaniske terminaler gir maskinskrevet kontrakt-kvalitet. Lastes som variabel font (wght@400..600).
- **Data (`--font-data`: IBM Plex Mono):** Tall, belop, datoer, prosent, system-IDer, paragrafreferanser, klassifikasjoner. Verdier du *slar opp*. Samme designfamilie som prosa-fonten.

### Fontvalg-prinsipp
- **UI** = navigasjon, interaksjon, korte labels. Fonten er usynlig — den skal ikke merkes.
- **Prosa** = dokumentinnhold, argumentasjon, avsnitt. Fontbyttet signaliserer modusendring: "na leser/skriver du et dokument."
- **Mono** = ville du *slatt det opp, kopiert, eller sammenlignet mot et annet dokument*? Tall, datoer, IDer, koder, paragrafer.

### Overskrifter: Navigasjon vs. Dokumenttittel
- **Seksjonsoverskrifter** ("KONTRAKTSFORHOLD", "VEDERLAGSKRAV") = UI-labels (Inter). Uppercase, tracked, strukturell navigasjon.
- **Dokumenttitler** ("Tilleggskrav — forsinkede tegningsleveranser") = Prosa (IBM Plex Sans). Introduserer dokumentinnholdet, skaper visuell kontinuitet med brodteksten under.
- **Sidebar/listevisning-titler** = Inter. Scanning/navigasjon, ikke dokumentlesing.

### Fontveksling: Romlig separasjon avgjor
- **Romlig separerte soner** kan ha forskjellig font (KeyValueRow: sans label venstre, mono verdi hoyre).
- **Aldri bytt font inni en sammenhengende tekstlinje.** Forskjellig x-hoyde og bokstavbredde skaper visuell hakking.
- **Linjen tar fonten til sin primaere funksjon:** Data-sammenligning (`Krevd 2 930 000 kr -> Godkjent 2 400 000 kr`) = hele linjen mono. Narrativ setning med innbakte tall = hele linjen sans.

### Badges: Kun for status
- Badges (visuelt fremhevet med bakgrunn/border) er reservert for *tilstandsinformasjon*: "Godkjent", "Avvist", "Mottatt krav".
- Klassifikasjoner og faktaopplysninger (beregningsmetode, kontraktsforhold-kategori) vises som ren mono-tekst, ikke badge.

### Prosa-innstillinger
- IBM Plex Sans har lavere x-hoyde enn Inter — kompenser med +1px fontstorrelse.
- Prosa-brodtekst: 14-15px, weight 400, line-height 1.6.
- Dokumenttitler: 17-19px, weight 600.

### Skala
- **Section labels (UI):** 11px, weight 600, uppercase, tracking 0.06em, ink-muted
- **Body/labels (UI):** 13px, weight 500
- **Prose body:** 14-15px, weight 450, line-height 1.6
- **Document titles (prose):** 17-19px, weight 600
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
Alle tallverdier forankres til hoyre marg, formatert med IBM Plex Mono (font-variant-numeric: tabular-nums). 12px font-size, weight 600 for nokkeltall i sporkort.

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
- **Normal (amber outline):** vekt-bg bakgrunn, vekt tekst, vekt border 30% (`color-mix(in srgb, var(--color-vekt) 30%, transparent)`). For "Svar ->", "Oppdater ->". Hover: vekt-bg-strong + solid vekt border.
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

Seksjoner separert med 1px wire. Padding 12px 16px per seksjon.

**Saksidentitet:** sys-id (font-data, 11px, ink-muted), tittel (16px, weight 600), undertittel (13px, ink-secondary).

**Gjeldende Status boks:** felt bg, wire-strong border, sm radius, 12px padding. Header: 10px uppercase ink-secondary. Verdi: 12px ink, weight 500.

**Parter:** Label (BH/TE) i font-data 10px ink-ghost, navn hoyre-justert, font-ui 13px weight 500.

**Frister:** Urgency-pills med farget bakgrunn. Critical: score-low-bg + score-low border 20%. Warning: vekt-bg + vekt border 20%. Bare warning/critical vises.

**Dokumentasjon:** Vedlegg-knapp med felt bg, wire border, sm radius.

**Nokkeltall (NOK):** Finans-rader med label (ink-secondary) og verdi (font-data, tabular-nums). Krav=ink, Godkjent=score-high, Omtvistet=vekt. Divider + undergruppe for tidsrisiko.

### Sporkort
felt bg, wire border (0.08 alpha — within 0.05-0.12 range for dark mode), sm radius, 8px 12px padding, 2px gap mellom seksjoner. Kompakt — alle tre kort skal fa plass pa ~900px vertikal hoyde.

Hover: felt-hover bg, wire-strong border. Active: felt-active bg. Transition: 150ms ease.

**Header:** flex space-between center. Spor-navn: 13px, 600, uppercase, 0.02em. Stempel + aksjonsknappe hoyre.

**Data-linje:** Strukturert statusoppsummering i font-data 11px ink-muted, enlinjes med dot-separator:
- Grunnlag: "Kontraktsforhold-label · Hjemmel-label"
- Vederlag: "2 930 000 kr · R&D 350 000 kr · Prod. 180 000 kr"
- Frist: "Varslet 13.01.2026 · Krevd 45 dager 20.01.2026"

**Hendelseslogg:** border-top wire, margin-top 8px padding-top 8px. Event-linjer: baseline gap 8px, padding 4px 8px. Dato: ink-muted. Tekst: ink-secondary. **Forste entry (siste hendelse): weight 500, ink** — recency-gradient skaper visuelt hierarki. Fokusert: amber venstekant (border-left-color vekt) + felt-hover bg. Click aktiverer forhåndsvisning (ikke hover).

**"+ Nytt internt notat":** Dashed border-top wire, **vekt-farge alltid** (ikke bare hover), weight 500. Handlingsknapp, ikke dekorativt element.

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
- Bruker `<SectionHeading title="Kontraktsforhold" paragrafRef={hjemmelRef} />` — konsistent med alle andre seksjoner
- kategori-badge: kombinert hovedkategori + underkategori ("Svikt i BH ytelse — Grunnforhold"). font-data 11px 500, felt-active bg, wire border, sm radius, align-self flex-start
- begrunnelse: 13px ink-secondary line-height 1.6 (rich-text HTML)
- dato-linje: border-top wire, 11px ink-muted label + font-data 12px 500 ink-secondary verdi

**Ingen dekorativ venstrekant.** Handlingskant-monsteret er reservert for status (rose/amber/wire), ikke rolle.

### BegrunnelseThread (kun brukt i TeGrunnlagRevisjon)
Sticky panel, felt bg, border-left wire-strong. Tre faner med amber underline pa aktiv. Brukes kun i revisjonsmodus (TE reviderer grunnlag). For alle andre skjemaer er begrunnelse flyttet inline i midtpanelet (InlineBegrunnelse) og hoyrepanelet viser KontekstPanel.

**Begrunnelse-fane (skriveflate):** Kun editor + vedlegg.

**Historikk-fane (arkiv):** Collapsible entries med faktisk partsnavn (f.eks. «Veidekke», «Statens vegvesen»), versjon, dato, resultat.

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

### Saksark (Detaljsider / Skjemaer)

Monsteret for alle spor-detalj/svarskjema-sider (send-vederlag, svar-grunnlag, ny sak, etc.).

**Layout:** `FormWithRightPanel` — midtpanel (skjema + InlineBegrunnelse) + hoyre sticky panel (KontekstPanel med bestemmelser/historikk/filer-faner).

**Kognitiv flyt:** Brukeren besvarer sporsmal (skjema) med kontraktsbestemmelser synlige i hoyrepanelet, ser resultatet (konsekvens-boks), og gjennomgar auto-generert begrunnelse inline under resultatet. Bestemmelser er referansemateriale under beslutningene; begrunnelsen er gjennomgangsoppgave etter beslutningene.

**KontekstPanel** (`src/lib/components/shared/KontekstPanel.svelte`):
Hoyre panel med tre faner:
- Bestemmelser: §-referanser fra `sporBestemmelser(spor)` — vises mens brukeren tar stilling
- Historikk: Tidligere begrunnelser (BegrunnelseEntry[]) — collapsible entries med partsnavn
- Filer: Vedlegg med drag-and-drop upload, tagging

**InlineBegrunnelse** (`src/lib/components/shared/InlineBegrunnelse.svelte`):
Plasseres i midtpanelet etter konsekvens-boksen. Inneholder:
- SectionHeading + regenerer-knapp + tegnteller
- RichTextEditor med LockedValueNode-stotte
- Send/Avbryt-knapper under editoren
- Auto-generert begrunnelse fylles inn nar tilstrekkelig skjemadata foreligger

**FormSection-komponent** (`src/lib/components/shared/FormSection.svelte`):
Wrapper for alle skjema-seksjoner. Gir flex-column, gap 12px, og definerer `.helptext`, `.field-amount`, `.field-auto` via `:global()`. Bruk ALLTID `<FormSection>` i stedet for manuell `<section class="form-section">`.

```svelte
<FormSection>
  <SectionHeading title="Varsling" paragrafRef="§32.2" />
  <p class="helptext">Forklarende tekst under overskriften.</p>
  <div class="field-amount"><NumberInput ... /></div>
</FormSection>
```

**SectionHeading** (`src/lib/components/primitives/SectionHeading.svelte`):
- Tittel venstre (11px, 600, uppercase, 0.06em tracking, ink-muted)
- Paragraf-referanse hoyre (11px, 400, ink-muted)
- Border-bottom wire under hele bredden
- Aldri manuell `.section-header` div — alltid SectionHeading-komponenten

**Helptext** (`.helptext` — definert i FormSection):
- 13px, ink-secondary, line-height 1.5
- Plasseres etter `<SectionHeading>`, for inputfelter
- Forklarer kontraktskontekst, ikke gjenta §-ref fra heading

**Feltstorrelse** (definert i FormSection):
- `.field-amount` (belop): `max-width: 240px`
- `.field-auto` (korte valg): `width: fit-content`
- Currency-formatering: `Intl.NumberFormat('nb-NO')` med `kr`-suffiks

**Standpunkt-overgang:**
Nar en side viser TEs henvendelse (SammendragKort) fulgt av BHs svarskjema, plasseres `<SectionHeading title="Standpunkt" />` mellom dem. Markerer overgangen fra lesing til handling.

**SammendragKort i skjema:**
- `hideHeader` — ingen sak-header (den er i FormPageHeader)
- `hjemmelRef` — paragraf-referanse for Kontraktsforhold-seksjonen
- Bruker SectionHeading internt for "Kontraktsforhold" + hjemmelRef

**FormPageHeader:**
- Tilbake-lenke, eyebrow (handlingstype), prosjekt/part-info, saksnr, tittel
- Gir kontekst uten a gjenta sak-headeren i SammendragKort

## Narrativskille

| Visning | Metafor | Formal | Modus |
|---|---|---|---|
| `/[prosjektId]` (tidslinje) | Kontrollrommet | Scan alle saker, triage | Radar, oversikt |
| `/[prosjektId]` (tabell) | Sakslisten | Sortere, filtrere | Tabellmodus |
| `/[prosjektId]/[sakId]` | Saksmappen | Scan status, triage | Lesing, scanning |
| `/[prosjektId]/[sakId]/[spor]` | Forhandlingsbordet | Svar, ta standpunkt | Arbeid, skriving |
