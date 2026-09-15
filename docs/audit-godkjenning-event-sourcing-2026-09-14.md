# Audit: godkjenning, publisering og event sourcing

Dato: 2026-09-14. Utgangspunkt: commit `f5d5cc0`.
Status: De 7 bekreftede funnene er rettet og lokalt regresjonstestet.
Funnbeskrivelsene nedenfor dokumenterer tilstanden før retting. Se rettingslogg og
verifikasjon for nåværende status og avgrensninger.

## Omfang og begrensninger

- Godkjenningspakker, fullmakter, frosset brev og publisering.
- Hendelsesrekkefølge, revisjoner, tilbaketrekking, lukking og beregnet sakstilstand.
- Lokal verifikasjon med isolerte lagre og provider-mocker. Catenda-tilgang var tilgjengelig ved behov, men levende oppslag var ikke nødvendig for konklusjonene. Ingen tokens er lest eller logget.
- Supabase/RLS er eksplisitt utenfor omfang. JSON-lagring brukes kun som lokalt testlager; tidligere funn om samtidig filopprettelse gjenåpnes ikke.
- Webhook-retries ligger til trinn 3 i `docs/catenda-dataflyt.md` og er utsatt etter avtale.
- Ingen produksjonsdata eller eksterne meldinger skal endres i denne auditen.

## Opprinnelige funn (rettet)

Alvorlighet angir mulig konsekvens under de beskrevne forutsetningene, ikke at en
hendelse er observert i produksjon. Dette er en kodeaudit, ikke en juridisk vurdering
av NS 8407 eller organisasjonens fullmaktsreglement.

### AUD-01 — Høy: tilbakekalt godkjenner beholder rett på eksisterende pakke

**Bekreftet med Flask-rute og ekte ApprovalService.** En pakke opprettes med en
godkjenner som deretter fjernes fra `BH_APPROVAL_POLICIES.chain`. Vedkommende
beholder prosjektmedlemskap og BH-teamtilknytning. Et POST-kall fra denne brukeren
godkjenner fortsatt det aktive steget og gir HTTP 200.

`routes/approval_routes.py:context` faller tilbake til historisk pakkeeier/deltaker
når brukeren ikke finnes i dagens policy. `ApprovalService.command` bruker den
lagrede `steps`-listen ved approve/publish. `policy.version = digest(chain)` lagres,
men sammenlignes ikke med dagens kjede.

Tilbakekalling av prosjekt- eller BH-teamtilgang stopper fortsatt ruten. Funnet
gjelder tilbakekalling av den særskilte godkjenningsfullmakten. Dersom gamle pakker
bevisst skal beholde gamle fullmakter, må dette være en eksplisitt regel og ha en
egen mekanisme for å stanse dem; dagens policyendring gjør ikke det.

**Anbefaling:** Skill historisk lesetilgang fra rett til å beslutte/publisere.
Kontroller dagens fullmakt og policyversjon ved begge handlinger. Policyendring
bør kreve kontrollert ny behandling fremfor stille videreføring.

### AUD-02 — Høy: reviderte svar går utenom lås og oppstartskontroll

**To bekreftede reproduksjoner:** `respons_grunnlag_oppdatert` godtas både uten et
tidligere BH-svar og etter at grunnlaget er godkjent/låst.

`BusinessRuleValidator._get_rules_for_event` har sporregler for `respons_grunnlag`,
`respons_vederlag` og `respons_frist`, men ikke deres `_oppdatert`-varianter.
Oppdateringene får bare felles rolle- og sakslukkingskontroll. En sak med låst
grunnlag og øvrige spor i UTKAST er ikke globalt lukket og er berørt.

`TimelineService._handle_respons_grunnlag` kan deretter sette resultat til avslått
uten å nullstille en tidligere `laast=True`. Dette gir motstridende tilstand.
Intern godkjenning bruker samme validator og fjerner ikke denne svakheten.

