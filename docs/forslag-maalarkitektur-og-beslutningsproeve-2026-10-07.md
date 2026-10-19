# Forslag til målarkitektur og beslutningsprøve

**Dato:** 2026-10-07. **Kodegrunnlag:** `68ca0ea5b593808c4513dc84ab908baf12739cdb`.
**Forrige ledd:** [PR #266](https://github.com/khjohns/endringsmeldinger/pull/266),
[strukturkartleggingen på PR-head `4c8860a`](https://github.com/khjohns/endringsmeldinger/blob/4c8860a84a4aa9f388818b38471593e5592fcfb8/docs/kartlegging-struktur-spor-d-2026-10-05.md)
og [hovedplanen på samme head](https://github.com/khjohns/endringsmeldinger/blob/4c8860a84a4aa9f388818b38471593e5592fcfb8/docs/plans/2026-09-16-godkjenning-og-varig-levering.md).
**Status:** bearbeidet arkitekturgrunnlag. **Merknad 2026-10-07 etter review:**
Oppdragsgiver har tilsluttet seg målretning og justert rekkefølge under B-14
i hovedplanen. Dette erstatter dokumentets tidligere åpne prioriteringsstatus.
Språkvalg og full portering er ikke vedtatt; ingen prototype er gjennomført
av denne dokumentasjonsleveransen. B-15 og B-16 er separate åpne beslutninger.

Dokumentet bearbeider [oppdragsgivers innlimte forslag](vedlegg/arkitekturvalg-2026-10-07/opprinnelig-forslag.md)
med kodegjennomgangen og justeringene fra samtalen 07.10. Originalen er bevart
uendret som historisk kilde. Vedtak og funnstatus har fortsatt ett hjem i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md); arbeidet med
B-14 spores i [#263](https://github.com/khjohns/endringsmeldinger/issues/263).
Oppdragsgiver opplyste 07.10 at det ikke er en fast produksjonsfrist, og at
samlet vedlikeholdskostnad skal veie tyngst i denne vurderingen.

## 1. Anbefaling og vurderingspunkter

Undersøk en ren TypeScript-domenekjerne som brukes både til forhåndsvurdering
i nettleseren og autoritativ beregning på serveren. Behold Svelte som
presentasjonslag. Prøv hypotesen gjennom en avgrenset flyt før det investeres
tungt i implementasjon som et språkbytte vil erstatte.

Sammenlikningsgrunnlaget er Python etter de foreslåtte M1/M2-forbedringene,
ikke bare dagens kode. Eksplisitte relasjoner og en ryddig domenemodell kan gi
stor gevinst i begge språk. Den særlige TypeScript-gevinsten er at klient og
server kan bruke samme implementasjon av vurderingsreglene.

ID-ene MA-01–MA-08 nummererer vurderingene nedenfor. De er ikke nye auditfunn
eller alvorlighetsklassifiseringer og endrer ingen funnstatus.

| ID | Vurdering | Alvorlighet / beslutningsgrense |
| --- | --- | --- |
| MA-01 | Skill gevinsten av domenedesign fra gevinsten av felles språk | Arkitekturhypotese, ikke sikkerhetsklassifisert |
| MA-02 | Behold B-13-skillet mellom lagret resultat og avledet standpunkt | Eksisterende vedtak, konkretiseres i bevis-sakene |
| MA-03 | Journalen bygger sakstilstand; andre delsystemer har egne sannhetskilder | Avgrensning lest i koden, gjenoppbygging må prøves |
| MA-04 | Delt kode erstatter ikke serverkontroll eller autorisasjon | Eksisterende sikkerhets- og kontraktsgrenser |
| MA-05 | Ta transaksjon, godkjenning og levering med i målbildet | Eksisterende AF-/F2-krav |
| MA-06 | Hold databasen fast under språkprøven | B-12 forblir et eget valg |
| MA-07 | Prøv en sammenhengende flyt og mål endringskostnad | Beslutningsprøve, ikke porteringstillatelse |
| MA-08 | Skill vedlikehold fra arkitektur- og plattformbytte | Anbefalt avgrensning, ikke ny arbeidsstatus |

## 2. MA-01: hva målbildet skal forbedre

Målbildet er en modulær monolitt med en tydelig domenekjerne, uforanderlig og
versjonert hendelseslogg, eksplisitte relasjoner, avledede lesemodeller og en
kontrollert offentlig API-kontrakt. Én stor tilstandsmaskin, en generell
regelmotor, Kafka eller mikrotjenester er ikke nødvendige for dette.

| Egenskap | Krever TypeScript-backend? |
| --- | --- |
| Svar peker på krav, aksept peker på svar | Nei |
| Samlet utledning av sporstatus og standpunkt | Nei |
| Visningskomponenter slutter å trekke egne juridiske slutninger | Nei |
| Offentlige DTO-er og konsistent nullpolitikk | Nei |
| Nettleser og server kjører samme implementasjon av vurderingsreglene | Ja, med den foreslåtte delte TS-kjernen |

M2 bør uttrykke bindingene eksplisitt, for eksempel `svar.krav_event_id` og
`aksept.respons_event_id`. Gjeldende status avledes av hvilket krav svaret
gjelder, og hvilket svar aksepten gjelder. «Siste relevante hendelse» er ikke
en tilstrekkelig relasjon. Kravversjon, tilbaketrekking, frafall og godtatt
preklusjon følger vedtakene i hovedplanen på PR #266.

**Presisering etter review 07.10:** Klienten sender ID-en til svaret brukeren
aksepterer. Serveren validerer sak, spor, gjeldende svar og forventet saksversjon,
og bindingen lagres i hendelsens data gjennom den faktiske serialiseringsstien.
Serveren skal ikke erstatte brukerens referanse med «siste svar».

De tre referansene er ikke hele livsløpsmodellen. Tilbaketrekking, frafall,
låsing og grunnlagsavhengighet er eksplisitte fakta som statusen utledes fra.
En beslutningstabell med bevis-saker skal dekke grunnlagsendringer med og uten
endret underkategori, subsidiært svar mens grunnlaget venter på nytt svar,
trukket krav og aksept av tidligere/revidert svar. At en endring i grunnlaget
er en ny kravversjon, kan ikke antas bare fordi vederlag og frist har denne
regelen; uavklart atferd avgjøres før den aktuelle implementeringen.

Definisjonen av gjeldende krav skal brukes også i
[claims i approval_service.py](../backend/services/approval_service.py), som i dag
klassifiserer hendelser etter navn. En lokal ombygging av projeksjonen alene
er ikke tilstrekkelig. Reaktiv EO og andre særforløp må omfattes av tabellen
der de påvirker sporene; de skal ikke skjult overstyre den nye utledningen.

M1 bør samle `standpunkt(grunnlag, spor)` med hovedgrunn, subsidiær karakter
og årsaker. Flere resultatfelt innføres når en konkret forbruker trenger dem.
Grunnlaget må kunne komme fra en ennå ikke publisert godkjenningspakke, slik
[ApprovalService.validate_items](../backend/services/approval_service.py)
allerede evaluerer pakkens svar i domenerekkefølge.

Den delte kjernen skal være vanlige TypeScript-moduler uten HTTP, database,
Svelte, nettleser-API-er, Node-spesifikke API-er eller skjult klokke. Dato og
andre nødvendige forutsetninger gis som input. Skjemaer, reaktivitet,
navigasjon og tekstformatering blir i presentasjonslaget.

## 3. MA-02: historikk og versjoner

Originalens punkt 10 omtalte rettsvirkning og avledet standpunkt som et nytt
åpent spørsmål. B-13 ble presisert av oppdragsgiver 05.10 i hovedplanen på
PR #266: lagrede resultater, beløp og dager regnes ikke om; avledet standpunkt
beregnes med gjeldende regler. En regelendring som endrer gamle saker, skal
si det og krever et eget vedtak. Denne presiseringen legges til grunn her.

Bevis-sakene skal vise skillet mellom det historiske svaret, dagens avledede
standpunkt og en eventuell ny vurdering. Avledet standpunkt brukes også av
fullmakt og forsering; det er ikke bare en visuell etikett. En frosset
beslutning eller et sendt brev skal ikke erstattes av en ny beregning under
samme historiske identitet.

Tre versjonsbegreper må holdes atskilt:

- `regelversjon` finnes allerede i BH-svarenes `data`. Den beskytter også en
  gammel nettleser mot en ny server og omfatter etter B-13 tekstgeneratorene.
- Hendelsesformatets versjon beskriver serialisering og lesekontrakt.
  `event_version` i originalen er et foreslått begrep, ikke et etablert feltnavn
  i dagens modell. Innføring må følge hele lagrings- og lesestien.
- Saksversjonen er rekkefølgen i hendelsesstrømmen og grunnlaget for
  optimistisk samtidighetskontroll. Den erstatter ingen av de to andre.

Historiske journalhendelser skal bevares. En generell motor for oppgradering
av gamle hendelser trenger ikke bygges uten et konkret formatbehov, men før
produksjon må representativ historikk, tolerant lesing og kompatibilitet ved
utrulling og tilbakerulling være bevist. Dette viderefører produksjonsporten
i kartleggingens avsnitt 7.7; språkvalget fritar ikke fra den.

## 4. MA-03: sannhetskilder og offentlig tilstand

[TimelineService.compute_state](../backend/services/timeline_service.py)
bygger sakstilstanden fra hendelsene i lagerets rekkefølge.
[submit_event](../backend/routes/event_routes.py) oppdaterer `cached_status`
og `cached_sum_godkjent` fra den beregnede tilstanden. Kartleggingens avsnitt
7.1 har allerede undersøkt dette. Den neste nyttige kontrollen er derfor en
gjenoppbyggingstest gjennom lagring og gjenlesing, ikke en ny bred hypotese om
at cachefeltene kan være sakens primære sannhetskilde.

Dette gjelder sakstilstanden. Godkjenningspakker frem til publisering,
identitet og tilgang, private notater, vedlegg og leveringskvitteringer har
egne lagre og kontrakter. Målbildet skal ikke gjøre alt til saksjournal eller
anta at hele applikasjonen kan gjenopprettes fra den.

Projeksjoner er avledet tilstand. Snapshots kan innføres hvis replay blir
målt for dyrt, og må da kunne forkastes og bygges på nytt.

En regelendring kan endre dagens standpunkt uten ny sakshendelse. Derfor
identifiseres også versjonen som beregnet en projeksjon; saksversjonen alene
beviser ikke at en lagret oversikt følger dagens regler. B-10 skal konkretisere
merking, invalidasjon og gjenoppbygging, og F2 skal prøve samme historiske
strøm før og etter endringen. Konsekvenser for gamle saker dokumenteres før
utrulling etter B-13. Frosne brev og beslutninger gjenberegnes ikke.

Kompatibilitetsmatrisen skal vise hvilke skrivere og lesere som kan kjøre
sammen, og hva tilbakerulling tillater etter at nytt format er skrevet.
Tolerant lesing innebærer ikke at ukjente rettslig relevante hendelser kan
hoppes over mens bindende kommandoer fortsatt tillates. Ved ukjent semantikk
stanser skrivestien; historikkinnsyn kan bestå med en uttrykkelig begrensning.
Dette prøves i F2 og kontrolleres i produksjonsporten F5.

`/api/events` returnerer allerede `public_state` og ny saksversjon. Klientens
[refresh](../src/lib/kontraktsbord/context.svelte.ts) henter også tidslinje,
historikk og Catenda-status. En ekstra GET kan fjernes først når
kommandosvaret leverer den nødvendige sammenhengende sakskonteksten, eller
klienten har en bevist måte å oppdatere den på. Versjonsmonotoni og skillet
mellom «lagret» og «oppdateringen av visningen feilet» må bevares.

## 5. MA-04: autoritativ server og kontraktsgrenser

[kontroller_svar](../backend/regler/sammenlikning.py) kontrollerer både
regelversjon og klientens resultat mot serverens beregning. `RESULT_MISMATCH`
fanger mer enn forskjeller mellom programmeringsspråk: også feil kontekst,
feil nyttelast og manipulert resultat. Behold denne B-13-kontrakten under
prototypen. Å slutte å sende klientberegnede resultatfelt er et mulig senere
API-valg, ikke en automatisk følge av kodegjenbruk.

`pending_actions` uttrykker oppgaver som følger av saken. `capabilities`
uttrykker hva den aktuelle brukeren kan gjøre nå. Begge bør bruke samme
domenepredikater, men serveren må kombinere dem med prosjekt, team,
kontraktsside, handlingsrett, godkjenningspolicy og fullmakt. Klienten kan
forhåndsvurdere domenet uten å ha hele autorisasjonsgrunnlaget. Innsendingen
kontrollerer alltid gjeldende kontekst og nyttelast på nytt.

En smal offentlig kontrakt defineres før typegenerering, etter tilgangs- og
skjermingskontrollene. Genererte typer følger det serialiserte API-svaret,
ikke automatisk hele `SakState`. Offentlige felt velges uttrykkelig, også
når formen foreløpig ligner den interne. Stabile verdityper kan gjenbrukes;
alle interne modeller trenger ikke en kopi. Et nytt internt felt blir ikke
offentlig uten en kontraktsendring.

Kommandoen klienten får sende, hendelsen serveren lagrer og tilstanden
klienten får lese er tre grenser. De kan fortsatt bruke `/api/events`.
`extra="forbid"` gjelder den strenge kommando-/skrivemodellen, inkludert
nøstet data. Historikkleseren har en uttrykkelig kompatibilitetskontrakt.
Delt TypeScript og genererte typer erstatter ikke validering av JSON ved kjøretid.
Tilstandens felt finnes
med `null` når verdien mangler; hendelsesdata kan utelate usatte felt etter
den vedtatte nullpolitikken.

Brevtekst oversetter domenets hovedgrunn og årsaker til tekst og skal ikke
prioritere juridiske grunner på nytt. B-13s T-a står: begrunnelsesteksten er
partens, og serveren kontrollerer feltene, ikke prosaen. Beslutningslinjen og
fullmaktsgrunnlaget følger serverens vurdering. Tekst- og kontraktsendringer
må fortsatt prøves, selv med én regelimplementasjon.

## 6. MA-05 og MA-06: transaksjoner, drift og database

Målbildet må bevare hovedplanens transaksjons- og leveringsinvarianter:
én bindende kommando i én transaksjon, innholdsbindende idempotens,
samtidighetskontroll, godkjenningsgrunnlag og leveringsintensjon som henger
sammen. Leveringsmål og dokumentgrunnlag fryses, retry leverer samme dokument,
og usikkert eksternt utfall håndteres uttrykkelig. Dette er AF-/F2-krav,
ikke noe som oppstår eller forsvinner ved bytte fra Python til TypeScript.

Én SvelteKit-applikasjon med serverlag og en separat Node/TypeScript-backend
er begge mulige. Velg etter konkrete driftsbehov. En modulær monolitt kan ha
en databasebasert worker i egen prosess; «én deploybar applikasjon» bør ikke
bli et absolutt krav som hindrer varig levering. Dagens frontend er statisk,
så serveradapter, autentisering og utrulling må prøves hvis SvelteKit skal
ta serveransvar. SSR er ikke nødvendig for å prøve en delt kjerne.

B-12 er åpen. Merknaden 29.09 gjør Azure SQL aktuell av kostnadsgrunner.
PostgreSQL er likevel det eksisterende transaksjonsgrunnlaget, og B-02s
tilgangsdesign bygger på det. Azure SQL innebærer et nytt datalag og ny
verifikasjon av blant annet roller, RLS, kontekst og gjenbrukte forbindelser.
Direkte databasetilkobling og transaksjonskrav skal ikke forsvinne i et slikt valg.

Hold derfor PostgreSQL fast under språkprototypen. IKT, kostnader, drift,
backup/gjenoppretting og hosting behandles videre i
[#78](https://github.com/khjohns/endringsmeldinger/issues/78). Det gjør det
mulig å måle gevinsten av delt kode uavhengig av en databasemigrering.

## 7. MA-07: en tidsbegrenset beslutningsprøve

Rammen etter B-14 er én arbeidsuke med stopp og vurdering etterpå.
Dette er en undersøkelsesramme, ikke et estimat for backend-portering.
En uferdig prøve skal beskrive usikkerheten, ikke automatisk utvides til
en omskriving. B-14 og merknaden 07.10 til AF-06 plasserer prøven etter
domenetabellen, bevis-sakene og en smal kommando-/API-kontrakt, men før
større språkspesifikk implementasjon av M2/M1.

Prøven har to porter innen samme tidsramme:

1. **Semantikk og dobbeltarbeid:** samme vedtatte forventninger, en konkret
   forbedret Python-baseline og én kontrollert regelendring i begge alternativer.
   Vis hvilke semantiske endringssteder TS faktisk fjerner. Modellforbedring
   som begge alternativer får, teller ikke som språkgevinst.
2. **Server og integrasjon:** den representative flyten gjennom konkret
   TS-serverutførelse, eksisterende testdatabase og godkjenningsgrense.
   Dokumenter adaptere, sikkerhetsbevis som må erstattes, og driftskostnad.

Begge porter må gi tilstrekkelig bevis før TS anbefales. Manglende bevis
ved stopp gir «ikke tilstrekkelig grunnlag». Et negativt resultat på første
port kan avslutte prøven tidlig; ingen full portering følger automatisk.

### Bevis-saker før språk sammenliknes

Løft PR #266s reproduksjoner og kontrollsaker til et språkuavhengig format
med forutsetninger, kommandoer, forventede avvisninger, referanser og
sluttresultater. Knyt forventningene til vedtak og invarianter. Dagens Python
er ikke fasit der en kjent feil er reprodusert. For slike forløp skilles
dagens observerte resultat fra vedtatt forventning.

De samme sakene skal kunne kjøres gjennom domenet, vanlig HTTP-innsending,
`/api/events/batch`, lagring/gjenlesing og godkjenningsflyten.
Suppler kjente reproduksjoner med et lite sett genererte hendelsesforløp:
aksept gjelder alltid riktig svar; et ubesvart nytt krav blir aldri omforent;
avvisning endrer ikke journalen; og tilstanden før lagring er lik den etter
gjenlesing. Sammenlikn forløpenes observerbare resultat og avvisninger.
Likhet mellom Python og TS er ikke selv fasit: begge kan dele samme feil.
En forventning endres bare ved en uttrykkelig endring
av tiltenkt atferd. Små predikater, beslutningstabeller, norske begreper og
koblingen bestemmelse → invariant → bevis-sak gjør reglene etterprøvbare.

### Representativ flyt

Prøv vederlag med avhengighet til ansvarsgrunnlaget: krav, delvis svar,
aksept og nytt krav, supplert med subsidiært standpunkt. Ta med en
godkjenningspakke som vurderer grunnlag og vederlag sammen, og et avgrenset
fristscenario for å prøve om kjernen kan deles på tvers av spor.

Kjør samme kjernemodul i nettleser og en konkret TypeScript-serversti.
Prøv kjøretidsvalidering, eksplisitte referanser, serverstemplede felt,
autorisasjon, forventet versjon, lagring, gjenlesing og offentlig tilstand.
Bruk ekte testdatabase for lagringsbeviset. En ren beregningsdemo eller en
Python-backend med et separat TS-speil beviser ikke en felles autoritativ kjerne.

Hold klokke og identiteter kontrollerbare i testene. Prøv beløpsavrunding,
negative og positive halvverdier, grensetall, datoer, fravær og `null`.
Python bruker allerede Decimal og definert avrunding; en port skal bevare
semantikken før et nytt tallformat vurderes. Uavklarte domenespørsmål som
#189 avgjøres ikke gjennom bibliotekvalg.

### Mål og valg

| Måling | Hva som skal dokumenteres |
| --- | --- |
| Én kontrollert regelendring | Semantiske steder som må endres i hvert alternativ |
| Frontendforenkling | Konkrete regler og adaptere som kan fjernes, og hva som blir igjen |
| Korrekthet | Felles forventninger, avvisninger, replay og offentlig kontrakt |
| Testgjenbruk | Hvilke bevis-saker og API-/integrasjonstester kan beholdes; hvilke må portes |
| Resten av backend | Godkjenning, auth, Catenda, forsering, EO, PDF, lagring og drift |
| Operativ kostnad | Bygg, utrulling, servergrense, worker og vedlikehold av to løsninger i overgang |

Linjetall er bare omfangsindikatorer. På kodegrunnlaget ble `backend/regler/`
talt til 926 linjer, tjenestene til 10 339, modellene til 5 157 og rutene til
5 087, inkludert kommentarer og blanklinjer. En vellykket port av reglene
beviser ikke at resten er billig å portere. Testtallet 2 296 i originalen
stammer fra PR #266s baselinerapport, ikke en full suite kjørt i denne vurderingen.

Velg TS-retningen hvis samme modul faktisk erstatter klient- og serverregler,
forenkler representative endringer og kan brukes gjennom lagring og
godkjenning med forsvarlig samlet kostnad. Velg forbedret Python hvis
gevinsten hovedsakelig er delte typer eller noen få beregningsfunksjoner,
mens adapter- og driftskostnaden dominerer. En eventuell tidligere
sammenlikning med serverbasert forhåndsvurdering
behandles under B-15. Vedtaket om utsettelse gjelder til et nytt vedtak
foreligger; det blokkerer ikke Python–TS-prøven. B-13 er uendret.

Ved TS-valg anbefales avgrenset portering med én autoritativ skrivesti for
hver kommando. Et eventuelt midlertidig skille mellom Python og TS må ha
tydelig eierskap og utfasing. Full greenfield er ikke begrunnet av at systemet
ennå mangler produksjonsdata; testet atferd, integrasjoner og sikkerhetsbevis
har fortsatt verdi.

### Resultat av port 1 (2026-10-08, #274)

**Status:** port 1 er gjennomført. Port 2 venter på klarsignal. Dette er et
delresultat, ikke en anbefaling om språk. Kjøringene står i
[PR #297](https://github.com/khjohns/endringsmeldinger/pull/297)
med kontrollert commit.

**Merknad 2026-10-09:** port 2 er gjennomført. Se
[resultatet av port 2](#resultat-av-port-2-2026-10-09-274).

**Hva som ble sammenliknet:**
- **Forbedret Python** er dagens backend med M2 og M1 for flyten:
  - aksepten bundet til svaret;
  - en ny kravversjon åpner sporet;
  - GR-U1, SK-01 og SK-03;
  - standpunktet per spor i tilstanden.
- **TS-kjernen** i [`sprakprove/kjerne/`](../sprakprove/kjerne/) er bygget i
  samme målform fra start, med beløp i hele øre og kommandoer validert mot
  `kontrakt.json`. Node 22 kjører den uten byggesteg.
- **Flyten** er 31 rader og 30 forløp i [domenetabellen](domenetabell/README.md),
  pluss den kontrollerte regelendringen: enighet og oppgjort som egne
  begreper (GR-U7).

| Måling | Forbedret Python | TS-kjernen | Belegg |
| --- | --- | --- | --- |
| Felles forventninger | 30 av 30 forløp, i domenebanen, `/api/events` og batch mot testbasen. 9 av dem er kjente avvik på `main` | 30 av 30, i minnet | Domenetabellen, `sprakprove/tester/korpus.test.ts` |
| Kontrakt | Pydantic-modellene og `test_kontrakt*` | Skjemaet validert ved kjøretid. Aksepten er streng, og serverfeltene avvises eller overskrives | `sprakprove/tester/kontrakt.test.ts` |
| Tall, dager, fravær | 50 tilfeller grønne | 51 tilfeller grønne | [`sprakprove/grensetilfeller.json`](../sprakprove/grensetilfeller.json) |
| Genererte forløp | 300 forløp på 8 steg, fire invarianter holder | Samme 300, samme utfall | [`sprakprove/genererte-forlop.json`](../sprakprove/genererte-forlop.json), seed 274 |
| Feilinnføring M1–M8 | Alle oppdaget, på målassertionen | Alle oppdaget, på målassertionen | [`sprakprove/feilinnforing.py`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/sprakprove/feilinnforing.py) |
| Regelendringen (enighet) | 3 produksjonsfiler (+74/−78). I tillegg fikk 2 testfiler nytt oppsett (+56/−10), og én xfail ble ordinær | 3 filer (+50/−22) | Commitene `4cdd012` og `28e5c2c` |

**Gevinst fra begrepene, som begge alternativene får:**
- Bindingen mellom krav, svar og aksept retter SK-01, SK-02, SK-03 og DT-04
  (GR-04, GR-05) i begge.
- Enighet og oppgjort retter samlet status `UKJENT` etter frafall (SK-04, GR-15).
- `gjeldende_respons_event_id` og standpunktet fra serveren gjør disse
  klientadapterne overflødige i begge alternativene (lest, ikke bygget):
  - `submissionRefs`, som velger gjeldende svar fra tidslinjen;
  - `svaretErSubsidiaert` og `grunnlagTriggers` i `derive.ts`;
  - `claimId` i godkjenningskonteksten;
  - versjonsetikettene i oversiktene.
- Regelendringen trengte ingen klientregel i noen av alternativene. Klienten
  leser feltene fra serveren.

**Gevinst fra språket, som bare TS gir:**
- **Speilet forsvinner.** Speilet av B-13-utregningen i `src/lib/domain/` er
  omtrent 29 eksporterte funksjoner i `vederlagDomain`, `fristDomain`,
  `grunnlagDomain` og `deriveConfig`. Med TS blir de én implementasjon
  sammen med `backend/regler/` (926 linjer).
- **Testene og vaktene mot drift blir én.** De speilede testene er 177 Vitest-
  og 148 pytest-testfunksjoner. Likhetsvakten for regelversjonen og kryssjekken med
  `skjemaenes_nyttelast.json` blir overflødige. Regelversjonen trengs fortsatt
  mot en utdatert klient.
- **Kjente avvik mellom speilet og serveren forsvinner:**
  - avrundingen (SP-01);
  - feltnavnet for EP-justering (DRF-02);
  - `<= 0` mot `== 0` for dager;
  - kontrollen av svaret, som bare finnes på serveren.
- **Historikken bekrefter dobbeltarbeidet.** Fire PR-er har rørt regelfilene
  siden de ble opprettet 04.10:
  - #219 og #247 endret regelen i begge språk;
  - #242 måtte øke regelversjonen i begge uten regelendring i Python;
  - #185 rettet bare speilet.

**Kostnader og forskjeller som skyldes språket eller rammeverket:**
- **TS:**
  - `Decimal` måtte erstattes av en egen beløpsmodul i hele øre (66 linjer);
  - JSON skiller ikke 5 fra 5,0;
  - kontrakten trengte en egen validator (130 linjer).
- **Python:**
  - Et felt som avhenger av et annet spor (`oppgjort`), kan ikke være et
    beregnet felt i Pydantic, så projeksjonen setter det etter siste hendelse.
  - Sporstatusen blander frafall og trukne krav, så `avklart` må skille dem
    (SK-04).

**Merknad 2026-10-09 til listen over:** Punktene er feilklassifisert som
språkkostnader. Begge Python-punktene er egenskaper ved dagens modell og hvor
beregningen ligger. Python kan også ha en ren `er_oppgjort(sak, spor)` og bygge
en offentlig lesemodell av den. Beløpsmodulen og validatoren i TS er valg i
prøven, som ikke tok inn nye pakker. De følger ikke av språket. Gevinsten som
bare TS gir, er at nettleseren og serveren bruker samme implementasjon.

**Usikkerhet:**
- TS-kjernen dekker bare flyten: 10 hendelsestyper, uten trekk, EO, forsering,
  forespørsel, innsigelse og konsekvensvarsel. Python-baselinen dekker alt.
- Samme agent skrev begge implementasjonene og adapteren som bygger
  byggherrens svar. Forventningene er uavhengige, men feil i utregningen fanges
  bare gjennom status, beløp og grensetabellen.
- Server, autorisasjon, lagring, godkjenning og drift for TS er ikke prøvd. Det
  er port 2.

### Resultat av port 2 (2026-10-09, #274)

**Status:** port 2 er gjennomført innen stoppgrensen. Kjøringene står i
[PR #301](https://github.com/khjohns/endringsmeldinger/pull/301) med kontrollert
commit.

**Merknad 2026-10-09:** Oppdragsgiver vedtok samme dag TS som retning for den
delte domenekjernen, med avgrensningene i anbefalingen nedenfor. Vedtaket står
i hovedplanen under B-14 (3.1).

**Hva som ble bygget:**
- **TS-serveren** i [`sprakprove/server/`](../sprakprove/server/): Node 22 med
  `node:http` i egen prosess, uten rammeverk og uten byggesteg. Den er 939
  linjer: ruter 379, tilgang 317, lager 167, oppstart og basevakt 76. Kjernen
  fra port 1 er eneste regelkilde.
- **Tilgangen** leser de samme tabellene som Flask: sesjonen og CSRF,
  prosjektmedlemskapet og synkroniseringen, prosjektgrensen for hver sak det
  vises til, og kontraktsteamene. Catendas team-API står bak et grensesnitt.
- **Lageret** skriver `hendelse` i én transaksjon, med `expected_version` og
  unik-skranken.
- **Godkjenningspakken** vurderes i kjernen
  ([`godkjenning.ts`](../sprakprove/kjerne/godkjenning.ts)), med samme grense
  som `validate_items`. Den publiseres ikke.

| Kriterium | Bevis | Resultat |
| --- | --- | --- |
| P2-1 Nettleser og server | [`sammenlikn.ts`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/sprakprove/nettleser/sammenlikn.ts): kjernen og korpuskjøreren bygget med Vite og kjørt i Chromium 141, holdt mot TS-serveren og testbasen | 30 forløp, 126 steg, 0 avvik. En miljøavhengig feil innført i kjernen ga 124 avvik |
| P2-2 Tilgang | [`server.test.ts`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/sprakprove/tester/server.test.ts) | 401 uten sesjon og med utløpt sesjon. 403 for feil prosjekt, en sak eller relatert sak i et annet prosjekt, et annet prosjekt i nyttelasten, uten kontraktsteam, feil kontraktsside og manglende eller feil CSRF. Hver avvisning har en kontrollsak med 201 og uendret journal |
| P2-2 Serverfelt, versjon og regelversjon | Samme | `event_id` og `tidsstempel` avvises, og aktørfeltene overskrives. Feil `expected_version` gir 409. To samtidige sendinger på samme versjon gir én 201 og én 409, og lageret alene avviser en andre skriving på samme versjon. Feil regelversjon gir `RULE_VERSION` |
| P2-2 Lagring og gjenlesing | [`serverkorpus.test.ts`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/sprakprove/tester/serverkorpus.test.ts) og `server.test.ts` | De 30 forløpene holder gjennom `/api/events` og `/api/events/batch`, med tilstanden lest fra serveren: 60 av 60. Svaret er lik den gjenleste tilstanden og lik projeksjonen av radene. En batch med én avvist hendelse lagrer ingenting |
| P2-2 Python og TS | [`test_sprakprove_ts_server.py`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/backend/tests/test_database/test_sprakprove_ts_server.py) | TS skriver og Python leser med `parse_event`, og omvendt: 60 av 60. Hvert felt TS-serveren sender, er likt Pythons `public_state`. Journalen er lik slik de to leser den, også tidspunktet. `data` i raden TS skrev, er det Flask ville lagret, unntatt feltene i SP-03 |
| P2-3 Godkjenningspakken | `server.test.ts` | Vederlaget vurderes mot grunnlagssvaret i pakken og blir subsidiært (GR-01). Et svar vurdert mot grunnlaget uten pakkens svar avvises, og det samme gjør en foreldet kravreferanse. Regelversjonen gjelder hvert element. Pakken skriver ikke i journalen |
| Feilinnføring | [`feilinnforing.py`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/sprakprove/feilinnforing.py), M9–M11 | Se under |

**Feilinnføring M9–M11.** Samme feilklasse i begge implementasjoner, én om
gangen. Tallene er røde tester:

| Feilklasse | Python | TS |
| --- | --- | --- |
| M9 prosjektgrensen kontrolleres ikke for saken det vises til | 7 | 3 |
| M10 CSRF kontrolleres ikke | 7 | 2 |
| M11 lageret skriver etter journalens versjon, ikke den klienten så | 3 | 1–2 |

Alle feilet på målassertionen: prosjektgrensen, CSRF eller versjonskonflikten.
Ingen mutasjon overlevde. M11 i TS fanges hver gang av lagertesten. Testen med
to samtidige sendinger fanger den bare når transaksjonene ikke overlapper;
ellers stopper unik-skranken dem uansett. I Python er testene de eksisterende i `test_auth`,
`test_security`, `test_routes` og `test_hendelse_og_notat.py`. M1–M8 ble kjørt
på nytt etter endringene i kjernen og korpuskjøreren, og alle ble fortsatt
oppdaget i begge språk.

**Tidspunkt og ID-er.** TS skriver tidspunktet med `toISOString()`, altså `Z`
og millisekunder. Python skriver `+00:00` og mikrosekunder. Basen lagrer
tidspunktet, ikke teksten, og begge leser det nå i Pythons form. Kjernen i
minnet bruker ID-er som ikke er UUID-er. Serveren bruker `randomUUID()`, fordi
`event_id` og `referstoid` er `uuid` i basen. En referanse som ikke er en UUID,
avvises før lagring.

**Raden avhenger av skriveren (SP-03).** Tilstanden er lik, men raden er det
ikke. Pydantic-modellene lagrer standardverdier og beregnede beløp som klienten
ikke sendte, for eksempel `vedlegg_ids: []` og `krevd_belop`. TS-serveren lagrer
bare det kommandoen og serverens utregning gir, pluss `spor` og
`respondert_versjon` på svar, som historikken viser. Testen låser forskjellen
felt for felt. Med to skrivere i en overgang må kontrakten beskrive hele raden,
eller den andre skriveren må etterlikne modellene. Funnet er ført i
hovedplanen 4.2.

**Feil i prøven, rettet.** TS-kjernen hadde regelversjon 4 etter port 1, mens
Python hadde 5. Ingen test så det, fordi kjernen bare møtte sine egne svar.
Kryss-lesingen ville avvist hvert svar fra Python.
`backend/tests/test_regler/test_regelversjon.py` holder dem nå like.

**Det TS-serveren ikke har.** Den er en prøve, ikke produksjonskode:
- sakopprettelse;
- godkjenningspolicyen. Serveren starter ikke når `BH_APPROVAL_POLICIES` er satt;
- interne notater og synlighetsfilteret. Et internt notat i journalen vises
  til ingen;
- vedlegg;
- Catenda, PDF, innlogging og medlemssynkronisering;
- begrensning av forespørsler, logging og observabilitet.

#### Kostnad ved TS-retningen (P2-4)

Linjetallene er omfangsindikatorer, telt 09.10 med kommentarer og blanklinjer.
De er ikke et estimat i timer.

| Område | Python i dag | Prøvd i port 2 | Hva TS-retningen krever |
| --- | --- | --- | --- |
| Auth | 1 348 linjer. 73 tester i `test_auth` og 230 i `test_security` | Lesesiden: sesjon, CSRF, medlemskap, prosjektgrense og kontraktsside, 317 linjer | Innlogging med Catenda OAuth, sesjonsopprettelse og synkronisering. Databasefunksjonene, som `koe_resolve_identity` og `koe_reconcile_memberships`, er språkuavhengige og kan kalles uendret. To implementasjoner av tilgang i overgangen er den største sikkerhetsrisikoen, så sikkerhetstestene må gå mot begge |
| Godkjenning | 1 906 linjer. 111 tester | Grensen i `validate_items`, 117 linjer i kjernen | Kommandoene, fullmakten, brevets øyeblikksbilde og publiseringen. SQLite-aggregatet skal erstattes i F2/F3 uansett språk, så porten bør følge den ombyggingen |
| Catenda | 7 133 linjer. 48 tester | Ingenting. Teammedlemskapet er stubbet | Den største enkeltblokken. Transporten kan bli i Python bak outboxen, hvis den bare får ferdig, frosset innhold å levere. Det er en hypotese om grensen, ikke prøvd |
| Forsering og EO | 2 888 linjer tjenester og ruter, i tillegg til modellene | Ingenting. Kjernen har ikke hendelsestypene | Reglene må inn i kjernen. Hvor mye av dem klienten speiler i dag, er ikke talt |
| PDF | 606 linjer med ReportLab | Ingenting | `approval_letter.py` vurderer i dag subsidiaritet og setter sammen beslutningslinjen. Den delen er domene og må til TS. Bare gjengivelsen av et ferdig, frosset grunnlag kan bli i Python. En ny gjengivelse av samme grunnlag kan gi andre bytes, så retry må levere det lagrede dokumentet. En dokumentmotor i TS krever ny kontroll av layouten |
| Datalag | 4 405 linjer lagre, med Supabase-stien | `hendelse`: lesing, skriving og versjon, 167 linjer | Databasen, migrasjonene og databasefunksjonene er uendret. Lagrene for `notat`, `sak_metadata`, relasjoner og BIM må portes |
| Tester | Om lag 1 900 testfunksjoner i `backend/tests` | Bevis-sakene, grensetabellen og de genererte forløpene ble brukt uendret, gjennom Python-ruta og TS-serveren | Domene- og bevistestene er språkuavhengige. Rute- og sikkerhetstestene kan kjøres over HTTP mot TS-serveren i overgangen, slik `test_sprakprove_ts_server.py` gjør. Tester av Python-interne enheter må skrives på nytt eller utgå |
| Bygg | gunicorn og `requirements.txt` | Node 22 kjører `.ts` uten byggesteg, og `tsc` typesjekker. Nye pakker: `pg`, `@types/node`, `@types/pg`, og tre transitive pakker låst til eldre versjoner | Det finnes ikke noe produksjonsbilde for en Node-server. `Dockerfile` bygger bare frontenden, og B-12 (hosting) er åpen |
| Worker | Finnes ikke. Levering skjer synkront i forespørselen | Ingenting | Outbox og worker trengs i F2/F3 uansett språk. Designet er språkuavhengig, og Python leser radene TS skriver |
| Overgangsdrift | — | Python og TS leser hverandres rader i samme base. Python opprettet saken og TS skrev resten | Én autoritativ skrivesti per kommando. Til en kommando er flyttet, finnes regelen to steder, som i dag. Hver kommando trenger et fjerningskriterium for den gamle stien |

Gevinsten på den andre siden: de fire speilede modulene port 1 talte
(`vederlagDomain`, `fristDomain`, `grunnlagDomain` og `deriveConfig` i
`src/lib/domain/`) er 1 162 linjer, med 2 331 linjer Vitest-tester. I tillegg
kommer de speilede pytest-testene og vaktene mot drift, og hver framtidig
regelendring som ellers gjøres i begge språk.

#### Hva prøven ikke viser

Prøven viser at én TS-kjerne er teknisk gjennomførbar i nettleser og server,
med tilgang, samtidighet og PostgreSQL. Den viser ikke at modellen i kjernen er
riktig målmodell. Fire ting følger med fra dagens modell, i begge
implementasjoner:
- **Statusene styrer fortsatt handlingene.** `CASE_NOT_CLOSED` avviser
  kommandoer ut fra samlet status, og samlet status bygges delvis av gamle
  sporstatuser. Frafall vises fortsatt som `trukket`. Intensjonen bak GR-U7 er
  motsatt: fakta og relasjoner gir domenepredikater, og predikatene gir både
  tillatte handlinger og statusen som vises. At handlingene, `pending_actions`
  og kommandovalideringen bruker de samme predikatene, er ikke prøvd.
- **Svaret knyttes ved lesing til gjeldende krav, ikke til referansen i
  hendelsen.** Innsendingen kontrollerer referansen, men projeksjonen bruker den
  ikke. Med én kontrollert skriver gir det samme resultat. Med eldre eller
  fremmede rader gjør det ikke. Ført som SP-04.
- **Hendelser kjernen ikke kjenner.** Kjernen lot dem passere uten virkning.
  B-10 sier at en ukjent rettslig relevant hendelse ikke kan overses mens
  bindende kommandoer tillates. Kjernen avviser derfor nå en hendelse den ikke
  kan anvende, også opprettelsen av en sak som ikke er en vanlig KOE-sak.
  TS-serveren svarer 422 på kommandoer, godkjenningspakker og tilstand for en
  slik sak, men journalen kan fortsatt leses. Én skrivesti per kommando er
  altså ikke nok i en overgang: hver skriver må forstå alle hendelser andre
  kommandoer kan ha skrevet på samme sak.
- **Journalformatet.** SP-03 viser at samme tilstand ikke betyr samme rad.
  Hvilke opplysninger en hendelse skal bevare, må avgjøres før en overgang.
  Standardverdiene fra Pydantic skal ikke automatisk bli framtidens format.

Frontendforenklingen er identifisert, ikke gjennomført i skjemaene.
Godkjenningspakken er validert, ikke godkjent og publisert. Kostnadstabellen
anslår omfang, ikke overgangsarbeid eller varig driftskostnad.

#### Anbefaling

**TS er en lovende og teknisk underbygget retning for en felles domenekjerne,
og den foretrukne retningen.** Grunnlaget er oppdragsgivers avgjørelse 09.10
(B-15): når nødvendig saksgrunnlag er lastet, skal brukeren kunne utforske
vurderinger og se tilhørende beregninger og brevutkast uten å vente på
serverkall. Ved innsending validerer serveren på nytt. Da gir bare TS én
regelimplementasjon. Serverbasert forhåndsvurdering ville gitt én
implementasjon også i Python, mot svartid og nettavhengighet i skjemaene. Den
er ikke prøvd.

Produksjonsarkitekturen og migreringsstrategien gjenstår. Før en større
portering anbefales en kort gjennomgang av målmodellen og grensene for
overgangen (#300). Den leverer et lite modellforslag, ikke bare spørsmål, og
prøver modellen mot noen konkrete eksempler før dagens tre spor, boolske felt og
samlede svar blir permanente byggeklosser:

| Forhold | Skillet modellen trenger |
| --- | --- |
| Ett brev med flere standpunkter | Dokumentet og de enkelte rettslige utsagnene i det |
| Enighet om beløp, uenighet om ansvar | Hva enigheten gjelder, og vilkårene for at den får virkning |
| Partene vurderer samme forhold ulikt | Partenes vurderinger og det systemet utleder |
| Manglende eller motstridende opplysninger | Ikke vurdert, ukjent og bestridt |
| Eldre korrespondanse registreres senere | Når noe skjedde, og når systemet fikk vite det |
| Korrigert opplysning eller regel | Det historiske dokumentet, dagens vurdering og en eventuell ny handling |

Gjennomgangen tar også med punktene i «Hva prøven ikke viser» og B-10:
regel- og projeksjonsversjon, gjenoppbygging etter regelendring og
kompatibilitet ved tilbakerulling. Den endrer ikke vedtatt atferd av seg selv.

**Et språkvalg godkjenner ikke prøvekoden.** TS kan velges for den delte
domenekjernen uten å vedta at `sprakprove/kjerne/` blir produksjonskjernen
uendret. Deler kan gjenbrukes, og andre formes på nytt etter modellforslaget i
#300. Valget mellom serverlaget i SvelteKit, en egen backend og en permanent
Python-worker tas heller ikke samtidig.

**Målarkitektur og overgangsarkitektur er to ting.**
- **Overgangen** kan la Python gjengi og levere ferdig, frosset innhold bak
  outboxen i F2/F3, mens TS tar kommandostien én kommando om gangen. Grensen er
  da at TS bestemmer standpunktet, fullmaktsgrunnlaget og beslutningsinnholdet,
  og Python gjengir og leverer det som er frosset. Det er en hypotese om
  grensen, ikke prøvd.
- **Målet** er ikke avgjort av prøven. At en Python-worker er billigst å beholde
  nå, viser ikke at to språk er billigst å vedlikeholde over tid. `node:http` i
  prøven avgjør heller ikke valget mellom serverlaget i SvelteKit og en egen
  backend.

> **Merknad 2026-10-09:** overgangen i det første punktet over er erstattet av
> [B-17](plans/2026-09-16-godkjenning-og-varig-levering.md#b-17) i hovedplanen. TS tar over skrivingen i KOE-saker samlet,
> ikke én kommando om gangen, og endringsordre- og forseringssakene følger med
> (merknaden til B-17 samme dag). Python kan beholde levering og integrasjon.
> Hvor TS-kjernen kjører, er B-18. Teksten over står som skrevet.

**Forbedret Python er fortsatt et forsvarlig alternativ** hvis lavest
overgangsrisiko veier tyngst. Med lokal forhåndsvurdering blir da
dobbeltarbeidet i reglene stående, slik port 1 målte det.

**Usikkerhet:**
- Samme agent skrev kjernen, serveren, adapterne og testene. Forventningene er
  vedtakene og domenetabellen. En feil som kjernen og testadapteren deler,
  fanges bare av kryss-lesingen mot Python.
- Ytelse, produksjonsbygg, utrulling og drift av en Node-server er ikke prøvd.
- To skriveveier på samme sak er prøvd bare for opprettelsen.
- Kostnadstabellen er telt og lest, ikke estimert.

## 8. MA-08: vedlikehold og rekkefølge

Bevis-saker, domenebeslutninger, relasjonsmodell, nullpolitikk og skillet
mellom semantikk og brevtekst er nyttige i begge alternativer. Implementasjonen
av M2 i Python er likevel ikke kostnadsfri å portere; det er beslutningene,
kontraktene og bevisene som er mest gjenbrukbare.

**Merknad etter review 07.10:** M5a er ikke lenger kontrollpunktet for
språkvalget. Det kommer for sent dersom M2/M1/M4 allerede er bygget om.
Gjeldende rekkefølge står under B-14: domenetabell og bevis-saker, smal
kommando-/API-kontrakt, språkprøve, deretter M2/M1 og M4/videre kontraktsarbeid.
Dette flytter bare den nødvendige delen av M5b frem; resten kan tas trinnvis.
Kommende arbeid i godkjenning og datalag vurderes i samme kostnadsbilde.
Unngå en ubestemt pause i alt arbeid. Små kontraktsrettinger og nødvendige
sikkerhetsoppdateringer kan fortsatt ha verdi før språkvalget. Ikke bygg nye
speilregler eller en omfattende generatorplattform uten å vurdere levetiden.

Avhengighetsarbeidet behandles i [vedlikeholdsvurderingen](vurdering-avhengigheter-og-arkitekturvalg-2026-10-07.md).
Den konkretiserer pakkegrupper og
testkrav; den avgjør ikke språk eller database. Flask, Svelte og eksisterende
lagrings-/PDF-adaptere kan beholdes mens kjernen prøves. Et rammeverksbytte,
ny database og en ny dokumentmotor bør ikke blandes inn i samme prøve.

### Korrigering av låste opplysninger

Låsing etter SK-12 består. B-16 skal avklare hvordan feil dato, metode eller
referanse dokumenteres, hvem som kan korrigere, og hva motparten ser.
En eventuell rettelseshendelse peker på originalen og bevarer den;
rettslig virkning må avgjøres uttrykkelig. En registreringsrettelse flytter
ikke automatisk en frist eller omskriver et sendt brev. Ingen slik funksjon
er vedtatt her, og den skal ikke snike seg inn i M2 som en teknisk detalj.

## 9. Hva er endret fra originalen?

| Originalens punkter | Innarbeidet justering |
| --- | --- |
| 1–9, 17–23, 34 | Beholdt domenemålene; skilt modellgevinst fra språkgevinst og presisert servergrensene |
| 10–13 | B-13-presiseringen er allerede vedtatt; tre versjonsbegreper holdes atskilt |
| 14–16 | Journalautoritet er kontrollert for saken; øvrige lagre og klientens refresh-behov er synliggjort |
| 5–6, 33 | Transaksjon, worker og varig levering lagt til; databasen holdes fast i språkprøven |
| 24–25 | Beregningsprototype utvidet til representativ flyt og kontrollert regelendring |
| 26–32, 35–36 | Valg etter målt merverdi, avgrenset tidsramme og migrering; etter review kommer prøven før større språkspesifikk ombygging |

## Verifikasjon og grenser

**Dokumentoppfølging etter review 07.10:** Presiseringene over bygger på
reviewet av #266/#270 og oppdragsgivers tilslutning. B-14 og rekkefølgen er
ført i hovedplanen; B-15/B-16 er åpne. Se [reviewnotatet](review-oppfolging-arkitektur-2026-10-07.md)
for lenkekontroll, issues og GitHub-begrensninger. Ingen nye applikasjonstester
eller prototype er kjørt i dokumentoppfølgingen.

**Kjørt og observert 07.10:** PR #266s ni backend-reproduksjoner ble hentet fra
`4c8860a` og kjørt isolert mot lokal produksjonskode på `68ca0ea` med
`backend/venv/bin/python`, uten prosjektets conftest. De ga ni forventede
`xfail`; med `--runxfail` feilet alle ni på målassertionene. Ingen av disse
kjøringene gikk gjennom HTTP, lagring eller godkjenning. Linjetallene over
ble telt lokalt. Kontrollen av lokale dokumentlenker ga null brutte lenker.

**Lest ut av koden:** regelmodulene, sporprojeksjonen, innsendingen,
godkjenningsvalideringen, PostgreSQL-hendelseslageret, cacheoppdateringen og
frontendens sakskontekst. Hovedplanen og kartleggingen i PR #266 er skilt fra
lokal hovedgren. Juridisk forventet atferd er hentet fra vedtakene; det er
ikke foretatt en ny juridisk vurdering av NS 8407.

**Ikke kontrollert:** live databasekatalog, komplett HTTP-/godkjenningsflyt
for reproduksjonene, full testsuite, en faktisk TypeScript-prototype,
porteringstid, ytelse, IKT-kostnader eller driftsvalg. Dette dokumentet
bevarer og bearbeider forslaget. Senere tilslutning til målretning og
rekkefølge står i hovedplanen; ingen produksjonskode er endret.
