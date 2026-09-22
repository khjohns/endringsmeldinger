# Oppdrag: sluttrediger én autoritativ hovedplan

**Dato:** 2026-09-22. **Utgangspunkt:**
`41c2a16191a5aadbe611e0958db8b93090b08027` (`main`).
Dette er en arbeidsinstruks. Den endrer ikke i seg selv planens eller funnenes status.

Forrige ledd: [review av testbevis og planstatus](review-testbevis-og-planstatus-2026-09-22.md),
[konsolidert planforslag v2](konsolidering-masterplan-2026-09-22-v2.md),
[kildegrunnlaget](konsolidering-kildegrunnlag-2026-09-22-v2.md) og
[gjeldende masterplan](plans/2026-09-16-godkjenning-og-varig-levering.md).

Les og utfør oppdraget nedenfor. Arbeid metodisk og grundig, men hold deg til
sluttredigeringen. Lever faktisk oppdaterte dokumenter, ikke bare et forslag til
hvordan noen andre kan gjøre arbeidet.

## 1. Mål og mandat

Etabler **én autoritativ, konsolidert hovedplan** som neste utvikler kan arbeide
etter uten å rekonstruere beslutninger fra hele auditkjeden. Planen skal ha
korrigert funnstatus, tydelig skille mellom vedtak og anbefalinger, gjennomførbar
rekkefølge og testbare akseptkriterier.

Behold denne filstien som den autoritative hovedplanen, og sluttrediger innholdet
på stedet:

`docs/plans/2026-09-16-godkjenning-og-varig-levering.md`

Filnavnets dato er opprettelsesdato. Før faktisk konsolideringsdato og kontrollert
commit i innledningen. Ikke opprett en konkurrerende hovedplan eller en ny v3
som bare er et reviewforslag. Den stabile filstien bevarer eksisterende innganger
fra blant annet `AGENTS.md`.

**Mandatet omfatter å ferdigstille og utpeke dokumentet som gjeldende plan.**
Det omfatter ikke å vedta åpne produktvalg, detaljdesign eller juridiske premisser.
En autoritativ plan kan og skal inneholde åpne beslutninger. Ikke gjør en
anbefaling til vedtak fordi du ferdigstiller dokumentet.

Dette oppdraget erstatter tidligere Gemini-oppdrags begrensning til bare nye
reviewdokumenter, for dokumentene som uttrykkelig er omfattet nedenfor.

### Tillatte endringer

- Sluttrediger hovedplanen og oppdater `docs/README.md` med én tydelig startlenke.
- Korriger dokumenterte ID-, status- og lenkefeil i testrevisjonen og CSV-inventaret.
  Før daterte merknader som forklarer rettelsene; bevar opprinnelig testutfall.
- Legg korte, daterte statusmerknader i tidligere konsolideringer, relevante
  reviewdokumenter og delplaner der dette trengs for å fjerne motstrid om hva
  som gjelder. Bevar historikken; ikke skriv om hele auditserien.
- Opprett ett kort dokument, `docs/sluttredigering-hovedplan-ÅÅÅÅ-MM-DD.md`, med
  deknings-/rettelsesmatrise og verifikasjon. Dette er en redaksjonsprotokoll,
  ikke en ny kilde til løpende funnstatus.

Produksjonskode, tester, migrasjoner, konfigurasjon, avhengigheter, `AGENTS.md`,
kjørelogger og andre lokale filer skal stå urørt. Ingen commit, push, deploy,
migrasjon eller eksterne skriveoperasjoner inngår i oppdraget.

## 2. Fastsett kildene før du redigerer

Les `AGENTS.md`. Registrer HEAD, gren og Git-status. Identifiser eventuelle
endringer siden oppdragets utgangspunkt; ikke overskriv andres arbeid. Bevar
tilgang til masterplanens opprinnelige innhold via Git og registrer også hash
dersom relevante kildefiler er endret lokalt. Din egen omskriving skal ikke bli
«bevis» for en beslutning du nettopp har innført.

