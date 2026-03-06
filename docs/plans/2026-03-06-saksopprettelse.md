# Plan: Saksopprettelse — TE oppretter ny KOE-sak

## Designbeslutning

**Formfaktor:** Dedikert side `/[prosjektId]/ny` med fokusert single-column layout (max-width 680px, sentrert). Etter opprettelse navigerer brukeren til saksmappen.

**Hvorfor ikke tre-panel:** Ved opprettelse har saken kun grunnlag-spor. Vederlag og frist er ikke relevante ennå. Et tre-panel layout med to disabled paneler er bortkastet skjermplass. Den fokuserte formen guider TE gjennom varslingsprosessen uten distraksjoner.

**Domenemodell:** Å opprette en sak = å sende et varsel (§32.2). Skjemaet fyller ut data for to events: `sak_opprettet` + `grunnlag_opprettet`, som sendes atomisk.

---

## Skjemastruktur (topp → bunn)

### Header
- Tilbake-lenke: "← Tilbake til saksoversikt"
- Overskrift: "Nytt varsel" (font-ui, 16px, weight 600)
- Under: "Ny KOE-sak" (font-data, 11px, ink-muted)

### Seksjon 1: KATEGORI §33.1
- 4 knapper i rad: Endringer (§33.1 a), Svikt (§33.1 b), Andre (§33.1 c), Force Majeure (§33.3)
- Valgt knapp: vekt bakgrunn, hvit tekst
- Under valgt: **kontraktsregel-inline** som viser beskrivelse av valgt kategori
- Bruker eksisterende `KRAV_STRUKTUR_NS8407` fra `categories.ts`

### Seksjon 2: HJEMMEL (skjules ved Force Majeure)
- Grouped `<select>` med optgroups per `gruppe`-felt fra hjemler
- Under valgt: **kontraktsregel-inline** med §-ref og beskrivelse
- Bruker `getGrupperteHjemler()` fra `categories.ts`

### Seksjon 3: DETALJER
- **Tittel** — text input
- **Beskrivelse** — textarea (min-height 72px)
- **Dato oppdaget** — date input (font-data for verdi)
  - Helper under: "X dager siden" med fargekode (normal/amber/rød)

### Seksjon 4: VARSLING §32.2
- Checkbox: "Varsel sendes nå" (default: checked)
  - Hint: "Sendes i dag sammen med dette skjemaet"
- Når unchecked (varsel allerede sendt):
  - Conditional reveal med border-left:
    - **Preklusjonsadvarsel** (basert på dager mellom oppdagelse og varsel)
      - 3-13 dager: amber warning callout
      - ≥14 dager: rød danger callout (preklusjonsfare)
    - **Dato varsel ble sendt** — date input
    - **Varselmetode** — multi-checkbox inline (E-post, Brev, Byggemøtereferat, Prosjekthotell)

### Seksjon 5: BEGRUNNELSE
- Label: "Begrunnelse for kravet" med TE-badge
- Rich text editor (Tipex/Tiptap) med vekt-dim border
- Placeholder: kontekstavhengig basert på valgt kategori
- Tips-tekst under

### Seksjon 6: VEDLEGG
- Upload drop zone (dashed border, hover → vekt tint)
- "Dra filer hit · PDF, DOCX"

### Force Majeure callout
- Når FORCE_MAJEURE er valgt: info callout
- "Gir kun rett til fristforlengelse, ikke vederlag. Hjemmelfeltet skjules."

### Footer (sticky bunn eller inline)
- Venstre: "Avbryt" (btn-secondary)
- Høyre: "Send varsel §32.2" (btn-primary med §-ref)

---

## Filer som opprettes/endres

### Nye filer
1. `src/routes/[prosjektId]/ny/+page.svelte` — Sidekomponenten
2. `src/lib/components/case-create/CaseCreateForm.svelte` — Hovedskjema
3. `src/lib/components/case-create/KategoriVelger.svelte` — 4-knapp kategori-selektor
4. `src/lib/components/case-create/HjemmelVelger.svelte` — Grouped dropdown
5. `src/lib/components/case-create/KontraktsregelInline.svelte` — §-visning
6. `src/lib/components/case-create/VarslingSection.svelte` — Varsling-seksjonen
7. `src/lib/components/case-create/PreklusjonsCallout.svelte` — Preklusjonsadvarsler
8. `src/lib/api/caseCreate.ts` — API-kall for saksopprettelse

### Endrede filer
9. `src/routes/[prosjektId]/+page.svelte` — Legg til "Ny sak"-knapp i sakslisten
10. `src/lib/components/saksoversikt/OversiktSidebar.svelte` — "Ny sak"-knapp i sidebar

---

## Dataflyt

### Skjema → Event
```
Form state → GrunnlagEventData:
  tittel          → tittel
  kategori.kode   → hovedkategori
  hjemmel.kode    → underkategori
  beskrivelse     → beskrivelse
  datoOppdaget    → dato_oppdaget
  varselSendesNaa → grunnlag_varsel (null hvis sendes nå, ellers {dato_sendt, metode})
  begrunnelse     → (sendes som del av grunnlag begrunnelse)
```

### Submit-flyt
1. Generer ny `sak_id` (UUID eller la backend generere)
2. POST til `/api/events` med `sak_opprettet` + `grunnlag_opprettet`
   - Alternativt: Ny endpoint `/api/cases` som tar hele payloaden
3. Ved suksess: `goto(`/${prosjektId}/${sakId}`)`
4. Invalidate case list query

### Validering
- Kategori: påkrevd
- Hjemmel: påkrevd (unntak: Force Majeure har ingen hjemler)
- Tittel: påkrevd, min 5 tegn
- Beskrivelse: påkrevd
- Dato oppdaget: påkrevd
- Begrunnelse: valgfri (men anbefalt)

---

## Designtokens brukt

Alle fra system.md / app.css:
- Overflater: canvas, felt, felt-raised
- Tekst: ink, ink-secondary, ink-muted, ink-ghost
- Border: wire, wire-strong, wire-focus
- Aksent: vekt, vekt-dim, vekt-bg, vekt-bg-strong
- Semantisk: score-high/score-low for preklusjonsadvarsler
- Font: font-ui for labels, font-data for §-ref og datoer
- Spacing: 4px grid
- Radius: sm (2px), md (4px), lg (6px)

---

## Implementasjonsrekkefølge

1. **Rute + sideshell** — `/[prosjektId]/ny/+page.svelte` med back-lenke og header
2. **KategoriVelger** — 4-knapp valg med kontraktsregel-inline
3. **HjemmelVelger** — Grouped dropdown med kontraktsregel-inline
4. **Detaljfelt** — Tittel, beskrivelse, dato oppdaget
5. **VarslingSection** — Checkbox-toggle med conditional reveal
6. **PreklusjonsCallout** — Beregning og visning av advarsler
7. **Begrunnelse** — Rich text editor
8. **Vedlegg** — Upload zone (placeholder/stub)
9. **Submit-logikk** — API-kall, validering, navigasjon
10. **"Ny sak"-knapp** i saksliste/sidebar
