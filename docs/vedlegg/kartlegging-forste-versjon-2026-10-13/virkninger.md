# Automatiske virkninger i TS-kjernen, gjennomgått mot kontrollpunktene

13.10.2026, commit `44bbb49`. Bare lest i repoet. Premissene står i `premisser.md`
i samme mappe. Appen er ikke i produksjon og har ingen reelle data.

**Spørsmålet:** Hvor gir kjernen en handling fra en part mer betydning enn det parten
uttrykkelig valgte? Og hvor ville et brev utenfor appen, registrert bare som dokument,
gjort tilstanden, en sperre, brevteksten eller de tilgjengelige handlingene misvisende?

**Kilder:** `kjerne/utledning/utled.ts` og `visning.ts`, `kjerne/regler/*`,
`kjerne/kommandoer/forutsetninger.ts`, `handlinger.ts`, `avvisning.ts`, `nyttelast.ts`,
`skriving.ts` og `kommando.ts`, `kjerne/frosset/standpunkt.ts`, `brevtekst.ts` og
`frysing.ts`, `kjerne/format/format.ts`, utdrag av `kjerne/tester/kjerne.test.ts` og
`brevtekst.test.ts`, `server/app.ts` og `server/levering.ts`, som er de som tar imot
utledningen. Til sammenlikning: `overordnet_status` og `_ferdig` i
`backend/models/sak_state.py`, `timeline_service.py` (linje 380–390) og
`backend/tests/test_models/test_sak_state_computed.py`. Vedtakstekstene er lest i
avsnitt 3.1 i hovedplanen.

**Hvordan påstandene er belagt:**
- **Lest ut av koden**: det står i koden.
- **Kjørt og observert**: kjørt med `vite-node` mot kjernen gjennom testhjelperne
  `bygg`/`minnebane`. Skriptene `p1.ts` til `p5.ts` lå utenfor
  repoet og er ikke bevart.
- **Antakelse**: skjønn som ikke er prøvd.

## Oversikt

| ID | Kontrollpunkt | Kort | Vedtak koden viser til | Grep |
| --- | --- | --- | --- | --- |
| AV-01 | Sperrer, samlebetegnelser | «Kravene er avgjort» er tre ting i ett: et predikat, en sperre for hele saken og et vilkår for om senere brev får virkning. Lempes predikatet etter premiss 5, blir taushet til avkall | KA-U11, EO-U2, EO-U5, MM-U18, MM-U19 | Skill etiketten fra sperren |
| AV-02 | Samlebetegnelser | Premiss 5 sier «som i Python-rollupen», men Python hindrer også `OMFORENT` når et spor ikke er sendt. Uten «ingen krav» blir en sak med ett spor aldri avgjort og kan ikke gå til EO i TS | KA-U11, EO-U5, KA-U12 | Avklar premisset, så AV-01 |
| AV-03 | Sperrer ved trekk | Trekk sperrer hele sporet, mens brevet sier «dette kravet». Trekk av grunnlaget lukker også spor som ikke er sendt | GR-U5, KA-U22, «vedtaket om trukket krav 05.10» | Behold, gjør sperren synlig |
| AV-04 | Summer, samlebetegnelser | At BH godkjenner hele kravet, blir til «partene er enige» (sammenfall) og sperrer begge parter | GR-U7, GR-U10, KA-U7, GR-U8 | Behold, vis kilden |
| AV-05 | Samlebetegnelser, brevtekst | TE godtar et svar med preklusjon som hovedstandpunkt og subsidiær godkjenning. Det gir «Avsluttet: avslått» og lukker alle spor, men aksepten sier bare «TE godtar …» | SK-01, MM-U13, GR-U7, KA-U1 | Brevet sier virkningen, eller parten velger |
| AV-06 | Kravet som varsel etter § 33.4 | BHs vurdering av rettidigheten knyttes automatisk til siste kravversjon. Brevteksten sier ikke hvilket dokument «varselet» er | MM-U1, VS-U16, SK-12 | La parten velge premisset |
| AV-07 | Videreføring, handlinger | Et varsel registrert etterpå gjør preklusjonen uavklart og sperrer TEs aksept. Etiketten sier «BH har ikke vurdert» | MM-U1, MM-U8, VS-U7 | Vis utsagnene hver for seg |
| AV-08 | Obligatoriske felt | § 33.6.1, § 34.2.2 og § 34.1.2 er påkrevde, men bare «ja» godtas, og svaret lagres ikke | KA-U4 (strid), #304 | Fjern kravet om feltene |
| AV-09 | «Venter på svar», brev utenfor appen | Det finnes ingen kommando for å registrere et krav eller svar sendt utenfor appen. «Venter på svar» blir stående | MM-U17, KA-U20 (bare for rader) | Registrering som dokument, uten utledning |
| AV-10 | Brevtekst, obligatoriske felt | Et vederlagskrav er alltid «et tilbud etter § 34.2.1». TE velger ikke det | (ingen); B-13, LV-U4 | La TE velge metode |
| AV-11 | Brevtekst, handlinger | Godkjenning av grunnlaget blir automatisk endringsordre. Sperren «ikke avklart» kan ikke løses med en kommando | GR-U10, GR-U12, GR-U13, GR-U14, KA-U13, KA-U26 | Behold, merk sperren som ikke løsbar |
| AV-12 | Brevtekst | Det automatiske tillegget «TE er enig i antallet dager» er tvetydig når hovedstandpunktet gir 0 dager | LV-U4 punkt 6, GR-U7 | Presiser teksten |
| AV-13 | Samlebetegnelser, eksport | `varsel_ikke_registrert` vises alltid, og samlestatusen følger med leveringsoppdraget | — | Snevre inn |
| AV-14 | Videreføring | En innsigelse og oppgivelsen av den følger på tvers av kravversjonene i fristen, og leses inn i et registrert svar som er taust om den | VS-U9, VS-U11, arbeidsvalget i paragrafmatrisen | Behold, men synliggjør |

