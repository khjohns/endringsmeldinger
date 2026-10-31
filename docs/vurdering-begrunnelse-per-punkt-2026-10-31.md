# Vurdering: begrunnelse per punkt og oversiktstabell i byggherrens svar

**Dato:** 31.10.2026. **Kontrollert commit:** `b75d83d` på `main`.
**Type:** undersøkelse før bygging. Ingen produksjonskode er endret.
Del av [#1433](https://github.com/khjohns/endringsmeldinger/issues/1433).

Spørsmålet er hva brevstrukturen i #1433 krever av lagringsformatet, kjernen, serveren,
PDF-en og Varden: nummererte punkter etter skjemaet, en lagslinje ved hvert standpunkt,
én begrunnelse per punkt, en oversiktstabell og «Forbehold» sist. Løsningen er ikke i
produksjon og har ingen reelle data.

## Kildegrunnlag

- Issuene: [#1433](https://github.com/khjohns/endringsmeldinger/issues/1433) med de fire
  kommentarene, [#1434](https://github.com/khjohns/endringsmeldinger/issues/1434),
  [#1402](https://github.com/khjohns/endringsmeldinger/issues/1402).
- PR-ene: [#1436](https://github.com/khjohns/endringsmeldinger/pull/1436) (prototypen
  `docs/design/prototyper/vederlagssvar.html`, lest på grenen) og
  [#1440](https://github.com/khjohns/endringsmeldinger/pull/1440) (ordene).
- Vedtakene i [vedtaksfila](plans/vedtak.md): [LV-U2](plans/vedtak.md#lv-u2),
  [LV-U3](plans/vedtak.md#lv-u3), [LV-U4](plans/vedtak.md#lv-u4),
  [HF-U1](plans/vedtak.md#hf-u1), [B-10](plans/vedtak.md#b-10),
  [B-17](plans/vedtak.md#b-17), B-13 om begrunnelsestekst, [MM-U9](plans/vedtak.md#mm-u9),
  [KA-U19](plans/vedtak.md#ka-u19), [KA-U24](plans/vedtak.md#ka-u24),
  [KA-U31](plans/vedtak.md#ka-u31), [KA-U34](plans/vedtak.md#ka-u34),
  [KA-U41](plans/vedtak.md#ka-u41), [OV-U28](plans/vedtak.md#ov-u28),
  [OV-U31](plans/vedtak.md#ov-u31), [OV-U32](plans/vedtak.md#ov-u32),
  [OV-U33](plans/vedtak.md#ov-u33), [OV-U43](plans/vedtak.md#ov-u43),
  [OV-U69](plans/vedtak.md#ov-u69), [GR-U26](plans/vedtak.md#gr-u26).
- Koden: `kjerne/typer.ts` (`Avsnitt`, `Standpunkt`), `kjerne/frosset/brevtekst.ts`
  (`lagBrevtekst`, `svartekst`, `gjengi`, `gjengirTro`), `kjerne/format/format.ts`
  (`BREVTEKST`, `FORMAT`, `LESERFORMAT`), `kjerne/format/leser.ts` (`lesDokument`,
  `brevtekstI`), `kjerne/kommandoer/kommando.ts` (`Svarutkast`),
  `kjerne/kommandoer/nyttelast.ts` (`kontrollerSvar`, `avgrensninger`),
  `kjerne/kommandoer/skriving.ts` (`svar`, `brevtekstFor`, `laastTekst`, `tekstavvik`),
  `kjerne/kommandoer/lag.ts` (`lagForUtkastet`), `kjerne/versjon.ts`,
  `kjerne/regler/regelsett.ts`, `server/levering.ts` (`gjengiOppdrag`, `OPPDRAGSFORMAT`),
  `server/brevpdf.ts`, `src/lib/components/varden/` (`Brev.svelte`,
  `Vederlagssvar.svelte`, `kommandoer.ts`), `docs/datamodell/kjernehendelser.toml`,
  `database/migrasjoner/`, `.github/scripts/migrasjonsvakt.py`.

## Kjørt og observert

- `npx vitest run kjerne/tester/brevtekst.test.ts`: 348 tester grønne på `b75d83d`.
- Katalogen i en SQL Server-testbase bygget fra `database/migrasjoner/` med
  `opprettMigrertTestbase` (midlertidig testfil, slettet etterpå): ingen modul i
  `sys.sql_modules` inneholder `brevtekst`, `laast` eller `utdypning`, og ingen
  `CHECK` nevner `brevtekst`. Kontrollspørringen med `brev.dokument` fant
  `koe.brevets_vedlegg`, så spørringen virker. Basen leser altså ikke formen på
  brevteksten, bare at den finnes i oppdraget.
- `FOERSTE_EKTE_SAK` i `.github/scripts/migrasjonsvakt.py` er `None`.

## Lest ut av koden

### Slik er det i dag

- **Ett avsnitt per svar.** `lagBrevtekst` legger ett `Avsnitt` per krav, svar, utsagn og
  opplysning, og ett for vedleggene. `svartekst` setter hele svaret i én `laast`:
  innledningen, forbeholdet etter GR-U26, standpunktene med etikettene og revisjonslinjen.
  Utdypningen er én per element (`utdypninger: Map<element, tekst>`), og for et svar er
  elementet svar-ID-en (`svar` i `skriving.ts`).
- **Formen.** `BREVTEKST` er en liste av `{ gjelder, laast, utdypning? }`. `lesDokument`
  krever at hvert `gjelder` er et krav, svar, utsagn, en opplysning eller dokumentet selv
  (vedleggene) i samme brev, og at ingen to avsnitt har samme `gjelder` (HF-U1).
- **Begrunnelsen.** `Svarutkast.utdypning` er én tekst per svar. `kontrollerSvar` avviser med
  `BEGRUNNELSE_MANGLER` når `avgrensninger` gir minst én grunn og teksten er tom. Grunnene
  hentes fra vurderingene og utregningen, og «ikke godkjenner hele beløpet» regnes av
  summen (`krevdSamlet`) mot det subsidiært godkjente beløpet, ikke per post.
- **Standpunktene har ID fra serveren** (`nyId`), satt når raden skrives. Klienten kjenner
  dem ikke før brevet er skrevet.
- **A1.** Klienten sender den låste teksten som `brevtekst: string[]`, én streng per avsnitt,
  og `tekstavvik` sammenligner den med `laast` i hvert avsnitt (`laastTekst`).
- **Gjengivelsen.** `gjengi` gir `laast` og `utdypning` som avsnitt med tom linje mellom.
  `gjengirTro` krever hver del ordrett i samme rekkefølge, med mellomrom normalisert.
  `gjengiOppdrag` legger hodet foran, og `brevpdf.ts` setter teksten som linjer på A4 og
  leser den ut igjen linje for linje.
- **Varden.** `Brev.svelte` viser `laast` og `utdypning` per avsnitt. `Vederlagssvar.svelte`
  har ett begrunnelsesfelt, og `kommandoer.ts` sender det som `utdypning`.
- **Lagene.** `virkninger` og `lagForUtkastet` gir laget og forutsetningene per standpunkt.
  `Utkastlag` har `forutsetninger` per standpunkt, som er det lagslinjen trenger.
- **Basen.** Brevteksten ligger som JSON i `koe.hendelse.data` og i
  `koe.leveringsoppdrag.innhold`. Ingen kolonne, ingen sjekk og ingen modul leser formen
  (katalogen over).

### Punktene mot standpunktene

Hvert punkt i #1433 svarer til ett standpunkt av én art i ett svar. Ingen art forekommer to
ganger med samme hjemmel og post i samme svar. Det gjør standpunktet til det naturlige
elementet for et punkt etter HF-U1.

| Spor | Punkt | Standpunkt i `kjerne/typer.ts` | Grunn til begrunnelse i `avgrensninger` |
| --- | --- | --- | --- |
| Vederlag | Varselet etter § 34.1.2 | `rettidighet`, `34.1.2` | for sent |
| Vederlag | Varselet etter § 34.1.3 | `rettidighet`, `34.1.3`, med `begrenset` | for sent, også med like beløp |
| Vederlag | Beregningsmetoden | `metode` | tilbudet ikke akseptert |
| Vederlag | Vederlagsjustering | `beloep` uten `saerskilt` | delvis eller avslått (i dag summen) |
| Vederlag | Særskilt vederlagsjustering | `beloep`, `saerskilt: 'produktivitet'` | delvis eller avslått (i dag summen) |
| Frist | Varselet etter § 33.4 | `rettidighet`, `33.4` | for sent |
| Frist | Svaret på forespørselen | `rettidighet`, `33.6.2` | for sent |
| Frist | Spesifiseringen | `spesifisering` | for sent |
| Frist | Hindringen | `hindring` | ikke hindret |
| Frist | Dagene | `dager` | ikke alle dagene |
| Grunnlag | Varselet etter § 32.2 | `rettidighet`, `32.2` | for sent |
| Grunnlag | Grunnlaget | `grunnlag` | avslått, frafalt |

To punkter har ikke et standpunkt i svaret:

- **Grunnlaget i et svar på vederlag eller frist** når grunnlaget er avslått eller
  prekludert. Standpunktet står i svaret på grunnlaget, ofte i et tidligere brev
  (`grunnlagetsStandpunkter`). Punktet trenger ingen egen begrunnelse (KA-U24: «Et
  standpunkt som bare er subsidiært fordi grunnlaget er avslått, trenger ingen egen
  begrunnelse»).
- **«Forbehold»**, som gjelder hele svaret.

Posten for rigg og drift i forlenget byggetid (OV-U37) har ingen egen art eller `saerskilt`-verdi
i `typer.ts` i dag. Den er ikke vurdert her.

## Spørsmål 1: lagringsformatet

### Alternativene

**M1 (anbefalt): ett avsnitt per punkt, med standpunktet som `gjelder`.**

```ts
type Avsnitt =
  | { gjelder: string; overskrift?: string; laast: string; utdypning?: string }
  | { gjelder: string; del: 'grunnlag'; overskrift: string; laast: string }
  | { gjelder: string; del: 'tabell'; tabell: { kolonner: string[]; rader: string[][] } }
  | { gjelder: string; del: 'forbehold'; overskrift: string; laast?: string; utdypning?: string };
```

- Svarets eget avsnitt (`gjelder` = svaret) har innledningen og revisjonslinjen, uten
  utdypning.
- Hvert punkt er et avsnitt med `gjelder` = standpunktet, `overskrift` (nummeret og temaet)
  og `laast` (lagslinjen og standpunktteksten). `utdypning` er begrunnelsen for punktet.
- `del` skiller de tre avsnittene som gjelder hele svaret: grunnlaget fra et annet svar,
  tabellen og forbeholdet. `gjelder` er da svaret. Forbeholdet har `laast` når setningen
  etter GR-U26 står der, og `utdypning` når parten har skrevet en tekst. Det har minst én av dem.
- HF-U1 holder: hvert avsnitt viser til ett element i brevet. `lesDokument` utvides med
  standpunktene i brevets svar, og entydigheten gjelder paret `gjelder` og `del`.
- B-13 holder: den låste delen og utdypningen står fortsatt hver for seg.

**M2: punktene nestet i svarets avsnitt** (`{ gjelder: svar, laast, punkter: [...] }`).
Samme innhold som M1, men to nivåer. `gjengi`, `gjengirTro`, A1, leseren og
`Brev.svelte` må gå gjennom begge. Ingen gevinst mot M1, og formen blir ulik for svar og
andre elementer.

**M3: punktet som egen nøkkel** (`{ gjelder: svar, punkt: 'varsel_34_1_2', … }`). Nøkkelen
viser til en type, ikke et element, og gjentar avbildningen fra standpunkt til punkt som
kjernen alt har. Det er svakere enn HF-U1 krever («Hvert utsagn viser uttrykkelig til det
det gjelder»).

### Hva som endres med M1

| Del | Endring |
| --- | --- |
| `kjerne/typer.ts` | `Avsnitt` blir unionen over |
| `kjerne/format/format.ts` | `BREVTEKST` får `overskrift`, `del` og `tabell`. Gamle rader er fortsatt gyldige |
| `kjerne/format/leser.ts` | Standpunktene i elementmengden. Entydighet på `gjelder` og `del`. `del` krever at `gjelder` er et svar |
| `kjerne/frosset/brevtekst.ts` | `svartekst` deles i punkter. Lagslinjen lages av forutsetningene fra `virkninger`, som `lagForUtkastet` gir. Tabellen og forbeholdet lages her. `gjengi` og `gjengirTro` tar med `overskrift` og cellene |
| `kjerne/kommandoer/kommando.ts` | `Svarutkast.utdypning` erstattes av `begrunnelser` per punkt og `forbehold` |
| `kjerne/kommandoer/skriving.ts` | Begrunnelsen per punkt knyttes til standpunktets ID når den lages. A1 sammenligner den låste delen per avsnitt, med overskriften og cellene |
| `kjerne/kommandoer/nyttelast.ts` | `avgrensninger` gir grunnene per punkt (spørsmål 3) |
| `docs/datamodell/kjernehendelser.toml` | `felt` i delen `brevtekst` og beskrivelsen. Markdown genereres |
| `server/levering.ts` | `OPPDRAGSFORMAT` økes, fordi `innhold.brev.brevtekst` får ny form |
| `server/brevpdf.ts` | Overskriftene og tabellen settes. Lesingen må gi cellene i samme rekkefølge som `gjengi` |
| `database/migrasjoner/` | Ingen migrasjon. Katalogen leser ikke formen |
| `src/lib/components/varden/` | `Brev.svelte` viser overskrift og tabell. `Vederlagssvar.svelte` og `kommandoer.ts` får ett felt per punkt og forbeholdet |

**Klienten kjenner ikke standpunktenes ID.** Kommandoen må derfor bære begrunnelsen med en
nøkkel for punktet, for eksempel arten med hjemmel eller post, og serveren fører den over
til standpunktets ID når standpunktet lages. En begrunnelse for et punkt svaret ikke har,
avvises. Nøkkelen står bare i kommandoen, ikke i journalen.

**Vedleggene per punkt.** Prototypen viser hvilke punkter som viser til et vedlegg. Etter LV-U3
er henvisningen meddelt bare når den står i teksten. Anbefalingen er at henvisningen står i
begrunnelsen som tekst, og at vedleggsavsnittet nummererer vedleggene i `laast`. Et eget
felt for koblingen trengs ikke, fordi ingen regel leser den.

## Spørsmål 2: tabellen

**Anbefalt: tabellen er en egen avsnittsform i brevteksten og fryses med den.**

- LV-U2: «Teksten avsenderen godkjenner, og teksten som fryses, er den samme.» Tabellen er
  en del av brevet (oppdragsgiver 30.10, spørsmål 3). Den må da være i det som fryses, og
  forhåndsvisningen må vise den før byggherren sender.
- MM-U9 og B-10: å regne ut på nytt «endrer aldri … frosne brev». En tabell avledet ved
  gjengivelsen ville endre seg med koden som lager den, og PDF-en kunne da avvike fra det
  byggherren så. Avledet gjengivelse strider derfor mot LV-U2.
- OV-U31 står: mellomlaget lagres ikke som et beløp i svaret, men regnes av postene når
  teksten lages og står som tekst i tabellen. Ingen regel leser tabellen.
- Cellene er tekst («150 000 kr»), ikke tall. Da er tabellen tekst som de andre avsnittene,
  og `gjengirTro` kan prøve hver celle i rekkefølge.
- Testen i #1433 («første kolonne lik `godkjent_beloep`, siste lik
  `subsidiaert_godkjent_beloep`») prøves mot den frosne teksten og beslutningsgrunnlaget i
  samme brev.

Alternativet, en tabell avledet ved gjengivelsen av standpunktene og beslutningsgrunnlaget,
er forkastet over.

**PDF-en.** `brevpdf.ts` setter i dag bare linjer. Tabellen trenger kolonner. `lesBrevPdf`
slår sammen løp med samme høyde til én linje, så en rad leses som én linje hvis cellene
skrives i rekkefølge. Det må prøves i byggingen, med `gjengirTro` som kontroll.

## Spørsmål 3: begrunnelsen per punkt

- **KA-U31 må endres.** Den sier at begrunnelsen «står per svar, som utdypningen under
  svarets låste tekst». Den snevret også inn KA-U24, så «en felles begrunnelse kan dekke
  flere standpunkter» gjelder standpunktene i samme svar. Med én begrunnelse per punkt er
  begge setningene foreldet.
- **Kontrollen per punkt.** `avgrensninger` gir i dag en liste for svaret. Med M1 gir den
  grunnene per standpunkt etter tabellen over, og `kontrollerSvar` avviser når et punkt med
  en grunn mangler tekst. Meldingen sier hvilket punkt det gjelder. Beløpsgrunnen deles per
  post: «ikke godkjenner hele beløpet» gjelder posten der godkjent er under krevd.
- **Felles begrunnelse.** Løsningen tolker ikke teksten (KA-U19). En henvisning som «Se
  punkt 1» er tekst og oppfyller kravet om at begrunnelsen finnes. En felles begrunnelse
  blir da en henvisning mellom punktene. Om friteksten under «Forbehold» skal kunne oppfylle
  kravet, er et spørsmål til oppdragsgiver (spørsmål 2 under).
- KA-U41 står uendret: utdypningen er bare byggherrens egen tekst, nå per punkt.
- KA-U34, den senere begrunnelsen, gjelder svaret og er ikke med i første versjon. Den
  berøres ikke.

## Spørsmål 4: tidspunktet og versjonene

- **Ingen reell hendelse er skrevet til TS.** `FOERSTE_EKTE_SAK` er `None`, og løsningen har
  ingen reelle data. Etter B-17 og «Språk» i `AGENTS.md` kan feltene velges fritt til den
  første reelle hendelsen.
- **Formatversjonen kan stå på 1.** M1 legger bare til felt og avsnittsformer, så rader
  skrevet før endringen er gyldige etter. Ingen eldre utgivelse leser rader i en reell sak.
  Etter første ekte sak ville samme endring kreve at `LESERFORMAT` økes i én utgivelse og
  `FORMAT` i den neste (B-10, `kjerne/tester/kompatibilitet.ts`).
- **REGELVERSJON og PROJEKSJONSVERSJON økes begge.** `brevtekst.ts` ligger i
  `kjerne/frosset/`, og «endres en fil der, økes begge» (`AGENTS.md`). Klienten må sende den
  nye regelversjonen i `Svarutkast`.
- **OPPDRAGSFORMAT** i `server/levering.ts` økes fra 7.
- **Ingen migrasjon** i `database/migrasjoner/`.
- MM-U9: den nye teksten gjelder bare nye brev. Testsakene kan forkastes etter B-17.

## Spørsmål 5: friteksten under «Forbehold»

- **OV-U69** sier at vilkår og forbehold skrives «i begrunnelsen eller i et innlegg». Det må
  presiseres til begrunnelsen for punktet eller teksten under «Forbehold». Oppdragsgiver
  30.10: «Forbehold som gjelder hele svaret må føres i samme brev?», og et innlegg finnes
  ikke i løsningen.
- **KA-U19** er alt endret av OV-U69 («vilkår og forbehold skrives i begrunnelsen, vises
  med svaret og tolkes ikke»). Den trenger samme presisering.
- **Atskilt i formatet.** Friteksten er `utdypning` i avsnittet med `del: 'forbehold'`, og
  begrunnelsen per punkt er `utdypning` i standpunktets avsnitt. Ingen regel leser noen av
  dem. Kontrollen av begrunnelsen per punkt leser bare standpunktenes avsnitt, med mindre
  oppdragsgiver velger noe annet i spørsmål 2.
- **GR-U26.** Setningen står i forbeholdet med «ovenfor» og er `laast` der. Vedtaksteksten
  sier «nedenfor», så GR-U26 må endres.

## Spørsmål 6: vedtakene

| Vedtak | Hva | Forhold |
| --- | --- | --- |
| LV-U4 | Innledningen, partene fullt ut, «NS 8407» og «eks. mva.» én gang, overskriftene og lagslinjen | Endres |
| OV-U28 | «Vederlagsjustering» i stedet for «justeringen ellers», og tabellen med summen per lag. Alternativet ble forkastet 23.10 | Endres |
| OV-U31 | Mellomlaget lagres ikke, men står i tabellen | Står |
| GR-U26 | Setningen står under «Forbehold», med «ovenfor» | Endres |
| OV-U69, KA-U19 | Friteksten under «Forbehold» | Presiseres |
| KA-U31 | Per svar blir per punkt | Endres |
| KA-U24 | Den felles begrunnelsen | Presiseres |
| B-13 om begrunnelsestekst | Står: den låste delen og utdypningen hver for seg, nå per punkt | Står |
| Nytt | Når tabellen står med | Nytt vedtak |

Hva som er juridisk og må stilles til oppdragsgiver, står i spørsmålene under. LV-U4, OV-U28
og GR-U26 føres av svarene 28.–31.10 i #1433, som alt står ordrett der. Formuleringen av
dem skrives i vedtaks-PR-en og stilles ikke på nytt.

## Spørsmålene til oppdragsgiver

Spørsmålene står ordrett i [kommentaren i #1433](https://github.com/khjohns/endringsmeldinger/issues/1433#issuecomment-6542151900), og svarene føres der. De tekniske valgene er anbefalt over (M1,
tabellen frosset, formatversjon 1) og føres som arbeidsvalg i issuet.

1. **Begrunnelse per punkt.** Endrer KA-U31 og presiserer KA-U24.
2. **Teksten under «Forbehold» og kravet om begrunnelse.** Presiserer OV-U69 og KA-U19.
3. **Når tabellen står med.** Nytt vedtak, endrer OV-U28.
4. **0 kr i tabellen etter en påberopelse.**

## Verifikasjon og grenser

- Lest: modulene i kildegrunnlaget. Ikke lest i sin helhet: `standpunkt.ts`, `utled.ts`,
  `Vederlagssvar.svelte`, `lesing.ts`, `src/lib/kjernesak/brevtekst.ts` og serverens
  ruter for kommandoene. Om serveren har et eget skjema for kommandokroppen utover
  kjernens, er ikke kontrollert.
- Ikke prøvd: at `lesBrevPdf` gir cellene i en tabellrad i rekkefølge, og at
  `gjengirTro` da holder.
- Ikke vurdert: posten for rigg og drift (OV-U37), anslag og kostnadsoverslag i tabellen
  (#1434 og det åpne spørsmålet i #1433), og nummereringen når samme brev har svar i flere spor.
- Python-stien er ikke lest. Den skriver ikke TS-hendelser.
- Påstandene om koden i spørsmålene er ikke kontrollert av en subagent, og alternativene er
  ikke prøvd mot hele vedtaksfila. Det må gjøres før svarene føres (vedtaksskillen).
