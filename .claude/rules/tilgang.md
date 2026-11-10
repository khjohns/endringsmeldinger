---
paths:
  - "server/**"
  - "sprakprove/kjernelagring/**"
---

# Tilgang: mekanismene bak sikkerhetsinvariantene

Invariantene står i `AGENTS.md` og gjelder hver serverinngang. Her står hvordan
TS-serveren håndhever dem, og hva den mangler.

## TS-serveren

`server/autorisasjon.ts` kontrollerer sesjonen, prosjektet og kontraktsrollen, i
den rekkefølgen: prosjektgrensen,
også for sakene det vises til, avgjøres før kontraktsrollen, så en sak i et annet
prosjekt gir `FORBIDDEN` uten at Catenda spørres om teamet (#1106).

- **Registeret.** Hver inngang i TS-serveren står i `RUTER` i `server/app.ts`
  med prosjektrollen og kontraktsrollen den krever, eller en skriftlig
  begrunnelse for at den ikke krever kontraktsrolle. Ruteren kontrollerer
  tilgangen fra registeret før behandleren kalles, og en sti som ikke står der,
  gir 404. `server/tester/register.test.ts` prøver hver inngang over HTTP:
  uten sesjon, uten og med feil CSRF-token, uten prosjekt, i feil prosjekt,
  mot en sak i et annet prosjekt, uten kontraktsteam og med leserolle.
- **Lesingen av saker og brev** (DL-U15) har `kontraktsrolle: 'lesing'` i
  registeret: et team for TE eller BH, som `kreves`, eller leserolle
  (`krevLesing` i `server/autorisasjon.ts`). Uten bekreftet team gir den 403,
  og svarer ikke Catenda, 503. Det gjelder saken, sakslisten og brevet som PDF (#1054).
  Lesefilteret i basen (`koe_sikkerhet.medlem`) krever det samme: siden i konteksten,
  med et av prosjektets kontraktsteam på den siden, eller leserollen (#1056). Ellers
  slipper bare godkjenneren i en åpen pakke i saken gjennom (GFK-U9). Hver lesing
  får siden i konteksten med `lesekontekst` i `server/autorisasjon.ts`. Skrivingen og
  vedleggene krever siden uten leserollen (`koe_sikkerhet.kontraktsmedlem`).
- **Serverstemplede felt.** En kommando har ingen aktør, ID eller tidspunkt.
  Kroppen avvises med ukjente felt, og kjernens skjema avviser ukjente felt i
  kommandoen. Aktøren er `app_users.id` fra sesjonen.
- **Oppslagene i SQL Server.** Kjøretiden har ingen rett på koblingen,
  medlemskapet eller kontraktsteamene, og leser dem med `koe_api.prosjektkobling`,
  `koe_api.prosjektmedlemskap` og `koe_api.kontraktsteam`. De to siste gir bare
  rader for aktøren som spør. Om sakene det vises til er i prosjektet, og saken i
  kvitteringen for en kommando, leses uavhengig av siden med
  `koe_api.saker_i_prosjektet` og `koe_api.kvittert_sak`. De kjører som
  `koe_grenseoppslag`, en bruker uten innlogging som predikatene slipper gjennom for
  prosjektet og aktøren i konteksten når aktøren er et aktivt medlem (#1106). Alderen på
  medlemslisten leses bare i `server/autorisasjon.ts` (#638 punkt 2, `server/tester/arkitektur.test.ts`).
- **Prosjektgrensen** holdes også ved lesing og skriving av journalen. Lesingen
  i `server/lager.ts` og skrivingen i `server/kommandoer.ts` går hver i sin
  transaksjon med aktøren og prosjektet i konteksten, og med siden og teamet
  når de er avgjort. Filterpredikatet
  `koe_sikkerhet.sak_synlig` slipper bare gjennom saker og hendelser i prosjektet i
  konteksten, for medlemmene med siden eller leserollen (`medlem`) og for
  godkjenneren i en åpen pakke i saken (GFK-U9), så en sak utenfor finnes ikke, og blokkpredikatet
  `koe_sikkerhet.skriver` stopper en rad i et annet prosjekt.
  `koe_api.skriv_hendelse` kontrollerer og stempler prosjektet fra konteksten i
  tillegg.
- **Identiteten.** `koe_api.catenda_identitet` og `koe_api.synkroniser_medlemskap` kaller
  `koe.resolve_identity`. Entra-innloggingen (`koe_api.entra_identitet`) slår opp
  identiteten selv og oppretter aldri en bruker. `koe_api.synkroniser_hr` og
  prosedyrene i `koe_drift` skriver `koe.app_users` og `koe.app_identities` direkte.

## Det TS-serveren mangler

- **Interne notater.** Tabellen `koe.notat` og filteret `koe_sikkerhet.notat_synlig`
  finnes, men ingen inngang eller prosedyre leser, skriver eller sletter notater, og
  lesingen av saken fletter dem ikke inn. En ny sti skal lese og skrive under filteret.
- **Saker det vises til.** `sakerDetVisesTil` i `server/autorisasjon.ts` kontrollerer
  nøkler som ingen kommando i kjernen har i dag.
