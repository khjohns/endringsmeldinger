# Audit: utkastlekkasje og teamavgrensede serverutkast

> **Etterprøvd samme dag:** [samtidighet og Catenda-kall](audit-utkast-samtidighet-og-catenda-2026-09-15.md)
> påviste og rettet atomisk versjonskontroll, overlappende klientlagring,
> lagring etter sletting og unødvendig førstegangslagring. Gjenoppretting ved
> fanekrasj er ikke dekket av den opprinnelige verifikasjonen nedenfor.

> **Fulgt opp samme dag:** tilgangslaget er ryddet etter denne runden — CSRF er samlet
> i ett håndhevingspunkt og medlemskapsoppslaget halvert. Se
> [opprydding i tilgangslaget](audit-tilgangslaget-opprydding-2026-09-15.md), som også
> tar opp kallfrekvensen mot Catenda som autolagringen her innførte.

Dato: 2026-09-15. Utgangspunkt: `faacab9`.
Forrige logger: [utkast og samarbeid](audit-utkast-samarbeid-2026-09-14.md), som avklarte
kravene og etterlot funnet åpent, og [vedleggs- og dokumentflyt](audit-vedleggsflyt-2026-09-15.md).

Forutsetning (brukeravklaring 2026-09-15): appen er ikke i produksjon, og databasen
inneholder ingen reelle data.

