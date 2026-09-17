# Masterplan: sikkerhet, dataintegritet og varig levering

Avtalt 2026-09-16, basert på
[auditen av 93d630a](../audit-godkjenningspanel-og-durable-levering-2026-09-16.md).
Appen er ikke i produksjon og har ingen reelle produksjonsdata.

Utvidet 2026-09-17 etter [etterprøving av sikkerhetsprompten](../audit-sikkerhetsarkitektur-2026-09-17.md).
Dette er den overordnede planen. [Transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md)
er en delplan. Nye åpne funn må lukkes eller eksplisitt avgrenses før produksjon;
outbox alene gjør ikke appen sikker.

## Nye arbeidspakker og produksjonskrav

| Prioritet/rekkefølge | Arbeid | Ferdig når |
| --- | --- | --- |
| 0 — lukk eksponering før videre funksjonsarbeid | Fjern uvedkommende auto-consent/OAuth-discovery og ubrukt alternativ auth; behold Catenda-innlogging. Rett analytics-skjerming. | SA-01/02 er ordinære grønne tester. Hele ruteregisteret er klassifisert med offentlig/unntak eller påkrevd autentisering, prosjekt og kontraktsrolle. |
| 1 — felles sikkerhetsgrenser | Eksplisitt autorisert prosjektkontekst, ingen produksjonsfallback til oslobygg. Autorisert leselag skiller offentlig innhold, teaminterne notater og private pakker før aggregering, eksport og PDF. | Negative tester for to prosjekter, motpart, to team på samme side, ukjent team og direkte ressurs-ID. UI, analytics, nedlasting og driftsvisning følger samme regler. |
| 1 — verifiserbar leveranseprosess | CI og isolert staging, reproduserbar databasemigrasjon, nødvendige merge-sjekker. Avklar eierskap til drift og hendelser. | Tester/typesjekk/bygg og faktiske DB-integrasjonstester kjøres automatisk. Autorisasjon er ikke globalt mocket bort; live-tester er eksplisitt adskilt. |
| 2 — atomisk domene og levering | Gjennomfør EO-referanseflyten nedenfor, så BH-svar, ordinære hendelser, vedlegg og webhook. | AP-04 lukket mot ekte Postgres, alle støttede formelle innsendingsveier har varig leveringsintensjon og gjenopptas uten brukerhandling. |
| 2 — minst mulige privilegier og integritet | Avklar runtime-, worker-, drift- og migreringsrettigheter. Beskytt hendelser mot omskriving og uautorisert tilføying; hemmelighetslager og rotasjon. | Reelle runtime-legitimasjoner kan ikke endre/slette historikk eller omgå godkjenningskommandoen. Test også Data API med anon og anonymt innlogget authenticated. Migrering/break-glass er separat, tidsavgrenset og logget. |
| 3 — dokumenter og sporbarhet | Frosset brev/vedlegg med hash, karantene/skanning før frigivelse, tilgangslogg for sensitive lesinger og eksport, revisjon av fullmakts- og prosjektendringer. | Bevarings-/sletteregler omfatter filer, logger og backup. Ingen tokens eller brevtekst i standardlogger. Uavhengig integritetsbevis/lagring velges ut fra trusselmodellen; hash i samme redigerbare database alene er utilstrekkelig. |
| 3 — faktisk gjenoppretting og drift | Restore-øvelse, avstemming mot Catenda, varsling om køalder/usikre utfall, kapasitet og rate limiting. | Dokumentert RPO/RTO og vellykket restore av hendelser, godkjenninger, utkast, filer og køer. Restore utløser ikke blind ny levering. Feil har en mottaker og en testet driftsprosedyre. |

Arbeidspakker på samme nivå kan avklares sammen, men ingen utrulling før den
samlede produksjonsporten er passert. Før neste databasemigrasjon må tilgangs-
og skriverettigheter være konkretisert; ikke bygg runtime på ubegrenset
`service_role` og planlegg å begrense den senere. Det kan kreve at avgrensede
skrivefunksjoner får særskilte rettigheter og et eget review.

## Beslutninger som skal inn i implementeringen