---

## 1. Sperrer ved enighet og trekk

### AV-01: «Kravene er avgjort» binder sammen et predikat, en sperre og om brev får virkning

**Hva koden gjør** (lest ut av koden):

- `kraveneErAvgjort` (`utled.ts`) er sann når grunnlaget er avklart og hvert spor for
  vederlag og frist er trukket, har «ingen krav» eller en virksom enighet:
  ```ts
  u.grunnlagAvklart && KRAVSPOR.every(
    (n) => u.spor[n].trukket || u.spor[n].ingenKrav || enighetensVirkning(u, n) === 'virksom')
  ```
- `forutsetninger` (`forutsetninger.ts`) avviser da alle handlinger i sporene, for begge
  parter og i alle spor, med `KRAVENE_AVGJORT`:
  `if (kraveneErAvgjort(u)) return avvis('KRAVENE_AVGJORT', hvorforAvgjort(u));`
  Det gjelder `krav`, `trekke`, `godta`, `svare`, `revidere`, `varsle`, `sende_varsel` og
  `ingen_krav`. Henvisningene går foran, så innsigelse, protest, bestridelse og de andre
  godtas fortsatt.
- `strid` (`utled.ts`) bruker samme predikat. Er kravene avgjort, gjør en senere rad med
  krav, svar, aksept, trekk, «ingen krav» eller varsel saken *ikke forstått* når raden ikke
  er registrert. Er den registrert, får elementet ingen virkning:
  `kraveneErAvgjort(u) ? 'kravene er avgjort (KA-U11)'`.
- I `visning.ts` gir `status` `avsluttet_oppgjort` («Avsluttet: oppgjort») av samme
  predikat. `kanInngaaIEo` bygger også på det.
- Kjørt og observert (`p2.ts`, sak 3): vederlag og frist er sendt og godkjent fullt. Status
  blir `avsluttet_oppgjort`, TE har ingen handlinger i sporene, og et nytt vederlagskrav
  avvises: «Kravene i saken er avgjort: byggherren har godkjent grunnlaget, partene er
  enige om svaret på kravet om justering av vederlaget og partene er enige om svaret på
  kravet om fristforlengelse.»

**Hva virkningen bygger på:** grunnlagssvaret, enighetene og at det finnes trekk eller
«ingen krav» i hvert spor. I dag hindrer et spor som ikke er sendt, at kravene regnes som
avgjort. Det er EO-U2 («et spor TE fortsatt kan sende, hindrer») og KA-U11. Så lenge det
gjelder, avskjærer ikke sperren et krav ingen har fremsatt.

**Vurdering:** Ingen skjult premiss i dag. Med premiss 5 blir det det. Premisset sier at
et spor som ikke er sendt, ikke skal hindre at saken blir omforent. Lempes
`kraveneErAvgjort` for å oppnå det, gjør de to andre bruksstedene taushet til avkall:

- `forutsetninger` ville avvist TEs første krav i et spor som aldri er sendt, med
  `KRAVENE_AVGJORT`.
- `strid` ville gjort et senere fristkrav fra appen uforstått for hele saken, og et
  registrert fristkrav (brev utenfor appen) uten virkning. Det er nettopp det premiss 5 sier
  ikke skal skje: «alle fremsatte krav er omforent» er ikke det samme som «partene har ikke
  flere krav».

Den samme koblingen gjelder `kanInngaaIEo` (EO-U5: «Et spor TE fortsatt kan sende,
hindrer»). Premiss 5 er derfor i strid med KA-U11, EO-U2 og EO-U5 slik de står. Det bør
avgjøres uttrykkelig, ikke ved å endre predikatet.

**Minimalt grep:** Del predikatet i tre:

1. En **visningsetikett**, «alle fremsatte krav er omforent». Den har ingen sperre.
2. En **sperre** som bare gjelder spor med sendt krav. Sperrene per spor finnes allerede:
   `ENIGHET_I_SPORET` og `KRAV_TRUKKET`.
3. Et **eget vilkår** for EO, som vedtakene avgjør.

`strid` bør da lese sperren, ikke etiketten. Meldingen i `hvorforAvgjort` («partene er
enige om svaret på kravet om …» for hvert spor som ikke er trukket) blir uriktig for et spor
som ikke er sendt, og må følge med.

### AV-03: trekk sperrer hele sporet, mens brevteksten sier «dette kravet»

**Hva koden gjør** (lest ut av koden):

- `utled.ts`:
  `sp.trukket = trekk.some((t) => alleKrav.get(t.gjelder)?.spor === n)` og
  `for (const n of KRAVSPOR) spor[n].trukket ||= spor.grunnlag.trukket;`
- `forutsetninger` avviser da `krav` («Kravet er trukket og kan ikke tas opp igjen»), og
  også `svare`, `revidere`, `godta`, `varsle`, `sende_varsel` og `ingen_krav` i sporet.
- `strid` gjør en ny kravversjon eller et svar i sporet uforstått, eller uten virkning når
  raden er registrert (GR-U5, MM-U20).
- Brevteksten (`utsagnstekst`, `trekk`): «Trekket er avkall på dette kravet, også det
  byggherren har godkjent.» For grunnlaget: «Trekket er avkall på alle krav i saken …»

**Hva virkningen bygger på:** TEs trekk av gjeldende kravversjon. Trekket rettes alltid mot
gjeldende kravversjon (`dokument`, `trekk`: `gjelder: u.spor[k.spor].gjeldendeKrav!.id`).
Brevet identifiserer versjonen («fremsatt i brev N … (verdi)»).

