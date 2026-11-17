# Samlevedtak A1: brev sendt utenfor løsningen

Dato: 17.11.2026. Kontrollert commit: `c18fec2` (`main`). Del av #1534, steg 4. Det er gruppe A i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget), punktet om A i
[6944937754](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6944937754) og
vedtaksskillen, «Samlevedtakene er unntaket», med formen etter svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
Fila viser til postene og punktene uten å gjengi dem, og skriver ikke i `vedtak.toml`. Den
foreløpige ID-en for A1 settes når posten føres.

## Grunnlaget

`vedtaksregister.py --sjekk`, `--kjede` for OV-U98, HF-U23, MM-U55 og VS-U43, `--vis` for postene
i tema 18 og OV-U98–OV-U113, Følge og teksten til samlevedtakene i [vedtaksfila](../plans/vedtak.md)
og `varsler()` i [`vedtaksregister.py`](../verktoy/vedtaksregister.py).

**Varslene.** HF-U23 har 8 endringer, MM-U55 7 og VS-U43 8. Seks av dem kommer gjennom OV-U98
for HF-U23 og MM-U55, og tre gjennom OV-U102 for VS-U43.

**K1. Kjernen i tema 18 er bare delvis samlet.** Restkartleggingen regnet en post som samlet når
et samlevedtak har forholdet `samler` til den, og leste ikke teksten. Følge hos samlevedtakene viser
at OV-U4 er samlet av MM-U43 «for setningene tabellen nevner», OV-U5 av VS-U43 bare for det første
fristkravet og av MM-U50 for et svar byggherren alt har gitt, og HF-U13 av MM-U50 unntatt siste
setning. MM-U55 samler OV-U80, men teksten gjelder bare rettingen. **Kjørt og observert:** et søk i
MM-U55, VS-U43, MM-U50 og MM-U43 etter kjernen i OV-U80 finner den ikke. OV-U11 står ordrett i
MM-U55 punkt 8 og er samlet.

## Postene

- **Tema 18 (18 vedtak og én rad):** HF-U5 (bare setningen om at et registrert brev ikke binder;
  resten hører til gruppe C), KA-U20, MM-U1, OV-U9, OV-U15, OV-U17, OV-U18, OV-U44, OV-U79,
  OV-U84, OV-U85, VS-U6, VS-U7, VS-U8, VS-U34, VS-U38, VS-U39, VS-U40 og rad-101 (SK-12).
- **Delene som ikke er samlet (K1):** OV-U4, OV-U5, OV-U80 og siste setning i HF-U13.
- **OV-U98-familien (8):** OV-U98, OV-U101, OV-U102, OV-U103, OV-U104, OV-U109, OV-U111 og OV-U113.
- **Ikke i A1:** LV-U4, LV-U19 og LV-U29 er brevtekst (gruppe E). Rad-123 (DRF-03, varselet etter
  punkt 34.3.3) og OV-U105 hører til gruppe B. OV-U99 (H), OV-U100, OV-U106–OV-U108 (B) og OV-U110
  og OV-U112 (C og D) gjelder andre temaer.
- **Design og beslutning:** MM-U24, OV-U20 og OV-U62 er flyttet. OV-U16, OV-U19, OV-U70 og OV-U81
  venter på forløpet for brev registrert utenfor løsningen (skillen `brukerforlop`). A1 trenger
  ikke forløpet: designdelene står i designdelen til A1 til forløpet finnes.

## Utkastet til A1

Hver setning har kilden i parentes. «s3» er tredje setning i posten. Språket følger E4.

###### A. Hva korrespondansen er i løsningen

1. Det partene har sendt hverandre utenfor løsningen, kan legges til i saken som korrespondanse.
   Begge parter kan legge til korrespondanse, også det motparten har sendt. En kommentar i Catenda
   er ikke et brev i løsningen. (OV-U79 s1, s5 og s6, som endrer KA-U20 s2 og OV-U4 s7)
2. Den som legger korrespondansen til, oppgir hva den er etter kontrakten: dokumentasjon, varsel,
   krav eller svar. Bare parten som sendte den, kan velge noe annet enn dokumentasjon. Legger
   motparten den til, står den som dokumentasjon til avsenderen velger. (OV-U80 s1–3)
3. Korrespondansen får virkning i løsningen bare når avsenderen legger den til som et varsel, et
   krav, et svar (også byggherrens endringsordre som svar) eller totalentreprenørens aksept av
   byggherrens svar, fordi virkningen avhenger av når den ble sendt. Annet står som dokumentasjon,
   og parten sender utsagnet fra løsningen. (OV-U98 s1–2, uten forespørselen etter OV-U113)
