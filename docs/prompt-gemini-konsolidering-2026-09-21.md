# Oppdrag til Gemini Flash: konsolider masterplanen for review

**Dato:** 2026-09-21 · **Utgangspunkt ved oppdragsbeskrivelsen:** `fc9b179`.
Dette er en arbeidsinstruks, ikke en audit eller ny funnstatus.

Forrige ledd: [siste handoff](handoff-2026-09-21-frister.md),
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) og
[arkitekturpresiseringene](arkitekturforinger-2026-09-21.md).

Kopier teksten under til Gemini, eller be Gemini lese og utføre denne fila.

---

Du skal gjennomføre en svært metodisk og grundig konsolidering av planverket
for dette repoet. Lever nye dokumenter som en annen agent kan gjennomgå før
noe innarbeides i gjeldende dokumentasjon. Arbeidet skal gi en etterprøvbar
oversikt over hva som er besluttet, hva som er gjennomført, hva som gjenstår,
og hvilke påstander eller designvalg som fortsatt er usikre.

Arbeid deg gjennom hele masterplanen, arbeidspakke for arbeidspakke. Prioriter
korrekthet og sporbarhet. Fortsett til hver arbeidspakke har en uttrykkelig
behandling; ved manglende tilgang skal den stå som uverifisert med konkret
begrunnelse. Ikke fyll hull med antakelser eller behandle fravær av bevis som
bevis på fravær.

## 1. Mandat og leveranser

Les `AGENTS.md` og relevante ferdigheter først. Bruk norsk bokmål.

Denne runden skal **opprette nye dokumenter**. La eksisterende dokumentasjon,
produksjonskode, migrasjonsfiler, konfigurasjon og eksisterende tester stå
urørt. Også `docs/README.md` og masterplanen skal stå urørt under denne runden.
Dokumenter forslag til rettelser med kildehenvisning og foreslått ordlyd.
Denne avgrensningen er tilsiktet: konsolideringen skal gjennomgås før den får
endre den autoritative planen. Dermed utsettes også innarbeiding av daterte
rettelsesmerknader i gamle dokumenter til etter review.

Du kan legge til avgrensede reproduksjonstester i nye testfiler når de er
nødvendige for å avgjøre en konkret usikkerhet. Kjør dem lokalt og isolert.
Ingen skriving til det eksterne Supabase-prosjektet eller Catenda, ingen
migrasjonsanvendelse/-repair, ingen opprydding av data og ingen utrulling.
Bevar andres endringer i arbeidsområdet.

Lever normalt to dokumenter, med faktisk arbeidsdato i filnavnet:

1. `docs/konsolidering-masterplan-ÅÅÅÅ-MM-DD.md`: en lesbar, samlet plan som
   reviewforslag, med status, målarkitektur, beslutninger, rekkefølge og
   akseptkriterier.
2. `docs/konsolidering-kildegrunnlag-ÅÅÅÅ-MM-DD.md`: full dekningsmatrise,
   kildebelegg, motsetninger, testresultater og verifikasjonsgrenser.

Opprett et tredje vedlegg bare dersom nødvendige testprosedyrer eller
katalogspørringer ellers gjør kildegrunnlaget uleselig. Hold bevisene
reproduserbare og fri for hemmeligheter og saksinnhold.

## 2. Fastsett utgangspunktet

Registrer `git rev-parse HEAD`, gren og `git status --short`. Les relevante
lokale endringer: dokumenter kan være nyere enn HEAD uten å være committet.
Skill kodegrunnlaget fra dokumentgrunnlaget; ikke tilskriv en lokal merknad
innholdet i HEAD. Oppgi også sluttilstanden og hvilke filer du selv opprettet.

Les i denne rekkefølgen:

1. `AGENTS.md` og `docs/README.md`.
2. `docs/handoff-2026-09-21-frister.md`.
3. `docs/plans/2026-09-16-godkjenning-og-varig-levering.md`, **hele fila**.
4. `docs/arkitekturforinger-2026-09-21.md`.
5. `docs/plans/2026-09-17-atomisk-utstedelse-og-outbox.md`.
6. `docs/design-maalskjema-database-2026-09-20.md` og
   `docs/design-durable-inbox-outbox-2026-09-17.md`.
7. `docs/gjennomforing-mg02-2026-09-21.md`,
   `docs/gjennomforing-ms05-2026-09-21.md` og
   `docs/audit-opprydding-2026-09-21.md`.
8. Øvrige auditer, gjennomføringer og arkitekturvurderinger som trengs for
   belegg og avhengigheter. Følg henvisningene til den faktiske kilden.

Lag først en inventarliste over masterplanens arbeidspakker, funn-ID-er,
beslutninger, produksjonskrav og åpne avklaringer. Kontroller senere at hver
oppføring finnes i sluttresultatets dekningsmatrise. Ingen pakke skal falle ut
fordi den ikke handler om database eller fordi nyere handoff ikke nevner den.

## 3. Behandle hver arbeidspakke likt

For hver pakke skal du:

