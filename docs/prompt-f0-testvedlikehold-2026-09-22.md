# Oppdrag: testvedlikeholdet i F0 (T-1, T-3, T-4)

**Dato:** 2026-09-22. **Utgangspunkt:** `main` etter PR #34. Kontroller HEAD og
Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke funnstatus eller
beslutninger.

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
F0 i avsnitt 5, og [F0-notatet](gjennomforing-f0-postgresql-ci-2026-09-22.md),
der punkt 1–3 og T-2 og T-5 er gjort.

## 1. Mål

Få de tre gjenstående testene i F0 til å si det de gir seg ut for å si. To av
dem når aldri målassertionen sin, og den tredje er en port som tilfeldig kan
bli rød. `main` krever nå grønne sjekker, så en ustabil test stopper all merge.

Ferdig når:

1. **T-1 (AUT-03).** Den strenge `xfail`-en
   `test_batch_innsending_lekker_internt_notat_i_last_event_at` i
   `tests/test_security/test_autorisasjon_audit_20260918.py` er erstattet.
   Batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH` før
   skriving (`783c64d`), så testen feiler på `201` og når aldri
   lekkasjeassertionen. Erstatningen viser at avvisningen skjer, og at ingenting
   skrives, heller ikke `last_event_at`. Begrunnelsen står datert i den nye
   testen.
2. **T-3 (FE-02).** `test_sak_context_mangler_brukerens_autoriserte_rolle` i
   `tests/test_security/test_frontend_kontrakt_audit_20260918.py` har et
   testoppsett med gyldig sesjon og prosjekttilgang, slik at den når
   målassertionen om rolle i svaret. FE-02 er åpent, så testen skal fortsatt
   være en streng `xfail`, men nå fordi *målassertionen* feiler.
3. **T-4 (KR-15/TST-02).** Det finnes en deterministisk reproduksjon av
   kappløpet ved samtidig opprettelse i `JsonFileEventRepository`, med reell
   lagring. Den ustabile testen
   `test_tst_02_samtidig_saksopprettelse_krasjer_eller_overskriver_uten_concurrency_error`
   i `tests/test_security/test_testsuite_blindsoner_audit_20260918.py` er
   erstattet av den. Den nye testen gir samme utfall i minst 200 kjøringer på rad.
4. Det finnes ingen tilfeldig rød port fra TST-02. Det er et akseptkriterium i F0.

## 2. Les først, og bare dette

- `AGENTS.md` i sin helhet. Særlig resonneringsreglene og avsnittet om
  `xfail`.
- Hovedplanen: F0 i avsnitt 5, og radene AUT-03, FE-02, TST-02 og KR-15 i
  registeret.
- [Reviewet av testbeviset](review-testbevis-og-planstatus-2026-09-22.md),
  avsnitt RTB-02. Der står hvorfor testen fra 22.09 ikke er deterministisk.
- De tre testfilene over, og
  `tests/test_audit_testbevis_20260922/test_tst02_deterministisk.py`.
- Presedensen for å erstatte en reproduksjon:
  `test_letter_preview_mangler_csrf_og_avvises_i_produksjon` i
  `test_frontend_kontrakt_audit_20260918.py` (FE-01, 20.09), og DB-03/DB-07 i
  `tests/test_database/test_katalog.py` (22.09).
- Koden som testene treffer: `submit_batch` i `routes/event_routes.py`,
  kontekstruta (`/api/cases/<sak_id>/context`) i samme fil, og
  `JsonFileEventRepository` i `repositories/event_repository.py`. Les hele funksjonen,
  ikke et `grep`-vindu.

Ikke les auditkjeden eller konsolideringene. Trenger du dem for en konkret
uklarhet, slå opp det ene stedet planen viser til.

## 3. Føringer

- **Ingen produksjonskode.** Dette er testvedlikehold. Er en test umulig å
  skrive uten en endring i produksjonskoden, stopp og skriv hvorfor.
- **Ikke svekk noen assertion, og ikke «rett» en xfail ved å endre testen**
  (`AGENTS.md`). En reproduksjon erstattes slik FE-01 ble: den nye testen skrives
  og er grønn, *så* fjernes den gamle, med datert begrunnelse i den nye.
- **T-1:** at den gamle testen feiler på 201, beviser at lekkasjen ikke er
  nåbar gjennom batchruta. Det beviser ikke at `last_event_at` aldri lekker
  andre steder. Hold påstanden i den nye testen til batchruta. Interne notater
  ligger i `notat`, ikke i journalen (MS-05). Kontroller at testen treffer den
  stien som gjelder i dag.
- **T-3:** endre bare oppsettet: sesjon, prosjekt og kontraktsmedlemskap.
  Assertionen om rolle i svaret står urørt. Blir testen XPASS med riktig
  oppsett, er FE-02 kanskje rettet. Da stopper du og rapporterer; ikke fjern
  markøren på egen hånd.
- **T-4:** RTB-02 viser at en barriere *før* `append_batch` ikke er nok. Begge
  skriverne må ha sett at saksfilen mangler før den første skriver. Styr
  flettingen ved selve eksistenssjekken, for eksempel ved å pakke metoden som gjør
  sjekken med `threading.Event`-er. Lagringen skal være reell (`tmp_path`), ikke
  en dobbel. Test ett utfall om gangen; en test som godtar «krasj *eller*
  overskriving» beviser ingenting bestemt. Behold `strict=True`. Den nye testen
  er en `xfail` så lenge JSON-lageret mangler låsing, med `raises=` satt.
  Påstanden gjelder bare `JsonFileEventRepository`. Supabase-lageret har
  `UNIQUE (sak_id, versjon)`; skriv ikke noe om det uten å ha kjørt det.
- **Databasetestene er lesende** (`default_transaction_read_only`). Ikke bruk
  testbasen til T-4 i denne runden.
- **TST-01, AUT-04 og DB-04 er ikke en del av oppdraget.**

## 4. Arbeidsform

- `main` er beskyttet. Lag en egen gren og åpne en PR. De fire jobbene er
  påkrevde, og grenen må være oppdatert mot `main`. Ikke merg; det gjør
  oppdragsgiver.
- Kjør `cd backend && python -m pytest -q` og `ruff check backend/` før hver
  commit. CI bruker ruff 0.16.8 (`uvx ruff@0.16.8 check backend/`).
  `backend/venv` har det som trengs.
- Tell strenge `xfail` med AST før og etter. Tallet skal endre seg bare med de
  testene du erstatter, og alle skal fortsatt ha `raises=`.
- Kjør T-4-testen minst 200 ganger, for eksempel med en løkke i skallet, og
  oppgi resultatet. Kjør også den gamle testen 200 ganger, så forskjellen er
  målt og ikke antatt.
- Oppdater hovedplanen med en datert merknad under F0, og endre radene AUT-03,
  FE-02, TST-02 og KR-15 bare for testdelen. FE-02, TST-02 og KR-15 er fortsatt
  åpne feil. Endre ikke andre statuser.

## 5. Lever

1. Endringene på grenen, med commit-meldinger etter `AGENTS.md`, og en PR.
2. Et kort notat, `docs/gjennomforing-f0-testvedlikehold-<dato>.md`, med det
   repoets konvensjoner krever: dato og commit, forrige ledd, hva som er gjort
   per T-punkt, og **«Verifikasjon og grenser»** som skiller kjørt lokalt,
   observert i CI og ikke kontrollert.
3. Til oppdragsgiver: hva som er levert, hvilke av de tre som gjenstår og
   hvorfor, og om F0 dermed er ferdig bortsett fra DB-04 (som venter på B-01).

Ikke begynn på F1 eller B-02 i denne runden.
