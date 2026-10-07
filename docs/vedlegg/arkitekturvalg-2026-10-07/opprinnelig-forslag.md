# Forslag til ideell målarkitektur og arkitekturvalg

Dette dokumentet er et forslag til **målarkitektur og beslutningsprosess**, ikke en forhåndsbeslutning om full omskriving.

Utgangspunktet er siste kartlegging og M1–M5-planen, supplert med en mulig grønnere målarkitektur basert på én delt TypeScript-domenekjerne.

Det sentrale spørsmålet er derfor ikke:

> «Skal vi skrive systemet på nytt?»

men:

> **«Er en delt TypeScript-domenekjerne en så stor arkitektonisk forbedring at det er riktig å bruke dette produksjonsvinduet til å migrere systemet dit?»**

Dette bør avgjøres på grunnlag av konkrete undersøkelser og en liten, tidsbegrenset prototype – ikke preferanser om programmeringsspråk.

---

# 1. Overordnet mål

Det ideelle målbildet bør være en applikasjon der:

- domenelogikken finnes **ett sted**
- den samme domenekjernen kan brukes både i nettleser og server
- serveren er autoritativ for kommandoer, lagring og juridisk gjeldende tilstand
- frontend kan bruke samme domenekjerne til forhåndsevaluering når det er hensiktsmessig
- hendelsesloggen er immutable og versjonert
- relasjoner mellom krav, svar, aksept osv. er eksplisitte
- historiske juridiske vurderinger ikke utilsiktet omtolkes av senere regelendringer
- `pending_actions` og `capabilities` bygger på de samme domenepredikatene
- offentlig API-modell er eksplisitt
- brevtekst og annen presentasjon ikke inneholder juridisk prioriteringslogikk
- arkitekturen fortsatt er en enkel modulær monolitt, ikke et distribusjonssystem.

Dette er målbildet.

Hvordan vi kommer dit må avgjøres separat.

---

# 2. Den viktigste arkitekturhypotesen

Følgende bør behandles som en hypotese som skal testes:

> **Applikasjonen bør på sikt være TypeScript-basert i applikasjonslaget, med SvelteKit som frontend/presentasjonslag, en ren delt TypeScript-domenekjerne som kan kjøre både i klient og server, en modulær monolitt som server-side application layer, immutable og versjonert eventlogg, eksplisitte domenemessige relasjoner, projections/public state og Azure SQL eller PostgreSQL som lagringslag.**

Serveren er autoritativ.

Klienten kan evaluere samme domene lokalt, men kan aldri overstyre serverens vurdering.

Dette er ikke en beslutning om at dagens Python-backend skal kastes.

---

# 3. Hvorfor denne hypotesen er interessant

Dagens arkitektur har en strukturell utfordring:

```text
backend
  ↓
Python-regler
  ↑
  │ speiling
  ↓
frontend
  ↓
TypeScript-regler
```

Når samme juridiske regel må endres begge steder, oppstår behov for:

- speilregler
- `RESULT_MISMATCH`
- regelversjonsvakt
- koordinert endring i to språk
- tester av at to implementasjoner fortsatt er enige.

Målet med TypeScript-domenekjernen er å få:

```text
                 Shared Domain Core
                       TypeScript
                    /            \
                   /              \
              Browser           Server
             preview          authoritative
```

Da er domeneregelen implementert én gang.

Det betyr ikke at all frontendlogikk forsvinner. Skjemaer, UI, presentasjon og brevtekst vil fortsatt være frontendkode.

Det som forsvinner er behovet for å implementere **samme juridiske semantikk to ganger**.

---

# 4. SvelteKit bør fortsatt være frontend

Det er ingen klar grunn til å bytte bort Svelte.

Målbildet bør derfor fortsatt være:

**SvelteKit + TypeScript**

SvelteKit er presentasjons-/applikasjonslaget.

Den rene domenekjernen skal ikke være avhengig av Svelte.

Frontend kan inneholde:

- UI
- skjemaer
- navigasjon
- brukerinteraksjon
- presentasjon
- brevtekstgeneratorer
- klient-side preview/evaluering

men ikke være autoritativ for juridisk state.

---

# 5. Server-side arkitektur: SvelteKit-server eller separat Node-applikasjon?

Dette bør holdes åpent i første omgang.

