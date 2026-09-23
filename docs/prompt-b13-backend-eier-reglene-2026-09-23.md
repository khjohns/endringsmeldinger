# Oppdrag: B-13, backend som sannhetskilde for NS 8407-reglene

**Dato:** 2026-09-23. **Utgangspunkt:** `main` etter PR #45 og #46. Kontroller
HEAD og Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke
funnstatus eller beslutninger. Kan gå parallelt med F0b; unngå
`core/container.py`, `lib/db/` og `repositories/`.

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
B-13 i 3.4, vedtakene 23.09 i 3.1 og radene for BR-01, DRF-01–DRF-03, TFR-06,
GFK-06 og SD-01–SD-02 i 4.2.
[Kartleggingen av frontendens domeneregler](kartlegging-domeneregler-frontend-2026-09-23.md)
er grunnlaget. [Gjennomføringen av spor D](gjennomforing-spor-d-2026-09-23.md)
har spørsmålene og svarene.

## Del 1 — beslutningsgrunnlag for B-13

B-13 er åpen. Kartleggingen viser at backend lagrer det klienten regner ut,
uten å regne ut eller kontrollere noe av det. Før noe bygges, trenger
oppdragsgiver et valg mellom de tre alternativene i B-13:

1. serveren regner ut resultatet, og det gjelder;
2. serveren avviser et svar der konklusjonen ikke følger av vurderingene;
3. begge lagres, og avviket vises.

Skriv et kort designnotat som sammenlikner dem konkret, ikke generelt:

- hva som står i journalen i hvert alternativ, og hva brevet sier;
- hva som skjer med partens egen formulering: begrunnelsestekstene
  (`src/lib/domain/begrunnelse/`) fremsetter innsigelser etter § 5 og kan
  si noe annet enn et resultat serveren regner ut;
- hva frontenden gjør: forhåndsvisning, feilmelding eller ingenting;
- godkjenningsflyten: fullmakten regnes i dag av klientens sum
  (`approval_authority.exposure`);
- versjonering av reglene (B-10): en regel som endres, må ikke skrive om
  gamle hendelser.

Legg fram anbefalingen og de seks åpne spørsmålene i kartleggingen for
oppdragsgiver som konkrete valg. Forespørselen (spørsmål 3 der) er avgjort.
**Ikke bygg før B-13 er avgjort.**

## Del 2 — bygg det som er avgjort

Etter beslutningen: flytt gruppe 2 og 3 i kartleggingen til backend, i en
egen domenemodul uten avhengighet til Flask og lagring. Oversett
frontendens testsett (`vederlagDomain.test.ts`, `fristDomain.test.ts`,
`grunnlagDomain.test.ts`) til backend-tester først; de er spesifikasjonen.
Rettes BR-01, blir de fire strenge `xfail` XPASS og skal gjøres om til
ordinære tester. Frontenden beholder reglene til forhåndsvisning, men
serveren avgjør.

Vedtakene fra spor D i 3.1 kan bygges uavhengig av B-13, i denne
rekkefølgen:

1. **Ubegrenset fullmakt** kan sende alene når beløpet ikke kan verdsettes.
   Én regel i `resolve_route`, som EO og fristsvar deler, og speilet i
   `src/lib/approval/route.ts`. Testen
   `test_ny_sluttdato_kan_ikke_godkjennes_av_saksbehandler_alene` snur; det er
   vedtaket, ikke en svekket assertion. Si det i commiten.
2. **Godkjent ansvar (GFK-06):** fullmakten regnes av TEs krevde beløp,
   vederlag pluss krevde fristdager ganget med dagmulktssatsen, og hele
   kjeden når kravet ikke er tallfestet. `ApprovalService` må hente kravet
   fra saken. Uten sats gjelder B-06; ikke avgjør den.
3. **Innsigelse og forespørsel på et nøytralt fristvarsel (TFR-06, DRF-01):**
   egne handlinger som ikke setter resultat, ikke gjør sporet avslått og ikke
   åpner forsering. Et svar med dager avvises til kravet er spesifisert.
   Berører hendelsesmodell, forretningsregler, tidslinje, godkjenningsflyt,
   brev og `FristForm`. Bør være egen PR.

DRF-02, DRF-03, SD-01 og SD-02 er små og kan tas når de passer, hver med
egen commit.

## Føringer

- **Slå opp ID-en i testens `reason` og i dokumentet der funnet ble gjort.**
- **Ikke endre en assertion for å få en test grønn.** Snur et vedtak en
  test, si det i commiten og i hovedplanen.
- **Utvider du `SporStatus` eller `overordnet_status`**, følg regelen i
  `AGENTS.md`. Nye handlinger for innsigelse og forespørsel må også inn i
  `BH_BINDENDE_EVENTS`-vurderingen, Catenda-kommentarene og brevene.
- **NS 8407:** bruk `docs/NS_8407.md` lokalt, uten å committe den. Er en regel
  uklar, still spørsmålet med konkrete alternativer framfor å velge tolkning.
- **Lageret:** reproduksjonene går mot `JsonFileEventRepository`, som går ut i
  F0b (TS2-02). Skriv nye tester slik at de kan flyttes.
- Kjør hele backend-suiten, `ruff check backend/` og, ved frontendendringer,
  `npm test && npm run check:error` før hver PR.

## Lever

- **PR 1:** designnotatet for B-13, med anbefaling og spørsmål. Ingen kode.
- **PR 2 og videre:** vedtakene fra spor D og, etter beslutningen, B-13,
  hver med regresjonstester og datert merknad i hovedplanen. Et
  gjennomføringsnotat med «Verifikasjon og grenser».
- `/code-review` på hver PR før den meldes klar.
