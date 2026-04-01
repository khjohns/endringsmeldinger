# Handoff: Kontraktsbordet — Endringsmeldinger

## Hva dette er

En app for krav om endringsordre etter NS 8407 totalentreprisekontrakt (norsk byggebransje). To parter: TE (totalentreprenør, f.eks. «Byggnor») og BH (byggherre, f.eks. «Kystveien Eiendom»). Tre spor per sak: Ansvarsgrunnlag (K), Vederlag (V), Frist (F). Subsidiær forgreining når ansvar bestrides prinsipalt.

## Prosjektfiler

- `system.md` — Komplett designsystem. **Les denne først.** Den inneholder alle beslutninger: farger, typografi, spacing, depth-strategi, komponentmønstre, og retningsvalg.
- `kontrollrommet-hybrid.jsx` — Opprinnelig mockup i React (lesemodus + skjemamodus). Historisk referanse.

### Svelte 5 mockup-miljø (aktivt)

Mockupen er nå implementert som Svelte 5-komponenter i `src/lib/mockup/` med rute på `/mockup`. Deploybar til Vercel.

**Arkitektur:**
```
src/lib/mockup/
├── store.svelte.ts          # Reaktiv state (tracks + events + handlinger)
├── data.ts                  # Initial mockup-data + konstanter
├── types.ts                 # TypeScript-typer
├── utils.ts                 # Hjelpefunksjoner (fmt, toggleChoice, sporBestemmelser)
├── mockup.css               # Designsystem + delte form-styles
├── Kontrollrommet.svelte    # Hovedshell, ruter TE/BH × 3 spor
├── Header.svelte            # Topplinje med rollebytte + nullstill
├── ConsistencyStrip.svelte  # Kladd-stripe (form mode)
├── LeftSidebar.svelte       # Matrise med DualBar + eksponering
├── CenterRead.svelte        # Lesemodus: dual-posisjon dokumenter
├── RightSidebar.svelte      # Høyrepanel: bestemmelser/historikk/vedlegg
├── ActionBar.svelte         # Sticky bunnlinje
├── CaseAnchor.svelte        # KOE-104 badge + tittel
├── Stamp.svelte             # Gjenbrukbart stempel
├── DualBar.svelte           # Subsidiær/prinsipal-barer
├── DateSeparator.svelte     # Dato-separator i historikk
│
│   # BH-skjemaer (byggherre svarer på krav)
├── GrunnlagForm.svelte      # → grunnlagDomain.ts
├── VederlagForm.svelte      # → vederlagDomain.ts
├── FristForm.svelte         # → fristDomain.ts
│
│   # TE-skjemaer (entreprenør sender/reviderer krav)
├── TeGrunnlagForm.svelte    # → grunnlagDomain.ts (revisjon)
├── TeVederlagForm.svelte    # → vederlagSubmissionDomain.ts
└── TeFristForm.svelte       # → fristSubmissionDomain.ts
```

**Delt domenelogikk:** Alle 6 skjemaer importerer ren TypeScript-domenelogikk direkte fra `src/lib/domain/`. Ingen duplisering — mockup bruker produksjonens `beregnAlt()`, `getDefaults()`, `beregnVisibility()` etc.

**Delt kontraktsdata:** Bestemmelser (§-referanser) bygges fra produksjonens `KONTRAKTSREGLER` + `PARAGRAF_TITLER`. Partsnavn via `getPartsNavn()`.

**Reaktiv store:** `store.svelte.ts` wrapper DD/EVT som `$state`. Skjema-handlinger (send svar/krav) oppdaterer tracks + legger til hendelse i historikk. Lesemodus reflekterer endringer umiddelbart. Nullstill-knapp resetter til initial state.

## Designretning: «Kontraktsbordet»

Metaforen er riggkontoret — der kontraktsadministratoren faktisk jobber. Hybrid av editorial (Newsreader serif for argumenttekst, varme papirtoner) og brutalist (2px borders, box-shadows på knapper/stempler, mørk ID-plate). Tre fonter: Space Grotesk (UI), Newsreader (prosa), JetBrains Mono (data). Én aksent: dyp bygge-oker #B8860B. Null border-radius.

**Signatur:** Dual-posisjonsvisningen (TE/BH side om side med metadata-sidebar + prosa), stempler med rotasjon og shadow, subsidiær sone med oker-diamant.

**Depth-strategi:** Borders for struktur + box-shadows kun på interaktive gjenstander (knapper, stempler). Én sammenhengende logikk: «fysiske objekter på flate overflater».

## Nøkkelbeslutninger allerede tatt

- Sidebar-bakgrunn = canvas (ikke separat farge). Borderen separerer.
- Den mørke ID-platen er signatur, ikke elevasjonsfeil.
- Partsnavn brukes: «Byggnors krav», «Kystveien Eiendoms standpunkt» — ikke «Entreprenørens krav».
- TE bold (700), BH medium (500) — typografisk dualitet.
- Én kontekstavhengig knapp per spor: «Besvar» (tom) / «Fortsett» (kladd) / «Revider svar» (sendt).
- Bestemmelser per spor (ikke per hendelse) i høyrepanel — bygget fra produksjonens kontraktsregler.
- Skjemamodus: Venstre panel skjules. Konsistens-stripe øverst viser status for alle tre spor.
- Draft-seksjon har full dashed border, markert «Internt — ikke synlig for motpart».
- Doble progressbarer: subsidiært (oker) og prinsipalt (rød) per dimensjon.
- Action bar BH: designet venteboks med pulserende oker-prikk, ikke bare tekst.
- Alle skjemaer bruker produksjonens domenelogikk direkte — null arkitektonisk gjeld ved migrering.

