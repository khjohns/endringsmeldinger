# Gjennomføring: MS-05 — interne notater ut av journalen

Gjennomført 21. september 2026 mot `71d9115` på grenen
`claude/handoff-docs-legal-review-liw447`. Gjenstand: den siste beslutningen med
frist — **når første ekte sak opprettes** — som ikke ventet på et menneske.
Forrige ledd i kjeden er
[handoff 21.09 (kveld)](handoff-2026-09-21-korrekthet.md),
[målskjemaet](design-maalskjema-database-2026-09-20.md) (MS-05) og
[gjennomføringen 20.09](gjennomforing-maalskjema-2026-09-20.md) av MS-01, MS-04
og MS-10. Arbeidspakken står i
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

**Dette er ikke en auditrunde.** Den leverer produksjonskode, en migrasjon og
regresjonstester, ikke funn. Statuskolonnen står derfor der alvorlighet ellers
ville stått.

**En rettslig forutsetning ble besluttet i samme runde, og den er grunnen til at
MS-05 er nok.** Arkivplikt går foran sletteplikt for kontraktsjournalen;
kryptografisk sletting skal ikke bygges. Beslutningen står i masterplanens
merknad 2026-09-21 (kveld), sammen med to andre som er besluttet, ikke bygget
(MG-02 og DB-05).

Appen er ikke i produksjon. `hendelse` hadde null rader da endringen ble gjort,
kontrollert mot katalogen umiddelbart før — det er hele grunnen til at
flyttingen kostet null datamigrasjon.

---

## Det korte svaret

| ID | Beslutning | Status |
| --- | --- | --- |
| MS-05 | Interne notater ut av den uforanderlige journalen | **Gjennomført.** Egen tabell `notat`, vanlige rettigheter, sletting mulig |
| — | Versjonstelleren flyttes ikke av et notat | **Gjennomført.** Bieffekten målskjemaet forutsa |
| — | Tidslinjen fletter to kilder | **Gjennomført.** Notatet gjøres om til hendelse ved lesing |

Basen gikk fra atten til nitten tabeller. Én migrasjon er skrevet **og anvendt**;
repoet og basen er avstemt på fem katalogsnitt etter endringen.

---

## Hvorfor notatet ikke kunne bli liggende

`AGENTS.md` slår fast at et internt notat **ikke er et kontraktsvarsel**. Det
var likevel en hendelsestype i `hendelse`, og arvet dermed tre egenskaper det
ikke trenger og én det ikke tåler:

| Egenskap | Riktig for et varsel | For et notat |
| --- | --- | --- |
| Append-only | Ja — bevisverdien hviler på det | Nei |
| Teller sakens versjon | Ja — versjonen *er* den optimistiske låsen | Nei |
| Leveres til Catenda | Ja | Nei, og det var allerede unntatt |
| Kan ikke slettes | Ja | **Problemet.** Notatet er fritekst om navngitte personer |

Den siste raden er den som betyr noe. `hendelse` skal etter planen få
`REVOKE UPDATE, DELETE` og en append-only-trigger. Ble notatene liggende, ville
den strammingen gjort fritekst om navngitte personer permanent — og det er
nettopp den kategorien en oppbevaringsregel normalt må kunne nå.

---

## Tabellen

**Migrasjon:** `supabase/migrations/20260921153900_notat_tabell.sql`
(anvendt 2026-09-21).

`notat` bærer det hendelsen bar, med to forskjeller:

- **`aktor_team_id` er `NOT NULL` med `CHECK (length(...) > 0)`.** Skjermingen
  går på Catenda-team, og et notat uten entydig team kan ingen lese — heller
  ikke forfatteren. I journalen var kolonnen nullbar og regelen levde bare i
  Python. Nå avviser basen raden. Observert: `notat_aktor_team_id_check`
  avviser en tom streng mot ekte DDL.
- **Ingen fremmednøkkel til `hendelse`.** `refererer_til_event_id` peker på
  varselet notatet gjelder, men uten skranke: et notat skal kunne slettes uten
  å røre journalen, og journalen skal kunne stå uten notatet.

Fremmednøkkelen til `sak_metadata` står, med `ON DELETE CASCADE`. Observert: en
rad mot en sak som ikke finnes, avvises av `fk_notat_sak`.

**Tabellen er bevisst utenfor den kommende nedlåsingen.** Det står i
migrasjonens egen kommentar, slik at den som senere skriver
`REVOKE UPDATE, DELETE` ser hvorfor `notat` ikke skal med.

---

## Versjonstelleren

Målskjemaet kalte dette en bieffekt. Det er den delen av MS-05 som endrer
oppførsel for motparten.

