# Spørsmål til oppdragsgiver 20.10

Spørsmålene etter prøvingen av [svaret fra sparringen](svar-sparring.md), lagret
ordrett slik de ble stilt med spørsmålsverktøyet: overskriften, spørsmålet og hvert
alternativ med etikett og beskrivelse. Svarene føres inn ordrett under hvert
spørsmål. En subagent prøvde utkastet mot 3.1, 3.4, invariantene og koden før
spørsmålene ble stilt. Den fant tre feil i premissene, som er rettet. Spørsmål 3
hvilte på et skille mellom «før første ekte sak» og «ved produksjonsporten» som
ikke finnes, fordi ingen utrulling skjer før produksjonsporten (vedtaket 17.09).

## 1. Leveringen som stanser (MD-06, innvending 1)

**Overskrift:** Levering

**Spørsmål:** Et brev er sendt når det er lagret, og appen regner bindingen og
akseptfristen fra sendingen, uten å avgjøre når brevet er kommet fram (LV-U7).
Leveringen til Catenda kan stanse fordi utfallet er usikkert eller Catenda avviser
den. Usikkert utfall skal parkeres og varsles (invariant 7), men varslingen er
ikke bygget, og den som leser saken, ser i dag «ikke levert ennå», som for en
levering som er underveis. Leveringene i en sak venter ikke på hverandre utover
ventingen på topicen (LV-U9), så et senere brev kan ligge i Catenda før et
tidligere. Om å holde igjen handlinger har oppdragsgiver tidligere lagt vekt på at
en tapt frist ikke kan repareres (merknaden til B-04, punkt 4). Hva skal gjelde
når en levering stanser? Anbefaling: A.

- **A. Vises, med veiledning (anbefalt)** — Når leveringen av et brev til Catenda
  er stanset fordi utfallet er usikkert eller Catenda har avvist den, ser den som
  leser saken, at leveringen er stanset, og drift varsles. Er brevet et varsel med
  frist, sier visningen at varselet bør sendes utenfor appen og registreres, uten
  at noe sperres. Appen avgjør ikke hva stansen betyr for når brevet er kommet
  fram (LV-U7). Leveringene i en sak venter ikke på hverandre utover ventingen på
  topicen (LV-U9), så et brev kan ligge i Catenda før et brev som ble sendt
  tidligere, og hvert brev viser når det ble sendt. Presiserer LV-U7 og
  invariant 7.
- **B. Vises, uten veiledning** — Som A, men uten veiledningen om å sende
  varselet utenfor appen. Presiserer LV-U7 og invariant 7.
- **C. I rekkefølge** — Som B, men et brev leveres ikke til Catenda før de
  tidligere brevene i saken er levert. Et stanset brev holder igjen de senere til
  drift har løst det, også et varsel med frist. Bindingen og fristene regnes
  fortsatt fra sendingen (LV-U7). Utvider LV-U9.
- **D. Ingen nye brev** — Som B, men så lenge en levering i saken er stanset,
  godtar appen ingen nye brev fra avsenderen i saken. Registrering etter OV-U4
  godtas fortsatt. En ny sperre; utvider MM-U2 til en feil i leveringen.

**Svar:** …

## 2. Brev appen ikke kan sende (innvending 2, prinsipp 5)

**Overskrift:** Ukjent brev

**Spørsmål:** Sparringen trodde at alt appen ikke forstår, sperrer saken, og
foreslo å endre prinsippet. Vedtakene er smalere: saken stopper når kjernen ikke
kan tolke en hendelse i journalen, eller når en hendelse strider mot bestemte
vedtak, som de om enighet og lukking (MM-U2, MM-U18, MM-U27). Et brev med innhold
appen ennå ikke kan sende, sendes utenfor appen og registreres som dokumentasjon
(OV-U4, OV-U7), og registreringen godtas også i en sak som ikke er forstått
(OV-U4). MM-U2 forkastet «å la TE sende varsler i en slik sak, fordi kontrollen
av varselet trenger tilstanden». Sparringen foreslår at en part i en sak som ikke
er forstått, likevel kan sende et brev fra appen, uten kontroll og uten at appen
viser hva det betyr. Forskjellen fra i dag er at appen leverer brevet. Skal MM-U2
stå? Anbefaling: A.

