# Audit: generert begrunnelsestekst og domenelagets rekkevidde

Dato: 2026-09-14. Denne delgjennomgangen dekker frontendens domenelag: kode som
produserer juridisk begrunnelsestekst til motparten, og hvilke NS 8407-regelmoduler
som faktisk er nåbare fra en rute. Tidligere auditer har dekket infrastruktur —
autentisering, sesjon, API-klient, persistens, PDF/Catenda-levering og
event sourcing. Domenelaget var ikke auditert.

Supabase/RLS, live Catenda-kall og backendens egne regler er ikke berørt her.

## Konklusjon

Selve beregningsdomenet (`src/lib/domain/`) er solid: 96,6 % linjedekning og ingen
funn i denne runden. Problemene ligger i *tekstgeneratorene* rundt det, og i at en
betydelig del av NS 8407-regelkoden ikke er koblet til noen rute.

Ett bekreftet funn med rettslig betydning er rettet (BEGR-01), og en rød test er
gjenopprettet (TEST-01). Den unådde koden er kartlagt og deretter ryddet etter
brukerens beslutning (DØD-01). Ett forhold er dokumentert uten å endres, fordi det er
en preeksisterende tilstand utenfor denne rundens omfang (HYG-01).

## Funn og retting

### BEGR-01 — Høy: brevtekst påberopte §34.1.2-preklusjon der regelen ikke gjelder — rettet

`generateVederlagResponseBegrunnelse` er live i BHs svarskjema
(`VederlagForm.svelte`) og skriver den formelle begrunnelsen som lagres på
hendelsen og går til motparten.

`VederlagResponseInput` hadde ikke grunnlagets hovedkategori. Generatoren avgjorde
preklusjon utelukkende av `hovedkravVarsletITide === false` og skrev da:

> «Hovedkravet på kr … avvises prinsipalt som prekludert iht. §34.1.2 …»

§34.1.2 rammer bare hovedkravet ved SVIKT/ANDRE. Ved ENDRING er hjemmelen §34.1.1,
som ikke har samme regel om rettighetstap. Resten av domenet håndhever dette
gjennom `har34_1_2Preklusjon()`; både `erHovedkravPrekludert()` og `buildEventData`
er korrekt avgrenset, og `buildEventData` skriver derfor `hovedkrav_varslet_i_tide:
undefined` ved ENDRING.

Konsekvensen var at én og samme hendelse kunne bli lagret med et strukturert felt
som sier «ikke prekludert» og en brevtekst som påberoper preklusjon.

Reproduksjonsvei, fastslått ved kodelesing:

1. Saken er SVIKT. BH svarer «ikke varslet i tide» → `hovedkrav_varslet_i_tide: false`.
2. Grunnlaget omkategoriseres til ENDRING. ADR-001 slår uttrykkelig fast at
   kategorien er partens foreløpige vurdering og kan endres.
3. BH åpner svarskjemaet på nytt. `getDefaults` gjenoppretter
   `hovedkravVarsletITide: prev.hovedkravVarsletITide ?? true` → `false`.
4. `preklusjonsLinjer` viser bare hovedkravslinjen når `har34_1_2_Preklusjon` er
   sann. Ved ENDRING er kontrollen dermed skjult, og BH kan ikke se eller endre
   det etterslepte flagget.
5. `autoBegrunnelseHtml` sendte likevel det rå flagget til generatoren.

**Retting:** `VederlagResponseInput` har fått `hovedkategori`, og generatoren
avgjør nå preklusjon gjennom en intern `erHovedkravPrekludert()` som kaller
domenets egen `har34_1_2Preklusjon()`. Kallstedet sender
`domainConfig.hovedkategori`. Uten kategori påberopes ingen §34.1.2-preklusjon —
samme standpunkt som `har34_1_2Preklusjon()` og som feltet i hendelsen, slik at
tekst og struktur ikke kan komme i utakt.

Særskilte krav etter §34.1.3 (rigg/drift, produktivitet) er *ikke* avgrenset av
kategori og er bevisst latt urørt. Dette er dekket av egne tester.

**Avgrensning:** reproduksjonen er kjørt på domene- og generatornivå. Trinn 1–2 i
listen over er fastslått ved kodelesing, ikke ved en ende-til-ende-test gjennom
skjemaet. Eksisterende hendelser med slik tekst er ikke undersøkt eller migrert.

### TEST-01 — Middels: testsuiten var rød på HEAD — rettet

`workspace.test.ts` mocket `$lib/api/client` med kun `apiFetch`. Da
`approval/context.svelte.ts` begynte å importere `ApiError` (commit `28724d5`),
brøt testen med «No "ApiError" export is defined on the mock».

Bruddet lå altså i kodebasen gjennom hele den påfølgende auditrunden. Auditloggene
rapporterer delkjøringer (52 frontendtester) som passerte; ingen av dem kjørte hele
suiten, og bruddet ble derfor ikke fanget. Produksjonskoden var ikke berørt — feilen
lå i testens mock.

