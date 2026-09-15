# Handoff: kallfrekvens mot Catenda — og en åpen invitasjon til å overprøve meg

Skrevet 2026-09-15 av økten som gjorde `c90cba7`..`ac0b537`. Mottaker er en ny agent som
tar over med friskt blikk. Dette er ikke en oppgaveliste du skal utføre lydig — det er
én konkret oppgave, og en invitasjon til å bestemme selv om noe av det jeg har gjort bør
etterprøves før det bygges videre på.

Repoet har **ingen CLAUDE.md** — den ble bevisst slettet fordi den var utdatert.
`docs/` er konteksten.

## Git-tilstand

Branch `claude/les-docs-handoff-8s1lnp`, fire commits over `origin/main` (`faacab9`),
pushet og i sync. **Ingen PR er opprettet** — ikke lag en med mindre brukeren ber om det.

```
ac0b537 saml CSRF i ett håndhevingspunkt og halver medlemskapsoppslaget
beeb015 ta i bruk serverutkastet i saksskjemaene
476c0be bind lokale utkast til den innloggede brukeren
c90cba7 legg til teamavgrensede serverutkast i sak
```

## Prosjektet, kort

`khjohns/endringsmeldinger` — SvelteKit 2 SPA (Svelte 5 runes, `adapter-static`,
`ssr: false`) med Flask-backend, for NS 8407-forhandlinger mellom byggherre (BH) og
totalentreprenør (TE). All UI-tekst er norsk bokmål. Domenet er juridisk: tekst appen
genererer går inn i formelle kontraktsbrev til motparten.

**Appen er ikke i produksjon, og databasen inneholder ingen reelle data**
(brukeravklaring 2026-09-15). Skjemaendringer har ingen migreringskostnad nå.

## Miljøoppsett

```bash
npm install

cd backend
# files.pythonhosted.org tidde ut flere ganger i en tidligere økt; lang timeout hjelper.
pip install --timeout 180 --retries 10 --ignore-installed PyJWT \
  -r requirements.txt -r requirements-dev.txt
python3 -m pytest -q
```

`api.catenda.com` er **blokkert av proxyen**. Ingen live Catenda-test kan kjøres herfra.
Testsuiten går uten nettverk i det hele tatt, og bør forbli slik.

## Baseline som skal holdes grønn

| Kommando | Forventet |
| --- | --- |
| `cd backend && python3 -m pytest -q` | 1278 passerer |
| `npx vitest run` | 529 tester, 44 filer |
| `npm run check` | 0 feil, 10 advarsler |
| `npm run lint` | grønn (kjører `prettier --check src/` før eslint) |
| `npm run build` | passerer |
| `ruff check services/ routes/ lib/ tests/` | **16** feil — alle eksisterende |
| `models/events.py` UP042 / `app.py` I001 | 10 / 1 |

Ruff-tallet var 18 fram til `ac0b537`. Eldre logger og `docs/handoff-2026-09-15.md`
sier fortsatt 18; 16 er riktig nå.

En pre-commit-hook kjører prettier på staged frontendfiler. Den omformaterer det du
nettopp skrev, så mønstre du matcher på i etterkant kan bomme. Kjør
`npx prettier --write src/` før du stager, så slipper du overraskelsen.

---

# Oppgaven: kallfrekvens mot Catenda

Dette er det ene punktet jeg bevisst ikke rettet, fordi det krever en avveining jeg ikke
hadde tall til å ta.

## Hva som er observert

`AuthService.contract_membership` (`backend/services/auth_service.py`) gjør **ett
HTTP-kall til Catenda per konfigurert team, ucachet**, gjennom
`CatendaOAuth.team_members` (`backend/lib/auth/catenda_oauth.py`). Kallet er
paginert via `collection`, så det kan være mer enn én forespørsel per team.

Det er et bevisst designvalg, og docstringen sier hvorfor: *«Read current team
membership on writes; no stale authority cache.»* Det er riktig når en skriving betyr
«send inn en formell hendelse» — da er noen ekstra kall mot Catenda en billig pris for
fersk autoritet.

## Hva jeg endret, som gjør forutsetningen tvilsom