Det finnes minst to gode varianter:

### Variant A – én SvelteKit-applikasjon

```text
SvelteKit
 ├── UI
 ├── server/API
 ├── application services
 └── shared domain
```

### Variant B – separat Node/TypeScript backend

```text
SvelteKit
    ↓
Node/TypeScript backend
    ↓
shared domain
```

Begge kan bruke den samme domenekjernen.

Målkravet bør derfor ikke være «egen Node-server».

Målkravet bør være:

> **Et rent TypeScript-basert server-side application layer som bruker samme domenekjerne som klienten.**

Med mindre det oppstår et konkret behov for separat deployering, er det naturlig å starte med én modulær monolitt og én deploybar applikasjon.

Vi bør ikke introdusere en separat backend-tjeneste bare for arkitekturens skyld.

---

# 6. Database: Azure SQL eller PostgreSQL

Databasevalget bør holdes åpent.

Både:

- Azure SQL / SQL Server
- PostgreSQL

kan støtte målbildet.

Domenet bør ikke være avhengig av databaseproduktet.

Databaselaget skal kunne håndtere:

- immutable events
- relasjoner
- constraints
- transaksjoner
- projections/read models
- JSON-data der det er hensiktsmessig
- eventuelle snapshots

Databasevalget bør derfor tas på grunnlag av:

- drift
- Azure/Microsoft-integrasjon
- teamkompetanse
- kostnad
- backup/restore
- observability
- deployment
- organisatoriske standarder

ikke fordi domenemodellen krever én bestemt database.

---

# 7. Ren delt domenekjerne

Domenekjernen skal ikke kjenne:

- HTTP
- database
- Svelte
- Node-spesifikke API-er
- browser API-er
- UI
- persistence.

Den skal inneholde domenets semantikk:

```text
krav
svar
aksept
spor
standpunkt
regler
pending_actions
capabilities
```

samt rene funksjoner/predikater for domenelogikken.

Eksempel:

```text
er_ny_kravversjon(event, tilstand)
standpunkt(grunnlag, spor)
kan_akseptere(...)
kan_trekke_krav(...)
beregn_pending_actions(...)
beregn_capabilities(...)
```

Domenet bør være så deterministisk som mulig.

---

# 8. Relasjonell domenemodell fremfor én global state machine

Vi bør ikke introdusere én gigantisk `SporStatus` eller en generell FSM.

Domenets tilstand bør uttrykkes gjennom eksplisitte relasjoner og uavhengige dimensjoner.

Eksempel:

```text
svar.krav_event_id
aksept.respons_event_id
```

Dette gjør det eksplisitt:

- hvilket krav et svar gjelder
- hvilken respons en aksept gjelder
- hvilken historisk hendelse en vurdering bygger på.

Vi skal ikke bruke:

> «siste relevante event»

som implisitt relasjon.

Dette er en sentral del av målarkitekturen.

---

# 9. `Standpunkt`

Standpunkt bør modelleres som en domenefunksjon:

```text
standpunkt(grunnlag, spor) -> Standpunkt
```

ikke som en global state machine.

En minimal modell kan være:

```text
Standpunkt
  hovedgrunn
  subsidiaert
  årsaker
```

Flere felt bør bare innføres dersom konkrete brukere/forbrukere trenger dem.

Domenet bestemmer:

- hva som er hovedgrunn
- hvilke årsaker som gjelder
- hvilke juridiske konsekvenser som følger.

Presentasjonslaget skal ikke gjøre denne prioriteringen på nytt.

---

# 10. Et viktig uavklart spørsmål: hva har rettsvirkning?

Dette må avgjøres eksplisitt før M1 PR1.

Vi har foreløpig to prinsipper som kan se ut til å trekke i ulik retning:

### Prinsipp A

Historiske juridiske vurderinger som har rettsvirkning skal ikke endres fordi domenereglene senere endres.

### Prinsipp B

Enkelte `standpunkt` kan være en avledet visning som beregnes ved lesing med gjeldende regler.

Begge kan være riktige dersom vi skiller mellom ulike typer informasjon.

Vi bør derfor eksplisitt klassifisere:

1. **Historisk rettslig resultat**
   - lagres
   - knyttes til `rule_version`
   - skal ikke omtolkes automatisk

