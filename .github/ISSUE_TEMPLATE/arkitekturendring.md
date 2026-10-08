---
name: Arkitekturendring
about: Avgrens en endring med eierskap, bevis og utfasing.
title: ''
---

<!-- Suppler et eksisterende issue fremfor å opprette et nytt om samme arbeid.
Sett en eksisterende milepæl eller sporetikett etter AGENTS.md. -->

## Grunnlag og avgrensning

<!-- Lenk til vedtak/funn i hovedplanen uten å kopiere vurderingen.
Hva skal endres, og hva er utenfor? Avhengigheter: issues, PR-er og kontrollerte
commits. Uavklart tiltenkt atferd listes uttrykkelig. -->

## Eierskap og utfasing

<!-- Hvor eies regelen/kontrakten etterpå? Hvilke kallere og innganger berøres?
Hvilken GitHub-bruker eller entydig ansvarlig rolle har beslutningsansvar for
tiltenkt atferd og gjenværende risiko?
Vis til eksisterende vedtak der godkjenning allerede er gitt.
Hva slettes? Midlertidige rester: ansvarlig og observerbart fjerningskriterium,
med koblet oppfølgingsissue dersom de må bestå etter leveransen.
Ved begrepsendring: betydning, foretrukket navn, gamle navn og berørte kontrakter.
Gjenbruk oppgavens domenetabell fremfor å opprette en parallell ordliste. -->

## Akseptkriterier

<!-- Erstatt punktene med konkrete forløp og forventede resultater.
Kryss av først når beviset er kjørt. Dokumentoppgaver bruker relevante kriterier. -->

- [ ] Forventet atferd/avvisning er prøvd mot navngitt kilde, med berørte innganger.
- [ ] Kritiske tester oppdager representative feilinnføringer; overlevende mutasjoner er vurdert og ren kode er prøvd igjen.
- [ ] Endrede modulgrenser håndheves automatisk, med et prøvd forbudt importforsøk.
- [ ] Berørt lagring, historikk og kompatibilitet er prøvd, eller utenfor med begrunnelse.
- [ ] Erstattet kode er fjernet; nødvendige midlertidige rester har sporet utfasing.
- [ ] Berørte begreper og varige referanser/kilderegistre er oppdatert, eller PR-en alene er tilstrekkelig med begrunnelse.

## Bevis

<!-- Navngi tester og kontroller som skal kjøres. Ved levering: lenk til PR-ens
faktiske resultater, bygg og uavhengige review. Ikke kopier løpende testresultater
til flere steder. Et uoppfylt kriterium lukkes ikke ved å opprette en restanse. -->
