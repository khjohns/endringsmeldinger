# BF-02A, BF-02C og BF-02D: TE korrigerer datoen pålegget ble mottatt

Bestillingen for brukerforløpene [BF-02A](BF-02A.json), [BF-02C](BF-02C.json) og
[BF-02D](BF-02D.json): visningen for TEs korrigering av datoen, del 2 av
[#1308](https://github.com/khjohns/endringsmeldinger/issues/1308). Del 1, kommandoen
`korrigering` i kjernen, er merget i #1611. Bestillingen er skrevet før skjemaet bygges i
den ekte saksruta.

| | |
| --- | --- |
| Status | Utkast 06.11. S-1 og S-2 er besvart 05.11 og kjernen er rettet etter svarene i #1624. Arbeidet følges i [#1615](https://github.com/khjohns/endringsmeldinger/issues/1615) |
| Demoruta | `/demo/BF-02A`, `/demo/BF-02C` og `/demo/BF-02D`, med kjernen i nettleseren |
| Prototypen | [`korrigering-av-datoen.html`](../../design/prototyper/korrigering-av-datoen.html), for skjemaet for korrigeringen og det låste datofeltet i en ny grunnlagsversjon, som ingen komponent har (G-2). Versjon 3, 06.11 |
| Bygger på | [MM-U52](../../plans/vedtak.md#mm-u52) punkt 10, 11, 13 og 24 og designdelen, med svarene «1 A, 2 A» 05.11 ([MM-U51](../../plans/vedtak.md#mm-u51), [LV-U54](../../plans/vedtak.md#lv-u54)) og de lagrede navnene i [#1308](https://github.com/khjohns/endringsmeldinger/issues/1308) |

Hver opplysning under har en ID: **M** for målene, **U** for det brukeren skal finne og
forstå, **D** for domeneforventningene, **G** for gjennomføringen, **S** for de åpne
spørsmålene og **P** for produktspørsmål utenfor forløpene.

## Målene

TE vil:

- **M-1** rette en feil dato for når pålegget ble mottatt, eller når TE ble klar over
  forholdet, uten å gi opp kravet eller avslå svaret BH alt har gitt;
- **M-2** vite før sending hva brevet sier, og at det ikke endrer svaret eller utfallet;
- **M-3** finne veien til korrigeringen også når TE begynner i skjemaet for en ny versjon av
  grunnlagskravet.

BH vil:

- **M-4** se at TE har oppgitt en ny dato, hvilken dato TE oppga før, og hvilken opplysning
  svaret og påberopelsen gjaldt;
- **M-5** vite at svaret BH har gitt, står.

## Utgangspunktet

TE påberoper en irregulær endring og oppgir at pålegget ble mottatt 15.09.2026. BH svarer at
varselet etter punkt 32.2 kom for sent, og godtar subsidiært at forholdet er en endring. TE
finner ut at pålegget ble mottatt 20.09.2026.

- **BF-02A:** TE korrigerer datoen mens saken er åpen.
- **BF-02C:** TE begynner på en ny versjon av grunnlagskravet for å rette datoen og blir vist
  til korrigeringen. Etter korrigeringen gjengir den nye versjonen datoen med henvisning til
  brevet med korrigeringen.
- **BF-02D:** TE har godtatt svaret, saken er lukket etter [GR-U27](../../plans/vedtak.md#gr-u27),
  og TE korrigerer datoen ([MM-U51](../../plans/vedtak.md#mm-u51)).

## Avgrensningen

- Rettingen av varseldatoen etter punkt 8 i MM-U52 hører til #1309.
- Et krav sendt utenfor løsningen og lagt til som korrespondanse med kategorien krav, og en
  korrigering sendt utenfor løsningen, venter på registreringen i #807. Kjernen kan i dag
  ikke legge til et krav med datofeltene, og en registrert korrigering står som dokumentasjon
  og blir ikke forstått (`kjerne/format/leser.ts`). Visningen merker registreringen
  «ikke støttet ennå».
- Kunnskapsdatoen etter punkt 34.1.3 hører til #1171.
- Byggherrens svar på opplysningen, i et senere svar eller et nytt svar, er ikke et eget steg
  her. Innlegget i den lukkede saken bygges i #1377.
- Skjemaet i den ekte saksruta, med `saksrute.ts`, bygges i en egen byggeøkt etter
  bestillingen.

## Arbeidsmåten

| Steg | Hvem | Hva brukeren gjør | Hva brukeren ser |
| --- | --- | --- | --- |
| 1 | TE | Åpner saken etter svaret | Datoen TE oppga i grunnlagskravet, med handlingen «Korriger datoen» ved den (U-1). `#saken` |
| 2 | TE | Velger «Korriger datoen» | Utkastet: den gjeldende opplysningen og brevet den står i, ett datofelt og forklaringen (U-2). En uendret dato stoppes når TE går videre. `#korrigering`, `#uendret` |
| 3 | TE | Skriver den nye datoen, velger «Se brevet før sending» og sender fra brevkontrollen | Brevet ordrett i brevkontrollen, som for de andre brevene (U-3), og deretter kvittering med brevet og at svaret står (U-4). `#sendt` |
| 4 | BH | Åpner saken | Brevet med korrigeringen ved grunnlagskravet, den nye og den tidligere datoen, og at saken ikke venter på BH (U-5, U-6). `#bh` |
| 2C | TE | Begynner på en ny versjon av grunnlagskravet | Datoen står låst som TEs siste opplysning, med lenken «Korriger datoen i et eget brev» (U-7). Etter korrigeringen gjengir versjonen datoen med henvisning til brevet. `#ny-versjon`, `#ny-versjon-etter` |
| 2D | TE | Åpner saken etter at TE har godtatt svaret | «Korriger datoen» står ved datoen, med at korrigeringen ikke endrer utfallet og at BH kan ta stilling i et innlegg (U-1, U-6). Kvitteringen og BHs side sier at saken står lukket og at utfallet ikke endres. `#lukket`, `#korrigering`, `#sendt`, `#bh` |

## Det brukeren skal finne og forstå

- <a id="u-1"></a>**U-1** TE finner handlingen ved datoen i grunnlagskravet, ikke bare i
  handlingsmenyen. Etter en korrigering står handlingen ved den siste opplysningen.
- <a id="u-2"></a>**U-2** Skjemaet sier hvilken opplysning som korrigeres, med brevet og
  datoen, og at påberopelsen og svaret står som de ble sendt.
- <a id="u-3"></a>**U-3** TE ser brevteksten ordrett før sending, også henvisningen til
  brevet med opplysningen. En dato som er uendret eller etter dagens dato, stoppes i skjemaet
  med en melding som sier hva som hindrer.
- <a id="u-4"></a>**U-4** Etter sending ser TE at datoen nå er TEs siste opplysning, og at
  svaret og påberopelsen står.
- <a id="u-5"></a>**U-5** Begge ser den siste og de tidligere opplysningene, og hvilken
  opplysning svaret gjaldt. Ingenting i visningen sier at varselet nå kom i tide.
- <a id="u-6"></a>**U-6** BH ser at svaret står som det ble sendt. BH kan ta stilling til den
  nye datoen i et senere svar, i et nytt svar eller, i en lukket sak, i et innlegg.
- <a id="u-7"></a>**U-7** I skjemaet for en ny grunnlagsversjon står datoen låst, med
  teksten den nye versjonen får, og en vei til korrigeringen som ikke kaster det TE har
  skrevet.

## Domeneforventningene

- **D-1** Korrigeringen er et eget brev med henvisning til brevet med opplysningen. Den er
  ikke en ny kravversjon og avslår ikke BHs svar. Teksten er den ordrette teksten i punkt 10
  ([MM-U52](../../plans/vedtak.md#mm-u52), med [LV-U53](../../plans/vedtak.md#lv-u53) og
  [LV-U35](../../plans/vedtak.md#lv-u35)).
- **D-2** Den nye opplysningen gjelder straks som TEs siste opplysning, uten BHs godkjenning,
  også når datoen er senere. Et svar BH alt har gitt, står med virkningen det hadde, og en
  påberopelse BH alt har fremsatt, står med tidspunktet. Sporet venter ikke på et nytt svar
  (MM-U52 punkt 10–11, [VS-U46](../../plans/vedtak.md#vs-u46)).
- **D-3** Løsningen avgjør ikke hvilken dato som er riktig, når varslingsfristen begynte å
  løpe eller om varselet var rettidig (MM-U52 punkt 11, [MM-U50](../../plans/vedtak.md#mm-u50)
  punkt 6).
- **D-4** Korrigeringen avvises når datoen er uendret (`DATOEN_ER_UENDRET`), når den ikke
  gjelder TEs siste opplysning (`UGYLDIG_KORRIGERING`), når datoen er etter brevets dato, og i
  underkategorien endringsordre (`INGEN_DATO_I_KATEGORIEN`). Arbeidsvalgene står i
  [#1308](https://github.com/khjohns/endringsmeldinger/issues/1308#issuecomment-6656493872).
- **D-5** En ny grunnlagsversjon kan ikke endre datoen og avvises med
  `DATOEN_KAN_IKKE_ENDRES`. Etter en korrigering sier den: ‹Totalentreprenøren opplyser at
  pålegget ble mottatt <dato>, slik totalentreprenøren oppga i brev <merking> av <dato>.›,
  med det siste brevet med en korrigering ([LV-U54](../../plans/vedtak.md#lv-u54), samlet i
  MM-U52 punkt 10).
- **D-6** I en sak som er lukket etter GR-U27, godtas korrigeringen og endrer ikke utfallet.
  Saken står lukket, og BH kan ta stilling i et innlegg
  ([MM-U51](../../plans/vedtak.md#mm-u51), MM-U52 punkt 24, [MM-U47](../../plans/vedtak.md#mm-u47)).

## Gjennomføringen

- **G-1** Kjernen har kommandoen, utledningen av den siste og de tidligere opplysningene
  (`datoopplysninger`, `datoopplysning` per svar), datosperren og teksten etter LV-U54.
  Kontrollene i de tre forløpene kjøres i minnet.
- **G-2** Varden viser «Korriger datoen» ved datoen i brevtråden for forholdet, og skjemaet
  (`Korrigering.svelte`) sender kommandoen gjennom brevkontrollen (#1615). Skjemaet for en ny
  grunnlagsversjon, med det låste datofeltet (U-7), er ikke bygget i Varden. Det er «Oppdater
  påberopelse» i BF-10. Skissen viser det.
- **G-3** Skjemaet for en ny grunnlagsversjon i dagens visning kopierer datoen fra det
  gjeldende kravet (`src/lib/kjernesak/paaberopelse.ts`). Etter en korrigering er det ikke
  TEs siste opplysning, så kjernen avviser versjonen med `DATOEN_KAN_IKKE_ENDRES`. Feilen er
  meldt i #1617 og rettes når skjemaet bygges.
- **G-4** Testklienten setter alltid datoen 15.09.2026 i grunnlagskravet
  (`kjerne/tester/klient.ts`). BF-02C kan derfor ikke vise en godtatt ny versjon med den
  korrigerte datoen, bare avvisningen. Teksten etter LV-U54 er prøvd i
  `kjerne/tester/brevtekst.test.ts`.
- **G-8** Kommandoen `korrigering` har forklaringen i `utdypning` (S-1, #1624).
- **G-6** Brevet med korrigeringen har tittelen etter S-2 i `UTSAGNSTITTEL` i
  `kjerne/frosset/brevtittel.ts` (#1624).
- **G-7** Varden leser datoene i brevtråden, tidslinja og vederlagssvaret fra
  `datoopplysninger` i utledningen (`datoopplysningene` og `oppgitteDatoer` i
  `src/lib/components/varden/lesing.ts`, #1615).
- **G-5** `demoruta.mjs` er skrevet for BF-01 og BF-04. Forløpene her kjøres med
  kontrollpunktene som `?punkt=`.

## Spørsmålene

Spørsmålene står ordrett i [BF-02A-sporsmal.md](BF-02A-sporsmal.md), med svarene.

- **S-1** Om brevet med korrigeringen kan ha TEs forklaring i fritekst. Besvart 05.11: A, en valgfri forklaring under den vedtatte teksten. Føres som vedtak av orkestratoren.
- **S-2** Tittelen på brevet med korrigeringen (G-6). Besvart 05.11: A, «Korrigering av datoen i sak <kode>». Føres som vedtak av orkestratoren.
- **S-3** Hvor handlingen står (U-1). Designvalg, prøves på brukere.

## Produktspørsmål utenfor forløpene

- **P-1** Et krav og en korrigering sendt utenfor løsningen (#807).

## Endringer

| Dato | Grunnlag | Hva |
| --- | --- | --- |
| 05.11.2026 | #1308, MM-U52, svarene «1 A, 2 A» | Første versjon |
| 06.11.2026 | #1624, #1615, svaret på S-4b i BF-10 | G-6 og G-8 er bygget. G-7 er presisert. Skissen er versjon 3: en ny versjon avslår ikke svaret, men svaret kan da ikke godtas i løsningen. Korrigeringen går gjennom brevkontrollen, med samme utkastkort som de andre skjemaene (svaret på S-4b i BF-10). Skissen viser fortsatt brevet ved siden av skjemaet |
| 06.11.2026 | #1615 | G-2 og G-7 er bygget i Varden. U-7 venter på skjemaet for «Oppdater påberopelse» (BF-10) |
| 06.11.2026 | oppdragsgiver 06.11, tekstene i #1646 | U-2, U-6 og M-5 sier at påberopelsen og svaret står som de ble sendt, ikke at brevet ikke er en ny kravversjon eller at saken ikke venter på BH. Forståelsen i BF-02A og BF-02C er rettet likt |
