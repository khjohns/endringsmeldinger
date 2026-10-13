# Prøving av forslaget til OV-U3–OV-U7 (13.10)

> Prøvingen gjelder [utkast-vedtak.md](utkast-vedtak.md). Oppdragsgivers svar 13.10 på de fire spørsmålene i avsnitt 6 står i [vurderingen](../../vurdering-behov-forste-versjon-2026-10-13.md).

Prøvd: `forslag-vedtak.md` (utkast 13.10) mot `docs/vedtaksregister/vedtak.toml` på grenen
(commit 44bbb49 med docs-commits), lest i sin helhet for gruppene krav, svar, aksept, grunnlag,
varsler, endringsordre og forsering, sendte brev og arkitektur. Formatet er fra
`docs/vedtaksregister/README.md`. Bakgrunnen er vurderingen 13.10, `vedtak.md` (E1–E7) og
`premisser.md`. Oppdragsgivers retning 13.10 er lagt til grunn. Ingen filer i repoet er endret.

Alvorlighet: **A** må rettes før spørsmålet stilles (strid med gjeldende vedtak eller med
retningen), **B** bør rettes (manglende forhold eller uklarhet som gir to lesninger),
**C** redaksjonelt.

## 0. Tvers av alle fem

### 0.1 «Utsetter» er ikke en art (B)

Registeret har bare `presiserer`, `utvider`, `snevrer inn`, `endrer` og `opphever`. Forslaget
bruker «utsetter» i forholdene til OV-U3, OV-U5 og OV-U7.

Presedensen er OV-U1, som utsatte forsering og EO-sak uten noe forhold, bare med teksten:
«Vedtakene om det som avvises, står; avgrensningen gjelder bare rekkefølgen de bygges i.»

**Anbefaling:**

- Utsettelsen står bare i vedtaksteksten til OV-U7, som i OV-U1. OV-U7 får ingen
  forhold til vedtakene som utsettes.
- Slik at en leser av for eksempel KA-U12 i 3.1 ser utsettelsen, legges en setning uten verb
  først til på slutten av `folge` i hver utsatt post: «Bygges ikke i første versjon
  (OV-U7).» Vakttestene tillater det: i importerte poster kan tekst legges til på
  slutten av Følge, og i nye poster (KA-U34–KA-U39) kan bare `folge` endres. Verktøyet leser
  ikke setningen som et forhold, fordi den ikke begynner med et verb. Temavisningen ser den
  heller ikke, se README, «Det verktøyet ikke ser».
- `endrer` brukes bare der første versjon gjør noe annet enn vedtaket sier, ikke bare
  lar være å bygge det. Det gjelder for eksempel KA-U11, KA-U3, MM-U1, VS-U7 og KA-U16.
  Bruker vi `endrer` for en ren utsettelse, får 25 poster «Endret 13.10 av OV-U7», og
  det er misvisende.
- En egen art «utsetter» krever endring i verktøyet og et vedtak. README sier at listen
  ikke rettes i stillhet. Det anbefales ikke.

### 0.2 «I første versjon» – hva gjelder etterpå? (A, spørsmål til oppdragsgiver)

OV-U3, OV-U4 og OV-U7 er avgrenset til første versjon, mens OV-U7 sier at de utsatte
vedtakene «står og bygges senere». Da kommer KA-U11 i sin opprinnelige form tilbake når
«ingen krav» (KA-U12) bygges. Et spor som ikke er sendt, hindrer da igjen til TE sier
«ingen krav». Retningen 13.10 («et spor som ikke er sendt, hindrer ikke») leses mer naturlig
som en varig endring av KA-U11.

**Spørsmål:** gjelder OV-U3 varig, eller bare til «ingen krav» bygges?

- **A (anbefalt): varig.** OV-U3 endrer KA-U11 uten tidsavgrensning. Når «ingen krav»
  bygges senere, må KA-U12 endres, siden det ikke lenger trengs for å lukke saken.
- **B: bare første versjon.** KA-U11 og KA-U12 gjelder igjen når «ingen krav» bygges.

Det samme gjelder MM-U8, se 3.1.

### 0.3 OV-U5 og OV-U6 mangler forholdet til OV-U4 (B)

Begge sier «unntak fra OV-U4», men har ikke noe forhold til OV-U4. Det riktige forholdet er
`snevrer inn` OV-U4. Begge er nye poster med anker, så forholdet kan føres.

### 0.4 Temavisningen (B, prosess)

Temaet «grunnlagssvar-som-endringsordre» har GR-U10, GR-U12 og GR-U13 i kjernen og
MM-U17 i `vedtak`. OV-U4 (endrer GR-U12 og MM-U17) og OV-U6 (endrer GR-U13) må tas inn i
`temaer.toml`, og visningen må lages på nytt i samme PR. Ellers blir
`test_temavisning.py` rød. Får OV-U5 og OV-U6 forholdet til OV-U4 (0.3), kommer de inn
transitivt.

### 0.5 Kodenavn (ingen funn)

Jeg kjørte vedtaksteksten i alle fem mot mønstrene i `KODENAVN` i verktøyet: backtick,
`snake_case`, `camelCase`, STORE_BOKSTAVER med understrek, `navn()` og filnavn. Det ga
ingen treff. Plassholderne `<n>` og `<dato>` brukes også i gjeldende vedtak (GR-U14,
LV-U4). ID-ene OV-U3–OV-U7 finnes ikke i hovedplanen eller i registeret fra før.

### 0.6 «Sendt» og «fremsatt» (C)

Vedtaksteksten sier «sendt», mens visningsteksten sier «Alle fremsatte krav er avgjort».
AGENTS.md krever samme begrep med samme betydning. Velg ett av ordene. «Fremsatt» er
kontraktens ord, jf. § 5: «fremsettes». Eller si én gang at «fremsatt» i visningen betyr
sendt fra appen.

---

## 1. OV-U3: lukkingen av saken

