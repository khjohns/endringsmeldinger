# Fase 2: Saksliste + Forhandlingsbordet — Implementeringsplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Minimal saksliste + landingsside for én KOE-sak med sporkort langs en kronologisk tidslinje, sidebar med frister/varsling, og navigasjon til spordetalj.

**Architecture:** TanStack Query for server state (fetchCaseList, fetchCaseContext). Sakslisten er en flat tabell. Forhandlingsbordet er to-kolonne layout (260px sidebar + flex tidslinje) med kompakte sporkort. All data er read-only — mutasjoner kommer i Fase 3-5.

**Tech Stack:** SvelteKit 2 (SPA), Svelte 5 runes, TanStack Query Svelte, eksisterende API-klient + typer, Fase 1 primitiver (Badge, Button, Tooltip, ProgressBar, SectionHeading)

---

## Designreferanser

Alle UI-beslutninger er forankret i disse dokumentene — **les dem ved implementering:**

| Dokument | Innhold | Brukes i |
|----------|---------|----------|
| `docs/design/koe-forhandlingsbord.md` | Komplett spesifikasjon: layout, sporkort, tidslinje, sidebar, tokens, tastatur, responsive, mockups | Task 3-9 |
| `docs/design/koe-mock.html` | HTML-mockup — visuell referanse for pixel-nivå styling, farger, spacing | Alle UI-tasks — åpne i browser og sammenlign |
| `docs/design/system.md` | Analysebordet token-system (farger, typografi, spacing, radius) | Alle styling |
| `.interface-design/system.md` | Prosjektets etablerte designsystem-patterns fra Fase 1 | Konsistens med primitiver |

**Viktig:** `koe-mock.html` er den visuelle sannheten. Åpne den i browser og bruk den som pixel-referanse ved styling av sporkort, sidebar, tidslinje.

---

## Svelte 5 features å utnytte

Konsulter oppdatert Svelte 5-dokumentasjon for disse features (jf. metaplan §3.1):

| Feature | Bruk i Fase 2 |
|---------|---------------|
| `$derived.by()` | Komplekse beregninger i Sporkort (tilstandslogikk, varsling) |
| `createContext` (5.40) | TanStack Query client + brukerrolle-kontekst |
| `transition:slide` | Hendelseslogg ekspandering |
| `use:` actions | Click-outside for hendelseslogg, focus-trap for tastaturnavigasjon |
| `class:` direktiver | Boolean tilstandsklasser på sporkort (aktiv, kritisk, godkjent) |
| Generics i komponenter | Sporkort-props kan typesikres per sportype |

---

## Kvalitetssikring — skills som SKAL brukes under implementering

| Checkpoint | Skill | Når |
|------------|-------|-----|
| Før koding starter | `/interface-design:init` | Etabler designretning fra mock.html + system.md. Sikrer at alle nye komponenter følger etablert system |
| Etter Task 2 (Saksliste) | `simplify` | Review saksliste-kode for gjenbruk og kvalitet |
| Etter Task 5 (Sporkort) | `superpowers:requesting-code-review` | Sporkort er mest komplekse komponenten — review mot designdoc |
| Etter Task 6 (Hendelseslogg) | `simplify` | Review hendelseslogg for over-engineering |
| Etter Task 7 (Visuell verifisering) | `/interface-design:critique` | Sammenlign resultat mot koe-mock.html, identifiser avvik |
| Etter Task 10 (Slutt) | `/interface-design:audit` | Full audit mot designsystemet |

**NB for simplify/code-review:** Vær obs på nye Svelte 5 features. Ikke foreslå Svelte 4-mønstre. Sjekk at `$derived.by()`, `class:`, `transition:`, og `use:` actions brukes der det er naturlig.

---

## Forutsetninger

- Fase 1 ferdig (16 primitiver, alle tester grønne)
- API-endepunkter eksisterer: `GET /api/cases`, `GET /api/cases/{sak_id}/context`
- Backend returnerer `CaseListResponse` og `CaseContextResponse` (se `src/lib/types/api.ts`)
- Ingen autentisering ennå (Fase 6) — rolle settes via localStorage (`koe-user-role`)

## Filstruktur (nye/endrede filer)

