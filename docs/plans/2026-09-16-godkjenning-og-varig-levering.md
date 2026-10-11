# Hovedplan: sikkerhet, dataintegritet og varig levering

**Opprettet:** 2026-09-16. **Sist sluttredigert:** 2026-10-11, mot commit
`6f56672c00aca01eaac8e9566c672535c37bce20` (`main`).
**Status:** Autoritativ plan og eneste løpende kilde til vedtak, rekkefølge og
funnstatus. Appen er ikke i produksjon og har ingen reelle data.

Teksten før sluttredigeringen 11.10 er bevart i Git:
`git show 6f56672:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `9421cba77197f29648d7be092e0a7861d1740ea3`). Den har teksten som
forutsatte PostgreSQL eller at Python beholder databasedelen, slik den sto før
[B-12, databasen](#b-12-databasen) og [B-19](#b-19) (#396).

Teksten før sluttredigeringen 10.10 er bevart i Git:
`git show 7460838:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `a325fbc3b0934cea3bb09c1839d85edbf493f5ab`). Den har de daterte
merknadene i kolonnen «Følge» i 3.1 slik de sto før de ble innarbeidet (#346).
Bare 3.1 ble redigert.

Teksten før sluttredigeringen 09.10 er bevart i Git:
`git show 5d067cc3:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `82d8b4e2fd28ea8d9a6c17755f28129e3e3b0dcc`). Den har endringsloggen fra
22.09 til 09.10 i toppteksten, kolonnen «I dag» i 2.2, den tidligere
rekkefølgen i 3.1 og radene og merknadene for de avgjorte beslutningene i 3.4.

Første sluttredigering var 22.09. Den erstattet de tidligere statuslagene i
denne fila og de to konsolideringsforslagene. Teksten før den er
`git show 41c2a16:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `9e7def005d6d5f119dfe1e708f79027581d352db`), og
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md) viser hvordan
hvert krav og hver funnfamilie ble ført videre.

## 1. Hva som gjelder

### 1.1 Formål og avgrensning

Systemet fører formelle varsler etter NS 8407. En hendelse kan avgjøre om et
krav er bevart. Planen skal derfor sikre fire egenskaper før produksjon:

1. Bare riktig prosjekt, kontraktsside og team ser og endrer data.
2. En bindende handling lagres helt eller ikke i det hele tatt.
3. Det som er lagret, blir levert til Catenda uten brukerhandling, eller står
   synlig som ikke levert eller usikkert.
4. En sak kan gjenoppbygges og framlegges uten at appen kjører.

Planen omfatter ikke detaljdesign, produktvalg eller juridiske premisser som
ikke er vedtatt. Slike valg står som åpne beslutninger i
[avsnitt 3.4](#34-åpne-beslutninger).

### 1.2 Dokumentenes rolle

| Dokument | Rolle nå |
| --- | --- |
| Denne planen | Autoritativ for vedtak, rekkefølge og funnstatus |
| [Domenetabellen](../domenetabell/README.md) | Eier forventet atferd per rad, begrepene og bevis-sakene. Radene viser til vedtakene her og gjentar dem ikke |
| [Modellforslaget](../forslag-maalmodell-2026-10-09.md) | Begrunnelse for målmodellen. Ikke vedtatt som helhet; vedtakene som bygger på det, står i 3.1 |
| Kjernemappa [`kjerne/`](../../kjerne/) | TS-kjernen (1.3, B-14). Målmodellen fra #304 er flyttet hit og skrevet om etter vedtakene 09.10 (#308). Dekker forløp A–E; resten av domenet er #309 |
| [Arkitekturforslaget](../forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md) | Begrunnelse for B-14 og språkvalget (avsnitt 7 der). Overgangen der, én kommando om gangen, er erstattet av B-17 |
| [Metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md) | Prøve av fristkrav og tidsinnsigelser. Vedtakene er MP-U4–MP-U7 |
| [Arkitekturføringene AF-01–AF-06](../arkitekturforinger-2026-09-21.md) | Vedtatte føringer. Normative for design, ikke implementert |
| [Transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md) | Underordnet delplan. Normativ for kommando-, låse-, worker- og akseptansetestkontrakten der den er mer presis enn denne planen. Kontrakten gjelder uansett språk; for KOE-, EO- og forseringssakene gjelder den TS-stien (FK). Merknadene der gjelder foran eldre tekst |
| [Design v2 for B-02](../design-b02-tilgangsmekanisme-v2-2026-09-23.md) | Grunnlaget for alternativ C og transport T2, vedtatt 23.09. Normativt for F1 der det er mer presist enn denne planen. Punktene 3–6 i avsnitt 9 der er avgjort 23.09 (3.1). Designet er skrevet for PostgreSQL; etter [B-12, databasen](#b-12-databasen) uttrykkes og prøves mekanismen i T-SQL (#395) |
| [Målskjemaet](../design-maalskjema-database-2026-09-20.md) | Retning for skjemaet, justert av AF-01, AF-03 og AF-04. Skrevet for PostgreSQL; plattformen er Azure SQL etter [B-12, databasen](#b-12-databasen) |
| [Design: durable inbox og outbox](../design-durable-inbox-outbox-2026-09-17.md) | Designgrunnlag. Tabellnavnene der er forslag |
| [Catenda-dataflyten](../catenda-dataflyt.md) | Referanse for API-kontrakter og tidligere levende tester |
| [Konsolidering v2](../konsolidering-masterplan-2026-09-22-v2.md) · [kildegrunnlag v2](../konsolidering-kildegrunnlag-2026-09-22-v2.md) | Historisk forslag. Strukturen er brukt redaksjonelt; statusene er ikke overtatt uprøvd |
| [Testrevisjonen](../audit-testbevis-2026-09-22.md) · [testinventaret](../vedlegg/testbevis-2026-09-22.csv) | Protokoll over kjøringer 22.09. Rettet for ID-er, status og lenker 22.09 |
| Auditer, reviewer og handoffer | Historisk underlag. Status i dem gjelder bare der denne planen viser til dem |

Sluttredigeringen 22.09 innarbeidet AF-01–AF-06, reviewene RGK-01–06 og
RGK2-01–05, reviewet av testbeviset (RTB-01–05) og det korrigerte
testinventaret ([redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md)).
Sluttredigeringen 09.10 innarbeidet vedtakene 09.10 og ordnet 3.1 etter
kontraktstema. Sluttredigeringen 10.10 innarbeidet de daterte merknadene i
Følge-kolonnen i 3.1 (#346); teksten før er
`git show 7460838:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `a325fbc3b0934cea3bb09c1839d85edbf493f5ab`). Sluttredigeringen 11.10
rettet teksten utenfor vedtakene etter B-12, databasen, og B-19 (#396), ga F0b
nytt innhold, byttet ordet «ansvarsgrunnlaget» i B-13 etter HF-U2 (#384) og
førte inn KA-U30; teksten før er
`git show 6f56672:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`.
Endrer noe status, rettes det her med en datert merknad.

### 1.3 Begreper som holdes adskilt

- **Registrert status** er denne planens vurdering av et funn.
- **Testutfall** er hva en test gjorde. En streng `xfail` beviser at en
  assertion feiler, ikke at funnet er åpent.
- **Beslutningsstatus** er vedtatt, føring, anbefaling eller åpen.
- **Belegg** merkes slik i registeret:
  **K** kjørt og observert (dato), **L** lest i kode eller migrasjonsfil,
  **D** tidligere kontrollert i databasekatalogen (dato),
  **H** historisk dokumentert i en audit, **—** ikke kontrollert.
- **TS-kjernen** er den delte domenekjernen i TypeScript (B-14). Den skal eie
  KOE-, EO- og forseringssakene (B-17 med merknaden 09.10) og bygges i en egen
  permanent mappe fra #308 (merknaden 09.10 til B-14). Prøvekoden i
  `sprakprove/` er ikke TS-kjernen.
- **Python-epoken** er tiden til TS-kjernen tar over skrivingen i KOE-, EO- og
  forseringssakene samlet (KOE-byttet, B-17). Byggestatus og funn i
  Python-koden for disse sakstypene beskriver Python-epoken. De rettes ikke i
  Python, med unntakene i merknaden 09.10 i 4.2.
- **Status** (sporstatus, samlet status) er en visningsetikett. Et vedtak
  gjelder innholdet, ikke statusnavnet (merknaden 09.10 i 3.1).

Dokumentredigering lukker ingen kode- eller databasefeil.

## 2. Målarkitektur og sikkerhetsinvarianter

### 2.1 Ansvarsgrenser

| Lag | Ansvar | Hvorfor grensen trengs |
| --- | --- | --- |
| Klient | Viser det serveren tillater. Setter aldri aktør, rolle, tidsstempel eller hendelses-ID | Klienten kan forfalskes. FE-01 og FE-02 viste at serveren må holde uavhengig |
| Serverinngang | Hver inngang krever autentisering (med CSRF), prosjekttilgang og eventuelt kontraktsrolle, i Python-rutene og i TS-stien. Stempler aktørfelt fra sesjonen. Unntak står i et register med begrunnelse, og en test feiler når en inngang mangler en kontroll. Invariantene står i `AGENTS.md`, mekanismene i `.claude/rules/tilgang.md` | Én glemt kontroll skal gi rød test, ikke en åpen inngang. Registertesten finnes i dag bare for Python-rutene (DM-04) |
| Svar- og lesegrense | Navneoppslag, fletting av `hendelse` og `notat`, skjerming av interne notater, aktivitetstall etter det leseren ser | Navn og skjerming er presentasjon. De skal ikke påvirke domenetilstanden (AF-05) |
| Domene | NS 8407-regler og ren utledning fra journalen. For KOE-, EO- og forseringssakene eier TS-kjernen kommandoene, valideringen, utledningen, journalhendelsene, beslutningsgrunnlaget og enighetsgrunnlaget (B-17 med merknaden 09.10) | Samme journal skal gi samme utledning, uten server, database eller nett |
| Datalag | Prosjekt-, side- og teamgrense for private data. Uforanderlig journal. Én transaksjon per bindende kommando | Grensen må holde også når et nytt lesepunkt glemmer filteret (AF-01, AF-02) |
| Levering og integrasjon (worker) | Gjengir og leverer frosne brev, kaller Catenda og fører tekniske leveringsresultater etter commit. Lease med token, avstemming og usikkert utfall. Tolker ikke journalen for å avgjøre hva et brev betyr eller hva partene kan gjøre. Python kan beholde dette laget så lenge det ikke leser eller skriver i databasen selv, og bare til det flyttes til TS ([B-17](#b-17), [B-19](#b-19), [LV-U1](#lv-u1)) | Et eksternt kall kan ikke rulles tilbake. Lokal lås beviser ikke ekstern effekt |
| Catenda | Ekstern kanal og dokumentarkiv (P4) | Appen har ingen vei utenom; avhengigheten må avklares kontraktsmessig |

### 2.2 Hva som finnes, og hva som er planlagt

Dagens tabeller, hvem som skriver dem, og hvor dataene kommer fra, står i
[tabellregisteret](../datamodell/tabeller.md) og i
[relasjonene og dataflyten](../datamodell/relasjoner.md). Tabellen under viser
det som er planlagt. Kolonnen «I dag» slik den stod 22.09, er i Git (se
toppteksten).

| Komponent | Planlagt |
| --- | --- |
| Domenekjerne | TS-kjernen i en egen permanent mappe, felles for nettleser og server, og eneste skriver i KOE-, EO- og forseringssakene (B-14 og B-17 med merknadene 09.10) |
| Journal | Append-only håndhevet av basen, også mot uautorisert `INSERT` (MS-02, AF-02) |
| Interne notater | Teamvern i datalaget (AF-01) |
| Saksmetadata | Register og projeksjon, én skriver i hendelsens transaksjon (MS-06, MS-07). Navn foreløpige |
| Relasjoner | Avhenger av B-01 |
| Godkjenningspakker og policy | Databasen, med versjonert policy (F1, F2) |
| Utkast | Databasen, med teamvern (F1) |
| Vedleggsregister | Vedleggstabell med hash, revisjon og karantenestatus (F2) |
| Leveringsstatus | Erstattes av outbox-kvitteringer (F3) |
| Sammensatt skriving | Én transaksjon per bindende kommando, over direkte tilkobling til databasekommandoer (F0b, F2). For KOE-, EO- og forseringssakene i TS-stien (FK) |
| Utgående levering | Outbox og worker. Foreløpige navn: `kommando`, `utgaende_levering` |
| Webhook-mottak | Varig inbox. Foreløpig navn: `innkommende_hendelse` |
| Tilgangslogg | Logg for sensitive lesinger, eksport og endringer i fullmakt og tilgang |
| Roller | Avgrensede roller for runtime, worker, drift og migrering (AF-02). Runtime logger inn direkte, med managed identity, og kan ikke ta eierens eller en administrators rettigheter (T2, F1, [B-12, databasen](#b-12-databasen)) |
| CI | Datalaget testes mot en ekte database av samme slag som produksjonen, over samme tilkobling, med skrivbar testbase (F0b, [B-12, databasen](#b-12-databasen)). Tester som logger inn med de avgrensede rollene (F1) |

Tabellnavn i kolonnen «Planlagt» fastsettes i migrasjonene.
Planen låser ikke et tabelltall. Databasen er Azure SQL
([B-12, databasen](#b-12-databasen)); hvordan journalen lagres, er ikke
avgjort ([merknaden 11.10 til B-12](#b-12-merknad-2026-10-11)).

### 2.3 Invarianter

Disse kravene gjelder alle faser. Kilden står i parentes.

1. **Prosjekt, kontraktsside, team og handlingsrett er forskjellige grenser.**
   Private notater, utkast og godkjenningspakker vernes i datalaget. En
   leserolle (DB-05) gir ikke adgang til private data. Manglende kontekst
   avviser (AF-01).
2. **Append-only verner mot omskriving og mot uautorisert tilføying.** Runtime,
   worker, drift og migrering får konkret avgrensede rettigheter, også for
   `TRUNCATE`, kaskader og funksjonseierskap. Ingen generell append-funksjon
   som lar runtime omgå godkjenning (AF-02).
3. **Én bindende kommando er én transaksjon.** For EO omfatter den policy,
   pakke og fullmakt, saksversjoner, EO- og KOE-reserveringer, hendelser,
   metadata og relasjoner, vedleggsbinding, kvittering og leveringsintensjon.
   Låserekkefølgen er dokumentert og felles for alle skrivestier som berører
   de samme radene. Avbrudd før commit gir ingen nye eller delvise endringer.
   Ingen kompensasjonssletting (AF-02, transaksjonsplanen).
4. **Idempotens gjelder prosjekt, aktør, kommando og innhold.** Samme
   `command_id` med samme innhold gir samme kvittering. Samme ID med endret
   innhold avvises. To ulike kommandoer mot samme pakke eller versjon gir én
   commit og én konflikt (transaksjonsplanen, RGK-01).
5. **Nyere utkast slettes ikke ved parallell innsending.** Innsendt utkast
   slettes bare om revisjonen fortsatt er gjeldende. Vedlegg valideres mot
   prosjekt, sak, eier/team, revisjon og karantene før binding.
6. **Mål, konfigurasjon og dokumentgrunnlag fryses ved commit.** Endret mapping
   parkerer gamle jobber. En retry leverer samme dokument, ikke et nytt fra
   siste sakstilstand.
7. **Levering har en ærlig kontrakt.** Usikkert eksternt utfall parkeres og
   varsles. En ny worker antar ikke at en gammel worker har stoppet. Lokal
   kvittering krever gyldig lease-token. Eldre statusjobber overstyrer ikke
   nyere ønsket tilstand. Leveransen er levert når alle obligatoriske
   operasjoner er kvittert. Ingen garanti om nøyaktig én ekstern effekt.
   Avstemming mot Catenda er ekstra vern, ikke erstatning for atomisk
   registrering.
8. **Private data går ikke ut gjennom outbox.** Interne notater og utkast
   avvises når en ekstern jobb opprettes, ikke bare i ruta. Dead-letter-innsyn
   og manuell retry krever eksplisitt tilgang og logges.
9. **Tilstand beregnes fra hendelser alene.** Navneoppslag skjer ved visning.
   Gamle hendelser kan leses av ny kode, og tilbakerulling gjør ikke nye
   hendelser uleselige (AF-05, forovervendt kompatibilitet).
10. **Hash alene er ikke bevis.** Dokumentversjon, mål, leveringskvittering,
    bevaring og eksport må også finnes (AF-04).
11. **Serverstyrte felt settes av serveren.** `aktor_id`, `aktor_rolle`,
    `aktor_team_id`, `tidsstempel` og `event_id` kommer aldri fra klienten
    (`AGENTS.md`).
12. **Det finnes ikke noe defaultprosjekt.** Ukjent prosjekt betyr ingen tilgang
    (`AGENTS.md`, 5a).

> **Merknad 2026-10-09 til invariant 9:** For KOE-, EO- og forseringssakene
> gjelder kompatibiliteten fra KOE-byttet, mellom TS-versjoner. TS-kjernen
> bygges ikke for å lese hendelser Python har skrevet i disse sakene: dagens
> testsaker forkastes, og det bygges ingen kompatibilitetsleser (B-17).
> Formatet og kompatibiliteten mellom TS-versjoner er B-10 (#273).

> **Merknad 2026-10-09 til invariant 11 og 12 og serverinngangen i 2.1:** De
> gjelder hver serverinngang, også TS-stien, uansett hvor den kjører (B-18).
> TS-stien skal ha et register med test som feiler når en inngang mangler
> autentisering eller prosjekttilgang, slik Python-rutene har (DM-04).
> Prøveserveren i `sprakprove/server/` kontrollerer tilgangen, men har ingen
> slik test (L 09.10). Kravet hører til FK.

## 3. Beslutningsregister

### 3.1 Vedtatte premisser og beslutninger

Disse styrer implementeringen. De tas ikke opp igjen uten at beslutningen
eksplisitt oppheves.

> **Merknad 2026-10-09 til 3.1, oppdatert ved sluttredigeringene 10.10 og 11.10: statusnavn og «Følge».** Flere vedtak bruker
> navn fra Python-koden: sporstatuser som `GODKJENT`, `AVSLATT_AKSEPTERT` og
> `FRAFALT`, samlede statuser som `OMFORENT`, `LUKKET_AVSLATT` og
> `LUKKET_TRUKKET`, `kan_utstede_eo` og «låst». Navnet er en visningsetikett.
> Det bindende er innholdet vedtaket beskriver: hvem som har sagt hva om hvilket
> krav, og hvilken virkning det har etter kontrakten. «Låst» betyr enighet
> ([GR-U10](#gr-u10)). Det samme gjelder navn på hendelser, felt og koder fra
> koden: vedtaket gjelder innholdet, og navnene kan endres ved refaktorering,
> for eksempel for å passe bedre med kontraktsteksten (oppdragsgiver 11.10).
> Vedtakstekstene skrives ikke om (oppdragsgiver 09.10).
> Et nytt vedtak formuleres i kontraktens begreper (avsnitt 8).
>
> Kolonnen «Følge» viser først hvordan vedtaket forholder seg til andre
> vedtak: hva det presiserer, endrer eller opphever, og hvilke senere vedtak
> som har presisert, endret eller opphevet det, med dato. Gjelder et senere
> vedtak foran ordlyden, står det der. Deretter står byggestatus, i
> Python-koden der ikke annet står, med dato og belegg. «I dag» og «på
> vedtaksdatoen» er byggestatus da vedtaket ble fattet; en senere dato
> gjelder foran. Byggestatus uten nærmere angivelse gjelder vedtakets egen
> ordlyd, ikke de senere presiseringene. Der det kunne leses som status for
> en presisering som ikke er bygget, står byggestatusen for ordlyden først.
> Byggestatusen i kjernen føres ikke i alle rader; den samlede står i
> merknadene til FK i avsnitt 5. For KOE-, EO- og forseringssakene er byggestatusen i Python
> historisk etter B-17: TS-kjernen bygges etter vedtakene og domenetabellen,
> og Python-koden rettes ikke etter dem (merknaden 09.10 i 4.2, med unntakene
> der). «Bygget i målmodellen i språkprøven (#304)» gjelder målmodellen før
> #308 flyttet den til `kjerne/` og skrev den om etter vedtakene 09.10 (1.2,
> B-14).
>
> Radene er ordnet etter kontraktstema ved sluttredigeringen 09.10. Ved
> sluttredigeringen 10.10 (#346) er de daterte merknadene i kolonnen
> innarbeidet i teksten der. Vedtakstekstene er ikke endret.

#### Krav, kravversjon og trekk

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| SK-02 og SK-03: et oppdatert krav fra TE åpner sporet igjen. Det venter på nytt svar, og en aksept av forrige svar faller. Et svar TE har godtatt, kan byggherren ikke revidere | 05.10, oppdragsgiver | Endret 09.10 av [KA-U7](#ka-u7) for spor med enighet: der avvises en ny kravversjon, og enigheten står. Presisert 08.10 av [KA-U1](#ka-u1): aksepten gjelder svaret på gjeldende kravversjon. Hva som er en ny kravversjon, og et trukket krav: se de to radene under. Bygget 09.10 for godkjent og godtatt svar (SK-02, SK-03 i 4.2); ikke bygget på vedtaksdatoen |
| Hver oppdatering fra TE av et vederlags- eller fristkrav er en ny kravversjon, også når verdiene er uendret. Den åpner sporet igjen etter vedtaket over | 05.10, oppdragsgiver | Presisert 08.10 av [KA-U2](#ka-u2) (hvilke hendelser som er kravversjoner), og avgrenset 08.10 av [KA-U3](#ka-u3) (gjelder til saken er `OMFORENT`). Endret 09.10 av [KA-U7](#ka-u7): i et spor med enighet avvises oppdateringen. Versjonstellingen var bygget på vedtaksdatoen; virkningen på status og aksept er bygget 09.10 (SK-02) |
| Et krav TE har trukket, kan ikke tas opp igjen med en oppdatering. Serveren avviser oppdateringen; et nytt krav om samme forhold går i en ny sak | 05.10, oppdragsgiver | Ikke bygget. I dag godtas oppdateringen, og sporet står som `TRUKKET` (SK-02) |
| <a id="ka-u2"></a>KA-U2: kravversjonene er de hendelsene projeksjonen og frontenden regner som krav: `grunnlag_opprettet` og `grunnlag_oppdatert`, `vederlag_krav_sendt` med kravinnhold og `vederlag_krav_oppdatert`, `frist_krav_sendt`, `frist_krav_oppdatert` og `frist_krav_spesifisert`. Et frittstående konsekvensvarsel (`vederlag_krav_sendt` med `varsel_type` «varsel»), et trekk og byggherrens innsigelse eller forespørsel er ikke kravversjoner. Godkjenningsflyten skal bruke samme definisjon | 08.10, oppdragsgiver | Presiserer vedtaket om ny kravversjon 05.10. Projeksjonen og `submissionRefs` følger det; `claims()` i godkjenningsflyten gjør det ikke (DT-02) |
| <a id="ka-u3"></a>KA-U3: vedtaket om ny kravversjon gjelder til saken er `OMFORENT`. Deretter avvises en ny kravversjon, og et nytt krav om samme forhold går i en ny sak, som ved et trukket krav | 08.10, oppdragsgiver | Etter [KA-U7](#ka-u7) (09.10) kan TE ikke revidere et krav partene er enige om, heller ikke mens et annet spor er åpent. Som i dag: `CASE_NOT_CLOSED` avviser oppdateringen (K 08.10). TE kan altså revidere et fullt godkjent krav bare så lenge et annet spor er åpent |
| <a id="ka-u8"></a>KA-U8: en kravversjon på 0 dager eller 0 kr avvises. 0 er ikke et krav om noe (§ 33.6.1: «det antall dager han krever»). TE trekker kravet eller sender det ikke | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Avgjør #179. «Sender det ikke» er presisert 09.10 av [KA-U12](#ka-u12): TE sier uttrykkelig «ingen krav» |
| <a id="ka-u33"></a>KA-U33: TEs krav om fristforlengelse fra appen må ha en begrunnelse, som utdypningen under kravets låste tekst. § 33.6.1 sier at TE skal «angi og begrunne det antall dager han krever som fristforlengelse», og § 33.7 viser til «et begrunnet krav med angivelse av antallet dager fristforlengelse». Følgen er at skjemaet krever tekst, som KA-U24 gjør for byggherren. Appen vurderer ikke om begrunnelsen er tilstrekkelig. Forkastet: «nei, begrunnelsen er valgfri. Et krav uten begrunnelse sendes da fra appen, og om kravet er «begrunnet» etter § 33.7, avgjør ikke appen.» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet står i versjon 4 av spørsmålene på #410, svaret på #369 (V3). I tråd med [KA-U24](#ka-u24) for byggherrens svar og [KA-U19](#ka-u19): appen tolker ikke utdypningen. Brevteksten for fristkravet står i [LV-U4](#lv-u4), punkt 3. Ikke bygget. Skjemaet hører til #313 |
| <a id="ka-u12"></a>KA-U12: TE kan si uttrykkelig at det ikke kreves vederlag eller fristforlengelse i et spor som ikke er sendt («ingen krav»). Utsagnet lukker sporet på samme måte som et trekk: det teller som trukket i KA-U11 og som oppgjort i EO-U5. Det er ikke et krav på 0 (KA-U8). Har byggherren godkjent grunnlaget, er godkjenningen endringsordren (§ 32.3 første ledd a, GR-U10). Har byggherren ikke svart på grunnlaget, kan byggherren svare ved å utstede en endringsordre i en EO-sak som viser til KOE-saken (§ 32.3 første ledd a). KOE-saken trekkes ikke. Forkastet: at byggherren utsteder endringsordren i en egen EO-sak og TE trekker KOE-saken, fordi journalen da sier at TE trakk kravet om endring, og fordi en godkjenning av grunnlaget allerede er en endringsordre; og å la begge veier stå åpne | 09.10, oppdragsgiver (#308) | Presiserer KA-U8, KA-U11 og EO-U5. Presisert 10.10 av [KA-U15](#ka-u15): TE kan si «ingen krav» i fristsporet etter et varsel om fristforlengelse, men ikke før grunnlaget er sendt, og hva TE gir avkall på, avgjøres før «ingen krav» tas i bruk. Presisert 10.10 av [KA-U17](#ka-u17): «ingen krav» er avkall, også for følger som ikke er kjent. At godkjenningen er endringsordren, gjelder underkategoriene som § 32.2 gjelder for (GR-U11, [KA-U13](#ka-u13); 09.10), og krever også § 31.3 ([GR-U13](#gr-u13); 10.10). Ikke bygget: utsagnet er en ny kommando i #309. Hvordan EO-saken viser til KOE-saken når den er byggherrens svar på grunnlaget, er avgjort 10.10 av [EO-U6](#eo-u6). Merknad 11.10 (oppdragsgiver): «på samme måte som et trekk» gjelder at sporet lukkes ([KA-U11](#ka-u11), [EO-U5](#eo-u5)). Hvor langt avkallet rekker, står i [KA-U17](#ka-u17) og [KA-U25](#ka-u25) for «ingen krav» og i [KA-U14](#ka-u14) og [KA-U22](#ka-u22) for et trekk |
| <a id="ka-u15"></a>KA-U15: TE kan si «ingen krav» (KA-U12) i fristsporet etter et varsel om fristforlengelse (§ 33.4), fordi et frittstående varsel ikke er en kravversjon (KA-U2). Før grunnlaget er sendt, avvises «ingen krav» på samme måte som et krav. Begge kan tas opp igjen når det avgjøres hva «ingen krav» gir avkall på. Hva TE gir avkall på med «ingen krav», og hvordan brevet uttrykker det, avgjøres før «ingen krav» tas i bruk. Hvordan et forbehold i byggherrens svar virker på sammenfall (GR-U7), avgjøres før byggherren kan ta forbehold i et svar i TS-stien | 10.10, oppdragsgiver (#273) | Presiserer KA-U12 og GR-U7. Hva «ingen krav» gir avkall på, og hvordan brevet uttrykker det, er avgjort 10.10 av [KA-U17](#ka-u17). Forbeholdet er avgjort 10.10 av [KA-U16](#ka-u16), og KA-U15 er dermed oppfylt for forbehold. Kommandoen og brevteksten hører til #309. Ikke bygget |
| <a id="ka-u17"></a>KA-U17: «ingen krav» (KA-U12) er TEs avkall på krav om frist eller vederlag som følge av forholdet i saken, også for følger som ikke er kjent, og brevet sier det uttrykkelig. Er TE usikker, sender hen ikke «ingen krav». Et senere krav kan registreres i en ny sak, men appen avgjør ikke om det er avskåret. Varslingsreglene gjelder uansett. Forkastet: avkall bare for kjente følger, fordi «kjente følger» gir en ny tvist om hva TE visste; og «ingen krav» som bare et utsagn uten avkall, som ville endret KA-U12 og EO-U5 | 10.10, oppdragsgiver etter sparring (#309) | Presiserer [KA-U12](#ka-u12). Avgjør det [KA-U15](#ka-u15) lot stå åpent: hva TE gir avkall på med «ingen krav», og hvordan brevet uttrykker det. Brevteksten står i [KA-U22](#ka-u22) (10.10). Presisert 11.10 av [KA-U25](#ka-u25): avkallet omfatter ikke vederlag for forsering. Ikke bygget. Kommandoen og brevteksten hører til #309 |
| <a id="ka-u22"></a>KA-U22: brevet for et trekk av grunnlaget sier: «TE trekker sitt krav i sak <saksnummer> («<tittel>»). Trekket er avkall på alle krav i saken, også vederlag og fristforlengelse byggherren har godkjent. Trekket opphever ikke et pålegg, en endringsordre, en utførelsesplikt eller byggherrens rettigheter etter en avtale.» Brevet for et trekk av vederlag eller frist sier: «TE trekker kravet om justering av vederlaget [om fristforlengelse] i sak <saksnummer> («<tittel>»), <kravversjonen, entydig identifisert>. Trekket er avkall på dette kravet, også det byggherren har godkjent.» At kravet ikke kan tas opp igjen i saken, står i veiledningen i skjemaet, ikke i brevet. Brevet for «ingen krav» sier: «TE krever ikke justering av vederlaget [fristforlengelse] som følge av forholdet i sak <saksnummer> («<tittel>»), og gir avkall på slikt krav, også for følger som ikke er kjent i dag.» Trekk og «ingen krav» har ingen fritekst i første versjon, slik at avkallet er entydig. Et avgrenset eller betinget avkall som skjemaet ikke uttrykker, sendes utenfor appen. Et trekk, også av grunnlaget, avvises når appen ikke kan bevare byggherrens avtalte rettigheter, for eksempel et avtalt fradrag (KA-U9), til detaljmodellen er avklart i byggedel 3. Forkastet for første versjon: en utdypning under trekk og «ingen krav» | 10.10, oppdragsgiver etter sparring (#309) | Gjennomfører [KA-U14](#ka-u14) og [KA-U17](#ka-u17) i brevteksten. Sperren følger regelen i KA-U14 om at et trekk som ikke kan gjennomføres uten videre virkninger, sperres, og gjelder også et trekk av grunnlaget fordi det trekker vederlaget med seg (GR-U5, KA-U6). Snevrer inn [KA-U6](#ka-u6), [KA-U13](#ka-u13) og [GR-U5](#gr-u5) til byggedel 3. Sperren bygges før trekk tas i bruk (#310). Om enigheten gir byggherren en rettighet som trekket ikke rører, avklares i byggedel 3. Presisert 11.10 av [KA-U25](#ka-u25) for «ingen krav» i vederlagssporet. Presisert 11.10 av [KA-U27](#ka-u27). Presisert 11.10 av [LV-U4](#lv-u4), punkt 13: kravversjonen i trekket og «<tittel>». Ikke bygget. Den faste teksten hører til #309 |
| <a id="ka-u23"></a>KA-U23: TE kan kreve vederlag i en sak med hovedkategorien force majeure (§ 33.3), og byggherren svarer som på andre vederlagskrav. Appen viser § 33.3 femte ledd («Partene har ikke krav på justering av vederlaget som følge av fristforlengelse etter denne bestemmelsen») som veiledning og trekker ingen konklusjon. Om et krav er en følge av fristforlengelsen, er partenes spørsmål, og kategorien er TEs utsagn. Appen lukker ikke vederlagssporet på grunn av kategorien: et vederlagsspor som ikke er sendt, hindrer at kravene er avgjort (KA-U11), til TE sier «ingen krav» (KA-U12). Et sendt krav avgjøres som andre krav. Femte ledd utelukker ikke i seg selv vederlaget for en forsering etter § 33.8, som kreves i forseringssaken (FO-U2), men avgjør ikke om vilkårene for forsering er oppfylt; det er oppdragsgivers lesning. Forkastet: å avvise vederlagskrav så lenge grunnlaget har kategorien force majeure, og å godta kravet uten veiledning | 11.10, oppdragsgiver etter sparring (#309) | Bygger på [VS-U13](#vs-u13). Avviser ikke noe som godtas i dag. At «ingen krav» ikke er avkall på vederlaget for en forsering, står i [KA-U25](#ka-u25). Veiledningen hører til #313. Ikke bygget (#309) |
| <a id="ka-u25"></a>KA-U25: brevet for «ingen krav» i vederlagssporet (KA-U22) sier også: «Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.» Vederlaget for en forsering kreves særskilt (FO-U2), også når forseringen føres utenfor appen (OV-U2). Teksten må stå i brevet før «ingen krav» tas i bruk (#310), fordi et sendt brev beholder virkningen det hadde da det ble sendt (MM-U9). Appen avgjør ikke senere tvister om hvor langt avkallet når (KA-U17). Forkastet: at avkallet omfatter forseringsvederlaget, og å vente med spørsmålet til byggedel 4 | 11.10, oppdragsgiver etter sparring (#309) | Presiserer [KA-U17](#ka-u17) og brevteksten i [KA-U22](#ka-u22). I tråd med [KA-U14](#ka-u14): et avkall gjelder TEs eget, uttrykkelig identifiserte krav. Avgjør #382. Ikke bygget. Brevteksten hører til #309 |
| <a id="ka-u27"></a>KA-U27: et trekk, også av grunnlaget, avvises når en enighet trekket rammer, gir byggherren et fradrag, eller bygger på et brev som er merket etter KA-U20 og ikke avklart, fordi appen da ikke vet hva byggherren har avtalt. Delen om merket brev gjelder fra første versjon. Forkastet: at sperren bare gjelder fradrag, fordi beskyttelsen ikke kan vente til etter at trekk tas i bruk (svaret 10.10) | 11.10, oppdragsgiver (#309, #394) | Presiserer [KA-U22](#ka-u22). Delen om merket brev gjelder til merkingen er avklart etter [KA-U20](#ka-u20). Delen om fradrag bygges når fradrag kan uttrykkes ([KA-U9](#ka-u9)). Snevret inn 11.10 av [KA-U30](#ka-u30): delen om merket brev gjelder bare sporene merkingen gjelder. Ikke bygget |
| <a id="ka-u30"></a>KA-U30: et trekk avvises etter KA-U27 fordi en enighet bygger på et merket brev som ikke er avklart, bare når merkingen gjelder sporet enigheten gjelder (KA-U26). Gir et brev fra byggherren enighet om både grunnlaget og vederlaget, og er brevet merket bare for grunnlaget, avvises ikke TEs trekk av vederlagskravet på grunn av merkingen. Den som merker, velger hvilke spor merkingen gjelder; merker hen bare grunnlaget, har hen sagt at forbeholdet ikke gjelder vederlaget. Forkastet: at enhver enighet som bygger på et merket brev, sperrer trekk uansett hvilke spor merkingen gjelder | 11.10, oppdragsgiver (#309, #394) | Snevrer inn [KA-U27](#ka-u27), delen om merket brev, etter [KA-U26](#ka-u26): sperren gjelder i de sporene merkingen gjelder. Det andre KA-U27 avviser trekket for, et fradrag, er uendret. Av «en enighet trekket rammer» i KA-U27 følger at et trekk av grunnlaget avvises, i samme eksempel, når brevet er merket bare for vederlaget og ikke avklart, fordi trekket rammer enigheten om vederlaget ([GR-U5](#gr-u5)). I skjemaet er alle spor utgangspunktet når den som merker, oppgir sporene (KA-U26). Ikke bygget |

#### Svar og standpunkt

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| B-13 hovedvalg: alternativ (2) i streng form. Backend regner ut resultat, beløp, dager og subsidiært standpunkt av vurderingene og kravet. Et svar der klientens verdier ikke er like, avvises med serverens verdi; er de like, lagres serverens. Premissen er at resultatet oppsummerer vurderingene og ikke uttrykker noen egen vilje | 24.09, oppdragsgiver | Bygget 04.10 (#63); se BR-01 i 4.2. Sammenlikningen gjøres i forretningsreglene, som alle tre inngangene kaller. En delvis oppdatering må ha med hele svaret. Rettingen av BR-01 bygger på dette ([designnotatet](../design-b13-sannhetskilde-2026-09-23.md), avsnitt 4) |
| B-13 regelversjon: klienten sender versjonen av reglene og tekstgeneratorene, serveren avviser en annen versjon og lagrer den i hendelsen. Projeksjonen regner aldri om. `publish` stopper en pakke med annen versjon | 24.09, oppdragsgiver | Avgjør ikke B-10. Oppdragsgiver presiserte 05.10 (merknaden 05.10): «regner aldri om» gjelder de lagrede resultatene (resultat, beløp, dager). Standpunkt som utledes ved lesing, som subsidiært standpunkt og godtatt preklusjon, regnes med gjeldende regler. En regelendring som endrer gamle saker, skal si det og krever eget vedtak. Merknaden 05.10 er snevret inn 09.10 av [MM-U9](#mm-u9): det som regnes med gjeldende regler ved lesing, er relasjonen mellom brev, for eksempel at et vederlagssvar er subsidiært fordi grunnlagssvaret er avslått. Standpunktene i ett sendt brev vurderes ikke på nytt. For enigheter er merknaden 05.10 presisert 09.10 av [MM-U3](#mm-u3). [MM-U11](#mm-u11) (09.10) gjør et unntak fra MM-U9 for regelen som setter sammen standpunktene til et utfall. Bygget 04.10 (#63). Feltet heter `regelversjon` og ligger i `data` på alle BH-svar; konstanten er i `src/lib/domain/regelversjon.ts` og speilet i `backend/regler/` |
| B-13 begrunnelsestekst (T-a): den låste teksten er partens, og byggherren er bundet av den fordi byggherren sender den. Serveren kontrollerer feltene, ikke prosaen. En CI-test feiler hvis `src/lib/domain/` endres uten at regelversjonen økes. Merkingen i skjemaet skal si at teksten er byggherrens | 24.09, oppdragsgiver | Ikke bygget. Den låste delen og utdypningen lagres hver for seg i alle inngangene |
| <a id="ka-u18"></a>KA-U18: et avslag av grunnlaget (§ 32.3 tredje ledd) som byggherren sender fra appen, må ha en begrunnelse, mens et registrert brev kan stå uten. En begrunnelse som kommer senere, er et eget utsagn. Appen vurderer ikke om begrunnelsen er tilstrekkelig eller kom i tide. At teksten lagres, er vedtatt (B-13 om begrunnelsestekst, MM-U12). Forkastet: at begrunnelsen alltid er valgfri | 10.10, oppdragsgiver (#309) | At begrunnelsen står i samme brev som avslaget, er appens arbeidsflyt. Kontrakten krever begrunnelse uten ugrunnet opphold etter avslaget (§ 32.3 tredje ledd), og en senere begrunnelse registreres som eget utsagn. Presisert 10.10 av [KA-U21](#ka-u21): også påberopt preklusjon etter § 32.2 med subsidiær godkjenning må begrunnes. Utvidet 11.10 av [KA-U24](#ka-u24) til alle spor og kategorier. Ikke bygget. Kravet til brevet og det egne utsagnet hører til #309 |
| <a id="ka-u21"></a>KA-U21: påberoper byggherren i et svar fra appen at TEs varsel etter § 32.2 kom for sent, behandler appen det som et avslag etter § 32.3 tredje ledd, også når grunnlaget godkjennes subsidiært, og svaret må ha en begrunnelse etter KA-U18. Det er oppdragsgivers lesning av «avslått kravet», ikke en uttrykkelig regel i NS 8407. Resultatverdien i skjemaet avgrenser ikke begrunnelsesplikten. Appen vurderer ikke om begrunnelsen er tilstrekkelig eller kom i tide. En senere begrunnelse har ingen automatisk virkning på utfallet i appen, uten at det betyr at den er uten rettslig betydning. Forkastet: at bare standpunktet «avslått» krever begrunnelse | 10.10, oppdragsgiver etter sparring (#309) | Presiserer [KA-U18](#ka-u18). Utvidet 11.10 av [KA-U24](#ka-u24) til alle spor og kategorier. Ikke bygget (#309) |
| <a id="ka-u24"></a>KA-U24: et svar byggherren sender fra appen, må ha en begrunnelse når det har en selvstendig innsigelse eller avgrensning som gjør svaret mindre gunstig for TE enn kravet, i alle spor og alle kategorier. Det gjelder for eksempel avslag og delvis godkjenning, «ingen hindring», påberopt preklusjon etter § 33.4 og § 34.1.2, påberopt sen spesifisering etter § 33.6.1 (VS-U4) og begrensning etter § 34.1.3 (VS-U5), også når kravet godkjennes subsidiært. En felles begrunnelse kan dekke flere standpunkter. Et standpunkt som bare er subsidiært fordi grunnlaget er avslått, trenger ingen egen begrunnelse. Et registrert brev kan stå uten. En begrunnelse som kommer senere, er et eget utsagn. Appen kontrollerer at begrunnelsen finnes, ikke hva den dekker, om den er tilstrekkelig eller om den kom i tide (KA-U19, MM-U12). Kravet er appens atferd: for byggherrens svar i § 31–§ 35 krever NS 8407 begrunnelse bare i § 32.3 tredje ledd, og at innsigelser tapes når de ikke fremsettes i tide (§ 33.7 annet ledd), gir ikke samme plikt. Forkastet: begrunnelse bare der kontrakten krever det, og begrunnelse for frist og vederlag, men ikke for grunnlaget utenfor § 32 | 11.10, oppdragsgiver etter sparring (#309) | Utvider [KA-U18](#ka-u18) og [KA-U21](#ka-u21) fra § 32.3 tredje ledd til alle spor og kategorier. Presiserer [VS-U5](#vs-u5): kravet om å begrunne avgrensningen etter § 34.1.3 gjelder et svar fra appen, og et registrert brev kan stå uten, som etter KA-U18. At teksten lagres, følger B-13 om begrunnelsestekst (T-a). Snevret inn 11.10 av [KA-U31](#ka-u31): en felles begrunnelse dekker standpunktene i samme svar. Presisert 11.10 av [KA-U32](#ka-u32) for frafall. Ikke bygget. Kravet til brevet hører til #309, skjemaet til #313 |
| <a id="ka-u31"></a>KA-U31: begrunnelsen i et svar byggherren sender fra appen, står per svar, som utdypningen under svarets låste tekst. Et brev med svar i flere spor har én begrunnelse per svar som krever det, og den låste delen og begrunnelsen står da sammen per svar. Forkastet: «én felles begrunnelse for brevet, som dekker alle svarene i det» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet står i versjon 4 av spørsmålene på #410, svaret på #369 (V1). Snevrer inn [KA-U24](#ka-u24), som tillot begge: «En felles begrunnelse kan dekke flere standpunkter» gjelder standpunktene i samme svar. I tråd med B-13 om begrunnelsestekst («Den låste delen og utdypningen lagres hver for seg i alle inngangene»). Ikke bygget (#369) |
| <a id="ka-u32"></a>KA-U32: byggherrens frafall etter § 32.3 første ledd c i et svar fra appen må ha en begrunnelse etter KA-U24. Frafallet er en avgrensning som gjør svaret mindre gunstig for TE enn kravet på endringsordre: byggherren frafaller pålegget «mot å utstede endringsordre for allerede utført arbeid», og endringsordren avgrenses til arbeid som alt er utført. Forkastet: «nei. Frafallet er ikke en innsigelse eller avgrensning etter KA-U24.» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet står i versjon 4 av spørsmålene på #410, svaret på #369 (V2). Presiserer [KA-U24](#ka-u24) for frafall. Kontrollen bygges sammen med kravet etter KA-U24. Brevteksten for frafallet står i [LV-U4](#lv-u4), punkt 5. Ikke bygget (#369) |
| B-13 «godkjent» bare når hele kravet er godkjent, til nærmeste krone eller dag. 99 %-terskelen utgår | 24.09, oppdragsgiver | Gjelder både vederlag og frist. Bygget 04.10 i backend og frontend (#63, #167) |
| <a id="ka-u9"></a>KA-U9: byggherrens standpunkt om beløp er et beløp med fortegn som ikke kan være gunstigere for TE enn kravet. Det er «godkjent» når beløpene er like, og «delvis» når byggherrens beløp er mindre gunstig for TE. Regelen er den samme for tillegg og fradrag (§ 34.1.1 «partene», § 34.4 annet ledd). For et fradrag på −100 000 kr betyr «delvis» et større fradrag, for eksempel −150 000 kr | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Avgjør #189 |
| B-13 preklusjon ut fra byggherrens egen vurdering (§ 33.4, § 34.1.2, § 34.1.3) trekkes av systemet: prinsipalt avslått, med subsidiært standpunkt | 24.09, oppdragsgiver | Endret 10.10 av [VS-U5](#vs-u5) for § 34.1.3, ikke bygget: byggherren oppgir prinsipalt beløpet hen godtar etter begrensningen, og subsidiært beløpet hen godtar hvis innsigelsen ikke fører fram. Som skjemaet gjør i dag, nå eid av backend |
| B-13 frist uten fremdriftshindring (§ 33.1): dagene byggherren har vurdert, står som et videre subsidiært standpunkt i både brevet og hendelsen, også ved preklusjon etter § 33.4. Etter § 33.7 annet ledd tapes en innsigelse som ikke fremsettes i tide, og faller «ingen hindring», er dagene byggherrens eneste innsigelse mot omfanget | 05.10, oppdragsgiver | Henvisningen til § 33.7 annet ledd begrunner hvorfor dagene står i svaret. Om en innsigelse kom i tide, avgjør ikke appen ([VS-U2](#vs-u2), 09.10). Utvidet 11.10 av [VS-U13](#vs-u13) til § 33.3. Bygget 05.10 (#211). `subsidiaer_resultat` og `subsidiaer_godkjent_dager` regnes av dagene uansett hindring; regelversjon 4 |
| <a id="ka-u4"></a>KA-U4: i byggherrens vurderinger av varsel og rettidighet betyr `true` i tide og `false` for sent. Et spørsmål byggherren ikke har vurdert, utelates i hendelsen og er `null` i tilstanden. Om spørsmålet gjelder kravet, utledes av kravet og lagres ikke. Modellen har ingen standardverdi for slike vurderinger | 08.10, oppdragsgiver | Følger API-vedtaket 05.10. Gjelder en vurdering som mangler i et svar, ikke fravær av en innsigelse (U3 i [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md)). Bygget 08.10 for `spesifisert_krav_ok` (#272, DT-03), som før ble lagret som `true` når feltet manglet. Hendelser lagret før står med `true` |
| <a id="ka-u16"></a>KA-U16: første versjon har ingen egen type for forbehold i byggherrens svar. Byggherren bruker standpunktene som finnes. I et brev fra appen utleder appen virkningen av standpunktet i den faste teksten. Den tolker ikke utdypningen, og vurderingen er appens (MM-U12). Brevet er fortsatt det autoritative uttrykket for byggherrens standpunkt (B-03). Et registrert brev med et forbehold appen ikke kan uttrykke, bevares med teksten, men regnes ikke som en ubetinget godkjenning, og bindende handlinger som bygger på det, sperres til det er avklart. Det gjelder ethvert ekte registrert brev med noe appen ikke kan uttrykke: det bevares og forkastes ikke, og bindende handlinger som bygger på det, sperres etter mønsteret i MM-U2. Begrunnelsen er at et forbehold ikke er én ting, men for eksempel et delvis avslag, et vilkår, en avgrensning, et subsidiært standpunkt eller en reservasjon om senere vurdering. Forkastet foreløpig: å støtte utvalgte typer forbehold nå, der hver type får eget vedtak når den bygges; at et svar med forbehold ikke gir sammenfall; at forbeholdet registreres uten virkning; og å forby registrering av brev med forbehold | 10.10, oppdragsgiver etter sparring (#309) | Endrer ingen vedtak. [KA-U15](#ka-u15) er dermed oppfylt for forbehold. Et forbehold kan ikke lagres som ett felt. Presisert 10.10 av [KA-U19](#ka-u19) for brev fra appen og av [KA-U20](#ka-u20) for registrerte brev: sperren følger det som faktisk bygger på det appen ikke kan uttrykke. Presisert 11.10 av [KA-U26](#ka-u26). Ikke bygget (#309) |
| <a id="ka-u19"></a>KA-U19: i et brev fra appen beregner appen virkningen ut fra valgene parten gjør, og tolker ikke utdypningen (KA-U16). Skjemaet sier det fast, uten å tolke teksten: appen beregner virkningen ut fra valgene, og et forbehold appen ikke kan uttrykke, sendes utenfor appen og registreres. Det som bygger på forbeholdet, sperres da (KA-U16, KA-U20). Brevet får ingen ekstra tekst om dette, og hele brevet er fortsatt det autoritative uttrykket for partens standpunkt (B-03). Forkastet: en fast setning i brevet om hvor standpunktene står, fordi den ikke løser en motstrid mellom den faste teksten og utdypningen; og ingen veiledning. Utsatt: et varsel styrt av ord i utdypningen | 10.10, oppdragsgiver etter sparring (#309) | Presiserer [KA-U16](#ka-u16) for brev fra appen og besvarer spørsmålet fra PR #356. Gjelder også brev fra TE. Ikke bygget. Skjemaet hører til #313 |
| <a id="ka-u20"></a>KA-U20: et registrert brev med noe appen ikke kan uttrykke (KA-U16), merkes av den som registrerer. I første versjon registrerer hver side bare sine egne brev. Det er en avgrensning av produktet, ikke et krav i kontrakten, og heller ikke avsenderens vurdering ved registreringen blir rettslig bindende fordi den fryses (MM-U12). Sperren gjelder handlingene som faktisk bygger på det appen ikke kan uttrykke. Bygger bare handlingene i ett spor på forbeholdet, sperres de; kan avhengigheten ikke avgrenses, for eksempel når en godkjenning av grunnlaget er betinget av prisen, sperres bredere. En part kan også senere merke et registrert brev, som et nytt utsagn om det gamle brevet med sendetid (MM-U12), og motparten kan bestride merkingen (MM-U7). Historikken skrives ikke om. En enighet som faktisk er inngått, står (KA-U7, MM-U3), men appen fastslår ikke at en enighet finnes når en part har merket at brevet den bygger på, hadde et forbehold: uenigheten vises, og framtidige handlinger som bygger på enigheten, sperres. Sperren oppheves av et nytt utsagn fra den som sendte brevet, sendt fra appen eller registrert, som sier hva som avklares, og som uttrykker et standpunkt appen kan representere, for eksempel en revisjon der den er tillatt (GR-U10, KA-U7), eller en ny ubetinget godkjenning. Det nye utsagnet gjør ikke det gamle brevet ubetinget fra sendetidspunktet. Appen kontrollerer at utsagnet kan representeres, ikke om tvisten er løst. Forkastet: at alt som bygger på brevet, eller hele saken, sperres uansett avhengighet; at merking bare kan skje ved registreringen; og at bare en revisjon opphever sperren. Utsatt: at mottakeren registrerer motpartens brev uten at mottakerens vurdering styrer bindende handlinger | 10.10, oppdragsgiver etter sparring (#309) | Presiserer [KA-U16](#ka-u16): «det» i «bygger på det» leses som det appen ikke kan uttrykke, og «til det er avklart» som et nytt utsagn som kan representeres. Presiserer også [KA-U7](#ka-u7), [MM-U3](#mm-u3) og [KA-U11](#ka-u11) for en enighet som bygger på et merket brev. Gjelder også en endringsordre med pris og tid etter [OV-U2](#ov-u2). Følgen av at hver side registrerer sine egne brev: mottakeren kan ikke svare på eller godta et brev i appen før avsenderen har registrert det, men kan svare utenfor appen og registrere sitt eget svar. Presisert 11.10 av [KA-U26](#ka-u26) og [KA-U28](#ka-u28). Ikke bygget. Kjernen hører til #309, registreringen til #310 |
| <a id="ka-u26"></a>KA-U26: når en part har merket at et registrert brev hadde et forbehold appen ikke kan uttrykke (KA-U20), sperres de bindende handlingene som bygger på det appen ikke kan uttrykke, i de sporene merkingen gjelder. Blant dem er TEs aksept av svaret, at saken inngår i en endringsordre (EO-U5), og trekk av grunnlaget når godkjenningen ellers ville vært en endringsordre. At brevet ikke regnes som en ubetinget godkjenning (KA-U16), gir sperren, ikke et uavklart grunnlag: utfallet leses som før, et svar med forbehold kan gi sammenfall, og en enighet som faktisk er inngått, står (KA-U20). Visningen sier at et brev er merket og at partene er uenige, og slår ikke fast at det finnes en enighet. Den som merker, oppgir hvilke spor merkingen gjelder. En merking åpner aldri en sak der kravene er avgjort. Forkastet: at et merket svar ikke gir sammenfall og at grunnlaget da regnes som uavklart | 11.10, oppdragsgiver (#309, #394) | Presiserer [KA-U16](#ka-u16), [KA-U20](#ka-u20), [EO-U5](#eo-u5) (sperren mot at saken inngår i en endringsordre) og [KA-U11](#ka-u11) (en merking åpner ikke en avgjort sak). Merknaden i [GR-U7](#gr-u7) sier at et slikt brev «er ikke en ubetinget godkjenning», og «avklart» defineres av standpunktene ([MM-U13](#mm-u13)). I skjemaet er alle spor utgangspunktet når den som merker, oppgir sporene. Ikke bygget |

#### Aksept og enighet

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| <a id="ka-u1"></a>KA-U1: TEs aksept gjelder hele det konkrete svaret byggherren har gitt på gjeldende kravversjon i sporet, med alle standpunktene i det: preklusjon, vilkår, beløp eller dager og subsidiære standpunkter. Aksepten peker på svarets hendelse. Venter sporet på svar, eller gjelder svaret en tidligere kravversjon, avvises aksepten. Delvis enighet er ikke aksept | 08.10, oppdragsgiver | Presiserer SK-02 og SK-03 og målformen M2 under B-14. Utføres i kontrakten av [KT-U1](#kt-u1) (08.10). Radene står i [domenetabellen](../domenetabell/README.md). Snevret inn 10.10 av [FO-U5](#fo-u5), ikke bygget: aksepten av et fristavslag avvises så lenge en forseringssak viser til avslaget. Bygget 08.10 for aksepten (#272): aksepten viser til svaret i `refererer_til_event_id`, og regelen `CURRENT_RESPONSE` avviser alt annet enn sporets gjeldende svar, også i grunnlaget. Før pekte aksepten ikke på noe svar, og TE kunne godta svaret på en tidligere kravversjon (DT-01). At en ny kravversjon opphever en aksept, er bygget 09.10 (SK-02). Oppdragsgiver godtok 09.10 restrisikoen at en eldre aksept uten referanse bindes ved lesing til svaret som var gjeldende da den ble lest, også når de gamle reglene tillot en revisjon etterpå. Appen har ingen reelle data. Spørsmålet kom fra code-review i #297 (#274) |
| <a id="ka-u5"></a>KA-U5: godtar TE et svar som er delvis godkjent, blir sporet `GODKJENT` med byggherrens beløp eller dager. Byggherrens tall er da avtalt, og sporet er oppgjort på linje med et fullt godkjent krav | 08.10, oppdragsgiver | Som i dag (rad KA-08b i [domenetabellen](../domenetabell/README.md)). Avklarer arbeidshypotesen fra første del. Presisert 08.10 av [GR-U7](#gr-u7): aksepten gir enighet om byggherrens beløp eller dager, og sporet er oppgjort når grunnlaget også er avklart |
| <a id="gr-u7"></a>GR-U7: TE kan godta byggherrens gjeldende svar på vederlag eller frist uavhengig av grunnlaget. Aksepten er enighet om sporets egne spørsmål: beløp eller dager, og varslingen i sporet. Den er ikke enighet om ansvaret. Kravet er oppgjort først når grunnlaget også er avklart: godkjent uten preklusjon etter § 32.2, eller frafalt. Godtar TE avslaget på grunnlaget, lukkes saken, og enigheten om beløp eller dager får ingen virkning. En enighet står: byggherren kan ikke revidere et godtatt svar (SK-03), heller ikke mens grunnlaget venter på svar. Revisjonsretten etter GR-U4 gjelder svar som ikke er godtatt. Godkjenner byggherren hele kravet i sporet, er partene enige uten aksept: standpunktene faller sammen (presisert av oppdragsgiver samme dag, #274). Et slikt svar er låst for revisjon på samme måte som et godtatt svar (presisert av oppdragsgiver 09.10, #274). Prinsippet er at partene kan legge beløpet dødt mens de er uenige om grunnlaget; et subsidiært standpunkt er et avslag som viser hvor nær partene er. Forkastet: GR-U6, og å avvise aksept av vederlag og frist til grunnlaget er godkjent (det ville hindret sakens fremdrift) | 08.10, oppdragsgiver (#274) | Erstatter GR-U6. DT-11 er lukket. Presisert av [GR-U10](#gr-u10) (09.10): for grunnlaget er en godkjenning uten påberopt preklusjon enighet ved sammenfall. Presisert av [KA-U15](#ka-u15) (10.10): hvordan et forbehold i byggherrens svar virker på sammenfall, avgjøres før byggherren kan ta forbehold i et svar i TS-stien. Avgjort 10.10 av [KA-U16](#ka-u16): første versjon har ingen egen forbeholdstype. Et registrert brev med et forbehold appen ikke kan uttrykke, er ikke en ubetinget godkjenning. «Avklart» er en navngitt betingelse som defineres rett av standpunktene ([MM-U13](#mm-u13), 10.10). Byggestatus i Python: aksepten godtas uavhengig av grunnlaget (K 08.10). Statusen kaller enigheten `godkjent`, som om kravet var oppgjort, og et svar som godkjenner hele kravet, gir «allerede avsluttet» ved aksept; enighet og oppgjort som egne begreper prøves i språkprøven (#274). At en enighet står mens grunnlaget venter, er bygget 09.10 (SK-03, rad GR-23). At et fullt godkjent svar er låst for revisjon, er ikke bygget (#298) |
| <a id="gr-u6"></a>GR-U6: venter grunnlaget på nytt svar, avvises TEs aksept av et svar på vederlag eller frist som er subsidiært til nytt svar. Når byggherren har svart på grunnlaget, også med avslag, kan TE godta svaret, også et subsidiært. Byggherren beholder revisjonsretten etter GR-U4 mens grunnlaget venter, og SK-03 gjelder når standpunktene ligger fast. Forkastet: å la aksepten gjelde (rekkefølgen mellom aksept og revisjon ville avgjort utfallet), og en aksept som faller ved revisjon (betinget aksept, i strid med KA-U1) | 08.10, oppdragsgiver | **Erstattet 2026-10-08 av [GR-U7](#gr-u7)** før det ble bygget. Vinduet konstruerte en regel modellen trengte, ikke kontrakten |
| <a id="gr-u8"></a>GR-U8: TE kan ikke godta et svar som godkjenner hele kravet. Partene er alt enige ved sammenfall (GR-U7), og aksepten avvises uten at journalen endres. Forkastet: å godta aksepten uten virkning | 09.10, oppdragsgiver etter review av PR #306 | Avgjør arbeidshypotesen i rad GR-25. Som i dag (`NOT_ALREADY_ACCEPTED`) i Python og i målmodellen |
| <a id="ka-u6"></a>KA-U6: TE kan trekke et krav i et spor der partene er enige, betinget eller virksomt, så lenge saken ikke er avsluttet. Enigheten får da ingen virkning, på samme måte som en ny kravversjon opphever den (SK-02). Forkastet: at en enighet låser kravet mot trekk | 09.10, oppdragsgiver etter review av PR #306 | Presisert og snevret inn av vedtak samme dag og senere: etter [KA-U7](#ka-u7) (09.10) avvises en ny kravversjon i et spor med enighet, mens trekket står. «Avsluttet» betyr at kravene er avgjort ([KA-U11](#ka-u11), 09.10). Gjelder ikke grunnlaget når godkjenningen av det er en endringsordre etter § 32.3 a ([KA-U13](#ka-u13), 09.10). Et trekk er bare avkall på TEs eget krav og opphever ikke pålegg, endringsordre, utførelsesplikt eller motpartens rettigheter etter en avtale ([KA-U14](#ka-u14), 10.10). KA-U14 kan snevre inn KA-U6 der enigheten gir byggherren en rettighet, for eksempel et fradrag (KA-U9). Bygget i målmodellen i språkprøven (#304), rad KA-26. Snevret inn 10.10 av [KA-U22](#ka-u22) til byggedel 3: trekket avvises når appen ikke kan bevare byggherrens avtalte rettigheter. |
| <a id="ka-u7"></a>KA-U7: en enighet binder begge parter. En ny kravversjon i et spor med enighet, betinget eller virksom, avvises. Et godtatt avslag er en enighet på byggherrens premisser (KA-U1). TE kan trekke kravet (KA-U6). Et krav på nytt grunnlag, for eksempel kostnader som ikke var kjent, går i en ny sak, som etter KA-U3. En åpenbar skrivefeil hører til B-16. Forkastet: at TE kan oppheve enigheten med en ny kravversjon, som i dag, og en ny kravversjon bare med byggherrens samtykke | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Endrer SK-02 og vedtaket om ny kravversjon 05.10 for spor med enighet, og gjør det overflødig at KA-U3 avhenger av om andre spor er åpne. Grunnlaget er § 34.2.2 første ledd (et akseptert tilbud er avtalt vederlag); ingenting i § 33 eller § 34 lar TE gå fra en avtale ensidig. Snevret inn 09.10 av [KA-U13](#ka-u13): et trekk av grunnlaget avvises når godkjenningen av det er en endringsordre etter § 32.3 a. Presisert 10.10 av [KA-U20](#ka-u20) for en enighet som bygger på et merket brev. Presisert 11.10 av [MM-U19](#mm-u19): et registrert brev avvises ikke, men får ingen virkning. Ikke bygget: i dag opphever en ny kravversjon enigheten (SK-02) |
| <a id="mm-u3"></a>MM-U3: virkningen av en enighet fastsettes når den inngås. Har TE godtatt et svar, gjelder enigheten svaret med alle standpunktene slik det ble godtatt (KA-U1), også når en senere regelendring ville gitt et standpunkt i svaret en annen virkning. Dagens utledning kan vise at regelen er endret. Regelendringer som endrer avledet standpunkt i saker uten enighet, følger B-13 | 09.10, oppdragsgiver | Presiserer B-13 (merknaden 05.10) for enigheter. Oppdragsgiver presiserte 09.10 etter review (merknaden 09.10): innholdet i en enighet fastsettes når den inngås: svaret, standpunktene og virkningen de hadde etter reglene da. Om vilkåret for virkning er oppfylt, utledes løpende (GR-U7), så en betinget enighet blir virksom når grunnlaget avklares. Første formulering, «virkningen av en enighet fastsettes når den inngås», kunne leses som at en betinget enighet ble stående betinget. Presisert 09.10 av [KA-U10](#ka-u10): enigheten gjelder brevets virkning. Modellforslaget foreslår at innholdet lagres som et enighetsgrunnlag i hendelsen som skaper enigheten. Presisert 10.10 av [KA-U20](#ka-u20) for en enighet som bygger på et merket brev. Ikke bygget. I dag går et godtatt svar som var prinsipalt prekludert og subsidiært godkjent, fra `LUKKET_AVSLATT` til grunnlag `godkjent` når § 32.2 ikke gjelder kategorien (K 09.10, kjernen). Gjelder innsnevringen i #220. Forløp C i modellforslaget |
| <a id="ka-u10"></a>KA-U10: godtar TE byggherrens svar, gjelder enigheten svaret med den virkningen brevet hadde da det ble sendt, slik beslutningsgrunnlaget i brevet uttrykker den (MM-U9). Det gjelder også når reglene er endret mellom brevet og aksepten. Aksepten viser til svaret og lagrer regelversjonen TE fikk se. Innholdet i enigheten leses fra beslutningsgrunnlaget og kopieres ikke. Ved enighet ved sammenfall (GR-U8, GR-U10) er brevet og enigheten samtidige. NS 8407 regulerer ikke appens regelversjoner, så valget er produktatferd; det følger B-03 (brevet er det autoritative uttrykket for partens standpunkt) og § 34.2.2 første ledd (et akseptert tilbud binder slik det sto). Forkastet: at enigheten fryser virkningen etter reglene da aksepten ble registrert, som en egen kopi i aksepten | 09.10, oppdragsgiver (#273, #308) | Presiserer MM-U3: «fastsettes når den inngås» betyr brevets virkning, slik brevet ble godtatt. Et avvik etter dagens regler vises som merknad (MM-U9). Hva beslutningsgrunnlaget fryser, er presisert 09.10 av [MM-U11](#mm-u11): standpunktene og sammenfallet. Utfallet og vilkåret utledes. Endret 10.10 av [MM-U17](#mm-u17) for registrerte brev: appens vurdering følger reglene ved registreringen, ikke da brevet ble sendt. § 34.2.2 første ledd gjelder byggherrens aksept av TEs tilbud og bærer ikke vedtaket alene. Grunnlaget er B-03, KA-U1 og MM-U9 (rettet etter review av #322). Ikke bygget |
| <a id="ka-u11"></a>KA-U11: kravene i saken er avgjort når grunnlaget er avklart etter GR-U7, hvert vederlags- og fristkrav er trukket eller har en virksom enighet, og det ikke finnes et spor TE fortsatt kan sende (EO-U2, GR-U3). Er kravene avgjort, avvises hver kommando som kan endre utfallet: trekk, ny kravversjon, varsel etter § 33.4 og byggherrens revisjon, også av et frafall. En bestridelse av en opplysning godtas (MM-U7). «Saken er avsluttet» i KA-U6 og MM-U7 betyr at kravene er avgjort. Predikatet leses av utsagnene og relasjonene, ikke av status. Grunnlaget er KA-U7 (ingen part går ensidig fra en enighet), § 34.2.2 første ledd og § 31.3 annet ledd. Forkastet: ingen samlet sperre, slik at hvert spor bare sperres av sine egne predikater; og en sperre per spor, der en virksom enighet sperrer trekk | 09.10, oppdragsgiver (#308) | Presiserer KA-U6, MM-U7 og GR-U9. Presisert 09.10 av [KA-U12](#ka-u12): «ingen krav» teller som trukket. Et godtatt avslag av grunnlaget (SK-01) og et trukket grunnlag (GR-U5) sperrer med egne predikater. Presisert 10.10 av [KA-U20](#ka-u20) for en enighet som bygger på et merket brev. Presisert 11.10 av [KA-U26](#ka-u26), [KA-U28](#ka-u28) og [KA-U29](#ka-u29), og av [MM-U19](#mm-u19) for registrerte brev. Ikke bygget |
| <a id="ka-u28"></a>KA-U28: når kravene er avgjort, godtas en avklaring etter KA-U20 fra den som sendte brevet, når den ikke endrer noe standpunkt, for eksempel en ny ubetinget godkjenning med samme innhold. Avklaringen opphever sperren etter KA-U26. En revisjon som endrer et standpunkt, avvises fortsatt (KA-U11) | 11.10, oppdragsgiver (#309, #394) | Presiserer [KA-U11](#ka-u11) og [KA-U20](#ka-u20). Avklaringen er ikke en revisjon etter [GR-U10](#gr-u10) eller [KA-U7](#ka-u7). En senere merking når kravene er avgjort, endrer ikke utfallet og godtas, etter KA-U11 og [KA-U26](#ka-u26). Ikke bygget |
| <a id="ka-u29"></a>KA-U29: når TE har godtatt byggherrens avslag av grunnlaget, godtas de samme utsagnene som når kravene er avgjort, blant dem bestridelse av en opplysning, innsigelse etter § 5 tredje ledd, protest mot innsigelsen, påberopt passivitet etter § 32.3 annet ledd og merking etter KA-U20. De registreres og vises uten virkning på utfallet i appen. Det som kan endre utfallet, for eksempel et nytt svar som endrer et standpunkt, avvises fortsatt | 11.10, oppdragsgiver (#309, #394) | Utvider det som godtas etter [KA-U11](#ka-u11) og [MM-U7](#mm-u7) til et godtatt avslag av grunnlaget ([GR-U7](#gr-u7), SK-01). Innsigelsen følger [VS-U9](#vs-u9) og [VS-U14](#vs-u14), passiviteten [VS-U12](#vs-u12). At innsigelse, protest og påberopt passivitet godtas når kravene er avgjort, er et arbeidsvalg etter KA-U11 og MM-U7 (paragrafmatrisen). Ikke bygget |
| <a id="ka-u13"></a>KA-U13: et trekk av grunnlaget avvises når byggherrens godkjenning av det er en endringsordre etter § 32.3 første ledd a, altså i underkategoriene under ENDRING som § 32.2 gjelder for (GR-U11), og partene dermed er enige ved sammenfall (GR-U10). Når TE har mottatt endringsordren, «blir han forpliktet til å utføre endringsarbeidet» (§ 31.3 annet ledd). Et trekk av vederlag eller frist står som i KA-U6. Et spor TE ikke vil kreve, lukkes med «ingen krav» (KA-U12). I kategoriene SVIKT, ANDRE og FORCE_MAJEURE, og i underkategorien EO, der endringsordren er utstedt etter § 31.3 og binder TE uavhengig av KOE-saken, står KA-U6 og KA-U7: TE kan trekke grunnlaget også når partene er enige om det, fordi trekket bare gir fra seg TEs eget krav. Før byggherren har svart, og etter avslag eller frafall, kan TE trekke grunnlaget som før (GR-U5). Trekket er i alle tilfeller sperret når TE har godtatt et avslag av grunnlaget (SK-01) eller kravene er avgjort (KA-U11). Forkastet: å godta trekket etter ordlyden i KA-U6, slik at alle spor trekkes og endringsordren etter § 32.3 a mister virkning; og å la forbudet gjelde all enighet om grunnlaget, også der godkjenningen ikke er en endringsordre | 09.10, oppdragsgiver (#308) | Snevrer inn KA-U6 og KA-U7 for grunnlaget når godkjenningen er en endringsordre. Om godkjenningen er en endringsordre, avgjøres etter [GR-U12](#gr-u12) og [GR-U13](#gr-u13) (10.10). Presisert 10.10 av [KA-U14](#ka-u14): sperren følger endringsordren etter GR-U13 og gjelder til det er avklart om brevet oppfyller § 31.3. Forskjellen fra underkategorien EO er begrunnet i hvordan appen håndterer trekket, ikke i at endringsordrene har ulik rettslig bindende kraft. Snevret inn 10.10 av [KA-U22](#ka-u22) til byggedel 3: trekket avvises når appen ikke kan bevare byggherrens avtalte rettigheter. Ikke bygget |
| <a id="ka-u14"></a>KA-U14: trekk etter KA-U6 innebærer bare avkall på TEs eget, uttrykkelig identifiserte krav. Trekket opphever ikke pålegg, endringsordre, utførelsesplikt eller motpartens rettigheter etter en avtale. Enighet om grunnlaget sperrer derfor ikke i seg selv slikt avkall. Dersom appen ikke kan gjennomføre trekket uten å gi det videre virkninger, skal handlingen sperres. Et trekk av grunnlaget er avkall på alle krav i saken, også godkjent vederlag og godkjent fristforlengelse (GR-U5), og brevet sier det tydelig. Er godkjenningen av grunnlaget en endringsordre etter § 32.3 første ledd a (GR-U13), er endringsordren byggherrens svar i grunnlagssporet i KOE-saken. Et trekk av grunnlaget ville da gitt journalen den videre virkningen at endringsordren leses som bortfalt, og det sperres (KA-U13). TE gir avkall på vederlag og frist ved å trekke dem (KA-U6) eller med «ingen krav» (KA-U12). I underkategorien EO står endringsordren i en egen EO-sak og berøres ikke av trekket i KOE-saken, så KA-U6 står. Forskjellen er begrunnet i hvordan appen håndterer trekket, ikke i at endringsordrene har ulik rettslig bindende kraft. Registrert korrespondanse: Om brevet oppfyller § 31.3, må avklares før appen tillater trekk som kan berøre endringsordren. Manglende opplysning er ikke tilstrekkelig til å konkludere. Er det avklart at brevet ikke er en endringsordre, kan TE trekke grunnlaget som avkall etter KA-U6 og GR-U5. Trekket opphever ikke et eventuelt pålegg eller en utførelsesplikt. Brev og visning fremstiller ikke et trekk som at pålegget, endringsordren eller utførelsesplikten er bortfalt. Forkastet: at all bindende enighet om grunnlaget sperrer trekket, og at sperren gjelder enighet ved sammenfall uavhengig av § 31.3 | 10.10, oppdragsgiver (#273) | Presiserer KA-U6, KA-U13 og GR-U5. Avgrenser [EO-U1](#eo-u1): en slik endringsordre er svaret i grunnlagssporet i KOE-saken, ikke en EO-sak. Kan snevre inn KA-U6 der enigheten gir byggherren en rettighet, for eksempel et fradrag (KA-U9). Krav til brevteksten (#309, #310) og visningen (#313). Gjennomført i brevteksten 10.10 av [KA-U22](#ka-u22), som også sperrer et trekk av grunnlaget når appen ikke kan bevare byggherrens avtalte rettigheter. Ikke bygget |
| Aksept av avslag gir `AVSLATT_AKSEPTERT` | 19.09 | TFR-01 |

#### Grunnlag, frafall og trekk av grunnlaget

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| <a id="gr-u1"></a>GR-U1: en ny kravversjon av grunnlaget åpner sporet også når underkategorien er uendret, som for vederlag og frist. Svaret på forrige versjon faller i tilstanden og står i journalen, grunnlaget venter på nytt svar, og en aksept av forrige svar avvises (KA-U1). Et svar på vederlag eller frist som var subsidiært, forblir subsidiært til sporet eller grunnlaget besvares igjen, som ved endret underkategori | 08.10, oppdragsgiver | Ikke bygget (DT-04). Utvider vedtaket om endret underkategori 05.10 (#215) til alle grunnlagsversjoner etter et svar som ikke er låst |
| <a id="gr-u2"></a>GR-U2: et grunnlag byggherren har godkjent og som er låst, kan ikke endres, heller ikke underkategorien. Vedtaket om endret underkategori 05.10 (#215) gjelder svar som ikke er låst: avslått, prekludert etter § 32.2 og frafalt | 08.10, oppdragsgiver | Presisert 09.10 av [GR-U10](#gr-u10): «låst» er enighet ved sammenfall. Som i dag: `NOT_LOCKED` avviser oppdateringen |
| <a id="gr-u10"></a>GR-U10: har byggherren godkjent grunnlaget uten å påberope preklusjon, er partene enige ved sammenfall, og byggherren er bundet. Byggherren kan ikke revidere godkjenningen. Etter § 32.3 a er svaret en endringsordre. «Låst» er ikke lenger et eget begrep, men enighet. Frafall (GR-U9) er byggherrens standpunkt og kan fortsatt revideres | 09.10, oppdragsgiver | Presiserer GR-U2 og GR-U7. Retter avviket i målmodellen som #312 beskriver. At svaret er en endringsordre etter § 32.3 a, gjelder underkategoriene som § 32.2 gjelder for (GR-U11, [KA-U13](#ka-u13); 09.10), også et svar som ikke sier noe om varslingen ([GR-U12](#gr-u12); 10.10). Endret 10.10 av [GR-U13](#gr-u13): svaret er en endringsordre bare når § 31.3 også er oppfylt |
| <a id="gr-u3"></a>GR-U3: etter frafall (§ 32.3 c) blir saken `OMFORENT` når vederlag og frist er oppgjort, ved godkjenning eller godtatt avslag. Endringsordren for utført arbeid utstedes i en egen EO-sak (#69) med egen fullmakt (GFK-06), ikke reaktivt fra KOE-saken; `kan_utstede_eo` er `false` i KOE-saken | 08.10, oppdragsgiver | Som i dag: `OMFORENT` med godkjente krav og `kan_utstede_eo`. Godtatte avslag ga `UKJENT` på vedtaksdatoen og gir `OMFORENT` fra 09.10 (SK-04). Presiserer vedtaket om `FRAFALT` 05.10. Presisert 08.10 av [EO-U1](#eo-u1), som ikke er bygget: `eo_utstedt` i en KOE-sak avvises, og `kan_utstede_eo` betyr at KOE-saken kan inngå i en EO-sak |
| <a id="gr-u4"></a>GR-U4: reviderer byggherren svaret på vederlag eller frist mens grunnlaget venter på nytt svar, er det nye svaret prinsipalt. Det blir subsidiært når grunnlaget avslås eller prekluderes, fordi det utledes av grunnlaget (vedtaket om svar når grunnlaget er avslått, 05.10) | 08.10, oppdragsgiver | Som i dag i projeksjonen, fullmakten og brevet |
| <a id="gr-u5"></a>GR-U5: trekker TE grunnlaget, trekkes alle krav som er sendt, også et vederlag eller en frist byggherren har godkjent, fordi ansvarsgrunnlaget bærer dem. Saken blir `LUKKET_TRUKKET` | 08.10, oppdragsgiver | Vedtaket var som i Python på vedtaksdatoen (kaskaden i `_handle_grunnlag_trukket`). Spor som ikke er sendt: SD-02 (05.10). Senere vedtak, ikke bygget i Python: trekket avvises når godkjenningen av grunnlaget er en endringsordre etter § 32.3 a ([KA-U13](#ka-u13), 09.10), og brevet sier tydelig at trekket er avkall på alle krav i saken, også godkjent vederlag og godkjent fristforlengelse ([KA-U14](#ka-u14), 10.10). Snevret inn 10.10 av [KA-U22](#ka-u22) til byggedel 3: trekket avvises når appen ikke kan bevare byggherrens avtalte rettigheter. |
| <a id="gr-u9"></a>GR-U9: TE kan ikke godta byggherrens frafall (§ 32.3 c). Frafallet er byggherrens standpunkt, ikke en enighet; grunnlaget er avklart uten aksept (GR-U7), byggherren beholder revisjonsretten, og TE kan sende ny kravversjon (GR-U2). Forkastet: å la aksepten låse frafallet for revisjon | 09.10, oppdragsgiver etter review av PR #306 | Presisert 09.10 av [KA-U11](#ka-u11): revisjonsretten og TEs nye kravversjon gjelder til kravene er avgjort. Bygget i målmodellen i språkprøven (#304), rad GR-26 |
| <a id="gr-u11"></a>GR-U11: § 32.2 gjelder alle underkategorier under ENDRING unntatt EO, som i dag. Hver bestemmelse viser selv til § 32.2: § 14.4 (LOV_GJENSTAND), § 14.6 annet ledd (VALGRETT), § 15.2 (LOV_PROSESS), § 21.4 annet ledd (SAMORD), § 24.2.2 fjerde ledd (SVAR_VARSEL) og § 26.3 (GEBYR). IRREG er § 32.1 direkte. Henvisningen tar med preklusjonen i § 32.2 og byggherrens svarplikt i § 32.3, med passivitetsregelen | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Avgjør #220, uten innsnevring. Vedtaket om `grunnlag_varslet_i_tide` under B-13 er uendret |
| <a id="gr-u12"></a>GR-U12: godkjenner byggherren grunnlaget uten å påberope preklusjon i en underkategori der § 32.2 gjaldt da brevet ble sendt (GR-U11), er svaret en endringsordre etter § 32.3 første ledd a, også når brevet ikke sier noe om varslingen. Det gjelder også registrert korrespondanse. Beslutningsgrunnlaget fryser derfor om § 32.2 gjaldt, som en del av virkningen brevet hadde (MM-U9, MM-U11). Frontenden varsler byggherren og betegner svaret som en endringsordre, slik at byggherren tydelig forstår virkningen. Forkastet: at godkjenningen bare er en endringsordre når brevet har et utsagn om varslingen | 10.10, oppdragsgiver (#308) | Presiserer GR-U10 og KA-U13, og utvider formen i MM-U11. Endret 10.10 av [GR-U13](#gr-u13): endringsordren krever også § 31.3, og om § 32.2 gjaldt, fryses som appens vurdering. Endret 10.10 av [MM-U17](#mm-u17) for registrerte brev: appens vurdering følger reglene ved registreringen, ikke da brevet ble sendt. Ikke bygget på vedtaksdatoen: kjernen leste da om brevet har et utsagn etter § 32.2 (#308). Bygget i kjernen 10.10 (merknaden 10.10 til FK, runde 2). Frysingen hører til formatet (#273), varselet og betegnelsen til frontenden (#313) |
| <a id="gr-u13"></a>GR-U13: byggherrens godkjenning av grunnlaget er en endringsordre etter § 32.3 første ledd a bare når også § 31.3 er oppfylt: endringsordren «skal være skriftlig og gi beskjed om at det kreves en endring, samt hva endringen går ut på», og den «må være gitt av byggherrens representant, jf. punkt 9, eller av en person med skriftlig fullmakt til å utstede slike». For brev sendt fra appen sørger appen for det: brevet sier at endringen kreves og viser til pålegget i varselet, og fullmakten kontrolleres i godkjenningsflyten (GFK-06). For registrert korrespondanse oppgir den som registrerer, om brevet var en endringsordre etter § 31.3. Opplysningen er registratorens vurdering og ikke en rettslig avgjørelse. Mangler opplysningen, vet appen ikke om brevet er en endringsordre, og manglende opplysning er ikke nok til å konkludere (KA-U14). Om § 32.2 gjaldt (GR-U12), fryses i beslutningsgrunnlaget som appens vurdering etter reglene og underkategorien da brevet ble sendt, med regelversjonen, atskilt fra det byggherren sa (MM-U12). Forkastet: at en godkjenning uten påberopt preklusjon i en underkategori med varslingsplikt alene er en endringsordre, og at manglende opplysning om § 31.3 betyr at brevet ikke er en endringsordre | 10.10, oppdragsgiver (#273) | Endrer GR-U10 og GR-U12: endringsordren krever også § 31.3. Endret 10.10 av [MM-U17](#mm-u17) for registrerte brev: om § 32.2 gjaldt, fryses som appens vurdering etter reglene ved registreringen, ikke da brevet ble sendt. Krav til skrivestien (#310): hvert grunnlagssvar fra appen som godkjenner grunnlaget uten påberopt preklusjon der § 32.2 gjelder, får brevteksten etter § 31.3 og går gjennom fullmakten. Hvordan opplysningen registreres og avklares, avgjøres med kommandoen i #310. Presisert 11.10 av [GR-U14](#gr-u14) (ordlyden) og utvidet av [GR-U15](#gr-u15) (beskrivelsen av pålegget i TEs varsel). Ikke bygget |
| <a id="gr-u14"></a>GR-U14: et grunnlagssvar fra appen som etter GR-U12 og GR-U13 er en endringsordre, sier: «Byggherren godkjenner grunnlaget. Svaret er en endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever at endringen utføres slik pålegget er beskrevet i TEs krav i brev <n> av <dato>: «<TEs beskrivelse av pålegget>».» Brevet <n> er det med kravversjonen svaret gjelder (HF-U1), også etter en ny kravversjon. Byggherrens låste tekst siterer da en fritekst fra TE som appen ikke tolker (KA-U19). Byggherren står bak sitatet som beskrivelse av endringen. Setningen velges når byggherren godkjenner grunnlaget uten å påberope preklusjon, og § 32.2 gjaldt. Den er byggherrens utsagn: byggherren ser og godkjenner den (GR-U12), og den er derfor ikke appens vurdering. Er TEs krav sendt utenfor appen og registrert, viser setningen til det registrerte brevet uten sitat: «… byggherren krever at endringen utføres slik pålegget er beskrevet i TEs krav i brev <n> av <dato>.» Forkastet for registrerte krav: «Byggherren beskriver» – «Byggherren må selv beskrive endringen i godkjenningen. Uten en slik beskrivelse avvises godkjenningen.» og «Avvis godkjenningen» – «En slik godkjenning avvises i appen, og byggherren må svare utenfor appen.» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet står i versjon 4 av spørsmålene på #410, svaret på #369 (V4 a). Varianten for registrerte krav er oppdragsgivers svar 11.10 i oppfølgingen på #369 (spørsmål 1): det registrerte brevet bærer selv beskrivelsen, og ordlyden følger GR-U13. Presiserer [GR-U13](#gr-u13): «brevet sier at endringen kreves og viser til pålegget i varselet». GR-U14 leser «varselet» i GR-U13 som TEs krav i kravversjonen svaret gjelder; det er mer enn en presisering av ordlyden. Beskrivelsen i TEs varsel følger [GR-U15](#gr-u15). Fullmakten kontrolleres i godkjenningsflyten (GFK-06) og bygges i #310; ingen reelle brev sendes før #310 ([OV-U1](#ov-u1)). Ikke bygget. Teksten bygges i #369 |
| <a id="gr-u15"></a>GR-U15: TEs varsel etter § 32.2 fra appen må ha en beskrivelse av pålegget. Følgen for TE: et varsel uten beskrivelse avvises i appen. Varselet skal gis «uten ugrunnet opphold» (§ 32.2), så TE kan miste tid eller må varsle utenfor appen og registrere varselet. Forkastet: «byggherren beskriver endringen i utdypningen, og en slik godkjenning avvises uten den», og «en godkjenning som ville vært en endringsordre, avvises når varselet ikke har en beskrivelse. Byggherren må da svare utenfor appen.» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet står i versjon 4 av spørsmålene på #410, svaret på #369 (V4 b, «Hva endringen går ut på, når TEs varsel ikke beskriver pålegget»). Utvider [GR-U13](#gr-u13): beskrivelsen er det endringsordren i [GR-U14](#gr-u14) viser til som hva endringen går ut på (§ 31.3). Varselet etter § 32.2 står i TEs grunnlagskrav ([LV-U4](#lv-u4), punkt 1). Et registrert varsel kan stå uten beskrivelse; det følger av alternativet selv («må varsle utenfor appen og registrere varselet»), og [GR-U14](#gr-u14) har ordlyden for et registrert krav. Ikke bygget |
| <a id="gr-u16"></a>GR-U16: i TEs grunnlagskrav i underkategorien endringsordre (§ 31.3) oppgir TE endringsordrens dato eller nummer, og opplysningen er påkrevd. Det gjelder også når et slikt krav sendt utenfor appen registreres: den som registrerer, må oppgi endringsordrens dato eller nummer, og ellers avvises registreringen. Forkastet: «Bare fra appen» – «Feltet er påkrevd i krav fra appen. Et registrert brev står som det ble sendt (MM-U17) og kan stå uten feltet, slik et registrert brev kan stå uten begrunnelse (KA-U24).» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet: «skal TE oppgi endringsordrens dato eller nummer? Det er et nytt felt i grunnlagskravet.» Anbefalingen, som oppdragsgiver godtok: «TE oppgir endringsordrens dato eller nummer, som et påkrevd felt.» Spørsmålet står i versjon 4 av spørsmålene på #410 (V5 punkt 1), svaret på #369 (5.1b). At kravet også gjelder registrerte krav, er oppdragsgivers svar 11.10 i oppfølgingen på #369 (spørsmål 2). I tråd med [HF-U1](#hf-u1): et utsagn viser uttrykkelig til det det gjelder. Brevteksten gjengir opplysningen ([LV-U4](#lv-u4), punkt 1). Ikke bygget |
| B-13 endret underkategori etter byggherrens svar på grunnlaget krever nytt svar. Låsingen og § 32.2-vurderingen fra det forrige svaret faller bort, og grunnlaget venter på svaret igjen. Journalen beholder det forrige svaret som historikk. Forkastet: å avvise endringen, og å la projeksjonen regne det gamle svaret av gjeldende underkategori | 05.10, oppdragsgiver | Utvidet 08.10 av [GR-U1](#gr-u1) til alle grunnlagsversjoner etter et svar som ikke er låst, og snevret inn 08.10 av [GR-U2](#gr-u2): gjelder svar som ikke er låst. Bygget 05.10 i projeksjonen (#215). Hele svaret faller i tilstanden, også resultatet. Et svar på vederlag eller frist som var gitt subsidiært, forblir subsidiært til sporet eller grunnlaget besvares igjen (oppdragsgiver 05.10) |
| B-13 svar på vederlag og frist når grunnlaget er avslått eller prekludert (§ 32.2): journalen og sporstatusen har resultatet av beløpene og dagene, som et subsidiært standpunkt som får virkning hvis grunnlaget senere godkjennes. Brev og fullmakt sier «prinsipalt avslått (grunnlaget)» med det subsidiære resultatet. At hele svaret er subsidiært, utledes av grunnlaget og lagres ikke i hendelsen | 05.10, oppdragsgiver | Redaksjonell retting 10.10 (oppdragsgiver): en doblet frase, «med det subsidiære resultatet», er fjernet fra vedtaksteksten; meningen er uendret. Ordbytte 11.10 (oppdragsgiver, #384): «ansvarsgrunnlaget» er byttet til «grunnlaget», også i brevteksten, etter [HF-U2](#hf-u2). Innholdet er uendret. Bygget i brev og fullmakt (#168). Ordet ble byttet i brevet 10.10 (#313). Saksvisningen i frontend: #214 |
| B-13 `grunnlag_varslet_i_tide` avvises utenfor § 32.2 (endring som ikke er formell endringsordre). Fullmakt og brev snevres inn til samme omfang | 24.09, oppdragsgiver | Forretningsreglene avviser feltet utenfor § 32.2 fra 04.10 (#63). Fra 05.10 bruker fullmakt, brev, projeksjonen og skjemaet samme regel, `regler.grunnlag.er_grunnlag_subsidiaert` og speilet `erGrunnlagetSubsidiaert` (#186); før brukte status, fullmakt/brev og skjema tre ulike omfang. En eldre hendelse med feltet `false` ved EO prekluderer ikke |
| B-13 «frafalt» (§ 32.3 c) avvises utenfor irregulær endring og valgrett | 24.09, oppdragsgiver | Bygget 04.10 i forretningsreglene (#63) |
| Byggherren kan svare «avslått» og samtidig påberope at grunnlaget er varslet for sent (§ 32.2). Begge grunner gjelder; preklusjonen er hovedgrunnen, og avslaget gjelder subsidiært | 05.10, oppdragsgiver | Godtas i dag (K 05.10). Brev, visning og standpunkt må vise begge, med preklusjonen først (B-14, M1) |
| #235: frafall (§ 32.3 c) kan ikke kombineres med at grunnlaget er varslet for sent (§ 32.2). Frafall skjer mot endringsordre for allerede utført arbeid, og byggherren kan da ikke samtidig påberope at TE har tapt retten til å kalle pålegget en endring. Et frafalt pålegg gjør svaret på vederlag og frist prinsipalt, i status, brev og fullmakt | 05.10, oppdragsgiver, etter teksten i § 32.1–32.3 | Ikke bygget. Serveren godtar kombinasjonen i dag (#235) |
| Frafall (§ 32.3 c) gir grunnlaget en egen sporstatus, `FRAFALT`, som rollupen regner som avklart grunnlag på linje med godkjent. Endringsordren for utført arbeid følger av #69 | 05.10, oppdragsgiver | Presisert 08.10 av [GR-U3](#gr-u3): etter frafall blir saken `OMFORENT` når vederlag og frist er oppgjort, og endringsordren for utført arbeid utstedes i en egen EO-sak. Rollupen regner frafall som avklart grunnlag fra 09.10 (SK-04); på vedtaksdatoen ble grunnlaget `TRUKKET`. Den egne statusen er ikke bygget. En ny `SporStatus` krever at alt som teller statuser, oppdateres (`.claude/rules/python-domene.md`) |
| SD-02: trekker TE grunnlaget før vederlag eller frist er sendt, er saken `LUKKET_TRUKKET`. Spor som ikke er sendt, regnes som trukket | 05.10, oppdragsgiver | Ikke bygget (#231) |
| #213: har TE godtatt avslaget på grunnlaget (`AVSLATT_AKSEPTERT`), er saken `LUKKET_AVSLATT`, uansett vederlag og frist, også når beløp eller dager er godkjent subsidiært. `LUKKET_AVSLATT` regnes som lukket for nye hendelser og i Catenda | 05.10, oppdragsgiver | Bygget i backend (#213). Frontendens lukket-sett: #229 |
| SK-01: godtar TE byggherrens svar om at grunnlaget er varslet for sent etter § 32.2, er det et godtatt avslag. Grunnlaget blir `AVSLATT_AKSEPTERT`, saken `LUKKET_AVSLATT`, og EO kan ikke utstedes | 05.10, oppdragsgiver | Bygget 09.10 (SK-01). På vedtaksdatoen ble grunnlaget `GODKJENT`, saken `OMFORENT` og EO utstedbar (SK-01 i 4.2) |
| TFR-05: en sak med godkjent eller låst grunnlag der resten ikke er sendt, har samlet status `UNDER_BEHANDLING` | 23.09, oppdragsgiver | Rettet i spor D |

#### Varsler, frister og innsigelser

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| SK-12: datoen og metoden for et varsel fra TE settes én gang. Et senere krav med en annen dato avvises. Gjelder varselet om fristforlengelse (§ 33.4) og varslene om rigg/drift og produktivitetstap (§ 34.1.3), som DRF-03 | 05.10, oppdragsgiver | Presisert 09.10 av [MM-U1](#mm-u1) for et varsel som bare er utledet. Utvidet 10.10 av [VS-U6](#vs-u6) til § 34.1.2. Ikke bygget. I dag overskriver hvert nytt krav varselet (SK-12) |
| <a id="mm-u1"></a>MM-U1: SK-12 låser et varsel som er registrert, ikke et varsel som bare er utledet. Er et fristkrav sendt uten registrert varsel etter § 33.4, kan TE senere registrere varselet med datoen det ble sendt, også når den er tidligere enn kravet. Det er første registrering, ikke en flytting. Byggherrens svar står. En preklusjon i svaret gjaldt varselet slik det var registrert da, og er uavklart til byggherren tar stilling. Byggherren kan bestride at varselet ble sendt eller mottatt. Preklusjonen faller ikke av seg selv. Forkastet: å regne det utledede varselet som satt, og å la preklusjonen falle uten byggherrens standpunkt | 09.10, oppdragsgiver | Presiserer vedtaket om SK-12 05.10 for [#264](https://github.com/khjohns/endringsmeldinger/issues/264). Presisert 09.10 av [MM-U8](#mm-u8) og [MM-U7](#mm-u7). Utvidet 10.10 av [VS-U7](#vs-u7) til § 34.1. Ikke bygget. I dag regner `_handle_frist` det spesifiserte kravet som varsel når varselet mangler. Forløp D i [modellforslaget](../forslag-maalmodell-2026-10-09.md#forløp-d-et-varsel-registrert-etter-et-senere-krav) |
| <a id="mm-u8"></a>MM-U8: MM-U4 gjelder også når en ny opplysning, ikke bare en regelendring, gjør at dagens utledning av svaret avviker fra brevet. Registrerer TE et varsel etter at byggherren har påberopt preklusjon for det utledede varselet, er preklusjonen uavklart, og TE kan ikke godta svaret før byggherren har svart på nytt. En enighet inngått før opplysningen står (MM-U3). Forkastet: å la TE godta svaret slik brevet uttrykte det | 09.10, oppdragsgiver etter review av PR #306 | Presiserer MM-U1. MM-U4, som vedtaksteksten viser til, er opphevet 09.10 av [MM-U9](#mm-u9), som gjelder regelendringer. MM-U8 gjelder en ny opplysning og står. Utvidet 10.10 av [VS-U7](#vs-u7) til § 34.1, ikke bygget. Bygget i målmodellen i språkprøven (#304), forløp D |
| <a id="mm-u7"></a>MM-U7: en part kan bestride en opplysning fra motparten, for eksempel at et varsel ble mottatt, også etter at saken er avsluttet. Bestridelsen registreres uten virkning på utfallet. At saken er avsluttet, sperrer kommandoer som kan endre utfallet, ikke partenes standpunkt til en opplysning. Forkastet: å la en avsluttet sak sperre alle handlinger | 09.10, oppdragsgiver etter review av PR #306 | Presiserer MM-U1. «Avsluttet» betyr at kravene er avgjort ([KA-U11](#ka-u11), 09.10). Avvises når saken ikke er forstått ([MM-U14](#mm-u14), 10.10). Utvidet 11.10 av [KA-U29](#ka-u29). Bygget i målmodellen i språkprøven (#304), rad KA-21 |
| <a id="vs-u6"></a>VS-U6: TEs varsel etter § 34.1.2 registreres som et eget varsel med dato, slik varselet etter § 33.4 og § 34.1.3. Forkastet: at byggherren vurderer rettidigheten av selve kravet | 10.10, oppdragsgiver (#309) | Utvider SK-12 til § 34.1.2. Ikke bygget (#309) |
| <a id="vs-u7"></a>VS-U7: TE kan senere registrere et varsel etter § 34.1 med datoen det ble sendt. Det er første registrering, ikke en flytting av et varsel som alt er registrert (SK-12, MM-U1). En preklusjon byggherren har påberopt, blir da uavklart, og TE kan ikke godta svaret før byggherren har svart på nytt. For § 34.1.3 er det den påberopte begrensningen (VS-U5) som blir uavklart, ikke nødvendigvis hele kravet. Byggherrens svar står. Etterregistreringen gjør preklusjonen uavklart bare når varselet gjelder det preklusjonen gjaldt. En enighet står (MM-U8). Er kravene avgjort, gjelder sperren i KA-U11. Retting følger B-16 | 10.10, oppdragsgiver etter sparring (#309) | Utvider [MM-U1](#mm-u1) og [MM-U8](#mm-u8) til § 34.1. Ikke bygget (#309) |
| <a id="vs-u8"></a>VS-U8: et varsel TE sender fra appen, får serverens dato. Et varsel sendt utenfor appen og registrert i den, får datoen TE oppgir, og byggherren kan bestride den. Forkastet: serverens dato også ved registrering | 10.10, oppdragsgiver (#309) | Endrer DRF-03 («En dato fra klienten avvises») for registrerte brev. Bestridelsen følger [MM-U7](#mm-u7). Ikke bygget (#309) |
| <a id="vs-u15"></a>VS-U15: TE kan sende et eget varsel etter § 33.4 fra appen uten å angi dager, også før dager kan angis, fordi § 33.4 krever varsel «selv om han ennå ikke kan fremsette et spesifisert krav». Varselet er et eget utsagn med egen dato, og grunnlagskravet endres ikke og er ikke et varsel etter § 33.4 eller § 34.1.2. Brevteksten: «TE varsler etter NS 8407 § 33.4 at TE vil kreve fristforlengelse som følge av forholdet i sak <saksnummer> («<sakstittel>»).» Varselet etter § 34.1.2 sendes utenfor appen og registreres når § 34.1 er bygget, og avgjøres med § 34.1 i byggedel 3. Forkastet: at et varsel etter § 33.4 fra appen bare kan stå i et fristkrav med dager, og ellers sendes utenfor appen og registreres (A); og «B: grunnlagskravet er også et varsel etter § 33.4, og etter § 34.1.2 i svikt og andre forhold, og registreres som det» | 11.10, oppdragsgiver (#369, #410) | Spørsmålet står i versjon 4 av spørsmålene på #410, svaret på #369 (V6 C). Varselet sendes fra appen og får serverens dato ([VS-U8](#vs-u8)); det er en ny kommando ved siden av registreringen av et varsel sendt utenfor appen. Til nå sto et varsel etter § 33.4 fra appen bare i et fristkrav, som må ha minst én dag ([KA-U8](#ka-u8)). § 33.4 er blant bestemmelsene appen utleder virkningen av ([VS-U3](#vs-u3)). Varselet hører til første versjon av TS-stien ([OV-U1](#ov-u1)), der matrisen fører § 33.4 og § 34.1.2; raden for § 34.1.2 i [paragrafmatrisen](../paragrafmatrise-koe-eo-forsering.md) skal vise til VS-U15. Bygges i #411. Ikke bygget |
| Nøytralt fristvarsel (TFR-06, DRF-01): BH kan sende innsigelse mot sen varsling (§ 5) og forespørsel om spesifisert krav (§ 33.6.2) som egne handlinger. De setter ikke resultat, gjør ikke sporet avslått og åpner ikke forsering. Et svar med dager og resultat avvises til TE har spesifisert kravet (§ 33.7) | 23.09, oppdragsgiver | Krevde egne hendelsestyper eller svarformer, med tidslinje, forretningsregler og skjema. Bygget 04.10 som to hendelsestyper (#62); se TFR-06 og DRF-01 i 4.2. Rettingen av TFR-06 og DRF-01 bygger på dette. Oppdragsgiver presiserte samme dag: svarfristen i forespørselen er valgfri, og handlingene går utenom intern godkjenning |
| <a id="vs-u1"></a>VS-U1: en innsigelse etter § 5 tredje ledd registreres som ett utsagn med sendetid. Den kan gjelde ethvert varsel, krav eller svar fra motparten, også et svar etter § 33.6.2 annet ledd bokstav b. En protest mot innsigelsen registreres og vises ved siden av. Appen avgjør ikke om innsigelsen kom i tide. Forkastet: å avvise en § 5-innsigelse som kommer etter at TE har spesifisert kravet | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Avgjør #175. I tråd med MP-U5, MP-U7 og vedtaket om passivitet under B-13. Presisert og utvidet 10.10 av [VS-U9](#vs-u9): påberopelsen i byggherrens svar er innsigelsen etter § 5, og en egen innsigelse kan også sendes etter svaret. Det siste er et nytt valg ut over VS-U1 |
| <a id="vs-u9"></a>VS-U9: påberoper byggherren i et svar at TE har varslet eller svart for sent, er påberopelsen innsigelsen etter § 5 tredje ledd. En egen innsigelse kan sendes før svaret og etter svaret. Et senere svar viser til innsigelsen og gjentar den. Regelen fra metodeprøven om hva en protest gjelder (MP-U6), tas inn i appen. At en innsigelse kan sendes etter svaret, gjør den ikke rettidig. Den gjenoppliver ikke en tapt innsigelse og endrer ikke et tidligere svar eller en enighet (GR-U10, KA-U7). Den første innsigelsen og tidspunktet bevares, og en gjentakelse gir ingen ny frist. Forkastet: innsigelsen alltid som eget utsagn | 10.10, oppdragsgiver etter sparring (#309) | Presiserer og utvider [VS-U1](#vs-u1): etter svaret er en egen innsigelse et nytt valg, og VS-U1 sier bare at en innsigelse ikke avvises fordi den kommer etter at TE har spesifisert kravet. Tar [MP-U6](#mp-u6) inn i appen. Unntaket i § 5 tredje ledd gjelder fortsatt: «Dette gjelder ikke for krav, og for forespørsler etter 40.4, som fremsettes for første gang i eller i forbindelse med sluttoppgjøret.» Unntak 10.10 i [VS-U11](#vs-u11): byggherren kan gi opp innsigelsen uttrykkelig i et senere svar fra appen. Utvidet 11.10 av [VS-U14](#vs-u14) til TE som mottaker. Ikke bygget (#309) |
| <a id="vs-u11"></a>VS-U11: byggherren kan i et senere svar fra appen gi opp sin egen innsigelse etter § 5 uttrykkelig. Svaret fra appen gjentar innsigelsen som utgangspunkt, og gir byggherren den opp, sier brevet det. Det er partens nye utsagn som endrer standpunktet. Den første innsigelsen og tidspunktet bevares, og en gjentakelse gir ingen ny frist. Gjelder innsigelsen TEs varsel etter § 32.2, blir godkjenningen en endringsordre når vilkårene i GR-U12 og GR-U13 er oppfylt. Appen utleder ikke at innsigelsen er oppgitt av taushet alene (HF-U1): et registrert svar som ikke sier noe om rettidigheten, leses med innsigelsen. Et registrert svar som uttrykkelig gir opp innsigelsen, registreres med det standpunktet. Om et senere brev etter en konkret tolkning innebærer at innsigelsen er oppgitt, avgjør ikke appen. Kan appen ikke uttrykke en motstrid, gjelder KA-U16. Forkastet: at byggherren ikke kan gi opp innsigelsen i et svar fra appen | 10.10, oppdragsgiver etter sparring (#309) | Gjør et unntak fra [VS-U9](#vs-u9) («Et senere svar viser til innsigelsen og gjentar den»): gjentakelsen er utgangspunktet, ikke et krav. Utvidet 11.10 av [VS-U14](#vs-u14) til TE som mottaker. Ikke bygget (#309) |
| <a id="vs-u14"></a>VS-U14: VS-U9 og VS-U11 gjelder tilsvarende når TE mottar et varsel, krav eller svar fra byggherren og påberoper at det kom for sent, fordi § 5 tredje ledd gjelder «en part». Påberopelsen i TEs svar er innsigelsen etter § 5, og TE kan gi den opp uttrykkelig i et senere svar fra appen. Delen av VS-U11 om TEs varsel etter § 32.2 har ikke noe motstykke. Påberopelsen i TEs svar og oppgivelsen får virkning når TE kan svare på krav fra byggherren i appen, først ved § 34.3.3, som avvises i første versjon (OV-U1). En egen innsigelse fra TE mot et varsel, krav eller svar fra byggherren gjelder alt etter VS-U1. Formatet for innsigelsen forutsetter likevel ikke at bare byggherren kan påberope sen varsling. Forkastet: ulike regler for partene | 11.10, oppdragsgiver etter sparring (#309) | Utvider [VS-U9](#vs-u9) og [VS-U11](#vs-u11), som er formulert for byggherren. I tråd med [VS-U1](#vs-u1) («ethvert varsel, krav eller svar fra motparten») og [VS-U4](#vs-u4), som alt er symmetrisk. Ikke bygget. Formatet hører til #309 |
| B-13 passivitet (§ 32.3 annet ledd) varsles, men systemet trekker ingen konklusjon | 24.09, oppdragsgiver | Utvidet 09.10 av [VS-U2](#vs-u2) til § 33.6.2 tredje ledd, § 33.7 annet ledd, § 34.3.3 annet ledd og § 35.2. Presisert 10.10 av [VS-U10](#vs-u10): appen viser mottaksdatoen, antall dager siden og bestemmelsen, uten fast frist. Ikke bygget. Frontendens faste 10 dager er bare veiledning |
| <a id="vs-u2"></a>VS-U2: passivitet og søksmålsfrist vises som veiledning. § 32.3 annet ledd, § 33.6.2 tredje ledd, § 33.7 annet ledd, § 34.3.3 annet ledd og § 35.2 vises med frist og bestemmelse, uten at appen trekker konklusjonen | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Utvider vedtaket om passivitet under B-13 (§ 32.3 annet ledd) til de andre bestemmelsene. Presisert 10.10 av [VS-U3](#vs-u3) for § 33.6.2 tredje ledd: påberoper byggherren uttrykkelig at TE svarte for sent, utledes virkningen. Presisert 10.10 av [VS-U10](#vs-u10): «frist» er bestemmelsen og fristens utgangspunkt, ikke en dato |
| <a id="vs-u10"></a>VS-U10: for en frist etter VS-U2 eller § 5 tredje ledd som løper «uten ugrunnet opphold» etter mottaket, viser appen mottaksdatoen, antall dager siden og bestemmelsen, uten en fast frist. Forkastet: en veiledende frist per prosjekt, og en fast frist på 10 dager | 10.10, oppdragsgiver (#309) | Presiserer [VS-U2](#vs-u2): «frist» er bestemmelsen og fristens utgangspunkt, ikke en dato. Presiserer også vedtaket om passivitet under B-13: appen viser ingen fast frist. Ikke bygget. Visningen hører til #313 |
| <a id="vs-u12"></a>VS-U12: TE kan påberope byggherrens passivitet etter § 32.3 annet ledd som eget utsagn som viser til TEs varsel etter § 32.2, både før byggherren har svart og etter et svar TE mener kom for sent. Utsagnet registreres og vises uten automatisk endring av utfallet i appen, og det sperrer ikke byggherrens svar. Appen avgjør ikke om vilkårene var oppfylt. Forkastet: at TE bare kan påberope passiviteten utenfor appen | 10.10, oppdragsgiver etter sparring (#309) | Gjennomfører [VS-U3](#vs-u3) for § 32.3 annet ledd. Gjelder bare der § 32.2 gjelder ([GR-U11](#gr-u11)). Etter et svar kan TE også gjøre innsigelse etter [VS-U1](#vs-u1). Visningen følger [VS-U10](#vs-u10). Ikke bygget (#309) |
| <a id="vs-u3"></a>VS-U3: appen behandler bestemmelsene om varsler, svar og frister på tre måter. Appen utleder virkningen av partens standpunkt etter § 32.2 og § 32.3 første ledd a–c, § 33.1, § 33.4 og § 33.6.1, valgretten i § 33.8, og § 34.1.2, § 34.1.3, § 34.2.2 og § 34.3.3 første ledd. Å utlede betyr å registrere standpunktet og vise virkningen på partens premisser, ikke å fastslå at kravet er prekludert. Appen åpner for TEs valg etter § 33.8, men bekrefter ikke at valgretten finnes. Appen registrerer og viser utsagnet med frist og bestemmelse for § 32.3 annet og tredje ledd, § 33.6.2 tredje ledd og § 33.7 annet ledd, 30 %-grensen i § 33.8, § 34.2.1 og § 34.3.3 annet ledd, og § 5 tredje ledd og § 35.2. Det betyr uten automatisk utledning, ikke uten rettsvirkning. For § 35.2 viser appen både oppmann før overtakelsen og søksmålsfristen, uten dato. Appen vurderer selv bare der det er vedtatt: om § 32.2 gjelder for kategorien, sammenlikningen av beløp og dager, og § 33.6.2 fjerde ledd (KA-U4). Etter § 33.6.2 tredje ledd gjelder: påberoper byggherren uttrykkelig at TE svarte for sent på forespørselen, utledes virkningen som etter § 33.4, og svarer ikke TE, vises det bare (VS-U2). Hvordan appen behandler § 34.4, avgjøres når § 30 er lest. Forkastet: å bare registrere og vise også § 33.6.1, § 34.1.2, § 34.1.3 og § 34.3.3 første ledd, som for § 34.1.2 og § 34.1.3 strider mot B-13 om preklusjon | 10.10, oppdragsgiver etter sparring (#309) | Presiserer [VS-U2](#vs-u2) for § 33.6.2 tredje ledd: påberoper byggherren uttrykkelig at TE svarte for sent, utledes virkningen. I tråd med B-13 om preklusjon. Hvordan 30 %-grensen vises, står i [FO-U3](#fo-u3). § 34.4 og force majeure (§ 33.3) får egne rader i paragrafmatrisen (#309). Gjennomført for § 32.3 annet ledd 10.10 av [VS-U12](#vs-u12), og for § 33.3 første, tredje og femte ledd 11.10 av [VS-U13](#vs-u13) og [KA-U23](#ka-u23). Annet og fjerde ledd står (#381). Ikke bygget. Kjernen hører til #309, visningen til #313 |
| <a id="vs-u4"></a>VS-U4: påberoper parten som mottar kravet eller varselet, at kravet ble spesifisert for sent etter § 33.6.1, eller at justering av enhetsprisene ble varslet for sent etter § 34.3.3 første ledd, oppgir hen prinsipalt det hen måtte forstå, og subsidiært det hen godtar hvis spesifiseringen eller varselet kom i tide. Etter begge bestemmelsene har den som er for sent, bare krav på det «den andre parten måtte forstå». Den andre parten er byggherren når TE krever, og TE når byggherren krever justering etter § 34.3.3. Appen regner ikke ut hva noen måtte forstå. Forkastet: å behandle det som preklusjon med prinsipalt avslag, og ett tall der påberopelsen bare er en grunn | 10.10, oppdragsgiver etter sparring (#309) | Utledes etter [VS-U3](#vs-u3). DRF-03 gjelder datoen for varselet etter § 34.3.3. Ikke bygget (#309) |
| <a id="vs-u5"></a>VS-U5: påberoper byggherren at TEs særskilte varsel etter § 34.1.3 kom for sent, oppgir byggherren prinsipalt det beløpet hen godtar etter begrensningen hen påberoper, som kan være null, og subsidiært det beløpet hen godtar hvis innsigelsen ikke fører fram. Byggherren begrunner avgrensningen. Appen avgjør ikke hvilke utgifter som er påløpt eller rammet (§ 34.1.3 tredje ledd). Forkastet: at kravet er prinsipalt avslått med subsidiært beløp | 10.10, oppdragsgiver etter sparring (#309) | Endrer B-13 om preklusjon (24.09) for § 34.1.3: byggherren oppgir prinsipalt et beløp, ikke et avslag. Utledes etter [VS-U3](#vs-u3). Presisert 11.10 av [KA-U24](#ka-u24): begrunnelsen kreves i et svar fra appen, og et registrert brev kan stå uten. Ikke bygget (#309) |
| <a id="vs-u13"></a>VS-U13: i en sak med hovedkategorien force majeure (§ 33.3) er byggherrens standpunkt om at forholdet ikke var utenfor partens kontroll, at parten eller dens kontraktsmedhjelpere burde ha tatt hindringen i betraktning ved inngåelsen av sine kontrakter, eller at parten med rimelighet kunne ventes å unngå eller overvinne følgene av den (første og tredje ledd), et avslag av grunnlaget. Svarene på vederlag og frist er da subsidiære etter vedtaket om svar når ansvarsgrunnlaget er avslått (B-13, 05.10). Standpunktet om at fremdriften ikke ble hindret, er «hindring» som etter § 33.1 (B-13 om frist uten fremdriftshindring, 05.10). At parten kunne overvinne en del av følgene, er et standpunkt om dagene. Appen utleder virkningen på byggherrens premisser (VS-U3) og avgjør ikke om vilkårene er oppfylt. At første og tredje ledd fordeles slik mellom grunnlaget og dagene, er oppdragsgivers lesning, ikke en uttrykkelig regel i NS 8407. Forkastet: et eget standpunkt for hvert vilkår i første og tredje ledd, og bare å registrere og vise standpunktet | 11.10, oppdragsgiver etter sparring (#309) | Gjennomfører [VS-U3](#vs-u3) for § 33.3, som VS-U3 lot stå. Utvider B-13 om frist uten fremdriftshindring (05.10) og «hindring» i [HF-U2](#hf-u2) til § 33.3. § 32.2, § 32.3 og «frafalt» gjelder ikke kategorien ([GR-U11](#gr-u11), B-13 om «frafalt»). Vederlaget i saken står i [KA-U23](#ka-u23), begrunnelsen i [KA-U24](#ka-u24). Annet og fjerde ledd er ikke plassert (#381). Brevteksten sier «grunnlaget», ikke «ansvarsgrunnlaget» ([HF-U2](#hf-u2)). Forutsetter at formatet kan uttrykke et grunnlagskrav i force majeure (#367). Ikke bygget (#309) |
| DRF-03: sendedatoen for TEs varsel om justerte enhetspriser (§ 34.3.3) settes av serveren, som den norske datoen for innsendingen når TE krever justering. Et oppdatert krav flytter den ikke. Tar TE ut kravet om justering, faller varselet bort, og et nytt krav er et nytt varsel med ny dato. En dato fra klienten avvises | 29.09, oppdragsgiver | Endret 10.10 av [VS-U8](#vs-u8) for registrerte brev, ikke bygget: et varsel sendt utenfor appen får datoen TE oppgir, og byggherren kan bestride den. Bygget 29.09 (merknaden i DRF-03) |
| <a id="mp-u4"></a>MP-U4: I metodeprøven etter rettidig og tilstrekkelig svar b etter § 33.6.2 fører BHs sene punkt 5-innsigelse mot sen spesifisering til at spesifiseringen anses rettidig, uten begrensningen etter § 33.6.1. TE trenger ikke en ny rettidig protest mot oversittelsen av punkt 5-fristen; regelen anvendes ikke rekursivt. Dette avgjør ikke øvrige innsigelser etter § 33.7 eller antall dager | 08.10, oppdragsgiver etter vurderingen av LB-2017-177705 side 24 | Redaksjonell retting 10.10 (oppdragsgiver): «etter 33.6.2», «etter 33.6.1» og «etter 33.7» er rettet til «etter § 33.6.2», «etter § 33.6.1» og «etter § 33.7» i vedtaksteksten; meningen er uendret. Avklarer U4 i [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md). Erstatter prøvens rekursive arbeidshypotese. Avgrenset til prøven med oppgitte premisser; ingen endring av produksjonsregler eller øvrige åpne tolkninger |
| <a id="mp-u5"></a>MP-U5: Når ett brev inneholder flere innsigelser, vurderes rettidigheten («uten ugrunnet opphold») for hver innsigelse. Brevet og mottaket er felles, men en innsigelse mot omfanget etter 33.7 og en punkt 5-innsigelse kan få ulik vurdering | 08.10, oppdragsgiver | Avklarer U5 i [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md#prøve-3-ett-brev-med-flere-innsigelser) (#284). Gjelder prøven; ingen endring av produksjonsregler |
| <a id="mp-u6"></a>MP-U6: En TE-protest mot at BHs brev kom for sent, uten at innsigelsene skilles, gjelder alle innsigelsene i brevet (punkt 5: «har svart for sent»). Mot en punkt 5-innsigelse i brevet gir den fortsatt ingen ny frist (MP-U4) | 08.10, oppdragsgiver | Avklarer U6 i metodeprøven (#284). Gjelder prøven. Regelen om hva en protest gjelder, er tatt inn i appen 10.10 av [VS-U9](#vs-u9) |
| <a id="mp-u7"></a>MP-U7: En senere dokumentert innsigelse som strider mot premisset om at det ikke finnes noen virksom tidsinnsigelse, gir «uavklart: motstridende dokumentasjon» til en egen handling avgjør motstriden. Begge opplysningene står i journalen. Tidligere utledninger og sendte brev endres ikke, men et sendt brev som avviker fra dagens utledning, merkes som utdatert | 08.10, oppdragsgiver | Avklarer U7 i [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md#prøve-4-senere-dokumentert-korrespondanse) (#284). Tiltenkt atferd for prøven. Hvem som kan avgjøre motstriden, og rettelser av låste opplysninger, avgjøres ikke (B-16) |

#### Endringsordre og forsering

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| <a id="eo-u1"></a>EO-U1: en endringsordre utstedes bare som EO-sak, gjennom kommandoen (B-02 punkt 3). `eo_utstedt` i en KOE-sak avvises. En omforent KOE-sak formaliseres ved å inngå i en EO-sak, der TE godtar eller bestrider endringsordren (TFR-02). `kan_utstede_eo` betyr at KOE-saken kan inngå i en EO-sak | 08.10, oppdragsgiver | Presiserer GR-U3. Avgrenset 10.10 av [GR-U13](#gr-u13) og [KA-U14](#ka-u14): er byggherrens godkjenning av grunnlaget i KOE-saken en endringsordre etter § 32.3 første ledd a, er den svaret i grunnlagssporet i KOE-saken. Utstedes endringsordren i en EO-sak (EO-U6), skrives svaret i KOE-saken med henvisning til den. Hendelsestypen `eo_utstedt` gjelder fortsatt bare EO-saker. Ikke bygget. I dag godtas `eo_utstedt` i en KOE-sak når `kan_utstede_eo` er `true`, og `_close_spor_for_reactive_eo` skriver sporene om (DT-05). Frontenden og godkjenningskommandoen bruker ikke den veien. Radene står i [domenetabellen](../domenetabell/README.md) |
| <a id="eo-u2"></a>EO-U2: en KOE-sak kan inngå i en endringsordre når saken er `OMFORENT`, grunnlaget er godkjent eller låst, og minst ett av vederlag og frist er godkjent eller låst. Et godtatt avslag eller et trukket spor teller som oppgjort; et spor TE fortsatt kan sende, hindrer, som i rollupen. Frafalt grunnlag gir ikke endringsordre fra KOE-saken (GR-U3). Samme sett gjelder for `kan_utstede_eo`, kandidatene til en EO-sak og rollupen | 08.10, oppdragsgiver | Presisert 09.10 av [EO-U5](#eo-u5): «godkjent eller låst» betyr enighet, og et trukket spor gir ikke alene grunnlag for endringsordre. Ikke bygget. `kan_utstede_eo` ser bort fra spor som ikke er sendt; kandidatregelen `_is_agreed_koe` krever i tillegg et godkjent vederlag eller en godkjent frist (DT-06) |
| <a id="eo-u3"></a>EO-U3: en KOE-sak inngår i høyst én endringsordre, også når den er bestridt. En revisjon er samme endringsordre, og TEs uenighet føres i en ny KOE (TFR-02). Mens KOE-saken inngår i en EO-sak, er `kan_utstede_eo` `false` i KOE-saken, og den er ikke kandidat til en annen | 08.10, oppdragsgiver | Avgjør B-08. Kandidatregelen i `EndringsordreService` holder det for `/api/endringsordre`; KOE-saken viser det ikke (DT-07), og `/api/events` kontrollerer det ikke (DT-08) |
| <a id="eo-u4"></a>EO-U4: EO-sakens livsløp er strengt. Endringsordren utstedes én gang, og en ny utgave er `eo_revidert`. Byggherren reviderer bare en bestridt endringsordre. TE svarer én gang på hver utgave, med aksept eller bestridelse. En akseptert endringsordre er endelig. KOE-tilknytningen endres bare før utstedelse | 08.10, oppdragsgiver | Presisert 10.10 av [EO-U8](#eo-u8): TEs ene svar på hver utgave kan ta stilling til hvert utsagn for seg (MM-U10). Endret 10.10 av [EO-U9](#eo-u9) for en endringsordre som er svar på grunnlaget i en KOE-sak: byggherren kan ikke revidere den. Ikke bygget. `EO_IS_ISSUED` krever bare at endringsordren er utstedt, bestridt eller revidert, og `eo_utstedt` i en EO-sak har ingen regel (DT-09). `legg_til_koe` og `fjern_koe` krever `UTKAST`; `/api/events` gjør det ikke |
| <a id="eo-u5"></a>EO-U5: en KOE-sak kan inngå i en endringsordre når grunnlaget er godkjent (GR-U10) og minst ett av vederlag og frist har enighet: byggherren har godkjent kravet helt eller delvis, eller TE har godtatt et avslag (KA-U7). Et trukket spor teller som oppgjort, men gir ikke alene grunnlag for endringsordre. Et spor TE fortsatt kan sende, hindrer. En endringsordre på 0 kr og 0 dager er dermed mulig, for eksempel når en ytelse faller bort, en annen kommer til, og partene er enige om å gå i null. Et krav på 0 finnes ikke (KA-U8), så null uttrykkes ved et godtatt avslag. Forkastet: at et godtatt avslag bare teller som oppgjort, og at et godkjent grunnlag er nok når begge spor er trukket | 09.10, oppdragsgiver (#308) | Presiserer EO-U2: «godkjent eller låst» betyr enighet (merknaden 09.10 i 3.1). Presisert 09.10 av [KA-U12](#ka-u12): «ingen krav» teller som oppgjort. Presisert 11.10 av [KA-U26](#ka-u26): en merking sperrer at saken inngår i en endringsordre. Kandidatregelen i Python (`_is_agreed_koe`, DT-06) krever et godkjent vederlag eller en godkjent frist og rettes ikke (merknaden i 4.2). Ikke bygget |
| <a id="eo-u6"></a>EO-U6: utsteder byggherren en endringsordre i en EO-sak som svar på grunnlaget i en KOE-sak (KA-U12), lagres samtidig et grunnlagssvar i KOE-saken, med grunnlaget godkjent og § 31.3 oppfylt, og sakene viser til hverandre. Grunnlagssvaret viser til den bestemte utgaven av endringsordren og til samme brev, og er ikke en egen erklæring. Svaret er full godkjenning bare når endringsordren dekker grunnlaget i kravet. Da er partene enige om grunnlaget (GR-U10). Der § 32.2 gjelder (GR-U11), er trekket av grunnlaget sperret; ellers står trekket (KA-U13). Vederlag og frist går videre i KOE-saken. Endringsordren går gjennom fullmakten som en godkjenning av grunnlaget etter GFK-06: et spor som besvares i samme brev, har verdien i svaret (EO-U8); ellers gjelder TEs krevde beløp og dager; er kravene ikke sendt, kreves hele kjeden. Forkastet: at KOE-saken leser endringsordren fra EO-saken ved hver lesing | 10.10, oppdragsgiver etter sparring (#309) | Endrer vedtaket 23.09 «Ubegrenset fullmakt kan sende alene når beløpet ikke kan verdsettes» for dette tilfellet. Avgjør det [KA-U12](#ka-u12) lot stå til #309: hvordan EO-saken viser til KOE-saken når den er byggherrens svar på grunnlaget. Grunnlagssvaret og endringsordren skrives i samme transaksjon. Ikke bygget. Kjernen hører til #309, skrivestien og fullmakten til #310 |
| <a id="eo-u7"></a>EO-U7: en KOE-sak der endringsordren er svar på grunnlaget (EO-U6), kan senere inngå i en ny endringsordre når partene blir enige om vederlag eller frist. Å vise til en sak er ikke å inngå i den (EO-U3). Forkastet: at tilknytningen sperrer etter EO-U3, som ville utvidet EO-U3 | 10.10, oppdragsgiver (#309) | EO-U3 er uendret. Ikke bygget (#309) |
| <a id="eo-u8"></a>EO-U8: en endringsordre kan inneholde pålegget og egne utsagn om pris og tid. Hvert utsagn sier hva det er: byggherrens standpunkt, et tilbud eller en gjengivelse av noe som er avtalt. Finnes et krav i en KOE-sak, svarer utsagnet på den bestemte kravversjonen, og TE godtar eller bestrider hvert utsagn for seg (KA-U1). KOE-saker som inngår (EO-U2–EO-U5), gjengis med henvisning, og endringsordren kan ikke ensidig endre det som er avtalt. Uten KOE-sak står tallene i endringsordren alene. Ved flere KOE-saker summeres ikke dagene uten videre (§ 33.5). TEs aksept av endringsordren omfatter ikke hvert selvstendige utsagn i den. Forkastet: at endringsordren bare fastsetter grunnlaget, og at TEs aksept av endringsordren også er aksept av svarene, som ville endret KA-U1, KT-U1 og MM-U10 | 10.10, oppdragsgiver etter sparring (#309) | Presiserer [EO-U4](#eo-u4): TEs ene svar på hver utgave kan ta stilling til hvert utsagn for seg (MM-U10). Ikke bygget (#309) |
| <a id="eo-u9"></a>EO-U9: byggherren kan ikke revidere en endringsordre som er svar på grunnlaget i en KOE-sak (EO-U6). TEs uenighet føres i en ny KOE-sak, og en annen endring krever en ny endringsordre. Retting av skrivefeil følger B-16. Forkastet: revisjon av hva endringen går ut på, som ville endret EO-U4 og GR-U10, og revisjon av hele endringsordren, som ville endret GR-U10, GR-U7 og KA-U7 | 10.10, oppdragsgiver etter sparring (#309) | Endrer [EO-U4](#eo-u4) for dette tilfellet; GR-U7, GR-U10 og KA-U7 står. Ikke bygget (#309) |
| En endringsordresak kan følge av en KOE-sak, men ikke erstatte den, verken i historikken eller som en egen hendelse i KOE-saken | 29.09, oppdragsgiver | Bygget 05.10 (#97); se DM-07 i 4.3. På vedtaksdatoen ble `eo_opprettet` godtatt i en KOE-sak |
| TFR-02: forsering får aldri en lukket samlet status. En endringsordre er en ordre og forhandles ikke; er TE uenig, føres det videre i en KOE | 23.09, oppdragsgiver | Rettet i spor D. Utstedt og revidert EO er `VENTER_PAA_SVAR`, akseptert og bestridt `LUKKET` |
| <a id="fo-u1"></a>FO-U1: TE kan velge å anse byggherrens avslag som et pålegg om forsering (§ 33.8) når byggherren prinsipalt har avslått fristkravet helt eller delvis, også gjennom grunnlaget eller ved preklusjon, og TE ikke har godtatt avslaget. Valgretten gjelder de avslåtte dagene. TE varsler med antatt kostnad før forseringen iverksettes (§ 33.8 annet ledd). Appen avgjør ikke om kravet var berettiget eller om 30 %-grensen er overskredet, men viser grensen. Forkastet: valgrett bare ved avslag i fristsvaret selv, og valgrett også etter godtatt avslag (kommentaren i TFR-01-testen) | 09.10, oppdragsgiver etter lesning av NS 8407 § 5 og §§ 31–35 | Avgjør #230 og #258. Presisert 10.10 av [FO-U5](#fo-u5): TE kan ikke godta avslaget så lenge en forseringssak viser til det, også etter stopp. Valget, svarene og fullmakten i forseringssaken står i [FO-U2](#fo-u2)–[FO-U6](#fo-u6) (10.10). Ikke bygget: forseringskandidatene regnes av fristens eget resultat (SK-06) |
| <a id="fo-u2"></a>FO-U2: TE melder valget etter § 33.8, å «anse avslaget som et pålegg om forsering», for de avslåtte dagene, og varsler med antatt kostnad (§ 33.8 annet ledd). TE kan senere oppdatere kostnaden og melde at forseringen stoppes. Vederlaget for forseringen kreves i forseringssaken etter § 34. Forkastet: vederlaget i en ny KOE-sak | 10.10, oppdragsgiver (#309) | Bygger på [FO-U1](#fo-u1). «Ingen krav» i vederlagssporet i KOE-saken omfatter ikke forseringsvederlaget ([KA-U25](#ka-u25), 11.10). Ikke bygget (#309) |
| <a id="fo-u3"></a>FO-U3: byggherren har ingen svarplikt etter § 33.8. Byggherren kan stå fast på avslaget: fristsvaret står, og det er påstanden om at avslaget var berettiget, som appen ikke avgjør (FO-U1). Byggherren kan revidere fristsvaret og godkjenne dagene (FO-U4). Byggherren kan svare på forseringsvarselet at hen mener avslaget var berettiget, eller at 30 %-grensen er overskredet; svaret registreres og vises, uten virkning i appen. Byggherren kan svare på vederlagskravet for forseringen etter § 34, også ved å bestride kostnaden. Vil byggherren selv ha forsering, pålegger hen den med endringsordre etter § 31.2, i en egen EO-sak. Er dagmulktssatsen kjent, viser appen 30 %-grensen som en betinget utregning med forutsetningene: dagmulktssatsen ganget med de avslåtte dagene, tillagt 30 %. Den vises ikke som en avgjort grense eller et tak | 10.10, oppdragsgiver etter sparring (#309) | Bygger på [FO-U1](#fo-u1): appen avgjør ikke om avslaget var berettiget eller om 30 %-grensen er overskredet. Rettet etter oppdragsgivers innvending 10.10: standpunktet «godta forseringen» i den første formen utgår. Ikke bygget. Kjernen hører til #309, visningen av grensen til #313 |
| <a id="fo-u4"></a>FO-U4: reviderer byggherren fristsvaret og godkjenner dagene etter at TE har valgt forsering, står forseringssaken, og appen viser at fristsvaret er endret. Et nytt valg er ikke mulig for godkjente dager. Byggherren kan bestride kostnaden i svaret på vederlagskravet for forseringen (grunnlag, årsak, omfang, beregning, dokumentasjon). En senere godkjenning av fristen godkjenner ikke kostnadene. Appen fordeler ikke kostnader på forserte og godkjente dager; påløpte kostnader og avvikling kan også telle (§ 34, § 30). Forkastet: at valget faller bort for de godkjente dagene | 10.10, oppdragsgiver etter sparring (#309) | Ikke bygget (#309) |
| <a id="fo-u5"></a>FO-U5: TEs aksept av byggherrens avslag av fristkravet avvises så lenge en forseringssak viser til avslaget, også etter at forseringen er stoppet. Et avgrenset oppgjør, der TE godtar dagene, men holder fast på forseringskravet, bygges senere; det kjernen ennå ikke kan, avvises. Forkastet: å tillate aksepten etter stopp, og å tillate den mens forseringen står | 10.10, oppdragsgiver etter sparring (#309) | Snevrer inn [KA-U1](#ka-u1) med en ny grunn til å avvise en aksept, og presiserer [FO-U1](#fo-u1). Presisert 10.10 av [OV-U2](#ov-u2) for første versjon: sperren virker bare når en forseringssak i appen viser til avslaget. Ikke bygget (#309) |
| <a id="fo-u6"></a>FO-U6: byggherrens svar på vederlagskravet for forseringen går gjennom fullmakten som andre vederlagssvar. Et revidert fristsvar går gjennom fullmakten som andre fristsvar. Svaret på forseringsvarselet (FO-U3) sendes uten intern godkjenning, fordi det ikke påtar byggherren noe ansvar. Forkastet: som i dag, at prosjekter med policy ikke kan svare på forsering i appen | 10.10, oppdragsgiver etter sparring (#309) | Endrer vedtaket 18.09 om forsering (raden under) for vederlagssvaret. Ikke bygget. Fullmakten i TS-stien hører til #310 |
| Forsering er utenfor godkjenningsflyten | 18.09 | Endret 10.10 av [FO-U6](#fo-u6) for vederlagssvaret for forseringen: det går gjennom fullmakten som andre vederlagssvar. Etter FO-U6 sendes svaret på forseringsvarselet uten intern godkjenning, også i prosjekter med policy. Byggestatus: i dag kan prosjekter med policy ikke svare på forseringsvarsel (GFK-04). Produktvalget om godkjenningsomfang er tatt 10.10 for vederlagssvaret (FO-U6) |

#### Sendte brev, regelendring og saker kjernen ikke forstår

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| B-03 hovedvalg: hver innsending får sitt eget brev, som gjelder én part og ett spor, og brevet er det autoritative uttrykket for partens standpunkt. Saksrapporten sendes ikke lenger automatisk til Catenda. En rapport kan senere legges ved et brev, men bare hvis den er feilfri eller har et tydelig forbehold om at brevet gjelder | 03.10, oppdragsgiver | Presisert 09.10 av [MM-U10](#mm-u10): «ett spor» utgår, og et brev kan ha utsagn i flere spor. Saksrapporten er pensjonert 03.10 (#140). En hendelse uten brev får bare kommentar og statussynk i Catenda, og en PDF fra klienten avvises. Om hvert brev blir et eget dokument i Catenda eller en revisjon av ett dokument per part og spor, sto åpent under B-03. Avgjort 10.10 av [B-03, dokumentet](#b-03-dokument): ett dokument per brev |
| <a id="b-03-dokument"></a>B-03, dokumentet: hvert brev som leveres til Catenda, blir ett dokument der, også når det har utsagn i flere spor. Brevet leveres samlet, slik det er lagret ([HF-U1](#hf-u1)) og frosset i leveringsoppdraget ([LV-U1](#lv-u1)). Dokumentet revideres ikke, heller ikke ved en retting, som følger B-16. Dokumentnøkkel, navnestandard og avstemming etter tapt svar fra Catenda velges av utviklerne i #310, innenfor dette og LV-U1. Forkastet: ett dokument per part og spor, med revisjoner, fordi et brev med svar i flere spor da deles på flere dokumenter og ikke er én enhet i Catenda | 10.10, oppdragsgiver (#321) | Avgjør det som sto åpent under B-03 etter [MM-U10](#mm-u10). B-03 er dermed avgjort og flyttet fra 3.4. Endrer ikke B-16. Om `failOnDocumentExists` skal være `true`, avgjøres med dokumentnøkkelen og navnestandarden i #310. Konfliktsvaret ved `true` er ikke observert (avsnitt 7). Ikke bygget (#310) |
| <a id="mm-u9"></a>MM-U9: et sendt brev beholder virkningen det hadde da det ble sendt. En endring i appens regler endrer ikke virkningen av et brev som allerede er sendt: virkningen leses fra beslutningsgrunnlaget i brevet, og nye regler gjelder bare nye brev. Gir dagens regler et standpunkt i brevet en annen virkning, vises avviket som en merknad som oppfordrer byggherren til å revidere svaret (GR-U4). Forkastet: at dagens regler vurderer sendte brev på nytt, og at et avvik sperrer aksepten (MM-U4–MM-U6); og å fryse virkningen, men gi byggherren «vurder revisjon» som ventende handling | 09.10, oppdragsgiver | Opphever MM-U4, MM-U5 og MM-U6. Snevrer inn merknaden 05.10 til vedtaket om regelversjon under B-13. MM-U3 og MM-U8 står. Presisert av [MM-U11](#mm-u11) (09.10), som gjør et unntak for regelen som setter sammen standpunktene til et utfall, og av [MM-U12](#mm-u12) (10.10): beslutningsgrunnlaget bevarer appens vurdering da brevet ble sendt, og den er ikke en rettslig avgjørelse. Endret 10.10 av [MM-U17](#mm-u17) for registrerte brev: appens vurdering følger reglene ved registreringen, ikke da brevet ble sendt. Et svar uten lagret beslutningsgrunnlag finnes ikke etter B-17: hvert svar TS skriver, også registrert korrespondanse, får beslutningsgrunnlaget fra standpunktene slik brevet uttrykker dem (oppdragsgiver 09.10; kontrolleres i #310). Målmodellen i språkprøven (#304) bygger MM-U4–MM-U6 |
| <a id="mm-u10"></a>MM-U10: et brev er fra én part og kan inneholde utsagn i flere spor. Byggherren kan i samme brev svare på grunnlag, vederlag og frist, gjøre innsigelser etter § 5 og sende en forespørsel etter § 33.6.2. TE kan i samme brev sende krav, varsel, aksept og trekk. Hvert svar gjelder én kravversjon, og en aksept gjelder ett svar (KA-U1). § 5 første ledd krever at varsler, krav og svar fremsettes skriftlig, ikke at hvert av dem står i et eget brev. Forkastet: ett spor per brev, som ordlyden i B-03, og flere spor per brev bare for byggherren | 09.10, oppdragsgiver (#273) | Presiserer B-03: «ett spor» utgår. Om brevet blir ett dokument i Catenda, eller en revisjon av ett dokument per part og spor, er avgjort 10.10 av [B-03, dokumentet](#b-03-dokument): ett dokument per brev. Lagringsformatet for et brev med flere utsagn er #273. Ikke bygget |
| <a id="mm-u11"></a>MM-U11: beslutningsgrunnlaget i byggherrens svar fryser hvert standpunkt med virkningen det hadde da brevet ble sendt: prinsipalt eller subsidiært, preklusjon, godkjent eller avslått, beløp eller dager. Det fryser også om svaret godkjenner hele kravet (sammenfall). Utfallet i sporet og vilkåret for en enighet utledes av de frosne standpunktene, og ingen regel leser et lagret utfall. Endres regelen som setter standpunktene sammen til et utfall, kan utfallet av et sendt brev endre seg. Sammensetningen følger § 32.3 a–c og vedtakene om prinsipale og subsidiære standpunkter, som GR-U7. Forkastet: at hvert svar i tillegg fryser utfallet per spor og vilkåret for enigheten | 09.10, oppdragsgiver (#273) | Presiserer MM-U9 og KA-U10. Gjør et unntak fra MM-U9 for regelen som setter sammen standpunktene til et utfall. Den følger gjeldende regler, også for sendte brev. Beslutningsgrunnlaget fryser også om § 32.2 gjaldt ([GR-U12](#gr-u12), 10.10), som appens vurdering ([GR-U13](#gr-u13), 10.10). At et standpunkt er uten virkning, er appens vurdering og lagres atskilt fra det byggherren sa ([HF-U2](#hf-u2), [MM-U12](#mm-u12); 10.10). Presisert 10.10 av [MM-U13](#mm-u13): reglene stiller kontraktsspørsmålet til utsagnene. Bekreftet 10.10 av [MM-U16](#mm-u16): det nye regler kan endre, er appens utledning av utfallet, også på tvers av brev, mens standpunktene i brevene står (MM-U9). Før en regelendring rulles ut, regnes alle saker med gamle og nye regler, og en sak der utfallet endres, viser en merknad. Endret 10.10 av [MM-U17](#mm-u17) for registrerte brev: appens vurdering følger reglene ved registreringen, ikke da brevet ble sendt. Lagringsformatet står i [designnotatet](../design-hendelsesformat-2026-10-09.md) (#273). Ikke bygget |
| <a id="mm-u12"></a>MM-U12: et sendt brev bevares slik det ble sendt, og beslutningsgrunnlaget bevarer appens vurdering da brevet ble sendt, for eksempel at et standpunkt er uten virkning eller at § 32.2 gjaldt. Vurderingen er ikke en rettslig avgjørelse, og den blir ikke riktig eller bindende fordi den er frosset. Det samme gjelder registratorens vurdering av ekstern korrespondanse. Appen avgjør ikke det kontrakten overlater til partene, en oppmann eller domstolene. En senere avklaring registreres som et nytt utsagn, uten at brevet eller historikken skrives om. Formen følger B-16 | 10.10, oppdragsgiver (#273) | Presiserer MM-U9 og MM-U11. Endret 10.10 av [MM-U17](#mm-u17) for registrerte brev: appens vurdering følger reglene ved registreringen, ikke da brevet ble sendt. Ikke bygget |
| <a id="mm-u4"></a>MM-U4: TE kan bare godta et svar når brevet stemmer med dagens utledning av svaret. Har en regelendring etter sendingen gitt et standpunkt i svaret en annen virkning enn beslutningsgrunnlaget i brevet, avvises aksepten. Byggherren får revisjon som ventende handling og må svare på nytt etter gjeldende regler, så lenge svaret ikke er godtatt (GR-U4). Byggherren blir dermed aldri bundet til et utfall brevet ikke uttrykte (B-03), og TE godtar alltid hele svaret slik det står (KA-U1). Kostnaden er at saken venter på byggherren. Forkastet: å la TE godta med utfallet etter dagens regler, og å fryse utfallet etter reglene da svaret ble sendt (det ville endret MM-U3) | 09.10, oppdragsgiver etter review av modellforslaget | **Opphevet 2026-10-09 av [MM-U9](#mm-u9).** Presiserte KA-U1 og MM-U3. Med MM-U4 stemte brevet og reglene ved aksepten alltid overens. Ikke bygget: aksepten hadde ingen regelversjon, og utfallet ble regnet av gjeldende regler ved hver lesing. Hvordan avvik avgjøres for et svar uten lagret beslutningsgrunnlag, ble ikke avklart; etter B-17 finnes ikke slike svar i TS (oppdragsgiver 09.10, Følge i MM-U9). Forløp C, steg 3d, i [modellforslaget](../forslag-maalmodell-2026-10-09.md#forløp-c-ett-brev-med-preklusjon-og-avslag) |
| <a id="mm-u5"></a>MM-U5: avviker byggherrens svar på grunnlaget fra brevet etter en regelendring, og TE har ikke godtatt det, er grunnlaget uavklart til byggherren svarer på nytt. Det er verken avklart eller avvist: en betinget enighet om beløp eller dager forblir betinget, saken avsluttes ikke, og byggherren har revisjon som ventende handling. Forkastet: å la dagens utledning avklare grunnlaget, fordi byggherren da ble bundet til et utfall brevet ikke uttrykte og saken kunne lukkes før revisjonen; og å la brevets virkning gjelde til byggherren svarer | 09.10, oppdragsgiver etter review av PR #306 | **Opphevet 2026-10-09 av [MM-U9](#mm-u9).** Presiserte MM-U4 og B-13 (merknaden 05.10) for grunnlaget. Bygget i målmodellen i språkprøven (#304), rad KA-25 i [domenetabellen](../domenetabell/README.md) |
| <a id="mm-u6"></a>MM-U6: TE kan ikke godta et svar uten lagret beslutningsgrunnlag, for eksempel et eldre svar eller registrert korrespondanse, før det er vedtatt hvordan avvik avgjøres for slike svar (MM-U4). Byggherren kan revidere svaret, og revisjonen får beslutningsgrunnlag. Forkastet foreløpig: å godta aksepten og fryse enighetsgrunnlaget med dagens utledning, fordi et manglende grunnlag ikke betyr at brevet stemmer | 09.10, oppdragsgiver etter review av PR #306 | **Opphevet 2026-10-09 av [MM-U9](#mm-u9).** Var en foreløpig sperre. Bygget i målmodellen i språkprøven (#304) |
| <a id="mm-u2"></a>MM-U2: kan ikke kjernen tolke en hendelse på saken, godtas ingen bindende kommando fra noen part før en kjerne som forstår den, er rullet ut. Journalen og interne notater kan fortsatt leses. Visningen sier at et varsel med frist må sendes utenfor appen og registreres senere, og drift varsles. Forkastet: å la TE sende varsler i en slik sak, fordi kontrollen av varselet trenger tilstanden | 09.10, oppdragsgiver | Konkretiserer B-10 og merknaden 07.10 for [#273](https://github.com/khjohns/endringsmeldinger/issues/273): det brukeren ser mens saken stopper. Gjelder også en bestridelse ([MM-U14](#mm-u14), 10.10) og en hendelse med noe kjernen ikke kjenner ([HF-U1](#hf-u1), 10.10). Utvidet 10.10 av [MM-U18](#mm-u18): en hendelse som strider mot vedtakene om enighet og lukking, gjør også saken ikke forstått. Ikke bygget. Prøveserveren svarer 422; Python hopper over en kjent type uten behandler. Forløp E i modellforslaget |
| <a id="mm-u14"></a>MM-U14: er saken ikke forstått (MM-U2), avvises også en bestridelse etter MM-U7. Kontrollen av at bestridelsen gjelder en opplysning fra motparten, trenger tilstanden. Parten kan bestride utenfor appen og registrere det senere, som for varsler etter MM-U2 | 10.10, oppdragsgiver (#273) | Presiserer MM-U2 og MM-U7. Som i kjernen i dag (`SAK_IKKE_FORSTAATT`, L 10.10) |
| <a id="mm-u18"></a>MM-U18: en hendelse i journalen som ikke kan forstås i samsvar med resten av journalen og vedtakene om enighet og lukking, gjør saken ikke forstått (MM-U2). Det gjelder for eksempel en revisjon eller en ny kravversjon i et spor med enighet, en aksept av et frafall, eller en hendelse som endrer utfallet etter at kravene er avgjort, når den ikke er et registrert brev. Det er en kontroll av at dataene henger sammen, ikke en rettslig avgjørelse om gyldighet. Strengere vilkår for å sende senere gjør ikke et brev som var tillatt da det ble sendt, uforstått. Endres utledningen, følger det MM-U16. Et ekte registrert brev som entydig er et ensidig forsøk på å trekke tilbake en bindende godkjenning, bevares og vises med appens vurdering atskilt (HF-U2, MM-U12): brevet endrer ikke den registrerte enigheten, og ingenting sperres. Et brev som viser til en ny avtale, hevder at enigheten er ugyldig eller inneholder vilkår, er ikke samme tilfelle. Kan appen ikke uttrykke innholdet, gjelder KA-U16. Forkastet: at en slik hendelse leses som gyldig, som i dag, fordi den da kan oppheve en enighet (KA-U7, GR-U10, MM-U3); og at et registrert brev gjør saken ikke forstått | 10.10, oppdragsgiver etter sparring (#309) | Utvider [MM-U2](#mm-u2) og presiserer [HF-U1](#hf-u1): saken er heller ikke forstått når kjernen kan tolke hendelsen, men den strider mot vedtakene om enighet og lukking. Avgjør #326. Utvidet 11.10 av [MM-U19](#mm-u19) til andre registrerte brev. Ikke bygget (#309) |
| <a id="mm-u19"></a>MM-U19: et ekte registrert brev som ikke kan forstås i samsvar med vedtakene om enighet og lukking, behandles som tilbaketrekkingen i MM-U18, også når det ikke er byggherrens, når det entydig er et ensidig forsøk på å gå fra en enighet eller fra at kravene er avgjort, eller på å skape en enighet vedtakene ikke tillater (GR-U10). Eksempler er TEs nye kravversjon i et spor med enighet, et trekk etter at kravene er avgjort, og en aksept av et frafall. Brevet bevares og vises med appens vurdering atskilt. Det som strider mot enigheten eller mot at kravene er avgjort, får ingen virkning på utfallet, enigheten står, og ingenting sperres. Et brev som viser til en ny avtale, sier at enigheten er ugyldig eller inneholder vilkår, er ikke samme tilfelle (MM-U18). Kan appen ikke uttrykke innholdet, gjelder KA-U16. Forkastet: at brevet leses med virkning, som MM-U18 forkaster for byggherrens tilbaketrekking, og at appen nekter registreringen (KA-U16) | 11.10, oppdragsgiver (#309, #394) | Utvider [MM-U18](#mm-u18) til andre registrerte brev i samme klasse. Presiserer [KA-U7](#ka-u7) og [KA-U11](#ka-u11): et registrert brev avvises ikke, men får ingen virkning. I tråd med [KA-U16](#ka-u16): brevet bevares og forkastes ikke. Ikke bygget |
| <a id="hf-u1"></a>HF-U1: et brev lagres samlet eller ikke i det hele tatt, og det er entydig fra lagringen hvilket brev hver del hører til. Å knytte deler sammen i ettertid er ikke nok. Hvert utsagn viser uttrykkelig til det det gjelder: kravet og kravversjonen, svaret eller varselet. En revisjon viser for eksempel til svaret den erstatter, og en aksept til svaret den godtar. Henvisningen skal stemme med brevet, og rekkefølgen i journalen brukes aldri til å avgjøre hva et utsagn gjelder. Inneholder en hendelse noe kjernen ikke kjenner, er saken ikke forstått (MM-U2), og ingenting hoppes over. En vurdering parten ikke har gjort, lagres ikke, og at den mangler, er ikke et standpunkt. Om tausheten likevel får virkning, følger av VS-U2. Forkastet: å knytte et utsagn til et krav eller et varsel etter rekkefølgen i journalen, og å hoppe over et ukjent felt | 10.10, oppdragsgiver (#273) | Strategivedtaket for lagringsformatet under B-10. Formen er et teknisk valg: én rad per dokument etter [designnotatet](../design-hendelsesformat-2026-10-09.md), til lagringsformen avgjøres sammen med B-12 ([merknaden 11.10](#b-12-merknad-2026-10-11)). Versjonering, utrulling og tilbakerulling mellom TS-versjoner er avgjort 10.10 med [B-10](#b-10) (#316). Ikke bygget |
| <a id="b-10"></a>B-10: appen holder sakens versjon, formatets versjon og reglenes versjon atskilt fra versjonene som regnet ut det lagrede resultatet for saken. Et lagret resultat brukes bare når det er regnet ut med de samme versjonene som appen og saken har. Ellers regnes saken ut på nytt fra journalen, og visningen følger MM-U15. En bindende handling prøves alltid mot journalen. Å regne ut på nytt lagrer bare det nye resultatet. Det endrer aldri journalen, frosne brev, beslutnings- og enighetsgrunnlag eller leveringsdokumenter, og det utløser ingen levering. Et nytt format tas i bruk slik at en tilbakerulling til forrige utgivelse ikke stopper noen sak. Rulles appen lenger tilbake, stoppes sakene med et nyere format etter MM-U2, og de listes før tilbakerullingen. En regelendring endrer ikke virkningen av et sendt brev (MM-U9). Endrer den utfallet på tvers av brev (MM-U11), gjelder MM-U16. Appens vurdering i registrert korrespondanse fryses etter MM-U17. Forkastet: å oppgradere eller skrive om lagrede hendelser til et nytt format; å bruke et lagret resultat regnet med en annen versjon, også en nyere etter en tilbakerulling; og å la en eldre utgivelse hoppe over det den ikke kjenner | 10.10, oppdragsgiver etter sparring (#316) | Flyttet fra 3.4. Lagringsformatet er [HF-U1](#hf-u1) og [HF-U2](#hf-u2), og visningen, regelendringen og registrert korrespondanse er [MM-U15](#mm-u15), [MM-U16](#mm-u16) og [MM-U17](#mm-u17). Merknadene 07.10, 09.10 og 10.10 til B-10 fra 3.4 står under tabellen og beskriver B-10 før vedtaket. Teknisk form: saksversjonen er `hendelse.versjon`, formatversjonen `hendelse.format`, og regelversjonen står i hvert beslutningsgrunnlag og hver aksept. Versjonene som regnet ut det lagrede resultatet, står ved resultatet i `sak_metadata`. Et nytt format rulles ut i to trinn, først i en utgivelse som leser det og så i en som skriver det, og de to trinnene er også en driftsrutine. Forkastet: å skrive et nytt format i samme utgivelse som først leser det. Kompatibiliteten prøves i en tabellstyrt test, som beskrives i [designnotatet for formatet](../design-hendelsesformat-2026-10-09.md), og utviklerne dokumenterer kompatibiliteten for hver reell formatendring. Raden i 3.4 sa at `UP042` (`StrEnum`) i Python avhenger av B-10. Hva vedtaket betyr for den regelen, er ikke avklart (#357). Bygget: saksversjonen, kolonnen `format` og regelversjonen i beslutningsgrunnlaget og aksepten (L 10.10, `kjerne/format.ts`). Ikke bygget: versjonene ved det lagrede resultatet, utrullingen i to trinn, utregningen på nytt og den tabellstyrte testen. #316 bygger dem |
| <a id="mm-u15"></a>MM-U15: er det lagrede resultatet for en sak regnet ut med andre versjoner enn appen og saken har (B-10), regnes saken ut før den vises. Oversikten viser siste kjente status for saken, merket «Oppdateres». Det gjelder bare visningen: en bindende handling prøves alltid mot journalen | 10.10, oppdragsgiver (#316) | Del av [B-10](#b-10). Ikke bygget (#316) |
| <a id="mm-u16"></a>MM-U16: før en regelendring rulles ut, regnes alle saker med gamle og nye regler. En rapport over hver sak der utfallet endres, legges ved vedtaket om regelendringen. Rapporten viser utfallet før og etter, og hvilke handlinger som dermed tillates eller sperres. Saken viser merknaden «Appens vurdering av utfallet er endret av nye regler». Det nye regler kan endre, er appens utledning av utfallet, også på tvers av brev (MM-U11). Brevene står uendret. Standpunktene i brevene står (MM-U9). Forkastet: å fryse også utregningen | 10.10, oppdragsgiver etter sparring (#316) | Bekrefter [MM-U11](#mm-u11): utregningen på tvers av brev følger gjeldende regler og vises med merknad. Bygger på oppdragsgivers prinsipp 10.10: det som er meddelt, binder, og en regelendring har ingen virkning for det brevene sier. Del av [B-10](#b-10). Ikke bygget (#316) |
| <a id="mm-u17"></a>MM-U17: for et brev sendt utenfor appen og registrert i den, fryser beslutningsgrunnlaget appens vurdering etter reglene ved registreringen, merket «appens vurdering ved registreringen». Brevets innhold står som det ble sendt. Begrunnelsen er at den som sender et brev, er bundet av det hen har meddelt og har ansvaret for innholdet, og at bare for brev sendt fra appen har noen støttet seg på appens regel. Det trengs da ingen historikk over regelsett med datoer, og ingen gjetting ved ukjent dato eller brev fra før appen. Forkastet: reglene da brevet ble sendt (GR-U13 slik det står), og at den som registrerer, velger regelsettet | 10.10, oppdragsgiver etter sparring (#336) | Endrer [GR-U12](#gr-u12), [GR-U13](#gr-u13), [KA-U10](#ka-u10), [MM-U9](#mm-u9), [MM-U11](#mm-u11) og [MM-U12](#mm-u12) for registrerte brev: appens vurdering i beslutningsgrunnlaget følger reglene ved registreringen, ikke da brevet ble sendt. Del av [B-10](#b-10). Ikke bygget (#336) |
| <a id="lv-u1"></a>LV-U1: det som skal leveres for et brev, fryses i leveringsoppdraget i samme transaksjon som hendelsen. Et nytt leveringsforsøk sender samme brev og vedlegg og skaper ingen ny erklæring. Hvert leveringsforsøk, hver feil og hver kvittering dokumenteres for seg, og et lagret oppdrag beviser ikke at brevet er sendt eller mottatt. Python tolker ikke KOE-journalen for å finne hva som skal leveres (B-17). Hvordan Python henter oppdraget, velger utviklerne | 10.10, oppdragsgiver (#311) | Presiserer invariant 3, 6 og 7. Grunnlaget er [vurderingen av B-18](../vurdering-b18-serverplassering-2026-10-10.md). Presisert 11.10 av [LV-U2](#lv-u2), og av [B-19](#b-19): Python henter ikke oppdraget direkte fra basen. Ikke bygget |
| <a id="lv-u2"></a>LV-U2: i et brev appen sender, godkjenner avsenderen brevteksten appen lager av brevets utsagn, og det er den teksten som fryses som brevet. Teksten avsenderen godkjenner, og teksten som fryses, er den samme. Et dokument som leveres, er en tro gjengivelse av den frosne teksten. Det kan lages etter at brevet er lagret, men det bevares fra første gang det lages, og hvert leveringsforsøk sender det samme dokumentet. Forkastet: at avsenderen godkjenner det ferdige dokumentet, som da må lages før brevet lagres | 11.10, oppdragsgiver etter sparring (#391) | Presiserer [LV-U1](#lv-u1) og invariant 6: det som fryses i transaksjonen, er brevteksten og vedleggene, og dokumentet lages bare av det som er frosset ved commit. I tråd med [B-03, dokumentet](#b-03-dokument) og [B-17](#b-17) (Python kan gjengi og levere frosne brev). Presisert 11.10 av [LV-U3](#lv-u3): hvert utsagn med virkning står i brevteksten. Presisert 11.10 av [LV-U4](#lv-u4): ordlyden. Et registrert brev står som det ble sendt ([MM-U17](#mm-u17)). Brevteksten bygges i #369; at dokumentet (PDF) gjengir teksten tro, prøves med en test der. At dokumentet lages etter commit og bevares første gang, gjelder #371. Hvor lenge det bevares, er B-05. Ikke bygget |
| <a id="lv-u3"></a>LV-U3: brevteksten i et brev appen sender, lages av alle partens utsagn i brevet, slik at hvert utsagn som får virkning, står i teksten mottakeren leser, for eksempel et krav, et standpunkt eller «ingen krav». Det som ikke står i teksten, regnes ikke som meddelt. Forkastet: at strukturerte opplysninger som ikke står i teksten, er en del av det som er meddelt | 11.10, oppdragsgiver etter sparring (#391) | Presiserer [LV-U2](#lv-u2). I tråd med [MM-U9](#mm-u9) og [KA-U25](#ka-u25). Appens vurdering i beslutningsgrunnlaget er ikke partens meddelelse ([HF-U2](#hf-u2), [MM-U12](#mm-u12)) og omfattes ikke. Et registrert brev står som det ble sendt ([MM-U17](#mm-u17)); det appen ikke kan uttrykke, følger [KA-U16](#ka-u16). Presisert 11.10 av [LV-U4](#lv-u4): ordlyden. Bygges i #369 med en test som viser at hvert utsagn med virkning står i teksten. Ikke bygget |
| <a id="lv-u4"></a>LV-U4: brevtekstene appen lager av utsagnene, har denne ordlyden. Endret tekst gjelder bare nye brev (MM-U9). (1) Grunnlagskravet gjengir kontraktens betegnelser for hovedkategorien og underkategorien. Endring (§ 33.1 a), unntatt underkategorien endringsordre: «TE krever endringsordre for forholdet «<tittel>» i sak <saksnummer> («<sakstittel>»). Grunnlaget er <underkategori> (NS 8407 § <hjemmel>).» Der § 32.2 gjelder, i tillegg: «TE varsler etter NS 8407 § 32.2 at TE påberoper seg at pålegget innebærer en endring.» Underkategorien endringsordre (§ 31.3): «TE gjør gjeldende krav som følge av en endringsordre fra byggherren for forholdet «<tittel>» i sak <saksnummer> («<sakstittel>») (NS 8407 § 31.3).» Uten tittel: «… for forholdet i sak <saksnummer> («<sakstittel>») …». Tittelen er TEs navn på forholdet, ikke endringsordrens. Etter teksten kommer: «TE viser til endringsordren «<dato eller nummer>».» Vederlag og frist kreves i egne krav (§ 34.1.1, § 33.1 a). Svikt og andre forhold (§ 33.1 b–c): «TE gjør gjeldende krav som følge av <underkategori> (NS 8407 § <hjemmel>, jf. § 33.1 <b/c> og § 34.1.2) for forholdet «<tittel>» i sak <saksnummer> («<sakstittel>»).» Ny versjon: «Kravet erstatter TEs krav i brev <n> av <dato>.» (2) Vederlagskravet: «TE krever justering av vederlaget med <beløp> kr eks. mva. Kravet er et tilbud etter NS 8407 § 34.2.1.» Beløpet er uten merverdiavgift, og teksten sier «eks. mva.». (3) Fristkravet: «TE krever fristforlengelse på <n> dager (NS 8407 § 33.6.1).» Varselet: «TE opplyser at varsel om fristforlengelse etter NS 8407 § 33.4 ble sendt <dato>.» (4) Svarets innledning nevner sporet: «Byggherrens svar på grunnlaget [på kravet om justering av vederlaget / på kravet om fristforlengelse] i TEs krav i brev <n> av <dato>:». En revisjon: «Svaret erstatter byggherrens svar i brev <n> av <dato>.» Standpunktene står én setning hver, med «Prinsipalt:», «Subsidiært:» og «Videre subsidiært:» der brevet ordner dem. (5) Standpunktene. Verbene er ikke navnet på et utsagn: «godtar» og «aksept» er TEs aksept (HF-U2, KA-U1), og «akseptert» et tilbud er § 34.2.2. Rettidighet, for sent: «Byggherren gjør gjeldende at TEs varsel etter NS 8407 § 32.2 [varselet om fristforlengelse etter § 33.4] kom for sent.» Gjentar svaret en innsigelse: «, jf. innsigelsen i brev <n> av <dato>». Rettidighet, i tide: «Byggherren gjør ikke gjeldende at varselet kom for sent.» Etter en innsigelse: «Byggherren gir opp innsigelsen etter NS 8407 § 5 i brev <n> av <dato> og gjør ikke gjeldende at varselet kom for sent.» (VS-U11: «gi opp … uttrykkelig».) Grunnlaget: «Byggherren godkjenner grunnlaget.» Avslag der § 32.2 gjelder: «Byggherren avslår kravet på endringsordre (NS 8407 § 32.3 første ledd b).» Ellers: «Byggherren avslår grunnlaget.» Frafall: «Byggherren frafaller pålegget mot å utstede endringsordre for allerede utført arbeid (NS 8407 § 32.3 første ledd c).» Brevet bruker ordlyden i § 32.3 c og lover endringsordren for allerede utført arbeid, også når den etter GR-U3 og OV-U2 utstedes utenfor appen i første versjon. Hindring: «Byggherren legger til grunn [legger ikke til grunn] at fremdriften hindres som følge av forholdet (NS 8407 § 33.1).» I force majeure er hjemmelen § 33.3, med samme ordlyd. Om forholdet var utenfor TEs kontroll, hører til grunnlagssvaret (VS-U13). Beløp og dager: «Byggherren godkjenner <beløp/dager>.» / «Byggherren godkjenner <x> av de krevde <y>.» / «Byggherren avslår kravet.» (6) Aksepten: «TE godtar byggherrens svar på <grunnlaget / kravet om justering av vederlaget / kravet om fristforlengelse> i brev <n> av <dato>.» Når svaret er subsidiært fordi grunnlaget er avslått eller prekludert, legger brevet til: «TE er enig i beløpet [antallet dager], men ikke i byggherrens standpunkt til grunnlaget.» Ellers står bare aksepten. (7) Innsigelsen: «<Part> gjør gjeldende at <motpartens varsel / krav / svar> i brev <n> av <dato> kom for sent (NS 8407 § 5 tredje ledd).» (8) Protesten (begge parter, VS-U14): «<Part> protesterer mot innsigelsen i brev <n> av <dato>» / «… mot påberopelsen av for sen varsling i svaret i brev <n> av <dato>» / «… mot innsigelsene i brev <n> av <dato>». (9) Passiviteten (VS-U12, før og etter et svar): «TE gjør gjeldende at byggherren ikke svarte uten ugrunnet opphold på TEs varsel etter NS 8407 § 32.2 i brev <n> av <dato>, og at pålegget derfor anses å innebære en endring (NS 8407 § 32.3 annet ledd).» (10) Bestridelsen: «<Part> bestrider opplysningen i brev <n> av <dato> om at <opplysningen>», der opplysningen er: «brevet ble sendt [mottatt] <dato>», eller «varselet etter § 33.4 i brevet ble sendt [mottatt] <dato>» når den gjelder et varsel; «brevet var en endringsordre etter NS 8407 § 31.3», eller «brevet ikke var en endringsordre etter NS 8407 § 31.3», etter det den som registrerte, oppga; «brevet har et forbehold eller annet innhold som ikke er uttrykt i appen». (11) Merkingen: «<Part> opplyser at brev <n> av <dato> har et forbehold eller annet innhold som ikke er uttrykt i appen, og som gjelder <grunnlaget, vederlaget, fristen>.» (12) Avklaringen (KA-U20, KA-U30): «<Part> bekrefter at standpunktene i brev <n> av <dato> om <grunnlaget, vederlaget, fristen> gjelder uten forbehold fra og med dette brevet.» (13) Kravversjonen i trekket (KA-U22: «<kravversjonen, entydig identifisert>»): «TE trekker kravet om justering av vederlaget [om fristforlengelse] i sak <saksnummer> («<sakstittel>»), fremsatt i brev <n> av <dato> (<beløp/dager>). Trekket er avkall på dette kravet, også det byggherren har godkjent.» Brevet <n> er det med den gjeldende kravversjonen. «<tittel>» i KA-U22 leses som sakstittelen; det er en tolkning av vedtaket. Forkastet for punkt 6: «Nei, bare aksepten» – «Brevet sier bare at TE godtar svaret. At enigheten bare gjelder beløpet eller dagene, følger av GR-U7 og vises i appen, men står ikke i brevet.» | 11.10, oppdragsgiver (#369, #410) | Spørsmålene står i versjon 4 av spørsmålene på #410 (V5), svarene på #369 (5.1–5.13). Setningen om endringsordren i punkt 1 er oppdragsgivers svar 11.10 i oppfølgingen på #369 (spørsmål 3), etter [LV-U3](#lv-u3) og [HF-U1](#hf-u1). Forkastet der: «Nei» – «Feltet lagres og vises i appen, men står ikke i brevteksten.» Andre brevtekster står i [GR-U14](#gr-u14), [VS-U15](#vs-u15), [KA-U22](#ka-u22) og [KA-U25](#ka-u25), og teksten når grunnlaget er avslått eller prekludert, er arbeidsvalget etter B-13 (05.10). At beløpet i vederlagskravet er uten merverdiavgift, er en ny regel; om «eks. mva.» også står ved beløp i svar og trekk, er et arbeidsvalg, fordi byggherrens beløp sammenliknes med kravets ([KA-U9](#ka-u9), B-13). Presiserer [LV-U2](#lv-u2) og [LV-U3](#lv-u3): ordlyden i tekstene appen lager av utsagnene. De faste tekstene i [KA-U22](#ka-u22) og [KA-U25](#ka-u25) står uendret; punkt 13 presiserer kravversjonen og «<tittel>» i KA-U22. Ordlyden for et grunnlagssvar som er en endringsordre, står i [GR-U14](#gr-u14), og for TEs eget varsel etter § 33.4 i [VS-U15](#vs-u15). Grunnlagskravet er ikke et varsel etter § 33.4 eller § 34.1.2 ([VS-U15](#vs-u15)). Endringsordrens dato eller nummer er påkrevd i grunnlagskravet ([GR-U16](#gr-u16)). Grunnlagskravet i force majeure (§ 33.3) kan ikke uttrykkes i formatet ennå (#367), og teksten kommer med #367. Punkt 6 gjengir [GR-U7](#gr-u7) i brevet («Den er ikke enighet om ansvaret»); spørsmålet foreslo setningen «Aksepten er ikke enighet om grunnlaget.», og oppdragsgiver valgte i oppfølgingen den tydeligere teksten. Vedleggene og henvisningen «brev <n> av <dato>» er også arbeidsvalg og føres i paragrafmatrisen. Ikke bygget. Brevteksten bygges i #369 |

> **Merknad 2026-10-07 til B-10, flyttet fra 3.4 10.10:** Strategien skal skille saksversjon fra
> versjonen som beregnet en projeksjon, og vise invalidasjon/gjenoppbygging
> når regler endrer gamle saker uten nye hendelser. Frosne brev og beslutninger
> beholdes. Utrulling og tilbakerulling skal ha en eksplisitt kompatibilitetsmatrise;
> ukjente rettslig relevante hendelser kan ikke hoppes over mens nye bindende
> kommandoer tillates. Implementering og bevis hører til F2; F5 kontrollerer
> at porten er bestått. B-10s konkrete format-/versjoneringsstrategi er fortsatt åpen.

> **Merknad 2026-10-09 til B-10, flyttet fra 3.4 10.10:** forslaget til formatet TS skriver i KOE-,
> EO- og forseringssakene står i [designnotatet](../design-hendelsesformat-2026-10-09.md)
> (#273). Beslutningsstatusen er uendret.

> **Merknad 2026-10-10 til B-10, flyttet fra 3.4 samme dag:** lagringsformatet er avgjort med
> [HF-U1](#hf-u1) og [HF-U2](#hf-u2). Versjonering, utrulling og tilbakerulling
> mellom TS-versjoner står åpne (#316), og B-10 står derfor fortsatt her.

#### Fullmakt og intern godkjenning

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| Godkjenning av ansvarsgrunnlaget (GFK-06): fullmakten regnes av TEs krevde beløp, vederlag pluss krevde fristdager ganget med dagmulktssatsen. Er kravet ikke tallfestet, kreves hele kjeden | 23.09, oppdragsgiver | Presisert 24.09 av raden under: ansvar har ingen egen verdi, og fullmakten regnes per spor. Bygget 24.09 (merknaden i GFK-06). Mangler dagmulktssatsen, gjelder B-06 |
| GFK-06 presisert: ansvar har ingen egen verdi, fullmakten regnes per spor. Et spor som besvares i samme brev, har verdien i svaret; ellers gjelder TEs krav. Et krav som ikke er sendt, krever hele kjeden som et krav som ikke er tallfestet; et trukket krav er 0. Avslått og frafalt ansvar er 0 | 24.09, oppdragsgiver | Bygget 24.09. Ved «frafalt» (§ 32.3 c) må byggherren utstede en endringsordre for det utførte arbeidet, med egen fullmakt; varsel eller tom EO-sak i frontenden er ikke bygget |
| Ubegrenset fullmakt kan sende alene når beløpet ikke kan verdsettes | 23.09, oppdragsgiver | Endret 10.10 av [EO-U6](#eo-u6), ikke bygget: en endringsordre som er byggherrens svar på grunnlaget i en KOE-sak, går gjennom fullmakten som en godkjenning av grunnlaget etter GFK-06. Bygget 24.09 i `resolve_route` og speilet `resolveRoute` (merknaden i GFK-02). Gjelder fristsvar med ny sluttdato (GFK-02) og endringsordrer (`resolve_route`). Alle andre trenger fortsatt hele kjeden, og kjeden må dekke det som lar seg verdsette |
| B-02 punkt 3: «ikke omgå godkjenning» betyr prosedyregaranti (v2 avsnitt 5, alternativ a) | 23.09, oppdragsgiver | En EO utstedes bare gjennom kommandoen, og kommandoens regler holder: pakke, policyversjon, fullmakt og side. At en overtatt runtime kan opptre som en godkjenner, er restrisiko. Den føres i ROS-analysen og vurderes på nytt før produksjon (F5). Bevis på menneskelig godkjenning (b) bygges ikke nå |
| Policy nøkles på `user_id` | 18.09 | `BH_APPROVAL_POLICIES` må ha `user_id` per oppføring før produksjon |

#### Kontrakt, API og saksopprettelse

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| <a id="kt-u1"></a>KT-U1: hvert spor i den offentlige tilstanden har `gjeldende_respons_event_id`: ID-en til svaret på gjeldende kravversjon, ellers `null`, også når sporet venter på svar på en ny versjon. TEs aksept viser til dette svaret i `refererer_til_event_id`, og serveren avviser en aksept av et annet svar med samme definisjon. Forkastet: at klienten avgjør det av `respons_event_id`, `bh_respondert_versjon` og `antall_versjoner` | 08.10, oppdragsgiver | Bygget (#272). Utfører KA-U1 i kontrakten. `respons_event_id` er uendret og står igjen etter en ny kravversjon |
| <a id="kt-u2"></a>KT-U2: den smale kontrakten under B-14 (#272) gjelder den representative flyten i språkprøven: vederlag med grunnlagsavhengighet, et fristscenario med spesifisert krav og TEs aksept. Den står i ett JSON-skjema med kommando, lagret hendelse og offentlig tilstand. En ny kommando er streng, de eksisterende kommandoene i flyten er tolerante, og historikken leses tolerant. Typegenerering og grensen for godkjenningspakker følger #274. En hviteliste for hele den offentlige tilstanden er #292 | 08.10, oppdragsgiver | Bygget (#272): [kontrakten](../domenetabell/README.md#kontrakten-for-flyten). Aksepten er den eneste nye kommandoen |
| API-et: tilstanden sender alltid alle felt, og `null` betyr at feltet finnes uten verdi. Hendelsesdata i tidslinjen utelater felt som ikke er satt. Frontendtypene følger: `X \| null` i tilstanden, valgfrie felt i hendelsene | 05.10, oppdragsgiver | Serialiseringen er slik i dag; typene er det ikke (SK-08, SK-09, M5) |
| Et tilstandsløst endepunkt som regner ut et utkast med serverens regler, utredes ikke nå. Speilet i `src/lib/domain/` står under regelversjonsvakten, og B-13 er uendret. Vurderes på nytt når M1 er levert | 05.10, oppdragsgiver | Merknaden 07.10 lot utsettelsen gjelde til nytt vedtak, og en eventuell tidligere utredning skulle behandles separat under B-15. B-15 er avgjort 09.10 ([B-15](#b-15)): serverbasert forhåndsvurdering utredes ikke som erstatning |
| <a id="b-15"></a>B-15: når nødvendig saksgrunnlag er lastet, skal brukeren kunne utforske vurderinger og se tilhørende beregninger og brevutkast uten å vente på serverkall. Ved innsending validerer serveren på nytt. Serverbasert forhåndsvurdering utredes derfor ikke som erstatning. B-13 er uendret | 09.10, oppdragsgiver (#274) | Flyttet fra 3.4 ved sluttredigeringen 09.10 |
| Saker opprettes både fra skjemaet i appen og fra en topic i Catenda | 29.09, oppdragsgiver | Ikke bygget: skjemaet får 403 (DM-05) |

#### Arkitektur, språk og overgang

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| B-14: målformene for M2, M1, M4 og M5 legges til grunn med presiseringene 07.10; M3 følger grensene som endres. Modulær monolitt og serverautoritet beholdes. Domenetabell og bevis-saker → smal kommando-/API-kontrakt → tidsbegrenset språkprøve → M2/M1 → M4 og videre kontraktsarbeid | 07.10, oppdragsgiver etter review av PR #266 og #270 | Vedtak om retning og prioritering, ikke gjennomført kode eller valgt backendspråk. Detaljer i merknaden 07.10 til B-14 under tabellen og [arkitekturforslaget](../forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md). Målformen M2 er presisert 08.10 av [KA-U1](#ka-u1). Retningen for språket er vedtatt 09.10 (raden under), og B-15 er avgjort 09.10 ([B-15](#b-15)). B-16 står åpen (3.4) |
| B-14, språket: TypeScript er retning for den delte domenekjernen, som brukes både i nettleseren og på serveren. Valget godkjenner ikke `sprakprove/kjerne/` som produksjonskjerne. Deler kan gjenbrukes, og andre formes på nytt etter modellforslaget i #300. Valget mellom serverlaget i SvelteKit, en egen backend og en eventuell permanent Python-worker tas ikke her. Før en større portering kommer gjennomgangen av målmodellen og overgangsgrensene (#300) | 09.10, oppdragsgiver etter språkprøven (#274) | Vedtak om retning. Ingen produksjonskode er portet. Grunnlaget er [arkitekturforslaget, avsnitt 7](../forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#anbefaling) og B-15. Oppdragsgiver bestemte 09.10 (merknaden 09.10 til B-14): TS-kjernen bygges i en egen permanent mappe fra #308, for eksempel `kjerne/` i roten, med typesjekk, prettier, arkitekturtest og regelversjonsvakt i CI. Kjernen er ren kode og avhenger ikke av B-18. #308 flytter målmodellen dit. Valget godkjenner fortsatt ikke prøvekoden som produksjonskjerne. Valget av serverlag er [B-18](#b-18) (10.10) |
| <a id="b-17"></a>B-17: TS tar over skrivingen i KOE-saker samlet, ikke én kommando om gangen. TS eier KOE-domenet: kommandoene, valideringen, utledningen, journalhendelsene, beslutningsgrunnlaget og enighetsgrunnlaget. Byttet omfatter alle som skriver i eller påvirker en KOE-sak: skjemaer, API, batch, godkjenningspublisering, webhooks og bakgrunnsjobber. Ingen Python-funksjon skal endre KOE-journalen etter byttet, heller ikke indirekte gjennom endringsordre eller forsering. Python kan beholde levering og integrasjon: gjengi og levere frosne brev, Catenda og tekniske leveringsresultater. Python tolker ikke KOE-journalen for å avgjøre hva et brev betyr eller hva partene kan gjøre. Andre sakstyper kan bli i Python med en uttrykkelig kontrakt mot TS. Dagens testsaker forkastes, og det bygges ingen kompatibilitetsleser for gamle Python-rader; bevis-sakene og domenetabellen føres videre. TS-kjernen bygges og prøves trinnvis, men skrivestien aktiveres samlet. Forkastet: gradvis overtakelse av enkeltkommandoer med to skrivere i samme sak (2.8 i [modellforslaget](../forslag-maalmodell-2026-10-09.md#28-overgangsgrensen)), fordi kompatibilitet begge veier koster mer enn den gir uten reelle data | 09.10, oppdragsgiver etter målmodellen (#304) | Erstatter overgangsgrensen i 2.8 som arbeidshypotese. B-10 (#273) gjelder fortsatt, men formatet velges uten hensyn til at dagens Python-kjerne skal lese det. Serverplasseringen er [B-18](#b-18). Oppdragsgiver bestemte samme dag (merknaden 09.10 til B-17): endringsordre- og forseringssakene går til TS sammen med KOE-sakene. EO-U2 og EO-U3 krever at kandidatkontrollen og eksklusiviteten avgjøres i samme transaksjon som KOE-saken, og B-17 forbyr Python å endre KOE-saken indirekte. F2 slik den er skrevet, utgår, og #309 og #310 utvides. Arbeidspakken er FK (avsnitt 5). Presisert 10.10 for formatet av [HF-U2](#hf-u2). Python kan beholde levering og integrasjon så lenge de ikke leser eller skriver i databasen selv, og bare til de flyttes ([B-19](#b-19)) |
| <a id="ov-u1"></a>OV-U1: første versjon av TS-stien, den som skriver den første reelle hendelsen (#310), dekker KOE-saken med de tre sporene: grunnlaget (§ 32, også § 32.2 og endringsordre etter § 32.3 første ledd a i KOE-saken, GR-U12 og GR-U13), fristen og vederlaget, med svar, aksept, trekk, «ingen krav», innsigelse etter § 5, forespørsel etter § 33.6.2 og registrering av brev sendt utenfor appen. Forsering (§ 33.8, FO-U1–FO-U6), endringsordre som egen sak (EO-sak, EO-U1–EO-U9) og justering av enhetspriser (§ 34.3.3) avvises til de er bygget, etter #310. Det den ennå ikke kan, avvises og forenkles ikke. B-17 står: etter byttet skriver Python ikke i noen av de tre sakstypene. Vedtakene om det som avvises, står; avgrensningen gjelder bare rekkefølgen de bygges i. Forkastet: endringsordre som egen sak i første versjon, som ville krevd at B-01 ble avgjort nå; og hele domenet før #310, slik rekkefølgen i FK var | 10.10, oppdragsgiver (#358) | Endrer rekkefølgen i FK (avsnitt 5): #310 kommer før byggedel 4 av #309 (endringsordre og forsering) og før § 34.3.3 i byggedel 3. Hvilke bestemmelser i § 33 og § 34 som hører til første versjon, skal paragrafmatrisen for #309 (PR #350) vise, innenfor [VS-U3](#vs-u3). Om § 34.4 og § 30 hører til, avgjøres i byggedel 3, når § 30 er lest (VS-U3). Brev om det som avvises, følger [OV-U2](#ov-u2). B-01 trengs først i byggedel 4 (merknaden 10.10 til B-01 i 3.4). Ikke bygget |
| <a id="ov-u2"></a>OV-U2: i første versjon (OV-U1) føres forsering og endringsordre som egen sak utenfor appen, og KOE-saken viser at de ikke støttes ennå. Sperren i FO-U5 virker bare når en forseringssak i appen viser til avslaget. Godtar TE et fristavslag i appen etter å ha varslet forsering utenfor appen, er det TEs brev. En endringsordre som er svar på grunnlaget, registreres som byggherrens svar på grunnlaget i KOE-saken (GR-U13), og det appen ikke kan uttrykke i den, som pris og tid, følger KA-U16. Forkastet: at TE kan registrere i KOE-saken at forsering er varslet for avslåtte dager, uten en forseringssak, slik at registreringen sperrer aksepten etter FO-U5 | 10.10, oppdragsgiver (#358) | Presiserer [FO-U5](#fo-u5) for første versjon: sperren forutsetter en forseringssak i appen som viser til avslaget. Bygger på oppdragsgivers prinsipp 10.10 om at den som sender et brev, er bundet av det og har ansvaret for innholdet (som i [MM-U17](#mm-u17)). [EO-U6](#eo-u6) gjelder når endringsordre som egen sak er bygget; til da viser grunnlagssvaret ikke til en EO-sak. Ikke bygget |
| <a id="hf-u2"></a>HF-U2: begrepene i hendelsene TS skriver, følger kontrakten. Byggherrens standpunkt til grunnlaget heter «grunnlag», ikke «ansvar», med verdiene godkjent, avslått og frafalt, fordi frafall av et pålegg ikke er en vurdering av ansvar. «Frafalt» betyr at byggherren frafaller pålegget etter § 32.3 første ledd c, ikke at TE frafaller et krav. «Hindring» betyr at fremdriften hindres som følge av forholdet saken gjelder (§ 33.1). «Prinsipalt» og «subsidiært» er slik brevet ordner byggherrens standpunkter. At et standpunkt er uten virkning, er appens vurdering. Det lagres atskilt fra det byggherren sa, og vises ikke som noe byggherren har sagt. De øvrige begrepene står som foreslått: svar, krav med versjoner, rettidighet, beløp og dager, sammenfall, aksept, trekk, varsel, bestridelse, «ingen krav» og opplysning. Feltnavnene velges av utviklerne innenfor dette, og gamle og nye navn står i navnetabellen i [domenetabellen](../domenetabell/README.md) | 10.10, oppdragsgiver (#273) | Presiserer «Språk» i `AGENTS.md` og B-17 for formatet. «Hindring» gjelder også § 33.3 etter [VS-U13](#vs-u13) (11.10). Teknisk valg innenfor vedtaket: kodene som deles med `kontrakt.json` og Python, som kategoriene, metodene og resultatverdiene, står uendret i formatet til de er avklart i et eget issue før TS skriver den første reelle hendelsen. Ikke bygget |
| <a id="mm-u13"></a>MM-U13: en regel i kjernen stiller det presise kontraktsspørsmålet til utsagnene, for eksempel om grunnlaget er godkjent, om pålegget er frafalt og om preklusjon er påberopt. Ingen regel leser en samlebetegnelse i stedet for spørsmålet, heller ikke en som er utledet og ikke lagret. Unntaket er «avklart» etter GR-U7, som er en navngitt betingelse som defineres rett av standpunktene og brukes bare der vedtakene sier det (GR-U7, KA-U11 og EO-U5). Forkastet: at reglene leser en utledet samlebetegnelse der vedtakene ikke sier det | 10.10, oppdragsgiver (#329) | Presiserer «Kontrakten først» i `AGENTS.md` og MM-U11. Bygget i kjernen 10.10 (#340): `grunnlagAvklart` og `grunnlagAvvist` leser standpunktene direkte, og `grunnlagAvvist` krever TEs aksept. Før leste de `utfall()`, som slo sammen godkjent og frafalt (§ 32.3 første ledd a og c) til «avklart», og avslag og preklusjon til «avvist» (L 10.10). Arkitekturtesten avgrenser «avklart» til reglene GR-U7 og KA-U11 gjelder. En importert verdi kan bare avgrenses per modul (#344) |
| <a id="b-18"></a>B-18: valget av serverlag for TS-kjernen overlates til utviklerne og IT innenfor tre krav: én autoritativ regelbehandling, kontrollert adgang til bindende handlinger og historikk som kan etterprøves. Flere tjenester kan rulles ut som én samlet utgivelse. IKT-spørsmålet står i #78 | 10.10, oppdragsgiver (#311) | Grunnlaget er [vurderingen](../vurdering-b18-serverplassering-2026-10-10.md). Utviklernes valg er en egen Node/TS-server med Python ved siden av for innlogging, levering og Catenda, forutsatt at IKT ikke har et krav som utelukker det (#78). Alternativene var serverlaget i SvelteKit og at TS også tar levering og Catenda. Flyttet fra 3.4. Hostingen i B-12 er uendret. Oppdragsgiver 10.10 (#347, #78): skiva i #347 bygges i testmiljøet etter utviklernes valg uten å vente på IKT; har IKT et krav som utelukker valget, vurderes serverlaget på nytt, men skiva viser integrasjonen uansett. Endret 11.10 av [B-19](#b-19): innloggingen flyttes til TS, og backenden samles der. Ikke bygget |
| <a id="b-19"></a>B-19: backenden samles i TS. Det Python gjør mot databasen, flyttes til TS før databasen byttes til Azure SQL, først innloggingen og sesjonen, identiteten og synkroniseringen av medlemskap, og ellers blant annet webhookens innboks. Databasen byttes før eller sammen med KOE-byttet ([B-17](#b-17)), og Python-lagrene skrives ikke om for Azure SQL. Leveringen og Catenda kan bli i Python så lenge de ikke leser eller skriver i databasen selv, til de flyttes. Forkastet: å skrive om Python-lagrene for Azure SQL som en mellomfase | 11.10, oppdragsgiver (#375) | Bygger på [B-12, databasen](#b-12-databasen). Endrer utviklernes valg under [B-18](#b-18) om Python for innloggingen, og presiserer [LV-U1](#lv-u1): Python henter ikke leveringsoppdraget direkte fra basen. Endrer rekkefølgen i FK: flyttingen og datalaget for Azure SQL kommer før eller sammen med #310. Identiteten løses i dag i databasefunksjonen `koe_resolve_identity`, som innloggingen, medlemssynkroniseringen og webhooken kaller. Ved byttet skrives den i T-SQL eller TS med samme issuer og normaliserte subjekt, og alle veiene inn bruker den samme. Forutsetter at IKT ikke utelukker Node (#78, punkt 6 i #375). Arbeidet følges i #375. Ikke bygget |
| Leveringsmål fryses; samlet status skiller lagret, venter, usikkert og levert; fravær løses med sporbar ny godkjenning, ikke delt konto eller bypass | 16.–17.09 | Del av invariantene i 2.3 |
| En enkel databasebasert worker, ikke en distribuert meldingsplattform | 17.09 | Volumet tilsier det |
| Ingen utrulling før den samlede produksjonsporten er passert | 17.09 | F5 |

> **Merknad 2026-10-07 til B-14, flyttet fra 3.4 ved sluttredigeringen 09.10:** Oppdragsgiver tilsluttet seg reviewets
> justeringer og ba om dokumentasjons-PR og issues. Denne merknaden erstatter
> den betingede rekkefølgen og den åpne målformstatusen fra 05.10.
>
> Før større språkspesifikk ombygging etableres domenetabell og et
> språkuavhengig bevisgrunnlag, deretter en smal kommando-/API-kontrakt.
> Språkprøven har én arbeidsuke som stoppgrense og to porter: semantikk og
> reduksjon av dobbeltarbeid, deretter konkret server-/integrasjonskostnad.
> Ufullstendig bevis gir «ikke tilstrekkelig grunnlag», ikke automatisk
> utvidelse eller TS-valg. Etter språkvedtak følger M2/M1, M4 og videre
> kontraktsarbeid; M3 følger de grensene som endres.
>
> M2 binder brukerens aksept til et konkret svar og samler livsløpsfakta,
> også tilbaketrekking og grunnlagsavhengighet. Hva som er gjeldende krav,
> skal brukes likt i projeksjon og godkjenning. Offentlig serialisert kontrakt
> defineres før typegenerering; nye kommandoer, lagrede hendelser og lesemodeller
> har ulike grenser. Bevisene omfatter vanlig innsending, batch, godkjenning
> og lagring/gjenlesing, med uavhengige domeneinvarianter.
>
> Språk, database og rammeverk er ikke valgt. Utredning av serverbasert
> forhåndsvurdering og korrigeringsprosessen er åpne under B-15 og B-16.
> Gjennomføringsdetaljene står i [arkitekturforslaget](../forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md);
> oppfølgingen er koblet i [reviewnotatet](../review-oppfolging-arkitektur-2026-10-07.md).

#### Plattform, datalag, tilgang og identitet

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| ~~PostgreSQL og RPC over PostgREST er utgangspunkt for transaksjoner~~ | 16.–17.09, bekreftet i AF-02. **Opphevet 23.09** med TM-01 som motbelegg | Se raden under og merknaden etter tabellen |
| PostgreSQL over direkte tilkobling er utgangspunkt for transaksjoner (B-02 alternativ C, transport T2) | 23.09, oppdragsgiver | Én bindende kommando er én transaksjon, over direkte tilkobling til databasekommandoer. Backend når basen med en databasedriver og vanlig SQL, ikke gjennom PostgREST og `supabase-py`. Tas ikke opp igjen uten nytt konkret motbelegg. Delen om PostgreSQL er endret 11.10 av [B-12, databasen](#b-12-databasen); direkte tilkobling og én transaksjon per bindende kommando gjelder fortsatt |
| B-02 hovedvalg: alternativ C. RLS med kontekst for lesing, avgrensede `SECURITY DEFINER`-kommandoer for bindende skriving, og operasjonsmodellen for journal, saksregister og kø | 23.09, oppdragsgiver | Slik [design v2](../design-b02-tilgangsmekanisme-v2-2026-09-23.md) beskriver det. Punktene 3–6 i avsnitt 9 der står åpne under B-02. Uavhengig review før første F1-migrasjon gjelder fortsatt (22.09). Plattformen er Azure SQL fra 11.10 ([B-12, databasen](#b-12-databasen)); hovedvalget står, og mekanismen uttrykkes og prøves i T-SQL (#395) |
| Designet avhenger ikke av plattformen. Foreløpig mål er Azure Database for PostgreSQL (Flexible Server, versjon 17) | 23.09, oppdragsgiver | Alternativ C skal virke likt lokalt, i CI, på Supabase og på Azure. Vernet ligger i roller, RLS og funksjoner i ren PostgreSQL (kravet fra 22.09). Endelig plattform og hosting er B-12. Målet og kravet om ren PostgreSQL er endret 11.10 av [B-12, databasen](#b-12-databasen); alternativ C må prøves i T-SQL (#395) |
| TS2-02: JSON-hendelseslageret, CSV-metadatalageret og Supabase-lagrene går ut av kjøretidsstien | 23.09, oppdragsgiver, med beslutningen over | Tester som trenger ekte lagring, går mot PostgreSQL over samme tilkobling som produksjonen, med skrivbar testbase. Testdoblene som speiler Supabase-klienten, faller bort med lagrene (F0b). Fra 11.10 er basen Azure SQL ([B-12, databasen](#b-12-databasen)), og delen om PostgreSQL er endret. Python-lagrene skrives ikke om ([B-19](#b-19)) |
| B-02 punkt 4: prosjekt og kontraktsteam registreres bare av drift (TM-12) | 23.09, oppdragsgiver | En navngitt administrator bestemmer hvilke Catenda-team som representerer TE og BH. Runtime får ikke kalle `koe_register_project` eller `koe_set_contract_teams` (F1) |
| B-02 punkt 5 og B-04: tilbakekalling | 23.09, oppdragsgiver | Se merknaden til B-04 under tabellen. Rett til nye handlinger opphører straks systemet har registrert endringen; en gitt godkjenning står; utkast blir hos teamet; ved utdatert medlemsliste fortsetter appen, og drift varsles |
| B-02 punkt 6: break-glass er navngitt, tidsbegrenset og logget | 23.09, oppdragsgiver | Prosedyren i v2 avsnitt 8: én person, én hendelse, bare de rettighetene hendelsen krever, fjernet etterpå, alt logget. To-personskontroll og varsel til motparten kreves ikke. Hvem som kan få og godkjenne nødtilgang, avklares i F5 |
| Bare Catenda-innlogging | 18.09 | Anonym innlogging og OAuth-serveren slås av i Supabase-konsollet før produksjon |
| MG-02: webhook kan opprette brukerrader gjennom `koe_resolve_identity` | 21.09 | Gjennomført |
| DB-05: `viewer` skal finnes som ren leserolle | 21.09 | Besluttet, ikke bygget |
| Webhookens kontraktsside utledes av forfatterens lagmedlemskap | 19.09 | Fail-closed uten entydig side (INT-04) |
| Vedlegg er kontraktskorrespondanse | 18.09 | Deltakere uten TE- eller BH-tilknytning leser ikke vedlegg |
| <a id="rp-u1"></a>RP-U1: innholdet i brevene skal komme tapsfritt fram til Microsoft Fabric for rapportering. Kravet nå er partenes utsagn i hvert brev og hele brevinnholdet, atskilt fra appens frosne vurdering. Sakens utledede situasjon kommer senere som en egen leveranse fra regelbehandlingen ([B-17](#b-17)). Det som etter invariant 1 er privat for et team, som interne notater, utkast og godkjenningspakker, holdes utenfor Fabric eller skjermes der etter team som i appen. Tilgangen og prosjektgrensen i Fabric etableres for seg. Brevene får ingen størrelsesgrense på grunn av Fabric. Forkastet: å rapportere bare utvalgte tall i stedet for brevinnholdet | 11.10, oppdragsgiver etter sparring (#377, #391) | Forutsetning for B-12 ([merknaden 11.10](#b-12-merknad-2026-10-11)). Grunnlaget er [vurderingen av JSON i Azure SQL](../vurdering-json-azure-sql-2026-10-11.md). Den utledede situasjonen kommer fra TS etter KOE-byttet (#310). Fabrics innebygde speiling er et mulig middel, ikke kravet. Skjermingen følger invariant 1 og 8 og merknaden 23.09 til B-12. Ikke bygget |
| <a id="b-12-databasen"></a>B-12, databasen: appens database er Azure SQL Database. Forbeholdet er at IKT bekrefter at appen får en egen database på et nivå som kan speiles til Fabric ([RP-U1](#rp-u1)). Grunnene er at SQL inngår i virksomhetens drift i dag, og at en ny Azure Database for PostgreSQL koster minst om lag 1 000 kroner i måneden | 11.10, oppdragsgiver etter opplysninger fra IKT (#78) | Endrer målet og kravet om ren PostgreSQL i raden «Designet avhenger ikke av plattformen», delen om PostgreSQL i raden om direkte tilkobling, og plattformen for B-02 og TS2-02. Hostingen av backenden i B-12 er fortsatt åpen (3.4). Opplysninger fra IKT (#78): IKT drifter serveren, appen kobler seg til basen med managed identity, og innloggingen er fortsatt OAuth via Catenda. Når byttet skjer, står i [B-19](#b-19). Lagringsformen er ikke avgjort med dette. Oppdragsgiver heller mot en prøve av begge formene og/eller sparring først (#395); til da gjelder [merknaden 11.10 til B-12](#b-12-merknad-2026-10-11). Tilgangsmekanismen i B-02 alternativ C prøves tidlig i T-SQL (#395). Grunnlaget er [vurderingen av JSON i Azure SQL](../vurdering-json-azure-sql-2026-10-11.md). Ikke bygget |

> **Merknad 2026-09-23 til 3.1: direkte tilkobling erstatter RPC over PostgREST.**
> Oppdragsgiver bekreftet 23.09 alternativ C med transport T2 fra
> [design v2 for B-02](../design-b02-tilgangsmekanisme-v2-2026-09-23.md#9-hva-oppdragsgiver-må-avgjøre)
> (punkt 1 og 2), og Azure PostgreSQL som foreløpig mål. Premisset «RPC over
> PostgREST» fra 16.–17.09 er dermed opphevet. Motbelegget er TM-01: den som kan
> signere et token for PostgREST, kan velge `service_role`. Med direkte
> innlogging har runtime ingen nøkkel som velger rolle, og rollen kan ikke
> `SET ROLE` til `service_role` eller eieren (K 23.09, prototype v2).
>
> Følgene: TM-01 og TM-09–TM-10 treffer ikke runtime når backend verken bruker
> PostgREST eller har nøkler til det. Forespørselsvakten (T1v) og porten mot hostet PostgREST i v2
> avsnitt 1 bortfaller. Python får ekte transaksjoner, og databasekommandoene
> kalles med vanlig SQL. Lokal testing mot en egen PostgreSQL blir mulig uten
> virksomhetens base. Kostnaden er den v2 navngir: databasedriver og pool i
> Flask, og omskriving av repositoriene. Det er arbeidspakken F0b.
>
> Transaksjonsinvarianten (2.3, punkt 3) er uendret. Det som er byttet, er
> veien fra backend til basen. Vedtak som nevner Supabase-konsollet, gjelder så
> lenge Supabase er plattformen (B-12). Kilde:
> [handoffen 23.09](../handoff-2026-09-23-datalag-postgresql.md), avsnitt 3 og 6.

> **Merknad 2026-09-23 til B-04 (beslutning), flyttet fra 3.4 ved sluttredigeringen 09.10:** Oppdragsgiver har avgjort:
>
> 1. **Nye handlinger** opphører straks systemet har registrert at tilgangen er
>    borte. Klokken er tidspunktet synkroniseringen committer lokalt, fordi
>    Catenda ikke oppgir når endringen ble gjort der, og fordi det lokale
>    tidspunktet kan dokumenteres.
> 2. **En godkjenning** som ble gitt mens godkjenneren hadde fullmakt, står.
>    Pakken kan utstedes. Nye godkjenninger kan personen ikke gi.
> 3. **Utkast** blir hos teamet. En kollega kan fullføre og sende i eget navn.
> 4. **Utdatert medlemsliste:** feiler synkroniseringen, kan alle fortsatt
>    handle, og drift varsles. Begrunnelsen er at en tapt frist ikke kan
>    repareres, mens et varsel fra en som ikke lenger hadde tilgang, kan
>    bestrides og spores. Varselet skal utløses av alderen på listen, ikke bare
>    av feil, fordi en ufullstendig liste ikke gir noen feil. Hvor gammel listen
>    kan bli før drift varsles, og om det skal være en ytre grense, for eksempel
>    at intern EO-godkjenning stopper mens varsler og svar aldri gjør det,
>    fastsettes i B-09.
>
> Punkt 4 snur dagens atferd. `AuthService.role()` synkroniserer når listen er
> eldre enn `AUTH_MEMBERSHIP_MAX_AGE_SECONDS` (900 s), og `require_project_access`
> gjør et unntak fra synkroniseringen om til `503 ACCESS_UNAVAILABLE`, uten å
> logge det. Når Catenda ikke svarer, kan da ingen handle i prosjektet, heller
> ikke sende et varsel med frist (L 23.09, ikke kjørt). Endringen hører til F1
> sammen med tilbakekallingen.

#### Premissene P1–P7

| Beslutning | Vedtatt | Følge |
| --- | --- | --- |
| P1: magic links utgår | 20.09 | `magic_links` fjernes (MS-15) |
| P2, P3: BIM er relevant; et objekt hører til én sak; formålet er å se hvilke komponenter som fører til tvist | 20.09 | Retning MS-13, MS-14. Ikke prioritert |
| P4: vedlegg lagres bare i Catenda | 20.09 | Hash og frosset grunnlag hos oss (MS-11, AF-04) |
| P5: løsningen skal i prinsippet støtte andre virksomheter | 20.09 | `organisasjon_id` (MS-10, gjennomført) |
| P6: to kan arbeide i ulike spor samtidig | 20.09 | Total orden beholdes (MS-03) |
| P7: arkivplikt går foran sletteplikt for journalen | 21.09 | Journalen bevares. Kryptografisk sletting bygges ikke. Tiltakene er MS-04 og MS-05. Bevaringstid og øvrige regler er ikke fastsatt (B-05) |

### 3.2 Føringer AF-01–AF-06

Tilsluttet av oppdragsgiver 21.09. Føringer for design, ikke implementert.

| ID | Føring | Hvor i planen |
| --- | --- | --- |
| AF-01 | Teaminternt innhold vernes i datalaget; prosjekt, side, team og handlingsrett modelleres hver for seg | F1, invariant 1 |
| AF-02 | Kommandoer, rettigheter og transaksjonsgrenser utformes samlet; append-only mot omskriving og tilføying | F1, F2, invariant 2–3 |
| AF-03 | Fjerning av relasjonsprojeksjonen er ikke fastlagt | B-01 |
| AF-04 | Hash suppleres med dokumentversjon, bevaring, leveringsbevis og eksport | F2, F4, invariant 10 |
| AF-05 | Deterministisk gjenoppbygging uten eksterne oppslag | F2, invariant 9 |
| AF-06 | Ekte PostgreSQL-tester og én komplett EO-flyt før generell opprydding og flere adaptere | Rekkefølgen i avsnitt 5 |

> **Merknadene 03.10 og 04.10 til AF-06 (unntak), samlet ved sluttredigeringen
> 09.10:** Oppdragsgiver har godkjent avgrensede unntak for oppryddinger som
> ikke rører datalaget, autentiseringen eller webhookstien, og som ikke
> forutsetter et databasevalg: #106, #107, #108, feilrettingen #72,
> frontenddelen av #110, frontenddelen av #111 (modulbeskrivelsene i
> `fristDomain.ts`, `grunnlagDomain.ts`, `vederlagDomain.ts`,
> `fristSubmissionDomain.ts` og `vederlagSubmissionDomain.ts`), de to
> Catenda-metodene uten kallere i #102 (`WebhookService.handle_pdf_upload` og
> `BaseSakService._create_topic_with_relations`), de reserverte
> PDF-parameterne i #146, #109 og den avgrensede deloppgaven i #49
> (SystemContext, `/api/validate-user` og `CSVRepository`). Backfill-skriptet i
> #102, backenddelen av #111 og logger-delen av #110 følger rekkefølgen i
> avsnitt 5.

> **Merknad 2026-10-07 til AF-06:** B-14 gir et avgrenset unntak for
> domenetabell, bevis-saker, smal kommando-/API-kontrakt og beslutningsprøven
> før større språkspesifikk ombygging. Prøven bruker eksisterende PostgreSQL
> og en isolert teststi. Den erstatter ingen autoritativ produksjonssti,
> åpner ikke database-/hostingvalget og godkjenner ingen full portering.
> Sikkerhetsvedlikehold og små uavhengige rettinger kan fortsette innen sine
> eksisterende føringer. F1/F2s sikkerhets- og transaksjonskrav gjelder fortsatt.

> **Merknad 2026-10-09 til AF-06 (B-17):** For KOE-, EO- og forseringssakene
> følger rekkefølgen B-17 og arbeidspakken FK (avsnitt 5), ikke F0b–F2.
> Oppdragsgiver avgjorde samme dag at endringsordre- og forseringssakene går
> til TS sammen med KOE-sakene (merknaden til [B-17](#b-17)).

> **Merknad 2026-10-09 til AF-06 (#102, #162):** Oppdragsgiver har godkjent at
> backfill-skriptet i #102 (`backend/scripts/backfill_relations.py`) og
> testskriptene i #162 (`create_test_sak.py` og `test_full_flow.py`) slettes nå.
> De rettes ikke. Skriptene krever Supabase-lageret eller utviklingsbypass, og de
> bygger saker og relasjoner fra testsaker som forkastes etter B-17.

> **Merknad 2026-10-10 til AF-06 (#347):** avviket fra rekkefølgen i FK for skiva i
> #347 står i merknaden 10.10 til FK, runde 3 (avsnitt 5).

> **Merknad 2026-10-11 til AF-06 ([B-12, databasen](#b-12-databasen), [B-19](#b-19)):**
> «Ekte PostgreSQL-tester» betyr fra 11.10 tester mot en ekte database av samme
> slag som produksjonen, Azure SQL. Lagerovergangen i TS2-02 bygges ikke i
> Python: lagrene slettes når det Python gjør mot databasen, er flyttet til TS
> (B-19, #375). Prøven mot eksisterende PostgreSQL i merknaden 07.10 og
> testbasen for kjernens lagringstester gjelder til datalaget for Azure SQL
> finnes.

### 3.3 Anbefalinger som ikke er vedtatt

| Anbefaling | Kilde | Status |
| --- | --- | --- |
| Relasjonsprojeksjon med prosjektavgrensede fremmednøkler og én skriver | AF-03, RGK-04 | Foretrukket til vurdering, se B-01 |
| Avgrenset runtime-rolle uten `BYPASSRLS`, RLS for lesing og avgrensede `SECURITY DEFINER`-funksjoner med egen autorisasjon, fast `search_path` og smal `EXECUTE` | RGK-04 | Innarbeidet i alternativ C, vedtatt 23.09 (3.1). Ordlyden er PostgreSQL; etter [B-12, databasen](#b-12-databasen) uttrykkes og prøves mekanismen i T-SQL (#395) |
| Gjør TST-02-reproduksjonen deterministisk, framfor å fjerne `strict=True` | RGK-04 | Anbefalt. Den nye testen fra 22.09 er ikke deterministisk (RTB-02) |
| Forhåndsvalgte GUID-er for topic og kommentar | RGK2-01 | Kandidat. Ikke bevist idempotent (avsnitt 7) |
| Køalarm ved 15 minutter; sletting av stagingfiler 24 timer etter kvittert levering | Konsolidering v2 | Forslag uten kilde, se B-09 |
| Utgående kvote på 10 kall/s og innkommende grense 100 kall/s | Konsolidering v2 | Forslag uten kilde, se B-09 |
| Fjern JSON-hendelseslageret og CSV-metadatalageret fra kjøretidsstien; tester som trenger ekte lagring, går mot PostgreSQL gjennom samme vei som produksjonen, med skrivbar testbase | [TS2-02](../gjennomforing-tst02-2026-09-22.md#ts2-02--reservelagrene-og-testene) | Vedtatt 23.09, utvidet til Supabase-lagrene (3.1). Fra 11.10 er basen Azure SQL, og Python-lagrene skrives ikke om ([B-19](#b-19)) |
| Migrasjonsmappa som eneste kilde, anvendt med `supabase db push` | Masterplanen 20.09 | Repo-siden gjennomført (DA-03). Anvendelsesmekanismen gjenstår. `supabase db push` gjelder bare på Supabase; for Azure SQL trengs en annen vei fra fil til base ([B-12, databasen](#b-12-databasen), #53) |

### 3.4 Åpne beslutninger

«Ansvarlig» angir rollen som må avklare. Der ingen er utpekt, står det.
Et åpent valg blokkerer bare oppgavene som er nevnt.

| ID | Spørsmål | Alternativer | Anbefaling (kilde) | Ansvarlig | Belegg som trengs | Blokkerer |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | Hvordan skal relasjoner mellom saker lagres? | (a) Relasjonsprojeksjon med prosjektavgrensede fremmednøkler, én skriver. (b) Utledning fra hendelsenes jsonb med GIN-indeks. (c) Reservasjonstabell for KOE-tilknytning pluss (a) eller (b) | (a) er foretrukket til vurdering (AF-03). En GIN-indeks er ikke et revisjonsspor (RGK-04) | Utvikler, med review. Ikke utpekt | Sammenlikning mot referanseintegritet, eksklusivitet, gjenoppbygging og samtidighet | KOE-tilknytning og relasjoner, i FK etter merknaden 09.10 til F2. DB-04, MS-08 |
| B-05 | Hvilke bevaringskrav gjelder utover journalen? | Bevaringstid for journal, filer, logger, backup og stagingfiler | P7 fastsetter bare at journalen bevares uten kryptografisk sletting | Behandlingsansvarlig, med råd fra personvernombudet | DPIA og arkivfaglig vurdering | Bevarings- og sletteregler i F4. Produksjonsport |
| B-06 | Hvilken fullmakt kreves når dagmulktssats mangler? | Kjedens toppnivå; avvisning; manuell verdsetting | Ingen | Oppdragsgiver (BH-siden), ikke utpekt | Domenevurdering | Restansen på GFK-01/FE-04 |
| B-07 | Hvilken drivmekanisme skal workeren ha? | Tabell med `SKIP LOCKED`, `pgmq`, Cloud Tasks, Cloud Scheduler, jobber i Azure Container Apps, fast instans | Én kømekanisme; tabell og `SKIP LOCKED` er beskrevet i transaksjonsplanen | Utvikler, ikke utpekt | Plattformens skalering til null og krav om start uten brukerhandling | Minimal worker i F2 |
| B-09 | Hvilke driftsverdier gjelder? | Kapasitet, svartid, køalarm, rate limits, oppbevaring av stagingfiler | Tall i 3.3 er forslag uten kilde | Driftsansvarlig, ikke utpekt | Lastforutsetninger, Catendas kvoter, fristkrav | Akseptkriterier for kapasitet og varsling i F3 |
| B-11 | Hvilken tidskilde og forvaringskjede skal eksporten bygge på? | Servertid med synkroniseringsgaranti; ekstern tidsstempling; begge | Ingen | Oppdragsgiver med driftsansvarlig, ikke utpekt | Krav ved preklusjonstvist | Eksport i F4 |
| B-12 | Hvilken plattform skal basen og backend kjøre på? | Database: Azure Database for PostgreSQL (Flexible Server, 17), Supabase eller Azure SQL Database. Backend: Azure Container Apps eller App Service (Web App for Containers) | Databasen er avgjort 11.10 med [B-12, databasen](#b-12-databasen): Azure SQL Database. Hostingen av backenden er åpen. Begge hostingvalgene virker; Container Apps har jobber som kan drive workeren (B-07). Grunnene står i [B-12, databasen](#b-12-databasen). Azure SQL krever et nytt datalag i T-SQL. Fabric er rapportering, ikke backend | Oppdragsgiver med IKT | IKTs bekreftelse av forbeholdet i B-12, databasen. Svar fra IKT om hosting, og tilgang til deploy, Key Vault og en offentlig HTTPS-adresse for Catenda-webhooks | Container og utrulling i F0b. Veien fra migrasjonsfil til base. Plattformkonfigurasjon i F5 |
| B-16 | Hvordan dokumenteres og behandles feilregistrerte, låste opplysninger? | Dokumentert manuell prosess; eksplisitt rettelseshendelse med referanse til originalen; annen avklart prosess | Bevar originalen og skill korrigert opplysning fra rettslig virkning. Ingen automatisk flytting av frist eller omgjøring av sendt brev | Oppdragsgiver med domeneansvarlig | Eksempler på feil dato/metode/referanse, aktørrettigheter, godkjenning, motpartsinnsyn og virkning | Korrigeringsfunksjon og produksjonsport. Blokkerer ikke låsingen etter SK-12 |

**Avgjorte beslutninger.** Vedtakene står i 3.1. Radene og merknadene slik de
stod i 3.4 før sluttredigeringen 09.10, er i Git (se toppteksten).

- **B-02** tilgangsmekanisme: alternativ C med transport T2 og punkt 3–6,
  avgjort 23.09. Grunnlaget er [det første designgrunnlaget](../design-b02-tilgangsmekanisme-2026-09-22.md)
  (TM-01–TM-08), [reviewet](../review-b02-tilgangsmekanisme-2026-09-23.md)
  (RB2-01–08) og [design v2](../design-b02-tilgangsmekanisme-v2-2026-09-23.md)
  (TM-09–TM-12).
- **B-03** dokument- og brevmodell: hovedvalget avgjort 03.10 (brev, ikke samlet
  saksdokument) og dokumentet 10.10 ([B-03, dokumentet](#b-03-dokument)), med
  [MM-U10](#mm-u10) om flere spor i ett brev.
- **B-04** tilbakekalling: avgjort 23.09. Vedtaket står i merknaden til B-04 i 3.1.
- **B-08** KOE-eksklusivitet: avgjort 08.10 med [EO-U3](#eo-u3).
- **B-10** versjonering av hendelsesformat og regler: avgjort 10.10
  ([B-10](#b-10)), med [HF-U1](#hf-u1) og [HF-U2](#hf-u2) om lagringsformatet og
  [MM-U15](#mm-u15)–[MM-U17](#mm-u17) om visningen, regelendringen og registrert
  korrespondanse. Merknadene til B-10 står i 3.1.
- **B-13** sannhetskilde for NS 8407-reglene: avgjort 24.09 etter
  [kartleggingen](../kartlegging-domeneregler-frontend-2026-09-23.md) og
  [designnotatet](../design-b13-sannhetskilde-2026-09-23.md).
- **B-14** målformer, rekkefølge og språk: avgjort 07.10 og 09.10. Levert under
  B-14: [domenetabellen](../domenetabell/README.md) og
  [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md) (#271),
  [kontrakten for flyten](../domenetabell/README.md#kontrakten-for-flyten) (#272),
  språkprøven ([arkitekturforslaget, avsnitt 7](../forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#resultat-av-port-2-2026-10-09-274), #274),
  [modellforslaget](../forslag-maalmodell-2026-10-09.md) (#300) og målmodellen
  (#304), som nå ligger i [`kjerne/`](../../kjerne/) (#308).
- **B-15** serverbasert forhåndsvurdering: avgjort 09.10 ([B-15](#b-15)).
- **B-17** skriver for KOE-saker: avgjort 09.10 ([B-17](#b-17)), med merknaden
  samme dag om endringsordre og forsering.
- **B-18** serverplassering: avgjort 10.10 ([B-18](#b-18)), med
  [LV-U1](#lv-u1) om leveringen.
- **B-12, databasen:** avgjort 11.10 ([B-12, databasen](#b-12-databasen)), med
  [B-19](#b-19) om når databasen byttes. Hostingen er åpen.

> **Merknad 2026-10-10 til B-01:** etter [OV-U1](#ov-u1) trengs B-01 først i
> byggedel 4 av #309 (endringsordre og forsering), etter #310. Oppdragsgiver
> overlot 10.10 valget til utviklerne med review i byggedel 4, med alternativ (a)
> som utgangspunkt (AF-03). Beslutningsstatus er uendret: åpen.

> **Merknad til B-12, samlet ved sluttredigeringen 09.10** fra merknadene 23.09,
> 29.09 og 09.10. Beslutningsstatus er uendret: åpen.
>
> - **23.09:** IKT svarte at både Azure SQL og PostgreSQL kan brukes;
>   oppdragsgiver har foreslått PostgreSQL. Fabric kan speile fra Azure
>   PostgreSQL (versjon 14–18, ikke Burstable-nivå). Speiles basen, må interne
>   notater holdes utenfor speilingen eller skjermes der
>   ([vurderingen av Power Platform](../vurdering-power-platform-2026-09-17.md),
>   del 5). Opplysningene om Fabric er ikke kontrollert i denne planen.
> - **29.09:** oppdragsgiver opplyste at en SQL Database igjen er aktuell, av
>   kostnadsgrunner. Det er antatt at det menes Azure SQL Database. Kostnad er
>   en konkret grunn i anbefalingens forstand. Hva sammenlikningen bygger på, er
>   ikke kjent: nivå, speiling til Fabric, og om engangskostnaden ved et nytt
>   datalag er med ([#78](https://github.com/khjohns/endringsmeldinger/issues/78)).
>   PostgreSQL-spesifikt er `lib/db`, `repositories/postgres/` og
>   databasetestene, migrasjonene med databasefunksjoner og triggere, og
>   mekanismen i B-02 alternativ C. Domenet, rutene, grensesnittene mot lagrene
>   og den logiske datamodellen avhenger ikke av valget (L 29.09). To rader i
>   3.1 bygger på PostgreSQL: «PostgreSQL over direkte tilkobling» og
>   «Foreløpig mål er Azure Database for PostgreSQL». Delen om direkte tilkobling
>   framfor PostgREST gjelder også Azure SQL Database; delen om PostgreSQL må
>   tas opp igjen hvis B-12 lander på Azure SQL. Ikke undersøkt: hvordan
>   alternativ C lar seg uttrykke i Azure SQL, særlig kontekst som bare gjelder
>   transaksjonen (`SESSION_CONTEXT` gjelder sesjonen, og akseptkriteriet i F0b
>   om kontekst på gjenbrukt forbindelse må da bevises på nytt), og fordelene
>   [designnotatet om inbox og outbox](../design-durable-inbox-outbox-2026-09-17.md#5-azure-sql-eller-bli-på-postgres)
>   nevner.
> - **09.10:** Supabase-prosjektet har ikke testdata og trenger ikke å brukes i
>   det videre arbeidet. Der lagring trengs, brukes lokal PostgreSQL inntil
>   videre, som testbasen. Vedtak og krav som nevner Supabase, gjelder så lenge
>   Supabase er plattformen (merknaden 23.09 i 3.1): raden «Bare
>   Catenda-innlogging» i 3.1, restansen i RV-06 og Data API-testen i F1.
> - **09.10, ved sluttredigeringen:** hvor TS-kjernen kjører på serveren, er
>   B-18. Hostingen for backend i B-12 avhenger av B-18. Et alternativ til egen
>   drift i Azure vurderes i
>   [#302](https://github.com/khjohns/endringsmeldinger/issues/302).

> **Merknad 2026-10-11 til B-01 og B-07 ([B-12, databasen](#b-12-databasen)):**
> alternativ (b) i B-01, hendelsenes `jsonb` med GIN-indeks, og tabellen med
> `SKIP LOCKED` og `pgmq` i B-07 er PostgreSQL-former. I Azure SQL svarer en
> beregnet kolonne med `JSON_VALUE` og vanlig indeks til (b)
> ([vurderingen av JSON i Azure SQL](../vurdering-json-azure-sql-2026-10-11.md), AJ-04; K 11.10),
> og en tabell hentet med `READPAST` og `UPDLOCK` til `SKIP LOCKED`
> ([designnotatet om inbox og outbox](../design-durable-inbox-outbox-2026-09-17.md#5-azure-sql-eller-bli-på-postgres); H).
> Beslutningsstatus er uendret: åpen.

> **Merknad 2026-10-11 til den samlede merknaden 09.10 om B-12, ved sluttredigeringen:**
> den samlede merknaden er skrevet før databasen ble avgjort. Punktet 29.09
> viser hva som var PostgreSQL-spesifikt da (L 29.09); siden er TS-lagringen i
> `server/` og `sprakprove/kjernelagring/` kommet til (L 11.10). Når byttet
> skjer, står i [B-19](#b-19). «Lokal PostgreSQL inntil videre» gjelder til
> datalaget for Azure SQL finnes.

<a id="b-12-merknad-2026-10-11"></a>
> **Merknad 2026-10-11 til B-12:** [RP-U1](#rp-u1) er en forutsetning for
> plattformvalget. Lagringsformen, utsagnene i egne tabeller eller ett dokument
> per brev etter designnotatet, avgjøres sammen med B-12 og senest før
> KOE-byttet skriver den første reelle hendelsen, fordi lagrede hendelser ikke
> skrives om til et nytt format ([B-10](#b-10)). Til da gjelder ett dokument
> per brev etter designnotatet (oppdragsgiver 11.10). Grunnlaget er
> [vurderingen av JSON i Azure SQL](../vurdering-json-azure-sql-2026-10-11.md)
> og sparringen i [#391](https://github.com/khjohns/endringsmeldinger/issues/391).
> Databasen er avgjort samme dag med [B-12, databasen](#b-12-databasen); hostingen er åpen.
> Lagringsformen er ikke avgjort med databasen (#395).

## 4. Funnregister

<a id="status-2026-09-18"></a>
Én linje per etablert ID. Ved overlapp arbeides saken under én ID, og de andre
viser dit. Pakkene er beskrevet i avsnitt 5. Kilden er auditen der funnet ble
gjort; senere statusendringer står i denne planen.

**Statusord:** *Lukket*, *Lukket med restanse*, *Delvis*, *Åpen*, *Avgrenset*
(vedtatt, ikke feil), *Bortfalt* (påstanden holdt ikke), *Duplikat*,
*Avvist* (rettes ikke, med begrunnelse), *Regel* (ført inn i arbeidsreglene).

### 4.1 Godkjenning og levering: AP, S, RV, SA

Kilder: [AP](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md),
[S](../audit-sikkerhetsarkitektur-2026-09-17.md),
[RV](../audit-review-astra-2026-09-17.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AP-01 | Lukket | Alternative EO-innganger. `e235412`, 17.09. Testinventarets rad med `test_stale_reserved_id_…` gjelder AP-04, ikke AP-01 | H, K 17.09 | — |
| AP-02 | Lukket | Endret fullmakt før utstedelse. `e235412` | H | — |
| AP-03 | Lukket | Sluttdato i fullmaktsgrunnlaget. `e235412`; regresjon rettet som RV-01 | H | — |
| AP-04 | Åpen, høy | Gammel opprettelse kan slette metadata til vellykket utstedelse. Samme sak som AR-06 og TST-03. Løses bare av felles transaksjon med samordnet låsing, kommandoidempotens og atomisk leveringsintensjon. En ekstra sjekk før sletting eller vern av aktiv lease er ikke nok (RTB-03) | Streng `xfail` ×2, K 22.09 (JSON-lager) | F2 |
| AP-05 | Lukket | Felles satsoppslag. `e235412` | H | — |
| S1–S10 | Fordelt | S1 → SA-01. S2 → RC-2, lukket 20.09. S3 → RV-10. S4 → SA-02/03. S5 → RV-12, F3. S6 besvart: én RPC gir atomisk flerstegsskriving. S7 lukket med SA-01 (ingen `require_supabase_auth` i produksjonskode, L 22.09). S8 → kapasitet, B-09. S9 → AR-05. S10 → AR-02, MS-02 | H, L | Se ID |
| RV-01 | Lukket | Fullmaktsgulv når grunnlaget er uberegnet | H | — |
| RV-02 | Åpen, høy | Policyretur midt i utstedelse. Samme sak som GFK-03. Løses ved at policy og pakke låses i samme kommando. «Ikke rør pakker med aktiv lease» er ikke nok alene (RTB-03) | Streng `xfail`, K 22.09 (SQLite) | F2 |
| RV-03 | Lukket med restanse | Policy nøkles på `user_id`. Restanse: policyoppføringene må få `user_id` før produksjon | H | F5 |
| RV-04 | Lukket | `forsering_respons` under godkjenningsporten | H | — |
| RV-05 | Lukket | Vedlegg krever kontraktsside | H | — |
| RV-06 | Lukket med restanse | Data API stengt for `anon` og `authenticated`. Restanse: slå av anonym innlogging og OAuth-server i Supabase-konsollet; status ikke innhentet | D 18.09 | F5 |
| RV-07 | Lukket med restanse | Lukket som klasse for forseringens lesestier 19.09 (`hent_relaterte_saker` krever `tillatte_saker`). Grensen ligger fortsatt bare i applikasjonen | H | F1 |
| RV-08 | Lukket | `actorteam` i basen (`20260920152042`) | D 20.09 | — |
| RV-09 | Lukket | Aktivitetstall etter det leseren ser. Skrivesiden i batchruta: se AUT-03 | H | — |
| RV-10 | Åpen, høy | `/api/events/batch` lagrer uten leveringsintensjon og viser «clear». Samme sak som INT-05. Ingen kjent klientforbruker (S3) | Streng `xfail`, K 22.09 | F3 |
| RV-11 | Lukket | Versjonskonflikt gir 409 | H | — |
| RV-12 | Åpen | Webhook: sammenlikning uten konstant tid (INT-01), dedupe før behandling (INT-02), døde `bcf.*`-grener (INT-03) | Se INT | H, F3 |
| RV-13 | Åpen | Rå `str(e)` og åpne driftsruter. Samme familie som CFG-03 og OBS-07 | H | H |
| RV-14 | Åpen, lav | GET-ruter som muterer godkjenningstilstand. Kravet er forbud mot skjulte domeneendringer ved lesing, ikke mot sesjonsvedlikehold og sikkerhetslogging | H | H |
| RV-15 | Lukket | Hendelsestabeller uten migrasjon: lukket med DB-01/DA-01. Viewene finnes ikke (DB-08) | D 19.–20.09 | — |
| RV-16 | Lukket | Live-tester er opt-in | H | — |
| RV-17 | Delvis | Alle 40 strenge `xfail`-markeringer i backend-testene har `raises=`; AP-04-testen fikk det i T-5 (22.09). Øvrige delpunkter er ikke kontrollert på nytt | L 22.09 (AST) | — |
| RV-18 | Åpen, lav | Dokumenthygiene. Løpende; daterte merknader ved motstrid | H | Løpende |
| RV-19 | Åpen | Pakker valideres ikke mot utstedelsesreglene | H | F2 |
| RV-20 | Åpen | EO-godkjenning avhenger av prosjektregisteret når `daily_rate` mangler | H | F2 |
| RV-21 | Lukket | Lukket med INT-04 | H | — |
| RV-22 | Lukket | Analytics slettet | H | — |
| SA-01 | Lukket | Supabase-OAuth-flaten fjernet | H | — |
| SA-02, SA-03 | Lukket | Analytics slettet | H | — |

### 4.2 Domene, tilgang, integrasjon og konfigurasjon: TFR, GFK, BR, DRF, SD, SK, DT, SP, AUT, DB, INT, FE, CFG, TS2, OBS, TST
<a id="42-gemini-sporet-1809-aut-db-tfr-gfk-int-fe-cfg-obs-tst"></a>

Etterprøvd i [vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md).
Der den omklassifiserte et funn, gjelder omklassifiseringen.
BR-01 og DRF-01–DRF-03 er ført inn 23.09 fra
[kartleggingen av frontendens domeneregler](../kartlegging-domeneregler-frontend-2026-09-23.md),
og SD-01–SD-02 fra [gjennomføringen av spor D](../gjennomforing-spor-d-2026-09-23.md),
fordi de hører til samme domenefamilie som TFR og GFK. SD-03 er ført inn 24.09
fra code-review av GFK-06. SK-01–SK-13 er ført inn 05.10 fra
[strukturkartleggingen av spor D](../kartlegging-struktur-spor-d-2026-10-05.md#5-funn). SP-01 og SP-02 er ført inn 08.10 fra
språkprøven (#274).
DT-01–DT-03 er ført inn 08.10 fra [domenetabellen](../domenetabell/README.md)
for kravversjon og aksept (#271), DT-04 samme dag fra grunnlagsdelen og
DT-05–DT-10 fra endringsordredelen, og DT-11 fra arbeidet med kontrakten (#272). **Merknad 2026-10-08:** DT-05–DT-10 rettes ikke i dagens
backend med mindre baselinen i #274 trenger det. De er krav til en ny kjerne,
og strenge `xfail` er beviset (oppdragsgiver).

Ved sluttredigeringen 09.10 er tabellen delt i domenefunnene og de øvrige,
og overskriften, som tidligere var «Gemini-sporet 18.09», er endret. Ankeret
er beholdt.

<a id="python-feil-koe"></a>

> **Merknad 2026-10-09: domenefeil i Python-koden for KOE-, EO- og
> forseringssakene rettes ikke i Python** (oppdragsgiver). Etter B-17 bygges
> TS-kjernen etter vedtakene i 3.1 og domenetabellen, ikke etter Python-koden.
> Kontraktsinnholdet i funnene går inn i #309 som rader og bevis-saker, eller i
> #310 som krav til TS-serveren. Unntak er sikkerhet og feil som hindrer test
> eller demo. Merknaden gjelder SD-02, SD-04, DRF-02, resten av SK-02 og SK-04,
> SK-05–SK-13, DT-02 og DT-04–DT-10 under, og DM-05 og DM-06 i 4.3. Den utvider
> merknaden 08.10 om DT-05–DT-10. Statusen i radene gjelder Python-koden. Et
> krav om at reproduksjonen i `backend/tests` skal bli XPASS, gjelder ikke
> disse funnene; beviset mot TS-kjernen eies av #309.

#### Domenet i KOE-, EO- og forseringssakene

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| TFR-01 | Lukket | `AVSLATT_AKSEPTERT`, 19.09 | H | — |
| TFR-02 | Lukket | `overordnet_status` ga `INGEN_AKTIVE_SPOR` for forsering og EO. Testinventarets FR-01. **Merknad 2026-09-23:** statusene er besluttet av oppdragsgiver. Forsering får aldri en lukket status, fordi TE kan oppdatere kostnader og stoppe etter BHs svar: ikke varslet `UTKAST`, varslet `VENTER_PAA_SVAR`, avslått `UNDER_FORHANDLING`, akseptert `UNDER_BEHANDLING`; stopp endrer ikke statusen. En EO er en ordre og forhandles ikke; uenighet føres i en KOE: `UTKAST`; utstedt og revidert `VENTER_PAA_SVAR`; akseptert og bestridt `LUKKET`. EO-hendelsene er unntatt fra sperren for lukkede saker. Ingen nye statusverdier | K 23.09 | — |
| TFR-03 | Lukket | Tilbaketrekking ble blokkert ved subsidiær enighet. Testinventarets FR-02. **Merknad 2026-09-23:** rettet for vederlag og frist. Et krav som bare er godkjent subsidiært (`er_subsidiaert_*`), kan trekkes; godkjenner BH grunnlaget senere, er det oppgjort. Reproduksjonen er ordinær test, med nye tester for frist og for sperren etter at grunnlaget er godkjent | K 23.09 | — |
| TFR-04 | Lukket | 0 og 0,0 ble forkastet som falsy. Testinventarets FR-03. **Merknad 2026-09-23:** rettet ved at `_copy_fields_if_present` bare hopper over `None`; parameteren `require_truthy` er fjernet, og `subsidiaer_triggers` følger samme regel. Den strenge `xfail` er gjort om til ordinær test med uendrede assertions | K 23.09 | — |
| TFR-05 | Lukket | Godkjent grunnlag ble rapportert som `UTKAST`. Testinventarets FR-04. **Merknad 2026-09-23:** oppdragsgiver valgte `UNDER_BEHANDLING` for en sak der grunnlaget er godkjent eller låst og resten ikke er sendt. To ordinære tester som låste `UTKAST` (`test_not_omforent_with_utkast_tracks` og `test_sak_oppgjort_ved_godtatt_avslag_rapporteres_ikke_som_ukjent`), er endret etter beslutningen. Et grunnlag som er trukket, eller der avslaget er godtatt, gir fortsatt `UTKAST` (SD-02) | K 23.09 | — |
| TFR-06 | Lukket | Respons på uspesifisert fristvarsel. **Merknad 2026-09-23:** reprodusert: BH kan godkjenne 10 dager på et nøytralt varsel uten krevde dager, og sporet blir `GODKJENT`. Ikke rettet, fordi en sperre må slippe gjennom innsigelse mot sen varsling (§ 5) og forespørselen (§ 33.6.2, DRF-01), og hvordan de registreres er ikke avgjort. **Avgjort 23.09** (3.1): innsigelse og forespørsel blir egne handlinger, og et svar med dager avvises til kravet er spesifisert **Merknad 2026-10-04:** rettet etter vedtaket (#62). Et svar med dager og resultat (`respons_frist`, `respons_frist_oppdatert`) avvises så lenge kravet ikke har dager (`CLAIM_SPECIFIED`, § 33.7); det gjelder også `begrunnelse_utsatt` (§ 33.6.2 femte ledd). Innsigelse mot sen varsling er den nye hendelsen `frist_innsigelse_sendt` (§ 5 tredje ledd), som setter `frist_varsel_ok=false` og verken resultat eller status. En sak med et krav uten dager gir `UNDER_BEHANDLING`, ikke `VENTER_PAA_SVAR`, og neste handling er TEs. `SporStatus` er ikke utvidet. Reproduksjonen er ordinær test. Gjennomføringen står i [notatet om nøytralt fristvarsel](../gjennomforing-noytralt-fristvarsel-2026-10-04.md). **Merknad 2026-10-05:** vedtak (oppdragsgiver) og bygget: den faste teksten etter § 33.6.2 første ledd må stå uendret i både `begrunnelse` og brevet til `frist_foresporsel_sendt`, ellers 400. Teksten ligger i `backend/constants/frist_foresporsel.json`, som frontenden også leser (#173). Et fristsvar med `har_bh_foresporsel` eller `dato_bh_foresporsel` avvises med 400; bare forespørselen setter dem (#182) | K 2026-10-04 | — |
| GFK-01 | Lukket med restanse | Gulvet verdsetter fristdager. Uten kjent sats er gulvet 0 (B-06) | H | D |
| GFK-02 | Lukket | `exposure()` ignorerte `ny_sluttdato`. **Merknad 2026-09-23:** rettet i `approval_route`: en ny sluttdato i et fristsvar gir `amount=None`, krever hele kjeden, og kjeden må dekke det som lar seg verdsette (`minimum`), som for endringsordrer. Uten dagmulktssats er atferden uendret (B-06); testen påstår bare at ruten aldri blir kortere enn kjeden. Frontendens `calculateAuthority` speiler ikke dette, men skjemaet sender ikke `ny_sluttdato`. **Avgjort 23.09** (3.1): ubegrenset fullmakt skal kunne sende alene. **Merknad 2026-09-24:** bygget. En avsender med ubegrenset fullmakt får tom rute også når beløpet ikke kan verdsettes, for fristsvar og endringsordrer, og også uten konfigurert kjede. Alle andre trenger fortsatt hele kjeden. Unntatt er en endringsordre med fristdager uten dagmulktssats: der gjelder B-06, og kjeden kreves som før. Pakker i omløp med ubegrenset avsender blir returnert ved neste avstemming, fordi ruta endres. `test_ny_sluttdato_kan_ikke_godkjennes_av_saksbehandler_alene` påstod det motsatte og er snudd etter vedtaket, som `test_ny_sluttdato_kan_sendes_alene_med_ubegrenset_fullmakt`. **Merknad 2026-10-10:** vedtaket er endret av [EO-U6](#eo-u6) (3.1) for en endringsordre som er byggherrens svar på grunnlaget i en KOE-sak. Funnstatusen er uendret | K 23.09 | — |
| GFK-03 | Duplikat | → RV-02 | — | F2 |
| GFK-04 | Avgrenset | Forsering er vedtatt utenfor godkjenningsflyten. Testen forventer støtte og feiler med `ValueError("Ugyldig vurderingstype.")`, i samsvar med avgrensningen. Ingen feilretting. **Merknad 2026-10-10:** vedtaket er endret av [FO-U6](#fo-u6) (3.1) for vederlagssvaret for forseringen. Funnstatusen er uendret | K 22.09 | — |
| GFK-05 | Åpen | TE kan generere BH-brev som PDF | Streng `xfail`, K 22.09 | H |
| GFK-06 | Lukket | Godkjent grunnlag alene verdsettes til 0 kr. **Merknad 2026-09-23:** reprodusert gjennom `ApprovalService`: en prosjektleder godkjenner ansvaret for et krav på 50 mill. alene, og pakken godkjennes ved innsending. Ikke rettet: hvordan en slik godkjenning skal verdsettes, er en fullmaktsbeslutning for byggherren. **Avgjort 23.09** (3.1): TEs krevde beløp, og hele kjeden når kravet ikke er tallfestet. **Merknad 2026-09-24:** rettet etter vedtaket og presiseringen samme dag (3.1). `exposure` verdsetter godkjent ansvar per spor av TEs krav, som `ApprovalService` leser av saken (`krav_fra_tilstand`), og setter i pakkens `authorityContext.krav`. Krav som ikke er sendt eller tallfestet, gir hele kjeden med det verdsatte som gulv. Endrer TE kravet etter at pakken er laget, returneres pakken. Krevde dager uten sats avvises som for et fristsvar (B-06 uendret). Frontendens `calculateAuthority` og `kravFraSak` speiler regelen. Særskilte krav som henger igjen i tilstanden (SD-03), gir for høy verdi. Reproduksjonen er ordinær test med strengere påstander; tre ordinære tester som godkjente ansvar uten krav, har fått trukne eller tallfestede krav i oppsettet, og to tellinger av hendelser er gjort relative | K 24.09 | — |
| BR-01 | Lukket | BHs `beregnings_resultat` lagres som sendt, også når vurderingene i samme svar gir et annet resultat. Sporstatus, `overordnet_status` og `kan_utstede_eo` følger konklusjonen: et fristsvar uten fremdriftshindring (§ 33.1) og et vederlagssvar med 0 kr, begge merket «godkjent», ga `GODKJENT`, `OMFORENT` og utstedbar EO. Reprodusert gjennom `/api/events` og godkjenningsflyten, med kontrollsak. Rettes etter B-13. **Merknad 2026-09-24:** B-13 avgjort med (2) (3.1); svaret skal avvises. `/api/events/batch` er en tredje inngang som reproduksjonene ikke dekker. **Merknad 2026-10-04:** rettet etter B-13 (#63). Regelmodulen `backend/regler/` regner ut resultat, beløp, dager og subsidiært standpunkt, og forretningsreglene sammenlikner med klientens verdier for alle tre inngangene. Et svar med annet resultat avvises med `RESULT_MISMATCH` og serverens verdi, et ufullstendig svar med `ASSESSMENT_INVALID`, og en annen `regelversjon` med `RULE_VERSION`. Er verdiene like, lagres serverens. Regelversjonen lagres i hendelsen og kontrolleres på nytt ved `publish`. CI-vakten `regelversjon.yml` krever at den økes når `src/lib/domain/` endres. Fullmakten regnes av modulens tall. Arbeidsvalgene 04.10 står i #63. De fire reproduksjonene er ordinære tester, og batchruta har egne | K 2026-10-04 | D |
| DRF-01 | Lukket | BHs forespørsel etter § 33.6.2 kan ikke sendes fra skjemaet. Frontenden sender `send_foresporsel`, modellen kjenner bare `har_bh_foresporsel`, og validatoren avviser svaret med 400. Må løses sammen med TFR-06. **Avgjort 23.09** (3.1): forespørselen blir en egen handling som ikke gjør sporet avslått **Merknad 2026-10-04:** rettet etter vedtaket (#62). Forespørselen er den nye hendelsen `frist_foresporsel_sendt` med påkrevd brev (§ 33.6.2 første ledd) og valgfri svarfrist. Den setter `har_bh_foresporsel` og verken resultat eller status, og åpner ikke forsering. Innsigelse og forespørsel binder ikke byggherren og sendes uten intern godkjenning (oppdragsgiver 2026-10-04). Skjemaet sender ikke lenger `send_foresporsel`; BH får eget skjema (`FristVarselForm`) for et krav uten dager. Reproduksjonen er ordinær test med payloaden skjemaet nå sender; assertionene er uendret | K 2026-10-04 | — |
| DRF-02 | Åpen, lav | Felt med rettslig innhold fjernes uten feil ved parsing: `dager_siden_varsel` (§ 32.3), `ep_justering_varslet_i_tide` (§ 34.3.3), `er_svar_pa_foresporsel` (§ 33.6.2). Latent: skjemaene fyller dem ikke i dag | K 23.09 (parser), L | D |
| DRF-03 | Lukket | TEs varsel om justerte enhetspriser (§ 34.3.3) lagres med `dato_sendt` lik oppdagelsesdatoen, ikke sendedatoen. **Merknad 2026-09-29:** rettet etter vedtaket samme dag (3.1). Tidslinjen setter `justert_ep_varsel` av hendelsens `tidsstempel` i norsk tid når metoden er enhetspriser og TE krever justering, og fjerner det når kravet om justering tas ut. `validate_vederlag_event` avviser en dato fra klienten, også i et rent varsel; skjemaet sender den ikke lenger. Hendelser som alt bærer en klientdato, projiseres med serverens dato. **Merknad 2026-10-10:** vedtaket er endret av [VS-U8](#vs-u8) (3.1) for et varsel sendt utenfor appen og registrert i den. Funnstatusen er uendret | K 29.09 | — |
| SD-01 | Lukket | Et nytt vederlags- eller fristsvar uten subsidiært standpunkt lar standpunktet fra forrige svar stå i tilstanden, og frontenden viser det. Journalen og brevet er riktige. Ført inn 23.09 fra [gjennomføringen av spor D](../gjennomforing-spor-d-2026-09-23.md#sd-01-subsidiært-standpunkt-fra-forrige-svar). **Merknad 2026-09-29:** rettet. Et svar med `beregnings_resultat` er fullt og erstatter hele det subsidiære standpunktet, også når skjemaet reviderer med `original_respons_id`; en oppdatering uten resultat endrer bare det den sender. Reproduksjonen er ordinær test, med egne tester for fristsporet, revidert svar og oppdatering uten resultat. Andre svarfelt med samme feil er SD-04 | K 29.09 | — |
| SD-02 | Åpen, lav | En sak der grunnlaget er avsluttet uten krav (trukket, eller avslaget godtatt) før andre krav er sendt, vises som `UTKAST`. Ført inn 23.09 fra [gjennomføringen av spor D](../gjennomforing-spor-d-2026-09-23.md#sd-02-avsluttet-grunnlag-vises-som-utkast) **Merknad 2026-10-05:** godtatt avslag er rettet med vedtaket om #213 (`LUKKET_AVSLATT`); trukket grunnlag gjenstår. **Merknad 2026-10-08:** gjelder også når vederlaget er sendt og trukket med grunnlaget, mens fristen ikke er sendt (rad GR-10 i [domenetabellen](../domenetabell/README.md)). Mens saken står som `UTKAST`, godtas også en oppdatering av det trukne grunnlaget (GR-12); `CASE_NOT_CLOSED` avviser den først når saken er `LUKKET_TRUKKET` | Streng `xfail` for trukket, K 05.10 | D |
| SD-03 | Lukket | Et oppdatert vederlagskrav uten særskilte krav (§ 34.1.3) lar de gamle stå i tilstanden: `_handle_vederlag` kopierer `saerskilt_krav` bare når feltet er satt, og skjemaet sender `null` når TE fjerner dem. Fullmakten for godkjent ansvar teller dem med (GFK-06), så verdien blir for høy og ruten lengre, ikke kortere. Funnet i code-review av GFK-06 24.09. **Merknad 2026-09-29:** rettet. `saerskilt_krav` settes alltid, som `belop_direkte`; skjemaet for revidert krav sender alltid de særskilte kravene. Reproduksjonen er ordinær test | K 29.09 | — |
| SD-04 | Åpen, lav | Et nytt fullt BH-svar lar andre svarfelt fra forrige svar stå når de ikke sendes, som SD-01 gjorde for det subsidiære standpunktet. Kjørt for `ny_sluttdato`, som står igjen etter et revidert avslag. Lest for `frist_for_spesifisering`, `bh_metode`, `varsel_justert_ep_ok`, `begrunnelse_varsel` og `bh_begrunnelse`. Noen felt er historiske handlinger og skal stå, som `har_bh_foresporsel` og `dato_bh_foresporsel` (§ 33.6.2). Funnet i code-review av SD-01 29.09 | Streng `xfail`, K 29.09 | D |
| SK-01 | Lukket | TE kan godta byggherrens svar om at grunnlaget er prekludert etter § 32.2. Grunnlaget blir `GODKJENT` uten låsing, saken `OMFORENT` og lukket, og EO kan utstedes for beløp og dager som bare er godkjent subsidiært. Før aksepten gir `neste_handling` «Ingen ventende handlinger» mens saken er under forhandling (SK-05). Tiltenkt atferd er vedtatt 05.10 (3.1). **Merknad 2026-10-09:** rettet i `6e4c2d8` (#297, #274). En godtatt preklusjon er et godtatt avslag: grunnlaget blir `AVSLATT_AKSEPTERT`, saken `LUKKET_AVSLATT`, og `kan_utstede_eo` er `false`. Reproduksjonen `test_godtatt_preklusjon_etter_32_2_er_godtatt_avslag` er ordinær test med uendrede assertions. `neste_handling` før aksepten er SK-05 | K 2026-10-09 | — |
| SK-02 | Delvis | Et oppdatert vederlags- eller fristkrav åpner ikke sporet når forrige svar var godkjent, godtatt eller trukket. Status og aksept fra forrige svar blir stående; et fullt godkjent krav på 100 000 kr som økes til 250 000 kr, står som `GODKJENT`, og saken blir `OMFORENT` med utstedbar EO når fristen godkjennes. Tiltenkt atferd er vedtatt 05.10 (3.1). **Merknad 2026-10-09:** rettet for godkjent og godtatt svar i `6e4c2d8` (#297, #274). En ny kravversjon åpner sporet, og en aksept av forrige svar faller. De to reproduksjonene for vederlag er ordinære tester med uendrede assertions: `test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar` og `test_oppdatert_krav_etter_aksept_opphever_aksepten`. Fristsporet er kjørt i økta, ikke lagt inn som test. Det trukne kravet gjenstår: en oppdatering av et trukket krav godtas, og sporet står som `TRUKKET` (streng `xfail` `test_trukket_krav_kan_ikke_oppdateres`, rad KA-14 i [domenetabellen](../domenetabell/README.md), #256) **Merknad 2026-10-09:** [KA-U7](#ka-u7) endrer tiltenkt atferd for spor med enighet: der avvises en ny kravversjon, og enigheten står. Rettingen i `6e4c2d8` følger vedtaket 05.10 og rettes ikke i Python (merknaden 09.10 over) | Streng `xfail` for trukket, K 2026-10-09 | D |
| SK-03 | Lukket | Byggherren kan revidere et svar TE har godtatt. `te_akseptert` blir stående, så TE kan ikke ta stilling til det nye svaret. Tiltenkt atferd er vedtatt 05.10 (3.1). **Merknad 2026-10-09:** rettet i `6e4c2d8` (#297, #274). Regelen `RESPONSE_ACCEPTED` avviser en revisjon av et godtatt svar, også mens grunnlaget venter (GR-U7, rad GR-23). Reproduksjonen `test_byggherren_kan_ikke_revidere_et_godtatt_svar` er ordinær test med kontrollsaken. At et fullt godkjent svar også er låst, hører til GR-U7 og #298, ikke SK-03 | K 2026-10-09 | — |
| SK-04 | Delvis | Frafall (§ 32.3 c) gir grunnlaget status `TRUKKET`, en status som ellers betyr at TE har trukket kravet. Godtar TE avslagene på vederlag og frist etterpå, blir samlet status `UKJENT`. Mengdene for «inaktiv» og «ferdig» spor er ulike i kaskadene, `kan_utstede_eo`, reaktiv EO og aksept. **Merknad 2026-10-09:** `UKJENT` er rettet i `4cdd012` (#297, #274). Frafalt grunnlag regnes som avklart (`GrunnlagTilstand.avklart`), og saken blir `OMFORENT` når avslagene er godtatt (GR-U3, rad GR-15). `test_frafall_med_godtatte_avslag_gir_ikke_ukjent` er ordinær test med uendret assertion. Gjenstår: grunnlaget har fortsatt status `TRUKKET`, ikke `FRAFALT` etter vedtaket 05.10 (rad GR-13, #257), og mengdene er ikke samlet ett sted | Streng `xfail` for status (GR-13), K 2026-10-09 | D |
| SK-05 | Åpen, lav | `neste_handling` håndterer ikke et grunnlag i `UNDER_FORHANDLING` (§ 32.2-preklusjon). Ført under issuet for SK-01 | K 2026-10-05 | D |
| SK-06 | Åpen, lav | Forseringskandidater og avslåtte dager regnes av `frist.bh_resultat == "avslatt"` alene, fire steder i `forsering_service.py`, også `valider_grunnlag_fortsatt_gyldig`, som melder «BH har endret standpunkt» når dagene er godkjent subsidiært. Et fristkrav som er prinsipalt avslått gjennom ansvarsgrunnlaget, men subsidiært godkjent, er ikke kandidat; delvis avslag teller ikke **Merknad 2026-10-09:** tiltenkt atferd er [FO-U1](#fo-u1) (3.1) | L | D |
| SK-07 | Åpen, lav | Visninger kaller sporets eget resultat prinsipalt når hele svaret er subsidiært: resultatboksen i `FristForm` og `VederlagForm` («godkjenner kravet prinsipalt»), og summen «Prinsipalt godkjent» i prosjektoversikten, som summerer `cached_sum_godkjent` | L | D |
| SK-08 | Åpen, lav | `ActionBar` sammenlikner `frist.krevd_dager` med `undefined`, men API-et sender `null`. Et fristspor uten innsending vises som «Varslet – ikke spesifisert», og TE får «Spesifiser krav» i stedet for «Send fristvarsel». Samme mønster som #184 | L | D |
| SK-09 | Åpen, lav | Typen `OverordnetStatus` i frontenden har `SENDT`, som backend aldri lager, og mangler `INGEN_AKTIVE_SPOR` og `UKJENT`, som backend kan lage. De uttømmende kartene over samlet status er derfor uttømmende over feil mengde | L | D |
| SK-10 | Åpen, lav | Reproduksjonen av TST-04 leter etter `backend/docs/openapi.yaml` relativt til `backend/`, der pytest kjører. Den kan ikke bli XPASS selv om spesifikasjonen lages | L | D |
| SK-11 | Åpen, lav | Svarmodellene og validatorene har felt uten virkning: `bh_metode` fylles fra `vederlagsmetode`, som ingen klient sender, mens `oensket_metode` lagres uten å projiseres; `akseptert_kategori`, `ep_justering_akseptert` og `frist_for_spesifikasjon` leses ikke av noen; `validate_vederlag_event` krever varsel ved `inkluderer_rigg_drift` og `inkluderer_produktivitetstap`, som ingen modell har | L | D |
| SK-12 | Åpen, lav | Et senere krav fra TE kan flytte datoen for et varsel som alt er registrert: `_handle_frist` og `_handle_vederlag` overskriver `frist_varsel`, `rigg_drift_varsel` og `produktivitetstap_varsel` med hvert nytt krav, med mindre et konsekvensvarsel er registrert. Kjørt: § 33.4-varselet 02.09 ble 01.08 og 01.07. Journalen beholder datoen, men skjema, visning og brev leser tilstanden. Tiltenkt atferd er vedtatt 05.10 (3.1) | Streng `xfail` med kontrollsak, K 2026-10-05 | D |
| SK-13 | Åpen, lav | Forseringsrutene for byggherrens svar, stopp og kostnader returnerer tilstanden utenom `public_state` (`_get_updated_state`). Om det har betydning for skjermingen, er ikke vurdert; notatene ligger ikke lenger i journalen (MS-05) | L | D |
| DT-01 | Lukket | TE kan godta byggherrens svar på en tidligere kravversjon. Etter et delvis godkjent svar på 60 000 kr og en ny kravversjon på 80 000 kr godtas aksepten, sporet blir `GODKJENT` og 60 000 kr står som avtalt, uten at byggherren har svart på 80 000 kr. Aksepten (`te_aksepterer_respons`) peker ikke på noe svar, og `BH_HAS_RESPONDED` ser bare at et svar finnes. Frontenden sender ikke aksept i dag; ruta tar imot den. Tiltenkt atferd er KA-U1 (3.1). **Merknad 2026-10-08:** rettet (#272, KT-U1). Aksepten viser til svaret, og `CURRENT_RESPONSE` avviser et svar på en tidligere kravversjon, et revidert svar og et svar i en annen sak eller et annet spor | Ordinær test, K 2026-10-08 | D |
| DT-02 | Åpen, lav | `claims()` i `approval_service.py` regner enhver hendelse som begynner med sporets navn som krav, også et frittstående konsekvensvarsel på vederlag, trekk og byggherrens innsigelse og forespørsel. Projeksjonen og frontenden gjør det ikke. Etter et konsekvensvarsel på et spesifisert vederlagskrav avviser `validate_items` begge mulige `claimId`: kravet gir «Kravet er endret», varselet gir «Svaret må gjelde gjeldende krav». Byggherren kan da ikke sende vederlagssvar gjennom godkjenningsflyten før TE sender en ny kravversjon. For innsigelse og forespørsel er avviket ikke nåbart, fordi fristsporet da ikke kan besvares. Tiltenkt atferd er KA-U2 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-03 | Lukket | `FristResponsData.spesifisert_krav_ok` har standardverdien `true`. Et fristsvar der spørsmålet ikke gjelder, lagres med `"spesifisert_krav_ok": true` i journalen, og `FristOverview` viser «Fremsatt i tide». Kjørt for svar på forespørselen etter § 33.6.2 annet ledd a, der byggherren etter fjerde ledd ikke kan påberope § 33.6.1. Lest for et oppdatert krav med dager der `varsel_type` ikke er «spesifisert»; validatoren for oppdateringer sjekker ikke typen. Regelmodulen ser bort fra standardverdien (`Fristvurdering.fra_data`), så resultatet påvirkes ikke. Journalen er append-only, så verdien kan ikke rettes i ettertid. `vilkar_oppfylt` har samme standardverdi, men kreves alltid av validatoren. Tiltenkt atferd er KA-U4 (3.1). **Merknad 2026-10-08:** rettet (#272). Feltet har ingen standardverdi; et svar uten vurderingen lagres uten feltet, og tilstanden har `null`. `FristOverview` viser ikke en vurdering som er `null`; før ble den vist som «For sent», også for `frist_varsel_ok`. Hendelser lagret før står | Ordinær test mot testbasen, K 2026-10-08 | D |
| DT-04 | Åpen, lav | En ny kravversjon av grunnlaget med uendret underkategori åpner ikke sporet. Etter et avslag blir grunnlaget `SENDT`, men svaret står i tilstanden (`bh_resultat`, `respons_event_id`), og TE kan godta det: saken blir `LUKKET_AVSLATT` uten at byggherren har svart på versjonen. Etter preklusjon etter § 32.2 blir grunnlaget stående i `UNDER_FORHANDLING`. `_handle_grunnlag` lar bare endret underkategori (#215) og status `AVSLATT` gi nytt svar. Tiltenkt atferd er GR-U1 (3.1). **Merknad 2026-10-08:** aksepten av forrige svar avvises nå (#272, rad GR-06). At svaret står i tilstanden og grunnlaget i `UNDER_FORHANDLING` etter preklusjon, er fortsatt åpent (GR-04, GR-05) | Streng `xfail`, K 2026-10-08 | D |
| DT-11 | Lukket | TE kan godta et vederlags- eller fristsvar som er subsidiært til nytt svar mens grunnlaget venter på nytt svar. Vederlaget blir `GODKJENT` med byggherrens subsidiære beløp, og godkjenner byggherren deretter grunnlaget, blir saken `OMFORENT` med utstedbar EO uten at byggherren har sett vederlaget igjen. Kjørt 08.10 på grenen til #293: subsidiært svar på 60 000 kr, ny grunnlagsversjon med endret underkategori, aksept, grunnlaget godkjent. Uten aksepten står saken `UNDER_FORHANDLING`. Tiltenkt atferd var GR-U6 (3.1). **Merknad 2026-10-08:** ikke en feil. GR-U7 erstatter GR-U6: forløpet er enighet om beløpet, som får virkning når grunnlaget godkjennes (rad GR-21) | Ordinær test, K 2026-10-08 | D |
| DT-05 | Åpen, middels | En endringsordre kan utstedes i en KOE-sak (`eo_utstedt`), og `_close_spor_for_reactive_eo` skriver sporene om. Den kan utstedes flere ganger, fordi `kan_utstede_eo` blir stående `true`. Beløp og dager i endringsordren erstatter de avtalte, også med `None` når endringsordren ikke har beløp. Et godtatt avslag og et spor TE aldri har sendt, blir `GODKJENT`. TE kan ikke godta eller bestride den (`IS_EO_CASE`). Projeksjonen leser også toppnivåfeltene i DM-06. Mengden behandleren hopper over (`IKKE_RELEVANT`, `TRUKKET`), er en annen enn den `kan_utstede_eo` hopper over (`IKKE_RELEVANT`, `UTKAST`). Frontenden og godkjenningskommandoen bruker ikke veien, og med godkjenningspolicy stopper `public_event_block_reason` den. Tiltenkt atferd er EO-U1 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-06 | Åpen, lav | `kan_utstede_eo` følger ikke rollupen. Godkjent grunnlag der vederlag og frist ikke er sendt, gir `true` mens saken er `UNDER_BEHANDLING`, og det samme gjør godkjent vederlag der fristen ikke er sendt. Kandidatregelen for EO-saker (`_is_agreed_koe`) krever i tillegg et godkjent vederlag eller en godkjent frist, så de to er uenige. Tiltenkt atferd er EO-U2 (3.1). Samme mønster som mengdene i SK-04 | Streng `xfail`, K 2026-10-08 | D |
| DT-07 | Åpen, lav | En KOE-sak som inngår i en EO-sak, viser det ikke. `kan_utstede_eo` er fortsatt `true`, og `neste_handling` ber byggherren utstede en endringsordre. Projeksjonen ser bare sakens egne hendelser, og tilknytningen står i EO-saken. Kandidatregelen i `EndringsordreService` leser EO-sakene (`_linked_koe_ids`). Tiltenkt atferd er EO-U3 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-08 | Åpen, lav | Gjennom `/api/events` kan byggherren knytte en KOE-sak til en EO-sak uten kandidatkontrollen. `eo_koe_lagt_til` har bare regelen `IS_EO_CASE`, så en KOE-sak som ikke er omforent, eller som alt inngår i en annen EO-sak, godtas. Kontrollen ligger i `EndringsordreService` og gjelder bare `/api/endringsordre`. Lesingen er avgrenset av `cases_in_project` (RV-07), så prosjektgrensen holder. Tiltenkt atferd er EO-U2 og EO-U3 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-09 | Åpen, lav | EO-sakens livsløp er løsere enn vedtatt. `eo_utstedt` i en EO-sak har ingen regel og godtas på nytt, også etter aksept: endringsordren får status `UTSTEDT` igjen, nye beløp, og TEs aksept forsvinner fra tilstanden. `EO_IS_ISSUED` godtar revisjon uten bestridelse, to bestridelser og aksept etter bestridelse. `eo_koe_lagt_til` og `eo_koe_fjernet` godtas etter utstedelse og aksept gjennom `/api/events`, mens `legg_til_koe` og `fjern_koe` krever `UTKAST`. Tjenesten skriver opprettelse og utstedelse i samme transaksjon, så de to kan i praksis bare brukes gjennom `/api/events`. Tiltenkt atferd er EO-U4 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-10 | Åpen, lav | En utstedelse uten KOE-liste sletter KOE-tilknytningen. `_handle_eo_utstedt` bygger `endringsordre_data` på nytt av hendelsen, så tilknytningen fra `eo_opprettet` og `eo_koe_lagt_til` forsvinner når `eo_utstedt` ikke gjentar den. `opprett_endringsordresak` gjentar den alltid; `/api/events` krever det ikke. Om en tom liste i utstedelsen betyr «ingen KOE-saker» eller «ikke oppgitt», er ikke vedtatt; tabellen bruker det siste som arbeidshypotese (rad EO-24) | Streng `xfail`, K 2026-10-08 | D |
| SP-01 | Åpen, lav | Klientspeilet runder beløp annerledes enn serveren. `tilOre` i `src/lib/domain/vederlagDomain.ts` runder via `toPrecision(15)`, mens `regler.belop` går via `str()` og `Decimal`. 1234567,8949999998 blir 1234567,90 i klienten og 1234567,89 på serveren, og fra omtrent 1e13 kr mister klienten øre (10000000000000,006 blir 10000000000000,00 mot ,01). Serveren avviser da svaret med `RESULT_MISMATCH`. Skjemaet tar bare hele kroner fra byggherren, men TEs krav kan ha desimaler. Funnet i språkprøven (#274), der TS-kjernen regner i hele øre med samme semantikk som `Decimal` | K 2026-10-08 (formelen kjørt med Node; tabellen i `sprakprove/grensetilfeller.json` holder for `regler.belop`) | D |
| SP-03 | Åpen, lav | Lagret `data` avhenger av hvem som skrev hendelsen. Pydantic-modellene lagrer standardverdier og beregnede felt som klienten ikke sendte: `vedlegg_ids`, `varsler`, `er_estimat`, `krever_justert_ep`, `varsel_type` og `varslet_for_oppstart`, og i vederlagskravet `krevd_belop` og `netto_belop` (`computed_field`). Kontrakten (`rad`) beskriver dem ikke, og TS-serveren i språkprøven lagrer dem ikke. Begge leser tilstanden likt, men raden i den append-only journalen blir ulik, og beregnede beløp lagres ved siden av kravet de er regnet av. Funnet i språkprøven (#274) | K 2026-10-09 (`BARE_PYTHON` i `tests/test_database/test_sprakprove_ts_server.py`) | D |
| SP-04 | Åpen, lav | Projeksjonen knytter et svar til kravet som er gjeldende når svaret leses, ikke til kravet svaret viser til. Innsendingen kontrollerer referansen, men lesingen bruker den ikke: `bh_respondert_versjon` regnes av antall kravversjoner i `services/timeline_service.py`, og `anvend` i TS-kjernen bruker gjeldende krav. Med én kontrollert skriver gir det samme resultat. En eldre eller fremmed rad med en annen referanse knyttes til feil krav. Gjelder begge implementasjoner. Funnet i språkprøven (#274), og tas i gjennomgangen av målmodellen (#300) | L 2026-10-09 (`services/timeline_service.py`, `sprakprove/kjerne/sak.ts`) | D |
| SP-02 | Åpen, lav | `dato_sendt` i et varsel valideres ikke som dato. `VarselInfo.dato_sendt` er en fri tekst, og validatorene sjekker bare at den finnes. Kontrakten (`kontrakt.json`, `varselinfo`) sier `YYYY-MM-DD`, men har ikke noe mønster. En ugyldig dato som 2026-02-30 lagres i journalen og kan ikke rettes (SK-12). Funnet i språkprøven (#274) | L 2026-10-08 (`models/events.py`, `api/validators.py`) | D |

#### Tilgang, database, integrasjon, frontend, konfigurasjon og test

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AUT-01, AUT-02 | Lukket | Prosjektgrense i forseringens lesestier, 19.09 | H | — |
| AUT-03 | Lukket for batchruta | Batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH` før skriving (`783c64d`). Den strenge `xfail`, som forventet 201, er erstattet av en ordinær test: avvisningen skjer, og ingenting skrives, heller ikke `last_event_at` (T-1, 22.09). Påstanden gjelder bare batchruta | K 22.09, L | F0 |
| AUT-04 | Åpen | CSV-metadatalageret mangler `list_by_sakstype`. Samme mekanisme som TST-01 | Streng `xfail` (statisk) | H |
| AUT-05 | Åpen, lav | Kandidatliste for forsering uten prosjektfilter på Catenda-topics. Ikke kontrollert på nytt | H | F1 |
| AUT-06 | Lukket | `hent_relaterte_saker` krever `tillatte_saker` | H | — |
| DB-01 | Lukket | Repoet bygger basen fra tom (DA-01) | D 20.09 | — |
| DB-02 | Lukket | Kolonnene fantes i basen; migrasjonene rettet | D 20.09 | — |
| DB-03 | Lukket | `DEFAULT 'oslobygg'` droppet (`20260920053427`). Katalogtest i `tests/test_database/` erstatter reproduksjonen som leste en slettet fil (T-2, 22.09) | K 22.09 (PG 17 lokalt), D 22.09 | — |
| DB-04 | Delvis | `prosjekt_id` lagt til (5a). Fremmednøkler mangler fortsatt i migrasjonskjeden. Testen leser bare den første fila (T-2) | L 22.09 | B-01, F2 |
| DB-05 | Åpen, besluttet | `viewer` skal finnes. Ikke bygget | Streng `xfail` (statisk) | F1 |
| DB-06 | Lukket | `prosjekt_id` på journalen (5a) | D 20.09 | — |
| DB-07 | Lukket | `properties jsonb` på `sak_bim_links` finnes i basen og bygges av `20260920160000`. Katalogtest i `tests/test_database/` erstatter reproduksjonen som bare leste `20260911073800` (T-2, 22.09). Testinventaret førte funnet som DB-06 | K 22.09 (PG 17 lokalt), D 22.09 | — |
| DB-08 | Bortfalt | Viewene finnes ikke | D 19.09 | — |
| INT-01 | Åpen | Webhookhemmelighet uten konstant tid; sti i logg | Streng `xfail` (statisk) | H |
| INT-02 | Åpen, høy | Webhookfeil gir 200 og reservert duplikatnøkkel; retry tapes | Streng `xfail`, K 22.09 | F3 |
| INT-03 | Åpen | Validatoren avviser `bcf.*` | Streng `xfail`, K 22.09 | F3 |
| INT-04 | Lukket | Siden utledes av lagmedlemskap | H | — |
| INT-05 | Duplikat | → RV-10 | — | F3 |
| INT-06 | Åpen | Global `.env` overstyrer sakens Catenda-prosjekt | Streng `xfail`, K 22.09 | F2, F3 |
| INT-07 | Lukket | Kommentargeneratoren kjente ikke `standard`. **Merknad 2026-09-23:** oppslagene er nøklet på `SaksType`, og `koe` er fjernet; ingen kaller sender det. Reproduksjonen er ordinær test, og forsering og endringsordre er dekket. Samme nøkkel står i tittelen i `reportlab_pdf_generator`, men der gir reserveteksten nesten samme tittel. **Merknad 2026-10-03:** generatoren er slettet (#140) | K 23.09 | — |
| FE-01 | Lukket | `LetterPreviewModal` sender prosjekt, CSRF og credentials (20.09) | H | — |
| FE-02 | Åpen, middels | `/api/cases/<sak_id>/context` gir ikke autorisert rolle. Serveren holder (19.09). Testen som testinventaret førte som FE-01, feilet på 403 i sitt eget oppsett. Oppsettet er rettet (T-3, 22.09); den strenge `xfail` feiler nå på målassertionen om rolle | K 22.09 (testoppsett) | H |
| FE-03 | Åpen | Svelte-skjemafelt reagerer ikke på nye props | H | H |
| FE-04 | Lukket | Med GFK-01 | H | — |
| FE-05 | Lukket | `activeProjectId` er `null` ved ukjent prosjekt (20.09) | H | — |
| FE-06 | Inkonklusiv | Påstand om interpolering i `LetterHtmlPreview.svelte` er verken bekreftet eller avkreftet | H | H |
| CFG-01 | Åpen | Flask starter i produksjon med standardnøkkel | Streng `xfail`, K 22.09 | H |
| CFG-02 | Åpen | `CSRF_SECRET` brukes ikke. Testinventaret førte som CFG-03 | Streng `xfail` (statisk) | H |
| CFG-03 | Duplikat | → RV-13. Testinventaret førte som CFG-04 | Streng `xfail`, K 22.09 | H |
| CFG-04 | Åpen | Usatt `APP_ENV` gir ulik tolkning. Testinventaret førte som CFG-02 | Streng `xfail`, K 22.09 | H |
| CFG-05, CFG-06, CFG-07 | Åpen | Supabase-nøkler utenfor `Settings`; død `CORS_ORIGINS`; relativ `env_file` | Streng `xfail` | H |
| TS2-01 | Åpen, middels | Usatt `EVENT_STORE_BACKEND` gir JSON-lageret på lokal disk uten advarsel; metadata tilsvarende CSV. Banneret viser «csv». Ført inn 22.09 fra [TST-02-notatet](../gjennomforing-tst02-2026-09-22.md#ts2-01--json-lageret-er-standardverdien) | L 22.09 | H |
| OBS-01, OBS-02 | Åpen, høy | Ett funn (19.09): ingen forretningshendelse revisjonslogges, og 403-avvisninger når ikke feilhåndtereren | Streng `xfail`, K 22.09 | F1 |
| OBS-03 | Lukket | Latent: `ce_time` kuttet offset. **Merknad 2026-09-23:** reprodusert på enhetsnivå med `+02:00` og `-05:00` (den siste ga den ugyldige strengen `…-05:00Z`); ingen kjørested gir i dag annet enn UTC. Rettet med `astimezone(UTC)`, naiv tid regnes fortsatt som UTC. Aktuelt i F0b, der `timestamptz` kommer tilbake i øktens tidssone | K 23.09 | — |
| OBS-04 | Lukket | `ce_source` skriver `unknown` (20.09) | H | — |
| OBS-05 | Åpen | Hendelser mangler korrelasjons-ID. Testinventaret førte som OBS-04 | Streng `xfail` (statisk) | F1 |
| OBS-06 | Åpen | `X-Request-ID` uten validering; 32-bits server-ID. Testinventaret førte som OBS-01 | Streng `xfail`, K 22.09 | H |
| OBS-07 | Åpen | Rå unntakstekst ved `app.debug`. Samme familie som RV-13. Testinventaret førte som OBS-05 | Streng `xfail`, K 22.09 | H |
| TST-01 | Åpen | Samme mekanisme som AUT-04. Mangel på integrasjonstester dekkes i F0 | Streng `xfail` (statisk) | F0, H |
| TST-02 | Lukket | Samtidig opprettelse i `JsonFileEventRepository`, rettet 22.09: saksfilen skrives til en unik midlertidig fil og publiseres med `os.link`, som feiler når filen finnes. To samtidige opprettelser gir én sak og én `ConcurrencyError`, også når begge har passert eksistenssjekken eller skrevet ferdig. Gjelder bare JSON-lageret; Supabase-lageret er ikke kjørt. Samme sak som KR-15 | K 22.09, L | — |
| TST-03 | Duplikat | → AP-04 | — | F2 |
| TST-04 | Åpen | Ingen OpenAPI-kontrakt mellom frontend og backend | Streng `xfail` (statisk) | H |
| TST-05 | Åpen | EO-opprettelse svelger Catenda-feil uten outbox | Streng `xfail` (statisk) | F2 |
| TST-06 | Åpen | Reservelagrene avviker fra Supabase-lagrene | Streng `xfail` (statisk) | H |
| TST-07 | Åpen | 58 av 87 Svelte-komponenter uten test (tall fra 18.09) | Streng `xfail` (statisk) | H |

### 4.3 Arkitektur og database: AR, DA, MS

Kilder: [AR](../arkitekturvurdering-2026-09-19.md),
[DA](../audit-databasearkitektur-2026-09-20.md),
[MS](../design-maalskjema-database-2026-09-20.md),
DM ([1a](../gjennomforing-spor-m-1a-2026-09-29.md#2-funn),
[1b](../gjennomforing-spor-m-1b-2026-09-29.md#2-funn); spor M, fra 29.09).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AR-01 | Åpen, høy | Ingen policy uttrykker prosjekt-, side- eller teamgrense. Samme sak som DA-11 | D 20.09 | F1 |
| AR-02 | Åpen, høy | Journalen er ikke append-only i basen. → MS-02 | D 19.09 | F1 |
| AR-03 | Åpen, kritisk | Godkjenningspakker og andre lagre ligger i lokal SQLite på efemer disk | L 22.09 | F1, F2, F3 |
| AR-04 | Åpen | Domenemodellen finnes i Python og TypeScript | H | F4 |
| AR-05 | Lukket | CI med PostgreSQL 17-jobb (PR #33). Regelsettet `main` krever de fire jobbene, har ingen bypass og krever oppdatert gren (lest med GitHub-API-et 22.09) | K 22.09 | — |
| AR-06 | Duplikat | → AP-04 | — | F2 |
| AR-07 | Åpen, lav | Inert e-postpolicy på `project_memberships`. Fjernes med tabellen | D 20.09 | F1 |
| AR-08 | Åpen, lav | Seks av ni driftdetektorer feiler | H | H |
| DA-01, DA-02, DA-05, DA-06 | Lukket | 20.09 | D 20.09 | — |
| DA-03 | Lukket | Migrasjonsmappa er eneste kilde. Historikken avstemt 22.09: 23 rader, samme versjoner som filene; `db push --dry-run` er tom. Originalteksten til de slettede radene er arkivert | K 22.09 | — |
| DA-04 | Lukket i repo | Fila har basens versjon. Historikken inngår i DA-03 | D 20.09 | F0 |
| DA-07 | Korreksjon | `app_identities` er i bruk | D 20.09 | — |
| DA-08, DA-09 | Åpen | `user_groups` og `magic_links` fjernes. → MS-15 | D 20.09 | F1 |
| DA-10 | Åpen | `project_memberships` fjernes etter at `viewer` finnes i `app_project_memberships` | D 20.09 | F1 |
| DA-11 | Åpen, høy | → AR-01 | — | F1 |
| DA-12 | Lukket | Gjennomført som MS-01 | D 20.09 | — |
| DA-13 | Åpen | → B-01 | — | F2 |
| DA-14 | Åpen | `cached_*`-kolonnene → MS-06, MS-07 | — | F2 |
| DA-15 | Åpen, lav | BIM-flaten har ingen eier. P2 og P3 sier at den er relevant. Se også DM-02 i 4.6 (29.09) | — | F4 |
| MS-01 | Gjennomført | `hendelse` | D 20.09 | — |
| MS-02 | Åpen | Append-only håndhevet av basen, mot omskriving og uautorisert tilføying. Merk at `hendelse` og `notat` har fremmednøkkel til `sak_metadata` med `ON DELETE CASCADE`; kaskaden må inngå i rettighetsmodellen | L 22.09 | F1 |
| MS-03 | Delvis | `UNIQUE (sak_id, versjon)` finnes i migrasjonen. Regler for rebase ved konflikt mangler | L 22.09 | F2 |
| MS-04 | Gjennomført | `aktor_id` i journalen | D 20.09 | — |
| MS-05 | Gjennomført | `notat` utenfor journalen. Teamvern i datalaget gjenstår (AF-01) | D 21.09 | F1 |
| MS-06, MS-07 | Åpen | Register og projeksjon; én skriver i hendelsens transaksjon | L | F2 |
| MS-08 | Åpen | Revurderes (AF-03). → B-01 | — | F2 |
| MS-09 | Åpen | Erstattet som mål av AF-01 | — | F1 |
| MS-10 | Gjennomført | `projects.organisasjon_id NOT NULL` | D 20.09 | — |
| MS-11 | Åpen | Hash supplert av AF-04 | L | F2, F4 |
| MS-12 | Åpen | Prosjektkonfigurasjon inn i `projects`. Må ikke hindre frosset mål og konfigurasjonsversjon i F2 | — | F3 |
| MS-13, MS-14 | Åpen, lav | BIM som hendelser; IFC-egenskaper fryses | — | F4 |
| MS-15 | Åpen | `magic_links`, `user_groups`; `project_memberships` etter DB-05 | D 20.09 | F1 |
| DM-01 | Lukket | Åtte kolonnekommentarer (`cached_*` i `sak_metadata`) finnes i basen, men ikke i migrasjonene. Kolonnesummen fanger det ikke. Rettes i en ny migrasjon når B-12 har avgjort hvor beskrivelser skal ligge. **Merknad 2026-10-09:** basen er Supabase-prosjektet, som ikke brukes i det videre arbeidet (merknaden til B-12). Kommentarene der rettes ikke; migrasjonene er kilden | K 29.09 | Spor M, fase 4 |
| DM-03 | Åpen, lav | Migrasjonene legger inn et aktivt prosjekt `oslobygg`, og det er prosjektets eneste. Hver base bygget fra tom får det, også på en ny plattform (B-12) og for en annen virksomhet (P5). Ikke en fallback i koden. Om raden skal ut av migrasjonene, avhenger av hvordan en ny base settes opp | K 29.09 | Spor M, fase 4 |
| DM-04 | Lukket | Ruteregistertesten så bare dekoratøren `route` (sju ruter deklarert med `.get`/`.post`/`.patch` var usynlige for den), godtok `require_magic_link` og `require_entra_auth` som autentisering, og kontrollerte ikke `require_project_access`. En ny rute uten autentisering ga grønn test. Ingen eksponert rute funnet. **Merknad 2026-09-29:** rettet i testen. Den leser alle rutedekoratørene med blueprintens `url_prefix` og sammenlikner med `app.url_map`. Bare `require_auth` teller som autentisering, og bare under rutedekoratøren. `require_project_access` kreves, med fem unntak i `UTEN_PROSJEKT`. `login`, `callback` og webhooken står i `OFFENTLIGE_RUTER` med begrunnelse; webhooken sto før som autentisert gjennom `limit_webhook`, som er en rate-begrensning. Ti mutasjoner, blant dem de to fra runden, gir rød test. `require_contract_role` kontrolleres ikke | K 29.09 | — |
| DM-05 | Åpen, middels | Skjemaet for ny sak sender `sak_opprettet` som enkelthendelse til `POST /api/events`, men `require_project_access` godtar en sak uten metadata bare på `/api/events/batch`. Innsendingen gir 403 utenfor utviklingsmodus, så saker kan i dag bare opprettes fra Catenda. Oppdragsgiver 29.09: skjemaet skal virke (3.1). Tas batch-ruta i bruk, blir RV-10 aktuell. **Merknad 2026-10-09:** opprettelse av en KOE-sak er skriving i KOE-saken og hører til TS-stien (B-17); rettes ikke i Python (merknaden 09.10 i 4.2) | Streng `xfail`, K 29.09 | Spor M |
| DM-06 | Åpen, lav | Toppnivåfelt utenfor `data` lagres ikke. Projeksjonen leser `endelig_vederlag` og `endelig_frist_dager` på `eo_utstedt` når en endringsordre lukker en KOE-sak, så svaret og `sak_metadata`-cachen viser et beløp journalen ikke har. Bryter invariant 9. Latent: skjermbildene sender ikke feltene. Motsatt for `sak_opprettet`: en `data` fra klienten lagres ordrett, med ukjente nøkler, og skjemaet for ny sak sender den slik. **Merknad 2026-10-09:** rettes ikke i Python (merknaden 09.10 i 4.2). Endringsordren i KOE-saken er avvist som vei (EO-U1), og `sak_opprettet` skal skrives av TS-stien (B-17) | Streng `xfail`, K 29.09 | D |
| DM-07 | Lukket | `eo_opprettet` hadde ingen regel om sakstype, og behandleren gjorde saken til en endringsordresak uansett. BH fikk 201 for `eo_opprettet` i en KOE-sak gjennom `POST /api/events` i et prosjekt uten godkjenningspolicy, og saken ble vist som en endringsordre med status `UTKAST`. Stred mot vedtaket 29.09 i 3.1. **Merknad 2026-10-05:** rettet (#97). Forretningsregelen `IS_EO_CASE` gjelder nå `eo_opprettet`, så BH får 400 i en KOE-sak | Ordinær test, K 05.10 | D |

### 4.4 Målskjemarunden 21.09: KR, MG, RY

Kilder: [KR](../audit-korrekthet-2026-09-21.md),
[MG](../audit-maalskjema-gjennomgang-2026-09-21.md),
[RY](../audit-opprydding-2026-09-21.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| KR-01, KR-02, KR-03, KR-05 til KR-12 | Lukket | `bab9679` og påfølgende indeksmigrasjoner | H 21.09 | — |
| KR-04 | Åpen | `compute_state` gjør navneoppslag. → MG-01, AF-05 | L 22.09 | F2 |
| KR-13 | Lukket | Backfill-skriptet. Faller med RY-01. **Merknad 2026-10-09:** skriptet er slettet (#102), etter unntaket fra AF-06 i 3.2 | H | F4 |
| KR-14 | Avvist | Anvendt migrasjon er uforanderlig | H | — |
| KR-15 | Lukket | Samme sak som TST-02. Den ustabile strenge `xfail` er erstattet av en deterministisk reproduksjon (T-4), som ble XPASS da TST-02 ble rettet 22.09, og er gjort om til en ordinær test | H, K 22.09 | — |
| MG-01 | Åpen | Navneoppslag i beregningslaget. Oppslaget bruker `has_app_context()`, så fravær av HTTP-forespørsel betyr ikke fravær av oppslag | L 22.09 | F2 |
| MG-02 | Lukket | Én identitetsform i journalen | D 21.09 | — |
| MG-03 | Åpen | Forsvar i dybden: parseren avviser `event_id` og `tidsstempel`, ikke aktørfeltene. Eksisterende ruter overskriver aktørfeltene fra sesjonen, så klientforfalskning er ikke påvist | Streng `xfail`, K 22.09, L | F2 |
| MG-04 | Åpen, lav | `created_by` har tre verdiformer. → MS-06 | H | F2 |
| MG-05 | Åpen | `ownerName` fryses i godkjenningspakken. Lagre ID ved flytting til databasen | H | F1 |
| MG-06 | Lukket | Indeksen fra KR-11 (`20260921102148`). Fila sier at den er anvendt 21.09 | H, L | — |
| MG-07 | Lukket | Serverfilter og indeks fra KR-02 (`20260921093936`). Fila sier at den er anvendt 21.09 | H, L | — |
| MG-08 | Åpen, lav | Serielle navneoppslag. Faller med MG-01 | H | F2 |
| MG-09 | Regel | I `.claude/rules/database.md` | — | — |
| RY-01 | Åpen | Oppslag som bør gå mot `sak_metadata`, ikke journalen; krever indeks på `catenda_topic_id` først. Tas når den støtter EO-flyten (AF-06) | H | F2 eller F4 |
| RY-02 til RY-07 | Åpen, lav | Paginering, buffer, N+1, oppslag, testdobbel, KR-09 mot identitet | H | F4 |

### 4.5 Dokumentfunn

RGK-01–06, RGK2-01–05, KONS-01–14 og RTB-01–05 gjelder planverket, ikke koden.
De er behandlet i denne redigeringen; se
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md).
KONS-02 og KONS-09 var allerede dekket av daterte merknader i delplanen og målskjemaet.

### 4.6 Foreløpige funn, ikke kontrollert

Registrert fra lesing uten kjøring. Statusen er «foreløpig» til funnet er
reprodusert eller avvist. Alvorlighet settes da.

| ID | Status | Funn | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| BR-01 | Reprodusert 23.09, flyttet til 4.2 | Se 4.2. Den opprinnelige påstanden (L 23.09) holdt. | K 23.09 | D |
| DM-02 | Foreløpig | `catenda_models_cache` leses av tre BIM-ruter, som gir tomme lister når den er tom. Ingen kode, funksjon eller trigger skriver den, og `upsert_cached_models` har ingen kaller. Om cachen var ment fylt på en annen måte, er ikke kjent. Hører til flaten i DA-15 | L 29.09, katalogen K 29.09 | Spor M |
| DM-08 | Foreløpig | Fem kolonner viser til en person med navn eller e-post, ikke `app_users.id`: `vedlegg.lastet_opp_av`, `utkast.oppdatert_av`, `sak_bim_links.linked_by`, `projects.created_by` og `project_memberships.invited_by`. Samme klasse som MG-04. Kan ikke kobles sikkert til en bruker, og et innsyn må søke på navn og e-post | L 29.09 | Spor M |

### 4.7 Tellinger

Registeret har ingen samlet «antall åpne feil». Flere ID-er er samme rotårsak,
og antall tester er ikke antall feil. Fordelingen i testinventaret står i
redaksjonsprotokollen, med forklarte kategorier.

## 5. Arbeidspakker

<a id="nye-arbeidspakker-og-produksjonskrav"></a>
Rekkefølgen følger AF-06: verifikasjon mot ekte database, datalagets grenser
og én komplett EO-flyt før flere adaptere og generell opprydding. Tre parallelle
spor, D, H og M, kan gå samtidig når de ikke tar kapasitet fra F0–F2.
Organisatoriske avklaringer (F5) kan starte nå. For KOE-, EO- og
forseringssakene følger rekkefølgen B-17 og pakken FK (merknaden 09.10 til
AF-06).

«Tester som beviser» er planlagt kontroll. Ingenting her er utført uten at
det står.

> **Merknad 2026-09-23 til avsnitt 5:** F0b er ny og kommer mellom F0 og F1.
> Den følger av beslutningen om direkte tilkobling (3.1). Pakkene er ikke
> omnummerert, fordi F1–F5 er referert fra mange dokumenter.

> **Merknad 2026-10-09 til avsnitt 5:** FK er ny og står etter F2. Den følger
> av B-17 og merknaden 09.10 der. Pakkene er heller ikke nå omnummerert.

### F0 — Verifikasjonsgrunnlag

**Avhenger av:** ingenting. **Status:** delvis. CI kjører backend, frontend,
typesjekk og lint (19.09). Migrasjonene er bygd mot tom PostgreSQL manuelt
(PG16 20.–21.09, PG18 22.09; historisk).

> **Merknad 2026-09-22 (F0, punkt 1):** CI-jobben `database` bygger basen fra
> tom på PostgreSQL 17 med plattformstubben og kjører katalogtestene i
> `backend/tests/test_database/` (merket `database`, styrt av
> `KOE_TESTBASE_URL`). Kjørt lokalt mot PG 17.11 og observert grønn i CI
> (PR #33, 22.09). T-2 er gjort for DB-03 og DB-07, T-5 er gjort. Punkt 3
> (DA-03) og punkt 2 (påkrevde sjekker, AR-05) er gjort 22.09. Gjenstår:
> T-1, T-3, T-4 og DB-04s fremmednøkler (B-01).
> Rolletesten bruker `SET ROLE anon/authenticated`; en test som logger inn som
> ikke-privilegert rolle, venter på B-02. Se
> [gjennomføringsnotatet](../gjennomforing-f0-postgresql-ci-2026-09-22.md).
>
> **Merknad 2026-09-22 (F0, punkt 4: T-1, T-3, T-4):** T-1 er gjort: den
> strenge `xfail` for AUT-03 er erstattet av en ordinær test som viser at
> batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH`, og at
> verken journal, notatlager eller `last_event_at` skrives. T-3 er gjort:
> FE-02-testen har gyldig sesjon og saken i prosjektet, og feiler nå på
> målassertionen om rolle. T-4 er gjort: kappløpet i
> `JsonFileEventRepository` er reprodusert deterministisk ved
> eksistenssjekken, med reell lagring og `strict=True`. Den ustabile testen
> og testen fra 22.09 (RTB-02) er erstattet, så TST-02 gir ingen tilfeldig rød
> port. Anbefalingen i 3.3 om TST-02 er dermed fulgt. Funnene FE-02, TST-02 og
> KR-15 er fortsatt åpne. Gjenstår i F0: DB-04s fremmednøkler (B-01). Se
> [notatet](../gjennomforing-f0-testvedlikehold-2026-09-22.md).
>
> **Merknad 2026-09-22 (TST-02 rettet):** `JsonFileEventRepository`
> publiserer en ny saksfil med `os.link` framfor `rename`, og TST-02 og KR-15
> er lukket. T-4-reproduksjonen ble XPASS og er gjort om til en ordinær test,
> med en test til for flettingen der begge skriverne har skrevet ferdig. Se
> [notatet](../gjennomforing-tst02-2026-09-22.md).

> **Merknad 2026-10-11 til F0 ([B-12, databasen](#b-12-databasen)):** jobben i
> punkt 1 og veien fra fil til base i punkt 3 gjelder PostgreSQL, som er
> testbasen til datalaget for Azure SQL finnes. Tilsvarende for Azure SQL hører
> til F0b, punkt 2.

**Leveranse:**

1. En CI-jobb som bygger alle migrasjoner mot tom PostgreSQL 17 (målversjonen
   i `supabase/config.toml`) med plattformstubben (`scripts/testbase/`), og kjører
   databasetester mot den. Stubben dokumenterer hvilke rettigheter som kommer
   fra plattformen.
2. Påkrevde sjekker på `main` i GitHub-innstillingene.
3. Avstemt migrasjonshistorikk i basen (DA-03), og en dokumentert vei fra fil
   til base.
4. Testvedlikehold, uten å svekke noen assertion:
   - **T-1** AUT-03: erstatt reproduksjonen med datert begrunnelse, slik FE-01
     ble erstattet 20.09. Den ordinære avvisningstesten finnes.
   - **T-2** DB-03, DB-04, DB-07: katalogtester mot PostgreSQL i stedet for
     tekstsøk i enkeltfiler. DB-04s tester for fremmednøkler venter på B-01.
   - **T-3** FE-02: gyldig sesjon i testoppsettet, så målassertionen nås.
   - **T-4** KR-15/TST-02: deterministisk reproduksjon ved eksistenssjekken, med
     reell lagring. Behold `strict=True` til den finnes.
   - **T-5** RV-17: `raises=` på AP-04-testen.

**Akseptkriterier:** jobben bygger basen fra tom og feiler ved en migrasjon som
sorterer feil; minst én test kjører mot ekte PostgreSQL med en ikke-privilegert
rolle; autorisasjon er ikke globalt mocket bort i disse testene; live-tester er
fortsatt eksplisitt adskilt; ingen tilfeldig rød port fra TST-02; basens
historikk og mappa stemmer.

**Tester som beviser:** katalogtestene i T-2; en test som viser at
`anon` og `authenticated` ikke leser tabeller eller kjører funksjoner.

### F0b — Datalaget over direkte tilkobling

> **Merknad 2026-10-11 til F0b ([B-12, databasen](#b-12-databasen), [B-19](#b-19)):**
> oppdragsgiver bestemte 11.10 at F0b får nytt innhold: datalaget i TS over
> direkte tilkobling til Azure SQL. ID og anker er beholdt. Det F0b var for
> Python over PostgreSQL, er historikk (under), og teksten før er i Git (se
> toppteksten). F0b kommer før eller sammen med #310 (FK), og F1 kommer etter
> F0b som før.

**Avhenger av:** B-12, databasen, og B-19 (3.1). Tilgangsmekanismen i B-02
alternativ C prøves tidlig i T-SQL ([B-12, databasen](#b-12-databasen), #395). Lagringsformen avgjøres senest før
KOE-byttet skriver den første reelle hendelsen
([merknaden 11.10 til B-12](#b-12-merknad-2026-10-11)). Containerdelen avhenger
av hostingen i B-12. Arbeidet følges i
[milepælen F0b](https://github.com/khjohns/endringsmeldinger/milestone/1).

F0b bytter plattformen og veien til basen, ikke rettighetene. Datalaget etter
F0b, før rollene i F1 finnes, er ikke en produksjonstilstand. F1 og produksjonsporten gjelder; F1 er tilpasset Azure
SQL i merknaden 11.10 der.

**Leveranse:**

1. **Kjernen i TS:** direkte tilkobling til Azure SQL med managed identity
   ([B-12, databasen](#b-12-databasen)), pool og en transaksjonshjelper som
   setter kontekst for transaksjonen. `SESSION_CONTEXT` gjelder sesjonen, så
   at konteksten ikke følger en gjenbrukt forbindelse, må bevises på nytt
   (merknaden 29.09 under B-12). Feilklassifisering for driveren: en
   avvisning som aldri kan lykkes, prøves ikke på nytt, og versjonskonflikt
   har en egen klasse.
2. **Migrasjonene i T-SQL** og veien fra fil til base (#53), med en testbase av
   samme slag lokalt og i CI.
3. **Flyttingen fra Python ([B-19](#b-19), #375):** det Python gjør mot
   databasen, flyttes til TS før databasen byttes, først innloggingen og
   sesjonen, identiteten og synkroniseringen av medlemskap, og ellers blant
   annet webhookens innboks. Identiteten løses med samme issuer og
   normaliserte subjekt for alle veier inn (`AGENTS.md`). Løp c og d i den
   tidligere teksten (#57, #58) erstattes av flyttingen.
4. **TS2-02:** JSON-, CSV- og Supabase-lagrene og Python-lagrene over
   PostgreSQL ut av kjøretidsstien når flyttingen er gjort (#49). De skrives
   ikke om for Azure SQL (B-19).
5. **Container** og utrulling når hostingen i B-12 er avklart (#52).

**Akseptkriterier:** samme kode virker lokalt, i CI og mot Azure SQL; ingen
Python-kode leser eller skriver i databasen; en feil midt i en transaksjon
etterlater ingen delvise skrivinger; kontekst fra én forespørsel finnes ikke på
en gjenbrukt forbindelse etter commit eller rollback; innloggingen,
medlemssynkroniseringen og webhooken gir samme person én brukerrad.

**Tester som beviser:** lagertestene mot testbasen i CI; en test med pool på én
forbindelse som viser at kontekst ikke lekker; en test per feilklasse i
driveren; en test som viser at samme person gir én brukerrad fra hver vei inn.

**Kontroll:** kjernen får uavhengig review før lagrene bygges på den.
`/simplify` skal la sikkerhetskontrollene stå: transaksjonslokal kontekst,
fail-closed-kontroller som ser dobbelte ut, eksplisitte fjerninger av
rettigheter og like svar for «ukjent» og «ikke tilgang».

**Historikk, Python over PostgreSQL (23.09–09.10):** F0b fulgte av
beslutningen 23.09 om direkte tilkobling (3.1). Kjernen `lib/db` med pool,
`transaksjon(kontekst)` og retry for hele transaksjonen ble levert 24.09
(PR #42), etter et [uavhengig review](../review-f0b-kjernen-2026-09-23.md) der
RK-01–RK-04 ble fulgt opp
([gjennomføringsnotatet](../gjennomforing-f0b-kjernen-2026-09-23.md); oppsettet
i [handoffen 23.09](../handoff-2026-09-23-datalag-postgresql.md), avsnitt 7).
RK-05, en samlet øvre grense for en transaksjon, står åpen før F1 (#50).
Løp c og d og TS2-02 ble avhengige av B-12 29.09 og av B-18 09.10, og bygges
ikke i Python etter B-19.

### F1 — Sikkerhetsgrenser i datalaget og private lagre

**Avhenger av:** F0-jobben og F0b; B-02 før rolle- og policymigrasjoner; B-04
for tilbakekallingsdelen. Før neste migrasjon for målmodellen må tilgangs- og
skriverettigheter være konkretisert. Runtime bygges ikke på ubegrenset
`service_role`.

**Leveranse:**

1. Samlet design for roller (runtime, worker, drift, migrering, break-glass),
   identitetskontekst og databasefunksjoner, med uavhengig review (AF-01,
   AF-02, B-02). Rettigheter er eksplisitte per rolle i migrasjonene, også for
   de åtte tabellene som i dag lever på plattformens standardrettigheter.
2. Godkjenningspakker, policyversjon og utkast flyttet fra SQLite til
   databasen med prosjekt, side og team. MG-05: pakken lagrer ID, ikke navn.
3. Teamvern i datalaget for `notat`, utkast og godkjenningspakker. Et autorisert
   leselag skiller offentlig innhold, teaminterne notater og private pakker før
   aggregering, eksport og PDF. Grensesnitt, nedlasting og driftsvisning følger
   samme regler.
4. Append-only for `hendelse` (MS-02), inkludert vurdering av kaskaden fra
   `sak_metadata`.
5. `viewer` i `app_project_memberships` (DB-05). Deretter fjernes
   `project_memberships`, `user_groups` og `magic_links` (MS-15, AR-07).
6. Tilgangslogg for sensitive lesinger, eksport og endringer i fullmakt og
   prosjekttilgang (OBS-01/02, OBS-05). Ingen tokens eller brevtekst i
   standardlogger.
7. Tilbakekalling etter B-04.
8. Hemmelighetslager og rotasjon.

**Akseptkriterier:** med de faktiske runtime-rettighetene gir en direkte
spørring med prosjekt A i konteksten null rader fra prosjekt B, utenom API-et
(egenskap, ikke eksempel). Det samme gjelder motpart, to team på samme side,
ukjent team, manglende kontekst og gjettet ressurs-ID. Gjenbrukt forbindelse
tar ikke med kontekst til neste forespørsel. Runtime kan ikke `UPDATE`,
`DELETE`, `TRUNCATE` eller skrive direkte til `hendelse`. De private lagrene
ligger i databasen. Migrering og break-glass er separat, tidsavgrenset og logget.

**Tester som beviser:** negative tester mot ekte database per scenario over;
rettighetstester for hver rolle; en test som viser at runtime-innloggingen ikke
kan ta eierens eller en administrators rettigheter (T2).

> **Merknad 2026-10-11 til F1 ([B-12, databasen](#b-12-databasen), [B-19](#b-19)):**
> F1 gjelder datalaget i Azure SQL. Rollene, teamvernet, append-only og
> rettighetstestene uttrykkes i T-SQL, og mekanismen i B-02 alternativ C prøves
> tidlig der ([B-12, databasen](#b-12-databasen), #395). Testene for `SET ROLE` til `service_role` og Data API-testen
> for `anon` og `authenticated`, som sto her før sluttredigeringen 11.10, gjaldt
> Supabase-plattformen og faller bort med den. Kravet
> om at runtime ikke bygges på ubegrenset `service_role`, gjelder tilsvarende
> for rettighetene i Azure SQL.

### F2 — Én komplett EO-flyt med minimal worker

**Avhenger av:** F0b og F1-rollene; B-01 for KOE-tilknytning og relasjoner; B-08
for reservasjonen; B-03 for dokumentoperasjonen; B-07 for drivmekanismen; B-10
for kompatibilitetskravet.

**Leveranse:** Kontrakten i
[transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md) er normativ.
Testkravene fastsettes før implementering, og én ansvarlig beholder oversikten
over transaksjonsgrensene. En grønn suite erstatter ikke dokumentasjon av hva
som er testet. Kort:

1. `commit_eo_approval` som én databasekommando i én transaksjon over direkte
   tilkobling (3.1, endret 23.09 fra «én RPC»): kommandokvittering kontrolleres
   under lås; policy, pakke og saksstrømmer låses i dokumentert rekkefølge;
   pakkeversjon, godkjenner, fullmakt, policyversjon og frosset innhold
   kontrolleres (RV-02, RV-19, RV-20); EO-nummer og KOE-tilknytning reserveres;
   hendelser, metadata, relasjoner, vedleggsbinding, pakkestatus, outbox og
   kvittering skrives samlet. Ingen kompensasjonssletting (AP-04, TST-05).
2. Vedleggstabell med hash, dokumentversjon og karantenestatus. Skanning før
   frigivelse. Staging med opprydding av foreldreløse filer.
3. Minimal worker: `SKIP LOCKED` i kort transaksjon, lease-token, backoff med
   jitter, `USIKKERT_UTFALL`, én strategi per ekstern operasjon (avsnitt 7).
   Frosset prosjekt, board og konfigurasjonsversjon (INT-06 for EO).
4. Ren projeksjon: navneoppslag ut av `compute_state` (KR-04, MG-01, MG-08).
   Register og projeksjon (MS-06, MS-07, MG-04). Rebase-regler (MS-03).
5. Parsegrensen avviser alle fem serverfelt (MG-03), med ruter og
   `approval_service` endret samtidig.
6. Ny skrivesti bak eksplisitt konfigurasjon, én autoritativ sti per prosjekt.
   Den gamle kompenserende stien stenges når den nye er aktiv.

**Akseptkriterier:** transaksjonsplanens akseptansetester 1–6 er grønne mot
ekte PostgreSQL med uavhengige forbindelser og feilinjeksjon ved hver
skrivegrense. I tillegg: identisk retry gir samme kvittering; endret innhold
med samme ID avvises; to ulike kommandoer gir én commit og én konflikt; gammel
worker som fortsatt lever, kan ikke kvittere etter utløpt lease; en ny worker
parkerer ved uavklart ekstern effekt; privat data avvises ved opprettelse av
jobb; gamle hendelser leses av ny kode, og tilbakerulling gjør ikke nye
hendelser uleselige; historiske teststrømmer gir samme tilstand uten Flask,
database eller nett. AP-04 regnes ikke som løst med lengre lease.

**Tester som beviser:** AP-04- og RV-02-reproduksjonene blir XPASS og gjøres
om til ordinære tester; nye PostgreSQL-tester for samtidighet og feilpunkter;
lokale feiltester for Catenda i avsnitt 7.

**Presisering 07.10, B-10:** Bevis gjenoppbygging etter regel-/projeksjonsendring
uten nye sakshendelser, også for lagrede oversikter. Dokumenter versjonen som
beregnet visningen, hvordan foreldet innhold oppdages, og når det bygges på nytt.
Prøv gamle og nye skrivere/lesere, utrulling og tilbakerulling. En leser som ikke
forstår en rettslig relevant hendelse, må stanse bindende kommandoer; historikken
kan fortsatt gjøres tilgjengelig med uttrykkelig begrensning. Frosne brev,
beslutninger og leveringsdokumenter endres ikke ved gjenoppbygging.

> **Merknad 2026-10-09 til F2 (B-17), oppdatert ved sluttredigeringen 11.10:** Endringsordre- og forseringssakene går
> til TS sammen med KOE-sakene (merknaden til [B-17](#b-17)). F2 slik den er
> skrevet, utgår:
>
> - Kommandoen i punkt 1, med KOE-tilknytningen, hører til FK.
>   Transaksjonsplanens kontrakt og akseptansetester gjelder kommandoen der, og
>   invariant 3 er uendret. Funnene kommandoen skal løse (AP-04, RV-02, RV-19,
>   RV-20, TST-05), følger den.
> - Kravene i punkt 4 gjelder utledningen og registeret for disse sakstypene i
>   TS-stien (FK). Punkt 5 (MG-03) gjelder TS-stien som invariant 11. Punkt 6
>   erstattes av at skrivestien byttes samlet (B-17).
> - Vedleggstabellen i punkt 2 og den minimale workeren i punkt 3 er levering
>   og integrasjon (B-17). Etter [B-19](#b-19) kan Python beholde dem bare så
>   lenge de ikke leser eller skriver i databasen selv, og Python henter ikke
>   leveringsoppdraget direkte fra basen ([LV-U1](#lv-u1)).
> - Akseptkriteriet om at gamle hendelser leses av ny kode, gjelder mellom
>   TS-versjoner (merknaden til invariant 9). Kriteriet om historiske
>   teststrømmer erstattes av bevis-sakene i domenetabellen, som føres videre
>   (B-17).
> - Fra 11.10 betyr «ekte PostgreSQL» og «PostgreSQL-tester» i
>   akseptkriteriene og testene over en ekte database av samme slag som
>   produksjonen, Azure SQL ([B-12, databasen](#b-12-databasen)).

### FK — KOE-, EO- og forseringsdomenet i TS (B-17)

**Avhenger av:** B-17 med merknaden 09.10 (endringsordre og forsering følger
KOE). Målmodellen i den permanente mappa, skrevet om etter MM-U9 og GR-U10
([#308](https://github.com/khjohns/endringsmeldinger/issues/308)). Format og
versjonering etter B-10
([#273](https://github.com/khjohns/endringsmeldinger/issues/273)).
Serverplasseringen, B-18
([#311](https://github.com/khjohns/endringsmeldinger/issues/311)). Arbeidet
følges i [milepælen FK](https://github.com/khjohns/endringsmeldinger/milestone/5).

**Leveranse:**

1. TS-kjernen bygget ut til hele KOE-, EO- og forseringsdomenet, med vedtakene
   i 3.1 og domenetabellen som forventning
   ([#309](https://github.com/khjohns/endringsmeldinger/issues/309)).
2. Skrivestien for KOE-, EO- og forseringssakene overtatt samlet i TS, med
   Python bare for levering og integrasjon
   ([#310](https://github.com/khjohns/endringsmeldinger/issues/310)). Byttet
   omfatter skjemaer, API, batch, godkjenningspublisering, webhooks og
   bakgrunnsjobber (B-17).

**Akseptkriterier på pakkenivå:**

- Ingen Python-kode skriver i journalen for KOE-, EO- eller forseringssaker,
  heller ikke indirekte (B-17).
- Hver inngang i TS-stien krever autentisering med CSRF, prosjekttilgang og
  eventuelt kontraktsrolle, og et register med test feiler når en inngang
  mangler en kontroll (2.1, merknaden til invariant 11 og 12).
- Et brev lagres med beslutningsgrunnlaget og leveringsintensjonen i samme
  transaksjon som hendelsen (invariant 3, MM-U9).
- Bevis-sakene i domenetabellen går gjennom hele kjeden: kommando, lagring,
  gjenlesing og utledning i TS-stien.

> **Merknad 2026-10-10 til FK:** målmodellen er flyttet til den permanente
> kjernemappa [`kjerne/`](../../kjerne/) og skrevet om etter MM-U9, MM-U11,
> GR-U10, KA-U7, KA-U10, KA-U11, KA-U13 og EO-U5 (#308, PR #328). CI håndhever
> typesjekk, prettier, navnereglene og regelversjonsvakten for mappa. Bevis-sakene
> for forløp A–E kjøres mot kjernen i minnet og mot testbasen i CI (K 10.10,
> `da1ed81` på `main`).
> Lagringsformatet er foreslått i [designnotatet](../design-hendelsesformat-2026-10-09.md)
> og ikke bygget (#273).

> **Merknad 2026-10-10 til FK, runde 2:** lagringsformatet er bygget i
> [`kjerne/`](../../kjerne/) etter [HF-U1](#hf-u1) og [HF-U2](#hf-u2) (#273,
> PR #340). Det har én rad `dokument_registrert` per dokument, uttrykkelige
> referanser og kolonnen `format`, med migrasjon. Hendelsestypene TS skriver,
> står i [`kjernehendelser.toml`](../datamodell/kjernehendelser.toml) (#320).
> Med formatet er GR-U12, GR-U13, KA-U14, KA-U15, MM-U13 og MM-U14 bygget i
> kjernen. Endringsordren har utfallene ja, nei og ikke avklart, og sperren mot
> trekk av grunnlaget følger den. Arkitekturtesten håndhever hva reglene får
> lese, med en hviteliste. Regelversjonsvakten krever begge versjonene når
> `standpunkt.ts` endres (#329, #330, PR #339). Bevis-sakene kjøres mot kjernen
> i minnet og mot testbasen i CI (K 10.10, `e19dedd` på `main`). De 48
> feilinnføringene er kjørt i arbeidsøkta og ikke i CI (PR #340). Frontenden kan
> importere kjernen, og visningene leser statusene gjennom ett lesepunkt per
> visning (del av #313, PR #333). B-18 er avgjort ([B-18](#b-18)). Ikke bygget:
> vurderingene i #341, kodene i #335 og leveringsintensjonen i TS-stien (#310).

> **Merknad 2026-10-10 til FK, runde 3 (#347):** oppdragsgiver har godkjent et
> unntak fra rekkefølgen #309 før #310. Skiva i
> [#347](https://github.com/khjohns/endringsmeldinger/issues/347), en
> gjennomgående prøve av TS-stien, kan gå før #309 er ferdig bygget, parallelt
> med første byggedel av #309. Den endrer ikke `kjerne/`.

> **Merknad 2026-10-10 til FK, runde 4 (#358):** [OV-U1](#ov-u1) avgrenser
> første versjon av TS-stien til KOE-saken og endrer rekkefølgen: #310 kommer før
> byggedel 4 av #309 (endringsordre og forsering) og før § 34.3.3 i byggedel 3.
> Brev om det som avvises, følger [OV-U2](#ov-u2).

> **Merknad 2026-10-11 til FK, runde 5 (#347):** skiva er levert (PR #372). Et
> grunnlagskrav og et vederlagskrav går fra en egen side i frontenden gjennom
> TS-serveren i den nye mappa [`server/`](../../server/), med tilgangskontrollen,
> til kjernen, journalen og leveringsoppdraget, som lagres i samme transaksjon
> ([LV-U1](#lv-u1)), og tilbake til visningen. Tabellen `leveringsoppdrag` er
> uforanderlig. Prøvd mot testbasen i CI (K 11.10, `4ee5d9a` i PR #372). Ikke
> bygget: brevteksten (#369), opprettelsen av en sak som kommando (#370),
> leveringsforsøkene og workeren (#371) og én vertsadresse for TS og Python
> (#376). Oppdraget har ingen brevtekst og leveres ikke før #369. Innloggingen
> flyttes til TS ([B-19](#b-19), #375).

> **Merknad 2026-10-11 til FK, rekkefølgen etter B-19:** databasen er Azure SQL
> ([B-12, databasen](#b-12-databasen)). Databasebyttet skjer før eller sammen med #310.
> Derfor forutsetter #310 at det Python gjør mot databasen, er flyttet til TS (#375,
> [B-19](#b-19)), og at datalaget for Azure SQL finnes (F0b). Kjernen i #309 importerer ingen
> database og bygges videre. Lagringstestene mot testbasen følger lagringsformen (#395).

### F3 — Øvrige adaptere og drift

**Avhenger av:** F2 grønn. Utvid én adapter om gangen.

**Leveranse:** BH-svar og ordinære hendelser, inkludert batchruta (RV-10), til
samme kommandomønster. Varig webhook-inbox med dedupe før kvittering og
behandling i samme transaksjon som lokale hendelser (RV-12, INT-02, INT-03).
Skill ekko fra egne kall fra nye endringer. Avvikle `vedlegg_registry` når alle
flyter bruker vedleggstabellen, og `catenda_delivery_status` når alle
leveringsveier bruker outbox. Delt rate limiting på tvers av instanser
(`RATE_LIMIT_STORAGE=memory://` gir N ganger grensen og nullstilles ved
kaldstart) og håndtering av kvoteavslag fra Catenda. Mål ende-til-ende før en
eventuell medlemskapscache; en slik cache krever tilbakekallingsfrist (B-04).
Avstemming mot Catenda for usikre utfall. Aktiv varsling for eldste ventende jobb
og usikre utfall, med mottaker og testet prosedyre. Dead-letter-innsyn og
manuell retry med tilgang og logg. MS-12.

**Akseptkriterier:** ingen støttet formell innsendingsvei mangler varig
leveringsintensjon; leveranser gjenopptas uten brukerhandling; SQLite-lagrene er
avviklet; alarmer er testet. Kapasitetskriteriene fastsettes etter B-09.

### F4 — Domene, bevis og bevaring

**Avhenger av:** F2 for eksport av leveringshistorikk; B-05 og B-11.

**Leveranse:** eksport av én sak med hendelser, tidsstempler, aktør,
dokumentversjoner, hash og leveringskvitteringer, lesbar uten appen, med
uttrekkstidspunkt og hvem som hentet ut. Tidskilde (B-11). Bevarings- og
sletteregler for filer, logger og backup (B-05). Uavhengig integritetsbevis
vurdert ut fra trusselmodellen. Revisjon av fullmakts- og prosjektendringer.
AR-04. Universell utforming: kravnivå avklart mot forskriften, advarslene
rettet eller begrunnet, og `svelte-check` gater på a11y. RY-01 til RY-07. BIM (DA-15, MS-13, MS-14) når det prioriteres.

**Akseptkriterier:** en sak kan framlegges uten at appen kjører; manglende fil
og ubekreftet levering framgår uttrykkelig; gjenoppretting utløser ikke blind
ny levering; det er besluttet hva som skjer når motparten bestrider systemets
egen framstilling.

### F5 — Produksjonsport

Kan starte nå. Første oppgave er å bekrefte om prosessene allerede finnes, og
i så fall erstatte punktet med en referanse. Status er ikke innhentet for noen.

- ROS-analyse.
- DPIA, forankret av behandlingsansvarlig med råd fra personvernombudet.
  Faktagrunnlaget finnes ([faktagrunnlag for DPIA](../personopplysninger-faktagrunnlag-2026-09-19.md)).
- Ekstern sikkerhetsvurdering. «Uavhengig sluttaudit» i denne planen betyr en
  annen agent enn implementøren, ikke en tredjepart.
- Hendelseshåndtering med ansvarlig, også for påstått tapt varsel med frist.
- Catenda: skriftlig svar på hva som skjer med løpende frister når Catenda er
  utilgjengelig, og om et varsel kan sendes med rettsvirkning da; håndtering av
  tapt eller slettet prosjekt og utløpt lisens; avhengigheten akseptert som
  risiko med ansvarlig, eller redusert.
- Restore-øvelse av hendelser, godkjenninger, utkast, filer og køer, med
  dokumentert RPO og RTO, uten blind ny levering.
- B-10-porten fra F2: historiske strømmer, versjonerte formater/projeksjoner,
  gjenoppbygging ved regelendring og kompatibilitet ved utrulling/tilbakerulling
  er dokumentert og prøvd. Ingen stille bortfiltrering av ukjente rettslige hendelser.
- Korrigeringsprosessen for feilregistrerte, låste opplysninger er avklart
  og dokumentert (B-16), også hvis løsningen er en manuell prosess.
- Isolert staging med eget Catenda-testprosjekt.
- Konfigurasjon utenfor koden: policy med `user_id` (RV-03), Supabase-konsollet
  (RV-06) så lenge Supabase brukes, og tilsvarende for Azure SQL og hostingen (B-12),
  produksjonshemmeligheter (CFG-01).
- Uavhengig sluttaudit av F2 og F3: samtidige forsøk, utløpte leases, mistede
  eksterne svar.

### Spor D — domenefeil

Kan gå parallelt. Hver retting får regresjonstest og holdes innenfor sitt
funn. TFR-02 til TFR-06, GFK-02, GFK-06, INT-07, OBS-03, BR-01 (reprodusert
23.09, rettes etter B-13), DRF-01–DRF-03, SD-01–SD-04, og restansen på
GFK-01 når B-06 er avgjort.

> **Merknad 2026-09-23 til spor D:** TFR-02–TFR-05, GFK-02, INT-07 og OBS-03
> er rettet; se radene i 4.2 og
> [gjennomføringen](../gjennomforing-spor-d-2026-09-23.md). Statusene i TFR-02
> og TFR-05 er besluttet av oppdragsgiver. TFR-06 og GFK-06 er reprodusert,
> men ikke rettet, fordi rettingen krever en avklaring (spørsmål 1 og 2 i
> gjennomføringen). SD-01 og SD-02 er nye. Spørsmål 3 gjelder fullmakten når
> beløpet ikke kan verdsettes, for både KOE og EO.
>
> **Merknad 2026-09-23 (senere samme dag):** oppdragsgiver har besvart
> spørsmål 1–3; vedtakene står i 3.1. Ingen av dem er bygget. Spørsmål 1 er
> det største: innsigelse og forespørsel på et nøytralt fristvarsel blir egne
> handlinger, og rettingen av TFR-06 og DRF-01 bygger på det. DRF-01 og TFR-06 må løses sammen: en sperre mot
BH-svar på et nøytralt varsel må slippe forespørselen etter § 33.6.2 gjennom. Deretter systematisk gjennomgang av
tilstandsovergangene mot NS 8407, med dokumentert forventet overgang og test
per hendelsestype. Utvides `SporStatus`, gjelder regelen i
`.claude/rules/python-domene.md` om å lete opp alt som teller statuser.

> **Merknad 2026-10-05 til spor D:** Strukturkartleggingen er levert:
> [kartlegging-struktur-spor-d-2026-10-05.md](../kartlegging-struktur-spor-d-2026-10-05.md).
> Den registrerer SK-01–SK-13 (4.2) og foreslår målformer for mønstrene M1–M5.
> Om de legges til grunn, er B-14 (3.4).

> **Merknad 2026-10-07 til spor D:** Målretningen er vedtatt med
> presiseringene under B-14. Gjennomføringen følger domenetabell og bevis,
> smal kontrakt og språkprøve før større ombygging av M2/M1. Små uavhengige
> rettinger beholder sin avgrensning. Ingen av SK-funnene lukkes av vedtaket.

> **Merknad 2026-10-09 til spor D:** Spor D er lukket for rettinger i
> Python-koden for KOE-, EO- og forseringssakene (merknaden 09.10 i 4.2).
> Unntak er sikkerhet og feil som hindrer test eller demo. Kontraktsinnholdet i
> funnene går til FK som rader og bevis-saker (#309) eller som krav til
> TS-serveren (#310).

### Spor H — herding og konfigurasjon

Små, uavhengige rettinger. De er krav før produksjon, men ikke forutsetning
for F0–F2: RV-13 med CFG-03 og OBS-07; RV-14; CFG-01, CFG-02, CFG-04 til
CFG-07; TS2-01; OBS-06; INT-01; GFK-05; FE-02, FE-03 og FE-06; AUT-04 og TST-01;
TST-04, TST-06, TST-07; AR-08; DM-04. I tillegg: pinning av Python-avhengigheter og
sårbarhetsskanning i CI med en besluttet terskel for hva som blokkerer;
HTTP-herding (CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`) testet mot
brevvisningen; lagringsfeil presenteres ikke som null krav eller komplett
statistikk.

### Spor M — datamodell og funksjonskart

**Avhenger av:** ingenting. B-12 avgjør bare fase 4. **Ført inn:** 29.09, etter
oppdragsgivers ønske og IKTs forespørsel om en tabellbeskrivelse som
systemdokumentasjon.

**Leveranse:**
1. **Datamodellen.** Et tabellregister med vakttest og eksport til IKTs
   regneark, en hendelseskatalog, og relasjoner og dataflyt mot Catenda.
2. **Funksjonskart.** For hver funksjon: hva brukeren gjør, hva som skjer bak
   kulissene, og hva som er tiltenkt, med kilde.
3. **Atferdstester per område.** Ordinære tester der atferden holder. Avvik
   blir funn med ID og streng `xfail`.
4. **Etter B-12:** beskrivelsene inn i databasen.

Kartleggingen går i faser, og en senere fase kan rette en tidligere.

**Samordning med spor D:** områdene for varsel, frist, vederlag, svar,
forsering og EO i fase 3 er den systematiske gjennomgangen av
tilstandsovergangene som spor D beskriver.

**Testene går gjennom rutene og containeren**, ikke mot SQL, slik at de kan
kjøres mot et annet datalag.

Oppdraget er [spor M](../prompt-datamodell-og-funksjonskart-2026-09-29.md).
Arbeidet følges i
[#79](https://github.com/khjohns/endringsmeldinger/issues/79).

> **Merknad 2026-09-29:** fase 1b er levert:
> [hendelseskatalogen](../datamodell/hendelser.md) med vakttest og to nye ark
> i Excel-fila. DM-05–DM-07 er funnet under kartleggingen; se
> [gjennomføringsnotatet for 1b](../gjennomforing-spor-m-1b-2026-09-29.md).

> **Merknad 2026-09-29:** fase 1c er levert, og med den punkt 1, datamodellen:
> [relasjonene og dataflyten mot Catenda](../datamodell/relasjoner.md), med
> ER-diagram generert fra katalogen, vakttester og to nye ark i Excel-fila.
> DM-08 er funnet under kartleggingen; se
> [gjennomføringsnotatet for 1c](../gjennomforing-spor-m-1c-2026-09-29.md).

### Rotårsakene

De tolv rotårsakene i
[vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md#del-3-tolv-rotårsaker)
dekkes slik: RC-1 og RC-6 i F1; RC-2 lukket 20.09; RC-3 lukket i repo 20.09,
med PostgreSQL-verifikasjon i F0; RC-4 i F2; RC-5 og RC-8 i spor D; RC-7 og
RC-10 i spor H; RC-9 i F3 og spor H; RC-11 lukket med FE-01 og FE-05; RC-12 i F4.

## 6. Beslutninger som blokkerer

Avsnittet fører ikke arbeidsstatus. Det som pågår og venter, står i
GitHub-issues, samlet i en milepæl per arbeidspakke:
[F0b](https://github.com/khjohns/endringsmeldinger/milestone/1), [F1](https://github.com/khjohns/endringsmeldinger/milestone/2), [F2](https://github.com/khjohns/endringsmeldinger/milestone/4),
[FK](https://github.com/khjohns/endringsmeldinger/milestone/5) og [opprydding etter AF-06](https://github.com/khjohns/endringsmeldinger/milestone/3). Regelen
står i `AGENTS.md` («Hvor hva står») og i avsnitt 8. Tabellen viser hvilke
åpne beslutninger i 3.4 som må være tatt før en del av arbeidet.

| Beslutning | Må være tatt før |
| --- | --- |
| B-01 relasjoner | KOE-tilknytningen og relasjonene i FK, byggedel 4 av #309 ([OV-U1](#ov-u1)) |
| B-12 hosting | Container og utrulling i F0b, veien fra migrasjonsfil til base og plattformkonfigurasjon i F5. Databasen er avgjort ([B-12, databasen](#b-12-databasen)) |
| Lagringsformen ([merknaden 11.10 til B-12](#b-12-merknad-2026-10-11)) | KOE-byttet skriver den første reelle hendelsen (#310) |
| B-07 drivmekanisme | Workeren for leveringen (punkt 3 i F2, som er levering og integrasjon etter merknaden 09.10 til F2) |
| B-09 driftsverdier | Akseptkriteriene for kapasitet og varsling i F3, og grensene for utdatert medlemsliste (B-04) |
| B-05 bevaring, B-11 tidskilde | Eksport og bevaring i F4, og produksjonsporten |
| B-06 fullmakt uten sats | Restansen på GFK-01 |
| B-16 korrigering av låste opplysninger | Korrigeringsfunksjon og avklaring før produksjon |

## 7. Catenda: leveringsgarantier

Tidligere levende tester er **historiske resultater** fra 3. september 2026,
dokumentert i [Catenda-dataflyten, avsnitt 10](../catenda-dataflyt.md#10-tester-før-produksjonsimplementasjon).
Kontraktskriptet er
[`test_catenda_api_contracts_live.py`](../../backend/scripts/test_catenda_api_contracts_live.py);
mock-kontraktene ligger i
[`test_catenda_mutation_contracts.py`](../../backend/tests/test_integrations/test_catenda_mutation_contracts.py).
Ingen levende test er kjørt i denne redigeringen. Den lokale OpenAPI i
`docs/tredjepart-api/` er et snapshot, ikke en garanti for tjenesten.

| Operasjon | Tidligere dokumentert | Ny garanti som trengs | Mangler verifikasjon | Ved usikkerhet |
| --- | --- | --- | --- | --- |
| `createTopic` | Opprettelse og sletting i testprosjektet. OpenAPI har valgfritt `guid` i body; klienten sender det ikke | Gjenfinning etter tapt svar | Utfall av gjentatt eller samtidig POST med samme GUID, og samme GUID med annet innhold | Parker som `USIKKERT_UTFALL`. Ny POST bare om strategien sier at et negativt oppslag er nok |
| `createComment` | OpenAPI har valgfritt `guid`, og `getComment` finnes. Klienten sender bare tekst | Ingen duplikat ved retry | Som over. Catenda dokumenterer ingen idempotensheader for kommentarer | Let etter deterministisk markør med `getComments` før ny POST; ellers parker |
| `createLibraryItem` (opplasting) | Samme navn med `failOnDocumentExists=false` ga samme item og én ny revisjon; unikt navn ga nytt item; revisjonsnavnet stemmer. Klienten sender parameterne i headeren `Bimsync-Params`, ikke via en `upload_url` | Samme dokument ved retry; ingen ekstra revisjon | Konfliktsvaret ved `true` er ikke observert. OpenAPI oppgir statuskoden som «25 CONFLICT» | Avhenger av dokumentnøkkelen og navnestandarden ([B-03, dokumentet](#b-03-dokument), #310). Uten sikker gjenfinning: parker, ingen ny opplasting |
| `createDocumentReference` | Opprettet, lest og slettet. Respons som liste normaliseres. Topic API krever bindestrek-UUID for `document_guid` | Én referanse per dokument og topic | Referansens eget `guid` ved gjentakelse | List med `getDocumentReferences` og match på `document_guid`; ellers parker |
| `updateTopic` (status) | GET med `$select` og PUT av tillatte felt bevarer feltene testboardet har | Eldre jobb overstyrer ikke nyere ønsket status | Priority og stage i et board som har dem | Kontroller ønsket revisjon før skriving; ved feil i GET, retry med backoff |
| Relaterte topics | Additiv og toveis i samme board. På tvers av board: HTTP 500 | Ingen | Avklaring med Catenda om kryss-board | Relasjon på tvers av board lagres bare internt |
| Webhook-mottak | Første levering 200, gjentatt levering 202 uten duplikate sideeffekter | Varig inbox før kvittering | Catendas retry ved 500 og timeout, gjenbruk av event-ID | Lagre før kvittering; 503 bare når mottaket ikke kunne lagres |

At et GUID-felt finnes, beviser ikke idempotent opprettelse. Et oppslag uten
treff beviser heller ikke at en gammel workers kall ikke fullføres senere.

**Implementeringsoppgaver (planlagt):**

- **Lokale feiltester i F2:** commit og omstart; tapt HTTP-svar etter mulig
  ekstern commit; utløpt lease; forsinket gammel worker som fortsatt lever;
  retry uten dupliserte domenehendelser eller ugyldige kvitteringer. De
  verifiserer parkeringen, ikke Catendas garantier.
- **Smale levende kontrakttester, bare der valgt strategi avhenger av dem:**
  gjentatt opprettelse med samme klientvalgte GUID; gjenfinning etter tapt
  svar; konfliktsvar ved `failOnDocumentExists=true`. Kjøres mot
  testprosjektet med opprydding, som tidligere.
- **Andre prosjekt og webhook-retry:** punkt 2 og 3 i Catenda-dataflytens
  avsnitt 10 står fortsatt åpne.

## 8. Vedlikehold av planen

- Status endres bare her, med dato og belegg. Andre dokumenter får en datert
  merknad som viser hit.
- Et nytt funn får ID i sitt eget dokument og en linje i avsnitt 4.
- En beslutning flyttes fra 3.4 til 3.1 med dato og hvem som besluttet.
- En xfail som blir XPASS gjøres om til ordinær test, og registeret oppdateres.
- Planen fører det som er avgjort og levert, med dato og belegg. Arbeid som
  pågår eller venter, står i GitHub-issues, ikke her (`AGENTS.md`, «Hvor hva
  står»). Et issue viser til ID-en i planen og gjentar ikke vurderingen.
- Et nytt vedtak formuleres i kontraktens begreper: hvem som sier hva om
  hvilket krav, bestemmelsen i NS 8407 eller vedtaket det bygger på, og
  virkningen. Et statusnavn fra koden brukes bare som etikett (merknaden
  09.10 i 3.1).
- Et spørsmål trenger eget vedtak når svaret åpner eller sperrer en handling
  for en part, endrer hva en handling krever, gir appen en egen vurdering,
  endrer et vedtak, avgjør noe et vedtak har satt av til senere, tar en
  bestemmelse inn under en av måtene i [VS-U3](#vs-u3), eller velger mellom
  lesninger av et vedtak som gir ulik atferd. Ellers er det et arbeidsvalg i
  [paragrafmatrisen](../paragrafmatrise-koe-eo-forsering.md): felt, tekst,
  visning og teknisk gjennomføring som bevarer vedtatt innhold og virkning.
  Arbeidsvalget viser til vedtaket det bygger på, med en kort begrunnelse.
  Prinsippene i matrisen kan brukes i begrunnelsen og som utgangspunkt for
  en anbefaling til oppdragsgiver, men de er ikke hjemmel (oppdragsgiver
  11.10, #309).
- Når de daterte merknadene gjør planen tung å lese, sluttredigeres den.
  Vedtak, funnstatus, ID-er og ankre endres ikke. Det som tas ut, er bevart i
  Git, og toppteksten peker til teksten før redigeringen med commit og blob.

## Verifikasjon og grenser

Redigeringen er dokumentarbeid. Kontrollene er beskrevet i
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md).

**Lest nå (22.09):** funnkilder og testfilenes egne ID-er for hver rad i
testinventaret; `xfail`-dekoratørene med AST; migrasjonsfilene for
`sak_relations`, `sak_bim_links` og indeksene; Catenda-klientens opplasting og
opprettelse; de nevnte OpenAPI-operasjonene.

**Historisk dokumentert:** alt merket D eller H, testkjøringene fra 22.09
(merket K 22.09, kjørt av testrevisjonen og reviewene), og levende
Catenda-tester fra 3. september.

**Ikke kontrollert nå:** den levende databasekatalogen, full testsuite,
levende Catenda-atferd, organisatoriske prosesser og rettslige krav.
Funn fra auditene 14.–16.09 som ikke har vært ført i denne planen, er ikke
registrert på nytt enkeltvis.

**Endringen 23.09** er dokumentarbeid: oppdragsgivers beslutning om alternativ C
og T2, Azure PostgreSQL som foreløpig mål, TS2-02 vedtatt, B-12 og F0b. Kilden er
oppdragsgivers bekreftelse 23.09 og [handoffen](../handoff-2026-09-23-datalag-postgresql.md).
Ingen kode, migrasjon eller database er endret eller lest på nytt. Påstandene om
Azure, Fabric og IKTs svar er gjengitt fra handoffen og ikke kontrollert her.

**Endringen 23.09, BR-01:** BR-01 er reprodusert og flyttet fra 4.6 til 4.2,
DRF-01–DRF-03 er ført inn, og B-13 har fått en merknad. Belegget er testene i
`backend/tests/test_security/test_beregningsresultat_br01_20260923.py`, kjørt
23.09, og kartleggingen, der det som bare er lest, er merket L.

**Endringen 23.09, spor D:** radene for TFR-02–TFR-06, GFK-02, GFK-06, INT-07
og OBS-03 er oppdatert, SD-01–SD-02 er ført inn, og spor D har fått en
merknad. Belegget er testene som er nevnt i radene, kjørt 23.09 med hele
backend-suiten grønn; se [gjennomføringen](../gjennomforing-spor-d-2026-09-23.md#verifikasjon-og-grenser).

**Endringen 29.09, B-12 og spor M:** merknadene under B-12 og F0b, spor M,
og DM-01–DM-04. Funnene er beskrevet i
[gjennomføringsnotatet for 1a](../gjennomforing-spor-m-1a-2026-09-29.md).
- Opplysningen om at en SQL Database er aktuell, kommer fra oppdragsgiver.
  Hva IKT har lagt til grunn, er ikke kjent.
- DM-01, DM-03 og den katalogkontrollerte delen av DM-02 er kjørt mot
  prosjektet og testbasen 29.09. DM-04 er vist med to mutasjoner mot
  ruteregistertesten, begge tilbakestilt.
- Resten er lest ut av koden; se
  [oppdraget, avsnitt 4](../prompt-datamodell-og-funksjonskart-2026-09-29.md#4-utgangspunktet-2909).
- Ingen kode, migrasjon eller database er endret.

**Endringen 29.09, DM-04:** raden for DM-04 er lukket. Belegget er
`backend/tests/test_security/test_public_route_registry.py`, kjørt 29.09 med
hele backend-suiten grønn uten testbasen, og ti mutasjoner mot `routes/` og
`app.py`, alle røde i testen de gjaldt, alle tilbakestilt; se
[merknaden i gjennomføringsnotatet](../gjennomforing-spor-m-1a-2026-09-29.md#merknad-2026-09-29-til-dm-04).
Ingen produksjonskode er endret.

**Endringen 29.09, spor M 1b:** merknaden under spor M, DM-05–DM-07, og
radene i 3.1 om saksopprettelse og om EO-sak og KOE-sak. Kilden for radene er
oppdragsgivers svar 29.09. DM-05–DM-07 er reprodusert mot testbasen med
kontrollsaker; se
[gjennomføringsnotatet for 1b](../gjennomforing-spor-m-1b-2026-09-29.md#verifikasjon-og-grenser).
Ingen produksjonskode, migrasjon eller database er endret.

**Endringen 29.09, spor M 1c:** merknaden under spor M og DM-08 i 4.6. DM-08
er lest ut av koden, ikke kjørt, og står derfor som foreløpig uten
alvorlighet; se
[gjennomføringsnotatet for 1c](../gjennomforing-spor-m-1c-2026-09-29.md#verifikasjon-og-grenser).
Ingen produksjonskode, migrasjon eller database er endret.


**Endringen 07.10, review av #266 og #270:** B-14, AF-06-unntaket, B-10/F2/F5
og de åpne B-15/B-16 er dokumentert etter oppdragsgivers tilslutning i samtalen.
Arbeidet omfatter dokumenter og GitHub-oppfølging, ikke implementering.
Kontrollgrunnlag og verktøygrenser står i
[reviewnotatet](../review-oppfolging-arkitektur-2026-10-07.md#verifikasjon-og-grenser).

**Endringene 08.10–09.10** før sluttredigeringen er listet i endringsloggen i
toppteksten ved `5d067cc3`. Belegget står i de daterte merknadene og radene de
gjelder.

**Sluttredigeringen 09.10** er dokumentarbeid mot `5d067cc3`. Kilden for
vedtakene er oppdragsgivers svar i samtalen 09.10, på spørsmål med
alternativer. Ordlyden følger det valgte alternativet. Ingen kode, migrasjon
eller database er endret. Milepælen for FK er opprettet, og issuene som
vedtakene avgjør, lukkes av PR-en.

- **Ført inn:** MM-U9, GR-U10, KA-U7–KA-U9, GR-U11, FO-U1, VS-U1 og VS-U2 som
  nye rader i 3.1. Daterte merknader til B-17 (endringsordre og forsering),
  B-14 (permanent mappe), regelversjon og passivitet under B-13, MM-U4–MM-U6
  (opphevet), MM-U8, GR-U2, GR-U7, SK-02/SK-03, kravversjon, KA-U3 og KA-U6 i
  3.1; invariant 9, 11 og 12; AF-06; F0b, F2 og spor D; 4.2 (Python-feil i
  KOE-domenet), SK-02, SK-06, DM-01, DM-05 og DM-06. Ny arbeidspakke FK.
- **Omordnet uten endring i vedtak eller funnstatus:** 3.1 etter kontraktstema.
  B-15, merknaden til B-04 og merknaden 07.10 til B-14 er flyttet fra 3.4 til
  3.1. 4.2 er delt i to tabeller. Merknadene til B-12 og de fire unntakene fra
  AF-06 03.–04.10 er samlet.
- **Tatt ut og bevart i Git:** endringsloggen i toppteksten, kolonnen «I dag» i
  2.2 med merknaden 23.09 til den, og radene og merknadene for de avgjorte
  beslutningene i 3.4, unntatt det som er flyttet. Avsnitt 6 har fått nytt navn.
- **Kjørt:** `python3 docs/verktoy/lenkekontroll.py` over hele `docs/` (ingen
  nye brudd; bruddet i `adr/001` er kjent),
  `python3 docs/verktoy/domenetabell.py` og
  `/tmp/venv/bin/python docs/verktoy/datamodell.py` (exit 0, ingen genererte
  filer endret), og `tests/test_domenetabell` og `tests/test_datamodell` uten
  testbasen. Ankrene andre dokumenter lenker til, er beholdt.
- **Ikke kontrollert:** byggestatusen i «Følge» og i funnregisteret er ikke
  prøvd på nytt. At prøveserveren i `sprakprove/server/` mangler en
  registertest, er lest (L 09.10). Fordelingen av issues bak merknaden i 4.2 er
  hovedøktas. Redigeringen gjør ingen egen vurdering av NS 8407; vedtakene
  09.10 bygger på oppdragsgivers lesning.

**Endringen 09.10, FK runde 1,** er dokumentarbeid. Kilden er oppdragsgivers
svar i samtalen 09.10 på spørsmål fra arbeidsøktene for #273 og #308, med
alternativer, belegg i NS 8407 og en anbefaling. Ordlyden følger det valgte
alternativet. For EO-U5 og KA-U12 følger den svar på oppfølgingsspørsmål. Sitatene
fra NS 8407 er kontrollert mot teksten i `507e2254^:docs/NS_8407.md`.

- **Ført inn:** MM-U10, KA-U10, KA-U11, KA-U12 og EO-U5 som nye rader i 3.1.
  Daterte merknader til B-03, MM-U3, KA-U6, KA-U8, MM-U7, GR-U9 og EO-U2.
- **Ført inn i PR-en for #273:** MM-U11 som ny rad i 3.1, etter et
  oppfølgingsspørsmål fra gjennomgangen av formatforslaget, og en datert
  merknad til KA-U10. Merknaden under B-10 i 3.4 viser til designnotatet.
- **Ført inn på spørsmål fra #308:** KA-U13 som ny rad i 3.1, fra reviewet av
  samspillet mellom reglene, og daterte merknader til KA-U6, KA-U7, KA-U12, GR-U5
  og GR-U10.
- **Kjørt:** `python3 docs/verktoy/lenkekontroll.py` på planen.
- **Ikke kontrollert:** at vedtakene er bygget. Det gjør #308 og #273.

**Endringen 10.10, avslutningen av FK runde 1,** er dokumentarbeid. GR-U12 er
oppdragsgivers svar 10.10 på et spørsmål fra den uavhengige gjennomgangen av
PR #328. Ordlyden følger det valgte alternativet og oppdragsgivers tillegg om
varselet i frontenden.

- **Ført inn:** GR-U12 som ny rad i 3.1, daterte merknader til GR-U10, KA-U13 og
  MM-U11, og merknaden 10.10 til FK. Lenkene til `sprakprove/maalmodell/` i 1.2
  og 3.4 viser nå til `kjerne/`.
- **Kjørt:** `python3 docs/verktoy/lenkekontroll.py` på planen, `docs/README.md`
  og designnotatet.
- **Ikke kontrollert:** at GR-U12 er bygget. Det gjør #273 og #313.

**Sluttredigeringen 11.10** er dokumentarbeid mot `6f56672`. Kilden for F0b,
merknaden til KA-U12, ordbyttet i B-13 og KA-U30 er oppdragsgivers svar 11.10
på spørsmål med alternativer, formidlet av orkestratoren for FK runde 7.

- **Rettet utenfor vedtakene:** 1.2, 2.1, 2.2, 3.2, 3.3, 3.4, F0, F1, F2, FK og
  avsnitt 6, etter B-12, databasen, og B-19 (#396). F0b har nytt innhold, og
  merknadene 23.09–09.10 der er samlet under «Historikk». Utdaterte
  ventepunkter er fjernet.
- **Ført inn:** KA-U30 som ny rad i 3.1. Ordbyttet i B-13 og merknaden til
  KA-U12 i Følge. En setning om navn på hendelser, felt og koder i merknaden
  øverst i 3.1.
- **Kjørt:** et skript som viser at ankrene og cellene i vedtakskolonnen i 3.1
  er uendret, unntatt ordet i B-13 og den nye raden KA-U30;
  `python3 docs/verktoy/lenkekontroll.py` på planen,
  `docs/verktoy/datamodell.py`, `docs/verktoy/domenetabell.py` og
  `tests/test_datamodell` og `tests/test_domenetabell` uten testbasen.
- **Ikke kontrollert:** byggestatusen i «Følge» og i funnregisteret. Påstandene
  om Azure SQL bygger på vurderingen av JSON i Azure SQL og designnotatet om
  inbox og outbox, ikke på en egen kjøring.
