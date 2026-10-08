---
paths:
  - "backend/tests/**"
  - "src/**/__tests__/**"
  - "src/**/*.test.ts"
  - "docs/vedlegg/**"
---

# Tester

**En omdøping kan snu det testen dokumenterer, uten at noe blir rødt.** Da
`aktor` ble `aktor_id`, fulgte verdiene med: `aktor_id="Kari Nordmann"` er
syntaktisk feilfritt og grønt, men fastslår nå at et personnavn er en gyldig
identitet — det motsatte av regelen testen ligger ved siden av. Mekanisk søk og
erstatt flytter navnet på feltet, ikke meningen i verdien. Etter en omdøping: les
assertions, ikke bare kjør dem.

**En grønn streng `xfail` beviser ikke funnet**, bare at testens assertion feiler.
Suiten inneholder mange bevisste reproduksjoner av udekkede svakheter. **Ikke «rett»
en xfail ved å endre testen** — de er dokumentasjon. Rettes den underliggende
feilen, blir testen XPASS og skal da gjøres om til en ordinær test.

**Og den kan være grønn av feil grunn.** Med `raises=AssertionError` teller
enhver `assert` i testen som forventet, også en forutsetning som har sluttet å
holde. Da reproduserer testen ingenting lenger, og ingen ser det. Forutsetninger
og uventede svar i en streng `xfail` skal feile med `pytest.fail`. Godtar testen
en avvisning som riktig utfall, må den vise at avvisningen gjelder funnet, for
eksempel med en kontrollsak som bare skiller seg i det ene feltet. Ellers blir
en avvisning av en annen grunn til XPASS. Code-review fant begge feilene i
reproduksjonene av BR-01 23.09.

**En test skrevet ut fra koden bekrefter koden, ikke hensikten.** Skal en test
vise at en funksjon virker som tiltenkt, må forventningen ha en kilde utenfor
koden: NS 8407, et vedtak i hovedplanen eller en forventning oppdragsgiver har
godkjent. Testen skal vise til kilden. En test som bare fastholder dagens
atferd, er nyttig ved en omskriving, men skal si at det er det den gjør.

<a id="domeneforventninger-og-metodeprover"></a>

## Domeneforventninger og metodeprøver

**Kildehenvisning er ikke det samme som avklart tolkning.** Knytt den konkrete
forventede virkningen til bestemmelse eller avgjørelse, presist avsnitt og de
forutsetningene kilden dekker. Skill tekstgrunnlaget fra slutningen som trekkes.
Les relevant rettspraksis ved tvil om samspillet mellom regler; en annen
modells tilslutning er ikke en uavhengig rettskilde. Uavklart tiltenkt atferd
eller tolkning tas som et konkret spørsmål til oppdragsgiver. Eksisterende
vedtak brukes uten ny godkjenning; nye vedtak føres i hovedplanen.

**Kode, testfasit og feilinnføring kan dele samme feilaktige antakelse.** En
oppdaget mutasjon beviser testens følsomhet for den valgte feilen, ikke at
forventningen er juridisk riktig. Skill avklart tolkning, arbeidshypotese,
modellkonvensjon og karakterisering av dagens atferd. En tom liste over åpne
spørsmål betyr ikke godkjenning. Når en tolkning endres, kontroller også
avhengige forventninger, kontrollsaker og mutasjoner; dokumenter hvorfor den
gamle forventningen utgår. Sammenlikning mellom to implementasjoner er heller
ikke en selvstendig fasit.

**Skill fakta, vurderinger og rettsvirkninger.** Syntetiske premisser som
«rettidig», «tilstrekkelig» og «ingen virksom innsigelse» er forutsetninger for
beregningen, ikke bevis for at produktet kan fastslå dem. Fravær i journalen
beviser ikke at en melding aldri er sendt eller mottatt. Hold manglende
opplysninger, partsuenighet og åpen rettstolkning atskilt. Partenes enighet
som prøvepremiss er ikke automatisk et produktkrav eller en domstolsavgjørelse.

**En melding er ikke nødvendigvis én rettslig handling.** Undersøk om samme
brev inneholder flere innsigelser med ulike rettsgrunnlag og virkninger.
Generalisering, også gjentatt anvendelse av en regel på seg selv, krever eget
belegg. En avklart virkning for én innsigelse godkjenner ikke alle virkninger
for hele svaret, kravet eller saken.

**Dekningspåstander må angi hva modellen utelater.** Oppgi prøvde regelgrener,
unntak, forløp og integrasjonsgrenser. Antall kombinasjoner i en avgrenset
modell beviser ikke full dekning av domenet. «Utenfor prøvens omfang» er ikke
«ulovlig etter kontrakten». JSON-rundtur i minnet er ikke bevis for lagring,
levering eller gjenoppbygging i applikasjonen.

Bakgrunnen er dokumentert i
[metodeprøvens lærdommer](../../docs/vedlegg/metodeprove-frist-2026-10-08/README.md#metodelardommer).
