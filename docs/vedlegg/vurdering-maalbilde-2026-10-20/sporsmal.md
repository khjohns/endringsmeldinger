# Spørsmål og svar etter vurderingen av målbildet 20.10

Spørsmålene ble stilt med spørsmålsverktøyet i økta 20.10, etter
[vurderingen](../../vurdering-maalbilde-og-ts-overgang-2026-10-20.md). Fila er
skrevet etter kallet, ordrett fra kallet og svaret. Alternativene er ikke prøvd
mot vedtakene i 3.1 før spørsmålene ble stilt.

## 1. Prioritet

**Spørsmål:** Hva skal neste runde prioritere?

- **Skive i Azure (Recommended):** Ta B-12 hosting, lag ett bilde med SPA og TS-server bak én vert, og kjør én KOE-sak fra innlogging til levert brev i et testprosjekt i Catenda. Plattformfeil oppdages før mer domene bygges.
- **Fortsett funksjonssporet:** Neste i #764: S-2a.3b2b (#493), S-1c del 4 (godkjennerruta) og S-2a.3c–3g. Mer bredde i domenet, men fortsatt ingen produksjonsvei.
- **Python ut først:** #375 og #49: sakslisten, prosjektene og EO-rutene flyttes til TS før noe annet. Løser skjøten i innloggingen, men ikke hostingen.

**Svar (fritekst, ordrett):** «Jeg har ikke admin tilgang til Azure så må koordinere disse tilgangene med IKT. Det tar tid. Men ville tro ende til ende kan testes ganske godt lokalt også ? I utgangspunktet tenker jeg da python ut først. Og at hovedplan bør justeres: forsering bør ikke være komplett før app er i prod.»

## 2. Innlogging

**Spørsmål:** Innloggingen går til TS og sesjonen lagres i SQL Server, mens Python-rutene leser sesjonen i PostgreSQL. Hvordan skal overgangen gjøres?

- **TS overtar alt (Recommended):** TS overtar alt frontenden kaller, med sakslisten, prosjektene og lesingen av saken først. Python går ut av forespørselsveien og beholder bare leveringen til den flyttes. Ingen bro bygges.
- **Midlertidig bro:** Python godtar TS-sesjonen, for eksempel ved å spørre TS-serveren. Python-stien kan da brukes med ekte innlogging en stund, men broen er kode som skal kastes.
- **Python eier innloggingen:** Innloggingen sendes tilbake til Python til #310 er levert. Det reverserer deler av F0b og B-19.

**Svar:** «TS overtar alt (Recommended)»

## 3. B-17

**Spørsmål:** B-17 sier at skrivestien aktiveres samlet for KOE, EO og forsering. EO og forsering er ikke påbegynt i kjernen og venter på B-01. Skal det vurderes på nytt?

- **KOE først (Recommended):** KOE settes i produksjon først. EO og forsering kommer etterpå, og Python-EO står bak en lukket bryter til da. Krever et nytt vedtak som presiserer B-17.
- **Behold samlet:** Alle tre sakstypene aktiveres samtidig, slik B-17 sier. Første ekte sak venter på byggedel 4 av #309 og B-01.
- **Avgjør senere:** Spørsmålet tas når den gjennomgående skiven er levert.

**Svar:** «KOE først (Recommended)»

## 4. Styring (flere svar mulig)

**Spørsmål:** Hvordan skal styringen holdes lesbar? Flere svar er mulig.

- **Del hovedplanen (Recommended):** Flytt 3.1 til en generert fil ved siden av planen, og flytt de historiske funnene og merknadene til et arkiv. Planen beholder målarkitekturen, invariantene, arbeidspakkene og de åpne beslutningene. Autoriteten flyttes uttrykkelig.
- **Vedtak ved behov:** Nye domenevedtak stilles bare når et issue i den kritiske stien trenger dem. Byggestatusen i registeret genereres av koden og lukkede issues, ikke for hånd.
- **Milepæl for første sak:** Én milepæl, «Første ekte sak», samler den kritiske stien og F5-punktene som issues med en ansvarlig rolle. B-05, B-09 og B-11 får en eier.
- **Rydd review-etterslepet:** Gå gjennom de 40 review-oppfølgingsissuene etter stoppregelen 20.10. Kjør feilinnføringene om natten og ved regelendring, ikke på hver PR som rører kjernen.

**Svar:** «Del hovedplanen (Recommended), Vedtak ved behov, Milepæl for første sak»

## Oppfølgingsspørsmål

Stilt fordi svaret på spørsmål 1 var fritekst og ikke passet på ett alternativ,
og fordi svaret på spørsmål 3 lot EO stå åpent. Fila er skrevet etter kallet,
ordrett fra kallet og svaret.

### 5. EO i første versjon

**Spørsmål:** Du valgte «KOE først» og skrev at forsering ikke bør være komplett før appen er i produksjon. Når Python går ut av forespørselsveien, finnes EO bare der kjernen har bygget den, og kjernen har ingen EO-kommando i dag. Skal endringsordren (§ 31.3) være med i første versjon i produksjon?

