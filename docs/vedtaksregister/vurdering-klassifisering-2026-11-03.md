# Vurdering: klassene i vedtaksregisteret

03.11.2026, med svarene 04.11 ført inn. Kontrollert commit: `06bd715` på `main`. Del av #1534,
steg 2.

Kartleggingen gir hver rad i [vedtaksfila](../plans/vedtak.md) én klasse etter valg 1A i
#1534, der prinsippet står ordrett: *vedtak*, *beslutning* eller *design*. Testen som avgjør
klassen, står i [vedtaksskillen](../../.claude/skills/vedtak/SKILL.md), «Hva et vedtak er».
Et vedtak som blander klassene, har klassen *vedtak* og en merknad om designdelen eller
beslutningsdelen. Om raden gjelder, er ikke en klasse, men en tilstand som regnes ut av
forholdene og Følge (kolonnen «Tilstand»). Klassen følger anbefalingene og svarene fra
oppdragsgiver 03.11 i PR #1537 og 04.11 i #1534, og er ikke et vedtak. Ingenting i
[registeret](README.md) eller vedtaksfila er endret, og feltet for klassen kommer i steg 3. Fila er grunnlaget for steg 3 og 4 og blir historisk når
registeret har klassene.

## Grunnlaget

- **Radene.** Registeret har 459 rader: 398 med ID og anker, og 61 eldre rader fra 3.1 uten
  eget anker. De 61 heter her `rad-NNN`, etter plassen i `vedtak.toml` i den rekkefølgen
  `docs/verktoy/vedtaksregister.py` leser dem.
- **Klassene** er satt av elleve subagenter, én per prefiks eller gruppe av små prefikser,
  med teksten og den genererte Følge-cellen for hver rad og prinsippet fra #1534. De har
  ikke lest koden. En ny subagent har kontrollert et utvalg, se «Verifikasjon og grenser».
- **De 37 radene som var *historisk*,** har fått klassen etter testen fra 04.11 av én ny
  subagent, med teksten og Følge for hver rad. Klassen er satt som om raden gjaldt.
- **Tilstanden** er regnet ut med et skript over Følge-cellen fra
  `docs/verktoy/vedtaksregister.py` (`folgecelle`): en rad er opphevet eller erstattet når
  Følge sier «Opphevet *dato* av» eller «Erstattet *dato* av». rad-422 er gjennomstreket og
  opphevet av rad-423. Unntakene står under «Svarene 04.11».
- **Grensetilfellene og kjedene** er samlet fra de elleve rapportene av en egen subagent.
- **Henvisningene** er talt med et skript, ikke ved lesing. Et sted er en linje i en fil
  under git i `kjerne/`, `server/`, `src/` eller `docs/domenetabell/` som nevner ID-en,
  med store eller små bokstaver, også som anker (`#ov-u1`).

```python
import re, subprocess
OMR = ['kjerne/', 'server/', 'src/', 'docs/domenetabell/']
filer = subprocess.run(['git', 'ls-files', *OMR], capture_output=True, text=True).stdout.split()
mønster = re.compile(r'(?<![A-Za-z0-9])(' + '|'.join(sorted(map(re.escape, ids), key=len, reverse=True))
                     + r')(?![0-9A-Za-z])', re.I)
# for hver fil og linje: hver ID mønsteret finner, teller én gang per linje og område
```

## Svarene 04.11

