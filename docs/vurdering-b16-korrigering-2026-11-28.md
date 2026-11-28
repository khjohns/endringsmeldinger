# Vurdering: B-16, korrigeringsprosessen for andre rettinger

Spørsmålene til oppdragsgiver om det som står igjen av [#276](https://github.com/khjohns/endringsmeldinger/issues/276)
(B-16 i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)),
skrevet 28.11 i runde 11 i #1065. Kontrollert mot `main` 28.11. Svarene føres under hvert spørsmål, og
vedtakene føres fra denne fila i en egen vedtaks-PR.

## Oppdraget

Beslutningsdelen i [samlevedtaket for retting av sendt brev, versjon 4](plans/vedtak.md#samlevedtak-retting-4)
(MM-U59) sier ordrett: «For andre rettinger skal det før første ekte sak finnes en avklart og
gjennomførbar korrigeringsprosess; den kan være manuell. Det som står åpent om rettingen under B-16 i
hovedplanen (aktørrettigheter, godkjenning og innsyn for motparten), avgjøres for den manuelle
prosessen før første ekte sak. Den fullstendige rettingsflyten etter punkt 1–7 kan bygges senere.»
[OV-U99](plans/vedtak.md#ov-u99) punkt 1 tar «den manuelle korrigeringsprosessen for andre rettinger»
med i handlingene i første versjon.

«Punkt» uten annen kilde viser under til samlevedtaket for retting av sendt brev, versjon 4.

## Det som følger av vedtakene (avgrensning, ikke spørsmål)

| Hva | Regelen | Belegg |
| --- | --- | --- |
| Datoen for et varsel og et krav sendt utenfor løsningen | Rettes etter punkt 8 og 18, og gjelder straks. Bygget i kjernen (#1309). Ikke en del av B-16 | [MM-U63](plans/vedtak.md#mm-u63) |
| Datoen i påberopelsen av forholdet og kunnskapsdatoen | Korrigeres etter punkt 10 og 12. Bygget | Punkt 10 og 12, beslutningsdelen |
| Et standpunkt i et krav eller et svar | Rettes med en ny kravversjon eller et nytt svar, med henvisning til brevet den retter. Begge er handlinger i første versjon. Er de ikke tillatt, som i en KOE-sak en endringsordre omfatter, avvises de | Punkt 6; OV-U99 punkt 1 |
| En endringsordre | Rettes ikke i løsningen. Et forslag om å rette betegnelsen sendes som innlegg | Punkt 14 og 16 |
| Et brev sendt utenfor løsningen og lagt til | Legges til på nytt av samme side med henvisning til den feilaktige registreringen, uten godkjenning. Feil sak etter OV-U18. Et senere valg av kategori: legges til på nytt med valget, til OV-U84 er bygget | [OV-U17](plans/vedtak.md#ov-u17), [OV-U18](plans/vedtak.md#ov-u18), [OV-U123](plans/vedtak.md#samlevedtak-brev-utenfor-2) punkt 23, OV-U99 punkt 2 |
| En opplysning i fritekst, og motpartens bestridelse | Innlegg. En opplysning i fritekst rettes ikke etter punkt 1–5 | Punkt 15; [MM-U47](plans/vedtak.md#samlevedtak-protest-innlegg) punkt 1 og 9 |
| Originalen | Står uendret. En retting er et nytt utsagn med henvisning til brevet den retter | Punkt 1 og 2; [MM-U50](plans/vedtak.md#mm-u50) |
| Hvem rettingen kommer fra | Avsenderen. Mener motparten at en opplysning er feil, bestrider motparten den i et innlegg | Punkt 1; MM-U47 punkt 9 |
| Virkningen mellom partene | En retting i motpartens favør gjelder som en revisjon. En retting til avsenderens fordel er et tilbud som gjelder når motparten godtar den. Løsningen avgjør ikke om avsenderen er løst | Punkt 3–5; MM-U50 punkt 8 |
| Frister | Ingen frist flyttes automatisk av en retting. Et svar som alt er gitt, står med virkningen det hadde | Punkt 8, 9 og 11; B-16 i hovedplanen |

Det som står igjen, er derfor rettingen av en annen opplysning i et brev sendt fra løsningen enn
datoene over, uten at det totalentreprenøren krever eller byggherrens standpunkt endres: en dato, et
nummer eller en henvisning i kravet (punkt 13) eller i byggherrens svar, og en feil kategori eller et
feil varsel (punkt 9).

## Det som finnes i løsningen i dag

Kartlagt av en subagent 28.11, fra koden på `main`:

- Kjernen har ingen generell retting med henvisning til et brev. De tre rettingene som finnes
  (punkt 8/18, 10 og 12), er bare for totalentreprenøren.
- Innlegget finnes. Begge parter kan sende det, det må vise til ett brev i saken, og ingen regel
  leser det (`docs/datamodell/handlinger.toml`, G5).
- Godkjenningen etter fullmakten er vedtatt og har et datalag, men ingen sending går gjennom den i
  dag (`handlinger.toml`, U8).
- Eksport av saken er vedtatt, men ikke bygget (B-11).

## Spørsmålene

Spørsmål 1 avgjør retningen. Spørsmål 2–4 gjelder den manuelle prosessen etter svaret på spørsmål 1,
og spørsmål 5 er eksemplene i «Ferdig når» i #276.

### Spørsmål 1. Hvordan sendes en retting av en annen opplysning før den fullstendige rettingsflyten er bygget?

**Bakgrunn.** Punkt 2 sier at en retting sendes som et nytt brev fra løsningen. Innlegget er et brev
fra løsningen som viser til ett brev i saken, og løsningen tolker det ikke (MM-U47 punkt 2–4).

**Alternativer (i vedtaksform):**

- **A (anbefalt).** Før den fullstendige rettingsflyten etter punkt 1–7 er bygget, sender avsenderen
  en retting av en annen opplysning som et innlegg med henvisning til brevet den retter. Innlegget
  sier hvilken opplysning som rettes, og hva den skal være. Løsningen tolker ikke innlegget og leser
  fortsatt opplysningen i det første brevet. Virkningen mellom partene følger punkt 4 og 5, og
  løsningen avgjør den ikke. *Forhold: presiserer beslutningsdelen i samlevedtaket for retting av
  sendt brev og OV-U99 punkt 1 (hva den manuelle prosessen er); utvider MM-U47 punkt 1 (innlegget
  brukes også for en retting).*
- **B.** Før den fullstendige rettingsflyten er bygget, sender avsenderen en retting av en annen
  opplysning utenfor løsningen etter punkt 5 i NS 8407 og legger den til i saken som dokumentasjon.
  Løsningen utleder ingenting av den (OV-U4). *Forhold: endrer punkt 2 i mellomtiden.* Dokumentasjon
  kan ikke vise til brevet den retter, bare til en registrering den retter.

**Anbefaling: A.** Rettingen går til motparten på avtalt kanal som andre brev, henvisningen knytter
originalen og rettingen sammen, og ingenting nytt må bygges. Kostnaden er at løsningen bruker den
første opplysningen til rettingen er bygget.

**Hva valget styrer:** om første ekte sak trenger noe nytt for andre rettinger, og hvordan
originalen og rettingen knyttes sammen i historikken.

### Spørsmål 2. Hvem kan sende rettingen?

**Bakgrunn.** Rettingen kommer fra avsenderen (punkt 1). For et brev sendt utenfor løsningen og lagt
til valgte oppdragsgiver at hvem som helst på samme side retter registreringen (OV-U17, der «bare
personen» og «samme team» ble forkastet).

**Alternativer:**

- **A (anbefalt).** En retting etter spørsmål 1 kan sendes av hvem som helst på avsenderens side som
  kan sende brev fra løsningen i saken. *Forhold: i tråd med OV-U17.*
- **B.** En retting etter spørsmål 1 kan bare sendes av den som sendte brevet. Kan personen ikke,
  bestrider avsenderens side ikke sitt eget brev, og brevet står.
- **C.** En retting etter spørsmål 1 kan sendes av hvem som helst i teamet som sendte brevet.

**Anbefaling: A.** Brevet er sidens utsagn, og den som sendte det, kan ha sluttet eller være borte.

**Hva valget styrer:** tilgangskontrollen for rettingen.

### Spørsmål 3. Går byggherrens retting gjennom godkjenningen?

**Bakgrunn.** Punkt 7 sier ordrett: «En retting fra byggherren går gjennom godkjenningen etter
fullmakten som et svar med det innholdet rettingen gir, også når rettingen er et tilbud til
byggherrens fordel. Et nytt svar etter punkt 6 går gjennom godkjenningen som andre svar.» Et innlegg
går ikke gjennom godkjenningen. For totalentreprenøren er det ikke vedtatt noen godkjenning.

**Alternativer:**

- **A (anbefalt).** Byggherrens retting etter spørsmål 1 går ikke gjennom godkjenningen. Endrer
  rettingen byggherrens standpunkt, sendes den som et nytt svar etter punkt 6 og går gjennom
  godkjenningen som andre svar. *Forhold: snevrer inn punkt 7, første setning, til den fullstendige
  rettingsflyten er bygget.*
- **B.** Byggherrens retting etter spørsmål 1 går gjennom godkjenningen etter fullmakten som et svar
  med det innholdet rettingen gir, som punkt 7 sier. *Forhold: i tråd med punkt 7.* Innlegget må da
  kunne gå gjennom godkjenningen, når byggherren retter.

**Anbefaling: A.** En retting etter spørsmål 1 endrer ikke det byggherren har godkjent eller avslått,
fordi en endring av standpunktet er et nytt svar. Kostnaden er at en rettet dato, et nummer eller en
henvisning i et svar ikke kontrolleres av den som godkjente svaret.

**Hva valget styrer:** om innlegget må kunne gå gjennom godkjenningen før første ekte sak.

### Spørsmål 4. Hva bruker løsningen når motparten har godtatt en retting til avsenderens fordel?

**Bakgrunn.** En retting til avsenderens fordel gjelder når motparten godtar den (punkt 5). Etter
spørsmål 1 A godtar motparten i et innlegg, som løsningen ikke leser. Det gjelder særlig en feil
kategori eller et feil varsel som gir varselet en tidligere dato (punkt 9).

**Alternativer:**

- **A (anbefalt).** Har motparten godtatt en retting etter spørsmål 1, bruker løsningen fortsatt
  opplysningen i det første brevet. Godtakelsen står som et innlegg, og partene tar den i
  betraktning. Løsningen sier ikke at rettingen er godtatt, og avgjør ikke hvilken opplysning som
  gjelder mellom partene. *Forhold: presiserer punkt 5 og 9 til den fullstendige rettingsflyten er
  bygget.*
- **B.** Rettingen av en feil kategori eller et feil varsel etter punkt 9 bygges før første ekte sak,
  med motpartens godtakelse i løsningen. Andre rettinger følger spørsmål 1. *Forhold: endrer
  beslutningsdelen i samlevedtaket for retting av sendt brev.*

**Anbefaling: A.** Et varsel sendt fra løsningen med feil bestemmelse kan totalentreprenøren følge opp
med et nytt varsel straks. Det er en antakelse at en retting til en tidligere dato etter punkt 9 blir
sjelden i første ekte sak. Kostnaden er at visningen kan vise en dato eller en rekkefølge partene er
enige om er feil.

**Hva valget styrer:** om punkt 9 må bygges før første ekte sak.

### Spørsmål 5. Eksemplene

Eksemplene i «Ferdig når» i #276, med veien etter vedtakene og anbefalingene over. Oppdragsgiver kan
svare «ja» eller rette enkeltrader.

| Eksempel | Veien | Belegg |
| --- | --- | --- |
| Totalentreprenøren oppga feil dato for et varsel sendt utenfor løsningen | Rettingen etter punkt 8, gjelder straks | MM-U63 |
| Totalentreprenøren oppga feil dato i kravet for når arbeidet ble utført | Innlegg med henvisning til kravet (spørsmål 1) | Punkt 13 |
| Byggherren oppga feil dato for en befaring i begrunnelsen | Innlegg. Fritekst rettes ikke etter punkt 1–5 | Punkt 15 |
| Totalentreprenøren krevde fast sum, men mente regningsarbeid | Ny kravversjon. Metoden er en del av det totalentreprenøren krever | Punkt 6 og 13 |
| Byggherren svarte med feil metode | Nytt svar, gjennom godkjenningen som andre svar | Punkt 6 og 7 |
| Feil metode i en sak en endringsordre omfatter | Ny kravversjon og nytt svar avvises. Innlegg | Punkt 6 og 16 |
| Totalentreprenøren viste til feil tegning eller feil brev i kravet | Innlegg med henvisning til kravet (spørsmål 1) | Punkt 13 |
| Et brev sendt utenfor løsningen er lagt til i feil sak | Retting etter OV-U18 | OV-U18 |
| Et innlegg viser til feil brev | Nytt innlegg med henvisning til riktig brev | MM-U47 punkt 2 |

**Anbefaling: ja.** Eksempelforløpene føres som bevis-saker etter svaret 17.10 (punkt 13 i
kommentaren i #276).

## Svarene

Ikke stilt ennå.
