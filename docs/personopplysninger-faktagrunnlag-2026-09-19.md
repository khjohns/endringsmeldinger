# Faktagrunnlag for DPIA: personopplysninger, behov og nødvendighet

Kartlagt 19. september 2026 mot faktisk skjema i `endringsmeldinger`
(`gwdxadexwktegkklyobv`) og koden på `899e9af`.

**Dette er ikke en DPIA.** Det er datakartleggingen en DPIA bygger på: hvilke
personopplysninger som faktisk lagres, hvor, hvorfor, og hvilke teknisk
tilgjengelige alternativer som lagrer mindre. Den rettslige vurderingen —
behandlingsgrunnlag, nødvendighet i rettslig forstand, forholdsmessighet, risiko for
de registrerte og tiltak — krever juridisk kompetanse og er ikke gjort her.

> **Merknad 2026-09-21 (kveld): én rettslig forutsetning er nå besluttet.**
> Arkivplikt går foran sletteplikt for kontraktsjournalen. Alternativ 3.1
> (bruker-ID framfor navn) og 3.2 (interne notater ut av journalen) er valgt og
> gjennomført; kryptografisk sletting skal ikke bygges. Resten av den rettslige
> vurderingen står fortsatt ugjort — dette er én forutsetning, ikke en DPIA.

Hører til [arbeidspakken om oppbevaring og sletting](plans/2026-09-16-godkjenning-og-varig-levering.md)
og de organisatoriske forutsetningene i samme plan.

---

## Sammendrag

**Journalen er tom.** Alle tre hendelsestabellene har null rader. Hver beslutning om
hva som skal ligge i den kan derfor fortsatt tas fritt, uten migrering og uten
etterlatte data. Det er den gunstigste mulige situasjonen for en DPIA, og den varer
ikke.

**Men 14 reelle personer er allerede registrert.** `app_users`, `app_identities` og
`app_project_memberships` har 14 rader hver, synkronisert fra Catenda med navn og
e-postadresse. Behandlingen er altså i gang.

**Den mest inngripende identifikatoren er valgt der den er vanskeligst å endre.**
`routes/event_routes.py` setter

```python
data["aktor"] = g.user.get("name") or g.user.get("email") or g.user["id"]
```

Navn foretrekkes, e-post er fallback, bruker-ID brukes bare når de to første mangler.
Verdien skrives til hendelsestabellene, som er tiltenkt append-only og uforanderlige.
Et teknisk tilgjengelig alternativ finnes og er beskrevet under.

---

## 1. Hvilke personopplysninger lagres

### 1.1 Identitet og tilgang (Postgres)

| Tabell | Personopplysninger | Kilde | Rader |
| --- | --- | --- | --- |
| `app_users` | `name`, `email` | Catenda ved innlogging | 14 |
| `app_identities` | `subject` (Catenda-ID), `user_id` | Catenda | 14 |
| `app_project_memberships` | `user_email`, `display_name`, `catenda_subject`, `user_id`, rolle | Catenda, synkronisert ≤15 min | 14 |
| `app_sessions` | `user_id`, `token_hash`, `csrf_token`, `expires_at` | Egen innlogging | 1 |
| `app_oauth_attempts` | Innloggingsforsøk | Egen innlogging | — |

### 1.2 Kontraktsjournalen (Postgres) — **tom i dag**

| Tabell | Personopplysninger | Rader |
| --- | --- | --- |
| `koe_events` | `actor` (navn eller e-post), `actorrole`, `actorteam`, `comment`, `data` (jsonb) | **0** |
| `forsering_events` | samme | **0** |
| `endringsordre_events` | samme | **0** |

`data`-kolonnen er skjemaløs jsonb. For `internt_notat` inneholder den feltet
`tekst`, som er fri tekst uten lengdebegrensning eller innholdskrav
(`models/events.py`, `InterntNotatData`). Det er den kategorien med høyest risiko:
en intern vurdering av en navngitt person hos motparten kan stå der, skrevet av en
saksbehandler som ikke tenker på at teksten blir en permanent journalpost.

### 1.3 Lokalt SQLite-lager (`koe_data/approvals.sqlite3`)

| Register | Personopplysninger |
| --- | --- |
| Godkjenninger | Godkjennerkjede med identitet, fullmaktsnivå, beslutninger |
| Utkast | `oppdatert_av`, samt utkastteksten selv |
| Vedlegg | `lastet_opp_av`, `navn`, og filens innhold som `BLOB` |

