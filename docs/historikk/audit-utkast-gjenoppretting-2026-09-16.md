# Audit: gjenoppretting av usendt tekst og slettingskonflikter

Dato: 2026-09-16. Utgangspunkt: `c483699`.
Oppfølging av [samtidighet og Catenda-kall](audit-utkast-samtidighet-og-catenda-2026-09-15.md)
og [kravene til utkast og samarbeid](audit-utkast-samarbeid-2026-09-14.md).

## Resultat

Arbeid i et vanlig saksskjema kan nå gjenopprettes etter navigasjon eller omlasting
i samme fane, også før serverens lagringstimer har løpt ut. Serverutkastet er
fortsatt teamets felles arbeidsdokument. Den lokale kopien er en avgrenset
gjenopprettingsbuffer, ikke et nytt personlig hovedlager.

Slettet serverutkast vises som en konflikt med et eksplisitt valg om å lagre egen
tekst på nytt. Konflikt blokkerer autolagring også når serverens tekst er `null`.

## Reproduksjoner og rettinger

### GJ-01 — Tekst forsvant ved ny montering av skjemaet

Den tidligere klienten beholdt tekst i komponentens minne ved nettverksfeil.
Ved navigasjon/omlasting var teksten borte hvis PUT ennå ikke var bekreftet.
Testen skrev tekst, avsluttet skjemaet før 1,2-sekundersfristen og åpnet samme
utkast igjen. Den fikk tom tekst før rettingen.

**Retting:** en buffer i `sessionStorage` følger
`bruker + prosjekt + Catenda-team + sak + spor + revisjon`. Den oppdateres ved
skjemaendring, uavhengig av serverens debounce. Den inneholder teksten, forventet
serverversjon og innholdet den versjonen hadde. Bekreftet lagring rydder eller
oppdaterer bufferen uten å fjerne nyere redigering. Vellykket innsending tømmer den.

`sessionStorage` holder fanene atskilt og overlever navigasjon/omlasting i samme
fane. Lukkes fanen, er dette ikke en varig sikkerhetskopi. Tidligere lokale utkast
i `localStorage`, inkludert gamle eierløse nøkler, er ikke lest eller endret.

### GJ-02 — Gjenoppretting må ikke overskrive endret servertekst

Ved åpning hentes serverutkastet først. Lik serverversjon og likt grunnlag lar
egen usendte tekst gjenopprettes og gå videre gjennom vanlig lagring. Har
serveren endret seg, beholdes egen tekst i skjemaet og serverens tekst presenteres
som konflikt. Ingen PUT skjer før brukeren velger.

Det opprinnelige grunnlaget beholdes i bufferen mens konflikten er åpen. Dermed
kan ikke en andre omlasting gjøre konflikten om til automatisk overskriving.
En sen kvittering fra et avsluttet skjema får heller ikke tømme bufferen til et
nyere skjema. Testene dekker begge tilfeller.

### GJ-03 — En slettingskonflikt manglet både sperre og synlig valg

Backend returnerer 409 med `utkast=null` når en forventet versjon er slettet.
Klienten brukte selve konfliktobjektet som boolsk sperre, og panelet krevde samme
objekt. Resultatet var at videre redigering forsøkte lagring igjen, mens brukeren
ikke fikk noe valg for å løse konflikten.

Tre reproduksjoner feilet før retting: videre redigering sendte en ny PUT,
«behold» gjorde ingenting, og komponenten manglet et synlig konfliktpanel.

**Retting:** aktiv konflikt er en egen tilstand. Panelet forklarer slettingen og
tilbyr «Lagre min tekst på nytt». Dette bruker forventet versjon `null` og går
gjennom samme versjonskontroll som annen førstegangslagring. Hvis en annen har
opprettet et nytt utkast i mellomtiden, kan serveren avvise igjen.

Et ekstra tilfelle er rettet: velger brukeren å beholde tekst som allerede er
identisk med serverens, avsluttes konflikten uten en unødvendig PUT. Tidligere
ble status stående som konflikt selv om sperren var opphevet.

### GJ-04 — Lokal tekst krever ferskt bekreftet team og bruker

GET-responsen inneholder nå `team_id` og `user_id`, begge hentet fra den
autoriserte forespørselens serverkontekst. En tom servertekst er ikke grunnlag
for å gjette team. API-klienten avviser svar uten disse feltene.

