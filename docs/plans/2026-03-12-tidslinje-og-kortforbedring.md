# Plan: Tidslinjevisning + Kortforbedring for Saksmappen

> Dato: 2026-03-12
> Status: UTKAST — avventer godkjenning

## Bakgrunn

Saksmappen har i dag én visningsmodus: **sporkort** gruppert etter dato. Dette gir rask triage ("hva er tilstanden?") men mangler kronologisk dybdeblikk ("hva skjedde, i hvilken rekkefølge, på tvers av spor?"). En ny tidslinjevisning løser dette uten å sende brukeren ned på spordetalj-nivået.

Samtidig har sporkortene potensial for forbedring — spesielt rundt Status Quo-gapet (krevd vs. anerkjent), future-handlinger, og revisjonssynlighet.

## Overordnet konsept

Saksmappen får en **visningstoggle** i senterpanelet:

```
┌────────────────────────────────────────────────┐
│  [≡ Kort]  [⏐ Tidslinje]    ⊕K  ⊕V  ⊕F      │
│                               (sporfiltre,     │
│                                kun tidslinje)   │
└────────────────────────────────────────────────┘
```

- **Kortvisning** (standard): Dagens sporkort, forbedret.
- **Tidslinjevisning**: Vertikal sentral akse, alle hendelser kronologisk, filtrérbar per spor.

Begge visninger deler sidebar (venstre) og forhåndsvisningspanel (høyre). Toggle påvirker kun senterpanelet.

---

## DEL 1: Forbedring av Kortvisningen

### 1.1 Status Quo Gap-visning i sporkort

**Problem:** Dagens sporkort viser krevd beløp/dager, men ikke *gapet* mellom krevd og anerkjent. Brukeren må gå til sidebar for å se omtvistet beløp.

**Løsning:** Legg til en gap-rad i SporkortData for V- og F-sporene når BH har respondert:

```
┌──────────────────────────────────────────────┐
│ ▎ Vederlagskrav              Delvis godkjent │
│ ▎ → Revidert krav av Veidekke     Rev. 1     │
│ ▎                                            │
│ ▎  Krevd          3 360 000 NOK              │
│ ▎  Anerkjent        890 000 NOK              │
│ ▎  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─             │
│ ▎  Omtvistet      2 470 000 NOK   ← vekt    │
│ ▎                                            │
│ ▎  SVAR PÅ KRAV →                           │
└──────────────────────────────────────────────┘
```

- Krevd/Anerkjent: `ink-secondary`, font-data, 12px
- Dashed separator: `wire`
- Omtvistet: `vekt` (amber), font-data, 13px, font-weight 600
- Kun synlig når `godkjent_belop` eller `godkjent_dager` finnes

### 1.2 "Avventer"-seksjon med Future-handlinger

**Problem:** Handlingsknappen ("Svar →") er koblet fra konteksten — den vises som en subtil lenke i headeren uten å forklare *hva* som forventes.

**Løsning:** Erstatt den løse handlingsknappen med en eksplisitt "Avventer"-rad nederst i sporkortet, visuelt adskilt:

```
│ ▎  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄            │
│ ▎  ◇ Forventet: SVV svarer på EM-005 (Rev 1) │
│ ▎                          SVAR PÅ KRAV →    │
```

- Dashed top-border (`wire`, dashed)
- Diamant-ikon `◇` i `ink-muted`
- Tekst: "Forventet: {BH/TE-navn} {handling} på {dokument} (Rev {n})"
- Handlingslenke: høyrejustert, `ink-muted` → hover `vekt`
- Kun synlig når sporet har status `sendt`, `under_behandling`, eller `delvis_godkjent`

### 1.3 Revisjonsbadge i hendelsesloggen

**Nåværende:** Revisjon vises som "Rev. 1" tekst i `event-rev`-elementet, høyrejustert.

**Forbedring:** Gjør revisjonsbadgen tydeligere med en visuell markør:

- Rev. 0: ingen badge (implisitt — opprinnelig versjon)
- Rev. 1+: `Rev. {n}` i en subtil outline-badge: `border: 1px solid wire`, `border-radius: 2px`, padding `1px 4px`, font-data 9px
- Badge-farge følger sporets farge (V=vekt-dim, F=score-low-dim, K=ink-muted) for å koble revisjon til spor visuelt