Les følgende i håndterbare deler. Les hele hovedplanen og hele v2 med kildegrunnlag,
ikke bare sammendragene:

1. `docs/review-testbevis-og-planstatus-2026-09-22.md`.
2. Gjeldende masterplan på den stabile filstien over.
3. `docs/konsolidering-masterplan-2026-09-22-v2.md` og
   `docs/konsolidering-kildegrunnlag-2026-09-22-v2.md`.
4. `docs/arkitekturforinger-2026-09-21.md` og
   `docs/plans/2026-09-17-atomisk-utstedelse-og-outbox.md`.
5. `docs/review-gemini-konsolidering-2026-09-22.md` og
   `docs/review-gemini-konsolidering-2026-09-22-v2.md`.
6. `docs/audit-testbevis-2026-09-22.md` og
   `docs/vedlegg/testbevis-2026-09-22.csv`.
7. `docs/catenda-dataflyt.md`, særlig avsnitt 10–11, og relevante deler av
   `backend/scripts/test_catenda_api_contracts_live.py` og
   `backend/tests/test_integrations/test_catenda_mutation_contracts.py`.

Slå opp eldre design-/auditdokumenter og kode der en konkret uklarhet krever det.
Ikke start en ny generell kodebasegjennomgang eller en ny audit av alle tester.

### Kildene har forskjellige roller

- **Beslutninger:** dokumenterte oppdragsgiverbeslutninger og AF-01–AF-06 styrer.
  Reviewer-anbefalinger uten beslutningsbelegg er fortsatt anbefalinger.
- **Registrert funnstatus:** eksisterende masterplan er utgangspunktet. En gammel
  audit eller en feilende xfail skal ikke gjenåpne et lukket eller avgrenset funn.
- **Retting av bevispåstander:** bruk konkret dokumentert motbelegg, blant annet
  RGK-, RGK2- og RTB-reviewene. Nyere dato alene gir ikke høyere bevisverdi.
- **Struktur:** v2 gir et godt redaksjonelt utgangspunkt, men er ikke en selvstendig
  beslutningskilde. CSV-en er et testinventar, ikke en automatisk fasit på feilstatus.
- **Implementert versus planlagt:** dokumentredigering lukker ingen kode- eller
  databasefeil. Skill også «besluttet», «lest i kode», «kjørt lokalt» og «tidligere
  kontrollert i database» fra hverandre.

Ved reell usikkerhet: behold siste dokumenterte status, noter hva som ikke er
avklart og hva som trengs for avklaring. Fullfør resten av sluttredigeringen.

## 3. Rett kjente feil eksplisitt

Behandle følgende i redaksjonsprotokollen med kilde, tiltak og målseksjon:

| Kilde | Påkrevd behandling |
| --- | --- |
| RTB-01: AP-ID | Testen `test_stale_reserved_id_attempt_cannot_delete_successful_creation` gjelder **AP-04**, ikke AP-01. Ikke gjenåpne AP-01. |
| RTB-01: GFK-04 | Forsering utenfor godkjenningsflyten er en vedtatt avgrensning. Fjern klassifiseringen som åpen produktfeil og forslaget om å innføre støtte som en feilretting. Bevar observasjonen av hva testen faktisk forventer og gjør. |
| RTB-01: TFR-ID-er | Inventarets `FR-01`–`FR-04` tilsvarer **TFR-02, TFR-03, TFR-04 og TFR-05**. Bruk etablerte ID-er konsekvent. |
| RTB-02: TST-02/KR-15 | Den nye testen er ikke deterministisk. Behold oppgaven om reell kontroll av flettingen; ikke endre tester eller fjerne `strict=True` i denne runden. Avgrens JSON-feilen til den aktuelle backenden. |
| RTB-03: AP-04/RV-02 | En ny separat sjekk før metadatasletting eller vern av aktiv lease er ikke hele løsningen. Bevar kravet om transaksjon, samordnet låsing, kommandoidempotens og atomisk leveringsintensjon. |
| RTB-04: Catenda | Gjenbruk tidligere kontraktstester. Skill API-støtte for GUID fra bevist idempotens. Korriger omtalen av `upload_url`; dagens klient bruker `Bimsync-Params`. |
| RTB-05: lenker | Rett relative filhenvisninger fra dokumentets egen mappe. Kontroller også ankere; en eksisterende fil er ikke bevis for at avsnittslenken virker. |

