# Gjennomgang av målskjemarunden: ni funn, ett rettet

Gjennomført 21. september 2026 mot `9f70c45` på grenen
`claude/les-handoffen-20-09-docs-ngo2r9`. Gjenstand: koden
[gjennomføringen av MS-01, MS-04 og MS-10](gjennomforing-maalskjema-2026-09-20.md)
leverte — altså en gjennomgang av forrige rundes eget arbeid, ikke av arven.
Forrige ledd i kjeden er [målskjemaet](design-maalskjema-database-2026-09-20.md)
og [audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md).

Fire uavhengige gjennomganger med hver sin vinkel: gjenbruk, forenkling,
effektivitet og nivå. **Oppryddingen er gjennomført i `75789b8`** — dette
dokumentet er de funnene som *ikke* ble rettet, og hvorfor.

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

---

## Funn

| ID | Funn | Alvorlighet | Status |
| --- | --- | --- | --- |
| MG-01 | Navneoppslaget ligger i beregningslaget, og gir samme hendelse to visninger | Middels | **Åpen.** Fire av fem oppslag er døde — se under |
| MG-02 | `catenda:<subject>` er en andre verdiform i en append-only kolonne | **Høy** | **Åpen. Har frist:** når første ekte sak opprettes |
| MG-03 | To mekanismer for «serveren setter aktøren»; parsegrensen dekker bare to av fem felt | Middels | **Åpen,** med reproduksjonstest |
| MG-04 | `sak_metadata.created_by` har tre verdiformer | Lav | Åpen — hører til MS-06 |
| MG-05 | `ownerName` fryses fortsatt inn i den varige godkjenningstilstanden | Middels | Åpen |
| MG-06 | `app_identities` mangler indeks på `(provider, subject)` | Lav i dag | Åpen |
| MG-07 | `find_sak_id_by_catenda_topic` skanner JSONB i Python | Lav | Åpen |
| MG-08 | Navneoppslag per distinkt aktør, serielt | Lav etter seeding | Åpen — faller bort med MG-01 |
| MG-09 | En anvendt migrasjonsfil kan ikke rettes, heller ikke kommentarene | Informasjon | **Ført inn i `AGENTS.md`** |

---

### MG-01 — Navneoppslaget ligger i beregningslaget

**Fil og symbol:** `backend/services/timeline_service.py` — import på linje 16,
oppslag på 1122, 1455, 1670, 1879, 2082.

MS-04 flyttet navnet ut av journalen og inn i visningen. Oppslaget ble lagt i
`timeline_service`, som ellers er et rent beregningslag: `compute_state`
avhenger nå av `app_users` og av Flask-kontekst.

**To virkninger, begge lest ut av koden:**

1. `compute_state` kalles fra rundt tjue steder som ikke trenger noe navn.
   `endringsordre_service._project_states` beregner tilstand for *hver* sak i
   prosjektet, så `hent_neste_eo_nummer()` slår nå opp i `app_users` for å
   finne neste EO-nummer.
2. Laget er blitt kontekstavhengig. `lib/aktor_navn` finner ingen tjeneste uten
   app-kontekst, så bakgrunnsutstedelsen i `services/eo_approval_service.py:416`
   og `scripts/backfill_reporting_cache.py` faller tilbake på identiteten, mens
   samme EO utstedt i en forespørsel får navnet. **Samme hendelse, to
   visninger, avhengig av hvilken vei den gikk.**

**Fire av de fem oppslagene er døde.** *Kjørt og observert 2026-09-21:*

- `get_timeline` (linje 1455) har **null kallere** i hele repoet. Den rendrede
  tidslinjen er `format_timeline_response`, som sender `actorid` og ingen navn.
- `AktorInfo.navn` (linje 1670, 1879, 2082) hentes av `src/lib/api/state.ts:45`
  og er typet i `src/lib/types/api.ts`, men **ingen komponent leser feltet** —
  strengen `aktor` finnes ikke i `src/lib/components/` eller `src/routes/`.
- Eneste levende forbruker er `EOData.utstedt_av` (linje 1122), rendret av
  `src/lib/components/endringsordre/EndringsordreDocument.svelte:61`.

**Det gjør rettingen liten, ikke stor.** Nivågjennomgangen foreslo en
`aktorer: {id: navn}`-nøkkel i svarkonvolutten, altså én resolvering på
svargrensen. Med bare én levende forbruker er det nok å resolvere `utstedt_av`
der svaret bygges, og la de fire andre oppslagene falle bort. Da importerer
`timeline_service` ingenting fra `lib/`, og `compute_state` er rent igjen.

**Ikke gjort i denne runden** fordi det endrer innholdet i svarfelter — fra navn
til ID — og en opprydding skal ikke endre en API-kontrakt, selv når ingen leser
den.