```
src/lib/
├── queries/                           # NY: TanStack Query wrappers
│   ├── caseList.ts                    # createQuery for saksliste
│   └── caseContext.ts                 # createQuery for sak-kontekst
├── components/
│   ├── case-list/                     # NY: Saksliste-komponenter
│   │   ├── CaseListTable.svelte       # Tabell med sortering
│   │   └── CaseListRow.svelte         # Enkelt rad
│   └── forhandlingsbord/              # NY: Forhandlingsbord-komponenter
│       ├── Sidebar.svelte             # Sakskontekst + Frister + Varsling
│       ├── Timeline.svelte            # Tidslinjespine + sporkort
│       ├── Sporkort.svelte            # Kompakt sporkort (2-3 linjer)
│       ├── SporkortHeader.svelte      # Header-linje: spornavn, status, varsling, handling
│       ├── SporkortData.svelte        # Data-linje: nøkkeldata, frist
│       ├── SporkortHistorikk.svelte   # Mini-historikk + hendelseslogg toggle
│       ├── HendelsesLogg.svelte       # Ekspanderbar hendelseslogg (4+ events)
│       ├── ActionBanner.svelte        # "N handlinger venter på deg"
│       ├── FristerSection.svelte      # Urgency-sorterte frister
│       └── VarslingSection.svelte     # Kontraktuell varslingsstatus
└── utils/
    └── varslingStatus.ts              # NY: Beregn varslingsstatus fra SakState

src/routes/
├── [prosjektId]/
│   ├── +layout.svelte                 # ENDRE: Legg til QueryClientProvider, prosjekt-header
│   ├── +page.svelte                   # ENDRE: Implementer saksliste
│   └── [sakId]/
│       ├── +page.svelte               # ENDRE: Implementer Forhandlingsbordet
│       └── +page.ts                   # NY: Load-funksjon med sakId-param
```

---

## Task 0: Designsystem-etablering

**REQUIRED SKILL:** `/interface-design:init`

Før noe kode skrives: kjør `/interface-design:init` for å etablere designretning.

**Input til skillen:**
- Åpne `docs/design/koe-mock.html` i browser (Playwright) — dette er den visuelle sannheten
- Les `docs/design/koe-forhandlingsbord.md` — komplett spesifikasjon
- Les `.interface-design/system.md` — eksisterende system fra Fase 1
- Etabler patterns for nye komponenttyper: sporkort, tidslinje, sidebar

**Output:** Oppdatert `.interface-design/system.md` med Fase 2-patterns.

**Commit:**
```
chore: update design system with Fase 2 patterns
```

---

## Task 1: TanStack Query oppsett

**Files:**
- Create: `src/lib/queries/caseList.ts`
- Create: `src/lib/queries/caseContext.ts`
- Modify: `src/routes/[prosjektId]/+layout.svelte`

**Step 1: Write caseList query**

```typescript
// src/lib/queries/caseList.ts
import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseList } from '$lib/api/cases';
import type { CaseListResponse } from '$lib/types/api';

export function createCaseListQuery() {
  return createQuery<CaseListResponse>({
    queryKey: ['cases'],
    queryFn: () => fetchCaseList(),
  });
}
```

**Step 2: Write caseContext query**

```typescript
// src/lib/queries/caseContext.ts
import { createQuery } from '@tanstack/svelte-query';
import { fetchCaseContext } from '$lib/api/state';
import type { CaseContextResponse } from '$lib/types/api';

export function createCaseContextQuery(sakId: string) {
  return createQuery<CaseContextResponse>({
    queryKey: ['case-context', sakId],
    queryFn: () => fetchCaseContext(sakId),
    enabled: !!sakId,
  });
}
```

**Step 3: Add QueryClientProvider to prosjekt layout**

Modify `src/routes/[prosjektId]/+layout.svelte`:
- Import `QueryClientProvider` og `QueryClient` fra `@tanstack/svelte-query`
- Wrap `{@render children()}` i `<QueryClientProvider>`
- Forbedre header med prosjekt-navn

**Step 4: Verify type-check**

Run: `npm run check`
Expected: 0 errors

**Step 5: Commit**

```
feat: TanStack Query setup for case list and context
```

---

## Task 2: Saksliste — tabell med sortering

Ref: Metaplan §4 Fase 2 — "Minimal saksliste + TanStack Query mot eksisterende API"
Visuell ref: `docs/design/koe-mock.html` (saksliste-seksjon hvis den finnes, ellers følg Analysebordet-estetikk)

