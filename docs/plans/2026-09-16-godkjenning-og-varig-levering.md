# Hovedplan: sikkerhet, dataintegritet og varig levering

**Opprettet:** 2026-09-16. **Sist sluttredigert:** 2026-10-11, mot commit
`6f56672c00aca01eaac8e9566c672535c37bce20` (`main`).
**Status:** Autoritativ plan og løpende kilde til rekkefølge og funnstatus.
Vedtakene står i [vedtaksfila](vedtak.md), og de avsluttede funnene og
leveransemerknadene fram til 24.10 i [arkivet](arkiv.md) (#1020). Appen er ikke i
produksjon og har ingen reelle data.

Teksten før sluttredigeringen 11.10 er bevart i Git:
`git show 6f56672:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `9421cba77197f29648d7be092e0a7861d1740ea3`). Den har teksten som
forutsatte PostgreSQL eller at Python beholder databasedelen, slik den sto før
[B-12, databasen](vedtak.md#b-12-databasen) og [B-19](vedtak.md#b-19) (#396).

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
| Denne planen | Autoritativ for rekkefølge, funnstatus, føringene og de åpne beslutningene |
| [Vedtaksfila](vedtak.md) | Autoritativ for vedtakene. Generert fra [vedtaksregisteret](../vedtaksregister/README.md). Var avsnitt 3.1 her til #1020 |
| [Arkivet](arkiv.md) | Autoritativ for de avsluttede funnene. Har leveransemerknadene til arbeidspakkene fram til 24.10, flyttet ordrett herfra (#1020) |
| [Domenetabellen](../domenetabell/README.md) | Eier forventet atferd per rad, begrepene og bevis-sakene. Radene viser til vedtakene her og gjentar dem ikke |
| [Modellforslaget](../forslag-maalmodell-2026-10-09.md) | Begrunnelse for målmodellen. Ikke vedtatt som helhet; vedtakene som bygger på det, står i 3.1 |
| Kjernemappa [`kjerne/`](../../kjerne/) | TS-kjernen (1.3, B-14). Målmodellen fra #304 er flyttet hit og skrevet om etter vedtakene 09.10 (#308). Dekker forløp A–E. Arbeidet med resten av domenet står i #309 |
| [Arkitekturforslaget](../forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md) | Begrunnelse for B-14 og språkvalget (avsnitt 7 der). Overgangen der, én kommando om gangen, er erstattet av B-17 |
| [Metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md) | Prøve av fristkrav og tidsinnsigelser. Vedtakene er MP-U4–MP-U7 |
| [Arkitekturføringene AF-01–AF-06](../arkitekturforinger-2026-09-21.md) | Vedtatte føringer. Normative for design, ikke implementert |
| [Transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md) | Underordnet delplan. Normativ for kommando-, låse-, worker- og akseptansetestkontrakten der den er mer presis enn denne planen. Kontrakten gjelder uansett språk; for KOE-, EO- og forseringssakene gjelder den TS-stien (FK). Merknadene der gjelder foran eldre tekst |
| [Design v2 for B-02](../design-b02-tilgangsmekanisme-v2-2026-09-23.md) | Grunnlaget for alternativ C og transport T2, vedtatt 23.09. Normativt for F1 der det er mer presist enn denne planen. Punktene 3–6 i avsnitt 9 der er avgjort 23.09 (3.1). Designet er skrevet for PostgreSQL; etter [B-12, databasen](vedtak.md#b-12-databasen) uttrykkes og prøves mekanismen i T-SQL (#395) |
| [Målskjemaet](../design-maalskjema-database-2026-09-20.md) | Retning for skjemaet, justert av AF-01, AF-03 og AF-04. Skrevet for PostgreSQL; plattformen er Azure SQL etter [B-12, databasen](vedtak.md#b-12-databasen) |
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
| Levering og integrasjon (worker) | Gjengir og leverer frosne brev, kaller Catenda og fører tekniske leveringsresultater etter commit. Lease med token, avstemming og usikkert utfall. Tolker ikke journalen for å avgjøre hva et brev betyr eller hva partene kan gjøre. Python kan beholde dette laget så lenge det ikke leser eller skriver i databasen selv, og bare til det flyttes til TS ([B-17](vedtak.md#b-17), [B-19](vedtak.md#b-19), [LV-U1](vedtak.md#lv-u1)) | Et eksternt kall kan ikke rulles tilbake. Lokal lås beviser ikke ekstern effekt |
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
| Roller | Avgrensede roller for runtime, worker, drift og migrering (AF-02). Runtime logger inn direkte, med managed identity, og kan ikke ta eierens eller en administrators rettigheter (T2, F1, [B-12, databasen](vedtak.md#b-12-databasen)) |
| CI | Datalaget testes mot en ekte database av samme slag som produksjonen, over samme tilkobling, med skrivbar testbase (F0b, [B-12, databasen](vedtak.md#b-12-databasen)). Tester som logger inn med de avgrensede rollene (F1) |

Tabellnavn i kolonnen «Planlagt» fastsettes i migrasjonene.
Planen låser ikke et tabelltall. Databasen er Azure SQL
([B-12, databasen](vedtak.md#b-12-databasen)); hvordan journalen lagres, er ikke
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

Vedtakene står i [vedtaksfila](vedtak.md), som er autoritativ for dem (#1020). Den lages
av [vedtaksregisteret](../vedtaksregister/README.md) og rettes bare der. Før #1020 sto
vedtakene her, og en henvisning til «3.1» eller til et vedtak i hovedplanen gjelder
vedtaksfila.

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
> til TS sammen med KOE-sakene (merknaden til [B-17](vedtak.md#b-17)).

> **Merknad 2026-10-09 til AF-06 (#102, #162):** Oppdragsgiver har godkjent at
> backfill-skriptet i #102 (`backend/scripts/backfill_relations.py`) og
> testskriptene i #162 (`create_test_sak.py` og `test_full_flow.py`) slettes nå.
> De rettes ikke. Skriptene krever Supabase-lageret eller utviklingsbypass, og de
> bygger saker og relasjoner fra testsaker som forkastes etter B-17.

> **Merknad 2026-10-10 til AF-06 (#347):** avviket fra rekkefølgen i FK for skiva i
> #347 står i merknaden 10.10 til FK, runde 3 (avsnitt 5).

> **Merknad 2026-10-11 til AF-06 ([B-12, databasen](vedtak.md#b-12-databasen), [B-19](vedtak.md#b-19)):**
> «Ekte PostgreSQL-tester» betyr fra 11.10 tester mot en ekte database av samme
> slag som produksjonen, Azure SQL. Lagerovergangen i TS2-02 bygges ikke i
> Python: lagrene slettes når det Python gjør mot databasen, er flyttet til TS
> (B-19, #375). Prøven mot eksisterende PostgreSQL i merknaden 07.10 og
> testbasen for kjernens lagringstester gjelder til datalaget for Azure SQL
> finnes.

> **Merknad 2026-10-16 til AF-06 (rekkefølgen i FK og F0b):** oppdragsgiver
> godkjente forslaget om rekkefølgen 16.10 med «Ja, som foreslått». Rekkefølgen
> og unntaket er:
>
> - Skrivestien og frontenden prioriteres foran resten av #587 og foran #514,
>   #516 og #550.
> - Oppfølgingsfunn fra review i FK og F0b (etiketten `review-oppfølging`) tas
>   ikke i rundene før #310 er levert, unntatt funn som gir feil resultat i et
>   forløp første versjon kan nå gjennom skjemaene. Samleissuene fra nye PR-er
>   følger samme prioritering.
> - Byggedel 4 (EO og forsering) venter til #310 er levert, slik [OV-U1](vedtak.md#ov-u1)
>   allerede sier.
> - Oppdelingen av #375 og kartleggingen av skrivestien (#375, #310, #370, #371,
>   #376, #418, #487 og #313) gjøres samlet for FK og F0b, og fordelingen av
>   filer legges fram for oppdragsgiver.

> **Merknad 2026-10-17 til AF-06 (review-oppfølging i FK og F0b):** oppdragsgiver
> godkjente 17.10 at en runde tar de anbefalte punktene fra sorteringen i
> [#709](https://github.com/khjohns/endringsmeldinger/issues/709#issuecomment-6237500889),
> som unntak fra merknaden 16.10. Svaret, ordrett: «Ja opprett issue og lag prompt
> til orkestrator som kan ta dine anbefalte issues (alle anbefalte - den velger selv
> å avslutte og prompte neste orkestrator dersom dens egen kontekst blir for høy)».
> Punktene er:
>
> - F0b, serveren: #750, #739 punkt 1, #716 punkt 2 og #724 punkt 1.
> - FK, kjernen: #550, #474 punkt 1, #562 punkt 1 og 2, #580 punkt 1 og #496.
> - Verktøyene: #604.
> - Vaktene i `.claude/`: #563. Oppdragsgiver svarte 17.10 om hvem som godkjenner
>   endringen: «Ja, du godkjenner i appen (Recommended)».

> **Merknad 2026-10-17 til AF-06 (retningen fram til #310):** oppdragsgiver
> svarte 17.10 på tre spørsmål om retningen fram til #310 (spørsmål 3 gjelder
> etterfølgeren til [#655](https://github.com/khjohns/endringsmeldinger/issues/655)). Planen står i
> [#764](https://github.com/khjohns/endringsmeldinger/issues/764). Spørsmålene og
> svarene, ordrett:
>
> 1. «Hvilken hovedretning skal arbeidet ha fram til aktiveringen (#310)?» Svar:
>    «Funksjon + medfølgende (Recommended)», som lyder: «Neste plan mot #310 er
>    hovedsporet. Én runde med kjernegjelden før byggedel 2 (nytt unntak fra
>    merknaden 16.10). Annen review-oppfølging tas bare i filer som runden uansett
>    endrer.» Forkastet: «Review-oppfølging først»: «To eller tre runder som
>    tømmer gruppe 3 (om lag 165 punkter) før ny funksjon. Mye av frontenddelen
>    kan bli overflødig når skjemaene og #313 bygges.»; «Bare funksjon»:
>    «Stoppen i merknaden 16.10 står uendret til #310 er levert, utover
>    unntaksrunden som pågår. Kjernegjelden venter også.»
> 2. «Skal vi ta oppryddingen uten kode nå: avvise Python-punkter etter DL-U2,
>    rette foreldede etiketter og stille de 22 spørsmålene som venter på deg,
>    samlet?» Svar: «Ja, nå (Recommended)», som lyder: «Én liten runde, mest i
>    issuene. Spørsmålene stilles i grupper med alternativer og anbefaling.»
>    Forkastet: «Bare oppryddingen»: «Avvisninger og etiketter nå. Spørsmålene
>    stilles når hvert punkt blir aktuelt.»; «Nei, vent»: «La gruppe 4 og 5 stå
>    til den ukentlige sorteringen.»
> 3. «Hva skal det nye planissuet (etterfølgeren til #655) ta først?» Svar:
>    «Levering + topic (Recommended)», som lyder: «Spørsmålene i #741, deretter
>    #371 og #741 med felles jobbkjører, og #418. Dette stenger aktiveringen
>    uansett.» Forkastet: «BH-svaret først»: «Byggherrens svarskjema og
>    godkjenningsflyten i TS, slik at en sak har begge sider før leveringen
>    bygges.»; «Begge parallelt»: «Levering i F0b-sporet og BH-svaret i
>    FK-sporet, med én felles orkestrator som i runde 5.»

> **Merknad 2026-10-17 til AF-06 (review-oppfølging i filene en økt endrer):**
> oppdragsgiver bestemte 17.10: «Review-oppfølging i hver runde. Når orkestratoren
> fordeler filene i kartleggingen, slår den opp de åpne punktene med
> review-oppfølging i filene hver økt uansett endrer. Punktene tas med i
> bestillingen, med nummer og punkt, innenfor grensen på om lag 800 linjer.
> Byggeøkta legger ikke til punkter selv. Punkter i filer runden ikke rører,
> venter.» På spørsmål om regelen også gjelder i FK og F0b før #310, som unntak
> fra merknaden 16.10, svarte oppdragsgiver: «Ja, også i FK og F0b (Recommended)».

> **Merknad 2026-10-17 til AF-06 (review-oppfølging i FK og F0b, levert):**
> punktene i merknaden 17.10 om review-oppfølging i FK og F0b er levert: serveren
> i [#755](https://github.com/khjohns/endringsmeldinger/pull/755), kjernen i
> [#762](https://github.com/khjohns/endringsmeldinger/pull/762), verktøyene i
> [#757](https://github.com/khjohns/endringsmeldinger/pull/757) og vaktene i
> [#758](https://github.com/khjohns/endringsmeldinger/pull/758).

> **Merknad 2026-10-20 til AF-06 (forsering):** oppdragsgiver avgjorde 20.10 at
> forsering trekkes ut av [#310](https://github.com/khjohns/endringsmeldinger/issues/310):
> «Den har lav prioritering og bygges først når KOE, EO, godkjenning samt mye
> annet i appen er ferdig og optimalisert mtp ux og design.» Byggedel 4 tar derfor
> endringsordren først. Forsering kommer etter at KOE, endringsordre og godkjenning
> er ferdige og arbeidet på brukeropplevelsen og designet er gjort. Til da føres
> forsering utenfor appen, slik [OV-U2](vedtak.md#ov-u2) sier. Beslutningsstatus for B-17
> er ellers uendret.

> **Merknad 2026-10-20 til AF-06 (rekkefølgen fram til [#310](https://github.com/khjohns/endringsmeldinger/issues/310)):** rekkefølgen er endret til «Python ut først» (oppdragsgiver 20.10). Akseptkriteriet for den delen er den lokale prøven ende til ende: TEs krav og BHs svar levert til et testprosjekt i Catenda. Intern godkjenning kommer etter. Mockupen beholdes. Før dagens skjema og visninger slettes, verifiseres det med en konkret sammenligning mot Python-koblingen at TS-oppbyggingen, med TS-koblingene, ivaretar funksjonene som er ønsket i dagens frontend. Oppdragsgiver 20.10, ordrett: «Før vi sletter dagens skjema og visninger må det være verifisert at ny oppbygning, med TS-koblingene ivaretar de funksjonene som er ønsket i dagens frontend.» Se [#1024](https://github.com/khjohns/endringsmeldinger/issues/1024). Merknaden 17.10 om levering og topic først gjelder ikke lenger for rekkefølgen. Se [vurderingen av målbildet](../vurdering-maalbilde-og-ts-overgang-2026-10-20.md), [svarene i kommentaren på #375](https://github.com/khjohns/endringsmeldinger/issues/375#issuecomment-6288651890), merknaden 20.10 til avsnitt 5 over og milepælen [Første ekte sak](https://github.com/khjohns/endringsmeldinger/milestone/7).

### 3.3 Anbefalinger som ikke er vedtatt

| Anbefaling | Kilde | Status |
| --- | --- | --- |
| Relasjonsprojeksjon med prosjektavgrensede fremmednøkler og én skriver | AF-03, RGK-04 | Foretrukket til vurdering, se B-01 |
| Avgrenset runtime-rolle uten `BYPASSRLS`, RLS for lesing og avgrensede `SECURITY DEFINER`-funksjoner med egen autorisasjon, fast `search_path` og smal `EXECUTE` | RGK-04 | Innarbeidet i alternativ C, vedtatt 23.09 (3.1). Ordlyden er PostgreSQL; etter [B-12, databasen](vedtak.md#b-12-databasen) uttrykkes og prøves mekanismen i T-SQL (#395) |
| Gjør TST-02-reproduksjonen deterministisk, framfor å fjerne `strict=True` | RGK-04 | Anbefalt. Den nye testen fra 22.09 er ikke deterministisk (RTB-02) |
| Forhåndsvalgte GUID-er for topic og kommentar | RGK2-01 | Kandidat. Ikke bevist idempotent (avsnitt 7) |
| Køalarm ved 15 minutter; sletting av stagingfiler 24 timer etter kvittert levering | Konsolidering v2 | Forslag uten kilde, se B-09 |
| Utgående kvote på 10 kall/s og innkommende grense 100 kall/s | Konsolidering v2 | Forslag uten kilde, se B-09 |
| Fjern JSON-hendelseslageret og CSV-metadatalageret fra kjøretidsstien; tester som trenger ekte lagring, går mot PostgreSQL gjennom samme vei som produksjonen, med skrivbar testbase | [TS2-02](../gjennomforing-tst02-2026-09-22.md#ts2-02--reservelagrene-og-testene) | Vedtatt 23.09, utvidet til Supabase-lagrene (3.1). Fra 11.10 er basen Azure SQL, og Python-lagrene skrives ikke om ([B-19](vedtak.md#b-19)) |
| Migrasjonsmappa som eneste kilde, anvendt med `supabase db push` | Masterplanen 20.09 | Repo-siden gjennomført (DA-03). Anvendelsesmekanismen gjenstår. `supabase db push` gjelder bare på Supabase; for Azure SQL trengs en annen vei fra fil til base ([B-12, databasen](vedtak.md#b-12-databasen), #53) |

### 3.4 Åpne beslutninger

«Ansvarlig» angir rollen som må avklare. Der ingen er utpekt, står det.
Et åpent valg blokkerer bare oppgavene som er nevnt.

| ID | Spørsmål | Alternativer | Anbefaling (kilde) | Ansvarlig | Belegg som trengs | Blokkerer |
| --- | --- | --- | --- | --- | --- | --- |
| B-01 | Hvordan skal relasjoner mellom saker lagres? | (a) Relasjonsprojeksjon med prosjektavgrensede fremmednøkler, én skriver. (b) Utledning fra hendelsenes jsonb med GIN-indeks. (c) Reservasjonstabell for KOE-tilknytning pluss (a) eller (b) | (a) er foretrukket til vurdering (AF-03). En GIN-indeks er ikke et revisjonsspor (RGK-04) | Utvikler, med review. Ikke utpekt | Sammenlikning mot referanseintegritet, eksklusivitet, gjenoppbygging og samtidighet | KOE-tilknytning og relasjoner, i FK etter merknaden 09.10 til F2. DB-04, MS-08 |
| B-05 | Hvilke bevaringskrav gjelder utover journalen? | Bevaringstid for journal, filer, logger, backup og stagingfiler | P7 fastsetter bare at journalen bevares uten kryptografisk sletting | Behandlingsansvarlig, med råd fra personvernombudet | DPIA og arkivfaglig vurdering | Bevarings- og sletteregler i F4. Produksjonsport |
| B-07 | Hvilken drivmekanisme skal workeren ha? | Tabell med `SKIP LOCKED`, `pgmq`, Cloud Tasks, Cloud Scheduler, jobber i Azure Container Apps, fast instans | Én kømekanisme; tabell og `SKIP LOCKED` er beskrevet i transaksjonsplanen | Utvikler, ikke utpekt | Plattformens skalering til null og krav om start uten brukerhandling | Minimal worker i F2 |
| B-09 | Hvilke driftsverdier gjelder? | Kapasitet, svartid, køalarm, rate limits, oppbevaring av stagingfiler | Tall i 3.3 er forslag uten kilde | Driftsansvarlig, ikke utpekt | Lastforutsetninger, Catendas kvoter, fristkrav | Akseptkriterier for kapasitet og varsling i F3 |
| B-11 | Hvilken tidskilde og forvaringskjede skal eksporten bygge på? | Servertid med synkroniseringsgaranti; ekstern tidsstempling; begge | Ingen | Oppdragsgiver med driftsansvarlig, ikke utpekt | Krav ved preklusjonstvist | Eksport i F4 |
| B-12 | Hvilken plattform skal basen og backend kjøre på? | Database: Azure Database for PostgreSQL (Flexible Server, 17), Supabase eller Azure SQL Database. Backend: Azure Container Apps eller App Service (Web App for Containers) | Databasen er avgjort 11.10 med [B-12, databasen](vedtak.md#b-12-databasen): Azure SQL Database. Hostingen av backenden er åpen. Begge hostingvalgene virker; Container Apps har jobber som kan drive workeren (B-07). Grunnene står i [B-12, databasen](vedtak.md#b-12-databasen). Azure SQL krever et nytt datalag i T-SQL. Fabric er rapportering, ikke backend | Oppdragsgiver med IKT | IKTs bekreftelse av forbeholdet i B-12, databasen. Svar fra IKT om hosting, og tilgang til deploy, Key Vault og en offentlig HTTPS-adresse for Catenda-webhooks | Container og utrulling i F0b. Veien fra migrasjonsfil til base. Plattformkonfigurasjon i F5 |
| B-16 | Hvordan dokumenteres og behandles feilregistrerte, låste opplysninger? | Dokumentert manuell prosess; eksplisitt rettelseshendelse med referanse til originalen; annen avklart prosess | Bevar originalen og skill korrigert opplysning fra rettslig virkning. Ingen automatisk flytting av frist eller omgjøring av sendt brev. | Oppdragsgiver med domeneansvarlig | Eksempler på feil dato/metode/referanse, aktørrettigheter, godkjenning, motpartsinnsyn og virkning | Korrigeringsfunksjon og produksjonsport. Blokkerer ikke låsingen etter SK-12 |

> **Merknad 15.10:** B-16 er avgjort i retningen med [MM-U21](vedtak.md#mm-u21). Det gjenstår av B-16: aktørrettigheter, godkjenning og innsyn for motparten.

**Avgjorte beslutninger.** Vedtakene står i 3.1. Radene og merknadene slik de
stod i 3.4 før sluttredigeringen 09.10, er i Git (se toppteksten).

- **B-02** tilgangsmekanisme: alternativ C med transport T2 og punkt 3–6,
  avgjort 23.09. Grunnlaget er [det første designgrunnlaget](../design-b02-tilgangsmekanisme-2026-09-22.md)
  (TM-01–TM-08), [reviewet](../review-b02-tilgangsmekanisme-2026-09-23.md)
  (RB2-01–08) og [design v2](../design-b02-tilgangsmekanisme-v2-2026-09-23.md)
  (TM-09–TM-12).
- **B-03** dokument- og brevmodell: hovedvalget avgjort 03.10 (brev, ikke samlet
  saksdokument) og dokumentet 10.10 ([B-03, dokumentet](vedtak.md#b-03-dokument)), med
  [MM-U10](vedtak.md#mm-u10) om flere spor i ett brev.
- **B-04** tilbakekalling: avgjort 23.09. Vedtaket står i merknaden til B-04 i 3.1.
- **B-06** fullmakt når dagmulktssats mangler: avgjort 18.10 med
  [GFK-U3](vedtak.md#gfk-u3) og [GFK-U4](vedtak.md#gfk-u4). Raden er tatt ut av
  tabellen 24.10 (#1020).
- **B-08** KOE-eksklusivitet: avgjort 08.10 med [EO-U3](vedtak.md#eo-u3).
- **B-10** versjonering av hendelsesformat og regler: avgjort 10.10
  ([B-10](vedtak.md#b-10)), med [HF-U1](vedtak.md#hf-u1) og [HF-U2](vedtak.md#hf-u2) om lagringsformatet og
  [MM-U15](vedtak.md#mm-u15)–[MM-U17](vedtak.md#mm-u17) om visningen, regelendringen og registrert
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
- **B-15** serverbasert forhåndsvurdering: avgjort 09.10 ([B-15](vedtak.md#b-15)).
- **B-17** skriver for KOE-saker: avgjort 09.10 ([B-17](vedtak.md#b-17)), med merknaden
  samme dag om endringsordre og forsering.
- **B-18** serverplassering: avgjort 10.10 ([B-18](vedtak.md#b-18)), med
  [LV-U1](vedtak.md#lv-u1) om leveringen.
- **B-12, databasen:** avgjort 11.10 ([B-12, databasen](vedtak.md#b-12-databasen)), med
  [B-19](vedtak.md#b-19) om når databasen byttes. Hostingen er åpen.

> **Merknad 2026-10-10 til B-01:** etter [OV-U1](vedtak.md#ov-u1) trengs B-01 først i
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

> **Merknad 2026-10-11 til B-01 og B-07 ([B-12, databasen](vedtak.md#b-12-databasen)):**
> alternativ (b) i B-01, hendelsenes `jsonb` med GIN-indeks, og tabellen med
> `SKIP LOCKED` og `pgmq` i B-07 er PostgreSQL-former. I Azure SQL svarer en
> beregnet kolonne med `JSON_VALUE` og vanlig indeks til (b)
> ([vurderingen av JSON i Azure SQL](../vurdering-json-azure-sql-2026-10-11.md), AJ-04; K 11.10),
> og en tabell hentet med `READPAST` og `UPDLOCK` til `SKIP LOCKED`
> ([designnotatet om inbox og outbox](../design-durable-inbox-outbox-2026-09-17.md#5-azure-sql-eller-bli-på-postgres); H).
> Beslutningsstatus er uendret: åpen.

> **Merknad 2026-10-18 til B-07:** arbeidsvalget for drivmekanismen står i
> [#741](https://github.com/khjohns/endringsmeldinger/issues/741) (kommentaren
> 18.10), godkjent av oppdragsgiver for runden: en jobbtabell i SQL Server hentet
> med `READPAST` og `UPDLOCK`, drevet av en løkke i TS-serveren. Den er bygget for
> topicen i Catenda (L-1a, `database/migrasjoner/20261018100000_jobber.sql` og
> `server/jobber.ts`). Skalering til null og hostingen (B-12) er åpne, så
> beslutningsstatus er uendret: åpen.

> **Merknad 2026-10-11 til den samlede merknaden 09.10 om B-12, ved sluttredigeringen:**
> den samlede merknaden er skrevet før databasen ble avgjort. Punktet 29.09
> viser hva som var PostgreSQL-spesifikt da (L 29.09); siden er TS-lagringen i
> `server/` og `sprakprove/kjernelagring/` kommet til (L 11.10). Når byttet
> skjer, står i [B-19](vedtak.md#b-19). «Lokal PostgreSQL inntil videre» gjelder til
> datalaget for Azure SQL finnes.

<a id="b-12-merknad-2026-10-11"></a>
> **Merknad 2026-10-11 til B-12:** [RP-U1](vedtak.md#rp-u1) er en forutsetning for
> plattformvalget. Lagringsformen, utsagnene i egne tabeller eller ett dokument
> per brev etter designnotatet, avgjøres sammen med B-12 og senest før
> KOE-byttet skriver den første reelle hendelsen, fordi lagrede hendelser ikke
> skrives om til et nytt format ([B-10](vedtak.md#b-10)). Til da gjelder ett dokument
> per brev etter designnotatet (oppdragsgiver 11.10). Grunnlaget er
> [vurderingen av JSON i Azure SQL](../vurdering-json-azure-sql-2026-10-11.md)
> og sparringen i [#391](https://github.com/khjohns/endringsmeldinger/issues/391).
> Databasen er avgjort samme dag med [B-12, databasen](vedtak.md#b-12-databasen); hostingen er åpen.
> Lagringsformen er ikke avgjort med databasen (#395).

> **Merknad 2026-10-24 til B-12 (#1020):** lagringsformen er avgjort 12.10 med
> [HF-U3](vedtak.md#hf-u3): hvert brev lagres samlet som ett dokument. Raden om
> lagringsformen er tatt ut av avsnitt 6. Hostingen er fortsatt åpen.

> **Merknad 2026-10-13 til B-12 ([B-12, databasen](vedtak.md#b-12-databasen)):** IKT har
> svart på spørsmålene A1–A6 i
> [#78](https://github.com/khjohns/endringsmeldinger/issues/78), gjengitt av
> oppdragsgiver 13.10.
>
> - **Forbeholdet:** IKT bekrefter at appen får en egen Azure SQL Database, serverløs,
>   på et nivå som støtter speiling til Fabric. Nivået velges etter behov, ytelse og
>   kostnad. Forbeholdet står til speilingen er prøvd mot en database i Azure
>   (oppdragsgiver 13.10). Ikke kjent: om speilingen virker med serverløs base
>   med automatisk pause, og om den leser gjennom radsikkerheten eller forbi den.
> - **Sorteringen** `Latin1_General_100_BIN2_UTF8` kan legges til grunn (SQ-08 i
>   [prøven](../prove-azuresql-2026-10-11.md)). IKT ser ikke behov for å sette
>   `READ_COMMITTED_SNAPSHOT`, akselerert gjenoppretting eller kompatibilitetsnivå.
>   I Azure SQL Database er de to første på som standard
>   ([prøven, avsnitt 7](../prove-azuresql-2026-10-11.md#7-sql-server-i-docker-mot-azure-sql-database)),
>   så testbasen i Docker må ha samme innstillinger
>   ([#488](https://github.com/khjohns/endringsmeldinger/issues/488)).
> - **Identiteten:** appen kobler seg til basen med systemtildelt managed identity
>   på Azure Web App. Identiteten gjelder appens tilkobling, ikke brukerne:
>   innloggingen er fortsatt OAuth via Catenda, og prosjekt, side og team settes
>   som kontekst for transaksjonen (B-02, alternativ C). Flere identiteter uten
>   person er mulig, men tidkrevende for IKT. Antall og type avklares med IKT ut
>   fra en oversikt over arkitekturen og behovet.
> - **Hostingen:** IKT har satt opp App Service. Er ikke Container Apps et bedre
>   alternativ, velges App Service (oppdragsgiver 13.10). Beslutningsstatus for
>   hostingen er uendret: åpen.
> - **Tilgangsmekanismen:** IKT oppgir at Azure SQL Database støtter radsikkerhet,
>   `SESSION_CONTEXT`, lagrede prosedyrer med eierskapskjede, triggere, egne
>   skjemaer og roller. Ingen retningslinje hos IKT utelukker alternativ C. IKT har
>   ikke brukt radsikkerhet før.

## 4. Funnregister

<a id="status-2026-09-18"></a>
Én linje per etablert ID. Ved overlapp arbeides saken under én ID, og de andre
viser dit. Pakkene er beskrevet i avsnitt 5. Kilden er auditen der funnet ble
gjort; senere statusendringer står i denne planen. Avsluttede funn uten pakke som
gjenstår, står i [arkivet](arkiv.md#4-avsluttede-funn) (#1020). ID-ene der er fortsatt
etablert, og kontrollene som slår opp en funn-ID, leser begge.

**Statusord:** *Lukket*, *Lukket med restanse*, *Delvis*, *Åpen*, *Avgrenset*
(vedtatt, ikke feil), *Bortfalt* (påstanden holdt ikke), *Duplikat*,
*Avvist* (rettes ikke, med begrunnelse), *Regel* (ført inn i arbeidsreglene).

### 4.1 Godkjenning og levering: AP, S, RV, SA

Kilder: [AP](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md),
[S](../audit-sikkerhetsarkitektur-2026-09-17.md),
[RV](../audit-review-astra-2026-09-17.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AP-04 | Åpen, høy | Gammel opprettelse kan slette metadata til vellykket utstedelse. Samme sak som AR-06 og TST-03. Løses bare av felles transaksjon med samordnet låsing, kommandoidempotens og atomisk leveringsintensjon. En ekstra sjekk før sletting eller vern av aktiv lease er ikke nok (RTB-03) | Streng `xfail` ×2, K 22.09 (JSON-lager) | F2 |
| RV-02 | Åpen, høy | Policyretur midt i utstedelse. Samme sak som GFK-03. Løses ved at policy og pakke låses i samme kommando. «Ikke rør pakker med aktiv lease» er ikke nok alene (RTB-03) | Streng `xfail`, K 22.09 (SQLite) | F2 |
| RV-03 | Lukket med restanse | Policy nøkles på `user_id`. Restanse: policyoppføringene må få `user_id` før produksjon | H | F5 |
| RV-06 | Lukket med restanse | Data API stengt for `anon` og `authenticated`. Restanse: slå av anonym innlogging og OAuth-server i Supabase-konsollet; status ikke innhentet | D 18.09 | F5 |
| RV-07 | Lukket med restanse | Lukket som klasse for forseringens lesestier 19.09 (`hent_relaterte_saker` krever `tillatte_saker`). Grensen ligger fortsatt bare i applikasjonen | H | F1 |
| RV-10 | Åpen, høy | `/api/events/batch` lagrer uten leveringsintensjon og viser «clear». Samme sak som INT-05. Ingen kjent klientforbruker (S3) | Streng `xfail`, K 22.09 | F3 |
| RV-12 | Åpen | Webhook: sammenlikning uten konstant tid (INT-01), dedupe før behandling (INT-02), døde `bcf.*`-grener (INT-03) | Se INT | H, F3 |
| RV-13 | Åpen | Rå `str(e)` og åpne driftsruter. Samme familie som CFG-03 og OBS-07 | H | H |
| RV-14 | Åpen, lav | GET-ruter som muterer godkjenningstilstand. Kravet er forbud mot skjulte domeneendringer ved lesing, ikke mot sesjonsvedlikehold og sikkerhetslogging | H | H |
| RV-17 | Delvis | Alle 40 strenge `xfail`-markeringer i backend-testene har `raises=`; AP-04-testen fikk det i T-5 (22.09). Øvrige delpunkter er ikke kontrollert på nytt | L 22.09 (AST) | — |
| RV-18 | Åpen, lav | Dokumenthygiene. Løpende; daterte merknader ved motstrid | H | Løpende |
| RV-19 | Åpen | Pakker valideres ikke mot utstedelsesreglene | H | F2 |
| RV-20 | Åpen | EO-godkjenning avhenger av prosjektregisteret når `daily_rate` mangler | H | F2 |

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

> **Merknad 2026-10-15:** unntaket for sikkerhet over gjelder ikke lenger. Feil i
> Python rettes bare når det er nødvendig for test eller demo og relevant for
> refaktoreringen til TS ([DL-U2](vedtak.md#dl-u2)).

#### Domenet i KOE-, EO- og forseringssakene

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| GFK-01 | Lukket med restanse | Gulvet verdsetter fristdager. Uten kjent sats er gulvet 0 (B-06) | H | D |
| GFK-03 | Duplikat | → RV-02 | — | F2 |
| GFK-04 | Avgrenset | Forsering er vedtatt utenfor godkjenningsflyten. Testen forventer støtte og feiler med `ValueError("Ugyldig vurderingstype.")`, i samsvar med avgrensningen. Ingen feilretting. **Merknad 2026-10-10:** vedtaket er endret av [FO-U6](vedtak.md#fo-u6) (3.1) for vederlagssvaret for forseringen. Funnstatusen er uendret | K 22.09 | — |
| GFK-05 | Åpen | TE kan generere BH-brev som PDF | Streng `xfail`, K 22.09 | H |
| DRF-02 | Åpen, lav | Felt med rettslig innhold fjernes uten feil ved parsing: `dager_siden_varsel` (§ 32.3), `ep_justering_varslet_i_tide` (§ 34.3.3), `er_svar_pa_foresporsel` (§ 33.6.2). Latent: skjemaene fyller dem ikke i dag | K 23.09 (parser), L | D |
| SD-02 | Åpen, lav | En sak der grunnlaget er avsluttet uten krav (trukket, eller avslaget godtatt) før andre krav er sendt, vises som `UTKAST`. Ført inn 23.09 fra [gjennomføringen av spor D](../gjennomforing-spor-d-2026-09-23.md#sd-02-avsluttet-grunnlag-vises-som-utkast) **Merknad 2026-10-05:** godtatt avslag er rettet med vedtaket om #213 (`LUKKET_AVSLATT`); trukket grunnlag gjenstår. **Merknad 2026-10-08:** gjelder også når vederlaget er sendt og trukket med grunnlaget, mens fristen ikke er sendt (rad GR-10 i [domenetabellen](../domenetabell/README.md)). Mens saken står som `UTKAST`, godtas også en oppdatering av det trukne grunnlaget (GR-12); `CASE_NOT_CLOSED` avviser den først når saken er `LUKKET_TRUKKET` | Streng `xfail` for trukket, K 05.10 | D |
| SD-04 | Åpen, lav | Et nytt fullt BH-svar lar andre svarfelt fra forrige svar stå når de ikke sendes, som SD-01 gjorde for det subsidiære standpunktet. Kjørt for `ny_sluttdato`, som står igjen etter et revidert avslag. Lest for `frist_for_spesifisering`, `bh_metode`, `varsel_justert_ep_ok`, `begrunnelse_varsel` og `bh_begrunnelse`. Noen felt er historiske handlinger og skal stå, som `har_bh_foresporsel` og `dato_bh_foresporsel` (§ 33.6.2). Funnet i code-review av SD-01 29.09 | Streng `xfail`, K 29.09 | D |
| SK-02 | Delvis | Et oppdatert vederlags- eller fristkrav åpner ikke sporet når forrige svar var godkjent, godtatt eller trukket. Status og aksept fra forrige svar blir stående; et fullt godkjent krav på 100 000 kr som økes til 250 000 kr, står som `GODKJENT`, og saken blir `OMFORENT` med utstedbar EO når fristen godkjennes. Tiltenkt atferd er vedtatt 05.10 (3.1). **Merknad 2026-10-09:** rettet for godkjent og godtatt svar i `6e4c2d8` (#297, #274). En ny kravversjon åpner sporet, og en aksept av forrige svar faller. De to reproduksjonene for vederlag er ordinære tester med uendrede assertions: `test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar` og `test_oppdatert_krav_etter_aksept_opphever_aksepten`. Fristsporet er kjørt i økta, ikke lagt inn som test. Det trukne kravet gjenstår: en oppdatering av et trukket krav godtas, og sporet står som `TRUKKET` (streng `xfail` `test_trukket_krav_kan_ikke_oppdateres`, rad KA-14 i [domenetabellen](../domenetabell/README.md), #256) **Merknad 2026-10-09:** [KA-U7](vedtak.md#ka-u7) endrer tiltenkt atferd for spor med enighet: der avvises en ny kravversjon, og enigheten står. Rettingen i `6e4c2d8` følger vedtaket 05.10 og rettes ikke i Python (merknaden 09.10 over) | Streng `xfail` for trukket, K 2026-10-09 | D |
| SK-04 | Delvis | Frafall (§ 32.3 c) gir grunnlaget status `TRUKKET`, en status som ellers betyr at TE har trukket kravet. Godtar TE avslagene på vederlag og frist etterpå, blir samlet status `UKJENT`. Mengdene for «inaktiv» og «ferdig» spor er ulike i kaskadene, `kan_utstede_eo`, reaktiv EO og aksept. **Merknad 2026-10-09:** `UKJENT` er rettet i `4cdd012` (#297, #274). Frafalt grunnlag regnes som avklart (`GrunnlagTilstand.avklart`), og saken blir `OMFORENT` når avslagene er godtatt (GR-U3, rad GR-15). `test_frafall_med_godtatte_avslag_gir_ikke_ukjent` er ordinær test med uendret assertion. Gjenstår: grunnlaget har fortsatt status `TRUKKET`, ikke `FRAFALT` etter vedtaket 05.10 (rad GR-13, #257), og mengdene er ikke samlet ett sted | Streng `xfail` for status (GR-13), K 2026-10-09 | D |
| SK-05 | Åpen, lav | `neste_handling` håndterer ikke et grunnlag i `UNDER_FORHANDLING` (§ 32.2-preklusjon). Ført under issuet for SK-01 | K 2026-10-05 | D |
| SK-06 | Åpen, lav | Forseringskandidater og avslåtte dager regnes av `frist.bh_resultat == "avslatt"` alene, fire steder i `forsering_service.py`, også `valider_grunnlag_fortsatt_gyldig`, som melder «BH har endret standpunkt» når dagene er godkjent subsidiært. Et fristkrav som er prinsipalt avslått gjennom ansvarsgrunnlaget, men subsidiært godkjent, er ikke kandidat; delvis avslag teller ikke **Merknad 2026-10-09:** tiltenkt atferd er [FO-U1](vedtak.md#fo-u1) (3.1) | L | D |
| SK-07 | Åpen, lav | Visninger kaller sporets eget resultat prinsipalt når hele svaret er subsidiært: resultatboksen i `FristForm` og `VederlagForm` («godkjenner kravet prinsipalt»), og summen «Prinsipalt godkjent» i prosjektoversikten, som summerer `cached_sum_godkjent` | L | D |
| SK-08 | Åpen, lav | `ActionBar` sammenlikner `frist.krevd_dager` med `undefined`, men API-et sender `null`. Et fristspor uten innsending vises som «Varslet – ikke spesifisert», og TE får «Spesifiser krav» i stedet for «Send fristvarsel». Samme mønster som #184 | L | D |
| SK-09 | Åpen, lav | Typen `OverordnetStatus` i frontenden har `SENDT`, som backend aldri lager, og mangler `INGEN_AKTIVE_SPOR` og `UKJENT`, som backend kan lage. De uttømmende kartene over samlet status er derfor uttømmende over feil mengde | L | D |
| SK-10 | Åpen, lav | Reproduksjonen av TST-04 leter etter `backend/docs/openapi.yaml` relativt til `backend/`, der pytest kjører. Den kan ikke bli XPASS selv om spesifikasjonen lages | L | D |
| SK-11 | Åpen, lav | Svarmodellene og validatorene har felt uten virkning: `bh_metode` fylles fra `vederlagsmetode`, som ingen klient sender, mens `oensket_metode` lagres uten å projiseres; `akseptert_kategori`, `ep_justering_akseptert` og `frist_for_spesifikasjon` leses ikke av noen; `validate_vederlag_event` krever varsel ved `inkluderer_rigg_drift` og `inkluderer_produktivitetstap`, som ingen modell har | L | D |
| SK-12 | Åpen, lav | Et senere krav fra TE kan flytte datoen for et varsel som alt er registrert: `_handle_frist` og `_handle_vederlag` overskriver `frist_varsel`, `rigg_drift_varsel` og `produktivitetstap_varsel` med hvert nytt krav, med mindre et konsekvensvarsel er registrert. Kjørt: § 33.4-varselet 02.09 ble 01.08 og 01.07. Journalen beholder datoen, men skjema, visning og brev leser tilstanden. Tiltenkt atferd er vedtatt 05.10 (3.1) | Streng `xfail` med kontrollsak, K 2026-10-05 | D |
| SK-13 | Åpen, lav | Forseringsrutene for byggherrens svar, stopp og kostnader returnerer tilstanden utenom `public_state` (`_get_updated_state`). Om det har betydning for skjermingen, er ikke vurdert; notatene ligger ikke lenger i journalen (MS-05) | L | D |
| DT-02 | Åpen, lav | `claims()` i `approval_service.py` regner enhver hendelse som begynner med sporets navn som krav, også et frittstående konsekvensvarsel på vederlag, trekk og byggherrens innsigelse og forespørsel. Projeksjonen og frontenden gjør det ikke. Etter et konsekvensvarsel på et spesifisert vederlagskrav avviser `validate_items` begge mulige `claimId`: kravet gir «Kravet er endret», varselet gir «Svaret må gjelde gjeldende krav». Byggherren kan da ikke sende vederlagssvar gjennom godkjenningsflyten før TE sender en ny kravversjon. For innsigelse og forespørsel er avviket ikke nåbart, fordi fristsporet da ikke kan besvares. Tiltenkt atferd er KA-U2 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-04 | Åpen, lav | En ny kravversjon av grunnlaget med uendret underkategori åpner ikke sporet. Etter et avslag blir grunnlaget `SENDT`, men svaret står i tilstanden (`bh_resultat`, `respons_event_id`), og TE kan godta det: saken blir `LUKKET_AVSLATT` uten at byggherren har svart på versjonen. Etter preklusjon etter § 32.2 blir grunnlaget stående i `UNDER_FORHANDLING`. `_handle_grunnlag` lar bare endret underkategori (#215) og status `AVSLATT` gi nytt svar. Tiltenkt atferd er GR-U1 (3.1). **Merknad 2026-10-08:** aksepten av forrige svar avvises nå (#272, rad GR-06). At svaret står i tilstanden og grunnlaget i `UNDER_FORHANDLING` etter preklusjon, er fortsatt åpent (GR-04, GR-05) | Streng `xfail`, K 2026-10-08 | D |
| DT-05 | Åpen, middels | En endringsordre kan utstedes i en KOE-sak (`eo_utstedt`), og `_close_spor_for_reactive_eo` skriver sporene om. Den kan utstedes flere ganger, fordi `kan_utstede_eo` blir stående `true`. Beløp og dager i endringsordren erstatter de avtalte, også med `None` når endringsordren ikke har beløp. Et godtatt avslag og et spor TE aldri har sendt, blir `GODKJENT`. TE kan ikke godta eller bestride den (`IS_EO_CASE`). Projeksjonen leser også toppnivåfeltene i DM-06. Mengden behandleren hopper over (`IKKE_RELEVANT`, `TRUKKET`), er en annen enn den `kan_utstede_eo` hopper over (`IKKE_RELEVANT`, `UTKAST`). Frontenden og godkjenningskommandoen bruker ikke veien, og med godkjenningspolicy stopper `public_event_block_reason` den. Tiltenkt atferd er EO-U1 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-06 | Åpen, lav | `kan_utstede_eo` følger ikke rollupen. Godkjent grunnlag der vederlag og frist ikke er sendt, gir `true` mens saken er `UNDER_BEHANDLING`, og det samme gjør godkjent vederlag der fristen ikke er sendt. Kandidatregelen for EO-saker (`_is_agreed_koe`) krever i tillegg et godkjent vederlag eller en godkjent frist, så de to er uenige. Tiltenkt atferd er EO-U2 (3.1). Samme mønster som mengdene i SK-04 | Streng `xfail`, K 2026-10-08 | D |
| DT-07 | Åpen, lav | En KOE-sak som inngår i en EO-sak, viser det ikke. `kan_utstede_eo` er fortsatt `true`, og `neste_handling` ber byggherren utstede en endringsordre. Projeksjonen ser bare sakens egne hendelser, og tilknytningen står i EO-saken. Kandidatregelen i `EndringsordreService` leser EO-sakene (`_linked_koe_ids`). Tiltenkt atferd er EO-U3 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-08 | Åpen, lav | Gjennom `/api/events` kan byggherren knytte en KOE-sak til en EO-sak uten kandidatkontrollen. `eo_koe_lagt_til` har bare regelen `IS_EO_CASE`, så en KOE-sak som ikke er omforent, eller som alt inngår i en annen EO-sak, godtas. Kontrollen ligger i `EndringsordreService` og gjelder bare `/api/endringsordre`. Lesingen er avgrenset av `cases_in_project` (RV-07), så prosjektgrensen holder. Tiltenkt atferd er EO-U2 og EO-U3 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-09 | Åpen, lav | EO-sakens livsløp er løsere enn vedtatt. `eo_utstedt` i en EO-sak har ingen regel og godtas på nytt, også etter aksept: endringsordren får status `UTSTEDT` igjen, nye beløp, og TEs aksept forsvinner fra tilstanden. `EO_IS_ISSUED` godtar revisjon uten bestridelse, to bestridelser og aksept etter bestridelse. `eo_koe_lagt_til` og `eo_koe_fjernet` godtas etter utstedelse og aksept gjennom `/api/events`, mens `legg_til_koe` og `fjern_koe` krever `UTKAST`. Tjenesten skriver opprettelse og utstedelse i samme transaksjon, så de to kan i praksis bare brukes gjennom `/api/events`. Tiltenkt atferd er EO-U4 (3.1) | Streng `xfail`, K 2026-10-08 | D |
| DT-10 | Åpen, lav | En utstedelse uten KOE-liste sletter KOE-tilknytningen. `_handle_eo_utstedt` bygger `endringsordre_data` på nytt av hendelsen, så tilknytningen fra `eo_opprettet` og `eo_koe_lagt_til` forsvinner når `eo_utstedt` ikke gjentar den. `opprett_endringsordresak` gjentar den alltid; `/api/events` krever det ikke. Om en tom liste i utstedelsen betyr «ingen KOE-saker» eller «ikke oppgitt», er ikke vedtatt; tabellen bruker det siste som arbeidshypotese (rad EO-24) | Streng `xfail`, K 2026-10-08 | D |
| SP-01 | Åpen, lav | Klientspeilet runder beløp annerledes enn serveren. `tilOre` i `src/lib/domain/vederlagDomain.ts` runder via `toPrecision(15)`, mens `regler.belop` går via `str()` og `Decimal`. 1234567,8949999998 blir 1234567,90 i klienten og 1234567,89 på serveren, og fra omtrent 1e13 kr mister klienten øre (10000000000000,006 blir 10000000000000,00 mot ,01). Serveren avviser da svaret med `RESULT_MISMATCH`. Skjemaet tar bare hele kroner fra byggherren, men TEs krav kan ha desimaler. Funnet i språkprøven (#274), der TS-kjernen regner i hele øre med samme semantikk som `Decimal` | K 2026-10-08 (formelen kjørt med Node; tabellen i `sprakprove/grensetilfeller.json` holder for `regler.belop`) | D |
| SP-03 | Åpen, lav | Lagret `data` avhenger av hvem som skrev hendelsen. Pydantic-modellene lagrer standardverdier og beregnede felt som klienten ikke sendte: `vedlegg_ids`, `varsler`, `er_estimat`, `krever_justert_ep`, `varsel_type` og `varslet_for_oppstart`, og i vederlagskravet `krevd_belop` og `netto_belop` (`computed_field`). Kontrakten (`rad`) beskriver dem ikke, og TS-serveren i språkprøven lagrer dem ikke. Begge leser tilstanden likt, men raden i den append-only journalen blir ulik, og beregnede beløp lagres ved siden av kravet de er regnet av. Funnet i språkprøven (#274). **Merknad 2026-10-19:** belegget var `BARE_PYTHON`-sjekken i `backend/tests/test_database/test_sprakprove_ts_server.py` ([ad92579](https://github.com/khjohns/endringsmeldinger/blob/ad92579/backend/tests/test_database/test_sprakprove_ts_server.py)). Testen er slettet i #935 etter avgjørelsen i #764 (svar 10 og 11), og funnet prøves ikke lenger i CI. Funnstatus er uendret | K 2026-10-09 (`BARE_PYTHON` i `tests/test_database/test_sprakprove_ts_server.py`) | D |
| SP-04 | Åpen, lav | Projeksjonen knytter et svar til kravet som er gjeldende når svaret leses, ikke til kravet svaret viser til. Innsendingen kontrollerer referansen, men lesingen bruker den ikke: `bh_respondert_versjon` regnes av antall kravversjoner i `services/timeline_service.py`, og `anvend` i TS-kjernen bruker gjeldende krav. Med én kontrollert skriver gir det samme resultat. En eldre eller fremmed rad med en annen referanse knyttes til feil krav. Gjelder begge implementasjoner. Funnet i språkprøven (#274), og tas i gjennomgangen av målmodellen (#300) | L 2026-10-09 (`services/timeline_service.py`, `sprakprove/kjerne/sak.ts`) | D |
| SP-02 | Åpen, lav | `dato_sendt` i et varsel valideres ikke som dato. `VarselInfo.dato_sendt` er en fri tekst, og validatorene sjekker bare at den finnes. Kontrakten (`kontrakt.json`, `varselinfo`) sier `YYYY-MM-DD`, men har ikke noe mønster. En ugyldig dato som 2026-02-30 lagres i journalen og kan ikke rettes (SK-12). Funnet i språkprøven (#274) | L 2026-10-08 (`models/events.py`, `api/validators.py`) | D |

#### Tilgang, database, integrasjon, frontend, konfigurasjon og test

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AUT-03 | Lukket for batchruta | Batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH` før skriving (`783c64d`). Den strenge `xfail`, som forventet 201, er erstattet av en ordinær test: avvisningen skjer, og ingenting skrives, heller ikke `last_event_at` (T-1, 22.09). Påstanden gjelder bare batchruta | K 22.09, L | F0 |
| AUT-04 | Åpen | CSV-metadatalageret mangler `list_by_sakstype`. Samme mekanisme som TST-01 | Streng `xfail` (statisk) | H |
| AUT-05 | Åpen, lav | Kandidatliste for forsering uten prosjektfilter på Catenda-topics. Ikke kontrollert på nytt | H | F1 |
| DB-04 | Delvis | `prosjekt_id` lagt til (5a). Fremmednøkler mangler fortsatt i migrasjonskjeden. Testen leser bare den første fila (T-2) | L 22.09 | B-01, F2 |
| DB-05 | Åpen, besluttet | `viewer` skal finnes. Ikke bygget | Streng `xfail` (statisk) | F1 |
| INT-01 | Åpen | Webhookhemmelighet uten konstant tid; sti i logg | Streng `xfail` (statisk) | H |
| INT-02 | Åpen, høy | Webhookfeil gir 200 og reservert duplikatnøkkel; retry tapes | Streng `xfail`, K 22.09 | F3 |
| INT-03 | Åpen | Validatoren avviser `bcf.*` | Streng `xfail`, K 22.09 | F3 |
| INT-05 | Duplikat | → RV-10 | — | F3 |
| INT-06 | Åpen | Global `.env` overstyrer sakens Catenda-prosjekt | Streng `xfail`, K 22.09 | F2, F3 |
| FE-02 | Åpen, middels | `/api/cases/<sak_id>/context` gir ikke autorisert rolle. Serveren holder (19.09). Testen som testinventaret førte som FE-01, feilet på 403 i sitt eget oppsett. Oppsettet er rettet (T-3, 22.09); den strenge `xfail` feiler nå på målassertionen om rolle | K 22.09 (testoppsett) | H |
| FE-03 | Åpen | Svelte-skjemafelt reagerer ikke på nye props | H | H |
| FE-06 | Inkonklusiv | Påstand om interpolering i `LetterHtmlPreview.svelte` er verken bekreftet eller avkreftet | H | H |
| CFG-01 | Åpen | Flask starter i produksjon med standardnøkkel | Streng `xfail`, K 22.09 | H |
| CFG-02 | Åpen | `CSRF_SECRET` brukes ikke. Testinventaret førte som CFG-03 | Streng `xfail` (statisk) | H |
| CFG-03 | Duplikat | → RV-13. Testinventaret førte som CFG-04 | Streng `xfail`, K 22.09 | H |
| CFG-04 | Åpen | Usatt `APP_ENV` gir ulik tolkning. Testinventaret førte som CFG-02 | Streng `xfail`, K 22.09 | H |
| CFG-05, CFG-06, CFG-07 | Åpen | Supabase-nøkler utenfor `Settings`; død `CORS_ORIGINS`; relativ `env_file` | Streng `xfail` | H |
| TS2-01 | Åpen, middels | Usatt `EVENT_STORE_BACKEND` gir JSON-lageret på lokal disk uten advarsel; metadata tilsvarende CSV. Banneret viser «csv». Ført inn 22.09 fra [TST-02-notatet](../gjennomforing-tst02-2026-09-22.md#ts2-01--json-lageret-er-standardverdien) | L 22.09 | H |
| OBS-01, OBS-02 | Åpen, høy | Ett funn (19.09): ingen forretningshendelse revisjonslogges, og 403-avvisninger når ikke feilhåndtereren | Streng `xfail`, K 22.09 | F1 |
| OBS-05 | Åpen | Hendelser mangler korrelasjons-ID. Testinventaret førte som OBS-04 | Streng `xfail` (statisk) | F1 |
| OBS-06 | Åpen | `X-Request-ID` uten validering; 32-bits server-ID. Testinventaret førte som OBS-01 | Streng `xfail`, K 22.09 | H |
| OBS-07 | Åpen | Rå unntakstekst ved `app.debug`. Samme familie som RV-13. Testinventaret førte som OBS-05 | Streng `xfail`, K 22.09 | H |
| TST-01 | Åpen | Samme mekanisme som AUT-04. Mangel på integrasjonstester dekkes i F0 | Streng `xfail` (statisk) | F0, H |
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
| AR-06 | Duplikat | → AP-04 | — | F2 |
| AR-07 | Åpen, lav | Inert e-postpolicy på `project_memberships`. Fjernes med tabellen | D 20.09 | F1 |
| AR-08 | Åpen, lav | Seks av ni driftdetektorer feiler | H | H |
| DA-04 | Lukket i repo | Fila har basens versjon. Historikken inngår i DA-03 | D 20.09 | F0 |
| DA-08, DA-09 | Åpen | `user_groups` og `magic_links` fjernes. → MS-15 | D 20.09 | F1 |
| DA-10 | Åpen | `project_memberships` fjernes etter at `viewer` finnes i `app_project_memberships` | D 20.09 | F1 |
| DA-11 | Åpen, høy | → AR-01 | — | F1 |
| DA-13 | Åpen | → B-01 | — | F2 |
| DA-14 | Åpen | `cached_*`-kolonnene → MS-06, MS-07 | — | F2 |
| DA-15 | Åpen, lav | BIM-flaten har ingen eier. P2 og P3 sier at den er relevant. Se også DM-02 i 4.6 (29.09) | — | F4 |
| MS-02 | Åpen | Append-only håndhevet av basen, mot omskriving og uautorisert tilføying. Merk at `hendelse` og `notat` har fremmednøkkel til `sak_metadata` med `ON DELETE CASCADE`; kaskaden må inngå i rettighetsmodellen | L 22.09 | F1 |
| MS-03 | Delvis | `UNIQUE (sak_id, versjon)` finnes i migrasjonen. Regler for rebase ved konflikt mangler | L 22.09 | F2 |
| MS-05 | Gjennomført | `notat` utenfor journalen. Teamvern i datalaget gjenstår (AF-01) | D 21.09 | F1 |
| MS-06, MS-07 | Åpen | Register og projeksjon; én skriver i hendelsens transaksjon | L | F2 |
| MS-08 | Åpen | Revurderes (AF-03). → B-01 | — | F2 |
| MS-09 | Åpen | Erstattet som mål av AF-01 | — | F1 |
| MS-11 | Åpen | Hash supplert av AF-04 | L | F2, F4 |
| MS-12 | Åpen | Prosjektkonfigurasjon inn i `projects`. Må ikke hindre frosset mål og konfigurasjonsversjon i F2 | — | F3 |
| MS-13, MS-14 | Åpen, lav | BIM som hendelser; IFC-egenskaper fryses | — | F4 |
| MS-15 | Åpen | `magic_links`, `user_groups`; `project_memberships` etter DB-05 | D 20.09 | F1 |
| DM-01 | Lukket | Åtte kolonnekommentarer (`cached_*` i `sak_metadata`) finnes i basen, men ikke i migrasjonene. Kolonnesummen fanger det ikke. Rettes i en ny migrasjon når B-12 har avgjort hvor beskrivelser skal ligge. **Merknad 2026-10-09:** basen er Supabase-prosjektet, som ikke brukes i det videre arbeidet (merknaden til B-12). Kommentarene der rettes ikke; migrasjonene er kilden | K 29.09 | Spor M, fase 4 |
| DM-03 | Åpen, lav | Migrasjonene legger inn et aktivt prosjekt `oslobygg`, og det er prosjektets eneste. Hver base bygget fra tom får det, også på en ny plattform (B-12) og for en annen virksomhet (P5). Ikke en fallback i koden. Om raden skal ut av migrasjonene, avhenger av hvordan en ny base settes opp | K 29.09 | Spor M, fase 4 |
| DM-05 | Åpen, middels | Skjemaet for ny sak sender `sak_opprettet` som enkelthendelse til `POST /api/events`, men `require_project_access` godtar en sak uten metadata bare på `/api/events/batch`. Innsendingen gir 403 utenfor utviklingsmodus, så saker kan i dag bare opprettes fra Catenda. Oppdragsgiver 29.09: skjemaet skal virke (3.1). Tas batch-ruta i bruk, blir RV-10 aktuell. **Merknad 2026-10-09:** opprettelse av en KOE-sak er skriving i KOE-saken og hører til TS-stien (B-17); rettes ikke i Python (merknaden 09.10 i 4.2) | Streng `xfail`, K 29.09 | Spor M |
| DM-06 | Åpen, lav | Toppnivåfelt utenfor `data` lagres ikke. Projeksjonen leser `endelig_vederlag` og `endelig_frist_dager` på `eo_utstedt` når en endringsordre lukker en KOE-sak, så svaret og `sak_metadata`-cachen viser et beløp journalen ikke har. Bryter invariant 9. Latent: skjermbildene sender ikke feltene. Motsatt for `sak_opprettet`: en `data` fra klienten lagres ordrett, med ukjente nøkler, og skjemaet for ny sak sender den slik. **Merknad 2026-10-09:** rettes ikke i Python (merknaden 09.10 i 4.2). Endringsordren i KOE-saken er avvist som vei (EO-U1), og `sak_opprettet` skal skrives av TS-stien (B-17) | Streng `xfail`, K 29.09 | D |

### 4.4 Målskjemarunden 21.09: KR, MG, RY

Kilder: [KR](../audit-korrekthet-2026-09-21.md),
[MG](../audit-maalskjema-gjennomgang-2026-09-21.md),
[RY](../audit-opprydding-2026-09-21.md).

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| KR-04 | Åpen | `compute_state` gjør navneoppslag. → MG-01, AF-05 | L 22.09 | F2 |
| KR-13 | Lukket | Backfill-skriptet. Faller med RY-01. **Merknad 2026-10-09:** skriptet er slettet (#102), etter unntaket fra AF-06 i 3.2 | H | F4 |
| MG-01 | Åpen | Navneoppslag i beregningslaget. Oppslaget bruker `has_app_context()`, så fravær av HTTP-forespørsel betyr ikke fravær av oppslag | L 22.09 | F2 |
| MG-03 | Åpen | Forsvar i dybden: parseren avviser `event_id` og `tidsstempel`, ikke aktørfeltene. Eksisterende ruter overskriver aktørfeltene fra sesjonen, så klientforfalskning er ikke påvist | Streng `xfail`, K 22.09, L | F2 |
| MG-04 | Åpen, lav | `created_by` har tre verdiformer. → MS-06 | H | F2 |
| MG-05 | Åpen | `ownerName` fryses i godkjenningspakken. Lagre ID ved flytting til databasen | H | F1 |
| MG-08 | Åpen, lav | Serielle navneoppslag. Faller med MG-01 | H | F2 |
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
| DM-02 | Foreløpig | `catenda_models_cache` leses av tre BIM-ruter, som gir tomme lister når den er tom. Ingen kode, funksjon eller trigger skriver den, og `upsert_cached_models` har ingen kaller. Om cachen var ment fylt på en annen måte, er ikke kjent. Hører til flaten i DA-15 | L 29.09, katalogen K 29.09 | Spor M |
| DM-08 | Foreløpig | Fem kolonner viser til en person med navn eller e-post, ikke `app_users.id`: `vedlegg.lastet_opp_av`, `utkast.oppdatert_av`, `sak_bim_links.linked_by`, `projects.created_by` og `project_memberships.invited_by`. Samme klasse som MG-04. Kan ikke kobles sikkert til en bruker, og et innsyn må søke på navn og e-post | L 29.09 | Spor M |

### 4.7 Tellinger

Registeret har ingen samlet «antall åpne feil». Flere ID-er er samme rotårsak,
og antall tester er ikke antall feil. Fordelingen i testinventaret står i
redaksjonsprotokollen, med forklarte kategorier.

## 5. Arbeidspakker

Merknadene til avsnitt 5 om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-5-arbeidspakker).

<a id="nye-arbeidspakker-og-produksjonskrav"></a>
Rekkefølgen følger AF-06: verifikasjon mot ekte database, datalagets grenser
og én komplett EO-flyt før flere adaptere og generell opprydding. Tre parallelle
spor, D, H og M, kan gå samtidig når de ikke tar kapasitet fra F0–F2.
Organisatoriske avklaringer (F5) kan starte nå. For KOE-, EO- og
forseringssakene følger rekkefølgen B-17 og pakken FK (merknaden 09.10 til
AF-06).

«Tester som beviser» er planlagt kontroll. Ingenting her er utført uten at
det står.

> **Merknad 2026-10-20 til avsnitt 5:** Oppdragsgiver svarte 20.10 på spørsmålene
> etter [vurderingen av målbildet](../vurdering-maalbilde-og-ts-overgang-2026-10-20.md).
> Spørsmålene og svarene står ordrett i
> [spørsmålsfila](../vedlegg/vurdering-maalbilde-2026-10-20/sporsmal.md).
>
> - Python skal ut først, og TS overtar alt frontenden kaller (spørsmål 1 og 2).
> - Tilgangene i Azure og B-12 hosting avklares med IKT parallelt (spørsmål 6).
> - OV-U1 står (spørsmål 8).
>
> Den kritiske stien fram til første ekte sak samles i milepælen
> [Første ekte sak](https://github.com/khjohns/endringsmeldinger/milestone/7),
> på tvers av F0b, F1, FK og F5 (spørsmål 4).

### F0 — Verifikasjonsgrunnlag

Merknadene til F0 om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-f0--verifikasjonsgrunnlag).

**Avhenger av:** ingenting. **Status:** delvis. CI kjører backend, frontend,
typesjekk og lint (19.09). Migrasjonene er bygd mot tom PostgreSQL manuelt
(PG16 20.–21.09, PG18 22.09; historisk).

> **Merknad 2026-10-11 til F0 ([B-12, databasen](vedtak.md#b-12-databasen)):** jobben i
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

Merknadene til F0b om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-f0b--datalaget-over-direkte-tilkobling).

> **Merknad 2026-10-11 til F0b ([B-12, databasen](vedtak.md#b-12-databasen), [B-19](vedtak.md#b-19)):**
> oppdragsgiver bestemte 11.10 at F0b får nytt innhold: datalaget i TS over
> direkte tilkobling til Azure SQL. ID og anker er beholdt. Det F0b var for
> Python over PostgreSQL, er historikk (under), og teksten før er i Git (se
> toppteksten). F0b kommer før eller sammen med #310 (FK), og F1 kommer etter
> F0b som før.

**Avhenger av:** B-12, databasen, og B-19 (3.1). Tilgangsmekanismen i B-02
alternativ C prøves tidlig i T-SQL ([B-12, databasen](vedtak.md#b-12-databasen), #395). Lagringsformen er avgjort med
[HF-U3](vedtak.md#hf-u3) (se [merknaden 11.10 til B-12](#b-12-merknad-2026-10-11) og
merknaden 24.10 etter den). Containerdelen avhenger
av hostingen i B-12. Arbeidet følges i
[milepælen F0b](https://github.com/khjohns/endringsmeldinger/milestone/1).

F0b bytter plattformen og veien til basen, ikke rettighetene. Datalaget etter
F0b, før rollene i F1 finnes, er ikke en produksjonstilstand. F1 og produksjonsporten gjelder; F1 er tilpasset Azure
SQL i merknaden 11.10 der.

**Leveranse:**

1. **Kjernen i TS:** direkte tilkobling til Azure SQL med managed identity
   ([B-12, databasen](vedtak.md#b-12-databasen)), pool og en transaksjonshjelper som
   setter kontekst for transaksjonen. `SESSION_CONTEXT` gjelder sesjonen, så
   at konteksten ikke følger en gjenbrukt forbindelse, må bevises på nytt
   (merknaden 29.09 under B-12). Feilklassifisering for driveren: en
   avvisning som aldri kan lykkes, prøves ikke på nytt, og versjonskonflikt
   har en egen klasse.
2. **Migrasjonene i T-SQL** og veien fra fil til base (#53), med en testbase av
   samme slag lokalt og i CI.
3. **Flyttingen fra Python ([B-19](vedtak.md#b-19), #375):** det Python gjør mot
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

   > **Merknad 2026-10-16 til punkt 1:** radsikkerheten og rettighetene for
   > kjøretiden bygges i F0b etter B-02 og prøven, med et uavhengig review i ny
   > økt før merge ([DL-U5](vedtak.md#dl-u5)). Rollene for arbeider, drift, migrering og
   > nødtilgang kommer med det samlede rolledesignet her.

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

> **Merknad 2026-10-11 til F1 ([B-12, databasen](vedtak.md#b-12-databasen), [B-19](vedtak.md#b-19)):**
> F1 gjelder datalaget i Azure SQL. Rollene, teamvernet, append-only og
> rettighetstestene uttrykkes i T-SQL, og mekanismen i B-02 alternativ C prøves
> tidlig der ([B-12, databasen](vedtak.md#b-12-databasen), #395). Testene for `SET ROLE` til `service_role` og Data API-testen
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
> til TS sammen med KOE-sakene (merknaden til [B-17](vedtak.md#b-17)). F2 slik den er
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
>   og integrasjon (B-17). Etter [B-19](vedtak.md#b-19) kan Python beholde dem bare så
>   lenge de ikke leser eller skriver i databasen selv, og Python henter ikke
>   leveringsoppdraget direkte fra basen ([LV-U1](vedtak.md#lv-u1)).
> - Akseptkriteriet om at gamle hendelser leses av ny kode, gjelder mellom
>   TS-versjoner (merknaden til invariant 9). Kriteriet om historiske
>   teststrømmer erstattes av bevis-sakene i domenetabellen, som føres videre
>   (B-17).
> - Fra 11.10 betyr «ekte PostgreSQL» og «PostgreSQL-tester» i
>   akseptkriteriene og testene over en ekte database av samme slag som
>   produksjonen, Azure SQL ([B-12, databasen](vedtak.md#b-12-databasen)).

### FK — KOE-, EO- og forseringsdomenet i TS (B-17)

Merknadene til FK om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-fk--koe--eo--og-forseringsdomenet-i-ts-b-17).

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

> **Merknad 2026-10-10 til FK, runde 3 (#347):** oppdragsgiver har godkjent et
> unntak fra rekkefølgen #309 før #310. Skiva i
> [#347](https://github.com/khjohns/endringsmeldinger/issues/347), en
> gjennomgående prøve av TS-stien, kan gå før #309 er ferdig bygget, parallelt
> med første byggedel av #309. Den endrer ikke `kjerne/`.

> **Merknad 2026-10-10 til FK, runde 4 (#358):** [OV-U1](vedtak.md#ov-u1) avgrenser
> første versjon av TS-stien til KOE-saken og endrer rekkefølgen: #310 kommer før
> byggedel 4 av #309 (endringsordre og forsering) og før § 34.3.3 i byggedel 3.
> Brev om det som avvises, følger [OV-U2](vedtak.md#ov-u2).

> **Merknad 2026-10-11 til FK, rekkefølgen etter B-19:** databasen er Azure SQL
> ([B-12, databasen](vedtak.md#b-12-databasen)). Databasebyttet skjer før eller sammen med #310.
> Derfor forutsetter #310 at det Python gjør mot databasen, er flyttet til TS (#375,
> [B-19](vedtak.md#b-19)), og at datalaget for Azure SQL finnes (F0b). Kjernen i #309 importerer ingen
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

Merknadene til spor D om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-spor-d--domenefeil).

Kan gå parallelt. Hver retting får regresjonstest og holdes innenfor sitt
funn. TFR-02 til TFR-06, GFK-02, GFK-06, INT-07, OBS-03, BR-01 (reprodusert
23.09, rettes etter B-13), DRF-01–DRF-03, SD-01–SD-04, og restansen på
GFK-01 etter [GFK-U3](vedtak.md#gfk-u3).

BH-svar på et nøytralt varsel må slippe forespørselen etter § 33.6.2 gjennom. Deretter systematisk gjennomgang av
tilstandsovergangene mot NS 8407, med dokumentert forventet overgang og test
per hendelsestype. Utvides `SporStatus`, gjelder regelen i
`.claude/rules/python-domene.md` om å lete opp alt som teller statuser.

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

Merknadene til spor M om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-spor-m--datamodell-og-funksjonskart).

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
| B-01 relasjoner | KOE-tilknytningen og relasjonene i FK, byggedel 4 av #309 ([OV-U1](vedtak.md#ov-u1)) |
| B-12 hosting | Container og utrulling i F0b, veien fra migrasjonsfil til base og plattformkonfigurasjon i F5. Databasen er avgjort ([B-12, databasen](vedtak.md#b-12-databasen)) |
| B-07 drivmekanisme | Workeren for leveringen (punkt 3 i F2, som er levering og integrasjon etter merknaden 09.10 til F2) |
| B-09 driftsverdier | Akseptkriteriene for kapasitet og varsling i F3, og grensene for utdatert medlemsliste (B-04) |
| B-05 bevaring, B-11 tidskilde | Eksport og bevaring i F4, og produksjonsporten |
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
| `createLibraryItem` (opplasting) | Samme navn med `failOnDocumentExists=false` ga samme item og én ny revisjon; unikt navn ga nytt item; revisjonsnavnet stemmer. Klienten sender parameterne i headeren `Bimsync-Params`, ikke via en `upload_url` | Samme dokument ved retry; ingen ekstra revisjon | Konfliktsvaret ved `true` er ikke observert. OpenAPI oppgir statuskoden som «25 CONFLICT» | Avhenger av dokumentnøkkelen og navnestandarden ([B-03, dokumentet](vedtak.md#b-03-dokument), #310). Uten sikker gjenfinning: parker, ingen ny opplasting |
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
- En beslutning flyttes fra 3.4 til vedtaksfila, gjennom vedtaksregisteret, med
  dato og hvem som besluttet. B-ID-en står igjen i listen over avgjorte
  beslutninger i 3.4.
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
  bestemmelse inn under en av måtene i [VS-U3](vedtak.md#vs-u3), eller velger mellom
  lesninger av et vedtak som gir ulik atferd. Ellers er det et arbeidsvalg i
  [paragrafmatrisen](../paragrafmatrise-koe-eo-forsering.md): felt, tekst,
  visning og teknisk gjennomføring som bevarer vedtatt innhold og virkning.
  Arbeidsvalget viser til vedtaket det bygger på, med en kort begrunnelse.
  Prinsippene i matrisen kan brukes i begrunnelsen og som utgangspunkt for
  en anbefaling til oppdragsgiver, men de er ikke hjemmel (oppdragsgiver
  11.10, #309).
- Når de daterte merknadene gjør planen tung å lese, flyttes de som bare fører
  det som er levert, og funnene som er avsluttet uten pakke som gjenstår,
  ordrett til [arkivet](arkiv.md) med dato (oppdragsgiver 20.10, #1020).
  Vedtak, funnstatus, ID-er og ankre endres ikke. Merknadene som styrer omfang
  eller rekkefølge, blir stående.

## Verifikasjon og grenser

Verifikasjonen av redigeringene fram til 24.10 står i [arkivet](arkiv.md#verifikasjon-og-grenser-for-redigeringene-før-2410).
Redigeringen 24.10 (#1020) flyttet vedtakene til [vedtaksfila](vedtak.md) og de
avsluttede funnene og leveransemerknadene ordrett til [arkivet](arkiv.md). Vakttestene
i `backend/tests/test_vedtaksregister/` holder vedtaksfila lik registeret, og
`docs/verktoy/lenkekontroll.py` holder lenkene hele. Ingen vedtak, funnstatus,
ID-er eller ankre er endret.
