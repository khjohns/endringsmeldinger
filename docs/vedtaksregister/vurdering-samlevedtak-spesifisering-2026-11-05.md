# Samlevedtak: spesifisering etter punkt 33.6.1 og forespørsel etter punkt 33.6.2

Kartleggingen av kjeden «Spesifisering etter punkt 33.6.1 og forespørsel etter punkt 33.6.2» i steg 4,
trinn 2 av [#1534](https://github.com/khjohns/endringsmeldinger/issues/1534), runde 25 i #1065. Kjeden står i
[klassifiseringen](vurdering-klassifisering-2026-11-03.md) under «Kjedene», med postene LV-U18, OV-U16,
VS-U4, VS-U17, VS-U19, VS-U21–VS-U24, VS-U27, VS-U29–VS-U33 og VS-U36. Søket etter «33.6.1», «33.6.2»
og «forespørsel» i vedtaksfila fant i tillegg LV-U20, OV-U80, VS-U3, VS-U46, MM-U10, OV-U3, KA-U2 og
KA-U33. Fasit er postene i `vedtak.toml` og vedtaksfila på `main` (`27f8bab`) og svarene i #1534.

Formen følger svar 4, 7, 8 og 10 i #1534 og [samlevedtaket for trekk](vurdering-samlevedtak-trekk-2026-11-05.md)
(KA-U51). Den foreløpige ID-en er VS-U47; vedtaksøkta setter den endelige.

Henvisningene til leddene i punkt 33.6.1 og 33.6.2 er kontrollert mot teksten i `khjohns/kontrakt`
og gjengis ikke her (#424).

## Det kartleggingen fant

- **VS-U36 snur VS-U29, og Følge i VS-U29 er ikke rettet.** VS-U29 (20.10) legger påberopelsen av at
  TEs begrunnelse etter punkt 33.6.2 annet ledd bokstav b kom for sent, i en egen innsigelse mot
  begrunnelsen. VS-U36 (01.11) legger den i «svaret på totalentreprenørens første krav med dager etter
  begrunnelsen, med ett standpunkt etter punkt 33.6.2», og et innlegg sendt før svaret «leses ikke».
  VS-U29 sier bare «Endret 01.11 av VS-U36» (punkt 12 i «Motsigelsene i registeret»). VS-U46 punkt 17
  og 18 sier det samme som VS-U36: den egne innsigelsen er en påberopelse bare mot varsler, og
  påberopelsen etter bestemmelsen står i svaret. VS-U36 sier ikke hva et senere svar gjør med
  påberopelsen; VS-U29 s5 sier at det gjentar den eller gir den opp. Mønster 15 i klassifiseringen
  (svar 03.11 A) sier at resten står når kjernedelen er snudd. Punkt 9 tar det med (E1).
- **Kjernen har bygget VS-U29, ikke VS-U36.** Påberopelsen står i dag i den egne innsigelsen
  (`kjerne/regler/frist.ts:kontroller`, `kjerne/frosset/standpunkt.ts`). VS-U36 «Bygges i #1377».
  Samlevedtaket endrer ikke det VS-U36 alt har avgjort.
- **VS-U33 og OV-U80 sier ulikt om et registrert krav stopper forespørselen.** VS-U33 (22.10): «Bare
  et krav om dager som er fremmet i appen, stopper forespørselen. Et registrert brev gjør det aldri,
  hva beskrivelsen enn sier.» OV-U80 (01.11): et registrert krav med utfylt skjema «har […] samme
  virkning i løsningen som et krav eller svar sendt derfra». OV-U80 nevner ikke VS-U33. Det avgjøres
  i spørsmål 2.
- **VS-U21 og VS-U22 bygger på at et brev fra byggherren sendt utenfor løsningen er dokumentasjon.**
  OV-U80 lar byggherren registrere svaret med svarskjemaet og «de samme påkrevde feltene» som et svar
  sendt fra løsningen. Etter VS-U4 oppgir byggherren da prinsipalt antallet dager TE måtte forstå, og
  kjernen krever tallet. VS-U22 sier at påberopelsen registreres «uten tall» når brevet ikke sier det.
  Det avgjøres i spørsmål 3. At brevet er dokumentasjon (VS-U22 s1), gjelder ikke etter OV-U80 (E4).
- **VS-U32 er et fragment.** Raden er det valgte alternativet ordrett og har verken subjekt eller
  verbal: «I svaret på det senere fristkravet, som en påberopelse av sen spesifisering etter § 33.6.1
  (VS-U4, VS-U24).» Den gir bare mening med spørsmålet («hvor gjør BH gjeldende at TE allerede hadde
  grunnlag for å beregne kravet da TE begrunnet?»). S3 viser til «innsigelsen mot begrunnelsen» i
  VS-U29, som VS-U36 har endret (E2).
- **VS-U30 er dekket av VS-U31.** En begrunnelse etter bokstav b fra løsningen forutsetter en
  forespørsel fra løsningen (VS-U27), og VS-U31 tillater høyst én (E3).
- **VS-U24 er samlet i VS-U46** (punkt 2, 17 og 18). VS-U36 utvider VS-U24 med punkt 33.6.2. VS-U46
  punkt 2 har en åpen liste («som punkt 32.2, 33.4, 33.6.1 og 34.1.2») og nevner ikke 33.6.2. Punkt 5
  her sier det uttrykkelig.

## Overlapp med andre samlevedtak

| Samlevedtak eller kjede | Felles post | Det samlevedtaket tok | Her |
| --- | --- | --- | --- |
| VS-U46 (påberopelse av sent varsel) | VS-U24 | punkt 2, 17 og 18; punkt 8 (33.4 og 33.6.1 hver for seg); punkt 9–13 (senere svar) | punkt 5, 8 og 9 viser dit |
| MM-U47 (protest og innlegg) | ingen | innlegget; punkt 11 om MP-U4 | VS-U36 s2 («et innlegg … leses ikke») står i punkt 8 |
| KA-U46 (byggherrens begrunnelse) | ingen | punkt 7: TEs begrunnelse av fristkravet (KA-U33) står | nevnes ikke |
| Kjeden «Kravversjon, ny kravversjon og utdyping» (kartlegges parallelt) | ingen | – | OV-U3 («byggherrens forespørsel etter § 33.6.2 … også når kravene er avgjort») og KA-U2 («forespørsel er ikke kravversjoner») står der og tas ikke her |
| MM-U52 (retting av sendt brev) og VS-U43 (varslingsdatoen) | ingen | ingen regel om 33.6.1 eller 33.6.2 | nevnes ikke; den kritiske stien for #1309 berøres ikke |
| Registreringen av korrespondanse (OV-U79, OV-U80, OV-U85; ikke samlet) | OV-U16 | – | OV-U16 står der; punkt 3 og 6 viser til OV-U80 |

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder som «Samlet i
samlevedtaket for spesifisering». «Endrer»: samlevedtaket endrer innholdet i navngitte setninger.
Klassene er prøvd uavhengig 05.11 (svar 8); se «Klassene».

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| VS-U4 | vedtak | gjeldende; snevret inn av VS-U21 | samler delen om punkt 33.6.1; delen om punkt 34.3.3 første ledd står i VS-U4 | – |
| VS-U17 | vedtak | gjeldende; presisert av HF-U11, VS-U27, VS-U29 og VS-U32 | samler | – |
| VS-U19 | vedtak | gjeldende; snevret inn av VS-U23, VS-U30 og VS-U31, presisert av LV-U18 og VS-U33 | samler | – |
| VS-U21 | vedtak | gjeldende; snevret inn av VS-U22 | samler s1–s3; s4 etter spørsmål 3 | E4 |
| VS-U22 | beslutning | gjeldende | s2 samles; s1 gjelder ikke; s3 etter spørsmål 3 | E4 |
| VS-U23 | beslutning | gjeldende | samler | – |
| VS-U27 | vedtak med designdel | gjeldende; presisert av OV-U16 | samler | – |
| VS-U29 | vedtak | gjeldende; endret av VS-U36 | samler s3, s4 og s6, og s5 slik punkt 9 sier; s1–s2 gjelder ikke etter VS-U36 | E1 |
| VS-U30 | vedtak | gjeldende | samler | E3 |
| VS-U31 | vedtak | gjeldende | samler | E3 |
| VS-U32 | vedtak | gjeldende | samler s1–s2; s3 endres | E2 |
| VS-U33 | vedtak | gjeldende | samler s3–s4; s1–s2 etter spørsmål 2 | E5 |
| VS-U36 | vedtak | gjeldende; bygges i #1377 | samler | – |
| VS-U24 | vedtak | samlet i VS-U46 | nevnes bare | – |
| LV-U18, LV-U20 | vedtak | gjeldende; LV-U18 endret av LV-U39 og LV-U53 | står; brevtekstene | – |
| OV-U16 | design (bindende i OV-U80 og OV-U85) | gjeldende | står; hører til registreringen | – |
| VS-U3 | vedtak | gjeldende | står; kilde for punkt 4 og 7 | – |

## Forslaget

Samlevedtaket er et *vedtak* med beslutningsdel. Kildene står i parentes etter hver setning; «s» er
setningen i posten.

### A. Spesifiseringen etter punkt 33.6.1

1. Påberoper byggherren at TE spesifiserte kravet for sent etter punkt 33.6.1, oppgir byggherren
   prinsipalt det antall dager byggherren mener TE måtte forstå at TE hadde krav på, og subsidiært
   det byggherren godtar hvis spesifiseringen kom i tide. Løsningen regner ikke ut hva noen måtte
   forstå. Påberopelsen er ikke preklusjon med prinsipalt avslag. (VS-U4 s1–s4 for punkt 33.6.1,
   og det forkastede alternativet)
2. Byggherren tar stilling til punkt 33.4 og punkt 33.6.1 hver for seg, også når kravet var
   varselet. Løsningen avgjør ikke ut fra saken hvilken bestemmelse byggherren påberoper. (VS-U21
   s1–s3; VS-U22 s2; VS-U46 punkt 8)

### B. Forespørselen etter punkt 33.6.2

3. Byggherren kan sende en forespørsel etter punkt 33.6.2 fra løsningen så lenge TE ikke har
   fremmet et krav om antall dager i saken, og høyst én forespørsel i saken. Ellers avvises den.
   *Ved spørsmål 2 A:* Et krav om dager registrert med utfylt kravskjema (OV-U80) stopper
   forespørselen som et krav fremmet i løsningen. Et registrert brev som står som dokumentasjon,
   stopper den aldri, hva beskrivelsen enn sier. (VS-U19 s1–s2; VS-U30; VS-U31 s1; VS-U33 s1–s2;
   OV-U80; E3, E5)
4. Brevet fra løsningen har formkravene i punkt 33.6.2 første ledd, med brevteksten i LV-U18.
   Virkningen etter punkt 33.6.2 tredje ledd utledes bare når byggherren uttrykkelig påberoper at
   TE svarte for sent (VS-U3). Ellers vises den. (VS-U19 s4 og s6; VS-U33 s4)
5. En forespørsel sendt utenfor løsningen registreres alltid, også etter et krav om dager, og vises
   med datoen og beskrivelsen den som registrerte, har gitt (OV-U16). Den er dokumentasjon, og
   løsningen avgjør ikke om formkravene var oppfylt eller om svaret kom i tide. En senere
   forespørsel enn den første fra løsningen sendes utenfor løsningen og registreres slik. (VS-U19 s3
   og s5; VS-U23 s1; VS-U27 s3; VS-U31 s2)

### C. Totalentreprenørens svar på forespørselen

6. TE kan sende begrunnelsen etter punkt 33.6.2 annet ledd bokstav b fra løsningen bare som svar på
   en forespørsel byggherren har sendt fra løsningen. Er forespørselen registrert, svarer TE utenfor
   løsningen og registrerer svaret, eller sender et krav med dager fra løsningen. (VS-U27 s1–s2;
   VS-U33 s4)
7. Begrunnelsen registreres som TEs svar på forespørselen, og punkt 33.6.1 gjelder for kravet som
   senere fremmes (femte ledd). Etter begrunnelsen kan byggherren ikke sende en ny forespørsel fra
   løsningen. (VS-U17 s1; VS-U30) Svarer TE med et krav med dager, vurderer løsningen selv at
   byggherren ikke kan påberope at fristen i punkt 33.6.1 er oversittet (fjerde ledd). (VS-U3, setningen
   om fjerde ledd)

### D. Påberopelsen etter punkt 33.6.2 og spesifiseringen etter begrunnelsen

8. Byggherren gjør gjeldende at TEs begrunnelse kom for sent, eller at den ikke er et svar etter
   annet ledd, i svaret på TEs første krav med dager etter begrunnelsen, med ett standpunkt etter
   punkt 33.6.2. Et innlegg sendt før svaret står i saken og leses ikke. Løsningen avgjør ikke om
   påberopelsen kom uten ugrunnet opphold. (VS-U36 s1–s3; VS-U46 punkt 18)
9. Påberoper byggherren at begrunnelsen kom for sent, utledes virkningen som etter punkt 33.6.2
   tredje ledd. Standpunktet om at begrunnelsen ikke er et svar etter annet ledd, registreres og
   vises uten utledet virkning, som når TE ikke svarer. Byggherrens svar på et senere fristkrav
   gjentar påberopelsen eller gir den opp etter VS-U46 punkt 9–13. (VS-U17 s2–s3; VS-U29 s3–s5; E1)
10. Mener byggherren at TE allerede hadde grunnlag for å beregne kravet da TE begrunnet, gjør
    byggherren det gjeldende i svaret på det senere fristkravet, som en påberopelse av sen
    spesifisering etter punkt 33.6.1 (punkt 1). Byggherrens begrunnelse kan vise til tidspunktet for
    TEs begrunnelse. (VS-U32 s1–s2; E2)
11. *Ved spørsmål 3 A:* Registrerer byggherren et svar sendt utenfor løsningen, fylles svarskjemaet
    ut med de samme påkrevde feltene som for et svar fra løsningen, også antallet dager i punkt 1.
    Sier brevet ikke det, står det som dokumentasjon (OV-U80). (E4)

### Beslutningsdel

- I første versjon er en forespørsel sendt utenfor løsningen dokumentasjon, og påberopelsen av at TE
  svarte for sent på den, sendes utenfor løsningen og registreres. (VS-U23 s1–s2) Forespørselen fra
  løsningen følger punkt 3 og 4. (VS-U23 s3)
- Brevtekstene står i LV-U18 og LV-U20.

## Endret innhold

- **E1.** VS-U29 s1–s2: «Byggherren gjør gjeldende at TEs begrunnelse etter § 33.6.2 annet ledd
  bokstav b kom for sent, eller at den ikke er et svar etter annet ledd, i en egen innsigelse etter
  § 5 tredje ledd mot begrunnelsen, sendt fra appen. Fordi begrunnelsen bare kan komme for sent etter
  § 33.6.2, er innsigelsen en påberopelse etter den bestemmelsen.» gjelder ikke; VS-U36 har flyttet
  påberopelsen til svaret (punkt 8). VS-U29 s5 («Byggherrens svar på et senere fristkrav gjentar
  påberopelsen eller gir den opp (VS-U9, VS-U11), og HF-U4 gjelder for den.») står for påberopelsen
  i svaret, med henvisningene til VS-U46, der VS-U9, VS-U11 og HF-U4 er samlet (punkt 9). VS-U36 sier
  ikke hva et senere svar gjør; at resten står, følger av mønster 15 i klassifiseringen (svar 03.11 A).
- **E2.** VS-U32 s3: «Innsigelsen mot begrunnelsen står etter § 33.6.2 som i VS-U29.» gjelder ikke;
  påberopelsen etter punkt 33.6.2 står i svaret (punkt 8). S1 er skrevet som en hel setning med
  spørsmålet som subjekt (punkt 10).
- **E3.** VS-U30 og VS-U31 s1 er slått sammen i punkt 3 og 7. Innholdet er det samme: en
  begrunnelse fra løsningen forutsetter en forespørsel fra løsningen (VS-U27), og VS-U31 tillater
  høyst én.
- **E4.** VS-U22 s1: «I første versjon bygges ikke VS-U21: et brev fra byggherren sendt utenfor
  appen er dokumentasjon etter OV-U4.» gjelder ikke etter OV-U80, som lar byggherren registrere
  svaret med svarskjemaet. Det VS-U21 s1 sier om hva den som registrerer angir, gjøres da i
  svarskjemaet (punkt 2). *Ved spørsmål 3 A* gjelder heller ikke VS-U21 s4 («Sier brevet ikke hvor
  mange dager byggherren mener TE måtte forstå, registreres påberopelsen etter § 33.6.1 uten tall, og
  brevet kan merkes (KA-U16, KA-U20).») og VS-U22 s3 (delen om tall). *Ved 3 B* står de i punkt 11.
- **E5.** *Ved spørsmål 2 A:* VS-U33 s1–s2 («Bare et krav om dager som er fremmet i appen, stopper
  forespørselen. Et registrert brev gjør det aldri, hva beskrivelsen enn sier.») gjelder ikke for et
  krav registrert med utfylt kravskjema etter OV-U80 (punkt 3). *Ved 2 B* står setningene, og
  OV-U80 snevres inn for forespørselen.

## Funn som ikke avgjøres her

- **Påberopelsen mot en registrert forespørsel.** Svarer TE en registrert forespørsel med et krav
  med dager fra løsningen, kjenner løsningen ikke forespørselen, og svaret kan ikke ha et standpunkt
  etter punkt 33.6.2 (beslutningsdelen). Det følger av VS-U23 og VS-U27 og endres ikke her.
- **«Ikke bygget» i Følge for VS-U29.** Kjernen har bygget VS-U29; når #1377 bygger VS-U36, endres
  det. Byggestatus lages av `byggestatus.py` og føres ikke her.

## Klassene

*Fylles etter den uavhengige kontrollen (svar 8).*

## Prøvingen

*Fylles etter prøvingen av alternativene mot vedtaksfila.*

## Spørsmålene til oppdragsgiver

Spørsmål 1 er en tilslutning til innhold du alt har vedtatt, og stilles i tekst. Spørsmål 2 og 3
avgjør hvordan et vedtak fra 22.10 og et fra 12.10 står mot vedtaket 01.11 om registrering av
korrespondanse. Svar for eksempel «1 A, 2 A, 3 A».

**1. Tilslutning til samlevedtaket for spesifisering.**

*Bakgrunn:* Reglene om spesifisering av fristkravet og byggherrens forespørsel står i 13 vedtak fra
10.10 til 01.11. Vedtaket 01.11 flyttet byggherrens påberopelse av at begrunnelsen etter punkt 33.6.2
annet ledd bokstav b kom for sent, fra en egen innsigelse til svaret på det neste fristkravet, uten å
rette det eldre vedtaket. Ett vedtak (22.10) er bare et svaralternativ og kan ikke leses uten
spørsmålet.

*Belegg:* forslaget over, punkt 1–11 med beslutningsdelen, og E1–E5. Punkt 1–10 er vedtatt innhold
med henvisningene skrevet om. E1–E4 tar bort setninger som senere vedtak alt har gjort uvirksomme.

- **A (anbefalt):** «Samlevedtaket for spesifisering gjelder med E1–E5, og med punkt 3 og 11 og de
  delene av E4 og E5 som avhenger av spørsmål 2 og 3, etter svarene der. Vedtakene om påberopelse av sen spesifisering etter punkt
  33.6.1, om byggherrens forespørsel etter punkt 33.6.2 og hvor mange som kan sendes, om
  totalentreprenørens begrunnelse etter annet ledd bokstav b og svaret på en registrert
  forespørsel, om påberopelsen av at begrunnelsen kom for sent, og om hvor byggherren gjør gjeldende
  at totalentreprenøren allerede hadde grunnlag for å beregne kravet, gjelder som «Samlet i
  samlevedtaket for spesifisering». Delen om punkt 34.3.3 første ledd i vedtaket om påberopelse av sen
  spesifisering står.»
- **B:** Samme som A, med rettelsene du gir per punkt eller E-punkt.

*Anbefaling:* A. Innholdet er det du alt har vedtatt, og E-punktene følger av senere vedtak.

*Hva valget styrer:* hvilken tekst som er regelgrunnlaget for forespørselen og spesifiseringen i
kjernen (`kjerne/regler/frist.ts`, `kjerne/kommandoer/forutsetninger.ts`), og hva #1377 bygger når
påberopelsen flyttes til svaret.

*Forholdet:* samler VS-U4 (delen om punkt 33.6.1), VS-U17, VS-U19, VS-U21, VS-U22, VS-U23, VS-U27,
VS-U29, VS-U30, VS-U31, VS-U32, VS-U33 og VS-U36; endrer VS-U29 s1–s2 (E1, slik VS-U36 alt har gjort),
VS-U32 s3 (E2) og VS-U22 s1 (E4).

*Klassen:* vedtak med beslutningsdel.

**2. Om et krav om dager registrert etter vedtaket om korrespondanse stopper forespørselen.**

*Bakgrunn:* Etter punkt 33.6.2 første ledd kan byggherren be om spesifisering «så lenge»
totalentreprenøren ikke har fremmet krav etter punkt 33.6.1. Vedtaket 22.10 sier at bare et krav om
dager fremmet i løsningen stopper forespørselen, og at et registrert brev aldri gjør det. Da var et
registrert brev bare dokumentasjon. Vedtaket 01.11 lar parten registrere et krav sendt utenfor
løsningen med kravskjemaet, og da har kravet «samme virkning i løsningen som et krav eller svar sendt
derfra». Det nevner ikke vedtaket 22.10.

*Belegg:* VS-U33 s1–s2 og OV-U80, sitert under «Det kartleggingen fant»; punkt 33.6.2 første ledd.

- **A (anbefalt):** «Et krav om dager som totalentreprenøren har registrert med utfylt kravskjema,
  stopper forespørselen etter punkt 33.6.2 som et krav fremmet i løsningen. Et registrert brev som
  står som dokumentasjon, stopper den aldri, hva beskrivelsen enn sier.»
- **B:** «Bare et krav om dager som er fremmet i løsningen, stopper forespørselen etter punkt 33.6.2.
  Et krav registrert med utfylt kravskjema har ellers samme virkning som et krav fra løsningen, men
  stopper ikke forespørselen.»

*Anbefaling:* A. Kontrakten spør om kravet er fremmet, ikke hvordan det ble sendt, og vedtaket 01.11
gir det registrerte kravet samme virkning. Ved B kan byggherren sende en forespørsel som varsler tap
av kravet etter at totalentreprenøren har fremmet det, og totalentreprenøren må svare på nytt for å
unngå en påberopelse.

*Hva valget styrer:* punkt 3 og E5, og avvisningen av forespørselen i kjernen
(`kjerne/kommandoer/forutsetninger.ts`, koden `FRISTKRAV_SENDT`).

*Forholdet:* ved A endrer samlevedtaket VS-U33 s1–s2 og bekrefter OV-U80 for forespørselen. Ved B
snevrer det inn OV-U80.

*Klassen:* vedtak.

**3. Om byggherren kan registrere en påberopelse av sen spesifisering uten antallet dager.**

*Bakgrunn:* Etter vedtaket 10.10 oppgir byggherren som påberoper sen spesifisering etter punkt
33.6.1, prinsipalt antallet dager totalentreprenøren måtte forstå, og subsidiært det byggherren
godtar. Vedtakene 12.10 og 13.10 sier at et brev fra byggherren sendt utenfor løsningen som ikke sier
antallet, registreres med påberopelsen uten tall. Da var et slikt brev dokumentasjon i første
versjon. Vedtaket 01.11 lar byggherren registrere svaret med svarskjemaet og de samme påkrevde
feltene som for et svar fra løsningen, og «der skjemaet og dokumentet spriker, er dokumentet partens
meddelelse».

*Belegg:* VS-U4 s1; VS-U21 s4: «Sier brevet ikke hvor mange dager byggherren mener TE måtte forstå,
registreres påberopelsen etter § 33.6.1 uten tall, og brevet kan merkes (KA-U16, KA-U20).»; OV-U80.

- **A (anbefalt):** «Registrerer byggherren et svar sendt utenfor løsningen, fylles svarskjemaet ut
  med de samme påkrevde feltene som for et svar fra løsningen, også antallet dager byggherren mener
  totalentreprenøren måtte forstå ved en påberopelse etter punkt 33.6.1. Sier brevet ikke det, står
  det som dokumentasjon, merket ‹Skjemaet er ikke fylt ut›.»
- **B:** «Registrerer byggherren et svar sendt utenfor løsningen, og sier brevet ikke hvor mange dager
  byggherren mener totalentreprenøren måtte forstå, registreres påberopelsen etter punkt 33.6.1 uten
  tall. Visningen viser at antallet mangler, og løsningen regner ikke ut hva totalentreprenøren måtte
  forstå.»

*Anbefaling:* A. Vedtaket 01.11 valgte de samme feltene for et registrert svar som for et svar fra
løsningen, og løsningen tolker ikke brevet. Et svar uten antallet står fortsatt som byggherrens
meddelelse i saken, og byggherren kan sende et svar med antallet fra løsningen. B gir et unntak fra
vedtaket 01.11 for én bestemmelse og et standpunkt uten det prinsipale tallet som vedtaket 10.10
krever.

*Hva valget styrer:* punkt 11 og E4, og om svaret i kjernen kan ha påberopelsen etter punkt 33.6.1
uten dager (`kjerne/format/leser.ts`, `kjerne/frosset/standpunkt.ts`).

*Forholdet:* ved A endrer samlevedtaket VS-U21 s4 og VS-U22 s3, og følger OV-U80. Ved B
snevrer det inn OV-U80 for punkt 33.6.1 og presiserer VS-U4.

*Klassen:* vedtak.

## Verifikasjon og grenser

Lest ut av vedtaksfila og `vedtak.toml` på `main` (`27f8bab`), vurderingsfilene for VS-U46, KA-U51,
MM-U47 og klassifiseringen. Påstandene om kjernen er lest av en subagent i `kjerne/regler/frist.ts`,
`kjerne/frosset/standpunkt.ts`, `kjerne/kommandoer/forutsetninger.ts`, `kjerne/format/leser.ts` og
`kjerne/utledning/utled.ts`; ingen kode er kjørt. Kartleggingen av kravversjonskjeden var ikke pushet
da overlappen ble kontrollert, så overlappen er kontrollert mot postene, ikke mot den vurderingsfila.
