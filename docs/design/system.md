# Designsystemet

Beslutningene for visningen, og hvorfor de er tatt. Metoden står i
[grensesnitt-skillen](../../.claude/skills/grensesnitt/SKILL.md).

**Verdiene står ikke her** (oppdragsgiver 23.10, #1080). Farger, flater, kanter og skrifter er definert i
[`theme.css`](../../src/lib/components/kontraktsbord/theme.css), avstand og radius i
`@theme` i [`app.css`](../../src/app.css). Fila nevner bare tokennavnene, og
[`designsystem.test.ts`](../../src/lib/designsystem.test.ts) feiler når et token
som nevnes her, ikke finnes der. Det som betyr noe juridisk, står i vedtakene. Fila
viser til dem og gjengir dem ikke.

## Retningen

**Sage & Stone**, Oslobyggs grønne profil (`--brand`). Den erstattet
«Dokumentbordet» fra mars 2026 (oppdragsgiver 23.10, #1080).

- **Én fargetone.** Flatene er grågrønne og skifter bare i lyshet: `--canvas` under,
  `--surface` for innhold, `--surface-warm` for hover og `--surface-inset` for felt og
  innfelte områder. Valgt med `--surface-selected`.
- **Fire nivåer blekk.** `--ink` for verdier og overskrifter, `--ink-2` for etiketter
  og støttetekst, `--ink-3` for metadata. `--ink-ghost` er bare til pynt og bærer
  aldri mening.
- **Kanter, ikke skygger.** Strukturen tegnes med `--rule`, `--rule-subtle` og
  `--rule-strong`. Skygger (`--overlay-shadow-sm`, `--overlay-shadow-lg`) brukes bare
  på overlegg: dialog, popover og meny, på `--overlay-1`.
- **Sidepanelet er alltid mørkegrønt** (`--sidebar-bg`), også i lys modus. Det
  skiller navigasjonen fra saken uten en ny fargetone.
- **Mørk modus** har egne verdier for de samme tokenene, under `:root.dark` og
  `.mockup.dark`. En komponent har aldri egne farger for mørk modus.

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

- **Utkast og interne ting** har `--draft`, `--draft-bg` og `--draft-border`, med
  stiplet kant. Det som ikke er sendt, skal aldri se sendt ut.
- **Subsidiært standpunkt** har `--green`, `--green-bg` og `--green-border`.
- **Fokus** vises med `--control-focus` og `--control-focus-ring`, også i mørk modus.
- **En farge sier aldri det appen ikke kan slutte.** Ingen rødt for «for sent» og
  ingen farge for alvorlighet ved en frist. Vedtakene under avgjør hva visningen kan
  si.

## Vedtak som styrer visningen

Les vedtaket i [hovedplanen, 3.1](../plans/2026-09-16-godkjenning-og-varig-levering.md),
ikke en gjengivelse. Tabellen er et utgangspunkt, ikke hele lista: et vedtak kan
presisere et annet, så søk i 3.1 etter vedtakene som presiserer dem under, og etter
nye MM-U-vedtak.

| Vedtak | Hva det avgjør for visningen |
| --- | --- |
| MM-U22 | Betegnelse per krav, og når saken kan ha en samlet betegnelse |
| MM-U23 | Partenes standpunkter med part, dato og brev, og appens lesing merket som appens |
| MM-U24 | Frister og det som foreligger ved kravet, regnet fra sendingen |
| MM-U25 | Bare handlingene parten kan gjøre nå, og én linje når et krav ikke kan endres |
| MM-U28 | Krav, svar og enighet i lista, med subsidiært og appens lesing merket |
| MM-U29 | Hva arbeidslista viser for hver part |
| MM-U30 | Høyst én betegnelse per spor, og rekkefølgen mellom dem |
| MM-U31 | Hvor lenge betegnelsen for forespørselen etter § 33.6.2 står |
| DL-U6 | Sakens identitet, og at ID-en ikke erstattes av et løpenummer |

Ordene i visningen følger [domenetabellen](../domenetabell/README.md) og språkreglene
i `AGENTS.md`.

## Mønstre

Et mønster står her når det brukes to ganger eller mer. Verdiene står i komponenten
eller klassen.

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
