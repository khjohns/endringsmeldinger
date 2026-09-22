# Gjennomføring: testvedlikeholdet i F0 (T-1, T-3, T-4)

**Dato:** 2026-09-22. **Utgangspunkt:** commit
`85c4ec3f` (`main`, etter PR #34), gren `f0-testvedlikehold`.
**Oppdrag:** [arbeidsinstruksen](prompt-f0-testvedlikehold-2026-09-22.md).
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
F0 i avsnitt 5, og [F0-notatet](gjennomforing-f0-postgresql-ci-2026-09-22.md).

Notatet endrer ingen funnstatus. Hovedplanen har fått en datert merknad under
F0, og radene AUT-03, FE-02, TST-02 og KR-15 er endret bare for testdelen.
FE-02, TST-02 og KR-15 er fortsatt åpne feil. Ingen produksjonskode er endret.

## 1. Hva som er gjort

| Punkt | Test | Fil |
| --- | --- | --- |
| T-1 (AUT-03) | `test_batchruta_avviser_internt_notat_uten_aa_skrive_noe` erstatter `test_batch_innsending_lekker_internt_notat_i_last_event_at` | [`test_autorisasjon_audit_20260918.py`](../backend/tests/test_security/test_autorisasjon_audit_20260918.py) |
| T-3 (FE-02) | `test_sak_context_mangler_brukerens_autoriserte_rolle`: bare oppsettet endret | [`test_frontend_kontrakt_audit_20260918.py`](../backend/tests/test_security/test_frontend_kontrakt_audit_20260918.py) |
| T-4 (TST-02/KR-15) | `test_tst_02_samtidig_opprettelse_overskriver_foerste_sak_uten_concurrency_error` erstatter `test_tst_02_samtidig_saksopprettelse_krasjer_eller_overskriver_uten_concurrency_error` og `test_tst02_samtidig_opprettelse_kolliderer_paa_felles_tmp_fil` | [`test_testsuite_blindsoner_audit_20260918.py`](../backend/tests/test_security/test_testsuite_blindsoner_audit_20260918.py), [`test_tst02_deterministisk.py`](../backend/tests/test_audit_testbevis_20260922/test_tst02_deterministisk.py) |

Hver ny test ble skrevet og kjørt grønn (eller som `xfail` på målassertionen)
før den gamle ble fjernet. Begrunnelsen står datert i docstringen til den nye
testen, slik FE-01 ble erstattet 20.09.

### T-1 — batchruta avviser internt notat før skriving

Den gamle strenge `xfail` ventet `201` og en satt `last_event_at`. Siden
`783c64d` svarer `submit_batch` `400 INTERNT_NOTAT_IKKE_I_BATCH` i
parse-løkka, før state lastes og før noe skrives. Testen feilet derfor på
statuskoden og nådde aldri lekkasjeassertionen.

Den nye testen er ordinær og parametrisert over to batcher: bare notatet, og
notatet etter en gyldig `grunnlag_opprettet`. Den viser:

- `400` med `INTERNT_NOTAT_IKKE_I_BATCH`;
- verken `append` eller `append_batch` på journalen;
- ingen saksopprettelse (`get_sak_creation_service` kalles ikke);
- ingenting i notatlageret. Det er et ekte `JsonFileNotatRepository` i
  `tmp_path`, fordi notater ligger i `notat` og ikke i journalen (MS-05);
- ingen `update_cache`, altså ingen `last_event_at`.

Til slutt sendes samme batch uten notatet i samme oppsett. Den gir `201`, ett
kall til `append_batch` og en satt `last_event_at`. Det viser at doblene ser en
skriving, så de negative assertionene over betyr noe.

Påstanden gjelder bare batchruta. At `last_event_at` ikke lekker gjennom andre
veier, er ikke vist her.

### T-3 — kontekstruta nås med gyldig oppsett

Testen svarte `403` fordi `require_project_access` slår opp saken i
`lib.auth.project_access.get_container().metadata_repository`. Der var det
ikke satt opp noe, og saken hørte dermed ikke til prosjektet. Sesjonen og
kontraktsmedlemskapet var allerede gyldige.

Endret oppsett: en dobbel der `metadata_repository.get` gir
`prosjekt_id="oslobygg"`, og `BH_APPROVAL_DB` i `tmp_path`, fordi ruta nå
kommer til `CatendaDeliveryStatus`, som ellers åpner
`koe_data/approvals.sqlite3` i arbeidskatalogen. Assertionene er urørt.

Testen er fortsatt en streng `xfail` med `raises=AssertionError`, men feiler
nå på målassertionen:

```
AssertionError: /api/cases/<sak_id>/context mangler autoritativ brukerrolle.
Felter: ['catenda_sync', 'historikk', 'state', 'timeline', 'version']
```

FE-02 er altså ikke rettet. Testen ble ikke XPASS.

### T-4 — deterministisk kappløp i `JsonFileEventRepository`

RTB-02 viste at en barriere før `append_batch` ikke garanterer at begge
skriverne har sett at saksfilen mangler. Den nye testen styrer flettingen ved
selve sjekken, `file_path.exists()` i `append_batch`:

1. `_get_file_path` på lagerinstansen gir en `Path`-underklasse der `exists()`
   gjør den ekte sjekken og så venter med `threading.Event`-er. Bare den første
   sjekken per skrivertråd styres.
2. Begge skriverne når sjekken og ser at filen mangler.
3. Skriver 1 fullfører `append_batch`. Skriver 2 venter på det, og fortsetter.

Lagringen er reell (`tmp_path`). Riktig utfall er at skriver 1s sak står, og
at skriver 2 får `ConcurrencyError`. I dag skriver skriver 2 en ny
`{sak_id}.tmp` og flytter den over skriver 1s fil. Begge får versjon 1, og
skriver 1s opprettelse er borte:

```
AssertionError: TST-02: skriver 1s opprettelse ble overskrevet i det stille av
skriver 2. Lagret: ['Sak fra skriver 2'] (versjon 1).
Utfall: {'skriver 1': 1, 'skriver 2': 1}
```

Testen tester ett utfall, overskrivingen. `FileNotFoundError`-varianten, der
begge skriver `.tmp` før noen flytter den, krever en annen fletting og er ikke
reprodusert her.

Markøren er `strict=True, raises=AssertionError`. Når trådplanen ikke kan nås,
kaster testen `FlettingIkkeNaadd` (en `RuntimeError`). Det gir en rød test, ikke
en `xfail` eller XPASS. Det skjer for eksempel hvis sjekken kommer under en lås,
og da må testen skrives om.

To kontroller mot midlertidig endret kode, begge tilbakestilt (`git diff`
tom etterpå):

- Med `os.link` + `FileExistsError` → `ConcurrencyError` i opprettelsesgrenen
  ble testen `XPASS(strict)`. Den oppdager altså en retting.
- For T-1: med avvisningen i `submit_batch` slått av ble begge variantene
  røde.

**Testen fra 22.09 er også erstattet.**
`test_tst02_samtidig_opprettelse_kolliderer_paa_felles_tmp_fil` var en
ordinær test med samme barriere. Dens første assertion forbød
`ConcurrencyError`, som RTB-02 viste er et lovlig utfall. Den er dermed en port
fra TST-02 som kan bli tilfeldig rød, og akseptkriterium 4 i oppdraget
utelukker den. Den andre testen i fila, som viser `Path.rename` isolert, er
deterministisk og står.

## 2. Målinger

200 separate pytest-kjøringer per test, én prosess per kjøring
(`for i in $(seq 1 200); do pytest -q <node>; done`), macOS, Python 3.11.9:

| Test | Utfall |
| --- | --- |
| Ny T-4-test (streng `xfail`) | 200 `xfailed` |
| Gammel TST-02-test (streng `xfail`) | 200 `xfailed` |
| Testen fra 22.09 (ordinær) | 200 `passed` |

**Skallmålingen skiller ikke testene.** På denne maskinen, uten last, møttes
trådene i de gamle testene ved sjekken hver gang. Forskjellen ble derfor målt
på to andre måter:

1. **Under last.** Testfunksjonen ble kalt 2000 ganger i én prosess, mens åtte
   `yes`-prosesser holdt alle kjernene opptatt:

   | Test | Utfall av 2000 |
   | --- | --- |
   | Ny T-4-test | 2000 `AssertionError` på målassertionen (`xfail`) |
   | Gammel TST-02-test | 1995 `AssertionError`, **5 uten** (XPASS: rød port) |
   | Testen fra 22.09 | 1969 uten feil, **31 `AssertionError`** (rød port) |

2. **Med tvungen trådplan.** Et skript utenfor repoet kjørte de gamle
   testfunksjonene uendret. Den andre skriveren fikk gjøre eksistenssjekken
   først når den første var ferdig, og det er en lovlig trådplan. Den gamle
   strenge `xfail` fikk da ingen `AssertionError` (under pytest: XPASS).
   Testen fra 22.09 feilet på assertionen som forbyr `ConcurrencyError`.
   Dette er det RTB-02 beskrev.

Den nye testen styrer selv trådplanen, så den har ingen plan å variere over.

## Verifikasjon og grenser

**Kjørt lokalt og observert (22.09, macOS, Python 3.11.9, `backend/venv`):**

- Hele backend-suiten: 1530 bestått, 19 hoppet over, 39 xfailed. På `main`
  var det 1529, 19 og 40 (F0-notatet). Endringen er +2 (T-1, parametrisert),
  −1 (testen fra 22.09), −2 og +1 strenge `xfail`.
- `ruff check backend/` med den pinnede 0.16.8: ingen feil.
- AST-telling av strenge `xfail`: 40 på `main`, 39 på grenen, alle med
  `raises=`. Endringen er nøyaktig de to erstattede strenge testene (AUT-03 og
  den gamle TST-02) ut og den nye T-4-testen inn. Testen fra 22.09 var ikke en
  `xfail`.
- Målingene i avsnitt 2 og de to kontrollene mot endret kode i avsnitt 1.

**Observert i CI:** ‹CI›

**Ikke kontrollert:**

- `FileNotFoundError`-flettingen i T-4 (se over);
- at en retting med lås rundt sjekken gir `FlettingIkkeNaadd` og ikke
  henger. Det er lest ut av testen, ikke kjørt;
- Supabase-lageret. Påstanden i T-4 gjelder bare `JsonFileEventRepository`;
- om `last_event_at` lekker andre steder enn gjennom batchruta;
- CI på Linux for målingene. De 200 kjøringene er gjort bare på macOS;
- frontend-suiten (ingen endring der);
- dokumentene i auditkjeden som viser til de fjernede testene med linjeankre.
  De er historiske. `audit-testbevis-2026-09-22.md` og
  `review-testbevis-og-planstatus-2026-09-22.md` har fått en merknad.