## Hva som er ferdig

- ✅ Lesemodus (matrise + argumenter + kontekstpanel med faner)
- ✅ Skjemamodus komplett for alle 3 spor × 2 roller (6 skjemaer)
  - BH: Grunnlag (§32.2 varsling + verdict), Vederlag (preklusjon + metode + kravlinje), Frist (6 porter med full domenelogikk)
  - TE: Grunnlag (revisjon), Vederlag (metode + beløp + særskilte krav), Frist (varsling + utmåling)
- ✅ Reaktiv state: send-handlinger oppdaterer matrise + historikk + eksponering
- ✅ Draft-flyt (kladd som tredje lag, konsistens-stripe)
- ✅ Dual bars (prinsipal/subsidiær eksponering)
- ✅ Stempelsystem (bestridt/subsidiært/kladd/venter)
- ✅ Visuell identitet og designsystem (system.md + mockup.css)
- ✅ Nullstill-knapp for demo

## Designbeslutninger som må tas

### 1. Bekreftelse etter sending
Bruker klikker «Send svar» — hva skjer visuelt?
- Toast/snackbar med «Svar sendt» + angre-mulighet?
- Kort bekreftelsesoverlay før retur til lesemodus?
- Animert overgang (f.eks. resultat-boks «stempel-effekt» som bekrefter)?
- Eller: bare retur til lesemodus med oppdatert data (minimalistisk)?

### 2. Stepper/progresjon i skjema
BH-skjemaer har 3-4 porter (preklusjon → årsak → utmåling → konsekvens). TE-skjemaer har 2-3 seksjoner. Brukeren ser én lang scroll — men vet de hvor de er?
- Horisontal stepper øverst som viser «Port 1 av 4»?
- Vertikal progress-indikator i venstre margin?
- Ingenting — la spørsmålene flyte, vis resultat når alt er besvart?
- Bør dette følge designsystemets brutalist-prinsipper (ingen fancy stepper)?

### 3. Brødsmulesti / navigasjonskontekst i skjema
I dag: CaseAnchor (KOE-104 badge) + «Oversikt»-knapp i header. Er det nok?
- Trenger brukeren å se «Frist → Svar → Utmåling» som brødsmule?
- Eller holder det med spornavn i consistency-stripen?

### 4. «Hva skjer fremover»-indikasjon
Etter BH har sendt svar — hva er neste steg? Mockupen viser oppdatert data, men gir ingen veiledning.
- Action bar med «Avventer Byggnor» (allerede i lesemodus) — er det tydelig nok?
- Eksplisitt «Neste: Byggnor kan svare eller revidere» i konsekvens-boksen?
- Tidslinje/historikk med fremtidige forventede hendelser (ghosted)?

### 5. Draft-persistering
Bruker fyller ut halvveis, lukker tab, kommer tilbake dagen etter.
- Bruk produksjonens `loadDraft`/`saveDraft` (localStorage)?
- Visuell indikator: «Du har en kladd fra i går» ved oppstart?
- Auto-save med status-indikator i header (som i original mockup)?
- Eller: la mockup-miljøet droppe draft og fokusere på flyten?

### 6. Tom tilstand / onboarding
Første gang brukeren åpner en sak — alle spor er tomme.
- Hvordan ser en tom matrise ut?
- Hva er CTA for TE? «Opprett krav» vs. «Varsle endringsordre»?
- Hva ser BH før TE har sendt noe?

### 7. Responsiv / høyrepanel i skjemamodus
Produksjon bruker `FormWithRightPanel` (2-kolonne: skjema | begrunnelse-editor). Mockup har skjema i senter + statisk høyrepanel.
- Skal mockup også ha begrunnelse-editor i høyrepanelet under skjemamodus?
- Eller: beholde bestemmelser/historikk i høyrepanelet (nyttigere kontekst)?
- Mobil: skal høyrepanelet kollapse til FAB som i produksjon?

## Hva som bør bygges videre

### Prioritet 1: Godkjenningsflyt
Prosjektleder fyller ut kladd → sender til seksjonsleder for godkjenning → deretter avdelingsleder → først da sendes til TE. Nye tilstander: «Til godkjenning», «Returnert», «Godkjent». Nye spørsmål å utforske:
- Hvor i layouten lever godkjenningsstatusen?
- Hva ser godkjenneren — samme skjema eller lesemodus med godkjenn-knapp?
- Hvordan vises en returnert kladd med kommentar?
- Trenger vi nye stempler? (f.eks. «TIL GODKJENNING», «RETURNERT»)
- Godkjenningskjede visuelt: enkel statuslinje eller pipeline?

### Prioritet 2: Porteføljevisning
Oversikt over alle saker. «Vi har 12 aktive endringsmeldinger, 4,2M i uløst eksponering, 3 venter på vår respons.» Filtrering, prioritering, samlet eksponering.

### Prioritet 3: Mobil/tablet
Kontraktsadministratoren er av og til på byggeplassen med nettbrett.

### Prioritet 4: Veiledningslag
Kontekstuell hjelp koblet til kontraktsbestemmelser. Flagge typiske svakheter i argumenter, vise relevant KOFA-praksis.

## Skill og arbeidsmetode

Bruk `interface-design` skill. Les system.md først og bygg i tråd med den. Kjør swap-test, squint-test og signature-test før presentasjon. Alle valg må ha et «hvorfor».

## Tone

Norsk. Direkte. Diskuter design og UX grundig før bygging. Bruk partsnavn, ikke forkortelser. Vis mockups som fungerende Svelte 5-komponenter med Kontraktsbordet-design.
