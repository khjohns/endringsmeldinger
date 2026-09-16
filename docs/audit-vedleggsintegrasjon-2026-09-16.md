# Vedleggsintegrasjon: audit og retting

Dato: 2026-09-16. Oppfølging av [vedleggsflyten](audit-vedleggsflyt-2026-09-15.md),
[handoff](handoff-2026-09-15.md), [backendflyten](audit-backend-hendelsesflyt-2026-09-15.md),
[teamutkast](audit-utkast-serverlagring-2026-09-15.md) og
[PDF/Catenda](audit-pdf-catenda-2026-09-14.md).

Brukeravklaring: **Vedlegg er valgfrie**, også ved opprettelse og ved innsending
av krav og svar. Ingen filvalg skal utløse et krav om å laste opp noe.

## Bekreftede funn

| Funn | Rettelse |
| --- | --- |
| Mellomlagrede filer kunne listes og lastes ned av motparten. | Avsenders Catenda-team lagres på filen. Private filer kan bare leses og refereres av samme team. Manglende eller tvetydig team avviser opplasting. Eldre private filer uten team skjules. |
| Skjemaene sendte aldri `vedlegg_ids`. | Eksplisitt valg i de seks TE/BH-skjemaene; valget lagres med sporets utkast og sendes med hendelsen eller ferdigstilt vurdering. Opplasting velger den nye filen i det aktuelle skjemaet. Øvrige filer inkluderes ikke automatisk. |
| BH-responsmodellene droppet referansene. | Alle tre responsmodeller bevarer og validerer valgfrie ID-er. Godkjenningsløpet validerer tilgang før ferdigstilling og fryser referanser og filnavn. |
| Ny sak hadde ingen filflyt. | Valg før sending, opprettelse av sak, opplasting, så grunnlagshendelse med referanser. Saks-ID og hver opplastingskvittering bevares ved feil. Etter omlasting må filer som ikke var lastet opp velges på nytt eller fjernes eksplisitt. |
| Leveringsfeil så ut som usendte filer og hadde ingen brukerhandling for retry. | Egen `pending`-status og «Prøv levering til Catenda igjen». Retry bruker bare referanser i lagrede hendelser og oppretter ingen nye hendelser. |
| BH leverte inne i en SQLite-skrivetransaksjon mot samme database. | Levering skjer etter at godkjenningstransaksjonen er avsluttet. Gjentatt publisering kan også gjenta levering, uten ny publisering. |
| Opplastingen opprettet ingen dokumentreferanse på Catenda-saken. | Levering krever både opplasting og kobling til topic. Opplastingskvitteringen lagres før koblingen, slik at en koblingsfeil ikke krever ny filopplasting. |
| Ferdigstilte BH-vedlegg kunne slettes før publisering. | Sletting kontrollerer ferdigstilte vurderinger og frosne pakker, i tillegg til offentlige hendelser. Kontroll mot godkjenning gjentas under SQLite-skrivelås. |

## Flyt og brukerflate

«Filer»-fanen kan fortsatt mellomlagre filer. Skjemaets «Vedlegg (valgfritt)»
bestemmer hvilke som faktisk sendes. Valget er per spor og revisjon. Det er ikke
en automatisk innsending av alt som ligger på saken. Filvalg og sletting låser
sendeknappen mens operasjonen pågår; sending låser vedleggsvalget.

TE-brevkontrollen viser valgte filnavn. BH-vurderingen fryser filnavn fra registeret;
brev/PDF gjengir navnene, og godkjenningspanelet kan laste ned de konkrete filene.
De stabile ID-ene beholdes i hendelsen gjennom hele leveringen.

`staged` er privat og usendt. `pending` er allerede sendt i en lagret hendelse,
men mangler full Catenda-levering; filen kan da leses av partene på saken.
`delivered` betyr at opplasting og topic-kobling er bekreftet. Lokale bytes slettes
ved bekreftet opplasting, også hvis topic-koblingen må gjentas.

## Verifikasjon og grenser

Regresjonstester dekker andre team (også på samme kontraktsside), tvetydig team,
eldre filer uten team, uvalgte filer, UUID-normalisering, BH-modeller,
ferdigstilling/godkjenning/publisering med ekte SQLite-register, slettevern,
leveringsfeil, overlappende leveringsforsøk og retry etter feilet topic-kobling.
Frontendtester bruker de faktiske skjemaene med og uten vedlegg, samt ny sak med
opplastings- og innsendingsfeil. Nettverkstjenestene er erstattet med testdobler.

Kjørt og bestått:

- `npm test`: 565 tester i 47 filer.
- `npm run check:error`: 0 feil; 9 eksisterende advarsler.
- `cd backend && venv/bin/python -m pytest -q tests/test_routes tests/test_models tests/test_services tests/test_approval`: 602 tester.
- Ruff-kontroll av de endrede vedleggs-/godkjenningsfilene og testene, samt `git diff --check`.

Ingen live Catenda-kall er utført i denne rettingen. Eksisterende dokumentklient
og konfigurasjon gjenbrukes. Global prosjekt-/bibliotekruting er fortsatt eget
arbeid i [Catenda-dataflyten](catenda-dataflyt.md). Egen vedleggsvelger for EO og
forsering er ikke innført her; disse skjemaene krever fortsatt ingen vedlegg.

En SQLite-lease hindrer overlappende leveringsarbeidere i ti minutter. Dette gir
ikke en distribuert «exactly once»-garanti: et prosesskrasj etter at Catenda har
akseptert opplastingen, men før lokal kvittering, kan fortsatt gi et duplikat ved
retry. Det samme gjelder tapt svar fra opprettelse av dokumentreferanse.
Retry er brukerutløst; det er ingen ny bakgrunnsarbeider i denne endringen.
