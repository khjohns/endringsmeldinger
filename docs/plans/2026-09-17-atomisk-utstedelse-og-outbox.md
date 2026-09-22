# Atomisk utstedelse og varig levering

> **Merknad 2026-09-22:** Delplanen er underordnet den
> [sluttredigerte hovedplanen](2026-09-16-godkjenning-og-varig-levering.md).
> Kommando-, låse-, worker- og akseptansetestkontrakten her er normativ for F2.
> Rettighetsmodellen (herunder `SECURITY INVOKER` under) er åpen i B-02;
> relasjoner, KOE-eksklusivitet, dokumentmodell og drivmekanisme er åpne i
> B-01, B-08, B-03 og B-07.

> **Merknad 2026-09-21:** Referansene under til tre hendelsestabeller er
> innhentet av MS-01; referanseimplementasjonen skal bruke `hendelse`.
> Rettighetsmodellen, herunder `SECURITY INVOKER`/`DEFINER`, konkretiseres
> sammen med kommandoen og verifiseres med begrensede runtime-rettigheter.
> Se [AF-01–AF-06](../arkitekturforinger-2026-09-21.md) og masterplanens
> merknad samme dato. Dette er en designpresisering, ikke en gjennomføring.

Status: implementeringsforslag, 2026-09-17. Ingen migrasjon eller worker er
implementert i denne leveransen. Se [arbeidsplanen](2026-09-16-godkjenning-og-varig-levering.md)
og [auditen](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md).

Oppdatert etter [sikkerhetsetterprøvingen](../audit-sikkerhetsarkitektur-2026-09-17.md):
masterplanens krav til autorisert leselag, begrensede runtime-rettigheter og
restore gjelder også denne delplanen. RPC-rettighetene under er et utgangspunkt,
ikke en beslutning om å gi runtime generell skriverett til hendelsesloggen.

## Mål og første leveranse

Start med én komplett EO-flyt: siste godkjenning, offentlig utstedelse og
registrering av leveringsoppdrag skal enten lagres samlet eller ikke lagres.
HTTP-klienten skal ikke måtte sende en ekstra publiseringskommando for å sikre
framdrift. Catenda-kall skjer etter commit, med en selvstendig worker som starter
igjen etter omstart. Deretter kobles BH-svar, ordinære hendelser, dokumenter og
webhook til samme mekanisme.

AP-04 krever at metadata, hendelser og kvittering deler transaksjon. En lengre
lease eller enda en sjekk før `SakCreationService` lukker ikke feilen: en gammel
prosess kan våkne etter at en annen har skrevet. Den nye skrivestien skal ikke
bruke kompenserende sletting av metadata.

**Merknad 2026-09-19 — plattformen er avklart, og den styrker planen.**
Backend skal kjøre på Google Cloud, med Azure Container Apps som mulig senere mål.
Begge er serverløse containere med efemer disk og skalering til null. Det gjør
flyttingen fra `BH_APPROVAL_DB` under ikke bare riktig, men tidskritisk:
SQLite-fila slettes hver gang trafikken stilner, ikke bare ved utrulling, og to
instanser har to ulike godkjenningsdatabaser. Volummontering løser det ikke —
GCS FUSE gir ikke fillåsingen SQLite krever, og Azure Files og NFS har upålitelig
rådgivende låsing. Se [arkitekturvurderingen](../arkitekturvurdering-2026-09-19.md),
AR-03.

To ting til, fra [vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md):

- `deliver()` kjøres i dag inne i en forespørsel. På en tjeneste som skalerer til
  null finnes ingen retry-vei mellom forespørsler. Drivmekanismen — Cloud Scheduler,
  Cloud Tasks eller en fast instans — må velges sammen med outboxens plassering.
- Basisskjemaet som skal etableres under, må skrives ut fra databasens **faktiske**
  tilstand. Migrasjonene mangler `CREATE TABLE` for kjernetabellene (DB-01), og
  databasen har samtidig kolonner ingen migrasjon deklarerer. Docstringen er ikke
  en pålitelig kilde.

## Lagring og forutsetninger

