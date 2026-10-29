# Designsystemet

Beslutningene for visningen, og hvorfor de er tatt. Metoden står i
[interface-design-skillen](../.claude/skills/interface-design/SKILL.md).

**Verdiene står ikke her** (oppdragsgiver 23.10, #1080). Farger, flater, kanter og skrifter er definert i
[`theme.css`](../src/lib/components/kontraktsbord/theme.css), avstand og radius i
`@theme` i [`app.css`](../src/app.css). Fila nevner bare tokennavnene, og
[`designsystem.test.ts`](../src/lib/designsystem.test.ts) feiler når et token
som nevnes her, ikke finnes der. Det som betyr noe juridisk, står i
[vedtaksfila](../docs/plans/vedtak.md). Fila viser til vedtakene og gjengir dem ikke.

Språket i teksten står i [språkfila](../docs/sprak.md).

## Retningen

**Varden er visningen** (oppdragsgiver 28.10, #1338, runde 6): «Ja, jeg tenker Varden er visningen, men det er fortsatt elementer fra dagens visning som kan være aktuelle.»

Retningen, med farger og profil, avgjøres i designrunde 1 (#1391). Oslo-logoen er fast
(oppdragsgiver 29.10).

**Dagens utgangspunkt, ikke vedtatt retning.** Tokenene under er Sage & Stone, Oslobyggs
grønne profil (`--brand`). Den erstattet «Dokumentbordet» fra mars 2026 (oppdragsgiver
23.10, #1080).

- **Én fargetone.** Flatene er grågrønne og skifter bare i lyshet: `--canvas` under,
  `--surface` for innhold, `--surface-warm` for hover og `--surface-inset` for felt og
  innfelte områder. Valgt med `--surface-selected`.
- **Fire nivåer blekk.** `--ink` for verdier og overskrifter, `--ink-2` for etiketter
  og støttetekst, `--ink-3` for metadata og `--ink-4` for dempet tekst. `--ink-ghost`
  er bare til pynt og bærer aldri mening. Alle fire nivåene holder 4,5:1 på flatene,
  så tekst dempes med et nivå og aldri med `opacity`.
  [`fargetokens.test.ts`](../src/lib/fargetokens.test.ts) feiler under kravet for
  flatene den lister i `FLATER`, ikke for andre flater eller lokale overstyringer.
- **Kanter, ikke skygger.** Strukturen tegnes med `--rule`, `--rule-subtle` og
  `--rule-strong`. Skygger (`--overlay-shadow-sm`, `--overlay-shadow-lg`) brukes bare
  på overlegg: dialog, popover og meny, på `--overlay-1`.
- **Sidepanelet er alltid mørkegrønt** (`--sidebar-bg`), også i lys modus. Det
  skiller navigasjonen fra saken uten en ny fargetone.

## Typografi

- `--font-sans` for grensesnittet, 14 px med linjehøyde 1,5 som grunnlag.
- `--font-legal` for kontraktstekst og brev, så partenes tekst skiller seg fra appens.
- `--font-mono` med `tabular-nums` for beløp, dager, datoer og ID-er, så tall står
  under hverandre og ikke flytter seg.
- Hierarkiet bygges med vekt og blekknivå før størrelse.

## Avstand, mål og radius

- **4 px-rutenett** (`--spacing-1` til `--spacing-12`). Tett i sporoversikten og
  skjemaene, mer luft rundt brevteksten.
- **Skallet:** `--mockup-sidebar-width`, `--mockup-drawer-width` og
  `--mockup-topbar-height`. Under 768 px legges kolonnene under hverandre.
- **Radius:** skalaen i `app.css` (`--radius-sm`, `--radius-md`, `--radius-lg`) gir
  skarpe hjørner, et juridisk preg. Klassene i `theme.css` bruker ennå egne verdier,
  med runde knapper og stempler. Radius får tokens i #1184.

## Farge som betyr noe

Statusfargene (`--danger`, `--warning`, `--success`, `--info`, med `-bg` for flaten)
brukes bare der en regel her eller et vedtak sier det. Fargen gjentar det teksten
sier, og står aldri alene.

Tekst på en hel statusflate, som det valgte segmentet med en tone, har `--on-status` (#1235).

- **Utkast og interne ting** har `--draft`, `--draft-bg` og `--draft-border`, med
  stiplet kant. Det som ikke er sendt, skal aldri se sendt ut.
- **Subsidiært standpunkt** har `--green`, `--green-bg` og `--green-border`.
- **Fokus** vises med `--control-focus` og `--control-focus-ring`.
- **En farge sier aldri det appen ikke kan slutte.** Ingen rødt for «for sent» og
  ingen farge for alvorlighet ved en frist. Vedtakene i [vedtaksfila](../docs/plans/vedtak.md)
  avgjør hva visningen kan si.

## Knapper, skjemaer og feilmeldinger

Bygger på rådene i Punkt om [plassering av knapper](https://punkt.oslo.kommune.no/latest/god-praksis/plassering-av-knapper/),
[gode feilmeldinger](https://punkt.oslo.kommune.no/latest/god-praksis/gode-feilmeldinger/),
[skjemadesign](https://punkt.oslo.kommune.no/latest/god-praksis/skjemadesign/) og
[deaktiverte knapper](https://punkt.oslo.kommune.no/latest/god-praksis/disabled-states/),
med egne ord (#1187). Hvilke handlinger som vises, og når en knapp er inaktiv, står
i MM-U25 og MM-U32. Tilgjengeligheten kontrolleres etter
[`uu-sjekk`](../.claude/skills/uu-sjekk/SKILL.md).

- **Rekkefølgen er primær, sekundær, tertiær**, venstrestilt, også i dialoger og
  på smal skjerm. Den visuelle rekkefølgen er den samme som i DOM-en, så tab-rekkefølgen
  følger den. Handlinger av et annet slag, som «Slett utkastet», står ikke i samme
  gruppe. Dagens handlingslinjer er høyrestilt (#1184).
- **Knappeteksten sier hva som skjer**, med et verb i imperativ og helst høyst tre
  ord: «Send svar», ikke «OK». «Avbryt» betyr at ingenting lagres eller endres.
- **Feltene står under hverandre**, med label over feltet og hjelpeteksten under
  labelen. Labelen har ikke kolon, og plassholdertekst bærer aldri mening. Ved to
  til seks alternativer vises alle, ikke en nedtrekksliste.
- **Valgfrie felt merkes «(valgfritt)»**, og obligatoriske felt har
  `aria-required="true"` uten synlig merke. Appen bruker bare denne ene merkingen.
- **Feilmeldingen står rett under feltet** og sier hva som hindrer (`AGENTS.md`,
  «Skriv etter hva teksten gjør»), med forslag til retting der appen kan gi det. Den
  forsvinner når feltet er rettet. Når kontrollen skjer, og hva som vises øverst i
  skjemaet, står i MM-U32. En feil fra serveren beklager og sier hva parten kan gjøre;
  en feil i utfyllingen går rett på sak. Ingen feilmelding i en egen dialog.

## Mønstre

Et mønster står her når det brukes to ganger eller mer. Verdiene står i komponenten
eller klassen.

Tabellen beskriver dagens visning, `/mockup`-komponentene. Mønstrene for Varden føres
inn fra komponentene i designrundene (#1391).

| Mønster | Hvor | Bruk |
| --- | --- | --- |
| Knapp | `.btn`, `.btn-primary`, `.btn-secondary` og `.btn-danger` i `theme.css` | Kontraktsbordet bruker klassene. `primitives/Button.svelte` har én bruker. Hvilken som er kanonisk, avgjøres i #1184 |
| Stempel | `.stamp` med varianter i `theme.css`, `kontraktsbord/Stamp.svelte` | Betegnelsen for et spor eller et brev. Teksten bærer meningen |
| Utsagnskort | `patterns/StatementCard.svelte` | Ett utsagn fra en part, med part, dato og brev |
| Standpunktoverskrift | `patterns/StandpointHeading.svelte` | Overskriften over et standpunkt |
| Subsidiærmerke | `patterns/SubsidiaryBadge.svelte` | Merker et subsidiært standpunkt |
| Venter på svar | `patterns/PendingResponseCard.svelte` | Et krav som venter på den andre partens svar |
| Internt utkast | `patterns/InternalDraftCard.svelte` | Teamets utkast, skjermet per team |
| Begrunnelse | `patterns/ExpandableReasoning.svelte` | Lang begrunnelse som kan foldes ut |
| Segmentvalg | `primitives/SegmentedControl.svelte` | Valg mellom få gjensidig utelukkende verdier |
| Seksjonsoverskrift | `primitives/SectionHeading.svelte` | Overskrift for en seksjon i lesevisningen |
| Handlingslinje | `kontraktsbord/ActionBar.svelte` | Handlingene for parten nå (MM-U25) |
| Rik tekst | `primitives/RichTextEditor.svelte` | Begrunnelser og brevtekst |
