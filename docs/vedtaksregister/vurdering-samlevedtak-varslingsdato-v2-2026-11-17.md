# Samlevedtak A2: varslingsdatoen, versjon 2

Dato: 17.11.2026. Kontrollert commit: `62dc9f2` (`main`). Del av #1534, steg 4: A2 etter S1 A i
[vurderingen av A1](vurdering-samlevedtak-brev-utenfor-2026-11-17.md#svarene-om-delingen), i formen
etter svar 7 A ([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185))
og [versjon 3 for retting av sendt brev](vurdering-samlevedtak-retting-av-sendt-brev-v3-2026-11-14.md).
Fila viser til punktene i [VS-U43](../plans/vedtak.md#samlevedtak-varslingsdato) uten å gjengi dem,
og skriver ikke i `vedtak.toml`. Den foreløpige ID-en for versjon 2 settes når posten føres.

**Grensen.** Versjon 2 tar med endringene av VS-U43 og det som trengs for å lese regelen av ett
vedtak. Datoen for et eldre krav og varselet som legges til som korrespondanse, har hjemmet i
[OV-U114](../plans/vedtak.md#samlevedtak-brev-utenfor) punkt 12, 15 og 18–20. Versjon 2 viser dit
og gjentar dem ikke. Korrigeringen av datoen har hjemmet i MM-U55 punkt 10. **Prinsippet 14.11:**
vedtaket sier budskapet; ordlyden står i designdelen til forløpet finnes.

## De 6 endringene

`vedtaksregister.py --sjekk`: «vs-u43: har fått 6 endringer», telt etter S2 A og S3 A.

| Post | Forhold | Hva den endrer i VS-U43 |
| --- | --- | --- |
| LV-U53 (04.11) | endrer | Designdelen: henvisningen ‹brev <n> av <dato>› blir ‹brev <merking> av <dato>› |
| LV-U54 → MM-U55 (05.11, samlet 14.11) | presiserer | Designdelen: brevteksten etter en korrigering. MM-U55 E3 lar LV-U54-teksten falle, og MM-U55 punkt 10 og designdelen der gjelder |
| LV-U57 (06.11) | endrer | Designdelen: det første brevet får ‹Pålegget ble mottatt <dato>.› og ‹Totalentreprenøren ble klar over forholdet <dato>.› |
| VS-U70 (12.11) | endrer | Punkt 8, 9 og 10: med både et eget varsel og et tidligere krav gjelder påberopelsen det tidligste. Teksten sier «punkt 7–9» og nevner punkt 33.4, så punkt 7 er også med |
| GR-U40 (14.11) | presiserer | Punkt 6, andre ledd: den nye saken er en ny påberopelse, og det som er sendt i den gamle, følger ikke med (punkt 9–11 der) |
| OV-U102 → OV-U114 (15.11, samlet 17.11) | utvider | Punkt 6, VS-U66 og VS-U70: datoen for et krav utenfor rekken gjelder som datoen kravet i sporet først ble sendt (OV-U114 punkt 15) |

## Motsigelser og hull

- **M1 VS-U70 mot punkt 7–9.** Punkt 7: «Er ikke noe varsel etter punkt 33.4 registrert, er det
  første fristkravet …». Punkt 8 og 9 har samme vilkår. VS-U70: «gjelder byggherrens påberopelse
  … det tidligste av dem». Vilkårene i punkt 7–9 står, men gjelder ikke lenger når kravet er
  tidligere. Løses i E1.
- **M2 GR-U40 mot punkt 6.** Punkt 6 viser til «MM-U12; OV-U57» for at løsningen ikke avgjør om
  varselet «dekker den nye hjemmelen». MM-U12 er opphevet av MM-U50, og GR-U40 punkt 10 sier det
  med andre ord. Løses i E2.
- **M3 Samme dato.** Punkt 6 krever at det egne varselet etter punkt 32.2 har «en tidligere
  dato» (E3 i VS-U43), så ved samme dato gjelder påberopelsen. VS-U70 krever at kravet er «sendt
  før» det egne varselet, og etter OV-U114 punkt 13 er et brev sendt samme dag ikke sendt før det
  andre. Ved samme dato gjelder da det egne varselet etter punkt 33.4, 34.1.2 og 34.1.3, og kravet
  etter punkt 32.2. Spørsmål 1.
- **M4 Henvisninger til poster som er samlet eller opphevet.** Punkt 9 viser til OV-U8 (opphevet
  av OV-U89, Følge der: «viser etter samlevedtaket til punkt 4») og VS-U7 (samlet i OV-U114).
  Punkt 10, siste setning, og punkt 12 gjentar OV-U114 punkt 18. Løses i E3.
- **M5 VS-U70 mot designdelen.** Designdelen: brevet «viser til varselet slik totalentreprenøren
  har meddelt det (LV-U10)». Etter VS-U70 gjelder påberopelsen kravet når det er sendt før det
  egne varselet. Løses i E1.

## Utkastet til versjon 2

Punkt 2, 3, 5, 11, 13–16 står som i VS-U43. Nummereringen står, så henvisningene til punkt 6–10 i
VS-U58, VS-U60, VS-U66, VS-U70, MM-U55 og koden virker. Ny tekst med kilde:

- **Punkt 1, første setning.** «I påberopelsen av forholdet oppgir totalentreprenøren datoen
  varslingsplikten løper fra.» (VS-U43 punkt 1; E5)
- **Punkt 4.** «Påberopelsen av forholdet blir ikke et varsel etter punkt 33.4 eller punkt
  34.1.2.» (VS-U43 punkt 4; E5)
- **Punkt 6, første ledd.** «Når varslingsplikten etter punkt 32.2 gjelder, og totalentreprenøren
  ikke har sendt eller oppgitt et eget varsel etter punkt 32.2 med en tidligere dato, er den
  første versjonen av påberopelsen av forholdet for pålegget det første varselet løsningen
  kjenner.» (VS-U43 punkt 6; E5) Etter spørsmål 1 A blir «med en tidligere dato» til «med samme
  eller en tidligere dato» (E6).
- **Punkt 6, andre ledd.** «I en ny sak etter punkt 9 i samlevedtaket for påberopelsen av
  forholdet kan totalentreprenøren oppgi brevet med påberopelsen i den gamle saken som eget
  varsel etter punkt 32.2, også om det er sendt fra løsningen. Løsningen avgjør ikke om varselet
  gjelder den nye påberopelsen (punkt 10 der).» (VS-U43 punkt 6; GR-U40 punkt 10 og 11; E2)
- **Punkt 6a, ny.** «Datoen for det første kravet i sporet regnes etter punkt 15 i samlevedtaket
  for brev sendt utenfor løsningen, også i punkt 6–10. Et svar som ble gitt før et eldre krav ble
  lagt til, står etter OV-U102, som punkt 15 der viser til.» (OV-U102; OV-U114 punkt 15; E4)
- **Punkt 7–9, vilkåret.** «Er ikke noe varsel etter punkt 33.4 registrert» blir «Er ikke noe
  varsel etter punkt 33.4 registrert med samme eller en tidligere dato»; tilsvarende «et eget
  varsel» i punkt 8 og «et særskilt varsel» i punkt 9. (VS-U70, som etter teksten også gjelder
  punkt 7; OV-U114 punkt 13; E1)
- **Punkt 9, siste setning.** «… kan fortsatt registrere eller sende et særskilt varsel etter
  punkt 4 i samlevedtaket for særskilt varsel og punkt 18 i samlevedtaket for brev sendt utenfor
  løsningen.» (VS-U43 punkt 9; OV-U89 punkt 4 og Følge; OV-U114 punkt 18; E3)
- **Punkt 10.** «Gjør byggherren gjeldende at varselet kom for sent, gjelder påberopelsen det
  første varselet løsningen kjenner etter punkt 6–9: totalentreprenørens eget varsel slik
  totalentreprenøren har meddelt det, eller kravet når det er sendt før det egne varselet. Slik
  regner også kontrollen etter punkt 10 i samlevedtaket for retting av sendt brev og VS-U66. Det
  samme gjelder «i tide» og setningen etter en innsigelse. En ny kravversjon viser til det samme
  dokumentet i punktet om varselet. Et svar byggherren alt har gitt, står med virkningen det
  hadde. Et eget varsel som registreres eller oppgis etter byggherrens svar, følger punkt 18 og 19
  i samlevedtaket for brev sendt utenfor løsningen.» (VS-U43 punkt 10; VS-U70; VS-U60 og VS-U66;
  MM-U55 punkt 10; MM-U50; OV-U114 punkt 18 og 19; E1, E3)
- **Punkt 12, siste ledd.** «… og ved et særskilt varsel sendt utenfor løsningen, som legges til
  etter punkt 18 i samlevedtaket for brev sendt utenfor løsningen.» (VS-U43 punkt 12; E3)
- **Designdelen.** Det første brevet sier ‹Pålegget ble mottatt <dato>.›, og i svikt og andre
  forhold ‹Totalentreprenøren ble klar over forholdet <dato>.› (LV-U57). Når byggherren tar
  stilling til om et varsel kom i tide, viser brevet til varselet påberopelsen gjelder etter punkt
  10 (LV-U10; VS-U70; E1). Henvisningen til et brev er ‹brev <merking> av <dato>› (LV-U53). En ny
  versjon etter en korrigering følger designdelen i samlevedtaket for retting av sendt brev
  (MM-U55 E3 og E4). Kunnskapsdatoen: ‹Totalentreprenøren oppgir å ha blitt klar over at
  utgiftene ville påløpe <dato>.› Resten står. (E5)

### Endret innhold

- **E1** punkt 7–10 og designdelen: etter punkt 33.4, 34.1.2 og 34.1.3 gjelder kravet når det er
  sendt før det egne varselet (VS-U70; M1 og M5). Etter punkt 32.2 sto regelen alt i punkt 6
  (E3 i VS-U43). Svakheten E3 i VS-U43 nevnte for LV-U21, er dermed løst.
- **E2** punkt 6, andre ledd: henvisningen til den opphevede MM-U12 og «dekker den nye hjemmelen»
  faller; GR-U40 punkt 10 gjelder. «Avgjøres særskilt etter OV-U55 og OV-U57» i E2 i VS-U43 er
  avgjort der (M2).
- **E3** punkt 9, 10 og 12: henvisningene til OV-U8 og VS-U7, og setningen om et varsel
  registrert etter svaret, viser til hjemmet i OV-U89 og OV-U114 (M4).
- **E4** punkt 6a: datoen for et krav utenfor rekken (OV-U102).
- **E5** språket: «grunnlagskravet» blir «påberopelsen av forholdet» (oppdragsgiver 14.11, som E8
  i MM-U55), og «TE» skrives fullt ut i designdelen ([språkfila](../sprak.md#ordene-i-brevene-og-skjemaene)).
- **E6** samme dato etter spørsmål 1 (M3).
- **Hovedregelen** (OV-U92): (a) for VS-U43; henvisningene gjelder versjon 2. Forholdet «VS-U43
  opphever VS-U37» føres videre.

### Forholdene (spørsmål 2)

Versjon 2 opphever VS-U43 (svar 4 A, fordi E1 og E2 endrer innholdet) og samler LV-U57 og VS-U70,
som ikke endrer andre poster enn VS-U43. Forholdet «VS-U70 presiserer VS-U66» føres videre i
versjon 2 (OV-U92 (c)). Samlingene i VS-U43 føres videre. LV-U53, GR-U40, MM-U55 og OV-U114 endrer
andre poster og står med sine forhold. VS-U58 og VS-U60 bygger på versjon 2, og «utvider VS-U70» i
OV-U102 gjelder versjon 2 (OV-U92 (a)).

## Spørsmålene

Se [spørsmålene](#spørsmålene-lagret-ordrett) nederst, lagret ordrett før de sendes. Prøvingen
mot vedtakene ble gjort én gang, og funnene er rettet: forholdet i 1 A er et E-punkt fordi 2 A
samler VS-U70, 1 A fikk setningen om svar som alt er gitt, belegget viser til E3 og OV-U114
punkt 13, og 2 A fører «presiserer VS-U66» videre.

## Verifikasjon og grenser

- **Kjørt og observert:** `--sjekk`, `--kjede VS-U43` og `--vis VS-U43` på `62dc9f2`. Lest i
  `vedtak.md`: VS-U43, radene for de seks postene og VS-U58, VS-U60, VS-U66 og VS-U7, OV-U114
  punkt 12–22, GR-U40 punkt 8–12 og E3, MM-U55 punkt 10–12 og OV-U89 punkt 4.
- **Kontrollene:** én subagent kontrollerte hver setning mot kilden, og én prøvde alternativene
  mot vedtakene. Funnene er rettet én gang.
- **Ikke kontrollert:** sitatene fra NS 8407 (ingen ny setning bygger på ordlyden der); koden for
  samme dato. Følge hos OV-U102 beskriver den, men er ikke belegg.
- **Kodehenvisningene:** 33 henvisninger til VS-U43 i ti filer i `kjerne/` og seks i
  `docs/domenetabell/brukerforlop/`. Når VS-U43 oppheves, krever `vedtakshenvisninger.py` at de
  også nevner versjon 2 (prosess-spørsmålet til orkestratoren).

## Spørsmålene, lagret ordrett

Lagret før de sendes til orkestratoren. Spørsmål 1 gjelder rettsregler og stilles i tekst.

> **1. Samme dato for det egne varselet og kravet etter punkt 32.2.** Bakgrunn: M3. Belegg: VS-U43
> punkt 6 «med en tidligere dato» og E3 der; VS-U70 «et krav som … er sendt før det»; OV-U114
> punkt 13: et brev sendt samme dag er ikke sendt før det andre. Ved samme dato gjelder i dag
> kravet etter punkt 32.2 og det egne varselet etter punkt 33.4, 34.1.2 og 34.1.3. Rettidigheten
> er den samme; valget avgjør hvilket brev byggherrens påberopelse og en ny kravversjon viser til.
>
> - **A (anbefalt):** «Har totalentreprenørens eget varsel etter punkt 32.2 og den første versjonen
>   av påberopelsen av forholdet samme dato, gjelder det egne varselet, som etter punkt 33.4, 34.1.2
>   og 34.1.3. Et svar byggherren alt har gitt, står med virkningen det hadde.» Forhold: endrer
>   VS-U43 punkt 6 for samme dato (E6 i versjon 2); i tråd med VS-U70, OV-U114 punkt 13 og MM-U50.
> - **B:** «Ved samme dato gjelder den første versjonen av påberopelsen etter punkt 32.2, som punkt
>   6 i versjon 2 sier, og det egne varselet etter punkt 33.4, 34.1.2 og 34.1.3, som VS-U70 sier.»
>   Forhold: i tråd med VS-U43 punkt 6 og VS-U70.
> - **C:** «Ved samme dato gjelder kravet som ellers er det første varselet løsningen kjenner, etter
>   punkt 32.2, 33.4, 34.1.2 og 34.1.3.» Forhold: endrer VS-U70 og LV-U10 og vilkåret i LV-U21
>   (samlet i VS-U43) for samme dato.
>
> Anbefaling: A. Én regel gjelder for alle fire hjemlene, og påberopelsen viser til brevet
> totalentreprenøren uttrykkelig har oppgitt som varsel (LV-U10). Grunnen til «tidligere dato» i E3
> i VS-U43, at et eget varsel oppgitt ved en feil ikke skal flytte påberopelsen fra et rettidig
> krav til et senere brev, gjelder ikke ved samme dato. C kan la påberopelsen etter punkt 34.1.3
> vise til vederlagskravet i stedet for det særskilte varselet med kunnskapsdatoen (punkt 12).
> Styrer: punkt 6 i versjon 2, og hva #1600 bygger.

> **2. Forholdene.** Bakgrunn: svar 4 A og OV-U92. Alternativer: **A (anbefalt)** som
> «Forholdene» over: versjon 2 opphever VS-U43, samler LV-U57 og VS-U70 og fører «VS-U70
> presiserer VS-U66» videre. **B:** «Som A, men VS-U70 samles ikke; punkt 10 viser til den.»
> Anbefaling: A; punkt 10 leses da av ett vedtak, regelen får ett hjem, og tellingen av endringer
> begynner på null for versjon 2. Styrer: `folge` i den nye posten.
