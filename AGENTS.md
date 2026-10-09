# Arbeidsinstruksjoner for agenter

Kontraktsadministrasjon etter NS 8407: formelle varsler mellom totalentreprenør og
byggherre, lagret som en hendelseslogg. Hendelsene har juridisk vekt — de avgjør om
et krav er bevart eller prekludert.

**Denne fila inneholder bare det som er stabilt.** Plan, funnstatus og
beslutninger står i `docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(hovedplanen), og bare der. Arbeid som pågår eller venter, står i GitHub-issues
(se «Hvor hva står»). Handoffene er historiske. Ikke før slikt inn hit — det blir
foreldet, og fila lastes automatisk og blir trodd.

## Språk

Norsk bokmål i brukergrensesnitt, kommentarer, dokumentasjon, PR-er,
commit-meldinger, testnavn og testbeskrivelser. Domenebegrepene er norske og
presise etter NS 8407 og vedtatt produktatferd. Samme begrep skal ha samme
betydning i kode, tester og dokumentasjon. Ikke oversett domenet bare for å
tilpasse det til en LLM.

Egne funksjoner, klasser og variabler har norske navn: `hent_saker`, ikke
`fetch_cases`. Det gjelder også tekniske hjelpenavn. Engelsk brukes bare der
navnet kommer utenfra eller er et etablert teknisk begrep: navn i biblioteker, protokollfelt, eksterne
API-er og ord som `Request`, `retry` og `commit`. Bruk `snake_case` i Python,
`camelCase` i TypeScript og `PascalCase` for typer der rammeverket ikke bestemmer
annet. For norske tegn i identifikatorer: følg konvensjonen i den berørte
modulen; ikke bland skrivemåter.
Commit-meldinger begynner med liten forbokstav og et verb i imperativ.

**Eksisterende navn er utgangspunkt, ikke fasit.** Forbedre upresise eller
tvetydige navn innenfor oppgaven, særlig når en modul bygges om. Avklar betydning,
foretrukket navn og hvilke gamle navn det erstatter i oppgavens domenetabell
eller begrepsavklaring. Ikke opprett en parallell ordliste. Skill navneendring fra
endret atferd; uavklart domenesemantikk avgjøres etter arbeidsformen nedenfor.
Oppdater berørte kallere, tester og referanser samlet. Lagrede hendelsesnavn,
enumverdier, databasefelt og API-felt er kontrakter: vurder kompatibilitet og
migrering uttrykkelig, også ved en backend-omskriving.

**Koden skal være klar av seg selv — skriv få kommentarer.** Forklar en lokal
begrensning eller et overraskende valg kort ved koden når det hjelper neste
endring. En funn-ID å slå opp i hovedplanen (RV-07, SK-02) er også en berettiget
kommentar. Bruk docstring når kalleren trenger en kontrakt som signaturen ikke
uttrykker. Lengre forklaringer som brukes på tvers av moduler, hører hjemme i en
eksisterende referanse i `docs/`. Ikke opprett et dokument bare fordi koden er
komplisert; vurder først om koden kan forenkles. Unngå kommentarer som gjentar
koden, og aldri endringshistorikk («her sto tidligere …») — den står i Git og
PR-en.

Skriv korte, konkrete setninger. Skill mellom vedtatt, implementert og verifisert,
og mellom kontraktens ordlyd, vår tolkning og appens atferd.

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

**Nytt innhold i en hendelse hører hjemme i datamodellen.** Har hendelsen en
datamodell, lagrer `to_cloudevent` bare `data`. Et felt ved siden av `data`
forsvinner ved lagring, men projeksjonen kan lese det i minnet, så svaret og
cachen viser noe journalen ikke har. Har den ingen datamodell, som
`sak_opprettet`, lagres en `data` fra klienten slik den kom, fordi `SakEvent`
godtar ukjente felt (DM-06). `docs/datamodell/hendelser.md` lister
toppnivåfeltene som ikke lagres.

## Miljø

```bash
cd backend && /tmp/venv/bin/python -m pytest -q
npm test && npm run check:error      # skal gi 0 errors
npx tsc -p sprakprove/tsconfig.json  # svelte-check ser ikke sprakprove/
ruff check backend/                  # porten, skal være 0
```

Testene er raske. Kjør dem ofte. I skyøktene lager `.claude/hooks/session-start.sh`
venv-en og testbasen, og meldingen fra hooken sier om databasetestene kjører.
Med `KOE_TESTBASE_URL` kjører `npm test` også TS-databasetestene i `sprakprove/`.
Kjør dem ikke samtidig med pytest mot samme base: oppryddingen i pytest setter
basen tilbake.
Utenfor skyøktene: `python3 -m venv /tmp/venv` og `pip install -r` begge
`backend/requirements*.txt` (systempython mangler pytest).

**Nettleserkontroll av `/mockup` går gjennom skillen `mockup-nettleser`.** Den
bruker den globale playwright-pakken, som passer med nettleserne i
`/opt/pw-browsers`. Kjør aldri `npm i playwright` eller `playwright install`.

**`npm run lint` håndhever prettier for koden** i `src/`, `sprakprove/`, `scripts/`
og konfigurasjonsfilene i roten; `npm run format` skriver den. JSON som et verktøy
skriver (`regler.json`, `package-lock.json`), tsconfig-filene og `docs/` er utenfor:
der ville prettier og verktøyet skrevet om hverandres form.

**`ruff format` er ikke en port.** Repoet er aldri formatert med den, og
`ruff format .` ville skrevet om rundt 80 filer. Kjør den ikke på hele treet.

**Kjøretidstilstanden i basen avgjøres av katalogen, ikke av migrasjonsfilene,
og endringer i basen går gjennom en migrasjonsfil og `supabase db push` — aldri
`apply_migration` over Supabase-MCP.** Reglene står i
[`.claude/rules/database.md`](.claude/rules/database.md). De lastes når du
arbeider i `supabase/` eller lagrene; les dem før du endrer basen over MCP.

## Sikkerhetsinvarianter

Brytes en av disse, er det en sikkerhetsfeil uansett hvor liten endringen så ut.

- **Enhver rute har `require_auth` + `require_project_access` + eventuelt
  `require_contract_role`.** `tests/test_security/test_public_route_registry.py`
  håndhever de to første: en rute uten `require_auth` må stå i
  `OFFENTLIGE_RUTER`, og en autentisert rute uten `require_project_access` i
  `UTEN_PROSJEKT`, begge med skriftlig begrunnelse. Legger du til en rute,
  forvent å måtte begrunne den der. Dekoratørene teller bare under
  rutedekoratøren, og en rute testen ikke kan lese ut av `routes/`, gir rød
  test mot `app.url_map`. `require_contract_role` kontrolleres ikke.
- **CSRF håndheves inne i `require_auth`** (`lib/auth/session.py`), bevisst, slik at
  en ny mutasjonsrute ikke kan glemme den. Ikke flytt den ut.
- **`aktor_id`, `aktor_rolle`, `aktor_team_id`, `tidsstempel` og `event_id` settes
  av serveren.** `event_id` og `tidsstempel` avvises av
  `parse_event_from_request`; de tre aktørfeltene overskrives i ruta før
  parsing, så det klienten sendte, når aldri modellen. Stol aldri på en rolle
  eller en identitet klienten oppgir.
- **Journalen bærer `aktor_id`, aldri et personnavn — og bare én form.**
  Verdien er `app_users.id`, punktum. Også for en Catenda-forfatter: webhookstien
  løser identiteten gjennom `koe_resolve_identity`, samme databasefunksjon som
  innloggingen og medlemssynkroniseringen bruker, med samme issuer
  (`CatendaOAuth.BASE`) og samme normaliserte subjekt (`catenda_id()`). Én annen
  issuer eller et unormalisert subjekt gir samme person to brukerrader.
  Lar identiteten seg ikke avgjøre, skrives ingen hendelse — fail-closed, som for
  kontraktssiden. Navnet slås opp ved visning i `lib/aktor_navn.py`, og et oppslag
  som feiler skal falle tilbake til identiteten — aldri velte tidslinjen eller
  brevet. En hendelse er append-only: en verdi som kommer inn her, kan ikke
  rettes igjen, og det er derfor en andre verdiform er dyr.
- **Interne notater og utkast er fail-closed.** Uten entydig team finnes det ikke noe
  å lese eller skrive. Et notat uten `aktor_team_id` vises til ingen, heller ikke
  forfatteren. Notatet ligger i `notat`, ikke i journalen (MS-05): det er ikke
  et kontraktsvarsel, det flytter ikke sakens versjon, og det kan slettes.
  Tidslinjen fletter de to kildene ved lesing, så skjermingsfilteret i
  `lib/auth/event_visibility.py` gjelder fortsatt begge.
- **Prosjektgrensen må håndheves ved hvert lesepunkt**, også for saker det refereres
  til. Klientoppgitte relasjoner skal ikke utvide tilgangen — bruk
  `cases_in_project`. Dette er brutt flere ganger; se RV-07 og AUT-01/02 i
  hovedplanens funnregister.
- **Det finnes ikke noe defaultprosjekt.** Mangler `X-Project-ID`, er prosjektet
  *ukjent* — ikke `oslobygg`. `get_project_id()` returnerer `None`, og kallere skal
  behandle det som «ingen tilgang». `prosjekt_id` er `NOT NULL` uten default på
  `hendelse` og `sak_relations`, og skrivestiene stempler det fra autorisert
  kontekst. Gjeninnfører du en fallback — også som et uskyldig
  `prosjekt_id or "oslobygg"` i én sammenlikning, eller som et tomt filter som
  «betyr alle» — blir attribusjonen uetterprøvbar igjen, og det lar seg ikke rette
  i ettertid når ekte saker først finnes.

## Resonneringsregler

Disse er årsaken til de fleste feilklassifiserte funnene i auditserien.

**Les [testinstruksjonene](.claude/rules/tester.md) før domenetabeller,
bevis-saker og metodeprøver**, også når arbeidet bare ligger i `docs/`.
De angir kravene til forventningsgrunnlag og grensene for hva testene beviser.

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

**Et skjermbilde som finnes, beviser ikke at flyten virker.** DM-05 ble funnet
ved å følge kallet skjemaet for ny sak faktisk gjør, gjennom
tilgangsdekoratøren. Skjemaet og ruta lest hver for seg viste ingenting. Følg
kallet fra frontenden, med rute, metode og nyttelast, gjennom dekoratørene til
lageret, og kjør det uten `DISABLE_AUTH`.

**Og ett av lagene ligger ikke i repoet i det hele tatt.** Ti funksjoner bor i
`public` — `koe_resolve_identity`, `koe_reconcile_memberships`,
`auto_create_project_membership` og flere. De er en del av applikasjonen, og et
kodesøk finner dem aldri. Tabellen `app_identities` leses og skrives **ikke av
noen Python-kode**, og er likevel bærende: den leses og skrives ved hver
innlogging, fra en databasefunksjon. En runde konkluderte med at den var ubrukt.
Spør katalogen — `pg_proc`, `pg_trigger`, `pg_policy` — før du skriver at noe ikke
er i bruk. En trigger kan også være den egentlige skriveren: `project_memberships`
fylles av en trigger, mens koden som ser ut til å skrive den, treffer en
unik-skranke og logger en advarsel hver gang.

**Og spør hvem *andre* som kaller funksjonen, ikke bare om den kalles.** MG-02
slo fast at det krevdes en produktbeslutning for å la en webhook opprette
brukerrader — fordi runden fant at innloggingen kaller `koe_resolve_identity`,
men ikke at `koe_reconcile_memberships` kaller den for hvert prosjektmedlem ved
hver synkronisering. Systemet gjorde det allerede: fjorten brukere, fjorten
identiteter, én sesjon. En funksjon som kalles fra en annen databasefunksjon,
finnes ikke i noe kodesøk.

**Har du funnet ett tilfelle, har du ikke funnet alle.** Søket formes av det du
allerede fant, så tellingen vokser i runder — og hver runde melder seg ferdig.
Oslobygg-fallbackene gikk tre → fem → åtte → fjorten, hver gang fordi neste
gjennomgang lette etter den formen forrige gjennomgang hadde funnet. Den samme
defaultverdien gjemmer seg i minst seks former: `x or "verdi"`,
`getattr(obj, "x", "verdi")`, `d.get("x", "verdi")`,
`request.headers.get("X", "verdi")`, et defaultargument i Python eller
TypeScript, og en `DEFAULT` i databasen. Søk etter alle formene før du skriver
«alle er fjernet» — og skriv heller hvilke former du søkte etter.

## Hvor hva står

**Hver opplysning har ett hjem.** Sier to steder det samme, glir de fra hverandre.

| Hva | Hvor |
| --- | --- |
| Funnstatus og alvorlighet, beslutninger, rekkefølgen på arbeidspakkene, og det som er levert, med dato og belegg | Hovedplanen |
| Invarianter og regler som står seg | Denne fila |
| Beviset: auditer, design, reviewer, oppdrag, og gjennomføringsnotater ved særskilt behov eller bestilling | `docs/`, i formen [`.claude/rules/dokumentasjon.md`](.claude/rules/dokumentasjon.md) beskriver |
| Regler som bare gjelder én del av treet: databasen, testene, `docs/` | `.claude/rules/`, som lastes når du arbeider der |
| Leveranseprosedyren: akseptkriterier, eierskap, utfasing og bevis før en PR er klar | [Leveranseskillen](.claude/skills/leveranse/SKILL.md). PR- og oppgavemalene i `.github/` samler beviset, men eier ingen regler |
| Hva hver tabell er, hvem som skriver den, og hvor dataene kommer fra | `docs/datamodell/tabeller.toml`. Excel-fila og `tabeller.md` lages av `docs/verktoy/datamodell.py`, og en test feiler når en tabell mangler |
| Hva hver hendelsestype er, hvem som sender den, bestemmelsen i NS 8407 og hva den gjør med status | `docs/datamodell/hendelser.toml`. Feltene i `data` hentes fra modellene. `hendelser.md` og arkene i Excel-fila lages av samme verktøy, og en test feiler når en type mangler eller katalogen avviker fra koden |
| Hvordan tabellene henger sammen, og hvilke kall til Catenda som leser eller skriver dem | `docs/datamodell/relasjoner.toml` og `dataflyt.toml`, med skjemaet i `katalog.json`. `relasjoner.md` lages av samme verktøy. En test feiler når en fremmednøkkel eller et kall til Catenda mangler, og når `katalog.json` avviker fra en base bygget fra migrasjonene |
| Arbeid som pågår eller venter: hva, hvem, hvilken PR, hva det venter på | GitHub-issues, samlet i én milepæl per arbeidspakke |

- **Hovedplanen er autoritativ for funnstatus.** Sier et annet dokument noe annet,
  er det andre foreldet — rett det, ikke gjenopprett diskusjonen.
- **Et issue viser til ID-en, ikke til vurderingen.** Skriv funn- eller
  beslutnings-ID-en og lenk til hovedplanen. Gjenta ikke alvorlighet, belegg
  eller begrunnelse; da har de to hjem.
- **En PR som fullfører et issue, har `Closes #n` i beskrivelsen.** Endrer PR-en
  funnstatus eller en beslutning, får hovedplanen en datert merknad i samme PR.
  Framdrift innen en arbeidspakke står i issuene; planen får én merknad når et
  punkt i pakken er levert, ikke én per PR. Parallelle PR-er som alle skriver
  under samme pakke, gir konflikter.
