# Dataflyt mellom Catenda og endringsmeldingsappen

Dette dokumentet beskriver både målarkitekturen og avvik fra dagens kode, med
`backend/scripts/test_full_flow.py` som utgangspunkt. Diagrammene skiller mellom
Catenda Project API v2, OpenCDE/BCF API-et og appen sitt eget API.

> Viktig begrepsskille: Catenda bruker `project_id` om det ordinære
> Catenda-prosjektet i v2-API-et. I BCF API-et heter et topic board også
> `project` og identifiseres med et eget `project_id`. I dette dokumentet
> brukes derfor `catenda_project_id` og `topic_board_id`.

## 1. Ressurshierarki og API-grenser

```mermaid
flowchart TB
    CRED["Én teknisk OAuth-klient for Oslobygg KF<br/>client_id + secret / access token"]
    TOKEN["Felles Bearer access token<br/>tilgang til prosjekt 1..n"]

    subgraph BACKEND["Endringsmeldingsappen"]
        ROUTER["Webhook-ruter<br/>finner riktig prosjekt"]
        REG[("Prosjektregister")]
        CFG["Én konfigurasjon per prosjekt<br/>internal_project_id<br/>catenda_project_id<br/>topic_board_id(s)<br/>library_id + folder_id"]

        ROUTER --> REG
        REG --> CFG
    end

    subgraph CATENDA["Catenda API"]
        direction TB

        P["Catenda-prosjekter 1..n<br/>unik catenda_project_id"]

        subgraph BCF["OpenCDE BCF 3.0"]
            B["Topic board / saksliste<br/>topic_board_id<br/><small>kalles project_id i BCF</small>"]
            EXT["Board-konfigurasjon<br/>typer, statuser og custom fields"]
            T["Topic / sak<br/>topic_guid"]
            C["Kommentarer<br/>inkl. lenke til appen"]
            DR["Document references<br/>kobling topic ↔ dokument"]
            RT["Related topics<br/>kobling topic ↔ topic"]

            B --> EXT
            B --> T
            T --> C
            T --> DR
            T --> RT
        end

        subgraph DOC["Project API v2 / dokumentbibliotek"]
            L["Library<br/>library_id"]
            F["Mappe<br/>folder_id, valgfri"]
            D["PDF-dokument<br/>library_item_id"]

            P --> L
            L --> F
            F --> D
        end

        WH["Webhook-abonnement<br/>per Catenda-prosjekt og eventtype<br/>med unik routingnøkkel i target path"]

        P --> B
        P --> WH
        D -. "document_guid" .-> DR
        RT -. "related_topic_guid" .-> T
    end

    CRED -->|"GET /oauth2/authorize eller client credentials"| TOKEN
    TOKEN -->|"Authorization: Bearer …"| P
    TOKEN --> B
    WH -->|"issue.created<br/>issue.modified er valgfri audit"| ROUTER
    CFG -. "velger riktig board, library og folder" .-> P
```

Den viktigste koblingen mellom de to API-familiene er at topic board-detaljene
inneholder `bimsync_project_id`. Dokumentet lastes opp under dette v2-prosjektet,
mens referansen til dokumentet opprettes under topic-et i BCF API-et.

Det interne `prosjekt_id` bør ikke være det samme feltet som Catendas ID.
Prosjektregisteret kobler appens stabile prosjekt-ID til Catendas prosjekt,
ett eller flere godkjente topic boards og målbibliotek/mappe. Navnekonvensjoner
kan brukes ved onboarding og validering, men flyten bør bruke lagrede GUID-er
etter at prosjektet er konfigurert.

### Oppsett og synkronisering av prosjektregisteret

```mermaid
flowchart LR
    A["Felles Bearer token"]
    P["GET /v2/projects<br/>alle tilgjengelige Catenda-prosjekter"]
    B["GET /opencde/bcf/3.0/projects<br/>?bimsync_project_id={id}"]
    J["Velg og valider prosjektets<br/>topic board(s)"]
    L["GET /v2/projects/{id}/libraries<br/>velg library og eventuelt folder"]
    R[("Lagre prosjektkonfigurasjon<br/>med faktiske GUID-er")]
    W["POST /v2/projects/{id}/webhooks/user<br/>ett abonnement per eventtype<br/>unik target path per prosjekt"]

    A --> P
    A --> B
    P --> J
    B --> J
    J --> L --> R --> W
```