**Retting:** mocken er gjort partiell med `importOriginal`, slik at ekte eksporter
beholdes og bare nettverkskallet stubbes. Nye eksporter fra `client.ts` vil ikke
bryte testen på nytt.

### DØD-01 — Middels: NS 8407-regelmoduler uten noen rute som når dem — ryddet

Reachability-analyse fra `src/routes/**` med transitiv import-følging: 173 filer er
nåbare, 28 er det ikke (~121 KB, når `app.d.ts` og `test-setup.ts` holdes utenfor
som infrastruktur).

Den rettslig relevante klyngen:

| Modul | Størrelse | Merknad |
| --- | --- | --- |
| `utils/preklusjonssjekk.ts` | 15,1 KB | Fristberegning og preklusjonsvarsler for §§25.1.2, 32.2, 32.3, 33.4, 33.6, 34.1.3. Ingen tester, 0 % dekning. |
| `domain/begrunnelse/forseringBegrunnelse.ts` | 16,1 KB | Tekstgenerator for forsering. Backend har `forsering_routes.py`/`forsering_service.py`; frontendgeneratoren er ikke nåbar. |
| `constants/varslingsregler.ts` | 13,1 KB | `VARSLINGSREGLER_NS8407`, `getPreklusjonsRegler()` m.m. Største regeltabellen i kodebasen. |
| `utils/varslingStatus.ts` | 3,5 KB | Compliance-matrise for §32.2/§33.4/§33.6/§34.1. Har 13 tester som passerer, men importeres kun av sin egen test. |
| `constants/fristVarselTypes.ts`, `constants/eventBestemmelser.ts`, `utils/bestemmelser.ts` | 5,3 KB | Hjemmels- og varseltypetabeller. |

I tillegg er hele saksoversikt-tidslinjen unådd: `Saksoversikt.svelte`,
`SakPanel.svelte`, `OversiktSidebar.svelte`, `SakRow.svelte`, `NodeCluster.svelte`,
`TidslinjeCanvas.svelte` og `utils/tidslinje.ts` (~43 KB). Det forklarer hvorfor
`tidslinje.ts` har 0 % dekning uten å være flagget som ubrukt av et enkelt søk.

To risikoer, som begge er grunnen til at dette rapporteres i en audit og ikke som
opprydding:

1. **Falsk trygghet.** `varslingStatus.ts` har grønne tester for en compliance-visning
   ingen bruker ser. Plandokumentet `2026-03-04-fase2-saksliste-forhandlingsbord.md`
   spesifiserer den som en leveranse. Tester som passerer sier her ingenting om at
   funksjonen finnes i produktet.
2. **Konkurrerende sannhetskilder.** `preklusjonssjekk.ts` koder en annen modell enn
   den som er i drift: den *beregner* preklusjon fra datoer med terskler på 3/7/10/14/21
   dager, mens produktet lar BH *vurdere* om varselet kom i tide. Kobles den inn igjen
   uten ny gjennomgang, begynner appen å gi juridiske råd etter tommelfingerregler som
   ikke er forankret i NS 8407-teksten.

**Disposisjon, besluttet av bruker:** `forseringBegrunnelse.ts` beholdes; resten
slettes. Se «Gjennomført opprydding».

Noterte svakheter i `preklusjonssjekk.ts` dersom den vurderes gjenbrukt (ikke rettet,
siden koden er unådd): `sjekkBHPassivitet` gir bare kritisk status når
`svarType === 'AVVIST'`, slik at *manglende* svar — det tilfellet §32.3-passivitet
faktisk rammer — bare blir en advarsel; `sjekkFristSpesifiseringFrist` returnerer
`status: 'kritisk'` sammen med `variant: 'warning'`; og negative dagtall fra en
fremtidig eller feiltastet dato gir stille `'ok'`.

### HYG-01 — Lav: `npm run lint` er rød på HEAD — ikke endret

59 feil, alle `svelte/no-navigation-without-resolve` i rutefiler denne runden ikke
berører. Bekreftet preeksisterende ved å stashe endringene og kjøre på nytt.
Lint-porten kan altså ikke brukes som regresjonsvakt før dette ryddes. Filene endret
i denne runden er rene.

## Kontroller som passerer

| Scenario | Verifikasjon |
| --- | --- |
| Beregningsdomenet | `src/lib/domain/` ligger på 96,6 % linjedekning. `vederlagSubmissionDomain` og `konsekvensVarsler` er på 100 %. Ingen funn. |
| §34.1.2-avgrensning i hendelsen | `buildEventData` skrev allerede `hovedkrav_varslet_i_tide: undefined` for ENDRING. Feilen lå bare i teksten. |
| §34.1.3 uavhengig av kategori | Rigg/drift og produktivitet prekluderes fortsatt ved ENDRING. Dekket av nye tester. |
| Kategorien styrer ikke hvilke varsler som kan sendes | `buildKonsekvensVarsler` ignorerer fortsatt hovedkategori, i tråd med ADR-001. Uendret. |
| Frist- og grunnlagsgeneratorene | Ingen tilsvarende kategorifeil funnet. `generateFristResponseBegrunnelse` bruker varseltype, ikke hovedkategori. |

