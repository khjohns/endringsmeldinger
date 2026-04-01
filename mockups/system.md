# Kontraktsbordet — Design System

## Direction

**Metaphor:** Riggkontoret — der kontraktsadministratoren faktisk jobber. Ikke advokatkontoret (for formelt), ikke byggeplassen (for rått). Pulten med kontraktsdokumenter, tegninger på veggen, sikkerhetsskilt synlig gjennom vinduet.

**Feel:** Funksjonelt og presist. Juridisk tyngde med byggeplassens direkthet. Varmt men bestemt. Rolig nok for 8 timers daglig bruk, tydelig nok for rask scanning mellom møter.

**Signature:** Dual-posisjonsvisningen — begge parters argumenter side om side i metadata-sidebar + prosa-layout, strukturert av kontraktsbestemmelser, med stempler som statusmarkører og subsidiær forgreining som visuell sone.

---

## Typography — 3 fonter, ingen flere

| Font | Rolle | Hvorfor |
|---|---|---|
| **Space Grotesk** | All UI: overskrifter, labels, knapper, tabs, navigasjon | Geometrisk, direkte — byggebransje uten å være industriell |
| **Newsreader** | All prosa: argumenttekst, bestemmelser, notater, begrunnelser | Serif med juridisk autoritet, behagelig over lange tekster |
| **JetBrains Mono** | All data: tall, beløp, datoer, IDer, paragrafreferanser | Tabular-nums, signaliserer «dette er data» |

Body-font er Space Grotesk. Ingen Inter, ingen fallback-font gjør designarbeid.

**Hierarki:**
- Seksjonsoverskrift: 20px Space Grotesk 700 uppercase — kun i midtpanelet
- Matrise-label: 13px Space Grotesk 600 normal case — differensiert fra seksjoner
- Partsnavn TE: 12px Space Grotesk 700 — assertiv, den som fremsetter krav
- Partsnavn BH: 12px Space Grotesk 500 — vurderende, responderende
- Argumenttekst: 17px Newsreader 400 lh 1.75 — lesbar, romslig
- Data/tall: JetBrains Mono 600-700 — alltid tabular-nums

---

## Surfaces