Ta også med de allerede dokumenterte bevisavgrensningene:

- **AUT-03:** den aktuelle batch-ruten avviser interne notater med 400. Den gamle
  testen forventer 201 og kommer ikke frem til lekkasjeassertionen. Før relevant
  testvedlikehold som egen restanse; ikke viderefør lekkasje som nåværende funn.
- **DB-03/DB-04:** skille mellom gamle/manglende migrasjonsstier og mangler som
  fortsatt finnes i relasjonsintegriteten. Ikke bruk én historisk DDL-fil som
  bevis for hele dagens skjema.
- **MG-03:** parserens isolerte aksept er forsvar i dybden; eksisterende HTTP-ruter
  overskriver aktørfeltene fra autorisert kontekst. Ikke påstå bevist klientforfalskning.
- **FE-01:** skill feil i autentiseringsforutsetningen fra den frontendkontrakten
  testen skulle undersøke.

Gå gjennom alle CSV-radene for kobling til riktig etablert ID og registrert status.
Bevar node-ID, backend/lag, faktisk første feilsted og opprinnelig kjøreproveniens.
Bruk en egen kategori for vedtatt avgrensning/ikke feil dersom det trengs. Beregn
eventuelle antall fra det korrigerte inventaret og forklar kategoriene. Ikke skriv
«25 bekreftede åpne feil» eller erklær resterende rader nyverifisert uten belegg.
Antall tester er heller ikke antall selvstendige rotårsaker.

## 4. Gjør hovedplanen operativ og fullstendig

Hovedplanen skal minst gi følgende, uten gjentatte historiske statuslag:

1. **Hva som gjelder:** formål, avgrensning, faktisk dato/commit, hvilke forslag
   som er innarbeidet, og hvilke dokumenter som nå er historiske underlag.
2. **Målarkitektur og sikkerhetsinvarianter:** ansvarsgrenser og hvorfor de trengs.
   Skill eksisterende komponenter fra planlagte tabeller, funksjoner og navneskifter.
3. **Beslutningsregister:** vedtatte premisser, føringer, anbefalinger og åpne valg.
4. **Funnregister:** én gjeldende status per etablert ID, med restanse, bevisgrense,
   fase og lenke til relevant kilde. Bruk referanser ved overlapp, ikke doble oppgaver.
5. **Arbeidspakker:** avhengigheter, konkret leveranse, akseptkriterier og hvilke
   tester som må bevise at pakken er ferdig. Skill planlagt kontroll fra utført kontroll.
6. **Neste gjennomførbare oppgave:** hva en ny utvikler faktisk kan starte med,
   og hvilke beslutninger som først blokkerer senere arbeid.

Lag en dekningsmatrise fra gammel masterplan, AF-01–AF-06 og v2-kildegrunnlaget
til nye avsnitt. For hvert normativt krav og hver funnfamilie skal det fremgå om
det er videreført, slått sammen, historisk eller korrigert, og hvorfor. Ikke la
«kortere plan» bety at krav forsvinner. Matrisen kan ligge i redaksjonsprotokollen;
løpende status skal bare vedlikeholdes i hovedplanen.

Kontroller særlig at disse føringene overlever redigeringen:

- Prosjekt, kontraktsside, team og handlingsrett er forskjellige grenser.
  Private notater, utkast og godkjenningspakker skal vernes i datalaget.
- Append-only verner også mot uautorisert innsetting. Runtime, worker og
  administrative roller må ha konkret avgrensede rettigheter.
- Ekte PostgreSQL-tester med relevante roller, og én komplett EO-flyt med minimal
  worker, prioriteres foran generell opprydding og utvidelse til øvrige adaptere.
