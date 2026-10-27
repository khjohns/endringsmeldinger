# Dokumentasjonsindeks

`docs/` er en kjede av auditer, planer og referanser bygget opp fra 14. september
2026. Denne fila sier hva som gjelder, hva som er historikk, og hvor man begynner.

**Hovedplanen er autoritativ for rekkefølge og funnstatus, [vedtaksfila](plans/vedtak.md)
for vedtakene og [arkivet](plans/arkiv.md) for de avsluttede funnene (#1020).** Sier et
annet dokument noe annet om et funn, er det andre dokumentet foreldet — rett det,
ikke gjenopprett diskusjonen.
Opphever du et utsagn, skriv en datert merknad, også inn i det gamle dokumentet.

**Arbeid som pågår eller venter, står i GitHub-issues**, samlet i
[én milepæl per arbeidspakke](https://github.com/khjohns/endringsmeldinger/milestones),
og for spor M i [#79](https://github.com/khjohns/endringsmeldinger/issues/79).
Denne indeksen og hovedplanen fører ikke arbeidsstatus; regelen står i
[`AGENTS.md`](../AGENTS.md).

---

## Start her

| Dokument | Hva det gir |
| --- | --- |
| [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Begynn her.** Løpende kilde til rekkefølge og funnstatus: invarianter, føringer, åpne beslutninger, funnregister, arbeidspakker og beslutningene som blokkerer. Toppteksten peker til tidligere versjoner i Git |
| [vedtaksfila](plans/vedtak.md) | Vedtakene, autoritativ for dem. Generert fra vedtaksregisteret. Var avsnitt 3.1 i hovedplanen til #1020 |
| [arkivet](plans/arkiv.md) | De avsluttede funnene og leveransemerknadene til arbeidspakkene, flyttet ordrett fra hovedplanen 24.10 (#1020) |
| [domenetabellen](domenetabell/README.md) | Forventet atferd per rad med kilde og tolkningsstatus, begrepene krav, kravversjon, svar, standpunkt, aksept og enighet, og språkuavhengige bevis-saker som kjøres mot Python-projeksjonen og mot målmodellen. Vedtakene står i vedtaksfila |
| [vedtaksregisteret](vedtaksregister/README.md) | Kilden vedtaksfila lages av, med spørsmålet, alternativene og svaret ordrett for hvert nytt vedtak, og vakttestene. Vedtaksfila er autoritativ |
| [temavisningene](vedtaksregister/temaer/) | Regelgrunnlaget per tema, generert fra registeret: vedtakene ordrett med forholdene, regelradene og bevis-sakene. Vedtaksfila er autoritativ |
| [`../AGENTS.md`](../AGENTS.md) | Lastes automatisk i hver sesjon: språk, domeneordliste, sikkerhetsinvarianter, resonneringsregler |
| [`.claude/rules/`](../.claude/rules/): [database](../.claude/rules/database.md) · [tester](../.claude/rules/tester.md) · [dokumentasjon](../.claude/rules/dokumentasjon.md) · `tilgang.md` · `python-domene.md` | Regler som lastes når en økt arbeider i den delen av treet. `tilgang.md` har mekanismene bak sikkerhetsinvariantene, og `python-domene.md` overgangsreglene for Python-koden i KOE-, EO- og forseringssakene, som gjelder til #310 |

Handoffene står under [historikk](#historikk--bevart-ikke-gjeldende).

## Domenet og målarkitekturen

| Dokument | Hva det gir |
| --- | --- |
| [B-17 i hovedplanen](plans/vedtak.md#b-17) · [arbeidspakken FK](plans/2026-09-16-godkjenning-og-varig-levering.md#fk--koe--eo--og-forseringsdomenet-i-ts-b-17) | Vedtaket om at TS-kjernen tar over skrivingen i KOE-, endringsordre- og forseringssakene samlet, og pakken som gjennomfører det |
| [kontrakten for flyten](domenetabell/README.md#kontrakten-for-flyten) | Kommando, lagret hendelse og offentlig tilstand for flyten i språkprøven, som JSON Schema (#272) |
| [TS-kjernen](../kjerne/) · [bevis-sakene](domenetabell/bevis-saker-maalmodell.json) | Den delte domenekjernen i TypeScript (B-14). Målmodellen fra #304, flyttet og skrevet om etter vedtakene 09.10 (#308). Bevis-sakene kjøres i minnet og mot testbasen |
| [paragrafmatrisen for KOE-, EO- og forseringssakene](paragrafmatrise-koe-eo-forsering.md) | Levende referanse for #309: for hver bestemmelse i NS 8407 utsagnene, predikatet, det appen ikke avgjør, om appen vurderer, utleder eller bare registrerer og viser, vedtakene, hva kjernen har og hva som hører til første versjon av TS-stien. Byggedelene oppdaterer den |
| [design: lagringsformatet for hendelsene TS skriver (B-10)](design-hendelsesformat-2026-10-09.md) | Forslaget til formatet for #273: én rad per dokument, uttrykkelige referanser med `gjelder` og `erstatter`, hva som fryses, fravær og formatversjon, navn fra kontrakten, og prøveplanen for byggeøkta. Ikke vedtatt; vedtaket føres under B-10 i hovedplanen |
| [forslag: målmodell](forslag-maalmodell-2026-10-09.md) · [kontrollskript](vedlegg/maalmodell-2026-10-09/kontroll.ts) | Modellforslaget før portering (#300): dokumenter, utsagn, relasjoner og predikater, gjennomgått på fem forløp. Ikke vedtatt som helhet; vedtakene står i hovedplanen |
| [vurdering: vedtakene mot NS 8407 og avtaleloven](vurdering-vedtak-mot-avtaleloven-2026-10-15.md) | Grunnlaget for #504: hjemmel, prinsipp og utfall for hvert vedtak i 3.1 målt mot NS 8407 og avtaleloven kapittel 1, med forslag til prinsippvedtak og spørsmålene samlet. Vedtakene føres i hovedplanen |
| [vurdering: målbildet, arkitekturen og overgangen til TS](vurdering-maalbilde-og-ts-overgang-2026-10-20.md) | Den overordnede vurderingen 20.10: arbeidspakkene målt mot hovedplanen, overgangen fra Python og PostgreSQL til TS og Azure SQL, den røde tråden mellom vedtak og leveranser, og forslag til arkitekturforbedringer |
| [vurdering: behovet i første versjon](vurdering-behov-forste-versjon-2026-10-13.md) · [kartleggingene](vedlegg/kartlegging-forste-versjon-2026-10-13/premisser.md) | Dagens skjemaer målt mot TS-kjernen, kjernens automatiske virkninger og domenevedtakene klassifisert for første versjon, med forslag til endret ordlyd. Grunnlag for et samlet vedtak om omfanget; vedtakene står i hovedplanen |
| [vurdering: kontraktskontroll av OV-U3–OV-U7 og VS-U17–VS-U21](vedlegg/review-kontraktskontroll-ov-vs-2026-10-13.md) | Kontrollen 13.10 av vedtakene OV-U3–OV-U7 (#481) og VS-U17–VS-U21 (#476) mot NS 8407 og TS-kjernen, med klassifisering, retting og spørsmålene S1–S5 til oppdragsgiver. Vedtakene står i hovedplanen |
| [vurdering: hvor TS-kjernen kjører på serveren (B-18)](vurdering-b18-serverplassering-2026-10-10.md) | Beslutningsgrunnlaget for B-18 (#311): SvelteKit-server eller egen Node/TS-backend, og Python ved siden av for levering og Catenda, vurdert mot tilgang og CSRF, transaksjoner, grensen mot Python for levering og lesing, og drift. Vedtaket føres under B-18 i hovedplanen |
| [vurdering: målarkitekturen mot domenet](vurdering-maalarkitektur-mot-domenet-2026-10-20.md) · [prompten til sparring](vedlegg/vurdering-maalarkitektur-2026-10-20/prompt-sparring.md) | Om målbildet fortsatt passer domenet: journal og utsagnsmodell, lagringsform, TS-kjernen, serveren og Azure SQL, jobbtabellen og Catenda, hver vurdert mot alternativene og kostnaden ved et bytte. Endrer ingen vedtak |
| [vurdering: JSON i Azure SQL Database (B-12)](vurdering-json-azure-sql-2026-10-11.md) | Grunnlaget for JSON-delen av B-12 (#377): JSON-typen og JSON som tekst i Azure SQL Database, testbasen i Docker, hvordan appen lagrer og spør i JSON, det frosne brevet og speilingen til Fabric. Vedtaket føres under B-12 i hovedplanen |
| [prøve: tilgangsmekanismen og lagringsformene i T-SQL (B-12)](prove-azuresql-2026-10-11.md) | Punkt 1 i #395: B-02 alternativ C i SQL Server, de to lagringsformene for brevet gjennom kjernen, identitetsoppslaget, og hva SQL Server i Docker koster i skyøktene og CI. Prøvekoden står i `prove/azuresql/`. Lagringsformen velges i hovedplanen |
| [forslag: målarkitektur og beslutningsprøve](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md) · [opprinnelig forslag](vedlegg/arkitekturvalg-2026-10-07/README.md) | Grunnlaget for B-14 og språkvalget 09.10, med resultatet av språkprøven i avsnitt 7. Overgangen der er erstattet av B-17 |
| [metodeprøve: fristkrav og tidsinnsigelser](vedlegg/metodeprove-frist-2026-10-08/README.md) | Isolert JSON/TypeScript-prøve for #271 med kilder, forløp, feilinnføringer og skillet mellom avklarte tolkninger og arbeidshypoteser, også for brev med flere innsigelser og senere dokumentert korrespondanse. Vedtak: hovedplanens MP-U4–MP-U7 |
| [reviewoppfølging: målarkitektur og gjennomføring](review-oppfolging-arkitektur-2026-10-07.md) | Presiseringer etter review av #266/#270, kobling til hovedplanens B-14 og B-10, samt dokumenterte GitHub-begrensninger |
| [vurdering: avhengigheter og arkitekturvalg](vurdering-avhengigheter-og-arkitekturvalg-2026-10-07.md) · [backend](vedlegg/avhengigheter-2026-10-07/backend.md), [frontend](vedlegg/avhengigheter-2026-10-07/frontend.md) og [arkitektur](vedlegg/avhengigheter-2026-10-07/arkitektur.md) | Datert vedlikeholdsvurdering med pakkegrupper, runtimegrenser og beviskrav for en delt ren TypeScript-kjerne; skiller anbefalinger fra auditfunn |

## Datalag, tilgang og levering

| Dokument | Hva det gir |
| --- | --- |
| [transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) | Underordnet delplan. Normativ for kommando-, låse- og worker-kontrakten. «RPC» leses som databasekommando over direkte tilkobling (merknad 23.09); kommandoen for KOE-, EO- og forseringssakene hører til TS-stien (merknad 09.10) |
| [design v2: tilgangsmekanisme (B-02)](design-b02-tilgangsmekanisme-v2-2026-09-23.md) · [prototype v2](vedlegg/b02-prototype-v2-2026-09-23/kjor.sh) | Grunnlaget for alternativ C og transport T2, vedtatt 23.09 (hovedplanen, 3.1). Forespørselsvakt (T1v) og direkte innlogging (T2) prøvd, operasjonsmodell for skrivevakten, notater gjennom kommandoer, strengere kontekst og identitet |
| [uavhengig review: tilgangsmekanisme (B-02)](review-b02-tilgangsmekanisme-2026-09-23.md) · [bevis og kjøreoppskrift](vedlegg/b02-prototype-2026-09-22/REVIEW.md) | RB2-01–08. Alternativ C kan legges til grunn med navngitte endringer. Grunnlag for F1 |
| [arkitekturpresiseringer 21.09](arkitekturforinger-2026-09-21.md) | AF-01–AF-06: vedtatte føringer. Innarbeidet i hovedplanen; ikke implementert |
| [design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md) | Designet planen bygger på. Konkluderte uavhengig med «én database» og «bytt klient først», som ble F0b. Har formen på `vedlegg`, `kommando`, `utgaende_levering` og `innkommende_hendelse` |
| [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md) | Hvor skjemaet skal, justert av AF-01, AF-03 og AF-04 |
| [oppdrag: datamodell og funksjonskart (spor M)](prompt-datamodell-og-funksjonskart-2026-09-29.md) | Tabellbeskrivelse for IKT som systemdokumentasjon, hendelseskatalog, funksjonskart og atferdstester, i faser. Avsnitt 4 er utgangspunktet |
| [oppdrag: repositoriene i F0b, fase 2](prompt-f0b-fase2-repositorier-2026-09-24.md) | Fire parallelle løp (a–d) over kjernen i datalaget: felles regler, eget oppsett per løp og hva hvert løp eier |

## Oppdrag, kartlegginger og gjennomføringer 22.09–05.10 — historisk underlag

Funnene og vedtakene fra disse står i hovedplanen. Dokumentene viser hvordan de
ble gjort, ikke dagens status.

| Dokument | Hva det gir |
| --- | --- |
| [kartlegging: strukturen i spor D](kartlegging-struktur-spor-d-2026-10-05.md) · [oppdrag](prompt-strukturkartlegging-spor-d-2026-10-05.md) | Hvor slutningene om subsidiært standpunkt, status og lukket regnes, hvem som skriver hvert felt i projeksjonen, hva hendelsesmodellene tillater, og kontrakten mellom API og frontend. SK-01–SK-13 og målformer per mønster (B-14) |
| [gjennomføring: nøytralt fristvarsel](gjennomforing-noytralt-fristvarsel-2026-10-04.md) | TFR-06 og DRF-01 rettet: innsigelse (§ 5) og forespørsel (§ 33.6.2) som egne hendelser uten resultat, og et svar med dager avvises til kravet har dager (§ 33.7). Oppdragsgivers svar om svarfrist og godkjenning |
| [gjennomføring: tabellregisteret, første runde (spor M, 1a)](gjennomforing-spor-m-1a-2026-09-29.md) | Registeret, eksporten og vakttesten. DM-01–DM-04, blant dem at ruteregistertesten ikke så alle ruter (DM-04). Ett utsagn i registeret rettet i runden |
| [gjennomføring: hendelseskatalogen, første runde (spor M, 1b)](gjennomforing-spor-m-1b-2026-09-29.md) | Katalogen over hendelsestypene, med vakttest mot koden. Oppdragsgivers svar om bestemmelsene og regnearket. DM-05–DM-07 |
| [gjennomføring: relasjoner, ER-diagram og dataflyt (spor M, 1c)](gjennomforing-spor-m-1c-2026-09-29.md) | Relasjonsregisteret og dataflyten mot Catenda, med ER-diagram fra katalogen og vakttester mot skjemaet og kallene til Catenda. Oppdragsgivers svar om diagrammet. DM-08. Tre utsagn fra 1a og 1b rettet |
| [designnotat: B-13, hvem avgjør resultatet](design-b13-sannhetskilde-2026-09-23.md) · [oppdrag](prompt-b13-backend-eier-reglene-2026-09-23.md) | Beslutningsgrunnlag for B-13. Sammenlikner de tre alternativene for journal, brev, partens tekst, frontend, godkjenning og regelendring, og anbefaler (2) i streng form, med regelversjon. Valgene ble tatt 24.09 (hovedplanen, 3.1) |
| [kartlegging: frontendens domeneregler](kartlegging-domeneregler-frontend-2026-09-23.md) · [oppdrag: BR-01 og spor D](prompt-spor-d-br01-2026-09-23.md) | Grunnlag for B-13. Hva `src/lib/domain/` regner ut, hvilken bestemmelse det bygger på, og hva som står i journalen hvis klienten sender noe annet. BR-01 reprodusert, DRF-01–DRF-03 funnet |
| [gjennomføring: spor D](gjennomforing-spor-d-2026-09-23.md) | TFR-02–TFR-05, GFK-02, INT-07 og OBS-03 rettet; statusene for forsering, EO og avgjort grunnlag besluttet av oppdragsgiver. TFR-06 og GFK-06 reprodusert. Nye funn SD-01–SD-02 |
| [gjennomføring: kjernen i datalaget (F0b)](gjennomforing-f0b-kjernen-2026-09-23.md) · [mutasjoner](vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py) · [oppdrag](prompt-f0b-kjernen-2026-09-23.md) | `lib/db` med pool, transaksjonslokal kontekst i `koe.krav`, retry for hele transaksjonen og felles feilhierarki. Skrivbar fixture, lokal oppstart med PostgreSQL 17, og innkobling for trådene i punkt 2 (`DATALAG=postgres`). Oppfølgingen av reviewet står i avsnitt 7 |
| [uavhengig review: kjernen i datalaget (F0b)](review-f0b-kjernen-2026-09-23.md) · [forsøk og mutasjoner](vedlegg/review-f0b-kjernen-2026-09-23/README.md) · [oppdrag](prompt-review-f0b-kjernen-2026-09-23.md) | RK-01–RK-05. Kan bygges videre på med navngitte endringer: poolopprettelse, containerinnkobling og resettester før punkt 2; avgrenset transaksjonsgaranti og tidskontrakt før F1 |
| [oppdrag: PostgreSQL 17 i CI (F0)](prompt-f0-postgresql-i-ci-2026-09-22.md) | Databasetester mot ekte PostgreSQL i CI, med de første katalogtestene |
| [oppdrag: testvedlikehold i F0](prompt-f0-testvedlikehold-2026-09-22.md) · [gjennomføring](gjennomforing-f0-testvedlikehold-2026-09-22.md) | T-1, T-3 og T-4: AUT-03-reproduksjonen erstattet, FE-02-testen når målassertionen, og TST-02/KR-15 reprodusert deterministisk ved eksistenssjekken |
| [gjennomføring: TST-02/KR-15](gjennomforing-tst02-2026-09-22.md) | Samtidig saksopprettelse i JSON-lageret rettet med `os.link`: én sak og én `ConcurrencyError` |
| [design: tilgangsmekanisme (B-02)](design-b02-tilgangsmekanisme-2026-09-22.md) · [oppdrag](prompt-b02-tilgangsmekanisme-2026-09-22.md) · [prototype](vedlegg/b02-prototype-2026-09-22/kjor.sh) · [oppdrag: uavhengig review](prompt-review-b02-tilgangsmekanisme-2026-09-22.md) | Første grunnlag for B-02, avløst av design v2. Tre alternativer mot trusselmodellen og F1. TM-01: et selvsignert token kan velge `service_role` |
| [redaksjonsprotokoll for hovedplanen](sluttredigering-hovedplan-2026-09-22.md) | Dekningsmatrise og rettelser fra sluttredigeringen 22.09. Ikke en kilde til løpende status |

**Konsolideringsrunden 21.–22.09 — historisk underlag for hovedplanen.**

| Dokument | Hva det gir |
| --- | --- |
| [testrevisjon 22.09](audit-testbevis-2026-09-22.md) · [testinventar](vedlegg/testbevis-2026-09-22.csv) | Kjøring av alle `xfail`-testene 22.09. Rettet 22.09 for ID-er, status og lenker; testutfallene er uendret |
| [review av testbevis og planstatus 22.09](review-testbevis-og-planstatus-2026-09-22.md) | RTB-01–05. Innarbeidet |
| [konsolidert masterplan v2](konsolidering-masterplan-2026-09-22-v2.md) · [kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md) | Historisk forslag. Strukturen er brukt i hovedplanen |
| [review av v2](review-gemini-konsolidering-2026-09-22-v2.md) · [første review](review-gemini-konsolidering-2026-09-22.md) | RGK2-01–05 og RGK-01–06. Innarbeidet |
| [konsolidert masterplan v1](konsolidering-masterplan-2026-09-21.md) · [kildegrunnlag v1](konsolidering-kildegrunnlag-2026-09-21.md) | Historisk forslag, avløst av v2 |
| [oppdrag: sluttrediger hovedplanen](prompt-sluttredigering-hovedplan-2026-09-22.md) · [oppdrag: testverifikasjon](prompt-gemini-verifikasjon-tester-2026-09-22.md) · [oppdrag: konsolidering](prompt-gemini-konsolidering-2026-09-21.md) | Arbeidsinstrukser for runden |

## Runden 20.–21. september

| Dokument | Hva det gir |
| --- | --- |
| [audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md) | **Trenger vi alle tabellene?** Alle tabellene i `public` navngitt, med radtall, opprettende migrasjon og lesere. DA-01 til DA-15. Skiller «ubrukt» fra «i bruk, men overflødig». Tjue da den ble skrevet; atten etter at MS-01 slo tre hendelsestabeller sammen |
| [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md) | Lukker DA-12 til DA-15. MS-01 til MS-15, med sju premisser besluttet av utvikler. Målet er atten tabeller — poenget er at hver får én skriver, ikke at de blir færre |
| [gjennomføring: MS-01, MS-04 og MS-10](gjennomforing-maalskjema-2026-09-20.md) | De tre med frist, gjennomført samme kveld mens basen var tom. Én `hendelse`-tabell, `aktor_id` framfor personnavn, `organisasjon_id` på `projects`. Nye katalogsjekksummer og grensene |
| [gjennomføring: MG-02](gjennomforing-mg02-2026-09-21.md) | Webhookforfatteren løses gjennom samme identitetsfunksjon som innloggingen. `catenda:<subject>` er borte. Sier også hvorfor `actorid` fortsatt er `TEXT` |
| [gjennomføring: MS-05](gjennomforing-ms05-2026-09-21.md) | Interne notater ut av journalen. `notat` som egen tabell utenfor journalen, med de tre følgene: versjonstelleren, flettingen og sletting. Sier også hvor migrasjonsversjonene i basen ikke stemmer med filnavnene |
| [gjennomgang av målskjemarunden](audit-maalskjema-gjennomgang-2026-09-21.md) | MG-01 til MG-09: gjennomgang av forrige rundes egen kode, med fire vinkler. Hva som ble ryddet, og hva som ble stående. **MG-02 har frist** |
| [audit: opprydding](audit-opprydding-2026-09-21.md) | **RY-01 til RY-07:** hva som ble utsatt etter KR-rettingene, og én påstand to gjennomganger var enige om og begge tok feil i |
| [audit: korrekthet i målskjemarunden](audit-korrekthet-2026-09-21.md) | **Korrekthetsgjennomgangen handoffen ba om.** KR-01 til KR-14 over de samme åtte commitene, med tre avviste påstander og hvorfor de ikke holdt. **KR-01 er høy** og blokkerer all prosjektregistrering |

Samme dag, men før den gjennomgangen, leverte en egen runde rettinger i
produksjonskode uten eget dokument. De daterte merknadene står i masterplanens
Git-historikk (`git show 41c2a16:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`);
gjeldende status står i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

| Hva | Hvor det står |
| --- | --- |
| TFR-01, GFK-01/FE-04, AUT-01/AUT-02 og INT-04 lukket | Hovedplanen, avsnitt 4. Den opprinnelige merknaden «status for de tre» står i masterplanens Git-historikk (`41c2a16`) |
| Tenant-attribusjonen (handoffens 5a): `prosjekt_id NOT NULL` på hendelsestabellene, alle fjorten oslobygg-fallbacks fjernet | Hovedplanen, avsnitt 4 · [audit-rls-database](audit-rls-database-2026-09-18.md) (DB-06, DB-03) · [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) (AR-01) |
| CI: `.github/workflows/ci.yml`, tre gatende jobber. `ruff` ryddet og pinnet | Hovedplanen, F0 og AR-05 |
| `actorteam`-migrasjonen anvendt; sju tabeller som bare fantes i basen, skrevet som migrasjonsfiler. DB-01 og DB-02 lukket | [audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md) (DA-01, DA-02, DA-05) |

**Fortsatt åpent etter runden:** RLS-policyene er uendret
`service_role / ALL / USING (true)` — kolonnen gjør at en prosjektpolicy *lar seg*
skrive, men ingen er skrevet. Det hører til databasearbeidspakken og til pakke 1.
**Migrasjonen som manglet `actorteam` er derimot anvendt 20.09** — står det noe
annet i et eldre dokument, er det foreldet.

**Senere samme kveld** kom `supabase/config.toml` og filnavnrekkefølgen som
apply-rekkefølge (DA-03), og deretter de tre beslutningene med frist: MS-01,
MS-04 og MS-10. Basen har nå **atten** tabeller, ikke tjue. Det som gjenstår i
mekanismen fra fil til base, er migrasjonshistorikken — alignmenten er 8 av 18,
og `supabase migration repair` krever legitimasjon.

## Runden 19. september

Arkitekturvurdering, sammenstilling mot det parallelle auditsporet, og etterprøving
av alle funn.

| Dokument | Hva det gir |
| --- | --- |
| [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) | Burde fundamentet vært et annet? AR-01 til AR-08, målarkitektur, fase 0–4 |
| [sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md) | Gemini-sporet holdt opp mot arkitekturvurderingen. Avgjør seks databasefunn mot faktisk skjema |
| [vurdering av auditfunnene](vurdering-av-auditfunn-2026-09-19.md) | Er de 60 funnene reelle? 59 etterprøvd, sju feilklassifisert, tolv rotårsaker |
| [faktagrunnlag for DPIA](personopplysninger-faktagrunnlag-2026-09-19.md) | Personopplysninger: hva, hvorfor, og fire alternativer som lagrer mindre |

## Auditserien

27 auditer i fem runder. **Funnstatus står i hovedplanen** — dokumentene her er
protokollen over hvordan funnene ble gjort, ikke en oppdatert tilstandsbeskrivelse.
Et lukket funn står fortsatt beskrevet som åpent i dokumentet det ble funnet i.

**18. september — Gemini-sporet, ni passeringer.** 60 funn med 50
`xfail`-reproduksjoner. Hvert dokument har en merknad øverst med utfallet av
etterprøvingen 19. september; les den før funntabellen.

[database og RLS](audit-rls-database-2026-09-18.md) ·
[autorisasjon](audit-autorisasjon-2026-09-18.md) ·
[tilstand og forretningsregler](audit-tilstand-forretningsregler-2026-09-18.md) ·
[godkjenning og fullmakt](audit-godkjenning-fullmakt-2026-09-18.md) ·
[integrasjoner](audit-integrasjoner-2026-09-18.md) ·
[frontend](audit-frontend-2026-09-18.md) ·
[konfigurasjon](audit-konfigurasjon-2026-09-18.md) ·
[observability](audit-observability-2026-09-18.md) ·
[testsuite og blindsoner](audit-testsuite-blindsoner-2026-09-18.md)

**17. september — etterprøving og review.**

- [etterprøving av sikkerhetsarkitekturen](audit-sikkerhetsarkitektur-2026-09-17.md) — S1–S10. S9 og halve S10 besvart 19.09
- [review av sikkerhetsrunden](audit-review-astra-2026-09-17.md) — RV-01 til RV-22
- [vurdering: Power Platform](vurdering-power-platform-2026-09-17.md) — plattformalternativ, konkluderer med å beholde stacken

**16. september.**
[godkjenningspanel og varig levering](audit-godkjenningspanel-og-durable-levering-2026-09-16.md) ·
[utkast: gjenoppretting](audit-utkast-gjenoppretting-2026-09-16.md) ·
[vedleggsintegrasjon](audit-vedleggsintegrasjon-2026-09-16.md)

**15. september.**
[backend-hendelsesflyt](audit-backend-hendelsesflyt-2026-09-15.md) ·
[tilgangslaget](audit-tilgangslaget-opprydding-2026-09-15.md) ·
[utkast: samtidighet og Catenda](audit-utkast-samtidighet-og-catenda-2026-09-15.md) ·
[utkast: serverlagring](audit-utkast-serverlagring-2026-09-15.md) ·
[vedleggsflyt](audit-vedleggsflyt-2026-09-15.md)

**14. september — første runde.**
[autentisering](audit-autentisering-2026-09-14.md) ·
[godkjenning og event sourcing](audit-godkjenning-event-sourcing-2026-09-14.md) ·
[klient, prosjekt og sesjon](audit-klient-prosjekt-sesjon-2026-09-14.md) ·
[persistens og gjenoppretting](audit-persistens-gjenoppretting-2026-09-14.md) ·
[PDF og Catenda](audit-pdf-catenda-2026-09-14.md) ·
[utkast og samarbeid](audit-utkast-samarbeid-2026-09-14.md) ·
[begrunnelsestekst og død kode](audit-begrunnelsestekst-og-dodkode-2026-09-14.md) ·
[formatering](audit-formatering-2026-09-14.md)

## Referanse — hvordan systemet virker

Beskriver funksjon og dataflyt, ikke funn. Disse eldes saktere enn auditene.

| Dokument | Emne |
| --- | --- |
| [arkitekturdiagrammer](arkitektur-diagrammer.md) | Systemoversikt. Azure-skissen viser Azure SQL; foreløpig mål er Azure PostgreSQL (merknad 23.09), men en SQL Database er aktuell igjen (merknad 29.09) |
| [tabellregisteret](datamodell/tabeller.md) | Hver tabell i PostgreSQL og SQLite, og data utenfor databasene. Generert fra [`tabeller.toml`](datamodell/tabeller.toml); rett der. Spor M, første runde 29.09 |
| [relasjoner og dataflyt](datamodell/relasjoner.md) | ER-diagrammer, hver kobling mellom tabellene med og uten fremmednøkkel, og hver pil mellom en tabell og Catenda med endepunkt og kode. Generert fra [`relasjoner.toml`](datamodell/relasjoner.toml), [`dataflyt.toml`](datamodell/dataflyt.toml) og [`katalog.json`](datamodell/katalog.json); rett i registrene. Spor M, 1c 29.09 |
| [hendelseskatalogen](datamodell/hendelser.md) | Hver hendelsestype: hvem som sender, spor, NS 8407 med kilde, feltene i `data` og virkning på status. Generert fra [`hendelser.toml`](datamodell/hendelser.toml) og modellene; rett der. Spor M, 1b 29.09 |
| [Catenda: dataflyt](catenda-dataflyt.md) | Hva som utveksles, og hvordan prosjekt og bibliotek rutes |
| [Catenda: innlogging](catenda-innlogging.md) | OAuth-flyten og prosjekttilgang |
| [migrasjoner og testbase](migrasjoner-og-testbase.md) | Hvordan migrasjonene verifiseres mot prosjektet uten å røre basen: testbasen i PostgreSQL 17, stubben av Supabase, katalogsummene og historikken. Flyttet fra `AGENTS.md` 29.09 |
| [brev og intern godkjenning](brev-og-godkjenning.md) | Godkjenningskjede, fullmakt, brevgenerering |
| [endringsordre](endringsordre.md) | EO-flyten i grensesnittet |
| [Kontraktsbordet](frontend-kontraktsbord.md) | Hovedgrensesnittet |
| [designsystemet](design/system.md) | Retningen for visningen, tokenene i bruk, mønstrene og vedtakene som styrer farge og ord. Verdiene står i `theme.css` |
| [beslutningslogg](adr/README.md) | ADR-er og juridiske drøftelser: [varsling uavhengig av kontraktsforhold](adr/001-varsling-og-kontraktsforhold.md) og [varselet etter § 34.1.2 og det særskilte kravet](adr/002-saerskilt-krav-og-varsel-etter-34-1-2.md) |
| [tredjepart-api/](tredjepart-api/) | Catendas OpenAPI-spesifikasjoner, uendret kopi |

## Historikk — bevart, ikke gjeldende

Disse skal ikke slettes; de er sporet. Men de beskriver en tilstand eller et
utgangspunkt som er passert.

| Dokument | Hvorfor det står her |
| --- | --- |
| [handoff 23.09](handoff-2026-09-23-datalag-postgresql.md) | Siste handoff: B-02-runden, plattformsamtalen med IKT, alternativ C over direkte PostgreSQL og oppsett som Claude Code-prosjekt. Status og neste steg er innarbeidet i hovedplanen |
| [handoff 21.09 (frister)](handoff-2026-09-21-frister.md) | Fellene der gjelder fortsatt; planen og statusen der er innarbeidet i hovedplanen |
| [handoff 21.09 (korrekthet)](handoff-2026-09-21-korrekthet.md) · [handoff 21.09](handoff-2026-09-21.md) | Runder samme dag. Status og neste steg er innarbeidet i hovedplanen; fellene gjelder fortsatt |
| [handoff 20.09](handoff-2026-09-20.md) · [handoff 19.09](handoff-2026-09-19.md) | Eldre runder. Fellene gjelder fortsatt; «ting med frist» er passert |
| [handoff 15.09](handoff-2026-09-15.md) | Avløst av handoffen fra 19.09 |
| [handoff om Catenda-kallfrekvens](handoff-gpt-astra-2026-09-15.md) | Åpent spørsmål om kallfrekvens; målingen er fortsatt ikke gjort |
| [prompt: svakhetsgjennomgang](prompt-svakhetsgjennomgang-2026-09-17.md) | Utgangspunktet for runden 17.09. Etterprøvingen korrigerte flere av premissene — les den sammen med [audit-sikkerhetsarkitektur](audit-sikkerhetsarkitektur-2026-09-17.md) |
| [superpowers/](superpowers/) | Implementasjonsplaner og designspecer fra mars–september, en annen arbeidsflyt |
| [design/](design/) | Designressurser for godkjenningspanelet |
| [design/konsept-varden/](design/konsept-varden/) | Eksperimentelt UX-konsept for saksvisningen, med HTML-skisser. Prøves i #1331. Ikke vedtatt design |

---

## Konvensjoner for nye dokumenter

**Merknad 2026-10-07:** Det tidligere generelle auditformatet er erstattet av
[reglene for dokumentasjon](../.claude/rules/dokumentasjon.md). De er den
autoritative skrivekonvensjonen og skiller varige referanser, prøvbare
oppskrifter og historiske undersøkelser. En vanlig implementerings-PR trenger
ikke et eget gjennomføringsnotat.

Språk og navngivning følger [AGENTS.md](../AGENTS.md#språk).
Kilderegistre og genererte beskrivelser er samlet under
[datamodellen](#referanse--hvordan-systemet-virker). Denne indeksen peker til
dokumentene; arbeidsstatus og testresultater vedlikeholdes i sine egne kilder.
Eksisterende historiske beskrivelser ryddes når de berøres, uten bred flytting.

Lenkekontroll, som også kontrollerer ankre etter GitHubs regler:

```bash
python3 docs/verktoy/lenkekontroll.py            # alle .md under docs/
python3 docs/verktoy/lenkekontroll.py docs/x.md  # bare disse
```

Skal gi `brutte: 0`. Linjeankre som `#L10-L20` mot kildefiler telles, men
kontrolleres ikke, og `file:`-lenker hoppes over.
