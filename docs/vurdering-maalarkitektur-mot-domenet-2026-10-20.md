# Vurdering: målarkitekturen mot domenet

**Dato:** 2026-10-20. **Kontrollert commit:** `69963ed` (main etter #1016).
**Bestilt av:** oppdragsgiver 20.10: «Videre ønsker jeg nærmere vurdering av
arkitekturen - målbildet vi jobber mot - og om det fortsatt er ideelt for domene.
Her kan vi evt sparre med chatgpt astra også.» Omfanget er hele målbildet:
domenemodellen, lagringsformen, TS-kjernen og serveren, Azure SQL og Catenda som
kanal. Alternativene vurderes mot domenet, NS 8407-forløpene og et lite team.

Vurderingen endrer ingen vedtak og ingen funnstatus. Vedtakene står i
[hovedplanen, 3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger).
Appen er ikke i produksjon og har ingen reelle data. Alvorligheten angir mulig
konsekvens hvis forholdet blir stående til produksjon.

Den bygger videre på [arkitekturvurderingen 19.09](arkitekturvurdering-2026-09-19.md),
[føringene 21.09](arkitekturforinger-2026-09-21.md),
[forslaget til målarkitektur 07.10](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md),
[avhengighetene 07.10](vurdering-avhengigheter-og-arkitekturvalg-2026-10-07.md),
[modellforslaget 09.10](forslag-maalmodell-2026-10-09.md),
[B-18-vurderingen 10.10](vurdering-b18-serverplassering-2026-10-10.md),
[JSON i Azure SQL 11.10](vurdering-json-azure-sql-2026-10-11.md),
[behovet i første versjon 13.10](vurdering-behov-forste-versjon-2026-10-13.md) og
vurderingen av målbildet og overgangen fra samme dag (VM-01–VM-10, PR #1018, ikke
merget da dette ble skrevet). Den gjentar dem ikke. Den siste ser på veien dit;
denne ser på om målet er riktig.

**Belegg** merkes som i [hovedplanen, 1.3](plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
**L** lest i kode eller migrasjonsfil, **P** lest i planen, registeret eller et
dokument, **T** telt 20.10. Ingen tester eller servere er kjørt.

## Sammendrag

> **Merknad 20.10, etter prøvingen av sparringen:** konklusjonen står. Ingen av
> innvendingene gir belegg for å bytte en byggekloss, og sparringens ene
> forenkling (MD-05) holder ikke mot SQ-02 og SQ-03. Prøvingen legger til to
> funn: reserveveien vedtakene viser til for brev appen ikke kan sende, er ikke
> bygget (MD-10), og målbildet har ikke tatt stilling til det som gjelder hele
> kontrakten (MD-11). Hva en stanset levering betyr, er snevret inn av LV-U7
> (MD-06). Se [sparringen prøvd](#sparringen-prøvd-mot-vedtakene-og-koden).
> Svaret fra sparringen gjelder ikke før oppdragsgiver har sluttet seg til det.

**Målbildet passer domenet, og ingen byggekloss bør byttes.** For hver av de seks
er det beste alternativet enten det som er valgt, eller et som koster mer enn det
gir nå. Svakhetene ligger ikke i valgene, men i tre forhold:

1. **Den juridiske vekten ligger i teksten, og tekstkjeden er prøvd (MD-02).**
   Det som binder, er brevteksten slik den kom fram (HF-U6, HF-U13, LV-U3).
   PDF-en leses tilbake og sammenliknes med den frosne teksten, med
   feilinnføringer. Utledningen er rådgivende (MM-U12, MM-U23), men bærer det
   tyngste versjonsmaskineriet. Det blir en kostnad etter første ekte sak (MD-04).
2. **Leveringen er juridisk, ikke bare teknisk (MD-06).** Et brev binder fra det
   er kommet fram. En levering som er parkert som usikker eller avvist, vises for
   avsenderen som «ikke levert ennå», likt en som er underveis, og bare i
   testvisningen. Det finnes ingen varsling til driften.
3. **Catenda er en god kanal, men et uavklart arkiv (MD-07).** Brevene ligger i
   egen base, men vedleggene ligger bare i Catenda, og appen sletter sin kopi når
   Catenda har kvittert (P4, LV-U12). Hva Catenda garanterer av bevaring, er ikke
   kontrollert (AF-04), og B-05 er åpen.

Forenklingen som gir mest, er allerede vedtatt: Python ut (B-19, svaret «TS
overtar alt» 20.10). Med leveringen i TS (#1016) er målet nå ett språk, og
grensen mot Python i [B-18-vurderingen, 3.3](vurdering-b18-serverplassering-2026-10-10.md#33-grensen-mot-python-levering)
er foreldet. Overgangen, ikke målet, er det som gjør flaten stor for et lite team
(MD-08).

## Domenet målbildet prøves mot

Kravene under er utledet av vedtakene og forløpene i domenetabellen, ikke av
NS 8407-teksten direkte. De er vår lesning.

| Krav | Innhold | Kilde |
| --- | --- | --- |
| K1 Bevis | Hva som ble sagt, av hvem, til hvem og når, kan legges fram uendret år etter | B-03, MM-U9, P7 |
| K2 Frister | Tidspunktet et varsel kom fram, avgjør om kravet er i behold. Appen viser grunnlaget, men avgjør ikke | HF-U6, LV-U7, MM-U23 |
| K3 Parter og team | To sider med flere team hver. Skjermingen går på team | AGENTS.md, AF-01 |
| K4 Lavt volum, høy vekt | Få saker per prosjekt, hver med mye penger og tid. Korrekthet og etterprøvbarhet går foran ytelse | [Behovet 13.10](vurdering-behov-forste-versjon-2026-10-13.md) oppgir ikke volum; antatt |
| K5 Lite team | Hver mekanisme skal kunne forstås, endres og driftes av få | Bestillingen |
| K6 Uavhengig av appen | Saken kan leses uten at appen kjører: av partene, en oppmann eller en domstol | AF-04, B-05 (åpen), RP-U1 |

K4 er en antakelse. Ingen kilde oppgir hvor mange saker eller brukere som ventes.
Konklusjonene under holder for alt opp til noen tusen saker per år; volum er
ikke en driver for noen av valgene.

## Byggeklossene

| Byggekloss | Vedtatt | Implementert (L, T) | Verifisert | Passer domenet | Beste alternativ | Kostnad ved bytte nå |
| --- | --- | --- | --- | --- | --- | --- |
| Journal og utsagnsmodell | B-03, MM-U9–U11, HF-U1, HF-U2, MM-U21 | To hendelsestyper (`sak_opprettet`, `dokument_registrert`), 17 utsagnsarter, `utled` som ren fold (1 122 linjer) | Kjernetestene og feilinnføringene i CI | Ja (MD-01) | Tilstandsmodell med revisjonslogg | Høy, og taper K1 |
| Lagringsform | HF-U3, B-10, DL-U3 | `koe.hendelse` med typede kolonner og `data nvarchar(max)` med `ISJSON`. Append-only med triggere | Lagringstestene mot SQL Server | Ja (MD-03) | Normaliserte tabeller per utsagn | Lav, men ingen gevinst |
| TS-kjernen | B-13, B-14, B-15, B-17, MM-U13 | `kjerne/` om lag 6 500 linjer, tester 12 800. `REGELVERSJON` 23, `PROJEKSJONSVERSJON` 37 | Arkitekturtesten med `LESBART`, feilinnføringer | Ja (MD-02, MD-04) | Kjerne bare på serveren | Høy, og strider mot B-15 |
| TS-serveren og Azure SQL | B-02, B-12 (databasen), B-18, B-19, DL-U1, DL-U5 | `server/` 8 300 linjer, 57 T-SQL-migrasjoner (7 700 linjer), 69 prosedyrer, `SECURITY POLICY` med kontekst per transaksjon | Testene mot SQL Server i Docker, ikke mot Azure SQL (AJ-11) | Ja (MD-05) | Azure Database for PostgreSQL | Middels til høy, og strider mot B-12 |
| Jobbtabellen og leveringen | LV-U1, LV-U9, «databasebasert worker» 17.09; B-07 åpen | `koe.jobb` med lease (`READPAST, UPDLOCK`), backoff, parkering, avstemming mot Catenda før hvert steg. Løkka går i serverprosessen | Testene i `server/tester/` | Ja, med et hull (MD-06) | Kø-tjeneste (Service Bus) | Middels, og taper transaksjonen med hendelsen |
| Catenda som kanal og arkiv | P4, B-03 (dokumentet), LV-U11–U14; B-05 åpen | Topic per sak, brev-PDF og vedlegg i dokumentbiblioteket, webhook med innboks | Ikke mot ekte Catenda (VM-01) | Kanal ja, arkiv uavklart (MD-07) | Egen uforanderlig kopi av vedleggene | Lav teknisk, men krever å se P4 og LV-U12 på nytt |

## MD-01 — journalen er allerede en brevjournal

**Belegg: L, P.** Kjernen skriver to hendelsestyper. All korrespondanse er
`dokument_registrert`, med brevet som ett dokument (`kjerne/format/format.ts`,
`HENDELSESTYPER`). Det er ikke finkornet hendelseslogging med én hendelse per
feltendring; det er en journal av brev, som er det domenet består av.

Alternativet er en tilstandsmodell: tabeller med sakens gjeldende krav og svar,
og en revisjonslogg ved siden av. Den er enklere å spørre i og kjent for flere
utviklere. Men den gjør revisjonsloggen til bevis og tilstanden til sannhet, og
det er feil vei for K1: et brev som sendes, endrer ikke seg selv senere, og en
tilstand som regnes om, kan ikke bevise hva parten så (MM-U9, MM-U17). Kostnaden
ved å bytte er hele kjernen og kommandoene.

Event store-produkter (EventStoreDB, Marten) er ikke vurdert tidligere. De gir
ingenting her: volumet er lavt, det finnes ingen abonnenter som trenger strømmen,
og de ville lagt en tjeneste til ved siden av Azure SQL.

**Vurdering:** behold. Journalen er den byggeklossen som passer domenet best.

## MD-02 — vekten ligger i teksten, og tekstkjeden er prøvd

**Belegg: L, P.** Det som binder partene, er teksten: utsagn binder fra de er
kommet fram (HF-U6), det som er meddelt, binder slik det sto (HF-U13), og det som
ikke står i brevteksten, er ikke meddelt (LV-U3). Avsenderen godkjenner teksten
som fryses, og dokumentet skal være en tro gjengivelse av den (LV-U2).

Tekstkjeden har den strengheten det krever. `server/tester/brevpdf.test.ts` leser
teksten tilbake ut av PDF-en og sammenlikner den ordrett, også over sidebrekk, for
delte ord og for tegn utenfor skriften. Feilinnføringene S33 og S38 i
`server/tester/feilinnfoering.py` prøver at testene fanger en utelatt linje og et
delt ord. Leveringsoppdraget bærer hashen av det frosne innholdet, og et nytt
forsøk gjenbruker den lagrede PDF-en.

Utledningen er derimot rådgivende. Appens frosne vurdering er ingen rettslig
avgjørelse (MM-U12), og appen sier aldri selv at et krav er prekludert eller
avgjort (MM-U23). Den må likevel være riktig: den bestemmer hvilke handlinger
appen tilbyr og hva som fryses i beslutningsgrunnlaget (MM-U11, MM-U17). Men en
feil der gir et dårlig råd som parten selv kan se, mens en feil i tekstkjeden gir
et brev som sier noe annet enn avsenderen godkjente.

**Vurdering:** fordelingen er riktig. Utvid ikke utledningen ut over OV-U7 før
første ekte sak, og hold tekstkjeden og leveringen (MD-06) først i køen.

## MD-03 — lagringsformen passer, og ingen annen gir mer

**Belegg: L, P.** Ett dokument per brev (HF-U3) i `nvarchar(max)` med
`ISJSON(…, OBJECT)` og typede kolonner for det som spørres, skrankes eller
nøkles, er det [JSON-vurderingen](vurdering-json-azure-sql-2026-10-11.md#7-alternativene-punkt-5)
anbefalte. Det tåler speiling til Fabric (AJ-09) og endrer ikke teksten stille.

Normaliserte tabeller per utsagn ville gjort rapportering enklere, men utsagnsartene
har endret seg med vedtakene nesten daglig. Hver endring ville blitt en migrasjon.
En dokumentdatabase (Cosmos DB) gir en tjeneste til uten noe Azure SQL ikke har.
Objektlager med uforanderlighet (WORM) er riktig for vedleggene (MD-07), ikke for
journalen, som trenger transaksjonen med leveringsoppdraget.

Spørre- og rapporttabellene HF-U3 åpner for, er ikke bygget. `koe.kjernebuffer`
er bufferen for visningen, ikke en rapporttabell.

**Vurdering:** behold.

## MD-04 — kjernen passer, men versjonene og vaktene koster

**Alvorlighet: lav. Belegg: L, T, P.** En kjerne som kjører både i nettleseren og
på serveren, er det som gjør B-15 mulig: brukeren prøver et svar lokalt, og
serveren regner det ut på nytt (B-13). Alternativet er en kjerne bare på
serveren, med et kall for hver forhåndsvisning. Det er enklere, men strider mot
B-15, og kostnaden ved å flytte tilbake er kjernen og testene.

To ting er dyre for et lite team:

- **Versjonene.** `REGELVERSJON` er 23 og `PROJEKSJONSVERSJON` 37, uten en
  eneste ekte sak (**T**). Før produksjon er det gratis. Etter produksjon utløser
  hver regelendring en kjøring av alle saker med gamle og nye regler og en
  rapport (MM-U16), og hver projeksjonsendring en omregning (MM-U15). Det trengs
  en praksis for å samle regelendringer i utgivelser før første ekte sak, ellers
  blir hver liten retting en hendelse for partene.
- **`LESBART`.** Hvitelisten håndhever den viktigste regelen i domenekjernen,
  at ingen regel leser status (MM-U13). Den er egenutviklet og har kjente blinde
  flekker (modulheaderen i testen). Alternativet er en modulgrense alene: regler
  kan ikke importere visningen, og status finnes bare der. Det håndheves
  allerede. `LESBART` gir i tillegg klassifiseringen av hvert felt, som er nyttig
  så lenge modellen endres raskt. Når modellen har satt seg, kan den forenkles.

**Vurdering:** behold. Lag en praksis for regelutgivelser før første ekte sak.

## MD-05 — serveren og Azure SQL følger B-02, men flaten er stor

**Alvorlighet: lav. Belegg: L, P.** Implementasjonen følger B-02 slik det ble
vedtatt: lesing gjennom tabellene med `FILTER`-predikater i `SECURITY POLICY`
(`GRANT SELECT` til `koe_runtime`), og bindende skriving bare gjennom prosedyrer
som krever transaksjonen fra serveren (`koe_tx = CURRENT_TRANSACTION_ID()`).
Prosjekt, side og team settes i `SESSION_CONTEXT` fra serverens eget oppslag.
Det passer K3 og historikken: prosjektgrensen er brutt flere ganger (RV-07,
AUT-01/02), og et filter i databasen kan ikke glemmes i en ny rute.

Kostnaden er flaten. Tilgangsreglene står både i TS (`server/autorisasjon.ts`) og
i T-SQL (predikatfunksjonene), og 69 prosedyrer i 7 700 linjer migrasjoner skal
leses i review sammen med TS-koden (**T**). Datalaget bruker interne deler av
`mssql` og `tedious` (#533), så en oppgradering av driveren kan bryte
transaksjonen uten at typene sier fra. Testbasen er SQL Server i Docker, ikke
Azure SQL (AJ-11).

Det beste alternativet er Azure Database for PostgreSQL: radsikkerheten er
innebygd, driveren `pg` er enklere, og port 2 og de første vurderingene var
skrevet for den. Men B-12 valgte Azure SQL for IKT og speilingen til Fabric, og
et bytte nå er 57 migrasjoner, datalaget og testbasen. Gevinsten er mindre enn
kostnaden.

Radsikkerhet med kontekst fra serveren verner mot et glemt filter, ikke mot en
overtatt server (AF-02). Det er akseptert og riktig avgrenset.

**Vurdering:** behold. Hold prosedyrene til bindende skriving, og lag ingen
prosedyre per lesing. Prøv datalaget mot Azure SQL med managed identity tidlig
(VM-01).

## MD-06 — leveringen er et kontraktsforhold

**Alvorlighet: middels. Belegg: L, P.** Jobbtabellen passer domenet: lavt volum,
leveringsoppdraget i samme transaksjon som hendelsen (LV-U1), og avstemming mot
Catenda før hvert steg, så et nytt forsøk ikke lager et nytt dokument
(`server/jobber.ts`). En kø-tjeneste som Service Bus ville krevd en utboks i
basen likevel, fordi transaksjonen med hendelsen er det som gjør leveringen
etterprøvbar. Den gir ingenting her.

Hullet er hva et utfall betyr. Et brev er sendt når det er lagret (LV-U9), men
utsagnene binder fra de er kommet fram (HF-U6). Blir en levering parkert som
usikker eller varig avvist, er det et forhold som kan avgjøre om et varsel kom
fram i tide (K2). I dag parkeres jobben, og driften starter den på nytt med
`koe_api.start_jobb_paa_nytt`. Avsenderen ser «levert» med tidspunkt eller «ikke
levert ennå» (`leveringstekst` i `src/lib/kjernesak/saksbilde.ts`). En parkert
levering ser altså ut som en som er underveis, og visningen finnes bare på
kjernesiden som er merket for testmiljøet. Det finnes ingen varsling (VM-09).

Løkka går i serverprosessen og krever en instans som alltid kjører (B-07, B-12).
Leasen tåler flere instanser, så det er et hostingvalg, ikke et designproblem.

**Vurdering:** behold jobbtabellen. Skill parkert og avvist fra underveis i
visningen for avsenderen, og varsle driften når en levering parkeres. Hva en parkert
levering betyr for parten, er et domenespørsmål.

## MD-07 — Catenda er en god kanal, men et uavklart arkiv

**Alvorlighet: middels. Belegg: L, P.** Som kanal passer Catenda K3 og K5: partene
er der allerede, saken blir en BCF-topic, og brevet blir et dokument som aldri
revideres (B-03). Alternativene, e-post eller SharePoint, ville gitt en ny
kanal partene må følge.

Som arkiv er bildet delt:

- Brevene er dekket: journalen, den frosne teksten og PDF-bytene ligger i egen
  base (`koe.brevdokument`), i tillegg til i Catenda.
- Vedleggene ligger bare i Catenda. Appen lagrer hash og ID, og sletter sin kopi
  når Catenda har kvittert (P4, LV-U12). En hash beviser at en fil er uendret,
  ikke at den finnes.
- Hva Catenda garanterer av bevaring, også etter at et prosjekt er avsluttet
  eller lisensen sagt opp, er ikke kontrollert (AF-04). B-05 er åpen, og
  arkivplikten går foran sletteplikten (P7).

Det billigste alternativet er en uforanderlig kopi av hvert vedlegg i Azure
Blob Storage med tidsbasert oppbevaring. Det er lite kode, men det endrer P4 og
LV-U12, og hører derfor til avgjørelsen av B-05.

**Vurdering:** behold Catenda som kanal. Avgjør B-05 med vedleggene som eget
punkt før første ekte sak, ikke ved produksjonsporten.

## MD-08 — målet er moderat stort, overgangen gjør det stort

**Belegg: T, L.** Målet er om lag 6 500 linjer kjerne, 8 300 linjer server og
7 700 linjer T-SQL, med om lag 36 000 linjer tester. Ved siden av står 45 000
linjer Python og 40 000 linjer Python-tester som frontenden fortsatt bruker for
sakslisten, EO, forsering og prosjektene (VM-02).

Målet er rimelig for domenet. Det som gjør flaten for stor for et lite team, er
at begge står samtidig. Den viktigste forenklingen er derfor allerede vedtatt:
Python ut (B-19). Etter #1016 leverer TS selv til Catenda, så målet er ett språk
og én prosess. Toppkommentaren i `server/levering.ts` sier fortsatt at Python
leverer.

## MD-09 — null-alternativet er ikke vurdert

**Belegg: P.** Ingen av dokumentene har vurdert å la være å utlede: brevmaler med
strukturerte felt, levert til Catenda, uten predikater og regler. Det er det
enkleste for et lite team, og det oppfyller K1, K3 og K6.

Det taper det appen er bestilt for: at appen viser hva et svar betyr før det
sendes (B-15), at hvert svar gjelder én kravversjon (MM-U10), og at fristene
vises med grunnlaget. Vurderingen av første versjon fant at kjernen allerede er
smalere enn dagens skjema. Null-alternativet er derfor ikke bedre, men det er
referansen: hver regel i kjernen skal kunne forsvares mot det.

## Forenklinger

| Forenkling | Gevinst | Krever |
| --- | --- | --- |
| Python ut av forespørselsveien og databasen | Halverer flaten | Vedtatt (B-19), pågår (#375) |
| Samle regelendringer i utgivelser | Færre omregninger og rapporter etter produksjon | En praksis, ikke et vedtak |
| Ingen prosedyre per lesing | Mindre T-SQL å reviewe | Følger B-02 |
| Forenkle `LESBART` når modellen har satt seg | Mindre vedlikehold av arkitekturtesten | Ingen; senere |
| Én prosess for server og jobbløkke | Enklere drift | B-12, B-07 |

Det som ikke bør forenkles: append-only i basen, radsikkerheten og
transaksjonen mellom hendelse og leveringsoppdrag. De bærer K1 og K3.

## Hva et bytte ville koste nå

Appen har ingen reelle data, så et bytte koster bare kode og tid. For journalen,
kjernen og databasen er kostnaden uker, og gevinsten er ingen eller strider mot
et vedtak. For leveringen og Catenda er kostnaden lav, men gevinsten avhenger av
B-05. Etter første ekte sak blir hver av dem en migrering av saker med juridisk
vekt, så det er nå et bytte eventuelt skal tas. Vurderingen finner ikke grunn
til det.

## Sparring

Prompten til ChatGPT står i
[`vedlegg/vurdering-maalarkitektur-2026-10-20/prompt-sparring.md`](vedlegg/vurdering-maalarkitektur-2026-10-20/prompt-sparring.md),
og svaret ordrett i
[`svar-sparring.md`](vedlegg/vurdering-maalarkitektur-2026-10-20/svar-sparring.md).
Spørsmålene til oppdragsgiver som fulgte av prøvingen, og svarene, står i
[`sporsmal.md`](vedlegg/vurdering-maalarkitektur-2026-10-20/sporsmal.md).

## Sparringen prøvd mot vedtakene og koden

Prøvd 20.10 på `b08ce76` av fire subagenter, hver mot én del av svaret, med
vedtakene i 3.1 og koden. **K** betyr kjørt og observert 20.10 mot testbasen i
SQL Server.

**Prompten gjenga to prinsipper for grovt.** Prinsipp 5 slo MM-U2 sammen med
setningen i OV-U1 om det appen ennå ikke kan, og prinsipp 8 utelot at OV-U1 tar
med registrering av brev sendt utenfor appen. Innvending 2 bygger på dette. Etter
vedtakene stopper bare en hendelse i journalen som kjernen ikke kan tolke, saken
(MM-U2). Et brev med innhold appen ikke kan sende, sendes utenfor appen og
registreres som dokumentasjon (OV-U4, OV-U7), og registreringen gjør ikke saken
ikke forstått (MM-U18).

| Innvending | Dom | Belegg |
| --- | --- | --- |
| 1. Lagret mot kommet fram: foldingen bruker utsagn som ikke er levert | Avgjort av vedtak. Restpunkt: rekkefølgen i Catenda (MD-06) | LV-U7 regner fra sendingen og forkastet å la kvitteringen avgjøre fremkomsten. Kjernen leser ikke leveringen (`kjerne/utledning/utled.ts`). Et registrert brev har egne datoer for sendt og mottatt, atskilt fra `tidsstempel` (`kjerne/format/format.ts:OPPLYSNING`), og gir ingen virkning (OV-U4). L, P |
| 2. Ukjent innhold sperrer handlinger, og prinsipp 5 bør endres | Bygger på feil premiss (over). Sparringens reservevei er vedtatt, men ikke bygget (MD-10). Forslaget om manuell utsendelse endrer MM-U2 | `forutsetninger` i `kjerne/kommandoer/forutsetninger.ts` avviser alt med `SAK_IKKE_FORSTAATT` bare når utledningen ikke er forstått. MM-U2 forkastet å la TE sende i en slik sak. L, P |
| 3. Lokal uforanderlighet støtter K1 og K6 for sterkt | Holder delvis. Ingen eksport av en sak finnes; det er kjent (AF-04, B-05, B-11). At eieren kan slå av triggerne, er ikke ført som en akseptert grense | Runtime avvises ved `DISABLE TRIGGER` og `TRUNCATE` (SQ-05 i [prøven 11.10](prove-azuresql-2026-10-11.md)). L, P |
| MD-01: tilstandsmodell er en falsk motsetning; et svar kan gjelde en eldre kravversjon | Svarmålet er avgjort: KA-U40 forkastet at byggherren kan godta en tidligere kravversjon. Tilstandsmodellen endrer ikke vurderingen | `kontrollerSvar` i `kjerne/kommandoer/nyttelast.ts` avviser med `FEIL_KRAVREFERANSE`. L, P |
| MD-02: original og tolkning bør skilles | Allerede vedtatt (HF-U2, MM-U12, MM-U17). I første versjon registrerer hver side bare egne brev (OV-U4), uten virkning. Retting av en feilregistrering er åpen under B-16 | P |
| MD-02: manglende utledning blir en sperre for første bruker | Avgjort av OV-U7: handlingen avvises, saken går videre, og brevet sendes utenfor appen. Men registreringen etterpå finnes ikke (MD-10) | `IKKE_I_FOERSTE_VERSJON` i `forutsetninger.ts`. L, P |
| MD-03: unik `(sak, versjon)` gir ikke idempotent innsending | Løst i koden (#418) | `kommando_id` med kvittering per kommando; 13 tester i `server/tester/kommandoer.test.ts` («kvitteringen per kommando (#418)») grønne. K |
| MD-04: blandede regelversjoner; godkjent innhold ved innsending | Regelversjonene er avgjort (MM-U9, MM-U11, MM-U17) og prøvd. Ved innsending kontrolleres sakens versjon, regelversjonen og de låste avsnittene. Ingen hash av hele beslutningsgrunnlaget, men uten påvist avvik | `kjerne/tester/regelendring.ts` (5 grønne), `tekstavvik` i `kjerne/kommandoer/skriving.ts`. K, L |
| MD-05: bruk det offentlige `Transaction`-API-et | Holder ikke. `mssql` nullstiller ikke forbindelsen (SQ-02), og bindingen til transaksjonen finnes (SQ-03). Gjenbruk mellom to ulike team er bare prøvd indirekte | `server/datalag.ts:iTransaksjon`, `server/tester/datalag.test.ts`. L, P |
| MD-05: Fabric speiler private data | Avgjort av RP-U1: notater, utkast og godkjenningspakker holdes utenfor Fabric eller skjermes der. Ikke bygget | P |
| MD-06: `READPAST` under `READ_COMMITTED_SNAPSHOT` | Løst. Testbasen har RCSI, og koden bruker `UPDLOCK, READPAST, ROWLOCK` | `server/tester/sqlserver.ts:opprettTestbase`; `sqlserver.test.ts` og `jobber.test.ts` grønne. K |
| MD-06: en arbeider kan miste leasen midt i et kall | Håndtert: en utløpt lease parkerer jobben som usikker, og bare drift starter den igjen. Restpunkt: en manuell omstart mens et kall henger kan gi en dobbel referanse på topicen. B-07 er åpen | `koe_api.hent_jobb`; `server/jobber.ts:lever` med `failOnDocumentExists`. L |
| MD-07: webhook bare for nye topics | Stemmer, men journalen er ikke en speiling av Catenda: brev utenfor appen registreres (OV-U4) | `NY_TOPIC` i `server/hendelser.ts`. L, P |
| MD-07: bevaringspakke med vedlegg | Holder. Krever å se LV-U12 på nytt, som forkastet å beholde kopien 18.10. Spørsmål 3 | P |
| NS 8407-punktene | Det meste er vedtatt, og noe er utsatt (OV-U1, OV-U7). Nytt: MD-11 | Under |

Om NS 8407-punktene. Allerede dekket av vedtak: skillet mellom nøytralt varsel,
0 dager, «ingen krav» og manglende svar (VS-U15, KA-U8, KA-U12), innsigelsen mot
sen varsling som partens posisjon (VS-U1, VS-U9, VS-U11), og endringsordre, frafall
og senere begrunnelse i KOE-saken (GR-U12, GR-U13, KA-U18). Forespørselen etter
§ 33.6.2 og særskilte krav etter § 34.1.3 hører til første versjon etter matrisen,
men er ikke bygget (`utenforOmfanget` i `kjerne/frosset/standpunkt.ts`). Forseringen
er utsatt (OV-U1, OV-U2), og koblingen til avslaget venter på B-01.

### MD-10 — reserveveien for brev appen ikke kan sende, er ikke bygget

**Alvorlighet: middels. Belegg: L, P.** MM-U2 og OV-U7 lar appen avvise det den
ikke kan, fordi brevet kan sendes utenfor appen og registreres etter OV-U4. OV-U1
tar registreringen med i første versjon. Kjernen har ingen kommando som
registrerer et brev sendt utenfor appen (`kjerne/kommandoer/kommando.ts`), og
følgekolonnen til OV-U4 sier det samme. Avvisningen ved `IKKE_I_FOERSTE_VERSJON`
sier likevel at brevet kan registreres. Før registreringen finnes, har en part
som må sende et brev appen avviser, ingen vei tilbake inn i saken. Det er
sparringens innvending 2, men som et hull i leveringen av OV-U1, ikke i
prinsippet.

**Vurdering:** registreringen hører til første versjon (OV-U1) og bør være
bygget før første ekte sak.

### MD-11 — målbildet har ikke tatt stilling til det som gjelder hele kontrakten

**Alvorlighet: lav. Belegg: L, P.** Journalen er per sak. Sparringen peker på
meddelelser som gjelder flere saker eller hele kontrakten: sluttoppstillingen og
innsigelsene mot den (§ 39), overtakelsen som fristen i § 35.2 regnes fra, og
tvisteløsningsskritt. Ingen vedtak dekker § 39, og VS-U3 viser fristen i § 35.2
uten dato. Det finnes heller ikke felt for mottaker eller adresse, ingenting om
varsler i møtereferater (§ 4.2), og ingen vedtak om fullmakt på TEs side
(§ 9); `aktor_id` er den innloggede. Vederlagskravet er ett beløp, uten delkrav
med egen varslingshistorikk (§ 34.1.3).

Ingenting av dette taler for å bytte journalen: en journal for kontrakten kan
stå ved siden av sakene med samme form. Men det er beslutninger målbildet ikke
har tatt, og § 34.1.3 påvirker formatet allerede i første versjon.

**Vurdering:** omfanget av kontraktsnivået er spørsmål 4. Delkravene etter
§ 34.1.3 avgjøres når § 34 bygges i første versjon.

### Restpunkter uten eget funn

- Leveringene i en sak venter ikke på hverandre (`koe_api.hent_jobb`), så et senere
  brev kan ligge i Catenda før et tidligere. Ingen vedtak sier noe om rekkefølgen
  (spørsmål 1).
- At eieren eller en annen privilegert operatør kan slå av triggerne og
  sikkerhetspolicyen, er ikke ført som en akseptert grense ved siden av AF-02.
- Gjenbruk av en forbindelse mellom to ulike team er ikke prøvd uttrykkelig.
- En manuell omstart av en jobb mens et kall henger, kan gi en dobbel referanse
  på topicen.
- Sparringens forslag om å prøve modellen mot avsluttede, anonymiserte
  prosjektforløp er forenlig med vedtakene og ikke gjort.

## Verifikasjon og grenser

**Lest ut av koden (L):** `kjerne/format/format.ts`, `kjerne/versjon.ts`,
`kjerne/regler/regelsett.ts`, `kjerne/tester/arkitektur.test.ts` (header),
`server/datalag.ts`, `server/jobber.ts`, `server/levering.ts`, `server/catenda.ts`,
`server/tester/brevpdf.test.ts` (testnavnene), `src/lib/kjernesak/saksbilde.ts`,
`database/migrasjoner/` (journal, sikkerhetspolicy, jobber, levering, `GRANT`).
Kartleggingen ble gjort av subagenter. Hovedtråden har selv kontrollert
`GRANT SELECT` til `koe_runtime`, kommentaren om `tedious` i `datalag.ts`,
testene av PDF-teksten og leveringsteksten i frontenden. Kontrollen snudde to
påstander i et utkast av MD-02 og MD-06.

**Telt (T):** linjetall med `wc -l` og antall prosedyrer med `grep` 20.10.

**Ikke kontrollert:**

- om skjemaene for KOE-saken, utenfor testvisningen, viser leveringen (MD-06);
- Catendas vilkår for bevaring og eksport (MD-07);
- volumet av saker og brukere (K4);
- datalaget mot Azure SQL, managed identity og Fabric-speiling (VM-01);
- NS 8407-teksten. Kravene K1–K6 bygger på vedtakene, ikke på kontraktsteksten.

Ingen tester er kjørt for MD-01–MD-09, og ingen påstand der om kjøretidsatferd
bygger på kjøring.

**Kjørt og observert 20.10 (K), for prøvingen av sparringen:** mot testbasen i
SQL Server `server/tester/kommandoer.test.ts` med filteret «kvitteringen per
kommando (#418)» (13 grønne), `server/tester/sqlserver.test.ts` («testbasen har
RCSI, ADR …») og test 6 i `server/tester/jobber.test.ts` (grønne), og
`kjerne/tester/regelendring.ts` (5 grønne). Prøvingen leste i tillegg
`kjerne/kommandoer/`, `kjerne/utledning/`, `kjerne/typer.ts`,
`server/hendelser.ts`, migrasjonene for levering og kvittering,
[paragrafmatrisen](paragrafmatrise-koe-eo-forsering.md) og
[prøven 11.10](prove-azuresql-2026-10-11.md). Den søkte i vedtakene på ID-er og
nøkkelord og leste ikke alle postene. Python-stien, Microsofts dokumentasjon og
kildene sparringen lenker til er ikke kontrollert.
