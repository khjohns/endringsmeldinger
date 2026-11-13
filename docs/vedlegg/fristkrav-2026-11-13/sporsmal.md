# Runde C: fristene i kontrakten (G-2 i BF-20) — spørsmål og avgrensning

Spørsmålene gjelder BF-20 ([#1745](https://github.com/khjohns/endringsmeldinger/issues/1745)) og
bestillingen [BF-20.md](../../domenetabell/brukerforlop/BF-20.md). Kontraktsteksten gjengis ikke her
(#424); fila viser bare til punktene.

## Avgrensning: det som følger av vedtakene og ikke stilles

- **Hvilke dager som verdsettes når svaret har dager for flere frister** (#1780, spørsmål 1):
  summen av verdien for hver frist, med satsen for den fristen, og utregningen viser hver frist
  for seg (GFK-U21).
  Dagene er de verdien i svaret gjelder, regnet i hverdager fra fristen slik den står etter
  forlengelse som er registrert som godkjent eller avtalt (GFK-U17, GFK-U19). Dagens kode
  verdsetter hovedstandpunktet og det subsidiære hver for seg og bruker det største (docstringen
  til `brevverdi`); det er en karakterisering av koden, ikke et vedtak. Etter KA-U78 kan svaret ha
  opptil fire lag, fordi påberopelsen etter punkt 33.4 står foran, og regelen må da gjelde hvert lag.
- **Én sats per prosjekt eller per frist** (#1780, spørsmål 2): per frist. Fristtabellen har
  fristen, datoen, om fristen er dagmulktbelagt, og satsen (GFK-U18). Satsen etter punkt 40.3 a
  gjelder de avtalte overtakelsesfristene og regnes av kontraktssummen, promillen og
  minstebeløpet, eller et avtalt fast beløp (GFK-U16). Satsen etter punkt 40.3 b gjelder de
  dagmulktbelagte delfristene og regnes av verdien av delen (GFK-U18), med det minstebeløpet
  punkt 40.3 b har. Dagens ene kronebeløp per prosjekt
  erstattes (GFK-U16).
- **En frist som ikke er dagmulktbelagt:** dagene behandles som et krav som ikke er tallfestet, og
  forseringen viser ingen 30 %-grense (GFK-U20). Mangler satsen, gjelder GFK-U3 og GFK-U4, også
  når bare én av fristene mangler den.
- **Hvem registrerer fristene og når:** driften, etter skriftlig bestilling fra byggherren, som
  fullmaktene; den som utarbeider eller godkjenner et svar, kan ikke endre dem (GFK-U22, GFK-U1).
  Det betyr en registreringskommando for driften, som partsnavnene, og ingen inngang i appen.
- **Hvem leser fristtabellen:** begge parter (GFK-U23). Fristtabellen er i GFK-U18 fristen,
  datoen, om den er dagmulktbelagt, og satsen, så totalentreprenøren leser også satsen. Det endrer
  dagens tilgang, der bare byggherren får satsen (`koe_api.dagmulktssats`). Totalentreprenøren
  kjenner satsene uansett, fordi Del II punkt E.2.1 oppgir dem. Grunnlaget satsen regnes av
  (GFK-U16) og fullmaktene er ikke nevnt i GFK-U23 og leses som i dag bare av byggherren. Dette er
  en lesning av GFK-U18 og GFK-U23; den bør bekreftes av orkestratoren, men er ikke et nytt valg.
- **Hva brevet fryser:** brevet angir dagene for hver frist med fristens nummer og navn (KA-U74,
  U-1 i BF-20), og et sendt brev betyr det det sa da (MM-U50). Nummeret og navnet fryses derfor med
  brevet. Datoen står ikke i brevet (KA-U77). Brevet angir heller ikke satsen, etter U-1 i BF-20
  og prototypen; det har ikke et vedtak som kilde. Datoen og satsen leses fra fristtabellen når skjemaet og fullmakten trenger dem, slik forutsetningen i kommentaren
  30.10 i #721 sier.
- **Forlengelser avtalt utenfor løsningen:** datoen skjemaet viser, tar bare med enigheter i
  saker i løsningen: et svar TE har godtatt med dagene i første lag, eller dagene i en endringsordre
  TE har godtatt. Andre tas ikke med, og skjemaet sier det (KA-U77). Om forlengelser som er avtalt
  før løsningen ble tatt i bruk, skal kunne registreres, er et produktspørsmål utenfor runde C og
  bør føres som P-punkt i BF-20.
- **GFK-U19 og KA-U77 teller ikke det samme.** Fullmakten teller hverdagene fra fristen etter
  forlengelse «registrert som godkjent eller avtalt» (GFK-U19). Det kan omfatte dager byggherren
  har godkjent uten at totalentreprenøren har godtatt, mens datoen i skjemaet bare tar med
  enigheter (KA-U77). De to vedtakene gjelder ulike formål og kan stå hver for seg. Skal fullmakten
  bruke datoen i KA-U77, snevrer det inn GFK-U19. Det er ikke stilt som spørsmål her; byggeøkta
  følger GFK-U19 ordrett og teller også godkjente dager.
- **Migrasjonen:** før første ekte sak (`FOERSTE_EKTE_SAK` er ikke satt) kan tabellen for satsen
  erstattes i en vanlig migrasjon. Etter første ekte sak legger en `_tillegg`-fil bare til, og det
  gamle fjernes i utgivelsen etter (DL-U16).

## Spørsmål 1 (juridisk): Fristkravet når fristen ikke er registrert

**Bakgrunn.** Kravet om fristforlengelse knytter seg til en eller flere av fristene i kontrakten,
med dagene for hver frist (KA-U73, KA-U74). Fristene registreres av driften etter bestilling fra
byggherren (GFK-U22), og totalentreprenøren velger frist i kravet (GFK-U23). Vedtakene sier ikke hva
som skjer når fristen totalentreprenøren vil kreve forlenget, ikke er registrert: fordi
registreringen ikke er gjort ennå, fordi en frist er kommet til ved en endring, eller fordi
prosjektet ikke har registrert noen frister. (Andre setning i GFK-U17 gjelder en registrert frist
uten dato, ikke dette.)

**Belegg.** KA-U73, KA-U74, GFK-U22, GFK-U23, KA-U77, KA-U75, KA-U76, KA-U16; NS 8407 punkt 33.4, 33.6.1 og 33.6.2
(fristene for varsel og spesifisering som gjelder uansett registreringen).

**Alternativ A.** Kravet om fristforlengelse kan bare gjelde frister som er registrert for
prosjektet. Er fristen totalentreprenøren vil kreve forlenget, ikke registrert, eller har
prosjektet ingen registrerte frister, kan kravet ikke sendes fra løsningen før fristen er registrert
etter bestilling fra byggherren (GFK-U22). Varselet etter punkt 33.4 kan sendes uten frister
(VS-U15). Et krav totalentreprenøren har sendt utenfor løsningen i mellomtiden, kan ikke
registreres i løsningen. Forhold: snevrer inn KA-U73 (fristene i kontrakten blir de registrerte
fristene) og presiserer GFK-U23.
*Motstrid og arbeidsflyt:* om totalentreprenøren kan sende kravet i tide etter punkt 33.6.1 eller
svare på en forespørsel etter punkt 33.6.2, avhenger av en registrering byggherren bestiller.
Blindvei: kommer forespørselen etter punkt 33.6.2 før fristene er registrert, må kravet sendes
utenfor løsningen, og løsningen har i dag ingen måte å registrere et krav sendt utenfor (bare et
varsel, VS-U16). Saken i løsningen viser da ikke kravet byggherren har fått. Skal A velges, bør
registreringen av et slikt krav avgjøres samtidig.

**Alternativ B.** Kravet om fristforlengelse gjelder en eller flere frister i kontrakten.
Totalentreprenøren velger en frist som er registrert for prosjektet, eller angir en frist som ikke
er registrert, med nummeret, om den har et, og navnet kontrakten gir den. Kravet og brevet angir dagene for hver
frist på samme måte, og byggherren svarer på den som på de andre. For en frist som ikke er
registrert, viser skjemaet ingen ny dato og sier hvorfor, og dagene kan ikke verdsettes uten sats
(GFK-U3, GFK-U4). Løsningen kontrollerer ikke at en frist som ikke er registrert, finnes i
kontrakten, og likestiller den ikke med en registrert frist; det vurderer partene. En frist som
bare er angitt med nummer og navn, kobles aldri til en frist som senere registreres (KA-U16). I en
ny versjon kan totalentreprenøren selv erstatte en slik frist med den registrerte fristen, eller
rette en skrivefeil i nummeret eller navnet. Det er en erstatning av fristen, ikke et trekk, og
brevet sier at fristen er erstattet, ikke at kravet om den trekkes. Forhold: presiserer KA-U73,
KA-U77 og GFK-U23, og avgrenser trekket i KA-U75 og KA-U76 mot en erstatning.
*Motstrid:* uten en regel om erstatning ville en rettet eller byttet frist se ut som et trekk av
den gamle og en ny frist, og byggherren kunne gjøre gjeldende at trekket var et avkall (KA-U75,
KA-U76). Regelen om erstatning hindrer det. Den forutsetter at totalentreprenøren velger
erstatningen uttrykkelig; løsningen foreslår den ikke ut fra navnet (KA-U16).

**Anbefaling: B.** Belegg: KA-U73 knytter kravet til fristene i kontrakten, ikke til
registreringen. Med A kan totalentreprenørens frister etter punkt 33.6.1 og 33.6.2 løpe mens kravet
ikke kan sendes. Antakelse: at registreringen i praksis kan ligge etter kontrakten, særlig for
frister som kommer til ved en endring. Kostnaden for byggherren er at et svar på en slik frist
krever hele kjeden (GFK-U3, GFK-U4) så lenge kravet har fristen bare med nummer og navn, altså til
totalentreprenøren erstatter den med den registrerte fristen i en ny versjon. Kostnaden for
totalentreprenøren er at en feil i nummer eller navn står i brevet til den rettes i en ny versjon.

**Hva valget styrer.** Om fristkravet har en frist som bare er angitt med nummer og navn; om
skjemaet stopper totalentreprenøren når prosjektet mangler frister; om en ny versjon har en
erstatning ved siden av trekket; om første ekte sak forutsetter at fristene er registrert.

**Forholdet til eksisterende vedtak.** A snevrer inn KA-U73 og presiserer GFK-U23. B presiserer
KA-U73, KA-U77 og GFK-U23, og avgrenser KA-U75 og KA-U76 (en erstatning er ikke et trekk).

## Spørsmål 2 (juridisk, bekreftelse): Hva en hverdag er når forlengelsen verdsettes

**Bakgrunn.** Fullmakten og 30 %-grensen ganger satsen med antallet hverdager i forlengelsen,
regnet fra fristen kravet gjelder (GFK-U17, GFK-U19). Dagene i kravet er kalenderdager (S-2 i BF-20,
NS 8407 punkt 1.2). Vedtakene sier ikke hvilke dager som er hverdager. NS 8407 punkt 40.3 definerer
hverdag for dagmulkten, og punkt 6 skiller lørdag fra helligdag. Del II punkt E.2.1 gir satsen per
hverdag uten egen definisjon. Hva hverdag betyr i formelen for rigg og drift (Del II), er en annen
tolkning, som oppdragsgiver har kalt uavklart (#1724), og den avgjøres ikke her.

**Belegg.** GFK-U17, GFK-U19; NS 8407 punkt 40.3 og punkt 6; Del II punkt E.2.1.

**Alternativ A.** I GFK-U17 er en hverdag det NS 8407 punkt 40.3 regner som hverdag: mandag til
lørdag, unntatt søndager, helligdager og høytidsdager (1. og 17. mai). Forhold: presiserer GFK-U17.

**Alternativ B.** I GFK-U17 er en hverdag det kontrakten regner som hverdag for dagmulkten, når
kontrakten avtaler noe annet enn punkt 40.3. Driften registrerer regelen for prosjektet med
fristtabellen (GFK-U22); er det ikke registrert noe, gjelder A. Forhold: presiserer GFK-U17 og
GFK-U22.

**Anbefaling: A.** Belegg: punkt 40.3 definerer hverdag for dagmulkten, og E.2.1 avtaler ikke noe
annet. B trengs bare for en kontrakt som avtaler en annen definisjon; ingen slik kontrakt er kjent
(antakelse).

**Hva valget styrer.** Omregningen fra kalenderdager til hverdager i fullmakten og 30 %-grensen.

**Forholdet til eksisterende vedtak.** Presiserer GFK-U17 (begge), og GFK-U22 (B). Ingen motstrid
funnet.

## Tekniske valg (arbeidsvalg for orkestratoren, ikke spørsmål til oppdragsgiver)

**T-1. Fristens identitet og retting av fristtabellen.** Valgt av serverøkta: hver registrert
frist har et løpenummer i prosjektet som teknisk nøkkel, og kravet viser til det. Kontraktens
betegnelse for fristen (nummer og navn) fryses i brevet (MM-U50). Driften kan rette betegnelsen,
datoen, om fristen er dagmulktbelagt, og satsen. En frist kan fjernes bare så lenge prosjektet ikke
har saker. Datoen og satsen leses ved visning (KA-U77, #721 30.10).

**T-2. Hvor satsen regnes ut.** Satsen i kroner regnes av grunnlaget i GFK-U16 og GFK-U18 på
serveren, der fullmakten regnes, ikke i kjernen. Kjernen trenger bare fristens ID, nummer og navn
for kravet og brevet. Anbefaling: serveren.

**T-3. Hvordan fristene kommer inn i kjernen.** Som `kontraktsforkortelse`: serveren leser de
registrerte fristene i skrivetransaksjonen og gir dem i `Kontekst`. Kjernen avviser en frist-ID som
ikke er i konteksten, og fryser nummeret og navnet i hendelsen. Etter spørsmål 1 B har en frist i
kravet enten en ID eller bare nummer og navn.

## Svarene

Oppdragsgiver 13.11, ordrett: «1B, 2A». Spørsmålene ble lagt fram i økta som en nummerert liste i tekst. Spørsmål 1 hadde alternativene A og B, med anbefaling B. Spørsmål 2 hadde alternativene A og B, med anbefaling A.
