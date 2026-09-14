# Audit: PDF-generering og Catenda-levering

Dato: 2026-09-14. Utgangspunkt: arbeidskopien etter retting av AUD-01–07 i
[audit av godkjenning og event sourcing](audit-godkjenning-event-sourcing-2026-09-14.md).
Rettelsene fra begge arbeidsrundene og den etterfølgende synkfeilmeldingen samles i samme commit.

## Omfang

Kontrollert PDF-generering fra brev og sakstilstand, PDF-transport til Catenda,
midlertidige filer og HTTP-kvittering etter lagring. Kode og lokale tester er brukt;
ingen tokens, produksjonsdata eller eksterne tjenester er lest. Supabase/RLS er
utenfor omfang. Dette er en avgrenset delgjennomgang, ikke ferdig audit av hele
vedleggsflyten eller alle utgående Catenda-operasjoner.

## Bekreftede funn og rettinger

### PDF-01 — Høy: brukerinnhold blir ressurslastende ReportLab-markup — rettet

`LetterPdfGenerator._build_recipient` sendte navn, adresse og organisasjonsnummer
direkte til `Paragraph`. `ReportLabPdfGenerator._markdown_to_reportlab` escapet
bare `&`, og signaturfeltene ble også sendt direkte til `Paragraph`. En innsendt
`<img src="…"/>` nådde ReportLabs `ImageReader` fra disse feltene.

Brev-API-et tar imot mottakerfeltene fra en autentisert prosjektbruker. Saksrapporten
bruker blant annet lagret grunnlags-/kravtekst. Dette gir en kodevei fra brukerinput
til bildeoppslag. Både URL og lokal filsti er bekreftet frem til ImageReader;
faktisk nettverkstilgang, filuthenting eller lesing av hemmeligheter er ikke utført.
Signaturvarianten er bekreftet på generatornivå, uten påvist offentlig API-inngang.

Ti regresjonsvarianter feilet før retting med en blokkert ImageReader-spion.
Etter retting forsøker ingen av dem ressursoppslag. Brukertekst escapes før
ReportLab-markup dannes. Markdown støttes fortsatt; vilkårlig HTML blir tekst.
Sak-ID i rapportfooter og tekstinterpolasjoner i historikk er også escapet.

### PDF-02 — Middels: feilrespons etter vellykket event-commit — rettet

Enkeltinnsending lagret eventet før metadata-cache og Catenda-levering. Feil i disse
operasjonene ga henholdsvis HTTP 500 eller, ved Catenda-tokenfeil, HTTP 401. Dermed
kunne klienten få beskjed om mislykket innsending etter at hendelsen var lagret.
Tre Flask-tester bekreftet append etterfulgt av feilrespons før retting.
Batch-innsending hadde samme ukapslede cacheoppdatering.

Cache- og leveringsfeil etter commit logges nå uten å gjøre lagringen mislykket.
Enkeltinnsending beholder HTTP 201, event-ID og ny versjon; Catenda-feil gir
`catenda_synced=false` og `catenda_skipped_reason=error`. Batch beholder også 201
ved cachefeil. Autorisering og Catenda-preflight før commit er uendret.
Frosset brev i enkeltinnsending krever dessuten den leverte brev-PDF-en, som
allerede var innført for godkjenningspakkene i forrige audit.

Dette løser ikke krasj mellom event-commit og HTTP-respons, og innfører ikke durable
outbox eller generell idempotens på enkeltinnsending. Frontendens synkfeilvisning
er et eget UX-punkt nedenfor.

### PDF-03 — Middels: midlertidige dokumenter blir liggende ved feil — rettet

Opplasting/kobling kunne kaste før `os.remove`, og servergenerering kunne feile etter
opprettelse av tempfil. Begge stiene kunne etterlate kontraktsinnhold på disk.
Opplasting rydder nå i `finally`. Mislykket generering og skriving rydder også opp.
Tester dekker vanlig opplastingsfeil, tokenfeil og feil under servergenerering.
Prosesskrasj/SIGKILL og opprydding av eldre tempfiler er ikke dekket av dette.

### PDF-04 — Lav: ugyldig PDF-transport godtas — rettet

Base64-dekodingen var permissiv og kontrollerte ikke PDF-signatur. Vilkårlige bytes
kunne sendes videre som `.pdf`; dekodingsfeil kunne i stedet utløse en annen,
servergenerert rapport. Dette kunne skje etter at eventet var lagret.

`lib/pdf_input.py` krever streng base64 og `%PDF-`-signatur. Innsendingsruten avviser
feil før parsing/lagring av eventet. PDF-resolusjonen avviser feil i innsendt dokument
uten å erstatte det med en saksrapport. Tester dekker ugyldig koding, feil filtype,
tom verdi, feil datatype og gyldig transport.

Dette er en transportkontroll, ikke full PDF-validering eller sanering av aktivt
PDF-innhold. Den eksisterende standardgrensen på 16 MiB for hele HTTP-body gjelder
fortsatt; minnebruk, renderingskompleksitet og belastning er ikke lasttestet.

## Kontroller som passerer / avgrensninger