Produksjonsgarantien gjelder PostgreSQL. Behold eksisterende hendelsesformater
og tabellene `koe_events`, `forsering_events` og `endringsordre_events`; en samlet
ny hendelsestabell er ikke nødvendig. Flytt godkjenningspakker, kommandokvitteringer
og relevante leveringskvitteringer fra `BH_APPROVAL_DB` til samme database som
hendelsene. JSON/CSV kan brukes i isolerte tester, men skal ikke presenteres som
en alternativ produksjonsimplementasjon med samme garantier.

Før migrasjonen skrives: etabler et reproduserbart basisskjema i lokale tester.
Eldre domenetabeller er ikke fullt beskrevet i de nyere Supabase-migrasjonene.
Verifiser faktisk skjema, nøkler og datatyper mot repository-kontraktene og de
eldre migrasjonene; ikke kopier uverifisert SQL fra docstrings. Appen har ingen
reelle produksjonsdata, så vi trenger ikke en periode med dobbel skriving.

Foreslåtte ansvar, med endelige navn fastsatt i migrasjonen:

| Entitet | Nøkler og ansvar |
| --- | --- |
| Godkjenningspakke | Prosjekt, pakke-ID, revisjon, status, frosset innhold/hash, eier, kjede og policyversjon. Intern tilgang. |
| Aktiv godkjenningspolicy | Prosjekt og monoton versjon; roller, kjede og beregningsgrunnlag som må kontrolleres ved utstedelse. |
| Kommandokvittering | Unik `(prosjekt, command_id)`, aktør, handling, request-hash og resultat. Samme ID med annet innhold avvises. |
| Saksstrøm | Unik `(prosjekt, sak_id)` og gjeldende versjon; gir en rad å låse også før første hendelse. |
| EO-nummerreservasjon | Unik prosjektavgrenset, normalisert EO-nummernøkkel; eksplisitt regel for store/små bokstaver. |
| KOE-tilknytning | Reservasjon som atomisk håndhever domenets regel for hvilke ordre en KOE kan tilhøre. En relasjonsprojeksjon alene er ikke låsen. |
| Outbox-operasjon | Stabil logisk nøkkel, prosjekt/sak/hendelse, operasjonstype, payload-versjon/hash, status, neste forsøk, antall forsøk og lease-token. |
| Leveringskvittering | Operasjons-ID, ekstern ressurs-ID, tidspunkt og nødvendig avstemmingsinformasjon. |
| Inbox-melding | Kilde, ekstern meldings-ID eller dokumentert dedupliseringsnøkkel, rå payload/hash, mottakstid og behandlingstilstand. |

Bruk prosjektavgrensede fremmednøkler der sammenhenger ellers kan krysse prosjekt.
Indekser arbeidskøen etter tilstand og neste forsøksdato, og pakker etter prosjekt
og aktiv status. Behold unik hendelses-ID og unik strømversjon. Fastsett behovet
for KOE-eksklusivitet fra forretningsregelen før reservasjonsskjemaet låses.

## Autoritativ utstedelseskommando

Foreslått intern RPC-kontrakt: `commit_eo_approval(project_id, package_id,
expected_package_version, command_id, actor_id, request_hash)`.
Den laster frosset ordreinnhold fra pakken; klienten kan ikke levere en ny ordre
med en gammel godkjenning. Resultatet inneholder pakkeversjon, sak-ID,
hendelses-ID-er og leveringsstatus `pending`, ikke et løfte om ferdig Catenda-synk.

1. Autentiser aktøren og kontroller prosjekt-/kontraktsrolle på serveren. RPC-en
   er kun tilgjengelig for backend. En `actor_id` sendt direkte av klienten er
   aldri identitetsbevis.
2. Lås aktiv policy, pakken og relevante saksstrømmer i en dokumentert, felles
   rekkefølge. Sorter strøm-ID-er ved flere KOE-er. Andre mutasjoner må følge
   samme låserekkefølge. Kontroller kommandokvitteringen på nytt under lås.
