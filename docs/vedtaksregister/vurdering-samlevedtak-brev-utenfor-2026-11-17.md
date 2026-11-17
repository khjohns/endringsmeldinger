# Kartlegging: samlevedtak A, brev sendt utenfor løsningen

Dato: 17.11.2026. Kontrollert commit: `c18fec2` (`main`). Del av #1534, steg 4. Det er gruppe A i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget), punktet om A i
[6944937754](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6944937754) og
vedtaksskillen, «Samlevedtakene er unntaket». Fila viser til postene og punktene uten å gjengi
dem, avgjør ingen klasse og skriver ikke i `vedtak.toml`. Den stiller spørsmålene om hvordan A
deles, før utkastet med kilde for hver setning og lista «Endret innhold» skrives (svar 7 A i
[6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).

## Grunnlaget

- `vedtaksregister.py --sjekk`: varslene for HF-U23 (8 endringer), MM-U55 (7) og VS-U43 (8).
- `--kjede OV-U98`, `--kjede HF-U23`, `--kjede MM-U55` og `--kjede VS-U43`.
- `--vis` for de 21 vedtakspostene som gjenstår i tema 18, og for OV-U98–OV-U113.
- Forholdene `samler` i Følge hos VS-U43, MM-U43, MM-U50 og MM-U55, og teksten i
  samlevedtakene i [vedtaksfila](../plans/vedtak.md).
- Varseltellingen i `varsler()` i [`vedtaksregister.py`](../verktoy/vedtaksregister.py) og
  testen `test_en_endring_fra_en_opphevet_post_telles_ikke`.

## Varslene

| Samlevedtak | Endringene varselet teller | Fra OV-U98-familien |
| --- | --- | --- |
| HF-U23 | KA-U52, OV-U98, og gjennom OV-U98: OV-U102, OV-U103, OV-U104, OV-U109, OV-U111, OV-U113 | Alle unntatt KA-U52 |
| MM-U55 | OV-U98 og de samme seks gjennom den | Alle |
| VS-U43 | LV-U53, LV-U54, LV-U57, VS-U70, GR-U40, OV-U102, og gjennom OV-U102: OV-U109, OV-U111 | Tre av åtte |

OV-U98 presiserer HF-U23 punkt 8 og MM-U55 punkt 8 og 18 (forholdet i OV-U98). VS-U43 hadde fem
endringer fra andre poster før OV-U102 kom.

**Lest ut av koden:** varselet teller hver gjeldende post med et forhold `endrer`, `snevrer inn`,
`utvider` eller `presiserer`. Bare en opphevet post er ikke gjeldende (svar 2 A 05.11 i #1614).
En post et samlevedtak samler, telles fortsatt. Å samle OV-U98-familien i et nytt samlevedtak
nullstiller derfor ikke varslene for HF-U23 og MM-U55. Det gjør bare en ny versjon som opphever
dem, eller en annen telling (spørsmål S2).

## K1. Kjernen i tema 18 er bare delvis samlet

Restkartleggingen regner en post som samlet når et samlevedtak har forholdet `samler` til den,
og har ikke lest teksten (dens «Verifikasjon og grenser»). Følge hos samlevedtakene viser at
flere av postene i tema 18 bare er samlet for enkelte setninger:

| Post | Samlet av | Det som er samlet (Følge) |
| --- | --- | --- |
| OV-U4 | MM-U43 | «for setningene tabellen nevner» |
| OV-U5 | VS-U43, MM-U50 | Setningen om det første fristkravet; setningene om et svar byggherren alt har gitt |
| HF-U13 | MM-U50 | Unntatt siste setning, og første setning er endret |
| OV-U80 | MM-U55 | Forholdet er overtatt fra MM-U52 og MM-U41. Teksten i MM-U55 gjelder retting |
| OV-U11 | MM-U55 | Som OV-U80 |

**Kjørt og observert:** et søk i teksten til MM-U55, VS-U43, MM-U50 og MM-U43 etter kjernen i
OV-U80 (spørsmålet om hva korrespondansen er etter kontrakten, «samme virkning i løsningen som»
et krav eller svar sendt derfra, og merket ‹Til godkjenning›) finner den ikke. Bare setningen om
at en aksept eller et trekk sendt utenfor løsningen står som dokumentasjon, står i MM-U43.

OV-U80 er presisert, endret eller snevret inn av OV-U84, VS-U40, EO-U18, EO-U27, EO-U33, MM-U44,
EO-U39, VS-U47, VS-U52, OV-U98 og VS-U74 (Følge hos OV-U80). Regelen for når et brev sendt utenfor
løsningen får virkning, har altså ikke ett hjem, og A blir en ny kjede, ikke bare tre nye
versjoner.

## Postene i A

**Tema 18, det som gjenstår (21 vedtak og to rader uten anker):** HF-U5 (bare setningen om at et registrert brev ikke binder;
resten hører til gruppe C), KA-U20, MM-U1, OV-U9, OV-U15, OV-U17, OV-U18, OV-U44, OV-U79, OV-U84,
OV-U85, VS-U6, VS-U7, VS-U8, VS-U34, VS-U38, VS-U39, VS-U40, rad-101 og rad-123. LV-U4, LV-U19
og LV-U29 er brevtekst og hører til gruppe E (tema 27). Det VS-U34 sier om opplysningen i LV-U4
punkt 3 og LV-U29, tas med fra VS-U34.

**Delene som ikke er samlet (K1):** OV-U4, OV-U5, OV-U11, OV-U80 og HF-U13.

**OV-U98-familien (8):** OV-U98, OV-U101, OV-U102, OV-U103, OV-U104, OV-U109, OV-U111 og OV-U113
gjelder brev sendt utenfor løsningen og et eldre krav, svar eller en forespørsel. OV-U105
snevrer inn VS-U46 og samles i gruppe B, der VS-U46 får ny versjon. Ellers står forholdet
`snevrer inn` til en opphevet post igjen.

**Ikke i A**, selv om oppdraget nevner OV-U102–OV-U113:

| Post | Hva den gjelder | Gruppe |
| --- | --- | --- |
| OV-U99 | Handlingene i første versjon (beslutning) | H, tema 35 |
| OV-U100 | Påberopelsen i fristen gjelder hele kravet | Etter temaet for OV-U33 |
| OV-U106, OV-U107, OV-U108 | Kravpostene og kostnadsoverslaget | B |
| OV-U110, OV-U112 | Nytt svar etter enighet eller aksept | C og D |

**Design og beslutning i tema 18 (8):** MM-U24, OV-U20 og OV-U62 er flyttet. OV-U16, OV-U19,
OV-U70 og OV-U81 har ikke `flyttet_til` og venter på forløpet for brev registrert utenfor
løsningen (designsløyfa, skillen `brukerforlop`). OV-U13 er beslutning og bindende i OV-U6 og
OV-U84. Designdelene i OV-U9, OV-U18, OV-U44, OV-U79, OV-U80, OV-U84, OV-U85, OV-U104, VS-U34,
VS-U38 og VS-U39 står i designdelen til samlevedtaket til forløpet finnes. A trenger ikke
forløpet for å føres.

## Mulige motsigelser

Kandidatene til «Endret innhold» i utkastet. De er funnet ved lesing av postene og er ikke
prøvd mot vedtakene ennå. Flere er alt løst av et forhold, og utkastet skriver da bare den
senere regelen med kilde.

- **M1 HF-U5 mot OV-U80.** HF-U5: «Et registrert brev binder ikke i appen (OV-U4).» OV-U80 gir et
  krav eller svar som er lagt til, «samme virkning i løsningen som et krav eller svar sendt
  derfra». OV-U80 endrer OV-U4, men har ikke forhold til HF-U5.
- **M2 OV-U44 mot OV-U80.** OV-U44: «Et brev sendt utenfor appen og registrert i den er
  dokumentasjon.» OV-U80 endrer OV-U44.
- **M3 KA-U20 mot OV-U79 og OV-U80.** KA-U20: «I første versjon registrerer hver side bare sine
  egne brev», og merkingen av et forbehold sperrer handlingene som bygger på det. OV-U79: «Begge
  parter kan legge til korrespondanse, også det motparten har sendt.» OV-U80 lar et svar med
  forbehold skjemaet ikke kan uttrykke, stå som dokumentasjon. Det er uklart hva som står igjen av
  sperren i KA-U20.
- **M4 MM-U1 og VS-U7 mot OV-U5 og OV-U80.** VS-U7: «En preklusjon byggherren har påberopt, blir da
  uavklart, og TE kan ikke godta svaret før byggherren har svart på nytt.» OV-U80: «Et svar
  byggherren alt har gitt, står da med virkningen det hadde, og varselet gjelder som premiss for
  nye svar (OV-U5).» OV-U5 endrer MM-U1 og VS-U7.
- **M5 OV-U84 mot OV-U98 og OV-U99.** OV-U98 snevrer inn OV-U84, og OV-U99 punkt 2 sier at valget
  etter OV-U84 venter. Samlevedtaket må skille regelen fra det som venter til en senere versjon.
- **M6 OV-U98 mot OV-U113.** OV-U98 gir forespørselen etter punkt 33.6.2 virkning. OV-U113: «Det
  OV-U98 sier om forespørselen, tas i bruk først når et nytt vedtak sier det.»
- **M7 VS-U8 og OV-U85.** VS-U8: «byggherren kan bestride den». OV-U85 sier hvor mottakeren sier
  det. Trolig en presisering, ikke en motsigelse.

## Spørsmålene

Lagret ordrett før de sendes til orkestratoren. Begge gjelder framgangsmåten, ikke rettsregler.

> **S1. Hvordan samlevedtak A deles (prosess).** Kjernen i tema 18, regelen for når et brev sendt
> utenfor løsningen får virkning, er bare delvis samlet (K1). A er derfor en ny kjede med om lag
> 30 poster og deler, i tillegg til de tre varslene.
>
> - **A (anbefalt):** To PR-er. **A1** er et nytt samlevedtak for brev sendt utenfor løsningen:
>   de 18 vedtakspostene og to radene uten anker som gjenstår i tema 18, delene av OV-U4, OV-U5, OV-U11, OV-U80 og HF-U13 som
>   ikke er samlet, og OV-U98, OV-U101–OV-U104, OV-U109, OV-U111 og OV-U113. **A2** er versjon 2
>   av samlevedtaket for varslingsdatoen (VS-U43), med LV-U53, LV-U54, LV-U57, VS-U70 og
>   OV-U102. HF-U23 og MM-U55 får nye versjoner i A2 bare hvis varselet står etter S2.
> - **B:** Én PR med A1 og nye versjoner av VS-U43, HF-U23 og MM-U55. Vurderingsfila går over
>   grensen på om lag 250 linjer i vedtaksskillen.
> - **C:** Bare nye versjoner av HF-U23, MM-U55 og VS-U43, som tar OV-U98-familien. Tema 18 samles
>   senere for seg, og OV-U98 får da tre hjem til det.
>
> Styrer: antall PR-er, og hvor regelen for brev sendt utenfor løsningen har hjemmet.

> **S2. Varseltellingen for en samlet post (prosess, med en teknisk side).** Varselet teller i dag
> en endring fra en post et samlevedtak samler, fordi bare en opphevet post er unntatt (svar 2 A
> i #1614). Etter A1 har HF-U23 da fortsatt 8 endringer og MM-U55 7, selv om regelen leses i
> HF-U23, KA-U52 og A1, og i MM-U55 og A1.
>
> - **A (anbefalt):** En endring fra en post et gjeldende samlevedtak samler, telles som en endring
>   fra samlevedtaket, og kjeden telles ikke videre gjennom posten. HF-U23 får da 2 endringer
>   (KA-U52 og A1), MM-U55 1 og VS-U43 6. VS-U43 får versjon 2 i A2, og HF-U23 og MM-U55 står.
>   Rettingen i `vedtaksregister.py` tas i A1 med en test.
> - **B:** Tellingen står. HF-U23 og MM-U55 får nye versjoner i A2 som opphever dem (svar 4 A), med
>   OV-U98 punkt for punkt der den presiserer dem.
>
> Styrer: om A2 har én eller tre nye versjoner av samlevedtak.

## Verifikasjon og grenser

- **Kjørt og observert:** kommandoene under «Grunnlaget» på `c18fec2`, og et skript over
  `vedtak.toml` som lister klassen, `flyttet_til` og forholdene `samler` og `opphever` for
  postene i tema 18 og OV-U98–OV-U113. Tellingene i S2 er regnet for hånd etter `varsler()`, ikke
  kjørt med et endret register.
- **Lest ut av vedtaksfila:** K1 og M1–M7. Bare Følge og teksten til samlevedtakene for VS-U43,
  MM-U43, MM-U50 og MM-U55 er lest for K1. Andre samlevedtak kan samle deler av tema 18 uten at
  det er sett her.
- **Ikke kontrollert:** teksten i rad-101 og rad-123, sitatene fra NS 8407 (ingen er brukt ennå), og koden for registreringen.
  Motsigelsene er ikke prøvd mot vedtakene av en subagent. Det gjøres med utkastet til A1.
  Kartleggingen har ingen kodefunn.
