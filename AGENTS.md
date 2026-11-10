# Arbeidsinstruksjoner for agenter

Kontraktsadministrasjon etter NS 8407: formelle varsler mellom totalentreprenør og
byggherre, lagret som en hendelseslogg. Hendelsene har juridisk vekt — de avgjør om
et krav er bevart eller prekludert.

**Denne fila inneholder bare det som er stabilt.** Plan, funnstatus og
beslutninger står i `docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(hovedplanen), vedtakene i `docs/plans/vedtak.md` (vedtaksfila) og de avsluttede
funnene og eldre leveransemerknader i `docs/plans/arkiv.md` (arkivet), og bare der. Arbeid som pågår eller venter, står i GitHub-issues
(se «Hvor hva står»). Handoffene er historiske. Ikke før slikt inn hit — det blir
foreldet, og fila lastes automatisk og blir trodd. Regler for kode som skal
erstattes, står i `.claude/rules/` og sier når de slutter å gjelde.

## Språk

Norsk bokmål i brukergrensesnitt, kommentarer, dokumentasjon, PR-er,
commit-meldinger, testnavn og testbeskrivelser. Domenebegrepene er norske og
presise etter NS 8407 og vedtatt produktatferd. Samme begrep skal ha samme
betydning i kode, tester og dokumentasjon. Ikke oversett domenet bare for å
tilpasse det til en LLM. Tekst i grensesnittet har setningsstil («Send til
byggherren»). **All synlig tekst i visningen og brevene følger
[språkfila](docs/sprak.md)**: klarspråk, og ordene i brevene og skjemaene. Der står
blant annet at partene skrives fullt ut, og hvordan en bestemmelse i NS 8407 vises.
Les den før du skriver eller endrer synlig tekst.

**Tilpass betegnelsen til teksten.** I vedtak og produktbeskrivelser brukes normalt
«løsningen». I tekniske beskrivelser navngis den aktuelle delen, for eksempel kjernen,
visningen eller registreringen. I brukerrettet tekst foretrekkes konkrete beskrivelser
av handlingen. Partenes brev omtaler normalt partene, handlingene og dokumentene, ikke
programvaren. Ikke endre sitater, lagrede navn eller vedtatt brevtekst som en ren
språkretting. Begrunnelsen og eksemplene står i
[språkfila](docs/sprak.md#hva-løsningen-kalles).

Egne funksjoner, klasser, variabler og regel- og feilkoder har norske navn:
`hent_saker`, ikke `fetch_cases`; `SAK_AVSLUTTET`, ikke `CASE_CLOSED`. Engelsk
brukes bare for navn utenfra (biblioteker, protokollfelt, eksterne API-er) og
etablerte tekniske begreper som `Request`, `retry` og `commit`. Python i
verktøyene bruker `snake_case`. TypeScript bruker `camelCase`, `PascalCase` for typer og
Svelte-komponenter, `STORE_BOKSTAVER` bare for koder og faste konstanter på
modulnivå, og union av strenger i stedet for `enum`. Data over grensen
(hendelsestyper, felt og verdier i journal, API og database) er `snake_case` med
små bokstaver. I kjernen skrives æ, ø og å som ae, oe og aa (`kanInngaaIEo`);
ellers følger du modulens skrivemåte uten å blande. Commit-meldinger begynner med liten forbokstav og et verb i imperativ.

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
Gjengi ikke et vedtak, en bestilling eller en kontrakt med egne ord i en kommentar.
Skriv ID-en, så står teksten ett sted.

**Skriv etter hva teksten gjør.** Samme regel for kommentarer, testnavn,
forventninger og feilmeldinger:

- en kommentar beskriver hva koden gjør, og viser til vedtaket;
- et testnavn beskriver tilfellet og virkningen, og ID-en kan fortsatt stå i navnet
  (feilinnføringene finner testene sine på navnet, #432);
- en forventning har en uttrykkelig kilde;
- en feilmelding sier hva som hindrer, ikke den generelle regelen.

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
NS 8407, vedtaket eller beslutningen, utsagnet den gjelder (hvem sier hva om hva) og predikatet
som leses av utsagnene og relasjonene. Ingen regel leser status, «låst»,
«oppgjort» eller en annen oppsummering; status er en etikett i visningen. Et sendt
brev og en inngått enighet betyr det de sa da (MM-U3 (opphevet av MM-U50), MM-U9). Det kjernen leser,
må være lagret (DM-06). En hendelse den ikke forstår, gjør saken ikke forstått
(MM-U2). Det den ennå ikke kan, avvises og forenkles ikke. Appen avgjør ikke det
kontrakten overlater til partene, en oppmann eller domstolene. Begrepene står i
[modellforslaget, 2.2](docs/forslag-maalmodell-2026-10-09.md#22-byggeklossene),
som ikke er vedtatt i sin helhet, og i [domenetabellen](docs/domenetabell/README.md).

**TS eier KOE, endringsordre og forsering (B-17).** Kjernen ligger i `kjerne/`
(B-14) og er ren kode: den importerer ingenting utenfor mappa, ingen `pg` og
ingen server, og ingen regel når visningen eller bufferen. Arkitekturtesten i
`kjerne/tester/` håndhever det. Den håndhever også hva
reglene leser, og regelversjonsvakten i CI krever nye versjoner når kjernen endres.
Hvitelisten `LESBART` og versjonene står i
[`.claude/rules/kjerne.md`](.claude/rules/kjerne.md), som lastes når du arbeider i `kjerne/`. Lagringstestene mot
testbasen i SQL Server står i `sprakprove/kjernelagring/`. `sprakprove/` er prøvekode og ikke
en mal. Python-stien er slettet (#49).

## Miljø

Kommandoene for testene, typesjekkene og verktøykjeden står i
[miljø-skillen](.claude/skills/miljo/SKILL.md). I Claude Code heter skillen `miljo`.
Omveiene i skyøktene står i denne fila, og kommandoene for dem står i skillen.
Skyøkta har en testbase for SQL Server
([DL-U1](docs/plans/vedtak.md#dl-u1)); kommandoene står i miljø-skillen.
**En skyøkt startes med bare dette repoet som kilde.** En økt med flere repoer
starter over klonene og leser ikke hookene i `.claude/settings.json`, så verken
oppstartshooken eller vaktene kjører (#1319). Trengs `khjohns/kontrakt`, legges det til
underveis med `add_repo`.
Oppstartshooken starter SQL Server-testbasen i bakgrunnen. Katalogen i den er kilden for TS-stien
([`database.md`](.claude/rules/database.md)), og `docs/verktoy/katalog.py` leser
den.

`svelte-check` ser ikke `kjerne/`, `sprakprove/` og `server/`, så de har hver sin
`tsc -p`-kommando.

I skyøkta kan hele `npx vitest run` ta over 120 s, standardgrensen for Bash. Gi kallet
`timeout` på 300000 eller mer, eller kjør det med `run_in_background`.

Testene er raske. Kjør dem ofte.
Med `KOE_SQLSERVER_TILKOBLING` kjører `npm test` også testene mot SQL Server i
`server/` og kjernens lagringstester i `sprakprove/kjernelagring/`.
Sett etiketten `feilinnfoering` på en PR som rører kjernen, før merge. Hva den kjører,
står i miljø-skillen.

**Nettleserkontroll av den ekte saksruta og demoruta går gjennom skillen `mockup-nettleser`.** Kjør
aldri `npm i playwright` eller `playwright install`; skillen sier hvorfor.

**`npm run lint` håndhever prettier** for omfanget i `.prettierignore` og
navnereglene i eslint for `kjerne/`, og `npm run format` skriver prettier.
Utenfor er JSON som et verktøy skriver (som `regler.json`), tsconfig-filene og
`docs/`: der ville prettier og verktøyet skrevet om hverandres form.

**`ruff format` er ikke en port.** Repoet er aldri formatert med den. Kjør den
ikke på hele treet.

**Kjøretidstilstanden i basen avgjøres av katalogen, ikke av migrasjonsfilene,
og skjemaet endres bare gjennom en migrasjonsfil — aldri med DDL rett mot en
base eller et verktøy som stempler sin egen versjon.** Reglene står i
[`.claude/rules/database.md`](.claude/rules/database.md), som lastes for
migrasjonene og TS-serveren; les den før du endrer en base.

## Sikkerhetsinvarianter

Brytes en av disse, er det en sikkerhetsfeil uansett hvor liten endringen så ut.
De gjelder hver serverinngang. Mekanismene, og det TS-stien ennå mangler, står i [`.claude/rules/tilgang.md`](.claude/rules/tilgang.md).

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
  inn, også webhooken, løser identiteten gjennom `koe.resolve_identity`, som
  innloggingen og medlemssynkroniseringen, med samme issuer og samme normaliserte
  subjekt; ellers får samme person to brukerrader. Lar identiteten seg ikke
  avgjøre, skrives ingen hendelse — fail-closed, som for kontraktssiden. Navnet
  slås opp ved visning, og et oppslag som feiler, skal falle tilbake til
  identiteten og aldri velte tidslinjen eller brevet. En hendelse er
  append-only, så en andre verdiform kan aldri rettes igjen.
  Unntatt er navnene i brevhodet og underskriften, som fryses med brevet i
  journalen ([LV-U64](docs/plans/vedtak.md#lv-u64),
  [LV-U67](docs/plans/vedtak.md#lv-u67) og [LV-U69](docs/plans/vedtak.md#lv-u69)).
  `aktor_id` er fortsatt den eneste formen for aktørens identitet på
  hendelsen, og resten av invarianten står.
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
  tilgang». `prosjekt_id` er `NOT NULL` uten default på `koe.hendelse` og
  `koe.sak_metadata`. Skrivestiene stempler det fra autorisert kontekst. Gjeninnfører du en
  fallback — også som et uskyldig
  `prosjekt_id or "oslobygg"` i én sammenlikning, eller som et tomt filter som
  «betyr alle» — blir attribusjonen uetterprøvbar igjen, og det lar seg ikke rette
  i ettertid når ekte saker først finnes.

## Resonneringsregler

Disse er årsaken til de fleste feilklassifiserte funnene i auditserien. Episodene
bak reglene står i [resonnering-skillen](.claude/skills/resonnering/SKILL.md).

**Les [testinstruksjonene](.claude/rules/tester.md) før du skriver
domeneforventninger, bevis-saker eller metodeprøver**, også i `docs/`.

**Ikke utled kjøretidsatferd fra ett lag.** Ser du en påstand på formen «krasjer»,
«lekker», «returnerer» eller «omgår» — finn laget som faktisk ville produsert
virkningen, og les det. For frontend: kontroller alltid om serveren håndhever
uavhengig før noe klassifiseres som sikkerhetsfunn. Serveren holder oftere enn
klientkoden antyder.

Og **les hele stedet, ikke et utsnitt**. Det er ikke nok å finne riktig lag hvis du
leser en avkuttet del av det.

**Et skjermbilde som finnes, beviser ikke at flyten virker.** Følg kallet fra
frontenden, med rute, metode og nyttelast, gjennom tilgangskontrollen til lageret,
og kjør det med ekte innlogging. For TS-stien er det `saksrute.ts` (skillen
`mockup-nettleser`).

**Og ett av lagene er databasen.** TS-stien har prosedyrer, funksjoner og triggere i
`koe`, `koe_api`, `koe_drift` og `koe_sikkerhet` i `database/migrasjoner/`. De er en
del av applikasjonen, og et søk i TS-koden finner kallene, men ikke det
prosedyrene og triggerne gjør. Senere filer kan definere
dem på nytt med `CREATE OR ALTER` eller `ALTER`, så spør katalogen i en testbase
bygget fra migrasjonene før du skriver at noe ikke er i bruk
([`database.md`](.claude/rules/database.md)). En trigger kan også være den egentlige
skriveren.

**Og spør hvem *andre* som kaller funksjonen, ikke bare om den kalles.**

**Har du funnet ett tilfelle, har du ikke funnet alle.** Søket formes av det du
allerede fant, så tellingen vokser i runder — og hver runde melder seg ferdig.
En defaultverdi gjemmer seg i flere former. I Python: `x or "verdi"`,
`getattr(obj, "x", "verdi")`, `d.get("x", "verdi")`,
`request.headers.get("X", "verdi")` og et defaultargument. I TypeScript: `x ?? "verdi"`,
`x || "verdi"`, en default ved destrukturering (`{ x = "verdi" }`),
`headers.get("X") ?? "verdi"` og et defaultargument. I databasen: en `DEFAULT`.
Søk etter alle formene før du skriver
«alle er fjernet» — og skriv heller hvilke former du søkte etter.

## Hvor hva står

**Hver opplysning har ett hjem: én kilde.** Sier to steder det samme, glir de fra
hverandre. Det holder bare hvis hvert ledd viser til det forrige i stedet for å
gjengi det. Genererte og kontrollerte visninger er lov, men en fri gjengivelse er
aldri regelgrunnlag. Matrisen og domenetabellen viser til vedtaks-ID-en, en
bevis-sak viser til raden og en PR viser til issuet og vedtaket. Ingen av dem
skriver vedtaket om med egne ord. En vedtaks-ID i `kjerne/`, `server/` og `src/`, og
i kildene i bevis-sakene og brukerforløpene, må finnes i vedtaksregisteret. Et opphevet
vedtak kan bare stå sammen med posten som opphever det, eller i en test merket med
«historisk» (`docs/verktoy/vedtakshenvisninger.py`, #452).

| Hva | Hvor |
| --- | --- |
| Vedtakene og beslutningene | Vedtaksfila, generert fra [vedtaksregisteret](docs/vedtaksregister/README.md) og rettet bare der. Til #1020 var den avsnitt 3.1 i hovedplanen. Skjemaet, visningen og arbeidsflyten står i brukerforløpet eller `system.md`. Hva som er hva, avgjøres av testen i [vedtaksskillen](.claude/skills/vedtak/SKILL.md) |
| Funnstatus og alvorlighet, de åpne beslutningene og føringene, rekkefølgen på arbeidspakkene, og det som er levert, med dato og belegg | Hovedplanen |
| Avsluttede funn og leveransemerknadene fram til 24.10 | Arkivet, flyttet ordrett fra hovedplanen (#1020). Åpnes et funn igjen, flyttes raden tilbake |
| Invarianter og regler som står seg | Denne fila |
| Beviset: auditer, design, reviewer, oppdrag, og gjennomføringsnotater ved særskilt behov eller bestilling | `docs/`, i formen [`.claude/rules/dokumentasjon.md`](.claude/rules/dokumentasjon.md) beskriver |
| Regler som bare gjelder én del av treet: databasen, testene, tilgangen, kjernen, `docs/` | `.claude/rules/`, som lastes når du arbeider der |
| Leveranseprosedyren: akseptkriterier, eierskap, utfasing, review, stoppregelen for funn og bevis før en PR er klar | [Leveranseskillen](.claude/skills/leveranse/SKILL.md). PR- og oppgavemalene i `.github/` samler beviset, men eier ingen regler |
| Beslutningene for visningen: retning, tokens i bruk, mønstre og vedtakene som styrer farge og ord. Metoden for frontendarbeid | [`.interface-design/system.md`](.interface-design/system.md). Verdiene står i `theme.css`. Metoden står i [interface-design-skillen](.claude/skills/interface-design/SKILL.md) |
| Kommandoene for tester, typesjekk og verktøykjeden, og omveiene i skyøkta | [Miljø-skillen](.claude/skills/miljo/SKILL.md). Reglene står i «Miljø» |
| Tid, kontekstgrenser og tilstand i en skyøkt, og de faste reglene for en orkestrert arbeidsøkt | [Arbeidsøkt-skillen](.claude/skills/arbeidsokt/SKILL.md). Regelen om at den gjelder alle skyøkter, står i «Arbeidsform» |
| Når en subagent brukes, og modellen, størrelsen og bestillingen for den | [Subagent-skillen](.claude/skills/subagenter/SKILL.md). Regelen om å følge den står i «Arbeidsform» |
| Episodene bak resonneringsreglene | [Resonnering-skillen](.claude/skills/resonnering/SKILL.md). Reglene står i «Resonneringsregler» |
| Datamodellen: hver tabell, hendelsestype og relasjon, hvem som skriver, og hvilke kall til Catenda som leser eller skriver | Kilderegistrene `tabeller.toml`, `kjernehendelser.toml` (typene TS-kjernen skriver), `relasjoner.toml` og `dataflyt.toml` i `docs/datamodell/`, med skjemaet i SQL Server i `katalog.json`. Markdown og Excel lages av `docs/verktoy/datamodell.py`. Vakttestene i `verktoy/tester/test_datamodell/` feiler når et register mangler en tabell eller en fremmednøkkel, eller avviker fra koden eller migrasjonene, og når et kall til Catenda i `server/` mangler en pil i dataflyten |
| Arbeid som pågår eller venter: hva, hvem, hvilken PR, hva det venter på | GitHub-issues, samlet i én milepæl per arbeidspakke |
| Etikettene og milepælene, og formen på issues og PR-er | [GitHub-skillen](.claude/skills/github/SKILL.md). Reglene står i skillen |

- **Hovedplanen er autoritativ for funnstatus, sammen med arkivet for de avsluttede
  funnene, og vedtaksfila for vedtakene.** Sier et annet dokument noe annet,
  er det andre foreldet — rett det, ikke gjenopprett diskusjonen.
- **Et issue viser til ID-en, ikke til vurderingen.** Skriv funn- eller
  beslutnings-ID-en og lenk til hovedplanen. Gjenta ikke alvorlighet, belegg
  eller begrunnelse; da har de to hjem.
- **En PR som fullfører et issue, har `Closes #n` i beskrivelsen.** Endrer PR-en
  funnstatus eller en beslutning, får hovedplanen en datert merknad i samme PR.
  Planen får én merknad når et punkt i en arbeidspakke er levert, ikke én per
  PR; framdriften står i issuene. I en orkestrert runde fører orkestratoren
  vedtakene og merknadene i egne små PR-er, slik
  [vedtaksskillen](.claude/skills/vedtak/SKILL.md) sier.
