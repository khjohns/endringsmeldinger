# Uavhengig review av tilgangsmekanismen i B-02

**Dato:** 2026-09-23. **Kodegrunnlag:** `10ab5469614377608a3129d6241963fead144e7c`
på `b02-designgrunnlag`, PR #37 fortsatt åpen ved oppstart.
Reviewgren: `review-b02-tilgangsmekanisme-2026-09-23`.
**Forrige ledd:** [designet](design-b02-tilgangsmekanisme-2026-09-22.md),
[reviewoppdraget](prompt-review-b02-tilgangsmekanisme-2026-09-22.md) og
[oppdragsgivers svar](prompt-b02-tilgangsmekanisme-2026-09-22.md#2-oppdragsgivers-svar).
Normative krav: [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md)
2.3, 3.1, B-02/B-04 og F1, samt
[AF-01/AF-02](arkitekturforinger-2026-09-21.md).

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet gjelder mulig
konsekvens dersom manglene bygges inn i målarkitekturen. Forsøkene brukte bare
syntetiske data i kastbare lokale baser. Prosjektet ble bare lest gjennom
katalogspørringer; ingen saksdata ble lest.

## Konklusjon

**Anbefalingen kan legges til grunn med navngitte endringer.** Kombinasjonen av
RLS for lesing og smale kommandoer for bindende skriving er et godt grunnlag
for AF-01 og AF-02. Skrivevakten holdt for de prøvde journaloperasjonene.
Dette er ikke belegg for at hele integritetsgrensen eller F1 er ferdig utformet.

Før de første F1-migrasjonene må designet konkretisere:

1. **Transport og faktisk legitimasjonsmyndighet:** sammenlikn avgrenset direkte
   innlogging med et PostgREST-oppsett som begrenser privilegerte roller.
   Selvsignering med prosjektets nøkkel er ikke en nødvendig egenskap ved
   PostgREST, og en forespørselsvakt er et dokumentert alternativ (RB2-01).
2. **Alle integritetsbærende data og operasjoner:** vernet må omfatte
   saksattribusjon, frosne leveringsreferanser, pakker, policy og fullmakt.
   En uendret journalrad er utilstrekkelig når kommandoen stoler på mutable
   metadata. En ren INSERT-vakt kan heller ikke kopieres til alle disse
   tabellene (RB2-02).
3. **Private skrivestier og kontekst:** prosjektet til referert sak, side,
   datatyper og obligatoriske kommandoargumenter må kontrolleres. Definer
   dessuten hvordan feil fra private skrivestier skjermes (RB2-03/04).
4. **Identitetsgrensen:** fast Catenda-issuer/provider, normalisert subjekt og
   eksplisitt myndighet for synkronisering. Godkjenningspolicy må ikke kunne
   svekkes gjennom denne myndigheten. Oppdragsgiver må avklare om designets
   avgrensning til strukturell godkjenning oppfyller trusselkravet (RB2-05).
5. **Bevis og F1-port:** legg til rettighetsmatrise, manglende negative tester,
   migrerings-/break-glass-kriteriet og en presis tilbakekallingskontrakt
   (RB2-06–08).

**Ja, TM-01 er konkret motbelegg som gjør at transportpremisset i 3.1 bør tas
opp igjen.** Det begrunner en ny vurdering, ikke en automatisk overgang til T2.
PostgreSQL som transaksjonsgrense står fast. B-02 avgjøres fortsatt av
oppdragsgiver; reviewet endrer ingen beslutningsstatus.

## Funn

**K 23.09:** kjørt og observert lokalt. **D 23.09:** kontrollert i katalogen til
`gwdxadexwktegkklyobv`. **L:** lest ut av hele relevante funksjoner/filer.
**Dok:** lest i primærdokumentasjon. K sier ikke at hostet Supabase er prøvd.

| ID | Alvorlighet | Funn | Belegg |
| --- | --- | --- | --- |
| RB2-01 | Høy | TM-01 gjelder den valgte nøkkelmodellen; transportalternativene og dokumentert forespørselsvakt er utilstrekkelig vurdert | K, D, Dok |
| RB2-02 | Høy | Journalvakten dekker ikke integritetsbærende metadata og outbox; beskrivelsen av vakt og eierskap er for generell | K, L, D |
| RB2-03 | Middels | Private INSERT-operasjoner kontrollerer ikke sakens prosjekt og har sidekanaler gjennom skranker | K, L, Dok |
| RB2-04 | Middels | Ufullstendig kontekst gir privat innsyn; NULL forventet versjon passerer kommandoen | K, L |
| RB2-05 | Middels | Identitets-RPC-ene gir videre myndighet enn identitetsregelen og medlemskapsbeviset uttrykker | K, L, D |
| RB2-06 | Middels | 71 grønne sjekker dekker mindre enn enkelte navn og tabellceller hevder | K, L |
| RB2-07 | Middels | Tilbakekallingens tidsgrenser og forholdet til B-04 er ikke ferdig beskrevet | K, L, Dok |
| RB2-08 | Middels | Testplanen mangler et uttrykkelig F1-akseptkriterium og konkretisering av flere leveranser | L |

## RB2-01 — nøkkelmodellen må skilles fra transporten

**Sted:** designets sammendrag, TM-01, alternativsammenlikningen og avsnitt 5;
prototypens `01_plattform_postgrest.sql` og `kjor.sh`.

D bekrefter at `authenticator` har `SET` til `service_role`, som har
`BYPASSRLS`. [Supabases dokumentasjon](https://supabase.com/docs/guides/auth/signing-keys)
beskriver egne JWT-er med denne rollen, importerte signeringsnøkler og separat
API-nøkkel. Et nytt nøkkelformat alene begrenser ikke rollen som en innehaver
av en betrodd privat signeringsnøkkel kan velge. Den lokale grunnkjøringen
bekreftet rollevalget. Hostet JWT-validering er ikke prøvd.

Derimot er «alle alternativer der runtime snakker med PostgREST» for bredt.
Supabase dokumenterer en
[forespørselsvakt](https://supabase.com/docs/guides/api/securing-your-api#configure-a-pre-request-function)
som kan avvise før Data API-operasjonen. I det lokale
[transportforsøket](vedlegg/b02-prototype-2026-09-22/transport_bevis.py) ga samme
signeringsnøkkel og samme endpoint HTTP 200 for `koe_runtime` og HTTP 403 for
`service_role`, med feil fra vakten. Oppsettet ligger i
[avvis_service_role.sql](vedlegg/b02-prototype-2026-09-22/avvis_service_role.sql).

Dette viser en støttet mekanisme, ikke en ferdig sikkerhetsarkitektur. Vakten
gjelder Data API, ikke andre Supabase-produkter eller direkte SQL. Et komplett
oppsett trenger en tillatt rolleliste, vern av selve konfigurasjonen og
funksjonsflaten, samt test av alle tilgjengelige veier. En annen mulighet er
å holde prosjektets signeringsnøkkel utenfor runtime og bruke en separat
utsteder med begrenset myndighet; dette er et designalternativ, ikke prøvd her.

**T2 er undervurdert:** direkte innlogging uten medlemskap i `service_role`
fjerner myndighet til tabellskriving som signeringsnøkkelen ellers gir.
Konteksten er fortsatt betrodd runtime, men reduksjonen i skriveprivilegier er
reell. Kostnadene er tilkoblingsstyring, transaksjonsdisiplin og pooling.
Supavisor er ikke prøvd; se RB2-07.

**B er rimelig vurdert slik det er definert:** dersom enhver ny lesefunksjon
har bred tabelltilgang og må gjenta autorisasjon, arver den ikke AF-01-vernet.
Sentralisering av lesing kan forbedre B, men må selv ha en håndhevet grense.
RLS under funksjonene gjør løsningen til en variant av C. Reviewet finner
derfor ikke grunn til å forkaste C til fordel for ren B.

**Før migrasjon:** velg transport og legitimasjonsmodell sammen. Dersom
signeringsmodellen beholdes, må alle rettighetskrav evalueres også som
`service_role`, eller rollevalget begrenses før det når datalaget.

## RB2-02 — integritet omfatter mer enn journalraden

**Sted:** `02_b02_lag.sql`, `koe_api.send_varsel`,
`koe_privat.hendelse_skrivevakt`, `sak_metadata`, `utgaende_levering`;
designets alternativ C og rolletabell.

**K:** skrivevakten avviste direkte journalendringer i originalbeviset og
tilleggsforsøkene: `ON CONFLICT`, `COPY`, `MERGE UPDATE/DELETE` og
fremmednøkkelhandlingene `SET NULL`/`SET DEFAULT`. `RESTRICT`/`NO ACTION`
avviste gjennom referanseintegriteten. Direkte rollebytte og tildeling av
kommandoeieren ble avvist for den prøvde forbindelsen. Forsøk på å opprette en
logisk publisering ble avvist; en faktisk replikeringskanal ble ikke bygget.

**K:** `service_role` kunne endre sakens prosjekt i metadata. En etterfølgende
ordinær kommando ga samme `sak_id` en eksisterende hendelse i B og en ny
hendelse i A. Den gamle journalraden ble ikke endret, men kommandokontrollen
stolte på en attribusjon som den overtatte rollen kunne skrive om. Rollen kunne
også endre prosjektet i køen og legge en notat-ID i køens `event_id`.
Det siste viser manglende validering ved jobbopprettelse, **ikke observert
ekstern levering av et notat**: prototypen har ingen leveringsworker.

Arbeiderens egne kolonnerettigheter holdt, også for `event_id`. Den foreslåtte
JWT-transporten for worker ville imidlertid gjeninnføre RB2-01 dersom worker
selv fikk den samme signeringsmyndigheten. Beviset gjelder direkte innlogging.

**L:** vaktbeskrivelsen sier at bare INSERT som `koe_kommando` slipper gjennom
på «hver integritetstabell». Det er ikke en full operasjonsmodell for
godkjenningspakker, fullmakt og policy. `koe_policy` er en annen eier, og
pakkestatus og leveringsstatus trenger autoriserte tilstandsendringer. Skillet
mellom uforanderlige versjoner, mutable projeksjoner og tillatte overganger må
beskrives per tabell og kolonne.

**TRIGGER og standardrettigheter:** D bekrefter `TRIGGER` på journalen,
`EXECUTE` til `service_role` på funksjonene i `public`, og standardtildelinger
til nye funksjoner der. K viste at rollen kunne montere en eksisterende
triggerfunksjon. Hele de ti `public`-funksjonene ble lest fra katalogen; det ble
ikke påvist noen som gir en direkte journalomgåelse. Prototypens kommando har
ingen dynamisk SQL. Monteringsrettigheten skal likevel fjernes fra de
integritetsbærende tabellene. D viste også `TEMP` på databasen; «ingen CREATE
i noe skjema» er derfor ikke en full vurdering av midlertidige objekter.
Slike objekter og samspill med triggere ble ikke prøvd videre.

**Eierskap:** «ingen rolle kan bli kommandoeieren» er feil uten avgrensning.
K viste at en ikke-superbruker med `CREATEROLE` automatisk fikk `ADMIN` på
rollen den opprettet, og kunne gi seg selv `SET`. Dette samsvarer med
[PostgreSQL 17](https://www.postgresql.org/docs/17/sql-createrole.html).
Databaseadministrator er allerede utenfor trusselmodellen; dette er en
presisering av grensen, ikke en ny runtime-omgåelse. Den lokale superbrukeren
i `kjor.sh` prøver ikke Supabases migreringsmyndighet.

**Før migrasjon:** fastsett hele settet med integritetsbærende tabeller,
referanser, funksjonseiere og tillatte operasjoner. Vern saksattribusjonen og
frosne leveringsdata; avvis private ressurser ved jobbopprettelse. Test både
rettigheter og samspill mellom kommandoer og mutable data.

## RB2-03 — private skrivestier og sidekanaler

**Sted:** `02_b02_lag.sql`, `runtime_skriv` på `notat`; `fk_notat_sak` og
`notat_pkey` i
[notatmigrasjonen](../supabase/migrations/20260921153900_notat_tabell.sql).

**K, som avgrenset `koe_runtime`:** et notat med A som prosjekt og korrekte
aktør-/teamfelt kunne referere til en eksisterende sak i B. Samme operasjon
med ukjent sak ga `23503`. Innsetting med en eksisterende notat-ID i B ga
`23505`, mens en ny ID lykkes. Forskjellen røper eksistens selv om SELECT
gir null rader. Feildetaljen for den prøvde unikfeilen var skjult, men
SQLSTATE og skrankenavnet var nok til å skille utfallene.

Dette følger også av at
[referanseskranker går utenom RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
En prosjektavgrenset fremmednøkkel er nødvendig for integriteten, men er ikke
alene et fullstendig vern mot alle eksistensprober i andre team. En smal
notatkommando kan kontrollere referanser først, generere ID og normalisere
feil før svar. Direkte DML krever en tilsvarende begrunnet kontrakt.

**Hvem kan nå dette?** Forsøkene går direkte til prototypens database.
I dagens app genererer serveren notat-ID, og
[`require_project_access`](../backend/lib/auth/project_access.py) kontrollerer
sakene før
[`submit_event`](../backend/routes/event_routes.py) når notatlageret.
[`parse_event_from_request`](../backend/models/events.py) avviser klientens
`event_id`. Dette er L, ikke en kjørt HTTP-reproduksjon. Det er derfor ikke
påvist en sidekanal for en vanlig bruker i dagens app. En overtatt runtime
kan nå databaseforsøkene; konfidensialitet der er godtatt restrisiko.
Manglende referansevern er likevel relevant for den lovede beskyttelsen mot
glemt kontroll og nye skrivestier.

Kommandoens feil for sak i B og ukjent sak var identiske (`42501`, «ukjent
sak»). Telling etter B ga null. Tidsbaserte sidekanaler ble ikke målt, og
LIKE-/søkeuttrykk eller alle mulige JSON-felt ble ikke undersøkt.

## RB2-04 — kontekst og kommandoargumenter er ikke en ferdig kontrakt

**Sted:** `02_b02_lag.sql`, `krav`, `side`, `privat_team`, notatpolicyene og
`send_varsel`; designets avsnitt 4.

**K:** manglende, tom eller ugyldig `koe_side`, også et JSON-objekt, ga fortsatt
innsyn i eget teams notat. Kommandoen avviste de samme ugyldige sideverdiene.
Notatpolicyen kontrollerer prosjekt/team/handlingsrett, men ikke gyldig side.
Det bryter den brede formuleringen om at manglende kontekst avviser; det
viste ikke tilgang til et annet team med korrekt teamkrav.

Store bokstaver i en ellers gyldig aktør-UUID ga null rader, fordi sammenlikningen
er tekstlig. Aktør som liste, prosjekt som objekt og tomt prosjekt/team ga null
rader. Ekstra krav ble ignorert. Et vilkårlig ikke-tomt team kunne brukes til
å opprette et notat. «Ukjent team gir null» i originalbeviset prøver dermed bare
at testdataene ikke har en rad med dette teamet; det beviser ikke at basen
kjenner gyldige team. Team på tillit er allerede en uttalt designbegrensning.

**K:** `p_forventet_versjon = NULL` passerte `send_varsel`. SQL-sammenlikningen
gir NULL og går ikke inn i konfliktgrenen. NULL hendelsestype passerte også
typelistens IF, men ble stoppet av tabellens NOT NULL-skranke. Det siste er
avvisning, men gjennom feil mekanisme og med en annen feilklasse.

**Før migrasjon:** definer obligatoriske krav separat for offentlig lesing,
privat lesing, skriving og systemkall. Normaliser UUID-er og valider JSON-typer.
Null rader kan være riktig fail-closed ved lesing; vellykket skriving med
ufullstendig kommando er det ikke. Avvis NULL/ugyldig versjon, type og payload
uttrykkelig, og krev gyldig side for privat tilgang dersom invariant 2.3.1 skal
ha den beskrevne betydningen. Definer hvordan teamtilhørigheten attesteres.

## RB2-05 — identitetsfunksjonene er en myndighetsgrense

**Sted:** `02_b02_lag.sql`, eierskiftet til `koe_identitet`; katalogens
`koe_resolve_identity` og `koe_reconcile_memberships`;
[`AuthService`](../backend/services/auth_service.py).

**D:** begge funksjonene er fortsatt INVOKER i prosjektet, med tom `search_path`
og EXECUTE bare for `postgres`/`service_role`. Prototypens DEFINER-konvertering
virker med den avgrensede rollen. Direkte tilgang til identitetstabellene er
avvist i originalbeviset.

**K:** runtime kunne opprette en annen brukerrad for samme subjekt ved å
endre issuer med en avsluttende skråstrek. Provider `entra` ble også godtatt.
Gjennom synkroniserings-RPC-en kunne runtime føre inn en ny identitet med
handlingsrett. Medlemskapsoppslaget er dermed uavhengig av et glemt filter,
men ikke av runtime som leverer selve medlemslisten.

Det siste er forenlig med designets avgrensning om at en overtatt runtime
kan opptre som andre. Oppdragsgivers opprinnelige krav sier samtidig at runtime
ikke skal kunne omgå godkjenning. Forskjellen mellom strukturelt gyldig kommando
og faktisk menneskelig godkjenning må derfor uttrykkelig avklares av
oppdragsgiver; reviewet behandler den ikke som allerede akseptert.
Fullmakter og godkjenningspolicy må ha en separat myndighetsgrense.
Synkroniseringsfunksjonen bevarer eksisterende
`viewer_override` ved oppdatering (L); det betyr ikke at runtime er uten
myndighet til å opprette andre identiteter og medlemskap.

**Før migrasjon:** lås provider/issuer i en smal Catenda-funksjon, og normaliser
subjektet som `catenda_id()` før identiteten nøkles. Fjern eller begrens den
generiske inngangen. Dagens innlogging og synkronisering bruker allerede fast
issuer og normalisert subjekt (L i `AuthService`, `CatendaOAuth.user` og
`normalize_members`). Testdataenes `sub-a1` er ikke en realistisk normalisert
Catenda-ID og beviser ikke denne regelen. Kontroller også hvilke funksjoner
som kan kalle identitetsfunksjonen, ikke bare direkte EXECUTE.

Journalens ytre aktørfelt i den prøvde kommandoen var derimot `app_users.id`,
slått opp gjennom medlemskap. Det ble ikke funnet et defaultprosjekt. Side,
team, hendelses-ID og tidsstempel kommer fra serverkontekst/database i denne
stien. Det er ikke gjort en full kontroll av klientstyrte felt inne i `p_data`.

## RB2-06 — hva de grønne sjekkene faktisk beviser

**Sted:** `bevis.py`, særlig seksjon 5–6, 9–12; designets avsnitt 8–9.

Originalbeviset ble kjørt uendret: **71/71**. De tre opprinnelige mutasjonene
ga nøyaktig de oppgitte resultatene. Fem tillegg ligger i samme
[mutasjonsmappe](vedlegg/b02-prototype-2026-09-22/mutasjoner/uten_force.sql):

| Mutasjon | Resultat | Hva resultatet underbygger |
| --- | --- | --- |
| `uten_medlemskap.sql` | 68/71 | Journalens medlemskapskontroll prøves |
| `uten_skrivevakt.sql` | 64/71 | De prøvde direkte journaloperasjonene avhenger av vakten |
| `uten_teamgrense.sql` | 60/71 | Teamfilteret har observerbar virkning |
| `uten_handlingsrett_i_kommando.sql` | 70/71 | Viewer-kallet prøver handlingsrett |
| `worker_alle_kolonner.sql` | 70/71 | Prosjektkolonnen i køen er vernet av kolonnerettigheter |
| `uten_tomkontekstvern.sql` | 70/71 | Tom sesjonsvariabel etter commit prøves |
| `uten_force.sql` | **71/71** | FORCE er ikke bevist av disse kallerne |
| `identitet_til_authenticated.sql` | 70/71 | Nettrollens manglende EXECUTE på identitetsfunksjonen prøves |

FORCE har ingen forventet utslag her: runtime er ikke tabelleier, og
`service_role` har BYPASSRLS. Dersom FORCE er et designkrav, må katalogen
kontrolleres, eventuelt supplert med en eier uten BYPASSRLS. Mutasjonens grønne
resultat er et dekningshull, ikke et bevis på at RLS lekker.

Andre avgrensninger etter lesing av hver sjekk:

- «Leveringsintensjonen er skrevet i samme transaksjon» teller bare en rad
  etter et vellykket kall. Atomicitet følger av SQL-funksjonen/én RPC (L og
  transaksjonsmodellen); testen injiserer ingen feil mellom skrivingene.
  Konfliktsjekken kontrollerer bare feilsvaret, ikke uendrede tabeller.
- Likhet mellom to PID-er kontrollerer ikke at de er ikke-null og at begge
  kall lykkes. To feilobjekter kunne oppfylle akkurat denne assertionen.
  Den faktiske grunnkjøringen var grønn også på de øvrige HTTP-sjekkene.
- «Ukjent team» og «manglende kontekst» dekker utvalgte kombinasjoner, ikke
  full kontekstvalidering (RB2-04). Notatets INSERT- og DELETE-policyer prøves
  ikke med positive og negative kontroller i originalbeviset.
- Workerens statusoppdatering prøver fravær av feil, ikke at en bestemt
  eksisterende rad fikk korrekt ny status. Ingen levering eller leaseprotokoll
  er implementert. Privat innsyn over workerens mulige JWT-transport er ikke prøvd.
- Data API-kallene dekker noen objekter. Prototypen gir faktisk `anon` og
  `authenticated` EXECUTE på diagnostikkfunksjonen `koe_api.hvem`. Det er en
  lokal testhjelper, men unntaket må navngis; «ingen funksjonsrettigheter» er
  ikke sant for hele prototypen. Den skal ikke inn i migrasjonene.

Beleggmerkingen er ellers i hovedsak redelig: TM-04 er L og uttrykkelig ikke
reprodusert; TM-05 skiller observasjonen fra antakelsen om omkjøring. Det
senere SQL-kommentarfeltets «i det uendelige» er sterkere enn observasjonen.
Reviewet har ikke kontrollert retry-mekanismen eller gjentatt 40001-forsøket.
D-påstandene om tabeller, funksjoner og rettigheter ble kontrollert på nytt.
K i sammenlikningstabellen må avgrenses til operasjonene som faktisk er prøvd.

## RB2-07 — B-04 står åpen, men tidsmodellen er ikke nøytral

**Sted:** designets avsnitt 4.3, 4.4 og 6; `er_medlem`, `har_handlingsrett`;
`AuthService.ensure_fresh` og `contract_membership_for_subject`.

**K:** utløpt JWT ble avvist. Token uten `exp` og token med ett døgns levetid
ble godtatt av lokal PostgREST. «Høyst 60 s» er altså en planlagt regel i
utstederen, ikke en testet mottakerregel. Den begrenser heller ikke alderen
på et gammelt medlemskapsøyeblikksbilde som brukes til å lage et nytt token.

**L:** prosjektmedlemskapene har en ferskhetskontroll i dagens backend;
policyfunksjonene ser bare på `active`/`viewer_override`. Team hentes fra
Catenda ved autorisasjonsoppslaget, men et gjenbrukt token eller en transaksjon
kan fortsette etter at oppslaget ble gjort. «Ingen forsinkelse» er derfor
for absolutt. For langvarige transaksjoner må isolasjonsnivå og tidspunktet
for autorisasjon beskrives, ikke bare «neste transaksjon».

**B-04:** alternativene er fortsatt teknisk mulige, men de følger ikke gratis
av prototypen. `active = false` virker umiddelbart ved neste relevante
oppslag. En frist før virkning krever endret tilstandsmodell, synkronisering
og policy, ikke bare å legge til `gyldig_til` sammen med `active`. Ventende
pakker, fullmakter og allerede committede leveranser er ikke modellert.
Definer hvilken klokke fristen starter ved: Catenda-endring, mottatt
tilbakekalling eller lokal commit, og hva som skjer ved manglende ferskhet.

**Pooling:** direkte gjenbruk og PostgREST med én forbindelse er prøvd.
Det beviser ikke Supavisor. Supabase beskriver
[transaksjonspooling og begrensningen på prepared statements](https://supabase.com/docs/guides/database/connecting-to-postgres).
Eksplisitt transaksjon med lokal rolle/kontekst er et plausibelt oppsett;
faktisk driverkonfigurasjon, rollback/avbrudd, samtidige forespørsler og
poolgjenbruk gjennom Supavisor må prøves før T2 erklæres verifisert.

## RB2-08 — F1-porten og gjennomføringsrekkefølgen

**Sted:** designets avsnitt 7–8;
[`database` i CI](../.github/workflows/ci.yml),
[`testbase`-fixturen](../backend/tests/test_database/conftest.py) og F1 i hovedplanen.

Testplanen mangler en eksplisitt rad for F1-akseptkriteriet **«Migrering og
break-glass er separat, tidsavgrenset og logget»**. `pgaudit` og `VALID UNTIL`
er forslag i rollebekrivelsen, ikke et ferdig bevis. D bekrefter forhåndslastet
`pgaudit`, men ingen opprettet utvidelse. En utløpsdato på passord er heller
ikke et universelt vern for eksisterende sesjoner eller andre innloggingsveier;
[PostgreSQLs rolledefinisjon](https://www.postgresql.org/docs/17/sql-createrole.html)
må legges til grunn for en konkret prosedyre.

F1s øvrige leveranser trenger også sporbare kontroller: tilgangslogg for
sensitive lesinger/eksport, logg ved myndighetsendringer, hemmelighetsrotasjon,
autorisasjon før aggregering/PDF og avvikling av gamle tilgangstabeller.
At tabellene for utkast/pakker mangler, er allerede korrekt merket i designet.

**TS2-02 kan gjennomføres med dagens CI som utgangspunkt.** Databasen bygges
fra tom på PostgreSQL 17, men jobben har bare lesende katalogtester og ingen
PostgREST-tjeneste. Behold den lesende fixturen. Legg til separat oppsett av
syntetiske data, reell innlogging som avgrenset rolle og eksplisitt opprydding.
HTTP-kall bruker en annen forbindelse enn pytest; en ytre rollback i pytest
kan ikke rydde dem. Bruk en isolert base per testgruppe eller gjenoppbygging.
Roller er klyngefelles og må håndteres særskilt ved parallelle testbaser.

PostgREST må startes etter databaseoppsettet, eller få kontrollert oppfrisking
av skjemacachen. Pin versjonen og prøv beredskap før kallene kjøres. Den hostede
PostgREST-versjonen er fortsatt ukjent. Runtime-autentisering må ha egen
legitimasjon; superbrukerens `SET ROLE` kan være et ekstra SQL-forsøk, ikke
erstatning for innloggingsbeviset.

«Testene først» bør bety at kriteriene og testene følger hver F1-leveranse,
uten å erklære grønne tester før mekanismen finnes. Flytt deretter lagringstester
flytvis, og fjern reservelagrene når støttede flyter er dekket. Ingen grunn til
å blokkere dette på alle F2-samtidighetstestene, men F1-grenser kan ikke skyves
til F2 under merkelappen «prototype».

## Verifikasjon og grenser

**Kjørt og observert 23.09:** PostgreSQL **17.11** (Homebrew), PostgREST
**12.2.12 (`cd3cf9e`)**, Python fra `backend/venv`. Basen ble bygget fra alle
23 migrasjoner ved hver kjøring. Originalbeviset og åtte mutasjoner er kjørt.
[Reviewforsøkene](vedlegg/b02-prototype-2026-09-22/review_bevis.py) ga 46/46
forventede observasjoner. Dette omfatter vellykkede reproduksjoner av
svakheter og er **ikke** en grønn sikkerhetsport. Transportforsøket ga de to
forventede HTTP-utfallene. Råresultater og kjøreoppskrift ligger i
[reviewvedlegget](vedlegg/b02-prototype-2026-09-22/REVIEW.md).
Lenkekontrollen for de fem berørte dokumentene ga null brudd. `ruff check`
for backend og de nye Python-skriptene var grønn med lokal Ruff 0.14.14;
CI bruker den pinnede versjonen i `requirements-dev.txt`. `bash -n` og
`git diff --check` var også grønne. Appens øvrige tester ble ikke kjørt lokalt
på nytt for denne dokumentasjons- og prototypeleveransen.

**Katalogkontrollert 23.09:** bare `pg_roles`, `pg_auth_members`,
`pg_namespace`, `pg_class`, `pg_proc`, `pg_policies`, `pg_trigger`,
`pg_default_acl`, `pg_attribute`, `pg_db_role_setting`, `pg_settings`,
`pg_extension` og rettighetsfunksjoner. Prosjektets PostgreSQL-versjon er 17.6.
Spørringer og resultat er vedlagt; ingen produksjons-DDL eller prosjektdata
ble endret. Supabase-MCP ble satt opp og OAuth-autentisert under arbeidet.

**Lest ut av koden:** hele prototypen, CI-jobben, testbaseoppsettet/fixturen,
relevante migrasjoner og hele funksjonene som er navngitt over. Ingen annen
auditkjede ble brukt. Dagens HTTP-autorisasjon er lest, ikke kjørt ende til
ende. Designets TM-04, ytelsespåstander og TM-05s retry-mekanisme er ikke
reprodusert i reviewet.

**Ikke kontrollert:** selvsignerte token mot hostet Supabase, `supautils`,
anvendelse som hostet `postgres`, Supavisor, reell replikeringskanal,
midlertidige objekters samspill med triggere, tidsbaserte sidekanaler,
last/ytelse, alle innebygde/utvidelsesfunksjoner utenfor `public`,
faktisk levering til Catenda, fullstendig godkjenningsflyt, feilinjeksjon ved
alle transaksjonsgrenser, drifts-/policyroller, break-glass, nøkkelrotasjon og
lagrene som ennå ikke er flyttet.

Ingen produksjonskode, anvendt migrasjon eller beslutningsstatus er endret.
