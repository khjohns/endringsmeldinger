# Samlevedtak: trekk og sperrene mot trekk

Kartleggingen av kjeden «Trekk og sperrene mot trekk» i steg 4, trinn 2 av
[#1534](https://github.com/khjohns/endringsmeldinger/issues/1534), runde 24 i #1065. Kjeden står i
[klassifiseringen](vurdering-klassifisering-2026-11-03.md) under «Kjedene», med postene EO-U12,
GR-U5, GR-U22, GR-U25, GR-U27, HF-U9, HF-U10, KA-U6, KA-U7, KA-U13, KA-U14, KA-U22, KA-U27, KA-U30,
KA-U45, MM-U22, MM-U34, OV-U6 og OV-U49. I [lista over kjente avvik](vurdering-kjente-avvik-2026-11-05.md#forslaget)
er kjeden nr. 2 i trinn 2, for motsigelsen KA-U13 mot MM-U34 punkt 12. Søket etter «trekk»,
«trukket», «avkall» og «sperre» i vedtaksfila fant i tillegg SD-02, EO-U35 og vedtaket 05.10 uten
ID om at et trukket krav ikke kan tas opp igjen. Fasit er postene i `vedtak.toml` og vedtaksfila på
`main` (`e4a3b6f`) og svarene i #1534.

Formen følger svar 4, 7, 8 og 10 i #1534 og [samlevedtaket for vederlagsmetoden](vurdering-samlevedtak-vederlagsmetoden-2026-11-05.md)
(OV-U94). Den foreløpige ID-en er KA-U51; vedtaksøkta setter den endelige.

Sitatene fra NS 8407 er kontrollert mot teksten i `khjohns/kontrakt` og gjengis ikke her (#424).

## Det kartleggingen fant

- **KA-U13 sperrer trekket når kravene er avgjort, MM-U34 punkt 12 gjør det ikke.** KA-U13 (09.10):
  «Trekket er i alle tilfeller sperret når TE har godtatt et avslag av grunnlaget (SK-01) eller
  kravene er avgjort (KA-U11).» MM-U34 punkt 12 (28.10): «Sperren mot trekk, ny kravversjon og
  revisjon når kravene er avgjort, oppheves, og sperren gjelder fra endringsordren er sendt (punkt
  19).» MM-U43 punkt 7 (04.11) følger MM-U34. MM-U34 punkt 14 rettet samme sperre i HF-U10, men
  MM-U34 har ikke noe forhold til KA-U13. For en sak lukket ved aksept av avslaget eller trekk av
  grunnlaget gjelder GR-U27, så motsigelsen gjelder de andre sakene: grunnlaget er godkjent uten
  at godkjenningen er en endringsordre etter punkt 32.3 første ledd a, og alle krav har registrert
  enighet. Det avgjøres i spørsmål 2.
- **Fire setninger viser til regler som er endret, uten at innholdet er avgjort på nytt.** HF-U9 har
  igjen «men TE kan gi avkall på sitt eget krav (HF-U10)» etter at MM-U34 punkt 10 strøk
  hovedsetningen (E1). KA-U6 sammenlikner trekket med en ny kravversjon som «opphever» enigheten,
  som MM-U34 punkt 9 har tatt bort (E2). KA-U13 og KA-U14 sier at KA-U7 «står», og KA-U7 er opphevet
  (E4). KA-U22 sperrer for «avtalte rettigheter» til byggedel 3, mens MM-U34 punkt 15 og KA-U49 har
  gjort sperren til en sperre ved fradrag (E5).
- **SD-02 og GR-U25 sier ulikt om et spor uten noe sendt.** SD-02 (05.10): «Spor som ikke er sendt,
  regnes som trukket». GR-U25 (22.10): «Et spor uten noe sendt har ingen betegnelse.» GR-U25 er den
  senere og gjelder (E7).
- **Trekket i underkategorien EO.** KA-U14 sier at endringsordren der står i en egen EO-sak og ikke
  berøres av trekket. EO-U34 punkt 12 avviser trekk i en KOE-sak som en sendt endringsordre
  omfatter. De to står sammen: punkt 6 i forslaget sier at punkt 9 gjelder når endringsordren
  omfatter saken (E4).

## Overlapp med andre samlevedtak

| Samlevedtak eller kjede | Felles post | Det samlevedtaket tok | Her |
| --- | --- | --- | --- |
| EO-U34 og versjon 2 (PR #1619, venter på svar) | EO-U12, OV-U6, GR-U27, MM-U34 punkt 19 | sperren i en KOE-sak en sendt endringsordre omfatter (punkt 12); sperren etter KA-U13 som begrensning (punkt 14); registreringen som svar (punkt 48); lukkingen etter GR-U27 (punkt 11, og punkt 68 i versjon 2) | punkt 7 og 9 viser dit; EO-U12 og OV-U6 nevnes bare |
| KA-U49 (vilkår og forbehold) | KA-U27, KA-U30 (gjennom KA-U45) | sperren ved fradrag | punkt 8 viser dit (E5) |
| OV-U94 (vederlagsmetoden) | HF-U9, KA-U7, MM-U34 | punkt 16 («uten trekk og uten avkall») og forholdet «utvider KA-U7» (E5 der) | avsnittet om overlapp i OV-U94 gir hit: HF-U9 «men TE kan gi avkall …», KA-U7 «TE kan trekke kravet (KA-U6)», KA-U13 og MM-U34 punkt 12; alt er tatt her |
| MM-U50 (sendte brev og regelendring) | HF-U9, HF-U10 | HF-U9 s4–s5 og tillegget fra MM-U34 punkt 10 | HF-U9 endres bare i s6 (E1) |
| MM-U43 (saker løsningen ikke forstår) | MM-U34 punkt 12 | punkt 6 (hendelser etter trekk og lukking) og punkt 7 | punkt 10 viser til punkt 7 |
| MM-U52 (retting av sendt brev) | ingen | ingen regel om trekk; punkt 24 gjelder en lukket sak | nevnes ikke |
| Kjeden «Kravversjon, ny kravversjon og utdyping» (ikke samlet) | HF-U9, KA-U7, MM-U34 punkt 9, 10 og 24 | – | her bare HF-U9 s6, KA-U7 «TE kan trekke kravet», og punkt 9 som kilde for E2. MM-U34 punkt 24 handler ikke om trekk |
| Kjeden «Kravene er avgjort, og sperren etter det» (ikke samlet) | KA-U11, OV-U3, MM-U34 punkt 12 | – | her bare sperren mot trekk; predikatet og de andre sperrene hører dit |
| Kjeden «‹Ingen krav›, avkall og godtatt avslag» (ikke samlet) | HF-U10, KA-U13 s4, KA-U22 | – | HF-U10 står som den allmenne regelen om avkall, og brevtekstene i KA-U22 står |

**S-1 A i PR #1618** (besvart 05.11, ikke ført) avgrenser MM-U34 punkt 24 for brevet med
korrigeringen av datoen. Punkt 24 handler om utdyping, ikke om trekk, så S-1 A berører ikke kjeden.

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder som
«Samlet i samlevedtaket for trekk». «Endrer»: samlevedtaket endrer innholdet i navngitte setninger.
Klassene er prøvd uavhengig 05.11 (svar 8); se «Klassene».

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| KA-U6 | vedtak | gjeldende; presisert av MM-U34 punkt 12 | samler; s2 endres | E2 |
| KA-U13 | vedtak | gjeldende; snevret inn av OV-U6, presisert av EO-U12 | samler s1, s3, s5–s7; s2 (sitatet fra punkt 31.3) står som begrunnelse; s4 hører til kjeden om «ingen krav»; s5 og s7 endres | E4, E6 |
| KA-U14 | vedtak med designdel | gjeldende; endret av OV-U6 | samler; s10 endres | E4 |
| GR-U5 | vedtak | gjeldende; utvidet av GR-U25, presisert av GR-U27 | samler s1; s2 endres | E3 |
| GR-U25 | vedtak med designdel og beslutningsdel | gjeldende | samler | E7 |
| SD-02 | vedtak | gjeldende | samler s1; s1 og s2 endres | E3, E7 |
| Vedtaket 05.10 uten ID | vedtak | gjeldende; ikke bygget | samler | – |
| HF-U9 | vedtak | gjeldende; endret av MM-U34 punkt 10; s4–s5 samlet i MM-U50 | endrer s6 | E1 |
| KA-U22 | vedtak med designdel | gjeldende; endret av LV-U41, snevret inn av GR-U22 | endrer siste regelsetning; brevtekstene står | E5 |
| HF-U10 | vedtak | gjeldende; endret av MM-U34 punkt 14 | står; kilde for punkt 1, 2, 8 og 9 | – |
| GR-U27 | vedtak med designdel | gjeldende; presisert av EO-U35, utvidet av MM-U51 | står; kilde for punkt 4 og 9 | – |
| MM-U34 | vedtak med designdel og beslutningsdel | gjeldende; flere punkter samlet andre steder | står; punkt 9, 12, 14, 15 og 19 er kilder | E2, E5, E6 |
| KA-U7 | vedtak | opphevet 28.10 av MM-U34 punkt 9 | står opphevet | E4 |
| KA-U11 | vedtak | gjeldende; endret av MM-U34 punkt 12 | nevnes bare | – |
| KA-U27, KA-U30, OV-U49 | – | samlet i KA-U49; opphevet av KA-U45; opphevet av OV-U69 | nevnes bare | – |
| EO-U12, OV-U6, EO-U35 | – | samlet i eller presiserer EO-U34 og GR-U27 | nevnes bare | – |
| GR-U22, MM-U22, KA-U45 | – | gjeldende | nevnes bare; ingen regel om trekk som ikke står over | – |

## Forslaget

Samlevedtaket er et *vedtak* med designdel. Kildene står i parentes etter hver setning; «s» er
setningen i posten. «Registrert enighet» er løsningens begrep etter MM-U34 punkt 9 og 10.

### A. Trekket er avkall på TEs eget krav

1. TE gir avkall på sitt eget krav ved å trekke det. Avkallet binder TE fra det er kommet fram
   (avtaleloven § 7) og rekker så langt brevet sier. (HF-U10 s1–s2 og s4)
2. Et trekk innebærer bare avkall på TEs eget, uttrykkelig identifiserte krav. Trekket opphever ikke
   pålegg, endringsordre, utførelsesplikt eller motpartens rettigheter etter en avtale. Brev og
   visning fremstiller ikke et trekk som at pålegget, endringsordren eller utførelsesplikten er
   bortfalt. (KA-U14 s1–s2 og s16; HF-U10 s5)
3. TE kan trekke et krav også i et spor med registrert enighet, betinget eller virksom. Enigheten
   får da ingen virkning. Enighet sperrer ikke i seg selv trekket; sperrene står i C. (KA-U6 s1–s2;
   KA-U14 s3; E2)

### B. Trekket av grunnlaget

4. Trekker TE grunnlaget, trekkes alle krav som er sendt, også et vederlag eller en frist
   byggherren har godkjent, fordi ansvarsgrunnlaget bærer dem. Det gjelder også et varsel og
   «ingen krav» i et vederlags- eller fristspor. Trekket av grunnlaget lukker KOE-saken (GR-U27).
   (GR-U5 s1; KA-U14 s5; GR-U25 s3; GR-U27 s1; E3)
5. Før byggherren har svart, og etter avslag eller frafall, kan TE trekke grunnlaget. I kategoriene
   SVIKT, ANDRE og FORCE_MAJEURE kan TE trekke grunnlaget også når partene har registrert enighet
   om det, fordi trekket bare gir fra seg TEs eget krav. (KA-U13 s5–s6; E4)
6. I underkategorien EO står endringsordren etter punkt 31.3 i en egen EO-sak og berøres ikke av
   trekket i KOE-saken, så punkt 3 gjelder også grunnlaget. Omfatter en sendt endringsordre
   KOE-saken, gjelder punkt 9. (KA-U13 s5; KA-U14 s10; EO-U34 punkt 12; E4)

### C. Sperrene mot trekk

7. Et trekk av grunnlaget avvises når byggherrens godkjenning av det er en endringsordre etter
   punkt 32.3 første ledd a, altså i underkategoriene under ENDRING som punkt 32.2 gjelder for
   (GR-U11), og partene dermed er enige ved sammenfall (GR-U10). (KA-U13 s1) Sperren står som en
   begrensning i løsningen, fordi et trekk ville gitt journalen den videre virkningen at
   endringsordren leses som bortfalt. (KA-U14 s7; EO-U34 punkt 14) For registrert korrespondanse
   må det avklares om brevet oppfyller punkt 31.3 før løsningen tillater trekk som kan berøre
   endringsordren. Manglende opplysning er ikke tilstrekkelig til å konkludere. Er det avklart at
   brevet ikke er en endringsordre, kan TE trekke grunnlaget etter punkt 3 og 4. (KA-U14 s12–s14)
   Endringsordren i en registrering som svar følger EO-U34 punkt 48.
8. Et trekk, også av grunnlaget, avvises når det gir byggherren et fradrag, fordi løsningen da ikke
   vet hva byggherren har avtalt. (KA-U49, ordrett; MM-U34 punkt 15; E5) Kan løsningen ellers ikke
   gjennomføre trekket uten å gi det videre virkninger, sperres det. (KA-U14 s4; HF-U10 s6)
9. Trekket avvises når TE har godtatt avslaget på grunnlaget eller trukket grunnlaget (GR-U27), når
   byggherren har sendt en endringsordre som omfatter KOE-saken (EO-U34 punkt 12), og mens en
   forseringssak viser til avslaget (FO-U5). (HF-U10 s7 slik MM-U34 punkt 14 endret den; KA-U13 s7;
   E6)
10. *Ved spørsmål 2 A:* At kravene er avgjort, eller at det er registrert enighet om alle fremsatte
    krav, sperrer ikke trekket. (MM-U34 punkt 12; MM-U43 punkt 7; E6)

### D. Etter trekket

11. «Et krav TE har trukket, kan ikke tas opp igjen med en oppdatering. Serveren avviser
    oppdateringen; et nytt krav om samme forhold går i en ny sak» (vedtaket 05.10)

### Designdel

- Trekker TE grunnlaget, har hvert vederlags- og fristspor der TE har sendt et krav, et varsel eller
  «ingen krav», betegnelsen «Trukket». Et spor uten noe sendt har ingen betegnelse. (GR-U25 s1–s2;
  E7)
- Brevtekstene for trekk står i KA-U22, og at kravet ikke kan tas opp igjen, står i veiledningen i
  skjemaet. Ved lukking vises den konkrete avslutningsårsaken (MM-U34 punkt 12).

## Endret innhold

- **E1.** HF-U9 s6: «men TE kan gi avkall på sitt eget krav (HF-U10)» står igjen uten hovedsetningen
  som MM-U34 punkt 10 strøk, og gjelder ikke lenger. Regelen står i punkt 1.
- **E2.** KA-U6 s2: «, på samme måte som en ny kravversjon opphever den (SK-02)» gjelder ikke. Etter
  MM-U34 punkt 9 opphever en ny kravversjon ikke en registrert enighet. «Så lenge saken ikke er
  avsluttet» i s1 leses som «lukket», slik MM-U34 punkt 12 sier, og står i punkt 9.
- **E3.** GR-U5 s2 og SD-02 s1: «Saken blir `LUKKET_TRUKKET`» er et statusnavn. Lukkingen følger
  GR-U27 (punkt 4), og statusteksten hører til visningen.
- **E4.** KA-U13 s5 og KA-U14 s10: «står KA-U6 og KA-U7» og «KA-U6 står» viser til punkt 3. KA-U7 er
  opphevet av MM-U34 punkt 9. For underkategorien EO legges til at punkt 9 gjelder når en sendt
  endringsordre omfatter KOE-saken (EO-U34 punkt 12).
- **E5.** KA-U22: «Et trekk, også av grunnlaget, avvises når appen ikke kan bevare byggherrens
  avtalte rettigheter, for eksempel et avtalt fradrag (KA-U9), til detaljmodellen er avklart i
  byggedel 3.» gjelder ikke. Sperren ved fradrag står i KA-U49 (punkt 8), etter at MM-U34 punkt 15
  strøk «når en enighet trekket rammer» i KA-U27.
- **E6.** *Ved spørsmål 2 A:* KA-U13 s7: «eller kravene er avgjort (KA-U11)» gjelder ikke. Sperren
  står i punkt 9, og punkt 10 sier at avgjorte krav ikke sperrer. *Ved 2 B:* setningen står for
  trekket av grunnlaget, og MM-U34 punkt 12 og MM-U43 punkt 7 endres for det trekket.
- **E7.** SD-02 s2: «Spor som ikke er sendt, regnes som trukket» gjelder ikke. GR-U25 s2 sier at et
  spor uten noe sendt har ingen betegnelse.

## Funn som ikke avgjøres her

- **Trekket etter et nytt svar.** Om sperren i punkt 7 står når byggherren har erstattet en
  godkjenning etter punkt 32.3 første ledd a med et avslag, er åpent i versjon 2 av samlevedtaket for
  endringsordren (PR #1619), og avgjøres der.
- **Trekk av vederlag eller frist i en sak som er lukket ved trekk av grunnlaget.** Ingen post sier
  det uttrykkelig; MM-U43 punkt 6 gjør saken ikke forstått, og det er nok.
- **Brevtekstene i KA-U22 og «ingen krav».** De hører til kjeden «‹Ingen krav›, avkall og godtatt
  avslag» og samles der.

## Klassene

(Fylles etter kontrollen.)

## Prøvingen

(Fylles etter prøvingen.)

## Spørsmålene til oppdragsgiver

Spørsmål 1 er en tilslutning til innhold du alt har vedtatt, og stilles i tekst. Spørsmål 2
avgjør en motsigelse mellom to vedtak. Svar for eksempel «1 A, 2 A».

**1. Tilslutning til samlevedtaket for trekk.**

*Bakgrunn:* Reglene om trekk står i sju vedtak fra 05.10 til 22.10, og to senere vedtak (28.10 om
registrert enighet og 04.11 om vilkår og forbehold) har endret dem uten å rette alle setningene. Et
trukket krav regnes også som trukket i et spor der ingenting er sendt etter ett vedtak, mens et
senere vedtak sier at sporet ikke har noen betegnelse.

*Belegg:* forslaget over, punkt 1–11 med designdelen, og E1–E7. Punkt 1–9 og 11 er vedtatt innhold
med henvisningene skrevet om. E1–E5 og E7 tar bort setninger som senere vedtak alt har gjort
uvirksomme.

- **A (anbefalt):** «Samlevedtaket for trekk gjelder med E1–E7, og med E6 og punkt 10 etter svaret
  på spørsmål 2. Vedtakene om retten til å trekke et krav i et spor med enighet, om sperren mot
  trekk av grunnlaget når godkjenningen er en endringsordre, om hva et trekk gir avkall på, om at
  trekket av grunnlaget trekker alle krav, om betegnelsen «Trukket», om en sak der grunnlaget
  trekkes før noe annet er sendt, og om at et trukket krav ikke kan tas opp igjen, gjelder som
  «Samlet i samlevedtaket for trekk». I vedtaket om når partene er enige og i vedtaket om
  brevtekstene for trekk gjelder de setningene E1 og E5 navngir, ikke lenger.»
- **B:** Samme som A, med rettelsene du gir per punkt eller E-punkt.

*Anbefaling:* A. Innholdet er det du alt har vedtatt, og E-punktene følger av senere vedtak.

*Hva valget styrer:* hvilken tekst som er regelgrunnlaget for trekk i KOE-sakene (sperren
`trekkAvGrunnlagetErSperret` i kjernen viser i dag til KA-U13), og hvilke henvisninger i
domenetabellen som får samlevedtaket ved siden av.

*Forholdet:* samler KA-U6, KA-U13, KA-U14, GR-U5, GR-U25, SD-02 og vedtaket 05.10 uten ID; endrer
HF-U9 (E1) og KA-U22 (E5).

*Klassen:* vedtak med designdel.

**2. Om trekket av grunnlaget er sperret når kravene er avgjort.**

*Bakgrunn:* Vedtaket 09.10 om trekk av grunnlaget sier at trekket i alle tilfeller er sperret når
totalentreprenøren har godtatt et avslag av grunnlaget, eller når kravene er avgjort. Vedtaket
28.10 om registrert enighet opphevet sperren mot trekk når kravene er avgjort, og lot sperren
gjelde fra endringsordren er sendt; samlevedtaket 04.11 for saker løsningen ikke forstår sier det
samme. Vedtaket 28.10 rettet sperren i vedtaket om avkall, men ikke i vedtaket 09.10. Spørsmålet
gjelder en sak der byggherren har godkjent grunnlaget uten at godkjenningen er en endringsordre
etter punkt 32.3 første ledd a, og der partene har registrert enighet om alle fremsatte krav, men
byggherren ikke har sendt endringsordren. Er godkjenningen en endringsordre etter punkt 32.3 første
ledd a, er trekket sperret uansett (punkt 7).

*Belegg:* KA-U13 s7 og MM-U34 punkt 12, sitert under «Det kartleggingen fant»; MM-U43 punkt 7:
«En ny kravversjon og et nytt svar i et spor med registrert enighet strider ikke mot vedtakene om
enighet og lukking, og heller ikke et trekk, en ny kravversjon eller en revisjon etter at kravene
er avgjort.»

- **A (anbefalt):** «Et trekk av grunnlaget er sperret når totalentreprenøren har godtatt avslaget
  på grunnlaget eller trukket grunnlaget, når byggherren har sendt en endringsordre som omfatter
  saken, og mens en forseringssak viser til avslaget. At partene har registrert enighet om alle
  fremsatte krav, sperrer ikke trekket.»
- **B:** «Et trekk av grunnlaget er også sperret når partene har registrert enighet om alle
  fremsatte krav i saken, før endringsordren er sendt. Trekk av vederlag og frist følger vedtaket
  28.10.»

*Anbefaling:* A. Vedtaket 28.10 valgte bevisst at registrert enighet ikke låser saken før
endringsordren, og trekket gir bare fra seg totalentreprenørens eget krav. Byggherrens rettigheter
er vernet av sperren ved en endringsordre etter punkt 32.3 første ledd a og sperren ved fradrag.
B gir en sperre for grunnlaget som ikke gjelder for vederlag og frist i samme sak.

*Hva valget styrer:* punkt 9 og 10 og E6, og predikatet for sperren mot trekk av grunnlaget i
kjernen.

*Forholdet:* ved A endrer samlevedtaket KA-U13 s7 (E6); ved B endrer det MM-U34 punkt 12 og MM-U43
punkt 7 for trekket av grunnlaget.

*Klassen:* vedtak.

## Verifikasjon og grenser

Lest ut av vedtaksfila og `vedtak.toml` på `main` (`e4a3b6f`), vurderingsfilene for OV-U94, MM-U43
og kjente avvik, og vurderingsfila for endringsordren på grenen for PR #1619. Ingen kode er kjørt.
Påstanden om `trekkAvGrunnlagetErSperret` er lest av KA-U13 i vedtaksfila, ikke av koden.