**Files:**
- Create: `src/lib/components/case-list/CaseListTable.svelte`
- Create: `src/lib/components/case-list/CaseListRow.svelte`
- Modify: `src/routes/[prosjektId]/+page.svelte`

**Step 1: Write CaseListRow**

Rendrer én rad i sakslisten. Viser:
- Sak-ID (klikkbar lenke til `/{prosjektId}/{sakId}`)
- Tittel (cached_title, fallback "Uten tittel")
- Status (Badge-primitiv med `cached_status`)
- Hovedkategori (fra `cached_hovedkategori`, bruk `getHovedkategoriLabel()`)
- Krevd beløp (formatCurrency fra `cached_sum_krevd`)
- Krevd dager (formatDays fra `cached_dager_krevd`)
- Siste aktivitet (relativ dato fra `last_event_at`)

Props: `case: CaseListItem`, `prosjektId: string`

Bruk:
- `$lib/utils/formatters` → `formatCurrency`, `formatDays`
- `$lib/utils/dateFormatters` → `formatDateMinimalNorwegian`
- `$lib/constants/categories` → `getHovedkategoriLabel`
- `$lib/constants/statusLabels` → `getOverordnetStatusLabel`
- `$lib/constants/statusStyles` → `getOverordnetStatusStyle`
- Badge-primitiv for status

Styling: `--font-data` for tall, `--font-ui` for tekst. Rad er klikkbar (`<a>`).

**Step 2: Write CaseListTable**

Rendrer tabellen med sorterings-headers. Props: `cases: CaseListItem[]`, `prosjektId: string`.

Sortering med `$state` for `sortKey` og `sortDir`. Default: `last_event_at` desc.

Kolonner: Sak-ID, Tittel, Status, Kategori, Krevd, Dager, Siste aktivitet.

Styling: Full-width tabell med `--felt` bakgrunn, `--wire` border, sticky header.

**Step 3: Implement saksliste-ruten**

Modify `src/routes/[prosjektId]/+page.svelte`:
- Import `createCaseListQuery`
- Vis loading/error/tom tilstand
- Rendre `CaseListTable` med data

Loading: Vis "Laster saker..." med subtle pulse
Error: Alert-primitiv med feilmelding
Tom: "Ingen saker i dette prosjektet. Opprett en ny sak for å komme i gang."

**Step 4: Write tests**

Test: `src/lib/components/case-list/__tests__/CaseListRow.test.ts`
- Rendrer sak-ID og tittel
- Viser formatert beløp
- Lenker til riktig URL

**Step 5: Verify**

Run: `npm run check && npx vitest run && npm run lint`

**Step 6: Commit**

```
feat: case list with sorting and status badges
```

**Step 7: QUALITY GATE — Simplify**

Kjør `simplify`-skill på saksliste-koden. Sjekk:
- Unødvendig abstraksjoner i CaseListTable/CaseListRow
- Gjenbruk av eksisterende formatters
- Svelte 5 idiomer (`$derived` for sortering, `class:` for betingede klasser)

---

## Task 3: Forhandlingsbordet — layout + sidebar

Ref: `docs/design/koe-forhandlingsbord.md` §Layout, §Venstre panel
Visuell ref: `docs/design/koe-mock.html` — sidebar layout, frist/varsling-seksjoner

**Files:**
- Modify: `src/routes/[prosjektId]/[sakId]/+page.svelte`
- Create: `src/routes/[prosjektId]/[sakId]/+page.ts`
- Create: `src/lib/components/forhandlingsbord/Sidebar.svelte`
- Create: `src/lib/components/forhandlingsbord/FristerSection.svelte`
- Create: `src/lib/components/forhandlingsbord/VarslingSection.svelte`
- Create: `src/lib/utils/varslingStatus.ts`

**Step 1: Create load function**

```typescript
// src/routes/[prosjektId]/[sakId]/+page.ts
export function load({ params }) {
  return { sakId: params.sakId, prosjektId: params.prosjektId };
}
```

**Step 2: Write varslingStatus utility**

`src/lib/utils/varslingStatus.ts` — beregner varslingsstatus fra `SakState`:

```typescript
export type VarslingItem = {
  label: string;         // Menneskelig språk: "Endring varslet"
  paragrafRef: string;   // "§32.2"
  status: 'ok' | 'warning' | 'breach' | 'na';
  spor: SporType;
};

export function beregnVarslingStatus(state: SakState): VarslingItem[]
```

