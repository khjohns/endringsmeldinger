---
name: github
description: Etikettene, milepælene og formen på issues og PR-er i endringsmeldinger. Hvilke etiketter et issue skal ha (lag, tema, spor, status og opphav), når en ny etikett lages, hva et byggeissue og en kommentar med et svar skal inneholde, og hvordan issue og PR kobles. Brukes når et issue opprettes, suppleres eller får etiketter, når en PR opprettes, og når issuene i en pakke eller med en etikett skal finnes.
---

# Issues, etiketter og milepæler

Reglene for hvor arbeidet står, er i `AGENTS.md`, «Hvor hva står». Skillen sier
hvordan de følges på GitHub. Kommandoene for `gh api` og omveiene i skyøkta står i
[miljø-skillen](../miljo/SKILL.md).

## Etikettene

Hva en etikett dekker, står i beskrivelsen på GitHub, og bare der. Les beskrivelsene
før du setter en etikett:

```bash
gh api "repos/khjohns/endringsmeldinger/labels?per_page=100" --jq '.[] | "\(.name): \(.description)"'
```

Etikettene er av fem typer:

| Type | Hva den sier | Etikettene |
| --- | --- | --- |
| Lag | Hvilke deler av treet arbeidet rører | `kjerne`, `skjema-og-visning`, `server-og-levering`, `database` |
| Tema | Hva i domenet arbeidet gjelder | `grunnlag`, `vederlag`, `frist`, `registrerte-brev`, `brev`, `godkjenning`, `vedlegg` |
| Spor | Et parallelt spor i hovedplanen, i stedet for en milepæl | `spor-d`, `spor-h`, `spor-m`, `papercut` |
| Status | Hva issuet samler eller venter på | `beslutning`, `venter-på-beslutning`, `venter-på-rekkefølge` |
| Opphav og del | Hvor issuet kom fra, eller hvilken del av en pakke det er | `review-oppfølging`, `design`, `design-blokker`, `design-bør`, `design-merknad`, `byggedel-1` til `byggedel-4` |

`feilinnfoering` settes på en PR som rører kjernen, ikke på et issue (`AGENTS.md`,
«Miljø», og orkestreringsskillen, punkt 2).

**Lag.** Et byggeissue får lagetiketten for hvert lag det rører, enten det har en
milepæl eller en sporetikett. Runder settes sammen etter hvilke filer øktene rører
([orkestreringsskillen, punkt 1](../orkestrering/SKILL.md#1-kartlegg-før-du-fordeler)),
og lagetiketten er det første utvalget. Avgjør laget ut fra mappene arbeidet rører, ikke
ut fra ordet «TS»: etter byttet i #310 er hele appen TS. Et issue som bare dokumenterer
et avvik i Python-stien etter DL-U2, er ikke et byggeissue og får ingen lagetikett.

**Tema.** Settes når arbeidet gjelder et spor eller et tema. Et issue som gjelder hele
saken eller hele prosjektet, får ingen.

**Status.**

- `beslutning`: issuet samler grunnlaget for en åpen beslutning (B-ID) i hovedplanen.
- `venter-på-beslutning`: arbeidet kan ikke starte før en B-ID er avgjort. Det gjelder
  også en feil oppdaget underveis som venter på en B-ID (`AGENTS.md`).
- `venter-på-rekkefølge`: rekkefølgen i AF-06 holder issuet igjen. Etiketten fjernes
  når hovedplanen har en datert merknad om unntak. Unntaket står i hovedplanen, ikke i
  issuet.

Etikettene følger innholdet. Flyttes omfanget i et issue, rettes etikettene samtidig.

**En ny etikett.** Lag en ny bare når flere åpne issues trenger den og ingen
eksisterende dekker dem. Beskrivelsen begynner med typen og sier hva etiketten dekker,
som «Lag: …» eller «Tema: …». En ny type, eller en etikett som deler en milepæl i
deler, avtales med oppdragsgiver. Beskrivelsen er høyst 100 tegn. Etiketten opprettes med REST:

```bash
gh api -X POST repos/khjohns/endringsmeldinger/labels -f name=<navn> -f color=<sekssifret hex> -f description="<Type>: <hva den dekker>"
```

Opprett etiketten før den settes på et issue. Et navn som ikke finnes, opprettes ellers
stille uten beskrivelse.

Etikettene på et issue settes samlet med
`gh api -X PUT repos/khjohns/endringsmeldinger/issues/<n>/labels -f "labels[]=<a>" -f "labels[]=<b>"`.
`PUT` erstatter hele settet, så ta med etikettene som skal stå.

## Milepælene

Én milepæl per arbeidspakke i hovedplanen. Beskrivelsen sier hva pakken dekker. Det som
gjenstår i en pakke, er de åpne issuene i milepælen
(`gh api "repos/khjohns/endringsmeldinger/milestones?state=open"` gir nummerne).
Et oppfølgingsissue fra review får samme milepæl eller sporetikett som PR-en det kom fra
(`AGENTS.md`, «Arbeidsform»). En PR har sjelden egen milepæl eller sporetikett. Da hentes
de fra issuet PR-en lukker eller er del av.

## Innholdet i et issue

- **Søk før du oppretter.** Supplér et eksisterende issue om samme arbeid med en
  kommentar i stedet for å lage et nytt. Søk i den aktuelle milepælen og etiketten.
- **Vis til ID-en, ikke til vurderingen** (`AGENTS.md`). Funn-, vedtaks- og
  beslutnings-ID-en står med lenke til kilden. Alvorlighet, belegg og begrunnelse står
  der, ikke i issuet.
- **Et byggeissue har forventede resultater**: konkrete og prøvbare, og hva som prøves.
  Skriv dem etter [leveranseskillen](../leveranse/SKILL.md). Er arbeidet en del av et
  brukerforløp med andre issues, sier issuet hvilke, og hvor forløpet prøves samlet.
- **Et svar eller et arbeidsvalg fra oppdragsgiver** føres som kommentar i issuet som
  bygger det, med dato, kilden og teksten ordrett. Et vedtak føres i
  vedtaksregisteret, og issuet viser til ID-en ([vedtaksskillen](../vedtak/SKILL.md)).
- **Issues er offentlige** (`AGENTS.md`).

## PR-en

- Bruk [PR-malen](../../../.github/pull_request_template.md), også gjennom API-et.
- `Closes #n` når PR-en fullfører issuet, «Del av #n» når den leverer en del. Et
  oppfølgingsissue fra review lukkes aldri med `Closes` (`AGENTS.md`, «Arbeidsform»).
- PR-en får ikke lag- og temaetikettene fra issuet. Den får bare etiketter som styrer
  CI, som `feilinnfoering`. Milepælen og sporet står i issuet PR-en viser til.