**Vurdering:** Sperren hindrer nye handlinger i hele sporet. Den beskytter ikke bare den
trukne versjonen. Brevet sier «dette kravet», mens appen sperrer sporet. Det er bevisst:
KA-U22 sier at det at kravet ikke kan tas opp igjen, «står i veiledningen i skjemaet, ikke i
brevet». Det samme gjelder KA-U7 (et nytt krav går i en ny sak). Ved trekk av grunnlaget
regnes også spor som ikke er sendt, som trukket. Det dekkes av brevets «alle krav i saken»
(GR-U5, KA-U22).

Gitt premiss 3 er dette en produktsperre. Den er ikke en slutning om rettsstillingen. Hold
den, men den må stå i veiledningen før trekket sendes. Om veiledningen finnes i
TS-skjemaet, er ikke kontrollert.

**Minimalt grep:** Behold. Vis veiledningen fra KA-U22 i skjemaet. Ikke utvid sperren når
premiss 5 tas inn.

### Sperrer ved enighet: se AV-04

---

## 2. «Venter på svar» og fristveiledning

### AV-09: ingen kommando for et krav eller svar sendt utenfor appen, så «venter på svar» blir stående

**Hva koden gjør** (lest ut av koden):

- `venterPaaSvar` (`utled.ts`):
  `s.gjeldendeKrav !== null && s.gjeldendeSvar === null && !s.trukket`.
  Funksjonen gir etiketten `venter_paa_svar` og status `venter_paa_svar` i `visning.ts`.
- Kjernen har ingen frister og ingen fristveiledning. Det finnes ingen datoberegning i
  `kjerne/` utenom `norskDato`, `registrertDato` og kontrollen av kalenderdatoer.
- `Kommando` (`kommando.ts`) har bare tre veier for å registrere noe som er sendt utenfor
  appen:
  - `varsel` (§ 33.4, med `sendt`);
  - `begrunnelse` med `sendt`;
  - `merking`/`avklaring`, som bare gjelder et registrert brev som allerede finnes.
- Det finnes ingen kommando for å registrere et *krav* eller et *svar* sendt utenfor appen.
  `server/app.ts` har bare to ruter: `GET` saken og `POST …/kommandoer`.
- Det betyr at mye bare kan nås gjennom rader skrevet direkte i testene, ikke gjennom
  kommandoene:
  - registrert korrespondanse med krav eller svar (`erRegistrert`, `frysBrev`);
  - MM-U17 og MM-U19 for registrerte brev;
  - `endringsordre: 'ikke_avklart'`;
  - merking av et registrert svar (KA-U20).

**Hva virkningen bygger på:** at det finnes et svar i journalen på gjeldende kravversjon.

**Vurdering:** Premiss 1 sier at hver side registrerer sine egne brev. Svarer BH utenfor
appen, kan svaret i dag ikke registreres som svar, og heller ikke som et nøytralt dokument.
Da skjer dette:

- Saken viser fortsatt «Venter på svar».
- `svare` tilbys fortsatt.
- TE kan ikke godta. Det er riktig, men forklares ikke.

Visningen sier dermed noe journalen ikke vet. Premiss 4 sier at appen ikke skal utlede noe
av dokumentasjon som registreres etterpå. Det taler mot å registrere et slikt brev med
standpunkter som appen tolker. Men en ren registrering av dokumentet («brev fra BH
registrert, ikke uttrykt i appen») ville gjort etiketten riktig.

**Minimalt grep:** Lag en kommando som registrerer et dokument sendt utenfor appen, med
dato og vedlegg og uten krav, svar eller standpunkter. Sporet viser da
«brev registrert etter kravet», ikke `venter_paa_svar`. Ingen sperre eller utledning bygger
på innholdet. Alternativet er å vise etiketten som «ikke svart i appen».

**Fristveiledning:** Ingen funn. Kjernen har ingen. Om skjemaet viser frister ved siden av
kjernen, er ikke kontrollert.

---

## 3. Kravet brukt som varsel etter § 33.4

### AV-06: rettidigheten knyttes automatisk til siste kravversjon, og brevet sier ikke hvilken

**Hva koden gjør:**

- `standpunkter` (`skriving.ts`), lest ut av koden:
  ```ts
  gjelder: u.spor.frist.varsel?.id ?? krav.id   // krav = gjeldende kravversjon
  ```
  BH velger ikke hva vurderingen gjelder. Er et varsel registrert, gjelder den det. Ellers
  gjelder den kravversjonen svaret gjelder. Lesereglene i `utledSporene` godtar bare de to
  (`'rettidigheten viser ikke til kravet eller et varsel før svaret'`). Selv en rad skrevet
  rett i journalen kan derfor ikke vise til den *første* kravversjonen.
- Kjørt og observert (`p2.ts`, sak 1): fristkrav K1 (20 dager), så K2 (25 dager), uten
  varsel. BH svarer `frist_varsel_ok: false`. Standpunktet gjelder K2, den siste
  kravversjonen. Brevteksten sier bare: «Prinsipalt: byggherren gjør gjeldende at varselet
  om fristforlengelse etter NS 8407 § 33.4 kom for sent.» Den sier ikke at «varselet» er
  kravet i et bestemt brev (`VARSELET['33.4']` i `brevtekst.ts`).
- `regnUtSvar` (`standpunkt.ts`) regner alltid med `varsel_type: 'spesifisert'` og
  `har_tidligere_varsel_i_tide: false`, så `frist_varsel_ok` er påkrevd i hvert fristsvar.
  Kjørt og observert (`p1.ts`): «frist_varsel_ok: mangler (§ 33.4)».
- VS-U16 (`forutsetninger`, `sende_varsel`): etter et fristkrav avvises et varsel fra appen
  (`FRISTKRAV_SENDT`). Bare et tidligere varsel kan registreres.

**Hva virkningen bygger på:** at kravet er varselet når ingen varsel er registrert (MM-U1,
«varselet utledet av kravet»). Vedtaket sier ikke hvilken kravversjon. Koden velger den
siste. Ingen test som fastslår det valget, er funnet.