1. Skrive målet og hvilke garantier pakken skal gi.
2. Samle funn-ID-er, aliaser/duplikater og de daterte merknadene som endrer
   betydningen. Bevar opprinnelige ID-er og koblinger.
3. Registrere dokumentert status i masterplanen og hvilken beslutning eller
   gjennomføring den bygger på.
4. Kontrollere nødvendig kode, tester, migrasjoner og eventuelt katalogen for
   påstander som avgjør status eller implementeringsrekkefølge.
5. Registrere observasjonen separat fra dokumentert status. En motstrid er et
   avvik til review; den gir deg ikke mandat til å omskrive masterplanen.
6. Oppgi avhengigheter, gjenstående arbeid, testbare akseptkriterier og
   usikkerhet. Forklar hvilke funn én felles endring kan lukke.

Bruk en matriseføring som minst dekker:

| Pakke/funn | Dokumentert status | Beslutningskilde | Implementeringsbelegg | Verifikasjon | Avvik/usikkerhet | Avhengigheter | Ferdig når |
| --- | --- | --- | --- | --- | --- | --- | --- |

Skillet mellom disse tilstandene skal framgå tydelig: **foreslått**,
**besluttet**, **implementert i repoet**, **dokumentert anvendt eksternt**,
**verifisert i denne runden**, **delvis gjennomført**, **avvist/erstattet** og
**uavklart**. Flere kan gjelde samtidig. En tidligere rapportert testkjøring
er ikke en test du selv har kjørt. En lukket designbeslutning betyr ikke at
implementeringen er ferdig.

## 4. Etterprøv med riktig metode

Les hele relevante funksjoner, dekoratører, underklasser og kallkjeder. En
klientsvakhet er ikke automatisk en serverfeil. Et navnesøk alene kan ikke
avgjøre om en tabell eller funksjon er ubrukt. Undersøk også
databasefunksjoner, triggere og øvrige kallere når det er relevant.

Ved usikkerhet skal du først formulere den konkrete hypotesen og hvilken
observasjon som vil støtte eller avkrefte den. Velg deretter minste
tilstrekkelige kontroll:

- **Kodelesing** for statisk struktur og kallkjeder.
- **Avgrenset atferdstest** for nåbarhet, validering, feilhåndtering og
  dokumentert brukerflyt.
- **Ekte lokal PostgreSQL med uavhengige forbindelser** for transaksjoner,
  låsing, samtidighet, fremmednøkler, rettigheter og RLS. Bruk faktiske
  migrasjoner og representative plattformroller. Avdekk tilgjengelig lokalt
  miljø; ikke anta at maskinspesifikke stier i eldre dokumenter finnes.
- **Skrivebeskyttede katalogspørringer** for det som faktisk kjører i Supabase:
  bare `endringsmeldinger`, ref `gwdxadexwktegkklyobv`. Ikke les
  saksdata, personrader, tokens eller annen konfidensiell korrespondanse.
  `unified-timeline` skal ikke røres.
- **Offisiell produktdokumentasjon** for eksterne tekniske garantier. Oppgi
  kilde og versjon/dato. Skill dokumentert produktstøtte fra prosjektets
  faktiske oppsett.

Mangler Supabase-tilgang, fortsett med selvstendig arbeid og merk
kjøretidspåstandene uverifisert. Migrasjonsfiler eller en testdobbel skal ikke
brukes som erstatning for observasjon av den levende katalogen.

Før tester: kontroller at de bruker lokale/isolerte ressurser. Kjør relevante
eksisterende tester som utgangspunkt, og målrett nye tester mot usikkerheten.
Logg kommando, relevant miljø/versjon, utfall og hva testen faktisk beviser.
En importfeil eller feil fixture er ikke en reproduksjon av domenefeilen.

Ikke endre eksisterende assertions, xfail-markører eller produksjonskode for
å få grønt. En eksisterende XPASS rapporteres med årsak hvis den kan avgjøres.
Nye tester av forventet, men manglende oppførsel kan bruke begrunnet xfail;
assertion må kontrollere den tilsiktede feilformen, og tilfeldig grønn/rød
samtidighet skal ikke brukes som sikker konklusjon.

En fremtidig garanti uten implementering kan spesifiseres med et
akseptkriterium, men kan ikke verifiseres ved en test av dagens løsning.
Grønn enhetstest, identisk katalog og lukket sikkerhetskrav er tre forskjellige
påstander. Sammenlikner du kataloger, bevar samme spørringer og avgrensning på
begge sider; si uttrykkelig om funksjonskropper, triggere, rolleattributter og
rettigheter inngår.

## 5. Kontroller særlig disse motsetningene og designvalgene

Dette er kontrollpunkter, ikke en fasit du skal bekrefte. Etterprøv også
begrunnelsene i `arkitekturforinger-2026-09-21.md`; rapporter dersom en
anbefaling hviler på feil faktum. Skill innvending mot en teknisk begrunnelse
fra en endring av oppdragsgivers besluttede premiss.

1. **PostgREST/RPC kontra direkte databaseforbindelse.** Masterplanen åpner
   for RPC; eldre tekst hevder outbox er umulig med PostgREST. Beskriv den
   faktiske transaksjonsgrensen og hva som fortsatt må velges.
