# Gjennomføring: MG-02 — én identitetsform i journalen

Gjennomført 21. september 2026 mot `8522a3b` på grenen
`claude/handoff-docs-legal-review-liw447`. Gjenstand: den siste beslutningen med
frist — **når første ekte sak opprettes.** Forrige ledd er
[gjennomgangen av målskjemarunden](audit-maalskjema-gjennomgang-2026-09-21.md)
(MG-02), [MS-05-gjennomføringen](gjennomforing-ms05-2026-09-21.md) samme kveld og
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

**Dette er ikke en auditrunde.** Den leverer produksjonskode, en migrasjon og
regresjonstester.

Produktbeslutningen — skal en webhook opprette brukerrader for folk som aldri
har logget inn hos oss? — ble tatt samme dag: **ja.** Den står i masterplanens
merknad 2026-09-21 (kveld).

---

## Det korte svaret

| Hindring i MG-02 | Status |
| --- | --- |
| 1 — `UPDATE app_users` overskriver ubetinget | **Rettet.** Migrasjon `20260921164900`, anvendt |
| 2 — beslutningen om å opprette brukerrader | **Var allerede tatt i kode.** Se under |
| 3 — issueren må være identisk | **Var allerede oppfylt.** Kontrollert mot katalogen |
| Selve funnet — to verdiformer i `actorid` | **Lukket.** Prefikset er fjernet |

---

## Hindring 2 var ikke en åpen beslutning

MG-02 skrev at det er «en beslutning å ta uttrykkelig at en webhook oppretter
brukerrader for folk som aldri har logget inn hos oss». **Systemet gjorde det
allerede.**

`koe_reconcile_memberships` kaller `koe_resolve_identity` for hvert
prosjektmedlem ved hver medlemssynkronisering — med issuer
`https://api.catenda.com`, hardkodet i funksjonskroppen. Hvert medlem får en
`app_users`-rad og en `app_identities`-rad uten å ha logget inn.

Katalogen bekrefter det: **14 brukere, 14 identiteter, 14 medlemskap — og
1 sesjon.** Tretten av fjorten brukerrader tilhører folk som aldri har logget
inn hos oss.

Beslutningen ratifiserte altså etablert praksis framfor å åpne noe nytt. Det er
verdt å merke seg *hvorfor* den ble framstilt som åpen: MG-02 leste
`koe_resolve_identity` og fant at innloggingen kaller den, men ikke at
`koe_reconcile_memberships` gjør det samme. Funksjonen ligger i databasen, ikke
i repoet — det er den samme fellen `AGENTS.md` navngir om `app_identities`, og
den slo til på nytt.

## Hindring 3 var oppfylt

`app_identities` har **én** issuer i hele tabellen —
`https://api.catenda.com` — og den er identisk med `CatendaOAuth.BASE`, som
innloggingen bruker. Alle 14 subjekter ligger i 32-heksform. Koden viser nå til
`CatendaOAuth.BASE` framfor å gjenta strengen, slik at de ikke kan gli fra
hverandre.

---

## Hindring 1: den ubetingede oppdateringen

**Migrasjon:** `supabase/migrations/20260921164900_koe_resolve_identity_coalesce.sql`
(anvendt 2026-09-21).

`UPDATE app_users SET email = p_email, name = p_name` kjørte ubetinget hver gang
en kjent identitet ble løst. `app_users.email` og `name` er `NOT NULL` med
default `''`, og begge kallerne sender tom streng når kilden mangler feltet:
`CatendaOAuth.user` gjør `user.get("email") or ""`, og
`koe_reconcile_memberships` gjør `coalesce(m->>'email', '')`.

**Dette rammet ikke bare webhooken.** En innlogging eller en synkronisering der
Catenda utelot navnet, blanket en ekte rad — og navnet er nettopp det
`lib/aktor_navn.py` slår opp for å vise hvem som handlet. Funksjonen
overskriver nå bare med en verdi som faktisk finnes.

---

## Det som faktisk manglet: subjektformen

Innloggingen og medlemssynkroniseringen normaliserer Catenda-IDen med
`catenda_id()` — 32 heksadesimaler uten bindestreker. **Webhooken gjorde det
ikke:** den sendte `bimsync_creation_author.user.ref` urørt videre til både
kontraktsside- og identitetsoppslaget.

