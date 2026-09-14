# Brev og intern godkjenning

Implementert 11. september 2026. Bygger på [domenespesifikasjonen](superpowers/specs/2026-09-05-intern-godkjenningsflyt-design.md).

## Prøve flyten

Åpne `/mockup?rolle=BH&spor=vederlag`.

1. Åpne svarskjemaet og ferdigstill vurderingen. Dette publiserer ikke et BH-svar.
2. I «Brev og godkjenning» velges ferdigstilte vurderinger. Innledning og avslutning kan tilpasses. Brevutkast lagres ved å forlate tekstfeltet og ved lukking.
3. Send brevet til godkjenning. Hele pakken fryses, inkludert vurderingsdata, brevtekst, forutsetninger og godkjenningskjede.
4. Bruk «Prøv godkjenningsflyten» til å bytte fra Kari Hansen til Ola Nilsen. Godkjenn eller returner med kommentar.
5. Anne Berg utfører siste godkjenning. Denne starter publiseringen. «Sendt» vises først etter bekreftet publisering.
6. Ved retur opprettes nye kladdrevisjoner. Revider vurderingene og send en ny pakke. Forrige pakke og returkommentar bevares, og endringene kan sammenlignes.

Demoen har to konfigurerte godkjennere: Prosjektdirektør og Avdelingsleder. Kari Hansen er saksbehandler med rollen Prosjektleder. Demodata er lokale for den åpne saken og nullstilles ved omlasting. Demoen sender ingen eksterne meldinger.

Entreprenørens nye ansvarsgrunnlag, oppdateringer, vederlagskrav og fristkrav går gjennom brevkontroll før innsending. Avbryt går tilbake til skjemaet uten å miste kladden. Nye sendte brev lagres med hendelsen og åpnes uten redigeringsmulighet fra historikken. Eldre hendelser uten et lagret brev får fortsatt en lesbar brevrepresentasjon fra hendelsesdata.

## Samsvar mellom skjema og brev

Økonomi- og fristskjemaene viser generert begrunnelse som en låst blokk. Saksbehandler skriver tillegg separat. Endrede skjemavalg oppdaterer den genererte teksten uten å overskrive tilleggene. Vurdering og samlet brev bruker samme begrunnelse.

Brevets beslutningssammendrag skiller prinsipalt og subsidiært standpunkt. Ferdigstilt ansvarsgrunnlag brukes som forutsetning når økonomi og frist bearbeides. Pakken kontrolleres mot grunnlaget som faktisk inkluderes eller allerede er publisert. En utelatt vurdering inngår ikke i brevets summer.

Backend kontrollerer versjon, siste kravhendelse, ansvarsgrunnlag og eksisterende domeneregler ved ferdigstilling, pakkeinnsending, godkjenning og publisering. Endrede forutsetninger blokkerer sending. «Oppdater status» henter nye data ved samtidige endringer.

PDF og skjermbrev bruker den lagrede teksten. PDF viser brevets avsender, ikke en fast organisasjonslogo. Kladdnedlasting merkes «UTKAST».

## Konfigurere reelle saker uten Microsoft Graph

`BH_APPROVAL_POLICIES` er et JSON-objekt med prosjekt-ID som nøkkel. Identiteter må være autentiserte e-postadresser. Eksempel (kun illustrasjon):

```json
{
  "prosjekt-id": {
    "handlers": ["saksbehandler@example.no"],
    "chain": [
      { "id": "prosjektleder@example.no", "name": "Prosjektleder", "role": "Prosjektleder" },
      { "id": "prosjekteier@example.no", "name": "Prosjekteier", "role": "Prosjekteier" }
    ]
  }
}
```

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

Beregningsinngangene lagres i den interne brevpakken ved innsending, og utelates fra mottakerens brev/PDF. Eldre pakker uten disse inngangene får ikke en etterberegning med dagens sats. Dette er en beregningshjelp i UI, ikke serververifisert fullmaktskontroll. Visningen varsler dersom den konfigurerte kjeden mangler en tilstrekkelig rolle. Den endrer ikke kjeden, gir ikke rettigheter og blokkerer ikke publisering. Automatisk ruting og håndheving krever serverstyrt rolle-/fullmaktstildeling og kontraktsgrunnlag.


Driftsavklaring 2026-09-14: brukeren oppgir én Flask-backendinstans og at appen
ikke er i produksjon. Se [persistens og gjenoppretting](audit-persistens-gjenoppretting-2026-09-14.md)
for lokale krasj-/prosesstester og lagringsavklaringer før produksjonssetting.
