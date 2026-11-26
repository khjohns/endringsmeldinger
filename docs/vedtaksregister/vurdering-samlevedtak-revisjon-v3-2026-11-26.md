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
«samlevedtaket for revisjon» i de gjeldende samlevedtakene.

**K1. Hva som står igjen.** Postene HF-U29 endrer, er samlet andre steder, unntatt MM-U27. Regelen
for et nytt svar står i HF-U29 og i postene som er bindende i det: HF-U30–HF-U34 (design) og LV-U73
(beslutning). HF-U26 og HF-U27 er tatt inn i punkt 9 og 4, men ikke samlet. Ingen av dem har fått
en endring etter 15.11.

**K2. Henvisningene i versjon 2 som ikke lenger treffer.** Kildene i parentes er historiske og står.
Henvisningene som sier hvor en regel står, treffer ikke lenger i fire punkter:
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
To setninger er nye for et nytt svar og står bare i MM-U59: punkt 6 s7 (det nye svaret erstatter
standpunktene, ikke aksepten av en retting) og punkt 20 s4 (et nytt svar tar ikke bort en aksept i
svaret det erstatter).

**K4. OV-U98 er samlet.** Svar 7 A nevner OV-U98. Den er samlet i
[OV-U123](../plans/vedtak.md#samlevedtak-brev-utenfor-2) 25.11, og setningene om svaret som legges
til, står i punkt 16 der. Versjon 3 viser dit og samler ikke OV-U98. Det er et avvik fra ordlyden i
7 A, og det står i PR-en.

**K5. Funnet fra runde 5.** MM-U60 punkt 24 sier at et nytt svar følger HF-U25 punkt 1–3. Det er en
henvisning til hvor regelen står, og HF-U25 er opphevet av HF-U29. Den hører til tema 14 og rettes i
E15. I GR-U34 punkt 12 står HF-U25 punkt 1 og 4 bare som kilder i parentes. Kildene er historiske og
rettes ikke (arbeidsvalg).

**K6. MM-U27.** HF-U29 endrer MM-U27 s2 (revisjonen som senker noe byggherren har innrømmet), som
punkt 6 i versjon 2 overtar. MM-U27 s1 gjelder påberopelse etter et «i tide» og hører til tema for
sent varsel (VS-U87 punkt 13). Versjon 3 overtar forholdet «endrer MM-U27» og samler ikke posten.

**K7. Punktnumrene står.** Versjon 3 har punkt 1–12 som versjon 2 og et nytt punkt 13. En
henvisning til «HF-U29 punkt n» i andre poster, i forløpene og i koden gjelder da punkt n i
versjon 3. Fordi HF-U29 blir samlet og ikke opphevet, står henvisningene i koden til HF-U29.

## Utkastet til versjon 3

Versjon 3 er versjon 2 med «Endret innhold» E10–E17. Kildene i parentes står som i versjon 2.
Foreløpig ID: HF-U36, den neste ledige 26.11.

**E10 Brevet (punkt 2; LV-U73).** Gammel tekst: «Brevet sier: ‹Svaret erstatter byggherrens svar i
brev <n> av <dato>.› (LV-U34)». Ny tekst: «Brevet sier at svaret er byggherrens nye svar, og viser
til brevet med byggherrens forrige svar. Det sier ikke at det nye svaret erstatter det forrige.
(LV-U73)» Ordlyden er beslutningsdel etter LV-U73.

**E11 Aksepten i et svar som erstattes (punkt 2; K3).** Ny tekst, etter første setning i punkt 2:
«Det gjelder standpunktene i svaret, ikke aksepten av en retting av varseldatoen etter punkt 20 i
samlevedtaket for retting av sendt brev, og et nytt svar tar ikke bort en aksept i svaret det
erstatter. (MM-U59 punkt 6 s7 og punkt 20 s4)» Forhold: endrer MM-U59: de to setningene står her,
og MM-U59 viser hit.

**E12 GR-U27 (punkt 3; K2).** Gammel tekst: «gjelder GR-U27. (MM-U34 punkt 12; GR-U27)». Ny tekst:
«gjelder punkt 9 i samlevedtaket for «ingen krav», avkall og godtatt avslag. (MM-U34 punkt 12;
GR-U27; HF-U35 E5)»

**E13 Henvisningene i C (punkt 10–12; K2).** Punkt 10: «følger GR-U26» blir «følger punkt 12 og 14 i
samlevedtaket for svar på vederlag og frist mens forholdet er ubesvart». Punkt 11: «følger MM-U34
punkt 6» blir «følger punkt 13 i samlevedtaket for varslene etter punkt 34.3.3 og 34.4, og
påberopelse av sent varsel, versjon 3». Punkt 12: «følger HF-U21 og kjeden for grunnlagskravet» blir
«følger punkt 4 i samlevedtaket for påberopelsen av forholdet og punkt 14 i samlevedtaket for svar
på vederlag og frist mens forholdet er ubesvart». Kildene står.

**E14 Brev sendt utenfor løsningen (nytt punkt 13; K4).** «13. Et svar byggherren har sendt utenfor
løsningen og lagt til, og et svar sendt etter totalentreprenørens aksept, følger punkt 16 i
samlevedtaket for brev sendt utenfor løsningen, versjon 2. (OV-U98 s6–8; OV-U123 punkt 16)»

**E15 MM-U60 punkt 24 (K5).** «Om byggherren kan sende et nytt svar, følger HF-U25 punkt 1–3.» leses
som punkt 1–3 i versjon 3. Forhold: endrer MM-U60 (punkt 24).

**E16 Designdelen.** Designdelen i versjon 2 står. HF-U30–HF-U34 tas inn som designdel for punkt 8,
med teksten i postene. HF-U26 står i punkt 9 som i versjon 2. Forhold: samler HF-U26 og HF-U30–HF-U34.

**E17 Beslutningsdelen.** LV-U73 er beslutningsdelen for brevet i punkt 2, med teksten i posten.
Endringen LV-U73 gjør i LV-U34 (setningen om en revisjon), står. Forhold: samler LV-U73.

**Forholdene samlet:** samler HF-U29, HF-U26, HF-U27, HF-U30–HF-U34 og LV-U73; endrer MM-U59 (E11),
MM-U60 (E15), LV-U34 og MM-U27 (overtatt fra LV-U73 og HF-U29); presiserer MM-U34 (overtatt). De
andre forholdene i HF-U29 gjelder poster som er samlet, og overtas ikke.

**Klasse:** vedtak med designdel og beslutningsdel, som versjon 2.

## Spørsmålene

Lagret ordrett før de sendes til orkestratoren. Spørsmålet gjelder rettsregler og stilles som
nummerert liste.

> **1. Tilslutning til versjon 3 av samlevedtaket for revisjon av byggherrens svar (juridisk).**
> Versjon 3 er versjon 2 med punkt 13 og «Endret innhold» E10–E17. Det endrer bare hvor reglene
> står: brevet sier ikke lenger at det nye svaret erstatter det forrige (LV-U73), og to setninger om
> aksepten i et svar som erstattes, flyttes inn fra samlevedtaket for retting av sendt brev.
> Henvisningene til regler som er samlet andre steder, rettes. Forhold: samler HF-U29, HF-U26,
> HF-U27, HF-U30–HF-U34 og LV-U73; endrer MM-U59 punkt 6 og 20, MM-U60 punkt 24, LV-U34 og MM-U27.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for byggherrens nye svar leses, og om tema 14 regnes som samlet.

## Svarene

Venter.

## Kodefunn og berørte forløp

Kartleggingen har ikke lest koden. Henvisningene til HF-U29 i `kjerne/` og `src/` står (K7).
BF-08 T-2–T-4 og D-12 viser til HF-U29 og LV-U73, og dekning.md viser til HF-U27, HF-U29 og
LV-U73. Punktnumrene står, så forløpene trenger bare den nye ID-en når de berøres.

## Verifikasjon og grenser

- **Kjørt og observert:** `--sjekk`, `--vis` og `--kjede` på `6e558dc`, som under «Grunnlaget».
- **Lest av økta selv:** versjon 2 i sin helhet, HF-U30–HF-U34, LV-U73, OV-U98, MM-U27, MM-U59
  punkt 6 og 20, VS-U87 punkt 13, MM-U60 punkt 24, GR-U34 punkt 12 og 14, GR-U40 punkt 4 og E5,
  HF-U35 punkt 9 og E5, OV-U123 punkt 16, EO-U39 punkt 12 og 13 og GR-U41 punkt 4.
- **Ikke kontrollert:** sitatene fra NS 8407 (ingen er brukt), og om andre gjeldende samlevedtak
  enn de søkte viser til HF-U29 med et punkt som endres.
