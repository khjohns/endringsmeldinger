# Gjennomføring: tabellregisteret, første runde (spor M, 1a)

**Dato:** 2026-09-29. **Commit:** grenen `claude/datamodell-docs-testing-oqxti5`
over `main` på `fb278d8` (PR #87). Appen er ikke i produksjon og har ingen
reelle data. Alvorlighet angir mulig konsekvens under beskrevne forutsetninger,
ikke observert hendelse.

**Forrige ledd:** [oppdraget for spor M](prompt-datamodell-og-funksjonskart-2026-09-29.md),
der avsnitt 4 er utgangspunktet for runden. Status for funnene står i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#4-funnregister).
Arbeidet følges i [#80](https://github.com/khjohns/endringsmeldinger/issues/80).

## 1. Hva som er levert

- [`datamodell/tabeller.toml`](datamodell/tabeller.toml): 19 tabeller i
  PostgreSQL, 6 i SQLite og 3 lagre utenfor databasene, med IKTs sju kolonner,
  tilleggsfelt og belegg.
- [`verktoy/datamodell.py`](verktoy/datamodell.py) lager
  [`datamodell/tabeller.md`](datamodell/tabeller.md) og Excel-fila.
- Testene i
  [`test_tabellregister.py`](../backend/tests/test_datamodell/test_tabellregister.py)
  feiler når:
  - en tabell mangler oppføring
  - en oppføring mangler tabell
  - en tabell i bruk ikke har skriver
  - en funn-ID ikke står i hovedplanen
  - de genererte filene er utdaterte

Beskrivelsene er ikke gjennomlest av oppdragsgiver.

## 2. Funn

| ID | Funn | Alvorlighet | Belegg |
| --- | --- | --- | --- |
| DM-01 | Åtte kolonnekommentarer i basen finnes ikke i migrasjonene | Lav | K 29.09 |
| DM-02 | BIM-modellcachen leses, men ingenting skriver den | Foreløpig | L 29.09, katalogen K 29.09 |
| DM-03 | Migrasjonene legger inn prosjektet `oslobygg`, og det er basens eneste prosjekt | Lav | K 29.09 |
| DM-04 | Vakta for ruteregisteret ser ikke alle ruter og godtar utgåtte innloggingsmekanismer | Middels | K 29.09 |

### DM-01 — kommentarer som bare finnes i basen *(lav)*

**Sted:** `supabase/migrations/20260911073512_koe_kjerneskjema_rekonstruert.sql`.

Prosjektet har kolonnekommentarer på de åtte `cached_*`-kolonnene i
`sak_metadata`. En base bygget fra migrasjonene har dem ikke.
- Kommentarene står i originalteksten til kjerneskjemaet i
  [`vedlegg/migrasjonshistorikk-2026-09-22/`](vedlegg/migrasjonshistorikk-2026-09-22/20260911073512_001_koe_core_tables.sql).
- Den rekonstruerte fila sier at den gjengir katalogen, men tok ikke med
  kommentarene.
- Kolonnesummen, som ellers er lik i basen og testbasen, fanger det ikke.

**Konsekvens:** ingen for atferden. Beskrivelser i basen er i dag ikke et
pålitelig hjem, og det er en grunn til at registeret er kilden.

### DM-02 — BIM-modellcachen har ingen skriver *(foreløpig)*

**Sted:** `catenda_models_cache`, `BimLinkRepository.upsert_cached_models`, og
rutene `list_ifc_products`, `list_ifc_types` og `list_bim_models` i
`routes/bim_link_routes.py`.

- **Lest ut av koden (L 29.09):**
  - De tre rutene leser cachen og gir tomme lister når den er tom.
  - `upsert_cached_models` har ingen kaller, heller ikke i Git-historikken,
    som begynner 18.09.
- **Kjørt mot prosjektet (K 29.09):**
  - Ingen funksjon eller trigger nevner tabellen.
  - Prosjektet har ingen Edge Functions.
  - Statistikken viser 0 rader og 0 innsettinger.

[Databaseauditen 20.09](audit-databasearkitektur-2026-09-20.md#da-15--bim-flaten-er-ikke-vurdert-av-noen-åpent-spørsmål)
skrev at cachen er «fylt av `upsert_cached_models`». Det stemmer ikke lenger,
og auditen har fått en datert merknad.

**Ikke kontrollert:** om cachen var ment fylt manuelt eller av noe utenfor
repoet, og hva brukeren ser i grensesnittet. Funnet er foreløpig til det er
reprodusert gjennom rutene. Det hører til flaten i DA-15, som mangler en
produkteier.

### DM-03 — prosjektet `oslobygg` legges inn av en migrasjon *(lav)*

**Sted:**
- `supabase/migrations/20260911073600_projects.sql`, som legger inn raden
- `supabase/migrations/20260920192448_organisasjon_id_paa_projects.sql`, som
  setter `organisasjon_id = 'oslobygg'` på den

**Kjørt (K 29.09):**
- En base bygget fra migrasjonene har ett aktivt prosjekt: `oslobygg`,
  opprettet av `system`.
- Prosjektet har også bare ett prosjekt, og det er den samme raden (telling i
  katalogen, uten innhold).

Prosjektet appen bruker i dag, er altså skapt av en migrasjon, ikke registrert
av drift. Hvordan raden har fått kobling til Catenda, er ikke kontrollert.

**Konsekvens:** hver base som bygges fra tom, får et aktivt prosjekt for én
bestemt virksomhet. Det gjelder også en ny base på en annen plattform (B-12) og
en installasjon for en annen virksomhet (P5). Dette er ikke en fallback i
koden; sikkerhetsinvarianten om at det ikke finnes noe defaultprosjekt, gjelder
koden og er ikke brutt. Men en virksomhets data i skjemamigrasjonene går imot
formålet med `organisasjon_id` (MS-10).

**Ikke avgjort:** om raden skal fjernes fra migrasjonene og registreres av drift
når en ny base settes opp. Det avhenger av hvordan basen bygges på den valgte
plattformen.

### DM-04 — vakta for ruteregisteret ser ikke alle ruter *(middels)*

**Sted:** `_uautentiserte_ruter` og `AUTH_DECORATORS` i
[`test_public_route_registry.py`](../backend/tests/test_security/test_public_route_registry.py).

`AGENTS.md` sier at testen håndhever sikkerhetsinvarianten om `require_auth`
og `require_project_access`. Den gjør mindre enn det, på tre måter:

1. **Den ser bare dekoratøren `route`.**
   - Ruter som er deklarert med `.get`, `.post` eller `.patch`, samles ikke
     inn. I dag gjelder det sju ruter: fire i `auth_routes.py` og tre i
     `membership_routes.py`.
   - Appen registrerer 64 ulike stier (71 URL-regler); testen ser 57 av
     stiene.
   - **Kjørt (K 29.09):** en ny rute uten noen autentisering, skrevet som
     `@utility_bp.post(...)`, ga grønn test.
2. **Den godtar `require_magic_link` og `require_entra_auth` som
   autentisering.**
   - Magic links er vedtatt avviklet (P1), og innlogging skjer bare med Catenda
     (18.09).
   - `require_entra_auth` faller tilbake til `require_magic_link` når Entra ID
     ikke er slått på.
   - Ingen rute bruker dem i dag, og ingen i appen lager nye lenker (L 29.09).
   - **Kjørt (K 29.09):** en ny `POST`-rute med bare `@require_magic_link` ga
     grønn test. En slik rute har verken Catenda-sesjon, CSRF-kontroll eller
     prosjektgrense.
3. **Den kontrollerer ikke `require_project_access`.** Fem autentiserte ruter
   er uten den:
   - `GET` og `POST /api/projects`
   - `/api/csrf-token`
   - `/api/auth/session`
   - `/api/auth/logout`

   Alle fem er lest, og ingen trenger et prosjekt:
   - prosjektlista filtrerer på medlemskap
   - `POST` svarer 403 utenfor utviklingsmodus
   - de tre andre gjelder sesjonen

**Ingen rute er funnet eksponert.** De sju testen ikke ser, er beskyttet eller
åpne med vilje (L 29.09):
- Medlemsrutene har `require_auth` og `require_project_access`.
- `session` og `logout` har `require_auth`.
- `login` og `callback` er OAuth-flyten og må være åpne, men står ikke med
  begrunnelse i `OFFENTLIGE_RUTER`, fordi testen aldri så dem.

**Alvorlighet middels,** fordi testen er den eneste mekaniske vakta for første
sikkerhetsinvariant. SA-01 viste hva som skjer uten den: en hel OAuth-flate lå
i appen gjennom ti auditrunder.

**Retting, ikke gjort i denne runden:**
- Samle rutene fra `.get`/`.post`/`.put`/`.patch`/`.delete` i tillegg til
  `route`, med blueprintens `url_prefix`.
- Sammenlikne med `app.url_map`, slik at en rute testen ikke ser, gir rød test.
- Ta de to utgåtte dekoratørene ut av `AUTH_DECORATORS`.
- Kreve `require_project_access` med en uttrykkelig unntaksliste.
- Føre opp `login` og `callback` med begrunnelse.

## 3. Rettet i runden

Første utkast av registeret sa at `projects` har «to veier» inn, rutene `POST`
og `PATCH /api/projects` og `koe_register_project`. Det var for sterkt:
- `POST` svarer 403 utenfor utviklingsmodus.
- `PATCH` endrer bare navn, beskrivelse og innstillinger, og krever
  prosjektadministrator.

Oppføringen og [oppdraget, avsnitt 4](prompt-datamodell-og-funksjonskart-2026-09-29.md#4-utgangspunktet-2909)
er rettet før PR-en ble flettet.

## 4. Observasjoner uten eget funn

- **Én godkjenning per prosjekt.** `eo_approvals` lagrer alle
  endringsordregodkjenninger i et prosjekt som ett JSON-dokument. Det har
  betydning for låsing og samtidighet når lageret flyttes til PostgreSQL (F1,
  F2). Det er ikke vurdert som en feil i SQLite, der hele fila låses uansett.
- **Utstederen for Catenda står to steder.** `koe_reconcile_memberships` har
  utstederen hardkodet, mens Python bruker `CatendaOAuth.BASE`. Det er kjent og
  kontrollert i [gjennomføringen av MG-02](gjennomforing-mg02-2026-09-21.md#hindring-3-var-oppfylt);
  verdiene er like.

## Verifikasjon og grenser

**Kjørt og observert 29.09:**
- katalogspørringer mot prosjektet og mot testbasen bygget fra migrasjonene
  (PostgreSQL 17)
- to mutasjoner mot ruteregistertesten, begge grønne, begge tilbakestilt
- oppstart av appen med og uten webhook-hemmelighet, for å telle URL-regler
- hele backend-suiten med testbasen
- fire mutasjoner mot tabellregistertestene, alle røde

**Lest ut av koden:** skriverne og leserne i avsnitt 4 i oppdraget og i
registeret, og rutene og dekoratørene i DM-04.

**Ikke kontrollert:**
- grensesnittet
- om noen rute oppfører seg annerledes enn dekoratørene tilsier
- Catenda-koblingen for prosjektet `oslobygg`
- hvorfor `upsert_cached_models` mangler kaller
- innholdet i noen tabell, utover tellinger
