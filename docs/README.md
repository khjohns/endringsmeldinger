# Dokumentasjonsindeks

`docs/` er en kjede av auditer, planer og referanser bygget opp fra 14. september
2026. Denne fila sier hva som gjelder, hva som er historikk, og hvor man begynner.

**Hovedplanen er autoritativ for plan og funnstatus.** Sier et annet dokument noe
annet om et funn, er det andre dokumentet foreldet — rett det, ikke gjenopprett
diskusjonen.
Opphever du et utsagn, skriv en datert merknad, også inn i det gamle dokumentet.

---

## Start her

| Dokument | Hva det gir |
| --- | --- |
| [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Begynn her.** Sluttredigert 22.09. Eneste løpende kilde til plan og funnstatus: invarianter, beslutningsregister med åpne valg, funnregister, arbeidspakker og neste oppgave |
| [`../AGENTS.md`](../AGENTS.md) | Lastes automatisk i hver sesjon: språk, domeneordliste, sikkerhetsinvarianter, resonneringsregler |
| [handoff-2026-09-21-frister](handoff-2026-09-21-frister.md) | Siste handoff. Fellene der gjelder fortsatt; planen og statusen der er innarbeidet i hovedplanen |

Eldre handoffer står under [historikk](#historikk--bevart-ikke-gjeldende).

## Gjeldende plan og status

| Dokument | Hva det gir |
| --- | --- |
| [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Autoritativ.** Se over |
| [oppdrag: PostgreSQL 17 i CI (F0)](prompt-f0-postgresql-i-ci-2026-09-22.md) | Neste oppgave i hovedplanen: databasetester mot ekte PostgreSQL i CI, med de første katalogtestene |
| [oppdrag: testvedlikehold i F0](prompt-f0-testvedlikehold-2026-09-22.md) · [gjennomføring](gjennomforing-f0-testvedlikehold-2026-09-22.md) | T-1, T-3 og T-4: AUT-03-reproduksjonen erstattet, FE-02-testen når målassertionen, og TST-02/KR-15 reprodusert deterministisk ved eksistenssjekken |
| [gjennomføring: TST-02/KR-15](gjennomforing-tst02-2026-09-22.md) | Samtidig saksopprettelse i JSON-lageret rettet med `os.link`: én sak og én `ConcurrencyError`. To deterministiske tester, én per fletting |
| [design: tilgangsmekanisme (B-02)](design-b02-tilgangsmekanisme-2026-09-22.md) · [oppdrag](prompt-b02-tilgangsmekanisme-2026-09-22.md) · [prototype](vedlegg/b02-prototype-2026-09-22/kjor.sh) · [oppdrag: uavhengig review](prompt-review-b02-tilgangsmekanisme-2026-09-22.md) | Grunnlag for B-02, ikke en beslutning. Tre alternativer mot trusselmodellen og F1. Anbefaler RLS for lesing, kommandoer for bindende skriving og skrivevakt på journalen. Prototype mot PostgreSQL 17 og PostgREST: 71 av 71 sjekker. TM-01: et selvsignert token kan velge `service_role` |
| [redaksjonsprotokoll for hovedplanen](sluttredigering-hovedplan-2026-09-22.md) | Dekningsmatrise og rettelser fra sluttredigeringen 22.09. Ikke en kilde til løpende status |
| [uavhengig review: tilgangsmekanisme (B-02)](review-b02-tilgangsmekanisme-2026-09-23.md) · [bevis og kjøreoppskrift](vedlegg/b02-prototype-2026-09-22/REVIEW.md) | RB2-01–08. Alternativ C kan legges til grunn med navngitte endringer. Originalbeviset bekreftet, fem nye mutasjoner, lokale tilleggsforsøk og ny katalogkontroll. Beslutningsstatus er uendret |
| [arkitekturpresiseringer 21.09](arkitekturforinger-2026-09-21.md) | AF-01–AF-06: vedtatte føringer. Innarbeidet i hovedplanen; ikke implementert |
| [transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) | Underordnet delplan. Normativ for kommando-, låse- og worker-kontrakten i F2 |
| [design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md) | Designet planen bygger på. Konkluderte uavhengig med «én database». Har formen på `vedlegg`, `kommando`, `utgaende_levering` og `innkommende_hendelse` |
| [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md) | Hvor skjemaet skal, justert av AF-01, AF-03 og AF-04 |

**Konsolideringsrunden 21.–22.09 — historisk underlag for hovedplanen.**

| Dokument | Hva det gir |
| --- | --- |
| [testrevisjon 22.09](audit-testbevis-2026-09-22.md) · [testinventar](vedlegg/testbevis-2026-09-22.csv) | Kjøring av alle 42 `xfail`-tester. Rettet 22.09 for ID-er, status og lenker; testutfallene er uendret |
| [review av testbevis og planstatus 22.09](review-testbevis-og-planstatus-2026-09-22.md) | RTB-01–05. Innarbeidet |
| [konsolidert masterplan v2](konsolidering-masterplan-2026-09-22-v2.md) · [kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md) | Historisk forslag. Strukturen er brukt i hovedplanen |
| [review av v2](review-gemini-konsolidering-2026-09-22-v2.md) · [første review](review-gemini-konsolidering-2026-09-22.md) | RGK2-01–05 og RGK-01–06. Innarbeidet |
| [konsolidert masterplan v1](konsolidering-masterplan-2026-09-21.md) · [kildegrunnlag v1](konsolidering-kildegrunnlag-2026-09-21.md) | Historisk forslag, avløst av v2 |
| [oppdrag: sluttrediger hovedplanen](prompt-sluttredigering-hovedplan-2026-09-22.md) · [oppdrag: testverifikasjon](prompt-gemini-verifikasjon-tester-2026-09-22.md) · [oppdrag: konsolidering](prompt-gemini-konsolidering-2026-09-21.md) | Arbeidsinstrukser for runden |

## Siste runde — 20.–21. september

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

## Runden før — 19. september

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
| [arkitekturdiagrammer](arkitektur-diagrammer.md) | Systemoversikt |
| [Catenda: dataflyt](catenda-dataflyt.md) | Hva som utveksles, og hvordan prosjekt og bibliotek rutes |
| [Catenda: innlogging](catenda-innlogging.md) | OAuth-flyten og prosjekttilgang |
| [brev og intern godkjenning](brev-og-godkjenning.md) | Godkjenningskjede, fullmakt, brevgenerering |
| [endringsordre](endringsordre.md) | EO-flyten i grensesnittet |
| [Kontraktsbordet](frontend-kontraktsbord.md) | Hovedgrensesnittet |
| [beslutningslogg](adr/README.md) | ADR-er. Én i dag: [varsling uavhengig av kontraktsforhold](adr/001-varsling-og-kontraktsforhold.md) |
| [tredjepart-api/](tredjepart-api/) | Catendas OpenAPI-spesifikasjoner, uendret kopi |

## Historikk — bevart, ikke gjeldende

Disse skal ikke slettes; de er sporet. Men de beskriver en tilstand eller et
utgangspunkt som er passert.

| Dokument | Hvorfor det står her |
| --- | --- |
| [handoff 21.09 (korrekthet)](handoff-2026-09-21-korrekthet.md) · [handoff 21.09](handoff-2026-09-21.md) | Runder samme dag. Status og neste steg er innarbeidet i hovedplanen; fellene gjelder fortsatt |
| [handoff 20.09](handoff-2026-09-20.md) · [handoff 19.09](handoff-2026-09-19.md) | Eldre runder. Fellene gjelder fortsatt; «ting med frist» er passert |
| [handoff 15.09](handoff-2026-09-15.md) | Avløst av handoffen fra 19.09 |
| [handoff om Catenda-kallfrekvens](handoff-gpt-astra-2026-09-15.md) | Åpent spørsmål om kallfrekvens; målingen er fortsatt ikke gjort |
| [prompt: svakhetsgjennomgang](prompt-svakhetsgjennomgang-2026-09-17.md) | Utgangspunktet for runden 17.09. Etterprøvingen korrigerte flere av premissene — les den sammen med [audit-sikkerhetsarkitektur](audit-sikkerhetsarkitektur-2026-09-17.md) |
| [superpowers/](superpowers/) | Implementasjonsplaner og designspecer fra mars–september, en annen arbeidsflyt |
| [design/](design/) | Designressurser for godkjenningspanelet |

---

## Konvensjoner for nye dokumenter

Dato og commit i åpningen. Lenker til forrige ledd i kjeden. Funntabell med ID og
alvorlighet. Én seksjon per funn, med fil og symbol — ikke linjenummer, som eldes.
**«Verifikasjon og grenser»** til slutt, som navngir hva som *ikke* er kontrollert.

Skill mellom **«Kjørt og observert»** og **«Lest ut av koden»**. Det er ikke samme
påstand, og forskjellen er der feilklassifiseringene oppstår.

Setningen «Appen er ikke i produksjon og har ingen reelle data» står i alle
auditdokumenter, fordi alvorlighet ellers leses som observert hendelse.

Legg nye dokumenter flatt i `docs/`. Navnekonvensjonen — `audit-*`, `handoff-*`,
`vurdering-*` — grupperer dem allerede, og korpuset har over 200 interne lenker som
en omorganisering ville brutt. Undermappe brukes når noe er *en annen type ting*
(`plans/`, `adr/`), ikke når det er mange filer.

Merk belegg slik hovedplanen gjør: **K** kjørt og observert (med dato), **L** lest
i kode eller migrasjonsfil, **D** tidligere kontrollert i databasekatalogen (med
dato), **H** historisk dokumentert i en audit. En påstand får ikke sterkere merke
enn kilden bærer.

Lenker løses fra dokumentets egen mappe. Fra `docs/` til kode er det
`../backend/`, fra `docs/plans/` er det `../../backend/`.

Lenkekontroll, som også kontrollerer ankre etter GitHubs regler:

```bash
python3 docs/verktoy/lenkekontroll.py            # alle .md under docs/
python3 docs/verktoy/lenkekontroll.py docs/x.md  # bare disse
```

Skal gi `brutte: 0`. `adr/001` lenker til `../NS_8407.md`, som ble avsporet i
`507e225`; uten en lokal kopi av den fila gir kontrollen ett brudd der.
Linjeankre som `#L10-L20` mot kildefiler telles, men kontrolleres ikke, og
`file:`-lenker hoppes over.
