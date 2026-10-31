# Språket i løsningen

Klarspråk i visningen, vedtakene og brevene, og betegnelsen for løsningen. Reglene
for språket står i [`AGENTS.md`](../AGENTS.md), «Språk».

## Klarspråk

Teksten skal være klar for den som leser den første gangen. Kilder:
[klart språk på nett](https://punkt.oslo.kommune.no/latest/god-praksis/slik-skriver-vi-for-nett/)
i Punkt og Oslo kommunes språkprofil.
Rådene under er med egne ord.

- Korte setninger som bærer én mening. Overskrifter sier hva siden gjelder.
- Ord brukeren kjenner. Kodenavn og interne fagbegreper, som «respons», vises ikke.
- En feilmelding eller sperre sier hva som hindrer, og hva brukeren kan gjøre nå.
- Bestemmelsene i NS 8407 forklares med egne ord. De gjengis ikke ordrett i visningen.
- Lenketekster sier hvor lenken fører. «Les mer» står ikke alene.
- Klarspråk gjelder hvordan det sies, ikke hva. Domenebegrepene (TE, BH, EO, KOE, varsel,
  forsering), paragrafhenvisninger som «§ 33.8» og vedtatt ordlyd står som de er. I brevene
  skrives partene fullt ut (se «Ordene i brevene og skjemaene»). Presisjonskravet
  i [`AGENTS.md`](../AGENTS.md) går foran. En vedtatt ordlyd endres bare gjennom
  [vedtaksregisteret](vedtaksregister/README.md).

## Hva løsningen kalles

Regelen står i [`AGENTS.md`](../AGENTS.md), «Språk». Her står begrunnelsen og
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
[vedtaksregisteret](vedtaksregister/README.md), og merknaden «Appen vurderer ikke
innholdet» (OV-U4, OV-U19) står til et vedtak endrer den.

## Ordene i brevene og skjemaene

Ordene under gjelder brevene, skjemaene og visningen av kravene. Begrepene står i
[domenetabellen](domenetabell/README.md#begreper). Ny tekst følger reglene her. En vedtatt
brevtekst står til et vedtak endrer den. Vedtaket for brevene føres i
[#1433](https://github.com/khjohns/endringsmeldinger/issues/1433).

| Ord | Regel | Grunnlag |
| --- | --- | --- |
| Partene | Brevene skriver «byggherren» og «totalentreprenøren» fullt ut, også i «totalentreprenørens krav» og «byggherrens svar». Forkortelsene BH og TE brukes i visningen, for eksempel «Du er byggherre (BH)», men ikke i teksten i et brev. | Oppdragsgiver 30.10 og 31.10 (#1433) |
| Godkjenner og godtar | Byggherren «godkjenner», «avslår» og «gjør gjeldende». Totalentreprenøren «godtar» byggherrens svar. Skjemaet for byggherren spør «Hvor mye godkjenner du?», ikke «godtar du?». | [LV-U4](plans/vedtak.md#lv-u4) punkt 5, [HF-U2](plans/vedtak.md#hf-u2), [KA-U1](plans/vedtak.md#ka-u1) |
| Vederlagsjustering | Posten i vederlagskravet etter § 34.1.1 eller § 34.1.2 heter «vederlagsjustering», med hjemmelen der det trengs for å skille den fra den særskilte. Ikke «hovedkrav» eller «justeringen ellers». | Kontrakten § 34.1, oppdragsgiver 30.10 (#1433). «Justeringen ellers» i [OV-U28](plans/vedtak.md#ov-u28) står til vedtaket i #1433 |
| Særskilt vederlagsjustering | Kravet etter § 34.1.3 annet ledd heter «særskilt vederlagsjustering». Kontrakten skiller postene med ordet «særskilt». | Kontrakten § 34.1.3, oppdragsgiver 30.10 (#1433) |
| Kravet, ikke sporet | «Spor» er et ord i koden og vedtakene. Visningen og brevene sier hva kravet gjelder: «vederlagsjusteringen», «kravet om fristforlengelse», «grunnlaget for kravet». | Oppdragsgiver 31.10 |