### 1.1 Strid med KA-U3 og KA-U2: et første krav etter at kravene er avgjort (A)

KA-U2 regner det første kravet som en kravversjon: «`vederlag_krav_sendt` med kravinnhold
…, `frist_krav_sendt`». KA-U3 sier: «Deretter avvises en ny kravversjon, og et nytt krav om
samme forhold går i en ny sak». KA-U11 avviser «ny kravversjon» når kravene er avgjort.

OV-U3 godtar «Et første krav eller varsel i et spor TE ikke har sendt» i samme sak, men
sier ikke at det endrer KA-U3. **Rett:** forholdet `endrer` KA-U3 (et første krav i et spor
som ikke er sendt), og teksten skrives uttrykkelig, se 1.6.

### 1.2 Hva skjer med sperren når et nytt krav åpner saken? (A)

OV-U3 sier: «deretter er kravene ikke lenger avgjort før det nye kravet er det». Sammen med
«Når kravene er avgjort, avvises …» betyr det at sperren faller for alt annet også. Da kan TE
igjen trekke et krav partene er enige om (KA-U6: «så lenge saken ikke er avsluttet»).
Byggherren kan igjen revidere et frafall (GR-U9: revisjonsretten «gjelder til kravene er
avgjort»). Begge kan da gjøres ved at TE sender et første fristkrav.

E1 i `vedtak.md` hadde setningen «sperren gjelder fortsatt for det som var avgjort» (K5),
men den er falt ut av forslaget. **Rett:** legg til «Sperren for grunnlaget og kravene som
var avgjort, står.»

### 1.3 «Som etter KA-U11» er sirkulært, og «kan endre utfallet» er uklart (B)

OV-U3 endrer KA-U11 og viser samtidig til KA-U11 for hvilke kommandoer som avvises. KA-U11
nevner dem: «trekk, ny kravversjon, varsel etter § 33.4 og byggherrens revisjon, også av et
frafall». Det er uklart om disse godtas når kravene er avgjort:

| Kommando | KA-U11/KA-U29 i dag | Forslag |
| --- | --- | --- |
| Byggherrens innsigelse etter § 5 (TFR-06/DRF-01, VS-U9) | Godtas etter Følge i KA-U29 («arbeidsvalg») | Si det uttrykkelig. Innsigelsen endrer ikke utfallet |
| Forespørsel etter § 33.6.2 i et spor som ikke er sendt, men har et varsel | Ikke regulert | Godtas: sporet er ikke avgjort |
| Registrering som dokumentasjon (OV-U4) | – | Godtas (OV-U4 sier det) |
| TEs varseldato (OV-U5) | VS-U7: «Er kravene avgjort, gjelder sperren i KA-U11» | Bør godtas: datoen endrer ikke et svar som er gitt. Si det i OV-U5 |
| Byggherrens endringsordre som svar (OV-U6) | – | Avvises når grunnlaget er avklart. Det er en revisjon (GR-U10) |
| Bestridelse (MM-U7) | Godtas | Utsatt (OV-U7). Setningen om MM-U7 i KA-U11 gjelder ikke |

**Rett:** nevn kommandoene uten å vise til KA-U11, se 1.6.

### 1.4 Gjør et varsel alene sporet «sendt»? (B, spørsmål eller presisering)

KA-U2 sier at et frittstående varsel ikke er en kravversjon. Leses OV-U3 etter KA-U2, hindrer
et fristspor med bare et varsel etter § 33.4 (VS-U15) ikke. Saken kan da vise «Alle fremsatte
krav er avgjort» mens TE har varslet at et krav kommer, og byggherren kan ha en forespørsel
etter § 33.6.2 ute. Det følger av retningen, fordi et varsel ikke er et krav, men det må stå
uttrykkelig. Det må også være entydig om et senere krav i sporet er «et første krav i et spor
TE ikke har sendt».

**Anbefaling:** skriv «et spor der TE ikke har sendt et krav (KA-U2); et varsel alene hindrer
ikke». Visningen viser at sporet er varslet.

### 1.5 Andre gjeldende vedtak som OV-U3 berører (B)

- **KA-U23:** «et vederlagsspor som ikke er sendt, hindrer at kravene er avgjort (KA-U11),
  til TE sier «ingen krav» (KA-U12)». Det er OV-U3 som endrer innholdet, ikke OV-U7. Flytt
  `endrer` KA-U23 til OV-U3 og gi ny ordlyd, som E5: «Et vederlagsspor som ikke er sendt,
  behandles som i andre saker (OV-U3).»
- **GR-U3:** «etter frafall … blir saken `OMFORENT` når vederlag og frist er oppgjort». Første
  ledd gjelder status nå, ikke bare EO-saken. Forhold: `presiserer` GR-U3, med teksten
  «oppgjort gjelder kravene som er sendt». Ikke bare en følge «når endringsordre som egen
  sak bygges».
- **KA-U13 og KA-U14** viser til «ingen krav»: «Et spor TE ikke vil kreve, lukkes med «ingen
  krav» (KA-U12).» og «TE gir avkall på vederlag og frist ved å trekke dem (KA-U6) eller med
  «ingen krav» (KA-U12).» OV-U7 retter bare KA-U23. Ta med begge, se 5.4.
- **KA-U8**, Følge: «Sender det ikke» er presisert av KA-U12: «TE sier uttrykkelig «ingen
  krav»». Når KA-U12 er utsatt, betyr «sender det ikke» igjen at TE ikke sender. Si det i
  OV-U7.
- **MM-U13:** «avklart» «brukes bare der vedtakene sier det (GR-U7, KA-U11 og EO-U5)». OV-U3
  bruker «avklart etter GR-U7». Det dekkes fordi OV-U3 endrer KA-U11, men `presiserer`
  MM-U13 gjør det synlig. Det er valgfritt.
