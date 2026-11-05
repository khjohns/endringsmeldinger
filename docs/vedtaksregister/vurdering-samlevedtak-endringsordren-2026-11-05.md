# Samlevedtak: endringsordren, versjon 2

Kartleggingen for et nytt samlevedtak for endringsordren, steg 4, trinn 2 i
[#1534](https://github.com/khjohns/endringsmeldinger/issues/1534). Kontrollert mot `main` på
`9645794`. Del av #1309.

**Hvorfor fila finnes.** Samlevedtaket for endringsordren (EO-U34) har fått tre endringer etter
at temaet ble samlet: HF-U25 og KA-U50 endrer det, og MM-U51 utvider punkt 12. Verktøyet varsler
(`vedtaksregister.py --sjekk`: «eo-u34: har fått 3 endringer etter at temaet er samlet»). Etter
svar 6 A i #1534 ([6623299573](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623299573))
skrives da den neste endringen som et samlevedtak. Den neste er punkt 25 fra 05.11 (3.5 B, retting
av varseldatoen i en lukket sak). Oppdragsgiver svarte 05.11 «3 C» i samlevedtaket for retting av
sendt brev, versjon 2 (MM-U52): «Punkt 25 føres ikke med versjon 2. Det føres i et nytt samlevedtak
for endringsordren, som skrives i en egen kartlegging med HF-U25, KA-U50, MM-U51 og 3.5 B.»
([6658191101](https://github.com/khjohns/endringsmeldinger/issues/1309#issuecomment-6658191101)).
Denne fila er den kartleggingen.

**Formen** følger svar 4, 7, 8 og 10 i #1534, som i
[samlevedtaket for retting av sendt brev, versjon 2](vurdering-samlevedtak-retting-av-sendt-brev-2026-11-05.md)
(MM-U52). Hver setning viser kilden. Det som endrer innholdet i en gjeldende post, står i «Endret
innhold». De forkastede alternativene står ordrett under «Forkastet». Den foreløpige ID-en er
EO-U38. Den kontrolleres mot `main` når posten føres. Fila skriver ikke i `vedtak.toml`,
`vedtak.md`, temavisningene eller brukerforløpene.

## Det kartleggingen fant

- **Fire endringer venter, ikke tre.** HF-U25 endrer punkt 46, KA-U50 endrer designdelen, og
  MM-U51 utvider punkt 12. Punkt 25 fra 05.11 (3.5 B) utvider punkt 12 og GR-U27, og står ikke i
  registeret ennå.
- **Teksten i vedtaksfila er ikke rettet etter endringene.** Raden EO-U34 sier «Endret 04.11 av
  HF-U25» og «Endret 04.11 av KA-U50», men avsnittet `samlevedtak-eo` har fortsatt den gamle
  ordlyden i punkt 46 og designdelen. Samlevedtaket og endringene sier da to ting.
- **EO-U35, EO-U36 og EO-U37 står som egne poster ved siden av EO-U34.** Teksten i EO-U34 har dem
  som betingede punkter: «*Etter svaret på spørsmål 2 (E14), forslag A:*» i punkt 50, «Ved forslag
  A … ved forslag B …» i punkt 56, «*Etter svaret på spørsmål 4 (E16), forslag A:*» i punkt 57 og
  «*Etter svaret på spørsmål 3 (E15), forslag B:*» i beslutningsdelen. I beslutningsdelen mangler
  «som et unntak fra LV-U47», og merket etter EO-U14 står bare betinget i designdelen. Ingen post
  har forhold til EO-U35, EO-U36 eller EO-U37.
- **Teksten viser til opphevede poster.** MM-U12 og MM-U17 er opphevet av MM-U50, og MM-U21 av
  MM-U52. Henvisningene til dem gjelder samlevedtakene (OV-U92 (a)). EO-U34 viser til MM-U12 i
  punkt 59, 63 og 64, EO-U35 i punkt 50, MM-U17 i punkt 46 og MM-U21 i beslutningsdelen. E8 skriver
  dem om uten nytt innhold.
- **Kilden for innsigelsene i punkt 12 er endret.** Punkt 12 har «Innlegg, dokumentasjon og
  innsigelser etter punkt 5 tredje ledd godtas» med kilden MM-U34 punkt 19. MM-U35 endret punkt 19
  (01.11): innsigelsen sendes som innlegg. MM-U35 er samlet i MM-U47, punkt 1 og 5 der. Virkningen
  er den samme.
- **Seks forhold står etter OV-U93 (c) til dette samlevedtaket:** ka-u12 presiserer eo-u5, ov-u3
  bygger på eo-u2 og eo-u5, ov-u55 snevrer inn eo-u5, gfk-u2 presiserer eo-u6 og hf-u12 presiserer
  eo-u9 ([vurderingen av kjente avvik](vurdering-kjente-avvik-2026-11-05.md)). EO-U34 E11 og E12 sier
  noe om setningene med andre ord, ikke med ordene i (b). E9 sier det med ordene.
- **Henvisningene til EO-U34 utenfor registeret:** ingen i `kjerne/`, `server/` eller `src/`. I
  `docs/domenetabell/`: `regler.json` og `README.md` (21 hver), BF-06.md (38), BF-03.md, BF-03.json,
  BF-06.json og `dekning.md`. EO-U35–EO-U37 står i BF-06.md, BF-06.json og `dekning.md`. Seks sitater
  i `vedtak.toml` har `eo-u34` i `bindende_i` (i postene KA-U50, OV-U91, MM-U37, MM-U42, MM-U45 og
  OV-U62, etter linjenummeret). Se spørsmål 1, «Hva valget styrer».
- **PR #1612 (OV-U94, ikke ført) viser til EO-U34 punkt 12, 21, 24 og 28.** Nummereringen må stå.

## Overlapp med andre samlevedtak og kjeder

| Samlevedtak eller kjede | Felles post | Det tar | Her |
| --- | --- | --- | --- |
| MM-U52 (retting av sendt brev, versjon 2) | MM-U51 (samlet der som punkt 24) | korrigeringen etter punkt 10 i en lukket sak (punkt 24); at samlevedtaket for endringsordren går foran punkt 1–15 og 18–23 (punkt 16) | punkt 12 viser til MM-U52 punkt 24; punkt 68 er 3.5 B, som falt ut av MM-U52 ved svar 3 C; ingen setning i MM-U52 endres |
| HF-U25 (revisjon av byggherrens svar) | – | et nytt svar, også etter aksept; punkt 7 der gjengir punkt 12, 13 og 50 her | punkt 46 får uttrykket fra HF-U25 E2 (E1) |
| KA-U49 (vilkår og forbehold) | – (KA-U50 er svar 1 der) | hvor byggherren skriver vilkår og forbehold i svaret | designdelen (E2) |
| MM-U47 (protest, bestridelse og innlegg) | – (MM-U35 samlet der) | innsigelsen sendes som innlegg; innlegget sperrer ingenting, også etter en endringsordre (punkt 5) | kilden for innsigelsene i punkt 12 (E8) |
| MM-U50 (sendte brev og regelendring) | – (MM-U12, MM-U17) | hva løsningen ikke avgjør (punkt 6 og 8); frysingen ved registrering (punkt 19) | henvisningene i punkt 46, 50, 59, 63 og 64 (E8) |
| OV-U89 (rigg og drift) | – (OV-U43) | punkt 27 der gjentar OV-U43 prinsipp 5 | punkt 21 står; overlapp, ingen endring |
| MM-U45 (betegnelser og nøkkeltall) | – (OV-U43) | nøkkeltallene; viser til punkt 67 og «Sum og kode» | ingen endring |
| OV-U94 (vederlagsmetoden, PR #1612, ikke ført) | – | viser til EO-U34 punkt 12, 21, 24 og 28 | nummereringen står, så henvisningene gjelder versjon 2 |
| GR-U27 (lukket sak, ikke samlet) | – | det som kan legges til i en sak lukket etter aksept av avslaget eller trekk | punkt 68 utvider det; GR-U27 får sin tredje endring (E4) |
| Kjedene i vurderingen av kjente avvik: «Endringsordren som omfatter KOE-sakene», «Kravene er avgjort, og sperren etter det», «Retting av sendt brev», «Fullmakt og godkjenningskjeden» | – | de seks forholdene etter OV-U93 (c) | E9 |

## Postene i kjeden

Kolonnen «Ved spørsmål 1» viser forholdet etter anbefalingen (A).

| Post | Klasse nå | Status nå | Ved spørsmål 1 | E |
| --- | --- | --- | --- | --- |
| EO-U34 | vedtak med designdel og beslutningsdel | gjeldende; endret av HF-U25 og KA-U50, utvidet av MM-U51 | opphever; teksten står i punkt 1–67 med E1–E8 | E1–E8 |
| EO-U35 | vedtak | gjeldende | samler; teksten er punkt 50 | E5, E9 |
| EO-U36 | beslutning | gjeldende | samler; teksten står i beslutningsdelen og designdelen | E7, E9 |
| EO-U37 | vedtak | gjeldende | samler; teksten er punkt 57, og punkt 56 viser dit | E6, E9 |
| HF-U25 | vedtak med designdel (samlevedtak) | gjeldende | står; ordlyden i punkt 46 er skrevet etter E2 der | E1 |
| KA-U50 | vedtak | gjeldende | står; ordlyden i designdelen er skrevet etter den | E2 |
| MM-U51 | vedtak | samlet i MM-U52 (punkt 24) | står; punkt 12 viser til MM-U52 punkt 24 | E3 |
| MM-U52 | vedtak med designdel og beslutningsdel | gjeldende | står; punkt 24 der er hjemmet for korrigeringen etter punkt 10 i en lukket sak | E3, E4, E8 |
| GR-U27 | vedtak med designdel | gjeldende; presisert av EO-U35, utvidet av MM-U51 | utvides (punkt 68); tredje endring | E4 |
| MM-U47 | vedtak med designdel og beslutningsdel | gjeldende | står; kilde for innsigelsene i punkt 12 | E8 |
| MM-U50 | vedtak med designdel og beslutningsdel | gjeldende | står; kilde for henvisningene etter MM-U12 og MM-U17 | E8 |
| LV-U47 | – | gjeldende; snevret inn av EO-U36 | står; forholdet står i EO-U36 | E7 |
| KA-U12, OV-U3, OV-U55, GFK-U2, HF-U12 | – | gjeldende eller endret av EO-U34 | står; forholdet til EO-U2, EO-U5, EO-U6 eller EO-U9 fjernes etter OV-U92 (b) | E9 |

Forholdene samlevedtaket overtar fra EO-U34, som det opphever: «opphever EO-U1, EO-U3, EO-U4, EO-U8,
EO-U16, EO-U20 og EO-U24», «samler EO-U11–EO-U15, EO-U17–EO-U19, EO-U21–EO-U23, EO-U25–EO-U33 og
OV-U6» og «endrer HF-U12, KA-U12, KA-U45, MM-U33, MM-U34, OV-U2, OV-U3, OV-U6, OV-U43, OV-U80 og
ubegrenset fullmakt». «Endrer MM-U21» føres ikke videre, fordi MM-U52 har opphevet MM-U21 og
henvisningene til den gjelder MM-U52 (MM-U52 svar 2 A), som MM-U52 gjorde med «presiserer MM-U12».
EO-U35, EO-U36 og EO-U37 samles og beholder forholdene sine, unntatt det E9 sier. Nye forhold:
«utvider GR-U27» (punkt 68). Forholdene HF-U25, KA-U50 og MM-U51 har til EO-U34, står i postene;
etter svar 10 begynner tellingen av endringer på nytt når versjon 2 er ført.

## Forslaget

Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Punkt 1–67 er versjon 1 (EO-U34) med
E1–E8. Punkt 68 er nytt. Nummereringen i versjon 1 står, så «punkt 12», «punkt 21», «punkt 24» og
«punkt 28» i andre vedtak, i PR #1612 og i brukerforløpene gjelder det samme. Kilden «(EO-U34 punkt
n)» står for setninger som er uendret; henvisningene inne i setningene står som i versjon 1, unntatt
der E-punktet sier noe annet.

### A. Utstedelse og fullmakt

1. Byggherren utsteder en endringsordre etter punkt 31.3 i en EO-sak, og bare byggherren
   oppretter en EO-sak. Er byggherrens godkjenning av grunnlaget en endringsordre etter
   punkt 32.3 første ledd a, er den svaret i grunnlagssporet i KOE-saken. (EO-U34 punkt 1)
2. En endringsordre i en EO-sak går gjennom godkjenningen etter fullmakten. (EO-U34 punkt 2)
3. Ingen sender en endringsordre alene. Endringsordren har alltid to signaturer: den som
   utarbeidet den, og den som godkjente den med fullmakt, også når beløpet ikke kan
   verdsettes. (EO-U34 punkt 3)
4. For et svar i KOE-saken står reglene om fullmakt for svar. (EO-U34 punkt 4)

### B. Hva endringsordren omfatter og lukker

5. Byggherren kan la en endringsordre omfatte én eller flere hele KOE-saker, også når
   løsningen ikke har registrert enighet. (EO-U34 punkt 5)
6. En KOE-sak formaliseres ved å inngå i en EO-sak. (EO-U34 punkt 6)
7. En KOE-sak inngår i høyst én endringsordre, også når et utsagn i den er bestridt.
   KOE-tilknytningen endres bare før utstedelse. (EO-U34 punkt 7)
8. En sak som er lukket, fordi den inngår i en sendt endringsordre eller fordi
   totalentreprenøren har godtatt avslaget på forholdet eller trukket det, kan ikke tas med.
   (EO-U34 punkt 8)
9. Bare en endringsordre byggherren sender uttrykkelig som endringsordre i en EO-sak, eller
   en godkjent registrering av en endringsordre i en EO-sak, lukker KOE-sakene den omfatter,
   også når uenigheten består. (EO-U34 punkt 9)
10. Godkjenning av grunnlaget alene lukker ikke KOE-saken, selv om godkjenningen er en
    endringsordre etter punkt 32.3 første ledd a. Vederlag og frist kan behandles videre i
    samme sak. Brevet sier fortsatt at godkjenningen er en endringsordre (GR-U14). (EO-U34
    punkt 10)
11. Lukkingen ved totalentreprenørens aksept av avslaget på grunnlaget eller trekk av
    grunnlaget følger GR-U27. (EO-U34 punkt 11)
12. I en KOE-sak som en sendt endringsordre eller en godkjent registrering omfatter,
    avviser løsningen krav, svar, aksept og trekk. (EO-U34 punkt 12) Innlegg, dokumentasjon og
    innsigelser etter punkt 5 tredje ledd godtas, og korrigeringen av datoen etter MM-U52 punkt
    24 og rettingen av varseldatoen etter punkt 68. (EO-U34 punkt 12; MM-U47 punkt 1 og 5;
    MM-U51, forholdet; 05.11 3.5 B, forholdet; E3; E8)
13. Fram til endringsordren i EO-saken kan byggherren sende et nytt svar på grunnlaget.
    (EO-U34 punkt 13)
14. For en godkjenning av grunnlaget sendt fra løsningen står sperren mot trekk av
    grunnlaget i KA-U13. (EO-U34 punkt 14)
15. Har byggherren ikke svart på grunnlaget, kan byggherren svare ved å utstede en
    endringsordre i en EO-sak som omfatter KOE-saken (punkt 32.3 første ledd a). (EO-U34
    punkt 15)
16. En KOE som følger opp oppgjøret etter en endringsordre, lukkes som andre KOE-saker, med
    en endringsordre i en EO-sak. (EO-U34 punkt 16)

### C. Innholdet: pålegg og utsagn

17. En endringsordre etter punkt 31.3 er byggherrens pålegg. Når den oppfyller punkt 31.3
    første ledd (GR-U13), binder pålegget totalentreprenøren fra endringsordren er mottatt
    (punkt 31.3 annet ledd), uten aksept, og pålegget er ikke et tilbud. (EO-U34 punkt 17)
18. En endringsordre formaliserer kravene og er byggherrens instruks og eventuelt
    erkjennelse av ansvar, innenfor det som følger av endringsordren og byggherrens tidligere
    utsagn i KOE-saken. (EO-U34 punkt 18)
19. Omfatter endringsordren en sak der forholdet ikke er besvart eller er avslått, sier
    endringsordren uttrykkelig at byggherren er enig i forholdet i saken, slik endringsordren
    beskriver og omfatter det. En sak om svikt eller et annet forhold som ikke er en
    endring, får den faste teksten i EO-U22. (EO-U34 punkt 19)
20. En endringsordre har én beskrivelse av endringen, også når den omfatter flere
    KOE-saker. Beskrivelsen er byggherrens pålegg og beskriver endringen fullt ut uten å vise
    til totalentreprenørens krav. Sakene står i brevet som referanser. (EO-U34 punkt 20)
21. Vederlag og frist i en endringsordre er byggherrens tilbud, eller en gjengivelse av en
    registrert enighet. (EO-U34 punkt 21)
22. Byggherren gir utsagn om vederlag og frist bare for krav totalentreprenøren har sendt,
    og ikke tilbud i et spor uten krav. En endringsordre som ikke omfatter noen KOE-sak,
    står alene med vederlag og frist. (EO-U34 punkt 22)
23. Et utsagn gjelder ett spor eller én post i én sak eller i en gruppe saker, og svarer på
    kravversjonene i sakene det gjelder. Byggherren kan gi ett utsagn for flere saker. Et
    samlet utsagn har én oppgjørsform, og vederlaget samles per post. (EO-U34 punkt 23)
24. Et overslag ved regningsarbeid er en opplysning, ikke et tilbud, og det kan ikke
    godtas. (EO-U34 punkt 24)
25. KOE-saker som inngår, gjengis med henvisning. Et utsagn kan avvike fra en registrert
    enighet. (EO-U34 punkt 25)
26. Ved flere KOE-saker summeres ikke dagene uten videre (punkt 33.5). (EO-U34 punkt 26)
27. Et utsagn om vederlag eller frist som er byggherrens tilbud, er et løfte. Svarer det
    ikke på en kravversjon i en KOE-sak, binder det byggherren som et tilbud (HF-U6). En
    gjengivelse av noe partene har avtalt, følger HF-U9. (EO-U34 punkt 27)
28. Fastsetter endringsordren regningsarbeid, sender totalentreprenøren overslag, varsel om
    at overslaget vil bli overskredet, og regningsoppgaver som innlegg i EO-saken.
    Byggherrens merknader sendes samme vei. Kostnader over overslaget for samme arbeid er
    avregning etter oppgjørsformen. Nytt arbeid eller annen kompensasjon er et krav i en ny
    KOE. (EO-U34 punkt 28)

### D. Totalentreprenørens svar og uenighet

29. Totalentreprenøren mottar endringsordren. Totalentreprenøren kan godta et utsagn i
    EO-saken, og aksepten gjelder hele utsagnet, slik det står: tilbudet om vederlag,
    oppgjørsform eller frist. (EO-U34 punkt 29)
30. Et samlet utsagn kan bare godtas eller bestrides samlet. (EO-U34 punkt 30)
31. Totalentreprenøren kan godta et utsagn også når det svarer på en tidligere
    kravversjon. (EO-U34 punkt 31)
32. Godtar totalentreprenøren et utsagn om regningsarbeid, gjør det ikke overslaget til et
    fast beløp. (EO-U34 punkt 32)
33. Det finnes ingen aksept av endringsordren som helhet, og svaret er frivillig. Fravær av
    protest er ikke enighet. (EO-U34 punkt 33)
34. Totalentreprenørens aksept eller bestridelse av et utsagn endrer ikke at KOE-saken er
    lukket. (EO-U34 punkt 34)
35. Er totalentreprenøren uenig, eller er et krav ikke besvart, sender totalentreprenøren en
    ny KOE fra den lukkede saken, eller en ny KOE når endringsordren ikke omfatter noen
    KOE-sak. Den viser til endringsordren og oppgir om den bestrider et utsagn, gjelder et
    krav endringsordren ikke svarte på, eller gjelder noe nytt. (EO-U34 punkt 35)
36. Kravet i den nye KOE-en er det samlede kravet for det utsagnet gjelder. Forholdet i den
    nye KOE-en er ‹endringsordre›, og løsningen utvider ikke byggherrens tidligere
    erkjennelse. (EO-U34 punkt 36)
37. Når et utsagn er bestridt, behandles resten av oppgjøret i den nye KOE-en, og utsagnet
    kan verken godtas eller rettes i løsningen. (EO-U34 punkt 37)
38. Et utsagn kan bare bestrides av én KOE om gangen som ikke er lukket eller trukket.
    Sperren oppheves bare hvis den nye KOE-en trekkes før den er gjort opp i en ny
    endringsordre. (EO-U34 punkt 38)
39. En endringsordre sendt fra løsningen som omfatter en KOE som bestrider et utsagn, har et
    utsagn som erstatter det. Tillegget kan være 0. (EO-U34 punkt 39)
40. Et utsagn som gjør opp et bestridt utsagn, erstatter det, og har flere utsagn vært
    bestridt samlet, erstatter det alle. En reduksjon endrer ikke en tidligere registrert
    enighet, men vises som avvik. Bare det siste utsagnet i kjeden kan godtas eller
    bestrides, og de tidligere forblir sperret, også når den nye KOE-en er lukket. (EO-U34
    punkt 40)

### E. Ingen revisjon

41. Endringsordren utstedes én gang og revideres ikke. At EO-U9 er opphevet, åpner ikke for
    revisjon. (EO-U34 punkt 41)
42. En feil til ulempe for totalentreprenøren rettes ved at totalentreprenøren bestrider
    utsagnet eller krever i en ny KOE, og byggherren svarer med et utsagn som erstatter det.
    En feil til ulempe for byggherren tar byggherren opp i et innlegg i EO-saken. (EO-U34
    punkt 42)

### F. Endringsordre sendt utenfor løsningen

43. Byggherren kan registrere en endringsordre sendt utenfor løsningen på to måter: som svar
    på forholdet etter OV-U6, eller som endringsordre i en EO-sak. (EO-U34 punkt 43)
44. Registreres den som svar på forholdet etter OV-U6, står saken åpen, og vederlag og frist
    behandles videre i saken. (EO-U34 punkt 44)
45. Registreringen som svar forutsetter en underkategori der punkt 32.2 gjelder. Byggherren
    velger «godkjent», påberoper ikke preklusjon og oppgir at brevet er en endringsordre
    etter punkt 31.3. Registreringen er byggherrens godkjenning av grunnlaget og går gjennom
    fullmakten som en godkjenning av grunnlaget etter GFK-06. (EO-U34 punkt 45)
46. Registreringen som svar godtas der et svar fra løsningen ville vært godtatt, også som et
    nytt svar etter samlevedtaket for revisjon av byggherrens svar. (EO-U34 punkt 46; HF-U25 E2;
    E1) Ved sammenfall gjelder GR-U10. (EO-U34 punkt 46) Løsningens vurdering ved
    registreringen fryses som etter MM-U50 punkt 19. (EO-U34 punkt 46; E8)
47. Pris og tid i en endringsordre registrert som svar vurderes ikke og gir ingen sperre;
    vederlag og frist kreves og besvares i KOE-saken. (EO-U34 punkt 47)
48. Endringsordren i en registrering som svar sperrer ikke trekket av grunnlaget etter
    KA-U13 eller KA-U22, fordi et trekk ikke opphever den. Brev og visning sier ikke at den
    er bortfalt. (EO-U34 punkt 48)
49. Byggherren kan senere velge at korrespondanse som er lagt til, er en endringsordre
    registrert som svar etter OV-U6. (EO-U34 punkt 49)
50. En endringsordre registrert som svar etter OV-U6 rettes ikke, og endringsordren i brevet
    står uendret. Byggherren tar en feil i registreringen opp i et innlegg i KOE-saken, og
    brevet er byggherrens meddelelse. Byggherren kan likevel gi et nytt svar på grunnlaget i
    KOE-saken, som et nytt utsagn, fram til en endringsordre i en EO-sak omfatter saken.
    Løsningen avgjør ikke om det nye svaret er virksomt mot endringsordren i brevet (MM-U50
    punkt 8). Godtar totalentreprenøren uttrykkelig et senere avslag på grunnlaget, eller
    trekker totalentreprenøren grunnlaget, lukkes saken etter GR-U27. Brev og visning sier
    ikke at endringsordren i brevet er bortfalt (OV-U6; KA-U14). (EO-U35; E5; E8)
51. Registreres den som endringsordre i en EO-sak, registreres brevet som vedlegg, med
    datoen det ble sendt og dokumentkoden i brevet. Der skjemaet og brevet spriker, er
    brevet byggherrens meddelelse. (EO-U34 punkt 51)
52. Registreringen går gjennom godkjenningen etter fullmakten og lukker sakene den omfatter
    når den er godkjent. Den har datoen brevet ble sendt. (EO-U34 punkt 52)
53. En registrert endringsordre gjelder de sakene som er åpne når den siste godkjenningen
    gjøres. Poster som gjelder en lukket sak, registreres ikke. (EO-U34 punkt 53)
54. En registrert endringsordre gjengir det brevet sier, også utsagn om vederlag og frist for
    krav totalentreprenøren ikke har sendt. Regelen om at byggherren bare svarer på krav som
    er sendt, gjelder det som sendes fra løsningen. (EO-U34 punkt 54)
55. Totalentreprenøren kan godta et utsagn i en registrert endringsordre, en ny KOE kan
    bestride det, og det kan inngå i en kjede etter EO-U29, som for en endringsordre sendt fra
    løsningen. (EO-U34 punkt 55)
56. Sier brevet ikke noe om et bestridt utsagn, står det som bestridt og kan ikke godtas.
    (EO-U34 punkt 56) KOE-saken som bestrider det, står åpen (punkt 57). (EO-U37; E6)
57. En registrert endringsordre lukker ikke en KOE-sak som bestrider et utsagn, når brevet
    ikke har et utsagn som erstatter det bestridte. Den KOE-saken står åpen til en
    endringsordre med et utsagn som erstatter det bestridte, omfatter den, eller til
    totalentreprenøren trekker den. (EO-U37; E6)
58. Stemmer en registrert endringsordre ikke med brevet, tar byggherren feilen opp i et
    innlegg i EO-saken, og brevet er byggherrens meddelelse. (EO-U34 punkt 58)

### G. Hva løsningen ikke avgjør

59. Løsningen avgjør ikke om endringsordren endrer det som er avtalt (MM-U50 punkt 6).
    (EO-U34 punkt 59; E8)
60. Endringsordren er ikke nødvendigvis en erkjennelse av alt totalentreprenøren har
    påberopt, og hvor langt den rekker, er opp til partene å tolke. For en sak om svikt
    avgjør ikke løsningen om bindingen etter punkt 31.3 gjelder. (EO-U34 punkt 60)
61. Avviker beskrivelsen fra pålegget i kravet eller fra svaret på forholdet, avgjør ikke
    løsningen hva som gjelder. (EO-U34 punkt 61)
62. Løsningen avgjør ikke hvilken av flere registrerte enigheter om samme oppgjør som
    gjelder, også når utsagnet avviker fra en enighet fra KOE-saken. (EO-U34 punkt 62)
63. Løsningen avgjør ikke om byggherren fortsatt er bundet av et bestridt utsagn (MM-U50
    punkt 8), eller om byggherren er bundet av et utsagn som svarer på en kravversjon (MM-U50
    punkt 8). (EO-U34 punkt 63; E8)
64. Løsningen avgjør ikke om et nytt svar på grunnlaget fram til endringsordren er virksomt
    (MM-U50 punkt 8), heller ikke mot en endringsordre registrert som svar etter OV-U6.
    (EO-U34 punkt 64; E8)
65. Løsningen avgjør ikke virkningen av en feil i en endringsordre eller en registrering,
    eller hva en aksept av en post som ikke stemmer med brevet, betyr. (EO-U34 punkt 65)
66. Løsningen utleder ingen rettsvirkning av at en endringsordre omfatter en sak. Merket sier
    ikke at noe er rettslig avgjort, at totalentreprenøren har godtatt endringsordren eller
    at kravene er oppgjort. (EO-U34 punkt 66)
67. Summer og nøkkeltall er beregninger og avgjør ikke hva partene har avtalt. (EO-U34
    punkt 67)

### H. Retting i en lukket sak

68. I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt endringsordre eller en
    godkjent registrering av en endringsordre omfatter, godtas totalentreprenørens retting av
    varseldatoen, og den endrer ikke utfallet. Den står som totalentreprenørens utsagn for
    partene å vurdere. Byggherren kan ikke godta en retting til totalentreprenørens fordel i
    løsningen (GR-U27; punkt 12), og en retting i byggherrens favør er bare premiss for nye
    svar, som avvises (MM-U52 punkt 6). Byggherren kan ta stilling til rettingen i et innlegg,
    og saken står lukket. Løsningen avgjør ikke hva rettingen betyr mellom partene (MM-U50
    punkt 6). (05.11 3.5 B; E4) Punktet gjelder også datoen for et krav sendt utenfor
    løsningen (MM-U52 punkt 18). (05.11 3, innledningen: «Ved 2 A gjelder punktene også datoen
    for kravet.»; E4)

### Designdel

Hjemmet er brukerforløpet [BF-06](../domenetabell/brukerforlop/BF-06.md). Visningen viser
merket ‹Inngår i EO-<nummer>› på KOE-saken, i sakslisten og på siden for saken, i stedet for
«Avsluttet med EO» (EO-U13; EO-U34 E10). Merket viser dokumentkoden byggherrens endringsordre
fikk etter LV-U24, og saksnummeret etter DL-U6 står uendret (EO-U14). (EO-U34, designdelen; E8)
For en registrert endringsordre viser merket koden etter EO-U14. (EO-U36; E7) Skjemaet opplyser
byggherren om hvilke spor i hvilke saker som ikke har registrert enighet (MM-U34 punkt 20),
viser avvik fra en registrert enighet (EO-U19) og har påminnelsene i MM-U34 punkt 1, 16 og 26.
Svarskjemaet spør når endringsordren sendes ved godkjenning av forholdet der punkt 32.2 gjelder
(EO-U15). Ved registrering som svar gjør skjemaet det tydelig at godkjenningen er byggherrens
valgte standpunkt, atskilt fra dokumentets øvrige innhold, og visningen viser at byggherren
opplyser at brevet er en endringsordre (OV-U6). Registreringen i en EO-sak bruker samme skjema
som en endringsordre sendt fra løsningen, og den viser at brevet også omfatter en sak som var
lukket (EO-U16). (EO-U34, designdelen) Skjemaet spør ikke om vilkår eller forbehold, heller ikke
ved registrering (EO-U18). (EO-U34, designdelen) Vilkår og forbehold byggherren knytter til
svaret, skrives i svaret: i begrunnelsen for punktet de gjelder, eller under «Forbehold» når de
gjelder hele svaret. (KA-U50; E2) Totalentreprenøren skriver dem i begrunnelsen eller i et
innlegg. (EO-U18; KA-U50: «Hva som gjelder for totalentreprenørens vilkår og forbehold, endres
ikke.»; E2) Kontrollen før registreringen viser kravversjoner som er sendt etter datoen på
brevet (EO-U16). Løsningen viser alle registrerte enigheter om samme oppgjør, også en fra
KOE-saken som utsagnet avviker fra (EO-U24). Stopper sendingen fordi saken alt er med i en sendt
endringsordre, sier den hvilken (EO-U20). Den nye KOE-en viser ikke varslene fra den lukkede
saken, og totalentreprenøren viser til dem i fritekst (EO-U11). (EO-U34, designdelen) I en lukket
sak vises en retting til totalentreprenørens fordel som et tilbud som ikke kan godtas. (05.11 3.5
B, forholdet; E4)

### Beslutningsdel

**Fullmakt og verdi.** Verdien regnes per utsagn og summeres for hele utsendingen. Et utsagn
som gjelder flere saker samlet, verdsettes én gang, og verdien dekker kravene i sakene det
gjelder. Der endringsordren ikke svarer på et krav som er sendt, gjelder kravet. Et krav som
er sendt, men ikke er tallfestet, og et utsagn uten samlet beløp, krever hele kjeden. Et krav
som ikke er sendt, krever hele kjeden bare når endringsordren sendes samtidig med svaret på
forholdet, eller selv er svaret på forholdet. Et trukket krav er 0. Et utsagn som erstatter
et bestridt utsagn, verdsettes med det samlede beløpet i tilbudet. Beløpsgrensene er
kontraktens, og kjeden følger vedtakene om godkjenning. Sendes svaret på forholdet og
endringsordren samtidig, godkjennes de samlet, og avvises godkjenningen, sendes ingen av dem.
Den siste godkjenningen sender. (EO-U17; EO-U25; EO-U15) (EO-U34, beslutningsdelen)

**Når saken inngår.** En KOE-sak inngår i en endringsordre fra den er sendt, eller fra
registreringen er godkjent; et utkast eller en registrering som venter på godkjenning,
holder ikke av saken. Er saken alt med i en sendt endringsordre når byggherren sender,
stopper sendingen (EO-U20; EO-U34 E7). Er ingen av sakene i en registrering åpne, stopper
registreringen; ellers gjelder punkt 53 (EO-U31). Endres noe i en av sakene etter
framlegging, avvises den siste godkjenningen, og godkjenningen begynner på nytt bare når et
utsagn eller verdien endres; innlegg og dokumentasjon stopper ikke sendingen (EO-U25;
EO-U31). (EO-U34, beslutningsdelen; E8)

**Sperrene i løsningen.** Sperren i punkt 12 leser at endringsordren er sendt og omfatter
saken, ikke merket (MM-U34 punkt 19; EO-U13). Sperren i punkt 14 er en begrensning i
løsningen etter KA-U14, fordi løsningen ellers ville lest endringsordren som bortfalt
(EO-U12). At et bestridt utsagn ikke kan godtas eller rettes (punkt 37), er en begrensning i
løsningen, og løsningen sier ikke at utsagnet er avslått eller har falt bort (EO-U24).
Kontrollen ved sendingen sikrer at et utsagn har høyst én direkte etterfølger (EO-U24;
EO-U29). Endringsordren kan ikke rettes i løsningen, heller ikke en retting i motpartens
favør (EO-U24; MM-U52 punkt 4 og 16). En registrert endringsordre kan ikke rettes i
løsningen, heller ikke når registreringen ikke stemmer med brevet (EO-U33). (EO-U34,
beslutningsdelen; E8)

**Sum og kode.** Summen av vederlag i sendte endringsordrer teller en registrert
endringsordre (EO-U27) og tilleggene etter EO-U29; nøkkeltallet for et bestridende krav
følger EO-U28. Summen viser det som ble sendt fra løsningen, og for en registrert
endringsordre det som ble registrert (EO-U24; EO-U33; EO-U34 E8). I EO-U24 står setningen om
summen i designdelen; her står den i beslutningsdelen. For en registrert endringsordre lages
ingen brevtekst (EO-U16). (EO-U34, beslutningsdelen; E8) EO-saken for en registrert
endringsordre får koden etter LV-U44 når registreringen er godkjent, som et unntak fra LV-U47.
Brevets eget nummer lagres som brevets referanse og vises ved siden av koden. (EO-U36; E7)

### Forkastet

**Punkt 68 (05.11 3.5 A),** ordrett fra spørsmål 3.5 i versjon 5 i #1309
([6656940092](https://github.com/khjohns/endringsmeldinger/issues/1309#issuecomment-6656940092)).
Teksten står uten «Forhold»-delen, som står ordrett i versjon 5 og tas med når posten føres.

- **A.** «I en sak som er lukket etter GR-U27, og i en KOE-sak som en sendt endringsordre eller en
  godkjent registrering av en endringsordre omfatter, avvises totalentreprenørens retting av
  varseldatoen. Totalentreprenøren kan si at datoen er feil i et innlegg (GR-U27; EO-U34 punkt
  12).»

Forkastet tidligere og ført videre fra posten som oppheves: EO-U34 (ett alternativ), ordrett som
det står i registeret. Det forkastede i EO-U35, EO-U36 og EO-U37 står i postene, som samles.

## Endret innhold

Gammel tekst er ordrett fra vedtaksfila på `9645794`. E1–E7 viser hvor gjeldende vedtak eller
svarene 05.11 alt har endret EO-U34; ingen av dem gir en ny regel i dette samlevedtaket. E8 og E9
er føring og henvisninger. E1–E13 i EO-U34 står i posten EO-U34 og gjelder versjon 1.

**E1 Et nytt svar som registrering (punkt 46).** Gammel tekst: EO-U34 punkt 46 «også som
revisjon av et svar som ikke er godtatt (GR-U7)». Ny tekst: «også som et nytt svar etter
samlevedtaket for revisjon av byggherrens svar». Kilde: HF-U25 E2: «og i EO-U34 punkt 46 blir
uttrykket «også som et nytt svar etter samlevedtaket for revisjon av byggherrens svar»», og raden
HF-U25: «I EO-U34 punkt 46 endres uttrykket slik E2 sier.» Parentesen «(GR-U7)» faller bort med
uttrykket. Setningene om endringsordren i punkt 7 og 8 i HF-U25 tas ikke inn på nytt; de gjengir
punkt 12, 13, 50 og 64 her.

**E2 Vilkår og forbehold (designdelen).** Gammel tekst: EO-U34, designdelen: «Skjemaet spør ikke om
vilkår eller forbehold, heller ikke ved registrering; parten skriver dem i begrunnelsen eller i et
innlegg (EO-U18).» Ny tekst: tre setninger i designdelen: første ledd uendret; byggherrens vilkår
og forbehold etter KA-U50; totalentreprenørens etter EO-U18. Kilde: KA-U50: «Vilkår og forbehold
byggherren knytter til svaret, skrives i svaret: i begrunnelsen for punktet de gjelder, eller under
«Forbehold» når de gjelder hele svaret.» og «Hva som gjelder for totalentreprenørens vilkår og
forbehold, endres ikke.»; følgen i KA-U50: «Forholdet til EO-U34 gjelder setningen i designdelen om
at parten skriver vilkår og forbehold «i begrunnelsen eller i et innlegg (EO-U18)».» Setningen
om byggherren er KA-U50 ordrett. Setningen om totalentreprenøren er vår omskriving av «parten …
i begrunnelsen eller i et innlegg», avgrenset av KA-U50.

**E3 Korrigeringen i en lukket sak (punkt 12).** Gammel tekst: EO-U34 punkt 12 «Innlegg,
dokumentasjon og innsigelser etter punkt 5 tredje ledd godtas.» Ny tekst: «…, og korrigeringen av
datoen etter MM-U52 punkt 24 og rettingen av varseldatoen etter punkt 68.» Kilde: forholdet i
MM-U51: «utvider det som godtas etter GR-U27 og EO-U34 punkt 12»; forholdet i 05.11 3.5 B (E4).
Innholdet i MM-U51 står i MM-U52 punkt 24 (MM-U52 svar 2 A), og punkt 12 viser dit. Punkt 24 får
ikke et nytt hjem, og MM-U52 endres ikke (spørsmål 2). Punkt 12 er ikke en egen hjemmel for
korrigeringen: den godtas så langt MM-U52 punkt 10 og 24 tillater den.

**E4 Rettingen av varseldatoen i en lukket sak (punkt 68, punkt 12 og designdelen).** Gammel
tekst: GR-U27 «Innlegg og dokumentasjon kan fortsatt legges til.»; EO-U34 punkt 12 «I en KOE-sak
som en sendt endringsordre eller en godkjent registrering omfatter, avviser løsningen krav, svar,
aksept og trekk.» og «Innlegg, dokumentasjon og innsigelser etter punkt 5 tredje ledd godtas.» Ny
tekst: punkt 68, tillegget i punkt 12 og siste setning i designdelen. Kilde: svaret 05.11 «3 ja»
([6657601681](https://github.com/khjohns/endringsmeldinger/issues/1309#issuecomment-6657601681)),
3.5 B, og forholdet der: «utvider det som godtas etter GR-U27 og EO-U34 punkt 12 til
totalentreprenørens retting av varseldatoen. […] En retting til totalentreprenørens fordel vises som
et tilbud som ikke kan godtas.»; MM-U52 svar 3 C (føres her). GR-U27 er presisert av EO-U35 og
utvidet av MM-U51; dette blir den tredje endringen, og verktøyet varsler for GR-U27 (svar 6 A).
Redaksjonelt, ikke nytt innhold: prefikset «*Ved spørsmål 3 A eller B.*» er strøket; «(GR-U27;
EO-U34 punkt 12)» står som «(GR-U27; punkt 12)»; «(punkt 6)» står som «(MM-U52 punkt 6)», fordi
punkt 6 i 3.5 B er punkt 6 i samlevedtaket for retting av sendt brev; siste setning i punkt 68
tar med omfanget for kravdatoen fra innledningen til spørsmål 3, som MM-U52 punkt 8 og 18 tok med
for punkt 19 og 21–23.

**E5 En endringsordre registrert som svar (punkt 50).** Gammel tekst: EO-U34 punkt 50 «*Etter
svaret på spørsmål 2 (E14), forslag A:*» og kildene «(EO-U12; MM-U34 punkt 11; EO-U33 og EO-U24
tilsvarende; GR-U27; KA-U14; OV-U6)». Ny tekst: punkt 50, EO-U35 ordrett, med henvisningen etter
E8. Kilde: EO-U35, svar 2 A 04.11 ([6626551632](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6626551632)).
Den siste setningen følger EO-U35: «… er bortfalt (OV-U6; KA-U14).» Ikke nytt innhold.

**E6 En KOE som bestrider et utsagn i en registrert endringsordre (punkt 56 og 57).** Gammel tekst:
EO-U34 punkt 56 «Ved forslag A i spørsmål 4 står KOE-saken som bestrider det, åpen (punkt 57); ved
forslag B kan totalentreprenøren bestride det på nytt i en ny KOE. (EO-U32; spørsmål 4)» og punkt 57
«*Etter svaret på spørsmål 4 (E16), forslag A:*». Ny tekst: siste setning i punkt 56 og punkt 57,
EO-U37 ordrett. Kilde: EO-U37, svar 4 A 04.11 (6626551632), med forholdet «Endrer EO-U32». Ikke nytt
innhold.

**E7 Koden for en registrert endringsordre (beslutningsdelen og designdelen).** Gammel tekst:
beslutningsdelen «*Etter svaret på spørsmål 3 (E15), forslag B:* EO-saken for en registrert
endringsordre får koden etter LV-U44 når registreringen er godkjent, og brevets eget nummer vises
ved siden av koden (EO-U16).» og «For en registrert endringsordre lages ingen brevtekst, og brevets
eget nummer lagres som referanse (EO-U16).»; designdelen «For en registrert endringsordre viser
merket koden etter EO-U14 ved spørsmål 3 B, og brevets referanse ved A (E15).» Ny tekst: EO-U36
ordrett, de to første setningene i beslutningsdelen og den tredje i designdelen. Kilde: EO-U36, svar
3 B 04.11 (6626551632). Teksten i EO-U34 manglet «som et unntak fra LV-U47» og «Merket på
KOE-sakene viser koden etter EO-U14.». Redaksjonelt: «og brevets eget nummer lagres som referanse»
er strøket fra setningen om brevteksten, fordi EO-U36 sier det samme. Ikke nytt innhold.

**E8 Henvisningene til opphevede poster og til E-lista i versjon 1.** Ikke nytt innhold.

- «(MM-U12)» i punkt 50, 63 (to steder) og 64 står som «(MM-U50 punkt 8)», fordi setningene gjelder
  om byggherren er bundet eller om et svar er virksomt. I punkt 59 står den som «(MM-U50 punkt 6)»,
  fordi setningen gjelder det som er avtalt. Kilde: MM-U50 opphevet MM-U12, og henvisningene gjelder
  samlevedtaket (OV-U92 (a)); MM-U50 punkt 8: «løsningen avgjør ikke om en part er bundet av et
  utsagn eller kan komme løs fra det»; punkt 6: «Løsningen avgjør ikke det kontrakten overlater til
  partene, en oppmann eller domstolene.» Samme fordeling som E6 i MM-U52.
- «som etter MM-U17» i punkt 46 står som «som etter MM-U50 punkt 19». Kilde: MM-U50 opphevet MM-U17;
  punkt 19 der har kilden «MM-U17 s1 og Følge».
- «(EO-U24; MM-U21 snevret inn av EO-U24)» i beslutningsdelen står som «(EO-U24; MM-U52 punkt 4 og
  16)». Kilde: MM-U52 opphevet MM-U21, og henvisningene gjelder samlevedtaket (MM-U52 svar 2 A);
  punkt 4 der er regelen fra MM-U21, og punkt 16 sier at endringsordren ikke rettes i løsningen.
- Kilden for innsigelsene i punkt 12 er MM-U47 punkt 1 og 5, ikke MM-U34 punkt 19 alene. MM-U35
  endret MM-U34 punkt 19 slik at innsigelsen sendes som innlegg (raden MM-U35: «Endringen i MM-U34
  gjelder punkt 19»), og MM-U35 er samlet i MM-U47. Ordlyden i punkt 12 står.
- «E7», «E8» og «E10» i designdelen og beslutningsdelen står som «EO-U34 E7», «EO-U34 E8» og «EO-U34
  E10», så de ikke leses som E-punktene her. Kildene for uendrede punkt er «(EO-U34 punkt n)», som
  MM-U52 gjorde med MM-U41.

**E9 Forholdene etter OV-U93 (c), og forholdene i postene som samles.** OV-U92 sier: «hvert av dem
sier i «Endret innhold» om (a) eller (b) gjelder». OV-U93: «Et forhold fjernes etter (b) bare når
punktet sier med ord at forholdet eller setningen ikke gjelder eller ikke har noe å virke på.»
(a) gjelder ikke for noen av de seks: (a) opphever posten som har forholdet, og versjon 2 tar ikke
opp innholdet i KA-U12, OV-U3, OV-U55, GFK-U2 eller HF-U12. Versjon 2 sier derfor med ordene i (b):

- **ka-u12 presiserer eo-u5:** forholdet har ikke noe å virke på. EO-U5 er opphevet av MM-U34
  punkt 20, og setningen «som oppgjort i EO-U5» i KA-U12 gjelder ikke (EO-U34 E12; punkt 15 her).
- **ov-u3 bygger på eo-u2** og **ov-u3 bygger på eo-u5:** forholdene har ikke noe å virke på. EO-U2
  og EO-U5 er opphevet av MM-U34 punkt 20, og merknaden i OV-U3 om EO-U2 og EO-U5 gjelder ikke;
  enighet er ikke vilkår for at en sak inngår (punkt 5; EO-U34 E12).
- **ov-u55 snevrer inn eo-u5:** forholdet har ikke noe å virke på. EO-U5 er opphevet, og sperren i
  OV-U55 gjelder ikke, fordi MM-U34 punkt 18 opphevet forslaget sperren gjaldt (EO-U34 E12).
- **gfk-u2 presiserer eo-u6:** forholdet har ikke noe å virke på. EO-U6 er opphevet av MM-U34 punkt
  22, og GFK-U2 nevner endringsordren bare i de forkastede alternativene (EO-U34 E11).
- **hf-u12 presiserer eo-u9:** forholdet har ikke noe å virke på. EO-U9 er opphevet av MM-U34 punkt
  22, og endringsordren revideres ikke (punkt 41).

For forholdene i EO-U35, EO-U36 og EO-U37, som samles: de står i postene, som MM-U52 svar 2 A sa for
MM-U51 og LV-U54. Forholdet «snevrer inn MM-U21» i EO-U35 har ikke noe å virke på: MM-U21 er
opphevet av MM-U52, og innsnevringen står i MM-U52 punkt 16 og punkt 50 her. Forholdene til EO-U16
i EO-U36 og EO-U37 står; EO-U16 er opphevet av EO-U34, og innholdet står i punkt 43–58 her.

Dette er føring etter OV-U92 og OV-U93, ikke en ny regel. Hver linje viser til setningen som alt
sier at målet er opphevet eller ikke gjelder.

## Klassene

Etter testen i vedtaksskillen (forslag, før den uavhengige kontrollen):

- Punkt 1–68 er *vedtak*: de sier hvilken virkning endringsordren, registreringen og rettingen har,
  hva som godtas og avvises i en lukket sak, og hva løsningen ikke avgjør. Punkt 50 og 57 er EO-U35
  og EO-U37, som er *vedtak*.
- Designdelen er *design*: merket, skjemaet og visningen, også setningen om vilkår og forbehold
  (E2) og at en retting i en lukket sak vises som et tilbud som ikke kan godtas.
- Beslutningsdelen er *beslutning*: fullmakt og verdi, når saken inngår, sperrene, sum og kode.
  Koden etter EO-U36 er *beslutning*, som posten.

**Kontrollen** (subagent, 05.11): testen i vedtaksskillen, trinn 1–3, er brukt før avsnittet over
ble lest, og klassene i registeret er slått opp i `vedtak.toml` (EO-U33 og EO-U36 *beslutning*,
EO-U35 og EO-U37 *vedtak*, LV-U47 *beslutning*).

- Samlevedtaket som helhet: samsvar. Punkt 1–68 har setninger om virkning og binding etter trinn 1,
  så posten er *vedtak* med designdel og beslutningsdel.
- Punkt 1–67: samsvar. Punkt 50 og 57 som *vedtak*: samsvar med registeret.
- Punkt 68: samsvar. Det sier hvilken virkning rettingen har og hva løsningen ikke avgjør (trinn 1).
- Designdelen: samsvar, også vilkår og forbehold (E2) og visningen av rettingen fra 05.11 3.5 B.
- Beslutningsdelen: samsvar for fullmakt og verdi, når saken inngår, sperrene og summen.
- EO-U36 i «Sum og kode»: avvik for én setningsdel. «og vises ved siden av koden» er visning
  (trinn 3) og hører til designdelen. At koden gis og brevets nummer lagres, er *beslutning*.
- Merknader, ikke avvik: første setning i punkt 51 (registreres som vedlegg med dato og
  dokumentkode) er lagring og står i vedtaket fordi datoen har virkning (punkt 52). Første setning i
  punkt 50 («rettes ikke») har samme art som EO-U33-setningen i beslutningsdelen, men står i
  vedtaket sammen med at endringsordren i brevet står uendret.

## Funn som ikke avgjøres her

Ingen av disse endrer innholdet i forslaget. De er ikke sagt av oppdragsgiver og tas ikke inn.

- **Byggherrens vilkår til et utsagn i endringsordren i en EO-sak.** KA-U50 gjelder svaret; ingen post
  sier om skjemaet for endringsordren har feltet «Forbehold», eller hvor et vilkår til et utsagn
  står. Kilde: kartleggingen av KA-U50, motsigelse 2.
- **Endringen etter punkt 34.1.3 i en lukket sak.** MM-U52 punkt 12 er ikke dekket av punkt 12 eller
  68 her, og ikke av noe vedtak. Kilde: kartleggingen av MM-U51, M3.
- **Brevteksten ‹Svaret erstatter byggherrens svar …› mot en registrert endringsordre.** Punkt 50 sier
  at brev og visning ikke sier at endringsordren er bortfalt; ingen post sier hvordan setningen lyder
  da. Kilde: kartleggingen av HF-U25, punkt 1.
- **Retting som nytt svar mot innlegg etter EO-U35.** Skillet mellom «feil i registreringen» (innlegg,
  punkt 50) og «retting av et standpunkt i svaret» (nytt svar, HF-U25 punkt 5) er ikke trukket. Kilde:
  kartleggingen av HF-U25, punkt 2.
- **Tre ordlyder for grensen for nytt svar.** Punkt 13 («Fram til endringsordren i EO-saken»), punkt
  50 («fram til en endringsordre i en EO-sak omfatter saken») og HF-U25 punkt 7. Samme grense etter
  punkt 9 og 12. Kilde: kartleggingen av HF-U25, punkt 3.
- **Sperren i punkt 14 etter et nytt svar.** Ingen post sier om sperren mot trekk står når byggherren
  har erstattet en godkjenning som er en endringsordre etter punkt 32.3 første ledd a, med et avslag.
  Kilde: kartleggingen av HF-U25, punkt 4.
- **Innsigelse mot innlegg i en sak lukket etter GR-U27.** I en sak lukket ved trekk sier ingen post at
  byggherren kan sende innsigelse; byggherren kan svare på rettingen i punkt 68 bare i et innlegg.
  MM-U47 punkt 10 dekker saken der totalentreprenøren har godtatt avslaget. Kilde: kartleggingen av
  punkt 25, avsnitt 4 og 5.
- **«Godkjent registrering» i punkt 12 og 68.** Vår lesing: det er en registrering i en EO-sak
  (punkt 9 og 51–52). En registrering som svar lar saken stå åpen (punkt 44 og 50), og punkt 68 gjelder
  den først når saken er lukket etter GR-U27. Ordlyden står som i 3.5 B og MM-U51. Ikke et eget
  spørsmål, fordi lesingen følger av punkt 9, 44 og 50.
- **«MM-U34 punkt 1, 16 og 26» i designdelen.** Punkt 26 i MM-U34 stryker setninger i svarskjemaet og
  er ikke en påminnelse. Kilde: kartleggingen av HF-U25, punkt 5. Hjem: BF-06.

## Spørsmålene til oppdragsgiver

Spørsmål 1 er en tilslutning til innhold du alt har vedtatt, og stilles i tekst. Spørsmål 2 gjelder
hvor en regel står, men stilles i samme liste fordi det avgjør teksten i punkt 12. Svar for eksempel
«1 A, 2 A».

**1. Tilslutning til samlevedtaket for endringsordren, versjon 2.**

*Bakgrunn:* Samlevedtaket for endringsordren har fått tre endringer etter at det ble vedtatt 04.11:
revisjonen av svaret endret punkt 46, vilkår og forbehold endret designdelen, og korrigeringen i en
lukket sak utvidet punkt 12. Svaret ditt 05.11 om retting av varseldatoen i en lukket sak (3.5 B) er
den fjerde, og du bestemte 05.11 (3 C) at den føres her. Svarene 04.11 om en endringsordre registrert
som svar, koden for en registrert endringsordre og en KOE som bestrider et utsagn, står som egne
poster, og teksten har dem bare som betingede punkter.

*Belegg:* forslaget over, punkt 1–68 med designdelen, beslutningsdelen og «Forkastet», og E1–E9.
Punkt 1–67 er versjon 1 med ordlyden slik senere vedtak alt har endret den (E1–E3, E5–E7). Punkt 68
er svaret ditt 05.11 ordrett, med henvisningene skrevet om (E4). E8 og E9 skriver om henvisninger og
forhold uten nytt innhold.

- **A (anbefalt):** «Samlevedtaket for endringsordren, versjon 2, gjelder med E1–E9. Det opphever
  samlevedtaket for endringsordren, og henvisningene til det gjelder versjon 2. Det samler svarene
  04.11 om en endringsordre registrert som svar, om koden for en registrert endringsordre og om en
  KOE som bestrider et utsagn, som gjelder som «Samlet i samlevedtaket for endringsordren». Det
  utvider det som kan legges til i en sak som er lukket ved at totalentreprenøren har godtatt
  avslaget på grunnlaget eller trukket det (punkt 68). Forholdene i versjon 1 føres videre slik
  «Postene i kjeden» sier, og forholdene etter E9 fjernes. Endringene fra revisjonen av svaret, fra
  vilkår og forbehold og fra korrigeringen i en lukket sak står i postene.»
- **B:** Samme som A, med rettelsene du gir per punkt eller E-punkt.

*Anbefaling:* A. Innholdet er det du alt har vedtatt; versjon 2 setter det inn i én tekst med kilde
for hver setning, og nummereringen står.

*Hva valget styrer:* hvilken tekst som er regelgrunnlaget for endringsordren i #1423 og for
rettingen i en lukket sak i #1309. I vedtaks-PR-en får henvisningene til EO-U34 i domenetabellen og
brukerforløpene (`regler.json`, `README.md`, BF-03, BF-06 og `dekning.md`) samlevedtaket ved siden
av, og `bindende_i` i de seks sitatene viser til versjon 2.

*Forholdet:* opphever EO-U34; samler EO-U35, EO-U36 og EO-U37; utvider GR-U27 (tredje endring, så
verktøyet varsler for GR-U27). Tellingen av endringer for endringsordren begynner på nytt (svar 10).

*Klassen:* vedtak med designdel og beslutningsdel.

**2. Hvordan punkt 12 tar med korrigeringen av datoen i en lukket sak.**

*Bakgrunn:* Korrigeringen av datoen totalentreprenøren oppga for når pålegget ble mottatt eller
forholdet ble kjent, godtas også i en KOE-sak som endringsordren omfatter (svaret 05.11 i #1308). Den
regelen står nå i punkt 24 i samlevedtaket for retting av sendt brev. Punkt 24 gjelder også en sak
som er lukket ved aksept av avslaget eller trekk, som ikke er endringsordrens tema.

*Belegg:* MM-U52 punkt 24; forholdet i MM-U51: «utvider det som godtas etter GR-U27 og EO-U34 punkt
12»; MM-U52 svar 2 A (MM-U51 er samlet der).

- **A (anbefalt):** «Punkt 12 viser til korrigeringen etter punkt 24 i samlevedtaket for retting av
  sendt brev, og regelen står der.»
- **B:** «Punkt 12 tar inn hele regelen om korrigeringen for en KOE-sak som endringsordren omfatter,
  og punkt 24 i samlevedtaket for retting av sendt brev gjelder bare en sak som er lukket ved aksept
  av avslaget eller trekk.»

*Anbefaling:* A. Regelen får ett hjem. B gir enten to hjem for samme regel, eller en endring av
samlevedtaket for retting av sendt brev som ingen har bedt om.

*Hva valget styrer:* teksten i punkt 12, og om samlevedtaket for retting av sendt brev endres.

*Forholdet:* ved A ingen nye; ved B endrer versjon 2 også MM-U52 punkt 24.

*Klassen:* føring (hvor regelen står); innholdet er vedtak.

## Svarene

Føres inn når oppdragsgiver har svart.

## Verifikasjon og grenser

Kontrollert mot `main` på `9645794`. Lest: radene EO-U34–EO-U37, GR-U27, MM-U35, MM-U47, MM-U51, MM-U52,
OV-U92 og OV-U93 i `docs/plans/vedtak.md`; avsnittet `samlevedtak-eo` med E1–E13; punkt 6, 8 og 19 i
MM-U50 og punkt 1–12 i MM-U47; tabellen over (c) i `vurdering-kjente-avvik-2026-11-05.md`; malen
`vurdering-samlevedtak-retting-av-sendt-brev-2026-11-05.md`. Grunnlaget er kartleggingene av HF-U25,
KA-U50, MM-U51, punkt 25, M3 og V1, og kjeden (05.11). Tellingen av henvisningene til EO-U34–EO-U37 er
et søk med ordgrense i `kjerne/`, `server/`, `src/`, `sprakprove/` og `docs/domenetabell/`. Eierne av
`bindende_i` er funnet etter linjenummer i `vedtak.toml` og ikke kontrollert enkeltvis. Artene for de
seks forholdene i E9 er tatt fra vurderingen av kjente avvik, ikke lest i `vedtak.toml`.
`vedtaksregister.py` er ikke kjørt; varselet er tatt fra kartleggingen av kjeden. Punkt 1–67 er
skrevet av fra EO-U34 slik den står i vedtaksfila; ingen difflib-kontroll er kjørt. NS 8407 er ikke
lest for denne fila; kartleggingen av punkt 25 fant ingen strid med punkt 5, 31.3, 32.2 eller 32.3.
