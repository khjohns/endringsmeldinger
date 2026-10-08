# Vedlikehold av avhengigheter og prøving av delt domenekjerne

Dato: **2026-10-07**. Lokalt kodegrunnlag: `68ca0ea5b593808c4513dc84ab908baf12739cdb`.
Forrige ledd er [PR #266](https://github.com/khjohns/endringsmeldinger/pull/266)
og [strukturkartleggingen på kontrollert PR-head `4c8860a`](https://github.com/khjohns/endringsmeldinger/blob/4c8860a84a4aa9f388818b38471593e5592fcfb8/docs/kartlegging-struktur-spor-d-2026-10-05.md).
Kartleggingen fantes ikke på lokal hovedgren ved kontrollen; den ble lest med `git show`.
[Det bearbeidede arkitekturforslaget](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md)
bevarer oppdragsgivers mål og presiserer beslutningsprøven.
Detaljunderlaget er [backend](vedlegg/avhengigheter-2026-10-07/backend.md),
[frontend](vedlegg/avhengigheter-2026-10-07/frontend.md) og
[arkitektur](vedlegg/avhengigheter-2026-10-07/arkitektur.md).
[Hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) eier fortsatt funnstatus og beslutninger.

**Behold Flask, Svelte 5 og eksisterende database mens en ren, delt TypeScript-kjerne prøves.**
Lås først Python-miljøet som faktisk virker, og lever målrettede sikkerhetsoppdateringer
uavhengig av språkvalget. Den mest konkrete frontendoppfølgingen gjelder editorens
ProseMirror-innliming; brede rammeverksbytter har foreløpig ingen målt gevinst.
PR266s M2 krav/svar/aksept og M1 standpunkt må modelleres etter vedtakene uansett språk.
En TS-prototype bør avgjøre om én regelimplementasjon gir lavere samlet vedlikehold,
inkludert adaptere, testing og drift. Det finnes ingen fast produksjonsfrist som
begrunner å samle flere risikofylte migreringer i samme endring.

## Vurderingene angir prioritet, ikke nye auditstatuser

ID-ene AV-01–AV-08 er stabile referanser til anbefalingene i denne rapporten.
De erstatter ikke AVH-B-, AVH-F- eller AVH-A-ID-ene i vedleggene og er ikke nye auditfunn.
«Nå» angir anbefalt rekkefølge, ikke arbeidsstatus. Advisory-alvorlighet gjelder
pakken og oppgitte forutsetninger; appens konsekvens krever egen reproduksjon.

| ID | Anbefaling | Prioritet | Dokumentert alvorlighet / grense | Underlag |
| --- | --- | --- | --- | --- |
| AV-01 | Lås kjent Python-miljø og verifiser rene installasjoner | Nå | Ikke sikkerhetsklassifisert | AVH-B-01, AVH-A-01 |
| AV-02 | Oppdater editor og transport i avgrensede grupper | Nå, først | ProseMirror-advisory: høy; apputnyttelse ikke kjørt | AVH-F-01/02, AVH-B-02/03 |
| AV-03 | Rydd ubrukt pakkeoverflate og legg til byggverifikasjon | Nå | Vedlikehold og verifikasjonsgap | AVH-F-03/06, AVH-B-08, AVH-A-04 |
| AV-04 | Bruk eksisterende modellverktøy ved eksplisitte API-grenser | Prototype | Ingen ny sikkerhetsklassifisering | AVH-B-04/05, AVH-F-04, AVH-A-07 |
| AV-05 | Prøv ren TS-kjerne med samme corpus og beløpskontrakt | Prototype | Korrekthets- og kompatibilitetsgrense | AVH-A-05/08/09, AVH-F-05 |
| AV-06 | Skill delt kjerne fra Kit-server og koordiner majorer | Prototype / senere | Migrasjonsrisiko; ny serverflate må bevises | AVH-F-05/06 |
| AV-07 | Behold PDF-adapter og frys leveringsdokument i F2 | Senere, innen F2 | Byteforskjell observert; eksisterende beviskrav | AVH-B-06, AVH-A-06 |
| AV-08 | Krev konkret gevinst før rammeverk, driver eller runtime byttes | Senere / unngå | Ingen målt migrasjonsgevinst | AVH-B-09/10, AVH-A-02/03/09 |

## AV-01: Lås kjent miljø før oppgraderingsgruppene

**Fil og symbol:** [kravfilene](../backend/requirements.txt),
[utviklingskrav](../backend/requirements-dev.txt) og
[CI-installasjonene](../.github/workflows/ci.yml).
Oppfølging av installasjonslås og transportvedlikehold er sporet i
[#269](https://github.com/khjohns/endringsmeldinger/issues/269).
Backend deklarerer i hovedsak åpne `>=`-krav, uten Python-lockfil. Begge Python-jobbene
løser dem på nytt. Pip-cache låser ikke dette; frontendens `package-lock.json`
og `npm ci` gir allerede et bedre installasjonsgrunnlag. Dagens lokale venv har
Python 3.11.9, Pydantic 2.12.5 og ReportLab 4.4.10. De målrettede modelltestene
passerte i dette miljøet, men hele installasjonen er ikke godkjent gjennom alle porter.

Anbefalingen er å bevare lesbare direkte krav og generere transitive, hashede
runtime- og utviklingslåser rundt et miljø som passerer portene. Velg ett verktøy
etter minst ekstra byrde: pip-tools passer dagens pip-flyt; `uv pip compile`
kan gjøre samme jobb uten en full prosjektmigrasjon. Vedleggene vektlegger
verktøyene ulikt, men gir ikke grunnlag for at uv-prosjektformat må innføres.
Lås også generatorversjonen. En ren installasjon på CI-plattformen må kjøre
backend-, database- og frontendportene samt `pip check`. Låsing gjør installasjonen
etterprøvbar; advisorykontroll er en separat oppgave.
([pip-tools](https://github.com/jazzband/pip-tools),
[uv compile](https://docs.astral.sh/uv/pip/compile/),
[pip-hashes](https://pip.pypa.io/en/stable/topics/secure-installs/)).

## AV-02: Oppdater etter kjørebaner og kompatible pakkegrupper

**Fil og symbol:** [RichTextEditor](../src/lib/components/primitives/RichTextEditor.svelte),
[LockedValueNode.renderHTML](../src/lib/editor/LockedValueNode.ts),
[CatendaClientBase._create_session](../backend/integrations/catenda/base.py)
og [CatendaOAuth._request](../backend/lib/auth/catenda_oauth.py).
Versjonene nedenfor er kontrollert **07.10.2026**, og er kandidater til prøving,
ikke installerte eller ferdig testede mål.

| Gruppe | Avgrenset kandidat | Nødvendig kontroll |
| --- | --- | --- |
| Editor | `prosemirror-view` 1.41.6 → minst 1.42.3; tillatt av Tiptap 2s `^1.37.0` | Ny dependency-resolve, editorregresjon og paste i ekte nettleser |
| Sanitering / UI | DOMPurify 3.4.15 → 3.4.16; Svelte 5.53.7 → 5.57.2 | HTML-allowlist, komponenter, drafts, typekontroll og bygg |
| Eksisterende byggserie | Kit 2.53.4 → kompatibel 2.x, Vite 7.3.1 → 7.3.7 | Hele peer-grafen, routing og produksjonsbygg |
| HTTP | Requests 2.32.5 → 2.34.2, urllib3 2.6.3 → 2.8.0 | Retry, OAuth, proxy/TLS, timeout, redirect og opplasting |
| Flask | Behold Flask 3.1.3; Werkzeug 3.1.6 → 3.1.9, CORS 6.0.2 → 6.0.5 | Host, cookies/origins, preflight, multipart og 413 |

ProseMirror har et høyt [paste-XSS-varsel](https://github.com/ProseMirror/prosemirror-view/security/advisories/GHSA-c8x8-7fp4-3x9w)
for innliming av angriperstyrt HTML. Både installert berørt versjon og standard
clipboardbane er kontrollert. Visningssanitering i `sanitizeRichText` kjører
senere og beviser ingen beskyttelse under innlimingen. Dette gir høy
oppfølgingsprioritet, men ingen exploit er kjørt. Den avgrensede oppfølgingen er sporet i
[#268](https://github.com/khjohns/endringsmeldinger/issues/268). Tiptap-core har et separat
prototype-pollution-varsel; nødvendig ukontrollert attributtobjekt er ikke
påvist i appen. Det begrunner egen vurdering av Tiptap 3, ikke automatisk majorbytte.

Npm-audit rapporterte 55 berørte pakkenoder, inkludert utviklingsverktøy og
ubrukte pakker. Tallet er **ikke 55 appfeil**. Flere Svelte-varsler krever SSR,
brukerstyrte spread-attributter eller dynamisk tag. Dagens app er en nginx-SPA
med `ssr=false`; de relevante serverforutsetningene er fraværende i lest kode.
Vedlikehold innen Svelte 5 anbefales likevel. Vite- og Vitest-varsler vurderes
mot utviklings-/testserverens eksponering. Vitest 3-patch fjerner ikke nødvendigvis
alle varsler; en major krever egen konfigurasjonskontroll.
([frontendens advisoryanalyse](vedlegg/avhengigheter-2026-10-07/frontend.md#avh-f-02-sikkerhetsvarsler-må-knyttes-til-kjørebanen)).

HTTP-gruppen har sikkerhetsrettinger, men ingen utnyttelse i KOE er påvist.
Dagens Catenda-retry kan gjenta POST/PATCH både i adapter og ytterløkken;
antall forsøk og idempotens må prøves før policy endres. Flask 3.1 har allerede
nøkkelrotasjon og formgrenser i bruk. `TRUSTED_HOSTS` og grenser per request kan
vurderes når hosting er konkret. Limiterens `memory://` er per prosess;
versjonsoppdatering gir ikke en felles flerarbeidergrense.
([urllib3](https://urllib3.readthedocs.io/en/stable/changelog.html),
[Flask](https://flask.palletsprojects.com/en/stable/changes/)).

## AV-03: Fjern begrunnet overflate og verifiser bygg

**Fil og symbol:** [package.json](../package.json),
[CI](../.github/workflows/ci.yml), [krav](../backend/requirements.txt),
[validation_drift.py.parse_frontend_schemas](../scripts/validation_drift.py).
Formsnap, Superforms og Zod mangler faktisk appbruk i det undersøkte treet.
Fjern skjemapakkene som samlet ubrukt stakk; behold bare Zod dersom samme arbeid gir
pakken en konkret runtimegrense. Driftkontrollen leter etter gamle React-filer
som ikke finnes og importerer ikke Zod. Dette er et separat
oppfølgingspunkt, ikke belegg for å beholde pakken.

Azure Functions, Identity og Key Vault SDK har ingen funnet aktiv innkobling i
sporede app-/driftsfiler. De kan fjernes fra standardinstallasjonen eller legges
i et eksplisitt plattformtillegg når en kaller finnes. Hostingvalget avgjøres
ikke ved å beholde dem. Faker, pytest-mock, pytest-asyncio og direkte dateutil
har tilsvarende oppryddingskandidatur, med ren installasjon som kontroll.
Derimot har openpyxl dokumentverktøybruk, httpx SDK-bruk og Supabase aktive lagre.
Sistnevntes avvikling følger eksisterende TS2-02 og B-12.

CI kjører tester, typesjekk og lint, men mangler `npm run build`; Docker bygger
senere. Legg en byggport til ved vedlikeholdsarbeidet. Direkte imports av
`@eslint/js` og `@tiptap/pm/state` bør få eksplisitt dependency-eierskap; dagens
låste installasjon har dem, så dette er ingen observert oppstartsfeil.

## AV-04: Modellverktøyene kan støtte M3/M5 allerede

**Fil og symbol:** [AnyEvent og parse_event](../backend/models/events.py),
[validate_event_data](../backend/api/validators.py),
[public_state](../backend/lib/auth/event_visibility.py),
[apiFetch](../src/lib/api/client.ts) og
[get_event_json_schema](../backend/lib/cloudevents/schemas.py).
Pydantic v2 tilbyr `TypeAdapter`, taggede unioner og særskilte validerings-/serialiseringsskjema.
Disse trenger ingen majoroppgradering. Dagens parsing velger allerede modell
etter `event_type` og responsdata etter `spor`; problemet er flere kart og
grenser, ikke at alt overlates til smart-unionmatching.

Skill strenge nye kommandoer fra kompatibel lesing av historiske hendelser.
En lukket request-DTO med `extra='forbid'` må også typere nøstet `data`, særlig
sak-opprettelse. Offentlig respons bør ha egen DTO etter prosjekt-/teamfilteret.
Serialisering er ikke autorisasjon. CloudEvents bruker allerede
`mode='serialization'`; muligheten er derfor delvis tatt i bruk.
([Pydantic-unioner](https://docs.pydantic.dev/latest/concepts/unions/),
[serialisering](https://docs.pydantic.dev/latest/concepts/serialization/)).

Frontendens `data as T` beviser ingen runtimekontrakt. Prøv Zod 4 eller små
konkrete typevakter ved API-grensen, og utled typer fra kontrakten der det lønner
seg. Ajv er relevant for et delt JSON Schema-corpus, men innfører ingen juridisk
regelmodell. CloudEvent-konvoluttens draft-07 og Pydantics 2020-12 må avstemmes
før en felles validator velges. Test fravær, `null`, tom verdi, diskriminanter
og ukjente felt uten automatisk typekonvertering eller feltfjerning.
([Zod 4](https://zod.dev/v4/changelog), [Ajv-dialekter](https://ajv.js.org/json-schema.html)).

## AV-05: TS-prototypen skal måle vedlikehold og bevise semantikk

**Fil og symbol:** [backend/regler](../backend/regler/__init__.py),
[vederlagDomain](../src/lib/domain/vederlagDomain.ts) og
[kontroller_svar](../backend/regler/sammenlikning.py).
Prøv den representative flyten fra [arkitekturforslaget](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#7-ma-07-en-tidsbegrenset-beslutningsprøve):
vederlag med grunnlagsavhengighet, supplert med et fristscenario, i ordinære
`.ts`-moduler. Kjernen tar domenedata og returnerer domenesvar uten IO,
Svelte-runes, DOM eller request-globals. Runes, snippets og context er allerede
brukt i UI; en delt kjerne krever ingen ny reaktivitetsmodell.

Samme versjonerte corpus skal kjøres mot Python og TS. Det må inneholde
hendelsesforløp, replay, låsing, nytt krav etter svar/aksept og eksplisitte
forventninger. B-13 er avklart: lagrede resultater, beløp og dager regnes ikke
om, mens avledet standpunkt leses med gjeldende regler. Språkvalget åpner ikke
dette spørsmålet igjen. Behold regelversjonsvakten fordi gamle nettlesere
fortsatt kan møte ny server. API/runtime-validering og bevisopplegg trengs også
når kildekoden deles.

Python bruker Decimal med halv-opprunding, men sender også beløp gjennom float;
frontend bruker number. Sammenlikn heltallsøre med avgrenset område og en liten
desimalpakke. Test negative og positive halvverdier, komponentsummer, høye
beløp og ikke-finite tall. Pakken kan ikke hente tilbake presisjon som allerede
gikk tapt ved transport. Negative krav følger [#189](https://github.com/khjohns/endringsmeldinger/issues/189),
og avgjøres ikke av bibliotekvalg.
([decimal.js](https://mikemcl.github.io/decimal.js/)).

Mål regler som fortsatt må endres to steder, klientkode som faktisk forsvinner,
feilbaner, byggetid og adapter-/driftsarbeid. En Python-server kan ikke importere
TS direkte; prototypen må vise en konkret serverutførelse og kostnaden ved
språkgrensen. Hold eksisterende database fast under prøven, slik at åpne
B-12 og Azure SQL-kostnader ikke blandes med språkresultatet.

## AV-06: Kit-server er et eget valg med koordinert migrering

**Fil og symbol:** [svelte.config.js](../svelte.config.js),
[rotlayout](../src/routes/+layout.ts), [Dockerfile](../Dockerfile) og
[vite.config.ts](../vite.config.ts).
Ren TS kan deles med nettleseren uten SvelteKit-serverhandlinger. Form actions,
server-loads og remote functions krever en serveradapter og nye auth-/driftsbaner.
Remote functions er eksperimentelle ved kontrollen. Start eventuelt med én
serverrute og fortsatt klientrendring; SSR trenger ingen plass i første prøve.

Per 07.10 krever Kit 3.0.1 Node ≥22.17, Svelte `^5.57.1`, Vite `^8.0.12`,
vite-plugin-svelte `^7` og TypeScript `^6`. **TypeScript latest 7.0.2 oppfyller
ikke denne matrisen.** Velg en konkret stabil 6.x og kontroller resolveren.
Kit 3 endrer konfigurasjon og imports, adapter-static får ny major, og Vite 8
endrer byggmotor. Dette er ingen ferdig testet kombinasjon.
([Kit-migrering](https://svelte.dev/docs/kit/migrating-to-sveltekit-3),
[remote functions](https://svelte.dev/docs/kit/remote-functions)).

En serverprototype må bevise auth, CSRF, prosjekt/team, serverstemplede felt og
forventet versjon. Ved SSR må modulglobal klientkontekst gjøres request-lokal,
og sanitering uten DOM vurderes særskilt. Prøv én eier av sakskonteksten før
TanStack Query fjernes; cache, load og workspace må bevare versjonsmonotoni og
«lagret, men refresh feilet».

## AV-07 og AV-08: Behold adaptere til erstatningen har en gevinst

**Fil og symbol:** [approval_letter.pdf_bytes](../backend/services/approval_letter.py),
[LetterPdfGenerator](../backend/services/letter_pdf_generator.py) og
[Database.transaksjon](../backend/lib/db/database.py).
ReportLab 5.0.1 krever separat majorprøve mot kjent 4.4.10, med syntetiske brev,
visuell rendering, norske tegn, lange tekster og ressursgrenser. To PDF-genereringer
med samme input ga ulike bytes og hash i underlaget. F2 må derfor levere samme
frosne dokument ved retry; rendererbytte eller determinismeforsøk erstatter
ikke dette. PDFKit eller HTML/Playwright vurderes først ved faktisk TS-backend
og konkret layoutgevinst.

Psycopg 3.3.6 og pool 3.3.3 er allerede aktuelle. Behold transaksjonskontrakten;
en ORM sparer ingen dokumentert oppgave her. FastAPI gir OpenAPI/modeller og
ASGI, men flytter også sikkerhetslaget og løser ikke Python–TS-grensen. Flask
async holder fortsatt én worker per request. React-bytte har ingen påvist
gevinst i appens etablerte Svelte-struktur. Python-runtime, Vitest-major og
formatteringsmajorer bør tas separat. Unngå `npm audit fix --force`, full
Ruff-formatering og samtidig språk-, database-, renderer- og rammeverksmigrering.
([FastAPI](https://fastapi.tiangolo.com/features/),
[Flask async](https://flask.palletsprojects.com/en/stable/async-await/)).

## Verifikasjon og grenser

**Kjørt og observert i underlaget:** versjonsinventar mot lokal venv/npm-lås,
offentlige PyPI/npm-metadata 07.10, npm dependency-grafer og audit, `pip check`
og 198 eksisterende modell-/parsing-/validator-tester. PDF-byteforsøket brukte
samme syntetiske input to ganger. Disse resultatene gjelder dagens miljø,
ikke kandidatversjonene. Syntesen leser alle tre vedlegg og kontrollerer egne
lokale Markdown-lenker; den installerer ingen pakker.

**Lest ut av koden:** HTTP-/editorbaner, offentlig state, parsing, imports,
container/CI, driver, skjemaeksport, beløpskonverteringer og regelversjonsvakt.
Manglende import er ikke alene bevis for at et verktøy er ubrukt. Advisoryenes
forutsetninger er avgrenset; ingen app-exploit er demonstrert.

**Ikke kontrollert:** full testsuite, frontendbygg, databasekatalog/live-RLS,
nyinstallasjon av oppgraderingsgruppene, nettleserreproduksjon, deploy,
Azure-kostnader, eksterne utrullingsrepoer, PDF-layout/tilgjengelighet eller
målbar TS-gevinst. Ingen produksjonskode, pakker, base eller hovedplan er endret.
Koordinatoren har opprettet [#268](https://github.com/khjohns/endringsmeldinger/issues/268)
for editor-/Svelte-vedlikehold og
[#269](https://github.com/khjohns/endringsmeldinger/issues/269) for Python-lås og
transportvedlikehold. Denne rapporten gir et avgrenset
beslutningsgrunnlag; den godkjenner ingen migrering eller utrulling.