4. Dokumentasjon står ved sporene eller saken. Løsningen utleder ikke noe av den, verken standpunkt,
   enighet, sperre eller uavklart utfall, og fryser ingen vurdering av den. Partene tar den i
   betraktning når de svarer i løsningen. (OV-U80; OV-U4 s3 og s5; OV-U44 s2) En forespørsel etter
   punkt 33.6.2 sendt utenfor løsningen er dokumentasjon i første versjon, og det samme er
   påberopelsen av at totalentreprenøren svarte for sent på den. (OV-U113 s1 og s3)
5. Et krav eller svar som legges til, fylles ut med de samme påkrevde feltene som et krav eller svar
   sendt fra løsningen, unntatt utdypningen og begrunnelsen. Når skjemaet er fylt ut, har det samme
   virkning i løsningen som et krav eller svar sendt derfra, med datoen det ble sendt. Løsningen lager
   ingen brevtekst. Der skjemaet og dokumentet spriker, er dokumentet partens meddelelse. (OV-U80;
   KA-U24) Et brev som står som dokumentasjon, binder ikke i løsningen. (E1)
6. Et svar som legges til, går gjennom godkjenningen etter fullmakten og står som dokumentasjon til
   det er godkjent. Har svaret et forbehold skjemaet ikke kan uttrykke, står det som dokumentasjon.
   Løsningen tolker ikke et forbehold i svaret. (OV-U80; OV-U101 s5–6; E2)
7. Byggherren bekrefter ikke i et brev fra løsningen et svar byggherren har gitt utenfor løsningen,
   men legger det til som korrespondanse og velger at det er et svar. Kan svaret ikke legges til som
   svar, eller vil byggherren gi en endringsordre nå, sender byggherren et nytt svar fra løsningen,
   og det får virkning når det sendes. (OV-U101 s1–2 og s8–9)
8. Byggherrens egen endringsordre er et valg i svaret, på vilkårene i OV-U6. (OV-U80; OV-U101 s7)
9. Løsningen kontrollerer ikke at dokumentet er det parten oppgir, og avgjør ikke om sendemåten
   oppfyller kravene i kontrakten til skriftlighet og adresse. (OV-U80; OV-U79 s4; VS-U39)
   Løsningen skiller mellom dokumentasjon, partens opplysninger og det løsningen utleder, og verken
   utledningen eller korrespondansen framstilles som en fullstendig oversikt over partenes
   rettsstilling. (OV-U44 s5–6) Hva et brev sendt utenfor løsningen kan ha av virkning etter
   kontrakten, og hva som fryses, står i MM-U50 punkt 18–20.
10. Et valg godtas der den samme handlingen sendt fra løsningen ville vært godtatt. Dokumentasjon
    godtas også når kravene er avgjort (OV-U3), når totalentreprenøren har godtatt avslaget på
    grunnlaget, og når grunnlaget er trukket. I en sak løsningen ikke forstår (MM-U2), godtas bare
    dokumentasjon. (OV-U80; OV-U4 s10–11)

###### B. Datoen

11. Datoen avsenderen oppgir at korrespondansen ble sendt, er datoen for utsagnet i løsningen. Har
    motparten lagt den til med en annen dato, viser løsningen begge, med parten som oppga dem.
    Løsningen avgjør ikke når korrespondansen ble sendt eller kom fram. Mener mottakeren at datoen er
    feil, sier mottakeren det i begrunnelsen for svaret eller i et innlegg. (OV-U98 s3; OV-U85; VS-U8
    s2) Et varsel totalentreprenøren sender fra løsningen, får serverens dato. (VS-U8 s1)
12. Et varsel er et eget utsagn med datoen det ble sendt. Datoen for et varsel fra
    totalentreprenøren settes én gang, også når varselet er lagt til som korrespondanse, og et senere
    krav med en annen dato avvises. En feil dato rettes etter MM-U55 punkt 8 og 18. (HF-U13
    siste setning; rad-101 s1–2; OV-U80; VS-U34 s6)
13. «Før» og «da det ble sendt» regnes i hele kalenderdager, og et brev sendt samme dag som et
    annet er ikke sendt før det, etter OV-U104. (OV-U104)

###### C. Rekkefølgen og hva som er gjeldende

14. Ellers avgjør rekkefølgen utsagnene ble lagt til i løsningen, sperrene og hva som er gjeldende,
    med unntakene i punkt 18 og 24. (OV-U98 s4; OV-U113 s4 for VS-U19)
