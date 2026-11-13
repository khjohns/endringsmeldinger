# Forprøven av BF-44 i oppsett B med panel B

Forprøven etter steg 6 i skillen `brukerforlop` av
[vederlagsoversikt.html](../../design/prototyper/vederlagsoversikt.html) i oppsett B med
panel B, slik den står på `main` i commit `a8179b4` (13.11.2026). Bestillingen er
[BF-44](../../domenetabell/brukerforlop/BF-44.md). Den forrige forprøven var på oppsett A
(`411aef1`). Designsløyfa går i #1402.

Appen er ikke i produksjon og har ingen reelle data. Alvorligheten sier hva en bruker kan
tro feil om i prøven, ikke en observert hendelse.

## Den mekaniske kontrollen

`node .claude/skills/mockup-nettleser/prototype.mjs BF-44`, kjørt og observert:

- alle ti klikkstiene virker på 1440 px, også `#te-b`, `#te-utkast-b`, `#bh-b` og
  `#te-regning-b`;
- `data-spor`: 24 ID-er, og ingen U- eller D-punkter uten `data-spor`;
- axe (WCAG 2.1 A og AA) i ti tilstander: ingen brudd;
- ingen konsollfeil. 22 forespørsler til nettet er blokkert (nettfontene);
- 390 px: ingen vannrett rulling.

Ingen avvik.

## Den kognitive gjennomgangen

Kjørt av en subagent på standardmodellen etter malen i
[forprove.md](../../../.claude/skills/brukerforlop/forprove.md), med tilstandene i oppsett B,
også `#bh-utkast-b` og `#bh-regning-b`. Funnene under er kontrollert mot kildeteksten og
vedtaksfila i økta. Ingen av dem er et rettsspørsmål.

