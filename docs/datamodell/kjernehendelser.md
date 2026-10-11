# Hendelsene TS-kjernen skriver

_Generert fra docs/datamodell/kjernehendelser.toml av docs/verktoy/datamodell.py. Rett i registeret, ikke her._

Format 1. Formen er skjemaene i [`kjerne/format.ts`](../../kjerne/format.ts), og designet står i [designnotatet](../design-hendelsesformat-2026-10-09.md). Pythons hendelsestyper står i [hendelser.md](hendelser.md).

Hver rad har kolonnen `format`. `data` har ingen `null`, ingen tom liste og ingen tom streng, og et ukjent felt eller en ukjent art gjør saken ikke forstått (MM-U2). Hvert element har en `id` satt av serveren, og relasjonene står som `gjelder` og `erstatter`.

## Typene

| Type | Innhold | Felt i `data` | Grunnlag |
| --- | --- | --- | --- |
| `sak_opprettet` | Saken er opprettet. Første rad i saken. | `sakstittel`, `sakstype` | B-17. Andre sakstyper enn `standard` hører til #309 |
| `dokument_registrert` | Ett dokument fra én part: kravene, svarene, utsagnene og opplysningene i det. Et brev med flere svar er én rad, og saksversjonen øker med én. Dokumentet har minst ett krav, ett svar eller ett utsagn. Avsenderen er `actorrole`. | `krav`, `svar`, `utsagn`, `opplysninger`, `dokumentasjon` | MM-U10, designnotatet 4.1 |

## Krav

| Spor | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- |
| `grunnlag` | En kravversjon av ansvarsgrunnlaget. `erstatter` er forrige kravversjon i sporet. `hovedkategori` og `underkategori` er et par fra kjernens lukkede liste (`KATEGORIER` i `kjerne/koder.ts`), for eksempel `endring` og `irregulaer_endring`. Et ukjent par gjør raden ikke forstått. | `id`, `spor`, `erstatter`, `hovedkategori`, `underkategori`, `tittel`, `beskrivelse` | KA-U2, designnotatet 4.2 |
| `vederlag` | En kravversjon av vederlaget, i kroner over 0. `metode` er `tilbud` (§ 34.2.1). | `id`, `spor`, `erstatter`, `metode`, `beloep` | KA-U2, KA-U8 |
| `frist` | En kravversjon av fristforlengelsen, i dager over 0. | `id`, `spor`, `erstatter`, `dager` | KA-U2, KA-U8 |

## Svar

| Spor | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- |
| `grunnlag` | Byggherrens svar på en kravversjon av grunnlaget. `gjelder` er kravversjonen, `erstatter` svaret en revisjon erstatter. Grunnlaget har ingen utregning. | `id`, `spor`, `gjelder`, `erstatter`, `standpunkter`, `beslutningsgrunnlag` | KA-U1, MM-U9, designnotatet 4.2 og 4.3 |
| `vederlag` | Byggherrens svar på en kravversjon av vederlaget, med serverens utregning. | `id`, `spor`, `gjelder`, `erstatter`, `standpunkter`, `utregning`, `beslutningsgrunnlag` | B-13, MM-U9 |
| `frist` | Byggherrens svar på en kravversjon av fristen, med serverens utregning. | `id`, `spor`, `gjelder`, `erstatter`, `standpunkter`, `utregning`, `beslutningsgrunnlag` | B-13, MM-U9 |

## Standpunkter i et svar

