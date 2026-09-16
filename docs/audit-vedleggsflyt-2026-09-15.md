# Audit: vedleggs- og dokumentflyt

Dato: 2026-09-15. Utgangspunkt: `383eed3`.

> **Korrigering 2026-09-16:** Oppfølgingens konklusjon om ferdig flyt og private
> mellomlagrede vedlegg var for sterk. Frontend manglet innsendingsreferanser,
> BH-modellene droppet dem, og leserutene skjermet ikke usendte filer etter team.
> Se [ny audit og retting](audit-vedleggsintegrasjon-2026-09-16.md) for gjeldende status.
Forrige logger: [PDF og Catenda-levering](audit-pdf-catenda-2026-09-14.md) (som avgrenset
seg eksplisitt fra denne flaten), og [intern konfidensialitet og forseringsregler](audit-backend-hendelsesflyt-2026-09-15.md).

Forutsetning (brukeravklaring 2026-09-15): appen er ikke i produksjon, og databasen
inneholder ingen reelle data. Skjemainnstramminger har derfor ingen migreringskostnad nå.

## Omfang

Kontrollert: `vedlegg_ids` på hendelsesmodellene fra innsending til visning, brevenes
forhold til vedlegg, Catendas dokument-API slik klienten bruker det, og
vedleggsflatene i frontend.

Utenfor omfang: Catendas egen tilgangskontroll på dokumentbiblioteket, live opplasting,
Supabase/RLS, og den globale `project_id`/`library_id`/`folder_id`-rutingen som er avtalt
eget arbeid i [Catenda-dataflyten](catenda-dataflyt.md).

