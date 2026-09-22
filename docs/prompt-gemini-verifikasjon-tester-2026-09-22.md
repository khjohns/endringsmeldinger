# Oppdrag til Gemini: etterprøv testene og grunnlaget for rettinger

**Dato:** 2026-09-22. **Utgangspunkt:**
`0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (`main`).
Dette er en arbeidsinstruks, ikke en ny funnstatus eller godkjenning av planverket.

Forrige ledd: [siste handoff](handoff-2026-09-21-frister.md),
[første review](review-gemini-konsolidering-2026-09-22.md),
[oppfølgingsreview](review-gemini-konsolidering-2026-09-22-v2.md),
[revidert planforslag](konsolidering-masterplan-2026-09-22-v2.md) og
[revidert kildegrunnlag](konsolidering-kildegrunnlag-2026-09-22-v2.md).
[Masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) er fortsatt
autoritativ for registrert status.

V2-grunnlag ved utforming (SHA-256): masterplan
`0f80ca18b5b0afe5dcc6478605153a7f6cb6b41c3e942a7ad60e54b618f2bd86`,
kildegrunnlag `d5dfa62eee89e4b40763cd48cfa8e3862d65c4dc17c919991fc3fb45dd758728`.

Ved utarbeiding av oppdraget ble 42 statiske `xfail`-kall funnet i backend-testene.
Dette er en opptelling i Python-koden, ikke en ny testkjøring eller garanti om
antall innsamlede testtilfeller. Registrer faktisk inventar ved oppstart.

Kopier oppdraget nedenfor til Gemini, eller be Gemini lese og utføre denne fila.

---

## 1. Målet med runden

Gjennomfør en metodisk revisjon av **hva eksisterende xfail-tester faktisk beviser**.
Lever et etterprøvbart grunnlag som gjør at neste utvikler kan velge og gjennomføre
rettinger uten å gjenta hele undersøkelsen.

Arbeid trinn for trinn fra testens påstand til den faktiske kallkjeden, preconditions,
observasjonen og konsekvensen. Vurder motbelegg aktivt. En test som feiler, beviser
ikke automatisk årsaken i `reason`, og en grønn suite lukker ikke et funn.

Dette er et avgrenset auditoppdrag. Ikke start en ny generell konsolidering av
dokumentasjonen eller en full gjennomgang av alle filer i repoet.

## 2. Tillatt omfang og leveranser

Les `AGENTS.md` og relevante skills. Bruk norsk bokmål. Du kan opprette:

1. `docs/audit-testbevis-ÅÅÅÅ-MM-DD.md`: kort vurdering, funn med kildebelegg,
   forslag til avgrensede rettinger, kjørte kommandoer og verifikasjonsgrenser.
2. `docs/vedlegg/testbevis-ÅÅÅÅ-MM-DD.csv`: komplett testinventar og bevisstatus.
   Bruk CSV-modul og UTF-8; ikke håndbygg quoting.
3. Nye, små reproduksjonstester og nødvendige isolerte hjelpere under
   `backend/tests/test_audit_testbevis_ÅÅÅÅMMDD/`. Bruk eksisterende testsamlinger
   der de allerede gir tilstrekkelig belegg; unngå kopierte testbatterier.
4. Sanitiserte, avgrensede kjørelogger under `docs/vedlegg/testbevis-ÅÅÅÅ-MM-DD/`
   når de trengs for å etterprøve resultatene. Ingen tokens eller kontraktsdata.

La produksjonskode, eksisterende tester, migrasjoner, konfigurasjon, `AGENTS.md`,
`README.md`, masterplanen og alle eksisterende review-/konsolideringsdokumenter stå
urørt. Foreslå statusrettelser med kildested; ikke innarbeid dem i denne runden.
Ingen commit, deploy eller eksterne skriveoperasjoner inngår i oppdraget.

## 3. Fastsett utgangspunkt og isolasjon før kjøring

Registrer HEAD, gren, Git-status, faktisk arbeidsmappe, interpreter- og pytest-versjon.
Registrer SHA-256 for lokale, ikke-committede dokumenter du bygger på. V2-filene
er endret etter tidligere review; filnavnet alene identifiserer ikke innholdet.

Les `backend/tests/conftest.py` og de aktuelle test-fixturene før du kjører dem.
Import av appen kan laste `.env`. `RUN_LIVE_SUPABASE=0` stenger bare tester som
faktisk er merket `live`; det er ikke en generell nettverkssperre. I første review
forsøkte en ordinær rutetest tokenfornyelse mot Catenda.

- Kjør med syntetiske identiteter og midlertidige lagre. Ekte legitimasjon og
  eksisterende `koe_data/` skal ikke brukes som testgrunnlag.
- Avskjær eksterne nettverkskall før import/fixtures kan utløse dem. Eventuell lokal
  databasesocket må tillates eksplisitt. En ny, isolert testhjelper er tillatt;
  endring av felles `conftest.py` er ikke del av oppdraget.
- Et uventet nettverksforsøk skal gi tydelig testfeil. Ikke la det bli en stille mock
  eller bli skjult av `xfail`.
- Ikke slå av autentisering, CSRF eller prosjekt-/teamkontroll globalt for å få
  testen grønn. Forklar hvilke eksterne grenser en fixture erstatter, og hvilke
  håndhevingslag som fortsatt testes.
- Hvis isolasjonen ikke kan etableres for en bestemt test innen dette omfanget,
  dokumenter hinderet og fortsett med de øvrige. Den aktuelle testen er da ikke
  kjørt/verifisert, ikke «bestått».

Bruk relevante eksisterende miljøer etter kontroll. Ingen oppgradering av
avhengigheter er nødvendig for oppdraget. Oppgi kommandoer med riktig arbeidsmappe;
ikke kopier historiske testtall eller tider som nye resultater.

## 4. Lag komplett inventar

Finn alle xfail-markeringer, også modul-/klassemarkeringer, parametriserte tilfeller,
markører uten parenteser og eksplisitte `pytest.xfail()`-kall. Et AST-søk er et
utgangspunkt; sammenhold det med pytest-innsamlingen etter at import er isolert.

CSV-en skal minst inneholde:

`node_id`, `funn_id`, `kildested`, `dokumentert_status`, `påstand`,
`lag_og_backend`, `strict`, `raises`, `forutsetninger`, `kommando_og_logg`,
`observert_utfall`, `første_feilsted`, `målassertion_nådd`, `bevisstatus`,
`foreslått_tiltak`.

Bevar ID-er og aliaser som AP-04/AR-06/TST-03. Én felles rotårsak skal ikke bli
tre nye funn. Ikke tving antallet til 42; forklar avvik mellom statiske markører
og innsamlede testtilfeller.

Bruk disse beviskategoriene:

- **Reprodusert brudd:** testens relevante forutsetninger er oppfylt, og den
  tilsiktede invarianten brytes.
- **Feiler før målassertion:** en annen feil eller foreldet forutsetning stopper
  testen; det opprinnelige funnet er ikke bekreftet av denne kjøringen.
- **Ikke reprodusert:** forventet atferd holder under dokumenterte forutsetninger.
  Dette lukker ikke automatisk alle varianter av funnet.
- **Statisk belegg:** testen kontrollerer kildekode, filstruktur eller API-form,
  og beviser ikke den påståtte kjøretidskonsekvensen.
- **Ustabil eller miljøavhengig:** utfallet avhenger av scheduling, arbeidsmappe,
  klokke, legitimasjon eller andre uavklarte forhold.
- **Ikke kjørt / ikke avgjort:** navngi nøyaktig hva som mangler.

Hold disse kategoriene adskilt fra masterplanens registrerte funnstatus og fra
om funnet gjelder dagens produksjonssti, en lokal reserveimplementasjon eller
et fremtidig arkitekturkrav.

## 5. Etterprøv hver test

For hver oppføring:

1. Les hele testen og fixtures, hele berørte funksjoner, dekoratører og eventuelle
   overstyringer. Finn hvilket lag som ville produsert konsekvensen.
2. Formuler én presis invariant og hvilke forutsetninger som må holde for at
   testen undersøker den. Identifiser målassertionen før kjøring.
3. Kjør testen isolert med `--runxfail`, og ved behov ordinært med rapportert
   xfail-årsak. Oppgi faktisk node-ID, arbeidsmappe, kommando og exitkode.
4. Registrer **første feilsted**, feilmelding og om målassertionen ble nådd.
   `raises=AssertionError` er ikke tilstrekkelig vern mot en annen assertionfeil.
5. Følg dataflyten tilbake til offentlig inngang dersom du vil hevde at bruddet
   er nåbart fra en klient. En parser som aksepterer et felt, beviser ikke at
   ruta lar klienten bestemme feltet.
6. Vurder bevisets rekkevidde: mock, CSV/JSON/SQLite, lokal PostgreSQL og ekstern
   tjeneste gir ulike garantier. Ikke generaliser et fillagerkappløp til Supabase.
7. Dersom ny reproduksjon er nødvendig, lag den i ny fil etter reglene nedenfor.

`--runxfail` lar pytest behandle xfail-testen som umerket. `raises` avgrenser
unntakstype, og `strict=True` gjør uventet bestått test synlig som feil. Kontroller
at lokal pytest støtter den valgte bruken.
[Offisiell pytest-dokumentasjon](https://docs.pytest.org/en/stable/how-to/skipping.html).

## 6. Undersøk disse først, deretter resten av inventaret

| Prioritet | Område | Oppgave |
| --- | --- | --- |
| 1 | AUT-03, batch og interne notater | Bruk den kjente 400/201-motsetningen som kontroll på metoden. Ikke lag en ny kopi av eksisterende grønne avvisningstest. |
| 2 | AP-04 / AR-06 / TST-03 og RV-02 / GFK-03 | Avklar nøyaktig hvilken delvis skriving eller policykonflikt som kan oppstå, hvilke lagre testen faktisk bruker, og hvilket resultat som består etter feilen. |
| 3 | KR-15 / TST-02 | Lag ved behov en deterministisk reproduksjon i ny fil. Bevar den faktiske kappløpsgrensen og identifiser reservebackendens omfang. |
| 4 | MG-03 og serverstyrte aktørfelt | Skill parserens kontrakt fra eksisterende ruters overskriving og autentisering. Klassifiser forsvar i dybden separat fra demonstrert identitetsforfalskning. |
| 5 | Statiske tester og testmiljø | Kontroller om metode-/filfravær, relative filstier og mocks faktisk beviser påstanden. Vær særlig oppmerksom på TST-01 og TST-04; utfallet må undersøkes, ikke antas. |
| 6 | Øvrige xfail-tester | Bruk samme metode og fullfør inventaret. Prioriter resterende tilgangs-, integritets- og leveringsfunn foran kosmetiske forhold. |

For den eksisterende EO-flyten skal rapporten i tillegg vise en kort kjede:
inngang → tilgang/fullmakt → tjeneste → faktiske lagre → commit-/feilpunkt →
eventuell ekstern effekt. Navngi hvilke tester som dekker hvert kritisk ledd.
Formålet er å gjøre dagens feil og rettingsgrense forståelig; ikke tegn hele appen.

## 7. Krav til nye reproduksjoner

- Test faktisk produksjonskode. Ikke skriv en testdobbel som selv inneholder
  den mistenkte feilen og bruk utfallet som bevis mot applikasjonen.
- Ikke mock bort autorisasjon, transaksjon eller lagring når nettopp det laget
  er påstanden. Mock eksterne transportgrenser og dokumenter begrensningen.
- For samtidighet: bruk styrt rekkefølge ved den kritiske grensen og tidsavgrensede
  barrierer/hendelser. Ikke bruk tilfeldige sleeps eller en lås som fjerner
  kappløpet. Registrer trådfeil og faktisk lagret sluttresultat.
- Kontroller relevante sideeffekter: hendelser, versjon, metadata, pakke, utkast
  og leveringsintensjon. HTTP-status alene er ofte utilstrekkelig.
- Vis ved en relevant kontroll at testen når riktig lag og reagerer på den
  tilsiktede forskjellen. Ikke introduser tester for trivielle forhold bare
  for å øke testtallet.
- Bruk ekte, kastbar PostgreSQL når en påstand gjelder SQL-låsing, RLS,
  fremmednøkler eller transaksjoner. Følg repoets plattformstub og relevante skills.
  PG18 er lokal verifikasjon; målversjonen i konfigurasjonen er 17. Oppgi hva
  som faktisk er prøvd. En ny tabell/prosedyre som bare finnes i et hypotetisk
  testsystem, verifiserer ikke produksjonsimplementeringen.
- Kjør først nye feilreproduksjoner uten xfail og dokumenter den tilsiktede
  feilen. Bare bekreftede, fortsatt åpne brudd kan deretter få streng xfail.
  Avgrens forventet feil så fixture-, import-, autentiserings- og nettverksfeil
  blir ordinære feil. En egen presis unntakstype for målbruddet kan brukes;
  generell `AssertionError` fra hele testen er ikke automatisk presist nok.
- Eksisterende xfail-tester endres ikke. Foreslå eventuell utskifting eller
  omklassifisering med begrunnelse. En allerede korrekt implementert atferd
  skal dekkes av en ordinær test, ikke en kunstig xfail.
- Manglende fremtidig outbox/RPC er en implementeringsoppgave. Ikke lag røde
  importtester for funksjoner som ennå ikke finnes som «nye sikkerhetsfunn».

## 8. Gjør resultatet nyttig for neste utvikler

For hver bekreftet rotårsak, gi et kort rettingsforslag med:

- invariant, nåbarhet, forutsetninger og mulig konsekvens;
- berørte filer og symboler, samt faktisk lagringsbackend;
- minimal kommando som viser bruddet, og referanse til sanitert resultat;
- hva som må endres og hvilke avhengigheter/beslutninger som gjenstår;
- hvilke eksisterende og nye tester som skal bli ordinært grønne etter retting;
- hvilke nærliggende sikkerhetsinvarianter som må forbli intakte.

Foreslå en kort rekkefølge på rettingene etter risiko og avhengigheter. Skill
produksjonsfeil, feil i testgrunnlaget, dokumentasjonsavvik og arkitekturarbeid.
Ikke fastsett juridisk gyldighet, tilbakekallingsregler eller eksterne API-kvoter
som følge av en teknisk test. Slike uavklarte premisser føres som beslutningsbehov.

Rapporten skal følge dokumentformen i `AGENTS.md`: dato/commit, lenker til forrige
ledd, funntabell med ID og alvorlighet, én seksjon per faktisk funn med fil/symbol,
og «Verifikasjon og grenser» til slutt. Bruk eksisterende funn-ID når rotårsaken
allerede finnes. Gi nye bevis-/testavvik egne ID-er uten å endre gammel funnstatus.

## 9. Avgrensing mot Catenda og andre tjenester

Eksterne kontraktsavklaringer er et eget mulig oppfølgingsoppdrag. I denne runden
skal du ikke kjøre live-skriptene eller opprette/slette ressurser i Catenda eller
Supabase. Ikke let opp legitimasjon for å omgå denne avgrensningen.

Dersom en testpåstand avhenger av API-atferd, bruk `docs/tredjepart-api/` målrettet:
finn aktuell `operationId`, request-/response-skjema og relevante `$ref`-er.
Ikke last alle de store YAML-filene inn i konteksten. Lokal kontrakt, testdobbel
og observert ekstern atferd skal ha forskjellige beviskategorier.

Forhåndsvalgte GUID-er er dokumentert for topic, kommentar og dokumentreferanse.
Dette alene dokumenterer ikke samtidige/gjentatte POST-kall. Filnavn eller
`failOnDocumentExists=true` beviser heller ikke at en eksisterende fil har riktig
innhold. Før slike avklaringer i en kort liste over nødvendige senere kontraktstester,
med forventet observasjon og behov for dedikert testmiljø.

## 10. Ferdigkriterier

Oppdraget er ferdig når:

1. Alle faktisk innsamlede xfail-tilfeller er mappet til beviskategori og kilde.
   Ikke kjørte tilfeller har konkret begrunnelse og neste verifikasjonssteg.
2. Den opprinnelige feilmeldingen og om målassertionen ble nådd, er dokumentert
   for hvert kjørt tilfelle. Tidligere testtall er ikke presentert som ferske.
3. Nye reproduksjoner er små, isolerte, forklarer riktig invariant og er kjørt.
   Uavklart eller ustabil reproduksjon er ikke ført som sikkert brudd.
4. De prioriterte EO-funnene har et konkret kart over dagens skrive-/feilgrenser.
5. En neste utvikler kan gjenskape de bekreftede funnene fra rapportens kommandoer
   og se hvilke avgrensede rettinger som bør tas først.
6. Git-diff og filoversikt viser at bare nye, tillatte auditfiler er opprettet.
   Kjør relevante tester og lint for nye Python-filer; dokumenter faktiske utfall.

Avslutt med få, presise konklusjoner: hva som faktisk ble bekreftet, hva som var
foreldet eller utilstrekkelig bevist, hvilke rettinger som bør prioriteres, og
hva som fortsatt må avklares. Antall nye funn er ikke et kvalitetsmål.
