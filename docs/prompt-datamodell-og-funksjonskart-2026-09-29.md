# Oppdrag: datamodell og funksjonskart (spor M)

**Dato:** 2026-09-29. **Utgangspunkt:** `main` på `fb278d8`. Kontroller HEAD og
Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke beslutninger.
Avsnitt 4 er grunnlaget for de to funnene DM-01 og DM-02, som står i
hovedplanen.

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md)
(B-12, spor D og spor M i avsnitt 5),
[databaseauditen 20.09](audit-databasearkitektur-2026-09-20.md#navngitt-oversikt-over-public)
(den første navngitte tabelloversikten) og
[handoffen 23.09](handoff-2026-09-23-datalag-postgresql.md) (plattformsamtalen
med IKT). Arbeidet følges i
[#79](https://github.com/khjohns/endringsmeldinger/issues/79) med underissues.

## 1. Bakgrunn og mål

IKT har bedt om en tabellbeskrivelse. Den skal gi «en solid beskrivelse av
verktøyets datamodell» og brukes til forståelse, videreutvikling og
feilsøking, altså som systemdokumentasjon. Malen er et regneark med sju
kolonner:

1. Tabellnavn
2. Beskrivelse
3. Er dette en transaksjonstabell?
4. Hvor fra appen lagres og redigeres
5. Er dette en grunndatatabell?
6. Tabell der data hentes inn, f.eks. via Catenda-API-et
7. Beskrivelse av relasjon til en annen tabell

Oppdragsgiver vil i tillegg gå gjennom appens funksjoner trinn for trinn, både
det brukeren ser og det som skjer bak kulissene, og bekrefte med tester at de
virker som tiltenkt.

B-12 er åpen, og en SQL Database er igjen aktuell av kostnadsgrunner
([#78](https://github.com/khjohns/endringsmeldinger/issues/78)). Sporet er
valgt fordi det står seg uansett plattform. Den logiske datamodellen,
hendelsestypene og atferden gjennom rutene er de samme om basen blir
PostgreSQL eller Azure SQL Database.

## 2. Regler for hele sporet

1. **Ett hjem.** Registeret i [`datamodell/`](datamodell/tabeller.toml) er
   kilden. Excel-fila og oversikten i Markdown lages av
   [`verktoy/datamodell.py`](verktoy/datamodell.py) og rettes aldri for hånd.
   Kommer det merknader fra IKT i regnearket, føres de inn i registeret.
2. **Uttømmende, håndhevet av test.** En tabell uten oppføring, eller en
   oppføring uten tabell, gir rød test. Det samme skal gjelde hendelsestypene
   (1b) og rutene (fase 2).
3. **Plattformnøytralt.** Registeret beskriver den logiske modellen.
   Atferdstestene går gjennom rutene og containeren, ikke mot SQL, slik at de
   kan kjøres mot et annet datalag og bli akseptkriteriet for en eventuell
   omskriving. Beskrivelser legges ikke inn i databasen før B-12 er avgjort
   (DM-01).
4. **Belegg, og «ikke kontrollert» der det er sant.** Merk påstander som
   hovedplanen gjør: K, L, D og H. Et felt som ikke er kontrollert, står som
   «ikke kontrollert», ikke som en rimelig antakelse. Kartleggingen går i
   runder, og en senere runde skal kunne se hva en tidligere ikke visste.
5. **Les også laget som ikke ligger i Python.** Databasefunksjoner og triggere
   skriver tabeller som et kodesøk ikke finner (resonneringsreglene i
   `AGENTS.md`). Spør katalogen før du skriver at en tabell er ubrukt eller
   mangler skriver.
6. **Tiltenkt atferd skrives ned før testen.** Forventningen skal ha en kilde
   utenfor koden: NS 8407, et vedtak i hovedplanen eller en forventning
   oppdragsgiver har godkjent.
   - Holder atferden, blir testen ordinær.
   - Avviker den, blir det et funn med ID i hovedplanen og en streng `xfail`
     etter reglene i `AGENTS.md`.
   - En test som bare fastholder dagens atferd, skal si at den gjør det.
7. **Funn får ID `DM-nn`** i hovedplanens register, med kilde i
   gjennomføringsnotatet for fasen. Kjente funn, som MS-06 eller DA-15, vises
   til og beskrives ikke på nytt.
8. **Offentlig.** Registeret beskriver skjemaet, aldri innholdet: ingen
   saksdata, navn eller nøkler.

## 3. Fasene

Hver fase har sitt issue under #79. Rekkefølgen innen en fase er fri.

### Fase 1a: tabellregister, vakttest og Excel-eksport

- Én oppføring per tabell i PostgreSQL og SQLite, og egne oppføringer for
  data som ligger utenfor databasene: filene og kommentarene i Catenda, og
  reservasjonen av webhooks.
- IKTs sju kolonner i IKTs rekkefølge, og tilleggsfeltene i avsnitt 5.
- To vakttester:
  - PostgreSQL-tabellene sjekkes mot `TABELLER_I_BASEN`. Katalogtesten i
    CI-jobben `database` holder den lik en base bygget fra migrasjonene.
  - SQLite-tabellene sjekkes mot `CREATE TABLE` i modulene som bruker
    `sqlite_connection`.
- Et skript som lager Excel og Markdown, og en test som feiler når de er
  utdaterte.
- Oppdragsgiver leser beskrivelsene før fila sendes IKT.

### Fase 1b: hendelseskatalog

`hendelse` er én generell tabell. Innholdet ligger i `data` og varierer med
hendelsestypen. For hver verdi i `EventType` beskriver katalogen:
- hvem som kan sende den
- spor
- bestemmelse i NS 8407
- feltene
- hva den gjør med status

Bestemmelsene kontrolleres av oppdragsgiver. En test sørger for at hver verdi
har en oppføring.

### Fase 1c: relasjoner, ER-diagram og dataflyt

- Relasjonene mellom tabellene, også de som ikke er fremmednøkler.
- Et ER-diagram laget fra katalogen, ikke tegnet for hånd.
- Dataflyten mellom tabellene og Catenda, der hver pil viser til koden eller
  databasefunksjonen som gjør kallet.

### Fase 2: funksjonskart

Appens funksjoner, gruppert i områder. For hver funksjon:
- skjermbilde
- rute
- hendelsestype
- tabeller som leses og skrives
- kall til Catenda
- tiltenkt atferd med kilde

Kartet bygges område for område. En test sørger for at hver rute appen
registrerer, står i kartet, slik ruteregisteret gjør for dekoratørene.

### Fase 3: atferdstester per område

Issuene opprettes når kartet for et område er godkjent. Områdene under er
foreløpige og kan endres i fase 2. De er ordnet etter rettslig konsekvens:

1. Varsel, frist og preklusjon.
2. Vederlag.
3. BH-svar, subsidiært standpunkt og aksept.
4. Forsering.
5. Endringsordre, godkjenning og fullmakt.
6. Interne notater og utkast.
7. Vedlegg, brev og PDF.
8. Innlogging, prosjekt og medlemskap.
9. Catenda: webhook inn og levering ut.

Områdene 1–5 er den systematiske gjennomgangen av tilstandsovergangene som
spor D beskriver. De samordnes med issuene i spor D, særlig BR-01, så det ikke
blir to tester av samme regel.

### Fase 4: etter B-12

- Beskrivelsene inn i databasen, i den formen plattformen har.
- DM-01.
- Registeret tilpasses den valgte plattformen.

## 4. Utgangspunktet 29.09

**Kjørt og observert (K 29.09):**

- **Kolonnene er like i prosjektet og i testbasen.** Testbasen er bygget fra
  migrasjonene. `md5` over tabell, kolonne, type og nullbarhet er lik begge
  steder: 19 tabeller og 162 kolonner.
- **DM-01: kommentarer som bare finnes i basen.**
  - Ingen tabell har kommentar, verken i prosjektet eller i testbasen.
  - Prosjektet har kolonnekommentarer på 10 kolonner, testbasen på 2.
  - De åtte som mangler i repoet, er `cached_*` i `sak_metadata`. De står i
    originalteksten til kjerneskjemaet i
    [`vedlegg/migrasjonshistorikk-2026-09-22/`](vedlegg/migrasjonshistorikk-2026-09-22/20260911073512_001_koe_core_tables.sql),
    men ikke i den rekonstruerte migrasjonen `20260911073512`, som ellers sier
    at den gjengir katalogen.
  - Kolonnesummen fanger det ikke, fordi den ikke tar med kommentarer.
- **DM-02, den katalogkontrollerte delen:** ingen funksjon eller trigger i
  prosjektet nevner `catenda_models_cache`, og prosjektet har ingen Edge
  Functions. Statistikken viser 0 rader og 0 innsettinger siden siste
  nullstilling. Når statistikken ble nullstilt, er ikke kontrollert.

**Lest ut av koden (L 29.09):**

- **Seks SQLite-tabeller i én fil.** Tabellene `utkast`, `approvals`,
  `approval_outbox`, `eo_approvals`, `vedlegg` og `catenda_delivery_status`
  ligger i fila `BH_APPROVAL_DB` (standard `koe_data/approvals.sqlite3`).
  Hver klasse oppretter sin tabell ved oppstart.
- **Vedleggsregisteret mellomlagrer filinnholdet** (`innhold`) fram til
  hendelsen er lagret og fila er lastet opp til Catenda. P4 sier at vedlegg
  lagres bare i Catenda; mellomlagringen er planlagt erstattet i F2.
- **Databasefunksjoner og triggere skriver sju tabeller:**
  - `koe_resolve_identity` skriver `app_users` og `app_identities`.
  - `koe_reconcile_memberships` skriver `app_project_memberships` og
    `app_membership_sync`, og kaller `koe_resolve_identity` for hvert medlem.
  - `koe_register_project` skriver `projects`, `catenda_project_configs` og
    `catenda_topic_board_configs`.
  - `koe_set_contract_teams` skriver `catenda_contract_teams`.
  - Triggeren `trg_auto_membership_on_project_create` skriver
    `project_memberships`.
- **`projects` har to skrivere:** rutene `POST` og `PATCH /api/projects`
  gjennom `ProjectRepository`, og `koe_register_project` gjennom
  `scripts/catenda_admin.py`. En migrasjon legger inn prosjektet `oslobygg`
  som startrad.
- **DM-02, den kodelesne delen:** tre BIM-ruter leser `catenda_models_cache`
  og gir tomme lister når den er tom. `upsert_cached_models` har ingen
  kaller, verken i repoet eller i Git-historikken, som begynner 18.09. Om
  cachen var ment fylt på en annen måte, er ikke kjent. Det hører til flaten
  i DA-15, som mangler en produkteier.
- **Utenfor databasene:**
  - Appen skriver kommentarer i Catenda og laster opp dokumenter som knyttes
    til topics.
  - Webhook-reservasjonen ligger i Redis når `REDIS_URL` er satt, og ellers i
    minnet.
  - Uten konfigurasjon lagrer appen hendelser og metadata i JSON- og CSV-filer.
    De reservelagrene går ut med TS2-02
    ([#49](https://github.com/khjohns/endringsmeldinger/issues/49)) og er ikke
    med i registeret.
- **Tallene:** 32 verdier i `EventType`. Appen, startet i testoppsettet,
  registrerte 71 URL-regler. Webhook-ruta var slått av fordi
  `WEBHOOK_SECRET_PATH` ikke var satt, så tallet kan være ett for lavt.

## 5. Feltene i registeret

| Felt | IKTs kolonne | Innhold |
| --- | --- | --- |
| `navn` | 1 | Tabellnavnet slik det står i basen |
| `beskrivelse` | 2 | Hva en rad er, og hva tabellen brukes til |
| `type` | 3 og 5 | En eller flere av typene under. IKTs ja/nei avledes |
| `lagres_fra` | 4 | Hvilke handlinger og hvilken kode som skriver, og om rader endres |
| `fra_catenda` | 6 | Om dataene kommer fra Catenda, og hvordan |
| `relasjoner` | 7 | Fremmednøkler og andre koblinger |
| `lagring` | tillegg | PostgreSQL, SQLite eller utenfor databasene |
| `status` | tillegg | `i bruk`, `rest` (skal fjernes) eller `uavklart` |
| `kan_gjenoppbygges` | tillegg | Om radene kan lages på nytt fra andre data |
| `personopplysninger` | tillegg | Hvilke felt som peker på en person. Vurderingen hører til DPIA-en |
| `skrivere` | tillegg | Filer og databasefunksjoner som skriver, for sporbarhet |
| `funn` | tillegg | ID-er i hovedplanen |
| `belegg` | tillegg | Hva som er kontrollert, hvordan og når |

**Typene er et forslag for IKT, ikke en vedtatt klassifisering:**

| Type | Betyr |
| --- | --- |
| `transaksjon` | Rader som registrerer noe en part eller bruker har gjort |
| `grunndata` | Prosjekter, brukere, medlemskap og oppsett som andre rader viser til |
| `avledet` | Kan bygges opp igjen fra andre tabeller og rettes ikke for hånd |
| `kopi` | Kopi av data fra Catenda |
| `teknisk` | Sesjoner, synkroniseringsstatus, køer og kvitteringer |

IKTs ja/nei-kolonner avledes av typen:
- «Ja» når typen er den eneste
- «Delvis» når den er én av flere
- «Nei» ellers

## 6. Åpne spørsmål

1. Vil IKT ha kolonnenivå? Malen har det ikke. Hendelseskatalogen i 1b er
   kolonnenivået for `hendelse`.
2. Skal planlagte tabeller med? Forslaget er at de står i hovedplanen til de
   finnes i en migrasjon.
3. Hva skal «Hvor fra appen» vise til: skjermbilder, ruter eller begge? 1a
   bruker handlinger og kode. Skjermbildene kommer i fase 2.
4. Registerformatet er TOML, fordi Python leser det uten nye avhengigheter og
   det tåler flerlinjet tekst. Det kan endres uten at noe annet endres.

## Verifikasjon og grenser

- **Kjørt:** katalogspørringer 29.09 mot prosjektet og mot testbasen bygget
  fra migrasjonene. Oppstart av appen i testoppsettet for å telle URL-regler.
  Opptelling av `EventType`.
- **Lest:** migrasjonene, lagrene, kallerne og SQLite-modulene som står i
  avsnitt 4.
- **Ikke kontrollert:**
  - frontenden og hvilke skjermbilder som fører til hvilke skrivinger
  - om Redis brukes i et utrullet miljø
  - hvilke av SQLite-tabellene som har rader noe sted
  - Catenda-endepunktene bak hver tabell (1c)
  - hvordan noe av dette ser ut i Azure SQL Database
  - lesere og skrivere utover det avsnitt 4 nevner, som bygger på
    databaseauditen 20.09