### 1.4 Entanglement i hendelsesloggen

**Konsept:** Når bruker klikker på en BH-respons i hendelsesloggen, lyser den korresponderende TE-hendelsen (og omvendt) opp. Viser krav-svar-par.

**Implementering:**
- Hver hendelse har en `respondert_versjon` (i event.data) som kobler respons til kravets revisjonsnummer
- Klikk/hover på respons-hendelse → highlight hendelsen den svarer på (matching på spor + revisjon)
- Visuelt: entangled hendelse får `wire-focus` border-left og subtil `felt-hover` bakgrunn
- Fungerer begge veier: klikk på TE-krav → highlight BH-svar for den revisjonen

---

## DEL 2: Tidslinjevisningen

### 2.1 Visningstoggle

**Plassering:** Øverst i `main-content`, sticky. Samme rad som eventuell seksjontittel.

```svelte
<div class="visning-toggle">
  <button class:active={visning === 'kort'}>≡ Kort</button>
  <button class:active={visning === 'tidslinje'}>⏐ Tidslinje</button>

  {#if visning === 'tidslinje'}
    <div class="sporfiltre">
      <button class:active={filter.K} class="filter-K">K</button>
      <button class:active={filter.V} class="filter-V">V</button>
      <button class:active={filter.F} class="filter-F">F</button>
    </div>
  {/if}
</div>
```

**Styling:**
- Toggle-knapper: `felt` bakgrunn, `wire` border, aktiv = `felt-raised` + `wire-strong` border
- Font-data, 10px, uppercase, tracking 0.06em
- Sporfiltre: pills med sporfarger. K=`ink-muted`, V=`vekt`, F=`score-low`. Inaktiv = outline, aktiv = filled.
- Hele raden: sticky top, `canvas` bakgrunn, border-bottom `wire`

**State:** `visning: 'kort' | 'tidslinje'` og `filter: { K: boolean, V: boolean, F: boolean }` (alle true som default). Lagres i `localStorage` per sak.

### 2.2 Tidslinjearkitektur — Vertikal Sentral Akse

Tidslinjen viser **alle hendelser** i saken kronologisk langs en vertikal akse. Nyeste nederst (naturlig leseretning: fortiden er opp, fremtiden er ned).

```
         DATO
          │
    F ────┼──── V          ← Frist venstre, Vederlag høyre
          │
          K                ← Kontraktsforhold sentrert (ingen bar)
          │
         DATO
          │
    F ────┼──── V
          │
       ═══════════
        I  D A G
       ═══════════
          │
   ◇F ┄┄┄┼┄┄┄ ◇V          ← Future nodes (stiplet)
          │
```

### 2.3 Hendelsesnoder

Hver hendelse representeres av en **node** på den sentrale aksen, med en **bar** og **info-blokk** ut til relevant side.

#### Node (senter-element)

- Firkantet, 24×24px, `border-radius: 2px`
- Innhold: spor-bokstav (K, V, F) i font-data 10px bold
- **TE-hendelser:** Solid `border: 1px solid ink-muted`, `bg: canvas`
- **BH-hendelser:** `border: 1px dashed ink-muted`, `bg: canvas`
- Aktiv/fokusert: `border-color: ink-focus`, `bg: felt-raised`, `scale: 1.1`
- Entangled (hover-kobling): `box-shadow: 0 0 0 2px canvas, 0 0 0 4px ink-secondary` (dobbel ring)

#### Bar (horisontal stolpe)

Representerer *kvantitet* — beløp for V, dager for F. Ingen bar for K.

**Vederlagsbar (høyre side):**
- Bredde: proporsjonal med beløp. Skalafunksjon: `min(max((belop / maksBelop) * 180, 4), 200)` der `maksBelop` er høyeste krevde beløp i saken.
- Høyde: 14px
- TE: solid fill med `vekt` (amber)
- BH: transparent, `border: 1px dashed vekt`
- Border-radius: `0 2px 2px 0` (avrundet kun ytterst)

**Fristbar (venstre side):**
- Bredde: proporsjonal med dager. Skalafunksjon: `min(max((dager / maksDager) * 120, 4), 150)` der `maksDager` er høyeste krevde dager i saken.
- Høyde: 14px
- TE: solid fill med `score-low` (rose)
- BH: transparent, `border: 1px dashed score-low`
- Border-radius: `2px 0 0 2px` (avrundet kun ytterst)