Brukeravklaring denne runden: **«teamavgrenset» betyr avgrenset etter Catenda-team-ID.**
Det avgjorde delingsmodellen — se [Hva «teamavgrenset» avgjorde](#hva-teamavgrenset-avgjorde).

## Omfang

Kontrollert og rettet: lokal utkastlagring i nettleseren, og fravær av et delt
arbeidsutkast for flere saksbehandlere i samme organisasjon.

Utenfor omfang: ekte tekstsamarbeid med fletting (se
[Gjenstående](#gjenstående)) og Supabase/RLS.

De seks saksskjemaene er migrert til serverutkastet i samme runde — se
[Migreringen av skjemaene](#migreringen-av-skjemaene).

## Funnet, reprodusert før retting

`src/lib/utils/__tests__/draft-owner.test.ts` lå som `it.fails` — et **åpent funn**,
ikke en bestått kontroll. Reproduksjonen: Alice lagrer et ny-sak-utkast, Bob logger inn
i samme nettleser, Bob får Alices kravtekst gjenopprettet i skjemaet.

Årsaken var at `src/lib/utils/draft.ts` lagret under en nøkkel uten eier
(`koe-draft-<rute>-<id>`), og at utlogging ikke ryddet lagringen. Appen hadde derfor
aldri bekreftet hvem teksten tilhørte før den ble vist til neste bruker. Teksten går
inn i formelle kontraktsbrev, så dette er ikke kosmetikk.

Dette er ikke lekkasje mellom nettlesere eller tilgang til serversesjoner, og det er
ikke en produksjonshendelse — appen er ikke i produksjon. Avgrensningen fra forrige
logg står.

## Hva «teamavgrenset» avgjorde

Forrige audit stilte spørsmålet åpent om felles utkast skulle følge kontraktssiden
(TE/BH) eller organisasjonen. Brukeren avklarte: **Catenda-team-ID**.

Det gir samme grense som interne notater allerede bruker (`lib/auth/event_visibility.py`),
så systemet har nå én organisasjonsgrense og ikke to. Byggherrens eksterne rådgiver er
et annet team på samme kontraktsside og redigerer derfor ikke byggherrens tekst.

En presisering som ble protokollført under avklaringen: Catenda er **kilden** for hvem
som sitter i hvilket team, men ikke **vakten**. Backend snakker med Catenda gjennom
appens tjenestekonto, ikke brukerens, så bibliotekets teamrettigheter gater ingenting
appen gjør. Hver forespørsel mot utkastet autoriseres derfor hos oss.

Konsekvens verdt å kjenne til, lest ut av `services/auth_service.py:123-180`:
`contract_membership` returnerer `team_id = None` når brukeren treffer **flere team på
samme side**. Rollen er da entydig, organisasjonen ikke. Med fail-closed teamavgrensning
får en slik person ikke noe utkast i det hele tatt. Det er samme oppførsel som interne
notater har, men det er en reell brukerkonsekvens, ikke en teoretisk kant.

## Rettingen, i to deler

Funnet og samarbeidskravet er to ting, og de er løst hver for seg med vilje.

### A. Teamavgrensede serverutkast (`services/utkast_registry.py`, `routes/utkast_routes.py`)

Felles arbeidsutkast lagret på serveren, avgrenset til
`(prosjekt, sak, spor, revisjon, Catenda-team)`.

- Utkastet tilhører **organisasjonen**, ikke personen: flere saksbehandlere i samme
  team leser og skriver samme tekst.
- Fail-closed i begge ender. Registeret avviser tomt team med `ValueError`, ruten
  svarer 403 `UKJENT_ORGANISASJON`. «Vet ikke hvilken organisasjon» er ikke en egen
  delt bøtte.
- **Revisjonen er del av identiteten.** En innsending fryser sitt grunnlag; arbeid som
  fortsetter etterpå hører til neste revisjon. En lagring her kan derfor ikke endre et
  brev som allerede er sendt.
- Lagret i `BH_APPROVAL_DB`, samme persistente volum som vedlegg og godkjenninger.
- Skriving krever CSRF-token og `min_role="member"`, som vedleggsopplasting.

### B. Lokale utkast følger den innloggede (`src/lib/utils/draft.ts`, `draftOwner.ts`)

Dette er det som faktisk lukker funnet.

- `getSession()` setter eieren, `logout()` nullstiller den. Rot-layouten venter på
  `getSession()` før noen side rendres, så eieren er kjent når et skjema monteres.
- Utkast lagres under `<nøkkel>::<eier>`. Uten bekreftet eier leses og skrives
  ingenting — et utkast vi ikke kan tilskrive noen, gjenopprettes ikke til neste person.
- **Utkast fra før eierstempelet blir liggende urørt.** Den nakne nøkkelen leses aldri
  og skrives aldri over, slik avklaring 1 i forrige logg krever. Verifisert med test.

B er ikke lappen handoffen advarte mot. Lappen ville vært å legge bruker-ID i alle
nøkler og regne samarbeidsbehovet som løst. Her er samarbeidet A, og B er
gjenopprettingsbufferen forrige logg eksplisitt åpnet for: «Lokal lagring kan eventuelt
brukes som avgrenset gjenopprettingsbuffer, ikke som felles autoritativt lager.»

## Konfliktdeteksjon, ikke fletting

`versjon` teller skrivinger. Klienten sender `forventet_versjon` — versjonen den leste,
eller `null` når den mener utkastet ikke finnes — og en skriving som ikke stemmer
avvises med 409 og gjeldende tekst i svaret.

Dette oppfyller **ikke** flettekravet i forrige logg, og påstås ikke å gjøre det.
Det er et bevisst mellomtrinn: «siste skriving vinner» ville tapt kollegaens tekst
stille, og en konflikt som kan vises er ærligere enn det. Begge retninger er dekket —
også den som tror utkastet er tomt, slik at en ny fane ikke sletter en kollegas arbeid.

## Migreringen av skjemaene

`createFormDraft` i `src/lib/kontraktsbord/submission.svelte.ts` var ett sømpunkt som
alle seks skjemaene gikk gjennom, og nøkkelen bar allerede `prosjekt:sak-SIDE-spor-versjon`.
Den tar nå `{ sakId, spor, revisjon }` i stedet for en nøkkelstreng, og går mot serveren.

Kontraktssiden falt ut av nøkkelen med vilje: teamet avgjør siden, og backend leser den
fra `contract_membership`. En klient kan altså ikke velge hvilken side den skriver som.

Atferden skjemaene fikk:

- **Utsatt lagring.** Tekst skrives 1,2 sekunder etter siste tastetrykk, ikke ved hvert
  tegn. Effekten rydder sin egen timer, så en pågående redigering utsetter skrivingen.
- **Ingen tom skriving.** Et skjema som er uendret siden det ble lastet, skriver ikke
  seg selv tilbake og bumper ikke versjonen.
- **Konflikten stopper autolagringen.** Så lenge valget står åpent skrives ingenting;
  ellers ville neste tastetrykk overskrevet kollegaen uten at noen bestemte det.
- **Frakoblet mister ikke tekst.** Nettverksfeil setter status `frakoblet` og lar
  teksten stå i skjemaet. Neste endring forsøker på nytt. Det samme gjelder om utkastet
  ikke kunne hentes ved montering — skjemaet er brukbart uansett.
- **Demo rører ikke serveren.** `enabled = !store.isDemo` som før.

### 409-en, slik brukeren møter den

`UtkastStatus.svelte` viser en linje med lagringsstatus og hvem som sist endret
utkastet, og ved konflikt et valg med to utfall:

- **Behold min tekst** — skriver over kollegaens versjon, bevisst valgt.
- **Hent inn deres** — forkaster min tekst til fordel for den lagrede.

Teksten sier rett ut at den andre versjonen går tapt. Det er ikke pent, men det er
sant, og alternativet — å flette to juridiske begrunnelser automatisk — er verre.
Dette dekker kravet om synlig lagringsstatus i forrige logg. Kravet om å vise **hvem
som arbeider i utkastet akkurat nå** er ikke dekket; det trenger tilstedeværelse i
sanntid, og står igjen sammen med flettingen.

## Avskrevet

Etter regelen om at hypoteser ikke rapporteres som funn: to mistanker holdt ikke, og
utelates ikke stilltiende.

- **`EndringsordreForm` hadde ikke samme lekkasje.** Den la allerede `userId` i
  utkastnøkkelen (`EndringsordreForm.svelte:65`), så en ny bruker fikk ikke forrige
  brukers EO-utkast. Skjemaet er likevel omfattet av eierstempelet nå, for at regelen
  skal være én og ikke to.
- **De seks saksskjemaene manglet ikke avgrensning på sak, spor og revisjon.**
  `createFormDraft`-nøklene bærer allerede `prosjekt:sak-SIDE-spor-versjon`. Det som
  manglet var eier og tilgangskontroll, ikke saksavgrensning — og nøkkelformatet var
  derfor rett utgangspunkt for serveridentiteten.

## Bevisst utenfor: ny sak

Ny-sak-skjemaet (`draftKey('kontraktsbord-ny', prosjektId)`) fikk **ikke** serverutkast.
Før sak-ID finnes har utkastet ingen sak å være avgrenset til, og forrige logg slår fast
at denne inngangen ikke skal få en utledet delingsmodell. Den beholder derfor den lokale
bufferen, nå eieravgrenset. Det er også det skjemaet reproduksjonen gjaldt, så funnet er
lukket der det oppsto.

## Verifikasjon

Ingen nettverkstilgang kreves; suitene går uten.

| Kommando | Før | Etter |
| --- | --- | --- |
| `cd backend && python3 -m pytest -q` | 1249 passerer | **1275 passerer** (+26) |
| `npx vitest run` | 513 tester, 43 filer | **529 tester, 44 filer** (+16) |
| `npm run check` | 0 feil, 10 advarsler | **0 feil, 10 advarsler** |
| `npm run lint` | grønn | **grønn** |
| `npm run build` | passerer | **passerer** |
| `ruff check services/ routes/ lib/ tests/` | 18 | **18** |
| `models/events.py` UP042 / `app.py` I001 | 10 / 1 | **10 / 1** |

`npm run lint` kjører nå `prettier --check src/` før eslint. Formateringen var før
bare håndhevet av pre-commit-kroken, uten CI i repoet; nå er feil formatering en synlig
feil i stedet for en stille omskriving av det som nettopp ble skrevet.

Nye tester: `backend/tests/test_services/test_utkast_registry.py` (12),
`backend/tests/test_routes/test_utkast_routes.py` (14),
`src/lib/kontraktsbord/__tests__/formDraft.test.ts` (11).
`src/lib/utils/__tests__/draft-owner.test.ts` gikk fra én `it.fails` til seks
passerende, og dekker nå: ingen gjenoppretting for neste bruker, egen tekst tilbake til
den som skrev den, to brukeres utkast side om side, gamle utkast urørt, ingen skriving
uten innlogget bruker, og opphør etter utlogging.

### Testene ble kontrollert med mutasjon

`createFormDraft` hadde **ingen** dekning før denne runden, så de 518 grønne testene sa
ingenting om migreringen. De elleve nye passerte på første forsøk, og det beviser lite
når kode og test skrives sammen. To mutasjoner ble derfor innført i implementasjonen for
å se at testene faktisk biter:

| Mutasjon | Utfall |
| --- | --- |
| Fjernet sperren som stopper autolagring mens en konflikt er uavklart | 2 tester feilet |
| Sendte alltid `null` som forventet versjon, så konflikt aldri kan oppdages | 1 test feilet |

Implementasjonen ble gjenopprettet og verifisert på nytt.

### Endringer i eksisterende tester, og hvorfor

Tre eksisterende testfiler måtte settes opp med en eier. Det er verdt å være tydelig på,
siden det ser ut som å tilpasse testene til koden:

- `src/lib/utils/__tests__/draft.test.ts` — tre av fire tester passerte etter endringen
  uten å teste noe, fordi ingenting ble lagret uten eier. De ville vært innholdsløse.
- `NewCaseVarsler.test.ts` og `EndringsordreForm.test.ts` rendrer komponenten direkte og
  omgår dermed rot-layouten, som i appen setter eieren via `getSession()`. Oppsettet
  speiler nå det produksjonsveien gjør.

Kontrollert at dette er en testharness-forskjell og ikke en produksjonsfeil:
`src/routes/+layout.ts:18` venter på `getSession()` før noen side rendres, og begge
komponentene monteres under ruter.

### En reell atferdsendring utenfor testene

`/mockup` får `{ user: null }` fra rot-layouten og ville dermed mistet sine lokale
utkast stilltiende — `EndringsordreForm` beholder utkast også i demo
(`endringsordre-demo`). Demoruten setter derfor en fast eier `mockup`
(`src/routes/+layout.ts`). Demodataene tilhører ingen, så det er ingen
sammenblandingsrisiko der.

## Gjenstående

1. **Ekte tekstsamarbeid.** Konfliktdeteksjon er ikke fletting. Kravlisten i forrige
   logg står fortsatt på to punkter: flere samtidige redaktører uten at hele snapshots
   overskriver hverandre, og konflikthåndtering for strukturerte felt (beløp, datoer,
   frister) — en 409 på hele skjemaet skiller ikke mellom et endret beløp og en endret
   setning. Synkroniseringsmekanisme skal velges ut fra faktisk driftsoppsett; en
   CRDT-provider er en ny kjørende tjeneste og er ikke innført her.
2. **Tilstedeværelse.** Kravet om å vise hvem som arbeider i utkastet akkurat nå er
   ikke dekket. Statuslinjen viser hvem som sist *endret* det, ikke hvem som sitter i
   det. Dette hører sammen med punkt 1.
3. **Opprydding av forlatte utkast.** Skjemaene sletter utkastet ved vellykket
   innsending (`createSubmission(() => draft.clear())`), så den normale veien rydder
   etter seg uansett hvilken av de tre innsendingsveiene backend brukte. To hull står
   igjen: en innsending fra en annen fane eller maskin rydder ikke denne klientens
   utkast, og en nettleser som dør mellom innsending og sletting etterlater raden.
   Konsekvensen er begrenset — revisjonen er frosset, så neste skjema åpner på
   `revisjon + 1` og får et tomt utkast — men radene blir liggende. En opprydding
   server-side ved innsending ville lukket begge.
4. **`BH_APPROVAL_DB` trenger varig lagring og restore-test** før produksjon. Nå ligger
   også utkastene der. Se [persistensauditen](audit-persistens-gjenoppretting-2026-09-14.md).
