---
name: forbruk
description: Den ukentlige gjennomgangen av tokenforbruket i skyøktene i endringsmeldinger. Henter kostnad og kontekst for alle øktene i perioden, ser nærmere på den dyreste byggeøkta og fører funnene og høyst tre forslag i ett issue. Brukes av rutinen «Ukentlig tokenforbruk», eller når oppdragsgiver ber om en gjennomgang av forbruket.
---

# Gjennomgang av tokenforbruket

Rutinen «Ukentlig tokenforbruk» kjører denne skillen torsdag morgen
(oppdragsgiver 17.10). Den finner hva som drev kostnaden siste uke og foreslår
tiltak. Den endrer ingen regler, skills eller kode, og åpner ingen PR. Forslagene
er spørsmål til oppdragsgiver.

Kostnaden vokser med antall kall ganger kontekststørrelsen («Kontekst i
arbeidsøktene» i [orkestreringsskillen](../orkestrering/SKILL.md#kontekst-i-arbeidsøktene)).
Gjennomgangen ser derfor etter kontekst som vokser, ikke etter enkeltkall.

Gjennomgangen skal selv koste lite: om lag 3 USD og under 150 000 tokens. Rå-svar
fra verktøyene leses aldri inn i konteksten.

## 1. Oversikten

1. Perioden er de sju dagene før i dag: `--fra` er dagen for sju dager siden, og
   `--til` er i dag.
2. Kall `list_sessions` med `limit` 100. Svaret er for stort til å vises og
   lagres til fil, og verktøyet oppgir stien. Bla bakover med `after_id` satt til
   `last_id`. Rekkefølgen er ikke strengt etter opprettelse, så hent én side til
   etter den første siden der den eldste økta er eldre enn `--fra`. Høyst åtte
   sider.
3. Kjør skriptet på alle sidene:
   `python3 .claude/skills/forbruk/oversikt.py --fra <dato> --til <dato> <fil> ...`.
   Det skriver sum, dag, rolle, kontekst over grensene og de dyreste øktene.
   Rollen leses av tittelen, og en økt som har barneøkter, regnes som orkestrator.
4. Finn forrige ukes issue (tittel «forbruk uke …», etiketten `papercut`) og
   sammenlign. Sidene hentes med `gh api` som i miljø-skillen.

## 2. Én økt nærmere

Velg den dyreste byggeøkta, eller den dyreste reviewøkta når den kostet mer.
Velg orkestratoren bare når den skiller seg ut fra de andre orkestratorene. La en
subagent gjøre analysen, med denne bestillingen:

- `list_events` med `limit` 100 og `kinds` `["assistant", "user", "result", "system"]`,
  bakover med `before_id` satt til `first_id`, høyst 15 sider, hver side lagret til
  fil og lest med et skript;
- tokens per API-kall står i `usage` i assistant-hendelsene, med `agent_id` per
  subagent. Output-tokens leses av `modelUsage` i result-hendelsene, fordi tallet
  per hendelse er delt opp og blir for lavt. En komprimering har kind «other»;
- rapporten, under 400 ord:
  - andelen av `cache_read` per agent, med antall kall og største kontekst;
  - de største verktøysvarene, gruppert etter verktøy og kommando;
  - grunnkonteksten per agent;
  - hva analysen selv kostet.

## 3. Kontroller

- `bashOutputMaxChars` i `.claude/settings.json` er satt til 10 000. Kjør
  `python3 -c "print('x' * 15000)"`. Kommer svaret inline og ikke som fil med
  forhåndsvisning, virker ikke innstillingen fra prosjektoppsettet. Det er et funn.
- Se om grensene i «Kontekst i arbeidsøktene» holder: byggeøkter over 150 000
  tokens, orkestratorer over 300 000, og subagenter over 150 000 eller 80 kall i
  økta som ble sett nærmere på.

## 4. Issuet

Ett issue per uke, med etiketten `papercut`, og tittelen
«forbruk uke <ukenummer>: <største funn>». Finnes det ikke noe nytt siden forrige
uke, skrives tallene som en kommentar i forrige ukes issue i stedet.

Issuet inneholder:

- tallene fra skriptet: sum, per dag, per rolle, de fem dyreste og kontekst over
  grensene, med endringen fra forrige uke;
- hva som drev kostnaden i økta som ble sett nærmere på, med tall;
- utfallet av kontrollene i punkt 3;
- høyst tre forslag. Hvert forslag sier hva det endrer, hvilken mekanisme det
  bruker (skill, subagent, hook, innstilling, regel eller kortere instruks), hva
  det ventes å spare, og en anbefaling. Foretrekk forslag som fjerner, deler eller
  flytter tekst framfor nye regler: hver regel i `AGENTS.md` eller en skill som
  lastes i hver økt, gjør alle øktene litt dyrere;
- spørsmålene til oppdragsgiver.

Issues er offentlige (`AGENTS.md`, «Hvor hva står»). Skriv øktenes tittel og
ID, issue- og PR-nummer og tall. Skriv ikke innhold fra øktene: ikke meldinger,
sitater fra transkripsjonen, personnavn eller e-postadresser.

Sluttsvaret i økta er lenken til issuet og én linje om det største funnet.
