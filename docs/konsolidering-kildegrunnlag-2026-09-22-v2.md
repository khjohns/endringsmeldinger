# Konsolidert kildegrunnlag og dekningsmatrise (2026-09-22-v2)

> **Merknad 2026-09-22 (sluttredigering):** Historisk forslag. Funnstatus står
> nå i den [sluttredigerte hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md). Blant annet er AUT-03 lukket for
> batchruta med testvedlikehold som restanse, og KR-15 står åpen fordi den nye
> reproduksjonen ikke er deterministisk. Se [redaksjonsprotokollen](sluttredigering-hovedplan-2026-09-22.md).

**Dato:** 2026-09-22  
**Gjeldende commit:** `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (gren `main`)  
**Status:** **Revidert reviewforslag (v2) — oppdatert etter oppfølgingsreview 22.09.**  
**Hoveddokument:** [Konsolidert masterplan v2](konsolidering-masterplan-2026-09-22-v2.md)  
**Forrige ledd i dokumentkjeden:**
- [Oppfølgingsreview av Geminis konsolidering v2 (2026-09-22)](review-gemini-konsolidering-2026-09-22-v2.md) (behandler RGK2-01 til RGK2-05)
- [Første review av konsolideringen (2026-09-22)](review-gemini-konsolidering-2026-09-22.md) (behandler RGK-01 til RGK-06)
- [Gjeldende masterplan](plans/2026-09-16-godkjenning-og-varig-levering.md)
- [Arkitekturføringer (AF-01–AF-06, 21.09)](arkitekturforinger-2026-09-21.md)
- [Delplan: atomisk utstedelse og outbox](plans/2026-09-17-atomisk-utstedelse-og-outbox.md)
- [Design: målskjema for databasen](design-maalskjema-database-2026-09-20.md)
- [Design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md)

---

## 1. Mandat og metodisk avgrensning for v2

Dette dokumentet utgjør det reviderte, etterprøvbare kildegrunnlaget for den konsoliderte
masterplanen ([`docs/konsolidering-masterplan-2026-09-22-v2.md`](konsolidering-masterplan-2026-09-22-v2.md)).
Dokumentet svarer direkte på tilbakemeldingene i [første review](review-gemini-konsolidering-2026-09-22.md)
og [oppfølgingsreviewet](review-gemini-konsolidering-2026-09-22-v2.md) og leverer:
1. En **komplett dekningsmatrise** som sporer hvert eneste krav fra masterplanens opprinnelige
   arbeidspakker (0–3), samtlige arkitekturføringer (AF-01 til AF-06), funnfamiliene (RV, SA,
   AP, DA, MS, KR, RY, MG, AR, S, INT, TFR, GFK, FE, OBS), samt samtlige gjeninnførte
   produksjonskrav og restanser påpekt i reviewene (låserekkefølge for policy/pakke, utkastvern,
   vedleggsbinding, tilgangslogging, fullmaktstilbakekalling, utrullingskompatibilitet,
   negative tilgangstester, hemmelighetsrotasjon, karantene/skanning, delt rate limiting,
   aktiv driftsvarsling, staging, bevarings-/sletteregler, AR-04, AR-08, FE-06, RV-14, RV-17, RV-18).
2. En metodisk oppretting av status og kodebelegg for **AUT-03**, **MG-04**, **MG-05**, **MG-08**,
   **GFK-04**, **KR-04/MG-01** og **KONS-04** (`RGK-03`). Matrisen skiller presist mellom:
   - *Masterplanens registrerte status* (historisk utgangspunkt).
   - *Beslutningskilde / Kildested* (hvor kravet eller funnet er definert i kildekorpuset).
   - *Dagens observasjon i kode / repo* (hva repoet faktisk gjør per 22.09).
   - *Verifikasjonskategori* (hvordan observasjonen er gjort: lokalt kjørt, lest i kode, DDL, historisk katalog, historisk dokumentert eller ikke innhentet).
   - *Foreslått status / tiltak* (hvordan funnet løses eller lukkes formelt).
3. En oppdatert **avvikstabell (`KONS-01` til `KONS-14`)** og detaljanalyse med reviewer-anbefalinger
   for de fire åpne valgene (`RGK-04`, `RGK2-03`), inkludert minimal worker i Fase 2, konkret
   migrering av private lagre (utkast og godkjenningspakker) i Fase 1, avvikling av resterende
   SQLite i Fase 2, og eksplisitte nødvendige rettigheter.
4. En teknisk korrekt forklaring av **PostgreSQL 18-katalogsjekksummen** for skranker, basert
   på 105 nye `NOT NULL`-skranker (`contype = 'n'`) i PG18 (`RGK-05`).
5. Korrekt testlogg med faktisk interpreter (`backend/venv/bin/python`, Python 3.11.9),
   historisk merking av KR-15, og et skarpt skille mellom lokalt verifisert, lest i kode,
   historisk dokumentert og eksternt/uavklart (`RGK-06`, `RGK2-05`).
6. En samlet **svarmatrise for RGK-01–06 og RGK2-01–05**.

Produksjonskode, eksisterende tester, migrasjonsfiler og gjeldende masterplan holdes **100 % urørt**.

---

## 2. Gjennomgåtte kilder og utgangspunkt

### 2.1 Git-tilstand
- `git rev-parse HEAD`: `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2`
- Gren: `main`
- Siste merge commit før konsolideringsoppdraget: `fc9b179` (Merge PR #32)
- Commit `0bdc1dc` la til arkitekturføringene (`docs/arkitekturforinger-2026-09-21.md`) og
  oppdragsbeskrivelsen (`docs/prompt-gemini-konsolidering-2026-09-21.md`). Ingen produksjonskode
  ble endret i `0bdc1dc`.

### 2.2 Gjennomgått dokumentkorpus (27 dokumenter)
1. `AGENTS.md` og `docs/README.md`
2. `docs/review-gemini-konsolidering-2026-09-22-v2.md` og `docs/review-gemini-konsolidering-2026-09-22.md`
3. `docs/prompt-gemini-konsolidering-2026-09-21.md`
4. `docs/konsolidering-masterplan-2026-09-21.md` og `docs/konsolidering-kildegrunnlag-2026-09-21.md`
5. `docs/handoff-2026-09-21-frister.md`, `docs/handoff-2026-09-21-korrekthet.md`, `docs/handoff-2026-09-21.md`, `docs/handoff-2026-09-20.md`, `docs/handoff-2026-09-19.md`
6. `docs/plans/2026-09-16-godkjenning-og-varig-levering.md` (gjeldende masterplan)
7. `docs/arkitekturforinger-2026-09-21.md` (AF-01 til AF-06)
8. `docs/plans/2026-09-17-atomisk-utstedelse-og-outbox.md`
9. `docs/design-maalskjema-database-2026-09-20.md` og `docs/design-durable-inbox-outbox-2026-09-17.md`
10. `docs/gjennomforing-mg02-2026-09-21.md`, `docs/gjennomforing-ms05-2026-09-21.md`, `docs/gjennomforing-maalskjema-2026-09-20.md`
11. `docs/audit-opprydding-2026-09-21.md`, `docs/audit-korrekthet-2026-09-21.md`, `docs/audit-maalskjema-gjennomgang-2026-09-21.md`
12. `docs/audit-databasearkitektur-2026-09-20.md`
13. `docs/arkitekturvurdering-2026-09-19.md`, `docs/vurdering-av-auditfunn-2026-09-19.md`, `docs/sammenstilling-arkitektur-og-auditspor-2026-09-19.md`
14. `docs/audit-review-astra-2026-09-17.md`, `docs/audit-sikkerhetsarkitektur-2026-09-17.md`
15. `docs/personopplysninger-faktagrunnlag-2026-09-19.md`

---

## 3. Begrepsavklaring og verifikasjonskategorier

Matrisen benytter eksplisitte verifikasjonskategorier for å sikre full etterprøvbarhet per rad:
- **Lokal testkjøring (22.09):** Faktisk kjørt testkommando i denne sesjonen.
- **Direkte kodelesing (22.09):** Verifisert ved oppslag i applikasjonens kildekode eller DDL i denne sesjonen.
- **Lokal DDL-bygging (PG18):** Verifisert ved kjøring av alle 23 migrasjoner mot et lokalt PostgreSQL 18.6-cluster.
- **Historisk ekstern katalog (20.09/21.09):** Dokumentert i katalogkontroller mot eksternt Supabase-prosjekt `gwdxadexwktegkklyobv`.
- **Historisk dokumentert i auditnotat:** Hentet fra protokollførte resultater i auditkildene.
- **Status ikke innhentet (utenfor repo):** Organisatoriske forhold eller eksterne tredjepartstjenester der dokumentasjon eller status ikke er innhentet.

---

## 4. Full dekningsmatrise for masterplanen (RGK-02, RGK-03, RGK2-02, RGK2-05)

| Krav / Funn-ID | Masterplanens status | Beslutningskilde / Kildested | Dagens observasjon i kode / repo | Verifikasjonskategori | Foreslått status og tiltak | Avhengighet | Ferdig når |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **0 — Lukk eksponering** | Lukket | Masterplan 18.09, SA-01/02 | Ruteregister håndhever dekoratører; test passerer | Lokal testkjøring (22.09) | Lukket. Overvåkes kontinuerlig i Fase 0. | Fase 0 | Ingen udekorert rute aksepteres |
| **SA-01 (OAuth-flate)** | Lukket | Masterplan 18.09 | Supabase OAuth slettet; kun Catenda/Entra ID | Direkte kodelesing (22.09) | Lukket. | Ingen | Ingen Supabase OAuth-endepunkter |
| **SA-02 / SA-03 (Analytics)**| Lukket | Masterplan 18.09 | Analytics blueprint slettet fra repoet | Direkte kodelesing (22.09) | Lukket. | Ingen | Ingen intern lekkasje via analytics |
| **1 — Felles sikkerhetsgrenser** | Delvis gjennomført | Masterplan 18.09, AF-01 | `project_access.py` og `visible_events` i Python | Direkte kodelesing (22.09) | Åpen restanse: flyttes til databasen i Fase 1 (AF-01, MS-09) | Fase 1 | Databasen avviser innsyn på tvers |
| **RV-07 (Relasjoner & prosjekt)**| Lukket for forsering | Merknad 19.09 til RV-07 | `BaseSakService.hent_relaterte_saker` avgrenser | Direkte kodelesing (22.09) | Lukket som funksjonell klasse; DB-FK mangler | AF-03 / Fase 2 | Fremmednøkler håndheves i DB |
| **AUT-01 / AUT-02** | Lukket | Merknad 19.09 til RV-07 | `tillatte_saker` filtrerer relasjoner | Direkte kodelesing (22.09) | Lukket. | Ingen | Ingen ufiltrert relasjonsvandring |
| **AUT-03 (Batch last_event_at)** | Ført som åpen | Vurdering 19.09 | `submit_batch` (linje 778) avviser notat med 400 `INTERNT_NOTAT_IKKE_I_BATCH`. Gammel xfail-test feiler på 201-forventning | Lokal testkjøring (22.09) m/ `--runxfail` | **Åpen (testblindsone).** Lekkasjen er ikke nåbar i drift. Krever datert oppdatering av test. | Fase 0 / 1 | Testen oppdateres til å verifisere avvisningen |
| **1 — Verifiserbar leveranseprosess** | Delvis gjennomført | Masterplan 19.09 | `.github/workflows/ci.yml` mangler ekte PostgreSQL-tjeneste | Direkte kodelesing (22.09) | Åpen restanse: utvide CI med PostgreSQL 17 | Fase 0 | CI kjører tester mot ekte PostgreSQL |
| **AR-05 / S9 (CI-sjekker)** | Lukket i repo | Merknad 19.09 | CI-fil finnes; krever branch protection i GitHub | Direkte kodelesing (22.09) | Delvis: krever repo-admin-innstillinger | GitHub admin | Påkrevde status checks håndhevet |
| **Isolert staging-miljø** | Krav i masterplanen | Masterplan linje 304–309 | Ikke definert i koden; kun produksjonsreferanse | Direkte kodelesing (22.09) | **Åpen.** Provisjonere eget Supabase- og Catenda-testmiljø | Fase 0 | Staging integrert i deployment-pipe |
| **Forbud mot domenemutasjon (RV-14)**| Åpen restanse | Masterplan linje 165 | Enkelte GET-ruter utførte sideeffekter ved lesing | Direkte kodelesing (22.09) | **Åpen.** Forby domenemutasjoner under GET; tillate sesjonsvedlikehold | Fase 0 / 2 | GET har aldri skrivende domeneeffekter |
| **Strenge xfail med raises (RV-17)** | Åpen restanse | Masterplan linje 168 | Flere `@pytest.mark.xfail(strict=True)` mangler `raises=` | Direkte kodelesing (22.09) | **Åpen.** Gjennomgå xfail-dekoratører og angi eksakt feiltype | Fase 0 | Ingen uventede krasj maskeres av xfail |
| **Sanering av backlog (RV-18)** | Åpen restanse | Masterplan linje 168 | Eldre merknader og henvisninger til slettede filer | Direkte kodelesing (22.09) | **Åpen.** Merke foreldede designnotater med daterte merknader | Fase 4 | Konsistent dokumentkjede uten døde lenker |
| **Driftdetektorer (AR-08)** | Åpen (Lav) | Arkitekturvurdering 19.09 | 6 av 9 driftdetektorer feiler ved kjøring | Historisk dokumentert i auditnotat | **Åpen.** Baseline gyldige skript i CI; sanere ødelagte | Fase 0 / 4 | Deterministiske sjekker i CI |
| **HTML-interpolering (FE-06)** | Inkonklusiv | Vurdering 19.09 | Verken `{@html` eller rå interpolering påvist ved søk | Historisk dokumentert i auditnotat | **Uavklart.** Verifisere DOMPurify i `LetterHtmlPreview.svelte` | Fase 0 | XSS-sikker brevforhåndsvisning |
| **Hemmelighetslager og rotasjon** | Krav i masterplanen | Masterplan linje 304–309 | Hemmeligheter i `.env` / miljøvariabler | Direkte kodelesing (22.09) | **Åpen.** Etablere eksternt hvelv (Secret Manager) og rotasjonsrutine | Fase 1 | Automatisk/dokumentert rotasjon |
| **Tilgangs- og endringslogging** | Krav i masterplanen | Masterplan linje 304–309, RGK2-02 | Ingen audit-tabell for sensitive lesinger | Direkte kodelesing (22.09) | **Åpen.** Etablere `tilgangslogg` for eksport og fullmakter | Fase 1 | Sensitive oppslag og eksport logges |
| **Tilbakekalling av fullmakt** | Krav i masterplanen | Masterplan linje 304–309, RGK2-02 | Uavklart virkningstid ved sletting av medlem | Direkte kodelesing (22.09) | **Åpen.** Formell virkningstid for utkast, godkjenning og brev | Fase 1 | Deterministisk tilbakekallingsprosess |
| **Negative tilgangstester** | Krav i masterplanen | Masterplan linje 304–309, RGK2-02 | Mangler samlet negativ testsuite for Data API | Direkte kodelesing (22.09) | **Åpen.** Tester for prosjekt-, motpart- og teamisolasjon | Fase 1 | Alle 5 isolasjonsscenarier verifisert |
| **DA-03 / DA-04 (Migrasjonsmekanisme)** | Delvis levert | Handoff 20.09 kveld | `supabase/config.toml` peker på prosjekt; tidsstempelavvik | Lokal testkjøring (22.09) | Åpen restanse: utføre `supabase migration repair` | Fase 1 | `schema_migrations` samstemmer med repo |
| **1 — Byggreproduserbarhet** | Åpen | Masterplan 19.09 | 100 % av prod-deps har `>=` i `requirements.txt` | Direkte kodelesing (22.09) | **Åpen.** Pinne alle avhengigheter med `==` og hash | Fase 0 | Deterministisk installasjon |
| **1 — HTTP-herding** | Åpen | Masterplan 19.09 | `nginx.conf` mangler CSP, HSTS og frame-ancestors | Direkte kodelesing (22.09) | **Åpen.** Innføre strenge sikkerhetshoder i Nginx | Fase 0 | Headertester verifiserer CSP/HSTS |
| **RV-13 / CFG-03 / OBS-07 (Driftsfeil)**| Åpen | Masterplan 18.09, 19.09 | Rå `str(e)` i feilhåndterere i 7 filer; åpne helsesjekker | Direkte kodelesing (22.09) | **Åpen.** Standardisere feilsvar og sikre driftsruter | Fase 0 | Ingen rå exception-tekster til klient |
| **1 — Universell utforming (a11y)** | Åpen | Masterplan 19.09 | `svelte-check` rapporterer 3 a11y-advarsler | Lokal testkjøring (22.09) | **Åpen.** Rette modaler og kontrollrom-komponenter | Fase 4 | `npm run check` har 0 a11y-advarsler |
| **1 — Catenda-avhengighet og SLA** | Åpen | Masterplan 19.09 | Mangler skriftlig avtaleverk og nedetidsprosedyre | Status ikke innhentet (utenfor repo) | **Åpen.** Utarbeide SLA og juridisk risikovurdering | Fase 4 | Signert avtale foreligger |
| **1 — Databasearkitektur** | Delvis levert | Handoff 20.09, DA-01–15 | 23 migrasjonsfiler, 19 tabeller; 8 mangler eksplisitt GRANT | Lokal DDL-bygging (PG18) | Åpen restanse: eksplisitte nødvendige rettigheter (KONS-13) | Fase 1 | Nødvendige rettigheter tildelt per rolle |
| **DA-01 (Mangler i repo)** | Lukket | Handoff 20.09 | Rekonstruert i tidlige migrasjoner | Lokal DDL-bygging (PG18) | Lukket. | Ingen | Repo bygger tom base feilfritt |
| **DA-02 / RV-08 (`actorteam`)** | Lukket | Handoff 20.09 | Kolonne finnes i `hendelse` | Historisk ekstern katalog (20.09) | Lukket. | Ingen | `actorteam` registrert i basen |
| **DA-05 (Backend migrasjonsdrift)** | Lukket | Handoff 20.09 | `20260920160000` avstemte migrasjoner | Lokal DDL-bygging (PG18) | Lukket. | Ingen | Identisk katalog på 5 snitt |
| **DA-06 (Skjema i 4 kilder)** | Lukket | Handoff 20.09 sent | Docstrings erstattet med henvisning til DDL | Direkte kodelesing (22.09) | Lukket. | Ingen | `supabase/migrations/` er eneste kilde |
| **DA-07 (`app_identities`)** | Korrigert / Lukket | Audit 20.09 | I aktiv bruk av `koe_resolve_identity` | Historisk ekstern katalog (20.09) | Lukket. | Ingen | Tabellen bevares |
| **DA-08 (`user_groups`)** | Besluttet fjernet | Målskjema MS-15 | Tabell finnes fortsatt i DDL/base | Lokal DDL-bygging (PG18) | **Åpen.** Slette tabellen i Fase 1 | Fase 1 | `DROP TABLE user_groups` anvendt |
| **DA-09 (`magic_links`)** | Besluttet fjernet (P1) | Målskjema MS-15 | Tabell finnes fortsatt i DDL/base | Lokal DDL-bygging (PG18) | **Åpen.** Slette tabellen i Fase 1 | Fase 1 | `DROP TABLE magic_links` anvendt |
| **DA-10 (`project_memberships`)**| Betinget sletting | Målskjema MS-15, DB-05 | Tabell finnes; trigger synkroniserer | Lokal DDL-bygging (PG18) | **Åpen.** Avhenger av DB-05 `viewer`-støtte | Fase 1 | Slettes etter at `viewer` er migrert |
| **DA-11 / AR-01 (RLS-prosjektgrense)**| Åpen | Audit 20.09, AF-01 | RLS har `service_role / ALL / USING(true)` | Direkte kodelesing (22.09) | **Åpen.** Håndheves i datalaget via runtime-rolle | Fase 1 | RLS / funksjoner håndhever grenser |
| **MS-01 (Én hendelsestabell)** | Gjennomført | Handoff 20.09 | `hendelse` etablert; gamle tabeller droppet | Historisk ekstern katalog (20.09) | Lukket. | Ingen | Samtlige sakstyper i `hendelse` |
| **MS-02 (Append-only tosidig)** | Åpen | Målskjema 20.09, AF-02 | Kun beskrevet; mangler DDL-håndheving | Direkte kodelesing (22.09) | **Åpen.** Nekte UPDATE/DELETE/TRUNCATE og uautorisert INSERT | Fase 1 | Kun autoriserte funksjoner skriver |
| **MS-03 (Total orden & rebase)** | Besluttet | Målskjema 20.09 | `UNIQUE(sak_id, versjon)` i `hendelse` | Lokal DDL-bygging (PG18) | Åpen restanse: formalisere rebase-regler i Python | Fase 2 | Konflikthåndtering i outbox/RPC |
| **MS-04 (`aktor_id` i journal)** | Gjennomført | Handoff 20.09 | `actorid` bærer `app_users.id` | Historisk ekstern katalog (20.09) | Lukket. | MG-02 | Ingen personnavn i journalen |
| **MS-05 (Notater ut av journal)** | Gjennomført | Handoff 21.09 sen kveld | Tabellen `notat` etablert og flettes ved lesing | Historisk ekstern katalog (21.09) | Lukket i databasen; team-vern tilføyes i Fase 1 | Fase 1 | Slettbare notater uten versjonsøkning |
| **MS-06 / MS-07 (`sak_projeksjon`)** | Besluttet / Åpen | Målskjema 20.09 | `sak_metadata` har cached-felter og flere skrivere | Direkte kodelesing (22.09) | **Åpen.** Dele i `sak` (register) og `sak_projeksjon` | Fase 2 | Én autoritativ skriver i hendelsestx |
| **MS-08 (Relasjonsprojeksjon)** | Foretrukket til vurdering | AF-03, Merknad 21.09 | `sak_relations` finnes; mangler FK | Lokal DDL-bygging (PG18) | **Åpen (under vurdering).** Foretrekk FK fremfor JSONB | Fase 2 | Atomisk oppdatert relasjonsprojeksjon |
| **MS-09 (Prosjekt & team i DB)** | Revurdert / Utvidet | AF-01, Merknad 21.09 | Kun `prosjekt_id` i tabeller | Lokal DDL-bygging (PG18) | **Åpen.** Utvide vern til kontraktsside og team (AF-01) | Fase 1 | Databasen isolerer team og utkast |
| **MS-10 (`organisasjon_id`)** | Gjennomført | Handoff 20.09 | `projects.organisasjon_id NOT NULL` | Historisk ekstern katalog (20.09) | Lukket. | Ingen | Skiller virksomhet fra prosjekt |
| **MS-11 (Vedleggshash)** | Revurdert / Utvidet | Målskjema, AF-04 | `vedlegg_registry.py` mangler hash i basen | Direkte kodelesing (22.09) | **Åpen.** `innhold_sha256` + dokumentversjon + eksport | Fase 2 / 4 | Frosset hash og full beviskjede |
| **Karantene og virusskanning** | Krav i masterplanen | Masterplan linje 304–309 | Ingen skanning før Catenda-overføring | Direkte kodelesing (22.09) | **Åpen.** Mellomlagring med karantene og virussjekk | Fase 2 | Kun godkjente filer frigis |
| **MS-12 (`project_configs` inn)**| Besluttet / Åpen | Målskjema 20.09 | Separate tabeller i dag | Lokal DDL-bygging (PG18) | **Åpen.** Slå sammen konfigurasjon på `projects` | Fase 1 | Én felles prosjekttabell |
| **MS-13 / MS-14 (BIM som event)**| Besluttet / Åpen | Målskjema 20.09 | `sak_bim_links` er slettbar tabell | Lokal DDL-bygging (PG18) | **Åpen.** Logge kobling/frakobling som hendelser | Fase 2 | BIM-historikk bevares i journalen |
| **1 — Oppbevaring og sletting (P7)**| Besluttet / Lukket | Merknad 21.09 kveld | MS-04, MS-05, MG-02 gjennomført | Direkte kodelesing (22.09) | Lukket for journalen (bevares uten kryptosletting) | Fase 5 | DPIA forankres hos behandlingsansvarlig |
| **Bevarings- og sletteregler** | Krav i masterplanen | Masterplan linje 304–309 | Ingen formelle sletteregler for logger/backup | Direkte kodelesing (22.09) | **Åpen.** Retensjonspolicy for staging, logger og backup | Fase 4 | Automatisk sletting av midlertidig data |
| **2 — Atomisk domene & levering**| Åpen | Transaksjonsplan 17.09, AF-02 | Ingen autoritativ RPC eller outbox-tabell ennå | Direkte kodelesing (22.09) | **Åpen.** `commit_eo_approval` RPC + outbox + minimal worker | Fase 2 | EO-referanseflyt verifisert atomisk |
| **AP-01 / AP-02 / AP-03 / AP-05**| Lukket | Masterplan 17.09, 18.09 | Regresjonstester for satser og godkjenning grønne | Lokal testkjøring (22.09) | Lukket. | Ingen | Riktige fullmaktsberegninger |
| **AP-04 / AR-06 / TST-03** | Åpen (streng xfail) | Masterplan 16.09, AF-02 | `TrackingUnitOfWork` utfører usunn kompensasjon | Direkte kodelesing (22.09) | **Åpen.** Erstatte kompensasjon med ekte DB-transaksjon | Fase 2 | Feil ruller tilbake uten spor |
| **Låserekkefølge for policy/pakke**| Krav i masterplanen | Transaksjonsplan 17.09, RGK2-02 | Utstedelse og policyretur mangler felles lås | Direkte kodelesing (22.09) | **Åpen.** Låse pakke og policy under felles transaksjon | Fase 2 | Umulig å returnere under utstedelse |
| **Vedleggsvalidering og utkastvern**| Krav i masterplanen | Transaksjonsplan 17.09, RGK2-02 | Utkast slettes uavhengig av parallell redigering | Direkte kodelesing (22.09) | **Åpen.** Revisjonssjekk på utkast; atomisk vedleggsbinding | Fase 2 | Ingen utilsiktet overskriving av utkast |
| **Forsvar i dybden for outbox** | Krav i masterplanen | Masterplan linje 304–309, RGK2-02 | Ruter kan teoretisk sende private data til outbox | Direkte kodelesing (22.09) | **Åpen.** Outbox-skriving avviser notater/utkast | Fase 2 | Private data når aldri ekstern kø |
| **Kompatibilitet ved utrulling** | Krav i masterplanen | Masterplan linje 304–309, RGK2-02 | Hendelseslesing avhenger av nyeste modellversjon | Direkte kodelesing (22.09) | **Åpen.** Bakoverkompatibel deserialisering ved deploy/rollback | Fase 2 | Hendelser lesbare under eldre kode |
| **2 — Minste privilegier** | Åpen | Masterplan 16.09, AF-02 | Alt kjører med `service_role` i dag | Direkte kodelesing (22.09) | **Åpen.** Etablere `app_runtime` med nødvendige rettigheter | Fase 1 | Ingen generell direkte tabellskriving |
| **2 — Domenegjennomgang NS 8407**| Delvis gjennomført | Masterplan 19.09, RC-8 | TFR-01 og GFK-01 lukket; GFK-04 avgrenset | Direkte kodelesing (22.09) | **Åpen restanse.** TFR-02–06 og GFK-02–06 testes | Fase 4 | Samtlige overganger formelt testet |
| **TFR-01 (Avslag akseptert)** | Lukket | Merknad 19.09 til TFR-01 | `SporStatus.AVSLATT_AKSEPTERT` innført | Lokal testkjøring (22.09) | Lukket. | Ingen | Aksept av avslag gir aldri GODKJENT |
| **GFK-01 / FE-04 (Fullmaktsgulv)**| Lukket m/restanse | Merknad 19.09 til GFK-01 | Dagmulktsats verdsetter dager | Lokal testkjøring (22.09) | Åpen restanse: avklare dager uten dagsats | Fase 4 | Domenebeslutning forankret |
| **GFK-04 (Forsering godkjenning)**| Lukket som avgrenset | Masterplan linje 185 | Forsering har ingen godkjenningskjede | Historisk dokumentert i auditnotat | **Lukket (truffet avgrensningsbeslutning).** | Ingen | Forsering inngår ikke i EO-flyt |
| **UP042 (StrEnum)** | Slått av m/begrunnelse | Merknad 19.09 | Slått av i `pyproject.toml` | Direkte kodelesing (22.09) | Åpen vurdering mot hendelsesversjonering | Fase 4 | Beslutte permanent enum-strategi |
| **2 — Bevisførsel og framleggelse**| Åpen | Masterplan 19.09, AF-04 | Ingen uavhengig eksportfunksjon | Direkte kodelesing (22.09) | **Åpen.** Bygge eksportverktøy for voldgift (AF-04) | Fase 4 | Sak kan bevises uten kjørende app |
| **3 — Fullskala worker og adaptere**| Åpen | Design outbox 17.09, KONS-14 | Ingen bakgrunnsworker; HTTP kaller Catenda | Direkte kodelesing (22.09) | **Åpen.** Fristilt worker for Cloud Run / Container Apps | Fase 3 | All utgående levering skjer asynkront |
| **Delt kapasitet & rate limiting**| Krav i masterplanen | Masterplan linje 304–309 | Ingen delt rate limiter ved flernodedrift | Direkte kodelesing (22.09) | **Åpen.** Distribuert token bucket for API og Catenda | Fase 3 | Dimensjonert last; 429 ved overskridelse |
| **Aktiv driftsvarsling** | Krav i masterplanen | Masterplan linje 304–309 | Ingen alarm for køalder eller usikre utfall | Direkte kodelesing (22.09) | **Åpen.** Alarmer ved køforsinkelse og ved `USIKKERT_UTFALL` | Fase 3 | Operatør varsles umiddelbart |
| **Harmonisering av domenemodell (AR-04)**| Åpen (Middels) | Arkitekturvurdering 19.09 | Regler definert parallelt i Python og TypeScript | Direkte kodelesing (22.09) | **Åpen.** Samordne felles definisjoner; hindre drift | Fase 4 | Ensartet forretningslogikk |
| **KR-01 (`organisasjon_id`)** | Lukket | Merknad 21.09 til KR | Prosjektregistrering migrert og verifisert | Historisk ekstern katalog (21.09) | Lukket. | Ingen | `organisasjon_id` registreres trygt |
| **KR-02 (`catenda_topic` skann)** | Lukket | Merknad 21.09 til KR | Indeks på `hendelse.catenda_topic_id` etablert | Historisk ekstern katalog (21.09) | Lukket. | Ingen | Indeksert oppslag |
| **KR-03 (`get_all_sak_ids`)** | Lukket | Merknad 21.09 til KR | Paginert uttrekk i repository | Direkte kodelesing (22.09) | Lukket. | Ingen | Ingen avkorting ved > 500 saker |
| **KR-04 / MG-01 (`compute_state`)**| Åpen | Audit 21.09, AF-05 | `timeline_service.py` kaller `aktor_navn` | Direkte kodelesing (22.09) | **Åpen.** Rense `compute_state`; flytte oppslag til svargrense | Fase 2 | Ren deterministisk projeksjon |
| **KR-05 / KR-06 (Navnebuffer)** | Lukket | Merknad 21.09 til KR | Buffer flyttet til app-kontekst (`g`) | Direkte kodelesing (22.09) | Lukket. | Ingen | Buffer virker trygt i sesjon |
| **KR-07 (Testverdier `aktor_id`)** | Lukket | Merknad 21.09 til KR | Testliteraler oppdatert til UUID | Direkte kodelesing (22.09) | Lukket. | Ingen | Tester dokumenterer UUID |
| **KR-08–KR-12 (Former og indekser)**| Lukket | Merknad 21.09 til KR | Rettet i koden og migrasjonene | Direkte kodelesing (22.09) | Lukket. | Ingen | Indekser og relasjoner konsistente |
| **KR-13 (Backfill typefilter)** | Åpen (Lav) | Audit 21.09, RY-01 | `scripts/backfill_relations.py` har dobbel I/O | Direkte kodelesing (22.09) | Åpen (lukkes automatisk av RY-01) | RY-spor | Backfill leser `sak_metadata` |
| **KR-14 (`DROP TABLE` CASCADE)** | Avvist / Lukket | Audit 21.09 | Migrasjon anvendt; ingen views fantes | Historisk ekstern katalog (21.09) | Lukket. | Ingen | Ingen feil i basen |
| **KR-15 (Kappløpstest xfail)** | Åpen | Audit 21.09 | `TST-02` har tilfeldig XPASS i CI | Historisk dokumentert i auditnotat | **Åpen.** Gjøre testen deterministisk ved styrt rekkefølge | Fase 0 | Ingen tilfeldig rød CI-gate |
| **MG-02 (`catenda:<subject>`)** | Lukket | Handoff 21.09 sen kveld | `koe_resolve_identity` coalescer navn/epost | Historisk ekstern katalog (21.09) | Lukket. | Ingen | Journalen bærer kun `app_users.id` |
| **MG-03 (Parsegrensen)** | Åpen (streng xfail) | Audit 21.09, test | Modellen avviser kun 2 av 5 serverfelt | Direkte kodelesing (22.09) | **Åpen.** Avvise alle 5 felt i `parse_event_from_request` | Fase 2 | Fail-closed på modellnivå |
| **MG-04 (`created_by` 3 former)** | Åpen | Audit 21.09 | 3 ulike formater (UUID, e-post, navn) i `created_by` | Direkte kodelesing (22.09) | **Åpen.** Avgjøres i Fase 2 ved splitting av `sak_metadata` | Fase 2 | Konsistent ID-form i register |
| **MG-05 (`ownerName` i pakke)** | Åpen | Audit 21.09 | Personnavn fryses inn i godkjenningspakken | Direkte kodelesing (22.09) | **Åpen.** Kun lagre ID; løse navn ved svargrensen | Fase 2 | Ingen persondata i tilstandsobjekter |
| **MG-06 / MG-07 (Indekser)** | Lukket | Audit 21.09 | Løst via KR-11 og KR-02 | Historisk ekstern katalog (21.09) | Lukket. | Ingen | Sammensatte indekser etablert |
| **MG-08 (Serielle navneoppslag)**| Åpen | Audit 21.09 | Serielle navneoppslag ved saksliste-uttrekk | Direkte kodelesing (22.09) | **Åpen (avhenger av MG-01).** Forhåndsvarm buffer eller ren projeksjon | Fase 2 | Ingen serielle spørringer per sak |
| **MG-09 (Migrasjoner uforanderlige)**| Lukket / Retningslinje| Audit 21.09, `AGENTS.md` | Protokollført i `AGENTS.md` | Direkte kodelesing (22.09) | Lukket som regel. | Ingen | Anvendte migrasjoner endres aldri |
| **RY-01–RY-07 (Opprydding)** | Åpne (Lav) | Audit opprydding 21.09 | Diverse optimaliseringer og indekser | Direkte kodelesing (22.09) | Åpen restanse (prioritert etter Fase 0–2) | RY-spor | Paginering og indekser fullført |
| **DB-05 (`viewer`-rolle)** | Besluttet / Åpen | Masterplan merknad 21.09 kveld | `app_project_memberships` mangler rollen | Lokal DDL-bygging (PG18) | **Åpen.** Utvide CHECK-skranke til å tillate `viewer` | Fase 1 | Innsyn uten handlingsrett støttes |
| **RV-02 / GFK-03 (Policyretur)** | Åpen (Høy) | Masterplan 18.09, 19.09 | Pakke kan returneres mens utstedelse pågår | Direkte kodelesing (22.09) | **Åpen.** Låse pakke og policy atomisk i utstedelsestx | Fase 2 | Ingen inkonsistent returstatus |
| **RV-10 / INT-05 (Batch outbox)** | Åpen (Høy) | Masterplan 18.09, 19.09 | `/api/events/batch` hopper over outbox | Direkte kodelesing (22.09) | **Åpen.** Batchruta oppretter outbox-oppdrag | Fase 3 | Formelle hendelser leveres alltid |
| **RV-12 / INT-01 / INT-02 (Webhook)**| Åpen (Middels) | Masterplan 18.09, 19.09 | Webhook mangler varig inbox i databasen | Direkte kodelesing (22.09) | **Åpen.** Tabellen `innkommende_hendelse` i PostgreSQL | Fase 3 | Idempotent mottak uten minnelekkasje |
| **RV-19 / RV-20 / RV-21** | Delvis lukket | Masterplan 18.09 | INT-04 lukket RV-21; RV-19/20 gjenstår | Direkte kodelesing (22.09) | **Åpen restanse.** Validering mot utstedelsesregler | Fase 2 | Pakker valideres før godkjenning |
| **Organisatorisk: ROS-analyse** | Uavklart | Masterplan 19.09 | Dokumentasjon ikke innhentet | Status ikke innhentet (utenfor repo) | **Åpen.** Gjennomføres i samråd med Oslobygg KF | Fase 5 | Formell ROS forankret |
| **Organisatorisk: DPIA** | Forberedt | Masterplan 19.09 | Faktagrunnlag foreligger i `docs/` | Direkte kodelesing (22.09) | **Åpen.** Forankres av behandlingsansvarlig m/råd fra ombud | Fase 5 | DPIA formelt forankret |
| **Organisatorisk: Sikkerhetsrevisjon**| Uavklart | Masterplan 19.09 | Dokumentasjon ikke innhentet | Status ikke innhentet (utenfor repo) | **Åpen.** Ekstern penetrasjonstest | Fase 5 | Sikkerhetsattest foreligger |
| **Organisatorisk: Beredskapsinstruks**| Uavklart | Masterplan 19.09 | Dokumentasjon ikke innhentet | Status ikke innhentet (utenfor repo) | **Åpen.** Prosedyre ved påstått tapte frister | Fase 5 | Signert instruks |
| **Organisatorisk: Restore-test** | Uavklart | Masterplan 19.09 | Dokumentasjon ikke innhentet | Status ikke innhentet (utenfor repo) | **Åpen.** Verifisere restore til tomt cluster uten re-levering | Fase 5 | Etterprøvd RPO/RTO |

---

## 5. Tabell over avvik (`KONS-01` til `KONS-14`) og analyse

| ID | Type avvik | Alvorlighet | Kildested | Foreslått håndtering og status i v2 |
| --- | --- | --- | --- | --- |
| **KONS-01** | Designinnvending / Plattform | Høy | `design-durable-inbox-outbox-2026-09-17.md:120` | Bekrefte at PostgreSQL RPC over PostgREST gir fullverdig atomisitet (én forespørsel = én transaksjon). |
| **KONS-02** | Dokumentasjonsavvik / Skjema | Middels | `plans/2026-09-17-atomisk-utstedelse-og-outbox.md:55` | Korrigere delplanen til å bruke tabellen `hendelse` i stedet for de tre slettede tabellene (MS-01). |
| **KONS-03** | Designinnvending / Arkitektur | Høy | `design-maalskjema-database-2026-09-20.md` (MS-08) | Foretrekke relasjonsprojeksjon med prosjektavgrensede fremmednøkler til videre vurdering. Stryke påstand om GIN som revisjonsspor. |
| **KONS-04** | Designinnvending / Tilgang | Høy | `design-maalskjema-database-2026-09-20.md` (MS-09) | Utvide datalagets vern til kontraktsside og team. Presisere at repository `_side` filtrerer på sak og prosjekt, men mangler team-vern. |
| **KONS-05** | Designinnvending / Sikkerhet | Høy | `plans/2026-09-16-godkjenning-og-varig-levering.md` (MS-02)| Definere tosidig append-only-vern: nekte både UPDATE/DELETE/TRUNCATE og uautorisert direkte INSERT på `hendelse`. |
| **KONS-06** | Designinnvending / Bevisverdi | Høy | `design-maalskjema-database-2026-09-20.md` (MS-11) | Supplere vedleggshash med dokumentversjonering, eksportverktøy, pålitelig tidskilde og karanteneskanning. |
| **KONS-07** | Kodeavvik / Domenekorrekthet | Middels | `services/timeline_service.py:1122` (KR-04/MG-01) | Rense `compute_state` for navneoppslag; flytte oppslag til svargrensen. Bevare skillet mellom app- og request-kontekst. |
| **KONS-08** | Prosjektstyring / Prioritering | Middels | `handoff-2026-09-21-frister.md:153`, AF-06 | Prioritere ekte PostgreSQL i CI (Fase 0) og EO-referanseflyt (Fase 2) foran generell RY-opprydding. |
| **KONS-09** | Dokumentasjonsavvik / Status | Lav | `design-maalskjema-database-2026-09-20.md:20` | Rette påstanden «ingenting er implementert»; markere MS-01, MS-04, MS-10, MS-05, MG-02 som gjennomført. |
| **KONS-10** | Operasjonell status / Migrasjon | Middels | `handoff-2026-09-21-frister.md:105`, DA-03/04 | Presisere avvik mellom filnavn og versjoner i basen; dokumentere behov for `supabase migration repair`. |
| **KONS-11** | Avhengighetsrekkefølge | Middels | `audit-databasearkitektur-2026-09-20.md` (DA-10/DB-05)| Utvide `app_project_memberships` med `viewer` før `project_memberships` kan slettes. |
| **KONS-12** | Teststabilitet / CI-risiko | Middels | `test_testsuite_blindsoner_audit_20260918.py:48` (KR-15)| Gjøre `TST-02`-reproduksjonen deterministisk ved styrt trådsynkronisering fremfor å slakke testen. |
| **KONS-13** | Databaseprivilegier | Høy | `supabase/migrations/` (8 av 19 tabeller) | Tildele eksplisitte, **nødvendige** rettigheter per tabell i migrasjonene, fremfor generell `GRANT ALL`. |
| **KONS-14** | Driftsarkitektur / Worker | Høy | `design-durable-inbox-outbox-2026-09-17.md:60` | Inkludere minimal worker og feil-/restart-tester i Fase 2; bygge fullskala flernodeworker i Fase 3. |

---

### 5.1 Detaljert behandling av utvalgte avvik

#### KONS-01 — PostgreSQL RPC over PostgREST
- **Kildested:** `docs/design-durable-inbox-outbox-2026-09-17.md`, del 2 og 9.
- **Kritikk i review:** Reviewer bekrefter at PostgREST RPC utføres i nøyaktig én transaksjon, og anbefaler å beholde RPC som utgangspunkt.
- **Konklusjon:** En autoritativ prosedyre `commit_eo_approval` over PostgREST oppfyller alle krav til atomisitet uten at applikasjonen må ta inn et ekstra databaseforbindelseslag (`psycopg3`).

#### KONS-03 — Relasjonsmodell og referanseintegritet (AF-03)
- **Kildested:** `docs/design-maalskjema-database-2026-09-20.md` (MS-08); `docs/arkitekturforinger-2026-09-21.md` (AF-03).
- **Korrigerte fakta (RGK-04, RGK2-03):** AF-03 fastslår at relasjonsprojeksjon med fremmednøkler er **foretrukket til videre vurdering**, ikke endelig besluttet. Påstanden om at GIN-indekser på JSONB utgjør et «sekundært revisjonsspor» er feilaktig: en indeks er en intern søkestruktur i databasen, ikke et uavhengig bevislager. Planen forutsetter at relasjonsprojeksjonen formelt velges ved godkjenning.

#### KONS-04 — Datalagets vern for team og private data
- **Kildested:** `docs/design-maalskjema-database-2026-09-20.md` (MS-09); `docs/arkitekturforinger-2026-09-21.md` (AF-01).
- **Korrigerte fakta (RGK-03):** `SupabaseNotatRepository._side` henter **ikke** alle notater i hele prosjektet; koden filtrerer eksplisitt på `eq("sak_id", sak_id).eq("prosjekt_id", prosjekt_id)`. Svakheten er at datalaget mangler **team-filtrering**, slik at to ulike team på samme sak teoretisk kan lese hverandres notater dersom Python-laget feiler.
- **Konklusjon:** Datalaget må beskytte teamgrensen for interne notater, utkast og godkjenningspakker. Dette krever at private data flyttes fra SQLite til PostgreSQL i Fase 1.

#### KONS-07 — Ren projeksjon i `compute_state` (KR-04 / MG-01)
- **Kildested:** `backend/services/timeline_service.py:1122`; `backend/lib/aktor_navn.py:56`.
- **Korrigerte fakta (RGK-03):** `lib/aktor_navn.py` bruker nå `has_app_context()`. I Flask er en applikasjonskontekst til stede også i skript eller jobber som kjører med `with app.app_context():`, selv uten en aktiv HTTP-request. Fravær av HTTP-request er derfor ikke ensbetydende med fravær av navneoppslag.
- **Konklusjon:** `compute_state` skal gjøres 100 % uavhengig av eksterne kilder og kontekster. Tilstandsberegningen skal kun operere på rå hendelsesdata, og navneoppslag skal utelukkende skje på svargrensen / ved visning.

---

## 6. Svarmatrise for reviewfunn (RGK-01–06 og RGK2-01–05)

| ID | Funn i review | Håndtering i oppdatert v2 | Plassering |
| --- | --- | --- | --- |
| **RGK2-01** | Avstemmingsgaranti per operasjon; GUID-støtte alene utilstrekkelig; zombie worker manglet. | Innarbeidet normativ kontrakt og 5-operasjonsmatrise for Catenda API (Topic, Filopplasting, Referanse, Kommentar, Status). Skilt mellom lokal nøkkel og ekstern nøkkel. Beskrevet `failOnDocumentExists=true` mot ny revisjon ved `false`. Beskrevet zombie worker og krav om aktivt `lease_token` for DB-oppdateringer. | Masterplan v2 avsnitt 2.2, 4 (Fase 2) |
| **RGK2-02** | Flere kildekrav manglet i v2: låserekkefølge for policy/pakke, utkastvern, vedleggsvalidering, tilgangslogging, fullmaktstilbakekalling, utrullingskompatibilitet og negative tester. | Samtlige krav er eksplisitt innarbeidet med avhengighet og akseptkriterier: låserekkefølge i `commit_eo_approval`, revisjonssjekk på utkast før sletting, forsvar i dybden for outbox, `tilgangslogg`, fullmaktstilbakekalling, utrullingskompatibilitet og negative tilgangstester. | Masterplan v2 avsnitt 4 (Fase 1 og 2), 5; Kildegrunnlag v2 avsnitt 4 |
| **RGK2-03** | Fasekriterier og tabelltall motsa oppgavene: SQLite krevdes fjernet i Fase 1 mens vedlegg lå i Fase 2; AF-03 var forutsatt vedtatt; statiske tabelltall. | Korrigert fasegrense: Fase 1 flytter de navngitte private lagrene (utkast og godkjenningspakker). Resterende SQLite (vedlegg og delivery status) avvikles i Fase 2. AF-03 er presisert med forbehold om endelig vedtak. Statisk tabellregnskap erstattet med oppgavebasert utvikling per fase. | Masterplan v2 avsnitt 4 (Fase 1 og 2), 4.1 |
| **RGK2-04** | Uavklarte driftsverdier fremsto som vedtatt («evigvarende arkivplikt», 15 min / 24 timer, «ingen 429», ombud som godkjenner, vid GET-regel). | Korrigert ordlyd: P7 forankrer at journalen bevares uten kryptosletting; formelle frister avklares med behandlingsansvarlig. DPIA forankres av behandlingsansvarlig med råd fra ombudet. Terskelverdier (15 min, 24 t) merket som tentative forslag. Rate limiting definert med 429-avvisning og backoff. RV-14 avgrenset til forbud mot domenemutasjoner. | Masterplan v2 avsnitt 2.1, 3.1, 4 (Fase 0, 3, 4, 5) |
| **RGK2-05** | Kildegrunnlaget manglet kolonner, proveniens og mapping for AR-04, AR-08, FE-06; feilaktig referanse til «avsnitt 8». | Kildegrunnlag v2 oppdatert med separate kolonner for kildested og verifikasjonskategori. AR-04, AR-08, FE-06 fullt mappet. Råloggproveniens presisert for samlede testtider. Henvisninger rettet til faktiske avsnitt (Avsnitt 7). | Masterplan v2 avsnitt 4, 5; Kildegrunnlag v2 avsnitt 4, 7 |
| **RGK-01** | Leveringskontrakt og garantier mistet forutsetninger. | Full leveringskontrakt gjeninnført m/usikkert utfall, GET-before-POST, frosset config/mål, presis kommandoidempotens, «ingen nye eller delvise endringer», og minimal worker i Fase 2. | Masterplan v2 avsnitt 2.2, 4 |
| **RGK-02** | Manglende krav i matrisen (staging, rotasjon, skanning, rate limit, varsling, bevaring, RV-14/17/18). | Samtlige produksjonskrav og restanser innarbeidet med kilde, status, avhengighet og kriterier. | Masterplan v2 avsnitt 4, 5; Kildegrunnlag v2 avsnitt 4 |
| **RGK-03** | Historisk vs observert funnstatus videreført ukritisk (AUT-03, MG-04/05/08, GFK-04, app-kontekst, `_side`). | AUT-03 skilt i produksjonsavvisning (400) og foreldet xfail-test. MG-04/05 splittet. MG-08 åpen. GFK-04 truffet avgrensningsbeslutning. `has_app_context()` forklart. `_side` kodebelegg korrigert. | Masterplan v2 avsnitt 2.1, 3.4, 4; Kildegrunnlag v2 avsnitt 4, 5 |
| **RGK-04** | Motsetninger i faser og beslutningsstatus. | Worker til Fase 2. SQLite-migrering forutsetning for Fase 1. AF-03 til videre vurdering. Nødvendige privilegier spesifisert. | Masterplan v2 avsnitt 3.5, 4, 4.1 |
| **RGK-05** | PG18-skrankeavvikets mekanisme feilforklart. | Korrigert til reell årsak: 105 nye NOT NULL-skranker i `pg_constraint` (`contype = 'n'`). Filtrert sum er bit-identisk med referansen. Målmiljø bekreftet som PG17. | Masterplan v2 avsnitt 7.1; Kildegrunnlag v2 avsnitt 7.3 |
| **RGK-06** | Verifikasjonsmerking og testlogg upresis. | Interpreter korrigert til `backend/venv/bin/python`. KR-15 merket som historisk observasjon fra 21.09. Skarpt skille mellom lokalt kjørt, lest i kode, historisk dokumentert og uavklart. | Masterplan v2 avsnitt 7; Kildegrunnlag v2 avsnitt 7, 8 |

---

## 7. Testkjøringer, katalogverifikasjon og miljøobservasjoner

### 7.1 Kjørt og observert lokalt
1. **Samlet teststatus i repoet (historisk baseline fra oppstartskjøring 21.09/22.09):**
   - Backend pytest kjørt med `backend/venv/bin/python -m pytest -q`:
     **1527 passed, 9 skipped, 42 xfailed, 7 warnings på 9.29 s**.
   - Frontend vitest kjørt med `npm test -- --run`:
     **51 testfiler, 590 tester passert på 31.10 s**.
   - Svelte-diagnostikk (`npm run check:error`): **0 feil, 9 advarsler** (3 a11y, 6 runes state-advarsler).
   - Lint (`ruff check backend/`): **0 feil**.
2. **Målrettede testkjøringer i denne økten:**
   - Målrettet test av AUT-03 med `backend/venv/bin/python -m pytest -q tests/test_routes/test_notat_lagring.py::test_batchruta_avviser_internt_notat tests/test_security/test_autorisasjon_audit_20260918.py::test_batch_innsending_lekker_internt_notat_i_last_event_at --runxfail`:
     **1 passed, 1 failed** (bekrefter at ruten avviser med `400 INTERNT_NOTAT_IKKE_I_BATCH` og at xfail feiler på statuskoden `201`).
   - Automatisk lenkekontroll over alle markdownfiler i `docs/`: **0 brutte lenker**.
3. **Katalogverifikasjon mot PostgreSQL 18.6 (lokalt testcluster):**
   - Samtlige 23 migrasjoner i `supabase/migrations/` bygger feilfritt og etablerer 19 tabeller i `public`.
   - Katalogsjekksum for `contype <> 'n'` er eksakt `cfeb38f87cc002e1b2e5959f02e2bacb`, bit-identisk med referansen. De 105 ekstra skrankene er PG18s interne `NOT NULL`-representasjon (`contype = 'n'`).

### 7.2 Miljøobservasjoner
- **Operativsystem:** macOS (Darwin 24.6.0, arm64).
- **Python:** Python 3.11.9 i `backend/venv/bin/python`.
- **Lokal PostgreSQL:** PostgreSQL 18.6 (Homebrew) under `/opt/homebrew/bin/postgres`.
- **Ekstern måldatabase:** PostgreSQL 17.6 på Supabase (referanse i `supabase/config.toml`).

---

### 7.3 Verifikasjon av migrasjonssettet mot PostgreSQL 18.6 (RGK-05)

Et kastbart PostgreSQL 18.6-cluster ble opprettet med `initdb` i scratch-området og startet
med Unix-socket. Plattformstubber for Supabase ble etablert (`anon`, `authenticated`,
`service_role` med `BYPASSRLS`, `auth.users`, `auth.role()`, `auth.email()`, samt rettigheter).

Samtlige 23 migrasjoner i `supabase/migrations/` ble kjørt sortert med `psql -v ON_ERROR_STOP=1`:
- **Resultat:** 23 av 23 migrasjonsfiler bygget rent med **0 feil**.
- **Tabeller opprettet:** Nøyaktig **19 tabeller** i skjemaet `public`.

#### Katalogsjekksummer og analyse av skrankeavviket

| Måling | Resultat på lokal PG18.6 | Referanse fra PG16/PG17 | Status |
| --- | --- | --- | --- |
| Kolonner (`md5(string_agg)`) | `53ff1083d2ba7cab670d7c19c4be361d` | `53ff1083d2ba7cab670d7c19c4be361d` | **Bit-identisk** |
| Indekser (`md5(string_agg)`) | `030ef2a97bb62e96b3ac7c48dc9f7ca4` | `030ef2a97bb62e96b3ac7c48dc9f7ca4` | **Bit-identisk** |
| Policyer (`md5(string_agg)`) | `674f3e9e31db289f53c33f3590f36fbe` | `674f3e9e31db289f53c33f3590f36fbe` | **Bit-identisk** |
| Rettigheter (`md5(string_agg)`)| `d8908d88e033f139208d38ff52ddf121` | `d8908d88e033f139208d38ff52ddf121` | **Bit-identisk** |
| Alle skranker i `pg_constraint` | `79fd0419fec2c138a2ff5c012edd692a` | `cfeb38f87cc002e1b2e5959f02e2bacb` | Avvik pga PG18 NOT NULL |
| **Skranker med `contype <> 'n'`** | `cfeb38f87cc002e1b2e5959f02e2bacb` | `cfeb38f87cc002e1b2e5959f02e2bacb` | **Bit-identisk** |
| NOT NULL-skranker (`contype = 'n'`) | 105 rader i `public` | 0 (fantes ikke i `pg_constraint` før PG18) | Ny katalogfunksjon i PG18 |
| Ikke-validerte eller uhåndhevede skranker | 0 | 0 | Samtlige skranker er validert |

Fordelingen av skranketyper i `public` på PG18.6 er:
- `c` (CHECK): 11
- `f` (FOREIGN KEY): 15
- `n` (NOT NULL): 105
- `p` (PRIMARY KEY): 19
- `u` (UNIQUE): 10
- **Totalt antall skranker:** 160

SQL benyttet for å verifisere den filtrerte summen:
```sql
SELECT md5(string_agg(t, E'\n' ORDER BY t)) FROM (
  SELECT conrelid::regclass::text || ':' || conname || ':'
         || pg_get_constraintdef(oid) AS t
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace AND contype <> 'n'
) s;
```

Dette beviser at migrasjonssettet er fullstendig konsistent, og at avviket skyldes
PostgreSQL 18s nye interne kataloghåndtering av `NOT NULL`-skranker, ikke en feil i DDL.

---

## 8. Verifikasjon og grenser (RGK-06, RGK2-05)

### 8.1 Kjørt og observert
- Backend- og frontend-suiter, linter og typesjekk er kjørt lokalt med de oppgitte kommandoene og bekreftet grønne (baseline 21.09/22.09).
- Testen av AUT-03 xfail-forutsetningen ble kjørt lokalt med `--runxfail` og bekreftet feilende statuskodeantakelse (400 mottatt vs 201 forventet).
- Bygging av alle 23 migrasjoner mot PostgreSQL 18.6 ble kjørt og katalogsjekksum korrigert.
- Automatisk lenkekontroll over alle markdown-filer i `docs/`: **0 brutte interne lenker**.

### 8.2 Lest ut av koden og spesifikasjoner
- `docs/tredjepart-api/topic-api-openapi.yaml`: `createTopic` (linje 680), `createComment` (linje 997), og `createDocumentReference` (linje 1131) støtter valgfritt felt `guid`.
- `docs/tredjepart-api/document-api-openapi.yaml`: `createLibraryItem` (linje 262) dokumenterer `failOnDocumentExists`: ved `false` opprettes ny revisjon, ved `true` avvises eksisterende filnavn.
- `backend/integrations/catenda/mixins/comments.py`: `create_comment` sender i dag kun kommentarinnhold uten forhåndsvalgt GUID.
- `backend/services/vedlegg_registry.py`: Benytter SQLite (`vedlegg.db`) for lokal mellomlagring.
- `backend/services/catenda_delivery_status.py`: Benytter SQLite (`catenda_delivery_status.db`) for leveringskvitteringer.
- `backend/routes/event_routes.py:778–791`: `submit_batch` avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH`.
- `backend/repositories/supabase_notat_repository.py:30–43`: `_side` filtrerer på både `sak_id` og `prosjekt_id`.
- `backend/lib/aktor_navn.py:56`: Bruker `has_app_context()` for å sjekke applikasjonskontekst.
- `backend/services/timeline_service.py:1122`: Kaller `aktor_navn.navn()` under tilstandsberegning.

### 8.3 Historisk dokumentert i tidligere runder
- Katalogsjekksummer fra PG16 (MS-05) og Supabase PostgreSQL 17.6-prosjektet `gwdxadexwktegkklyobv`.
- Observasjonen om «1 XPASS / 20» for KR-15 stammer fra testkjøringer dokumentert i auditnotatet `docs/audit-korrekthet-2026-09-21.md`.
- Premissene P1–P7 og fristpunktene MS-01, MS-04, MS-10, MS-05, MG-02 er hentet fra prosjektets godkjente planer.

### 8.4 Ikke kontrollert / Status ikke innhentet (utenfor repo)
- Ingen direkte spørringer eller DDL er utført mot den eksterne Supabase-databasen `gwdxadexwktegkklyobv` i denne økten.
- Ingen nettverkskall er foretatt mot Catenda Bimsync API; samtidig oppretting eller gjenbruk av samme forhåndsvalgte GUID er ikke testet mot live API.
- Status for formell ROS-analyse, DPIA-forankring, ekstern penetrasjonstest, formell driftsinstruks, fullskala restore-test og Catenda SLA er ikke innhentet fra eksterne parter (Oslobygg KF / Catenda), og må avklares med behandlingsansvarlig og systemeiere.
- Produksjonskode, eksisterende tester og migrasjonsfiler i repoet er **100 % uendret**.
