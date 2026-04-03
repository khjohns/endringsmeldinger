# Handoff: Kontraktsbordet — Endringsmeldinger

## Hva dette er

En app for krav om endringsordre etter NS 8407 totalentreprisekontrakt (norsk byggebransje). To parter: TE (totalentreprenør, f.eks. «Byggnor») og BH (byggherre, f.eks. «Kystveien Eiendom»). Tre spor per sak: Ansvarsgrunnlag (K), Vederlag (V), Frist (F). Subsidiær forgreining når ansvar bestrides prinsipalt.

## Veddemålet

Denne mockupen er ikke en throwaway-prototype. Den er et veddemål på at vi kan bygge et bedre produkt enn den eksisterende produksjonen — med bedre design, bedre UX, og null teknisk gjeld. Beløp: 100 USD.

**Reglene:**
- Mockupen skal være produksjonsklar kode, ikke wireframes
- Samme domenelogikk, samme editor-stack, samme typer som produksjon
- Enhver feature i mockupen skal ha full paritet med tilsvarende produksjonsfeature
- Når designet er ferdig, skal mockup-koden kunne erstatte produksjonskomponentene uten omskriving
- Forenklinger er OK for demo-data (hardkodet KOE-104), men kodestiene må være komplette

**Hva «null gjeld» betyr konkret:**
- Alle state-variabler som produksjon har, skal mockupen ha (rigg, produktivitet, oensketMetode etc.)
- Alle valideringssjekker som produksjon har, skal mockupen ha (isHtmlEmpty, metode-sjekk etc.)
- Data-drevne arrays (preklusjonsLinjer, kravlinjer) — ikke hardkodede enkelt-felter
- Ekte RichTextEditor med LockedValueNode, ikke textarea-placeholders
- Auto-generert begrunnelse med token-system, ikke statisk tekst

## Prosjektfiler

- `system-v2.md` — Komplett designsystem v2. **Les denne først.** Den inneholder alle beslutninger: farger, typografi, spacing, depth-strategi, komponentmønstre, dark mode, og retningsvalg.
- `kontrollrommet-hybrid.jsx` — Opprinnelig mockup i React (lesemodus + skjemamodus). Historisk referanse.

### Svelte 5 mockup-miljø (aktivt)

