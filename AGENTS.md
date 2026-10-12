# Arbeidsinstruksjoner for agenter

Kontraktsadministrasjon etter NS 8407: formelle varsler mellom totalentreprenør og
byggherre, lagret som en hendelseslogg. Hendelsene har juridisk vekt — de avgjør om
et krav er bevart eller prekludert.

**Denne fila inneholder bare det som er stabilt.** Plan, funnstatus og
beslutninger står i `docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(hovedplanen), og bare der. Arbeid som pågår eller venter, står i GitHub-issues
(se «Hvor hva står»). Handoffene er historiske. Ikke før slikt inn hit — det blir
foreldet, og fila lastes automatisk og blir trodd. Regler for kode som skal
erstattes, står i `.claude/rules/` og sier når de slutter å gjelde.

## Språk

Norsk bokmål i brukergrensesnitt, kommentarer, dokumentasjon, PR-er,
commit-meldinger, testnavn og testbeskrivelser. Domenebegrepene er norske og
presise etter NS 8407 og vedtatt produktatferd. Samme begrep skal ha samme
betydning i kode, tester og dokumentasjon. Ikke oversett domenet bare for å
tilpasse det til en LLM. Tekst i grensesnittet har setningsstil («Send krav om
endring»), med TE, BH, EO og KOE i store bokstaver og mellomrom i «§ 33.8».

Egne funksjoner, klasser, variabler og regel- og feilkoder har norske navn:
`hent_saker`, ikke `fetch_cases`; `SAK_AVSLUTTET`, ikke `CASE_CLOSED`. Engelsk
brukes bare for navn utenfra (biblioteker, protokollfelt, eksterne API-er) og
etablerte tekniske begreper som `Request`, `retry` og `commit`. Python bruker
`snake_case`. TypeScript bruker `camelCase`, `PascalCase` for typer og
Svelte-komponenter, `STORE_BOKSTAVER` bare for koder og faste konstanter på
modulnivå, og union av strenger i stedet for `enum`. Data over grensen
(hendelsestyper, felt og verdier i journal, API og database) er `snake_case` med
små bokstaver. I kjernen skrives æ, ø og å som ae, oe og aa (`kanInngaaIEo`);
ellers følger du modulens skrivemåte uten å blande, og Python-koden omskrives
ikke. Commit-meldinger begynner med liten forbokstav og et verb i imperativ.

**Eksisterende navn er utgangspunkt, ikke fasit.** Forbedre upresise navn innenfor
oppgaven, og før gamle og nye navn i domenetabellen eller oppgavens
begrepsavklaring, ikke i en parallell ordliste. Skill navneendring fra endret
atferd, og oppdater kallere, tester og referanser samlet. Lagrede hendelsesnavn,
enumverdier, databasefelt og API-felt er kontrakter: vurder kompatibilitet og
migrering uttrykkelig. For KOE-, EO- og forseringssakene er det ingen
kompatibilitet å ta vare på (B-17): til TS skriver den første reelle hendelsen,
velges hendelsestyper, felt og verdier fra kontraktens begreper («svar», ikke
«respons»), med gamle og nye navn i [domenetabellen](docs/domenetabell/README.md).
Deretter er de kontrakter igjen.

**Koden skal være klar av seg selv — skriv få kommentarer.** Forklar en lokal
begrensning eller et overraskende valg kort, eller vis til en funn-ID i
hovedplanen (RV-07). Bruk docstring når kalleren trenger en kontrakt som
signaturen ikke uttrykker. Unngå kommentarer som gjentar koden, og aldri
endringshistorikk («her sto tidligere …») — den står i Git og PR-en.

Skriv korte, konkrete setninger. Skill mellom vedtatt, implementert og verifisert,
og mellom kontraktens ordlyd, vår tolkning og appens atferd.

## Domenet

| Begrep | Betydning |
| --- | --- |
| **TE** / **BH** | Totalentreprenør / byggherre. Kontraktens to sider |
| **sak** | Én endringssak, med en egen hendelsesstrøm |
| **spor** | `grunnlag` (ansvar), `vederlag` (penger), `frist` (tid). Går parallelt |
| **varsel** | Formell melding med frist. For sent varsel kan prekludere kravet |
| **forsering** | § 33.8. TE fremskynder arbeid etter avslått fristforlengelse |
| **endringsordre (EO)** | § 31.3. BH pålegger formelt en endring |
| **internt notat** | Kun synlig for forfatterens eget team |

**Kontraktsside (TE/BH) er ikke det samme som organisasjon.** Én side kan ha flere
Catenda-team — byggherren og en ekstern rådgiver er ulike organisasjoner på samme
side. Skjerming av interne notater og utkast går på **team**, ikke på side.

## Domenekjernen

**Kontrakten først, aldri status.** En regel i kjernen begrunnes i bestemmelsen i
NS 8407 eller vedtaket, utsagnet den gjelder (hvem sier hva om hva) og predikatet
som leses av utsagnene og relasjonene. Ingen regel leser status, «låst»,
«oppgjort» eller en annen oppsummering; status er en etikett i visningen. Et sendt
brev og en inngått enighet betyr det de sa da (MM-U3, MM-U9). Det kjernen leser,
må være lagret (DM-06). En hendelse den ikke forstår, gjør saken ikke forstått
(MM-U2). Det den ennå ikke kan, avvises og forenkles ikke. Appen avgjør ikke det
kontrakten overlater til partene, en oppmann eller domstolene. Begrepene står i
[modellforslaget, 2.2](docs/forslag-maalmodell-2026-10-09.md#22-byggeklossene),
som ikke er vedtatt i sin helhet, og i [domenetabellen](docs/domenetabell/README.md).

**TS eier KOE, endringsordre og forsering (B-17).** Kjernen ligger i `kjerne/`
(B-14) og er ren kode: den importerer ingenting utenfor mappa, ingen `pg` og
ingen server, og ingen regel når visningen eller bufferen. Arkitekturtesten i
`kjerne/tester/` håndhever det. Den håndhever også hva reglene leser: hvert felt
og hver importert verdi som er deklarert i kjernen, står i hvitelisten `LESBART`
med en klasse, som utsagn, relasjon, frosset eller predikat, og eventuelt de
modulene eller funksjonene som får lese det. En oppsummering har ingen klasse, så
et nytt felt eller en ny import med en oppsummering gir rød test til den er
klassifisert. Testen ser ikke alt, for eksempel ikke en status som en funksjon i
samme modul regner ut og returnerer; grensene står i modulheaderen i testen. Et
nytt felt reglene leser, klassifiseres der. Kjente avvik står i en lukket
liste med issuet som fjerner dem. Regelsettet står i `kjerne/regler/`; endres det, økes
`REGELVERSJON` der. Endres resten av kjernen, økes `PROJEKSJONSVERSJON` i
`kjerne/versjon.ts`. `kjerne/frosset/` bestemmer hva beslutningsgrunnlaget fryser, så
endres en fil der, økes begge. Regelversjonsvakten i CI krever det, men ikke for en
flytting som bare endrer importstiene. Lagringstestene mot
testbasen står i `sprakprove/kjernelagring/`. `sprakprove/` er prøvekode og ikke
en mal. Python-koden
for de tre sakstypene er overgangskode og rettes bare for sikkerhet og det som
hindrer test eller demo
([merknaden i 4.2](docs/plans/2026-09-16-godkjenning-og-varig-levering.md#python-feil-koe)).

## Miljø

```bash
cd backend && /tmp/venv/bin/python -m pytest -q
npm test && npm run check:error      # skal gi 0 errors
npx tsc -p kjerne/tsconfig.json      # svelte-check ser ikke kjerne/
npx tsc -p sprakprove/tsconfig.json  # eller sprakprove/
npx tsc -p server/tsconfig.json      # eller server/
ruff check backend/                  # porten, skal være 0
```

`npm run server` starter TS-serveren i `server/` (B-18), og vite-proxyen sender
`/api/kjerne` dit.

Testene er raske. Kjør dem ofte. I skyøktene lager `.claude/hooks/session-start.sh`
venv-en og testbasen, og meldingen fra hooken sier om databasetestene kjører.
Med `KOE_TESTBASE_URL` kjører `npm test` også TS-databasetestene. Kjør dem ikke
samtidig med pytest mot samme base: oppryddingen i pytest setter basen tilbake.
`node kjerne/tester/feilinnfoering.ts` kjører feilinnføringene for kjernen, i
parallelle kopier av treet med hver sin testbase. Én kjøring tar lang tid; start
den i bakgrunnen. Med `--ankre` kontrollerer den bare at teksten hver
feilinnføring bytter ut, finnes nøyaktig én gang, og at hvert mål er en del av
navnet på en test, lest med `vitest list`. Det tar sekunder, og
leveranseskillen sier når det kjøres. I CI fordeler workflowen `feilinnfoering.yml` dem på tre
jobber og kjører dem om natta når kjernen, lagringstestene eller
verktøykjeden er endret, ved manuell start og på PR-er med etiketten
`feilinnfoering`. Sett etiketten på en PR som rører kjernen, før merge.
Utenfor skyøktene: `python3 -m venv /tmp/venv` og `pip install -r` begge
`backend/requirements*.txt` (systempython mangler pytest).

**Nettleserkontroll av `/mockup` går gjennom skillen `mockup-nettleser`.** Kjør
aldri `npm i playwright` eller `playwright install`; skillen sier hvorfor.

**`npm run lint` håndhever prettier** for omfanget i `package.json` og
navnereglene i eslint for `kjerne/`, og `npm run format` skriver prettier.
Utenfor er JSON som et verktøy skriver (som `regler.json`), tsconfig-filene og
`docs/`: der ville prettier og verktøyet skrevet om hverandres form.

**`ruff format` er ikke en port.** Repoet er aldri formatert med den, og den ville
skrevet om en stor del av treet. Kjør den ikke på hele treet.

**Kjøretidstilstanden i basen avgjøres av katalogen, ikke av migrasjonsfilene,
og skjemaet endres bare gjennom en migrasjonsfil — aldri med DDL rett mot en
base eller et verktøy som stempler sin egen versjon.** Reglene står i
[`.claude/rules/database.md`](.claude/rules/database.md), som lastes for
`supabase/`, lagrene og TS-serveren; les den før du endrer en base.

## Sikkerhetsinvarianter

Brytes en av disse, er det en sikkerhetsfeil uansett hvor liten endringen så ut.
De gjelder hver serverinngang, i Python og i TS. Mekanismene, og det TS-stien
ennå mangler, står i [`.claude/rules/tilgang.md`](.claude/rules/tilgang.md).

- **Hver serverinngang krever innlogget sesjon og tilgang til prosjektet, og
  eventuelt kontraktsrolle.** En inngang uten sesjon eller uten prosjekt står i
  et register med skriftlig begrunnelse, og en test skal feile for en inngang som
  verken har kontrollen eller står der. Kontraktsrollen dekkes ikke av en slik
  test.
- **CSRF håndheves inne i autentiseringen**, bevisst, slik at en ny
  mutasjonsinngang ikke kan glemme den. Ikke flytt den ut.
- **`aktor_id`, `aktor_rolle`, `aktor_team_id`, `tidsstempel` og `event_id` settes
  av serveren.** `event_id` og `tidsstempel` fra klienten avvises; aktørfeltene
  overskrives før parsing, så det klienten sendte, når aldri modellen. Stol
  aldri på en rolle eller en identitet klienten oppgir.
- **Journalen bærer `aktor_id`, aldri et personnavn — og bare én form.**
  Verdien er `app_users.id`, punktum, også for en Catenda-forfatter. Hver vei
  inn, også webhooken, løser identiteten gjennom `koe_resolve_identity`, som
  innloggingen og medlemssynkroniseringen, med samme issuer og samme normaliserte
  subjekt; ellers får samme person to brukerrader. Lar identiteten seg ikke
  avgjøre, skrives ingen hendelse — fail-closed, som for kontraktssiden. Navnet
  slås opp ved visning, og et oppslag som feiler, skal falle tilbake til
  identiteten og aldri velte tidslinjen eller brevet. En hendelse er
  append-only, så en andre verdiform kan aldri rettes igjen.
- **Interne notater og utkast er fail-closed.** Uten entydig team finnes det ikke noe
  å lese eller skrive. Et notat uten `aktor_team_id` vises til ingen, heller ikke
  forfatteren. Notatet ligger i `notat`, ikke i journalen (MS-05): det er ikke
  et kontraktsvarsel, det flytter ikke sakens versjon, og det kan slettes.
  Tidslinjen fletter de to kildene ved lesing, så skjermingsfilteret gjelder
  fortsatt begge.
- **Prosjektgrensen må håndheves ved hvert lesepunkt**, også for saker det refereres
  til. Klientoppgitte relasjoner skal ikke utvide tilgangen. Dette er brutt flere
  ganger; se RV-07 og AUT-01/02 i hovedplanens funnregister.
- **Det finnes ikke noe defaultprosjekt.** Mangler `X-Project-ID`, er prosjektet
  *ukjent* — ikke `oslobygg` — og kallere skal behandle det som «ingen
  tilgang». `prosjekt_id` er `NOT NULL` uten default på
  `hendelse` og `sak_relations`, og skrivestiene stempler det fra autorisert
  kontekst. Gjeninnfører du en fallback — også som et uskyldig
  `prosjekt_id or "oslobygg"` i én sammenlikning, eller som et tomt filter som
  «betyr alle» — blir attribusjonen uetterprøvbar igjen, og det lar seg ikke rette
  i ettertid når ekte saker først finnes.

## Resonneringsregler

Disse er årsaken til de fleste feilklassifiserte funnene i auditserien.

**Les [testinstruksjonene](.claude/rules/tester.md) før du skriver
domeneforventninger, bevis-saker eller metodeprøver**, også i `docs/`.

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
kallet fra frontenden, med rute, metode og nyttelast, gjennom tilgangskontrollen
til lageret, og kjør det uten `DISABLE_AUTH`.

**Og ett av lagene er databasen.** Ti funksjoner bor i `public` —
`koe_resolve_identity`, `koe_reconcile_memberships`,
`auto_create_project_membership` og flere. De er en del av applikasjonen, og et
søk i Python- og TS-koden finner dem ikke. Tabellen `app_identities` leses og
skrives **ikke av noen Python-kode**, og er likevel bærende: den leses og skrives
ved hver innlogging, fra en databasefunksjon. En runde konkluderte med at den var
ubrukt. Søk også i `supabase/migrations/`, og spør katalogen i testbasen —
`pg_proc`, `pg_trigger`, `pg_policy` — før du skriver at noe ikke er i bruk. En
trigger kan også være den egentlige skriveren: `project_memberships` fylles av en
trigger, mens koden som ser ut til å skrive den, treffer en unik-skranke og
logger en advarsel hver gang.

**Og spør hvem *andre* som kaller funksjonen, ikke bare om den kalles.** MG-02
slo fast at det krevdes en produktbeslutning for å la en webhook opprette
brukerrader — fordi runden fant at innloggingen kaller `koe_resolve_identity`,
men ikke at `koe_reconcile_memberships` kaller den for hvert prosjektmedlem ved
hver synkronisering. Systemet gjorde det allerede: fjorten brukere, fjorten
identiteter, én sesjon.

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
Det holder bare hvis hvert ledd viser til det forrige i stedet for å gjengi det.
Matrisen og domenetabellen viser til vedtaks-ID-en, en bevis-sak viser til raden
og en PR viser til issuet og vedtaket. Ingen av dem skriver vedtaket om med egne
ord.

| Hva | Hvor |
| --- | --- |
| Funnstatus og alvorlighet, beslutninger, rekkefølgen på arbeidspakkene, og det som er levert, med dato og belegg | Hovedplanen |
| Invarianter og regler som står seg | Denne fila |
| Beviset: auditer, design, reviewer, oppdrag, og gjennomføringsnotater ved særskilt behov eller bestilling | `docs/`, i formen [`.claude/rules/dokumentasjon.md`](.claude/rules/dokumentasjon.md) beskriver |
| Regler som bare gjelder én del av treet: databasen, testene, tilgangen, Python-domenet, `docs/` | `.claude/rules/`, som lastes når du arbeider der |
| Leveranseprosedyren: akseptkriterier, eierskap, utfasing og bevis før en PR er klar | [Leveranseskillen](.claude/skills/leveranse/SKILL.md). PR- og oppgavemalene i `.github/` samler beviset, men eier ingen regler |
| Datamodellen: hver tabell, hendelsestype og relasjon, hvem som skriver, og hvilke kall til Catenda som leser eller skriver | Kilderegistrene `tabeller.toml`, `hendelser.toml`, `kjernehendelser.toml` (typene TS-kjernen skriver), `relasjoner.toml` og `dataflyt.toml` i `docs/datamodell/`, med skjemaet i `katalog.json`. Markdown og Excel lages av `docs/verktoy/datamodell.py`. Vakttester feiler når et register mangler en tabell, en type, en fremmednøkkel eller et kall, eller avviker fra koden eller migrasjonene |
| Arbeid som pågår eller venter: hva, hvem, hvilken PR, hva det venter på | GitHub-issues, samlet i én milepæl per arbeidspakke |

- **Hovedplanen er autoritativ for funnstatus.** Sier et annet dokument noe annet,
  er det andre foreldet — rett det, ikke gjenopprett diskusjonen.
- **Et issue viser til ID-en, ikke til vurderingen.** Skriv funn- eller
  beslutnings-ID-en og lenk til hovedplanen. Gjenta ikke alvorlighet, belegg
  eller begrunnelse; da har de to hjem.
- **En PR som fullfører et issue, har `Closes #n` i beskrivelsen.** Endrer PR-en
  funnstatus eller en beslutning, får hovedplanen en datert merknad i samme PR.
  Planen får én merknad når et punkt i en arbeidspakke er levert, ikke én per
  PR; framdriften står i issuene. I en orkestrert runde fører orkestratoren
  vedtakene og merknadene i egne små PR-er, slik
  [orkestreringsskillen](.claude/skills/orkestrering/SKILL.md) sier.
