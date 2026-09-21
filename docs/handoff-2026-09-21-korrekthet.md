# Handoff 2026-09-21 (kveld): korrekthetsflaten lukket, og hva som ble stående

> **Merknad 2026-09-21 (senere samme kveld): MS-05 er gjennomført, og tre
> beslutninger er tatt.** Punkt 2 under sier at MS-05 er uberørt, og punkt 5 at
> fire ting venter på et menneske. Begge gjaldt til `71d9115`. Interne notater
> ligger nå utenfor journalen; sletteplikt mot arkivplikt, MG-02 og DB-05 er
> besluttet — se masterplanens merknad samme dato og
> [MS-05-gjennomføringen](gjennomforing-ms05-2026-09-21.md). Resten av denne
> fila står.

Skrevet for den som overtar, i praksis en språkmodell som starter uten kontekst.
Samme kriterium som før: **hva er dyrt å finne ut på nytt, og hvor er det lett å
ta feil.** Fortellingen står i dokumentene; dette er det som ikke gjentas der.

Dette er den andre handoffen 21.09. Den første
([handoff-2026-09-21](handoff-2026-09-21.md)) overleverte målskjemarunden og ba
om en korrekthetsgjennomgang. **Den er nå gjort,** og den instruksen er derfor
ikke lenger din — se merknaden øverst i den fila.

Tilstand ved overlevering: **alt ligger i `main`.** Grenen
`claude/les-docs-handoff-0dltdq` er merget. Runden er
`git log --oneline f6ceaaa..main` — sju commiter: én funnprotokoll, én
`AGENTS.md`-retting, rettingene, to indeksrunder, KR-15, og oppryddingen.

**Produksjonskode er endret, og databasen er endret tre ganger.** Det er ikke
en auditrunde i vanlig forstand.

---

## 1. Les i denne rekkefølgen