2. **Én hendelsestabell kontra tre.** Skill historiske skjemaer fra dagens
   repo, rapportert database og framtidig transaksjonsdesign.
3. **MS-08 og relasjoner.** Vurder referanseintegritet, prosjektgrense,
   gjeldende relasjoner etter tillegg/fjerning, eksklusivitet og atomisk
   oppdatering. Sammenlikn JSON-oppslag med relasjonsprojeksjon.
4. **MS-09 og private data.** Skill prosjekt, team, kontraktsside og
   handlingsrett. Ta med DB-05/viewer, utkast, notater og godkjenningspakker.
   Beskriv tillitsgrensen for konteksten som gis til databasen.
5. **Append-only og myndighet.** Skill vern mot UPDATE/DELETE fra vern mot
   uautorisert INSERT. Vurder direkte tilgang, funksjonseier, EXECUTE,
   BYPASSRLS, TRUNCATE og kaskader ut fra den planlagte rollemodellen.
6. **MS-11 og bevis.** Skill hash, dokumentversjon, bevaring,
   tilgjengelighet, tidskilde, mottaker og leveringskvittering. Ikke utled
   arkiv- eller leveringsgarantier fra en hashkolonne.
7. **Domene og gjenoppbygging.** KR-04/MG-01, rene projeksjoner,
   hendelses-/regelversjonering, historiske teststrømmer og utrulling.
8. **CI og verifikasjon.** Skill lokale kjøringer, testdobler, ekte
   PostgreSQL-tester, faktisk CI-oppsett og påkrevde sjekker i GitHub.
9. **Levering og gjenoppretting.** Tapte svar, utløpt lease, gammel worker,
   idempotens, usikkert eksternt utfall og restore uten blind ny levering.
10. **Statusmotsetninger.** For eksempel «ingenting er implementert» ved
    siden av daterte gjennomføringer. Finn den kilden som presist avgrenser
    den gamle påstanden, uten å erklære hele dokumentet ugyldig.

Masterplanens beslutninger om journalbevaring, fravalg av kryptografisk
sletting, MG-02 og ønsket viewer-rolle står. Marker gjenstående
implementeringsarbeid og rettslige/organisatoriske verifikasjonsbehov, men ikke
gjør besluttede produktpremisser om til åpne spørsmål ved redigering.

## 6. Form på dokumentene

Begge dokumentene skal åpne med dato, commit, lokale endringer av betydning,
mandat og lenker til forrige ledd. Merk dem tydelig **reviewforslag — erstatter
ikke masterplanen**.

Planforslaget skal gi:

- Gjeldende målarkitektur og grensene mellom komponentenes ansvar.
- En samlet oversikt over beslutninger og åpne designvalg.
- Arbeidspakkene i begrunnet avhengighetsrekkefølge, med produksjonskrav og
  akseptkriterier. Skill nødvendig grunnarbeid fra uavhengig opprydding.
- Sporbar kobling tilbake til alle opprinnelige pakker og funn-ID-er.
- En kort liste over konkrete avgjørelser reviewer må ta.

Kildegrunnlaget skal gi:

- Dekningsmatrisen for hele masterplanen og liste over gjennomgåtte kilder.
- En tabell over avvik med ID `KONS-01` osv., type avvik, alvorlighet,
  kildested og foreslått håndtering. Skill dokumentasjonsavvik,
  designinnvending og reprodusert kode-/databasefeil. Begrunn alvorligheten
  med konsekvens og forutsetninger.
- Én seksjon per avvik med dokumentseksjon eller fil og symbol, presis
  påstand, belegg, motbelegg, konklusjon og eventuell foreslått ny ordlyd.
- Testkommandoer/resultater og nødvendige katalogspørringer med avgrensning.

Avslutt begge med **Verifikasjon og grenser**, delt i **Kjørt og observert**,
**Lest ut av koden**, **Dokumentert i tidligere runde** og **Ikke kontrollert**.
Skill dine anbefalinger fra tidligere beslutninger og fastslåtte fakta.

## 7. Egenkontroll før overlevering

Gå gjennom den opprinnelige inventarlista én gang til. Vis at alle pakker er
behandlet, også drift, avhengigheter, HTTP-herding, domenegjennomgang,
personvern, universell utforming og organisatoriske forutsetninger.

Kontroller lenker, ID-er, statusord og at konklusjonene ikke lover mer enn
belegget støtter. Ingen forslag skal bli «besluttet» fordi du foretrekker det;
ingen tidligere testkjøring skal bli «kjørt» i denne runden.

Avslutt med en kort overlevering: opprettede filer, viktigste avvik,
kontroller som faktisk ble kjørt, kontroller som mangler, og avgjørelser som
må tas ved review. Oppgi om eksisterende filer ble endret; mandatet er at de
skal stå urørt. Arbeidet er ferdig når gjennomgangen er sporbar og fullstendig
innenfor tilgangen du hadde, ikke når alle usikkerheter er pyntet bort.
