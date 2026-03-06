# Plan: Redigering av grunnlag — TE-revisjon og BH-oppdatering

## Kontekst

Grunnlag-sporet støtter to redigeringsflyter:
- **TE revisjon** (`grunnlag_oppdatert`): TE sender ny versjon → Rev. N+1. Kun begrunnelse kan endres.
- **BH oppdatering** (`respons_grunnlag_oppdatert`): BH endrer sitt eget standpunkt → forblir Rev. N.

Begge flyter kan skje **uavhengig av hverandre** — BH trenger ikke vente på ny TE-revisjon for å endre svar.

## Arkitekturbeslutninger

### A1: Gjenbruk vs. ny komponent for BH-oppdatering

**Beslutning: Gjenbruk `BhGrunnlagResponse`** med forbedret `isUpdateMode`.

Begrunnelse: BH-oppdatering bruker nøyaktig samme skjemafelt (varsling, resultat, begrunnelse).
Forskjellen er bare: pre-fylt med forrige verdier + endringsdeksjon + annen knappetekst.
Ny komponent ville duplisert ~90% av koden.

### A2: TE-revisjon — ny komponent eller gjenbruk?

**Beslutning: Ny komponent `TeGrunnlagRevisjon`** + ny rute `/rediger-grunnlag`.

Begrunnelse: TE-flyt har fundamentalt annet layout:
- Midtpanel er **lesemodus** (BHs svar + låste felter)
- Høyrepanel er **skrivemodus** (kun begrunnelse-editor)
- Ingen varsling/resultat-skjemafelt
- Trenger `endrings_begrunnelse`-felt (hva er endret)

Å tvinge dette inn i BhGrunnlagResponse med conditionals ville gjort komponenten uleselig.

### A3: Ruting — query-param vs. egen rute

**Beslutning:**
- BH oppdatering: Samme rute `svar-grunnlag` — `isUpdateMode` utledes fra state (`!!bh_resultat`)
- TE revisjon: Ny rute `rediger-grunnlag` — helt annet layout og logikk

### A4: Domenelogikk — utvide eksisterende vs. ny fil

**Beslutning: Utvide `grunnlagDomain.ts`** med nye funksjoner for:
- Pre-fill med forrige BH-verdier (inkl. varsling)
- Endringsdeteksjon (hva har BH endret fra forrige svar)
- TE-revisjon event data building

Filen er allerede organisert med tydelige seksjoner og er på 193 linjer.
Nye funksjoner følger samme mønster.

### A5: BegrunnelseThread — editor-rolle

**Beslutning: Legg til `editorRolle`-prop** på BegrunnelseThread.

I dag antar den alltid BH-editor. Med TE-revisjon trenger vi TE-editor.
Prop `editorRolle: 'TE' | 'BH'` styrer badge og label ("Ditt svar" vs "Din reviderte begrunnelse").

## Steg

### Steg 1: Utvid domenelogikk (`grunnlagDomain.ts`)

**Filer:** `src/lib/domain/grunnlagDomain.ts`, `src/lib/domain/__tests__/grunnlagDomain.test.ts`

Nye funksjoner:

```typescript
// Pre-fill for BH-oppdatering — inkluderer varsling fra state
export function getBhUpdateDefaults(config: {
  forrigeResultat: GrunnlagResponsResultat;
  forrigeVarsletITide?: boolean;
  forrigeBegrunnelseHtml?: string;
}): GrunnlagFormState

// Endringsdeteksjon — sammenligner nåværende form med forrige verdier
export interface EndringsInfo {
  harEndring: boolean;
  endringer: Array<{
    felt: 'resultat' | 'varsletITide' | 'begrunnelse';
    type: 'snuoperasjon' | 'frafaller_innsigelse' | 'ny_innsigelse' | 'trekker_godkjenning' | 'endret';
    beskrivelse: string;
  }>;
}

export function detekterEndringer(
  state: GrunnlagFormState,
  forrige: { resultat: GrunnlagResponsResultat; varsletITide?: boolean; begrunnelse?: string },
): EndringsInfo

// TE-revisjon event data
export function buildTeRevisionEventData(config: {
  originalEventId: string;
  begrunnelseHtml: string;
  endringsBegrunnelse: string;
}): Record<string, unknown>
```

