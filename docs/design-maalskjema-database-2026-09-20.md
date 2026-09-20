# Målskjema for databasen

Skrevet 20. september 2026 mot `a3f59d9` på grenen
`claude/database-architecture-review-v61w41`. Forrige ledd i kjeden:
[audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md), som lot
DA-12 til DA-15 stå som åpne designspørsmål. Dette notatet lukker dem, på
premisser besluttet av utvikler 20. september. Bygger på
[design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md) og
[transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md), som
allerede har formen på fire av tabellene.

Appen er ikke i produksjon og har ingen reelle data. Notatet beskriver et
målbilde, ikke en gjennomført endring. **Ingenting her er implementert.**

---

## Det korte svaret

**Målskjemaet er ikke mindre enn dagens.** Tjue tabeller blir atten. Det er
verdt å si rett ut, fordi arbeidspakken het «trenger vi alle tabellene?» og det
nærliggende svaret ville vært «nei, færre». Ni tabellnavn forsvinner, to
døpes om, og sju kommer til — fire av de sju er allerede designet i
[durable-inbox-notatet](design-durable-inbox-outbox-2026-09-17.md).

Gevinsten ligger et annet sted: **hver tabell får én skriver og én grunn til å
finnes, og journalen blir uforanderlig på en måte basen håndhever.** Dagens
skjema har en journal der runtime-legitimasjonen kan slette historikk, en
lesecache med fem skrivere, en projeksjon som kan feile stille, og to
medlemskapstabeller der den ene aldri leses. Det er dét som er problemet — ikke
antallet.

---

## Premisser besluttet 2026-09-20

Disse er avgjort av utvikler, ikke utledet. De er premisser for alt under.

| # | Beslutning |
| --- | --- |
| P1 | **Magic links utgår helt.** Innlogging skjer via Catenda ID eller Entra ID. Problemet magic links løste — tilgang uten konto — finnes ikke lenger |
| P2 | **BIM er ikke i bruk, men relevant.** Et BIM-objekt hører alltid til én konkret sak |
| P3 | **Formålet med BIM-koblingen er å vite hvilke komponenter som fører til tvist.** Byggherrens analysebehov, ikke primært bevis i enkeltsak |
| P4 | **Vedlegg lagres kun i Catenda**, lastet opp fra vår backend |
| P5 | **Løsningen bør i prinsippet kunne støtte andre virksomheter** enn Oslobygg KF |
| P6 | **To personer kan arbeide på samme sak i ulike spor samtidig** |
| P7 | Innebygd personvern er ønsket retning, men den rettslige avklaringen gjenstår |

---

## Målskjemaet

| Tabell | Opphav | Skriver |
| --- | --- | --- |
| `hendelse` | **Ny** — slår sammen `koe_events`, `forsering_events`, `endringsordre_events` | Innsendingstransaksjonen, kun `INSERT` |
| `sak` | Fra `sak_metadata`, uten de avledede kolonnene | Saksopprettelse + `set_catenda_mapping` |
| `sak_projeksjon` | **Ny** — de elleve avledede feltene | Innsendingstransaksjonen |
| `internt_notat` | **Ny** — ut av journalen | Notatruten |
| `vedlegg` | **Ny**, men alt designet i durable-inbox-notatet | Staging + innsendingstransaksjonen |
| `kommando` | **Ny**, fra durable-inbox-notatet. Dedupe av kommandoer | Innsendingstransaksjonen |
| `utgaende_levering` | **Ny**, fra durable-inbox-notatet. Outbox | Innsendingstransaksjonen + leveringsarbeider |
| `innkommende_hendelse` | **Ny**, fra durable-inbox-notatet. Inbox | Webhookmottak |
| `projects` | Beholdt, utvidet med `organisasjon_id`, Catenda-konfigurasjon og synkvannmerke | Prosjektadministrasjon |
| `app_users` | Beholdt | `koe_resolve_identity` |
| `app_identities` | Beholdt | `koe_resolve_identity` |
| `app_sessions` | Beholdt | `AuthRepository` |
| `app_oauth_attempts` | Beholdt | `AuthRepository` |
| `app_project_memberships` | Beholdt | `koe_reconcile_memberships` |
| `catenda_topic_board_configs` | Beholdt — genuint 1:N | `koe_register_project` |
| `catenda_contract_teams` | Beholdt | `koe_set_contract_teams` |
| `catenda_models_cache` | Beholdt | BIM-synk |
| `sak_bim_link` | Fra `sak_bim_links`, men som projeksjon av hendelser | Innsendingstransaksjonen |

