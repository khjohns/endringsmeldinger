# Token-broker for Catenda

Brokeren lar skyøkta bruke Catenda-integrasjonen uten at Catendas klienthemmelighet
eller tokenet fra Catenda kommer inn i økta (#806). Den holder integrasjonens
klient-ID og hemmelighet og henter tokenet selv. Den videresender bare kall
som står i tillatelseslisten i `broker.ts`, avgrenset til ett Catenda-prosjekt og
ett topic board. Økta får en brokernøkkel, som kan byttes uten å røre Catenda.

Innloggingen med `authorization_code` går ikke gjennom brokeren (#715).

**Ansvarlig:** repoeieren (khjohns). Tillatelseslisten følger Catenda-kallene i
`docs/datamodell/dataflyt.toml`. Får integrasjonen et nytt kall, må det inn i
`TILLATT` og i `broker.test.ts`.

## Hemmelighetene

| Navn | Innhold |
| --- | --- |
| `BROKERNOKKEL` | Nøkkelen økta bruker. Lag den med `openssl rand -hex 32` |
| `CATENDA_CLIENT_ID`, `CATENDA_CLIENT_SECRET` | Integrasjonens nøkkel i Catenda |
| `CATENDA_PROSJEKT_ID` | Testprosjektets ID i `/v2/projects/…` |
| `CATENDA_TOPIC_BOARD_ID` | Testprosjektets topic board i `/opencde/bcf/3.0/projects/…` |

Settes fra egen maskin, aldri fra en skyøkt. Verdiene skrives ikke i issues,
PR-er eller chat.

## Utrulling

Kommandoene kjøres i `verktoy/catenda-broker/`:

```bash
npx wrangler@4.147.0 login
npx wrangler@4.147.0 deploy
npx wrangler@4.147.0 secret put BROKERNOKKEL
```

`secret put` gjentas for hver hemmelighet i tabellen. Etter utrullingen settes
dette i skymiljøet:

- `CATENDA_GRUNNADRESSE`: brokerens https-adresse
- `CATENDA_CLIENT_SECRET`: brokernøkkelen

Brokerens vert må også stå under *Allowed domains*. Den ekte hemmeligheten
fjernes fra miljøet og roteres i Catenda.

## Kontroll

`npx vitest run verktoy` prøver tokenkallet, nøkkelkontrollen,
tillatelseslisten og videresendingen mot en fetch-dobbel. Det testene ikke
prøver: at Catenda godtar de videresendte kallene, og at verten er tillatt
fra skyøkta. Det prøves fra skyøkta etter utrullingen. Bare statuskodene
skrives ut.