3. Kontroller pakkeversjon, aktiv godkjenner, gjeldende fullmakt/policyversjon og
   at innholdet fortsatt svarer til godkjenningen. En endret policy returnerer
   pakken og krever ny behandling. En allerede committet ordre kvitteres uten
   ny utstedelse. Gamle arbeidere får ikke skrive på en nyere pakkerevisjon.
4. Reserver nummer og KOE-tilknytninger. Kontroller forventede strømversjoner
   og domeneprevilkår under samme låser. Opprett metadata og hendelser, oppdater
   nødvendige relasjonsprojeksjoner og marker pakken utstedt.
5. Opprett outbox-operasjoner og kommandokvittering i samme transaksjon. Ved
   feil rulles alt tilbake; aldri slett metadata som kompensasjon etterpå.

Idempotens gjelder hele kommandoen. Konflikter er ikke automatisk suksess:
eksisterende kvittering må passe prosjekt, aktør og request-hash. En ukjent
unikhetskonflikt skal ikke tolkes som at denne pakken allerede er utstedt.

Policy er i dag miljøkonfigurasjon, med sats fra prosjektinnstillinger.
For å kontrollere endringer atomisk må relevant konfigurasjon få en versjon i
databasen, og policyoppdatering må bruke samme lås som utstedelse. Å sende en
hash av en gammel miljøvariabel til RPC gir ikke denne garantien. Ren
beregningslogikk kan fortsatt ligge i Python, men databasekommandoen må kontrollere
versjonen og pakkens låste beslutning. Endringer i kontraktsrolle/medlemskap er
en separat autorisasjonskontroll; Catendas eksterne medlemskap kan ikke låses i
vår Postgres-transaksjon.

RLS og eksplisitte rettigheter skal avskjære `anon` og `authenticated` fra
interne tabeller og RPC-er. Bruk `SECURITY INVOKER` med nødvendig backend-tilgang
og fast `search_path`; service_role i seg selv erstatter ikke prosjektkontroll
i applikasjonen. Ikke legg hemmeligheter i jobbpayload eller logger.

## Worker og Catenda

Worker tar et begrenset antall klare operasjoner med `FOR UPDATE SKIP LOCKED`
i en kort transaksjon, setter lease-token og frist og committer. Nettverkskall
skjer uten å holde radlåser. Kvittering og retry-oppdatering krever fortsatt
gyldig token. Bruk forsinkelse med jitter og økende intervaller; etter en
definert grense settes jobben til manuell behandling med synlig årsak.

En utløpt lease stopper ikke den gamle prosessen. Token hindrer at den
overskriver en nyere lokal kvittering, men kan ikke trekke tilbake et Catenda-kall.
Ved timeout etter mulig ekstern commit må adapteren finne eksisterende ressurs
med en stabil, verifiserbar referanse før ny opprettelse. Hvis API-et ikke tilbyr
idempotens eller sikker avstemming, marker utfallet som usikkert for manuell
avklaring. Ikke lov nøyaktig én ekstern levering.

Del leveringen i operasjoner med egne kvitteringer, eksempelvis topic,
PDF/artifact, dokumentopplasting, dokumentreferanse, kommentar og status.
Avhengigheter avgjør hva som kan kjøres; en vellykket opplasting skal ikke
gjentas bare fordi kommentaren feilet. Statusoppdateringer må også respektere
rekkefølge/ønsket revisjon, slik at et gammelt retry ikke setter en nyere sak
tilbake. Stabil operasjonsnøkkel avledes fra prosjekt, kildehendelse og effekt.

Prosjekt- og topic-board-identitet må være eksplisitt i alle jobber. Utgående
jobber fryser autorisert mål og konfigurasjonsversjon ved commit. Senere endret
mapping skal ikke omdirigere gamle brev; de parkeres for kontroll. Jobbpayload
kan ikke angi vilkårlig URL. Interne notater skal avvises ved innsetting av jobb.
Samlet leveringsstatus er avledet av alle obligatoriske operasjoners kvitteringer.
Utgående
EO-synk må støtte Supabase-registeret; dagens legacy-oppslag er utilstrekkelig.
Ved flere mulige boards kreves et eksplisitt utgående valg. Worker skal ikke
avhenge av Flask-request, brukerens aktive prosjekt eller standarden `oslobygg`.