**Viktig:** `maksBelop`/`maksDager` beregnes per sak, ikke globalt. Dette gir relativ skala innenfor sakens kontekst.

**Null-verdier (avvist):** Bar har minimumsbredde 4px, dashed border, `ink-ghost` farge. Tekst viser "Avvist (0)".

#### Info-blokk (tekst ved siden av bar)

Plasseres utenfor baren, lengre ut fra sentrum.

```
[Aktør-badge]
[Verdi]              ← font-data, 11px. "3 360 000 NOK" eller "20 DAGER"
[Dokument (Rev N)]   ← font-ui, 10px, ink-muted
```

**Aktør-badge:**
- TE: Solid bakgrunn `ink-muted`, tekst `canvas`. Firmanavn i font-data 8px.
- BH: Outline `border: 1px solid ink-muted`, tekst `ink-muted`. Firmanavn i font-data 8px.
- Badge padding: `1px 4px`, border-radius `2px`

**Revisjonsbadge:**
- Rev. 0: Vises IKKE (implisitt)
- Rev. 1+: Vises i parentes etter dokumentnavn: "EM-005 (Rev 1)"
- Styling: del av teksten, `ink-muted`, font-ui 10px

### 2.4 Datogruppering

Hendelser grupperes visuelt med datolabels:

```
          ·
      03.02.26         ← font-data, 9px, ink-muted, bg: canvas (overlapper aksen)
          │
    F ────┼──── V
          │
```

- Dato: sentrert over aksen, `canvas`-bakgrunn som padding for å "bryte" akselinjen
- Format: `DD.MM.YY` — kompakt, data-font
- Hendelser med samme dato grupperes under samme datolabel

### 2.5 "I DAG"-horisonten

Den horisontale markøren som skiller historikk (fakta) fra handlingssone (forventning).

```
  ═══════════════════════════════════════════
                   I  D A G
  ═══════════════════════════════════════════
```

- Full bredde av tidslinjeområdet
- Øvre linje: 1px solid `wire-focus`
- Nedre: 1px dashed `wire-focus`
- Label: "I DAG" sentrert, font-data 9px bold, `ink-muted`, `canvas`-bakgrunn
- Spacing: 16px margin over og under

**Ghost Node (opprett ny hendelse):**
- Plassert til høyre for "I DAG"-markøren
- 24×24px, `border: 1px dashed ink-muted`, `bg: canvas`
- Innhold: `+`-ikon, 12px
- Hover: `border-color: ink-focus`, ikon `ink-focus`
- Klikk: åpner dialog/meny for å velge sportype og opprette ny hendelse uten forhistorie

### 2.6 Future Nodes (Handlingssonen)

Under "I DAG" vises hendelser systemet *forventer* — ubesvarte krav som projiseres som forventede svar.

**Logikk:** For hvert spor med status `sendt`, `under_behandling`, eller `delvis_godkjent`, generer en future node der *motparten* forventes å handle.

**Visuelt:**
- Identisk layout som historiske noder (bar + info-blokk), men:
  - Node: `border: 1px dashed {sporfarge}`, tekst i sporfarge, `bg: canvas`
  - Bar: `border: 1px dashed {sporfarge}`, transparent fill, fast bredde 48px (ikke proporsjonal — vi vet ikke verdien ennå)
  - Info-tekst: "FORVENTET SVAR" i font-data 10px, `ink-muted`
  - Under: dokumentreferanse "på EM-005 (Rev 1)" i font-ui 9px, `ink-ghost`
- Opacity: 0.8, hover → 1.0
- Ingen datoakse i handlingssonen — kun sekvensiell rekkefølge

**Entanglement med historikk:**
- Hover/klikk på future node → highlight den korresponderende opprinnelige noden i historikken
- Hover/klikk på ubesvart historisk node → highlight dens future node
- Visuelt: begge noder får `entangled-glow` (dobbel ring-shadow) og `scale: 1.05`
- Forbindelseslinje: vurder en subtil vertikal stiplet linje mellom de to nodene langs aksen (animert `stroke-dashoffset` for pulseffekt). Alternativt: kun glow uten linje for renere uttrykk. Prøv begge, velg den som føles minst støyende.

