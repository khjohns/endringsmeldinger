# Masterplan: sikkerhet, dataintegritet og varig levering

Avtalt 2026-09-16, basert på
[auditen av 93d630a](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md).
Appen er ikke i produksjon og har ingen reelle produksjonsdata.

Utvidet 2026-09-17 etter [etterprøving av sikkerhetsprompten](../audit-sikkerhetsarkitektur-2026-09-17.md).
Dette er den overordnede planen. [Transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md)
er en delplan. Nye åpne funn må lukkes eller eksplisitt avgrenses før produksjon;
outbox alene gjør ikke appen sikker.

Gjennomgått på nytt 2026-09-18 i [reviewen av sikkerhetsrunden](../audit-review-astra-2026-09-17.md).
Statusen under viser hva den reviewen lukket, og hva som står igjen.

Fundamentet under planen er vurdert 2026-09-19 i
[arkitekturvurderingen](../arkitekturvurdering-2026-09-19.md). Den svarer på S9 og
halve S10, og hevder at fire av punktene under ikke konvergerer uten at
persistenslaget og tenant-grensen byttes. Ingen beslutning er tatt.

Den vurderingen og Gemini-sporets ni passeringer er holdt opp mot hverandre i
[sammenstillingen](../sammenstilling-arkitektur-og-auditspor-2026-09-19.md).
Sporene motsier ikke hverandre. Sammenstillingen avgjør seks databasefunn mot
faktisk skjema, og finner ett forhold ingen av dem så alene: tre uavhengige
oslobygg-fallbacks gjør tenant-attribusjonen uetterprøvbar, og det lar seg ikke
rette i ettertid når ekte saker først finnes.

## Status 2026-09-18

Lukket med retting, regresjonstest og egen commit:

| Funn | Hva som er gjort |
| --- | --- |
| RV-01 | Fullmaktsgulv: avtalt beløp må dekkes av kjeden også når grunnlaget er uberegnet. Speilet i frontend. |
| RV-03 | Godkjenningsfullmakt nøkles på `user_id`. E-post alene avvises utenfor utvikling. |
| RV-04 | `forsering_respons` er under godkjenningsporten, i både hendelsesruta og den egne ruta. |
| RV-05 | Lesing av vedlegg krever kontraktsside. |
| RV-06 | Data API-et er stengt for `anon` og `authenticated`. **Kjørt mot prosjektet 2026-09-18** og verifisert: null lesbare tabeller og kjørbare funksjoner for begge roller, null sikkerhetsvarsler fra Supabase-linten. Den faktiske databasen hadde i tillegg policyer som ikke sto i noen migrasjonsfil — hele hendelsesloggen var lesbar for enhver innlogget bruker. |
| RV-07 | **Se merknad under: lukket per kallsted, ikke som klasse.** Relasjoner utvider ikke lenger prosjektgrensen: kontekst filtreres før aggregering, `avslatte_fristkrav` autoriseres ved innsending, BIM-sletting er saksavgrenset, og `settings.contract` krever byggherrens kontraktsside. |
| RV-08 | `aktor_team_id` overlever lagring i Supabase (`actorteam`), med round-trip-test per lager. |
| RV-16 | Live-tester mot Supabase er opt-in (`RUN_LIVE_SUPABASE=1`). Standard `pytest` er uten nettverk. |
| SA-01 | Hele Supabase-OAuth-flaten er fjernet: tre blueprints, MCP-rate limit og tokenvalidatoren. Appen logger inn med Catenda alene. Ruteregisteret holdes nå opp mot en eksplisitt liste over offentlige ruter. |
| RV-09 | Aktivitetstall utledes av det leseren ser, i alle fire svarveier. Interne notater flytter ikke det delte aktivitetsstempelet. |
| RV-11 | `ConcurrencyError` arver `ConflictError`, så en versjonskonflikt gir 409 og ingen blind retry. |
| SA-02, SA-03, RV-22 | Analytics-blueprinten er slettet. Rutene hadde ingen forbruker i `src/`, og de var eneste kjente lekkasje av byggherrens interne aktivitet i et aggregat, samtidig som de bar hardkodet dagmulktssats og feilsvelging. Skal statistikk komme tilbake, bygges den på det autoriserte leselaget. |