**Anbefaling:** Definer tillatte revisjonsoverganger eksplisitt, med krav om et
tidligere svar og korrekt spor/krav. Avklar om og hvordan et låst svar kan omgjøres;
en lovlig omgjøring må også oppdatere lås og øvrig tilstand konsistent.

### AUD-03 — Høy: ny opprettelseshendelse kan omgå oppdateringslås

**Bekreftet:** Etter godkjent/låst grunnlag aksepterer validatoren enda en
`grunnlag_opprettet` i samme sak. Den tilsvarende `grunnlag_oppdatert` ville blitt
stoppet av låskontrollen.

Opprettelsestypen mangler en regel om at sporet allerede finnes. Ved replay
overskriver `_handle_grunnlag` beskrivelsen og setter `antall_versjoner=1`, samtidig
som tidligere BH-felter beholdes. Korrekt global `expected_version` hindrer ikke
denne sekvensielle operasjonen. Problemet er uavhengig av JSON-/databasebackend.

**Anbefaling:** Krev gyldig starttilstand for alle opprettelses-/førstegangs-typer.
Gjennomgå også `sak_opprettet`, andre kravtyper og EO-opprettelse. Bare
grunnlagsscenariet er eksplisitt reprodusert i denne auditen; øvrige typer er
oppfølgingspunkter, ikke bekreftede varianter.

### AUD-04 — Middels: gammelt krav kan refereres til mens siste revisjon besvares

**Bekreftet:** Etter en ny grunnlagsrevisjon godtas et BH-svar der
`refererer_til_event_id` peker på det opprinnelige kravet. Validatoren kontrollerer
ikke denne koblingen. `enrich_event_with_version` og timeline-handleren beregner
besvart versjon fra gjeldende tilstand, ikke referansen.

Global optimistisk låsing er ikke nok: klienten kan oppgi gjeldende saksversion og
fortsatt en gammel kravreferanse. Dette gjelder den generelle hendelsesbanen.
Intern godkjenning har en ekstra kontroll av `item.claimId` mot siste krav, og
prosjekter med godkjenningspolicy blokkerer direkte `respons_*`-innsending. Disse
kontrollene begrenser eksponeringen.

**Anbefaling:** Bind responsen til en eksisterende, korrekt kravhendelse i samme
sak/spor, og kontroller at den er den revisjonen som faktisk besvares. Bevar
referansen ved replay. Undersøk også klientfeltene `grunnlag_event_id` m.fl.; et
slikt felt i grunnlagsresponsdata blir ignorert av dagens Pydantic-modell og gir
ingen beskyttelse.

### AUD-05 — Høy ved tidsavvik: replay kan endre den committede rekkefølgen

**Bekreftet med isolert hendelseslager:** En revisjon legges til som hendelse 2,
med tidsstempel ett sekund før hendelse 1. Lageret returnerer korrekt append-
rekkefølge, men `TimelineService.compute_state` sorterer etter `tidsstempel`.
Sluttresultatet blir den gamle beskrivelsen i stedet for den siste revisjonen.

Testen simulerer serverklokkeavvik; den viser ikke at klienten kan sende eget
tidsstempel (det feltet er allerede sperret). Servergenererte tider er heller ikke
en commit-sekvens: de settes før lagring, og ulike workers/klokker kan avvike.
Dette er en replay-egenskap, ikke det tidligere JSON-samtidighetsfunnet.

**Anbefaling:** Bruk den autoritative streamversjonen/rekkefølgen til state-replay.
Behold tidsstempel som metadata for visning. Undersøk eksisterende strømmer for
avvik før endringen rulles ut, siden endret replay kan endre dagens beregnede state.

### AUD-06 — Høy: godkjent brev kan merkes levert uten PDF eller kommentar

**Bekreftet uten levende Catenda:** `_resolve_pdf` returnerer ingen PDF, og
`CatendaService.create_comment` returnerer `None` (dokumentert feilverdi). Likevel
returnerer `_post_catenda_comment` True, og `_post_to_catenda` melder suksess.