Før: et notat gikk gjennom `append` og økte sakens versjon. Motparten, som ikke
har lov til å se notatet, fikk `VERSION_CONFLICT` på neste innsending og måtte
hente saken på nytt — uten at noe i det synlige hadde endret seg. Konflikten var
reell for klienten og usynlig i årsak.

Nå returnerer innsendingen av et notat gjeldende versjon uendret, og
versjonssjekken hoppes over for notater. Det er forsvarlig av grunnen MS-03
oppgir: et notat avhenger ikke av tilstanden det leste, og kan alltid rebases.

`test_versjonen_staar_stille` og `test_notatet_hindrer_ikke_neste_innsending`
holder på dette.

---

## Flettingen

Notatet vises fortsatt i tidslinjen. `Notat.til_hendelse()` gjør raden om til
den `InterntNotatEvent` lesestien allerede kjente, og flettingen skjer i
`_fetch_and_parse_events` — det ene punktet `state`, `timeline`, `historikk` og
`context` deler.

Det gir tre ting gratis:

- **Skjermingsfilteret er uendret.** `lib/auth/event_visibility.visible_events`
  sammenlikner fortsatt leserens team med notatets, og motpartens notat
  forsvinner der. Filteret er nå andre lag: lageret spør på prosjekt først.
- **CloudEvents-formen er uendret**, og dermed er klienten det også. Ingen
  frontend-fil er rørt i denne runden.
- **Aktivitetstallene oppfører seg som før.** `antall_events` og
  `siste_aktivitet` utledes av det leseren faktisk ser (RV-09), og et skjult
  notat flytter dem ikke.

Sorteringen går på tidsstempel normalisert til UTC. To lagre er to kilder til
tidsstempler, og `sorted` ville kastet `TypeError` midt i en lesing om det ene
var naivt.

**Feilretningen er fail-closed.** Mislykkes notatlesingen, returneres tom liste
og tidslinjen står — tapt notat, ikke lekket notat. Samme valg som filteret gjør
når teamet ikke kan bekreftes.

---

## Vakten ligger i journalen, ikke i ruta

Første utkast la grenen i `submit_event`: er hendelsen et notat, skriv det til
notatlageret. **Det dekket én av to innsendingsruter.** `submit_batch` parser
hendelser gjennom nøyaktig samme `_parse_authorized_event` og går rett til
`append_batch` — et internt notat sendt dit ville havnet i journalen, der det
ikke kan fjernes igjen. Funnet kom av oppryddingsrunden etter rettingen, ikke
av rettingen selv, og det er samme form som felle 3 i forrige handoff: en
retting som ikke dekker hver skrivesti.

Regelen ligger nå i lageret. `krev_journalhendelser` i
`repositories/event_repository.py` avviser typen i begge lagerimplementasjoners
`append_batch`, og `append` delegerer dit. En tredje innsendingsrute arver
vakten ved konstruksjon framfor ved hukommelse. Batchruta avviser i tillegg
notatet selv, med en melding som sier hvor det skal — en batch kan ikke spenne
to lagre atomisk.

**Avvisningen er en `PermanentError`, ikke en naken `ValueError`.** Det ble
observert, ikke utledet: den første versjonen kastet `ValueError`, og
`with_retry` rundt Supabase-lagerets `append_batch` klassifiserte den som en
ukjent, forbigående feil — lageret sov og prøvde igjen på en skriving som aldri
kan lykkes, og kalleren fikk `TransientError`. `JournalfoeringAvvist` arver
`PermanentError` **og** `ValueError`, av nøyaktig samme grunn som
`ConcurrencyError` arver `ConflictError`, og med samme følge: ruta gjør den om
til 400.

---

## Sletting

`DELETE /api/cases/<sak_id>/notater/<notat_id>`, med `require_auth` og
`require_project_access()`.

**Bare forfatteren kan slette.** Teamet alene ville latt en kollega fjerne en
annens vurdering, og en videre regel enn nødvendig er ikke gitt noe sted.
Svaret skiller ikke mellom «finnes ikke» og «ikke ditt»: at et notat finnes er i
seg selv opplysning, og det er samme grunn til at filteret skjuler notatet i sin
helhet framfor bare teksten.

**Eierskapet er argument til lageret, ikke en sjekk i ruta.**
`slett(sak_id, notat_id, prosjekt_id, aktor_id)` tar med seg hver grense den
skal håndheve, slik `services/utkast_registry.py` gjør. Første utkast hentet
notatet først og sammenliknet i ruta — to rundturer, et vindu mellom kontroll og
sletting, og en regel neste kaller kunne glemt. 404-semantikken følger nå av
formen framfor å måtte holdes i hodet.

Sletting er en ekte `DELETE`, ikke et flagg. Et sletteflagg ville latt teksten
bli liggende, og da hadde flyttingen ikke løst noe.

