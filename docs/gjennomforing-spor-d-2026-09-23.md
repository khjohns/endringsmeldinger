# Gjennomføring: spor D, domenefeilene — 2026-09-23

**Dato:** 2026-09-23. **Grunnlag:** `05b3aa7` (`main`), med PR 1 for BR-01
under. **Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
spor D i avsnitt 5 og radene i 4.2; [oppdraget](prompt-spor-d-br01-2026-09-23.md),
del 2; [kartleggingen av frontendens domeneregler](kartlegging-domeneregler-frontend-2026-09-23.md)
(PR 1).

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

Notatet er kort. Status for hvert funn står i hovedplanen, med en datert
merknad i raden.

## Utfall

| ID | Utfall | Commit | Belegg |
| --- | --- | --- | --- |
| TFR-02 | Rettet. Statusene besluttet av oppdragsgiver 23.09 | `23872fe` | K 23.09 |
| TFR-03 | Rettet | `5bd6da0` | K 23.09 |
| TFR-04 | Rettet | `8a64e63` | K 23.09 |
| TFR-05 | Rettet. Statusen besluttet av oppdragsgiver 23.09; to ordinære tester endret etter beslutningen | `edd794f` | K 23.09 |
| GFK-02 | Rettet. B-06 er ikke avgjort | `6caf5d8` | K 23.09 |
| INT-07 | Rettet | `98740af` | K 23.09 |
| OBS-03 | Reprodusert på enhetsnivå og rettet | `fc3bdbe` | K 23.09 |
| TFR-06 | Reprodusert, **ikke rettet**. Spørsmål 1 | `908abda` | K 23.09 |
| GFK-06 | Reprodusert, **ikke rettet**. Spørsmål 2 | `908abda` | K 23.09 |
| SD-01 | Nytt funn, lav. Reprodusert, ikke rettet | denne commiten | K 23.09 |
| SD-02 | Nytt funn, lav. Reprodusert, ikke rettet | denne commiten | K 23.09 |

**Ikke reprodusert:** ingen. OBS-03 lar seg bare reprodusere med et
tidsstempel testen lager selv; ingen kjørested gir i dag annet enn UTC.

Hver retting gjør den strenge `xfail` til XPASS, og testen er gjort om til en
ordinær test uten at assertionene er svekket. For TFR-02, TFR-03, TFR-04 og
GFK-02 ble XPASS observert før omgjøringen.

## Rettingene

### TFR-02: forsering og endringsordre fikk `INGEN_AKTIVE_SPOR`

`models/sak_state.py`, `SakState.overordnet_status` med `_forseringsstatus` og
`_endringsordrestatus`. Statusene er oppdragsgivers valg og bruker bare
verdier som finnes fra før, så frontendens `Record<OverordnetStatus, …>`,
Catenda-mappingen og PDF-etikettene dekker dem allerede (L).

- **Forsering (§ 33.8)** får aldri en lukket status. `_rule_case_not_closed`
  sperrer nye hendelser når statusen er `OMFORENT`, `LUKKET` eller
  `LUKKET_TRUKKET`, og TE kan oppdatere kostnader og stoppe etter at BH har
  svart. Ikke varslet: `UTKAST`. Varslet: `VENTER_PAA_SVAR`. Avslått:
  `UNDER_FORHANDLING`. Akseptert: `UNDER_BEHANDLING`. Stopp endrer ikke
  statusen, fordi kostnadene fortsatt skal avklares.
- **Endringsordre (§ 31.3)** er en ordre og forhandles ikke. Er TE uenig,
  føres det videre i en KOE. Utkast: `UTKAST`. Utstedt og revidert:
  `VENTER_PAA_SVAR`. Akseptert og bestridt: `LUKKET`. EO-hendelsene er
  unntatt fra sperren, så en bestridt EO kan fortsatt revideres (testet).