### 2.7 Krav-Svar-kobling (Entanglement i historikken)

**Konsept:** Klikk på en BH-respons-node lyser opp TE-kravet den svarer på (og omvendt). Kobler visuelt krav–svar-par på tvers av tid.

**Koblingsnøkkel:** Spor + revisjonsnummer. Eksempel:
- TE sender vederlagskrav Rev. 1 → node ev-6a
- BH svarer på vederlag Rev. 1 → node ev-5a (respondert_versjon: 1)
- Klikk på ev-5a → highlight ev-6a (og omvendt)

**State:**
```typescript
let entangledIds = $state<Set<string>>(new Set());

function handleNodeInteraction(nodeId: string) {
  // Finn koblede noder via spor + revisjon
  const linked = findLinkedNodes(nodeId, allEvents);
  entangledIds = new Set([nodeId, ...linked]);
}
```

**Visuelt:**
- Entangled noder: `entangled-glow` class (dobbel ring)
- Entangled info-blokk: tekst skifter fra `ink-secondary` til `ink-focus`
- Entangled bar: økt opacity, lysere farge
- Transition: 150ms ease-out for alle entanglement-effekter

### 2.8 Interaksjon med forhåndsvisningspanel

Tidslinjen deler forhåndsvisningspanelet med kortvisningen:

- Klikk på historisk node → `onFocusEvent(event)` → panelet åpner med hendelsens detaljer
- Klikk på future node → panelet viser "HANDLING PÅKREVD"-visning med lenke til spordetalj for å opprette svar
- Klikk på ghost node → meny/dialog (panelet brukes ikke)

### 2.9 Scroll-oppførsel

- Tidslinjen scroller vertikalt i senterpanelet
- Ved innlasting: auto-scroll til "I DAG"-markøren (`scrollIntoView({ behavior: 'smooth' })`)
- Historikken er over, handlingssonen er under — brukeren scroller ned for å se forventede handlinger

### 2.10 Sporfiltre

Toggle-knapper (K/V/F) i verktøylinjen filtrerer hvilke noder som vises.

**Oppførsel:**
- Alle aktive som default
- Klikk på aktiv filter → deaktiverer den (skjuler noder av den typen)
- Klikk på inaktiv filter → aktiverer den
- Minst ett filter må være aktivt (siste aktive kan ikke deaktiveres)
- Filtrering skjuler noder + barer, men datodividere forblir hvis de har minst én synlig node
- Future nodes filtreres med samme logikk

**Styling:**
- Aktiv K: `bg: ink-muted/0.15`, `border: 1px solid ink-muted`, tekst `ink`
- Aktiv V: `bg: vekt-bg`, `border: 1px solid vekt-dim`, tekst `vekt`
- Aktiv F: `bg: score-low-bg`, `border: 1px solid score-low`, tekst `score-low`
- Inaktiv: `bg: transparent`, `border: 1px solid wire`, tekst `ink-ghost`
- Radius: 2px, font-data 10px bold, padding 2px 8px

---

## DEL 3: Sidebar-forbedringer (Ledger-inspirert)

### 3.1 Gap-visning i sidebar

Inspirasjonen fra mockens Ledger-panel: sidebaren viser allerede nøkkeltall, men strukturen kan forbedres.

**Nåværende:**
```
Nøkkeltall
  Krevd        4 250 000 NOK
  Godkjent       890 000 NOK
  Omtvistet    3 360 000 NOK
```

**Forbedret (Ledger-struktur):**
```
┌ VEDERLAG ─────────────────────────┐
│ Krevd (Veidekke)   4 250 000 NOK │
│ Anerkjent (SVV)    −  890 000 NOK│
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│ OMTVISTET GAP      3 360 000 NOK │  ← vekt, font-data, 16px bold
│                                   │
│ SVAR PÅ KRAV →                   │  ← ink-muted → hover vekt
└───────────────────────────────────┘

┌ FRIST ────────────────────────────┐
│ Krevd (Veidekke)        24 DAGER │
│ Anerkjent (SVV)        − 4 DAGER │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│ OMTVISTET GAP           20 DAGER │  ← score-low, font-data, 16px bold
│                                   │
│ SVAR PÅ FRISTKRAV →              │
└───────────────────────────────────┘
```

