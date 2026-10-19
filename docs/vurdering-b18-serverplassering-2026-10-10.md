# Vurdering: hvor TS-kjernen kjører på serveren (B-18)

**Dato og grunnlag:** 10.10.2026, kontrollert mot `de8f3d5` på `main`.
Bestilt i [#311](https://github.com/khjohns/endringsmeldinger/issues/311) med
kommentaren 09.10. Beslutningen er
[B-18 i hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger),
og vedtaket føres der. Dette dokumentet er beslutningsgrunnlaget og fører ikke
et eget beslutningsregister.

Appen er ikke i produksjon og har ingen reelle data. Belegg er merket etter
[1.3 i hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
**K** kjørt og observert, **L** lest i kode, **H** historisk dokumentert,
**—** ikke kontrollert.

## 1. Spørsmålet

[B-17](plans/2026-09-16-godkjenning-og-varig-levering.md#b-17) med merknaden
09.10 gir TS-kjernen skrivingen i KOE-, endringsordre- og forseringssakene
samlet. Python kan beholde levering og integrasjon, men skal ikke tolke
journalen for disse sakene. B-14 lot serverlaget stå åpent. Alternativene i
#311:

1. **Serverlaget i SvelteKit:** kjernen i serverrutene, i samme app som
   frontenden.
2. **En egen Node/TS-backend** med API-et, slik prøveserveren i
   [`sprakprove/server/`](https://github.com/khjohns/endringsmeldinger/tree/fc19484/sprakprove/server) gjør.
3. **Et av de to, med Python ved siden av** for levering og Catenda.

Alternativ 3 er ikke et tredje sted for kjernen. Det er et valg om Python
skal fortsette ved siden av alternativ 1 eller 2. Dokumentet vurderer derfor
to akser: hvor kommandoene kjører (1 eller 2), og hvem som leverer og
integrerer (Python eller TS).

## 2. Det som er likt i alle alternativene

Disse forholdene avgjør ikke valget, men de avgrenser det.

| ID | Forhold | Belegg |
| --- | --- | --- |
| B18-01 | **Én vertsadresse.** Python setter sesjonskapselen med prefikset `__Host-` (`sesjonsnavn` i [`autorisasjon.ts`](../server/autorisasjon.ts), `set_cookie` i [`auth_routes.py`](../backend/routes/auth_routes.py)). Kapselen er bundet til verten. TS og Python må derfor stå bak samme vert, med ruting etter sti. Det gjelder alternativ 1 og 2 likt, så lenge innloggingen blir i Python | L 10.10 |
| B18-02 | **Frontenden er statisk i dag.** `adapter-static` i [`svelte.config.js`](../svelte.config.js), og [`Dockerfile`](../Dockerfile) bygger bare frontenden og serverer den med nginx. Det finnes ikke noe produksjonsbilde for en Node-server eller for Flask | L 10.10 |
| B18-03 | **Transaksjonene er like.** Både en SvelteKit-server og en egen Node-prosess når PostgreSQL med `pg` og kan åpne én transaksjon per kommando. Valget mellom 1 og 2 endrer ikke hva en transaksjon kan omfatte | L 10.10 |
| B18-04 | **Workeren er en egen prosess uansett.** Levering etter commit trenger en drivmekanisme som virker uten en forespørsel (invariant 7 i 2.3, B-07). Ingen av alternativene gjør serverlaget til worker | L 10.10 (transaksjonsplanen, «Worker og Catenda») |
| B18-05 | **Kjernen er ren kode.** [`kjerne/`](../kjerne/) importerer ingenting utenfor mappa, og arkitekturtesten håndhever det. Kjernen kan kjøres i begge alternativene uten endring | L 10.10; kjernens tester kjørt gjennom Vite i Vitest, K 10.10 |
| B18-06 | **Nettleserens kjerne kan være eldre enn serverens.** En åpen fane beholder bundelen den lastet. Serveren må derfor avvise et svar regnet med en annen regelversjon, uansett om frontend og server rulles ut samlet. Prøveserveren gjør det (`RULE_VERSION`) | K 10.10 (`server.test.ts`, «et svar regnet med en annen regelversjon gir RULE_VERSION») |

## 3. Vurdering mot punktene i #311

### 3.1 Tilgang og CSRF

Invariantene i `AGENTS.md` gjelder hver serverinngang, uansett hvor den kjører
(merknaden 09.10 til invariant 11 og 12). TS-stien skal ha et register med
test som feiler når en inngang mangler en kontroll (FK).

| | Alternativ 1: SvelteKit | Alternativ 2: egen backend |
| --- | --- | --- |
| Kontrollene | Må skrives i `hooks.server.ts` eller i hver `+server.ts`. Kontrollkoden fra prøven kan gjenbrukes, men den tar i dag Nodes `IncomingMessage`, ikke `Request` (—, ikke prøvd) | Finnes i prøven: sesjon, CSRF inne i autentiseringen, prosjekttilgang med prosjektgrense for hver sak det vises til, og kontraktsside fra teamene (L 10.10, [`autorisasjon.ts`](../server/autorisasjon.ts)) |
| CSRF | SvelteKits egen kontroll av `Origin` gjelder bare skjemaformater (`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`), ikke JSON (L 10.10, `is_form_content_type` i `@sveltejs/kit` 2.53.4). CSRF-tokenet må håndheves av appen som i dag. Rammeverkets kontroll kan gi falsk trygghet | Håndheves inne i `krevInnlogging`, som i Flask (L 10.10). Avvisning uten og med feil token er prøvd (K 10.10) |
| Registertesten | Filrutene kan listes fra `src/routes/`. Testen må også se `hooks.server.ts`, og en sideinnlasting med `+page.server.ts` blir også en serverinngang | Rutene står i én tabell i koden og kan listes av testen. Ikke bygget (L 10.10) |
| Flate | Hver side blir servert av Node. Sårbarhetene i Kit som [avhengighetsvurderingen](vedlegg/avhengigheter-2026-10-07/frontend.md) fant utenfor rekkevidde fordi det ikke finnes serverhooks eller Node-server, blir nåbare (H 07.10) | Bare API-et kjører i Node. Frontenden forblir statisk |

**Vurdering:** begge kan oppfylle invariantene. Alternativ 2 har kontrollene
og avvisningstestene allerede, mot de samme tabellene som Flask. Alternativ 1
krever en omskriving til SvelteKits forespørselsmodell og gir en større
serverflate.

### 3.2 Transaksjoner, brev og EO-U2 og EO-U3

Kravet er én bindende kommando per transaksjon med `expected_version`
(invariant 3), og at et brev lagres med beslutningsgrunnlaget og
leveringsintensjonen i samme transaksjon som hendelsen (FK, MM-U9).
[EO-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2) og
[EO-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u3) krever i
tillegg at kandidatkontrollen og eksklusiviteten avgjøres i samme transaksjon
som KOE-saken (merknaden 09.10 til B-17).

| Krav | Prøven | Hva som gjenstår, likt i 1 og 2 |
| --- | --- | --- |
| `expected_version` og samtidighet | `leggTil` i [`lager.ts`](https://github.com/khjohns/endringsmeldinger/blob/fc19484/sprakprove/server/lager.ts) kontrollerer versjonen i transaksjonen. Unik-skranken stopper to samtidige skrivinger, og taperen får 409 (K 10.10, `server.test.ts`) | Ingenting prinsipielt |
| Én sak per transaksjon | `leggTil` avviser hendelser i flere saker: «Alle hendelsene må gjelde samme sak» (L 10.10) | En EO-kommando skriver i EO-saken og leser og reserverer KOE-sakene. Det krever en lås per saksstrøm, tatt i sortert rekkefølge, og en reservasjon for KOE-tilknytningen (transaksjonsplanen, «Autoritativ utstedelseskommando», punkt 2 og 4; B-01 (c)). Ikke prøvd (—) |
| Brev, beslutningsgrunnlag og leveringsintensjon | Prøven har ingen outbox og ikke noe brev (L 10.10) | Outboxen finnes ikke i noen migrasjon (L 10.10). Leveringsintensjonen i dag er `approval_outbox` i SQLite (`ApprovalService.deliver` i [`approval_service.py`](../backend/services/approval_service.py)), utenfor transaksjonen i PostgreSQL |
| Transaksjonskontrakten fra F0b | Prøven bruker eierforbindelsen mot testbasen, uten transaksjonslokal rolle (L 10.10) | Rolle og kontekst per transaksjon, tilbakestilling av gjenbrukt forbindelse og retry av hele transaksjonen (#310) |

**Vurdering:** ingen forskjell mellom 1 og 2. Transaksjonen er ren SQL mot
samme base. Det som mangler, mangler i begge: transaksjoner over flere saker
og outboxen. Alternativet der Python avgjør noe av EO-U2 eller EO-U3, er
utelukket av B-17.

### 3.3 Grensen mot Python: levering

B-17: Python kan «gjengi og levere frosne brev, Catenda og tekniske
leveringsresultater» og tolker ikke journalen. Kartleggingen viser hva Python
leser i dag for å levere (L 10.10):

| Sted i Python | Leser i dag | Etter B-17 |
| --- | --- | --- |
| `_post_to_catenda` og `_sync_topic_status` i [`event_routes.py`](../backend/routes/event_routes.py) | `overordnet_status` fra `compute_state` på hele journalen, og det frosne brevet i `event.data.brev` | Statusetiketten for Catenda regnes av TS og fryses i leveringsoppdraget |
| `CatendaCommentGenerator` i [`catenda_comment_generator.py`](../backend/services/catenda_comment_generator.py) | `overordnet_status`, `vederlag`, `frist`, `grunnlag`, `neste_handling`, `forsering_data`, `endringsordre_data` | Kommentarteksten, eller dataene den bygges av, fryses av TS |
| `snapshot` og `pdf_bytes` i [`approval_letter.py`](../backend/services/approval_letter.py) | Bare det frosne brevet. Ikke tilstanden | Kan bli i Python uendret, som gjengiver. `decision_summary` og `_subsidiaert_ved_avslatt_grunnlag` setter sammen beslutningslinjen og hører til TS (H 09.10, arkitekturforslaget, P2-4) |
| `ApprovalService` (`krav_fra_tilstand`, `basis`, `validate_items`, `publish`) i [`approval_service.py`](../backend/services/approval_service.py) | Kravet og grunnlaget fra tilstanden, og skriver hendelser i `publish` | Til TS i sin helhet (#310, DT-02) |
| Kandidatsøkene `_is_agreed_koe` og `hent_kandidat_koe_saker` i [`endringsordre_service.py`](../backend/services/endringsordre_service.py) og [`forsering_service.py`](../backend/services/forsering_service.py) | Status og resultater per spor | Til TS, med EO- og forseringssakene |
| `CatendaSyncService` i [`catenda_sync_service.py`](../backend/services/catenda_sync_service.py) | `overordnet_status` for forsering | Som statussynken over |

Grensen som følger: **TS fryser alt Python trenger i leveringsoppdraget, i
samme transaksjon som hendelsen.** Oppdraget har brevets grunnlag, mål og
konfigurasjonsversjon, statusetiketten, kommentaren og sakens versjon, slik at
et eldre statusoppdrag ikke overstyrer et nyere (invariant 6 og 7). Python
gjengir PDF av det frosne brevet, kaller Catenda og fører kvitteringen. En
retry leverer det lagrede dokumentet, ikke et nytt fra sakens tilstand.

En gjengivelse av samme grunnlag kan gi andre bytes (H 09.10). Lagres PDF-en
først av workeren, leverer en retry den lagrede fila. Om PDF-en lages før
eller etter commit, er et teknisk valg i #310.

**Vurdering:** grensen er den samme for alternativ 1 og 2. Den er en rad i
basen, ikke et kall mellom prosesser. Python ser bare outbox-raden. Det er
ikke prøvd (—), og prøveserveren har ingen outbox.

### 3.4 Grensen mot Python: lesing

Kommentaren i #311 krever at grensen også gjelder lesing: Catenda-synken,
kommentarene og godkjenningsbrevet trenger kjernens predikater gjennom en
uttrykkelig kontrakt. Tre former er mulige:

| Form | Hva Python får | Vurdering |
| --- | --- | --- |
| (a) Frosset i leveringsoppdraget | Ferdig etikett, tekst og brevgrunnlag | Dekker Catenda-synken, kommentarene og brevet. Ingen ny kanal. Anbefales |
| (b) Kall til et internt lese-API i TS | Kjernens tilstand på forespørsel | En ny serverinngang uten brukersesjon, som må stå i registeret med begrunnelse. Gir Python en ny kilde å tolke. Trengs ikke for punktene over |
| (c) En projeksjonstabell TS skriver | Sakens metadata, som `sak_metadata` i dag | Riktig for oversikter og søk, og allerede planlagt som én skriver i hendelsens transaksjon (MS-06, MS-07). Python skal ikke bruke den til å avgjøre hva partene kan gjøre |

Webhooken fra Catenda er en skrivesti. `handle_new_topic_created` i
[`catenda_webhook_service.py`](../backend/services/catenda_webhook_service.py)
oppretter en KOE-sak gjennom `create_sak` (L 10.10). Etter B-17 må
opprettelsen gå gjennom TS. Python kan motta og kontrollere webhooken, løse
identiteten gjennom `koe_resolve_identity` og legge meldingen i en varig inbox
(transaksjonsplanen, «Inbox-melding»), og TS oppretter saken fra innboksen.
Prosjektet skal da komme fra en autorisert kilde (#66). Hvem som driver
behandlingen av innboksen, er et teknisk valg i #310. Det avhenger ikke av
valget mellom 1 og 2.

### 3.5 Drift og utrulling

| | Alternativ 1: SvelteKit | Alternativ 2: egen backend |
| --- | --- | --- |
| Byggenheter | Node-app med frontend og TS-API, Python-API og worker. Frontenden går fra nginx til Node (B18-02) | Statisk frontend som i dag, Node-API og Python-API med worker |
| Utrulling og tilbakerulling (#316) | En ny TS-versjon ruller ut frontenden også. En tilbakerulling av kjernen ruller tilbake brukergrensesnittet | Kjernen på serveren rulles ut og tilbake for seg. Frontenden har sin egen kjerne og sin egen utrulling. Regelversjonen holder dem sammen (B18-06) |
| B-12 (#78) og hosting | Begge passer Container Apps og App Service. Basen påvirkes ikke | Samme |
| #302, Power Apps Code Apps | Code Apps tar en kompilert SPA. Med alternativ 1 må SPA-en skilles ut igjen (— , ikke kontrollert fra skyøkta) | Den statiske frontenden er allerede en SPA |
| Lokal PostgreSQL | Virker i begge, som testbasen | Kjørt: prøveserveren mot testbasen (K 10.10) |
| Rammeverk | Følger SvelteKits versjoner og adapter-node | Prøven bruker `node:http` uten rammeverk. Valg av ruter eller et lite rammeverk tas i #310 |

**Vurdering:** alternativ 2 lar frontenden bli som den er og gir kjernen på
serveren en egen utrulling. Det passer #316, der tilbakerulling mellom
TS-versjoner skal prøves. Antall byggenheter er likt, fordi Python og workeren
finnes i begge.

### 3.6 Hva prøveserveren har vist

| Påstand | Belegg |
| --- | --- |
| Tilgangen leser de samme tabellene som Flask og avviser uten sesjon, uten eller med feil CSRF, i feil prosjekt, for en sak eller relatert sak i et annet prosjekt, uten kontraktsteam og med feil side | K 10.10: `npx vitest run sprakprove/`, 9 filer og 574 tester grønne mot testbasen, blant dem 40 i `server.test.ts` |
| De 30 forløpene holder gjennom `/api/events` og `/api/events/batch`, med tilstanden lest fra serveren | K 10.10: `serverkorpus.test.ts`, 52 tester |
| Python leser det TS skrev, og omvendt | K 10.10: `test_sprakprove_ts_server.py`, 53 bestått og 8 `xfail` |
| Samme kjerne gir samme resultat i Chromium og på serveren | H 09.10 (P2-1, arkitekturforslaget avsnitt 7). Ikke kjørt på nytt |
| Feilinnføring for prosjektgrense, CSRF og versjon fanges | H 09.10 (M9–M11). Ikke kjørt på nytt |

Prøven viser ikke: SvelteKit som server, innlogging, medlemssynk mot Catenda,
outbox, flere saker i én transaksjon, transaksjonslokal rolle, et
produksjonsbilde, logging eller ytelse (L 10.10, «Det TS-serveren ikke har» i
arkitekturforslaget).

## 4. Alternativ 3: Python ved siden av, eller TS alene

| | Python leverer og integrerer | TS tar også levering og Catenda |
| --- | --- | --- |
| Omfang | Catenda-klienten, webhookmottaket, innloggingen og PDF-gjengivelsen blir der de er | Catenda er den største enkeltblokken, om lag 7 100 linjer med 48 tester (H 09.10) |
| Grensen | Må holdes: Python leser bare outboxen og innboksen. Et arkitekturtest-krav i #310 | Ingen språkgrense |
| Tilgang | Innloggingen blir i Python. TS leser sesjonen, slik prøven gjør. To implementasjoner av lesesiden av tilgangen er den største sikkerhetsrisikoen (H 09.10, P2-4) | Én implementasjon på sikt, men to i overgangen |

**Vurdering:** B-17 tillater Python ved siden av, og det er billigst nå.
Risikoen er de to implementasjonene av tilgangskontrollen. Den begrenses ved
at Python-rutene for KOE-, EO- og forseringssakene fjernes ved byttet, og ved
at sikkerhetstestene kjøres over HTTP mot begge, slik `test_sprakprove_ts_server.py`
gjør.

## 5. Anbefaling

**Alternativ 2 med Python ved siden av:** en egen Node/TS-backend for alle
kommandoer og lesinger i KOE-, EO- og forseringssakene, bygget videre fra
prøveserveren. Frontenden forblir statisk. Python beholder innloggingen,
medlemssynken, webhookmottaket, PDF-gjengivelsen og levering til Catenda bak
outboxen. Grensen mellom dem er rader i basen: leveringsoppdraget med alt
frosset, og innboksen for webhooks.

Grunnene:
1. Tilgangskontrollen og avvisningstestene finnes og går mot de samme
   tabellene som Flask (K 10.10). Alternativ 1 krever en omskriving og
   gjør hele frontenden til en Node-server.
2. Kjernen på serveren får sin egen utrulling og tilbakerulling (#316), og
   frontenden kan bli statisk, også hvis #302 lander på Code Apps.
3. SvelteKits CSRF-vern dekker ikke JSON. Fordelen med rammeverket er mindre
   enn den ser ut.
4. Transaksjonene og grensen mot Python er like i begge, så alternativ 1 gir
   ikke noe der.

Det som taler for alternativ 1, er én byggeenhet for frontend og TS-API og én
plass for typene. Ingen av delene er nødvendige: kjernen deles allerede fra
`kjerne/`, og regelversjonen fanger en eldre fane uansett (B18-06).

## 6. Spørsmålet og svaret

Spørsmålene ble sendt gjennom orkestratoren 10.10. Oppdragsgiver drøftet dem
med en juridisk sparringspartner. De ble lagt fram i klartekst med to forslag,
ordrett:

- **Forslag 7, serveren:** «en egen Node/TypeScript-server, med Python ved
  siden av for innlogging, levering og Catenda. Kravene er: én autoritativ
  regelbehandling; kontrollert adgang til bindende handlinger; historikk som
  kan etterprøves. IKT-spørsmålet legges i #78. Flere tjenester kan rulles ut
  som én samlet utgivelse.»
- **Forslag 8, leveringen:** «Det som skal leveres, fryses i
  leveringsoppdraget i samme transaksjon som hendelsen. Et nytt
  leveringsforsøk sender samme brev og vedlegg, og skaper ingen ny erklæring.
  Hvert leveringsforsøk, hver feil og hver kvittering dokumenteres for seg. Et
  lagret oppdrag beviser ikke at brevet er sendt eller mottatt. Hvordan Python
  henter oppdraget, velger utviklerne.»

**Svaret 10.10, ordrett:** «Jeg slutter meg til forslagene med disse
presiseringene: […] Servervalget overlates til utviklerne og IT innenfor de
foreslåtte kravene.» Presiseringene som er utelatt, gjelder formatet, ikke
B-18.

Slik orkestratoren leser svaret:
1. **Serveren** er overlatt til utviklerne og IT innenfor de tre kravene i
   forslag 7. Utviklernes valg er anbefalingen i avsnitt 5: en egen
   Node/TS-backend med Python ved siden av. Valget forutsetter at IKT ikke har
   et krav som utelukker det. Spørsmålet står i
   [#78](https://github.com/khjohns/endringsmeldinger/issues/78), med kravet om
   at TS og Python står bak samme vert (B18-01).
2. **Lesingen:** form (a) i 3.4, frosset innhold lagret samlet med hendelsen,
   er et krav, med presiseringene i forslag 8. Hvordan Python henter oppdraget,
   er et teknisk valg. Form (b) og (c) kan kombineres med (a), men erstatter
   den ikke.
3. **IKT:** spørsmålet om én deploybar enhet legges i #78.

Vedtaket føres under B-18 i hovedplanen.

## Verifikasjon og grenser

**Kjørt og observert 10.10, på `de8f3d5`:**
- `npx vitest run sprakprove/` mot testbasen: 9 filer, 574 tester grønne.
- `npx vitest run kjerne/`: 6 filer, 382 tester grønne.
- `pytest backend/tests/test_database/test_sprakprove_ts_server.py`: 53
  bestått, 8 `xfail`.

**Lest ut av koden 10.10:** `sprakprove/server/`, `svelte.config.js`,
`vite.config.ts`, `Dockerfile`, `nginx.conf`, `backend/core/cors_config.py`,
`backend/routes/auth_routes.py`, CSRF-kontrollen i `@sveltejs/kit` 2.53.4, og
Python-stedene i 3.3 og 3.4. Kartleggingen av Python-leserne ble gjort med et
lesesøk og kontrollert med stikkprøver på `_post_to_catenda`,
`approval_letter.py`, `approval_outbox`, `handle_new_topic_created` og
kandidatsøkene.

**Historisk:** P2-1, M9–M11 og kostnadstallene i P2-4 er fra
[arkitekturforslaget, avsnitt 7](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#resultat-av-port-2-2026-10-09-274),
09.10, og er ikke kjørt på nytt.

**Ikke kontrollert:**
- En SvelteKit-server med `adapter-node` og kjernen i `+server.ts`. Ikke bygget
  eller kjørt.
- Ytelse, minnebruk og oppstartstid for en Node-server på Container Apps eller
  App Service.
- Power Apps Code Apps (#302). Skyøkta når ikke Microsofts dokumentasjon.
- Transaksjoner over flere saker, outbox og innboks. Ingen av dem finnes.
- Om IKT har krav til antall byggenheter eller kjøretider (B-12, #78).