- **Skriv ikke arbeidsstatus i hovedplanen eller `docs/README.md`**: «neste
  oppgave», «pågår», «venter på», «merges etter #45». Det hører til i issuet.
  Slik status i planen ga konflikter i nesten hver PR 23.09.
- **Oppfølging som ikke løses i samme PR, blir et issue.** Fra review og
  code-review får det etiketten `review-oppfølging`. Venter det på en B-ID, får
  det `venter-på-beslutning`. Det gjelder også feil du oppdager underveis
  utenfor oppdraget. Å nevne dem i PR-beskrivelsen er ikke nok. Tilskriver du
  en feil testmiljøet, er det en påstand. Kontroller den, eller meld den.
- **Hvert issue har en milepæl eller en sporetikett.** Milepælen er
  arbeidspakken (F0b, F1 …) eller «Opprydding etter AF-06»; de parallelle
  sporene har `spor-d`, `spor-h` og `spor-m` i stedet. Venter et issue på
  rekkefølgen i AF-06, får det `venter-på-rekkefølge`. Etiketten fjernes når
  hovedplanen har en datert merknad om unntak; unntaket står i planen, ikke i
  issuet. Et issue som samler grunnlaget for en B-ID, får `beslutning`.
- **Det som sinker arbeidet, blir et issue med etiketten `papercut`**: et verktøy
  som feiler, et oppsett som må gjøres for hånd, en test som henger. Skriv
  symptom og løsning eller omvei. Feiler noe uforklarlig, søk i `papercut`-issuene
  først, og kommenter et som finnes framfor å lage et nytt. `papercut` teller som
  sporetikett.