Tester:
- `getBhUpdateDefaults` pre-fyller korrekt
- `detekterEndringer` finner snuoperasjon, frafalt innsigelse, ny innsigelse, trekker godkjenning
- `buildTeRevisionEventData` bygger korrekt payload

### Steg 2: Forbedre BH-oppdateringsflyt i `BhGrunnlagResponse`

**Filer:**
- `src/lib/components/bh-response/BhGrunnlagResponse.svelte`
- `src/routes/[prosjektId]/[sakId]/svar-grunnlag/+page.svelte`

Endringer i `+page.svelte`:
- Hent `forrigeVarsletITide` fra `state.grunnlag.grunnlag_varslet_i_tide`
- Hent `forrigeBegrunnelseHtml` fra siste `respons_grunnlag` event i timeline
- Hent `lastResponseEventId` fra siste respons-events `id`
- Send alt som nye props til `BhGrunnlagResponse`

Endringer i `BhGrunnlagResponse.svelte`:

a) **Nye props:**
```typescript
interface Props {
  // ... eksisterende ...
  forrigeVarsletITide?: boolean;
  forrigeBegrunnelseHtml?: string;
  lastResponseEventId?: string;
}
```

b) **Pre-fill i oppdateringsmodus:**
- Initialisér `varsletITide` fra `forrigeVarsletITide` (ikke `undefined`)
- Initialisér `resultat` fra `forrigeResultat`
- Initialisér `bhBegrunnelseHtml` fra `forrigeBegrunnelseHtml`

c) **Endringsdeteksjon:**
- Bruk `detekterEndringer()` for å vise inline advarsler
- Vis under Varsling-seksjonen: "⚠ Frafaller innsigelse om varsling"
- Vis under Resultat-seksjonen: "⚠ Snuoperasjon" / "⚠ Trekker godkjenning"

d) **Knappetekst:**
- Ny modus: "Send svar" → oppdatering: "Oppdater svar"

e) **Implementer submit handler:**
- Bruk `buildEventData()` med `isUpdateMode` + `lastResponseEventId`
- Kall `submitEvent(sakId, eventType, data)`
- `eventType`: `'respons_grunnlag'` (ny) eller `'respons_grunnlag_oppdatert'` (oppdatering)
- Naviger tilbake til saksark ved suksess

### Steg 3: Ny rute og komponent for TE-revisjon

**Nye filer:**
- `src/routes/[prosjektId]/[sakId]/rediger-grunnlag/+page.svelte`
- `src/lib/components/te-revision/TeGrunnlagRevisjon.svelte`

`+page.svelte` (loader):
- Hent case context via `createCaseContextQuery`
- Utled: grunnlagState, BHs siste svar (resultat + begrunnelse), TEs siste begrunnelse
- Finn `originalEventId` fra siste `grunnlag_opprettet`/`grunnlag_oppdatert` event

`TeGrunnlagRevisjon.svelte`:

Layout: to-panel (midtpanel lesemodus + høyrepanel editor)

**Midtpanel (lesemodus):**
- `SammendragKort` — låste felter (kategori, hjemmel, dato, versjon)
- Info-callout: "Du kan kun oppdatere din begrunnelse."
- BHs gjeldende standpunkt:
  - Verdikt-badge (Godkjent/Avslått)
  - Varslingsvurdering (§32.2: Ja/Nei)
  - BHs begrunnelse (read-only HTML)
  - Dato for siste svar/oppdatering
- Footer: [Avbryt] [Send revisjon]

