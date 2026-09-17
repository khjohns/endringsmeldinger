# Prompt: svakhetsgjennomgang av kodebasen før produksjon

Denne filen er en **prompt til en ny modell** som skal finne og vurdere svakheter i
dagens kodebase. Den er ikke en plattformsammenligning — Power Platform brukes bare som
en sjekkliste over modenhetskrav appen skal måles mot.

Kopier alt under linjen.

---

# Oppdrag: finn svakhetene som må lukkes før produksjonssetting

Du skal gjennomgå `khjohns/endringsmeldinger` og finne **hva som er galt eller mangler i
dagens kodebase**. Ikke sammenligne med andre plattformer, ikke oppsummere tidligere
arbeid, ikke bekrefte en anbefaling.

Forrige økt vurderte om Power Platform ville gitt denne appen noe den mangler. Det
sluttproduktet er ikke det viktige. Det viktige er **listen over svakheter den
gjennomgangen avdekket underveis** — og de er ikke fulgt til bunns.

Brukerens presisering: appen er ikke i produksjon, koden er work in progress, og den
**må være sikker før den settes i prod**. Les alt under som krav til
produksjonssetting, ikke som kritikk av ferdig arbeid.

## Konteksten

SvelteKit 2 SPA (Svelte 5 runes, `adapter-static`, `ssr: false`) med Flask-backend, for
NS 8407-forhandlinger mellom byggherre (BH) og totalentreprenør (TE). All UI-tekst og
dokumentasjon er **norsk bokmål**.

Domenet er juridisk. Tekst appen genererer går inn i formelle kontraktsbrev til
motparten. At feil part leser motpartens interne vurdering, eller at en part får godkjent
et beløp uten fullmakt, er reelle problemer med økonomisk konsekvens.

Appen er ikke i produksjon og databasen har ingen reelle data (brukeravklaring
2026-09-15). Skjemaendringer har derfor ingen migreringskostnad nå — det vinduet lukker
seg ved første produksjonsdata.

Repoet har **ingen CLAUDE.md** — den ble bevisst slettet. `docs/` er konteksten.
Ti auditlogger ligger i `docs/audit-*.md`. De er grundige, men se S1 under: de dekker
ikke alt som er i appen.

## Miljø

```bash
npm install

cd backend
pip install --timeout 180 --retries 10 --ignore-installed PyJWT \
  -r requirements.txt -r requirements-dev.txt
python3 -m pytest -q
```

`api.catenda.com` er blokkert av proxyen. Testsuiten går uten nettverk i det hele tatt,
og skal forbli slik.

Forventet baseline (fra forrige handoff — **verifiser selv**): backend 1278 tester,
`npx vitest run` 529 tester / 44 filer, `npm run check` 0 feil / 10 advarsler,
`ruff check services/ routes/ lib/ tests/` 16 eksisterende feil. Forrige økt endret bare
dokumentasjon og kjørte ikke suiten.

---

# Del 1: Spor som er funnet, men ikke fulgt til bunns

Rangert etter hvor alvorlig konsekvensen er hvis mistanken stemmer. **Alle er lest ut av
koden, ingen er reprodusert.** Behandle dem som utgangspunkt, ikke som funn.

## S1 — En hel OAuth-flate i appen som ingen audit har dekket

Dette er det viktigste sporet, og det bør tas først.

Tre blueprints er registrert i `app.py` (linje 211, 212, 213) og er altså levende i
samme Flask-app som betjener kontraktsdata:

| Fil | Prefiks | Ruter | Autentisering |
| --- | --- | --- | --- |
| `routes/oauth_consent_routes.py` | `/api/oauth` | `GET /authorization/<id>`, **`POST /authorization/<id>/approve`**, `POST .../deny` | ingen dekoratør |
| `routes/oauth_auto_consent_routes.py` | `/oauth` | `GET /consent` | ingen dekoratør |
| `routes/wellknown_routes.py` | `/.well-known` | `oauth-authorization-server`, `oauth-protected-resource`, `openid-configuration` | ingen dekoratør |

`oauth_auto_consent_routes.py` beskriver seg selv slik i sin egen docstring:

> When Supabase OAuth Server redirects to `/oauth/consent?authorization_id=xxx`, this
> route automatically: 1. Creates an anonymous Supabase user 2. Approves the
> authorization request 3. Redirects back to the client (e.g., Claude.ai).
> This is appropriate for MCP servers that serve public data (like KOFA decisions) where
> no real user authentication is needed.

