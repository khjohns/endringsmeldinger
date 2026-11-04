# Samlevedtak: betegnelsene, sakslisten og nøkkeltallene

Dato: 04.11.2026. Kontrollert commit: `b2e8057`. Del av #1534, steg 4, trinn 2.

Fila er et forslag til samlet tilslutning til reglene for betegnelsene, sakslisten og
nøkkeltallene. Kjeden er raden «Betegnelser, sakslisten og nøkkeltallene» i
[klassifiseringen](vurdering-klassifisering-2026-11-03.md#kjedene). Hver setning i forslaget
viser vedtaket og eventuelt punktet den kommer fra. Det som endrer innholdet i en eldre post,
også en motsigelse forslaget løser, står i «Endret innhold» (E1–E4), og oppdragsgiver tar
stilling til hvert punkt. Spørsmålene står ordrett slik de sendes, og svarene føres inn her.
Sitatene fra vedtaksfila er ordrette og kontrollert mot `vedtak.toml` på commiten over.
Forslaget siterer ikke NS 8407.

**Avgrensningen.** Kjeden har 13 poster, men bare seks av dem har regelen for temaet som
hovedinnhold: MM-U28, MM-U37, MM-U38, MM-U39 og OV-U61 for sakslisten og nøkkeltallene, og
MM-U22, MM-U30 og MM-U31 for betegnelsene. De andre er med fordi én eller to setninger i dem
gjelder nøkkeltallene eller betegnelsene. Hovedinnholdet i dem hører til andre kjeder:
OV-U3 til «Kravene er avgjort, og sperren etter det», OV-U10 til «Statusteksten og merknaden
om registrerte brev», OV-U43 til «Vederlagsmetoden» og «Akseptfristen», og OV-U49 og OV-U69 til
«Vilkår og forbehold i byggherrens svar». Forslaget samler bare setningene om temaet her, og
rører ikke resten av de postene.

**Prinsippet 03.11.** Betegnelsene og sakslisten sier hvordan visningen er bygget opp, og er
*design*. MM-U22, MM-U30 og MM-U31 står alt i [`system.md`](../../.interface-design/system.md#mm-u22).
Hva nøkkeltallene summerer, er etter testen i vedtaksskillen beslutning eller design, ikke
vedtak («Hva oversiktene summerer, er beslutning eller design», oppdragsgiver 04.11). Se
«Klassene» og spørsmål 2.

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder
fortsatt som «Samlet i samlevedtaket for nøkkeltallene». «Opphever»: samlevedtaket løser en
motsigelse og endrer innholdet. «Endrer»: bare de navngitte setningene endres; resten av
posten står. «Ingen»: ingen setning samles eller endres.

| Post | Klasse nå | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| MM-U22 | design, flyttet til `system.md` | gjeldende; snevret inn av MM-U39 | ingen; designet står i `system.md`, med MM-U37 og MM-U39 som innsnevring (designdelen) | – |
| MM-U28 | design | opphevet 02.11 av MM-U37, MM-U38 og MM-U39 | står opphevet; «Ukjent er ikke 0.» lever videre i MM-U38 | – |
| MM-U30 | design, flyttet til `system.md` | gjeldende; snevret inn av MM-U31 og MM-U37 | ingen, som MM-U22 | – |
| MM-U31 | design, flyttet til `system.md` | gjeldende; snevret inn av MM-U37 | ingen, som MM-U22 | – |
| MM-U37 | design | gjeldende | samler (designdel); flyttes til `system.md` eller forløpet for sakslisten | – |
| MM-U38 | vedtak med designdel | gjeldende; endret av EO-U28 og EO-U29, presisert av EO-U27 (samlet i EO-U34), og presisert og snevret inn av EO-U24 og EO-U16 (opphevet av EO-U34) | samler | E1, E2 |
| MM-U39 | beslutning med designdel | gjeldende | samler | E3 |
| OV-U61 | vedtak med designdel | gjeldende; endret av MM-U38 og MM-U39 (OV-U49s endring falt bort med OV-U69) | opphever | E1, E2, E3 |
| OV-U43 | vedtak med designdel | gjeldende | samler setningen «Nøkkeltallene viser at beløpet etter regelen er ukjent, ikke 0.» (punkt 3); resten står | – |
| OV-U3 | vedtak med designdel | gjeldende | ingen; statusteksten og sperren hører til andre kjeder | – |
| OV-U10 | design | gjeldende | ingen; hører til kjeden for statusteksten | – |
| OV-U49 | vedtak | opphevet 30.10 av OV-U69 | står opphevet; endringen av OV-U61 er falt bort (OV-U69) | E4 |
| OV-U69 | vedtak med designdel | gjeldende | ingen setning endres; samlevedtaket bygger på at endringen av OV-U61 er falt bort | E4 |

**Poster utenfor kjeden som rører temaet.** EO-U27, EO-U28 og EO-U29 presiserer og endrer
MM-U38 og er samlet i samlevedtaket for endringsordren (EO-U34). EO-U16 og EO-U24 snevret inn
og presiserte MM-U38 og er opphevet av EO-U34; innholdet om summen står i EO-U34 («Sum og
kode», E8). Se «Forholdet til andre samlevedtak».

## Motsigelsene

Fra [«Motsigelsene i registeret»](vurdering-klassifisering-2026-11-03.md#motsigelsene-i-registeret)
og lesingen av postene:

- **M1. Hva som står igjen av OV-U61 etter MM-U38.** MM-U38 sier at det endrer OV-U61, og
  nevner det som står: «Det OV-U61 sier om beløp i brev som bare er registrert, om
  kompensasjonen for rigg og drift i uendret byggetid og om krav i flere saker som kan
  gjelde samme kostnad, står.» OV-U61 har i tillegg ‹Enighet om vederlag› som egen sum,
  betinget enighet særskilt, enighet uten beløp som antall, og svar med subsidiært standpunkt
  særskilt. Kortene i MM-U38 har ingen av dem, og MM-U37 sier: «Byggherrens svar, enigheten
  og betegnelsen for sporet står på siden for saken og ikke i sakslisten.» Radteksten i OV-U61
  er uendret. Løses i E1 og spørsmål 1.
- **M2. Antallet saker som ikke er forstått.** OV-U61: «Saker løsningen ikke forstår, er ikke
  med i noen sum, og oversikten sier ved summene hvor mange de er.» MM-U39: «nøkkeltallene
  sier ikke hvor mange slike saker det er». MM-U39 er vedtatt senere og sier at det endrer
  OV-U61, men radteksten er uendret. Løses i E3.
- **M3. OV-U49s endring av OV-U61.** OV-U49 endret «svaret 25.10 på spørsmål 8 om
  nøkkeltallene» (OV-U61): «også vilkår som ikke er avklart, holder et beløp utenfor virksom
  enighet». OV-U69 sier at endringen faller bort, men Følge for OV-U61 sier det ikke
  ([motsigelsen om OV-U69 og 16 vedtak](vurdering-klassifisering-2026-11-03.md#motsigelsene-i-registeret)).
  Løses i E4.
- **M4. MM-U28 er opphevet tre ganger.** MM-U37, MM-U38 og MM-U39 opphever MM-U28, men
  OV-U43 og OV-U61 «presiserer» det fortsatt. Ingen innholdsmotsigelse: setningen «Ukjent er
  ikke 0.» står i MM-U38 («fordi beløpet er ukjent og ikke 0»), og resten av MM-U28 er
  erstattet av MM-U37. Henvisningen fra OV-U43 og OV-U61 rettes når Følge rettes etter
  svar 14 (steg 3), ikke her.

## Forslaget

Samlevedtaket er en *beslutning* med designdel (spørsmål 2). Det gjelder sakslisten og
nøkkeltallene over den for KOE-sakene.

### A. Hva tallene er

1. Punkt 67 i samlevedtaket for endringsordren gjelder for tallene i sakslisten og
   nøkkeltallene. (EO-U34 punkt 67; MM-U12)
2. Et ukjent beløp er ikke 0. Varsler, krav etter regningsarbeid eller enhetspriser og
   endringsordrer uten samlet beløp telles for seg, fordi beløpet er ukjent og ikke 0.
   (MM-U38; OV-U43 punkt 3; MM-U28)
3. Beløpene er eks. mva. (MM-U37; MM-U38)

### B. Nøkkeltallene

4. Over sakslisten står ett kort for vederlag og ett for fristforlengelse. Hvert kort viser
   kravene i sakene som ingen sendt endringsordre omfatter, og endringsordrene. (MM-U38)
5. For vederlag er tallene summen av kravene med beløp og summen av vederlaget i alle sendte
   endringsordrer i prosjektet, også dem som ikke omfatter en KOE-sak, med fradrag trukket
   fra. (MM-U38) Hvordan en registrert endringsordre, et bestridt utsagn og et utsagn som
   erstatter det telles, står i samlevedtaket for endringsordren. (EO-U27, EO-U28, EO-U29;
   EO-U34)
6. Summen av kravene er summen av totalentreprenørens gjeldende krav, også når kravene er
   avgjort. (OV-U61; MM-U38)
7. For fristforlengelse er tallene antall krav og antall endringsordrer som gir
   fristforlengelse, og dagene summeres ikke. (MM-U38)
8. Saker som en sendt endringsordre omfatter, trukne krav og saker der totalentreprenøren har
   trukket påberopelsen eller godtatt avslaget på den, er ikke med i summene. (MM-U38;
   OV-U61)
9. Beløp i dokumenter som bare er registrert som dokumentasjon etter OV-U4, inngår ikke i
   summene. Kompensasjonen for rigg og drift i uendret byggetid er ikke med. Krav i flere
   saker kan gjelde samme kostnad, og løsningen kontrollerer det ikke. (OV-U61, slik MM-U38
   lar det stå)
10. Nøkkeltallene har ingen sum for enighet og ingen sum for byggherrens svar. Byggherrens
    svar og enigheten står på siden for saken. (MM-U37; MM-U38; E1)
11. En sak løsningen ikke forstår, er ikke med i summene, og nøkkeltallene sier ikke hvor
    mange slike saker det er. (MM-U39; E3)

### C. Sakslisten

12. Sakslisten viser for hver KOE-sak det totalentreprenøren har krevd eller varslet for
    vederlag og frist, og ikke byggherrens svar, enigheten eller betegnelsen for sporet.
    Lista sier ikke hva en sak venter på, eller hvem som skal handle. (MM-U37)

### Designdel

Hjemmet er [`system.md`](../../.interface-design/system.md), der MM-U22, MM-U30 og MM-U31 står,
eller forløpet for sakslisten når det skrives (#1450). Raden viser beløpet eller dagene,
‹Varslet› når totalentreprenøren har varslet uten beløp eller dager, for varsler løsningen
kjenner etter OV-U5, ‹Regningsarbeid› eller ‹Enhetspriser› når kravet følger en av disse
beregningsreglene, og ellers ‹Ikke krevd›. Omfatter en sendt endringsordre saken, viser lista
merket etter EO-U13 (MM-U37). Kortene står side om side og med samme vekt, og i lista er
tallene dempet for sakene i punkt 8 (MM-U38, designdelen). En sak løsningen ikke forstår, har
ingen egen tekst og ingen tall i raden (MM-U39, designdelen). Betegnelsen per spor etter
MM-U30 og MM-U31 står på siden for saken, ikke i sakslisten (MM-U37). Den samlede betegnelsen
for saken etter MM-U22 står der den står i `system.md`; at sakslisten ikke har en tekst for en
sak som ikke er forstått, snevrer inn MM-U22 for lista (MM-U39).

### Beslutningsdel

Saker løsningen ikke forstår, har ingen egen tekst i sakslisten og telles ikke, fordi slike
saker ikke forekommer i løsningen (MM-U39). MM-U2 står: en hendelse kjernen ikke forstår,
gjør saken ikke forstått.

## Klassene

Etter testen i vedtaksskillen (oppdragsgiver 04.11):

- Punkt 1 har en setning om hva som binder partene, men den står alt i MM-U12 og i punkt 67
  i EO-U34, og forslaget viser bare til den.
- Punkt 2–11 sier hva oversiktene summerer. Det er beslutning eller design.
- Punkt 12 sier hvordan visningen er bygget opp, og er design. Siste setning står også i
  MM-U24 og MM-U29 («Den sier ikke at parten har plikt eller neste trekk»).
- Det OV-U61 sa om hva som regnes som enighet («Byggherrens svar som TE ikke har godtatt,
  regnes ikke som enighet»), og om at svaret på grunnlaget avgjør om en enighet er betinget
  eller virksom, gjaldt summen for enighet. Faller summen bort (E1), står det som regel om
  enighet bare i vedtakene om enighet (GR-U7, MM-U33 steg 5).

Samlevedtaket blir derfor en *beslutning* med designdel. MM-U38 og OV-U61 er *vedtak* i
registeret; etter testen er begge *beslutning med designdel* (se «Kontrollen av klassene»).

## Kontrollen av klassene

En subagent kontrollerte klassene uavhengig 04.11, etter testen i vedtaksskillen, og
konkluderte før den leste avsnittet «Klassene» (svar 8 B i #1534).

- **Samlevedtaket: beslutning med designdel.** Enig. Setningene som kunne gitt *vedtak*, står
  i et annet gjeldende vedtak: punkt 1 i EO-U34 punkt 67 og MM-U12, punkt 5 i EO-U27 og
  EO-U34, virkningen av trekk og godtatt avslag bak punkt 8 i GR-U7 og KA-U6, punkt 9 om
  registrerte brev i OV-U4, og punkt 11 bygger på MM-U2. Punkt 2 sier hvordan oversikten
  teller, ikke hva som regnes med etter kontrakten.
- **MM-U37: design. MM-U39: beslutning med designdel.** Som i registeret.
- **MM-U38: beslutning med designdel**, ikke *vedtak* som i registeret. Hver setning sier
  hvilke kort, summer og tellinger oversikten har; ingen setning binder partene uten å stå i
  KA-U6, GR-U7, OV-U4 eller EO-U27.
- **OV-U61: beslutning med designdel, grensetilfelle**, ikke *vedtak*. Reglene om enighet står
  i GR-U7. Setningen om at svaret på grunnlaget avgjør om enigheten er betinget eller virksom,
  «også når svaret er en endringsordre registrert etter OV-U6», står ikke ordrett i GR-U7
  eller OV-U6, men følger av de to sammen. Avviket betyr lite når OV-U61 oppheves (E1).

Forslaget til retting av klassen, for orkestratoren etter svar 8 B: MM-U38 og OV-U61 til
*beslutning med designdel*, med kontrollen over som resultat i #1534. Ikke kontrollert av
subagenten: henvisningen til MM-U33 steg 5 og til MM-U24 og MM-U29 i «Klassene», og klassene
for MM-U22, MM-U28, MM-U30, MM-U31, OV-U43, OV-U3 og OV-U10, som ikke endres her.

## Endret innhold

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
(punkt 6). Endringen gjorde MM-U38 02.11; radteksten i OV-U61 er ikke rettet.

**E3 Antallet saker som ikke er forstått.** Gammel tekst: OV-U61 «Saker løsningen ikke
forstår, er ikke med i noen sum, og oversikten sier ved summene hvor mange de er.»
Samlevedtaket: punkt 11. Hvorfor: MM-U39 gjorde endringen 02.11 (alternativ B, «som OV-U61 i
dag», ble forkastet); radteksten i OV-U61 er ikke rettet (M2).

**E4 Vilkår som ikke er avklart.** Gammel tekst: OV-U49, D1: «Vilkår som ikke er avklart, er
et eget forhold i tillegg: til de er avklart etter avklaringsreglene nedenfor, regnes kravet
ikke som avgjort etter OV-U3, og beløpet inngår ikke i summen av virksom enighet, også når
grunnlaget er avklart.» og «Nøkkeltallene viser enigheten særskilt og sier hva den bygger
på.» Samlevedtaket: ingen setning; punkt 10. Hvorfor: OV-U69 opphevet OV-U49, og «Endringene
OV-U49 gjorde i andre vedtak, blant annet i GR-U7, GR-U8, KA-U16 og svaret 25.10 på spørsmål 8
om nøkkeltallene, faller bort med det.» Følge for OV-U61 sier det ikke (M3).

## Forholdet til andre samlevedtak

Kontrollert setning for setning mot EO-U34 i `main` (`b2e8057`) og forslaget til
samlevedtaket for akseptfristen på grenen `claude/samlevedtak-akseptfrist-1534`
(`c3b7259`, HF-U23 og HF-U24, svarene «1A, 2A»).

**Resultatet: forslaget endrer ingen setning et annet samlevedtak endrer.**

| Post | EO-U34 | Akseptfristen (HF-U23, HF-U24) | Dette forslaget |
| --- | --- | --- | --- |
| OV-U3 | endrer merknaden om EO-U2 og EO-U5 (E12) | ingen | ingen |
| OV-U43 | endrer setningen «En enighet om beregningsregelen er enighet i vederlagssporet når en sak skal inngå i en endringsordre.» (punkt 5, E12) | ingen setning endres | samler «Nøkkeltallene viser at beløpet etter regelen er ukjent, ikke 0.» (punkt 3) |
| OV-U49 | ingen (bare sitert i E11 fra KA-U45) | står opphevet | står opphevet |
| MM-U38 | ingen direkte; samler EO-U27, EO-U28 og EO-U29 og opphever EO-U16 og EO-U24, som rører MM-U38 | ingen | samler |
| MM-U37 | ingen direkte; merket etter EO-U13 er ‹Inngår i EO-<nummer>› (designdelen, E10) | ingen | samler (designdel) |
| De andre åtte | ingen | ingen | se «Postene i kjeden» |

Tre steder der forslaget viser til EO-U34 i stedet for å gjenta det, så setningen har ett
hjem:

- Punkt 67 i EO-U34, «Summer og nøkkeltall er beregninger og avgjør ikke hva partene har
  avtalt. (EO-U28; EO-U29)». Et første utkast gjentok setningen med egne ord som punkt 1.
  Punkt 1 viser nå til punkt 67.
- Beslutningsdelen i EO-U34, «Sum og kode»: «Summen av vederlag i sendte endringsordrer teller
  en registrert endringsordre (EO-U27) og tilleggene etter EO-U29; nøkkeltallet for et
  bestridende krav følger EO-U28. Summen viser det som ble sendt fra løsningen, og for en
  registrert endringsordre det som ble registrert (EO-U24; EO-U33; E8).» Punkt 5 viser dit.
- Designdelen i EO-U34: merket ‹Inngår i EO-<nummer>› i sakslisten, med koden etter EO-U14.
  Designdelen her viser til merket etter EO-U13 og gjentar ikke ordlyden.

Fra akseptfristen: HF-U24 endrer MM-U24 i `system.md` («en aksept etter fristen uten
registrert svar fra byggherren»), og E4 der stryker «Saken venter på TE, ikke på et nytt svar
fra byggherren.» med henvisning til at hvem som skal handle, er visning. Det berører ikke
punkt 12 her, som bare sier at sakslisten ikke sier hva en sak venter på.

## Prøvingen

UTKAST.

## Spørsmålene til oppdragsgiver

Ingen av spørsmålene endrer hva en bruker gjør i løsningen: de gjelder hva oversikten
summerer og viser. Arbeidsflyten er derfor ikke prøvd med forløp (vedtaksskillen, «Prøv
arbeidsflyten før vedtaksteksten skrives»). Klassen er ikke et spørsmål her: den rettes etter
svar 8 B i #1534, etter den uavhengige kontrollen under «Kontrollen av klassene».

1. **Tilslutning til samlevedtaket for betegnelsene, sakslisten og nøkkeltallene.**
   Bakgrunn: reglene for sakslisten og nøkkeltallene står i fem poster fra 17.10 til 02.11.
   Sakslisten og nøkkeltallene ble vedtatt på nytt 02.11 (sakslisten, kortene og sakene som
   ikke er forstått), men radteksten fra 25.10 om nøkkeltallene står uendret, også der den
   senere er endret: antallet saker som ikke er forstått, og vilkårene fra et vedtak som er
   opphevet. Betegnelsene per krav og per spor står alt i designsystemet og endres ikke.
   Forslaget samler reglene i én tekst med kilde per setning, opphever 25.10-vedtaket om
   nøkkeltallene som egen regel, og samler de tre vedtakene fra 02.11. Hver innholdsendring
   står i E1–E4 med gammel tekst, ny tekst og kilde. Ingen setning et annet samlevedtak
   endrer, endres her; der samlevedtaket for endringsordren alt har regelen, viser forslaget
   dit. Alternativene: **A.** «Samlevedtaket for betegnelsene, sakslisten og nøkkeltallene
   gjelder med E1–E4. Postene det samler, gjelder som «Samlet i samlevedtaket for
   nøkkeltallene». Posten det opphever, gjelder ikke lenger, og i posten det samler én
   setning fra, gjelder resten uendret.» **B.** Samme som A, med rettingene oppdragsgiver gir
   per E-punkt. Anbefalt: A, «ja». Hva valget styrer: hvilken tekst som er regelgrunnlaget
   for sakslisten og nøkkeltallene; de gamle radtekstene leses ikke lenger alene. Forholdet
   til andre poster: samler MM-U37, MM-U38 og MM-U39 og setningen om nøkkeltallene i punkt 3
   i OV-U43; opphever OV-U61; ingen ny regel utover E1. Klasse: beslutning med designdel.

2. **Summen for enighet og for byggherrens svar (E1).** Bakgrunn: vedtaket 25.10 om
   nøkkeltallene har en sum for ‹Enighet om vederlag› (virksom enighet, betinget enighet
   særskilt, enighet uten beløp som antall) og en særskilt visning av byggherrens svar med
   subsidiært standpunkt som totalentreprenøren ikke har godtatt. Vedtaket 02.11 om
   nøkkeltallene sier at det endrer 25.10-vedtaket, og nevner bare tre ting som står fra det:
   beløp i brev som bare er registrert, rigg og drift i uendret byggetid, og krav i flere
   saker som kan gjelde samme kostnad. Kortene har bare krav og endringsordrer. Vedtaket 02.11
   om sakslisten sier: «Byggherrens svar, enigheten og betegnelsen for sporet står på siden
   for saken og ikke i sakslisten.» Bakgrunnen for de to var oppdragsgivers ord 02.11: «Det vi
   vet sikkert: hva TE krever, og hva BH utsteder i en EO». Ingen av de to sier uttrykkelig
   at summen for enighet faller bort.
   Alternativene: **A.** «Nøkkeltallene har ingen sum for enighet og ingen sum for
   byggherrens svar. Byggherrens svar og enigheten står på siden for saken.» Forhold:
   opphever setningene i 25.10-vedtaket om ‹Enighet om vederlag›, betinget enighet, enighet
   uten beløp, svar som ikke er godtatt, svar med subsidiært standpunkt og at svaret på
   grunnlaget avgjør om en enighet er betinget eller virksom i summen. **B.** «Kortet for
   vederlag viser i tillegg summen av beløpene løsningen leser som virksom enighet, med
   betinget enighet særskilt og enighet uten beløp som antall. Byggherrens svar som
   totalentreprenøren ikke har godtatt, regnes ikke som enighet, og svar med subsidiært
   standpunkt vises særskilt.» Forhold: presiserer vedtaket 02.11 om nøkkeltallene, slik at
   «endrer» bare gjelder summen av krav. Anbefalt: A. Belegg: vedtaket 02.11 lister det som
   står, og summene for enighet og svar er ikke med; vedtaket om sakslisten legger svaret og
   enigheten på siden for saken; oppdragsgivers ord om det som vites sikkert. Det er vår
   lesing at listen er uttømmende; teksten sier det ikke. Hva valget styrer: om
   nøkkeltallene i #1450 får en tredje sum, og om regelen for hva som regnes som virksom
   enighet i en sum trengs i første versjon. Hva som er enighet mellom partene, avgjøres ikke
   av valget; det står i vedtakene om enighet.

## Svarene

Ikke stilt ennå.
