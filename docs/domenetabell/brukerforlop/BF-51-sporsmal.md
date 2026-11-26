# BF-51: Spørsmålene

Spørsmålene til bestillingen for [BF-51](BF-51.md), skrevet 25.11 for orkestratoren, med teksten
under ordrett. S-1 og S-2 er juridiske og stilles som nummerert liste i tekst. S-3 gjelder ordlyden i
designdelen av et vedtak og er ikke juridisk. Påstandene om koden er kontrollert av en subagent mot
`main` 32e2961. Alternativene er prøvd mot vedtakene og arbeidsflyten av en subagent før spørsmålene
ble stilt, og funnene er rettet. Orkestratoren la dem fram som spørsmål 11 (S-1), 12 (S-2) og 13 (S-3). Svarene står under hvert spørsmål.

S-1 stilles først. S-2 bygger på S-1: ved S-1 B har sporet ingen tilstand, og S-2 gjelder da teksten
på siden for sporet.

## S-1. Skal et spor uten varsel eller krav fra totalentreprenøren ha en egen tilstand?

**Bakgrunn.** Oppdragsgiver 25.11, ordrett: «Noe veldig grunnleggende: både vederlag og frist mangler
en god tilstand for at ingen varsel eller krav foreligger. TE kan ikke sende krav. BH får ikke beskjed
om at varsel eller krav ikke er sendt.» I dag har et spor for vederlagsjustering eller
fristforlengelse uten varsel eller krav ingen betegnelse. Designpunktet MM-U30 sier «Ingen betegnelse
når ingenting er sendt». Byggherren ser en tom side for sporet uten tekst, sporet står uten tekst i
panelet til venstre, og siden for forholdet utelater sporet. Bare når begge sporene er tomme, står
det «Ingen krav om vederlagsjustering eller fristforlengelse ennå.» på siden for forholdet. En ny
tilstand prøves mot portene etter OV-U97.

**Belegg (ordrett, utdrag).**

- OV-U3: «Et spor der TE ikke har sendt et krav, hindrer ikke; et varsel alene er ikke et krav
  (KA-U2).» og «Den sier ikke at saken er oppgjort eller at TE ikke har flere krav, og taushet er ikke
  et avkall.»
- OV-U4: «Appen utleder ingenting av det: ingen standpunkt, enighet, sperre eller uavklart utfall, og
  den fryser ingen vurdering av det.»
- OV-U97: «En tilstand i oversikten sier hvem som har sagt hva, og hvem som står for tur, og
  konkluderer ikke det kontrakten overlater til partene.»
- MM-U30 (design, i systemfila): «Ingen betegnelse når ingenting er sendt, og heller ikke for et krav
  uten svar i en lukket sak.»
- MM-U24 (design, i systemfila): «Betegnelsene sier hvem som har sagt hva, og ikke hvem som skal
  handle.» og «Visningen sier ikke at en part har plikt, at en frist er oversittet, eller at TE ikke
  har flere krav».

