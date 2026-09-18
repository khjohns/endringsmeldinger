# Brev og intern godkjenning

Implementert 11. september 2026. Bygger på [domenespesifikasjonen](superpowers/specs/2026-09-05-intern-godkjenningsflyt-design.md).

## Prøve flyten

Åpne `/mockup?rolle=BH&spor=vederlag`.

1. Åpne svarskjemaet og ferdigstill vurderingen (steg 1). Dette publiserer ikke et BH-svar.
2. Brevet åpnes i siden (steg 2), ikke i en modal. Alle ferdigstilte vurderinger inngår. Innledning og avslutning kan tilpasses. Brevutkast lagres ved å forlate tekstfeltet og ved «Til saken». «Endre» går tilbake til saken; å åpne en ferdigstilt vurdering gjør den til en redigerbar revisjon.
3. Godkjenningspanelet (steg 3) står i høyre kolonne. Det viser høyeste samlede standpunkt, egen fullmakt, beregningen bak én klikk og kjeden beløpet krever. Kryss av for kontroll og send. Hele pakken fryses, inkludert vurderingsdata, brevtekst, forutsetninger og utledet kjede.
4. Bruk «Demo · vis som» til å bytte fra Kari Hansen til Ola Nilsen. Godkjenn eller returner med kommentar.
5. Den som avgjør (her Anne Berg) utfører siste godkjenning. Denne starter publiseringen. «Svaret er sendt» vises først etter bekreftet publisering.
6. Ved retur opprettes nye kladdrevisjoner. Revider vurderingene og send en ny pakke. Returkommentaren vises over brevet, og endringene kan sammenlignes.

Demoen har to godkjennere: Prosjektdirektør og Avdelingsleder. Kari Hansen er saksbehandler med rollen Prosjektleder.

## Godkjenningspanelet

Designet ligger i `docs/design/ApprovalPanel.*`. Svelte-komponenten er `src/lib/components/approval/ApprovalPanel.svelte`; reglene for ruting er `src/lib/approval/route.ts` (`resolveRoute`) og tilsvarende `resolve_route` i `backend/services/approval_authority.py`.

- Én anatomi, tre tilstander: innenfor fullmakt («Send svar», ingen kjede), over fullmakt («Send til godkjenning», kjede) og under behandling (samme panel viser status, «Trekk fra godkjenning» for saksbehandler, «Godkjenn»/«Returner» for aktiv godkjenner).
- Kjeden utledes, den velges aldri. Godkjennerne tas i konfigurert rekkefølge fram til første rolle med tilstrekkelig fullmakt, som avgjør. Innenfor saksbehandlerens egen fullmakt godkjennes pakken ved innsending og publiseres straks.
- Beløp over alle fullmakter blokkeres eksplisitt, det sendes ikke stille til høyeste nivå. Manglende dagmulktssats blokkerer sending.
- Roller utenfor matrisen gir ingen fullmakt. For brev uten beløp (f.eks. bare ansvarsgrunnlag) med en kjede uten matriseroller brukes hele kjeden, som før.
- Serveren utleder samme rute ved innsending, godkjenning og publisering. Endret policy, fullmakt eller rute returnerer åpne pakker for ny godkjenning. Demodata er lokale for den åpne saken og nullstilles ved omlasting. Demoen sender ingen eksterne meldinger.

Entreprenørens nye ansvarsgrunnlag, oppdateringer, vederlagskrav og fristkrav går gjennom brevkontroll før innsending. Kontrollen er et steg i siden med samme panel som byggherrens godkjenning, men uten kjede: kryss av for kontroll og «Send til byggherren». Skjemaet skjules, ikke avmonteres, så innsendingen fortsetter når brevet bekreftes. «Tilbake til kravet» og «Endre» går tilbake til skjemaet uten å miste kladden. Nye sendte brev lagres med hendelsen og åpnes uten redigeringsmulighet fra historikken. Eldre hendelser uten et lagret brev får fortsatt en lesbar brevrepresentasjon fra hendelsesdata.

## Samsvar mellom skjema og brev