**Fjernes:** `koe_events`/`forsering_events`/`endringsordre_events` (→ én),
`sak_relations`, `project_memberships`, `user_groups`, `magic_links`,
`catenda_project_configs`, `app_membership_sync`.

---

## Beslutninger

| ID | Beslutning | Status |
| --- | --- | --- |
| MS-01 | Én hendelsestabell i stedet for tre | Anbefalt — avgjøres med transaksjonsplanen |
| MS-02 | Append-only håndheves av basen, ikke av disiplin | Anbefalt |
| MS-03 | Total orden beholdes; konflikt løses med rebase, ikke med versjon per spor | Anbefalt (følger av P6) |
| MS-04 | `aktor_id` erstatter `aktor` som personnavn | Anbefalt (følger av P7) |
| MS-05 | Interne notater tas ut av journalen | Anbefalt (følger av P7) |
| MS-06 | `sak_metadata` deles i register og projeksjon | Anbefalt |
| MS-07 | Projeksjonen får én skriver, i hendelsens transaksjon | Anbefalt |
| MS-08 | `sak_relations` fjernes; relasjoner utledes fra hendelsene | Anbefalt |
| MS-09 | Prosjektgrensen håndheves av basen | Anbefalt — har en arkitekturkostnad |
| MS-10 | `organisasjon_id` innføres nå, org-laget bygges ikke | Anbefalt (følger av P5) |
| MS-11 | Vedleggshash lagres hos oss; bytene ikke | **Følger av P4 — hullet i dag** |
| MS-12 | `catenda_project_configs` slås inn i `projects` | Anbefalt |
| MS-13 | BIM-kobling blir hendelser; `sak_bim_link` blir projeksjon | Anbefalt (følger av P2, P3) |
| MS-14 | IFC-egenskaper fryses ved kobling | Anbefalt (følger av P3) |
| MS-15 | `magic_links`, `user_groups`, `project_memberships`, `app_membership_sync` fjernes | **Besluttet (P1) for magic links** |

---

### MS-01 — Én hendelsestabell

De tre er identiske i basen: nitten kolonner med samme navn, type, nullbarhet og
default, samme skranker, samme fremmednøkkel. Det er kontrollert, ikke antatt
(DA-12).

Argumentet er ikke ryddighet, det er at **alt sikkerhetsarbeid i dag må gjøres
tre ganger**: én RLS-policy per tabell når MS-09 skal innføres, ett sted per
tabell å tilbakekalle `UPDATE`/`DELETE` i MS-02, én append-only-trigger per
tabell. Gjennomgangen 20.09 måtte selv skrive `actorteam` i en løkke over tre
navn.

Samtidighetsinnvendingen holder ikke ved nærmere ettersyn.
`UNIQUE (sak_id, versjon)` er spredt over nøkkelrommet, ikke monotont, så det
finnes ingen strid om høyre bladnode. Det eneste monotone er identity-sekvensen,
som er cachet og uten betydning på dette volumet — anslaget i
[arkitekturdiagrammene](arkitektur-diagrammer.md) er ~5 000 saker per år.

Sakstypen ligger allerede på `sak.sakstype` og trenger ikke dupliseres på raden;
ruting blir et filter framfor et tabellvalg.

