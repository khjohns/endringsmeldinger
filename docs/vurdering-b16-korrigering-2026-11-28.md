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

«Punkt» uten annen kilde viser under til samlevedtaket for retting av sendt brev, versjon 4, slik
[MM-U63](plans/vedtak.md#mm-u63) endret det: MM-U63 endrer punkt 6, 8, 18 og 19, opphever punkt 20–23
og snevrer inn punkt 5 for datoene etter punkt 8 og 18. Punkt 9 og OV-U84 står.

## Det som følger av vedtakene (avgrensning, ikke spørsmål)

| Hva | Regelen | Belegg |
| --- | --- | --- |
| Datoen for et varsel og et krav sendt utenfor løsningen | Rettes etter punkt 8 og 18, og gjelder straks. Bygget i kjernen (#1309). Ikke en del av B-16 | MM-U63 |
| Datoen i påberopelsen av forholdet og kunnskapsdatoen | Korrigeres etter punkt 10 og 12. Bygget | Punkt 10 og 12, beslutningsdelen |
| Et standpunkt i et krav eller et svar, også oppgjørsformen for en kravpost og byggherrens standpunkt til den | Rettes med en ny kravversjon eller et nytt svar, med henvisning til brevet den retter. Et nytt svar går gjennom godkjenningen som andre svar. Er en ny kravversjon eller et nytt svar ikke tillatt, som i en KOE-sak en endringsordre omfatter, avvises de, og parten kan sende et innlegg | Punkt 6 og 7; OV-U99 punkt 1; punkt 12–13 i [samlevedtaket for endringsordren](plans/vedtak.md#samlevedtak-eo-3); [MM-U47](plans/vedtak.md#samlevedtak-protest-innlegg) punkt 5 |
| En opplysning i fritekst eller i et vedlegg, som en dato for utførelsen, en tegning eller et brev det vises til | Kravet og svaret har ikke egne felt for slike opplysninger. Innlegg med henvisning til brevet. En opplysning i fritekst rettes ikke etter punkt 1–5, og løsningen avgjør ikke om innlegget er en retting eller en utdyping | Punkt 15; MM-U47 punkt 1, 4 og 6 |
| Motpartens bestridelse av en opplysning | Innlegg | MM-U47 punkt 9 |
| Forholdet og kategorien i påberopelsen | Står når påberopelsen er sendt. Et annet forhold påberopes i en ny sak. Et forslag om å rette betegnelsen på endringsordren sendes som innlegg | Punkt 14; punkt 7 og 9 i [samlevedtaket for påberopelsen](plans/vedtak.md#samlevedtak-paaberopelsen) |
| En endringsordre | Rettes ikke i løsningen. En feil tas opp etter punkt 42, 50 og 58 i samlevedtaket for endringsordren | Punkt 16 |
| Et brev sendt utenfor løsningen og lagt til | Legges til på nytt av samme side med henvisning til den feilaktige registreringen, uten godkjenning. Feil sak etter OV-U18. Et senere valg av kategori: legges til på nytt med valget, til OV-U84 er bygget. En feil kategori eller et feil varsel: punkt 9, se spørsmål 1 | [OV-U123](plans/vedtak.md#samlevedtak-brev-utenfor-2) punkt 23 og beslutningsdelen; OV-U18; OV-U99 punkt 2 |
| Originalen | Står uendret. En retting er et nytt utsagn med henvisning til brevet den retter, og henvisningen knytter dem sammen | Punkt 1 og 2; [MM-U50](plans/vedtak.md#mm-u50) |
| Hvem som sender rettingen (aktørrettighetene) | Avsenderens side. Innlegget kan sendes av begge sider, og løsningen skiller ikke rettingen fra motpartens bestridelse, fordi den ikke tolker innlegget | Punkt 2; MM-U47 punkt 4; KA-U16; i tråd med OV-U123 punkt 23 («hvem som helst på den siden») |
| Hva motparten ser (innsynet) | Rettingen som et nytt brev med henvisning til brevet den retter, sendt på avtalt kanal | Designdelen i samlevedtaket for retting; MM-U47 punkt 3 |
| Virkningen mellom partene | En retting i motpartens favør gjelder som en revisjon. En retting til avsenderens fordel er et tilbud som gjelder når motparten godtar den. Løsningen avgjør ikke om avsenderen er løst | Punkt 3–5; MM-U50 punkt 8 |
| Svar som alt er gitt | Står med virkningen de hadde | Punkt 8, 9 og 11 |

Føringen under B-16 i hovedplanen, «Ingen automatisk flytting av frist eller omgjøring av sendt brev»,
er en føring og ikke et vedtak. Den følger alternativene under.

Det som står igjen, er derfor:

- en feil kategori eller et feil varsel etter punkt 9, i et brev sendt fra løsningen eller lagt til
  (spørsmål 1);
- om byggherrens innlegg går gjennom godkjenningen (spørsmål 2);
- eksemplene i «Ferdig når» i #276 (spørsmål 3).

## Det som finnes i løsningen i dag

Kartlagt og kontrollert av subagenter 28.11, fra koden på `main`:

- Kjernen har ingen generell retting med henvisning til et brev. De tre rettingene som finnes
  (punkt 8/18, 10 og 12), er bare for totalentreprenøren (`kjerne/kommandoer/forutsetninger.ts`).
- Innlegget finnes. Begge parter kan sende det, det må vise til ett brev i saken, og ingen regel
  leser det (`docs/datamodell/handlinger.toml`, G5).
- Godkjenningen etter fullmakten er vedtatt og har et datalag, men ingen sending går gjennom den i
  dag (`handlinger.toml`, U8; `server/godkjenning.ts`).
- Kjernen leser kategorien og varselet i et brev, ikke opplysninger i fritekst eller vedlegg.
- Eksport av saken er vedtatt, men ikke bygget (B-11).

## Spørsmålene

### Spørsmål 1. Hvordan rettes en feil kategori eller et feil varsel før den fullstendige rettingsflyten er bygget?

**Bakgrunn.** Punkt 9 sier at avsenderen retter en feil kategori eller et feil varsel etter punkt 1–5,
og at en retting som gir et varsel en tidligere dato, gjelder først når motparten godtar den. MM-U63
lot punkt 9 og OV-U84 stå. Et eksempel: totalentreprenøren sendte et varsel etter en annen bestemmelse
enn den totalentreprenøren mente. Totalentreprenøren kan straks sende et nytt varsel etter riktig
bestemmelse, med dagens dato. Vil totalentreprenøren at det første varselet skal gjelde etter riktig
bestemmelse, gir det varselet en tidligere dato, og det må byggherren godta. For et brev lagt til er
den midlertidige veien å legge det til på nytt (OV-U99 punkt 2).

**Alternativer (i vedtaksform):**

- **A (anbefalt).** Før den fullstendige rettingsflyten etter punkt 1–7 er bygget, retter avsenderen
  en feil kategori eller et feil varsel etter punkt 9 med et innlegg med henvisning til brevet. Det
  gjelder også et brev lagt til, når en ny registrering ville gitt varselet en tidligere dato etter
  samme bestemmelse. Motparten godtar eller avviser rettingen i et innlegg. Løsningen bruker
  fortsatt kategorien og varselet i det første brevet, også når rettingen er i motpartens favør og
  når motparten har godtatt den. Løsningen sier ikke at rettingen er godtatt, og avgjør ikke hva som
  gjelder mellom partene. En retting i motpartens favør kan i stedet sendes som et nytt varsel eller
  en ny registrering, der det er en handling i løsningen. *Forhold: snevrer inn punkt 4, 5 og 9 for
  det løsningen leser, til den fullstendige rettingsflyten er bygget; presiserer punkt 2 (det nye
  brevet er et innlegg); i tråd med MM-U47 punkt 2–6.*
- **B.** Rettingen av en feil kategori eller et feil varsel etter punkt 9 bygges før første ekte sak,
  med motpartens godtakelse i løsningen. *Forhold: utvider det som bygges før første ekte sak etter
  beslutningsdelen i samlevedtaket for retting av sendt brev. Godtakelsen er en ny handling og krever
  et vedtak etter [OV-U97](plans/vedtak.md#ov-u97). Den er en akseptmodell som MM-U63 opphevet for
  datoene etter punkt 8 og 18, men som punkt 9 beholdt.*

**Anbefaling: A.** Ingenting nytt må bygges, og henvisningen knytter originalen og rettingen sammen.
Det er en antakelse at en retting til en tidligere dato etter punkt 9 blir sjelden i første ekte sak,
fordi totalentreprenøren kan sende et nytt varsel straks. Kostnaden er at visningen kan vise en dato
eller en rekkefølge partene er enige om er feil. Etter A godtar byggherren i et innlegg, og om det går
gjennom godkjenningen, avgjøres i spørsmål 2.

**Hva valget styrer:** om punkt 9 må bygges før første ekte sak.

### Spørsmål 2. Går byggherrens innlegg gjennom godkjenningen?

**Bakgrunn.** Punkt 7 sier ordrett: «En retting fra byggherren går gjennom godkjenningen etter
fullmakten som et svar med det innholdet rettingen gir, også når rettingen er et tilbud til
byggherrens fordel. Et nytt svar etter punkt 6 går gjennom godkjenningen som andre svar.» MM-U26
forkastet 17.10 at bare en retting i motpartens favør går gjennom godkjenningen. Det er ikke vedtatt
om byggherrens innlegg går gjennom godkjenningen. I dag går ingen sending gjennom den (U8). Løsningen
kan ikke skille et innlegg som retter, fra andre innlegg, og spørsmålet gjelder derfor alle
byggherrens innlegg. Innlegget bærer også en godtakelse etter spørsmål 1 A og, etter beslutningsdelen
i MM-U47, innsigelsen etter punkt 5 i NS 8407 og påberopt passivitet. Løsningen leser ikke innlegget,
så verdien fullmakten regnes av, kan ikke regnes. Da kan bare den som har ubegrenset fullmakt, sende
alene, og alle andre trenger hele kjeden (punkt 10 i [samlevedtaket for verdien](plans/vedtak.md#samlevedtak-verdien)).

**Alternativer:**

- **A (anbefalt).** Byggherrens innlegg går ikke gjennom godkjenningen. En retting fra byggherren
  som endrer noe løsningen leser i svaret, som standpunktet, oppgjørsformen, beløpet, dagene eller
  bestemmelsen byggherren påberoper, sendes som et nytt svar etter punkt 6 og går gjennom
  godkjenningen som andre svar. *Forhold: snevrer inn punkt 7, første setning, til den fullstendige
  rettingsflyten er bygget; tar for et innlegg med en retting til byggherrens fordel opp igjen
  alternativet MM-U26 forkastet 17.10.*
- **B.** Byggherrens innlegg går gjennom godkjenningen etter fullmakten. Fordi verdien ikke kan
  regnes, kan den som har ubegrenset fullmakt, sende innlegget alene, og alle andre trenger hele
  kjeden. *Forhold: i tråd med punkt 7 og punkt 10 i samlevedtaket for verdien; utvider det som går
  gjennom godkjenningen.*

**Anbefaling: A.** Godkjenningen er byggherrens interne kontroll av hva byggherren binder seg til, og
det byggherren binder seg til i løsningen, står i svaret. Kostnaden bærer byggherren: en saksbehandler
kan i et innlegg godta en retting, frafalle en innsigelse eller skrive noe som i realiteten er et nytt
standpunkt, uten at godkjenneren har sett det. Totalentreprenøren kan ikke se om et innlegg fra
byggherren er godkjent. Ved B må den som har ubegrenset fullmakt, eller hele kjeden, behandle hvert
innlegg, også en ren utdyping.

**Hva valget styrer:** om innlegget må kunne gå gjennom godkjenningen før første ekte sak.

### Spørsmål 3. Eksemplene

Eksemplene med feil dato, metode og referanse i «Ferdig når» i #276, med veien etter vedtakene og de
anbefalte svarene. Oppdragsgiver kan svare «ja» eller rette enkeltrader.

| Eksempel | Veien | Belegg |
| --- | --- | --- |
| Totalentreprenøren oppga feil dato for et varsel sendt utenfor løsningen | Rettingen etter punkt 8, som gjelder straks | MM-U63 |
| Totalentreprenøren oppga feil dato i kravet for når arbeidet ble utført | Innlegg med henvisning til kravet. Løsningen avgjør ikke om det er en retting eller en utdyping. Totalentreprenøren kan også sende en ny kravversjon, som krever et nytt svar fra byggherren | Punkt 13 og 15 |
| Byggherren oppga feil dato for en befaring i begrunnelsen | Innlegg med henvisning til svaret | Punkt 15; spørsmål 2 |
| Totalentreprenøren ga tilbud om fast sum for en kravpost, men mente regningsarbeid | Ny kravversjon. Oppgjørsformen er en del av kravposten | Punkt 6; [samlevedtaket for vederlagsmetoden](plans/vedtak.md#samlevedtak-vederlagsmetoden-3) |
| Byggherren tok feil standpunkt til oppgjørsformen | Nytt svar, gjennom godkjenningen som andre svar | Punkt 6 og 7 |
| Feil oppgjørsform i en KOE-sak en endringsordre omfatter | En ny kravversjon og et nytt svar avvises. Innlegg | Punkt 6; punkt 12–13 i samlevedtaket for endringsordren; MM-U47 punkt 5 |
| Totalentreprenøren viste til feil tegning eller feil brev i kravet | Innlegg med henvisning til kravet | Punkt 15 |
| Totalentreprenøren varslet etter feil bestemmelse | Nytt varsel etter riktig bestemmelse, eller innlegg etter spørsmål 1 | Punkt 9; spørsmål 1 |
| Et brev sendt utenfor løsningen er lagt til i feil sak | Retting etter OV-U18 | OV-U18 |
| Et innlegg viser til feil brev | Nytt innlegg med henvisning til riktig brev | MM-U47 punkt 2 |

**Anbefaling: ja.** Eksempelforløpene føres som bevis-saker etter svaret 17.10 (punkt 13 i
kommentaren i #276).

## Til brukerforløpet

Dette er design og ikke spørsmål: innleggsskjemaet bør si at en endring av det parten krever eller
standpunktet i svaret sendes som ny kravversjon eller nytt svar, og innleggene bør vises i skjemaet for
svar og aksept, så motparten ser en retting før den svarer. Raden G5 i `handlinger.toml` får rettingen
som bruk av innlegget når svarene er ført.

## Svarene

Ikke stilt ennå.