**KOFA-avgjørelser er et annet domene.** Dette ser ut som kode fra et annet prosjekt — en
MCP-server for offentlige data — som er båret inn i dette repoet. Her finnes ingen
offentlige data.

Verifisert: blueprintene er registrert, rutene har ingen `require_auth`, og **ingen
produksjonskode bruker `require_supabase_auth` eller `lib/auth/supabase_validator.py`**.
Ingen av de ti auditloggene nevner MCP, consent, well-known eller KOFA — søk selv på
`grep -rniE "mcp|consent|wellknown|kofa" docs/*.md` og bekreft.

**Ikke verifisert, og det er dette du skal finne ut:**

1. Kan et token som mintes gjennom denne flyten brukes mot noen rute som betjener
   kontraktsdata? Autentiseringsauditen slo fast at et Bearer-token ikke kan erstatte
   cookie-sesjonen — gjelder det fortsatt overalt, også for disse rutene?
2. `supabase_validator.py` er validatoren for nettopp slike tokens, og den er i dag død
   kode. Hva skjer hvis en fremtidig rute tar den i bruk? Er dette et hull som er lukket,
   eller bare et hull som ikke er koblet opp ennå?
3. Kan `POST /api/oauth/authorization/<id>/approve` kalles av hvem som helst? Hva
   godkjenner den, og mot hvilken Supabase-instans?
4. Eksponerer `/.well-known/openid-configuration` noe om Supabase-prosjektet som ikke bør
   være offentlig?
5. **Skal denne flaten være her i det hele tatt?** Hvis den tilhører et annet produkt, er
   det enkleste og sikreste tiltaket å fjerne blueprintene før produksjon. Undersøk om
   noe faktisk avhenger av dem.

Konkluder eksplisitt. Hvis flaten er ufarlig, si det med begrunnelse — det er et fullt
gyldig utfall og verdt å protokollføre.

## S2 — `"oslobygg"` som standardprosjekt er bakt inn overalt

Målarkitekturen i `docs/catenda-dataflyt.md` er flerprosjekt. Koden har fortsatt et
hardkodet enkeltprosjekt som fallback på minst fjorten steder:

```
lib/project_context.py:14                DEFAULT_PROJECT_ID = "oslobygg"
lib/project_context.py:34                getattr(g, "project_id", DEFAULT_PROJECT_ID)
routes/bim_link_routes.py:194,300,324    request.headers.get("X-Project-ID", "oslobygg")
routes/approval_routes.py:26,32          getattr(g, "project_id", "oslobygg")
routes/event_routes.py:459,693           project_policy(getattr(g, 'project_id', 'oslobygg'))
services/endringsordre_service.py:108,117,181
```

`docs/catenda-innlogging.md` sier at «det tidligere åpne prosjektunntaket for `oslobygg`
er fjernet». Tilgangsunntaket er fjernet — **fallbackverdien er det ikke.**

Spørsmålet å besvare: er disse defaultene nåbare? Hvis `require_project_access` alltid
setter `g.project_id`, er de døde og bør fjernes som støy. Hvis en rute mangler
dekoratøren, eller en tjeneste kalles utenfor en forespørselskontekst, faller koden
tilbake til et navngitt prosjekt i stedet for å nekte.

Merk særlig `bim_link_routes.py:194` — der leses prosjektet fra en **klientheader** med
fallback, i en rute som riktignok har `@require_project_access()`. Kontroller om
headerverdien og `g.project_id` kan divergere.

Beslektet: `lib/auth/entra_id.py:84` avgjør noe ut fra om firmanavnet inneholder
`"oslobygg"`, `"obf"` eller `"oslo kommune"`. Resten av kodebasen har en uttrykt regel om
at tilhørighet aldri utledes av navn — se BE-01. Modulen er trolig død kode (se S7), men
mønsteret bør ikke overleve.

## S3 — `submit_batch` leverer aldri til Catenda

`routes/event_routes.py` rundt `:760`–`815`: batchinnsending gjør `append_batch`, leverer
vedlegg, oppdaterer metadatacachen — og kaller **aldri** `_post_to_catenda`. Ingen PDF,
ingen kommentar, ingen statussynk.

`docs/audit-backend-hendelsesflyt-2026-09-15.md` noterer dette som en avgrensning
(«Batch-innsending leverer ikke til Catenda»), men det er ført opp som en observasjon,
ikke som et spørsmål.