**Vurdering:** Dette er en skjult premiss, en tolkning etter klassifiseringen.

- Om rettidigheten vurderes mot kravet, avgjøres av appen, ikke av noen av partene.
- Ved flere kravversjoner tar appen den seneste datoen. Det er ugunstig for TE, og trolig
  ikke det BH mener.
- Brevet BH sender, sier ikke hvilket dokument påberopelsen gjelder. Det er en svakhet ved
  et kontraktsvarsel (LV-U3: det som ikke står i teksten, er ikke meddelt).
- Premiss 3 sier at appen skal vise hvilke spørsmål parten må ta stilling til. Her tar
  appen stilling til premisset for spørsmålet.

**Minimalt grep:** La BH velge premisset i svaret: «varselet i brev N (registrert)», eller
«TEs krav i brev N brukt som varsel». Standardvalget er den første kravversjonen, og
brevteksten nevner brevet. Alternativt kan premisset alltid knyttes til den første
kravversjonen, og brevteksten identifisere den. Etiketten `varsel_ikke_registrert` (AV-13)
bør henge sammen med dette.

---

## 4. Generert brevtekst

Lest ut av koden: brevteksten skriver ingen av formuleringene i kontrollpunktet, verken
«du har ikke svart», «tidligere varsel foreligger ikke» eller «partene er enige».
`passivitet` («byggherren ikke svarte uten ugrunnet opphold») er TEs eget utsagn. Det
utløses bare av kommandoen `passivitet`. Funnene er:

### AV-05: en akseptert preklusjon eller et akseptert avslag av grunnlaget lukker saken, men brevet sier bare «TE godtar»

**Hva koden gjør:**

- `grunnlagAvvist` (`utled.ts`), lest ut av koden:
  `eg?.grunnlag.kilde === 'aksept' && !grunnlagetErAvklart(...)`.
  Dermed:
  - `forutsetninger` avviser alle handlinger i sporene, også et første krav i et spor som
    ikke er sendt: `'Partene er enige om at grunnlaget er avvist (SK-01).'`;
  - `enighetensVirkning` setter enigheter i vederlag og frist til `uten_virkning`;
  - `strid` gjør senere krav og svar uten virkning eller saken uforstått;
  - visningen gir `avsluttet_avslaatt` og etiketten `avslaatt`.
- Kjørt og observert (`p3.ts`): BH svarer «Prinsipalt: byggherren gjør gjeldende at TEs
  varsel etter NS 8407 § 32.2 kom for sent. Subsidiært: byggherren godkjenner grunnlaget.»
  TE godtar. Brevet TE sender: «TE godtar byggherrens svar på grunnlaget i brev 5 av
  20. september 2026.» Status blir «Avsluttet: avslått», og et nytt fristkrav avvises med
  «Partene er enige om at grunnlaget er avvist (SK-01).»

**Hva virkningen bygger på:** TEs aksept av hele svaret (KA-U1). At en akseptert preklusjon
virker som et avslag, er vedtatt (SK-01, MM-U13: «Et godtatt avslag og en godtatt
preklusjon har samme virkning»). At saken lukkes, står i GR-U7.

**Vurdering:** Aksepten er TEs valg. Men virkningen er at alle krav i saken faller, også
krav som ikke er fremsatt, og den står ikke i brevet. For et trekk har KA-U22 bestemt at
brevet sier avkallet uttrykkelig («Trekket er avkall på alle krav i saken …»). Brevet for
aksepten har ingen tilsvarende setning.

Samlebetegnelsen «avslått» og meldingen «grunnlaget er avvist» beskriver svaret med appens
ord. Det BH sa var «prinsipalt prekludert, subsidiært godkjent». Premiss 3 sier at appen
aldri skal skrive «kravet er prekludert». Etiketten for saken bør si hvem som sa hva.

**Minimalt grep:**
- Gi brevet for en aksept av et grunnlagssvar som ikke avklarer grunnlaget, en fast
  setning om virkningen, etter mønsteret i KA-U22. Alternativt kan TE velge uttrykkelig
  («jeg godtar, og saken avsluttes»).
- Gi etiketten formen «TE har godtatt byggherrens svar på grunnlaget», ikke «avslått».

### AV-10: et vederlagskrav er alltid «et tilbud etter § 34.2.1»

**Hva koden gjør** (lest ut av koden):

- `KRAVINNHOLD.vederlag` (`format.ts`): `metode: { const: 'tilbud' }`.
- `kravtekst` (`brevtekst.ts`): «TE krever justering av vederlaget med … Kravet er et
  tilbud etter NS 8407 § 34.2.1.»
- `regnUtSvar` setter `metode: 'tilbud'` uansett.

**Hva virkningen bygger på:** ingen valg fra TE. Kjernen kjenner bare én metode.

**Vurdering:** Teksten gir TEs krav en rettslig karakter TE ikke har valgt. Den er også
grunnlaget for sammenfallet i AV-04: BHs fulle godkjenning av et *tilbud* binder (KA-U10 viser
til § 34.2.1 første ledd). Premiss 2 krever flere beregningsmetoder. Til de er bygget, sier
brevet noe som ikke passer for et krav etter regningsarbeid eller enhetspriser.

**Minimalt grep:** La TE velge metode, i tråd med premiss 2. Til da skal TE se og bekrefte
setningen i skjemaet. Teksten finnes allerede i den låste teksten (A1), men den vises ikke
som et valg.

### AV-11: godkjenning av grunnlaget blir automatisk en endringsordre

**Hva koden gjør** (lest ut av koden):

