# Arbeidsinstruksjoner for agenter

Kontraktsadministrasjon etter NS 8407: formelle varsler mellom totalentreprenør og
byggherre, lagret som en hendelseslogg. Hendelsene har juridisk vekt — de avgjør om
et krav er bevart eller prekludert.

**Denne fila inneholder bare det som er stabilt.** Status på funn, testtall og
faseplaner står i `docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(masterplanen) og siste `docs/handoff-*.md`. Ikke før slikt inn hit — det blir
foreldet, og fila lastes automatisk og blir trodd.

## Språk

Norsk bokmål i alt: kode, kommentarer, dokumentasjon, commit-meldinger, testnavn.
Commit-meldinger begynner med liten forbokstav og et verb i imperativ.
Domenebegrepene er norske og oversettes ikke.

## Domenet

| Begrep | Betydning |
| --- | --- |
| **TE** / **BH** | Totalentreprenør / byggherre. Kontraktens to sider |
| **sak** | Én endringssak, med en egen hendelsesstrøm |
| **spor** | `grunnlag` (ansvar), `vederlag` (penger), `frist` (tid). Går parallelt |
| **varsel** | Formell melding med frist. For sent varsel kan preskludere kravet |
| **forsering** | §33.8. TE fremskynder arbeid etter avslått fristforlengelse |
| **endringsordre (EO)** | §31.3. BH pålegger formelt en endring |
| **internt notat** | Kun synlig for forfatterens egen organisasjon |

**Kontraktsside (TE/BH) er ikke det samme som organisasjon.** Én side kan ha flere
Catenda-team — byggherren og en ekstern rådgiver er ulike organisasjoner på samme
side. Skjerming av interne notater og utkast går på **team**, ikke på side.

**Utvider du `SporStatus`, let opp alt som teller opp statuser.** Frontend
hjelper deg: `Record<SporStatus, …>`-kartene i `src/lib/constants/` er
uttømmende, så `npm run check:error` navngir hvert sted som mangler den nye
verdien. Backend gjør det ikke. Der er stedene mengder og sammenlikninger som
stilltiende faller gjennom — rollupen `overordnet_status`
(`models/sak_state.py`) og regelsettene i `services/business_rules.py`. En
status som mangler i rollupen gir ingen feilmelding, den gir «UKJENT» på en sak
som er oppgjort. Det skjedde da `AVSLATT_AKSEPTERT` kom til.

## Miljø

```bash
# Systempython mangler pytest, og pip install systemvidt feiler på debian-PyJWT.
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install -q \
  -r backend/requirements.txt -r backend/requirements-dev.txt
