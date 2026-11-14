# Vurdering: samlevedtak for påberopelsen av forholdet – ny versjon, forholdet står og ny sak

Dato: 14.11.2026. Kontrollert commit: `86c657c` (grenen `claude/vedtaksregister-steg4-1534`).
Del av #1534 (steg 4, trinn 2).

Utgangspunktet er raden «Grunnlagskravet: ny versjon, hjemmel og ny sak» i tabellen «Kjedene» i
[vurderingen av klassifiseringen](vurdering-klassifisering-2026-11-03.md). Tilstanden er lest med
`python3 docs/verktoy/vedtaksregister.py --vis` og `--kjede`, og de samlede tekstene i
[vedtaksfila](../plans/vedtak.md). Begrepet følger oppdragsgiver 14.11, ordrett: «NB: herer ikke
grunnlagslrav. Det er forholdet som er påberopt. forholdet gir grunnlag for krav om
vederlagsjustering òg fristforlengelse», [OV-U82](../plans/vedtak.md#ov-u82) og
[GR-U31](../plans/vedtak.md#gr-u31). Gamle tekster er sitert ordrett, også der de sier «grunnlaget».
«Gruppen» er hovedkategorien og «forholdet» underkategorien, slik [OV-U77](../plans/vedtak.md#ov-u77)
bruker ordene.

NS 8407 punkt 32.2 første setning, ordrett: «Mottar totalentreprenøren pålegg som angitt i 32.1, skal
han uten ugrunnet opphold varsle byggherren dersom han vil påberope seg dette som en endring.»
Kontrakten sier ikke noe om en ny versjon av påberopelsen eller om å bytte forhold; regelen er
vedtakenes.

## Postene i kjeden

| Post | Tilstand | Innholdet nå | Forholdene som gjelder kjeden |
| --- | --- | --- | --- |
| GR-U1 | gjeldende | Ny versjon åpner sporet. s2 delvis strøket (KA-U52 E6); s3 står i GR-U34 punkt 14 | snevret inn av HF-U8 (samlet), GR-U19, GR-U20; presisert av GR-U23, HF-U21, GR-U26 (samlet), GR-U34; endret av KA-U52 |
| GR-U2 | opphevet 28.10 av MM-U34 | — | endret av GR-U22 (raden i `KJENTE_FORHOLD_TIL_OPPHEVET`) |
| GR-U16 | gjeldende, klasse design | Endringsordrens dato eller nummer er påkrevd | endret av OV-U4 og OV-U80 (begge samlet), presisert av OV-U55 |
| GR-U19 | gjeldende | Gruppen står; forholdet kan endres når punkt 32.2 gjelder likt; ellers trekk og ny sak | snevrer inn GR-U1; endret av GR-U22; presisert av OV-U57 |
| GR-U21 | opphevet 16.10 av GR-U22 | — | — |
| GR-U22 | gjeldende | Forholdet står; annet forhold i ny sak med overføring | endrer GR-U19, GR-U2 (opphevet); opphever GR-U21; snevrer inn KA-U22; snevret inn av OV-U54 (samlet), MM-U52; utvidet av OV-U55; presisert av OV-U57; VS-U45 bygger på |
| HF-U8 | samlet i HF-U23 | Regelen står i HF-U23 punkt 9 | snevrer inn GR-U1 |
| HF-U21 | gjeldende | Ny versjon med samme forhold endrer ikke bindingen i svar på vederlag og frist | endrer HF-U5; presiserer HF-U8, GR-U1; endret av MM-U34. HF-U29 punkt 12 viser hit |
| KA-U22 | gjeldende | Brevtekstene for trekk | snevret inn av GR-U22; endret av LV-U41 og KA-U51 |
| OV-U4, OV-U80 | samlet (OV-U80 i MM-U52) | Registrering; endringsordren i GR-U16 | endrer GR-U16 |
| OV-U51 | opphevet 25.10 av OV-U52 | — | — |
| OV-U52 | opphevet av MM-U41 og MM-U52 | Datoen står i MM-U52 punkt 10 | — |
| OV-U54 | samlet i KA-U52 | Det som står, er KA-U52 punkt 3, 4 og 9 (E3) | snevrer inn GR-U22 |
| OV-U55 | gjeldende, endret fire ganger | s1–s4 om forholdet og ny sak står; utdyping og betegnelse er tatt av MM-U52 punkt 14–15 | endrer OV-U54; utvider GR-U22; snevrer inn MM-U21 (opphevet); endret av MM-U34, LV-U53, KA-U52, MM-U52 |
| OV-U57 | gjeldende | Ny sak i første versjon: opprettelse uten trekk og uten overføring | presiserer GR-U22 og GR-U19; VS-U45 bygger på |
| rad-073 (B-13) | gjeldende | Endret underkategori etter svar krever nytt svar | utvidet av GR-U1; snevret inn av GR-U2 (opphevet) og GR-U19 |
| VS-U45 | gjeldende; innholdet står i VS-U43 punkt 6 | Brevet i den gamle saken kan oppgis som eget varsel i den nye | bygger på GR-U22 og OV-U57; snevrer inn VS-U37 (opphevet) |
| KA-U52 | gjeldende (samlevedtak) | Punkt 1–10 om kravversjon; punkt 10 viser til MM-U52 punkt 14 for hjemmelen | endrer GR-U1, OV-U55 |
| MM-U52 | gjeldende (samlevedtak v2) | Punkt 10 (datoen), 14 (hjemmelen), 15 (utdyping) | snevrer inn GR-U22; endrer OV-U54, OV-U55, OV-U56 |
| GR-U34, HF-U23 | gjeldende (samlevedtak) | GR-U34 punkt 12 og 14; HF-U23 punkt 9 | presiserer GR-U1 / samler HF-U8 |
| LV-U56 | gjeldende | Brevteksten for en ny versjon av påberopelsen | endrer KA-U52 punkt 4 for forholdet |

## Motsigelsene og uklarhetene

**M1. Regelen om at forholdet står, har fire hjem.** GR-U22: «Når TE har sendt grunnlaget, kan TE
ikke endre hjemmelen: hovedkategorien og underkategorien står.» OV-U55: «Når TE har sendt grunnlaget,
står hovedkategorien, underkategorien og, i underkategorien endringsordre, hvilken endringsordre
kravet bygger på.» MM-U52 punkt 14 gjentar OV-U55 nesten ordrett, og KA-U52 punkt 10: «En ny
grunnlagsversjon kan ikke endre datoen TE har oppgitt etter VS-U26, eller hjemmelen, etter MM-U52
punkt 10 og 14.» Regelen står dermed i et samlevedtak for retting, som den ikke handler om.

**M2. GR-U19 står med en regel GR-U22 snudde, og med et trekk OV-U57 utelukker.** GR-U19: «underkategorien
kan bare endres når § 32.2 gjelder likt før og etter» og «Vil TE omklassifisere ut over det, trekker TE
kravet og sender en ny sak.» GR-U22 sier at underkategorien står, også når punkt 32.2 gjelder likt
(Følge: «også når § 32.2 gjelder likt»). OV-U57: «Det er opprettelse av en ny sak, ikke overføring
eller retting av den gamle, og den skjer uten trekk.» GR-U19 er ført som «endret» av GR-U22, men ingen
post sier hvilke setninger i GR-U19 som gjelder.

**M3. Overføringen er vedtatt i GR-U22, men utsatt og uavklart.** GR-U22: «Vil TE påberope en annen
hjemmel, oppretter TE en ny sak og overfører kravene dit. Overføringen er ikke et avkall, og den nye
saken viser til varselet i den gamle.» OV-U57: «Overføringen tilbys først når virkningen er vedtatt
(#569).» OV-U55: «Om enigheten og bindingen følger kravene til en ny sak, avgjøres særskilt.»
VS-U43 E2: «om et «i tide» eller en binding i den gamle saken følger med til den nye; det avgjøres
særskilt etter OV-U55 og OV-U57.» Tre poster utsetter det samme spørsmålet, og ingen post avgjør det.

**M4. OV-U55 sier at en ny versjon avslår svaret på forholdet; HF-U23 sier at løsningen ikke sier
det.** OV-U55: «En ny grunnlagsversjon med samme hjemmel er fortsatt mulig der GR-U22 og sperrene etter
enighet (KA-U7, OV-U3) tillater den, og den avslår byggherrens tilbud i grunnlagssporet etter
avslagsregelen.» HF-U23 punkt 9: «Løsningen sier ikke at svaret er avslått eller har falt bort, og
avgjør ikke om byggherren fortsatt er bundet av svaret (MM-U12).» KA-U52 E3 strøk den tilsvarende
setningen i OV-U54 («I løsningen er en ny kravversjon TEs avslag …»), og E4 leste bare «sperrene etter
enighet» i OV-U55 på nytt. Avslagsleddet i OV-U55 står derfor ordrett.

**M5. B-13 (rad-073) har ikke noe å gjelde for.** Raden: «B-13 endret underkategori etter byggherrens
svar på grunnlaget krever nytt svar.» GR-U22 Følge: «underkategorien kan ikke lenger endres, så raden
i B-13 om endret underkategori (05.10, #215) får ikke noe å gjelde for.» Raden er likevel gjeldende.

**M6. GR-U1 er tømt, men står som gjeldende.** s1 står i KA-U52 punkt 1 og 3, s2 er delvis strøket
(KA-U52 E6) og ellers i HF-U23 punkt 9, og s3 står i GR-U34 punkt 14. Leddet «også når underkategorien er uendret» forutsetter
at underkategorien kan endres, og det kan den ikke (M2).

**U1. Endringsordrens betegnelse.** GR-U22 Følge: «Endringsordrens dato eller nummer kan rettes i en
ny versjon med samme underkategori.» Det motsier OV-U55 s1 og MM-U52 punkt 14, men Følge er ikke
vedtakstekst, og kjernen følger OV-U55 (kodefunn). Merknaden er foreldet.

**U2. HF-U21 viser til HF-U8, som er samlet i HF-U23.** HF-U21: «Bindingen varer som etter HF-U5 og
HF-U8.» HF-U29 punkt 12 viser tilbake: «… følger HF-U21 og kjeden for grunnlagskravet.»

## Utkast til samlevedtaket

Samlevedtaket er et *vedtak*. Kildene står i parentes; «s» er setningen i posten. Der en regel har et
annet gjeldende hjem, viser punktet dit.

###### A. Ny versjon av påberopelsen

1. Hver oppdatering totalentreprenøren sender av påberopelsen av forholdet, er en ny versjon av
   påberopelsen. Den følger samlevedtaket for kravversjon (KA-U52 punkt 1–10). (GR-U1 s1; KA-U52
   punkt 1)
2. Sender totalentreprenøren en ny versjon, venter forholdet på byggherrens nye svar. At svaret
   på den tidligere versjonen ikke kan godtas, er beslutningsdelen i HF-U23 punkt 9. (GR-U1 s2;
   HF-U23 punkt 9; E1)
3. Løsningen sier ikke at en ny versjon av påberopelsen avslår byggherrens svar på forholdet.
   (HF-U23 punkt 9; svar på spørsmål 2; E4)
4. En ny versjon av påberopelsen med samme forhold endrer ikke bindingen i byggherrens svar på
   vederlag eller fristforlengelse og er ikke et avslag på dem (avtaleloven § 5). Bindingen varer
   som etter HF-U5 og HF-U23. (HF-U21 s1–s3; U2) At et subsidiært standpunkt forblir
   subsidiært (HF-U21 s4), står i punkt 5.
5. Hva en ny versjon gjør med et svar på vederlag eller frist og med en betinget enighet, står i
   GR-U34 punkt 12 og 14. Hva den gjør med et frafall, står i GR-U20 og GR-U23. (GR-U1 s3; GR-U34;
   E1)
6. Brevet med en ny versjon følger LV-U56. (LV-U56)

###### B. Forholdet står

7. Når totalentreprenøren har sendt påberopelsen, står forholdet og gruppen det hører til, og i en
   påberopelse av en endringsordre etter punkt 31.3, hvilken endringsordre påberopelsen gjelder. En
   ny versjon kan ikke endre dem. Totalentreprenøren kan sende en ny versjon med samme forhold, for
   eksempel med en utfylt beskrivelse. (GR-U22 s1–s2; OV-U55 s1–s2; MM-U52 punkt 14; E2)
8. Datoen for når pålegget ble mottatt eller totalentreprenøren ble klar over forholdet, følger
   MM-U52 punkt 10, og betegnelsen på endringsordren MM-U52 punkt 14 siste setning. (OV-U55 s3)

###### C. Et annet forhold går i en ny sak

9. Vil totalentreprenøren påberope et annet forhold eller en annen endringsordre, oppretter
   totalentreprenøren en ny sak. Det er opprettelse av en ny sak, ikke overføring eller retting av
   den gamle, og den skjer uten trekk. Den gamle saken bevares, og sakene viser til hverandre.
   (GR-U22 s3; OV-U55 s4; OV-U57 s1–s3; E3)
10. Den nye saken endrer ikke krav, svar eller enigheter i den gamle saken. Det som er sendt,
    svart eller registrert i den gamle saken, følger ikke med til den nye i løsningen, og
    løsningen avgjør ikke om det gjelder den nye påberopelsen. Det avgjør partene. (OV-U57 s4;
    svar på spørsmål 3; E3)
11. I den nye saken kan totalentreprenøren oppgi brevet med påberopelsen i den gamle saken som
    eget varsel etter punkt 32.2, etter VS-U43 punkt 6. (VS-U45; VS-U43 punkt 6)
12. Påberopelsen i den gamle saken står til totalentreprenøren trekker den etter samlevedtaket for
    trekk, eller saken avsluttes etter de reglene som ellers gjelder. (OV-U57; KA-U51; E3)

###### Designdel

- Før sending sier skjemaet at den nye saken ikke endrer krav, svar eller enigheter i den gamle,
  og at løsningen ikke avgjør om kravet omfattes av en tidligere enighet, eller om varsling og
  frister er ivaretatt. Ordlyden står i brukerforløpet (PR #1917). (OV-U57)

###### Endret innhold

- **E1. GR-U1.** Setningene står i punkt 1, 2 og 5, og i KA-U52, HF-U23 punkt 9 og GR-U34 punkt 14.
  «også når underkategorien er uendret» og «som ved endret underkategori» gjelder ikke: forholdet
  kan ikke endres (punkt 7). GR-U1 gjelder som «Samlet i samlevedtaket for påberopelsen».
  Forholdene til GR-U1 står (ingen er til et opphevet vedtak).
- **E2. GR-U22 s1–s2, OV-U55 s1–s3 og GR-U19.** Står i punkt 7 og 8. I GR-U19 gjelder «og
  underkategorien kan bare endres når § 32.2 gjelder likt før og etter», «Skiftet ut og inn av § 32.2
  kan da ikke skje» og «trekker TE kravet og sender en ny sak» ikke (GR-U22, OV-U57). GR-U19 gjelder
  som «Samlet». **Forholdet `gr-u22 endrer gr-u2`: (b).** GR-U2 er opphevet av MM-U34 punkt 11, som
  sier det samme om forholdet («at hovedkategori og underkategori står, følger av OV-U55»), og
  samlevedtaket tar ikke innholdet i GR-U2. Forholdet har ikke noe å virke på og fjernes.
- **E3. GR-U22 s3–s4, OV-U55 og OV-U57 om ny sak.** Punkt 9–12. «og overfører kravene dit.
  Overføringen er ikke et avkall, og den nye saken viser til varselet i den gamle» i GR-U22,
  «Om enigheten og bindingen følger kravene til en ny sak, avgjøres særskilt» i OV-U55 og
  «Overføringen tilbys først når virkningen er vedtatt (#569)» i OV-U57 gjelder ikke (spørsmål 3 A).
  En overføring krever et nytt vedtak. Skjemateksten i OV-U57 er design (se designdelen). GR-U22 og
  OV-U57 gjelder som «Samlet». Forholdet «GR-U22
  snevrer inn KA-U22» bar overføringen og har ikke noe å virke på: (b). Det samme gjelder
  «avgjøres særskilt etter OV-U55 og OV-U57» i begrunnelsen til VS-U43 E2, som punkt 10 avgjør
  (samlevedtaket presiserer VS-U43 punkt 6).
- **E4. OV-U55, avslaget.** «og den avslår byggherrens tilbud i grunnlagssporet etter
  avslagsregelen» gjelder ikke (spørsmål 2 A), og «sperrene etter enighet (KA-U7, OV-U3)» leses
  etter KA-U52 E4. OV-U55 samles så langt det gjelder forholdet, endringsordren og ny sak (s1–s4).
  Resten av OV-U55 står slik MM-U34, LV-U53, KA-U52 og MM-U52 har endret det. Forholdet «OV-U55
  snevrer inn MM-U21» (MM-U21 er opphevet av MM-U52): (b). Setningen det bar, står i MM-U52 punkt
  15 (MM-U41 E5), og forholdet er MM-U52s å føre (se «Grensen mot MM-U52»).
- **E5. HF-U21.** Står i punkt 4. «HF-U8» leses som HF-U23, som samlet HF-U8. HF-U21 gjelder som
  «Samlet», og henvisningen i HF-U29 punkt 12 til «HF-U21 og kjeden for grunnlagskravet» gjelder
  samlevedtaket. HF-U21 s4 («Et subsidiært standpunkt forblir subsidiært (GR-U1)») står i GR-U34 punkt 14
  (punkt 5). Forholdene til HF-U5 og GR-U1 står.
- **E6. B-13, endret underkategori (rad-073).** Oppheves: forholdet kan ikke endres (punkt 7), så
  raden har ikke noe å gjelde for (GR-U22 Følge). Henvisningene til den gjelder punkt 7.
- **E7. KA-U52 punkt 10.** «eller hjemmelen, etter MM-U52 punkt 10 og 14» gjelder forholdet etter
  punkt 7 i dette samlevedtaket.

**Forholdene:** samler GR-U1, GR-U19, GR-U22, HF-U21, OV-U57 og OV-U55 s1–s4; opphever rad-073
(B-13 endret underkategori); endrer OV-U55 (E4) og KA-U52 punkt 10 (E7); presiserer VS-U43 punkt 6
(punkt 10) og HF-U29 punkt 12 (E5); bygger på KA-U52, HF-U23, GR-U34, LV-U56, KA-U51 og VS-U45.
GR-U16 står (klasse design) og samles ikke. GR-U20 og GR-U23 hører til frafallet og samles ikke.

## Grensen mot MM-U52

- Samlevedtaket samler ikke MM-U52 eller det MM-U52 og KA-U52 har opphevet eller samlet.
- Avgjort med versjon 3 av MM-U52: punkt 14 der viser til punkt 7 her for at forholdet står, og
  beholder setningen om betegnelsen på endringsordren. Regelen om et annet forhold står i punkt 9
  her, og versjon 3 viser dit. Datoregelen har hjemmet i punkt 10 i versjon 3, og punkt 8 her viser
  bare dit.
- «MM-U52 snevrer inn GR-U22» står. Et samlet vedtak beholder forholdene sine.

## Spørsmålene til oppdragsgiver

**1. Samlevedtaket.** *Bakgrunn:* regelen om ny versjon av påberopelsen og om et annet forhold står
i seks poster og fire samlevedtak (M1, M2, M6). *Belegg:* tabellen og M1–M6.
- **A.** «Samlevedtaket for påberopelsen av forholdet gjelder med E1–E7. GR-U1, GR-U19, GR-U22,
  HF-U21, OV-U57 og OV-U55 s1–s4 gjelder som «Samlet i samlevedtaket for påberopelsen». Raden i
  B-13 om endret underkategori oppheves, og henvisningene til den gjelder punkt 7. I postene det
  samler eller endrer, gjelder setningene E1–E7 navngir, ikke lenger.»
- **B.** «Samme som A, med rettelsene du gir per punkt eller E-punkt.»
*Anbefaling:* A. *Styrer:* hvilke poster kjernen og vedtakshenvisningene (#452) viser til for
regelkoden for et endret forhold.

**2. Avslår en ny versjon av påberopelsen byggherrens svar på forholdet?** *Bakgrunn:* M4. *Belegg:*
OV-U55 («den avslår byggherrens tilbud i grunnlagssporet etter avslagsregelen») mot HF-U23 punkt 9
(«Løsningen sier ikke at svaret er avslått eller har falt bort»).
- **A.** «Løsningen sier ikke at en ny versjon av påberopelsen avslår byggherrens svar på forholdet,
  og avgjør ikke om byggherren fortsatt er bundet av det. Forhold: endrer OV-U55 (avslagsleddet
  faller).» At svaret ikke kan godtas, står i beslutningsdelen i HF-U23 punkt 9.
- **B.** «En ny versjon av påberopelsen er totalentreprenørens avslag på byggherrens svar på
  forholdet, og svaret faller bort som tilbud. Det gjelder bare forholdet, ikke svarene på vederlag
  og fristforlengelse. Forhold: endrer HF-U23 punkt 9 og KA-U52 E3 for forholdet.»
*Anbefaling:* A. Det følger KA-U52 E3 og HF-U23 punkt 9, som gjelder alle spor. B ville gjøre
forholdet til et unntak. *Styrer:* brevteksten og tilstanden etter en ny versjon (punkt 3).

**3. Hva følger med fra den gamle saken til den nye?** *Bakgrunn:* M3. GR-U22 vedtok en overføring
som «ikke er et avkall», mens OV-U57 utsatte den, og tre poster lar virkningen stå åpen. *Belegg:*
GR-U22, OV-U55, OV-U57 og VS-U43 E2, sitert i M3. Alternativene sier hva som gjelder til et eventuelt
nytt vedtak om overføring.
- **A.** «Den nye saken er en ny påberopelse. Det som er sendt, svart eller registrert i den gamle
  saken, følger ikke med i løsningen, og løsningen avgjør ikke om det gjelder den nye påberopelsen.
  Påberopelsen i den gamle saken står til totalentreprenøren trekker den eller saken avsluttes etter
  de reglene som ellers gjelder. En overføring av krav mellom saker krever et nytt vedtak. Forhold:
  endrer GR-U22 og OV-U57 (overføringen faller).»
- **B.** «Som A, men vedtaket om overføring står: når overføringen bygges, overfører
  totalentreprenøren kravene til den nye saken, overføringen er ikke et avkall, og hva som følger
  med, avgjøres i et eget vedtak før overføringen bygges.»
*Anbefaling:* A. Antakelse, ikke prøvd: en sak med annet forhold er sjelden i første versjon, og B
binder en virkning («ikke et avkall») til en handling som ikke finnes. A lar partene avgjøre det
kontrakten overlater til dem. *Styrer:* punkt 10 og 12, E3, og om #569 trenger et nytt spørsmål.

## Kodefunn

- `kjerne/spor/forhold/kommando.ts`, `kategorisperre`: avviser et annet forhold og en annen
  endringsordre (`ANNEN_HJEMMEL` og den neste avvisningen), i tråd med OV-U55 s1. Feilmeldingen sier
  «Grunnlaget er sendt …», mot GR-U31 og OV-U82 og språkfila. Det samme gjelder `datosperre`
  («En ny versjon av grunnlaget …») og `kontrollerKorrigering` («I kategorien i grunnlaget …»). Kommentaren viser til «GR-U22 og MM-U52
  punkt 14» og må vise til samlevedtaket når det er vedtatt. Lest, ikke kjørt.

## Verifikasjon og grenser

- Lest: radene med `--vis` og `--kjede` for postene i tabellen, KA-U52 (samlevedtaket med E1–E6),
  MM-U52 punkt 10–15, MM-U41 E1–E7, HF-U23 punkt 9, GR-U34 punkt 12 og 14, VS-U43 punkt 6 og E2,
  raden i `KJENTE_FORHOLD_TIL_OPPHEVET` og «Hovedregelen» i
  [vurderingen av kjente avvik](vurdering-kjente-avvik-2026-11-05.md#hovedregelen).
- Ikke lest i sin helhet: MM-U34 (bare setningen om GR-U2), HF-U29 utover punkt 12, GR-U20 og
  GR-U23. Hvilket samlevedtak som nå bærer MM-U34 punkt 11, er ikke kontrollert.
- Ikke kontrollert: at E1–E7 navngir alle setningene som faller, mot `--forhold`; at VS-U45 er tatt
  helt inn i VS-U43 punkt 6 (den står som gjeldende og samles ikke her).
- Ingen kode er kjørt.