**Portene** ([vurderingsfila](../../vurdering-handlinger-og-tilstander-2026-11-15.md#skjemaet)).
Port 0: tilstanden sier hvem som har sagt hva: totalentreprenøren har ikke sendt eller lagt til et
varsel eller krav i sporet. Den sier ikke hvem som står for tur (MM-U24). Port 1: kjernen leser at sporet
ikke har krav (OV-U3), og et varsel uten krav («Varslet», MM-U30). Tilstanden er at ingen av dem
foreligger. Port 4: tilstanden har en vei ut,
totalentreprenørens første varsel eller krav. Kostnaden er et predikat i kjernen, en rad i
handlingsregisteret og teksten i Varden. Ingen ny handling.

**Alternativene.**

- **A:** «Et spor for vederlagsjustering eller fristforlengelse der totalentreprenøren ikke har sendt
  et varsel eller et krav i løsningen, ikke har lagt til et varsel eller et krav sendt utenfor
  løsningen med virkning, og ikke har oppgitt datoen for et varsel sendt utenfor løsningen, har en egen
  tilstand. Tilstanden leses av journalen. Brev lagt til som dokumentasjon og innlegg endrer den ikke.
  Betegnelsen sier at saken ikke har et varsel eller et krav fra totalentreprenøren i sporet. Den sier
  ikke at ingenting er sendt utenfor løsningen, at kravet er tapt, at totalentreprenøren ikke har
  krav, eller hvem som skal handle, og taushet er ikke et avkall. Betegnelsen vises for begge
  partene ved sporet, på siden for sporet og på siden for forholdet, også når kravene i saken er
  avgjort etter OV-U3. Byggherrens forespørsel etter punkt 33.6.2 som ikke er besvart, går foran.
  Betegnelsen vises ikke i en sak som er lukket etter GR-U27, og ikke når saken ikke er forstått. Et
  innlegg eller et brev lagt til som dokumentasjon i sporet står i linja under betegnelsen, uten
  tolkning (OV-U99 punkt 6, OV-U4).»
  *Forhold:* endrer MM-U30 og MM-U22 (designpunktene «Ingen betegnelse når ingenting er sendt» og at
  betegnelsen bare sier hvilket utsagn som foreligger). Legger OV-U97 og OV-U99 punkt 6 til grunn.
  Presiserer OV-U3 og OV-U4 for tilstanden.
- **B:** «MM-U30 står: et spor uten varsel eller krav fra totalentreprenøren har ingen betegnelse og
  ingen tilstand i kjernen. Siden for sporet sier i brevtråden at saken ikke har varsel eller krav fra
  totalentreprenøren om vederlagsjusteringen eller fristforlengelsen, og siden for forholdet viser begge sporene med
  samme tekst.»
  *Forhold:* presiserer MM-U30. Endrer ingen vedtak.

**Anbefaling: A.** Oppdragsgiver ber om en tilstand. A gir kjernen et predikat som leses av journalen,
så visningen ikke avgjør selv hva et tomt spor er, og grensen mot det som er sendt utenfor løsningen
står i tilstanden. B gir bare en tekst, og forskjellen mellom dokumentasjon og et varsel lagt til med
virkning må da avgjøres i visningen.

**Hva valget styrer.** Om kjernen får predikatet og en rad under `[[betegnelse]]` i
handlingsregisteret, og hva U-2, U-5 og U-6 i bestillingen viser.

**Svar:** A, besvart 26.11. Oppdragsgiver svarte samlet på spørsmål 11–13, ordrett: «11 A , 12 A, 13 A» ([kommentaren i #2410](https://github.com/khjohns/endringsmeldinger/issues/2410#issuecomment-7183966669)). Spørsmål 11 er S-1. Ført som [OV-U125](../../plans/vedtak.md#ov-u125) i #2418.

## S-2. Hva skal byggherren se når totalentreprenøren ikke har sendt et varsel eller et krav i sporet?

**Bakgrunn.** Oppdragsgiver skrev at byggherren ikke får beskjed om at varsel eller krav ikke er
sendt. Byggherren kan ha en interesse i å vite det, for eksempel for å vurdere om et senere varsel
kom i tide. Varslingsfristene etter punkt 33.4 og 34.1.2 løper fra totalentreprenøren ble eller
burde ha blitt klar over forholdet, ikke fra en dato løsningen kjenner. Løsningen vet ikke hva som er
sendt utenfor den (OV-U4).

**Belegg (ordrett, utdrag).**

- HF-U11: «Appen trekker ikke selv slutningen om at en frist er oversittet, at en innsigelse kom i
  tide, eller at taushet har gitt virkning (MM-U12).» MM-U12 er opphevet av MM-U50.
- VS-U10 (design): «for en frist etter VS-U2 eller § 5 tredje ledd som løper «uten ugrunnet opphold»
  etter mottaket, viser appen mottaksdatoen, antall dager siden og bestemmelsen, uten en fast frist.
  Forkastet: en veiledende frist per prosjekt, og en fast frist på 10 dager»
- MM-U40 (design, i systemfila): «Varden har ingen arbeidsliste. Siden for saken viser hvilke brev
  som er sendt, av hvem og når, og sier ikke hvem som skal handle.»

**Alternativene.**

- **A:** «Byggherren ser tilstanden etter S-1 ved sporet, på siden for sporet og på siden for
  forholdet. Løsningen sender ingen egen melding om sporet, setter ingen frist og viser ingen
  fristveiledning for totalentreprenørens varsel eller krav i et spor uten varsel eller krav. Den sier
  ikke at en frist er oversittet. Fristveiledningen for svaret på byggherrens forespørsel etter
  punkt 33.6.2 står som før (VS-U10).»
  *Forhold:* presiserer HF-U11 og MM-U40 for et spor uten varsel eller krav.
- **B:** «Som A. I tillegg viser siden for sporet datoen forholdet ble påberopt i saken, antall dager
  siden og bestemmelsen for varselet, punkt 33.4 for fristforlengelsen og punkt 34.1.2 for
  vederlagsjusteringen, uten en fast frist og uten å si at fristen er oversittet.»
  *Forhold:* utvider VS-U10 til en frist som ikke løper fra mottaket av en melding fra motparten.
  Endrer MM-U24 (fristveiledningen står bare ved kravet). Presiserer HF-U11.
- **C:** «Som A. I tillegg får byggherren en melding når totalentreprenøren ikke har sendt et varsel
  eller et krav i sporet innen et fast antall dager etter at forholdet ble påberopt.»
  *Forhold:* endrer VS-U10, som forkastet en fast frist, og MM-U40 og MM-U24, som sier at saken
  ikke sier hvem som skal handle, og at visningen ikke sier at en part har plikt. Strider mot HF-U11 hvis meldingen leses som at fristen er oversittet.

**Anbefaling: A.** Tilstanden sier det løsningen vet. B regner fra påberopelsen, som kan ligge før
totalentreprenøren ble klar over virkningen for vederlaget eller fristen, så dagene kan leses som en
frist løsningen ikke kjenner. C setter en fast frist, som VS-U10 forkastet.

**Hva valget styrer.** Hva U-5 og U-6 i bestillingen viser byggherren, og om siden for sporet får en
fristveiledning.

**Svar:** A, besvart 26.11 i samme svar (spørsmål 12). Ført som [OV-U126](../../plans/vedtak.md#ov-u126) i #2418.

## S-3. Hva sier påminnelsen når totalentreprenøren sender det første kravet i et spor? (ikke juridisk)

**Bakgrunn.** OV-U3 har en designdel med ordlyden for påminnelsen: «Ved innsending av det første
kravet i et spor viser skjemaet, uten avkrysning: «Du sender nå det første kravet i dette sporet.
Appen vurderer ikke om varslings- og kravfrister er overholdt. Tidligere varsler kan være relevante.»
Skjemaet viser også varslene i sporet, sendt fra appen eller med dato oppgitt etter OV-U5.» Påminnelsen
er ikke bygget. Systemfila sier etter #1663 at setninger om hva løsningen ikke avgjør, ikke står i
appen. Oppdragsgiver 13.11 og 14.11: et vedtak angir budskapet, ikke ordlyden (vedtaksskillen).

**Alternativene.**

- **A:** Budskapet i påminnelsen er at totalentreprenøren sender det første kravet i sporet, og
  skjemaet viser varslene i sporet, sendt fra løsningen eller med oppgitt dato. Setningen om at
  løsningen ikke vurderer fristene tas ut, etter #1663. Har sporet ingen varsler, sier skjemaet at
  totalentreprenøren kan legge til et varsel sendt utenfor løsningen, med datoen det ble sendt.
  Ordlyden står i U-3 i bestillingen.
  *Forhold:* endrer designdelen av OV-U3 (setningen om at løsningen ikke vurderer fristene tas ut).
  Budskapet flyttes til U-3 i BF-51.
- **B:** Påminnelsen bygges med ordlyden i OV-U3.

**Anbefaling: A.** Den følger regelen i systemfila og vedtaksskillen om ordlyd, og budskapet i OV-U3
står.

**Svar:** A, besvart 26.11 i samme svar (spørsmål 13). Ingen egen post: ordlyden står i U-3 i bestillingen, som [OV-U3](../../plans/vedtak.md#ov-u3) viser til.
