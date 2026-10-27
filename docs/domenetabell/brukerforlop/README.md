# Brukerforløpene

Et brukerforløp følger en hel sak fra én brukers side til den andres, som «BH
vurderer varslingen og beløpet, og TE leser svaret og tar stilling» (#1330).
Regelbevisene er bevis-sakene i
[`bevis-saker-maalmodell.json`](../bevis-saker-maalmodell.json). Et forløp kan vise til
dem, men henvisningen erstatter ikke kontrollene i forløpet.

[Dekningsoversikten](dekning.md) og startjournalene demoruta laster
(`startjournaler.json`), lages av forløpsfilene:

```bash
node kjerne/tester/brukerforloep.ts --skriv
```

Vakttesten i `kjerne/tester/brukerforloep.test.ts` feiler når de ikke stemmer med
forløpsfilene, når en kilde ikke finnes i vedtaksfila eller domenetabellen, og når en
bevis-sak ikke finnes.

## Formatet

Ett forløp per fil, `BF-<nummer>.json`, med ID-en som filnavn. ID-en endres ikke.

| Felt | Innhold |
| --- | --- |
| `tittel`, `brukerhistorie` | Hva brukerne gjør og forstår, med partene og handlingene |
| `status` | `kjørbar` eller `planlagt`. Et planlagt forløp har ingen steg, kjøres ikke og etterlignes ikke med en annen handling |
| `utgangspunkt` | `start` er et prefiks fra bevis-sakene eller `null`, og `beskrivelse` sier hvor saken står |
| `steg` | Handlingene, i samme format som bevis-sakene (`Handling` i `kjerne/tester/klient.ts`) |
| `kontrollpunkter` | Navngitte punkter etter et steg (`etter`), med `kontrollsett`, egne `kontroller` og `forstaaelse` |
| `kilder`, `venter_paa` | For et planlagt forløp: vedtakene det bygger på, og issuene det venter på |
| `bevis_saker` | Bevis-sakene forløpet viser til |
| `visninger` | `demoruta`, `saksruta` og `varden`, der forløpet kan kjøres. Et kjørbart forløp kjøres alltid i minnet og mot testbasen. `varden` er den eksperimentelle visningen i demoruta (#1331) og krever `demoruta` |
| `endringer` | Dato, vedtak eller issue og hva som er endret, for hver endring av et forventet resultat |

En kontroll har `rolle`, `kilde` og `forventet`, med stiene kjøreren leser (`les` i
`kjerne/tester/kjoerer.ts`). Forventningen skrives fra vedtakene, etter
[testinstruksjonene](../../../.claude/rules/tester.md). Et kontrollsett i
[`kontrollsett.json`](kontrollsett.json) er kontroller som går igjen, som «TE har mottatt
et svar», med parametre som `{spor}` og `{svar}`.

`forstaaelse` er det brukeren skal forstå ved kontrollpunktet. Den prøves manuelt i
demoruta og i brukertest, ikke i CI.

## Demoruta

`/demo/forlop/<ID>?punkt=<kontrollpunkt>` viser saksvisningen for forløpet mot en
journal i minnet, fra startjournalen ved kontrollpunktet. Det brukeren gjør derfra,
vurderes og skrives av kjernen i nettleseren med demoaktørene i startjournalen. ID-ene
og tidspunktene er faste per forløp, så en omstart gir samme journal. Ingenting sendes.
Demoruta beviser ikke tilgang, CSRF eller aktørstempling; det gjør bare saksruta mot
TS-serveren, som kjører de samme stegene med `saksrute.ts --forlop <ID>`.

Med `&visning=varden` vises den samme saken i Varden, den eksperimentelle visningen fra
[konseptet](../../design/konsept-varden/README.md) (#1331). Bryteren i demopanelet bytter
visning og starter forløpet på nytt fra kontrollpunktet.

## Arbeidsregelen

Avdekker en feil eller et nytt vedtak en brukerhistorie som mangler, utvides
forløpene i samme arbeid. Endres et forventet resultat, får forløpet en linje i
`endringer` med dato og vedtak eller issue. Regelen står også i
[leveranseskillen](../../../.claude/skills/leveranse/SKILL.md) og PR-malen.
