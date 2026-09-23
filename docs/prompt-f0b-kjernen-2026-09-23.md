# Oppdrag: kjernen i datalaget over direkte tilkobling (F0b, punkt 1)

**Dato:** 2026-09-23. **Utgangspunkt:** `main` etter PR #41. Kontroller HEAD og
Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke funnstatus eller
beslutninger.

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
beslutningen i 3.1 (23.09) og F0b i avsnitt 5, og
[handoffen 23.09](handoff-2026-09-23-datalag-postgresql.md), avsnitt 4, 5 og 7.
**Neste ledd:** [uavhengig review av kjernen](prompt-review-f0b-kjernen-2026-09-23.md),
i en annen tråd.

## 1. Mål

Backend skal kunne nå PostgreSQL over direkte tilkobling med en databasedriver
og vanlig SQL. Kjernen er det alle repositoriene i F0b punkt 2 skal bygge på,
og det eneste i F0b som ikke deles mellom tråder. Den skal derfor gjøre
trådene etter seg uavhengige av hverandre.

Oppdraget konverterer **ingen** repositorier. Ferdig når:

1. `backend/lib/db/` har en pool og en hjelper, for eksempel
   `transaksjon(kontekst)`, som åpner en eksplisitt transaksjon, setter rolle
   og krav transaksjonslokalt og gir en forbindelse tilbake til poolen uten
   noe av dette.
2. Tilkoblingen velges med `DATABASE_URL`. Uten verdi finnes det ingen
   tilkobling, og et forsøk på å bruke den feiler høyt. Det finnes ingen
   standardverdi og ingen stille reserve.
3. Driverens feil er klassifisert inn i hierarkiet i `lib/supabase/exceptions.py`
   eller et felles hierarki som erstatter det, slik at `PermanentError`,
   `ConflictError` og `ConcurrencyError` betyr det samme som før.
4. `core/container.py` og testfixturene er definert ferdig for trådene i punkt 2:
   hver tråd skal bare trenge å legge til sitt eget repositorium og sine egne
   tester.
5. Lokal oppstart er beskrevet og kjørbar: en kastbar PostgreSQL 17 bygget med
   `scripts/testbase/bygg_testbase.sh`, som skript eller Docker Compose.
6. Testene i avsnitt 5 er grønne lokalt og i CI-jobben `database`.

## 2. Les først, og bare dette

- `AGENTS.md` i sin helhet. Særlig avsnittet om `PermanentError` fra lagrene,
  om testdoblene og om at grønn suite ikke er bevis for basen.
- Hovedplanen: 2.3 (invariant 3), 3.1, F0b og F1.
- Handoffen 23.09, avsnitt 4, 5 og 7.
- [Design v2 for B-02](design-b02-tilgangsmekanisme-v2-2026-09-23.md), avsnitt 4
  (kontekstkontrakten) og 7 (tidskontrakten), og merknaden om T2 øverst.
- Prototype v2: `kontekst()` og T2-sjekkene i
  [`bevis.py`](vedlegg/b02-prototype-v2-2026-09-23/bevis.py), og
  `koe_runtime_login` i `02_b02_lag.sql`. Et mønster, ikke kode å kopiere.
- `backend/lib/supabase/` (`client.py`, `exceptions.py`, `retry.py`),
  `backend/core/container.py`, `backend/core/config.py`,
  `backend/repositories/event_repository.py` (`ConcurrencyError`,
  `JournalfoeringAvvist`), `backend/tests/test_database/conftest.py` og
  CI-jobben `database` i `.github/workflows/ci.yml`.

## 3. Kontrakten kjernen skal holde

**Kontekst er transaksjonslokal, alltid.** Bruk `SET LOCAL ROLE` og
`set_config(..., true)` inne i en eksplisitt transaksjon. Merk at `SET LOCAL`
utenfor en transaksjonsblokk bare gir en advarsel og ikke virker. En forbindelse
i autocommit som får `SET LOCAL`, kjører videre som innloggingsrollen. Det skal
ikke være mulig å bruke hjelperen slik. Sesjonsnivå lekker til neste forespørsel
på samme forbindelse (handoffen, felle 2).

**Kontekstformen følger v2 avsnitt 4**, så F1-policyene kan skrives mot den uten
omskriving. Velger du andre variabelnavn enn prototypen, begrunn det.

**Rollen finnes ikke ennå.** `koe_runtime` og de andre rollene kommer i F1. Før
det kobler backend til med dagens rettigheter (F0b i hovedplanen). Hjelperen
skal likevel kunne sette en rolle, og testene skal prøve det med en kastbar
rolle som testfixturen oppretter. Ingen migrasjon for roller i dette oppdraget.

**En variabel som har vært satt, er `''` etter commit, ikke `NULL`.** Kjernen
skal ikke tolke tom streng som en verdi.

