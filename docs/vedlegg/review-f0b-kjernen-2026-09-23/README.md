# Kjør reviewforsøkene for F0b

**Dato:** 2026-09-23. **Kontrollert commit:** `55ad006c1e24e87d09831fd6735e563bf441391f`.
Forrige ledd er [reviewrapporten](../../review-f0b-kjernen-2026-09-23.md) og
[implementeringens mutasjoner](../f0b-kjernen-2026-09-23/mutasjoner.py).
Funn og alvorlighet står i rapporten, RK-01–RK-05.

Kjør fra repoets rot, med backend-avhengighetene installert. PostgreSQL 17 må
finnes lokalt. Velg en ledig port og en katalog som ikke finnes:

```bash
export PG_BIN=/opt/homebrew/opt/postgresql@17/bin
export PATH="$PG_BIN:$PATH"
export KOE_TESTBASE_KATALOG=/private/tmp/koe-review-f0b-egen
export KOE_TESTBASE_PORT=54327
scripts/testbase/lokal_testbase.sh start
export KOE_TESTBASE_URL="$(scripts/testbase/lokal_testbase.sh url)"

# Hele eksisterende backend-suiten:
(cd backend && venv/bin/python -m pytest -q -p no:cacheprovider)

# 57 opprinnelige databasetester, reviewforsøk, fixturefeil og mutasjoner:
backend/venv/bin/python docs/vedlegg/review-f0b-kjernen-2026-09-23/kjor.py \
  --mutasjoner --resultater /private/tmp/koe-review-resultater

scripts/testbase/lokal_testbase.sh stopp
```

Tilpass Python-stien og `PG_BIN` til miljøet. `kjor.py` krever eksplisitt
`KOE_TESTBASE_URL`, localhost, PostgreSQL 17 og testbasemerket. Ikke bruk en
delt base. Skriptet lager en kastbar kopi av **Git HEAD**, legger reviewtestene
inn under kopiens `tests/test_database/` og kjører der. Ukommitterte endringer
i produksjonskoden prøves dermed ikke. Arbeidstreet endres ikke. Basen må
brukes av bare denne kjøringen; fixturen tømmer tabeller ved opprydding.

[test_review.py](test_review.py) har 14 forsøk. Noen bekrefter korrekt atferd,
andre fastslår svakheter i den kontrollerte versjonen. De siste skal endres
til krav om rettet atferd ved en framtidig retting, ikke ukritisk kopieres som
regresjonskrav. [test_fixture_avbrudd.py](test_fixture_avbrudd.py) har én
**tilsiktet rød test** etter commit og én etterfølgende kontroll av finalizeren.
Runneren krever akkurat den tilsiktede feilen.

[kjor.py](kjor.py) gjenbruker definisjonene for M01–M27, men kjører dem i kopien,
uten `-x`, og beholder JUnit-resultatene. Det viser hvilke tester som feiler,
og avviser oppsettsfeil som belegg. Deretter kjører den:

| Mutasjon | Endring | Forventet resultat på kontrollert commit |
| --- | --- | --- |
| RM01 | `_er_ren`: `return rad[0]` | 57 gamle tester grønne; separat kravtest rød |
| RM02 | `_er_ren`: `return rad[1]` | 57 gamle tester grønne; separat rolletest rød |
| MC01 | `SET ROLE`, sesjonskrav og ingen reset | Gammel sesjonsinspeksjon rød; ny tom kontekst inne i neste hjelperblokk grønn |

Hver kjøring skriver `.log` og `.xml` per forsøk samt `sammendrag.json`.
[resultater.json](resultater.json) er det lagrede sammendraget fra reviewet.
Skriptet uten `--mutasjoner` kjører bare grunnlag, reviewforsøk og fixtureavbrudd.

## Verifikasjon og grenser

Oppskriftens testløper er kjørt med Python 3.11.9, PostgreSQL 17.11,
psycopg 3.3.6, psycopg-pool 3.3.3 og pytest 9.0.2 på macOS 26.2.
Alle 27 opprinnelige mutasjoner ble fanget; de nye avdekket de to blindsonene.
Dette er en reproduksjon av en bestemt commit, ikke en framtidig grønn CI-port:
når svakhetene rettes, skal reproduksjonene eller forventningene bli røde.
PgBouncer, Azure og Supavisor er ikke prøvd. Flere grenser står i rapporten.
