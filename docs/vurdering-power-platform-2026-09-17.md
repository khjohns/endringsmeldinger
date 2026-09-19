# Vurdering: ville Power Platform gitt oss tilgangsstyring, sikker lagring og transaksjoner uten kode?

Dato: 2026-09-17. Utgangspunkt: `5e4f01a`.

Spørsmålet som utløste dette: hvis løsningen heller var bygget på Power Platform —
Power Apps, Dataverse eller en annen Azure-database, et lakehouse for statistikk,
Power Automate — ville plattformen hatt innebygd den sikkerheten og kontrollen et
system for krav i totalentreprisekontrakter trenger?

Grunnlaget er de ti auditloggene i denne mappen, [Catenda-dataflyten](catenda-dataflyt.md),
[Catenda-innlogging](catenda-innlogging.md), [brev og intern godkjenning](brev-og-godkjenning.md)
og [arkitekturdiagrammene](arkitektur-diagrammer.md), sammenholdt med koden.

## Kort svar

**Ja til infrastrukturen, nei til domenet.** Det er et reelt og nyttig svar, ikke en
diplomatisk mellomting.

Teller man funnene i denne auditserien, ville Power Platform ha fjernet omtrent
halvparten av dem — men nesten ingen av de dyre. Sesjonshåndtering, CSRF,
dev-bypass, API-klientfeil, SQLite-forbindelser, utkast i `localStorage`,
midlertidige filer: hele denne klassen forsvinner fordi man ikke skriver den.
De sju AUD-funnene i [godkjenningsauditen](audit-godkjenning-event-sourcing-2026-09-14.md),
BE-03/BE-04 i [hendelsesflytauditen](audit-backend-hendelsesflyt-2026-09-15.md), AUD-06
og PERSIST-01 — altså alle funnene der konsekvensen er at feil part får penger, eller at
appen sier «levert» om noe som ikke ble levert — står igjen uendret.

To ting er verdt å si tydelig i tillegg, fordi de trekker i hver sin retning:

