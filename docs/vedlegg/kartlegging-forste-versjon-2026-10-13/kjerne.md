# Hva TS-kjernen kan uttrykke i dag (KOE-saken)

Kartlagt 13.10.2026 på commit `44bbb49`, i `/home/user/endringsmeldinger`. Ingen filer i
repoet er endret.

**Kildegrunnlag.** `kjerne/format/` (`format.ts`, `koder.ts`, `skjema.ts`, `leser.ts`),
`kjerne/kommandoer/` (`kommando.ts`, `nyttelast.ts`, `handlinger.ts`, `forutsetninger.ts`,
`avvisning.ts`, `skriving.ts`), `kjerne/regler/`, `kjerne/utledning/` (`utled.ts`,
`visning.ts`, `buffer.ts`), `kjerne/frosset/` (`standpunkt.ts`, `frysing.ts`,
`brevtekst.ts`), `kjerne/typer.ts`, `kjerne/versjon.ts`, `server/app.ts` (bare rutene),
`docs/datamodell/kjernehendelser.toml`, `docs/domenetabell/regler.json` og avsnittene
«Status for kjernen» og «Første versjon av TS-stien» i
`docs/paragrafmatrise-koe-eo-forsering.md`, pluss radene «Kjernen i dag» der.

**Merking av belegg.**

- **(L)**: lest ut av koden.
- **(K)**: kjørt og observert. To prøveskript utenfor repoet
  (`probe.ts` og `probe2.ts`, ikke bevart) kalte `forhaandsvis`/`vurder` i kjernen med en journal i
  minnet. De kjørte med `node --experimental-strip-types`, uten database og uten server.
- **(A)**: antakelse eller tolkning. Den er merket der den står.

Versjoner på `44bbb49` (L): `REGELVERSJON = 11` (`kjerne/regler/regelsett.ts`),
`PROJEKSJONSVERSJON = 12` (`kjerne/versjon.ts`), `FORMAT = LESERFORMAT = 1`
(`kjerne/format/format.ts`).

---

## 0. Formen i korthet

- **Hendelsestyper** (`HENDELSESTYPER` i `format.ts`): `sak_opprettet` med `sakstittel` og
  `sakstype`, der sakstypen bare kan være `'standard'` (`SAK_OPPRETTET`), og
  `dokument_registrert`.
- **Dokumentet.** Ett dokument per kommando (`skriv` i `skriving.ts`). `data` kan ha
  `krav[]`, `svar[]`, `utsagn[]`, `opplysninger[]`, `dokumentasjon[]` (ID-er) og
  `brevtekst[]` (`DOKUMENT`).
- **Avsenderen** er `aktor_rolle` på raden, og den settes av serveren (`Kontekst.part`).
- **Serveren veier ikke inn.** `server/app.ts` har bare to ruter mot kjernen: `GET
  /api/kjerne/saker/:sak` og `POST /api/kjerne/saker/:sak/kommandoer`. Den andre kaller
  `vurder`. Det finnes ingen annen skrivevei (L).

---

## 1. Kommandotypene (15)

Kilde: union-typen `Kommando` og `SKJEMA` i `kjerne/kommandoer/kommando.ts`. Parten og
handlingsnøkkelen står i `PART` i `forutsetninger.ts` og `handlingsnoekler` i
`avvisning.ts`. Alle kommandoene kan ha `brevtekst?: string[]`, det vil si de låste
avsnittene klienten viste avsenderen. Brevteksten er påkrevd når brevet sendes fra appen,
og forbudt for et registrert brev (`tekstavvik` i `skriving.ts`).

**Felles for alle kommandoene.** Disse kodene kan avvise enhver kommando:

- `TEKST_KAN_IKKE_LAGRES` og `UGYLDIG_FORM` (formen);
- `SAK_IKKE_FORSTAATT` og `FEIL_PART` (`forutsetninger`);
- `ANNEN_BREVTEKST` og `BREVTEKST_MANGLER` (`tekstavvik`).

**Felles for sporhandlingene.** Kommandoer med `spor` i handlingsnøkkelen kan i tillegg
avvises med `GRUNNLAG_AVVIST` og `KRAVENE_AVGJORT`. Det gjelder `krav`, `trekk`,
`aksept`, `brev`, `revisjon`, `varsel`, `send_varsel` og `ingen_krav`. Kommandoene med
`gjelder` går utenom disse to sperrene. Det gjelder bestridelse, innsigelse, protest,
passivitet, merking, avklaring og begrunnelse. Kolonnen «Avvises også med» under viser
bare kodene som kommer i tillegg til de felles.

