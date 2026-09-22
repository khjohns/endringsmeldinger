# Presiseringer til sikkerhetsarkitekturen

**Dato:** 2026-09-21 · **Kodegrunnlag:** `fc9b179` · **Status:** føringer for
videre design etter oppdragsgivers tilslutning til arkitekturvurderingen i
samtalen. Ingen implementering eller tidligere funn erklæres lukket her.

Forrige ledd: [siste handoff](handoff-2026-09-21-frister.md),
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
[målskjemaet](design-maalskjema-database-2026-09-20.md) og
[transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md).

Hovedretningen beholdes: én PostgreSQL-database for transaksjonell lagring,
uforanderlig kontraktsjournal, eget lager for interne notater og varig
inbox/outbox. Punktene under presiserer krav og åpner enkelte designvalg for
ny vurdering. De er ikke nye påviste sikkerhetshull i den kjørende appen.

## Oversikt

Alvorligheten gjelder mulig konsekvens dersom mangelen bygges inn i
målarkitekturen. Den beskriver ikke en observert hendelse.

| ID | Alvorlighet | Tema | Føring |
| --- | --- | --- | --- |
| AF-01 | Høy | Prosjekt- og teamgrenser, MS-09 | Teaminternt innhold skal ha vern i datalaget som et nytt lesepunkt arver |
| AF-02 | Høy | Transaksjon og myndighet, MS-02/AP-04 | Kommandoer, rettigheter og transaksjonsgrenser utformes samlet |
| AF-03 | Middels | Relasjoner, MS-08 | Fjerning av relasjonsprojeksjonen er ikke lenger fastlagt retning |
| AF-04 | Høy | Dokumenter og bevis, MS-11 | Hash må suppleres med dokumentversjon, bevaring og leveringsbevis |
| AF-05 | Middels | Gjenoppbygging, KR-04/MG-01 | Domenetilstand skal kunne beregnes deterministisk uten eksterne oppslag |
| AF-06 | Høy | Verifikasjon og rekkefølge | Ekte PostgreSQL-tester og én komplett EO-flyt prioriteres foran generell opprydding |

## AF-01 — vern for prosjekt og team

**Sted:** målskjemaets MS-09; `backend/lib/auth/event_visibility.py`,
`visible_events`; `backend/repositories/supabase_notat_repository.py`,
`for_sak`.

MS-09s generelle avgrensning om at notatskjerming bare skal ligge i
applikasjonen erstattes som mål. Prosjekt, team, kontraktsside og handlingsrett
skal modelleres hver for seg. Vernet skal omfatte notater, private utkast og
godkjenningspakker. DB-05s besluttede leserolle gir ikke i seg selv adgang til
alle private data i prosjektet.

**Gjenstår å velge:** RLS eller avgrensede databasefunksjoner, hvordan identitet
og medlemskap føres inn i konteksten, og når tilbakekalling får virkning.
Grunnleggende eierskap og tilgang er sikkerhetsregler; det krever ikke at
kontraktens beregningsregler gjentas i SQL.

**Akseptkriterium:** negative tester med de faktiske runtime-rettighetene for
to prosjekter, motpart, to team på samme side og ukjent team, også utenom
HTTP-rutene. Manglende kontekst skal avvise tilgang. Test gjenbruk av
databaseforbindelser slik at kontekst ikke følger med til neste forespørsel.

## AF-02 — kommando, transaksjon og rettigheter

**Sted:** transaksjonsplanens `commit_eo_approval`; målskjemaets MS-02;
`backend/core/unit_of_work.py`, `TrackingUnitOfWork`.

Append-only skal verne både mot omskriving og mot uautorisert tilføying.
En generell append-funksjon er ikke tilstrekkelig dersom den lar runtime
omgå godkjenning. Beskriv hvilke kommandoer runtime kan utføre, hva de
kontrollerer, og hvilke rettigheter worker, drift og migreringsrolle får.
Ta med direkte tabelltilgang, `TRUNCATE`, kaskader og funksjonseierskap.

Rettighetene bygges inn i EO-referanseflyten fra starten. Hendelser,
godkjenningsresultat, nødvendige projeksjoner, vedleggsbinding,
kommandokvittering og leveringsoppdrag skal dele transaksjon.