2. **Avledet visning**
   - kan beregnes på nytt
   - har ikke nødvendigvis selvstendig rettsvirkning

3. **Ny vurdering med dagens regler**
   - må være en eksplisitt ny vurdering
   - må ikke presenteres som historisk resultat.

Dette bør bli en egen beslutningsport.

---

# 11. `rule_version`

`rule_version` skal ikke forsvinne ved overgang til én TypeScript-domenekjerne.

Den får bare en renere rolle.

Den beskytter blant annet mot:

```text
gammel klient
    ↓
ny server
```

En nettleser kan ha en gammel bundle selv om både frontend og backend normalt bruker samme domenekode.

Derfor bør kommandoer kunne identifisere hvilken regelversjon klienten er bygget/testet mot, og serveren må kunne avvise eller håndtere foreldede klienter på en kontrollert måte.

---

# 12. `event_version`

`event_version` er noe annet enn `rule_version`.

Eksempel:

```text
event_version = 2
rule_version  = 18
```

`event_version` beskriver strukturen/serialiseringen av eventen.

`rule_version` beskriver domenereglene som ble brukt ved en relevant vurdering.

`event_version` bør kunne innføres nå.

En full upcasting-/migration-mekanisme trenger ikke bygges før det faktisk oppstår schemaendringer som krever den.

---

# 13. Historiske events

Når systemet kommer i produksjon bør historiske eventer behandles som immutable.

Vi bør ikke senere «rydde» historiske eventer ved å endre eller slette dem.

Hvis eventformatet endres:

```text
v1 → v2
```

brukes versjonering/upcasting.

Hvis domenereglene endres:

```text
rule_version 18 → 19
```

skal ikke gamle rettslige resultater automatisk bli vurdert på nytt.

---

# 14. Eventloggen som sannhetskilde

Målbildet forutsetter:

```text
event log = source of truth
```

mens:

```text
projection = derived read model
snapshot = performance optimization
```

Dette må imidlertid **verifiseres mot dagens kode**.

Vi bør spesielt undersøke om felter som:

- `cached_status`
- `cached_sum_godkjent`
- andre persisted state-felter

representerer en parallell sannhetskilde som ikke kan rekonstrueres fra eventloggen.

Hvis eventloggen ikke faktisk kan være autoritativ uten betydelig ekstra arbeid, er dette en viktig arkitekturfunn før vi bestemmer oss for migrering.

---

# 15. Projections og `public_state`

Eventloggen er historikken.

Projection/read model er det systemet trenger for å lese nåværende tilstand effektivt.

Eksempel:

```text
events
   ↓
projection
   ↓
public_state
```

API-et bør returnere autoritativ `public_state` etter en kommando.

Frontend trenger dermed normalt ikke gjøre:

```text
POST command
GET state
```

dersom POST-responsen allerede inneholder den nye state.

---

# 16. `pending_actions` og `capabilities`

Disse bør være separate konsepter.

### `pending_actions`

Hva som må/kan gjøres videre:

```text
respond_to_requirement
withdraw_claim
issue_change_order
```

### `capabilities`

Hva aktuell rolle kan gjøre:

```text
can_respond
can_withdraw_claim
can_issue_change_order
```

De skal bygge på samme underliggende predikater.

```text
domeneforutsetninger
       ↓
   ┌───┴────┐
   ↓        ↓
actions  capabilities
```

Dermed unngår vi to parallelle regelsett.

---

# 17. Én regelkilde, flere evalueringer

Det er helt greit at samme domene evalueres i flere sammenhenger:

```text
              domain predicate
              /       |       \
             /        |        \
        preview   capability   command
```

Det som ikke er ønskelig er:

```text
backend rule A
frontend rule B
UI rule C
```

for samme juridiske spørsmål.

Serveren er alltid autoritativ.

---

# 18. Public DTO

Intern domenetilstand skal ikke automatisk være offentlig API-kontrakt.

Det bør finnes eksplisitte DTO-er der offentlig og intern semantikk er forskjellig:

```text
Internal domain model
        ↓
Public DTO
```

Dette gjelder særlig:

- `Standpunkt`
- `Capabilities`
- `PendingAction`
- `neste_handling`
- `public_state`

Nullpolitikken bør være:

> Offentlige felter finnes alltid. `null` betyr «ingen verdi».

