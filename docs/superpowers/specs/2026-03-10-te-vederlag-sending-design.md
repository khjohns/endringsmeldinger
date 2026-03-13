# TE Vederlagskrav — Designspec

**Dato:** 2026-03-10
**Scope:** TE sender/redigerer vederlagskrav (NS 8407 §34). Ikke BH-svar.

---

## Ruting

`/[prosjektId]/[sakId]/send-vederlag/`

Håndterer både nytt krav og redigering. Scenario utledes fra case state: finnes `vederlag_krav_sendt`-event → edit. Samme mønster som `svar-grunnlag`.

## Komponentarkitektur

```
send-vederlag/+page.svelte          ← loader + two-panel grid (3fr/2fr)
  ├─ FormPageHeader                  ← gjenbruk (tilbake, eyebrow, metadata)
  ├─ TeVederlagForm                  ← ny: formstate + felt
  │    ├─ SegmentedControl           ← metodevalg (3 valg)
  │    ├─ NumberInput × 1-2          ← beløp / kostnadsoverslag
  │    ├─ Checkbox × 0-1             ← justert EP / varslet før oppstart
  │    └─ kravlinje-container        ← særskilte krav (2× NumberInput)
  └─ BegrunnelseThread               ← gjenbruk fra bh-response
       (tabs + editor + vedlegg med tagging + avbryt/send)
```

## Sidelayout

Two-panel grid identisk med svar-grunnlag:

```
.response-panels {
  display: grid;
  grid-template-columns: 3fr 2fr;
}
```

Mobil (<768px): FAB "Begrunnelse" → fullscreen overlay. Identisk med svar-grunnlag.

## Midtpanel — Seksjoner

### 1. Beregningsmetode §34

`SegmentedControl` med tre valg: Enhetspriser / Regningsarbeid / Fastpris.
Under: dynamisk forklaringstekst (13px, ink-secondary) fra `VEDERLAGSMETODE_DESCRIPTIONS`.
Edit-modus: forhåndsvalgt, låst (metode kan ikke endres etter sending).

### 2. Metode-spesifikke felt (betinget synlighet)

| Metode | Felt |
|--------|------|
| Enhetspriser | `NumberInput` "Beløp" (suffix "kr") + `Checkbox` "Krever justerte enhetspriser §34.3.3" |
| Regningsarbeid | `NumberInput` "Kostnadsoverslag" (suffix "kr") + `Checkbox` "Varslet før oppstart §34.2.2" |
| Fastpris | `NumberInput` "Beløp" (suffix "kr") |

Synlighet styrt av `beregnVisibility({ metode })` fra vederlagSubmissionDomain.

### 3. Særskilte krav §34.1.3

Kravlinje-container (innfelt canvas-boks):

```
bg: var(--color-canvas)
border: 1px solid var(--color-wire)
radius: var(--radius-md)
padding: var(--spacing-4)
floating label: "SÆRSKILTE KRAV §34.1.3" (10px uppercase ink-ghost, bg felt)
separator mellom poster: 1px dashed var(--color-wire)
```

Innhold: to NumberInput-felt (Rigg og drift, Produktivitetstap) uten checkboxes.
Helptext over feltene: "Oppgi beløp hvis relevant".
Tomt felt = ikke krevd. Beløp > 0 = krevd. Derivert, ikke eksplisitt toggle.

### 4. Ingen vedlegg i midtpanel

Vedlegg håndteres utelukkende i høyrepanelet.

## Høyrepanel — BegrunnelseThread

Gjenbruker BegrunnelseThread fra bh-response med:
- `editorRolle: 'TE'`
- `entries: []` (ny) / `[prev TE-begrunnelse]` (edit)
- Venstrekant: `1px solid var(--color-wire-strong)` — identisk med ny sak og svar-grunnlag
- submitLabel: "Send krav §34" (ny) / "Oppdater krav §34" (edit)

### Vedlegg-tagging (ny funksjonalitet)

Hver opplastet fil får tag-pills som kan toggles:

```
┌ timelister_uke42-45.xlsx ─── 142 KB ─────────┐
│  ○ Hovedkrav  ● Rigg/Drift  ● Produktivitet  │
└────────────────────────────────────────────────┘
```

Tag-styling fra mock:
```
background: transparent
border: 1px solid var(--color-wire-strong)
font-size: 10px, weight 600, uppercase, tracking 0.05em
padding: 4px 10px
border-radius: 9999px (pill)
active: bg var(--color-ink), color var(--color-canvas), border var(--color-ink)
```

Synlige tags er dynamiske — basert på hvilke kravlinjer som har beløp > 0.
"Hovedkrav" alltid synlig (metode valgt = hovedkrav finnes).
"Rigg/Drift" synlig når belopRigg > 0.
"Produktivitet" synlig når belopProduktivitet > 0.

Tags kommuniseres fra form → panel via callback `onkravlinjer`.

## Formstate

```typescript
$state:
  metode: VederlagsMetode | undefined
  belopDirekte: number | undefined       // Enhetspriser / Fastpris
  kostnadsOverslag: number | undefined   // Regningsarbeid
  kreverJustertEp: boolean               // Enhetspriser only
  varsletForOppstart: boolean            // Regningsarbeid only
  belopRigg: number | undefined          // særskilt krav
  belopProduktivitet: number | undefined // særskilt krav
  begrunnelseHtml: string                // i høyrepanel

$derived:
  harRiggKrav = (belopRigg ?? 0) > 0
  harProduktivitetKrav = (belopProduktivitet ?? 0) > 0
  visibility = beregnVisibility({ metode })
  canSubmit = beregnCanSubmit(mappedState)
  placeholder = getDynamicPlaceholder(metode)
  aktiveTags = computed fra metode + harRiggKrav + harProduktivitetKrav
```

Ingen datofelter — dato = innsendingstidspunkt.

## Edit-modus

- Scenario utledes i +page.svelte fra timeline (vederlag_krav_sendt event)
- `getDefaults({ scenario: 'edit', existing })` pre-fyller
- SegmentedControl låst (disabled)
- Eyebrow: "Oppdater vederlagskrav"
- Begrunnelse pre-fylt fra forrige versjon

## Domenelogikk

All logikk fra `vederlagSubmissionDomain.ts`:
- `getDefaults()` — initialisering/pre-fill
- `beregnVisibility()` — betinget synlighet
- `beregnCanSubmit()` — validering
- `getDynamicPlaceholder()` — editor-placeholder
- `buildEventData()` — event payload
- `getEventType()` — event type (ny/oppdatert)

## Validering

- Metode valgt (required)
- EP/Fastpris: belopDirekte required
- Regningsarbeid: kostnadsoverslag valgfritt (§30.2)
- Begrunnelse ≥ 10 tegn

## Nye/endrede filer

| Fil | Type |
|-----|------|
| `src/routes/[prosjektId]/[sakId]/send-vederlag/+page.svelte` | Ny |
| `src/lib/components/te-vederlag/TeVederlagForm.svelte` | Ny |
| `BegrunnelseThread.svelte` | Endring: vedlegg-tagging |
