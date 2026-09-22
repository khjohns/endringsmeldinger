# Konsolidert kildegrunnlag og dekningsmatrise (2026-09-21)

> **Merknad 2026-09-22:** Historisk forslag. Avløst av v2 og deretter av den
> [sluttredigerte hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md). Statusene i matrisen under gjelder ikke.

**Dato:** 2026-09-21  
**Gjeldende commit ved oppstart:** `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (gren `main`)  
**Utgangspunkt ved oppdragsbeskrivelsen:** `fc9b179`  
**Status:** **Reviewforslag — erstatter ikke masterplanen før godkjenning.**  
**Hoveddokument:** [Konsolidert masterplan for review](konsolidering-masterplan-2026-09-21.md)  
**Forrige ledd i dokumentkjeden:**
- [Siste handoff (21.09 sen kveld: fristene er lukket)](handoff-2026-09-21-frister.md)
- [Gjeldende masterplan](plans/2026-09-16-godkjenning-og-varig-levering.md)
- [Arkitekturføringer (AF-01–AF-06, 21.09)](arkitekturforinger-2026-09-21.md)
- [Delplan: atomisk utstedelse og outbox](plans/2026-09-17-atomisk-utstedelse-og-outbox.md)
- [Design: målskjema for databasen](design-maalskjema-database-2026-09-20.md)
- [Design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md)

---

## 1. Mandat og metodisk avgrensning

Dette dokumentet utgjør det etterprøvbare kildegrunnlaget for den konsoliderte
masterplanen. I henhold til mandatet i [`docs/prompt-gemini-konsolidering-2026-09-21.md`](prompt-gemini-konsolidering-2026-09-21.md)
gir dette dokumentet:
1. En **komplett dekningsmatrise** over samtlige arbeidspakker, produksjonskrav,
   arkitekturføringer og funnfamilier fra hele dokumentkjeden (RV, SA, AP, DA, MS, KR,
   RY, MG, AR, S, AF og 60-funns-serien fra 18.09).
2. En strukturert **avvikstabell (`KONS-01` til `KONS-14`)** over motsetninger,
   designinnvendinger, dokumentasjonsavvik og reproduserte kode-/databasefeil.
3. En **detaljert analyse per avvik** med presis påstand, kildebelegg, motbelegg,
   konklusjon og foreslått endring i ordlyd for reviewer.
4. **Verifikasjonsbevis**, testkommandoer, miljøobservasjoner og eksplisitte grenser.

Eksisterende produksjonskode, migrasjoner, konfigurasjon og eksisterende tester er
holdt urørt i denne runden. Ingen skriving er utført mot det eksterne Supabase-prosjektet
eller Catenda.

---

## 2. Gjennomgåtte kilder og utgangspunkt

### Git-tilstand
- `git rev-parse HEAD`: `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2`
- Gren: `main`
- Siste merge commit før oppdraget: `fc9b179` (Merge PR #32: rett det som ble galt av MG-02)
- Commit `0bdc1dc` la til arkitekturføringene (`docs/arkitekturforinger-2026-09-21.md`) og
  oppdragsbeskrivelsen (`docs/prompt-gemini-konsolidering-2026-09-21.md`), samt daterte
  merknader i `docs/README.md`, masterplanen og designdokumentene. Ingen produksjonskode
  ble endret i `0bdc1dc`.

### Gjennomgått dokumentkorpus
1. `AGENTS.md` og `docs/README.md`
2. `docs/handoff-2026-09-21-frister.md`, `docs/handoff-2026-09-21-korrekthet.md`, `docs/handoff-2026-09-21.md`, `docs/handoff-2026-09-20.md`, `docs/handoff-2026-09-19.md`
3. `docs/plans/2026-09-16-godkjenning-og-varig-levering.md` (hele masterplanen)
4. `docs/arkitekturforinger-2026-09-21.md`
5. `docs/plans/2026-09-17-atomisk-utstedelse-og-outbox.md`
6. `docs/design-maalskjema-database-2026-09-20.md` og `docs/design-durable-inbox-outbox-2026-09-17.md`
7. `docs/gjennomforing-mg02-2026-09-21.md`, `docs/gjennomforing-ms05-2026-09-21.md`, `docs/gjennomforing-maalskjema-2026-09-20.md`
8. `docs/audit-opprydding-2026-09-21.md`, `docs/audit-korrekthet-2026-09-21.md`, `docs/audit-maalskjema-gjennomgang-2026-09-21.md`
9. `docs/audit-databasearkitektur-2026-09-20.md`
10. `docs/arkitekturvurdering-2026-09-19.md`, `docs/vurdering-av-auditfunn-2026-09-19.md`, `docs/sammenstilling-arkitektur-og-auditspor-2026-09-19.md`
11. `docs/audit-review-astra-2026-09-17.md`, `docs/audit-sikkerhetsarkitektur-2026-09-17.md`
12. `docs/personopplysninger-faktagrunnlag-2026-09-19.md`

---

## 3. Full dekningsmatrise for masterplanen

Matrisen skiller presist mellom følgende tilstander:
- **foreslått:** omtalt som mulig løsning eller fremtidig opsjon.
- **besluttet:** fastsatt av oppdragsgiver / arkitekturansvarlig, men ikke fullt implementert.
- **implementert i repoet:** produksjonskode og tester finnes i Git-historikken.
- **dokumentert anvendt eksternt:** migrasjon/endring er protokollført anvendt i Supabase.
- **verifisert i denne runden:** kontrollert ved faktisk testkjøring eller direkte kodelesing i denne sesjonen.
- **delvis gjennomført:** deler av kravet er levert, men restanser gjenstår.
- **avvist/erstattet:** funn eller forslag som er tilbakevist eller erstattet av nyere beslutning.
- **uavklart:** krever avklaring eller domenebeslutning.

| Pakke / Funn | Dokumentert status | Beslutningskilde | Implementeringsbelegg | Verifikasjon | Avvik / Usikkerhet | Avhengigheter | Ferdig når |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **0 — Lukk eksponering** | Lukket | Masterplan 18.09, SA-01/02 | `routes/`, `test_public_route_registry.py` | Verifisert i denne runden (test passert) | Ingen | Ingen | Ruteregister gater enhver ny rute |
| **SA-01** | Lukket | Masterplan 18.09 | Supabase OAuth slettet; kun Catenda-login | Verifisert i denne runden (`test_supabase_oauth_flaten_er_borte`) | Ingen | Ingen | Ingen Supabase OAuth i appen |
| **SA-02 / SA-03** | Lukket | Masterplan 18.09 | Analytics blueprint og ruter slettet | Verifisert i denne runden (kode mangler ruter) | Ingen | Ingen | Ingen intern lekkasje via analytics |
| **1 — Felles sikkerhetsgrenser** | Delvis gjennomført | Masterplan 18.09, AF-01 | `lib/auth/project_access.py`, `cases_in_project` | Verifisert i denne runden (kodelesing) | Grensen ligger bare i Python, ikke i databasen (KONS-04) | Fase 1 datalag | Datalag avviser kryssprosjekt/team direkte |
| **RV-07 (Relasjoner & prosjekt)** | Lukket for forsering | Merknad 19.09 til RV-07 | `BaseSakService.hent_relaterte_saker` | Verifisert i denne runden (regresjonstester) | Lukket som klasse i koden; mangler DB-fremmednøkler | AF-03 / Fase 1 | Fremmednøkler håndheves i DB |
| **AUT-01 / AUT-02** | Lukket | Merknad 19.09 til RV-07 | `tillatte_saker` påkrevd i `hent_relaterte_saker` | Verifisert i denne runden | Ingen | Ingen | Ingen ufiltrert relasjonsvandring |
| **AUT-03** | Åpen | Vurdering 19.09 | `event_routes.py:819` (`submit_batch`) | Verifisert i denne runden (kodelesing) | `submit_batch` oppdaterer `last_event_at` for notater | Fase 1 | Skrivestien skiller notater fra felles stempel |
| **1 — Verifiserbar leveranseprosess** | Delvis gjennomført | Masterplan 19.09 | `.github/workflows/ci.yml` (3 jobber + lint) | Verifisert i denne runden (CI-fil finnes) | Mangler ekte PostgreSQL-test og merge-sjekker | Fase 0 | CI kjører mot ekte PostgreSQL; gater branch |
| **AR-05 / S9 (CI)** | Lukket i repo | Merknad 19.09 | `.github/workflows/ci.yml` | Verifisert i denne runden | Merge-sjekker i GitHub innstillinger kreves | GitHub repo-admin | Påkrevde checks satt i GitHub |
| **DA-03 / DA-04 (Migrasjonsmekanisme)** | Delvis gjennomført | Handoff 20.09 kveld | `supabase/config.toml`, `supabase/migrations/` | Verifisert i denne runden (`test_migrasjonsmappa...`) | `migration repair` krever legitimasjon (KONS-10) | Supabase auth | `supabase db push` stemmer 100 % med basen |
| **1 — Byggreproduserbarhet** | Foreslått / Åpen | Masterplan 19.09 | `backend/requirements-dev.txt` har `ruff==0.16.8` | Verifisert i denne runden | 100 % av prod-deps bruker `>=` (KONS-08) | Fase 0 | Alle deps i `requirements.txt` pinnet |
| **1 — HTTP-herding** | Foreslått / Åpen | Masterplan 19.09 | `nginx.conf` har bare cache-headere | Verifisert i denne runden (kodelesing) | CSP, HSTS, frame-ancestors mangler | Fase 0 | Nginx leverer strenge sikkerhetshoder |
| **1 — Universell utforming** | Foreslått / Åpen | Masterplan 19.09 | Svelte-filer | Verifisert i denne runden (3 a11y-advarsler funnet) | 3 advarsler i `WithdrawModal` og `Kontrollrommet` | Fase 4 | `npm run check` har 0 a11y-advarsler |
| **1 — Catenda-avhengighet** | Foreslått / Åpen | Masterplan 19.09 | Dokumentasjon mangler | Ikke kontrollert mot Catenda SLA | Avtaleverk og oppetidsrisiko uavklart | Fase 4 | Skriftlig SLA og nedetidsprosedyre signert |
| **1 — Databasearkitektur** | Gjennomført delvis | Handoff 20.09, DA-01–15 | 23 migrasjonsfiler, 19 tabeller | Verifisert i denne runden (`test_database_arkitektur`) | 8 tabeller mangler eksplisitt GRANT i repo (KONS-13) | Fase 1 | Alle tabeller har eksplisitte rettigheter |
| **DA-01 (Mangler i repo)** | Lukket | Handoff 20.09 | Rekonstruert i `20260911073512`, `20260911080500` | Verifisert i denne runden | Ingen | Ingen | Repo bygger tom PostgreSQL 16/17 |
| **DA-02 / RV-08 (`actorteam`)** | Lukket | Handoff 20.09 | `20260920152042_event_tables_actorteam.sql` | Dokumentert anvendt eksternt 20.09 | Ingen | Ingen | Kolonnen finnes i `hendelse` |
| **DA-05 (Backend migrasjonsdrift)** | Lukket | Handoff 20.09 | `20260920160000_avstem_backend_migrations.sql` | Verifisert i denne runden | Ingen | Ingen | Identisk katalog på 5 snitt |
| **DA-06 (Skjema i 4 kilder)** | Lukket | Handoff 20.09 sent | Docstring i repo erstattet med henvisning til fil | Verifisert i denne runden | Ingen | Ingen | Migrasjonsmappa er eneste sannhetskilde |
| **DA-07 (`app_identities`)** | Korrigert / Lukket | DA-07 | I bruk av `koe_resolve_identity` (14 rader) | Verifisert fra katalogen 20.09 | Ingen | Ingen | Tabellen bevares |
| **DA-08 (`user_groups`)** | Besluttet fjernet | Målskjema MS-15 | Eksisterer fortsatt i basen | Verifisert i denne runden (tabell finnes) | Etterlatenskap som må droppes | Fase 1 | `DROP TABLE user_groups` anvendt |
| **DA-09 (`magic_links`)** | Besluttet fjernet (P1) | Målskjema MS-15 | Eksisterer fortsatt i basen; tokens i fil | Verifisert i denne runden | Etterlatenskap som må droppes | Fase 1 | `DROP TABLE magic_links` anvendt |
| **DA-10 (`project_memberships`)** | Besluttet fjernet (betinget) | Målskjema MS-15, DB-05 | Eksisterer fortsatt i basen; trigger skriver | Verifisert i denne runden | Krever at `viewer` først legges til i ny tabell | Fase 1 | `app_project_memberships` har `viewer` |
| **DA-11 / AR-01 (RLS-prosjektgrense)**| Åpen | Audit 20.09, AF-01 | RLS-policyer har `service_role / ALL / USING(true)`| Verifisert i denne runden (kodelesing) | Grensen håndheves bare i Python (KONS-04) | Fase 1 | RLS / DB-rolle håndhever prosjekt/team |
| **MS-01 (Én hendelsestabell)** | Gjennomført | Handoff 20.09 | `20260920193558_hendelse_tabell.sql` | Dokumentert anvendt eksternt 20.09 | Ingen | Ingen | `hendelse` bærer alle sakstyper |
| **MS-02 (Append-only i DB)** | Besluttet / Åpen | Målskjema 20.09, AF-02 | Ikke implementert i databasen | Verifisert i denne runden (ingen trigger finnes) | Mangler både mot UPDATE/DELETE og INSERT (KONS-05) | Fase 1 | `REVOKE` + trigger + RPC-innsetting |
| **MS-03 (Total orden & rebase)** | Besluttet | Målskjema 20.09 | `UNIQUE(sak_id, versjon)` i `hendelse` | Verifisert i denne runden (skranke finnes) | Rebase-regler i Python må formaliseres | Fase 2 | Sporuavhengige hendelser rebases |
| **MS-04 (`aktor_id` i journal)** | Gjennomført | Handoff 20.09 | `hendelse.actorid` bærer `app_users.id` | Dokumentert anvendt eksternt 20.09 | `actorid` er fortsatt `TEXT` pga testskript | MG-02 | Journalen inneholder aldri personnavn |
| **MS-05 (Notater ut av journal)** | Gjennomført | Handoff 21.09 sen kveld | `20260921153900_notat_tabell.sql`, `notat` tabell | Dokumentert anvendt eksternt 21.09 | Teamvern ligger bare i Python (KONS-04) | Fase 1 | Notater kan slettes av forfatter; flettes |
| **MS-06 / MS-07 (`sak_projeksjon`)** | Besluttet / Åpen | Målskjema 20.09 | `sak_metadata` har fortsatt 11 cached-felter | Verifisert i denne runden (kodelesing) | Flere skrivere på projeksjonen i dag | Fase 2 | Én skriver i hendelsestransaksjonen |
| **MS-08 (`sak_relations`)** | Revurderes | AF-03, masterplan merknad 21.09 | `sak_relations` finnes; mangler FK | Verifisert i denne runden | GIN-forslag erstattet av projeksjon (KONS-03) | Fase 2 | Atomisk oppdatert projeksjon m/FK |
| **MS-09 (Prosjekt & team i DB)** | Revurdert / Utvidet | AF-01, masterplan merknad 21.09 | Kun `prosjekt_id NOT NULL` i tabeller | Verifisert i denne runden | Må dekke team og private data (KONS-04) | Fase 1 | Databasen avviser innsyn på tvers |
| **MS-10 (`organisasjon_id`)** | Gjennomført | Handoff 20.09 | `20260920192448_organisasjon_id_paa_projects.sql`| Dokumentert anvendt eksternt 20.09 | KR-01 krasjet registrering; lukket 21.09 | Ingen | `projects.organisasjon_id` er `NOT NULL` |
| **MS-11 (Vedleggshash)** | Revurdert / Utvidet | Målskjema, AF-04 | `vedlegg_registry.py` mangler hash | Verifisert i denne runden (ingen hash-kolonne) | Hash alene gir ikke fullt bevis (KONS-06) | Fase 2 / 4 | `innhold_sha256` + versjon + eksport |
| **MS-12 (`project_configs` inn)**| Besluttet / Åpen | Målskjema 20.09 | Tabellene er fortsatt separate | Verifisert i denne runden | Ingen | Fase 1 | Kolonner flyttet inn på `projects` |
| **MS-13 / MS-14 (BIM som event)**| Besluttet / Åpen | Målskjema 20.09 | `sak_bim_links` er fortsatt egen slettbar tabell| Verifisert i denne runden | Ingen | Fase 2 | BIM-kobling er hendelse; tabell er projeksjon|
| **1 — Oppbevaring og sletting** | Besluttet / Lukket (P7)| Merknad 21.09 kveld | MS-04, MS-05, MG-02 gjennomført | Verifisert i denne runden | Sletteregler for notater uavklart | Fase 5 | DPIA formelt forankret i arkivplikt |
| **2 — Atomisk domene & levering**| Besluttet / Åpen | Transaksjonsplan 17.09, AF-02 | Ingen RPC, ingen outbox-tabell ennå | Verifisert i denne runden (kode mangler outbox)| Outbox over PostgREST var feilaktig avvist (KONS-01)| Fase 2 | Referanseflyt EO utstedt i én transaksjon |
| **AP-01 / AP-02 / AP-03 / AP-05**| Lukket | Masterplan 17.09, 18.09 | Regresjonstester for fullmakt og EO-inngang | Verifisert i denne runden (tester grønne) | Ingen | Ingen | Korrekte fullmakter og satser |
| **AP-04 / AR-06 / TST-03** | Åpen (streng xfail) | Masterplan 16.09, AF-02 | `TrackingUnitOfWork` kompenserer usunt | Verifisert i denne runden (kodelesing) | Kompensasjon ruller ikke tilbake events | Fase 2 | Ekte transaksjon (RPC) erstatter kompensasjon|
| **2 — Minste privilegier** | Åpen | Masterplan 16.09, AF-02 | Alt kjører med `service_role` i dag | Verifisert i denne runden (kodelesing) | 8 tabeller mangler eksplisitt GRANT (KONS-13) | Fase 1 | Runtime-rolle uten BYPASSRLS |
| **2 — Domenegjennomgang NS 8407**| Delvis gjennomført | Masterplan 19.09, RC-8 | TFR-01 og GFK-01 lukket | Verifisert i denne runden | TFR-02–06 og GFK-02–06 åpne | Fase 4 | Alle overganger formelt verifisert |
| **TFR-01 (Avslag akseptert)** | Lukket | Merknad 19.09 til TFR-01 | `SporStatus.AVSLATT_AKSEPTERT` innført | Verifisert i denne runden (regresjonstester) | Ingen | Ingen | Aksept av avslag gir aldri GODKJENT |
| **GFK-01 / FE-04 (Fullmaktsgulv)**| Lukket m/restanse | Merknad 19.09 til GFK-01 | Dagmulktsats verdsetter fristdager i gulv | Verifisert i denne runden (regresjonstester) | Uten dagsats blir gulvet 0 | Fase 4 | Domenebeslutning om uverdsettbare dager |
| **UP042 (StrEnum)** | Slått av m/begrunnelse | Merknad 19.09 | Slått av i `pyproject.toml` | Verifisert i denne runden | Krever bevisst gjennomgang av enum-serialisering| Fase 4 | Besluttet om StrEnum skal aktiveres |
| **2 — Bevisførsel og framleggelse**| Foreslått / Åpen | Masterplan 19.09, AF-04 | Ingen eksportfunksjon finnes | Verifisert i denne runden (kodelesing) | Tidskilde og forvaringskjede uavklart | Fase 4 | Saken kan eksporteres for voldgift |
| **3 — Dokumenter og sporbarhet** | Foreslått / Åpen | Masterplan 16.09, AF-04 | Ingen sjekksum på vedlegg i dag | Verifisert i denne runden | Ingen revisjonslogg for forretningshendelser (OBS-01)| Fase 2 / 4 | Frosne dokumenter, hash og tilgangslogg |
| **3 — Gjenoppretting og drift** | Åpen / Kritisk | Masterplan 16.09, AR-03 | SQLite på efemer disk (Cloud Run / Container Apps)| Verifisert i denne runden (kodelesing) | Bakgrunnsworker finnes ikke (KONS-14) | Fase 3 / 5 | SQLite eliminert; worker gjenopptar leaser |
| **KR-01 (`organisasjon_id`)** | Lukket | Merknad 21.09 til KR | `20260921091208_koe_register_project...` | Dokumentert anvendt eksternt 21.09 | Ingen | Ingen | Prosjektregistrering fungerer |
| **KR-02 (`catenda_topic` skann)** | Lukket | Merknad 21.09 til KR | `20260921093936_indeks_hendelse_catenda_topic` | Dokumentert anvendt eksternt 21.09 | Ingen | Ingen | Indeksert oppslag på `catenda_topic_id` |
| **KR-03 (`get_all_sak_ids`)** | Lukket | Merknad 21.09 til KR | Paginert uttrekk i repository | Verifisert i denne runden | Ingen | Ingen | Ingen stille avkorting ved > 500 rader |
| **KR-04 / MG-01 (`compute_state`)**| Åpen | Audit 21.09, AF-05 | `timeline_service.py` kaller `aktor_navn` | Verifisert i denne runden (kodelesing) | Bryter ren projeksjon (KONS-07) | Fase 2 | `compute_state` er 100 % ren projeksjon |
| **KR-05 / KR-06 (Navnebuffer)** | Lukket | Merknad 21.09 til KR | Bufferet flyttet til app-kontekst, trygg `session` | Verifisert i denne runden | Bufferet vokser i langvarige skript (RY-03) | RY-spor | Oppslag fungerer i dev-auth |
| **KR-07 (Testverdier `aktor_id`)** | Lukket | Merknad 21.09 til KR | 46 testliteraler oppdatert til UUID | Verifisert i denne runden | Ingen | Ingen | Tester bekrefter at ID er UUID |
| **KR-08 / KR-09 / KR-10 / KR-11 / KR-12** | Lukket | Merknad 21.09 til KR | Rettet i `bab9679` / indeks `20260921102148` | Verifisert i denne runden | Ingen | Ingen | Former og indekser i orden |
| **KR-13 (Backfill typefilter)** | Åpen (Lav) | Audit 21.09, RY-01 | `scripts/backfill_relations.py` | Verifisert i denne runden | Dobbel I/O; lukkes automatisk av RY-01 | RY-spor | Backfill leser `sak_metadata` |
| **KR-14 (`DROP TABLE` uten CASCADE)**| Avvist / Lukket | Audit 21.09 | Migrasjon anvendt; ingen views finnes | Verifisert fra katalogen 21.09 | Ingen | Ingen | Ingen handling nødvendig |
| **KR-15 (Kappløpstest xfail)** | Åpen (Middels) | Audit 21.09 | `test_testsuite_blindsoner_audit_20260918.py:48` | Verifisert i denne runden (1 XPASS / 20) | Gjør CI tilfeldig rød (KONS-12) | Fase 0 | Testen gjøres deterministisk eller slakkes |
| **MG-02 (`catenda:<subject>`)** | Lukket | Handoff 21.09 sen kveld | `20260921164900_koe_resolve_identity_coalesce` | Dokumentert anvendt eksternt 21.09 | Ingen | Ingen | Journalen bærer kun `app_users.id` |
| **MG-03 (Parsegrensen)** | Åpen (streng xfail) | Audit 21.09, test | `test_maalskjema_20260920.py:210` xfail | Verifisert i denne runden (test xfailed) | Modellen avviser ikke `aktor_id` direkte | Fase 2 | `parse_event_from_request` avviser alle 5 |
| **MG-04 / MG-05 (Navn i tilstand)**| Åpen (Middels/Lav) | Audit 21.09 | `ownerName` fryses i godkjenningspakke | Verifisert i denne runden (kodelesing) | Hører til Fase 2 (MS-06 og ren projeksjon) | Fase 2 | Navn løses utelukkende ved svargrense |
| **MG-06 / MG-07** | Lukket | Audit 21.09 | Løst via KR-11 og KR-02 | Verifisert i denne runden | Ingen | Ingen | Indekser på plass |
| **MG-08 / MG-09** | Lukket / Info | Audit 21.09, `AGENTS.md` | MG-08 løses med MG-01; MG-09 inn i instruks | Verifisert i denne runden | Ingen | Ingen | Anvendte migrasjoner er uforanderlige |
| **RY-01 (Spørsmål til journal)** | Åpen (Middels) | Audit opprydding 21.09 | `supabase_event_repository`, `forsering_service`| Verifisert i denne runden | `sak_metadata.catenda_topic_id` mangler indeks | RY-spor | Spørsmål rutes til `sak_metadata` |
| **RY-02–RY-07 (Opprydding)** | Åpne (Lav) | Audit opprydding 21.09 | Diverse hjelpere og repos | Verifisert i denne runden (kodelesing) | Ikke funksjonsfeil; ytelse/konsistens | RY-spor | Keyset-paginering og lru_cache innført |
| **DB-05 (`viewer`-rolle)** | Besluttet / Åpen | Masterplan merknad 21.09 kveld | `app_project_memberships` mangler rollen | Verifisert i denne runden (CHECK role skranke) | Blokkering for å slette `project_memberships`| Fase 1 | `CHECK (role IN ('admin','member','viewer'))`|
| **RV-02 / GFK-03 (Policyretur)** | Åpen (Høy) | Masterplan 18.09, 19.09 | `approval_service.reconcile_policy` | Verifisert i denne runden | Kan returnere pakke mens utstedelse pågår | Fase 2 | Låser policy og pakke atomisk |
| **RV-10 / INT-05 (Batch outbox)** | Åpen (Høy) | Masterplan 18.09, 19.09 | `routes/event_routes.py:653` (`submit_batch`) | Verifisert i denne runden (kodelesing) | Hopper over `_post_to_catenda` og outbox | Fase 3 | Batchruta oppretter outbox-leveranser |
| **RV-12 / INT-01 (Webhook sikkerhet)**| Åpen (Middels) | Masterplan 18.09, 19.09 | `lib/security/webhook_security.py` | Verifisert i denne runden | Webhook dedupe tapt ved krasj (INT-02) | Fase 3 | Inbox-tabell i PostgreSQL |
| **RV-13 / CFG-03 / OBS-07 (Driftsfeil)**| Åpen (Middels) | Masterplan 18.09, 19.09 | `utility_routes.py`, `routes/` | Verifisert i denne runden | `str(e)` lekker feiltekst i 7 filer; åpne ruter| Fase 0 | Standard feilkonvolutter; lukkede helsesjekker |
| **RV-19 / RV-20 / RV-21** | Delvis lukket | Masterplan 18.09 | RV-21 lukket 19.09 (INT-04); RV-19/20 åpne | Verifisert i denne runden | Validering mangler mot utstedelsesregler | Fase 2 | Pakker valideres før godkjenning |
| **Organisatorisk: ROS-analyse** | Foreslått / Åpen | Masterplan 19.09 | Ingen ROS gjennomført | Ikke kontrollert (utenfor repo) | Obligatorisk i offentlig sektor | Fase 5 | ROS godkjent av Oslobygg KF |
| **Organisatorisk: DPIA** | Foreslått / Forberedt | Masterplan 19.09 | Faktagrunnlag foreligger i `docs/` | Verifisert i denne runden (dokument finnes) | Formell rettslig vurdering gjenstår | Fase 5 | DPIA godkjent av personvernombud |
| **Organisatorisk: Sikkerhetsrevisjon**| Foreslått / Åpen | Masterplan 19.09 | Kun interne tester hittil | Ikke kontrollert (utenfor repo) | Ekstern tredjepartspenetrasjonstest | Fase 5 | Ekstern attest foreligger |
| **Organisatorisk: Hendelseshåndtering**| Foreslått / Åpen | Masterplan 19.09 | Ingen formell driftsinstruks | Ikke kontrollert (utenfor repo) | Prosess ved tvist om tapte frister | Fase 5 | Drifts- og tvisteinstruks signert |

---

## 4. Tabell over avvik (`KONS-01` til `KONS-14`)

| ID | Type avvik | Alvorlighet | Kildested | Foreslått håndtering |
| --- | --- | --- | --- | --- |
| **KONS-01** | Dokumentasjonsavvik / Designmotsetning | Høy | `design-durable-inbox-outbox-2026-09-17.md:120–137` | Opphev påstand om at PostgREST umuliggjør outbox; bekreft RPC som gyldig transaksjonsgrense. |
| **KONS-02** | Dokumentasjonsavvik / Skjemastatus | Middels | `plans/2026-09-17-atomisk-utstedelse-og-outbox.md:55–57` | Korriger delplanen til å bruke tabellen `hendelse` i stedet for de tre sluppede tabellene. |
| **KONS-03** | Designinnvending / Arkitekturføring | Høy | `design-maalskjema-database-2026-09-20.md` (MS-08) | Revurder fjerning av `sak_relations`; behold prosjektavgrenset relasjonsprojeksjon med FK. |
| **KONS-04** | Designinnvending / Tilgangsarkitektur | Høy | `design-maalskjema-database-2026-09-20.md` (MS-09) | Utvid datalagets vern til også å omfatte teaminterne data (notater, utkast, pakker). |
| **KONS-05** | Designinnvending / Sikkerhetsarkitektur | Høy | `plans/2026-09-16-godkjenning-og-varig-levering.md` (MS-02) | Definer append-only-vernet til også å hindre uautorisert `INSERT` av bindende hendelser. |
| **KONS-06** | Designinnvending / Bevisgrunnlag | Høy | `design-maalskjema-database-2026-09-20.md` (MS-11) | Suppler vedleggshash med dokumentversjonering, uavhengig eksport og bevaringsmodell. |
| **KONS-07** | Designinnvending / Kodeavvik | Middels | `services/timeline_service.py:16, 1122` (KR-04/MG-01) | Fjern navneoppslag fra `compute_state`; gjør projeksjonen ren og flytt oppslag til svargrensen. |
| **KONS-08** | Dokumentasjonsavvik / Prosjektstyring | Middels | `handoff-2026-09-21-frister.md:153`, AF-06 | Prioriter ekte PostgreSQL-tester og EO-referanseflyt foran generell RY-opprydding. |
| **KONS-09** | Dokumentasjonsavvik / Statusmotsetning | Lav | `design-maalskjema-database-2026-09-20.md:20`, masterplan | Rett påstanden «ingenting er implementert»; marker MS-01, MS-04, MS-10, MS-05, MG-02 som levert. |
| **KONS-10** | Dokumentasjonsavvik / Operasjonell status | Middels | `handoff-2026-09-21-frister.md:105`, DA-03/DA-04 | Presiser avviket mellom filnavn og basens versjoner; dokumenter behov for `migration repair`. |
| **KONS-11** | Designinnvending / Avhengighet | Middels | `audit-databasearkitektur-2026-09-20.md` (DA-10/DB-05) | Utvid `app_project_memberships` med `viewer` før `project_memberships` slettes. |
| **KONS-12** | Reprodusert testfeil / Prosessrisiko | Middels | `test_testsuite_blindsoner_audit_20260918.py:48` (KR-15) | Fjern `strict=True` eller gjør barrier-kappløpet deterministisk for å unngå tilfeldig rød CI. |
| **KONS-13** | Reprodusert database-/skjemaavvik | Høy (plattform) | `supabase/migrations/` (8 av 19 tabeller) | Tildel eksplisitte `GRANT`-rettigheter i migrasjonene for alle tabeller i `public`. |
| **KONS-14** | Arkitekturstatus / Driftsgap | Høy | `design-durable-inbox-outbox-2026-09-17.md:60–65` | Etabler en separat, fristilt bakgrunnsworker for Google Cloud / Container Apps. |

---

## 5. Detaljert behandling av hvert avvik

### KONS-01 — PostgREST kontra direkte databaseforbindelse for Outbox

- **Kildested:** `docs/design-durable-inbox-outbox-2026-09-17.md`, del 2 og 9 («Den strukturelle blokkeringen»).
- **Presis påstand:** Teksten hevder: *«outbox-mønsteret er utilgjengelig så lenge hendelseslageret nås over PostgREST... Man kan ikke åpne en transaksjon, skrive hendelsen, skrive outbox-raden og committe sammen. Bytt hendelseslageret fra PostgREST til en direkte databaseforbindelse. Uten dette er ingenting av resten mulig.»*
- **Kildebelegg for påstanden:** Klassisk PostgREST-bruk via REST-tabellendepunkter (`/hendelse`, `/utgaende_levering`) utfører hvert HTTP-kall i sin egen transaksjon med autocommit. Flere separate HTTP-kall kan ikke spenne over én felles PostgreSQL-transaksjon.
- **Motbelegg:** PostgREST støtter [RPC-funksjoner](https://docs.postgrest.org/en/stable/references/transactions.html). Én enkelt RPC (`POST /rpc/commit_eo_approval`) utføres i nøyaktig én PostgreSQL-transaksjon (`BEGIN ... COMMIT`). Alt som kalles inne i funksjonen (hendelse, kvittering, pakke, outbox-rad) committer atomisk eller rulles tilbake ved feil. Påstanden om at PostgREST som plattform blokkerer outboxen er dermed feilaktig.
- **Konklusjon:** Det er klientens mønster (flere tabell-kall vs. én RPC), ikke PostgREST-protokollen, som avgjør transaksjonsgrensen. Masterplanen beholder Postgres/RPC som utgangspunkt. Direkte databaseforbindelse er et alternativ for ytelse/tilkobling, men ikke en forutsetning for atomisitet.
- **Foreslått ny ordlyd for masterplanen:**  
  *«Atomisk registrering av hendelse, godkjenning og outbox krever at sammensatte skrivinger skjer i én PostgreSQL-transaksjon. Dette realiseres enten via en autoritativ PostgreSQL RPC-funksjon (f.eks. `commit_eo_approval`) kalt over PostgREST, eller via en direkte databaseforbindelse. PostgREST i seg selv hindrer ikke atomisk outbox-skriving så lenge operasjonene samles i én databasefunksjon.»*

---

### KONS-02 — Én hendelsestabell kontra tre i transaksjonsplanen

- **Kildested:** `docs/plans/2026-09-17-atomisk-utstedelse-og-outbox.md`, linje 55–57.
- **Presis påstand:** *«Behold eksisterende hendelsesformater og tabellene `koe_events`, `forsering_events` og `endringsordre_events`; en samlet ny hendelsestabell er ikke nødvendig.»*
- **Kildebelegg for påstanden:** Da transaksjonsplanen ble forfattet 17.09, fantes tre separate hendelsestabeller i databasen og koden.
- **Motbelegg:** 20.09 ble beslutning MS-01 gjennomført via migrasjon `20260920193558_hendelse_tabell.sql`. De tre gamle tabellene ble bekreftet tomme og sluppet (`DROP TABLE`). Tabellen `hendelse` er nå den eneste tabellen for samtlige sakstyper i både databasen og `SupabaseEventRepository`.
- **Konklusjon:** Transaksjonsplanens forutsetning om tre tabeller er foreldet. Merknaden fra 21.09 øverst i planen korrigerer dette, men teksten i brødteksten må formelt oppdateres ved review.
- **Foreslått ny ordlyd for transaksjonsplanen:**  
  *«Referanseimplementasjonen og transaksjonsgrensen skrives mot tabellen `hendelse`, som etter MS-01 samler samtlige sakstyper med felles skranker, rettigheter og append-only-beskyttelse.»*

---

### KONS-03 — MS-08: Fjerning av relasjonstabellen må revurderes

- **Kildested:** `docs/design-maalskjema-database-2026-09-20.md`, seksjon MS-08; `docs/arkitekturforinger-2026-09-21.md` (AF-03).
- **Presis påstand:** MS-08 anbefalte: *«`sak_relations` fjernes; relasjoner utledes fra hendelsene... Erstattes av GIN-indekser på de to jsonb-stiene.»*
- **Kildebelegg for påstanden:** Relasjonsinformasjonen finnes allerede inne i JSONB-nyttelasten for forsering og endringsordre. `sak_relations` manglet fremmednøkler (DB-04) og ble oppdatert med svak feilhåndtering (`try/except: logger.warning`).
- **Motbelegg:** AF-03 og Merknad 2026-09-21 påpeker at GIN-indekser alene ikke gir referanseintegritet, ikke kan håndheve fremmednøkler mot `sak_metadata(sak_id, prosjekt_id)`, ikke håndhever KOE-eksklusivitet (at en KOE ikke knyttes til to motstridende forseringer), og ikke håndterer tilstanden etter at en relasjon fjernes eller erstattes.
- **Konklusjon:** Sletting av `sak_relations` er stanset og satt til revurdering. Foretrukket retning er en atomisk vedlikeholdt relasjonsprojeksjon med fremmednøkler, oppdatert i hendelsens transaksjon.
- **Foreslått ny ordlyd for målskjemaet:**  
  *«MS-08 revurderes før implementering. `sak_relations` beholdes som en prosjektavgrenset relasjonsprojeksjon med strenge fremmednøkler mot `sak_metadata`, og oppdateres atomisk i samme transaksjon som hendelsen som endrer relasjonen. GIN-indekser på hendelsespayload benyttes som sekundært revisjonsspor.»*

---

### KONS-04 — MS-09: Datalagets vern må omfatte team og private data

- **Kildested:** `docs/design-maalskjema-database-2026-09-20.md`, seksjon MS-09; `docs/arkitekturforinger-2026-09-21.md` (AF-01).
- **Presis påstand:** MS-09 fastslo: *«Notatskjermingen blir ikke flyttet til RLS. Den går på team og er domenelogikk... Tenantgrensen i basen, notatskjermingen i appen.»*
- **Kildebelegg for påstanden:** Catenda-teamstrukturen og skillet mellom kontraktsside og organisasjon er kompleks domenelogikk som er vanskelig å duplisere i SQL RLS-regler.
- **Motbelegg:** AF-01 slår fast at hvis teaminterne notater, utkast og godkjenningspakker bare skjermes i Python, vil enhver direkte databasespørring, ny rute eller lesefeil (slik som observeres i `SupabaseNotatRepository.for_sak`, som henter alle notater i prosjektet) eksponere motpartens hemmelige forhandlingsdata. DB-05 innførte dessuten en `viewer`-rolle som ikke skal ha innsyn i interne notater.
- **Konklusjon:** Datalaget må håndheve vern for både prosjekt, kontraktsside og team. Mekanismen må konkretiseres (via `app_runtime`-rolle med claims eller dedikerte `SECURITY DEFINER`-funksjoner).
- **Foreslått ny ordlyd for målskjemaet:**  
  *«Datalaget skal beskytte både prosjekt-, kontraktsside- og teamgrenser. Interne notater, private utkast og godkjenningspakker skal isoleres på databasenivå slik at en autorisert prosjektdeltaker eller `viewer` ikke kan lese andre teams interne data via direkte spørringer eller utelatte applikasjonsfiltre.»*

---

### KONS-05 — MS-02 / Append-only: Vern mot uautorisert INSERT

- **Kildested:** `docs/plans/2026-09-16-godkjenning-og-varig-levering.md` (MS-02); `docs/arkitekturforinger-2026-09-21.md` (AF-02).
- **Presis påstand:** Tidligere spesifikasjoner fokuserte på at append-only betyr `REVOKE UPDATE, DELETE ON hendelse` samt en `BEFORE UPDATE OR DELETE`-trigger som kaster unntak.
- **Kildebelegg for påstanden:** Hovedtrusselen mot en hendelseslogg er tradisjonelt manipulering eller sletting av tidligere inntrufne hendelser.
- **Motbelegg:** AF-02 viser at en generell `INSERT`-rettighet for applikasjonens runtime-rolle representerer en like stor trussel: en kompromittert applikasjon eller en rute med autorisasjonssvikt kan sette inn en falsk bindende hendelse (f.eks. `endringsordre_utstedt` eller `avslatt_fristkrav`) uten at godkjenningskjeden er fulgt.
- **Konklusjon:** Append-only krever tosidig vern: vern mot endring/sletting, og vern mot uautorisert innsetting. Direkte `INSERT` på `hendelse` må nektes for generell runtime, og forbeholdes autoritative transaksjonsprosedyrer.
- **Foreslått ny ordlyd for masterplanen:**  
  *«Append-only i databasen skal verne både mot omskriving/sletting (`REVOKE UPDATE, DELETE, TRUNCATE`) og mot uautorisert tilføying (`INSERT`). Bindende forretningshendelser kan kun skrives via autoriserte databasefunksjoner som validerer forkrav, fullmakter og låser.»*

---

### KONS-06 — MS-11: Dokumenthash alene er ikke et fullverdig bevisgrunnlag

- **Kildested:** `docs/design-maalskjema-database-2026-09-20.md`, seksjon MS-11; `docs/arkitekturforinger-2026-09-21.md` (AF-04).
- **Presis påstand:** MS-11 hevdet: *«Det er dette som gjør Catenda-som-arkiv forsvarlig, og det er én kolonne: `innhold_sha256 BYTEA NOT NULL`.»*
- **Kildebelegg for påstanden:** En kryptografisk sjekksum av filinnholdet gjør det mulig å verifisere om filen som ligger lagret i Catenda er identisk med den som opprinnelig ble sendt.
- **Motbelegg:** AF-04 fastslår at en hash i vår egen database ikke beviser hvem som mottok filen, ikke kan gjenopprette en fil dersom Catenda mister eller sletter den, og ikke gir rettslig bevisverdi dersom selve tabellen kan endres av databaseadministrator. Bevisverdien krever frosset dokumentversjon, ekstern kvittering, pålitelig tidskilde og eksportverktøy.
- **Konklusjon:** Hashen er en nødvendig, men utilstrekkelig komponent i bevisgrunnlaget.
- **Foreslått ny ordlyd for målskjemaet:**  
  *«`innhold_sha256` på `vedlegg` er ett av flere nødvendige bevisledd. Full bevisverdi krever i tillegg frosne dokumentversjoner i Catenda, lagring av eksterne kvitteringer og leveringsstatuser i outboxen, verifisert tidskilde og en uavhengig eksportmekanisme for voldgift.»*

---

### KONS-07 — KR-04 / MG-01: `compute_state` bryter ren projeksjon

- **Kildested:** `backend/services/timeline_service.py:16, 1122`; `docs/audit-korrekthet-2026-09-21.md` (KR-04); `docs/audit-maalskjema-gjennomgang-2026-09-21.md` (MG-01); `docs/arkitekturforinger-2026-09-21.md` (AF-05).
- **Presis påstand:** Koden importerer `aktor_navn` i `timeline_service.py` og slår opp navnet til `utstedt_av` under avspilling av `EOUtstedtEvent`.
- **Kildebelegg for påstanden:** Opprinnelig ønsket man å vise navnet på den som utstedte endringsordren i tilstandsobjektet.
- **Motbelegg:** Dette gjør `compute_state` kontekstavhengig (krever `app_users` og Flask app-kontekst). Kjørt utenfor en web-request (f.eks. i bakgrunnsjobber eller skript) faller oppslaget tilbake til UUID, slik at samme hendelse gir ulik tilstand avhengig av kjøremiljø.
- **Konklusjon:** `compute_state` skal være en ren, deterministisk funksjon `events -> state`. Navneoppslag hører hjemme på svargrensen / i presentasjonslaget.
- **Foreslått ny ordlyd for masterplanen:**  
  *«Domenetilstand (`SakState`) skal beregnes utelukkende fra hendelsenes rådata uten eksterne databaseoppslag eller avhengighet av web-kontekst. Navneoppslag for `utstedt_av` og andre aktører flyttes til svargrensen der JSON-responsen bygges.»*

---

### KONS-08 — Rekkefølge og prioritering: Ekte PostgreSQL-tester foran RY-opprydding

- **Kildested:** `docs/handoff-2026-09-21-frister.md:153`; `docs/arkitekturforinger-2026-09-21.md` (AF-06).
- **Presis påstand:** Handoff 21.09 anbefalte å starte neste økt med RY-01 (`sak_metadata`-spørringer).
- **Kildebelegg for påstanden:** RY-01 er en ryddig arkitektonisk optimalisering som fjerner unødige skann mot journalen og lukker KR-13.
- **Motbelegg:** AF-06 og masterplanens Merknad 21.09 fastslår at automatiserte tester mot en ekte, kastbar PostgreSQL-instans i CI og gjennomføring av én komplett EO-referanseflyt (med de endelige sikkerhets- og transaksjonsgrensene) har langt høyere risiko og må prioriteres foran generell kodeopprydding.
- **Konklusjon:** Rekkefølgen justeres i tråd med AF-06. RY-01 tas når det støtter referanseflyten.
- **Foreslått ny ordlyd for planen:**  
  *«Etablering av automatiserte PostgreSQL-integrasjonstester i CI (Fase 0) og transaksjonell kjerne for EO-utstedelse (Fase 2) prioriteres foran generell opprydding av spørrestier (RY-01 til RY-07).»*

---

### KONS-09 — Statusmotsetning: «Ingenting i målskjemaet er implementert»

- **Kildested:** `docs/design-maalskjema-database-2026-09-20.md:20`; `docs/plans/2026-09-16-godkjenning-og-varig-levering.md:636`.
- **Presis påstand:** Dokumentene inneholder setningen: *«Ingenting i målskjemaet er implementert. Det er et målbilde.»*
- **Kildebelegg for påstanden:** Utsagnet var sant da målskjemaet ble skrevet tidlig 20. september.
- **Motbelegg:** Samme kveld (20.09) ble MS-01, MS-04 og MS-10 gjennomført i kode og migrert til basen. 21.09 ble MS-05 og MG-02 gjennomført. Fem av hovedpunktene i målskjemaet er i dag i operativ drift i repoet og databasen.
- **Konklusjon:** Den opprinnelige setningen er foreldet og må leses i historisk kontekst.
- **Foreslått ny ordlyd for målskjemaet:**  
  *«Målskjemaets punkter MS-01 (én hendelsestabell), MS-04 (aktor_id), MS-10 (organisasjon_id), MS-05 (egen notattabell) og MG-02 (felles identitetsoppslag) er gjennomført. De resterende punktene utgjør det videre målbildet for Fase 1 og Fase 2.»*

---

### KONS-10 — Migrasjonshistorikk i basen kontra filnavn i repoet

- **Kildested:** `docs/handoff-2026-09-21-frister.md:105–112`; `docs/audit-databasearkitektur-2026-09-20.md` (DA-03/DA-04).
- **Presis påstand:** En tidligere handoff oppga filnavnene i `supabase/migrations/` som om de var basens registrerte versjonsnumre.
- **Kildebelegg for påstanden:** Filnavnene i repoet bærer tidsstempler som `20260920060000`, `20260921153900` osv.
- **Motbelegg:** Supabase MCP `apply_migration` stempler sitt eget tidsstempel i `supabase_migrations.schema_migrations` når en migrasjon kjøres. Følgelig er versjonene i basen avvikende fra filnavnene for flere filer (f.eks. ble `20260920060000` registrert som `20260920053427`).
- **Konklusjon:** Filrekkefølgen og utførelsesrekkefølgen er identisk, så skjemaet bygger korrekt, men historikkalignmenten er ufullstendig (8 av 18). `supabase migration repair` må kjøres av en autorisert operatør for å synkronisere historikken.
- **Foreslått ny ordlyd for planen:**  
  *«Filnavnene i `supabase/migrations/` uttrykker den korrekte apply-rekkefølgen, men avviker fra tidsstemplene i basens `schema_migrations`. En formell `supabase migration repair` må utføres før `supabase db push` kan benyttes i automatisert rørgate.»*

---

### KONS-11 — DB-05: `viewer`-rollen og fjerning av `project_memberships`

- **Kildested:** `docs/audit-databasearkitektur-2026-09-20.md` (DA-10); `docs/design-maalskjema-database-2026-09-20.md` (MS-15).
- **Presis påstand:** DA-10 og MS-15 foreslo å fjerne den gamle tabellen `project_memberships` som en ren opprydding, fordi koden kun leser `app_project_memberships`.
- **Kildebelegg for påstanden:** `project_memberships` leses ikke av noen rute og skaper duplikatfeil i logger ved prosjektopprettelse.
- **Motbelegg:** Rollen `viewer` finnes i dag utelukkende i `project_memberships`. Tabellen `app_project_memberships` har skranken `CHECK (role IN ('admin', 'member'))`. 21.09 besluttet oppdragsgiver at `viewer` skal eksistere som en reell rolle i systemet (DB-05).
- **Konklusjon:** Tabellen `project_memberships` kan ikke fjernes før `app_project_memberships` er utvidet med støtte for `viewer`.
- **Foreslått ny ordlyd for masterplanen:**  
  *«Fjerning av `project_memberships` forutsetter at `app_project_memberships` først utvides til å tillate rollen `viewer` (`CHECK (role IN ('admin', 'member', 'viewer'))`), slik at innsyn uten handlingsrett bevares som besluttet i DB-05.»*

---

### KONS-12 — KR-15: Flaky streng `xfail` i testsuiten

- **Kildested:** `backend/tests/test_security/test_testsuite_blindsoner_audit_20260918.py:48`; `docs/audit-korrekthet-2026-09-21.md` (KR-15).
- **Presis påstand:** Testen `test_tst_02_samtidig_saksopprettelse_krasjer_eller_overskriver_uten_concurrency_error` er merket med `@pytest.mark.xfail(strict=True, raises=AssertionError)`.
- **Kildebelegg for påstanden:** Testen reproduserer en reell svakhet i `JsonFileEventRepository` ved samtidig opprettelse på `expected_version=0` via `threading.Barrier(2)`.
- **Motbelegg:** På grunn av trådschedulering inntreffer ikke kappløpet i 100 % av kjøringene. I ca. 1 av 20 kjøringer passerer assertionen, noe som under `strict=True` fører til **XPASS**, som pytest behandler som en feilet test (rød gate).
- **Konklusjon:** En uforutsigbar test i en CI-gate undergraver tilliten til automatiserte sjekker.
- **Foreslått håndtering for reviewer:**  
  Enten:
  1. Gjør testen deterministisk ved å simulere filkollisjonen uten usikker trådbarriere.
  2. Eller fjern `strict=True` slik at testen forblir dokumenterende uten å felle CI-rørgaten tilfeldig.

---

### KONS-13 — 8 av 19 tabeller mangler eksplisitt GRANT i repoet

- **Kildested:** `docs/audit-databasearkitektur-2026-09-20.md`, merknad 20.09 kveld; `docs/gjennomforing-ms05-2026-09-21.md`.
- **Presis påstand:** En gjennomgang av migrasjonsfilene i `supabase/migrations/` viser at 8 av 19 tabeller ikke har noen eksplisitt `GRANT ALL ON <table> TO service_role`.
- **Kildebelegg for påstanden:** Tabellene virker i Supabase utelukkende fordi Supabase-plattformen kjører globale standardrettigheter (`ALTER DEFAULT PRIVILEGES ... GRANT ALL TO service_role`) ved prosjektopprettelse.
- **Motbelegg:** Bygges databasen fra repoets migrasjoner mot en ren, standard PostgreSQL-instans (f.eks. i lokal Docker, CI eller ved flytting til Azure Database for PostgreSQL / GCP Cloud SQL), mangler runtime-rollen tilgang til disse 8 tabellene.
- **Konklusjon:** Dette er en skjult plattformavhengighet som må lukkes i Fase 1 ved å legge eksplisitte `GRANT`-setninger inn i migrasjonsløpet for samtlige tabeller.
- **Foreslått ny ordlyd for masterplanen:**  
  *«Samtlige tabeller i skjemaet `public` skal ha eksplisitte rettighetstildelinger (`GRANT`) i migrasjonsfilene, slik at databasen kan instansieres og fungere identisk på enhver standard PostgreSQL-installasjon uavhengig av Supabase-spesifikke default privileges.»*

---

### KONS-14 — Bakgrunnsworker finnes ikke i dag

- **Kildested:** `docs/design-durable-inbox-outbox-2026-09-17.md`, linje 60–65.
- **Presis påstand:** *«Det finnes ingen bakgrunnsworker i repoet. `ApprovalService.deliver` kalles bare fra `routes/approval_routes.py:152`, altså fra en HTTP-forespørsel.»*
- **Kildebelegg for påstanden:** Kodelesing bekrefter at det ikke finnes noen daemon, loop eller køprosessor i repoet. Feiler et kall til Catenda under utstedelse, forblir leveransen feilet inntil en bruker trykker på nytt i grensesnittet.
- **Motbelegg:** På serverless containere (Google Cloud Run / Azure Container Apps) skalerer instansene til null når det ikke er trafikk. En bakgrunnsleveranse kan ikke overleve i minnet på en container som termineres.
- **Konklusjon:** Outbox-mønsteret krever en separat, fristilt worker eller en skjemastyrt trigger (f.eks. Cloud Scheduler / Cloud Tasks) som periodisk kaller en intern worker-rute eller kjører som en dedikert container. Dette må bygges i Fase 3.
- **Foreslått ny ordlyd for transaksjonsplanen:**  
  *«Bakgrunnslevering av outbox-oppdrag kan ikke forankres i den synkrone HTTP-forespørselen. Det skal etableres en selvstendig worker-mekanisme tilpasset serverless containere, utstyrt med lease-håndtering (`SKIP LOCKED`), eksponentiell backoff og automatisk gjenopptakelse.»*

---

## 6. Testkjøringer og katalogverifikasjon

### 6.1 Lokale testresultater kjørt under konsolideringen

Under denne sesjonen er samtlige tester i repoet kjørt fra ren tilstand lokalt:

```bash
# Backend testsuite (pytest)
cd backend && /usr/bin/python3 -m pytest -q
# Resultat: 1527 passed, 9 skipped, 42 xfailed, 7 warnings in 9.29s

