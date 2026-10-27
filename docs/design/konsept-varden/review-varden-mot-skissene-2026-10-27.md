# Review av Varden mot skissene, 27.10.2026

Kontrollert: den bygde visningen i PR #1334, commit `a206ccd` på
`claude/varden-forloep-1331`. Referansen er skissene i [`skjermer/`](skjermer/) og
teksten i [README](README.md) ved commit `f46a03a` på `main`. Metoden er «Sammenligne en
bygget visning» i skillen `brukerforlop` (PR #1339). Bestillingen står i #1338.

Varden er kjørt i demoruta (`/demo/BF-01?visning=varden`) med
`demoruta.mjs --visning varden`, og fire tilstander til er tatt med et eget skript. Alle
bildene er 1440 px brede, som skissene. Bildene side om side står i PR-en for denne
reviewen, på grenen `skjermbilder`.

**Situasjonen er ikke den samme.** Skissene viser sak E-021 med et hovedkrav og en post
for produktivitetstap (§ 34.1.3), der varselet om produktivitetstapet kom for sent.
Demoruta har brukerforløpet BF-01 med ett hovedkrav på 100 000 kr, der BH sier at varselet
etter § 34.1.2 kom for sent og godtar 60 000 kr subsidiært. Demoruta har ingen
prosjekter, partsnavn eller server. Forskjeller som bare skyldes dette, er klassifisert
som «Ikke et designavvik» eller ikke tatt med.

**Belegg:** **K** kjørt og observert i Chromium 27.10, **L** lest i koden på `a206ccd`.

## Avvikene

| ID | Skjerm | Avviket | Klassifisering | Belegg |
| --- | --- | --- | --- | --- |
| VK-01 | Alle | Toppfeltet med kunden, søket og brukermenyen, brødsmulene, «Kopier lenke», «Saken som PDF» og bunnfeltet mangler. Varden står inne i demoruta | Ikke gjennomført ennå | K |
| VK-02 | A, F, G, I; B og D | Venstre kolonne har bare sporene. Oversikt, Dokumenter, Hendelser og Notater for teamet finnes ikke, så A, F, G og I har ingen tilsvarende tilstand | Ikke gjennomført ennå | K, L (`Vardensak.svelte`) |
| VK-03 | Alle | Saksoverskriften har forløpets tittel, «BH byggherren · TE entreprenøren» og «Du er BH», ikke saksnummer, prosjekt, kontrakt og partsnavn. Brevhodet har ingen logo eller organisasjon | Ikke et designavvik. Demoruta har ikke disse dataene | K |
| VK-04 | B, D | Utkasthodet mangler «Lagret» og «Utkastdetaljer», skjemaet mangler «Forkast utkastet», og sporet mangler merket «Nytt brev» | Domenegap. Utkast er av for TS-saker (#718), og løsningen lagrer ikke hva brukeren har sett (PR #1334, «Åpne spørsmål») | K |
| VK-05 | B | Mens utkastet er åpent, står ikke «Skriv brev i sporet» med «Utkast åpent: svar på brev 4» over arbeidet | Uavklart | K |
| VK-06 | B | «Tidslinje i sporet» står ikke under hovedlinjene mens BH skriver svaret. Den står i D og etter sending | Uavklart. README sier at det må prøves hvordan tidslinja nås | K |
| VK-07 | B | Én begrunnelse i et vanlig tekstfelt, som kommer etter standpunktene. Skissen har en begrunnelse ved hver vurdering, med punktet den kommer under i brevet, og en avsluttende begrunnelse med rik tekst | Ikke gjennomført ennå | K |
| VK-08 | B | Posten for produktivitetstap, med beløpet etter begrensningen og de to alternativene «ikke tillegg», er ikke prøvd. Varden sier at posten ikke kan besvares her | Ikke gjennomført ennå (PR #1334, «Utelatt i prøven») | K, L |
| VK-09 | B | Beløpsfeltet viser «60000» uten mellomrom for tusener. Skissen viser «10 000» | Ikke gjennomført ennå | K |
| VK-10 | B | Hovedlinjene merker standpunktene «Prinsipalt» og «Subsidiært» og skriver beløpet som en setning. Skissen har standpunktet og verdien i to kolonner, med det krevde beløpet dempet | Bevisst endring i byggeøkta. Teksten formulerer standpunktet fra kjernen (`prototypetekst.ts`) | K, L |
| VK-11 | B | «Les brevet ved siden av» bytter ut hovedlinjene med kravbrevet i høyre kolonne. Skissen viser ikke leseflaten åpen | Uavklart | K |
| VK-12 | C, D | Brevet har ingen nummererte punkter, ingen tabell over post, krevd og godkjent, og ingen hilsen eller underskrift. Begrunnelsen står sist | Domenegap. Brevteksten kommer fra kjernen (`kjernesak.brev`), ikke fra Varden | K, L |
| VK-13 | C | Sendepanelet mangler kopi, intern godkjenning og avsenderens navn, og det har ikke «Last ned som merket PDF-utkast» | Ikke gjennomført ennå | K |
| VK-14 | C | Teksten om bindingen viser vedtaks-ID-en til brukeren: «også at varselet kom for sent (KA-U1)». Skissen har ikke ID-en | Uavklart. Linse A i `design-review` | K, L (`prototypetekst.ts`) |
| VK-15 | D | Virkningen av aksepten sier «beløpet dere er enige om i vederlagssporet 0 kr», mens brevet godtar 60 000 kr subsidiært. Skissen sier bare at det som står i brev 5, blir det partene er enige om | Uavklart. Beløpet kommer fra kjernen (`kjernesak.forhaandsvist`). Det er et domenespørsmål om teksten skal nevne det subsidiære beløpet | K, L |
| VK-16 | D | Brevlinja mangler «PDF» og «Kvittering». TEs eget brev har ikke «Utdyp» eller «Oppgi korrigert opplysning» i tidslinja | Ikke gjennomført ennå | K |
| VK-17 | D, E | Menyen «Andre brev og handlinger» viser seks handlinger, med varslene etter § 34.1.2 og § 34.1.3 og innsigelsen etter § 5, og alle er merket «Bygges ikke i denne prøven». Skissen viser ny versjon av kravet og trekk, med virkningen | Bevisst endring i byggeøkta. Handlingene kommer fra kjernen (PR #1334, «Åpne spørsmål») | K |
| VK-18 | E | Etter sending står én linje, «Brevet ditt er sendt.», uten serverens tid, mottaker og dokumentversjon. De andre tilstandene i E finnes ikke i demoruta | Ikke gjennomført ennå. Demoruta sender ingenting til en server | K |

Variantene i H er fulgt slik oppdragsgiver valgte 27.10: sporene i venstre kolonne,
tidslinja i høyre kolonne og den kompakte saksoverskriften.

## Tillegg 27.10: alle panelene

Under arbeid (#1338).

## Feil i #1334 funnet underveis

Når BH åpner «Les brevet ved siden av», kaster siden to ganger
`TypeError: Cannot read properties of null (reading 'offsetHeight')` fra `maal` i
`Vederlagssvar.svelte`, både fra `ResizeObserver` og fra lytteren på `resize`. Panelet
med hovedlinjene er da fjernet. Skjermbildet ble tatt likevel. Demoruta trykker ikke på
knappen, så kjøringen i #1334 fant ikke feilen. Feilen er meldt som kommentar i #1334.

## Verifikasjon og grenser

Kjørt og observert 27.10:

- `node .claude/skills/mockup-nettleser/demoruta.mjs --visning varden` på `a206ccd`:
  kontrollpunktene 02–10, uten JavaScript-feil.
- Et eget Playwright-skript på samme commit: leseflaten åpen for BH, menyen og panelet
  «Ta stilling til svaret» åpne for TE, og tidslinja utvidet.
- Skissene er bildene i [`bilder/`](bilder/), laget fra `skjermer/` med
  [`lag-bilder.mjs`](lag-bilder.mjs) på `f46a03a`.

Ikke kontrollert:

- Den kompakte linja nederst når hovedlinjene ikke får plass i vinduet (E).
- Smal skjerm mot skissene. Skissene finnes bare i 1440 px.
- Saksruta og TS-serveren. Varden er ikke koblet til dem.
- Om teksten er riktig etter vedtakene. Det gjøres med linse A i `design-review`.