**Dette avgjøres sammen med transaksjonsplanen,** som forutsetter tre tabeller.
Men det bør avgjøres nå: basen er tom, så sammenslåingen koster ingen
datamigrasjon i dag. Det argumentet har en utløpsdato.

### MS-02 — Append-only i basen

I dag kan runtime-legitimasjonen `UPDATE` og `DELETE` hele historikken, og alle
tjue RLS-policyene sier `USING (true)`. En journal der et varsel avgjør om et
krav er prekludert, ligger i en tabell hvis rettigheter sier at det kan skrives
om.

Målbildet:

- `REVOKE UPDATE, DELETE ON hendelse` — også fra runtime-rollen
- En `BEFORE UPDATE OR DELETE`-trigger som `RAISE EXCEPTION`
- Innsetting gjennom én `SECURITY DEFINER`-funksjon som bare kan `INSERT`
- Migrering og break-glass er en **egen rolle**, tidsavgrenset og logget

Poenget er at invarianten ikke skal være policyavhengig. MS-06 er det som gjør
dette mulig å utvide utover `hendelse` — se der.

### MS-03 — Total orden beholdes

P6 sier at to kan arbeide i ulike spor samtidig. Den nærliggende løsningen er
versjon per spor, `UNIQUE (sak_id, spor, versjon)`. **Det anbefales ikke.**

Per-spor-versjonering bytter et billig problem mot et dyrt: den totale ordenen
på sakens hendelser forsvinner, og avspillingen i `compute_state` må da sortere
på `time`. Tidsstempler kan være like, og masterplanen flagger allerede
`datetime.now(UTC)` på autoskalerte containere som en usikker kilde når en
preklusjonsfrist står på spill. Ordenen har rettslig vekt; falske konflikter har
det ikke.

I stedet: behold `UNIQUE (sak_id, versjon)`, og la innsendingen prøve på nytt
mot ny versjon **når hendelsen ikke avhenger av tilstanden den leste**. Et
internt notat kan alltid rebases. En godkjenning av vederlag kan ikke — den
avhenger av hva som ble krevd, og der skal brukeren se konflikten. Skillet er en
egenskap ved hendelsestypen og hører hjemme i `business_rules.py`.

Dette er ortogonalt til MS-01: hver sak lever allerede i nøyaktig én tabell, så
sammenslåingen endrer ingenting her.

### MS-04 — `aktor_id`, ikke personnavn

`models/events.py` dokumenterer feltet som «navn **eller** bruker-ID». Det er
tvetydig ved konstruksjon, og det er verre enn begge deler hver for seg: en
leser vet ikke om verdien identifiserer en person eller beskriver en.

Journalen skal bære `aktor_id` som viser til `app_users`. Navnet slås opp ved
visning. Da blir «sletting» av en person én rad utenfor journalen, mens
hendelsen fortsatt beviser hvem som handlet.

Dette er halvparten av det innebygde personvernet, og det er den billige
halvparten — se MS-05 for den andre.

### MS-05 — Interne notater ut av journalen

`AGENTS.md` slår fast at et internt notat **ikke er et kontraktsvarsel**. Da
trenger det ikke journalens permanens — men i dag arver det den, fordi det er en
hendelsestype i samme append-only-strøm. Samtidig er det nettopp interne notater
som er fritekst om navngitte personer.

Egen tabell, vanlige rettigheter, egen oppbevaringsregel. Notatet viser til
`event_id` der det gjelder et bestemt varsel.

**En bieffekt er at versjoneringen blir riktigere:** i dag øker et internt notat
sakens versjonsnummer, altså den telleren som er den optimistiske låsen på
kontraktshandlinger. Et notat er ikke en kontraktshandling og bør ikke flytte
den telleren.

**Kostnaden:** tidslinjen i grensesnittet må flette to kilder, og
`event_visibility` må dekke begge. Det er reelt arbeid, men skjermingen går på
team i begge tilfeller, så regelen er den samme.

