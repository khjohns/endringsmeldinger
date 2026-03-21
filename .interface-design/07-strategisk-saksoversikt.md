# 07 — Strategisk Saksoversikt

> Saksoversikten blir et strategiverktøy for prosjektledere under kontraktsmøter og tvisteforhandlinger.

## Nåsituasjon

Saksoversikten (`/[prosjektId]`) har to moduser: tidslinje og tabell. Sidebaren viser aggregerte nøkkeltall (krevd/godkjent/omtvistet, dager) og sporfilter (K/V/F). Detaljpanelet (460px) åpner kontraktsforhold, hendelsesforløp og krav per sak.

**Hva mangler:** Prioritering, risikovurdering, sakskoblinger, gruppering etter kontraktsforhold, og en porteføljeperspektiv som lar prosjektleder svare på «hva brenner?» uten å åpne individuelle saker.

---

## Designprinsipper

1. **Scanning, ikke lesing.** Saksoversikten er kontrollrommet (jf. system.md narrativskille). All informasjon skal kunne avleses ved scanning — aldri kreve klikk for å forstå urgency.
2. **Risiko er en akse, ikke en etikett.** Risiko uttrykkes gjennom eksisterende visuelt vokabular (handlingskant, fargehierarki, posisjon) — ikke som en ny badge eller scoring.
3. **Kontraktsmøte-ready.** Visningen skal kunne projiseres i et møte med motparten. Interne notater og strategiske vurderinger er *ikke* synlige i denne visningen (de lever i saksmappen).

---

## Utvidelse 1: Risikosortert visning

### Konsept

Ny sorteringsmodus i sidebar under «Visning»: **Prioritet** (ved siden av Tidslinje/Tabell). Sorterer saker etter beregnet urgency — ikke kronologisk eller alfabetisk.

### Urgency-beregning (ren domenelogikk)

```
urgency(sak) → number (0–100)
```

Fire faktorer, vektet:

| Faktor | Vekt | Kilde | Logikk |
|--------|------|-------|--------|
| **Preklusjonsfare** | 40 | Varslingsstatus per spor | Dager til preklusjon. <3d = 100, <7d = 80, <14d = 50, >14d = 0. Force majeure-saker: kun frist. |
| **Ubesvarte hendelser** | 25 | `hendelser.filter(!besvart)` | Antall ubesvarte × alder. Eldre ubesvarte = høyere score. |
| **Økonomisk eksponering** | 25 | `cached_sum_krevd - cached_sum_godkjent` | Omtvistet beløp som andel av kontraktssum. |
| **Spormodenhet** | 10 | Status per spor | Saker der grunnlag er godkjent men vederlag/frist er ubesvart = moden for avgjørelse = høyere urgency. |

**Plassering:** `src/lib/domain/urgency.ts` — ren funksjon, tar `SaksoversiktItem` + `ContractSettings` → `number`.

### Visuell representasjon

Urgency vises **ikke** som et tall. I stedet sorterer det rekkefølgen og aktiverer handlingskant:

| Urgency | Handlingskant | Bakgrunn |
|---------|---------------|----------|
| ≥80 (kritisk) | 2px solid score-low | score-low-bg |
| 40–79 (handling kreves) | 2px solid vekt | transparent |
| <40 (venter) | 1px solid wire-strong | transparent |

Dette er *identisk* med Sporkort-mønsteret fra system.md — gjenbruk, ikke ny konvensjon.

### Sidebar-tillegg: Visnings-toggle

Utvider eksisterende `visning-toggle` fra 2 til 3 knapper:

```
[ Tidslinje ] [ Tabell ] [ Prioritet ]
```

Prioritet-modus bruker tabell-layout men sortert etter urgency, med handlingskant per rad.

---

## Utvidelse 2: Porteføljesammendrag

### Konsept

En ny sidebar-seksjon **«Eksponering»** under eksisterende «Nøkkeltall (NOK)». Viser aggregert risikoposisjon — hva som er låst vs. i spill.

### Layout

```
EKSPONERING
────────────────────────────
Omtvistet          4.2M kr    ← vekt-farge, weight 600
├─ Vederlag         3.8M kr
└─ Forsering        0.4M kr

Preklusjonsutsatt   1.8M kr    ← score-low-farge
Saker ≤7 dager         3      ← score-low-farge

────────────────────────────
POSISJON
Godkjenningsgrad      62%     ← bar-visualisering
```

### «Godkjenningsgrad»-bar

En enkel horisontal bar (full bredde av sidebar, 4px høy, radius-sm):

```css
.bar-bakgrunn { background: var(--color-wire); height: 4px; }
.bar-fyllt    { background: var(--color-score-high); width: {grad}%; }
```

Prosentandel = `totalGodkjent / totalKrevd × 100`. Vises som mono-tall til høyre for label.

### Domenelogikk

Funksjonen `beregnePortefoljeeksponering()` i `src/lib/domain/portefolje.ts`:

```typescript
interface Portefoljeeksponering {
  omtvistet: number;           // totalKrevd - totalGodkjent
  omtvistetVederlag: number;
  omtvistetForsering: number;
  preklusjonsutsatt: number;   // sum av omtvistet beløp for saker med preklusjonsfare
  sakerNarPreklusjon: number;  // antall saker med ≤7 dager
  godkjenningsgrad: number;    // 0–1
}
```

---

## Utvidelse 3: Kontraktsforhold-gruppering

### Konsept

