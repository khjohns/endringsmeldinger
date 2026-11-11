# Audit: formatering av datoer, beløp og dager

Dato: 2026-09-14. Omfanget er `src/lib/utils/formatters.ts` og
`src/lib/utils/dateFormatters.ts` — de to live hjelpemodulene som formaterer
datoer, beløp, dager og etiketter. Begge hadde lav dekning (29,6 % og 35 %) da
[forrige delgjennomgang](audit-begrunnelsestekst-og-dodkode-2026-09-14.md) målte
domenelaget.

Modulene er ikke kosmetikk alene: `dateFormatters` brukes av
`letterContentBuilder.ts`, så formaterte datoer går inn i brevtekst som sendes til
motparten, og av skjemaene i kontraktsbordet.

## Konklusjon

Ett funn går igjen i begge filene og er rettet (FMT-01): all feilhåndtering rundt
datoformatering var uvirksom, fordi `new Date()` ikke kaster på ugyldig inndata.
Resultatet var engelsk «Invalid Date» i et norsk-only grensesnitt, og i ett tilfelle
et falskt rødt SLA-merke.

Beløps-, dag- og etikettformateringen har ingen funn innenfor det testede omfanget.

## Funn og retting

### FMT-01 — Middels: uvirksom feilhåndtering lot «Invalid Date» nå visningen — rettet

Åtte funksjoner pakket formateringen i `try/catch` med et tiltenkt fallback:

```ts
try {
  return new Date(dateStr).toLocaleDateString(NORWEGIAN_LOCALE, { … });
} catch {
  return dateStr;          // ← nås aldri
}
```

`new Date('ikke-en-dato')` kaster ikke. Den gir et `Invalid Date`-objekt, og
`toLocaleDateString`/`toLocaleString` returnerer da strengen `"Invalid Date"` uten å
kaste. Verifisert i Node:

```
"ikke-en-dato"  -> Invalid Date
"2025-13-45"    -> Invalid Date
```

Alle `catch`-blokkene var derfor død kode, og hvert fallback forfatteren hadde
skrevet — `'—'`, `'-'` eller råstrengen — var uoppnåelig.

Verst i `getApprovalAge`, som beregner ventetid på en godkjenning: ugyldig dato ga
`days = NaN`. Siden ingen av terskelsammenligningene er sanne for `NaN`, falt
alvorsgraden gjennom til siste gren. Utfallet var etiketten «NaN dager siden» med
`severity: 'overdue'` — et rødt SLA-merke utløst av en ugyldig dato, ikke av faktisk
overskredet frist.

**Retting:** ny eksportert hjelper `parseDateSafe()` i `dateFormatters.ts` som
returnerer `null` når `getTime()` er `NaN`. Alle åtte funksjonene bruker den nå og
når sitt opprinnelige fallback. Fallbacket er bevisst uendret per funksjon — hver
beholder det forfatteren skrev i sin `catch` — slik at rettingen ikke endrer
visningen for gyldige eller manglende datoer. `getApprovalAge` returnerer `null` for
ugyldig dato, samme som for manglende dato.

Berørte funksjoner: `formatDateNorwegian`, `formatDateTimeNorwegian`,
`formatDateMinimalNorwegian`, `formatDateShortNorwegian`, `formatDateTimeCompact`,
`formatDateDayMonth`, `formatDateShort`, `formatDateMedium`, `getApprovalAge`.

### FMT-02 — Lav: feil eksempel i dokumentasjonen — rettet

`formatDateMinimalNorwegian` er dokumentert med `// '22.12'`. Den faktiske
utskriften er `'22.12.'` — `nb-NO` setter etterstilt punktum ved 2-sifret
dag/måned. Bare JSDoc-eksempelet er endret; oppførselen er urørt, siden visningen
kan avhenge av den.

## Observasjoner uten retting

- **To ulike minustegn i beløp.** `formatCurrency(-1500)` gir `−1 500 kr` med
  U+2212 MINUS SIGN fra `toLocaleString`, mens `formatCurrencyCompact(-450000)` gir
  `-450k` med vanlig bindestrek, fordi den bygger fortegnet selv. Kosmetisk, men
  verdt å vite dersom beløp med fortegn sammenlignes som tekst.
- **To prosentkonvensjoner.** `formatters.formatPercent` tar en andel (`0.75 → 75 %`),
  mens `domain/begrunnelse/shared.formatProsent` tar et heltall (`75 → 75%`). Ingen
  forveksling funnet ved gjennomgang av kallstedene, men navnene inviterer til det.
- **Naive tidsstempler.** `tidsstempel` på hendelser settes med
  `datetime.now(UTC)` og serialiseres med offset, så hovedtidsstemplene er entydige.
  `csv_repository.py` bruker derimot `datetime.now().isoformat()` uten tidssone. Et
  slikt tidsstempel tolkes av `new Date()` i nettleserens lokale sone: et tidspunkt
  etter kl. 23.00 UTC ville vist feil dato i Oslo. Ikke undersøkt videre her, siden
  CSV-repositoriet ikke er i den auditerte banen.

## Kontroller som passerer

| Scenario | Verifikasjon |
| --- | --- |
| Tidssoneomregning | 14:30 UTC vises som 15:30 om vinteren og 16:30 om sommeren. Eksplisitt `timeZone: 'Europe/Oslo'` gjør utskriften uavhengig av kjøretidens sone. |
| Døgnskille | 22. des. 23:30 UTC vises som 23. desember i Oslo. |
| Manglende verdi skilt fra null | `formatCurrency(0)` gir `0 kr`, `formatCurrency(undefined)` gir `-`. Samme skille for dager og boolsk verdi. |
| Kompakt beløp | Tusen, million, desimal million, negative beløp og beløp under 10 000. |
| SLA-terskler | Grensene 0/1/2/3/5/6 dager gir `ok`/`warning`/`overdue` som dokumentert. Testet med fast systemtid. |
| Ukjente enum-verdier | `formatBHResultat` og `getResultatLabel` faller tilbake til råverdien i stedet for tom streng. |

## Verifikasjon

```sh
npx vitest run        # 544 tester, 52 filer — alle passerer
npm run check         # 0 feil, 18 advarsler
npm run build         # passerer
npx eslint <endrede>  # rent (54 preeksisterende feil ellers i repoet)
```

To nye testfiler med til sammen 34 tester. Tre varianter feilet mot koden før
rettingen — to på «Invalid Date» og én på det feilaktige JSDoc-eksempelet — og er nå
ordinære regresjonstester, uten xfail.

Dekning: `dateFormatters.ts` **35 % → 100 %**, `formatters.ts` **29,6 % → 90 %**.

Dekning ble målt med `@vitest/coverage-v8` installert med `--no-save`; `package.json`
og `package-lock.json` er uendret. Ingen backend-, Supabase/RLS- eller
Catenda-endringer.

## Gjenstående

Testene kjører i UTC og er gjort soneuavhengige ved at formattererne setter
`timeZone` eksplisitt. Det er ikke verifisert i en nettleser satt til en annen sone
enn serverens, og ikke testet rundt selve sommertidsomleggingen.

`lockedValueTokens.ts` (34,6 % dekning) er live og fortsatt tynt dekket; den
konverterer tall til låste tokens i brevredigereren. Naturlig neste område, sammen
med forseringsflyten ende-til-ende og frontendfeil ved nettverksbrudd og
prosjektbytte.