| # | `type` | Hvem | Spor | Felt i nyttelasten (type, verdier) | Avvises også med |
| --- | --- | --- | --- | --- | --- |
| 1 | `krav` | TE | `grunnlag` \| `vederlag` \| `frist` | `spor`; `innhold` (objekt, se 1.1); `varsel?: { sendt: ÅÅÅÅ-MM-DD }` (bare frist); `utdypning?: tekst` | `KRAV_TRUKKET`, `INGEN_KRAV_I_SPORET`, `ENIGHET_I_SPORET`, `GRUNNLAG_IKKE_SENDT` (vederlag og frist); `BEGRUNNELSE_MANGLER` (frist uten utdypning, KA-U33); `BESKRIVELSE_MANGLER` (grunnlag der § 32.2 gjelder, GR-U15); `VARSEL_REGISTRERT` (`varsel.sendt` ulik den registrerte datoen, eller varselet er registrert uten dato, SK-12) |
| 2 | `brev` | BH | ett svar per spor, 1–3 spor | `svar: Svarutkast[]`, der hvert har `spor`, `gjelder` (kravversjon), `regelversjon` (heltall), `vurderinger` (objekt, se 1.2), `resultat` (klientens utregning, objekt) og `utdypning?: tekst` | `INGEN_KRAV`, `KRAV_TRUKKET`, `ALLEREDE_SVART`; `FEIL_KRAVREFERANSE`, `ANNEN_REGELVERSJON`, `VURDERING_UTENFOR_KJERNEN`, `UGYLDIG_VURDERING`, `ANNET_RESULTAT`, `BEGRUNNELSE_MANGLER`; `PAALEGGET_IKKE_BESKREVET` (fra brevteksten) |
| 3 | `revisjon` | BH | ett spor | `erstatter` (svar-ID); `svar: Svarutkast` | `KRAV_TRUKKET`, `INGEN_SVAR`, `ENIGHET_I_SPORET`; `FEIL_SVARREFERANSE`; ellers som `brev` |
| 4 | `aksept` | TE | alle | `spor`; `svar` (svar-ID); `regelversjon` (heltall) | `KRAV_TRUKKET`, `IKKE_GJELDENDE_SVAR`, `ENIGHET_I_SPORET`, `FRAFALL_KAN_IKKE_GODTAS` (grunnlag), `BREV_MED_FORBEHOLD`, `STANDPUNKT_UAVKLART`; `ANNEN_REGELVERSJON` |
| 5 | `trekk` | TE | alle | `spor` | `INGEN_KRAV`, `KRAV_TRUKKET`, `ENDRINGSORDRE_IKKE_AVKLART` / `GRUNNLAG_ER_ENDRINGSORDRE` (grunnlag), `AVTALE_KAN_IKKE_BEVARES` |
| 6 | `varsel` | TE | `frist` (const) | `hjemmel: '33.4'` (const); `sendt: ÅÅÅÅ-MM-DD`; `dokumentasjon?: ID[]`. Registrerer et varsel sendt utenfor appen, uten brevtekst | `GRUNNLAG_IKKE_SENDT`, `KRAV_TRUKKET`, `INGEN_KRAV_I_SPORET`, `VARSEL_REGISTRERT` |
| 7 | `send_varsel` | TE | `frist` (const) | `hjemmel: '33.4'`. Et varsel fra appen uten dager, og datoen er serverens (VS-U15) | som `varsel`, og i tillegg `FRISTKRAV_SENDT` |
| 8 | `bestridelse` | TE eller BH | – | `gjelder` (opplysnings-ID); `hva: 'sendt'\|'mottatt'\|'endringsordre'\|'kan_ikke_uttrykkes'` | `INGENTING_AA_BESTRIDE`; `FEIL_BESTRIDELSE` |
| 9 | `ingen_krav` | TE | `vederlag` \| `frist` | `spor`. Ingen fritekst (KA-U22) | `KRAV_TRUKKET`, `INGEN_KRAV_I_SPORET`, `KRAV_I_SPORET`, `GRUNNLAG_IKKE_SENDT` |
| 10 | `innsigelse` | TE eller BH | – | `gjelder` (motpartens varsel, krav eller svar) | `UGYLDIG_INNSIGELSE` |
| 11 | `protest` | TE eller BH | – | `gjelder` (motpartens innsigelse, et standpunkt om rettidighet med `i_tide: false`, eller et dokument med innsigelser) | `INGEN_INNSIGELSE` |
| 12 | `passivitet` | TE | – | `gjelder` (et krav i grunnlagssporet) | `INGEN_VARSEL_ETTER_32_2`; `VARSLINGSPLIKT_GJELDER_IKKE` |
| 13 | `merking` | TE eller BH | – | `gjelder` (et registrert dokument med krav eller svar); `spor: Spor[]` (minst ett, ingen dubletter) | `INGEN_REGISTRERT_BREV` |
| 14 | `avklaring` | TE eller BH | – | `gjelder` (merkingen) | `INGEN_MERKING`, `MERKING_AVKLART`, `FEIL_PART` (bare den som sendte det merkede brevet) |
| 15 | `begrunnelse` | BH | – | `gjelder` (svar-ID); fra appen `utdypning: tekst`; registrert `sendt: ÅÅÅÅ-MM-DD` og `dokumentasjon: ID[]`, uten utdypning | `INGEN_SVAR_AA_BEGRUNNE`; `BEGRUNNELSE_MANGLER` (fra appen uten tekst); `BEGRUNNELSE_FOER_SVARET` (registrert med dato før svaret); `UGYLDIG_FORM` (registrert med tekst eller uten vedlegg, eller fra appen med vedlegg) |

**Handlingsnøklene** (`Handlingsnoekkel` og `kandidater` i `handlinger.ts`) er det klienten
får tilbud om (`pending_actions`). De bruker de samme forutsetningene som avvisningen
(INV-MM-1).

| Nøkkel | Kommando |
| --- | --- |
| `krav:<spor>` | `krav` |
| `trekke:<spor>` | `trekk` |
| `godta:<spor>` | `aksept` |
| `svare:<spor>` | `brev` |
| `revidere:<spor>` | `revisjon` |
| `varsle:frist` | `varsel` |
| `sende_varsel:frist` | `send_varsel` |
| `ingen_krav:<spor>` | `ingen_krav` |
| `bestride:<id>` | `bestridelse` |
| `innsigelse:<id>` | `innsigelse` |
| `protest:<id>` | `protest` |
| `passivitet:<id>` | `passivitet` |
| `merke:<id>` | `merking` |
| `avklare:<id>` | `avklaring` |
| `begrunne:<id>` | `begrunnelse` |

### 1.1 Innholdet i et krav (`KRAVINNHOLD` i `format.ts`)

| Spor | Felt | Verdier |
| --- | --- | --- |
| `grunnlag` | `hovedkategori` (påkrevd); `underkategori` (påkrevd); `tittel?`; `endringsordre?` | Hovedkategoriene er `endring`, `svikt`, `andre_forhold` og `force_majeure`. Underkategoriene er 17 koder fra `KATEGORIER` i `koder.ts`. Paret må passe sammen (`KATEGORIPAR`). `endringsordre` (dato eller nummer) er påkrevd i underkategorien `endringsordre` og forbudt ellers (GR-U16) |
| `vederlag` | `metode` (påkrevd); `beloep` (påkrevd) | `metode` er `const: 'tilbud'`. `beloep` er et tall over 0 (`exclusiveMinimum: 0`) |
| `frist` | `dager` (påkrevd) | Et heltall, minst 1 |

`additionalProperties: false` gjelder overalt (`objekt` i `format.ts`), så et ukjent felt
avvises (L, K).

### 1.2 Vurderingene i et svar

`Svarutkast.vurderinger` er bare `{ type: 'object' }` i skjemaet. Innholdet kontrolleres i
tre trinn: `utenforOmfanget`, deretter `regnUtSvar` i `frosset/standpunkt.ts`, og til sist
reglene i `regler/`.

