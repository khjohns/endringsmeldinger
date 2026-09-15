# Audit: intern konfidensialitet, forseringsregler og testisolasjon i backend

Dato: 2026-09-15. Utgangspunkt: `a3a6d77` (main etter at forrige auditrunde ble slått sammen).
Forrige logger: [PDF og Catenda-levering](audit-pdf-catenda-2026-09-14.md),
[godkjenning og event sourcing](audit-godkjenning-event-sourcing-2026-09-14.md).

Denne runden tar det punktet forrige audit lot stå åpent — CloudEvents-mappingen for
`internt_notat` — og følger det til det det faktisk avdekket: hendelsestypen er
dokumentert som intern, men ingenting håndhevet det. Deretter forseringssporet, som
var det gjenstående sporet uten tilstandsregler.

## Omfang

Kontrollert: lesepunktene for hendelser (`/api/cases/<id>/{timeline,context,state,historikk}`
og kontekstrutene for EO/forsering), utgående Catenda-levering fra innsendingsruten,
forretningsreglene i `services/business_rules.py` for forseringssporet, og de fem røde
testene i baselinen.

Utenfor omfang: Supabase/RLS, dokument- og vedleggsflyten, driftsoppsett, og
webhookens durable outbox (ligger til trinn 3 i [Catenda-dataflyten](catenda-dataflyt.md)
og er utsatt etter avtale). Ingen tokens, produksjonsdata eller eksterne tjenester er
lest; ingen live Catenda- eller Supabase-kall er gjort.

Alle funn under er reprodusert med en test som feilet før retting. Alvorlighet angir
mulig konsekvens under de beskrevne forutsetningene, ikke at noe er observert i
produksjon. Dette er en kodeaudit, ikke en juridisk vurdering av NS 8407.

## Bekreftede funn og rettinger

### BE-01 — Høy: motpartens interne notater var lesbare fra hendelsespunktene — rettet

`EventType.INTERNT_NOTAT` er dokumentert som «kun synlig for egen organisasjon»
(`models/events.py:822`, `src/lib/types/timeline.ts:644`). Ingen kode håndhevet det.

Hendelsen lagres i sakens felles strøm. `to_cloudevent()` (`models/cloudevents.py:210`)
legger hele `data`-nyttelasten på svaret, og `_get_event_summary`
(`lib/cloudevents/http_binding.py`) legger i tillegg selve notatteksten i
`summary`-attributtet. Lesepunktene er beskyttet av `@require_auth` og
`@require_project_access()`, men **ikke** av `require_contract_role` — prosjektmedlemskap
er nok. Begge kontraktsparter er medlemmer av samme prosjekt; det er hele premisset for
samarbeidet. BH leste altså TEs interne vurderinger, og omvendt.

Reprodusert med to lesepunkter (`timeline`, `context`) der en BH-leser fikk teksten
«Internt: vårt krav står svakt på årsakssammenheng.» ordrett i svaret.

`lib/auth/event_visibility.py` innfører nå `visible_events()`, brukt i `event_routes`
(timeline og context) og i `related_cases_utils` (EO- og forseringskontekst). Notatet
fjernes i sin helhet, ikke bare teksten: at en part har gjort en intern vurdering er i
seg selv opplysning motparten ikke skal ha.

Regelen er fail-closed. Kan ikke leserens TE/BH-tilknytning bekreftes — manglende
rolle, feilende medlemsoppslag, eller en prosjektrolle uten partstilknytning — skjules
notatet. Det gjelder også lokalt med `DISABLE_AUTH`, fordi det da ikke finnes noe
partsskille å bygge på. Feil i medlemsoppslaget skjuler notatet i stedet for å bryte
lesingen av saken.

Filteret er lagt på **serialiseringen**, ikke på `_fetch_and_parse_events`. Første
forsøk filtrerte før `compute_state`, og en egen test viste hvorfor det er galt: en sak
der alle synlige hendelser faller bort gir tom liste og HTTP 500. Tilstand skal utledes
av hele strømmen uansett hvem som leser. Notatene påvirker uansett ikke tilstanden —
`TimelineService._handle_internt_notat` er en no-op.

### BE-02 — Middels: internt notat utløste utgående Catenda-levering — rettet

`submit_event` kaller `_post_to_catenda` for enhver hendelsestype når integrasjonen er
på og saken har en topic. For et internt notat betød det at en **servergenerert
saksrapport-PDF** ble lastet opp og koblet til den delte BCF-topicen, sammen med en
kommentar med overskriften «Internt Notat». Notatet fikk dessuten en
leveringskvittering, som ville gitt et permanent synkfeil-banner om leveringen feilet.

Reprodusert med en innsendingstest som viste at leveringshjelperen ble kalt.

Interne notater hoppes nå over: ingen levering, ingen kvittering, og
`catenda_skipped_reason: "internal_note"` i svaret. En kontrolltest i samme fil holder
fast at ordinære hendelser fortsatt leveres.

Frontendens synkfeilbanner utløses kun av `catenda_skipped_reason === 'error'`
(`src/lib/kontraktsbord/context.svelte.ts:94`), så den nye årsaken gir ingen falsk
advarsel. Unionstypen i `src/lib/api/events.ts` er utvidet med verdien — det er den
eneste frontendendringen i denne runden, og den er en ren kontraktsoppdatering.