Merk at dette lageret slettes ved skalering til null på den valgte plattformen
(se AR-03 i [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md)). Det er et
tilgjengelighetsproblem, men i personvernsammenheng også et *uforutsigbart*
sletteforløp — opplysninger forsvinner uten at noen har besluttet det.

### 1.4 Logger

`lib/monitoring/audit.py` er utformet for å logge `user` som e-post eller brukernavn,
sammen med `user_agent` og IP. Loggeren kalles i dag bare fra webhook- og
ratelimit-veien (se OBS-01), men utformingen legger opp til
identifiserende driftslogger. Oppbevaringstid for logger er ikke fastsatt noe sted.

### 1.5 Arv som ikke har noe formål

| Tabell | Rader | Merknad |
| --- | --- | --- |
| `project_memberships` | 1 | Duplikat av `app_project_memberships`, med `user_email` og `display_name` |
| `user_groups` | 0 | `display_name`, `user_role`. Ingen produksjonskode leser den |
| `magic_links` | 0 | `email`, `token`. Magic links er erstattet av Catenda-innlogging; `/api/magic-link/verify` svarer 410, og koden bruker uansett en JSON-fil, ikke tabellen |

Tre tabeller med felter for personopplysninger som ingen funksjon trenger.
Dataminimering tilsier at de slettes, ikke bare står tomme.

---

## 2. Hvorfor — behovet bak hver kategori

| Opplysning | Funksjonen den tjener | Uten den |
| --- | --- | --- |
| Catenda-`subject` | Stabil, uforanderlig kobling mellom bruker og prosjektmedlemskap. Fullmakt nøkles på bruker-ID nettopp fordi e-post kan endres (RV-03) | Ingen pålitelig identitet; fullmakt måtte nøkles på noe foranderlig |
| `email` | Oppslag mot Catenda ved synkronisering; menneskelig gjenkjennelse i administrasjon | Synkronisering kan bruke `subject` alene |
| `name` | Vises i grensesnitt og i brev: mottakeren skal se hvem som har varslet | Brev og oversikt ville vist en ID |
| Rolle og team | Hele tilgangsmodellen. Avgjør hva som kan sendes, leses og godkjennes | Systemet har ingen autorisasjon |
| `aktor` på hendelsen | **Bevisverdi.** Et varsel må kunne tilskrives en person for å ha kontraktsvirkning | Journalen kan ikke vise hvem som varslet |
| `internt_notat.tekst` | Egen organisasjons arbeidsnotater under saksbehandling | Ingen støtte for intern vurdering i verktøyet |
| Godkjennerkjede | Dokumentere at byggherren bandt seg innenfor fullmakt | Utstedelser kan ikke etterprøves |
| `lastet_opp_av` | Vise hvem som la ved dokumentasjon i en tvistesak | Vedlegg uten avsender |

Behovet for **at en handling kan tilskrives en person** er reelt og går til systemets
formål. Spørsmålet i neste avsnitt er ikke om tilskrivningen trengs, men hvilken
representasjon den krever.

---

## 3. Nødvendighet — alternativer som lagrer mindre

Fire alternativer er teknisk tilgjengelige i dag. De er ordnet etter hvor mye de
reduserer, ikke etter hvor lette de er.

### 3.1 Lagre `aktor` som bruker-ID, ikke som navn

**I dag:** navn skrives inn i hver hendelse, i en journal som skal bli uforanderlig.

**Alternativ:** skriv `user_id`. Slå opp navnet ved visning, fra `app_users`.

Dette er det mest virkningsfulle enkelttiltaket, av tre grunner:

1. Journalen blir **pseudonym**. Den inneholder en referanse, ikke en identifikator.
2. Sletting eller pseudonymisering kan gjennomføres ved å endre **én rad** i
   `app_users` — uten å røre den uforanderlige journalen. Konflikten mellom
   sletteplikt og append-only, som i dag er uløst, blir da håndterbar.
3. Det koster ingenting nå. Journalen er tom.

Bevisverdien er ikke svakere: en ID som entydig peker på en identitet dokumentert i
identitetstabellen tilskriver handlingen like presist som en navnestreng — og bedre,
siden navnestrengen i dag kan være enten navn *eller* e-post avhengig av hva Catenda
returnerte.

