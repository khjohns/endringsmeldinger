# Mockup → SakState Refaktor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaktorere mockup-appen til å bruke produksjonens `SakState`-type som eneste datakilde, slik at mockupen er en 1:1 UI-prototype over ekte domenedata.

**Architecture:** Store wraps `SakState` + lokal UI-state (kladder, vedlegg, notater). En adapter-modul (`derive.ts`) utleder display-data og domain configs fra `SakState`. Scenariovelger i header bytter mellom 4 forhåndsdefinerte saker fra `mocks/caseState.ts`. Historikk-fanen bruker timeline-mocks fra `mocks/timeline.ts`.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, produksjonens `SakState`/`CloudEvent`-typer + domenelogikk.

---

## Berørte filer

### Nye filer
- `src/lib/mockup/derive.ts` — Utleder display-data fra `SakState` (partsnavn, spor-labels, beløp, domainConfigs)
- `src/lib/mockup/scenarios.ts` — Importerer og eksporterer scenarier med tilhørende timeline-events og UI-state

### Filer som endres vesentlig
- `src/lib/mockup/types.ts` — Slankes: fjern `TrackData`, `TrackTE`, `TrackBH`, `HistoryEvent`. Behold UI-only typer (`Mode`, `Role`, `RightTab`, `Provision`, `Attachment`, `InternalNote`, `Draft`)
- `src/lib/mockup/data.ts` — Beholdes som `constants.ts`-rolle: eksporterer kun `S` (spacing), `TRACK_ICONS`, og `sporBestemmelser`. `DD`, `EVT`, `TE`, `BH` fjernes.
- `src/lib/mockup/store.svelte.ts` — Reskrives: wrapper `SakState` + lokal UI-state + scenario-bytte. Eksponerer `teNavn`/`bhNavn` som erstatter `TE`/`BH`-konstantene.
- `src/lib/mockup/Kontrollrommet.svelte` — Henter data fra ny store
- `src/lib/mockup/Header.svelte` — Scenariovelger dropdown
- `src/lib/mockup/LeftSidebar.svelte` — Leser fra `SakState` i stedet for `TrackData`
- `src/lib/mockup/CenterRead.svelte` — Leser fra `SakState` i stedet for `Track`
- `src/lib/mockup/ActionBar.svelte` — Tilpasses ny store
- `src/lib/mockup/RightSidebar.svelte` — Historikk fra CloudEvents med `getEventTypeLabel()`/`getEventIcon()`, bestemmelser via `sporBestemmelser()`
- `src/lib/mockup/VederlagForm.svelte` — `domainConfig` fra store i stedet for hardkodet
- `src/lib/mockup/FristForm.svelte` — `domainConfig` fra store i stedet for hardkodet
- `src/lib/mockup/GrunnlagForm.svelte` — `domainConfig` fra store i stedet for hardkodet
- `src/lib/mockup/ConsistencyStrip.svelte` — Leser fra ny store
- `src/lib/mockup/TeVederlagForm.svelte` — Erstatt `store.tracks` med ny store-API, `TE` → `store.teNavn`
- `src/lib/mockup/TeFristForm.svelte` — Samme
- `src/lib/mockup/TeGrunnlagForm.svelte` — Samme

### Filer som forblir uendret
- Rene UI-komponenter: `SubStripe`, `Diamond`, `Stamp`, `DualBar`, `DateSeparator`, `CaseAnchor`
- `mockup.css`
- `CenterForm.svelte` — brukes ikke aktivt

### Viktige designvalg

**Subsidiær-status:** Nåværende mockup hardkoder `erGrunnlagSubsidiaer: true` og `grunnlagStatus: 'avslatt'`. Etter migrering styres dette av `SakState`. Scenario 1 har ingen BH-respons på grunnlag, så vederlag/frist vises IKKE som subsidiært før brukeren aktivt avslår grunnlag via skjemaet. Dette er korrekt produksjonsoppførsel. For å demonstrere subsidiær-UI umiddelbart, legg til et scenario med pre-avslått grunnlag (f.eks. en variant av scenario 1).

**`data.ts` beholdes som konstant-fil:** `S` (spacing-grid), `TRACK_ICONS` (lucide-ikoner), og `sporBestemmelser()` er UI-konstanter som ikke avhenger av `SakState`. De forblir i `data.ts`. `DD`, `EVT`, `TE`, `BH` fjernes. Alle komponenter som importerte `TE`/`BH` bytter til `store.teNavn`/`store.bhNavn`.

**Bestemmelser (`best`):** Genereres av `sporBestemmelser(sel)` fra `data.ts`/`utils.ts` — ren NS 8407-referanse uavhengig av SakState. Kalles direkte i RightSidebar, ikke lagret i store.

---