Godkjenningsruten oversetter denne verdien til `delivered`; outboxen prøver ikke
jobber med denne statusen igjen. Også når kommentaren faktisk lykkes, er
`pdf_uploaded or comment_posted` utilstrekkelig til å si at selve brevet er levert.

**Anbefaling:** Kontroller svarverdien fra Catenda og registrer leveringsresultat
per sideeffekt. «Brev levert» må kreve at riktig PDF er lastet opp og koblet til
riktig topic. Dette er et funn om falsk kvittering for godkjenningspublisering;
den avtalte utsettelsen av innkommende webhook-retries til trinn 3 består.

### AUD-07 — Høy dersom matrisen skal håndheves: beløpsgrenser er kun visning

**Bekreftet:** En serverkonfigurert kjede med bare rollen Prosjektleder godkjenner
og publiserer et vederlag på 300 000 kr. `src/lib/approval/authority.ts` oppgir
200 000 kr som grense for denne rollen. UI-et varsler om utilstrekkelig fullmakt,
men backend kontrollerer verken beløp, rollegrense eller dagmulktssats.

Dette er en manglende håndhevingsmekanisme, ikke en dokumentert omgåelse av en
implementert backendgrense. En prosjektpolicy med tilstrekkelig høyt nivå i alle
kjeder kan organisatorisk redusere risikoen, men koden garanterer det ikke.

**Anbefaling:** Avklar den autoritative fullmaktspolicyen og implementer beregning/
kontroll på serveren ved pakking, godkjenning og publisering. Klientens
`authorityContext` må ikke være autoritativ. Endringer i dagmulktssats og policy
må behandles eksplisitt for allerede godkjente pakker.

## Kontroller som er OK innenfor testet omfang

| Kontroll | Resultat og bevis |
| --- | --- |
| Privat før publisering | prepare/package/approve lager ingen offentlige svarhendelser; eksisterende `test_private_until_publication_and_retry` passerer |
| Klient kan ikke erstatte beslutningskopier i brevet | Serveren erstatter innsendte item-kopier med egne ferdigstilte items; eksisterende manipulasjonstest passerer |
| Pakke låser ferdigstilt revisjon | Ny prepare på samme spor stoppes mens item er til godkjenning; eksisterende test passerer |
| Brevhash før godkjenning | Ny test endrer lagret avslutning uten å endre hash; approve avvises og streamen er urørt |
| Brevhash før publisering | Tilsvarende mutasjon etter siste godkjenning avvises før offentlig append |
| Rekkefølge i godkjenningskjeden | Saksbehandler, feil bruker og senere steg kan ikke godkjenne aktivt steg; eksisterende test passerer |
| Samtidige godkjenninger | To tråder med samme private expectedVersion og ulik commandId gir én godkjenning og én versjonskonflikt; ingen offentlige events |
| Endret krav under behandling | Ny claimId stopper godkjenning; kravendring etter siste godkjenning stopper publisering |
| Sporavhengighet i pakke | Økonomivurdering basert på ventende grunnlag kan ikke pakkes alene; grunnlag+økonomi valideres i domenerekkefølge |
| Identisk kommandoretry | Samme commandId/aktør gir ikke en ny privat overgang; gjelder identisk retry, ikke full dekning av endret body under samme ID |
| Dobbel publisering og feil etter event-commit | Stabilt persisterte event-ID-er hindrer duplikatsvar ved retry; eksisterende test simulerer feil etter vellykket append |
| Eksplisitt leveringsretry | Når dispatch faktisk returnerer failed, kan outbox leveres senere uten nye svarhendelser; avgrenses av AUD-06 |
| Offentlig brev uten private skjemafelt | Eksisterende snapshot-tester bekrefter at intern form/steps ikke serialiseres i offentlig svar |
| Tidligere sikkerhetsfikser | Lokale tester for Catenda-kontraktsrolle og event-innsending passerer fortsatt |

«OK» betyr kontrollert scenario på denne koden. Det er ikke et generelt bevis for
hele arbeidsflyten, byteidentisk PDF mellom frontend/backend, alle krasjvinduer,
flere produksjonsreplikaer eller korrekt NS 8407-anvendelse.