**Merknad 2026-09-19 til RV-07.** `tillatte_saker=cases_in_project` ble påført to
kallsteder (`forsering_routes.py:267`, `endringsordre_routes.py:144`).
`valider_grunnlag_fortsatt_gyldig` (`forsering_service.py:823`) itererer fortsatt
`avslatte_fristkrav` ufiltrert, og `finn_forseringer_for_sak` returnerer
relasjonsindeksen som den er. Gemini-sporet fant begge uavhengig som AUT-01 og
AUT-02. RV-07 bør stå som delvis lukket til grensen ligger i dataene. Se
[vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md).

Beslutninger som er tatt i disse rettingene:

- **Forsering er godkjenningspliktig.** Prosjekter med policy kan inntil videre
  ikke svare på forseringsvarsel, fordi godkjenningsflyten ikke modellerer
  forseringssporet. Å utvide flyten hører til arbeidet med godkjenningsomfang.
- **Policyformatet er endret.** `BH_APPROVAL_POLICIES` må bære `user_id` per
  oppføring før produksjon; e-postmatching er en utviklingsbekvemmelighet.
- **Bare Catenda-innlogging.** Supabase Auth brukes ikke. Flaten er fjernet fra
  koden; anonym innlogging og OAuth-serveren må også slås av i Supabase-konsollet,
  ellers kan tokens fortsatt utstedes selv om rettighetene er tilbakekalt.
- **Vedlegg er kontraktskorrespondanse.** Prosjektdeltakere uten TE- eller
  BH-tilknytning har ikke lesetilgang, på linje med utkast og interne notater.

Struktur som kom med opprydningen: godkjenningsporten utledes av
`BH_BINDENDE_EVENTS` i hendelsesmodellen, og en test krever at enhver
hendelsestype er klassifisert. Kontekstmetodene krever `tillatte_saker`.
Skjermingen av aktivitetstall ligger i `lib/auth/event_visibility`.

Åpne funn fra samme review, i prioritert rekkefølge:

Prioritet 0 er dermed lukket: OAuth-flaten er fjernet, ruteregisteret er
klassifisert og holdes av en test, og analytics er slettet.

1. **RV-02 — policyretur midt i utstedelse.** En pakke kan returneres mens en
   utstedelse pågår; ordren blir utstedt, men posten står varig som «returnert».
2. **RV-10 — `/api/events/batch`** lagrer formelle hendelser uten leveringsintensjon
   eller kvittering, og saksbanneret viser «clear».
3. **RV-13 — feilsvar og åpne helsesjekker.** `str(e)` er rettet i to ruter; det
   står igjen i sju filer, og `/api/health`, `/api/health/catenda` og `/api/routes`
   svarer uten sesjon. De tre står oppført i `test_public_route_registry`.
4. **RV-19, RV-20, RV-21** — pakker godkjennes uten å være validert mot
   utstedelsesreglene, EO-godkjenning avhenger av prosjektregisteret når
   `daily_rate` mangler, og webhooken oppretter EO-saker utenom porten.
5. **RV-12, RV-14, RV-15** — webhookens dedupe og hemmelighetssammenlikning,
   GET-ruter som muterer godkjenningstilstand, og hendelsestabeller som bare
   finnes som docstring uten migrasjon.
6. **RV-17, RV-18 — restanser.** Strenge xfail mangler `raises=`, det tilbakeviste
   designdokumentet er ikke merket foreldet, promptens Del 3 er ubesvart, og
   `audit-begrunnelsestekst-og-dodkode-2026-09-14.md:115` viser til en slettet fil.