I `beeb015` tok jeg i bruk serverlagrede arbeidsutkast i de seks saksskjemaene. De
lagrer **hvert 1,2. sekund mens brukeren skriver** (`LAGRE_FORSINKELSE_MS` i
`src/lib/kontraktsbord/submission.svelte.ts`). Hver `PUT /api/cases/<sak>/utkast/<spor>`
går gjennom `require_auth` → `require_project_access` → `require_contract_role`, og den
siste kaller `contract_membership`.

Å skrive et avsnitt kan altså bli titalls Catenda-kall. Frekvensen `contract_membership`
ble designet for, og frekvensen den nå får, er ikke den samme.

**Dette er lest ut av koden, ikke målt.** Jeg vet ikke om det er merkbart i praksis.
Proxyen blokkerer `api.catenda.com` herfra, så jeg kunne ikke måle det, og jeg valgte å
ikke gjette. Det er den viktigste usikkerheten i overleveringen.

## Hva jeg allerede har gjort på nabotomta

I `ac0b537` halverte jeg antall `repo.membership`-oppslag per forespørsel med et memo i
forespørselens `g` (`AuthService._membership`). Det rører **ikke** Catenda-kallene —
bare databaseoppslaget av medlemsraden. Catenda-delen står urørt.

## Utvei-alternativene jeg så, uten å velge

Jeg legger dem fram som utgangspunkt, ikke som en meny du må velge fra. Finner du en
femte, er den sannsynligvis bedre.

1. **Kort TTL-cache på `team_members`** (f.eks. 30–60 s). Enkelt, men svekker
   «fersk autoritet». Kanskje akseptabelt for utkast, ikke for innsending — som da
   krever to autoritetsnivåer, og det er en ny akse med kompleksitet.
2. **Lagre sjeldnere.** Lengre debounce, eller bare ved blur og sidebytte. Billigst,
   men gir dårligere gjenoppretting hvis fanen dør.
3. **Lettere tilgangsnivå for utkastruten.** Utkastet er teamets eget arbeid før
   innsending og har lavere konsekvens enn en hendelse. Men det er nettopp
   teamgrensen som skjermer det, så den kan ikke bare hoppes over.
4. **Snu om hvor teamet kommer fra.** Teamet kunne vært knyttet til sesjonen ved
   innlogging og fornyet periodisk, i stedet for slått opp per forespørsel. Størst
   endring, potensielt riktigst — men den rører autentiseringen, der flere auditer har
   vært allerede.

**Mål før du velger.** Hvis en runde `contract_membership` er noen få millisekunder mot
en Catenda-instans i samme region, finnes ikke problemet, og da er riktig svar å skrive
det ned og gå videre. Ikke bygg en cache for et problem som ikke er der.

---

# Leselisten

Rekkefølgen er valgt for å bygge forståelse, ikke kronologi.

**Start her — de gir konteksten oppgaven lever i:**

1. [`handoff-2026-09-15.md`](handoff-2026-09-15.md) — forrige overlevering. Delvis
   utdatert: den sier at ingen PR er opprettet (PR #24 er merget), at ruff er 18 (nå
   16), og at utkastlekkasjen i punkt 1 står åpen (den er lukket). Avklaringene og
   Svelte 5-konvensjonene i den gjelder fortsatt og er verdt å lese nøye.
2. [`audit-utkast-serverlagring-2026-09-15.md`](audit-utkast-serverlagring-2026-09-15.md)
   — hva jeg bygget og hvorfor. Inneholder avsnittet om mutasjonstesting.
3. [`audit-tilgangslaget-opprydding-2026-09-15.md`](audit-tilgangslaget-opprydding-2026-09-15.md)
   — CSRF-oppryddingen og medlemskapsmemoet. Funn 3 der er oppgaven din.

**Bakgrunn for tilgangsmodellen:**

4. [`audit-backend-hendelsesflyt-2026-09-15.md`](audit-backend-hendelsesflyt-2026-09-15.md)
   — hvorfor interne notater filtreres på Catenda-team og ikke kontraktsside. Samme
   grense som utkastene bruker.
5. [`catenda-innlogging.md`](catenda-innlogging.md) — `CATENDA_CONTRACT_TEAMS`,
   teamnavn-standardiseringen (`@BYGGHERRE`, `@TE-(PL og PGL)`), og hvorfor medlemskap
   kontrolleres mot ID og aldri navn.
