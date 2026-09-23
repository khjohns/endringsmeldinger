# Hovedplan: sikkerhet, dataintegritet og varig levering

**Opprettet:** 2026-09-16. **Sluttredigert:** 2026-09-22, mot commit
`41c2a16191a5aadbe611e0958db8b93090b08027` (`main`).
**Sist endret:** 2026-09-23, mot `05b3aa7` (`main`): BR-01 reprodusert og flyttet
til 4.2, DRF-01–DRF-03 ført inn og kartleggingen for B-13 levert. Tidligere
samme dag: beslutningen om alternativ C over direkte tilkobling (T2), B-02
punkt 3–6 og B-04 avgjort, B-12 og B-13 ført opp, se
[3.1](#31-vedtatte-premisser-og-beslutninger) og [3.4](#34-åpne-beslutninger).
**Status:** Autoritativ plan og eneste løpende kilde til funnstatus.
Appen er ikke i produksjon og har ingen reelle data.

Planen erstatter de tidligere statuslagene i denne fila og de to
konsolideringsforslagene. Den gamle teksten er bevart i Git:
`git show 41c2a16:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `9e7def005d6d5f119dfe1e708f79027581d352db`). Hvordan hvert krav og hver
funnfamilie er ført videre, står i
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md).

## 1. Hva som gjelder

### 1.1 Formål og avgrensning

Systemet fører formelle varsler etter NS 8407. En hendelse kan avgjøre om et
krav er bevart. Planen skal derfor sikre fire egenskaper før produksjon:

1. Bare riktig prosjekt, kontraktsside og team ser og endrer data.
2. En bindende handling lagres helt eller ikke i det hele tatt.
3. Det som er lagret, blir levert til Catenda uten brukerhandling, eller står
   synlig som ikke levert eller usikkert.
4. En sak kan gjenoppbygges og framlegges uten at appen kjører.

Planen omfatter ikke detaljdesign, produktvalg eller juridiske premisser som
ikke er vedtatt. Slike valg står som åpne beslutninger i
[avsnitt 3.4](#34-åpne-beslutninger).

### 1.2 Dokumentenes rolle

| Dokument | Rolle nå |
| --- | --- |
| Denne planen | Autoritativ for plan, rekkefølge og funnstatus |
| [Arkitekturføringene AF-01–AF-06](../arkitekturforinger-2026-09-21.md) | Vedtatte føringer. Normative for design, ikke implementert |
| [Transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md) | Underordnet delplan. Normativ for kommando-, låse-, worker- og akseptansetestkontrakten der den er mer presis enn denne planen. Merknaden 21.09 der gjelder foran eldre tekst |
| [Design v2 for B-02](../design-b02-tilgangsmekanisme-v2-2026-09-23.md) | Grunnlaget for alternativ C og transport T2, vedtatt 23.09. Normativt for F1 der det er mer presist enn denne planen. Punktene 3–6 i avsnitt 9 der er åpne |
| [Målskjemaet](../design-maalskjema-database-2026-09-20.md) | Retning for skjemaet, justert av AF-01, AF-03 og AF-04 |
| [Design: durable inbox og outbox](../design-durable-inbox-outbox-2026-09-17.md) | Designgrunnlag. Tabellnavnene der er forslag |
| [Catenda-dataflyten](../catenda-dataflyt.md) | Referanse for API-kontrakter og tidligere levende tester |
| [Konsolidering v2](../konsolidering-masterplan-2026-09-22-v2.md) · [kildegrunnlag v2](../konsolidering-kildegrunnlag-2026-09-22-v2.md) | Historisk forslag. Strukturen er brukt redaksjonelt; statusene er ikke overtatt uprøvd |
| [Testrevisjonen](../audit-testbevis-2026-09-22.md) · [testinventaret](../vedlegg/testbevis-2026-09-22.csv) | Protokoll over kjøringer 22.09. Rettet for ID-er, status og lenker 22.09 |
| Auditer, reviewer og handoffer | Historisk underlag. Status i dem gjelder bare der denne planen viser til dem |

Innarbeidet i denne redigeringen: AF-01–AF-06, reviewene RGK-01–06 og
RGK2-01–05, reviewet av testbeviset (RTB-01–05) og det korrigerte
testinventaret. Endrer noe status, rettes det her med en datert merknad.

### 1.3 Begreper som holdes adskilt

- **Registrert status** er denne planens vurdering av et funn.
- **Testutfall** er hva en test gjorde. En streng `xfail` beviser at en
  assertion feiler, ikke at funnet er åpent.
- **Beslutningsstatus** er vedtatt, føring, anbefaling eller åpen.
- **Belegg** merkes slik i registeret:
  **K** kjørt og observert (dato), **L** lest i kode eller migrasjonsfil,
  **D** tidligere kontrollert i databasekatalogen (dato),
  **H** historisk dokumentert i en audit, **—** ikke kontrollert.

Dokumentredigering lukker ingen kode- eller databasefeil.

## 2. Målarkitektur og sikkerhetsinvarianter

### 2.1 Ansvarsgrenser

| Lag | Ansvar | Hvorfor grensen trengs |
| --- | --- | --- |
| Klient | Viser det serveren tillater. Setter aldri aktør, rolle, tidsstempel eller hendelses-ID | Klienten kan forfalskes. FE-01 og FE-02 viste at serveren må holde uavhengig |
| Ruter | `require_auth` (med CSRF), `require_project_access`, `require_contract_role`. Stempler aktørfelt fra sesjonen. Ruteregisteret er testet | Én glemt dekoratør skal gi rød test, ikke en åpen rute |
| Svar- og lesegrense | Navneoppslag, fletting av `hendelse` og `notat`, skjerming av interne notater, aktivitetstall etter det leseren ser | Navn og skjerming er presentasjon. De skal ikke påvirke domenetilstanden (AF-05) |
| Domene | NS 8407-regler og ren tilstandsberegning fra hendelser | Samme hendelser skal gi samme tilstand, uten Flask, database eller nett |
| Datalag | Prosjekt-, side- og teamgrense for private data. Uforanderlig journal. Én transaksjon per bindende kommando | Grensen må holde også når et nytt lesepunkt glemmer filteret (AF-01, AF-02) |
| Worker | Leverer etter commit. Lease med token, avstemming og usikkert utfall | Et eksternt kall kan ikke rulles tilbake. Lokal lås beviser ikke ekstern effekt |
| Catenda | Ekstern kanal og dokumentarkiv (P4) | Appen har ingen vei utenom; avhengigheten må avklares kontraktsmessig |

### 2.2 Hva som finnes, og hva som er planlagt

| Komponent | I dag (22.09) | Planlagt |
| --- | --- | --- |
| Journal | `hendelse`, én tabell for alle sakstyper, `prosjekt_id NOT NULL` uten default, `aktor_id` = `app_users.id` (D 20.–21.09) | Append-only håndhevet av basen, også mot uautorisert `INSERT` (MS-02, AF-02) |
| Interne notater | `notat` utenfor journalen, slettbar av forfatteren. Teamfilter i applikasjonen (L) | Teamvern i datalaget (AF-01) |
| Saksmetadata | `sak_metadata` med flere skrivere og ti `cached_*`-kolonner | Register og projeksjon, én skriver i hendelsens transaksjon (MS-06, MS-07). Navn foreløpige |
| Relasjoner | `sak_relations` med `prosjekt_id`, uten fremmednøkler (L) | Avhenger av B-01 |
| Godkjenningspakker og policy | SQLite (`BH_APPROVAL_DB`) og miljøkonfigurasjon (L) | PostgreSQL med versjonert policy (F1, F2) |
| Utkast | SQLite (`utkast_registry`) (L) | PostgreSQL med teamvern (F1) |
| Vedleggsregister | SQLite (`vedlegg_registry`), ingen hash (L) | Vedleggstabell med hash, revisjon og karantenestatus (F2) |
| Leveringsstatus | SQLite (`catenda_delivery_status`) (L) | Erstattes av outbox-kvitteringer (F3) |
| Sammensatt skriving | `TrackingUnitOfWork` med kompenserende sletting (L, AP-04) | Én transaksjon per bindende kommando, over direkte tilkobling til databasekommandoer (F0b, F2) |
| Utgående levering | Synkront i forespørselen (H) | Outbox og worker. Foreløpige navn: `kommando`, `utgaende_levering` |
| Webhook-mottak | Redis-/minnereservasjon før behandling (H) | Varig inbox. Foreløpig navn: `innkommende_hendelse` |
| Tilgangslogg | Finnes ikke for forretningshendelser (OBS-01) | Logg for sensitive lesinger, eksport og endringer i fullmakt og tilgang |
| Roller | Runtime bruker `service_role`. Alle policyer er `service_role / ALL / USING (true)` (D 20.09) | Avgrensede roller for runtime, worker, drift og migrering (AF-02). Runtime logger inn direkte med en rolle som ikke kan bli `service_role` (T2, F1) |
| CI | Fire jobber, påkrevde på `main`. `database` bygger migrasjonene fra tom på PostgreSQL 17 med plattformstubben og kjører katalogtester (K 22.09) | Repositoriene testes mot ekte PostgreSQL over samme tilkobling som produksjonen, med skrivbar testbase (F0b). Tester som logger inn med de avgrensede rollene (F1) |

Tabellnavn i kolonnen «Planlagt» fastsettes i migrasjonene.
Planen låser ikke et tabelltall.

> **Merknad 2026-09-23 til 2.2:** Radene «Sammensatt skriving», «Roller» og
> «CI» er endret etter beslutningen om direkte tilkobling (3.1). Før stod det
> «Én RPC per bindende kommando» og «Tester som logger inn med avgrensede
> roller (etter B-02)». Kolonnen «I dag» er uendret.

### 2.3 Invarianter

Disse kravene gjelder alle faser. Kilden står i parentes.

1. **Prosjekt, kontraktsside, team og handlingsrett er forskjellige grenser.**
   Private notater, utkast og godkjenningspakker vernes i datalaget. En
   leserolle (DB-05) gir ikke adgang til private data. Manglende kontekst
   avviser (AF-01).
2. **Append-only verner mot omskriving og mot uautorisert tilføying.** Runtime,
   worker, drift og migrering får konkret avgrensede rettigheter, også for
   `TRUNCATE`, kaskader og funksjonseierskap. Ingen generell append-funksjon
   som lar runtime omgå godkjenning (AF-02).
3. **Én bindende kommando er én transaksjon.** For EO omfatter den policy,
   pakke og fullmakt, saksversjoner, EO- og KOE-reserveringer, hendelser,
   metadata og relasjoner, vedleggsbinding, kvittering og leveringsintensjon.
   Låserekkefølgen er dokumentert og felles for alle skrivestier som berører
   de samme radene. Avbrudd før commit gir ingen nye eller delvise endringer.
   Ingen kompensasjonssletting (AF-02, transaksjonsplanen).
4. **Idempotens gjelder prosjekt, aktør, kommando og innhold.** Samme
   `command_id` med samme innhold gir samme kvittering. Samme ID med endret
   innhold avvises. To ulike kommandoer mot samme pakke eller versjon gir én
   commit og én konflikt (transaksjonsplanen, RGK-01).
5. **Nyere utkast slettes ikke ved parallell innsending.** Innsendt utkast
   slettes bare om revisjonen fortsatt er gjeldende. Vedlegg valideres mot
   prosjekt, sak, eier/team, revisjon og karantene før binding.
6. **Mål, konfigurasjon og dokumentgrunnlag fryses ved commit.** Endret mapping
   parkerer gamle jobber. En retry leverer samme dokument, ikke et nytt fra
   siste sakstilstand.
7. **Levering har en ærlig kontrakt.** Usikkert eksternt utfall parkeres og
   varsles. En ny worker antar ikke at en gammel worker har stoppet. Lokal
   kvittering krever gyldig lease-token. Eldre statusjobber overstyrer ikke
   nyere ønsket tilstand. Leveransen er levert når alle obligatoriske
   operasjoner er kvittert. Ingen garanti om nøyaktig én ekstern effekt.
   Avstemming mot Catenda er ekstra vern, ikke erstatning for atomisk
   registrering.
8. **Private data går ikke ut gjennom outbox.** Interne notater og utkast
   avvises når en ekstern jobb opprettes, ikke bare i ruta. Dead-letter-innsyn
   og manuell retry krever eksplisitt tilgang og logges.
9. **Tilstand beregnes fra hendelser alene.** Navneoppslag skjer ved visning.
   Gamle hendelser kan leses av ny kode, og tilbakerulling gjør ikke nye
   hendelser uleselige (AF-05, forovervendt kompatibilitet).
10. **Hash alene er ikke bevis.** Dokumentversjon, mål, leveringskvittering,
    bevaring og eksport må også finnes (AF-04).
11. **Serverstyrte felt settes av serveren.** `aktor_id`, `aktor_rolle`,
    `aktor_team_id`, `tidsstempel` og `event_id` kommer aldri fra klienten
    (`AGENTS.md`).
12. **Det finnes ikke noe defaultprosjekt.** Ukjent prosjekt betyr ingen tilgang
    (`AGENTS.md`, 5a).

## 3. Beslutningsregister

### 3.1 Vedtatte premisser og beslutninger

Disse styrer implementeringen. De tas ikke opp igjen uten at beslutningen
eksplisitt oppheves.

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| P1: magic links utgår | 20.09 | `magic_links` fjernes (MS-15) |
| P2, P3: BIM er relevant; et objekt hører til én sak; formålet er å se hvilke komponenter som fører til tvist | 20.09 | Retning MS-13, MS-14. Ikke prioritert |
| P4: vedlegg lagres bare i Catenda | 20.09 | Hash og frosset grunnlag hos oss (MS-11, AF-04) |
| P5: løsningen skal i prinsippet støtte andre virksomheter | 20.09 | `organisasjon_id` (MS-10, gjennomført) |
| P6: to kan arbeide i ulike spor samtidig | 20.09 | Total orden beholdes (MS-03) |
| P7: arkivplikt går foran sletteplikt for journalen | 21.09 | Journalen bevares. Kryptografisk sletting bygges ikke. Tiltakene er MS-04 og MS-05. Bevaringstid og øvrige regler er ikke fastsatt (B-05) |
| Forsering er utenfor godkjenningsflyten | 18.09 | Prosjekter med policy kan inntil videre ikke svare på forseringsvarsel (GFK-04). Utvidelse er et produktvalg om godkjenningsomfang |
| Policy nøkles på `user_id` | 18.09 | `BH_APPROVAL_POLICIES` må ha `user_id` per oppføring før produksjon |
| Bare Catenda-innlogging | 18.09 | Anonym innlogging og OAuth-serveren slås av i Supabase-konsollet før produksjon |
| Vedlegg er kontraktskorrespondanse | 18.09 | Deltakere uten TE- eller BH-tilknytning leser ikke vedlegg |
| Webhookens kontraktsside utledes av forfatterens lagmedlemskap | 19.09 | Fail-closed uten entydig side (INT-04) |
| Aksept av avslag gir `AVSLATT_AKSEPTERT` | 19.09 | TFR-01 |
| MG-02: webhook kan opprette brukerrader gjennom `koe_resolve_identity` | 21.09 | Gjennomført |
| DB-05: `viewer` skal finnes som ren leserolle | 21.09 | Besluttet, ikke bygget |
| ~~PostgreSQL og RPC over PostgREST er utgangspunkt for transaksjoner~~ | 16.–17.09, bekreftet i AF-02. **Opphevet 23.09** med TM-01 som motbelegg | Se raden under og merknaden etter tabellen |
| PostgreSQL over direkte tilkobling er utgangspunkt for transaksjoner (B-02 alternativ C, transport T2) | 23.09, oppdragsgiver | Én bindende kommando er én transaksjon, over direkte tilkobling til databasekommandoer. Backend når basen med en databasedriver og vanlig SQL, ikke gjennom PostgREST og `supabase-py`. Tas ikke opp igjen uten nytt konkret motbelegg |
| B-02 hovedvalg: alternativ C. RLS med kontekst for lesing, avgrensede `SECURITY DEFINER`-kommandoer for bindende skriving, og operasjonsmodellen for journal, saksregister og kø | 23.09, oppdragsgiver | Slik [design v2](../design-b02-tilgangsmekanisme-v2-2026-09-23.md) beskriver det. Punktene 3–6 i avsnitt 9 der står åpne under B-02. Uavhengig review før første F1-migrasjon gjelder fortsatt (22.09) |
| Designet avhenger ikke av plattformen. Foreløpig mål er Azure Database for PostgreSQL (Flexible Server, versjon 17) | 23.09, oppdragsgiver | Alternativ C skal virke likt lokalt, i CI, på Supabase og på Azure. Vernet ligger i roller, RLS og funksjoner i ren PostgreSQL (kravet fra 22.09). Endelig plattform og hosting er B-12 |
| TS2-02: JSON-hendelseslageret, CSV-metadatalageret og Supabase-lagrene går ut av kjøretidsstien | 23.09, oppdragsgiver, med beslutningen over | Tester som trenger ekte lagring, går mot PostgreSQL over samme tilkobling som produksjonen, med skrivbar testbase. Testdoblene som speiler Supabase-klienten, faller bort med lagrene (F0b) |
| B-02 punkt 3: «ikke omgå godkjenning» betyr prosedyregaranti (v2 avsnitt 5, alternativ a) | 23.09, oppdragsgiver | En EO utstedes bare gjennom kommandoen, og kommandoens regler holder: pakke, policyversjon, fullmakt og side. At en overtatt runtime kan opptre som en godkjenner, er restrisiko. Den føres i ROS-analysen og vurderes på nytt før produksjon (F5). Bevis på menneskelig godkjenning (b) bygges ikke nå |
| B-02 punkt 4: prosjekt og kontraktsteam registreres bare av drift (TM-12) | 23.09, oppdragsgiver | En navngitt administrator bestemmer hvilke Catenda-team som representerer TE og BH. Runtime får ikke kalle `koe_register_project` eller `koe_set_contract_teams` (F1) |
| B-02 punkt 5 og B-04: tilbakekalling | 23.09, oppdragsgiver | Se merknaden under B-04. Rett til nye handlinger opphører straks systemet har registrert endringen; en gitt godkjenning står; utkast blir hos teamet; ved utdatert medlemsliste fortsetter appen, og drift varsles |
| B-02 punkt 6: break-glass er navngitt, tidsbegrenset og logget | 23.09, oppdragsgiver | Prosedyren i v2 avsnitt 8: én person, én hendelse, bare de rettighetene hendelsen krever, fjernet etterpå, alt logget. To-personskontroll og varsel til motparten kreves ikke. Hvem som kan få og godkjenne nødtilgang, avklares i F5 |
| Leveringsmål fryses; samlet status skiller lagret, venter, usikkert og levert; fravær løses med sporbar ny godkjenning, ikke delt konto eller bypass | 16.–17.09 | Del av invariantene i 2.3 |
| En enkel databasebasert worker, ikke en distribuert meldingsplattform | 17.09 | Volumet tilsier det |
| Ingen utrulling før den samlede produksjonsporten er passert | 17.09 | F5 |

> **Merknad 2026-09-23 til 3.1: direkte tilkobling erstatter RPC over PostgREST.**
> Oppdragsgiver bekreftet 23.09 alternativ C med transport T2 fra
> [design v2 for B-02](../design-b02-tilgangsmekanisme-v2-2026-09-23.md#9-hva-oppdragsgiver-må-avgjøre)
> (punkt 1 og 2), og Azure PostgreSQL som foreløpig mål. Premisset «RPC over
> PostgREST» fra 16.–17.09 er dermed opphevet. Motbelegget er TM-01: den som kan
> signere et token for PostgREST, kan velge `service_role`. Med direkte
> innlogging har runtime ingen nøkkel som velger rolle, og rollen kan ikke
> `SET ROLE` til `service_role` eller eieren (K 23.09, prototype v2).
>
> Følgene: TM-01 og TM-09–TM-10 treffer ikke runtime når backend verken bruker
> PostgREST eller har nøkler til det. Forespørselsvakten (T1v) og porten mot hostet PostgREST i v2
> avsnitt 1 bortfaller. Python får ekte transaksjoner, og databasekommandoene
> kalles med vanlig SQL. Lokal testing mot en egen PostgreSQL blir mulig uten
> virksomhetens base. Kostnaden er den v2 navngir: databasedriver og pool i
> Flask, og omskriving av repositoriene. Det er arbeidspakken F0b.
>
> Transaksjonsinvarianten (2.3, punkt 3) er uendret. Det som er byttet, er
> veien fra backend til basen. Vedtak som nevner Supabase-konsollet, gjelder så
> lenge Supabase er plattformen (B-12). Kilde:
> [handoffen 23.09](../handoff-2026-09-23-datalag-postgresql.md), avsnitt 3 og 6.

### 3.2 Føringer AF-01–AF-06

Tilsluttet av oppdragsgiver 21.09. Føringer for design, ikke implementert.

| ID | Føring | Hvor i planen |
| --- | --- | --- |
| AF-01 | Teaminternt innhold vernes i datalaget; prosjekt, side, team og handlingsrett modelleres hver for seg | F1, invariant 1 |
| AF-02 | Kommandoer, rettigheter og transaksjonsgrenser utformes samlet; append-only mot omskriving og tilføying | F1, F2, invariant 2–3 |
| AF-03 | Fjerning av relasjonsprojeksjonen er ikke fastlagt | B-01 |
| AF-04 | Hash suppleres med dokumentversjon, bevaring, leveringsbevis og eksport | F2, F4, invariant 10 |
| AF-05 | Deterministisk gjenoppbygging uten eksterne oppslag | F2, invariant 9 |
| AF-06 | Ekte PostgreSQL-tester og én komplett EO-flyt før generell opprydding og flere adaptere | Rekkefølgen i avsnitt 5 |

### 3.3 Anbefalinger som ikke er vedtatt

| Anbefaling | Kilde | Status |
| --- | --- | --- |
| Relasjonsprojeksjon med prosjektavgrensede fremmednøkler og én skriver | AF-03, RGK-04 | Foretrukket til vurdering, se B-01 |
| Avgrenset runtime-rolle uten `BYPASSRLS`, RLS for lesing og avgrensede `SECURITY DEFINER`-funksjoner med egen autorisasjon, fast `search_path` og smal `EXECUTE` | RGK-04 | Innarbeidet i alternativ C, vedtatt 23.09 (3.1) |
| Gjør TST-02-reproduksjonen deterministisk, framfor å fjerne `strict=True` | RGK-04 | Anbefalt. Den nye testen fra 22.09 er ikke deterministisk (RTB-02) |
| Forhåndsvalgte GUID-er for topic og kommentar | RGK2-01 | Kandidat. Ikke bevist idempotent (avsnitt 7) |
| Køalarm ved 15 minutter; sletting av stagingfiler 24 timer etter kvittert levering | Konsolidering v2 | Forslag uten kilde, se B-09 |
| Utgående kvote på 10 kall/s og innkommende grense 100 kall/s | Konsolidering v2 | Forslag uten kilde, se B-09 |
| Fjern JSON-hendelseslageret og CSV-metadatalageret fra kjøretidsstien; tester som trenger ekte lagring, går mot PostgreSQL gjennom samme vei som produksjonen, med skrivbar testbase | [TS2-02](../gjennomforing-tst02-2026-09-22.md#ts2-02--reservelagrene-og-testene) | Vedtatt 23.09, utvidet til Supabase-lagrene (3.1) |
| Migrasjonsmappa som eneste kilde, anvendt med `supabase db push` | Masterplanen 20.09 | Repo-siden gjennomført (DA-03). Anvendelsesmekanismen gjenstår. `supabase db push` gjelder bare på Supabase; på Azure trengs en annen vei fra fil til base (B-12) |

### 3.4 Åpne beslutninger

«Ansvarlig» angir rollen som må avklare. Der ingen er utpekt, står det.
Et åpent valg blokkerer bare oppgavene som er nevnt.

| ID | Spørsmål | Alternativer | Anbefaling (kilde) | Ansvarlig | Belegg som trengs | Blokkerer |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | Hvordan skal relasjoner mellom saker lagres? | (a) Relasjonsprojeksjon med prosjektavgrensede fremmednøkler, én skriver. (b) Utledning fra hendelsenes jsonb med GIN-indeks. (c) Reservasjonstabell for KOE-tilknytning pluss (a) eller (b) | (a) er foretrukket til vurdering (AF-03). En GIN-indeks er ikke et revisjonsspor (RGK-04) | Utvikler, med review. Ikke utpekt | Sammenlikning mot referanseintegritet, eksklusivitet, gjenoppbygging og samtidighet | KOE-tilknytning og relasjoner i F2. DB-04, MS-08 |
| B-02 | Hvilken tilgangsmekanisme skal datalaget ha? | RLS med kontekst, avgrensede funksjoner, eller begge. `SECURITY INVOKER` eller `DEFINER`. Hvordan identitet, prosjekt og team føres inn, og av hvem | Utform rolle, identitetskontekst og funksjoner samlet (AF-01, AF-02, RGK-04). RLS med kontekst som backend selv setter, verner ikke mot en overtatt backend | Utvikler, med uavhengig review. Ikke utpekt | Trusselmodell som skiller glemt filter, ondsinnet bruker, kompromittert runtime/worker og databaseadministrator. Test av gjenbrukte forbindelser | F1-migrasjoner for roller og private lagre. F2-kommandoens rettigheter. **Avgjort 23.09:** alternativ C og T2, og punkt 3–6 i v2 avsnitt 9 (3.1) |
| B-03 | Hvilken dokument- og brevmodell skal gjelde i Catenda? | Samlet saksdokument med revisjoner; separate brev; separate brev per part og spor ([Catenda-dataflyten, avsnitt 11](../catenda-dataflyt.md#11-åpent-adr-dokument--og-brevmodell)) | Ingen. `failOnDocumentExists` følger av valget: `true` passer en strategi med unikt navn per brev, `false` en bevisst revisjonsflyt | Produkteier med utvikler. Ikke utpekt | ADR med dokumentnøkkel, navnestandard og avstemming etter tapt svar | Dokumentoperasjonen i F2-workeren og alle senere dokumentadaptere |
| B-04 | Når får tilbakekalt medlemskap eller fullmakt virkning? | Straks for alt; straks for nye handlinger, men ventende pakker returneres; frist før virkning | Ingen. At journalen er uforanderlig, sier ikke noe om rettslig gyldighet | Oppdragsgiver (kontraktsside), ikke utpekt | Kontraktsmessig vurdering av utkast, ventende godkjenning og allerede committede brev | Tilbakekallingsatferd i F1. Eventuell medlemskapscache. **Avgjort 23.09** (3.1 og merknaden under). Grensene for varsel ved utdatert liste hører til B-09 |
| B-05 | Hvilke bevaringskrav gjelder utover journalen? | Bevaringstid for journal, filer, logger, backup og stagingfiler | P7 fastsetter bare at journalen bevares uten kryptografisk sletting | Behandlingsansvarlig, med råd fra personvernombudet | DPIA og arkivfaglig vurdering | Bevarings- og sletteregler i F4. Produksjonsport |
| B-06 | Hvilken fullmakt kreves når dagmulktssats mangler? | Kjedens toppnivå; avvisning; manuell verdsetting | Ingen | Oppdragsgiver (BH-siden), ikke utpekt | Domenevurdering | Restansen på GFK-01/FE-04 |
| B-07 | Hvilken drivmekanisme skal workeren ha? | Tabell med `SKIP LOCKED`, `pgmq`, Cloud Tasks, Cloud Scheduler, jobber i Azure Container Apps, fast instans | Én kømekanisme; tabell og `SKIP LOCKED` er beskrevet i transaksjonsplanen | Utvikler, ikke utpekt | Plattformens skalering til null og krav om start uten brukerhandling | Minimal worker i F2 |
| B-08 | Kan en KOE tilhøre flere endringsordrer? | Eksklusiv; flere med regler | Fastsett forretningsregelen før reservasjonsskjemaet låses (transaksjonsplanen) | Domeneansvarlig, ikke utpekt | NS 8407-vurdering | KOE-reservasjon i F2 |
| B-09 | Hvilke driftsverdier gjelder? | Kapasitet, svartid, køalarm, rate limits, oppbevaring av stagingfiler | Tall i 3.3 er forslag uten kilde | Driftsansvarlig, ikke utpekt | Lastforutsetninger, Catendas kvoter, fristkrav | Akseptkriterier for kapasitet og varsling i F3 |
| B-10 | Hvordan versjoneres hendelsesformat og regler? | Versjonsfelt per hendelse; oppgraderingsfunksjoner; regelversjon i projeksjonen. `UP042` (`StrEnum`) avhenger av dette | Dokumentert strategi (AF-05) | Utvikler, ikke utpekt | Test av gamle strømmer mot ny kode og tilbakerulling | Kompatibilitetskravet i F2 |
| B-11 | Hvilken tidskilde og forvaringskjede skal eksporten bygge på? | Servertid med synkroniseringsgaranti; ekstern tidsstempling; begge | Ingen | Oppdragsgiver med driftsansvarlig, ikke utpekt | Krav ved preklusjonstvist | Eksport i F4 |
| B-12 | Hvilken plattform skal basen og backend kjøre på? | Database: Azure Database for PostgreSQL (Flexible Server, 17) eller Supabase. Backend: Azure Container Apps eller App Service (Web App for Containers) | Azure PostgreSQL er foreløpig mål (oppdragsgiver 23.09). Begge hostingvalgene virker; Container Apps har jobber som kan drive workeren (B-07). Azure SQL velges ikke uten en konkret grunn fra IKT, fordi det krever et nytt datalag i T-SQL. Fabric er rapportering, ikke backend | Oppdragsgiver med IKT | Svar fra IKT om hosting og database, og tilgang til deploy, Key Vault og en offentlig HTTPS-adresse for Catenda-webhooks | Container og utrulling i F0b. Veien fra migrasjonsfil til base. Plattformkonfigurasjon i F5 |
| B-13 | Hvem er sannhetskilde for NS 8407-reglene, og hva lagres når partens konklusjon og vurderingene spriker? | Backend eier alt som lagres med rettsvirkning eller styrer systemets handlinger, frontenden bare veiledning. For partens konklusjon: (1) serveren regner ut, og det gjelder; (2) serveren avviser et svar der konklusjonen ikke følger av vurderingene; (3) begge lagres, og avviket vises. Tilsvarende for rettslige konklusjoner som preklusjon: trekkes de av systemet, eller varsles de bare | Backend som sannhetskilde for det som lagres (handoffen 23.09, avsnitt 9). Ingen for (1)–(3) | Oppdragsgiver, med utvikler | Kartlegging av frontendens utregninger og hvilke som havner i det som lagres ([oppdraget for spor D](../prompt-spor-d-br01-2026-09-23.md), del 1) | Rettingen av BR-01. Kommandoene i F2 som bygger på resultatene |

> **Merknad 2026-09-22 til B-02:** Designgrunnlaget finnes:
> [design-b02-tilgangsmekanisme-2026-09-22.md](../design-b02-tilgangsmekanisme-2026-09-22.md).
> Oppdragsgivers svar om plattform, Data API, trusler og review står i
> [oppdraget](../prompt-b02-tilgangsmekanisme-2026-09-22.md).
> Grunnlaget sammenlikner tre alternativer og anbefaler dette: RLS med kontekst
> for lesing, avgrensede `SECURITY DEFINER`-kommandoer for bindende skriving, og
> en skrivevakt-trigger på journalen. Prototypen kjører mot PostgreSQL 17 og
> PostgREST (71 av 71 sjekker, K 22.09). Funnene TM-01–TM-08 står der.
> TM-01 er grunnen til skrivevakten: den som kan signere et token for
> PostgREST, kan velge `service_role`.
> Beslutningsstatus er uendret. B-02 er åpen til oppdragsgiver har avgjort den
> etter uavhengig review. TS2-02 er vurdert i avsnitt 7 der, og statusen i 3.3
> er uendret.

> **Merknad 2026-09-23 til B-02:**
> [Uavhengig review](../review-b02-tilgangsmekanisme-2026-09-23.md) er levert.
> Konklusjonen er at alternativ C kan legges til grunn med navngitte endringer:
> transport og signeringsmyndighet, vern av integritetsbærende metadata og
> leveringsdata, private skrivestier, kontekst/identitet, tilbakekalling og
> fullstendig F1-testplan (RB2-01–08). Originalbeviset er bekreftet; fem nye
> mutasjoner og lokale tilleggsforsøk viser grensene for beviset. Reviewet
> anbefaler ny vurdering av transportpremisset i 3.1 med TM-01 som konkret
> motbelegg, men vedtar ingen endring. B-02 og B-04 er fortsatt åpne;
> beslutningsstatus og TS2-02-status er uendret.

> **Merknad 2026-09-23 til B-02 (v2):**
> [Design v2](../design-b02-tilgangsmekanisme-v2-2026-09-23.md) svarer på RB2-01–08.
> Hovedendringene er disse. Transportvariantene er sammenliknet, med
> forespørselsvakt i PostgREST (T1v) og direkte innlogging (T2). Skrivevakten
> er utvidet til en operasjonsmodell for journal, saksregister og kø, med
> skranker som binder dem til samme prosjekt. Notater skrives bare gjennom
> kommandoer. Kontekst og argumenter kontrolleres strengere, og teamkravet må
> være et av prosjektets kontraktsteam. Identitetsinngangene er smale, med låst
> issuer. Prototypen er bygget som `postgres` uten superbrukerrettigheter, som i
> Supabase (155 av 155 sjekker, tolv mutasjoner røde, K 23.09). Nye funn:
> TM-09–TM-12. Seks punkter står igjen for oppdragsgiver (avsnitt 9 der). Et av
> dem er om premisset i 3.1 skal endres. B-02 og B-04 er fortsatt åpne.

> **Merknad 2026-09-23 til B-02 (beslutning):** Oppdragsgiver har valgt
> alternativ C og transport T2 (v2 avsnitt 9, punkt 1 og 2). Premisset i 3.1 er
> endret tilsvarende; se merknaden der. Med T2 bortfaller porten mot hostet
> PostgREST. Fire punkter står åpne: godkjenning ved overtatt runtime (3),
> kontraktsteam og prosjektregistrering (4), klokken for tilbakekalling, som
> også er B-04 (5), og break-glass (6). De må være avgjort før første rolle-
> eller policymigrasjon i F1. Kravet om uavhengig review før F1 står.

> **Merknad 2026-09-23 til B-02 (punkt 3–6):** Oppdragsgiver har avgjort de
> fire punktene som stod igjen; vedtakene står i 3.1. Dermed er alle
> beslutningene i v2 avsnitt 9 tatt. Før første rolle- eller policymigrasjon i
> F1 gjenstår det uavhengige reviewet (22.09), tidskontrakten fra reviewet av
> kjernen (RK-05) og, for anvendelse utenfor Supabase, B-12.
>
> Om punkt 4: registrering av prosjekt og kontraktsteam skjer i dag med
> administratorskriptene `scripts/register_project.py` og
> `scripts/catenda_admin.py`, ikke fra noen rute (L 23.09). Beslutningen gjør
> praksisen til en grense basen håndhever.

> **Merknad 2026-09-23 til B-04 (beslutning):** Oppdragsgiver har avgjort:
>
> 1. **Nye handlinger** opphører straks systemet har registrert at tilgangen er
>    borte. Klokken er tidspunktet synkroniseringen committer lokalt, fordi
>    Catenda ikke oppgir når endringen ble gjort der, og fordi det lokale
>    tidspunktet kan dokumenteres.
> 2. **En godkjenning** som ble gitt mens godkjenneren hadde fullmakt, står.
>    Pakken kan utstedes. Nye godkjenninger kan personen ikke gi.
> 3. **Utkast** blir hos teamet. En kollega kan fullføre og sende i eget navn.
> 4. **Utdatert medlemsliste:** feiler synkroniseringen, kan alle fortsatt
>    handle, og drift varsles. Begrunnelsen er at en tapt frist ikke kan
>    repareres, mens et varsel fra en som ikke lenger hadde tilgang, kan
>    bestrides og spores. Varselet skal utløses av alderen på listen, ikke bare
>    av feil, fordi en ufullstendig liste ikke gir noen feil. Hvor gammel listen
>    kan bli før drift varsles, og om det skal være en ytre grense, for eksempel
>    at intern EO-godkjenning stopper mens varsler og svar aldri gjør det,
>    fastsettes i B-09.
>
> Punkt 4 snur dagens atferd. `AuthService.role()` synkroniserer når listen er
> eldre enn `AUTH_MEMBERSHIP_MAX_AGE_SECONDS` (900 s), og `require_project_access`
> gjør et unntak fra synkroniseringen om til `503 ACCESS_UNAVAILABLE`, uten å
> logge det. Når Catenda ikke svarer, kan da ingen handle i prosjektet, heller
> ikke sende et varsel med frist (L 23.09, ikke kjørt). Endringen hører til F1
> sammen med tilbakekallingen.

> **Merknad 2026-09-23 til B-13:** Ny åpen beslutning, reist av BR-01.
> Frontenden har om lag 2 400 linjer med NS 8407-regler i `src/lib/domain/`:
> preklusjon, passivitet, reduksjon, prinsipalt og subsidiært resultat,
> godkjent beløp og EO-eksponering. Flere resultater sendes med i hendelsene.
> Backend har i hovedsak prosedyreregler (`services/business_rules.py`);
> passivitet finnes ikke der (L 23.09, søk etter ordstammer, ikke kjørt).
> Spørsmålet er ikke bare teknisk. BHs svar har rettsvirkning som BHs
> standpunkt, og det utregnede resultatet oppsummerer vurderingene. Spriker de,
> må det avgjøres om systemet eller parten har siste ord. Utregninger som bare
> veileder (felt som vises, standardverdier, hjelpetekst), berøres ikke.

> **Merknad 2026-09-23 til B-13 (kartlegging):** Kartleggingen er levert:
> [kartlegging-domeneregler-frontend-2026-09-23.md](../kartlegging-domeneregler-frontend-2026-09-23.md).
> Backend regner ikke ut og kontrollerer ikke noe av det frontenden regner ut
> og sender: resultat, beløp, dager, preklusjon, reduksjon, subsidiære grunner,
> varseldatoer og begrunnelsestekst. For resultatet er det kjørt (BR-01,
> reprodusert og satt til middels i 4.2); for resten er det lest. Sporstatus,
> samlet status, EO-adgang, forsering og fullmakt regnes i backend, men av
> klientens tall. Anslaget for å la backend eie reglene er 250–350 linjer
> Python uten begrunnelsestekstene, med frontendens testsett som
> spesifikasjon. Seks spørsmål står åpne i kartleggingen, blant dem
> 99 %-terskelen for «godkjent», passivitet etter § 32.3 og om det er sum
> eller poster som binder. Kartleggingen fant også DRF-01–DRF-03 (4.2).
> Beslutningsstatus for B-13 er uendret.

> **Merknad 2026-09-23 til B-12:** Ny åpen beslutning. IKT svarte at både
> Azure SQL og PostgreSQL kan brukes; oppdragsgiver har foreslått PostgreSQL.
> Fabric kan speile fra Azure PostgreSQL (versjon 14–18, ikke Burstable-nivå).
> Speiles basen, må interne notater holdes utenfor speilingen eller skjermes der
> ([vurderingen av Power Platform](../vurdering-power-platform-2026-09-17.md),
> del 5). Opplysningene om Fabric er ikke kontrollert i denne planen.

## 4. Funnregister

<a id="status-2026-09-18"></a>
Én linje per etablert ID. Ved overlapp arbeides saken under én ID, og de andre
viser dit. Pakkene er beskrevet i avsnitt 5. Kilden er auditen der funnet ble
gjort; senere statusendringer står i denne planen.

**Statusord:** *Lukket*, *Lukket med restanse*, *Delvis*, *Åpen*, *Avgrenset*
(vedtatt, ikke feil), *Bortfalt* (påstanden holdt ikke), *Duplikat*,
*Avvist* (rettes ikke, med begrunnelse), *Regel* (ført inn i arbeidsreglene).

### 4.1 Godkjenning og levering: AP, S, RV, SA

Kilder: [AP](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md),
[S](../audit-sikkerhetsarkitektur-2026-09-17.md),
[RV](../audit-review-astra-2026-09-17.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AP-01 | Lukket | Alternative EO-innganger. `e235412`, 17.09. Testinventarets rad med `test_stale_reserved_id_…` gjelder AP-04, ikke AP-01 | H, K 17.09 | — |
| AP-02 | Lukket | Endret fullmakt før utstedelse. `e235412` | H | — |
| AP-03 | Lukket | Sluttdato i fullmaktsgrunnlaget. `e235412`; regresjon rettet som RV-01 | H | — |
| AP-04 | Åpen, høy | Gammel opprettelse kan slette metadata til vellykket utstedelse. Samme sak som AR-06 og TST-03. Løses bare av felles transaksjon med samordnet låsing, kommandoidempotens og atomisk leveringsintensjon. En ekstra sjekk før sletting eller vern av aktiv lease er ikke nok (RTB-03) | Streng `xfail` ×2, K 22.09 (JSON-lager) | F2 |
| AP-05 | Lukket | Felles satsoppslag. `e235412` | H | — |
| S1–S10 | Fordelt | S1 → SA-01. S2 → RC-2, lukket 20.09. S3 → RV-10. S4 → SA-02/03. S5 → RV-12, F3. S6 besvart: én RPC gir atomisk flerstegsskriving. S7 lukket med SA-01 (ingen `require_supabase_auth` i produksjonskode, L 22.09). S8 → kapasitet, B-09. S9 → AR-05. S10 → AR-02, MS-02 | H, L | Se ID |
| RV-01 | Lukket | Fullmaktsgulv når grunnlaget er uberegnet | H | — |
| RV-02 | Åpen, høy | Policyretur midt i utstedelse. Samme sak som GFK-03. Løses ved at policy og pakke låses i samme kommando. «Ikke rør pakker med aktiv lease» er ikke nok alene (RTB-03) | Streng `xfail`, K 22.09 (SQLite) | F2 |
| RV-03 | Lukket med restanse | Policy nøkles på `user_id`. Restanse: policyoppføringene må få `user_id` før produksjon | H | F5 |
| RV-04 | Lukket | `forsering_respons` under godkjenningsporten | H | — |
| RV-05 | Lukket | Vedlegg krever kontraktsside | H | — |
| RV-06 | Lukket med restanse | Data API stengt for `anon` og `authenticated`. Restanse: slå av anonym innlogging og OAuth-server i Supabase-konsollet; status ikke innhentet | D 18.09 | F5 |
| RV-07 | Lukket med restanse | Lukket som klasse for forseringens lesestier 19.09 (`hent_relaterte_saker` krever `tillatte_saker`). Grensen ligger fortsatt bare i applikasjonen | H | F1 |
| RV-08 | Lukket | `actorteam` i basen (`20260920152042`) | D 20.09 | — |
| RV-09 | Lukket | Aktivitetstall etter det leseren ser. Skrivesiden i batchruta: se AUT-03 | H | — |
| RV-10 | Åpen, høy | `/api/events/batch` lagrer uten leveringsintensjon og viser «clear». Samme sak som INT-05. Ingen kjent klientforbruker (S3) | Streng `xfail`, K 22.09 | F3 |
| RV-11 | Lukket | Versjonskonflikt gir 409 | H | — |
| RV-12 | Åpen | Webhook: sammenlikning uten konstant tid (INT-01), dedupe før behandling (INT-02), døde `bcf.*`-grener (INT-03) | Se INT | H, F3 |
| RV-13 | Åpen | Rå `str(e)` og åpne driftsruter. Samme familie som CFG-03 og OBS-07 | H | H |
| RV-14 | Åpen, lav | GET-ruter som muterer godkjenningstilstand. Kravet er forbud mot skjulte domeneendringer ved lesing, ikke mot sesjonsvedlikehold og sikkerhetslogging | H | H |
| RV-15 | Lukket | Hendelsestabeller uten migrasjon: lukket med DB-01/DA-01. Viewene finnes ikke (DB-08) | D 19.–20.09 | — |
| RV-16 | Lukket | Live-tester er opt-in | H | — |
| RV-17 | Delvis | Alle 40 strenge `xfail`-markeringer i backend-testene har `raises=`; AP-04-testen fikk det i T-5 (22.09). Øvrige delpunkter er ikke kontrollert på nytt | L 22.09 (AST) | — |
| RV-18 | Åpen, lav | Dokumenthygiene. Løpende; daterte merknader ved motstrid | H | Løpende |
| RV-19 | Åpen | Pakker valideres ikke mot utstedelsesreglene | H | F2 |
| RV-20 | Åpen | EO-godkjenning avhenger av prosjektregisteret når `daily_rate` mangler | H | F2 |
| RV-21 | Lukket | Lukket med INT-04 | H | — |
| RV-22 | Lukket | Analytics slettet | H | — |
| SA-01 | Lukket | Supabase-OAuth-flaten fjernet | H | — |
| SA-02, SA-03 | Lukket | Analytics slettet | H | — |

### 4.2 Gemini-sporet 18.09: AUT, DB, TFR, GFK, INT, FE, CFG, OBS, TST

Etterprøvd i [vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md).
Der den omklassifiserte et funn, gjelder omklassifiseringen.
BR-01 og DRF-01–DRF-03 er ført inn 23.09 fra
[kartleggingen av frontendens domeneregler](../kartlegging-domeneregler-frontend-2026-09-23.md),
fordi de hører til samme domenefamilie som TFR og GFK.

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AUT-01, AUT-02 | Lukket | Prosjektgrense i forseringens lesestier, 19.09 | H | — |
| AUT-03 | Lukket for batchruta | Batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH` før skriving (`783c64d`). Den strenge `xfail`, som forventet 201, er erstattet av en ordinær test: avvisningen skjer, og ingenting skrives, heller ikke `last_event_at` (T-1, 22.09). Påstanden gjelder bare batchruta | K 22.09, L | F0 |
| AUT-04 | Åpen | CSV-metadatalageret mangler `list_by_sakstype`. Samme mekanisme som TST-01 | Streng `xfail` (statisk) | H |
| AUT-05 | Åpen, lav | Kandidatliste for forsering uten prosjektfilter på Catenda-topics. Ikke kontrollert på nytt | H | F1 |
| AUT-06 | Lukket | `hent_relaterte_saker` krever `tillatte_saker` | H | — |
| DB-01 | Lukket | Repoet bygger basen fra tom (DA-01) | D 20.09 | — |
| DB-02 | Lukket | Kolonnene fantes i basen; migrasjonene rettet | D 20.09 | — |
| DB-03 | Lukket | `DEFAULT 'oslobygg'` droppet (`20260920053427`). Katalogtest i `tests/test_database/` erstatter reproduksjonen som leste en slettet fil (T-2, 22.09) | K 22.09 (PG 17 lokalt), D 22.09 | — |
| DB-04 | Delvis | `prosjekt_id` lagt til (5a). Fremmednøkler mangler fortsatt i migrasjonskjeden. Testen leser bare den første fila (T-2) | L 22.09 | B-01, F2 |
| DB-05 | Åpen, besluttet | `viewer` skal finnes. Ikke bygget | Streng `xfail` (statisk) | F1 |
| DB-06 | Lukket | `prosjekt_id` på journalen (5a) | D 20.09 | — |
| DB-07 | Lukket | `properties jsonb` på `sak_bim_links` finnes i basen og bygges av `20260920160000`. Katalogtest i `tests/test_database/` erstatter reproduksjonen som bare leste `20260911073800` (T-2, 22.09). Testinventaret førte funnet som DB-06 | K 22.09 (PG 17 lokalt), D 22.09 | — |
| DB-08 | Bortfalt | Viewene finnes ikke | D 19.09 | — |
| TFR-01 | Lukket | `AVSLATT_AKSEPTERT`, 19.09 | H | — |
| TFR-02 | Lukket | `overordnet_status` ga `INGEN_AKTIVE_SPOR` for forsering og EO. Testinventarets FR-01. **Merknad 2026-09-23:** statusene er besluttet av oppdragsgiver. Forsering får aldri en lukket status, fordi TE kan oppdatere kostnader og stoppe etter BHs svar: ikke varslet `UTKAST`, varslet `VENTER_PAA_SVAR`, avslått `UNDER_FORHANDLING`, akseptert eller stoppet `UNDER_BEHANDLING`. En EO er en ordre og forhandles ikke; uenighet føres i en KOE: `UTKAST`; utstedt og revidert `VENTER_PAA_SVAR`; akseptert og bestridt `LUKKET`. EO-hendelsene er unntatt fra sperren for lukkede saker. Ingen nye statusverdier | K 23.09 | — |
| TFR-03 | Lukket | Tilbaketrekking ble blokkert ved subsidiær enighet. Testinventarets FR-02. **Merknad 2026-09-23:** rettet for vederlag og frist. Et krav som bare er godkjent subsidiært (`er_subsidiaert_*`), kan trekkes til TE har godtatt svaret; da er det oppgjort. Reproduksjonen er ordinær test, med to nye for frist og for sperren etter aksept | K 23.09 | — |
| TFR-04 | Lukket | 0 og 0,0 ble forkastet som falsy. Testinventarets FR-03. **Merknad 2026-09-23:** rettet ved at `_copy_fields_if_present` bare hopper over `None`; parameteren `require_truthy` er fjernet. Den strenge `xfail` er gjort om til ordinær test med uendrede assertions | K 23.09 | — |
| TFR-05 | Lukket | Godkjent grunnlag ble rapportert som `UTKAST`. Testinventarets FR-04. **Merknad 2026-09-23:** oppdragsgiver valgte `UNDER_BEHANDLING` for en sak der BH har avgjort minst ett spor og resten ikke er sendt. `UTKAST` gjelder bare når ingenting er avgjort. To ordinære tester som låste `UTKAST` (`test_not_omforent_with_utkast_tracks` og `test_sak_oppgjort_ved_godtatt_avslag_rapporteres_ikke_som_ukjent`), er endret etter beslutningen. Et trukket grunnlag med resten i utkast gir fortsatt `UTKAST` (sidefunn i gjennomføringsnotatet) | K 23.09 | — |
| TFR-06 | Åpen, lav | Respons på uspesifisert fristvarsel. **Merknad 2026-09-23:** reprodusert: BH kan godkjenne 10 dager på et nøytralt varsel uten krevde dager, og sporet blir `GODKJENT`. Ikke rettet, fordi en sperre må slippe gjennom innsigelse mot sen varsling (§ 5) og forespørselen (§ 33.6.2, DRF-01), og hvordan de registreres er ikke avgjort | Streng `xfail`, K 23.09 | D |
| GFK-01 | Lukket med restanse | Gulvet verdsetter fristdager. Uten kjent sats er gulvet 0 (B-06) | H | D |
| GFK-02 | Lukket | `exposure()` ignorerte `ny_sluttdato`. **Merknad 2026-09-23:** rettet i `approval_route`: en ny sluttdato i et fristsvar gir `amount=None`, krever hele kjeden, og kjeden må dekke det som lar seg verdsette (`minimum`), som for endringsordrer. Uten dagmulktssats er atferden uendret (B-06); testen påstår bare at ruten aldri blir kortere enn kjeden. Frontendens `calculateAuthority` speiler ikke dette, men skjemaet sender ikke `ny_sluttdato` | K 23.09 | — |
| GFK-03 | Duplikat | → RV-02 | — | F2 |
| GFK-04 | Avgrenset | Forsering er vedtatt utenfor godkjenningsflyten. Testen forventer støtte og feiler med `ValueError("Ugyldig vurderingstype.")`, i samsvar med avgrensningen. Ingen feilretting | K 22.09 | — |
| GFK-05 | Åpen | TE kan generere BH-brev som PDF | Streng `xfail`, K 22.09 | H |
| GFK-06 | Åpen, lav | Godkjent grunnlag alene verdsettes til 0 kr. **Merknad 2026-09-23:** reprodusert gjennom `ApprovalService`: en prosjektleder godkjenner ansvaret for et krav på 50 mill. alene, og pakken godkjennes ved innsending. Ikke rettet: hvordan en slik godkjenning skal verdsettes, er en fullmaktsbeslutning for byggherren | Streng `xfail`, K 23.09 | D |
| BR-01 | Åpen, middels | BHs `beregnings_resultat` lagres som sendt, også når vurderingene i samme svar gir et annet resultat. Sporstatus, `overordnet_status` og `kan_utstede_eo` følger konklusjonen: et fristsvar uten fremdriftshindring (§ 33.1) og et vederlagssvar med 0 kr, begge merket «godkjent», ga `GODKJENT`, `OMFORENT` og utstedbar EO. Reprodusert gjennom `/api/events` og godkjenningsflyten, med kontrollsak. Rettes etter B-13 | Streng `xfail` ×4, K 23.09 | D |
| DRF-01 | Åpen, middels | BHs forespørsel etter § 33.6.2 kan ikke sendes fra skjemaet. Frontenden sender `send_foresporsel`, modellen kjenner bare `har_bh_foresporsel`, og validatoren avviser svaret med 400. Må løses sammen med TFR-06 og en avklaring av hvordan forespørselen registreres | Streng `xfail`, K 23.09 | D |
| DRF-02 | Åpen, lav | Felt med rettslig innhold fjernes uten feil ved parsing: `dager_siden_varsel` (§ 32.3), `ep_justering_varslet_i_tide` (§ 34.3.3), `er_svar_pa_foresporsel` (§ 33.6.2). Latent: skjemaene fyller dem ikke i dag | K 23.09 (parser), L | D |
| DRF-03 | Åpen, middels | TEs varsel om justerte enhetspriser (§ 34.3.3) lagres med `dato_sendt` lik oppdagelsesdatoen, ikke sendedatoen | L 23.09 | D |
| INT-01 | Åpen | Webhookhemmelighet uten konstant tid; sti i logg | Streng `xfail` (statisk) | H |
| INT-02 | Åpen, høy | Webhookfeil gir 200 og reservert duplikatnøkkel; retry tapes | Streng `xfail`, K 22.09 | F3 |
| INT-03 | Åpen | Validatoren avviser `bcf.*` | Streng `xfail`, K 22.09 | F3 |
| INT-04 | Lukket | Siden utledes av lagmedlemskap | H | — |
| INT-05 | Duplikat | → RV-10 | — | F3 |
| INT-06 | Åpen | Global `.env` overstyrer sakens Catenda-prosjekt | Streng `xfail`, K 22.09 | F2, F3 |
| INT-07 | Lukket | Kommentargeneratoren kjente ikke `standard`. **Merknad 2026-09-23:** oppslagene er nøklet på `SaksType`, og `koe` er fjernet; ingen kaller sender det. Reproduksjonen er ordinær test, og forsering og endringsordre er dekket. Samme nøkkel står i tittelen i `reportlab_pdf_generator`, men der gir reserveteksten nesten samme tittel | K 23.09 | — |
| FE-01 | Lukket | `LetterPreviewModal` sender prosjekt, CSRF og credentials (20.09) | H | — |
| FE-02 | Åpen, middels | `/api/cases/<sak_id>/context` gir ikke autorisert rolle. Serveren holder (19.09). Testen som testinventaret førte som FE-01, feilet på 403 i sitt eget oppsett. Oppsettet er rettet (T-3, 22.09); den strenge `xfail` feiler nå på målassertionen om rolle | K 22.09 (testoppsett) | H |
| FE-03 | Åpen | Svelte-skjemafelt reagerer ikke på nye props | H | H |
| FE-04 | Lukket | Med GFK-01 | H | — |
| FE-05 | Lukket | `activeProjectId` er `null` ved ukjent prosjekt (20.09) | H | — |
| FE-06 | Inkonklusiv | Påstand om interpolering i `LetterHtmlPreview.svelte` er verken bekreftet eller avkreftet | H | H |
| CFG-01 | Åpen | Flask starter i produksjon med standardnøkkel | Streng `xfail`, K 22.09 | H |
| CFG-02 | Åpen | `CSRF_SECRET` brukes ikke. Testinventaret førte som CFG-03 | Streng `xfail` (statisk) | H |
| CFG-03 | Duplikat | → RV-13. Testinventaret førte som CFG-04 | Streng `xfail`, K 22.09 | H |
| CFG-04 | Åpen | Usatt `APP_ENV` gir ulik tolkning. Testinventaret førte som CFG-02 | Streng `xfail`, K 22.09 | H |
| CFG-05, CFG-06, CFG-07 | Åpen | Supabase-nøkler utenfor `Settings`; død `CORS_ORIGINS`; relativ `env_file` | Streng `xfail` | H |
| TS2-01 | Åpen, middels | Usatt `EVENT_STORE_BACKEND` gir JSON-lageret på lokal disk uten advarsel; metadata tilsvarende CSV. Banneret viser «csv». Ført inn 22.09 fra [TST-02-notatet](../gjennomforing-tst02-2026-09-22.md#ts2-01--json-lageret-er-standardverdien) | L 22.09 | H |
| OBS-01, OBS-02 | Åpen, høy | Ett funn (19.09): ingen forretningshendelse revisjonslogges, og 403-avvisninger når ikke feilhåndtereren | Streng `xfail`, K 22.09 | F1 |
| OBS-03 | Lukket | Latent: `ce_time` kuttet offset. **Merknad 2026-09-23:** reprodusert på enhetsnivå med `+02:00` og `-05:00` (den siste ga den ugyldige strengen `…-05:00Z`); ingen kjørested gir i dag annet enn UTC. Rettet med `astimezone(UTC)`, naiv tid regnes fortsatt som UTC. Aktuelt i F0b, der `timestamptz` kommer tilbake i øktens tidssone | K 23.09 | — |
| OBS-04 | Lukket | `ce_source` skriver `unknown` (20.09) | H | — |
| OBS-05 | Åpen | Hendelser mangler korrelasjons-ID. Testinventaret førte som OBS-04 | Streng `xfail` (statisk) | F1 |
| OBS-06 | Åpen | `X-Request-ID` uten validering; 32-bits server-ID. Testinventaret førte som OBS-01 | Streng `xfail`, K 22.09 | H |
| OBS-07 | Åpen | Rå unntakstekst ved `app.debug`. Samme familie som RV-13. Testinventaret førte som OBS-05 | Streng `xfail`, K 22.09 | H |
| TST-01 | Åpen | Samme mekanisme som AUT-04. Mangel på integrasjonstester dekkes i F0 | Streng `xfail` (statisk) | F0, H |
| TST-02 | Lukket | Samtidig opprettelse i `JsonFileEventRepository`, rettet 22.09: saksfilen skrives til en unik midlertidig fil og publiseres med `os.link`, som feiler når filen finnes. To samtidige opprettelser gir én sak og én `ConcurrencyError`, også når begge har passert eksistenssjekken eller skrevet ferdig. Gjelder bare JSON-lageret; Supabase-lageret er ikke kjørt. Samme sak som KR-15 | K 22.09, L | — |
| TST-03 | Duplikat | → AP-04 | — | F2 |
| TST-04 | Åpen | Ingen OpenAPI-kontrakt mellom frontend og backend | Streng `xfail` (statisk) | H |
| TST-05 | Åpen | EO-opprettelse svelger Catenda-feil uten outbox | Streng `xfail` (statisk) | F2 |
| TST-06 | Åpen | Reservelagrene avviker fra Supabase-lagrene | Streng `xfail` (statisk) | H |
| TST-07 | Åpen | 58 av 87 Svelte-komponenter uten test (tall fra 18.09) | Streng `xfail` (statisk) | H |

### 4.3 Arkitektur og database: AR, DA, MS

Kilder: [AR](../arkitekturvurdering-2026-09-19.md),
[DA](../audit-databasearkitektur-2026-09-20.md),
[MS](../design-maalskjema-database-2026-09-20.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AR-01 | Åpen, høy | Ingen policy uttrykker prosjekt-, side- eller teamgrense. Samme sak som DA-11 | D 20.09 | F1 |
| AR-02 | Åpen, høy | Journalen er ikke append-only i basen. → MS-02 | D 19.09 | F1 |
| AR-03 | Åpen, kritisk | Godkjenningspakker og andre lagre ligger i lokal SQLite på efemer disk | L 22.09 | F1, F2, F3 |
| AR-04 | Åpen | Domenemodellen finnes i Python og TypeScript | H | F4 |
| AR-05 | Lukket | CI med PostgreSQL 17-jobb (PR #33). Regelsettet `main` krever de fire jobbene, har ingen bypass og krever oppdatert gren (lest med GitHub-API-et 22.09) | K 22.09 | — |
| AR-06 | Duplikat | → AP-04 | — | F2 |
| AR-07 | Åpen, lav | Inert e-postpolicy på `project_memberships`. Fjernes med tabellen | D 20.09 | F1 |
| AR-08 | Åpen, lav | Seks av ni driftdetektorer feiler | H | H |
| DA-01, DA-02, DA-05, DA-06 | Lukket | 20.09 | D 20.09 | — |
| DA-03 | Lukket | Migrasjonsmappa er eneste kilde. Historikken avstemt 22.09: 23 rader, samme versjoner som filene; `db push --dry-run` er tom. Originalteksten til de slettede radene er arkivert | K 22.09 | — |
| DA-04 | Lukket i repo | Fila har basens versjon. Historikken inngår i DA-03 | D 20.09 | F0 |
| DA-07 | Korreksjon | `app_identities` er i bruk | D 20.09 | — |
| DA-08, DA-09 | Åpen | `user_groups` og `magic_links` fjernes. → MS-15 | D 20.09 | F1 |
| DA-10 | Åpen | `project_memberships` fjernes etter at `viewer` finnes i `app_project_memberships` | D 20.09 | F1 |
| DA-11 | Åpen, høy | → AR-01 | — | F1 |
| DA-12 | Lukket | Gjennomført som MS-01 | D 20.09 | — |
| DA-13 | Åpen | → B-01 | — | F2 |
| DA-14 | Åpen | `cached_*`-kolonnene → MS-06, MS-07 | — | F2 |
| DA-15 | Åpen, lav | BIM-flaten har ingen eier. P2 og P3 sier at den er relevant | — | F4 |
| MS-01 | Gjennomført | `hendelse` | D 20.09 | — |
| MS-02 | Åpen | Append-only håndhevet av basen, mot omskriving og uautorisert tilføying. Merk at `hendelse` og `notat` har fremmednøkkel til `sak_metadata` med `ON DELETE CASCADE`; kaskaden må inngå i rettighetsmodellen | L 22.09 | F1 |
| MS-03 | Delvis | `UNIQUE (sak_id, versjon)` finnes i migrasjonen. Regler for rebase ved konflikt mangler | L 22.09 | F2 |
| MS-04 | Gjennomført | `aktor_id` i journalen | D 20.09 | — |
| MS-05 | Gjennomført | `notat` utenfor journalen. Teamvern i datalaget gjenstår (AF-01) | D 21.09 | F1 |
| MS-06, MS-07 | Åpen | Register og projeksjon; én skriver i hendelsens transaksjon | L | F2 |
| MS-08 | Åpen | Revurderes (AF-03). → B-01 | — | F2 |
| MS-09 | Åpen | Erstattet som mål av AF-01 | — | F1 |
| MS-10 | Gjennomført | `projects.organisasjon_id NOT NULL` | D 20.09 | — |
| MS-11 | Åpen | Hash supplert av AF-04 | L | F2, F4 |
| MS-12 | Åpen | Prosjektkonfigurasjon inn i `projects`. Må ikke hindre frosset mål og konfigurasjonsversjon i F2 | — | F3 |
| MS-13, MS-14 | Åpen, lav | BIM som hendelser; IFC-egenskaper fryses | — | F4 |
| MS-15 | Åpen | `magic_links`, `user_groups`; `project_memberships` etter DB-05 | D 20.09 | F1 |

### 4.4 Målskjemarunden 21.09: KR, MG, RY

Kilder: [KR](../audit-korrekthet-2026-09-21.md),
[MG](../audit-maalskjema-gjennomgang-2026-09-21.md),
[RY](../audit-opprydding-2026-09-21.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| KR-01, KR-02, KR-03, KR-05 til KR-12 | Lukket | `bab9679` og påfølgende indeksmigrasjoner | H 21.09 | — |
| KR-04 | Åpen | `compute_state` gjør navneoppslag. → MG-01, AF-05 | L 22.09 | F2 |
| KR-13 | Åpen, lav | Backfill-skriptet. Faller med RY-01 | H | F4 |
| KR-14 | Avvist | Anvendt migrasjon er uforanderlig | H | — |
| KR-15 | Lukket | Samme sak som TST-02. Den ustabile strenge `xfail` er erstattet av en deterministisk reproduksjon (T-4), som ble XPASS da TST-02 ble rettet 22.09, og er gjort om til en ordinær test | H, K 22.09 | — |
| MG-01 | Åpen | Navneoppslag i beregningslaget. Oppslaget bruker `has_app_context()`, så fravær av HTTP-forespørsel betyr ikke fravær av oppslag | L 22.09 | F2 |
| MG-02 | Lukket | Én identitetsform i journalen | D 21.09 | — |
| MG-03 | Åpen | Forsvar i dybden: parseren avviser `event_id` og `tidsstempel`, ikke aktørfeltene. Eksisterende ruter overskriver aktørfeltene fra sesjonen, så klientforfalskning er ikke påvist | Streng `xfail`, K 22.09, L | F2 |
| MG-04 | Åpen, lav | `created_by` har tre verdiformer. → MS-06 | H | F2 |
| MG-05 | Åpen | `ownerName` fryses i godkjenningspakken. Lagre ID ved flytting til PostgreSQL | H | F1 |
| MG-06 | Lukket | Indeksen fra KR-11 (`20260921102148`). Fila sier at den er anvendt 21.09 | H, L | — |
| MG-07 | Lukket | Serverfilter og indeks fra KR-02 (`20260921093936`). Fila sier at den er anvendt 21.09 | H, L | — |
| MG-08 | Åpen, lav | Serielle navneoppslag. Faller med MG-01 | H | F2 |
| MG-09 | Regel | I `AGENTS.md` | — | — |
| RY-01 | Åpen | Oppslag som bør gå mot `sak_metadata`, ikke journalen; krever indeks på `catenda_topic_id` først. Tas når den støtter EO-flyten (AF-06) | H | F2 eller F4 |
| RY-02 til RY-07 | Åpen, lav | Paginering, buffer, N+1, oppslag, testdobbel, KR-09 mot identitet | H | F4 |

### 4.5 Dokumentfunn

RGK-01–06, RGK2-01–05, KONS-01–14 og RTB-01–05 gjelder planverket, ikke koden.
De er behandlet i denne redigeringen; se
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md).
KONS-02 og KONS-09 var allerede dekket av daterte merknader i delplanen og målskjemaet.

### 4.6 Foreløpige funn, ikke kontrollert

Registrert fra lesing uten kjøring. Statusen er «foreløpig» til funnet er
reprodusert eller avvist. Alvorlighet settes da.

| ID | Status | Funn | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| BR-01 | Reprodusert 23.09, flyttet til 4.2 | Se 4.2. Den opprinnelige påstanden (L 23.09) holdt. | K 23.09 | D |

### 4.7 Tellinger

Registeret har ingen samlet «antall åpne feil». Flere ID-er er samme rotårsak,
og antall tester er ikke antall feil. Fordelingen i testinventaret står i
redaksjonsprotokollen, med forklarte kategorier.

## 5. Arbeidspakker

<a id="nye-arbeidspakker-og-produksjonskrav"></a>
Rekkefølgen følger AF-06: verifikasjon mot ekte PostgreSQL, datalagets grenser
og én komplett EO-flyt før flere adaptere og generell opprydding. To parallelle
spor, D og H, kan gå samtidig når de ikke tar kapasitet fra F0–F2.
Organisatoriske avklaringer (F5) kan starte nå.

«Tester som beviser» er planlagt kontroll. Ingenting her er utført uten at
det står.

> **Merknad 2026-09-23 til avsnitt 5:** F0b er ny og kommer mellom F0 og F1.
> Den følger av beslutningen om direkte tilkobling (3.1). Pakkene er ikke
> omnummerert, fordi F1–F5 er referert fra mange dokumenter.

### F0 — Verifikasjonsgrunnlag

**Avhenger av:** ingenting. **Status:** delvis. CI kjører backend, frontend,
typesjekk og lint (19.09). Migrasjonene er bygd mot tom PostgreSQL manuelt
(PG16 20.–21.09, PG18 22.09; historisk).

> **Merknad 2026-09-22 (F0, punkt 1):** CI-jobben `database` bygger basen fra
> tom på PostgreSQL 17 med plattformstubben og kjører katalogtestene i
> `backend/tests/test_database/` (merket `database`, styrt av
> `KOE_TESTBASE_URL`). Kjørt lokalt mot PG 17.11 og observert grønn i CI
> (PR #33, 22.09). T-2 er gjort for DB-03 og DB-07, T-5 er gjort. Punkt 3
> (DA-03) og punkt 2 (påkrevde sjekker, AR-05) er gjort 22.09. Gjenstår:
> T-1, T-3, T-4 og DB-04s fremmednøkler (B-01).
> Rolletesten bruker `SET ROLE anon/authenticated`; en test som logger inn som
> ikke-privilegert rolle, venter på B-02. Se
> [gjennomføringsnotatet](../gjennomforing-f0-postgresql-ci-2026-09-22.md).
>
> **Merknad 2026-09-22 (F0, punkt 4: T-1, T-3, T-4):** T-1 er gjort: den
> strenge `xfail` for AUT-03 er erstattet av en ordinær test som viser at
> batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH`, og at
> verken journal, notatlager eller `last_event_at` skrives. T-3 er gjort:
> FE-02-testen har gyldig sesjon og saken i prosjektet, og feiler nå på
> målassertionen om rolle. T-4 er gjort: kappløpet i
> `JsonFileEventRepository` er reprodusert deterministisk ved
> eksistenssjekken, med reell lagring og `strict=True`. Den ustabile testen
> og testen fra 22.09 (RTB-02) er erstattet, så TST-02 gir ingen tilfeldig rød
> port. Anbefalingen i 3.3 om TST-02 er dermed fulgt. Funnene FE-02, TST-02 og
> KR-15 er fortsatt åpne. Gjenstår i F0: DB-04s fremmednøkler (B-01). Se
> [notatet](../gjennomforing-f0-testvedlikehold-2026-09-22.md).
>
> **Merknad 2026-09-22 (TST-02 rettet):** `JsonFileEventRepository`
> publiserer en ny saksfil med `os.link` framfor `rename`, og TST-02 og KR-15
> er lukket. T-4-reproduksjonen ble XPASS og er gjort om til en ordinær test,
> med en test til for flettingen der begge skriverne har skrevet ferdig. Se
> [notatet](../gjennomforing-tst02-2026-09-22.md).

**Leveranse:**

1. En CI-jobb som bygger alle migrasjoner mot tom PostgreSQL 17 (målversjonen
   i `supabase/config.toml`) med plattformstubben fra `AGENTS.md`, og kjører
   databasetester mot den. Stubben dokumenterer hvilke rettigheter som kommer
   fra plattformen.
2. Påkrevde sjekker på `main` i GitHub-innstillingene.
3. Avstemt migrasjonshistorikk i basen (DA-03), og en dokumentert vei fra fil
   til base.
4. Testvedlikehold, uten å svekke noen assertion:
   - **T-1** AUT-03: erstatt reproduksjonen med datert begrunnelse, slik FE-01
     ble erstattet 20.09. Den ordinære avvisningstesten finnes.
   - **T-2** DB-03, DB-04, DB-07: katalogtester mot PostgreSQL i stedet for
     tekstsøk i enkeltfiler. DB-04s tester for fremmednøkler venter på B-01.
   - **T-3** FE-02: gyldig sesjon i testoppsettet, så målassertionen nås.
   - **T-4** KR-15/TST-02: deterministisk reproduksjon ved eksistenssjekken, med
     reell lagring. Behold `strict=True` til den finnes.
   - **T-5** RV-17: `raises=` på AP-04-testen.

**Akseptkriterier:** jobben bygger basen fra tom og feiler ved en migrasjon som
sorterer feil; minst én test kjører mot ekte PostgreSQL med en ikke-privilegert
rolle; autorisasjon er ikke globalt mocket bort i disse testene; live-tester er
fortsatt eksplisitt adskilt; ingen tilfeldig rød port fra TST-02; basens
historikk og mappa stemmer.

**Tester som beviser:** katalogtestene i T-2; en test som viser at
`anon` og `authenticated` ikke leser tabeller eller kjører funksjoner.

### F0b — Datalaget over direkte tilkobling

**Avhenger av:** F0-jobben og beslutningen i 3.1 (23.09). Containerdelen
avhenger av B-12. **Status:** ikke påbegynt.

F0b bytter veien fra backend til basen, ikke rettighetene. Før F1-rollene
finnes, kobler backend til med de rettighetene den har i dag. Det er ikke en
produksjonstilstand; F1 og produksjonsporten gjelder uendret.

**Leveranse:**

1. **Kjernen:** `lib/db` med pool og en `transaksjon(kontekst)`-hjelper som
   setter rolle og krav transaksjonslokalt (`SET LOCAL ROLE`,
   `set_config(..., true)`) inne i en eksplisitt transaksjon. Miljøvalg med
   `DATABASE_URL`. Lokal oppstart med `scripts/testbase/bygg_testbase.sh`, som
   skript eller Docker Compose. En skrivbar testfixture ved siden av den
   lesende. Feilklassifisering for driveren: en avvisning som aldri kan lykkes,
   er `PermanentError`; versjonskonflikt får en egen SQLSTATE og prøves ikke
   blindt på nytt. Kjernen definerer `core/container.py` og testfixturene
   ferdig, fordi det er der trådene i punkt 2 ellers kolliderer.
2. **Repositoriene** bak dagens grensesnitt, med tester mot ekte PostgreSQL:
   (a) hendelse og notat, (b) saksmetadata, relasjoner og BIM, (c) identitet,
   sesjoner, medlemskap og prosjekter, med de fire funksjonene
   `koe_resolve_identity`, `koe_reconcile_memberships`, `koe_register_project`
   og `koe_set_contract_teams` kalt med vanlig SQL, (d) Catenda-konfigurasjon.
3. **TS2-02:** JSON-, CSV- og Supabase-lagrene og testdoblene som speiler
   Supabase-klienten, ut av kjøretidsstien, når alle repositoriene er inne.
4. **Container:** Dockerfile for backend og GitHub Actions for utrulling, når
   B-12 er avklart.
5. Migrasjonene forutsetter plattformrollene og skjemaet `auth` fra
   plattformstubben. Det må løses før de kan anvendes utenfor Supabase (B-12).

**Akseptkriterier:** samme kode virker lokalt, i CI og mot målplattformen;
ingen modul i kjøretidsstien importerer `supabase`; hver repositoriemetode
har en test mot ekte PostgreSQL i CI; en feil midt i en transaksjon etterlater
ingen delvise skrivinger; kontekst fra én forespørsel finnes ikke på en
gjenbrukt forbindelse etter commit eller rollback, og en variabel som har vært
satt, leses som tom, ikke som `NULL`.

**Kontroll:** kjernen får uavhengig review i en egen tråd før repositoriene
bygges på den. Repositoriene får tester og `/code-review` per PR, og
`/simplify` samlet når alle er inne. `/simplify` skal la
sikkerhetskontrollene stå: `SET LOCAL` og transaksjonslokal kontekst,
`nullif(..., '')`, fail-closed-kontroller som ser dobbelte ut, eksplisitte
`REVOKE`-er og like svar for «ukjent» og «ikke tilgang». Oppsettet står i
[handoffen 23.09](../handoff-2026-09-23-datalag-postgresql.md), avsnitt 7.

**Tester som beviser:** repositorietestene mot PostgreSQL i CI; en test med
pool på én forbindelse som viser at kontekst ikke lekker; en test per
feilklasse i driveren.

### F1 — Sikkerhetsgrenser i datalaget og private lagre

**Avhenger av:** F0-jobben og F0b; B-02 før rolle- og policymigrasjoner; B-04
for tilbakekallingsdelen. Før neste migrasjon for målmodellen må tilgangs- og
skriverettigheter være konkretisert. Runtime bygges ikke på ubegrenset
`service_role`.

**Leveranse:**

1. Samlet design for roller (runtime, worker, drift, migrering, break-glass),
   identitetskontekst og databasefunksjoner, med uavhengig review (AF-01,
   AF-02, B-02). Rettigheter er eksplisitte per rolle i migrasjonene, også for
   de åtte tabellene som i dag lever på plattformens standardrettigheter.
2. Godkjenningspakker, policyversjon og utkast flyttet fra SQLite til
   PostgreSQL med prosjekt, side og team. MG-05: pakken lagrer ID, ikke navn.
3. Teamvern i datalaget for `notat`, utkast og godkjenningspakker. Et autorisert
   leselag skiller offentlig innhold, teaminterne notater og private pakker før
   aggregering, eksport og PDF. Grensesnitt, nedlasting og driftsvisning følger
   samme regler.
4. Append-only for `hendelse` (MS-02), inkludert vurdering av kaskaden fra
   `sak_metadata`.
5. `viewer` i `app_project_memberships` (DB-05). Deretter fjernes
   `project_memberships`, `user_groups` og `magic_links` (MS-15, AR-07).
6. Tilgangslogg for sensitive lesinger, eksport og endringer i fullmakt og
   prosjekttilgang (OBS-01/02, OBS-05). Ingen tokens eller brevtekst i
   standardlogger.
7. Tilbakekalling etter B-04.
8. Hemmelighetslager og rotasjon.

**Akseptkriterier:** med de faktiske runtime-rettighetene gir en direkte
spørring med prosjekt A i konteksten null rader fra prosjekt B, utenom API-et
(egenskap, ikke eksempel). Det samme gjelder motpart, to team på samme side,
ukjent team, manglende kontekst og gjettet ressurs-ID. Gjenbrukt forbindelse
tar ikke med kontekst til neste forespørsel. Runtime kan ikke `UPDATE`,
`DELETE`, `TRUNCATE` eller skrive direkte til `hendelse`. De private lagrene
ligger i PostgreSQL. Migrering og break-glass er separat, tidsavgrenset og logget.

**Tester som beviser:** negative tester mot ekte PostgreSQL per scenario over;
rettighetstester for hver rolle; en test som viser at runtime-innloggingen ikke
kan `SET ROLE` til `service_role` eller eieren (T2); Data API-test for `anon` og
anonymt innlogget `authenticated` så lenge basen ligger hos Supabase (B-12).

### F2 — Én komplett EO-flyt med minimal worker

**Avhenger av:** F0b og F1-rollene; B-01 for KOE-tilknytning og relasjoner; B-08
for reservasjonen; B-03 for dokumentoperasjonen; B-07 for drivmekanismen; B-10
for kompatibilitetskravet.

**Leveranse:** Kontrakten i
[transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md) er normativ.
Testkravene fastsettes før implementering, og én ansvarlig beholder oversikten
over transaksjonsgrensene. En grønn suite erstatter ikke dokumentasjon av hva
som er testet. Kort:

1. `commit_eo_approval` som én databasekommando i én transaksjon over direkte
   tilkobling (3.1, endret 23.09 fra «én RPC»): kommandokvittering kontrolleres
   under lås; policy, pakke og saksstrømmer låses i dokumentert rekkefølge;
   pakkeversjon, godkjenner, fullmakt, policyversjon og frosset innhold
   kontrolleres (RV-02, RV-19, RV-20); EO-nummer og KOE-tilknytning reserveres;
   hendelser, metadata, relasjoner, vedleggsbinding, pakkestatus, outbox og
   kvittering skrives samlet. Ingen kompensasjonssletting (AP-04, TST-05).
2. Vedleggstabell med hash, dokumentversjon og karantenestatus. Skanning før
   frigivelse. Staging med opprydding av foreldreløse filer.
3. Minimal worker: `SKIP LOCKED` i kort transaksjon, lease-token, backoff med
   jitter, `USIKKERT_UTFALL`, én strategi per ekstern operasjon (avsnitt 7).
   Frosset prosjekt, board og konfigurasjonsversjon (INT-06 for EO).
4. Ren projeksjon: navneoppslag ut av `compute_state` (KR-04, MG-01, MG-08).
   Register og projeksjon (MS-06, MS-07, MG-04). Rebase-regler (MS-03).
5. Parsegrensen avviser alle fem serverfelt (MG-03), med ruter og
   `approval_service` endret samtidig.
6. Ny skrivesti bak eksplisitt konfigurasjon, én autoritativ sti per prosjekt.
   Den gamle kompenserende stien stenges når den nye er aktiv.

**Akseptkriterier:** transaksjonsplanens akseptansetester 1–6 er grønne mot
ekte PostgreSQL med uavhengige forbindelser og feilinjeksjon ved hver
skrivegrense. I tillegg: identisk retry gir samme kvittering; endret innhold
med samme ID avvises; to ulike kommandoer gir én commit og én konflikt; gammel
worker som fortsatt lever, kan ikke kvittere etter utløpt lease; en ny worker
parkerer ved uavklart ekstern effekt; privat data avvises ved opprettelse av
jobb; gamle hendelser leses av ny kode, og tilbakerulling gjør ikke nye
hendelser uleselige; historiske teststrømmer gir samme tilstand uten Flask,
database eller nett. AP-04 regnes ikke som løst med lengre lease.

**Tester som beviser:** AP-04- og RV-02-reproduksjonene blir XPASS og gjøres
om til ordinære tester; nye PostgreSQL-tester for samtidighet og feilpunkter;
lokale feiltester for Catenda i avsnitt 7.

### F3 — Øvrige adaptere og drift

**Avhenger av:** F2 grønn. Utvid én adapter om gangen.

**Leveranse:** BH-svar og ordinære hendelser, inkludert batchruta (RV-10), til
samme kommandomønster. Varig webhook-inbox med dedupe før kvittering og
behandling i samme transaksjon som lokale hendelser (RV-12, INT-02, INT-03).
Skill ekko fra egne kall fra nye endringer. Avvikle `vedlegg_registry` når alle
flyter bruker vedleggstabellen, og `catenda_delivery_status` når alle
leveringsveier bruker outbox. Delt rate limiting på tvers av instanser
(`RATE_LIMIT_STORAGE=memory://` gir N ganger grensen og nullstilles ved
kaldstart) og håndtering av kvoteavslag fra Catenda. Mål ende-til-ende før en
eventuell medlemskapscache; en slik cache krever tilbakekallingsfrist (B-04).
Avstemming mot Catenda for usikre utfall. Aktiv varsling for eldste ventende jobb
og usikre utfall, med mottaker og testet prosedyre. Dead-letter-innsyn og
manuell retry med tilgang og logg. MS-12.

**Akseptkriterier:** ingen støttet formell innsendingsvei mangler varig
leveringsintensjon; leveranser gjenopptas uten brukerhandling; SQLite-lagrene er
avviklet; alarmer er testet. Kapasitetskriteriene fastsettes etter B-09.

### F4 — Domene, bevis og bevaring

**Avhenger av:** F2 for eksport av leveringshistorikk; B-05 og B-11.

**Leveranse:** eksport av én sak med hendelser, tidsstempler, aktør,
dokumentversjoner, hash og leveringskvitteringer, lesbar uten appen, med
uttrekkstidspunkt og hvem som hentet ut. Tidskilde (B-11). Bevarings- og
sletteregler for filer, logger og backup (B-05). Uavhengig integritetsbevis
vurdert ut fra trusselmodellen. Revisjon av fullmakts- og prosjektendringer.
AR-04. Universell utforming: kravnivå avklart mot forskriften, advarslene
rettet eller begrunnet, og `svelte-check` gater på a11y. RY-01 til RY-07, KR-13. BIM (DA-15, MS-13, MS-14) når det prioriteres.

**Akseptkriterier:** en sak kan framlegges uten at appen kjører; manglende fil
og ubekreftet levering framgår uttrykkelig; gjenoppretting utløser ikke blind
ny levering; det er besluttet hva som skjer når motparten bestrider systemets
egen framstilling.

### F5 — Produksjonsport

Kan starte nå. Første oppgave er å bekrefte om prosessene allerede finnes, og
i så fall erstatte punktet med en referanse. Status er ikke innhentet for noen.

- ROS-analyse.
- DPIA, forankret av behandlingsansvarlig med råd fra personvernombudet.
  Faktagrunnlaget finnes ([faktagrunnlag for DPIA](../personopplysninger-faktagrunnlag-2026-09-19.md)).
- Ekstern sikkerhetsvurdering. «Uavhengig sluttaudit» i denne planen betyr en
  annen agent enn implementøren, ikke en tredjepart.
- Hendelseshåndtering med ansvarlig, også for påstått tapt varsel med frist.
- Catenda: skriftlig svar på hva som skjer med løpende frister når Catenda er
  utilgjengelig, og om et varsel kan sendes med rettsvirkning da; håndtering av
  tapt eller slettet prosjekt og utløpt lisens; avhengigheten akseptert som
  risiko med ansvarlig, eller redusert.
- Restore-øvelse av hendelser, godkjenninger, utkast, filer og køer, med
  dokumentert RPO og RTO, uten blind ny levering.
- Isolert staging med eget Catenda-testprosjekt.
- Konfigurasjon utenfor koden: policy med `user_id` (RV-03), Supabase-konsollet
  (RV-06) så lenge Supabase er plattformen, eller tilsvarende på Azure (B-12),
  produksjonshemmeligheter (CFG-01).
- Uavhengig sluttaudit av F2 og F3: samtidige forsøk, utløpte leases, mistede
  eksterne svar.

### Spor D — domenefeil

Kan gå parallelt. Hver retting får regresjonstest og holdes innenfor sitt
funn. TFR-02 til TFR-06, GFK-02, GFK-06, INT-07, OBS-03, BR-01 (reprodusert
23.09, rettes etter B-13), DRF-01–DRF-03, og restansen på
GFK-01 når B-06 er avgjort. DRF-01 og TFR-06 må løses sammen: en sperre mot
BH-svar på et nøytralt varsel må slippe forespørselen etter § 33.6.2 gjennom. Deretter systematisk gjennomgang av
tilstandsovergangene mot NS 8407, med dokumentert forventet overgang og test
per hendelsestype. Utvides `SporStatus`, gjelder regelen i `AGENTS.md` om å
lete opp alt som teller statuser.

### Spor H — herding og konfigurasjon

Små, uavhengige rettinger. De er krav før produksjon, men ikke forutsetning
for F0–F2: RV-13 med CFG-03 og OBS-07; RV-14; CFG-01, CFG-02, CFG-04 til
CFG-07; TS2-01; OBS-06; INT-01; GFK-05; FE-02, FE-03 og FE-06; AUT-04 og TST-01;
TST-04, TST-06, TST-07; AR-08. I tillegg: pinning av Python-avhengigheter og
sårbarhetsskanning i CI med en besluttet terskel for hva som blokkerer;
HTTP-herding (CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`) testet mot
brevvisningen; lagringsfeil presenteres ikke som null krav eller komplett
statistikk.

### Rotårsakene

De tolv rotårsakene i
[vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md#del-3-tolv-rotårsaker)
dekkes slik: RC-1 og RC-6 i F1; RC-2 lukket 20.09; RC-3 lukket i repo 20.09,
med PostgreSQL-verifikasjon i F0; RC-4 i F2; RC-5 og RC-8 i spor D; RC-7 og
RC-10 i spor H; RC-9 i F3 og spor H; RC-11 lukket med FE-01 og FE-05; RC-12 i F4.

## 6. Neste gjennomførbare oppgave

> **Merknad 2026-09-23 til avsnitt 6:** Forrige neste oppgave, F0 punkt 1
> (PostgreSQL 17 i CI), er gjort 22.09 (PR #33), og det samme er T-1 til T-5,
> utenom DB-04s fremmednøkler (B-01).
> Neste oppgave er nå F0b, etter beslutningen om direkte tilkobling (3.1).

**Start med F0b, punkt 1: kjernen.** Den avgjør formen på alt som kommer etter,
og er det eneste i F0b som ikke bør deles mellom tråder. Den krever ingen ny
beslutning.

1. `lib/db` med pool, `transaksjon(kontekst)`, miljøvalg og feilklassifisering,
   med lokal oppstart og skrivbar testfixture.
2. Uavhengig review av kjernen i en egen tråd.
3. Deretter repositoriene, ett eller to per tråd, parallelt. TS2-02 når alle er
   inne.

Oppdragene står i [oppdraget for kjernen](../prompt-f0b-kjernen-2026-09-23.md)
og [oppdraget for reviewet](../prompt-review-f0b-kjernen-2026-09-23.md).

[Prototype v2](../vedlegg/b02-prototype-v2-2026-09-23/kjor.sh) viser
konteksthåndteringen over direkte innlogging og kan brukes som mønster, ikke
som kode. Parallelt kan spor D gå (BR-01 reprodusert 23.09), og
containerdelen av F0b når IKT har svart (B-12). Beslutningene F1 trengte, ble
tatt 23.09 (B-02 og B-04 i 3.1). F1-migrasjonene venter på det uavhengige
reviewet og RK-05.

**Beslutninger som blokkerer senere arbeid:**

| Beslutning | Må være tatt før |
| --- | --- |
| B-12 plattform og hosting | Container og utrulling i F0b, veien fra migrasjonsfil til base, plattformkonfigurasjon i F5 |
| B-01 relasjoner, B-08 KOE-eksklusivitet | Reservasjonsskjemaet i F2 |
| B-03 dokumentmodell | Dokumentoperasjonen i F2-workeren |
| B-07 drivmekanisme, B-10 versjonering | Minimal worker og kompatibilitetskravet i F2 |
| B-09 driftsverdier | Akseptkriteriene for kapasitet og varsling i F3, og grensene for utdatert medlemsliste (B-04) |
| B-05 bevaring, B-11 tidskilde | Eksport og bevaring i F4, og produksjonsporten |
| B-06 fullmakt uten sats | Restansen på GFK-01 |
| B-13 sannhetskilde for reglene | Rettingen av BR-01 og kommandoene i F2 som bygger på resultatene |

## 7. Catenda: leveringsgarantier

Tidligere levende tester er **historiske resultater** fra 3. september 2026,
dokumentert i [Catenda-dataflyten, avsnitt 10](../catenda-dataflyt.md#10-tester-før-produksjonsimplementasjon).
Kontraktskriptet er
[`test_catenda_api_contracts_live.py`](../../backend/scripts/test_catenda_api_contracts_live.py);
mock-kontraktene ligger i
[`test_catenda_mutation_contracts.py`](../../backend/tests/test_integrations/test_catenda_mutation_contracts.py).
Ingen levende test er kjørt i denne redigeringen. Den lokale OpenAPI i
`docs/tredjepart-api/` er et snapshot, ikke en garanti for tjenesten.

| Operasjon | Tidligere dokumentert | Ny garanti som trengs | Mangler verifikasjon | Ved usikkerhet |
| --- | --- | --- | --- | --- |
| `createTopic` | Opprettelse og sletting i testprosjektet. OpenAPI har valgfritt `guid` i body; klienten sender det ikke | Gjenfinning etter tapt svar | Utfall av gjentatt eller samtidig POST med samme GUID, og samme GUID med annet innhold | Parker som `USIKKERT_UTFALL`. Ny POST bare om strategien sier at et negativt oppslag er nok |
| `createComment` | OpenAPI har valgfritt `guid`, og `getComment` finnes. Klienten sender bare tekst | Ingen duplikat ved retry | Som over. Catenda dokumenterer ingen idempotensheader for kommentarer | Let etter deterministisk markør med `getComments` før ny POST; ellers parker |
| `createLibraryItem` (opplasting) | Samme navn med `failOnDocumentExists=false` ga samme item og én ny revisjon; unikt navn ga nytt item; revisjonsnavnet stemmer. Klienten sender parameterne i headeren `Bimsync-Params`, ikke via en `upload_url` | Samme dokument ved retry; ingen ekstra revisjon | Konfliktsvaret ved `true` er ikke observert. OpenAPI oppgir statuskoden som «25 CONFLICT» | Avhenger av B-03. Uten sikker gjenfinning: parker, ingen ny opplasting |
| `createDocumentReference` | Opprettet, lest og slettet. Respons som liste normaliseres. Topic API krever bindestrek-UUID for `document_guid` | Én referanse per dokument og topic | Referansens eget `guid` ved gjentakelse | List med `getDocumentReferences` og match på `document_guid`; ellers parker |
| `updateTopic` (status) | GET med `$select` og PUT av tillatte felt bevarer feltene testboardet har | Eldre jobb overstyrer ikke nyere ønsket status | Priority og stage i et board som har dem | Kontroller ønsket revisjon før skriving; ved feil i GET, retry med backoff |
| Relaterte topics | Additiv og toveis i samme board. På tvers av board: HTTP 500 | Ingen | Avklaring med Catenda om kryss-board | Relasjon på tvers av board lagres bare internt |
| Webhook-mottak | Første levering 200, gjentatt levering 202 uten duplikate sideeffekter | Varig inbox før kvittering | Catendas retry ved 500 og timeout, gjenbruk av event-ID | Lagre før kvittering; 503 bare når mottaket ikke kunne lagres |

At et GUID-felt finnes, beviser ikke idempotent opprettelse. Et oppslag uten
treff beviser heller ikke at en gammel workers kall ikke fullføres senere.

**Implementeringsoppgaver (planlagt):**

- **Lokale feiltester i F2:** commit og omstart; tapt HTTP-svar etter mulig
  ekstern commit; utløpt lease; forsinket gammel worker som fortsatt lever;
  retry uten dupliserte domenehendelser eller ugyldige kvitteringer. De
  verifiserer parkeringen, ikke Catendas garantier.
- **Smale levende kontrakttester, bare der valgt strategi avhenger av dem:**
  gjentatt opprettelse med samme klientvalgte GUID; gjenfinning etter tapt
  svar; konfliktsvar ved `failOnDocumentExists=true`. Kjøres mot
  testprosjektet med opprydding, som tidligere.
- **Andre prosjekt og webhook-retry:** punkt 2 og 3 i Catenda-dataflytens
  avsnitt 10 står fortsatt åpne.

## 8. Vedlikehold av planen

- Status endres bare her, med dato og belegg. Andre dokumenter får en datert
  merknad som viser hit.
- Et nytt funn får ID i sitt eget dokument og en linje i avsnitt 4.
- En beslutning flyttes fra 3.4 til 3.1 med dato og hvem som besluttet.
- En xfail som blir XPASS gjøres om til ordinær test, og registeret oppdateres.

## Verifikasjon og grenser

Redigeringen er dokumentarbeid. Kontrollene er beskrevet i
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md).

**Lest nå (22.09):** funnkilder og testfilenes egne ID-er for hver rad i
testinventaret; `xfail`-dekoratørene med AST; migrasjonsfilene for
`sak_relations`, `sak_bim_links` og indeksene; Catenda-klientens opplasting og
opprettelse; de nevnte OpenAPI-operasjonene.

**Historisk dokumentert:** alt merket D eller H, testkjøringene fra 22.09
(merket K 22.09, kjørt av testrevisjonen og reviewene), og levende
Catenda-tester fra 3. september.

**Ikke kontrollert nå:** den levende databasekatalogen, full testsuite,
levende Catenda-atferd, organisatoriske prosesser og rettslige krav.
Funn fra auditene 14.–16.09 som ikke har vært ført i denne planen, er ikke
registrert på nytt enkeltvis.

**Endringen 23.09** er dokumentarbeid: oppdragsgivers beslutning om alternativ C
og T2, Azure PostgreSQL som foreløpig mål, TS2-02 vedtatt, B-12 og F0b. Kilden er
oppdragsgivers bekreftelse 23.09 og [handoffen](../handoff-2026-09-23-datalag-postgresql.md).
Ingen kode, migrasjon eller database er endret eller lest på nytt. Påstandene om
Azure, Fabric og IKTs svar er gjengitt fra handoffen og ikke kontrollert her.

**Endringen 23.09, BR-01:** BR-01 er reprodusert og flyttet fra 4.6 til 4.2,
DRF-01–DRF-03 er ført inn, og B-13 har fått en merknad. Belegget er testene i
`backend/tests/test_security/test_beregningsresultat_br01_20260923.py`, kjørt
23.09, og kartleggingen, der det som bare er lest, er merket L.