### MG-02 — `catenda:<subject>` er en andre verdiform, i en kolonne som ikke kan rettes

> **Merknad 2026-09-21 (kveld): lukket.** Se
> [MG-02-gjennomføringen](gjennomforing-mg02-2026-09-21.md). Produktbeslutningen
> ble ja, men to av de tre hindringene under holdt ikke ved nærmere
> kontroll:
>
> - **Hindring 2 var allerede avgjort i kode.** `koe_reconcile_memberships`
>   kaller `koe_resolve_identity` for hvert prosjektmedlem ved hver
>   synkronisering. Katalogen: 14 brukere, 14 identiteter, **1 sesjon** — tretten
>   av fjorten brukerrader tilhører folk som aldri har logget inn. Avsnittet
>   under leste at innloggingen kaller funksjonen, men ikke at synkroniseringen
>   gjør det samme; funksjonen ligger i basen, ikke i repoet.
> - **Hindring 3 var oppfylt.** `app_identities` har én issuer, og den er
>   identisk med `CatendaOAuth.BASE`.
> - **Hindring 1 var reell** og er rettet i migrasjon `20260921164900`. Den
>   rammet innlogging og synkronisering, ikke bare webhooken.
>
> Det som faktisk manglet, og som ikke står under: webhooken normaliserte ikke
> subjektet, så et `ref` med bindestreker ville gitt en *tredje* verdiform.

**Fil og symbol:** `backend/services/catenda_webhook_service.py:_aktor_id`,
`backend/lib/aktor_navn.py:CATENDA_PREFIKS`,
`supabase/migrations/20260920193558_hendelse_tabell.sql:36`.

`_aktor_id` prøver `user_id_for_subject("catenda", sub)` og faller tilbake til
`catenda:<sub>` bare når forfatteren ikke har logget inn ennå. **Samme person
føres derfor som UUID i én hendelse og som `catenda:<sub>` i en annen**, i en
append-only journal der det ikke kan rettes i ettertid. Hvilken form man får,
avhenger av om personen tilfeldigvis hadde logget inn da webhooken kom.

Prefikset settes i webhookstien og strippes i `lib/aktor_navn._slaa_opp` — to
steder som må være enige om formatet — og det forplantet seg ned i skjemaet:
`actorid` er `TEXT`, ikke `uuid`.

**Mekanismen som fjerner det, finnes allerede i basen.**
`public.koe_resolve_identity(p_provider, p_issuer, p_subject, p_email, p_name)`
tar `pg_advisory_xact_lock`, oppretter `app_users` + `app_identities` om
identiteten er ny, og returnerer en `uuid`. `services/auth_service.py:48` kaller
den ved innlogging. Kalles den fra webhookstien med topicens
`bimsync_creation_author.user.ref` og samme issuer, forsvinner `CATENDA_PREFIKS`,
`AuthRepository.user_id_for_subject`, grenen i `_slaa_opp` og tokolonneformen —
og `actorid` kan være `uuid`.

**Tre hindringer, og de er reelle:**

1. Funksjonen gjør en ubetinget `UPDATE app_users SET email = p_email, name = p_name`.
   En webhook med tomme verdier ville overskrevet en ekte rad. Det trengs en
   `COALESCE`-variant, altså DDL.
2. Det er en beslutning å ta uttrykkelig at en webhook oppretter brukerrader for
   folk som aldri har logget inn hos oss.
3. Issuer må være identisk med innloggingens, ellers får man dublettbrukere.

**Dette har samme frist som MS-04 selv: når første ekte sak opprettes.** Velges
det ikke, er `actorid TEXT` med to verdiformer formen journalen beholder for
godt.

### MG-03 — Parsegrensen dekker to av fem serverfelt

**Fil og symbol:** `backend/models/events.py:parse_event_from_request`
(`forbidden_fields`), mot `backend/routes/event_routes.py:172`.

`event_id` og `tidsstempel` **avvises** på parsegrensen. `aktor_id`,
`aktor_rolle` og `aktor_team_id` **overskrives** i ruta i stedet. To mekanismer
for samme invariant, og den ene kan glemmes: en ny mutasjonsrute som kaller
`parse_event_from_request(data)` med klientens nyttelast fører klientens
`aktor_id` rett inn i journalen, og ingenting stanser den.

Testen som verner dette
(`tests/test_routes/test_event_security.py::test_actor_and_role_come_from_server`)
tester *ruta*, ikke grensen.

`AGENTS.md` beskriver nå mekanismen presist framfor å påstå at modellen avviser
alle fem. Gapet står som streng `xfail` i
`tests/test_security/test_maalskjema_20260920.py::test_parsegrensen_avviser_klientoppgitt_aktor`.

