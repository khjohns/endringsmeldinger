# Skjermbilder, mars 2026

Tre skjermbilder tatt med Playwright under utviklingen. Flyttet hit fra den
lokale arbeidsmappa `.playwright-mcp/` under #106 (2026-10-03, fra `799619d`).
De viser hvordan appen så ut da, ikke hvordan den ser ut nå.

| Fil | Innhold | Opprinnelig sti |
| --- | --- | --- |
| [2026-03-04-koe-primitiver.png](2026-03-04-koe-primitiver.png) | Designsystem-showcase for primitivene i mørkt tema, hele siden | `.playwright-mcp/page-2026-03-04T10-52-21-799Z.png` |
| [2026-03-13-ny-sak-utfylt.png](2026-03-13-ny-sak-utfylt.png) | Skjemaet for ny sak i lyst tema, med hjemmel valgt, hjelpetekst for §32.1 og datofelt | `.playwright-mcp/page-2026-03-13T12-55-16-414Z.png` |
| [2026-03-13-saksvisning.png](2026-03-13-saksvisning.png) | Saksvisningen etter at grunnlaget er sendt, kortvisning | `.playwright-mcp/page-2026-03-13T12-56-46-162Z.png` |

Det utfylte skjemaet viser `0 tegn` over et felt med tekst og året `0003` i
datofeltet. Om det var feil i appen eller artefakter fra automatiseringen, er
ikke undersøkt.

## Fjernet

Følgende ble fjernet fra arbeidsmappa. De finnes i Git-historikken på `799619d`.

- Fem skjermbilder: `page-2026-03-04T10-21-25-437Z.png` (tom plassholderside),
  `page-2026-03-04T10-39-34-766Z.png` og `page-2026-03-04T10-43-34-284Z.png`
  (avkuttede versjoner av primitivsiden over), `page-2026-03-13T12-28-59-654Z.png`
  og `page-2026-03-13T12-46-48-463Z.png` (toppen av det tomme skjemaet for ny
  sak, dekket av det utfylte).
- 44 YAML-uttrekk (`page-2026-04-08T*.yml`, `snap-*.yml`, `snapshot-*.yml`):
  tilgjengelighetstrær fra Playwright av en mockup av saksvisning og brev med
  oppdiktede prosjektdata. De med tidsstempel er fra 8. april. 30 er unike, to
  er tomme. De er arbeidsuttrekk som
  agenten brukte til å finne elementer, ikke design. Brevdelen er beskrevet i
  [planen for brevgeneratoren](../../superpowers/plans/2026-04-08-brev-generator-mockup.md).
