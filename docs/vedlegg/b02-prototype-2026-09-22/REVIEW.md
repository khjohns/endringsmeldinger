# Bevisvedlegg til B-02-reviewet

**Dato:** 2026-09-23. **Utgangspunkt:** `10ab546`.
Forrige ledd: [reviewrapporten](../../review-b02-tilgangsmekanisme-2026-09-23.md)
og [originaldesignet](../../design-b02-tilgangsmekanisme-2026-09-22.md).
Funnstatus og alvorlighet står i rapporten, ikke i råloggene.

## Kjøring

Alle skriptene kjøres mot en ny kastbar base gjennom `kjor.sh`. PostgreSQL
17.11 og PostgREST 12.2.12 (`cd3cf9e`) ble brukt. Python trenger psycopg,
PyJWT og requests, som finnes i backendens testmiljø. Ingen prosjektlegitimasjon
brukes; JWT-hemmeligheten i skriptet gjelder bare den lokale testinstansen.

```bash
export PG_BIN=/opt/homebrew/opt/postgresql@17/bin
export POSTGREST=/sti/til/postgrest
export PYTHON=backend/venv/bin/python

# Fra repoets rot: originalbeviset, uendret.
docs/vedlegg/b02-prototype-2026-09-22/kjor.sh

# Én ny base per mutasjon. Sju gir exit 1, uten_force gir exit 0.
for fil in docs/vedlegg/b02-prototype-2026-09-22/mutasjoner/*.sql; do
  B02_MUTASJON="$fil" docs/vedlegg/b02-prototype-2026-09-22/kjor.sh
done

# Reviewets 46 observasjoner, med rollback etter hvert SQL-forsøk.
B02_BEVIS=docs/vedlegg/b02-prototype-2026-09-22/review_bevis.py \
  docs/vedlegg/b02-prototype-2026-09-22/kjor.sh

# Supabases dokumenterte forespørselsvakt, prøvd bare lokalt.
B02_MUTASJON=docs/vedlegg/b02-prototype-2026-09-22/avvis_service_role.sql \
B02_BEVIS=docs/vedlegg/b02-prototype-2026-09-22/transport_bevis.py \
  docs/vedlegg/b02-prototype-2026-09-22/kjor.sh
```

`B02_BEVIS` er reviewets eneste endring i originalkjøreren. Uten variabelen
kjøres originalens `bevis.py`. `review_bevis.py` beskriver observerte
svakheter; at alle forventningene stemmer, betyr ikke at sikkerhetskravene holder.
Det er ikke lagt til eller endret noen `xfail` i produksjonstestsuiten.

## Underlag

| Funn | Underlag |
| --- | --- |
| RB2-01 | [transportforsøk](transport_bevis.py), [lokalt vaktoppsett](avvis_service_role.sql), [resultat](resultater-review-2026-09-23/b02-review-transport.log) |
| RB2-02–05, RB2-07 | [reviewforsøk](review_bevis.py), [resultat](resultater-review-2026-09-23/b02-review-utvidet.log) |
| RB2-06 | [originalresultat](resultater-review-2026-09-23/b02-review-original.log), mutasjonsloggene i samme mappe |
| RB2-01/02/05/08 | [katalogspørringer](katalog-review.sql), [katalogresultat](katalog-review-2026-09-23.json) |

Originalmutasjoner: `uten_medlemskap` 68/71, `uten_skrivevakt` 64/71,
`uten_teamgrense` 60/71. Nye mutasjoner: `uten_handlingsrett_i_kommando`,
`worker_alle_kolonner`, `uten_tomkontekstvern` og
`identitet_til_authenticated` ga hver 70/71; `uten_force` ga 71/71.

## Verifikasjon og grenser

Loggene er beholdt fra kjøringene 23.09; de inneholder bare syntetiske data.
Kataloguttrekket er fra prosjektet `gwdxadexwktegkklyobv`, gjennom Supabase-MCP.
Ingen saksdata ble lest, ingen prosjektendringer utført. Rolleforsøket med
CREATEROLE er lokal PG17, ikke en prøve av Supabases migreringsrestriksjoner.
Transportforsøket gjelder Data API og er ikke en komplett tilgangspolicy.
Øvrige grenser står i reviewrapporten.