Event-/timeline-data kan fortsatt bruke «felt mangler» der dette uttrykker riktig semantikk.

---

# 19. Brevtekst er presentasjon

Brevtekstgeneratorer skal ikke bestemme juridisk hovedgrunn.

Riktig flyt:

```text
domene
  ↓
Standpunkt
  ↓
hovedgrunn / årsaker
  ↓
brevtekstgenerator
  ↓
tekst
```

Dermed kan for eksempel:

`fristBegrunnelse.ts`

og

`vederlagBegrunnelse.ts`

kun oversette domenets resultat til tekst.

De skal ikke selv avgjøre hvilken juridisk regel som har prioritet.

---

# 20. Bevis-sakene bør bli språkuavhengige

Dette bør gjøres **uansett språkvalg**.

Bevis-sakene bør kunne beskrives som:

```text
events inn
+
forventet resultat
+
forventet state/relasjoner
```

helst i et stabilt språkagnostisk format.

De bør kunne kjøres mot:

- dagens Python-implementasjon
- eventuell TypeScript-implementasjon
- HTTP API
- storage/replay
- approval flow

Dette gir oss en felles fasit for juridisk forventet oppførsel.

Det er særlig viktig hvis vi faktisk vurderer omskriving.

---

# 21. Regler bør være lesbare for jurister

Regelimplementasjonen bør være eksplisitt og sporbar.

Vi bør etterstrebe:

- små predikater
- beslutningstabeller der dette er mer lesbart enn nestede betingelser
- NS 8407-referanser
- tydelige domenenavn
- kobling mellom regel og invariant
- kobling mellom invariant og bevis-sak.

Eksempel:

```text
NS 8407 §32.2
      ↓
er_ny_kravversjon(...)
      ↓
invariant
      ↓
bevis-sak
      ↓
test
```

Språket er sekundært.

Dette er et domenedesign-prinsipp.

---

# 22. Ingen generisk FSM/rules engine

Vi bør fortsatt ikke introdusere:

- generell FSM
- generell rules engine
- mikrotjenester
- Kafka/event-bus uten konkret behov
- omfattende distribuerte workflows
- generiske abstraksjoner som gjør et lite domene vanskeligere å forstå.

Målet er en enkel modulær monolitt med en sterk domenekjerne.

---

# 23. Snapshots

Snapshots bør være mulig, men ikke forhåndsinnført som krav.

```text
event log
   ↓
replay
   ↓
state
```

er grunnmodellen.

Hvis målinger senere viser at replay er for dyrt:

```text
event log
   ↓
snapshot
   +
remaining events
   ↓
state
```

kan introduseres.

Snapshot er optimalisering, ikke sannhetskilde.

---

# 24. Det viktigste nye steget: arkitekturspike

Fordi systemet ennå ikke har produksjonsdata, bør vi seriøst utnytte dette vinduet.

Før vi bygger videre på de mest Python-spesifikke delene av M5, bør vi gjøre en **tidsbegrenset prototype**.

Den bør ikke forsøke å skrive hele systemet på nytt.

Den bør ta:

- `backend/regler/`
- `standpunkt`
- sentrale domenetyper
- representative bevis-saker

og implementere dette i ren TypeScript.

Deretter kjører vi samme bevis-sakskatalog mot:

```text
Python implementation
          vs.
TypeScript implementation
```

Målet er ikke bare å se om resultatene stemmer.

Vi skal måle arkitekturgevinsten.

---

# 25. Hva prototypen skal måle

Minst følgende:

### A. Regelportering

Hvor mye kode kreves for å implementere domenekjernen?

### B. Frontend-speiling

Hvor mye av eksisterende frontend-domainkode kan fjernes når den delte domenekjernen finnes?

### C. Duplisering

Hvor mange semantiske regler må i dag endres to steder?

Dette er viktigere enn total LOC.

### D. `RESULT_MISMATCH`

Hvor mye av mekanismen blir overflødig?

### E. Regelversjonsvakt

Hvor mye blir igjen?

Den skal ikke nødvendigvis forsvinne, fordi gammel klient → ny server fortsatt må håndteres.

### F. Testbarhet

Hvor mye av dagens 2 296 tester kan beholdes som:

- domenetester
- bevis-saker
- API-tester
- integrasjonstester?

