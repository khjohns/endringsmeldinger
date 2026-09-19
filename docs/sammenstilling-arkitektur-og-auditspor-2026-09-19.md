# Sammenstilling: arkitekturvurderingen mot Gemini-auditsporet (pass 1–9)

Gjennomført 19. september 2026, etter at det parallelle auditsporet landet på
`origin/main` som `f1167de`. Gjenstand: de ni passeringene i `507e225..f1167de`
holdt opp mot [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md), som var
skrevet mot `507e225` uten kjennskap til dem.

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

**Overlevering:** [handoff 2026-09-19](handoff-2026-09-19.md) samler miljøoppsett, fire metodiske
feller, etablerte fakta som ikke bør finnes ut på nytt, og de åpne beslutningene.
Start der om du overtar arbeidet uten kontekst.

**Metode og hvorfor den er poenget.** De to sporene brukte motsatt framgangsmåte,
og det er derfor sammenstillingen er verdt noe:

| | Gemini-sporet (pass 1–9) | Arkitekturvurderingen |
| --- | --- | --- |
| Kilde | Migrasjonsfiler, docstrings, kode | **Levende database og GitHub** |
| Live-tilgang | Bevisst ikke (`RUN_LIVE_SUPABASE` aldri satt) | Katalogspørringer 19.09 |
| Bredde | 60 funn over 9 avgrensede flater | 8 funn, strukturelt nivå |
| Form | 50 strenge `xfail`-reproduksjoner | Prosa med kontrollspørringer |

Sporet endret **ingen produksjonskode**: 4633 innsettinger, null slettinger,
utelukkende testfiler og dokumenter. Alle linjehenvisninger i
arkitekturvurderingen er derfor fortsatt gyldige, og ingen av dens funn er lukket.
Testsuiten står nå på **1440 bestått, 9 hoppet, 51 xfail** — de 50 nye er
reproduksjoner av funn som ikke er rettet.

---

## Sammendrag

Sporene motsier hverandre ikke. De ser det samme systemet fra hver sin side, og
sammenstilt gir de tre ting ingen av dem ga alene:

1. **Seks databasefunn lar seg avgjøre mot faktisk skjema.** Fire bekreftes, to
   har riktig premiss men feil konsekvens. Se under.
2. **Skjemadriften går begge veier.** Repoet kan ikke opprette databasen, og
   databasen inneholder kolonner intet repo-artefakt deklarerer. Det er et
   skarpere funn enn «skjemaet mangler en sannhetskilde».
3. **Tenant-attribusjonen på eksisterende hendelser er ikke etterprøvbar.** Tre
   uavhengige oslobygg-fallbacks virker samtidig, og ingen av dem etterlater spor
   av at de slo inn. Dette er bare synlig når DB-03, DB-06 og OBS-04 leses sammen,
   og det endrer rekkefølgen i arkitekturvurderingen.

Arkitekturvurderingens konklusjon står: behold domenet, bytt fundamentet. Den
styrkes av funn 3 og av at sporet uavhengig fant to nye tilfeller av nøyaktig den
lekkasjeformen AR-01 forutsa ville komme tilbake.

---

## 1. Avgjørelse av databasefunnene

Pass 1 leste migrasjoner og docstrings. Kontrollspørringen under traff faktisk
skjema i `endringsmeldinger` (`gwdxadexwktegkklyobv`) 19. september:

```sql
SELECT table_name, column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
  AND (column_name LIKE 'cached_%' OR column_name IN ('prosjekt_id','properties'));
```