**Hvorfor ikke kryptografisk sletting i stedet.** Den er vurdert og anbefales
ikke nå: nøkkeltjenesten blir et nytt kritisk system med rotasjon og escrow,
journalen blir uleselig uten den, legal hold krever en mekanisme som drar motsatt
vei, og sannsynligheten for at sletteplikten i det hele tatt treffer journalen er
lav — Oslobygg KF er kommunalt, arkivplikt gjelder trolig, og GDPR art. 17 nr. 3
gjør unntak for rettskrav. MS-04 og MS-05 tar det meste av personvernproblemet
uten noen av de ulempene, og de er riktige uansett hvilken vei den rettslige
avklaringen faller.

### MS-06 — `sak` og `sak_projeksjon`

`sak_metadata` blander i dag to ting med ulikt skrivemønster:

- **Register:** `sak_id`, `prosjekt_id`, `created_at`, `created_by`, `sakstype`,
  og de tre Catenda-ID-ene. Kontrollert 20.09: dette skrives ved opprettelse,
  pluss én smal `set_catenda_mapping` når topicet finnes i Catenda.
- **Avledet:** ti `cached_*` pluss `last_event_at`. Skrives ved hver hendelse.

Blandingen er grunnen til at rettighetene ikke kan strammes: registeret trenger
ingen `UPDATE`, cachen trenger den hele tiden. Delt i to kan registeret låses
nesten like hardt som journalen, og all endring samles i projeksjonen.

Navnet `cached_*` bør falle bort i samme slengen. Det er ikke en cache — det er
en projeksjon, og forskjellen er at en cache kan tømmes uten tap.

### MS-07 — Én skriver på projeksjonen

De elleve feltene skrives i dag fra fem steder: `event_routes` (tre ganger),
`forsering_routes`, `approval_routes` og `endringsordre_service`. Derfor finnes
`scripts/backfill_reporting_cache.py` — et skript som eksisterer for å reparere
en projeksjon, er et argument om at den blir feil.

Rollupen skal **ikke** flyttes til SQL. `overordnet_status` er NS 8407-logikk, og
TFR-01 viste hvor subtil den er; to implementasjoner betyr to steder å ta feil.
Den blir værende i Python.

Løsningen er at samme transaksjon som legger på hendelsen, oppdaterer
projeksjonen — nøyaktig slik innsendingstransaksjonen i
[durable-inbox-notatet](design-durable-inbox-outbox-2026-09-17.md) allerede er
tegnet. Ett sted.

### MS-08 — `sak_relations` fjernes

Relasjonene ligger allerede i hendelsene. Kontrollert 20.09:

- Forsering: `data->'forsering_data'->'avslatte_fristkrav'`
- Endringsordre: `data->'relaterte_koe_saker'`

`_finn_forseringer_via_scan` utleder samme svar derfra i dag, så projeksjonen
bærer ingen informasjon hendelsene mangler. Den koster derimot konsistens: den
har null fremmednøkler (DB-04, fortsatt åpent), og skrivingen står i en
`try/except` som bare logger en advarsel — saken kan altså opprettes mens
relasjonen stilltiende uteblir.

Erstattes av GIN-indekser på de to jsonb-stiene.

**Må ryddes først:** EO-modellen har to felter for samme sak —
`relaterte_koe_saker` og aliaset `relaterte_sak_ids` («for
bakoverkompatibilitet»). En indeks kan ikke vedlikeholde to sannheter. Aliaset
må bort før relasjonene utledes fra payloaden.

### MS-09 — Prosjektgrensen ned i basen

`prosjekt_id NOT NULL` finnes nå på hendelsestabellene og `sak_relations`, så en
prosjektpolicy *lar seg* skrive. Ingen er skrevet, og grensen håndheves i
applikasjonen.