- **Skriv ikke arbeidsstatus i hovedplanen eller `docs/README.md`**: «neste
  oppgave», «pågår», «venter på», «merges etter #45». Det hører til i issuet.
- **Oppfølging som ikke løses i samme PR, føres i et issue.** Funn fra review og
  code-review følger stoppregelen for funn i leveranseskillen. Feil du oppdager
  underveis utenfor oppdraget, og som ikke er reviewfunn, blir egne issues. Venter
  en slik feil på en B-ID, får den `venter-på-beslutning`. Å nevne den i
  PR-beskrivelsen er ikke nok. Tilskriver du en feil testmiljøet, er det en
  påstand. Kontroller den, eller meld den.
- **Hvert issue har en milepæl eller en sporetikett, og det som sinker arbeidet, blir
  et issue med etiketten `papercut`.** Reglene for etikettene og milepælene står i
  [GitHub-skillen](.claude/skills/github/SKILL.md).
- **Issues er like offentlige som repoet.** Ingen saksdata, kontraktsinnhold,
  personnavn fra prosjekter, nøkler eller tilgangsopplysninger.

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

**Oppgavetypene, og skillene og kontrollene hver av dem bruker, står i
[orkestreringsskillen](.claude/skills/orkestrering/SKILL.md#oppgavetypene).** Designsløyfa,
der brukerforløp og prototyper avklares før byggingen, følger skillen `brukerforlop`.
En iterasjon som bare rører `docs/`, har kontrollene i tabellen, ikke reviewet i leveranseskillen.

**Uavhengig review før en PR meldes klar er `/code-review` på egen diff.** Nivået,
reviewet av samspillet mellom reglene, `/simplify`, ryddingen og reviewet av visningen,
kjøringen av den ekte saksruta og stoppregelen for funn står i
[leveranseskillen, «Review og funn»](.claude/skills/leveranse/SKILL.md#review-og-funn).
Endrer diffen visningen, står PR-en som utkast til oppdragsgiver har sett skjermbildene.

**Reglene for tid, kontekst og tilstand i
[arbeidsøkt-skillen](.claude/skills/arbeidsokt/SKILL.md)
gjelder alle skyøkter**, også en direkte økt som ikke er orkestrert.

**Før en subagent startes, følg [skillen `subagenter`](.claude/skills/subagenter/SKILL.md)**,
i alle økter. Den sier når en subagent sparer mer enn den koster, og hvordan den bestilles.

**Oppdragsgiver vil ha spørsmål, ikke dokumenter å lese.** Kartlegg selv. Der
noe bare oppdragsgiver kan avgjøre, still konkrete spørsmål med alternativer og
en anbefaling. Spørsmål som berører rettsregler stilles ikke med
spørsmålsverktøyet (i Claude Code: `AskUserQuestion`). Hvordan de legges fram,
står i [vedtaksskillen](.claude/skills/vedtak/SKILL.md), «Still dem slik
oppdragsgiver kan svare». Be ikke om gjennomlesing for å finne ut hva oppdragsgiver mener.
Det som kan avgjøres ved å lese koden eller spørre katalogen, avgjør du selv.
Svarene føres inn der de hører hjemme: vedtak i vedtaksregisteret, arbeidsvalg i
issuet eller oppdraget.