6. [`audit-autentisering-2026-09-14.md`](audit-autentisering-2026-09-14.md) — tidligere
   gjennomgang av samme lag.
7. [`audit-utkast-samarbeid-2026-09-14.md`](audit-utkast-samarbeid-2026-09-14.md) —
   kravlisten for fellesutkast. To av kravene står fortsatt åpne (fletting,
   tilstedeværelse).

**Ved behov:** [`catenda-dataflyt.md`](catenda-dataflyt.md),
[`audit-vedleggsflyt-2026-09-15.md`](audit-vedleggsflyt-2026-09-15.md),
[`audit-persistens-gjenoppretting-2026-09-14.md`](audit-persistens-gjenoppretting-2026-09-14.md).

---

# Om å overprøve meg

Brukeren har bedt om at du **selv vurderer** om du vil ta en second opinion på auditene
eller på fiksen, framfor å bli instruert til det. Så her er et ærlig grunnlag for den
vurderingen, inkludert der jeg er svakest. Konkluderer du med at det ikke er bryet verdt,
er det et gyldig svar — si det og begrunn det.

## Der jeg er minst trygg, i synkende rekkefølge

1. **Kallfrekvensen (oppgaven over).** Ikke målt. Hvis du bare etterprøver én ting, la
   det være denne, og la det være med tall.

2. **409-konfliktopplevelsen er min egen design, aldri sett i drift.** Jeg valgte
   «Behold min tekst» / «Hent inn deres» og at den tapende versjonen forsvinner uten
   spor. For tekst som havner i kontraktsbrev er det diskutabelt at et valg *sletter*
   kollegaens arbeid uten at det er gjenfinnbart. Brukeren godkjente at jeg valgte selv
   («409 er såpass enkel UX»), men har ikke sett den kjøre. Et alternativ jeg forkastet
   uten grundig vurdering: å lagre den tapende versjonen som en sidegren man kan hente
   fram. Det er verdt en ny vurdering.

3. **Debouncen på 1,2 sekunder er valgt uten data.** Den bestemmer både kallfrekvensen i
   oppgaven over og hvor mye som går tapt hvis fanen dør. Jeg har ikke noe grunnlag for
   akkurat det tallet.

4. **`_membership`-memoet legger `flask.g` inn i et tjenestelag.** Det er et
   lagbrudd. Alternativet var å sende medlemsraden mellom dekoratørene, som er renere,
   men som ville endret signaturene til to dekoratører flere ruter er avhengige av. Jeg
   valgte det minst invasive. Uenig? Det er en rimelig uenighet.

5. **Dødkode-funnet for `entra_id.py` og `supabase_validator.py` er grep-basert.**
   527 linjer uten referanser utenfor egen fil og egne tester. Grep er sterkt bevis,
   men ikke bevis for at ingen deploy-konfigurasjon bruker dem. Jeg slettet dem ikke.
   Vil du gå videre med det, verifiser før du sletter en autentiseringsmodul.

6. **Utkast lagres ikke lokalt uten innlogget bruker.** Bevisst — et utkast vi ikke kan
   tilskrive noen skal ikke gjenopprettes til neste person — men det betyr at
   `/login`-ruten og en uinnlogget tilstand ikke har noen buffer i det hele tatt.
   `/mockup` fikk en fast eier for å beholde demoutkastene sine. Sjekk at jeg ikke
   overså en tredje tilstand.

## Der jeg er trygg, og hvorfor

Så du kan prioritere bort:

- **Backendens utkastlag** (`services/utkast_registry.py`, `routes/utkast_routes.py`):
  26 tester, fail-closed i begge ender, avgrensning verifisert mot team, sak, spor,
  revisjon og prosjekt hver for seg.
- **At `createFormDraft` faktisk virker**: elleve tester, og de ble kontrollert med to
  mutasjoner i implementasjonen fordi de passerte på første forsøk. Detaljene står i
  auditloggen. Jeg stoler på dem fordi jeg så dem feile.
- **At CSRF fortsatt håndheves etter oppryddingen**: reprodusert med en privat kopi av
  den slettede modulen, og dekket av fire nye tester som skiller 401 fra 403.

## Et mønster verdt å kjenne igjen

