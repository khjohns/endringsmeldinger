# Handoff 2026-09-21 (sen kveld): fristene er lukket, og hva som står igjen

Skrevet for den som overtar, i praksis en språkmodell som starter uten kontekst.
Samme kriterium som før: **hva er dyrt å finne ut på nytt, og hvor er det lett å
ta feil.** Fortellingen står i dokumentene; dette er det som ikke gjentas der.

Dette er den tredje handoffen 21.09. Forrige
([handoff 21.09 kveld](handoff-2026-09-21-korrekthet.md)) overleverte
korrekthetsrunden og pekte på RY-01 eller MS-05. **Oppdragsgiver valgte MS-05**,
og svarte i samme runde på tre spørsmål som sto som «krever et menneske».

Tilstand ved overlevering: runden er `git log --oneline 8977fa0..` — seks
commiter: beslutningene, MS-05, oppryddingen etter den, MS-05-dokumentasjonen,
MG-02, og MG-02-dokumentasjonen.

**Produksjonskode er endret, og databasen er endret to ganger.** Det er ikke en
auditrunde.

---

## 1. Les i denne rekkefølgen

| Dokument | Svarer på |
| --- | --- |
| [gjennomføring: MG-02](gjennomforing-mg02-2026-09-21.md) | **Begynn her.** Én identitetsform i journalen — og hvorfor to av tre hindringer funnet navnga, ikke holdt |
| [gjennomføring: MS-05](gjennomforing-ms05-2026-09-21.md) | Interne notater ut av journalen. Tre følger: versjonstelleren, flettingen, sletting |
| [masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | **Autoritativ for funnstatus.** Merknaden 21.09 (kveld) bærer de tre beslutningene |
| [audit: opprydding](audit-opprydding-2026-09-21.md) | **RY-01 til RY-07.** Uendret fra forrige runde. **RY-01 er den som betyr noe** |
| [handoff 21.09 (kveld)](handoff-2026-09-21-korrekthet.md) | Runden før. Fellene i punkt 3 gjelder fortsatt |

## 2. Det som hadde frist, har ikke frist lenger

**Begge punktene er gjennomført mens journalen var tom.** Det var hele poenget:
en append-only journal kan ikke restruktureres når den først bærer ekte saker.

- **MS-05** — interne notater ligger i `notat`, utenfor journalen. Versjonen
  flyttes ikke av et notat, tidslinjen fletter to kilder ved lesing, og notatet
  kan slettes av forfatteren.
- **MG-02** — journalen bærer `app_users.id` og ingen annen form.
  `catenda:<subject>` finnes ikke lenger noe sted.

**Ingen beslutning med frist står igjen.** Det som står igjen, står uten frist.

## 3. Tre beslutninger er tatt, og de skal ikke tas opp igjen

De står i masterplanens merknad 2026-09-21 (kveld), som er stedet å lese dem
samlet. Kort:

- **Arkivplikt går foran sletteplikt for kontraktsjournalen.** Kryptografisk
  sletting skal ikke bygges. MS-04 og MS-05 er tiltakene. **Endrer det rettslige
  bildet seg, er det denne merknaden som må oppheves først** — ikke koden.
- **MG-02: ja.** Gjennomført.
- **DB-05: `viewer` skal finnes som begrep.** **Besluttet, ikke bygget.** Dette
  er det eneste av de tre som gjenstår, og det snur forutsetningen for å fjerne
  `project_memberships`: den gamle tabellen er eneste sted begrepet finnes, så
  `app_project_memberships` må bære det *før* den fjernes, ikke etter.

## 4. Tre feller i denne runden

### Felle 1 — en retting som dekket én av to skrivestier

MS-05 la grenen i `submit_event`. `submit_batch` parser gjennom nøyaktig samme
`_parse_authorized_event` og gikk rett til `append_batch`: **et internt notat
sendt dit ville havnet i journalen.** Suiten var grønn, og lesingen fanget det
ikke — oppryddingsrunden etterpå gjorde det.

Dette er samme form som felle 3 i forrige handoff, og rettingen er den samme:
la laget som eier invarianten forsvare den. `krev_journalhendelser` ligger nå i
`repositories/event_repository.py` og treffer begge lagerimplementasjoner.

**Lærdommen er ikke «husk batchruta».** Den er: når en regel skal verne noe som
ikke kan angres, tell skrivestiene før du velger hvor regelen skal ligge.

### Felle 2 — avvisningen ble prøvd på nytt

Første versjon av vakten kastet `ValueError`. `@with_retry()` rundt
Supabase-lagerets `append_batch` klassifiserte den som en ukjent, forbigående
feil: lageret sov og prøvde igjen på en skriving som aldri kan lykkes, og
kalleren fikk `TransientError` framfor 400.

Observert, ikke utledet — testen var rød med en feilmelding som pekte et helt
annet sted. Regelen står nå i `AGENTS.md`.

### Felle 3 — funnet beskrev en beslutning som allerede var tatt

MG-02 sa at det krevdes en produktbeslutning for å la en webhook opprette
brukerrader for folk som aldri har logget inn. **Systemet gjorde det allerede.**
`koe_reconcile_memberships` kaller `koe_resolve_identity` for hvert
prosjektmedlem ved hver synkronisering. Katalogen: fjorten brukere, fjorten
identiteter, **én sesjon.**

Årsaken er den `AGENTS.md` allerede navngir: funksjonen ligger i databasen, ikke
i repoet. Runden fant at innloggingen kaller den, men ikke at en *annen
databasefunksjon* gjør det samme. Det koster lite å spørre `pg_proc` om hvem som
kaller hva — og mye å la være.

To av de tre hindringene MG-02 navnga holdt ikke. Det som faktisk manglet — at
webhooken ikke normaliserte subjektet, og dermed kunne gi en *tredje* verdiform
— sto ikke i funnet i det hele tatt.

## 5. Etablerte fakta — ikke finn dem igjen

- **Migrasjonssettet er 23 filer** og bygger en tom PostgreSQL 16 i ren
  `sort`-rekkefølge, **19 tabeller**, null feil — kjørt etter begge migrasjonene
  i denne runden. Katalogen er identisk med prosjektets på fem snitt; summene og
  spørringene står ordrett i
  [MS-05-gjennomføringen](gjennomforing-ms05-2026-09-21.md). **De er ikke
  sammenliknbare med tidligere runders** — spørringene er skrevet på nytt igjen.
  De fem snittene dekker ikke funksjonskropper, så `koe_resolve_identity` ble
  sammenliknet for seg: `md5(pg_get_functiondef(...))` gir
  `b0c9227eaf65eb2d6c9d27658a3d6607` på begge sider. **Det er første gang en
  funksjonskropp er sammenliknet framfor bare kontrollert ved navn.**
- **`notat` er ikke append-only, og skal ikke bli det.** Når `hendelse` får
  `REVOKE UPDATE, DELETE` (MS-02), skal `notat` holdes utenfor. Det står i
  migrasjonens egen kommentar, men det er verdt å vite før man skriver den.
- **`actorid` er fortsatt `TEXT`.** Typeendringen til `uuid` er nå mulig, men
  `scripts/create_test_sak.py` og `scripts/test_full_flow.py` skriver literaler
  som `"test-script-te"` og respekterer `EVENT_STORE_BACKEND`. Det er et
  skriptrydde-spørsmål, ikke et identitetsspørsmål. Produksjonsstiene er
  kontrollert: alle bruker `g.user["id"]` eller den løste identiteten.
- **Relasjonsvisningen viser ikke notater.** Bevisst innsnevring — et sammendrag
  av en annen sak er ikke dens tidslinje — men ikke bekreftet mot noe krav.
  `visible_events` står igjen der som vern, med en kommentar som sier hvorfor.
- **Ingen brukerflate lager interne notater i dag.** Ingen `.svelte`-fil sender
  `internt_notat`. Skrive- og slettestien er bare kjørt fra tester.
- **KR-15 står:** `test_tst_02_samtidig_saksopprettelse…` er flaky av
  konstruksjon, omtrent én rød gate per tjue suitekjøringer. Kjenn den igjen før
  du feilsøker noe annet.

## 6. Hva som krever et menneske

- **`supabase migration repair`** — uendret, krever legitimasjon.
- **DB-05 / `viewer`** — besluttet, ikke bygget. Se punkt 3.
- **Oppbevaringsregelen for notater.** Sletting er nå *mulig*. Hvilken regel som
  skal gjelde — oppbevaringstid, hvem som kan be om sletting, hva som skjer ved
  legal hold — er ikke besluttet noe sted.
- **KR-15** — gjøre reproduksjonen deterministisk, eller slippe strengheten.

## 7. Hva som ikke skal gjøres om igjen

Alt fra forrige handoffs punkt 6 gjelder. I tillegg:

- **Ikke flytt journalvakten tilbake til ruta.** `krev_journalhendelser` ligger i
  lageret fordi det finnes to innsendingsruter. Se felle 1.
- **Ikke kast en naken `ValueError` fra et Supabase-lager.** Se felle 2.
- **Ikke gjeninnfør `catenda:<subject>`** eller noen annen andre verdiform i
  `actorid`. Journalen kan ikke rettes.
- **Ikke rediger de to nye migrasjonene.** De er anvendt.
- **Ikke gjør `notat` append-only** når MS-02 gjennomføres.

## 8. Hvor jeg ville begynt

**RY-01**, som forrige handoff også pekte på. Den er uendret, den har
arkitekturvekt, og den lukker KR-13. Les avsnittet om den manglende indeksen på
`sak_metadata.catenda_topic_id` først — den finnes fortsatt ikke.

**DB-05**, hvis du heller vil lukke noe som er besluttet og avgrenset.
`app_project_memberships` må bære `viewer` før `project_memberships` kan
fjernes.

**Den nye åpne flaten** er den samme som forrige handoff navnga, og den er ikke
mindre nå: **ingen av RY-funnene har en reproduksjonstest**, og funksjoner og
triggere inngår ikke i katalogsnittene — at de finnes er kontrollert ved navn,
ikke ved å sammenlikne kroppene. MG-02-runden viste hva det koster: en
funksjonskropp ingen hadde lest, bar en beslutning et helt dokument sa gjensto.
