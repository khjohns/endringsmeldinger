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

        WH["Webhook-abonnement<br/>per Catenda-prosjekt"]

        P --> B
        P --> WH
        D -. "document_guid" .-> DR
        RT -. "related_topic_guid" .-> T
    end

    CRED -->|"GET /oauth2/authorize eller client credentials"| TOKEN
    TOKEN -->|"Authorization: Bearer …"| P
    TOKEN --> B
    WH -->|"issue.created / issue.modified"| ROUTER
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
    B["GET /opencde/bcf/3.0/projects<br/>alle tilgjengelige topic boards"]
    J["Koble board til prosjekt via<br/>bimsync_project_id"]
    L["GET /v2/projects/{id}/libraries<br/>velg library og eventuelt folder"]
    R[("Lagre prosjektkonfigurasjon<br/>med faktiske GUID-er")]
    W["POST /v2/projects/{id}/webhooks/user<br/>issue.created + issue.modified"]

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
    participant WH as Backend<br/>POST /webhook/catenda/{secret}
    participant API as Catenda BCF/v2 API
    participant REG as Prosjektregister
    participant DB as Event store + sak_metadata
    participant APP as Endringsmeldingsappen

    U->>UI: Velger prosjekt og topic board
    U->>UI: Oppretter topic med støttet topic type
    UI->>CAT: Topic lagres
    CAT->>WH: issue.created

    WH->>WH: Valider secret path, payload og duplikat-ID
    WH->>API: GET topic board fra board-ID i webhook
    API-->>WH: bimsync_project_id (Catenda-prosjekt)
    WH->>REG: Slå opp board + Catenda-prosjekt
    REG-->>WH: internal_project_id + library/folder

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

Webhook-eventet heter `issue.created` i dagens oppsett. Backend aksepterer også
`bcf.issue.created`.

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
        BE->>DOC: POST PDF til prosjektets library/folder
        DOC-->>BE: library_item_id / document_guid
        BE->>BCF: POST document_reference på riktig topic
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
KOE-siden. I Catenda opprettes relasjonen begge veier fordi BCF-endepunktet
arbeider på ett topic om gangen.

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
    CET -->|"PUT related_topics"| CKT
    CKT -->|"PUT related_topics"| CET
```

## 6. Catenda-endepunkter brukt i denne flyten

Alle endepunkter har base URL `https://api.catenda.com`.

| Formål | Metode og endepunkt |
|---|---|
| OAuth-dialog | `GET /oauth2/authorize` |
| Hent/veksle token | `POST /oauth2/token` |
| Valider innlogget Catenda-bruker | `GET /opencde/foundation/1.0/current-user` |
| List brukerens Catenda-prosjekter | `GET /v2/projects` |
| Hent Catenda-prosjekt | `GET /v2/projects/{catenda_project_id}` |
| List topic boards | `GET /opencde/bcf/3.0/projects` |
| Hent topic board | `GET /opencde/bcf/3.0/projects/{topic_board_id}` |
| Hent typer og statuser | `GET /opencde/bcf/3.0/projects/{topic_board_id}/extensions` |
| Hent board + custom fields | `GET /v2/projects/{catenda_project_id}/issues/boards/{topic_board_id}?include=customFields,customFieldInstances` |
| List/opprett topics | `GET/POST /opencde/bcf/3.0/projects/{topic_board_id}/topics` |
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