Spørsmålet: **er en batchinnsending en formell meddelelse til motparten?** Hvis ja, når
den aldri fram, og saken viser en hendelse motparten ikke har fått. Hvis batch bare
brukes ved saksopprettelse der webhooken uansett poster en kommentar, er det riktig.
Finn ut hvilken av delene som gjelder, og hvilke hendelsestyper som faktisk går denne
veien fra frontend.

## S4 — Analytics går utenom konfidensialitetsfilteret

`lib/auth/event_visibility.visible_events()` kalles fra fire steder:
`routes/event_routes.py:1112` og `:1184`, `routes/related_cases_utils.py:80` og `:140`.

`routes/analytics_routes.py` kaller den ikke. BE-01-auditen fører dette opp som «akseptert
restsignal» fordi `/api/analytics/timeline` bare aggregerer antall.

To spørsmål den avklaringen ikke besvarte:

1. Auditen vurderte **én** analytics-rute. Filen har syv, blant annet
   `get_actor_analytics`, `get_response_times` og `get_by_category`. Leser noen av dem
   innhold, aktør eller kategori fra interne notater?
2. BE-01 slår fast at *at* en organisasjon har gjort en intern vurdering i seg selv er
   skjermingsverdig. En telling som øker med én når motparten skriver et notat, lekker
   nettopp det. Er aggregeringen grov nok til at det ikke betyr noe, eller kan en
   tidsserie avsløre motpartens interne aktivitet?

Det prinsipielle: filteret er **kallstedsdisiplin**, ikke et flaskehalspunkt. Et femte
lesepunkt som glemmer det åpner hullet igjen. Vurder om det finnes en plassering som ikke
kan glemmes.

## S5 — Ingen durable outbox, ingen inbox, ingen bakgrunnsworker

Se `docs/design-durable-inbox-outbox-2026-09-17.md` for det fulle bildet. Kjernen:

- `submit_event` berører tre lagringssystemer og fire eksterne kall uten at noen
  transaksjon spenner over noe (`routes/event_routes.py:370`–`620`).
- Dør prosessen etter commit, finnes ingen rad noe sted som sier at hendelsen fortsatt
  skal leveres. `CatendaDeliveryStatus` sier det i sin egen docstring: *«this is not a
  retry queue.»*
- `ApprovalService.deliver` kalles bare fra `routes/approval_routes.py:152`, altså fra en
  HTTP-forespørsel. **Det finnes ingen bakgrunnsworker i repoet** — en feilet leveranse
  forblir feilet til et menneske trykker på nytt.
- Webhookens idempotens er `_processed_events: set[str]` i
  `lib/security/webhook_security.py`: i minnet, tapt ved restart, per replika.

Etterprøv designforslaget kritisk. Særlig ett alternativ ble forkastet uten begrunnelse:
**behold lagrene der de er, skriv outbox-raden uten atomisitet, og bruk en
avstemmingsjobb** som finner hendelser uten leveranse. Svakere garanti, vesentlig
billigere. Er den god nok her?

Og et skalaspørsmål: volumanslaget er ~150 000 hendelser i året, altså noen få i
minuttet. Er en worker med lease og dead letter riktig nivå, eller overengineering?

## S6 — Hendelseslageret kan ikke delta i en transaksjon

`repositories/supabase_event_repository.py:232` (`create_client`) og `:426`
(`.insert(rows).execute()`): lageret nås over **PostgREST over HTTP**. Et REST-kall er én
autocommit-operasjon.

Klassens egen docstring fører opp «ACID transactions» som en fordel. Det stemmer for
databasen under, men ikke for denne klienten.

Dette er forutsetningen S5 hviler på. **Forsøk å falsifisere den** — finn en RPC-vei,
en lagret prosedyre eller noe annet som gir flerstegs atomisitet gjennom denne klienten.
Klarer du det, endres anbefalt rekkefølge.

## S7 — Død autentiseringskode, og én av modulene er ikke uskyldig

Kartlagt i `docs/audit-tilgangslaget-opprydding-2026-09-15.md`, fortsatt åpent:

| Modul | Linjer | Referanser utenfor egen fil |
| --- | --- | --- |
| `lib/auth/entra_id.py` | 414 | ingen |
| `lib/auth/supabase_validator.py` | 113 | bare egne tester |

Repoet har et bekreftet mønster: **død kode holdt i live av tester som peker på den.**
Det er funnet to ganger, senest CSRF-modulen på 241 linjer.

Det nye her er koblingen til S1: `supabase_validator` er validatoren for tokens fra
OAuth-flaten. «Død» betyr at ingen rute bruker den *i dag*. Vurder de to sammen.

