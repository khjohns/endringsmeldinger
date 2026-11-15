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
(`tekster.ts`, `Vardensak.svelte`, tabellen `skjemaene`). *Anbefaling* er forslaget i spørsmål 2.

## Grunnsettet

| Handling | Part | Spor | Kilde | Kjernen | Varden | Anbefaling |
| --- | --- | --- | --- | --- | --- | --- |
| Påberopelse av forholdet, med ny sak | TE | grunnlag | 32.1, 32.2; GR-U40, KT-U9, KT-U11 | `opprett_sak` + `krav` (forhold) | bygget (`NySak`) | grunnsett |
| Varsel, sendt fra løsningen | TE | alle | 32.2, 33.4, 34.1.2, 34.1.3; VS-U15, VS-U43, OV-U89 | `send_varsel` | bare frist (33.4) | grunnsett |
| Krav om vederlagsjustering | TE | vederlag | 34; OV-U95 | `krav` (vederlag) | bygget | grunnsett |
| Krav om fristforlengelse | TE | frist | 33.5, 33.6.1; KA-U73, KA-U74 | `krav` (frist) | bygget | grunnsett |
| Svar på påberopelsen, også frafall etter 32.3 c | BH | grunnlag | 32.3; KA-U46, GR-U9 | `brev` med `svar` | **ikke bygget** (`svare:forhold`) | grunnsett |
| Svar på vederlagskravet | BH | vederlag | 34; KA-U46, VS-U56 | `brev` med `svar` | bygget | grunnsett |
| Svar på fristkravet | BH | frist | 33.7; KA-U46, KA-U80 | `brev` med `svar` | bygget | grunnsett |
| Innlegg i fritekst | begge | alle | 5; MM-U47, MM-U48 | **finnes ikke** | **finnes ikke** | grunnsett |
| Oversikten over sporene | begge | alle | MM-U45 (B), MM-U30 (D) | `saksbetegnelse`, `betegnelse` | bygget | grunnsett |

Innlegget er vedtatt (MM-U47 punkt 1–6) og hører til grunnsettet, men finnes verken i kjernen
(ingen treff på «innlegg» i `kjerne/`) eller i Varden (`tekster.ts` sier at innlegg ikke kan sendes
fra løsningen ennå). Byggherrens svar på påberopelsen er heller ikke bygget i Varden. Begge er hull i
grunnsettet (spørsmål 3).

## Handlingene utover grunnsettet