### G. Resten av backend

Kartlegg faktisk størrelse på:

- projection
- business/application logic
- approval
- Catenda
- forsering
- persistence
- API
- øvrige integrasjoner.

926 linjer i `backend/regler/` er ikke et mål på total omskrivingskostnad.

---

# 26. Arkitekturvalg etter prototypen

Etter prototypen bør det tas et eksplisitt valg.

## Alternativ A – behold Python

```text
SvelteKit/TS
      ↓
Python backend
      ↓
Python domain
```

Da må vi akseptere at klienten enten:

- har speilet domenelogikk
- eller bruker en serverbasert evalueringsmekanisme
- eller har en annen kontrollert preview-modell.

M5a/M4 og øvrige Python-spesifikke tiltak fortsetter.

## Alternativ B – gå til TypeScript

```text
SvelteKit/TS
      ↓
TS application layer
      ↓
shared TS domain
```

Da kan klient og server bruke samme domenekjerne.

Dette bør være det foretrukne målbildet dersom prototypen viser at kostnaden er forsvarlig og gevinsten reell.

---

# 27. Hvorfor beslutningen bør tas før M5a

M5a innebærer mer Python/Pydantic-spesifikk arkitektur.

Hvis vi allerede vet at målbildet kan bli TypeScript, bør vi ikke investere tungt i mekanismer som primært eksisterer for å gjøre dagens Python-arkitektur bedre dersom de senere må erstattes.

Derfor:

```text
M2 / språkagnostisk arbeid
        ↓
bevis-saker
        ↓
historisk semantikk
        ↓
arkitekturspike
        ↓
ARKITEKTURVALG
        ↓
   ┌────┴─────┐
   ↓          ↓
 Python       TS
   ↓          ↓
 M5a...      portering
```

Dette er et viktig avvik fra den tidligere planen.

---

# 28. Hva som fortsatt kan gjøres før arkitekturvalget

Følgende arbeid er i stor grad språkagnostisk og bør fortsette:

- M2-relasjonene
- beslutningsporter for åpne domenespørsmål
- `standpunkt(grunnlag, spor)`
- null-policy
- eksplisitt skille mellom semantikk og brevtekst
- bevis-sakskatalog
- HTTP-/approval-testing av bevis-saker
- avklaring av eventloggens autoritet
- avklaring av historiske resultater vs avledet standpunkt.

Dette arbeidet blir ikke bortkastet ved et eventuelt språkvalg.

---

# 29. Hva vi bør unngå akkurat nå

Før arkitekturvalget bør vi være forsiktige med å investere tungt i:

- ytterligere Python-spesifikk regelinfrastruktur
- omfattende Pydantic→TS-generering
- ny kompleks validatorarkitektur
- flere frontend-speilregler
- større forbedringer som bare er nødvendige fordi backend og frontend er i forskjellige språk.

Det betyr ikke at alle M4/M5-PR-er må stoppes.

Det betyr at vi bør klassifisere dem som:

```text
språkagnostisk
```

eller:

```text
Python-spesifikk
```

før de prioriteres.

---

# 30. Migreringsstrategien

Det er viktig å skille mellom:

### Målarkitektur

Hva systemet bør ende opp som.

### Migreringsstrategi

Hvordan vi kommer dit.

Vi bør ikke anta at «målarkitektur = full greenfield».

Mulige utfall etter undersøkelsen:

1. behold Python og forbedre eksisterende arkitektur
2. større inkrementell refaktorering
3. portering av backend til TypeScript
4. full greenfield.

Det siste skal ikke velges bare fordi målarkitekturen er grønn.

---

# 31. Når full omskriving er berettiget

En større omskriving blir mer attraktiv dersom undersøkelsen viser at:

- eventloggen kan gjøres til reell source of truth
- domenet lar seg uttrykke rent i ny modell
- frontend-speilet faktisk er betydelig
- `RESULT_MISMATCH`/dobbel implementasjon er en stor kostnad
- resten av backend er håndterbar å portere
- testene kan brukes som sikkerhetsnett
- integrasjonene ikke gjør porteringen uforholdsmessig dyr
- teamet kan drifte TypeScript-løsningen godt
- vi har et klart produksjonsvindu uten historiske data som må migreres.

At systemet ikke er i produksjon er et tungt argument for å vurdere dette nå.