## Verifikasjon

Før opprydding, etter rettingene i BEGR-01/TEST-01:

```sh
npx vitest run                 # 523 tester, 51 filer — alle passerer
npm run check                  # 0 feil, 19 eksisterende advarsler
npm run build                  # passerer
npx eslint <endrede filer>     # rent (59 preeksisterende feil ellers i repoet)
```

Etter opprydding:

```sh
npx vitest run                 # 510 tester, 50 filer — alle passerer
npm run check                  # 0 feil, 18 advarsler
npm run build                  # passerer
npx eslint .                   # 54 preeksisterende feil (fem lå i slettede filer)
```

Differansen på 13 tester er `varslingStatus.test.ts`, som fulgte modulen sin. Ingen
gjenværende test måtte endres for å kompensere for slettingen.

Ny testfil `src/lib/domain/__tests__/vederlagBegrunnelse.test.ts` har 17 tester.
Fire av dem feilet mot koden før rettingen og er nå ordinære regresjonstester, uten
xfail. Dekningen for `vederlagBegrunnelse.ts` gikk fra **0,66 % → 93,15 %**.

Dekning ble målt med `@vitest/coverage-v8` installert med `--no-save`; `package.json`
og `package-lock.json` er uendret.

Ingen backendendringer, ingen Supabase/RLS-endringer og ingen live Catenda-kall.

## Gjennomført opprydding

27 filer er slettet: de 26 unådde modulene utenom `forseringBegrunnelse.ts`, pluss
`utils/__tests__/varslingStatus.test.ts`, som testet en slettet modul. Katalogen
`components/shared/` ble tom og er borte.

To filer ble holdt tilbake etter kontroll, og det er grunnen til at listen her ikke er
identisk med rekkeviddeanalysens:

- **`domain/begrunnelse/forseringBegrunnelse.ts`** — beholdt etter brukerens
  beslutning. Den avhenger bare av `./shared`, som er live, og står derfor trygt
  alene. Barrelen `domain/begrunnelse/index.ts` er slettet med resten; forsering kan
  importeres direkte, slik frist- og vederlagsgeneratorene allerede gjør.
- **`mocks/saksoversikt.ts`** — *ikke* slettet. Rekkeviddeanalysen regner den som
  unådd fordi den ikke nås fra en rute, men den er en aktiv testfixture for seks
  levende testfiler (`ProjectOverview`, `ProjectActivity`, `WorkQueue`, `activity`,
  `overview` og `domain/__tests__/followUp`). «Unådd fra en rute» er altså ikke det
  samme som «trygg å slette»; referansene fra tester må kontrolleres særskilt.

`.interface-design/system.md` beskriver fortsatt `SakPanel` og `OversiktSidebar` som
del av designsystemet. Spesifikasjonen er ikke endret her — den er et designdokument,
ikke en kodereferanse — men avviket bør avklares: enten er komponentene ønsket og må
bygges på nytt, eller så beskriver spesifikasjonen en visning produktet ikke har.

Sletting av `varslingStatus.ts` fjerner samtidig den eneste implementeringen av
varslingsstatus-matrisen fra fase 2-planen. Skal den funksjonen leveres, må
regelinnholdet gjennomgås på nytt før det vises til brukere — den slettede koden er
ikke kvalitetssikret for det formålet. Historikken beholder den.

`preklusjonssjekk.ts` er slettet. Blir en preklusjonsberegning aktuell senere, bør
den ikke hentes tilbake uten at tersklene (3/7/10/14/21 dager) forankres i
kontraktsteksten, og uten at de tre svakhetene over rettes.

## Gjenopptakelse

Les dette dokumentet, de refererte testene og gjeldende git-diff før videre arbeid.
Et kontrollpunkt markert OK gjelder bare det beskrevne scenariet og den auditerte
koden. Hypoteser skal ikke rapporteres som bekreftede funn uten kodebevis eller
reproduksjon.

Neste delgjennomgang, valgt av bruker: `utils/formatters.ts` (29,6 % dekning) og
`utils/dateFormatters.ts` (35 %). Begge er live, og formatering av beløp, dager og
datoer går rett inn i brevtekst som sendes til motparten.

Øvrige uauditerte områder: forseringsflyten ende-til-ende — `forseringBegrunnelse.ts`
er beholdt, men er fortsatt unådd fra frontend selv om backend har
`forsering_routes.py`/`forsering_service.py` — samt frontendfeil ved nettverksbrudd og
prosjektbytte.