**Høyrepanel (editor):**
- `BegrunnelseThread` med `editorRolle='TE'`
- Entries: hele forhandlingshistorikken (TE v1 → BH v1 → TE v2 → BH v2 → ...)
- Editor pre-fylt med TEs siste begrunnelse
- Eget felt: "Endringsbegrunnelse" — kort tekst om hva som er endret

**Validering:**
- Begrunnelse må ha innhold
- Endringsbegrunnelse må ha innhold (minst 10 tegn)

**Submit:**
- Kall `buildTeRevisionEventData()`
- Event type: `'grunnlag_oppdatert'`
- Naviger tilbake til saksark

### Steg 4: Utvid `BegrunnelseThread` med rollefleksibilitet

**Fil:** `src/lib/components/bh-response/BegrunnelseThread.svelte`

Endringer:
- Ny prop: `editorRolle?: 'TE' | 'BH'` (default: `'BH'`)
- Editor-label: `editorRolle === 'TE' ? 'Din reviderte begrunnelse' : 'Ditt svar'`
- Badge: `editorRolle`-verdi
- Entries: Vis verdikt-badge på BH-entries (selv når kollapsert)
  - Utvid `BegrunnelseEntry` interface med valgfritt `resultat?: string`
  - Vis inline: `BH v1 · Avslått` i header

### Steg 5: Rollebevisst routing i SporkortHeader

**Fil:** `src/lib/components/saksmappe/SporkortHeader.svelte`

Endringer i `handleAction`:
```typescript
function handleAction(e: MouseEvent) {
  e.stopPropagation();
  if (sporType === 'grunnlag') {
    // Role from localStorage
    const role = localStorage.getItem('koe-user-role');
    if (role === 'TE') {
      goto(`/${prosjektId}/${sakId}/rediger-grunnlag`);
    } else {
      goto(`/${prosjektId}/${sakId}/svar-grunnlag`);
    }
  }
}
```

Action-labels i `Sporkort.svelte` (allerede korrekt):
- TE: "Oppdater" (for delvis_godkjent/under_forhandling)
- BH: "Svar" (ny) / "Endre svar" (oppdatering) ← trenger oppdatert label-logikk

Legg til BH oppdateringslogikk:
```typescript
// I roleAction for grunnlag:
const bhHarSvart = sakState.grunnlag.bh_resultat !== undefined;
const bhLabel = bhHarSvart ? 'Endre svar' : 'Svar';
```

## Avhengighetsrekkefølge

```
Steg 1 (domenelogikk)
  ↓
Steg 4 (BegrunnelseThread)
  ↓
Steg 2 (BH oppdatering) ←── bruker steg 1 + 4
Steg 3 (TE revisjon)    ←── bruker steg 1 + 4
  ↓
Steg 5 (routing)         ←── trenger steg 2 + 3 for å ha mål-ruter
```

Steg 2 og 3 kan gjøres parallelt etter steg 1+4.

## Filendringer oppsummert

| Fil | Type | Beskrivelse |
|-----|------|-------------|
| `src/lib/domain/grunnlagDomain.ts` | Endre | +3 funksjoner |
| `src/lib/domain/__tests__/grunnlagDomain.test.ts` | Endre | +tester for nye funksjoner |
| `src/lib/components/bh-response/BhGrunnlagResponse.svelte` | Endre | Pre-fill, endringsdeteksjon, submit |
| `src/lib/components/bh-response/BegrunnelseThread.svelte` | Endre | editorRolle-prop, verdikt på entries |
| `src/routes/[prosjektId]/[sakId]/svar-grunnlag/+page.svelte` | Endre | Nye props til komponent |
| `src/routes/[prosjektId]/[sakId]/rediger-grunnlag/+page.svelte` | **Ny** | TE revisjon loader |
| `src/lib/components/te-revision/TeGrunnlagRevisjon.svelte` | **Ny** | TE revisjon komponent |
| `src/lib/components/saksmappe/SporkortHeader.svelte` | Endre | Rollebevisst routing |
| `src/lib/components/saksmappe/Sporkort.svelte` | Endre | "Endre svar"-label for BH |
