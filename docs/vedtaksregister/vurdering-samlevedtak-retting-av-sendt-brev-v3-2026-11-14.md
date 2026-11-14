# Samlevedtak: retting av sendt brev, versjon 3

Kartlegging 14.11.2026, kontrollert på `86c657c` (gren `claude/vedtaksregister-steg4-1534`).
Del av #1534. `vedtaksregister.py --sjekk` varsler at MM-U52 har fått 10 endringer etter at
temaet ble samlet, og at den neste skrives som et samlevedtak (svar 6 og 10 i #1534). Fila viser
til punktene i [MM-U52](../plans/vedtak.md#samlevedtak-retting-2) uten å gjengi dem. Den
foreløpige ID-en for versjon 3 settes når posten føres. Fila skriver ikke i `vedtak.toml`.

**Begrepet.** Nye setninger sier «påberopelsen av forholdet» og «forholdet» (oppdragsgiver 14.11).
Gamle tekster siteres ordrett, også når de sier «grunnlagskravet».

**Grensen.** Versjon 3 tar med endringene av MM-U52 og det som trengs for å lese regelen av ett
vedtak. Den utvider ikke det MM-U52 sier om GR-U22 og OV-U55 (kjeden for påberopelsen kartlegges
for seg i [vurderingen av påberopelsen](vurdering-samlevedtak-paaberopelsen-2026-11-14.md)).
Datoregelen har hjemmet i punkt 10 her, og punkt 8 i det samlevedtaket viser hit. Punkt 14 viser
dit (spørsmål 3). **Prinsippet 14.11** (under føring i PR #1917): «Vedtak må angi budskapet - men
ikke konkret ordlyd». Punktene versjon 3 endrer, sier budskapet; titler og brevtekst står i
designdelen.

## De 10 endringene

Sju poster har forhold direkte til MM-U52 (`--kjede`), og tre står i kjeden under VS-U59: 7 + 3 = 10.

| Post | Forhold | Hva den endrer i MM-U52 |
| --- | --- | --- |
| EO-U39 (05.11) | presiserer | Punkt 6: spørsmål 3, «Forhold: … presiserer MM-U52 punkt 6». Opphever EO-U34 og EO-U38, som punkt 20 og 22 viser til («EO-U34 punkt 12»). Punkt 68 der har rettingen av varseldatoen i en lukket sak |
| KA-U52 (05.11) | presiserer | Punkt 19 og 20: punkt 5 i samlevedtaket for kravversjon, om aksepten etter en ny kravversjon |
| LV-U55 (05.11) | presiserer | Punkt 10: tittelen på brevet med korrigeringen |
| MM-U53 (05.11) | presiserer | Punkt 10 og 15: forklaringen i fritekst |
| LV-U56 (06.11) | endrer | Punkt 10, LV-U54-delen: den låste teksten etter en korrigering |
| VS-U59 (10.11) | snevrer inn | Punkt 10: «Forhold: snevrer inn punkt 10 i MM-U52.» |
| VS-U60 (10.11) | presiserer VS-U59 | Punkt 10, gjennom VS-U59: også det første kravet som varsler |
| VS-U66 (11.11) | presiserer VS-U60 | Punkt 10, gjennom VS-U60: det tidligste av det egne varselet og kravet |
| VS-U70 (12.11) | presiserer VS-U66 | Ingenting i punkt 10. Den endrer VS-U43 punkt 8–10 og bruker kontrollen «slik kontrollen etter VS-U60 regner» |
| LV-U73 (13.11) | endrer | Designdelen: «brevteksten i designdelen til MM-U52» |

## Motsigelser

- **M1 LV-U56 mot punkt 10.** Punkt 10, fra LV-U54: «Brevet det vises til, er det siste brevet
  med en korrigering.» Punkt 10, fra MM-U41 punkt 10: «Den gjengir totalentreprenørens siste
  opplysning, med henvisning til brevet med korrigeringen». LV-U56: «Brevet viser ikke til tidligere brev ellers, sier ikke at
  noe erstattes». LV-U56 er senere og endrer; den nevner bare de tidligere datoene med brevene.
  Løses i E3.
- **M2 LV-U73 mot designdelen.** Designdelen: «Et nytt svar sier: ‹Svaret erstatter byggherrens
  svar i brev <merking> av <dato>.› (LV-U34)». LV-U73: «Brevet sier det uten «erstatter»» og
  «Den konkrete ordlyden avgjøres i byggingen.» Løses i E7 (spørsmål 2).
- **M3 VS-U59 mot punkt 10.** Punkt 10: «Den nye opplysningen gjelder straks …, også når datoen
  er senere.» VS-U59: «En endring av datoen i grunnlagskravet avvises når den nye datoen er
  senere enn datoen for et varsel …». Innsnevringen sier ikke om den gjelder i et spor med
  enighet og i en lukket sak, der punkt 10 og 24 sier at korrigeringen «godtas». Spørsmål 1.
- **M4 MM-U53 mot punkt 15** («En opplysning i fritekst rettes ikke etter punkt 1–5.»): ingen
  motsigelse i innhold, men punkt 15 trenger unntaket (E4).
- **M5 EO-U39 mot punkt 6** («i en KOE-sak som en endringsordre omfatter, avvises de»): EO-U39
  spørsmål 3 presiserer grensen (E1).

## Utkastet til versjon 3

Punkt 1–5, 7–9, 11–13, 16–19, 21 og 23 står som i versjon 2, med språket etter E8. Nummereringen
står. Ny tekst med kilde:

- **Punkt 6, siste del.** «Det gjelder så langt et nytt svar eller en ny kravversjon er tillatt.
  I en KOE-sak avvises de når en sendt endringsordre eller en godkjent registrering av en
  endringsordre i en EO-sak omfatter saken (punkt 12 og 13 i samlevedtaket for endringsordren),
  også etter en endringsordre registrert som svar.» (EO-U39 spørsmål 3; E1)
- **Punkt 10, budskapet i stedet for brevtekstene.** «Totalentreprenøren korrigerer datoen i et
  eget brev om korrigeringen, som nevner den nye datoen og den tidligere datoen med brevet den ble
  oppgitt i. Brevet kan ha totalentreprenørens forklaring i fritekst; forklaringen er valgfri, og
  løsningen tolker den ikke. En ny versjon av påberopelsen av forholdet kan ikke endre datoen. Den
  sier datoen som gjelder, og hver tidligere dato med brevet den ble oppgitt i.» (MM-U41 punkt 10;
  MM-U53; LV-U56; E3, E4) Titlene og brevtekstene flyttes til designdelen.
- **Punkt 10, ny setning etter «… også når datoen er senere.»** «Korrigeringen avvises når den
  nye datoen er senere enn datoen for et varsel om forholdet som er sendt eller registrert, eller
  for kravet som er det første varselet løsningen kjenner (samlevedtaket for varslingsdatoen
  punkt 6–8). Hvilket av dem som teller, står i VS-U66. Meldingen nevner begge datoene. Er
  varselet registrert som sendt utenfor løsningen, kan totalentreprenøren først rette datoen for
  varselet etter punkt 8. Er varselet sendt fra løsningen, står datoen for det fast.» (VS-U59;
  VS-U60; VS-U66; E2)
- **Punkt 15, tillegg.** «Forklaringen i brevet etter punkt 10 er ikke et innlegg.» (MM-U53,
  forholdet «snevrer inn … MM-U34 punkt 24, også slik punkt 15 viser til den»; E4)
- **Punkt 20 og 22.** «EO-U34 punkt 12» blir «punkt 12 i samlevedtaket for endringsordren».
  (EO-U39 opphever EO-U34 og EO-U38; E5) Punkt 20 får: «Hva en ny kravversjon gjør med en
  aksept i et svar, står i punkt 5 i samlevedtaket for kravversjon.» (KA-U52 svar 2 A; E5)
- **Punkt 24, tillegg.** «Rettingen av varseldatoen og kravdatoen i en slik sak står i punkt 68 i
  samlevedtaket for endringsordren.» (EO-U39 punkt 68; MM-U52 spørsmål 3; E6) Etter svaret på
  spørsmål 1 også: «Avvisningen etter punkt 10 gjelder også her.» (VS-U59; spørsmål 1 A)
- **Punkt 14.** Viser til punkt 7 i samlevedtaket for påberopelsen av forholdet for hva som står
  når påberopelsen er sendt, og til punkt 9 der for et annet forhold, og beholder: «Et forslag om
  å rette betegnelsen på endringsordren sendes som innlegg.» (MM-U41 punkt 14; spørsmål 3 C)
- **Designdelen, i stedet for setningen med ‹Svaret erstatter …›.** «Brevet med et nytt svar
  sier at svaret er byggherrens siste svar i løsningen, uten totalentreprenørens aksept, og
  bruker ikke ordet «erstatter». Ordlyden avgjøres i byggingen (LV-U73).» (LV-U73; E7, spørsmål
  2 A) Designdelen får også brevtekstene fra punkt 10: tittelen ‹Korrigering av datoen i sak
  <kode>› (LV-U55), ‹Totalentreprenøren oppgir nå at …› (MM-U41 punkt 10) og ordlyden etter
  LV-U56 for en ny versjon av påberopelsen. (E4)
- **Beslutningsdelen.** «retting av datoen i grunnlagskravet (punkt 10)» blir «korrigeringen av
  datoen i påberopelsen av forholdet (punkt 10)». (Oppdragsgiver 14.11; E8)

### Endret innhold

- **E1** punkt 6: grensen etter EO-U39 spørsmål 3 (M5).
- **E2** punkt 10: avvisningen etter VS-U59–VS-U66; «etter OV-U11» leses som punkt 8 (MM-U52 samler OV-U11).
- **E3** punkt 10: LV-U54-teksten og henvisningen til brevet med korrigeringen faller (M1; LV-U56).
- **E4** punkt 10 og 15: forklaringen (MM-U53); tittelen (LV-U55) og brevteksten fra MM-U41
  punkt 10 flyttes til designdelen (prinsippet 14.11).
- **E5** punkt 20 og 22: henvisningen til den opphevede EO-U34, og henvisningen til KA-U52.
- **E6** punkt 24: henvisningen til EO-U39 punkt 68, der punkt 25 i versjon 2 ble ført (svar 3 C).
- **E7** designdelen: ‹Svaret erstatter …› faller; budskapet står, ordlyden etter LV-U73.
- **E8** språket: «grunnlagskravet», «grunnlaget» og «ny grunnlagsversjon» blir «påberopelsen av
  forholdet» og «ny versjon av påberopelsen» i punkt 10, 24 og beslutningsdelen. Punkt 14 viser
  til samlevedtaket for påberopelsen (spørsmål 3 C).
- **Hovedregelen** (OV-U92, OV-U93) for raden `mm-u34 endrer ov-u51` i
  `KJENTE_FORHOLD_TIL_OPPHEVET`: **(b)**. Versjon 3 sier: «Forholdet ‹MM-U34 endrer OV-U51› har
  ikke noe å virke på: OV-U51 er opphevet av OV-U52, og OV-U52 av samlevedtaket.» Belegg: MM-U41
  E2, «Punkt 15 strøk en tilsvarende setning i OV-U51, men OV-U51 var alt opphevet 25.10 av
  OV-U52». De ti andre radene gjelder ikke poster versjon 3 samler eller endrer. `gr-u22 endrer
  gr-u2` hører til kjeden for påberopelsen og tas der.

### Forholdene (spørsmål 4)

Versjon 3 opphever MM-U52 (svar 4 A, fordi E1–E3 og E7 endrer innholdet), og henvisningene til
MM-U52 gjelder versjon 3 (OV-U92 (a)). Forholdene i MM-U52 føres videre. Den samler LV-U55,
MM-U53, VS-U59 og VS-U60. VS-U66 står og presiseres: første setning, «Registreringen godtas …»,
gjelder registreringen av et eget varsel (VS-U43) og har ikke noe hjem i retting; samlet ville den
enten falle bort eller stå i feil samlevedtak. Punkt 10 viser derfor til VS-U66. EO-U39, KA-U52,
LV-U56, LV-U73 og VS-U70 endrer også andre poster og står med sine forhold.

## Spørsmålene til oppdragsgiver

1. **Avvisningen i en lukket sak og etter enighet.** Bakgrunn: M3. Belegg: punkt 24, «godtas også
   korrigeringen av datoen etter punkt 10, og den endrer ikke utfallet»; VS-U59 nevner ikke
   punkt 24. Alternativer: **A** «Avvisningen etter punkt 10 gjelder også i et spor med enighet,
   når kravene er avgjort og i en lukket sak.» Forhold: snevrer inn punkt 24. **B** «I et spor med
   enighet, når kravene er avgjort og i en lukket sak godtas korrigeringen uten kontrollen mot
   varslene.» Forhold: presiserer VS-U59. Anbefaling: A. Rekkefølgen mellom datoene er den samme uansett utfall, og kjernen
   kontrollerer alt slik (kodefunn K1). Styrer: punkt 24 og om K1 er riktig.
2. **Brevteksten for et nytt svar.** Bakgrunn: M2. Belegg: LV-U73 «Den konkrete ordlyden
   avgjøres i byggingen»; HF-U29 punkt 2 har fortsatt ‹Svaret erstatter byggherrens svar i brev …›.
   Alternativer: **A** «Brevet med et nytt svar sier at svaret er byggherrens siste svar i
   løsningen, uten totalentreprenørens aksept, og bruker ikke ordet ‹erstatter›. Ordlyden avgjøres
   i byggingen.» **B** «Som A, med eksempelet ‹Dette er byggherrens nye svar. Byggherrens forrige
   svar står i brev … av …›.» Anbefaling: A; vedtaket sier budskapet (prinsippet 14.11). Styrer: E7.
3. **Punkt 14.** Bakgrunn: oppdragsgiver 14.11 og samlevedtaket for påberopelsen. Belegg: punkt 14
   «Når totalentreprenøren har sendt grunnlaget … En ny grunnlagsversjon kan ikke endre dem.»
   Alternativer: **A** «Punkt 14 står med ‹påberopelsen av forholdet› i stedet for ‹grunnlaget›.»
   **B** «Punkt 14 står uendret til samlevedtaket for påberopelsen av forholdet føres.» **C**
   «Punkt 14: Hva som står når påberopelsen av forholdet er sendt, står i punkt 7 i samlevedtaket
   for påberopelsen av forholdet, og et annet forhold påberopes etter punkt 9 der. Et forslag om å
   rette betegnelsen på endringsordren sendes som innlegg.» Anbefaling: C; regelen får ett hjem.
   Styrer: punkt 14 og E8.
4. **Forholdene.** Bakgrunn: svar 4 A og hovedregelen. Alternativer: **A** som «Forholdene» over,
   med (b) for `mm-u34 endrer ov-u51`. **B** «Som A, men VS-U59 og VS-U60 samles ikke;
   punkt 10 viser til dem.» Anbefaling: A; punkt 10 leses da av ett vedtak, og varselet starter
   på null. VS-U66 samles ikke i noen av dem (se «Forholdene»). Styrer: `folge` i den nye posten og raden i `KJENTE_FORHOLD_TIL_OPPHEVET`.

## Kodefunn

- **K1** `korrigeringEtterVarslene` i [`nyttelast.ts`](../../kjerne/kommandoer/nyttelast.ts) kalles
  for hver korrigering, uten unntak for en lukket sak eller enighet. Riktig etter 1 A, feil etter 1 B.
- **K2** [`brevtekst.ts`](../../kjerne/frosset/brevtekst.ts) har fortsatt «Svaret erstatter
  byggherrens svar i …» (LV-U73 gjelder #1834), og HF-U29 punkt 2 har samme tekst. Ikke
  kontrollert om #1834 er åpent.

## Verifikasjon og grenser

Kjørt: `--sjekk`, `--kjede MM-U52` og `--vis` for de ti postene og MM-U52. Lest i `vedtak.md`:
MM-U52, EO-U39 punkt 12, 13 og 68, KA-U52 punkt 5 og HF-U29 punkt 2.
Lest ut av koden, ikke kjørt: K1 og K2. Ikke kontrollert: tellemåten i `vedtaksregister.py` utover
summen 7 + 3; om VS-U70 bør påvirke ordlyden i punkt 10 (vår lesing: nei); kjeden for påberopelsen
(GR-U22, OV-U55). VS-U60 viser til «VS-U43 punkt 6–8», VS-U70 til «punkt 7–9»; hvilken nummerering som gjelder, er ikke kontrollert. NS 8407 er ikke sitert; ingen ny setning bygger på ordlyden der.
