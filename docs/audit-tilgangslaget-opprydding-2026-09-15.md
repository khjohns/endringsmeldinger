# Audit: opprydding i tilgangslaget — CSRF og medlemskapsoppslag

Dato: 2026-09-15. Utgangspunkt: `beeb015`.
Forrige logger: [utkastlekkasje og teamavgrensede serverutkast](audit-utkast-serverlagring-2026-09-15.md),
[intern konfidensialitet og forseringsregler](audit-backend-hendelsesflyt-2026-09-15.md),
[autentisering og tilgangsgrenser](audit-autentisering-2026-09-14.md).

Foranledning: en gjennomgang av tilgangslaget etter flere runder med endringer der.
Spørsmålet var om koden holder kvalitet eller bør ryddes, og om den er overtestet.
Konklusjonen var at kjernen er god, men at tre konkrete ting hadde samlet seg. To av
dem er rettet her; den tredje er overlevert.

## Hva som ble vurdert som godt, og ikke rørt

Protokollført fordi en audit som bare lister feil gir et skjevt bilde:

- Fail-closed er gjennomført og begrunnet i docstringene — `contract_membership` gir
  `(None, None)` ved flertydighet, `visible_events` skjuler notater uten kjent eier
  også for forfatteren.
- `require_project_access` validerer at hver refererte sak faktisk hører til prosjektet
  (`referenced_case_ids`, rekursivt gjennom payloaden). Det er kontrollen som pleier å
  mangle i denne typen lag.
- Kontraktssiden utledes av team-ID-er, aldri navn eller brukerkontrollerte data.
- Dekoratørkomposisjonen er riktig oppdeling: én bekymring per dekoratør.

## Funn 1: CSRF ble håndhevet to ganger, og i feil rekkefølge

`require_auth` håndhevet allerede CSRF for alle ikke-GET-metoder
(`lib/auth/session.py`), med kommentaren «several legacy mutations lacked a decorator».
`@require_csrf` lå i tillegg på 20 ruter — samme kontroll, én gang til.

Verre var rekkefølgen. Dekoratøren lå ytterst og kjørte dermed **før** autentisering.
En utlogget bruker som sendte et skjema fikk `403 CSRF validation failed` i stedet for
`401`. Frontend redirecter bare til innlogging på 401 (`src/lib/api/client.ts`), og
prøver en 403 med CSRF-feil om igjen med et nytt token som heller ikke finnes. En
sesjon som løp ut midt i arbeidet ga derfor «Prøv igjen» i løkke i stedet for
innlogging.

### Reproduksjonen måtte gå utenom testsuiten

Første forsøk på å reprodusere feilen **passerte**, og grunnen er et funn i seg selv:
`tests/conftest.py` erstattet `require_csrf` med en no-op før rutene ble importert.
Dekoratøren var altså slått av i hele testsuiten, og hadde ingen dekning noe sted —
det eneste som faktisk ble testet var `require_auth` sin innebygde kontroll.

Produksjonsatferden ble derfor verifisert med en privat kopi av modulen, lastet uten å
røre `lib.auth.csrf_protection`:

| Dekoratørstabel | Utlogget POST |
| --- | --- |
| `@require_csrf` + `@require_auth` (produksjon) | **403** `CSRF validation failed` |
| bare `@require_auth` | **401** `UNAUTHORIZED` |

### Rettingen

`@require_csrf` er fjernet fra alle 20 rutene, og `lib/auth/csrf_protection.py` er
slettet i sin helhet. Håndhevingen ligger nå ett sted: i `require_auth`, som har
sesjonen å sammenlikne mot. Det er også det stedet som ikke kan glemmes — en ny
mutasjonsrute kan ikke gå glipp av kontrollen ved å mangle en dekoratør.

Modulen var 241 linjer, hvorav ~150 var død kode: `generate_csrf_token`,
`validate_csrf_token` og `_test_csrf_protection`. Den levende banen er sesjonsbundet
HMAC-sammenlikning i `session.py`. Tre ting fulgte med i slettingen:

- Modulens docstring bar `Forfatter: Claude / Dato: 2025-11-24`, som bryter repoets egen
  regel om ingen modellnavn i kode eller dokumentasjon.
- Den døde koden brukte `datetime.utcnow()`, deprecated fra Python 3.12.
- `routes/utility_routes.py` importerte `generate_csrf_token` ubrukt — handoffens
  punkt 6, og en av ruff-feilene i baselinen.

`approval_routes.py` definerte en dekorert closure inne i handleren for å
CSRF-beskytte en del av den, for en kontroll som allerede hadde skjedd i `require_auth`.
Closuren er fjernet og kallet gjort direkte.

### Tre tester beskyttet den døde koden

Av seks tester i `tests/test_security/test_csrf.py` testet tre
(`test_generate_csrf_token`, `test_validate_csrf_token_format`,
`test_csrf_token_contains_valid_timestamp`) funksjoner ingen produksjonskode kalte.
De er slettet. Slike tester er verre enn ingen: de får død kode til å se bærende ut, og
er grunnen til at den ble stående gjennom flere auditer.