| Spor | Felt som leses | Påkrevd | Blir standpunkt i formatet |
| --- | --- | --- | --- |
| `grunnlag` | `resultat`: `godkjent`, `avslaatt` eller `paalegg_frafalt`. Frafall bare ved `irregulaer_endring` og `valg_av_loesning` (`gyldigeResultater`). `grunnlag_varslet_i_tide`: boolsk | `resultat` alltid. `grunnlag_varslet_i_tide` når § 32.2 gjelder (`endring` unntatt `endringsordre`), og forbudt ellers. Frafall sammen med «for sent» avvises (#235) | `rettidighet` (hjemmel 32.2) når feltet er satt, og `grunnlag` |
| `vederlag` | `hovedkrav_vurdering`: `godkjent`, `delvis` eller `avslaatt`. `hovedkrav_godkjent_belop` ved `delvis`. `hovedkrav_varslet_i_tide`. `aksepterer_metode`. `rigg_*`, `produktivitet_*` og `hold_tilbake` (alle avvist, se 3) | `hovedkrav_vurdering` alltid. `aksepterer_metode` alltid (`kontroller` i `regler/vederlag.ts`, «mangler (§ 34.2.2)»). `hovedkrav_varslet_i_tide` når grunnlagets hovedkategori er `svikt` eller `andre_forhold` (§ 34.1.2) (K) | Bare `beloep`. Resultatet og beløpet står i `utregning`. **`aksepterer_metode: true` og `hovedkrav_varslet_i_tide: true` lagres ikke** (L, K; samme funn som matrisen, #341) |
| `frist` | `frist_varsel_ok`, `spesifisert_krav_ok`, `foresporsel_svar_ok`, `vilkar_oppfylt` (alle boolske) og `dager` (heltall) | `frist_varsel_ok`, `spesifisert_krav_ok`, `vilkar_oppfylt` og `dager` er alltid påkrevd (K). Grunnen er at `regnUtSvar` låser `varsel_type: 'spesifisert'` og `har_tidligere_varsel_i_tide: false` (`beregnSynlighet` i `regler/frist.ts`) | `rettidighet` (hjemmel 33.4), `hindring` og `dager`. **`spesifisert_krav_ok: true` lagres ikke** (L) |

Klientens `resultat` sammenliknes med serverens utregning i feltene `SAMMENLIKNES`
(vederlag: `resultat` og `godkjent_beloep` til hele øre; frist: `resultat` og
`godkjent_dager`). Avviker de, avvises kommandoen med `ANNET_RESULTAT` (B-13).

---

## 2. Utsagnsartene (10), standpunktene (5) og opplysningene (4)

### 2.1 Utsagnene (`UTSAGN` i `format.ts` og `Utsagn` i `typer.ts`)

| Art | Hvem (`PART_FOR_UTSAGN` i `leser.ts`) | Felt | Hva det betyr (fra kildekommentarene) | Leses av reglene? |
| --- | --- | --- | --- | --- |
| `varsel` | TE | `id`, `art`, `hjemmel: '33.4'` (const) | Varsel etter § 33.4. Datoen er en opplysning `sendt` i samme dokument. Uten den opplysningen, i et brev fra appen, er brevet selve varselet (VS-U15) | Ja. Det er `spor.frist.varsel`, som `rettidighet` gjelder. Det styrer `uavklart` (MM-U8) og sperrer `varsle`. Saken kan bare ha ett (SK-12) |
| `trekk` | TE | `gjelder` (gjeldende kravversjon) | TE trekker kravet. Trekk av grunnlaget trekker også vederlaget og fristen (GR-U5) | Ja: `trukket` |
| `aksept` | TE | `gjelder` (svaret), `regelversjon` | TE godtar ett svar. Innholdet står i brevet (KA-U10) | Ja: `enighet` med `kilde: 'aksept'` |
| `bestridelse` | TE eller BH | `gjelder` (opplysningen), `hva` | Bestrider en opplysning fra motparten (MM-U7) | Nei, bare i visningen («uten virkning på utfallet») |
| `ingen_krav` | TE | `spor` (`vederlag` \| `frist`) | TE krever ikke noe i et spor som ikke er sendt (KA-U12) | Ja: `ingenKrav`. Lukker sporet som et trekk og teller som avgjort |
| `innsigelse` | TE eller BH | `gjelder` | § 5 tredje ledd: motpartens varsel, krav eller svar kom for sent | Delvis. Den har ingen egen virkning, men et registrert svar uten rettidighetsstandpunkt leses med den (VS-U11). En innsigelse fra BH mot vederlagskravet gjør senere vederlagssvar uforstått eller avvist (§ 34.1 er ikke bygget) |
| `protest` | TE eller BH | `gjelder` | Protest mot en innsigelse (VS-U1, MP-U6) | Nei |
| `passivitet` | TE | `gjelder` (grunnlagskravet) | TE påberoper passivitet etter § 32.3 annet ledd (VS-U12) | Nei. «Uten virkning på utfallet, og sperrer ikke svaret» |
| `avklaring` | TE eller BH | `gjelder` (merkingen) | Avsenderen sier at standpunktene gjelder uten forbehold (KA-U20) | Ja. Den opphever `forbehold` |
| `begrunnelse` | BH | `gjelder` (svaret) | En senere begrunnelse av et svar. Teksten står i brevteksten (KA-U34) eller i vedlegget (KA-U35) | Nei. Den endrer ingen standpunkter |

### 2.2 Standpunktene i et svar (`STANDPUNKT`; rekkefølgen står i `STANDPUNKTER_I_SPORET`)

| Art | Spor | Felt | Betydning |
| --- | --- | --- | --- |
| `rettidighet` | grunnlag (valgfri, først), frist (valgfri, først) | `gjelder`, `hjemmel` (`32.2` \| `33.4`), `i_tide` | Om varselet kom i tide. `gjelder` er kravet, eller det registrerte varselet etter § 33.4 |
| `grunnlag` | grunnlag (påkrevd) | `resultat` | Godkjent, avslått eller pålegget frafalt |
| `beloep` | vederlag (påkrevd) | bare `id` | Verdien leses fra `utregning` (`resultat`, `godkjent_beloep`) |
| `hindring` | frist (valgfri, før dagene) | `oppfylt` | § 33.1: om BH godtar at fremdriften hindres |
| `dager` | frist (påkrevd) | bare `id` | Verdien leses fra `utregning`, også den subsidiære |

Et svar har også `beslutningsgrunnlag` (`BESLUTNINGSGRUNNLAG`), det vil si appens
vurdering frosset da brevet ble sendt:

- `regelversjon`;
- `virkninger`, der hvert standpunkt er `prinsipalt` eller `subsidiaert`;
- `uten_virkning`;
- `linje`;
- `sammenfall`;
- `varslingsplikt` (bare i grunnlaget).

### 2.3 Opplysningene om et dokument (`OPPLYSNING`, `OPPLYSNINGSSLAG`)

| `hva` | Felt | Betydning |
| --- | --- | --- |
| `sendt` | `dato`, `gjelder?` | Uten `gjelder` er dokumentet registrert korrespondanse (`erRegistrert` i `leser.ts`). Med `gjelder` gjelder datoen et varsel i dokumentet (HF-U1) |
| `mottatt` | `dato`, `gjelder?` | Som over |
| `endringsordre` | `oppfylt` (boolsk), `gjelder?` | Den som registrerer, oppgir om et registrert svar på grunnlaget var en endringsordre etter § 31.3 (GR-U13) |
| `kan_ikke_uttrykkes` | `spor[]`, `gjelder?` | Merkingen etter KA-U16 og KA-U20: brevet har noe appen ikke kan uttrykke |

---

## 3. Det kjernen avviser fordi den ikke kan det ennå

Kjernen avviser på fire nivåer:

- **(a) Formatet.** `UGYLDIG_FORM` fra `formfeil` og skjemaene.
- **(b) `utenforOmfanget`.** Gir `VURDERING_UTENFOR_KJERNEN`.
- **(c) Utledningen.** En lagret rad med noe kjernen ikke kan, gjør saken uforstått (`ugyldig`
  i `utled.ts`), og da gir alle kommandoer `SAK_IKKE_FORSTAATT`.
- **(d) Brevteksten.** `KanIkkeUttrykkes` blir en `Skrivefeil` (et unntak, ikke en
  avvisning) i `brevtekstFor` i `skriving.ts`.

Her er `utenforOmfanget` (`kjerne/frosset/standpunkt.ts`) ordrett:

```ts
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  if (spor === 'frist' && v.spesifisert_krav_ok === false)
    return 'reduksjon etter § 33.6.1 er ikke i kjernen ennå';
  if (spor === 'frist' && v.foresporsel_svar_ok === false)
    return 'svar på forespørsel etter § 33.6.2 er ikke i kjernen ennå';
  if (spor === 'vederlag') {
    if (v.aksepterer_metode === false) return 'avslått metode (§ 34.2.2) er ikke i kjernen ennå';
    if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i kjernen ennå';
    for (const felt of ['hovedkrav_varslet_i_tide', 'rigg_varslet_i_tide', 'produktivitet_varslet_i_tide'])
      if (v[felt] === false) return `preklusjon etter § 34.1 (${felt}) er ikke i kjernen ennå`;
    if ((v.rigg_vurdering ?? null) !== null || (v.produktivitet_vurdering ?? null) !== null)
      return 'særskilte krav (§ 34.1.3) er ikke i kjernen ennå';
  }
  return null;
}
```

`regnUtSvar` (samme fil) låser inndataene til reglene:

- vederlag: `metode: 'tilbud'`, `rigg_belop: null`, `produktivitet_belop: null`,
  `krever_justert_ep: false`, `kostnads_overslag: null`;
- frist: `varsel_type: 'spesifisert'`, `er_svar_paa_foresporsel: false`,
  `har_tidligere_varsel_i_tide: false`.

| Tema | Hvordan det avvises | Kilde | Belegg |
| --- | --- | --- | --- |
| **Beregningsmetode enhetspriser (§ 34.3)** | (a) `$.innhold.metode: "enhetspriser" er ikke "tilbud"` | `KRAVINNHOLD.vederlag` (`metode: { const: 'tilbud' }`) | K |
| **Regningsarbeid (§ 34.4, § 30)** | (a) som over, med `"regningsarbeid"` | samme | K |
| **Justerte enhetspriser (§ 34.3.3)** | Kan ikke kreves, og `krever_justert_ep` er alltid `false` | `regnUtSvar` | L |
| **Fradrag (negativt beløp, § 34.4 annet ledd)** | (a) `$.innhold.beloep: -100 er ikke over 0` | `exclusiveMinimum: 0` | K |
| **Rigg og drift, produktivitet (§ 34.1.3), TEs krav** | (a) `$.innhold.rigg_belop: ukjent felt` | `additionalProperties: false` | K |
| **Rigg og drift, produktivitet, BHs vurdering** | (b) «særskilte krav (§ 34.1.3) er ikke i kjernen ennå» | `utenforOmfanget` | L |
| **TEs varsel om vederlag (§ 34.1.2, § 34.1.3)** | (a) `varsel`-kommandoen har `spor: { const: 'frist' }` og `hjemmel: { const: '33.4' }` (K). Utsagnet `varsel` har bare hjemmel 33.4 i formatet | `SKJEMA.varsel` i `kommando.ts`; `UTSAGN.varsel` | K |
| **BH påberoper preklusjon etter § 34.1.2 / § 34.1.3** | (b) «preklusjon etter § 34.1 (hovedkrav_varslet_i_tide) er ikke i kjernen ennå». For `svikt` og `andre_forhold` er feltet påkrevd, så BH *må* svare `true` | `utenforOmfanget`; `kontroller` i `regler/vederlag.ts` | K |
| **Vederlagssvar etter BHs innsigelse mot vederlagskravet** | `VURDERING_UTENFOR_KJERNEN` «preklusjon etter § 34.1 etter en innsigelse er ikke i kjernen ennå» (`kontrollerSvar`). En lagret rad gjør saken uforstått (`utled.ts`, «§ 34.1 er ikke i kjernen ennå») | `nyttelast.ts`, `utled.ts` | L |
| **BH avslår metoden (§ 34.2.2)** | (b) «avslått metode (§ 34.2.2) er ikke i kjernen ennå». `aksepterer_metode` er påkrevd, så BH *må* svare `true` | `utenforOmfanget`; `kontroller` i `vederlag.ts` | K |
| **Tilbakeholdelse (§ 30.2)** | (b). Brevteksten har heller ingen tekst for `tilbakeholdelse` (`verdi` i `brevtekst.ts` kaster `KanIkkeUttrykkes`) | `utenforOmfanget` | L |
| **Reduksjon etter § 33.6.1 (spesifisert krav for sent)** | (b) for `spesifisert_krav_ok === false`. Feltet er påkrevd, så BH *må* svare `true` | `utenforOmfanget`; `beregnSynlighet` | K |
| **§ 33.6.2 (BHs forespørsel og TEs svar)** | (b) for `foresporsel_svar_ok === false`. Det finnes ingen kommando eller utsagnsart for forespørselen | `utenforOmfanget` | K |
| **Varsel uten spesifisert krav / `begrunnelse_utsatt`** | `varsel_type` er alltid `'spesifisert'`. En egen varsel-«type» kan ikke uttrykkes, men utsagnet `varsel` fins | `regnUtSvar` | L |
| **Force majeure (§ 33.3) i grunnlaget** | (a) `KATEGORIER.force_majeure` er `[]`, så `KATEGORIPAR` har ikke noe par: «passer ingen av alternativene», og `underkategori` mangler. (d) i reserve: `kravtekst` kaster `KanIkkeUttrykkes` («Force majeure kan ikke uttrykkes i formatet ennå (#367)») | `KATEGORIPAR` i `format.ts`; `koder.ts`; `brevtekst.ts`; testen `koder.test.ts` («#367 … ikke avgjort») | K |
| **Endringsordre som egen sak og forsering (§ 31.3, § 33.8)** | (a) `sakstype: { const: 'standard' }`. Det finnes ingen kommando eller utsagnsart | `SAK_OPPRETTET` | L |
| **Krav på 0 kr / 0 dager** | (a). Et krav på null er ikke et krav om noe (KA-U8) | `KRAVINNHOLD` | L |
| **Flere underkategorier** | Formatet tar én. Katalogkoden reduseres til den første (`kategoriFraKatalogen` / `foersteUnderkategori`) | `koder.ts` | L |
| **En godkjenning som er en endringsordre, uten TEs beskrivelse av pålegget** | `BrevetAvvises('PAALEGGET_IKKE_BESKREVET')`. Svaret «må sendes utenfor appen» | `endringsordretekst` i `brevtekst.ts` | L |
| **Påberopt passivitet: dato og antall dager** | Kan ikke uttrykkes, og det finnes ikke noe felt (matrisen, § 32.3 annet ledd, VS-U10, #313) | – | L (matrisen) |

**Sendte og lagrede verdier.** Tre `true`-vurderinger er påkrevd i kommandoen, men lagres
ikke som standpunkt: `aksepterer_metode`, `hovedkrav_varslet_i_tide` og
`spesifisert_krav_ok`. `standpunkter` i `skriving.ts` lager bare `beloep` for vederlaget,
og `rettidighet`, `hindring` og `dager` for fristen (L, K). BHs valg finnes da bare i
`beslutningsgrunnlag`/`utregning` og står ikke i brevteksten.

**Portert, men ubrukt.** Reglene i `regler/vederlag.ts` (rigg, produktivitet, justerte
enhetspriser, `kanHoldeTilbake`) og `regler/frist.ts` (`beregnReduksjon`,
forespørselsgrenene) er portert fra Python og har flere grener enn kjernen bruker
(matrisen, «Status for kjernen»).

---

## 4. Registrering av brev sendt utenfor appen

### 4.1 Hva som kan registreres med en kommando i dag (L, K)

| Kommando | Hva den registrerer | Felt | Struktur | Leses av reglene? |
| --- | --- | --- | --- | --- |
| `varsel` | TEs varsel etter § 33.4 sendt utenfor appen (MM-U1, SK-12) | `sendt` (dato), `dokumentasjon?` | Utsagnet `varsel` og opplysningen `sendt` uten `gjelder`, så dokumentet er `erRegistrert`. Ingen brevtekst (K) | **At varselet finnes**, ja: `rettidighet` i et senere fristsvar gjelder det varselet (`standpunkter` i `skriving.ts`), et eldre standpunkt om et annet varsel blir `uavklart`, som sperrer `aksept` (`STANDPUNKT_UAVKLART`, MM-U8), og nye varsler sperres (`VARSEL_REGISTRERT`). **Datoen** leses bare for kravet om at den ikke kan flyttes (`VARSEL_REGISTRERT` i `nyttelastkontroll`, SK-12) og for brevteksten. Ingen regel regner rettidighet av datoen; det er BHs valg `frist_varsel_ok` |
| `krav` med `varsel: { sendt }` | Et fristkrav sendt fra appen, med opplysning om at varselet ble sendt tidligere utenfor appen (HF-U1) | `varsel.sendt` | Første gang lagres utsagnet `varsel` og opplysningen `sendt` med `gjelder` lik varselet. Dokumentet er ikke registrert, og brevteksten sier «TE opplyser at varsel … ble sendt <dato>» | Som over |
| `begrunnelse` med `sendt` | BHs senere begrunnelse sendt utenfor appen (KA-U35) | `sendt` (dato), `dokumentasjon` (påkrevd) | Utsagnet `begrunnelse` og opplysningen `sendt`. Teksten står bare i vedlegget | Datoen sammenliknes med datoen svaret ble sendt (`BEGRUNNELSE_FOER_SVARET`, KA-U36–KA-U39). (K) En dato langt fram i tid (2030-01-01) ble godtatt, så det finnes ingen kontroll mot framtidige datoer |
| `merking` | En senere merking av et registrert brev (KA-U20) | `gjelder`, `spor[]` | Opplysningen `kan_ikke_uttrykkes` med `gjelder` | Ja: `forbehold` sperrer `aksept` (`BREV_MED_FORBEHOLD`), trekk som rammer en enighet (`AVTALE_KAN_IKKE_BEVARES`), `kanInngaaIEo` og statusen «oppgjort» |
| `avklaring`, `bestridelse` | Utsagn om et registrert brev eller en opplysning | – | – | `avklaring` opphever `forbehold`. `bestridelse` leses ikke av reglene |

### 4.2 Hva som ikke kan registreres med en kommando i dag (L)

**Det finnes ingen kommando for å registrere et krav eller et svar sendt utenfor appen.**
Alle krav- og svarkommandoene (`krav`, `brev`, `revisjon`, `aksept`, `trekk`, `ingen_krav`)
skriver et brev fra appen: `brevtekst` er påkrevd, og dokumentet får ingen opplysning
`sendt`. Formatet kan ikke legge `sendt`/`mottatt` uten `gjelder` til et krav eller svar
fra kommandoen. Det samme gjelder opplysningene `endringsordre` og `kan_ikke_uttrykkes` i
selve brevet.

Bare leseren og utledningen kan registrert korrespondanse med krav og svar:

- `erRegistrert` i `leser.ts`;
- `registrertBrev`, `strid` med `bareUregistrert`, `endringsordre: 'ikke_avklart'` og
  `svarSendt` i `utled.ts`;
- `frysBrev` i `skriving.ts`, som fryser beslutningsgrunnlaget for en slik rad;
- etiketten `appens_vurdering_ved_registreringen` i `visning.ts`.

`frysBrev` kalles bare fra testene (`kjerne/tester/kjoerer.ts`, med radene fra `radFor` i
`kjerne/tester/klient.ts`). Det er bevis-sakenes vei for «en rad fra en annen skriver»,
ikke en produktvei. Den bærer ingen kontroll av forutsetningene.

**Hvordan et registrert svar ser ut i formatet (L).** Svaret har de samme strukturerte
standpunktene som et svar fra appen (`rettidighet`, `grunnlag`, `beloep`, `hindring`,
`dager`), `utregning` og et frosset `beslutningsgrunnlag`. Datoene står som opplysningene
`sendt`/`mottatt`. Et registrert svar uten standpunkt om rettidighet leses med partens
første ikke-oppgitte innsigelse (VS-U11, `frysBrev` og `lesesMedInnsigelse`).

**Hva som er vedtatt og hvem som eier registreringen (L, fra dokumentene).** OV-U1 sier at
første versjon omfatter «registrering av brev sendt utenfor appen», og matrisen fører
«Kravversjon, aksept og enighet» som «Med, også for registrert korrespondanse». KA-U20
sier: «Kjernen hører til #309, registreringen til #310». Status for #310 er ikke
kontrollert, se «Verifikasjon og grenser».

### 4.3 Datoer som reglene leser

| Dato | Hvor den leses | Virkning |
| --- | --- | --- |
| Varselets `sendt` | `nyttelastkontroll` (`krav`) | Kan ikke flyttes (SK-12) |
| Svarets dato (`svarSendt`): datoen appen registrerte svaret, i norsk tid (KA-U37), eller opplysningen `sendt` for et registrert svar (KA-U38) | `begrunnelsensDato` | En registrert begrunnelse kan ikke være eldre enn svaret |
| `registrert` (serverens tidspunkt) | Brevteksten («brev <n> av <dato>») | Bare tekst |

Ingen regel regner fristoversittelse, rettidighet eller passivitet av datoene. Rettidigheten
er alltid BHs eget valg i svaret (`frist_varsel_ok`, `grunnlag_varslet_i_tide`) (L).

---

## 5. Regel- og feilkodene

Kjernen har **45 regelkoder** og to feilklasser: `UGYLDIG_FORM` og `REGELBRUDD`, som er
`Utfall.feil` i `skriving.ts`. `UGYLDIG_FORM` er også regelkoden for en formfeil.
`TEKST_KAN_IKKE_LAGRES` har klassen `UGYLDIG_FORM`. Settet er likt med
`docs/domenetabell/regler.json`: 28 koder med `regelkoder` i en rad og 17 i
`koder_uten_rad`, i alt 45. Kontrollen er kjørt, og `REGELBRUDD` er den eneste koden som
står i koden og ikke der.

`Skrivefeil` (`skriving.ts`) er et unntak, ikke en avvisning. Den kastes når kjernen ikke
forstår det den selv skriver, eller når brevteksten kaster `KanIkkeUttrykkes`.

Forkortelser i tabellen:

- **F** = `forutsetninger.ts`: `forutsetninger` eller `henvisning`;
- **N** = `nyttelast.ts`: `nyttelastkontroll` og hjelperne;
- **S** = `skriving.ts`: `skriv` / `tekstavvik`;
- **B** = `frosset/brevtekst.ts`.

ID-ene i «Vedtak i koden» står i kommentaren ved kastet eller i meldingen. «Rader / kilder i
regler.json» viser radene med koden og vedtakskildene deres.

| Kode | Hvor | Hva som hindrer | Vedtak i koden | Rader / kilder i regler.json |
| --- | --- | --- | --- | --- |
| `TEKST_KAN_IKKE_LAGRES` | S `skriv` | Kommandoen har NUL eller en enslig surrogat | #373 | uten rad («formkontroll … ikke en regel i domenet») |
| `UGYLDIG_FORM` | S `skriv` ← `formfeil` (`kommando.ts`) | Formen passer ikke skjemaet: ukjent felt, metode, kategori, dato, dublett eller vedleggsregel | LV-U4 p. 3, KA-U34, KA-U35 | KA-43 / KA-U35, MM-U17 |
| `ANNEN_BREVTEKST` | S `tekstavvik` | Den låste teksten avviker fra den serveren lager, eller et registrert brev har tekst | LV-U2, MM-U17, A1 | uten rad (#475) |
| `BREVTEKST_MANGLER` | S `tekstavvik` | Et brev fra appen mangler den låste teksten | LV-U2 | uten rad (#475) |
| `PAALEGGET_IKKE_BESKREVET` | B `endringsordretekst` (`BrevetAvvises`) | En godkjenning som er en endringsordre, viser til et krav fra appen uten beskrivelse av pålegget | GR-U14, GR-U15, § 31.3 | uten rad (#475) |
| `SAK_IKKE_FORSTAATT` | F | Saken har hendelser kjernen ikke tolker | MM-U2 | KA-24 / MM-U2, MM-U14 |
| `FEIL_PART` | F (`PART`); F `avklare` | Feil part for handlingen, eller avklaring fra en annen enn avsenderen | KA-U20 | KA-33, KA-42 / KA-U20, KA-U26, KA-U28, KA-U34, MM-U12, MM-U18, MM-U20 |
| `GRUNNLAG_AVVIST` | F | Partene er enige om at grunnlaget er avvist (TE har godtatt avslag eller preklusjon) | SK-01, #213 | GR-20, VS-05 / GR-U7, KA-U1, KA-U11, KA-U29, MM-U7, VS-U1 |
| `KRAVENE_AVGJORT` | F | Kravene er avgjort: grunnlaget er avklart, og hvert kravspor er trukket, har «ingen krav» eller har virksom enighet | KA-U11 | VS-05, KA-44 / KA-U11, KA-U29, KA-U34, MM-U7, VS-U1 |
| `KRAV_TRUKKET` | F (krav, trekke, ingen_krav, varsle, svare, revidere, godta) | Kravet (eller grunnlaget) er trukket | GR-U5, vedtaket 05.10 | GR-09–GR-12, KA-39 / GR-U5, KA-U12, MM-U2, MM-U18, MM-U20, V-SD02, V-TRUKKET |
| `INGEN_KRAV_I_SPORET` | F (krav, ingen_krav, varsle) | TE har sagt «ingen krav» i sporet | KA-U12 | KA-31, VS-06 / KA-U12, KA-U15, KA-U17, KA-U22, MM-U1, MM-U8, V-SK12, VS-U1, VS-U9, VS-U15, VS-U16 |
| `ENIGHET_I_SPORET` | F (krav, revidere, godta) | Partene er enige om svaret (aksept eller sammenfall) | KA-U7, GR-U10, SK-03, GR-U8 | GR-07, GR-23, GR-24, GR-25, GR-27 / GR-U2, GR-U4, GR-U7, GR-U8, GR-U10, KA-U7, V-SK02-SK03 |
| `GRUNNLAG_IKKE_SENDT` | F (krav i vederlag/frist, ingen_krav, varsle) | Grunnlaget er ikke sendt | KA-U15 | KA-31, VS-06 / som `INGEN_KRAV_I_SPORET` |
| `INGEN_KRAV` | F (trekke, svare) | Det er ikke sendt noe krav i sporet | – | uten rad (#475) |
| `ENDRINGSORDRE_IKKE_AVKLART` | F (trekke grunnlag) | Det er ikke avklart om godkjenningen er en endringsordre (registrert uten opplysning om § 31.3, eller merket) | KA-U13, KA-U6, KA-U26 | GR-29, KA-32 / GR-U5, GR-U10, GR-U12, GR-U13, KA-U6, KA-U13, KA-U14, KA-U16, KA-U20, KA-U26, KA-U28, MM-U7, MM-U9, MM-U12, MM-U18, MM-U19 |
| `GRUNNLAG_ER_ENDRINGSORDRE` | F (trekke grunnlag) | BHs godkjenning er en endringsordre | KA-U13, KA-U6 | GR-28 / GR-U10–GR-U13, KA-U6, KA-U13, KA-U14, MM-U9 |
| `AVTALE_KAN_IKKE_BEVARES` | F (trekke) | En enighet trekket rammer, bygger på et merket brev | KA-U22 (`trekkKanIkkeBevareAvtalen`: KA-U27, KA-U30) | KA-34 / KA-U14, KA-U20, KA-U22, KA-U26, KA-U27, KA-U30 |
| `KRAV_I_SPORET` | F (ingen_krav) | Det er sendt krav i sporet («trekk i stedet») | KA-U12, KA-U15 | KA-31 / KA-U12, KA-U15, KA-U17, KA-U22 |
| `VARSEL_REGISTRERT` | F (varsle, sende_varsel); N (krav med varsel) | Varselet er registrert og kan ikke flyttes, har en annen dato eller ingen dato | SK-12, MM-U1, VS-U15 | VS-06 / KA-U15, MM-U1, MM-U8, V-SK12, VS-U1, VS-U9, VS-U15, VS-U16 |
| `FRISTKRAV_SENDT` | F (sende_varsel) | Fristkravet er sendt, så et varsel fra appen ville kommet etter det | VS-U16, MM-U8 | VS-06 / som over |
| `ALLEREDE_SVART` | F (svare) | Gjeldende kravversjon er allerede besvart (revider i stedet) | – | uten rad (#475) |
| `INGEN_SVAR` | F (revidere) | Det finnes ikke noe svar å revidere | – | uten rad (#475) |
| `IKKE_GJELDENDE_SVAR` | F (godta); N (aksept) | Aksepten gjelder ikke gjeldende svar, eller det finnes ikke noe svar | KA-U1, KT-U1 | GR-01–GR-06 / EO-U5, GR-U1, GR-U11, KA-U1, NS-31.3-1, NS-32.2-1, V-215, V-B13-GRUNNLAG-AVSLATT |
| `FRAFALL_KAN_IKKE_GODTAS` | F (godta grunnlag) | Et frafall er BHs standpunkt og kan ikke godtas | GR-U9 | GR-26 / GR-U3, GR-U9 |
| `BREV_MED_FORBEHOLD` | F (godta) | Svaret bygger på et merket brev som ikke er avklart | KA-U16, KA-U20 | KA-32 / KA-U16, KA-U20, KA-U26, KA-U28, MM-U7, MM-U12, MM-U18, MM-U19 |
| `STANDPUNKT_UAVKLART` | F (godta) | En påberopt preklusjon gjaldt et annet varsel enn det som er registrert nå | MM-U8 | KA-38 / HF-U1, MM-U1, MM-U8, MM-U18, VS-U9, VS-U11 (**arbeidshypotese**) |
| `UGYLDIG_INNSIGELSE` | F `henvisning` | Innsigelsen gjelder ikke et varsel, krav eller svar fra motparten | VS-U1, VS-U14 | VS-01 / MP-U6, VS-U1, VS-U9, VS-U14 |
| `INGEN_INNSIGELSE` | F `henvisning` | Det finnes ingen innsigelse fra motparten å protestere mot | VS-U1, MP-U6 | VS-01 / som over |
| `INGEN_VARSEL_ETTER_32_2` | F `henvisning` | Passiviteten viser ikke til TEs krav i grunnlagssporet | VS-U12 | uten rad (#475) |
| `INGEN_REGISTRERT_BREV` | F `henvisning` | Merkingen gjelder ikke et registrert brev med krav eller svar | KA-U20 | uten rad (#475) |
| `INGEN_MERKING` | F `henvisning` | Det finnes ingen merking å avklare | KA-U20 | uten rad (#475) |
| `MERKING_AVKLART` | F `henvisning` | Merkingen er allerede avklart | KA-U20 | uten rad (#475) |
| `INGEN_SVAR_AA_BEGRUNNE` | F `henvisning` | Begrunnelsen gjelder ikke et svar | KA-U34 | KA-42 / KA-U34 |
| `INGENTING_AA_BESTRIDE` | F `henvisning` | Det finnes ingen opplysning fra motparten, eller den er allerede bestridt | MM-U7 | uten rad (#475) |
| `FEIL_KRAVREFERANSE` | N `kontrollerSvar` | Svaret gjelder ikke gjeldende kravversjon | – | uten rad (#475) |
| `FEIL_SVARREFERANSE` | N (revisjon) | `erstatter` er ikke gjeldende svar | – | uten rad (#475) |
| `ANNEN_REGELVERSJON` | N (brev, revisjon, aksept) | Klienten regnet eller forhåndsviste med en annen regelversjon | B-13, KA-U10 | KA-23 / GR-U4, KA-U10, MM-U3, MM-U9, V-B13-REGELVERSJON |
| `VURDERING_UTENFOR_KJERNEN` | N `kontrollerSvar` ← `utenforOmfanget`, eller en innsigelse mot vederlagskravet | Vurderingen har en verdi kjernen ennå ikke har et standpunkt for (se 3) | #304, #341, VS-U9, OV-U1 | VS-03 / GR-U12, MM-U2, OV-U1, VS-U9, VS-U11 |
| `UGYLDIG_VURDERING` | N `kontrollerSvar` ← `regnUtSvar` (`UgyldigVurdering`) | En vurdering mangler eller er ugyldig: resultatet passer ikke kategorien, § 32.2 mangler, delvis uten beløp, beløpet er høyere enn kravet, dagene er flere enn kravet, eller § 34.2.2, § 33.4 eller § 33.6.1 mangler | B-13, #235 | GR-17, GR-18, VS-03 / GR-U12, MM-U2, NS-32.1, NS-32.2-1, NS-32.3-1c, OV-U1, V-235, V-B13-FRAFALL, VS-U9, VS-U11 |
| `ANNET_RESULTAT` | N `kontrollerSvar` | Klientens resultat avviker fra serverens utregning | B-13 | uten rad (#475) |
| `BEGRUNNELSE_MANGLER` | N `kontrollerSvar`/`avgrensninger`; `kravetsUtdypning` (frist); `begrunnelsensTekst` | Mangler begrunnelse: et svar med avgrensning (preklusjon, avslag, frafall, ikke fullt godkjent, ingen hindring), et fristkrav eller en begrunnelse fra appen | KA-U24, KA-U31, KA-U32, KA-U33, KA-U34, VS-U13 | KA-42 / KA-U34 |
| `BESKRIVELSE_MANGLER` | N `kravetsUtdypning` | Et grunnlagskrav der § 32.2 gjelder, uten beskrivelse av pålegget | GR-U15 | uten rad (#475) |
| `FEIL_BESTRIDELSE` | N (bestridelse) | Slaget i bestridelsen er ikke slaget i opplysningen | MM-U7 | uten rad (#475) |
| `VARSLINGSPLIKT_GJELDER_IKKE` | N (passivitet) | § 32.2 gjelder ikke kategorien, så heller ikke § 32.3 annet ledd | VS-U12, GR-U11 | VS-04 / GR-U11, VS-U12 |
| `BEGRUNNELSE_FOER_SVARET` | N `begrunnelsensDato` | En registrert begrunnelse er datert før svaret | KA-U36–KA-U39 | KA-45 / KA-U36–KA-U39 |
| *(`REGELBRUDD`)* | S (`Utfall.feil`) | Feilklassen for alle avvisninger etter formen | – | ikke en regelkode |

Kontrollen av vedtaks-ID-ene: kolonnen fra regler.json er hentet maskinelt (kjørt). ID-ene i
kommentarene er lest. Jeg har ikke kontrollert at hver ID finnes i vedtaksregisteret; det
gjør `docs/verktoy/vedtakshenvisninger.py` (#452).

---

## 6. Regeltabellen

- **Hvor:** kilden er `docs/domenetabell/regler.json`, i feltet `rader`. Tabellen genereres
  til `docs/domenetabell/README.md` mellom `<!-- domenetabell:start -->` og
  `<!-- domenetabell:slutt -->` av `docs/verktoy/domenetabell.py --skriv`. Sporbarheten
  (kode → rader) står i samme README under «Sporbarhet».
- **Antall:** **110 rader** (kjørt). Prefiksene er KA 48, GR 30, EO 26 og VS 6, og
  generert tabell i README har også 110 rader.
- **Mer i samme fil:** 108 `kilder`, 17 `koder_uten_rad`, og 51 rader med `funksjoner`
  (sporbarheten er ført for byggedel 1: GR-01–GR-30, VS-01–VS-06 og KA-31–KA-45).
- **Bevis-sakene** for målmodellen står i `docs/domenetabell/bevis-saker-maalmodell.json`,
  med 154 forløp (kjørt).

---

## 7. Merknader til kontrollpunktene i premissene

Alt i dette avsnittet er lest ut av koden (L), og noe er bekreftet ved kjøring (K).

- **Sperrer ved enighet og trekk.** De gjelder hele sporet, ikke en bestemt versjon.
  `ENIGHET_I_SPORET` stopper ny kravversjon og revisjon, og `KRAV_TRUKKET` og
  `INGEN_KRAV_I_SPORET` stopper alt i sporet. `KRAVENE_AVGJORT` og `GRUNNLAG_AVVIST`
  stopper alle sporhandlingene i saken.
- **Enighet ved sammenfall er automatisk.** Et svar som godkjenner hele kravet uten
  påberopt preklusjon, gir `enighet` med `kilde: 'sammenfall'` uten at TE har handlet
  (`utled.ts`). Er § 32.2 gjeldende i grunnlaget, blir svaret også en endringsordre
  (`blirEndringsordre`), og trekket av grunnlaget sperres (K: `GRUNNLAG_ER_ENDRINGSORDRE`).
- **Kravet brukes som varsel etter § 33.4.** Når det ikke er registrert noe varsel, lagres
  BHs `rettidighet` med `gjelder` lik kravversjonen: `u.spor.frist.varsel?.id ?? krav.id`
  i `standpunkter` (`skriving.ts`). `frist_varsel_ok` er påkrevd i hvert fristsvar (K).
  Brevteksten sier «varselet om fristforlengelse etter NS 8407 § 33.4» uansett
  (`VARSELET` i `brevtekst.ts`).
- **Hvilket krav et svar gjelder.** Klienten må sende `gjelder`, men verdien må være
  gjeldende kravversjon (`FEIL_KRAVREFERANSE`). En aksept må gjelde gjeldende svar
  (`IKKE_GJELDENDE_SVAR`).
- **Ingen videreføring til ny kravversjon.** `gjeldendeSvar` er svaret på
  `gjeldendeKrav`, så en ny kravversjon står uten svar (`venterPaaSvar`). Det finnes ingen
  kode som flytter godkjenning, metodeaksept eller rettidighet over.
- **Generert tekst om subsidiær aksept.** Når sporet er subsidiært, legger brevteksten i
  `aksept` til «TE er enig i beløpet [antallet dager], men ikke i byggherrens standpunkt
  til grunnlaget» (`utsagnstekst`). Det følger av vedtaket (LV-U4 punkt 6), ikke av et valg
  TE gjør i kommandoen.
- **Spor som ikke er sendt.** `kraveneErAvgjort` krever at **hvert** av vederlag og frist er
  trukket, har «ingen krav» eller har virksom enighet. Et spor som ikke er sendt, hindrer
  derfor «avgjort» og statusen «Avsluttet: oppgjort». Kommentaren sier: «Et spor TE ikke
  har sendt, er ikke avgjort (EO-U2, GR-U3)». Dette avviker fra premiss 5 («et spor som
  ikke er sendt, skal … ikke hindre at saken blir omforent») (A: avviket er min lesning av
  premisset).
- **Samlebetegnelser i visningen.** Statusene står i `STATUSTEKST` i `visning.ts`:
  «Avsluttet: oppgjort», «Avsluttet: avslått», «Avsluttet: trukket», «Venter på svar» og
  «Under forhandling». Ingen regel leser dem (arkitekturtesten, INV-MM-9). Sperren kommer
  fra predikatene under (`kraveneErAvgjort` osv.).

---

## Verifikasjon og grenser

**Kjørt og observert (K).** Prøveskriptene `probe.ts` og `probe2.ts` (utenfor repoet, ikke bevart) kjørte på
`44bbb49` med Node 22.22 og `--experimental-strip-types`, mot en journal i minnet uten
database eller server. Disse avvisningene og godtakelsene er observert:

- force majeure, enhetspriser, regningsarbeid, `rigg_belop`, negativt beløp og
  `varsel` med hjemmel 34.1.2 (`UGYLDIG_FORM`);
- `aksepterer_metode` som mangler, og `hovedkrav_varslet_i_tide` som mangler
  (`UGYLDIG_VURDERING`);
- `aksepterer_metode: false`, `hovedkrav_varslet_i_tide: false` og
  `foresporsel_svar_ok: false` (`VURDERING_UTENFOR_KJERNEN`);
- `spesifisert_krav_ok` og `frist_varsel_ok` som mangler (`UGYLDIG_VURDERING`);
- `BEGRUNNELSE_MANGLER`, `BESKRIVELSE_MANGLER`, `VARSEL_REGISTRERT`,
  `INGEN_REGISTRERT_BREV`, `BEGRUNNELSE_FOER_SVARET`, `GRUNNLAG_ER_ENDRINGSORDRE` og
  `GRUNNLAG_IKKE_SENDT`;
- godtatte rader for `varsel` (registrert), `begrunnelse` (registrert, også med dato i
  2030), `ingen_krav` og svar på alle tre sporene.

Kodemengdene i avsnitt 5 og radtallene i avsnitt 6 er telt med `grep`/Python.

**Lest ut av koden (L).** Resten: kommandoskjemaene, forutsetningene,
nyttelastkontrollen, utledningen og brevteksten.

**Ikke kontrollert.**

- Testene (`npx vitest run`) er ikke kjørt, og jeg har ikke lest testfilene i
  `kjerne/tester/` utover treff på kodene og `radFor`/`frysBrev`.
- Om hver vedtaks-ID i kommentarene finnes i vedtaksregisteret.
- Status for #309, #310, #341, #367 og #475 på GitHub. Om en kommando for registrert krav
  eller svar er planlagt, står derfor bare som vedtakene og matrisen sier det.
- Serverens egne koder i `server/app.ts` og `server/autorisasjon.ts` (`VERSJONSKONFLIKT`,
  `SAK_FINNES_IKKE`, `UGYLDIG_FORESPOERSEL`, `CONTRACT_ROLE_REQUIRED` med flere) er ikke
  kartlagt utover navnene. Heller ikke hvordan en sak opprettes, siden serveren ikke har
  noen rute for `sak_opprettet`.
- Frontendens bruk av kjernen (`src/`) og Python-stien.
- `buffer.ts` er bare lest i hodet; den påvirker ikke hva som kan uttrykkes.
