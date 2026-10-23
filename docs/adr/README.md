# Beslutningslogg

Her dokumenteres arkitektur- og produktvalg som påvirker kontraktsbehandlingen.
Juridisk begrunnede valg får samme ADR-format, med særskilt skille mellom
kontraktens ordlyd, vår vurdering og appens faktiske oppførsel.

Opprett en ADR når et valg påvirker varsling, rettighetstap, svarplikt,
ansvarsfordeling eller hvordan partenes erklæringer lagres og presenteres.
Bruk neste ledige nummer. Ved endret beslutning opprettes en ny ADR som lenker
til og erstatter den tidligere; oppdater status og krysslenker i begge.
Status «Vedtatt» betyr vedtatt produktvalg, ikke ekstern juridisk godkjenning.

| ADR | Dato | Status | Beslutning |
| --- | --- | --- | --- |
| [001](001-varsling-og-kontraktsforhold.md) | 2026-09-07 | Vedtatt | Varsling er uavhengig av valgt kontraktsforhold |
| [002](002-saerskilt-krav-og-varsel-etter-34-1-2.md) | 2026-10-23 | Vedtatt | Varselet etter § 34.1.2 og kravet om særskilt justering etter § 34.1.3 annet ledd |

## Mal for produktvalg

- **Tittel, dato og status** (foreslått, vedtatt eller erstattet).
- **Problem:** Konkret situasjon og risiko ved alternativene.
- **Kontraktsgrunnlag:** Dokument, punkt og eventuelle prosjektavvik.
- **Vurdering:** Tolkningen eller usikkerheten som motiverer produktvalget.
- **Beslutning:** Hva appen gjør, inkludert veiledning, sperrer og standardvalg.
- **Konsekvenser og avgrensning:** Hva valget sikrer, og hva det ikke avgjør.
- **Implementering og kontroll:** Kode, tester og forhold som kan kreve ny vurdering.

## Mal for juridiske drøftelser

En vanskelig tolkning av kontrakten drøftes etter denne malen, når
oppdragsgiver ber om det (#1047). Drøftelsen begrunner vedtakene og fører dem
ikke: vedtaksteksten står i
[vedtaksregisteret](../vedtaksregister/README.md), og 3.1 i hovedplanen er
autoritativ. NS 8407-teksten siteres ikke (#424).

- **Tittel, dato og status** (foreslått, vedtatt eller erstattet).
- **Spørsmålet:** Det som skal avgjøres, i kontraktens begreper.
- **Bestemmelsene:** Henvisning til punkt, ledd og setning, ikke sitat.
- **Alternativene:** Alternativene slik de ble stilt, med navn.
- **Drøftelsen:** Ordlyden, teori og praksis og vår tolkning, holdt fra
  hverandre.
- **Kildene:** Hver kilde, merket kontrollert eller ukontrollert.
- **Hvor sikker vurderingen er:** Og hva som kan endre den.
- **Utfallet:** Bare lenker til vedtaks-ID-ene.