## Rettingslogg 2026-09-14

Brukeren har autorisert fortløpende retting av bekreftede funn. UX-valget er avklart:
**Endret godkjenningskjede eller fullmaktsgrunnlag returnerer pakken til
saksbehandler og krever ny godkjenning. Historikk og tidligere beslutninger beholdes.**

| Funn | Gjennomført retting og regresjonsbevis |
| --- | --- |
| AUD-01 | Skrivetilgang krever dagens saksbehandler-/kjedemedlemskap. Historisk deltakelse gir kun lesetilgang. Ved GET eller før neste kommando sammenlignes aktiv kjede og fullmaktsberegning. Berørte pakker returneres med systembegrunnelse, nye kladder og auditpost; tidligere brev/steg beholdes. Testet under behandling, ferdig godkjent, idempotent retur og ny pakke med ny godkjenner. |
| AUD-02 | Oppdaterte svar får samme sporkontroller som førstegangssvar, krav om tidligere svar på gjeldende krav og grunnlagslås. Regresjoner avviser låst grunnlag og oppdatering uten tidligere svar. |
| AUD-03 | Førstegangsopprettelse kan ikke erstatte eksisterende grunnlag/krav, sak eller EO. Selvstendige vederlagsvarsler kan fortsatt sendes etter spesifisert krav. Låst grunnlag kan ikke erstattes via ny opprettelse. |
| AUD-04 | Replay beregner separate krav-/svar-ID-er. Oppgitte referanser må stemme med gjeldende krav og tidligere svar; svartype og spor må stemme overens. Godkjenning sender eksplisitt kravreferanse gjennom samme validator. |
| AUD-05 | Replay følger repository-rekkefølgen. CloudEvents-lister får `streamposition`; klientens valg av siste krav følger denne fremfor veggklokke. Legacy/demo uten posisjon beholder tidsstempelsortering. Backend og frontend er testet med klokkesprang. |
| AUD-06 | Levering krever vellykket PDF-opplasting/kobling, kommentar og statussynk. `None` fra kommentar er feil. Godkjent brev kan ikke erstattes av en regenerert saksrapport hvis PDF-resolusjon feiler. Tester dekker hver delvis feil og samlet suksess. |
| AUD-07 | Serveren håndhever eksisterende januar-2026-matrise med Decimal ved pakking, godkjenning og publisering. Høyeste samlede prinsipale/subsidiære eksponering inkluderer frist × serverens dagmulktssats. Ukjente roller gir ingen økonomisk fullmakt. Tester dekker beløpsgrenser, ugyldige tall, manglende sats, manipulert klientsats og satsendring. |

### Operasjonelle konsekvenser

- Automatisk retur skjer ved neste lesing/kommando på saken, ikke via en bakgrunnsjobb.
  En gammel kommando får versjonskonflikt etter retur; klienten laster oppdatert status.
- Eldre aktive pakker uten lagret fullmaktsberegning returneres også for ny godkjenning.
  Allerede sendte pakker endres ikke.
- Hvis offentlige hendelser allerede er lagret og den private kvitteringen mangler,
  gjenopprettes pakken som sendt med outbox. Den returneres ikke og lager ikke nye
  svarhendelser. Testet ved simulert krasj etter offentlig commit og påfølgende kjedeendring.
- Dagmulktssats hentes fra `BH_APPROVAL_POLICIES[project].daily_rate` dersom angitt,
  ellers eksisterende prosjektinnstilling `settings.contract.dagmulkt_sats` på serveren.
  Klientens sats er ikke autoritativ. En fristvurdering med positiv eksponering krever
  gyldig sats. Oppslaget er testet med repository-mock; ingen DB-endring eller live DB-test.
- Matrisens rollenavn må samsvare med serverkonfigurert kjede. Eksempelvis gir
  `Prosjekteier` ingen beløpsfullmakt alene; `Prosjektleder` dekker inntil 200 000 kr.