Frontenden viser `endringsordre_data.status` for EO og berøres ikke. For
forsering viser sakslisten `cached_status`, som nå får en meningsfull verdi.
Endringen gjør også at Catenda-synkroniseringen setter emnestatus for
forsering og EO når statusen endres (`catenda_sync_service`, L).

### TFR-03: subsidiært godkjente krav kunne ikke trekkes

`services/business_rules.py`, `_kravet_er_oppgjort`, brukt av
`_rule_vederlag_can_be_withdrawn` og `_rule_frist_can_be_withdrawn`. Et krav
som bare er godkjent subsidiært (`er_subsidiaert_vederlag`,
`er_subsidiaert_frist`), er prinsipalt avslått gjennom ansvarsgrunnlaget
og ikke oppgjort, så det kan trekkes. Godkjenner BH grunnlaget senere, er
godkjenningen ikke lenger subsidiær, og sperren gjelder igjen. NS 8407 har
ingen bestemmelse om å trekke et krav; sperren er systemets regel. Rettingen
gjelder begge pengesporene, ikke bare vederlag som reproduksjonen viste.

TE kan ikke formelt godta et subsidiært godkjent spor:
`_rule_not_already_accepted` sperrer aksept når sporet er `GODKJENT`. En
første versjon av rettingen lot aksept avslutte kravet, men den grenen kunne
ikke nås og er fjernet etter code-review. Om TE skal kunne godta byggherrens
subsidiære tall mens grunnlaget er omtvistet, er ikke avgjort.

### TFR-04: subsidiært standpunkt på 0 forsvant

`services/timeline_service.py`, `_copy_fields_if_present`: hopper nå bare
over `None`. Parameteren `require_truthy` hadde bare de to kallene som
forårsaket feilen, og er fjernet. `subsidiaer_triggers` ble kopiert etter samme
sannhetsregel i de samme håndtererne og følger nå også `is not None`.

### TFR-05: sak med avgjort grunnlag ble vist som utkast

`SakState.overordnet_status`. Er grunnlaget godkjent eller låst og resten
ikke sendt, er statusen `UNDER_BEHANDLING`, etter oppdragsgivers valg. Ikke en
lukket status, så ingen hendelser sperres. Et grunnlag som er trukket, eller der
TE har godtatt avslaget, gir fortsatt `UTKAST` (SD-02). En første versjon
regnet også et godtatt avslag som avgjort og ga `UNDER_BEHANDLING` for en sak
som er over; det er rettet etter code-review.

To ordinære tester låste `UTKAST` for nettopp dette tilfellet, og er endret
etter beslutningen:

- `tests/test_models/test_sak_state_computed.py`,
  `test_not_omforent_with_utkast_tracks`: påstanden om at saken ikke er
  `OMFORENT`, står; `== "UTKAST"` er blitt `== "UNDER_BEHANDLING"`.
- `test_sak_oppgjort_ved_godtatt_avslag_rapporteres_ikke_som_ukjent`:
  `== "UTKAST"` er blitt `== "UNDER_BEHANDLING"`. Kommentaren der viste til
  TFR-06; riktig ID var TFR-05.

### GFK-02: ny sluttdato omgikk fullmakten

`services/approval_authority.py`, `approval_route`. En ny sluttdato i et
fristsvar gir `amount=None` og krever hele kjeden, og kjeden må dekke det som
lar seg verdsette (`minimum`). Det er samme regel som for endringsordrer
(`eo_approval_service.order_exposure`): serveren kjenner ikke kontraktens
sluttdato og kan ikke verdsette datoen. Følgen er at heller ikke en
saksbehandler med ubegrenset fullmakt kan sende et slikt svar alene, og uten
konfigurert kjede kan svaret ikke sendes. Det er beholdt fordi det låser seg
framfor å slippe gjennom, og fordi endringsordrer gjør det samme (spørsmål 3).

Uten dagmulktssats er atferden uendret: dager som ikke kan verdsettes, avvises
som før (B-06 er åpen). Testen for det tilfellet påstår bare at ruten aldri
blir kortere enn kjeden, uansett hvordan B-06 avgjøres.

