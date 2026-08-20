# Kontraktsbordet — Design System v2

## Direction

**Metaphor:** Riggkontoret — der kontraktsadministratoren faktisk jobber. Ikke advokatkontoret (for formelt), ikke byggeplassen (for rått). Pulten med kontraktsdokumenter, tegninger på veggen, sikkerhetsskilt synlig gjennom vinduet.

**Feel:** Raffinert men bestemt. Juridisk tyngde med byggeplassens direkthet. Varmt men kontrollert. Rolig nok for 8 timers daglig bruk, tydelig nok for rask scanning mellom møter. Mer «arkitektkontor» enn «ingeniørbrakke».

**Signature:** Dual-posisjonsvisningen — begge parters argumenter side om side i metadata-sidebar + prosa-layout, strukturert av kontraktsbestemmelser, med stempler som statusmarkører og subsidiær forgreining som visuell sone.

---

## Typography — 3 fonter, ingen flere

| Font | Rolle | Hvorfor |
|---|---|---|
| **Plus Jakarta Sans** | All UI: overskrifter, labels, knapper, tabs, navigasjon, stempler | Humanistisk geometrisk sans — varmere og rundere enn Space Grotesk, mer tilgjengelig, bred vektskala (400–800) |
| **Literata** | All prosa: argumenttekst, bestemmelser, notater, begrunnelser | Leseoptimalisert serif — jevn strektykkelse, designet for langlesing på skjerm, ekte italics med karakter |
| **IBM Plex Mono** | All data: tall, beløp, datoer, IDer, paragrafreferanser | Humanistisk mono — varmere enn JetBrains, smalere, parer godt med Literatas temperatur |

Body-font er Plus Jakarta Sans. Alle tre fonter har humanistisk DNA — de deler en varme som binder dem sammen.

**Hierarki:**
- Seksjonsoverskrift: 19–20px Plus Jakarta Sans 700 uppercase, letter-spacing 0.01em
- Matrise-label: 13px Plus Jakarta Sans 600 normal case
- Partsnavn TE: 12px Plus Jakarta Sans 700 — assertiv, den som fremsetter krav
- Partsnavn BH: 12px Plus Jakarta Sans 500 — vurderende, responderende
- Argumenttekst: 16px Literata 400 lh 1.75 — lesbar, romslig
- Bestemmelse-notat: 13px Literata 400 italic — aksent-farget
- Data/tall: IBM Plex Mono 600–700 — alltid tabular-nums
- Stempel-tekst: 11px Plus Jakarta Sans 700 uppercase, letter-spacing 0.08em

---

## Surfaces

```
--canvas:      #F7F7F5    Nøytral-varm off-white. Alt lever på dette.
--paper:       #FFFFFF    Dokumenter, kort, innholdsbokser.
--paper-inset: #F3F3F0    Inset-bokser for argumenttekst, metadata-sidebarer.
--paper-sub:   #FAFAF8    TE-sidebar i dokumentpanelet (lysere enn inset).
--plate:       #1C1917    Sort identifikasjonsplate. Signatur, ikke elevasjon.
```

**Regler:**
- Sidebar bruker `--canvas` — samme som hovedflaten. Én verden, ikke to.
- `--plate` er et merke/skilt, ikke del av elevasjonssystemet.
- Ingen `--nav` eller separate panelfarger. Borderen separerer, ikke bakgrunnen.

---

## Ink — 4 nivåer

```
--ink:    #1C1917    Primær tekst, overskrifter
--ink-2:  #4A4945    Sekundær tekst, støttetekst
--ink-3:  #7A7975    Tertiær: metadata, timestamps
--ink-4:  #A8A7A2    Muted: disabled, placeholder, labels
```

---

## Dual Accent — Gull + Grønn

To aksenter med tydelig semantisk skille:

### Gull (primær aksent)
```
--gold:        #D4A020    Bygge-gull. Primær aksent for aktiv status og hovedspor.
--gold-bg:     #FFF8E8    Bakgrunn for gull-kontekst.
--gold-border: #F0D880    Border for gull-elementer.
```

Gull brukes til: aksent-stripe i header, seksjonsunderline for primært spor (Ansvar), aktiv matrise-rad (venstre-kant), «Venter»-stempel, historikk-dato-separatorer, vente-prikk i action bar.

### Grønn (subsidiær aksent)
```
--green:        #034B45    Dyp skoggrønn. Subsidiær aksent.
--green-bg:     #ECF5F3    Bakgrunn for subsidiær sone.
--green-border: #A0CCC4    Border for subsidiær-elementer.
```

Grønn brukes til: seksjonsunderline for subsidiære spor (Økonomi, Frist), subsidiær sone med diamant-markør, «Subsidiært»-stempel, dual bar (subsidiær linje), bestemmelse-notater i italic, GAP-verdier (subsidiært).

**Regelen:** Gull = primært, aktivt, pågående. Grønn = subsidiært, betinget, avledet. Fargene skal aldri byttes.

---

## Semantic

```
--red:     #CC3030    Bestridt, avslått, prinsipal eksponering, fare
--red-bg:  #FFF0EE    Bakgrunn for bestridt-seksjon
```

