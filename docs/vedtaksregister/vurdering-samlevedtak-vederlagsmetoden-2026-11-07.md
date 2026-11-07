# Samlevedtak: vederlagsmetoden, versjon 2

Kartleggingen for et nytt samlevedtak for vederlagsmetoden. Del av #1663. Kontrollert mot grenen
for #1664 på `595a18d`.

**Hvorfor fila finnes.** Samlevedtaket for vederlagsmetoden ([OV-U94](../plans/vedtak.md#ov-u94))
har fått åtte endringer etter 05.11: KA-U54, KA-U57, KA-U58, KA-U60, KA-U61, KA-U63, KA-U64 og
KA-U68. `vedtaksregister.py` varsler. Etter svar 6 A i #1534
([6623299573](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623299573))
skrives da den neste endringen som et samlevedtak, til samlet tilslutning med rettelser per punkt.
Formen følger svar 7 A i #1534 og [versjon 2 for endringsordren](vurdering-samlevedtak-endringsordren-2026-11-05.md)
(EO-U38). Fila viser til punktene i versjon 1 og gjengir dem ikke. Den foreløpige ID-en er OV-U95.

## Det kartleggingen fant

- **Versjon 1 forutsetter én oppgjørsform for hele kravet.** KA-U54 endrer punkt 4, 13, 15 og 16
  til å gjelde per kravpost (Følge i KA-U54). Teksten i avsnittet `samlevedtak-vederlagsmetoden`
  sier fortsatt det gamle.
- **Fjorten av de nye postene gjelder vederlagsmetoden**: KA-U53–KA-U61, KA-U63–KA-U66 og KA-U68.
- **To poster samles ikke.** KA-U62 er en beslutning om forløpet og prototypen, ikke om regelen.
  KA-U67 presiserer punkt 23 i samlevedtaket for endringsordren, versjon 2 (EO-U38), og hører til
  versjon 3 av det, som kartlegges i PR #1634.
- **Samlevedtaket for særskilt varsel og rigg og drift** ([OV-U89](../plans/vedtak.md#ov-u89)) har
  fått fire endringer (KA-U53, KA-U54, KA-U58 og KA-U60). Ingen av svarene 11–16 endrer det, så
  versjon 2 for OV-U89 skrives ved neste endring. Endringene står i postene til da.
- **Punkt 3 sier ikke hvilken brevtekst som gjelder når vederlagsjusteringen har kravposter uten
  krevd beløp.** Varianten uten beløp for justeringen ellers kommer fra OV-U23, som gjelder et krav
  med bare det særskilte kravet. Det er en ny regel og står som spørsmål 2.
- **Ingen kode, regelrad eller bevis-sak viser til OV-U94.** BF-14 i #1665 gjør det tre steder. De
  får OV-U95 ved siden av når posten føres.

## Forslaget

Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Punkt 1–18, designdelen og
beslutningsdelen er versjon 1 med E8–E16. Punkt 19–24 er nye (E15). E1–E7 står i posten OV-U94 og
gjelder versjon 1; henvisningene til dem i punkt 13, 14 og 17 og i beslutningsdelen står. Nummereringen
i versjon 1 står, så «punkt 4», «punkt 13» og de andre henvisningene i KA-postene gjelder det samme.
Kilden «(OV-U94 punkt n)» står for setninger som er uendret.

**Uendret:** punkt 1, 2, 9–12, 14 og 18, og designdelen og beslutningsdelen utenom E14 og E15.
Punkt 3 står til spørsmål 2 er besvart.

**Punkt 4** (E8): Brevet sier hvilke poster som er tilbud etter NS 8407 punkt 34.2.1, og at en post
etter en beregningsregel ikke er et tilbud. (KA-U61; KA-U54) Den særskilte vederlagsjusteringen med
fast sum nevnes som de andre postene med fast sum, også når kravet bare har den. (KA-U65; OV-U94
punkt 4) Posten for rigg og drift i forlenget byggetid følger OV-U89 punkt 17 og kalles ikke tilbud.
(KA-U65; OV-U94 punkt 4) Endret tekst gjelder bare nye brev (MM-U9). (OV-U94 punkt 4; KA-U61, Følge)

**Punkt 5** (E9): første setning blir «Byggherrens standpunkt til hvilken beregningsregel som gjelder
for en kravpost, står i svaret på vederlagskravet uten beløp for vederlaget etter regelen.» (OV-U94
punkt 5; KA-U54; KA-U57 (d)) Andre setning står. Beløpet subsidiært: punkt 24. (KA-U58, Følge)

**Punkt 6** (E9): får siste setning «Punktet gjelder per kravpost.» (KA-U59; KA-U57 (c))

**Punkt 7** (E9): «for den aktuelle vederlagsjusteringen» blir «for den aktuelle kravposten». Tar
byggherren stilling til beløpet subsidiært, gjelder punkt 24. (OV-U94 punkt 7; KA-U58, Følge; KA-U59)

**Punkt 8** (E10): Lagene i byggherrens svar står i rekkefølgen varselinnsigelsene etter punkt
34.1.2 og 34.1.3 først, deretter standpunktet til oppgjørsformen, så beløpet. (KA-U60; KA-U64)
Standpunktet til varselet etter punkt 34.3.3 og punkt 34.4 står i laget for oppgjørsformen til
posten det gjelder. (KA-U64) Innenfor denne rekkefølgen står standpunktet i det laget innsigelsene i
svaret gir det (OV-U32, OV-U33). (OV-U94 punkt 8; LV-U31 s4; LV-U32 s5)

**Punkt 13** (E11): Behandlingen av vederlagskravet er ferdig i løsningen når løsningen har
registrert enighet om oppgjørsformen for hver kravpost som gjøres opp etter en beregningsregel, og
om beløpet for hver kravpost med fast sum, for den særskilte vederlagsjusteringen og for rigg og
drift, og enigheten er virksom etter grunnlaget (GR-U7). (KA-U63; OV-U94 punkt 13) Beløpet etter
en beregningsregel avregnes utenfor løsningen. (OV-U94 punkt 13)

**Punkt 15** (E11): Et tilbud byggherren ikke har akseptert for en kravpost, regnes ikke lenger som
krav når løsningen har registrert enighet om en beregningsregel for den kravposten. Det tidligere
tilbudet for kravposten erstattes som gjeldende krav først når løsningen har registrert enighet om
beregningsregelen for den kravposten i stedet. Enighet om beregningsregelen for én post tar ikke bort
tilbudet for en annen. (KA-U63; OV-U94 punkt 15)

**Punkt 16** (E12): første setning blir «Partene kan endre en beregningsregel de er enige om for en
kravpost, ved uttrykkelig enighet mellom dem, uten trekk og uten avkall.» (OV-U94 punkt 16; KA-U54,
Følge) Resten står.

**Punkt 17** (E13): «Utover det punkt 13–16 og 18 sier» blir «Utover det punkt 13–16, 18 og 21
sier». (OV-U94 punkt 17; KA-U56)

**Beslutningsdelen, andre ledd** (E14): I første versjon tar løsningen imot krav etter kontraktens
enhetspriser etter punkt 34.3.1, krav om justerte enhetspriser etter punkt 34.3.2 og varsel om
justering etter punkt 34.3.3. De tas også med i forløpet. (OV-U14; KA-U68)

**Nye punkter, G. Kravpostene** (E15):

19. TE kan dele vederlagsjusteringen i flere kravposter, hver med beskrivelse. En kravpost har en
    fast betegnelse som følger den gjennom kravversjonene. Særskilt vederlagsjustering og rigg og
    drift står som egne poster. (KA-U53) En kravpost med fast sum har et beløp. En kravpost etter
    kontraktens enhetspriser kan ha et anslag, og en kravpost med regningsarbeid kan ha et
    kostnadsoverslag. Begge er opplysninger og ikke krav, og punkt 2 står. (KA-U66)
20. Hver kravpost har sin oppgjørsform. (KA-U54)
21. Skal en kravpost ut, trekker TE den uttrykkelig i den nye kravversjonen, og brevet sier det.
    (KA-U56)
22. TE kan oppgi PNS per kravpost som en opplysning. Den binder ikke, og ingen regel leser den.
    Byggherren kan sette en annen PNS i endringsordren. Veiledningen om 300 000-regelen stopper ikke
    kravet. (KA-U55)
23. Byggherren svarer per kravpost, og godkjenner, godkjenner delvis eller avslår beløpet per
    kravpost. Samling av poster på tvers hører til endringsordren. (KA-U59; KA-U57 (c))
    Varselinnsigelsen etter punkt 34.1.2 rammer alle kravpostene samtidig. Innsigelsen etter punkt
    34.1.3 rammer bare den særskilte vederlagsjusteringen. (KA-U57 (a)–(b)) Byggherrens standpunkt
    til beregningsregelen, og innsigelsene etter punkt 34.3.3 og 34.4, gjelder én kravpost, og det
    subsidiære beløpet gjelder da bare den posten. (KA-U57 (d))
24. Mener byggherren en annen oppgjørsform enn TE for en kravpost med fast sum, kan byggherren ta
    stilling til beløpet subsidiært, «hvis totalentreprenørens oppgjørsform legges til grunn». Det
    er valgfritt. Tar byggherren ikke stilling, sier brevet at beløpet ikke er besvart i det laget.
    (KA-U58 og Følge)

**Designdelen får** (E15): betegnelsen P1, P2 … (KA-U53), veiledningen om 300 000-regelen i
skjemaet (KA-U55), at skjemaet tar med alle kravposter som ikke er trukket (KA-U56), og tabellen i
svaret med én rad per kravpost og én kolonne per lag (KA-U57 (e)). Ordlyden i tilbudssetningen er
design og står i bestillingen for brukerforløpet. (KA-U61)

**Forkastet:** det forkastede i versjon 1 føres videre ordrett. De andre alternativene i
KA-U53–KA-U68 ble ikke forkastet og står i postene.

## Endret innhold

Gammel tekst er avsnittet `samlevedtak-vederlagsmetoden` på `595a18d`. E8–E15 gir ingen ny regel;
hvert punkt viser hvor en post fra 07.11 alt har endret versjon 1. E16 er svaret på spørsmål 2.

- **E8 Punkt 4.** Den vedtatte ordlyden faller; prinsippet står, og ordlyden er design (KA-U61).
  Hvilke poster setningen nevner: KA-U65. Kildene LV-U30 og LV-U39 for ordlyden faller med den.
- **E9 Punkt 5, 6 og 7.** Standpunktet og godkjenningen gjelder én kravpost (KA-U54, KA-U57 (c) og
  (d), KA-U59). KA-U58 presiserer punkt 5 og 7 (Følge), og regelen står i punkt 24.
- **E10 Punkt 8.** Rekkefølgen er ny (KA-U60), og varslene etter punkt 34.3.3 og 34.4 står i laget
  for oppgjørsformen (KA-U64). Regelen om laget etter innsigelsene står innenfor rekkefølgen.
- **E11 Punkt 13 og 15.** Gammelt: enighet «om beregningsregelen» for hele kravet. Nå per kravpost,
  med enighet om beløpet for postene med fast sum (KA-U63). Rigg og drift var alt med (OV-U89 punkt
  26). «Beløpet» som avregnes utenfor løsningen, er nå beløpet etter en beregningsregel, fordi
  beløpet med fast sum er avtalt.
- **E12 Punkt 16.** Per kravpost (KA-U54, Følge).
- **E13 Punkt 17.** Trekket av en kravpost (punkt 21) er et avkall etter KA-U51 og nevnes blant
  bindingene.
- **E14 Beslutningsdelen.** Gammelt: «Justerte enhetspriser etter punkt 34.3.2 og varsel om justering
  etter punkt 34.3.3 avvises.» Nå tatt imot i første versjon og med i forløpet (KA-U68).
- **E15 Punkt 19–24 og designdelen.** Svarene 07.11 med kilde per setning. «Hver med beskrivelse og
  beløp» i KA-U53 er delt mellom punkt 19 første og fjerde setning etter KA-U66. «P1, P2 …» og
  «(«P2 trekkes»)» står i designdelen; det er vår lesning av designdelen i KA-U53 og KA-U56.
- **E16 Punkt 3.** Ved spørsmål 2 A får punkt 3 siste setning: alternativet ordrett.

## Spørsmålene til oppdragsgiver

**1. Tilslutning til samlevedtaket for vederlagsmetoden, versjon 2.**

*Bakgrunn:* Samlevedtaket for vederlagsmetoden 05.11 har fått åtte endringer med svarene 07.11 om
kravposter. Versjon 2 setter dem inn i én tekst. *Belegg:* forslaget over og E8–E15.

- **A (anbefalt):** «Samlevedtaket for vederlagsmetoden, versjon 2, gjelder med E8–E16. Det opphever
  samlevedtaket for vederlagsmetoden, og henvisningene til det gjelder versjon 2. Det samler svarene
  07.11 om kravposter, oppgjørsform, PNS og trekk per kravpost, om lagene, beløpet og svaret per
  kravpost i byggherrens svar, om tilbudssetningen, om når behandlingen er ferdig, om beløpet i en
  kravpost etter en beregningsregel og om justerte enhetspriser i første versjon, som gjelder som
  «Samlet i samlevedtaket for vederlagsmetoden». Forholdene i versjon 1, og forholdene de samlede
  postene har til andre vedtak enn samlevedtaket for vederlagsmetoden, føres videre.»
- **B:** Samme som A, med rettelsene du gir per punkt eller E-punkt.

*Anbefaling:* A. Innholdet er det du alt har vedtatt, og nummereringen i versjon 1 står.
*Styrer:* hvilken tekst som er regelgrunnlaget for kravet og svaret i BF-14 og for byggingen.
*Forholdet:* opphever OV-U94; samler KA-U53–KA-U61, KA-U63–KA-U66 og KA-U68. Tellingen av endringer
begynner på nytt (svar 10 i #1534). *Klassen:* vedtak med designdel og beslutningsdel.

**2. Brevteksten om det særskilte kravet når vederlagsjusteringen har kravposter.**

*Bakgrunn:* Punkt 3 har to brevtekster for kravet om særskilt justering etter punkt 34.1.3 annet
ledd: med «i tillegg» etter beløpet for justeringen ellers, og uten «i tillegg» når kravet ikke har
beløp for justeringen ellers. Den siste kommer fra OV-U23, et krav med bare det særskilte kravet.
Med kravposter kan vederlagsjusteringen ha poster uten krevd beløp (regningsarbeid eller
enhetspriser, KA-U66).

- **A (anbefalt):** «Brevet bruker teksten med «i tillegg» når vederlagsjusteringen har minst én
  kravpost, også når ingen kravpost har et krevd beløp. Teksten uten «i tillegg» brukes når kravet
  bare har den særskilte vederlagsjusteringen.»
- **B:** «Brevet bruker teksten uten «i tillegg» når ingen kravpost har et krevd beløp.»

*Anbefaling:* A. Det holder meningen i OV-U23: teksten uten «i tillegg» gjelder et krav med bare det
særskilte kravet. Med B leses et krav med regningsarbeid som om TE ikke krevde noe annet.
*Styrer:* brevteksten i punkt 3. *Forholdet:* presiserer punkt 3. *Klassen:* vedtak.

## Verifikasjon og grenser

Lest: avsnittet `samlevedtak-vederlagsmetoden` og radene OV-U94, OV-U89 (Følge), OV-U23 og
KA-U53–KA-U68 i `docs/plans/vedtak.md` på `595a18d`, og `vedtaksregister.py --sjekk`. Søket etter
henvisninger til OV-U94 gjaldt `kjerne/`, `server/`, `src/`, `docs/domenetabell/`, `.interface-design/`,
`.claude/` og `AGENTS.md`, og BF-14 i #1665. En subagent kontrollerte forslaget én gang mot kildene
og alternativene mot vedtakene. Den fant ingen motstrid med et gjeldende vedtak. Funnene er rettet
her, og funnet om punkt 3 er spørsmål 2. Ikke rettet: henvisningene til EO-U34 i punkt 12, 16 og 18
står, fordi de gjelder versjon 2 (EO-U38). NS 8407 og teksten i OV-U89 er ikke lest for denne fila.

## Svarene

Oppdragsgiver 07.11, ordrett:

> A, A

- **1 A:** samlevedtaket for vederlagsmetoden, versjon 2, gjelder med E8–E16, uten rettelser. B er
  forkastet.
- **2 A:** brevet bruker teksten med «i tillegg» når vederlagsjusteringen har minst én kravpost, og
  teksten uten «i tillegg» når kravet bare har den særskilte vederlagsjusteringen. B er forkastet.

Ført som [OV-U95](../plans/vedtak.md#ov-u95).
