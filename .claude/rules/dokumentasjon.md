---
paths:
  - "docs/**"
---

# Dokumentasjon

**Vanlig implementering dokumenteres i PR-en.** Opprett et eget dokument bare når
informasjonen skal brukes etter at PR-en er glemt: gjeldende systemgrenser,
varige beslutningsbegrunnelser, domenereferanse eller en prøvbar driftsoppskrift.
Et uttrykkelig bestilt audit- eller designgrunnlag er også en egen leveranse.
Oppdater en eksisterende referanse fremfor å lage en ny datert versjon av samme
forklaring. Ingen gjennomføringsrapport eller handoff kreves for hver PR.

## Ett hjem per opplysning

- `docs/datamodell/` beskriver tabeller, hendelser, relasjoner og dataflyt.
  Rediger kilderegistrene/modellene og generer Markdown/Excel; ikke rett eksportene
  for hånd. Kjør relevante vakttester. De kontrollerer struktur og samsvar, ikke
  at all prosa eller juridisk beskrivelse er riktig; les berørt tekst selv.
- Vedtatt forventet atferd og bevis-saker holdes atskilt fra beskrivelse av dagens
  kode. Oppdater den eksisterende domenetabellen når oppgaven har en; ikke lag
  en ordliste eller regelbeskrivelse ved siden av med samme innhold.
- Hovedplanen er fortsatt autoritativ for beslutninger, rekkefølge og funnstatus.
  ADR-er og designnotater kan begrunne valg, men oppretter ikke et konkurrerende
  beslutningsregister. En eventuell senere flytting av autoriteten må være
  uttrykkelig, med lenker og markering av hva som er erstattet.
- Gjeldende arkitektur beskrives kort med ansvar, grenser og lenker til detaljer.
  Oppstart, migrering, gjenoppretting og drift beskrives som prøvbare oppskrifter.
  Gjenbruk eksisterende dokumenter; ikke opprett en ny systemoversikt per oppgave.
- PR-en bærer endringsbegrunnelse, alternativer, review og kjørte testresultater.
  Issues bærer arbeidsstatus og restanser. Kopier ikke dette til indeks eller
  referansedokumenter. Historiske bevis i en audit beholder sin dato og commit.

## Form og vedlikehold

- **Referanse/oppskrift:** formål, nødvendig forklaring eller fremgangsmåte,
  forutsetninger og relevante begrensninger. Ingen funntabell, alvorlighet eller
  auditformat kreves. Oppdater berørt referanse i samme PR som atferden endres.
- **Audit/review/undersøkelse:** dato og kontrollert commit, kildegrunnlag og
  relevante lenker. Funn har ID, belegg merket etter
  [hovedplanen](../../docs/plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt)
  og fil/symbol; alvorlighet der det er relevant. Avslutt med «Verifikasjon og
  grenser». Skill «Kjørt og observert» fra
  «Lest ut av koden» og historiske resultater. Skriv hva som ikke er kontrollert.
- **Historikk:** bevar daterte undersøkelser som bevis på hva som ble undersøkt.
  Ved erstattet konklusjon: legg en datert merknad ved den gamle konklusjonen
  eller øverst med lenke til gjeldende kilde. Ikke omskriv historiske kjøringer
  som om de gjelder dagens kode. Vanlig framdrift føres bare i sitt autoritative
  hjem; alle gamle auditer skal ikke vedlikeholdes som dagens systembeskrivelse.
- `docs/README.md` er en veiviser til gjeldende referanser og historisk underlag.
  Nye indeksrader beskriver dokumentets formål, ikke testantall, åpne funn,
  «neste oppgave» eller arbeidsstatus. Rydd slike gjentakelser når raden berøres.
- Behold eksisterende plassering og lenker. Daterte undersøkelser kan ligge flatt
  i `docs/`; `plans/`, `adr/` og `datamodell/` har egne formål. Ingen bred flytting
  av historikken bare for å få en ryddigere mappe.
- Lenk til fil og symbol heller enn skiftende linjenummer. Løs lenker fra
  dokumentets mappe: fra `docs/` til kode er det `../backend/`, fra `docs/plans/`
  er det `../../backend/`. Kjør `python3 docs/verktoy/lenkekontroll.py` med berørte
  Markdown-filer som argumenter; kontroller også nye kodehenvisninger selv.

**En funn-ID i et avledet dokument er en påstand.** Slå ID-en opp i testens
`reason` eller modulheader og i kildens funntabell før den brukes. En referanse
til en audit er ikke i seg selv bevis på at funnet fortsatt er åpent.