---

## Om at dette ikke er en sletteløsning for journalen

MS-05 tar fritekst om personer ut av den uforanderlige strømmen. Den gjør ikke
journalen slettbar, og er ikke ment å gjøre det. Journalen bærer fortsatt
`aktor_id` — en identitet, ikke et navn (MS-04) — og «sletting» av en person er
derfor én rad i `app_users`, utenfor strømmen.

Faller det rettslige bildet senere annerledes enn besluttet 21.09, er MS-05
forutsetningen som gjør kryptografisk sletting overkommelig, fordi friteksten da
allerede ligger utenfor. Det var argumentet for å gjøre MS-05 uansett utfall, og
det står.

---

## Verifikasjon og grenser

**Kjørt og observert**

- Backend: **1522 passed, 9 skipped, 42 xfailed** (1488 før runden).
  `ruff check backend/` rent.
- Frontend: `npm test` **590 tester**, `npm run check:error` **0 errors** over
  4844 filer. Ingen frontend-fil er endret; kjørt for å vise at flyttingen ikke
  krevde det.
- **Migrasjonssettet bygget fra tomt.** 22 filer, ren `sort`-rekkefølge, mot en
  kastbar PostgreSQL 16.13 med Supabase-plattformen stubbet (rollene `anon`,
  `authenticated`, `service_role`; skjemaet `auth` med `users`, `auth.role()` og
  `auth.email()`; `GRANT ALL … TO service_role` pluss default privileges).
  Null feil, **19 tabeller.** Katalogen er identisk med prosjektets på fem snitt:

  | Snitt | md5 |
  | --- | --- |
  | Kolonner | `53ff1083d2ba7cab670d7c19c4be361d` |
  | Skranker | `cfeb38f87cc002e1b2e5959f02e2bacb` |
  | Indekser | `030ef2a97bb62e96b3ac7c48dc9f7ca4` |
  | Policyer | `674f3e9e31db289f53c33f3590f36fbe` |
  | Rettigheter | `d8908d88e033f139208d38ff52ddf121` |

  **Ikke sammenliknbare med forrige rundes summer.** Spørringene er skrevet på
  nytt igjen — handoffen sa at forrige rundes spørringer sto ordrett i
  oppryddingens «Verifikasjon og grenser», men der står bare summene. Denne
  gangen står spørringene nedenfor.
- **Notatraden kjørt mot ekte DDL,** ikke bare mot testdobbelen: raden
  `Notat.til_rad()` produserer, ble satt inn i det lokale klonet, lest tilbake,
  ikke funnet fra et annet prosjekt, og slettet. En rad med tomt team ble
  avvist av `CHECK`; en rad mot en ukjent sak ble avvist av fremmednøkkelen.
- `hendelse` og `sak_metadata` hadde **null rader** i prosjektet ved
  anvendelsen. Ingen datamigrasjon var nødvendig, og ingen ble skrevet.
- **Testdobbelen er utvidet** med `NOTAT_KOLONNER` og `delete()`.
  `test_skriver_bare_kolonner_skjemaet_erklaerer` krever *likhet* med
  kolonnesettet, ikke delmengde: en kolonne for mye avvises av dobbelen uansett,
  men et felt som faller ut av raden ville ellers passert i stillhet.
- **Journalen avviser notatet i begge lagerimplementasjoner,** kjørt for
  `append` og `append_batch` i hver, og batchruta avviser det med 400.
- **Eksistenssjekken som lå i ruta, ble observert død.** Testen mot en ukjent
  sak fikk 403 fra `require_project_access` før ruta kjørte; 404-grenen var
  uoppnåelig og er fjernet. Testen står igjen og dokumenterer hvor sperren
  faktisk er.

**Skrevet om etter en egen oppryddingsrunde**

Fire uavhengige gjennomganger (gjenbruk, forenkling, effektivitet, nivå) ble
kjørt på diffen etter at den var grønn. Den fant hullet i batchruta over, og i
tillegg: `Notat.til_rad`/`fra_rad` skrev for hånd det `model_dump`/
`model_validate` gjør, Supabase-lageret bygget klienten selv framfor å bruke
`create_supabase_client`, notatlageret kunne ikke slås opp på sak — så ett
oppslag skannet hele katalogen — og fail-closed-regelen lå i to lag med hver sin
loggmelding. Alt er rettet. `JsonFileNotatRepository` holder nå en eksklusiv lås
over hele les-endre-skriv, på en egen låsefil: docstringen lovet «samme låsing
som hendelsesfilene», og gjorde det ikke.

**Vurdert og ikke gjort**