- **Skriv ikke arbeidsstatus i hovedplanen eller `docs/README.md`**: «neste
  oppgave», «pågår», «venter på», «merges etter #45». Det hører til i issuet.
- **Oppfølging som ikke løses i samme PR, blir et issue.** Fra review og
  code-review får det etiketten `review-oppfølging`. Venter det på en B-ID, får
  det `venter-på-beslutning`. Det gjelder også feil du oppdager underveis
  utenfor oppdraget. Å nevne dem i PR-beskrivelsen er ikke nok. Tilskriver du
  en feil testmiljøet, er det en påstand. Kontroller den, eller meld den.
- **Hvert issue har en milepæl eller en sporetikett.** Milepælen er
  arbeidspakken i hovedplanen; de parallelle sporene har `spor-d`, `spor-h`,
  `spor-m` eller `papercut` i stedet. Venter et issue på rekkefølgen i AF-06,
  får det `venter-på-rekkefølge`, som fjernes når hovedplanen har en datert
  merknad om unntak. Et issue som samler grunnlaget for en B-ID, får `beslutning`.
  Innenfor en milepæl kan etiketter dele pakken i deler, som `byggedel-1` til
  `byggedel-4` og `ts-stien` i FK. Beskrivelsen av etiketten sier hva den dekker.
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
åpner fila direkte. En PR som ikke har gått gjennom den, er ikke klar.
Bruk [PR-malen](.github/pull_request_template.md), også ved opprettelse via
CLI eller API. Arkitekturoppgaver kan bruke
[oppgavemalen](.github/ISSUE_TEMPLATE/arkitekturendring.md); eksisterende
issues suppleres i stedet for å dupliseres.

