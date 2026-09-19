# Vurdering av auditfunnene: er de reelle, og hva bør faktisk gjøres?

Gjennomført 19. september 2026 mot `390f28b` (Gemini-sporets `f1167de` slått inn i
arbeidsgrenen). Gjenstand: de 60 funnene i pass 1–9, holdt opp mot faktisk kode og
faktisk database.

Kjede: [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) →
[sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md) → dette.
Status for tidligere funn: [masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

Appen er ikke i produksjon og har ingen reelle data.

**Overlevering:** [handoff 2026-09-19](handoff-2026-09-19.md) samler miljøoppsett, fire metodiske
feller, etablerte fakta som ikke bør finnes ut på nytt, og de åpne beslutningene.
Start der om du overtar arbeidet uten kontekst.

**Mandatet.** Ikke «finnes det flere hull», men: er funnene reelle, er de faktisk
problemer, og hva er riktig håndtering. Ingen kode er endret.

**Avgrensning — les denne før tallene.** **59 av 60 funn er etterprøvd** mot kode og
database. Det ene unntaket er FE-06, der kontrollen ble inkonklusiv. Kontrollen er
gjort i tre runder med avtakende dybde: Kritisk og Høy med full mekanismesporing,
Middels og Lav med kontroll av selve påstanden og plasseringen i rotårsak.

*Rettelse:* en tidligere versjon av dette dokumentet oppga 34 etterprøvde og 26
gjenstående. Riktig fordeling etter de to første rundene var 35 og 25.

**Mine egne åtte AR-funn er ikke vurdert her** — jeg skrev dem, og de hører til
Astras runde.

---

## Sammendrag

**Funnene er i hovedsak reelle.** Av de 59 etterprøvde holdt 49 fullt ut. Ingen var
oppspinn; ingen pekte på kode som ikke finnes. Tre duplikerer funn masterplanen
allerede fører, og to er beslutninger snarere enn feil.

**Men én feilklasse går igjen, og den er systematisk.** Sju av de 59 har *riktig
premiss og feil konsekvens* — og alle sju ligger blant Kritisk og Høy, altså der
konsekvensen faktisk ble utledet. Blant Middels og Lav holdt påstandene gjennomgående: påstanden om repoet stemmer, men den oppgitte
virkningen inntreffer ikke. Årsaken er metodisk — sporet leste migrasjoner,
docstrings og kode og utledet kjøretidsatferd uten å kjøre mot faktisk system
(`RUN_LIVE_SUPABASE` ble bevisst aldri satt). Der utledningen krysser et lag den
ikke leste, spriker den.

**En bestått streng `xfail` beviser ikke funnet.** Den beviser at testens assertion
feiler. DB-02 og DB-07 er begge grønne `xfail` mens kolonnene finnes i databasen,
fordi testene leser SQL-filer og påstanden i dokumentteksten gjelder basen. Dette er
verdt å si høyt, siden 50 slike tester nå ligger i suiten og lett leses som 50
bekreftede feil.

*Presisering etter gjennomgang av testene 19.09:* feilen lå oftere i dokumentprosaen
enn i testene. DB-02s egen `reason` sier «mangler i alle SQL-migrasjoner», som er
riktig, og FE-02s sier nøyaktig det som viste seg å være den reelle mangelen. Bare
fire begrunnelser var misvisende — DB-04, DB-07, OBS-03 og FE-01 — og de er skrevet
om med hva kontrollen faktisk viste. Assertions er ikke rørt.

**Den viktigste enkeltobservasjonen er ikke et funn, men et mønster.** RV-07 står
som lukket i masterplanen. Etterprøvingen viser at fiksen ble påført **to
kallsteder** — `forsering_service.py:183` og `endringsordre_service.py:733` — mens
`valider_grunnlag_fortsatt_gyldig` (linje 823) fortsatt itererer fremmede saker
ufiltrert. AUT-01 og AUT-02 er ikke nye feil. De er den samme feilen, på stedene
fiksen ikke nådde.

---

## Del 1: Funn som ikke holder som beskrevet

Disse sju bør omklassifiseres. Ingen av dem er oppspinn — premisset stemmer i alle
sju — men handlingen de utløser bør være en annen enn alvorligheten tilsier.

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

### FE-02 — klientstyrt rolle (Høy/Autorisasjon → Middels/UX) · Etterprøvd

Påstand: rollen styres fra `localStorage` og `?rolle=`, slik at TE kan «presenteres
for og sende inn BH-vedtak».

Presentasjonsdelen stemmer. Innsendingsdelen gjør det ikke.
`routes/event_routes.py:173` gjør `data["aktor_rolle"] = g.contract_role` — serveren
**overskriver** aktørrollen med den verifiserte teamtilknytningen. En klient som
påstår BH kan ikke sende inn som BH. Autorisasjonen holder fullt ut.

Den reelle mangelen er at `/api/cases/<sak_id>/context` ikke returnerer brukerens
autoriserte rolle, så grensesnittet ikke vet hva det skal vise. Resultatet er
forvirrende 400-feil, ikke en tilgangsomgåelse.

### Mønster: frontend-auditen klassifiserer UI-feil som tilgangsfeil

FE-01 og FE-02 har samme form, og den er verdt å navngi. Begge er klassifisert som
sikkerhetsfunn — «CSRF / Autentisering» og «Autorisasjon / Skjerming» — og i begge
tilfeller holder serveren. FE-01 er en ødelagt knapp; FE-02 er et grensesnitt som
tilbyr handlinger serveren avviser.

Årsaken er den samme metodiske som i databasefunnene: klienten er lest i isolasjon,
og virkningen er utledet over en laggrense uten å kontrollere at serveren håndhever
uavhengig. **Hele `audit-frontend-2026-09-18.md` bør leses med det forbeholdet.**
FE-04 er det eneste av de tre høyt klassifiserte frontend-funnene som er en reell
feil i det som beregnes — og det er fordi det er samme feil som backend har.

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

> **Merknad 2026-09-19 til TFR-01.** Funnet er kartlagt videre, og **ikke** rettet:
> modelleringen av «TE godtar byggherrens avslag» er en åpen domenebeslutning.
>
> *Kjørt og observert:* feilen gjelder **alle tre spor**, ikke bare grunnlag.
> Vederlag og frist går også fra `avslatt` til `godkjent`, og `kan_utstede_eo` går
> fra `False` til `True` i alle tre tilfellene. Vakten (`BH_HAS_RESPONDED`,
> `NOT_ALREADY_ACCEPTED`) slipper aksept av et avslag gjennom på alle tre.
> Reproduksjonen fra 18.09 dekket bare grunnlag; de to andre er lagt til.
> Fristsporet er det med størst konsekvens — et avslått fristkrav er selve
> forutsetningen for forsering etter § 33.8.
>
> To observasjoner gjør en senere retting billigere. `DELVIS_GODKJENT` blir også
> `GODKJENT` ved aksept, men det er trolig **riktig**: partene er enige om det
> reduserte beløpet, og `godkjent_belop` bevares. Feilen gjelder derfor bare
> `AVSLATT`. Og `bh_resultat` er bevart på sporet etter aksept, så statusen kan
> utledes av responsen uten ny hendelsestype og uten migrasjon.

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

> **Merknad 2026-09-19 til AUT-01 og AUT-02.** Begge er rettet. Merknaden står
> her fordi *rekkevidden* var vurdert ut fra lesestien alene, og de to funnene
> viste seg å være ulike når skrivestien ble lest.
>
> **AUT-01 var dybdeforsvar, ikke en nåbar lekkasje.** `require_project_access`
> samler `referenced_case_ids(payload) | referenced_case_ids(kwargs)`, og
> `referenced_case_ids` (`lib/auth/domain.py`) rekurserer gjennom nøstede dicter
> og lister og behandler `avslatte_fristkrav`, `avslatte_sak_ids` og `koe_sak_id`
> som saksreferanser. Hver holdes mot `metadata.prosjekt_id`. Både
> `/api/forsering/opprett` og den hendelsesdrevne veien
> (`FORSERING_KOE_LAGT_TIL` → `koe_sak_id`) er dekket. En fremmed sak-ID kom
> altså ikke inn i `avslatte_fristkrav` gjennom en dekorert rute. Reproduksjonen
> skriver tilstanden rett i hendelseslageret og er ærlig om det.
>
> **AUT-02 hadde ikke det vernet.** Oppslaget går baklengs — fra en KOE-sak til
> forseringssakene som refererer den — så dekoratoren har aldri sett de returnerte
> IDene. `sak_relations` bærer ingen `prosjekt_id`, og
> `backend/scripts/backfill_relations.py` fyller indeksen uten prosjektbegrep.
>
> **Et tredje sted ble funnet ved å søke etter mønsteret:**
> `GET /api/forsering/<sak>/relaterte` leser relasjoner fra Catenda gjennom
> `BaseSakService.hent_relaterte_saker`, mens `topic_board_id` er en *global*
> innstilling og ikke forespørselens prosjekt. Catendas spesifikasjon
> (`docs/tredjepart-api/topic-api-openapi.yaml`) er utvetydig: parameteret
> `includeBimsyncProjectTopics` betyr «Include topics from other topic boards
> that belong to the same Catenda project», klienten sender det som `True` som
> standard, og svaret bærer `bimsync_issue_board_ref` — hvilket board hver
> relatert topic hører til. Koden fanger feltet inn i `SakRelasjon` og sjekket
> det aldri. Kontekstruta filtrerte allerede samme datakilde (RV-07); denne ruta
> gjorde det ikke. *Kjørt og observert:* uten filteret returnerer ruta
> sakstittelen til en sak i et annet prosjekt.
>
> Grensen er derfor lagt i `hent_relaterte_saker`, der `tillatte_saker` er et
> påkrevd nøkkelordargument et nytt kallsted ikke kan glemme. **EO-sidens
> `/relaterte` var aldri utsatt** — `EndringsordreService` overstyrer metoden med
> en hendelsesbasert variant som allerede filtrerer. Det ble først antatt
> sårbart fordi baseklassen ble lest uten overstyringen; det er felle 2 i
> handoffen, og den ble fanget av testsuiten, ikke av lesingen.

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

> **Merknad 2026-09-19 til GFK-01 og FE-04.** Begge er rettet slik avsnittet
> foreskriver. `order_exposure` er skrevet om til å kalle gulvet framfor å legge
> til dagene selv, så beløpet ikke telles to ganger, og dagene valideres før
> gulvet beregnes så feilmeldingen om ugyldige dager beholdes.
>
> Begge reproduksjonene kalte gulvet med ett argument og kunne derfor ikke passere
> uten signaturendringen; kallene er oppdatert og påstandene står uendret.
> Backend-testen har i tillegg fått en assertion på selve sikkerhetsegenskapen —
> en kjede som ikke dekker beløpet avvises, en som dekker det slipper gjennom —
> framfor bare på aritmetikken.
>
> **Restanse.** Er `frist_dager` oppgitt uten kjent dagmulktssats, kan
> eksponeringen fortsatt ikke verdsettes, gulvet blir 0, og `resolve_route`
> hopper fortsatt over fullmaktskontrollen. Å kreve kjedens toppnivå for en
> uverdsettbar ordre er en domenebeslutning og er ikke tatt.

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

### Øvrige Høy-funn — etterprøvd og bekreftet

Alle 22 Høy-funn er nå kontrollert. De ni under holder, men med presiseringer som
endrer hva som bør gjøres med dem.

| Funn | Utfall | Presisering fra kontrollen |
| --- | --- | --- |
| **INT-02** | Bekreftet, **verre enn beskrevet** | `is_duplicate_event` bruker `SETNX` og *reserverer* nøkkelen på selve sjekken (`webhook_security.py:134`). Feiler prosesseringen etterpå, svarer Catendas retry `202 already_processed`. Saken tapes uten spor. |
| **INT-05** | Bekreftet | `_post_to_catenda` kalles fra linje 584, inne i `submit_event`. `submit_batch` starter på 653 og kaller den ikke. Duplikat av **RV-10**, som masterplanen allerede fører. |
| **CFG-03** | Bekreftet | `str(e)` på `utility_routes.py:130` og `:191`; `/api/routes` er udekorert. Duplikat av **RV-13**, og alle tre rutene står allerede oppført i `test_public_route_registry`. |
| **OBS-04** | Bekreftet | `cloudevents.py:109`: `proj_id = getattr(self, "prosjekt_id", None) or "oslobygg"`, med TODO som erkjenner det. `or` slår også inn på tom streng. Tredje ledd i RC-2. |
| **FE-04** | Bekreftet | `endringsordre.ts:162` speiler backendens `order_exposure_floor` **nøyaktig**. Driftdetektorene ville derfor vist null drift mens begge er gale — konsistens er ikke korrekthet. |
| **TFR-02** | Bekreftet | `overordnet_status` leser bare `grunnlag`, `vederlag`, `frist` (`sak_state.py:1099`). For forsering og EO er alle tre `IKKE_RELEVANT`, så listen blir tom. |
| **TST-02** | Bekreftet, **annen mekanisme** | «Mangler fillåsing» er upresist: `fcntl.flock(LOCK_EX)` finnes på `event_repository.py:102`. Men `_load_with_lock` returnerer `(default, None)` **uten lås** når filen ikke finnes — altså nøyaktig opprettelsesveien. Fiksen er `O_CREAT\|O_EXCL`, ikke «innfør låsing». |
| **TST-04** | Bekreftet | `backend/docs/` finnes ikke, og ingen generert `openapi.yaml` ligger i repoet. `scripts/generate_openapi.py` er 2172 linjer som produserer noe ingen bruker. |
| **GFK-03** | Bekreftet | `reconcile_policy` (`approval_service.py:510`) har ingen lease- eller utstedelsessjekk. Duplikat av **RV-02**, allerede prioritet 1 i masterplanen. |

**To av dem er ikke nytt arbeid.** GFK-03 er RV-02 og INT-05 er RV-10; begge står
åpne i masterplanen fra før. CFG-03 er RV-13. Overlappstabellen i masterplanen er
oppdatert tilsvarende.

**To trenger en beslutning, ikke en retting:**

- **INT-04** — `catenda_webhook_service.py:260` hardkoder `aktor_rolle="TE"` med
  kommentaren «Assume TE created the case». Det er på `SakOpprettetEvent`, altså
  saksopprettelse, ikke `eo_utstedt`. Godkjenningsporten dekker de bindende
  hendelsene, så webhooken utsteder ingen endringsordre. Det den gjør, er å opprette
  en EO-*sak* med TE som aktør når en Catenda-topic klassifiseres som endringsordre.
  Om det er en omgåelse avhenger av om saksopprettelse i seg selv skal være
  BH-forbeholdt — en domenebeslutning, ikke en feil å lappe.

  > **Merknad 2026-09-19: avgjort og rettet.** Beslutningen ble en tredje vei:
  > verken hardkodet TE eller BH-forbeholdt opprettelse, men **utled siden av
  > forfatterens faktiske lagmedlemskap.** Grunnlaget er at Catenda allerede
  > oppgir forfatterens bruker-ID i `bimsync_creation_author.user.ref`
  > (`docs/tredjepart-api/topic-api-openapi.yaml`, skjemaet `user-ref`), og det er
  > samme subjekt `contract_membership` matcher mot prosjektets TE/BH-lag.
  > Webhooken leste `name` og `email` fra det objektet og kastet `ref`.
  > Antakelsen var altså unødvendig — identiteten lå i payloaden.
  >
  > `AuthService.contract_membership_for_subject` er skilt ut fra
  > `contract_membership`, som nå delegerer til den. Den nye metoden krever ikke
  > app-medlemskap, fordi topicens forfatter er en Catenda-bruker og ikke
  > nødvendigvis en app-bruker. **Den gir ingen tilgang** — den avgjør bare hvilken
  > kontraktsside en hendelse skrives med; tilgang går fortsatt gjennom
  > app-medlemskapet.
  >
  > Webhooken er **fail-closed**: uten entydig side opprettes ingen sak. Det gjelder
  > også når Catenda er utilgjengelig, siden lagmedlemskapet da ikke kan slås opp.
  > Å skrive en formell hendelse med en gjettet avsender er verre enn å ikke skrive
  > den.
  >
  > **Reproduksjonen er erstattet, ikke gjort om.** Den påsto at en EO opprettet av
  > TE omgår godkjenningskravet — rammingen dette avsnittet selv avviser. To
  > ordinære tester prøver nå det som faktisk ble besluttet: at rollen følger
  > medlemskapet, og at ingen sak opprettes uten entydig side.
- **GFK-04** — `ApprovalService` har ingen forseringsstøtte; `grep forsering` i filen
  gir kun `raise ValueError("Ugyldig vurderingstype.")` på linje 228. Funnet er
  korrekt, men **masterplanen fører dette allerede som en truffet beslutning**:
  «Prosjekter med policy kan inntil videre ikke svare på forseringsvarsel, fordi
  godkjenningsflyten ikke modellerer forseringssporet.» Dette er akseptert gjeld,
  ikke en ny feil.

### Middels og Lav — kontrollert, og de holder

Alle 25 gjenstående er kontrollert. 24 holder som beskrevet; FE-06 er inkonklusiv.
Ingen feilklassifiseringer i denne gruppen — påstandene er enklere og krysser færre
laggrenser, som er nettopp der de to foregående rundene sprakk.

| Gruppe | Utfall |
| --- | --- |
| AUT-03, AUT-04, AUT-06 | Bekreftet. `list_by_sakstype` finnes bare på Supabase-repoet, og `repository_type` er `"csv"` som standard, så AUT-04 treffer standardoppsettet. `hent_relaterte_saker(self, sak_id)` tar ingen prosjektparameter. |
| TFR-03 til TFR-06 | Bekreftet. TFR-04 er presis: `if require_truthy: if value:` forkaster `0` og `0.0`, og et subsidiært standpunkt på null blir da lest som «samme som prinsipalt». TFR-05 og TFR-06 er bekreftet strukturelt, ikke kjørt. |
| CFG-04, CFG-05, CFG-07 | Bekreftet. CFG-04 er reell asymmetri: `production_like()` har `os.getenv("APP_ENV", "development")` **med** default, `cookie_name()` har `os.getenv("APP_ENV") == "development"` **uten**. Usatt miljø gir dermed «ikke produksjon» og samtidig `__Host-`-cookie, som krever HTTPS. |
| OBS-05, OBS-06, OBS-07 | Bekreftet. `X-Request-ID` tas ordrett fra klienten uten lengdegrense, og servergenerert ID er `uuid4().hex[:8]` — 32 bit. OBS-07 gjelder bare når `app.debug`, altså den dokumenterte utviklingskonfigurasjonen. |
| INT-03, INT-06, INT-07 | Bekreftet. Validatorens liste (`webhook_security.py:198`) har ingen `bcf.*`-oppføringer, mens rutene på `:147` og `:152` håndterer dem — handlerne er død kode. INT-07: oppslagstabellen er nøklet på `"koe"`, mens `sakstype` er `"standard"`. |
| TST-01, TST-05, TST-06, TST-07 | Bekreftet. `grep -c outbox` i `endringsordre_service.py` gir 0, og linje 242 logger og går videre. TST-06: `list_all_sak_ids` mot `get_all_sak_ids` — samme funksjon, to navn. |
| FE-03, FE-05 | Bekreftet. FE-03 svarer til `state_referenced_locally`-advarslene `svelte-check` allerede gir. |
| GFK-05, GFK-06 | Bekreftet. `/api/letter/generate` har ingen `@require_contract_role`, så TE kan generere et brev med `avsender.rolle = "BH"`. GFK-06: `approval_authority.py:35` hopper over `grunnlag` i eksponeringen. |
| **FE-06** | **Inkonklusiv.** Verken `{@html` eller en ren interpolering av begrunnelse lot seg finne i `LetterHtmlPreview.svelte` med de søkene jeg kjørte. Påstanden er hverken bekreftet eller avkreftet. |

**To observasjoner fra denne runden endrer bildet et sted hver:**

- **AUT-03 er et andre tilfelle av samme mønster som AUT-01/AUT-02.** RV-09 ble rettet
  i de fire lesestiene, men `submit_batch` stempler fortsatt `last_event_at=datetime.now(UTC)`
  ubetinget (`event_routes.py:819`) — også for interne notater. Fiksen ble altså påført
  lesesiden, ikke skrivesiden. To uavhengige RV-funn er nå bekreftet lukket «der de ble
  funnet» snarere enn som klasse.
- **FE-05 gir et femte oslobygg-fallback.** `client.ts:11` har
  `let activeProjectId: string = 'oslobygg';`. RC-2 under bør derfor leses som fem lag,
  ikke fire: klientens standardverdi, serverens header-fallback, databasens `DEFAULT`,
  `ce_source`, og FE-01s manglende header.

**Om TST-07:** min egen opptelling gir 82 komponenter og 15 med test, mot sporets 87 og
29. Min matching er navnebasert og grovere; retningen er den samme og sporets tall er
trolig riktigere. Uenigheten er ikke materiell.

---

## Del 3: Tolv rotårsaker

Dette er den egentlige leveransen. 60 funn er ikke en arbeidsliste. Tolv er.

| # | Rotårsak | Dekker | Løses av |
| --- | --- | --- | --- |
| RC-1 | Tenant-grensen finnes bare i applikasjonskoden | AUT-01, -02, -05, -06, DB-04, DB-06, (RV-07, RV-09) | Fase 1 |
| RC-2 | Oslobygg-fallback i **fem** lag | DB-03, OBS-04, FE-01, FE-05, `project_context.py:14` | Fase 1, **før ekte data** |
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

**Etterprøvd (59 av 60).** Kritisk og Høy med full mekanismesporing; Middels og Lav
med kontroll av påstanden og plasseringen i rotårsak. Fire funn er bekreftet
strukturelt — ved lesing av kontrollflyten, ikke ved kjøring: TFR-05, TFR-06, TST-01
og TST-07.

**Ikke avgjort (1):** FE-06.

**Ikke vurdert:** mine egne AR-01 til AR-08. Samme forfatter som denne vurderingen.

Databasespørringene var rene katalogslesninger; ingen saksdata er lest og ingen
skriving utført. Testtallene er fra full kjøring etter sammenslåingen: 1440 bestått,
9 hoppet, 51 `xfail`.