> **Oppfølging samme dag:** flyten er nå bygget — se
> [Vedleggsflyten er implementert](#vedleggsflyten-er-implementert) nederst.
> Kartleggingen under beskriver tilstanden auditen fant, og beholdes som referat.

## Hovedkonklusjon: flyten finnes ikke ende-til-ende

Dette er auditens viktigste funn, og det er ikke en feil — det er en tilstand som bør
være synlig før noen bygger videre. Kartlagt med kodebevis:

| Ledd | Status |
| --- | --- |
| Opplastingsendepunkt for brukerfiler | **Finnes ikke.** Ingen Flask-rute leser `request.files` eller multipart. Den eneste `upload_document`-bruken er den servergenererte PDF-en i `_upload_and_link_pdf`. |
| `vedlegg_ids` på hendelser | Finnes på `GrunnlagData`, `VederlagData`, `FristData` og `EOUtstedtData`. Klientlevert. |
| Oppslag fra ID til dokument | **Finnes ikke.** Ingen kode slår opp en `vedlegg_ids`-verdi mot Catenda. |
| Vedlegg i brev | **Ingen.** `LetterSnapshot` har `extra="forbid"` og intet vedleggsfelt; brevgeneratorene nevner ikke vedlegg. |
| Visning av `vedlegg_ids` | `ApprovalPanel.svelte` viser dem som rå tekst under «Vedlegg». Dette er en **ekte** datavei. |
| Vedlegg-/Filer-fanene i `RightSidebar` | Inerte. `ui.att` er alltid `[]` i den virkelige konteksten (`context.svelte.ts:38-41` initialiserer den, ingenting fyller den); bare mockup-butikken har innhold. |
| «Last opp nytt vedlegg» / «Nytt notat» | Knapper uten `onclick`. |
| `catenda_documents` i innsendingssvaret | Returneres av backend, men **ingen** frontendkode leser feltet. |

## Bekreftet funn og retting

### VED-01 — Middels: `vedlegg_ids` godtok vilkårlig tekst og vises til godkjenner — rettet

`vedlegg_ids` var `list[str]` uten noen validering — ikke i `api/validators.py`, ikke i
forretningsreglene, ikke på modellen. En probe viste at alt ble godtatt: fri prosatekst,
tom streng, bare mellomrom, HTML, `../../etc/passwd`, en 50 000 tegn lang streng og 5 000
oppføringer i én hendelse.

Verdiene lagres i hendelsesloggen og vises til BH-godkjenner under overskriften
«Vedlegg» i godkjenningspanelet, uten at noe slår dem opp. En innsender kunne dermed få
presentert fri tekst som ser ut som et dokumentnavn — for eksempel
«Godkjent av Prosjektleder 12.03.pdf» — i grensesnittet der motparten fatter en formell
beslutning. Det er et integritetsproblem i beslutningsgrunnlaget, ikke en injeksjon:
Svelte escaper tekstinterpolasjon, så HTML rendres som tekst.

Åtte reproduksjoner feilet før retting. `vedlegg_ids` er nå den delte typen `VedleggIds`
på alle fire modellene: hver referanse må parse som UUID, og én hendelse kan bære
maksimalt 50.

UUID er riktig form, ikke en vilkårlig innstramming: `upload_document` returnerer
kompakt hex, `_upload_and_link_pdf` formaterer den med bindestreker før BCF-kallet, og
`lib/auth/domain.catenda_id` parser dokument-/team-IDer med `UUID(...)`. Begge formene
godtas, og verdien lagres uendret — kun formen valideres. Innstrammingen stenger derfor
ikke for opplastingsflyten når den bygges; da erstattes formkontrollen av det som
egentlig trengs: at referansen faktisk peker på et dokument i sakens eget prosjekt.

To eksisterende tester brukte `"DOK-001"` som vedleggs-ID. Det er oppdiktede verdier som
ikke kunne oppstått fra Catenda; fixturene er rettet til ekte UUID-er.

## Kontroller som passerer / avgrensninger

| Kontroll | Bevis / avgrensning |
| --- | --- |
| Ingen XSS fra vedleggsnavn | Svelte escaper `{String(id)}` i tekstposisjon. Funnet gjelder innhold, ikke injeksjon. Ikke kontrollert: fremtidig rendering som `{@html}`. |
| Frosne brev kan ikke smugle vedlegg | `LetterSnapshot` har `extra="forbid"` og intet vedleggsfelt. Ukjente felter avvises ved parsing. |
| Den servergenererte PDF-en er uendret | VED-01 rører ikke `_resolve_pdf`, opplasting eller dokumentreferansen. PDF-01–04 fra forrige audit står. |
| `EOUtstedtData.vedlegg_ids` | Samme type og dermed samme grense. `EndringsordreService` setter selv `"vedlegg_ids": []`. |
| Ingen nedlastingsproxy for vedlegg | Bekrefter forrige audits observasjon: brev-API-et returnerer genererte bytes; det finnes ingen rute som henter et vilkårlig dokument på ID. |

## Gjenstående

- **Opplastingsflyten er ikke bygget.** Når den bygges må referansen kontrolleres mot
  sakens eget prosjekt, ikke bare på form. Det er den egentlige regelen; VED-01 er en
  formkontroll som holder feltet rent i mellomtiden.
- **To knapper lover noe appen ikke gjør.** «Last opp nytt vedlegg» og «Nytt notat» har
  ingen handler. I en app der vedlegg er bevis i en kontraktstvist, er en knapp som ser
  ut til å feste dokumentasjon uten å gjøre det verdt å fjerne eller deaktivere synlig
  inntil flyten finnes. Ikke rørt her: UX-arbeid er utsatt etter avtale.
- **`catenda_documents` returneres uten mottaker.** Backend bygger og returnerer listen
  ved hver innsending; ingen leser den. Enten skal frontend vise de leverte dokumentene,
  eller så bør feltet fjernes. Ikke avgjort her.
- **Catendas egen tilgangskontroll på dokumentbiblioteket er ikke vurdert.** Denne
  auditen sier ingenting om hvem som kan lese et opplastet dokument i Catenda.
- **Duplikate dokumenter ved retry** står fortsatt åpent fra forrige audit og er ikke
  berørt her.

## Verifikasjon

```sh
cd backend && python3 -m pytest -q
```

Resultat: **1211 passerer, 0 feiler.** De nye vedleggstestene: 11.
Ruff på `services/ routes/ lib/ tests/`: 18 feil, uendret fra baseline — alle
eksisterende. `models/events.py` har 10 eksisterende `UP042` på enum-deklarasjoner;
importsorteringen jeg selv brøt er rettet.

Ingen frontendendringer i denne runden. Ingen live Catenda-kall.

«OK» gjelder de konkrete kontrollene i tabellen over, ikke hele dokumenthåndteringen.


## Vedleggsflyten er implementert

Brukeravklaring 2026-09-15: Catenda har tilgangskontroll på biblioteket via team-ID,
begge parters team får tilgang, og frontend må kunne laste opp og ned. UX for dette er
tatt med i samme runde.

### Én autoritativ kopi, i Catenda

Dokumentene lever i Catendas bibliotek; appen holder ingen egen kopi. To kopier kan
divergere, og i en kontraktstvist må «hvilken fil ble faktisk sendt» ha ett svar.
Catenda er dessuten allerede flaten begge parter ser, og gir revisjonshistorikk vi
ellers måtte bygge selv. En eventuell blob-kopi er dermed et arkiveringsspørsmål —
uavhengig oppbevaring hvis prosjektets Catenda-tilgang opphører — og ikke et
lagringslag under denne flyten.

### Tilgangskontrollen er vår, ikke Catendas

Dette er det viktigste avviket fra premisset, og det er verifisert i koden:
`lib/catenda_factory.get_catenda_client` bygger klienten fra `catenda_access_token`
eller klient-credentials — **appens tjenestekonto**, ikke brukerens egen
Catenda-tilgang. Per-bruker-tokens finnes i `CatendaOAuth`, men brukes bare til
medlemskaps- og rolleoppslag, aldri til dokumentkall.

Bibliotekets team-rettigheter begrenser derfor ikke hva appen kan lese. Vår backend er
håndhevingspunktet, og `VedleggRegistry` binder hvert vedlegg til nøyaktig én sak i ett
prosjekt. Nedlasting autoriseres mot det registeret; en ukjent ID gir 404, ikke 403, så
svaret ikke røper om dokumentet finnes i et annet prosjekt.

Registeret dekker også vinduet mellom opplasting og innsending: et vedlegg kan vises og
lastes ned før hendelsen som refererer til det er lagret.

### Catendas nedlastingstoken brukes bevisst ikke

`POST .../items/{id}/token` utsteder en signert URL som gir tilgang «without requiring
additional authentication», gyldig i én time. Den ville vært en omgåelig lenke til et
dokument i en tvistesak, utstedt med tjenestekontoens myndighet. I stedet brukes
`GET` på item-endepunktet med `Content-Type: application/octet-stream`, som returnerer
selve filen (`getLibraryItem` i `document-api-openapi.yaml`), og backend strømmer den
videre etter egen autorisasjon.

### Hva som er bygget

| Del | Innhold |
| --- | --- |
| `CatendaClient.download_library_item` | Henter filinnhold. Filnavn fra `Content-Disposition` reduseres til siste ledd — et filnavn er et navn, ikke en sti. |
| `VedleggRegistry` | SQLite i det eksisterende `BH_APPROVAL_DB`, samme mønster som leveringskvitteringene. Nøkkel er (prosjekt, sak, vedlegg-ID). |
| `POST /api/cases/<sak>/vedlegg` | Opplasting. `secure_filename`, tom fil og 15 MB-grense avvises før Catenda kontaktes. Midlertidig fil ryddes i `finally`, også når opplastingen kaster (jf. PDF-03). |
| `GET /api/cases/<sak>/vedlegg` | Sakens vedlegg med navn, størrelse, opplaster og kontraktsside. |
| `GET /api/cases/<sak>/vedlegg/<id>` | Nedlasting med `nosniff` og `no-store`. Filnavnet er vårt registrerte, allerede sanerte navn. |
| `VedleggPanel.svelte` | Liste med størrelse, hvilken side som lastet opp og nedlastingsknapp; filvelger og slippsone; laste-, tom- og feiltilstander. Demo-modus beholder mockup-listen. |

Panelet sier eksplisitt at «Vedlegg deles med motparten i prosjektets dokumentbibliotek».
Det er ikke pynt: i en tvistesak må den som laster opp vite at handlingen er delende.

### Avgrensninger

- 15 MB per fil, under Flasks `MAX_CONTENT_LENGTH` på 16 MiB. Ingen chunking eller
  gjenopptakelse av avbrutte opplastinger.
- Ingen live Catenda-test er kjørt. Rutene er verifisert mot mocket tjenestelag;
  endepunktsvalget er lest ut av `document-api-openapi.yaml`.

### Verifikasjon

Backend: **1224 tester passerer** (13 nye vedleggstester, blant annet at et vedlegg fra
en annen sak gir 404 uten at Catenda kontaktes, at registeret skiller prosjekter, og at
den midlertidige filen ryddes både ved suksess og feil).
Frontend: **511 tester / 43 filer** (10 nye), 0 typefeil / 10 advarsler, grønn lint og
`npm run build`. Ruff uendret på 18 eksisterende feil; `app.py` har fortsatt sin ene
eksisterende `I001`.

## Oppfølging: referansekontroll, sletting og innholdskontroll

De tre gjenstående punktene fra implementeringen er tatt.

### Vedleggsreferanser kontrolleres mot saken

Dette er den egentlige regelen VED-01 bare tilnærmet. Formkontrollen (UUID, maks 50)
hindrer fri tekst, men en gyldig UUID kunne fortsatt peke på et dokument i et annet
prosjekt eller på ingenting. Reprodusert: en hendelse med et vedlegg fra en **annen
sak i samme prosjekt**, og en helt ukjent UUID, ble begge godtatt med HTTP 201.

`_krev_egne_vedlegg` i det felles parsepunktet (`_parse_authorized_event`, brukt av
både enkelt- og batchinnsending) krever nå at hver referanse er registrert på saken.
Sammenligningen normaliseres med `catenda_id`: Catenda returnerer kompakt hex ved
opplasting, mens feltet godtar begge UUID-former, og samme dokument skulle ikke bli
avvist avhengig av hvilken form klienten sendte.

### Sletting er bevisst snever

`DELETE /api/cases/<sak>/vedlegg/<id>` fjerner et vedlegg, men bare når:

- **ingen lagret hendelse viser til det** — et referert vedlegg er del av sakens
  formelle grunnlag og fjernes ikke herfra (HTTP 409), og
- **forespørselen kommer fra siden som lastet det opp** — motparten skal ikke kunne
  rydde i den andres dokumentasjon (HTTP 403).

Kan hendelsesstrømmen ikke leses, nektes sletting (503): å slette på usikkert grunnlag
er verre enn å nekte. Registreringen fjernes først etter at biblioteket faktisk er
ryddet, slik at en feil ikke etterlater et vedlegg som er usynlig i appen men finnes i
Catenda.

Sletting gjør ikke dokumentet usett. Biblioteket er delt, så motparten kan allerede ha
lest det. Det er en grense ved delt lagring, ikke ved denne implementasjonen.

### Innholdskontroll — og hva den ikke er

`lib/vedlegg_innhold.py` avviser innhold som er et kjørbart program uansett filnavn
(MZ, ELF, Mach-O, Java-klasse, shebang), og krever at innholdet stemmer med filtypen
når navnet lover et kjent format. Det dekker den realistiske vektoren mellom to parter
i en tvist: en fil som utgir seg for å være dokumentasjon.

**Dette er ikke virusskanning.** Ekte skanning krever en ekstern tjeneste
(ClamAV-daemon eller et skanne-API); ingen slik avhengighet finnes i repoet, og en
attrapp ville gitt falsk trygghet — nøyaktig den feiltypen denne auditserien har funnet
flere av. Reell innholdsskanning står fortsatt åpen.

Ukjente, ikke-kjørbare formater slippes bevisst gjennom. Byggfag har mange legitime
filtyper (IFC, DWG, fremdriftsformater), og en uttømmende hviteliste ville blokkert
reelle bevis. Testene dekker begge sider: forkledde kjørbare avvises, `.ifc` og `.dwg`
slipper gjennom.

### Verifikasjon

Backend: **1245 tester passerer** (21 nye i denne runden). Frontend: **513 tester /
43 filer**, 0 typefeil / 10 advarsler, grønn lint og build. Ruff uendret på 18
eksisterende feil.

## Oppfølging: opplastingen er utsatt til innsending

Brukerspørsmål 2026-09-15: skal vedlegget lastes opp umiddelbart, eller først når saken
er sendt — slik at det kan fjernes uten risiko for at det havner i Catenda?

Spørsmålet traff en reell svakhet i det som var bygget. Vedlegget ble lastet opp i det
brukeren valgte filen, altså til det **delte** biblioteket, før avsenderen hadde bestemt
seg for å sende noe. Sletting ryddet i Catenda, men gjorde ikke dokumentet usett. Det er
samme klasse som BE-01: materiale når motparten før avsenderen har ment å dele det.

### «Sendt» er hendelsens commit

Det finnes ingen «saken er sendt» som helhet — `SporStatus.SENDT` er per spor, og
levering til Catenda skjer ved hendelses-commit (`_post_to_catenda` rett etter `append`,
med leveringskvittering rundt). Den naturlige grensen er derfor at vedlegget lastes opp
i samme øyeblikk som hendelsen som viser til det blir lagret.

### Mellomlagring

Brukervalg: bytene mellomlagres i `BH_APPROVAL_DB`, samme base som godkjenninger,
leveringskvitteringer og vedleggsregisteret. De lagres atomisk med registerraden, så
ingen foreldreløse filer kan oppstå, og det er én ting å sikkerhetskopiere.
Persistensauditens åpne punkt om varig lagring og restore-test for den filen gjelder nå
også vedlegg.

`vedlegg_id` genereres lokalt og er stabil gjennom hele livsløpet, så en hendelse viser
til samme verdi før og etter levering. Catendas egen item-ID lagres ved siden av når den
finnes. Ved levering frigis det mellomlagrede innholdet — Catenda holder dokumentet, og
å beholde bytene ville vært den dobbeltlagringen vi bevisst unngår.

### Hva det gir

| Tilstand | Egenskap |
| --- | --- |
| `staged` | Har aldri forlatt oss. Kan lastes ned av egen side for kontroll, og **fjernes sporløst** — ingen Catenda-kall, ingenting å rydde. |
| `delivered` | Sendt sammen med en hendelse. Del av sakens formelle grunnlag; kan ikke fjernes. |

Feiler opplastingen etter at hendelsen er lagret, gjør det ikke innsendingen mislykket —
hendelsen er committet, og en integrasjonsfeil skal ikke invitere til ny innsending
(samme prinsipp som PDF-02). Vedlegget blir stående som `staged` så leveringen kan
gjentas. Det åpner et hull som er lukket eksplisitt: sletting kontrollerer også om en
lagret hendelse viser til vedlegget, slik at et referert men uleverte vedlegg ikke kan
fjernes under saken.

Panelets hjelpetekst er rettet tilsvarende. Den sa at vedlegg deles med motparten, noe
som var riktig for umiddelbar opplasting og nå ville vært misvisende: «Vedlegg sendes
først når du sender kravet. Fram til da ligger de her og er ikke synlige for motparten.»
Usendte vedlegg er dessuten merket «ikke sendt» i listen.

### Verifikasjon

Backend: **1246 tester passerer**, hvorav 30 i vedleggsrutene — blant annet at
opplasting ikke når Catenda, at et mellomlagret vedlegg kan lastes ned uten
Catenda-kall, at sletting av mellomlagret vedlegg ikke utløser noe Catenda-kall i det
hele tatt, at feilet levering beholder mellomlagringen, og at tempfilen ryddes når
opplastingen kaster. Frontend: **513 tester / 43 filer**, 0 typefeil / 10 advarsler,
grønn lint og build. Ruff uendret på 18 eksisterende feil.

### Etterkontroll: tre innsendingsveier, ikke én

Leveringen ble først koblet inn i `submit_event`. En gjennomgang av de andre
append-punktene viste at det ikke var nok — to veier bruker `append_batch` og hoppet
over leveringen helt:

| Vei | Følge før retting |
| --- | --- |
| `submit_batch` | Hendelsene lagres, vedlegget blir stående mellomlagret. Saken viser til et vedlegg som aldri når Catenda. |
| `ApprovalService.publish` | Samme, for BH-siden: brevet publiseres som «sendt», men vedlegget følger ikke med. |

Hjelperen tar nå en liste hendelser (`lever_vedlegg_for_hendelser`) og kalles fra alle
tre. Begge de nye veiene har test, inkludert at en feilet vedleggslevering ikke gjør
brevet usendt — hendelsene er allerede lagret.

Dette er verdt å merke seg som mønster: vedlegg, PDF-levering og kvitteringer henger
alle på «når ble dette sendt», og systemet har flere svar på det spørsmålet. En ny
innsendingsvei må kobles til alle tre.