cd backend && /tmp/venv/bin/python -m pytest -q      # ~9 s
npm test && npm run check:error                      # ~49 s, 0 errors i dag
```

Testene er raske. Kjør dem ofte.

`ruff check backend/` er porten og skal være 0. **`ruff format` er det ikke** —
repoet er aldri formatert med den, og `ruff format .` ville skrevet om rundt 80
filer. Kjør den ikke på hele treet.

Databasen kan inspiseres direkte gjennom Supabase-MCP — prosjekt `endringsmeldinger`,
ref `gwdxadexwktegkklyobv`. **Bruk det.** Å lese migrasjoner og utlede hva databasen
inneholder er den dokumenterte årsaken til flere feilklassifiserte funn; migrasjonene
er ufullstendige og docstringene utdaterte. Hold deg til katalogspørringer; saksdata
er konfidensiell kontraktskorrespondanse.

Et eldre prosjekt `unified-timeline` (`iyetsvrteyzpirygxenu`) er INACTIVE og skal
ikke røres.

**Endrer du databasen, skriv migrasjonsfila i samme runde.** All DDL skal ligge i
`supabase/migrations/` med samme SQL som faktisk ble kjørt, og fila skal si at den
er anvendt. Repoet og basen har drevet fra hverandre i begge retninger før: basen
er bygget av migrasjoner som ikke finnes i repoet, og minst én repo-migrasjon er
aldri anvendt — med den følgen at en kolonne koden krever ikke finnes, og at
lesinger feiler. En endring som bare finnes ett av stedene er ikke gjennomført.

## Sikkerhetsinvarianter

Brytes en av disse, er det en sikkerhetsfeil uansett hvor liten endringen så ut.

- **Enhver rute har `require_auth` + `require_project_access` + eventuelt
  `require_contract_role`.** `tests/test_security/test_public_route_registry.py`
  håndhever det: en udekorert rute må stå oppført med skriftlig begrunnelse.
  Legger du til en rute, forvent å måtte begrunne den der.
- **CSRF håndheves inne i `require_auth`** (`lib/auth/session.py`), bevisst, slik at
  en ny mutasjonsrute ikke kan glemme den. Ikke flytt den ut.
- **`aktor_rolle`, `aktor_team_id`, `tidsstempel` og `event_id` settes av serveren.**
  Klienten kan ikke sende dem — `models/events.py` avviser forsøket. Stol aldri på
  en rolle klienten oppgir.
- **Interne notater og utkast er fail-closed.** Uten entydig team finnes det ikke noe
  å lese eller skrive. Et notat uten `aktor_team_id` vises til ingen, heller ikke
  forfatteren.
- **Prosjektgrensen må håndheves ved hvert lesepunkt**, også for saker det refereres
  til. Klientoppgitte relasjoner skal ikke utvide tilgangen — bruk
  `cases_in_project`. Dette er brutt flere ganger; se masterplanens merknad om RV-07.
- **Det finnes ikke noe defaultprosjekt.** Mangler `X-Project-ID`, er prosjektet
  *ukjent* — ikke `oslobygg`. `get_project_id()` returnerer `None`, og kallere skal
  behandle det som «ingen tilgang». `prosjekt_id` er `NOT NULL` uten default på
  hendelsestabellene og `sak_relations`, og skrivestiene stempler det fra autorisert
  kontekst. Gjeninnfører du en fallback — også som et uskyldig
  `prosjekt_id or "oslobygg"` i én sammenlikning, eller som et tomt filter som
  «betyr alle» — blir attribusjonen uetterprøvbar igjen, og det lar seg ikke rette
  i ettertid når ekte saker først finnes.

## Tre resonneringsregler

Disse er årsaken til de fleste feilklassifiserte funnene i auditserien.

**Ikke utled kjøretidsatferd fra ett lag.** Ser du en påstand på formen «krasjer»,
«lekker», «returnerer» eller «omgår» — finn laget som faktisk ville produsert
virkningen, og les det. For frontend: kontroller alltid om serveren håndhever
uavhengig før noe klassifiseres som sikkerhetsfunn. Serveren holder oftere enn
klientkoden antyder.

Og **les hele stedet, ikke et utsnitt**. Det er ikke nok å finne riktig lag hvis du
leser en avkuttet del av det. To feilklassifiseringer kom av nettopp dette: et
`grep`-vindu som stoppet én linje før `@require_project_access()`, og en baseklasse
lest uten overstyringen i underklassen. Begge ga en selvsikker, gal påstand om
nåbarhet, og begge ble fanget av testsuiten — ikke av lesingen.

**Har du funnet ett tilfelle, har du ikke funnet alle.** Søket formes av det du
allerede fant, så tellingen vokser i runder — og hver runde melder seg ferdig.
Oslobygg-fallbackene gikk tre → fem → åtte → fjorten, hver gang fordi neste
gjennomgang lette etter den formen forrige gjennomgang hadde funnet. Den samme
defaultverdien gjemmer seg i minst seks former: `x or "verdi"`,
`getattr(obj, "x", "verdi")`, `d.get("x", "verdi")`,
`request.headers.get("X", "verdi")`, et defaultargument i Python eller
TypeScript, og en `DEFAULT` i databasen. Søk etter alle formene før du skriver
«alle er fjernet» — og skriv heller hvilke former du søkte etter.

**En grønn streng `xfail` beviser ikke funnet**, bare at testens assertion feiler.
Suiten inneholder mange bevisste reproduksjoner av udekkede svakheter. **Ikke «rett»
en xfail ved å endre testen** — de er dokumentasjon. Rettes den underliggende
feilen, blir testen XPASS og skal da gjøres om til en ordinær test.

## Dokumentasjon

`docs/` er en kjede av auditer og planer som viser til hverandre.
[`docs/README.md`](docs/README.md) er indeksen: hva som gjelder, hva som er
historikk, og hvor man begynner. Skriver du et nytt dokument, følg formen: dato og commit i åpningen, lenker til forrige ledd, funntabell
med ID og alvorlighet, én seksjon per funn med fil og symbol, og **«Verifikasjon og
grenser»** til slutt som navngir hva som *ikke* er kontrollert.

- **Skill mellom «Kjørt og observert» og «Lest ut av koden».** Det er ikke samme
  påstand, og forskjellen er der feilklassifiseringene oppstår.
- **Masterplanen er autoritativ for funnstatus.** Sier et annet dokument noe annet,
  er det andre foreldet — rett det, ikke gjenopprett diskusjonen.
- **Opphever du et tidligere utsagn, skriv en datert merknad** («Merknad 2026-09-19
  til RV-07») — også inn i det gamle dokumentet, ellers står de to side om side uten
  at leseren vet hvilket som gjelder.

## Arbeidsform

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet i dokumentene angir
mulig konsekvens under beskrevne forutsetninger, ikke observert hendelse.

Ingen produksjonskode endres uten at det er bedt om det. Auditrunder leverer
dokumenter og reproduksjonstester, ikke rettinger.
