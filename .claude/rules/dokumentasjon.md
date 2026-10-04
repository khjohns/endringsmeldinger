---
paths:
  - "docs/**"
---

# Dokumentasjon

`docs/` er en kjede av auditer og planer som viser til hverandre.
`docs/README.md` er indeksen: hva som gjelder, hva som er historikk, og hvor man
begynner. Skriver du et nytt dokument, følg formen: dato og commit i åpningen,
lenker til forrige ledd, funntabell med ID og alvorlighet, én seksjon per funn
med fil og symbol, og **«Verifikasjon og grenser»** til slutt som navngir hva som
*ikke* er kontrollert.

- **Skill mellom «Kjørt og observert» og «Lest ut av koden».** Det er ikke samme
  påstand, og forskjellen er der feilklassifiseringene oppstår.
- **Lenker fra `docs/` til kode går via `../backend/`.** En lenke løses fra
  dokumentets egen mappe. `docs/verktoy/lenkekontroll.py` sjekker også ankre.
- **Opphever du et tidligere utsagn, skriv en datert merknad** («Merknad 2026-09-19
  til RV-07») — også inn i det gamle dokumentet, ellers står de to side om side uten
  at leseren vet hvilket som gjelder.

**En funn-ID i et avledet dokument er en påstand.** Et testinventar, en rapport
eller en konsolidering kan føre riktig test under feil ID. Slå ID-en opp i testens
`reason` eller modulheader og i funntabellen i auditen der funnet ble gjort, før
du bruker den. Da testinventaret 22.09 ble kontrollert rad for rad, var 14 av 42
ID-er feil. Reviewet før hadde funnet seks.
