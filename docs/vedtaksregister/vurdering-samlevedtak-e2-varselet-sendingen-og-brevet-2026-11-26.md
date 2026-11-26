# Samlevedtak E4–E7: varselet etter punkt 33.4, sendingen og brevet som dokument

Dato: 26.11.2026. Kontrollert commit: `bf4958e` (`main`). Del av #1534, steg 4. Det er andre del av
gruppe E i [restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget): tema 24, 26 og 30
i [«Kjedene»](vurdering-klassifisering-2026-11-03.md#kjedene). Første del, tema 27–29, er E1–E3 i
PR #2436. Formen følger den vurderingen, vedtaksskillen, «Samlevedtakene er unntaket», og svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
Fila viser til postene og punktene uten å gjengi dem, og skriver ikke i `vedtak.toml`. «s3» er
tredje setning i vedtaksteksten, uten «Forkastet».

## Grunnlaget

`vedtaksregister.py --vis` og `--kjede` for postene i temaene og postene som endrer dem. Tre
subagenter delte postene i setninger og slo hver del opp mot de gjeldende samlevedtakene, én per
tema. Klassen for hver del bygger på svar 1 A i [vurderingen av ordlyd](vurdering-ordlyd-2026-11-14.md#svaret).

**Postene som gjenstår:** tema 24: VS-U15, VS-U16 og LV-U39 (design). Tema 26: LV-U9, LV-U22,
LV-U16 (design) og MM-U24 (design, flyttet). Tema 30: B-03-DOKUMENT, raden uten anker «B-03
hovedvalg», LV-U1, LV-U2, LV-U11, LV-U15, LV-U23, LV-U24, LV-U25 (design), LV-U26, LV-U27, LV-U28,
LV-U44, MM-U10 og MM-U22 (design, flyttet). Kjeden har i tillegg poster fra etter 03.11 som
presiserer eller endrer postene over: LV-U46–LV-U51, LV-U58–LV-U61, LV-U64 og LV-U66–LV-U69.

**K1. Ingen felles poster med E1–E3.** Ingen post under «Samler» nedenfor står under «Samler» i
E1–E3. To designposter E1 lar stå, har forhold hit: LV-U39 endrer VS-U15, og LV-U53 er bindende i
LV-U44. `bindende_i` i LV-U53 rettes derfor både av E1 og her (K6).

**K2. Det eldste om 34.1.2 er utdatert.** VS-U15 s4 sier at varselet etter punkt 34.1.2 sendes
utenfor løsningen. OV-U5, nå OV-U123 punkt 22, lar det sendes fra løsningen.

**K3. Fristene etter sendingen.** HF-U23 E8 tok «regner bindingen og akseptfristen fra sendingen»
ut av LV-U9. Det som står, er at brevet er sendt når det er lagret, og at et varsel får serverens
dato (OV-U123 punkt 11). E5 tar ikke inn noe mer om fristene.

**K4. «Sendt» i LV-U1.** LV-U1 s3 (10.10) sier at et lagret oppdrag ikke beviser at brevet er sendt.
LV-U9 s2 (17.10) sier at brevet er sendt når det er lagret. LV-U1 gjelder leveringen til Catenda.
Det er spørsmål 6.

**K5. Underskriverne.** LV-U15 s1 sier to signaturer. LV-U67 og LV-U68 sier at underskriverne følger
godkjenningen slik den faktisk ble gjort, og at brevet kan ha én eller to. E7 punkt 5 følger de
senere postene (E7 E2).

**K6. Designpostene samles ikke.** Som i gruppe D og E1 står designpostene med hjemmet sitt, og
`bindende_i` rettes ved føringen der den peker på en post som samles: LV-U16 (LV-U7, samlet i HF-U23)
til E5, LV-U25 og LV-U66 (LV-U15, LV-U23) til E7, LV-U53 (LV-U44) til E7, og MM-U24 (LV-U9) til E5.

**K7. Foreløpige ID-er,** de neste ledige 26.11 etter E1–E3: VS-U93 for E4, LV-U86 for E5, LV-U87
for E6 og LV-U88 for E7. Raden «B-03 hovedvalg» får ankeret `B-03-HOVEDVALG` og samles i E6.

## Delingen

- **E4, det egne varselet etter punkt 33.4 (tema 24).**
- **E5, når brevet er sendt, og kanalen (tema 26).**
- **E6, brevet, det som fryses og leveringen (tema 30, første del).**
- **E7, brevhodet, underskriften og merkingen (tema 30, andre del).**
- **Står, design** (`bindende_i` rettes, K6): LV-U16, MM-U24, LV-U25, LV-U53, LV-U59 og LV-U66.
- **Står, beslutning:** LV-U26 med LV-U58 (skriften og logoen). Kjeden er to poster og kan leses
  slik: LV-U58 endrer totalentreprenørens skrift i LV-U26.
- **Står, utenfor E4–E7:** LV-U39 (E1), MM-U22 (betegnelsene, F), LV-U45, LV-U62 og LV-U63 (brev
  utenfor løsningen, LV-U42), LV-U13 (lesingen i Catenda) og LV-U12, LV-U14 og LV-U17 (vedleggene).

## Utkastet til E4: det egne varselet etter punkt 33.4

Samlevedtaket er et *vedtak* med designdel. Hver setning har kilden i parentes.

1. Totalentreprenøren kan sende et eget varsel etter punkt 33.4 fra løsningen uten å angi dager, også
   før dagene kan angis, fordi punkt 33.4 krever varsel før kravet kan spesifiseres. (VS-U15 s1)
2. Varselet er et eget utsagn med datoen det ble sendt, og et varsel fra løsningen får serverens dato
   (OV-U123 punkt 11–12). Påberopelsen av forholdet endres ikke av varselet, og påberopelsen er ikke et
   varsel etter punkt 33.4 eller 34.1.2 (VS-U86 punkt 4). (VS-U15 s2)
3. Brevet meddeler at totalentreprenøren varsler etter punkt 33.4 at totalentreprenøren vil kreve
   fristforlengelse som følge av forholdet i saken. Den konkrete ordlyden er designdel. (VS-U15 s3;
   LV-U39; svar 1 A 14.11)
4. Når et krav om fristforlengelse er sendt, avvises et nytt varsel etter punkt 33.4 fra løsningen.
   Det kunne bare få en senere dato enn kravet, og punkt 1 gjelder varsel før dagene kan angis.
   (VS-U16 s1–s2)
5. Et varsel etter punkt 33.4 som ble sendt tidligere utenfor løsningen, kan fortsatt legges til med
   sin egen dato etter OV-U123 punkt 18, og et svar byggherren alt har gitt, står med virkningen det
   hadde (MM-U60 punkt 21–24). (VS-U16 s3)
6. Varsel etter punkt 34.1.2 og 34.1.3 følger OV-U123 punkt 22. (VS-U15 s4, endret, E1)

###### Endret innhold

- **E1 Varselet etter punkt 34.1.2.** VS-U15 s4 (sendes utenfor løsningen og registreres når punkt
  34.1 er bygget) er endret av OV-U5, nå OV-U123 punkt 22 og 18. Punkt 6 viser dit.
- **E2 MM-U8.** VS-U16 s3 viser til MM-U8, som er opphevet. Innholdet står i MM-U60 punkt 21–24 og
  OV-U123 punkt 18.
- **E3 Ordlyden er designdel** etter svar 1 A, med «punkt» etter LV-U39.
- **E4 Språket.** «Appen», «TE» og «grunnlagskravet» er skrevet som «løsningen», «totalentreprenøren»
  og «påberopelsen av forholdet». Innholdet er ikke endret.

**Samler:** VS-U15 og VS-U16.

## Utkastet til E5: når brevet er sendt, og kanalen

Samlevedtaket er et *vedtak* med beslutningsdel.

1. Et brev fra løsningen er sendt når det er lagret i løsningen. (LV-U9 s2, slik HF-U23 E8 lar det
   stå) Et varsel fra løsningen får serverens dato (OV-U123 punkt 11). Løsningen avgjør ikke når et
   brev er kommet fram, og akseptfristen er en opplysning (HF-U23 punkt 4–5).
2. Et brev løsningen lagrer og legger i byggherrens prosjekthotell, er sendt på avtalt kanal etter
   punkt 5 og Del II pkt. B.2.4. At prosjekthotellet er likestilt med post, og at e-post til
   prosjektleder og byggeleder etter pkt. D.1.2.1 ikke trengs, avtales i kontrakten for hvert
   prosjekt, ikke i løsningen. (LV-U22 s1–s2)
3. En sak som er opprettet i løsningen, kan få brev før den har fått sin topic i Catenda. (LV-U9 s1)

###### Beslutningsdel

4. Leveringen til Catenda venter til saken har fått topicen, og brevet leveres da til den. Topicen er
   sakens og endres ikke. Brevet og vedleggene er frosset da brevet ble lagret (E6 punkt 6).
   (LV-U9 s3–s4)
5. Løsningen sender ingen e-post. Hvordan motparten får beskjed fra prosjekthotellet, avklares i
   #1175. (LV-U22 s3–s4)

###### Endret innhold

- **E1 Fristene.** «Regner bindingen og akseptfristen fra sendingen» i LV-U9 gjelder ikke lenger
  (HF-U23 E8). Punkt 1 viser til HF-U23.
- **E2 Forholdene.** LV-U9 og LV-U22 presiserer LV-U7, som er samlet i HF-U23. Forholdet går til
  HF-U23. LV-U9 presiserer KT-U3 (KT-U12, «Forholdene») og LV-U22 presiserer LV-U13; de føres videre.

**Samler:** LV-U9 og LV-U22.

## Utkastet til E6: brevet, det som fryses og leveringen

Samlevedtaket er et *vedtak* med beslutningsdel og designdel.

1. Et brev er fra én part, og det er det autoritative uttrykket for partens standpunkt. Det kan
   inneholde utsagn i flere spor: byggherren kan i samme brev svare på grunnlag, vederlag og frist,
   gjøre innsigelser etter punkt 5 og sende en forespørsel etter punkt 33.6.2, og totalentreprenøren
   kan i samme brev sende krav, varsel, aksept og trekk. Hvert svar gjelder én kravversjon, og en
   aksept gjelder ett svar (KA-U1). (MM-U10 s1–s4; B-03 hovedvalg s1, uten «ett spor»)
2. Punkt 5 første ledd krever at varsler, krav og svar fremsettes skriftlig, ikke at hvert av dem står
   i et eget brev. (MM-U10 s5)
3. I et brev løsningen sender, godkjenner avsenderen brevteksten løsningen lager av brevets utsagn,
   og det er den teksten som fryses som brevet. Teksten avsenderen godkjenner, og teksten som fryses,
   er den samme. (LV-U2 s1–s2) Et sendt brev følger MM-U60 punkt 1.
4. Et dokument som leveres, er en tro gjengivelse av den frosne teksten. (LV-U2 s3)
5. Korrespondanse sendt utenfor løsningen (OV-U123) blir ikke et eget dokument i Catenda, fordi den
   alt er sendt. Brevet som ligger ved, lagres i Catenda som vedlegg. (LV-U11 s1–s2; E3)

###### Beslutningsdel

6. Det som skal leveres for et brev, brevteksten og vedleggene, fryses i leveringsoppdraget i samme
   transaksjon som hendelsen. Dokumentet lages bare av det som er frosset. Det kan lages etter at
   brevet er lagret, og det bevares fra første gang det lages. (LV-U1 s1; LV-U2 s4 og Følge)
7. Et nytt leveringsforsøk sender samme brev, vedlegg og dokument og skaper ingen ny erklæring.
   Hvert leveringsforsøk, hver feil og hver kvittering dokumenteres for seg, og et lagret oppdrag
   beviser ikke at brevet er levert til prosjekthotellet eller mottatt av motparten. (LV-U1 s2–s3; LV-U2 s4; spørsmål 6)
   Leveringstjenesten tolker ikke journalen for å finne hva som skal leveres (B-20 punkt 3).
   (LV-U1 s4–s5)
8. Hvert brev som leveres til Catenda, blir ett dokument der, også når det har utsagn i flere spor,
   og leveres samlet slik det er lagret og frosset. Dokumentet revideres ikke, heller ikke ved en
   retting (MM-U59 punkt 2). Dokumentnøkkelen, navnestandarden og avstemmingen etter tapt svar fra
   Catenda velges av utviklerne innenfor dette (#310). (B-03-DOKUMENT s1–s4)

###### Designdel

- Visningen sier at korrespondanse sendt utenfor løsningen er sendt utenfor løsningen, ikke at
  levering mangler. (LV-U11 s3)

###### Endret innhold

- **E1 «Ett spor».** B-03 hovedvalg s1 sier én part og ett spor. MM-U10 tok «ett spor» ut 09.10.
- **E2 Saksrapporten.** B-03 hovedvalg s2–s3 gjelder saksrapporten, som er pensjonert (#140). De har
  ingen bruk og tas ikke med.
- **E3 Registrert brev.** «Et registrert brev» i LV-U11 er korrespondanse sendt utenfor løsningen
  etter OV-U123.
- **E4 Python.** «Python» og «B-17» i LV-U1 og LV-U2 er leveringstjenesten etter B-20 punkt 3 (E9
  der). LV-U1 s5 (hvordan Python henter oppdraget) er avgjort i B-20 punkt 3.
- **E5 Hva som fryses med brevet.** Hodet, profilen og navnene står i E7 punkt 4 og LV-U25 og LV-U26.

**Samler:** B-03 hovedvalg (`B-03-HOVEDVALG`), B-03-DOKUMENT, MM-U10, LV-U1, LV-U2 og LV-U11.

## Utkastet til E7: brevhodet, underskriften og merkingen

Samlevedtaket er et *vedtak* med designdel og beslutningsdel.

###### A. Formularet og hodet

1. I prosjekter som bruker løsningen, er brevet løsningen lager byggherrens formular for varsler,
   krav og svar etter Del II pkt. B.2.4. (LV-U23 s1)
2. Hodet følger pkt. D.1.2: prosjektnavn og kontrakt, dokumentkoden, emne med sakens tittel,
   avsender med part, organisasjon og navn, motpartens representant som mottaker, hvor kopi er
   sendt, og underskriverne etter punkt 5. (LV-U23 s2)
3. Hver parts representant etter punkt 9 står i prosjektinnstillingene med navn og stilling, og drift
   fører opplysningene etter skriftlig melding fra parten, slik fullmaktene føres (GFK-U1). Bytter en
   part representant, gjelder endringen nye brev. (LV-U60)
4. Hodet fryses med brevteksten når brevet sendes, også mottakeren, kopilisten og navnene i
   underskriften, og brevet viser det samme som da det ble sendt. (LV-U23 s3; LV-U60; LV-U61;
   LV-U64; LV-U69)

###### B. Underskriften og avsenderen

5. Brevet har én eller to underskrivere, slik godkjenningen faktisk ble gjort: den som utarbeidet
   svaret, og den som godkjente det med fullmakt til svaret. Avsenderen i journalen er den som har
   fullmakten, og den som utarbeidet svaret, står i brevet som saksbehandler. (LV-U15; LV-U67;
   LV-U68; E2)

###### C. Merkingen

6. Saken får koden fra sitt første brev, med løpenummer per kode i kontrakten (pkt. D.1.2.5):
   KOE-nn når totalentreprenøren oppretter saken, EO-nn når byggherren gjør det. Hvert brev i
   saken, også byggherrens svar, merkes med sakens kode og brevets nummer i saken. BR brukes for brev
   som ikke hører til en sak. (LV-U44 s2–s3 og s5; LV-U24 s2)
7. Merkingen står i brevhodet og i dokumentnavnet i prosjekthotellet og fryses når brevet sendes.
   (LV-U24 s3; LV-U44, svar «2 A» i Følge)
8. Vår ref. er brevets dokumentkode. Deres ref. er kodene til motpartens brev som brevet svarer på,
   godtar eller bestrider, slik utsagnene i brevet uttrykkelig viser til dem (HF-U1). En ny
   kravversjon viser under Deres ref. koden til byggherrens gjeldende svar på kravversjonen den
   erstatter, uten at totalentreprenøren angir det: det siste svaret byggherren har gitt på den,
   slik det står når den nye kravversjonen sendes. Har byggherren ikke svart, står ingen kode.
   Innlegg står ikke under Deres ref. (LV-U27 s1–s2; LV-U49; LV-U50; LV-U51)
9. Byggherrens saksnummer i Websak vises i referanselinjen i alle brev i prosjektet, sammen med
   dokumentkoden: i byggherrens brev under Vår ref., i totalentreprenørens under Deres ref. (LV-U28)
10. Sakens kode står i brevtittelen. Saksbehandleren står med navn, og telefon bare når løsningen
    har den. (LV-U27 s3–s4)

###### Beslutningsdel

- Saken får koden og løpenummeret når det første brevet fra løsningen i saken sendes. Nummeret er det
  neste ubrukte for koden i prosjektet, og nummerrekken har ingen hull. Har en annen sak fått nummeret
  før brevet sendes, sendes brevet ikke, og avsenderen godkjenner brevet med det nye nummeret.
  Korrespondanse sendt utenfor løsningen gir ikke saken en kode, og til det første brevet er sendt,
  har saken ingen kode. En registrert endringsordre følger EO-U39. (LV-U46; LV-U47; EO-U36, samlet i
  EO-U39)
- Løpenummeret har tre sifre og brevnummeret to: K201-KOE-005-03. (LV-U48)
- Kontraktsforkortelsen og saksnummeret i Websak står i prosjektinnstillingene, og prosjektinnstillingene
  har en fast kopiliste med navn og organisasjon for hver side, som drift fører. Brevet viser listen
  for avsenderens side. (LV-U24 s4; LV-U44 s6; LV-U28; LV-U61)
- Feltet for unntatt offentlighet tas ikke med før #1060 er avklart. (LV-U27 s5)

###### Designdel

- Henvisningsformen til et tidligere brev følger LV-U53. Oppsettet og profilen følger LV-U25, LV-U59
  og LV-U66, og skriften og logoen LV-U26 og LV-U58.

###### Endret innhold

- **E1 Løpenummeret.** LV-U24 s1 (eget løpenummer per kode, BR for byggherrens svar) er endret av
  LV-U44. «KOE-nn» i punkt 6 har formen i LV-U48.
- **E2 To signaturer.** LV-U15 s1 sier to. LV-U67 og LV-U68 sier én eller to, slik godkjenningen
  faktisk ble gjort, og at to ikke stopper sendingen (K5).
- **E3 Arkivsaksnummeret.** LV-U27 s5 om arkivets saksnummer er endret av LV-U28.
- **E4 Unntaket i invarianten.** LV-U69 viser til «AGENTS.md». Unntaket står i `CLAUDE.md`, under
  sikkerhetsinvariantene.
- **E5 Henvisningen.** «‹brev <n> i sak KOE-17›» i LV-U44 s4 er endret av LV-U53 (design).

**Samler:** LV-U15, LV-U23, LV-U24, LV-U27, LV-U28, LV-U44, LV-U46, LV-U47, LV-U48, LV-U49, LV-U50,
LV-U51, LV-U60, LV-U61, LV-U64, LV-U67, LV-U68 og LV-U69.

## Spørsmålene

Lagret ordrett før de sendes til orkestratoren. 1 gjelder framgangsmåten. 2–6 gjelder rettsregler
og stilles som nummerert liste.

> **1. Delingen (prosess).** Tema 24, 26 og 30 samles i fire samlevedtak: E4 for det egne varselet
> etter punkt 33.4, E5 for når brevet er sendt, E6 for brevet, det som fryses og leveringen, og E7 for
> brevhodet, underskriften og merkingen. Designpostene og LV-U26 med LV-U58 blir stående.
> - **A (anbefalt):** Fire samlevedtak, E4–E7, lagt fram samlet og ført i én vedtaks-PR. Postene
>   under «Står» blir stående.
> - **B:** Tre samlevedtak, ett per tema, med E6 og E7 som ett.
>
> Styrer: antall poster, og hvor regelen for brevet som dokument leses.

> **2. Tilslutning til E4 (juridisk).** Samlevedtaket for det egne varselet etter punkt 33.4
> (foreløpig VS-U93) gjelder med E1–E4. Forhold: samler VS-U15 og VS-U16. Brevteksten blir designdel
> etter svar 1 A 14.11.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for det egne varselet leses.

> **3. Tilslutning til E5 (juridisk).** Samlevedtaket for når brevet er sendt, og kanalen (foreløpig
> LV-U86) gjelder med E1–E2. Forhold: samler LV-U9 og LV-U22.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for når brevet er sendt, leses.

> **4. Tilslutning til E6 (juridisk).** Samlevedtaket for brevet, det som fryses og leveringen
> (foreløpig LV-U87) gjelder med E1–E5, og med punkt 7 etter svaret på spørsmål 6. Forhold: samler
> postene under «Samler», og raden «B-03 hovedvalg» får et anker.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for brevet og det som fryses, leses.

> **5. Tilslutning til E7 (juridisk).** Samlevedtaket for brevhodet, underskriften og merkingen
> (foreløpig LV-U88) gjelder med E1–E5. Forhold: samler postene under «Samler».
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for brevhodet, underskriften og merkingen leses.

> **6. Hva et lagret leveringsoppdrag beviser (juridisk).** Et brev fra løsningen er sendt når det
> er lagret i løsningen (E5 punkt 1). Regelen fra 10.10 om leveringsoppdraget sier at et lagret
> oppdrag ikke beviser at brevet er sendt eller mottatt. Den ble skrevet før regelen om når brevet
> er sendt, og gjelder leveringen til prosjekthotellet.
> - **A (anbefalt):** E6 punkt 7 sier at et lagret oppdrag ikke beviser at brevet er levert til
>   prosjekthotellet eller mottatt av motparten. Forhold: endrer regelen fra 10.10 for ordet «sendt»;
>   i tråd med E5 punkt 1.
> - **B:** E6 punkt 7 sier som før at et lagret oppdrag ikke beviser at brevet er sendt eller mottatt,
>   og «sendt» leses som levert. Forhold: ingen endring.
>
> Styrer: om det står to betydninger av «sendt» i samlevedtakene.

## Kodefunn og berørte forløp

(Fylles etter kontrollene.)

## Verifikasjon og grenser

- **Kjørt og observert:** `--vis` og `--kjede` for postene under «Grunnlaget» på `bf4958e`, og
  punktene i OV-U123 (11, 18, 22), VS-U86 (4) og MM-U60 (1, 21–24) i vedtaksfila.
- **Lest av subagentene:** setningsdelingen og oppslagene mot samlevedtakene. Det de merket som
  slutning, er ikke kontrollert av økta.
- **Ikke kontrollert:** sitatene fra NS 8407 (ingen er brukt), at ID-ene i K7 er ledige når postene
  føres, og om forløpene bør vise til samlevedtakene.
