# Vurdering: temaene som gjenstår i steg 4

Dato: 17.11.2026. Kontrollert commit: `7eecd81` (grenen `claude/vedtaksregister-steg4-1534`).
Del av #1534, steg 4. Det er punkt 1 i forslaget i
[6944746880](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6944746880).
Oppdragsgiver svarte 17.11, ordrett: «Som foreslått (Anbefalt)».

Fila viser hvilke av de 41 temaene i [«Kjedene»](vurdering-klassifisering-2026-11-03.md#kjedene)
som fortsatt trenger et samlevedtak. Den foreslår også hvordan de deles på PR-er. Temaene er
nummerert i rekkefølgen i den tabellen. Fila avgjør ingen klasse og stiller ingen spørsmål.

## Grunnlaget

Tallene er laget med et skript over `vedtak.toml` og tabellen «Kjedene»:

- **Gjenstår:** postene i temaet som verken er samlet (forholdet `samler`) eller opphevet
  (`opphever`). Antallet står med klassene. «Rad uten anker» er en rad uten ID, som `rad-190`.
  Den kan få et anker når den samles (README, «En rad uten anker»).
- **Inne:** forholdene `presiserer`, `utvider`, `snevrer inn`, `endrer` og `bygger på` mellom
  postene som gjenstår i temaet.
- **Utenfra:** de samme forholdene fra andre gjeldende poster, også samlevedtak, til postene
  som gjenstår.

Kjeden finnes fortsatt når et tema har forhold inne. Regelen kan da ikke leses av én post.

## Ferdige temaer

19 temaer har et gjeldende samlevedtak: 4, 6, 8, 11, 12, 13, 15, 16, 17, 19, 20, 21, 22, 23,
31, 32, 33 og 40. Tema 22 har ingen poster igjen. Tema 34 er design. Det flyttes med forløpet
for brev registrert utenfor løsningen og får ikke samlevedtak.

## Tabellen

| Nr. | Tema | Gjenstår | Inne | Utenfra | Gruppe |
| --- | --- | --- | ---: | ---: | --- |
| 1 | Aksept og enighet om vederlag og frist | 14 (12 vedtak, 2 beslutning) | 10 | 61 | C |
| 2 | Byggherrens standpunkt: godkjent, delvis, avslått og nytt tilbud | 6 (6 vedtak) | 5 | 18 | C |
| 3 | Løsningens rolle og nye standpunkter fram til endringsordren | 3 (2 vedtak, 1 design) | 1 | 9 | D |
| 5 | Kravene er avgjort, og sperren etter det | 8 (6 vedtak, 2 design) | 8 | 34 | D |
| 7 | «Ingen krav», avkall og godtatt avslag | 14 (10 vedtak, 3 rad uten anker, 1 design) | 10 | 24 | C |
| 9 | Frafall etter § 32.3 c og byggherrens binding | 13 (8 vedtak, 3 rad uten anker, 2 beslutning) | 11 | 37 | D |
| 10 | Grunnlaget godkjent som endringsordre | 11 (9 vedtak, 1 design, 1 beslutning) | 2 | 23 | D |
| 14 | Revisjon av byggherrens svar | 5 (4 vedtak, 1 design) | 5 | 35 | C |
| 18 | Brev og varsel sendt eller registrert utenfor løsningen, og varseldatoen | 31 (21 vedtak, 7 design, 2 rad uten anker, 1 beslutning) | 19 | 76 | A |
| 24 | Eget varsel etter punkt 33.4 fra løsningen | 3 (2 vedtak, 1 design) | 2 | 3 | E |
| 25 | Hva løsningen utleder og hva den bare viser, og passivitet | 10 (6 design, 3 vedtak, 1 rad uten anker) | 8 | 26 | F |
| 26 | Når brevet er sendt, og når fristene regnes | 4 (2 vedtak, 2 design) | 1 | 5 | E |
| 27 | Den vedtatte brevteksten i LV-U4 | 22 (15 vedtak, 6 design, 1 beslutning) | 31 | 49 | E |
| 28 | Lagene i byggherrens svar: prinsipalt og subsidiært | 14 (8 vedtak, 6 design) | 22 | 42 | E |
| 29 | Forholdet som begrep, og begrepene i hendelsene | 11 (6 vedtak, 3 design, 2 beslutning) | 8 | 33 | E |
| 30 | Brevet som dokument: hva som fryses, levering og merking | 16 (8 vedtak, 5 beslutning, 2 design, 1 rad uten anker) | 15 | 25 | E |
| 35 | Avgrensningen av første versjon | 2 (2 beslutning) | 1 | 5 | H |
| 36 | Hvem som oppretter hvilken sak, og topicen | 9 (5 beslutning, 4 vedtak) | 5 | 5 | H |
| 37 | Forsering: aksept av fristavslag, 30 %-grensen og verdien av dagene | 18 (18 vedtak) | 19 | 27 | G |
| 38 | Fullmakt og godkjenningskjeden | 15 (10 vedtak, 5 rad uten anker) | 6 | 0 | G |
| 39 | Medlemskap og lesetilgang | 9 (7 vedtak, 2 rad uten anker) | 6 | 1 | H |
| 41 | Serverlaget, databasen og målarkitekturen (beslutninger) | 16 (8 beslutning, 7 rad uten anker, 1 vedtak) | 6 | 7 | H |

Alle 22 temaene har minst ett forhold inne, så ingen av dem kan lukkes uten samlevedtak ut fra
tallene alene. Tema 3, 24, 26 og 35 har tre forhold inne eller færre. De samles i gruppen de
står i, og får ikke egne PR-er.

## Postene som går igjen

Noen poster står i flere temaer som gjenstår. Gruppene er satt slik at hver av dem havner i
færrest mulig grupper:

- HF-U5: tema 1, 9, 14, 18, 25 og 37.
- LV-U4, LV-U39 og LV-U41: tema 7, 18, 24, 27, 28 og 29.
- MM-U24: tema 14, 18, 25 og 26.
- GR-U7: tema 1, 2 og 14. OV-U3: tema 5, 7 og 9. FO-U5: tema 1, 7 og 37.

HF-U5 står i fire grupper. Samlevedtaket som kommer først, tar delene av HF-U5 som hører til
sitt tema. De neste viser til det, som KA-U52 gjorde for MM-U34.

## Forslaget

Gruppene A og B er forslaget i 6944746880. De nye gruppene C–H er:

- **A. Brev sendt utenfor løsningen:** tema 18, med OV-U98 og OV-U102–OV-U113. Det nullstiller
  varslene for HF-U23, MM-U55 og VS-U43.
- **B. Kravpostene og vederlaget:** en ny versjon av OV-U95 med KA-U53–KA-U83, VS-U48–VS-U73,
  OV-U106, OV-U107 og HF-U28. Det nullstiller varslene for OV-U89, OV-U95, VS-U46, KA-U51 og
  KA-U52. Temaet er allerede samlet, så B skriver ingen tema i tabellen.
- **C. Aksept og byggherrens svar:** tema 1, 2, 7 og 14. Forslaget for tema 14 fra 04.11
  ([revisjonen](vurdering-samlevedtak-revisjon-av-svaret-2026-11-04.md)) er ikke besvart og
  kartlegges på nytt.
- **D. Avgjorte krav, frafall og grunnlaget som endringsordre:** tema 3, 5, 9 og 10.
- **E. Brevteksten og brevet:** tema 24, 26, 27, 28, 29 og 30. Gruppen er størst. Den kan
  deles i 27–29 og 24, 26 og 30.
- **F. Hva løsningen utleder og viser:** tema 25. Seks av ti poster er design. Kartleggingen
  avgjør om temaet trenger et samlevedtak, eller om designet flyttes til et forløp og resten
  samles i C eller D.
- **G. Forsering og fullmakt:** tema 37 og 38.
- **H. Første versjon, sakene og tilgangen:** tema 35, 36, 39 og 41. Tema 35 og 41 er nesten
  bare beslutninger, og tema 36 har fem av ni. Tema 39 gjelder tilgang og er vedtak.

Rekkefølgen er A, B, C, D, E, G, H og F. A og B nullstiller varslene. C og D har flest forhold
utenfra og flest poster de deler med A.

## Verifikasjon og grenser

- **Kjørt og observert:** skriptet over `vedtak.toml` på `7eecd81`, med kriteriene under
  «Grunnlaget». Tallene for «Utenfra» teller hvert forhold én gang, også når samme post har flere
  forhold til samme mål.
- **Ikke kontrollert:** Ingen tekst i postene er lest for å avgjøre om delen som gjenstår av en
  post, faktisk hører til temaet. En post som står i flere temaer, regnes med i hvert av dem.
  Klassene er de som står i registeret. Forslaget til grupper er en arbeidsvurdering.
  Kartleggingen av hver gruppe avgjør innholdet etter vedtaksskillen.
