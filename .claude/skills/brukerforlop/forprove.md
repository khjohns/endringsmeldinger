# Forprøve av forløpet

Malen for forprøven i [brukerforlop](SKILL.md), steg 6. Den er en mal, ikke en fil som
kjøres. Fyll ut plassholderne for hvert forløp:

- `BF-xx`: forløpets ID, og `docs/domenetabell/brukerforlop/BF-xx.md` er bestillingen.
- `<prototypefil>`: fila i `docs/design/prototyper/`, bare for en HTML-skisse av et nytt mønster.
  Et helt forløp prøves i demoruta med komponentene (oppdragsgiver 28.10, #1331).
- `G-x`: kontrollpunktene i bestillingen.

Den mekaniske kontrollen kjøres først. Den kognitive gjennomgangen kjøres når den er grønn,
på standardmodellen.

## Mekanisk kontroll

For et forløp i demoruta er den mekaniske kontrollen `demoruta.mjs` i skillen
[mockup-nettleser](../mockup-nettleser/SKILL.md#demoruta-for-brukerforløpene). Demoruta driver i dag
bare BF-01, så andre forløp må bygges der før de kan forprøves.

For en HTML-skisse av et nytt mønster er den mekaniske kontrollen skriptet `prototype.mjs` i
samme skill, under [prototypen for et brukerforløp](../mockup-nettleser/SKILL.md#prototypen-for-et-brukerforløp),
ikke en agent (#1347). Klikkstiene står i forløpsfila under `prototype` (formatet står i
[README](../../../docs/domenetabell/brukerforlop/README.md#formatet)). Skriv dem før første
kjøring, og rett dem når prototypen endrer veiene:

- én klikksti per vei gjennom prototypen, med stegene i stegtabellen og G-punktene den
  prøver i `dekker`;
- `klikk` med lenketeksten brukeren klikker på og ankeret den skal føre til, `kryss`,
  `velg` og `fyll` med etiketten på feltet;
- `staar` med teksten som viser en virkning som skal bestå, etter handlingen som ikke skal
  fjerne den.

```bash
node .claude/skills/mockup-nettleser/prototype.mjs BF-xx
```

Rapporten legges i issuet eller PR-en for iterasjonen. Brudd i en klikksti, et steg der
klikkstiene for steget ikke når ankrene, et anker uten mål, en `data-spor`-ID som ikke står
i bestillingen, et U- eller D-punkt uten `data-spor`, axe-brudd og konsollfeil er avvik. Bredden på 390 px rapporteres, men er ikke et avvik.

## Kognitiv gjennomgang

```text
Du gjør en kognitiv gjennomgang av prototypen for brukerforløpet BF-xx i repoet
khjohns/endringsmeldinger (main). Det er forarbeid før oppdragsgiver selv prøver
prototypen. Målet er å finne steder der en bruker kan misforstå, nøle eller tro feil om
hva som skjer, og der prototypen avviker fra bestillingen eller vedtakene. Du er ikke en
bruker og kan ikke bevise at noe er forståelig. Du kan bare peke på risiko. En annen agent
kontrollerer separat at klikkene, ankrene og axe virker.

Les: AGENTS.md («Språk», «Domenet», «Domenekjernen»); docs/domenetabell/brukerforlop/BF-xx.md
i sin helhet; prototypen (kildeteksten, eventuelt skjermbilder via file://); vedtakene
BF-xx viser til, og bare dem, slått opp i docs/plans/vedtak.md på ankeret; ved behov et
begrep i docs/domenetabell/README.md.

Peker du på et vedtak som er relevant for forløpet, men som forløpet ikke viser til, nevner
du ID-en og én linje om hvorfor. Det føres som kandidat i steg 2 i brukerforlop-skillen, ikke
som kilde.

Gjør dette:
1. Ta rollen som forløpet beskriver: kjenner NS 8407 fra praksis, men har aldri sett
   løsningen. For hvert U-punkt: hva brukeren må forstå, hva prototypen viser (anker og
   sitat), og risikoen (høy, middels eller lav) med én setnings begrunnelse.
2. Hvert D-punkt mot prototypen: viser den virkningen D-punktet og vedtaket sier, med
   vedtakets ord? Siter begge ved avvik.
3. Kontrollpunktene (G-x): sier veien tydelig hva som består?
4. Begrepene: samme begrep om det samme, i tråd med domenetabellen og språkreglene. Bare det
   som kan gi feil forståelse.
5. 3–6 konkrete observasjoner oppdragsgiver bør se etter i sin egen prøve, ikke ledende
   spørsmål.

Du skal ikke: endre filer; avgjøre domene- eller rettsspørsmål (merk dem «spørsmål til
oppdragsgiver» med alternativer); foreslå noe utenfor bestillingen eller gjenta åpne S- og
P-punkter; sammenligne med saksruta eller dagens app; vurdere kode, axe, lenker
eller klikk; påstå at brukere vil forstå noe.

Sluttrapporten, høyst 60 linjer: U-tabellen, D-avvikene med sitater, kontrollpunktene,
begrepsfunnene, spørsmålene, observasjonene, kandidatene til steg 2 og omtrent antall kall.

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.
```
