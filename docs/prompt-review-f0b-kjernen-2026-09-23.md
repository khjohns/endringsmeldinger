# Oppdrag: uavhengig review av kjernen i datalaget (F0b, punkt 1)

**Dato:** 2026-09-23. **Utgangspunkt:** grenen og PR-en fra
[oppdraget for kjernen](prompt-f0b-kjernen-2026-09-23.md). Kontroller HEAD og
Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke funnstatus eller
beslutninger.

**Forrige ledd:** oppdraget for kjernen og gjennomføringsnotatet det leverte
(`docs/gjennomforing-f0b-kjernen-<dato>.md`). Beslutningen står i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md), 3.1, og
oppsettet i [handoffen 23.09](handoff-2026-09-23-datalag-postgresql.md),
avsnitt 7.

**Hvem:** en annen agent enn den som skrev kjernen. Kjernen er det alle
garantiene i F0b og F1 hviler på. En feil her går igjen i hvert repositorium.

## 1. Mål

Svar på tre spørsmål:

1. **Holder kjernen kontrakten** i avsnitt 3 i oppdraget for kjernen, og
   invariant 3 i hovedplanens 2.3?
2. **Beviser testene det de sier?** Blir hver test rød når regelen den er
   oppkalt etter, fjernes?
3. **Kan trådene i F0b punkt 2 bygge på den** uten å måtte endre kjernen,
   `core/container.py` eller fixturene?

Konklusjonen er én av tre: kjernen kan bygges videre på; den kan det med
navngitte endringer; eller den kan det ikke. Begrunn konklusjonen.

## 2. Les først

- `AGENTS.md` i sin helhet, særlig resonneringsreglene.
- Oppdraget for kjernen og gjennomføringsnotatet i sin helhet.
- Hele diffen i PR-en. Les hele funksjoner og hele fixturer, ikke utsnitt.
- Handoffen 23.09, avsnitt 5 (fellene).
- [Design v2 for B-02](design-b02-tilgangsmekanisme-v2-2026-09-23.md), avsnitt 4
  og 7. Kjernen skal passe kontekstkontrakten F1 skal bygge på.

Les ikke auditkjeden.

## 3. Kjør selv

Bygg en kastbar PostgreSQL 17 med `scripts/testbase/bygg_testbase.sh`, og kjør
databasetestene og hele backend-suiten. Skriv opp versjonene. Kjør deretter
mutasjoner: fjern eller svekk én regel om gangen i kjernen, og kontroller at
minst én test blir rød. En regel ingen mutasjon dekker, er ikke bevist.
Kandidater:

- `SET LOCAL` byttet til `SET`, og `set_config(..., true)` til `false`;
- transaksjonen fjernet, slik at forbindelsen kjører i autocommit;
- tilbakestillingen ved retur til poolen fjernet;
- `40001` klassifisert som permanent, og versjonskonflikten som forbigående;
- en tapt forbindelse under `COMMIT` prøvd på nytt;
- en standardverdi for `DATABASE_URL`.

Legg mutasjonene ved reviewet, med en oppskrift for å kjøre dem.

## 4. Vinkler som skal prøves

**Kontekstlekkasje.** Kan kontekst fra én forespørsel nå neste på samme
forbindelse? Prøv commit, rollback, unntak midt i, en generator eller
kontekstbehandler som ikke lukkes, en forbindelse som brytes, og to tråder mot
samme pool. Hva ser neste transaksjon: innloggingsrollen og tom kontekst, eller
noe annet? Er tom kontekst `''` eller `NULL`, og tolker kjernen dem likt?

**`SET LOCAL` utenfor transaksjon.** Finnes det en vei gjennom API-et der
kontekst settes med autocommit på, slik at den ikke virker og spørringen kjører
som innloggingsrollen? Det er fail-open, og det er det alvorligste som kan finnes
her.

**Retry og ukjent utfall.** Prøves noe på nytt som ikke tåler det? Særlig:

- en setning inne i en avbrutt transaksjon;
- en skriving etter tapt forbindelse under `COMMIT`;
- en versjonskonflikt;
- dagens `@with_retry()` rundt metoder som nå åpner sin egen transaksjon, slik at
  retry blir nestet.

**Feilklassifisering.** Blir en avvisning som aldri kan lykkes, en
`PermanentError` (`AGENTS.md`)? Arver `ConcurrencyError` og
`JournalfoeringAvvist` fortsatt riktig? Hva blir et ukjent unntak, og er det
begrunnet? Lekker feilmeldinger `DATABASE_URL`, passord eller SQL med verdier?

**Pool og tidsgrenser.** Hva skjer når poolen er tom, når basen ikke svarer og
når en transaksjon henger? Holder `statement_timeout` og
`idle_in_transaction_session_timeout` fra v2 avsnitt 7, eller overstyrer kjernen
dem? PgBouncer i transaksjonsmodus og forberedte setninger: er det prøvd, eller
merket som ikke prøvd?

**Miljøvalg.** Er det en stille reserve når `DATABASE_URL` mangler? En
standardverdi i Python, i konfigurasjonen eller i testfixturen? Søk etter alle
formene i resonneringsreglene i `AGENTS.md`, og skriv hvilke du søkte etter.

**Fixturene.** Kan den skrivbare fixturen treffe en annen base enn testbasen?
Rydder den etter seg når en test feiler? Kan den lesende og den skrivbare brukes
i samme test uten at den ene ser den andres uavsluttede data?

**Grensesnittet for fase 2.** Må en tråd som konverterer ett repositorium, endre
`core/container.py`, fixturene eller kjernen? Hvor oppstår konflikter mellom to
slike tråder?

**Invariantene.** Bryter noe `AGENTS.md` eller 2.3? Særlig at ingen verdi kommer
fra klienten, og at det ikke finnes noe defaultprosjekt.

## 5. Føringer

- Ingen endring av kjernen. Du leverer funn, mutasjoner og forsøk, ikke rettinger.
- Ingen skriving mot noen delt base. Alt kjøres lokalt.
- Skill mellom «kjørt og observert» og «lest ut av koden». En påstand om at noe
  «lekker», «omgår» eller «prøves på nytt», skal være kjørt, eller merket som ikke
  kjørt.
- Blir en påstand i gjennomføringsnotatet feil, skriv en datert merknad inn i
  det.

## 6. Lever

- `docs/review-f0b-kjernen-<dato>.md` etter repoets form: dato og commit, lenker
  hit og til notatet, funntabell med ID (`RK-01` …), alvorlighet og belegg, én
  seksjon per funn med fil og symbol, konklusjonen fra avsnitt 1, og
  **«Verifikasjon og grenser»** til slutt.
- Mutasjonene med oppskrift.
- En datert merknad under F0b i hovedplanen om at reviewet finnes og hva det
  konkluderte.
- En rad i `docs/README.md`, en gren og en PR.