- `blirEndringsordre` (`standpunkt.ts`): `b.sammenfall && b.varslingsplikt === true`.
- `standpunkttekst`, `grunnlag`, `godkjent` → `endringsordretekst`: «Svaret er en
  endringsordre etter NS 8407 § 32.3 første ledd a, jf. § 31.3: byggherren krever at
  endringen utføres slik pålegget er beskrevet i TEs krav …»
- Mangler kravet en beskrivelse, avvises brevet med `PAALEGGET_IKKE_BESKREVET`.
- `trekkAvGrunnlagetErSperret` sperrer TEs trekk av grunnlaget når `endringsordre !== 'nei'`.
- For et registrert svar uten opplysning om § 31.3 blir resultatet `ikke_avklart`, og
  trekket sperres med «Det må avklares før grunnlaget kan trekkes». Ingen kommando kan
  oppgi opplysningen om § 31.3 (`hva: 'endringsordre'`). Den finnes bare i rader skrevet
  direkte.

**Hva virkningen bygger på:** BHs valg av «godkjent» og «i tide» i en kategori der § 32.2
gjelder. At svaret er en endringsordre, avgjør appen etter GR-U10, GR-U12 og GR-U14. BH kan
ikke godkjenne uten at svaret blir endringsordre.

**Vurdering:** Det er en vedtatt tolkning av § 32.3 a, og BH ser den i den låste teksten før
brevet sendes. Klienten varsler med `svaretBlirEndringsordre`. Klassifiseringen bør
likevel stå som `tolkning`: appen velger, ikke parten.

Sperren `ikke_avklart` kan i dag ikke løses gjennom kommandoene. Men tilstanden kan heller
ikke oppstå uten registrerte svar (AV-09).

**Minimalt grep:** Behold, men merk sperren som ikke løsbar. Bygges registreringen i AV-09,
trengs en kommando for opplysningen om § 31.3, ellers sperres trekk av grunnlaget for godt.

### AV-12: «TE er enig i antallet dager» legges til automatisk og kan misforstås

**Hva koden gjør:** `utsagnstekst`, `aksept` (`brevtekst.ts`), lest ut av koden. Når
`saken.subsidiaer[spor]` ikke er tom, legges dette til: «TE er enig i beløpet [antallet
dager], men ikke i byggherrens standpunkt til grunnlaget.» Teksten er vedtatt (LV-U4 punkt
6). `brevtekst.test.ts` fastholder den.

**Hva virkningen bygger på:** at svaret er subsidiært til grunnlaget, som utledes av
grunnlagssvaret. TE velger ikke setningen. Enigheten gjelder hele svaret (KA-U1), og
utfallet regnes av hovedstandpunktet: `utfall` gir `dager: 0` når preklusjon etter § 33.4
eller «ingen hindring» er hovedstandpunktet.

**Vurdering:** Er BHs fristsvar «prinsipalt prekludert (§ 33.4), subsidiært 20 dager»,
kan «enig i antallet dager» leses som enighet om 20 dager. Enighetsgrunnlaget sier 0, og GR-U7
sier at aksepten også gjelder «varslingen i sporet». Det er ikke en skjult virkning,
men teksten er upresis om det TE faktisk godtar. Den er antakelsesvis ufarlig når svaret
ikke har noe avvisende hovedstandpunkt.

**Minimalt grep:** Gjengi tallet og hovedstandpunktet («TE godtar … med de standpunktene
svaret har»), eller utelat tillegget når svaret har et avvisende hovedstandpunkt i sporet.
Endringen krever endret LV-U4.

Se også AV-06 (§ 33.4 sier ikke hvilket varsel) og AV-14 («gir opp innsigelsen»).

---

## 5. Hvilket krav et svar gjelder

**Ingen funn.** Lest ut av koden:

- Svaret bærer `gjelder`. `kontrollerSvar` avviser et annet krav enn gjeldende kravversjon
  (`FEIL_KRAVREFERANSE`). Brevteksten sier «… i TEs krav i brev N av dato».
- Aksepten bærer `svar`. `nyttelastkontroll` avviser et annet svar enn det gjeldende
  (`IKKE_GJELDENDE_SVAR`, KA-U1, KT-U1). Brevteksten sier «… svar … i brev N av dato».
- Revisjonen bærer `erstatter` og avvises ved avvik (`FEIL_SVARREFERANSE`).
- Den som svarer eller godtar, ser derfor hvilket objekt handlingen gjelder, både i
  kommandoen og i den låste teksten.

Det appen velger selv, er dette:

- Trekket gjelder gjeldende kravversjon. Brevet identifiserer den, så det er synlig.
- `grunnlagskrav` i et svar på vederlag eller frist er gjeldende grunnlagskrav
  (`skriving.ts`). Det bestemmer om § 34.1.2 blir spurt om (AV-08). Det vises ikke, men gir
  bare et påkrevd «ja».
- Rettidigheten i fristen (AV-06).

---

## 6. Videreføring av tidligere svar til ny kravversjon

Lest ut av koden: et svar følger ikke med til en ny kravversjon.

- `gjeldendeSvar` er svaret på `gjeldendeKrav` (`ikkeErstattet`), så en ny kravversjon
  gir `venter_paa_svar`.
- Aksepten må gjelde det nye svaret.
- Godkjenning, metodeaksept og rettidighet må tas på nytt, fordi feltene er påkrevde i
  `regnUtSvar`.
- En ny kravversjon i et spor med enighet avvises (KA-U7), så enigheten følger ikke med
  heller.

Kjørt og observert (`p5.ts`): et svar på vederlag regnet mot grunnlagsversjon 2 er ikke
subsidiært til et avslag av versjon 1. Funnene er:

### AV-07: et varsel registrert etterpå gjør preklusjonen uavklart, sperrer aksepten og gir en etikett som påstår noe

**Hva koden gjør** (lest ut av koden):

- `Svarberegning.uavklart` (`utled.ts`) inneholder standpunkter etter § 33.4 med
  `!p.iTide && p.gjelder !== varselNaa(s)`.