De tre gjenværende testene dekker den levende banen — at tokenet er sesjonsbundet,
stabilt innenfor sesjonen og ikke mellomlagres.

## Funn 2: medlemskapet ble slått opp to ganger per forespørsel

`require_project_access` kaller `role()` og `require_contract_role` kaller
`contract_membership()`. Begge leste `repo.membership` for samme bruker og prosjekt i
samme forespørsel.

Dette var usynlig da en skriving betydde «send inn en hendelse». Utkastene som ble tatt
i bruk i forrige commit lagres mens brukeren skriver, så kallfrekvensen er en annen nå.

Rettingen er et memo i `AuthService._membership`, som lever i forespørselens `g`. Det er
**ikke** autoritetscachen `contract_membership` bevisst unngår: verdien leses like
ferskt som før, bare én gang i stedet for to innenfor samme forespørsel, og aldri på
tvers av forespørsler. Utenfor en forespørselskontekst går oppslaget rett til repoet.

Reprodusert før retting: 2 oppslag per forespørsel, 4 over to forespørsler. Etter: 1 og
2. Begge tallene er testet, slik at en fremtidig endring som gjør memoet varig over
forespørselsgrensen også fanges.

## Funn 3: kallfrekvensen mot Catenda — ikke rettet

`contract_membership` gjør **ett HTTP-kall til Catenda per konfigurert team, ucachet**
(`lib/auth/catenda_oauth.py`, `team_members`). Med utkastlagring hvert 1,2. sekund under
skriving kan det bli mange kall.

Dette er lest ut av koden, **ikke målt**, og det er ikke rettet her: valget mellom en
kort TTL-cache, sjeldnere lagring og et lettere tilgangsnivå for utkastruten er en
avveining mellom sikkerhet og last som ikke bør tas uten tall. Overlevert i
[handoff-gpt-astra-2026-09-15.md](handoff-gpt-astra-2026-09-15.md).

## Om testvolumet

Spørsmålet var om tilgangslaget er overtestet. Målt er svaret nei:

| | |
| --- | --- |
| Produksjonskode | 50 565 linjer |
| Testkode | 19 423 linjer |
| Forhold | 0,38 |

0,38 er under vanlig for kode der en feil betyr at feil part leser motpartens
kontraktsposisjon. Problemet var ikke mengde, men retning: tre tester pekte på død kode,
og dekoratøren de skulle beskyttet var slått av i hele suiten.

## Verifikasjon

| Kommando | Før | Etter |
| --- | --- | --- |
| `cd backend && python3 -m pytest -q` | 1275 passerer | **1278 passerer** |
| `ruff check services/ routes/ lib/ tests/` | 18 feil | **16 feil** |
| `models/events.py` UP042 / `app.py` I001 | 10 / 1 | **10 / 1** |
| `npx vitest run` | 529 tester, 44 filer | **uendret** (ingen frontendendring) |

**Baselinen for ruff er endret fra 18 til 16.** To eksisterende feil forsvant med
slettingen: den ubrukte importen i `utility_routes.py` og én i den slettede modulen.
Tallet skal ikke stige over 16 herfra.

Nye tester: `tests/test_auth/test_csrf_after_auth.py` (4),
`tests/test_auth/test_membership_lookup.py` (2). Slettet: 3 tester for død kode.

Netto: 37 linjer lagt til, 349 fjernet.

## Gjenstående

1. **Kallfrekvensen mot Catenda** — se funn 3 og handoffen.
2. **`@require_csrf` finnes ikke lenger.** En ny mutasjonsrute trenger `@require_auth`,
   og får CSRF på kjøpet. Det er verdt å vite for den som leter etter dekoratøren.
3. **Samme mønster finnes trolig i to moduler til, og er ikke rørt her.** Kartlagt med
   grep over hele repoet, ikke bare antatt:

   | Modul | Linjer | Referanser utenfor egen fil |
   | --- | --- | --- |
   | `lib/auth/entra_id.py` | 414 | **Ingen.** Dekoratørene nevnes bare i modulens egne docstring-eksempler. |
   | `lib/auth/supabase_validator.py` | 113 | **Bare sine egne tester** (`tests/test_auth/test_supabase_validator.py`). |
   | `lib/auth/magic_link.py` | 211 | Levende: `verify_magic_link` er en rute i `utility_routes.py`, og `event_routes.py` genererer lenker til Catenda-kommentarer. |

   De to første har nøyaktig samme form som CSRF-funnet over: død kode holdt i live av
   tester som peker på den. Til sammen 527 linjer. Det er ikke slettet her fordi
   omfanget var avgrenset til funn 1 og 2, og fordi sletting av en autentiseringsmodul
   bør være en bevisst beslutning — ikke en sidevirkning av en opprydding. Grep er
   sterkt bevis, men ikke bevis for at ingen deploy-konfigurasjon bruker dem.
