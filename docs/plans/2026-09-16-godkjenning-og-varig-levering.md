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
faktisk skjema, og finner ett forhold ingen av dem så alene: fem uavhengige
oslobygg-fallbacks gjør tenant-attribusjonen uetterprøvbar, og det lar seg ikke
rette i ettertid når ekte saker først finnes.

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

**Merknad 2026-09-19: status for de tre.**

| Funn | Status | Merknad |
| --- | --- | --- |
| AUT-01, AUT-02 | **Lukket** | Grensen lagt i `hent_relaterte_saker` som påkrevd `tillatte_saker`. Et tredje sted funnet og lukket i samme runde. To xfail gjort om til ordinære tester, én ny lagt til |
| GFK-01, FE-04 | **Lukket, med restanse** | Gulvet tar dagmulktssats og verdsetter fristdagene, i backend og frontend. Restanse: uten kjent sats blir gulvet fortsatt 0, og fullmaktskontrollen hoppes fortsatt over. Det krever en domenebeslutning |
| INT-04 | **Lukket** | Kontraktssiden utledes av forfatterens lagmedlemskap; fail-closed uten entydig side. Reproduksjonen erstattet av to ordinære tester |
| TFR-01 | **Åpen — venter på domenebeslutning** | Kartlagt og kjørt: feilen gjelder alle tre spor, ikke bare grunnlag. Reproduksjonen utvidet fra ett til tre spor. Ingen produksjonskode endret, fordi modelleringen av «TE godtar avslaget» er et domenevalg |

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
| **1 — oppbevaring og sletting i selve journalen** *(ny 19.09)* | Avgjør bevarings- og slettemodell for hendelsesstrømmen **før** skriverettighetene strammes. Grunnlaget ligger i [faktagrunnlag for DPIA](../personopplysninger-faktagrunnlag-2026-09-19.md); merk særlig at journalen i dag er **tom**, at `aktor` lagrer navn framfor bruker-ID, og at interne notater ikke er kontraktsvarsler og derfor ikke trenger samme permanens. Hendelsene bærer `aktor` (personnavn), og `internt_notat` er fritekst om navngitte personer. Kartlegg hvilke regelsett som gjelder for Oslobygg KF, der personvern trekker mot sletting og arkivplikt mot bevaring. | Det finnes en besluttet og dokumentert modell for hvordan en sletteplikt oppfylles i en journal som ellers er uforanderlig — for eksempel kryptografisk sletting, pseudonymisering ved skriving, eller en begrunnet konklusjon om at sletteplikten ikke gjelder. Modellen er avklart før `REVOKE UPDATE, DELETE` kjøres, og før journalen inneholder ekte persondata. |
| **1 — byggreproduserbarhet og forsyningskjede** *(ny 19.09)* | Pinn Python-avhengighetene; 10 av 21 i `requirements.txt` bruker `>=`, så to bygg kan gi ulike versjoner. Innfør avhengighetsskanning for begge økosystemer i CI. | `pip install` fra repoet gir samme versjoner to ganger. Sårbarhetsskanning kjører som påkrevd sjekk, med en besluttet terskel for hva som blokkerer. Planens krav om «reproduserbar databasemigrasjon» har da en tilsvarende garanti for selve bygget. |
| **1 — HTTP-herding av klientleveransen** *(ny 19.09)* | `nginx.conf` setter i dag bare cache-headere. Legg til CSP, HSTS, `X-Content-Type-Options` og `frame-ancestors`. | Klienten leveres med en CSP som faktisk er testet mot appen, ikke bare satt. Særlig relevant fordi brevvisningen rendrer rik tekst gjennom TipTap og DOMPurify — CSP er forsvar i dybden der sanitiseringen svikter. |
| **2 — domenegjennomgang av NS 8407-reglene** *(ny 19.09)* | Systematisk gjennomgang av tilstandsovergangene i `timeline_service.py` (2226 linjer) og `business_rules.py` mot kontraktsstandarden. TFR-01 — at aksept av et avslag settes til `GODKJENT` — ble funnet ved en tilfeldighet, og ingen av de fire arkitekturfasene ville avdekket den. | Hver hendelsestype har en dokumentert forventet tilstandsovergang, og hver overgang har en test. Regelsettet i `business_rules.py` er holdt opp mot standardens krav, ikke bare mot seg selv. |
| **1 — avhengigheten av Catenda** *(ny 19.09)* | Avklar hva som gjelder kontraktsmessig, ikke bare teknisk. Identitet, medlemskap, dokumenter og prosjektstruktur kommer alle derfra, og appen har ingen vei utenom. Hva er SLA-en? Kan et varsel sendes med rettsvirkning mens Catenda er nede? Hva skjer hvis prosjektet slettes, lisensen utløper eller organisasjonen bytter leverandør? | Det finnes et skriftlig svar på hva som skjer med pågående frister ved utilgjengelighet, og en besluttet håndtering av tapt eller slettet Catenda-prosjekt. Avhengigheten er dokumentert som en akseptert risiko med navngitt eier, eller redusert. |
| **1 — universell utforming** *(ny 19.09)* | Oslobygg KF er kommunalt, og forskrift om universell utforming av IKT gjelder trolig. `svelte-check` gir i dag tre a11y-advarsler — manglende ARIA-rolle og tabindex på dialogen i `WithdrawModal`, og klikkhåndterer uten tastaturekvivalent i `Kontrollrommet`. | Kravsnivået er avklart mot forskriften, og advarslene er enten rettet eller begrunnet. `npm run check` gates på a11y, ikke bare på typefeil. Dette er et mulig rettslig krav, ikke en kvalitetsdetalj. |
| **2 — bevisførsel og framleggelse** *(ny 19.09)* | Systemets formål er å vise hva som ble varslet når. I dag finnes **ingen eksportvei** — ingen rute, ingen funksjon. Dataene ligger bak innlogging i et format bare appen forstår. Bygg uttrekk av én sak med hendelser, tidsstempler, aktør, vedleggsreferanser og hashsummer, lesbart utenfor appen. Avklar forvaringskjede og **tidskilde**. | En sak kan framlegges for oppmann eller voldgift uten at appen kjører, med dokumentert uttrekkstidspunkt og hvem som hentet ut. Tidsstemplene har en forsvarbar kilde: `datetime.now(UTC)` på en autoskalert container uten synkroniseringsgaranti holder ikke når en preklusjonsfrist står på spill. Det er besluttet hva som skjer når motparten bestrider systemets egen framstilling. |

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
