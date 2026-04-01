# Handoff: Kontraktsbordet — Endringsmeldinger

## Hva dette er

En app for krav om endringsordre etter NS 8407 totalentreprisekontrakt (norsk byggebransje). To parter: TE (totalentreprenør, f.eks. «Byggnor») og BH (byggherre, f.eks. «Kystveien Eiendom»). Tre spor per sak: Ansvarsgrunnlag (K), Vederlag (V), Frist (F). Subsidiær forgreining når ansvar bestrides prinsipalt.

## Prosjektfiler

- `system.md` — Komplett designsystem. **Les denne først.** Den inneholder alle beslutninger: farger, typografi, spacing, depth-strategi, komponentmønstre, og retningsvalg.
- `kontrollrommet-hybrid.jsx` — Gjeldende mockup med lesemodus + skjemamodus. Fungerende React-komponent.

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
- Bestemmelser med full paragraftekst i høyrepanel (som i eksisterende app), ikke som badges i midtpanelet.
- Skjemamodus: Venstre panel skjules. Konsistens-stripe øverst viser status for alle tre spor.
- Draft-seksjon har full dashed border, markert «Internt — ikke synlig for motpart».
- Doble progressbarer: subsidiært (oker) og prinsipalt (rød) per dimensjon.
- Action bar BH: designet venteboks med pulserende oker-prikk, ikke bare tekst.

## Hva som er ferdig

- ✅ Lesemodus (matrise + argumenter + kontekstpanel med faner)
- ✅ Skjemamodus (strukturerte spørsmål + begrunnelse + auto-lagre)
- ✅ Draft-flyt (kladd som tredje lag, konsistens-stripe)
- ✅ Dual bars (prinsipal/subsidiær eksponering)
- ✅ Stempelsystem (bestridt/subsidiært/kladd/venter)
- ✅ Visuell identitet og designsystem (system.md)

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

Norsk. Direkte. Diskuter design og UX grundig før bygging. Bruk partsnavn, ikke forkortelser. Vis mockups som fungerende React-komponenter.