- **TFR-05** (rad uten anker, så ikke noe forhold): «en sak med godkjent eller låst grunnlag
  der resten ikke er sendt, har samlet status `UNDER_BEHANDLING`». Det er forenlig fordi OV-U3
  krever minst ett krav, men bare hvis «resten» leses som at verken vederlag eller frist er
  sendt. Nevn det i Følge.
- **EO-U2 og EO-U5** («et spor TE fortsatt kan sende, hindrer») er utsatt med EO-saken
  (OV-U1). Følgen i forslaget holder for dem. GR-U3 hører ikke med der, se over.

### 1.6 Uklare setninger (B/C)

- «Det får tidspunktet det sendes» har ikke noe klart innhold. Det kan bety serverens dato
  (VS-U8) eller at kravet ikke regnes som fremsatt tidligere. Det kolliderer også med OV-U5
  hvis det første varselet er sendt utenfor appen. **Rett:** «Kravet eller varselet sendt fra
  appen får serverens dato (VS-U8).» Eller stryk setningen.
- «viser varslene som er registrert i sporet» bør omfatte varsler som er sendt fra appen:
  «viser varslene i sporet, sendt fra appen eller med dato oppgitt etter OV-U5».
- «Forkastet: å beholde KA-U11 med ett «ingen krav»» skal være «med «ingen krav» som avkall».
- ««Ingen krav» (KA-U12) bygges ikke i første versjon» gjentar OV-U7. Hver opplysning skal
  ha ett hjem, så stryk setningen her og la OV-U7 eie den.

### 1.7 Forholdene

Forslaget har: «endrer KA-U11 for første versjon; utsetter KA-U12, KA-U15, KA-U17 og KA-U25».
Riktig: `endrer` KA-U11, `endrer` KA-U3, `endrer` KA-U23 og `presiserer` GR-U3. Utsettelsene
står bare i OV-U7 (0.1).

### 1.8 Forslag til ordlyd

> OV-U3: kravene i saken er avgjort når grunnlaget er avklart etter GR-U7, TE har sendt minst
> ett vederlags- eller fristkrav, og hvert vederlags- og fristkrav TE har sendt, er trukket
> eller har en virksom enighet. Et spor der TE ikke har sendt et krav, hindrer ikke; et varsel
> alene er ikke et krav (KA-U2). Visningen sier «Alle fremsatte krav er avgjort», ikke at
> saken er oppgjort eller at TE ikke har flere krav, og taushet er ikke et avkall. Når kravene
> er avgjort, avvises trekk, ny kravversjon og byggherrens revisjon, også av et frafall, for
> grunnlaget og kravene som er sendt. Byggherrens innsigelse etter § 5 og en registrering etter
> OV-U4 godtas. Et første krav eller varsel i et spor der TE ikke har sendt et krav, godtas, også
> når kravene er avgjort. Da er kravene ikke avgjort før det nye kravet er det, men sperren for
> grunnlaget og kravene som var avgjort, står. Ved innsending sier skjemaet at appen ikke
> vurderer om fristene for varsel og krav er overholdt, og viser varslene i sporet. Appen avgjør
> ikke om et senere krav er avskåret. Forkastet: å beholde KA-U11, der et spor som ikke er sendt,
> hindrer til TE sier «ingen krav»; og å avvise et første krav i et spor som ikke er sendt, når
> kravene er avgjort.

Forhold: `endrer` KA-U11, KA-U3 og KA-U23. `presiserer` GR-U3. Eventuelt `presiserer` MM-U13.
Tidsavgrensningen («i første versjon») avhenger av svaret på 0.2.

---

## 2. OV-U4: brev sendt utenfor appen er dokumentasjon

### 2.1 Registrering etter godtatt avslag og etter trekk av grunnlaget (A)