| Kontroll | Bevis / avgrensning |
| --- | --- |
| Eksternt topic velges fra saken | Eksisterende route-test avviser innsendt topic som avviker fra metadata før parsing og lagring. |
| Catenda-klient isolert per opprettelse | Factory lager ny klient/service; det er ingen delt klient som endrer board under samtidige kall i denne helperen. |
| Upload-/reference-respons kontrolleres | Eksisterende mutasjonskontrakttester passerer; klienten krever item-ID og reference-GUID før suksess. |
| Samlet leveringskvittering | Testene fra AUD-06 krever PDF, kommentar og status; en kommentar alene er ikke levering. |
| Frosset brev | Hash-/snapshot- og PDF-testene fra forrige audit passerer fortsatt. |
| Ingen generell nedlastingsproxy funnet i undersøkte Flask-ruter | Brev-API-et returnerer genererte bytes; dette er ikke en kontroll av frontendlenker, alle eksterne referanser eller fremtidige filendepunkter. |
| Rå HTML i brevseksjoner | Brevgeneratorens eksisterende markdown-konvertering escapet allerede input. De nye funnene gjaldt andre felt og saksrapportgeneratoren. |

## Gjenstående og avklaringer

- Global `project_id`/`library_id`/`folder_id` i Send/PDF-helperen er allerede
  dokumentert i [Catenda-dataflyten](catenda-dataflyt.md). Dette er ikke rettet eller
  markert OK her. Brukerens avtalte senere arbeid med prosjektmapping/inbox/outbox
  skal ikke omgås med en ny improvisert mapping.
- Kommentar-/dokumentduplikater etter delvis vellykket Catenda-kall, revisjons-ID-er,
  retry mot uendret frosset innhold og hele leveringskjeden trenger videre arbeid.
- Brukeren har valgt vedvarende synkfeilmelding nå. Implementert som beskrevet
  under, uten å innføre automatisk retry eller endre det planlagte outbox-arbeidet.
- Den eksisterende CloudEvents-skjemamapping-feilen for `internt_notat` fra forrige
  audit er fortsatt et eget, åpent punkt.

## Verifikasjon

```sh
cd backend
venv/bin/python -m pytest tests/test_services/test_pdf_security.py tests/test_routes/test_event_security.py tests/test_approval tests/test_services/test_konsekvensvarsler.py tests/test_services/test_catenda_service.py tests/test_integrations/test_catenda_mutation_contracts.py -q
```

Resultat: 152 tester passerer, fire eksisterende avhengighetsadvarsler.
Ruff på endrede filer i denne runden og `git diff --check` passerer.
Ingen frontendendringer i denne delgjennomgangen; tidligere frontendresultater
finnes i auditloggen for godkjenning. Ingen live Catenda-/Supabase-test er kjørt.

Ved gjenopptakelse: les begge auditlogger, brukerens siste UX-avklaring og git-diff.
«OK» gjelder de konkrete scenariene over, ikke full sikkerhet for hele systemet.


## Oppfølging: vedvarende synkfeilmelding

Brukeravklaring 2026-09-14: «Legg til vedvarende melding nå».

- Meldingen står under sakshodet i kontraktsbordet, også i mobilens matrisevisning.
  Bekreftet feil: «Lagret i appen, men ikke synkronisert til Catenda». Pending eller
  utilgjengelig kvitteringslager gir «Synkronisering til Catenda er ikke bekreftet».
  Ingen avvisningsknapp eller oppfordring til å sende domenehendelsen på nytt.
- Leveringskvitteringer lagres server-side i en egen SQLite-tabell i eksisterende
  `BH_APPROVAL_DB` (standard `koe_data/approvals.sqlite3`). De er avgrenset med
  prosjekt, sak og event-ID. Lagringsfilen må være på samme persistente volum som
  godkjenningsdata, tilgjengelig for instansene som betjener prosjektet. Løsningen
  har samme lokale SQLite-/replikabegrensning som eksisterende godkjenningslager.
- Intent registreres før offentlig append. Kan den ikke lagres, skjer ingen append.
  Mislykket append kan etterlate en kvittering, men den tas ikke med i visningen:
  bare ID-er som faktisk finnes i sakens eventstream telles. Krasj etter append
  eller feil ved siste kvitteringsskriving etterlater pending, ikke falsk suksess.
- En senere vellykket innsending skjuler ikke en eldre feil. Bare bekreftet levering
  for den berørte ID-en fjerner den feilen. Ingen ny retry-mekanisme er innført.
- For godkjenningsbrev leses eksisterende lagret `notificationStatus`; en vellykket
  leveringsretry rydder dermed banneret ved neste oppdatering. Kun samlet status og
  antall uavklarte leveranser sendes til case-context; privat brevinnhold eksponeres ikke.
- Deaktivert/ikke konfigurert integrasjon regnes ikke som leveringsfeil. Historiske
  enkeltinnsendinger før innføringen har ingen kvitteringer og etterregistreres ikke.
- Klienten beholder også mottatt feilstatus dersom oppdateringen etter innsending
  feiler; en eldre bakgrunnsrespons kan ikke fjerne denne meldingen.

Verifisert: 72 backendtester (`test_catenda_delivery_status`, `test_event_security`,
`test_approval`), 12 frontendtester (workspace og selve banneret), 0 typefeil / 19
eksisterende advarsler. Backendtestene inkluderer ny innlasting via autentisert
case-context, prosjekt-/saksgrenser, eldre feil etter nyere suksess og kvittering
fra godkjenningsretry. Ingen Supabase-/RLS-endringer eller live Catenda-kall.
