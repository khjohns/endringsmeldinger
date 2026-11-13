# Spørsmålene om vederlagsoversikten (BF-44)

Spørsmålene til oppdragsgiver fra designsløyfa for vederlagsoversikten i Varden (#1402), lagret ordrett
før de stilles ([vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md)). Bestillingen er
[BF-44](../../domenetabell/brukerforlop/BF-44.md). Svarene føres i denne fila og i bestillingen.

Ingen av spørsmålene berører en rettsregel. Funksjonene og tabellen er valg om visningen og
arbeidsflyten og blir U-punkter i bestillingen, ikke vedtak. Det som følger av et vedtak, står under
«Avgrensning» og stilles ikke.

## Utgangspunktet

Prototypene er `vederlagsoversikt.html` (v1, oppdragsgiver 31.10: «Dette er kjempefint») og
`vederlagsoversikt-v2.html` (v2, v1 med forslagene F1–F6, «Marker forslagene»). Sammenlignet 13.11, commit
`85f364b`:

- **v2 har alt v1 har.** Bortsett fra eksempeltekst i byggherrens utkast er v1 en delmengde av v2.
- **v2 har seks forslag v1 mangler**, F1–F6 under. Spørsmål 1–7 er ett per forslag, med F2 delt i to.

Den nye versjonen bygges på v2.

## Avgrensning

Dette er ikke spørsmål.

- **Akseptfristen vises.** [HF-U23](../../plans/vedtak.md#hf-u23) punkt 4 sier at akseptfristen vises med
  datoen og leveringskvitteringen ved siden av, og [MM-U24](../../../.interface-design/system.md#mm-u24) at
  den står ved kravet. Spørsmål 3 gjelder bare hvor i oversikten den står.
- **Tallene kommer fra brevene.** Hvert tall skal kunne finnes igjen i et brev
  ([MM-U23](../../../.interface-design/system.md#mm-u23)), og mellomlaget lagres ikke
  ([OV-U31](../../plans/vedtak.md#ov-u31)). Spørsmål 8 gjelder hva oversikten viser når brevet ikke har
  tabellen.
- **Sider og ord etter systemfila og språkfila.** Rettingene fra mønsterkontrollen (sporhodet,
  partsnavnene, «Brev, ikke versjon», setninger om hva løsningen ikke avgjør, handlingskortet) gjøres i v3
  uten spørsmål. De står i G-punktene i bestillingen.

## Spørsmålene

**1. F1 Godkjenningen i byggherrens utkast.** v2 viser stegene «Skrevet → Til godkjenning → Godkjent →
Sendt til TE», hvem som har utkastet, og knappen «Påminn Kari Nordmann». Godkjenningen er bygget på
serveren (pakken og kjeden), og `godkjenning-vederlagssvar.html` har et eget mønster for den.

- **A (anbefalt).** Behold, i formen fra `godkjenning-vederlagssvar.html`: pakken med merket «Til
  godkjenning · ikke sendt», kjeden med personene og fullmakten, og teksten låst. «Påminn» tas ut.
- **B.** Behold som i v2, med stegene og «Påminn».
- **C.** Ta ut. Godkjenningen vises bare i skjemaet for svaret.

Anbefalingen: byggherren ser på oversikten hvor svaret står, og ett mønster for godkjenningen er lettere å
lære enn to. Påminnelsen er en ny utsending som ingen vedtak eller server har.

**2. F2 «For 4 dager siden» i hodet.** Hodet sier når byggherren svarte, og hvor lenge siden det er.

- **A (anbefalt).** Ta ut. Hodet sier «Siste brev: brev 6 fra byggherren, 27. oktober 2026.», som på
  siden for forholdet. Datoene står i tidslinja.
- **B.** Behold.

Anbefalingen: siden for forholdet har ikke den relative tiden, og antall dager siden et brev ble mottatt
står i fristveiledningen der en frist løper «uten ugrunnet opphold»
([VS-U10](../../plans/vedtak.md#vs-u10)).

**3. F2 Akseptfristen.** Byggherren har satt akseptfristen i svaret. v2 viser den i «Det du kan gjøre nå».

- **A (anbefalt).** Ved byggherrens svar, med leveringskvitteringen ved siden av, og ikke i
  handlingskortet.
- **B.** I handlingskortet, ved «Godta svaret», som i v2.

Anbefalingen: HF-U23 punkt 4 og MM-U24. Handlingskortet viser hva parten kan gjøre nå, ikke opplysninger
om svaret.

**4. F3 Andre krav i saken.** Et kort med forholdet, fristforlengelsen og endringsordren, med lenker.

- **A (anbefalt).** Ta ut. Panelet til venstre viser kravene og svarene i saken, forbeholdet i svaret
  lenker til forholdet, og et merke for endringsordren står i panelet
  ([EO-U13](../../plans/vedtak.md#eo-u13)).
- **B.** Behold, i formen «Tilknyttede krav» fra siden for forholdet (`grunnlagsoversikt.html`).

Anbefalingen: kortet gjentar panelet, og raden «Endringsordre: inngår ikke» sier noe løsningen ikke trenger
å si.

**5. F4 Notater for teamet.** Et lukket kort med notatene, bare synlig for teamet.

- **A (anbefalt).** Ta ut nå. Notatene blir et eget forløp (kandidat BF-36 i #1427). Serveren har ingen
  inngang for dem ennå (#601).
- **B.** Behold som i v2.

Anbefalingen: hvor notatene står, gjelder alle sidene for saken og avgjøres best i ett forløp.

**6. F5 Kravet over tid.** En rad med beløpene i kravene: «Brev 3 · 125 000 → Brev 5 · 190 000 → Utkast ·
205 000».

- **A (anbefalt).** Behold, men som beløpet ved hvert krav i lista over brevene, ikke som egen rad. Utkastet
  står i utkastkortet.
- **B.** Behold som egen rad, som i v2.
- **C.** Ta ut.

Anbefalingen: språkfila sier brev, ikke versjon, og beløpet ved brevet sier det samme uten en ny form.

**7. F6 Regningsarbeid.** En egen tilstand der kravet er regningsarbeid (punkt 34.4), med
kostnadsoverslaget (punkt 30.2), varselet om overskridelse, «Krev påløpt beløp» og byggherrens «Krev nytt
kostnadsoverslag».

- **A (anbefalt).** Behold tilstanden, med det som er vedtatt: oppgjørsformen og overslaget i kravet og
  varselet etter punkt 34.4. Handlingene for påløpt beløp, overskridelse og nytt overslag merkes som
  forslag til #1434 og #1299 er avklart.
- **B.** Behold som i v2.
- **C.** Ta ut nå. Regningsarbeid tas opp i oversikten når #1434 er avklart.

Anbefalingen: [KA-U62](../../plans/vedtak.md#ka-u62) tar alle beregningsmetodene med i forløpene, og
oversikten bør vise hvor kravet står også for regningsarbeid. Det som ikke er vedtatt, vises ikke som
avklart.

**8. Tabellen per lag.** Både v1 og v2 viser en tabell med én rad per post og én kolonne per lag, og
summen i hvert lag. Byggherrens brev har en slik tabell bare når svaret har minst to poster med beløp og
minst to lag ([OV-U73](../../plans/vedtak.md#ov-u73)).

- **A (anbefalt).** Oversikten viser tabellen når brevet har den, slik den står i brevet. Ellers viser
  den postene og lagene slik brevet har dem.
- **B.** Oversikten viser alltid tabellen. Visningen summerer selv postene i hvert lag når brevet ikke
  har tabellen.

Anbefalingen: hvert tall kan da finnes igjen i et brev (MM-U23), og ingen sum står bare i visningen.

**9. Kommentarene i Catenda.** Begge versjonene har kortet. Det samme kortet på siden for forholdet venter på
#1627.

- **A (anbefalt).** Følg svaret i #1627 for begge sidene. Til da står bare lenken «Åpne saken i Catenda».
- **B.** Behold kortet her uansett #1627.

## Svarene

Oppdragsgiver 13.11, ordrett, gjennom orkestratoren (også i #1402):

> F spørsmål: A på alle

Svarene er A på spørsmål 1–9. De er ført som U-punkter i [BF-44](../../domenetabell/brukerforlop/BF-44.md).
Ingen av dem er et vedtak.
