# Design: durable inbox og outbox før produksjon

Dato: 2026-09-17. Utgangspunkt: `b4868ca`.
Forrige: [vurdering av Power Platform](vurdering-power-platform-2026-09-17.md).
Målarkitekturen dette konkretiserer: trinn 2 og 3 i [Catenda-dataflyten](catenda-dataflyt.md).

Spørsmålet: hvis vi dropper Dataverse og bruker Azure SQL — hva med durable inbox og
outbox? Kan én hendelse som omfatter både skjemasvar og vedlegg sendes som én
transaksjon, med retries?

Forutsetning fra brukeren, og den styrer ambisjonsnivået her: **auditene og dagens kode
er work in progress. Appen er ikke i produksjon, og må være sikker før den settes i
prod.** Dette dokumentet er derfor skrevet som et krav til produksjonssetting, ikke som
en forbedring man kan ta senere.

**Merknad 2026-09-19.** Dokumentets kjernepåstand — at det avgjørende valget er
**én database**, ikke Azure SQL kontra Postgres — er bekreftet av
[arkitekturvurderingen](arkitekturvurdering-2026-09-19.md), som kom til samme
konklusjon uavhengig og la til to ting dette dokumentet ikke hadde:

- **Plattformen er avklart.** Google Cloud nå, mulig Azure Container Apps senere.
  Begge sletter den lokale SQLite-fila ved skalering til null, så tabellen i
  avsnittet under der steg 1 og 6 går mot `BH_APPROVAL_DB`, beskriver en flyt som
  taper leveringskvitteringer ved normal drift.
- **Tenant-grensen kan ikke skrives ennå.** Hendelsestabellene mangler
  `prosjekt_id` (DB-06), så en RLS-policy på prosjekt lar seg ikke formulere før
  kolonnen finnes og er backfilt fra `sak_metadata` — aldri fra `source`, som er
  skrevet av en av tre oslobygg-fallbacks. Se
  [sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md), del 3.

Linje 428 under fører opp at `BH_APPROVAL_DB` trenger varig lagring og restore-test,
med «bortfaller når SQLite-lagrene konsolideres». Plattformvalget gjør den
konsolideringen til en forutsetning for første produksjonsdeploy, ikke en opprydding.

## Kort svar

**Ja på vår side av grensen. Nei på tvers av Catenda — og det er ikke en svakhet ved
Azure SQL, det er en egenskap ved distribuerte systemer.**

Delt i tre:

1. **Alt som er vårt kan ligge i én transaksjon**: hendelsen, vedleggsbindingen,
   metadatacachen, inbox-kvitteringen og outbox-raden. Det er ikke mulig i dag, og
   grunnen er strukturell — se [del 2](#2-den-strukturelle-blokkeringen).
2. **Leveransen til Catenda kan aldri være i den transaksjonen.** Taket er
   at-least-once med idempotensnøkler og stegsjekkpunkt. Den som lover exactly-once
   over to systemer tar feil.
3. **Det avgjørende valget er ikke Azure SQL kontra Postgres.** Det er **én database
   kontra tre**. Mønsteret under er identisk på begge; Azure SQL' egne fortrinn er
   ledger-tabeller og Managed Identity, ikke outboxen.

Og et funn som må sies rett ut, fordi det endrer hvordan dagens retry skal forstås:
**det finnes ingen bakgrunnsworker i repoet.** `ApprovalService.deliver` kalles bare fra
`routes/approval_routes.py:152`, altså fra en HTTP-forespørsel. En feilet leveranse
forblir feilet til et menneske ser banneret og trykker på nytt. Det er ikke en outbox,
det er en manuell knapp.

## Metode

Alt om dagens kode er lest ut av repoet, med fil og linje. SQL-eksemplene er design, ikke
kjørt kode — ingen migrasjon er skrevet eller anvendt her. Plattformpåstander om Azure
SQL (ledger-tabeller, fravær av SQL Agent, FILESTREAM) er ikke prøvd i dette miljøet og
bør verifiseres mot gjeldende dokumentasjon.

Ingenting er implementert. Dette er et designforslag som trenger en beslutning før det
bygges, fordi det berører hvilken database hendelsesloggen ligger i.

## 1. Hva som faktisk skjer ved én innsending i dag

Dette er `submit_event` (`routes/event_routes.py:370`–`620`), lest i rekkefølge etter at
autorisering og forretningsregler har passert:

| # | Handling | Lager | Feilhåndtering |
| --- | --- | --- | --- |
| 1 | `delivery_status.record(..., "pending")` | SQLite `BH_APPROVAL_DB` | — |
| 2 | `_get_event_repo().append(event, expected_version)` | Postgres via Supabase | 409 ved versjonskonflikt |
| 3 | `_get_metadata_repo().update_cache(...)` | metadata-repo | `except Exception: logger.exception` |
| 4 | `lever_vedlegg_for_hendelse(...)` → Catenda | ekstern | `except Exception: logger.exception` |
| 5 | `_post_to_catenda(...)` → PDF + dokumentreferanse + kommentar + status | ekstern | `except Exception` → `skipped_reason="error"` |
| 6 | `delivery_status.record(..., "delivered"\|"failed")` | SQLite | `except Exception: logger.exception` |

**Tre lagringssystemer og fire eksterne kall i én forespørsel, uten at noen transaksjon
spenner over noe av det.** Steg 3 til 6 er «prøv, logg, gå videre».

Det er ikke slurv — hvert enkelt valg er begrunnet i en audit. At hendelsen står selv om
Catenda feiler er `PDF-02` («en integrasjonsfeil skal ikke invitere til ny
innsending»). At vedlegget leveres *etter* commit er det bevisste valget i
[vedleggsauditen](audit-vedleggsflyt-2026-09-15.md). At kvitteringen skrives før commit
er `AUD-06`s intent-registrering.

Problemet er ikke de enkelte valgene. Det er at **ingen av dem etterlater en varig
arbeidsoppgave.** Dør prosessen mellom steg 2 og 6, finnes det ikke en rad noe sted som
sier at denne hendelsen fortsatt skal leveres. `CatendaDeliveryStatus` sier det selv i
sin egen docstring: *«this is not a retry queue.»*

To ting til, verifisert:

- **`approval_outbox` finnes, men bare for én av tre innsendingsveier.** Tabellen i
  `services/approval_service.py:59` har lease (300 s) og en `notificationAttemptId`-vakt
  fra `PERSIST-01`. Den dekker `ApprovalService.publish`, ikke `submit_event` eller
  `submit_batch`. Den mangler `neste_forsok_at`, forsøksteller, backoff og dead letter.
- **Webhookens idempotens er `_processed_events: set[str]`** i
  `lib/security/webhook_security.py` — i minnet, tapt ved restart, per replika, med
  Redis som valgfritt alternativ. Med to instanser og ingen Redis behandles samme
  Catenda-event to ganger.

## 2. Den strukturelle blokkeringen

Dette er grunnen til at en outbox ikke bare kan legges på i dag, og det er verdt å være
presis om.

`SupabaseEventRepository` snakker med databasen gjennom **PostgREST over HTTP**:

```python
self.client: Client = create_client(self.url, self.key)   # repositories/supabase_event_repository.py:232
...
self.client.table(table_name).insert(rows).execute()      # :426
```

Klassens egen docstring fører opp «ACID transactions» som en fordel over JSON-filer.
Det stemmer for databasen, men **ikke for denne klienten**: et REST-kall er én
autocommit-operasjon. Man kan ikke åpne en transaksjon, skrive hendelsen, skrive
outbox-raden og committe sammen.

Konsekvensen er presis: **outbox-mønsteret er utilgjengelig så lenge hendelseslageret
nås over PostgREST**, uavhengig av hvilken database som ligger under. Det er ikke et
Supabase-problem — Supabase *er* Postgres, og en direkte `psycopg`-forbindelse ville
løst det. Det er et klientvalg.

Dette er den ene endringen som må tas først, og den er uavhengig av Azure-spørsmålet.

## 3. Hva «samme transaksjon» kan bety

Brukerens formulering var at en hendelse omfatter skjemasvar **og** vedlegg, og at dette
sendes som samme transaksjon. Det må deles i to, fordi den ene halvdelen er oppnåelig og
den andre ikke er det:

**Oppnåelig — én lokal ACID-transaksjon:** at skjemasvaret er registrert, vedlegget er
bundet til hendelsen, cachen er oppdatert og *arbeidsoppgaven med å levere* er lagret,
enten alt sammen eller ingenting. Ingen tilstand der hendelsen finnes uten at leveransen
er planlagt, og ingen der leveransen er planlagt uten at hendelsen finnes.

**Ikke oppnåelig — atomisk med Catenda:** det finnes ingen distribuert transaksjon mot
et fremmed REST-API. Taket er **at-least-once**: leveransen skjer minst én gang, og
dobbeltlevering hindres av idempotens vi bygger selv.

Formuleringen som holder er derfor: *hendelsen og vedlegget committer sammen; leveransen
er garantert å skje, men ikke i samme øyeblikk.* Det er sterkere enn i dag, der
leveransen verken er garantert eller gjenopptagbar.

## 4. Designet: én transaksjon, så én kø

### 4.1 Vedlegg stages i en egen, tidligere transaksjon

Dette er allerede riktig i dagens løsning og skal beholdes: bytene lastes opp til oss når
brukeren velger filen, ikke til Catenda. Det gjør innsendingstransaksjonen liten — den
flytter bare en status, ikke 15 MB.

```sql
CREATE TABLE vedlegg (
  vedlegg_id       UNIQUEIDENTIFIER PRIMARY KEY,
  prosjekt_id      NVARCHAR(64)  NOT NULL,
  sak_id           NVARCHAR(64)  NOT NULL,
  filnavn          NVARCHAR(255) NOT NULL,
  storrelse        INT           NOT NULL,
  innhold          VARBINARY(MAX) NULL,      -- frigis ved levering
  status           NVARCHAR(16)  NOT NULL,   -- staged | committed | delivered
  event_id         UNIQUEIDENTIFIER NULL,
  catenda_item_id  NVARCHAR(64)  NULL,
  lastet_opp_av    NVARCHAR(128) NOT NULL,
  kontraktsside    NVARCHAR(2)   NOT NULL
);
```

`VARBINARY(MAX)` i samme database framfor Blob Storage er et bevisst valg her: det er det
som gjør atomisiteten triviell. Ved volumanslaget i
[arkitekturdiagrammene](arkitektur-diagrammer.md) (~5 000 saker/år) og 15 MB-taket er
det håndterbart, og bytene slettes ved levering, så steady state er bare uleverte
vedlegg. Blob Storage med en egen opprydder er riktigere ved høyere volum, men koster
atomisiteten. *FILESTREAM og FileTable finnes ikke i Azure SQL Database.*

### 4.2 Innsendingstransaksjonen

```sql
SET XACT_ABORT ON;
BEGIN TRANSACTION;

  -- Kommandodedupe: samme commandId to ganger gir ett utfall
  INSERT INTO kommando (kommando_id, sak_id, utfort_at) VALUES (@cmd, @sak, SYSUTCDATETIME());

  -- Hendelsen. UNIQUE(sak_id, versjon) er fortsatt den optimistiske låsen
  INSERT INTO koe_events (...) VALUES (...);

  -- Vedleggene bindes til hendelsen
  UPDATE vedlegg SET status = 'committed', event_id = @event
   WHERE vedlegg_id IN (@ids) AND sak_id = @sak AND status = 'staged';

  -- Lesecachen
  UPDATE sak_metadata SET ... WHERE sak_id = @sak;

  -- Arbeidsoppgaven
  INSERT INTO utgaende_levering (leveranse_id, prosjekt_id, sak_id, event_id, maal, steg_gjenstar)
  VALUES (@lev, @prosjekt, @sak, @event, @maal_json, @steg_json);

COMMIT;
```

`@lev` er **deterministisk**, utledet av `event_id`, slik at en tvetydig feil ikke kan
skape to leveranser for samme hendelse. `UNIQUE(event_id)` på outbox-tabellen håndhever
det uansett.

Svaret til klienten går ut her, med 201. Det er ikke en atferdsendring i praksis —
dagens kode returnerer allerede 201 når Catenda feiler — men nå er det *sant* at arbeidet
er tatt vare på.

### 4.3 Outbox-raden: én per hendelse, med stegsjekkpunkt

Dette er designvalget som betyr mest, og det følger direkte av `AUD-06`.

Alternativet er én rad per delsteg. Det forkastes fordi `AUD-06` slo fast at «levert»
krever at PDF-en er lastet opp **og** koblet **og** kommentaren postet **og** statusen
synket. Med én rad per steg blir «levert» en spørring på tvers av rader, og akkurat den
tvetydigheten var funnet.

```sql
CREATE TABLE utgaende_levering (
  leveranse_id     UNIQUEIDENTIFIER PRIMARY KEY,
  prosjekt_id      NVARCHAR(64)  NOT NULL,
  sak_id           NVARCHAR(64)  NOT NULL,
  event_id         UNIQUEIDENTIFIER NOT NULL UNIQUE,
  maal             NVARCHAR(MAX) NOT NULL,   -- oppløst ved commit, se 6.1
  steg_gjenstar    NVARCHAR(MAX) NOT NULL,   -- ordnet JSON-liste
  steg_utfort      NVARCHAR(MAX) NOT NULL CONSTRAINT df_steg DEFAULT N'{}',
  status           NVARCHAR(16)  NOT NULL CONSTRAINT df_st DEFAULT N'pending',
                                           -- pending | claimed | delivered | dead_letter
  forsok           INT           NOT NULL CONSTRAINT df_f DEFAULT 0,
  neste_forsok_at  DATETIME2     NOT NULL CONSTRAINT df_n DEFAULT SYSUTCDATETIME(),
  lease_til        DATETIME2     NULL,
  lease_eier       NVARCHAR(64)  NULL,
  siste_feil       NVARCHAR(MAX) NULL
);

CREATE INDEX ix_klar ON utgaende_levering (neste_forsok_at)
  WHERE status = N'pending';
```

`steg_utfort` er kartet fra steg til den eksterne ID-en steget produserte:

```json
{ "vedlegg_upload": { "catenda_item_id": "…" },
  "pdf_upload":     { "library_item_id": "…", "revisjon": 1 },
  "document_ref":   { "reference_guid": "…" } }
```

**Dette er mekanismen som lukker duplikatproblemet.** I dag er «duplikate dokumenter ved
retry» et åpent punkt i både [PDF-auditen](audit-pdf-catenda-2026-09-14.md) og
[persistensauditen](audit-persistens-gjenoppretting-2026-09-14.md). Med sjekkpunkt
gjenopptar et nytt forsøk ved første uutførte steg, framfor å laste opp PDF-en en gang
til. Mønsteret finnes allerede i miniatyr i dagens kode — «samme dokumentnavn finnes og
`failOnDocumentExists=false` → gjenbruk eksisterende dokumentreferanse» — og skal
generaliseres, ikke oppfinnes.

### 4.4 Henting av arbeid

T-SQL har den riktige primitiven innebygd:

```sql
UPDATE TOP (10) utgaende_levering WITH (READPAST, UPDLOCK, ROWLOCK)
   SET status = N'claimed',
       lease_til = DATEADD(second, 120, SYSUTCDATETIME()),
       lease_eier = @worker,
       forsok = forsok + 1
OUTPUT inserted.leveranse_id, inserted.prosjekt_id, inserted.sak_id,
       inserted.event_id, inserted.maal, inserted.steg_gjenstar, inserted.steg_utfort
 WHERE status = N'pending' AND neste_forsok_at <= SYSUTCDATETIME();
```

`READPAST` gjør at flere workers ikke blokkerer hverandre og ikke kan hente samme rad.
Utløpte leaser tas tilbake av en enkel sweeper:

```sql
UPDATE utgaende_levering SET status = N'pending', lease_til = NULL, lease_eier = NULL
 WHERE status = N'claimed' AND lease_til < SYSUTCDATETIME();
```

På Postgres er dette `FOR UPDATE SKIP LOCKED` og ellers identisk. **Det er derfor
databasevalget ikke avgjør outboxen.**

### 4.5 Workeren

```
for hver hentet leveranse:
    for steg in steg_gjenstar:
        if steg in steg_utfort: continue          # sjekkpunkt
        try:
            resultat = utfor(steg, maal)
            steg_utfort[steg] = resultat          # persisteres etter hvert steg
        except Transient as e:
            backoff = min(2**forsok, 3600) + jitter
            if forsok >= MAKS: status = 'dead_letter'; varsle_drift()
            else: status='pending'; neste_forsok_at = now + backoff
            break
        except Permanent as e:
            status = 'dead_letter'; varsle_drift(); break
    else:
        status = 'delivered'
```

Dette er en **ny deployerbar enhet**. Azure SQL Database har ingen SQL Server Agent, så
noe må kjøre løkken: en sidecar-container, en Container Apps-jobb eller en Azure Function
med timer-trigger. Det er den reelle driftskostnaden ved designet, og den bør prises inn.

### 4.6 Inbox

Webhooken erstatter minnesettet med en tabell:

```sql
CREATE TABLE innkommende_hendelse (
  event_id       NVARCHAR(128) PRIMARY KEY,   -- Catendas event.id
  fingeravtrykk  BINARY(32)    NOT NULL,      -- SHA-256 av payloaden
  status         NVARCHAR(16)  NOT NULL,      -- processing | completed | dead_letter
  lease_til      DATETIME2     NULL,
  forsok         INT           NOT NULL CONSTRAINT df_if DEFAULT 0,
  mottatt_at     DATETIME2     NOT NULL CONSTRAINT df_im DEFAULT SYSUTCDATETIME()
);
```

Mottak er ett `INSERT`. Primærnøkkelbrudd betyr «sett før», og da avgjør raden:

| Tilstand | Svar |
| --- | --- |
| `completed` | 202 `already_processed` |
| `processing`, lease gyldig | 202, en annen worker har den |
| `processing`, lease utløpt | ta over og kjør videre |
| **fingeravtrykket avviker** | 409 **og varsle drift** |

Den siste raden er ikke pedanteri. Samme `event.id` med et annet innhold er ikke en
retry — det er at Catenda har endret noe under samme ID, og det skal aldri dedupliseres
bort i stillhet. [Catenda-dataflyten](catenda-dataflyt.md) forutsetter allerede
«payload-fingerprint» i trinn 2; dette er den konkrete bruken.

Selve behandlingen avsluttes med at inbox-raden merkes fullført **i samme transaksjon som
domeneeffekten**:

```sql
BEGIN TRANSACTION;
  INSERT INTO sak_metadata (...);
  INSERT INTO koe_events (...);                  -- sak_opprettet
  INSERT INTO utgaende_levering (...);           -- første kommentar med lenke
  UPDATE innkommende_hendelse SET status = N'completed' WHERE event_id = @id;
COMMIT;
```

Det er dette som gir **exactly-once effekt** av at-least-once levering: enten er både
saken og kvitteringen der, eller ingen av delene, og et nytt forsøk finner samme
utgangspunkt.

## 5. Azure SQL eller bli på Postgres?

Den ærlige framstillingen: **outboxen er ikke et argument for Azure SQL.** Mønsteret er
det samme, primitivene finnes i begge, og migreringen kjøper den ikke.

Det som faktisk skiller:

| | Azure SQL | Postgres (også Supabase) |
| --- | --- | --- |
| Køhenting i tabell | `READPAST` + `UPDLOCK` | `FOR UPDATE SKIP LOCKED` |
| Transaksjon over alt vårt | ja | ja |
| Uforanderlig hendelseslogg | **ledger-tabeller** med kryptografisk sammendrag | ingen tilsvarende; append-only er konvensjon |
| Legitimasjon | **Managed Identity**, ingen nøkkel i miljøvariabel | tjenestenøkkel må oppbevares og roteres |
| Innenfor organisasjonens Azure-eiendom | ja | nei |
| Jobbkjøring | ingen SQL Agent; egen worker | samme |
| Migreringskostnad nå | ny repositoryimplementasjon + T-SQL-migrasjoner | **ingen** |

**Ledger-tabellen er det eneste virkelig nye.** Den er verdt å veie tungt i dette
domenet: i dag er append-only en konvensjon håndhevet av applikasjonskoden pluss én
unikhetsskranke, og den som har `SUPABASE_SECRET_KEY` kan skrive om `data` i
`koe_events`. For en logg som skal kunne legges fram i en tvist er det en reell
forskjell.

Konklusjonen jeg vil stå for: **bytt klient først, database senere.** Å gå fra
PostgREST til en direkte forbindelse mot den Postgres-en som allerede finnes, gjør
outboxen mulig uten migrering og uten å binde arkitekturvalget. Ledger-tabeller er så et
selvstendig argument for Azure SQL som kan tas på egne premisser, ikke under press fra
outbox-behovet.

## 6. Sikkerhet — hva en outbox innfører

En kø er utsatt skriving med tjenestekontoens myndighet. Det er ny angrepsflate, og den
fortjener egne regler. Dette er den delen som må være på plass før produksjon.

### 6.1 Målet løses opp ved commit, aldri av workeren

`maal`-kolonnen skal inneholde `topic_board_id`, `topic_guid`, `library_id` og
`folder_id` **slik de ble autorisert i forespørselen**, hentet fra prosjektregisteret.
Workeren skal aldri slå opp målet på nytt fra noe klienten har sendt.

Grunnen er `CATENDA_TOPIC_MISMATCH`-kontrollen som allerede finnes
(`routes/event_routes.py:415`): saken bestemmer målet, ikke klienten. Hvis den kontrollen
skjer i forespørselen, men målet gjenoppløses ved levering, er kontrollen omgått med
timeglass. **En outbox-rad er en instruksjon som utføres senere med høyere privilegier
enn den som la den inn.**

### 6.2 Raden beskriver hva, ikke hvor

Lagre «lever hendelse X for sak Y», ikke «POST til denne URL-en». En rad som bærer sitt
eget endepunkt er en SSRF-primitiv med integrasjonens token. Workeren utleder endepunktet
fra prosjektregisteret.

### 6.3 Interne notater kan ikke nå køen

`BE-02` slo fast at et internt notat ikke skal utløse utgående levering. I dag er det en
`if` i `submit_event`. I det nye designet må det være en **invariant ved innsetting** —
helst en `CHECK`-skranke eller en trigger som avviser `INSERT` av en leveranse for en
`internt_notat`-hendelse. Regelen skal ikke kunne glemmes av en fjerde innsendingsvei.

Det er samme lærdom som `BE-04`: reglene må ligge der alle veier passerer.

### 6.4 Dead letter er en flate med kontraktsdata

En dead-letter-kø inneholder brevtekst og krav. Operatørgrensesnittet som viser den må ha
samme tilgangskontroll som saken selv — prosjektmedlemskap og kontraktsside — ikke bare
«drift har tilgang». Interne notater skal ikke kunne nås den veien.

### 6.5 Retry-tak er også hensyn til motparten

Uten et tak er en outbox en selvpåført lastgenerator mot Catenda med vår tjenestekonto.
Eksponentiell backoff med jitter og et absolutt forsøkstak, så dead letter og varsling.

### 6.6 Mellomlagrede vedlegg er førbeslutningsmateriale

Bytene i `vedlegg.innhold` er ikke sett av motparten, og det er hele poenget i
[vedleggsauditen](audit-vedleggsflyt-2026-09-15.md). De arver databasens kryptering og
sikkerhetskopiering — som også betyr at de havner i sikkerhetskopiene. Slettingen ved
levering må derfor være reell, og oppbevaringstiden for sikkerhetskopier må være et
bevisst valg, ikke en standardverdi.

## 7. Hvilke åpne auditpunkter dette lukker

| Punkt | Kilde | Hvordan |
| --- | --- | --- |
| Durable outbox for webhookens sideeffekter | [Catenda-dataflyten](catenda-dataflyt.md) trinn 3, utsatt etter avtale | Del 4.6 |
| Duplikate dokumenter og kommentarer ved retry | [PDF](audit-pdf-catenda-2026-09-14.md), [persistens](audit-persistens-gjenoppretting-2026-09-14.md) | Stegsjekkpunkt, del 4.3 |
| Automatisk gjenopptakelse av hengende jobber | [persistens](audit-persistens-gjenoppretting-2026-09-14.md) | Lease-sweeper, del 4.4 |
| «Sendt» har tre svar i systemet | [handoff](handoff-2026-09-15.md) | Én outbox-vei for alle tre innsendingsveiene |
| Webhookidempotens overlever ikke restart | `lib/security/webhook_security.py` | Inbox-tabell, del 4.6 |
| `BH_APPROVAL_DB` trenger varig lagring og restore-test | [persistens](audit-persistens-gjenoppretting-2026-09-14.md) | Bortfaller når SQLite-lagrene konsolideres |
| Opprydding av forlatte utkast server-side | [utkastlagring](audit-utkast-serverlagring-2026-09-15.md) | Kan gjøres i innsendingstransaksjonen |

Det siste er en bieffekt verdt å nevne: når utkastet ligger i samme database som
hendelsen, kan innsendingen slette utkastraden i samme transaksjon. Da lukkes begge
hullene auditen beskriver — innsending fra en annen fane, og en nettleser som dør mellom
innsending og sletting.

## 8. Hva designet ikke løser

- **Ingen transaksjon mot Catenda.** At-least-once er taket. Dobbeltlevering hindres av
  sjekkpunkt og «se etter før du skriver», ikke av en garanti.
- **Catendas egne endepunkter ser ikke ut til å ta imot en idempotensnøkkel.**
  Endepunktlisten i [Catenda-dataflyten](catenda-dataflyt.md) viser ingen. Dedupe må
  derfor gjøres av oss, med GET før POST der det er mulig. Dette bør bekreftes med
  Catenda framfor antas.
- **Svarkontrakten mot frontend endres.** `catenda_synced` og `catenda_skipped_reason`
  beskriver et resultat som nå ikke foreligger ved svartidspunktet. Banneret i
  `src/lib/kontraktsbord/context.svelte.ts:94` må lese leveransestatus framfor
  innsendingsresultatet. Det er en reell frontendendring, ikke en detalj.
- **Rekkefølge mellom hendelser er ikke garantert av køen.** To leveranser for samme sak
  kan hentes av to workers. Trenger saken rekkefølge utad, må køen partisjoneres på
  `sak_id` — én aktiv leveranse per sak om gangen.
- **Ledger-tabeller gir bevisverdi først når sammendragene publiseres** til uforanderlig
  lagring. Selve tabellen er ikke nok.

## 9. Rekkefølge fram til produksjon

Avhengighetene bestemmer rekkefølgen; punkt 1 er en forutsetning for alt annet.

1. **Bytt hendelseslageret fra PostgREST til en direkte databaseforbindelse.** Uten dette
   er ingenting av resten mulig. Kan gjøres mot dagens Postgres.
2. **Konsolider lagrene.** Godkjenninger, leveringskvitteringer, vedlegg og utkast ligger
   i SQLite, hendelsene i Postgres. Én database er forutsetningen for én transaksjon.
3. **Inbox først, outbox etterpå.** Inboxen er mindre, og duplikatbehandling av
   innkommende webhooks er den nærmeste reelle risikoen ved flere replikaer.
4. **Outbox med stegsjekkpunkt**, koblet til alle tre innsendingsveiene samtidig — ikke
   én om gangen, jf. lærdommen fra vedleggsleveringen.
5. **Worker som egen deployerbar enhet**, med lease-sweeper og dead letter.
6. **Sikkerhetsreglene i del 6** som tester, ikke som dokumentasjon. Særlig 6.1 og 6.3.
7. **Krasjtester.** [Persistensauditen](audit-persistens-gjenoppretting-2026-09-14.md)
   har allerede mønsteret — underprosess som avsluttes med `os._exit(23)` midt i en
   transaksjon. De testene må utvides til å dekke avbrudd i hvert steg av leveransen.

Punkt 1 og 2 er de store. De er også de som gjør at «samme transaksjon» går fra å være
umulig til å være normalen.

## Gjenstående

Ingen kode er endret. Dette er et designforslag som trenger en beslutning på punkt 1 og 2
før noe bygges, fordi de flytter hendelsesloggen.

Tre ting bør avklares eksternt før designet låses:

1. **Tar Catendas skriveendepunkter imot en idempotensnøkkel?** Avgjør hvor mye
   GET-før-POST som trengs.
2. **Er `PUT related_topics` additiv eller erstattende?** Står allerede åpent i
   [Catenda-dataflyten](catenda-dataflyt.md), og avgjør om det steget kan gjentas trygt.
3. **Hvilken oppbevaringstid skal sikkerhetskopiene ha?** Mellomlagrede vedlegg er
   førbeslutningsmateriale og havner i dem.

Alt om Azure SQL i dette dokumentet er ubekreftet på denne stacken. SQL-eksemplene er
design, ikke kjørt kode.