Bufferen leses først etter vellykket henting og avgrenses med den bekreftede
team-ID-en. Manglende tilgang/nettverk gjenoppretter ingen buffer. Team byttes
ikke ut med kontraktssiden BH/TE. Bytte av lokal bruker stanser også videre
bufferbruk og ventende lagring fra det gamle skjemaet.

En test reproduserte en svakhet i første utgave av bufferen: fanen forventet
Alice, men serverens cookie-sesjon tilhørte Bob etter innlogging i en annen
fane. Samme team-ID var ikke nok til å skille dem, og Alices tekst ble vist.
Nå sammenlignes serverens bruker-ID med fanens forventede eier før tekst
gjenopprettes. Ved avvik stoppes utkastlagring og panelet ber om omlasting.

Dette er en kontroll ved utkaståpning, ikke en ny global mekanisme for å oppdage
alle sesjonsbytter i hele appen. Sesjons- og CSRF-kontroll gjelder fortsatt på
hver backendmutasjon. Ingen autorisasjonscache er innført.

### GJ-05 — Ulik JSON-feltrekkefølge ble regnet som endret innhold

Testen ga serveren og skjemaet samme felter og verdier i ulik rekkefølge. Et
uendret skjema sendte da PUT, fordi `JSON.stringify` bevarer objektets
feltrekkefølge. Det kunne også gi falsk konflikt ved sammenligning med bufferen.

Sammenligningsgrunnlaget sorterer nå objektnøkler rekursivt. Rekkefølgen i lister
beholdes. Verdier og serverens revisjonskontroll endres ikke.

### Prosjekt og levetid

Prosjekt-ID fanges når skjemaet opprettes og sendes eksplisitt ved GET, PUT og
DELETE. En forsinket lagring følger dermed ikke et annet globalt prosjekt etter
navigasjon. Avsluttede skjemaer starter ikke nye kølagringer og endrer ikke
bufferen ved sene kvitteringer.

## Avgrensninger og videre arbeid

- Bufferen gir ikke garanti for gjenoppretting etter lukket fane, slettet
  nettleserlagring eller maskinkrasj. Sperret/full nettleserlagring skal ikke
  knekke vanlig serverlagring; lokal lagring er da ikke tilgjengelig.
- Ved oppstart uten kontakt/tilgang leses ikke tidligere lokal tekst. Det er et
  bevisst krav om fersk autorisering, ikke en offline-modus.
- Eksplisitt `initial` fra godkjenningsflyten beholder sin eksisterende prioritet
  og går ikke gjennom den nye bufferen. Et slikt snapshot skal ikke tilfeldig
  erstattes av eldre lokal tekst. Samspillet må utformes særskilt før dette utvides.
- «Behold min tekst» / «Hent inn deres» forkaster fortsatt den andre versjonen
  etter et bevisst valg. Varig, teamavgrenset historikk over konfliktversjoner
  står igjen. Bufferen er ikke en slik historikk.
- Ingen CRDT, tilstedeværelse, database-migrering, Supabase-oppsett eller
  serverstyrt avslutning av arbeidsrevisjoner er implementert her.
- Testene bruker komponentmontering, reell nettleserlagrings-API i jsdom og
  mocket transport. Faktisk prosesskrasj i en nettleser er ikke testet.

## Verifikasjon

| Kontroll | Resultat |
| --- | --- |
| `cd backend && venv/bin/python -m pytest -q` | **1280 passerer**, 5 avhengighetsadvarsler |
| `npx vitest run` | **552 passerer**, 46 filer |
| `npm run check` | **0 feil, 10 eksisterende advarsler** |
| `npm run lint` | **Passerer** |
| `npm run build` | **Passerer** |
| Ruff på endrede Python-filer | **Passerer** |
| `git diff --check` | **Passerer** |

Frontendøkningen er 18 tester: 15 nye scenariosjekker i `formDraft.test.ts`,
to API-kontrakttester og én komponenttest av slettingskonflikten. Eksisterende
backendtest for tomt utkast kontrollerer nå også team og bruker i responsen.

Reproduksjonene for tapt tekst ved ny montering, slettingskonflikten, ulik
feltrekkefølge, byttet serversesjon og uavsluttet konfliktvalg ble kjørt røde
før respektive retting. Grensetestene inkluderer avvist tilgang, bruker/team,
flere omlastinger, sen kvittering, innsending og forsinket prosjektbundet PUT.