15. Et krav sendt før totalentreprenørens siste krav i sporet blir ikke gjeldende, men datoen det
    ble sendt, gjelder som datoen kravet i sporet først ble sendt, etter OV-U102. (OV-U98 s5;
    OV-U102)
16. Et svar som legges til, gjelder kravversjonen det svarer på, og godtas når den var gjeldende da
    svaret ble sendt. Et svar sendt før byggherrens gjeldende svar på samme kravversjon blir ikke
    gjeldende, etter OV-U103. En aksept som legges til, gjelder svaret den godtar, og godtas når det
    var byggherrens gjeldende svar da aksepten ble sendt. Et svar byggherren har sendt etter
    aksepten, står med virkningen det hadde. (OV-U98 s6–8; OV-U101 s4; OV-U103)
17. Hvilket krav eller svar som er gjeldende, avgjøres når det legges til, og en senere retting av
    datoen endrer det ikke. (OV-U98 s9) Et fristkrav sendt før byggherrens forespørsel etter punkt
    33.6.2 følger OV-U109 og OV-U111. (OV-U109; OV-U111)

###### D. Et varsel sendt utenfor løsningen

18. Totalentreprenøren oppgir datoen for et varsel sendt utenfor løsningen ved å legge det til som
    korrespondanse med kategorien varsel: etter punkt 32.2, punkt 33.4, punkt 34.1.2, eller punkt
    34.1.3 for rigg og drift eller for produktivitet hver for seg. Det egne brevet med opplysningen
    faller bort. Kategorien godtas også etter kravet og etter byggherrens svar, på vilkårene i OV-U5
    og VS-U16. (OV-U80; VS-U34 s1–2, som endrer OV-U5) Det er første registrering, ikke en flytting
    av et varsel som alt er registrert. (MM-U1 s2–3; VS-U7 s1–2) Et svar byggherren alt har gitt,
    står etter MM-U50 punkt 21–24. (OV-U5 og MM-U50, som endrer MM-U1 s5 og VS-U7 s3–4, s6 og s8)
19. Velger totalentreprenøren i kravskjemaet at varselet er sendt på annen måte, legges det til i
    samme forløp. Et krav sendt utenfor løsningen legges til med kategorien krav. (VS-U34 s3 og s5;
    s4 er brevtekst og hører til gruppe E)
    Sender totalentreprenøren fra løsningen et krav som også er sendt utenfor, kan totalentreprenøren
    oppgi datoen det ble sendt utenfor, med det kravet som vedlegg, og byggherren tar stilling til
    rettidigheten med opplysningen som premiss. (OV-U5, de siste seks setningene; MM-U55 punkt 18)
20. Når fristkravet er det første varselet løsningen kjenner, og totalentreprenøren har oppgitt at
    kravet ble sendt tidligere utenfor løsningen, tar byggherren også stilling til rettidigheten etter
    punkt 33.4 med den datoen som premiss. Opplysningen er ikke en registrering av varselet, og
    totalentreprenøren kan fortsatt legge til et tidligere varsel. (OV-U9 s1 og s3)
21. Varselet etter punkt 32.2 i skjemaet for ny sak, og etter at saken er opprettet, følger VS-U38,
    VS-U39 og VS-U40. (VS-U38; VS-U39; VS-U40)
22. Totalentreprenøren kan sende varsel etter punkt 34.1.2 og 34.1.3 fra løsningen, som et eget
    varsel med dato og uten beløp, også i en sak der totalentreprenøren krever endring etter punkt
    33.1 a. Der er det ikke krav om varsel (punkt 34.1.1), løsningen utleder ingen virkning av det,
    og byggherren tar ikke stilling til rettidigheten etter punkt 34.1.2. Når vederlagskravet er
    sendt, avvises et nytt slikt varsel fra løsningen. (OV-U5 s1–3; VS-U6; OV-U15)

###### E. Rettingen

23. Dokumentasjon rettes av samme side som la den til: hvem som helst på den siden kan legge
    brevet til på nytt med henvisning til den feilaktige registreringen, uten godkjenning. Står
    registreringen i feil sak, rettes den etter OV-U18. (OV-U17; OV-U18) En feil kategori eller et
    feil varsel rettes etter MM-U55 punkt 9, og en feil dato etter MM-U55 punkt 8 og 18. (OV-U80)
24. Avsenderens senere valg av hva korrespondansen er, følger OV-U84 med innsnevringen i OV-U98.
    (OV-U84; OV-U98)

###### Beslutningsdel