Økonomi- og fristskjemaene viser generert begrunnelse som en låst blokk. Saksbehandler skriver tillegg separat. Endrede skjemavalg oppdaterer den genererte teksten uten å overskrive tilleggene. Vurdering og samlet brev bruker samme begrunnelse.

Brevets beslutningssammendrag skiller prinsipalt og subsidiært standpunkt. Ferdigstilt ansvarsgrunnlag brukes som forutsetning når økonomi og frist bearbeides. Pakken kontrolleres mot grunnlaget som faktisk inkluderes eller allerede er publisert. En utelatt vurdering inngår ikke i brevets summer.

Backend kontrollerer versjon, siste kravhendelse, ansvarsgrunnlag og eksisterende domeneregler ved ferdigstilling, pakkeinnsending, godkjenning og publisering. Endrede forutsetninger blokkerer sending. «Oppdater status» henter nye data ved samtidige endringer.

PDF og skjermbrev bruker den lagrede teksten. PDF viser brevets avsender, ikke en fast organisasjonslogo. Kladdnedlasting merkes «UTKAST».

## Konfigurere reelle saker uten Microsoft Graph

`BH_APPROVAL_POLICIES` er et JSON-objekt med prosjekt-ID som nøkkel. Hver oppføring må binde fullmakten til `user_id` — brukerens ID i `app_users` — og ikke bare til e-postadressen. Leverandøren skriver e-posten på nytt ved hver innlogging, og kolonnen er verken verifisert eller unik, så den som setter sin egen adresse til en godkjenners ville arvet fullmakten. E-postadressen beholdes som lesbart navn og nøkkel i pakkene. Eksempel (kun illustrasjon):

```json
{
  "prosjekt-id": {
    "handlers": [
      { "id": "saksbehandler@example.no", "user_id": "9d1b…", "name": "Saksbehandler", "role": "Prosjektleder" }
    ],
    "chain": [
      { "id": "prosjektleder@example.no", "user_id": "4c07…", "name": "Prosjektleder", "role": "Prosjektleder" },
      { "id": "prosjekteier@example.no", "user_id": "b82f…", "name": "Prosjekteier", "role": "Prosjekteier" }
    ]
  }
}
```

`handlers` kan også være rene e-postadresser, men da bare i utvikling: med `APP_ENV=production` eller `staging` avvises en oppføring uten `user_id` med en konfigurasjonsfeil i stedet for å gi fullmakt. Uten rolle har saksbehandleren ingen egen fullmakt, og alt med beløp går til godkjenning. Kjeden bør stå i stigende fullmaktsrekkefølge med roller fra matrisen. `chain` brukes også for endringsordrer.

Saksbehandleren kan ikke godkjenne sin egen pakke. Tom kjede og dupliserte personer avvises. Prosjektmedlemskap og sakstilgang kontrolleres på serveren. UI-rollen «BH» gir ikke i seg selv tilgang til interne data. Endret policy endrer ikke en allerede innsendt kjede.

Prosjekter uten konfigurert policy får ingen automatisk godkjenning. De nye interne endepunktene avviser tilgang. For prosjekter med policy blokkeres direkte BH-responser gjennom både enkelt- og batch-endepunktet; publisering må skje gjennom godkjenningsflyten.

Microsoft Graph, dynamiske fullmaktsgrenser, delegering og fraværshåndtering er ikke koblet til. Den konfigurerte kjeden er en midlertidig erstatning. Ingen reelle fullmaktsgrenser er antatt.

## Lagring og publisering