Logikk basert på designdoc §Varslingsstatus:
- Grunnlag: varslet → ✓/⚠/– basert på `grunnlag_varsel` og `grunnlag_varslet_i_tide`
- Frist: varslet → ✓/⚠/– basert på `frist_varsel` og `frist_varsel_ok`
- Frist: spesifisert → ✓/⚠/– basert på `spesifisert_varsel` og `spesifisert_krav_ok`
- Vederlag: varslet → ✓/⚠/– basert på tilstand

Symboler: ✓ (ok), ⚠ (warning), ✕ (breach), – (na)

**Step 3: Write FristerSection**

`src/lib/components/forhandlingsbord/FristerSection.svelte`

Props: `state: SakState`

Viser frister urgency-sortert. Beregner dager igjen basert på nåværende dato vs. frist. Fargekodet: normal (--ink-secondary), advarsel (--vekt), kritisk (--score-low). "Passivitet" har sterkest farge.

Design fra doc:
```
FRISTER
⚠ Grunnlag  passivitet!
  Frist     13d igjen
  Vederlag  14d igjen
```

11px uppercase seksjonslabel. Mono-tall for dager.

**Step 4: Write VarslingSection**

`src/lib/components/forhandlingsbord/VarslingSection.svelte`

Props: `items: VarslingItem[]`

Viser varslingsstatus med symboler. §-referanse i Tooltip (Fase 1 Tooltip-primitiv).

Design fra doc:
```
VARSLING
✓ Endring varslet
⚠ Frist: varslet sent
– Frist: ikke spesifisert
– Vederlag: ikke varslet
```

**Step 5: Write Sidebar**

`src/lib/components/forhandlingsbord/Sidebar.svelte`

Props: `state: SakState`

Layout: sticky, top 0, height 100vh, width 260px, overflow-y auto, border-right 1px --wire.

Seksjoner:
1. Sak-identitet: sak_id, sakstittel, prosjekt_navn
2. Parter: entreprenor (TE), byggherre (BH) — fra SakState
3. FRISTER: FristerSection
4. VARSLING: VarslingSection

**Step 6: Implement Forhandlingsbordet layout**

Modify `src/routes/[prosjektId]/[sakId]/+page.svelte`:
- Import `createCaseContextQuery`
- 2-kolonne grid: `260px 1fr`
- Venstre: Sidebar
- Høyre: placeholder for tidslinje (Task 4)
- Loading/error/tom tilstand

**Step 7: Write tests**

- `src/lib/utils/__tests__/varslingStatus.test.ts` — tester beregning for ulike tilstander
- `src/lib/components/forhandlingsbord/__tests__/FristerSection.test.ts` — urgency-sortering, fargekoding

**Step 8: Verify**

Run: `npm run check && npx vitest run && npm run lint`

**Step 9: Commit**

```
feat: Forhandlingsbordet sidebar with frister and varsling
```

---

## Task 4: Tidslinjespine + ActionBanner

Ref: `docs/design/koe-forhandlingsbord.md` §Tidslinjespinen, §Handlingsbanner
Visuell ref: `docs/design/koe-mock.html` — tidslinjespine, datomerker, ActionBanner-plassering

**Files:**
- Create: `src/lib/components/forhandlingsbord/Timeline.svelte`
- Create: `src/lib/components/forhandlingsbord/ActionBanner.svelte`

**Step 1: Write ActionBanner**

Props: `state: SakState`

Beregner antall handlinger som venter basert på `neste_handling` + sporstatus. Sticky øverst i tidslinjen.

Design:
- "⚠ N handlinger venter på deg" (amber), "Ingen handlinger. Venter på TE." (muted)
- Fargekodet etter mest urgent: rose (passivitet), amber (normal), muted (ingen)
- Tekst: --font-ui, 12px, weight 600

For å beregne antall handlinger, sjekk hvert spor:
- grunnlag: status === 'sendt' og brukerrolle er BH → "Svar på ansvarsgrunnlag"
- vederlag: status === 'sendt' og brukerrolle er BH → "Svar på vederlagskrav"
- frist: status === 'sendt' og brukerrolle er BH → "Svar på fristkrav"
- Bruk `getCurrentUserRole()` fra `$lib/api/events`

**Step 2: Write Timeline**

Props: `state: SakState`, `timeline: TimelineEvent[]`