**Kostnaden er større enn en policylinje, og den bør sies høyt.** `service_role`
har `BYPASSRLS`. Så lenge appen kobler seg til som den, gjør en prosjektpolicy
nøyaktig ingenting. Det kreves en egen `app_runtime`-rolle uten `BYPASSRLS` — og
går trafikken gjennom PostgREST, må prosjektet ligge som claim i en per-bruker
JWT, med policyer som leser `current_setting('request.jwt.claims')`. Altså: appen
må utstede egne tokens framfor å bruke tjenestenøkkelen.

Det er en arkitekturendring, ikke en skjemaendring, og den hører til
«bytt fundamentet» i [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md).
Den bør besluttes der, ikke drive i det stille.

Akseptkriteriet masterplanen allerede ber om, blir da målbart: en rolle med
prosjekt A i konteksten får null rader fra prosjekt B ved direkte spørring,
utenom API-et.

**Notatskjermingen blir ikke flyttet til RLS.** Den går på team og er
domenelogikk; duplisert i SQL ville den vært to implementasjoner av samme regel.
Tenantgrensen i basen, notatskjermingen i appen.

### MS-10 — `organisasjon_id` nå, org-laget senere

P5 sier «i prinsippet». Det betyr ikke bygg det nå — men ett grep er nesten
gratis og stopper det verste.

**`projects.id` er i dag `'oslobygg'`.** Organisasjonsnavnet er brukt som
prosjekt-ID. Kommer byggherre nummer to, er organisasjonsidentiteten allerede
smurt ut i prosjektidentiteten, og det lar seg ikke rette når saker viser til
prosjektet.

Legg `organisasjon_id` på `projects` med én verdi. Ingen org-tabell, ingen
org-RLS. Bare ikke la prosjekt-ID-en bære to betydninger. `sak_id` er
Catenda-GUID og dermed globalt unik, så den tåler flere virksomheter som den er.

### MS-11 — Hashen ligger hos oss, bytene i Catenda

P4 er en legitim beslutning, og den **bekrefter** designet i durable-inbox-notatet
framfor å motsi det: `vedlegg.innhold` der er mellomlagring som frigis ved
levering, ikke et arkiv. Catenda er arkivet.

Men beslutningen flytter bevisproblemet, den fjerner det ikke. Har Catenda eneste
kopi, kan du ikke vise at dokumentet som ligger der i dag er dokumentet du sendte.

**Kontrollert 20.09: det finnes ingen hash noe sted.** `vedlegg_registry` har
`navn`, `storrelse`, `innhold BLOB` og `catenda_item_id` — ingen sjekksum.
Slippes bytene etter levering, er det ingen vei tilbake til hva som ble sendt.

Målbildet legger til én kolonne på `vedlegg`-tabellen som allerede er designet:

```
innhold_sha256   BYTEA NOT NULL   -- beholdes etter at innhold frigis
```

Da kan du bevise at filen du sendte hadde denne summen, og en kontroll mot
Catendas kopi avgjør om den er uendret. Det er dette som gjør
Catenda-som-arkiv forsvarbart, og det er én kolonne.

Registeret flytter samtidig fra SQLite (`koe_data/approvals.sqlite3`) til
Postgres, i tråd med fase 1 i arkitekturvurderingen. I dag ligger et `staged`
vedlegg på efemer disk og forsvinner ved omstart midt i en innsending — en
brukerfeil, ikke en bevisfeil, men reell på autoskalert infrastruktur.

### MS-12 — `catenda_project_configs` inn i `projects`

1:1 med delt primærnøkkel, og appen har ingen vei utenom Catenda. To
`is_active`-flagg på det som er samme ting, er symptomet.
`catenda_project_id`, `library_id` og `folder_id` blir kolonner på `projects`.

`catenda_topic_board_configs` blir **ikke** slått inn: kontrollert 20.09 bygger
repositoryet `topic_board_ids` som liste, så 1:N er reelt.
`app_membership_sync` er tre kolonner og ett vannmerke, og blir en kolonne på
`projects`.