Utenfor koden: anonym innlogging og OAuth-serveren må slås av i Supabase-konsollet,
og `BH_APPROVAL_POLICIES` må få `user_id` per oppføring før `APP_ENV` settes til
produksjon.

## Nye arbeidspakker og produksjonskrav

| Prioritet/rekkefølge | Arbeid | Ferdig når |
| --- | --- | --- |
| 0 — lukk eksponering før videre funksjonsarbeid | Fjern uvedkommende auto-consent/OAuth-discovery og ubrukt alternativ auth; behold Catenda-innlogging. Rett analytics-skjerming. | SA-01/02 er ordinære grønne tester. Hele ruteregisteret er klassifisert med offentlig/unntak eller påkrevd autentisering, prosjekt og kontraktsrolle. |
| 1 — felles sikkerhetsgrenser | Eksplisitt autorisert prosjektkontekst, ingen produksjonsfallback til oslobygg. Autorisert leselag skiller offentlig innhold, teaminterne notater og private pakker før aggregering, eksport og PDF. | Negative tester for to prosjekter, motpart, to team på samme side, ukjent team og direkte ressurs-ID. UI, analytics, nedlasting og driftsvisning følger samme regler. |
| 1 — verifiserbar leveranseprosess | CI og isolert staging, reproduserbar databasemigrasjon, nødvendige merge-sjekker. Avklar eierskap til drift og hendelser. | Tester/typesjekk/bygg og faktiske DB-integrasjonstester kjøres automatisk. Autorisasjon er ikke globalt mocket bort; live-tester er eksplisitt adskilt. |
| 2 — atomisk domene og levering | Gjennomfør EO-referanseflyten nedenfor, så BH-svar, ordinære hendelser, vedlegg og webhook. | AP-04 lukket mot ekte Postgres, alle støttede formelle innsendingsveier har varig leveringsintensjon og gjenopptas uten brukerhandling. |
| 2 — minst mulige privilegier og integritet | Avklar runtime-, worker-, drift- og migreringsrettigheter. Beskytt hendelser mot omskriving og uautorisert tilføying; hemmelighetslager og rotasjon. | Reelle runtime-legitimasjoner kan ikke endre/slette historikk eller omgå godkjenningskommandoen. Test også Data API med anon og anonymt innlogget authenticated. Migrering/break-glass er separat, tidsavgrenset og logget. |
| 3 — dokumenter og sporbarhet | Frosset brev/vedlegg med hash, karantene/skanning før frigivelse, tilgangslogg for sensitive lesinger og eksport, revisjon av fullmakts- og prosjektendringer. | Bevarings-/sletteregler omfatter filer, logger og backup. Ingen tokens eller brevtekst i standardlogger. Uavhengig integritetsbevis/lagring velges ut fra trusselmodellen; hash i samme redigerbare database alene er utilstrekkelig. |
| 3 — faktisk gjenoppretting og drift | Restore-øvelse, avstemming mot Catenda, varsling om køalder/usikre utfall, kapasitet og rate limiting. | Dokumentert RPO/RTO og vellykket restore av hendelser, godkjenninger, utkast, filer og køer. Restore utløser ikke blind ny levering. Feil har en mottaker og en testet driftsprosedyre. |

Arbeidspakker på samme nivå kan avklares sammen, men ingen utrulling før den
samlede produksjonsporten er passert. Før neste databasemigrasjon må tilgangs-
og skriverettigheter være konkretisert; ikke bygg runtime på ubegrenset
`service_role` og planlegg å begrense den senere. Det kan kreve at avgrensede
skrivefunksjoner får særskilte rettigheter og et eget review.

## Beslutninger som skal inn i implementeringen

- **Transaksjon:** behold Postgres og RPC som utgangspunkt. PostgREST er ikke
  en hindring for atomisk flerstegsskriving i én funksjon. Ingen plattformflytting
  er nødvendig for å løse det påviste problemet.
