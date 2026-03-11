# BH Svar på Vederlagskrav — Designspesifikasjon

## Dato: 2026-03-11

## Oversikt

Byggherre (BH) skal kunne svare på TEs vederlagskrav. Dette er det mest komplekse sporet i KOE — fire evalueringsporter med kaskaderende synlighet, per-kravlinje vurdering, og subsidiær logikk.

## Route

`/[prosjektId]/[sakId]/svar-vederlag` → BH svarer på TEs vederlagskrav.

## Domenemodell (vederlagDomain.ts)

Fire porter:
1. **Preklusjon** — varsletITide per kravlinje (§34.1.2 hovedkrav for SVIKT/ANDRE, §34.1.3 særskilte)
2. **Beregningsmetode** — akseptererMetode, evt. ønsketMetode (§34.2)
3. **Beløp** — per-kravlinje vurdering: godkjent/delvis/avslått + godkjentBeløp (§34.1)
4. **Begrunnelse** — i BegrunnelseThread (høyrepanelet)

### Forenklet fra domenet

- **EP-justering (§34.3.3):** Håndteres via begrunnelsestekst, ikke UI-kontroll
- **Tilbakeholdelse (§30.2):** TE er tvunget til kostnadsoverslag ved regningsarbeid, så `kanHoldeTilbake` er alltid false — droppet fra UI

### Subsidiær logikk

- `erSubsidiaer`: Hele vederlag er subsidiært når grunnlag avslått eller §32.2-prekludert
- Prekluderte kravlinjer **forsvinner ikke** — de vurderes alltid, men resultatet havner i subsidiært standpunkt
- Visuell markering: dashed vekt border-left + "Subsidiært"-label på prekluderte kravlinjer

## Sidestruktur

### VederlagSammendrag (TEs krav, read-only)

Én sammenhengende seksjon med SectionHeading "Vederlagskrav" §34.1:

```
Beregningsmetode: Regningsarbeid (§34.2)

Hovedkrav ························ kr 1 234 567
Rigg og drift ···················· kr   456 789
Produktivitetstap ················ kr   234 567
──────────────────────────────────────────────
Sum krevd ························ kr 1 925 923

[TEs begrunnelse — clamped med "Vis mer"]
```

Metode er en datalinje, ikke egen seksjon. Kravlinjer bruker font-data, tabular-nums, høyrejustert.

### Byggherrens standpunkt

Overgangen fra lesing til handling markeres med `<SectionHeading title="Byggherrens standpunkt" />`.

#### SubsidiaerBanner (conditional)

Vist når `erSubsidiaer`. Amber gul-lapp-stil (vekt-bg, dashed vekt border-left).
- Grunnlag avslått: "Grunnlaget er avslått. Vurderingen gjelder for det tilfelle at grunnlaget likevel godkjennes."
- §32.2: "Grunnlaget ble varslet for sent (§32.2). Hele vederlagskravet behandles subsidiært."

#### Preklusjon §34.1.2 / §34.1.3 (conditional)

Vist når `harPreklusjonsSteg`. FormSection med helptext om varslingsfrister.

Per-kravlinje rader:
- Hovedkrav (§34.1.2) — kun for SVIKT/ANDRE kategorier
- Rigg og drift (§34.1.3) — kun hvis harRiggKrav
- Produktivitetstap (§34.1.3) — kun hvis harProduktivitetKrav

Hver rad: label + SegmentedButtons [Ja, i tide | Nei, prekludert].

#### Beregningsmetode §34.2

Kompakt FormSection. Helptext nevner TEs valgte metode.
- "Aksepterer du beregningsmetoden?" → SegmentedButtons [Ja | Nei]
- Hvis Nei: "Foretrukket metode:" → SegmentedControl med gjenværende alternativer

#### Per-kravlinje evaluering §34.1

Én FormSection per kravlinje (1-3 stk):

1. **Hovedkrav** (§34.1.1–34.1.2) — alltid
2. **Rigg og drift** (§34.1.3) — kun hvis harRiggKrav
3. **Produktivitetstap** (§34.1.3) — kun hvis harProduktivitetKrav

