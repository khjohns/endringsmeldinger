# Samlevedtak: fristene i kravet, spesifiseringen og forespørselen, versjon 2

Dato: 25.11.2026. Kontrollert commit: `68b570c` (`main`). Del av #1534, steg 4, oppgave B4 i
[tilstanden 17.11](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6950640930)
(«en ny versjon av VS-U47 med KA-U73, KA-U74 og KA-U76–KA-U81»), i formen etter svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)), med
[vilkår og forbehold, versjon 2](vurdering-samlevedtak-vilkaar-forbehold-v2-2026-11-25.md) som
mønster. Fila viser til punktene i [VS-U47](../plans/vedtak.md#samlevedtak-spesifisering) uten å
gjengi dem, og skriver ikke i `vedtak.toml`. Den foreløpige ID-en er VS-U88, den neste ledige.

**Grensen.** Versjon 2 tar inn fristkjeden fra BF-20 (#1745), endringene etter 05.11 og det som
trengs for å lese regelen av ett vedtak. Det som også endrer andre temaer, står med sine forhold.
Nummereringen står, og nye punkter kommer til slutt: OV-U109 og OV-U111 viser til punkt 1, 4 og 6.
**Prinsippet 14.11:** vedtaket sier budskapet, ordlyden og skjemaet står i designdelen.

## Endringene

`vedtaksregister.py --sjekk` på `68b570c`: VS-U47 har 5 endringer gjennom kjeden: OV-U109 og OV-U111
én gang, fra OV-U123 som samler dem, KA-U78 fordi den presiserer VS-U4, og KA-U81, KA-U84 og KA-U86
gjennom KA-U78.

| Post | Forhold | Hva den endrer |
| --- | --- | --- |
| KA-U73, KA-U74 (11.11), KA-U79 (13.11) | KA-U74 og KA-U79 presiserer KA-U73 | Fristene i kravet, og en frist som ikke er registrert. Punkt 12–13 |
| KA-U76 (11.11) | bygger på KA-U75 (samlet i OV-U115) | Trekket av en frist. Punkt 14 |
| KA-U77 (12.11) | snevrer inn OV-U63, presiserer EO-U38 | Datoen fristen får. Punkt 15 |
| EO-U40, EO-U41, GR-U38, GR-U39 (14.11) | endrer og presiserer KA-U77 | Enighetene datoen regnes med. Punkt 15. Står, fordi de også endrer EO-U39, GFK-U26 og GR-U7 |
| OV-U118 (25.11) | utvider KA-U76, OV-U115, OV-U114 | Et krav sendt før det siste i sporet. Står, punkt 14 viser dit |
| KA-U78 (12.11) | presiserer OV-U32, VS-U4, B-13 frist uten fremdriftshindring | Laget for hindringen og for punkt 33.4. Punkt 1, 6 og 16 |
| KA-U80, KA-U81 (13.11) | KA-U81 presiserer KA-U80 og KA-U78 | Ett standpunkt om hindringen. Punkt 17 |
| KA-U84, KA-U85, KA-U86 (19.11) | presiserer KA-U78 og OV-U32, utvider KA-U84 | Rekkefølgen etter punkt 33.4 og 33.6.2. Punkt 16 (spørsmål 2) |
| OV-U109 (15.11), OV-U111 (16.11) | snevrer inn VS-U47 punkt 4 og 6; samlet i OV-U123 punkt 17 | Et fristkrav sendt før forespørselen. Punkt 4 og 6 |

## Motsigelser og hull

- **M1 Lagene.** Punkt 1 sier at byggherren «prinsipalt» oppgir dagene byggherren måtte forstå. Etter
  KA-U78, KA-U84 og KA-U86 står påberopelsene etter punkt 33.4 og 33.6.2 og hindringen foran (E7).
- **M2 Krav sendt før forespørselen.** Punkt 4 og 6 utleder virkningen etter punkt 33.6.2 tredje og
  fjerde ledd uten unntak. OV-U109 og OV-U111 snevrer dem inn (E8).
- **M3 VS-U46** er opphevet. Punkt 9 viser til punktene der, som har samme nummer i VS-U87 (E9).
- **M4 KA-U77** sier at partene er enige når totalentreprenøren har godtatt dagene i en
  endringsordre. Etter EO-U40 godtar totalentreprenøren ikke en endringsordre (E10).

Ingen av dem krever et valg: hver løses av en post som er vedtatt.

## Utkastet

Punktene som ikke nevnes, står som i VS-U47, med «TE» skrevet som «totalentreprenøren» (E11).
Beslutningsdelen står som i VS-U47. Ny tekst med kilde:

### Fristene i kravet, spesifisering etter punkt 33.6.1 og forespørsel etter punkt 33.6.2, versjon 2 (foreløpig VS-U88)

- **Tittelen.** «Samlevedtaket for fristene i kravet, spesifisering etter punkt 33.6.1 og forespørsel
  etter punkt 33.6.2». (E10)
- **Punkt 1.** «Påberoper byggherren at totalentreprenøren spesifiserte kravet for sent etter punkt
  33.6.1, oppgir byggherren det antall dager byggherren mener byggherren måtte forstå at
  totalentreprenøren hadde krav på, og i laget etter det det byggherren godtar hvis spesifiseringen
  kom i tide. Hvilke lag som står foran, følger av punkt 16. Løsningen regner ikke ut hva noen måtte
  forstå. Påberopelsen er ikke preklusjon med prinsipalt avslag.» (VS-U4 s1–s4; KA-U78 s1; E7)
- **Punkt 4, ny siste setning.** «Hadde totalentreprenøren sendt et krav om dager før forespørselen,
  gjelder OV-U109 og OV-U111 (punkt 17 i samlevedtaket for brev sendt utenfor løsningen).» (OV-U123
  punkt 17; E8)
- **Punkt 6, nye setninger etter den første.** «Har totalentreprenøren angitt dagene som svar på
  byggherrens forespørsel etter punkt 33.6.2 bokstav a, kan byggherren ikke påberope at kravet ble
  spesifisert for sent, og laget finnes ikke. Hadde totalentreprenøren sendt et krav om dager før
  forespørselen, utleder løsningen ingen virkning etter fjerde ledd, heller ikke for kravet som
  svarer på forespørselen, og påberopelsen etter punkt 33.6.1 sperres ikke.» (KA-U78 s3; OV-U111
  s2–s4; E8)
- **Punkt 9, siste setning.** «… etter punkt 6, 9, 10, 12–14 og 20 i samlevedtaket for varslene etter
  punkt 34.3.3 og 34.4, og påberopelse av sent varsel.» (E9)
- **E. Fristene i kravet. Punkt 12, nytt.** «Kravet om fristforlengelse gjelder en eller flere av
  fristene i kontrakten, og kravet og brevet angir dagene for hver frist, ikke ett tall for alle.
  Totalentreprenøren velger en frist som er registrert for prosjektet, eller angir en frist som ikke
  er registrert, med nummeret, om den har et, og navnet kontrakten gir den. Byggherren svarer på en
  frist som ikke er registrert, som på de andre.» (KA-U73; KA-U74 og det forkastede alternativet;
  KA-U79 s1–s3)
- **Punkt 13, nytt.** «For en frist som ikke er registrert, kan dagene ikke verdsettes uten sats
  (GFK-U3, GFK-U4). Løsningen kontrollerer ikke at fristen finnes i kontrakten, og likestiller den
  ikke med en registrert frist; det vurderer partene. Den kobles aldri til en frist som senere
  registreres (KA-U16). I en ny versjon kan totalentreprenøren selv erstatte den med den registrerte
  fristen, eller rette en skrivefeil i nummeret eller navnet. Det er en erstatning, ikke et trekk, og
  brevet sier at fristen er erstattet.» (KA-U79 s4–s8)
- **Punkt 14, nytt.** «Totalentreprenøren trekker en frist etter samme regel som en kravpost etter
  KA-U75 (punkt 21 i samlevedtaket for vederlagsmetoden). Brevet sier at fristen trekkes, fristen kan
  tas med igjen i en senere versjon, og partene vurderer betydningen. Trekket av hele fristkravet er
  fortsatt et avkall (KA-U22). Et fristkrav sendt før totalentreprenørens siste krav i sporet følger
  OV-U118.» (KA-U76 s1–s3; OV-U118)
- **Punkt 15, nytt.** «Datoen en registrert frist får, regnes fra fristen slik den gjelder etter
  forlengelser partene er enige om i andre saker i samme kontrakt. Enige er partene når
  totalentreprenøren har godtatt et svar der dagene står i første lag, eller uten aksept etter GR-U38,
  og en betinget enighet teller som avtalt (GR-U39). Dagene i en endringsordre teller som avtalt bare
  når endringsordren gjengir en registrert enighet, og da telles forlengelsen fra endringsordren, og
  KOE-saken med den samme enigheten tas ut. Datoen forutsetter at dagene i kravet kommer i tillegg til
  forlengelsene som alt er avtalt. Den regnes med enighetene som foreligger når kravet fylles ut, står
  ikke i brevet, og er ikke en vurdering etter punkt 33.5.» (KA-U77 s2–s6; EO-U40 s2; EO-U41; GR-U38;
  GR-U39; E10)
- **F. Lagene i byggherrens svar. Punkt 16, nytt.** «Et standpunkt i et senere lag gjelder bare hvis
  innsigelsene foran ikke fører fram, i den utstrekning de rammer standpunktet (OV-U32). Av
  standpunktene byggherren tar til kravet om fristforlengelse, står påberopelsen av at varselet etter
  punkt 33.4 kom for sent, først. Påberopelsen av at totalentreprenøren ikke svarte i tide på
  forespørselen etter punkt 33.6.2, står etter den, fordi forespørselen sendes under forbehold om
  innsigelsen etter punkt 33.4. Deretter står standpunktet om hindringen (punkt 17), dagene
  byggherren måtte forstå (punkt 1) og dagene byggherren godtar hvis spesifiseringen kom i tide. Etter
  en påberopelse etter punkt 33.4 eller 33.6.2 er de øvrige standpunktene subsidiære, også når
  byggherren er enig i at fremdriften er hindret, og at hindringen skyldes forholdet, og brevet sier
  det.» (OV-U32 s2; KA-U78 s1–s2; KA-U84 s1–s3; KA-U85; KA-U86; E7)
- **Punkt 17, nytt.** «Byggherren tar ett standpunkt for hele kravet, om fremdriften ble hindret av
  forholdet totalentreprenøren påberoper, og begrunner begge vilkårene samlet, at det foreligger en
  hindring, og at hindringen skyldes forholdet, sammen med dagene for hver frist. Brevet nevner begge
  vilkårene. Mener byggherren at fremdriften ikke ble hindret for en av fristene, avslår byggherren
  dagene for den fristen og begrunner det.» (KA-U80 s1–s2; KA-U81 s1–s3)
- **Designdelen, nye setninger.** «Skjemaet for kravet viser datoen etter punkt 15 og sier hvilke
  saker den er regnet med. Andre saker tas ikke med, og skjemaet sier hvilke og hvorfor. For en frist
  som ikke er registrert, viser skjemaet ingen ny dato og sier hvorfor.» (KA-U77 s2, s4 og s6; KA-U79
  s4) «Skjemaet nevner begge vilkårene for hindringen.» (KA-U81 s2) «Visningen sier at standpunktene
  etter punkt 16 er subsidiære.» (KA-U84 s3) «Ordet for partens standpunkt («godtar») står i
  språkfila.» (designdelen i KA-U78)

### Endret innhold

- **E7** Punkt 1, 16 og 17: lagene i svaret på fristkravet og hindringen (KA-U78, KA-U80, KA-U81,
  KA-U84–KA-U86; M1).
- **E8** Punkt 4 og 6: et krav om dager sendt før forespørselen (OV-U109, OV-U111; M2). Punkt 6 tar
  KA-U78 s3 ordrett, uten vilkåret i første setning om en forespørsel fra løsningen.
- **E9** Punkt 9: henvisningene gjelder VS-U87, med samme nummer (M3). Punkt 10 og 12 der har fått
  setninger om punkt 34.4, og innholdet punkt 9 viser til, står.
- **E10** Punkt 12–15 og tittelen: fristene i kravet (KA-U73, KA-U74, KA-U76, KA-U77, KA-U79), med
  KA-U77 slik EO-U40, EO-U41, GR-U38 og GR-U39 har endret og presisert det (M4). Det skjemaet viser,
  står i designdelen (prinsippet 14.11).
- **E11** Språket: «TE» blir «totalentreprenøren».
- **Hovedregelen** (OV-U92): (a). Henvisningene til VS-U47 gjelder versjon 2.

### Forholdene (spørsmål 2)

Versjon 2 opphever VS-U47 (svar 4 A, fordi E7, E8 og E10 endrer innholdet). Forholdene i VS-U47 føres
videre. Versjon 2 samler KA-U73, KA-U74, KA-U76–KA-U81 og KA-U84–KA-U86, og deres forhold til OV-U32,
OV-U63, EO-U38, GFK-U23, KA-U75 og B-13 står på postene. EO-U40, EO-U41, GR-U38, GR-U39, OV-U118,
OV-U109 og OV-U111 står med sine forhold, og forholdene til VS-U47 og KA-U77 gjelder versjon 2
(OV-U92 (a)). KA-U85 presiserer OV-U32 og hører også til lagene i brevet (tema 28, gruppe E).

## Spørsmålene

> **1. Tilslutning.** Gjelder utkastet over, med punkt 1, 4, 6, 9 og 12–17, designdelen og E7–E11,
> som samlevedtaket for fristene i kravet, spesifisering etter punkt 33.6.1 og forespørsel etter
> punkt 33.6.2, versjon 2? Svar «ja» eller rett enkeltpunkter. Styrer: den nye posten.

> **2. Forholdene og KA-U85.** Bakgrunn: svar 4 A og OV-U92. Alternativer: **A (anbefalt)** som
> «Forholdene» over: versjon 2 opphever VS-U47 og samler KA-U73, KA-U74, KA-U76–KA-U81 og
> KA-U84–KA-U86. **B:** «Som A, men KA-U85 samles ikke. Den står med forholdet til OV-U32 og samles
> med lagene i brevet, og punkt 16 viser til den for rekkefølgen mellom punkt 33.4 og punkt 33.6.2.»
> Anbefaling: A. Punkt 16 gir hele rekkefølgen i svaret på fristkravet, og KA-U86 viser til KA-U84
> for samme regel. Med B står rekkefølgen i to poster til lagene er samlet. Styrer: `folge` i den
> nye posten.

## Berørt kode og forløp

- **Henvisningene.** Når versjon 2 opphever VS-U47, skiftes henvisningene ut i samme PR: kommentarene
  i `kjerne/spor/frist/` (`utledning.ts`, `kommando.ts`, `frysing.ts`), testnavnene i
  `kjerne/tester/foresporselen.test.ts` med malene i `kjerne/tester/feilinnfoering.ts`, som endres
  samlet (#432), `Fristoversikt.test.ts`, `handlinger.toml` med `handlinger.md`, BF-14, BF-45 og
  BF-47 (`.md` og `.json`), `dekning.md`, og `temaer.toml` med temavisningen. «VS-U47 spørsmål 2»
  blir «VS-U88 punkt 3». Vedleggene og de daterte vurderingene står (historiske).
- **Forløpene.** BF-47 (#2015) viser til VS-U47 for forespørselen, og BF-20 til KA-postene.
  Innholdet endres ikke, fordi versjon 2 bare fører inn poster som er vedtatt.
- **Kodefunn:** ingen. Om kjernen har lagene i punkt 16, er ikke kontrollert.

## Verifikasjon og grenser

- **Kjørt og observert:** `vedtaksregister.py --sjekk`, `--kjede VS-U47` og `--vis` på `68b570c`, og
  `varsler` lest for de fem endringene. Forholdene og henvisningene talt med skript og `grep`.
- **Lest:** VS-U47, OV-U123 punkt 17, OV-U115 punkt 21, VS-U46 og VS-U87 punkt 6–20, og spørsmålene
  til KA-U78, KA-U79, KA-U81 og EO-U41.
- **Kontrollert av subagenter 25.11:** prøvingen mot vedtakene og kontrollen av klassen og påstandene.
  Sju indre feil i punkt 6, 9, 12, 14, 15, 16 og 17 er rettet, det skjemaet viser, er flyttet til
  designdelen, og lista over henvisninger er fullført.
- **Ikke kontrollert:** sitatene fra NS 8407 (teksten er ikke klonet), og om koden følger punktene.
