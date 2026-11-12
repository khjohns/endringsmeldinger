# Språket i løsningen

Klarspråk i visningen, vedtakene og brevene, og betegnelsen for løsningen. Fila er
hjemmet for reglene for synlig tekst. Reglene for språket i koden, kommentarene og
dokumentasjonen står i [`CLAUDE.md`](../CLAUDE.md), «Språk».

## Klarspråk

Teksten skal være klar for den som leser den første gangen. Kilder:
[klart språk på nett](https://punkt.oslo.kommune.no/latest/god-praksis/slik-skriver-vi-for-nett/)
i Punkt og Oslo kommunes språkprofil.
Rådene under er med egne ord.

- Korte setninger som bærer én mening. Overskrifter sier hva siden gjelder.
- Ord brukeren kjenner. Kodenavn og interne fagbegreper, som «respons», vises ikke.
- En feilmelding eller sperre sier hva som hindrer, og hva brukeren kan gjøre nå.
- Feilmeldingene ved feltene har samme form: «<Verb> <feltet>.», for eksempel «Skriv tittelen.»,
  «Beskriv pålegget.» og «Velg forholdet.» (#1482).
- Bestemmelsene i NS 8407 forklares med egne ord. De gjengis ikke ordrett i visningen.
- Lenketekster sier hvor lenken fører. «Les mer» står ikke alene.
- Klarspråk gjelder hvordan det sies, ikke hva. Domenebegrepene (EO, KOE, varsel,
  forsering), henvisningene til NS 8407 som «punkt 33.8» ([OV-U75](plans/vedtak.md#ov-u75), [LV-U39](plans/vedtak.md#lv-u39)) og
  vedtatt ordlyd står som de er. I brevene og visningen
  skrives partene fullt ut (se «Ordene i brevene og skjemaene»). Presisjonskravet
  i [`CLAUDE.md`](../CLAUDE.md) går foran. En vedtatt ordlyd endres bare gjennom
  [vedtaksregisteret](vedtaksregister/README.md).

## Hva løsningen kalles

Regelen står i [`CLAUDE.md`](../CLAUDE.md), «Språk». Her står begrunnelsen og
eksemplene.

«Appen» er forståelig mellom oss som utvikler løsningen, men den som leser et vedtak,
et skjema eller et brev, trenger noe annet. Et vedtak skal kunne leses som en
beslutning om produktet. En teknisk beskrivelse er presis bare når den sier hvilken
del som gjør noe. Et skjema er klarest når det sier hva som er gjort. Et brev er
partens meddelelse til motparten etter kontrakten, og der er programvaren normalt
uvedkommende. Å bytte «appen» mekanisk med «systemet» gir sjelden bedre tekst; det
beste er ofte å beskrive hva som er gjort.

| Hvor teksten står | Hva den sier |
| --- | --- |
| Vedtak og produktbeskrivelse | «løsningen» |
| Teknisk beskrivelse | Delen som faktisk menes: kjernen, visningen, beregningen eller registreringen |
| Skjema og hjelpetekst | Handlingen: «registrert her», «sendt herfra», «tidligere svar» |
| Partenes brev | Partene, handlingene og dokumentene; normalt ingen omtale av løsningen |

Eksempler fra sparringen om spørsmål 2 i
[vurderingen av vedtakene 25.10](https://github.com/khjohns/endringsmeldinger/pull/1282):

- Visningen: «Oversikten bygger på byggherrens registrerte svar. Det tidligere
  dokumentet er ikke tolket ved denne registreringen. Oversikten avgjør ikke hvilken
  betydning dokumentet har for partenes rettigheter og plikter.»
- Vedtaket: «Utledningen bygger på det strukturerte standpunktet BH bekrefter.
  Henvisningen til det tidligere dokumentet gir ikke i seg selv et grunnlagssvar.»
- Brevet: «For byggherrens standpunkt til grunnlaget i TEs krav i brev 3 av 12.10.2026
  vises det til byggherrens e-post av 14.10.2026.» Brevet sier ikke hvor svaret ble
  sendt fra.

Regelen gjelder ny og omskrevet tekst. Den er ingen grunn til å skrive om vedtak,
sitater, lagrede navn eller vedtatt brevtekst; en vedtatt ordlyd endres bare gjennom
[vedtaksregisteret](vedtaksregister/README.md). Merknaden «Appen vurderer ikke
innholdet» (OV-U4, OV-U19) er endret av [OV-U81](plans/vedtak.md#ov-u81) og [OV-U86](plans/vedtak.md#ov-u86).

## Ordene i brevene og skjemaene

Ordene under gjelder brevene, skjemaene og visningen av kravene. Begrepene står i
[domenetabellen](domenetabell/README.md#begreper). Ny tekst følger reglene her. En vedtatt
brevtekst står til et vedtak endrer den. Vedtaket for brevene føres i
[#1433](https://github.com/khjohns/endringsmeldinger/issues/1433).

| Ord | Regel | Grunnlag |
| --- | --- | --- |
| Partene | Brevene og visningen skriver «byggherren» og «totalentreprenøren» fullt ut, også i «totalentreprenørens krav», «byggherrens svar» og knapper som «Send til byggherren». Forkortelsene BH og TE brukes bare i trange kolonner og merker, som «Brev 2 · BH» i sakslisten, og aldri i teksten i et brev. | #1433. Visningen: #1482 |
| Godkjenner og godtar | Byggherren «godkjenner», «avslår» og «gjør gjeldende». Totalentreprenøren «godtar» byggherrens svar. Skjemaet for byggherren spør «Hvor mye godkjenner du?», ikke «godtar du?». Svaret på forholdet sier «er enig i» der [GR-U32](plans/vedtak.md#gr-u32) sier det, og ved svikt og andre forhold det [LV-U41](plans/vedtak.md#lv-u41) sier. | [LV-U4](plans/vedtak.md#lv-u4) punkt 5, [HF-U2](plans/vedtak.md#hf-u2), [KA-U1](plans/vedtak.md#ka-u1), [GR-U32](plans/vedtak.md#gr-u32), [LV-U41](plans/vedtak.md#lv-u41) |
| Vederlagsjustering | Posten i vederlagskravet etter punkt 34.1.1 eller 34.1.2 heter «vederlagsjustering», med hjemmelen der det trengs for å skille den fra den særskilte. Ikke «hovedkrav» eller «justeringen ellers». | NS 8407 punkt 34.1 (#1433). «Justeringen ellers» i [OV-U28](plans/vedtak.md#ov-u28) står til vedtaket i #1433 |
| Særskilt vederlagsjustering | Kravet etter punkt 34.1.3 annet ledd heter «særskilt vederlagsjustering». Kontrakten skiller postene med ordet «særskilt». | NS 8407 punkt 34.1.3 (#1433) |
| Kravet, ikke sporet | «Spor» er et ord i koden og vedtakene. Visningen og brevene sier hva kravet gjelder: «vederlagsjusteringen», «kravet om fristforlengelse», «forholdet». | [OV-U76](plans/vedtak.md#ov-u76), [LV-U41](plans/vedtak.md#lv-u41) |
| Forholdet | Bestemmelsen i kontrakten totalentreprenøren påberoper, heter «forholdet» i visningen, ikke «grunnlaget» eller «ansvarsgrunnlaget». Gruppen og tittelen står slik [OV-U77](plans/vedtak.md#ov-u77) og [OV-U78](plans/vedtak.md#ov-u78) sier. I vedtakene leses ordene slik [OV-U82](plans/vedtak.md#ov-u82) sier. | [OV-U76](plans/vedtak.md#ov-u76), [OV-U77](plans/vedtak.md#ov-u77), [OV-U78](plans/vedtak.md#ov-u78), [OV-U82](plans/vedtak.md#ov-u82) |
| Varselet i kravet | Der kravet også regnes som varselet fordi det ikke er varslet før, sier skjemaet hvor varselet gis, ikke at kravet er varselet: «Gis i dette brevet.», i samme form som «Gitt i brev 3.». Innledningen sier «Har du ikke varslet før, gis varselet i dette brevet.», valget heter «I dette brevet», og panelet teller «2 gis i dette brevet». Ikke «Dette kravet er varselet»: for totalentreprenøren kommer varselet før kravet, og setningen tar bort «også» og vilkåret i vedtaket. Brevteksten til byggherren er kjernens og følger vedtaket. | [VS-U48](plans/vedtak.md#vs-u48), [VS-U49](plans/vedtak.md#vs-u49). Oppdragsgiver 12.11 (#1844) |
| Punkt og pkt. | En henvisning til NS 8407 skrives «punkt 33.4» i visningen og brevene, og «pkt. 33.4» i et merke eller en tabellcelle uten setning rundt. Lover står med «§». Brevets henvisninger til egne punkter og til NS 8407 står slik [LV-U40](plans/vedtak.md#lv-u40) sier. | [OV-U75](plans/vedtak.md#ov-u75), [LV-U39](plans/vedtak.md#lv-u39), [LV-U40](plans/vedtak.md#lv-u40) |
| Påberopelse | Totalentreprenørens første brev heter «Påberopelse av <forholdet>», og byggherrens handling heter «Svar». Handlingen for å trekke den heter «Trekk påberopelsen». Ikke «varsel om grunnlag» eller «grunnlagskrav». | [GR-U31](plans/vedtak.md#gr-u31), [GR-U30](plans/vedtak.md#gr-u30) |
| Brev, ikke versjon | Visningen sier «brev», ikke «versjon», om det parten sender. Handlingen heter «Oppdater påberopelse», før og etter byggherrens svar, og brevet «Brev 3 · Oppdatert påberopelse». Brevkontrollen har «Forrige brev: Påberopelsen i brev 1», og kvitteringen «Brevet er sendt til byggherren». «Kravversjon» er et ord i kjernen og vedtakene. Visningen sier hvordan et brev står i forhold til et annet ut fra det løsningen vet: rekkefølgen og henvisningene, ikke «Erstatter» eller «Reviderer». Brevene kan utfylle eller motsi hverandre, og det avgjør partene. En vedtatt tekst som sier mer, som «avviker fra den registrerte enigheten» i [KA-U52](plans/vedtak.md#ka-u52), står. Vedtatt brevtekst med «erstatter» står til et vedtak endrer den. Vederlag og frist følger i #1654. | PR #1650 |
| Brevet er sidens | Visningen sier ikke «din» om et brev: brevet er sendt fra kontraktssiden, og en kollega i teamet kan ha sendt det. Der det trengs for å skille brevene, står parten fullt ut, som «Totalentreprenørens påberopelse» og «Byggherrens svar», ikke «TEs påberopelse». Der det er klart hvem brevet er fra, står det uten eier: «Forrige versjon: Påberopelsen i brev 1». | PR #1650. Forkortelsene: raden «Partene» |
| Korrespondanse | Det partene har sendt hverandre utenfor løsningen og legger til i saken, heter «korrespondanse», ikke «registrert brev». Kategorien svarer på «Hva er det etter kontrakten?». | [OV-U79](plans/vedtak.md#ov-u79), [OV-U80](plans/vedtak.md#ov-u80) |
