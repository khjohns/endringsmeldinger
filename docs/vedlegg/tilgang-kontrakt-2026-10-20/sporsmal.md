# Spørsmål til oppdragsgiver 20.10: kontrakten og hvem som leser

Spørsmålene til [#1056](https://github.com/khjohns/endringsmeldinger/issues/1056).
De er lagret ordrett slik de stilles med spørsmålsverktøyet, med overskrift,
spørsmål og hvert alternativ med etikett og beskrivelse. Svarene føres inn ordrett
under hvert spørsmål.

Påstandene om appens atferd er lest i migrasjonene og serveren 20.10:

- Et prosjekt i appen kobles til ett Catenda-prosjekt, og et Catenda-prosjekt til
  ett prosjekt i appen (`koe.catenda_project_configs`, `catenda_project_id` er unik).
- Medlemmene synkroniseres fra hele Catenda-prosjektet
  (`koe_api.synkroniser_medlemskap`).
- Å lese saken og journalen krever bare et aktivt medlemskap
  (`koe_sikkerhet.medlem`). Det er «offentlig lesing» i B-02, alternativ C
  ([design v2](../../design-b02-tilgangsmekanisme-v2-2026-09-23.md)).
- Å sende krever at brukeren er med i et team som er registrert for TE eller BH.
  Serveren slår opp teamet i Catenda (`krevKontraktsrolle` i
  `server/autorisasjon.ts`).
- Drift registrerer teamene for TE og BH (B-02 punkt 4), og en side kan ha flere
  team (`koe_drift.sett_kontraktsteam`).

## 1. Kontrakter per prosjekt

**Overskrift:** Kontrakten

**Spørsmål:** Et prosjekt i appen er koblet til ett Catenda-prosjekt. Drift
registrerer hvilke Catenda-team som er TE og hvilke som er BH (B-02 punkt 4), og
en side kan ha flere team, for eksempel totalentreprenøren og rådgiverne hens.
Ingen vedtak sier om ett prosjekt kan omfatte mer enn én entreprisekontrakt. Har
byggherren to kontrakter med hver sin totalentreprenør i samme Catenda-prosjekt,
og begge registreres som TE, kan hver av dem i dag lese den andres saker, krav og
beløp, og sende brev i dem. Kan ett prosjekt i appen omfatte mer enn én
entreprisekontrakt? Anbefaling: A.

- **A. Én kontrakt per prosjekt (anbefalt)** — Et prosjekt i appen gjelder én
  entreprisekontrakt mellom byggherren og én totalentreprenør. Teamene som drift
  registrerer for TE, hører alle til denne totalentreprenøren, og drift bekrefter
  det når teamene registreres. Har et Catenda-prosjekt flere entreprisekontrakter,
  kan appen brukes for bare én av dem. Presiserer B-02 punkt 4.
- **B. Flere kontrakter, skjermet** — Et prosjekt kan omfatte flere
  entreprisekontrakter. Hver sak hører til én kontrakt, og bare partene i den
  kontrakten kan lese og sende brev i saken. Kontrakten blir et eget begrep i
  appen og bygges før første ekte sak. Utvider B-02.

**Svar:** ikke stilt.

## 2. Hvem som leser sakene

**Overskrift:** Lesing

**Spørsmål:** I dag kan alle aktive medlemmer av Catenda-prosjektet lese sakene
og brevene i appen, også de som ikke er med i et team for TE eller BH, for
eksempel andre entreprenører eller rådgivere i samme Catenda-prosjekt. Å sende
brev krever at man er med i et team for TE eller BH. At alle medlemmer leser,
følger B-02 (alternativ C, 23.09). Brevene i en endringssak går mellom
kontraktspartene og kan ha priser og forretningsforhold. Hvem skal kunne lese
sakene? Anbefaling: A.

- **A. Bare kontraktspartene (anbefalt)** — Sakene og brevene kan leses av dem
  som er med i et team som drift har registrert for TE eller BH i prosjektet, og
  av dem drift har gitt leserolle. Andre medlemmer av Catenda-prosjektet ser ikke
  sakene. Kan appen ikke bekrefte teamet, vises ingenting. Endrer B-02 for lesing
  av saker og brev.
- **B. Alle i Catenda-prosjektet** — Alle aktive medlemmer av Catenda-prosjektet
  kan lese sakene og brevene, som i dag. Hvem som er med i Catenda-prosjektet,
  styres i Catenda. B-02 står.

**Svar:** ikke stilt.