| Funn | Gemini (migrasjoner/kode) | Faktisk skjema 19.09 | Utfall |
| --- | --- | --- | --- |
| DB-01 migrasjonskjeden feiler på tom base | Kjørt og observert | — | **Bekreftet.** Sterkere enn arkitekturvurderingens versjon, som bare leste docstringen |
| DB-02 åtte `cached_*`-kolonner mangler | Mangler i alle migrasjoner | **Alle åtte finnes** — pluss `cached_status` og `cached_title` | **Premisset riktig, konsekvensen feil** |
| DB-03 `DEFAULT 'oslobygg'` | I `004_projects_table.sql` | `'oslobygg'::text`, `NOT NULL` | **Bekreftet i basen** |
| DB-04 `sak_relations` mangler `prosjekt_id` | Lest ut av migrasjonen | **Mangler** | **Bekreftet** |
| DB-05 `role='viewer'` mot CHECK | Lest ut av migrasjonen | `CHECK (role = ANY (ARRAY['admin','member']))` | **Bekreftet** |
| DB-06 hendelsestabeller mangler `prosjekt_id` | Lest ut av docstringen | **Mangler på alle tre** | **Bekreftet — endrer fase 1** |
| DB-07 `properties` mangler på `sak_bim_links` | Mangler i migrasjonen | **Finnes** | **Premisset riktig, konsekvensen feil** |
| DB-08 views omgår RLS | Lest ut av koden | **Ingen views i `public`** | **Uten virkning i denne basen** |

**Om DB-02 og DB-07.** Funnene er korrekte om migrasjonene: kolonnene er ikke
deklarert noe sted i repoet. Men de oppgitte konsekvensene inntreffer ikke.
DB-02 sier at «enhver hendelsesinnsending som kaller `update_cache()` feiler
umiddelbart med `ERROR: column "cached_sum_krevd" does not exist`». Kolonnen
finnes i databasen, så det skjer ikke. Tilsvarende for DB-07. Testene som
reproduserer dem leser SQL-filer, ikke basen, så de vil forbli `xfail` uavhengig
av databasens tilstand — det er riktig atferd for «repoet kan ikke opprette dette
skjemaet», men det er en annen påstand enn den som står i konsekvensavsnittet.

Alvorligheten bør justeres fra Høy til Lav/Middels for begge, og begrunnelsen
omformuleres fra «krasjer» til «migrasjonen kan ikke reprodusere databasen».

**DB-08** gjelder ikke denne basen: versjonsvisningene finnes ikke. De kan
fortsatt gjenskapes fra docstringen i `supabase_event_repository.py`, så
anbefalingen om å fjerne SQL-en fra docstringen står.

---

## 2. Skjemadriften går begge veier

Sammenstilt gir DB-01, DB-02 og DB-07 et skarpere funn enn noen av dem alene:

- **Repoet kan ikke opprette databasen.** `sak_metadata`, `koe_events`,
  `forsering_events` og `endringsordre_events` finnes ikke i noen migrasjon. Pass 1
  kjørte kjeden mot en tom base og observerte at `004` krasjer. Bekreftet.
- **Databasen inneholder felter repoet ikke kjenner.** `cached_status` og
  `cached_title` står i tabellen, men i verken migrasjon eller docstring.

Ingen av de to artefaktene er altså sannhetskilden. Migrasjonene er ufullstendige,
docstringen er utdatert, og den eneste autoritative beskrivelsen av skjemaet er
databasen selv — som ikke er versjonert, ikke er kodegjennomgått og ikke kan
gjenskapes. For et system hvis journal skal kunne framlegges som bevis, er det et
selvstendig problem ved siden av AR-02: ikke bare kan historikken endres uten
spor, men strukturen den ligger i kan ikke rekonstrueres fra kildekoden.

Dette forsterker fase 0 uten å endre den. Punktet «DDL-en ut av docstringen og inn
i migrasjoner» må utvides: migrasjonene skal skrives ut fra **databasens faktiske
tilstand**, ikke fra docstringen, og deretter kontrolleres ved å kjøre dem mot en
tom Postgres og sammenlikne skjemaene.

---

## 3. Tenant-attribusjonen er ikke etterprøvbar

Dette er sammenstillingens viktigste funn, og det er usynlig i hvert spor for seg.