## Task 1: `derive.ts` — Adapter fra SakState til display-data

**Files:**
- Create: `src/lib/mockup/derive.ts`
- Test: `src/lib/mockup/__tests__/derive.test.ts`

Denne modulen er ren TypeScript uten Svelte — kan testes isolert.

- [ ] **Step 1: Skriv test for `deriveTrackDisplay`**

```typescript
// src/lib/mockup/__tests__/derive.test.ts
import { describe, it, expect } from 'vitest';
import { deriveTrackDisplay } from '../derive';
import { scenario1_3AktiveSpor } from '$lib/mocks/caseState';

describe('deriveTrackDisplay', () => {
  it('utleder vederlag-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'vederlag');
    expect(result.label).toBe('Økonomi');
    expect(result.num).toBe('II');
    expect(result.krevdValue).toBe(2930000);
    expect(result.krevdUnit).toBe(',-');
    expect(result.teText).toContain('Kostnadsoverslag');
  });

  it('utleder grunnlag-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'ansvar');
    expect(result.label).toBe('Ansvarsgrunnlag');
    expect(result.num).toBe('I');
    expect(result.tePosition).toBe('SVIKT');
    expect(result.teText).toContain('leirelag');
  });

  it('utleder frist-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'frist');
    expect(result.label).toBe('Frist');
    expect(result.num).toBe('III');
    expect(result.krevdValue).toBe(45);
    expect(result.krevdUnit).toBe(' dgr');
  });
});
```

- [ ] **Step 2: Kjør testen — forvent FAIL**

Run: `npx vitest run src/lib/mockup/__tests__/derive.test.ts`
Expected: FAIL — `deriveTrackDisplay` eksisterer ikke.

- [ ] **Step 3: Implementer `deriveTrackDisplay`**

```typescript
// src/lib/mockup/derive.ts
import type { SakState } from '$lib/types/timeline';

export type SporKey = 'ansvar' | 'vederlag' | 'frist';

export interface TrackDisplay {
  label: string;
  num: string;
  // Grunnlag (binary)
  tePosition?: string;
  teRef?: string;
  bhPosition?: string;
  bhRef?: string;
  // Vederlag/Frist (numeric)
  krevdValue?: number;
  krevdUnit?: string;
  bhPrinsipal?: number;
  bhSubsidiaer?: number;
  bhUnit?: string;
  // Tekst
  teText: string;
  bhText: string;
  // Status
  isBinary: boolean;
  isDisputed: boolean;
  isSubsidiary: boolean;
}

const TRACK_META: Record<SporKey, { label: string; num: string }> = {
  ansvar: { label: 'Ansvarsgrunnlag', num: 'I' },
  vederlag: { label: 'Økonomi', num: 'II' },
  frist: { label: 'Frist', num: 'III' },
};

export function deriveTrackDisplay(sak: SakState, spor: SporKey): TrackDisplay {
  const meta = TRACK_META[spor];

  if (spor === 'ansvar') {
    const g = sak.grunnlag;
    return {
      ...meta,
      isBinary: true,
      tePosition: g.hovedkategori?.toUpperCase(),
      teRef: '§ 23.1',
      bhPosition: g.bh_resultat === 'godkjent' ? 'Godkjent' : g.bh_resultat === 'frafalt' ? 'Frafalt' : 'Avvist',
      bhRef: '§ 23.1 (2)',
      teText: g.beskrivelse ?? '',
      bhText: g.bh_begrunnelse ?? '',
      isDisputed: g.bh_resultat === 'avslatt' || !g.bh_resultat,
      isSubsidiary: false,
    };
  }

  if (spor === 'vederlag') {
    const v = sak.vederlag;
    return {
      ...meta,
      isBinary: false,
      krevdValue: v.krevd_belop ?? v.netto_belop ?? 0,
      krevdUnit: ',-',
      bhPrinsipal: v.godkjent_belop ?? 0,
      bhSubsidiaer: v.subsidiaer_godkjent_belop ?? v.godkjent_belop ?? 0,
      bhUnit: ',-',
      teText: v.begrunnelse ?? '',
      bhText: v.bh_begrunnelse ?? '',
      isDisputed: v.bh_resultat === 'avslatt',
      isSubsidiary: sak.er_subsidiaert_vederlag,
    };
  }

  // frist
  const f = sak.frist;
  return {
    ...meta,
    isBinary: false,
    krevdValue: f.krevd_dager ?? 0,
    krevdUnit: ' dgr',
    bhPrinsipal: f.godkjent_dager ?? 0,
    bhSubsidiaer: f.subsidiaer_godkjent_dager ?? f.godkjent_dager ?? 0,
    bhUnit: ' dgr',
    teText: f.begrunnelse ?? '',
    bhText: f.bh_begrunnelse ?? '',
    isDisputed: f.bh_resultat === 'avslatt',
    isSubsidiary: sak.er_subsidiaert_frist,
  };
}
```

