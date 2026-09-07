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

## Mal

- **Tittel, dato og status** (foreslått, vedtatt eller erstattet).
- **Problem:** Konkret situasjon og risiko ved alternativene.
- **Kontraktsgrunnlag:** Dokument, punkt og eventuelle prosjektavvik.
- **Vurdering:** Tolkningen eller usikkerheten som motiverer produktvalget.
- **Beslutning:** Hva appen gjør, inkludert veiledning, sperrer og standardvalg.
- **Konsekvenser og avgrensning:** Hva valget sikrer, og hva det ikke avgjør.
- **Implementering og kontroll:** Kode, tester og forhold som kan kreve ny vurdering.
