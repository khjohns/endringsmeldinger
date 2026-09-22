# Review av testbevis og status for hovedplanen

> **Merknad 2026-09-22:** RTB-01–05 er innarbeidet. Testinventaret og
> testrevisjonen er rettet med daterte merknader, og den
> [sluttredigerte hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) er autoritativ. Se
> [redaksjonsprotokollen](sluttredigering-hovedplan-2026-09-22.md).

**Dato:** 2026-09-22.  
**Utgangspunkt:** `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (`main`).  
**Forrige ledd:** [Geminis testrevisjon](audit-testbevis-2026-09-22.md),
[testinventaret](vedlegg/testbevis-2026-09-22.csv) og
[oppfølgingsreviewet av konsolideringen](review-gemini-konsolidering-2026-09-22-v2.md).

## Vurdering og neste leveranse

Arkitekturretningen kan videreføres. Vi trenger ingen ny bred audit for å velge
retning. [Konsolideringen v2](konsolidering-masterplan-2026-09-22-v2.md) er et
nyttig arbeidsutkast, men er fortsatt merket reviewforslag. Den har ikke overtatt
for [gjeldende masterplan](plans/2026-09-16-godkjenning-og-varig-levering.md), og
den siste testrevisjonen er ikke innarbeidet. Testinventaret kan heller ikke
importeres ukritisk som funnstatus.

Neste dokumentleveranse bør være en sluttredigert hovedplan med én tydelig
inngang i dokumentasjonsindeksen, ikke enda en generell gjennomgang. Behold
funn-ID-er og vedtatte avgrensninger, korriger bevisstatus som beskrevet nedenfor,
og harmoniser Catenda-matrisen med de eksisterende kontrakttestene og det åpne
valget av dokumentmodell. Åpne designvalg skal fortsatt være synlige som åpne.

Arbeidsrekkefølgen fra AF-06 står seg: ekte PostgreSQL-verifikasjon, datalagets
sikkerhetsgrenser og deretter en komplett atomisk EO-flyt med outbox og minimal
worker. Domenefeil kan rettes i avgrensede parallelle arbeidspakker. Geminis
forslag til små rettinger må ikke erstatte transaksjonskontrakten.

## Funn

Alvorlighet gjelder risikoen ved å bruke dokumentene som implementeringsinstruks.

| ID | Alvorlighet | Funn |
| --- | --- | --- |
| RTB-01 | Middels | Inventaret gjenåpner GFK-04 og bruker feil ID-er for AP-04 og TFR-funn |
| RTB-02 | Middels | Den nye kappløpstesten garanterer ikke flettingen som skal reprodusere feilen |
| RTB-03 | Høy | Foreslåtte punktrettinger er utilstrekkelige for AP-04 og RV-02 |
| RTB-04 | Middels | Catenda-omtalen må bygge videre på tidligere verifikasjon og skille denne fra nye garantier |
| RTB-05 | Lav | Påstanden om feilfrie rapportlenker holder ikke |

### RTB-01 — status og ID-er

**Sted:** `docs/vedlegg/testbevis-2026-09-22.csv`, radene for
`test_stale_reserved_id_attempt_cannot_delete_successful_creation`,
`test_forsering_respons_mangler_godkjenningsstotte` og de fire `FR-*`-radene.

- Den første testen gjelder **AP-04**, ikke AP-01. Det er dokumentert i
  [den opprinnelige auditen](audit-godkjenningspanel-og-durable-levering-2026-09-16.md).
- **GFK-04 er en vedtatt avgrensning:** forsering står utenfor godkjenningsflyten.
  Masterplanen sier uttrykkelig at dette ikke er en ny feil. En test som forventer
  støtte for forsering kan feile uten at produktets vedtatte kontrakt er brutt.
  CSV-forslaget om å innføre slik støtte skal derfor ikke videreføres.
- `FR-01`, `FR-02`, `FR-03` og `FR-04` svarer til henholdsvis **TFR-02, TFR-03,
  TFR-04 og TFR-05** i [domeneauditen](audit-tilstand-forretningsregler-2026-09-18.md).

Fordelingen 25/3/14 er korrekt opptalt fra CSV-en, men «25 reproduserte brudd»
kan ikke brukes som antall bekreftede åpne feil. Minst GFK-04 er feilklassifisert;
øvrige rader er ikke fullstendig revidert i denne kontrollen.

### RTB-02 — testen styrer ikke det avgjørende kappløpet

**Sted:** [test_tst02_deterministisk.py](../backend/tests/test_audit_testbevis_20260922/test_tst02_deterministisk.py),
`test_tst02_samtidig_opprettelse_kolliderer_paa_felles_tmp_fil`.

Barrieren ligger før `append_batch`. Den sikrer ikke at begge skrivere har
observert at saksfilen mangler før første skriver fullfører. En lovlig trådplan
kan derfor gi én vellykket opprettelse og én `ConcurrencyError`. Testen avviser
dette korrekte utfallet med sin første assertion.

**Kjørt:** begge nye tester passerte (`2 passed`, fire advarsler). Den første
testfunksjonen passerte også 100 direkte repetisjoner. Med kontrollert rekkefølge
etter barrieren, der skriver 2 venter til skriver 1 har fullført den uendrede
repositorymetoden, feilet assertionen som forbyr `ConcurrencyError`.

Dette avkrefter determinismen, ikke den underliggende JSON-feilen. En egnet
reproduksjon må kontrollere flettingen ved den relevante eksistenssjekken og
beholde reell lagring. Den andre testen demonstrerer `Path.rename` isolert;
den er ikke en gjennomgående reproduksjon i applikasjonens repository.
Ingen eksisterende eller nye tester er endret i dette reviewet.

### RTB-03 — en grønn reproduksjon er ikke hele rettingskontrakten

**Sted:** testrevisjonens avsnitt 5, pulje 2; `EndringsordreService.opprett_endringsordresak`
og `EOApprovalService.reconcile`.

«Sjekk at hendelseslageret er tomt før metadata slettes» er utilstrekkelig når
sjekk og sletting ikke er atomiske. Nettopp en foreldet slik lesing inngår i den
opprinnelige AP-04-reproduksjonen. «Ikke rør pakker med aktiv lease» etablerer
heller ikke alene en atomisk grense for policy, fullmakt og utstedelse.

Bruk [transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) som
rettingskontrakt: felles transaksjon, samordnet låsing og versjonskontroll,
idempotent kommando og atomisk registrert leveringsintensjon. De eksisterende
reproduksjonene er deltester; de skal suppleres med ekte PostgreSQL-tester av
samtidighet og feilpunkter. Ikke flytt dette bak generell adapteropprydding.

### RTB-04 — gjenbruk Catenda-bevis; test tilleggene i leveringskontrakten

**Sted:** testrevisjonens avsnitt 6 og konsolideringens avsnitt 2.2.

[Catenda-dataflyten, avsnitt 10–11](catenda-dataflyt.md) dokumenterer tidligere
levende tester av statusbevaring, samme dokumentnavn som ny revisjon, unikt navn
som nytt item, dokumentreferanser, GUID-normalisering og relasjoner. Testene
finnes også i [kontraktskriptet](../backend/scripts/test_catenda_api_contracts_live.py)
og [mock-kontraktene](../backend/tests/test_integrations/test_catenda_mutation_contracts.py).
Dette er tidligere rapportert verifikasjon, ikke nye levende kjøringer i dag.

Det er ikke grunnlag for å gjenta hele denne API-gjennomgangen nå. Tilleggene er:

1. Lokale tester av commit/omstart, tapt HTTP-svar, utløpt lease, forsinket gammel
   worker og retry uten dupliserte domenehendelser eller ugyldige kvitteringer.
2. Smale levende kontrakttester dersom en valgt strategi avhenger av gjentatt
   opprettelse med samme klientvalgte GUID, sikker gjenfinning etter tapt svar
   eller dokumentkonflikt ved `failOnDocumentExists=true`. De leste tidligere
   testene dokumenterer ikke alle disse egenskapene.
3. Konservativ parkering som `USIKKERT_UTFALL` når utfallet ikke kan avgjøres.
   Lokale tester kan verifisere parkeringen; de beviser ikke Catendas garantier.

Testrevisjonens omtale av `upload_url` beskriver ikke dagens `upload_document`,
som sender filen med `Bimsync-Params`. GUID-støtte alene beviser heller ikke
idempotent opprettelse. Konsolideringens generelle krav om
`failOnDocumentExists=true` må avgrenses mot det fortsatt åpne valget mellom
separate brev og revisjoner av et felles dokument. Dagens `false` er brukt i en
tidligere verifisert revisjonsflyt; det er ikke i seg selv bevis for en API-feil.

### RTB-05 — relative lenker

**Sted:** `docs/audit-testbevis-2026-09-22.md`, lenker med målprefikset `backend/`.

En filkontroll relativt til rapportens mappe fant **73 brutte lenkeforekomster**
fordelt på **22 unike mål**, blant 83 lokale filhenvisninger. Backend-lenkene
trenger `../backend/`. Påstanden om 54 kontrollerte lenker uten feil er dermed
ikke etterprøvd med riktig oppløsningsgrunnlag. Rapportens opprinnelige tekst
er bevart med en datert merknad som peker på dette reviewet.

## Verifikasjon og grenser

**Kjørt og observert:** de to nye testene (`2 passed, 4 warnings in 0.07s`), 100
direkte repetisjoner av den første testfunksjonen, kontrollert seriell trådplan
etter barrieren, CSV-opptelling og kontroll av lokale filhenvisninger.
Testene brukte midlertidige filer; ingen levende API-test ble kjørt.

**Lest:** rapport, CSV, utvalgt kjørelogg, testkode, repositoryets opprettelsessti,
gjeldende funnstatus, konsolideringens relevante avsnitt og tidligere Catenda-bevis.

**Ikke kontrollert:** alle 42 reproduksjoner på nytt, hele testsuiten,
nettverksvaktens fullstendige dekning, nåværende Supabase-katalog, levende
Catenda-atferd eller alle krav i v2 på nytt. Dette er et avgrenset review og
opphever ikke uavklarte designvalg eller godkjenner v2 som autoritativ hovedplan.