- `forutsetninger`, `godta`, avviser da med `STANDPUNKT_UAVKLART` («Byggherren må ta
  stilling først»).
- Visningen setter etiketten `bh_har_ikke_vurdert_varselet`.
- `kjerne.test.ts` fastholder det i «et uavklart standpunkt kan ikke godtas (MM-U8, KA-20)».

**Hva virkningen bygger på:** at TE registrerer et varsel med dato etter BHs svar. Det er en
opplysning fra TE, ikke et standpunkt fra BH.

**Vurdering:** Sperren rammer TEs mulighet til å godta, ut fra TEs egen etterregistrering.
Etiketten sier noe om BH («har ikke vurdert») som journalen ikke vet. BH kan ha vurdert
varselet utenfor appen.

Det er i spenning med premiss 4, «Appen utleder ingenting av etterregistrert dokumentasjon.
Partene tar den selv i betraktning». Om et registrert varsel med dato er «etterregistrert
dokumentasjon» i premissets forstand, må oppdragsgiver avgjøre. MM-U8 har uttrykkelig
forkastet «å la TE godta svaret slik brevet uttrykte det», så premisset og vedtaket er i
konflikt hvis svaret er ja.

**Minimalt grep:**
- Hvis premiss 4 gjelder: vis varselet og BHs påberopelse hver for seg. Fjern sperren. TE
  godtar da uttrykkelig BHs standpunkt slik det står. Gi etiketten formen «varsel registrert
  etter svaret».
- Ellers: behold sperren, men rett etiketten.

### AV-14: innsigelsen og oppgivelsen av den følger på tvers av kravversjonene og inn i registrerte svar

**Hva koden gjør** (lest ut av koden):

- `innsigelsenErOppgitt` (`standpunkt.ts`): i fristen teller BHs siste standpunkt om
  rettidighet etter innsigelsen, på hvilken som helst kravversjon:
  `(spor === 'frist' || p.gjelder === gjelder)`.
- `frysBrev`: et registrert svar uten standpunkt om rettidighet får innsigelsen som
  hovedstandpunkt:
  `{ standpunkt: innsigelse, art: 'rettidighet', virkning: 'prinsipalt' }`.
- `standpunkttekst`: når BH velger «i tide» med en åpen innsigelse, skriver appen
  «byggherren gir opp innsigelsen etter NS 8407 § 5 i brev N».

**Hva virkningen bygger på:** BHs egne utsagn: innsigelsen og et senere standpunkt. Det er
vedtatt i VS-U9 og VS-U11, og i arbeidsvalget i paragrafmatrisen om at saken har ett varsel
(SK-12).

**Vurdering:** Appen tolker ikke taushet som oppgivelse (VS-U11). Det er den
konservative retningen. Men et registrert svar får et hovedstandpunkt det ikke uttrykker
selv. Det er en utledning av et registrert brev (premiss 4), om enn fra en tidligere
innsigelse. At oppgivelsen følger på tvers av kravversjonene, er en tolkning. BH ser den i
den låste teksten. Risikoen er antakelsesvis lav.

**Minimalt grep:** Behold. Klassifiser som `tolkning`. Vurder å vise innsigelsen og
svaret hver for seg i visningen av et registrert svar, slik at det ikke ser ut som om
svaret selv sa det.

**Merk** (lest ut av koden, ikke et funn): Etter en ny grunnlagsversjon forblir svaret på
vederlag eller frist subsidiært til grunnlagssvaret som sist gjaldt (GR-U1,
`spor[n].subsidiaer`). Det gir etiketten `subsidiaert` og tillegget i aksepten (AV-12).
Begge gjengir det BH skrev i sitt eget svar, så de er ikke misvisende.

---

## 7. Summer og sammenstillinger

### AV-04: «BH har godkjent hele kravet» blir «partene er enige»

**Hva koden gjør** (lest ut av koden):

- `godkjennerHeleKravet` gir `sammenfall`, som fryses i beslutningsgrunnlaget.
- `utled.ts`:
  `else if (g.beslutningsgrunnlag.sammenfall) spor[n].enighet = { grunnlag: enighetsgrunnlag(g, 'sammenfall'), … }`.
- Enigheten sperrer TEs nye kravversjon («Partene er enige om svaret. Kravet kan ikke
  endres.») og BHs revisjon. TEs aksept avvises (GR-U8).
- Enigheten teller i `kraveneErAvgjort`. Kjørt og observert (`p2.ts`, sak 3): saken blir
  «Avsluttet: oppgjort» uten at TE har sagt noe etter kravet.

**Hva virkningen bygger på:** TEs krav og BHs fulle godkjenning. Python behandler `GODKJENT`
som ferdig på samme måte (`_ferdig` med `ferdig_statuser`).

**Vurdering:** Det er vedtatt (GR-U7, GR-U10, KA-U7), og kontraktsmessig er det et
akseptert tilbud. For vederlag forutsetter det at kravet er et tilbud, som TE ikke har
valgt (AV-10). For frist forutsetter det at «i tide» og «hindring» er besvart med ja.

Meldingene sier «partene er enige», også når TE ikke har sagt noe. Det er en
samlebetegnelse om et utsagn bare den ene parten har gitt. Summer av subsidiære beløp
eller dager regnes ikke som om vilkårene var oppfylt (se under).

**Minimalt grep:** Behold virkningen. La meldingene og visningen si kilden
(«BH har godkjent hele kravet, og det binder begge parter»). `Enighet.grunnlag.kilde`
finnes allerede.

**Subsidiære beløp og dager: ingen funn.** Lest ut av koden og fastholdt i testene:

- `utfall` (`standpunkt.ts`) regner av hovedstandpunktet:
  `dager: prekludert || dager.resultat === 'avslaatt' ? 0 : dager.vurdert`.