- EO-kommandoen omfatter policy/pakke/fullmakt, saksversjoner, relevante EO-/KOE-
  reserveringer, hendelser, metadata/relasjoner, vedleggsbinding, kvittering og
  outbox i samme transaksjon. Harmoniser låserekkefølgen på tvers av skrivestier.
- Idempotens omfatter prosjekt, aktør, kommando og innhold; skill identisk retry
  fra konkurrerende kommando og gjenbruk av ID med endret innhold.
- Nyere utkast må ikke slettes ved parallell innsending. Vedlegg må valideres
  mot prosjekt, sak, eier/team, revisjon og karantene før binding.
- Mål/config og dokumentgrunnlag fryses. Usikkert eksternt utfall, avstemming,
  gamle workers, gyldig lease-token og beskyttelse mot utdaterte statusjobber
  må inngå i leveringskontrakten. Private data skal ikke gå ut gjennom outbox.
- Skill ren hendelsesgjenoppbygging fra navneoppslag ved visning. Hash alene er
  ikke dokumentbevaring eller leveringsbevis.
- Gjør lagringsmigreringen gjennomførbar: private lagre flyttes i sikkerhetsfasen;
  vedleggsregister og leveringsstatus avvikles når erstatningene finnes. Unngå
  påstander om at all SQLite er fjernet før disse oppgavene er fullført.
- Bevar produksjonskrav om blant annet staging, hemmelighetshåndtering/rotasjon,
  karantene/skanning, delt kapasitetsstyring, tilgangslogging, aktiv varsling,
  eksport/bevaring og kompatibilitet ved utrulling/tilbakerulling. Organisatoriske
  avklaringer kan starte tidlig selv om de er en port før produksjon.

## 5. Åpne beslutninger og Catenda

For hvert åpent valg skal planen angi **spørsmål, alternativer, eventuell anbefaling
med kilde, hvem/ hvilken rolle som må avklare, nødvendig belegg og hvilken oppgave
valget blokkerer**. Skriv «ansvarlig ikke avklart» fremfor å finne på en navngitt eier.
Ikke gjør alle åpne valg til blokkering for hele planen.

Dette gjelder særlig:

- AF-03: relasjonsprojeksjon med prosjektavgrensede fremmednøkler er foretrukket
  til videre vurdering, ikke automatisk vedtatt ved denne sluttredigeringen.
- Tilgangsmekanisme, runtime-rolle, identitetskontekst og databasefunksjoner må
  utformes samlet. Ikke presenter ett foreslått RLS-/funksjonsoppsett som vedtatt.
- Dokument-/brevmodellen i `catenda-dataflyt.md` avsnitt 11 er fortsatt et valg.
  `failOnDocumentExists=true` må knyttes til valgt opprettelsesstrategi, ikke
  innføres som ubetinget erstatning for en legitim revisjonsflyt.
- Virkningstid for tilbakekalling, behandling av ventende pakker/utkast og
  organisatoriske bevaringskrav må ha beslutningsbelegg. At journalen er
  uforanderlig dokumenterer ikke alene rettslig gyldighet.

PostgreSQL RPC over PostgREST er allerede utgangspunktet for transaksjonsretningen.
Ikke gjenåpne valget som en nødvendig stor utredning uten nytt konkret motbelegg.

Lag en kort Catenda-matrise med operasjon, tidligere dokumentert kontrakt,
ny nødvendig garanti, manglende verifikasjon og trygg håndtering ved usikkerhet.
Gjenbruk tidligere levende resultater som **historiske resultater**, ikke som nye
kjøringer. Nye lokale feiltester og eventuelle smale levende kontrakttester føres
som implementeringsoppgaver; ingen levende API-test skal kjøres i denne runden.

OpenAPI ligger i `docs/tredjepart-api/`. Søk etter aktuell operasjon og les bare
nødvendig schema/avsnitt. Ikke last hele spesifikasjonene inn i konteksten.
Ikke utled retry-garantier fra at et GUID-felt eksisterer. Terskler og kvoter uten
kilde skal være tydelig merkede forslag eller åpne avklaringer.