```
--canvas:      #F8F7F4    Varm papir-hvit. Alt lever på dette.
--paper:       #FFFFFF    Dokumenter, kort, innholdsbokser.
--paper-inset: #F6F5F1    Inset-bokser for argumenttekst, metadata-sidebarer.
--paper-sub:   #FAFAF7    TE-sidebar i dokumentpanelet (lysere enn inset).
--plate:       #1C1917    Mørk identifikasjonsplate. Signatur, ikke elevasjon.
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

## Accent

```
--ochre:        #B8860B    Dyp bygge-oker. Ikke safety-gul, ikke dempet amber.
--ochre-bg:     #FBF6EA    Bakgrunn for subsidiær sone, ochre-kontekst.
--ochre-border: #DDD0A0    Border for ochre-elementer.
```

Oker brukes til: aktiv matrise-rad (venstre-kant), seksjonsoverskrift-underline, subsidiær sone, tabs aktiv-state, eksponerings-tall (subsidiært scenario), statusstempel «Venter».

Kun én aksent. Oker gjør alt fargearbeid utenom semantisk.

---

## Semantic

```
--red:     #991B1B    Bestridt, avslått, prinsipal eksponering, fare
--red-bg:  #FDF2F2    Bakgrunn for bestridt-seksjon
--green:   #166534    Godkjent (brukes sparsomt)
```

---

## Draft / Internt

```
--draft:        #6B5E2F    Kladd-tekst, internt-merker
--draft-bg:     #FDFBF0    Kladd-seksjon bakgrunn
--draft-border: #DBD2A8    Stiplet kladd-ramme
```

Draft-seksjoner merkes alltid: «Internt — ikke synlig for motpart».

---

## Depth — Fysiske objekter på flate overflater

Én strategi, to uttrykk:

1. **Borders for struktur.** 2px `--edge` mellom paneler, mellom TE/BH-seksjoner (topp). 1px `--rule` / `--rule-subtle` for intern separasjon.
2. **Box-shadow for interaktive gjenstander.** Knapper og stempler har shadow + translate-on-hover. De er fysiske objekter du kan «trykke ned» på et flatt bord.

Ingen shadows på paneler, kort eller overflater. Aldri.

```
--edge:        2px solid #1C1917
--rule:        1px solid rgba(28,25,23,0.12)
--rule-subtle: 1px solid rgba(28,25,23,0.07)
```

---

## Border Radius

**Null.** Overalt. Kontraktsbordet er firkantet. Dokumenter er firkantede. Stempler er firkantede. Knapper er firkantede. Ingen unntak.

---

## Spacing — 4px grid

```
xs:      4px     Mikro: ikon-gap
sm:      8px     Tett: mellom relaterte elementer
md:      12px    Standard: padding i kompakte elementer
lg:      16px    Komfortabel: mellom seksjoner i panel
xl:      20px    Panel-padding: sidebar, kontekstpanel
xxl:     24px    Innholdspadding: dokumenter, argumenttekst
section: 32px    Mellom hovedseksjoner
```

Sidebar-metadata: 20px padding. Dokumentinnhold: 24px padding. Alltid.

---

## Stamps — Produktets signatur

Dobbel border + box-shadow + svak rotasjon. Space Grotesk 700 uppercase.

```css
.stamp {
  font-family: 'Space Grotesk'; font-weight: 700; font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 4px 12px; border: 2px solid currentColor;
  box-shadow: 2px 2px 0 currentColor;
}
```

**Varianter:**
- `stamp-red`: Bestridt. Rotasjon -1.2deg. Rødbakgrunn.
- `stamp-ochre`: Subsidiært / Venter. Rotasjon -0.6deg. Okerbakgrunn.
- `stamp-draft`: Kladd. Dashed border. Ingen shadow. Rotasjon -0.8deg.
- `stamp-sm`: Kompakt versjon for matrise-rader. 9px, 1.5px border.
- `stamp-flat`: Ingen rotasjon, ingen shadow. For ID-platen.

---

## Buttons — Taktile med shadow

```css
.btn {
  font-family: 'Space Grotesk'; font-weight: 700; font-size: 12px;
  text-transform: uppercase; letter-spacing: 0.04em;
  border-radius: 0; border: 2px solid;
  box-shadow: 3px 3px 0 rgba(color, 0.2);
}
.btn:hover  { transform: translate(1px, 1px); box-shadow: 2px 2px; }
.btn:active { transform: translate(2px, 2px); box-shadow: none; }
```

**Varianter:**
- `btn-primary`: Plate-bakgrunn, hvit tekst. For primærhandlinger.
- `btn-secondary`: Hvit bakgrunn, ink border. For sekundære handlinger.
- `btn-danger`: Hvit bakgrunn, rød border. For destruktive handlinger.
- `btn-sm`: 10px, 6px/12px padding. For inline-handlinger i matrise-rader.

---

## TE/BH Dualitet — Metadata-sidebar + prosa

Dokumentpanelet viser begge parters posisjoner i stablet layout:

```
┌──────────┬────────────────────────────────┐
│ TE-meta  │  Argumenttekst (Newsreader)    │  ← --paper-sub sidebar
│ Partsnavn│                                │
│ Beløp    │                                │
├──────────┼────────────────────────────────┤  ← --edge (topp-kant)
│ BH-meta  │  Argumenttekst i inset-boks   │  ← status-farget sidebar
│ Partsnavn│  + stempel øvre høyre          │
│ Beløp    │                                │
└──────────┴────────────────────────────────┘
```

- TE-sidebar: `--paper-sub`, partsnavn bold (700), assertiv.
- BH-sidebar: `--paper-sub` normal / `--red` ved bestridelse. Partsnavn medium (500).
- BH-argumenttekst alltid i inset-boks (`--paper-inset` + subtle border).
- Stempel posisjonert absolutt øvre høyre i innholdsområdet.

---

## Subsidiær sone

Stiplet venstre-kant i oker + diamant-markør:

```css
.sub-zone {
  margin-left: 24px; padding-left: 20px;
  border-left: 2px dashed var(--ochre-border);
}
.sub-zone::before {
  /* Oker diamant ved toppen */
  width: 10px; height: 10px;
  background: var(--ochre); transform: rotate(45deg);
}
```

Subsidiær notice: stamp + serif-tekst. Ingen ikon — stempelet kommuniserer.

---

## Draft-seksjon

Full dashed border (ikke borderTop:none-hack). Markert med:
- KLADD-stempel (dashed)
- Blyant-ikon + «Internt — ikke synlig for motpart»
- Tekst i Newsreader italic, draft-ink farge
- Én «Fortsett»-knapp

---

## Matrise-rader (venstre panel)

- Normal case (ikke uppercase) — differensierer fra seksjonsoverskrifter
- Aktiv: `--paper` bakgrunn + 3px oker venstre-kant
- Hover: `--paper-inset` bakgrunn
- Innhold: ikon + label, dual bar (subs/prins), gap-boks, handlingsknapp
- Handlingsknapp er kontekstavhengig: «Besvar» / «Fortsett» / «Revider svar»

---

## Dual bars (prinsipal/subsidiær)

To tynne barer per dimensjon:
- Oker for subsidiært scenario
- Rød for prinsipalt scenario
- Labels: «subs.» og «prins.» i 9px mono

---

## Tabs

Space Grotesk 700, 11px, uppercase. Aktiv: oker underline. Hover: `--paper-inset` bakgrunn.
Brukt i høyrepanel: Bestemmelser / Historikk / Vedlegg.

---

## Historikk

Gruppert per dato med oker-separator. TE-markers fylt plate-farge, BH-markers åpen med plate-border. Eldre hendelser faded (opacity 0.5), hover bringer tilbake.

---

## Bestemmelser

Kort med `--paper-inset` bakgrunn, subtle border. Hover: ochre-border. Paragrafnummer i mono 700, tekst i serif, notater i oker italic.

---

## Action bar

Sticky bunn. Paper-bakgrunn, edge topp-border. Viser alltid saksstatus (subs/prins gap).
- TE: Trekk (danger) + Godta (primary)
- BH: Designet venteboks med pulserende oker-prikk + «Avventer [partsnavn]»

---

## Kontekstavhengige handlinger per spor

Én knapp per spor, label basert på tilstand:
- Tom → «Besvar» (BH) / «Revider» (TE)
- Kladd → «Fortsett»
- Sendt → «Revider svar»

Ingen «Ny revisjon» som separat konsept.

---

## Case anchor

Midtpanelet har alltid et kompakt saks-anker øverst: `KOE-104` badge + tittel i serif. Synlig selv uten venstre panel (skjemamodus).