- [ ] **Step 4: Kjør testen — forvent PASS**

Run: `npx vitest run src/lib/mockup/__tests__/derive.test.ts`

- [ ] **Step 5: Skriv test for `deriveVederlagDomainConfig`**

```typescript
// Legg til i src/lib/mockup/__tests__/derive.test.ts
import { deriveVederlagDomainConfig, deriveFristDomainConfig, deriveGrunnlagDomainConfig } from '../derive';

describe('deriveVederlagDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveVederlagDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.metode).toBe('REGNINGSARBEID');
    expect(cfg.hovedkravBelop).toBe(2930000);
    expect(cfg.harRiggKrav).toBe(true);
    expect(cfg.riggBelop).toBe(350000);
    expect(cfg.harProduktivitetKrav).toBe(true);
    expect(cfg.produktivitetBelop).toBe(180000);
    expect(cfg.grunnlagStatus).toBeUndefined(); // BH har ikke svart ennå
  });
});

describe('deriveFristDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveFristDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.krevdDager).toBe(45);
    expect(cfg.varselType).toBe('spesifisert');
    expect(cfg.erGrunnlagSubsidiaer).toBe(false);
  });
});

describe('deriveGrunnlagDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveGrunnlagDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.grunnlagEvent?.hovedkategori).toBe('SVIKT');
    expect(cfg.isUpdateMode).toBe(false);
  });
});
```

- [ ] **Step 6: Implementer domain config-utledere**

```typescript
// Legg til i src/lib/mockup/derive.ts
import type { VederlagDomainConfig } from '$lib/domain/vederlagDomain';
import type { FristDomainConfig } from '$lib/domain/fristDomain';
import type { GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';

export function deriveVederlagDomainConfig(sak: SakState): VederlagDomainConfig {
  const v = sak.vederlag;
  const g = sak.grunnlag;
  return {
    metode: v.metode,
    hovedkravBelop: v.krevd_belop ?? v.netto_belop ?? 0,
    riggBelop: v.saerskilt_krav?.rigg_drift?.belop,
    produktivitetBelop: v.saerskilt_krav?.produktivitet?.belop,
    harRiggKrav: !!v.saerskilt_krav?.rigg_drift,
    harProduktivitetKrav: !!v.saerskilt_krav?.produktivitet,
    kreverJustertEp: v.krever_justert_ep ?? false,
    kostnadsOverslag: v.kostnads_overslag,
    hovedkategori: g.hovedkategori as VederlagDomainConfig['hovedkategori'],
    grunnlagVarsletForSent: g.grunnlag_varslet_i_tide === false,
    grunnlagStatus: g.bh_resultat as VederlagDomainConfig['grunnlagStatus'],
  };
}

export function deriveFristDomainConfig(sak: SakState): FristDomainConfig {
  const f = sak.frist;
  const g = sak.grunnlag;
  return {
    varselType: f.varsel_type,
    krevdDager: f.krevd_dager ?? 0,
    erSvarPaForesporsel: !!f.har_bh_foresporsel,
    harTidligereVarselITide: f.frist_varsel_ok !== false,
    erGrunnlagSubsidiaer: g.bh_resultat === 'avslatt',
    erHelFristSubsidiaerPgaGrunnlag: g.grunnlag_varslet_i_tide === false,
  };
}

export function deriveGrunnlagDomainConfig(sak: SakState): GrunnlagDomainConfig {
  const g = sak.grunnlag;
  return {
    grunnlagEvent: {
      hovedkategori: g.hovedkategori,
      underkategori: Array.isArray(g.underkategori) ? g.underkategori[0] : g.underkategori,
    },
    isUpdateMode: (g.bh_respondert_versjon ?? -1) >= 0,
    forrigeResultat: g.bh_resultat,
    harSubsidiaereSvar: sak.er_subsidiaert_vederlag || sak.er_subsidiaert_frist,
  };
}
```

- [ ] **Step 7: Kjør alle derive-tester — forvent PASS**

Run: `npx vitest run src/lib/mockup/__tests__/derive.test.ts`

- [ ] **Step 8: Commit**

```bash
git add src/lib/mockup/derive.ts src/lib/mockup/__tests__/derive.test.ts
git commit -m "feat(mockup): derive-adapter fra SakState til display-data og domainConfigs"
```

---

## Task 2: `scenarios.ts` — Scenariodata med UI-state

**Files:**
- Create: `src/lib/mockup/scenarios.ts`
- Modify: `src/lib/mockup/data.ts` — fjern `DD`, `EVT`, `EVT_GROUPED`, `TE`, `BH`. Behold `S`, `TRACK_ICONS`, og re-eksporter `sporBestemmelser`.