| Art | Innhold | Spor | Felt | Grunnlag |
| --- | --- | --- | --- | --- |
| `rettidighet` | Om varselet kom i tide: § 32.2 i grunnlaget, § 33.4 i fristen. `gjelder` er kravversjonen, eller et registrert varsel etter § 33.4. | grunnlag, frist | `id`, `art`, `gjelder`, `hjemmel`, `i_tide` | KA-U4, MM-U1, MM-U8 |
| `grunnlag` | Byggherrens standpunkt til grunnlaget: `godkjent`, `avslaatt` eller `paalegg_frafalt`. Frafallet gjelder pålegget (§ 32.3 c), ikke TEs krav, og er ikke en vurdering av ansvaret. | grunnlag | `id`, `art`, `resultat` | § 32.3 a–c, GR-U9, GR-U10 |
| `beloep` | Beløpet. Resultatet og beløpet står i svarets utregning, så de har ett hjem. | vederlag | `id`, `art` | B-13, designnotatet 4.3 |
| `hindring` | Om byggherren godtar at fremdriften hindres som følge av forholdet saken gjelder (§ 33.1). | frist | `id`, `art`, `oppfylt` | § 33.1, vedtaket 05.10 (#211) |
| `dager` | Dagene. Resultatet og dagene, også de subsidiære, står i svarets utregning. | frist | `id`, `art` | B-13, designnotatet 4.3 |

## Andre utsagn

| Art | Innhold | Avsender | Felt | Grunnlag |
| --- | --- | --- | --- | --- |
| `varsel` | Varsel etter § 33.4. Datoen det ble sendt, er en opplysning i samme dokument. | TE | `id`, `art`, `hjemmel` | MM-U1, SK-12 |
| `trekk` | TE trekker kravet. `gjelder` er gjeldende kravversjon i sporet. | TE | `id`, `art`, `gjelder` | KA-U6, GR-U5 |
| `aksept` | TE godtar ett svar. `regelversjon` er den TE fikk se. Innholdet står i brevet. | TE | `id`, `art`, `gjelder`, `regelversjon` | KA-U1, KA-U10 |
| `bestridelse` | En part bestrider at dokumentet i en opplysning fra motparten ble sendt eller mottatt. | TE eller BH | `id`, `art`, `gjelder`, `hva` | MM-U1, MM-U7 |
| `ingen_krav` | TE krever ikke noe i et spor som ikke er sendt. Har `spor` og ikke `gjelder`. | TE | `id`, `art`, `spor` | KA-U12 |

## Opplysninger om dokumentet

| Hva | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- |
| `sendt` | Når dokumentet ble sendt utenfor appen. Et dokument med `sendt` eller `mottatt` uten `gjelder` er registrert korrespondanse. Med `gjelder` gjelder datoen et varsel i dokumentet, for eksempel et varsel sendt før kravet det står i (HF-U1). | `id`, `hva`, `dato`, `gjelder` | Modellforslaget 2.4, MM-U1 |
| `mottatt` | Når dokumentet ble mottatt, eller med `gjelder`, varselet i dokumentet. | `id`, `hva`, `dato`, `gjelder` | Modellforslaget 2.4, MM-U7 |
| `endringsordre` | Om registrert korrespondanse med et svar på grunnlaget var en endringsordre etter § 31.3, oppgitt av den som registrerer, med vedlegget i `dokumentasjon`. Registratorens vurdering, ikke en rettslig avgjørelse. Uten `gjelder` står den i brevet selv. En senere avklaring er et nytt dokument med bare opplysningen, der `gjelder` er det registrerte brevet, som ikke skrives om. Det står høyst én slik opplysning per brev. Uten opplysningen er det ikke avklart om svaret er en endringsordre, og trekket av grunnlaget er sperret til det er avklart. | `id`, `hva`, `oppfylt`, `gjelder` | § 31.3, § 32.3 a, GR-U13, KA-U14, MM-U12 |

## Delene

| Del | Spor | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- | --- |
| `beslutningsgrunnlag` | alle | Appens vurdering da brevet ble sendt, atskilt fra det byggherren sa, og ikke en rettslig avgjørelse (MM-U9): regelversjonen, hvordan brevet ordner standpunktene (`virkninger` med `prinsipalt` eller `subsidiaert`), standpunktene uten virkning (`uten_virkning`), brevlinjen, om svaret godkjenner hele kravet (`sammenfall`) og, i grunnlaget, om § 32.2 gjaldt etter reglene og underkategorien da (`varslingsplikt`). Hvert standpunkt står i `virkninger` eller `uten_virkning`. Utfallet og vilkåret utledes og lagres ikke. | `regelversjon`, `virkninger`, `uten_virkning`, `linje`, `sammenfall`, `varslingsplikt` | MM-U9, MM-U11, GR-U12, KA-U10 |
| `utregning` | vederlag | Serverens utregning: resultatet (`godkjent`, `delvis_godkjent`, `avslaatt` eller `tilbakeholdelse`) og det godkjente beløpet. | `resultat`, `godkjent_beloep` | B-13 |
| `utregning` | frist | Serverens utregning: resultatet (`godkjent`, `delvis_godkjent` eller `avslaatt`) og de godkjente dagene, og det subsidiære standpunktet når det finnes. | `resultat`, `godkjent_dager`, `subsidiaert_resultat`, `subsidiaert_godkjent_dager` | B-13, vedtaket 05.10 (#211) |