Dette kan kjøres som en kontrollert onboarding/synkronisering. Navn brukes til
å foreslå riktig topic board, library og mappe, men en administrator bør kunne
bekrefte valgene. Den ordinære webhook- og sendeflyten bruker deretter GUID-ene
fra prosjektregisteret og er ikke avhengig av at navn forblir uendret.

## 2. Opprettelse og første lenke til appen

Dette er produksjonsflyten i webhook-ruten. Catenda-brukeren oppretter topic-et
i Catenda UI; appen oppretter ikke topic-et i denne delen av flyten.

```mermaid
sequenceDiagram
    autonumber
    actor U as Bruker (TE/BH)
    participant UI as Catenda UI
    participant CAT as Catenda webhook-tjeneste
    participant WH as Backend<br/>POST /webhook/catenda/{project_hook_key}
    participant API as Catenda BCF/v2 API
    participant REG as Prosjektregister
    participant DB as Event store + sak_metadata
    participant APP as Endringsmeldingsappen

    U->>UI: Velger prosjekt og topic board
    U->>UI: Oppretter topic med støttet topic type
    UI->>CAT: Topic lagres
    CAT->>WH: issue.created

    WH->>WH: Valider opaque target path og payload
    WH->>REG: Slå opp project_hook_key
    REG-->>WH: internal_project_id + Catenda-prosjekt<br/>+ tillatte boards + library/folder
    WH->>WH: Hent topic-ID og eventuell board-ID fra callback
    WH->>API: Finn/valider topic board blant prosjektets boards
    API-->>WH: board-ID + bimsync_project_id

    alt Prosjekt/board er ikke konfigurert
        WH->>WH: Avvis eller parker eventet og varsle drift
    else Prosjektet er konfigurert
        WH->>API: GET topic-detaljer
        API-->>WH: Tittel, type, forfatter og custom fields
        WH->>WH: Filtrer på topic board og topic type

        WH->>API: GET Catenda-prosjekt
        API-->>WH: Prosjektnavn

        WH->>DB: Atomisk opprett metadata + SakOpprettetEvent<br/>under internal_project_id
        WH->>WH: Generer sak_id og magic link
        WH->>API: POST kommentar på riktig topic
        API-->>UI: Kommentar med «Åpne skjema»-lenke
    end

    U->>UI: Klikker lenken i kommentaren
    UI->>APP: Åpner sak med magicToken
    APP->>DB: Henter kontekst, state og tidslinje via backend
```

Webhook-eventet heter `issue.created`. `bcf.issue.created` og
`bcf.comment.created` er ikke dokumenterte abonnementsevents. Dagens route har
aliaser for dem, men strukturvalidatoren avviser dem før dispatch.

Den lokale OpenAPI-filen dokumenterer opprettelse og administrasjon av
abonnementer, men ikke JSON-kontrakten Catenda sender til callback-URL-en. En
ekte `issue.created` må derfor fanges og lagres som test-fixture før feltnavnene
for topic, board, prosjekt og event-ID låses. Den unike routingnøkkelen i
abonnementets target path gjør at fysisk prosjekt kan identifiseres uten å
stole på et udokumentert payload-felt. Board fra payload/API kryssjekkes alltid
mot prosjektregisteret.

## 3. Innsending, PDF og synkronisering tilbake til Catenda