**Retry gjelder hele transaksjonen, aldri én setning inne i den.** Dagens
`@with_retry()` pakker inn hver repositoriemetode. Over direkte tilkobling er det
feil nivå: en setning kan ikke prøves på nytt etter at transaksjonen er avbrutt.
Avklar og dokumenter tre tilfeller:

- serialiseringsfeil og vranglås (`40001`, `40P01`): hele transaksjonen kan
  prøves på nytt;
- versjonskonflikt: egen SQLSTATE, ikke `40001`, og ingen ny kjøring
  (handoffen, felle 1). Blir til `ConcurrencyError`;
- tapt forbindelse under `COMMIT`: utfallet er ukjent. Det skal ikke prøves
  blindt på nytt for en skriving som ikke er idempotent. Si hva kalleren får.

**Avvisninger er `PermanentError`.** Skranker (`23xxx`), ugyldige verdier
(`22xxx`) og manglende rettighet (`42501`) er permanente. Et ukjent unntak regnes
i dag som forbigående; vurder om det er riktig for driveren, og begrunn valget.

**Forbindelsen lekker ikke hemmeligheter.** `DATABASE_URL` og passord skal ikke
i logger eller feilmeldinger.

## 4. Føringer

- **Ingen repositorier konverteres**, og ingen migrasjoner skrives. Supabase-
  lagrene og `supabase-py` blir stående til F0b punkt 3 (TS2-02).
- **Driver:** `psycopg` 3 finnes allerede i `requirements-dev.txt` for
  databasetestene. Flytt den til `requirements.txt` med fast versjon, og bruk
  `psycopg_pool` om du trenger pool. Et annet valg må begrunnes.
- **Flask er synkron.** Velg pool og transaksjonsform deretter. Poolstørrelse og
  tidsgrenser kommer fra konfigurasjonen, ikke fra konstanter i koden.
- **Plattformen er ikke avgjort (B-12).** Kjernen skal ikke anta Supabase,
  Supavisor eller Azure. Står det noe om PgBouncer i transaksjonsmodus, som
  Azure tilbyr, er det en merknad om hva som ikke er prøvd, ikke en tilpasning.
- **Ikke bland inn F1.** Ingen RLS, policyer eller kommandoer. Kjernen er
  transport og kontrakt.
- `ruff check backend/` skal være 0. Ikke kjør `ruff format` på treet.
- Få kommentarer (`AGENTS.md`). Kontrakten i avsnitt 3 hører hjemme i et
  gjennomføringsnotat i `docs/`, ikke i en kommentarblokk.

## 5. Tester som beviser

Mot ekte PostgreSQL, merket `database`, og kjørt av CI-jobben. Hver test skal
kunne bli rød: prøv selv at den feiler når regelen fjernes, og skriv i notatet
hvordan.

1. **Ingen lekkasje på gjenbrukt forbindelse.** Pool med én forbindelse. Sett
   rolle og krav i én transaksjon, avslutt med commit, deretter med rollback,
   deretter med et unntak midt i. Neste transaksjon ser innloggingsrollen og tom
   kontekst.
2. **Hjelperen kan ikke brukes utenfor transaksjon**, eller gjør det umulig å
   sette kontekst uten en.
3. **Delvis skriving finnes ikke.** To skrivinger i én transaksjon, feil etter
   den første: ingen av dem er synlige fra en uavhengig forbindelse.
4. **Feilklassifisering:** én test per klasse i avsnitt 3, med ekte SQLSTATE fra
   basen, ikke konstruerte unntak.
5. **Retry:** en `40001` gir ny kjøring av hele transaksjonen; en
   versjonskonflikt gir `ConcurrencyError` uten ny kjøring.
6. **Ingen `DATABASE_URL`:** tydelig feil, ingen tilkobling og ingen reserve.

Den skrivbare fixturen skal stå ved siden av den lesende i
`tests/test_database/conftest.py`, rydde etter seg (for eksempel én transaksjon
per test som rulles tilbake, eller en kastbar base) og ikke kunne peke på en
base utenfor testmiljøet.

## 6. Lever

- Koden i `backend/lib/db/`, endringene i `core/container.py`, `core/config.py`,
  fixturene og testene.
- Lokal oppstart: skript eller `docker-compose.yml`, og en kort beskrivelse.
- Et gjennomføringsnotat, `docs/gjennomforing-f0b-kjernen-<dato>.md`, etter
  repoets form: dato og commit, lenke hit, kontrakten fra avsnitt 3 slik den ble,
  valgene med begrunnelse, hvilke tester som ble prøvd røde og hvordan, og
  **«Verifikasjon og grenser»**, som navngir hva som ikke er prøvd (for eksempel
  PgBouncer, Azure og Supavisor).
- En datert merknad under F0b i hovedplanen om at kjernen finnes, og at den venter
  på review. Status settes ikke til «gjort» før reviewet er levert.
- En rad i `docs/README.md`, en gren og en PR. Ikke merge før reviewet er levert.
