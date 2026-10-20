# Frontend-avhengigheter: bruk, oppgraderinger og delt TypeScript-kjerne

Vurdert 2026-10-07. Lokal HEAD: `68ca0ea5b593808c4513dc84ab908baf12739cdb`.
PR #266: `4c8860a`; `package.json` er kontrollert med `git show` og har samme
direkte avhengigheter. Versjonstall nedenfor er et øyeblikksbilde fra npm denne
dagen, ikke varige måltall. Forrige ledd er
[hovedplanen](../../plans/2026-09-16-godkjenning-og-varig-levering.md).
Notatet vurderer vedlikehold og prototyping; det endrer ingen funnstatus i planen.

## Konklusjon og funntabell

Behold Svelte 5 og den eksisterende komponentstrukturen. Mest konkret gevinst er
å oppdatere editorens transitive ProseMirror, vedlikeholde eksisterende majorer,
fjerne den ubrukte skjemastakken og legge faktisk runtimevalidering ved API-grensen.
SvelteKit-server og delt TypeScript-kjerne bør prøves som en avgrenset prototype.
Remote functions er fortsatt eksperimentelle og er ikke nødvendig for å dele
domenelogikk mellom klient og server.

ID-ene er lokale til dette notatet. «Alvorlighet» gjelder hva som er belagt her;
advisoryenes alvorlighet står separat i sikkerhetsseksjonen.

| ID | Vurdering | Alvorlighet / prioritet | Belegg |
| --- | --- | --- | --- |
| AVH-F-01 | ProseMirror-versjonen er berørt av paste-XSS; editorbanen finnes | Høy oppfølgingsprioritet; utnyttelse i appen ikke kjørt | `RichTextEditor`, låsfil og GHSA-c8x8-7fp4-3x9w |
| AVH-F-02 | Nyere Svelte/Kit-varsler krever vurdering etter konkrete forutsetninger | Vedlikehold; flere serverbaner er fraværende | SPA-konfigurasjon og fire Svelte-advisoryer |
| AVH-F-03 | Superforms, Formsnap og Zod brukes ikke av appen | Lav; unødvendig installasjonsflate | Kodesøk, skript og dependency-/peer-graf |
| AVH-F-04 | API-typer garanterer ikke runtimekontrakten | M3/M5-prototype; ingen ny sikkerhetsklassifisering | `apiFetch<T>` returnerer `data as T` |
| AVH-F-05 | Kit 3 er et koordinert majorbytte, og TS latest passer ikke peer-kravet | Middels migrasjonsrisiko | Offisiell migreringsguide og npm-metadata |
| AVH-F-06 | Testverktøy brukes; CI har ingen byggport | Lav; konkret verifikasjonsgap | Skript, CI og Vitest-konfigurasjon |

## Versjonsinventar