```mermaid
sequenceDiagram
    autonumber
    actor U as Bruker (TE eller BH)
    participant APP as Frontend
    participant BE as Backend
    participant DB as Draft store + event store + metadata
    participant PDF as PDF-generator
    participant DOC as Catenda Document API v2
    participant BCF as Catenda BCF 3.0 API
    participant WH as Backend webhook

    U->>APP: Fyller ut eller reviderer skjema

    alt Bruker velger «Lagre utkast»
        APP->>BE: Lagre muterbart utkast
        BE->>DB: Opprett/oppdater utkast under riktig prosjekt og sak
        BE-->>APP: Utkast lagret
        Note over BE,BCF: Ingen PDF, kommentar eller statusendring i Catenda
    else Bruker velger «Send»
        APP->>BE: Formelt domene-event + expected_version<br/>+ valgfri ferdig PDF
        BE->>BE: Valider auth, CSRF, prosjektrolle,<br/>event og forretningsregler
        BE->>DB: Les gjeldende event-versjon
        DB-->>BE: Events + current_version
        BE->>DB: Lagre domene-event<br/>(optimistisk låsing)
        BE->>DB: Oppdater cached state og avslutt utkast

        alt Frontend sender ferdig PDF
            BE->>PDF: Dekod klientgenerert PDF
        else Ingen klient-PDF
            BE->>PDF: Generer PDF med ReportLab
        end

        BE->>DB: Hent prosjektets Catenda-konfigurasjon
        BE->>DOC: POST PDF til prosjektets document-library/folder
        DOC-->>BE: library item id (kompakt UUID) + revisjon
        BE->>BE: Normaliser ID til BCF document_guid-format
        alt Første dokument eller eget unikt filnavn
            BE->>BCF: POST document_reference på riktig topic
        else Samme dokumentnavn finnes og failOnDocumentExists=false
            BE->>BCF: Gjenbruk eksisterende document reference
        end
        BE->>BCF: POST kommentar med resultat og ny app-lenke

        opt Intern status er endret
            BE->>BCF: GET topic (behold påkrevde felt)
            BE->>BCF: PUT topic med mappet topic_status
        end

        BCF-->>WH: issue.modified / kommentarhendelse
        WH->>WH: Finn saken og logg endringen<br/>uten å lage nytt domene-event
        BE-->>APP: Ny state, versjon og Catenda-dokument-ID
    end
    APP-->>U: Oppdatert sak og tidslinje
```

Samme sendeløkke gjentas for TE og BH. Appens eventlogg er sannhetskilden for
saksstatus. Endringer som bare utføres direkte i Catenda logges av webhooken,
men endrer ikke appens domenetilstand. Et utkast er app-intern arbeidsdata og
skal ikke fremstå som en formell meddelelse i hendelsesforløpet.

## 4. Statusflyt

```mermaid
stateDiagram-v2
    [*] --> UnderVarsling: Topic opprettet
    UnderVarsling --> Sendt: TE sender varsel/krav
    Sendt --> VenterPaaSvar
    VenterPaaSvar --> UnderBehandling: BH behandler
    UnderBehandling --> UnderForhandling: Delvis godkjent / avvist / revidert
    UnderForhandling --> VenterPaaSvar: Ny revisjon sendes
    UnderForhandling --> Omforent: Partene blir enige
    Omforent --> Lukket: Saken avsluttes
    UnderVarsling --> Lukket: Saken trekkes

    UnderForhandling --> Lukket: Saken avsluttes uten omforening
```

Intern status mappes til Catenda-statusene `Under varsling`, `Sendt`,
`Venter på svar`, `Under behandling`, `Under forhandling`, `Omforent` og
`Lukket`.

«Enighet om uenighet» trenger ikke egen status. Utfallet kan beskrives i det
avsluttende eventet, PDF-en og Catenda-kommentaren, mens Catenda-status settes
til `Lukket`. `Omforent` brukes når partene faktisk er enige.

## 5. Toveis synlige saksrelasjoner

Den kanoniske relasjonen i appen går fra en Endringsordre eller Forsering til
de underliggende KOE-sakene. Reverse oppslag gjør at relasjonen også vises fra
KOE-siden. Catenda-spesifikasjonen garanterer ikke at en relasjon blir synlig
fra begge topics. Inntil dette er kontrakttestet, opprettes den eksplisitt fra
begge sider for å oppfylle brukerkravet.

```mermaid
flowchart LR
    EO["EO / Forsering<br/>source_sak_id"]
    REL[("sak_relations<br/>én kanonisk relasjon")]
    KOE["KOE<br/>target_sak_id"]

    EO --> REL --> KOE
    EO -. "forward lookup" .-> KOE
    KOE -. "reverse lookup" .-> EO

    CET["Catenda EO-/Forsering-topic"]
    CKT["Catenda KOE-topic"]
    CET -->|"GET → union → PUT related_topics"| CKT
    CKT -->|"GET → union → PUT related_topics"| CET
```

`related_topic_guid` skal alltid være Catendas topic GUID, aldri appens
`sak_id`. Catendas OpenAPI sier ikke eksplisitt om `PUT related_topics` legger
til eller erstatter samlingen. GET–union–PUT hindrer tap av eksisterende
relasjoner dersom PUT følger BCF-semantikken for full samlingsoppdatering.

