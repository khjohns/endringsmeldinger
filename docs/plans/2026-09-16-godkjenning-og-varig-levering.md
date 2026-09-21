# Masterplan: sikkerhet, dataintegritet og varig levering

Avtalt 2026-09-16, basert på
[auditen av 93d630a](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md).
Appen er ikke i produksjon og har ingen reelle produksjonsdata.

## Merknad 2026-09-21: presisert retning før neste implementering

Etter [siste handoff](../handoff-2026-09-21-frister.md) har oppdragsgiver
sluttet seg til retningen i [arkitekturpresiseringene AF-01–AF-06](../arkitekturforinger-2026-09-21.md).
Dette er føringer for videre design, ikke gjennomførte rettinger eller nye
lukkinger av funn. Ved motstrid med eldre designtekst gjelder presiseringene:

- **MS-09:** teaminterne data skal også vernes i datalaget. Mekanismen og
  tillitsgrensen for identitet og prosjektkontekst må konkretiseres.
- **MS-02/AP-04:** kommandoer, transaksjoner og begrensede runtime-/worker-
  rettigheter utformes samlet. Postgres med RPC er fortsatt utgangspunktet.
- **MS-08:** fjerning av relasjonstabellen er satt til **må revurderes før
  implementering**; en atomisk vedlikeholdt relasjonsprojeksjon med
  prosjektavgrensede fremmednøkler er foretrukket alternativ til vurdering.
- **MS-11 og KR-04/MG-01:** dokumenthash suppleres med en konkret bevis- og
  bevaringsmodell, og deterministisk gjenoppbygging blir et akseptkriterium.
- **Rekkefølge:** ekte PostgreSQL-tester i CI og én komplett EO-flyt med de
  endelige sikkerhetsgrensene prioriteres foran generell RY-opprydding.

Planverket skal konsolideres i **nye dokumenter til review**, etter
[oppdraget til Gemini](../prompt-gemini-konsolidering-2026-09-21.md).
Konsolideringen erstatter ikke denne masterplanen før den er gjennomgått.