**Rettingen** er `forbidden_fields = {"event_id", "tidsstempel", "aktor_id",
"aktor_rolle", "aktor_team_id"}` pluss et påkrevd nøkkelordargument som stemples
inne i funksjonen — samme begrunnelse `AGENTS.md` gir for at CSRF ligger inne i
`require_auth`. **Ikke gjort** fordi den krever to samtidige endringer:
`services/approval_service.py:158` oppgir `aktor_id` selv fra `item["owner"]`,
og `src/lib/api/events.ts` sender fortsatt `aktor_rolle`, som da ville gitt 400
på hver innsending.

### MG-04 — `created_by` har tre verdiformer

**Fil og symbol:** `backend/services/endringsordre_service.py:433` (UUID),
`backend/routes/event_routes.py:777` (e-post),
`backend/services/catenda_webhook_service.py:357` (personnavn).
`backend/models/sak_metadata.py:32` dokumenterer den som «TE name».

Forrige runde endret én av de tre skriverne til UUID. Én av tre er formen å
unngå — men alternativet er å sende et navn inn i skrivestien, altså å
gjeninnføre det MS-04 nettopp tok ut. Kolonnen hører til **MS-06**, som deler
`sak_metadata` i register og projeksjon; da avgjøres alle tre samtidig. Ingen
komponent rendrer feltet i dag, så valget koster ingenting ennå.

### MG-05 — `ownerName` ligger fortsatt i den varige godkjenningstilstanden

**Fil og symbol:** `backend/routes/endringsordre_routes.py:304` (`issuer_name`),
`backend/services/approval_service.py:382` (`ownerName`),
`backend/services/eo_approval_service.py:304`.

`eo_approval_service` sluttet å *lese* `ownerName` i forrige runde, men
produsenten står: navnet fryses fremdeles inn i godkjenningspakken. Frontenden
gjør dessuten samme identitet→navn-resolvering i
`src/lib/components/endringsordre/EOApprovalPanel.svelte:108` og
`src/lib/components/kontraktsbord/ClaimApprovalView.svelte:170` —
«navn hvis vi har det, ellers identiteten», for de samme personene, i et annet
lag enn serveroppslaget `lib/aktor_navn` nå er.

MS-04 tok navnet ut av journalen. Det ligger fortsatt lagret her. Rettingen er
den samme som MG-01: én resolvering på svargrensen, eller et lite
`/api/brukere?ids=` som både panelet og tidslinjen leser.

### MG-06 — `app_identities` mangler indeks på `(provider, subject)`

**Fil og symbol:** `backend/repositories/auth_repository.py:user_id_for_subject`.

Metoden filtrerer på `provider` + `subject`. *Katalogspurt 2026-09-21:*
`app_identities` har `app_identities_pkey`,
`app_identities_provider_issuer_subject_key` på `(provider, issuer, subject)` og
`app_identities_user_id_idx`. Ingen `(provider, subject)`. Bare den ledende
kolonnen kan brukes, så oppslaget går gjennom alle `provider = 'catenda'`-rader.

Tabellen har fjorten rader, så det er ikke en kostnad i dag — og en indeks på
fjorten rader er for tidlig. Alternativet uten ny indeks er å ta imot `issuer`
og filtrere på alle tre, slik `koe_resolve_identity` selv gjør. Blir reelt når
`app_identities` vokser, og faller bort om MG-02 velges.

### MG-07 — `find_sak_id_by_catenda_topic` skanner JSONB i Python

**Fil og symbol:** `backend/repositories/supabase_event_repository.py:318`.

Henter `sak_id, data` for **hver** `sak_opprettet`-rad og sammenlikner i Python:
én full JSONB-nyttelast per sak overført for å finne én rad. Kan pushes til
spørringen med `.eq("data->>catenda_topic_id", …)`.

**Ikke gjort** fordi syntaksen ikke lar seg verifisere her: basen er tom, så en
spørreplan ville ikke vært representativ, og testdobbelen gjør eksakt
nøkkelsammenlikning og kan ikke løse en JSON-sti. En uverifisert
syntaksendring i webhookens oppslagssti er ikke en oppryddingsgevinst. Formen er
overtatt fra før sammenslåingen, ikke innført av den.

### MG-08 — Navneoppslag per distinkt aktør, serielt

**Fil og symbol:** `backend/lib/aktor_navn.py:navn`.

Bufferet dedupliserer, så kostnaden er én spørring per **distinkt** aktør per
forespørsel, ikke per hendelse. Oppryddingen seedet bufferet med den innloggede
fra `g.user`, som tar det vanlige tilfellet uten I/O.

