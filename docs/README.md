# Dokumentasjonsindeks

`docs/` er en kjede av auditer, planer og referanser bygget opp fra 14. september
2026. Denne fila sier hva som gjelder, hva som er historikk, og hvor man begynner.

**Masterplanen er autoritativ for funnstatus.** Sier et annet dokument noe annet om
et funn, er det andre dokumentet foreldet — rett det, ikke gjenopprett diskusjonen.
Opphever du et utsagn, skriv en datert merknad, også inn i det gamle dokumentet.

---

## Start her

| Dokument | Hva det gir |
| --- | --- |
| [handoff-2026-09-21](handoff-2026-09-21.md) | **Begynn her.** Overtakelse uten kontekst: hva som er gjennomført, tre nye feller, etablerte fakta med sjekksummer, og hva som krever et menneske |
| [handoff-2026-09-20](handoff-2026-09-20.md) | Runden før. De fire fellene der gjelder fortsatt; «ting med frist» er delvis passert |
| [handoff-2026-09-19](handoff-2026-09-19.md) | Eldre. Fellene der gjelder fortsatt, men «ting med frist» merket 5a er passert |
| [`../AGENTS.md`](../AGENTS.md) | Lastes automatisk i hver sesjon: språk, domeneordliste, sikkerhetsinvarianter, resonneringsregler |

## Gjeldende plan og status

| Dokument | Hva det gir |
| --- | --- |
| [masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Autoritativ for status.** Arbeidspakker, lukkede og åpne funn, overlapp mellom sporene, organisatoriske forutsetninger |
| [transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) | Delplan: atomisk utstedelse og outbox |
| [design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md) | Designet planen bygger på. Konkluderte uavhengig med «én database». Har formen på `vedlegg`, `kommando`, `utgaende_levering` og `innkommende_hendelse` |
| [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md) | Hvor skjemaet skal. Forutsetter durable-inbox-notatet og bygger videre på det |

## Siste runde — 20.–21. september

| Dokument | Hva det gir |
| --- | --- |
| [audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md) | **Trenger vi alle tabellene?** Alle tabellene i `public` navngitt, med radtall, opprettende migrasjon og lesere. DA-01 til DA-15. Skiller «ubrukt» fra «i bruk, men overflødig». Tjue da den ble skrevet; atten etter at MS-01 slo tre hendelsestabeller sammen |
| [design: målskjema for databasen](design-maalskjema-database-2026-09-20.md) | Lukker DA-12 til DA-15. MS-01 til MS-15, med sju premisser besluttet av utvikler. Målet er atten tabeller — poenget er at hver får én skriver, ikke at de blir færre |
| [gjennomføring: MS-01, MS-04 og MS-10](gjennomforing-maalskjema-2026-09-20.md) | De tre med frist, gjennomført samme kveld mens basen var tom. Én `hendelse`-tabell, `aktor_id` framfor personnavn, `organisasjon_id` på `projects`. Nye katalogsjekksummer og grensene |
| [gjennomgang av målskjemarunden](audit-maalskjema-gjennomgang-2026-09-21.md) | MG-01 til MG-09: gjennomgang av forrige rundes egen kode, med fire vinkler. Hva som ble ryddet, og hva som ble stående. **MG-02 har frist** |
| [audit: korrekthet i målskjemarunden](audit-korrekthet-2026-09-21.md) | **Korrekthetsgjennomgangen handoffen ba om.** KR-01 til KR-14 over de samme åtte commitene, med tre avviste påstander og hvorfor de ikke holdt. **KR-01 er høy** og blokkerer all prosjektregistrering |

Samme dag, men før den gjennomgangen, leverte en egen runde rettinger i
produksjonskode uten eget dokument. Den står som daterte merknader i kjeden —
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) er stedet å
lese dem samlet.

| Hva | Hvor det står |
| --- | --- |
| TFR-01, GFK-01/FE-04, AUT-01/AUT-02 og INT-04 lukket | Masterplanen, «status for de tre» |
| Tenant-attribusjonen (handoffens 5a): `prosjekt_id NOT NULL` på hendelsestabellene, alle fjorten oslobygg-fallbacks fjernet | Masterplanen · [audit-rls-database](audit-rls-database-2026-09-18.md) (DB-06, DB-03) · [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) (AR-01) |
| CI: `.github/workflows/ci.yml`, tre gatende jobber. `ruff` ryddet og pinnet | Masterplanen, «verifiserbar leveranseprosess» |
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

27 auditer i fem runder. **Funnstatus står i masterplanen** — dokumentene her er
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

Lenkekontroll, som ikke har falske positive:

```bash
python3 -c "
import pathlib, re
for f in pathlib.Path('docs').rglob('*.md'):
    for m in re.finditer(r'\]\((?!https?:|file:|#)([^)#]+)', f.read_text(encoding='utf-8')):
        if not (f.parent/m.group(1)).resolve().exists(): print('BRUTT:', f, '->', m.group(1))"
```

Skal gi nøyaktig ett treff: `adr/001` → `../NS_8407.md`, som ble avsporet i `507e225`.
