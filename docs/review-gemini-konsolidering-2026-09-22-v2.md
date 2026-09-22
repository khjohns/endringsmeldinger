# Oppfølgingsreview av Geminis konsolidering v2

**Dato:** 2026-09-22. **Kontrollert commit:**
`0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (`main`).
**Status:** Arkitekturretningen støttes; konsolideringen trenger avgrensede rettelser
før den kan erstatte gjeldende masterplan.

Forrige ledd: [første review](review-gemini-konsolidering-2026-09-22.md),
[Geminis masterplan v2](konsolidering-masterplan-2026-09-22-v2.md),
[Geminis kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md) og
[oppdraget](prompt-gemini-konsolidering-2026-09-21.md).
Normative kilder er fortsatt [masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
[arkitekturføringene](arkitekturforinger-2026-09-21.md) og
[transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md),
lest med daterte rettelser.

Kontrollerte SHA-256-summer stemmer med Geminis overlevering:

| Fil | SHA-256 |
| --- | --- |
| Masterplan v2 | `b21cfa63def8e1ce8f2a260a4a20b10ad081b0840d79e581e223d89d828c80cc` |
| Kildegrunnlag v2 | `bd6919726a4c426f236492142319b6ea26e3ddc76e789b49b26c6338bdfca028` |

## Vurdering og behandling av forrige review

V2 er bedre. Minimal worker er flyttet inn i EO-referanseflyten, kommandoidempotens
er tydeligere, de seks utpekte produksjonskravene er tatt inn, og AUT-03 og
PG18-avviket er forklart riktig. Anbefalingene om PostgreSQL/RPC, begrensede
rettigheter, relasjonsintegritet og ren tilstandsberegning står ved lag.

Påstanden om at alle seks reviewfunn er fullstendig løst, holder likevel ikke.
Konsolideringen har rettet konkrete eksempler uten å fullføre avstemmingen av hele
kildegrunnlaget. Noen nye detaljer er dessuten innført som krav uten beslutningskilde.

| Tidligere funn | Vurdering av v2 |
| --- | --- |
| RGK-01 | Delvis rettet. Lokal idempotens, usikkert utfall og frosset mål er tydeligere; avstemming og worker-garantier trenger RGK2-01. |
| RGK-02 | Delvis rettet. De seks eksemplene og RV-14/17/18 er med; full dekning mangler fortsatt, se RGK2-02. |
| RGK-03 | De konkrete hovedrettelsene er innarbeidet: AUT-03, MG-04/05/08, GFK-04, app-kontekst og repository-filtrering. Dette lukker dokumentasjonsinnvendingene, ikke alle opprinnelige kodefunn. |
| RGK-04 | Delvis rettet. Worker og lagringsmigrering er tydeligere; fasekriterier og tabellplan er fortsatt inkonsistente, se RGK2-03. |
| RGK-05 | Årsaksforklaringen er rettet. Den lokale kontrollen fra første review gjelder fortsatt uendret kode; ingen ny ekstern verifikasjon følger av dette. |
| RGK-06 | Delvis rettet. Interpreter og historisk KR-15 er presisert; matrise og bevismerking trenger RGK2-05. |

## Gjenstående funn

Alvorlighet gjelder konsekvens ved bruk som implementeringsgrunnlag, ikke observerte
hendelser eller nye feil påvist i produksjonskoden.

| ID | Alvorlighet | Funn |
| --- | --- | --- |
| RGK2-01 | Høy | Avstemmingsgarantien må knyttes til hver API-operasjon; GUID-støtte alene er utilstrekkelig |
| RGK2-02 | Høy | Viktige sikkerhets- og integritetskrav mangler fortsatt i konsolideringen |
| RGK2-03 | Middels | Fasekriterier og presise tabelltall motsier planens oppgaver |
| RGK2-04 | Middels | Uavklarte driftsverdier og juridiske forutsetninger fremstår som vedtatt |
| RGK2-05 | Middels | Matrisen og verifikasjonsmerkingen støtter ikke påstanden om fullstendig konsolidering |

## RGK2-01 — avstemming må beskrives per ekstern operasjon

**Sted:** Masterplan v2, avsnitt 2.2 punkt 5–6 (linje 202–214), fase 2
linje 478–489 og akseptkriteriet linje 509. **Symbol:**
[`CommentsMixin.create_comment`](../backend/integrations/catenda/mixins/comments.py).

V2 forutsetter at worker alltid kan gjøre GET med en deterministisk Catenda-GUID
før ny POST. De lokale API-spesifikasjonene gir et mer konkret og nyttig grunnlag:

| Operasjon | Dokumentert i lokal OpenAPI | Dagens klient / gjenstående avklaring |
| --- | --- | --- |
| `createTopic` | Valgfritt `guid` i POST-body | `create_topic` sender ikke `guid`. Forhåndsvalgt ID er en kandidat. |
| `createComment` | Valgfritt `guid` i POST-body; GET av én kommentar finnes | `create_comment` sender bare kommentarinnhold. Forhåndsvalgt ID er en kandidat. |
| `createDocumentReference` | Valgfritt `guid` i POST-body; referanser kan listes | Klienten sender `document_guid`, men ikke referansens eget `guid`. De to ID-ene har ulike formål. |
| `createLibraryItem` for filopplasting | `failOnDocumentExists=true` avviser eksisterende filnavn i samme mappe; `false` oppretter ny revisjon | `upload_document` bruker `false`. Blind gjentakelse kan dermed gi en ekstra revisjon. Dette trenger en annen avstemmingsstrategi enn topic/kommentar. |

Kilder: [Topic API](tredjepart-api/topic-api-openapi.yaml), operasjonene ved
linje 666, 997 og 1131, og [Document API](tredjepart-api/document-api-openapi.yaml),
`createLibraryItem` og `failOnDocumentExists` ved linje 262. Begge spesifikasjonene
oppgir OpenAPI 3.0.3 og `info.version: 1.0`; dette er lokale kontraktssnapshots,
ikke verifikasjon av dagens eksterne tjeneste.

**Forhåndsvalgte GUID-er er altså dokumentert som mulige request-felt.** Planen
bør undersøke denne løsningen. Den må da persistere ID-ene før første kall og
gjenbruke dem for samme operasjon. De leste opprettelsesoperasjonene fastsetter
ikke hva som skjer ved gjentatt eller samtidig POST med samme GUID, eller samme
GUID med annet innhold. Disse egenskapene må verifiseres før GUID-støtten kan
brukes som en idempotensgaranti.

En vellykket GET uten treff er heller ikke alene bevis for at en tidligere POST
aldri vil fullføres. Eksempel: gammel worker har en forespørsel under behandling,
leasen utløper, ny worker søker uten treff og sender POST, så fullføres begge.
Uten ekstern unikhet/idempotens kan begge gi en effekt. Dette er et moteksempel
til garantien fra GET-before-POST alene, ikke en observert Catenda-hendelse eller
en påstand om at Catenda tillater to ressurser med samme GUID.

Transaksjonsplanen beskriver allerede begrensningen: lease-token beskytter lokal
kvittering, men stopper ikke et eksternt kall. V2s restart-test må også omfatte at
**den gamle workeren fortsatt lever**, ikke bare at den er død.

**Erstatt det generelle kravet med følgende kontrakt:**

> Hver ekstern operasjon får en dokumentert strategi for idempotens og avstemming.
> Lokal operasjons-ID og ekstern ressurs-ID er forskjellige begreper. Strategien
> skal beskrive hvordan ressursen kan gjenfinnes etter tapt svar, og når et negativt
> oppslag er tilstrekkelig grunnlag for et nytt opprettelseskall. Dersom dette ikke
> kan avgjøres sikkert, parkeres operasjonen som usikkert utfall. Ny worker får ikke
> anta at gammel workers eksterne kall stoppet da leasen utløp. Lokal kvittering og
> retry-oppdatering krever gjeldende lease-token.

Lag en liten matrise for topic, dokumentopplasting, dokumentreferanse, kommentar
og statusoppdatering: operasjonsnøkkel, ekstern nøkkel, avstemmingsmetode,
forutsetninger og håndtering når utfallet er ukjent. Eventuelle API-egenskaper som
ikke er verifisert, skal være åpne avklaringer før adapteren regnes som ferdig.

## RGK2-02 — full dekning krever mer enn de seks eksemplene

**Sted:** Masterplan v2, fase 1–2 og sporbarhetsmatrisen; kildegrunnlag v2,
avsnitt 4. **Motkilder:** masterplanens produksjonskrav (linje 304–309),
«Beslutninger som skal inn i implementeringen» (linje 671–701), og
transaksjonsplanens autoritative utstedelseskommando.

Følgende krav mangler fortsatt en konkret behandling eller er svekket i overføringen:

| Krav som skal bevares | Hva v2 må få inn |
| --- | --- |
| Atomisk fullmakts- og policykontroll ved utstedelse | RPC kontrollerer pakkeversjon, aktiv godkjenner, frosset innhold og gjeldende policyversjon under felles låserekkefølge. Policyendring konkurrerer om samme lås. Kildegrunnlagets RV-02-rad nevner låsing, men hovedplanens RPC-oppskrift lister hovedsakelig skrivingene. |
| Atomisk vedleggsbinding og vern av nyere utkast | Kontroller alle forventede vedlegg mot prosjekt, sak, eier/team og revisjon. Slett innsendt utkast bare hvis revisjonen fortsatt er gjeldende. Skanning erstatter ikke disse kontrollene. |
| Private data må avvises ved opprettelse av ekstern jobb | Interne notater skal ikke kunne havne i outbox selv om en rute glemmer filteret. Dead-letter-innsyn og manuell retry krever eksplisitt tilgang og reviderbar handling. |
| Tilgangs- og endringslogging | Sensitive lesinger og eksport logges, sammen med fullmakts-/prosjektendringer. Tokens og brevtekst skal ikke havne i standardlogger. |
| Tilbakekalling av medlemskap/fullmakt | Definer virkningstid og konsekvens for utkast, godkjenning og allerede committede brev. En delt rate limiter erstatter ikke dette kravet. |
| Kompatibilitet ved utrulling og tilbakerulling | Bevar kravet om lesbar historikk og hendelser skrevet under en nyere kodeversjon. En generell henvisning til enum-versjonering dekker ikke dette. |
| Negative tilgangstester og rollegrenser | Bevar testene for to prosjekter, motpart, to team på samme side, ukjent team og direkte ressurs-ID. Bevar Data API-testene for `anon`/`authenticated`, samt at runtime, worker, drift og migrering har avgrensede rettigheter. |

En konsolidering trenger ikke gjenta hele delplanen. Den kan uttrykkelig gjøre
delplanens kommando-, låse- og feiltestkontrakt normativ og mappe hvert krav til den.
En lenke i innledningen og en forkortet, tilsynelatende komplett RPC-oppskrift er
derimot for tvetydig som implementeringsgrunnlag.

**Ferdig når:** Hvert kildekrav har et konkret hjem, kildehenvisning og
akseptkriterium. Oppgaven er å avstemme hele planen; denne tabellen er dokumenterte
moteksempler til komplett dekning, ikke en erstatning for avstemmingen.

## RGK2-03 — fasegrensene er fortsatt ikke gjennomførbare som skrevet

**Sted:** Masterplan v2 linje 421–451, 490–503 og tabellutviklingen linje 616–628;
kildegrunnlagets MS-12-rad. **Symboler:**
[`VedleggRegistry.__init__`](../backend/services/vedlegg_registry.py),
[`CatendaDeliveryStatus`](../backend/services/catenda_delivery_status.py).

Fase 1 flytter utkast og godkjenningspakker, men krever at SQLite er **fullstendig**
fjernet fra kjøretiden. Vedleggsregisteret flyttes først i fase 2. Dagens kode har
dessuten leveringskvitteringer i SQLite. At to lagre flyttes, oppfyller derfor ikke
det oppgitte akseptkriteriet.

Tabelltallet 19 → 18 → 22 → 23 er et regnestykke over et utvalg oppgaver, ikke et
fastlagt målskjema. Eksempel: matrisen legger sammenslåing av `project_configs`
til fase 1 (MS-12), men tabellregnskapet har ikke med denne sammenslåingen.
Aktiv policy, reserveringer og leveringskvitteringer må også få en uttrykkelig
plassering før et eksakt målskjema kan utledes. De trenger ikke hver sin tabell,
men ansvaret kan ikke forsvinne i tellingen.

**Presis rettelse:** La fase 1 kreve at de navngitte private lagrene er flyttet
og skjermet, og før resterende lokale lagre med egen avviklingsmilepæl. Fjern
absolutte fremtidige tabelltall; erstatt dem med navngitte endringer og avhengigheter
fram til skjemaet er konkretisert. «Skjemaet er stabilt i fase 4–5» kan ikke garanteres
før de gjenstående kravene er avklart.

AF-03 er fortsatt «til videre vurdering» i beslutningsoversikten, men fase 2 sier
ubetinget at `sak_relations` beholdes. Skriv «forutsatt at anbefalt alternativ velges»
eller fastsett beslutningen eksplisitt ved godkjenning av planen.

## RGK2-04 — nye detaljer må skilles fra vedtatte premisser

**Sted:** Masterplan v2 linje 538, 568–570 og 597–609; kildegrunnlaget linje 111,
152 og 177–181.

- **«Evigvarende arkivplikt» er et nytt utsagn.** P7 fastsetter at journalen bevares
  og at kryptografisk sletting ikke skal bygges. Det gir ikke konsolideringen
  grunnlag for å fastsette en universell, evig oppbevaringsfrist. Behold den vedtatte
  modellen, og henvis detaljer om bevaringsomfang/-tid til ansvarlig avklaring.
- **Personvernombudet blir gjort til godkjenningsmyndighet.** V2 krever ombudets
  formelle godkjenning av DPIA. Datatilsynet beskriver ombudet som uavhengig rådgiver
  og kontrollør, mens beslutning og ansvar ligger hos behandlingsansvarlig.
  Skriv at ansvarlig virksomhet forankrer vurderingen med råd fra ombudet og øvrige
  relevante funksjoner. [Datatilsynet om personvernombudets oppgaver](https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/personvernombud/personvernombudets-oppgaver/).
- **15 minutter og maksimalt 24 timer mangler beslutningskilde.** Køalarmens terskel
  og fristen for sletting av stagingfiler kan være forslag, men skal merkes som det
  og begrunnes mot frister, drift og bevaring. Beskytt filer som fortsatt trengs for
  ventende/usikker levering og gjenoppretting.
- **«Ingen 429» er feil ferdigkriterium.** En innkommende rate limiter skal kunne
  avvise overlast. For utgående kall må planen beskrive håndtering av kvoteavslag,
  også når kvoter påvirkes av andre klienter. Mål belastning og ønsket svartid;
  v2 har fortsatt ikke disse kapasitetsmålene.
- **«Alle GET-ruter ... uten mutasjon» er for vidt.** Bevar RV-14 som forbud mot
  skjulte domeneendringer ved lesing. Skill dette fra nødvendig sesjonsvedlikehold,
  sikkerhetslogging og andre tekniske sideeffekter.

Dette reviewet gjenåpner ikke P7 og foretar ingen ny juridisk vurdering av journalen.
Det korrigerer hva dokumentene kan utlede fra beslutningen, og hvem som har ansvar
for videre avklaringer.

## RGK2-05 — kildegrunnlaget må bli etterprøvbart på radnivå

**Sted:** Kildegrunnlag v2 avsnitt 3–4 og 7–8; masterplan v2 svarmatrise.

Matrisen har fjernet de separate kolonnene for beslutningskilde og verifikasjon
fra oppdragets minimumsformat. Dermed blir «dagens observasjon» stående uten tydelig
skille mellom DDL, historisk katalog, kodelesing og kjøring. Definisjonen «Lukket i
kode / database» basert på kode **eller DDL** gjeninnfører dessuten forvekslingen
mellom en migrasjonsfil og en endring anvendt eksternt.

Konkrete rettelser:

- Radene for staging, rotasjon, skanning og andre gjeninnførte krav sier
  «Masterplanens status: Manglet i plan». De manglet i **v1-konsolideringen** og
  fantes allerede i masterplanen. Rett statuskolonnen og legg ved kildestedet.
- AR-04 (dobbel domenemodell), AR-08 (driftdetektorer) og FE-06 (inkonklusiv)
  mangler fortsatt eksplisitt mapping, til tross for påstanden om komplett dekning.
  Se [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) og
  [vurderingen av auditfunn](vurdering-av-auditfunn-2026-09-19.md).
- «Ingen tredjepartsrevisjon», «ingen formell driftsinstruks» og «ingen ... restore-øvelse»
  står fortsatt som observasjoner, mens verifikasjonsgrensene sier at ekstern status
  ikke er innhentet. Bruk «status ikke innhentet» konsekvent.
- De samlede testtidene er identiske med v1 (9,29 s og 31,10 s). Det beviser ikke
  at nye kjøringer mangler, men uten daterte rålogger kan reviewet ikke avgjøre
  hvilke tall som er ferske. Henvis til faktisk logg, eller merk dem som tidligere
  rapporterte resultater. Rett interpreter alene etablerer ikke ny testproveniens.
- Svarmatrisen i masterplan v2 viser RGK-05/06 til «avsnitt 8», men planen har bare
  avsnitt 1–7. En kontroll av filstier fanger ikke slike innholdsreferanser.

**Ferdig når:** Matrisen har kildested og verifikasjonskategori per rad, alle
opprinnelige ID-er er mappet, og bare faktisk undersøkte forhold omtales som
observert eller fullstendig verifisert.

## Anbefalt ferdigstilling

Behold v2s hovedstruktur og arkitekturretning. Rett punktene ovenfor målrettet;
en ny generell omskriving av hele dokumentpakken vil gjøre avstemmingen vanskeligere.
Bruk kildekrav som sjekkliste, og la konkrete delplaner være normative der de allerede
gir en mer presis kontrakt. Prioriter RGK2-01 og RGK2-02 før implementering.

Godkjenning av arkitekturretningen kan skilles fra godkjenning av konsolideringen
som autoritativ statuskilde. Det første støttes av dette reviewet. Det andre
forutsetter korrigeringene over. Ingen nye tekniske eller juridiske premisser
skal innføres som en skjult følge av språklig opprydding.

## Verifikasjon og grenser

**Kjørt og observert i denne runden:** HEAD og Git-status, SHA-256 for begge v2-filer,
kontroll av deres lokale inline-lenker, og avgrensede innholdssøk. Sjekksummene
stemmer med overleveringen; ingen tracked filer var modifisert. Alle 27
inline-lenkene til sammen ble behandlet, og ingen lokale filmål manglet.
Fragmentankre og referanser skrevet som vanlig tekst omfattes ikke av den kontrollen.

**Lest og sammenliknet:** Begge v2-dokumentene, første review og relevante deler
av masterplan, transaksjonsplan, arkitekturføringer og auditkilder. Dagens kommentar-
og topic-oppretting er lest for skillet mellom lokal nøkkel og mottatt GUID;
SQLite-lagrene er lest ved de navngitte symbolene. Datatilsynets veiledning er
kontrollert for rollefordelingen ved DPIA. Etter oppdragsgivers henvisning til
`docs/tredjepart-api/` er de fire relevante opprettelsesoperasjonene og tilhørende
oppslag lest målrettet fra lokal OpenAPI. Ruby/Psych ble brukt til å hente ut bare
aktuelle request-felt, parametere og svarreferanser. Ingen avhengigheter ble installert.

**Ikke kjørt på nytt:** pytest, frontend-tester, lint, typesjekk eller PostgreSQL-
bygging. V2 endrer dokumentasjon; den tidligere lokale kontrollen ved samme HEAD
er dokumentert i første review. Denne runden hevder ikke nye testtall eller
ny katalogverifikasjon.

**Ikke kontrollert:** Ekstern Supabase-tilstand, Catendas samtidighets-/idempotens-
garantier, kontrakter, organisatoriske prosesser utenfor repoet og rettslig
bevaringsfrist. Lokal OpenAPI bekrefter dokumenterte request-felt, men ikke utfallet
av parallelle kall eller gjentatt GUID. Moteksemplet under RGK2-01 er en analyse
av garantien, ikke en kjørt Catenda-test.

Dette er et review av konsolideringen, ikke en ny fullstendig applikasjonsaudit.
Bare dette oppfølgingsdokumentet er opprettet; eksisterende dokumentasjon,
produksjonskode, migrasjoner og tester er bevart.
