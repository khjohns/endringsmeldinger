# Varden: designkonsept for et konkurrerende verktøy etter NS 8407

Designkonseptet for et tenkt konkurrerende produkt, laget 27.10.2026 med
utgangspunkt i skjermbildene i [PR 1327](https://github.com/khjohns/endringsmeldinger/pull/1327).
Det er ikke gjeldende design for appen. Beslutningene for visningen står i
[designsystemet](../system.md).

Fila er eneste hjem for teksten i konseptet. Skissene står i [`skjermer/`](skjermer/),
én HTML-fil per skjerm med felles [`stil.css`](skjermer/stil.css), og bildene i
[`bilder/`](bilder/) er laget fra dem med [`lag-bilder.mjs`](lag-bilder.mjs), som kjøres
fra repoets rot med `node docs/design/konsept-varden/lag-bilder.mjs`. Skriftene lastes fra
nettet, så kjøringen trenger nettilgang. Hva som er endret mellom rundene, og
hvorfor, står i [endringsloggen](endringslogg.md). Vurderingen av versjon 3 etter grensesnitt-skillen står i
[review-grensesnitt-2026-10-27.md](review-grensesnitt-2026-10-27.md).

## Sammendrag

Vi bygger **Varden** (arbeidsnavn): et verktøy for endringssaker etter NS 8407 som registrerer datoer og brev og viser dem som fakta. Løsningen vurderer aldri selv. Den sier ikke hvem som skal handle, foreslår ingen handlinger og avgjør ikke om en frist er holdt. Det gjør partene.

Navnet er valgt fordi en varde viser vei uten å bestemme veivalget. Det er mindre styrende enn arbeidsnavnet «Fristlinje» i versjon 0–2.

Fire grep skiller oss fra konkurrenten:

- **Datoene i saken, med kilde.** Hvert spor viser de registrerte datoene på én linje over arbeidet, med brevet hver dato kommer fra. Alle datoene står i Hendelser. Konkurrenten viser ingen datoer der svaret skrives.
- **Hovedlinjene ved siden av valget.** Et panel ved siden av skjemaet viser per post hva som er krevd og hva standpunktet er. Konkurrenten viser resultatet først nederst.
- **Hele brevet, aldri et utdrag.** Et mottatt brev vises i sin helhet, slik det ble sendt. Hos konkurrenten står svarbrevet i fanen «Historikk».
- **Dokumenter og hendelser samlet.** Alle brev, vedlegg og registrerte dokumenter står under Dokumenter, og alt som har skjedd i saken, står under Hendelser.

Vi beholder det konkurrenten gjør godt: hjemmel ved hvert valg, brevkontroll før sending og et tydelig skille mellom prinsipalt og subsidiært standpunkt. Versjon 2 tok inn punkter fra Varde-konseptet og fra konkurrenten. Versjon 3 gir arbeidet mer plass og legger til Dokumenter, Hendelser og et ark med varianter. Skissene står under «Nøkkelskjermer».

## Hva vi ser i konkurrentens skjermbilder

Konkurrenten er sterk på hjemmel og presisjon, men svak på tid, rekkefølge og lesbarhet. Grunnlaget er de åtte skjermbildene fra den ekte saksruta i [PR 1327](https://github.com/khjohns/endringsmeldinger/pull/1327) (BHs svar på vederlagskrav i bilde 1–3, TEs handlinger i bilde 4a–4c).

| Observasjon | Bilde | Vurdering | Vårt svar |
| --- | --- | --- | --- |
| Hver boks har hjemmelen øverst til høyre («§ 34.1.2»), og bestemmelsene står i et eget panel | 1–4 | Styrke | Behold hjemmelen ved valget, men som brikke som åpner teksten. Panelet tar 27 % av bredden hele tiden |
| Resultatboksen skiller prinsipalt og subsidiært i lag, i brevets rekkefølge | 1, 2 | Styrke | Behold innholdet, og vis det i et panel som følger valgene |
| Resultatet står nederst, etter fire valgbokser | 1–3 | Svakhet | Hovedlinjene står ved siden av skjemaet og er alltid synlige |
| Konklusjonen er én lang setning i gult («prinsipalt begrenset etter § 34.1.3 til 10 000 kr, subsidiært …») | 2 | Svakhet | En tabell med krevd, prinsipalt og subsidiært per post |
| Ingen datoer vises, selv når valget gjelder «Nei, for sent» | 1, 2 | Svakhet | Datoene med kilde på én linje over arbeidet, ved spørsmålet og i Hendelser, uten vurdering |
| Statusen sier hvem som skal svare («Kravet venter på byggherrens svar») og bruker tett sjargong («Enige, betinget · Subsidiært standpunkt») | 1, 4c | Svakhet | Ingen status. Fanen viser antall brev og siste brev («2 brev · siste 20. okt fra TE») |
| TE får fire knapper med ulik vekt: «Send ny versjon av kravet» er fremhevet og «Trekk» er rød | 4a | Svakhet. Fremhevingen leses som en anbefaling | Én knapp, «Skriv brev i sporet», med brevtypene i fast rekkefølge og ingen fremhevet |
| TE må åpne «Historikk» for å lese svarbrevet | 4a, 4c | Svakhet | Siste brev fra motparten står i sin helhet i saken |
| Brødsmulene og tittelen viser UUID («c42d5651-a0e5-…») og «Prosjekt p-saksrute-508e9fac» | alle | Svakhet | Lesbare saksnumre («E-021») og prosjektnavn. ID-en ligger bak «Kopier lenke» |
| Beløp står i tre former: «125 000,-», «125 000 kr» og «Krevd: 125 000 kr» i monospace | 1–4 | Svakhet | Én form, «125 000 kr», med tabulartall i vanlig skrift |
| Samme post har ulike valg: «Fullt beløp / Redusert beløp / Null» og «Godkjent / Delvis godkjent / Avslått» | 1, 2 | Svakhet | Én valgform per post, også for det subsidiære standpunktet |
| «Nei, for sent» er rødt, «Ja, i tide» er grått | 1, 2 | Svakhet | Valgene er nøytrale. Ingen farge på et standpunkt |
| Teksten om binding («Byggherren er bundet av svaret som sendes herfra») står i liten skrift under tabellen | 1–3 | Svakhet | Bindingen står over knappen og i sendepanelet |
| Brevkontrollen krever avkrysning før sending, og brevet kan ikke endres | 4b | Styrke | Behold at brevet ikke kan endres, men vis det som et ekte brev med brevhode, mottaker og brevnummer |
| Sendeknappen står i en flytende linje midt på siden, med tomrom under | 1 | Svakhet | Fast knapp nederst i panelet med hovedlinjene |

Konkurrenten forklarer godt *hva* hver bestemmelse sier. Den viser dårlig *hvilke datoer og brev* saken bygger på, der valget tas, og den antyder hvem som skal handle. Det er gapet vi fyller.

## Hva vi tar med fra Varde og konkurrenten

Versjon 2 og 3 tar inn 18 punkter: 12 fra Varde-konseptet og 6 fra konkurrenten som ikke allerede var med. Ingen av dem bryter prinsippet om at løsningen registrerer og viser, men ikke vurderer.

| Punkt | Kilde | Hvor i konseptet |
| --- | --- | --- |
| Faste valgord for beløp: «Hele beløpet», «Deler av beløpet», «Ingenting». Er standpunktet subsidiært, endres spørsmålet, ikke valgordene. Ingenting er forhåndsvalgt | Varde | Skjerm B |
| Alternative beløp summeres ikke, og beløp summeres ikke på tvers av saker | Varde | Skjerm A, B, C og D |
| En tilstand gjelder ett objekt og har kilde, for eksempel «Beløpet: avtalt i brev 6» | Varde | Skjerm E |
| Intern godkjenning og ekstern sending er ulike knapper. «Sendt» og «Mottatt» er ulike opplysninger, og et utkast kan ikke sendes to ganger | Varde | Skjerm C og E |
| Sendingen stoppes hvis det utkastet bygger på, endres mens brevet er åpent | Varde | Skjerm E |
| Dokumenter sendt utenfor løsningen registreres med avsender og dato. Datoen da de legges til, erstatter ikke datoen i dokumentet | Varde | Skjerm F og G |
| Egne flater for dokumenter og hendelser i saken | Varde | Skjerm F og G |
| Korrigering bevarer den opprinnelige teksten og viser hvem som oppgir noe annet | Varde | Skjerm D og G |
| Vilkår får egen identitet og er synlige gjennom hele forløpet | Varde | «Vanskelige situasjoner» |
| «Uenige» er et gyldig resultat. Det løsningen ikke støtter, sies før utfyllingen | Varde | Skjerm E |
| Brevet er en lesespalte som tåler tekstforstørrelse. A4 hører til PDF-en | Varde | Skjerm C |
| Prøveplanen med én vanskelig sak, to roller og kriterier for godkjenning | Varde | «Prøveplan» |
| Panelet viser hovedlinjene i brevets rekkefølge og med brevets etiketter. Skjemaet viser vurderingen, og brevet viser alt | Konkurrenten | Skjerm B |
| En rad uten beløp viser «—», aldri 0 kr. Øre vises med to desimaler | Konkurrenten | Skjerm A og C |
| De vedtatte tekstene om binding (1a–1c) vises bare når vilkåret er oppfylt, og hver tekst har ett sted | Konkurrenten | Skjerm B og C |
| Kjernen avgjør hvilke brevtyper som er mulige, og regner ut alle tall. Klienten sender ingen resultater | Konkurrenten | Skjerm D, «Tillit» |
| Aksepten gjelder ett bestemt brev og én versjon | Konkurrenten | Skjerm D |
| Avkrysning før sending, «Utkast · ikke sendt» og hjemmel som dempet linje ved hver rad | Konkurrenten | Skjerm B, C og D |

Vi tar ikke med Vardes arbeidsliste med «Til vurdering» og «Avventer andre», Vardes beregning av frister eller konkurrentens statusetiketter. Alle tre sier hvem som skal handle.

## Prinsipper for vår løsning

Åtte prinsipper styrer hvert skjermbilde. Det første går foran de andre.

1. **Registrer, vis, vurder aldri.** Løsningen registrerer datoer, brev og standpunkter og viser dem som fakta. Den sier ikke hvem som skal handle, foreslår ingen handlinger og avgjør ikke om en frist er holdt. Det overlater kontrakten til partene.
2. **Hver dato og hver tilstand har en kilde.** En dato vises med brevet den kommer fra og parten som oppga den («Oppgitt av TE i brev 1»). En tilstand gjelder ett objekt, for eksempel beløpet eller grunnlaget, og viser brevet den bygger på.
3. **Skjemaet vurderer, panelet viser hovedlinjene, og brevet viser alt.** Panelet viser per post hva som er krevd og hva standpunktet er, i brevets rekkefølge. Alternative beløp står som alternativer og summeres ikke. Der brevet vises, vises ingen oppsummering av det, fordi en oppsummering kan avvike fra brevet.
4. **Riktig tekst på riktig sted, til riktig tid.** Hver forklaring står én gang, der beslutningen den gjelder tas. Den vises bare når vilkåret for den er oppfylt.
5. **Brevet er et brev.** Det partene sender, har brevhode, mottaker, brevnummer, dato og avsender. På skjermen er det en lesespalte som tåler forstørrelse, og i PDF-en er det A4. Et mottatt brev vises i sin helhet, slik det ble sendt, også det løsningen ikke kan uttrykke som valg.
6. **Ett ord, én betydning, én form.** Samme valgord for samme post, ett beløpsformat med øre når det finnes øre, og ett navn per sak. Det som kan gjøres, står i fast rekkefølge, og ingenting er fremhevet.
7. **Farge viser systemets tilstand, ikke en vurdering.** Amber er utkast eller stoppet sending, blågrønn er sendt og levert, og rød er feil. Ingen standpunkt, dato eller sak får farge etter hva den betyr for partene.
8. **Arbeidet får plassen.** Bredden er knappest. Hovedkolonnen har det brukeren gjør nå, skjemaet eller brevet. Det som støtter arbeidet, står i høyre kolonne eller på én linje over.

## Informasjonsarkitektur og navigasjon

Startsiden er **Saker**: alle sakene i prosjektene dine, sortert etter siste brev. Filtrene er fakta, som «Siste brev fra TE» og «Utkast i teamet», aldri «venter på deg». Konkurrenten starter i prosjektet og lar brukeren lete seg ned til sporet.

```mermaid
flowchart TD
  saker["Saker<br>startsiden, sortert etter siste brev"] --> sak
  prosjekter["Prosjekter<br>med krevde beløp og dager"] --> sak
  arkiv["Arkiv<br>sendte brev, PDF-er og kvitteringer"] --> sak
  sak["Sak E-021 · Ny peling med produktivitetstap<br>kompakt overskrift, datoene på én linje"] --> grunnlag["Grunnlag"]
  sak --> vederlag["Vederlag"]
  sak --> frist["Frist"]
  sak --> dokumenter["Dokumenter<br>alle brev, vedlegg og registrerte dokumenter"]
  sak --> hendelser["Hendelser<br>alt som har skjedd, og alle datoene"]
  grunnlag --> arbeid["Arbeidet i sporet<br>utkastet eller det mottatte brevet i hovedkolonnen"]
  vederlag --> arbeid
  frist --> arbeid
```

Navigasjonen ligger i en lys toppmeny med tre innganger. Kundens logo og navn står først, produktnavnet etter. Innlogget bruker står til høyre med navn, kontraktsside (BH eller TE) og team. Inne i saken står fanene under saksoverskriften i tre grupper med en skillelinje mellom: Oversikt, så sporene Grunnlag, Vederlag og Frist, så Dokumenter, Hendelser og Notater for teamet. I et spor står «Skriv brev i sporet» til høyre i fanefeltet, med brevtypene kjernen gir. I de andre fanene heter knappen «Skriv brev», og sporet velges i neste steg. Brødsmulene bruker saksnummer og prosjektnavn, aldri en ID.

## Nøkkelskjermer og flyter

Åtte skjermer og et ark med varianter bærer konseptet, vist som hele visninger i 1440 px. Skissene er statiske og viser visning og UX, ikke en prototype. Kundens logo står som plassholder. Tallene er de samme som i konkurrentens bilde 2 og 4, så de kan sammenlignes direkte.

### A. Sakene i prosjektet

![Skjerm A: sakene i prosjektet, sortert etter siste brev](bilder/a-saker.png)

![Brukermenyen åpen](bilder/a-saker-brukermeny.png)

- Kundens logo og navn står først i toppfeltet, og produktnavnet står etter skillelinjen. Det er kundens løsning, levert av oss.
- Innlogget bruker viser navn, kontraktsside og team. Menyen har team, kontraktsside, språk, profil, tilgjengelighet og «Logg ut».
- Faktarutene teller det som er registrert. Beløp og dager summeres ikke på tvers av saker, fordi krav kan overlappe og svar kan ha alternativer.
- Tabellen viser siste brev i hvert spor med dato og brevnummer. Filtrene er fakta, ikke «venter på deg». Beløp vises med øre når det finnes øre.

### B. Byggherren skriver svar på krav om vederlag

![Skjerm B: kompakt overskrift, datoene på én linje, skjemaet i hovedkolonnen og hovedlinjene til høyre](bilder/b-svar.png)

- Saksoverskriften er kompakt, og datoene står på én linje med kilde. Teksten under sier at løsningen ikke vurderer fristen. Datoene for et spørsmål står også ved spørsmålet.
- Hovedkolonnen har bare skjemaet. Brevet det svares på, står i høyre kolonne under «Svarer på», og «Les brevet ved siden av» åpner det i en leseflate. De andre brevene står i en kompakt liste.
- Beløpsvalgene heter alltid «Hele beløpet», «Deler av beløpet» og «Ingenting». Det subsidiære standpunktet er et spørsmål: «Hvis innsigelsen om sen varsling ikke fører frem, hvor mye godtar du?»
- Ingenting er forhåndsvalgt. Beregningsmetoden er ikke besvart, og panelet sier at brevet ikke kan sendes før den er det.
- Alle begrunnelser er valgfrie. Kjernen merker et felt som påkrevd når kontrakten krever det. Begrunnelsen står ved vurderingen og sier hvor den kommer i brevet, og «Begrunnelsen tolkes ikke» står ved feltet.
- Panelet viser hovedlinjene: per post krevd og standpunkt, med hjemmelen dempet under. De to beløpene for produktivitetstap står som «alternativer, ikke tillegg». Bindingen står i én linje over knappen.
- «Skriv brev i sporet» er samme komponent som i D, med brevtypene kjernen gir. Ved knappen står det at et utkast er åpent.

### C. Brevet før sending

![Skjerm C: brevet som lesespalte med sendepanel og avkrysning](bilder/c-brevkontroll.png)

- Brevet er en lesespalte i serif med brevhode, saksnummer, brevnummer og mottaker. Den tåler tekstforstørrelse, og PDF-en får A4-format.
- Sendepanelet sier «Utkast · ikke sendt» og viser fra, til, hva brevet svarer på, kopi og om intern godkjenning kreves. Det oppsummerer ikke brevet, fordi brukeren leser brevet og en oppsummering kan være feil.
- Avkrysningen «Jeg har kontrollert brevet» må gjøres før sending, og knappen forklarer hvorfor den ikke kan brukes ennå. Er grunnlaget ubesvart eller svaret i sammenfall med kravet, står tekst 1c eller 1b her, og bare her.

### D. Saken fra TE-siden etter svaret

![Skjerm D: hele brevet slik det ble sendt, og brevtypene som er mulige](bilder/d-mottatt-svar.png)

- Brevet fra BH står i sin helhet i hovedkolonnen, med samme gjengivelse som PDF-en. Det er det frosne dokumentet, ikke en ny gjengivelse av dataene, så forbehold løsningen ikke kan uttrykke som valg, kommer med.
- Hovedlinjene vises ikke her. Brevet er åpent, og en oppsummering ved siden av kunne avvike fra det.
- TEs eget brev har «Utdyp» og «Oppgi korrigert opplysning» i den kompakte lista. Den opprinnelige teksten bevares.
- Menyen under «Skriv brev i sporet» er vist åpen. Brevtypene kommer fra kjernen: bare de som er mulige nå, i fast rekkefølge og uten fremheving. «Godta svaret i brev 5» gjelder brevet slik det ble sendt.

### E. Tilstander

![Skjerm E: sendt og levert, ikke bekreftet levert, sending stoppet, bestemmelse, ikke støttet, sender, ikke lagret, tomt spor, ingen tilgang og uenige](bilder/e-tilstander.png)

- **Sendt og levert:** kvitteringen står der brevet lå, med serverens tid, mottaker og dokumentversjon.
- **Ikke bekreftet levert:** brevet sendes ikke på nytt, og utkastet er låst så det ikke kan sendes to ganger.
- **Sendingen er stoppet:** motparten sendte et nytt brev mens utkastet var åpent. Kontrollen må gjøres på nytt.
- **Bestemmelsen:** kontraktens ordlyd uendret, adskilt fra vår forklaring. Ordlyden er grå linjer i skissen; teksten i NS 8407 er ikke gjengitt.
- **Ikke støttet:** løsningen sier det før utfyllingen, og en eksport blir aldri «sendt».
- **Sender:** brevet og skjemaet står som de var til serveren svarer, og knappen kan ikke trykkes på nytt.
- **Ikke lagret:** endringene står i skjemaet, og lagringen kan prøves igjen.
- **Tomt spor:** sporet sier at det ikke har brev, i stedet for en tom liste.
- **Ingen tilgang:** saken vises ikke, heller ikke tittelen eller partene.
- **Uenige:** en tilstand for ett objekt, med kildene, uten krav om trekk eller aksept.

### F. Dokumenter

![Skjerm F: alle dokumenter i saken med kilde, datoer og versjon](bilder/f-dokumenter.png)

- Alle brev, vedlegg og dokumenter i saken, nyeste først. Vedleggene står under brevet de fulgte.
- Hver rad har datoen i dokumentet og datoen det ble sendt eller lagt til, hver for seg. Kilden sier om det er sendt i Varden eller registrert utenfor.
- «Legg til dokument sendt utenfor Varden» er en egen handling. En korrigering gir ny versjon, og den første er bevart.

### G. Hendelser

![Skjerm G: alle hendelser i saken og datoene i en loddrett liste](bilder/g-hendelser.png)

- Alt som har skjedd i saken, nyeste først og gruppert per dag: brev sendt og levert, brev registrert utenfor Varden, dokumenter lagt til og korrigeringer. En hendelse kan ikke endres eller slettes.
- Utkast og notater for teamet er ikke hendelser i saken.
- Høyre kolonne har alle datoene i en loddrett liste med kilde og kalenderdager mellom. Den tåler mange frister bedre enn en vannrett linje.
- «Registrer brev sendt utenfor Varden» står her, fordi registreringen blir en hendelse.

### H. Varianter for det vannrette

![Skjerm H: varianter for datoene, saksoverskriften og sporene](bilder/h-varianter.png)

- Tre komponenter tok mye av høyden og bredden i versjon 2: datolinja, saksoverskriften og fanene. Arket viser tre varianter av hver, med fordeler og ulemper.
- Variantene med tykk ramme er brukt i B, D, F, G og I: datoene på én linje, kompakt overskrift og faner med handlingen til høyre. Den loddrette lista er brukt i G.
- Variantene må prøves med ekte innhold før valget er endelig.

### I. Oversikt over sporene

![Skjerm I: siste krav og siste svar i grunnlag, vederlag og frist, side om side](bilder/i-oversikt.png)

- Den første fanen viser de tre sporene side om side, så de kan sees samtidig. Hvert spor har siste krav og siste svar, med brevet, avsenderen, datoen og hovedlinjene fra kjernen.
- Et spor uten svar sier «Ingen svar er sendt i sporet». Et utkast i eget team står under, merket som utkast.
- Et spor uten brev sier det, i stedet for en tom liste.
- Oversikten sier ikke hvem som skal svare, og den har ingen status.

## Vanskelige situasjoner

Disse situasjonene er ikke unntak. De må virke fra første versjon.

- **Vilkår.** Et vilkår får egen tekst, egen identitet og henvisning til brevet det står i. Det vises ved aksept og i senere oppfølging. Å opplyse at et vilkår er oppfylt, å frafalle det og å foreslå en endring er ulike handlinger.
- **Dokumenter utenfor løsningen.** De legges til med avsender, dato og beskrivelse. Datoen da de legges til, erstatter ikke datoen i dokumentet. «Legg til dokument» og «Bekreft eget tidligere standpunkt» er ulike handlinger.
- **Korrigering.** Den opprinnelige teksten bevares, og det vises hvem som nå oppgir noe annet. En korrigering behandles ikke i det skjulte som et nytt krav.
- **Endring under sending.** Endres det utkastet bygger på, stoppes sendingen, og kontrollen gjelder ikke lenger.
- **Det løsningen ikke støtter.** Brukeren får vite det før utfyllingen. Utkastet kan eksporteres som merket utkast og brevet registreres etterpå. Registreringen gir ikke et nytt standpunkt av seg selv.
- **Uavklart.** En sak kan stå med «Partene er uenige om grunnlaget». Ingen handling heter «Lukk saken» hvis den i realiteten betyr å oppgi kravet.

## Visuelt språk

Farger, skrift og komponenter tar utgangspunkt i [Punkt](https://punkt.oslo.kommune.no/), designsystemet til Oslo kommune, uten å være en kopi. Tokenene er hentet fra `@oslokommune/punkt-css` 19.16.2 og står i `:root` i [`stil.css`](skjermer/stil.css) med Punkt-navnet i kommentaren. Uttrykket er rolig og presist – et juridisk arkiv, ikke et kontrollpanel. Det skal ikke kunne forveksles med konkurrentens mørkegrønne sidemeny, varme gråflater, pilleformede knapper og beløp i monospace.

| Element | Konkurrenten | Varden |
| --- | --- | --- |
| Ramme | Mørkegrønn sidemeny til venstre, bestemmelsespanel til høyre | Lys toppmeny. Hele bredden går til saken |
| Grunnfarge | Varm lysgrå | Nøytral lysgrå bakgrunn (Punkt `neutrals-100`), hvite flater og rette hjørner |
| Primærfarge | Skoggrønn | Mørkeblå fra Punkt (`dark-blue-1000`) på tekst, primærknapp og prinsipalt standpunkt. Varmblå (`warm-blue-1000`) på lenker |
| Signalfarger | Rød på «Nei, for sent», gul konklusjon | Flater fra Punkt med mørkeblå tekst: gul = utkast eller stoppet sending, lysegrønn med mørkegrønn kant = sendt, lyserød = feil i løsningen. Ingen farge for en vurdering. Alltid med ord |
| Skrift i grensesnittet | Grotesk, monospace for beløp og paragrafer | Oslo Sans fra Punkt, tabulartall for beløp. Ingen monospace |
| Skrift i brev | Samme som grensesnittet | Source Serif 4 i en lesespalte på høyst 760 px som tåler tekstforstørrelse. A4 bare i PDF-en. Avviker fra Punkt, som bare har Oslo Sans, så brevet skilles tydelig fra skjemaet (oppdragsgiver 27.10) |
| Valg | Pilleformede segmentknapper | Rektangulære valgkort med rette hjørner og radioknapp med 2 px ramme som i Punkt, uten farge og minst 48 px høye |
| Subsidiært | Stiplet etikett «SUBSIDIÆRT» | Et spørsmål i hel setning i skjemaet. I panelet står alternativene under posten, merket «alternativer, ikke tillegg» |
| Hjemmel | Paragrafnummer i monospace, tekst i fast panel | Brikke «§ 34.1.2» med bokikon ved spørsmålet, dempet linje under radnavnet i tabellene. Klikk åpner en leseflate der kontraktens ordlyd og vår forklaring står hver for seg |
| Ikoner | Strekikoner i knapper | Strekikoner på 1,5 px, alltid med tekst. Egne ikoner for dato, brev, lås og hjemmel. Merket er en varde av fire stablede steiner |
| Bevegelse | Ikke observert | 150 ms. En linje i panelet med hovedlinjene som endres, får et kort fargeskifte. Av ved `prefers-reduced-motion` |

Tettheten har to nivåer: **Arbeid** (standard, 16 px grunnlinje) for saken og **Oversikt** (14 px, tettere rader) for porteføljen. Begge bruker et rutenett på 4 px, som avstandsskalaen i Punkt.

## Universell utforming og tillit

Kravet er WCAG 2.1 AA fra første versjon, og målet er 2.2 AA. En jurist skal kunne stole på hvert tall i grensesnittet.

**Universell utforming**

- Teksten har minst 4,5:1 kontrast mot flaten den står på: mørkeblå 10,9:1 eller mer på signalflatene, og dempet tekst (`#666666`) 4,6:1 eller mer. Ingen tilstand vises med farge alene.
- Valgkortene er ekte radioknapper i en `fieldset` med `legend` = spørsmålet. Hjemmelsbrikken er en knapp med navnet «Les § 34.1.2».
- Panelet med hovedlinjene er en `aria-live="polite"`-region som leser opp den endrede linja, ikke hele panelet.
- Datolinja har en tekstversjon som skjermleseren får først: «Forholdet oppdaget 2. oktober, oppgitt av TE i brev 1. Varsel 9. oktober, brev 2.»
- Hele svaret kan gis med tastatur: Tab mellom spørsmål, piltaster mellom valg, Ctrl+Enter åpner brevkontrollen.
- Under 1024 px legger panelet med hovedlinjene seg som en fast linje nederst som kan trekkes opp.
- Trykkflatene er minst 44 × 44 px. Visningen prøves ved 200 % zoom, med skjermleser og med lange norske navn.
- En knapp som ikke kan brukes ennå, sier hvorfor, også til skjermleseren. Feil kobles til feltet og samles ved sending.
- Autolagring meldes rolig («Lagret 10.42»), ikke ved hvert tastetrykk.

**Tillit**

- **Kvittering etter sending.** Hvert sendt brev får et nummer, et tidsstempel fra serveren og en PDF med samme innhold som skjermen. Kvitteringen sier hva avsenderen nå er bundet av.
- **Ingen skjulte utregninger.** Hvert beløp i panelet med hovedlinjene kan åpnes og viser hvilke valg og hvilket brev det kommer fra.
- **Grensen for verktøyet står på skjermen.** Der kontrakten overlater vurderingen til partene, sier vi det: «Varden viser datoene. Om varselet kom i tide, avgjør partene.»
- **Utkast er private for teamet.** Et utkast viser hvem i teamet som har skrevet i det, og blir aldri synlig for motparten før det er sendt.
- **Kjernen regner, skjermen viser.** Panelet, brevet og listen over brevtyper bygger på samme utregning i kjernen. Klienten sender ingen resultater, og hver virkning har en kilde: brev, handling, aktør og regelversjon.
- **Sendt er ikke det samme som mottatt.** Kvitteringen viser begge. Et sendt brev erstattes aldri av en ny forhåndsvisning.

## Prøveplan

Vi prøver det vanskeligste først: samme sak, to roller og et subsidiært standpunkt. TE krever 40 000 kr for produktivitetstap. BH mener varselet kom for sent, godtar 10 000 kr med begrensningen og 40 000 kr hvis innsigelsen ikke fører frem. Prototypen dekker vurderingen, begrunnelsen, brevkontrollen, det mottatte svaret og TEs brev etterpå.

Deretter prøves de samme flatene med ubesvart grunnlag, sammenfall med kravet, vilkår som berører et annet spor, og et svar som endres mens brevet er åpent.

**Spørsmål deltakeren skal kunne svare på**

1. Hva godtar du hvis innsigelsen om varsling ikke fører frem?
2. Er de to beløpene alternativer, eller skal de legges sammen?
3. Når forholdet ble oppdaget, hvem har oppgitt det, og i hvilket brev?
4. Hvilket dokument blir sendt, til hvem og når?
5. Kan du endre svaret etter at det er sendt?

**Kriterier for godkjenning (forslag).** Seks brukere, fordelt på TE og BH. Minst fem finner siste svar og riktig brev uten hjelp og forklarer begge beløpsalternativene. Ingen sender et brev ved et uhell eller tror at begrunnelsen endrer valgene. Ett slikt funn krever retting og ny prøve. Vi måler også om noen tror løsningen har vurdert en frist.

| Kan prøves i prototype nå | Må avklares før handlingen bygges |
| --- | --- |
| Siste brev i hovedflaten, datolinja med kilder og tilstander uten status | Hvilke varslingsfrister som registreres, og fra hvilken dato hver regnes |
| Faste beløpsvalg og subsidiære spørsmål | Hvilke kombinasjoner av standpunkter som er gyldige, og hvordan de registreres |
| Begrunnelse ved hver vurdering og samlet visning av brevet | Fast rekkefølge for begrunnelsene i brevet |
| Vilkår synlige før aksept og senere | Frafall, oppfyllelse og forslag om endring |
| Brevkontroll, kvittering og leveringsfeil | Når et svar binder, hva aksept omfatter og hvilke revisjoner som er tillatt |

Leveres i denne rekkefølgen: saken og det mottatte svaret, svarskjemaet og hovedlinjene, brevkontroll og levering, og til slutt vilkår, korrigeringer og de andre vanskelige situasjonene. Hver del prøves med et normalt forløp og en feil før den utvides. Som hos konkurrenten følger hver leveranse skjermbilder fra den ekte flyten og en sammenligning med det den erstatter.

## Åpne spørsmål og neste steg

Konseptet er ikke testet med brukere. Disse spørsmålene må avklares før vi bygger en prototype:

- [ ] Hvilke varslingsfrister skal datolinja registrere? Kartlegg fristene i NS 8407, hvilken dato hver regnes fra og hvilket brev som registrerer den, før linja bygges.
- [ ] Prøv datoene grundig på saker med mange frister, spor og brev: holder én linje over arbeidet, eller må den loddrette lista (H, variant b) brukes i sporet også?
- [ ] Prøv variantene i H med ekte innhold, lange norske navn og 200 % zoom før valget er endelig.
- [ ] Hvordan vises en dato partene oppgir ulikt, for eksempel når forholdet ble oppdaget? Forslag: begge datoene, hver med sin kilde, uten at løsningen velger.
- [ ] Trenger rådgivere på byggherresiden en egen rolle med lesetilgang til utkast, eller holder det med team?
- [ ] Skal brevet kunne eksporteres med partenes egen brevmal, eller bare med vår?
- [ ] Kontrastmåling og skjermlesertest av panelet med hovedlinjene og datoene
- [ ] Begrunnelse ved hver vurdering eller én samlet begrunnelse? Prøv begge mot behovet for én sammenhengende argumentasjon.
- [ ] Trengs personlige påminnelser? I så fall er de private for teamet og heter aldri «frist».