Grupperer sporkort etter dato (sist endret). Vertikal spine med datomerker.

Logikk:
1. Bygg liste av spor-data fra `state.grunnlag`, `state.vederlag`, `state.frist`
2. Sorter etter `siste_oppdatert` (nyeste først)
3. Grupper etter dato (i dag, i går, dato)
4. Rendre datomerke + Sporkort per gruppe

Tidslinjespine: 1px solid --wire-strong, vertikal linje til venstre for kortene.
Datomerke: --ink-muted, 11px, uppercase, tracking 0.06em.

Sak opprettet: vis som punkt på spinen (○ Sak opprettet av TE, dato).

Placeholder for Sporkort (Task 5).

**Step 3: Koble tidslinje til Forhandlingsbordet**

Oppdater `src/routes/[prosjektId]/[sakId]/+page.svelte`:
- Importer Timeline og ActionBanner
- Send state + timeline-data til komponentene

**Step 4: Verify**

Run: `npm run check && npm run lint`

**Step 5: Commit**

```
feat: timeline spine with date markers and action banner
```

---

## Task 5: Sporkort — kompakt format

Ref: `docs/design/koe-forhandlingsbord.md` §Sporkort
Visuell ref: `docs/design/koe-mock.html` — sporkort-layout, venstrekant-farger, data-linjer, passivitet-styling

**Files:**
- Create: `src/lib/components/forhandlingsbord/Sporkort.svelte`
- Create: `src/lib/components/forhandlingsbord/SporkortHeader.svelte`
- Create: `src/lib/components/forhandlingsbord/SporkortData.svelte`
- Create: `src/lib/components/forhandlingsbord/SporkortHistorikk.svelte`

**Step 1: Write SporkortHeader**

Props: `sporType: SporType`, `status: SporStatus`, `varsling: VarslingItem[]`, `action: { label: string; urgent: boolean } | null`, `prosjektId: string`, `sakId: string`

Design (linje 0):
```
SPORNAVN · Status · varslingsflagg ────────────── → Handling
```

- Spornavn: ANSVARSGRUNNLAG / VEDERLAG / FRISTFORLENGELSE (mapped fra SporType)
- Status: Badge-primitiv
- Varslingsflagg: ⚠-ikoner med menneskelig tekst, Tooltip for §-referanse
- Handlingsknapp: amber (normal) eller rose (kritisk), høyrejustert

Spornavnmapping:
```typescript
const SPOR_LABELS: Record<SporType, string> = {
  grunnlag: 'ANSVARSGRUNNLAG',
  vederlag: 'VEDERLAG',
  frist: 'FRISTFORLENGELSE',
};
```

Handlingsknapp bare for brukere med riktig rolle (BH for svar, TE for sending).

**Step 2: Write SporkortData**

Props varierer per sportype:
- Grunnlag: `tittel · hovedkategori · dato`
- Vederlag: `metode · beløp · rigg · produktivitet · frist Xd`
- Frist: `Xd krevd · Rev. N · Ny dato · frist Xd`

Tekst: --font-data, 12px, --ink. Prikk-separert (·). Frist i --ink-muted.

Bruk:
- `formatCurrency` for beløp
- `formatDays` for dager
- `getHovedkategoriLabel` for kategori
- `formatVederlagsmetode` for metode

**Step 3: Write SporkortHistorikk**

Props: `events: TimelineEvent[]` (filtrert per spor)

Design (linje 2): Mini-historikk med siste 2-3 hendelser.
```
i dag TE sendte krav · 20.01 forespurt · 15.01 varslet
```

--font-ui, 10px, --ink-muted. Prikk-separert. Relativ tid ("i dag", "i går", dato).

Bruk `extractEventType()` og `getEventTypeLabel()` for hendelsestekst.

**Step 4: Write Sporkort**

Kompositt-komponent som samler Header + Data + Historikk.

Props: `sporType: SporType`, `state: SakState`, `events: TimelineEvent[]`, `prosjektId: string`, `sakId: string`

Hele kortet er klikkbar → navigerer til `/{prosjektId}/{sakId}/{sporType}`.

Visuell differensiering basert på tilstand (fra designdoc):