- **Leveringsmål:** frys autorisert prosjekt/topic/konfigurasjonsversjon ved
  commit. Endret målkobling parkerer gamle jobber for kontroll; en ny mapping
  skal ikke omdirigere tidligere godkjent innhold til en annen mottaker.
- **Samlet status:** én leveranse kan ha flere operasjoner. Først når alle
  obligatoriske operasjoner er kvittert, er leveransen levert. «Lagret»,
  «venter», «usikkert utfall» og «levert» må skilles i API og brukerflate.
- **Private data:** interne notater skal avvises ved opprettelse av ekstern
  leveringsjobb, ikke bare filtreres i HTTP-ruten. Dead-letter-visning og
  manuell retry må ha eksplisitt prosjekt-/datatilgang og reviderbar handling.
- **Vedlegg/utkast:** binding av alle forventede vedlegg må kontrolleres
  atomisk mot prosjekt, sak, eier/team og revisjon. Utkast slettes ved
  innsending bare hvis den innsendte revisjonen fortsatt er gjeldende.
- **Beregnings- og lesekvalitet:** fjern hardkodet analytics-sats; bruk samme
  autoritative kontraktsgrunnlag som øvrige beregninger. Lagringsfeil skal ikke
  presenteres som null krav eller komplett statistikk.
- **Tilbakekalling og fravær:** definer når endret medlemskap/fullmakt får
  virkning for utkast, godkjenning og allerede offentlig committede brev.
  Fravær løses med sporbar endring/ny godkjenning, ikke delt konto eller bypass.
- **Belastning:** mål ende-til-ende før eventuell medlemskapscache. Angi da
  eksplisitt tilbakekallingsfrist og sterkere kontroll ved formell publisering.

Volumet tilsier en enkel databasebasert worker med lease, backoff og synlige
feil, ikke en ny distribuert meldingsplattform. Avstemming er ekstra vern,
ikke erstatning for atomisk registrering. Fullstendig uavhengig sluttaudit og
driftsavklaringer gjenstår.

## Opprinnelig leveranserekkefølge for godkjenning og outbox

1. **Første leveranse:** rett AP-01 (alternative EO-innganger), AP-02
   (endret fullmakt før utstedelse), AP-03 (sluttdato/fullmaktsgrunnlag) og AP-05
   (felles satsoppslag). Gjør reproduksjonene til ordinære regresjonstester og
   test at legitime flyter fortsatt virker. Status: implementert, testet og
   committet 2026-09-17 (`e235412`), med en regresjon i AP-03 rettet
   2026-09-18 (RV-01).
2. **Arkitektur med grundig review:** konkretiser transaksjonsgrenser,
   datamodell, idempotens og feilforløp for AP-04 og felles PostgreSQL-inbox/outbox.
   Planen skal dekke autorisasjon, prosjektidentitet og worker-gjenoppretting.
   Status: [konkret forslag skrevet](2026-09-17-atomisk-utstedelse-og-outbox.md).
   Fullstendig uavhengig arkitekturreview gjenstår.
3. **Referanseimplementasjon:** én komplett flyt med atomisk EO-utstedelse
   og utgående leveringsjobber, verifisert mot faktisk Postgres og krasjscenarier.
4. **Avgrensede adaptere, kan delegeres:** koble BH-svar, webhook,
   ordinære hendelser og vedlegg til den etablerte kontrakten, én flyt per leveranse.
5. **Uavhengig sluttaudit:** en annen agent enn implementøren prøver å bryte
   garantiene med samtidige forsøk, utløpte leases og mistede eksterne svar.

Testkrav fastsettes før implementering. Én ansvarlig beholder oversikten over
transaksjonsgrensene. Grønn testsuite må ikke erstatte eksplisitt dokumentasjon
av hva som er testet. AP-04 skal ikke regnes som løst med lengre lease.

Første arbeidsrunde omfatter punkt 1 og en konkret plan i punkt 2. Skjemaendring,
worker og omlegging av lagring hører til de etterfølgende implementeringsleveransene.