- **A. MM-U2 står (anbefalt)** — MM-U2 står. I en sak som ikke er forstått,
  sendes et varsel med frist utenfor appen og registreres etter OV-U4.
  Sparringens forslag forkastes.
- **B. Brev uten kontroll** — I en sak som ikke er forstått, kan en part sende
  et brev fra appen som appen ikke kontrollerer eller vurderer: avsenderen skriver
  teksten selv, appen viser ingen virkning og fryser ingen vurdering, brevet
  leveres som andre brev, og avsenderen er bundet av det hen sender (OV-U4).
  Endrer MM-U2 ved å godta en variant av det MM-U2 forkastet, og endrer LV-U2 og
  LV-U3 for slike brev.

**Svar:** …

## 3. Vedleggene i eksporten (MD-07, innvending 3)

**Overskrift:** Vedlegg

**Spørsmål:** Brevene, teksten og PDF-ene bevares i appens egen base, men
vedleggene bare i Catenda: når Catenda har kvittert, sletter appen filen og
beholder hash og frosset grunnlag, og brevet viser ID, filnavn og hash (P4,
LV-U12, LV-U14). LV-U12 forkastet 18.10 å beholde filen til bevaringstiden er
avgjort i B-05. Etter invariant 10 og AF-04 er hash alene ikke bevis, og etter
akseptkriteriet i F4 skal en sak kunne legges fram uten at appen kjører. Hva
Catenda garanterer av bevaring, er ikke kontrollert. Sparringen mener en sak må
kunne leses uten appen og Catenda, med vedleggene. Hva skal eksporten av en sak
omfatte? Anbefaling: A.

- **A. Vedleggene med (anbefalt)** — Eksporten av en sak (F4) omfatter
  vedleggene, ikke bare hashen. B-05 avgjør hvor de bevares fram til eksporten,
  og til da gjelder LV-U12. Presiserer AF-04 og invariant 10.
- **B. Egen kopi nå** — Appen beholder en uforanderlig kopi av hvert vedlegg i
  egen lagring også etter at Catenda har kvittert, til bevaringstiden er avgjort
  i B-05. Endrer LV-U12 ved å godta det LV-U12 forkastet, og presiserer P4.
- **C. Henvisning i eksporten** — Eksporten viser til vedleggene i Catenda med
  ID, filnavn og hash, uten filene. P4 og LV-U12 står.

**Svar:** …

## 4. Det som gjelder hele kontrakten (NS 8407-punktene, MD-11)

**Overskrift:** Kontrakten

**Spørsmål:** Appen fører én journal per endringssak. Sparringen peker på
meddelelser som gjelder hele kontrakten: sluttoppstillingen og innsigelsene mot
den (§ 39), overtakelsen som fristen i § 35.2 regnes fra, og
tvisteløsningsskritt. Ingen vedtak gjelder § 39; VS-U9 nevner unntaket for
sluttoppgjøret i § 5 tredje ledd. VS-U3 viser fristen i § 35.2 uten dato. Skal
målbildet dekke det som gjelder hele kontrakten? Anbefaling: A.

- **A. Utenfor appen (anbefalt)** — Appen dekker endringssakene.
  Sluttoppgjøret, overtakelsen og tvisteløsningen føres utenfor appen, og fristen
  i § 35.2 vises uten dato. I tråd med VS-U3 og VS-U9.
- **B. Overtakelsen registreres** — En part kan registrere overtakelsen én gang
  for kontrakten, og den vises ved § 35.2 som dokumentasjon, uten dato for
  fristen og uten at appen utleder noe av den. Sluttoppgjøret og
  tvisteløsningen føres utenfor appen. Presiserer VS-U3.
- **C. Hele kontrakten i målbildet** — Målbildet dekker meddelelser for hele
  kontrakten: en part kan registrere overtakelsen, og sluttoppstillingen og
  innsigelsene mot den viser til kravene i sakene de gjelder. Fristen i § 35.2
  vises fortsatt uten dato. Det bygges ikke i første versjon, og formen avgjøres
  sammen med B-01. Utvider målbildet; presiserer VS-U3.

**Svar:** …