| Tilstand | Bakgrunn | Venstre kant | Handling |
|---|---|---|---|
| Handling — normal | --felt | 3px --vekt | → Svar |
| Handling — kritisk | --score-low-bg | 3px --score-low | → Svar nå |
| Venter | --felt | 1px --wire-strong | Ingen |
| Godkjent | --felt | 2px --score-high | Ingen, ✓ badge |
| Avslått | --felt | 2px --score-low | → Forsering? |
| Bortfalt | --felt | 1px stiplet --ink-ghost | → Se sak |

Passivitet-sjekk for grunnlag: `state.grunnlag.status === 'sendt'` + sjekk dager siden siste hendelse. Over 14 dager → rose bakgrunn + konsekvenstekst.

**Step 5: Koble Sporkort til Timeline**

Oppdater Timeline.svelte: erstatt placeholder med Sporkort-komponent per spor.

**Step 6: Write tests**

- `src/lib/components/forhandlingsbord/__tests__/Sporkort.test.ts`
  - Rendrer spornavn og status
  - Viser riktig venstrekant-farge per tilstand
  - Handlingsknapp kun for riktig rolle
  - Passivitet → rose bakgrunn

**Step 7: Verify**

Run: `npm run check && npx vitest run && npm run lint`

**Step 8: Commit**

```
feat: compact sporkort with status, data, and history lines
```

**Step 9: QUALITY GATE — Code Review**

Sporkort er den mest komplekse komponenten i Fase 2. Kjør `superpowers:requesting-code-review` med fokus på:
- Tilstandslogikk i Sporkort.svelte — riktig mapping fra SakState → visuell tilstand
- Konsistens med designdoc §Sporkort (venstrekant, farger, handlingsknapp)
- Svelte 5 idiomer: `$derived.by()` for beregnet tilstand, `class:` for boolean klasser, generics hvis relevant
- Ingen Svelte 4-mønstre (ingen `$:`, `on:click`, `createEventDispatcher`)

---

## Task 6: Hendelseslogg (ekspanderbar, 4+ hendelser)

Ref: `docs/design/koe-forhandlingsbord.md` §Hendelseslogg
Visuell ref: `docs/design/koe-mock.html` — toggle-bar, hendelseslinjer, ikoner, animasjon

**Files:**
- Create: `src/lib/components/forhandlingsbord/HendelsesLogg.svelte`
- Modify: `src/lib/components/forhandlingsbord/SporkortHistorikk.svelte`

**Step 1: Write HendelsesLogg**

Props: `events: TimelineEvent[]`, `sporType: SporType`

Ekspanderbar hendelseslogg med toggle-bar. Terskelregel: ≤3 → ingen toggle. 4+ → toggle-bar + ekspanderbar.

Toggle-bar design:
- Innfelt area (--canvas bakgrunn)
- "N hendelser" (--font-data, 10px, --ink-muted) + chevron (▸/▾)
- Border-top: 1px solid --wire
- Hover: rgba(255,255,255,0.03)

Hendelseslinje-anatomi:
```
[ikon 14px] [dato 38px mono] [tekst flex] [rev 9px ghost] [part 20px mono]
```

Ikoner per hendelsestype:
| Ikon | EventType-mønster | Farge |
|---|---|---|
| → | sendt/krav_sendt | --ink-muted |
| ⚑ | opprettet (varsel) | --ink-muted |
| ↻ | oppdatert/spesifisert | --vekt-dim |
| ◇ | respons (ny) | --score-high |
| ✓ | akseptert | --score-high |
| ✕ | trukket/avslatt | --score-low |

Bruk `extractEventType()` for å mappe hendelsestype → ikon.

Animasjon: Svelte `slide` transition (max-height emulering), 200ms.

Accordion: kun ett kort ekspandert om gangen. Styres via callback `onToggle` som kommuniserer med Timeline.

**Step 2: Integrer med SporkortHistorikk**

Oppdater SporkortHistorikk.svelte:
- ≤3 hendelser: vis mini-historikk inline
- 4+ hendelser: vis mini-historikk + HendelsesLogg med toggle-bar

StopPropagation på toggle-bar og hendelseslogg-area (forhindrer navigasjon til spordetalj).

**Step 3: Write tests**

- `src/lib/components/forhandlingsbord/__tests__/HendelsesLogg.test.ts`
  - Viser toggle-bar for 4+ hendelser
  - Skjuler toggle-bar for ≤3 hendelser
  - Ekspanderer/kollapser ved klikk
  - Viser riktig ikon per hendelsestype

**Step 4: Verify**

Run: `npm run check && npx vitest run && npm run lint`