- **Transaksjon:** behold Postgres og RPC som utgangspunkt. PostgREST er ikke
  en hindring for atomisk flerstegsskriving i én funksjon. Ingen plattformflytting
  er nødvendig for å løse det påviste problemet.
- **Leveringsmål:** frys autorisert prosjekt/topic/konfigurasjonsversjon ved
  commit. Endret målkobling parkerer gamle jobber for kontroll; en ny mapping
  skal ikke omdirigere tidligere godkjent innhold til en annen mottaker.
- **Samlet status:** én leveranse kan ha flere operasjoner. Først når alle
  obligatoriske operasjoner er kvittert, er leveransen levert. «Lagret»,
  «venter», «usikkert utfall» og «levert» må skilles i API og brukerflate.
- **Private data:** interne notater skal avvises ved opprettelse av ekstern
  leveringsjobb, ikke bare filtreres i HTTP-ruten. Dead-letter-visning og
  manuell retry må ha eksplisitt prosjekt-/datatilgang og reviderbar handling.
- **Vedlegg/utkast:** binding av alle forventede vedlegg må kontrolleres
  atomisk mot prosjekt, sak, eier/team og revisjon. Utkast slettes ved
  innsending bare hvis den innsendte revisjonen fortsatt er gjeldende.
- **Beregnings- og lesekvalitet:** fjern hardkodet analytics-sats; bruk samme
  autoritative kontraktsgrunnlag som øvrige beregninger. Lagringsfeil skal ikke
  presenteres som null krav eller komplett statistikk.
- **Tilbakekalling og fravær:** definer når endret medlemskap/fullmakt får
  virkning for utkast, godkjenning og allerede offentlig committede brev.
  Fravær løses med sporbar endring/ny godkjenning, ikke delt konto eller bypass.
- **Belastning:** mål ende-til-ende før eventuell medlemskapscache. Angi da
  eksplisitt tilbakekallingsfrist og sterkere kontroll ved formell publisering.

Volumet tilsier en enkel databasebasert worker med lease, backoff og synlige
feil, ikke en ny distribuert meldingsplattform. Avstemming er ekstra vern,
ikke erstatning for atomisk registrering. Fullstendig uavhengig sluttaudit og
driftsavklaringer gjenstår.

## Opprinnelig leveranserekkefølge for godkjenning og outbox

1. **Første leveranse:** rett AP-01 (alternative EO-innganger), AP-02
   (endret fullmakt før utstedelse), AP-03 (sluttdato/fullmaktsgrunnlag) og AP-05
   (felles satsoppslag). Gjør reproduksjonene til ordinære regresjonstester og
   test at legitime flyter fortsatt virker. Status: implementert og lokalt testet
   2026-09-17; ikke committet.
2. **Arkitektur med grundig review:** konkretiser transaksjonsgrenser,
   datamodell, idempotens og feilforløp for AP-04 og felles PostgreSQL-inbox/outbox.
   Planen skal dekke autorisasjon, prosjektidentitet og worker-gjenoppretting.
   Status: [konkret forslag skrevet](2026-09-17-atomisk-utstedelse-og-outbox.md).
   Fullstendig uavhengig arkitekturreview gjenstår.
3. **Referanseimplementasjon:** én komplett flyt med atomisk EO-utstedelse
   og utgående leveringsjobber, verifisert mot faktisk Postgres og krasjscenarier.
4. **Avgrensede adaptere, kan delegeres:** koble BH-svar, webhook,
   ordinære hendelser og vedlegg til den etablerte kontrakten, én flyt per leveranse.
5. **Uavhengig sluttaudit:** en annen agent enn implementøren prøver å bryte
   garantiene med samtidige forsøk, utløpte leases og mistede eksterne svar.

Testkrav fastsettes før implementering. Én ansvarlig beholder oversikten over
transaksjonsgrensene. Grønn testsuite må ikke erstatte eksplisitt dokumentasjon
av hva som er testet. AP-04 skal ikke regnes som løst med lengre lease.

Første arbeidsrunde omfatter punkt 1 og en konkret plan i punkt 2. Skjemaendring,
worker og omlegging av lagring hører til de etterfølgende implementeringsleveransene.
