# Hendelsene TS-kjernen skriver

_Generert fra docs/datamodell/kjernehendelser.toml av docs/verktoy/datamodell.py. Rett i registeret, ikke her._

Format 1. Formen er skjemaene i [`kjerne/format/format.ts`](../../kjerne/format/format.ts), og designet står i [designnotatet](../design-hendelsesformat-2026-10-09.md). Pythons hendelsestyper står i [hendelser.md](hendelser.md).

Hver rad har kolonnen `format`. `data` har ingen `null`, ingen tom liste og ingen tom streng, og et ukjent felt eller en ukjent art gjør saken ikke forstått (MM-U2). Hvert element har en `id` satt av serveren, og relasjonene står som `gjelder` og `erstatter`.

## Typene

| Type | Innhold | Felt i `data` | Grunnlag |
| --- | --- | --- | --- |
| `sak_opprettet` | Saken er opprettet. Første rad i saken, i versjon 1, før grunnlagskravet. `POST /api/kjerne/saker` i `server/app.ts` kaller opprettelsen i kjernen (`opprettelse` i `kjerne/kommandoer/opprettelse.ts`), som godtar bare TE og gir `format` og `data`, og så `opprettSak` i `server/kommandoer.ts`, som skriver raden og også avviser en annen side enn TE (#370, #696). | `sakstittel`, `sakstype` | B-17, LV-U2, DL-U6. Andre sakstyper enn `standard` hører til #309 |
| `dokument_registrert` | Ett dokument fra én part: kravene, svarene, utsagnene og opplysningene i det. Et brev med flere svar er én rad, og saksversjonen øker med én. Dokumentet har minst ett krav, ett svar eller ett utsagn. Avsenderen er `actorrole`. Et brev appen sender, har brevteksten (`brevtekst`); et registrert brev har ingen. | `krav`, `svar`, `utsagn`, `opplysninger`, `dokumentasjon`, `brevtekst` | MM-U10, LV-U2, designnotatet 4.1 |

## Krav

| Spor | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- |
| `grunnlag` | En kravversjon av grunnlaget. `erstatter` er forrige kravversjon i sporet. `hovedkategori` og `underkategori` er et par fra kjernens lukkede liste (`KATEGORIER` i `kjerne/format/koder.ts`), for eksempel `endring` og `irregulaer_endring`. Et ukjent par gjør raden ikke forstått. I underkategorien `endringsordre` oppgir TE endringsordrens dato eller nummer (`endringsordre`), og bare der. TE oppgir datoen varslingsplikten løper fra: i hovedkategorien `endring`, unntatt `endringsordre`, datoen pålegget ble mottatt (`paalegg_mottatt`), og i `svikt` og `andre_forhold` datoen TE ble klar over forholdet (`klar_over_forholdet`). Feltet finnes bare i kategorien det hører til. Et krav fra appen har det; et registrert krav kan mangle det. Kommandoen avviser en dato etter skrivetidspunktet i norsk tid (`DATO_ETTER_BREVET`); ingen regel vurderer rettidigheten. TEs beskrivelse av forholdet står i brevteksten, som utdypningen under kravet. | `id`, `spor`, `erstatter`, `hovedkategori`, `underkategori`, `tittel`, `endringsordre`, `paalegg_mottatt`, `klar_over_forholdet` | KA-U2, GR-U16, VS-U26, designnotatet 4.2 |
| `vederlag` | En kravversjon av vederlaget, i kroner over 0. `metode` er `tilbud` (§ 34.2.1). | `id`, `spor`, `erstatter`, `metode`, `beloep` | KA-U2, KA-U8 |
| `frist` | En kravversjon av fristforlengelsen, i dager over 0. | `id`, `spor`, `erstatter`, `dager` | KA-U2, KA-U8 |

## Svar

| Spor | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- |
| `grunnlag` | Byggherrens svar på en kravversjon av grunnlaget. `gjelder` er kravversjonen, `erstatter` svaret en revisjon erstatter. Grunnlaget har ingen utregning. | `id`, `spor`, `gjelder`, `erstatter`, `standpunkter`, `beslutningsgrunnlag` | KA-U1, MM-U9, designnotatet 4.2 og 4.3 |
| `vederlag` | Byggherrens svar på en kravversjon av vederlaget, med serverens utregning. `grunnlagskrav` er grunnlagsversjonen svaret ble regnet mot. Om svaret er subsidiært til grunnlaget, leses av den og lagres ikke (#342). | `id`, `spor`, `gjelder`, `erstatter`, `grunnlagskrav`, `standpunkter`, `utregning`, `beslutningsgrunnlag` | B-13, MM-U9, HF-U1, GR-U1, GR-U4 |
| `frist` | Byggherrens svar på en kravversjon av fristen, med serverens utregning. `grunnlagskrav` er grunnlagsversjonen svaret ble regnet mot (#342). | `id`, `spor`, `gjelder`, `erstatter`, `grunnlagskrav`, `standpunkter`, `utregning`, `beslutningsgrunnlag` | B-13, MM-U9, HF-U1, GR-U1, GR-U4 |

## Standpunkter i et svar

| Art | Innhold | Spor | Felt | Grunnlag |
| --- | --- | --- | --- | --- |
| `rettidighet` | Om varselet kom i tide: § 32.2 i grunnlaget, § 34.1.2 i vederlaget, § 33.4 i fristen. `gjelder` er kravversjonen, eller et registrert varsel etter § 33.4. | grunnlag, vederlag, frist | `id`, `art`, `gjelder`, `hjemmel`, `i_tide` | KA-U4, MM-U1, MM-U8, VS-U3 |
| `metode` | § 34.2.2: om byggherren aksepterer TEs tilbud. Uten aksept står metoden byggherren mener vederlaget skal justeres etter (`oensket_metode`). Appen avgjør ikke om § 34.3 eller § 34.4 gjelder. | vederlag | `id`, `art`, `hjemmel`, `aksepterer`, `oensket_metode` | VS-U3, KA-U4, arbeidsvalget i #479 |
| `spesifisering` | § 33.6.1: om TE spesifiserte kravet i tide. `gjelder` er kravversjonen. Ved «nei» er `dager` det byggherren mener at byggherren måtte forstå at TE hadde krav på, og det står prinsipalt. | frist | `id`, `art`, `gjelder`, `hjemmel`, `i_tide`, `dager` | VS-U3, VS-U4, KA-U4, arbeidsvalget i #479 |
| `grunnlag` | Byggherrens standpunkt til grunnlaget: `godkjent`, `avslaatt` eller `paalegg_frafalt`. Frafallet gjelder pålegget (§ 32.3 c), ikke TEs krav, og er ikke en vurdering av ansvaret. | grunnlag | `id`, `art`, `resultat` | § 32.3 a–c, GR-U9, GR-U10 |
| `beloep` | Beløpet. Resultatet og beløpet står i svarets utregning, så de har ett hjem. | vederlag | `id`, `art` | B-13, designnotatet 4.3 |
| `hindring` | Om byggherren godtar at fremdriften hindres som følge av forholdet saken gjelder (§ 33.1). | frist | `id`, `art`, `oppfylt` | § 33.1, vedtaket 05.10 (#211) |
| `dager` | Dagene. Resultatet og dagene, også de subsidiære, står i svarets utregning. | frist | `id`, `art` | B-13, designnotatet 4.3 |

## Andre utsagn

| Art | Innhold | Avsender | Felt | Grunnlag |
| --- | --- | --- | --- | --- |
| `varsel` | Varsel etter § 33.4. Datoen det ble sendt, er en opplysning i samme dokument. I et brev fra appen uten den opplysningen er brevet varselet, og datoen er dokumentets tidspunkt fra serveren. | TE | `id`, `art`, `hjemmel` | MM-U1, SK-12, VS-U15 |
| `trekk` | TE trekker kravet. `gjelder` er gjeldende kravversjon i sporet. | TE | `id`, `art`, `gjelder` | KA-U6, GR-U5 |
| `aksept` | TE godtar ett svar. `regelversjon` er den TE fikk se. Innholdet står i brevet. | TE | `id`, `art`, `gjelder`, `regelversjon` | KA-U1, KA-U10 |
| `bestridelse` | En part bestrider en opplysning fra motparten: at dokumentet ble sendt eller mottatt, eller at det var en endringsordre etter § 31.3. Uten virkning på utfallet. | TE eller BH | `id`, `art`, `gjelder`, `hva` | MM-U1, MM-U7 |
| `ingen_krav` | TE krever ikke noe i et spor som ikke er sendt. Har `spor` og ikke `gjelder`. | TE | `id`, `art`, `spor` | KA-U12 |
| `innsigelse` | Innsigelse etter § 5 tredje ledd: parten gjør gjeldende at motpartens varsel, krav eller svar (`gjelder`) kom for sent. Registreres og vises uten virkning på utfallet. Et senere registrert svar fra samme part uten standpunkt om rettidighet leses med den første innsigelsen (VS-U11), og står da i svarets `virkninger`. | TE eller BH | `id`, `art`, `gjelder` | VS-U1, VS-U9, VS-U11, VS-U14 |
| `protest` | Protest mot en innsigelse fra motparten. `gjelder` er innsigelsen, et standpunkt om rettidighet der motparten sa at varselet kom for sent, eller et dokument, og da gjelder protesten alle innsigelsene i det (MP-U6). Uten virkning på utfallet. | TE eller BH | `id`, `art`, `gjelder` | VS-U1, VS-U9, MP-U6 |
| `passivitet` | TE påberoper byggherrens passivitet etter § 32.3 annet ledd. `gjelder` er TEs varsel etter § 32.2, kravet i grunnlagssporet. Før og etter byggherrens svar. Uten virkning på utfallet, og sperrer ikke svaret. | TE | `id`, `art`, `gjelder` | VS-U12, GR-U11 |
| `begrunnelse` | Byggherrens senere begrunnelse av et svar. `gjelder` er svaret, også et svar som er erstattet eller registrert. Fra appen står teksten i brevteksten, som utdypningen under den faste setningen. Registrert har dokumentet ingen tekst, men datoen det ble sendt og brevet som vedlegg (KA-U35). Endrer ingen standpunkter, og godtas også når kravene er avgjort. Erstatter ikke begrunnelsen et svar fra appen må ha. | BH | `id`, `art`, `gjelder` | KA-U34, KA-U35, KA-U18, KA-U24, MM-U12 |

## Opplysninger om dokumentet

| Hva | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- |
| `sendt` | Når dokumentet ble sendt utenfor appen. Et dokument med `sendt` eller `mottatt` uten `gjelder` er registrert korrespondanse. Med `gjelder` gjelder datoen et varsel i dokumentet, for eksempel et varsel sendt før kravet det står i (HF-U1). | `id`, `hva`, `dato`, `gjelder` | Modellforslaget 2.4, MM-U1 |
| `mottatt` | Når dokumentet ble mottatt, eller med `gjelder`, varselet i dokumentet. | `id`, `hva`, `dato`, `gjelder` | Modellforslaget 2.4, MM-U7 |
| `endringsordre` | Om registrert korrespondanse med et svar på grunnlaget var en endringsordre etter § 31.3, oppgitt av den som registrerer, med vedlegget i `dokumentasjon`. Registratorens vurdering, ikke en rettslig avgjørelse. Uten `gjelder` står den i brevet selv. En senere avklaring er et nytt dokument med bare opplysningen, der `gjelder` er det registrerte brevet, som ikke skrives om. Det står høyst én slik opplysning per brev. Med opplysningen i brevet selv er byggherrens registrerte godkjenning svaret på grunnlaget (OV-U6); ellers er brevet dokumentasjon uten virkning (OV-U4). Opplysningen sperrer ikke trekket av grunnlaget. | `id`, `hva`, `oppfylt`, `gjelder` | § 31.3, § 32.3 a, GR-U13, KA-U14, MM-U12, OV-U4, OV-U6 |

## Delene

| Del | Spor | Innhold | Felt | Grunnlag |
| --- | --- | --- | --- | --- |
| `beslutningsgrunnlag` | alle | Appens vurdering da brevet ble sendt, atskilt fra det byggherren sa, og ikke en rettslig avgjørelse (MM-U9): regelversjonen, hvordan brevet ordner standpunktene (`virkninger` med `prinsipalt` eller `subsidiaert`), standpunktene uten virkning (`uten_virkning`), brevlinjen, om svaret godkjenner hele kravet (`sammenfall`) og, i grunnlaget, om § 32.2 gjaldt etter reglene og underkategorien da (`varslingsplikt`). Hvert standpunkt står i `virkninger` eller `uten_virkning`. Et registrert svar uten standpunkt om rettidighet kan være lest med en innsigelse fra samme part (VS-U11): da står innsigelsen først i `virkninger`. Utfallet og vilkåret utledes og lagres ikke. | `regelversjon`, `virkninger`, `uten_virkning`, `linje`, `sammenfall`, `varslingsplikt` | MM-U9, MM-U11, GR-U12, KA-U10 |
| `brevtekst` | alle | Teksten i et brev appen sender, frosset da brevet ble skrevet: ett avsnitt per krav, svar, utsagn og opplysning parten sier i brevet (`gjelder`), og ett for vedleggene, som gjelder dokumentet, med den låste delen appen lager av valgene (`laast`) og partens utdypning (`utdypning`) hver for seg. Det som ikke står i teksten, regnes ikke som meddelt. Appens vurdering står ikke i teksten, og ingen regel leser den. Et registrert brev har ingen (MM-U17). | `gjelder`, `laast`, `utdypning` | LV-U2, LV-U3, LV-U4, B-13 om begrunnelsestekst, KA-U22, KA-U25 |
| `dokumentasjon` | alle | Vedleggene brevet binder, ett per vedlegg: ID-en i mellomlageret (`vedlegg_id`), filnavnet (`filnavn`) og SHA-256 av innholdet (`innhold_sha256`). Klienten oppgir ID-en, og serveren fyller inn filnavnet og summen fra mellomlageret i samme transaksjon som brevet skrives og vedlegget bindes. Et registrert brev har brevet som vedlegg. | `vedlegg_id`, `filnavn`, `innhold_sha256` | LV-U14, LV-U1, OV-U4, KT-U5, arbeidsvalg 3, 4 og 10 i #790 |
| `utregning` | vederlag | Serverens utregning: resultatet (`godkjent`, `delvis_godkjent`, `avslaatt` eller `tilbakeholdelse`) og det godkjente beløpet, og det subsidiære standpunktet ved preklusjon etter § 34.1.2. | `resultat`, `godkjent_beloep`, `subsidiaert_resultat`, `subsidiaert_godkjent_beloep` | B-13, VS-U3 |
| `utregning` | frist | Serverens utregning: resultatet (`godkjent`, `delvis_godkjent` eller `avslaatt`) og de godkjente dagene, og det subsidiære standpunktet når det finnes. | `resultat`, `godkjent_dager`, `subsidiaert_resultat`, `subsidiaert_godkjent_dager` | B-13, vedtaket 05.10 (#211) |