I tidslinjevisningen: mulighet for å gruppere saker etter hovedkategori (ENDRING / SVIKT / ANDRE / FORCE_MAJEURE) i stedet for kronologisk.

### Sidebar-kontroll

Ny toggle under «Spor»-seksjonen:

```
GRUPPERING
[ Kronologisk ] [ Kontraktsforhold ]
```

### Visuell struktur (gruppert)

```
ENDRING (5 saker — 3.1M kr omtvistet)
──────────────────────────────────────
  KOE-2024-031  Forsinkede tegninger     ██─────█──
  KOE-2024-055  Omlegging VA-ledninger   ──██──────
  ...

SVIKT (3 saker — 1.8M kr omtvistet)
──────────────────────────────────────
  KOE-2024-047  Grunnforhold akse C5–C8  █──██────█
  ...
```

**Gruppeheader:** Section-label stil (font-data 10px 600 uppercase 0.08em ink-muted). Telling + sum omtvistet høyreforankret (font-data 10px tabular-nums ink-secondary).

Gjenbruker eksisterende `SakRow`-komponent — kun wrapper endres.

---

## Utvidelse 4: Sammenligningsmodus i detaljpanelet

### Konsept

Når to saker er valgt (Shift+klikk), viser panelet en side-ved-side sammenligning: beløp, frister, status, og hendelsesforløp.

### Interaksjon

1. Klikk velger sak (som i dag)
2. Shift+klikk legger til en andre sak
3. Panelet viser sammenligning
4. Escape eller klikk utenfor nullstiller

### Panellayout (sammenligning)

```
┌──────────────────────────────┐
│ SAMMENLIGNING                │
│                              │
│ KOE-047          KOE-031     │  ← panel-id, font-data 10px
│ Grunnforhold     Tegnings-   │  ← panel-tittel, 15px 600
│ akse C5–C8       leveranser  │
├──────────────────────────────┤
│           VEDERLAG           │
│ 2 400 000 kr   850 000 kr   │  ← font-data 13px tabular-nums
│ — godkjent     — godkjent   │
│                              │
│             FRIST            │
│ 45 dager        30 dager    │
│ — godkjent     20d godkjent │
├──────────────────────────────┤
│           STATUS             │
│ Sendt       Under behandling│
│ ●●●○○○         ●●●●●○       │  ← enkel fremdriftsindikator
└──────────────────────────────┘
```

**Verdier:** Krevd i ink, godkjent i score-high under (med skråstrek). Panelbredde: 460px (uendret). Kolonnedeling: 50/50 med wire-separator.

---

## Utvidelse 5: Fristkalender-overlay

### Konsept

En «tidshorisont»-indikator i tidslinjevisningen som markerer fremtidige frister — ikke bare historiske hendelser. Viser hva som *kommer* i tillegg til hva som har skjedd.

### Visuell representasjon

Fremtidige frister vises som *åpne* (dashed-border) noder til høyre for «I DAG» i tidslinjen:

```
──██──█──── │I DAG│ ···◇·····◇···
             ↑                ↑
        nå              frist utløper
```

- **◇ (diamant-node):** Dashed border, same fargekoding som spor (K/V/F). Indikerer forventet hendelse.
- **Prikkede linjer:** stroke-dasharray: 2 3 (som eksisterende digital ink-flow).
- **Tidslinjeaksen forlenges** 20% forbi «I DAG» for å gi plass til frister.

### Fristvarsel-tooltip

Hover på ◇ viser:
```
┌────────────────────────────────┐
│ Spesifisering vederlag         │  ← font-ui 12px 500
│ Frist: 28. mars 2026           │  ← font-data 12px
│ 7 dager igjen                  │  ← score-low hvis ≤7d
│ Hjemmel: §34.2                 │  ← font-data 11px ink-muted
└────────────────────────────────┘
```

Tooltip: felt bg, wire-strong border, sm radius, 12px padding. Ingen skygge (jf. designsystem).

---

## Komponentstruktur

```
src/lib/components/saksoversikt/
├── Saksoversikt.svelte          # Eksisterende — utvides med gruppering
├── OversiktSidebar.svelte       # Eksisterende — utvides med eksponering + visning
├── SakRow.svelte                # Eksisterende — utvides med handlingskant
├── SakPanel.svelte              # Eksisterende — utvides med sammenligning
├── SakGruppe.svelte             # NY — wrapper for kontraktsforhold-gruppering
├── EksponeringSection.svelte    # NY — porteføljesammendrag i sidebar
├── SammenligningPanel.svelte    # NY — side-ved-side sammenligning
├── FristNode.svelte             # NY — fremtidig frist-node (diamant)
└── PrioritetListe.svelte        # NY — urgency-sortert saksliste
```

```
src/lib/domain/
├── urgency.ts                   # NY — urgency-beregning
└── portefolje.ts                # NY — porteføljeeksponering
```

---

## Hva dette IKKE er

- **Ikke et dashboard.** Ingen donut-charts, ingen sparklines, ingen KPI-kort. Informasjon vises som tekst og tall — det er et kontraktsdokument, ikke et BI-verktøy.
- **Ikke et planleggingsverktøy.** Frister vises for awareness, ikke for å flytte eller justere.
- **Ingen nye farger.** Alt bruker eksisterende palett (vekt/score-low/score-high/ink-hierarkiet).
- **Ingen nye UI-mønstre.** Handlingskant, section-labels, tabular-nums, date-dividers — alt eksisterer allerede.