## 6. Catenda-endepunkter brukt i denne flyten

Alle endepunkter har base URL `https://api.catenda.com`.

| Formål | Metode og endepunkt |
|---|---|
| OAuth-dialog | `GET /oauth2/authorize` |
| Hent/veksle token | `POST /oauth2/token` |
| Valider innlogget Catenda-bruker | `GET /opencde/foundation/1.0/current-user` |
| List brukerens Catenda-prosjekter | `GET /v2/projects` |
| Hent Catenda-prosjekt | `GET /v2/projects/{catenda_project_id}` |
| List topic boards | `GET /opencde/bcf/3.0/projects?bimsync_project_id={catenda_project_id}` |
| Hent topic board | `GET /opencde/bcf/3.0/projects/{topic_board_id}` |
| Hent typer og statuser | `GET /opencde/bcf/3.0/projects/{topic_board_id}/extensions` |
| Hent board + custom fields | `GET /v2/projects/{catenda_project_id}/issues/boards/{topic_board_id}?include=customFields,customFieldInstances` |
| List/opprett topics | `GET/POST /opencde/bcf/3.0/projects/{topic_board_id}/topics` |
| List topics på tvers av boards i prosjekt | `GET /opencde/bcf/3.0/bimsync-projects/{catenda_project_id}/topics` |
| Hent/oppdater topic | `GET/PUT /opencde/bcf/3.0/projects/{topic_board_id}/topics/{topic_guid}` |
| List/opprett kommentarer | `GET/POST /opencde/bcf/3.0/projects/{topic_board_id}/topics/{topic_guid}/comments` |
| List biblioteker | `GET /v2/projects/{catenda_project_id}/libraries` |
| List mapper / last opp dokument | `GET/POST /v2/projects/{catenda_project_id}/libraries/{library_id}/items` |
| List/opprett dokumentreferanser | `GET/POST /opencde/bcf/3.0/projects/{topic_board_id}/topics/{topic_guid}/document_references` |
| List/opprett topic-relasjoner | `GET/PUT /opencde/bcf/3.0/projects/{topic_board_id}/topics/{topic_guid}/related_topics` |
| List/opprett webhooks | `GET/POST /v2/projects/{catenda_project_id}/webhooks/user` |
| Slett webhook | `DELETE /v2/projects/{catenda_project_id}/webhooks/user/{webhook_id}` |

## 7. Hvordan `test_full_flow.py` avviker fra produksjonsflyten

Testscriptet verifiserer autentisering, prosjekt, library/folder, topic board,
board-oppsett, webhooks, kommentarer, statuser, PDF-referanser og relasjoner mot
Catenda. Topic-et opprettes også via BCF API-et.

Selve opprettelsen av app-saken går imidlertid direkte til repository- og
eventlaget i `_create_case_directly()`. Scriptet lager `sak_metadata`, lagrer
`SakOpprettetEvent`, genererer magic link og poster første kommentar selv. Det
tester dermed resultatet webhooken skal produsere, men går ikke gjennom
`POST /webhook/catenda/{secret}`. En separat ende-til-ende-test bør opprette
topic-et og vente på at Catenda faktisk leverer `issue.created`.

## 8. Besluttet målarkitektur og nødvendige kodeendringer

| Område | Beslutning | Avvik i dagens kode |
|---|---|---|
| Catenda-identitet | Én teknisk OAuth-klient med tilgang til alle relevante Oslobygg-prosjekter | Tokenet er allerede globalt, men prosjektressursene er også globale |
| Prosjektruting | Webhooken utleder Catenda-prosjekt fra boardet og slår opp intern prosjektkonfigurasjon | Webhooken bruker globale innstillinger og `ALLOWED_BOARD_IDS` er hardkodet |
| Prosjektkonfigurasjon | Hvert internt prosjekt lagrer egne `catenda_project_id`, `topic_board_id(s)`, `library_id` og `folder_id` | `Settings` har bare ett sett med ID-er for hele backend-instansen |
| Utkast | Lagres kun i appen og kan endres uten Catenda-synk | Egen utkastflyt finnes ikke i den undersøkte event-ruten |
| Send | Oppretter formelt event, PDF, dokumentreferanse, kommentar og eventuell statusendring | `POST /api/events` forsøker Catenda/PDF ved hvert event |
| Status | Appens eventlogg er autoritativ; Catenda-endringer importeres ikke | Samsvarer i hovedsak med dagens webhook-håndtering |
| Avslutning uten enighet | Bruk eksisterende `Lukket`; beskriv utfallet i event/PDF/kommentar | Krever et tydelig avslutnings-event eller avslutningsårsak |
| Saksrelasjoner | Lagres én gang kanonisk i appen, vises begge veier og opprettes begge veier i Catenda | Intern reverse-indeks finnes; Catenda-kallene må være konsekvent toveis |