### MS-13 — BIM-kobling som hendelse

P3 endrer begrunnelsen, men ikke konklusjonen — og det er verdt å merke seg
hvorfor.

Skal byggherren vite hvilke komponenter som fører til tvist, er spørsmålet
aggregert analyse på tvers av saker, ikke bevis i én sak. Men **`delete_link`
ødelegger nettopp den analysen.** Kobles en vegg til saken og fjernes igjen,
forsvinner raden. Da svarer basen ikke lenger på «hvilke komponenter var
involvert i saker som endte i tvist» — den svarer på «hva var fortsatt koblet da
noen sist så på saken». En stille feilkilde som aldri gir utslag i en feilmelding.

Kobling og frakobling blir hendelser (`BIM_OBJEKT_KOBLET`, `BIM_OBJEKT_FRAKOBLET`),
og `sak_bim_link` blir en projeksjon på linje med `sak_projeksjon`. At tabellen
allerede har `linked_at`, `linked_by` og `kommentar` — tidsstempel, aktør,
kommentar — er et tegn på at den er en skyggehendelseslogg i dag.

Dette gir analysen et korrekt grunnlag uansett, og bevis i tillegg dersom det
skulle vise seg å trenges.

### MS-14 — IFC-egenskaper fryses ved kobling

Skal tall telles over år, må dimensjonene være frosset ved koblingstidspunktet.
Revideres modellen i Catenda, kan objektet bytte IFC-type eller forsvinne, og da
endrer historiske tall seg under deg. `fag`, `object_ifc_type`, `object_name` og
`object_global_id` er allerede kolonner, og det er riktig.

`properties` bør fanges ved kobling selv om verdien er usikker. Begrunnelsen er
asymmetrien, ikke sikkerheten: data kan alltid kastes senere, men hva en vegg
hadde av egenskaper i 2026 kan ikke rekonstrueres i 2028 — modellen har gått
videre. Lagring er billig; den uopprettelige retningen avgjør.

### MS-15 — Det som fjernes

| Tabell | Hvorfor |
| --- | --- |
| `magic_links` | **P1.** Innlogging via Catenda ID / Entra ID. Tabellen var uansett ubrukt; tokens lå i `koe_data/magic_links.json` |
| `user_groups` | Etterlatenskap etter Supabase Auth. Null rader, fremmednøkkel til `auth.users`, og de to leserne kalles ikke |
| `project_memberships` | Skrives av en trigger, leses aldri. Kodens egen skrivesti treffer unik-skranken og logger en advarsel hver gang |
| `app_membership_sync` | Blir kolonne på `projects` (MS-12) |

**`project_memberships` har én forutsetning:** `viewer`-rollen finnes bare der.
`app_project_memberships` har `CHECK (role IN ('admin','member'))` pluss
`viewer_override`. DB-05 er funnet om at modellen `ProjectMembership` med
`role='viewer'` bryter den skranken. Begrepet må avklares før tabellen fjernes —
det er en domenebeslutning, ikke en oppryddingsbeslutning.

---

## Konsekvenser utenfor skjemaet

Fire ting følger av beslutningene, men er kode og ikke tabeller:

1. **Catenda-kommentarene må skrives om (P1).** `catenda_comment_generator`
   legger i dag ved en lenke merket «Åpne sak i KOE-systemet», med magic
   link-token som URL. Uten magic links
   må lenken bli en vanlig URL som krever innlogging. Det er uproblematisk nå
   som mottakeren per definisjon har Catenda-konto — men kommentaren må endres,
   og gamle kommentarer i Catenda vil peke på lenker som slutter å virke.
2. **`relaterte_sak_ids`-aliaset må fjernes** før MS-08 kan gjennomføres.
3. **`aktor` må ryddes** (MS-04) før journalen fylles med ekte navn.
4. **Docstringen i `supabase_event_repository.py`** er en fjerde skjemakilde og
   er feil på tre punkter (DA-06). Den bør erstattes av en henvisning til
   migrasjonsfila.