### BE-03 — Middels: forseringssporet hadde ingen tilstandsregler — rettet

`_get_rules_for_event` hadde ingen oppføring for noen `FORSERING_*`-type. Sporet fikk
bare fellesreglene, og `_rule_create_once` dekker `grunnlag`, `vederlag`, `frist`,
`sak_opprettet` og `eo_opprettet` — ikke forseringens opprettelsestype. Dette er
oppfølgingen AUD-03 ba om: «Krev gyldig starttilstand for alle
opprettelses-/førstegangs-typer … øvrige typer er oppfølgingspunkter.»

Fem scenarioer ble godtatt før retting og avvises nå:

| Scenario | Ny regel |
| --- | --- |
| Nytt forseringsvarsel i en sak som allerede har varsel | `NOT_ALREADY_NOTIFIED` |
| BH svarer på en forsering som aldri er varslet | `FORSERING_NOTIFIED` |
| Forsering stoppes uten varsel | `FORSERING_NOTIFIED` |
| Forsering stoppes to ganger | `NOT_ALREADY_STOPPED` |
| Påløpte kostnader oppdateres uten varsel | `FORSERING_NOTIFIED` |

I tillegg krever `FORSERING_VARSEL` nå en forseringssak (`IS_FORSERING_CASE`), etter
mønster av `_rule_is_eo_case`. Uten den ville et varsel i en vanlig KOE-sak bli lagret
som en hendelse uten virkning — `TimelineService` ignorerer forsering-hendelser når
`forsering_data` mangler — altså en stille nullhendelse i en juridisk logg.

Dobbelt stopp er tatt med fordi det gir to stoppdatoer og to sett påløpte kostnader i
samme sak. Kostnadsoppdatering **etter** et stopp er derimot ikke blokkert: å korrigere
påløpte kostnader i etterkant er en plausibel handling, og det finnes ikke
kontraktsgrunnlag i koden for å forby den. Det er en bevisst avgrensning, ikke en
forglemmelse.

### BE-04 — Middels: forseringsrutene gikk utenom forretningsreglene — rettet

`BusinessRuleValidator` brukes bare fra `event_routes` og `approval_routes`. De
dedikerte `/api/forsering/*`-rutene går via `ForseringService`, som skrev rett til
hendelseslageret. Samme hendelse kunne dermed bli avvist av `/api/events` og godtatt av
forseringsruten — reglene i BE-03 ville bare beskyttet den ene veien.

Reprodusert: `stopp_forsering` lagret et stopp for en sak som aldri var varslet.

`ForseringService._validate_event` kjører nå reglene før hvert av de tre
append-punktene (`registrer_bh_respons`, `stopp_forsering`, `oppdater_kostnader`) og
kaster `ValueError` ved brudd. Rutene har allerede `@handle_service_errors`, så bruddet
kommer ut som HTTP 400 `VALIDATION_ERROR`. Ingen eksisterende forseringstest måtte
endres for å passere — den eneste testen som brøt, var den som fastholdt det gamle
avviket, og den er skrevet om til å kreve den nye oppførselen.

### BE-05 — Lav: `internt_notat` manglet i CloudEvents-skjemamappingen — rettet

Det åpne punktet fra forrige audit. `EVENT_TYPE_TO_DATA_MODEL` er nå uttømmende;
`internt_notat` peker på `InterntNotatData`. Den eksisterende testen
`test_all_event_types_are_mapped` holder mappingen uttømmende videre. Det publiseres et
JSON-skjema (feltnavnene `tekst` og `spor`), ikke innhold.

## Testfunn som ikke var produksjonsfeil

Tre av de fem røde testene var testproblemer, ikke feil i koden. De er skilt ut her
fordi forskjellen har betydning for hva som faktisk var galt.

**`test_webhook_with_valid_path_succeeds`.** Ruten bygger tjenesten via
`get_webhook_service()` (DI), mens testen erstattet `app.system`. Mocken nådde derfor
aldri ruten, som forsøkte å bygge en ekte Catenda-klient og svarte 500. Testen treffer
nå riktig punkt og kontrollerer i tillegg at hendelsen faktisk ble dispatchet.

Samme fixtur (`mock_system` i `conftest.py`) ga `catenda_client_secret`, som fikk
`SystemContext._authenticate` til å gjøre et **ekte kall til `api.catenda.com`** ved
oppsett. Fixturen gir nå et lagret token i stedet. Hele suiten går etter dette uten
nettverkstilgang — verifisert ved at ingen kjøring nevner `api.catenda.com` eller
«Autentisering feilet».

**De to CSRF-testene.** `/api/csrf-token` er `@require_auth`, så testene fikk 401. Det
er riktig oppførsel. Den ene testen krevde dessuten at tokenet roterer per forespørsel,
mens `lib.auth.session.csrf_valid` sammenligner headeren mot sesjonens lagrede
`csrf_token`: et roterende token ville aldri validere. Testen krevde altså noe som
ville vært en feil. Begge er skrevet om til den kontrakten koden faktisk har —
innlogging kreves, tokenet er sesjonsbundet og stabilt, og svaret er `no-store`.

