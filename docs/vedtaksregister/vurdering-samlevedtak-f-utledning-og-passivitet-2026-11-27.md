# Samlevedtak F1: det løsningen utleder, det den bare viser, og passiviteten

Dato: 27.11.2026. Kontrollert commit: `93c6f77` (`main`). Del av #1534, steg 4, gruppe F i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget): tema 25 i
[«Kjedene»](vurdering-klassifisering-2026-11-03.md#kjedene), og funnet C4 i
[7195253157](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-7195253157). Formen
følger [G1–G3](vurdering-samlevedtak-g-forsering-og-fullmakt-2026-11-27.md), vedtaksskillen,
«Samlevedtakene er unntaket», og svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
Fila viser til postene og punktene uten å gjengi dem, og skriver ikke i `vedtak.toml`. «s3» er
tredje setning i vedtaksteksten, uten «Forkastet».

## Grunnlaget

`vedtaksregister.py --vis` og `--kjede` for de 17 postene i temaet og postene som endrer dem, og
samlevedtakene HF-U23, HF-U36, LV-U86, OV-U115, OV-U123, OV-U128 og VS-U96 i vedtaksfila. NS 8407 er
ikke slått opp; utkastet legger ingen ny lesning av kontrakten til.

**Postene som gjenstår:** VS-U3 og VS-U42 (vedtak), raden 24.09 «B-13 passivitet (§ 32.3 annet ledd)
varsles, men systemet trekker ingen konklusjon» (rad-115, vedtak med designdel), VS-U2, VS-U10 og
HF-U22 (design), og MM-U24, MM-U30 og MM-U40 (design, alt flyttet til `system.md`). Restkartleggingen
talte ti poster 17.11. MM-U29 er siden regnet som opphevet av MM-U40.

**K1. Allerede samlet eller opphevet.** HF-U5 (KA-U88), HF-U11 (VS-U96), LV-U7 (HF-U23), MM-U34,
OV-U27 (OV-U89), OV-U43 og VS-U28 (OV-U115). VS-U17 og VS-U36 er samlet i VS-U88, og OV-U7 i VS-U96.
F tar dem ikke med.

**K2. Designet som alt er flyttet.** MM-U24, MM-U30 og MM-U40 står i
[`system.md`](../../.interface-design/system.md#mm-u24) og endres der. F samler dem ikke.

**K3. Forløpet for veiledningen finnes ikke.** «Omfanget av flyttingen» setter VS-U2, VS-U10 og
designdelen av VS-U42 og raden 24.09 til et nytt forløp for veiledningen om passivitet og frister, og
HF-U22 til et forløp for et svar byggherren senker etter akseptfristen. Ingen av dem er skrevet. BF-14
og BF-20 viser til VS-U2 og VS-U10, men er ikke det forløpet. Designdelen står derfor i F1 til
forløpet skrives (steg 4, punkt 1 i #1534).

**K4. VS-U3 kan ikke leses av én post.** VS-U42 endrer punkt 35.2, VS-U89 punkt 5 tredje ledd og
VS-U90 punkt 32.3 annet ledd. VS-U3 s10 venter på punkt 30, som OV-U115 punkt 11 har avgjort.
VS-U96 punkt 3 viser til VS-U3 for hvor virkningen utledes. Temaet trenger derfor et samlevedtak.
C og D er ført, og en ny versjon av dem for én post ville spre regelen. F1 er et eget samlevedtak.

**K5. HF-U22 står i HF-U36.** HF-U23 E5 sier at HF-U22 gjelder i ordlyden fra MM-U34 punkt 8, for
ethvert nytt svar, og den ordlyden er punkt 8 i HF-U36. HF-U22 er ikke samlet der. F1 samler den med
en henvisning (E7).

**K6. C4, fristveiledningen «regnet fra sendingen».** `system.md` MM-U24 sier at veiledningen er
regnet fra sendingen, og etter HF-U23 E8 bærer ingen vedtakssetning det. Oppdragsgiver har avgjort at
fristveiledningen er design fordi den ikke er en frist etter kontrakten (svar 04.11 (3) i
[vurderingen 03.11](vurdering-klassifisering-2026-11-03.md#svarene-0411)). Den trenger derfor ingen
vedtakssetning. Datoen den regnes fra, følger likevel av vedtak: et brev er sendt når det er lagret
(LV-U86 punkt 1), datoen avsenderen oppgir, er datoen for et brev lagt til fra utenfor løsningen
(OV-U123 punkt 11), og løsningen avgjør ikke når et brev kom fram (LV-U86 punkt 1; HF-U23 punkt 5).
VS-U10 sier «mottaksdatoen», og det strider mot det siste. F1 retter designdelen (E6).

**K7. `bindende_i` for MM-U24.** Registeret har LV-U9 som et av stedene den bindende setningen står.
Setningen i LV-U9 var at akseptfristen regnes fra sendingen, og den gjelder ikke lenger (HF-U23 E8;
LV-U86 E1). Retting: LV-U9 tas ut av `bindende_i`. Klassen endres ikke. Kontrollen av klassene prøver
rettingen.

**K8. Force majeure.** Følge i VS-U3 sier at punkt 33.3 er gjennomført i VS-U13 og KA-U23. VS-U13 er
samlet i OV-U128 punkt 5 uten setningen om at virkningen utledes. F1 sier ikke noe om punkt 33.3, og
OV-U128 punkt 5 og KA-U23 står.

**K9. Foreløpige ID-er,** de neste ledige 27.11: VS-U97 for F1. Raden 24.09 får ankeret
`passivitet-uten-konklusjon`, så den kan samles.

## Delingen

- **F1** samler VS-U3, VS-U42, VS-U2, VS-U10, HF-U22 og raden 24.09.
- **Står:** MM-U24, MM-U30 og MM-U40 i `system.md` (K2), VS-U89 og VS-U90, som F1 viser til, og
  OV-U128 punkt 5 og KA-U23 (K8).

## Utkastet til F1

Samlevedtaket er et *vedtak* med designdel. Hver setning har kilden i parentes.

###### A. Tre måter

1. Løsningen behandler bestemmelsene om varsler, svar og frister på tre måter: den utleder virkningen
   av partens standpunkt, den registrerer og viser utsagnet med frist og bestemmelse, eller den
   vurderer selv der et vedtak sier det. (VS-U3 s1)
2. Løsningen utleder virkningen av partens standpunkt etter punkt 32.2 og 32.3 første ledd a–c, 33.1,
   33.4 og 33.6.1, valgretten i punkt 33.8, og punkt 34.1.2, 34.1.3, 34.2.2 og 34.3.3 første ledd. Å
   utlede betyr å registrere standpunktet og vise virkningen på partens premisser, ikke å fastslå at
   kravet er prekludert. (VS-U3 s2–s3; VS-U96 punkt 3)
3. Løsningen åpner for totalentreprenørens valg etter punkt 33.8, men bekrefter ikke at valgretten
   finnes. (VS-U3 s4; FO-U10)
4. Påberoper byggherren uttrykkelig at totalentreprenøren svarte for sent på forespørselen etter
   punkt 33.6.2, utledes virkningen som etter punkt 33.4. Svarer ikke totalentreprenøren, vises det
   bare (punkt 11). (VS-U3 s9; VS-U88 punkt 9)
5. Løsningen registrerer og viser utsagnet med frist og bestemmelse for punkt 32.3 annet og tredje
   ledd, punkt 33.6.2 tredje ledd når totalentreprenøren ikke svarer, punkt 33.7 annet ledd,
   30 %-grensen i punkt 33.8, punkt 34.2.1, punkt 34.3.3 annet ledd, punkt 34.4 og punkt 35.2. Det
   betyr uten automatisk utledning, ikke uten rettsvirkning. (VS-U3 s5–s6; E1; E3)
6. Løsningen vurderer selv bare der det er vedtatt: om punkt 32.2 gjelder for kategorien,
   sammenlikningen av beløp og dager, og punkt 33.6.2 fjerde ledd (KA-U4). (VS-U3 s8)

###### B. Bestemmelsene som er endret

7. En påberopelse i et svar av at motparten har varslet, krevd eller svart for sent, er innsigelsen
   etter punkt 5 tredje ledd, og virkningen utledes der punkt 2 sier det. Den egne innsigelsen etter
   punkt 5 tredje ledd er ikke en egen handling og følger VS-U89; løsningen tolker den ikke og utleder
   ingen virkning av den. (VS-U96 punkt 1 og 3; VS-U89; E3)
8. Totalentreprenørens påberopelse av byggherrens passivitet etter punkt 32.3 annet ledd følger
   VS-U90. (VS-U90; E4)
9. Gjør byggherren gjeldende at varselet etter punkt 34.4 ikke ble gitt eller kom for sent, registreres
   og vises standpunktet uten utledet virkning. (OV-U115 punkt 11; VS-U96 punkt 31; E1)
10. Løsningen følger punkt 35.2 slik kontraktsgrunnlaget (Del II pkt. B.2.17) endrer det: første ledd
    bokstav a om oppmann før overtakelsen gjelder ikke. For punkt 35.2 viser løsningen bare fristen
    for å iverksette søksmål eller voldgift etter overtakelsen, uten dato. (VS-U42; E2)

###### C. Passiviteten og søksmålsfristen

11. For punkt 32.3 annet ledd, 33.6.2 tredje ledd, 33.7 annet ledd, 34.3.3 annet ledd og 35.2 viser
    løsningen fristen og bestemmelsen som veiledning og trekker ikke konklusjonen: den sier ikke at en
    frist er oversittet eller at taushet har gitt virkning. (VS-U2; raden 24.09; VS-U96 punkt 4; E4)
12. Senker byggherren i et nytt svar dager eller beløp byggherren har godkjent, gjelder HF-U36 punkt 8.
    (HF-U22; HF-U23 E5; E7)

###### Designdel

Står til forløpet for veiledningen om passivitet og frister er skrevet (K3).

- Veiledningen i punkt 11 viser bestemmelsen og fristens utgangspunkt, ikke en dato. (VS-U2; VS-U10,
  Følge)
- For en frist som løper «uten ugrunnet opphold» etter et brev, viser veiledningen datoen for brevet,
  antall dager siden og bestemmelsen, uten en fast frist. Datoen er datoen brevet har i løsningen
  (LV-U86 punkt 1; OV-U123 punkt 11), og veiledningen sier ikke at brevet kom fram den dagen.
  (VS-U10 s1; E6)
- Hvor veiledningen står ved kravet, står i `system.md` MM-U24. Hvordan passiviteten vises, står i
  forløpet. (Raden 24.09)

###### Endret innhold

- **E1 Punkt 5 og 9, punkt 34.4.** VS-U3 s10 «Hvordan appen behandler § 34.4, avgjøres når § 30 er
  lest» er avgjort av OV-U115 punkt 11 (fra VS-U28, som presiserte VS-U3 for punkt 34.4). Punkt 34.4
  står i listen i punkt 5.
- **E2 Punkt 10, punkt 35.2.** VS-U3 s7 om oppmann før overtakelsen gjelder ikke (VS-U42).
- **E3 Punkt 5 og 7, punkt 5 tredje ledd.** VS-U3 s5 har punkt 5 tredje ledd i listen over det som
  registreres og vises. VS-U89 endret VS-U3 for punkt 5 tredje ledd utenfor svaret, og VS-U96 punkt 1
  og 3 sier at påberopelsen i svaret er innsigelsen etter punkt 5 tredje ledd, med virkning der VS-U3
  sier det. Punkt 5 tredje ledd står derfor i punkt 7 og ikke i listen.
- **E4 Punkt 8 og 11, punkt 32.3 annet ledd.** VS-U90 endret VS-U3 for punkt 32.3 annet ledd og opphevet
  VS-U12. At det VS-U3 sier om punktet, ikke bygges i første versjon (Følge, OV-U7), gjelder ikke
  lenger. «Varsles» i raden 24.09 leses som veiledningen i punkt 11, som VS-U2 utvidet raden til.
- **E5 Følge i VS-U3.** Henvisningene til VS-U12, VS-U13, KA-U23, FO-U3 og paragrafmatrisen føres ikke
  videre. FO-U3, som sier hvordan 30 %-grensen vises, er samlet i FO-U10, og punkt 33.3 står i OV-U128 og KA-U23 (K8).
- **E6 Designdelen, datoen.** «Mottaksdatoen» i VS-U10 er byttet med datoen brevet har i løsningen
  (K6). Den forkastede faste fristen står (VS-U10, «Forkastet»).
- **E7 Punkt 12.** HF-U22 sier det samme som HF-U36 punkt 8 for et svar etter akseptfristen (K5).
- **E8 Ordene.** «Appen» er «løsningen», og «§» er «punkt», etter [språkfila](../sprak.md).

**Samler:** VS-U3, VS-U42, VS-U2, VS-U10, HF-U22 og raden 24.09. Henvisningene til dem i andre poster
gjelder F1, også «der VS-U3 sier det» i VS-U96 punkt 3, som gjelder punkt 2.

## Spørsmålene

Lagret ordrett før de sendes til orkestratoren. 1 gjelder framgangsmåten. 2 gjelder rettsregler og
stilles som nummerert liste.

> **1. Delingen (prosess).** Tema 25 samles i ett samlevedtak, F1, fordi regelen i VS-U3 er endret
> av tre senere vedtak (K4). Designet som alt står i `system.md` (MM-U24, MM-U30, MM-U40), blir
> stående der.
> - **A (anbefalt):** F1 samler VS-U3, VS-U42, VS-U2, VS-U10, HF-U22 og raden 24.09. Designdelen
>   står i F1 til forløpet for veiledningen om passivitet og frister er skrevet.
> - **B:** F1 samler bare VS-U3, VS-U42 og raden 24.09. VS-U2, VS-U10 og HF-U22 står som
>   designposter til forløpet skrives, og E6 og E7 føres ikke.
>
> Styrer: om veiledningen leses i én post før forløpet finnes, og om «mottaksdatoen» i VS-U10 står.

> **2. Tilslutning til F1 (juridisk).** Samlevedtaket for det løsningen utleder, det den bare viser,
> og passiviteten (foreløpig VS-U97) gjelder med E1–E8. Forhold: samler VS-U3, VS-U42, VS-U2,
> VS-U10, HF-U22 og raden 24.09, og henvisningene til dem i andre poster gjelder F1. Det endrer ikke
> innholdet i VS-U89, VS-U90, OV-U115 punkt 11 eller HF-U36 punkt 8, som det viser til.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt eller E-punkt.
>
> Styrer: hvor regelen for hva løsningen utleder og bare viser leses, og hvilken dato
> fristveiledningen regnes fra (E6).

## Kontrollene

Den uavhengige kontrollen av klassene og prøvingen av alternativene mot vedtakene gjøres én gang i
hver sin subagent før spørsmålene sendes. Funnene og hvordan de er rettet, føres her.

## Kodefunn

Lest av en subagent 27.11 på `93c6f77`. Ingen rettinger.

- **KF1 Registrert forespørsel.** Veiledningen for svaret på byggherrens forespørsel etter punkt
  33.6.2 regner dagene fra `registrert`, også for et brev lagt til fra utenfor løsningen
  (`Fristkrav.svelte`, `Fristoversikt.svelte`; feltet i `src/lib/components/varden/lesing.ts`). For et
  slikt brev er datoen i løsningen datoen avsenderen oppga (`sendt`), etter OV-U123 punkt 11. Med en
  forespørsel lagt til ti dager etter at den ble sendt, viser veiledningen ti dager for lite.
- **KF2 «Mottatt».** Teksten i skjemaet kaller datoen «mottatt» (`tekster/fristkrav.ts`,
  `foresporsel`). Løsningen avgjør ikke når et brev kom fram (LV-U86 punkt 1). Ordlyden er design
  (E6).
- **Kontrollert uten funn:** ingen fast svarfrist i veiledningen (VS-U10), ingen visning av oppmann
  etter punkt 35.2 (VS-U42), ingen utledet virkning av standpunktet etter punkt 34.4 i kjernen
  (OV-U115 punkt 11), og ingen kommando for passivitet eller den egne innsigelsen (VS-U89, VS-U90).

## Funn utenfor F1

- `system.md` MM-U24 viser til VS-U2 og VS-U10. Når F1 er ført, bør henvisningene gå til F1. Fila
  hører ikke til denne PR-en.
- BF-14 og BF-20 viser til VS-U2, VS-U10 og HF-U22. Henvisningene virker etter samlingen, og
  dekningen kontrolleres i vedtaks-PR-en (vedtaksskillen, «Berørte forløp»).

## Verifikasjon og grenser

- **Kjørt og observert:** `--vis` og `--kjede` for postene i tema 25, og `--vis` for VS-U89, VS-U90,
  VS-U96, HF-U24, OV-U99, OV-U125, OV-U126, VS-U17, VS-U36, OV-U7, KA-U4, OV-U27, VS-U13, KA-U23 og
  VS-U28 på `93c6f77`. Punktene i HF-U23, HF-U36, LV-U86, OV-U115, OV-U123, OV-U128 og VS-U96 er lest i
  vedtaksfila.
- **Lest av subagentene:** kodefunnene, og teksten i #1534 om steg 4 og C4.
- **Ikke kontrollert:** NS 8407, at VS-U97 og ankeret i K9 er ledige når postene føres, og om andre
  forløp enn BF-14 og BF-20 viser til postene som samles.
