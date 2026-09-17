# Prompt: etterprøving av funn og anbefalinger fra 2026-09-17

Denne filen er en **prompt til en ny modell** som skal overprøve arbeidet i
[vurdering av Power Platform](vurdering-power-platform-2026-09-17.md) og
[design for durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md).

Kopier alt under linjen. Den er skrevet for å bli motsagt, ikke bekreftet.

---

# Oppdrag: etterprøv en arkitekturvurdering, ikke bekreft den

Du overtar etter en økt som gjorde tre ting: vurderte Power Platform mot kontrollene
denne kodebasen har bygget, designet en durable inbox/outbox, og anbefalte å ferdigstille
dagens kodebase framfor å bygge om på Microsoft-stacken.

**Oppdraget ditt er å finne ut hvor den økten tok feil.** Ikke å oppsummere den, og ikke
å bekrefte den. Hvis du konkluderer med at anbefalingen står, skal det være fordi du
forsøkte å rive den og ikke klarte det — og du skal vise hva du forsøkte.

Brukeren har eksplisitt bedt om denne etterprøvingen. En høflig gjennomgang som lander på
«dette ser fornuftig ut» er et mislykket svar.

## Konteksten

`khjohns/endringsmeldinger` — SvelteKit 2 SPA (Svelte 5 runes, `adapter-static`,
`ssr: false`) med Flask-backend, for NS 8407-forhandlinger mellom byggherre (BH) og
totalentreprenør (TE). All UI-tekst og dokumentasjon er **norsk bokmål**.

Domenet er juridisk. Tekst appen genererer går inn i formelle kontraktsbrev til
motparten, og feil i domenelogikk har direkte økonomisk konsekvens. Feil part som leser
motpartens interne vurdering er et reelt problem, ikke et teoretisk.

**Appen er ikke i produksjon, og databasen inneholder ingen reelle data**
(brukeravklaring 2026-09-15). Brukeren har presisert at auditene og koden er work in
progress, og at appen **må være sikker før produksjonssetting**. Les derfor funn som krav
til produksjonssetting, ikke som kritikk av ferdig arbeid.

Repoet har **ingen CLAUDE.md** — den ble bevisst slettet. `docs/` er konteksten.

## Miljø

```bash
npm install

cd backend
# files.pythonhosted.org har tidet ut i tidligere økter; bruk lang timeout.
pip install --timeout 180 --retries 10 --ignore-installed PyJWT \
  -r requirements.txt -r requirements-dev.txt
python3 -m pytest -q
```

`api.catenda.com` er blokkert av proxyen. Ingen live Catenda-test kan kjøres. Testsuiten
går uten nettverk i det hele tatt, og skal forbli slik.

Forventet baseline (fra forrige handoff — **verifiser den selv, ikke stol på tallet**):

| Kommando | Forventet |
| --- | --- |
| `cd backend && python3 -m pytest -q` | 1278 passerer |
| `npx vitest run` | 529 tester, 44 filer |
| `npm run check` | 0 feil, 10 advarsler |
| `npm run lint` | grønn |
| `npm run build` | passerer |
| `ruff check services/ routes/ lib/ tests/` | 16 feil, alle eksisterende |

**Den forrige økten kjørte ikke suiten.** Den endret ingen kode, bare dokumentasjon, så
baselinen skal være urørt — men det er en antakelse, ikke en observasjon. Kjør den.

## Les i denne rekkefølgen

1. `docs/design-durable-inbox-outbox-2026-09-17.md` — de konkrete påstandene
2. `docs/vurdering-power-platform-2026-09-17.md` — plattformvurderingen
3. `docs/handoff-gpt-astra-2026-09-15.md` og `docs/handoff-2026-09-15.md` — etablert praksis
4. Auditloggene `docs/audit-*.md` etter behov

---

# Del 1: Påstander som kan falsifiseres i koden