- Valget etter OV-U84 venter i første versjon. Til det er bygget, legger avsenderen korrespondansen
  til på nytt med valget og med henvisning til den første registreringen. (OV-U99 punkt 2)
- Opplysningen om at et registrert brev er en endringsordre, gis i første versjon bare når
  byggherren legger til sin egen endringsordre som svar. En senere avklaring avvises, med beskjed om
  at brevet kan legges til som dokumentasjon. (OV-U13)

###### Designdel

Designdelene i OV-U4, OV-U9, OV-U18, OV-U44, OV-U79, OV-U80, OV-U84, OV-U85, OV-U104, VS-U34,
VS-U38 og VS-U39 står ordrett, med postene som kilde, til forløpet for brev registrert utenfor
løsningen tar dem.

###### Endret innhold

- **E1 HF-U5.** «Et registrert brev binder ikke i appen (OV-U4).» står igjen, selv om OV-U80 gir et
  krav eller svar som er lagt til, samme virkning som et sendt fra løsningen. OV-U80 endrer OV-U4,
  men ikke HF-U5. Punkt 5 avgrenser setningen til dokumentasjon. Spørsmål I1.
- **E2 KA-U20.** Merkingen av et registrert brev med noe løsningen ikke kan uttrykke, og sperren av
  handlingene som bygger på det, står ikke i punktene. OV-U80 lar et svar med et slikt forbehold stå
  som dokumentasjon, og OV-U13 sier at merkingen bygges med avklaringen av registrerte brev (OV-U7).
  Spørsmål I2.
- **E3 Forhold som alt er løst.** Disse står med den senere posten som kilde og endrer ikke noe:
  OV-U79 og OV-U80 mot KA-U20 og OV-U4 (punkt 1), OV-U113 mot OV-U98 (punkt 3, 4 og 14), VS-U34 mot
  OV-U5 (punkt 18), og OV-U5 og MM-U50 punkt 21 mot MM-U1 og VS-U7 (punkt 18). MM-U21 i OV-U80
  leses som MM-U55, som opphever den.
- **E4 Språket.** «Appen» blir «løsningen», «TE» blir «totalentreprenøren», «registrert» blir «lagt
  til» der det gjelder korrespondanse, og «§» blir «punkt», etter [språkfila](../sprak.md).

## Svarene om delingen

Oppdragsgiver 17.11, ordrett (videresendt av orkestratoren): S1: «A: To PR-er (Anbefalt)». S2: «A:
Telles fra samlevedtaket (Anbefalt)». B og C i S1 og B i S2 er forkastet. Denne PR-en er A1.
Rettingen etter S2 A står i `varsler()`. Etter den varsler `--sjekk` ikke om KA-U51, fordi KA-U56,
som endrer KA-U51, er samlet av OV-U95.

## Spørsmålene om delingen

Lagret ordrett før de sendes til orkestratoren. Begge gjelder framgangsmåten, ikke rettsregler.

> **S1. Hvordan samlevedtak A deles (prosess).** Kjernen i tema 18, regelen for når et brev sendt
> utenfor løsningen får virkning, er bare delvis samlet (K1). A er derfor en ny kjede med om lag
> 30 poster og deler, i tillegg til de tre varslene.
>
> - **A (anbefalt):** To PR-er. **A1** er et nytt samlevedtak for brev sendt utenfor løsningen:
>   de 18 vedtakspostene og to radene uten anker som gjenstår i tema 18, delene av OV-U4, OV-U5, OV-U11, OV-U80 og HF-U13 som
>   ikke er samlet, og OV-U98, OV-U101–OV-U104, OV-U109, OV-U111 og OV-U113. **A2** er versjon 2
>   av samlevedtaket for varslingsdatoen (VS-U43), med LV-U53, LV-U54, LV-U57, VS-U70 og
>   OV-U102. HF-U23 og MM-U55 får nye versjoner i A2 bare hvis varselet står etter S2.
> - **B:** Én PR med A1 og nye versjoner av VS-U43, HF-U23 og MM-U55. Vurderingsfila går over
>   grensen på om lag 250 linjer i vedtaksskillen.
> - **C:** Bare nye versjoner av HF-U23, MM-U55 og VS-U43, som tar OV-U98-familien. Tema 18 samles
>   senere for seg, og OV-U98 får da tre hjem til det.
>
> Styrer: antall PR-er, og hvor regelen for brev sendt utenfor løsningen har hjemmet.

