# Vedtaksregisteret

[`vedtak.toml`](vedtak.toml) er kilden avsnitt 3.1 i
[hovedplanen](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger)
lages av (#413). For hvert nytt vedtak holder registeret spørsmålet,
alternativene og oppdragsgivers svar ordrett, og raden i 3.1 lages av dem uten
omskriving. Verktøyet er [`docs/verktoy/vedtaksregister.py`](../verktoy/vedtaksregister.py),
og vakttestene står i
[`backend/tests/test_vedtaksregister/`](../../backend/tests/test_vedtaksregister/test_vedtaksregister.py).

```bash
python3 docs/verktoy/vedtaksregister.py           # kontroller registeret og skriv 3.1
python3 docs/verktoy/vedtaksregister.py --sjekk   # bare kontroller
```

## Hvem som er autoritativ

- **Hovedplanen er autoritativ for vedtakene.** Et vedtak er det som står i 3.1
  på `main`. Det er hovedplanen andre dokumenter, issues og PR-er viser til.
- **Registeret er kilden 3.1 lages av, ikke et eget beslutningsregister.** Det
  fører ingen vedtak som ikke står i 3.1, og 3.1 rettes bare gjennom registeret.
  Vakttesten holder dem like; avviker de, er det en feil, ikke to versjoner av et
  vedtak.
- **Spørsmålet, alternativene og svaret er beviset** for et nytt vedtak, som en
  audit i `docs/` er det for et funn. De står bare i registeret.
- Resten av hovedplanen, også 3.2–3.4, merknadene til andre avsnitt og
  funnregisteret, skrives som før.

## Postene

Registeret har innledningen til 3.1, gruppene (`[[gruppe]]`, med `tittel` og
eventuelt `etter`) og vedtakene i hver gruppe (`[[gruppe.vedtak]]`), i
rekkefølgen i 3.1.

**De importerte postene** er radene som sto i 3.1 12.10, ført inn ordrett med
`--importer` etter oppdragsgivers svar 12.10 i #413. De har cellene fra tabellen:
`vedtak`, `vedtatt` og `folge`, og `anker` når raden har et. Spørsmål og forhold
finnes ikke for dem, så de feltene er tomme, det vil si at de ikke står i posten.
Forholdene i Følge-teksten er ikke lest ut som data, fordi det ville vært en
tolkning. Slik er resten av 3.1 tatt med uten endring:

- radene uten anker, som «B-13 …» og radene i underavsnittene uten ID, er
  poster uten `anker`;
- de daterte merknadene (`> **Merknad …`) og annen tekst mellom tabellene står
  ordrett i `innledning` og i `etter` hos gruppen de står etter;
- en lang celle er brutt over flere linjer ved mellomrom, og verktøyet setter den
  sammen med ett mellomrom, så raden blir lik byte for byte.

**En ny post** føres for hånd av den som fører vedtaket:

```toml
[[gruppe.vedtak]]
id = "LV-U6"
dato = 2026-10-13
hvem = "oppdragsgiver"
kilde = ["#413"]
sporsmal = '''
Spørsmålet slik det ble stilt.'''
valgt = "A"
svar = '''
Oppdragsgivers svar, ordrett.'''
forhold = [{ art = "presiserer", vedtak = "ka-u1" }]
folge = '''
Ikke bygget'''

[[gruppe.vedtak.alternativ]]
navn = "A"
tekst = '''
Alternativet i vedtaksform, slik det ble stilt.'''

[[gruppe.vedtak.alternativ]]
navn = "B"
tekst = '''
Et alternativ oppdragsgiver forkastet.'''
forkastet = true

[[gruppe.vedtak.sitat]]
kilde = "ns8407"
tekst = "et ordrett utdrag"
```

- **Vedtaksteksten er det valgte alternativet, ordrett**, etter `ID: `. Et
  alternativ med `forkastet = true` kommer etter, som «Forkastet: «…»». Et
  alternativ som bare ikke ble valgt, eller som ble overlatt til andre, er ikke
  forkastet. Passer svaret ikke på et alternativ, stilles et oppfølgingsspørsmål;
  svarer oppdragsgiver med egne ord, er det svaret et eget alternativ.
- **Vedtatt** blir `dato` som dd.mm, `hvem` og kildene i parentes.
- **Følge** blir forholdene, så henvisningene fra senere vedtak, så `folge`.
  `forhold` har én av artene `presiserer`, `utvider`, `snevrer inn`, `endrer` og
  `opphever`, og viser til ankeret til et vedtak. Verktøyet skriver forholdet
  begge veier: `Presiserer [KA-U1](#ka-u1).` hos det nye vedtaket, og
  `Presisert 13.10 av [LV-U6](#lv-u6).` først i Følge hos KA-U1. `folge` er resten:
  byggestatus, med dato og belegg.
- **Sitater** fra NS 8407, hovedplanen eller en fil i treet føres som `sitat`
  med kilden: `ns8407`, `hovedplanen` eller stien. Et sitat er hele setninger;
  et utdrag får `utdrag = true`, og da er det et utdrag også i teksten.
- **Svaret** er oppdragsgivers ordrett og nevner det valgte alternativet ved navn.

## Vakttestene

| Test | Gjelder |
| --- | --- |
| 3.1 er lik det verktøyet lager | alle poster |
| Vedtaket, ankeret og vedtaksdatoen i hver rad i 3.1 på `main` står uendret | alle rader, også de importerte |
| Innledningen, teksten etter tabellene (merknadene) og gruppetitlene kan bare få tekst lagt til; hver rad blir i gruppen sin; lenkene og setningene «Merknad dd.mm …» i Følge blir stående | 3.1 på `main` |
| En post i importert form står i 3.1 på `main`; et nytt vedtak kan ikke føres i den formen | importerte poster |
| Hvert anker i hovedplanen står én gang, og ID-en til en ny post står ikke i hovedplanen på `main` fra før, heller ikke uten anker eller utenfor 3.1 | hele planen |
| Spørsmålet, alternativene, svaret og de andre feltene i en merget ny post står uendret; bare `folge` kan endres | nye poster på `main` |
| Forholdet står begge veier | nye poster med `forhold` |
| Vedtaksteksten har ingen kodenavn: backticks, `snake_case`, `camelCase`, `STORE_BOKSTAVER` med understrek, `navn()` og filnavn | nye poster, det valgte og de forkastede alternativene |
| Svaret nevner det valgte alternativet | nye poster |
| Hvert sitat står ordrett i posten og i kilden, med mellomrom normalisert, og er hele setninger der: det begynner ved setningsstart, «, kolon eller cellegrense og slutter ved punktum, » eller cellegrense. `utdrag = true` slipper et utdrag gjennom uttrykkelig. Kilden er NS 8407 eller fila slik den er på `main`, så et sitat kan ikke få kilden sin i samme PR | nye poster til de er merget; raden til posten selv teller ikke som kilde i hovedplanen. Etter merge kan kilden endres, og sitatet prøves ikke igjen |

De importerte postene har kodenavn i dag og skrives ikke om. Testen skiller dem
på formen: en post med `vedtatt` er importert, og en ny post har `dato`. En
importert post kan ikke ha felt fra en ny, og en post i importert form som ikke
står i 3.1 på `main`, avvises.

Verktøyet kjører de samme kontrollene som testene, også dem mot `main` når
historikken finnes.

Det testene ikke ser: om et alternativ strider mot et vedtak, om forholdet er en
presisering eller en endring, og om et sitat er tatt ut av sammenhengen. Det
kontrolleres én gang, når spørsmålet stilles
([orkestreringsskillen](../../.claude/skills/orkestrering/SKILL.md#spørsmål-og-vedtak)).
Testen ser heller ikke et sitat som ikke er ført som `sitat`.

**Historikken.** NS 8407-teksten ligger ikke i treet og legges ikke tilbake
(oppdragsgiver 12.10 i #413). Sitatkontrollen leser den med `git show` fra
507e2254^ (`863f1470`). Sammenlikningen med `main` leser hovedplanen der grenen
gikk ut fra `origin/main`, og i CI forelderen til flettecommiten. Backend-jobben
i [`ci.yml`](../../.github/workflows/ci.yml) henter begge. Mangler historikken
lokalt, hoppes testene over med en melding; hent den med
`git fetch --unshallow origin main`. I CI feiler de i stedet.