Det som står igjen: `GET /api/cases` kjører `compute_state` per sak i én
forespørsel, så antallet distinkte EO-utstedere i hele prosjektet blir
serielle rundturer. *Anslag, ikke målt:* 5–20. Rettingen er en
`forhåndsvarm(events)` som fyller bufferet i én `.in_("id", ids)`-spørring,
kalt fra `_fetch_and_parse_events` i `backend/routes/event_routes.py:1090`.
Faller bort helt om MG-01 gjøres.

### MG-09 — En anvendt migrasjonsfil kan ikke rettes

*Kjørt og observert 2026-09-21:* `supabase_migrations.schema_migrations` har en
`statements`-kolonne som lagrer **rågteksten, kommentarer og alt** — søket etter
«Åtte av tjue» treffer på posisjon 2603 i det basen har registrert for
`20260920193558`.

Det avgjorde et forslag mot retting. Kommentaren i
`20260920193558_hendelse_tabell.sql:67` sier «åtte av tjue tabeller» i den
migrasjonen som gjør dem atten. Å rette ordet ville gjort fila uenig med det
basen kjørte, stikk i strid med regelen om at fila skal bære samme SQL.
Kommentaren står, og beskriver riktig nok tilstanden i det øyeblikket
migrasjonen løp — dens egne `DROP`-setninger er det som gjør tallet atten.

**Ført inn i `AGENTS.md`:** en anvendt migrasjon er uforanderlig, også
kommentarene; har innholdet blitt feil, skriv en ny migrasjon eller en datert
merknad i `docs/`.

---

## Hva oppryddingen faktisk gjorde

Kort, siden det er motvekten. Fullt i `75789b8`.

- **Siste rest av tabellrutingen fjernet.** `sakstype`-parameteren på
  `get_all_sak_ids` kunne ikke uttrykkes riktig fra hendelsestyper: «standard»
  er ikke et prefiks, så *alle* saker havnet i det settet. Begge kallerne
  filtrerer per hendelse selv.
- **Navneoppslaget:** bufferet seedes fra sesjonen; oppslaget flyttet til
  `AuthRepository.user_name` med `limit(1)` framfor bulk-pagineringen;
  `_repo()`-laget foldet inn i try-blokka; skrivestien for endringsordre slipper
  importen av visningslaget.
- **Testdobbelen delt** i `backend/tests/fixtures/supabase_dobbel.py`. Kopien i
  målskjematesten hadde mistet de to egenskapene som er grunnen til at dobbelen
  finnes: kolonnevakten mot skjemaet og projeksjonen etter `select`.
- **Tester som fastslo at et personnavn er en gyldig `aktor_id`** byttet til
  ID-formede verdier. Lærdommen er ført inn i `AGENTS.md`.
- **`Event`-skjemaet i openapi-skriptet** krevde `aktor`, som ikke finnes, og
  beskrev `aktor_id` som et personnavn.

---

## Verifikasjon og grenser

**Kjørt og observert:**

- 1484 backend-tester passerer, 9 hoppet over, 42 `xfail` (den nye er MG-03).
  `ruff check backend/` er 0. Frontend: 590 tester, `check:error` 0 errors.
- `get_timeline` har null kallere; ingen komponent i `src/` leser `aktor`.
- `app_identities` har ingen indeks på `(provider, subject)` (katalogspørring).
- `schema_migrations.statements` lagrer migrasjonens rågtekst (MG-09).
- `src/lib/api/endringsordre.ts` typer svaret fra EO-opprettelsen til
  `{success, sak_id, catenda_synced}` — det var grunnlaget for å fjerne
  navneoppslaget fra skrivestien.

**Lest ut av koden, ikke kjørt:**

- Alle radanslag og spørringstall i MG-06, MG-07 og MG-08. Ingen profilering,
  ingen `EXPLAIN` — basen er tom, så en plan ville ikke vært representativ.
- At `koe_resolve_identity` ville løst MG-02. Funksjonskroppen er lest i
  `20260912150635_catenda_user_sessions.sql`; den er ikke kalt fra
  webhookstien i et forsøk.
- At bakgrunnsutstedelsen i MG-01 faktisk viser UUID. Kodestien er lest;
  ingen EO er utstedt i bakgrunnen og observert.

**Ikke vurdert:**

- **Korrekthet.** De fire gjennomgangene hadde uttrykkelig vinkel gjenbruk,
  forenkling, effektivitet og nivå, og ble bedt om *ikke* å lete etter
  korrekthetsfeil. En egen runde med den vinkelen er ikke kjørt mot `9f70c45`.
- **MS-05** (interne notater ut av journalen), som har samme frist som MS-02 og
  MS-10 hadde. Den er uberørt av denne gjennomgangen.
- **Om `hendelse.created_at` burde vært arvet.** Kolonnen dupliserer `time` og
  skrives ikke av noen kode. Den er arvet fra de tre tabellene, ikke valgt — men
  å fjerne den nå er en ny migrasjon mot en tabell som allerede er anvendt.