**Step 5: Commit**

```
feat: expandable event log with toggle bar and event icons
```

**Step 6: QUALITY GATE — Simplify**

Kjør `simplify`-skill på HendelsesLogg + SporkortHistorikk. Sjekk:
- Over-engineering i toggle/accordion-logikken
- Bruk av `transition:slide` (Svelte 5) i stedet for manuell max-height-animasjon
- `use:` action for click-outside (Svelte 5) i stedet for manuell event-listener
- Unødvendig gjenbruk-abstraksjoner — dette er én komponent, ikke et bibliotek

---

## Task 7: Mock-data og visuell verifisering

Til nå er komponentene bygget men kan ikke testes visuelt uten backend. Lag mock-data for utvikling.

**Files:**
- Create: `src/lib/mocks/caseState.ts`
- Create: `src/lib/mocks/timeline.ts`
- Create: `src/lib/mocks/caseList.ts`

**Step 1: Lag mock SakState**

`src/lib/mocks/caseState.ts` — tre scenarier fra designdoc:

1. **3 aktive spor** (designdoc §Mockup BH med tre aktive spor):
   - Grunnlag: ubesvart, passivitet (19d)
   - Frist: spesifisert krav, 45d
   - Vederlag: nytt krav, 2.4M

2. **Blandet tilstand** (designdoc §Mockup blandet tilstand):
   - Grunnlag: godkjent
   - Vederlag: nytt krav
   - Frist: delvis godkjent, venter TE

3. **Tom sak**: Bare opprettet, ingen spor.

Bruk faktiske typer fra `SakState`, `GrunnlagTilstand`, `VederlagTilstand`, `FristTilstand`.

**Step 2: Lag mock timeline**

`src/lib/mocks/timeline.ts` — CloudEvents for de tre scenariene. Bruk `TimelineEvent` type.

**Step 3: Lag mock case list**

`src/lib/mocks/caseList.ts` — 5-8 saker med varierende status og beløp.

**Step 4: Koble mock-data til ruter (dev mode)**

Oppdater queries til å bruke mock-data når API ikke er tilgjengelig.

Mønster: `createCaseContextQuery` sjekker en `USE_MOCKS` flag (importert fra en env-variabel eller en `$lib/mocks/config.ts`). Mocks returneres som fallback ved nettverksfeil.

Alternativt: utvid `+page.ts` load-funksjonen med en `?mock=1` query-param som aktiverer mocks.

**Step 5: Visuell verifisering med Playwright**

Start dev server, naviger til `/test-prosjekt/test-sak?mock=1`, ta screenshot for å verifisere layout.

Sjekkliste:
- [ ] Sidebar viser sak-info, frister, varsling
- [ ] Tidslinje viser sporkort med datomerker
- [ ] ActionBanner viser riktig antall handlinger
- [ ] Sporkort har riktig venstrekant-farge
- [ ] Passivitet-kort har rose bakgrunn
- [ ] Godkjent-kort har dempet stil
- [ ] Hendelseslogg toggle vises for 4+ hendelser

**Step 6: Commit**

```
feat: mock data and visual verification for Forhandlingsbordet
```

**Step 7: QUALITY GATE — Interface Design Critique**

Kjør `/interface-design:critique` for å sammenligne resultat mot `docs/design/koe-mock.html`.
- Åpne mock.html i browser (Playwright) og ta screenshot
- Åpne dev server med mock-data og ta screenshot
- Sammenlign pixel-nivå: spacing, farger, typografi, venstrekanter, ikoner
- Identifiser avvik og fiks før videre arbeid

---

## Task 8: Tastaturnavigasjon og tilgjengelighet

Ref: `docs/design/koe-forhandlingsbord.md` §Tastatur og tilgjengelighet

**Files:**
- Modify: `src/lib/components/forhandlingsbord/Timeline.svelte`
- Modify: `src/lib/components/forhandlingsbord/Sporkort.svelte`
- Modify: `src/lib/components/forhandlingsbord/HendelsesLogg.svelte`

**Step 1: Sporkort tastatur**

- Tab: mellom sporkort (fokuserer hele kortet)
- Enter: navigerer til spordetalj
- Space: ekspanderer hendelseslogg (hvis 4+)
- Focus-visible: 2px solid --wire-focus, offset -2px

Sporkort trenger `tabindex="0"`, `role="article"`, `aria-label` med spornavn + status.