Mockupen er implementert som Svelte 5-komponenter i `src/lib/mockup/` med rute på `/mockup`. Deploybar til Vercel.

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
├── RightSidebar.svelte      # Høyrepanel: bestemmelser/historikk/filer
├── ActionBar.svelte         # Sticky bunnlinje (send/lukk/kontekst)
├── CaseAnchor.svelte        # KOE-104 badge + tittel
├── Stamp.svelte             # Gjenbrukbart stempel
├── DualBar.svelte           # Subsidiær/prinsipal-barer
├── DateSeparator.svelte     # Dato-separator i historikk
│
│   # BH-skjemaer (byggherre svarer på krav)
├── GrunnlagForm.svelte      # → grunnlagDomain.ts
├── VederlagForm.svelte      # → vederlagDomain.ts + vederlagBegrunnelse.ts
├── FristForm.svelte         # → fristDomain.ts + fristBegrunnelse.ts
│
│   # TE-skjemaer (entreprenør sender/reviderer krav)
├── TeGrunnlagForm.svelte    # → grunnlagDomain.ts (revisjon)
├── TeVederlagForm.svelte    # → vederlagSubmissionDomain.ts
└── TeFristForm.svelte       # → fristSubmissionDomain.ts
```

**Delt domenelogikk:** Alle 6 skjemaer importerer ren TypeScript-domenelogikk direkte fra `src/lib/domain/`. Ingen duplisering — mockup bruker produksjonens `beregnAlt()`, `getDefaults()`, `beregnVisibility()` etc.

**Delt kontraktsdata:** Bestemmelser (§-referanser) bygges fra produksjonens `KONTRAKTSREGLER` + `PARAGRAF_TITLER`. Partsnavn via `getPartsNavn()`.

**Delt editor-stack:** BH-skjemaer (vederlag, frist, grunnlag) bruker produksjonens `RichTextEditor` med `LockedValueNode`-extension. Auto-generert begrunnelse via `generateVederlagResponseBegrunnelse` / `generateFristResponseBegrunnelse` med `tokensToHtml()`.

**Reaktiv store:** `store.svelte.ts` wrapper DD/EVT som `$state`. Skjema-handlinger (send svar/krav) oppdaterer tracks + legger til hendelse i historikk. Lesemodus reflekterer endringer umiddelbart. Nullstill-knapp resetter til initial state.

## Designretning: «Kontraktsbordet» v2

Metaforen er riggkontoret — mer «arkitektkontor» enn «ingeniørbrakke». Humanistisk-varm typografi: Plus Jakarta Sans (UI), Literata (prosa), IBM Plex Mono (data). Dual aksent: gull #D4A020 (primært/aktivt) + grønn #034B45 (subsidiært/betinget). 4px border-radius overalt. 1.5px borders.

**Signatur:** Dual-posisjonsvisningen (TE/BH side om side med metadata-sidebar + prosa), stempler med minimal rotasjon og 1px shadow, subsidiær sone med grønn diamant.

**Depth-strategi:** 1.5px borders for struktur + blur-shadows på knapper (Y-translate) + 1px hard shadow på stempler. Dark mode: fargede glow-shadows på knapper, aksenter lysnet for lesbarhet mot sort.

## Nøkkelbeslutninger allerede tatt

- Sidebar-bakgrunn = canvas (ikke separat farge). Borderen separerer.
- Den mørke ID-platen er signatur, ikke elevasjonsfeil.
- Partsnavn brukes: «Byggnors krav», «Kystveien Eiendoms standpunkt» — ikke «Entreprenørens krav».
- TE bold (700), BH medium (500) — typografisk dualitet.
- Én kontekstavhengig knapp per spor: «Besvar» (tom) / «Fortsett» (kladd) / «Revider svar» (sendt).
- Bestemmelser per spor (ikke per hendelse) i høyrepanel — bygget fra produksjonens kontraktsregler.
- Skjemamodus: Venstre panel skjules. Konsistens-stripe øverst viser status for alle tre spor.
- Draft-seksjon har 1.5px dashed border med 4px radius, markert «Internt — ikke synlig for motpart».
- Doble progressbarer: subsidiært (grønn) og prinsipalt (rød) per dimensjon.
- Action bar BH: designet venteboks med pulserende gull-prikk, ikke bare tekst.
- Dual aksent: gull = primært/aktivt, grønn = subsidiært/betinget. Fargene skal aldri byttes.
- Dark mode via `.mockup.dark`-klasse: OLED-sort canvas, lysnede aksenter, glow-shadows på knapper.
- **Høyrepanel i skjemamodus:** Bestemmelser/historikk/filer — kontekst mens du tar stilling. Begrunnelse er inline i midtpanelet under resultat-boksen.
- **Sticky ActionBar:** Send/Lukk-knapper kun i sticky bunnlinje, aldri inline i skjema. Mobil: statuslinje skjult, kontekst-knapp (BookOpen) venstrestilt, handlingsknapper høyre.
- **formActions-callback:** Skjemaer eksponerer `{canSend, send}` via `onactions`-prop. Kontrollrommet videresender til ActionBar.
- Alle skjemaer bruker produksjonens domenelogikk direkte — null arkitektonisk gjeld ved migrering.

## Hva som er ferdig

- ✅ Lesemodus (matrise + argumenter + kontekstpanel med faner)
- ✅ Skjemamodus komplett for alle 3 spor × 2 roller (6 skjemaer)
  - BH: Grunnlag (§32.2 varsling + verdict + RichTextEditor), Vederlag (data-drevet preklusjon + alternativ metode + kravlinjer + auto-begrunnelse), Frist (6 porter med full domenelogikk + auto-begrunnelse)
  - TE: Grunnlag (revisjon), Vederlag (metode + beløp + særskilte krav), Frist (varsling + utmåling)
- ✅ Full paritet med produksjon for BH-skjemaer (alle state-variabler, valideringssjekker, data-arrays)
- ✅ Auto-generert begrunnelse med locked value tokens (vederlag + frist)
- ✅ RichTextEditor + LockedValueNode i alle BH-skjemaer
- ✅ Reaktiv state: send-handlinger oppdaterer matrise + historikk + eksponering
- ✅ Draft-flyt (kladd som tredje lag, konsistens-stripe)
- ✅ Dual bars (prinsipal/subsidiær eksponering)
- ✅ Stempelsystem (bestridt/subsidiært/kladd/venter) med 4 varianter: red, gold, green, draft
- ✅ Designsystem v2 (system-v2.md + mockup.css)
  - Plus Jakarta Sans / Literata / IBM Plex Mono
  - Dual aksent: gull (primær) + grønn (subsidiær)
  - 4px radius, 1.5px borders, blur-shadows + Y-translate knapper
  - Dark mode (Kveldsskiftet) via prefers-color-scheme
  - Kontroll-tokens med gull fokus-ring
- ✅ Nullstill-knapp for demo
- ✅ Sticky ActionBar med formActions-wiring (alle 6 skjemaer)
- ✅ Mobil-tilpasset ActionBar (skjult status, kontekst-FAB)

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

### 6. Tom tilstand / onboarding
Første gang brukeren åpner en sak — alle spor er tomme.
- Hvordan ser en tom matrise ut?
- Hva er CTA for TE? «Opprett krav» vs. «Varsle endringsordre»?
- Hva ser BH før TE har sendt noe?

## Hva som bør bygges videre

### Prioritet 0: Tilstander (tom, laster, feil)
Alle komponenter trenger tre tilleggstilstander utover «fylt med data». Mønstrene er definert i system-v2.md § Tilstander:
- Tomme tilstander: ikon → tittel → forklaring (Literata) → neste handling
- Skeleton loading: shimmer-animasjon, form-matchende skeletons
- Feil-tilstander: konkrete feilmeldinger, rød border/bakgrunn, prøv igjen-knapper
- Ingen tilgang: Lock-ikon, ikke rød (grense, ikke feil)

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

Bruk `interface-design` skill. Les system-v2.md først og bygg i tråd med den. Kjør swap-test, squint-test og signature-test før presentasjon. Alle valg må ha et «hvorfor».

**Paritet-sjekk:** Før du anser et skjema som ferdig, sammenlign bit-for-bit med tilsvarende produksjonskomponent. Alle state-variabler, valideringssjekker, data-arrays og editor-features skal matche. Forskjeller i design er bra — forskjeller i funksjonalitet er gjeld.

## Tone

Norsk. Direkte. Diskuter design og UX grundig før bygging. Bruk partsnavn, ikke forkortelser. Vis mockups som fungerende Svelte 5-komponenter med Kontraktsbordet-design.
