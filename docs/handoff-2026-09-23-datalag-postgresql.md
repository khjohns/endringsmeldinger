# Handoff 2026-09-23: datalaget over direkte PostgreSQL (alternativ C)

Skrevet for den som overtar, i praksis en ny Claude-instans eller et Claude
Code-prosjekt som starter uten kontekst. Kriteriet er det samme som før: **hva
er dyrt å finne ut på nytt, og hvor er det lett å ta feil.** Fortellingen står i
dokumentene; dette er det som ikke gjentas der.

Forrige handoff: [21.09 (sen kveld)](handoff-2026-09-21-frister.md). Siden den
har B-02 fått designgrunnlag, uavhengig review og en revidert versjon, og
oppdragsgiver har begynt å avklare driftsplattform med IKT i virksomheten.

**Tilstand ved overlevering (23.09):** `main` står på `0125b1a` (PR #37 og #38
merget). To PR-er er åpne og grønne i CI:

- **#39** `b02-designrevisjon`: [design v2 for B-02](design-b02-tilgangsmekanisme-v2-2026-09-23.md)
  med prototype v2.
- **#40** `foreløpig-funn-beregningsresultat`: BR-01 som foreløpig funn i
  hovedplanen.

Ingen produksjonskode, migrasjon eller database er endret siden forrige handoff.

---

## 1. Les i denne rekkefølgen

