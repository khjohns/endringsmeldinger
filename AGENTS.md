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

**Koden skal være klar av seg selv — skriv få kommentarer.** Er noe uklart eller
komplisert, hører forklaringen hjemme i `docs/`, ikke i en kommentarblokk over
koden. En kommentar er berettiget når den sier noe leseren ikke kan lese ut av
koden i det hele tatt: en ekstern beskrankning, en bevisst utelatelse, en
audit-ID å slå opp. Aldri historikk («her sto tidligere …») — den står i
dokumentkjeden — og aldri en omskrivning av linja under.

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

**Migrasjonene kan verifiseres uten å røre basen.** PostgreSQL 16 ligger lokalt
(`/usr/lib/postgresql/16/bin`). Sett opp et kastbart cluster med `initdb` i en
katalog `postgres`-brukeren eier, stub Supabase-plattformen (rollene `anon`,
`authenticated`, `service_role`, skjemaet `auth` med `users`, `auth.role()` og
`auth.email()`), og kjør migrasjonene mot en tom base. Sammenlikn så katalogen med
prosjektet ved å ta `md5(string_agg(...))` over kolonner, skranker, indekser,
policyer og rettigheter på begge sider. Det fanger ting lesing ikke gjør: sirkulære avhengigheter,
manglende kolonner, policyer i feil form.

**Filnavnrekkefølgen *er* apply-rekkefølgen** — men det er en fersk skranke, ikke
en naturlov. `backend/migrations/` er tømt (20.09); all DDL ligger i
`supabase/migrations/`, og `supabase/config.toml` peker på prosjektet.
Avhengighetene er reelle: kjerneskjemaet må komme før `20260911073600_projects`,
som gjør `UPDATE sak_metadata`, og `project_memberships` må komme etter
`projects`. Legger du inn en migrasjon med et versjonsnummer som sorterer feil,
bygger ikke basen fra tom. To vakter i
`tests/test_security/test_database_arkitektur_20260920.py` holder på det.

**Stubben må gi `service_role` fulle rettigheter,** ellers er sammenlikningen
ikke tro: `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` pluss
`ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES TO service_role`. Supabase gjør
dette ved prosjektoppsett, ikke i migrasjonene — og **åtte av tjue tabeller har
ingen eksplisitt `GRANT` i repoet i det hele tatt.** De virker bare fordi
plattformen deler ut rettigheter. Flyttes basen bort fra Supabase, forsvinner
de.

**Testsuiten kan ikke se at basen er uenig med repoet.** Supabase-lageret dekkes
bare av testdobler, og doblene speiler repoet — `EVENT_TABLE_COLUMNS` i
`test_event_roundtrip.py` er tro mot migrasjonsfilene, ikke mot databasen. Da
`actorteam` manglet i basen, var suiten grønn mens *enhver* skriving til
Supabase-lageret feilet. Grønn suite er derfor ikke bevis for at en skjemaendring
har nådd fram; det er katalogspørringen som er beviset.

**Endrer du databasen, skriv migrasjonsfila i samme runde.** All DDL skal ligge i
`supabase/migrations/` med samme SQL som faktisk ble kjørt, og fila skal si at den
er anvendt. Repoet og basen har drevet fra hverandre i begge retninger før: basen
var bygget av seks migrasjoner som ikke fantes i repoet, og en repo-migrasjon lå
to dager uten å være anvendt — med den følgen at `actorteam` ikke fantes, og at
**enhver skriving** til Supabase-lageret ble avvist. Begge deler er rettet
20.09. En endring som bare finnes ett av stedene er ikke gjennomført.

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

**Og ett av lagene ligger ikke i repoet i det hele tatt.** Ti funksjoner bor i
`public` — `koe_resolve_identity`, `koe_reconcile_memberships`,
`auto_create_project_membership` og flere. De er en del av applikasjonen, og et
kodesøk finner dem aldri. Tabellen `app_identities` har **null treff** på sitt eget
navn i hele repoet, og er likevel bærende: den leses og skrives ved hver
innlogging, fra en databasefunksjon. En runde konkluderte med at den var ubrukt.
Spør katalogen — `pg_proc`, `pg_trigger`, `pg_policy` — før du skriver at noe ikke
er i bruk. En trigger kan også være den egentlige skriveren: `project_memberships`
fylles av en trigger, mens koden som ser ut til å skrive den, treffer en
unik-skranke og logger en advarsel hver gang.

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