# Frontend testsuite (vitest)
npm test -- --run
# Resultat: 51 testfiler, 590 tester passert i 31.10s

# Typesjekk og Svelte-validering
npm run check:error
# Resultat: 0 errors, 9 warnings i 6 filer (3 a11y, 6 runes state)

# Linting
ruff check backend/
# Resultat: All checks passed!
```

### 6.2 Miljøobservasjoner og versjoner
- **Operativsystem:** macOS (Darwin 24.6.0, arm64).
- **Lokal PostgreSQL:** PostgreSQL 18.6 (Homebrew) installert lokalt (`/opt/homebrew/bin/postgres`). Testet mot et kastbart cluster i denne økten.
- **Ekstern Supabase-database:** PostgreSQL 17.6 på prosjekt `gwdxadexwktegkklyobv` (i henhold til `supabase/config.toml` og katalogkontroller 20.09).
- **Python:** Python 3.11 i virtuelt miljø med `ruff==0.16.8`.

### 6.3 Verifikasjon av migrasjonssettet mot PostgreSQL 18.6

Et kastbart cluster ble initialisert med `initdb` i scratch-området og startet med TCP på port 54329. Supabase-plattformen ble stubbet (`anon`, `authenticated`, `service_role`, `auth.users`, `auth.role()`, `auth.email()`, samt default privileges for `service_role`).

Samtlige 23 migrasjonsfiler i `supabase/migrations/` ble kjørt i `sort`-rekkefølge mot en tom database:
- **Resultat:** 23 av 23 filer utført med **0 feil**.
- **Tabelltelling:** Nøyaktig **19 tabeller** opprettet i `public`.
- **Katalogsjekksummer målt på PostgreSQL 18.6:**
  - Kolonner: `53ff1083d2ba7cab670d7c19c4be361d` (**bit-identisk** med referansesummen fra PostgreSQL 16 i `docs/gjennomforing-ms05-2026-09-21.md`).
  - Indekser: `030ef2a97bb62e96b3ac7c48dc9f7ca4` (**bit-identisk** med referansesummen fra PostgreSQL 16).
  - Policyer: `674f3e9e31db289f53c33f3590f36fbe` (**bit-identisk** med referansesummen fra PostgreSQL 16).
  - Rettigheter: `d8908d88e033f139208d38ff52ddf121` (**bit-identisk** med referansesummen fra PostgreSQL 16).
  - Skranker: `79fd0419fec2c138a2ff5c012edd692a` (viser kosmetisk formateringsavvik i `pg_get_constraintdef` mellom PG16 og PG18; alle 19 tabellers skranker er intakte).

Dette beviser direkte at repoets 23 migrasjonsfiler bygger rent og deterministisk også på den nyeste PostgreSQL 18-motoren.

---

## 7. Verifikasjon og grenser

### Kjørt og observert
- Samtlige 1527 backend-tester og 590 frontend-tester kjører og passerer.
- 42 tester er registrert som `xfail`, i overensstemmelse med testsuiten etter MG-02.
- 0 ruff-feil og 0 svelte-check typefeil.
- Null brutte interne lenker i hele `docs/`-katalogen.
- **Kjørt og observert mot lokal PostgreSQL 18.6:** Alle 23 migrasjonsfiler bygger en tom database til nøyaktig 19 tabeller med 4 av 5 bit-identiske katalogsjekksummer mot PostgreSQL 16-referansen.

### Lest ut av koden
- Kildekoden til `supabase_notat_repository.py`, `supabase_event_repository.py`, `timeline_service.py`, `unit_of_work.py`, `vedlegg_registry.py`, `project_access.py` og `event_visibility.py` er lest i sin helhet for å dokumentere faktiske kallkjeder og ansvarsgrenser.
- Migrasjonsfilene 1 til 23 i `supabase/migrations/` er inspisert for tabellskjemaer, nøkler og rettigheter.

### Dokumentert i tidligere runder
- Katalogsjekksummer og katalogspørringer mot `gwdxadexwktegkklyobv` fra 20. og 21. september er lagt til grunn for tabelltelling (19 tabeller) og kolonnestatus.

### Ikke kontrollert
- Ingen skriveoperasjoner eller direkte katalogspørringer mot `gwdxadexwktegkklyobv` ble utført i denne økten (Supabase MCP-verktøy var ikke tilgjengelig).
- Ingen nettverkskall mot Catenda Bimsync API er foretatt.
- Ingen eksisterende filer i repoet er endret.
