# Forprøven og gjennomgangen av fristoversikten (BF-45)

Funnene fra steg 6 i skillen `brukerforlop` og fra «Gjennomgang i runder», 13.11.2026, for
[BF-45](../../domenetabell/brukerforlop/BF-45.md) og prototypen
[fristoversikt.html](../../design/prototyper/fristoversikt.html). Funnene er lagt fram for oppdragsgiver
før de rettes. Appen er ikke i produksjon og har ingen reelle data; alvorligheten gjelder prototypen.

## Hva som er kjørt

- **Den mekaniske forprøven** (`prototype.mjs BF-45`) på `ee8cf63`: alle seks klikkstiene virker, alle
  tilstandene er nådd, axe uten brudd, 0 konsollfeil, ingen vannrett rulling på 390 px. 0 avvik.
- **Den kognitive gjennomgangen** (malen i `forprove.md`, en subagent på standardmodellen) på `55f48c8`, der
  form B av kortet fortsatt var med. Funnene om form B er tatt ut.
- **Runde 1, helheten**, i økta, på 1440 og 390 px. **Runde 2–3**, `/design-review` per komponent, og
  **runde 4**, språket, i hver sin subagent, på `ee8cf63`.

Merket på hvert funn sier hvor det kom fra: K (kognitiv), H (helheten), DR (designreview) og SP (språket).
Funn som flere runder fant, står én gang.

## Funnene som anbefales rettet