Fem uavhengige mekanismer tilordner `oslobygg` når prosjektet mangler (to av dem
funnet ved senere etterprøving):

| Lag | Mekanisme | Kilde |
| --- | --- | --- |
| Klient | `client.ts:11` sender `X-Project-ID: oslobygg` som standard | FE-05 (etterprøvd 19.09) |
| HTTP | `X-Project-ID` mangler → `g.project_id = "oslobygg"` | `lib/project_context.py:14,22` (arkitekturvurderingen, fase 4) |
| Database | `prosjekt_id` utelatt i INSERT → `DEFAULT 'oslobygg'` | DB-03, bekreftet i basen |
| Hendelse | `prosjekt_id` er None → `ce_source` hardkoder `/projects/oslobygg/…` | OBS-04 |

Legg til DB-06: hendelsestabellene har **ingen** `prosjekt_id`-kolonne. Prosjektet
finnes bare inne i tekststrengen `source`.

Konsekvensen er at en rad som sier `oslobygg` kan bety to forskjellige ting —
«saken hører virkelig til Oslobygg» eller «prosjektet manglet, og tre lag fylte
inn hver sin standardverdi» — og de to kan ikke skilles i ettertid. Ingen av
fallbackene etterlater spor.

Det har en praktisk følge for planen. Fase 1 forutsetter at en RLS-policy kan
skrives som

```sql
USING (prosjekt_id = current_setting('app.project_id'))
```

Det lar seg ikke gjøre på hendelsestabellene slik de er. Fase 1 får derfor et
forarbeid arkitekturvurderingen ikke hadde med:

1. Legg til `prosjekt_id` på `koe_events`, `forsering_events`,
   `endringsordre_events` og `sak_relations` (DB-04, DB-06).
2. **Backfill fra `sak_metadata`, aldri fra `source`.** `source` er skrevet av
   `ce_source`, som er én av de tre fallbackene, så en backfill derfra ville
   sementere feil leietaker som en verifisert verdi.
3. Fjern alle tre fallbackene i samme runde. Å fjerne én av dem alene gir falsk
   trygghet, siden de neste to fortsatt slår inn.
4. Sett `NOT NULL` uten default, slik at manglende prosjekt blir en feil.

**Og det viktigste:** dette er den eneste anbefalingen i hele materialet som har en
frist. I dag er databasen et utviklingsmiljø uten reelle data, så uskillelige
oslobygg-rader koster ingenting. Etter første produksjonsbruk er de permanente —
de kan ikke repareres i ettertid, fordi informasjonen som trengs aldri ble skrevet.
Tenant-grensen må etableres **før** ekte saker finnes, ikke som opprydding etterpå.

---

## 4. Hva sporet bekrefter i arkitekturvurderingen

**AR-01 er bekreftet empirisk, ikke bare argumentativt.** Vurderingen hevdet at
kryssprosjektlekkasjer vil komme tilbake på nye steder så lenge grensen bare finnes
i Python-dekoratører, og viste til RV-07 og RV-09 som to tilfeller av samme
feilform. Pass 2 fant, uavhengig og uten kjennskap til den påstanden, **fire til**:

| Funn | Rute eller kall |
| --- | --- |
| AUT-01 | `GET /api/forsering/<sak_id>/valider-grunnlag` evaluerer saker på tvers av prosjekter |
| AUT-02 | `GET /api/forsering/by-relatert/<sak_id>` returnerer forseringssaker fra andre prosjekter |
| AUT-05 | `ForseringService.hent_kandidat_koe_saker` mangler prosjektfiltrering |
| AUT-06 | `BaseSakService.hent_relaterte_saker` verifiserer ikke `prosjekt_id` |