## Bakgrunn og dokumentkjede

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
faktisk skjema, og finner ett forhold ingen av dem så alene: uavhengige
oslobygg-fallbacks gjør tenant-attribusjonen uetterprøvbar, og det lar seg ikke
rette i ettertid når ekte saker først finnes. Sammenstillingen skrev «fem».
Det ble fjorten; se merknaden 2026-09-20 under [status for
5a](#status-2026-09-18).

Overtar du dette arbeidet uten kontekst: start i
[handoff 2026-09-19](../handoff-2026-09-19.md).

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

**Merknad 2026-09-19 (senere samme dag) til RV-07, AUT-01 og AUT-02.** Rettet.
Grensen er flyttet inn i `BaseSakService.hent_relaterte_saker`, der `tillatte_saker`
er et påkrevd nøkkelordargument, slik at et nytt kallsted ikke kan glemme den.
`valider_grunnlag_fortsatt_gyldig` og `finn_forseringer_for_sak` avgrenser
kandidatene før noen state leses. Søk etter mønsteret ga et tredje sted som ingen
av sporene hadde funnet — `GET /api/forsering/<sak>/relaterte`, der relasjonene
kommer fra Catenda og `topic_board_id` er en global innstilling. De to strenge
`xfail`-reproduksjonene XPASS-et og er gjort om til ordinære regresjonstester; det
tredje stedet har fått en ny. **RV-07 kan nå stå som lukket som klasse for
forseringens lesestier.** Den generelle mangelen består: grensen finnes fortsatt
bare i applikasjonskoden, ikke i dataene (RC-1, fase 1).

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

**KR-01 til KR-14 (ny 21.09)** — korrekthetsgjennomgang av målskjemarunden,
[audit-korrekthet-2026-09-21](../audit-korrekthet-2026-09-21.md). Ett funn har
høy alvorlighet og bør tas før noe annet:

**Status:** KR-01 til KR-03 og KR-05 til KR-12 er lukket i `bab9679`.
Migrasjonen `20260921091208_koe_register_project_organisasjon_id` er anvendt mot
prosjektet; `koe_register_project` tar nå `p_organisasjon_id` som påkrevd
parameter, og rettighetene er satt på nytt etter at den gamle signaturen ble
sluppet.

Åpne:

- **KR-04 — `compute_state` er ikke en ren projeksjon.** Navneoppslaget gir nå
  samme svar uansett kontekst, så state divergerer ikke lenger. Men oppslaget
  ligger fortsatt inne i projeksjonen. Å flytte det til svargrensen berører hvert
  sted `SakState` serialiseres, og hører sammen med MG-01.
- **KR-13 — backfill-skriptet.** Dobbel I/O og et typefilter som hviler på at et
  felt finnes, ikke på `sak_metadata.sakstype`. Lav; skriptets løkker har ingen
  atferdstester.
- **KR-14 — `DROP TABLE` uten `CASCADE`.** Blir ikke rettet: migrasjonen er
  anvendt, og en anvendt migrasjon er uforanderlig.
**RY-01 til RY-07 (ny 21.09)** — utsatt etter oppryddingen av KR-rettingene,
[audit-opprydding-2026-09-21](../audit-opprydding-2026-09-21.md). **RY-01 er den
med vekt:** «hvilke saker finnes», «hvilken sak har denne topicen» og «hvilken
type er saken» stilles alle til den append-only journalen, enda `sak_metadata`
er projeksjonen som finnes for å svare på dem. Den lukker KR-13 og gjør både
pagineringen og indeksen fra KR-02 unødvendige — men `sak_metadata` har ingen
indeks på `catenda_topic_id`, så den må legges først.

- **KR-15 — streng `xfail` på et kappløp (ny 21.09).** TST-02 i
  `test_testsuite_blindsoner_audit_20260918.py` er `strict=True` over en
  `threading.Barrier`-reproduksjon. Målt 1 XPASS på 20 kjøringer, og XPASS på en
  streng xfail er rød gate. Testen er dokumentasjon og skal bli stående; valget
  mellom å gjøre reproduksjonen deterministisk og å slippe strengheten er en
  vurdering for utvikler.

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

**Overlapp med Gemini-sporet (merknad 2026-09-19).** Flere av de åpne RV-funnene
over er samme sak som et funn fra pass 1–9. De skal arbeides én gang, ikke to:

| Åpent RV-funn | Samme sak som | Merknad |
| --- | --- | --- |
| RV-02 | GFK-03 | Sporet oppgir selv koblingen |
| RV-10 | INT-05 | Sporet oppgir selv koblingen. INT-05 legger til at `CatendaDeliveryStatus` rapporterer «clear» |
| RV-13 | CFG-03, OBS-07 | Rå `str(e)` og åpne driftsruter |
| RV-21 | INT-04 | Sporet oppgir selv koblingen |
| RV-12 | INT-01 | Webhookens dedupe og hemmelighetssammenlikning |
| RV-15 | DB-01, DB-08 | DB-01 er sterkere (kjørt mot tom base). DB-08 er uten virkning: viewene finnes ikke |

Alle 60 funn er nå etterprøvd på nær ett (FE-06, inkonklusiv). To av dem — GFK-03 og INT-05 —
er duplikater av RV-02 og RV-10 over og skal ikke arbeides separat. **GFK-04 er
allerede en truffet beslutning i dette dokumentet** (forsering utenfor
godkjenningsflyten) og er ikke en ny feil. **INT-04 trenger en domenebeslutning, ikke
en retting:** webhookens hardkodede `aktor_rolle="TE"` står på saksopprettelse, ikke
på utstedelse, så spørsmålet er om opprettelse av en EO-sak skal være BH-forbeholdt.

**Merknad 2026-09-19: INT-04 er avgjort og lukket.** Beslutningen ble en tredje vei —
kontraktssiden utledes av topic-forfatterens faktiske lagmedlemskap, siden Catenda
allerede oppgir bruker-IDen i `bimsync_creation_author.user.ref`. Opprettelse er
altså verken BH-forbeholdt eller TE-antatt. Webhooken er fail-closed: uten entydig
side opprettes ingen sak.

Rotårsaksgrupperingen av alle 60 funnene står i
[vurderingen av auditfunnene](../vurdering-av-auditfunn-2026-09-19.md), del 3. Tre
saker er der anbefalt tatt uavhengig av fasene, fordi de er datafeil i den juridisk
avgjørende delen av domenet: **TFR-01** (aksept av avslag settes til GODKJENT),
**GFK-01 med FE-04** (fullmaktsgulvet dekker ikke tidskonsekvens) og **AUT-01/AUT-02**
(RV-07 lukket per kallsted).

**Merknad 2026-09-20: tenant-attribusjonen (handoffens 5a) er gjennomført.**

Migrasjonen `tenant_attribution_prosjekt_id` er **anvendt** mot
prosjektet og verifisert mot katalogen: `prosjekt_id TEXT NOT NULL` uten default,
med indeks, på `koe_events`, `forsering_events`, `endringsordre_events` og
`sak_relations`, og `DEFAULT 'oslobygg'` er fjernet fra `sak_metadata`.
*Kjørt og observert:* et forsøk på å skrive en rad uten prosjekt avvises med
`23502`. Grensen ligger nå i dataene, ikke bare i applikasjonskoden.

**Planen antok en backfill. Den var unødvendig:** alle fire tabellene hadde
**0 rader** (kontrollert 2026-09-20), så `NOT NULL` kunne settes direkte og
ingen rad kunne bli feilmerket. Steg 2 i handoffens oppskrift — «backfill fra
`sak_metadata`, aldri fra `source`» — var en nulloperasjon.

**Handoffen oppgir fem oslobygg-fallbacks. Det var fjorten.** Samme mønster som
§7b beskriver: «tre» ble fem, fem ble åtte — og åtte ble fjorten.

**Merknad 2026-09-20 til tallet «åtte».** Dette avsnittet sa først åtte, og at
«alle er fjernet i samme runde». Begge deler var feil, og begge er rettet her.
Gjennomgangen etter 5a fant seks til, alle i rutekode. De falt utenfor det
første søket fordi det lette etter `or "oslobygg"` og `DEFAULT_PROJECT_ID` —
formene de åtte første hadde — og ikke etter `getattr(g, "project_id",
"oslobygg")` eller `request.headers.get("X-Project-ID", "oslobygg")`. Det er
tredje gang tallet vokser, og hver gang av samme grunn: søket formes av funnene
man allerede har. Fjorten er tallet etter at alle fire formene er søkt opp. Det
er et argument for at ingen femte form gjenstår, ikke et bevis.

**Hvor mye de seks siste faktisk betydde.** *Lest ut av koden,* ikke kjørt: bare
én av dem var nåbar i drift. `approval_routes.py`-koalesceringen
`(metadata.prosjekt_id or "oslobygg")` traff enhver metadatarad med tomt
prosjekt og kalte den Oslobygg. De to `getattr`-formene var døde fordi
`init_project_context` alltid setter attributtet — `getattr` faller først
tilbake når attributtet *mangler*, og `None` er ikke det samme som fraværende.
De tre i `bim_link_routes.py` leste den rå headeren bak
`require_project_access`, som avviser med 403 før rutekroppen kjøres når
headeren mangler (*kjørt og observert:*
`test_foresporsel_uten_prosjekt_avvises_for_medlemskap_slas_opp`) — de var
nåbare bare under `DISABLE_AUTH` i test og utvikling.

Det er ingen grunn til å la dem stå. Fem av seks var feller: de ville blitt
levende i samme øyeblikk som en dekoratør ble glemt, en `before_request`-hook
endret, eller en rute flyttet. Det er nettopp slik den første av dem oppsto.

Alle fjorten er fjernet:

| Sted | Var | Er |
| --- | --- | --- |
| `project_context.py` | `DEFAULT_PROJECT_ID = "oslobygg"`, brukt i header-lesing og `get_project_id()` | Borte. `get_project_id() -> str \| None`; manglende header betyr ukjent prosjekt |
| `project_access.py` | `record.prosjekt_id or DEFAULT_PROJECT_ID` | Ren sammenlikning |
| `endringsordre_service.py` ×2 | `metadata.prosjekt_id or "oslobygg"` | Ren sammenlikning, og `_belongs_to_project` er fail-closed uten kontekst |
| `sak_metadata_repository.py` ×3 | `row.get("prosjekt_id") or "oslobygg"` | Ren oppslag |
| `cloudevents.py` | `ce_source` skrev `oslobygg` | `unknown` — et ærlig utsagn |
| databasens `DEFAULT` | `sak_metadata.prosjekt_id` | Droppet |
| `client.ts` | `activeProjectId = 'oslobygg'` | `null`. Headeren utelates når prosjektet er ukjent |
| FE-01 | `LetterPreviewModal` sendte verken prosjekt, CSRF eller credentials | Alle tre settes nå |
| `approval_routes.py` ×2 | `getattr(g, "project_id", "oslobygg")`, og `(metadata.prosjekt_id or "oslobygg") != project` | `get_project_id()`, og en sammenlikning som avviser når prosjektet er ukjent |
| `endringsordre_routes.py` | `getattr(g, "project_id", "oslobygg")` i `eo_godkjenninger` | `get_project_id()`. Uten prosjekt finnes ingen policy å slå opp |
| `bim_link_routes.py` ×3 | `request.headers.get("X-Project-ID", "oslobygg")` i `list_ifc_products`, `list_ifc_types` og `list_bim_models` | `get_project_id()` — den kontrollerte konteksten, ikke den rå headeren |

Skrivestiene stempler prosjektet fra autorisert kontekst og avviser å skrive uten
det — som `PermanentError`, ikke `ValueError`, fordi `append_batch` er
retry-dekorert og nye forsøk aldri gir en forespørsel en kontekst den ikke hadde.

**Tre `xfail` ble XPASS og er gjort om til ordinære regresjonstester:** DB-06,
`ce_source`-fallbacken, og FE-01. Den siste ble *erstattet* framfor snudd: den
hevdet at et CSRF-løst mutasjonskall burde gi 200, og det er en ønskeforestilling
som nå er direkte gal. Den nye prøver begge halvdeler — de nye headerne slipper
gjennom, de gamle avvises fortsatt.

**Merk om DB-06.** Testen leser modulens docstring, ikke databasen, så den er
grønn fordi DDL-en der er oppdatert. At kolonnen finnes i basen vet vi fra
katalogspørringen og den observerte `23502`-avvisningen — ikke fra testen. Det
står skrevet inn i testen.

**Hva som gjenstår for at grensen skal være i kraft:** RLS-policyen
`USING (prosjekt_id = current_setting('app.project_id'))` lar seg nå *skrive*,
men er ikke skrevet. Samtlige policyer er fortsatt `service_role / ALL /
USING (true)`. Det hører til pakke 2 om minste privilegium.

**Merknad 2026-09-19: status for de tre.**

| Funn | Status | Merknad |
| --- | --- | --- |
| AUT-01, AUT-02 | **Lukket** | Grensen lagt i `hent_relaterte_saker` som påkrevd `tillatte_saker`. Et tredje sted funnet og lukket i samme runde. To xfail gjort om til ordinære tester, én ny lagt til |
| GFK-01, FE-04 | **Lukket, med restanse** | Gulvet tar dagmulktssats og verdsetter fristdagene, i backend og frontend. Restanse: uten kjent sats blir gulvet fortsatt 0, og fullmaktskontrollen hoppes fortsatt over. Det krever en domenebeslutning |
| INT-04 | **Lukket** | Kontraktssiden utledes av forfatterens lagmedlemskap; fail-closed uten entydig side. Reproduksjonen erstattet av to ordinære tester |
| TFR-01 | **Lukket** | Modelleringen besluttet: aksept bekrefter byggherrens svar og forbedrer det aldri. Ny `SporStatus.AVSLATT_AKSEPTERT` = oppgjort ved enighet, på byggherrens premisser. Teller som oppgjort for vederlag og frist (som `TRUKKET`), ikke for grunnlag. Tre xfail gjort om til regresjonstester |

Merk også at fem TFR-funn ikke løses av
arkitekturarbeidet i det hele tatt — domenegjennomgang må kjøres ved siden av.

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
| **1 — databasearkitektur: trenger vi alle tabellene?** *(ny 20.09)* | Full gjennomgang av skjemaet, med **to spørsmål som ikke er det samme.** Det første er arkeologi: hvilke tabeller og kolonner er i bruk, hvilke er etterlatenskaper, og hvilke finnes i basen uten å finnes i repoet. Det andre er utforming: blant dem som *er* i bruk, kunne de vært færre? Tre parallelle hendelsestabeller med identisk form, en relasjonsprojeksjon av noe hendelsene alt bærer, og ti `cached_*`-kolonner er alle i bruk — og alle er kandidater. Avklar i samme pakke hvordan en migrasjon skal nå databasen; i dag finnes ingen mekanisme. **Foreslått retning:** migrasjonsmappa er eneste kilde, og anvendelsen skjer derfra — `supabase/config.toml` pluss `supabase db push`, eventuelt som et steg i CI mot staging. Da kan «anvendt» avledes framfor å huskes. Regelen om at DDL og migrasjonsfil skal skrives i samme runde står i `AGENTS.md`; den er husskikk inntil mekanismen finnes, og et dårligere vern enn automatikk. | Hver tabell i `public` er enten i bruk, dokumentert som bevisst reserve, eller fjernet — **og hver tabell som er i bruk har et svar på om den burde vært slått sammen med en annen.** Repoets migrasjonsmappe og basens faktiske skjema stemmer, og det finnes en dokumentert vei fra fil til database. |
| **1 — oppbevaring og sletting i selve journalen** *(ny 19.09)* | Avgjør bevarings- og slettemodell for hendelsesstrømmen **før** skriverettighetene strammes. Grunnlaget ligger i [faktagrunnlag for DPIA](../personopplysninger-faktagrunnlag-2026-09-19.md); merk særlig at journalen i dag er **tom**, at `aktor` lagrer navn framfor bruker-ID, og at interne notater ikke er kontraktsvarsler og derfor ikke trenger samme permanens. Hendelsene bærer `aktor` (personnavn), og `internt_notat` er fritekst om navngitte personer. Kartlegg hvilke regelsett som gjelder for Oslobygg KF, der personvern trekker mot sletting og arkivplikt mot bevaring. | Det finnes en besluttet og dokumentert modell for hvordan en sletteplikt oppfylles i en journal som ellers er uforanderlig — for eksempel kryptografisk sletting, pseudonymisering ved skriving, eller en begrunnet konklusjon om at sletteplikten ikke gjelder. Modellen er avklart før `REVOKE UPDATE, DELETE` kjøres, og før journalen inneholder ekte persondata. |
| **1 — byggreproduserbarhet og forsyningskjede** *(ny 19.09)* | Pinn Python-avhengighetene; 10 av 21 i `requirements.txt` bruker `>=`, så to bygg kan gi ulike versjoner. Innfør avhengighetsskanning for begge økosystemer i CI. | `pip install` fra repoet gir samme versjoner to ganger. Sårbarhetsskanning kjører som påkrevd sjekk, med en besluttet terskel for hva som blokkerer. Planens krav om «reproduserbar databasemigrasjon» har da en tilsvarende garanti for selve bygget. |
| **1 — HTTP-herding av klientleveransen** *(ny 19.09)* | `nginx.conf` setter i dag bare cache-headere. Legg til CSP, HSTS, `X-Content-Type-Options` og `frame-ancestors`. | Klienten leveres med en CSP som faktisk er testet mot appen, ikke bare satt. Særlig relevant fordi brevvisningen rendrer rik tekst gjennom TipTap og DOMPurify — CSP er forsvar i dybden der sanitiseringen svikter. |
| **2 — domenegjennomgang av NS 8407-reglene** *(ny 19.09)* | Systematisk gjennomgang av tilstandsovergangene i `timeline_service.py` (2226 linjer) og `business_rules.py` mot kontraktsstandarden. TFR-01 — at aksept av et avslag settes til `GODKJENT` — ble funnet ved en tilfeldighet, og ingen av de fire arkitekturfasene ville avdekket den. | Hver hendelsestype har en dokumentert forventet tilstandsovergang, og hver overgang har en test. Regelsettet i `business_rules.py` er holdt opp mot standardens krav, ikke bare mot seg selv. |
| **1 — avhengigheten av Catenda** *(ny 19.09)* | Avklar hva som gjelder kontraktsmessig, ikke bare teknisk. Identitet, medlemskap, dokumenter og prosjektstruktur kommer alle derfra, og appen har ingen vei utenom. Hva er SLA-en? Kan et varsel sendes med rettsvirkning mens Catenda er nede? Hva skjer hvis prosjektet slettes, lisensen utløper eller organisasjonen bytter leverandør? | Det finnes et skriftlig svar på hva som skjer med pågående frister ved utilgjengelighet, og en besluttet håndtering av tapt eller slettet Catenda-prosjekt. Avhengigheten er dokumentert som en akseptert risiko med navngitt eier, eller redusert. |
| **1 — universell utforming** *(ny 19.09)* | Oslobygg KF er kommunalt, og forskrift om universell utforming av IKT gjelder trolig. `svelte-check` gir i dag tre a11y-advarsler — manglende ARIA-rolle og tabindex på dialogen i `WithdrawModal`, og klikkhåndterer uten tastaturekvivalent i `Kontrollrommet`. | Kravsnivået er avklart mot forskriften, og advarslene er enten rettet eller begrunnet. `npm run check` gates på a11y, ikke bare på typefeil. Dette er et mulig rettslig krav, ikke en kvalitetsdetalj. |
| **2 — bevisførsel og framleggelse** *(ny 19.09)* | Systemets formål er å vise hva som ble varslet når. I dag finnes **ingen eksportvei** — ingen rute, ingen funksjon. Dataene ligger bak innlogging i et format bare appen forstår. Bygg uttrekk av én sak med hendelser, tidsstempler, aktør, vedleggsreferanser og hashsummer, lesbart utenfor appen. Avklar forvaringskjede og **tidskilde**. | En sak kan framlegges for oppmann eller voldgift uten at appen kjører, med dokumentert uttrekkstidspunkt og hvem som hentet ut. Tidsstemplene har en forsvarbar kilde: `datetime.now(UTC)` på en autoskalert container uten synkroniseringsgaranti holder ikke når en preklusjonsfrist står på spill. Det er besluttet hva som skjer når motparten bestrider systemets egen framstilling. |

**Merknad 2026-09-19: første halvdel av «verifiserbar leveranseprosess» er levert.**
`.github/workflows/ci.yml` kjører tre gatende jobber på push til `main` og på hver
pull request: backend-testene (`pytest`), frontend-testene (`vitest`) og typesjekken
(`svelte-check --threshold error`). Alle tre er grønne i dag, så CI gater fra første
kjøring uten opprydding først. Alle tre er verifisert fra ren tilstand — nytt venv
fra requirements-filene, og `npm ci` fra lockfila.

Det som gjenstår i pakken: isolert staging, reproduserbar databasemigrasjon, faktiske
DB-integrasjonstester og påkrevde merge-sjekker i GitHub-innstillingene. En workflow
gater ikke i seg selv — jobbene må settes som required checks på `main`.

**Ikke med, og hvorfor:**

- **Driftskriptene.** De gater riktig med `--ci` (exit 1), men seks av ni feiler i
  dag. Koblet på ville CI vært rød fra første kjøring. `category_drift` feiler
  dessuten på sin egen parser. Det må avgjøres hvilke som skal baselines og hvilke
  som skal rettes.
**Merknad 2026-09-19 (senere samme dag): lint gater nå også.** Gjelden er ryddet og
`ruff` og `eslint` er lagt inn som steg i CI. Backend er på **0 ruff-feil**,
frontend på **0 eslint-feil**, og `prettier --check` passerer.

| Regel | Antall | Handling |
| --- | --- | --- |
| F401, I001, F541, UP017 | 56 | `ruff check --fix`. Diffen er lest linje for linje: ubrukte importer, sortering, sammenslåing av dupliserte `from`-linjer. Ingen `__init__.py` berørt, så ingen re-eksport er fjernet ved et uhell |
| **UP042** | **14** | **Slått av i `pyproject.toml`, ikke rettet.** `class X(str, Enum)` → `StrEnum` endrer `str()` og f-string-interpolering: `str(SporStatus.GODKJENT)` går fra `'SporStatus.GODKJENT'` til `'godkjent'`. Kontrollert kjørt. JSON blir likt, men 14 domeneenums serialiseres inn i hendelsesloggen, og det hører til en bevisst domenegjennomgang |
| E741 ×2 | 2 | `l` → `lenke` i `bim_link_routes.py` |
| F841 ×1 | 1 | `author_email` i webhooken var en død tilordning — også på `origin/main`, ikke innført av denne runden |
| eslint ×3 | 3 | Ubrukte `beforeEach`/`afterEach`, og manglende nøkkel på `{#each filer}` i `NewCaseForm.svelte`. Den siste er ikke bare en nitte: uten nøkkel gjenbruker Svelte DOM-noder etter indeks, og fjerning midt i en filliste kan la tilstand henge igjen på feil rad. Komponenten har ingen egen test (den er blant de 58 i TST-07), så endringen er riktig etter Sveltes regler, men ikke dekket av suiten |

**To ting som følger av at lint nå gater:**

- **`ruff` er pinnet (2026-09-20).** `ruff==0.16.8` i `requirements-dev.txt`. En ny
  utgivelse kunne ellers aktivert regler innenfor de valgte familiene (`E`, `F`,
  `B`, `I`, `UP`, `SIM`) og gjort hver PR rød uten at noen hadde endret kode.
  Oppgradering er nå en bevisst handling. **De øvrige `>=`-kravene står igjen** —
  10 av 21 i `requirements.txt` — og hører fortsatt til arbeidspakken om
  byggreproduserbarhet.
- **`UP042` må revurderes bevisst, ikke glemmes.** Den er slått av med begrunnelse i
  `pyproject.toml`, ikke fordi StrEnum er feil, men fordi bytte av enum-basis i en
  append-only journal krever en gjennomgang. Hører sammen med domenegjennomgangen av
  NS 8407-reglene.

**Foreløpige funn til databasearkitektur-pakken (2026-09-20, ikke en gjennomgang
— biprodukt av 5a).**

Alt under er kontrollert mot prosjekt `gwdxadexwktegkklyobv`, ikke utledet av
migrasjonene.

1. **Repoet kan ikke opprette databasen.** Basens migrasjonshistorikk lister
   `001_koe_core_tables` til `006_koe_rls_performance`. **Ingen av dem finnes i
   repoet.** Det bekrefter DB-01 og handoffens felle 3 fra databasesiden.
2. **En repo-migrasjon er aldri anvendt, og den er ikke harmløs.**
   `supabase/migrations/20260918090000_event_tables_actorteam.sql` ligger i
   repoet, er idempotent og forsiktig skrevet — og kolonnen `actorteam` finnes
   ikke på noen av de tre hendelsestabellene. *Kjørt og observert:* den eksakte
   spørringen `supabase_event_repository.py` sender feiler med
   `42703: column "actorteam" does not exist`. Siden `select` navngir kolonnen,
   feiler **enhver lesing av enhver sak** gjennom Supabase-lageret — ikke bare
   interne notater. Ingen test fanger det, fordi `EVENT_STORE_BACKEND` er `json`
   som standard og metadata `csv`.
   **Dette motsier statustabellen over: RV-08 står som lukket.** Koden *er*
   riktig; databasen fikk aldri kolonnen. Migrasjonen er ett kall unna å kunne
   anvendes, og basen er tom, så ingen rad kan bli feilmerket.
3. **Ingen mekanisme håndhever at en migrasjon når basen.** Det finnes ingen
   `supabase/config.toml`, bare en `migrations`-mappe, og to parallelle
   migrasjonssett (`supabase/migrations/` og `backend/migrations/`).
4. **Testdobbelen kan ikke fange klassen.** `EVENT_TABLE_COLUMNS` i
   `test_event_roundtrip.py` speiler repoet, ikke basen, og oppgir `actorteam`
   som en eksisterende kolonne. Den er tro mot repoet, og repoet er ikke tro mot
   basen. Notert i fila.
5. **Tre tabeller har null referanser i produksjonskode:** `app_identities`,
   `user_groups` og `magic_links`. Den siste er verdt et blikk — `MagicLinkManager`
   lagrer tokens i `koe_data/magic_links.json`, altså en fil, mens tabellen står
   ubrukt. Det er *lest ut av koden*, ikke kjørt, og kan være feil om noe når dem
   utenom navnet.
6. **Spørsmål gjennomgangen bør stille:** finnes det to medlemskapstabeller
   (`project_memberships` og `app_project_memberships`), og er begge i bruk?
   Hva er `catenda_models_cache`? DB-04 melder at `sak_relations` mangler
   fremmednøkler — bevisst eller etterlatenskap?
7. **Tre kandidater som er i bruk, og likevel bør prøves.** Punktene over spør
   om noe er ubrukt. Disse er i bruk, og spørsmålet er et annet — om formen er
   riktig. *Hypoteser, ikke funn:* ingen av dem er undersøkt.
   - **De tre hendelsestabellene** (`koe_events`, `forsering_events`,
     `endringsordre_events`) har samme form og samme beskrankninger. Én tabell
     med en sakstypekolonne ville gitt én RLS-policy å skrive framfor tre, ett
     sted å tilbakekalle `UPDATE`/`DELETE`, og ett sted å legge en append-only-
     trigger. Mot det står at en `UNIQUE (sak_id, versjon)` over én tabell er en
     annen samtidighetsprofil, og at transaksjonsplanen allerede forutsetter tre.
     Avgjøres derfor **sammen med** den planen, ikke etterpå.
   - **`sak_relations`** er en CQRS-projeksjon: relasjonene ligger også i
     hendelsene. Den finnes for oppslagshastighet på en base som i dag er tom.
     Spørsmålet er om et indeksert oppslag i hendelsene holder, og hva
     projeksjonen koster i konsistens — den må vedlikeholdes i takt, og DB-04
     viser at den alt har drevet (manglende fremmednøkler).
   - **De ti `cached_*`-kolonnene** på `sak_metadata` er denormaliserte
     summeringer av hendelsesdata. DB-02 handlet om at åtte av dem manglet;
     ingen har spurt om de bør finnes. De er skrivetidsavledninger av en
     append-only kilde, og hver av dem kan komme ut av takt med den.

**Hvordan gjennomgangen bør gjøres — punktene over er ikke den.** De er et
biprodukt av 5a, samlet opp mens arbeidet gjaldt noe annet. En gjennomgang som
skal kunne konkludere med å *fjerne* noe, trenger mer enn det.

- **Begynn med en navngitt oversikt.** Ingen av de 20 tabellene er ramset opp
  ved navn noe sted i `docs/`. Uten den lista er enhver konklusjon om «alle
  tabellene» udokumentert.
- **Per tabell:** radantall, hvilken migrasjon som opprettet den, om den
  migrasjonen finnes i repoet, og hvilke symboler i koden som leser og skriver
  den. Et navnesøk er ikke nok — se punkt 5, der `magic_links` ser ubrukt ut,
  men konklusjonen er uttrykkelig merket *lest ut av koden*.
- **Per kolonne på de store tabellene:** samme spørsmål. Kolonner er billigere å
  overse enn tabeller, og `cached_*`-familien er ti av dem.
- **Skill de to spørsmålene i konklusjonen.** «Ubrukt» og «i bruk, men
  overflødig» krever ulike bevis og har ulik risiko. Det første fjernes; det
  andre er en designbeslutning som må veies mot transaksjonsplanen.
- **Gjør den før fundamentbyttet, ikke etter.** Arkitekturvurderingens
  konklusjon er «behold domenet, bytt fundamentet». Et skjema som bæres over
  urørt, bærer også med seg det som burde vært luket.

**Merknad 2026-09-20: gjennomgangen er gjennomført.** Den står i
[audit: databasearkitektur](../audit-databasearkitektur-2026-09-20.md) (DA-01 til
DA-15). Metodekravene over er fulgt: alle tjue tabellene er ramset opp ved navn
med radtall, opprettende migrasjon og lesere/skrivere, og de to spørsmålene —
«ubrukt» mot «i bruk, men overflødig» — er holdt fra hverandre i konklusjonen.

**Pakken står nå på dette.**

*Levert, og målt:*

- **Migrasjonen som manglet `actorteam` er anvendt** (`20260920152042`).
  Kolonnen finnes på alle tre hendelsestabellene. RV-08 er nå lukket også i
  databasen, ikke bare i koden.
- **Sju tabeller som bare fantes i basen, finnes nå i repoet.** Tre nye
  migrasjonsfiler er skrevet: kjerneskjemaet, `project_memberships` og en
  avstemming av `backend/migrations/` mot basen.
- **Repoet kan bygge databasen.** Hele settet er kjørt mot en tom PostgreSQL 16,
  og resultatet er katalogidentisk med `gwdxadexwktegkklyobv` på fire av fire
  snitt — kolonner, skranker, indekser og policyer, alle like på md5. Åtte av ti
  funksjoner er bit-identiske; de to siste avviker bare i innrykk og kommentarer.
- **DB-01 og DB-02 er lukket.** Begge xfail-reproduksjonene XPASSet og er gjort
  om til ordinære tester, etter regelen i `AGENTS.md`. To nye regresjonstester i
  `test_database_arkitektur_20260920.py` vokter at hver tabell i basen har en
  `CREATE TABLE` i repoet, og at migrasjonsrekkefølgen ikke blir sirkulær igjen.
  Suiten: 1461 passert, 41 xfail, 0 ruff-feil.

*Korreksjon til de sju foreløpige punktene over — de skal ikke leses som de
står:*

- **Punkt 5 er delvis feil, slik markeringen «lest ut av koden» åpnet for.**
  `app_identities` er **ikke ubrukt**: den har 14 rader og leses og skrives av
  `koe_resolve_identity` ved hver innlogging. At den har null treff i et
  navnesøk, skyldes at logikken ligger i en databasefunksjon. `user_groups` og
  `magic_links` holder som etterlatenskaper. Se DA-07.
- **Punkt 2 har riktig årsak, men feil rekkevidde.** Det var ikke «enhver lesing
  av enhver sak» som feilet. Lesinger med `select("*")` gikk bra; lesingen som
  navngir kolonnen feilet *stille* i en `except Exception: continue`. Det som
  faktisk brøt, var **enhver skriving** — `append_event` navngir `actorteam` i
  raden. Verre enn opprinnelig beskrevet, ikke mildere. Se DA-02.
- **Punkt 1 var ufullstendig.** Historikken har ti rader, ikke seks; de fire
  nyeste har fil. Se DA-01.

*Gjenstår i pakken:*

1. **Mekanismen fra fil til base (DA-03).** Fortsatt ingen
   `supabase/config.toml` og ingen `db push`. Tre konkrete hindre er navngitt i
   dokumentet. **Opphevet samme kveld:** `config.toml` finnes nå,
   `backend/migrations/` er tømt og DA-04 er rettet — se merknaden om DA-03
   over. Bare migrasjonshistorikken gjenstår, og den krever legitimasjon.
2. **Forslagene, som er forslag.** DA-12 (slå sammen de tre
   hendelsestabellene — **avgjøres sammen med transaksjonsplanen**, og basen er
   tom nå, så det argumentet har en utløpsdato), DA-13 (`sak_relations`: legg på
   fremmednøklene uansett; vurder fjerning), DA-14 (de ti `cached_*`). Ingen av
   dem er gjennomført; skjemaet er ikke endret ut over det som er nevnt over.
3. **Tre tabeller foreslått fjernet:** `user_groups`, `magic_links` og
   `project_memberships`. Den siste skrives av en trigger og **leses aldri** —
   kodens egen skrivesti treffer en unik-skranke og logger en advarsel hver gang
   (DA-10). Fjerning krever at `viewer`-rollen først avklares mot DB-05.
4. **En eier til BIM-flaten (DA-15).** `catenda_models_cache` og
   `sak_bim_links` er i bruk etter bokstaven, har null rader, og ingen audit har
   vurdert om flaten er besluttet. Det er et produktspørsmål.

**Merknad 2026-09-20 (kveld): DA-03 er gjennomført på repo-siden.**
Migrasjonsmappa er nå eneste kilde. `supabase/config.toml` finnes,
`backend/migrations/` er tømt, og filnavnrekkefølgen *er* apply-rekkefølgen —
verifisert ved å bygge alle seksten filene mot en tom PostgreSQL 16 i ren
`sort`-rekkefølge og sammenlikne med basen på fem snitt: kolonner, skranker,
indekser, policyer og **rettigheter**. Alle fem er identiske. DA-04 er løst ved
å gi fila basens versjonsnummer; `actorteam` hadde samme feil og fikk samme
behandling.

**Gjenstår, og kan ikke gjøres herfra:** migrasjonshistorikken i basen stemmer
ennå ikke med mappa (6 av 16). Femten `supabase migration repair`-kommandoer
retter det; de er listet i
[auditen](../audit-databasearkitektur-2026-09-20.md) under «Veien fra fil til
database». De krever legitimasjon denne sesjonen ikke har, og de endrer
historikk — ikke skjema.

**Nytt funn, fra rettighetssnittet:** åtte av tjue tabeller har **ingen
eksplisitt `GRANT` til `service_role`** i repoet. De virker bare fordi Supabase
deler ut rettigheter ved prosjektoppsett. Det er en skjult plattformavhengighet,
og den hører til arkitekturvurderingens «bytt fundamentet»: flyttes basen vekk
fra Supabase, mister appen tilgang til åtte tabeller uten at noen migrasjon sier
fra. Hører også til pakken om minste privilegier, som uansett må avgjøre hvilke
rettigheter runtime skal ha.

**Merknad 2026-09-20 (kveld): designspørsmålene DA-12 til DA-15 er lukket.**
[Målskjemaet](../design-maalskjema-database-2026-09-20.md) (MS-01 til MS-15)
avgjør dem, på sju premisser besluttet av utvikler samme dag: magic links utgår
(innlogging via Catenda ID / Entra ID), BIM er ikke i bruk men relevant og
objekter hører alltid til én sak, formålet med BIM-koblingen er å se hvilke
komponenter som fører til tvist, vedlegg lagres kun i Catenda, løsningen bør i
prinsippet støtte andre virksomheter, og to kan arbeide i ulike spor samtidig.

Hovedpunktene: de tre hendelsestabellene slås sammen, `sak_metadata` deles i
register og projeksjon, `sak_relations` fjernes til fordel for GIN-indekser på
hendelsenes jsonb, interne notater tas **ut** av journalen, `aktor` blir
`aktor_id`, og BIM-kobling blir hendelser framfor slettbare rader. Målet er
atten tabeller mot dagens tjue — poenget er ikke antallet, men at hver tabell
får én skriver og at journalen blir uforanderlig på en måte basen håndhever.

**To ting med frist, fordi basen er tom:** `aktor_id` (MS-04) og
`organisasjon_id` på `projects` (MS-10) blir dyre eller umulige så snart ekte
saker finnes — `projects.id` er i dag `'oslobygg'`, altså organisasjonsnavnet
brukt som prosjekt-ID.

**Merknad 2026-09-20 (sent): MS-01, MS-04 og MS-10 er gjennomført.** De tre med
frist er tatt mens basen fortsatt er tom, og kostet derfor null datamigrasjon.
Dokumentet er [gjennomføringen](../gjennomforing-maalskjema-2026-09-20.md).

*Kjørt og observert:*

- **To migrasjoner anvendt** mot prosjektet: `20260920192448`
  (`organisasjon_id` på `projects`) og `20260920193558` (`hendelse`). Katalogen
  bekrefter begge.
- **Basen har atten tabeller.** `koe_events`, `forsering_events` og
  `endringsordre_events` er sluppet etter en spørring som viste null rader i
  alle tre umiddelbart før. `hendelse` har samme skranker, fremmednøkkel,
  indekser og policy som de tre hadde, pluss en **eksplisitt** `GRANT` til
  `service_role`.
- **Journalen bærer `aktor_id`**, aldri et personnavn: `app_users.id`, eller
  `catenda:<subject>` for en Catenda-forfatter uten konto hos oss. Navnet slås
  opp ved visning i `lib/aktor_navn.py`, og et oppslag som feiler faller tilbake
  til identiteten framfor å velte tidslinjen eller brevet. De tre literalene
  `"BH"`, `"Ukjent BH"` og `"Ukjent TE"` er borte fra skrivestiene.
- **`projects.organisasjon_id` er `NOT NULL` uten default**, og står ikke blant
  de oppdaterbare feltene. `POST /api/projects` krever den.
- **Hele settet — atten filer — bygger en tom PostgreSQL 16 i ren
  `sort`-rekkefølge**, og katalogen er identisk med prosjektets på fem av fem
  snitt. Sjekksummene står i gjennomføringen. **De er ikke sammenliknbare med
  handoffens:** spørringene er skrevet på nytt, og et annet uttrykk gir et annet
  md5 på identisk skjema.
- **1482 backend-tester, 590 frontend-tester, `ruff` 0, `check:error` 0.**

**Gjenstår, med samme frist:** **MS-05** — interne notater ut av journalen.
Målskjemaets rekkefølge setter den sammen med MS-04 og MS-10, og den er ikke
gjort. Den er større enn de to: tidslinjen må flette to kilder, og
`event_visibility` må dekke begge.

> **Merknad 2026-09-21 (kveld): MS-05 er gjennomført.** Avsnittet over gjaldt
> til `71d9115`. Notatene ligger nå i tabellen `notat`, versjonstelleren
> flyttes ikke av et notat, og tidslinjen fletter de to kildene ved lesing.
> Sletting er mulig og begrenset til forfatteren.
> **Basen har dermed nitten tabeller, ikke atten** — punktet lenger opp gjaldt
> til 20.09. Åtte av de nitten har fortsatt ingen eksplisitt `GRANT` i repoet.
> Se [gjennomføringen](../gjennomforing-ms05-2026-09-21.md).
> **Ingen beslutning med frist står igjen.** MG-02, den andre, er gjennomført
> samme kveld — se [MG-02-gjennomføringen](../gjennomforing-mg02-2026-09-21.md).

**Gjenstår, uten frist:** **MS-02** (append-only håndhevet av basen) er nå
ulåst — den ventet på at journalens form skulle bli endelig, og det er den.
Migrasjonshistorikken stemmer fortsatt ikke med mappa: alignmenten er **8 av
18**, og `supabase migration repair` krever legitimasjon.

**Merknad 2026-09-21: koden fra runden er gjennomgått, MG-01 til MG-09.**
Fire uavhengige gjennomganger med vinkel gjenbruk, forenkling, effektivitet og
nivå. Oppryddingen er gjennomført i `75789b8`; funnene som ble stående, står i
[gjennomgangen](../audit-maalskjema-gjennomgang-2026-09-21.md).

**Ett funn er nytt og skapt av forrige runde, og det har frist: MG-02.**
*(Lukket 21.09 kveld — se merknaden nederst i dette avsnittet og
[gjennomføringen](../gjennomforing-mg02-2026-09-21.md). Avsnittet under står som
funnet ble skrevet; to av de tre hindringene det navnga, holdt ikke.)*
`catenda:<subject>` er en andre verdiform i `hendelse.actorid`, så samme person
kan føres som UUID i én hendelse og prefikset i en annen — avhengig av om de
hadde logget inn da webhooken kom. `koe_resolve_identity` i basen ville fjernet
formen, men gjør en ubetinget `UPDATE` av navn og e-post og trenger en
`COALESCE`-variant først. Dette er samme klasse som MS-04 selv: uopprettelig
når journalen bærer ekte saker.

**MG-01** er middels og mindre enn den ser ut: navneoppslaget ligger i
`compute_state` framfor i svarlaget, men *kjørt og observert* er fire av de fem
oppslagene døde — `get_timeline` har null kallere, og ingen komponent leser
`AktorInfo.navn`. Eneste levende forbruker er `EOData.utstedt_av`. Virkningen i
dag er at samme EO viser navn utstedt i en forespørsel og UUID utstedt i
bakgrunnen.

**MG-03** står som streng `xfail`: parsegrensen avviser `event_id` og
`tidsstempel`, men ikke de tre aktørfeltene, som overskrives i ruta i stedet.
En ny mutasjonsrute kan glemme overskrivingen. Rettingen krever at
`approval_service` og frontenden endres samtidig.

Resten — MG-04 til MG-09 — er lav eller hører til MS-06. **MG-09 er ført inn i
`AGENTS.md`:** en anvendt migrasjonsfil kan ikke rettes, heller ikke
kommentarene, fordi `schema_migrations.statements` lagrer rågteksten.

**Korrekthet er ikke gjennomgått, og det er en åpen arbeidspakke.** De fire
vinklene ble uttrykkelig bedt om å ikke lete etter korrekthetsfeil, og
`/simplify` er kvalitet, ikke feil. Femogtjue filer produksjonskode i
hendelsesloggen har dermed ingen sett etter bugs i. **Kjør `/code-review` mot
runden — `git log --oneline 9f70c45~1..main` — før noe bygges videre på den.**

**Ett nytt hull, funnet av premiss P4:** vedlegg har **ingen hash** noe sted.
Lagres bytene bare i Catenda, finnes det ingen måte å vise at dokumentet der er
det som ble sendt. Én kolonne — `innhold_sha256` på `vedlegg`-tabellen
durable-inbox-notatet allerede har designet — lukker det. Hører til pakke 3,
«bevisførsel og framleggelse».

**Ingenting i målskjemaet er implementert.** Det er et målbilde.

**Merknad til DA-11 for pakke 1:** RLS-policyene er fortsatt
`service_role / ALL / USING (true)` — tjue av tjueén, én per tabell. Den
tjueførste er en `authenticated`-lesepolicy på `project_memberships`. Den er **uvirksom** —
kontrollert på laget som avgjør: `anon` og `authenticated` har null
tabellrettigheter og null `EXECUTE` etter `20260918131137`. Det er altså ikke et
sikkerhetsfunn, men den bør fjernes sammen med tabellen.

**Presiseringer til eksisterende pakker (19.09).** To rader trenger en skjerping
snarere enn en ny pakke:

- **Pakke 1, akseptkriteriet for tenant-grensen.** Kriteriet er i dag negative
  tester per rute. Etter at grensen er flyttet til databasen bør det formuleres som
  en *egenskap*: en rolle med prosjekt A i konteksten får null rader fra prosjekt B
  ved direkte spørring, utenom API-et. Begrunnelsen er dokumentert: RV-07 og RV-09
  er begge bekreftet lukket på funnstedet og ikke som klasse, og det ble oppdaget
  først da et annet spor fant AUT-01, AUT-02 og AUT-03. Et eksempelbasert kriterium
  fanger ikke den feilformen; et egenskapsbasert gjør det.
- **Pakke 3, kapasitet.** «Kapasitet og rate limiting» mangler et beståttkriterium.
  Auditen 2026-09-15 målte median 643,5 ms for to Catenda-kall. Er det innenfor?
  Uten et tall for saker per prosjekt, samtidige brukere, autolagringsfrekvens og
  akseptabel svartid er ytelsestesting uten bestått eller ikke bestått.
- **Pakke 3, rate limiting.** Nå som plattformen er avklart — Google Cloud, mulig
  Azure Container Apps — er `RATE_LIMIT_STORAGE=memory://` ikke lenger bare en
  prototypeverdi. Med N instanser blir effektiv grense N ganger den konfigurerte,
  og den nullstilles ved hver kaldstart. Delt lager hører til samme flytting som
  resten av SQLite-lagrene i fase 1.

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
- **Forovervendt kompatibilitet (ny 19.09):** hendelsene er append-only, så en
  utrulling som bryter noe kan ikke rulles tilbake på data. Skjemaendringer må derfor
  være forovervendt kompatible i begge retninger: gammel hendelse må kunne leses av
  ny kode, og ny kode må tåle å bli rullet tilbake til forrige versjon uten at
  hendelser skrevet i mellomtiden blir uleselige. Det styrer hvordan fase 1 kan
  gjennomføres, og utelukker skjemaendringer som krever samtidig kodebytte.
- **Belastning:** mål ende-til-ende før eventuell medlemskapscache. Angi da
  eksplisitt tilbakekallingsfrist og sterkere kontroll ved formell publisering.

**Merknad 2026-09-21 (kveld): tre beslutninger er tatt.** Alle tre sto oppført
som «krever et menneske», og er avgjort av oppdragsgiver. De styrer
implementeringen og skal ikke tas opp igjen uten at denne merknaden oppheves.

- **Sletteplikt mot arkivplikt: arkivplikt går foran.** Journalen bevares. Det
  dokumentene til nå har behandlet som arbeidshypotese — Oslobygg KF er
  kommunalt, arkivplikt gjelder, og GDPR art. 17 nr. 3 gjør unntak for
  rettskrav — er nå den besluttede forutsetningen. **Følgen: kryptografisk
  sletting av journalen skal ikke bygges.** MS-04 og MS-05 er tiltakene, og de
  ble valgt nettopp fordi de er riktige uansett utfall. Arbeidspakken
  «oppbevaring og sletting i selve journalen» er dermed besvart for journalens
  del: modellen er pseudonymisering ved skriving (MS-04) pluss fritekst om
  personer utenfor den uforanderlige strømmen (MS-05). Endrer det rettslige
  bildet seg, er det denne merknaden som må oppheves først.
- **MG-02: ja, en webhook skal opprette brukerrader.** **Gjennomført samme
  kveld** — `koe_resolve_identity` kalles nå fra webhookstien, og
  `catenda:<subject>` finnes ikke lenger. Av de tre hindringene funnet navnga,
  var hindring 2 (beslutningen) allerede avgjort i kode av
  `koe_reconcile_memberships`, og hindring 3 (issueren) allerede oppfylt.
  Hindring 1 var reell og er rettet i migrasjon `20260921164900`. `actorid` er
  fortsatt `TEXT`; se gjennomføringen for hvorfor.
- **DB-05: `viewer` skal finnes som begrep.** En ren leserolle — innsyn uten
  handlingsrett, for revisor, advokat eller rådgiver — er ønsket.
  `app_project_memberships` må derfor utvides før `project_memberships` kan
  fjernes. Planen om å fjerne den gamle tabellen står, men forutsetningen er en
  utvidelse av den nye, ikke en forenkling.

**To av tre er gjennomført samme kveld:** den første gjennom MS-05
([gjennomføringen](../gjennomforing-ms05-2026-09-21.md)), MG-02 gjennom
[MG-02-gjennomføringen](../gjennomforing-mg02-2026-09-21.md). **DB-05 er
besluttet, ikke bygget.**

Merk til MG-02: to av de tre hindringene funnet navnga, holdt ikke ved
kontroll mot katalogen. Beslutningen om å opprette brukerrader var allerede tatt
i kode — `koe_reconcile_memberships` har gjort det ved hver
medlemssynkronisering hele tiden.

Volumet tilsier en enkel databasebasert worker med lease, backoff og synlige
feil, ikke en ny distribuert meldingsplattform. Avstemming er ekstra vern,
ikke erstatning for atomisk registrering. Fullstendig uavhengig sluttaudit og
driftsavklaringer gjenstår.

## Organisatoriske forutsetninger (ny 19.09)

Disse er prosesser, ikke kode, og kan godt være dekket utenfor repoet. De står her
fordi et produksjonsløp for et kommunalt foretak normalt krever dem, og fordi ingen
av dem er nevnt i planverket. **Første oppgave er å bekrefte om de allerede kjører;**
om de gjør det, erstatt punktet med en referanse.

| Forutsetning | Hvorfor den hører hjemme her |
| --- | --- |
| **ROS-analyse** | Standard før produksjonssetting i norsk offentlig sektor. Auditserien er en teknisk gjennomgang, ikke en risikovurdering med sannsynlighet, konsekvens og akseptkriterier. |
| **DPIA / vurdering av personvernkonsekvenser** | Datakartleggingen er gjort: [faktagrunnlag for DPIA](../personopplysninger-faktagrunnlag-2026-09-19.md) beskriver hvilke personopplysninger som lagres, behovet bak hver kategori, og fire teknisk tilgjengelige alternativer som lagrer mindre. Den rettslige vurderingen gjenstår. Henger direkte sammen med arbeidspakken om oppbevaring og sletting i journalen. Hendelsene bærer personnavn, og interne notater er fritekst om navngitte personer. DPIA-en er normalt stedet konflikten mellom sletteplikt og uforanderlighet avgjøres. |
| **Ekstern sikkerhetsvurdering** | All testing hittil er intern. «Uavhengig sluttaudit» i leveranserekkefølgen under betyr en annen agent enn implementøren, ikke en tredjepart. For et system som håndterer tvistegrunnlag er en ekstern gjennomgang før produksjon vanlig praksis. |
| **Hendelseshåndtering med navngitt eier** | Planen sier «avklar eierskap til drift og hendelser», men ikke hva prosessen er når en entreprenør hevder at systemet mistet varselet deres. Det er en annen type hendelse enn en teknisk feil: den har en kontraktsfrist, og svaret må kunne dokumenteres. Henger sammen med arbeidspakken om bevisførsel. |

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