| # | Funn | Kilde | Alvorlighet | Retting |
| --- | --- | --- | --- | --- |
| R-1 | Den åpne stolpen for kravet fyller hele skalaen, så 20 og 25 dager ser like lange ut som 30 | DR-1 | Høy | Kravet får et mål med bredde etter dagene, med kant og uten fyll |
| R-2 | Hverdagene er talt mandag–fredag. [GFK-U24](../../plans/vedtak.md#gfk-u24) regner mandag–lørdag: 14 og 12 hverdager, 340 000 kr, over fullmakten i kjeden | K D-13 | Høy | Rett tallene og kjeden |
| R-3 | Frist 5 er ikke dagmulktbelagt. Etter [GFK-U20](../../plans/vedtak.md#gfk-u20) behandles dagene da som et krav som ikke er tallfestet, som krever hele kjeden eller ubegrenset fullmakt ([GFK-U3](../../plans/vedtak.md#gfk-u3), [GFK-U4](../../plans/vedtak.md#gfk-u4)). Pakken lar Kari Nordmann sende alene | K D-13 | Høy | Kjeden ender hos en med ubegrenset fullmakt, og pakken sier at frist 5 ikke kan verdsettes |
| R-4 | Beløpene i pakken brytes over flere linjer på 390 px | DR-9 | Høy | Beløpene brytes ikke. Fristen står over utregningen på smal skjerm |
| R-5 | Linja under «Revider krav» sier ikke at fristene kan endres eller tas ut, som svar 4 A sier | K D-6 | Middels | Legg til «I det nye kravet kan du endre dagene eller ta ut en frist.» |
| R-6 | BF-45 viser til GR-U6, som er erstattet av [GR-U7](../../plans/vedtak.md#gr-u7) | K D-4 | Middels | Ta GR-U6 ut av D-4 og `kilder`. BF-44 har samme henvisning (eget issue) |
| R-7 | Linja om hindringen begynner med «Subsidiært» og leses som et eget lag. [OV-U42](../../plans/vedtak.md#ov-u42) sier at slike standpunkter står uten etikett | K U-3, DR-3 | Middels | «Hvis innsigelsen om varselet ikke fører frem, legger byggherren til grunn at fremdriften er hindret, og at hindringen skyldes forholdet.» |
| R-8 | Avslaget for frist 5 står under aksen og leses som om det gjelder hele fristen, og som om det motsier linja om hindringen | DR-3, K U-13 | Middels | Avslaget står under raden for videre subsidiært og begynner med laget |
| R-9 | «For alle fristene» og «Per frist» er mindre enn fristene under dem, og er ikke overskrifter | DR-2 | Middels | De blir `h3` og fristene `h4`, med vekt og blekk i stedet for størrelse |
| R-10 | På 390 px bryter raden for laget ujevnt, så dagene ikke står under hverandre | DR-4, H | Middels | Under 560 px står laget over dagene og datoen i alle radene |
| R-11 | Rekkefølgen er 7, 8, 5 i pakken og i brev 8 punkt 3, og 5, 7, 8 ellers | K, DR-10, SP-2 | Middels | 5, 7, 8 overalt, som i kravet |
| R-12 | Teksten i brev 7 og 8 avviker fra kjernens brevtekst etter #1903 (spesifiseringen, hindringen med hjemmelen, dagene og forbeholdet) | SP-2, SP-3 | Middels | Bruk kjernens tekst fra `kjerne/spor/frist/tekst.ts` og `kjerne/frosset/brevtekst.ts` |
| R-13 | «Avtalt» betyr både datoen i kontrakten og en forlengelse TE har godtatt ([KA-U77](../../plans/vedtak.md#ka-u77)) | K | Middels | «Gjeldende frist 26. august 2027: 16. august i kontrakten, forlenget 10 dager i sak E-009» og «som i kontrakten» |
| R-14 | I forespørselen er «Andre handlinger» skjult, også «Trekk kravet», som kjernen tilbyr når et varsel er sendt (`trekket` i `kjerne/kommandoer/forutsetninger.ts`) | DR-7 | Middels | Vis kortet med «Trekk kravet» |
| R-15 | Pakken sier ikke hvilket lag dagene i verdien kommer fra | DR-10 | Lav | En dempet linje over lista. Hvilket lag fullmakten regnes av, står i GFK-U19 og GFK-06 og prøves i byggingen (G-6) |
| R-16 | Ny dato står rett etter dagene uten noe som binder dem sammen, og skalaen har ingen enhet | DR-5, H | Lav | «20 dager · ny frist 15. september 2027», og «Dager» ved skalaen |
| R-17 | Endringene i utkastet står i én setning uten skilletegn | DR-11 | Lav | Én linje per frist, med kolon |
| R-18 | Kortet i forespørselen heter «Kravet», men det finnes ikke noe krav ennå | SP-10, DR-8 | Lav | «Kravet om fristforlengelse», med «Dagene er ikke angitt. Totalentreprenøren varslet i brev 4.» |
| R-19 | Datoen totalentreprenøren oppgir, står både i brev 2 og brev 4, men tråden viser til brev 2 | K U-8 | Lav | Ta setningen ut av brev 4, så brev 2 er kilden, som i BF-44 |
| R-20 | På 390 px står «Andre handlinger» før kortet med kravet og svaret | K | Lav | Kortet får sin plass i rekkefølgen på smal skjerm |
| R-21 | Kandidater til kildene: GFK-U3, GFK-U4, KA-U73 og KA-U22 | K | Lav | Før dem i `kilder` og i D-12 og D-13 |

## Et valg for oppdragsgiver

**V-1. Veiledningen under forespørselen** (SP-1, DR-6, K U-9). Prototypen sier: «Forespørselen kom 15 dager
før i dag. Svarer totalentreprenøren ikke uten ugrunnet opphold, tapes kravet på fristforlengelse (punkt
33.6.2 tredje ledd).» Språkrunden mener at den andre setningen sier at et krav er tapt, og at
[VS-U10](../../plans/vedtak.md#vs-u10) bare gir datoen, dagene og bestemmelsen. Men BF-20 D-4 sier at
virkningen vises som veiledning, og den godkjente `fristkrav-te.html` har samme setning.

- **A (anbefalt).** Behold setningen som i BF-20, og rett den første: «Byggherren ba om dagene 29. oktober
  2026, for 15 dager siden.»
- **B.** Bare datoen, dagene og bestemmelsen: «Byggherren ba om dagene 29. oktober 2026, for 15 dager siden
  (punkt 33.6.2).»

Anbefalingen: A følger forløpet oppdragsgiver har godkjent, og setningen er en betinget veiledning, ikke
en slutning om denne saken.

## Funnene som ikke anbefales rettet

| Funn | Kilde | Hvorfor |
| --- | --- | --- |
| «Prinsipalt 0 dager» står ikke som tall i brevet | SP-4 | Utregningen har dagene i hvert lag, 0 for preklusjonen (#1903), og BF-44 viser «0 kr» i samme lag |
| Ingenting ved «Godta svaret» sier at aksepten gjelder alle lagene og fristene | K U-6 | Virkningen står i brevkontrollen ([U-6 i BF-44](../../domenetabell/brukerforlop/BF-44.md#u-6), systemfila). Se etter det i brukerprøven |
| «Sender du utkastet til brev 9, avslår det tilbudet …», «Godkjennerne», «Verdien for fullmakten» | SP-5, SP-8, SP-9 | Felles med BF-44, der språkgjennomgangen lot dem stå |
| «Endret så langt» og «Endret» | SP-7 | Bevisst, som i BF-44: utkastet er ikke ferdig, pakken er låst |
| «trekkes» ved siden av «Trekk kravet» | K | Ordet er BF-20 U-10 og [KA-U75](../../plans/vedtak.md#ka-u75). R-5 sier hva et nytt krav kan gjøre |
| «fører frem» | K | Samme form som BF-44 og kjernen |
| «brev 7» er ulike brev i de to situasjonene | K | Situasjonene er to ulike saksforløp |
| «avslaget» i raden for forsering kan leses som avslaget for frist 5 | K | Ordlyden er [FO-U2](../../plans/vedtak.md#fo-u2). Se etter det i brukerprøven |