Kommer refen med bindestreker, bommer begge oppslagene. Kontraktssiden er
fail-closed og ville avvist saken; identiteten falt tilbake på
`catenda:<ref-med-bindestreker>` — en *tredje* verdiform, ikke bare en andre.

Webhooken normaliserer nå én gang, og avviser en ref som ikke lar seg tolke som
en Catenda-ID.

---

## Fail-closed, som kontraktssiden

`_aktor_id` returnerer `None` når identiteten ikke lar seg avgjøre, og
webhooken oppretter da ingen sak — samme regel og samme begrunnelse som
INT-04 ga for kontraktssiden. En hendelse med en aktør vi ikke kan navngi har
ingen bevisverdi, og journalen kan ikke rettes i ettertid.

Det er en atferdsendring: før ble saken opprettet med `catenda:<sub>` som
aktør. Den formen er nå borte, og da er det ingen dårligere verdi å falle
tilbake på.

---

## Hva som ble slettet

- `CATENDA_PREFIKS` i `lib/aktor_navn.py`
- grenen i `_slaa_opp` som oversatte prefikset tilbake til en bruker
- `AuthRepository.user_id_for_subject` — den hadde nøyaktig to kallsteder, og
  begge var denne formen

---

## Verifikasjon og grenser

**Kjørt og observert**

- Backend: **1527 passed, 9 skipped, 42 xfailed**. `ruff check backend/` rent.
- Frontend: `npm run check:error` **0 errors**. Ingen frontend-fil er endret.
- **Katalogen, ikke migrasjonsfilene,** svarte på hindring 2 og 3: `pg_proc` for
  den kjørende kroppen til `koe_resolve_identity` og `koe_reconcile_memberships`,
  og radtall for `app_users`, `app_identities`, `app_project_memberships`,
  `app_sessions`.
- **Migrasjonen er kontrollert mot den som kjører,** ikke bare antatt anvendt:
  hele settet (23 filer) ble bygget fra tomt i et kastbart PostgreSQL 16-cluster,
  og `md5(pg_get_functiondef(...))` for `koe_resolve_identity` gir
  `b0c9227eaf65eb2d6c9d27658a3d6607` både der og i prosjektet. Migrasjonsfila er
  altså den som faktisk kjører. De fem katalogsnittene dekker ikke
  funksjonskropper, så dette er en egen sammenlikning.
- Seks nye tester i `tests/test_security/test_identitet_20260921.py`: at
  hendelsen bærer `app_users.id`, at issueren er innloggingens, at subjektet
  normaliseres fra begge former, at ingen sak opprettes uten identitet, og at en
  ref som ikke er en Catenda-ID avvises.

**Lest ut av koden, ikke observert**

- **At Catendas `ref` faktisk er en UUID.** Spekken kaller feltet «Id of the
  user», og alle andre Catenda-IDer i systemet er UUID-er. Normaliseringen
  godtar begge former nettopp fordi dette ikke er observert mot en levende
  Catenda-instans.
- At `koe_resolve_identity` kalt fra webhookstien oppfører seg likt som fra
  innloggingen. Samme funksjon og samme argumenter, og kroppen er verifisert
  identisk — men selve webhookstien er ikke kjørt mot den levende basen.

**Ikke gjort**

- **`actorid` er fortsatt `TEXT`, ikke `uuid`.** MG-02 nevner
  typeendringen som en følge, og den er nå mulig — men
  `scripts/create_test_sak.py` og `scripts/test_full_flow.py` skriver literaler
  som `"test-script-te"` og `"test-bruker-te"`, og de respekterer
  `EVENT_STORE_BACKEND`. En `uuid`-kolonne ville brutt dem mot Supabase.
  Produksjonsstiene bruker alle `g.user["id"]` eller den løste identiteten —
  kontrollert. Typeendringen er derfor et skriptrydde-spørsmål, ikke et
  identitetsspørsmål.
- **Ingen datamigrering.** `hendelse` har null rader; det finnes ingen
  `catenda:`-verdi å konvertere.
