# Vurdering: handlingene og tilstandene i løsningen

15.11.2026. Kontrollert commit: `72f6e99` på `main`. Del av #1987.

Oppdragsgiver 14.11, ordrett (#1987): «tre spor (per nå - ennå ikke EO eller forsering ), med
oversikt, og handlinger: sende påberopelse eller varsler/krav for TE og svar på dette fra BH.
Viktig er også fritekstinnlegg som gir partene anledning til diskusjon som et strukturert skjema
vil stå i veien for. Alt ut over dette grunnleggende må vurderes grundig: flere handlinger skaper
mer kompleksitet både i app og muligens for brukere.» Og: «Alle tilstander må begrunnes: også
grunnoppsettet.»

Fila viser til vedtakene, bestemmelsene og koden og gjengir ikke vedtakene. Ingen post i
vedtaksregisteret er endret. Spørsmålene står til slutt, ordrett slik de stilles.

**Kolonnene.** *Kilde* er bestemmelsen i NS 8407 eller vedtaks-ID-en, samlevedtaket først.
*Kjernen* er kommandoen i `kjerne/kommandoer/` og elementet i
`docs/datamodell/kjernehendelser.toml`. Kjernen har bare to hendelsestyper, `sak_opprettet` og
`dokument_registrert`; en handling er et dokument med krav, svar eller utsagn. *Varden* er
visningen i `src/lib/components/varden/`. «Ikke bygget» i Varden betyr at kjernen tilbyr handlingen
og knappen vises, men skjemaet svarer «Denne handlingen er ikke bygget i prøven ennå.»
(`Sporlesing.svelte`, `Brevtyper.svelte`, tabellen `skjemaene` i `Vardensak.svelte`). Utfallet for hver handling står i «Skjemaet».

## Kartleggingen: grunnsettet

| Handling | Part | Spor | Kilde | Kjernen | Varden |
| --- | --- | --- | --- | --- | --- |
| Påberopelse av forholdet, med ny sak | TE | grunnlag | 32.1, 32.2; GR-U40, KT-U9, KT-U11 | `opprett_sak` + `krav` (forhold) | bygget (`NySak`) |
| Varsel, sendt fra løsningen | TE | vederlag, frist | 33.4, 34.1.2, 34.1.3; VS-U15, VS-U43, OV-U89 | `send_varsel` | bare frist (33.4) |
| Varsel etter 32.2, registrert | TE | grunnlag | 32.2; VS-U34, GR-U31 | `varsel` med hjemmel 32.2; godtas, men tilbys ikke | finnes ikke |
| Krav om vederlagsjustering | TE | vederlag | 34; OV-U95 | `krav` (vederlag) | bygget |
| Krav om fristforlengelse | TE | frist | 33.5, 33.6.1; KA-U73, KA-U74 | `krav` (frist) | bygget |
| Svar på påberopelsen, også frafall etter 32.3 c | BH | grunnlag | 32.3; KA-U46, GR-U9 | `brev` med `svar` | **ikke bygget** (`svare:forhold`) |
| Svar på vederlagskravet | BH | vederlag | 34; KA-U46, VS-U56 | `brev` med `svar` | bygget |
| Svar på fristkravet | BH | frist | 33.7; KA-U46, KA-U80 | `brev` med `svar` | bygget |
| Bekreftelse av et svar gitt utenfor løsningen | BH | grunnlag | OV-U46; GR-U35–GR-U37 | finnes ikke | finnes ikke |
| Innlegg i fritekst | begge | alle | 5; MM-U47, MM-U48 | **finnes ikke** | **finnes ikke** |
| Oversikten over sporene | begge | alle | MM-U45 (B), MM-U30 (D) | `saksbetegnelse`, `betegnelse` | bygget |

Innlegget er vedtatt (MM-U47 punkt 1–6) og hører til grunnsettet, men finnes verken i kjernen
(ingen treff på «innlegg» i `kjerne/`) eller i Varden (`tekster.ts` sier at innlegg ikke kan sendes
fra løsningen ennå). Byggherrens svar på påberopelsen og varslene i vederlag (34.1.2, 34.1.3) er
ikke bygget i Varden. Det er tre hull i grunnsettet (spørsmål 3). Bekreftelsen er en form for svar
og står derfor i grunnsettet.

## Kartleggingen: utover grunnsettet

| # | Handling | Part | Spor | Kilde | Kjernen | Varden |
| --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Ny versjon av påberopelsen eller kravet | TE | alle | GR-U40, KA-U52, HF-U23 D | `krav` med `erstatter` | bygget |
| 2.2 | Nytt svar på samme kravversjon | BH | alle | HF-U29, LV-U73 (B) | `revisjon` | ikke bygget (`revidere:*`) |
| 2.3 | Aksept av svaret | TE | alle | KA-U1, GR-U7, GR-U8 | `aksept` | bygget |
| 2.4 | Trekk av påberopelsen eller kravet, og av en kravpost i en ny kravversjon | TE | alle | KA-U51, GR-U30; kravposten KA-U56 (samlet i OV-U95) | `trekk`, felt `trekker` | trekk i ny kravversjon bygget, eget trekk ikke bygget |
| 2.5 | «Ingen krav» i et spor | TE | vederlag, frist | KA-U12, KA-U17; utsatt av OV-U7 | `ingen_krav`, godtas og tilbys (K1) | ikke bygget, vises som ukjent handling |
| 2.6 | Forespørsel etter 33.6.2 og svaret på den | BH, TE | frist | 33.6.2; VS-U47 | `foresporsel`, `foresporselssvar` | svaret bygget, forespørselen ikke |
| 2.7 | Registrering av et brev sendt utenfor løsningen, også byggherrens endringsordre som svar på grunnlaget | begge | alle | OV-U79, OV-U80 (samlet i MM-U55), OV-U84, OV-U85; endringsordren OV-U2, OV-U6 | `registrert_brev`, `varsel` (registrert) | varsel etter 33.4 og varsel for en kravpost; andre brev vises ikke |
| 2.8 | Retting av datoene i et sendt brev | TE | alle | MM-U55 beslutningsdelen (endrer OV-U56) | `korrigering` | bygget for datoene i påberopelsen |
| 2.9 | Godkjenning med fullmakt før byggherren sender | BH | alle | GFK-U1–GFK-U28, GFK-U5 (B) | ingen handling; datalaget i `server/godkjenning.ts` og `server/fullmakt.ts`, uten rute | finnes ikke (bare avsenderens egen kontroll, LV-U2) |
| 2.10 | Interne notater | team | alle | ingen post krever dem; MM-U43, GFK-U9 og RP-U1 nevner dem; invarianten i `CLAUDE.md` | finnes ikke; tabellen `koe.notat` med radsikkerhet finnes i migrasjonene | finnes ikke |

## Avgrensninger som følger av vedtak

Disse stilles ikke som spørsmål. De følger av vedtakene som står i kolonnen.

| Handling | Kilde | Kjernen | Avgrensning |
| --- | --- | --- | --- |
| Forsering og endringsordre som egen sak | OV-U1, OV-U2 slik EO-U39 endret den; FO-U1–FO-U6; EO-U39 | avvises | Utsatt, som oppdragsgiver sier 14.11 |
| Den egne innsigelsen etter punkt 5 og påberopt passivitet | VS-U46 beslutningsdelen; #1657 | `innsigelse` godtas, unntatt mot varsel etter 32.2 og for kravposter; Varden viser den ikke (K4) | Utsatt etter VS-U46 og sendes som innlegg. Oppdragsgiver 15.11 vil ikke ha en egen handling (svar 2 i «Drøftingen 15.11»); føres i #1657 |
| Protest og bestridelse | MM-U48, MM-U47 punkt 10 og beslutningsdelen | avvises (`IKKE_I_FOERSTE_VERSJON`); protest har skrivegren | Sendes som innlegg. Kommandoene kan fjernes fra kjernen (arbeidsvalg) |
| Senere begrunnelse fra byggherren | KA-U34 og KA-U35, opphevet av KA-U46 | avvises, men har skrivegren | Sendes som innlegg. Kommandoen kan fjernes (arbeidsvalg) |
| Merking og avklaring | opphevet av KA-U45 | avvises | Kommandoene `merking` og `avklaring` fjernes, fordi vedtakene er opphevet |

## Kartleggingen: tilstandene

Kjernen utleder høyst én betegnelse per spor (`kjerne/utledning/visning.ts`, `betegnelse`), i denne
rekkefølgen: trukket, spesifisert krav etterspurt, venter på svar, pålegg frafalt, enige, svaret er
ikke godtatt, krav sendt, ingen krav, varslet. Saken får en betegnelse (`saksbetegnelse`): ikke
forstått, avslaget på forholdet godtatt, påberopelsen trukket, kravene avgjort. Svarets resultat er
standpunktet (godkjent, delvis godkjent, avslått, pålegg frafalt), ikke en status. Betegnelsene er
design (MM-U22, MM-U30) og etiketter i visningen. Ingen regel leser dem (`CLAUDE.md`, «Ingen regel
leser en oppsummering»).

Hver betegnelse viser et utsagn fra en handling: *venter på svar*, *svaret er ikke godtatt*,
*pålegg frafalt* og *varslet* fra grunnsettet; *enige* og *krav sendt* (som forutsetter at avslaget
på forholdet er godtatt, `FORELIGGER.krav_sendt`) fra aksepten (2.3); *trukket* fra trekket (2.4);
*ingen krav* fra 2.5; *spesifisert krav etterspurt* fra forespørselen (2.6). *Ikke forstått* kommer
ikke fra en handling, men fra at saken ikke er forstått (MM-U2, MM-U43). Punkt 5 i forslaget bygger
på dette.

## Første utkast til spørsmålene (stilt 15.11, satt på vent)

Stilt 15.11 direkte til oppdragsgiver («Du kan stille meg spørsmål direkte - ikke via
orkestrator»). Prøvd mot vedtakene og kontrollert mot koden av to subagenter før de ble stilt, og
rettet etter funnene. Svarene føres inn her og deretter av orkestratoren i vedtaksregisteret.

#### Spørsmål 1: grunnsettet og regelen for handlinger utover det

Belegg: OV-U1 lister handlingene i første versjon uten en regel for hva som kan legges til.
MM-U48 krever et nytt vedtak før protest eller bestridelse blir en egen handling. Spørsmålet gjør
det til en regel for alle handlinger. Klasse: beslutning.

- **A (anbefalt):** «Løsningen har et grunnsett av handlinger i hvert av sporene grunnlag,
  vederlag og frist: totalentreprenøren sender påberopelse, varsel eller krav, byggherren svarer,
  og begge parter kan sende innlegg i fritekst. En handling utover grunnsettet finnes bare når en
  bestemmelse i NS 8407 eller et vedtak gir den en virkning løsningen må lese for å vise kravet,
  svaret, enigheten eller fristene riktig, også når brevet er sendt utenfor løsningen, eller når
  handlingen avgjør hvem som kan sende på vegne av en part. Det andre en part vil meddele, sendes
  som innlegg. En ny handling utover grunnsettet krever et vedtak som viser til bestemmelsen eller
  vedtaket, og som sier hva handlingen koster i løsningen og for brukerne.» Forhold: presiserer
  OV-U1; utvider MM-U48 til alle handlinger utover grunnsettet. Den egne innsigelsen etter punkt 5
  avgjøres ikke av dette alternativet: VS-U46 står, og #1657 gjelder den.
- **B:** «Handlingene er de OV-U1 og vedtakene etter den lister. Det gis ingen egen regel for nye
  handlinger.» Forhold: ingen.
- **C:** «Første versjon har bare grunnsettet. Aksept, trekk, forespørsel etter punkt 33.6.2 og de
  andre handlingene utover grunnsettet sendes som innlegg til de er vurdert på nytt.» Forhold:
  endrer OV-U1 og setter i første versjon til side KA-U1, KA-U51, KA-U52, GR-U40, HF-U29, VS-U47,
  OV-U79, OV-U84, OV-U2 og OV-U6 (endringsordren registrert som svar) og beslutningsdelen i MM-U55,
  som krever rettingene før første ekte sak.

Anbefaling: A. Den gir grunnsettet oppdragsgiver beskrev, og en prøve for resten som allerede er
brukt for protest og bestridelse. C ville gjøre enighet, trekk og fristen etter 33.6.2 til fritekst
løsningen ikke tolker (MM-U47 punkt 4), så oversikten ville vise et spor som åpent når det er
avgjort. Styrer: hvilke handlinger kjernen og Varden har, og prøven for hver ny handling.

#### Spørsmål 2: samlet forslag for handlingene utover grunnsettet

Forutsetter A i spørsmål 1. Svar «ja», eller rett enkeltpunkter. Belegget og hva valget koster,
står i tabellen «Handlingene utover grunnsettet».

«Handlingene utover grunnsettet i første versjon er disse:
1. Beholdes: ny versjon av påberopelsen eller kravet (GR-U40, KA-U52), nytt svar på samme
   kravversjon (HF-U29), aksept av svaret (KA-U1), trekk av påberopelsen eller kravet (KA-U51) og
   av en kravpost i en ny kravversjon (KA-U56), forespørsel etter punkt 33.6.2 og svaret på den
   (VS-U47), registrering av et brev sendt utenfor løsningen (OV-U79, OV-U84), også byggherrens
   endringsordre som svar på grunnlaget (OV-U6), og rettingen av datoene beslutningsdelen i MM-U55
   nevner.
2. Utsettes: «ingen krav» (OV-U7) og interne notater. Interne notater får en handling først ved et
   nytt vedtak.
3. Utsatt etter gjeldende vedtak, uendret: forsering (FO-U1–FO-U6), endringsordre som egen sak
   (EO-U39), og den egne innsigelsen etter punkt 5 og påberopt passivitet (VS-U46).
4. Godkjenning med fullmakt beholdes som vedtatt og bygges når GFK-U5 er oppfylt.
5. Tilstandene i oversikten viser utsagnene fra handlingene i grunnsettet og i punkt 1, og at saken
   ikke er forstått (MM-U2, MM-U43). En tilstand finnes bare så lenge handlingen den viser, finnes.»

Forhold: presiserer OV-U1. Ingen vedtak endres: punkt 2 følger OV-U7, punkt 3 gjentar
gjeldende vedtak, og punkt 4 følger GFK-U5. Anbefaling: ja. Styrer: hva kjernen beholder, hva
Varden bygger, og hvilke betegnelser oversikten har.

#### Spørsmål 3: rekkefølgen (prioritering, ikke juridisk)

Grunnsettet har tre hull: innlegget finnes verken i kjernen eller Varden, og byggherrens svar på
påberopelsen og varslene i vederlag (34.1.2, 34.1.3) er ikke bygget i Varden.

- **A (anbefalt):** De tre hullene i grunnsettet bygges før de andre handlingene utover
  grunnsettet som ikke er bygget i Varden (nytt svar, eget trekk, forespørselen, registreringen av
  andre brev). Orkestratoren oppretter issuet for innlegget.
- **B:** Rekkefølgen i #1065 står uendret.

Anbefaling: A. Uten innlegget har partene ingen vei for det skjemaene ikke dekker. MM-U48, MM-U47
punkt 10, KA-U46 punkt 9, VS-U46, MM-U55 punkt 14–15 og OV-U85 sender alle saker dit. Styrer:
rekkefølgen i #1065.

#### Svarene

Satt på vent av oppdragsgiver 15.11 for å drøfte kriteriene først (se «Drøftingen 15.11»).

## Drøftingen 15.11

Spørsmål 1–3 over er satt på vent. Oppdragsgiver 15.11, ordrett: «La oss drøfte momenter eller
kriterier for å vurdere tilstander/handlinger først. Både rettslig, kompleksitet i kode,
brukerbehov osv». Kriteriene ble drøftet med en sparringsøkt. Det som står her, er arbeidsgrunnlag,
ikke vedtak.

**Metoden.** Hver handling får ja, nei eller «delvis» og én linje begrunnelse per port, i fast
rekkefølge. En helhetsvurdering skrives bare der en port står på «delvis».

| Port | Spørsmål |
| --- | --- |
| 0 Tilstandene i grunnsettet | Sier tilstanden hvem som har sagt hva, og hvem som står for tur, uten å konkludere det kontrakten overlater til partene? Sporet viser et innlegg etter siste strukturerte handling uten å tolke det |
| 1 Finnes? | Leser en regel, en sperre eller en frist i kjernen utsagnet, eller motsier oversikten det? For andre handlinger enn utsagn til motparten: organisatorisk behov og tilgang |
| 2 Form | Strukturert eller innlegg; egen handling eller en form av en som finnes; hva brevet må si uttrykkelig for at handlingen ikke sendes ved en feil |
| 3 Når | Avhenger virkningen av når utsagnet ble gitt? Omveien, hyppigheten (antakelse), veid mot samspillet i koden |
| 4 Tilstander | Hvilke tilstander handlingen åpner og lukker; hver tilstand har en vei ut |
| Kostnad | Ny regel i kjernen, nytt skjema i Varden, eller ingen av delene |

**Prøvd på fem tilfeller.** Trekk: beholde (rettet 15.11 etter oppdragsgivers kontroll: trekk av
en kravpost er en form av ny kravversjon, ikke av trekket). Nytt svar (HF-U29): beholde, en form av svar. Innsigelsen etter punkt 5: innlegg i
første versjon; ingen regel leser den egne innsigelsen da (VS-U46, beslutningsdelen). Bekreftelsen (OV-U46): senere, med registrert svar som omvei. «Ingen krav»:
port 1 ja (KA-U17), port 3 senere (OV-U7). Port 0: «venter på svar» og «varslet» holder; «svaret er
ikke godtatt» og «krav sendt» feiler.

**Oppdragsgivers svar 15.11, ordrett:**
1. Om å bytte «svaret er ikke godtatt» med «byggherren har svart» og fjerne «krav sendt»: «enig».
   Design (MM-U30).
2. «innsigelse: jeg er ikkenoverbevist om at det skal være en egen handling i frontend. Tenker
   partene kan fint sende dette uoppfordret i fritekstinnlegg også». Føres i #1657.
3. «Dette henger vel generelt sammen med all form for registrering. TE kan registrere flere
   varsler, blant annet. Når er det grunn til å behandle registrering ulikt?»

**Arbeidssvaret på 3**, prøvd av sparringsøkta mot OV-U79, OV-U80, OV-U84, OV-U85, OV-U11, OV-U46
og OV-U6:
- En registrering får virkning bare for utsagn der en frist avhenger av når brevet ble sendt:
  varsel, krav og svar (valgene i OV-U80). Aksept, trekk og annet står som dokumentasjon, og
  parten gjentar utsagnet fra løsningen uten tap.
- Datoen brukes bare til å regne frister. Rekkefølgen i journalen styrer sperrene og hva som er
  gjeldende (OV-U84).
- Ulik behandling ellers: bare avsenderen gir brevet virkning (OV-U84); en tidligere varseldato er
  en retting som motparten må godta (OV-U84, OV-U11); innhold standpunktene ikke kan uttrykke,
  forblir dokumentasjon (KA-U16, KA-U49); varsel godtas utenfor rekkefølgen, krav og svar bare der
  samme handling fra løsningen ville vært godtatt (OV-U80); et registrert svar går gjennom
  fullmakten; i en sak løsningen ikke forstår, godtas bare dokumentasjon; endringsordren som svar
  har egne vilkår (OV-U6).
- Bekreftelsen (OV-U46) er ikke en form av registreringen: den er et nytt brev fra løsningen, og
  fristene regnes fra det. Om OV-U46 skal stå ved siden av OV-U80, er et vedtaksspørsmål.
- Rettet etter prøvingen: registreringen med virkning ved innleggingen (OV-U80) bygges nå, fordi
  omveien gir ny dato, og MM-U55 punkt 8 og 18 og EO-U39 forutsetter den. Bare det senere valget
  (OV-U84) kan vente (spørsmål C punkt 1–2).
- Forespørselen etter 33.6.2 registreres alltid (VS-U19), men OV-U80 har den ikke blant valgene;
  B1 utvider OV-U80. Kjernen avviser i dag en registrert forespørsel.

**Oppdragsgivers kontroll av siden 15.11, ordrett** (kontrollspørsmålene på siden «Handlinger
gjennom portene»):
1. «fritekst aksept registrer ikke enighet, det er OK.»
2. «trekk: blander man her trekk av hele kravet, og trekk av enkelt kravpost?» Rettet: trekk av
   hele kravet er en egen handling (KA-U51); trekk av en kravpost er en form av ny kravversjon
   (OV-U95 punkt G).
3. «ja, samme skjema. Men må være tydelig for bruker at det er en revisjon; at dette er svart ut
   tidligere» Kravet til utformingen i port 2 for nytt svar.
4. «handlingen er viktig for at BH skal kunne be om at dager blir spesifisert. Det er viktig for BH
   sin kontroll og oversikt over prosjektet. En slik handling har konsekvenser for både BH og TE,
   spesifisert i kontrakten og vanskelig for en bruker å forstå uten god kjennskap til kontrakten,
   og derfor tenker jeg det er viktig å ha dette strukturert som egen handling» Gir port 2 en grunn
   til: en virkning brukeren vanskelig forstår uten kjennskap til kontrakten, taler for en
   strukturert handling som forklarer den.
5. «innsigelse fremmer enkelt i fritekstinnlegg. Konsekvenser fører partene i kravskjema - kan
   vurderes p legge inn som et strukturert forbehold i kravskjema der det svares på krav eller
   svar» Ideen om et strukturert forbehold berører KA-U16, KA-U49 og VS-U46 og stilles for seg i
   #1657, ikke i denne runden.
6. Om «ingen krav» (kontrollspørsmålet på siden): «Ingen krav fungerer fint. Det er ikke noe krav
   etter kontrakten å meddele ingen krav. Det er en mulighet kun som er beleilig for at partene kan
   kvittere ut usikkerhet rundt krav.» Støtter at U4 venter.

Skjemaet er fylt ut i «Skjemaet», og spørsmålene etter drøftingen står i «Spørsmålene etter drøftingen».

## Skjemaet

Portene står i «Drøftingen 15.11». *Kostnad* er det som mangler: en ny regel i kjernen, et nytt
skjema i Varden, eller ingen av delene. «Hull» betyr at handlingen hører til det som beholdes nå,
men mangler i kjernen eller Varden. Hyppighet er ikke brukt som grunn, fordi den bare er antakelse.

### Grunnsettet

| # | Handling | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Kostnad | Utfall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | Påberopelse av forholdet, med ny sak | Ja. Varslingsfristen etter 32.2 og byggherrens svar etter 32.3 leser den (GR-U40) | Strukturert, egen | Nå | Åpner «venter på svar» | Ingen | Beholde |
| G2 | Varsel fra løsningen (33.4, 34.1.2, 34.1.3) | Ja. Om kravet er varslet i tide, leses av varselet (VS-U15, OV-U89) | Strukturert, egen. Kan sendes før kravet | Nå. Virkningen avhenger av datoen | Åpner «varslet» | Skjema i Varden for vederlag | Beholde. Hull i Varden for vederlag |
| G3 | Krav om vederlagsjustering eller fristforlengelse, også ny versjon | Ja | Strukturert. Ny versjon er en form av kravet (GR-U40, KA-U52) | Nå | Åpner «venter på svar» | Ingen | Beholde |
| G4 | Svar i hvert spor, også frafall, nytt svar og bekreftelse | Ja. Enigheten leser svaret (KA-U1) | Strukturert. Nytt svar (HF-U29) og bekreftelse (OV-U46) er former av svaret. Brevet viser at et svar som står, erstattes | Svar og nytt svar nå. Bekreftelsen senere: registrert svar med opprinnelig dato dekker behovet (OV-U80, U6) | Åpner «byggherren har svart» og «pålegg frafalt», lukker «venter på svar» | Skjema i Varden for svaret på påberopelsen og for nytt svar | Beholde svar og nytt svar. Bekreftelsen venter. Hull i Varden |
| G5 | Innlegg i fritekst | Nei. Ingen regel leser det (MM-U47 punkt 4) | Innlegg. Tar innsigelsen etter punkt 5, protest, bestridelse, passivitet, senere begrunnelse og utdyping | Nå | Merket for innlegg etter siste brev (port 0) | Ny kommando uten regel i kjernen; skjema i Varden | Beholde. Hull i kjernen og Varden |

### Utover grunnsettet

| # | Handling | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Kostnad | Utfall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U1 | Aksept av svaret | Ja. «Enige» og sperren etter enighet leser den (KA-U1) | Strukturert, egen. Brevet sier hvilket svar som godtas | Nå. Uten den er enighet ved sammenfall (GR-U10) den eneste veien; et innlegg leses ikke som aksept | Åpner «enige», lukker «byggherren har svart» | Ingen | Beholde |
| U2 | Trekk av påberopelsen eller hele kravet | Ja. Avkall som lukker sporet (KA-U51) | Strukturert, egen. Trekk av en kravpost er ikke en form av trekket, men av ny kravversjon (OV-U95 punkt G): kravet står, og sporet lukkes ikke. Brevet sier hva som trekkes, og at det er et avkall | Nå. Ingen omvei | Åpner «trukket», som er sluttilstand | Skjema i Varden for eget trekk | Beholde. Hull i Varden |
| U3 | Forespørsel etter 33.6.2, og svaret på den | Ja. Fristen leser den (VS-U47) | Strukturert, egen | Nå. Fristen løper fra forespørselen | Åpner «spesifisert krav etterspurt»; svaret lukker den | Skjema i Varden for forespørselen | Beholde. Hull i Varden |
| U4 | «Ingen krav» | Ja. Avkall (KA-U17) | Strukturert | Senere. Tidspunktet betyr ingenting, og OV-U7 utsetter den | «Ingen krav» går ut | Kjernen slutter å tilby den (K1) | Utsette |
| U5 | Registrering som dokumentasjon (OV-U79) | Ikke et utsagn med virkning. Behovet: korrespondansen hører til saken, og den er veien til å reparere senere (OV-U84) | Strukturert | Nå | Ingen | Skjema i Varden; kjernen har `registrert_brev` | Beholde. Hull i Varden |
| U6 | Registrering med virkning ved innleggingen: varsel, krav, svar, forespørsel, endringsordre som svar | Ja: fristene regnes fra sendedatoen (OV-U80, VS-U19). Uten den kan ingen svare på et krav, eller godta et svar, sendt utenfor | Former av varsel, krav og svar (OV-U80). Det senere valget for korrespondanse som alt er lagt til (OV-U84), er en egen form | Nå. Omveien, å sende på nytt fra løsningen, gir ny dato. MM-U55 punkt 8 og 18 og EO-U39 forutsetter registreringen. OV-U84 senere | Som handlingen registreringen er en form av | Kjernen leser registrert krav og svar, men har ingen kommando som skriver dem; registrert forespørsel avvises. Ny kommando og regel i kjernen; skjema i Varden | Beholde nå, OV-U84 venter. Hull i kjernen og Varden |
| U7 | Retting av datoer i et sendt brev | Ja (MM-U55) | Strukturert | Nå for datoene i beslutningsdelen i MM-U55 | Ingen ny | Bare korrigeringen av datoen i påberopelsen (punkt 10) er bygget. Rettingen av varseldatoen (punkt 8) og kravdatoen (punkt 18): ny kommando i kjernen og skjema i Varden. Den manuelle korrigeringsprosessen for andre rettinger skal være avklart | Beholde. Hull i kjernen og Varden |
| U8 | Godkjenning med fullmakt | Ikke et utsagn til motparten. Byggherrens organisering av fullmakten, og tilgang (K4) | – | Før første ekte sak etter gjeldende vedtak (GFK-U2, GFK-U14, OV-U80), med GFK-U5 som vilkår for inngangene | Ingen | Rute i serveren og skjema; datalaget finnes (K5) | Spørsmål E |
| U9 | Interne notater | Ikke et utsagn til motparten. Samordning i teamet (antakelse); K4 er høy | – | Senere. De er ikke i journalen (MS-05), så utsettelsen kan repareres fullt ut | Ingen | Tabellen `koe.notat` finnes | Utsette |

### Tilstandene (port 0)

| Betegnelse | Hvem har sagt hva, hvem står for tur | Utfall |
| --- | --- | --- |
| Venter på svar | TE har krevd; BH står for tur | Holder |
| Varslet | TE har varslet; TE står for tur med kravet | Holder |
| Spesifisert krav etterspurt | BH har spurt etter 33.6.2; TE står for tur | Holder |
| Svaret er ikke godtatt | Leses av at TE ikke har sagt noe, og antyder et standpunkt TE ikke har tatt | Byttes med «byggherren har svart» (oppdragsgiver 15.11, design) |
| Pålegg frafalt | BH har frafalt pålegget (32.3 c) | Holder |
| Enige | TE har godtatt BHs svar, eller kravet og svaret sammenfaller (GR-U10) | Holder |
| Krav sendt | Vises bare når TE har godtatt et svar på påberopelsen som ikke avklarer forholdet, og kravet står uten enighet (`FORELIGGER.krav_sendt`); saken har alt «avslaget på forholdet godtatt» | Fjernes (oppdragsgiver 15.11, design) |
| Ingen krav | Fra U4 | Går ut med U4 (T1) |
| Trukket | TE har trukket; sluttilstand | Holder |
| Saken: ikke forstått | Løsningen forstår ikke saken (MM-U2, MM-U43) | Holder |
| Saken: avslaget på forholdet godtatt; påberopelsen trukket | TE har godtatt eller trukket | Holder |
| Saken: kravene avgjort | Predikatet i OV-U3 (`kraveneErAvgjort`); teksten «Alle krav sendt i appen er avgjort» står i OV-U10 (design). «Avgjort» ligger nær en konklusjon (T3) | Design: bør si hva som har skjedd (spørsmål C punkt 6) |
| Ny: innlegg etter siste brev | En part har sendt innlegg etter siste strukturerte handling | Ny merknad, uten tolkning (port 0) |

Etikettene `innsigelse_fra_TE`, `innsigelse_fra_BH` og `passivitet_paaberopt` går ut med
innsigelsen og passiviteten som egne handlinger (T1).

## Spørsmålene etter drøftingen

Stilt direkte til oppdragsgiver. A, B og E er juridiske eller beslutninger med juridisk side, C
er samlet tilslutning til skjemaet, og D er prioritering. Prøvd mot vedtakene og koden av to
subagenter, og de usikre punktene drøftet med sparringsøkta, før de ble stilt. Svarene føres under «Svarene etter
drøftingen» og deretter av orkestratoren i vedtaksregisteret.

### Spørsmål A: regelen for handlinger og tilstander

Belegg: OV-U1 lister handlingene i første versjon uten en regel for hva som kan legges til. MM-U48
krever et nytt vedtak før protest eller bestridelse blir en egen handling. Porten i «Drøftingen
15.11» er prøvd på fem tilfeller. Klasse: beslutning med designdel (siste setning).

- **A1 (anbefalt):** «Løsningen har et grunnsett av handlinger i hvert av sporene grunnlag,
  vederlag og frist: totalentreprenøren sender påberopelse, varsel eller krav, byggherren svarer,
  og begge parter kan sende innlegg i fritekst. En handling utover grunnsettet finnes bare når en
  regel, en sperre eller en frist i løsningen leser utsagnet, når handlingen avgjør hvem som kan
  sende på vegne av en part, eller når et vedtak begrunner et organisatorisk behov for den. Det
  andre en part vil meddele, sendes som innlegg. En handling bygges før første ekte sak når
  virkningen avhenger av når utsagnet ble gitt og omveien taper det, når løsningen ikke har noen
  annen vei til virkningen, eller når et vedtak krever det før første ekte sak; ellers kan den
  vente. En ny handling utover grunnsettet krever et vedtak som viser til
  bestemmelsen eller vedtaket, og som sier hva handlingen koster i løsningen og for brukerne. En
  tilstand i oversikten sier hvem som har sagt hva, og hvem som står for tur, og konkluderer ikke
  det kontrakten overlater til partene.» Forhold: presiserer OV-U1; utvider MM-U48 til alle
  handlinger utover grunnsettet; utvider MM-U22 (designdelen: betegnelsen sier også hvem som står
  for tur).
- **A2:** «Handlingene er de OV-U1 og vedtakene etter den lister. Det gis ingen egen regel for nye
  handlinger eller tilstander.» Forhold: ingen.

Anbefaling: A1. Prøven kan slås opp i kjernen, og den skilte de fem testtilfellene uten skjønn
utenom bekreftelsen. Styrer: hvilke handlinger kjernen og Varden har, rekkefølgen, og prøven for
hver ny handling og betegnelse.

### Spørsmål B: når en registrering får virkning

Belegg: oppdragsgiver 15.11, ordrett: «Når er det grunn til å behandle registrering ulikt?» OV-U80
gir et brev sendt utenfor løsningen virkning som varsel, krav eller svar. VS-U19 sier at en
forespørsel etter punkt 33.6.2 sendt utenfor alltid registreres. OV-U84 lar avsenderen velge
senere, med datoen brevet ble sendt. Klasse: vedtak.

- **B1 (anbefalt, etter prøven av arbeidsflyten):** «Et brev sendt utenfor løsningen får virkning
  i løsningen bare når avsenderen legger det til som et varsel, et krav, et svar (også byggherrens
  endringsordre som svar), en forespørsel etter punkt 33.6.2 eller totalentreprenørens aksept av
  byggherrens svar, fordi virkningen avhenger av når brevet ble sendt. Annet står som
  dokumentasjon, og parten sender utsagnet fra løsningen. Datoen avsenderen oppgir at brevet ble
  sendt, er datoen for utsagnet i løsningen. Ellers avgjør rekkefølgen utsagnene ble lagt til i
  løsningen, sperrene og hva som er gjeldende, med unntakene i OV-U80, OV-U84 og VS-U19. Et krav
  som er sendt før totalentreprenørens siste krav i sporet, blir ikke gjeldende, men datoen det ble
  sendt, gjelder som totalentreprenørens opplysning. Et svar som legges til, gjelder kravversjonen
  det svarer på, og godtas når den var gjeldende da svaret ble sendt. En aksept som legges til,
  gjelder svaret den godtar, og godtas når det var byggherrens gjeldende svar da aksepten ble
  sendt. Et svar byggherren har sendt etter aksepten, står med virkningen det hadde. Hvilket krav
  eller svar som er gjeldende, avgjøres når det legges til, og en senere retting av datoen endrer
  det ikke.» Forhold: endrer OV-U80 (setningen om aksept, og at et tidligere krav ikke blir
  gjeldende selv om valget ellers ville vært godtatt) og utvider den med forespørselen og
  aksepten; snevrer inn OV-U84 (et senere valg av et tidligere krav blir ikke gjeldende);
  presiserer KA-U1 og GR-U7 (gjeldende svar på sendedatoen), HF-U23 punkt 8 og MM-U55 punkt 8 og
  18 (en retting av datoen endrer ikke hva som er gjeldende); følger KA-U52 punkt 5, EO-U39 punkt
  43, OV-U5, OV-U85, VS-U19 (VS-U47 punkt 5) og HF-U29 punkt 3.
- **B2 (det første forslaget):** «Et brev sendt utenfor løsningen får virkning i løsningen bare
  når det er et varsel, et krav, et svar eller en forespørsel etter punkt 33.6.2, fordi fristene
  regnes fra når brevet ble sendt. Annet legges til som dokumentasjon, og parten sender utsagnet
  fra løsningen. Datoen brevet ble sendt, brukes til å regne fristene. Rekkefølgen utsagnene ble
  lagt til i løsningen, avgjør sperrene og hva som er gjeldende, med unntakene i OV-U80 og
  OV-U84.» Forhold: presiserer OV-U80 og OV-U84; utvider OV-U80 med forespørselen.
- **B3:** «OV-U80, OV-U84 og VS-U19 står uten en felles regel.» Forhold: ingen.

Prøven av arbeidsflyten (15.11, fem forløp) fant to hull i B2, og prøvingen av B1 mot vedtakene
rettet teksten én gang (endringsordren er alt et valg i svaret etter OV-U80 og OV-U6):
- Aksept på e-post dag 1, nytt svar fra løsningen dag 5, registrert dag 6: etter B2 kan aksepten
  bare stå som dokumentasjon, og totalentreprenøren mister enigheten i oversikten. Hadde aksepten
  gått gjennom løsningen, ville enigheten stått ved siden av det nye svaret (HF-U29 punkt 3).
- Krav v1 registrert etter v2 fra løsningen blir gjeldende etter rekkefølgen, uten at noen mente
  det. B1 holder v1 utenfor, men bevarer datoen det ble sendt.

Trekket trenger ikke virkning ved registrering: ingen frist eller sperre avhenger av datoen.

Når avsenderen ikke registrerer (byggherren svarer på e-post og lar det ligge), er anbefalingen:
mottakeren legger brevet til, avsenderen får melding, og mottakeren kan sende et innlegg.
Oversikten får en merknad om at et brev fra motparten er lagt til etter kravet og ennå ikke er
valgt av avsenderen, uten å tolke det (design). En registrering mottakeren gjør med virkning som
avsenderen bekrefter, krever et eget vedtak og anbefales ikke nå.

Anbefaling: B1. Den svarer på spørsmålet ditt med én grunn, at virkningen avhenger av når brevet
ble sendt, og den tetter hullene. Kostnaden er at aksepten registrert med virkning må
prøves mot svaret som var gjeldende da den ble sendt, og at byggherren kan se en enighet ved siden
av et nytt svar byggherren trodde virket. Styrer: hva registreringen tilbyr, og at registrering av
varsel, krav, svar og aksept er former av samme handling.

### Spørsmål C: samlet forslag etter skjemaet

Forutsetter A1 og B1. Svar «ja», eller rett enkeltpunkter. Belegget står i «Skjemaet».

«Handlingene i første versjon er disse:
1. Beholdes nå: påberopelsen, varselet, kravet med ny versjon, svaret med nytt svar, innlegget,
   aksepten, trekket av påberopelsen eller hele kravet (trekk av en kravpost er en form av ny
   kravversjon), forespørselen etter punkt
   33.6.2 og svaret på den, registreringen som dokumentasjon, registreringen med virkning ved
   innleggingen for varsel, krav, svar, endringsordre og aksept etter B1 (OV-U80) og registreringen av forespørselen (OV-U16, VS-U47
   punkt 5), byggherrens endringsordre registrert som svar i KOE-saken (EO-U39 punkt 43–46), og
   rettingen av datoene beslutningsdelen i MM-U55
   nevner, med den manuelle korrigeringsprosessen for andre rettinger.
2. Venter: bekreftelsen etter OV-U46, det senere valget for korrespondanse som alt er lagt til som
   dokumentasjon (OV-U84), «ingen krav» (OV-U7) og interne notater. Til valget etter OV-U84 er
   bygget, legger avsenderen korrespondansen til på nytt med valget og med henvisning til den
   første registreringen (OV-U17). Interne notater får en
   handling først ved et nytt vedtak.
3. Protest, bestridelse og byggherrens senere begrunnelse sendes som innlegg til et nytt vedtak
   sier noe annet (MM-U48, KA-U46).
4. Den egne innsigelsen etter punkt 5 og påberopt passivitet sendes som innlegg i første versjon.
   Reglene for dem står (VS-U46, VS-U12).
5. Forsering, endringsordre som egen sak og justering av enhetspriser etter punkt 34.3.3 venter,
   som før (OV-U1).
6. Tilstandene følger porten i A1. Betegnelsen for at kravene er avgjort etter OV-U3, sier hva som
   har skjedd, ikke at kravene er avgjort. Predikatet i OV-U3 står.»

Forhold: utsetter for rekkefølgen OV-U46 (med GR-U35–GR-U37) og OV-U84 (med EO-U39 punkt 49);
vedtakene står. «Ingen krav» følger OV-U7. Punkt 2, andre setning, gjelder til OV-U84 er bygget, og
tar ikke opp igjen alternativet OV-U84 forkastet som varig regel; OV-U13 gjelder i mellomtiden.
Punkt 4 er det VS-U46 alt sier. Punkt 6 endrer, som design: OV-U10 (teksten «Alle krav sendt i
appen er avgjort»), MM-U30 i `system.md` (med oppdragsgivers svar 1: «Svaret er ikke godtatt»
byttes, «Krav sendt» fjernes, «Ingen krav» følger OV-U7, og merknaden for innlegg er ny) og MM-U24
(«Betegnelsene sier ikke hvem som skal handle»), fordi porten i A1 lar betegnelsen si hvem som står
for tur. Byggherrens svar i punkt 1 forutsetter svaret på spørsmål E. Anbefaling: ja. Styrer: hva kjernen beholder, hva Varden bygger, og
betegnelsene.

Tapet ved punkt 4: sender byggherren innsigelsen i et innlegg, må byggherren påberope den i svaret
selv. Ellers leser kjernen svaret uten påberopelse, og for punkt 32.2 blir en godkjenning da en
endringsordre (VS-U46 punkt 11, GR-U13). Med den egne innsigelsen bygget ville et senere svar gjenta
den (punkt 9 og 17). VS-U46 punkt 6 bevarer den første påberopelsen og tidspunktet, så en tidlig
innsigelse i et innlegg vises ikke som den første. Totalentreprenørens innsigelse når ikke kjernen i
første versjon. Om innsigelsen skal være innlegg også etter første versjon, stilles i #1657; da
faller del D i VS-U46 (punkt 15–18 og delene i beslutningsdelen og designdelen om den), og delene i
MM-U47 som viser dit.

### Spørsmål D: rekkefølgen (prioritering, ikke juridisk)

Hullene i det som beholdes nå: innlegget (kjernen og Varden); byggherrens svar på påberopelsen,
varselet i vederlag, eget trekk, nytt svar, forespørselen og registreringen som dokumentasjon
(Varden); rettingen av varseldatoen (punkt 8), datoen etter punkt 12 og kravdatoen (punkt 18) etter MM-U55
(kjernen og Varden), og den manuelle korrigeringsprosessen for andre rettinger; registreringen med virkning (OV-U80) for
krav, svar, forespørsel og endringsordren som svar (kjernen og Varden).

- **D1 (anbefalt):** Grunnsettet først: innlegget og svaret på påberopelsen, så varselet i
  vederlag. Deretter registreringen med virkning og rettingene etter MM-U55, som første ekte sak
  trenger for brev sendt utenfor løsningen. Så eget trekk, nytt svar og forespørselen. Orkestratoren
  oppretter issuene og fører rekkefølgen i #1065.
- **D2:** Rekkefølgen i #1065 står uendret.

Anbefaling: D1. Uten innlegget og svaret på påberopelsen kan en sak ikke føres gjennom
grunnsettet. Styrer: rekkefølgen i #1065.

### Spørsmål E: byggherrens svar før godkjenningen er bygget

Belegg: gjeldende vedtak sier hva som gjelder. Uten roller registrert av driften kan et svar som går
gjennom fullmakten, ikke sendes (GFK-U2, GFK-U14). Mangler kjeden, kan pakken ikke lages (GFK-U10,
GFK-U13). Et registrert svar står som dokumentasjon merket «Til godkjenning» til det er godkjent
(OV-U80), og en endringsordre registrert som svar inngår først når registreringen er godkjent
(EO-U39, beslutningsdelen). GFK-U5 sier når godkjenningsinngangene bygges: når innlogging med Entra
ID og roller fra HR-dataene finnes. Koden avviker: ingen rute i serveren bruker `server/fullmakt.ts`
eller `server/godkjenning.ts`, så et svar sendes i dag uten kontroll av fullmakten (K5). Klasse:
beslutning med juridisk side.

- **E1 (gjeldende):** Vedtakene står. Byggherrens svar, også nytt svar, registrert svar og
  endringsordre registrert som svar, får ikke virkning før godkjenningen er bygget. Forhold:
  følger GFK-U2, GFK-U14 og OV-U80. Følgen: godkjenningen hører til det som bygges før første ekte
  sak, og første ekte sak venter på GFK-U5.
- **E2:** «Før godkjenningen er bygget, sender byggherrens representant etter punkt 9 svaret alene,
  og fullmakten håndteres utenfor løsningen. Løsningen kontrollerer ikke beløpsgrensen. Det gjelder
  ikke et svar der godkjenningen av grunnlaget er en endringsordre.» Forhold: endrer for tiden før
  GFK-U5 er oppfylt GFK-U2, GFK-U13, GFK-U14, LV-U15, posten «Ubegrenset fullmakt kan sende alene
  når beløpet ikke kan verdsettes», OV-U80 og MM-U55 punkt 7 og 20; tar opp igjen det forkastede
  alternativet 1 i GFK-U2 og i LV-U15. B-02 punkt 3 står, derfor unntaket for endringsordre.

Anbefaling: E1, fordi vedtakene om fullmakten er tatt for å verne byggherren, og E2 setter dem til
side for alle svar. E2 er den eneste veien til en første ekte sak uten Entra ID, og kostnaden er at
løsningen sender byggherrens brev uten å ha kontrollert fullmakten. Styrer: om godkjenningen bygges
før første ekte sak, og rekkefølgen i #1065.

### Svarene etter drøftingen

Oppdragsgiver 15.11, ordrett: «Som anbefalt, men en avklaring: for innlegg trenger vi vel kun
fritekstinnlegg? Innsigelse etter pkt 5 vurderes som nevnt som et forbehold i kravskjema.
Passitivitet, protest, bestridelse er ikke noe eget, utover hva som allerede gis i kravskjema.
Riktig forstått?»

Lest som A1, B1, C, D1 og E1. Oppfølgingsspørsmål om C punkt 4, stilt 15.11: skal innsigelsen og
passiviteten være innlegg også etter første versjon? Da lyder punkt 4: «Den egne innsigelsen etter
punkt 5 og påberopt passivitet sendes som innlegg i fritekst. Løsningen har ingen egen handling for
dem. Om innsigelsen skal bli et strukturert forbehold i skjemaet for krav og svar, avgjøres ved et
nytt vedtak (#1657).» Forhold: endrer VS-U46 (del D og beslutningsdelen om den egne innsigelsen)
og VS-U12, og snevrer inn MM-U47 der den viser til dem.

Oppdragsgiver 15.11, ordrett: «Ja jeg tenker det. Men bedre å vedtaksføre ifb 1657 - da vurderer vi
beste løsning samlet sett»

Svarene er dermed A1, B1, C slik forslaget står (punkt 4: innlegg i første versjon, reglene står),
D1 og E1. Om innsigelsen og passiviteten skal være innlegg også etter første versjon, og om
innsigelsen skal bli et forbehold i skjemaet for krav og svar, avgjøres i #1657.

## Kodefunn

Samles i én kommentar i #1987 når spørsmålene er besvart (vedtaksskillen, samlevedtakene).

- **K1.** Kjernen godtar og tilbyr «ingen krav» (`forutsetninger.ts`, `handlinger.ts` `kandidater`),
  mens KA-U15 sier at den ikke bygges i første versjon. Varden viser den som en ukjent handling
  (`tekster.ts` `ukjentHandling`).
- **K2.** Kommandoene for protest, passivitet og senere begrunnelse avvises (passiviteten etter VS-U46), men har skrivegrener i
  `skriving.ts`. Bestridelse, merking og avklaring avvises og kaster i skrivingen.
- **K3.** Varselet etter 32.2 godtas av kjernen, men tilbys ikke (`kandidater`).
- **K4.** Kjernen godtar den egne innsigelsen (`innsigelse`), mens VS-U46 utsetter den.
- **K5.** Ingen rute i serveren bruker `server/fullmakt.ts` eller `server/godkjenning.ts`; byggherrens
  svar sendes uten kontroll av fullmakten, mens GFK-U2 og GFK-U14 sier at det ikke kan sendes uten
  roller og kjede.

## Verifikasjon og grenser

Lest ut av koden, ikke kjørt: kjernens kommandoer, forutsetninger og utledningen av betegnelsene,
`kjernehendelser.toml` og Varden-komponentene, av tre subagenter. Vedtakene er slått opp med
`vedtaksregister.py --vis`; hvilke poster som gjelder, er regnet av et skript etter forholdene
`opphever` og `samler`. Punktene inne i samlevedtakene er ikke lest, unntatt MM-U47. Hvilken part
kjernen tilbyr hver handling, er lest av `PART` i `kjerne/kommandoer/forutsetninger.ts`, ikke
kjørt. NS 8407-teksten er ikke sitert og ikke kontrollert (`khjohns/kontrakt` er ikke lagt til). Arbeidsflyten er ikke prøvd med konkrete forløp; forslaget endrer ikke hva en bruker gjør. `Saksliste.svelte`, `lesing.ts` og skjemaenes detaljer er ikke kontrollert. Om EO-U39 flytter
endringsordre som egen sak inn i første versjon, er ikke kontrollert.