## 6. Avslutt uten nye dokumentasjonskonflikter

Gjør dette i rekkefølge:

1. Fullfør hovedplanen og dekningsmatrisen før du endrer inngangene i indeksen.
2. Rett testinventaret og nødvendige rapporthenvisninger med datert forklaring.
3. Marker tidligere konsolideringer som historiske forslag, med lenke til den
   gjeldende planen. Merk innarbeidede reviewpunkter uten å omskrive gamle testlogger.
4. Oppdater «Start her» og «Gjeldende plan og status» i `docs/README.md` slik at
   hovedplanen er første inngang og gamle handoffer ikke fremstår som dagens plan.
5. Kontroller at delplanene har tydelig underordning og ingen umerket motstrid
   med gjeldende føringer. Bruk korte daterte merknader ved eldre tekst.
6. Kontroller inngående lenker til omstrukturerte masterplanavsnitt. Bevar relevante
   ankere eller oppdater referansene; stabil filsti alene bevarer ikke avsnittslenker.

Ikke spre nye kopier av løpende funnstatus til flere dokumenter. Ikke rett hele
den historiske dokumentkjeden kosmetisk eller legg til nye generelle anbefalinger.

## 7. Verifikasjon og grenser

Dette er dokumentarbeid. Kjør dokumentkontroller og målrettede lesninger først.
Ingen full test-, database- eller API-runde er nødvendig bare for sluttredigeringen.
En konkret uklarhet som påvirker status kan etterprøves med en eksisterende,
isolert lokal test. Kontroller fixtures før kjøring; import kan laste ekte miljø.
Ikke endre tester for å få et ønsket resultat.

Ikke gjør nye påstander om den levende databasen ut fra migrasjonsfiler eller
testdobler. Hvis aktuell katalogtilstand må avklares, bruk kun tilgjengelig
Supabase-MCP og katalogspørringer etter repoets instruks; ikke les saksdata.
Er dette utilgjengelig, merk påstanden som historisk/ikke kontrollert nå.

Leveransen er ferdig når følgende er kontrollert:

- Én fil er tydelig autoritativ for plan og funnstatus, med én inngang i indeksen.
- Alle krav/funnfamilier i grunnlaget har en sporbar plassering eller begrunnet
  avgrensning. Gamle ID-er er bevart; overlapp gir ikke doble rettingsoppgaver.
- RTB-01–RTB-05 er behandlet, og RGK-/RGK2-rettelser er ikke falt ut igjen.
- Registrert status, testutfall og beslutningsstatus er separate begreper.
  Ingen kodefeil er «lukket» fordi dokumentasjonen er rettet.
- Åpne valg er tydelige og avgrenser hva de blokkerer. Ingen uforankrede
  driftsverdier, produktbeslutninger eller juridiske garantier er innført.
- Relative fil- og avsnittslenker i endrede dokumenter virker. Bruk en kontroll
  som tar hensyn til kodeblokker, dokumentets mappe og faktiske ankerregler;
  dokumenter eventuelle fragmenter som ikke kunne kontrolleres automatisk.
- CSV leses med CSV-parser; node-ID-er, antall rader og kildehenvisninger er
  avstemt. Originale kjørelogger er urørt, og gamle testtider er ikke fremført
  som nye målinger.
- Git-diff viser bare autoriserte dokumentendringer. Ingen ny produksjonskode,
  tester, migrasjoner, konfigurasjon eller lokale data følger med.

Redaksjonsprotokollen skal avsluttes med **«Verifikasjon og grenser»** og skille
mellom kjørt nå, lest nå, historisk dokumentert og ikke kontrollert. Oppgi
faktiske kommandoer og resultat, uten å overdrive hva de beviser.

Avslutt til oppdragsgiver med lenke til hovedplanen, hvilke dokumenter som er
endret, de viktigste korrigerte statusene, åpne beslutninger som påvirker neste
arbeidspakke, og hva som faktisk er verifisert. Ikke avslutt med å foreslå enda
en bred konsolideringsrunde dersom de avgrensede kriteriene over er oppfylt.