- [ ] **Step 1: Opprett `scenarios.ts`**

```typescript
// src/lib/mockup/scenarios.ts
import {
  scenario1_3AktiveSpor,
  scenario2_BlandetTilstand,
  scenario4_Omforent,
} from '$lib/mocks/caseState';
import {
  timeline1_3AktiveSpor,
  timeline2_BlandetTilstand,
  timeline4_Omforent,
} from '$lib/mocks/timeline';
import type { SakState } from '$lib/types/timeline';
import type { Draft, Attachment, InternalNote } from './types.js';

export type SporKey = 'ansvar' | 'vederlag' | 'frist';

export interface SporUIState {
  draft: Draft | null;
  att: Attachment[];
  note: InternalNote | null;
}

export interface ScenarioUIState {
  ansvar: SporUIState;
  vederlag: SporUIState;
  frist: SporUIState;
}

export interface Scenario {
  id: string;
  label: string;
  sak: SakState;
  timeline: unknown[]; // CloudEvent[]
  ui: ScenarioUIState;
}

const emptyUI: SporUIState = { draft: null, att: [], note: null };

/**
 * Scenario 1 med pre-avslått grunnlag — for å demonstrere subsidiær-UI.
 * Kopi av scenario1 der BH allerede har avslått grunnlag.
 */
const scenario1_Subsidiaer: SakState = {
  ...scenario1_3AktiveSpor,
  sak_id: 'KOE-2024-047-SUB',
  grunnlag: {
    ...scenario1_3AktiveSpor.grunnlag,
    bh_resultat: 'avslatt',
    bh_begrunnelse: 'Forbeholdet i geoteknisk rapport pkt. 4.2 dekker variasjoner i fjellkoter. Avvist.',
    bh_respondert_versjon: 0,
  },
  er_subsidiaert_vederlag: true,
  er_subsidiaert_frist: true,
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'scenario1',
    label: 'KOE-047 — 3 aktive spor',
    sak: scenario1_3AktiveSpor,
    timeline: timeline1_3AktiveSpor,
    ui: {
      ansvar: { ...emptyUI },
      vederlag: { ...emptyUI },
      frist: { ...emptyUI },
    },
  },
  {
    id: 'scenario1sub',
    label: 'KOE-047 — Subsidiært (grunnlag avslått)',
    sak: scenario1_Subsidiaer,
    timeline: timeline1_3AktiveSpor,
    ui: {
      ansvar: {
        draft: { text: 'Vi fastholder at forbeholdet i pkt. 4.2 er tilstrekkelig klart.' },
        att: [{ n: 'Geoteknisk rapport rev. B', p: 42 }, { n: 'Foto byggegrop 11.04' }],
        note: { d: '14.04', t: 'Sjekk pkt. 4.2 — gjelder kun vertikale avvik.' },
      },
      vederlag: {
        draft: { text: 'Vurderer 280k — borerigg-argumentet har noe for seg.', value: 280000 },
        att: [{ n: 'Kostnadsoppstilling', p: 3 }],
        note: null,
      },
      frist: { ...emptyUI, att: [{ n: 'Fremdriftsplan rev. 4', p: 8 }] },
    },
  },
  {
    id: 'scenario2',
    label: 'KOE-031 — Blandet tilstand',
    sak: scenario2_BlandetTilstand,
    timeline: timeline2_BlandetTilstand,
    ui: {
      ansvar: { ...emptyUI },
      vederlag: { ...emptyUI },
      frist: { ...emptyUI },
    },
  },
  {
    id: 'scenario4',
    label: 'KOE-019 — Omforent',
    sak: scenario4_Omforent,
    timeline: timeline4_Omforent,
    ui: {
      ansvar: { ...emptyUI },
      vederlag: { ...emptyUI },
      frist: { ...emptyUI },
    },
  },
];

export const DEFAULT_SCENARIO = SCENARIOS[1]; // Subsidiært som default — rikest UI
```

- [ ] **Step 2: Rens `data.ts` — fjern `DD`, `EVT`, `TE`, `BH`**

Behold kun:
```typescript
// src/lib/mockup/data.ts
import { Scale, Banknote, Clock } from 'lucide-svelte';
import type { ComponentType } from 'svelte';
import type { SporKey } from './scenarios.js';
import { sporBestemmelser } from './utils.js';

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 };

export const TRACK_ICONS: Record<SporKey, ComponentType> = {
  ansvar: Scale,
  vederlag: Banknote,
  frist: Clock,
};

export { sporBestemmelser };
```

- [ ] **Step 2: Verifiser at importene kompilerer**