Én innvending må vurderes juridisk: et uttrekk til bevisføring må kunne vise navnet,
og hvis identitetsraden er slettet, kan den ikke det. Det er samme avveining som
ellers gjelder mellom sletteplikt og dokumentasjonsplikt, men den blir nå eksplisitt
og mulig å styre, i stedet for avgjort på forhånd av en linje kode.

### 3.2 Ta interne notater ut av den uforanderlige journalen

**I dag:** `internt_notat` ligger i `koe_events`, sammen med de formelle varslene.

**Observasjon:** et internt notat er ikke et kontraktsvarsel. Det er et
arbeidsnotat for egen organisasjon, uten virkning overfor motparten og uten
bevisfunksjon mot dem. Det har derfor ikke det samme behovet for permanens som
resten av journalen.

**Alternativ:** eget lager med sletteregler, atskilt fra hendelsesstrømmen.

Gevinsten er dobbel. Den frie teksten — kategorien med høyest risiko — blir
slettebar. Og notatene forsvinner fra den strømmen som deles med motparten, slik at
skjermingen ikke lenger er det eneste som skiller dem.

Dette er den største reduksjonen i inngripen som er tilgjengelig, og den er lettest
å gjennomføre akkurat nå: det finnes ingen notater å migrere.

### 3.3 Én kilde til navn og e-post

`display_name` finnes i `app_project_memberships`, `project_memberships` og
`user_groups`. `email` i `app_users`, `app_project_memberships`,
`project_memberships` og `magic_links`.

**Alternativ:** behold `app_users` som eneste kilde, la resten holde `user_id`.
Sletting blir da ett sted og ikke fire, og dagens duplikater kan ikke komme i utakt.

De tre arvetabellene bør slettes, ikke tømmes — en tabell med kolonner for
personopplysninger inviterer til at noen fyller dem.

### 3.4 Ikke identifiser i driftslogger

`audit.py` er utformet for `user` som e-post, med `user_agent` og IP. Et
revisjonsspor for sikkerhetshendelser trenger å kunne knytte en handling til en
konto, men det kan gjøres med `user_id`, og oppbevaringstiden kan settes kortere enn
for journalen.

Uten en fastsatt oppbevaringstid lever driftslogger i praksis til noen rydder.

---

## 4. Forhold som bør fram i risikovurderingen

- **Fri tekst uten kontroll.** `InterntNotatData.tekst` har ingen lengdebegrensning
  og ingen innholdskrav. Systemet kan ikke hindre at særlige kategorier
  opplysninger skrives inn, og i dag finnes ingen slettevei for dem.
- **Motparten er en annen virksomhet.** Hendelsesstrømmen deles mellom to
  kontraktsparter. Feil i skjermingen eksponerer den ene partens ansatte for den
  andre. Auditserien har funnet flere slike feil, og alle var i applikasjonskoden
  (se AR-01).
- **Tilgang gjennom tjenestenøkkel.** All apptrafikk går som `service_role`, som
  omgår radnivåsikkerhet. Ingen policy i databasen begrenser hvem som ser hvilke
  personopplysninger; det gjør bare Python-koden.
- **Uforutsigbar sletting i SQLite-lageret.** Utkast og vedleggsbytes forsvinner ved
  skalering til null, uten at noen har besluttet det og uten spor.
- **Overføring til Catenda.** Vedlegg, brev og kommentarer sendes ut av systemet.
  Databehandleravtale og lagringssted hos Catenda er ikke undersøkt her.

---

## 5. Grenser for dette dokumentet

Kartleggingen bygger på skjema, radantall og kode. Det er **ikke** gjort:

- Noen rettslig vurdering. Behandlingsgrunnlag, nødvendighet i rettslig forstand,
  forholdsmessighet og risiko for de registrerte hører til DPIA-en.
- Kartlegging av Catendas egen behandling, eller av databehandleravtalen.
- Vurdering av arkivplikt. Den trekker motsatt vei av sletteplikten, og avveiningen
  er ikke gjort her.
- Innsyn i faktiske persondata. Spørringene mot databasen leste kolonnenavn og
  radantall; ingen rad med personopplysninger er lest ut.
- Kartlegging av backup. Sikkerhetskopier kan inneholde opplysninger som er slettet
  i basen, og er ikke undersøkt.

Radantallene er fra 19. september og endrer seg. Det som ikke endrer seg av seg selv,
er at journalen er tom **nå** — og at alternativene i avsnitt 3 blir dyrere hver dag
den ikke er det.
