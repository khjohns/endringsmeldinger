# Spørsmål til oppdragsgiver, runde 2 (24.11)

Kontrollert mot `main` ved c5faa45. Lagret ordrett før de ble stilt (vedtaksskillen). Kildene er
kartleggingen av runde 2 for orkestratoren. Spørsmål 1 er juridisk og stilles som tekst. Spørsmål 2
ble ikke stilt. Spørsmål 3 er teknisk.

---

## 1. Juridisk, #2280. Kan en innsigelse mot én kravpost være vilkår for standpunktet til en annen kravpost?

**Bakgrunn.** #2280 samler i ett predikat per spor hva et standpunkt betyr for neste lag. Punkt 4 i
issuet spør hvilke innsigelser som kan være vilkår for et standpunkt i vederlaget. Spørsmålet gjelder
innsigelsen etter punkt 34.3.3 og oppgjørsformen; standpunktet etter punkt 34.4 gir ingen slik
virkning (KA-U64). OV-U32 sier at innsigelsene står først «i den utstrekning de rammer
standpunktet». Varselet etter punkt 34.3.3 og punkt 34.4 gjelder den enkelte kravposten (KA-U64,
VS-U56). Innsigelsene etter punkt 34.1.2 og 34.1.3 er alt regulert: punkt 34.1.2 rammer hele
kravet, og punkt 34.1.3 bare den særskilte posten (samlet i OV-U115). Kjernen gjør i dag
oppgjørsformen og innsigelsen etter punkt 34.3.3 til vilkår bare i samme kravpost.

**Alternativene.**

- **A (anbefalt):** «En innsigelse som gjelder én kravpost, rammer bare standpunktet til den
  kravposten. Den er ikke vilkår for standpunktet til en annen kravpost.» Forhold: presiserer OV-U32,
  følger KA-U64 og VS-U56.
- **B:** «En innsigelse som gjelder én kravpost, er også vilkår for standpunktet til en annen
  kravpost når den rammer den andre posten.» Forhold: endrer KA-U64 og utvider VS-U56. Alternativet
  sier ikke hvem som avgjør at innsigelsen rammer den andre posten.

**Hva valget styrer.** Lagene i brevet og svarskjemaet for vederlaget med flere kravposter. A
bekrefter dagens atferd.

---

## 2. Ikke stilt: #2144 punkt 2 er ført som arbeidsvalg

Kontrollen før spørsmålene ble stilt, fant at valget i praksis er avgjort av VS-U51, VS-U53 og
VS-U75 (punkt 24–25 i samlevedtaket VS-U77): fila ligger ved kravet nøyaktig én gang, gjennom
varseldokumentet. Valget gjelder bare kontrollen og ordlyden i meldingen. Det er ført som
arbeidsvalg B i #2144.

---

## 3. Teknisk, #2251. Rader i tilgangsloggen for avviste innlogginger uten sesjon

**Bakgrunn.** Tilbakekallet fra innloggingen kan kalles uten sesjon, og hver avvisning gir en rad i
tilgangsloggen. Kravet i #1804 er at avviste innlogginger logges med grunn.

**Alternativene.**

- **A (anbefalt):** avvisningene uten sesjon strupes i serveren, med én rad per grunn og minutt.
  Ingen migrasjon. Et forsøk på å forfalske innloggingen blir fortsatt synlig.
- **B:** et tilbakekall uten et lagret forsøk logges ikke.

**Svar fra oppdragsgiver 24.11**, ordrett: «A: Strup i serveren». Ført i #2251.

---

## Svar på spørsmål 1

**Svar fra oppdragsgiver 24.11**, ordrett: «A som anbefalt». Valgt A, forkastet B.
