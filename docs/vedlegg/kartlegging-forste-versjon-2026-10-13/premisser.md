# Premisser for kartleggingen av behovet i første versjon (13.10, commit 44bbb49)

Oppdragsgiver har sparret med to modeller om spørsmålet: er domenemodellen i TS-kjernen
(`kjerne/`) mer komplisert enn første versjon trenger, sammenliknet med det dagens skjemaer
gir brukerne? Kartleggingen skal vise **behovet** før noe kuttes.

## Oppdragsgivers svar 13.10 (premisser, ikke vedtak ennå)

1. **Appen brukes fullt ut.** Brev utenfor appen er en sikkerhetsventil. Hver side registrerer
   sine egne brev.
2. **Appen erstatter dagens skjema** og følger det som hovedregel, med rom for forbedringer.
   Bredden i dagens skjema (vederlag med flere beregningsmetoder, rigg og drift,
   produktivitet, TEs varsel om vederlag) må være med.
3. **Appen lover ikke mer enn dagens skjema.** Den viser TE og BH hvilke spørsmål og valg de
   må ta stilling til for å sende krav og svare på krav, og regner ut virkningen av partens
   egne valg (som «godkjent»/«delvis», prinsipalt/subsidiært). Den konkluderer ikke om
   rettsstillingen («BH påberoper preklusjon», aldri «kravet er prekludert»).
4. **Appen utleder ingenting av etterregistrert dokumentasjon.** Partene tar den selv i
   betraktning når de svarer gjennom skjemaet.
5. **«Ingen krav» utsettes** i første versjon. Et spor som ikke er sendt, skal (som i dagens
   Python-rollup) ikke hindre at saken blir omforent. Men «alle fremsatte krav er omforent» er
   ikke det samme som «partene har ikke flere krav i saken»; taushet tillegges ikke betydning
   som avkall.

   > **Merknad 13.10:** parentesen «som i dagens Python-rollup» er feil. I Python blir vederlag
   > og frist `UTKAST` når grunnlaget sendes, og `UTKAST` hindrer `OMFORENT`
   > (`test_not_omforent_with_utkast_tracks`). Funnet står i [virkninger.md](virkninger.md),
   > AV-02, og i [vedtak.md](vedtak.md). Premisset ble stilt på en uriktig lesning og legges
   > fram for oppdragsgiver på nytt i [vurderingen](../../vurdering-behov-forste-versjon-2026-10-13.md).
6. Force majeure blir en kategori av grunnlaget som andre: BH godkjenner eller avslår, appen
   har ingen egen logikk for vilkårene.

## Kontrollpunkter for automatiske virkninger (fra sparringen)

Steder der appens tilstand virker uten at en part har valgt, og et brev utenfor appen kan gjøre
visningen misvisende:

- **Sperrer** ved enighet og trekk: beskytter de et bestemt krav/versjon, eller hindrer de nye
  handlinger i sporet?
- **«Venter på svar» og fristveiledning**: hvilke opplysninger bygger de på?
- **Kravet brukt som varsel etter § 33.4** når ikke noe annet varsel er registrert: brukes
  kravdatoen automatisk i rettidighetsvurderingen eller brevteksten? Kan parten ta stilling til
  premisset?
- **Generert brevtekst**: skriver appen noe parten ikke uttrykkelig har valgt («du har ikke
  svart», «tidligere varsel foreligger ikke», «partene er enige»)?
- **Hvilket krav et svar gjelder**: velger appen automatisk siste kravversjon? Ser den som
  svarer/aksepterer, hvilket objekt handlingen gjelder?
- **Videreføring av tidligere svar**: følger godkjenning, metodeaksept eller rettidighet
  automatisk med til en ny kravversjon?
- **Summer og sammenstillinger**: blir «BH har godkjent» til «partene er enige»? Summeres
  subsidiære beløp som om forutsetningene var oppfylt?
- **Tilgjengelige handlinger og obligatoriske felt**: skjules en handling eller kreves et forløp
  fordi appen antar at et varsel/svar/forespørsel ikke finnes?
- **Samlebetegnelser** («omforent», «avgjort», «lukket»): hva gjør de med senere handlinger,
  brevtekst og eksport?

## Klassifisering av vedtak (fra sparringen)

For hvert domenevedtak:

- **Art** (kan være flere): `kontrakt` (ville gjelde uten appen: hva et utsagn betyr, vilkår,
  virkning), `produkt` (hva appen tillater, krever, lagrer eller viser), `tolkning` (appen
  velger mellom flere forståelser uten at parten har valgt — skal synliggjøres),
  `representasjon` (teknisk bevaring av et definert utsagn: ID, referanse, lagring, frysing).
- **Hvem tar stilling**: parten, begge partene eller appen.
- **Maskinell virkning**: tekst, beregning, status, sperre, tilgjengelig handling, avvisning,
  eller ingen.
- **Avhengigheter**: hvilke opplysninger og andre vedtak virkningen forutsetter.
- **I skjemaet i dag?** ja / delvis / nei.
- **Anbefaling for første versjon** gitt premissene: `behold`, `forenkle`, `utsett`.
- **Atferd ved utsettelse**: hva appen konkret gjør (avvis kommandoen, vis utsagnene hver for
  seg, la parten velge premisset, fjern den avhengige utledningen). «Appen avstår» betyr at
  slutningen faktisk uteblir, ikke at den skjules bak en standardverdi.

Kontroll: ingen utledning beholdes som bare er riktig når en utsatt motinnsigelse ikke finnes.
