# Forprøve av prototypen

Malen for forprøven i [brukerforlop](SKILL.md), steg 6. Den er en mal, ikke en fil som
kjøres. Fyll ut plassholderne for hvert forløp:

- `BF-xx`: forløpets ID, og `docs/domenetabell/brukerforlop/BF-xx.md` er bestillingen.
- `<prototypefil>`: fila i `docs/design/prototyper/`, én per forløp.
- `G-x`: kontrollpunktene i bestillingen.

Den mekaniske kontrollen kjøres først. Den kognitive gjennomgangen kjøres når den er grønn.
Den mekaniske kontrollen går på Haiku med innsats high, til skriptet i #1347 finnes.
Den kognitive gjennomgangen går på standardmodellen.

## Mekanisk kontroll

```text
Du gjør en mekanisk gjennomklikking av prototypen for brukerforløpet BF-xx i repoet
khjohns/endringsmeldinger (main). Du kontrollerer at prototypen virker. Du vurderer ikke
om den er god eller forståelig. Det gjør en annen agent.

Les først, og bare dette:
- docs/domenetabell/brukerforlop/BF-xx.md: tabellen over stegene med ankre, G-punktene i
  «Gjennomføring» og sjekklisten under «Klar til bygging».
- .claude/skills/mockup-nettleser/SKILL.md, avsnittet «Nettleseren». Kjør aldri npm i
  playwright eller playwright install. require('playwright') virker fra hvilken som helst
  mappe, og chromium.launch() trenger ingen argumenter.
- Prototypen: docs/design/prototyper/<prototypefil>.

Skriv ett Node-skript i <scratchpad>/gjennomklikk/ og kjør det. Prototypen åpnes med file://.
Skriptet skal gjøre dette:
1. Gå gjennom hvert steg i stegtabellen og hvert G-punkt som har en vei, med 1440 px
   bredde. Start fra begynnelsen og klikk på de synlige knappene og lenkene en bruker
   ville klikket på. Ikke hopp ved å sette hash direkte, unntatt for å starte et steg
   tabellen sier begynner i en bestemt tilstand. Kontroller at den forventede tilstanden
   nås. Ta ett skjermbilde per tilstand. Rapporter også bredden på 390 px, men stopp ikke
   på den.
2. For hvert kontrollpunkt som beskriver en virkning som skal bestå (G-x): klikk veien dit
   virkningen oppstår, utfør handlingen som ikke skal fjerne den, og kontroller at teksten
   som viser virkningen fortsatt står etterpå. Siter teksten.
3. Kontroller at hver href="#…" har et mål med samme id, og at hvert anker i stegtabellen
   finnes.
4. Slå på «Vis sporbarhet». List hver data-spor-verdi, og kontroller at hver ID finnes i
   BF-xx.md. Kontroller også motsatt vei: hvilke U- og D-punkter har ingen data-spor.
5. Samle konsollfeil og sidefeil.
6. Kjør axe (node_modules/axe-core/axe.min.js via page.addScriptTag, runOnly wcag2a,
   wcag2aa, wcag21a, wcag21aa) i hver tilstand.

Du skal ikke: endre filer i repoet, committe eller opprette issues; vurdere tekst, ord,
juss, design eller hvor forståelig noe er, eller foreslå endringer; lese vedtak, kjerne/,
src/ eller andre forløp; starte vite eller kjøre andre skript i repoet. Står du fast på et
steg, noter brudd med et skjermbilde og gå videre.

Sluttrapporten, høyst 40 linjer: stegene og G-punktene med «virker» eller «brudd»;
kontrollpunktene med sitat; brutte ankre og data-spor-avvik; konsollfeil; axe; bredden på
390 px; stien til skriptet og hva som var spesifikt for forløpet; omtrent antall kall. Ikke
gjengi skript, HTML eller rå utdata.

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.
```

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
P-punkter; sammenligne med demoruta, saksruta eller dagens app; vurdere kode, axe, lenker
eller klikk; påstå at brukere vil forstå noe.

Sluttrapporten, høyst 60 linjer: U-tabellen, D-avvikene med sitater, kontrollpunktene,
begrepsfunnene, spørsmålene, observasjonene, kandidatene til steg 2 og omtrent antall kall.

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.
```
