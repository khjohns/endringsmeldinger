# Token-broker for Catenda

Brokeren lar skyøkta bruke Catenda-integrasjonen uten at Catendas klienthemmelighet
eller tokenet fra Catenda kommer inn i økta (#806). Den holder integrasjonens
klient-ID og hemmelighet og henter tokenet selv. Den videresender bare kall
som står i tillatelseslisten i `broker.ts`, avgrenset til ett Catenda-prosjekt og
ett topic board. Sletting er avgrenset til topics og dokumentreferanser på boardet,
koblinger mellom topics, og items som ligger rett under én mappe i ett bibliotek.
Før et item slettes, slår brokeren det opp i Catenda og sletter bare når `parentId`
er `CATENDA_MAPPE_ID`. Mappen selv og items i undermapper slettes ikke. Økta får en brokernøkkel, som kan byttes uten å røre Catenda.

Innloggingen med `authorization_code` går ikke gjennom brokeren (#715).

**Ansvarlig:** repoeieren (khjohns). Tillatelseslisten følger Catenda-kallene i
`docs/datamodell/dataflyt.toml`. Får integrasjonen et nytt kall, må det inn i
`TILLATT` og i `broker.test.ts`. Slettingen av topics, dokumentreferanser og items
er bare for live-testene, som rydder etter seg. Appen sletter ingen av dem, så de
står ikke i `dataflyt.toml`.

## Hemmelighetene

| Navn | Innhold |
| --- | --- |
| `BROKERNOKKEL` | Nøkkelen økta bruker. Lag den med `openssl rand -hex 32` |
| `CATENDA_CLIENT_ID`, `CATENDA_CLIENT_SECRET` | Integrasjonens nøkkel i Catenda |
| `CATENDA_PROSJEKT_ID` | Testprosjektets ID i `/v2/projects/…` |
| `CATENDA_TOPIC_BOARD_ID` | Testprosjektets topic board i `/opencde/bcf/3.0/projects/…` |
| `CATENDA_BIBLIOTEK_ID` | Biblioteket live-testene sletter items i, samme verdi som `CATENDA_LIBRARY_ID` i skymiljøet |
| `CATENDA_MAPPE_ID` | Mappen i biblioteket der live-testene sletter items, samme verdi som `CATENDA_FOLDER_ID` i skymiljøet |

Mangler `CATENDA_BIBLIOTEK_ID` eller `CATENDA_MAPPE_ID`, avvises sletting av items,
og ingenting annet endres.

Settes fra egen maskin, aldri fra en skyøkt. Verdiene skrives ikke i issues,
PR-er eller chat.

## Utrulling

Brokeren rulles ut med `rull-ut.sh`, fra egen maskin:

```bash
npx wrangler@4.147.0 login
verktoy/catenda-broker/rull-ut.sh
```

Skriptet ruller bare ut en commit som er på `origin/main`, fra et rent
arbeidstre. Det viser diffen i brokeren siden forrige utrulling fra samme
maskin, og ruller ut først når du skriver «ja». Commiten står på utrullingen i
Cloudflare (`--tag` og `--message`) og i
`~/.local/state/catenda-broker/sist-utrullet`.

Hemmelighetene settes i `verktoy/catenda-broker/` med
`npx wrangler@4.147.0 secret put <NAVN>`, én gang per hemmelighet i tabellen. Etter utrullingen settes
dette i skymiljøet:

- `CATENDA_GRUNNADRESSE`: brokerens https-adresse
- `CATENDA_CLIENT_SECRET`: brokernøkkelen

Brokerens vert må også stå under *Allowed domains*. Den ekte hemmeligheten
fjernes fra miljøet og roteres i Catenda.

## Vern mot endringer

Brokerens grenser står og faller med koden som er rullet ut, og med
Cloudflare-kontoen. Repoet ruller ikke ut noe av seg selv.

- **Brokervakten** (`.claude/hooks/brokervakt.mjs`) avviser i alle Claude-økter
  skriving i denne mappa, i `.claude/settings*.json` og i vakten selv. Den
  avviser også Bash-kommandoer som nevner brokeren, `wrangler` eller
  hookoppsettet. Skal en økt endre brokeren, start den med `BROKERVAKT_AV=1` i
  miljøet. Vakten leser miljøet til Claude, ikke til kommandoen, så en agent
  kan ikke låse den opp med `BROKERVAKT_AV=1 <kommando>`.
- Vakten er et vern mot uhell, ikke en sikkerhetsgrense. Den kjenner igjen
  navnene, så en kommando som setter sammen stien eller endrer filer via
  `git checkout`, slipper forbi. Et menneske eller en agent utenfor Claude
  Code stoppes ikke.
- **Sperren som virker, er utrullingen.** Ingen endring når Cloudflare før du
  har sett diffen i `rull-ut.sh` og skrevet «ja». Legg aldri en
  Cloudflare-nøkkel i skymiljøet.

## Kontroll

`npx vitest run verktoy` prøver tokenkallet, nøkkelkontrollen,
tillatelseslisten og videresendingen mot en fetch-dobbel. Det testene ikke
prøver: at Catenda godtar de videresendte kallene, og at verten er tillatt
fra skyøkta. Det prøves fra skyøkta etter utrullingen.

Brokerens egne avvisninger har en kropp, så de skilles fra Catendas 401 og 403:
`{"feil": "brokernoekkel"}` (401) betyr at brokernøkkelen mangler eller er feil, og
`{"feil": "broker_avviste"}` (403) at kallet ikke står i tillatelseslisten, eller at
itemet som skulle slettes, ikke ligger i testmappen. Gir oppslaget før en sletting noe
annet enn 200, får økta Catendas svar, og ingenting slettes.

En 502 fra brokeren har en kropp som sier hvilket steg som feilet:
`{"feil": "tokenkall", "status": 401}` betyr at Catenda avviste brokerens
tokenkall, oftest feil `CATENDA_CLIENT_ID` eller `CATENDA_CLIENT_SECRET` i
brokeren. Statusen er 0 når Catenda ikke svarte. `{"feil": "catenda_svarte_ikke"}`
gjelder selve kallet. Kroppen har aldri med hemmeligheter eller Catendas svar. Bare statuskodene
skrives ut.
