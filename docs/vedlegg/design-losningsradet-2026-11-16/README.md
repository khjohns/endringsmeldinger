# Overordnet og detaljert design for Løsningsrådet

**Dato og grunnlag:** 16.11.2026, kontrollert mot `e8d39fb` på `main`. Foreløpige
utkast, versjon 0.1, i Oslobyggs maler for overordnet design (HLD) og detaljert
design (LLD). Gule markeringer i dokumentene er punkter som ikke er avklart eller
ikke er bygget.

Dokumentene er en gjengivelse for Løsningsrådet, ikke en kilde. Vedtakene står i
[vedtaksfila](../../plans/vedtak.md), datamodellen i [`datamodell/`](../../datamodell/)
og arbeidet som gjenstår i issuene. Sier dokumentene noe annet, er det de som er
foreldet.

| Fil | Innhold |
| --- | --- |
| [`overordnet-design.docx`](overordnet-design.docx) | Overordnet design |
| [`detaljert-design.docx`](detaljert-design.docx) | Detaljert design |
| [`bilder/`](bilder/) | Skissene i dokumentene |
| [`kilde/`](kilde/) | Skriptene som tegner skissene og fyller malene |
| [`maler/`](maler/) | Oslobyggs maler, uendret |

## Bygge dokumentene på nytt

Skriptene tar mappene som argumenter. Kjør dem fra en arbeidsmappe utenfor repoet.

1. Pakk ut malen med Python (`zipfile`) til en mappe.
2. Tegn skissene: `python3 kilde/overordnet/tegn.py <bildemappe>` eller
   `python3 kilde/detaljert/tegn_lld.py <bildemappe>`, og gjør SVG-ene om til PNG med
   `node kilde/png.cjs <bildemappe> <navn …>` (Playwright).
3. Fyll malen: `python3 kilde/overordnet/bygg.py <utpakket mal> <bildemappe>`, eller
   `python3 kilde/detaljert/bygg_lld.py <utpakket mal> <bildemappe> <repo> [sidetall.json]`.
   Det detaljerte designet bygges to ganger: først uten sidetall, så med sidetallene
   for innholdsfortegnelsen lest av en PDF av første bygging.
4. Pakk mappa som `.docx` med `zip`.