- **Sammensatt indeks `(sak_id, prosjekt_id, opprettet)`** framfor de to
  enkle. Anslaget er resonnert, ikke målt — basen er tom, det finnes ingen
  spørreplan å lese — og `idx_notat_prosjekt_id` har en sannsynlig bruk i den
  oppbevaringssveipen tabellen finnes for.
- **`alle_rader` byttet mot én bundet side.** Det koster én ekstra tom
  rundtur per lesing, men KR-03-regelen om at PostgREST avkorter i stillhet er
  husregel, og et unntak per kallsted er verre enn rundturen.
- **Å slutte å flette notatene inn før `compute_state`.** Det ville tatt
  leserens egne notater ut av `antall_events`/`siste_aktivitet`. Det er en
  beslutning om hva tallene betyr, ikke en opprydding, og hører hjemme i et
  notat før den gjøres i kode.
- **Felles fil- og låsehjelper** for de to JSON-lagrene, og felles
  `EVENT_STORE_BACKEND`-bryter for de seks stedene som leser den. Begge er
  refaktoreringer utenfor det denne runden endret.

**Lest ut av koden, ikke observert**

- At `SupabaseNotatRepository` virker mot ekte PostgREST. Den er kjørt mot
  dobbelen, og kolonnesettet er kjørt mot ekte DDL, men ikke mot den levende
  Data API-en — den er stengt for `anon` og `authenticated`, og en skriving
  ville lagt testdata i prosjektet.
- At sletting er den riktige oppbevaringsregelen. Ruta gjør sletting *mulig*.
  Hvilken regel som skal gjelde — oppbevaringstid, hvem som kan be om sletting,
  hva som skjer ved legal hold — er ikke besluttet noe sted.

**Ikke kontrollert**

- **Relaterte saker viser ikke lenger notater.** `routes/related_cases_utils`
  formaterer hendelser hentet av tjenestene, og de går ikke gjennom
  flettepunktet. Et notat på en *relatert* sak er dermed ikke synlig i
  relasjonsvisningen. Det er en bevisst innsnevring — relasjonsvisningen er et
  sammendrag av en annen sak, ikke dens tidslinje — men den er ikke bekreftet
  mot noe krav, og `visible_events` står igjen der som vern om et notat skulle
  komme inn på annet vis.
- **Ingen brukerflate lager interne notater i dag.** Ingen `.svelte`-fil sender
  `internt_notat`; typen finnes i `src/lib/types/timeline.ts` og i mockdata.
  Skrive- og slettestien er derfor bare kjørt fra tester, aldri fra appen.
- **RLS på `notat` er ikke prøvd med en ekte `authenticated`-token.** Policyen
  er den samme formen `hendelse` har, og `anon`/`authenticated` er stengt ute av
  `20260918131137`, men det er lest — ikke framkalt.
- **Migrasjonsversjonen i basen er ikke den i filnavnet.**
  `apply_migration` stempler sin egen tidsstempel: fila heter `20260921153900`,
  raden i `supabase_migrations.schema_migrations` har en annen verdi. Det samme
  gjelder de tre migrasjonene fra 21.09 formiddag, og handoffen oppga
  filnavnene som om de var basens versjoner. Rekkefølgen er den samme på begge
  sider, så ingenting bygger feil — men den som teller «registrerte filer», må
  vite det. `supabase migration repair` krever fortsatt legitimasjon.

**Spørringene bak de fem summene**

```sql
-- Kolonner
SELECT md5(string_agg(t, E'\n' ORDER BY t)) FROM (
  SELECT table_name||'.'||column_name||':'||data_type||':'||is_nullable
         ||':'||coalesce(column_default,'-') AS t
  FROM information_schema.columns WHERE table_schema='public') s;

-- Skranker
SELECT md5(string_agg(t, E'\n' ORDER BY t)) FROM (
  SELECT conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) AS t
  FROM pg_constraint WHERE connamespace='public'::regnamespace) s;

-- Indekser
SELECT md5(string_agg(indexdef, E'\n' ORDER BY indexdef))
FROM pg_indexes WHERE schemaname='public';

-- Policyer
SELECT md5(string_agg(t, E'\n' ORDER BY t)) FROM (
  SELECT tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'-')
         ||':'||coalesce(with_check,'-')||':'||coalesce(array_to_string(roles,','),'-') AS t
  FROM pg_policies WHERE schemaname='public') s;

-- Rettigheter (avgrenset til rollene stubben kjenner)
SELECT md5(string_agg(t, E'\n' ORDER BY t)) FROM (
  SELECT table_name||':'||grantee||':'||privilege_type AS t
  FROM information_schema.role_table_grants
  WHERE table_schema='public'
    AND grantee IN ('anon','authenticated','service_role')) s;
```
