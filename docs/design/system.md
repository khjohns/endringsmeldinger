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
  og støttetekst, `--ink-3` for metadata og `--ink-4` for dempet tekst. `--ink-ghost`
  er bare til pynt og bærer aldri mening. Alle fire nivåene holder 4,5:1 på flatene i
  begge modi, så tekst dempes med et nivå og aldri med `opacity`.
  [`fargetokens.test.ts`](../../src/lib/fargetokens.test.ts) feiler under kravet for
  flatene den lister i `FLATER`, ikke for andre flater eller lokale overstyringer.
- **Kanter, ikke skygger.** Strukturen tegnes med `--rule`, `--rule-subtle` og
  `--rule-strong`. Skygger (`--overlay-shadow-sm`, `--overlay-shadow-lg`) brukes bare
  på overlegg: dialog, popover og meny, på `--overlay-1`.
- **Sidepanelet er alltid mørkegrønt** (`--sidebar-bg`), også i lys modus. Det
  skiller navigasjonen fra saken uten en ny fargetone.
- **Mørk modus** har egne verdier for de samme tokenene, under `:root.dark` og
  `.mockup.dark` i `theme.css`, og `.dark` i `app.css`. En komponent har aldri egne
  farger for mørk modus. Noen verdier i mørk modus er ennå grå eller lilla, fra det
  gamle temaet (#1184).

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

Tekst på en hel statusflate, som det valgte segmentet med en tone, har `--on-status`: hvit i
lys modus og mørk i mørk modus, der statusfargene er lyse (#1235).

- **Utkast og interne ting** har `--draft`, `--draft-bg` og `--draft-border`, med
  stiplet kant. Det som ikke er sendt, skal aldri se sendt ut.
- **Subsidiært standpunkt** har `--green`, `--green-bg` og `--green-border`.
- **Fokus** vises med `--control-focus` og `--control-focus-ring`, også i mørk modus.
- **En farge sier aldri det appen ikke kan slutte.** Ingen rødt for «for sent» og
  ingen farge for alvorlighet ved en frist. Vedtakene under avgjør hva visningen kan
  si.

## Knapper, skjemaer og feilmeldinger

Bygger på rådene i Punkt om [plassering av knapper](https://punkt.oslo.kommune.no/latest/god-praksis/plassering-av-knapper/),
[gode feilmeldinger](https://punkt.oslo.kommune.no/latest/god-praksis/gode-feilmeldinger/),
[skjemadesign](https://punkt.oslo.kommune.no/latest/god-praksis/skjemadesign/) og
[deaktiverte knapper](https://punkt.oslo.kommune.no/latest/god-praksis/disabled-states/),
med egne ord (#1187). Hvilke handlinger som vises, og når en knapp er inaktiv, står
i MM-U25 og MM-U32. Tilgjengeligheten kontrolleres etter
[`uu-sjekk`](../../.claude/skills/uu-sjekk/SKILL.md).

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

### Klarspråk

Teksten skal være klar for den som leser den første gangen. Kilder:
[klart språk på nett](https://punkt.oslo.kommune.no/latest/god-praksis/slik-skriver-vi-for-nett/)
i Punkt og Oslo kommunes [språkprofil](https://designmanual.oslo.kommune.no/slik-skriver-vi).
Rådene under er med egne ord.

- Korte setninger som bærer én mening. Overskrifter sier hva siden gjelder.
- Ord brukeren kjenner. Kodenavn og interne fagbegreper, som «respons», vises ikke.
- En feilmelding eller sperre sier hva som hindrer, og hva brukeren kan gjøre nå.
- Bestemmelsene i NS 8407 forklares med egne ord. De gjengis ikke ordrett i visningen.
- Lenketekster sier hvor lenken fører. «Les mer» står ikke alene.
- Klarspråk gjelder hvordan det sies, ikke hva. Domenebegrepene (TE, BH, EO, KOE, varsel,
  forsering), paragrafhenvisninger som «§ 33.8» og vedtatt ordlyd står som de er. Presisjonskravet
  i [`AGENTS.md`](../../AGENTS.md) går foran. En vedtatt ordlyd endres bare gjennom
  [vedtaksregisteret](../vedtaksregister/README.md).

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
| MM-U32 | En handling som vises, er aktiv, og skjemaet kontrolleres når parten sender |
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
