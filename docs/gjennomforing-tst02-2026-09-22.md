# Gjennomføring: samtidig saksopprettelse i JSON-lageret (TST-02, KR-15)

**Dato:** 2026-09-22. **Utgangspunkt:** commit
`c1e5649` (`main`, etter PR #35), gren `tst02-eksklusiv-opprettelse`.
**Forrige ledd:** [testvedlikeholdet i F0](gjennomforing-f0-testvedlikehold-2026-09-22.md),
T-4, der kappløpet ble reprodusert deterministisk.
**Oppdrag:** muntlig, 22.09: rett TST-02/KR-15 etter at PR #35 var merget.

Statusendringen står i hovedplanen: TST-02 og KR-15 er lukket, med en datert
merknad under F0.

## 1. Feilen

`JsonFileEventRepository.append_batch` med `expected_version=0` sjekket
`file_path.exists()`, skrev til den faste stien `{sak_id}.tmp` og flyttet den
med `rename`. Ingenting holdt sjekken og flyttingen sammen. To samtidige
opprettelser av samme sak ga derfor ett av to feil utfall, avhengig av
flettingen:

| Fletting | Utfall før rettingen |
| --- | --- |
| Begge passerer sjekken, så skriver den ene ferdig før den andre | Den andre `rename` erstatter den første saksfilen i det stille. Begge får versjon 1 |
| Begge skriver `{sak_id}.tmp` før noen flytter den | Den andre `rename` finner ikke filen: `FileNotFoundError`, som ruta gjør til 500. Filen som ble flyttet, kan inneholde den andre skriverens hendelse, så den som får «ok», kan ha mistet sin (se målingene) |

Riktig utfall er én sak og én `ConcurrencyError`, som ruta gjør til 409.

## 2. Rettingen

[`repositories/event_repository.py`](../backend/repositories/event_repository.py),
opprettelsesgrenen i `append_batch`:

- Saksfilen skrives til en unik midlertidig fil i samme katalog
  (`tempfile.mkstemp`, navn `.{stem}.*.tmp`). To skrivere deler ikke lenger fil,
  og de skjulte navnene fanges ikke av `*.json`-søkene i
  `list_all_sak_ids` og `find_sak_id_by_catenda_topic`.
- Filen publiseres med `os.link(midlertidig, saksfil)`. Operasjonen er atomisk
  som `rename`, men feiler med `FileExistsError` hvis saksfilen finnes, og det
  gjøres om til `ConcurrencyError(0, gjeldende versjon)`.
- Den midlertidige filen fjernes i `finally`, uansett utfall.

Eksistenssjekken foran står som hurtigvei. Den er ikke lenger det som
beskytter mot kappløpet. Oppdateringsgrenen (`expected_version > 0`) er
uendret, og den er beskyttet av `flock`.

## 3. Testene

I [`test_testsuite_blindsoner_audit_20260918.py`](../backend/tests/test_security/test_testsuite_blindsoner_audit_20260918.py):

- `test_tst_02_samtidig_opprettelse_etter_eksistenssjekken_gir_concurrency_error`
  er T-4-reproduksjonen. Den ble `XPASS(strict)` med rettingen og er gjort om
  til en ordinær test med de samme assertionene. Begrunnelsen står datert i
  docstringen.
- `test_tst_02_samtidig_opprettelse_med_to_ferdige_utkast_gir_concurrency_error`
  er ny. Den styrer flettingen ved `os.link`, slik at begge skriverne har en
  ferdig skrevet midlertidig fil før noen publiserer. Det er flettingen som ga
  `FileNotFoundError`. Testen kontrollerer også at det lå to ulike
  midlertidige filer ved publiseringen.

Begge testene deler trådstyringen i `ToSkrivere` og kontrollerer det samme:
skriver 1 får versjon 1, og saken inneholder bare skriver 1s hendelse. Skriver
2 får `ConcurrencyError(0, 1)`. Det ligger ingen midlertidige filer igjen, og
`list_all_sak_ids` gir bare saken.

**Mot det gamle lageret** (fila fra `c1e5649` lagt tilbake midlertidig) blir
begge røde. Den første feiler på assertionen om overskriving (`Lagret: ['Sak
fra skriver 2']`). Den andre stopper med `FlettingIkkeNaadd`, fordi det gamle
lageret ikke kaller `os.link`. Den andre testen er altså en regresjonstest for
den nye publiseringen, ikke en reproduksjon av den gamle `FileNotFoundError`.

## 4. Funn under arbeidet

| ID | Alvorlighet | Funn |
| --- | --- | --- |
| TS2-01 | Middels | Usatt `EVENT_STORE_BACKEND` gir JSON-lageret på lokal disk uten advarsel |
| TS2-02 | Forslag | Reservelagrene bør ut av kjøretidsstien, og testene med ekte lagring bør gå mot PostgreSQL |

### TS2-01 — JSON-lageret er standardverdien

**Sted:** `create_event_repository` i
[`repositories/supabase_event_repository.py`](../backend/repositories/supabase_event_repository.py):
`os.environ.get("EVENT_STORE_BACKEND", "json")`. Metadatalageret gjør det
samme med `"csv"` (`supabase_sak_metadata_repository.py`).

Mangler variabelen i et driftsmiljø, lagres hendelsene i `koe_data/events` på
lokal disk. Det skjer uten feil og uten advarsel. `app.py` advarer bare når
verdien *er* `supabase` og nøklene mangler. Oppstartsbanneret leser
`os.getenv("EVENT_STORE_BACKEND", "csv")` og viser derfor «csv», mens lageret
som faktisk velges, er JSON. Det er samme mønster som `AGENTS.md` beskriver
for `oslobygg`: en standardverdi som gjør en utelatt konfigurasjon usynlig.
Journalen har juridisk vekt, og den ville da ligge på efemer disk (jf.
AR-03).

Lest ut av koden, ikke kjørt i et driftsmiljø. Ikke rettet; det er ikke bedt om.
Søket gjaldt bare formen `os.environ.get("…_BACKEND", "…")` og
`os.getenv`. Andre former er ikke søkt etter.

### TS2-02 — reservelagrene og testene

TST-02 fantes bare i JSON-lageret, og TST-06 viser at reservelagrene har andre
metoder enn Supabase-lagrene. Tester som bruker JSON-lageret fordi det gir ekte
lagring uten avhengigheter, sier ingenting om produksjonsstien. Det er samme
begrensning som `AGENTS.md` beskriver for testdoblene.

Forslaget er å fjerne JSON-hendelseslageret og CSV-metadatalageret fra
kjøretidsstien. Tester som trenger ekte lagring, bør gå mot PostgreSQL gjennom
samme vei som produksjonen. Avsnitt 3.1 i hovedplanen har RPC over PostgREST
som utgangspunkt for transaksjoner. Selve funksjonene kan da testes i SQL mot
CI-basen, uten PostgREST foran. Da trengs en skrivbar testbase, for eksempel én
transaksjon per test som rulles tilbake. Dagens katalogtester er lesende.
Hvilken rolle som kaller funksjonene, avgjøres av B-02. Forslaget bør derfor
vurderes sammen med F1, ikke før. SQLite-lagrene er allerede planlagt flyttet
(AR-03, F1–F3).

Ført inn i hovedplanen som anbefaling i 3.3, ikke som vedtak.

## Verifikasjon og grenser

**Kjørt lokalt og observert (22.09, macOS, APFS, Python 3.11.9):**

- Hele backend-suiten: 1532 bestått, 19 hoppet over, 38 xfailed. Før
  rettingen var det 1530, 19 og 39. Endringen er én streng `xfail` gjort om til
  ordinær, og én ny test.
- AST-telling: 38 strenge `xfail`, alle med `raises=`. Bare T-4-testen er
  borte fra lista.
- `ruff check backend/` med 0.16.8: ingen feil.
- 200 separate pytest-kjøringer per test: begge 200 `passed`.
- To prosesser som oppretter samme sak samtidig, 300 ganger, uten styrt
  fletting (skript utenfor repoet). Med rettingen: 300 av 300 ga én sak og én
  `ConcurrencyError`, og ingen midlertidige filer lå igjen. Med det gamle
  lageret: 300 av 300 feil. I 296 tilfeller fikk prosessen som svarte «ok»,
  ikke sin hendelse lagret. Hendelsen som ble lagret, tilhørte prosessen som
  fikk `FileNotFoundError`. I de fire andre ble hendelsen til prosessen som
  svarte «ok», lagret, men den andre fikk `FileNotFoundError` (500) i stedet
  for `ConcurrencyError` (409).
- Negativ kontroll mot det gamle lageret, se avsnitt 3.

**Observert i CI:** ‹CI›

**Ikke kontrollert:**

- filsystemer uten harde lenker. `os.link` gir da `OSError` (for eksempel
  `EPERM` eller `ENOTSUP`), og opprettelsen feiler. JSON-lageret er ment for
  lokal utvikling, men er også standardverdien (TS2-01). Kjørt bare på APFS
  lokalt og i CI-miljøet;
- en prosess som dør mellom `mkstemp` og `unlink`. Den etterlater en skjult
  `.{stem}.*.tmp`. Den gamle koden etterlot `{sak_id}.tmp`. Ingen av dem leses
  som sak;
- `fsync` før publisering. Opprettelsesgrenen hadde det ikke før heller, og
  holdbarhet ved strømbrudd er ikke en del av TST-02;
- Supabase-lageret. Det har `UNIQUE (sak_id, versjon)`, men er ikke kjørt her;
- samtidighet mellom prosesser er bare kjørt med skriptet over, ikke som test
  i suiten.
