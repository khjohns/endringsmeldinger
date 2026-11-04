# Utkast til postene for samlevedtaket for sakslisten og nøkkeltallene

Utkast, ikke ført i registeret. Føres i `vedtak.toml` når grenen er fjerde i køen (#1534, 6628689283), og fila slettes da.

## Postene, etter MM-U40 i gruppa «Sendte brev, regelendring og saker kjernen ikke forstår»

```toml
[[gruppe.vedtak]]
klasse = "beslutning"
designdel = "avsnittet «Designdel» i samlevedtaket, punkt 12, og i punkt 10 «Byggherrens svar og enigheten står på siden for saken.»"
bindende_i = ["eo-u34", "mm-u12", "gr-u7", "ka-u6", "ov-u4"]
id = "MM-U41"
dato = 2026-11-04
hvem = "oppdragsgiver"
kilde = ["#1534", "#1065"]
sporsmal = '''
Spørsmålet ordrett slik det ble stilt 04.11 i [vurderingsfila](https://github.com/khjohns/endringsmeldinger/blob/87e498a/docs/vedtaksregister/vurdering-samlevedtak-betegnelser-2026-11-04.md#spørsmålene-til-oppdragsgiver), spørsmål 1. Alternativene står også i posten.

1. **Tilslutning til samlevedtaket for sakslisten og nøkkeltallene.**
Bakgrunn: reglene for sakslisten og nøkkeltallene står i fem vedtak fra 25.10 til 02.11.
Sakslisten og nøkkeltallene ble vedtatt på nytt 02.11 (sakslisten, kortene og sakene som
ikke er forstått), men teksten i vedtaksfila fra 25.10 om nøkkeltallene står uendret, også
der den senere er endret: summen av krav og antallet saker som ikke er forstått. At
endringen fra et vedtak som senere er opphevet, er falt bort, står ikke ved den. Betegnelsene per krav og per spor står alt i designsystemet og endres ikke.
Forslaget samler reglene i én tekst med kilde per setning, opphever 25.10-vedtaket om
nøkkeltallene som egen regel, og samler de tre vedtakene fra 02.11. Hver innholdsendring
står i E1–E4 med gammel tekst, ny tekst og kilde. Ingen setning et annet samlevedtak
endrer, endres her; der samlevedtaket for endringsordren alt har regelen, viser forslaget
dit. Alternativene: **A.** «Samlevedtaket for sakslisten og nøkkeltallene gjelder med E2–E4, og med
E1 slik spørsmål 2 avgjør. Vedtakene det samler, gjelder som «Samlet i samlevedtaket for
sakslisten og nøkkeltallene». Vedtaket det opphever, gjelder ikke lenger, og i vedtaket det samler én
setning fra, gjelder resten uendret.» **B.** Samme som A, med rettingene oppdragsgiver gir
per E-punkt. Anbefalt: A, «ja». Hva valget styrer: hvilken tekst som er regelgrunnlaget
for sakslisten og nøkkeltallene; de gamle tekstene leses ikke lenger alene. Forholdet
til andre poster: samler MM-U37, MM-U38 og MM-U39 og setningen om nøkkeltallene i punkt 3
i OV-U43; opphever OV-U61; ingen ny regel utover svaret på spørsmål 2.'''
valgt = "A"
svar = '''
Oppdragsgiver 04.11, ordrett: «M ja, S-2 D, R1 A, R2 A, V1 A, V2 A, V3 A, B1 A, B2 A, G1 A, G2 A, G3 A» ([#1534, 6628301789](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6628301789)). Nummereringen i svaret er orkestratorens: «B1 = spørsmål 1, A. B2 = spørsmål 2, A.»'''
forhold = [{ art = "samler", vedtak = "mm-u37" }, { art = "samler", vedtak = "mm-u38" }, { art = "samler", vedtak = "mm-u39" }, { art = "samler", vedtak = "ov-u43" }, { art = "opphever", vedtak = "ov-u61" }, { art = "snevrer inn", vedtak = "ov-u21" }]
folge = '''
Teksten står under tabellen, i [Samlevedtaket for sakslisten og nøkkeltallene](#samlevedtak-saksliste). Forholdene står i spørsmål 1: «samler MM-U37, MM-U38 og MM-U39 og setningen om nøkkeltallene i punkt 3 i OV-U43; opphever OV-U61». Forholdet til OV-U43 gjelder bare setningen «Nøkkeltallene viser at beløpet etter regelen er ukjent, ikke 0.»; resten av OV-U43 står. Forholdet til OV-U21 står i designdelen: «Det snevrer inn OV-U21 for sakslisten».'''

[[gruppe.vedtak.alternativ]]
navn = "A"
tekst = '''
Samlevedtaket for sakslisten og nøkkeltallene gjelder med E2–E4, og med E1 slik spørsmål 2 avgjør. Vedtakene det samler, gjelder som «Samlet i samlevedtaket for sakslisten og nøkkeltallene». Vedtaket det opphever, gjelder ikke lenger, og i vedtaket det samler én setning fra, gjelder resten uendret.'''
anbefalt = true

[[gruppe.vedtak.alternativ]]
navn = "B"
tekst = '''
Samme som A, med rettingene oppdragsgiver gir per E-punkt.'''
forkastet = true

[[gruppe.vedtak]]
klasse = "beslutning"
designdel = "«Byggherrens svar og enigheten står på siden for saken.»"
id = "MM-U42"
dato = 2026-11-04
hvem = "oppdragsgiver"
kilde = ["#1534", "#1065"]
sporsmal = '''
Spørsmålet ordrett slik det ble stilt 04.11 i [vurderingsfila](https://github.com/khjohns/endringsmeldinger/blob/87e498a/docs/vedtaksregister/vurdering-samlevedtak-betegnelser-2026-11-04.md#spørsmålene-til-oppdragsgiver), spørsmål 2. Alternativene står også i posten.

2. **Summen for enighet og for byggherrens svar.** Bakgrunn: vedtaket 25.10 om
nøkkeltallene har en sum for ‹Enighet om vederlag› (virksom enighet, betinget enighet
særskilt, enighet uten beløp som antall) og en særskilt visning av byggherrens svar med
subsidiært standpunkt som totalentreprenøren ikke har godtatt. Vedtaket 02.11 om
nøkkeltallene sier at det endrer 25.10-vedtaket, og nevner bare tre ting som står fra det:
beløp i brev som bare er registrert, rigg og drift i uendret byggetid, og krav i flere
saker som kan gjelde samme kostnad. Kortene har bare krav og endringsordrer. Vedtaket 02.11
om sakslisten sier: «Byggherrens svar, enigheten og betegnelsen for sporet står på siden
for saken og ikke i sakslisten.» I bakgrunnen for vedtaket om sakslisten står oppdragsgivers ord
02.11: «Det vi vet sikkert: hva TE krever, og hva BH utsteder i en EO». Ingen av de to
vedtakene sier uttrykkelig at summen for enighet faller bort.
Alternativene: **A.** «Nøkkeltallene har ingen sum for enighet og ingen sum for
byggherrens svar. Byggherrens svar og enigheten står på siden for saken.» Forhold:
opphever setningene i 25.10-vedtaket om ‹Enighet om vederlag›, betinget enighet, enighet
uten beløp, svar som ikke er godtatt, svar med subsidiært standpunkt og at svaret på
grunnlaget avgjør om en enighet er betinget eller virksom i summen. **B.** «Kortet for vederlag viser i tillegg enigheten og byggherrens svar slik vedtaket 25.10 om
nøkkeltallene sier.» Forhold: endrer vedtaket 02.11 om nøkkeltallene, slik at kortet for
vederlag får en tredje sum, og snevrer inn endringen det gjorde i vedtaket 25.10. Anbefalt: A. Belegg: vedtaket 02.11 lister det som
står, og summene for enighet og svar er ikke med; vedtaket om sakslisten legger svaret og
enigheten på siden for saken; vedtaket 02.11 opphevet også vedtaket 20.10 om at
nøkkeltallene summerer krav og virksom enighet hver for seg; oppdragsgivers ord om det som
vites sikkert. Det er vår lesing at listen er uttømmende; teksten sier det ikke. Hva valget styrer: om
nøkkeltallene i første versjon får en tredje sum, og om regelen for hva som regnes som virksom
enighet i en sum trengs i første versjon. Hva som er enighet mellom partene, avgjøres ikke
av valget; det står i vedtakene om enighet.'''
valgt = "A"
svar = '''
Oppdragsgiver 04.11, ordrett: «M ja, S-2 D, R1 A, R2 A, V1 A, V2 A, V3 A, B1 A, B2 A, G1 A, G2 A, G3 A» ([#1534, 6628301789](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6628301789)). Nummereringen i svaret er orkestratorens: «B1 = spørsmål 1, A. B2 = spørsmål 2, A.»'''
forhold = [{ art = "endrer", vedtak = "ov-u61" }]
folge = '''
Forholdet står under A i spørsmål 2: «opphever setningene i 25.10-vedtaket om ‹Enighet om vederlag›, betinget enighet, enighet uten beløp, svar som ikke er godtatt, svar med subsidiært standpunkt og at svaret på grunnlaget avgjør om en enighet er betinget eller virksom i summen». Samlevedtaket er [MM-U41](#mm-u41), punkt 10 og E1.'''

[[gruppe.vedtak.alternativ]]
navn = "A"
tekst = '''
Nøkkeltallene har ingen sum for enighet og ingen sum for byggherrens svar. Byggherrens svar og enigheten står på siden for saken.'''
anbefalt = true

[[gruppe.vedtak.alternativ]]
navn = "B"
tekst = '''
Kortet for vederlag viser i tillegg enigheten og byggherrens svar slik vedtaket 25.10 om nøkkeltallene sier.'''
forkastet = true

[[gruppe.vedtak.sitat]]
kilde = "hovedplanen"
tekst = "Byggherrens svar, enigheten og betegnelsen for sporet står på siden for saken og ikke i sakslisten."
```

## Først i `etter` i samme gruppe

```markdown
##### <a id="samlevedtak-saksliste"></a>Samlevedtaket for sakslisten og nøkkeltallene (MM-U41)

Teksten under er samlevedtaket [MM-U41](#mm-u41), vedtatt 04.11 av oppdragsgiver (#1534), ordrett slik
det ble lagt fram i [vurderingen](../vedtaksregister/vurdering-samlevedtak-betegnelser-2026-11-04.md),
med «Endret innhold» E1–E4. Svaret på spørsmål 2 i vurderingen er [MM-U42](#mm-u42).

###### Forslaget

Samlevedtaket er en *beslutning* med designdel (spørsmål 2). Det gjelder sakslisten og
nøkkeltallene over den for KOE-sakene.

###### A. Hva tallene er

1. Punkt 67 i samlevedtaket for endringsordren gjelder for summene og nøkkeltallene.
   (EO-U34 punkt 67)
2. Et ukjent beløp er ikke 0. Varsler, krav etter regningsarbeid eller enhetspriser og
   endringsordrer uten samlet beløp telles for seg, fordi beløpet er ukjent og ikke 0.
   (MM-U38; OV-U43 punkt 3; MM-U28)
3. Beløpene er eks. mva. (MM-U37; MM-U38)

###### B. Nøkkeltallene

4. Over sakslisten står ett kort for vederlag og ett for fristforlengelse. Hvert kort viser
   kravene i sakene som ingen sendt endringsordre omfatter, og endringsordrene. (MM-U38)
5. For vederlag er tallene summen av kravene med beløp og summen av vederlaget i alle sendte
   endringsordrer i prosjektet, også dem som ikke omfatter en KOE-sak, med fradrag trukket
   fra. (MM-U38) Hvordan en registrert endringsordre, et bestridt utsagn og et utsagn som
   erstatter det telles, står i samlevedtaket for endringsordren. (EO-U27, EO-U28, EO-U29;
   EO-U34)
6. Summen av kravene er summen av totalentreprenørens gjeldende krav, også når kravene er
   avgjort. (OV-U61)
7. For fristforlengelse er tallene antall krav og antall endringsordrer som gir
   fristforlengelse, og dagene summeres ikke. (MM-U38; i tråd med OV-U63)
8. Saker som en sendt endringsordre omfatter, trukne krav og saker der totalentreprenøren har
   trukket påberopelsen eller godtatt avslaget på den, er ikke med i summene. (MM-U38;
   OV-U61)
9. Beløp i dokumenter som bare er registrert som dokumentasjon etter OV-U4, inngår ikke i
   summene. Kompensasjonen for rigg og drift i uendret byggetid er ikke med. Krav i flere
   saker kan gjelde samme kostnad, og løsningen kontrollerer det ikke. (OV-U61, slik MM-U38
   lar det stå; OV-U57)
10. Nøkkeltallene har ingen sum for enighet og ingen sum for byggherrens svar. Byggherrens
    svar og enigheten står på siden for saken. (MM-U37; MM-U38; E1)
11. En sak løsningen ikke forstår, er ikke med i summene, og nøkkeltallene sier ikke hvor
    mange slike saker det er. (MM-U39; E3)

###### C. Sakslisten

12. Sakslisten viser for hver KOE-sak det totalentreprenøren har krevd eller varslet for
    vederlag og frist, og ikke byggherrens svar, enigheten eller betegnelsen for sporet.
    Lista sier ikke hva en sak venter på, eller hvem som skal handle. (MM-U37)

###### Designdel

Hjemmet er [`system.md`](../../.interface-design/system.md), der MM-U22, MM-U30 og MM-U31 står,
eller forløpet for sakslisten når det skrives (#1450). Raden viser beløpet eller dagene,
‹Varslet› når totalentreprenøren har varslet uten beløp eller dager, for varsler løsningen
kjenner etter OV-U5, ‹Regningsarbeid› eller ‹Enhetspriser› når kravet følger en av disse
beregningsreglene, og ellers ‹Ikke krevd›. Omfatter en sendt endringsordre saken, viser lista
merket etter EO-U13 (MM-U37). I hvert kort står kravene og endringsordrene side om side og
med samme vekt, og i lista er tallene dempet for sakene i punkt 8 (MM-U38, designdelen). En sak løsningen ikke forstår, har
ingen egen tekst og ingen tall i raden (MM-U39, designdelen). Det snevrer inn OV-U21 for
sakslisten: der OV-U21 sier at hvert registrert brev teller mens saken ikke er forstått, og
Følge sier at sakslisten leser det, viser sakslisten ingen tekst for saken. Betegnelsen per spor etter
MM-U30 og MM-U31 står på siden for saken, ikke i sakslisten (MM-U37). Den samlede betegnelsen
for saken etter MM-U22 står der den står i `system.md`; at sakslisten ikke har en tekst for en
sak som ikke er forstått, snevrer inn MM-U22 for lista (MM-U39).

###### Beslutningsdel

Grunnen til punkt 11 og til designdelen for saker løsningen ikke forstår, er at slike saker
ikke forekommer i løsningen (MM-U39). MM-U2 står: en hendelse kjernen ikke forstår,
gjør saken ikke forstått.

###### Endret innhold

**E1 Ingen sum for enighet og svar.** Gammel tekst: OV-U61 «‹Enighet om vederlag› er summen
av beløpene løsningen leser som virksom enighet, enten TE har godtatt svaret eller svaret
stemmer med kravet. Betinget enighet vises særskilt. En enighet uten virkning, som etter et
godtatt avslag på grunnlaget, et trukket grunnlag eller et trukket vederlagskrav, er ikke med.
En enighet uten beløp telles som antall, atskilt fra kronesummen. Byggherrens svar som TE ikke
har godtatt, regnes ikke som enighet. Svar med et subsidiært standpunkt som TE ikke har
godtatt, vises særskilt med beløpet byggherren godtar om ingen påberopelse fører fram. Hele
beløpet i disse svarene er med, også poster som er godkjent prinsipalt, og merkingen sier
det, og at beløpet ikke er enighet. Svar med bare prinsipale standpunkter som ikke er godtatt,
er ikke med i noen sum. Samme beløp telles ikke både som svar og som enighet.» og «Byggherrens
svar på grunnlaget avgjør om enigheten om et beløp er betinget eller virksom, også når svaret
er en endringsordre registrert etter OV-U6.» Samlevedtaket: punkt 10. Hvorfor: MM-U38 lister
det som står fra OV-U61, og summene for enighet og svar er ikke med; MM-U37 legger svaret og
enigheten på siden for saken. Radteksten i OV-U61 er ikke rettet (M1). Spørsmål 1.

**E2 Nøkkeltallene er to kort.** Gammel tekst: OV-U61 «Nøkkeltallene for vederlag sier hva
summene bygger på. ‹Krevd vederlag› er summen av TEs gjeldende krav i saker løsningen forstår
og der kravet står, også når kravene er avgjort.» Samlevedtaket: punkt 4–6. Hvorfor: MM-U38
erstatter ‹Krevd vederlag› med kortet for vederlag, som viser kravene i sakene ingen sendt
endringsordre omfatter, og summen i endringsordrene. «også når kravene er avgjort» står
(punkt 6). Setningen «Nøkkeltallene for vederlag sier hva summene bygger på.» faller bort som
regel; kortene viser hva de teller etter designdelen. Endringen gjorde MM-U38 02.11; radteksten i OV-U61 er ikke rettet.

**E3 Antallet saker som ikke er forstått.** Gammel tekst: OV-U61 «Saker løsningen ikke
forstår, er ikke med i noen sum, og oversikten sier ved summene hvor mange de er.»
Samlevedtaket: punkt 11. Hvorfor: MM-U39 gjorde endringen 02.11 (alternativ B, «som OV-U61 i
dag», ble forkastet); radteksten i OV-U61 er ikke rettet (M2).

**E4 Vilkår som ikke er avklart.** Endrer ikke gjeldende innhold; punktet retter bare at Følge
for OV-U61 ikke sier at endringen er falt bort. Gammel tekst: OV-U49, D1: «Vilkår som ikke er avklart, er
et eget forhold i tillegg: til de er avklart etter avklaringsreglene nedenfor, regnes kravet
ikke som avgjort etter OV-U3, og beløpet inngår ikke i summen av virksom enighet, også når
grunnlaget er avklart.» og «Nøkkeltallene viser enigheten særskilt og sier hva den bygger
på.» Samlevedtaket: ingen setning; punkt 10. Hvorfor: OV-U69 opphevet OV-U49, og «Endringene
OV-U49 gjorde i andre vedtak, blant annet i GR-U7, GR-U8, KA-U16 og svaret 25.10 på spørsmål 8
om nøkkeltallene, faller bort med det.» Følge for OV-U61 sier det ikke (M3).
```

## Endringer i postene som finnes

- MM-U38: `klasse = "beslutning"` (fra `vedtak`), etter kontrollen av klassene (svar 8 B).
- OV-U61: `klasse = "beslutning"` (fra `vedtak`), etter kontrollen av klassene (svar 8 B).
- OV-U61: tillegg sist i `folge` (E4):

```text
Etter [MM-U41](#mm-u41), E4: OV-U69 opphevet OV-U49, og «Endringene OV-U49 gjorde i andre vedtak, blant annet i GR-U7, GR-U8, KA-U16 og svaret 25.10 på spørsmål 8 om nøkkeltallene, faller bort med det.»
```