| Dokument | Svarer på |
| --- | --- |
| [audit: korrekthet](audit-korrekthet-2026-09-21.md) | **KR-01 til KR-15.** Hva som var galt, hva som ble rettet, tre avviste påstander og hvorfor de ikke holdt. Merknaden øverst sier hva som er lukket |
| [audit: opprydding](audit-opprydding-2026-09-21.md) | **RY-01 til RY-07.** Det som ble utsatt etter rettingene. **RY-01 er den som betyr noe** |
| [masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Autoritativ for funnstatus** |
| [handoff 21.09 (morgen)](handoff-2026-09-21.md) | Runden før. Fellene der gjelder fortsatt; åpningsinstruksen gjør ikke |
| [målskjemaet](design-maalskjema-database-2026-09-20.md) | Hvor skjemaet skal. MS-05 er gjennomført, se merknaden øverst |

## 2. Det som har frist

**Fristen er uendret: når første ekte sak opprettes.** En append-only journal
kan ikke restruktureres i ettertid. Begge punktene fra forrige handoff står:

- **MS-05 — interne notater ut av journalen.** Uberørt. Tidslinjen må flette to
  kilder, og `event_visibility` må dekke begge.
- **MG-02 — `catenda:<subject>` som andre verdiform i `actorid`.** Uberørt, og
  den krever en produktbeslutning (punkt 5).

Ingenting i denne runden rørte dem. **Det som har frist, har ikke flyttet seg.**

## 3. Tre feller i denne runden

### Felle 1 — den dyreste feilen ble funnet fordi katalogen ble spurt, ikke lest

KR-01: `organisasjon_id NOT NULL` brøt **all** prosjektregistrering. Den ble
ikke funnet ved å lese migrasjonen — den ble funnet ved å lese
`koe_register_project` fra `pg_proc` i den levende basen og se at funksjonen som
faktisk kjører, inserter uten kolonnen.

Og rekkevidden ble bare riktig fordi den ble *kjørt*: den første konklusjonen
var «ingen nye prosjekter kan registreres». Et kastbart PG16-cluster viste at
Postgres skrankesjekker raden **før** `ON CONFLICT` løses, så også oppdatering
av et eksisterende prosjekt feiler. Forskjellen mellom «utledet» og «observert»
var her forskjellen mellom halv og hel diagnose.

### Felle 2 — to uavhengige gjennomganger var enige, og begge tok feil

Oppryddingsrunden hadde fire vinkler. To av dem konkluderte, hver for seg, med
at den nye indeksen på `hendelse` var overflødig fordi
`sak_metadata.catenda_topic_id` allerede hadde en. **Den indeksen finnes ikke.**

Enighet mellom flere gjennomganger er ikke bevis — særlig ikke når alle leste
de samme migrasjonsfilene. Det er katalogen som avgjør. Konsekvensen står i
RY-01: flyttes topic-oppslaget dit, må `sak_metadata` indekseres først.

### Felle 3 — en retting kan motsi sin egen migrasjon

KR-01-rettingen trædde `organisasjon_id` gjennom `register_project.py`, som
skrev rett i tabellen med `upsert`. Migrasjonen som ble skrevet i samme runde
sier uttrykkelig at en ny registrering ikke skal kunne flytte et prosjekt til en
annen virksomhet — og `upsert` setter kolonnen også ved konflikt. **Rettingen
brøt regelen den selv innførte.**

Den ble fanget av oppryddingsrunden, ikke av testene, og ikke av lesingen.
Skriptet går nå gjennom RPC-en. Lærdommen: når en regel legges i databasen, let
opp hver skrivesti som ikke går gjennom den.

## 4. Etablerte fakta — ikke finn dem igjen

- **Migrasjonssettet er 21 filer** og bygger en tom PostgreSQL 16 i ren
  `sort`-rekkefølge, 18 tabeller, null feil. Katalogen er **identisk med
  prosjektets på fem snitt:**

  | Snitt | md5 |
  | --- | --- |
  | Kolonner | `800f137a373d76ca933f81d232fd03a6` |
  | Skranker | `2f8a3112c03b641e5312173273b8135c` |
  | Indekser | `9b86e55a9a527a857483d72b410a4f7c` |
  | Policyer | `117cdb62a9661c8968b6fb042f492c27` |
  | Rettigheter | `0ccf95d54ad136732c9a05cad7b18f37` |

  **Ikke sammenliknbare med forrige handoffs summer** — spørringene er skrevet
  på nytt, og rettighetssnittet er avgrenset til `anon`, `authenticated` og
  `service_role`. Spørringene står ordrett i oppryddingens «Verifikasjon og
  grenser».

- **Tre migrasjoner ble anvendt 21.09:** `20260921091208` (RPC-en får
  `p_organisasjon_id`), `20260921093936` (delvis indeks for topic-oppslaget),
  `20260921102148` (indeks på `app_identities(provider, subject)`).
  Migrasjonshistorikken har nå **16 rader; 8 av repoets 21 filer er registrert.**
  De fem ekstra radene er gamle migrasjoner repoet har slått sammen til
  `20260911073512_koe_kjerneskjema_rekonstruert.sql` — ikke drift.
  `supabase migration repair` krever fortsatt legitimasjon.

- **`AGENTS.md` sa at migrasjonene var ufullstendige. Det er de ikke lenger** —
  hver tabell, funksjon og trigger i `public` har sin DDL i repoet, kontrollert
  mot `pg_class`, `pg_proc` og `pg_trigger`. Setningen er rettet. Imperativet
  «bruk katalogen» står, med ny begrunnelse: repoet sier hva fila *sier*,
  katalogen sier hva som *kjører*.

- **`sak_metadata` har ingen indeks på `catenda_topic_id`.** Bare
  `sak_metadata_pkey` og `idx_sak_metadata_prosjekt`. Se felle 2 og RY-01.

- **Paginering bor ett sted:** `lib/supabase/paginering.py`. `all_rows`,
  `configs` og `get_all_sak_ids` deler den. De to første steppet før fast
  `+500`, som hopper over rader når serverens tak er lavere; den deler nå
  regelen «neste side starter der forrige faktisk sluttet».

- **KR-15: én test er flaky av konstruksjon.**
  `test_tst_02_samtidig_saksopprettelse…` er `xfail(strict=True)` over en
  `threading.Barrier`-reproduksjon. Målt **19 xfail og 1 XPASS på 20
  kjøringer** — altså rød gate omtrent hver tjuende suitekjøring, uten at noe er
  galt. Bruk et minutt på å kjenne igjen den før du feilsøker noe annet.

## 5. Hva som krever et menneske

- **`supabase migration repair`** — uendret.
- **MG-02s produktbeslutning:** skal en webhook opprette brukerrader for folk
  som aldri har logget inn hos oss? Uten et ja er `actorid TEXT` med to
  verdiformer formen journalen beholder.
- **Den rettslige avklaringen** om sletteplikt mot arkivplikt — uendret.
- **`viewer`-rollen** mot DB-05 — uendret.
- **KR-15:** gjøre reproduksjonen deterministisk, eller slippe strengheten og
  fange XPASS på annet vis. Begge endrer en dokumentasjonstest.

## 6. Hva som ikke skal gjøres om igjen

Alt fra forrige handoffs punkt 6 gjelder fortsatt. I tillegg:

- **Ikke gjeninnfør navneoppslag i en skrivesti.** KR-09 ble lukket ved å
  *slette* feltet, ikke ved å slå opp navnet. Se RY-07 for hvorfor det feltet må
  snus igjen når KR-04 gjøres.
- **Ikke la en skrivesti gå utenom `koe_register_project`.** Skranken om at et
  prosjekt ikke kan flytte virksomhet, finnes bare der. Se felle 3.
- **Ikke «rett» KR-15 ved å endre assertionen.** Testen dokumenterer en ekte
  svakhet i `JsonFileEventRepository`.
- **Ikke rediger de tre nye migrasjonene.** De er anvendt.

## 7. Hvor jeg ville begynt

**RY-01**, hvis du skal gjøre noe strukturelt. Tre spørsmål stilles til den
append-only journalen enda `sak_metadata` er projeksjonen som finnes for å svare
på dem. Den lukker KR-13, gjør både pagineringen og den nye indeksen
unødvendige, og fjerner `hasattr`-gjettingen i `lib/helpers/sak_lookup.py`.
Men les avsnittet om den manglende indeksen først.

**MS-05**, hvis du prioriterer frist over struktur. Den er den siste med frist
som ikke krever en menneskelig beslutning.

**Korrekthet er gjennomgått nå** — det var den åpne flaten forrige handoff
navnga, og den er lukket. Den nye åpne flaten er at **ingen av RY-funnene har en
reproduksjonstest**, og at funksjoner og triggere ikke inngår i de fem
katalogsnittene: at de finnes er kontrollert ved navn, ikke ved å sammenlikne
kroppene.
