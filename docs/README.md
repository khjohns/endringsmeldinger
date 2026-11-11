# Dokumentasjonsindeks

Les dokumentene etter spørsmålet du vil besvare. Gjeldende referanser står først;
daterte undersøkelser og tidligere løsningsspor står under historisk underlag.

## Start her

| Når du vil forstå | Les |
| --- | --- |
| Hva brukerne gjør og skal forstå gjennom en sak | [Brukerforløpene](domenetabell/brukerforlop/README.md) og [dekningsoversikten](domenetabell/brukerforlop/dekning.md) |
| Hvordan Varden skal utformes | [Designsystemet](../.interface-design/system.md) og [språkfila](sprak.md) |
| Systemets ansvar og grenser | [CLAUDE.md](../CLAUDE.md#domenekjernen), [TS-kjernen](../kjerne/), [serveren](../server/) og [dataflyten](datamodell/relasjoner.md) |
| Dataene som lagres og utveksles | [Tabeller](datamodell/tabeller.md), [kjernehendelser](datamodell/kjernehendelser.md) og [relasjoner og dataflyt](datamodell/relasjoner.md) |
| Vedtatt atferd og begrunnelsen for den | [Vedtaksfila](plans/vedtak.md), [vedtaksregisteret](vedtaksregister/README.md), [temavisningene](vedtaksregister/temaer/) og [domenetabellen](domenetabell/README.md) |
| Arbeidsrekkefølgen fram mot Første ekte sak | [#1065](https://github.com/khjohns/endringsmeldinger/issues/1065); [#1534](https://github.com/khjohns/endringsmeldinger/issues/1534) samler vedtaksoppryddingen |
| Plan, åpne beslutninger og funnstatus | [Hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md); historiske og avsluttede funn, tidligere arbeidspakker og eldre leveransemerknader står i [arkivet](plans/arkiv.md) |

Arbeid som pågår eller venter, føres i GitHub-issues og
[milepælene](https://github.com/khjohns/endringsmeldinger/milestones).
Vedtaksfila er autoritativ for vedtakene og genereres fra vedtaksregisteret.
Hovedplanen og arkivet eier funnstatusen; denne indeksen beskriver bare leseveien.

## Domenet og målarkitekturen

| Referanse | Formål |
| --- | --- |
| [Domenetabellen](domenetabell/README.md) · [kontrakten for flyten](domenetabell/README.md#kontrakten-for-flyten) | Forventet atferd, begreper og kontrakter med kildehenvisninger |
| [Bevis-sakene for målmodellen](domenetabell/bevis-saker-maalmodell.json) · [TS-kjernen](../kjerne/) | Regelbevis og den delte domenekjernen. Python-bevisene er historisk arkiv |
| [Paragrafmatrisen](paragrafmatrise-koe-eo-forsering.md) | Bestemmelsene i NS 8407 knyttet til utsagn, predikater, vedtak og kjernen |
| [B-17](plans/vedtak.md#b-17) · [arbeidspakken FK](plans/2026-09-16-godkjenning-og-varig-levering.md#fk--koe--eo--og-forseringsdomenet-i-ts-b-17) | Vedtaket og planreferansen for KOE-, EO- og forseringsdomenet i TS |

Varden er dagens saksvisning. Python-backenden og Supabase-sporet ble slettet
08.11.2026 ([#49](https://github.com/khjohns/endringsmeldinger/issues/49)).
Eldre arkitekturskisser og overgangsplaner under gjelder derfor sitt daterte
utgangspunkt, og må leses mot gjeldende vedtak og referanser.

## Referanse — hvordan systemet virker

| Referanse | Formål |
| --- | --- |
| [Tabellregisteret](datamodell/tabeller.md) | Tabeller i SQL Server og data utenfor databasen. Kilde: [tabeller.toml](datamodell/tabeller.toml) |
| [Relasjoner og dataflyt](datamodell/relasjoner.md) | Koblinger, ER-diagrammer og utveksling med Catenda. Kilder: [relasjoner.toml](datamodell/relasjoner.toml), [dataflyt.toml](datamodell/dataflyt.toml) og [katalog.json](datamodell/katalog.json) |
| [Kjernehendelsene](datamodell/kjernehendelser.md) | Hendelsestyper og felt som TS-kjernen skriver. Kilde: [kjernehendelser.toml](datamodell/kjernehendelser.toml) |
| [Språkfila](sprak.md) · [designsystemet](../.interface-design/system.md) | Ord, brevtekst, tokens og mønstre i Varden |
| [Beslutningslogg](adr/README.md) | Juridiske drøftelser: [varsling og kontraktsforhold](adr/001-varsling-og-kontraktsforhold.md) og [særskilt krav og varsel etter § 34.1.2](adr/002-saerskilt-krav-og-varsel-etter-34-1-2.md). Vedtakene står i vedtaksfila |
| [Catendas API-spesifikasjoner](tredjepart-api/) | Uendrede kopier av tredjepartens OpenAPI-spesifikasjoner |
| [CLAUDE.md](../CLAUDE.md) · [reglene](../.claude/rules/) | Stabile arbeidsregler; egne regler for [database](../.claude/rules/database.md), [tester](../.claude/rules/tester.md), [tilgang](../.claude/rules/tilgang.md), [kjerne](../.claude/rules/kjerne.md) og [dokumentasjon](../.claude/rules/dokumentasjon.md) |

Markdown og Excel i datamodellen er genererte visninger. Rett kilderegistrene og
generer på nytt; se reglene for dokumentasjon.

## Datalag, tilgang og levering

| Referanse | Formål |
| --- | --- |
| [Transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) | Kontrakten for kommandoer, låser og worker |
| [Tilgangsmekanismen, design v2 (B-02)](design-b02-tilgangsmekanisme-v2-2026-09-23.md) | Kontrakten for tilgangskontekst og skrivevakt |

Disse er normative der de er mer presise enn hovedplanen, jf.
[hovedplanens kildehierarki](plans/2026-09-16-godkjenning-og-varig-levering.md#12-dokumentenes-rolle).
Plattformbeskrivelsene har historiske premisser; les kontraktene sammen med
[gjeldende vedtak](plans/vedtak.md).

## Historisk underlag

Auditer, reviewer, oppdrag, prøver og konsolideringer bevarer begrunnelsene og
undersøkelsene fra den angitte datoen. Påstander om status, alvorlighet og
kjøringer i disse dokumentene gjelder den undersøkte versjonen. Bruk
hovedplanen, arkivet og vedtaksfila for gjeldende status og vedtak.

### Modell- og arkitekturvurderinger

- [design: lagringsformatet for hendelsene TS skriver (B-10)](design-hendelsesformat-2026-10-09.md)
- [forslag: målmodell](forslag-maalmodell-2026-10-09.md) · [kontrollskript](vedlegg/maalmodell-2026-10-09/kontroll.ts)
- [vurdering: vedtakene mot NS 8407 og avtaleloven](vurdering-vedtak-mot-avtaleloven-2026-10-15.md)
- [vurdering: vedtakene 25.10](vurdering-vedtakene-2026-10-25.md)
- [vurdering: målbildet, arkitekturen og overgangen til TS](vurdering-maalbilde-og-ts-overgang-2026-10-20.md)
- [vurdering: behovet i første versjon](vurdering-behov-forste-versjon-2026-10-13.md) · [kartleggingene](vedlegg/kartlegging-forste-versjon-2026-10-13/premisser.md)
- [vurdering: begrunnelse per punkt og oversiktstabell](vurdering-begrunnelse-per-punkt-2026-10-31.md)
- [vurdering: kontraktskontroll av OV-U3–OV-U7 og VS-U17–VS-U21](vedlegg/review-kontraktskontroll-ov-vs-2026-10-13.md)
- [vurdering: hvor TS-kjernen kjører på serveren (B-18)](vurdering-b18-serverplassering-2026-10-10.md)
- [vurdering: målarkitekturen mot domenet](vurdering-maalarkitektur-mot-domenet-2026-10-20.md) · [prompten til sparring](vedlegg/vurdering-maalarkitektur-2026-10-20/prompt-sparring.md)
- [vurdering: JSON i Azure SQL Database (B-12)](vurdering-json-azure-sql-2026-10-11.md)
- [prøve: tilgangsmekanismen og lagringsformene i T-SQL (B-12)](prove-azuresql-2026-10-11.md)
- [forslag: målarkitektur og beslutningsprøve](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md) · [opprinnelig forslag](vedlegg/arkitekturvalg-2026-10-07/README.md)
- [metodeprøve: fristkrav og tidsinnsigelser](vedlegg/metodeprove-frist-2026-10-08/README.md)
- [reviewoppfølging: målarkitektur og gjennomføring](review-oppfolging-arkitektur-2026-10-07.md)
- [vurdering: avhengigheter og arkitekturvalg](vurdering-avhengigheter-og-arkitekturvalg-2026-10-07.md) · [backend](vedlegg/avhengigheter-2026-10-07/backend.md), [frontend](vedlegg/avhengigheter-2026-10-07/frontend.md) og [arkitektur](vedlegg/avhengigheter-2026-10-07/arkitektur.md)

Daterte forslag, vurderinger og metodeprøver som begrunner modell- og arkitekturvalgene.

### Historisk underlag for datalag, tilgang og levering

Daterte prototyper, reviewer, design og oppdrag fra tidligere løsningsspor.

- [prototype v2 for B-02](vedlegg/b02-prototype-v2-2026-09-23/kjor.sh)
- [uavhengig review: tilgangsmekanisme (B-02)](review-b02-tilgangsmekanisme-2026-09-23.md) · [bevis og kjøreoppskrift](vedlegg/b02-prototype-2026-09-22/REVIEW.md)
- [arkitekturpresiseringer 21.09](arkitekturforinger-2026-09-21.md)
- [design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md)
- [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md)
- [oppdrag: datamodell og funksjonskart (spor M)](prompt-datamodell-og-funksjonskart-2026-09-29.md)
- [oppdrag: repositoriene i F0b, fase 2](prompt-f0b-fase2-repositorier-2026-09-24.md) · gjennomføringene av [løp a](gjennomforing-f0b-lop-a-2026-09-24.md) og [løp b](gjennomforing-f0b-lop-b-2026-09-24.md)

## Oppdrag, kartlegginger og gjennomføringer 22.09–05.10 — historisk underlag

Daterte oppdrag, kartlegginger og gjennomføringsnotater, etterfulgt av konsolideringsrunden for hovedplanen.

- [kartlegging: strukturen i spor D](kartlegging-struktur-spor-d-2026-10-05.md) · [oppdrag](prompt-strukturkartlegging-spor-d-2026-10-05.md)
- [gjennomføring: nøytralt fristvarsel](gjennomforing-noytralt-fristvarsel-2026-10-04.md)
- [gjennomføring: tabellregisteret, første runde (spor M, 1a)](gjennomforing-spor-m-1a-2026-09-29.md)
- [gjennomføring: hendelseskatalogen, første runde (spor M, 1b)](gjennomforing-spor-m-1b-2026-09-29.md)
- [gjennomføring: relasjoner, ER-diagram og dataflyt (spor M, 1c)](gjennomforing-spor-m-1c-2026-09-29.md)
- [designnotat: B-13, hvem avgjør resultatet](design-b13-sannhetskilde-2026-09-23.md) · [oppdrag](prompt-b13-backend-eier-reglene-2026-09-23.md)
- [kartlegging: frontendens domeneregler](kartlegging-domeneregler-frontend-2026-09-23.md) · [oppdrag: BR-01 og spor D](prompt-spor-d-br01-2026-09-23.md)
- [gjennomføring: spor D](gjennomforing-spor-d-2026-09-23.md)
- [gjennomføring: kjernen i datalaget (F0b)](gjennomforing-f0b-kjernen-2026-09-23.md) · [mutasjoner](vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py) · [oppdrag](prompt-f0b-kjernen-2026-09-23.md)
- [uavhengig review: kjernen i datalaget (F0b)](review-f0b-kjernen-2026-09-23.md) · [forsøk og mutasjoner](vedlegg/review-f0b-kjernen-2026-09-23/README.md) · [oppdrag](prompt-review-f0b-kjernen-2026-09-23.md)
- [oppdrag: PostgreSQL 17 i CI (F0)](prompt-f0-postgresql-i-ci-2026-09-22.md) · [gjennomføring](gjennomforing-f0-postgresql-ci-2026-09-22.md)
- [oppdrag: testvedlikehold i F0](prompt-f0-testvedlikehold-2026-09-22.md) · [gjennomføring](gjennomforing-f0-testvedlikehold-2026-09-22.md)
- [gjennomføring: TST-02/KR-15](gjennomforing-tst02-2026-09-22.md)
- [design: tilgangsmekanisme (B-02)](design-b02-tilgangsmekanisme-2026-09-22.md) · [oppdrag](prompt-b02-tilgangsmekanisme-2026-09-22.md) · [prototype](vedlegg/b02-prototype-2026-09-22/kjor.sh) · [oppdrag: uavhengig review](prompt-review-b02-tilgangsmekanisme-2026-09-22.md)
- [redaksjonsprotokoll for hovedplanen](sluttredigering-hovedplan-2026-09-22.md)

**Konsolideringsrunden 21.–22.09 — historisk underlag for hovedplanen.**

- [testrevisjon 22.09](audit-testbevis-2026-09-22.md) · [testinventar](vedlegg/testbevis-2026-09-22.csv)
- [review av testbevis og planstatus 22.09](review-testbevis-og-planstatus-2026-09-22.md)
- [konsolidert masterplan v2](konsolidering-masterplan-2026-09-22-v2.md) · [kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md)
- [review av v2](review-gemini-konsolidering-2026-09-22-v2.md) · [første review](review-gemini-konsolidering-2026-09-22.md)
- [konsolidert masterplan v1](konsolidering-masterplan-2026-09-21.md) · [kildegrunnlag v1](konsolidering-kildegrunnlag-2026-09-21.md)
- [oppdrag: sluttrediger hovedplanen](prompt-sluttredigering-hovedplan-2026-09-22.md) · [oppdrag: testverifikasjon](prompt-gemini-verifikasjon-tester-2026-09-22.md) · [oppdrag: konsolidering](prompt-gemini-konsolidering-2026-09-21.md)

## Runden 20.–21. september

Undersøkelser og gjennomføringsnotater fra arbeidet med det tidligere PostgreSQL-skjemaet.

- [audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md)
- [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md)
- [gjennomføring: MS-01, MS-04 og MS-10](gjennomforing-maalskjema-2026-09-20.md)
- [gjennomføring: MG-02](gjennomforing-mg02-2026-09-21.md)
- [gjennomføring: MS-05](gjennomforing-ms05-2026-09-21.md)
- [gjennomgang av målskjemarunden](audit-maalskjema-gjennomgang-2026-09-21.md)
- [audit: opprydding](audit-opprydding-2026-09-21.md)
- [audit: korrekthet i målskjemarunden](audit-korrekthet-2026-09-21.md)

## Runden 19. september

Arkitekturvurdering, etterprøving av auditfunn og faktagrunnlag for personvernvurderingen.

- [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md)
- [sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md)
- [vurdering av auditfunnene](vurdering-av-auditfunn-2026-09-19.md)
- [faktagrunnlag for DPIA](personopplysninger-faktagrunnlag-2026-09-19.md)

## Auditserien

Historiske undersøkelser av sikkerhet, korrekthet og integrasjoner i den daværende løsningen.

**18. september — datert auditspor.**

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

- [etterprøving av sikkerhetsarkitekturen](audit-sikkerhetsarkitektur-2026-09-17.md)
- [review av sikkerhetsrunden](audit-review-astra-2026-09-17.md)
- [vurdering: Power Platform](vurdering-power-platform-2026-09-17.md) — historisk vurdering av plattformalternativ

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


## Historikk — bevart, ikke gjeldende

Tidligere systembeskrivelser, visninger, handoffer og designressurser.
De er underlag for å forstå historikken, ikke oppskrifter for dagens løsning.

- [arkitekturdiagrammer](arkitektur-diagrammer.md)
- [Catenda: dataflyt](catenda-dataflyt.md)
- [Catenda: innlogging](catenda-innlogging.md)
- [migrasjoner og testbase](migrasjoner-og-testbase.md)
- [brev og intern godkjenning](brev-og-godkjenning.md)
- [endringsordre](endringsordre.md)
- [Kontraktsbordet](frontend-kontraktsbord.md)
- [handoff 23.09](handoff-2026-09-23-datalag-postgresql.md)
- [handoff 21.09 (frister)](handoff-2026-09-21-frister.md)
- [handoff 21.09 (korrekthet)](handoff-2026-09-21-korrekthet.md) · [handoff 21.09](handoff-2026-09-21.md)
- [handoff 20.09](handoff-2026-09-20.md) · [handoff 19.09](handoff-2026-09-19.md)
- [handoff 15.09](handoff-2026-09-15.md)
- [handoff om Catenda-kallfrekvens](handoff-gpt-astra-2026-09-15.md)
- [prompt: svakhetsgjennomgang](prompt-svakhetsgjennomgang-2026-09-17.md)
- [design/](design/)
- [design/konsept-varden/](design/konsept-varden/)

## Konvensjoner for nye dokumenter

[Reglene for dokumentasjon](../.claude/rules/dokumentasjon.md) er den autoritative
skrivekonvensjonen. Språk og navngivning følger [CLAUDE.md](../CLAUDE.md#språk).
Vanlig implementering dokumenteres i PR-en; varige referanser oppdateres der
opplysningen hører hjemme. Bevar daterte undersøkelser og eksisterende lenker.

Lenkekontrollen kontrollerer lokale mål og Markdown-ankre etter GitHubs regler:

```bash
python3 docs/verktoy/lenkekontroll.py            # sporede .md i docs/, .claude/ og CLAUDE.md
python3 docs/verktoy/lenkekontroll.py docs/x.md  # bare oppgitte filer
```

Forvent `brutte: 0`. HTTP(S)-, `mailto:`- og `file:`-lenker og lenker i kode
hoppes over. Linjeankre mot kildefiler telles, men kontrolleres ikke.
