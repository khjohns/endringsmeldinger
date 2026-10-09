---
paths:
  - "backend/models/**"
  - "backend/routes/**"
  - "backend/repositories/**"
  - "backend/services/**"
  - "backend/regler/**"
  - "src/lib/constants/**"
  - "src/lib/domain/**"
  - "src/lib/types/**"
---

# Python-domenet: overgangsregler (gjelder til #310)

Reglene gjelder Python-koden for KOE-, EO- og forseringssakene og speilet av
den i frontenden. De faller bort når TS tar over skrivingen (#310). Hva som
rettes i denne koden, står under «Domenekjernen» i `AGENTS.md`.

**Utvider du `SporStatus`, let opp alt som teller opp statuser.** Frontend
hjelper deg: `Record<SporStatus, …>`-kartene i `src/lib/constants/` er
uttømmende, så `npm run check:error` navngir hvert sted som mangler den nye
verdien. Backend gjør det ikke. Der er stedene mengder og sammenlikninger som
stilltiende faller gjennom — rollupen `overordnet_status`
(`backend/models/sak_state.py`) og regelsettene i
`backend/services/business_rules.py`. En status som mangler i rollupen gir
ingen feilmelding, den gir «UKJENT» på en sak som er oppgjort. Det skjedde da
`AVSLATT_AKSEPTERT` kom til.

**Nytt innhold i en hendelse hører hjemme i datamodellen.** Har hendelsen en
datamodell, lagrer `to_cloudevent` bare `data`. Et felt ved siden av `data`
forsvinner ved lagring, men projeksjonen kan lese det i minnet, så svaret og
cachen viser noe journalen ikke har. Har den ingen datamodell, som
`sak_opprettet`, lagres en `data` fra klienten slik den kom, fordi `SakEvent`
godtar ukjente felt (DM-06). `docs/datamodell/hendelser.md` lister
toppnivåfeltene som ikke lagres.