Run: `npx svelte-check --threshold error`

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockup/scenarios.ts
git commit -m "feat(mockup): scenariodata med SakState + timeline + lokal UI-state"
```

---

## Task 3: Ny store med SakState

**Files:**
- Rewrite: `src/lib/mockup/store.svelte.ts`

- [ ] **Step 1: Skriv ny store**

```typescript
// src/lib/mockup/store.svelte.ts
import { SCENARIOS, DEFAULT_SCENARIO } from './scenarios.js';
import type { Scenario, SporUIState } from './scenarios.js';
import type { SporKey } from './derive.js';
import {
  deriveTrackDisplay,
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from './derive.js';
import type { SakState } from '$lib/types/timeline';
import type { VederlagDomainConfig } from '$lib/domain/vederlagDomain';
import type { FristDomainConfig } from '$lib/domain/fristDomain';
import type { GrunnlagDomainConfig } from '$lib/domain/grunnlagDomain';
import type { Draft } from './types.js';
import { getPartsNavn } from '$lib/utils/partsNavn.js';

function createStore() {
  let scenario: Scenario = $state(structuredClone(DEFAULT_SCENARIO));

  // Derived
  const sak = $derived(scenario.sak);
  const timeline = $derived(scenario.timeline);

  const teNavn = $derived(getPartsNavn('TE', sak.entreprenor ?? 'TE', sak.byggherre ?? 'BH'));
  const bhNavn = $derived(getPartsNavn('BH', sak.entreprenor ?? 'TE', sak.byggherre ?? 'BH'));

  const ansvarDisplay = $derived(deriveTrackDisplay(sak, 'ansvar'));
  const vederlagDisplay = $derived(deriveTrackDisplay(sak, 'vederlag'));
  const fristDisplay = $derived(deriveTrackDisplay(sak, 'frist'));

  const vederlagDomainConfig = $derived(deriveVederlagDomainConfig(sak));
  const fristDomainConfig = $derived(deriveFristDomainConfig(sak));
  const grunnlagDomainConfig = $derived(deriveGrunnlagDomainConfig(sak));

  const draftCount = $derived(
    (['ansvar', 'vederlag', 'frist'] as SporKey[]).filter((k) => scenario.ui[k].draft !== null).length
  );

  function selectScenario(id: string) {
    const found = SCENARIOS.find((s) => s.id === id);
    if (found) scenario = structuredClone(found);
  }

  function getUI(spor: SporKey): SporUIState {
    return scenario.ui[spor];
  }

  function setDraft(spor: SporKey, draft: Draft | null) {
    scenario.ui[spor] = { ...scenario.ui[spor], draft };
  }

  // BH sender svar — oppdaterer SakState
  function sendGrunnlagSvar(resultat: 'godkjent' | 'avslatt' | 'frafalt') {
    scenario.sak = {
      ...scenario.sak,
      grunnlag: {
        ...scenario.sak.grunnlag,
        bh_resultat: resultat,
        bh_respondert_versjon: 0,
      },
    };
    scenario.ui.ansvar = { ...scenario.ui.ansvar, draft: null };
  }

  function sendVederlagSvar(godkjentBelop: number) {
    const krevd = scenario.sak.vederlag.krevd_belop ?? 0;
    const resultat = godkjentBelop >= krevd ? 'godkjent' : godkjentBelop > 0 ? 'delvis_godkjent' : 'avslatt';
    scenario.sak = {
      ...scenario.sak,
      vederlag: {
        ...scenario.sak.vederlag,
        bh_resultat: resultat,
        godkjent_belop: godkjentBelop,
        bh_respondert_versjon: 0,
      },
    };
    scenario.ui.vederlag = { ...scenario.ui.vederlag, draft: null };
  }

  function sendFristSvar(godkjentDager: number) {
    const krevd = scenario.sak.frist.krevd_dager ?? 0;
    const resultat = godkjentDager >= krevd ? 'godkjent' : godkjentDager > 0 ? 'delvis_godkjent' : 'avslatt';
    scenario.sak = {
      ...scenario.sak,
      frist: {
        ...scenario.sak.frist,
        bh_resultat: resultat,
        godkjent_dager: godkjentDager,
        bh_respondert_versjon: 0,
      },
    };
    scenario.ui.frist = { ...scenario.ui.frist, draft: null };
  }

  return {
    get sak() { return sak; },
    get scenario() { return scenario; },
    get timeline() { return timeline; },
    get teNavn() { return teNavn; },
    get bhNavn() { return bhNavn; },
    get ansvarDisplay() { return ansvarDisplay; },
    get vederlagDisplay() { return vederlagDisplay; },
    get fristDisplay() { return fristDisplay; },
    get vederlagDomainConfig() { return vederlagDomainConfig; },
    get fristDomainConfig() { return fristDomainConfig; },
    get grunnlagDomainConfig() { return grunnlagDomainConfig; },
    get draftCount() { return draftCount; },
    get scenarios() { return SCENARIOS; },
    selectScenario,
    getUI,
    setDraft,
    sendGrunnlagSvar,
    sendVederlagSvar,
    sendFristSvar,
  };
}

export const store = createStore();
```

- [ ] **Step 2: Verifiser kompilering**

Run: `npx svelte-check --threshold error`
Forvent: Feil i komponenter som fortsatt importerer gammel store — dette er forventet og fikses i Task 4-7.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockup/store.svelte.ts
git commit -m "feat(mockup): ny store wrapper SakState + scenariovalg"
```

---

## Task 4: Oppdater types.ts — fjern produksjons-overlappende typer

**Files:**
- Modify: `src/lib/mockup/types.ts`

- [ ] **Step 1: Slanke types.ts**

Behold kun UI-only typer. Fjern alt som nå dekkes av `SakState` og `derive.ts`.

```typescript
// src/lib/mockup/types.ts
// SporKey bor i scenarios.ts og re-eksporteres herfra for bekvemmelighet
export type { SporKey } from './scenarios.js';
export type Role = 'TE' | 'BH';
export type Mode = 'read' | 'form';
export type RightTab = 'bestemmelser' | 'historikk' | 'vedlegg' | 'begrunnelse' | 'filer';

export interface Provision {
  ref: string;
  title: string;
  text: string;
  note: string | null;
}

export interface Attachment {
  n: string;
  p?: number;
}

export interface InternalNote {
  d: string;
  t: string;
}

export interface Draft {
  text: string;
  value?: number;
}
```

Merk: `SporKey` erstatter `TrackKey` (identisk, men navngitt konsistent med `SporType` i produksjonen). `DraftState` fjernes — erstattes av sjekk `draft !== null`. `TrackData`, `Track`, `TrackTE`, `TrackBH`, `HistoryEvent`, `TrackType`, `TrackStatus` fjernes helt.

- [ ] **Step 2: Commit**

```bash
git add src/lib/mockup/types.ts
git commit -m "refactor(mockup): slanke types.ts, fjern produksjons-overlapp"
```

---

## Task 5: Migrere `Kontrollrommet` + `Header` + `LeftSidebar` + `ActionBar`

**Files:**
- Modify: `src/lib/mockup/Kontrollrommet.svelte`
- Modify: `src/lib/mockup/Header.svelte`
- Modify: `src/lib/mockup/LeftSidebar.svelte`
- Modify: `src/lib/mockup/ActionBar.svelte`

Disse komponentene er «container»-nivå og bruker store-data for navigasjon/layout, ikke for dype domain-felt.

- [ ] **Step 1: Oppdater Kontrollrommet**

Nøkkelendringer:
- Erstatt `store.tracks[sel]` med `store[`${sel}Display`]`
- Beregn `subV/prinV/subF/prinF` fra `store.sak.vederlag` og `store.sak.frist` direkte
- Send `store.vederlagDomainConfig` etc. til skjemaer (etter Task 6)
- Fjern import av `data.ts`

- [ ] **Step 2: Oppdater Header — legg til scenariovelger**

Legg til en `<select>` i header mellom prosjekt-info og rolle-toggle:

```svelte
<div class="scenario-select">
  <select
    class="font-mono"
    value={store.scenario.id}
    onchange={(e) => store.selectScenario(e.currentTarget.value)}
  >
    {#each store.scenarios as s}
      <option value={s.id}>{s.label}</option>
    {/each}
  </select>
</div>
```

Style: `font-size: 11px; background: var(--paper-inset); border: var(--rule); border-radius: 4px; padding: 4px 8px; color: var(--ink-2);`

- [ ] **Step 3: Oppdater LeftSidebar**

Erstatt `store.tracks` iterasjon med:
```typescript
const SPOR: SporKey[] = ['ansvar', 'vederlag', 'frist'];
// I template: bruk store[`${k}Display`] for label/num/verdier
```

- [ ] **Step 4: Oppdater ActionBar**

Minimale endringer — `draftState` prop erstattes med `hasDraft: boolean`, `act()`-funksjonen tilpasses.

- [ ] **Step 5: Verifiser kompilering**

Run: `npx svelte-check --threshold error`

- [ ] **Step 6: Commit**

```bash
git add src/lib/mockup/Kontrollrommet.svelte src/lib/mockup/Header.svelte \
        src/lib/mockup/LeftSidebar.svelte src/lib/mockup/ActionBar.svelte
git commit -m "refactor(mockup): migrere container-komponenter til SakState"
```

---

## Task 6: Migrere BH-skjemaer til SakState-drevet domainConfig

**Files:**
- Modify: `src/lib/mockup/VederlagForm.svelte`
- Modify: `src/lib/mockup/FristForm.svelte`
- Modify: `src/lib/mockup/GrunnlagForm.svelte`

Dette er den viktigste tasken — skjemaene er kjernen.

- [ ] **Step 1: VederlagForm — erstatt hardkodet domainConfig**

Endre fra intern `const domainConfig: VederlagDomainConfig = { ... }` til:
```typescript
let { domainConfig, onsend, onactions }: {
  domainConfig: VederlagDomainConfig;
  onsend: () => void;
  onactions?: (...) => void;
} = $props();
```

Fjern alle hardkodede verdier. Alt annet i skjemaet (formState, computed, preklusjonslinjer, kravlinjer, begrunnelse) forblir uendret — det er allerede ren domenelogikk som tar `domainConfig` som input.

TE-kontekst-blokken øverst utleder verdier fra `domainConfig`:
```svelte
<div class="font-mono context-value">{fmt(domainConfig.hovedkravBelop)},-</div>
```

- [ ] **Step 2: FristForm — erstatt hardkodet domainConfig**

Samme mønster: domainConfig som prop i stedet for intern `const`.

- [ ] **Step 3: GrunnlagForm — erstatt hardkodet domainConfig**

Samme mønster.

- [ ] **Step 4: Oppdater Kontrollrommet til å sende domainConfig**

```svelte
{:else if sel === 'vederlag' && role === 'BH'}
  <VederlagForm
    domainConfig={store.vederlagDomainConfig}
    onsend={handleSend}
    onactions={(a) => (formActions = a)}
  />
```

Tilsvarende for FristForm og GrunnlagForm.

- [ ] **Step 5: Verifiser kompilering + test skjemafunksjon**

Run: `npx svelte-check --threshold error`
Run: `npm run dev` — bytt scenario i dropdown og verifiser at skjemaene viser riktige verdier.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mockup/VederlagForm.svelte src/lib/mockup/FristForm.svelte \
        src/lib/mockup/GrunnlagForm.svelte src/lib/mockup/Kontrollrommet.svelte
git commit -m "feat(mockup): BH-skjemaer mottar domainConfig fra SakState via store"
```

---

## Task 7: Migrere CenterRead + RightSidebar + ConsistencyStrip

**Files:**
- Modify: `src/lib/mockup/CenterRead.svelte`
- Modify: `src/lib/mockup/RightSidebar.svelte`
- Modify: `src/lib/mockup/ConsistencyStrip.svelte`

- [ ] **Step 1: CenterRead — bruk TrackDisplay + SakState**

Erstatt `Track`-prop med `TrackDisplay` + relevante SakState-felt. TE/BH-blokken leser `.teText`/`.bhText` fra display. Draft-data fra `store.getUI(sel)`. Erstatt `TE`/`BH` import med `store.teNavn`/`store.bhNavn`.

- [ ] **Step 2: RightSidebar — historikk fra CloudEvents**

Erstatt `store.evtGrouped` (gammel `HistoryEvent[]`-format) med `store.timeline` (CloudEvents). Templaten endres fra:
```svelte
<!-- Gammelt format -->
{#each Object.entries(store.evtGrouped) as [date, events]}
  <DateSeparator {date} />
  {#each events as e}
    <div>{e.s} — {e.x}</div>
  {/each}
{/each}
```
til:
```svelte
<!-- Nytt format med produksjonens utilities -->
<script>
  import { getEventTypeLabel } from '$lib/constants/eventLabels';
  import { getEventIcon } from '$lib/utils/eventIcons';
  import { extractEventType } from '$lib/types/timeline';
</script>

{#each timeline as event}
  {@const eventType = extractEventType(event.type)}
  {@const label = eventType ? getEventTypeLabel(eventType) : event.type}
  {@const icon = eventType ? getEventIcon(eventType) : null}
  <div class="timeline-event">
    {#if icon}<span style="color: {icon.color}">{icon.symbol}</span>{/if}
    <span>{label}</span>
    {#if event.summary}<span class="event-detail">{event.summary}</span>{/if}
  </div>
{/each}
```

Datogruppering: bruk `event.time` (ISO 8601) og grupper per dag.

Bestemmelser-fanen: kall `sporBestemmelser(sel)` direkte fra `data.ts`-importen.

- [ ] **Step 3: ConsistencyStrip — tilpass til ny store**

Erstatt `store.tracks` med display-data fra store. Erstatt `TE`/`BH`-import.

- [ ] **Step 4: Verifiser kompilering + visuell test**

Run: `npx svelte-check --threshold error`

- [ ] **Step 5: Commit**

```bash
git add src/lib/mockup/CenterRead.svelte src/lib/mockup/RightSidebar.svelte \
        src/lib/mockup/ConsistencyStrip.svelte
git commit -m "refactor(mockup): migrere CenterRead, RightSidebar, ConsistencyStrip til SakState"
```

---

## Task 8: Migrere TE-skjemaer + opprydding

**Files:**
- Modify: `src/lib/mockup/TeVederlagForm.svelte`
- Modify: `src/lib/mockup/TeFristForm.svelte`
- Modify: `src/lib/mockup/TeGrunnlagForm.svelte`
- Modify: `src/lib/mockup/data.ts` — fjern ubrukte eksporter
- Modify: `src/lib/mockup/utils.ts` — fjern `groupByDate()`, `act()` (hvis ubrukt)

TE-skjemaene importerer `store.tracks.vederlag` (som ikke lenger eksisterer) og `TE` fra `data.js`.

- [ ] **Step 1: TeVederlagForm — erstatt `store.tracks.vederlag` med store-display-data**

Erstatt:
- `store.tracks.vederlag` → bruk `store.vederlagDisplay` og `store.sak.vederlag`
- `import { TE } from './data.js'` → bruk `store.teNavn`
- `store.sendTeVederlag(...)` → oppdater til ny store-API

- [ ] **Step 2: TeFristForm — samme mønster**

- [ ] **Step 3: TeGrunnlagForm — samme mønster**

- [ ] **Step 4: Rens `utils.ts` — fjern ubrukte funksjoner**

`groupByDate()` — fjernes (historikk bruker CloudEvents).
`act()` — vurder om ActionBar fortsatt bruker den; fjern eller behold.

- [ ] **Step 5: Verifiser at ingen fil importerer `DD`, `EVT`, `TE`, `BH` fra data.ts**

Run: `grep -rn "DD\|EVT\|' TE '\|' BH '" src/lib/mockup/ --include="*.svelte" --include="*.ts" | grep "from './data"`

- [ ] **Step 6: Full type-check + visuell test**

Run: `npx svelte-check --threshold error`
Run: `npm run dev` — test alle scenarier, begge roller (TE+BH), lese/skjemamodus.

- [ ] **Step 7: Commit**

```bash
git add -u src/lib/mockup/
git commit -m "refactor(mockup): migrere TE-skjemaer, fjern gammel kode"
```

---

## Task 9: /simplify — opprydding av migrert kode

**Files:**
- Alle endrede filer i `src/lib/mockup/`

Kjør `/simplify` på hele mockup-mappen etter at migreringen kompilerer. Fokusområder:

- [ ] **Step 1: Kjør /simplify**

Scope: `src/lib/mockup/`. Se etter:
- **Død kode**: Ubrukte imports, funksjoner, typer som overlevde migreringen
- **Duplikater**: Samme utledning gjort flere steder (bør samles i `derive.ts` eller store)
- **Overflødige abstraksjoner**: `TrackDisplay`-felter som bare forwarded rett gjennom uten transformasjon
- **Inkonsistent navngivning**: Blanding av gammel (`Track`, `TrackKey`) og ny (`SporKey`, `TrackDisplay`) terminologi
- **Ubrukte CSS-klasser**: Stiler for fjernede elementer (action-row, etc.)

- [ ] **Step 2: Fiks identifiserte issues**

- [ ] **Step 3: Verifiser**

Run: `npx svelte-check --threshold error`
Run: `npx vitest run src/lib/mockup/`

- [ ] **Step 4: Commit**

```bash
git add -u src/lib/mockup/
git commit -m "simplify(mockup): fjern død kode og duplikater etter SakState-migrering"
```

---

## Verifiseringssjekkliste

Etter fullført migrering:

- [ ] `npx svelte-check --threshold error` — 0 feil
- [ ] `npx vitest run src/lib/mockup/` — derive-tester grønne
- [ ] `npm run dev` — alle 4 scenarier fungerer (inkl. subsidiært)
- [ ] Scenariovalg i header bytter data i alle komponenter
- [ ] BH-skjemaer viser korrekte domain-verdier per scenario
- [ ] Subsidiært scenario viser stripe + diamond korrekt
- [ ] Historikk-fanen viser CloudEvents med labels/ikoner
- [ ] Kladd-funksjonalitet fungerer (lokal UI-state, kun i subsidiært scenario)
- [ ] Bestemmelser-fanen viser NS 8407-referanser
- [ ] TE-skjemaer fungerer og leser fra SakState
- [ ] `data.ts` inneholder kun `S`, `TRACK_ICONS`, `sporBestemmelser`
- [ ] Ingen referanser til `TrackData`, `Track`, `HistoryEvent`, `DD`, `EVT` gjenstår
