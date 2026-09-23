# Oppdrag: BR-01 og domenefeilene i spor D

**Dato:** 2026-09-23. **Utgangspunkt:** `main`. Kontroller HEAD og Git-status
selv. Dette er en arbeidsinstruks. Den endrer ikke funnstatus eller
beslutninger. Kan gå parallelt med F0b; unngå `core/container.py`,
`lib/db/` og `repositories/`.

**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
spor D i avsnitt 5, og radene i funnregisteret (4.2 og 4.6).

## Del 1 — BR-01: reproduser eller avvis, ikke rett

BR-01 er et foreløpig funn, lest og ikke kjørt: serveren ser ut til å godta
`beregnings_resultat` fra klienten i BHs svar på vederlag og frist uten å regne
det ut fra vurderingene i samme hendelse.

1. Skriv en test som sender et BH-svar der vurderingene etter reglene gir ett
   resultat, og `beregnings_resultat` sier et annet. Gå gjennom ruta, ikke bare
   tjenesten, slik at alle lag som kunne avvise, er med.
2. Utfallet er ett av to:
   - **Reprodusert:** testen blir en streng `xfail` med `raises=` og BR-01 i
     `reason`. Sett alvorlighet i hovedplanen.
   - **Avvist:** vis laget som hindrer det, og gjør testen til en ordinær test
     som holder det.
3. **Ikke rett funnet.** En retting krever et valg oppdragsgiver må ta: skal
   serveren avvise en hendelse der resultatet ikke stemmer, eller regne ut og
   lagre sitt eget? Beskriv begge, hva hver betyr for en part som sender, og
   hvor mye av reglene i `src/lib/domain/` backend da må ha.

## Del 2 — domenefeilene

Rett disse, én commit per funn: TFR-02, TFR-03, TFR-04, TFR-05, GFK-02 og
INT-07. De har strenge `xfail`-reproduksjoner. Rettingen gjør testen til XPASS,
og da skal den gjøres om til en ordinær test.

TFR-06, GFK-06 og OBS-03 er bare lest eller latente. Reproduser først. Rett
bare det som lar seg reprodusere.

## Føringer

- **Slå opp ID-en i testens `reason` og i auditen der funnet ble gjort**, ikke
  bare i testinventaret. Inventaret har hatt feil ID-er (`AGENTS.md`).
- **Ikke endre en assertion for å få en test grønn.** Er testen feil, skriv hvorfor
  og la oppdragsgiver avgjøre.
- **Utvider eller endrer du `SporStatus` eller `overordnet_status`**, følg
  regelen i `AGENTS.md` om å lete opp alt som teller statuser, også i backend.
- **NS 8407:** har du `docs/NS_8407.md` lokalt, bruk den, men den skal ikke
  committes. Er en regel uklar, skriv spørsmålet framfor å velge tolkning. En
  retting skal kunne begrunnes med bestemmelsen den følger.
- **GFK-02 er høy:** `exposure()` avgjør hvilken fullmakt en godkjenning krever.
  Test at en endret sluttdato gir riktig fullmaktsnivå, også når dagmulktssats
  mangler (B-06 er åpen; ikke avgjør den).
- Kjør hele backend-suiten og `ruff check backend/` før hver PR.

## Lever

- **PR 1, BR-01:** testen og funnet oppdatert i hovedplanen (4.6, eller
  flyttet til 4.2 med alvorlighet), med de to rettingsvalgene beskrevet for
  oppdragsgiver.
- **PR 2, spor D:** rettingene med regresjonstester og en datert merknad per
  funn i hovedplanen. Et kort gjennomføringsnotat
  (`docs/gjennomforing-spor-d-<dato>.md`) med «Verifikasjon og grenser», og
  med hvilke funn som ikke ble reprodusert.
- `/code-review` på hver PR før den meldes klar.
