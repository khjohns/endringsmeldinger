# Endringsordre i Kontraktsbordet

Byggherren kan opprette en endringsordre fra «Krav og endringer» eller fra en omforent KOE-sak. Endringsordren er en egen sak med dokumentvisning, historikk og lenker til KOE-sakene som inngår. Skjemaet bruker dagens komponenter og designtokens.

I `/mockup/oversikt` vises også «Ny endringsordre» når «Byggherre BH» er valgt. Demoflyten bruker samme skjema med lokale eksempelsaker, uten API-kall. Utstedte demoordrer lagres i nettleseren, vises i mockup-registeret og kan gjenåpnes. Demoen bruker en egen lagringsnøkkel for utkast og ordresamling; den oppretter ingen reelle prosjektsaker.

## Brukerflyt

1. Velg «Ny endringsordre» i byggherrevisningen, eller «Utsted endringsordre» fra en avklart KOE-sak.
2. Velg grunnlag: direkte pålegg eller formalisering av avtalte KOE-krav.
3. Fyll ut nummer, beskrivelse, konsekvenser, vederlag og frist. Ved formalisering velges ett eller flere tilgjengelige KOE-krav.
4. Kontroller dokumentet og bekreft utstedelse. Før dette skjer, er skjemaet kun et lokalt utkast, lagret per bruker og prosjekt i nettleseren.
5. Åpne den utstedte ordren, følg lenker til grunnlagssakene eller bruk nettleserens utskrift/PDF-funksjon.

| Konsekvens | Lagring | Visning |
| --- | --- | --- |
| Uavklart pris | `konsekvenser.pris=true`, beløpsfelt utelatt | Uavklart |
| Ingen vederlagsjustering | `konsekvenser.pris=false`, beløpsfelt utelatt | 0 kr |
| Avklart beløp | Oppgjørsform, tillegg og fradrag | Netto tillegg minus fradrag |
| Uavklart frist | `konsekvenser.fremdrift=true`, dager/dato utelatt | Uavklart |
| Ingen fristforlengelse | `konsekvenser.fremdrift=false`, dager/dato utelatt | 0 dager |
| Avklart frist | Eksplisitt heltall, eventuelt ny sluttdato | Samlet antall dager |

Direkte pålegg kan utstedes med uavklart pris og frist. Ved KOE-formalisering må konsekvensene være avklart, og beløpet kan ikke være et estimat. Nettobeløpet hentes fra gjeldende KOE-enighet og kontrolleres på nytt ved lagring. Negative summer blir fradrag. Dager summeres ikke automatisk: brukeren må angi samlet avtalt forlengelse med hensyn til overlapp mellom kravene.

KOE-kandidater tilhører samme prosjekt, har godkjent grunnlag og avklarte aktive spor, og inneholder minst ett godkjent vederlags- eller fristkrav. Krav som allerede inngår i en EO, kan ikke velges igjen. Eksisterende KOE-historikk beholdes. Utstedte ordres relasjoner kan ikke endres gjennom de gamle legg-til/fjern-endepunktene.

Saksregisteret har et sakstypefilter og viser EO-nummer, status, grunnlag, nettobeløp og frist. Vederlags- og friststatistikken er eksplisitt KOE-statistikk; EO-beløp legges ikke til en gang til. Formaliserte KOE-saker tas ut av arbeidslisten.

## Implementering

- Opprettelse: `src/routes/[prosjektId]/endringsordre/ny/+page.svelte`.
- Felles saksrute velger dokumentvisning for `sakstype=endringsordre`.
- Skjema, dokument og KOE-banner: `src/lib/components/endringsordre/`.
- Validering og payload: `src/lib/domain/endringsordre.ts`.
- API-klient: `src/lib/api/endringsordre.ts`, med eksplisitt prosjekt-header.
- Backend gjenbruker eksisterende EO-hendelser, metadata og tidslinje. Ingen nye tabeller eller migrasjoner.
- Metadata og de tre opprettelseshendelsene lagres via eksisterende `SakCreationService`. Beløp, fradrag, estimat, nullverdier og sluttdato overlever hendelsesreplay, også for eldre payload-format.
- KOE-kandidater, relasjoner og tilbakekoblinger leses fra prosjektets lokale hendelser. En feil i relasjonsindeksen kan derfor ikke skjule en allerede utstedt ordre.

## Avgrensninger i dagens infrastruktur

**Tilgang:** «Vis som BH/TE» er et visningsvalg, ikke en verifisert kontraktspart. Endepunktet krever innlogget prosjektmedlem med skriverettighet, kontrollerer prosjektet og henter avsender fra sesjonen. Separat autorisasjon som byggherre krever at kontraktspart knyttes til en betrodd bruker-/prosjektrolle. EO-utstedelse har heller ikke en ny intern godkjenningspakke/fullmaktsflyt; eksisterende KOE-vurderinger følger sin eksisterende behandling.

**Samtidighet:** Eksisterende opprettelsesmekanisme har kompenserende lagring og ingen felles transaksjon på tvers av KOE-saker. Nummer og relasjoner kontrolleres før skriving, og samme skjema blokkerer dobbel innsending, men to samtidige forespørsler i ulike prosesser kan passere samme forhåndskontroll. En streng garanti krever atomisk reservasjon av nummer og KOE-tilknytning i databasen.

**Catenda:** Ordren lagres i appen først. Automatisk utsending til Catenda bruker bare den validerte, konfigurerte koblingen for det eksisterende `oslobygg`-prosjektet. Andre prosjekter, registerstyrte oppsett og KOE-saker uten korrekt Catenda-kobling får ingen automatisk utsending til et globalt standard-board. Nye Catenda-topic-IDer lagres på riktig prosjekt og sak. API-et skiller mellom `disabled`, `not_configured`, `failed` og `synced`. Dette er ikke en e-postutsending eller et løfte om at mottakeren har lest ordren.

Dokumentet viser gjeldende EO-revisjon. Egen UI for entreprenørens aksept/bestridelse, revisjon av utstedt ordre, vedlegg og intern EO-godkjenning inngår ikke i disse to opprettelsesflytene.

## Verifikasjon

- `npm run check:error`, `npm run build` og `npm run test -- --maxWorkers=2`.
- Backendtester: `test_endringsordre_service.py`, `test_endringsordre_routes.py`, `test_case_list_endringsordre.py`, `test_catenda_metadata_mapping.py`.
- `scripts/test_endringsordre.mjs` kjører begge opprettelsesflytene i Chrome med avskjærte API-kall: forhåndsvalg, flere KOE-krav, eksplisitt samlet frist, dokumentkontroll, lagret utkast, gjenåpning og mobilvisning. Ingen reelle saker opprettes av testen.