To ganger i denne økten fant jeg **død kode holdt i live av tester som pekte på den** —
CSRF-modulen (241 linjer, 3 tester), og trolig `entra_id`/`supabase_validator` (527
linjer). Begge hadde overlevd flere auditer nettopp fordi testene fikk dem til å se
bærende ut. Hvis du leter etter mer rusk, er «hva er det bare testene som bruker?» et
produktivt spørsmål i dette repoet.

Og: `conftest.py` hadde slått av `require_csrf` globalt, så dekoratøren var utestet i
hele suiten mens den så beskyttet ut. Det er verdt å spørre om suiten mocker bort noe
annet som burde vært utøvd.

---

# Arbeidsmåte brukeren forventer

Dette er ikke mine preferanser, det er etablert praksis gjennom mange auditer:

- **Reproduser funnet med en test som feiler først**, rett, verifiser. Jeg brøt nesten
  denne to ganger i dag: `createFormDraft`-testene passerte på første forsøk (løst med
  mutasjonstesting), og 401/403-feilen lot seg ikke reprodusere gjennom suiten (løst med
  en privat modulkopi). Begge ganger var omveien verdt det.
- **Hypoteser rapporteres ikke som bekreftede funn uten kodebevis eller reproduksjon.**
- **Si hva du sjekket og *avskrev*, ikke bare hva du fant.** Brukeren verdsetter dette
  eksplisitt. Jeg trodde på et tidspunkt at `approval_routes` hadde en ubeskyttet rute —
  det var mitt eget parseskript som leste en nøstet funksjon som en rute. Falsk alarm,
  protokollført som det.
- Skriv `docs/audit-<område>-<dato>.md` med funn, hva som passerer, verifikasjon og
  gjenstående. **Krysslenk fra forrige auditlogg** begge veier.
- Norsk bokmål i all UI-tekst og dokumentasjon.

## Commit-konvensjon

Norsk imperativ emnelinje uten prefiks-taksonomi, og en brødtekst som forklarer *hvorfor*
og hva som ble verifisert. Avslutt med `Co-Authored-By:` og `Claude-Session:`-linjer der
det er relevant for din økt.

**Ingen modellnavn i kode, kommentarer eller dokumentasjon — kun i commit-trailer.**
Denne filen bryter den regelen i filnavnet sitt, fordi brukeren ba om en handoff til en
navngitt mottaker. Det er et bevisst unntak, ikke et presedens for andre dokumenter.

---

# Avklaringer — ikke ta disse opp på nytt

- **Teamavgrensning betyr Catenda-team-ID.** Avklart 2026-09-15.
- **Grønn palett er fasit**, eid av `src/lib/components/kontraktsbord/theme.css`.
- **Catenda er eneste lagringssted for vedlegg** — ingen parallell blob.
- **Catendas `/token`-endepunkt brukes bevisst ikke** (signert URL uten autentisering).
- **`forseringBegrunnelse.ts` og `mocks/saksoversikt.ts` beholdes** selv om de er unådd
  fra ruter. Sjekk alltid testreferanser før sletting.
- **Global Catenda-ruting** (`project_id`/`library_id`/`folder_id`) er avtalt eget
  arbeid og skal ikke omgås med en ny improvisert mapping.
- **UX er utsatt** til brukeren kan se endringer løpende, med unntak av vedlegg og
  409-konflikten, som er gjort.

# Øvrig gjenstående, hvis oppgaven over løser seg raskt

Fra auditloggene, i den rekkefølgen jeg ville tatt dem:

1. Ekte tekstsamarbeid med fletting, og tilstedeværelse — krever en CRDT-provider, altså
   en ny kjørende tjeneste. Ikke innført. Se `audit-utkast-samarbeid-2026-09-14.md`.
2. Opprydding av forlatte utkast server-side ved innsending.
3. `entra_id.py` / `supabase_validator.py` — verifiser og slett, eller dokumenter
   hvorfor de blir stående.
4. Live Catenda-verifikasjon av vedleggsflyten (blokkert herfra).
5. Durable outbox for webhookens sideeffekter.
6. `catenda_documents` returneres uten mottaker — vis feltet eller fjern det.
7. `BH_APPROVAL_DB` trenger varig lagring og restore-test før produksjon. Nå ligger både
   vedlegg og utkast der.