PDF-er og vedlegg trenger varig privat lagring, frosset innholdsgrunnlag og
hash. En retry må ikke lage et annet brev fra siste sakstilstand. Filopplasting
til objektlager kan ikke inngå i Postgres-commit: bruk staging med opprydding av
foreldreløse filer, og referer først publiseringsklart innhold fra transaksjonen.
Interne vurderinger og uferdige vedlegg skal ikke lekke via leveringsjobbene.

## Neste adaptere

- **BH-svar:** flytt siste godkjenning, offentlige svarhendelser og outbox til
  samme kommando. Fjern avhengigheten av klientens andre publiseringskall og av
  at noen senere leser saken. Gjenbruk frosne ID-er og dokumentgrunnlag.
- **Ordinære hendelser og TE-innsending:** append av hendelser og opprettelse av
  alle nødvendige eksterne effekter i samme transaksjon. Retur til klienten
  skiller mellom lagret i appen og levert til Catenda.
- **Webhook:** kontroller avsender, lagre meldingen varig og dedupliser i inbox
  før vellykket HTTP-kvittering. Redis kan være cache, ikke eneste kvittering.
  Feil i prosjektkobling parkeres synlig. Behandling committer lokale hendelser,
  eventuelle outbox-jobber og inbox-kvittering samlet. Skill mellom ekko fra
  egen utgående synk og nye eksterne endringer.

## Akseptansetester før første utrulling

Bruk faktisk lokal PostgreSQL og uavhengige forbindelser. Injiser feil ved
hver skrivegrense; mocks alene beviser ikke transaksjonsgarantiene.

1. Avbrudd før commit gir ingen delvis pakke, metadata, hendelser eller jobber.
   Avbrudd etter commit før HTTP-svar gir samme resultat ved identisk retry.
2. To samtidige kommandoer for samme pakke, EO-nummer eller eksklusiv KOE gir
   én gyldig commit. En gammel arbeider som våkner etter lease-utløp kan ikke
   slette metadata, lage en ny ordre eller kvittere en nyere operasjon.
3. Policyendring og utstedelse konkurrerer om samme lås. Resultatet følger
   commit-rekkefølgen; policyendring før utstedelse krever ny godkjenning.
4. Etter prosessrestart blir ventende jobber kjørt uten GET eller ny brukerhandling.
   Timeout etter simulert Catenda-commit avstemmes; uavstembare svar blir synlige.
5. Feil mellom opplasting, referanse, kommentar og status gjenopptas fra siste
   kvittering. Gamle statusjobber kan ikke overstyre nyere ønsket tilstand.
6. Direkte tilgang som `anon`/`authenticated` avvises; backend-kommandoer kan
   ikke krysse prosjekt. Identisk command-ID med endret innhold avvises.

Drift må kunne se kødybde, eldste ventende jobb, gjentatte feil og usikre utfall
per prosjekt og operasjon. Manuell retry beholder logisk ID og revisjon og
logges. Innfør først EO-flyten bak eksplisitt konfigurasjon, med én autoritativ
skrivesti per prosjekt; steng den gamle kompenserende stien når den nye er aktiv.
Utvid til neste adapter først når testene over er grønne. En uavhengig sluttaudit
gjenstår før disse garantiene kan regnes som verifisert.

## Teknisk grunnlag

PostgreSQL beskriver `SKIP LOCKED` som egnet for kølignende arbeid, ikke som en
generell konsistent lesning: [SELECT](https://www.postgresql.org/docs/current/sql-select.html).
Supabase støtter [databasefunksjoner](https://supabase.com/docs/guides/database/functions)
og [Queues](https://supabase.com/docs/guides/queues). `pgmq` kan vurderes som
transport, men erstatter ikke den atomiske koblingen til domeneskriving eller
kvitteringer per ekstern effekt. Velg én kømekanisme i referanseimplementasjonen.