Prosjektets eksisterende `projects.settings` kan teknisk lagre Catenda-ID-ene,
men en egen, validert `catenda_project_config`-modell/tabell vil gi sikrere
oppslag og unikhetskrav. Minstekravet er unik indeks på `catenda_project_id` og
`topic_board_id`, slik at et webhook-event aldri kan rutes til mer enn ett
internt prosjekt.

## 9. Funn fra kontroll mot lokal Catenda OpenAPI

Disse punktene bør håndteres før integrasjonen brukes med flere prosjekter:

| Prioritet | Funn | Konsekvens / anbefaling |
|---|---|---|
| Kritisk | Callback-payloaden er ikke beskrevet i webhook-OpenAPI | Fang et ekte `issue.created`, opprett fixture og bruk unik prosjekt-routingnøkkel i target path |
| Kritisk | Topic `PUT` nullstiller utelatte BCF-felter | Statusoppdatering må hente og bevare blant annet type, labels, priority, assigned_to, stage og due_date |
| Kritisk | Webhooken reserverer event-ID før behandling og returnerer HTTP 200 også ved `{success:false}` | Bruk en varig inbox/UoW, marker event fullført etter suksess og skill permanente avvisninger fra retriable feil |
| Høy | Dagens sendeflyt henter `project_id`, `library_id` og `folder_id` globalt | Slå opp alle tre fra saken sitt interne prosjekt |
| Høy | Samme PDF-navn med `failOnDocumentExists=false` lager ny revisjon | Åpent ADR-valg: samlet saksdokument eller separate brev med revisjonsløp per part og spor; lagre uansett library item-ID og document-reference-GUID |
| Høy | Klienten antar at `POST document_references` returnerer objekt, mens OpenAPI viser liste | Normaliser både liste- og objektrespons defensivt |
| Høy | EO-/Forseringstjenestene sender flere steder interne `sak_id`-er som `related_topic_guid` | Slå alltid opp Catenda topic GUID fra metadata før Catenda-kallet |
| Middels | Library fallback kan velge første bibliotek uansett type | Tillat bare library med `type=document`; håndter paginering |
| Middels | Revisjonens `document.filename` settes til tilfeldig tempfilnavn | Sett både dokumentnavn og revisjonsfilnavn til ønsket PDF-navn |
| Middels | Mappeoppretting mangler top-level `type: folder` fra skjemaet | Send både top-level type og `document.type` |
| Lav | DELETE webhook er dokumentert med HTTP 200, mens mixinen bare godtar 204 | Godta dokumentert 200-respons, eventuelt også 204 defensivt |
| Lav | Klienten sender udokumentert `name` ved opprettelse av webhook | Fjern feltet eller bekreft det i en kontrakttest |

To forhold må kontrakttestes mot et testprosjekt fordi OpenAPI-en ikke er
entydig: om `PUT related_topics` er additiv eller erstatter hele samlingen, og
om en enkelt relasjon automatisk blir synlig fra begge topics.

## 10. Tester før produksjonsimplementasjon

### P0 – kontrakttester mot Catenda-testprosjekter

1. **Fang reell webhook-payload:** Opprett topic i to ulike Catenda-prosjekter
   og lagre komplette, anonymiserte `issue.created`-payloads som fixtures.
   Verifiser topic-, board-, prosjekt- og event-ID-feltene samt compact/dashed
   GUID-format.
2. **Webhook-leveranse:** Mål timeout og retry ved 500/timeout, kontroller om
   samme event-ID gjenbrukes, og verifiser når abonnementets `failureCount` og
   state endres. Test at unik target path faktisk identifiserer prosjektet.
