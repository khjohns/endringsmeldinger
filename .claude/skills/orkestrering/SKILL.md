---
name: orkestrering
description: Når én økt fordeler issues på flere skyøkter og følger PR-ene deres fram til merge. Brukes når oppdragsgiver ber om å orkestrere, ta flere issues parallelt eller opprette økter som lager PR-er.
---

# Orkestrering av flere økter

Oppdragsgiver ser over PR-ene, svarer på spørsmål og godkjenner merge.
Orkestreringsøkta fordeler arbeidet, går gjennom resultatet og fører det inn
der det hører hjemme. Den skriver ikke koden selv.

## 1. Kartlegg før du fordeler

- Les hvert issue og avgrens det: hva det endrer, hvilke filer det rører, og
  hva det venter på (B-ID, annet issue, rekkefølgen i hovedplanen, særlig AF-06).
- Er rekkefølgen i hovedplanen til hinder, spør oppdragsgiver. Godkjenner hen et
  avvik, får hovedplanen en datert merknad i en egen liten PR.
- Del arbeidet i runder etter filoverlapp. Issues som rører samme filer, tas
  etter hverandre i én økt eller i senere runder. Parallelle PR-er i samme fil
  gir konflikter ved hver merge.
- Feil som stopper appen, går foran opprydding.

## 2. Oppdraget til hver økt

Én økt per issue, eller per del av et issue. Oppdraget skal inneholde:

- issuenummeret, og at økta skal lese issuet og `AGENTS.md` først;
- branchnavn (`claude/<kort-navn>-<issue>`);
- hvilke filer de parallelle øktene arbeider i, og at de ikke skal røres;
- avgjørelser oppdragsgiver allerede har tatt, ordrett;
- at ingen følger økta: den stiller ikke spørsmål, velger det konservative
  alternativet og fører valget under «Åpne spørsmål» i PR-beskrivelsen;
- at funn utenfor oppdraget blir egne issues (regelen i `AGENTS.md`);
- hvilke sjekker som skal kjøres før push, og nettleserkontroll der issuet
  krever det;
- PR mot `main` med `Closes #n`, eller «Del av #n» når bare en del leveres,
  og at økta ikke merger;
- at økta abonnerer på PR-en og driver den til grønn CI.

`create_session` lar deg velge modell, ikke innsatsnivå. Vil oppdragsgiver ha
et annet nivå, må det settes i økta i appen.

## 3. Gjennomgang når øktene er ferdige

Øktene melder ikke fra selv. Sett opp en sjekk med `send_later`, og gjør dette
for hver PR:

1. Les PR-beskrivelsen og de siste meldingene fra økta (`list_events` med
   `kinds: ["assistant"]`).
2. Funn som ikke er meldt som issue, kontrolleres og meldes. Finnes det et
   issue for samme rotårsak, legg funnet som kommentar der. Et funn som økta
   har tilskrevet testmiljøet, sjekkes før det avskrives.
3. Samle de åpne spørsmålene fra alle PR-ene og still dem til oppdragsgiver i
   ett kall med spørsmålsverktøyet. Gi alternativer og en anbefaling.
4. Før svarene inn som kommentar i PR-en eller issuet de gjelder. Ny oppfølging
   blir et nytt issue.
5. Kontroller CI på siste commit.

## 4. Merge

Merge bare når oppdragsgiver har godkjent det og CI er grønn på siste commit.
Bruk `expectedHeadSha`, slik at en push som kom etter gjennomgangen, stopper
mergen. Avvises mergen av regelsettet, sjekk om grenen må oppdateres mot
`main`, oppdater den og vent på CI.

## 5. Avslutning

Si til oppdragsgiver hva som er merget, hvilke issues som er lukket, hvilke nye
issues som er opprettet, og hva som gjenstår. Arbeidsstatus står i issuene, ikke
i hovedplanen eller `docs/README.md`.