## S8 — Kallfrekvensen mot Catenda er aldri målt

Den åpne oppgaven fra `docs/handoff-gpt-astra-2026-09-15.md`.
`AuthService.contract_membership` gjør **ett ucachet HTTP-kall til Catenda per
konfigurert team, per beskyttet forespørsel**. Utkastene autolagrer hvert 1,2. sekund
mens brukeren skriver (`LAGRE_FORSINKELSE_MS` i
`src/lib/kontraktsbord/submission.svelte.ts`).

Å skrive et avsnitt kan bli titalls Catenda-kall. **Dette er lest ut av koden, ikke
målt** — proxyen blokkerer Catenda. Hvis du kan måle det, gjør det. Hvis ikke, si hva som
må måles og hvordan.

Vær oppmerksom på avveiningen: docstringen begrunner fraværet av cache med «no stale
authority cache», og det er riktig når en skriving er en formell hendelse. Frekvensen
autolagring gir er en annen sak.

## S9 — Ingen CI, og en ruff-gjeld som bæres videre

**Dette sporet er verifisert, ikke en hypotese:** `.github/workflows/` finnes ikke.
Repoet har ingen CI overhodet. `docs/audit-utkast-serverlagring-2026-09-15.md` bekrefter
premisset — formatering «var før bare håndhevet av pre-commit-kroken, uten CI i repoet».
Den eneste automatikken er en lokal husky-hook som kjører prettier på staged
frontendfiler, og en hook kan hoppes over med `--no-verify`.

En app som skal i produksjon med 1278 tester som ingen kjører automatisk, er en app der
baselinen råtner. Vurder hva et minimum ser ut som.

Baselinen bærer også 16 ruff-feil, 10 `UP042` i `models/events.py` og én `I001` i
`app.py` som «eksisterende». Vurder om det er akseptabel gjeld eller en terskel som
gjør at nye feil drukner.

## S10 — `SUPABASE_SECRET_KEY` er en statisk nøkkel som omgår alt

Nøkkelen gir `service_role` og forbigår RLS fullstendig. Den som har den kan skrive om
`data` i `koe_events` — altså selve hendelsesloggen som er ment å være beviset i en
kontraktstvist.

`docs/arkitektur-diagrammer.md` viser Secret Manager som **ikke konfigurert** (stiplete
linjer), og sier at backend ikke er deployet.

Vurder: hvor ligger hemmelighetene i dag, hvordan roteres de, og hva er den minste
troverdige forbedringen før produksjon? Append-only er i dag en konvensjon håndhevet av
applikasjonskoden pluss én unikhetsskranke — det er ikke en teknisk garanti mot den som
har nøkkelen.

---

# Del 2: Modenhetssjekkliste

Bruk denne som en liste over **spørsmål til appen**, ikke som en plattformsammenligning.
Hver rad er noe et modent driftsoppsett gir uten at noen skriver det, og som denne appen
enten mangler eller løser selv. For hver: mangler den? Betyr det noe her? Hva er minste
troverdige tiltak?

| Kapabilitet | Status i appen, så vidt forrige økt fant |
| --- | --- |
| **Lesetilgangslogg** | Finnes ikke i noen form. Ingen vet hvem som åpnet motpartens sak |
| **Tilgang håndhevet ett sted** | Nei — notatfilteret er fire kallsteder, se S4 |
| **Verifisert restore** | Nei. `BH_APPROVAL_DB` har åpent punkt siden persistensauditen; nå ligger også vedlegg og utkast der |
| **Malware-skanning** | Nei, og det er ærlig merket i `lib/vedlegg_innhold.py`. Krever ekstern tjeneste |
| **Hemmelighetsforvaltning og rotasjon** | Ikke konfigurert, se S10 |
| **Delegering og fravær i godkjenning** | Nei — `docs/brev-og-godkjenning.md` sier Graph, dynamiske fullmaktsgrenser, delegering og fraværshåndtering ikke er koblet til. Hva skjer når en godkjenner er på ferie? |
| **Overvåking og varsling** | Ingen funnet. Hvem varsles når en leveranse feiler? |
| **Miljøskille og ALM** | Ingen staging nevnt, ingen CI, se S9 |
| **Rate limiting** | `limit_webhook` finnes på webhooken. Resten? |
| **Sesjon, CSRF, cookies** | **Sterkt.** Ikke bruk tid her uten konkret mistanke |
| **Optimistisk låsing** | **Sterkt.** `UNIQUE(sak_id, versjon)`, godt testet |
| **Serversidig fullmaktskontroll** | **Sterkt** etter AUD-07. `services/approval_authority.py` med `Decimal` |