- Beløpet er `godkjent` i standpunktet. Preklusjon etter § 34.1 er ikke i kjernen
  (`utenforOmfanget`).
- En enighet på vederlag eller frist har vilkåret `grunnlag_avklart` og vises som
  `enige_betinget` til grunnlaget er avklart (`enighetensVirkning`). Den blir
  `uten_virkning` ved avvist grunnlag eller trekk.
- `utfall` leses ingen steder i kjernen eller serveren utenom `Enighetsgrunnlag`. Kjernen
  har ingen summer på tvers av sporene.
- `subsidiaert_godkjent_dager` lagres i utregningen, men ingen regel leser det.

---

## 8. Tilgjengelige handlinger og obligatoriske felt

### AV-08: påkrevde felt der bare «ja» godtas, og der svaret ikke lagres

**Hva koden gjør:** I `regnUtSvar` → `beregnFrist`/`beregnVederlag` → `kontroller`
(`regler/frist.ts`, `regler/vederlag.ts`), lest ut av koden og kjørt og observert (`p1.ts`,
`p4.ts`):

| Felt | Når påkrevd | Melding når det mangler | `false` gir | Lagres som standpunkt / i brevet |
| --- | --- | --- | --- | --- |
| `spesifisert_krav_ok` (§ 33.6.1) | alltid i fristen (`varsel_type: 'spesifisert'` er hardkodet) | «mangler (§ 33.6.1)» | `VURDERING_UTENFOR_KJERNEN` | nei / nei |
| `aksepterer_metode` (§ 34.2.2) | alltid i vederlaget | «mangler (§ 34.2.2)» | `VURDERING_UTENFOR_KJERNEN` | nei / nei |
| `hovedkrav_varslet_i_tide` (§ 34.1.2) | grunnlagskravets kategori er `svikt` eller `andre_forhold` | «mangler (§ 34.1.2)» | `VURDERING_UTENFOR_KJERNEN` | nei / nei |

Svarformatet har `additionalProperties: false`, og standpunktene i vederlaget er bare
`beloep`. Feltene finnes derfor bare i kommandoen. `kjerne.test.ts` («en lagret rad med en
slik vurdering leses som ikke forstått») viser at et lagret `spesifisert_krav_ok` gjør raden
uforstått.

**Hva virkningen bygger på:** at reglene er portet fra Python med full bredde, mens
kjernen bare har bygget «ja»-grenen.

**Vurdering:** Disse er ikke spørsmål parten tar stilling til. Det finnes bare ett lovlig
svar. KA-U4 sier at et spørsmål som ikke er vurdert, utelates, og at «modellen har ingen
standardverdi». Kjernen krever i stedet et ja som ikke lagres og ikke står i brevet.

Virkningen i appen er ingen, fordi svaret ikke lagres. Men skjemaet tvinger BH til å svare
«i tide» eller «metoden godtas» for å komme videre. Antakelse: et skjema som fyller inn
`true` som standard, gjør det usynlig. `src/lib/domain/fristDomain.ts` har
`spesifisertKravOk: … ?? true`. Om TS-skjemaet bruker det, er ikke kontrollert.

**Minimalt grep:** Ta feltene ut av det påkrevde i `regnUtSvar`, ved å sende
`varsel_type`/`metode` slik at spørsmålene ikke stilles, til alternativet er bygget. Ikke
krev et svar som ikke kan få virkning. Premiss 2 (bredden i skjemaet) taler for å bygge
grenene. Til da skal spørsmålet ikke stilles.

**Handlinger som skjules eller kreves fordi appen antar noe:** ingen nye funn utover
AV-06 (VS-U16 avviser varsel fra appen etter et fristkrav), AV-07 (aksepten sperres),
AV-09 (`svare` tilbys selv om BH har svart utenfor appen) og AV-11 (trekk av grunnlaget
sperres når § 31.3 ikke er avklart). Lest ut av koden:

- `passivitet` tilbys for hvert grunnlagskrav uten å lese om BH har svart. Påberopelsen er
  TEs valg, og appen antar ikke passivitet.
- `ingen_krav` finnes i kjernen (KA-U12) og tilbys TE. Kjørt og observert (`p2.ts`). Premiss
  5 sier at den utsettes. Se AV-02.

---

## 9. Samlebetegnelser («omforent», «avgjort», «lukket»)

### AV-02: premiss 5 bygger på en lesning av Python-rollupen som ikke stemmer, og uten «ingen krav» blir en sak med ett spor aldri avgjort

**Hva koden gjør:**

- **Python** (lest ut av koden): `overordnet_status` gir `OMFORENT` når
  `self._grunnlag_avklart and all(spor.status == SporStatus.IKKE_RELEVANT or self._ferdig(spor) …)`.
  Men `GRUNNLAG_OPPRETTET` setter vederlag og frist fra `IKKE_RELEVANT` til `UTKAST`
  (`timeline_service.py`). Et spor som ikke er sendt etter at grunnlaget er sendt, er
  derfor `UTKAST`, og det hindrer `OMFORENT`. Testen `test_not_omforent_with_utkast_tracks`
  sier det uttrykkelig: «Saken er IKKE omforent fordi vederlag/frist fortsatt kan sendes».
  `IKKE_RELEVANT` slipper gjennom bare i tilstander som er konstruert direkte, som
  `test_omforent_with_laast`. Om en annen vei gjennom hendelsene etterlater et sendt
  grunnlag med `IKKE_RELEVANT` i et annet spor, er ikke kontrollert ut over søket etter
  tilordningene.
- **TS** (kjørt og observert, `p2.ts`, sak 2): grunnlaget er godkjent, vederlaget sendt og
  godkjent fullt, fristen ikke sendt.
  - `kraveneErAvgjort` er `false`.
  - `kanInngaaIEo` er `false`.
  - Status er `under_forhandling` («Under forhandling»), selv om ingenting er uavklart for
    det som er fremsatt.
  - TE får tilbudt `krav:frist`, `ingen_krav:frist` og trekk.