- `BH_APPROVAL_DB`: filbane til privat SQLite-database; standard `koe_data/approvals.sqlite3`. Denne må ligge på et varig volum. Implementasjonen krever at backendinstansene bruker samme lokale database; separate containervolumer gir ikke en felles godkjenningsstrøm. Distribuert drift krever en tilsvarende transaksjonell repository-adapter.
- Arbeidskladder i skjema bruker fortsatt eksisterende nettleserlagring. Ferdigstilte revisjoner, kladder opprettet ved retur/revisjon, brevtilpasninger, pakker, kjeder og auditspor lagres på backend.
- Interne data går aldri inn i `SakState` eller offentlig historikk. Offentlige responser inneholder kun vurderingsdata og et eksplisitt brevobjekt, uten skjemaets interne arbeidsdata, returkommentar eller godkjenningskjede.
- `BEGIN IMMEDIATE` og forventet versjon serialiserer interne kommandoer. Kommando-ID hindrer gjentatt utføring av samme kommando.
- Siste godkjenning lagrer stabile hendelses-IDer. Separat publisering bruker eksisterende atomisk `append_batch`. Ved feil etter lagring gjenkjennes allerede publiserte hendelser ved nytt forsøk.
- Outbox lagres med pakken. Når Catenda er konfigurert, brukes eksisterende integrasjon til å sende samme brev-PDF. Feil kan forsøkes på nytt uten å opprette nye offentlige svar. Ekstern levering er en sideeffekt: «Sendt» betyr publisert i appen. Ved transportfeil etter delvis Catenda-levering kan eksterne vedlegg/kommentarer kreve kontroll før ny levering; integrasjonen gir ikke en transaksjon på tvers av systemene.
- Vedleggsoversikten viser dokumentreferanser som finnes i vurderingsdata. Ny opplasting og valg av dokumentversjoner er ikke lagt til i denne endringen; den eksisterende filflaten må utvides før komplette vedleggspakker kan sendes fra UI.

## Verifikasjon

```sh
npm run check:error
npm test
npm run build
cd backend
venv/bin/pytest tests/test_approval tests/test_models/test_events.py tests/test_models/test_event_parsing.py tests/test_models/test_cloudevents.py tests/test_services/test_business_rules.py tests/test_repositories/test_event_repository.py -q
```

Headless-testen tar ingen skjermbilder:

```sh
TEST_BASE_URL=http://localhost:5174 PLAYWRIGHT_MODULE=/absolutt/sti/til/playwright/index.mjs node scripts/test_brev_godkjenning.mjs
```

Den bruker installert Chrome som standard. `CHROMIUM_EXECUTABLE_PATH` kan settes til en eksisterende Chromium/headless-shell. Testen dekker ferdigstilling, brevutkast, retur, ny revisjon, endringsvisning, godkjenningskjede, frosset historikk, TE-kontroll og mobil/tastatur.

## Fullmaktsvisning (januar 2026)

Matrisen for «endring i kontrakt» er oppgitt av brukeren: Prosjektleder 200 000 kr, Prosjektdirektør 500 000 kr, Seksjonsleder 1 500 000 kr, Avdelingsleder 3 000 000 kr, Divisjonsdirektør 5 000 000 kr og Adm.dir ubegrenset.

Visningen sammenligner TEs krav for inkluderte vurderinger med BHs standpunkt. Foreløpig regel er høyeste samlede prinsipale eller subsidiære standpunkt, med vederlag og fristverdi lagt sammen innen hvert standpunkt. Fristverdi er godkjente dager × dagmulktssats i kroner per dag. Subsidiært standpunkt tas med selv når ansvarsgrunnlaget er avslått. Manglende sats gir uavklart verdi, ikke null. En sats på én promille av kontraktsverdi antas ikke automatisk; satsen må finnes i saks-/kontraktsdata.

Beregningsinngangene lagres i den interne brevpakken ved innsending, og utelates fra mottakerens brev/PDF. Eldre pakker uten disse inngangene får ikke en etterberegning med dagens sats. Fullmakten håndheves på serveren: kjeden i pakken er den serveren utleder fra beløpet og policyens roller. Rollene er fortsatt konfigurert i `BH_APPROVAL_POLICIES`, ikke hentet fra en organisasjonskatalog.


Driftsavklaring 2026-09-14: brukeren oppgir én Flask-backendinstans og at appen
ikke er i produksjon. Se [persistens og gjenoppretting](audit-persistens-gjenoppretting-2026-09-14.md)
for lokale krasj-/prosesstester og lagringsavklaringer før produksjonssetting.