Frontendens `calculateAuthority` (`src/lib/approval/authority.ts`) og
`approversFor` speiler ikke dette, så forhåndsvisningen ville vist en kortere
rute enn serveren krever. Det er latent: `fristDomain.buildEventData` sender
ikke `ny_sluttdato`. Kobles datoen inn i skjemaet, må speilet rettes samtidig.

### INT-07: Catenda-kommentaren kjente ikke `standard`

`services/catenda_comment_generator.py`: oppslagene er nøklet på `SaksType`.
`koe` er fjernet; webhooken sender verdiene fra
`get_sakstype_from_topic_type`. Samme nøkkel finnes i tittelen i
`reportlab_pdf_generator.py`, men der gir reserveteksten «Krav om
Endringsordre» i stedet for «Krav om Endringsordre (KOE)». Den er ikke endret.
Søkt etter `"koe"` i `services`, `routes` og `models`: utenom generatoren og
PDF-tittelen er eneste treff aliaset i `TimelineService`, som er bevisst.

### OBS-03: `ce_time` kuttet offset

`models/cloudevents.py`, `CloudEventMixin.ce_time`: tidsstempelet
konverteres med `astimezone(UTC)`; naiv tid regnes som før som UTC. Den gamle
koden ga `…-05:00Z` for en negativ offset, en ugyldig streng. Testene er kjørt
mot den gamle koden og feilet. Latent i dag. Etter F0b kommer `timestamptz`
tilbake fra psycopg i øktens tidssone (L, ikke kontrollert her).

## Reprodusert, ikke rettet

### TFR-06: fullt svar på et nøytralt fristvarsel

Reprodusert på regelnivå: BH kan godkjenne 10 dager på et nøytralt varsel
(§ 33.4) der TE ikke har krevd dager. Sporet blir da `GODKJENT` med
`kan_utstede_eo=True` (observert med et engangsskript). Den strenge `xfail` i
`test_tilstand_forretningsregler_audit_20260918.py` påstår bare at regelen
avviser svaret.

**Spørsmål 1.** Hva skal BH kunne sende på et nøytralt varsel? Tre ting må
holdes fra hverandre:

- Svarplikten i § 33.7 oppstår først ved et begrunnet krav med antall dager.
- Innsigelse mot at varselet kom for sent, må etter § 5 tredje ledd
  fremsettes uten ugrunnet opphold, ellers anses varselet i tide. BH må altså
  kunne svare på et nøytralt varsel.
- Forespørselen etter § 33.6.2 sendes nettopp på et nøytralt varsel (DRF-01).

En sperre mot «fulle» svar må slippe de to siste gjennom. Systemet har i dag
ingen egen form for noen av dem: begge må sendes som et fristsvar med
`beregnings_resultat`, og et avslag åpner forsering (§ 33.8). Rettingen
venter derfor på hvordan innsigelsen og forespørselen skal registreres, som
henger sammen med DRF-01 og B-13.

### GFK-06: godkjent ansvar verdsettes til 0 kr

Reprodusert gjennom `ApprovalService`: en prosjektleder (200 000 kr) godkjenner
ansvaret for et krav på 50 mill. alene, og pakken godkjennes ved innsending.
Streng `xfail` i `test_godkjenning_fullmakt_audit_20260918.py`.

**Spørsmål 2.** Hvilken fullmakt kreves for å godkjenne ansvarsgrunnlaget?
Alternativer: TEs krevde beløp som grunnlag, hele kjeden, eller et fast nivå.
Etter § 34.1.1 gir en endring krav på vederlagsjustering, og etter § 33.1
krav på fristforlengelse når fremdriften hindres. Utmålingen godkjennes senere
med egen fullmakt. Valget er byggherrens fullmaktsmatrise, ikke NS 8407.

### Spørsmål 3: fullmakt når beløpet ikke kan verdsettes