| # | Handling | Part | Spor | Kilde | Kjernen | Varden | Anbefaling og hva valget koster |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Ny versjon av påberopelsen eller kravet | TE | alle | KA-U52, HF-U23 D | `krav` med `erstatter` | bygget | Beholde. Uten den sendes en endring som innlegg, og løsningen viser et krav som ikke gjelder |
| 2.2 | Nytt svar på samme kravversjon | BH | alle | HF-U29, LV-U73 (B) | `revisjon` | ikke bygget (`revidere:*`) | Beholde. Uten den kan byggherren ikke endre standpunkt før en ny kravversjon kommer |
| 2.3 | Aksept av svaret | TE | alle | KA-U1, GR-U7, GR-U8 | `aksept` | bygget | Beholde. Uten den kan løsningen ikke vise enighet, og sporet står åpent |
| 2.4 | Trekk av påberopelsen, kravet eller en kravpost | TE | alle | KA-U51, GR-U30 | `trekk`, felt `trekker` | trekk i ny kravversjon bygget, eget trekk ikke bygget | Beholde. Trekket er et avkall som lukker sporet; som innlegg ville sporet stå åpent |
| 2.5 | «Ingen krav» i et spor | TE | vederlag, frist | KA-U12, KA-U15, KA-U17 | `ingen_krav` | finnes ikke | Utsette, som KA-U15 sier for første versjon. Et spor uten krav lukkes da ikke av løsningen (#493) |
| 2.6 | Forespørsel etter 33.6.2 og svaret på den | BH, TE | frist | 33.6.2; VS-U47 | `foresporsel`, `foresporselssvar` | svaret bygget, forespørselen ikke | Beholde. Forespørselen gir en frist med preklusiv virkning som løsningen må lese |
| 2.7 | Registrering av et brev sendt utenfor løsningen | begge | alle | OV-U79, OV-U84, OV-U85, KA-U20 | `registrert_brev`, `varsel` (registrert) | bare varsel i frist | Beholde. Uten den regnes fristene bare av brev sendt herfra |
| 2.8 | Byggherrens bekreftelse av et svar gitt utenfor løsningen | BH | grunnlag | GR-U35–GR-U37 | `brev` med `svar` | ikke funnet | Beholde, som en form for svar |
| 2.9 | Retting av de navngitte datoene i et sendt brev | TE | grunnlag | OV-U56 (B), MM-U55 | `korrigering` | bygget | Beholde for datoene OV-U56 nevner. Andre rettinger går som manuell prosess (OV-U56) |
| 2.10 | Godkjenning med fullmakt før byggherren sender | BH | alle | GFK-U1–GFK-U28, GFK-U5 (B) | ikke i kjernen | finnes ikke (bare avsenderens egen kontroll, LV-U2) | Beholde vedtakene. Bygges når GFK-U5 er oppfylt |
| 2.11 | Interne notater | team | alle | ingen post; invarianten i `CLAUDE.md`, MS-05 | finnes ikke | finnes ikke | Utsette. Ingen handling i første versjon, og invarianten står til de bygges |

## Avgrensninger som følger av vedtak

Disse stilles ikke som spørsmål. De følger av vedtakene som står i kolonnen.

| Handling | Kilde | Kjernen | Avgrensning |
| --- | --- | --- | --- |
| Forsering og endringsordre som egen sak | OV-U1, OV-U2 slik EO-U39 endret den; FO-U1–FO-U8 | avvises | Utsatt, som oppdragsgiver sier 14.11 |
| Innsigelse etter punkt 5 som egen handling | OV-U1, VS-U46; #1657 | `innsigelse` godtas | Avgjøres i #1657, ikke her |
| Protest, bestridelse, påberopt passivitet | MM-U48, MM-U47 punkt 10 og beslutningsdelen | avvises (`IKKE_I_FOERSTE_VERSJON`), men har skrivegrener | Sendes som innlegg. Kommandoene kan fjernes fra kjernen (arbeidsvalg) |
| Senere begrunnelse fra byggherren | KA-U34 og KA-U35, opphevet av KA-U46 | avvises, men har skrivegren | Sendes som innlegg. Kommandoen kan fjernes (arbeidsvalg) |
| Merking og avklaring | KA-U20 (merkingen ikke i første versjon) | avvises | Kommandoen `avklaring` kan fjernes (arbeidsvalg) |

## Tilstandene

Kjernen utleder én betegnelse per spor (`kjerne/utledning/visning.ts`, `betegnelse`), i denne
rekkefølgen: trukket, spesifisert krav etterspurt, venter på svar, pålegg frafalt, enige, svaret er
ikke godtatt, krav sendt, ingen krav, varslet. Saken får en betegnelse (`saksbetegnelse`): ikke
forstått, avslaget på forholdet godtatt, påberopelsen trukket, kravene avgjort. Svarets resultat er
standpunktet (godkjent, delvis godkjent, avslått, pålegg frafalt), ikke en status. Betegnelsene er
design (MM-U22, MM-U30) og etiketter i visningen. Ingen regel leser dem (`CLAUDE.md`, «Ingen regel
leser en oppsummering»).

Hver betegnelse viser et utsagn fra en handling: *krav sendt*, *venter på svar* og *varslet* fra
grunnsettet; *enige* og *svaret er ikke godtatt* fra aksepten (2.3); *trukket* fra trekket (2.4);
*ingen krav* fra 2.5; *spesifisert krav etterspurt* fra forespørselen (2.6); *pålegg frafalt* fra
svaret på påberopelsen; *ikke forstått* fra MM-U2 og MM-U43. En betegnelse finnes derfor bare så
lenge handlingen den viser, finnes (punkt 4 i forslaget).

## Spørsmålene

Stilt 15.11 direkte til oppdragsgiver («Du kan stille meg spørsmål direkte - ikke via
orkestrator»). Svarene føres inn her og deretter av orkestratoren i vedtaksregisteret.

### Spørsmål 1: grunnsettet og regelen for handlinger utover det

Belegg: OV-U1 lister handlingene i første versjon uten en regel for hva som kan legges til.
MM-U48 krever et nytt vedtak før protest eller bestridelse blir en egen handling. Spørsmålet gjør
det til en regel for alle handlinger. Klasse: beslutning.

- **A (anbefalt):** «Løsningen har et grunnsett av handlinger i hvert av sporene grunnlag,
  vederlag og frist: totalentreprenøren sender påberopelse, varsel eller krav, byggherren svarer,
  og begge parter kan sende innlegg i fritekst. En handling utover grunnsettet finnes bare når en
  bestemmelse i NS 8407 eller et vedtak gir den en virkning løsningen må lese for å vise kravet,
  svaret, enigheten eller fristene riktig, eller når den avgjør hvem som kan sende på vegne av en
  part. Det andre en part vil meddele, sendes som innlegg. En ny handling utover grunnsettet krever
  et vedtak som viser til bestemmelsen eller vedtaket, og som sier hva handlingen koster i
  løsningen og for brukerne.» Forhold: presiserer OV-U1. I tråd med MM-U48 og MM-U47 punkt 4.
- **B:** «Handlingene er de OV-U1 og vedtakene etter den lister. Det gis ingen egen regel for nye
  handlinger.» Forhold: ingen.
- **C:** «Første versjon har bare grunnsettet. Aksept, trekk, forespørsel etter punkt 33.6.2 og de
  andre handlingene utover grunnsettet sendes som innlegg til de er vurdert på nytt.» Forhold:
  endrer OV-U1 og setter KA-U1, KA-U51 og VS-U47 til side i første versjon.

Anbefaling: A. Den gir grunnsettet oppdragsgiver beskrev, og en prøve for resten som allerede er
brukt for protest og bestridelse. C ville gjøre enighet, trekk og fristen etter 33.6.2 til fritekst
løsningen ikke tolker (MM-U47 punkt 4), så oversikten ville vise et spor som åpent når det er
avgjort. Styrer: hvilke handlinger kjernen og Varden har, og prøven for hver ny handling.

### Spørsmål 2: samlet forslag for handlingene utover grunnsettet

Forutsetter A i spørsmål 1. Svar «ja», eller rett enkeltpunkter. Belegget og hva valget koster,
står i tabellen «Handlingene utover grunnsettet».

«Handlingene utover grunnsettet er disse:
1. Beholdes: ny versjon av påberopelsen eller kravet (KA-U52), nytt svar på samme kravversjon
   (HF-U29), aksept av svaret (KA-U1), trekk av påberopelsen, kravet eller en kravpost (KA-U51),
   forespørsel etter punkt 33.6.2 og svaret på den (VS-U47), registrering av et brev sendt utenfor
   løsningen (OV-U79), byggherrens bekreftelse av et svar gitt utenfor løsningen (GR-U35) og
   rettingen av datoene OV-U56 nevner (MM-U55).
2. Utsettes: «ingen krav» (KA-U15) og interne notater. Interne notater får en handling først ved et
   nytt vedtak.
3. Godkjenning med fullmakt beholdes som vedtatt og bygges når GFK-U5 er oppfylt.
4. Tilstandene i oversikten viser utsagnene fra handlingene i grunnsettet og i punkt 1. En tilstand
   finnes bare så lenge handlingen den viser, finnes.»

Forhold: presiserer OV-U1. Ingen vedtak endres: punkt 2 følger KA-U15, og punkt 3 følger GFK-U5.
Anbefaling: ja. Styrer: hva kjernen beholder, hva Varden bygger, og hvilke betegnelser oversikten
har.

### Spørsmål 3: rekkefølgen (prioritering, ikke juridisk)

Grunnsettet har to hull: innlegget finnes verken i kjernen eller Varden, og byggherrens svar på
påberopelsen er ikke bygget i Varden.

- **A (anbefalt):** Innlegget og byggherrens svar på påberopelsen bygges før de andre handlingene
  utover grunnsettet som ikke er bygget i Varden (nytt svar, eget trekk, forespørselen,
  registreringen av andre brev). Orkestratoren oppretter issuet for innlegget.
- **B:** Rekkefølgen i #1065 står uendret.

Anbefaling: A. Uten innlegget har partene ingen vei for det skjemaene ikke dekker, og MM-U48 og
MM-U47 punkt 10 forutsetter det. Styrer: rekkefølgen i #1065.

### Svarene

Ikke besvart.

## Verifikasjon og grenser

Lest ut av koden, ikke kjørt: kjernens kommandoer, forutsetninger og utledningen av betegnelsene,
`kjernehendelser.toml` og Varden-komponentene, av tre subagenter. Vedtakene er slått opp med
`vedtaksregister.py --vis`; hvilke poster som gjelder, er regnet av et skript etter forholdene
`opphever` og `samler`. Punktene inne i samlevedtakene er ikke lest, unntatt MM-U47. Hvilken part
kjernen tilbyr hver handling, er lest av `PART` i `kjerne/kommandoer/forutsetninger.ts`, ikke
kjørt. `Saksliste.svelte`, `lesing.ts` og skjemaenes detaljer er ikke kontrollert. Om EO-U39 flytter
endringsordre som egen sak inn i første versjon, er ikke kontrollert.