**Hva virkningen bygger på:** EO-U2, EO-U5 og KA-U11: et spor TE fortsatt kan sende,
hindrer.

**Vurdering:**
- Premiss 5 sier «som i dagens Python-rollup». Det er ikke riktig for saker bygget av
  hendelser. Python og TS er like her.
- Utsettes «ingen krav» (premiss 5), har TE bare én vei til en sak som er avgjort og kan gå
  til EO: å sende et krav i sporet og så trekke det, med et brev som sier at det er
  avkall (KA-U22). Det er å tvinge fram et avkall for å lukke saken.
- Samtidig er «Under forhandling» en misvisende samlebetegnelse for en sak der det eneste
  fremsatte kravet er omforent.

**Minimalt grep:** Oppdragsgiver bør få spørsmålet med riktig grunnlag. Python-rollupen
hindrer også. Valget er:

1. Behold KA-U11 og EO-U5, og behold «ingen krav» i første versjon.
2. Utsett «ingen krav» og innfør etiketten «alle fremsatte krav er omforent» uten sperre
   (AV-01), med et eget vedtak om hva EO krever.

### AV-13: `varsel_ikke_registrert` vises alltid, og samlestatusen følger med til leveringen

**Hva koden gjør** (lest ut av koden):

- `etiketter` (`visning.ts`): `else if (spor === 'frist' && !s.varsel) ut.push('varsel_ikke_registrert')`.
  Etiketten vises også når det ikke er sendt noe fristkrav, og når kravet selv brukes som
  varsel (AV-06).
- `lagOppdrag` (`server/levering.ts`) legger `status` fra visningen inn i
  leveringsoppdraget sammen med brevet, for eksempel «Avsluttet: oppgjort» eller
  «Avsluttet: avslått». `gjengiOppdrag` bruker den ikke, og ingen Python-kode leser den i
  dag. Søket i `backend/` fant ingen som leser leveringsoppdraget.

**Vurdering:** Etiketten er en faktisk opplysning, «ikke registrert», men vist uten
sammenheng kan den leses som «varsel mangler». Samlestatusen i oppdraget er appens
samlebetegnelse. Får den en mottaker (Catenda), bærer den AV-04 og AV-05 ut av appen. Om
noen leser den, er ikke kontrollert.

**Minimalt grep:**
- Vis `varsel_ikke_registrert` bare når det er sendt et fristkrav, og si hva rettidigheten
  da knyttes til (AV-06).
- Ta status ut av leveringsoppdraget, eller la den si hvem som sa hva.

Lest ut av koden om de andre samlebetegnelsene:

- `avsluttet_trukket` bygger på TEs trekk av grunnlaget. Brevet sier avkallet (KA-U22).
- `enige`, `oppgjort` og `enige_betinget` bygger på enigheten (AV-04).
- `avklart` er GR-U7, unntaket MM-U13 tillater.
- KA-U20 skjuler `oppgjort` når et brev er merket. Det er partens merking.
- `visning` leses ikke av noen regel. Det er arkitekturtesten INV-MM-9, ifølge
  modulheaderen. Testen er ikke kjørt her.

---

## Verifikasjon og grenser

- **Kjørt og observert:** fem `vite-node`-skript utenfor repoet (ikke bevart) mot kjernen på
  `44bbb49`, gjennom testhjelperne `bygg`/`minnebane` og `regnUtSvar` direkte. De viser:
  - påkrevde felt (`p1.ts`, `p4.ts`);
  - rettidigheten knyttet til siste kravversjon og brevteksten (`p2.ts`, sak 1);
  - en sak med ett spor er ikke avgjort (`p2.ts`, sak 2);
  - sperren `KRAVENE_AVGJORT` (`p2.ts`, sak 3);
  - en akseptert preklusjon og status (`p3.ts`);
  - subsidiært etter en ny grunnlagsversjon (`p5.ts`).

  Skriptene er ikke tester i repoet og er ikke prøvd mot testbasen.
- **Lest ut av koden:** resten. Hele `utled.ts`, `visning.ts`, `forutsetninger.ts`,
  `nyttelast.ts`, `skriving.ts`, `standpunkt.ts`, `frysing.ts`, `brevtekst.ts`,
  `regler/*.ts` og `format.ts` er lest. Fra testene er bare utdrag lest, ikke hele
  `brevtekst.test.ts` (1783 linjer) eller `feilinnfoering.ts`.
- **Ikke kontrollert:**
  - TS-skjemaet i `src/` og hva det viser eller fyller inn (AV-03, AV-08);
  - om leveringsoppdragets `status` får en mottaker (AV-13);
  - om en vei gjennom hendelsene i Python etterlater `IKKE_RELEVANT` etter et sendt
    grunnlag (AV-02);
  - testbasen (`sprakprove/kjernelagring/`);
  - bevis-sakene i `docs/domenetabell/`;
  - modellforslaget utover begrepene som vises til.
- **Vedtaks-ID-ene** er slik koden og testene oppgir dem, kontrollert mot teksten i 3.1
  for MM-U1, MM-U8, MM-U13, MM-U18, MM-U19, MM-U20, KA-U1, KA-U6, KA-U7, KA-U11, KA-U12,
  KA-U13, KA-U22, GR-U5, GR-U7, GR-U8, GR-U10, EO-U2, EO-U5, VS-U9, VS-U11, VS-U15,
  VS-U16, SK-12 og LV-U4.
- **Vurderingene** av «skjult premiss» og «for vid virkning» er målt mot premissene 3–5.
  De er ikke vedtak. Der et premiss er i strid med et vedtak (AV-01, AV-02, AV-07), er det
  oppdragsgiver som må velge.