Seks tilfeller av samme feilform, på seks ulike steder, funnet av tre ulike runder.
Det er ikke en serie uflaks. Det er signaturen til en grense som ligger feil sted.
DB-04 og DB-06 forklarer dessuten hvorfor den ikke kan flyttes uten skjemaarbeid
først: databasen mangler kolonnene en slik grense måtte hvile på.

**AR-06 er bekreftet og skjerpet.** TST-03 slår fast at rollback for
`EVENT_APPEND` i `TrackingUnitOfWork` er en ren no-op — bare en loggmelding.
Arkitekturvurderingen kalte den «best-effort kompensasjon»; for hendelser er den
ingen kompensasjon i det hele tatt. AP-04 og TST-03 beskriver samme svakhet fra
hver sin ende: AP-04 at kompensasjonen gjør skade når den kjører, TST-03 at den
ikke kjører for hendelser.

**AR-03 er bekreftet.** TST-05 finner at endringsordreopprettelse svelger
Catenda-nettverksbrudd uten outbox eller gjenoppretting. INT-05 finner at
`/api/events/batch` dropper Catenda-levering mens `CatendaDeliveryStatus`
rapporterer «clear» — altså et leveringsspor som aktivt feilinformerer.

**AR-04 er bekreftet og gjort billigere.** TST-04 fastslår at det ikke finnes noen
OpenAPI-spesifikasjon. Kontrollert: `backend/docs/` finnes ikke, og ingen generert
`openapi.yaml` eller `.json` ligger i repoet. `scripts/generate_openapi.py` er
2172 linjer som produserer noe ingen bruker. Fase 3 trenger altså ikke bygge
generatoren — den trenger å koble den til.

**AR-01, sidefunn.** CFG-05 finner at `SUPABASE_URL` og `SUPABASE_SECRET_KEY`
leses uvalidert via rå `os.environ` i sju repositories. Det er samme telling
arkitekturvurderingen gjorde, fra motsatt kant: sju repositories pluss den delte
klienten bruker tjenestenøkkelen.

---

## 5. Hva sporet fant som arkitekturvurderingen ikke så

Fire funn har strukturell betydning utover sin egen flate:

**OBS-01 (Kritisk): `AuditLogger` er død kode i hele applikasjonsflyten.** Ingen
kravsendelser, godkjenninger eller innlogginger logges til revisjonslogg. Dette
hører direkte sammen med AR-02: journalen kan endres uten spor, *og* det finnes
ingen uavhengig logg som ville registrert at det skjedde. De to funnene forsterker
hverandre og bør behandles i samme runde. Arkitekturvurderingen behandlet
append-only som et databaseproblem; OBS-01 viser at det heller ikke finnes et
kompenserende lag over.

**OBS-03 (Høy): `ce_time` kutter tidssone-offset** med `iso.split('+')[0] + 'Z'`,
som forskyver tidsstempelet to timer i norsk sommertid. I et system der
preklusjon avgjøres av når et varsel ble sendt, er dette en direkte feil i den
juridisk avgjørende verdien. Arkitekturvurderingen argumenterte for hendelsenes
bevisverdi uten å kontrollere at tidsstempelet er riktig.

**TFR-01 (Kritisk): `TE_AKSEPTERER_RESPONS` gjør et avslag fra byggherren om til
et godkjent grunnlag** og setter `kan_utstede_eo = True`. Dette er det alvorligste
enkeltfunnet i begge spor. Det er domenelogikk, ikke arkitektur, og det ville ikke
blitt fanget av noen av de fire strukturelle endringene — et argument for at
fundamentbytte ikke erstatter domenegjennomgang.

**TST-02 (Høy): `JsonFileEventRepository` mangler fillåsing** ved samtidig
opprettelse. Arkitekturvurderingen undersøkte Supabase-lagerets låsing og fant at
unikhetsbeskrankningen redder read-modify-write-racet. JSON-lageret har ikke en
slik beskrankning, og der er racet reelt. Det styrker fase 4-punktet om å fjerne
alternative lagerimplementasjoner.

