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

Én kilde per opplysning. Genererte og kontrollerte visninger er lov, men en fri
gjengivelse er aldri regelgrunnlag (`AGENTS.md`, «Hvor hva står»).

- `docs/datamodell/` beskriver tabeller, hendelser, relasjoner og dataflyt, og
  `docs/domenetabell/` forventet atferd og bevis-saker. Rediger kilderegistrene,
  modellene eller JSON-filene og generer Markdown/Excel med
  `docs/verktoy/datamodell.py` og `docs/verktoy/domenetabell.py --skriv`; ikke
  rett eksportene for hånd. Kjør relevante vakttester. De kontrollerer struktur
  og samsvar, ikke at all prosa eller juridisk beskrivelse er riktig; les berørt
  tekst selv.
- Vedtatt forventet atferd og bevis-saker holdes atskilt fra beskrivelse av dagens
  kode. Oppdater den eksisterende domenetabellen når oppgaven har en; ikke lag
  en ordliste eller regelbeskrivelse ved siden av med samme innhold.
- Hovedplanen er autoritativ for de åpne beslutningene, rekkefølgen og
  funnstatusen. ADR-er og designnotater kan begrunne valg, men oppretter ikke et
  konkurrerende beslutningsregister. En flytting av autoriteten må være
  uttrykkelig, med lenker og markering av hva som er erstattet.
- **Vedtaksfila er autoritativ for vedtakene** (#1020, oppdragsgiver 20.10):
  et vedtak er det som står i
  [`docs/plans/vedtak.md`](../../docs/plans/vedtak.md) på `main`. Fila var
  avsnitt 3.1 i hovedplanen, og en henvisning til «3.1» gjelder den. Den lages av
  [vedtaksregisteret](../../docs/vedtaksregister/README.md) (#413). Registeret er
  kilden raden lages av, og beviset for et nytt vedtak: spørsmålet,
  alternativene og svaret ordrett. Det fører ingen vedtak som ikke står i
  vedtaksfila. Rett i registeret og kjør `docs/verktoy/vedtaksregister.py`,
  ikke i vedtaksfila.
- **Arkivet** ([`docs/plans/arkiv.md`](../../docs/plans/arkiv.md)) har de
  avsluttede funnene og leveransemerknadene som er flyttet ordrett fra
  hovedplanen (#1020). Det er autoritativt for statusen til funnene det har.
  Nye merknader føres i hovedplanen. Gjør merknadene planen tung å lese, flyttes
  de som bare fører det som er levert, til arkivet med dato, og ID-er og ankre
  bevares.
- Gjeldende arkitektur beskrives kort med ansvar, grenser og lenker til detaljer.
  Oppstart, migrering, gjenoppretting og drift beskrives som prøvbare oppskrifter.
  Gjenbruk eksisterende dokumenter; ikke opprett en ny systemoversikt per oppgave.
- PR-en bærer endringsbegrunnelse, alternativer, review og kjørte testresultater.
  Kopier ikke dette til indeks eller referansedokumenter; arbeidsstatus står i
  issuene (`AGENTS.md`, «Hvor hva står»). Historiske bevis i en audit beholder
  sin dato og commit.

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
  Angis alvorlighet, skal dokumentet si at appen ikke er i produksjon og ikke har
  reelle data, ellers leses alvorlighet som observert hendelse. Navnet begynner
  med typen: `audit-*`, `vurdering-*`, `review-*`.
- **Historikk:** bevar daterte undersøkelser som bevis på hva som ble undersøkt.
  Ved erstattet konklusjon: legg en datert merknad ved den gamle konklusjonen
  eller øverst med lenke til gjeldende kilde. Ikke omskriv historiske kjøringer
  som om de gjelder dagens kode. Vanlig framdrift føres bare i sitt autoritative
  hjem; alle gamle auditer skal ikke vedlikeholdes som dagens systembeskrivelse.
- `docs/README.md` er en veiviser til gjeldende referanser og historisk underlag.
  Nye indeksrader beskriver dokumentets formål, ikke testantall eller åpne funn.
  Rydd slike gjentakelser når raden berøres.
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