Deklarert er intervallet i [package.json](../../../package.json). Låst er
[package-lock.json](../../../package-lock.json). Alle 34 direkte pakker var
installert med **samme versjon som låsfilen**; installert kolonne er derfor lik
«låst» i hver rad. «Innen intervallet» er npm `wanted`, mens «nyeste stabil» er
npm `latest`. `npm outdated --json` og `npm view ... version peerDependencies
engines --json` ble kjørt uten installasjon. Tallene kommer fra det offisielle
[npm-registeret](https://registry.npmjs.org/), med offentlige pakkeendepunkter
som [Svelte](https://registry.npmjs.org/svelte/latest),
[Kit](https://registry.npmjs.org/@sveltejs%2fkit/latest) og
[Vitest](https://registry.npmjs.org/vitest/latest).

| Pakke | Deklarert | Låst = installert | Innen intervallet | Nyeste stabil 07.10 | Faktisk bruk / vurdering |
| --- | --- | --- | --- | --- | --- |
| svelte | ^5.49.0 | 5.53.7 | 5.57.2 | 5.57.2 | Runes, snippets, context og SvelteDate er allerede i bruk; vedlikehold innen 5 |
| @sveltejs/kit | ^2.20.0 | 2.53.4 | 2.70.3 | 3.0.1 | Routing/load/build; vedlikehold 2 først, 3 separat |
| @sveltejs/adapter-static | ^3.0.10 | 3.0.10 | 3.0.10 | 4.0.0 | Brukes i statisk drift; major 4 sammen med Kit 3 |
| @sveltejs/vite-plugin-svelte | ^6.2.4 | 6.2.4 | 6.2.4 | 7.3.1 | Preprosessering/plugin; major 7 krever Vite 8 |
| vite | ^7.3.1 | 7.3.1 | 7.3.7 | 8.3.3 | Dev/proxy/build; sikkerhetsvedlikehold 7 før Rolldown-major |
| typescript | ^5.8.0 | 5.9.3 | 5.9.3 | 7.0.2 | Hele TS-koden; latest 7 er utenfor Kit 3 sitt peer-krav ^6 |
| zod | ^3.25.76 | 3.25.76 | 3.25.76 | 4.6.5 | Ingen appimport; fjern sammen med ubrukt skjema eller erstatt med konkret M3/M5-bruk |
| sveltekit-superforms | ^2.30.0 | 2.30.0 | 2.31.0 | 3.0.0 | Ingen appimport; fjerningskandidat |
| formsnap | ^2.0.1 | 2.0.1 | 2.0.1 | 2.0.1 | Ingen appimport; peer mot Superforms 2, ikke 3 |
| @tanstack/svelte-query | ^6.1.0 | 6.1.0 | 6.3.1 | 6.3.1 | Saksliste og sakskontekst; behold, vedlikehold 6 |
| @tiptap/core | ^2.27.2 | 2.27.2 | 2.27.3 | 3.31.4 | Editor og LockedValueNode; major krever egne tester |
| @tiptap/starter-kit | ^2.27.2 | 2.27.2 | 2.27.3 | 3.31.4 | Editor; oppdater Tiptap-pakkene samlet |
| @tiptap/extension-character-count | ^2.27.2 | 2.27.2 | 2.27.3 | 3.31.4 | Editor teller tekst |
| @tiptap/extension-placeholder | ^2.27.2 | 2.27.2 | 2.27.3 | 3.31.4 | Editorplaceholder |
| bits-ui | ^2.16.2 | 2.16.2 | 2.19.5 | 2.19.5 | Tooltip.Provider i rotlayout; resten er egne primitiver |
| date-fns | ^4.1.0 | 4.1.0 | 4.4.0 | 4.4.0 | `differenceInDays` i grunnlagDomain; ikke erstatt fristsemantikk med håndskrevet ms-regning |
| dompurify | 3.4.15 | 3.4.15 | 3.4.15 | 3.4.16 | Sanitering ved HTML-visning; patch krever endring av eksakt pin |
| lucide-svelte | ^0.475.0 | 0.475.0 | 0.475.0 | 1.0.1 | Ikoner i mange komponenter; 0.x-caret henter ikke neste minor |
| @tailwindcss/vite | ^4.2.1 | 4.2.1 | 4.3.3 | 4.3.3 | Plugin i vite.config; oppdater sammen med tailwindcss |
| tailwindcss | ^4.2.1 | 4.2.1 | 4.3.3 | 4.3.3 | CSS-bygg; ingen grunn til rammeverksbytte |
| vitest | ^3.1.0 | 3.2.4 | 3.2.7 | 5.0.3 | Domene/API/komponenttester; sikkerhetsvedlikehold og senere major |
| @testing-library/svelte | ^5.2.0 | 5.3.1 | 5.4.2 | 5.4.2 | Komponenttester og global cleanup |
| @testing-library/jest-dom | ^6.9.1 | 6.9.1 | 6.9.1 | 7.0.1 | Matchere via src/test-setup.ts; behold |
| @testing-library/user-event | ^14.6.1 | 14.6.1 | 14.6.7 | 14.6.7 | Interaksjoner i komponenttester |
| jsdom | ^28.1.0 | 28.1.0 | 28.1.0 | 29.1.1 | DOM-testmiljø; faktisk nettleser erstattes ikke av dette |
| eslint | ^9.18.0 | 9.39.3 | 9.39.5 | 10.12.0 | CI `eslint .`; major har ingen påvist domenegevinst |
| eslint-plugin-svelte | ^3.0.0 | 3.15.0 | 3.23.0 | 3.23.0 | Flat recommended for Svelte |
| typescript-eslint | ^8.20.0 | 8.56.1 | 8.71.1 | 8.71.1 | TS-regler og Svelte-parserintegrasjon |
| globals | ^16.0.0 | 16.5.0 | 16.5.0 | 17.13.0 | browser/node globals i eslint.config |
| prettier | ^3.8.1 | 3.8.1 | 3.9.9 | 3.9.9 | CI, format-script og lint-staged; kan endre formatering |
| prettier-plugin-svelte | ^3.5.1 | 3.5.1 | 3.5.2 | 4.1.1 | Svelte-parser i .prettierrc; major separat |
| svelte-check | ^4.4.0 | 4.4.4 | 4.7.6 | 4.7.6 | CI typesjekk; vedlikehold 4 |
| husky | ^9.1.7 | 9.1.7 | 9.1.7 | 9.1.7 | prepare og .husky/pre-commit; CI slår av med HUSKY=0 |
| lint-staged | ^16.3.3 | 16.3.3 | 16.4.0 | 16.4.0 | Pre-commit kjører Prettier på endrede src-filer |

## AVH-F-01: editor og sikkerhetsvarsler

### ProseMirror: prioritert, avgrenset oppdatering

Kjørt og observert: `npm ls` bekrefter `@tiptap/core@2.27.2 →
@tiptap/pm@2.27.2 → prosemirror-view@1.41.6`. Det offisielle varselet
[GHSA-c8x8-7fp4-3x9w](https://github.com/ProseMirror/prosemirror-view/security/advisories/GHSA-c8x8-7fp4-3x9w)
angir berørt `<1.42.3`, rettet `1.42.3`, alvorlighet høy, med forutsetningen at
brukeren limer angriperstyrt HTML inn i en ProseMirror-editor.

Lest ut av koden: [RichTextEditor](../../../src/lib/components/primitives/RichTextEditor.svelte)
oppretter `Editor` med StarterKit og standard innliming. Ingen
`transformPastedHTML`, `handlePaste` eller egen `clipboardParser` er konfigurert.
I den installerte `prosemirror-view/src/input.ts` går `editHandlers.paste` fra
`clipboardData.getData('text/html')` til `doPaste` og `parseFromClipboard`.
`clipboard.ts` leser HTML via `readHTML`/`innerHTML`, parser et slice, og leser
eventuell `data-pm-slice`-kontekst via `addContext`; `doPaste` skriver slice inn
gjennom en editortransaksjon og `view.dispatch`. Dette er bibliotekbanen varselet
gjelder. Ingen exploit er kjørt i appen; konsekvensen er en begrunnet kandidat,
ikke observert kjøring av JavaScript.

[sanitizeRichText](../../../src/lib/utils/sanitizeRichText.ts) saniterer HTML-strenger
ved visning i GrunnlagOverview og ExpandableReasoning. Den kjører ikke i
clipboardbanen. Den senere visningssaniteringen beviser derfor ikke at
editorinnlimingen er beskyttet. Serverens datatilgang kan heller ikke stoppe
lokal kodekjøring i editorens nettleserorigin.

**Anbefaling:** oppdater først den transitive `prosemirror-view` i låsfilen til
minst `1.42.3`, uten automatisk Tiptap-majorbytte. Den faktisk installerte
`@tiptap/pm@2.27.2` deklarerer `prosemirror-view: ^1.37.0`, så `1.42.3` tillates
av semver. Det er ingen deklarert eksakt pin som krever Tiptap 3. Verifiser ny
resolve med `npm ls`, kjør editortestene og kontroller innliming i faktisk
nettleser. Ingen oppdatering er utført i dette notatet.

### Tiptap core: versjonen er berørt, apputnyttelse ikke påvist

[GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh)
angir `>=2.0.0-alpha.0 <3.30.4`, rettet `3.30.4`, moderat. Det krever et
uautorisert attributtobjekt med egen `__proto__`-nøkkel inn i `mergeAttributes`,
og etterfølgende DOM-serialisering som tar med arvede attributter. Standard faste
skjemaer gjør ikke vilkårlig Tiptap-JSON automatisk utnyttbart.

[LockedValueNode.renderHTML](../../../src/lib/editor/LockedValueNode.ts) bruker
`mergeAttributes`, men noden deklarerer faste felter `type`, `value`, `display`
og leser dem fra HTML. RichTextEditor tar `body`/`content` som HTML-strenger;
en API-/CMS-/plugin-objektbane med egen `__proto__` er ikke påvist. Hold dette
atskilt fra det konkrete ProseMirror-paste-varselet.

Tiptap 3 kan senere rydde to utility-pakker til `@tiptap/extensions`, men
[migreringsguiden](https://tiptap.dev/docs/guides/upgrade-tiptap-v2)
viser reelle brudd: `setContent(content, false)` må bli et options-objekt med
`emitUpdate: false`; ellers kan programmatisk regenerering utløse lagring som en
brukerendring. StarterKit får også Link, ListKeymap og Underline som standard.
Appens DOMPurify-allowlist fjerner lenker og understreking; ikke slå på ny
editorsemantikk tilfeldig. Test token/HTML-retur, låste verdier, sletting,
angre/gjør om, regenerering og utkastlagring. Det er ingen grunn til å bytte
editorbibliotek bare for å redusere fire direkte pakker.

## AVH-F-02: sikkerhetsvarsler må knyttes til kjørebanen

`npm audit --json` ble kjørt 2026-10-07, før kildekontrollen rundt 05:51 UTC.
Råresultatet er bevart i [npm-audit.json](npm-audit.json).
Det rapporterer 55 berørte pakkenoder: 2 critical, 18 high, 32 moderate og 3 low.
Dette er **ikke 55 utnyttbare appfeil**; blant annet telles mange Tiptap-utvidelser
separat for samme core-varsel. Audit omfatter dev og ubrukt installasjonskode.

### Svelte 5.53.7: fire konkrete advisoryer

| Advisory | Berørt → rettet | Forutsetning | Vurdering i dagens app |
| --- | --- | --- | --- |
| [GHSA-f3cj-j4f6-wq85](https://github.com/sveltejs/svelte/security/advisories/GHSA-f3cj-j4f6-wq85) | >=5.46.0 <=5.55.6 → 5.55.7 | SSR/hydratable, angriperinnhold i en synkron verdi etterfulgt av promise | `ssr=false`; ingen hydratable-import; forutsetning ikke til stede i lest appkode |
| [GHSA-rcqx-6q8c-2c42](https://github.com/sveltejs/svelte/security/advisories/GHSA-rcqx-6q8c-2c42) | <=5.55.6 → 5.55.7 | Både form-spread og input/button-spread eller dynamisk name er samtidig brukerstyrt | Ingen slik brukerstyrt form-/name-attributtbane påvist; ikke klassifisert som app-XSS |
| [GHSA-9rmh-mm8f-r9h6](https://github.com/sveltejs/svelte/security/advisories/GHSA-9rmh-mm8f-r9h6) | >=5.51.5 <=5.55.6 → 5.55.7 | Ubegrenset tagstreng til svelte:element | Ingen svelte:element i appens src; avhengighetenes interne bruk er ikke uttømmende analysert |
| [GHSA-pr6f-5x2q-rwfp](https://github.com/sveltejs/svelte/security/advisories/GHSA-pr6f-5x2q-rwfp) | <=5.55.6 → 5.55.7 | SSR av ukontrollerte spread-attributter, event før hydrering | SSR er av; serverforutsetning fraværende |

Alle fire har moderat advisory-alvorlighet. Vedlikehold til `5.57.2` innen
eksisterende major anbefales uten å erklære at appen har fire XSS-feil.
Kjør eksisterende domene-, draft- og komponenttester samt typesjekk. Sikker
versjon er også en forutsetning før SSR-prototypen åpner nye kjørebaner.

### Andre varsler og faktisk pakkevei

| Pakkevei | Advisory-/driftsvurdering | Tiltak |
| --- | --- | --- |
| Kit 2.53.4 → cookie 0.6.0 / devalue 5.6.3 | Kit-audit inneholder handle-hook-DoS, adapter-node BODY_SIZE_LIMIT, query.batch og remote form-varsler. Dagens bygg har ingen Node-server, remote modules eller serverhooks. Flask håndterer HTTP/auth. | Vedlikehold Kit 2 og transitive; vurder på nytt før serverprototype |
| vite 7.3.1 | Devserverens file-read/fs.deny-varsler finnes i audit; Vite kjører ved utvikling/bygg, ikke i nginx-containeren. | Patch til 7.3.7, prioriter ut fra eksponering av devserver |
| vitest 3.2.4 → @vitest/mocker 3.2.4 / tinypool 1.1.1 | Audit har UI-server RCE og worker-/mocker-varsler. CI bruker `vitest run`; UI-pakke er ikke deklarert og ingen UI-server er konfigurert. | 3.2.7 fjerner ikke nødvendigvis alle nye varsler; egen majorutredning til minst patched 4.1.11 eller 5, med testkonfigurasjonsendring |
| jsdom 28.1.0 → undici 7.22.0 | Mange HTTP/WebSocket-varsler i audit gjelder testmiljø; ikke appens nettleser-fetch | Vedlikehold testgraf; ikke betegne dette som Flask-/nginx-feil |
| Superforms 2.30.0 → effect 3.19.19 / joi 17.13.3 / valibot 1.2.0 / ts-deepmerge 7.0.3 | Ubrukt skjemastakk trekker flere valideringsbibliotek med egne varsler | Fjern ubrukt stakk fremfor å majoroppgradere den |
| DOMPurify 3.4.15 | [GHSA-6688-9rhm-gjv2](https://github.com/cure53/DOMPurify/security/advisories/GHSA-6688-9rhm-gjv2): <=3.4.15 → 3.4.16, Node-input i IN_PLACE, serialisering/reinnsetting. [GHSA-p98j-92pf-mc4p](https://github.com/advisories/GHSA-p98j-92pf-mc4p): >=3.4.13 <=3.4.15, IN_PLACE og nodefjernende afterSanitize-hook. Appen sender strenger og bruker ingen IN_PLACE/hook. | Enkel patch av eksakt pin til 3.4.16; nåbar appfeil ikke påvist |

Detaljerte dependency-/advisory-ranges for øvrig tooling finnes i auditresultatet;
de er ikke alle kontrollert som utnyttelsesbaner. Npm `fixAvailable: true` er
ikke bevis for at en uendret major eller eksisterende semverintervall vil fjerne
alle varsler. Eksempel: Kit 2 sin cookie-avhengighet er `^0.6.0`; en oppdatert
Kit-major kan være nødvendig for akkurat denne serverpakken, men serverbanen er
fraværende i dagens drift.

## AVH-F-03 og AVH-F-04: skjemastakk og runtimevalidering

Lest ut av koden: ingen importer av Formsnap, Superforms eller Zod finnes i
`src`, testoppsett, vite.config, eslint.config eller CI. Formsnap har
Superforms-peer `^2.19.0`; Superforms 2 har Zod-peer `^3.25.0 || ^4.0.0` og
optional Zod 4. Formsnap 2 vil dermed ikke tillate en enkel oppgradering til
Superforms 3. Dette er en sammenhengende ubrukt stakk, ikke tre uavhengige
fjerningsbeslutninger.

[validation_drift.py.parse_frontend_schemas](../../../scripts/validation_drift.py)
søker etter gamle React-filer under `src/components/actions/*.tsx`, som ikke
finnes i dagens Svelte-tree. Skriptet leser tekst; det importerer eller kjører
ikke Zod. Det kalles av `check_drift.py`, men CI har eksplisitt utelatt
driftskriptene. Skriptet er derfor ikke belegg for å beholde npm-pakken.
Eventuell modernisering av driftkontrollen er separat oppfølging, ikke gjort her.

**Anbefaling i dagens app:** fjern Superforms og Formsnap i et lite vedlikehold,
og fjern Zod i samme endring dersom M3/M5 ikke innfører et konkret skjema samtidig.
Å beholde en ubrukt v3-pakke «for senere» reduserer ingen duplisering.

**Anbefaling til M3/M5 eller TS-prototype:** bruk ett eksplisitt kontraktsmodul med
runtimeparsing av API-svar og hendelsesnyttelast. [apiFetch<T>](../../../src/lib/api/client.ts)
returnerer fortsatt `data as T`; det kontrollerer HTTP og innholdstype, men ikke
`CaseContextResponse`, null/optional eller hendelsesdiskriminanter. Zod 4 kan
være et godt førstevalg uten Superforms/Formsnap: skriv skjema én gang, utled
typer og parse ved grensene. En håndfull eksplisitte typevakter kan være billigere
for få enkle konvolutter; hele domenemodellen trenger ikke redesignes for å
legge til en feil ved feil `version`/`state`.

[Zod 4](https://zod.dev/v4/changelog) endrer blant annet error-konfigurasjon,
defaults og noen transform-/type-API-er. Appen har ingen eksisterende Zod-skjema
å migrere; kostnaden vil være å formulere riktig API-kontrakt, ikke mekanisk
v3→v4. [Superforms sin Zod 4-adapter](https://superforms.rocks/get-started/zod4)
finnes, men gir ingen gevinst før appen faktisk bruker Superforms.

Valibot er et aktuelt alternativ hvis klientbundle etter måling tilsier det,
eller det modulære API-et passer teamet bedre. SvelteKit remote functions
aksepterer Standard Schema, så Zod er ikke en teknisk lås. Ikke innfør to
validatorbibliotek samtidig uten et behov; sammenlikn lesbarhet, null/optional,
feilstier og bundle på ett ekte CaseContext-svar først.

## AVH-F-05: hva Svelte allerede gjør, og hva prototypen bør bevise

### Eksisterende Svelte 5 kan beholdes

Runes (`$state`, `$derived`, `$effect`, `$props`), snippets, context,
`untrack` og `SvelteDate` brukes allerede. `createCaseWorkspace` kapsler en sak;
`createFormDraft` håndterer organisasjonens utkast, konflikt og sesjonsbytte.
Dette er konkret produktlogikk, som et skjema-/state-bibliotek ikke automatisk
forenkler. M1/M2 sin rene logikk bør eksporteres fra ordinær `.ts`; runes og
Svelte-livssyklus bør forbli i tynt UI-lag. M4 capabilities/pending_actions
trenger samme autoritative beregning på server og klientvisning; et nytt
reaktivitetsbibliotek løser ikke den dupliseringen.

### Statisk deployment er kontrollert

[svelte.config.js](../../../svelte.config.js) bruker adapter-static med
`fallback: 'index.html'`; [rotlayouten](../../../src/routes/+layout.ts)
setter `ssr=false`, `prerender=false`. [Dockerfile](../../../Dockerfile)
bygger med Node 22 og kopierer bare `build` til nginx. [nginx.conf](../../../nginx.conf)
gir SPA-fallback. Ingen `+server`, `+page.server`, `+layout.server` eller remote
module er funnet i `src/routes`. Form actions, server loads og dynamiske remote
functions krever derfor en virkelig serveradapter og ny driftsbane.

[Remote functions](https://svelte.dev/docs/kit/remote-functions) kjører på server,
lager HTTP-endepunkter og er fortsatt eksperimentelle 07.10.2026. De gir typed
query/form/command, deduplisering og refresh, men bør bare prøves i en egen
prototype. Auth, autorisert prosjekt/team, CSRF, journalstempling og forventet
versjon må fortsatt håndheves der. Frameworket gjør ikke domenesikkerheten
automatisk.

### Kit 3 er stabilt, men har en konkret migrasjonsflate

[Kit 3-migreringen](https://svelte.dev/docs/kit/migrating-to-sveltekit-3)
flytter konfigurasjon fra `svelte.config.js` til Vite og erstatter generert `$lib`
med deklarert `#lib` subpath imports og filendelser. Dagens kode har omfattende
`$lib`-bruk. `tsconfig`-integrasjon endres også; ikke anta at bare versjonstall
skal byttes. npm-metadata for `@sveltejs/kit@3.0.1` angir Node `>=22.17`,
Vite `^8.0.12`, Svelte `^5.57.1`, TypeScript `^6.0.0` og vite-plugin-svelte
`^7.0.0`. Lokal Node er 22.17.1, mens CI/Docker sier bare Node 22.
TypeScript `latest=7.0.2` oppfyller ikke `^6.0.0`. Prototype må velge en faktisk
stabil 6.x-versjon som oppfyller peer-kravet, og kontrollere hele matrisen.

[Vite 8](https://vite.dev/blog/announcing-vite8.html) skifter fra esbuild/Rollup
til Oxc/Rolldown. Gevinsten er mulig raskere bygg, ikke mindre domeneduplisering.
Ingen byggeytelsesproblem er målt her. Verifiser Tiptap-importer, CSS-plugin,
statiske ruter og produksjonsbygg før majorbyttet godkjennes.

### TanStack Query: behold nå, sammenlikn én eier av data i prototypen

Bruken er liten og konkret: [caseContext](https://github.com/khjohns/endringsmeldinger/blob/797c4bcc4fd0fa1d6ad6bfb1b8a88a77875bc7d0/src/lib/queries/caseContext.ts),
[caseList](../../../src/lib/queries/caseList.ts), QueryClientProvider i
prosjektlayout og invalidateQueries etter ny EO. Sakskonteksten keys på sak og
prosjekt. `createCaseWorkspace` har egne regler for versjonsmonotoni og «lagret,
men refresh feilet». De må overleve enhver cacheendring.

I dagens SPA er Query et godt valg; ikke skriv egen cache for å spare en pakke.
I serverprototypen kan én `+page.server.ts` load med `depends`/`invalidate`,
eller senere remote query, prøves som eier av sakskonteksten. Ikke behold tre
parallelle tilstandskilder: Kit-load, Query-cache og workspace.response. Mål
forespørsler, feilbaner og kode som forsvinner før Query fjernes. Ikke bruk
generisk automatisk retry eller optimistisk journalføring for formelle varsler.

### Avgrenset prototype som gir beslutningsgrunnlag

Prøv én sakskontekst og én fristrespons med ren TS-kjerne, API-schema og en
serverrute. Samme funksjon skal beregne M1/M2-standpunkt og M4-handlinger i Node
og klienttester. La adapteren gjøre IO/auth, og la kjernen være fri for `$state`,
DOM, request globals og miljøvariabler. Sammenlikn mot dagens Python-/UI-fixtures
uten å omskrive hele journalen. M5 må bevise forskjellen på fravær, `null` og
tom verdi, ikke bare generere TypeScript-interface.

SSR er valgfritt i en SvelteKit-serverprototype. Den kan starte med server-API
og fortsatt klientrendring, slik at deling av kjernen kan testes uten samtidig
hydrering av editor og drafts. Ved senere SSR må modulglobale
`activeProjectId`/CSRF-token i api/client erstattes med request-scope på server;
DOMPurify returnerer i dag tom streng uten støttet DOM. Dette er eksisterende
SPA-forutsetninger, ikke sikkerhetsfeil i dagens nginx-deployment.

## AVH-F-06: testing, lint og formattering

Testing Library, Vitest, jsdom, ESLint, Prettier, Husky og lint-staged har
konkret bruk i skript, testoppsett, hooks og CI. De bør ikke merkes «ubrukte»
fordi de ikke importeres fra appkode. `@eslint/js` importeres direkte i
eslint.config, men er installert gjennom ESLint og er ikke selv deklarert.
`@tiptap/pm/state` importeres direkte i LockedValueNode, men kommer gjennom
StarterKit/peers. Deklarer dem eksplisitt dersom repoet ønsker å unngå at egne
imports er avhengige av transitive installasjonsdetaljer; det øker tydeligheten,
det er ikke et påvist runtimebrudd med dagens npm-lås.

CI kjører `npm test`, `npm run check:error`, `npm run lint`, men **ikke**
`npm run build`. Docker bygger, så dette er et hull i PR-verifikasjonen, ikke
belegg for at appen ikke kan bygges. En byggport er særlig nyttig ved
Vite-/Kit-/adapteroppgradering.

Vitest 4 fjerner `environmentMatchGlobs`; dagens
[vite.config.ts](../../../vite.config.ts) bruker det for komponentenes jsdom.
[Migreringen](https://v4.vitest.dev/guide/migration) angir `projects` som
erstatter. Vitest 5 krever Node >=22.12 og Vite >=6.4, og endrer default
`clearMocks` til true, ifølge [5-guiden](https://vitest.dev/guide/migration/).
Majoroppgradering kan altså gjøres uten samtidig Vite 8, men trenger egen
konfigurasjons- og mockkontroll. Ikke foreslå happy-dom eller ny Jest-stakk uten
målt problem; repoet har allerede spesifikke jsdom-polyfills for Range, dialog
og animasjon.

En ekte nettlesertest av editorpaste, dialog, navigasjon og utkast er mer nyttig
enn flere DOM-polyfills. Repoets `mockup-nettleser`-regel gjelder ved slik
kontroll; ingen lokal Playwright-installasjon er nødvendig. Formattering bør
holdes i en egen, liten endring hvis ny Prettier/plugin endrer output, slik at
domenediffer ikke drukner.

## Prioriterte forslag

1. **Vedlikehold nå:** målrettet ProseMirror >=1.42.3, patch DOMPurify til 3.4.16,
   oppdater Svelte 5, Vite 7 og kompatible transitive pakker. Kontroller
   auditgrafen etterpå; ikke bruk `npm audit fix --force` som migrasjonsplan.
2. **Rydd nå:** fjern ubrukte Formsnap/Superforms; fjern Zod med dem eller gi
   pakken konkret API-runtimebruk i samme arbeid. Kjør test, check, lint og build.
3. **Verifiser leveranse:** byggport i CI og avgrenset editor-/draft-kontroll i
   nettleser. Vitest-major behandles separat fordi nyere varsler ikke alle har
   v3-patch, og `environmentMatchGlobs` må erstattes.
4. **TS-prototype:** ren delt kjerne, M3/M5-kontrakter og én SvelteKit-serverbane.
   Velg Kit/TS/Vite som kompatibel matrise; mål hva som forsvinner av duplisering.
5. **Etter prototype:** Kit 3 i appen, eventuell Query-erstatning og Tiptap 3
   bare der prøven viser lavere vedlikehold eller nødvendig sikkerhetsdekning.
   Async-komponenter, remote functions, observability og live query er muligheter,
   ikke behov dokumentert i dagens kode.

## Verifikasjon og grenser

**Kjørt og observert:** lest deklarerte/låste/installerte versjoner for alle 34
direkte pakker; `npm outdated` og utvalgt npm peer/engine-metadata med nett;
`npm audit`; `npm ls` for editor-, server- og valideringsgrafer; kodesøk i app,
skript, hooks og CI; `git show 4c8860a:package.json`; lokal Node-versjon.
De første npm-kallene feilet DNS i sandbox; samme offentlige metadata ble hentet
etter godkjent nettverkstilgang. Ingen installasjon eller lockfileendring er gjort.

**Lest ut av koden:** statisk deployment, editorpaste-bane, hvor DOMPurify brukes,
API-typenes cast, skjemastakkens manglende appbruk og testverktøyenes brukssteder.
Ingen påstand om apputnyttelse er basert bare på npm-alvorlighet.

**Ikke kontrollert:** full appbygg/testsuite i denne deloppgaven; exploit eller
reproduksjonstest for advisoryer; deployet nettleser; alle third-party interne
Svelte-elementer; effekten av noen oppgradering på bundle eller byggtid;
alle breaking changes i ESLint 10, TypeScript 6/7, Lucide 1 og Superforms 3.
Ingen backend-/databasekonsekvenser av en SvelteKit-server er validert her.
Notatet gir derfor en prioritering og testplan, ikke en ferdig migreringsgodkjenning.
