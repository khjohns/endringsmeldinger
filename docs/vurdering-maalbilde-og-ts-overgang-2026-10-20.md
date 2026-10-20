# Vurdering: målbildet, arkitekturen og overgangen til TS

**Dato:** 2026-10-20. **Kontrollert commit:** `1e2efd6` (main etter #1006 og #1013).
**Bestilt av:** oppdragsgiver 20.10, etter at funksjonssporet (runde 17,
overlevering i [#764](https://github.com/khjohns/endringsmeldinger/issues/764))
og det tekniske sporet (runde 16, overlevering i
[#949](https://github.com/khjohns/endringsmeldinger/issues/949)) var ferdige.
PR #1016 (jobbkjøreren) er ikke merget og regnes ikke som levert.

Dokumentet er et grunnlag for samtalen om arkitektur og plan. Det endrer ingen
vedtak, og ingen funnstatus i hovedplanen. Vedtakene står i
[hovedplanen, 3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger).
Appen er ikke i produksjon og har ingen reelle data. Alvorligheten angir mulig
konsekvens hvis forholdet blir stående til produksjon, ikke en observert hendelse.

Vurderingen bygger videre på [arkitekturvurderingen 19.09](arkitekturvurdering-2026-09-19.md),
[føringene 21.09](arkitekturforinger-2026-09-21.md) og
[vurderingen av første versjon 13.10](vurdering-behov-forste-versjon-2026-10-13.md),
og gjentar dem ikke.

**Belegg** merkes som i [hovedplanen, 1.3](plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
**L** lest i kode eller migrasjonsfil, **P** lest i planen eller et dokument,
**G** hentet fra GitHub 20.10, **T** telt 20.10. Ingen tester eller servere er
kjørt i denne vurderingen.

## Sammendrag

1. **Domenet er langt kommet, men det finnes ingen vei til produksjon.** Det er
   ikke bygget noe containerbilde for TS-serveren eller Python, ingen ruting av `/api` utenfor Vite-proxyen
   og ingen utrulling til Azure. `deploy.sh` ruller fortsatt ut SPA-en til Google
   Cloud Run (VM-01).
2. **Mellomtilstanden mellom Python og TS lar seg ikke kjøre med ekte innlogging.**
   Innloggingen går alltid til TS, og sesjonen lagres i SQL Server. Python-rutene
   som frontenden fortsatt bruker, leser sesjonen fra PostgreSQL. Det finnes ingen
   bro mellom dem (VM-02).
3. **Sluttilstanden er skrevet, men den kritiske stien er ikke samlet.** Det er TS
   og Azure SQL, med Python ute av databasen. Før ekte saker gjenstår skrivestien
   (#310), EO og forsering i kjernen (byggedel 4 av #309, som venter på B-01),
   godkjenningsflyten (#818), flyttingen fra Python (#375, #49), leveringen og
   hostingen. EO-flyten, som AF-06 satte først, kommer nå sist (VM-03).
4. **Produksjonsporten er ikke påbegynt.** F3, F4 og F5 har ingen milepæl og ingen
   issues. B-05, B-09 og B-11 har ingen ansvarlig. ROS, DPIA og skriftlig svar fra
   Catenda har lengre ledetid enn koden (VM-04).
5. **Vedtakene kommer raskere enn leveransene.** Det kom 112 vedtak på 9 dager, og 73 av
   dem er merket ikke bygget. Byggestatusen i registeret føres for hånd og er
   foreldet flere steder (VM-05).
6. **Hovedplanen har vokst ut av rollen som styringsdokument.** Den er på 441 KB,
   og to tredjedeler er den genererte vedtakstabellen. Styringen skjer i praksis i
   milepælene og overleveringene (VM-06).
7. **Sikkerhetsinvariantene holder i det som er lest av TS-stien**: ruteregisteret
   med test, CSRF i `krevSesjon`, aktøren fra sesjonen, og ingen defaultprosjekt i
   koden eller i T-SQL. Det som mangler, er inngangene som ikke er bygget: notater,
   utkast og tilgangsloggen (VM-08).
8. **Drift og observabilitet er ikke påbegynt.** Det finnes bare `console`-logging
   og ingen helseinngang, korrelasjons-ID eller varsling. Jobbløkka krever en
   instans som alltid kjører (VM-09).

Den viktigste anbefalingen er en **gjennomgående skive i Azure**: én KOE-sak fra
innlogging til levert brev i Catenda, i et staging-miljø på den valgte plattformen.
Den bør lages før mer bredde i domenet (forslag 1 under).

## Funn

| ID | Alvorlighet | Funn |
| --- | --- | --- |
| VM-01 | Høy | Ingen produksjonsvei for serveren: ingen containerbilde, ingen ruting og ingen utrulling til Azure |
| VM-02 | Høy | Innloggingen går til TS og sesjonen til SQL Server, mens Python-rutene leser sesjonen i PostgreSQL |
| VM-03 | Høy | Den kritiske stien til ekte saker er ikke samlet, og EO-flyten fra AF-06 er flyttet sist |
| VM-04 | Middels | Produksjonsporten (F5) og pakkene F3 og F4 har ingen milepæl, og tre beslutninger har ingen ansvarlig |
| VM-05 | Middels | Vedtakene vokser raskere enn leveransene, og byggestatusen er foreldet |
| VM-06 | Middels | Hovedplanen er for stor til å styre etter, og flere rader er foreldet |
| VM-07 | Middels | Prosessmaskineriet koster mye, og etterslepet fra review vokser |
| VM-08 | Lav | Sikkerhetsinvariantene holder i TS-stien, med kjente hull der inngangene ikke er bygget |
| VM-09 | Middels | Observabilitet og drift mangler, og jobbløkka forutsetter en instans som alltid kjører |
| VM-10 | Lav | Rester og parallelle stier uten fjerningsissue |

## Målbildet mot hovedplanen

Tallene er hentet fra GitHub 20.10 (**G**). Status per pakke bygger på planens
daterte merknader (**P**) og på at filene finnes (**L**).

| Pakke | Vedtatt | Implementert | Verifisert | Åpne issues |
| --- | --- | --- | --- | --- |
| F0 | Leveranse 1–4 | CI med seks jobber, blant dem SQL Server | Merknaden 22.09 (PR #33). Fremmednøklene til DB-04 venter på B-01 | Ingen milepæl |
| F0b | B-12 for databasen, B-19, DL-U1 | `server/datalag.ts`, 57 T-SQL-migrasjoner, innlogging, medlemskap, webhook med innboks, jobbtabell | Merknadene 16.10, 17.10 og 20.10. SQL Server-jobben er påkrevd i CI | 18, blant dem #375 (flyttingen fra Python), #52 (container, venter på B-12), #555, #819 |
| F1 | B-02 C, B-04 | Rollene `koe_runtime`, `koe_driftsrolle` og `koe_jobbkjoerer`, `SECURITY POLICY` og triggere mot endring av journalen | Ingen datert leveransemerknad. Radsikkerheten er flyttet til F0b (DL-U5) | 3: #420 (rollene), #51 (utdatert medlemsliste, stille siden 24.09) |
| F2 | Utgår, innholdet er flyttet til FK | – | – | 0 åpne. Milepælen er fortsatt åpen |
| FK | B-17, B-18, HF-U1–U3, OV-U1 og en lang rekke rader i 3.1 | `kjerne/` med kommandoer, regler, frosset og utledning. `server/` med kjerneinngangene, godkjenning, fullmakt, Entra, levering og vedlegg | Mange daterte merknader 10.–20.10, og feilinnføringene kjøres i CI. #310 (ingen Python-skriving i journalen) er ikke levert | 61, blant dem #310, #309, #818, #933 |
| F3 | Planlagt | Deler er bygget under F0b og FK (innboks og jobbtabell) | Ingen | Ingen milepæl |
| F4 | Venter på B-05 og B-11 | Ingen eksport og ingen tidskilde | Ingen | Ingen milepæl |
| F5 | 11 punkter | – | «Status er ikke innhentet for noen» | Ingen milepæl og ingen issues |
| Spor H | Funnliste | – | – | 7, blant dem #1008 og #424 |
| Spor M | Fase 1–4 | Registrene i `docs/datamodell/` | Fase 1b og 1c levert 29.09 | 10, flere stille siden 29.09 |

Milepælen «Lesevisning etter målmodellen» (#6) har 16 åpne designissues
(#194–#209), alle stille siden 09.10. Den står ikke i avsnitt 5 eller 6 i planen.

**Åpne beslutninger som blokkerer produksjon (P):** B-12 hosting (App Service
eller Container Apps), B-07 drivmekanisme (bygget som løkke i serveren, men
avhengig av hostingen), B-01 relasjoner (trengs for byggedel 4), B-05 bevaring,
B-09 driftsverdier, B-11 tidskilde og B-16 (retningen er avgjort med MM-U21, men
raden er åpen og #276 har fortsatt `venter-på-beslutning`).

**Foreldet i avsnitt 3.4 og 6 (P):** lagringsformen er avgjort med HF-U3 (12.10),
men står som blokkerende i avsnitt 6. B-06 er avgjort med GFK-U3/U4 (18.10), men
står fortsatt i 3.4.

## VM-01 — ingen produksjonsvei for serveren

**Belegg: L, G.** `Dockerfile` bygger bare SPA-en og serverer den med nginx.
[`nginx.conf`](../nginx.conf) har ingen `proxy_pass`, og
[`deploy.sh`](../deploy.sh) kjører `gcloud run deploy` i `europe-north1`. Det finnes
ikke noe containerbilde for [`server/`](../server/) eller [`backend/`](../backend/), og ingen
utrullingsworkflow. Rutingen til TS-serveren finnes bare i Vite-proxyen
([`server/ruting.ts`](../server/ruting.ts), `tilTsServeren`).

Tre ting vil feile ved første forsøk på App Service eller Container Apps:

- [`server/start.ts`](../server/start.ts) lytter på `127.0.0.1`, og verten kan
  ikke settes.
- `mssql` og `pdf-lib` står i `devDependencies` i `package.json`. En
  produksjonsinstallasjon med `--omit=dev` mangler dem.
- Managed identity mot basen er beskrevet i `server/datalag.ts`, men det finnes ingen
  kode for Azure-autentisering (#78).

Hvert punkt er lite, men samlet viser de at TS-serveren aldri har kjørt utenfor
skyøkta. #376 og #52 eier ruting og bilde. #52 venter på B-12 hosting, som har stått
åpen siden IKT satte opp App Service (merknaden 13.10).

**Hvorfor det betyr noe nå:** flere av de vanskelige spørsmålene kan bare
besvares på plattformen. Det gjelder serverløs pause i Azure SQL, managed identity,
jobbløkka på en instans som skalerer, Fabric-speiling og hvitelisten for utgående
trafikk (#1008). Jo senere de prøves, jo mer domenekode er bygget på antakelser om
dem.

## VM-02 — innloggingen og sesjonen er delt mellom to baser

**Belegg: L, G. Ikke kjørt.** `tilTsServeren` sender `/api/auth/*`,
`/api/csrf-token`, `/api/kjerne/*`, deler av `/api/projects` og webhooken til
TS-serveren, uten bryter. TS-serveren lagrer sesjonen i `koe.app_sessions` i SQL
Server (`server/sesjon.ts`, `koe_api.opprett_sesjon`). Python-rutene leser sesjonen
fra `app_sessions` i PostgreSQL gjennom Supabase-klienten
(`backend/lib/auth/session.py`, `load_session`). Python har ingen SQL Server-driver.

Frontenden kaller fortsatt Python for sakslisten (`/api/cases`), EO
(`/api/endringsordre/*`), hendelser (`/api/events`) og resten av `/api/projects`.
Med ekte innlogging og uten `DISABLE_AUTH` vil Python-rutene derfor svare 401. CSRF-tokenet
kommer også fra TS-sesjonen.

`VITE_KOE_TS_STIEN` ser ut som en bryter mellom to fungerende stier, men den styrer
bare skrive- og lesekilden for nye KOE-saker (`src/lib/kjernesak/bryter.ts`). #376
krever at «sesjonskapselen fra Python-innloggingen godtas av TS-serveren», altså
motsatt vei av dagens ruting, og ingen av issuene nevner de to sesjonslagrene.

**Følgen for planen:** det finnes ingen kjørbar mellomtilstand der Python og TS
deler brukerne. Overgangen må enten gjøres samlet for alt frontenden bruker, eller
få en uttrykkelig bro. Valget bør tas før #375 og #310 planlegges videre.

## VM-03 — den kritiske stien er ikke samlet

**Belegg: P, G, L.** Sluttilstanden er skrevet: TS eier KOE, EO og forsering
([B-17](plans/2026-09-16-godkjenning-og-varig-levering.md#b-17)), alt Python gjør
mot databasen flyttes til TS ([B-19](plans/2026-09-16-godkjenning-og-varig-levering.md#b-19)),
og det bygges ingen vei ut av Supabase ([DL-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#dl-u1)).
Python kan beholde levering og integrasjon uten databasetilgang, men uten dato for
når det flyttes.

Det som gjenstår før en ekte sak, er spredt over to milepæler og flere tråder:

| Ledd | Issue | Venter på |
| --- | --- | --- |
| Skrivestien i TS, ingen Python-skriving i journalen | #310 | #309, #375 |
| EO og forsering i kjernen. `kjerne/kommandoer/kommando.ts` har ingen EO- eller forseringskommando (L) | #309, byggedel 4 | B-01 |
| Byggherrens svar og godkjenningsflyten | #818, #831 | Funksjonssporet, rekkefølgen i #764 |
| Python ut av databasen: sakslisten, prosjektene og EO-rutene | #375, #49 | VM-02 |
| Levering: jobbkjøreren og feilklassene. LV-U1 står som «Ikke bygget» | #1016, #555, #921, #926 | B-07 |
| Notater og utkast i TS (`koe.notat` finnes, men ingen inngang) | Ikke funnet | – |
| Bilde, ruting, hosting | #376, #52 | B-12 hosting |

B-17 sier at skrivestien aktiveres samlet for de tre sakstypene. Det gjør EO og
forsering, som ikke er påbegynt i kjernen, til en forutsetning for den første ekte
KOE-saken. [AF-06](arkitekturforinger-2026-09-21.md) satte «én komplett EO-flyt»
foran bredde og opprydding. F2 er nå erstattet av FK, og FK har bygget bredde i
KOE-sporene først. Det er en forsvarlig omprioritering, men den er ikke ført som
endring av AF-06, og den skyver den første gjennomgående flyten ut.

[Vurderingen 13.10](vurdering-behov-forste-versjon-2026-10-13.md) viste i tillegg
at kjernen er smalere enn dagens skjema i vederlag og frist. Det gapet er behov
før første versjon, ikke ekstra omfang.

## VM-04 — produksjonsporten er ikke påbegynt

**Belegg: P, G.** F5 har 11 punkter: ROS, DPIA, ekstern sikkerhetsvurdering,
hendelseshåndtering, skriftlig svar fra Catenda, restore-øvelse med RPO og RTO,
B-10-porten, isolert staging, konfigurasjon og hemmeligheter, og sluttaudit. Planen
sier at status ikke er innhentet for noen av dem. Ingen av dem har et issue. F3 og
F4 har heller ingen milepæl. B-05 (bevaring), B-09 (driftsverdier) og B-11
(tidskilde) har ingen ansvarlig eller anbefaling.

Dette er arbeid med lang ledetid hos andre enn utviklerne: personvernombudet, IKT,
driften og Catenda. Det kan ikke startes sent uten å bli den kritiske stien.

## VM-05 — vedtakene vokser raskere enn leveransene

**Belegg: T, G.** Vedtaksregisteret har 295 poster, og 112 strukturerte vedtak er
kommet 12.–20.10. 73 av dem har «Ikke bygget» i `folge`. 18 har verken treff i
koden eller et issue i `folge`, blant dem VS-U17–U25, MM-U22–U25, GFK-U1, GFK-U7,
OV-U8, OV-U9 og DL-U11–U13. 93 av 227 ID-er i 3.1 (41 %) finnes ikke i
`kjerne/`, `server/` eller `src/`.

Tråden fra kode til vedtak holder: alle 134 vedtaks-ID-er i koden finnes i 3.1
(vakta i `docs/verktoy/vedtakshenvisninger.py`). Tråden fra vedtak til kode holder
ikke: byggestatusen føres for hånd og er foreldet. VS-U16 sier «Bygges i #411»,
men #411 er lukket 12.10, og vedtaket er implementert i
`kjerne/kommandoer/forutsetninger.ts`. LV-U11 sier «Ikke bygget (#371)», men #371 er
lukket 19.10. Det er 35 slike kandidater.

Vedtakene er presise og godt begrunnet. Problemet er farten: hvert vedtak er en
forpliktelse for kjernen og bevis-sakene, og første versjon blir ikke mindre av at
flere vedtak kommer før de eldre er bygget.

## VM-06 — hovedplanen styrer ikke lenger

**Belegg: T.** Planen er på 2211 linjer og 441 KB, omtrent 110 000 tokens. Avsnitt
3.1 er generert fra registeret og utgjør 65 % av fila, med celler på opptil 8 000
tegn. 28 % av linjene er daterte merknader, og avsnitt 5 består til om lag 40 % av
merknader. Funnregisteret har 179 rader, og 75 av dem er historiske.

Ingen agent eller person kan lese planen i én økt, og regelen i `AGENTS.md` sier at
den er autoritativ. Den faktiske styringen skjer i milepælene og i overleveringene
i #764 (63 kommentarer, 117 000 tegn) og #949. Avsnittene 3.4 og 6 har foreldede rader
(se Målbildet).

## VM-07 — prosessmaskineriet koster mye

**Belegg: T, G.**

- **Instruksjonene:** `AGENTS.md`, skillene, reglene og agentene er om lag 2100
  linjer, grovt 35 000–40 000 tokens. Orkestreringsskillen alene har 487 linjer og 21
  daterte prosessvedtak.
- **Gjennomstrømningen:** 329 PR-er ble merget 06.–20.10. Etter titlene gjelder om lag
  40 % vedtak, plan, prosess eller dokumentasjon.
- **Etterslepet fra review:** 40 åpne `review-oppfølging`-issues har 129
  uavkryssede punkter. Det er omtrent like mange som er løst.
- **CI:** feilinnføringene tar om lag 75 jobbminutter per PR som rører kjernen.
- **Kostnaden:** mye av prosessreglene styrer agentenes egen kostnad (#745, #777, #731).

Vaktene har gitt reelle garantier: ingen ukjent vedtaks-ID i koden, regelversjonsvakta,
arkitekturtesten og ruteregisteret. Kostnaden ligger i lagene rundt: manuell
byggestatus, merknader i planen, PR-er for hvert vedtak og reviewpunkter som samles,
men ikke tas. For et lite team uten agentstøtte er apparatet ikke vedlikeholdbart.
Med agentstøtte er det dyrt, men det virker.

## VM-08 — sikkerhetsinvariantene i TS-stien

**Belegg: L.** Det som er lest, holder:

- **Registeret:** hver inngang står i `RUTER` i `server/app.ts`, og en sti som ikke står
  der, gir 404. `server/tester/register.test.ts` prøver hver inngang over HTTP, også
  med kontraktsrolle. Webhooken står som åpen med begrunnelse.
- **CSRF** håndheves inne i `krevSesjon` (`server/autorisasjon.ts`).
- **Aktørfeltene** settes fra sesjonen i `server/kommandoer.ts`, og en kommando med
  ukjente felt avvises.
- **Defaultprosjekt:** `krevProsjekttilgang` gir `null` uten `X-Project-ID`. Det
  finnes ingen default for prosjekt i `server/*.ts`. Søket gjaldt `?? '…'`,
  `|| '…'`, tilordninger og `oslobygg`. I T-SQL er søket gjort etter `DEFAULT` på
  prosjektkolonner og standardverdier på `@prosjekt`-parametre. Prosedyrene leser
  prosjektet fra `SESSION_CONTEXT` uten reserveverdi.
- **Identiteten** løses med `koe.resolve_identity` fra innloggingen, medlemssynken og
  webhooken.

**Ikke kontrollert:**

- om subjektet normaliseres likt i alle tre identitetsveiene, og om Entra-identiteten
  (`koe_api.entra_identitet`) gir samme brukerrad som Catenda for samme person;
- defaultargumenter i funksjonssignaturene.

**Det som mangler, er inngangene som ikke er bygget.** Notater og utkast finnes ikke i
TS-serveren, selv om tabellen `koe.notat` finnes. De er fail-closed fordi de ikke
finnes, ikke fordi skjermingen er prøvd. Tilgangsloggen fra 2.2 er ikke bygget.

## VM-09 — observabilitet og drift

**Belegg: L, P.** TS-serveren logger med `console` og har ingen strukturert logging,
korrelasjons-ID, metrikk eller helseinngang. Funnene OBS-05 og OBS-06 er åpne.
Parkerte og usikre leveringer logges, men ingen varsles. Driften må starte dem på
nytt med `koe_api.start_jobb_paa_nytt`.

Jobbløkka i `server/jobber.ts` går i serverprosessen. Den krever en instans som
alltid kjører, og grensen for antall kall i webhooken gjelder per prosess. Begge
avhenger av B-12 hosting og B-07.

`datalag.ts` bruker interne deler av `mssql` og `tedious`, med låste versjoner
(#533). Det er en oppgraderingsrisiko som et lite team må eie.

## VM-10 — rester og parallelle stier

**Belegg: L, G.** Disse står uten fjerningsissue:

- `sprakprove/`. Bare `sprakprove/kjernelagring/` bruker `kjerne/`.
- Frontenden importerer fra Python-treet: `vite.config.ts` tillater `backend/constants`.
  Det må løses før Python fjernes.
- Catenda-klienten finnes i begge språk: `server/catenda.ts` og `backend/integrations/`.
- `deploy.sh` og `vercel.json` peker mot plattformer som ikke er valgt.

Disse er sannsynligvis foreldet etter byttet til Azure SQL og bør ryddes:

- #89 og #90 (spor M, stille siden 29.09);
- de foreløpige funnene #86 og #100, som aldri er kontrollert;
- de tomme milepælene F2 og «Opprydding etter AF-06».

## Det som står seg fra vurderingene i september

**Belegg: L, P.** Fundamentet er byttet slik [vurderingen 19.09](arkitekturvurdering-2026-09-19.md)
ba om, men til Azure SQL og TS i stedet for PostgreSQL og Flask:

- **AR-01:** grensen ligger nå i dataene, med `SECURITY POLICY` og `SESSION_CONTEXT`.
- **AR-02:** journalen er vernet med triggere.
- **AR-05:** CI finnes.
- **Fase 2:** outbox og worker er en jobbtabell med lease.
- **AR-04**, de to domenemodellene, er fortsatt åpent. Python og TS lever side om side
  til #310 og #49.
- **Fase 4:** standardprosjektet er borte fra TS-stien.

Kjernen er bygget slik B-14 og B-17 sier. `kjerne/tester/arkitektur.test.ts` håndhever
importgrensen og `LESBART`. Frontenden importerer kjernen for forhåndsprøving, slik
merknaden 10.10 til FK tillater. Dette er den sterkeste delen av arkitekturen.

## Forslag

Forslagene er ordnet etter gevinst mot kostnad. Kostnaden er grovt anslått i runder
på én time.

| Nr. | Forslag | Kostnad | Gevinst |
| --- | --- | --- | --- |
| 1 | **Gjennomgående skive i Azure staging.** Ta B-12 hosting. Lag ett bilde med SPA og TS-server bak én vert. Rett verten i `start.ts` og avhengighetene, og legg til en helseinngang, managed identity og strukturert logging med korrelasjons-ID. Kjør én KOE-sak fra innlogging til levert brev i et testprosjekt i Catenda. Løser VM-01 og prøver VM-09 | 3–5 runder, og beslutningen om hosting | Høy. Plattformfeil oppdages før mer domene bygges på dem |
| 2 | **Avgjør overgangen for innloggingen (VM-02).** Anbefalt: TS overtar alt frontenden kaller, med sakslisten, prosjektene og lesingen av saken først (#375). Python går ut av forespørselsveien og beholder bare leveringen til den flyttes | 2–4 runder | Høy. Fjerner en mellomtilstand som ikke kan kjøres |
| 3 | **Samle den kritiske stien i én milepæl**, «Første ekte sak». Den får issuene i VM-03-tabellen, F5-punktene som issues med en ansvarlig rolle og B-01, B-05, B-09 og B-11 med en eier | Under én runde | Middels. Gjør gjenstående arbeid synlig og målbart |
| 4 | **Ta opp B-17 om samlet aktivering**: vurder KOE i produksjon først, med EO og forsering etterpå, og Python-EO bak en lukket bryter til da. Krever vedtak | Ett spørsmål | Høy hvis det vedtas. Første ekte sak blir uavhengig av byggedel 4 og B-01 |
| 5 | **Vedtak når en leveranse trenger dem.** Nye domenevedtak stilles når et issue i den kritiske stien trenger dem. Byggestatusen i `folge` genereres av treff i koden og lukkede issues, ikke for hånd | 1 runde for verktøyet | Middels. Stopper veksten i VM-05 og fjerner de manuelle PR-ene |
| 6 | **Del hovedplanen.** Flytt 3.1 til en generert fil ved siden av planen, og flytt de historiske funnene og merknadene til et arkiv. Planen beholder målarkitekturen, invariantene, arbeidspakkene og de åpne beslutningene, og rett 3.4 og 6. Autoriteten flyttes uttrykkelig, slik `dokumentasjon.md` krever | 1–2 runder | Middels. Planen kan leses igjen |
| 7 | **Rydd i etterslepet fra review.** Gå gjennom de 40 issuene etter stoppregelen 20.10, lukk det som er pirk, og samle resten i ett. Kjør feilinnføringene om natten og ved regelendring, ikke på hver PR som rører kjernen | 1 runde | Lav til middels. Lavere kostnad og mindre støy |
| 8 | **Fjern restene i VM-10** når forslag 2 er gjort | Under én runde | Lav |

Forslag 1 og 2 henger sammen: én vert med ruting etter sti er det som gjør
overgangen i forslag 2 prøvbar. Forslag 4 er det eneste som krever et domenevedtak.

## Verifikasjon og grenser

**Kjørt og observert:** ingenting. Ingen tester, servere eller databaser er kjørt
i denne vurderingen.

**Lest ut av koden (L)** ved `1e2efd6`:

- `server/start.ts`, `server/ruting.ts`, `server/sesjon.ts`, `server/app.ts` (`RUTER`),
  `server/autorisasjon.ts`, `server/kommandoer.ts` og `server/jobber.ts`;
- `backend/lib/auth/session.py`;
- `kjerne/kommandoer/kommando.ts`;
- `package.json`, `Dockerfile`, `nginx.conf` og `deploy.sh`;
- søket etter `DEFAULT` i `database/migrasjoner/`.

VM-02 og påstandene om bilde, vert, avhengigheter, notater, helseinngang, EO-kommando
og `DEFAULT` er kontrollert på nytt av en egen subagent.

**Telt (T)** 20.10: størrelsen på planen og registeret, vedtak med og uten treff i
koden, filtellingene og PR-ene 06.–20.10. Inndelingen av PR-er etter type bygger på
titlene og er en heuristikk.

**Hentet fra GitHub (G)** 20.10: milepælene, de åpne issuene, overleveringene i
#764 og #949, `review-oppfølging` og #376 og #662.

**Ikke kontrollert:**

- VM-02 er ikke kjørt. Det krever innlogging mot Catenda og en Python-backend mot
  PostgreSQL. Det er lest i begge lag og i rutingen.
- Normaliseringen av identiteten på tvers av Catenda, Entra og webhooken.
- Katalogen i PostgreSQL, Supabase Auth og Storage.
- Om AR-03 (SQLite) og AR-08 (driftdetektorene) er lukket i Python-stien.
- Status for ROS og DPIA utenfor repoet.
- Om Python-backenden er utrullet noe sted i dag.
- Innholdet i #78 og #831 utover titlene.