## Rekkefølge

Bindingene mellom beslutningene gir en rekkefølge:

1. **MS-04, MS-05, MS-10** først. De er billige, og alle tre blir umulige eller
   dyre når journalen inneholder ekte data. MS-10 blir umulig når et annet
   prosjekt viser til `'oslobygg'`.
2. **MS-01 sammen med transaksjonsplanen.** Sammenslåingen endrer formen
   innsendingstransaksjonen skrives mot.
3. **MS-06, MS-07, MS-11** i samme runde som transaksjonsplanen, siden alle tre
   handler om hva som skjer i innsendingstransaksjonen.
4. **MS-02** etter at journalens form er endelig — å tilbakekalle rettigheter
   før skjemaet er stabilt gir bare friksjon i migreringene.
5. **MS-09** når fundamentet avgjøres, ikke før. Den avhenger av at appen slutter
   å bruke `service_role`.
6. **MS-08, MS-13, MS-14, MS-15** kan gjøres uavhengig, når som helst.

Det gjennomgående er at **basen er tom nå.** Hvert eneste punkt over koster null
datamigrasjon i dag. En append-only journal kan per definisjon ikke
restruktureres i ettertid.

---

## Verifikasjon og grenser

**Kontrollert mot basen eller koden 20.09**, som grunnlag for beslutningene over:

- At de tre hendelsestabellene er identiske (kolonne-sjekksummene er like).
- At `sak_metadata` har nøyaktig to skrivestier etter opprettelse:
  `set_catenda_mapping` og `update_cache`.
- At relasjonene ligger i `data->'forsering_data'->'avslatte_fristkrav'` og
  `data->'relaterte_koe_saker'`, og at EO-modellen har et alias for det siste.
- At `catenda_topic_board_configs` er genuint 1:N (`topic_board_ids` er en liste).
- At `vedlegg_registry` ikke har noen hash-kolonne, og at den bruker SQLite.
- At `aktor` er dokumentert som «navn eller bruker-ID».
- At alle RLS-policyer utenom én er `service_role / ALL / USING (true)`.

**Lest, ikke kjørt:**

- Alt om hva `supabase db push`, `BYPASSRLS` og PostgREST-claims vil gjøre.
  Ingen `app_runtime`-rolle er opprettet, og ingen prosjektpolicy er skrevet.
- At rebase-strategien i MS-03 lar seg gjennomføre. Skillet mellom
  sporavhengige og sporuavhengige hendelser er ikke kartlagt hendelsestype for
  hendelsestype — det er forutsatt at skillet finnes, ikke vist.

**Ikke vurdert:**

- **Ytelse.** Ingen anbefaling her hviler på en måling. Basen er tom, og det
  finnes ingen spørreplan å lese. Påstanden i MS-01 om at samtidighet ikke er et
  problem, er et resonnement om indeksform og volumanslag, ikke en test.
- **Den rettslige avklaringen (P7).** MS-04 og MS-05 er valgt fordi de er
  riktige uansett utfall. Faller avklaringen slik at sletteplikten *treffer*
  journalen, må kryptografisk sletting vurderes på nytt — og da er MS-05
  forutsetningen som gjør det overkommelig, fordi fritekst om personer da ligger
  utenfor den uforanderlige strømmen.
- **Migreringen selv.** Notatet beskriver et målbilde. Hvordan man kommer dit
  fra dagens skjema, med hvilke migrasjonsfiler og i hvilken rekkefølge de
  anvendes, er ikke skrevet — og mekanismen fra fil til base finnes fortsatt
  ikke (DA-03).
- **Om `hendelse` bør partisjoneres** på `prosjekt_id`. Ikke vurdert; ved
  ~5 000 saker/år er det trolig for tidlig, men det er en antakelse.
