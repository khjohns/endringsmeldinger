# Samlevedtak: retting av sendt brev, versjon 2

Kartleggingen for et nytt samlevedtak for retting av sendt brev, steg 4, trinn 2 i
[#1534](https://github.com/khjohns/endringsmeldinger/issues/1534), runde 22 i #1065. Kontrollert
mot `main` på `d049d6a`. Del av #1309.

**Hvorfor fila finnes.** Oppdragsgiver svarte 05.11 «1 C, 2 A, 3 ja» på spørsmålene før bygging av
#1309, versjon 5 ([6656940092](https://github.com/khjohns/endringsmeldinger/issues/1309#issuecomment-6656940092),
svaret i [6657601681](https://github.com/khjohns/endringsmeldinger/issues/1309#issuecomment-6657601681)).
Alle sju svarene presiserer, utvider eller snevrer inn samlevedtaket for retting av sendt brev
(MM-U41), og 3.5 B utvider også samlevedtaket for endringsordren (EO-U34). Begge postene hadde
alt tre endringer etter at temaet ble samlet. Etter svar 6 A i #1534
([6623299573](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623299573))
skrives da den neste endringen som et samlevedtak. Oppdragsgiver valgte 05.11 «B: samlevedtak
først» ([6657724070](https://github.com/khjohns/endringsmeldinger/issues/1309#issuecomment-6657724070)).

**Formen** følger svar 4, 7, 8 og 10 i #1534, som i
[versjon 1](vurdering-samlevedtak-retting-av-sendt-brev-2026-11-04.md) (MM-U41) og
[samlevedtaket for sendte brev](vurdering-samlevedtak-sendte-brev-2026-11-05.md) (MM-U50). Hver
setning viser kilden. Svarene 05.11 er innholdet og står som kilde, med spørsmålsnummeret i
versjon 5 («05.11 1 C», «05.11 3.1 A»). Det som endrer innholdet i en gjeldende post, står i
«Endret innhold». De forkastede alternativene fra 05.11 står ordrett under «Forkastet 05.11».
Den foreløpige ID-en er MM-U52. Den kontrolleres mot `main` når posten føres. Fila skriver ikke
i `vedtak.toml` eller `vedtak.md` (oppdraget fra runde 22).

## Det kartleggingen fant

- **Svarene 05.11 står ikke i registeret ennå.** De er vedtatt som innhold, men føres bare
  gjennom dette samlevedtaket.
- **MM-U41 har tre endringer:** LV-U53 endrer brevteksten i punkt 10, og MM-U51 og LV-U54
  presiserer punkt 10 og 11. **MM-U42** er punkt 6 i MM-U41, ført som egen post. Svar 1 C
  presiserer punkt 6, så MM-U42 hører til kjeden, selv om oppdraget ikke nevner den.
- **EO-U34 har tre endringer:** HF-U25 og KA-U50 endrer, og MM-U51 utvider punkt 12. 3.5 B
  ville bli den fjerde. Spørsmål 3 avgjør hvordan.
- **Ordlyden i MM-U41 er alt endret av gjeldende vedtak**, uten at teksten er skrevet om:
  brevteksten i punkt 10 etter LV-U35 (‹totalentreprenøren› for ‹TE›) og LV-U53 (‹brev
  <merking> av <dato>›), og henvisningene til MM-U12, som MM-U50 opphevet med henvisningene
  (OV-U92 (a)). E5 og E6 skriver ordlyden slik den gjelder, uten nytt innhold.
- **Henvisningene til MM-U41** står bare i brukerforløpene: BF-02A, BF-02C, BF-05 og BF-06
  (JSON), BF-05.md og dekning.md. Ingen i `kjerne/`, `server/` eller `src/`. MM-U42, MM-U51 og
  LV-U54 er ikke nevnt utenfor registeret. Se spørsmål 2.
- **Verktøyet teller også forhold fra opphevede poster.** `varsler()` i `vedtaksregister.py`
  filtrerer ikke kildeposten. Oppheves MM-U51, teller dens «utvider EO-U34» fortsatt. Se
  spørsmål 3.

## Overlapp med andre samlevedtak og kjeder

| Samlevedtak eller kjede | Felles post | Det tar | Her |
| --- | --- | --- | --- |
| EO-U34 (endringsordren) | – (MM-U51 utvider punkt 12) | hva som godtas i en KOE-sak en endringsordre omfatter (punkt 12) | punkt 24–25 utvider punkt 12 for to rettinger; spørsmål 3 |
| VS-U43 (varslingsdatoen) | – (OV-U5; VS-U44) | hvilket varsel som er det første løsningen kjenner (punkt 6–10); VS-U44 legger rettingen av datoene hit | punkt 18 bruker kravdatoen som premiss etter VS-U43 punkt 6–10; ingen setning i VS-U43 endres |
| MM-U50 (sendte brev) | – (MM-U12, OV-U5) | at løsningen ikke avgjør det kontrakten overlater til partene (punkt 6), og at den ikke avgjør om en part er bundet (punkt 8) | henvisningene til MM-U12 blir til MM-U50 punkt 6 eller 8 (E6) |
| VS-U46 (sent varsel) | – | punkt 12 og 13 om «i tide»; punkt 20 | punkt 20 holder aksepten atskilt fra et «i tide»-standpunkt; ingen setning endres |
| HF-U23 (akseptfristen) | – | byggherrens akseptfrist i et svar | punkt 21 berører ikke HF-U23 |
| Kjeden «Brev og varsel sendt eller registrert utenfor løsningen» (ikke samlet) | OV-U5, VS-U34, OV-U80 | – | punkt 18 presiserer VS-U34 og setningen «Datoen oppgis når kravet sendes, og endres ikke senere.» i OV-U5 |
| GR-U27 (lukket sak, ikke samlet) | – | det som kan legges til i en lukket sak | punkt 24–25 utvider det |
| Vurderingen «Vederlagsmetoden» (pågår) | ingen funnet | – | – |

## Postene i kjeden

Kolonnen «Ved spørsmål 2» viser forholdet etter anbefalingen (A).

| Post | Klasse nå | Status nå | Ved spørsmål 2 | E |
| --- | --- | --- | --- | --- |
| MM-U41 | vedtak med designdel og beslutningsdel | gjeldende; endret av LV-U53, presisert av MM-U51 og LV-U54 | opphever; teksten står i punkt 1–17 med E1–E6 | E1–E6 |
| MM-U42 | vedtak med designdel | gjeldende | opphever; teksten er punkt 6 | E1 |
| MM-U51 | vedtak | gjeldende | opphever; teksten er punkt 24 | E7 |
| LV-U54 | vedtak | gjeldende | opphever; teksten står i punkt 10 | – |
| LV-U53 | vedtak | gjeldende | står; ordlyden i punkt 10 er skrevet etter den | E5 |
| LV-U35 | vedtak med designdel | gjeldende | står; ordlyden i punkt 10 er skrevet etter den | E5 |
| VS-U34 | vedtak med designdel | gjeldende | presiseres (punkt 18) | E3 |
| OV-U5 | vedtak med designdel | gjeldende; samlet av VS-U43 og MM-U50 for andre setninger | presiseres for setningen «Datoen oppgis når kravet sendes, og endres ikke senere.» (punkt 18) | E3 |
| KA-U1 | vedtak | gjeldende | presiseres (punkt 22) | – |
| GR-U27 | vedtak med designdel | gjeldende | utvides (punkt 24–25) | E7 |
| EO-U34 | vedtak med designdel og beslutningsdel | gjeldende | utvides i punkt 12 (punkt 24–25), etter svaret på spørsmål 3 | E7 |

Forholdene samlevedtaket overtar fra postene det opphever: fra MM-U41 «samler OV-U11 og
OV-U80», «opphever MM-U21, MM-U26, OV-U52 og OV-U53», «endrer OV-U41, OV-U54, OV-U55 og OV-U56»,
«snevrer inn GR-U22», «presiserer VS-U26», «utvider OV-U3 og LV-U4» og «presiserer MM-U12»; fra
MM-U42 «presiserer MM-U34»; fra MM-U51 «utvider GR-U27 og EO-U34»; fra LV-U54 «presiserer VS-U43».
MM-U12 er opphevet av MM-U50, og henvisningene til den gjelder MM-U50 (OV-U92 (a), MM-U50 svar Y), så «presiserer MM-U12» føres ikke videre. VS-U44 og B-03-DOKUMENT har den bindende setningen i MM-U41 (`bindende_i`); feltet må vise til samlevedtaket når MM-U41 oppheves.

## Forslaget

Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Punkt 1–17 er versjon 1 (MM-U41)
med E1–E6 og E8. Punkt 18–25 er nye. Nummereringen i versjon 1 står, så «punkt 8» og «punkt 10» i
andre vedtak og i brukerforløpene gjelder det samme.

### A. Hva en retting er

1. En retting er et nytt utsagn fra avsenderen, med henvisning til brevet den retter, og brevet
   står uendret. (MM-U41 punkt 1)
2. En retting sendes av avsenderens side som et nytt brev fra løsningen. Det første brevet og
   dokumentet i Catenda står. (MM-U41 punkt 2)
3. Løsningen avgjør ikke om avsenderen er løst (MM-U50 punkt 8). (MM-U41 punkt 3; E6)

### B. Virkningen etter hvem rettingen er til fordel for

4. En retting i motpartens favør gjelder som en revisjon i motpartens favør. (MM-U41 punkt 4)
5. En retting til avsenderens fordel er et tilbud om å endre det brevet sa, og den gjelder når
   motparten godtar den. Punkt 5 gjelder ikke for et standpunkt i et krav eller et svar; der
   gjelder punkt 6. (MM-U41 punkt 5 med svaret 2 A, MM-U42)
6. En retting av et standpunkt i et krav eller et svar sendes som en ny kravversjon eller et nytt
   svar, også når den er til avsenderens fordel, og med henvisning til brevet den retter. Et
   nytt svar erstatter det tidligere som byggherrens siste svar i løsningen, uten
   totalentreprenørens aksept, og en ny kravversjon venter på byggherrens svar. Tidligere brev
   bevares uendret, og løsningen avgjør ikke om endringen er rettslig virksom (MM-U50 punkt 8).
   Det gjelder så langt et nytt svar eller en ny kravversjon er tillatt; i en KOE-sak som en
   endringsordre omfatter, avvises de. For andre opplysninger i et brev er en retting til
   avsenderens fordel et tilbud som gjelder når motparten godtar den. (MM-U42; E6) At et nytt
   svar erstatter det tidligere som byggherrens siste svar i løsningen, gjelder standpunktene i
   svaret, ikke aksepten av en retting etter punkt 20. (05.11 1 C, forholdet; E1)
7. En retting fra byggherren går gjennom godkjenningen etter fullmakten som et svar med det
   innholdet rettingen gir, også når rettingen er et tilbud til byggherrens fordel. Et nytt svar
   etter punkt 6 går gjennom godkjenningen som andre svar. (MM-U41 punkt 7)

### C. Opplysninger med egne regler

8. En feil dato totalentreprenøren har oppgitt for et varsel sendt utenfor løsningen, rettes
   etter punkt 1–5. Totalentreprenøren sender en retting med henvisning til brevet med
   opplysningen, og opplysningen i det brevet står uendret. En senere dato er en retting i
   byggherrens favør og gjelder straks som premiss for nye svar. En tidligere dato er til
   totalentreprenørens fordel og gjelder først når byggherren godtar rettingen; til da gjelder
   datoen totalentreprenøren først oppga. Et svar byggherren alt har gitt, står med virkningen
   det hadde, og byggherren kan ta stilling på nytt. At datoen settes én gang, betyr at
   totalentreprenøren ikke kan endre den alene til sin egen fordel. Løsningen avgjør ikke
   hvilken dato som er riktig (MM-U50 punkt 6). Mener mottakeren at datoen er feil, sier
   mottakeren det i begrunnelsen for svaret eller i et innlegg. (MM-U41 punkt 8; E6) Hvilken
   dato en ny retting sammenlignes med, og hva «datoen totalentreprenøren først oppga» er etter
   en tidligere retting, står i punkt 19. Punkt 8, 19, 21–23 og 25 gjelder også datoen for et krav sendt utenfor løsningen (punkt 18). (05.11 2 A og 3.1 A; E2; E3)
9. Avsenderen retter en feil kategori eller et feil varsel etter punkt 1–5, unntatt for en
   endringsordre (punkt 16). En retting som gir et varsel en tidligere dato, gjelder først når
   motparten godtar den, og et svar motparten alt har gitt, står med virkningen det hadde.
   (MM-U41 punkt 9)
10. Totalentreprenøren kan endre sin opplysning etter VS-U26 om når pålegget ble mottatt eller
    totalentreprenøren ble klar over forholdet, i et eget brev med henvisning til brevet med
    opplysningen. Brevet er ikke en ny kravversjon og avslår ikke byggherrens svar. Det sier:
    ‹Totalentreprenøren oppgir nå at <pålegget ble mottatt \| totalentreprenøren ble klar over
    forholdet> <dato>. I brev <merking> av <dato> oppga totalentreprenøren <dato>.› Den nye
    opplysningen gjelder straks som totalentreprenørens siste opplysning, uten byggherrens
    godkjenning, også når datoen er senere. Den nye opplysningen erstatter ikke innholdet i
    tidligere brev eller premissene i tidligere svar. En ny grunnlagsversjon kan ikke endre
    datoen. Den gjengir totalentreprenørens siste opplysning, med henvisning til brevet med
    korrigeringen, og endrer ikke tidligere brev eller premissene i tidligere svar. I
    underkategorien endringsordre, der totalentreprenøren ikke oppgir noen slik dato, avvises
    brevet. Brevet godtas også i et spor med enighet og når kravene er avgjort, og det endrer
    ikke utfallet. (MM-U41 punkt 10; E5) Etter en korrigering etter punkt 10 sier en ny
    grunnlagsversjon: ‹Totalentreprenøren opplyser at pålegget ble mottatt <dato>, slik
    totalentreprenøren oppga i brev <merking> av <dato>.› I svikt og andre forhold:
    ‹Totalentreprenøren opplyser at totalentreprenøren ble klar over forholdet <dato>, slik
    totalentreprenøren oppga i brev <merking> av <dato>.› Brevet det vises til, er det siste
    brevet med en korrigering. (LV-U54)
11. For opplysningen i punkt 10 gjelder: et svar byggherren alt har gitt, står med virkningen
    det hadde. Byggherren tar stilling til opplysningen i et senere svar der rettidigheten etter
    den aktuelle bestemmelsen behandles, eller i et nytt svar. Sporet venter ikke på et nytt
    svar i løsningen, og løsningen avgjør ikke om korrigeringen gir byggherren en plikt etter
    kontrakten (MM-U50 punkt 6). Løsningen avgjør ikke hvilken opplysning som er riktig, når
    varslingsfristen begynte å løpe eller om varselet var rettidig. En påberopelse byggherren
    alt har fremsatt, bevares med tidspunktet (VS-U9). (MM-U41 punkt 11; E6) For en lukket sak gjelder punkt 24. (MM-U51, forholdet)
12. Totalentreprenøren kan endre opplysningen om når totalentreprenøren ble klar over at økte
    utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid ville påløpe
    (punkt 34.1.3 annet ledd), i et eget utsagn med henvisning til varselet det gjelder. Den nye
    opplysningen gjelder straks som totalentreprenørens siste opplysning, uten byggherrens
    godkjenning, også når datoen er senere. Den erstatter ikke innholdet i tidligere brev eller
    premissene i tidligere svar. Løsningen avgjør ikke hvilken dato som faktisk eller rettslig
    skal legges til grunn, og beregner ikke rettidighet eller preklusjonsvirkning. Et svar
    byggherren alt har gitt, står med virkningen det hadde. Byggherren tar stilling i et senere
    svar der rettidigheten behandles, eller i et nytt svar. Sporet venter ikke på et nytt svar i
    løsningen. Endringen gjelder bare totalentreprenørens opplysning om når totalentreprenøren
    faktisk ble klar over det, ikke varseldatoen etter punkt 8 og ikke når totalentreprenøren
    burde ha blitt klar over det. (MM-U41 punkt 12)
13. En endring som bare retter en faktisk opplysning totalentreprenøren har oppgitt i kravet,
    som en dato, et nummer eller en henvisning, uten å endre det totalentreprenøren krever, er
    en korrigering. Korrigeringen er et eget utsagn etter punkt 1–5, ikke en ny kravversjon, og
    lar svaret stå. Totalentreprenøren kan likevel sende en ny kravversjon. (MM-U41 punkt 13)
    Datoen et krav sendt utenfor løsningen og lagt til med kategorien krav ble sendt, rettes
    etter punkt 18, ikke som en korrigering. (05.11 2 A, forholdet; E3)
14. Når totalentreprenøren har sendt grunnlaget, står hovedkategorien, underkategorien og, i
    underkategorien endringsordre, hvilken endringsordre kravet bygger på. En ny
    grunnlagsversjon kan ikke endre dem. Vil totalentreprenøren påberope en annen hjemmel eller
    en annen endringsordre, går det i en ny sak etter GR-U22. Et forslag om å rette betegnelsen
    på endringsordren sendes som innlegg. (MM-U41 punkt 14)
15. Totalentreprenørens utdyping, byggherrens senere begrunnelse og bestridelsen av en
    opplysning blir innlegg etter MM-U34 punkt 24. En opplysning i fritekst rettes ikke etter
    punkt 1–5. (MM-U41 punkt 15)

### D. Det samlevedtaket ikke gjelder

16. For en endringsordre, også en registrert endringsordre og en endringsordre registrert som
    svar, gjelder samlevedtaket for endringsordren foran punkt 1–15 og 18–23: endringsordren
    rettes ikke i løsningen, og en feil tas opp etter punkt 42, 50 og 58 der. At EO-U9 er
    opphevet, åpner ikke for revisjon. (MM-U41 punkt 16; «og 18–23» E4) Punkt 24 og 25 sier selv hva som godtas i en sak en endringsordre omfatter.
17. En registrering av et brev sendt utenfor løsningen rettes etter OV-U17 og OV-U18.
    (MM-U41 punkt 17)

### E. Rettingen av varseldatoen og kravdatoen etter punkt 8

18. Rettingen etter punkt 8 gjelder også datoen for et krav sendt utenfor løsningen og lagt til
    som korrespondanse med kategorien krav, med de samme reglene som for varseldatoen:
    totalentreprenøren sender en retting med henvisning til brevet med opplysningen, og
    opplysningen i det brevet står uendret. En senere dato er en retting i byggherrens favør og
    gjelder straks som premiss for nye svar. En tidligere dato er til totalentreprenørens fordel
    og gjelder først når byggherren godtar rettingen; til da gjelder datoen totalentreprenøren
    først oppga. Et svar byggherren alt har gitt, står med virkningen det hadde, og byggherren
    kan ta stilling på nytt. Løsningen avgjør ikke hvilken dato som er riktig (MM-U50 punkt 6).
    Setningen «Datoen oppgis når kravet sendes, og endres ikke senere.» i OV-U5 gjelder ikke
    datoen for et krav lagt til med kategorien krav. For datoen totalentreprenøren oppgir i et
    krav sendt fra løsningen for en tidligere sending av samme krav utenfor løsningen, står
    setningen. (05.11 2 A) «En feil dato» i VS-U34 gjelder både varselet og kravet. (05.11 2 A,
    forholdet) Punkt 17 gjelder ikke datoen. (05.11 2 A, forholdet) I punkt 19, 21–23 og 25 gjelder «varseldatoen» også denne datoen. (05.11 3, innledningen:
    «Ved 2 A gjelder punktene også datoen for kravet.»)
19. En ny retting av varseldatoen sammenlignes med datoen som gjelder når rettingen sendes.
    Datoen som gjelder, er datoen i den rettingen som sist begynte å gjelde, enten straks fordi
    den var til en senere dag, eller da byggherren godtok den; uten en slik retting er det
    datoen totalentreprenøren først oppga. En dato før den er til totalentreprenørens fordel og
    gjelder først når byggherren godtar rettingen; til da gjelder datoen som gjaldt da rettingen
    ble sendt. En dato etter den er i byggherrens favør og gjelder straks som premiss for nye
    svar. Godtar byggherren en eldre retting som sto åpen, etter at en senere retting til en
    senere dag har begynt å gjelde, gjelder datoen i den godtatte rettingen fra aksepten.
    (05.11 3.1 A)
20. Byggherren godtar totalentreprenørens retting til en tidligere varseldato i et svar i
    sporet varselet gjelder, sammen med standpunktet om varselet kom i tide, eller i et nytt
    svar etter punkt 6. Aksepten går da gjennom godkjenningen etter fullmakten med svaret.
    Aksepten og standpunktet om rettidigheten er to ulike opplysninger i svaret, og aksepten er
    ikke i seg selv et «i tide»-standpunkt. Et nytt svar etter punkt 6 tar ikke bort en aksept i
    svaret det erstatter. I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt
    endringsordre eller en godkjent registrering av en endringsordre omfatter, avvises et nytt
    svar (punkt 6; GR-U27; EO-U34 punkt 12), og rettingen kan da ikke godtas i løsningen. Til
    byggherren har godtatt rettingen, gjelder datoen etter punkt 8, også når byggherren ikke
    svarer. (05.11 1 C)
21. Totalentreprenørens retting til en tidligere varseldato har ingen akseptfrist. Løsningen
    sperrer ikke byggherrens aksept fordi tid har gått, og sier ikke at rettingen har falt bort
    eller ikke lenger binder totalentreprenøren (MM-U50 punkt 8). (05.11 3.2 A)
22. Sender totalentreprenøren en ny retting av samme varseldato mens en tidligere retting til
    en tidligere dato står åpen, står begge åpne, og byggherren kan godta hvilken som helst av
    dem i løsningen, unntatt når aksepten avvises etter GR-U27 eller EO-U34 punkt 12. Løsningen
    sier ikke at den tidligere rettingen er tatt tilbake, og avgjør ikke om totalentreprenøren
    fortsatt er bundet av den (MM-U50 punkt 8). Vil totalentreprenøren si at den tidligere
    rettingen ikke lenger står, sier totalentreprenøren det i den nye rettingen eller i et
    innlegg. Aksepten viser til rettingen den gjelder. (05.11 3.3 B)
23. Har byggherren godtatt én retting av varseldatoen, kan de andre rettingene av samme dato som
    sto åpne da aksepten ble sendt, ikke godtas i løsningen. Det er en begrensning i løsningen.
    Løsningen sier ikke at de andre rettingene er avslått eller har falt bort, og avgjør ikke om
    totalentreprenøren fortsatt er bundet av dem (MM-U50 punkt 8). Vil byggherren godta en av
    dem, kan totalentreprenøren sende den på nytt som en ny retting. (05.11 3.4 B) Et nytt svar kan ikke godta en av de andre rettingene. (05.11 3.4 B, forholdet)

### F. Retting i en lukket sak

24. I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt endringsordre eller en
    godkjent registrering av en endringsordre omfatter, godtas også korrigeringen av datoen
    etter punkt 10, og den endrer ikke utfallet. Den nye opplysningen gjelder straks som
    totalentreprenørens siste opplysning. Et svar byggherren alt har gitt, står med virkningen
    det hadde, og en påberopelse byggherren alt har fremsatt, bevares med tidspunktet (VS-U9).
    Byggherren kan ta stilling til opplysningen i et innlegg, og saken står lukket. Løsningen
    avgjør ikke om korrigeringen gir byggherren en plikt etter kontrakten (MM-U50 punkt 6).
    (MM-U51; E6)
25. I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt endringsordre eller en
    godkjent registrering av en endringsordre omfatter, godtas totalentreprenørens retting av
    varseldatoen, og den endrer ikke utfallet. Den står som totalentreprenørens utsagn for
    partene å vurdere. Byggherren kan ikke godta en retting til totalentreprenørens fordel i
    løsningen (GR-U27; EO-U34 punkt 12), og en retting i byggherrens favør er bare premiss for
    nye svar, som avvises (punkt 6). Byggherren kan ta stilling til rettingen i et innlegg, og
    saken står lukket. Løsningen avgjør ikke hva rettingen betyr mellom partene (MM-U50 punkt
    6). (05.11 3.5 B)

### Designdel

Motparten ser rettingen som et nytt brev med henvisning til brevet den retter. En retting til
avsenderens fordel vises som et tilbud til motparten har godtatt den, unntatt et nytt svar eller
en ny kravversjon etter punkt 6. Et nytt svar sier: ‹Svaret erstatter byggherrens svar i brev
<merking> av <dato>.› (LV-U34), og visningen viser at det avviker fra en registrert enighet
(MM-U34 punkt 9). Skjemaet for en ny kravversjon anbefaler korrigeringen etter punkt 13 (MM-U34
punkt 1). Tidligere opplysninger beholdes og vises, og visningen sier hvilken opplysning et svar
gjaldt. Hjemmet for punkt 10 er brukerforløpene BF-02A, BF-02C og BF-05; for resten skrives et
forløp når rettingen bygges. (MM-U41, designdelen; E5) I en lukket sak vises en retting til
totalentreprenørens fordel som et tilbud som ikke kan godtas. (05.11 3.5 B, forholdet)

### Beslutningsdel

Før første ekte sak bygges totalentreprenørens retting av datoen i grunnlagskravet (punkt 10),
rettingen av datoen etter punkt 12 og rettingen av varseldatoen etter punkt 8, som beholder sin
egen modell. For andre rettinger skal det før første ekte sak finnes en avklart og gjennomførbar
korrigeringsprosess; den kan være manuell. Det som står åpent om rettingen under B-16 i
hovedplanen (aktørrettigheter, godkjenning og innsyn for motparten), avgjøres for den manuelle
prosessen før første ekte sak. Den fullstendige rettingsflyten etter punkt 1–7 kan bygges
senere. (MM-U41, beslutningsdelen) Rettingen av kravdatoen etter punkt 18 bygges før første ekte
sak sammen med rettingen av varseldatoen og har samme modell. (05.11 2 A; E3)

### Forkastet 05.11

Ordrett fra versjon 5. De føres som «Forkastet» i posten for samlevedtaket, under punktet de
gjelder. Teksten står uten «Forhold»-delen, som står ordrett i versjon 5 og tas med når posten føres.

**Punkt 20 (spørsmål 1).**

- **A.** «Byggherren godtar totalentreprenørens retting til en tidligere varseldato i et eget
  utsagn med henvisning til brevet med rettingen. Aksepten går gjennom godkjenningen etter
  fullmakten, som et svar gjør. Aksepten tar ikke stilling til om varselet kom i tide; det gjør
  byggherren i et svar. I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt
  endringsordre eller en godkjent registrering av en endringsordre omfatter, avvises aksepten
  (GR-U27; EO-U34 punkt 12). Til byggherren har godtatt rettingen, gjelder datoen etter punkt 8 i
  samlevedtaket for retting av sendt brev, også når byggherren ikke svarer.»
- **B.** «Byggherren godtar totalentreprenørens retting til en tidligere varseldato i et eget
  utsagn med henvisning til brevet med rettingen. Aksepten går ikke gjennom godkjenningen etter
  fullmakten, fordi den ikke tar stilling til om varselet kom i tide; det gjør byggherren i et
  svar, som går gjennom godkjenningen. I en sak som er lukket etter GR-U27, og i en KOE-sak som en
  sendt endringsordre eller en godkjent registrering av en endringsordre omfatter, avvises
  aksepten (GR-U27; EO-U34 punkt 12). Til byggherren har godtatt rettingen, gjelder datoen etter
  punkt 8 i samlevedtaket for retting av sendt brev, også når byggherren ikke svarer.»

**Punkt 18 (spørsmål 2).**

- **B.** «Datoen for et krav sendt utenfor løsningen og lagt til med kategorien krav er en
  faktisk opplysning totalentreprenøren har oppgitt i kravet, og rettes som en korrigering etter
  punkt 13 i samlevedtaket for retting av sendt brev, ikke etter punkt 8. Korrigeringen er et
  eget utsagn etter punkt 1–5 og lar svaret stå. En senere dato gjelder som en revisjon i
  byggherrens favør (punkt 4), og en tidligere dato er et tilbud som gjelder når byggherren
  godtar det (punkt 5). Løsningen avgjør ikke om totalentreprenøren er løst (punkt 3). Før første
  ekte sak er det nok med en avklart og gjennomførbar korrigeringsprosess, som kan være manuell.
  Det som står åpent om rettingen under B-16 i hovedplanen (aktørrettigheter, godkjenning og
  innsyn for motparten), avgjøres for den manuelle prosessen før første ekte sak. Setningen
  «Datoen oppgis når kravet sendes, og endres ikke senere.» i OV-U5 gjelder ikke datoen for et
  krav lagt til med kategorien krav. For datoen totalentreprenøren oppgir i et krav sendt fra
  løsningen for en tidligere sending av samme krav utenfor løsningen, står setningen.»
- **C.** «Rettingen etter punkt 8 i samlevedtaket for retting av sendt brev gjelder bare datoen
  for et varsel lagt til som korrespondanse med kategorien varsel. Datoen for et krav sendt
  utenfor løsningen og lagt til med kategorien krav settes én gang og endres ikke senere, heller
  ikke som en korrigering etter punkt 13. Mener totalentreprenøren at den er feil, sier
  totalentreprenøren det i et innlegg, og løsningen regner videre med den. Datoen for kravet
  rettes dermed ikke i løsningen. Det er modellen OV-U11 forkastet for varseldatoen («at datoen
  ikke kan rettes i appen»), og den gjelder her bare for kravet; for varseldatoen gjelder punkt
  8.»

**Punkt 19 (3.1).**

- **B.** «En ny retting av varseldatoen sammenlignes alltid med datoen totalentreprenøren først
  oppga. En dato før den er til totalentreprenørens fordel og gjelder først når byggherren godtar
  rettingen; til da gjelder datoen totalentreprenøren først oppga. En dato etter den gjelder
  straks som premiss for nye svar.»

**Punkt 21 (3.2).**

- **B.** «Totalentreprenøren kan sette en akseptfrist i rettingen til en tidligere varseldato.
  Fristen er valgfri. Akseptfristen er en dato i rettingen, og den er ute ved utgangen av datoen
  i norsk tid. Totalentreprenøren kan ikke sette en frist som ligger før datoen for rettingen,
  eller som faller på en lørdag, helligdag eller høytidsdag (NS 8407 punkt 6). Løsningen knytter
  ingen virkning til akseptfristen: byggherren kan godta rettingen også etter fristen, og
  løsningen regner ikke aksepten som rettidig eller for sen etter avtaleloven, sier ikke at
  rettingen har falt bort eller ikke lenger binder totalentreprenøren, og avgjør ikke når et brev
  er kommet fram (MM-U50 punkt 6 og 8). Godtar byggherren rettingen etter akseptfristen, sier
  brevet at aksepten er sendt etter akseptfristen <dato> i totalentreprenørens retting.»
- **C.** «Totalentreprenøren kan sette en akseptfrist i rettingen til en tidligere varseldato.
  Fristen er valgfri. Akseptfristen er en dato i rettingen, og den er ute ved utgangen av datoen
  i norsk tid. Totalentreprenøren kan ikke sette en frist som ligger før datoen for rettingen,
  eller som faller på en lørdag, helligdag eller høytidsdag (NS 8407 punkt 6). Etter fristen kan
  byggherren ikke godta rettingen i løsningen. Det er en begrensning i løsningen. Løsningen sier
  ikke at rettingen har falt bort eller er tatt tilbake, og avgjør ikke om totalentreprenøren
  fortsatt er bundet av den (MM-U50 punkt 8). Uten frist kan byggherren godta rettingen uten
  tidsgrense i løsningen.»

**Punkt 22 (3.3).**

- **A.** «Sender totalentreprenøren en ny retting av samme varseldato mens en tidligere retting
  til en tidligere dato står åpen, kan byggherren bare godta den siste i løsningen. Den tidligere
  rettingen kan ikke godtas i løsningen. Det er en begrensning i løsningen. Løsningen sier ikke
  at den tidligere rettingen er tatt tilbake eller har falt bort, og avgjør ikke om
  totalentreprenøren fortsatt er bundet av den (MM-U50 punkt 8). Aksepten viser til rettingen den
  gjelder.»
- **C.** «Sender totalentreprenøren en ny retting av samme varseldato til en dato før den som
  gjelder, mens en tidligere retting til en tidligere dato står åpen, avvises den nye rettingen.
  Den åpne rettingen står til byggherren har godtatt den, eller til den ikke lenger kan godtas i
  løsningen. Det er en begrensning i løsningen. Løsningen sier ikke at totalentreprenøren er
  bundet av den åpne rettingen, og avgjør ikke om totalentreprenøren er løst fra den (MM-U50
  punkt 8). Vil totalentreprenøren si at den åpne rettingen er feil, sier totalentreprenøren det
  i et innlegg. En retting til en senere dato enn den som gjelder, avvises ikke. Aksepten viser
  til rettingen den gjelder.»

**Punkt 23 (3.4).**

- **A.** «Har byggherren godtatt mer enn én retting av samme varseldato, gjelder datoen i den
  siste aksepten. Løsningen sier ikke at den tidligere aksepten er tatt tilbake, og avgjør ikke om
  byggherren fortsatt er bundet av den (MM-U50 punkt 8). Mener totalentreprenøren at den
  tidligere aksepten står, sier totalentreprenøren det i et innlegg.»
- **C.** «Har byggherren godtatt mer enn én retting av samme varseldato, gjelder den tidligste av
  de godtatte datoene. Løsningen avgjør ikke om byggherren fortsatt er bundet av den tidligere
  aksepten, eller om den senere aksepten har virkning mellom partene (MM-U50 punkt 8). Mener
  byggherren at den tidligere aksepten ikke står, sier byggherren det i et innlegg.»

**Punkt 25 (3.5).**

- **A.** «I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt endringsordre eller
  en godkjent registrering av en endringsordre omfatter, avvises totalentreprenørens retting av
  varseldatoen. Totalentreprenøren kan si at datoen er feil i et innlegg (GR-U27; EO-U34 punkt
  12).»

Forkastet tidligere og ført videre fra postene som oppheves: MM-U42 (to alternativer), MM-U51
(ett) og LV-U54 (ett), ordrett som de står i registeret.

## Endret innhold

Gammel tekst er ordrett fra vedtaksfila på `d049d6a`. Svarene 05.11 er vedtatt innhold; E1–E4 og E7 viser hvor de endrer en gjeldende post. E5, E6 og E8 gir ingen ny regel.

**E1 Et nytt svar og aksepten av en retting (punkt 6 og 20).** Gammel tekst: MM-U42 «Et nytt svar
erstatter det tidligere som byggherrens siste svar i løsningen, uten totalentreprenørens aksept,
og en ny kravversjon venter på byggherrens svar.» Ny tekst: siste setning i punkt 6. Kilde:
forholdet i 05.11 1 C: «Presiserer punkt 6 der: «Et nytt svar erstatter det tidligere som
byggherrens siste svar i løsningen» gjelder standpunktene i svaret, ikke aksepten av en
retting.» Punkt 7 gjelder fortsatt bare en retting fra byggherren; aksepten går gjennom
godkjenningen med svaret etter punkt 20.

**E2 Datoen en ny retting sammenlignes med (punkt 8 og 19).** Gammel tekst: MM-U41 punkt 8 «til da
gjelder datoen totalentreprenøren først oppga». Ny tekst: punkt 19, og henvisningen i punkt 8.
Kilde: forholdet i 05.11 3.1 A: ««til da gjelder datoen totalentreprenøren først oppga» leses som
datoen som gjaldt da rettingen ble sendt, og en tidligere dato gjelder fra byggherrens aksept,
også når en senere retting er sendt etter den.» Ordlyden i punkt 8 står; punkt 19 sier hvordan
den leses.

**E3 Kravdatoen (punkt 8, 13 og 18 og beslutningsdelen).** Gammel tekst: MM-U41 punkt 8 «En feil
dato totalentreprenøren har oppgitt for et varsel sendt utenfor løsningen», punkt 13 og
beslutningsdelen; VS-U34 «En feil dato rettes etter OV-U11.»; OV-U5 «Datoen oppgis når kravet
sendes, og endres ikke senere.» Ny tekst: punkt 18, tillegget i punkt 8 og 13 og siste setning i
beslutningsdelen. Kilde: forholdet i 05.11 2 A: «presiserer VS-U34: «En feil dato» gjelder både
varselet og kravet. Utvider punkt 8 og beslutningsdelen i samlevedtaket for retting av sendt brev
(MM-U41) fra varselet til kravet. Snevrer inn punkt 13 i MM-U41: datoen et registrert krav ble
sendt, rettes etter punkt 8, ikke som en korrigering. Punkt 17 gjelder ikke datoen. Presiserer OV-U5: …» Redaksjonelt: setningen «Rettingen bygges før første ekte sak sammen med rettingen av varseldatoen og har samme modell.» står i beslutningsdelen som «Rettingen av kravdatoen etter punkt 18 bygges …», og «rettes etter punkt 8» står i punkt 13 som «rettes etter punkt 18», som viser til punkt 8.

**E4 Endringsordren går foran også punkt 18–23 (punkt 16).** Gammel tekst: MM-U41 punkt 16 «foran
punkt 1–15». Ny tekst: «foran punkt 1–15 og 18–23». Kilde: kartleggingen. Punkt 18–23 er nye og
gjelder ikke en endringsordre; for rettingen i en lukket sak gjelder punkt 24 og 25 uttrykkelig.
Oppdragsgiver har ikke sagt dette; det er vår slutning av punkt 16.

**E5 Brevtekstene (punkt 10 og designdelen).** Gammel tekst: MM-U41 punkt 10 «‹TE oppgir nå at
<pålegget ble mottatt \| TE ble klar over forholdet> <dato>. I brev <n> av <dato> oppga TE
<dato>.›» og designdelen «‹Svaret erstatter byggherrens svar i brev <n> av <dato>.›». Ny tekst:
som i punkt 10 og designdelen. Kilde: LV-U35 «‹TE› i en vedtatt brevtekst leses som
‹totalentreprenøren›, og ‹TEs› som ‹totalentreprenørens›.» og LV-U53, som endrer henvisningsformen
«også i ordlyden i LV-U4, LV-U10, LV-U34, GR-U14, punkt 10 i samlevedtaket for retting av sendt
brev». Ikke nytt innhold.

**E6 Henvisningene til MM-U12 (punkt 3, 6, 8, 11 og 24).** Gammel tekst: «(MM-U12)». Ny tekst:
«(MM-U50 punkt 8)» der setningen gjelder om en part er løst eller bundet, ellers «(MM-U50 punkt
6)». Kilde: MM-U50 opphevet MM-U12, og henvisningene til den gjelder samlevedtaket (OV-U92 (a)). Ikke nytt innhold. «Rettslig virksom» i punkt 6 knyttes til punkt 8 i MM-U50, fordi setningen gjelder om en part er bundet av endringen.

**E7 Lukket sak (punkt 24 og 25).** Gammel tekst: GR-U27 «Innlegg og dokumentasjon kan fortsatt
legges til.»; EO-U34 punkt 12 «I en KOE-sak som en sendt endringsordre eller en godkjent
registrering omfatter, avviser løsningen krav, svar, aksept og trekk.» og «Innlegg, dokumentasjon
og innsigelser etter punkt 5 tredje ledd godtas.» Ny tekst: punkt 24 (MM-U51, uendret innhold) og
punkt 25. Kilde: forholdet i 05.11 3.5 B: «utvider det som godtas etter GR-U27 og EO-U34 punkt 12
til totalentreprenørens retting av varseldatoen.» Spørsmål 3 avgjør hvordan forholdet til EO-U34 føres.

**E8 Redaksjonelt (punkt 5–7, 10, 18, 20 og 24).** Selvhenvisningene «punkt 8 i samlevedtaket for retting av sendt brev» (05.11 1 C og 2 A) og «punkt 10 i samlevedtaket for retting av sendt brev» (MM-U51, LV-U54) står som «punkt 8» og «punkt 10». De betingede setningene i kursiv i punkt 5 og 7 i versjon 1 («Ved spørsmål 2 A …») er skrevet etter svaret 2 A (MM-U42). «etter punkt 20» i punkt 6 viser til aksepten fra 05.11 1 C. Ikke nytt innhold.

## Klassene

Etter testen i vedtaksskillen, prøvd uavhengig 05.11 (svar 8; se «Kontrollen»):

- Punkt 1–25 er *vedtak*: de sier hvilken virkning en retting, en aksept og en korrigering har,
  hvilken dato som regnes med, og hva løsningen ikke avgjør. Setningene «Det er en begrensning i
  løsningen.» i punkt 23 og «Aksepten viser til rettingen den gjelder.» i punkt 22 følger
  regelen i punktet og er ikke egne deler.
- Designdelen er *design*: brevene og visningen, også at en retting i en lukket sak vises som et
  tilbud som ikke kan godtas.
- Beslutningsdelen er *beslutning*: hva som bygges før første ekte sak.

## Påstander om koden

- Ingen fil i `kjerne/`, `server/` eller `src/` viser til MM-U41, MM-U42, MM-U51 eller LV-U54
  (søk med ordgrense 05.11 på `d049d6a`).
- MM-U41 står i `docs/domenetabell/brukerforlop/`: BF-02A.json, BF-02C.json, BF-05.json,
  BF-06.json, BF-05.md og dekning.md. Oppheves MM-U41, må hver henvisning få samlevedtaket ved
  siden av (vakten for opphevede ID-er, #1606) i vedtaks-PR-en. Domenetabellen eies av
  review-økta for #1611 til den PR-en er merget.

## Spørsmålene til oppdragsgiver

Spørsmål 1 og 3 er juridiske og stilles i tekst. Spørsmål 2 er teknisk, men står i samme liste,
fordi det avgjør forholdet i spørsmål 1. Svar for eksempel «1 A, 2 A, 3 A».

**1. Tilslutning til samlevedtaket for retting av sendt brev, versjon 2.** Forslaget over, punkt
1–25 med designdelen, beslutningsdelen, «Forkastet 05.11» og E1–E8. Punkt 1–17 er versjon 1 med
ordlyden slik senere vedtak alt har endret den (E5, E6). Punkt 18–25 og tilleggene i punkt 6, 8,
13 og beslutningsdelen er svarene dine 05.11 på spørsmålene før bygging av #1309, ordrett, og
korrigeringen i en lukket sak fra 05.11 (MM-U51). Brevteksten etter en korrigering (LV-U54) står i
punkt 10. E4 er vår slutning: endringsordren går foran også de nye punktene.

- **A (anbefalt):** «Samlevedtaket for retting av sendt brev, versjon 2, gjelder med E1–E8, med
  forholdene etter svaret på spørsmål 2 og 3. Forhold: presiserer VS-U34, OV-U5 og KA-U1, og
  utvider GR-U27.»
- **B:** Samme som A, med rettingene du gir per punkt eller E-punkt.

*Anbefaling:* A. Innholdet er det du alt har svart på; samlevedtaket setter det inn i én tekst
med kilde for hver setning.

*Hva valget styrer:* hvilken tekst som er regelgrunnlaget for rettingen i #1309 og #1308.

**2. Hva samlevedtaket gjør med MM-U41, MM-U42, MM-U51 og LV-U54 (teknisk).** Svar 4 A i #1534: et
samlevedtak samler, og opphever bare når det endrer innholdet. Svarene 05.11 endrer innholdet i
MM-U41 og MM-U42 (E1–E3). Står MM-U41 som samlevedtak ved siden av versjon 2, finnes temaet i to
tekster, og varselet for MM-U41 står fortsatt.

- **A (anbefalt):** Versjon 2 opphever MM-U41, MM-U42, MM-U51 og LV-U54, og henvisningene til dem
  gjelder samlevedtaket (som OV-U92 (a)). Forholdene deres føres videre i versjon 2 («Postene i
  kjeden»). I vedtaks-PR-en får henvisningene til MM-U41 i de seks brukerforløpsfilene
  samlevedtaket ved siden av, og `bindende_i` i VS-U44 og B-03-DOKUMENT viser til samlevedtaket.
- **B:** Versjon 2 samler de fire postene. De står som gjeldende, «Samlet i samlevedtaket for
  retting av sendt brev», og ingen henvisninger skrives om. Varselet for MM-U41 står, fordi
  forholdene fra de nye punktene teller som endringer av MM-U41.

*Anbefaling:* A. Samlevedtaket endrer innholdet (E1–E3), og da skal det oppheve (svar 4 A). Det
koster seks filer med henvisninger i vedtaks-PR-en.

*Hva valget styrer:* forholdene i posten, om brukerforløpene må endres i vedtaks-PR-en, og om
varselet for MM-U41 står.

**3. Hvordan føres utvidelsen av EO-U34 punkt 12?** Punkt 24 (MM-U51) og punkt 25 (05.11 3.5 B)
lar to rettinger godtas i en KOE-sak som en endringsordre omfatter. Det utvider punkt 12 i
samlevedtaket for endringsordren (EO-U34), som har fått tre endringer etter samlingen (HF-U25,
KA-U50 og MM-U51). Etter svar 6 A skrives den neste endringen «i temaet» som et samlevedtak.
Verktøyet teller også MM-U51 etter at den er opphevet, så varselet for EO-U34 står ved A og B.

- **A (anbefalt):** Punkt 24 og 25 står i samlevedtaket for retting av sendt brev, med ett
  forhold «utvider EO-U34» for begge. EO-U34 samles ikke nå. Når EO-U34 får sin neste endring,
  tar samlevedtaket for endringsordren punkt 12 med punkt 24 og 25. Begrunnelse: rettingen hører
  til temaet retting. Utvidelsen skrives i et samlevedtak med samlet tilslutning, slik svar 6 A
  krever. Den som leser punkt 12 i EO-U34, finner utvidelsen i Følge.
- **B:** Som A, og i tillegg en ny samlet tekst for punkt 12 i EO-U34 i samme tilslutning: ‹I en
  KOE-sak som en sendt endringsordre eller en godkjent registrering omfatter, avviser løsningen
  krav, svar, aksept og trekk. Innlegg, dokumentasjon og innsigelser etter punkt 5 tredje ledd
  godtas, og rettingene etter punkt 24 og 25 i samlevedtaket for retting av sendt brev.› Forhold:
  endrer EO-U34 punkt 12. Punkt 12 leses da i én tekst, men EO-U34 får sin femte endring.
- **C:** Punkt 25 venter. Samlevedtaket for endringsordren skrives på nytt i en egen kartlegging,
  med punkt 12, MM-U51 og 3.5 B, og #1309 bygger ikke rettingen i en lukket sak før det er
  godkjent.

*Anbefaling:* A. B gir én tekst for punkt 12, men endrer EO-U34 utenfor et samlevedtak for temaet
og gjør tellingen høyere. C forsinker #1309 for en regel du alt har vedtatt. At A oppfyller svar
6 A, er vår lesing. Svaret sier «Den neste endringen i temaet skrives da som et samlevedtak», og
det kan også leses som et samlevedtak for endringsordren. Da er C riktig.

*Hva valget styrer:* forholdet til EO-U34, om varselet for EO-U34 står, og om #1309 kan bygge
punkt 25 når versjon 2 er ført.

## Svarene

Føres her når de kommer.
