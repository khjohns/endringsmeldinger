# Audit og avklaring: utkast og samarbeid

Dato: 2026-09-14. Status: krav avklart; samarbeidsfunksjonen er ikke implementert.
Ingen eksisterende lokale utkast er slettet, flyttet eller gitt en antatt eier.

## Brukerens avklaringer

1. Gamle lokale utkast uten entydig eier skal beholdes urørt, men ikke automatisk
   gjenopprettes i den nye løsningen.
2. Flere personer i samme TE- eller BH-team skal kunne redigere samme utkast i en
   sak, med samarbeid tilsvarende redigering av et Word-dokument.
3. Personlige utkast per innlogget bruker skal derfor ikke være hovedløsningen.

Avklaring 2 erstatter den tidligere foreslåtte personlige eierskapsmodellen.
Innfør ikke bruker-ID i alle lagringsnøkler og regn samarbeidsbehovet som løst.

## Bekreftet eksisterende problem

`NewCaseForm` lagrer under prosjekt-ID i localStorage. Flere saksformularer bruker
prosjekt, sak, rolle og kravversjon, men ingen bekreftet brukereier. Logout rydder
ikke lagringen. Ny bruker i samme nettleser kan derfor få et tidligere utkast uten
at appen har bekreftet hvem det tilhører eller at delingen er tilsiktet.

`src/lib/utils/__tests__/draft-owner.test.ts` reproduserer dette med to stubbet
innloggede personer og et ny-sak-utkast. Testen feilet før retting. Den er nå merket
`it.fails` som **åpent funn**, ikke som bestått sikkerhetskontroll. Reproduksjonen
viser ikke lekkasje mellom nettlesere, tilgang til serversesjoner eller en
produksjonshendelse. Tilsiktet samarbeid innen samme team er ikke et sikkerhetshull;
problemet er automatisk gjenbruk av uidentifisert lokal tekst uten tilgangskontroll.

## Krav til fellesutkast i en eksisterende sak

- Felles arbeidsdokument lagres på serveren og avgrenses av prosjekt, sak,
  kontraktsside, spor og krav-/svarrevisjon. TE og BH får separate arbeidsdokumenter.
- Brukerne autoriseres med prosjektmedlemskap og de konfigurerte Catenda-team-ID-ene.
  Lik URL, browserlagring eller teamnavn er ikke tilstrekkelig tilgangsgrunnlag.
- Flere samtidige redaktører skal kunne arbeide i samme tekst uten at hele HTML-
  eller skjema-snapshots overskriver hverandre. Tekstsamarbeid trenger en egnet
  mekanisme for fletting av samtidige endringer. Vanlig automatisk lagring av hele
  skjemaet med «siste skriving vinner» oppfyller ikke dette kravet.
- Strukturerte felt som beløp, datoer, frister og resultatvalg må også ha definert
  konflikthåndtering. Samarbeid i Tiptap alene løser ikke disse feltene.
- Vis lagrings-/tilkoblingsstatus og hvem som arbeider i utkastet. Gjenoppkobling
  må bevare endringer og unngå at gammel tekst erstatter en nyere revisjon.
- Arbeidsendringer er private innen kontraktssiden. TE får ikke innsyn i BH-utkast,
  og BH får ikke innsyn i TE-utkast før den formelle innsendingen.
- Innsending/godkjenning må fryse en bestemt revisjon. Det skal fremgå hvem som
  faktisk sendte eller godkjente. Samarbeidsrett gir ikke automatisk godkjennings-
  eller økonomisk fullmakt. Eksisterende serverkontroller skal videreføres.
- Redigering etter frosset godkjenningsgrunnlag krever ny revisjon og ved behov ny
  godkjenning. Samarbeidsoppdateringer må ikke endre tidligere brev eller beslutninger.
- Gamle eierløse localStorage-utkast skal ikke importeres automatisk til et team.
  Lokal lagring kan eventuelt brukes som avgrenset gjenopprettingsbuffer, ikke som
  felles autoritativt lager.

## Dagens tekniske avstand til kravet

- `createFormDraft` gjør lokal snapshot-lagring, uten sanntidssynkronisering.
- Tiptap har ikke installert samarbeidsutvidelse/provider i dagens pakkeoppsett.
- Eksisterende godkjenningsutkast og revisjoner har personlig saksbehandlereier.
  Dette må vurderes sammen med delte arbeidsutkast; ikke fjern eierkontroller uten
  å erstatte dem med eksplisitte regler for hvem som kan ferdigstille og sende.
- Ny sak før sak-ID finnes, og EO-utkast som omfatter flere saker, krever egen
  arbeidsdokument-identitet. Brukerens uttrykkelige krav gjelder samarbeid i en sak;
  disse inngangene må ikke få en tilfeldig utledet delingsmodell.

## Neste implementasjonstrinn

Utform felles arbeidsdokument og revisjonsgrense før migrering av formularene.
Velg synkroniseringsmekanisme og varig lagring ut fra faktisk driftsoppsett, og
verifiser tilgangskontroll for lesing, oppkobling, oppdatering og gjenoppkobling.
Supabase/RLS er fortsatt utenfor den autoriserte auditen og databasen har vært
utilgjengelig; ingen databaseendring eller ny sanntidstjeneste er gjort her.

Nødvendige akseptansetester: to brukere i samme team redigerer samtidig; motpart
avvises; teamtilgang tilbakekalles under redigering; frakobling/gjenoppkobling;
innsending mens en annen redigerer; frosset godkjenningspakke forblir uendret.