- Ett av auditseriens alvorligste funn, **BE-01** (motpartens interne notater var
  lesbare), ville plattformen ha hindret *bedre enn dagens kode gjør*. Det kommer jeg
  tilbake til i [del 3](#3-der-plattformen-ville-vært-bedre-enn-dagens-kode).
- **Lakehouse-delen av spørsmålet er den farligste.** Dataverse' rad- og
  kolonnesikkerhet følger *ikke* med i eksporten til Fabric eller Synapse. Et lakehouse
  for statistikk er et sikkerhetsbrudd på nøyaktig det BE-01 lukket, med mindre regelen
  bygges på nytt i kopien. Se [del 5](#5-der-plattformen-ville-vært-verre).

> **Oppfølging samme dag:** spørsmålet om durable inbox/outbox uten Dataverse er
> fulgt opp i [design for durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md).
> Den runden fant den strukturelle blokkeringen som gjør outbox-mønsteret utilgjengelig i
> dag: hendelseslageret nås over PostgREST, og et REST-kall kan ikke være med i en
> transaksjon. Den fant også at det ikke finnes noen bakgrunnsworker i repoet — dagens
> «retry» krever at et menneske trykker på knappen.

## Metode og forbehold

Dette er den delen som avgjør hvor mye vekt resten kan bære.

**Verifisert:** alt som sies om *dagens kode* er lest ut av repoet og krysspeilet mot
auditloggene. Der jeg påstår at en kontroll finnes eller mangler, står filen og linjen.

**Ikke verifisert:** alt som sies om *Power Platform*. Ingenting her er prøvd på et
Dataverse-miljø. Påstandene bygger på kjent plattformdokumentasjon og er
versjonsfølsomme — særlig tallene (API-grenser, oppbevaringstid for kjørehistorikk,
sikkerhetskopiretensjon) og hva som krever hvilken lisens eller Managed Environments.
**Verifiser dem mot gjeldende Microsoft-dokumentasjon før noen beslutning tas.**

Dette er en arkitekturvurdering, ikke en audit. Repoets regel om at hypoteser ikke
rapporteres som bekreftede funn uten reproduksjon gjelder fortsatt: ingenting under er
reprodusert på Power Platform, og skal ikke leses som om det var.

Vurderingen sier heller ingenting om NS 8407 eller om hva et rettslig holdbart
bevisspor krever. Den sier hva plattformen gir og ikke gir teknisk.

## 1. Hva systemet faktisk måtte bygge

Dette er inventaret spørsmålet skal måles mot. Hver rad er en kontroll som finnes i
koden i dag, med auditen som avdekket behovet.

| Kontroll | Hvor | Utløst av |
| --- | --- | --- |
| OAuth authorization code mot Catenda, state + nettleserbinding, engangsbruk | `lib/auth/catenda_oauth.py`, `routes/auth_routes.py` | [Catenda-innlogging](catenda-innlogging.md) |
| Sesjon: tilfeldig ID, kun hash lagret, `__Host-`-cookie, HttpOnly/Secure/Lax, 8 t | `lib/auth/session.py` | samme |
| CSRF sesjonsbundet, håndhevet ett sted for alle ikke-GET | `lib/auth/session.py` | [tilgangslaget](audit-tilgangslaget-opprydding-2026-09-15.md) funn 1 |
| Prosjektmedlemskap fra Catenda, maks 15 min gammelt, fail-closed 503 ved utløp | `services/auth_service.py:ensure_fresh` | [Catenda-innlogging](catenda-innlogging.md) |
| Kontraktsside (TE/BH) fra Catenda **team-ID**, aldri navn eller e-post | `services/auth_service.py:contract_membership` | [hendelsesflyt](audit-backend-hendelsesflyt-2026-09-15.md) BE-01 |
| Tvetydig teammedlemskap gir `(None, None)` — fail-closed | samme | samme |
| Interne notater filtreres på organisasjon ved serialisering | `lib/auth/event_visibility.py` | BE-01 |
| Hver refererte sak i payloaden må høre til prosjektet, rekursivt | `lib/auth/project_access.py:referenced_case_ids` | [tilgangslaget](audit-tilgangslaget-opprydding-2026-09-15.md) |
| Append-only hendelseslager, `UNIQUE(sak_id, versjon)` = optimistisk låsing | `repositories/supabase_event_repository.py` | [persistens](audit-persistens-gjenoppretting-2026-09-14.md) |
| Replay følger repository-rekkefølge, ikke veggklokke | `services/timeline_service.py` | AUD-05 |
| Serveren setter `aktor`, `aktor_rolle`, `aktor_team_id` — klienten kan ikke | `routes/event_routes.py` | BE-01 |
| Tilstandsregler per hendelsestype, ett validatorpunkt | `services/business_rules.py` | AUD-02/03, BE-03/04 |
| Frosset brev: SHA-256 over innholdet, kontrollert før godkjenning *og* publisering | `services/approval_service.py:digest` | AUD-01 |
| Fullmaktsmatrise håndhevet server-side med `Decimal`, ved pakking/godkjenning/publisering | `services/approval_authority.py` | AUD-07 |
| Kommando-ID mot gjentatt utføring; `BEGIN IMMEDIATE` + forventet versjon | `services/approval_service.py` | [persistens](audit-persistens-gjenoppretting-2026-09-14.md) |
| Unik `notificationAttemptId` per leveringsforsøk | samme | PERSIST-01 |
| Levering krever PDF *og* kommentar *og* statussynk — ikke bare én | `services/catenda_service.py` | AUD-06 |
| Vedlegg mellomlagres til hendelsen committer; frigis ved levering | `services/vedlegg_registry.py` | [vedleggsflyt](audit-vedleggsflyt-2026-09-15.md) |
| Vedleggsreferanse må være registrert på *denne* saken | `routes/event_routes.py:_krev_egne_vedlegg` | samme |
| Innholdskontroll: kjørbart innhold avvises, filtype må stemme | `lib/vedlegg_innhold.py` | samme |
| Teamavgrensede serverutkast med konfliktdeteksjon | `services/utkast_registry.py` | [utkastlagring](audit-utkast-serverlagring-2026-09-15.md) |

Det er 22 kontroller. Ingen av dem var gratis, og de fleste ble skrevet fordi en test
først feilet.

## 2. Hva Power Platform gir uten kode

Dette er den ærlige delen der plattformen vinner, og den er stor. Jeg lister det
konkret framfor å oppsummere det bort.

**Identitet og sesjon.** Entra ID erstatter hele den øverste blokken i tabellen over:
OAuth-dialogen, state-håndteringen, sesjonscookien, CSRF-tokenet, cookie-attributtene,
utløpshåndteringen. Man skriver det ikke, og kan derfor ikke skrive det feil. I tillegg
kommer ting appen ikke har i det hele tatt: MFA, Conditional Access, risikobaserte
policyer, Continuous Access Evaluation og sentral tilbakekalling. `AUTH-01` — dev-bypass
som kunne slås på i produksjon — er en funnklasse som ikke finnes, fordi det ikke finnes
noen `DISABLE_AUTH`.

**Radsikkerhet i Dataverse.** Forretningsenheter, sikkerhetsroller, eier-team,
Entra-gruppe-team, hierarkisikkerhet, deling per rad og kolonnesikkerhetsprofiler.
Dette er en moden modell, og den håndheves i *plattformen* — ikke i det enkelte
endepunktet. Det er en vesentlig forskjell, og jeg kommer tilbake til den i del 3.

**Transaksjoner.** Dataverse har ekte databasetransaksjoner. En synkron plugin i
pre-/post-operation kjører inne i plattformens transaksjon og kan rulle tilbake ved å
kaste. `ExecuteTransaction` gir atomisk flerradsskriving. Det er *bedre* enn dagens
oppdeling, der `BH_APPROVAL_DB` (SQLite) og hendelseslageret (Supabase) er to systemer
uten felles transaksjon — en avgrensning [persistensauditen](audit-persistens-gjenoppretting-2026-09-14.md)
protokollfører eksplisitt.

**Optimistisk samtidighetskontroll.** Dataverse Web API støtter `If-Match` med ETag på
oppdatering og sletting. Det dekker radnivået av det `expected_version` gjør. (Det
dekker ikke strømnivået — se del 4.)

**Alternate keys.** En unikhetsnøkkel på en tabell gir ekte upsert og duplikatsperre i
databasen. Det er riktig primitiv for webhookens idempotens på `event.id`, som i dag er
håndskrevet.

**Referanseintegritet.** `VED-01` — at `vedlegg_ids` godtok fri tekst, og at
«Godkjent av Prosjektleder 12.03.pdf» kunne vises som et vedleggsnavn til
BH-godkjenneren — kan ikke oppstå med en oppslagskolonne eller en N:N-relasjon. Feltet
*er* en referanse, ikke en streng som ligner på en.

**Sikkerhetskopiering og gjenoppretting.** Dataverse tar systemsikkerhetskopier og
støtter gjenoppretting til tidspunkt for produksjonsmiljøer. Det lukker punktet som har
stått åpent siden [persistensauditen](audit-persistens-gjenoppretting-2026-09-14.md):
«`BH_APPROVAL_DB` trenger varig lagring og restore-test før produksjon» — som nå også
omfatter usendte vedlegg og utkast. (Verifiser gjeldende retensjonstall.)

**Malware-skanning.** [Vedleggsauditen](audit-vedleggsflyt-2026-09-15.md) er eksplisitt
på at `lib/vedlegg_innhold.py` **ikke** er virusskanning, og at ekte skanning krever en
ekstern tjeneste som ikke finnes i repoet. Med SharePoint eller OneDrive som vedleggslag
får man Defender for Office 365 Safe Attachments. Punktet lukkes uten egen tjeneste.

**DLP og Purview.** Power Platform DLP-policyer klassifiserer konnektorer og kan hindre
at kontraktsdata kobles til en privat konnektor. Purview gir sensitivitetsmerker,
kryptering og oppbevaringspolicyer. Kundeadministrerte nøkler og dataresidens i Norway
East er tilgjengelig. Ingen av delene har en motpart i dagens løsning, og i en
organisasjon med flere utviklere er DLP en reell styringsgevinst.

**Godkjenninger.** Power Automate Approvals gir tildeling, påminnelser, **delegering**,
fraværshåndtering og handling fra Teams eller Outlook, med historikk i Dataverse. Kombinert
med Graph `/users/{id}/manager` — som [arkitekturdiagrammene](arkitektur-diagrammer.md)
allerede peker på — dekker det nøyaktig det [brev-og-godkjenning](brev-og-godkjenning.md)
i dag fører opp som ikke implementert: «Microsoft Graph, dynamiske fullmaktsgrenser,
delegering og fraværshåndtering er ikke koblet til.»

**Lesetilgangslogg.** Med Dataverse-revisjon og Purview-aktivitetslogg får man svar på
«hvem åpnet motpartens sak, og når». Det finnes ikke i dagens løsning i noen form.

**ALM.** Miljøer, løsninger, pipelines, miljøvariabler og koblingsreferanser er et
mer modent oppsett enn `deploy.sh` pluss en Flask-container.

## 3. Der plattformen ville vært bedre enn dagens kode

To steder, og det første er viktig nok til å stå alene.

### BE-01 ville ikke kunne gjenoppstå

I dag ligger skjermingen av interne notater på **serialiseringen**, i fire kallsteder:
`routes/event_routes.py:1112` og `:1184`, og `routes/related_cases_utils.py:80` og `:140`.
Det er en disiplinregel: et nytt lesepunkt som glemmer `visible_events()` åpner hullet
på nytt.

Det er ikke et tenkt scenario. Det har allerede skjedd én gang, og auditen fører det opp
som akseptert restsignal: `/api/analytics/timeline` går ikke gjennom filteret. Der
teller et internt notat med i en aggregering. Det er en liten lekkasje, men den er av
samme familie som funnet, og den står igjen fordi filteret ligger i kallstedet.

I Dataverse ville notatet vært en egen tabell med eier-team, og
lesetilgangen en eierskapsbasert sikkerhetsrolle. Da håndheves den på *alle* veier inn:
Web API, modelldrevet skjema, Avansert søk, Excel-eksport, en flyt noen bygger senere,
en Power BI-rapport mot Dataverse-konnektoren. Det er en sterkere garanti enn
et filter, og den kan ikke glemmes på ett endepunkt.

Dette er det beste enkeltargumentet for Dataverse i denne saken.

### Word-maler fjerner PDF-01-flaten

[`PDF-01`](audit-pdf-catenda-2026-09-14.md) var at brukerinnhold — mottakernavn, adresse, organisasjonsnummer, lagret
kravtekst — gikk rett inn som ReportLab-markup, og at en innsendt `<img src="…"/>` nådde
`ImageReader`. Rettingen var å escape før markup dannes.

En Word-mal med feltfletting har ikke den flaten: det finnes ikke et markup-språk i
feltverdien å bryte ut av. Man bytter riktignok kontroll over byte-eksakt utforming mot
det, og «Konverter til PDF» i en tredjepartskonnektor legger en ny part i tillitsgrensen.
Men selve sårbarhetsklassen forsvinner.

## 4. Der koden fortsatt må skrives

Her er grensen, og den er skarpere enn den ofte fremstilles.

**Autoriteten er mastret utenfor plattformen.** Dette er det strukturelle problemet.
Dataverse antar at det selv er autoritativt for hvem som er hvem. Her er Catenda kilden:
`contract_membership` gjør et ferskt oppslag mot Catenda per beskyttet forespørsel,
`ensure_fresh` nekter tilgang med 503 når medlemskapet er eldre enn
`AUTH_MEMBERSHIP_MAX_AGE_SECONDS`, og nedetid hos Catenda forlenger ikke gamle tilganger.

Speiler man Catenda-team inn i Entra-grupper og videre til Dataverse-team, får man en
kjede med forsinkelse i hvert ledd, og den feiler **åpent**: svikter synkroniseringen,
blir raden stående, og tilgangen består. Dagens design feiler lukket, og
tilbakekallingsvinduet er en konfigurerbar parameter man kan svare på.

Det er ikke uløselig — en plugin kan kalle Catenda synkront — men da har man skrevet
`contract_membership` på nytt, i C#, med Dataverse' egne tidsbegrensninger for plugins
og et eksternt kall i skrivebanen.

**Fullmaktsmatrisen, og fellen som gjentar seg.** `AUD-07` var at beløpsgrensene bare lå
i `src/lib/approval/authority.ts`. En kjede med bare Prosjektleder godkjente og
publiserte 300 000 kr mot en grense på 200 000. Rettingen var serverhåndheving med
`Decimal` på tre punkter.

Power Platform har ingen fullmaktsprimitiv. Verre: plattformen inviterer til nøyaktig
samme feil. En **business rule** eller validering i en canvas-app er klientside og
omgås av Web API-et, av Excel, av en flyt. Bare en **synkron plugin** er en garanti som
gjelder uansett vei inn. Dette er en kjent Power Platform-felle, og den er identisk med
`AUD-07` — bare flyttet.

Den samme observasjonen forklarer BE-04. Der gikk `/api/forsering/*` utenom
validatoren, slik at samme hendelse ble avvist av én rute og godtatt av en annen.
Det problemet er *større* på Dataverse, ikke mindre, fordi det er flere veier inn i en
tabell enn det er ruter i et Flask-API. Kun plugin-registrering dekker dem alle.

**Event sourcing og uforanderlighet.** Dataverse er et CRUD-lager. Det finnes ingen
append-only-garanti, ingen strømversjon, ingen replay. Revisjonsloggen er
administrativ telemetri: nyttig, men en systemadministrator kan slå den av og slette
den. Den er ikke et bevissikret hovedbok.

Vil man ha ekte uforanderlighet i Azure, er svaret **ledger-tabeller i Azure SQL** —
append-only tabeller med kryptografiske sammendrag som kan publiseres til uforanderlig
lagring. Det er faktisk *sterkere* enn det appen har i dag, der append-only er en
konvensjon håndhevet av applikasjonskoden pluss én unikhetsskranke: den som har
service-nøkkelen til Supabase kan skrive om `data` i `koe_events`. For en sak som kan
ende i tvist, er dette verdt å merke seg som en reell mulighet til å bli bedre — men den
ligger i Azure SQL, ikke i Dataverse.

**Frosset brev, hendelsesrekkefølge, referansekontroll.** SHA-256 over brevet kontrollert
på to punkter (AUD-01), replay etter repository-rekkefølge (AUD-05), `referenced_case_ids`
rekursivt gjennom payloaden, «responsen må peke på den revisjonen som faktisk besvares»
(AUD-04): ingenting av dette har en plattformmotpart. Alt skrives som plugin-kode.

**Flerstegs eksterne sideeffekter — og her blir det verre.** `AUD-06` var at et godkjent
brev kunne merkes levert uten at PDF-en var lastet opp eller kommentaren postet.
`PERSIST-01` var at et gammelt leveringsforsøk kunne overskrive en nyere kvittering.
Den durable outboxen for webhookens sideeffekter står fortsatt åpen.

**Power Automate er ikke transaksjonell.** En flyt er en sekvens konnektorkall med
retry-policy og kjørehistorikk, uten tilbakerulling. En flyt som feiler midtveis
etterlater delvise eksterne effekter, akkurat som i dag — men logikken ligger nå spredt
over flytsteg framfor i én testet funksjon. Idempotensnøkler finnes ikke på
konnektorhandlinger. «Ble PDF-en faktisk lastet opp *og* koblet *og* kommentaren postet,
og er dette gjeldende forsøk» er fortsatt din kode, med dårligere verktøy til å skrive
den.

Og observasjonen fra [handoffen](handoff-2026-09-15.md) — at «sendt» har tre svar i dette
systemet (`submit_event`, `submit_batch`, `ApprovalService.publish`), og at en ny
innsendingsvei må kobles til alle tre — blir ikke enklere av at de tre veiene blir til
tre flyter.

**Tekstsamarbeid.** Det åpne kravet fra [utkast og samarbeid](audit-utkast-samarbeid-2026-09-14.md)
om fletting av samtidige endringer og tilstedeværelse har ingen motpart. Dataverse-rader
er siste-skriving-vinner, altså svakere enn dagens 409-konfliktdeteksjon. Flytter man
teksten inn i Word på SharePoint får man ekte samredigering — men da ligger teksten
utenfor hendelsesloggen, og revisjonsfrysingen som hele godkjenningsmodellen hviler på
går i stykker.

## 5. Der plattformen ville vært verre

### Lakehouse for statistikk bryter konfidensialitetsregelen

Dette er den viktigste enkeltadvarselen i hele vurderingen.

Dataverse Link to Fabric og Azure Synapse Link eksporterer tabelldata til OneLake eller
ADLS **uten at Dataverse' sikkerhetsroller, radsikkerhet eller kolonnesikkerhet følger
med**. Kopien er en ny sikkerhetsgrense, og den starter åpen.

BE-01 slår fast at *at* en organisasjon har gjort en intern vurdering i seg selv er
opplysning motparten ikke skal ha — derfor fjernes notatet i sin helhet, ikke bare
teksten. Et lakehouse som speiler hendelsestabellen gir motpartens analytiker både
teksten og det faktum. Regelen må da bygges på nytt i kopien, med egen radsikkerhet i
Fabric eller Power BI, og holdes i synk med den i Dataverse.

Det er ikke et argument mot lakehouse. Det er et argument for at «lakehouse for
statistikk» i *dette* domenet er en egen sikkerhetsleveranse med egen audit, ikke en
avkrysning i et oppsett.

### Auditmetoden som fant feilene forsvinner

Alle 22 kontrollene i del 1 ble skrevet fordi en test først feilet. Baselinen er 1278
backendtester og 529 frontendtester, og hele suiten kjører **uten nettverkstilgang** —
en egenskap [hendelsesflytauditen](audit-backend-hendelsesflyt-2026-09-15.md) rettet
bevisst og ba om å beholde.

Det finnes ingen pytest for en canvas-app. Test Studio er tynt, Power Apps Test Engine
er nytt og begrenset, og flyter testes i praksis ved å kjøre dem. Plugins er C# og *kan*
enhetstestes ordentlig, og det er den seriøse veien — men da har man flyttet
domenelogikken ut av plattformen og inn i kode igjen, og gevinsten fra del 2 gjelder ikke
den delen.

Det er verdt å stå ved: **de fleste av funnene i denne serien ville ikke blitt funnet på
Power Platform**, fordi mekanismen som fant dem ikke finnes for det meste av flaten.
[Utkastauditen](audit-utkast-serverlagring-2026-09-15.md) går enda et skritt: da elleve
nye tester passerte på første forsøk, ble to mutasjoner innført i implementasjonen for å
se at testene faktisk bet. Den formen for selvkontroll har ingen motpart her.

### Autolagringen treffer API-grensene

Den åpne oppgaven i [handoffen](handoff-gpt-astra-2026-09-15.md) er kallfrekvensen mot
Catenda: utkastene lagres hvert 1,2. sekund under skriving.

Mot Dataverse treffer den samme frekvensen plattformens tjenestebeskyttelsesgrenser —
dokumenterte tak per bruker per server for antall forespørsler, samlet kjøretid og
samtidighet i et rullende vindu. Å skrive et avsnitt kan bli titalls skrivinger.
Grensene er ikke justerbare på samme måte som en egen backend. Handoffens alternativ 2
(«lagre sjeldnere») går fra å være ett av fire valg til å bli påkrevd.

*Tallene bør verifiseres mot gjeldende dokumentasjon; mekanismen gjør det uansett til en
reell begrensning.*

### Eksterne brukere: identitet og lisens

To konkrete problemer.

**Identitet.** `lib/auth/catenda_oauth.py` har ingen `id_token`-håndtering — identiteten
hentes med et API-kall til `/v2/user` etter kodeveksling. Det er ren OAuth 2.0, ikke
OIDC, og [Catenda-innlogging](catenda-innlogging.md) noterer i tillegg at PKCE ikke er
aktivert for applikasjonen. Power Pages' standardoppsett for eksterne
identitetsleverandører forutsetter OIDC med discovery. **Catenda vil derfor trolig ikke
kunne kobles inn som identitetsleverandør uten egen kode.** Dette er lest ut av vår kode,
ikke bekreftet med Catenda, og bør avklares med dem før det legges til grunn.

**Lisens.** Systemets hele poeng er samhandling mellom BH og TE, altså eksterne parter.
Ekstern tilgang til Power Apps eller Power Pages lisensieres per bruker eller per
autentisert bruker, og Dataverse-lagring (database, fil og logg) måles separat —
revisjonslogger belaster loggkapasiteten. Dette er ikke en fotnote i denne saken, og det
bør prises før arkitekturen velges.

### Vedleggsbeslutningen dras motsatt vei

[Vedleggsauditen](audit-vedleggsflyt-2026-09-15.md) og handoffene slår fast: Catenda er
eneste lagringssted, ingen parallell blob, fordi to kopier kan divergere og «hvilken fil
ble faktisk sendt» må ha ett svar.

Power Platform trekker mot Dataverse-filkolonner eller SharePoint som dokumentlager.
Gjør man det, gjenoppstår tokopiproblemet som prosjektet allerede har tatt stilling til.
Plattformens beleilige vei går altså mot en beslutning som er tatt av gode grunner.

### Kjørehistorikk er ikke et bevisspor

Kjørehistorikken for skyflyter oppbevares i en begrenset periode (dokumentert som 28
dager på skrivende tidspunkt — verifiser). I et system der spørsmålet «hva ble sendt,
når, av hvem» kan bli stilt flere år senere i en tvist, kan ikke leveringshistorikken
ligge der. Den må skrives til varige tabeller uansett — altså din kode igjen.

## 6. Funn for funn

Kolonnen «Dekket» gjelder bare om plattformen ville hindret *den konkrete feilen*.

| Funn | Hva som gikk galt | Dekket av Power Platform? |
| --- | --- | --- |
| [AUTH-01](audit-autentisering-2026-09-14.md) | dev-bypass kunne brukes i produksjon | **Ja** — klassen finnes ikke |
| [CSRF-funnet](audit-tilgangslaget-opprydding-2026-09-15.md) | dobbel håndheving, feil rekkefølge, 403 i stedet for 401 | **Ja** — skrives ikke |
| [CLIENT-01…04](audit-klient-prosjekt-sesjon-2026-09-14.md) | API-klient, prosjektheader, tokencache | **Ja** — skrives ikke |
| [PERSIST-02/03](audit-persistens-gjenoppretting-2026-09-14.md) | SQLite-forbindelser, lesing som skriver | **Ja** — bortfaller |
| [Utkastlekkasjen](audit-utkast-serverlagring-2026-09-15.md) | Bobs skjema fikk Alices tekst fra `localStorage` | **Ja** — mønsteret finnes ikke |
| [PDF-03](audit-pdf-catenda-2026-09-14.md) | midlertidige filer ble liggende ved feil | **Ja** — bortfaller |
| [PDF-01](audit-pdf-catenda-2026-09-14.md) | brukerinnhold ble ReportLab-markup | **Delvis** — Word-maler fjerner flaten |
| [VED-01](audit-vedleggsflyt-2026-09-15.md) | `vedlegg_ids` godtok fri tekst | **Ja** — oppslagskolonne, ikke streng |
| [BE-01](audit-backend-hendelsesflyt-2026-09-15.md) | motparten kunne lese interne notater | **Ja, og bedre** — eier-team i plattformen |
| [AUD-01](audit-godkjenning-event-sourcing-2026-09-14.md) | tilbakekalt godkjenner beholdt rett på eksisterende pakke | **Delvis** — tilgang ja, policyversjon nei |
| BE-02 | internt notat utløste utgående levering | **Nei** — triggerfilter er din logikk |
| BE-03 | forseringssporet hadde ingen tilstandsregler | **Nei** |
| BE-04 | forseringsrutene gikk utenom validatoren | **Nei — verre.** Flere veier inn per tabell; kun synkron plugin dekker alle |
| AUD-02 | reviderte svar gikk utenom lås og oppstartskontroll | **Nei** |
| AUD-03 | ny opprettelseshendelse omgikk oppdateringslås | **Nei** |
| AUD-04 | gammelt krav kunne besvares som om det var siste | **Nei** |
| AUD-05 | replay sorterte etter tidsstempel | **Gjelder ikke** — ikke event-sourcet; annen feilmodus |
| AUD-06 | «brev levert» uten PDF eller kommentar | **Nei — verre** i Power Automate |
| AUD-07 | beløpsgrensene var bare visning | **Nei — og fellen gjentar seg** som business rule eller canvas-validering |
| [PERSIST-01](audit-persistens-gjenoppretting-2026-09-14.md) | gammelt forsøk overskrev nyere kvittering | **Nei** |

Av tjue funn: åtte dekket helt, to delvis, ett gjelder ikke. To av dem — BE-01 og
PDF-01 — ville plattformen håndtert bedre enn dagens kode gjør, ikke bare likt.

De ni som står igjen er dem der konsekvensen er penger eller en falsk kvittering.

## 7. Hva jeg ville vurdert i stedet

Ikke som anbefaling — beslutningen avhenger av lisens, kompetanse og driftsmodell, og
ingen av delene er kjent her — men fordi spørsmålet «Power Platform eller ikke» har en
tredje utgang.

**Delt etter hva som faktisk er hva.** Tilgangsstyring, identitet, godkjenningsruting,
varsling og dokumentlagring er generiske problemer som plattformen løser godt.
Hendelsesloggen, forretningsreglene, fullmaktsberegningen og leveringssemantikken er
domenespesifikke og skrives uansett.

Da er dette formen som er verdt å undersøke:

- **Entra ID** for identitet, MFA og Conditional Access — uansett valg.
- **Azure SQL med ledger-tabeller** for hendelsesloggen. Gir uforanderlighet med
  kryptografisk verifiserbarhet, altså sterkere enn både dagens løsning og Dataverse,
  og lar `expected_version`-modellen stå.
- **Catenda** som eneste dokumentlager, som besluttet.
- **Dataverse og Power Automate for godkjenningsflyten**, der plattformen faktisk vinner:
  delegering, fravær, påminnelser, handling fra Teams. Fullmaktsgrensen håndheves
  fortsatt server-side før publisering.
- **Fabric for statistikk**, med konfidensialitetsregelen bygget eksplisitt i kopien og
  auditert som egen leveranse.

Det som *ikke* er verdt å gjøre, er å flytte forretningsreglene inn i canvas-apper og
flyter. Da bytter man et testbart validatorpunkt mot flere uprøvbare, og gjenoppliver
`AUD-07` og `BE-04` på en ny stack.

## 8. Sjekkliste før dette utredes videre

Spørsmålene som avgjør, i den rekkefølgen jeg ville stilt dem:

1. **Kan Catenda-identitet kobles inn?** Avklar med Catenda om de tilbyr OIDC med
   discovery, eller bare OAuth 2.0 som i dag. Svaret avgjør om eksterne brukere kan
   logge inn uten egenutviklet identitetskode.
2. **Hva koster eksterne brukere?** Antall TE-brukere per prosjekt × lisensmodell, pluss
   Dataverse-lagring inkludert revisjonslogg.
3. **Tåler autolagringen API-grensene?** Mål faktisk skrivefrekvens per bruker mot
   gjeldende tjenestebeskyttelsesgrenser. Dette henger sammen med den åpne oppgaven i
   [handoffen](handoff-gpt-astra-2026-09-15.md).
4. **Hvor skal hendelsesloggen ligge?** Dataverse-revisjon dekker ikke bevisbehovet.
   Ledger-tabeller eller egen append-only-modell må besluttes først, ikke etterpå.
   *Merknad 2026-09-19:* spørsmålet har fått et tillegg. [Datakartleggingen](personopplysninger-faktagrunnlag-2026-09-19.md)
   viser at journalen i dag lagrer personnavn direkte, og at uforanderlighet dermed
   kolliderer med sletteplikt. Hvilken plattform loggen ligger på endrer ikke den
   avveiningen — den må avgjøres uansett, og helst før loggen fylles.
5. **Hvordan holdes Catenda-teamene ferske?** Skriv ned tilbakekallingsvinduet som et
   krav med et tall, og kontroller at den valgte mekanismen feiler lukket.
6. **Hvem skanner vedleggene?** Hvis SharePoint og Defender velges, kan
   `lib/vedlegg_innhold.py`-punktet lukkes. Hvis Catenda beholdes, står det åpent.
7. **Hvordan testes forretningsreglene?** Krev et svar på hvordan `business_rules.py`
   sine regler verifiseres med feilende tester på den nye stacken. Uten et svar er
   auditserien i denne mappen ikke videreførbar.

## Gjenstående

Ingen kodeendring er gjort. Dette dokumentet endrer ingen beslutning og lukker ingen
åpne punkter i auditserien — de står som de står, og er lenket herfra.

Den eneste påstanden her som er verifisert mot kode og ikke tidligere protokollført, er
at Catenda-innloggingen ikke bruker OIDC (`lib/auth/catenda_oauth.py` har ingen
`id_token`-håndtering; identiteten hentes med et API-kall etter kodeveksling). Den er
relevant utover denne vurderingen og bør bekreftes med Catenda.

Alt som gjelder Power Platform er ubekreftet på denne stacken og må verifiseres mot
gjeldende dokumentasjon før noe legges til grunn.