Øvrige funn — FE-01 (CSRF-omgåelse i `LetterPreviewModal`), GFK-05 (TE kan
generere byggherrebrev), INT-04 (webhook omgår godkjenningsporten), CFG-01
(produksjonsoppstart med dev-nøkkel) — er alvorlige, men lokale. De hører i
masterplanens statustabell, ikke i en arkitekturvurdering.

---

## 6. Hva som fortsatt er uavklart i begge spor

Ingen av sporene har undersøkt:

- Sikkerhetskopiering og gjenoppretting, inkludert om en gjenoppretting kan utløse
  ny levering av allerede sendte brev.
- Rotasjon av `SUPABASE_SECRET_KEY` og Catenda-legitimasjon.
- Faktisk lastbilde og Catenda-kallfrekvens under samtidige brukere.
- Om anonym innlogging og OAuth-serveren er slått av i Supabase-konsollet.
  Beslutningen står i masterplanen; konsolltilstanden er ikke inspisert fra noen av
  sporene.

Metodisk gjenstår dessuten at Gemini-sporet aldri kjørte mot levende base. Denne
sammenstillingen lukker det for pass 1. De øvrige åtte passeringene er ikke
etterprøvd mot kjørende system, og funn merket «Lest ut av koden» bør behandles
som ubekreftede på samme måte som DB-08 viste seg å være.

---

## 7. Revidert rekkefølge

Arkitekturvurderingens fire faser står. To endringer følger av sammenstillingen:

**Fase 0 utvides med ett punkt.** Migrasjonene skrives ut fra databasens faktiske
tilstand, ikke fra docstringen, og kontrolleres ved å kjøre dem mot tom Postgres
og sammenlikne skjemaene. Uten det arver det nye skjemaet driften. De 50 nye
`xfail`-testene er samtidig en gevinst: de gjør fase 0 mer verdt enn før, fordi CI
da låser 51 dokumenterte svakheter mot stille gjeninnføring.

**Fase 1 får et forarbeid, og en frist.** `prosjekt_id` legges til på
hendelsestabellene og `sak_relations`, backfilles fra `sak_metadata` og ikke fra
`source`, og de tre oslobygg-fallbackene fjernes i samme runde. Dette må skje før
første produksjonsbruk, siden attribusjonen ikke lar seg rekonstruere etterpå.

Fase 2, 3 og 4 er uendret, men fase 3 er billigere enn antatt: generatoren finnes
allerede.

Én prioritering utenfor fasene: TFR-01 og OBS-03 bør rettes uavhengig av alt annet.
Begge korrumperer data i den juridisk avgjørende delen av domenet, og ingen av dem
løses av fundamentbyttet.

---

## Verifikasjon og grenser

Databasespørringene i del 1 traff faktisk skjema 19. september og er rene
katalogslesninger; ingen saksdata er lest og ingen skriving er utført.
Testtallene er fra kjøring av hele suiten etter at `origin/main` var slått inn i
arbeidsgrenen.

Funnene er siden vurdert enkeltvis i
[vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md), som etterprøver
22 av 60 mot kode og database og grupperer alle 60 i tolv rotårsaker. Den finner at
seks av de etterprøvde har riktig premiss og feil konsekvens, og at RV-07 ble lukket
per kallsted snarere enn som klasse.

Denne sammenstillingen har **ikke** etterprøvd de 52 funnene utenfor pass 1.
De er lest, gruppert og holdt opp mot arkitekturvurderingens påstander, men ikke
reprodusert uavhengig. Der teksten sier at et funn bekrefter eller skjerper et
annet, bygger det på begge dokumentenes egne beskrivelser — ikke på en ny kontroll.
Funn merket «Lest ut av koden» i Gemini-sporet er ikke skilt fra «Kjørt og
observert» i vurderingen over, med unntak av databasefunnene, der skillet er gjort
eksplisitt.
