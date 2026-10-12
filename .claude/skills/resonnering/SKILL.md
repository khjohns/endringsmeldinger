---
name: resonnering
description: Episodene bak resonneringsreglene i AGENTS.md, med funnene der reglene kom fra og hvordan de ble oppdaget. Brukes når en påstand om nåbarhet, kjøretid eller en fallback skal prøves, eller når alle tilfellene av en feil skal finnes.
---

# Episodene bak resonneringsreglene

Reglene står i «Resonneringsregler» i `AGENTS.md`. Her står episodene som ga dem,
under overskriften til regelen de viser.

## «Og les hele stedet, ikke et utsnitt»

To feilklassifiseringer kom av nettopp dette: et `grep`-vindu som stoppet én linje før `@require_project_access()`, og en baseklasse lest uten overstyringen i underklassen. Begge ga en selvsikker, gal påstand om nåbarhet, og begge ble fanget av testsuiten — ikke av lesingen.

## «Et skjermbilde som finnes, beviser ikke at flyten virker»

DM-05 ble funnet ved å følge kallet skjemaet for ny sak faktisk gjør, gjennom tilgangsdekoratøren. Skjemaet og ruta lest hver for seg viste ingenting.

## «Og ett av lagene er databasen»

Tabellen `app_identities` leses og skrives **ikke av noen Python-kode**, og er likevel bærende: den leses og skrives ved hver innlogging, fra en databasefunksjon. En runde konkluderte med at den var ubrukt.

`project_memberships` fylles av en trigger, mens koden som ser ut til å skrive den, treffer en unik-skranke og logger en advarsel hver gang.

## «Og spør hvem *andre* som kaller funksjonen»

MG-02 slo fast at det krevdes en produktbeslutning for å la en webhook opprette brukerrader — fordi runden fant at innloggingen kaller `koe_resolve_identity`, men ikke at `koe_reconcile_memberships` kaller den for hvert prosjektmedlem ved hver synkronisering. Systemet gjorde det allerede: fjorten brukere, fjorten identiteter, én sesjon.

## «Har du funnet ett tilfelle, har du ikke funnet alle»

Oslobygg-fallbackene gikk tre → fem → åtte → fjorten, hver gang fordi neste gjennomgang lette etter den formen forrige gjennomgang hadde funnet.
