# Samlevedtak: retting av sendt brev, versjon 3

Kartlegging 14.11.2026, kontrollert på `66a5d60` (gren `claude/vedtaksregister-steg4-1534`).
Del av #1534. `vedtaksregister.py --sjekk` varsler at MM-U52 har fått 10 endringer etter at
temaet ble samlet, og at den neste skrives som et samlevedtak (svar 6 og 10 i #1534). Fila viser
til punktene i [MM-U52](../plans/vedtak.md#samlevedtak-retting-2) uten å gjengi dem. Den
foreløpige ID-en for versjon 3 settes når posten føres. Fila skriver ikke i `vedtak.toml`.

**Begrepet.** Nye setninger sier «påberopelsen av forholdet» og «forholdet», etter oppdragsgiver
14.11: «forholdet gir grunnlag for krav om vederlagsjustering òg fristforlengelse». Gamle tekster
siteres ordrett, også når de sier «grunnlagskravet».

**Grensen.** Versjon 3 tar med endringene av MM-U52 og det som trengs for å lese regelen av ett
vedtak. Den utvider ikke det MM-U52 sier om GR-U22 og OV-U55 (kjeden for påberopelsen kartlegges
for seg).

## De 10 endringene

Tellingen: sju poster har forhold direkte til MM-U52 (`--kjede MM-U52`), og tre presiserer
VS-U59 i kjeden. 7 + 3 = 10, som varselet.

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

- **M1 LV-U56 mot punkt 10.** Punkt 10 (LV-U54): «Brevet det vises til, er det siste brevet med
  en korrigering.» og «Den gjengir totalentreprenørens siste opplysning, med henvisning til
  brevet med korrigeringen». LV-U56: «Brevet viser ikke til tidligere brev ellers, sier ikke at
  noe erstattes». LV-U56 er senere og endrer; den nevner bare de tidligere datoene med brevene.
  Løses i E3.
- **M2 LV-U73 mot designdelen.** Designdelen: «Et nytt svar sier: ‹Svaret erstatter byggherrens
  svar i brev <merking> av <dato>.› (LV-U34)». LV-U73: «Brevet sier det uten «erstatter»» og
  «Den konkrete ordlyden avgjøres i byggingen.» Løses i E7 (spørsmål 2).
- **M3 VS-U59 mot punkt 10.** Punkt 10: «Den nye opplysningen gjelder straks …, også når datoen
  er senere.» VS-U59: «En endring av datoen i grunnlagskravet avvises når den nye datoen er
  senere enn datoen for et varsel …». Innsnevringen sier ikke om den gjelder i et spor med
  enighet og i en lukket sak, der punkt 10 og 24 sier at korrigeringen «godtas». Spørsmål 1.
- **M4 MM-U53 mot punkt 15.** Punkt 15: «En opplysning i fritekst rettes ikke etter punkt 1–5.»
  og utdypingen er et innlegg. MM-U53 lar brevet etter punkt 10 ha en forklaring i fritekst. Ingen
  motsigelse i innhold, men punkt 15 leses feil uten unntaket. Løses i E4.
- **M5 EO-U39 mot punkt 6.** Punkt 6: «i en KOE-sak som en endringsordre omfatter, avvises de».
  EO-U39 spørsmål 3: nytt svar «til en sendt endringsordre eller en godkjent registrering av en
  endringsordre i en EO-sak omfatter saken», «også etter en endringsordre registrert som svar».
  Presisering, løses i E1.

## Utkastet til versjon 3

Punkt 1–5, 7–9, 11–13, 16–19, 21 og 23 står som i versjon 2, med språket etter E8. Nummereringen
står. Ny tekst med kilde:

- **Punkt 6, siste del.** «Det gjelder så langt et nytt svar eller en ny kravversjon er tillatt.
  I en KOE-sak avvises de når en sendt endringsordre eller en godkjent registrering av en
  endringsordre i en EO-sak omfatter saken (punkt 12 og 13 i samlevedtaket for endringsordren),
  også etter en endringsordre registrert som svar.» (EO-U39 spørsmål 3; E1)
- **Punkt 10, ny setning etter «… også når datoen er senere.»** «Korrigeringen avvises når den
  nye datoen er senere enn datoen for det tidligste varselet om forholdet etter samme punkt i
  NS 8407 som er sendt eller registrert: totalentreprenørens eget varsel eller kravet som er det
  første varselet løsningen kjenner (samlevedtaket for varslingsdatoen punkt 6–8). Meldingen
  nevner begge datoene. Er varselet registrert som sendt utenfor løsningen, kan
  totalentreprenøren først rette datoen for varselet etter punkt 8. Er varselet sendt fra
  løsningen, står datoen for det fast.» (VS-U59; VS-U60; VS-U66; E2)
- **Punkt 10, i stedet for LV-U54-delen og «med henvisning til brevet med korrigeringen».** «En
  ny versjon av påberopelsen av forholdet kan ikke endre datoen. Den sier den datoen som gjelder
  etter korrigeringen, og de tidligere datoene med brevet hver ble oppgitt i (LV-U56).» (LV-U56; E3)
- **Punkt 10, nye setninger.** «Brevet med korrigeringen har tittelen ‹Korrigering av datoen i
  sak <kode>›.» (LV-U55) «Det kan ha totalentreprenørens forklaring i fritekst under den vedtatte
  teksten. Forklaringen er valgfri, og løsningen tolker den ikke.» (MM-U53; E4)
- **Punkt 15, tillegg.** «Forklaringen i brevet etter punkt 10 er ikke et innlegg.» (MM-U53,
  forholdet «snevrer inn … MM-U34 punkt 24, også slik punkt 15 viser til den»; E4)
- **Punkt 20 og 22.** «EO-U34 punkt 12» blir «punkt 12 i samlevedtaket for endringsordren».
  (EO-U39 opphever EO-U34 og EO-U38; E5) Punkt 20 får: «Hva en ny kravversjon gjør med en
  aksept i et svar, står i punkt 5 i samlevedtaket for kravversjon.» (KA-U52 svar 2 A; E5)
- **Punkt 24, tillegg.** «Rettingen av varseldatoen og kravdatoen i en slik sak står i punkt 68 i
  samlevedtaket for endringsordren.» (EO-U39 punkt 68; MM-U52 spørsmål 3; E6) Etter svaret på
  spørsmål 1 også: «Avvisningen etter punkt 10 gjelder også her.» (VS-U59; spørsmål 1 A)
- **Designdelen, i stedet for setningen med ‹Svaret erstatter …›.** «Brevet med et nytt svar
  sier at svaret er byggherrens siste svar i løsningen, uten totalentreprenørens aksept, uten
  ordet «erstatter». Brevteksten står i punkt 2 i samlevedtaket for revisjon av byggherrens svar,
  versjon 2.» (LV-U73; HF-U29 punkt 2; EO-U39 spørsmål 1; E7, spørsmål 2 A)
- **Beslutningsdelen.** «retting av datoen i grunnlagskravet (punkt 10)» blir «korrigeringen av
  datoen i påberopelsen av forholdet (punkt 10)». (Oppdragsgiver 14.11; E8)

### Endret innhold

- **E1** punkt 6: gammel tekst «i en KOE-sak som en endringsordre omfatter, avvises de». Ny: grensen
  er en sendt endringsordre eller en godkjent registrering i en EO-sak (EO-U39 spørsmål 3).
- **E2** punkt 10: gammel tekst «også når datoen er senere» står, men med avvisningen etter VS-U59,
  VS-U60 og VS-U66. «etter OV-U11» i VS-U59 leses som punkt 8, fordi MM-U52 samler OV-U11.
- **E3** punkt 10: LV-U54-teksten og «Brevet det vises til, er det siste brevet med en korrigering.»
  faller (LV-U56).
- **E4** punkt 10 og 15: tittelen og forklaringen (LV-U55, MM-U53).
- **E5** punkt 20 og 22: henvisningen til den opphevede EO-U34, og henvisningen til KA-U52.
- **E6** punkt 24: henvisningen til EO-U39 punkt 68, der punkt 25 i versjon 2 ble ført (svar 3 C).
- **E7** designdelen: ‹Svaret erstatter …› faller (LV-U73).
- **E8** språket: «grunnlagskravet», «grunnlaget» og «ny grunnlagsversjon» blir «påberopelsen av
  forholdet» og «ny versjon av påberopelsen» i punkt 10, 14, 24 og beslutningsdelen. Innholdet i
  punkt 14 er uendret (spørsmål 3).
- **Hovedregelen** (OV-U92, OV-U93) for raden `mm-u34 endrer ov-u51` i
  `KJENTE_FORHOLD_TIL_OPPHEVET`: **(b)**. Versjon 3 sier: «Forholdet ‹MM-U34 endrer OV-U51› har
  ikke noe å virke på: OV-U51 er opphevet av OV-U52, og OV-U52 av samlevedtaket.» Belegg: MM-U41
  E2, «Punkt 15 strøk en tilsvarende setning i OV-U51, men OV-U51 var alt opphevet 25.10 av
  OV-U52». De ti andre radene gjelder ikke poster versjon 3 samler eller endrer. `gr-u22 endrer
  gr-u2` hører til kjeden for påberopelsen og tas der.

### Forholdene (spørsmål 4)

Versjon 3 opphever MM-U52 (svar 4 A, fordi E1–E3 og E7 endrer innholdet), og henvisningene til
MM-U52 gjelder versjon 3 (OV-U92 (a)). Forholdene i MM-U52 føres videre. Den samler LV-U55,
MM-U53, VS-U59, VS-U60 og VS-U66. EO-U39, KA-U52, LV-U56 og LV-U73 endrer også andre poster og
står med sine forhold. VS-U70 samles ikke.

## Spørsmålene til oppdragsgiver

1. **Avvisningen i en lukket sak og etter enighet.** Bakgrunn: M3. Belegg: punkt 24, «godtas også
   korrigeringen av datoen etter punkt 10, og den endrer ikke utfallet»; VS-U59 nevner ikke
   punkt 24. Alternativer: **A** «Avvisningen etter VS-U59, VS-U60 og VS-U66 gjelder også i et
   spor med enighet, når kravene er avgjort og i en lukket sak (punkt 10 og 24).» **B** «I et spor
   med enighet, når kravene er avgjort og i en lukket sak godtas korrigeringen uten kontrollen mot
   varslene.» Anbefaling: A. Rekkefølgen mellom datoene er den samme uansett utfall, og kjernen
   kontrollerer alt slik (kodefunn K1). Styrer: punkt 24 og om K1 er riktig.
2. **Brevteksten for et nytt svar.** Bakgrunn: M2. Belegg: LV-U73 «Den konkrete ordlyden
   avgjøres i byggingen»; HF-U29 punkt 2 har brevteksten og varianten for en endringsordre
   registrert som svar. Alternativer: **A** «Designdelen sier budskapet og viser til punkt 2 i
   samlevedtaket for revisjon av byggherrens svar, versjon 2, for brevteksten.» **B** «Designdelen
   har eksempelet fra LV-U73: ‹Dette er byggherrens nye svar. Byggherrens forrige svar står i brev
   … av …›.» Anbefaling: A, så brevteksten har ett hjem. Styrer: E7.
3. **Begrepet i punkt 14.** Bakgrunn: oppdragsgiver 14.11. Belegg: punkt 14 «Når
   totalentreprenøren har sendt grunnlaget … En ny grunnlagsversjon kan ikke endre dem.»
   Alternativer: **A** «Versjon 3 sier ‹påberopelsen av forholdet› og ‹ny versjon av påberopelsen›
   i alle punkter, også punkt 14, uten å endre innholdet.» **B** «Versjon 3 endrer ordene bare i
   punkt 10, 24 og beslutningsdelen; punkt 14 venter på samlevedtaket for påberopelsen av
   forholdet.» Anbefaling: A; ett vedtak med ett begrep. Styrer: E8.
4. **Forholdene.** Bakgrunn: svar 4 A og hovedregelen. Alternativer: **A** som «Forholdene» over,
   med (b) for `mm-u34 endrer ov-u51`. **B** «Som A, men VS-U59, VS-U60 og VS-U66 samles ikke;
   punkt 10 viser til dem.» Anbefaling: A; punkt 10 leses da av ett vedtak, og varselet starter
   på null. Styrer: `folge` i den nye posten og raden i `KJENTE_FORHOLD_TIL_OPPHEVET`.

## Kodefunn

- **K1** `korrigeringEtterVarslene` i [`nyttelast.ts`](../../kjerne/kommandoer/nyttelast.ts) kalles
  for hver korrigering, uten unntak for en lukket sak eller enighet. Riktig etter 1 A, feil etter 1 B.
- **K2** [`brevtekst.ts`](../../kjerne/frosset/brevtekst.ts) har fortsatt «Svaret erstatter
  byggherrens svar i …» (LV-U73 gjelder #1834). Ikke kontrollert om #1834 er åpent.
- LV-U55 og LV-U56 er lest i `brevtittel.ts` og `spor/forhold/tekst.ts` («oppga tidligere»).

## Verifikasjon og grenser

Kjørt: `--sjekk`, `--kjede MM-U52`, `--vis` for de ti postene, MM-U52, LV-U55 og MM-U53. Lest i
`vedtak.md`: teksten til MM-U52, punkt 12, 13 og 68 i EO-U39, punkt 5 i KA-U52 og punkt 2 i HF-U29.
Lest ut av koden, ikke kjørt: K1 og K2. Ikke kontrollert: tellemåten i `vedtaksregister.py` utover
summen 7 + 3; om VS-U70 bør påvirke ordlyden i punkt 10 (vår lesing: nei); kjeden for påberopelsen
(GR-U22, OV-U55). VS-U60 viser til «VS-U43 punkt 6–8», VS-U70 til «punkt 7–9»; hvilken nummerering som gjelder, er ikke kontrollert. NS 8407 er ikke sitert; ingen ny setning bygger på ordlyden der.