Dette er ryggraden. Hver påstand har en fil og et linjenummer. **Åpne dem.** Linjenumre
kan ha flyttet seg; da er det i seg selv verdt å notere.

| # | Påstand | Bevis som ble oppgitt | Slik faller den |
| --- | --- | --- | --- |
| P1 | Hendelseslageret nås over PostgREST, så en outbox-rad kan ikke skrives i samme transaksjon som hendelsen | `repositories/supabase_event_repository.py:232` (`create_client`), `:426` (`.insert(rows).execute()`) | Finn en måte å kjøre en flerstegs transaksjon på gjennom denne klienten, eller en RPC/`postgres_changes`-vei som gir samme garanti |
| P2 | Det finnes ingen bakgrunnsworker i repoet | `ApprovalService.deliver` kalles bare fra `routes/approval_routes.py:152` | Finn en scheduler, cron, tråd eller ekstern jobb som drenerer `approval_outbox` |
| P3 | `submit_event` berører tre lagringssystemer og fire eksterne kall uten transaksjon | `routes/event_routes.py:370`–`620` | Vis at to av lagrene faktisk er samme lager, eller at en transaksjon spenner over dem |
| P4 | `approval_outbox` dekker bare `ApprovalService.publish` | `services/approval_service.py:59`, `:575`–`640` | Finn en annen innsendingsvei som legger rader der |
| P5 | Webhookens idempotens er in-memory og tapes ved restart | `lib/security/webhook_security.py` | Vis at Redis er obligatorisk i produksjonskonfigurasjon, eller at en DB-tabell dekker det |
| P6 | `visible_events()` kalles på fire steder, og `/api/analytics/timeline` går utenom | `routes/event_routes.py:1112`, `:1184`; `routes/related_cases_utils.py:80`, `:140` | Finn et femte kallsted, eller vis at analytics ikke kan lekke notatinnhold |
| P7 | Catenda-innlogging bruker OAuth 2.0 uten OIDC — ingen `id_token` | `lib/auth/catenda_oauth.py` | Finn `id_token`-håndtering, eller dokumentasjon på at Catenda tilbyr OIDC-discovery |

**P1 er den viktigste.** Hele designet hviler på den. Faller P1, faller anbefalingen om å
bytte databaseklient først, og rekkefølgen i del 9 i designdokumentet må skrives om.

## En påstand jeg selv fant svak i etterkant

Designdokumentet sier at «sendt» har tre veier og behandler dem som strukturelt like.
Det er **ikke helt presist**, og den forrige økten leste `submit_batch` bare delvis:

`submit_batch` (`routes/event_routes.py`, rundt `:760`–`815`) leverer vedlegg, men kaller
**aldri** `_post_to_catenda`. Den har altså ikke samme delvis-levering-problem som
`submit_event` — den har et *annet* hull: ingen PDF, ingen kommentar, ingen statussynk i
det hele tatt. Auditloggen for hendelsesflyt noterer dette («Batch-innsending leverer
ikke til Catenda»), men designdokumentet behandler de tre veiene som symmetriske.

**Kontroller om det er tilsiktet eller en mangel.** Hvis en batch-innsending er en formell
meddelelse til motparten, skal den også leveres. Hvis den bare brukes ved saksopprettelse,
er det kanskje riktig. Den forrige økten avklarte det ikke.

## Måltall som bør kontrolleres

Vurderingsdokumentet siterer auditserien på «Produksjonskode 50 565 linjer / Testkode
19 423 / Forhold 0,38». Egen måling i etterkant ga:

- backend produksjonskode: 50 315
- backend testkode: 19 564
- frontend `src/` uten tester: 31 477

Altså ser 0,38-forholdet ut til å måle **bare backend**, mens det presenteres som et tall
for kodebasen. Regnes frontend med, er forholdet et helt annet. Dette påvirker påstanden
om at testdekningen er «under vanlig». Kontroller hva tallet faktisk måler, og om
konklusjonen står.