- Ingen historiske hendelser skrives om. Nye krav-/svar-ID-felt beregnes ved replay.
  Eksisterende produksjonsstreams er ikke undersøkt for tidligere feilrekkefølge.

  > **Presisering 2026-09-15:** det finnes ingen produksjonsstreams å undersøke —
  > appen er ikke i produksjon og databasen har ingen reelle data (brukeravklaring;
  > samme forutsetning er protokollført i
  > [persistensauditen](audit-persistens-gjenoppretting-2026-09-14.md)).
  > Dette gjelder også AUD-05-anbefalingen om å «undersøke eksisterende strømmer før
  > endringen rulles ut»: replay følger nå repository-rekkefølgen, og omleggingen kunne
  > ikke endre beregnet tilstand for data som ikke finnes. Punktet gjenoppstår først
  > dersom strømmer skrives før en tilsvarende replay-endring.
- Delvis vellykket Catenda-levering kan gi gjentatte kommentarer/dokumenter ved retry.
  Dette er ikke løst av korrekt leveringskvittering; idempotens per ekstern operasjon
  og ende-til-ende-verifikasjon gjenstår som eget auditområde.

## Verifikasjon og gjenkjøring

Før retting: **187 passerte, 8 XFAIL** i opprinnelig backend-utvalg; **28 passerte**
frontendtester. Alle åtte opprinnelige reproduksjoner ble kjørt med `--runxfail`
og feilet på forventede sikkerhets-/integritetsasserts. Xfail-markeringene er nå
fjernet; testene er ordinære regresjonstester.

Etter retting:

```sh
cd backend
venv/bin/python -m pytest tests/test_approval tests/test_services/test_business_rules.py tests/test_services/test_konsekvensvarsler.py tests/test_services/test_endringsordre_service.py tests/test_services/test_forsering_service.py tests/test_models/test_sak_state_computed.py tests/test_auth/test_contract_role.py tests/test_routes/test_event_security.py tests/test_api/test_cloudevents_api.py tests/test_models/test_cloudevents.py -q -k 'not test_all_event_types_are_mapped'
```

**278 passerte, 1 eksplisitt utelatt**, fire avhengighets-/deprecation-advarsler.
Utelatt test `TestEventTypeMapping.test_all_event_types_are_mapped` feiler fordi
`internt_notat` mangler i `EVENT_TYPE_TO_DATA_MODEL`. Dette er en separat eksisterende
skjemamapping-feil, ikke en forventet feil for de rettede auditfunnene. Den samme
testen feilet identisk i en separat eksport av uendret `HEAD` (`f5d5cc0`).

Fra reporoten:

```sh
npm test -- src/lib/kontraktsbord src/lib/approval
npm run check
npm run build
```

**32 frontendtester passerte**. Typekontroll: **0 feil, 19 eksisterende advarsler**.
Produksjonsbygg passerer. Ruff på endrede produksjonsfiler og nye audit-/fullmaktstester
og `git diff --check` passerer. Testene bruker lokale isolerte lagre og mocker;
ingen Supabase/RLS- eller live Catenda-verifikasjon er utført.

## Videre oppfølging

Neste delgjennomgang: [PDF-generering og Catenda-levering](audit-pdf-catenda-2026-09-14.md).

Videre auditområder fra den opprinnelige listen: full dokument-/vedleggsflyt,
utgående Catenda-ruting på tvers av alle operasjoner, frontendfeil ved nettverksbrudd
og prosjektbytte, samt driftsoppsett/avhengigheter. Disse er ikke ferdigauditert her.
Leveringsruten bruker aktuell sakstilstand til kommentar/status, men frosset brev
til PDF; eventuell innholdsdrift ved senere retry trenger en egen ende-til-ende-test.

## Gjenopptakelse

Les dette dokumentet, de refererte testene og gjeldende git-diff før videre arbeid.
Et kontrollpunkt markert OK gjelder bare det beskrevne scenariet og den auditerte koden.
Hypoteser skal ikke rapporteres som bekreftede funn uten kodebevis/reproduksjon.