Kan en saksbehandler med ubegrenset fullmakt sende alene når beløpet ikke kan
verdsettes (ny sluttdato)? I dag kreves hele kjeden, både for endringsordrer
og, etter GFK-02, for fristsvar. Er ingen kjede konfigurert, kan svaret ikke
sendes. En senior saksbehandler med en mindre senior kjede avvises også, fordi
kjeden må dekke det som lar seg verdsette.

## Nye funn

| ID | Alvorlighet | Funn | Belegg |
| --- | --- | --- | --- |
| SD-01 | Lav | Et nytt vederlags- eller fristsvar uten subsidiært standpunkt lar standpunktet fra forrige svar stå i tilstanden | K 23.09 |
| SD-02 | Lav | En sak der grunnlaget er avsluttet uten krav (trukket, eller avslaget godtatt) før andre krav er sendt, vises som `UTKAST` | K 23.09 |

### SD-01: subsidiært standpunkt fra forrige svar

`TimelineService._handle_respons_vederlag` og `_handle_respons_frist` kopierer
bare felt som ikke er `None`. Det er riktig for en delvis oppdatering
(`respons_*_oppdatert` med `original_respons_id`), men et nytt, fullt svar
arver da `subsidiaer_resultat`, `subsidiaer_godkjent_*` og
`subsidiaer_triggers` fra forrige svar. Kjørt: svar 1 avslår med 100 000 kr
subsidiært, TE reviderer, svar 2 godkjenner 80 000 kr uten subsidiært
standpunkt; tilstanden har fortsatt 100 000 kr subsidiært. Frontenden viser
`subsidiaer_godkjent_belop ?? godkjent_belop` (`derive.ts`), altså et
subsidiært standpunkt BH ikke lenger har. Journalen og brevet er riktige;
feilen er i projeksjonen. Kjørt for vederlag; fristsporet har samme kode
(L). Streng `xfail`.

### SD-02: avsluttet grunnlag vises som utkast

`SakState.overordnet_status`: når grunnlaget er trukket, kaskaderer ikke
`_handle_grunnlag_trukket` til spor som står som `UTKAST`, og `UTKAST` hindrer
`LUKKET_TRUKKET`. Det samme gjelder et grunnlag der TE har godtatt avslaget:
`UTKAST` hindrer `LUKKET_AVSLATT`. Saken vises som utkast. Streng `xfail` med en nøytral
påstand (`!= "UTKAST"`); riktig status er ikke avgjort.

## Verifikasjon og grenser

**Kjørt og observert (23.09):** `cd backend && pytest -q` etter hver retting
og til slutt: 1562 passed, 19 skipped, 41 xfailed. `ruff check backend/`: ren.
Hver reproduksjon i «Reprodusert, ikke rettet» og «Nye funn» er kjørt med
`--runxfail` og feiler med `AssertionError` på målassertionen. Lenkekontrollen
er kjørt for de endrede dokumentene. `/code-review high` er kjørt på PR-en;
funnene og hva som ble gjort med dem, står i PR-beskrivelsen.

**Lest ut av koden:** at de nye statusene for forsering og EO dekkes av
frontendens typer, Catenda-mappingen og PDF-etikettene; at
Catenda-synkroniseringen nå vil sette emnestatus for forsering og EO; at
frontendens fullmaktsberegning ikke får `ny_sluttdato`.

**Ikke kontrollert:**

- Frontendens tester er ikke kjørt; ingen frontendkode er endret.
- Catenda: emnestatusene for forsering og EO er ikke prøvd mot et Catenda-
  prosjekt, og INT-07 er bare kjørt mot generatoren, ikke mot webhooken.
- Databasen er ikke rørt; ingen migrasjon.
- Supabase-lageret: alle testene går mot testdobler eller JSON-lageret.
- Tolkningene av NS 8407 er ikke juridisk kvalitetssikret. Der en regel var
  uklar, står den som spørsmål.
- B-06 er ikke avgjort, og restansen på GFK-01 er uendret.
