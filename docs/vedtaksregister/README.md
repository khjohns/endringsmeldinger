# Vedtaksregisteret

[`vedtak.toml`](vedtak.toml) er kilden [vedtaksfila](../plans/vedtak.md) lages
av (#413). Vedtaksfila var avsnitt 3.1 i
[hovedplanen](../plans/2026-09-16-godkjenning-og-varig-levering.md) til #1020, og
«3.1» i teksten under betyr innholdet i den. For hvert nytt vedtak holder
registeret spørsmålet, alternativene og oppdragsgivers svar ordrett, og raden i
vedtaksfila lages av dem uten omskriving. Verktøyet er [`docs/verktoy/vedtaksregister.py`](../verktoy/vedtaksregister.py),
og vakttestene står i
[`backend/tests/test_vedtaksregister/`](../../backend/tests/test_vedtaksregister/test_vedtaksregister.py).

```bash
python3 docs/verktoy/vedtaksregister.py           # kontroller registeret og skriv vedtaksfila
python3 docs/verktoy/vedtaksregister.py --sjekk   # bare kontroller
python3 docs/verktoy/vedtakshenvisninger.py       # vedtaks-ID-ene i koden (#452)
python3 docs/verktoy/byggestatus.py               # byggestatusen, laget av koden og issuene (#1021)
```

## Hvem som er autoritativ

- **Vedtaksfila er autoritativ for vedtakene** (#1020, oppdragsgiver 20.10). Et
  vedtak er det som står i [`docs/plans/vedtak.md`](../plans/vedtak.md) på `main`.
  Det er vedtaksfila andre dokumenter, issues og PR-er viser til. En eldre
  henvisning til 3.1 i hovedplanen, eller til et vedtaksanker der, gjelder
  vedtaksfila.
- **Registeret er kilden vedtaksfila lages av, ikke et eget beslutningsregister.**
  Det fører ingen vedtak som ikke står i vedtaksfila, og vedtaksfila rettes bare
  gjennom registeret. Vakttesten holder dem like; avviker de, er det en feil, ikke
  to versjoner av et vedtak.
- **Innholdet er 3.1 slik det sto i planen**, med et hode foran. Bare lenkene til
  ankre i hovedplanen er skrevet om, så de går til planen. Kontrollene mot `main`
  leser 3.1 i formen den hadde i planen, laget av registeret på `main`.
- **Spørsmålet, alternativene og svaret er beviset** for et nytt vedtak, som en
  audit i `docs/` er det for et funn. De står bare i registeret.
- Resten av hovedplanen, også 3.2–3.4, merknadene til andre avsnitt og
  funnregisteret, skrives som før. De avsluttede funnene står i
  [arkivet](../plans/arkiv.md).

## Postene

Registeret har innledningen til 3.1, gruppene (`[[gruppe]]`, med `tittel` og
eventuelt `etter`) og vedtakene i hver gruppe (`[[gruppe.vedtak]]`), i
rekkefølgen i 3.1.

**De importerte postene** er radene som sto i 3.1 12.10, ført inn ordrett med
`--importer` etter oppdragsgivers svar 12.10 i #413. De har cellene fra tabellen:
`vedtak`, `vedtatt` og `folge`, og `anker` når raden har et. Spørsmål finnes ikke
for dem, så de feltene er tomme, det vil si at de ikke står i posten. Slik er resten
av 3.1 tatt med uten endring:

- radene uten anker, som «B-13 …» og radene i underavsnittene uten ID, er
  poster uten `anker`;
- de daterte merknadene (`> **Merknad …`) og annen tekst mellom tabellene står
  ordrett i `innledning` og i `etter` hos gruppen de står etter;
- en lang celle er brutt over flere linjer ved mellomrom, og verktøyet setter den
  sammen med ett mellomrom, så raden blir lik byte for byte.

**Forholdene i de importerte postene** er de Følge sier uttrykkelig, lest ut med
verktøyet etter oppdragsgivers svar 12.10 i #423. De står i `forhold` hos posten
som presiserer, utvider, snevrer inn, endrer eller opphever, som i en ny post.
Verktøyet leser bare et ledd som begynner med verbet, med stor forbokstav, og en
lenke til et anker: `Presiserer [KA-U12](#ka-u12)` hos posten selv, eller
`Presisert 10.10 av [KA-U17](#ka-u17)` hos vedtaket den gjelder. I samme ledd leser
det også `og presiserer [X](#x)`, og i et passivt ledd `og utvidet av [X](#x)` og
`og av [X](#x)`. Etter verbet kan det stå flere lenker:
`[A](#a), [B](#b) og [C](#c)`. Annen tekst tolkes ikke, heller ikke «er presisert
av» midt i en setning, der subjektet kan være et annet vedtak, eller en ID uten
lenke. Følge skrives ikke om: forholdet står allerede i teksten, så verktøyet
skriver det ikke i raden. En rad uten anker kan ikke være vedtaket et forhold gjelder;
en passiv form der listes. En lenke i et uttrykkelig forhold som ikke er til et vedtak,
til vedtaket selv eller, i passiv form, til en ny post, er en feil. Importen nekter å
skrive over et register med forhold i de importerte postene.

```bash
python3 docs/verktoy/vedtaksregister.py --forhold   # det som står én vei og ikke leses, og kontrollen
```

Forholdene som står bare én vei, står i `EN_VEI` i verktøyet. Listen ble lagt fram
for oppdragsgiver i PR-en for #423 og rettes ikke i stillhet.

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
Bygges i #313'''

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
  `Presisert 13.10 av [LV-U6](#lv-u6).` først i Følge hos KA-U1. `folge` er resten,
  som issuet som bygger vedtaket. Byggestatus føres ikke der; den lages av
  verktøyet (se [Byggestatusen](#byggestatusen)).
- **Sitater** fra NS 8407, hovedplanen eller en fil i treet føres som `sitat`
  med kilden: `ns8407`, `hovedplanen` eller stien. Kilden `hovedplanen` er
  hovedplanen, vedtaksfila og arkivet, som var deler av den. Et sitat er hele setninger;
  et utdrag får `utdrag = true`, og da er det et utdrag også i teksten.
- **Svaret** er oppdragsgivers ordrett og nevner det valgte alternativet ved navn.
  Ble ett alternativ anbefalt da spørsmålet ble stilt, får det `anbefalt = true`.
  Er det valgt, kan svaret i stedet slutte seg til anbefalingen, som «Ja til
  anbefalingen» eller «Ja til alle anbefalingene» (#486). Et svar med forbehold,
  som «unntatt» eller «men», regnes ikke som tilslutning og må nevne alternativet
  (#604). Et anbefalt alternativ kan ikke være forkastet.

## Byggestatusen

Byggestatusen lages av koden og issuene, ikke for hånd (oppdragsgivers svar 20.10
på spørsmål 4 i [vurderingen](../vedlegg/vurdering-maalbilde-2026-10-20/sporsmal.md),
#1021). Verktøyet er [`docs/verktoy/byggestatus.py`](../verktoy/byggestatus.py), og
testene står i
[`test_byggestatus.py`](../../backend/tests/test_vedtaksregister/test_byggestatus.py).

```bash
python3 docs/verktoy/byggestatus.py                # alle vedtakene med ID
python3 docs/verktoy/byggestatus.py --avvik        # bare vedtakene med avvik
python3 docs/verktoy/byggestatus.py --uten-issues  # uten nett
```

- **Visningen** har, for hvert vedtak med ID, produksjonsfilene og testfilene i
  `kjerne/`, `server/` og `src/` som viser til det, lest som i
  [`vedtakshenvisninger.py`](../verktoy/vedtakshenvisninger.py). Den har også
  issuene og PR-ene som Følge nevner, med tilstanden hentet med `gh api`, og den
  siste byggestatusen Følge sier for hånd. En henvisning i koden sier at koden
  bygger på vedtaket, ikke at hele vedtaket er bygget.
- **Avvikene** er «Ikke bygget» i Følge når produksjonskoden viser til vedtaket,
  og «Ikke bygget» når issuene som bygger vedtaket, er lukket. Det er issuene i en
  setning om byggingen, som «Bygges i #411», «Ikke bygget (#371)» eller «hører til
  #313», ikke issuet der spørsmålet ble stilt. PR-er teller ikke, og et issue
  lukket som ikke planlagt eller duplikat, eller med ukjent tilstand, gjør det ikke
  lukket. Statusen er den siste med stor forbokstav, så «Sperren er ikke bygget»
  telles ikke. Et avvik er noe å kontrollere.
- **Visningen sjekkes ikke inn**, fordi tilstanden til issuene endrer seg uten en
  commit. Kjør verktøyet når byggestatusen trengs.
- **Byggestatusen som står i Følge, blir stående**, fordi Følge i en importert rad
  bare kan få tekst lagt til. Den er ført for hånd og kan være foreldet; visningen
  viser den ved siden av. **Ny byggestatus føres ikke i `folge`**: vakttesten melder
  «Ikke bygget», «Delvis bygget», «Del n bygget» og «Bygget», med stor forbokstav,
  når teksten er ny etter `main`. «Bygges i #n» og «hører til #n» er lov, og det er
  dem visningen leser.

## Temavisningene

En temavisning samler regelgrunnlaget for ett tema på ett sted: vedtakene ordrett,
slik raden står i 3.1, med de forkastede alternativene merket, forholdene mellom dem,
og regelradene og bevis-sakene som viser til dem (#454, punkt 5 i #451). Den lager
ingen sammenslått gjeldende ordlyd. Vedtaksfila er autoritativ (punkt 9 i #451, #1020),
og visningen sier det.

Temaene står i [`temaer.toml`](temaer.toml), og visningene i [`temaer/`](temaer/).
Verktøyet er [`docs/verktoy/temavisning.py`](../verktoy/temavisning.py), og
vakttesten står i
[`test_temavisning.py`](../../backend/tests/test_vedtaksregister/test_temavisning.py).
Testen feiler når en innsjekket visning avviker fra det verktøyet lager. Endres en
post, en regelrad eller en bevis-sak som visningen bruker, må visningen derfor lages
på nytt i samme PR.

```bash
python3 docs/verktoy/temavisning.py           # kontroller temaene og skriv visningene
python3 docs/verktoy/temavisning.py --sjekk   # bare kontroller
```

- **Et tema** har `kjerne`, som er vedtakene temaet er valgt etter, og `vedtak`.
  `vedtak` er kjernen og, transitivt, hvert vedtak som endrer, utvider, snevrer inn,
  presiserer eller opphever et vedtak i temaet etter `forhold` i registeret
  (arbeidsvalg A i [#454](https://github.com/khjohns/endringsmeldinger/issues/454)).
  Mangler ett, feiler kontrollen. Et nytt vedtak som endrer kjeden, gjør dermed
  testen rød til det er tatt inn i temaet. Et vedtak temaet viser til, står som
  lenke til 3.1.
- **Kontrollsummen** er SHA-256 over utdraget av kildene visningen leser. Et
  vedtak utenfor temaet endrer den ikke.
- **Det verktøyet ikke ser:** et forhold som Følge bare sier med ord, uten lenke,
  for eksempel at GR-U12 presiserer GR-U10. Det står ordrett under Følge, men ikke i
  kjeden. Verktøyet ser heller ikke en regelrad eller en bevis-sak som bare nevner
  vedtaket i fritekst, og ikke i `kilder` eller `kontroller[].kilde`.

## Vakttestene

| Test | Gjelder |
| --- | --- |
| Vedtaksfila er lik det verktøyet lager | alle poster |
| Vedtaket, ankeret og vedtaksdatoen i hver rad i 3.1 på `main` står uendret | alle rader, også de importerte |
| Innledningen, teksten etter tabellene (merknadene) og gruppetitlene kan bare få hele nye avsnitt lagt til; hver rad blir i gruppen sin; lenkene i Følge blir stående | 3.1 på `main` |
| Følge i en importert rad står ordrett. Henvisningene fra nye vedtak kommer først og kan bli flere, og tekst kan legges til på slutten | importerte rader på `main` |
| En post i importert form står i 3.1 på `main`; et nytt vedtak kan ikke føres i den formen | importerte poster |
| Hvert anker står én gang i hovedplanen og vedtaksfila til sammen, og ID-en til en ny post står ikke i hovedplanen, arkivet eller vedtaksfila på `main` fra før, heller ikke uten anker | hovedplanen, arkivet og vedtaksfila |
| Spørsmålet, alternativene, svaret og de andre feltene i en merget ny post står uendret; bare `folge` kan endres | nye poster på `main` |
| Forholdet står begge veier | nye poster med `forhold` |
| Forholdene i en importert post er de Følge sier uttrykkelig, og de står begge veier, unntatt dem i `EN_VEI`; et forhold i `EN_VEI` som står begge veier, er også en feil; en lenke i et uttrykkelig forhold går til et annet vedtak, og i passiv form til en importert post | importerte poster |
| Vedtaksteksten har ingen kodenavn: backticks, `snake_case`, `camelCase`, `STORE_BOKSTAVER` med understrek, `navn()` og filnavn | nye poster, det valgte og de forkastede alternativene |
| Svaret nevner det valgte alternativet og ikke noe annet alternativ ved navn. En omtale av et forkastet alternativ regnes ikke som et valg. Det gjør heller ikke en omtale med et spørsmålsnummer foran, som «2b-A», når nummeret ikke også står foran det valgte alternativet | nye poster |
| Hvert sitat står ordrett i posten og i kilden, med mellomrom normalisert, og er hele setninger der: det begynner ved setningsstart, «, kolon, semikolon eller cellegrense og slutter ved punktum, » eller cellegrense. Fet skrift og et anker foran hoppes over, og en overskrift, et avsnitt og et punkt er grenser. `utdrag = true` slipper et utdrag gjennom uttrykkelig. Kilden er NS 8407 eller fila slik den er på `main`, så et sitat kan ikke få kilden sin i samme PR | nye poster til de er merget; raden til posten selv teller ikke som kilde i hovedplanen. Etter merge kan kilden endres, og sitatet prøves ikke igjen |
| Følge får ikke ny byggestatus for hånd: «Ikke bygget», «Delvis bygget», «Del n bygget» eller «Bygget», med stor forbokstav, utover det som står på `main` | alle poster (#1021) |
| En vedtaks-ID i koden er et vedtak i registeret eller en åpen B-ID i 3.4, og en opphevet ID står ikke som eneste grunnlag uten å være merket historisk i en test. Formene og hva en henvisning er, står i [`vedtakshenvisninger.py`](../verktoy/vedtakshenvisninger.py) | `kjerne/`, `server/` og `src/` (#452) |

De importerte postene har kodenavn i dag og skrives ikke om. Testen skiller dem
på formen: en post med `vedtatt` er importert, og en ny post har `dato`. En
importert post kan ikke ha felt fra en ny, bortsett fra `forhold`, og en post i
importert form som ikke står i 3.1 på `main`, avvises.

Verktøyet kjører de samme kontrollene som testene, også dem mot `main` når
historikken finnes.

Det testene ikke ser: om svaret faktisk forkaster et alternativ det nevner og som er merket forkastet, om et alternativ strider mot et vedtak, om forholdet er en
presisering eller en endring, forhold som Følge i en importert post bare sier med
andre ord, og om et sitat er tatt ut av sammenhengen. Det
kontrolleres én gang, når spørsmålet stilles
([vedtaksskillen](../../.claude/skills/vedtak/SKILL.md)).
Testen ser heller ikke et sitat som ikke er ført som `sitat`. Testene ser bare
at ny tekst i `folge`, `etter` og `innledning` er lagt til, ikke hva den sier.
Innholdet kontrolleres av en subagent før vedtaks-PR-en merges
([vedtaksskillen](../../.claude/skills/vedtak/SKILL.md)).

**Kildene.** NS 8407-teksten er opphavsrettsbeskyttet og ligger verken i treet
eller historikken, men i det private repoet `khjohns/kontrakt` (#424).
Sitatkontrollen leser fila som `NS8407_TEKST` peker på, ellers
`../kontrakt/NS_8407.md`, en klone ved siden av repoet, der `add_repo` legger
den i en skyøkt. CI har ikke teksten, så sitatene fra NS 8407 kontrolleres bare
lokalt, før en PR som fører et vedtak
([leveranseskillen](../../.claude/skills/leveranse/SKILL.md)). En sjekksum i verktøyet låser versjonen. Endres teksten, endres
sjekksummen i samme PR. Sammenlikningen med `main` leser hovedplanen og registeret der
grenen gikk ut fra `origin/main`, og i CI forelderen til flettecommiten.
Backend-jobben i [`ci.yml`](../../.github/workflows/ci.yml) henter historikken.
Mangler den lokalt, hoppes testene over med en melding; hent den med
`git fetch --unshallow origin main`. I CI feiler de i stedet. Mangler
NS 8407-teksten, hoppes de tre testene som leser den, over, også i CI.