---

# 32. Når vi bør beholde Python

Vi bør ikke bytte språk dersom prototypen viser at:

- backendens øvrige kompleksitet dominerer kostnaden
- domenekjernen er liten i forhold til resten
- frontend-speilet kan håndteres enklere på annen måte
- TypeScript-porteringen gir liten faktisk reduksjon i kompleksitet
- team-/driftskostnaden er vesentlig større enn gevinsten
- dagens Python-arkitektur kan nå målbildets viktigste egenskaper uten stor duplisering.

Da er det bedre å beholde Python og gjøre arkitekturen renere der.

---

# 33. Forslag til samlet målarkitektur

```text
                              USER
                                │
                                ▼
                    ┌───────────────────────┐
                    │ SvelteKit / TypeScript │
                    │                       │
                    │ UI                    │
                    │ Forms                 │
                    │ Preview               │
                    │ Presentation          │
                    └───────────┬───────────┘
                                │
                         Shared TS Domain
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
        Client-side evaluation          Server-side application
                                             │
                                     API / Commands / Auth
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ Shared Domain Core    │
                                  │                      │
                                  │ krav                 │
                                  │ svar                 │
                                  │ aksept               │
                                  │ spor                 │
                                  │ standpunkt           │
                                  │ regler               │
                                  │ capabilities         │
                                  │ pending_actions      │
                                  └──────────┬───────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │                             │
                              ▼                             ▼
                       Immutable events              Projections
                              │                             │
                              │                             ▼
                              │                       public_state
                              │
                              └──────────────┬──────────────┘
                                             ▼
                              ┌────────────────────────────┐
                              │ Azure SQL / PostgreSQL     │
                              └────────────────────────────┘
```

Snapshots kan legges til senere dersom målinger viser behov.

---

# 34. Den viktigste arkitekturregelen

Hvis vi går til denne arkitekturen, bør én regel være helt eksplisitt:

> **Domenet skal ikke ha to semantiske implementasjoner.**

Det kan finnes:

- flere API-representasjoner
- flere UI-representasjoner
- flere brevtekster
- flere read models
- flere måter å presentere et resultat på.

Men den juridiske domenesemantikken skal ha én kilde.

---

# 35. Samlet beslutningshypotese

Jeg foreslår derfor følgende foreløpige prosjektbeslutning:

> **Vi skal seriøst undersøke en TypeScript-basert målarkitektur med SvelteKit og en delt ren domenekjerne før vi investerer videre i de mest Python-spesifikke delene av M5. Dette er ikke en beslutning om full omskriving. Først skal språkuavhengige bevis-saker etableres, historisk rettsvirkning og regelversjonering avklares, og eventloggens autoritet verifiseres. Deretter gjennomføres en tidsbegrenset TypeScript-prototype av domenekjernen og `standpunkt`. På grunnlag av målt regelduplisering, faktisk porteringomfang, testbarhet, frontendforenkling og operativ kostnad tas et eksplisitt valg mellom å fortsette med Python eller gå over til TypeScript som felles applikasjons-/domenespråk. Beslutningspunktet legges før M5a.**

Dette gir oss et bedre beslutningsgrunnlag enn enten:

> «Vi bør definitivt skrive alt om»

eller:

> «Vi bør vente til etter M5.»

---

# 36. Kort konklusjon

Den ideelle arkitekturen er etter min vurdering:

**SvelteKit + TypeScript + ren delt TypeScript-domenekjerne + modulær monolitt + immutable versjonert eventlogg + projections + eksplisitte domenereasjoner + Azure SQL/PostgreSQL.**

Men den riktige neste handlingen er **ikke** å begynne å skrive hele denne arkitekturen.

Den riktige neste handlingen er:

```text
1. Gjør bevis-sakene språkuavhengige
2. Avklar historisk rettsvirkning vs avledet standpunkt
3. Verifiser eventloggens autoritet
4. Port domenekjerne + standpunkt til TypeScript som prototype
5. Mål faktisk gevinst og faktisk porteringkostnad
6. Ta arkitekturvalg
7. Fortsett M1–M5 i valgt retning
```

Dette utnytter at systemet ennå ikke har produksjonsdata, samtidig som vi unngår å gjøre en stor omskriving basert på arkitektur-estetikk alene.