- **Issues er like offentlige som repoet.** Ingen saksdata, kontraktsinnhold,
  personnavn fra prosjekter, nøkler eller tilgangsopplysninger.
- Det som gjenstår i en pakke, er de åpne issuene i milepælen — med GitHub-MCP
  eller `gh api "repos/khjohns/endringsmeldinger/issues?milestone=<nummer>&state=open"`.
  `gh issue`, `gh pr` og `gh label` går over GraphQL, som gir 403 i skyøktene;
  bruk REST-formen med `gh api`.

## Arbeidsform

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet i dokumentene angir
mulig konsekvens under beskrevne forutsetninger, ikke observert hendelse.

Ingen produksjonskode endres uten at det er bedt om det. Auditrunder leverer
dokumenter og reproduksjonstester, ikke rettinger.

**Les og følg [leveranseskillen](.claude/skills/leveranse/SKILL.md) to ganger:
før kode endres i en implementerings- eller refaktoreringsoppgave, og igjen før
en PR meldes klar.** I Claude Code heter skillen `leveranse`. Andre agenter
åpner fila direkte. Skillen angir akseptkriterier, eierskap, utfasing, når en
endring er vesentlig, og hvilket bevis som kreves. En PR som ikke har gått
gjennom den, er ikke klar.
Bruk [PR-malen](.github/pull_request_template.md), også ved opprettelse via
CLI eller API. Arkitekturoppgaver kan bruke
[oppgavemalen](.github/ISSUE_TEMPLATE/arkitekturendring.md); eksisterende
issues suppleres i stedet for å dupliseres. Vedtak og arbeidsrekkefølge
står fortsatt bare i hovedplanen.

**Kjør `/code-review` på egen diff før en PR meldes klar.** Nivå `high` når
diffen rører `routes/`, `lib/auth/`, lagrene eller migrasjonene, ellers
`medium`; en diff som bare rører `docs/`, trenger ingen. Reviewet går i egen
kontekst, så det ser diffen uten forfatterens antakelser. Rett funnene; et
funn du avviser, står med begrunnelse under «Åpne spørsmål» i PR-beskrivelsen.
`/simplify` kjøres bare når oppdragsgiver ber om det.

**Oppdragsgiver vil ha spørsmål, ikke dokumenter å lese.** Kartlegg selv. Der
noe bare oppdragsgiver kan avgjøre, still konkrete spørsmål med
spørsmålsverktøyet (i Claude Code: `AskUserQuestion`), med alternativer og en
anbefaling. Det gjelder tiltenkt atferd, NS 8407, prioritering og hva som skal
gå til andre. Be ikke om gjennomlesing for å finne ut hva oppdragsgiver mener.
Det som kan avgjøres ved å lese koden eller spørre katalogen, avgjør du selv.
Svarene føres inn der de hører hjemme: vedtak i hovedplanen, arbeidsvalg i
issuet eller oppdraget.
