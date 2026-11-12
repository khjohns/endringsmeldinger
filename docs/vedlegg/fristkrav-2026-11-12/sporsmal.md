# Spørsmål om fristkravet, 12.11

Spørsmålene gjelder BF-20 ([#1745](https://github.com/khjohns/endringsmeldinger/issues/1745)), bestillingen
[BF-20.md](../../domenetabell/brukerforlop/BF-20.md) og prototypen
[fristkrav-te.html](../../design/prototyper/fristkrav-te.html). Alle tre gjelder rettsregler og stilles som
nummerert liste i tekst. Kontraktsteksten gjengis ikke her (#424). Belegget er kontrollert mot NS 8407 og
Del II i `khjohns/kontrakt`.

Besvart før denne runden: S-1 ([KA-U73](../../plans/vedtak.md#ka-u73), [KA-U74](../../plans/vedtak.md#ka-u74))
og S-4 ([KA-U76](../../plans/vedtak.md#ka-u76)). Følger av vedtakene og stilles ikke: S-7 (KA-U1 og HF-U5) og
S-8, forhåndsvalget i svaret (KA-U4). Begrunnelsen står i bestillingen.

## Spørsmålene slik de stilles

**1. Hvilken dato den nye fristen regnes fra (S-3).**

Bakgrunn: Kravet angir dagene for hver frist i kontrakten (KA-U73, KA-U74), og skjemaet viser hvilken dato
hver frist får. Er fristen alt forlenget etter enighet i en annen sak, gir den avtalte fristen pluss dagene en
annen dato enn fristen som gjelder nå pluss dagene. Etter NS 8407 punkt 33.5 skal det tas hensyn til den
samlede virkningen av tidligere varslede forhold. OV-U63 sier at løsningen ikke tar hensyn til fristkrav i
andre saker og ikke summerer dagene på tvers av saker (EO-U8). Prototypen regner i dag fra fristen som gjelder
etter en forlengelse i en annen sak.

- **A:** Kravet og brevet angir dagene for hver frist. Skjemaet viser datoen fristen får regnet fra den avtalte
  fristen i kontrakten, og sier at forlengelser i andre saker ikke er tatt med. Forhold: følger OV-U63.
- **B (anbefalt):** Kravet og brevet angir dagene for hver frist. Skjemaet viser datoen fristen får regnet fra
  fristen slik den gjelder etter forlengelser partene er enige om i andre saker i samme kontrakt, og sier
  hvilke saker. Krav som ikke er avgjort i andre saker, tas ikke med. Brevet angir bare dagene, ikke datoen.
  Forhold: snevrer inn OV-U63 («Løsningen tar ikke hensyn til fristkrav i andre saker»): en enighet om dager i
  en annen sak tas med i datoen skjemaet viser.
- **C:** Kravet og brevet angir dagene for hver frist. Skjemaet viser ingen ny dato, bare fristen i kontrakten.
  Forhold: følger OV-U63. M-2 i bestillingen («se hvilken dato hver frist får») faller bort.

Anbefaling: B. Datoen TE ser, er da den TE faktisk får hvis kravet godtas, og den bygger bare på det partene
er enige om. Det binder ikke, fordi brevet bare angir dagene. Det er en antakelse, ikke prøvd, at TE trenger
datoen for å vurdere rekkefølgen mellom fristene. B krever at løsningen leser enighetene om dager i andre saker
og fristene i kontrakten (G-2), og ingen av delene er bygget.

Valget styrer: U-2 og U-5 i bestillingen, G-2, hva fristoversikten viser, og Z i formelen for rigg og drift
(#1724).

**2. Om kravet sier at forlengelsen gjelder hele kontraktsarbeidet eller deler av det (S-5).**

Bakgrunn: Del II, tillegget til punkt 34.1.3, sier at A i formelen for rigg og drift i forlenget byggetid skal
reduseres forholdsmessig når fristforlengelse bare er gitt for deler av arbeidene. Fristkravet regner ikke
formelen (avgrensningen i BF-20, oppdragsgiver 09.11). Prototypen har en lenke per frist, «Forlengelsen
gjelder bare deler av arbeidene».

- **A:** TE oppgir for hver frist i kravet om forlengelsen gjelder hele kontraktsarbeidet eller bare deler av
  det. Opplysningen er en del av kravet, brevet gjengir den, og byggherren kan svare på den. Løsningen regner
  ikke ut reduksjonen i formelen.
- **B (anbefalt):** Kravet har ikke en egen opplysning om det. TE beskriver i begrunnelsen om forlengelsen
  bare gjelder deler av arbeidene, og veiledningen i skjemaet viser til tillegget til punkt 34.1.3 i Del II.
  Løsningen registrerer det ikke særskilt.

Anbefaling: B. Løsningen regner ikke formelen, og en opplysning ingen regel leser, blir likevel et lagret navn
som må bevares (B-17). Det er vurderingen av hva som er «gitt» for deler av arbeidene, partene gjør, ikke
løsningen. Kostnaden er at en senere utregning av rigg og drift (#1724) ikke kan lese opplysningen av kravet.

Valget styrer: U-3 i bestillingen, formatet for kravet (G-1) og brevteksten.

**3. Rekkefølgen på lagene når byggherren både sier at fremdriften ikke ble hindret og at kravet ble
spesifisert for sent (S-6).**

Bakgrunn: Påberoper byggherren at kravet ble spesifisert for sent etter punkt 33.6.1, oppgir byggherren
prinsipalt det hen måtte forstå og subsidiært det hen godtar (VS-U4). Mener byggherren at fremdriften ikke ble
hindret, står dagene byggherren har vurdert, som et videre subsidiært standpunkt (B-13 frist uten
fremdriftshindring). Et standpunkt i et senere lag gjelder bare hvis innsigelsene i de foregående lagene ikke
fører fram (OV-U32). Når begge innsigelsene står i samme svar, sier ingen av vedtakene hvilken som kommer
først. Prototypen har spesifiseringen først.

- **A (anbefalt):** Påberoper byggherren både at fremdriften ikke ble hindret (punkt 33.1) og at kravet ble
  spesifisert for sent (punkt 33.6.1), står standpunktet om hindringen i laget før dagene byggherren måtte
  forstå: prinsipalt at fremdriften ikke ble hindret, subsidiært dagene byggherren måtte forstå, og videre
  subsidiært dagene byggherren godtar hvis spesifiseringen kom i tide. En påberopelse av at varselet kom for
  sent etter punkt 33.4, står før alle disse. Forhold: presiserer OV-U32 og VS-U4.
- **B:** Som A, men dagene byggherren måtte forstå står i laget før hindringen: prinsipalt dagene byggherren
  måtte forstå, subsidiært at fremdriften ikke ble hindret, og videre subsidiært dagene byggherren godtar.
  Forhold: presiserer OV-U32 og VS-U4.

Anbefaling: A. Med B gir det prinsipale standpunktet TE dager, mens det subsidiære gir ingen, så det
subsidiære går lenger enn det prinsipale. Med A går hvert lag kortere enn laget før.

Valget styrer: D-5 og U-12 i bestillingen, lagene i brevet og i «Lagene samlet», og rekkefølgen i
`fristsvar.html`.