| ID | Alvorlighet | Funn | Retting |
| --- | --- | --- | --- |
| K-1 | Høy | Brev 6 i høyre kolonne har ingen oversiktstabell. Svaret har to poster med beløp og tre lag, så tabellen er en del av brevteksten ([OV-U73](../../plans/vedtak.md#ov-u73)). Beløpene per post i «Kravet og svaret» (100 000 og 10 000, 100 000 og 30 000) står derfor ikke i brevet de skal være lest fra (U-14, D-1) | Legg tabellen inn i brev 6 (`#brev-6`) etter punkt 3 og før «Forbehold», med de samme radene og sumraden som tabellen per post |
| K-2 | Middels | Punkt 1 i brev 6 sier «Byggherren godkjenner etter dette ikke noe beløp for vederlagsjusteringen.» Setningen gjelder bare et brev uten tabell ([LV-U33](../../plans/vedtak.md#lv-u33)) | Stryk setningen når tabellen står i brevet (K-1) |
| K-3 | Middels | I `#te-regning-b` sier kildelinja i «Kravet og svaret» «Kravet i brev 5 og svaret i brev 6», mens «Revider krav» i samme tilstand følger opp kravet i brev 3 | Egen kildelinje i regningstilstanden, med brevet som har kravet om regningsarbeid |
| K-4 | Middels | Raden for brev 6 sier «Brevet er godkjent av Kari Nordmann, med fullmakt.», og kortet sier «Byggherren godkjenner 110 000 kr». Totalentreprenøren kan lese den første som godkjenning av kravet | «Underskrevet av Kari Nordmann, med fullmakt.» ([LV-U67](../../plans/vedtak.md#lv-u67)) |
| K-5 | Middels | Lenkene «Nytt krav om endringsordre» (TE) og «Ny endringsordre» (BH) står i topplinja ved siden av siden for kravet. Det er ikke sagt at de lager en ny sak, ikke et nytt krav i denne saken | Lenketeksten sier det: «Ny sak: krav om endringsordre» og «Ny sak: endringsordre». Se spørsmål 1 |
| K-6 | Lav | Panelet sier «Svar ikke registrert» om forholdet og fristen, mens forbeholdet sier «Byggherren har ikke svart». «Ikke registrert» kan leses som at et svar finnes utenfor løsningen | «Ikke besvart» i panelet |
| K-7 | Lav | I `#te-regning-b` mangler «Trekk kravet» under «Andre handlinger». Den står bare i tilstanden med fast sum. Trekket er ikke unntatt for regningsarbeid ([KA-U51](../../plans/vedtak.md#ka-u51)) | Legg «Trekk kravet» sist under «Andre handlinger» også ved regningsarbeid |
| K-8 | Lav | Den registrerte e-posten har ikke kategorien ([OV-U81](../../plans/vedtak.md#ov-u81): «typen, avsenderen, datoen, sendemåten, hvem som la det til og når, og kategorien»). U-5 nevner ikke kategorien. U-16 sier at hver rad har «Les brevet», men e-posten har den ikke | Legg kategorien inn i raden, og føy «kategorien» til U-5. U-16 sier «hver rad med et brev», så registrert korrespondanse åpnes med vedlegget |
| K-9 | Lav | U-11 sier at akseptfristen står i hodet. U-16 sier at den står over handlingene ved brevet, og det er det prototypen viser i oppsett B | U-11 får setningen «I oppsett B står den over handlingene ved brevet (U-16).» |
| K-10 | Lav | Meldingen med forbeholdet blander det brevet sa («Svaret gjelder under forutsetning av …») og dagens stilling («Byggherren har ikke svart …»). D-3 sier at de skilles | «Svaret i brev 6 gis under forutsetning av at forholdet gir grunnlag for kravet.» Dagens stilling står som egen setning etter |
| K-11 | Lav | Pakken til godkjenning i `#bh-utkast-b` har vedlegget «Mengdeoppstilling akse C–F.pdf», samme filnavn som i totalentreprenørens utkast. Det kan leses som at byggherren ser totalentreprenørens utkast | Et annet filnavn i pakken, for eksempel «Kontroll av mengdene akse C–F.pdf» |

**Ikke tatt med.** Gjennomgangen foreslo å si ved «Godta svaret» at aksepten også gjelder
innsigelsene. U-6 har avgjort at virkningen står i brevkontrollen, så det er ikke et funn.

**Panelet på 1440 px.** Mellom 1181 og 1899 px står sporene i en rad under stien, uten
gruppene «Kontraktsforhold» og «Krav» og uten statusen i panel B. Det er avgjort i U-16
(«Fra 1900 px står panelet»). Spørsmål 2 gjelder om raden skal få statusen.

## Spørsmålene

1. **Lenkene i topplinja (K-5).** A: «Ny sak: krav om endringsordre» og «Ny sak:
   endringsordre». B: som nå. Anbefaling: A, fordi lenkene står ved siden av siden for et krav.
2. **Sporraden under 1900 px.** A: som nå, med navnene. B: raden får statusen fra panelet,
   for eksempel «Vederlagsjustering · Svaret er ikke godtatt». Anbefaling: A. Statusen står i
   den første raden i tråden, og en bredere rad blir trang ved tre spor.

## Se etter i prøven

1. I `#te-b` på 1440 px: hvilke krav og hvilket forhold har saken, og hvor står de?
2. Les brev 6 til høyre og sammenlign med tabellen per post.
3. Hva tror du «Nytt krav om endringsordre» åpner?
4. I `#bh-utkast-b`: hvem sender brev 7, og når?
5. I `#te-regning-b`: hvilket brev har kravet?

**Kandidater til steg 2** (vedtak forløpet ikke viser til): [HF-U5](../../plans/vedtak.md#hf-u5)
(når svaret binder byggherren, som «Svaret kan da ikke godtas» bygger på gjennom OV-U54) og
[LV-U67](../../plans/vedtak.md#lv-u67) (underskriften, K-4).

## Verifikasjon og grenser

- **Kjørt og observert:** den mekaniske kontrollen over, og skjermbildet av `#te-b` på 1440 px.
- **Lest ut av koden:** K-1–K-11 er kontrollert mot kildeteksten i prototypen og mot
  vedtakene på ankrene.
- **Ikke kontrollert:** brevkontrollen etter «Godta svaret» (den er ikke en del av
  prototypen), tilstandene i oppsett A, og forståelse hos en bruker. Forprøven viser risiko,
  ikke forståelse.