**Step 2: Hendelseslogg tastatur**

- ↑↓: mellom hendelser i åpen logg
- Enter: navigerer til spordetalj
- Escape: lukker hendelseslogg

Hendelser trenger `role="listbox"` og `role="option"` for piltast-navigasjon.

**Step 3: ARIA-attributter**

- ActionBanner: `role="status"`, `aria-live="polite"`
- Sidebar FRISTER: `aria-label="Frister"`
- Sidebar VARSLING: `aria-label="Varslingsstatus"`
- Tidslinje: `role="feed"` eller `role="list"`
- Sporkort: `role="article"` med `aria-label`

**Step 4: Verify**

Run: `npm run check && npx vitest run && npm run lint`

**Step 5: Commit**

```
feat: keyboard navigation and ARIA attributes for Forhandlingsbordet
```

---

## Task 9: Responsive layout

Ref: `docs/design/koe-forhandlingsbord.md` §Layout-constraints

**Files:**
- Modify: `src/routes/[prosjektId]/[sakId]/+page.svelte`
- Modify: `src/lib/components/forhandlingsbord/Sidebar.svelte`

**Step 1: Implementer breakpoints**

| Bredde | Tilpasning |
|--------|-----------|
| ≥1440px | Full layout |
| 1280–1439px | Full layout (forhåndsvisningspanel skjules — implementeres ikke i Fase 2) |
| 1024–1279px | Sidebar kollapser til 48px ikon-modus |
| <1024px | Melding: "Desktop-verktøy — bruk større skjerm" |

CSS media queries i `+page.svelte`. Sidebar kollapser med en toggle-knapp.

Tidslinje: fyller tilgjengelig plass. Sporkort: max-width 820px, sentreres.

**Step 2: Verify med Playwright**

Resize til 1200px → sidebar kollapset.
Resize til 900px → "bruk større skjerm"-melding.

**Step 3: Commit**

```
feat: responsive layout with sidebar collapse
```

---

## Task 10: Sluttverifisering og opprydding

**Step 1: Kjør alle sjekker**

```bash
npm run check    # 0 errors
npx vitest run   # Alle tester grønne
npm run build    # Produksjons-build ok
npm run lint     # 0 errors
```

**Step 2: Visuell inspeksjon**

Bruk Playwright for å verifisere:
- Saksliste viser mock-saker med sortering
- Forhandlingsbordet viser alle tre mockup-scenarier
- Navigasjon mellom saksliste → forhandlingsbordet → spordetalj (placeholder)
- Tastaturnavigasjon fungerer
- Responsive layout ved ulike breakpoints

**Step 3: Fjern eventuelle ubrukte importer og opprydding**

**Step 4: QUALITY GATE — Interface Design Audit**

Kjør `/interface-design:audit` for full audit mot designsystemet:
- Sjekk alle nye komponenter mot `.interface-design/system.md`
- Verifiser token-bruk (spacing, farger, radius, typografi)
- Sjekk konsistens med Fase 1-primitiver
- Verifiser at alle nye patterns er dokumentert i system.md
- Fiks eventuelle avvik

**Step 5: Commit**

```
feat: Fase 2 complete — case list + Forhandlingsbordet
```

---

## Testing-oppsummering

| Fil | Hva testes |
|-----|-----------|
| `varslingStatus.test.ts` | Beregning av varslingsstatus for alle tilstander |
| `FristerSection.test.ts` | Urgency-sortering, fargekoding |
| `CaseListRow.test.ts` | Rendering av sakdata, lenke, formatering |
| `Sporkort.test.ts` | Tilstandsbasert styling, rolle-filtrert handling |
| `HendelsesLogg.test.ts` | Terskel, toggle, ikoner, ekspandering |

---

## Avhengigheter

Ingen nye npm-avhengigheter. TanStack Query Svelte, date-fns, og Lucide Svelte er allerede installert.

---

## Risiko

| Risiko | Mitigering |
|--------|-----------|
| Backend ikke tilgjengelig | Mock-data i Task 7 dekker visuell utvikling |
| TanStack Query Svelte 5 API ustabil | Bruk minimal wrapper, enkel queryKey/queryFn |
| Kompleks visuell logikk i Sporkort | Del opp i sub-komponenter (Header/Data/Historikk) |
| Passivitetsberegning krever dato-logikk | Enkel diff i dager, ikke noe avansert |
