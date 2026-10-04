---
paths:
  - "backend/tests/**"
  - "src/**/__tests__/**"
  - "src/**/*.test.ts"
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
