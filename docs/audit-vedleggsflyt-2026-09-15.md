# Audit: vedleggs- og dokumentflyt

Dato: 2026-09-15. Utgangspunkt: `383eed3`.
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