Hver kravlinje:
- SectionHeading med navn + §-ref
- "Krevd: kr X" (font-data, inline)
- SegmentedButtons [Godkjent | Delvis godkjent | Avslått]
- Conditional: NumberInput for godkjentBeløp (ved "Delvis")
- Hvis prekludert: dashed vekt border-left + vekt-bg + "Subsidiært"-label

#### VederlagKonsekvens

Resultat-callout som arver KonsekvensCallout-mønster:
- Prinsipalt resultat med krevd → godkjent beløp
- Subsidiært resultat (conditional) med inkluderte prekluderte krav

## Komponentarkitektur

```
svar-vederlag/+page.svelte (route — data derivation, TanStack Query)
└── BhVederlagResponse.svelte (form orchestrator, eier FormWithRightPanel)
    └── FormWithRightPanel
        ├── [midtpanel]
        │   ├── FormPageHeader
        │   ├── VederlagSammendrag
        │   ├── SectionHeading "Byggherrens standpunkt"
        │   ├── [conditional] SubsidiaerBanner
        │   ├── [conditional] FormSection "Preklusjon"
        │   ├── FormSection "Beregningsmetode"
        │   ├── FormSection × 1-3 (per kravlinje)
        │   └── VederlagKonsekvens
        └── [høyrepanel — BegrunnelseThread]
```

### Nye komponenter

| Komponent | Plassering | Formål |
|---|---|---|
| `BhVederlagResponse.svelte` | `src/lib/components/bh-response/` | Form orchestrator |
| `VederlagSammendrag.svelte` | `src/lib/components/bh-response/` | TEs krav read-only |
| `SubsidiaerBanner.svelte` | `src/lib/components/bh-response/` | Amber kontekst-callout |
| `VederlagKonsekvens.svelte` | `src/lib/components/bh-response/` | Resultat prinsipalt+subsidiært |

### Gjenbrukte komponenter

FormPageHeader, FormWithRightPanel, FormSection, SectionHeading, SegmentedButtons, SegmentedControl, NumberInput, BegrunnelseThread, RichTextEditor.

## Route-fil (data derivation)

Følger svar-grunnlag mønsteret:
1. `createCaseContextQuery` for case state + timeline
2. Fra `state.vederlag`: derive domainConfig (metode, beløp, kravlinjer, kategori, etc.)
3. Fra timeline: finne `vederlag_krav_sendt` event for TEs begrunnelseHtml
4. Fra timeline: finne evt. `respons_vederlag` event for edit mode
5. Passe alt til `<BhVederlagResponse>`

## Interaksjonsdesign

- Preklusjon → kravlinje: Prekluderte kravlinjer markeres med subsidiær-stil, men forblir synlige og evaluerbare
- Metode Nei → foretrukket: Smooth expand (150ms ease)
- Delvis → beløp: NumberInput glir inn under SegmentedButtons
- Alle collapsible felt bruker 150ms ease transition

## Validering (kanSende)

Krever at alle synlige porter har verdier:
- Preklusjon: alle toggler satt (når harPreklusjonsSteg)
- Metode: akseptererMetode satt + ønsketMetode (hvis nei)
- Beløp: alle kravlinjer har vurdering + beløp (hvis delvis)
- Begrunnelse: ikke tom HTML

## Event types

- Ny respons: `respons_vederlag`
- Oppdatering: `respons_vederlag_oppdatert`
- Payload: `buildEventData(state, config)` fra vederlagDomain.ts

## Visuelt vokabular

Alt fra system.md. Spesifikt:
- Preklusjons-toggler: SegmentedButtons med waiting/critical stempel
- Subsidiær kravlinje: `border-left: 2px dashed var(--vekt)`, `vekt-bg`
- VederlagSammendrag kravlinjer: font-data, tabular-nums, høyrejustert ("The Tabular Wall")
- Sum-linje: `border-top: 1px solid var(--wire)`
- Konsekvens: grønn (godkjent), rød (avslått), amber (delvis/subsidiært)