De tre siste radene er tatt med med vilje: en gjennomgang som bare lister mangler gir et
skjevt bilde, og disse tre er reelt gode.

---

# Del 3: Der forrige økts arbeid er svakest

Hvis du vurderer konklusjonene fra `docs/vurdering-power-platform-2026-09-17.md` og
`docs/design-durable-inbox-outbox-2026-09-17.md`, er dette de svake punktene — rangert:

1. **Påstanden om at auditserien «konvergerer».** Begrunnelsen var at 14. september ga
   mange høye funn og 15. september stort sett middels og lave. **Den alternative
   forklaringen ble ikke utelukket:** at de senere auditene hadde snevrere omfang, ikke
   at det finnes færre feil. S1 i denne prompten peker i den retningen — en hel flate var
   aldri dekket. Sjekk omfangsavsnittene i hver logg.
2. **Anbefalingen om å ferdigstille framfor å bygge om** hviler på organisatoriske
   forhold ingen har opplyst: hvem som drifter, lisenskostnad for eksterne brukere,
   utviklerkapasitet etter lansering.
3. **Forholdstallet 0,38 mellom test- og produksjonskode** siteres som et tall for
   kodebasen. Egen måling: backend 50 315 produksjon / 19 564 test, frontend `src/`
   31 477 utenom tester. Tallet ser ut til å dekke bare backend. Kontroller hva det måler.
4. **Designvalget om én outbox-rad per hendelse** framfor én per delsteg. Begrunnet med
   AUD-06. Motargumentet — bedre parallellitet og retry-granularitet per operasjon — ble
   ikke vurdert grundig.
5. **Vedleggsbytes i databasen framfor blob**, begrunnet med et volumanslag som ikke er
   verifisert mot virkeligheten.

---

# Del 4: Arbeidsmåte

Etablert gjennom ti auditrunder, ikke forhandlingsbart:

- **Reproduser funn med en test som feiler først**, rett, verifiser. En hypotese er ikke
  et funn.
- **Hypoteser rapporteres aldri som bekreftede funn uten kodebevis eller reproduksjon.**
  Sporene i del 1 er hypoteser. Behandle dem deretter.
- **Si hva du sjekket og *avskrev*, ikke bare hva du fant.** En mistanke som ikke holdt
  skal stå i loggen med begrunnelse.
- **Alvorlighet angir mulig konsekvens under beskrevne forutsetninger**, ikke at noe er
  observert i produksjon.
- Norsk bokmål i all dokumentasjon og UI-tekst.
- **Ingen modellnavn i kode, kommentarer eller dokumentasjon** — kun i commit-trailer.
- Skriv `docs/audit-<område>-<dato>.md` med funn, hva som passerer, verifikasjon og
  gjenstående. Krysslenk fra forrige relevante auditlogg begge veier.
- Commit-konvensjon: norsk imperativ emnelinje uten prefikstaksonomi, brødtekst som
  forklarer *hvorfor* og hva som ble verifisert.

Nyttig spørsmål i dette repoet: **«hva er det bare testene som bruker?»** Det har
avdekket død kode to ganger.

Et annet: `tests/conftest.py` hadde på et tidspunkt slått av `require_csrf` globalt, slik
at dekoratøren var utestet i hele suiten mens den så beskyttet ut. **Sjekk om suiten
mocker bort noe annet som burde vært utøvd.**

---

# Del 5: Hva svaret skal inneholde

1. **S1 besvart først og eksplisitt.** Er OAuth-flaten en risiko, og skal den fjernes?
2. **Hvert spor S2–S10 med utfall**: bekreftet som svakhet, avskrevet, eller uavklart med
   begrunnelse. Fil og linje slik du fant dem.
3. **Nye svakheter du fant som ikke står her.** Sporene over er et utgangspunkt, ikke en
   uttømmende liste — forrige økt gjorde ingen systematisk sikkerhetsgjennomgang.
4. **Din prioritering:** hva må lukkes før produksjon, hva kan vente, hva er støy.
   Begrunn rekkefølgen med konsekvens, ikke med hvor lett det er å fikse.
5. **Hva du sjekket og avskrev.**
6. **Hva du ikke rakk eller ikke kunne verifisere**, eksplisitt.

Du har lov til å rette funn du er trygg på, etter repoets vanlige mønster: feilende test
først, så retting, så verifikasjon. Ikke rett noe du ikke har reprodusert.