---

# Del 2: Designvalg som er skjønn, ikke fakta

Disse kan ikke falsifiseres i koden. De kan være feil vurderinger. Argumenter mot dem.

**D1 — Én outbox-rad per hendelse med stegsjekkpunkt, framfor én rad per delsteg.**
Begrunnelsen var `AUD-06`: «levert» krever PDF *og* kobling *og* kommentar *og*
statussynk, og med én rad per steg blir det en spørring på tvers av rader. Motargumentet
som ikke ble vurdert grundig: én rad per steg gir bedre parallellitet, enklere
retry-granularitet og en naturlig dead letter per operasjon. Er `AUD-06`-hensynet verdt
den prisen, eller kan det løses med en avledet status?

**D2 — Vedleggsbytes i `VARBINARY(MAX)` i samme database framfor Blob Storage.**
Begrunnet med at det gjør atomisiteten triviell, ved et volumanslag hentet fra
`docs/arkitektur-diagrammer.md` som **ikke er verifisert mot virkeligheten**. 15 MB per
fil, 50 vedlegg per hendelse. Regn på det. Vurder også sikkerhetskopistørrelse og
gjenopprettingstid.

**D3 — Konsolider alle lagrene til én database.** Dette er den store, dyre anbefalingen.
Motargument som fortjener en skikkelig vurdering: behold hendelseslageret der det er, skriv
outbox-raden ved siden av uten atomisitet, og bruk en **avstemmingsjobb** som finner
hendelser uten leveranse. Det er svakere garanti, men vesentlig billigere. Er den svakere
garantien god nok for dette domenet? Den forrige økten forkastet dette alternativet uten å
skrive det ned — det er en reell svakhet i vurderingen.

**D4 — Er en durable outbox med worker overengineering for skalaen?** Volumanslaget er
~150 000 hendelser i året, altså noen få i minuttet. En enklere variant: forsøk levering
på nytt ved neste lesing av saken, uten egen worker. Argumenter for eller mot ut fra
konsekvens, ikke ut fra hva som er «riktig arkitektur».

**D5 — Rekkefølgen i del 9.** Klient først, konsolidering andre, inbox tredje, outbox
fjerde. Er inbox virkelig mindre haster enn konsolidering? Med flere replikaer og
in-memory idempotens er duplikatbehandling av webhooks en nærværende risiko.

---

# Del 3: Vurderinger jeg er minst trygg på

Rangert, mest usikker først. Dette er der du sannsynligvis finner noe.

1. **Påstanden om at auditserien «konvergerer».** Begrunnelsen var at 14. september ga
   AUD-01..07 og PDF-01..04 (mange høye), mens 15. september ga stort sett middels og lave
   funn, hvorav to var testproblemer. **Den alternative forklaringen ble ikke utelukket:**
   at de senere auditene hadde snevrere omfang, ikke at det finnes færre feil. Sjekk
   omfangsavsnittene i hver logg. Hvis omfanget ble smalere, er konvergensargumentet
   ugyldig — og da svekkes anbefalingen om å ferdigstille, fordi den hviler på at domenet
   er ferdig.

2. **Anbefalingen om å ferdigstille framfor å bygge om.** Den hviler på organisatoriske
   forhold ingen har opplyst: hvem som skal drifte løsningen, om IKT vil kjøre en
   container, hva eksterne Power Apps-lisenser koster, og om det finnes utviklerkapasitet
   etter lansering. Den forrige økten navnga disse forbeholdene, men konkluderte likevel.
   Er konklusjonen forsvarlig uten svarene?

3. **Tellingen «åtte dekket helt, to delvis, ett gjelder ikke, ni står igjen».** Hver rad
   i den tabellen er en vurdering av om en plattform ville hindret et konkret funn. Flere
   er diskutable. Gå gjennom minst de ni «Nei»-radene og se om noen av dem faktisk ville
   vært dekket.