- **EO med, forsering etter (Recommended):** Første versjon har KOE og endringsordre. Forsering (§ 33.8) kommer etter at appen er i produksjon. EO må bygges i kjernen, og B-01 (relasjonene) må tas før første versjon. Presiserer B-17.
- **Bare KOE i v1:** Første versjon har bare KOE. Endringsordre og forsering kommer etter at appen er i produksjon. Korteste vei, men byggherren kan ikke utstede en endringsordre i appen før senere. Presiserer B-17.
- **Forsering delvis i v1:** EO er med, og forsering er med uten alle virkningene (ikke komplett). Hva som er med, avgjøres i et eget spørsmål. Presiserer B-17.

**Svar:** «EO med, forsering etter (Recommended)»

### 6. Azure

**Spørsmål:** Ende til ende kan prøves ganske godt lokalt: SQL Server i Docker med innstillingene fra Azure SQL, innlogging mot Catenda, og levering til et testprosjekt i Catenda. Det lokale miljøet kan også bruke én vert for SPA og TS-server, slik produksjonen skal. Fire ting kan bare prøves i Azure: managed identity mot basen, serverløs pause i Azure SQL, en jobbløkke på en instans som skalerer, og hvitelisten for utgående trafikk (#1008). Skal tilgangene bestilles hos IKT nå?

- **Bestill nå, parallelt (Recommended):** Tilgangene og B-12 hosting tas med IKT nå, mens Python går ut. Ledetiden hos IKT går da parallelt med koden. Den lokale prøven ende til ende er akseptkriteriet for «Python ut først».
- **Vent til Python er ute:** Tilgangene bestilles når den lokale prøven ende til ende er grønn. Mindre å koordinere nå, men ledetiden hos IKT legges til etterpå.

**Svar:** «Bestill nå, parallelt (Recommended)»

### 7. Føre svarene

**Spørsmål:** Skal jeg føre svarene nå? Vedtaksskillen sier at svar føres i én liten vedtaks-PR, med spørsmålene og svarene ordrett. Det gjelder KOE først og EO, som presiserer B-17. Prioriteringen «Python ut først» og «TS overtar alt» er arbeidsvalg, som føres som en merknad om rekkefølgen og i #375.

- **Alt nå (Recommended):** Jeg lager vedtaks-PR-en og milepælen «Første ekte sak» med de issuene som finnes. Jeg lager også tre nye issues: delingen av hovedplanen, byggestatusen som genereres, og F5-punktene. Ingen produksjonskode.
- **Bare vedtaks-PR:** Jeg lager bare vedtaks-PR-en. Milepælen og issuene lages av neste orkestrator.
- **Neste orkestrator:** Jeg gjør ikke mer nå. Spørsmålene og svarene står i PR #1018, og neste orkestrator fører dem.

**Svar:** «Alt nå (Recommended)»

## Feil premiss i spørsmål 3 og 5

Spørsmål 3 og 5 bygde på at B-17 gjør endringsordre og forsering til en
forutsetning for den første KOE-saken. Det er feil:
[OV-U1](../../plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u1) (10.10)
avgrenser første versjon av TS-stien til KOE-saken, og endringsordre som egen sak
og forsering avvises til de er bygget, etter #310. Alternativene ble ikke prøvd
mot vedtakene før spørsmålene ble stilt. Svarene på spørsmål 3 og 5 føres derfor
ikke som vedtak. Spørsmålet om hva som må være bygget før appen tas i bruk med
ekte saker, stilles på nytt etter prøving mot vedtakene.

## 8. Endringsordre før ekte saker (stilt på nytt)

Prøvd mot vedtakene i 3.1 av en subagent før spørsmålet ble stilt. Prøvingen fant
at et alternativ med endringsordre som egen sak før ekte saker endrer OV-U1, og at
OV-U2, OV-U7, OV-U14, merknaden 10.10 til B-01 og vedtaket 17.09 om
produksjonsporten må nevnes. Lagret før kallet.

**Spørsmål:** Rettelse: spørsmålene om B-17 og EO bygde på et feil premiss. OV-U1 (10.10) avgjorde allerede at første versjon av TS-stien, den som skriver den første reelle hendelsen (#310), dekker KOE-saken. Forsering (§ 33.8), endringsordre som egen sak og justering av enhetspriser avvises til de er bygget, etter #310, og OV-U2 sier at de føres utenfor appen til da. OV-U1 forkastet uttrykkelig «endringsordre som egen sak i første versjon, som ville krevd at B-01 ble avgjort nå». Ditt svar «EO med, forsering etter» betyr derfor å endre OV-U1. Skal OV-U1 endres?

- **Behold OV-U1 (Recommended):** Appen kan tidligst brukes i ekte saker når første versjon etter OV-U1, OV-U7 og OV-U14 er bygget og produksjonsporten (F5) er passert. Endringsordre som egen sak og forsering føres utenfor appen til de er bygget (OV-U2). Presiserer OV-U1.
- **Endre: EO før ekte saker:** Før appen brukes i ekte saker, skal også endringsordre som egen sak (EO-U1–EO-U9) være bygget i TS. Forsering bygges etter at appen er tatt i bruk. B-01 må da avgjøres før #310. Endrer OV-U1, som forkastet dette alternativet, og merknaden 10.10 til B-01.

**Svar:** «Behold OV-U1 (Recommended)»

Svaret følger av OV-U1 og vedtaket 17.09 om produksjonsporten, og føres derfor ikke som eget vedtak (vedtaksskillen, «Prinsipp før enkeltvedtak»).