**Postgres og RPC er fortsatt masterplanens utgangspunkt.** Flere selvstendige
HTTP-kall deler ikke transaksjon, men én RPC kan gjøre flerstegsskriving
atomisk. Direkte databaseforbindelse er et alternativ som må begrunnes, ikke
en teknisk nødvendighet for outbox. Se
[PostgRESTs transaksjonsmodell](https://docs.postgrest.org/en/stable/references/transactions.html).

**Gjenstår å konkretisere:** fordeling mellom Python og databasekommandoen,
funksjonseier, `SECURITY INVOKER`/`DEFINER`, kjørerettigheter og trygg
`search_path`. Skill truslene: glemt filter, ondsinnet bruker, kompromittert
runtime/worker og privilegert databaseadministrator. RLS med kontekst som
backend selv setter er ikke alene vern mot en overtatt backend.

**Akseptkriterium:** bruk runtime-legitimasjonene til å forsøke direkte
skriving, omgått godkjenning og kryssing av prosjekt/team. Verifiser samtidig
godkjenning og policyendring, tapte svar og avbrudd før/etter commit mot ekte
PostgreSQL. En begrenset rolle skal fortsatt kunne utføre den legitime flyten.

## AF-03 — relasjoner trenger en integritetsmodell

**Sted:** målskjemaets MS-08; `backend/repositories/relation_repository.py`;
transaksjonsplanens KOE-tilknytning.

MS-08s anbefaling om å fjerne `sak_relations` settes til **må revurderes før
implementering**. Foretrukket alternativ til videre vurdering er en
relasjonsprojeksjon med én skriver i hendelsens transaksjon og
prosjektavgrensede fremmednøkler. Hendelsene beholder historikken.

GIN-indekser gir effektive oppslag, men erstatter ikke referanseintegritet,
eksklusivitetsregler eller beregning av gjeldende relasjon etter tillegg og
fjerning. Sammenlikn alternativene mot disse kravene før skjemaet fastsettes.

**Akseptkriterium:** relasjoner kan ikke vise til feil prosjekt eller
ikke-eksisterende sak; gjeldende relasjoner stemmer etter tillegg, fjerning og
gjenoppbygging. Eventuell KOE-eksklusivitet må holde ved samtidige kommandoer.

## AF-04 — dokumenthash er én del av bevisgrunnlaget

**Sted:** målskjemaets MS-11; masterplanens arbeidspakker om dokumenter,
bevisførsel og gjenoppretting; `backend/services/vedlegg_registry.py`.

Beslutningen om Catenda som varig fillager beholdes. Påstanden om at én
hashkolonne alene gjør dette forsvarlig, er ikke tilstrekkelig som
akseptkriterium. Hashen kan kontrollere tilgjengelige byte, men kan ikke
gjenopprette en slettet fil eller alene vise hvem som mottok den når.

**Gjenstår å konkretisere:** frosset dokumentversjon, mål/mottaker,
leveringskvittering og usikkert utfall, bevaring og tilgjengelighet i Catenda,
eksport uten avhengighet av appen og eventuell uavhengig integritetsforankring.
En retry skal levere samme dokument. Dette endrer ikke beslutningen om
journalbevaring eller fravalg av kryptografisk sletting.

**Akseptkriterium:** en sak kan eksporteres med de konkrete dokumentversjonene
og etterprøvbar leveringshistorikk. Manglende fil eller ubekreftet levering
skal framgå uttrykkelig. Gjenoppretting skal ikke utløse blind ny levering.

## AF-05 — ren og versjonert gjenoppbygging

**Sted:** `backend/services/timeline_service.py`, `compute_state` og
`_handle_eo_utstedt`; KR-04/MG-01 og masterplanens kompatibilitetskrav.

Domenetilstand skal beregnes fra hendelsesstrømmen og det fastsatte
tolkningsgrunnlaget. Navneoppslag og presentasjon flyttes til svarlaget.
Hendelsesformat og relevant regel-/projeksjonsversjon må ha en dokumentert
utviklingsstrategi. En projeksjon skal kunne gjenoppbygges fra sine autoritative
kilder; den skal ikke bli en skjult, uerstattelig sannhet.

**Akseptkriterium:** historiske teststrømmer gir samme domenetilstand med samme
regelversjon uten Flask-kontekst, databaseoppslag eller nettverk. Tester viser
at nye lesere håndterer gamle hendelser, og at planlagt utrulling/tilbakerulling
ikke gjør allerede skrevne hendelser uleselige.

## AF-06 — verifiser før bredere omlegging

**Sted:** `.github/workflows/ci.yml`; masterplanens verifiserbare
leveranseprosess og EO-referanseflyt; handoffens anbefaling om RY-01.

Neste hovedleveranse bør bygge på automatiserte tester mot en kastbar
PostgreSQL med migrasjonene og representative plattformroller. Test
transaksjoner, rettigheter, samtidighet og gjenoppbygging, i tillegg til
eksisterende enhetstester. Katalogkontroll av det eksterne prosjektet er en
separat kontroll av hva som faktisk er anvendt.

Avklar AF-01–AF-05 i ett sammenhengende design for én komplett EO-flyt før
adapterne utvides. RY-01 kan tas når den støtter denne flyten; den er ikke
overordnet prioritet foran transaksjons- og tilgangsgarantiene.

## Verifikasjon og grenser

**Kjørt og observert:** Git-grunnlaget `fc9b179` og oppslag i offisiell
PostgREST- og PostgreSQL-dokumentasjon. Ingen atferdstester ble kjørt som
grunnlag for denne arkitekturvurderingen.

**Lest ut av koden:** `TrackingUnitOfWork` bruker kompenserende operasjoner;
EO-projeksjonen kaller `aktor_navn`; notatlageret filtrerer prosjekt, mens
teamfilteret ligger i applikasjonen. Disse observasjonene er ikke nye
reproduksjoner av sikkerhetshull.

**Ikke kontrollert:** levende databasekatalog, faktisk rolleoppsett, eksterne
Catenda-garantier, full testsuite eller rettslig grunnlag. Supabase-MCP var ikke
tilgjengelig i vurderingen. Ingen produksjonskode, migrasjon eller database er
endret. Føringene skal konkretiseres og gjennomgås før implementering.