> **S2. Varseltellingen for en samlet post (prosess, med en teknisk side).** Varselet teller i dag
> en endring fra en post et samlevedtak samler, fordi bare en opphevet post er unntatt (svar 2 A
> i #1614). Etter A1 har HF-U23 da fortsatt 8 endringer og MM-U55 7, selv om regelen leses i
> HF-U23, KA-U52 og A1, og i MM-U55 og A1.
>
> - **A (anbefalt):** En endring fra en post et gjeldende samlevedtak samler, telles som en endring
>   fra samlevedtaket, og kjeden telles ikke videre gjennom posten. HF-U23 får da 2 endringer
>   (KA-U52 og A1), MM-U55 1 og VS-U43 6. VS-U43 får versjon 2 i A2, og HF-U23 og MM-U55 står.
>   Rettingen i `vedtaksregister.py` tas i A1 med en test.
> - **B:** Tellingen står. HF-U23 og MM-U55 får nye versjoner i A2 som opphever dem (svar 4 A), med
>   OV-U98 punkt for punkt der den presiserer dem.
>
> Styrer: om A2 har én eller tre nye versjoner av samlevedtak.

## Spørsmålene om innholdet

Lagret ordrett før de sendes til orkestratoren. Begge gjelder rettsregler og stilles i tekst, ikke
med spørsmålsverktøyet. Resten av utkastet legges fram til tilslutning med rettelser per punkt.

> **I1. Hva et brev som er lagt til, binder (E1).** HF-U5 sier: «Et registrert brev binder ikke i
> appen (OV-U4).» OV-U80 gir et krav eller svar som er lagt til med skjemaet, «samme virkning i
> løsningen som et krav eller svar sendt derfra», og OV-U98 gjør det samme for aksepten. OV-U80
> endrer OV-U4, men har ikke noe forhold til HF-U5.
>
> - **A (anbefalt):** «Et brev som står som dokumentasjon, binder ikke i løsningen. Et krav, et
>   svar eller en aksept som avsenderen har lagt til etter punkt 3 og 5, binder i løsningen som et
>   krav, et svar eller en aksept sendt derfra, med datoen det ble sendt.» Forhold: endrer HF-U5
>   (setningen om et registrert brev); følger OV-U80 og OV-U98.
> - **B:** Setningen i HF-U5 står uendret. Et svar som er lagt til, binder da ikke byggherren i
>   løsningen. Det strider mot OV-U80 og OV-U98 og er et forslag om å oppheve dem for bindingen.
>
> Styrer: om bindingen etter HF-U5 gjelder et svar byggherren har lagt til.

> **I2. Merkingen av et forbehold i et brev som er lagt til (E2).** KA-U20 sier at et registrert
> brev med noe løsningen ikke kan uttrykke, merkes av den som registrerer, at en part senere kan
> merke det, og at handlingene som bygger på forbeholdet, sperres. OV-U80 lar den som legger til et
> svar, svare på om svaret har et forbehold skjemaet ikke kan uttrykke. Svarer den ja, står svaret
> som dokumentasjon, og det er ingenting å sperre. OV-U13 sier at avklaringen av et registrert brev
> bygges «med merking og avklaring av registrerte brev (OV-U7)».
>
> - **A (anbefalt):** «Den som legger til et svar med et forbehold skjemaet ikke kan uttrykke,
>   merker det med spørsmålet i svarskjemaet, og svaret står som dokumentasjon (punkt 6). En senere
>   merking av et krav eller svar som er lagt til, og sperren av handlingene som bygger på
>   forbeholdet, venter til et nytt vedtak sier at de bygges.» Forhold: snevrer inn KA-U20 for
>   første versjon; følger OV-U80 og OV-U13.
> - **B:** KA-U20 står i A1 som i dag. En part kan også senere merke et krav eller svar som er
>   lagt til, og handlingene som bygger på forbeholdet, sperres til avsenderen avklarer det.
>
> Styrer: om første versjon har en senere merking med sperre.

## Verifikasjon og grenser

- **Kjørt og observert:** kommandoene under «Grunnlaget» på `c18fec2`, og søket i K1.
  `test_vedtaksregister` er grønn (476 tester). Testen for S2 A er prøvd mot feilinnføringen som
  fjerner rettingen, og ble rød.
- **Lest ut av vedtaksfila:** K1, utkastet og «Endret innhold». Bare Følge og teksten til
  samlevedtakene for VS-U43, MM-U43, MM-U50 og MM-U55 er lest for K1.
- **Ikke kontrollert:** sitatene fra NS 8407 (ingen er brukt), og koden for registreringen.
  Kartleggingen har ingen kodefunn.