3. **Topic-status uten datatap:** Opprett et topic med type, labels, prioritet,
   ansvarlig, stage, beskrivelse og due date. Oppdater bare appstatus og
   kontroller at samtlige øvrige felt er uendret.
4. **Dokumentkontrakt:** Last opp første PDF og samme filnavn på nytt. Registrer
   faktisk responsform, library item-ID, revisjons-ID og antall document
   references. Gjenta med unikt filnavn. Dette gir faktagrunnlaget for ADR-et
   om samlet dokument kontra separate brev.
5. **Related topics:** Opprett A→B, les relasjoner fra både A og B, legg deretter
   til A→C og kontroller at A→B ikke forsvinner. Gjenta på tvers av to boards i
   samme Catenda-prosjekt. Bruk bare Catenda topic GUID-er.
6. **Teknisk identitet:** For hvert prosjekt, verifiser tilgang til konfigurert
   board og document-library samt rettighetene createComment, update,
   updateDocumentReferences og updateRelatedTopics.

### P0 – integrasjons- og robusthetstester i appen

1. **Flerprosjektisolasjon:** Lever samtidige webhooks fra minst to prosjekter.
   Kontroller at sak, eventer, metadata, kommentar, status, PDF, library og
   folder alltid havner i riktig prosjekt.
2. **Durable webhook inbox:** Simuler feil etter mottak, under databasecommit og
   under Catenda-kall. Retry skal gi nøyaktig én appsak, men fortsatt fullføre
   manglende sideeffekter.
3. **Outbox for Catenda:** Simuler feil separat for PDF-upload,
   document-reference, kommentar og status. Operasjonene skal kunne retries
   idempotent uten duplikate brev, referanser eller kommentarer.
4. **Utkast kontra Send:** `Lagre utkast` skal ikke utføre Catenda-kall eller
   opprette formell meddelelse. Ett klikk på `Send` skal opprette nøyaktig ett
   domene-event og de avtalte Catenda-sideeffektene.
5. **Ekko fra egne Catenda-kall:** `issue.modified` og eventuelle
   status-webhooks utløst av appens kommentar/status skal ikke lage nye
   domene-events eller starte en synkroniseringsløkke.
6. **ID-kollisjon og samtidighet:** Lever to `issue.created` i samme sekund og
   verifiser unike `sak_id`-er. Dagens sekundbaserte ID må erstattes eller
   sikres med UUID/unik databaseconstraint.
7. **Relasjonsoppslag:** Verifiser EO/Forsering→KOE og reverse KOE→EO/Forsering
   både i appen og Catenda, inkludert flere relasjoner på samme KOE.

### Eksisterende test som må strammes inn

`test_full_flow.py` bør få en egen ekte webhook-variant. Dagens
`_create_case_directly()` omgår webhook-ruten, og `verify_pdf_upload()` avslutter
med suksess selv om ingen document reference finnes. Den nye testen må vente
med avgrenset timeout og feile hvis sak, kommentar, dokument, referanse eller
prosjektruting mangler. Opprettede topics, dokumenter og webhook-abonnement må
registreres under testen og ryddes deterministisk etterpå.

## 11. Åpent ADR: dokument- og brevmodell

Før dokumentflyten implementeres ferdig må ett av disse alternativene velges:

| Alternativ | Catenda-modell | Viktigste konsekvens |
|---|---|---|
| Samlet saksdokument | Ett library item per KOE, ny revisjon ved hver formelle sending | Enkel dokumentliste, men mindre tydelig hvilket brev/revisjon som tilhører part og spor |
| Separate brev | Ett library item per formelle meddelelse; revisjoner bare av det aktuelle brevet | Tydelig korrespondanse og revisjonshistorikk, men flere dokumenter og referanser per topic |
| Separate brev per part og spor | Stabilt library item per kombinasjon av TE/BH og grunnlag/vederlag/frist | Strukturert revisjonsløp, men krever eksplisitt dokumentnøkkel og streng navnestandard |

Valget påvirker filnavn, unik dokumentnøkkel, når document references opprettes,
PDF-innhold, kommentarformat og hvordan appen kobler domene-event til Catenda
library item og revisjon. Det bør derfor besluttes i et ADR før kodeendringene
for PDF-upload gjennomføres.