**Uavhengig review før en PR meldes klar er `/code-review` på egen diff**, på
nivå `high` når diffen rører serverinngangene, tilgang, CSRF, lagring, journalen
eller migrasjonene, uansett språk, ellers `medium`; en diff som bare rører
`docs/`, trenger ingen. Endrer diffen utledningen eller reglene i domenet, kommer i
tillegg en review av samspillet mellom reglene, i ny kontekst og med reglene og
bevis-sakene samlet. Rett funnene; et funn du avviser, står med begrunnelse
under «Åpne spørsmål» i PR-beskrivelsen. `/simplify` kjøres når oppdragsgiver
ber om det eller godkjenner orkestratorens forslag, og da før `/code-review`,
slik at reviewet ser den endelige koden.

**Grensene for kontekst i
[orkestreringsskillen](.claude/skills/orkestrering/SKILL.md#kontekst-i-arbeidsøktene)
gjelder alle skyøkter**, også en direkte økt som ikke er orkestrert
(oppdragsgiver 12.10, #425).

**Oppdragsgiver vil ha spørsmål, ikke dokumenter å lese.** Kartlegg selv. Der
noe bare oppdragsgiver kan avgjøre, still konkrete spørsmål med
spørsmålsverktøyet (i Claude Code: `AskUserQuestion`), med alternativer og en
anbefaling. Det gjelder tiltenkt atferd, NS 8407, prioritering og hva som skal
gå til andre. Be ikke om gjennomlesing for å finne ut hva oppdragsgiver mener.
Det som kan avgjøres ved å lese koden eller spørre katalogen, avgjør du selv.
Svarene føres inn der de hører hjemme: vedtak i hovedplanen, arbeidsvalg i
issuet eller oppdraget.