- Sporidentifisering via 2px venstre border i sporfarge (V=vekt, F=score-low)
- Section label: font-data, 10px, uppercase, tracking 0.08em, `ink-muted`
- Tall: font-data, 12px, `ink-secondary`. Minus-prefix med `ink-muted`
- Separator: dashed border, `wire`
- Gap-verdi: font-data, 16px, bold, sporfarge (vekt for V, score-low for F)
- Handlingslenke: font-data, 10px, `ink-muted`, hover → sporfarge, med `→` etter
- Klikk på handlingslenke → fokuserer tilhørende future node (i tidslinjevisning) eller åpner spordetalj (i kortvisning)

---

## DEL 4: Komponentstruktur

### Nye komponenter

```
src/lib/components/saksmappe/
├── VisningstToggle.svelte        ← Toggle kort/tidslinje + sporfiltre
├── KronologiskTidslinje.svelte   ← Hele tidslinjevisningen
├── TidslinjeNode.svelte          ← Enkeltnode med bar + info
├── TidslinjeDato.svelte          ← Datolabel
├── TidslinjeHorisont.svelte      ← "I DAG"-markør + ghost node
├── FutureNode.svelte             ← Forventet handling-node
├── StatusQuoGap.svelte           ← Gap-visning (brukes i sidebar + sporkort)
└── AvventerRad.svelte            ← "Forventet: ..."-rad for sporkort
```

### Endrede komponenter

```
+page.svelte         ← Legge til visningstoggle-state, betinget rendering
Timeline.svelte      ← Rename til KortVisning.svelte (tydeligere), eller behold og la +page velge
Sporkort.svelte      ← Legge til gap-visning + avventer-rad
SporkortData.svelte  ← Inkludere StatusQuoGap
Sidebar.svelte       ← Omstrukturere nøkkeltall til Ledger-format
HendelsesLogg.svelte ← Legge til entanglement-interaksjon
```

### Delt state

```typescript
// I +page.svelte eller en context
let visning = $state<'kort' | 'tidslinje'>('kort');
let sporFilter = $state({ K: true, V: true, F: true });
let entangledIds = $state<Set<string>>(new Set());
let activeNodeId = $state<string | null>(null);
```

---

## DEL 5: Implementeringsrekkefølge

### Fase A: Kortforbedringer (kan leveres uavhengig)
1. `StatusQuoGap` — gap-visning komponent
2. Integrere i `SporkortData` (V + F spor)
3. `AvventerRad` — forventet handling-rad i sporkort
4. Revisjonsbadge-forbedring i `HendelsesLogg`
5. Entanglement i hendelsesloggen (krav-svar-kobling)
6. Sidebar Ledger-omstrukturering

### Fase B: Tidslinjeinfrastruktur
7. `VisningstToggle` med state-håndtering
8. `KronologiskTidslinje` — container med sentral akse
9. `TidslinjeDato` — datogruppering
10. `TidslinjeNode` — node + bar + info-blokk med TE/BH-polaritet

### Fase C: Tidslinjefunksjoner
11. `TidslinjeHorisont` — "I DAG"-markør
12. `FutureNode` — forventede handlinger under horisonten
13. Entanglement mellom historikk og future nodes
14. Krav-svar-entanglement i historikken
15. Sporfiltre (K/V/F toggle)

### Fase D: Polish
16. Scroll-oppførsel (auto-scroll til I DAG)
17. Tastaturnavigasjon (piltaster mellom noder)
18. Forhåndsvisningspanel-integrasjon for begge visninger
19. localStorage-persistering av visningsvalg
20. Responsiv tilpasning (mobil: tidslinje → vertikal liste uten barer)

---

## Designtokens som trengs (nye)

```css
/* Sporfarger for tidslinjenoder — bruker eksisterende tokens */
--color-spor-K: var(--color-ink-muted);       /* Kontraktsforhold: nøytral */
--color-spor-V: var(--color-vekt);            /* Vederlag: amber */
--color-spor-F: var(--color-score-low);       /* Frist: rose */

/* Entanglement-glow */
--entangled-glow: 0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-ink-secondary);

/* Tidslinje-akse */
--color-akse: var(--color-wire);
```

Ingen nye primitive farger — alt bygger på eksisterende token-arkitektur.