4. **Alt om Power Platform, Dataverse, Fabric og Azure SQL.** Ingenting av det er prøvd i
   dette miljøet. Særlig versjonsfølsomt: API-grenser, oppbevaringstid for kjørehistorikk,
   sikkerhetskopiretensjon, hva som krever Managed Environments, og om
   Dataverse-radsikkerhet følger med til Fabric. **Hvis du har tilgang til gjeldende
   Microsoft-dokumentasjon, verifiser disse.** Flere av konklusjonene faller hvis de er
   utdaterte.

5. **Sikkerhetsreglene i del 6 av designet.** Særlig påstanden om at en outbox-rad som
   bærer sitt eget endepunkt er en SSRF-primitiv, og at målet derfor må løses opp ved
   commit. Er det riktig avveid, eller er det et teoretisk hensyn som gjør designet
   unødig stivt når prosjektregisteret uansett er internt?

6. **At `submit_batch` og `ApprovalService.publish` trenger samme outbox-kobling.** Se
   nyansen over. Den forrige økten leste ikke `submit_batch` i sin helhet.

---

# Del 4: Arbeidsmåten brukeren forventer

Dette er etablert gjennom ti auditrunder og er ikke forhandlingsbart:

- **Reproduser funn med en test som feiler først**, rett, verifiser. En hypotese er ikke
  et funn.
- **Hypoteser rapporteres aldri som bekreftede funn uten kodebevis eller reproduksjon.**
- **Si hva du sjekket og *avskrev*, ikke bare hva du fant.** Brukeren verdsetter dette
  eksplisitt. En mistanke som ikke holdt skal stå i loggen med begrunnelse, ikke utelates
  i stillhet.
- **Alvorlighet angir mulig konsekvens under beskrevne forutsetninger**, ikke at noe er
  observert i produksjon.
- Norsk bokmål i all dokumentasjon og UI-tekst.
- **Ingen modellnavn i kode, kommentarer eller dokumentasjon** — kun i commit-trailer.
- Skriv resultatet som `docs/audit-<område>-<dato>.md` med funn, hva som passerer,
  verifikasjon og gjenstående. Krysslenk fra de dokumentene du etterprøver.
- Commit-konvensjon: norsk imperativ emnelinje uten prefikstaksonomi, brødtekst som
  forklarer *hvorfor* og hva som ble verifisert.

Et mønster verdt å kjenne igjen i dette repoet: **død kode holdt i live av tester som
peker på den.** Det er funnet to ganger. «Hva er det bare testene som bruker?» er et
produktivt spørsmål her.

---

# Del 5: Hva svaret ditt skal inneholde

1. **Hver påstand P1–P7 med utfall**: bekreftet, avkreftet, eller delvis — med fil og
   linje slik du fant den.
2. **Din vurdering av D1–D5**, med en anbefaling der du er uenig. Ikke bare «det kommer an
   på».
3. **Konvergensspørsmålet i punkt 1 av del 3** besvart eksplisitt, siden anbefalingen
   hviler på det.
4. **Hva du sjekket og avskrev.**
5. **Din egen konklusjon på hovedspørsmålet**: ferdigstille dagens kodebase, eller bygge
   om? Du har lov til å lande annerledes. Hvis du lander likt, si hva du forsøkte som
   kunne endret det.
6. **Det du ikke rakk eller ikke kunne verifisere**, eksplisitt.

## Om å være uenig

Brukeren har bedt om en second opinion fordi den forrige økten skrev både funnene og
anbefalingen selv, uten at noen prøvde å rive dem. Den økten hadde heller ingen tilgang
til å teste Power Platform-påstandene sine, og bygget en anbefaling delvis på dem.

Det er et reelt metodeproblem, ikke falsk beskjedenhet. Hvis du finner at anbefalingen
står, er det et gyldig svar — men det er bare verdt noe hvis du først forsøkte det
motsatte.
