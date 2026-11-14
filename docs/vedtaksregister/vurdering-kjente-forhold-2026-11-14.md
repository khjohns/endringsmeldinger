# Vurdering: de ni historiske forholdene til opphevede vedtak

14.11.2026. Kontrollert commit: `66a5d60` på `main`. Del av #1534, steg 4, trinn 2.
`KJENTE_FORHOLD_TIL_OPPHEVET` i [`vedtaksregister.py`](../verktoy/vedtaksregister.py) har 11
rader. `gr-u22 endrer gr-u2` tas i
[samlevedtaket for påberopelsen](vurdering-samlevedtak-paaberopelsen-2026-11-14.md), og
`mm-u34 endrer ov-u51` i
[versjon 3 for retting av sendt brev](vurdering-samlevedtak-retting-av-sendt-brev-v3-2026-11-14.md).
Her står de ni andre. Hovedregelen er [OV-U92](../plans/vedtak.md#ov-u92) og
[OV-U93](../plans/vedtak.md#ov-u93), med kjedene fra
[vurderingen 05.11](vurdering-kjente-avvik-2026-11-05.md#fordelingen).

## Funnet

En subagent prøvde hver rad mot postene som er ført fra 05.11 til 14.11. Ingen av dem har et
punkt som gir (a) eller (b) for noen av radene. Etter hovedregelen står de derfor etter (c)
til neste samlevedtak som rører kjeden. Ingen av radene er en motsigelse: forholdet er korrekt
ført, men historisk, og vurderingen 05.11 («Tabellen») sier nei for alle ni.

| Rad | Kjeden | Hvorfor forholdet bare er historisk |
| --- | --- | --- |
| gr-u10 presiserer gr-u2 | Godkjenningen av forholdet som endringsordre (ikke samlet) | MM-U34 punkt 11 strøk bindingen i GR-U10 |
| hf-u9 presiserer gr-u2 | Aksept og enighet om vederlag og frist (ikke samlet) | MM-U34 punkt 10 strøk setningene som presiserte GR-U2 |
| gr-u7 presiserer ka-u5 | Aksept og enighet om vederlag og frist | HF-U9 sier det samme som GR-U7 om aksepten |
| mm-u30 presiserer mm-u29 | Hva løsningen utleder og hva den bare viser (ikke samlet) | Strider ikke mot MM-U40, som opphevet MM-U29 |
| mm-u34 endrer ka-u26 | Vilkår og forbehold (samlet i KA-U49) | KA-U49 E5: «KA-U26 er opphevet» |
| mm-u34 endrer ka-u28 | Kravene er avgjort (ikke samlet) | KA-U45 opphevet hele KA-U28 |
| mm-u34 endrer ov-u48 | Vilkår og forbehold (samlet i KA-U49) | KA-U49 E5: punkt 25 står opphevet |
| mm-u34 endrer ov-u49 | Vilkår og forbehold (samlet i KA-U49) | KA-U49 E5: «OV-U49 D2» i punkt 18 står opphevet |
| ov-u43 presiserer mm-u28 | Betegnelser og nøkkeltallene (samlet i MM-U45) | «Ukjent, ikke 0» lever videre i MM-U38. M4 i MM-U45 er en merknad, ikke et punkt |

Fem av kjedene er ikke samlet, og ingen samlevedtak for dem er planlagt i #1534. Tre er
samlet, og et nytt samlevedtak for dem kommer først etter tre nye endringer (svar 6 og 10).
Radene kan derfor bli stående lenge etter (c).

## Spørsmålet til oppdragsgiver

> **1. De ni historiske forholdene.** Ingen av de ni forholdene er en motsigelse, og ingen
> samlevedtak for kjedene er planlagt.
>
> - **A.** Ett vedtak sier for hvert av de ni forholdene at det ikke har noe å virke på, med
>   begrunnelsen i tabellen over, og forholdene fjernes etter OV-U92 (b). Vedtaket endrer
>   ingen regel. Forhold: bygger på OV-U92 og OV-U93.
> - **B.** Forholdene står etter OV-U92 (c) til neste samlevedtak som rører kjeden.
>
> **Anbefaling: A.** Lista over kjente avvik skal bare krympe, og med B blir den stående uten
> at noe arbeid er planlagt. A krever ingen avgjørelse om innholdet, bare at begrunnelsen
> holder. **Valget styrer** om radene fjernes nå eller blir stående.

## Svaret

Oppdragsgiver 14.11, ordrett: «Ja», altså A, det anbefalte alternativet ([kommentaren i #1534](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6874501642), spørsmål 9 i
tabellen).

## Verifikasjon og grenser

- Lest ut av registeret med `vedtaksregister.py --vis` og `--kjede`. Søket etter (a) og (b) gikk
  på ID-ene i postene. Et punkt som omtaler forholdet uten ID-en, er ikke funnet.
- Om det er en motsigelse, bygger på vurderingen 05.11 og er ikke prøvd mot hele ordlyden på nytt.
- For `ov-u43 presiserer mm-u28` er det ikke kontrollert om setningen i OV-U43 som bærer
  forholdet, er blant dem [OV-U94](../plans/vedtak.md#ov-u94) samlet.