Rød er sterkere/lysere enn original (#991B1B → #CC3030) for å matche energien i gull/grønn-paletten.

---

## Draft / Internt

```
--draft:        #5A6048    Kladd-tekst, internt-merker — grønnbrun
--draft-bg:     #F6F7F2    Kladd-seksjon bakgrunn
--draft-border: #C8CCB0    Dashed kladd-ramme
```

Draft-seksjoner merkes alltid: «Internt — ikke synlig for motpart».

---

## Depth — Hybrid strategi

To parallelle systemer for to ulike roller:

### 1. Borders for struktur
- **1.5px** `--plate` for panelkanter, TE/BH-topp, sidebar-separasjon (ned fra 2px — mykere med 4px radius)
- **1px** rgba for intern separasjon (rule, rule-subtle)

```
--edge:        1.5px solid #1C1917
--rule:        1px solid rgba(28,25,23,0.10)
--rule-subtle: 1px solid rgba(28,25,23,0.06)
```

### 2. Soft shadows for interaktive elementer
- Knapper: blur-shadow (0 2px 6px) + Y-translate respons
- Kort og bestemmelser: minimal shadow (0 1px 4px rgba(0,0,0,0.04))
- Stempler: 1px hard shadow + rotasjon (hybrid — se Stempler-seksjon)

**Ingen shadows på paneler eller layout-overflater.** Shadows brukes kun på elementer brukeren interagerer med eller som trenger visuelt trykk.

### Border-progresjon

Ikke alle borders er like. Fire intensitetsnivåer:

```
--rule-subtle:   1px solid rgba(28,25,23,0.06)    Svakest: intern gruppering
--rule:          1px solid rgba(28,25,23,0.10)    Standard: seksjonsseparasjon
--rule-strong:   1px solid rgba(28,25,23,0.20)    Hover-state på kort, aktiv border
--edge:          1.5px solid #1C1917              Sterkest: strukturelle panelkanter
```

Bruk laveste nivå som fungerer. Bestemmelse-kort bruker `rule-subtle` i default, `gold-border` på hover (unntak — aksent-hover signaliserer «klikk for å se mer»).

### Overlay-nivåer (lys)

```
--overlay-1:  #FFFFFF    Dropdown, popover (same as paper, skilt med shadow)
--overlay-2:  #FFFFFF    Tooltip, nested
--overlay-bd: rgba(28,25,23,0.12)    Border på overlays
```

I lys modus skilles overlays fra paper primært med shadow, ikke bakgrunnsfarge:
```css
--overlay-shadow-sm: 0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
--overlay-shadow-lg: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
```

### Kontroll-tokens

Skjema-elementer (inputs, pills, selects) har egne tokens uavhengig av layout-overflater:

```
--control-bg:       #F3F3F0 (--paper-inset)    Input-bakgrunn.
--control-border:   1.5px solid #1C1917         Input-border default.
--control-focus:    var(--gold)                  Fokus-farge — alltid gull.
--control-focus-ring: 0 0 0 3px var(--gold-border)  Glow rundt fokusert input.
```

**Fokus er alltid gull.** Uansett om input er i primært eller subsidiært spor. Gull-ringen signaliserer «du er her» — det er en navigasjonsfarge, ikke en semantisk farge.

Pill-knapper (ja/nei) bruker semantiske farger kun i valgt tilstand:
- Default: `--control-border` (som vanlig input)
- Valgt ja: `--green` bakgrunn + hvit tekst
- Valgt nei: `--red` bakgrunn + hvit tekst
- Delvis: `--gold` bakgrunn + sort tekst

---

## Kort-variasjon

Alle kort deler: 4px radius, samme font-valg, konsistent padding-skala. Men intern struktur og overflatebehandling varierer etter innholdstype:

| Korttype | Overflate | Kant | Intern struktur |
|---|---|---|---|
| Matrise-rad | paper | 3px aksent venstre-kant | Ikon + label, data-par, dual bars |
| TE/BH-blokk | paper/redBg | edge topp + rule sider | Sidebar med metadata + prosa-innhold |
| Bestemmelse | paperIn | rule-subtle, hover→goldBorder | Mono-ref + serif-tekst + aksent-notat |
| Kladd | draftBg | 1.5px dashed draftBorder | Stempel + intern-label + italic prosa |
| Vedlegg | paper | rule-subtle, hover→strong | Ikon + filnavn + sideantall |
| Eksponering | plate (sort) | edge border | Fargede data-par (grønn/rød) |
| Subsidiær sone | greenBg | dashed venstre-stripe + diamant | Stempel + italic forklaring |

**Prinsippet:** Overflatebehandling (bakgrunn, border-type) signaliserer kortets rolle. Intern layout er designet for innholdstypen. Typografi og radius er konsistente på tvers.

---

## Border Radius

**4px overalt.** Mykt men ikke rundt. Nok til å signalisere «software», ikke nok til å bli «vennlig».

Unntak:
- Stempler: 4px (følger global radius)
- Små badges (SVIKT etc.): 2px
- Vente-prikk: rund (border-radius: 50%)

---

## Spacing — 4px grid

Base-enhet 4px. Alle verdier er multipler. Konkret bruk:

```
4    Ikon-gap, tette par (ikon + label)
8    Element-gap innen rad, metadata-spacing, mellom relaterte data-punkter
12   Komponent intern padding (pills, badges), kontroll-gap, matrise-rad header-margin
16   Rad-padding, seksjons-gap, panel-padding (smale paneler), bestemmelse-kort intern
20   Panel-padding (sidebar, kontekstpanel), gap mellom tittel og handling
24   Innholdspadding (dokumenter, argumenttekst lr-padding), TE/BH-blokk content-padding
28   Subsidiær-stripe indent (marginLeft), bestemmelse-panel outer-padding
32   Mellom hovedseksjoner, konsistens-stripe → skjema gap, kladd-seksjon margin-top
40   Gruppe margin-bottom, historikk spacing mellom datogrupper
48   Tom-tilstand padding, eksponering-blokk bottom-padding
64   Stor seksjonsseparasjon (mellom lesemodus-seksjoner)
80   Side-bunn padding, stor vertikal luft
720  Maks innholdsbredde (midtpanel lesemodus)
```

**Regler:**
- Sidebar-metadata: alltid 20px padding
- Dokumentinnhold: alltid 24px padding
- Matrise-rader: 10–12px padding
- Stabel-gap mellom TE/BH-blokker: 1–2px (tight stacking)
- Avstand mellom seksjon og innhold: 16px
- Symmetrisk padding innen kort (alle sider like, unntak: matrise-rader med venstre-kant)

---

## Animation

Rask og funksjonell. Ingen spring/bounce — profesjonelt og kontrollert.

### Varighet

```
micro:   0.15s    Hover, fokus, toggle, pill-valg, stempel-hover
panel:   0.25s    Panel-åpning, sidebar-collapse, tab-bytte
page:    0.7s     Side-innlasting (staggered), modus-bytte
```

### Easing

```
micro:   ease                                    Standard for de fleste interaksjoner
panel:   cubic-bezier(0.16, 1, 0.3, 1)          Raskt ut, mykt inn — for panel/layout-endringer
page:    ease-out                                For fadeUp ved innlasting
```

### Mønstre

**Knapper:** `transition: all 0.1s ease` — raskere enn micro for taktil respons.

**Dropdown inngang:**
```css
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: dropIn 0.15s ease;
```

**Side-innlasting (staggered fadeUp):**
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Hvert element forsinket 50ms etter forrige */
animation: fadeUp 0.7s ease-out;
animation-delay: calc(var(--stagger-index) * 50ms);
```

**Pulserende vente-prikk:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
animation: pulse 2s ease-in-out infinite;
```

**Panel-overgang (sidebar/skjema):**
```css
transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
```

**Autosave-indikator:** Fargeskift (gull → grønn) bruker `transition: background 0.2s ease`.

### Regler

- Micro-interaksjoner (hover, fokus) skal føles umiddelbare — aldri over 0.15s
- Layout-endringer (panel åpner/lukker) bruker panel-easing for å unngå brå hopp
- Aldri animer fargeendring på tekst — kun på bakgrunn og border
- Aldri bruk bounce/spring i profesjonelle kontekster
- `prefers-reduced-motion`: respekter OS-innstilling, fjern alle animasjoner unntatt essensielle tilstandsendringer

---

## Stamps — Hybrid signatur

Stempler er produktets signaturelement. De bruker en hybrid mellom «strammet» og «raffinert»: tynn border med subtil shadow og minimal rotasjon, men med avrundede hjørner.

```css
.stamp {
  font-family: 'Plus Jakarta Sans'; font-weight: 700; font-size: 11px;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 12px; border: 1.5px solid currentColor;
  border-radius: 4px; line-height: 1;
  box-shadow: 1px 1px 0 currentColor;
  transform: rotate(-0.5deg);
}
```

**Varianter:**
- `stamp-red`: Bestridt. Rotasjon -0.5deg. Rød border + shadow + rød bakgrunn.
- `stamp-green`: Subsidiært. Rotasjon -0.5deg. Grønn border + shadow + grønn bakgrunn.
- `stamp-gold`: Venter. Rotasjon -0.3deg. Gull border + shadow + gull bakgrunn.
- `stamp-draft`: Kladd. Dashed border. **Ingen shadow, ingen rotasjon.** Kladd-bakgrunn.
- `stamp-sm`: Kompakt versjon. 9px, 1px border, 1px shadow.
- `stamp-sm` + draft: Kompakt kladd. Ingen shadow.

**Hover:** Alle stempler (unntatt draft) får `box-shadow: 0 1px 4px rgba(0,0,0,0.08)` på hover.

**Hvorfor hybrid:** Stemplene trenger fysisk tilstedeværelse for å fungere som signaturelement — de er «stemplet på dokumentet». Men rotasjonen er minimal (0.5° vs. 1.2° i original) og shadowen er 1px (vs. 2px). De signaliserer «stemplet» uten å rope.

---

## Buttons — Soft Y-translate

Knapper bruker blur-shadow og vertikal bevegelse. De «svever» over flaten og responderer på trykk med vertikal forskyvning.

```css
.btn {
  font-family: 'Plus Jakarta Sans'; font-weight: 700; font-size: 12px;
  text-transform: uppercase; letter-spacing: 0.03em;
  border-radius: 4px; border: 1.5px solid;
  transition: all 100ms ease;
}
.btn:hover  { transform: translateY(-1px); }
.btn:active { transform: translateY(1px); }
```

**Varianter:**
- `btn-primary`: Sort bakgrunn, hvit tekst. Shadow: `0 2px 6px rgba(28,25,23,0.15)`. Hover: shadow øker til 12px blur, løfter 1px. Active: shadow krymper, synker 1px.
- `btn-secondary`: Hvit bakgrunn, sort tekst, subtil border `rgba(28,25,23,0.25)`. Shadow: `0 1px 4px rgba(0,0,0,0.04)`. Hover: border mørkner, shadow øker.
- `btn-danger`: Hvit bakgrunn, rød tekst/border. Shadow: `0 1px 4px rgba(204,48,48,0.08)`.
- `btn-sm`: 10px, 6px/12px padding.

**Kontrast med stempler:** Stempler har hard shadow (1px offset) + rotasjon = «fysisk objekt». Knapper har blur-shadow + Y-translate = «svevende element». To ulike fysiske metaforer for to ulike roller.

---

## TE/BH Dualitet — Metadata-sidebar + prosa

Dokumentpanelet viser begge parters posisjoner i stablet layout:

```
┌──────────┬────────────────────────────────┐
│ TE-meta  │  Argumenttekst (Literata)      │  ← --paper-sub sidebar
│ Partsnavn│                                │  ← r:4 top corners
│ Beløp    │                                │
├──────────┼────────────────────────────────┤  ← --edge (1.5px)
│ BH-meta  │  Argumenttekst i inset-boks   │  ← status-farget sidebar
│ Partsnavn│  + stempel øvre høyre          │  ← r:4 bottom corners
│ Beløp    │                                │
└──────────┴────────────────────────────────┘
```

- TE-sidebar: `--paper-sub`, partsnavn bold (700), assertiv.
- BH-sidebar: `--paper-sub` normal / `--red` ved bestridelse. Partsnavn medium (500).
- BH-argumenttekst alltid i inset-boks (`--paper-inset` + subtle border, r:3).
- Stempel posisjonert absolutt øvre høyre i innholdsområdet.
- TE/BH-blokker har avrundede hjørner: TE r:4 top, BH r:4 bottom.

---

## Subsidiær sone

Dashed venstre-kant i grønn + diamant-markør. **Wrappet hele TE/BH-blokken** på subsidiære spor (Økonomi, Frist), ikke bare en notice øverst.

```css
.sub-zone {
  margin-left: 20px; padding-left: 18px;
  border-left: 2px dashed var(--green-border);
}
.sub-zone::before {
  /* Grønn diamant ved toppen */
  width: 11px; height: 11px;
  background: var(--green); transform: rotate(45deg);
  position: absolute; left: -7px;
}
```

Subsidiær notice: stamp + serif italic tekst. Plassert over TE/BH-blokkene, innenfor stripen.

---

## Draft-seksjon

Dashed border (1.5px) med 4px radius. Merket med:
- KLADD-stempel (dashed, ingen shadow)
- Blyant-ikon + «Internt — ikke synlig for motpart»
- Tekst i Literata italic, draft-ink farge
- Beløp i Plex Mono 700 (hvis relevant)
- Én «Fortsett»-knapp (secondary, sm)

---

## Matrise-rader (venstre panel)

- Normal case (ikke uppercase) — differensierer fra seksjonsoverskrifter
- Aktiv: `--paper` bakgrunn + 3px gull venstre-kant + subtle shadow
- Hover: `--paper-inset` bakgrunn
- Border-radius: 0 venstre (for kant-markøren), 4px høyre
- Innhold: ikon + label, dual bar (subs/prins), gap-boks, handlingsknapp

---

## Dual bars (prinsipal/subsidiær)

To tynne barer per dimensjon:
- Grønn (#034B45) for subsidiært scenario
- Rød (#CC3030) for prinsipalt scenario
- Bar-bakgrunn: `--paper-inset` med 2px radius
- Labels: «subs.» og «prins.» i 9px Plex Mono 600

---

## Tabs

Plus Jakarta Sans 700, 11px, uppercase, letter-spacing 0.04em. Aktiv: gull underline (2px). Hover: `--paper-inset` bakgrunn.
Brukt i høyrepanel: Bestemmelser / Historikk / Vedlegg.

---

## Historikk

Gruppert per dato med gull-separator (--gold-border). TE-markers: sort bakgrunn, hvit tekst, 4px radius. BH-markers: hvit bakgrunn, sort border, 4px radius. Eldre hendelser faded (opacity 0.5), hover bringer tilbake.

---

## Bestemmelser

Kort med `--paper-inset` bakgrunn, subtle border, 4px radius. Hover: green-border. Paragrafnummer i Plex Mono 700, tittel i Jakarta 600, tekst i Literata, notater i grønn italic Literata.

---

## Action bar

Sticky bunn. Paper-bakgrunn, edge topp-border, subtle shadow oppover. Viser alltid saksstatus (subs/prins gap).
- TE: Trekk (danger) + Godta (primary)
- BH: Designet venteboks med pulserende gull-prikk (border-radius: 50%) + «Avventer [partsnavn]» — 4px radius, paperIn bakgrunn.

---

## Kontekstavhengige handlinger per spor

Én knapp per spor, label basert på tilstand:
- Tom → «Besvar» (BH) / «Revider» (TE)
- Kladd → «Fortsett»
- Sendt → «Revider svar»

---

## Case anchor

Midtpanelet har alltid et kompakt saks-anker øverst: `KOE-104` badge (sort bakgrunn, hvit tekst, 2px radius) + tittel i Literata serif. Synlig selv uten venstre panel.

---

## Header

- Gull aksent-stripe (3px) øverst
- Sort NS 8407-plate med gull tekst
- Prosjektnavn i Jakarta 700, partsnavn i Jakarta 500
- TE/BH-toggle: 4px radius, 1.5px border, Plex Mono 700

---

## Samlet eksponering

Boks med `--paper` bakgrunn, subtle border, 4px radius.
- Subsidiært i grønn Plex Mono 700
- Prinsipalt i rød Plex Mono 700

Alternativt: sort bakgrunn (--plate) med grønn/rød mot mørkt — brukes i venstre panel bunn og eksponeringsblokker.

---

## Dark Mode — Kveldsskiftet

OLED-vennlig ren sort (D2). Maksimal kontrast — aksenter brenner mot sort bakgrunn. Platen forblir mørk (ikke invertert).

### Surfaces (dark)

```
--canvas:      #000000    Ren sort. OLED-vennlig.
--paper:       #111110    Kort, innholdsbokser. Knapt lysere enn sort.
--paper-inset: #1A1918    Inset-bokser, argumenttekst-bakgrunn.
--paper-sub:   #141312    TE-sidebar.
--plate:       #000000    Plate er sort — skilles fra paper med border.
```

Elevasjon: canvas (#000) → paper (#111) → paperIn (#1A1). 3–4% lyshet per trinn. Subtilt men synlig ved stabling.

### Ink (dark)

```
--ink:    #F0EDE5    Varm off-white. Ikke ren hvit (#FFF) — for hardt.
--ink-2:  #B8B4A8    Sekundær tekst.
--ink-3:  #787470    Tertiær: metadata, timestamps.
--ink-4:  #484440    Muted: disabled, placeholder.
```

### Aksenter (dark)

Aksenter lysnes for lesbarhet mot sort. Samme hue, høyere luminans.

```
--gold:        #F0C840    Lysere/varmere gull (fra #D4A020).
--gold-bg:     #1E1A0E    Mørk gull-bakgrunn for stempler/soner.
--gold-border: #4A4018    Dempet gull border.

--green:       #50D0B8    Lysnet aqua-grønn (fra #034B45). Må lese mot sort.
--green-bg:    #0E1E1A    Mørk grønn-bakgrunn.
--green-border:#183028    Dempet grønn border.
```

**Viktig:** Grønn endres mest dramatisk. #034B45 er usynlig mot sort — #50D0B8 er nødvendig. Hue beholdes, luminans løftes.

### Semantisk (dark)

```
--red:     #DC2626    Ren signalrød. Lysnet fra #CC3030 for synlighet mot sort.
--red-bg:  #1E1010    Mørk rødlig bakgrunn for bestridt-innhold.
```

BH-sidebar ved bestridelse bruker #DC2626 bakgrunn. Korall (#F86858) forkastet som for difus, #CC3030 for tung mot sort.

Rød argumenttekst i inset-boks: #DC2626 mot #1A1918 (paperIn).

### Draft (dark)

```
--draft:        #909080    Lysere draft-tekst (fra #5A6048).
--draft-bg:     #141410    Mørk draft-bakgrunn.
--draft-border: #2E2E24    Dempet dashed border.
```

### Borders (dark)

```
--edge:        #2A2828    Strukturell border. Lysere enn paper for synlighet.
--rule:        rgba(240,237,229,0.06)    Intern separasjon.
--rule-subtle: rgba(240,237,229,0.03)    Svak separasjon.
```

Borders er viktigere i dark mode fordi shadows er mindre synlige. Edge-fargen (#2A2828) er lysere enn paper (#111110) for å sikre synlig struktur.

### Overlay-nivåer (dark)

Dropdowns, tooltips og modaler trenger overflater lysere enn paper. Tre nivåer over paper:

```
--overlay-1:  #1E1E1C    Dropdown, popover. Første steg over paper.
--overlay-2:  #252523    Nested dropdown, tooltip, hover i overlay.
--overlay-3:  #2C2C2A    Modal overflate (sjelden brukt).
--overlay-bd: rgba(240,237,229,0.10)    Sterkere border enn rule.
```

Fullstendig elevasjonsstige: canvas (#000) → paper (#111) → paperIn (#1A1) → overlay-1 (#1E1) → overlay-2 (#252) → overlay-3 (#2C2). Hvert trinn er 3–4% lysere.

Overlay-shadows er tunge i dark mode for å kompensere for lav synlighet:
```css
--overlay-shadow-sm: 0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3);
--overlay-shadow-lg: 0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
```

### Knapper (dark) — Glow-strategi

Knapper bruker **fargede glow-shadows** i stedet for blur-shadows. Effekten er «lys i mørket» — knappen lyser opp omgivelsene med sin egen farge.

```css
.btn-primary-dark {
  background: var(--gold);
  color: var(--plate);
  border: none;
  box-shadow: 0 0 12px rgba(240,200,64,0.25);
}
.btn-primary-dark:hover {
  box-shadow: 0 0 20px rgba(240,200,64,0.35);
  transform: translateY(-1px);
}
.btn-primary-dark:active {
  box-shadow: 0 0 6px rgba(240,200,64,0.2);
  transform: translateY(1px);
}

.btn-secondary-dark {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--edge);
  box-shadow: 0 0 8px rgba(240,237,229,0.04);
}
.btn-secondary-dark:hover {
  border-color: var(--ink-3);
  box-shadow: 0 0 12px rgba(240,237,229,0.06);
}

.btn-danger-dark {
  background: var(--paper);
  color: var(--red);
  border: 1px solid rgba(204,48,48,0.25);
  box-shadow: 0 0 8px rgba(204,48,48,0.08);
}
.btn-danger-dark:hover {
  border-color: var(--red);
  box-shadow: 0 0 14px rgba(204,48,48,0.15);
}
```

**Kontrast med lys modus:** I lys modus bruker knapper nøytrale blur-shadows + Y-translate. I dark mode bruker de fargede glow-shadows + Y-translate. Samme bevegelsesmønster, annen lys-strategi.

### Stempler (dark)

Stempler bruker de lysnede aksentfargene mot mørke bakgrunner:
- `stamp-red`: #CC3030 tekst/border mot #1E1010 bakgrunn
- `stamp-green`: #50D0B8 tekst/border mot #0E1E1A bakgrunn
- `stamp-gold`: #F0C840 tekst/border mot #1E1A0E bakgrunn
- `stamp-draft`: #909080 tekst, dashed #2E2E24 border mot #141410

Shadow (1px) og rotasjon (-0.5°) beholdes fra lys modus.

### Subsidiær sone (dark)

Dashed venstre-kant i #183028 (greenBorder). Diamant i #50D0B8 (lysnet grønn). Sone-bakgrunn #0E1E1A. Bestemmelse-notater i #50D0B8 italic.

### Eksponering (dark)

Sort bakgrunn (#000) med border (#2A2828). Subsidiært i grønn #50D0B8, prinsipalt i rød #CC3030.

### Designprinsipper for dark mode

1. **Ikke inverter platen.** Sort plate på sort canvas skilles med border, ikke farge.
2. **Aksenter lysnes, ikke metnes.** Høyere luminans, samme hue. Unngå neon.
3. **Borders tar over for shadows.** Shadows er mindre synlige mot sort — borders gjør strukturarbeidet.
4. **Rød forblir #CC3030.** Den fungerer i begge moduser uten justering.
5. **Hvit er aldri #FFFFFF.** Bruk #F0EDE5 (varm off-white) for all tekst.

---

## Skjemamodus (utkast — ikke ferdig bekreftet)

> **NB:** Denne seksjonen dokumenterer retning basert på utforsking, men er ikke endelig bekreftet. Layout og spørsmålsstruktur kan endre seg.

### Layout-endring

Venstre matrise-panel skjules. Konsistens-stripe erstatter det — viser status for alle tre spor horisontalt. Midtpanel inneholder skjema + begrunnelse. Høyrepanel bytter fra «Bestemmelser / Historikk / Vedlegg» til **Bestemmelser som primærfane** (synlig under utfylling).

### Konsistens-stripe

Horisontalt bånd under header. Draft-bakgrunn (#F6F7F2). Viser alle tre spor med:
- Ikon (Pencil hvis påbegynt, Circle hvis tom)
- Spor-label + verdi i Plex Mono 700
- Aktivt spor markert med bakgrunn
- Teller: «2/3 påbegynt»

### Spørsmålsstruktur

Hvert spørsmål er en blokk:
1. **Label** — 11px Jakarta 700 uppercase + paragrafref i Plex Mono (høyrejustert)
2. **Beskrivelse** — 14px Jakarta 400
3. **Svar** — Pills (ja/nei) eller input

### Pill-varianter i skjema

- **Binære valg:** Ja (grønn) / Nei (rød)
- **Treveis:** Godkjent (grønn) / Delvis (gull) / Avvist (rød)
- **Metodevalg:** Nøytrale pills med border, aktiv har mørkere border + paperIn-bakgrunn

### Beløpsinput

Plex Mono 18px 700. Fokus-ring: gull (--control-focus-ring). Suffix «,-» vist som ghost-tekst.

### Oppsummeringsboks

Farget border + bakgrunn som matcher valget:
- Godkjent: grønn border + greenBg
- Delvis: gull border + goldBg
- Avvist: rød border + redBg
Innhold: status-label i uppercase + beløp i Plex Mono.

### Begrunnelse-editor

Plassert **under spørsmålene i midtpanelet**, ikke i høyrepanelet. Literata 16px i textarea. Formateringsverktøylinje (Bold, Italic, List, Undo) i paperIn-bakgrunn. Tegnteller øverst.

### Bestemmelser i høyrepanelet

Synlige mens brukeren fyller ut skjema. Samme kort-format som lesemodus. Notater i grønn italic. Gir kontekstuell hjelp uten modus-bytte.

### Auto-lagring

Indikator i header: grønn prikk + «Lagret» / gull prikk + «Lagrer...». Transition: background 0.2s ease.

### Action bar (skjemamodus)

- Venstre: draft-prikk + «REDIGERER KLADD» + «Autolagret — lukk eller send»
- Høyre: Lukk kladd (secondary) + Send svar (primary)

---

## Tilstander — Tom, Laster, Feil

Alle komponenter har tre tilleggstilstander utover «fylt med data». Mønstrene er konsistente på tvers.

### Tomme tilstander

**Prinsipp:** Aldri bare «Ingen data». Alltid: ikon → tittel → forklaring (Literata) → neste handling.

| Komponent | Ikon | Tittel | Handling |
|---|---|---|---|
| Portefølje uten saker | Inbox (ink4) | «Ingen endringsmeldinger» | Primary: «Ny endringsmelding» |
| Tomt spor (matrise) | Spor-ikon (ink4) | Spor-label nedtonet (ink3) + italic «Ikke besvart» | Full-bredde «Besvar»-knapp |
| Ingen vedlegg | FileText (ink4) | «Ingen vedlegg» | Dashed upload-knapp |
| Ny historikk | TE/BH-marker | «[Part] opprettet saken» | Ingen — bare hendelsen |
| Tom begrunnelse | — | — | Placeholder i ink4 Literata, tegnteller 0 |

**Visuell behandling:**
- Ikon: Lucide, ink4 farge, 24–32px, sentrert
- Tittel: Jakarta 600, 13–15px
- Forklaring: Literata 13–14px, ink3, max-width 320px
- Handling: Primær eller dashed knapp, aldri begge

### Laste-tilstander

**Skeleton-loading:** Shimmer-animasjon (linear-gradient 400px, 1.5s ease-in-out infinite). Skeletonene matcher formen på innholdet de erstatter:

| Komponent | Skeleton-form |
|---|---|
| Matrise-rad | Ikon-rektangel + label-linje + to dataverdier |
| TE/BH-blokk | Sidebar (smal rektangel + stor rektangel) + tre prosa-linjer |
| Bestemmelse-kort | Kort label-linje + tre tekst-linjer med avtagende bredde |

**Skeleton-farger:** Gradient mellom `--paper-inset` og `--paper-sub`. Aldri aksent-farger i skeletons.

**Inline-lasting:** To varianter:
- **Spinner:** Loader2-ikon med `spin 1s linear infinite` + handlings-tekst. Brukes for diskrete handlinger (sender, laster).
- **Pulserende prikk:** Gull, 6px, `pulse 2s ease-in-out infinite`. Brukes for bakgrunnsprosesser (autolagring).

### Feil-tilstander

**Prinsipp:** Feilmeldinger er konkrete, aldri generiske. «Beløpet kan ikke overstige krevd beløp (450 000,-)» — ikke «Ugyldig verdi».

| Komponent | Visuell behandling | Innhold |
|---|---|---|
| Panel lasting feilet | AlertCircle (rød), rød tittel, nøytral forklaring | «Prøv igjen»-knapp (secondary) |
| Skjema validering | Rød input-border + rød focus-ring (18% opacity) + feilmelding under | AlertCircle + konkret feilmelding |
| Sending feilet | Action bar med rød AlertCircle | Beroligende: «Svaret ble lagret lokalt» + Prøv igjen |
| Vedlegg opplasting feilet | Fil-rad med redBg + rød border | Filnavn + årsak + Fjern-knapp |
| Historikk lasting feilet | Sentrert AlertCircle + forklaring | «Prøv igjen»-knapp |
| Ingen tilgang | Lock-ikon (Lucide) i paperIn-container | «Kontakt prosjektansvarlig» — ikke rød (grense, ikke feil) |

**Fargebruk i feil:**
- Feil-border: `1.5px solid --red` eller `1px solid rgba(--red, 0.3)` (subtilere)
- Feil-bakgrunn: `--red-bg` (#FFF0EE) kun på rader/bokser, ikke hele paneler
- Feil-tekst: `--red` for tittel og nøkkelmelding, `--ink-3` for forklaring
- Fokus-ring ved feil: `0 0 0 3px rgba(--red, 0.18)`
- Ingen tilgang bruker **ikke** rød — det er en grense, ikke en feil. Bruker ink3/ink4.

### Ikonbruk i tilstander

Alle tilstands-ikoner er fra **Lucide**. Monokrome, aldri emoji eller illustrasjoner.

| Tilstand | Ikon | Farge | Størrelse |
|---|---|---|---|
| Tom (stor) | Inbox, FileText, Lock | ink4 | 24–32px |
| Tom (inline) | Spor-ikon | ink4 | 13px |
| Laster (spinner) | Loader2 | gold | 14px |
| Laster (prikk) | Sirkel (CSS) | gold | 6px |
| Feil (stor) | AlertCircle | red | 22–28px |
| Feil (inline) | AlertCircle | red | 13px |
| Handling | RefreshCw, Plus, Upload | Arver fra knapp | 14px |

---

## Ikonografi — Lucide React

Kun Lucide React. Monokrome. strokeWidth 2 (default). Ingen andre biblioteker, emoji, eller illustrasjoner.

### Størrelses-skala

```
12px    Inne i knapper (sm), tight pairs
13px    Matrise-rader, inline ved label
14px    Knapper, vedlegg, navigasjon, status — standardstørrelse
16px    Seksjonsheader, actions, navigasjonspiler
22px    Feil-tilstand (stor sentrert)
28px    Tom-tilstand (panel, sentrert)
```

### Ikonkatalog

**Spor:** Scale (Ansvar), Banknote (Vederlag), Clock (Frist)
**Handlinger:** Check (Besvar/Godta), Send, Pencil (Fortsett/Kladd), XSquare (Trekk/Avslått), Plus (Ny), Upload (Last opp), RefreshCw (Prøv igjen)
**Navigasjon:** ChevronLeft (Tilbake), ChevronRight (Åpne), ChevronDown (Dropdown), ArrowRight (Gå til), ExternalLink (Eksternt)
**Status:** AlertCircle (Feil), Info (Tooltip), Lock (Låst), Loader2 (Spinner), Circle (Tom status), Pencil (Kladd-indikator)
**Innhold:** Paperclip (Vedlegg), FileText (Dokument), Inbox (Tom liste)
**Editor:** Bold, Italic, List, ListOrdered, RotateCcw (Angre), RotateCw (Gjenta)

### Container vs. naken

**Med container (paperIn-bakgrunn, 28×28px, 4px radius):**
- Spor-ikoner i oversiktskort (standalone identifikator)
- Tom-tilstand ikoner (sentrert, stor)

**Uten container (naken):**
- Matrise-rader (tight spacing, ikon flyter med label)
- Inne i knapper (ikon er del av knapp-elementet)
- Vedlegg-rader (inline marker)
- Editor-verktøylinje (tight grid)
- Navigasjonspiler (inline)

**Regelen:** Container kun når ikonet står alene som identifikator. I alle komposisjoner med tekst: naken.

Historikk-markører (TE/BH) er ikke ikoner men bokstav-containere med samme visuell logikk (22×22px, plate/paper-bakgrunn, 4px radius).

### Justering

**Standard:** `alignItems: center` — enlinjet innhold, ikon og tekst sentrert.

**Flerlinjet:** `alignItems: flex-start` + `marginTop: 2px` på ikonet — ikon justert mot første tekstlinje.

**Inline i tekst:** `display: inline` + `verticalAlign: -1px` — ikon flyter med teksten (brukes i kladd-merking).

### Ikon-gap

```
4px     Tight pairs (ikon + ikon, f.eks. editor-verktøylinje)
6–8px   Ikon + tekst (standard)
10px    Maksimum — aldri mer
```

### Farge

Ikoner arver farge fra kontekst:
- `ink2` — spor-ikoner i seksjonsheader
- `ink3` — matrise-rader, metadata
- `ink4` — vedlegg, placeholder, disabled
- `red` — feil, bestridt
- `gold` — spinner, venter
- `green` — (sjelden som ikonfarge)
- `#fff` — inne i primærknapper, på mørk bakgrunn

Aldri fler-fargede ikoner. Aldri aksent-farge på dekorative ikoner.

---

## Responsiv — 3 → 2 → 1 panel

### Breakpoints

```
≥1024px     Desktop    3 paneler
600–1023px  Nettbrett  2 paneler
<600px      Mobil      1 kolonne
```

### Desktop (≥1024px)

Tre paneler synlige samtidig:
- **Venstre (220–280px fast):** ID-plate, matrise-rader med spor, samlet eksponering
- **Senter (flex):** Case anchor, seksjonsheader, TE/BH med sidebar-layout, draft, action bar
- **Høyre (220–300px fast):** Tabs — Bestemmelser / Historikk / Vedlegg

Ingen navigasjon nødvendig. Alt er synlig.

### Nettbrett (600–1023px)

To paneler + horisontalt spor-bar:
- **Venstre matrise → spor-bar:** Kollapser til horisontal bar under header. Alle tre spor med ikon + label + status. Aktiv markeres med gull underline. Scrollbar horisontalt.
- **Senter:** Beholder sidebar-layout for TE/BH-blokker.
- **Høyre (200px):** Smalere. Tab-labels forkortes (Best. / Hist. / Vedl.).
- **ID-plate:** Flyttes til header (KOE-104 badge).

### Mobil (<600px)

Én kolonne, alt stablet:
- **Header:** Komprimert. Hamburger-meny for navigasjon. KOE-104 direkte i header.
- **Spor-bar:** Horisontal (som nettbrett) under header.
- **TE/BH-blokker:** Mister sidebar-layout. Partsnavn, beløp, og paragrafref flyttes til header-bar over argumentteksten. Full-bredde innhold.
- **Høyrepanel → inline tabs:** Stables under innholdet som del av scrollbar kolonne. Tabs: Bestemmelser / Historikk / Vedlegg.
- **Action bar:** Sticky bunn, komprimert padding og font-størrelser.

### Hva forsvinner først

1. Venstre sidebar → spor-bar (ved 1024px)
2. TE/BH sidebar-layout → stacked header (ved 600px)
3. Høyrepanel → inline tabs (ved 600px)
4. Tab-labels forkortes (ved 1024px)
5. Aldri: action bar, spor-indikasjon, stempel-synlighet

### Hva aldri forsvinner

- Saksstatus (eksponering) — alltid synlig i action bar
- Spor-navigasjon — alltid tilgjengelig (sidebar eller spor-bar)
- Stempler — beholder størrelse og plassering i alle breakpoints
- TE/BH-dualitet — alltid synlig, bare layouten endres