**`test_missing_comment_has_no_durable_retry`.** Testen skulle dokumentere at en
kommentarfeil etter commit ikke etterlater noen fullførbar oppgave, men Catenda var
avslått i testmiljøet, så kommentargrenen ble hoppet over og feilbanen aldri rørt.
Integrasjonen slås nå på i testen, slik at den faktisk treffer scenarioet. **Den
underliggende mangelen er ikke rettet** — den er utsatt etter avtale (trinn 3).

## Kontroller som passerer / avgrensninger

| Kontroll | Bevis / avgrensning |
| --- | --- |
| Notatteksten nådde aldri Catenda som kommentartekst | `CatendaCommentGenerator.generate_comment` bygger overskrift, statusoppsummering og neste steg; den leser ikke `data.tekst`. Lekkasjen i BE-02 var overskriften, kvitteringen og den vedlagte saksrapporten — ikke notatteksten. |
| Historikkpunktene lekker ikke notater | `get_*_historikk` filtrerer på eksplisitte tillatelseslister av hendelsestyper; `internt_notat` er ikke med i noen av dem. Ikke endret. |
| Batch-innsending leverer ikke til Catenda | `submit_batch` har ingen Catenda-kode; BE-02 gjelder bare enkeltinnsending. |
| Beregnet tilstand er upåvirket av filteret | Filteret er lagt etter `compute_state`; `_handle_internt_notat` er dessuten en no-op. Verifisert med egen test for den tomme-liste-feilen første utkast innførte. |
| `streamposition` tåler filtrering | Frontenden bruker feltet kun til relativ sortering (`src/lib/utils/timelineOrder.ts`), ikke som stabil identifikator. |
| Analytics-tidslinjen | `/api/analytics/timeline` aggregerer kun antall per periode og returnerer ingen hendelsesinnhold. Et internt notat øker en telling med én. Dette er **ikke** rettet og regnes som akseptert restsignal. |
| Eksisterende forseringsflyt | Alle eksisterende forseringstester passerer uendret etter BE-03/BE-04. |

## Gjenstående og avklaringer

- **Durable outbox for webhookens sideeffekter** står fortsatt åpent (trinn 3, utsatt
  etter avtale). Testen dokumenterer nå mangelen reelt i stedet for å hoppe over den.
- **`generate_csrf_token` og `validate_csrf_token` er død kode.** Den levende
  CSRF-banen er sesjonsbundet (`lib/auth/session.csrf_valid`); HMAC-funksjonene kalles
  ikke fra produksjonskode. `routes/utility_routes.py:17` importerer
  `generate_csrf_token` uten å bruke den — ruff bekrefter med `F401`. Modulen kan ikke
  bare slettes, siden `require_csrf` bor der og er i bruk. Tre tester dekker fortsatt de
  døde funksjonene og gir inntrykk av at de er implementasjonen. Ikke rørt her: å fjerne
  noe som heter CSRF er en beslutning brukeren bør ta.
- **`internt_notat` har ingen opprettelsesflate i frontend.** Typen er definert og får
  en etikett (`eventTypeLabels.ts`), så et notat ville blitt vist, men ingen rute
  oppretter et. BE-01 var derfor latent: skrive- og lesebanen i backend er fullt koblet,
  og lekkasjen ville inntruffet i det første notat ble opprettet — via API-et i dag,
  eller via en fremtidig UI.
- **`FORSERING_KOE_LAGT_TIL` / `FORSERING_KOE_FJERNET`** har fortsatt ingen
  «er dette en forseringssak»-regel, slik EO-motpartene har. Dette er *ikke* undersøkt
  eller reprodusert i denne runden, og skal ikke leses som at det er i orden.
- **Forsering er fortsatt halvferdig**: backend har ruter og tjeneste, men
  frontendgeneratoren er ikke koblet til noen rute.
- **18 eksisterende ruff-feil** i backend er uendret (samme antall før og etter denne
  runden). De nye og endrede filene er rene.

## Verifikasjon

```sh
cd backend && python3 -m pytest -q
```

Resultat: **1187 passerer, 0 feiler** (baseline var 1161 passerte / 5 feilet).
De nye og endrede testfilene alene: 56 passerer.

Ruff på alle nye og endrede filer: rent. `git diff --check`: rent. Ruff på
`services/ routes/ lib/ tests/`: 18 feil både før og etter — alle eksisterende.

Frontend er kun berørt av den ene typeutvidelsen beskrevet i BE-02, og baselinen
holder: 501 tester / 42 filer passerer, `npm run check` gir 0 feil og 10 advarsler,
`npm run lint` er grønn, og `npm run build` passerer.

Ingen live Catenda- eller Supabase-kall. Suiten går nå uten nettverkstilgang i det
hele tatt — det var ikke tilfelle før denne runden.

Ved gjenopptakelse: les denne loggen sammen med de to forrige, og merk at «OK» gjelder
de konkrete scenariene i tabellen over, ikke full sikkerhet for hele systemet.
