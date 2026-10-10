---
paths:
  - "backend/tests/**"
  - "src/**/__tests__/**"
  - "src/**/*.test.ts"
  - "kjerne/**"
  - "sprakprove/**"
  - "docs/domenetabell/**"
  - "docs/vedlegg/**"
---

# Tester

## Velg tester etter risiko og observerbar atferd

Test et konkret krav eller en feilklasse, ikke hver funksjon bare fordi den
finnes. Bruk det laveste laget som beviser forventningen, og suppler med tester
gjennom grensene der feil kan oppstå. Samme domenetabell kan gjenbrukes i flere
innganger uten at alle kombinasjoner må gjentas i nettleseren.

- **Domene:** test vedtatte beslutninger, lovlige/ulovlige overganger og viktige
  kombinasjoner av krav, svar, aksept og grunnlag. Ta med beløpsavrunding,
  datogrenser, manglende verdier og null. Bruk parametrisering og avgrensede
  egenskapstester for invariantene.
- **Tilgang og kontrakter:** test avvisning ved feil prosjekt, team, rolle eller
  identitet, samt en legitim kontrollsak. Prøv serverstemplede felt,
  JSON-validering og relevante HTTP-/batch-/godkjenningsinnganger uten å mocke
  bort den kontrollen testen skal bevise.
- **Lagring og levering:** test faktisk serialisering/gjenlesing, migrasjoner,
  historikk, transaksjonsavbrudd, samtidighet, idempotens og retry der de berøres.
  Databasegarantier prøves mot den virkelige databasemotoren i en kastbar testbase.
  Eksterne feil som timeout og usikkert utfall prøves kontrollert; levende
  integrasjonstester er separate og beviser bare det de faktisk prøver.
- **Brukergrensesnitt:** test brukerens handling og resultat: nyttelast, feil,
  venting, konflikt og bekreftet lagring. Behold et lite sett komplette kritiske
  flyter gjennom frontend og backend; en UI-test med mocket API beviser ikke
  serverkontroll eller lagring. Bibliotekets interne oppførsel testes ikke på nytt.
- **Feilrettinger:** legg normalt til eller behold en regresjonstest som viser
  den konkrete feilen og riktig atferd. Bevar sikkerhets- og domenebevis ved
  refaktorering; tester av fjernet implementasjon kan erstattes av tester av
  den nye løsningen mot samme forventning.

Egne tester kan normalt droppes for rene getters/setters, direkte videresending,
trivielle konstanter, statisk layout og implementasjonsdetaljer som antall interne
funksjonskall. Unntaket er når selv en kort linje bærer en kontrakt, avrunding,
tilgangsgrense eller annen viktig regel. Unngå store snapshots som bare kopierer
dagens HTML; konkrete assertions skal vise hva som må være riktig.

Dekningsprosent brukes til å finne uprøvde områder, ikke som bevis på korrekthet.
Ingen generell prosentgrense eller test per fil kreves. Vurder særlig udekkede
grener i kritisk kode; begrunn relevante utelatelser i PR-en. Ikke slett tester
bare for å redusere antall, og ikke fjern kjente feilreproduksjoner som «trivielle».

Bruk eksisterende verktøy: pytest for Python og Vitest for TypeScript, også for
TS-kjernen (B-14). Komponenttester bruker Testing Library; komplette
nettleserflyter bruker Playwright etter repoets miljø- og skillregler. Typesjekk
og bygg kommer i tillegg: de erstatter ikke tester av kjøretidsatferd. Ikke
innfør nytt testverktøy eller installer nettlesere uten et konkret behov.

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

## Vis at kritiske tester oppdager feil

Når endringen gir en endret tilgangsavgjørelse, statusovergang, beregningsregel,
serialisering eller transaksjonsgaranti (utløseren står i
[leveranseskillen](../skills/leveranse/SKILL.md#når-en-endring-regnes-som-vesentlig)):
velg et avgrenset sett representative feilklasser ut fra forventningen. Prøv
målrettede feilinnføringer eller mutasjonstesting mot de relevante testene.
Ingen generell mutasjonsscore eller nytt verktøy kreves for alle endringer.

- Vis først at det korrekte kontrolltilfellet passerer. Innfør én relevant feil
  om gangen og kontroller at testen feiler på den forventede virkningen, ikke
  på import, oppsett eller en uvedkommende forutsetning.
- For kjente feil med `xfail`/`it.fails`: behold reproduksjonen og kontrollsaken.
  Ikke krev en grønn korrekthetsbaseline før rettingen finnes. Vis at selve
  målassertionen feiler; etter retting kjøres testen ordinært og prøves mot en
  relevant feilinnføring. Reglene om `pytest.fail` for forutsetninger gjelder.
- En overlevende mutasjon undersøkes: manglende dekning, tilsvarende atferd,
  unåbar kode eller ugyldig mutasjon må begrunnes. En verktøyrapport alene
  avgjør ikke dette. Udekket forventet atferd rettes eller spores som restanse,
  uten å erklære det berørte akseptkriteriet oppfylt.
- Innfør feilen midlertidig i en isolert arbeidskopi av koden som testes, aldri
  mot levende data. Testens forventning beholdes. Mutert produksjonskode skal
  ikke committes eller pushes. Fjern mutasjonen og kjør testene igjen.
  PR-en oppgir kontrollert commit/diff, feilklasse, test, observert feil og
  eventuelle overlevende mutasjoner med begrunnelse. Gjenbruk samme feilklasser
  når to implementasjoner sammenliknes. En ny feilklasse for språkprøven eller
  kjernen legges i `sprakprove/feilinnforing.py` eller
  `kjerne/tester/feilinnfoering.ts`, så den kan kjøres igjen.
- En oppdaget feilinnføring viser at testen er følsom for feilen, ikke at
  forventningen er riktig. Forventningens grunnlag kontrolleres etter
  [domeneforventningene](#domeneforventninger-og-metodeprover) nedenfor.

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