Spørsmålene om klassene etter kartleggingen ble stilt 04.11, og svarene står i
[kommentaren 04.11 i #1534](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623211248). Svarene er arbeidsvalg for #1534 og ikke vedtak. Fila følger dem slik:

- **Svar 1 (A).** Klassen er *vedtak*, *beslutning* eller *design*. «Historisk» er fjernet
  som klasse og står som tilstand i en egen kolonne. Av de 37 radene som var *historisk*, er
  32 opphevet eller erstattet etter Følge. MM-U28, MM-U29, OV-U71 og rad-076 er opphevet når
  Følge rettes i steg 3, og står slik i kolonnen. HF-U20 er gjeldende, med motsigelsen, til
  samlevedtaket for akseptfristen opphever det.
- **Svar 2 (A).** Definisjonene og testen står i vedtaksskillen. Klassen for de 37 radene er
  satt etter den.
- **Svar 3 (A).** GR-U25 og OV-U82 er *vedtak* med beslutningsdel. De andre 40 i mønster 1–6
  beholder klassen fra 03.11. MM-U24 og VS-U10 er fortsatt *design*.
- **MM-U23.** Designdelen flyttes til `system.md` og skrives etter
  [språkreglene](../sprak.md#hva-løsningen-kalles), som i lesningen i kommentaren.
  Merknaden står i raden.
- **Svar 4 og 5 (A).** Hva steg 3 og 4 da skal gjøre, står under «Kjedene» og «Omfanget av
  flyttingen».

## Tellingen

| Prefiks | Vedtak | Beslutning | Design | I alt | Vedtak med designdel | Vedtak med beslutningsdel | Opphevet eller erstattet |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| OV | 60 | 9 | 19 | 88 | 31 | 2 | 8 |
| KA | 41 | 2 | 2 | 45 | 6 | 2 | 8 |
| LV | 35 | 6 | 3 | 44 | 8 | 3 | 0 |
| VS | 36 | 3 | 3 | 42 | 7 | 3 | 0 |
| MM | 24 | 4 | 12 | 40 | 7 | 3 | 5 |
| GR | 29 | 2 | 2 | 33 | 5 | 1 | 4 |
| GFK | 21 | 2 | 0 | 23 | 5 | 2 | 0 |
| HF | 18 | 3 | 1 | 22 | 3 | 0 | 3 |
| DL | 10 | 6 | 0 | 16 | 2 | 1 | 0 |
| EO | 12 | 0 | 2 | 14 | 1 | 1 | 6 |
| KT | 3 | 8 | 0 | 11 | 1 | 2 | 0 |
| FO | 8 | 0 | 0 | 8 | 3 | 0 | 0 |
| B | 0 | 7 | 0 | 7 | 0 | 0 | 0 |
| MP | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| RP | 1 | 0 | 0 | 1 | 0 | 1 | 0 |
| (uten ID) | 35 | 25 | 1 | 61 | 5 | 6 | 2 |
| I alt | 337 | 77 | 45 | 459 | 84 | 27 | 36 |

Av de 423 radene som gjelder, er 306 *vedtak*, 75 *beslutning* og 42 *design*. Av de 36 som
er opphevet eller erstattet, er 31 *vedtak*, 2 *beslutning* og 3 *design*. Tabellen er regnet
med et skript over tabellene under «Tabellen».

## Grensetilfellene

Mønstrene samler de 88 grensetilfellene i de elleve rapportene fra klassifiseringen, én per
prefiks eller gruppe («rapportene»). Oppdragsgiver svarte 03.11 (PR #1537): B for mønster 1–6,
og A for mønster 7–15 og enkelttilfellene. Svarene 04.11 endret klassen for GR-U25 og OV-U82
(mønster 4) og gjorde «historisk» til en tilstand (mønster 7 og 14). Tabellen følger svarene. Teksten under er det som
ble lagt fram.

1. **Visningen der løsningen ikke trekker den rettslige konklusjonen** (juridisk). EO-U11, HF-U22, MM-U23, MM-U24, VS-U2, VS-U10. Anbefalt: *vedtak*, med det som vises som designdel i forløpet. Alternativ: *design*. Teksten sier hva appen viser, men kjernen er hva løsningen regner: fristen etter § 33.7 og § 34.3.3, fristveiledningen regnet fra sendingen, at det ikke er noen fast frist, og at løsningen ikke sier at et krav er prekludert, at passivitet har virkning eller hvilke varsler som er relevante. Rapportene er enige. **Svar 03.11: B.** Svar 04.11 (3): A. MM-U24 og VS-U10 står som *design*, fordi fristveiledningen ikke er en frist etter kontrakten. Designdelen av MM-U23 flyttes til `system.md` og skrives etter språkreglene (se «Svarene 04.11»).

2. **Brevets innhold beskrevet som et felt i skjemaet** (juridisk). GR-U16, KA-U31, KA-U41, LV-U25, LV-U43, OV-U16, OV-U42, OV-U60, OV-U62, OV-U78. Anbefalt: *vedtak*, med feltet, rekkefølgen, forhåndsutfyllingen og logoen og bunnteksten som designdel. Alternativ: *design*. Opplysningen står i brevet eller registreringen motparten ser, og etter valg 1A er brevets innhold vedtak, men teksten beskriver feltet. Rapportene for OV-1 og OV-3 anbefalte *design* for OV-U16 og OV-U62. Samlingen velger *vedtak*: beskrivelsen og datoen er det motparten får vite om brevet, og OV-U62 avgjør hvilke brev som regnes til sporet. **Svar 03.11: B.**

3. **Når brevet er levert, og hva motparten har fått** (juridisk). B-03-DOKUMENT, GFK-U7, LV-U1, LV-U12, LV-U14. Anbefalt: *vedtak*. Alternativ: *beslutning*. Mekanismen er leveringsoppdraget og integrasjonen med Catenda, men regelen avgjør når svaret er sendt og binder, at et nytt forsøk ikke er en ny erklæring, hvilket vedlegg som ble meddelt, og at utkast ikke når motparten. LV-rapporten anbefalte *beslutning* for LV-U12. Samlingen velger *vedtak*, fordi skjermingen av utkastene er tilgang. **Svar 03.11: B.**

4. **Teknisk form som avgjør hva et utsagn betyr eller hva som telles** (juridisk). GR-U25, HF-U1, HF-U2, KA-U2, KA-U4, MM-U39, OV-U31, OV-U82, rad-017. Anbefalt: *vedtak*, med hendelsestypene, lagringen og versjonsfeltet som merknad om beslutningsdelen. Alternativ: *beslutning*. Formen er en liste over hendelsestyper, et lagringsformat, et versjonsfelt eller en betegnelse. Innholdet avgjør likevel hva som regnes som krav, at en manglende vurdering ikke er «i tide», hva «frafalt» betyr, at et sendt svar ikke regnes om, hva trekket omfatter og hva som telles i summene. OV-2-rapporten anbefalte *beslutning* for OV-U31. Samlingen velger *vedtak*, fordi den definerer subsidiært godkjent beløp og mellomlaget. **Svar 03.11: B.** **Svar 04.11 (3): A** for GR-U25 og OV-U82, som er *vedtak* med beslutningsdel: den bindende setningen står ikke i et annet gjeldende vedtak. De sju andre beholder klassen *beslutning*.

5. **Avgrensningen av første versjon som sier hva løsningen regner nå** (juridisk). KT-U8, MM-U2, OV-U7, OV-U13, OV-U14, OV-U34, VS-U22, VS-U23, VS-U35. Anbefalt: *vedtak*, med rekkefølgen som beslutningsdel. Alternativ: *beslutning*. Formen er en rekkefølge, men teksten avgjør hva partene kan sende og hva løsningen utleder til da. Eksempler: en innsigelse etter § 5 er et utsagn uten utledning, fristen i § 35.2 regnes ikke med dato, en registrert forespørsel gir ingen utledet virkning, og det er fastsatt hvem som kan opplyse at et brev er en endringsordre. Rapportene delte seg (OV-U7, OV-U14, OV-U34 og VS-U35 som *beslutning*). Samlingen velger *vedtak*, fordi det løsningen ennå ikke kan, avvises og ikke forenkles, og avvisningen binder partene til den oppheves. **Svar 03.11: B.**

6. **Endringsordren som egen sak etter frafall** (juridisk). GR-U3, GR-U28, rad-182. Anbefalt: *vedtak*. Alternativ: *beslutning*. Deler av teksten sier hvilken sak som eier endringsordren, men det som binder, er hva den omfatter, at den lukker saken, og at EO-saken ikke erstatter TEs krav i KOE-saken. Rapportene er enige. **Svar 03.11: B.**

7. **Bygger på et vedtak som er opphevet** (juridisk). HF-U20, MM-U27, OV-U48, OV-U49. Anbefalt: *historisk*. Alternativ: *vedtak*. HF-U20 presiserer bare HF-U17, og MM-U27 bygger på sperren og vernet som MM-U34 opphevet, men Følge sier ikke at de er opphevet. OV-U48 og OV-U49 er opphevet av OV-U69, men OV-U80 og KA-U45 bygger videre på dem (se motsigelsene). Rapportene anbefalte *vedtak* for HF-U20 og MM-U27 og *historisk* for OV-U48 og OV-U49. Samlingen velger *historisk* for alle fire, men oppdragsgiver må avgjøre om noe av regelen skal stå. Etter kontrollen er MM-U27 *vedtak*: MM-U34 lister det ikke, og punkt 6 løfter bare byggherrens «i tide», så HF-U4 gjelder fortsatt utsagn fra TE. Det er snevret inn, ikke opphevet. Svar 03.11: A. Svar 04.11 (1): «historisk» er en tilstand. OV-U48 og OV-U49 er opphevet, med klassen *vedtak*. HF-U20 er *vedtak* og gjeldende, med motsigelsen, til samlevedtaket for akseptfristen opphever det.

8. **Den bindende setningen står i et annet vedtak** (teknisk). EO-U13, KT-U1, LV-U11, LV-U16, MM-U36, OV-U63, OV-U70, OV-U76, VS-U39. Anbefalt: *design* (*beslutning* for KT-U1 og LV-U11), med henvisning til kilden. Alternativ: *vedtak*. Det eneste som binder, gjentar MM-U12, MM-U35, EO-U8, OV-U79, OV-U82, KA-U1, LV-U7 eller LV-U22, så klassen følger resten når kilden dekker hele setningen. Det må kontrolleres for EO-U13, der kilden bare er prinsippet om at status er en etikett. Rapportene delte seg (EO-U13, LV-U16, MM-U36 og OV-U63 som *vedtak*). Samlingen velger klassen til resten, fordi en regel skal ha ett hjem. Etter kontrollen er EO-U13 *vedtak*, med merket som designdel i BF-06: det slår fast at løsningen ikke utleder noen rettsvirkning av knytningen, og hva merket ikke kan si. Svar 03.11: A.

9. **Regelversjon, utrulling og omregning** (teknisk). B-10, MM-U15, MM-U16. Anbefalt: *beslutning*. Alternativ: *vedtak*. Hoveddelen er versjonering, utrulling og omregning, og garantien om at frosne brev ikke endres, står i MM-U9, MM-U11 og MM-U17. MM-rapporten anbefalte *vedtak* for MM-U16. Samlingen velger *beslutning* av samme grunn som i mønster 8. Etter kontrollen er MM-U16 *vedtak*, med rapporten som beslutningsdel og merknaden på saken som designdel: brevene og standpunktene står, og utledningen følger nye regler. Svar 03.11: A.

10. **Statustekst, merknad og varsel uten egen telling** (teknisk). OV-U10, OV-U21, OV-U40, rad-083. Anbefalt: *design*. Alternativ: *vedtak*. Tellingen bak teksten gir ikke standpunkt, frist eller enighet og sperrer ikke sendingen. Det gir tvil at ordlyden ble valgt for at saken ikke skal si mer enn løsningen har vurdert (KK-05). Status er en etikett i visningen, så rad-083 kan ikke bety at saken er låst. Rapportene er enige. Svar 03.11: A.

11. **Tilgang, fullmakt og medlemskap formulert som drift** (teknisk). DL-U7, DL-U12, DL-U13, GFK-U1, GFK-U11, GFK-U12, RP-U1, rad-374, rad-427, rad-432. Anbefalt: *vedtak*, med drifts- og databasedelen som merknad. Alternativ: *beslutning*. Teksten er en synkroniseringsregel, en driftsparameter eller en utfasing av en tabell. Den avgjør likevel hvem som har medlemskap og hvem som kan lese, godkjenne og sende, og valg 1A regner tilgang som vedtak. DL-U13 avgjør også hvilken kontraktsside et sendt brev står på. Rapportene er enige. Svar 03.11: A.

12. **Driftens nødtilgang og sikringsnivået** (teknisk). rad-284, rad-429. Anbefalt: *beslutning*. Alternativ: *vedtak*. De gjelder driftens tilgang og restrisikoen ved godkjenningen, ikke hva partene kan lese eller sende. Rapportene er enige. Svar 03.11: A.

13. **Opprettelsen av saken og topicen i Catenda** (teknisk). KT-U7, KT-U11, rad-314. Anbefalt: *beslutning*, med arbeidsflyten som designdel i BF-05. Alternativ: *design*. Det meste gjelder webhooken, kanalene og når topicen finnes. At bare TE oppretter KOE-saker, står i OV-U1 og KT-U10. Rapportene anbefalte tre ulike klasser (KT-U7 *vedtak*, KT-U11 *design* og rad-314 *beslutning*). Samlingen velger *beslutning*, fordi spørsmålet er når løsningen skriver til Catenda, og regelen om hvem som oppretter saken, står et annet sted. Svar 03.11: A.

14. **Erstattet i sin helhet, men Følge sier «Endret» eller ingenting** (teknisk). MM-U28, MM-U29, OV-U71, rad-076. Anbefalt: *historisk*, med Følge rettet. Alternativ: *vedtak* for MM-U28 og *design* for MM-U29 og OV-U71, som resten ville hatt. Klassen *historisk* gjelder etter valg 1A bare ved «Opphevet» eller «Erstattet», men MM-U37–MM-U39, MM-U40, OV-U86 og GR-U18 har tatt hele innholdet. Rapportene anbefalte *historisk* bare for rad-076. Samlingen velger *historisk* for alle fire der kontrollen viser at hele innholdet er tatt. Svar 03.11: A. Svar 04.11 (1): de fire har klassen innholdet ville hatt (MM-U28, MM-U29 og OV-U71 *design*, rad-076 *vedtak*) og tilstanden «opphevet når Følge rettes (steg 3)».

15. **Kjernedelen er snudd, men resten står** (teknisk). GR-U19, KA-U20, VS-U29, rad-425. Anbefalt: *vedtak* (*beslutning* for rad-425), som ledd i kjeden. Alternativ: *historisk*. GR-U22, KA-U45, VS-U36 og B-12-DATABASEN snudde kjernedelen. Resten står likevel: hovedkategorien, at hver side registrerer sine egne brev, gjentakelsen i senere svar og plattformuavhengigheten. Blir de historiske, må resten inn i samlevedtaket. Rapportene er enige. Svar 03.11: A.

Enkelttilfeller:

- **KA-U44** (teknisk). Anbefalt: *vedtak*, slått inn i samlevedtaket om byggherrens begrunnelse. Alternativ: *beslutning*. Vedtaket har ingen egen regel og sier bare at KA-U33 og GR-U15 står etter KA-U43. Det er en registermerknad som hører hjemme i Følge for KA-U43. Svar 03.11: A.
- **OV-U75** (teknisk). Anbefalt: *design* (system.md, ordlyden i grensesnittet). Alternativ: *beslutning*. Det er en språkregel for hele grensesnittet som også står i AGENTS.md og språkfila. AGENTS.md viser til OV-U75 ved ID, så henvisningen må følge med hvis vedtaket flyttes. Svar 03.11: A.
- **LV-U26** (teknisk). Anbefalt: *beslutning*. Alternativ: *design*. Valget gjelder hvordan skriften og logoen hentes inn i brevet. At utseendet fryses med brevet, står i LV-U1-kjeden. Svar 03.11: A.

## Motsigelsene i registeret

- OV-U48, OV-U49, OV-U69, OV-U80, KA-U45: OV-U69 opphevet 30.10 OV-U48 og OV-U49, også spørsmålet når en endringsordre registreres etter OV-U6. Likevel utvider OV-U80 (01.11) dem og sier at spørsmålet stilles ved registrering, og KA-U45 (01.11) sier at forbeholdet i et registrert svar fanges etter dem.
- OV-U69 og 16 vedtak: OV-U69 sier at endringene OV-U49 gjorde i andre vedtak, faller bort. Følge i GR-U7, GR-U8, GR-U26, HF-U5, HF-U9, HF-U15, KA-U6, KA-U10, KA-U16, KA-U19, KA-U22, LV-U4, MM-U28, MM-U30, OV-U3 og OV-U61 fører dem likevel uten merknad, og bare OV-U43 sier det. Det samme gjelder OV-U48 i KA-U19 og OV-U6, og OV-U47 i LV-U32.
- KA-U24, KA-U43, OV-U80: KA-U43 opphevet KA-U24 31.10, men OV-U80 (01.11) viser til KA-U24 for at begrunnelsen er unntatt. HF-U7, KA-U34, KA-U41 og VS-U13 viser også til KA-U24 som gjeldende, og HF-U7 viser til KA-U26, som KA-U45 opphevet.
- HF-U17, HF-U20, HF-U22, HF-U14, LV-U31: HF-U20 og HF-U22 presiserer HF-U17, og LV-U31 presiserer HF-U14. MM-U34 opphevet både HF-U17 og HF-U14. HF-U20 og LV-U31 er ikke endret av den grunn, og Følge for HF-U22 begrunner den fortsatt med det HF-U17 tillater.
- MM-U27, HF-U4, HF-U5, MM-U34: MM-U27 bygger på sperren i HF-U4 og vernet i HF-U5, som MM-U34 punkt 6 og 4 opphevet, men MM-U34 lister ikke MM-U27 blant vedtakene det endrer.
- EO-U9, MM-U21, HF-U12: MM-U21 utvider og HF-U12 presiserer EO-U9, som MM-U34 opphevet, og ingen av dem er endret av den grunn.
- EO-U2, EO-U5, EO-U6, EO-U9, OV-U2, OV-U3, OV-U6, EO-U1, GFK-U2, rad-283: Følge og tekst sier at EO-U2, EO-U5, EO-U6 og EO-U9 gjelder, eller må avgjøres, når endringsordre som egen sak bygges. MM-U34 opphevet alle fire 28.10.
- OV-U64, OV-U65, OV-U66, OV-U67, OV-U68: OV-U67 og OV-U68 presiserer OV-U65 og OV-U66, som MM-U34 opphevet, men Følge sier bare at MM-U34 endret dem.
- OV-U51, OV-U52, MM-U34, GR-U22, OV-U41, VS-U26: MM-U34 (28.10) endrer OV-U51, som OV-U52 opphevet 25.10. GR-U22, OV-U41 og VS-U26 fører fortsatt endringer fra OV-U51 uten merknad.
- OV-U71, OV-U86: begge gir merknaden i OV-U10 og OV-U19 ny ordlyd (31.10 og 01.11). OV-U86 viser ikke til OV-U71, og Følge for OV-U71 sier ikke at den er erstattet.
- VS-U37, OV-U52, MM-U8, MM-U4: teksten er uendret der et senere vedtak har satt den ut av kraft, og bare Følge sier det. Setningen om mottaksdatoen i VS-U37 gjelder ikke etter OV-U52, og MM-U8 viser til MM-U4, som MM-U9 opphevet.
- MM-U28, MM-U29, GR-U19, KA-U20, VS-U29, rad-076: Følge sier «Endret» eller «snevret inn», eller ingenting om rad-076, selv om et senere vedtak har tatt hele innholdet eller kjernedelen (mønster 14 og 15).

## Kjedene

| Tema | Vedtakene | Samlevedtak | Hvorfor |
| --- | --- | --- | --- |
| Aksept og enighet om vederlag og frist | FO-U5, GR-U7, GR-U8, GR-U10, GR-U26, GR-U27, HF-U4, HF-U5, HF-U7, HF-U8, HF-U9, KA-U1, KA-U3, KA-U5, KA-U7, KA-U10, KA-U15, KA-U16, KA-U20, KT-U1, MM-U3, MM-U13, MM-U17, MM-U33, MM-U34, OV-U38, OV-U43, OV-U49, OV-U65, OV-U66 | 2 | GR-U7 er presisert, snevret inn og endret av over ti senere vedtak, KA-U3, KA-U5 og KA-U7 er opphevet, og MM-U34 punkt 9 og 10 gjør enigheten til en registrert enighet som løsningen ikke avgjør om står. |
| Byggherrens standpunkt: godkjent, delvis, avslått og nytt tilbud | GR-U7, GR-U26, HF-U7, KA-U9, KA-U21, KA-U24, KA-U42, LV-U31, MM-U34, OV-U59, OV-U88 | 1 | HF-U7 er presisert av GR-U26, LV-U31 og OV-U59 og endret av MM-U34 og OV-U88, og regelen for godkjent, delvis og avslått i KA-U9 må leses med KA-U42. |
| Løsningens rolle og nye standpunkter fram til endringsordren | EO-U11, EO-U12, EO-U13, GR-U27, MM-U33, MM-U34, MM-U35, MM-U36, OV-U69 | 1 | MM-U33 og MM-U34 er begge endret av MM-U35 og EO-U13, snevret inn av GR-U27 og endret eller presisert av OV-U69, EO-U11 og EO-U12. |
| Kravversjon, ny kravversjon og utdyping | HF-U5, HF-U8, HF-U9, KA-U1, KA-U2, KA-U3, KA-U7, KA-U40, MM-U21, MM-U34, OV-U3, OV-U43, OV-U54, OV-U55, OV-U56, rad-001, rad-002 | 1 | Hva en kravversjon er, er snevret inn av OV-U43 og OV-U54, når en ny versjon avvises, gikk gjennom KA-U3 og KA-U7, som begge er opphevet, og OV-U54 er endret av OV-U55, OV-U56 og MM-U34. |
| Kravene er avgjort, og sperren etter det | GR-U23, GR-U24, HF-U9, KA-U7, KA-U11, KA-U12, KA-U28, KA-U29, KA-U34, KT-U9, MM-U19, MM-U22, MM-U34, MM-U35, OV-U3, OV-U10, OV-U43, OV-U49, OV-U52, OV-U55, OV-U65, OV-U66 | 1 | Predikatet i KA-U11 og OV-U3 er endret av OV-U43, OV-U65 og MM-U34 og har fått unntak i OV-U52 og OV-U55, så hva som sperres etter et avgjort krav, krever over ti vedtak. |
| Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | HF-U7, HF-U9, KA-U7, LV-U30, LV-U31, LV-U32, LV-U39, MM-U34, OV-U10, OV-U14, OV-U43, OV-U47, OV-U69, VS-U28 | 1 | OV-U43 endrer VS-U28, OV-U10 og LV-U30 og er selv endret av MM-U34, og brevteksten om fast sum i LV-U31 og LV-U32 er endret av OV-U47 og OV-U69. |
| «Ingen krav», avkall og godtatt avslag | FO-U5, HF-U10, HF-U15, KA-U8, KA-U12, KA-U13, KA-U15, KA-U17, KA-U22, KA-U25, LV-U39, LV-U41, MM-U34, OV-U3, OV-U7, rad-059, rad-081, rad-082 | 2 | Hva «ingen krav» er, når det godtas og hva det gir avkall på, står i fem KA-vedtak, HF-U15 føyer til at aksept av et helt avslag er et avkall som gjelder straks, MM-U34 endret HF-U10, og virkningen av et godtatt avslag av grunnlaget står i tre rader. |
| Trekk og sperrene mot trekk | EO-U12, GR-U5, GR-U22, GR-U25, GR-U27, HF-U9, HF-U10, KA-U6, KA-U7, KA-U13, KA-U14, KA-U22, KA-U27, KA-U30, KA-U45, MM-U22, MM-U34, OV-U6, OV-U49 | 1 | Trekkretten i KA-U6 og GR-U5 er utvidet av GR-U25 og snevret inn av KA-U13, KA-U14, KA-U22 og KA-U27, og delen om merket brev er opphevet av KA-U45. |
| Frafall etter § 32.3 c og byggherrens binding | EO-U1, GR-U3, GR-U9, GR-U17, GR-U18, GR-U20, GR-U21, GR-U23, GR-U24, GR-U28, HF-U5, HF-U8, KA-U11, MM-U34, OV-U3, rad-078, rad-079, rad-282 | 2 | Bindingen er bygget opp av fire GR-vedtak, GR-U21 og GR-U24 er opphevet, MM-U34 endret GR-U17, GR-U20 og GR-U23, og GR-U28 opphevet sperren i GR-U3 mot endringsordre for utført arbeid. |
| Grunnlaget godkjent som endringsordre | EO-U12, GFK-U2, GR-U10, GR-U11, GR-U12, GR-U13, GR-U14, HF-U12, KA-U13, KA-U14, LV-U15, MM-U12, MM-U17, MM-U25, OV-U2, OV-U4, OV-U6, OV-U12, OV-U13, OV-U46, OV-U48, OV-U66, OV-U80, OV-U84 | 1 | GR-U13 snudde kjernedelen i GR-U10 og GR-U12 ved å kreve § 31.3, OV-U6 endret OV-U2 og er selv snevret inn og endret flere ganger, og EO-U12 stryker en del av OV-U6. |
| Endringsordren som omfatter KOE-sakene | EO-U1, EO-U3, EO-U4, EO-U5, EO-U8, EO-U9, EO-U11, EO-U12, EO-U13, EO-U14, GR-U13, HF-U12, KA-U14, KA-U26, KT-U9, KT-U10, LV-U24, MM-U10, MM-U33, MM-U34, MM-U38, OV-U43, OV-U49, OV-U55 | 2 | MM-U34 opphever kandidatreglene, EO-U5 og EO-U9 og endrer EO-U1, EO-U3 og EO-U4, som senere er presisert av EO-U11, EO-U12, KT-U9 og KT-U10; merket på KOE-saken (EO-U13, EO-U14, MM-U38) hører til visningen. |
| Påberopelse av sent varsel, «i tide» og innsigelsen etter punkt 5 | GR-U7, HF-U4, HF-U5, HF-U6, HF-U8, HF-U10, HF-U11, MM-U33, MM-U34, MP-U6, OV-U5, OV-U7, OV-U65, VS-U1, VS-U9, VS-U11, VS-U14, VS-U20, VS-U24, VS-U35 | 2 | HF-U4 er presisert, utvidet, snevret inn og endret av HF-U5, HF-U6, VS-U24 og MM-U34, VS-U1 er snevret inn av VS-U9, VS-U24 og OV-U65, og VS-U35 utsetter den egne innsigelsen. |
| Protest, bestridelse og innlegg, og sperren etter enighet | KA-U29, MM-U7, MM-U14, MM-U34, MM-U35, MP-U4, MP-U6, OV-U7, OV-U64, OV-U65, OV-U66, OV-U67, OV-U68, VS-U9 | 1 | OV-U64–OV-U66 er opphevet av MM-U34, mens OV-U67 og OV-U68, som presiserer dem, står, og bestridelsen er gjort til et innlegg av MM-U34 punkt 24 og MM-U35. |
| Revisjon av byggherrens svar | GR-U4, GR-U7, GR-U17, GR-U20, HF-U5, HF-U6, HF-U14, HF-U21, MM-U9, MM-U24, MM-U34 | 1 | HF-U21 strøk en setning i HF-U5, HF-U14 ble føyd til og opphevet igjen, og MM-U34 endret HF-U5, så hva en revisjon ikke kan senke, står ikke i ett vedtak. |
| Akseptfristen og bortfall av byggherrens svar | HF-U5, HF-U8, HF-U15, HF-U16, HF-U17, HF-U18, HF-U19, HF-U20, HF-U22, MM-U34, OV-U43, OV-U49, OV-U54 | 1 | Fristen er spredt på ni HF-vedtak, MM-U34 opphevet HF-U17 og HF-U19 og endret flere av de andre, og OV-U54 endret HF-U8. |
| Svar på vederlag og frist mens grunnlaget er ubesvart | GR-U4, GR-U26, GR-U29, GR-U33, HF-U5, HF-U7, KA-U16, LV-U41, OV-U45, OV-U46, OV-U49, OV-U69 | 1 | GR-U26 endret GR-U4 og er endret og utvidet av OV-U45 og OV-U46, og ordlyden og plasseringen av forbeholdet er endret i GR-U29, GR-U33 og LV-U41. |
| Vilkår og forbehold i byggherrens svar | GR-U26, KA-U16, KA-U19, KA-U20, KA-U26, KA-U27, KA-U28, KA-U29, KA-U30, KA-U45, LV-U32, MM-U33, MM-U34, MM-U36, OV-U4, OV-U6, OV-U46, OV-U47, OV-U48, OV-U49, OV-U61, OV-U69, OV-U72, OV-U79, OV-U80 | 1 | OV-U69 opphevet OV-U47–OV-U49 og skriver om seks vedtak, KA-U45 fjernet merkingen KA-U16 og KA-U20 bygde på, og OV-U80 og KA-U45 bygger etterpå på de opphevede OV-U48 og OV-U49. |
| Brev og varsel sendt eller registrert utenfor løsningen, og varseldatoen | HF-U4, HF-U5, HF-U13, KA-U20, LV-U4, LV-U19, LV-U21, LV-U29, MM-U1, MM-U8, MM-U24, MM-U34, OV-U4, OV-U5, OV-U6, OV-U9, OV-U11, OV-U13, OV-U15, OV-U16, OV-U17, OV-U18, OV-U19, OV-U20, OV-U24, OV-U29, OV-U41, OV-U44, OV-U46, OV-U62, OV-U69, OV-U70, OV-U79, OV-U80, OV-U81, OV-U84, OV-U85, VS-U6, VS-U7, VS-U8, VS-U28, VS-U34, VS-U38, VS-U39, VS-U40, rad-101, rad-123 | 3 | Hva en registrering er, hvem som registrerer og retter, og når den godtas, står i OV-U4 og HF-U13 med senere unntak i OV-U11, OV-U44, OV-U46, OV-U79 og OV-U80, og OV-U5 snur kjernedelen i MM-U8 og VS-U7 om godtakelsen av svaret og er selv endret av VS-U34. |
| Datoen varslingsplikten løper fra, og kunnskapsdatoen | GR-U22, LV-U4, LV-U21, MM-U21, MM-U34, OV-U5, OV-U24, OV-U34, OV-U41, OV-U51, OV-U52, OV-U53, OV-U55, OV-U56, OV-U80, VS-U25, VS-U26, VS-U37 | 2 | OV-U52 opphevet OV-U51 samme dag med motsatt regel og satte en setning i VS-U37 ut av kraft, og OV-U53 snur regelen i OV-U41 om når en senere kunnskapsdato gjelder. |
| Særskilt varsel etter § 34.1.3 og rigg og drift | KA-U24, KA-U43, KT-U8, MM-U34, OV-U8, OV-U22, OV-U23, OV-U24, OV-U25, OV-U26, OV-U27, OV-U35, OV-U36, OV-U37, OV-U38, OV-U39, OV-U40, OV-U41, OV-U43, OV-U58, OV-U60, VS-U2, VS-U5, VS-U13, VS-U24, rad-026, rad-027 | 2 | OV-U25 snur kjernedelen i OV-U8 og OV-U22–OV-U24 ved at rigg og drift ikke har særskilt varslingsplikt, og VS-U5 snur «prinsipalt avslått» for § 34.1.3 og er endret av KA-U43. |
| Grunnlagskravet: ny versjon, hjemmel og ny sak | GR-U1, GR-U2, GR-U16, GR-U19, GR-U21, GR-U22, HF-U8, HF-U21, KA-U22, OV-U4, OV-U51, OV-U52, OV-U54, OV-U55, OV-U57, OV-U80, rad-073 | 1 | GR-U19 snevret inn GR-U1, GR-U22 snudde GR-U19 om underkategorien og er selv snevret inn av tre OV-vedtak, og opplysningen om endringsordren i GR-U16 er endret av OV-U4 og OV-U80. |
| Retting av sendt brev | EO-U9, MM-U21, MM-U26, MM-U34, OV-U52, OV-U53, OV-U54, OV-U55 | 1 | MM-U21 er presisert av MM-U26 og OV-U54 og snevret inn av tre OV-vedtak, og den utvider EO-U9, som MM-U34 opphevet. |
| Spesifisering etter punkt 33.6.1 og forespørsel etter punkt 33.6.2 | LV-U18, OV-U16, VS-U4, VS-U17, VS-U19, VS-U21, VS-U22, VS-U23, VS-U24, VS-U27, VS-U29, VS-U30, VS-U31, VS-U32, VS-U33, VS-U36 | 2 | VS-U19 er snevret inn tre ganger og presisert to ganger, VS-U36 snur VS-U29 ved å flytte påberopelsen til svaret, og VS-U4 er snevret inn av VS-U21, som VS-U22 utsetter. |
| Eget varsel etter punkt 33.4 fra løsningen | LV-U39, OV-U5, OV-U80, VS-U15, VS-U16 | 1 | VS-U15 er snevret inn av VS-U16 og endret av OV-U5 og LV-U39, og VS-U16 er igjen utvidet og presisert. |
| Hva løsningen utleder og hva den bare viser, og passivitet | HF-U5, HF-U11, HF-U22, LV-U7, MM-U24, MM-U29, MM-U30, MM-U34, MM-U40, OV-U27, OV-U43, VS-U2, VS-U3, VS-U10, VS-U28, VS-U42, rad-115 | 1 | Listene i VS-U3 er presisert flere ganger og endret for punkt 35.2 av VS-U42, VS-U2 er presisert av fire senere vedtak, og MM-U34 punkt 17 stryker akseptfristens virkning i MM-U24; arbeidslista (MM-U29, MM-U40) hører til visningen. |
| Når brevet er sendt, og når fristene regnes | LV-U7, LV-U9, LV-U16, LV-U22, MM-U24, MM-U34 | 1 | LV-U7 er presisert av LV-U9, LV-U16, LV-U22 og MM-U24 og endret av MM-U34. |
| Den vedtatte brevteksten i LV-U4 | DL-U6, GR-U14, GR-U15, GR-U26, GR-U32, KA-U34, KA-U45, LV-U4, LV-U5, LV-U6, LV-U8, LV-U10, LV-U18, LV-U20, LV-U21, LV-U30, LV-U31, LV-U32, LV-U33, LV-U34, LV-U35, LV-U38, LV-U39, LV-U40, LV-U41, LV-U42, MM-U34, OV-U4, OV-U28, OV-U29, OV-U32, OV-U43, OV-U49, OV-U52, OV-U54, OV-U55, OV-U78, OV-U80, VS-U26, VS-U34, VS-U37 | 3 | LV-U4 er endret av over 30 senere vedtak, og LV-U34, LV-U35, LV-U39 og LV-U41 endrer kjernedeler med leseregler; henvisningen til NS 8407 er snudd tre ganger (LV-U6, LV-U34, LV-U40). |
| Lagene i byggherrens svar: prinsipalt og subsidiært | GR-U26, LV-U4, LV-U21, LV-U31, LV-U34, LV-U36, LV-U37, LV-U39, LV-U40, LV-U41, MM-U11, OV-U28, OV-U30, OV-U32, OV-U33, OV-U42, OV-U73, OV-U74 | 1 | LV-U34 snur LV-U4 punkt 4 med lagslinjen, OV-U32 endrer OV-U30 og er snevret inn av OV-U33, og OV-U74 er selv endret av LV-U39. |
| Forholdet som begrep, og begrepene i hendelsene | GR-U26, GR-U29, GR-U32, HF-U2, KA-U22, KA-U34, LV-U4, LV-U41, LV-U43, MM-U23, OV-U45, OV-U78, OV-U82, OV-U83, VS-U13 | 1 | LV-U41 snur «grunnlaget» til «forholdet» med en leseregel over flere vedtak, OV-U78 endrer tittelen i LV-U4, OV-U82 definerer forholdet, og HF-U2 er utvidet av MM-U23 og endret av OV-U83. |
| Brevet som dokument: hva som fryses, levering og merking | B-03-DOKUMENT, B-19, EO-U14, LV-U1, LV-U2, LV-U11, LV-U15, LV-U23, LV-U24, LV-U25, LV-U26, LV-U27, LV-U28, LV-U44, MM-U10, MM-U22, rad-198 | 2 | LV-U1 fryser brev og vedlegg og sju senere LV-vedtak legger til hver sin del, B-03-DOKUMENT er presisert av MM-U22, LV-U11 og LV-U24, og LV-U44 snur løpenummeret i LV-U24. |
| Sendte brev og regelendring | GR-U12, GR-U13, HF-U5, HF-U9, HF-U13, KA-U10, MM-U3, MM-U9, MM-U11, MM-U12, MM-U16, MM-U17, rad-017 | 1 | MM-U9 fryser virkningen, MM-U11 unntar sammensetningen til utfall, MM-U17 endrer tidspunktet for registrerte brev, og merknaden i rad-017 er snevret inn av tre av dem. |
| Saker kjernen ikke forstår, og strid med enighet | HF-U1, HF-U4, HF-U5, MM-U2, MM-U14, MM-U18, MM-U19, MM-U20, MM-U27, MM-U34, MM-U39, OV-U4 | 1 | MM-U18 er utvidet av MM-U19, MM-U20 og MM-U27 og endret av OV-U4, og MM-U34 snur kjernedelen i MM-U19 og fjerner grunnlaget for MM-U27. |
| Betegnelser, sakslisten og nøkkeltallene | MM-U22, MM-U28, MM-U30, MM-U31, MM-U37, MM-U38, MM-U39, OV-U3, OV-U10, OV-U43, OV-U49, OV-U61, OV-U69 | 1 | MM-U28 er endret av tre vedtak 02.11 og OV-U61 av tre senere, endringen fra OV-U49 falt bort med OV-U69, og betegnelsene i MM-U22, MM-U30 og MM-U31 hører til visningen. |
| Statusteksten og merknaden om registrerte brev | HF-U13, MM-U22, OV-U4, OV-U10, OV-U19, OV-U21, OV-U43, OV-U62, OV-U70, OV-U71, OV-U81, OV-U86 | 0 (design) | Ordlyden er endret tre ganger på to dager, og OV-U71 og OV-U86 gir begge ny ordlyd for OV-U10 og OV-U19; teksten hører til forløpet, ikke et samlevedtak. |
| Avgrensningen av første versjon | KA-U45, KT-U7, MM-U34, MM-U35, OV-U1, OV-U7, OV-U55, OV-U64, OV-U65, VS-U35 | 1 | Hva som avvises i første versjon, er endret og snevret inn i flere runder, blant annet av MM-U34, MM-U35 og KA-U45, så lista må settes sammen av alle. |
| Hvem som oppretter hvilken sak, og topicen | KT-U3, KT-U4, KT-U6, KT-U7, KT-U9, KT-U10, KT-U11, LV-U9, OV-U1 | 1 | KT-U7 presiserer OV-U1 og er presisert av KT-U9 og KT-U10, KT-U11 endrer når saken opprettes, og KT-U3 er presisert av KT-U4 og LV-U9. |
| Forsering: aksept av fristavslag, 30 %-grensen og verdien av dagene | FO-U1, FO-U3, FO-U5, FO-U7, FO-U8, GFK-U3, GFK-U4, GFK-U16, GFK-U17, GFK-U18, GFK-U19, GFK-U20, GFK-U21, GFK-U22, GFK-U23, HF-U5, KA-U1, MM-U34, OV-U2 | 2 | Sperren mot aksept i FO-U5 er utvidet av HF-U5 og avgrenset av OV-U2, FO-U3 er presisert fire ganger 31.10, og dagmulktsatsen og verdien av fristdagene (GFK-U3, GFK-U17) er presisert i to ledd av seks GFK-vedtak. |
| Fullmakt og godkjenningskjeden | B-06, EO-U6, FO-U6, GFK-U1, GFK-U2, GFK-U6, GFK-U10, GFK-U11, GFK-U12, GFK-U13, GFK-U14, GFK-U15, rad-190, rad-281, rad-282, rad-283 | 2 | GFK-U6 snudde fullmakten fra registrerte fullmakter til en grense per rolle, GFK-U10 er presisert av tre senere vedtak, og FO-U6 snur kjernedelen i rad-190. |
| Medlemskap og lesetilgang | B-02, B-04, DL-U7, DL-U8, DL-U9, DL-U10, DL-U11, DL-U12, DL-U15 | 2 | DL-U7 er presisert av DL-U8 og DL-U9, DL-U10 er utvidet av DL-U11, som er presisert av DL-U15, og DL-U15 endrer B-02 for lesing. |
| Byggherrens begrunnelse: plikten og datokontrollen | HF-U7, KA-U18, KA-U21, KA-U24, KA-U31, KA-U32, KA-U34, KA-U35, KA-U36, KA-U37, KA-U38, KA-U39, KA-U41, KA-U43, KA-U44, LV-U41, OV-U4, VS-U5 | 2 | KA-U43 snur KA-U24 og vedtar det forkastede alternativet, så plikten må leses av KA-U18, KA-U21, KA-U31, KA-U41 og KA-U43, og datokontrollen for en senere begrunnelse er delt på fire vedtak som presiserer KA-U36. |
| Serverlaget, databasen og målarkitekturen (beslutninger) | B-12-DATABASEN, B-15, B-17, B-18, B-19, DL-U1, DL-U3, HF-U3, KA-U1, rad-324, rad-325, rad-422, rad-423, rad-424, rad-425, rad-426 | 2 | B-19 endrer B-18 og er presisert av DL-U1, og B-12-DATABASEN snur PostgreSQL-delen i fire rader og er presisert av HF-U3, DL-U1 og DL-U3. |

Temaer: 41. Samlevedtak: 58 (anslag).

377 av de 459 radene står i minst én kjede, talt med et skript over tabellen. Samlevedtakene
for alle temaene ville derfor skrive om det meste av registeret. Svaret 03.11 (spørsmål 21, B):
alle 41 temaene tas i steg 4, per prefiks. Etter spørsmål 19 (A) avgjøres en motsigelse i
samlevedtaket for kjeden den står i, og de kjedene tas først.

**Svarene 04.11 (spørsmål 4 og 5, A).** For kjedene betyr det:

- *Steg 3* gir registeret forholdet «samler». Den gamle ID-en står i registeret med «Samlet i
  …», som «Flyttet til» for designvedtakene. En henvisning til den gjelder samlevedtaket, og
  vakttesten (`docs/verktoy/vedtakshenvisninger.py`) godtar den.
- *Steg 3* gir også forholdet «bygger på», for et vedtak som forutsetter et opphevet vedtak
  uten å presisere, utvide eller endre det, som KA-U45 med OV-U48 og OV-U49. Vakttesten
  finner et gjeldende vedtak som presiserer, utvider, endrer eller bygger på et opphevet
  vedtak, som HF-U20, OV-U67 og OV-U80. Det gir de fleste motsigelsene over en kontroll.
- *Steg 4* skriver samlevedtakene. Henvisningene i koden og domenetabellen til en samlet ID
  står, og koden får den nye ID-en når den likevel endres. Der et samlevedtak løser en
  motsigelse og endrer innholdet, opphever det i stedet, og henvisningene til den ID-en
  skrives om i steg 4. Tellingen per ID under «Tabellen» viser hvor mange det gjelder.

## Omfanget av flyttingen

Valg 2A i #1534: et designvedtak beholder ID-en i registeret med «Flyttet til BF-xx, punkt
U-n», og teksten flyttes dit. Henvisningene i koden virker fortsatt. Tabellen følger svarene
fra oppdragsgiver 03.11 (PR #1537).

| Mål | Designvedtak | Steder | Av dem i `kjerne/` | Vedtakene |
| --- | ---: | ---: | ---: | --- |
| `.interface-design/system.md` | 10 | 139 | 38 | GR-U30, MM-U22, MM-U23, MM-U24, MM-U25, MM-U30, MM-U31, MM-U32, MM-U40, OV-U75 |
| BF-05 | 6 | 99 | 18 | GR-U16, LV-U43, OV-U76, OV-U77, OV-U78, VS-U39 |
| BF-01 | 5 | 57 | 18 | KA-U31, KA-U41, MM-U36, OV-U20, OV-U62 |
| BF-02B | 1 | 0 | 0 | OV-U87 |
| BF-06 (under arbeid) | 1 | 3 | 0 | EO-U14 |
| Nytt forløp: registrere et brev sendt utenfor løsningen | 6 | 88 | 53 | OV-U16, OV-U19, OV-U21, OV-U70, OV-U81, OV-U86 |
| Nytt forløp: saksoversikten og statusen | 3 | 28 | 8 | MM-U37, OV-U10, rad-083 |
| Nytt forløp: veiledningen om passivitet og frister | 2 | 0 | 0 | VS-U2, VS-U10 |
| Nytt forløp: fristkravet og fristsvaret | 2 | 0 | 0 | OV-U42, OV-U63 |
| Nytt forløp: krav om rigg og drift | 2 | 0 | 0 | OV-U40, OV-U60 |
| Nytt forløp: levering av brev til Catenda | 1 | 11 | 0 | LV-U16 |
| Nytt forløp: brevmalen og profilen | 1 | 5 | 0 | LV-U25 |
| Nytt forløp: BH endrer svaret etter akseptfristen | 1 | 6 | 0 | HF-U22 |
| Nytt forløp: ny KOE etter en bestridt endringsordre | 1 | 0 | 0 | EO-U11 |
| **I alt** | **42** | **436** | **135** | |

I tillegg har 84 av vedtakene en designdel, med til sammen 1 641 steder. 46 av dem mangler
et forløp å flytte delen til. Subagentene har navngitt målene fritt, så grupperingen er
omtrentlig. 27 vedtak har en beslutningsdel. Ingen av dem er opphevet. Tabellen og tallene
gjelder bare designvedtak som gjelder; de tre opphevede designradene (MM-U28, MM-U29 og
OV-U71) flyttes ikke.

135 av de 436 stedene som viser til et designvedtak, er i `kjerne/`, flest for OV-U19 (24),
OV-U16 (19), GR-U16 (14), MM-U22 (12) og MM-U23 (10). Når vedtakene flyttes, viser disse
henvisningene til en ID med «Flyttet til», og vakttesten for henvisningene må godta det
(steg 3).

**Svaret 03.11 (spørsmål 20, A).** Spørsmålet ble stilt før svarene på mønster 1–6, og
regelen i svaret er her brukt på klassene etter dem, så tallene er større enn i spørsmålet.

1. *Flyttes i steg 4*: de 22 designvedtakene med et forløp eller `system.md` som mål
   (295 steder). EO-U14 flyttes når BF-06 er merget.
2. *Venter på et nytt forløp*: de 19 med «Nytt forløp» (138 steder). De seks om brev sendt
   utenfor løsningen flyttes samlet når det forløpet skrives.
3. *Designdelene i de 84 vedtakene flyttes ikke nå.* Steg 3 gir registeret et felt som sier
   hvilken del av vedtaket som er design og kan endres av brukerprøven. Teksten flyttes når
   vedtaket går inn i et samlevedtak for en kjede.

**Svaret 04.11 (spørsmål 5, A).** For flyttingen betyr det:

- *Steg 3* gir U-punktene i bestillingene et anker (`BF-06.md#u-12`), og «Flyttet til» peker
  på det. Lenkekontrollen feiler når punktet ikke finnes. I dag har U-punktene bare ID-er som
  gjentas i hvert forløp.
- *Steg 3* utvider vakttesten for vedtaks-ID-er til bestillingene (`BF-xx.md`),
  `.interface-design/system.md`, skillene og `AGENTS.md`, der designvedtakene flyttes. I dag
  leser den `kjerne/`, `server/`, `src/` og JSON-kildene i `docs/domenetabell/`. OV-U75, som
  `AGENTS.md` viser til, kommer da under kontrollen.
- *Steg 4* flytter designvedtakene i punkt 1 over, og en henvisning til en flyttet ID står,
  fordi den viser til «Flyttet til».

## Tabellen

Steder er linjer som nevner ID-en, i alt og i parentes fordelt på `kjerne/`, `server/`, `src/` og `docs/domenetabell/`. 
Radene uten eget anker står til slutt, med begynnelsen av teksten.

### OV

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [OV-U1](../plans/vedtak.md#ov-u1) | beslutning | gjeldende | Omfanget og rekkefølgen for første versjon av TS-stien. |  | 34 (4/9/18/3) |
| [OV-U2](../plans/vedtak.md#ov-u2) | vedtak | gjeldende | Sperren etter FO-U5 virker bare med en forseringssak i appen, og en endringsordre som svar på grunnlaget er byggherrens svar. | beslutningsdel: forsering og EO-sak føres utenfor appen i første versjon; designdel: at KOE-saken viser at de ikke støttes → «Mønstre» i system.md | 0 |
| [OV-U3](../plans/vedtak.md#ov-u3) | vedtak | gjeldende | Når kravene regnes som avgjort, og hvilke kommandoer som da avvises eller godtas. | designdel: statusteksten og påminnelsen i skjemaet ved første krav i sporet → nytt forløp trengs: første krav etter avgjorte krav | 34 (19/0/0/15) |
| [OV-U4](../plans/vedtak.md#ov-u4) | vedtak | gjeldende | Et registrert brev er dokumentasjon uten virkning, og hver side registrerer bare sine egne brev. | designdel: visningen ved sporene, merknaden, skjemateksten og visningen ved «venter på svar» → nytt forløp trengs: registrere brev sendt utenfor appen | 240 (77/2/8/153) |
| [OV-U5](../plans/vedtak.md#ov-u5) | vedtak | gjeldende | Varsel etter § 34.1.2 og § 34.1.3 fra appen og TEs oppgitte varseldato som premiss for rettidigheten. | designdel: teksten «TE oppgir at varselet ble sendt», skjemaet for byggherrens svar og for TEs aksept → BF-01 | 139 (72/1/26/40) |
| [OV-U6](../plans/vedtak.md#ov-u6) | vedtak | gjeldende | Byggherrens registrerte endringsordre er en godkjenning av grunnlaget med enighet og fullmakt. | designdel: skjemaet som skiller standpunktet fra dokumentet, og visningen av opplysningen om § 31.3 → nytt forløp trengs: BH registrerer endringsordre som svar | 66 (22/0/0/44) |
| [OV-U7](../plans/vedtak.md#ov-u7) | beslutning | gjeldende | Hvilke vedtak som ikke bygges i første versjon, og at de avvises til de bygges. | Grensetilfelle, mønster 5; svar 03.11: B. | 103 (41/0/3/59) |
| [OV-U8](../plans/vedtak.md#ov-u8) | vedtak | gjeldende | Når et varsel etter § 34.1.2 og § 34.1.3 avvises eller godtas, og at datoen settes én gang. |  | 9 (4/0/5/0) |
| [OV-U9](../plans/vedtak.md#ov-u9) | vedtak | gjeldende | Byggherren tar stilling til rettidigheten etter § 33.4 med TEs oppgitte dato som premiss. | designdel: datoene ved siden av hverandre i svarskjemaet → nytt forløp trengs: BH påberoper fristvarsel for sent | 0 |
| [OV-U10](../plans/vedtak.md#ov-u10) | design | gjeldende | Ordlyden i statusteksten og merknaden om registrerte brev. | nytt forløp trengs: status når kravene er avgjort Grensetilfelle, mønster 10. | 17 (8/2/5/2) |
| [OV-U11](../plans/vedtak.md#ov-u11) | vedtak | gjeldende | Virkningen av å rette en oppgitt varseldato, til og fra TEs fordel. |  | 8 (0/0/0/8) |
| [OV-U12](../plans/vedtak.md#ov-u12) | vedtak | gjeldende | En registrert endringsordre regnes bare som svar på et krav sendt fra appen. |  | 2 (2/0/0/0) |
| [OV-U13](../plans/vedtak.md#ov-u13) | beslutning | gjeldende | Bare byggherrens registrering som svar kan opplyse at brevet er en endringsordre etter § 31.3. | beslutningsdel: senere avklaring av § 31.3 utsettes til merkingen bygges (OV-U7) Grensetilfelle, mønster 5; svar 03.11: B. | 25 (15/0/0/10) |
| [OV-U14](../plans/vedtak.md#ov-u14) | beslutning | gjeldende | Hvilke bestemmelser i § 34.3 som avvises til de er bygget. | Grensetilfelle, mønster 5; svar 03.11: B. | 0 |
| [OV-U15](../plans/vedtak.md#ov-u15) | vedtak | gjeldende | Tolkningen av § 34.1.1: ved endring kreves ikke varsel, og appen utleder ingen virkning av det. | designdel: skjemateksten om at varsel ikke kreves → nytt forløp trengs: TE sender varsel om vederlagsjustering | 17 (5/0/4/8) |
| [OV-U16](../plans/vedtak.md#ov-u16) | design | gjeldende | Feltene den som registrerer et brev, fyller ut. | designdel: det som står i skjemaet → nytt forløp trengs: registrere brev sendt utenfor appen Grensetilfelle, mønster 2; svar 03.11: B. | 26 (19/0/5/2) |
| [OV-U17](../plans/vedtak.md#ov-u17) | vedtak | gjeldende | Hvem som kan rette en registrering, og at det skjer uten godkjenning. |  | 44 (27/3/2/12) |
| [OV-U18](../plans/vedtak.md#ov-u18) | vedtak | gjeldende | Virkningen av å rette en registrering i feil sak. | designdel: at registreringen vises som rettet og ikke ved sporene → nytt forløp trengs: registrere brev sendt utenfor appen | 50 (33/2/3/12) |
| [OV-U19](../plans/vedtak.md#ov-u19) | design | gjeldende | Hvor merknaden om brev sendt utenfor appen vises. | nytt forløp trengs: registrere brev sendt utenfor appen | 32 (24/0/0/8) |
| [OV-U20](../plans/vedtak.md#ov-u20) | design | gjeldende | Hva som vises ved et krav som venter på svar. | BF-01 | 11 (1/0/1/9) |
| [OV-U21](../plans/vedtak.md#ov-u21) | design | gjeldende | Hvilke registrerte brev merknaden og statusteksten teller med. | nytt forløp trengs: registrere brev sendt utenfor appen Grensetilfelle, mønster 10. | 12 (10/1/0/1) |
| [OV-U22](../plans/vedtak.md#ov-u22) | vedtak | gjeldende | Påberopelsen etter § 34.1.3 gjelder det ene særskilte kravet, med prinsipalt og subsidiært beløp. |  | 18 (14/0/3/1) |
| [OV-U23](../plans/vedtak.md#ov-u23) | vedtak | gjeldende | TE kan kreve bare de særskilte kravene etter § 34.1.3. |  | 50 (18/4/28/0) |
| [OV-U24](../plans/vedtak.md#ov-u24) | vedtak | gjeldende | Hvilken kravversjon som regnes som første varsel om et særskilt krav. |  | 7 (7/0/0/0) |
| [OV-U25](../plans/vedtak.md#ov-u25) | vedtak | gjeldende | Tolkningen av § 34.1.3 etter kontraktsgrunnlaget: rigg og drift har ingen særskilt varslingsplikt. |  | 31 (6/0/24/1) |
| [OV-U26](../plans/vedtak.md#ov-u26) | vedtak | gjeldende | Byggherren tar stilling til hver post, og samlet resultat regnes av beløpene. |  | 14 (12/0/0/2) |
| [OV-U27](../plans/vedtak.md#ov-u27) | vedtak | gjeldende | Påberopelsen etter § 34.1.2 gjelder hele kravet, og rekkefølgen mellom de to påberopelsene. |  | 33 (15/0/9/9) |
| [OV-U28](../plans/vedtak.md#ov-u28) | vedtak | gjeldende | Vedtatt brevtekst for postene og etikettene prinsipalt og subsidiært. |  | 28 (14/0/5/9) |
| [OV-U29](../plans/vedtak.md#ov-u29) | vedtak | gjeldende | Den første kravversjonen er TEs første kjente varsel etter § 34.1.2. |  | 1 (1/0/0/0) |
| [OV-U30](../plans/vedtak.md#ov-u30) | vedtak | gjeldende | Etiketten i brevet settes etter den fryste verdien for hvert standpunkt. |  | 1 (0/0/0/1) |
| [OV-U31](../plans/vedtak.md#ov-u31) | beslutning | gjeldende | Hvilke beløp som lagres, og hvilke som utledes av postene. | Grensetilfelle, mønster 4; svar 03.11: B. | 12 (10/2/0/0) |
| [OV-U32](../plans/vedtak.md#ov-u32) | vedtak | gjeldende | Lagene og etikettene i brevet avgjør rekkefølgen mellom standpunktene. |  | 71 (50/0/8/13) |
| [OV-U33](../plans/vedtak.md#ov-u33) | vedtak | gjeldende | Når et standpunkt er upåvirket, og hvilket lag og hvilken etikett det får i brevet. |  | 57 (41/1/11/4) |
| [OV-U34](../plans/vedtak.md#ov-u34) | beslutning | gjeldende | Henviser avklaringen av kunnskapsdato i TS-stien til #1171. | Grensetilfelle, mønster 5; svar 03.11: B. | 0 |
| [OV-U35](../plans/vedtak.md#ov-u35) | vedtak | gjeldende | Tolkningen av § 34.1.3 om varslingsplikten for kravet etter første ledd. |  | 0 |
| [OV-U36](../plans/vedtak.md#ov-u36) | vedtak | gjeldende | Kompensasjonen i uendret byggetid gjelder kontrakten samlet, og avgrenser hva TE kan kreve i en sak. | designdel: opplysningen ved kravet om rigg og drift → nytt forløp trengs: krav om rigg og drift | 0 |
| [OV-U37](../plans/vedtak.md#ov-u37) | vedtak | gjeldende | Rigg og drift i forlenget byggetid er en post som kan sendes før forlengelsen er avtalt. | designdel: visningen av forlengelsen som TEs premiss → nytt forløp trengs: krav om rigg og drift | 0 |
| [OV-U38](../plans/vedtak.md#ov-u38) | vedtak | gjeldende | Enigheten om vederlagskravet binder også posten for rigg og drift. | designdel: advarselen i akseptskjemaet → BF-01, i kravskjemaet → nytt forløp trengs: krav om rigg og drift | 0 |
| [OV-U39](../plans/vedtak.md#ov-u39) | vedtak | gjeldende | Regnestykket for rigg og drift, avrundingen og virkningen av partenes verdier. | designdel: feltene i skjemaet for posten → nytt forløp trengs: krav om rigg og drift | 0 |
| [OV-U40](../plans/vedtak.md#ov-u40) | design | gjeldende | Varselet i skjemaet og visningen når regnestykket avviker fra beløpet. | nytt forløp trengs: krav om rigg og drift Grensetilfelle, mønster 10. | 0 |
| [OV-U41](../plans/vedtak.md#ov-u41) | vedtak | gjeldende | TEs kunnskapsdato etter § 34.1.3 annet ledd, brevteksten og rettingen av den. | designdel: visningen av alle datoene TE har oppgitt → nytt forløp trengs: kunnskapsdato ved nedsatt produktivitet | 0 |
| [OV-U42](../plans/vedtak.md#ov-u42) | design | gjeldende | Standpunkter uten lagvirkning står samlet i brevet og danner ikke et lag. | Grensetilfelle, mønster 2; svar 03.11: B. | 0 |
| [OV-U43](../plans/vedtak.md#ov-u43) | vedtak | gjeldende | Prinsippene for beregningsregel, overslag og enighet i vederlagssporet. | designdel: teksten om at behandlingen er ferdig i løsningen → nytt forløp trengs: enighet om beregningsregel for vederlag | 2 (0/0/2/0) |
| [OV-U44](../plans/vedtak.md#ov-u44) | vedtak | gjeldende | Et registrert brev sendt utenfor appen er dokumentasjon uten utledet virkning. | designdel: skillet mellom dokumentasjon, opplysning og utledning i visningen → system.md «Mønstre» | 17 (16/0/0/1) |
| [OV-U45](../plans/vedtak.md#ov-u45) | vedtak | gjeldende | Brevteksten og virkningen av henvisningen når grunnlaget er ubesvart i appen. | designdel: spørsmålet og valget av dokumenttype i svarskjemaet → BF-01 | 1 (0/0/1/0) |
| [OV-U46](../plans/vedtak.md#ov-u46) | vedtak | gjeldende | Bekreftelsen av et svar gitt utenfor appen, med brevtekst, binding og endringsordre. | designdel: spørsmålet om forbehold og visningen av henvisningen ved nytt svar → nytt forløp trengs: bekrefte svar gitt utenfor appen | 0 |
| [OV-U47](../plans/vedtak.md#ov-u47) | vedtak | opphevet 30.10 av OV-U69 | Når byggherrens brev erklærer godkjent oppgjør som fast sum, altså en bindende erklæring overfor TE. | Opphevet 30.10 av OV-U69 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [OV-U48](../plans/vedtak.md#ov-u48) | vedtak | opphevet 30.10 av OV-U69 | Et svar eller en endringsordre med vilkår skjemaet ikke kan uttrykke, avvises som svar som gir sammenfall eller som grunnlagssvar. | Opphevet 30.10 av OV-U69 Grensetilfelle, mønster 7. Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [OV-U49](../plans/vedtak.md#ov-u49) | vedtak | opphevet 30.10 av OV-U69 | Enighet med særskilte vilkår, frafall, at uavklarte vilkår holder kravet uavgjort, den bindende avklaringen og sperren mot endringsordre. | Opphevet 30.10 av OV-U69 Grensetilfelle, mønster 7. Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [OV-U50](../plans/vedtak.md#ov-u50) | vedtak | gjeldende | En senere innsigelse eller et registrert brev gjør ikke et utledet utfall uavklart. |  | 0 |
| [OV-U51](../plans/vedtak.md#ov-u51) | vedtak | opphevet 25.10 av OV-U52 | Retting av datoopplysningen: en tidligere dato gjelder straks, en senere først når byggherren har godtatt den, og gitte svar står. | Opphevet 25.10 av OV-U52 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [OV-U52](../plans/vedtak.md#ov-u52) | vedtak | gjeldende | TEs korrigering av datoen i grunnlagskravet, brevteksten og virkningen av den. | designdel: visningen av tidligere opplysninger og hvilken et svar gjaldt → BF-02A | 12 (1/0/0/11) |
| [OV-U53](../plans/vedtak.md#ov-u53) | vedtak | gjeldende | TEs nye kunnskapsdato gjelder straks uten byggherrens godkjenning. | designdel: visningen av alle datoene → nytt forløp trengs: kunnskapsdato ved nedsatt produktivitet | 0 |
| [OV-U54](../plans/vedtak.md#ov-u54) | vedtak | gjeldende | En ny kravversjon avslår et bindende tilbud, og en korrigering er ikke en ny kravversjon. | designdel: skjemaets forklaring før TE sender → BF-02B og BF-02C | 14 (3/0/0/11) |
| [OV-U55](../plans/vedtak.md#ov-u55) | vedtak | gjeldende | Hva som står fast i grunnlagskravet, utdypingen og forslaget om å rette betegnelsen. | designdel: valget mellom utdyping og ny kravversjon i skjemaet → BF-02B | 5 (0/0/0/5) |
| [OV-U56](../plans/vedtak.md#ov-u56) | beslutning | gjeldende | Hvilke rettinger som bygges før første ekte sak. |  | 0 |
| [OV-U57](../plans/vedtak.md#ov-u57) | vedtak | gjeldende | En ny sak med riktig hjemmel endrer ikke den gamle, og nøkkeltallene kan telle begge. | designdel: teksten i skjemaet før sending → BF-05 | 6 (0/0/0/6) |
| [OV-U58](../plans/vedtak.md#ov-u58) | vedtak | gjeldende | Hvordan et beløp leses og avvises, i hele øre uten avrunding. | designdel: feilmeldingen ved ugyldig beløp → system.md «Knapper, skjemaer og feilmeldinger» | 33 (20/1/12/0) |
| [OV-U59](../plans/vedtak.md#ov-u59) | vedtak | gjeldende | Beløpene sammenliknes i hele øre når sammenfall utledes. |  | 19 (8/0/4/7) |
| [OV-U60](../plans/vedtak.md#ov-u60) | design | gjeldende | Datoene for igangsetting og overtakelse i posten er partenes opplysninger i brevet. | designdel: datofeltene og kontrollen av rekkefølgen → nytt forløp trengs: krav om rigg og drift Grensetilfelle, mønster 2; svar 03.11: B. | 0 |
| [OV-U61](../plans/vedtak.md#ov-u61) | vedtak | gjeldende | Hva nøkkeltallene for krevd vederlag og enighet om vederlag teller og ikke teller. | designdel: særskilt visning, merking og antall ved summene → nytt forløp trengs: nøkkeltall for vederlag i oversikten | 3 (0/0/3/0) |
| [OV-U62](../plans/vedtak.md#ov-u62) | design | gjeldende | Hvilke registrerte brev som vises ved kravet som venter på svar, og med hvilken merknad. | designdel: det som står i skjemaet → BF-01 Grensetilfelle, mønster 2; svar 03.11: B. | 10 (9/0/1/0) |
| [OV-U63](../plans/vedtak.md#ov-u63) | design | gjeldende | Løsningen summerer ikke fristforlengelse på tvers av saker og kontrollerer ikke sammenhengen. | designdel: veiledningen i fristkravet og fristsvaret → nytt forløp trengs: fristkrav og fristsvar med veiledning Grensetilfelle, mønster 8. | 0 |
| [OV-U64](../plans/vedtak.md#ov-u64) | beslutning | opphevet 28.10 av MM-U34 | Leveranseomfanget for protest: hvem som kan protestere i denne versjonen. Virkningen følger protestreglene andre steder. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 1 (0/0/0/1) |
| [OV-U65](../plans/vedtak.md#ov-u65) | vedtak | opphevet 28.10 av MM-U34 | En enighet sperrer protest, innsigelse og bestridelse mot det den omfatter. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 4 (0/0/0/4) |
| [OV-U66](../plans/vedtak.md#ov-u66) | vedtak | opphevet 28.10 av MM-U34 | Hvor langt sperren rekker: passivitet, merking, betinget enighet og opplysningene et standpunkt bygger på. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 6 (0/0/0/6) |
| [OV-U67](../plans/vedtak.md#ov-u67) | vedtak | gjeldende | Hva en enighet omfatter, og virkningen av sperren mot nye innsigelser i sporet. |  | 3 (0/0/0/3) |
| [OV-U68](../plans/vedtak.md#ov-u68) | vedtak | gjeldende | Byggherrens standpunkt om at varselet kom i tide, inngår i enigheten. |  | 3 (0/0/0/3) |
| [OV-U69](../plans/vedtak.md#ov-u69) | vedtak | gjeldende | Løsningen registrerer enighet ut fra valgene, tolker ikke vilkår og forbehold, og brevet er autoritativt. | designdel: ingen egne felt for vilkår og tekstene skjemaet viser før sending → BF-01 | 1 (0/0/1/0) |
| [OV-U70](../plans/vedtak.md#ov-u70) | design | gjeldende | Ordlyden i merknaden om at innholdet i brevet ikke er vurdert. | nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen Grensetilfelle, mønster 8. | 0 |
| [OV-U71](../plans/vedtak.md#ov-u71) | design | opphevet når Følge rettes (steg 3) | Ordlyden i merknaden om registrerte brev. Teksten gir ingen virkning (som mønster 10). | nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen Grensetilfelle, mønster 14. Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [OV-U72](../plans/vedtak.md#ov-u72) | vedtak | gjeldende | Teksten under «Forbehold» står i brevet, tolkes ikke, sperrer ingenting og oppfyller ikke begrunnelseskravet. | designdel: feltet «Forbehold» i svarskjemaet → BF-01 | 0 |
| [OV-U73](../plans/vedtak.md#ov-u73) | vedtak | gjeldende | Oversiktstabellen er en del av brevteksten i svaret og fryses med den. |  | 0 |
| [OV-U74](../plans/vedtak.md#ov-u74) | vedtak | gjeldende | Navnet på posten etter § 34.1.1, § 34.1.2 og § 34.1.3 i den vedtatte brevteksten. | designdel: ordet i skjemaet → BF-01 | 0 |
| [OV-U75](../plans/vedtak.md#ov-u75) | design | gjeldende | Hvordan visningen skriver henvisninger til bestemmelsene i NS 8407. | «Retningen» Grensetilfelle, enkelttilfelle. | 13 (0/0/1/12) |
| [OV-U76](../plans/vedtak.md#ov-u76) | design | gjeldende | Ordet visningen bruker om bestemmelsen TE påberoper. | BF-05 Grensetilfelle, mønster 8. | 20 (0/0/2/18) |
| [OV-U77](../plans/vedtak.md#ov-u77) | design | gjeldende | Hvordan visningen viser gruppen forholdet hører til. | BF-05 | 9 (0/0/3/6) |
| [OV-U78](../plans/vedtak.md#ov-u78) | design | gjeldende | Endrer tittelen i den vedtatte brevteksten i LV-U4. | designdel: tittelen på forholdet i visningen → BF-05 Grensetilfelle, mønster 2; svar 03.11: B. | 15 (0/0/5/10) |
| [OV-U79](../plans/vedtak.md#ov-u79) | vedtak | gjeldende | Hvem som kan legge til korrespondanse, og at løsningen ikke avgjør om sendemåten oppfyller kontrakten. | designdel: feltene som oppgis ved registreringen → nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen | 28 (0/0/3/25) |
| [OV-U80](../plans/vedtak.md#ov-u80) | vedtak | gjeldende | Hvem som kan velge kategori, og hvilken virkning og dato en registrert korrespondanse får. | designdel: spørsmålet ‹Hva er det etter kontrakten?› og merkingene → nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen | 32 (4/2/0/26) |
| [OV-U81](../plans/vedtak.md#ov-u81) | design | gjeldende | Hvor merknaden om at innholdet ikke er vurdert, står, og hva visningen sier om korrespondansen. | nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen | 17 (0/0/12/5) |
| [OV-U82](../plans/vedtak.md#ov-u82) | vedtak | gjeldende | Forholdet er den bestemmelsen i kontrakten TE påberoper, og forholdet er ikke et krav. | beslutningsdel: hvordan ordene i vedtakene og brevtekstene leses. Grensetilfelle, mønster 4; svar 04.11 (3): A. | 3 (0/0/0/3) |
| [OV-U83](../plans/vedtak.md#ov-u83) | beslutning | gjeldende | Når navnene i domenet byttes, og hvor gamle og nye navn føres. |  | 13 (0/0/0/13) |
| [OV-U84](../plans/vedtak.md#ov-u84) | vedtak | gjeldende | Avsenderens senere valg av kategori er et nytt utsagn med virkning og dato. | designdel: visningen av når valget ble gjort → nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen | 3 (0/0/0/3) |
| [OV-U85](../plans/vedtak.md#ov-u85) | vedtak | gjeldende | Hvilken dato som gjelder for varselet, kravet eller svaret, og at løsningen ikke avgjør den. | designdel: visningen av begge datoene med parten → nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen | 0 |
| [OV-U86](../plans/vedtak.md#ov-u86) | design | gjeldende | Ordlyden og vilkåret for merknaden om dokumentasjon som er registrert, men ikke sendt herfra. | nytt forløp trengs: registrere korrespondanse sendt utenfor løsningen | 1 (0/0/0/1) |
| [OV-U87](../plans/vedtak.md#ov-u87) | design | gjeldende | Uttrykket visningen bruker om den gjeldende versjonen av kravet. | BF-02B | 0 |
| [OV-U88](../plans/vedtak.md#ov-u88) | vedtak | gjeldende | Løsningen avgjør ikke om partene likevel har inngått avtale. |  | 0 |

### KA

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [KA-U1](../plans/vedtak.md#ka-u1) | vedtak | gjeldende | Hva TEs aksept gjelder, og når den avvises. |  | 112 (11/0/1/100) |
| [KA-U2](../plans/vedtak.md#ka-u2) | beslutning | gjeldende | Hvilke utsagn løsningen regner som kravversjoner. | beslutningsdel: hendelsestypene og at godkjenningsflyten bruker samme definisjon Grensetilfelle, mønster 4; svar 03.11: B. | 25 (5/2/0/18) |
| [KA-U3](../plans/vedtak.md#ka-u3) | vedtak | opphevet 15.10 av HF-U9 | En ny kravversjon avvises etter enighet, og et nytt krav om samme forhold går i en ny sak. | Opphevet 15.10 av HF-U9 Var *historisk*; klassen er satt etter testen 04.11. | 7 (0/0/0/7) |
| [KA-U4](../plans/vedtak.md#ka-u4) | beslutning | gjeldende | En vurdering byggherren ikke har gjort, regnes ikke som i tide eller for sent. | beslutningsdel: kodingen true, false og null i hendelsen og tilstanden Grensetilfelle, mønster 4; svar 03.11: B. | 44 (6/0/2/36) |
| [KA-U5](../plans/vedtak.md#ka-u5) | vedtak | opphevet 15.10 av HF-U9 | Godtar TE et delvis godkjent svar, er byggherrens beløp eller dager avtalt. | Opphevet 15.10 av HF-U9 Var *historisk*; klassen er satt etter testen 04.11. | 17 (0/0/0/17) |
| [KA-U6](../plans/vedtak.md#ka-u6) | vedtak | gjeldende | TE kan trekke et krav med enighet, og enigheten faller bort. |  | 38 (3/0/0/35) |
| [KA-U7](../plans/vedtak.md#ka-u7) | vedtak | opphevet 28.10 av MM-U34 | En enighet binder begge parter, og en ny kravversjon i sporet avvises (§ 34.2.2). | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 27 (0/0/0/27) |
| [KA-U8](../plans/vedtak.md#ka-u8) | vedtak | gjeldende | En kravversjon på 0 dager eller 0 kr avvises etter § 33.6.1. |  | 13 (3/0/0/10) |
| [KA-U9](../plans/vedtak.md#ka-u9) | vedtak | gjeldende | Hva som regnes som godkjent og delvis for beløp med fortegn. |  | 16 (8/0/0/8) |
| [KA-U10](../plans/vedtak.md#ka-u10) | vedtak | gjeldende | Enigheten gjelder brevets virkning da det ble sendt. | beslutningsdel: at aksepten lagrer regelversjonen TE fikk se | 66 (16/0/9/41) |
| [KA-U11](../plans/vedtak.md#ka-u11) | vedtak | gjeldende | Når kravene er avgjort, og hvilke kommandoer som da avvises. |  | 74 (11/0/0/63) |
| [KA-U12](../plans/vedtak.md#ka-u12) | vedtak | gjeldende | Virkningen av «ingen krav»: sporet lukkes og teller som trukket og oppgjort. |  | 63 (19/3/3/38) |
| [KA-U13](../plans/vedtak.md#ka-u13) | vedtak | gjeldende | Trekk av grunnlaget avvises når godkjenningen er en endringsordre etter § 32.3 a. |  | 44 (11/0/0/33) |
| [KA-U14](../plans/vedtak.md#ka-u14) | vedtak | gjeldende | Et trekk er bare avkall på TEs eget krav og sperres når det får videre virkninger. | designdel: visningen av et trekk → nytt forløp trengs: TE trekker kravet i saken | 19 (6/0/0/13) |
| [KA-U15](../plans/vedtak.md#ka-u15) | vedtak | gjeldende | Når «ingen krav» godtas og avvises i fristsporet. | beslutningsdel: hva som avgjøres før «ingen krav» og forbehold tas i bruk | 21 (7/0/0/14) |
| [KA-U16](../plans/vedtak.md#ka-u16) | vedtak | gjeldende | Virkningen av et forbehold løsningen ikke kan uttrykke. |  | 12 (4/0/0/8) |
| [KA-U17](../plans/vedtak.md#ka-u17) | vedtak | gjeldende | «Ingen krav» er avkall også for følger som ikke er kjent. |  | 7 (1/0/0/6) |
| [KA-U18](../plans/vedtak.md#ka-u18) | vedtak | gjeldende | Et avslag av grunnlaget fra løsningen må ha begrunnelse etter § 32.3 tredje ledd. |  | 1 (1/0/0/0) |
| [KA-U19](../plans/vedtak.md#ka-u19) | vedtak | gjeldende | Løsningen beregner virkningen av valgene og tolker ikke utdypningen. | designdel: den faste veiledningen i skjemaet → «Knapper, skjemaer og feilmeldinger» | 12 (7/0/5/0) |
| [KA-U20](../plans/vedtak.md#ka-u20) | vedtak | gjeldende | Hver side registrerer sine egne brev, og registreringen binder ikke. | Grensetilfelle, mønster 15. | 25 (10/0/0/15) |
| [KA-U21](../plans/vedtak.md#ka-u21) | vedtak | gjeldende | Påberopt sent varsel etter § 32.2 tolkes som avslag med begrunnelsesplikt. |  | 2 (2/0/0/0) |
| [KA-U22](../plans/vedtak.md#ka-u22) | vedtak | gjeldende | Vedtatt brevtekst for trekk og «ingen krav», og sperren mot trekk. | designdel: veiledningen i skjemaet om at kravet ikke kan tas opp igjen → nytt forløp trengs: TE trekker kravet i saken | 30 (16/0/6/8) |
| [KA-U23](../plans/vedtak.md#ka-u23) | vedtak | gjeldende | Vederlagskrav ved force majeure godtas og avgjøres som andre krav. | designdel: § 33.3 femte ledd vist som veiledning → nytt forløp trengs: TE krever vederlag ved force majeure | 0 |
| [KA-U24](../plans/vedtak.md#ka-u24) | vedtak | opphevet 31.10 av KA-U43 | Tolkningen av når NS 8407 krever begrunnelse (§ 32.3, § 33.7), og at en senere begrunnelse er et eget utsagn. | Opphevet 31.10 av KA-U43 Var *historisk*; klassen er satt etter testen 04.11. | 26 (17/0/6/3) |
| [KA-U25](../plans/vedtak.md#ka-u25) | vedtak | gjeldende | Vedtatt brevtekst om at avkallet ikke omfatter forseringsvederlag. |  | 6 (6/0/0/0) |
| [KA-U26](../plans/vedtak.md#ka-u26) | vedtak | opphevet 01.11 av KA-U45 | Et merket forbehold sperrer de bindende handlingene i sporene merkingen gjelder, og en inngått enighet står. | Opphevet 01.11 av KA-U45 Var *historisk*; klassen er satt etter testen 04.11. | 7 (0/0/0/7) |
| [KA-U27](../plans/vedtak.md#ka-u27) | vedtak | gjeldende | Når et trekk avvises fordi en enighet gir byggherren et fradrag. |  | 6 (0/0/0/6) |
| [KA-U28](../plans/vedtak.md#ka-u28) | vedtak | opphevet 01.11 av KA-U45 | Etter at kravene er avgjort, opphever en avklaring uten endret standpunkt sperren etter KA-U26. | Opphevet 01.11 av KA-U45 Var *historisk*; klassen er satt etter testen 04.11. | 7 (0/0/0/7) |
| [KA-U29](../plans/vedtak.md#ka-u29) | vedtak | gjeldende | Hvilke utsagn som godtas uten virkning etter et godtatt avslag av grunnlaget. |  | 12 (1/0/0/11) |
| [KA-U30](../plans/vedtak.md#ka-u30) | vedtak | opphevet 01.11 av KA-U45 | Merkingen sperrer et trekk bare i sporet merkingen gjelder. | Opphevet 01.11 av KA-U45 Var *historisk*; klassen er satt etter testen 04.11. | 5 (0/0/0/5) |
| [KA-U31](../plans/vedtak.md#ka-u31) | design | gjeldende | Hvilken begrunnelse i brevet som hører til hvilket svar. | designdel: begrunnelsesfeltet per svar under den låste teksten → BF-01 Grensetilfelle, mønster 2; svar 03.11: B. | 19 (8/0/2/9) |
| [KA-U32](../plans/vedtak.md#ka-u32) | vedtak | opphevet 31.10 av KA-U43 | Tolkningen av § 32.3 c: frafallet er en avgrensning mot TE og må begrunnes. | Opphevet 31.10 av KA-U43 Var *historisk*; klassen er satt etter testen 04.11. | 5 (5/0/0/0) |
| [KA-U33](../plans/vedtak.md#ka-u33) | vedtak | gjeldende | TEs fristkrav fra løsningen må ha en begrunnelse etter § 33.6.1 og § 33.7. | designdel: begrunnelsesfeltet under kravets låste tekst → nytt forløp trengs: TE sender krav om fristforlengelse | 20 (10/0/7/3) |
| [KA-U34](../plans/vedtak.md#ka-u34) | vedtak | gjeldende | Vedtatt brevtekst og virkning for en senere begrunnelse fra løsningen. |  | 27 (18/0/0/9) |
| [KA-U35](../plans/vedtak.md#ka-u35) | vedtak | gjeldende | Virkningen av en registrert senere begrunnelse. |  | 15 (8/0/0/7) |
| [KA-U36](../plans/vedtak.md#ka-u36) | vedtak | gjeldende | En registrert begrunnelse datert før svaret avvises. |  | 10 (5/0/0/5) |
| [KA-U37](../plans/vedtak.md#ka-u37) | vedtak | gjeldende | Hvilken dato et svar fra løsningen har, og at samme dato godtas. |  | 8 (3/0/0/5) |
| [KA-U38](../plans/vedtak.md#ka-u38) | vedtak | gjeldende | Hvilken dato et registrert svar sammenliknes med. |  | 6 (1/0/0/5) |
| [KA-U39](../plans/vedtak.md#ka-u39) | vedtak | gjeldende | En bestridt dato endrer ikke datokontrollen. |  | 6 (1/0/0/5) |
| [KA-U40](../plans/vedtak.md#ka-u40) | vedtak | gjeldende | Byggherren svarer bare på gjeldende kravversjon. |  | 0 |
| [KA-U41](../plans/vedtak.md#ka-u41) | design | gjeldende | Utdypningen i brevet har bare tekst byggherren selv skriver. | designdel: ingen forhåndsutfylt tekst i utdypningsfeltet → BF-01 Grensetilfelle, mønster 2; svar 03.11: B. | 11 (0/0/11/0) |
| [KA-U42](../plans/vedtak.md#ka-u42) | vedtak | gjeldende | Hva som regnes som avslått, delvis og godkjent for en beløpspost. |  | 31 (11/0/7/13) |
| [KA-U43](../plans/vedtak.md#ka-u43) | vedtak | gjeldende | Begrunnelsen er påkrevd bare ved avslag av krav på endringsordre etter § 32.3 b. | designdel: begrunnelsesfeltet per punkt → BF-04 | 0 |
| [KA-U44](../plans/vedtak.md#ka-u44) | vedtak | gjeldende | Avgrenser KA-U43 til byggherrens begrunnelser, slik at KA-U33 og GR-U15 står. | Grensetilfelle, enkelttilfelle. | 0 |
| [KA-U45](../plans/vedtak.md#ka-u45) | vedtak | gjeldende | Opphever merkingen med sperrene og legger forbehold under OV-U48 og OV-U49. |  | 5 (0/0/0/5) |

### LV

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [LV-U1](../plans/vedtak.md#lv-u1) | beslutning | gjeldende | Et nytt leveringsforsøk er ingen ny erklæring, og et lagret oppdrag beviser ikke sending eller mottak. | beslutningsdel: frysingen i samme transaksjon og at Python ikke tolker journalen Grensetilfelle, mønster 3; svar 03.11: B. | 17 (0/14/0/3) |
| [LV-U2](../plans/vedtak.md#lv-u2) | vedtak | gjeldende | Teksten avsenderen godkjenner, er brevet som fryses, og dokumentet gjengir den tro. | beslutningsdel: når PDF-en lages og at den bevares fra første gang | 89 (23/21/22/23) |
| [LV-U3](../plans/vedtak.md#lv-u3) | vedtak | gjeldende | Det som ikke står i brevteksten, regnes ikke som meddelt. |  | 25 (17/2/0/6) |
| [LV-U4](../plans/vedtak.md#lv-u4) | vedtak | gjeldende | Vedtatt brevtekst for krav, svar, aksept, innsigelse, protest og trekk. |  | 52 (31/2/6/13) |
| [LV-U5](../plans/vedtak.md#lv-u5) | vedtak | gjeldende | Vedtatt brevtekst for «i tide» og etter en innsigelse. |  | 12 (12/0/0/0) |
| [LV-U6](../plans/vedtak.md#lv-u6) | vedtak | gjeldende | Presiserer ordlyden i vedtatt brevtekst. |  | 0 |
| [LV-U7](../plans/vedtak.md#lv-u7) | vedtak | gjeldende | Bindingen og akseptfristen regnes fra sendingen, og appen avgjør ikke når brevet er kommet fram. | designdel: leveringskvitteringen vises ved siden av → nytt forløp trengs: levering av brev til Catenda | 9 (0/0/0/9) |
| [LV-U8](../plans/vedtak.md#lv-u8) | vedtak | gjeldende | Tolker brevteksten som et uttrykkelig «i tide» etter HF-U4. |  | 0 |
| [LV-U9](../plans/vedtak.md#lv-u9) | vedtak | gjeldende | Brevet er sendt når det er lagret, også før saken har fått topicen. | beslutningsdel: leveringen venter på topicen | 12 (0/4/0/8) |
| [LV-U10](../plans/vedtak.md#lv-u10) | vedtak | gjeldende | Vedtatt brevtekst for hvilket varsel byggherrens standpunkt til rettidigheten viser til. | designdel: at varselet er det første appen kjenner, står i skjemaet og visningen → BF-01 | 0 |
| [LV-U11](../plans/vedtak.md#lv-u11) | beslutning | gjeldende | Hvordan et registrert brev og vedlegget lagres i Catenda. | designdel: visningen sier at brevet er sendt utenfor appen → nytt forløp trengs: levering av brev til Catenda Grensetilfelle, mønster 8. | 15 (0/12/3/0) |
| [LV-U12](../plans/vedtak.md#lv-u12) | beslutning | gjeldende | Livsløpet til en vedleggsfil fra opplasting til sletting. | Grensetilfelle, mønster 3; svar 03.11: B. | 4 (0/4/0/0) |
| [LV-U13](../plans/vedtak.md#lv-u13) | vedtak | gjeldende | Hvem som leser brev og vedlegg i Catenda, styres av tilgangen på mappen, ikke av appen. | beslutningsdel: biblioteket og mappen fra prosjektets konfigurasjon | 0 |
| [LV-U14](../plans/vedtak.md#lv-u14) | beslutning | gjeldende | Filnavnet og hashen avgjør hvilket vedlegg som er en del av brevet. | beslutningsdel: serveren fyller inn filnavn og hash Grensetilfelle, mønster 3; svar 03.11: B. | 19 (13/2/2/2) |
| [LV-U15](../plans/vedtak.md#lv-u15) | vedtak | gjeldende | Den som har fullmakten, er avsenderen, og brevet har to signaturer. |  | 1 (0/1/0/0) |
| [LV-U16](../plans/vedtak.md#lv-u16) | design | gjeldende | En stanset levering sperrer ingenting, og appen avgjør ikke når brevet er kommet fram. | designdel: stansen og rådet om å sende utenfor appen i visningen → nytt forløp trengs: levering av brev til Catenda; beslutningsdel: drift varsles og leveringene venter ikke på hverandre Grensetilfelle, mønster 8. | 11 (0/0/0/11) |
| [LV-U17](../plans/vedtak.md#lv-u17) | beslutning | gjeldende | Hva eksporten av en sak omfatter. |  | 0 |
| [LV-U18](../plans/vedtak.md#lv-u18) | vedtak | gjeldende | Vedtatt brevtekst etter § 33.6.2. |  | 12 (11/0/0/1) |
| [LV-U19](../plans/vedtak.md#lv-u19) | vedtak | gjeldende | Vedtatt brevtekst for varselet etter § 34.1.2. |  | 13 (4/0/2/7) |
| [LV-U20](../plans/vedtak.md#lv-u20) | vedtak | gjeldende | Vedtatt brevtekst for protesten mot en påberopelse etter § 33.6.2. |  | 4 (4/0/0/0) |
| [LV-U21](../plans/vedtak.md#lv-u21) | vedtak | gjeldende | Vedtatt brevtekst for hvilket brev påberopelsen gjelder når TE ikke har eget varsel. | designdel: at kravet er det første varselet appen kjenner, står i skjemaet → BF-01 | 3 (3/0/0/0) |
| [LV-U22](../plans/vedtak.md#lv-u22) | vedtak | gjeldende | Et brev i byggherrens prosjekthotell er sendt på avtalt kanal etter § 5. |  | 0 |
| [LV-U23](../plans/vedtak.md#lv-u23) | vedtak | gjeldende | Brevet er byggherrens formular etter pkt. B.2.4, og hodet etter pkt. D.1.2 er en del av brevet. |  | 4 (0/0/4/0) |
| [LV-U24](../plans/vedtak.md#lv-u24) | vedtak | gjeldende | Merkingen av brevet etter pkt. D.1.2.5 er en del av brevet og fryses. | designdel: kontraktsforkortelsen i prosjektinnstillingene → nytt forløp trengs: prosjektinnstillingene for brevene | 0 |
| [LV-U25](../plans/vedtak.md#lv-u25) | design | gjeldende | Hvilke deler brevet har, med underskriverne, vedleggene og kopien. | designdel: logoen, bunnteksten og oppsettet → nytt forløp trengs: brevmalens oppsett og profil Grensetilfelle, mønster 2; svar 03.11: B. | 5 (0/0/0/5) |
| [LV-U26](../plans/vedtak.md#lv-u26) | beslutning | gjeldende | Skriften og logoen hentes som avhengighet med fast versjon og fryses med brevet. | designdel: skriftene i brevet → nytt forløp trengs: brevmalens oppsett og profil Grensetilfelle, enkelttilfelle. | 0 |
| [LV-U27](../plans/vedtak.md#lv-u27) | vedtak | gjeldende | Referansene og saksbehandleren er en del av brevet og fryses. |  | 0 |
| [LV-U28](../plans/vedtak.md#lv-u28) | vedtak | gjeldende | Byggherrens saksnummer står i referanselinjen og fryses med brevet. | designdel: saksnummeret i prosjektinnstillingene → nytt forløp trengs: prosjektinnstillingene for brevene | 0 |
| [LV-U29](../plans/vedtak.md#lv-u29) | vedtak | gjeldende | Vedtatt brevtekst for varselet etter § 34.1.3. |  | 3 (3/0/0/0) |
| [LV-U30](../plans/vedtak.md#lv-u30) | vedtak | gjeldende | Vedtatt brevtekst for den særskilte justeringen i vederlagskravet. |  | 3 (3/0/0/0) |
| [LV-U31](../plans/vedtak.md#lv-u31) | vedtak | gjeldende | Brevtekst og tolkning av § 34.2.2 når byggherren godkjenner fast sum, men ikke hele tilbudet. |  | 25 (13/0/3/9) |
| [LV-U32](../plans/vedtak.md#lv-u32) | vedtak | gjeldende | Brevtekst for fast sum, og at enigheten følger av svaret og ikke av setningen. |  | 18 (7/0/1/10) |
| [LV-U33](../plans/vedtak.md#lv-u33) | vedtak | gjeldende | Påberopelsen gir 0 kr for postene den rammer, med vedtatt brevtekst. |  | 0 |
| [LV-U34](../plans/vedtak.md#lv-u34) | vedtak | gjeldende | Vedtatt struktur og ordlyd for byggherrens svar. | designdel: punktene har overskriftene og rekkefølgen i skjemaet for svaret → BF-01 | 0 |
| [LV-U35](../plans/vedtak.md#lv-u35) | vedtak | gjeldende | Partene skrives fullt ut i vedtatt brevtekst. | designdel: BH og TE i visningen → system.md «Retningen» | 3 (0/0/0/3) |
| [LV-U36](../plans/vedtak.md#lv-u36) | vedtak | gjeldende | Presiserer vedtatt brevtekst om endringsordren i svaret. |  | 0 |
| [LV-U37](../plans/vedtak.md#lv-u37) | vedtak | gjeldende | Endrer vedtatt brevtekst for etikettene og «eks. mva.». |  | 0 |
| [LV-U38](../plans/vedtak.md#lv-u38) | vedtak | gjeldende | Vedtatt brevtekst for følgen for hver post uten tabell. |  | 0 |
| [LV-U39](../plans/vedtak.md#lv-u39) | vedtak | gjeldende | Henvisningsformen «punkt» i all vedtatt brevtekst. |  | 9 (0/0/0/9) |
| [LV-U40](../plans/vedtak.md#lv-u40) | vedtak | gjeldende | Presiserer henvisningene i vedtatt brevtekst. |  | 1 (0/0/0/1) |
| [LV-U41](../plans/vedtak.md#lv-u41) | vedtak | gjeldende | Vedtatt brevtekst om forholdet, som erstatter «grunnlaget». |  | 24 (0/0/0/24) |
| [LV-U42](../plans/vedtak.md#lv-u42) | vedtak | gjeldende | Vedtatt brevtekst for henvisningen til registrert korrespondanse. |  | 2 (0/0/0/2) |
| [LV-U43](../plans/vedtak.md#lv-u43) | design | gjeldende | Navnet på forholdet er navnet i den første påberopelsen, med vedtatt brevtekst. | designdel: ett navnefelt når saken opprettes → BF-05 Grensetilfelle, mønster 2; svar 03.11: B. | 21 (0/6/5/10) |
| [LV-U44](../plans/vedtak.md#lv-u44) | vedtak | gjeldende | Merkingen og henvisningen til tidligere brev etter pkt. D.1.2.5 er en del av brevet. | designdel: kontraktsforkortelsen i prosjektinnstillingene → nytt forløp trengs: prosjektinnstillingene for brevene | 0 |

### VS

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [VS-U1](../plans/vedtak.md#vs-u1) | vedtak | gjeldende | Hva en innsigelse etter punkt 5 tredje ledd kan gjelde, og at løsningen ikke avgjør rettidigheten. | designdel: protesten vises ved siden av innsigelsen → system.md «Mønstre» | 52 (21/0/6/25) |
| [VS-U2](../plans/vedtak.md#vs-u2) | design | gjeldende | Løsningen trekker ingen konklusjon av passivitet og søksmålsfrist, men viser frist og bestemmelse. | designdel: veiledningen med frist og bestemmelse → nytt forløp trengs: veiledning om passivitet og frister Grensetilfelle, mønster 1; svar 03.11: B. | 0 |
| [VS-U3](../plans/vedtak.md#vs-u3) | vedtak | gjeldende | Hvilke bestemmelser løsningen utleder virkningen av, og hvilke den bare registrerer og viser. |  | 28 (9/0/0/19) |
| [VS-U4](../plans/vedtak.md#vs-u4) | vedtak | gjeldende | Tolkningen av «måtte forstå» i punkt 33.6.1 og 34.3.3 som prinsipalt og subsidiært standpunkt. |  | 28 (15/0/0/13) |
| [VS-U5](../plans/vedtak.md#vs-u5) | vedtak | gjeldende | Byggherrens prinsipale beløp når sent varsel etter punkt 34.1.3 påberopes. |  | 50 (28/1/21/0) |
| [VS-U6](../plans/vedtak.md#vs-u6) | vedtak | gjeldende | Varselet etter punkt 34.1.2 er et eget varsel med egen dato, som avgjør preklusjonen. |  | 0 |
| [VS-U7](../plans/vedtak.md#vs-u7) | vedtak | gjeldende | Virkningen av å etterregistrere et varsel på en påberopt preklusjon og på godtakelsen av svaret. |  | 0 |
| [VS-U8](../plans/vedtak.md#vs-u8) | vedtak | gjeldende | Hvilken dato et varsel har, sendt fra løsningen eller registrert, og at byggherren kan bestride den. |  | 16 (10/1/2/3) |
| [VS-U9](../plans/vedtak.md#vs-u9) | vedtak | gjeldende | Påberopelsen i svaret er innsigelsen etter punkt 5, og hva en senere innsigelse virker. |  | 31 (14/0/3/14) |
| [VS-U10](../plans/vedtak.md#vs-u10) | design | gjeldende | Løsningen regner ingen fast frist for «uten ugrunnet opphold». | designdel: mottaksdatoen og dagene siden i visningen → nytt forløp trengs: veiledning om passivitet og frister Grensetilfelle, mønster 1; svar 03.11: B. | 0 |
| [VS-U11](../plans/vedtak.md#vs-u11) | vedtak | gjeldende | Byggherren kan gi opp innsigelsen uttrykkelig, og taushet leses ikke som oppgivelse. |  | 36 (21/0/0/15) |
| [VS-U12](../plans/vedtak.md#vs-u12) | vedtak | gjeldende | TE kan påberope passivitet etter punkt 32.3 annet ledd, uten utledet virkning og uten å sperre svaret. |  | 26 (17/0/0/9) |
| [VS-U13](../plans/vedtak.md#vs-u13) | vedtak | gjeldende | Tolkningen av force majeure i punkt 33.3 som avslag av grunnlaget eller standpunkt om dagene. |  | 2 (2/0/0/0) |
| [VS-U14](../plans/vedtak.md#vs-u14) | vedtak | gjeldende | Reglene om innsigelse gjelder også TE, fordi punkt 5 tredje ledd gjelder «en part». | beslutningsdel: TEs påberopelse får virkning først når TE kan svare i løsningen | 23 (7/0/6/10) |
| [VS-U15](../plans/vedtak.md#vs-u15) | vedtak | gjeldende | TEs rett til å varsle etter punkt 33.4 uten dager, med vedtatt brevtekst. | beslutningsdel: når varselet etter punkt 34.1.2 bygges | 52 (21/0/8/23) |
| [VS-U16](../plans/vedtak.md#vs-u16) | vedtak | gjeldende | Når et varsel etter punkt 33.4 kan sendes fra løsningen, og at et tidligere varsel kan registreres med sin dato. |  | 23 (4/0/3/16) |
| [VS-U17](../plans/vedtak.md#vs-u17) | vedtak | gjeldende | TEs begrunnelse etter punkt 33.6.2 er svar på forespørselen, med virkningen av en påberopelse. |  | 21 (18/0/0/3) |
| [VS-U18](../plans/vedtak.md#vs-u18) | vedtak | gjeldende | Løsningen avgjør ikke dagene etter punkt 33.5 og sammenlikner bare partenes tall. | designdel: punkt 33.5 som veiledning i fristkravet og fristsvaret → nytt forløp trengs: fristkravet og fristsvaret med veiledning | 0 |
| [VS-U19](../plans/vedtak.md#vs-u19) | vedtak | gjeldende | Når byggherren kan sende en forespørsel etter punkt 33.6.2, formkravene i brevet og når virkningen utledes. |  | 19 (17/0/0/2) |
| [VS-U20](../plans/vedtak.md#vs-u20) | vedtak | gjeldende | Påberopelsen av sent varsel etter punkt 33.4 står mot hver senere kravversjon til den uttrykkelig frafalles. |  | 22 (12/0/0/10) |
| [VS-U21](../plans/vedtak.md#vs-u21) | vedtak | gjeldende | Hva et registrert brev fra byggherren leses som påberopelse av. |  | 1 (0/0/0/1) |
| [VS-U22](../plans/vedtak.md#vs-u22) | beslutning | gjeldende | Et brev utenfor løsningen er dokumentasjon, og svaret tar stilling til punkt 33.4 og 33.6.1 hver for seg. | beslutningsdel: VS-U21 bygges ikke i første versjon Grensetilfelle, mønster 5; svar 03.11: B. | 4 (0/0/0/4) |
| [VS-U23](../plans/vedtak.md#vs-u23) | beslutning | gjeldende | En forespørsel sendt utenfor løsningen er dokumentasjon uten utledet virkning. | beslutningsdel: avgrensningen til første versjon Grensetilfelle, mønster 5; svar 03.11: B. | 1 (1/0/0/0) |
| [VS-U24](../plans/vedtak.md#vs-u24) | vedtak | gjeldende | Når en egen innsigelse er en påberopelse etter en bestemmelse, og hvor påberopelsen står. |  | 68 (30/0/0/38) |
| [VS-U25](../plans/vedtak.md#vs-u25) | vedtak | gjeldende | Datoen står i brevet som TEs opplysning, og løsningen vurderer ikke rettidigheten. |  | 3 (0/0/0/3) |
| [VS-U26](../plans/vedtak.md#vs-u26) | vedtak | gjeldende | Hvilken dato varslingsplikten løper fra i hver kategori, med vedtatt brevtekst. | designdel: datofeltet er påkrevd i kravet → BF-05 | 68 (27/0/20/21) |
| [VS-U27](../plans/vedtak.md#vs-u27) | vedtak | gjeldende | Når TE kan sende begrunnelsen etter punkt 33.6.2 fra løsningen. | designdel: visningen av en registrert forespørsel → nytt forløp trengs: forespørsel og begrunnelse etter 33.6.2 | 13 (10/0/0/3) |
| [VS-U28](../plans/vedtak.md#vs-u28) | vedtak | gjeldende | Hvordan regningsarbeid etter punkt 34.4 kreves og varsles, og hvilke virkninger løsningen ikke avgjør. | beslutningsdel: hva som sendes utenfor løsningen i første versjon | 0 |
| [VS-U29](../plans/vedtak.md#vs-u29) | vedtak | gjeldende | Byggherrens påberopelse mot begrunnelsen etter punkt 33.6.2 og virkningen av den. | Grensetilfelle, mønster 15. | 34 (33/0/0/1) |
| [VS-U30](../plans/vedtak.md#vs-u30) | vedtak | gjeldende | Etter TEs begrunnelse kan byggherren ikke sende en ny forespørsel fra løsningen. |  | 8 (5/0/0/3) |
| [VS-U31](../plans/vedtak.md#vs-u31) | vedtak | gjeldende | Byggherren kan sende høyst én forespørsel etter punkt 33.6.2 fra løsningen. |  | 13 (11/0/0/2) |
| [VS-U32](../plans/vedtak.md#vs-u32) | vedtak | gjeldende | Påberopelsen av sen spesifisering står i svaret på det senere fristkravet. |  | 0 |
| [VS-U33](../plans/vedtak.md#vs-u33) | vedtak | gjeldende | Bare et krav om dager fremmet i løsningen stopper forespørselen. |  | 10 (10/0/0/0) |
| [VS-U34](../plans/vedtak.md#vs-u34) | vedtak | gjeldende | Datoen for et varsel utenfor løsningen er korrespondansens dato, og det egne brevet faller bort. | designdel: valget i kravskjemaet og korrespondansen i samme forløp → nytt forløp trengs: varsel sendt utenfor i kravskjemaet | 23 (11/0/0/12) |
| [VS-U35](../plans/vedtak.md#vs-u35) | beslutning | gjeldende | Rekkefølgen: den egne innsigelsen, passiviteten og bestridelsen bygges ikke i første versjon. | Grensetilfelle, mønster 5; svar 03.11: B. | 3 (0/0/0/3) |
| [VS-U36](../plans/vedtak.md#vs-u36) | vedtak | gjeldende | Påberopelsen mot begrunnelsen etter punkt 33.6.2 står i svaret på det første kravet med dager. |  | 0 |
| [VS-U37](../plans/vedtak.md#vs-u37) | vedtak | gjeldende | Hva påberopelsen gjelder, og at en versjon i en annen underkategori er et nytt varsel. |  | 7 (0/0/2/5) |
| [VS-U38](../plans/vedtak.md#vs-u38) | vedtak | gjeldende | Datoen for varselet etter punkt 32.2, rettingen av den og vedtatt brevtekst i påberopelsen. | designdel: spørsmålet og feltene i skjemaet for ny sak → BF-05 | 62 (22/14/7/19) |
| [VS-U39](../plans/vedtak.md#vs-u39) | design | gjeldende | Hjelpeteksten ved spørsmålet i skjemaet for ny sak og når spørsmålet stilles. | BF-05 Grensetilfelle, mønster 8. | 12 (4/0/2/6) |
| [VS-U40](../plans/vedtak.md#vs-u40) | vedtak | gjeldende | TE kan legge til et varsel etter punkt 32.2 etter opprettelsen, og et gitt svar står. |  | 0 |
| [VS-U41](../plans/vedtak.md#vs-u41) | vedtak | gjeldende | Vedtatt brevtekst i byggherrens svar om et registrert varsel. |  | 0 |
| [VS-U42](../plans/vedtak.md#vs-u42) | vedtak | gjeldende | Tolkningen av punkt 35.2 slik kontraktsgrunnlaget endrer den. | designdel: fristen vises uten dato → nytt forløp trengs: veiledning om passivitet og frister | 0 |

### MM

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [MM-U1](../plans/vedtak.md#mm-u1) | vedtak | gjeldende | Et varsel registrert etter kravet og virkningen for en påberopt preklusjon. |  | 49 (11/0/6/32) |
| [MM-U2](../plans/vedtak.md#mm-u2) | beslutning | gjeldende | Ingen bindende kommando godtas i en sak kjernen ikke kan tolke. | designdel: teksten om sending utenfor appen → nytt forløp trengs: sak som kjernen ikke forstår Grensetilfelle, mønster 5; svar 03.11: B. | 103 (42/5/12/44) |
| [MM-U3](../plans/vedtak.md#mm-u3) | vedtak | gjeldende | Virkningen av en enighet fastsettes når den inngås. |  | 30 (7/0/0/23) |
| [MM-U4](../plans/vedtak.md#mm-u4) | vedtak | opphevet 09.10 av MM-U9 | TEs aksept avvises når brevet avviker fra utledningen, så byggherren ikke bindes utover brevet. | Opphevet 09.10 av MM-U9 Var *historisk*; klassen er satt etter testen 04.11. | 5 (0/0/0/5) |
| [MM-U5](../plans/vedtak.md#mm-u5) | vedtak | opphevet 09.10 av MM-U9 | Etter et slikt avvik regnes grunnlaget som uavklart, og en betinget enighet forblir betinget. | Opphevet 09.10 av MM-U9 Var *historisk*; klassen er satt etter testen 04.11. | 4 (0/0/0/4) |
| [MM-U6](../plans/vedtak.md#mm-u6) | vedtak | opphevet 09.10 av MM-U9 | TE kan ikke godta et svar uten lagret beslutningsgrunnlag, altså hvilken virkning aksepten har. | Opphevet 09.10 av MM-U9 Var *historisk*; klassen er satt etter testen 04.11. | 4 (0/0/0/4) |
| [MM-U7](../plans/vedtak.md#mm-u7) | vedtak | gjeldende | En part kan bestride en opplysning fra motparten uten virkning på utfallet, også etter avslutningen. |  | 19 (7/0/0/12) |
| [MM-U8](../plans/vedtak.md#mm-u8) | vedtak | gjeldende | Virkningen av en ny opplysning for preklusjonen og for TEs aksept. |  | 19 (2/0/0/17) |
| [MM-U9](../plans/vedtak.md#mm-u9) | vedtak | gjeldende | Et sendt brev beholder virkningen det hadde da det ble sendt. | designdel: merknaden om avviket → nytt forløp trengs: merknad etter endrede regler | 93 (41/0/2/50) |
| [MM-U10](../plans/vedtak.md#mm-u10) | vedtak | gjeldende | Hva ett brev fra én part kan inneholde, tolket etter § 5. |  | 5 (0/0/0/5) |
| [MM-U11](../plans/vedtak.md#mm-u11) | vedtak | gjeldende | Hva beslutningsgrunnlaget fryser, og at utfallet utledes av de frosne standpunktene. | beslutningsdel: ingen regel leser et lagret utfall | 19 (13/0/0/6) |
| [MM-U12](../plans/vedtak.md#mm-u12) | vedtak | gjeldende | Appens frosne vurdering er ikke en rettslig avgjørelse, og en senere avklaring er et nytt utsagn. |  | 68 (17/0/1/50) |
| [MM-U13](../plans/vedtak.md#mm-u13) | beslutning | gjeldende | Hva reglene i kjernen leser, som arkitekturregel. |  | 12 (9/0/0/3) |
| [MM-U14](../plans/vedtak.md#mm-u14) | vedtak | gjeldende | En bestridelse avvises også når saken ikke er forstått. |  | 8 (2/0/0/6) |
| [MM-U15](../plans/vedtak.md#mm-u15) | beslutning | gjeldende | Omregning av et lagret resultat med andre versjoner før visning (B-10). | designdel: merket «Oppdateres» i oversikten → nytt forløp trengs: sakslisten med krav og nøkkeltall Grensetilfelle, mønster 9. | 4 (3/1/0/0) |
| [MM-U16](../plans/vedtak.md#mm-u16) | vedtak | gjeldende | Det nye regler kan endre, er appens utledning av utfallet, ikke brevene eller standpunktene. | beslutningsdel: rapporten om omregningen; designdel: merknaden på saken. Grensetilfelle, mønster 9, rettet etter kontrollen. | 1 (1/0/0/0) |
| [MM-U17](../plans/vedtak.md#mm-u17) | vedtak | gjeldende | Appens vurdering av et registrert brev regnes etter reglene ved registreringen. |  | 55 (23/2/15/15) |
| [MM-U18](../plans/vedtak.md#mm-u18) | vedtak | gjeldende | En hendelse i strid med vedtakene om enighet og lukking gjør saken ikke forstått, og et registrert brev får ingen virkning. |  | 119 (44/0/0/75) |
| [MM-U19](../plans/vedtak.md#mm-u19) | vedtak | gjeldende | Virkningen av et registrert brev som strider mot enigheten eller lukkingen. |  | 25 (8/0/0/17) |
| [MM-U20](../plans/vedtak.md#mm-u20) | vedtak | gjeldende | Svar og aksept i et trukket spor strider mot vedtakene om lukking. |  | 42 (11/0/0/31) |
| [MM-U21](../plans/vedtak.md#mm-u21) | vedtak | gjeldende | Virkningen av en retting i og mot avsenderens favør. |  | 7 (0/0/0/7) |
| [MM-U22](../plans/vedtak.md#mm-u22) | design | gjeldende | Den faste lista av betegnelser per krav og for saken i visningen. | system.md «Mønstre» | 34 (12/5/9/8) |
| [MM-U23](../plans/vedtak.md#mm-u23) | design | gjeldende | Appen sier aldri selv at et krav er prekludert, tapt eller avgjort, og appens vurdering merkes som appens. | system.md «Mønstre»: designdelen flyttes og skrives etter språkreglene ([språkfila](../sprak.md#hva-løsningen-kalles)): teksten sier hva visningen bygger på, ikke «appens vurdering». At løsningen aldri sier at et krav er prekludert, tapt eller avgjort, står i VS-U3 og HF-U11, og at vurderingen ikke legges i munnen på en part, i MM-U33. Grensetilfelle, mønster 1; svar 03.11: B, lest 04.11. | 17 (10/0/3/4) |
| [MM-U24](../plans/vedtak.md#mm-u24) | design | gjeldende | Fristveiledningen regnes fra sendingen, og appen sier ikke at en frist er oversittet eller at en part har plikt. | designdel: det som foreligger ved kravet → system.md «Mønstre» Grensetilfelle, mønster 1; svar 03.11: B. | 2 (2/0/0/0) |
| [MM-U25](../plans/vedtak.md#mm-u25) | design | gjeldende | Visningen viser bare handlingene parten kan gjøre nå, med én linje om det som hindrer. | system.md «Handlingene i Varden» | 7 (0/0/4/3) |
| [MM-U26](../plans/vedtak.md#mm-u26) | vedtak | gjeldende | En retting fra byggherren går gjennom godkjenningen etter fullmakten. | designdel: hvordan motparten ser rettingen og tilbudet → BF-02A | 0 |
| [MM-U27](../plans/vedtak.md#mm-u27) | vedtak | gjeldende | En påberopelse eller revisjon i strid med partens eget utsagn gjør saken ikke forstått. | Snevret inn av MM-U34 punkt 6, ikke opphevet; kandidat i kjeden. Grensetilfelle, mønster 7, rettet etter kontrollen. | 7 (4/0/0/3) |
| [MM-U28](../plans/vedtak.md#mm-u28) | design | opphevet når Følge rettes (steg 3) | Hva lista og nøkkeltallene viser og summerer. Enighetens virkning er fastsatt andre steder. | designdel: radene i lista og eksempelet → nytt forløp trengs: sakslisten med krav og nøkkeltall Grensetilfelle, mønster 14. Var *historisk*; klassen er satt etter testen 04.11. | 28 (6/6/8/8) |
| [MM-U29](../plans/vedtak.md#mm-u29) | design | opphevet når Følge rettes (steg 3) | Hvilke krav arbeidslista viser, og teksten der. Den sier ingenting om plikt eller neste trekk. | system.md «Handlingene i Varden» Grensetilfelle, mønster 14. Følge bør si «erstattet av MM-U40». Var *historisk*; klassen er satt etter testen 04.11. | 18 (3/6/8/1) |
| [MM-U30](../plans/vedtak.md#mm-u30) | design | gjeldende | Betegnelsene per spor og rekkefølgen mellom dem. | system.md «Mønstre» | 38 (9/7/21/1) |
| [MM-U31](../plans/vedtak.md#mm-u31) | design | gjeldende | Når betegnelsen for forespørselen etter § 33.6.2 vises. | system.md «Mønstre» | 5 (5/0/0/0) |
| [MM-U32](../plans/vedtak.md#mm-u32) | design | gjeldende | Handlingene er aktive, og skjemaet sier ved feltet hva som mangler. | system.md «Knapper, skjemaer og feilmeldinger» | 22 (0/0/14/8) |
| [MM-U33](../plans/vedtak.md#mm-u33) | vedtak | gjeldende | Skillet mellom det løsningen lar en part gjøre, erklæringen og rettsvirkningen, og hva som lukker saken. | designdel: skjemateksten før sending → BF-01; skjemaet for endringsordren og «Avsluttet med EO» → BF-06 | 11 (0/0/0/11) |
| [MM-U34](../plans/vedtak.md#mm-u34) | vedtak | gjeldende | Opphever sperrene etter enighet og vern og fastsetter ny brevtekst og virkningen av aksept og endringsordre. | designdel: påminnelsene i skjemaet (punkt 1, 16 og 26) → BF-02B, BF-03, BF-01 | 291 (86/0/2/203) |
| [MM-U35](../plans/vedtak.md#mm-u35) | vedtak | gjeldende | Innlegget i fritekst, brevteksten og at løsningen ikke tolker det eller endrer utfallet. | beslutningsdel: «i første versjon»; designdel: tittelen parten skriver → BF-03 | 16 (0/0/0/16) |
| [MM-U36](../plans/vedtak.md#mm-u36) | design | gjeldende | Utfallet leser bare standpunktene i svaret, ikke innleggene. | designdel: innleggene i skjemaet for svar og aksept → BF-01 Grensetilfelle, mønster 8. | 6 (0/0/0/6) |
| [MM-U37](../plans/vedtak.md#mm-u37) | design | gjeldende | Hva sakslisten viser for hver KOE-sak. | nytt forløp trengs: sakslisten med krav og nøkkeltall | 11 (0/2/8/1) |
| [MM-U38](../plans/vedtak.md#mm-u38) | vedtak | gjeldende | Hva kortene summerer og teller, og hvilke saker som holdes utenfor summene. | designdel: kortene side om side og de dempede tallene → nytt forløp trengs: sakslisten med krav og nøkkeltall | 6 (0/0/6/0) |
| [MM-U39](../plans/vedtak.md#mm-u39) | beslutning | gjeldende | En sak løsningen ikke forstår, holdes utenfor summene. | designdel: raden uten tall og tekst → nytt forløp trengs: sakslisten med krav og nøkkeltall Grensetilfelle, mønster 4; svar 03.11: B. | 5 (0/0/5/0) |
| [MM-U40](../plans/vedtak.md#mm-u40) | design | gjeldende | Varden har ingen arbeidsliste, og siden for saken sier ikke hvem som skal handle. | system.md «Retningen» | 0 |

### GR

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [GR-U1](../plans/vedtak.md#gr-u1) | vedtak | gjeldende | Virkningen av en ny kravversjon av grunnlaget for svaret og for subsidiære svar. |  | 62 (6/0/0/56) |
| [GR-U2](../plans/vedtak.md#gr-u2) | vedtak | opphevet 28.10 av MM-U34 | Et godkjent og låst grunnlag kan ikke endres, heller ikke underkategorien. | Opphevet 28.10 av MM-U34 (endret 16.10 av GR-U22) Var *historisk*; klassen er satt etter testen 04.11. | 3 (0/0/0/3) |
| [GR-U3](../plans/vedtak.md#gr-u3) | beslutning | gjeldende | Hva som regnes som oppgjort etter frafall etter § 32.3 c. | beslutningsdel: endringsordren utstedes i en egen EO-sak (`kan_utstede_eo`) Grensetilfelle, mønster 6; svar 03.11: B. | 21 (4/0/0/17) |
| [GR-U4](../plans/vedtak.md#gr-u4) | vedtak | gjeldende | Om et revidert svar er prinsipalt eller subsidiært mens grunnlaget venter. |  | 29 (1/0/0/28) |
| [GR-U5](../plans/vedtak.md#gr-u5) | vedtak | gjeldende | Virkningen av at TE trekker grunnlaget for alle sendte krav. |  | 50 (13/0/1/36) |
| [GR-U6](../plans/vedtak.md#gr-u6) | vedtak | erstattet 08.10 av GR-U7 | Mens grunnlaget venter på nytt svar, avvises TEs aksept av et subsidiært svar på vederlag eller frist. | Erstattet 08.10 av GR-U7 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [GR-U7](../plans/vedtak.md#gr-u7) | vedtak | gjeldende | Virkningen av TEs aksept av svaret på vederlag eller frist og når partene er enige ved sammenfall. |  | 143 (36/0/6/101) |
| [GR-U8](../plans/vedtak.md#gr-u8) | vedtak | gjeldende | Aksept av et svar som godkjenner hele kravet avvises fordi partene alt er enige. |  | 29 (16/0/1/12) |
| [GR-U9](../plans/vedtak.md#gr-u9) | vedtak | gjeldende | Frafallet er byggherrens standpunkt og kan ikke godtas av TE. |  | 45 (17/1/0/27) |
| [GR-U10](../plans/vedtak.md#gr-u10) | vedtak | gjeldende | Byggherrens godkjenning uten påberopt preklusjon binder byggherren og er en endringsordre. |  | 80 (13/0/2/65) |
| [GR-U11](../plans/vedtak.md#gr-u11) | vedtak | gjeldende | Tolkningen av hvilke underkategorier § 32.2 gjelder for. |  | 45 (17/0/2/26) |
| [GR-U12](../plans/vedtak.md#gr-u12) | vedtak | gjeldende | Godkjenning uten påberopt preklusjon der § 32.2 gjaldt er en endringsordre, og vurderingen fryses. | designdel: varselet til BH og betegnelsen endringsordre i svarskjemaet → nytt forløp trengs: BH godkjenner forholdet som endringsordre | 58 (26/0/6/26) |
| [GR-U13](../plans/vedtak.md#gr-u13) | vedtak | gjeldende | Godkjenningen er en endringsordre bare når § 31.3 og fullmakten er oppfylt. |  | 27 (8/0/5/14) |
| [GR-U14](../plans/vedtak.md#gr-u14) | vedtak | gjeldende | Vedtatt brevtekst for svaret som er en endringsordre. |  | 26 (15/0/0/11) |
| [GR-U15](../plans/vedtak.md#gr-u15) | vedtak | gjeldende | TEs varsel etter § 32.2 fra appen må beskrive pålegget og avvises ellers. |  | 46 (12/1/9/24) |
| [GR-U16](../plans/vedtak.md#gr-u16) | design | gjeldende | Endringsordrens dato eller nummer er påkrevd innhold i kravet og i registreringen. | designdel: det påkrevde feltet i grunnlagskravet → BF-05 Grensetilfelle, mønster 2; svar 03.11: B. | 22 (14/0/7/1) |
| [GR-U17](../plans/vedtak.md#gr-u17) | vedtak | gjeldende | Byggherren er bundet av løftet om endringsordre ved frafall. |  | 24 (8/0/0/16) |
| [GR-U18](../plans/vedtak.md#gr-u18) | vedtak | gjeldende | Tolkningen av § 32.3 c for hvilke pålegg frafall er tillatt. |  | 16 (10/0/0/6) |
| [GR-U19](../plans/vedtak.md#gr-u19) | vedtak | gjeldende | Hvilken hjemmel en ny grunnlagsversjon kan ha. | Grensetilfelle, mønster 15. | 3 (0/0/0/3) |
| [GR-U20](../plans/vedtak.md#gr-u20) | vedtak | gjeldende | Frafallet binder også ved en ny grunnlagsversjon. |  | 21 (5/0/0/16) |
| [GR-U21](../plans/vedtak.md#gr-u21) | vedtak | opphevet 16.10 av GR-U22 | Byggherren kan svare på en ny grunnlagsversjon i en annen underkategori, og løftet om endringsordre står. | Opphevet 16.10 av GR-U22 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [GR-U22](../plans/vedtak.md#gr-u22) | vedtak | gjeldende | TE kan ikke endre hjemmelen, og overføringen til ny sak er ikke et avkall. |  | 62 (14/0/6/42) |
| [GR-U23](../plans/vedtak.md#gr-u23) | vedtak | gjeldende | Grunnlaget er avklart ved frafallet mens den nye versjonen venter. |  | 38 (20/1/3/14) |
| [GR-U24](../plans/vedtak.md#gr-u24) | vedtak | opphevet 28.10 av MM-U34 | Når kravene er avgjort, avvises svar på en ventende grunnlagsversjon, og frafallet står. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 3 (0/0/0/3) |
| [GR-U25](../plans/vedtak.md#gr-u25) | vedtak | gjeldende | Trekket av grunnlaget omfatter også et spor med bare et varsel eller «ingen krav». | beslutningsdel: hendelsestypene trekket lagres som; designdel: betegnelsen «Trukket» per spor → nytt forløp trengs: TE trekker påberopelsen av forholdet. Grensetilfelle, mønster 4; svar 04.11 (3): A. | 10 (7/0/2/1) |
| [GR-U26](../plans/vedtak.md#gr-u26) | vedtak | gjeldende | Vedtatt forbehold i brevet og virkningen av godkjenning under forbeholdet. | designdel: visningen av standpunktet sammen med det senere grunnlagssvaret → BF-04 | 37 (15/0/12/10) |
| [GR-U27](../plans/vedtak.md#gr-u27) | vedtak | gjeldende | TEs aksept av avslaget på grunnlaget eller trekket lukker KOE-saken. | designdel: varselet i skjemaet før sending og statusen → nytt forløp trengs: TE godtar avslaget på forholdet | 37 (27/0/0/10) |
| [GR-U28](../plans/vedtak.md#gr-u28) | beslutning | gjeldende | Frafall hindrer ikke at KOE-saken omfattes av en endringsordre, som lukker den. | beslutningsdel: endringsordren sendes gjennom en EO-sak Grensetilfelle, mønster 6; svar 03.11: B. | 22 (7/0/0/15) |
| [GR-U29](../plans/vedtak.md#gr-u29) | vedtak | gjeldende | Vedtatt plassering og ordlyd for forbeholdet i brevet. |  | 0 |
| [GR-U30](../plans/vedtak.md#gr-u30) | design | gjeldende | Navnet på TEs handling i grensesnittet. | «Handlingene i Varden» | 1 (0/0/0/1) |
| [GR-U31](../plans/vedtak.md#gr-u31) | vedtak | gjeldende | Vedtatt brevnavn og brevtekst for TEs første brev. | designdel: handlingsnavnet ‹Svar› → «Handlingene i Varden» | 21 (5/0/6/10) |
| [GR-U32](../plans/vedtak.md#gr-u32) | vedtak | gjeldende | Vedtatt brevtekst for byggherrens svar på grunnlaget i hvert tilfelle. |  | 0 |
| [GR-U33](../plans/vedtak.md#gr-u33) | vedtak | gjeldende | Vedtatt ordlyd for forbeholdet. |  | 0 |

### GFK

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [GFK-U1](../plans/vedtak.md#gfk-u1) | vedtak | gjeldende | Hvem som kan endre fullmaktene. | designdel: at appen ikke viser hvem som endret dem → nytt forløp trengs: driften registrerer fullmakter og roller Grensetilfelle, mønster 11. | 0 |
| [GFK-U2](../plans/vedtak.md#gfk-u2) | vedtak | gjeldende | Svar som går gjennom fullmakten, kan ikke sendes når fullmakter mangler. |  | 3 (0/3/0/0) |
| [GFK-U3](../plans/vedtak.md#gfk-u3) | vedtak | gjeldende | Uten dagmulktsats regnes fristsporet som et krav som ikke er tallfestet. |  | 7 (0/5/2/0) |
| [GFK-U4](../plans/vedtak.md#gfk-u4) | vedtak | gjeldende | Hvem som kan sende svaret alene når dagmulktsatsen mangler. |  | 5 (0/5/0/0) |
| [GFK-U5](../plans/vedtak.md#gfk-u5) | beslutning | gjeldende | Når godkjenningsinngangene bygges. |  | 4 (0/4/0/0) |
| [GFK-U6](../plans/vedtak.md#gfk-u6) | vedtak | gjeldende | Fullmakten følger beløpsgrensen for rollen og hierarkiet i HR-dataene. | beslutningsdel: HR-dataene som kilde | 6 (0/6/0/0) |
| [GFK-U7](../plans/vedtak.md#gfk-u7) | beslutning | gjeldende | Den siste godkjenningen sender svaret, og godkjenningen avvises når kravet er endret. | Grensetilfelle, mønster 3; svar 03.11: B. | 0 |
| [GFK-U8](../plans/vedtak.md#gfk-u8) | vedtak | gjeldende | Hvem i kjeden som må godkjenne svaret. |  | 5 (0/5/0/0) |
| [GFK-U9](../plans/vedtak.md#gfk-u9) | vedtak | gjeldende | Hva godkjenneren kan lese. |  | 8 (0/8/0/0) |
| [GFK-U10](../plans/vedtak.md#gfk-u10) | vedtak | gjeldende | Kjeden fryses, og pakken eller handlingen avvises når kjeden ikke kan avgjøres. |  | 13 (0/13/0/0) |
| [GFK-U11](../plans/vedtak.md#gfk-u11) | vedtak | gjeldende | Fullmakten er en grense per rolle, felles for byggherren. | beslutningsdel: tabellen fases ut Grensetilfelle, mønster 11. | 5 (0/5/0/0) |
| [GFK-U12](../plans/vedtak.md#gfk-u12) | vedtak | gjeldende | Når HR-kopien regnes som for gammel til at en pakke kan lages. | Grensetilfelle, mønster 11. | 0 |
| [GFK-U13](../plans/vedtak.md#gfk-u13) | vedtak | gjeldende | Alle i kjeden må ha en registrert rolle, ellers kan svaret ikke sendes. |  | 0 |
| [GFK-U14](../plans/vedtak.md#gfk-u14) | vedtak | gjeldende | Skillet mellom roller som ikke er registrert, og en kjede som mangler. |  | 0 |
| [GFK-U15](../plans/vedtak.md#gfk-u15) | vedtak | gjeldende | Når en godkjenning avvises, og når pakken lages på nytt. |  | 0 |
| [GFK-U16](../plans/vedtak.md#gfk-u16) | vedtak | gjeldende | Hvordan dagmulktsatsen regnes etter § 40.3 a. | designdel: feltene i prosjektinnstillingene → nytt forløp trengs: prosjektinnstillinger for dagmulkt og fristtabell | 0 |
| [GFK-U17](../plans/vedtak.md#gfk-u17) | vedtak | gjeldende | Hvordan verdien av fristdagene regnes for fullmakten og 30 %-grensen. | designdel: at utregningen sier at kalenderdagene er brukt → nytt forløp trengs: utregning av verdien for fullmakt | 0 |
| [GFK-U18](../plans/vedtak.md#gfk-u18) | vedtak | gjeldende | Satsene etter § 40.3 a og b, og at fristkravet sier hvilke frister det gjelder. | designdel: fristtabellen i prosjektinnstillingene → nytt forløp trengs: prosjektinnstillinger for dagmulkt og fristtabell; feltet for fristene i fristkravet → nytt forløp trengs: TE velger frist i fristkravet | 0 |
| [GFK-U19](../plans/vedtak.md#gfk-u19) | vedtak | gjeldende | Hvilke dager som telles, og fra hvilken frist. |  | 0 |
| [GFK-U20](../plans/vedtak.md#gfk-u20) | vedtak | gjeldende | En frist som ikke er dagmulktbelagt, gir ingen verdi og ingen 30 %-grense. |  | 0 |
| [GFK-U21](../plans/vedtak.md#gfk-u21) | vedtak | gjeldende | Verdien for flere dagmulktbelagte frister er summen. | designdel: utregningen viser hver frist for seg → nytt forløp trengs: utregning av verdien for fullmakt | 0 |
| [GFK-U22](../plans/vedtak.md#gfk-u22) | vedtak | gjeldende | Hvem som kan endre opplysningene om dagmulkten. |  | 0 |
| [GFK-U23](../plans/vedtak.md#gfk-u23) | vedtak | gjeldende | Begge parter kan lese fristtabellen. |  | 0 |

### HF

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [HF-U1](../plans/vedtak.md#hf-u1) | beslutning | gjeldende | Hvert utsagn viser til det det gjelder, og en manglende vurdering er ikke et standpunkt. | beslutningsdel: brevet lagres samlet, og ukjent innhold stopper saken (B-10) Grensetilfelle, mønster 4; svar 03.11: B. | 90 (47/0/0/43) |
| [HF-U2](../plans/vedtak.md#hf-u2) | beslutning | gjeldende | Hva «frafalt» og «hindring» betyr etter NS 8407, og at appens vurdering ikke er byggherrens utsagn. | beslutningsdel: begrepene og feltnavnene i hendelsene TS skriver (B-17); designdel: appens vurdering vises ikke som byggherrens → «Mønstre» Grensetilfelle, mønster 4; svar 03.11: B. | 33 (18/0/2/13) |
| [HF-U3](../plans/vedtak.md#hf-u3) | beslutning | gjeldende | Lagringsformen, med brevet som journalens eneste kilde og tabellene laget av brevene. |  | 0 |
| [HF-U4](../plans/vedtak.md#hf-u4) | vedtak | gjeldende | Et uttrykkelig «i tide» binder parten og sperrer en senere påberopelse av «for sent» etter samme bestemmelse. |  | 61 (26/0/0/35) |
| [HF-U5](../plans/vedtak.md#hf-u5) | vedtak | gjeldende | Krav og svar er tilbud og løfter, og en revisjon av svaret kan ikke senke det byggherren har innrømmet. |  | 46 (15/0/0/31) |
| [HF-U6](../plans/vedtak.md#hf-u6) | vedtak | gjeldende | Et utsagn binder parten fra det er kommet fram til motparten. |  | 9 (0/0/0/9) |
| [HF-U7](../plans/vedtak.md#hf-u7) | vedtak | gjeldende | Hva som regnes som godkjenning, og at et avvikende svar er avslag i forening med nytt tilbud. |  | 5 (4/0/0/1) |
| [HF-U8](../plans/vedtak.md#hf-u8) | vedtak | gjeldende | Når byggherrens svar faller bort som tilbud. |  | 35 (7/0/0/28) |
| [HF-U9](../plans/vedtak.md#hf-u9) | vedtak | gjeldende | Når partene er enige, og hva enigheten omfatter. |  | 12 (0/0/0/12) |
| [HF-U10](../plans/vedtak.md#hf-u10) | vedtak | gjeldende | Virkningen av et avkall og når det avvises. |  | 0 |
| [HF-U11](../plans/vedtak.md#hf-u11) | vedtak | gjeldende | En påberopelse av at noe kom for sent, er partens utsagn, og appen trekker ikke slutningen selv. | designdel: visningen av bestemmelsen påberopelsen gjelder → BF-04 | 3 (2/0/0/1) |
| [HF-U12](../plans/vedtak.md#hf-u12) | vedtak | gjeldende | Virkningen av en endringsordre og av utsagnene i den. |  | 0 |
| [HF-U13](../plans/vedtak.md#hf-u13) | vedtak | gjeldende | Det som er meddelt, binder slik det sto, og et registrert brev gir ingen utledet virkning. | designdel: at visningen ikke påstår mer enn appen vet → «Mønstre» | 7 (6/0/0/1) |
| [HF-U14](../plans/vedtak.md#hf-u14) | vedtak | opphevet 28.10 av MM-U34 | Byggherren er bundet av aksepten av beregningsmåten, så en revisjon til «aksepterer ikke» avvises. | opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 8 (1/0/0/7) |
| [HF-U15](../plans/vedtak.md#hf-u15) | vedtak | gjeldende | Hvilke svar som kan ha akseptfrist, og at aksept av et helt avslag gjelder straks. |  | 0 |
| [HF-U16](../plans/vedtak.md#hf-u16) | vedtak | gjeldende | Når akseptfristen er ute, og hvilke datoer byggherren kan sette. |  | 0 |
| [HF-U17](../plans/vedtak.md#hf-u17) | vedtak | opphevet 28.10 av MM-U34 | Akseptfristen kan bare forlenges eller fjernes, og etter fristen binder svaret ikke byggherren. | opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [HF-U18](../plans/vedtak.md#hf-u18) | vedtak | gjeldende | Svaret står etter akseptfristen, og brevteksten for en aksept etter fristen er vedtatt. | designdel: at saken venter på TE → BF-01 | 3 (0/0/0/3) |
| [HF-U19](../plans/vedtak.md#hf-u19) | vedtak | opphevet 28.10 av MM-U34 | Et avslått tilbud kan ikke godtas på nytt, og byggherrens godtakelse av TEs tilbud gir enighet. | opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [HF-U20](../plans/vedtak.md#hf-u20) | vedtak | gjeldende, med motsigelsen | Et revidert svar som for første gang godkjenner noe, kan få akseptfrist, altså hvor lenge byggherren er bundet. | Grensetilfelle, mønster 7. Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [HF-U21](../plans/vedtak.md#hf-u21) | vedtak | gjeldende | En ny grunnlagsversjon med samme hjemmel endrer ikke bindingen i svar på vederlag og frist. |  | 12 (3/0/0/9) |
| [HF-U22](../plans/vedtak.md#hf-u22) | design | gjeldende | Senker byggherren etter akseptfristen, peker appen ut fristen etter § 33.7 og § 34.3.3 uten å trekke konklusjonen. | designdel: visningen av bestemmelsen og fristen → nytt forløp trengs: BH senker svar etter akseptfrist Grensetilfelle, mønster 1; svar 03.11: B. | 6 (0/0/0/6) |

### DL

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [DL-U1](../plans/vedtak.md#dl-u1) | beslutning | gjeldende | Datalaget bygges i TS rett mot SQL Server. |  | 1 (0/1/0/0) |
| [DL-U2](../plans/vedtak.md#dl-u2) | beslutning | gjeldende | Når feil i Python rettes. |  | 2 (0/0/1/1) |
| [DL-U3](../plans/vedtak.md#dl-u3) | beslutning | gjeldende | Lagringsformatet for tidspunkter. |  | 7 (0/7/0/0) |
| [DL-U4](../plans/vedtak.md#dl-u4) | vedtak | gjeldende | Avsenderens kontraktsside må være entydig, og når teamet føres på brevet. |  | 11 (0/11/0/0) |
| [DL-U5](../plans/vedtak.md#dl-u5) | beslutning | gjeldende | Rekkefølgen for radsikkerheten, rollene og reviewet. |  | 2 (0/2/0/0) |
| [DL-U6](../plans/vedtak.md#dl-u6) | beslutning | gjeldende | Saksnummeret som sakens identitet. |  | 11 (2/7/1/1) |
| [DL-U7](../plans/vedtak.md#dl-u7) | vedtak | gjeldende | Hvilken medlemsliste som avgjør tilgangen. | beslutningsdel: hva synkroniseringen lagrer Grensetilfelle, mønster 11. | 13 (0/13/0/0) |
| [DL-U8](../plans/vedtak.md#dl-u8) | vedtak | gjeldende | En eldre medlemsliste gjør ikke et deaktivert medlem aktivt igjen. |  | 10 (0/10/0/0) |
| [DL-U9](../plans/vedtak.md#dl-u9) | vedtak | gjeldende | En eldre medlemsliste gir ikke et nytt medlemskap. |  | 12 (0/12/0/0) |
| [DL-U10](../plans/vedtak.md#dl-u10) | vedtak | gjeldende | Medlemskapene blir inaktive når koblingen oppheves eller endres. |  | 10 (0/10/0/0) |
| [DL-U11](../plans/vedtak.md#dl-u11) | vedtak | gjeldende | Hva medlemmene kan gjøre i et inaktivt prosjekt. | designdel: prosjektet vises som inaktivt i lista → nytt forløp trengs: prosjektlisten med inaktive prosjekter | 0 |
| [DL-U12](../plans/vedtak.md#dl-u12) | vedtak | gjeldende | Navnet ved hendelsene skjermes ikke for noen som har tilgang til saken. | designdel: navnet ved hver hendelse i tidslinjen → «Mønstre» Grensetilfelle, mønster 11. | 0 |
| [DL-U13](../plans/vedtak.md#dl-u13) | vedtak | gjeldende | Et team kan ikke flyttes til den andre siden eller fjernes når prosjektet har saker. | Grensetilfelle, mønster 11. | 0 |
| [DL-U14](../plans/vedtak.md#dl-u14) | vedtak | gjeldende | Prosjektet gjelder én entreprisekontrakt, og TE-teamene hører til samme totalentreprenør. |  | 4 (0/4/0/0) |
| [DL-U15](../plans/vedtak.md#dl-u15) | vedtak | gjeldende | Hvem som kan lese sakene og brevene. |  | 12 (0/12/0/0) |
| [DL-U16](../plans/vedtak.md#dl-u16) | beslutning | gjeldende | Migrasjonene legger bare til fra første ekte sak. |  | 9 (0/9/0/0) |

### EO

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [EO-U1](../plans/vedtak.md#eo-u1) | vedtak | gjeldende | En endringsordre utstedes bare i en EO-sak, og en omforent KOE-sak formaliseres ved å inngå i den. | beslutningsdel: kommandoen og hendelsestypen `eo_utstedt` | 10 (0/0/0/10) |
| [EO-U2](../plans/vedtak.md#eo-u2) | vedtak | opphevet 28.10 av MM-U34 | Når en KOE-sak kan inngå i en endringsordre, og at et godtatt avslag eller trukket spor teller som oppgjort. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 4 (0/0/0/4) |
| [EO-U3](../plans/vedtak.md#eo-u3) | vedtak | gjeldende | En KOE-sak inngår i høyst én endringsordre, og TEs uenighet føres i en ny KOE. |  | 12 (1/0/0/11) |
| [EO-U4](../plans/vedtak.md#eo-u4) | vedtak | gjeldende | EO-sakens livsløp med utstedelse, revisjon og TEs ene svar på hver utgave. |  | 25 (0/0/0/25) |
| [EO-U5](../plans/vedtak.md#eo-u5) | vedtak | opphevet 28.10 av MM-U34 | Kravet om enighet før en sak kan inngå i en endringsordre, og at en endringsordre på null er mulig. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 4 (1/0/0/3) |
| [EO-U6](../plans/vedtak.md#eo-u6) | vedtak | opphevet 28.10 av MM-U34 | En endringsordre som svar på grunnlaget er en godkjenning som gir enighet om grunnlaget og sperrer trekk etter § 32.2. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [EO-U7](../plans/vedtak.md#eo-u7) | vedtak | opphevet 28.10 av MM-U34 | En KOE-sak med endringsordre som grunnlagssvar kan senere inngå i en ny endringsordre, fordi å vise til en sak ikke er å inngå i den. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [EO-U8](../plans/vedtak.md#eo-u8) | vedtak | gjeldende | Hva utsagnene i en endringsordre er, og hva TEs aksept av den omfatter. |  | 0 |
| [EO-U9](../plans/vedtak.md#eo-u9) | vedtak | opphevet 28.10 av MM-U34 | En endringsordre som er svar på grunnlaget, kan ikke revideres, og TEs uenighet går i en ny sak. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [EO-U10](../plans/vedtak.md#eo-u10) | vedtak | opphevet 28.10 av MM-U34 | Tolkningen av «godkjent delvis» i EO-U5 som et svar TE har godtatt. | Opphevet 28.10 av MM-U34 Var *historisk*; klassen er satt etter testen 04.11. | 0 |
| [EO-U11](../plans/vedtak.md#eo-u11) | design | gjeldende | Partene har selv ansvar for historikken, og løsningen velger ikke hvilke varsler som er relevante. | designdel: varslene vises ikke i den nye KOE-saken → nytt forløp trengs: ny KOE etter bestridt endringsordre Grensetilfelle, mønster 1; svar 03.11: B. | 0 |
| [EO-U12](../plans/vedtak.md#eo-u12) | vedtak | gjeldende | Godkjent grunnlag lukker ikke KOE-saken, mens endringsordren i EO-saken gjør det. |  | 47 (16/0/0/31) |
| [EO-U13](../plans/vedtak.md#eo-u13) | vedtak | gjeldende | Løsningen utleder ingen rettsvirkning av at endringsordren omfatter KOE-saken. | designdel: merket «Inngår i EO-nummer» i sakslisten og på siden for saken → BF-06. Grensetilfelle, mønster 8, rettet etter kontrollen. | 12 (0/0/5/7) |
| [EO-U14](../plans/vedtak.md#eo-u14) | design | gjeldende | Hvilken kode merket på KOE-saken viser. | BF-06 | 3 (0/0/2/1) |

### KT

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [KT-U1](../plans/vedtak.md#kt-u1) | beslutning | gjeldende | Feltet i den offentlige tilstanden som utfører KA-U1 i API-kontrakten. | Grensetilfelle, mønster 8. | 13 (1/0/0/12) |
| [KT-U2](../plans/vedtak.md#kt-u2) | beslutning | gjeldende | Omfanget og formen på den smale kontrakten for språkprøven. |  | 1 (0/0/0/1) |
| [KT-U3](../plans/vedtak.md#kt-u3) | beslutning | gjeldende | Integrasjonen med Catenda når en sak opprettes i løsningen. |  | 11 (0/7/0/4) |
| [KT-U4](../plans/vedtak.md#kt-u4) | beslutning | gjeldende | Konfigurasjonen av ett topic-board per prosjekt. |  | 4 (0/4/0/0) |
| [KT-U5](../plans/vedtak.md#kt-u5) | beslutning | gjeldende | Samme kvittering på et gjentatt kall. |  | 3 (0/3/0/0) |
| [KT-U6](../plans/vedtak.md#kt-u6) | vedtak | gjeldende | En topic er ikke et varsel eller krav, og løsningen avgjør ikke om den var det. | beslutningsdel: saken får topicens tittel | 10 (0/5/0/5) |
| [KT-U7](../plans/vedtak.md#kt-u7) | beslutning | gjeldende | Bare TE kan opprette en KOE-sak, også fra en topic. | beslutningsdel: hendelsen beholdes i innboksen, og topicen får en kommentar Grensetilfelle, mønster 13. | 8 (0/5/0/3) |
| [KT-U8](../plans/vedtak.md#kt-u8) | beslutning | gjeldende | Løsningens omfang og at fristen i § 35.2 ikke regnes med dato. | beslutningsdel: hvilke deler av kontrakten løsningen dekker Grensetilfelle, mønster 5; svar 03.11: B. | 0 |
| [KT-U9](../plans/vedtak.md#kt-u9) | vedtak | gjeldende | TEs krav føres i en KOE-sak for alle forhold, og en endringsordre omfatter hele KOE-saker. | beslutningsdel: sakstypene og navnet på dem | 4 (0/0/4/0) |
| [KT-U10](../plans/vedtak.md#kt-u10) | vedtak | gjeldende | Bare TE oppretter en KOE-sak, og bare BH oppretter en EO-sak. | designdel: navnene ‹Nytt krav om endringsordre› og ‹Ny endringsordre› på handlingene → BF-05 og BF-06 | 18 (0/8/7/3) |
| [KT-U11](../plans/vedtak.md#kt-u11) | beslutning | gjeldende | Når saken og topicen opprettes i opprettelsesflyten. | BF-05 Grensetilfelle, mønster 13. | 37 (1/9/13/14) |

### FO

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [FO-U1](../plans/vedtak.md#fo-u1) | vedtak | gjeldende | TEs valgrett etter § 33.8 og når den gjelder. |  | 0 |
| [FO-U2](../plans/vedtak.md#fo-u2) | vedtak | gjeldende | Hva TE melder ved valget, og at forseringsvederlaget kreves i forseringssaken etter § 34. |  | 0 |
| [FO-U3](../plans/vedtak.md#fo-u3) | vedtak | gjeldende | BH har ingen svarplikt etter § 33.8, og hvordan løsningen regner 30 %-grensen. | designdel: forutsetningene som vises ved utregningen → nytt forløp trengs: forsering etter avslått fristkrav | 0 |
| [FO-U4](../plans/vedtak.md#fo-u4) | vedtak | gjeldende | Virkningen av at BH godkjenner dagene etter at TE har valgt forsering. | designdel: at fristsvaret er endret, vises i forseringssaken → nytt forløp trengs: forsering etter avslått fristkrav | 0 |
| [FO-U5](../plans/vedtak.md#fo-u5) | vedtak | gjeldende | TEs aksept av fristavslaget avvises mens en forseringssak viser til det. |  | 0 |
| [FO-U6](../plans/vedtak.md#fo-u6) | vedtak | gjeldende | Hvilke forseringssvar som går gjennom fullmakten. |  | 0 |
| [FO-U7](../plans/vedtak.md#fo-u7) | vedtak | gjeldende | BH er fortsatt bundet av de godkjente dagene når TE velger forsering. |  | 0 |
| [FO-U8](../plans/vedtak.md#fo-u8) | vedtak | gjeldende | 30 %-grensen og fullmakten regnes uten 10 %-taket. | designdel: forbeholdet om taket ved utregningen → nytt forløp trengs: forsering etter avslått fristkrav | 0 |

### B

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [B-03-DOKUMENT](../plans/vedtak.md#b-03-dokument) | beslutning | gjeldende | Brevet leveres samlet som ett dokument i Catenda og revideres ikke. | beslutningsdel: dokumentnøkkel, navnestandard og avstemming i #310 Grensetilfelle, mønster 3; svar 03.11: B. | 0 |
| [B-12-DATABASEN](../plans/vedtak.md#b-12-databasen) | beslutning | gjeldende | Azure SQL Database som plattform. |  | 0 |
| [B-10](../plans/vedtak.md#b-10) | beslutning | gjeldende | Versjonene og når et lagret resultat regnes ut på nytt. | Grensetilfelle, mønster 9. | 13 (12/1/0/0) |
| [B-15](../plans/vedtak.md#b-15) | beslutning | gjeldende | Vurderingene regnes i klienten og valideres på nytt av serveren. |  | 8 (1/1/3/3) |
| [B-17](../plans/vedtak.md#b-17) | beslutning | gjeldende | TS eier KOE-, EO- og forseringsdomenet, og byttet skjer samlet. |  | 23 (5/6/8/4) |
| [B-18](../plans/vedtak.md#b-18) | beslutning | gjeldende | Valget av serverlag for TS-kjernen. |  | 4 (0/3/1/0) |
| [B-19](../plans/vedtak.md#b-19) | beslutning | gjeldende | Backenden samles i TS, og rekkefølgen for databasebyttet. |  | 6 (0/6/0/0) |

### MP

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [MP-U4](../plans/vedtak.md#mp-u4) | vedtak | gjeldende | Tolkningen av en sen punkt 5-innsigelse mot sen spesifisering etter § 33.6.2. |  | 0 |
| [MP-U5](../plans/vedtak.md#mp-u5) | vedtak | gjeldende | Rettidigheten vurderes for hver innsigelse i samme brev. |  | 0 |
| [MP-U6](../plans/vedtak.md#mp-u6) | vedtak | gjeldende | Hvilke innsigelser en protest mot sent svar gjelder. |  | 13 (6/0/0/7) |
| [MP-U7](../plans/vedtak.md#mp-u7) | vedtak | gjeldende | Hva løsningen utleder ved motstridende dokumentasjon, og at sendte brev ikke endres. |  | 0 |

### RP

| ID | Klasse | Tilstand | Begrunnelse | Mål eller merknad | Steder |
| --- | --- | --- | --- | --- | ---: |
| [RP-U1](../plans/vedtak.md#rp-u1) | vedtak | gjeldende | Det som er privat for et team, skjermes også i rapporteringen. | beslutningsdel: tapsfri rapportering av brevene til Fabric Grensetilfelle, mønster 11. | 0 |

### (uten ID)

| Rad | Begynnelsen | Klasse | Tilstand | Begrunnelse | Mål eller merknad |
| --- | --- | --- | --- | --- | --- |
| rad-001 | SK-02 og SK-03: et oppdatert krav fra TE åpner … | vedtak | gjeldende | Virkningen av et oppdatert krav på svaret og aksepten. |  |
| rad-002 | Hver oppdatering fra TE av et vederlags- eller fristkrav … | vedtak | gjeldende | Hva som regnes som en ny kravversjon. |  |
| rad-003 | Et krav TE har trukket, kan ikke tas opp … | vedtak | gjeldende | Virkningen av et trukket krav. |  |
| rad-016 | B-13 hovedvalg: alternativ (2) i streng form. Backend regner … | vedtak | gjeldende | Resultat, beløp og dager regnes av vurderingene og uttrykker ingen egen vilje. | beslutningsdel: serveren regner og avviser klientens verdier |
| rad-017 | B-13 regelversjon: klienten sender versjonen av reglene og tekstgeneratorene, … | beslutning | gjeldende | Lagrede resultater regnes ikke om, og presiseringene sier hva som regnes ved lesing. | beslutningsdel: versjonsfeltet, avvisningen og stoppen i `publish` Grensetilfelle, mønster 4; svar 03.11: B. |
| rad-018 | B-13 begrunnelsestekst (T-a): den låste teksten er partens, og … | vedtak | gjeldende | Byggherren er bundet av den låste teksten byggherren sender. | designdel: merkingen av teksten som byggherrens → BF-01; beslutningsdel: CI-testen for regelversjonen |
| rad-024 | B-13 «godkjent» bare når hele kravet er godkjent, til … | vedtak | gjeldende | Når et krav regnes som godkjent. |  |
| rad-026 | B-13 preklusjon ut fra byggherrens egen vurdering (§ 33.4, … | vedtak | gjeldende | Preklusjon ut fra byggherrens vurdering gir prinsipalt avslag med subsidiært standpunkt. |  |
| rad-027 | B-13 frist uten fremdriftshindring (§ 33.1): dagene byggherren har … | vedtak | gjeldende | Dagene står som videre subsidiært standpunkt i brev og hendelse. |  |
| rad-059 | Aksept av avslag gir `AVSLATT_AKSEPTERT` … | vedtak | gjeldende | Virkningen av at TE godtar et avslag. |  |
| rad-073 | B-13 endret underkategori etter byggherrens svar på grunnlaget krever … | vedtak | gjeldende | Virkningen av endret underkategori på byggherrens svar på grunnlaget. |  |
| rad-074 | B-13 svar på vederlag og frist når grunnlaget er … | vedtak | gjeldende | Svaret på vederlag og frist er subsidiært ved avslått grunnlag, med vedtatt brevtekst. |  |
| rad-075 | B-13 `grunnlag_varslet_i_tide` avvises utenfor § 32.2 (endring som ikke … | vedtak | gjeldende | Tolkningen av når § 32.2 gjelder. |  |
| rad-076 | B-13 «frafalt» (§ 32.3 c) avvises utenfor irregulær endring … | vedtak | opphevet når Følge rettes (steg 3) | Tolkningen av § 32.3 c: frafall er bare tillatt ved irregulær endring og valgrett. | erstattet av GR-U18 (15.10) Grensetilfelle, mønster 14. Var *historisk*; klassen er satt etter testen 04.11. |
| rad-077 | Byggherren kan svare «avslått» og samtidig påberope at grunnlaget … | vedtak | gjeldende | Avslag og preklusjon etter § 32.2 kan påberopes samtidig, med preklusjonen som hovedgrunn. | designdel: preklusjonen først i visningen → BF-04 |
| rad-078 | #235: frafall (§ 32.3 c) kan ikke kombineres med … | vedtak | gjeldende | Frafall kan ikke kombineres med preklusjon og gjør svarene på vederlag og frist prinsipale. |  |
| rad-079 | Frafall (§ 32.3 c) gir grunnlaget en egen sporstatus, … | vedtak | gjeldende | Frafall regnes som avklart grunnlag. | beslutningsdel: statusverdien `FRAFALT` |
| rad-080 | SD-02: trekker TE grunnlaget før vederlag eller frist er … | vedtak | gjeldende | Virkningen av at TE trekker grunnlaget før de andre sporene er sendt. |  |
| rad-081 | #213: har TE godtatt avslaget på grunnlaget (`AVSLATT_AKSEPTERT`), er … | vedtak | gjeldende | Godtatt avslag på grunnlaget lukker saken for nye hendelser. |  |
| rad-082 | SK-01: godtar TE byggherrens svar om at grunnlaget er … | vedtak | gjeldende | Å godta en påberopt preklusjon er et godtatt avslag. |  |
| rad-083 | TFR-05: en sak med godkjent eller låst grunnlag der … | design | gjeldende | Den samlede statusen er en etikett i visningen. | nytt forløp trengs: samlet status i saksoversikten Grensetilfelle, mønster 10. |
| rad-101 | SK-12: datoen og metoden for et varsel fra TE … | vedtak | gjeldende | Datoen og metoden for TEs varsel settes én gang. |  |
| rad-110 | Nøytralt fristvarsel (TFR-06, DRF-01): BH kan sende innsigelse mot … | vedtak | gjeldende | Virkningen av innsigelse og forespørsel ved nøytralt fristvarsel. |  |
| rad-115 | B-13 passivitet (§ 32.3 annet ledd) varsles, men systemet … | vedtak | gjeldende | Appen trekker ingen konklusjon av passivitet. | designdel: hvordan passiviteten vises → nytt forløp trengs: varsel om passivitet i saken |
| rad-123 | DRF-03: sendedatoen for TEs varsel om justerte enhetspriser (§ … | vedtak | gjeldende | Hvilken dato varselet om justerte enhetspriser får. |  |
| rad-182 | En endringsordresak kan følge av en KOE-sak, men ikke … | beslutning | gjeldende | En EO-sak erstatter ikke KOE-saken den følger av. | beslutningsdel: ingen EO-hendelse i KOE-saken Grensetilfelle, mønster 6; svar 03.11: B. |
| rad-183 | TFR-02: forsering får aldri en lukket samlet status. En … | vedtak | gjeldende | En EO forhandles ikke, og uenighet føres i en KOE. | designdel: statusetikettene for forsering og EO → BF-06 |
| rad-190 | Forsering er utenfor godkjenningsflyten … | vedtak | gjeldende | Hvilke forseringssvar som går utenom intern godkjenning. |  |
| rad-198 | B-03 hovedvalg: hver innsending får sitt eget brev, som … | vedtak | gjeldende | Brevet er det autoritative uttrykket for partens standpunkt. | beslutningsdel: saksrapporten og dokumentet i Catenda |
| rad-281 | Godkjenning av ansvarsgrunnlaget (GFK-06): fullmakten regnes av TEs krevde … | vedtak | gjeldende | Hva fullmakten for godkjent grunnlag regnes av. |  |
| rad-282 | GFK-06 presisert: ansvar har ingen egen verdi, fullmakten regnes … | vedtak | gjeldende | Fullmakten regnes per spor. |  |
| rad-283 | Ubegrenset fullmakt kan sende alene når beløpet ikke kan … | vedtak | gjeldende | Når ubegrenset fullmakt kan sende alene. |  |
| rad-284 | B-02 punkt 3: «ikke omgå godkjenning» betyr prosedyregaranti (v2 … | beslutning | gjeldende | Sikringsnivået for godkjenningen i kommandoen. | Grensetilfelle, mønster 12. |
| rad-285 | Policy nøkles på `user_id` … | beslutning | gjeldende | Nøkkelen for godkjenningspolicyen. |  |
| rad-311 | API-et: tilstanden sender alltid alle felt, og `null` betyr … | beslutning | gjeldende | Formen på API-et og frontendtypene. |  |
| rad-312 | Et tilstandsløst endepunkt som regner ut et utkast med … | beslutning | gjeldende | Utsatt utredning av et tilstandsløst endepunkt. |  |
| rad-314 | Saker opprettes både fra skjemaet i appen og fra … | beslutning | gjeldende | Hvilke kanaler saker kan opprettes fra. | Grensetilfelle, mønster 13. |
| rad-324 | B-14: målformene for M2, M1, M4 og M5 legges … | beslutning | gjeldende | Målarkitekturen og rekkefølgen for B-14. |  |
| rad-325 | B-14, språket: TypeScript er retning for den delte domenekjernen, … | beslutning | gjeldende | Språket for domenekjernen. |  |
| rad-374 | Leveringsmål fryses; samlet status skiller lagret, venter, usikkert og … | vedtak | gjeldende | Fravær løses med sporbar ny godkjenning, ikke delt konto eller bypass. | designdel: leveringsstatusen → Farge som betyr noe; beslutningsdel: frosne leveringsmål Grensetilfelle, mønster 11. |
| rad-375 | En enkel databasebasert worker, ikke en distribuert meldingsplattform … | beslutning | gjeldende | Valget av worker. |  |
| rad-376 | Ingen utrulling før den samlede produksjonsporten er passert … | beslutning | gjeldende | Produksjonsporten før utrulling. |  |
| rad-422 | ~~PostgreSQL og RPC over PostgREST er utgangspunkt for transaksjoner~~ … | beslutning | opphevet 23.09 av rad-423 | PostgreSQL og RPC som utgangspunkt for transaksjonene, altså hvordan løsningen er bygget. | opphevet 23.09 av rad-423 Var *historisk*; klassen er satt etter testen 04.11. |
| rad-423 | PostgreSQL over direkte tilkobling er utgangspunkt for transaksjoner (B-02 … | beslutning | gjeldende | Transaksjonene og tilkoblingen til basen. |  |
| rad-424 | B-02 hovedvalg: alternativ C. RLS med kontekst for lesing, … | beslutning | gjeldende | Tilgangsmekanismen i databasen. |  |
| rad-425 | Designet avhenger ikke av plattformen. Foreløpig mål er Azure … | beslutning | gjeldende | Plattformmålet for databasen. | Grensetilfelle, mønster 15. |
| rad-426 | TS2-02: JSON-hendelseslageret, CSV-metadatalageret og Supabase-lagrene går ut av kjøretidsstien … | beslutning | gjeldende | Hvilke lagre som går ut av kjøretidsstien. |  |
| rad-427 | B-02 punkt 4: prosjekt og kontraktsteam registreres bare av … | vedtak | gjeldende | Hvem som bestemmer hvilke team som representerer TE og BH. | beslutningsdel: registreringen hos drift Grensetilfelle, mønster 11. |
| rad-428 | B-02 punkt 5 og B-04: tilbakekalling … | vedtak | gjeldende | Virkningen av tilbakekalling for nye handlinger og gitte godkjenninger. |  |
| rad-429 | B-02 punkt 6: break-glass er navngitt, tidsbegrenset og logget … | beslutning | gjeldende | Driftsprosedyren for nødtilgang. | Grensetilfelle, mønster 12. |
| rad-430 | Bare Catenda-innlogging … | beslutning | gjeldende | Innloggingen går bare gjennom Catenda. |  |
| rad-431 | MG-02: webhook kan opprette brukerrader gjennom `koe_resolve_identity` … | beslutning | gjeldende | Hvordan webhooken løser identitet. |  |
| rad-432 | DB-05: `viewer` skal finnes som ren leserolle … | vedtak | gjeldende | En rolle som bare kan lese. | Grensetilfelle, mønster 11. |
| rad-433 | Webhookens kontraktsside utledes av forfatterens lagmedlemskap … | vedtak | gjeldende | Hvordan kontraktssiden for en Catenda-forfatter avgjøres. |  |
| rad-434 | Vedlegg er kontraktskorrespondanse … | vedtak | gjeldende | Vedlegg er kontraktskorrespondanse som bare partene leser. |  |
| rad-454 | P1: magic links utgår … | beslutning | gjeldende | Magic links fjernes som innloggingsmåte. |  |
| rad-455 | P2, P3: BIM er relevant; et objekt hører til … | beslutning | gjeldende | Retningen for BIM, ikke prioritert. |  |
| rad-456 | P4: vedlegg lagres bare i Catenda … | beslutning | gjeldende | Hvor vedlegg lagres. |  |
| rad-457 | P5: løsningen skal i prinsippet støtte andre virksomheter … | beslutning | gjeldende | Støtte for flere virksomheter i datamodellen. |  |
| rad-458 | P6: to kan arbeide i ulike spor samtidig … | beslutning | gjeldende | Samtidig arbeid med total orden. |  |
| rad-459 | P7: arkivplikt går foran sletteplikt for journalen … | beslutning | gjeldende | Bevaring av journalen framfor sletting. |  |

## Verifikasjon og grenser

**Kjørt og observert.** Tellingen av henvisningene (skriptet over, 03.11 på `06bd715`):
284 av de 398 ID-ene har minst én henvisning, til sammen 6 547 steder. Sammenslåingen av
de elleve rapportene ga én gyldig klasse for hver av de 459 radene, uten rader som mangler
eller er ukjente.

**Kontrollen.** En ny subagent klassifiserte et utvalg på 30 rader selv og sammenlignet med
den anbefalte klassen: de 18 grensetilfellene der rapportene var uenige eller samlingen valgte,
og 12 tilfeldige fra klassene. Den var enig i 27. De tre avvikene, MM-U27, EO-U13 og MM-U16,
var alle tilfeller der samlingen hadde overstyrt rapporten. De er rettet etter kontrollen
(mønster 7, 8 og 9). Kontrollen fant også at Følge for MM-U29 bør si «erstattet».

**Kjørt og observert 04.11.** Klassene for de 37 radene som var *historisk*, er satt av én
subagent etter testen fra 04.11 og ført inn med et skript. Det samme skriptet regnet ut
tilstanden av Følge, tellingen og flyttetabellen på nytt fra tabellene under «Tabellen», og
kontrollerte at hver av de 459 radene har én av de tre klassene, og at hvert designvedtak som
gjelder, står i én gruppe i flyttetabellen. Henvisningene er ikke talt på nytt.

**Lest ut av teksten.** Klassene, grensetilfellene og kjedene er vurdert av teksten og
Følge-cellen i vedtaksfila, ikke av koden. Følge-cellen er delvis ført for hånd og kan være
ufullstendig. En kjede der et senere vedtak ikke står i Følge, er derfor ikke funnet.

**Ikke kontrollert.** At klassen er riktig for hver rad utenfor kontrollutvalget. Klassene
for de 37 radene er ikke kontrollert av en ny subagent. Subagenten var i tvil om OV-U47
(brevtekst, *vedtak* eller *design*), KA-U24 og KA-U32 (tolkning eller løsningens atferd),
MM-U6 (foreløpig sperre, *vedtak* eller *beslutning*) og OV-U64 (leveranseomfang,
*beslutning*). Alle fem er opphevet, så klassen avgjør ikke hva som flyttes. At
tellingen skiller en henvisning fra en tilfeldig lik streng; et intervall som
«FO-U1–FO-U6» teller bare endepunktene. Radene uten anker har ingen telling.
