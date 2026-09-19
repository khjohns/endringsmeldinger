# Vurdering av auditfunnene: er de reelle, og hva bør faktisk gjøres?

Gjennomført 19. september 2026 mot `390f28b` (Gemini-sporets `f1167de` slått inn i
arbeidsgrenen). Gjenstand: de 60 funnene i pass 1–9, holdt opp mot faktisk kode og
faktisk database.

Kjede: [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) →
[sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md) → dette.
Status for tidligere funn: [masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

Appen er ikke i produksjon og har ingen reelle data.

**Mandatet.** Ikke «finnes det flere hull», men: er funnene reelle, er de faktisk
problemer, og hva er riktig håndtering. Ingen kode er endret.

**Avgrensning — les denne før tallene.** Jeg har etterprøvd **22 av 60 funn** mot
kode og database. De øvrige 38 er lest, gruppert og vurdert ut fra sporets egne
beskrivelser, men ikke reprodusert uavhengig. Hvert funn under er merket
`Etterprøvd` eller `Lest`. En vurdering merket `Lest` er en formodning, ikke en
kontroll. **Mine egne åtte AR-funn er ikke vurdert her** — jeg skrev dem, og de
hører til Astras runde.

---

## Sammendrag

**Funnene er i hovedsak reelle.** Av de 22 etterprøvde holdt 16 fullt ut. Ingen var
oppspinn; ingen pekte på kode som ikke finnes.

**Men én feilklasse går igjen, og den er systematisk.** Seks av de 22 har *riktig
premiss og feil konsekvens*: påstanden om repoet stemmer, men den oppgitte
virkningen inntreffer ikke. Årsaken er metodisk — sporet leste migrasjoner,
docstrings og kode og utledet kjøretidsatferd uten å kjøre mot faktisk system
(`RUN_LIVE_SUPABASE` ble bevisst aldri satt). Der utledningen krysser et lag den
ikke leste, spriker den.

**En bestått streng `xfail` beviser ikke funnet.** Den beviser at testens assertion
feiler. DB-02 og DB-07 er begge grønne `xfail` og begge har feil konsekvens, fordi
testene leser SQL-filer mens påstanden gjelder databasen. Dette er verdt å si høyt,
siden 50 slike tester nå ligger i suiten og lett leses som 50 bekreftede feil.

**Den viktigste enkeltobservasjonen er ikke et funn, men et mønster.** RV-07 står
som lukket i masterplanen. Etterprøvingen viser at fiksen ble påført **to
kallsteder** — `forsering_service.py:183` og `endringsordre_service.py:733` — mens
`valider_grunnlag_fortsatt_gyldig` (linje 823) fortsatt itererer fremmede saker
ufiltrert. AUT-01 og AUT-02 er ikke nye feil. De er den samme feilen, på stedene
fiksen ikke nådde.

---

## Del 1: Funn som ikke holder som beskrevet

Disse seks bør omklassifiseres. Ingen av dem er oppspinn — premisset stemmer i alle
seks — men handlingen de utløser bør være en annen enn alvorligheten tilsier.

### DB-02 — `cached_*`-kolonnene (Høy → Lav) · Etterprøvd

Påstand: åtte rapporteringskolonner mangler, så `update_cache()` «feiler umiddelbart
med `ERROR: column "cached_sum_krevd" does not exist`».

**Alle åtte finnes i databasen.** Pluss `cached_status` og `cached_title`. Krasjet
inntreffer ikke. Det korrekte funnet er at kolonnene ikke er deklarert i noen
migrasjon — altså DB-01 om igjen, ikke en egen driftsfeil.

### DB-07 — `properties` på `sak_bim_links` (Lav/Middels → Lav) · Etterprøvd

Samme form. Kolonnen finnes i databasen. Funnet er migrasjonsdrift, ikke datatap.

### DB-08 — versjonsvisningene (Middels → bortfaller) · Etterprøvd

Visningene finnes ikke i basen. Katalogen har ingen views i `public` overhodet.
Anbefalingen om å fjerne SQL-en fra docstringen står, men det er opprydding.

### OBS-03 — tidssonekuttet (Høy → Lav) · Etterprøvd

Påstand: `ce_time` kutter offset og «forskyver tidsstempel med to timer og
korrumperer juridiske fristtidspunkter».

Mekanismen er reell — `iso.split('+')[0] + 'Z'` merker `+02:00` som UTC. Men
forskyvningen inntreffer ikke:

- `tidsstempel` har `default_factory=lambda: datetime.now(UTC)` (`models/events.py:389`)
- Klienten kan ikke sende feltet; det står på listen over serverkontrollerte felt og
  overskrives ubetinget med `datetime.now(UTC).isoformat()` (`models/events.py:2142`)

Alle tidsstempler er altså allerede UTC, og kuttet gir riktig verdi. Funnet er ekte
som kodesvakhet og bør rettes med én linje (`tidsstempel.astimezone(UTC)`), men det
korrumperer ingenting i dag.

*Sidefunn under etterprøvingen:* grenen for **negativ** offset er verre enn den
positive. `elif iso.endswith("Z")` fanger ikke `-05:00`, så en slik verdi ville gitt
`...-05:00Z` — syntaktisk ugyldig. Også utilgjengelig i dag, og samme énlinjefiks
lukker begge.

### OBS-01 — revisjonsloggen (Kritisk → Høy, omformulert) · Etterprøvd

Påstand: «`AuditLogger` er død kode i hele applikasjonsflyten.»

For sterkt. `audit` kalles tre steder: `catenda_webhook_routes.py:143`
(`log_webhook_received`), `error_handlers.py:35` (429) og `:48` (403). Webhook- og
ratelimit-veiene fungerer.

Det riktige funnet er smalere og fortsatt alvorlig: **ingen forretningshendelse
revisjonslogges** — ingen kravsendelse, godkjenning eller innlogging — og
403-veien er død av en grunn OBS-02 beskriver korrekt (ruter returnerer
`jsonify(), 403` direkte, så `@app.errorhandler(403)` aldri fyres). OBS-01 og
OBS-02 er ett funn, ikke to.

### FE-01 — `LetterPreviewModal` (Kritisk/CSRF → Høy/funksjonsfeil) · Etterprøvd

Kallet på `LetterPreviewModal.svelte:19` mangler mer enn CSRF-token: det mangler
også `credentials` og `X-Project-ID`. Ruta har `@require_auth` og
`@require_project_access()`.

Virkningen er derfor ikke en sårbarhet. Ingen får tilgang til noe. Knappen er
**ødelagt**: samme opphav gir 403 på CSRF, kryssopphav gir 401 fordi
sesjonsinformasjonskapselen ikke sendes. Klassifisert som «CSRF / Autentisering,
Kritisk» leses dette som en angrepsvei; det er en funksjonsfeil.

Verdt å merke: det manglende `X-Project-ID` gjør dette til et **fjerde** sted
oslobygg-fallbacken slår inn (se RC-2).

---

## Del 2: Funn som holder, og som bør prioriteres

De fem alvorligste av dem jeg har etterprøvd.

### TFR-01 — avslag blir til godkjenning · Etterprøvd · **Kritisk, står**

`_handle_te_aksepterer_respons` (`timeline_service.py:1272`) setter
`status = SporStatus.GODKJENT` **ubetinget**, uansett hva byggherren svarte.

Jeg kontrollerte de to leddene testen ikke viser:

1. **Virkningen følger.** `kan_utstede_eo` krever `grunnlag.status ∈ {GODKJENT, LAAST}`
   (`sak_state.py:1172`). Den blir sann.
2. **Hendelsen er nåbar.** Eneste vakter er `BH_HAS_RESPONDED` og
   `NOT_ALREADY_ACCEPTED` (`business_rules.py:132`). Et avslag oppfyller den første.
   `grep AVSLATT backend/services/business_rules.py` gir **null treff** — ingen regel
   nevner avslag i det hele tatt.

Kontraktsjournalen registrerer altså enighet der det var avslag. I et bevissystem er
det den alvorligste formen for datafeil, og den er ikke arkitektonisk: den løses
ikke av fundamentbyttet.

**Håndtering:** `_handle_te_aksepterer_respons` må utlede status av responsen den
viser til. Aksept av et avslag er en egen tilstand — kravet er frafalt, ikke godkjent.
Legg til en forretningsregel som avviser aksept der responsen er `AVSLATT`, med mindre
domenet faktisk vil modellere «TE godtar avslaget» som egen hendelse. Det er en
domenebeslutning, ikke en teknisk.

### AUT-01 og AUT-02 — RV-07 ble lukket to steder, ikke som klasse · Etterprøvd · **Høy, står**

`tillatte_saker=cases_in_project` finnes på nøyaktig to kallsteder
(`forsering_routes.py:267`, `endringsordre_routes.py:144`).
`valider_grunnlag_fortsatt_gyldig` itererer `forsering_data.avslatte_fristkrav` og
kaller `_hent_sak_state(avslatt_sak_id)` uten noen prosjektkontroll.
`finn_forseringer_for_sak` returnerer det relasjonsindeksen gir, ufiltrert.

**Håndtering:** de to rutene kan lappes på timer, og bør det. Men lappen er ikke
løsningen — den er tredje runde av samme lapp. Dette er argumentet for at grensen må
ned i dataene (RC-1).

**Masterplanen bør rettes:** RV-07 står som lukket. Den er lukket der den ble funnet.

### GFK-01 — fullmaktsgulvet dekker ikke tid · Etterprøvd · **Høy, står**

`order_exposure_floor` (`eo_approval_service.py:61`) returnerer bare
`max(kompensasjon_belop, fradrag_belop)`. Ved `ny_sluttdato` returnerer
`order_exposure` None, gulvet blir 0, og i `resolve_route` hopper
`minimum > 0`-kontrollen over. Kjeden returneres **uten** at noen i den må dekke
beløpet.

Presisering av testens formulering: hele kjeden kreves, så dette er ikke
selvutstedelse. Men kjeden slipper fullmaktskontrollen, så en kjede som bare består
av en prosjektleder kan godkjenne en ordre verdt millioner.

**Håndtering:** `order_exposure_floor` må ta `daily_rate` og inkludere
`frist_dager * daily_rate`. Signaturen må endres — den tar i dag bare `request`.
FE-04 er samme feil i frontend-kopien og må rettes i samme runde (se RC-12).

### TST-03 — hendelsesrollback er en loggmelding · Etterprøvd · **Høy, står**

`_default_rollback` for `OperationType.EVENT_APPEND` (`core/unit_of_work.py:232`) er
bokstavelig talt bare `logger.warning(...)`. `TrackingUnitOfWork` gir altså ingen
kompensasjon for hendelser i det hele tatt.

Dette er mekanismen bak AP-04, som har stått som streng `xfail` siden 16. september.
De to beskriver samme svakhet fra hver sin ende: AP-04 at kompensasjonen skader når
den kjører, TST-03 at den ikke kjører for hendelser.

### OBS-02 — avviste tilgangsforsøk logges ikke · Etterprøvd · **Høy, står**

Ingen `abort(403)` finnes i `backend/routes/`. Alle avvisninger returnerer
`jsonify(...), 403` direkte, så `@app.errorhandler(403)` og dens
`audit.log_access_denied` er uten virkning. Kombinert med OBS-01: et kryssprosjekt-
forsøk avvises korrekt og etterlater ingen spor.

---

## Del 3: Tolv rotårsaker

Dette er den egentlige leveransen. 60 funn er ikke en arbeidsliste. Tolv er.

| # | Rotårsak | Dekker | Løses av |
| --- | --- | --- | --- |
| RC-1 | Tenant-grensen finnes bare i applikasjonskoden | AUT-01, -02, -05, -06, DB-04, DB-06, (RV-07, RV-09) | Fase 1 |
| RC-2 | Oslobygg-fallback i fire lag | DB-03, OBS-04, FE-01, `project_context.py:14` | Fase 1, **før ekte data** |
| RC-3 | Skjemaet har ingen sannhetskilde | DB-01, DB-02, DB-07, DB-08, TST-06 | Fase 0 |
| RC-4 | Ingen transaksjon rundt sammensatte skrivinger | TST-03, TST-05, TST-02, INT-05, (AP-04) | Fase 1–2 |
| RC-5 | Fullmakt dekker ikke tidskonsekvens | GFK-01, GFK-02, FE-04 | Egen retting |
| RC-6 | Revisjonsspor mangler for forretningshendelser | OBS-01, OBS-02, OBS-05 | Egen retting |
| RC-7 | Rå feiltekst og åpne driftsruter | CFG-03, OBS-07, (RV-13) | Fase 0 |
| RC-8 | Tilstand kan settes motsatt av hendelsene | TFR-01 … TFR-06 | **Domenegjennomgang** |
| RC-9 | Webhooken er en autorisasjonsomvei | INT-02, INT-04, INT-01 | Egen retting |
| RC-10 | Konfigurasjon fragmentert og delvis død | CFG-01, -02, -04, -05, -06, -07 | Fase 0 |
| RC-11 | Frontend omgår API-klienten | FE-01, FE-05 | Egen retting |
| RC-12 | Domenemodellen finnes to ganger | FE-04↔GFK-01, TST-04, FE-02 | Fase 3 |

Merk RC-8. Fem funn, ingen av dem arkitektoniske, og TFR-01 er materialets
alvorligste. **Fundamentbyttet løser dem ikke.** Det er det sterkeste argumentet i
hele auditserien for at en domenegjennomgang må kjøres ved siden av — ikke etter.

---

## Del 4: Anbefalt håndtering

**Nå, uavhengig av alt annet** — datafeil i den juridisk avgjørende delen:

1. **TFR-01.** Utled sporstatus av responsen. Krever en domenebeslutning om hvordan
   «TE godtar avslaget» skal modelleres.
2. **GFK-01 + FE-04.** Gulvet må inkludere tid, i begge implementasjonene samtidig.
3. **AUT-01, AUT-02.** Lapp de to rutene nå. Noter i masterplanen at RV-07 var lukket
   per kallsted, ikke som klasse.

**Fase 0, uendret plassering:** CI, `ruff --fix`, migrasjoner fra databasens faktiske
tilstand (RC-3), `REVOKE UPDATE, DELETE`. De 50 nye `xfail`-testene gjør fase 0 mer
verdt enn før — CI låser dem mot stille gjeninnføring. Legg til RC-7 og RC-10; begge
er små og uavhengige.

**Fase 1 beholder fristen:** RC-2 må lukkes før ekte saker finnes, siden
oslobygg-attribusjon ikke lar seg rekonstruere i ettertid.

**Nedprioriter:** DB-02, DB-07, DB-08, OBS-03. Alle fire er reelle som kodesvakheter
og ingen av dem har den virkningen som er oppgitt. De hører i opprydding, ikke i
noen fase.

**Én prosessendring.** De 50 `xfail`-testene er en gevinst, men fem av dem koder en
påstand testen ikke kan avgjøre, fordi de leser repofiler og konkluderer om
kjøretid. Når fase 0 gir CI, bør de testene som gjelder databasens tilstand kjøres
mot en faktisk Postgres — ellers forblir de grønne uansett hva databasen gjør.

---

## Verifikasjon og grenser

**Etterprøvd mot kode eller database (22):** DB-01 til DB-08, AUT-01, AUT-02,
AUT-05, TFR-01, FE-01, CFG-01, CFG-02, CFG-06, OBS-01, OBS-02, OBS-03, GFK-01,
GFK-02, INT-01, TST-03.

**Kun lest (38):** alle øvrige. Grupperingen i del 3 plasserer dem etter sporets egne
beskrivelser. Der et slikt funn er ført under en rotårsak, er det en formodning om
slektskap — ikke en kontrollert påstand. AUT-06, TFR-02 til TFR-06, INT-02 til
INT-07, CFG-03 til CFG-05, CFG-07, OBS-04 til OBS-07, TST-01, TST-02, TST-04 til
TST-07, GFK-03 til GFK-06 og FE-02 til FE-06 bør etterprøves før de legges til grunn.

Databasespørringene var rene katalogslesninger; ingen saksdata er lest og ingen
skriving utført. Testtallene er fra full kjøring etter sammenslåingen: 1440 bestått,
9 hoppet, 51 `xfail`.

**Ikke vurdert:** mine egne AR-01 til AR-08. De er skrevet av samme forfatter som
denne vurderingen og hører til en uavhengig runde.