| Dokument | Svarer på |
| --- | --- |
| Denne handoffen, avsnitt 3 og 7 | Hva som er besluttet eller foreslått, og hvordan arbeidet er tenkt satt opp |
| [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Autoritativ.** Invarianter 2.3, beslutninger 3.1–3.4, F0–F2. Merknadene under B-02 |
| [design v2 for B-02](design-b02-tilgangsmekanisme-v2-2026-09-23.md) | Operasjonsmodell, kontekstkontrakt, transportvariantene T1v og T2, seks åpne beslutninger |
| [reviewet av B-02](review-b02-tilgangsmekanisme-2026-09-23.md) | RB2-01–08. Hvorfor v2 ser ut som den gjør |
| [transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) | Kommando-, låse- og worker-kontrakten for F2 |

Design v1 og prototype v1 er historikk; v2 og reviewet erstatter dem.

## 2. Hva som skjedde siden forrige handoff

1. **B-02 designgrunnlag (v1, PR #37).** Tre alternativer; anbefalt C: RLS for
   lesing, `SECURITY DEFINER`-kommandoer for bindende skriving, skrivevakt på
   journalen. TM-01: den som kan signere et token for PostgREST, kan velge
   `service_role`.
2. **Uavhengig review (PR #38).** «Kan legges til grunn med navngitte
   endringer», RB2-01–08.
3. **Design v2 (PR #39, åpen).** Svar på alle åtte. Prototypen bygges som i
   Supabase, med `postgres` uten superbruker. 155 av 155 sjekker, tolv mutasjoner
   røde. TM-09–TM-12.
4. **BR-01 (PR #40, åpen).** Serveren ser ut til å godta klientens
   `beregnings_resultat` uten omberegning. Lest, ikke kjørt.
5. **Plattformsamtalen med IKT** (avsnitt 3).

## 3. Beslutninger: tatt, foreslått og ventende

**Tatt av oppdragsgiver 22.09** (står i [B-02-oppdraget](prompt-b02-tilgangsmekanisme-2026-09-22.md#2-oppdragsgivers-svar)):
ingen klienttilgang til basen; trusselmodellen med integritet ved overtatt
runtime og konfidensialitet som restrisiko; review av annen agent før F1.

**Oppdragsgiver heller mot 23.09, men har ikke formelt vedtatt:**

- **Alternativ C, transport T2:** backend snakker med PostgreSQL over direkte
  tilkobling og vanlig SQL, ikke over PostgREST og `supabase-py`. Det fjerner
  TM-01 og TM-09–TM-10, gir ekte transaksjoner i Python og databasekommandoer,
  og gjør lokal testing mot en egen PostgreSQL mulig uten virksomhetens base.
  Det opphever premisset i 3.1 om «RPC over PostgREST». **Første oppgave er å få
  dette bekreftet og ført inn som datert merknad** (avsnitt 6).
- **Azure Database for PostgreSQL (Flexible Server, versjon 17)** som
  foreløpig målplattform. Designet skal likevel ikke avhenge av Azure: C virker
  likt lokalt, på Supabase og på Azure.

**Venter på IKT:**

- Hosting av backend: Azure Container Apps eller App Service (Web App for
  Containers). Begge virker. Container Apps har jobber til workeren (B-07).
- Endelig databasevalg. IKT svarte «vi kan bruke en av de» om Azure SQL og
  PostgreSQL. Oppdragsgiver har foreslått PostgreSQL.
- Tilgang: deploy, Key Vault, offentlig HTTPS-adresse for Catenda-webhooks.

**Fabric er ikke backend.** IKT har Catenda-data i Fabric og foreslo Fabric som
backend. Svaret var: Fabric til rapportering, appen beholder egen database.
Fabric kan speile fra Azure PostgreSQL (GA, versjon 14–18, ikke Burstable-nivå).
Interne notater må holdes utenfor speilingen eller skjermes der; se
[vurderingen av Power Platform](vurdering-power-platform-2026-09-17.md), del 5.

## 4. Etablerte fakta — ikke finn dem igjen

**Om dagens kode (lest 22.–23.09):**

- Backend når basen bare gjennom `supabase-py`, altså PostgREST på `/rest/v1`,
  med `SUPABASE_SECRET_KEY` (`service_role`). Én delt klient per prosess
  ([`lib/supabase/client.py`](../backend/lib/supabase/client.py)). `auth(token)`
  endrer hele klienten (TM-04).
- Ni repositorier bruker `.table()`. `auth_repository.py` kaller fire funksjoner
  som RPC: `koe_resolve_identity`, `koe_reconcile_memberships`,
  `koe_register_project`, `koe_set_contract_teams`.
- Uten `EVENT_STORE_BACKEND` lagrer appen hendelser i JSON og metadata i CSV
  på disk. Godkjenningspakker, utkast, vedleggsregister og leveringsstatus
  ligger i SQLite. Alt dette er efemert i en container (AR-03).
- Brukerens team hentes fra Catenda ved hver forespørsel og lagres ikke
  (TM-03). `catenda_contract_teams` kobler prosjekt, team og side.
- `catenda_id()` gir 32 små heksadesimale tegn uten bindestreker.

**Om basen (katalogen i `gwdxadexwktegkklyobv`, 22.–23.09):**

- `postgres` er ikke superbruker, men har `BYPASSRLS`, `CREATEROLE` og `ADMIN`
  på plattformrollene. `authenticator` er `NOINHERIT` og medlem av `anon`,
  `authenticated` og `service_role`.
- Alle nitten tabeller har RLS på og policy `service_role / ALL / true`.
  `anon` og `authenticated` har ingen rettigheter i `public`.
- Identitetsfunksjonene er `SECURITY INVOKER` og virker bare med
  `service_role` (TM-02).
- `pgaudit` er forhåndslastet, ikke opprettet.

**Om migrasjonene:** de forutsetter plattformrollene og skjemaet `auth`
([`scripts/testbase/plattformstubb.sql`](../scripts/testbase/plattformstubb.sql)).
Én migrasjon har egen `BEGIN`/`COMMIT` og kan ikke kjøres med
`--single-transaction`. Alle 23 bygger som `postgres` uten superbruker (K 23.09,
prototype v2).

## 5. Feller fra denne runden

1. **`40001` i en kommando får PostgREST til å kjøre transaksjonen på nytt**
   til klienten gir opp (TM-05). Bruk en egen SQLSTATE for versjonskonflikt.
   Gjelder bare så lenge PostgREST er i bruk, men det samme spørsmålet oppstår
   med retry-logikk i Python.
2. **Kontekst må settes transaksjonslokalt:** `set_config(..., true)` og
   `SET LOCAL ROLE`, inne i en eksplisitt transaksjon. Sesjonsnivå lekker til
   neste forespørsel på samme forbindelse; prototypen har en kontroll som viser
   det. En variabel som har vært satt i sesjonen, er `''` etter commit, ikke
   `NULL`.
3. **Eierskifte uten superbruker** krever at migreringsrollen midlertidig kan
   `SET ROLE` til den nye eieren, og at eieren har `CREATE` i skjemaet. Ta begge
   tilbake i samme migrasjon.
4. **En rolle med `CREATEROLE` får `ADMIN` på rollene den oppretter** (PG16+),
   og kan gi seg selv `SET`. Det er administratorgrensen, ikke et hull i
   runtime.
5. **Grønne sjekker beviser lite alene.** Hver regel i prototypen har en
   mutasjon som skal gjøre beviset rødt. `FORCE ROW LEVEL SECURITY` ga ingen
   rød sjekk i v1, fordi eieren har `BYPASSRLS`; det står nå som katalogkontroll.
6. **PostgREST fra Homebrew på macOS** leter etter libpq under
   `/opt/homebrew/opt/libpq`. Sett `DYLD_FALLBACK_LIBRARY_PATH`, og start den
   ikke via `nohup`, som stripper variabelen. Trengs ikke med C.
7. **Evidensnivå:** reviewet tok to påstander i v1 som var sterkere enn
   belegget (TM-05, TM-06). Skriv K bare for det som er kjørt.

## 6. Dokumentasjon som må oppdateres når C er bekreftet

| Dokument | Endring |
| --- | --- |
| Hovedplanen 3.1 | Datert merknad: premisset «RPC over PostgREST» oppheves med TM-01 som motbelegg. Ny formulering: én bindende kommando er én transaksjon, over direkte tilkobling til databasekommandoer |
| Hovedplanen 3.3 og 3.4 | TS2-02 fra forslag til vedtatt. B-02 punkt 2 (transport) avgjort som T2. Ny åpen beslutning om plattform (Azure PostgreSQL eller Supabase) og hosting, eier oppdragsgiver med IKT |
| Hovedplanen 2.2 | Radene «Sammensatt skriving», «Roller» og «CI» |
| Hovedplanen F0–F3, F5 og avsnitt 6 | Ny første leveranse: datalaget over direkte tilkobling (avsnitt 7). F2 og F3 viser til RPC; F5 viser til Supabase-konsollet |
| [Design v2 for B-02](design-b02-tilgangsmekanisme-v2-2026-09-23.md) | Merknad: T2 valgt; T1v og porten mot hostet PostgREST bortfaller |
| [Transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) og [durable inbox/outbox](design-durable-inbox-outbox-2026-09-17.md) | Merknad: blokkeringen «et REST-kall kan ikke være med i en transaksjon» faller bort med direkte tilkobling |
| [B-02-oppdraget](prompt-b02-tilgangsmekanisme-2026-09-22.md) | Merknad under plattformsvaret: Azure PostgreSQL er foreløpig mål; portabilitetskravet står |
| [Arkitekturdiagrammene](arkitektur-diagrammer.md) | Merknad: Azure SQL er erstattet av Azure PostgreSQL; backend i Container Apps eller App Service; Fabric til rapportering |
| `AGENTS.md` | **Ikke ved beslutningen, men når byttet er gjennomført.** Avsnittene om Supabase-MCP, `supabase db push`, `PermanentError` fra Supabase-lagre, `supabase_dobbel` og stubbens `service_role` blir da feil. Fila skal bare ha det som er stabilt |
| `docs/README.md` | Rad for denne handoffen og for dokumentene over |

## 7. Forslag til oppsett som Claude Code-prosjekt

**Mål for prosjektet:** «Backend når PostgreSQL over direkte tilkobling
(alternativ C, T2). Samme kode virker lokalt, i CI og på Azure PostgreSQL.
JSON-, CSV- og Supabase-lagrene er ute av kjøretidsstien. Deretter F1-rollene
fra B-02 v2 som migrasjoner.»

**Miljøet** for trådene: PostgreSQL 17 må kunne installeres i skymiljøet, for
eksempel i oppsettskriptet. PostgREST trengs ikke. `AGENTS.md` lastes
automatisk.

**Tråder, i denne rekkefølgen:**

| Fase | Tråd | Kan gå parallelt | Avhenger av | Kontroll før neste fase |
| --- | --- | --- | --- | --- |
| 0 | Beslutningen og dokumentoppdateringene i avsnitt 6 | Nei | Oppdragsgivers bekreftelse | Oppdragsgiver leser |
| 1 | **Kjernen:** `lib/db` med pool og en `transaksjon(kontekst)`-hjelper som setter rolle og krav lokalt; miljøvalg (`DATABASE_URL`); lokal oppstart (skript eller Docker Compose) med `bygg_testbase.sh`; skrivbar testfixture ved siden av den lesende; feilklassifisering for den nye driveren (`PermanentError`, retry) | Nei | Fase 0 | **Uavhengig review** i egen tråd. Alle garantiene hviler på kjernen |
| 2 | **Repositoriene**, ett eller to per tråd, bak dagens grensesnitt, med tester mot ekte PostgreSQL: (a) hendelse og notat, (b) saksmetadata, relasjoner og BIM, (c) identitet, sesjoner, medlemskap og prosjekter (inkludert de fire RPC-ene), (d) Catenda-konfigurasjon | Ja | Fase 1 | Tester og `/code-review` per PR. `/simplify` samlet når alle er inne |
| 2 | **Container:** Dockerfile for backend og GitHub Actions for Azure | Ja | Svar fra IKT | `/code-review` |
| 2 | **BR-01:** reproduser eller avvis | Ja | Ingenting | Testen er beviset |
| 3 | **TS2-02:** JSON-, CSV- og Supabase-testdoblene ut av kjøretidsstien | Nei | Alle repositoriene | CI grønn og `/simplify` |
| 4 | **F1 fra B-02 v2:** roller, kontekst, policyer, skrivevakt og kommandoer som migrasjoner; rettighetsmatrise og mutasjoner i CI | Delvis | Fase 3 og beslutningene i B-02 v2 avsnitt 9 | **Uavhengig review**, som oppdragsgiver krevde 22.09 |

Uavhengig review betyr en annen tråd enn den som skrev, med et eget oppdrag i
formen til [reviewoppdraget for B-02](prompt-review-b02-tilgangsmekanisme-2026-09-22.md).
`/simplify` ser etter gjenbruk og kompleksitet, ikke etter feil. Den er ikke et
review. Gi den beskjed om å la sikkerhetskontrollene stå:

- `SET LOCAL` og transaksjonslokal kontekst;
- `nullif(..., '')`;
- fail-closed-kontroller som ser dobbelte ut;
- eksplisitte `REVOKE`-er;
- like svar for «ukjent» og «ikke tilgang».

Kjør testene og mutasjonene etterpå.

Trådene i fase 2 berører hver sine filer. Konflikter oppstår mest i
`core/container.py` og testfixturene. Kjernen i fase 1 bør derfor definere dem
ferdig.

## 8. Hva som krever et menneske

- Bekreftelse av C/T2 og Azure PostgreSQL som foreløpig mål (avsnitt 3).
- Svarene fra IKT: hosting, database, tilgang.
- De seks beslutningene i [B-02 v2, avsnitt 9](design-b02-tilgangsmekanisme-v2-2026-09-23.md#9-hva-oppdragsgiver-må-avgjøre).
  Med T2 bortfaller punkt 2, og porten mot hostet PostgREST trengs ikke.
- Merge av #39 og #40.

## 9. Hva som ikke skal gjøres om igjen

- Å bruke Fabric som backend. Avklart: Fabric til rapportering.
- Å velge Azure SQL «for Microsoft-miljøets skyld» uten en konkret grunn fra IKT.
  Det betyr et nytt datalag i T-SQL.
- Å argumentere for T1v på nytt. Med C er PostgREST ute, og det var hele grunnen
  til vakten.
- Å flytte NS 8407-regler til frontenden. Frontenden kan beregne som veiledning;
  serveren eller databasen må håndheve (BR-01 er et eksempel på hva som skjer
  ellers).

## 10. Hvor jeg ville begynt

Fase 0, så fase 1. Kjernen avgjør formen på alt som kommer etter, og er det
eneste som ikke bør deles mellom tråder. Prototype v2
(`docs/vedlegg/b02-prototype-v2-2026-09-23/`) viser konteksthåndteringen
over direkte innlogging (`koe_runtime_login`) og kan brukes som mønster, ikke
som kode.
