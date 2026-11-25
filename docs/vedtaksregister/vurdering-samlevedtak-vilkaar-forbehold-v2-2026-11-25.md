# Samlevedtak: vilkår og forbehold, versjon 2

Dato: 25.11.2026. Kontrollert commit: `01c0842` (`main`). Del av #1534, steg 4, oppgaven i #2371
(svar 10 A 25.11), i formen etter svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)),
med [A3](vurdering-samlevedtak-a3-2026-11-25.md) som mønster. Fila viser til punktene i
[KA-U49](../plans/vedtak.md#samlevedtak-vilkaar-forbehold) uten å gjengi dem, og skriver ikke i
`vedtak.toml`. Den foreløpige ID-en er KA-U87, den neste ledige etter #2356 (MM-U60, VS-U87) og
#2395 (OV-U124).

**Grensen.** Versjon 2 tar inn endringene etter 04.11 og det som trengs for å lese regelen av ett
vedtak. Det som bare endrer andre temaer, står med sine forhold, og versjonen viser dit.
Nummereringen står: OV-U115 punkt 6–7, OV-U123 punkt 6, BF-08 og `kjerne/frosset/brevtekst.ts`
viser til punkt 1, 4, 6, 8 og 10. **Prinsippet 14.11:** vedtaket sier budskapet, ordlyden står i
designdelen.

## Endringene

`vedtaksregister.py --sjekk` på `01c0842`: KA-U49 har 6 endringer. Verktøyet teller også endringer
av postene KA-U49 samler (KA-U45, OV-U46).

| Post | Forhold | Hva den endrer |
| --- | --- | --- |
| KA-U82 (14.11) | utvider KA-U49, presiserer KA-U19, endrer KA-U50 | Punkt 1–3 og 5 for totalentreprenørens krav om fristforlengelse og vederlagsjustering, og siste setning i punkt 1 (KA-U50) |
| OV-U101 (15.11, samlet i OV-U123) | endrer KA-U49 og OV-U46 | Punkt 11 utgår (Følge i OV-U101: «endrer KA-U49 (punkt 11 utgår)»). Står i OV-U123 punkt 6–7 |
| OV-U115 (17.11) | presiserer KA-U49 | Punkt 8: når enighet registreres uten aksept (OV-U115 punkt 25) |
| LV-U81 (25.11, design) | presiserer KA-U49 og GR-U34 | Designdelen: «sist i brevet» er sist i hele brevet, høyst ett punkt «Forbehold» |
| GR-U36 (12.11) | presiserer og utvider OV-U46 | Ingen setning i KA-U49. Gjelder henvisningen og det nye svaret etter den, som etter tabellen «Postene i kjeden» 04.11 hører til kjeden for svar gitt utenfor løsningen |
| EO-U39 (05.11) | endrer KA-U45 (overtatt fra EO-U34) | Ingen setning i KA-U49. Forholdet er E11 i EO-U34 (KA-U45 s2), som KA-U49 alt holdt utenfor |
| OV-U124 (#2395, kommer) | endrer OV-U46 og OV-U12 | Ingen setning i KA-U49. Gjelder «henvisningen til OV-U12» i OV-U46: hvilket krav en endringsordre lagt til som svar kan svare på |

## Motsigelser og hull

- **M1 Totalentreprenørens vilkår og forbehold.** Punkt 1 sier at det som gjelder for dem, «endres
  ikke». KA-U82 endrer setningen og gir regler for kravet. Løses i E9.
- **M2 Punkt 11** lar byggherren bekrefte et svar gitt utenfor løsningen. OV-U101 opphever
  bekreftelsen. Løses i E10.
- **M3 Punkt 8.** «Om partene er enige, følger av at svaret godkjenner hele kravet» leses alene som
  at en godkjenning av beløpet gir enighet. OV-U115 punkt 25 sier når enighet om vederlaget
  registreres uten aksept. Løses i E11.
- **M4 MM-U12** i punkt 1 og 6 er opphevet av MM-U50, og henvisningene gjelder MM-U50 (E9 i
  MM-U50). Løses i E14.

Ingen av dem krever et valg: hver løses av en post som er vedtatt, og E9–E14 fører den inn.

## Utkastet

Punktene som ikke nevnes, står som i KA-U49, og nummereringen står. Ny tekst med kilde:

### Vilkår og forbehold i krav og svar, versjon 2 (foreløpig KA-U87)

- **Tittelen.** «Samlevedtaket for vilkår og forbehold i krav og svar». (KA-U82; E9)
- **Punkt 1.** Som i KA-U49, med «det TE godtar» som «det totalentreprenøren godtar», «(MM-U12)» som
  «(MM-U50)», og siste setning: «Vilkår og forbehold totalentreprenøren knytter til et krav, står i
  punkt 12.» (KA-U50; KA-U82, forholdet «endrer siste setning i KA-U50»; E9, E14)
- **Punkt 6.** «(MM-U12)» blir «(MM-U50)». (E14)
- **Punkt 7.** «TEs aksept» blir «Totalentreprenørens aksept». (E14)
- **Punkt 8.** «Godkjenner byggherren oppgjør som fast sum, sier brevet at byggherren godkjenner
  oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret. Brevet betegner ikke
  tilbudet som akseptert. Om partene er enige, følger av punkt 25 i samlevedtaket for
  vederlagsmetoden, ikke av setningen.» (LV-U32 s1, s3 og s4; OV-U69 s13; OV-U115 punkt 25; E11,
  E12)
- **Punkt 11.** «Utgått. Byggherren bekrefter ikke i et brev fra løsningen et svar gitt utenfor
  løsningen. Et slikt svar legges til som svar etter punkt 7 i samlevedtaket for brev sendt utenfor
  løsningen, og et forbehold i det tolkes ikke (punkt 6 der).» (OV-U101; OV-U123 punkt 6–7; E10)
- **D. Totalentreprenørens krav. Punkt 12, nytt.** KA-U82 ordrett, uten forholdet: «Vilkår og
  forbehold totalentreprenøren knytter til et krav om fristforlengelse eller vederlagsjustering,
  skrives i kravet: i utdypningen for punktet de gjelder, eller under «Forbehold» når de gjelder
  hele kravet. Teksten under «Forbehold» oppfyller ikke kravet om begrunnelse, og den sperrer
  ingenting. Vilkår og forbehold vises med kravet og tolkes ikke, og partene følger dem opp selv.
  Et vilkår eller forbehold i kravet gjør ikke enigheten betinget i løsningen, og løsningen avgjør
  ikke om byggherrens svar rettslig omfatter det (MM-U50). Det gjelder ikke påberopelsen av
  forholdet.» (KA-U82 s1–s5; E9)
- **Designdelen, nye setninger.** «Brevet med byggherrens svar sier: «Byggherren godkjenner oppgjør
  som fast sum med beløpet og forbeholdene som fremgår av svaret.»» (LV-U32 s1; E12) «Brevet har
  høyst ett punkt «Forbehold», sist i hele brevet, etter LV-U81.» (LV-U81; E13) «Skjemaet for TEs
  aksept» blir «Skjemaet for totalentreprenørens aksept». (E14)
- **Beslutningsdelen, ny setning.** «Feltet for forbehold i kravet står i LV-U74.» (LV-U74, Følge:
  «Gjelder ved KA-U82»; E9)

### Endret innhold

- **E9** Punkt 1, siste setning, og punkt 12: totalentreprenørens vilkår og forbehold (KA-U82; M1).
  Tittelen dekker krav og svar.
- **E10** Punkt 11 utgår (OV-U101, samlet i OV-U123 punkt 7; M2). KA-U49 samlet fra OV-U46 bare
  setningen OV-U69 la til om bekreftelsen (tabellen «Postene i kjeden» 04.11), og den er punkt 11.
- **E11** Punkt 8: enigheten følger OV-U115 punkt 25 (M3).
- **E12** Punkt 8: ordlyden flyttes til designdelen, og punktet sier budskapet (prinsippet 14.11).
  OV-U115 punkt 6 viser fortsatt hit for brevteksten.
- **E13** Designdelen: LV-U81.
- **E14** Språket: «TE» blir «totalentreprenøren», og MM-U12 blir MM-U50 (M4).
- **Hovedregelen** (OV-U92): (a). Henvisningene til KA-U49 gjelder versjon 2.

### Forholdene (spørsmål 2)

Versjon 2 opphever KA-U49 (svar 4 A, fordi E9 og E10 endrer innholdet). Forholdene i KA-U49 føres
videre, unntatt «samler OV-U46» (E10). Versjon 2 samler KA-U50 (punkt 1) og KA-U82 (punkt 12), og
forholdet til KA-U19 står på KA-U82. OV-U101, OV-U115, LV-U81, GR-U36 og EO-U39 står med sine
forhold, fordi de også endrer OV-U46, OV-U99, GR-U34 og andre temaer, og forholdene til KA-U49
gjelder versjon 2 (OV-U92 (a)).

**OV-U124.** Står og samles ikke. Den endrer bare henvisningen til OV-U12 i OV-U46, som ikke står i
samlevedtaket. Når versjon 2 ikke lenger samler OV-U46, blir OV-U124 ikke en endring av temaet, og
#2395 trenger ingen ny versjon etter merge.

## Spørsmålene

> **1. Tilslutning.** Gjelder utkastet over, med punkt 1, 6–8, 11 og 12, designdelen,
> beslutningsdelen og E9–E14, som samlevedtaket for vilkår og forbehold i krav og svar, versjon 2?
> Svar «ja» eller rett enkeltpunkter. Styrer: den nye posten.

> **2. Forholdene og OV-U124.** Bakgrunn: svar 4 A og OV-U92. Alternativer: **A (anbefalt)** som
> «Forholdene» over: versjon 2 samler ikke OV-U46, og OV-U124 står. **B:** «Som A, men versjon 2
> samler fortsatt OV-U46, og OV-U124 samles i versjon 2 når #2395 er merget, med en setning om
> endringsordren i punkt 11.» Anbefaling: A. Ingen setning fra OV-U46 står igjen i samlevedtaket
> etter OV-U101, og OV-U124 hører til endringsordren og brev sendt utenfor løsningen (OV-U12,
> OV-U123 punkt 8). Med B får samlevedtaket en regel fra et annet tema og telles på nytt ved neste
> endring av OV-U46. Styrer: `folge` i den nye posten og om #2395 må vente på en ny versjon.

### Svaret

Venter.

## Berørt kode og forløp

- **Henvisningene.** Når versjon 2 opphever KA-U49, skiftes henvisningene ut i samme PR, som i A3:
  `kjerne/frosset/brevtekst.ts` (to kommentarer, ingen versjonsøkning, #1549),
  `src/lib/components/varden/` (tre filer), `docs/domenetabell/brukerforlop/BF-08.md`,
  `BF-08.json` og `dekning.md`. Vedleggene og de daterte vurderingene står (historiske).
- **Forløpene.** BF-08 viser til punkt 6 og samlevedtaket, og BF-01 er hjemmet for designdelen.
  Innholdet endres ikke, fordi versjon 2 bare fører inn poster som er vedtatt. KA-U82 bygges i
  #1823.
- **Kodefunn:** ingen. Om koden for bekreftelsen etter punkt 11 er fjernet, hører til OV-U101
  (#1834).

## Verifikasjon og grenser

- **Kjørt og observert:** `vedtaksregister.py --sjekk` og `--kjede KA-U49`, og `--vis` for postene i
  tabellen, på `01c0842`. Hvilke seks endringer verktøyet teller, med logikken i
  `varsler` kjørt mot registeret. OV-U124 lest fra grenen til #2395. Henvisningene
  talt med `grep`.
- **Lest:** KA-U49 i `vedtak.md`, tabellen «Postene i kjeden» i vurderingen 04.11, OV-U115 punkt 6–7
  og 25, OV-U123 punkt 6–7, og Følge i OV-U101 og EO-U39.
- **Ikke kontrollert:** sitatene fra NS 8407 (teksten er ikke klonet), om koden i `kjerne/` og
  `src/` følger punktene, og om verktøyet slutter å telle GR-U36, EO-U39 og OV-U124 når KA-U49 er
  opphevet. Det prøves når posten føres. Prøvingen mot vedtakene og kontrollen av klassen gjøres av
  subagenter.
