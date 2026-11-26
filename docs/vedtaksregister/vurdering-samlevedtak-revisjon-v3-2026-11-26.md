# Samlevedtaket for revisjon av byggherrens svar, versjon 3

Dato: 26.11.2026. Kontrollert commit: `6e558dc` (`main`). Del av #1534, steg 4, tema 14 i
[«Kjedene»](vurdering-klassifisering-2026-11-03.md#kjedene). Grunnlaget er K1 og svaret 7 A i
[vurderingen for gruppe C](vurdering-samlevedtak-c-aksept-og-svar-2026-11-25.md#svarene). Formen
følger vedtaksskillen, «Samlevedtakene er unntaket», og svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
Fila viser til postene og punktene uten å gjengi dem, og skriver ikke i `vedtak.toml`. «s3» er
tredje setning i vedtaksteksten, uten «Forkastet». «Versjon 2» er
[HF-U29](../plans/vedtak.md#samlevedtak-revisjon-2).

## Grunnlaget

`vedtaksregister.py --vis` og `--kjede` for HF-U29, HF-U26, HF-U27, HF-U30–HF-U34, LV-U73, OV-U98,
GR-U40, MM-U27, MM-U59, MM-U60, VS-U87 og GR-U34, og et søk i vedtaksfila etter HF-U29, HF-U25 og
«samlevedtaket for revisjon» i de gjeldende samlevedtakene. Kildekontrollen utvidet søket til
HF-U26 og HF-U27 (funn 2 og 3 under «Kontrollene»).

**K1. Hva som står igjen.** Postene HF-U29 endrer, er samlet andre steder, unntatt MM-U27. Regelen
for et nytt svar står i HF-U29 og i postene som er bindende i det: HF-U30–HF-U34 (design) og LV-U73
(beslutning). HF-U26 og HF-U27 er tatt inn i punkt 9 og 4, men ikke samlet. Ingen av dem har fått
en endring etter 15.11.

**K2. Henvisningene i versjon 2 som ikke lenger treffer.** Kildene i parentes er historiske og står.
Henvisningene som sier hvor en regel står, treffer ikke lenger i fem punkter:
- punkt 2: brevteksten ‹Svaret erstatter …› er endret av LV-U73;
- punkt 3: GR-U27 er samlet i punkt 9 i [HF-U35](../plans/vedtak.md#samlevedtak-avkall), som E5 der
  sier;
- punkt 10: GR-U26 er samlet i [GR-U34](../plans/vedtak.md#samlevedtak-ubesvart-grunnlag), punkt 12
  og 14;
- punkt 11: MM-U34 punkt 6 er samlet i punkt 13 i [VS-U87](../plans/vedtak.md#samlevedtak-sent-varsel-3);
- punkt 12: HF-U21 er samlet i [GR-U40](../plans/vedtak.md#samlevedtak-paaberopelsen) punkt 4 og
  GR-U34 punkt 14, som E5 i GR-U40 sier.

**K3. MM-U59 punkt 6 og 20.** Punkt 6 er regelen for en retting av et krav eller et svar. Setningene
om et nytt svar i s2–s5 sier det samme som punkt 1, 2 og 7 i versjon 2, og står der i tråd med dem.
To setninger om et nytt svar står bare i MM-U59: punkt 6 s7 (det nye svaret erstatter
standpunktene, ikke aksepten av en retting) og punkt 20 s4 (et nytt svar etter punkt 6 tar ikke bort
en aksept i svaret det erstatter). Begge er en del av ordningen i MM-U59: s7 er forbeholdet til
punkt 6 s2, og s4 hører til aksepten i punkt 20. Å flytte dem ville la punkt 6 s2 stå uten
forbehold, så utkastet viser til dem (E11), og spørsmål 2 avgjør det.

**K4. OV-U98 er samlet** i [OV-U123](../plans/vedtak.md#samlevedtak-brev-utenfor-2) punkt 16 (25.11).
Versjon 3 viser dit (E14). Det er et avvik fra ordlyden i 7 A, og det står i PR-en.

**K5. Funnet fra runde 5.** MM-U60 punkt 24 sier at et nytt svar følger HF-U25 punkt 1–3. Det er en
henvisning til hvor regelen står, og HF-U25 er opphevet av HF-U29. Den hører til tema 14 og rettes i
E15. I GR-U34 punkt 12 står HF-U25 punkt 1 og 4 bare som kilder i parentes. Kildene er historiske og
rettes ikke (arbeidsvalg). GR-U34 punkt 12 gjengir HF-U27 s2 ordrett og trenger ingen retting
når HF-U27 samles. MM-U60 har også en henvisning i designdelen: merknaden vises «etter HF-U26». Den
rettes i E15.

**K6. MM-U27.** Punkt 6 i versjon 2 overtar s2. S1 gjelder påberopelse etter et «i tide» (VS-U87
punkt 13). Versjon 3 overtar forholdet «endrer MM-U27» og samler ikke posten.

**K7. Punktnumrene står.** Versjon 3 har punkt 1–12 som versjon 2 og et nytt punkt 13. En
henvisning til «HF-U29 punkt n» i andre poster, i forløpene og i koden gjelder da punkt n i
versjon 3. Fordi HF-U29 blir samlet og ikke opphevet, står henvisningene i koden til HF-U29. Det er
riktig å samle, ikke oppheve, bare fordi versjon 3 ikke endrer innholdet (svar 4 A). Som VS-U87
samler VS-U77 og MM-U60 samler MM-U50.

## Utkastet til versjon 3

Versjon 3 er versjon 2 med «Endret innhold» E10–E17 og E16b. Kildene i parentes står som i versjon 2.
Foreløpig ID: HF-U36, den neste ledige 26.11.

**E10 Brevet (punkt 2; LV-U73).** Gammel tekst: «Brevet sier: ‹Svaret erstatter byggherrens svar i
brev <n> av <dato>.› (LV-U34)». Ny tekst: «Brevet sier at svaret er byggherrens siste svar i
løsningen, uten totalentreprenørens aksept. (LV-U73)» Budskapet er det samme som før. At brevet
ikke bruker ordet «erstatter», og at ordlyden avgjøres i byggingen, er beslutningsdelen (E17), som i
designdelen i MM-U59 (E7 der).

**E11 Aksepten i et svar som erstattes (punkt 2; K3; spørsmål 2).** Ny tekst, etter første setning i
punkt 2: «Hva det nye svaret erstatter når det tidligere svaret godtok en retting av varseldatoen,
står i punkt 6 og 20 i samlevedtaket for retting av sendt brev, versjon 4.» Forhold: i tråd med
MM-U59 punkt 6 og 20.

**E12 GR-U27 (punkt 3; K2).** Gammel tekst: «gjelder GR-U27. (MM-U34 punkt 12; GR-U27)». Ny tekst:
«gjelder punkt 9 i samlevedtaket for «ingen krav», avkall og godtatt avslag. (MM-U34 punkt 12;
GR-U27; HF-U35 E5)»

**E13 Henvisningene i C (punkt 10–12; K2).** Punkt 10: «følger GR-U26» blir «følger punkt 12 og 14 i
samlevedtaket for svar på vederlag og frist mens forholdet er ubesvart». Punkt 11: «følger MM-U34
punkt 6» blir «følger punkt 13 i samlevedtaket for varslene etter punkt 34.3.3 og 34.4, og
påberopelse av sent varsel, versjon 3». Punkt 12: «følger HF-U21 og kjeden for grunnlagskravet» blir
«følger punkt 4 i samlevedtaket for påberopelsen av forholdet og punkt 14 i samlevedtaket for svar
på vederlag og frist mens forholdet er ubesvart». Kildene står.

**E14 Brev sendt utenfor løsningen (nytt punkt 13; K4).** Punkt 13 står under C: «13. Et svar
byggherren har sendt utenfor løsningen og lagt til, og et svar byggherren har sendt etter en aksept
som er lagt til, følger punkt 16 i samlevedtaket for brev sendt utenfor løsningen, versjon 2. (OV-U98
s6 og s8; OV-U123 punkt 16)»

**E15 MM-U60 (K5).** I punkt 24 leses «HF-U25 punkt 1–3» som punkt 1–3 i versjon 3, og i designdelen
«etter HF-U26» som punkt 9 i versjon 3. Bare henvisningene flyttes. Grensen i punkt 7 (en KOE-sak
som en endringsordre omfatter) tas ikke inn i punkt 24, fordi HF-U25 punkt 1–3 heller ikke hadde
den. Forhold: endrer MM-U60 (punkt 24 og designdelen).

**E16 Designdelen.** Designdelen i versjon 2 står. HF-U30–HF-U34 tas inn som designdel for punkt 8,
med teksten i postene og to rettinger: HF-U33 leses «Punkt 34.3.3 annet ledd vises også når
byggherren i et nytt svar ikke lenger godtar justeringen av enhetsprisene etter punkt 34.3.2 for en
kravpost.» (alternativ A og B i HF-U33), og «slik GR-U26 sier» i HF-U34 leses som punkt 12 og 14 i
samlevedtaket for svar på vederlag og frist mens forholdet er ubesvart. Punkt 9, unntatt siste
setning, er designdel etter HF-U26, som har klassen design og er bindende i MM-U9 og MM-U50; bindingen
står gjennom designdelen i MM-U60 (E15). Visningsleddene «og vises» i punkt 3 og «Løsningen viser
frafallet sammen med det nye svaret» i punkt 4 er designdel; «uten å trekke konklusjonen» er vedtak.
Forhold: samler HF-U26 og HF-U30–HF-U34.

**E16b HF-U27.** Teksten står i punkt 4 som i versjon 2. Forhold: samler HF-U27.

**E17 Beslutningsdelen.** LV-U73 er beslutningsdelen for brevet i punkt 2, med teksten i posten,
og gjelder også brevet i designdelen i MM-U59. Endringen LV-U73 gjør i LV-U34 (setningen om en
revisjon), står. Forholdet «LV-U73 endrer MM-U52» overtas ikke: MM-U52 er opphevet, og brevteksten
står i designdelen i MM-U59. Forhold: samler LV-U73.

**Forholdene samlet:** samler HF-U29, HF-U26, HF-U27, HF-U30–HF-U34 og LV-U73; endrer MM-U60 (E15);
endrer LV-U34 og MM-U27 og presiserer MM-U34 (overtatt fra LV-U73 og HF-U29). «GR-U40 presiserer
HF-U29 punkt 12» står og gjelder punkt 12 i versjon 3 slik E13 retter det. De andre forholdene i
HF-U29 gjelder poster som er samlet, og overtas ikke.

**Klasse:** vedtak med designdel og beslutningsdel, som versjon 2.

## Spørsmålene

Lagret ordrett før de sendes til orkestratoren. Begge gjelder hvor reglene om byggherrens nye svar
står, og stilles som nummerert liste.

> **1. Tilslutning til versjon 3 av samlevedtaket for revisjon av byggherrens svar.** Versjon 3 er
> versjon 2 med punkt 13 og «Endret innhold» E10–E17, med E11 etter svaret på spørsmål 2. Den endrer
> ikke innholdet, bare hvor reglene står: brevet sier budskapet i stedet for ordlyden med
> «erstatter» (LV-U73), og henvisningene til regler som er samlet andre steder, rettes. Forhold:
> samler HF-U29, HF-U26, HF-U27, HF-U30–HF-U34 og LV-U73; endrer MM-U60 punkt 24 og designdelen;
> endrer LV-U34 og MM-U27 og presiserer MM-U34, overtatt fra LV-U73 og HF-U29.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for byggherrens nye svar leses, og om tema 14 regnes som samlet.

> **2. Aksepten av en rettet varseldato i et svar som erstattes.** Samlevedtaket for retting av
> sendt brev, versjon 4, sier i punkt 6 at et nytt svar erstatter standpunktene i det tidligere
> svaret, ikke aksepten av en retting av varseldatoen, og i punkt 20 at et nytt svar etter punkt 6
> ikke tar bort en aksept i svaret det erstatter. Svar 7 A sa at versjon 3 tar inn punkt 6 og 20.
> Setningene er en del av ordningen for retting: den første er forbeholdet til regelen i punkt 6 om
> at et nytt svar erstatter det tidligere, og den andre hører til aksepten i punkt 20.
> - **A (anbefalt):** Setningene står i samlevedtaket for retting, og punkt 2 i versjon 3 viser dit:
>   «Hva det nye svaret erstatter når det tidligere svaret godtok en retting av varseldatoen, står i
>   punkt 6 og 20 i samlevedtaket for retting av sendt brev, versjon 4.» Forhold: i tråd med MM-U59
>   punkt 6 og 20.
> - **B:** Setningene flyttes til punkt 2 i versjon 3, med «et nytt svar etter punkt 6 i
>   samlevedtaket for retting av sendt brev, versjon 4», og samlevedtaket for retting viser hit.
>   Forhold: endrer MM-U59 punkt 6 og 20. Regelen i punkt 6 om at et nytt svar erstatter det
>   tidligere, står da uten forbeholdet i samme punkt til en ny versjon av samlevedtaket for retting.
>
> Styrer: om regelen om aksepten har ett hjem i samlevedtaket for retting eller i samlevedtaket for
> revisjon.

## Svarene

Venter.

## Kontrollene

Kildekontrollen (8 funn), prøvingen av alternativene mot vedtakene (10 funn) og den uavhengige
kontrollen av klassene (5 funn) er gjort én gang i hver sin subagent 26.11, før spørsmålene ble
sendt. Funnene er rettet én gang og står i PR-en under «Funn og utfall». Rettingene er ikke prøvd på
nytt (vedtaksskillen). Prøvingen viste at E10 og E11 i første utkast endret innhold; med rettingene
endrer versjon 3 bare hvor reglene står, og derfor samler den HF-U29 (K7).

## Kodefunn og berørte forløp

Kartleggingen har ikke lest koden. Henvisningene til HF-U29 i `kjerne/` og `src/` står (K7).
BF-08 T-2–T-4 og D-12 viser til HF-U29 og LV-U73, og dekning.md viser til HF-U27, HF-U29 og
LV-U73. Punktnumrene står, så forløpene trenger bare den nye ID-en når de berøres.

## Verifikasjon og grenser

- **Kjørt og observert:** `--sjekk`, `--vis` og `--kjede` på `6e558dc`, som under «Grunnlaget».
- **Lest av økta selv:** versjon 2 i sin helhet, postene i «Grunnlaget» og punktene K2–K5 viser til.
- **Ikke kontrollert:** sitatene fra NS 8407 (ingen er brukt), og om andre gjeldende samlevedtak
  enn de søkte viser til HF-U29 med et punkt som endres.