OV-U4: «Registreringen godtas også når kravene er avgjort.» Men #213 sier: «`LUKKET_AVSLATT`
regnes som lukket for nye hendelser og i Catenda». KA-U29 var unntaket, og den er utsatt i
OV-U7. Uten en setning til avvises en registrering etter godtatt avslag (SK-01, #213) og etter
trukket grunnlag (GR-U5, SD-02). `vedtak.md` forutsatte det motsatte: «Etter godtatt avslag
avvises alle kommandoer; registrering som dokumentasjon godtas (E2)».

**Rett:** «Registreringen godtas også når kravene er avgjort, når TE har godtatt avslaget på
grunnlaget, og når grunnlaget er trukket.»

### 2.2 Skjemateksten i KA-U19 må erstattes, ikke bare endres (B)

KA-U19 sier: «et forbehold appen ikke kan uttrykke, sendes utenfor appen og registreres. Det
som bygger på forbeholdet, sperres da». OV-U4 endrer det, men sier ikke hva skjemaet skal si i
stedet. Det er det som gjør sammenfall og enighet (GR-U7, GR-U10) riktig uten merking (K3 i
`vedtak.md`).

**Legg til:** «Skjemaet sier at et brev sendt utenfor appen ikke endrer det parten sender fra
appen, og at parten er bundet av det hen sender fra appen.»

### 2.3 Forhold som mangler (B)

- **MM-U18**, leddet om registrerte brev: «Et ekte registrert brev som entydig er et ensidig
  forsøk på å trekke tilbake en bindende godkjenning, bevares og vises med appens vurdering
  atskilt». Det forutsetter at appen vurderer brevet, mens OV-U4 sier «Appen vurderer ikke
  innholdet». Forhold: `endrer` MM-U18, leddet om registrerte brev, på linje med MM-U19.
- **KA-U18 og KA-U24:** «et registrert brev kan stå uten» begrunnelse, og «En begrunnelse
  som kommer senere, er et eget utsagn». Etter OV-U4 har et registrert svar ingen standpunkter.
  En senere begrunnelse er dokumentasjon, fordi KA-U34 er utsatt og KA-U35 endret. Ta med KA-U18
  og KA-U24 («senere begrunnelse») blant vedtakene OV-U4 endrer, eller si i teksten at en senere
  begrunnelse registreres som dokumentasjon.
- **GR-U13**, registratorens opplysning om § 31.3 for registrerte brev generelt: OV-U4
  gjør endringen, mens OV-U6 bare har unntaket. Forslaget fører hele endringen hos OV-U6. Flytt
  den generelle delen hit, eller la den stå hos OV-U6 med en setning om at den gjelder alle
  registrerte brev.
- **MM-U17:** OV-U4 «endrer» MM-U17, men unntaket i OV-U6 er et registrert svar med
  standpunkt. Si «unntatt OV-U6», eller si i OV-U6 at appens vurdering der følger MM-U17.

### 2.4 Uklarheter (B/C)

- «vises ved sporet det gjelder»: et brev kan gjelde flere spor (MM-U10) eller saken
  generelt. Skriv «ved sporene eller saken den som registrerer, velger».
- Saker som ikke er forstått (MM-U2): «godtas ingen bindende kommando», og visningen sier at
  et varsel «må sendes utenfor appen og registreres senere». Godtas registreringen av
  dokumentasjon i en slik sak? Den er ikke bindende, så den kan godtas. Unntakene i OV-U5 og
  OV-U6 er derimot bindende og må avvises. Si det.
- Et krav eller svar sendt utenfor appen får ingen virkning (jf. AV-09). Skal det få virkning,
  må det sendes fra appen, og da med appens dato. For § 33.6.1 («uten ugrunnet opphold»)
  vurderer byggherren da rettidigheten mot en senere dato enn den faktiske, og OV-U5 dekker bare
  varsler. Det følger av retningen, men det bør stå i Følge eller i skjemaveiledningen, slik at
  sikkerhetsventilen (premiss 1) ikke misforstås.
- «Hver side registrerer bare sine egne brev (KA-U20)»: KA-U20 er samtidig endret (OV-U4) og
  delvis utsatt (OV-U7). Henvisningen gjelder den delen som står. Det holder, men skriv
  «(KA-U20, første ledd)» eller lignende.

### 2.5 Forholdene

Forholdene står i forslaget som tekst. De bør føres som `endrer` til hvert vedtak: KA-U16,
KA-U19, KA-U20, GR-U12, GR-U14, GR-U16, KA-U35, MM-U17, MM-U18, MM-U19, VS-U8 og VS-U11, og
etter 2.3 også KA-U18, KA-U24 og eventuelt GR-U13. «For første versjon» står i vedtaksteksten,
ikke i forholdet. Merking og sperrer er dobbeltført: OV-U4 endrer KA-U16, KA-U19 og KA-U20,
mens OV-U7 utsetter merkingen i KA-U20 og KA-U26–KA-U30. Velg én form. Anbefalt: OV-U4 eier
det første versjon gjør, altså at et registrert brev ikke har virkning. OV-U7 eier listen over
det som bygges senere. KA-U20 nevnes bare i OV-U7 for merkingen, og bare i OV-U4 for at hver
side registrerer sine egne brev.

---

## 3. OV-U5: TEs eget varsel sendt utenfor appen

### 3.1 MM-U8 er både forkastet og utsatt (A)

Vedtaksteksten forkaster MM-U8: «Forkastet: at et varsel registrert etter svaret gjør
preklusjonen uavklart og sperrer TEs aksept (MM-U8)». Forholdene «utsetter MM-U8 (se OV-U7)»,
og OV-U7 sier at de utsatte vedtakene «står og bygges senere». Begge kan ikke gjelde. I tillegg
endrer OV-U5 VS-U7, som bare utvider MM-U8 til § 34.1 («En preklusjon byggherren har påberopt,
blir da uavklart, og TE kan ikke godta svaret før byggherren har svart på nytt»). MM-U8 og VS-U7
må behandles likt.

**Spørsmål til oppdragsgiver**, eller avgjøres med retningen («et svar som alt er gitt, blir
ikke uavklart»):

- **A (anbefalt): `endrer` MM-U8 og VS-U7.** MM-U8 tas ut av OV-U7, og «Forkastet» blir
  stående.
- **B: MM-U8 utsettes.** «Forkastet …» strykes, og VS-U7 utsettes tilsvarende, ikke endres.

### 3.2 «Kravet er det første varselet appen kjenner» passer ikke for § 34.1.2 (A)

OV-U5 sier for alle fire bestemmelsene: «Er ikke noe varsel registrert, viser skjemaet
byggherren at kravet i brev <n> av <dato> er det første varselet appen kjenner.» Men VS-U6
forkaster nettopp «at byggherren vurderer rettidigheten av selve kravet» for § 34.1.2. Utledet
varsel finnes bare for § 33.4 (MM-U1). For § 32.2 er grunnlagskravet selv varselet (LV-U4,
punkt 1), og VS-U15 sier at grunnlagskravet ikke er et varsel etter § 33.4 eller § 34.1.2.

**Rett:** avgrens setningen til § 33.4 og § 32.2. For § 33.4: «det første fristkravet i
sporet, i brev <n> av <dato>». Kjernen knytter i dag vurderingen til siste kravversjon (AV-06),
og den første kravversjonen er det som er riktig etter MM-U1.

### 3.3 SK-12 gjelder ikke § 32.2 (B)

OV-U5: «Datoen settes én gang (SK-12)». SK-12: «Gjelder varselet om fristforlengelse (§ 33.4)
og varslene om rigg/drift og produktivitetstap (§ 34.1.3)», og VS-U6 utvider til § 34.1.2.
§ 32.2 er ikke med. OV-U5 utvider altså SK-12 til § 32.2. SK-12 har ikke noe anker, så det kan
ikke føres som forhold. Skriv det i teksten: «Datoen settes én gang, som etter SK-12, også for
§ 32.2.»

### 3.4 Hvordan byggherren bestrider datoen (B)

MM-U1 («Byggherren kan bestride at varselet ble sendt eller mottatt») endres, og bestridelsen i
VS-U8 endres av OV-U4. MM-U7 er utsatt. OV-U5 sier bare at byggherren tar stilling «i svaret med
opplysningen som premiss».

**Legg til:** «Mener byggherren at varselet ikke ble sendt eller mottatt den dagen, sier hen det
i begrunnelsen for svaret (KA-U24).»

### 3.5 Aksepten og brevteksten (B)

- K4 i `vedtak.md`: aksepten er riktig bare når TE ser hvilket varsel byggherrens standpunkt
  gjaldt. OV-U5 sier «Visningen viser …», men nevner ikke skjemaet for TEs aksept. **Legg
  til:** «… også i skjemaet for TEs aksept.» At svaret viser til varselet det gjelder, følger av
  HF-U1 («Hvert utsagn viser uttrykkelig til det det gjelder: … svaret eller varselet»). Vis til
  HF-U1.
- Brevteksten i LV-U4, punkt 5 og LV-U5 sier ikke hvilket varsel, med dato eller brev,
  byggherren påberoper at kom for sent (AV-07). Det er et oppfølgingsspørsmål, ikke en feil i
  OV-U5. Nevn det i Følge.
- Hvordan oppgir TE datoen? I et brev fra appen, med teksten i LV-U4, punkt 3: «TE opplyser at
  varsel om fristforlengelse etter NS 8407 § 33.4 ble sendt <dato>.» Eller som en registrering
  med dokumentet vedlagt? LV-U3 krever at et utsagn med virkning står i brevteksten for brev
  fra appen. Si hvilken form.

### 3.6 Andre presiseringer (C)

- «byggherren kan revidere svaret (GR-U4)»: GR-U4 gjelder revisjon mens grunnlaget venter.
  Revisjonsretten generelt er avgrenset av SK-03 og GR-U7 («Revisjonsretten etter GR-U4 gjelder
  svar som ikke er godtatt»). Skriv «så lenge svaret ikke er godtatt (SK-03, GR-U7)».
- Når kravene er avgjort: si at opplysningen godtas og ikke endrer utfallet (1.3). Ellers gjelder
  VS-U7 («Er kravene avgjort, gjelder sperren i KA-U11»), som er endret.
- VS-U15 sier at varselet etter § 34.1.2 «sendes utenfor appen og registreres når § 34.1 er
  bygget». OV-U5 er dermed den eneste veien for § 34.1.2 i første versjon. Det er forenlig, men
  bør stå i Følge ved siden av premiss 2 (TEs vederlagsvarsel i skjemaet, BV-03).
- «I tråd med GR-U15» kan nevnes. GR-U15 forutsetter at TE kan «varsle utenfor appen og
  registrere varselet» etter § 32.2.

### 3.7 Forholdene

Forslaget har: «endrer MM-U1 og VS-U7; utsetter MM-U8; presiserer VS-U8 og VS-U6». Riktig:
`endrer` MM-U1 og VS-U7, og MM-U8 etter 3.1 A. `presiserer` VS-U8 og VS-U6. `snevrer inn` OV-U4
(0.3). VS-U16 viser til MM-U8 for retten til å registrere et tidligere varsel. Etter OV-U5 kommer
den retten fra OV-U5. VS-U16 er en ny post, og bare `folge` kan endres der, så skriv det i Følge
hos OV-U5.

### 3.8 Forslag til ordlyd

> OV-U5: unntak fra OV-U4: TE kan oppgi datoen for sitt eget varsel etter § 32.2, § 33.4,
> § 34.1.2 eller § 34.1.3 som er sendt utenfor appen, også etter et krav og etter byggherrens
> svar. Datoen settes én gang, som etter SK-12, også for § 32.2. Visningen sier «TE oppgir at
> varselet ble sendt <dato>», og byggherren tar stilling til rettidigheten i svaret med
> opplysningen som premiss. Mener byggherren at varselet ikke ble sendt eller mottatt den
> dagen, sier hen det i begrunnelsen for svaret (KA-U24). Appen kontrollerer ikke at dokumentet
> er et varsel, eller at datoen er riktig. Er ikke noe varsel etter § 33.4 registrert, viser
> skjemaet byggherren at det første fristkravet i sporet, i brev <n> av <dato>, er det første
> varselet appen kjenner. Et svar byggherren alt har gitt, står med virkningen det hadde og blir
> ikke uavklart. Svaret viser til varselet det gjaldt (HF-U1). Visningen og skjemaet for TEs
> aksept viser hvilket varsel det var, og at TE senere har oppgitt et annet. Appen avgjør ikke om
> svaret omfatter det senere varselet. Byggherren kan revidere svaret så lenge det ikke er
> godtatt (SK-03, GR-U7). Opplysningen godtas også når kravene er avgjort. Forkastet: at et varsel
> registrert etter svaret gjør preklusjonen eller begrensningen uavklart og sperrer TEs aksept.

Forhold (alternativ A i 3.1): `endrer` MM-U1, MM-U8 og VS-U7. `presiserer` VS-U6 og VS-U8.
`snevrer inn` OV-U4.

---

## 4. OV-U6: byggherrens endringsordre som svar på grunnlaget

### 4.1 Strid med KA-U14, leddet om registrert korrespondanse (A)

KA-U14: «Registrert korrespondanse: Om brevet oppfyller § 31.3, må avklares før appen tillater
trekk som kan berøre endringsordren. Manglende opplysning er ikke tilstrekkelig til å
konkludere.» OV-U6 sier at sperren mot trekk ikke gjelder. KA-U14 står ikke blant forholdene.

**Rett:** `endrer` KA-U14, leddet om registrert korrespondanse. Avkallsprinsippet og setningen
om at brev og visning ikke fremstiller trekket som at endringsordren er bortfalt, står. Vis til
den setningen i OV-U6.

### 4.2 Fullmakten: kan en registrert godkjenning gå utenom godkjenningsflyten? (A, spørsmål)

En godkjenning av grunnlaget fra appen går gjennom fullmakten (GFK-06, GR-U13: «fullmakten
kontrolleres i godkjenningsflyten (GFK-06)»). Det gjør også en endringsordre i en EO-sak
(EO-U6). Etter OV-U6 gir en registrert godkjenning enighet ved sammenfall, og den kan ikke
revideres. Forslaget sier ikke om registreringen går gjennom fullmakten. Gjør den ikke det, kan
hvem som helst i byggherrens team binde byggherren i appen ved å registrere. Det er det B-02
punkt 3 skal hindre: «ikke omgå godkjenning» betyr prosedyregaranti.

**Spørsmål:**

- **A (anbefalt): som en godkjenning av grunnlaget etter GFK-06.** Fullmakten regnes av TEs
  krevde beløp og dager.
- **B: uten intern godkjenning.** Endringsordren er allerede utstedt utenfor appen etter
  byggherrens egne rutiner.

### 4.3 Revisjon og når registreringen godtas (B)

- GR-U10: «Byggherren kan ikke revidere godkjenningen.» EO-U9 sier det samme om en endringsordre
  som svar. Si i OV-U6 at byggherren ikke kan revidere svaret. Det følger av GR-U10, men
  setningen «opplysningen gir ingen egen virkning» kan leses som at også bindingen faller.
- Registreringen er et svar på gjeldende kravversjon av grunnlaget (HF-U1, KA-U1). Den godtas
  etter de samme reglene som et svar fra appen. Den avvises når grunnlaget er avklart med
  enighet, når TE har godtatt et avslag (#213) og når kravene er avgjort. Har byggherren svart
  med avslag fra appen, er registreringen en revisjon etter GR-U4. Si det.
- «uten påberopt preklusjon» bør stå, fordi GR-U10 forutsetter det («godkjent grunnlaget
  uten å påberope preklusjon»). Rettidigheten er da ikke vurdert (KA-U4).

### 4.4 Hvilke underkategorier? (B)

§ 32.3 første ledd a er svaret på et varsel etter § 32.2, som gjelder underkategoriene i GR-U11.
I underkategorien EO (§ 31.3) er byggherrens endringsordre grunnlaget for TEs krav (GR-U16), ikke
et svar. For svikt, andre forhold og force majeure finnes det ikke noe svar etter § 32.3 a.
**Rett:** «i en underkategori der § 32.2 gjelder (GR-U11)», eller si uttrykkelig at
registreringen gjelder alle kategorier. Da trengs en begrunnelse.

### 4.5 Forholdet til GR-U10, GR-U12–GR-U14, KA-U13, KA-U22 og OV-U2

- **GR-U10:** «partene er enige ved sammenfall som ved en godkjenning fra appen (GR-U10)».
  GR-U10 sier også «Etter § 32.3 a er svaret en endringsordre», og en godkjenning fra appen i en
  underkategori der § 32.2 gjelder, har sperren i KA-U13. «Som ved en godkjenning fra appen» kan
  derfor leses som at sperren følger med. Skriv «partene er enige ved sammenfall (GR-U10)» og
  stryk «som ved en godkjenning fra appen». Neste setning sier uansett at sperren ikke gjelder.
- **GR-U12:** «Det gjelder også registrert korrespondanse.» OV-U4 endrer dette. OV-U6 er
  unntaket, og der er det byggherrens eget valg, ikke appens utledning av § 32.2. Det holder, men
  si i Følge at GR-U12 ikke avgjør om en registrering etter OV-U6 er en endringsordre. Det gjør
  byggherrens opplysning (GR-U13).
- **GR-U13:** `endrer` for registrerte brev står. Opplysningen er byggherrens, og «Mangler
  opplysningen …» får ingen utløser, fordi opplysningen er vilkåret for unntaket.
- **GR-U14:** brevteksten gjelder svar fra appen. Varianten for registrert krav endres av OV-U4.
  Det er ingen konflikt med OV-U6.
- **KA-U13:** `snevrer inn` er riktig art.
- **KA-U22:** «Et trekk, også av grunnlaget, avvises når appen ikke kan bevare byggherrens
  avtalte rettigheter». Utførelsesplikten etter en endringsordre kan leses som en slik
  rettighet. Si at sperren i KA-U22 ikke gjelder endringsordren, fordi den står utenfor appen og
  ikke berøres av trekket (KA-U14). Ellers vil noen lese KA-U22 som at sperren kommer tilbake.
- **KA-U13 og KA-U14 om «ingen krav»:** se 5.4.
- **OV-U2:** `endrer` er riktig art. Siste del av OV-U2 («det appen ikke kan uttrykke i den,
  som pris og tid, følger KA-U16») erstattes. Ordlyden i E6 kan brukes.
- **MM-U17:** OV-U4 endrer MM-U17. Si om appens vurdering ved registreringen fryses for
  registreringen etter OV-U6. Det er lite som avhenger av det, fordi «avklart» (GR-U7) bare krever
  «godkjent uten preklusjon etter § 32.2», men det bør stå.

### 4.6 Forholdene

Forslaget har: «endrer OV-U2 (siste del) og GR-U13 for registrerte brev; snevrer inn KA-U13».
Riktig: `endrer` OV-U2, GR-U13 og KA-U14. `snevrer inn` KA-U13 og OV-U4.

### 4.7 Forslag til ordlyd

> OV-U6: unntak fra OV-U4: i en underkategori der § 32.2 gjelder (GR-U11), kan byggherren
> registrere sin egen endringsordre, sendt utenfor appen, som sitt svar på gjeldende kravversjon
> av grunnlaget. Byggherren velger «godkjent», påberoper ikke preklusjon og oppgir at brevet er
> en endringsordre etter § 31.3. Registreringen er byggherrens godkjenning av grunnlaget og går
> gjennom fullmakten som en godkjenning av grunnlaget etter GFK-06. Partene er enige ved
> sammenfall (GR-U10), og byggherren kan ikke revidere svaret. Registreringen godtas der et svar
> fra appen ville vært godtatt. Appen viser at byggherren opplyser at brevet er en endringsordre.
> Opplysningen gir ingen egen virkning i appen: trekket av grunnlaget sperres ikke etter KA-U13
> eller KA-U22, og et trekk opphever ikke endringsordren. Brev og visning sier ikke at den er
> bortfalt (KA-U14). Pris og tid i endringsordren vurderes ikke og gir ingen sperre; vederlag og
> frist kreves og besvares i KOE-saken. Forkastet: at registreringen får samme virkning som en
> godkjenning fra appen som er en endringsordre, med sperren i KA-U13; og at endringsordren bare
> er dokumentasjon.

Setningen om fullmakten forutsetter alternativ A i 4.2.

---

## 5. OV-U7: vedtak som utsettes i første versjon

### 5.1 Sammenlikning med utsettelsene i `vedtak.md`

`vedtak.md` har 43 rader med «utsett». 18 av dem er EO og forsering, som OV-U1 alt avviser. De
andre 25:

| Rad i `vedtak.md` | I OV-U7? | Vurdering |
| --- | --- | --- |
| KA-U12, KA-U15, KA-U17, KA-U25 | ja | Riktig |
| KA-U26, KA-U28, KA-U30 | ja (KA-U26–KA-U30) | Riktig |
| KA-U29 | ja, men under «merking» | Feil gruppe, se 5.3 |
| KA-U34, KA-U36–KA-U39 | ja | Riktig |
| MM-U7, MM-U14 | ja | Riktig |
| MM-U8 | ja | I strid med OV-U5 (3.1) |
| VS-U12 | ja | Riktig. VS-U3 påvirkes (5.4) |
| MP-U6 | ja | Feil henvisning, se 5.3 |
| VS-U14 | nei | Har ingen utløser fordi § 34.3.3 avvises (OV-U1). Bør nevnes for å være fullstendig, eller sies å være dekket av OV-U1 |
| DRF-03 | nei | Gjelder § 34.3.3 og er dekket av OV-U1. Greit å utelate |
| MP-U4, MP-U5, MP-U7 | nei | Gjelder bare prøven («Gjelder prøven; ingen endring av produksjonsregler»). Greit å utelate. MP-U7 strider mot OV-U4 dersom den noen gang tas inn |
| MM-U15, MM-U16 | nei | Teknisk (B-10). Ikke domeneutsettelser. Greit å utelate, men si i Følge at lagret resultat ikke bygges (B-10 forenkles) hvis det er meningen |

Dette fra «forenkle»-radene mangler:

- **LV-U4, punkt 8–12:** brevtekstene for protest, passivitet, bestridelse, merking og
  avklaring. Ta dem med. De følger av at kommandoene utsettes, men listen skal være fullstendig.
- **VS-U9:** protestregelen og en egen innsigelse fra byggherren etter svaret. `vedtak.md`:
  «Egen innsigelse etter svaret og protestregelen utsettes». Vurderingen 13.10, avsnitt 3:
  «deler av VS-U1 og VS-U9». Ta med «protestregelen i VS-U9». Om byggherrens egen innsigelse etter
  svaret skal utsettes, må avgjøres. Retningen sier ikke noe om det, og OV-U1 har med «innsigelse
  etter § 5».
- **VS-U1, TEs innsigelse:** `vedtak.md` foreslo å utsette den («TEs innsigelse og protest
  utsettes»), men OV-U7 utsetter bare protesten. Dermed kan TE sende innsigelse etter § 5 fra
  appen i første versjon. Det er forenlig med OV-U1, men avviker fra kartleggingen. Si det
  uttrykkelig, eller ta det med.

### 5.2 Noe er utsatt som en beholdt del forutsetter (A)

- **KA-U27 hører ikke i området KA-U26–KA-U30.** KA-U27 har to deler: fradrag og merket brev.
  `vedtak.md`: «Fradragsdelen beholdes. Merkingsdelen utsettes med KA-U20.» Fradragsdelen henger
  sammen med sperren i KA-U22, som beholdes: «Et trekk … avvises når appen ikke kan bevare
  byggherrens avtalte rettigheter, for eksempel et avtalt fradrag (KA-U9)». **Rett:** «KA-U26,
  KA-U28, KA-U30 og merkingsdelen av KA-U27».
- **«Ingen utledning som bygges, kan forutsette at et utsatt utsagn ikke finnes.»** Det kan
  ikke holdes slik det står. Sammenfall og enighet (GR-U7, GR-U10) er bare riktig når det ikke
  finnes en merking etter KA-U20, som er utsatt (K3). TEs aksept (KA-U1) forutsetter at MM-U8 ikke
  slår til (K4). Det som gjør utledningene riktige, er at parten er bundet av det hen sender fra
  appen, og at visningen viser registrerte brev (OV-U4). Det er ikke at det utsatte utsagnet
  mangler. **Rett:** «En utledning som bygges, sier ikke at et utsatt utsagn ikke finnes:
  visningen viser registrerte brev ved sporet (OV-U4), og parten er bundet av det hen sender fra
  appen.» Eller stryk setningen og la den være en kontroll når spørsmålet stilles, som i
  `premisser.md`.

### 5.3 Vedtak nevnt med feil innhold (B)

- **KA-U29** står under «merking og avklaring av registrerte brev». KA-U29 gjelder alle
  utsagnene uten virkning etter godtatt avslag: «bestridelse av en opplysning, innsigelse etter
  § 5 tredje ledd, protest mot innsigelsen, påberopt passivitet etter § 32.3 annet ledd og
  merking etter KA-U20». Før den opp for seg: «utsagnene uten virkning etter godtatt avslag av
  grunnlaget (KA-U29); registrering som dokumentasjon godtas likevel (OV-U4)». Se også 2.1.
- **MP-U6** gjelder bare metodeprøven (Følge: «Gjelder prøven»). Regelen kom inn i appen
  gjennom VS-U9: «Regelen fra metodeprøven om hva en protest gjelder (MP-U6), tas inn i appen.»
  **Rett:** «protest mot en innsigelse (protesten i VS-U1 og protestregelen i VS-U9)».
- **«kommandoene de gjelder, avvises med en egen avvisning»** passer ikke på alle. MM-U8,
  merkingsdelen av KA-U27 og KA-U36–KA-U39 er sperrer og kontroller, ikke kommandoer. En
  registrering av en senere begrunnelse godtas som dokumentasjon (OV-U4). **Rett:** «Kommandoene
  som bare finnes for disse vedtakene, avvises med en egen avvisning: «ingen krav», merking,
  avklaring, senere begrunnelse fra appen, bestridelse, påberopt passivitet og protest. Sperrene
  og kontrollene i dem bygges ikke.»

### 5.4 Henvisninger til «ingen krav» som også må rettes (B)

OV-U7 retter bare KA-U23 og OV-U1, men flere vedtak viser også til «ingen krav»:

- KA-U13: «Et spor TE ikke vil kreve, lukkes med «ingen krav» (KA-U12).» Etter OV-U3 trenger et
  spor som ikke er sendt, ingen lukking.
- KA-U14: «… eller med «ingen krav» (KA-U12).»
- KA-U8, Følge (se 1.5).
- LV-U3 nevner «ingen krav» som eksempel, og HF-U2 har det i begrepslisten. Begge kan stå.

Forhold: `endrer` KA-U13, eller la setningen i KA-U13 falle med KA-U12. `endrer` KA-U14 følger
allerede av 4.1. Det enkleste er én setning i OV-U7: «Det KA-U8, KA-U13, KA-U14 og KA-U23 sier om
«ingen krav», gjelder ikke i første versjon; et spor som ikke er sendt, følger OV-U3.» KA-U23 bør
likevel endres av OV-U3 (1.5).

VS-U3 nevner § 32.3 annet ledd blant det appen «registrerer og viser utsagnet med frist og
bestemmelse» for. Uten VS-U12 gjelder bare veiledningen (B-13 om passivitet, VS-U2). Nevn VS-U3 i
OV-U7 for § 32.3 annet ledd.

### 5.5 Forholdene

Forslaget har: «endrer OV-U1 og KA-U23; utsetter vedtakene i listen.» Riktig: `endrer` OV-U1, og
eventuelt KA-U13 (5.4). KA-U23 flyttes til OV-U3. Utsettelsene står bare i teksten (0.1), med
setningen «Bygges ikke i første versjon» i Følge hos hver.

### 5.6 Forslag til ordlyd

> OV-U7: i første versjon bygges ikke disse vedtakene: «ingen krav» (KA-U12, KA-U15, KA-U17,
> KA-U25 og teksten for «ingen krav» i KA-U22); merking og avklaring av registrerte brev og
> sperrene de gir (KA-U26, KA-U28, KA-U30, merkingen i KA-U20 og merkingsdelen av KA-U27);
> utsagnene uten virkning etter godtatt avslag av grunnlaget (KA-U29); senere begrunnelse fra
> appen og datokontrollene for registrert begrunnelse (KA-U34, KA-U36–KA-U39); bestridelse (MM-U7,
> MM-U14); TEs påberopelse av passivitet (VS-U12, og VS-U3 for § 32.3 annet ledd); protest mot en
> innsigelse (protesten i VS-U1 og protestregelen i VS-U9); og brevtekstene for dem i LV-U4,
> punkt 8–12. Kommandoene som bare finnes for disse vedtakene, avvises med en egen avvisning, og
> sperrene og kontrollene i dem bygges ikke. Et brev med slikt innhold kan sendes utenfor appen og
> registreres etter OV-U4. Vedtakene står og bygges senere; avgrensningen gjelder rekkefølgen, som
> i OV-U1. Det KA-U8, KA-U13 og KA-U14 sier om «ingen krav», gjelder ikke i første versjon; et spor
> som ikke er sendt, følger OV-U3. OV-U1 endres slik at «ingen krav» tas ut av listen, og
> registreringen av brev sendt utenfor appen følger OV-U4–OV-U6. En utledning som bygges, sier ikke
> at et utsatt utsagn ikke finnes: visningen viser registrerte brev ved sporet (OV-U4). Forkastet:
> å oppheve vedtakene.

MM-U8 er tatt ut etter alternativ A i 3.1. Med alternativ B legges MM-U8 og VS-U7 inn igjen.

---

## 6. Spørsmål til oppdragsgiver

1. **0.2:** gjelder OV-U3 varig (anbefalt), eller bare til «ingen krav» bygges?
2. **3.1:** endres MM-U8 og VS-U7 (anbefalt), eller utsettes de?
3. **4.2:** går byggherrens registrerte endringsordre gjennom fullmakten som en godkjenning av
   grunnlaget (anbefalt)?
4. **5.1:** skal TEs innsigelse etter § 5 og byggherrens egen innsigelse etter svaret (VS-U1,
   VS-U9) være med i første versjon, eller utsettes de som `vedtak.md` foreslo?

Resten kan avgjøres ved å lese vedtakene og er ført som rettinger over.

## 7. Grenser

- Lest: vedtaksteksten, alternativene, svaret, forholdene og Følge for hver post i de nevnte
  gruppene. Fullmakt og intern godkjenning, kontrakt og API, plattform og premissene P1–P7 er bare
  skumlest.
- Kodenavnkontrollen er kjørt med mønstrene fra `docs/verktoy/vedtaksregister.py`. Vakttestene og
  verktøyet er ikke kjørt, fordi ingen post er ført.
- Ikke kontrollert: paragrafmatrisen og bevis-sakene som viser til vedtakene, og PR #476 (VS-U19,
  VS-U21), som ikke er i registeret.
- Påstandene om NS 8407 er gjengitt fra vedtakene og er ikke prøvd mot kontraktsteksten.
