# BF-10: spørsmålene til oppdragsgiver

Spørsmålene i [bestillingen](BF-10.md) for BF-10, lagret ordrett før de ble stilt, etter
[vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md). Et svar som blir et vedtak, føres i
vedtaksregisteret.

Stilt oppdragsgiver i økta 06.11, som en nummerert liste i tekst. S-1 og S-2 gjelder brevteksten
og stilles derfor ikke med spørsmålsverktøyet. Svarene føres under hvert spørsmål.

**S-1. Brevteksten i en ny versjon av påberopelsen**

Bakgrunn: Når totalentreprenøren sender en ny versjon av påberopelsen, sier brevet hvilket brev
den erstatter. Fire vedtak har ordlyd for det:

- KA-U52 punkt 4 (05.11, samlevedtaket for kravversjon): ‹Dette kravet erstatter TEs tidligere
  kravversjon i brev <n> av <dato>.› Har byggherren svart, i tillegg: ‹TEs standpunkt til BHs
  tidligere svar fremgår av begrunnelsen.›
- LV-U41 (01.11), for forholdet: ‹Brevet erstatter totalentreprenørens <påberopelsen> i brev <n>
  av <dato>.›
- LV-U52 (04.11) endret den andre setningen: ‹TEs standpunkt til BHs svar i brev <n> i sak KOE-17
  av <dato> fremgår av begrunnelsen.›
- LV-U53 (04.11): henvisningen er ‹brev <merking> av <dato>›. Etter LV-U35 og språkfila skrives
  partene fullt ut i brevet.

KA-U52 sier at det samler MM-U34 punkt 1, men gjengir ordlyden fra før LV-U41 og LV-U52, og
nevner dem ikke. Kjernen skriver i dag ‹Kravet erstatter totalentreprenørens krav i brev …› og har
ikke setningen om standpunktet.

Kontrakten: NS 8407 regulerer ikke ordlyden.

- **A:** «Brevet med en ny versjon av påberopelsen sier: ‹Brevet erstatter totalentreprenørens
  påberopelse i brev <merking> av <dato>.› Har byggherren svart på versjonen som erstattes,
  legger brevet til: ‹Totalentreprenørens standpunkt til byggherrens svar i brev <merking> av
  <dato> fremgår av begrunnelsen.› Svaret er det siste byggherren har gitt på versjonen som
  erstattes (LV-U51), og står svarene i flere brev, nevnes hvert av dem (LV-U52). Endret tekst
  gjelder bare nye brev (MM-U9).» Forhold: presiserer KA-U52 punkt 4 for forholdet, i tråd med
  LV-U41, LV-U52, LV-U53 og LV-U35.
- **B:** «Brevet med en ny versjon av påberopelsen sier: ‹Dette kravet erstatter
  totalentreprenørens tidligere kravversjon i brev <merking> av <dato>.› Har byggherren svart på
  versjonen som erstattes, legger brevet til: ‹Totalentreprenørens standpunkt til byggherrens
  svar i brev <merking> av <dato> fremgår av begrunnelsen.› Resten som i A.» Forhold: KA-U52
  punkt 4 med LV-U52, LV-U53 og LV-U35; endrer LV-U41 for en ny versjon.

Anbefalt: A. Forholdet heter påberopelse i brevene (GR-U31), og LV-U41 og LV-U52 er de siste
vedtakene om akkurat disse setningene. Ny versjon av vederlags- og fristkravet (BF-02B, #1379)
berøres ikke.

Valget styrer brevteksten i kjernen (`kjerne/frosset/brevtekst.ts`) og D-4 i bestillingen.

Svar 06.11, ordrett: «"Erstatter" er for rigid. I praksis vil TE/BH ofte vise til tidligere brev, og evt. utdybe, revidere, justere, osv. Det kommer helt an på situasjonen. Jeg tror vi må beslutte brevtekst ved å se hele brevteksten samlet, for ulike scenarioer. De tidligere vedtakene er da til inspirasjon - ikke en fasit.»

Hele brevteksten for seks tilfeller står i [BF-10-brevtekst.md](BF-10-brevtekst.md), og S-1 avgjøres der (S-8).

**S-2. Tittelen på brevet med en ny versjon av påberopelsen**

Bakgrunn: Det første brevet heter «Påberopelse av <forholdet>» (GR-U31). Kjernen gir en ny
versjon samme tittel. Korrigeringen heter «Korrigering av datoen i sak <kode>» (LV-U55).
Prototypen for vederlagskravet har «…, ny versjon» i tittelen.

- **A:** «Brevet med en ny versjon av påberopelsen har tittelen ‹Påberopelse av <forholdet>, ny
  versjon›, med sakens kode som i det første brevet (LV-U27).» Forhold: presiserer GR-U31.
- **B:** «Brevet med en ny versjon har samme tittel som det første, ‹Påberopelse av
  <forholdet>›. At det er en ny versjon, står i den første setningen i brevet (S-1).» Forhold: i
  tråd med GR-U31.

Anbefalt: A. Brevtråden og tidslinja viser tittelen, og to brev med samme tittel er vanskelige
å skille.

Valget styrer tittelen i kjernen (`kjerne/frosset/brevtittel.ts`).

Svar 06.11, ordrett: «"Ny versjon" er litt rart. JEg tenker samme tittel er best, evt. revisjon x. Ulempen er at for akkurat forhold kan det være vanskelig å skille ny versjon/revisjon og "innlegg" (ikke bygget ennå) da begge i praksis bare er fritekst. For brukeren er det liten forskjell, selv om løsningen tolker det som to ulike ting. Vi kan evt. vurdere å fjerne innlegg for forhold - og kun ha det for krav (vederlag og frist). For krav er det åpenbart noe anderledes - da innlegg ikke innebærer utfyllelse av et strukturert kravskjema.»

Arbeidsvalg: samme tittel som det første brevet (GR-U31). Om tittelen får «revisjon <n>», avgjøres med S-8. Innlegget i forholdet er S-7.

**S-3. Beskrivelsen og begrunnelsen**

Bakgrunn: Brevet sier at standpunktet til svaret fremgår av begrunnelsen (S-1). Kravet har i dag
ett felt for fritekst under den låste teksten, og i skjemaet for ny sak heter det «Beskrivelse av
pålegget». En ny versjon erstatter den tidligere, så beskrivelsen må stå i sin helhet i den nye.

- **A:** To felt. «Beskrivelse» står ferdig utfylt med beskrivelsen fra versjonen som erstattes,
  og totalentreprenøren kan utdype den. «Begrunnelse» er tomt og vises bare når byggherren har
  svart, med påminnelsen om å presisere standpunktet til svaret ved feltet. Brevet har to avsnitt
  med overskriftene «Beskrivelse» og «Begrunnelse». Kjernen får et eget felt for begrunnelsen i
  kravet.
- **B:** Ett felt, «Beskrivelse og begrunnelse», ferdig utfylt med beskrivelsen. Påminnelsen
  står ved feltet. Brevet har ett avsnitt, og kjernen endres ikke.

Anbefalt: A. Setningen i brevet viser da til et avsnitt som heter «Begrunnelse», og byggherren
ser hva som er nytt.

Svar 06.11, ordrett: «B. Både TE/BH skriver sammenhengende. Det er ikke naturlig i en slik rettslig sparring å skille mellom beskrivelse og begrunnelse.»

Arbeidsvalg: ett felt, og kjernen endres ikke.

**S-4. Formen på utkastet og brevet i skjemaene**

Bakgrunn: Prototypene har to former. I svarskjemaene, og i svaret på vederlagskravet i Varden,
står hele skjemaet i et kort med stiplet kant og et gult hode med «Utkast · ikke sendt», og
brevet vises i brevkontrollen etter «Se brevet før sending». I skissen for korrigeringen står en
utkastlinje uten ramme, brevet står ved siden av skjemaet mens totalentreprenøren skriver, og
korrigeringen sendes rett fra skjemaet. Skjemaet for ny sak har ingen av delene. Systemfila sier
at utkastet har stiplet kant rundt hele kortet.

- **A:** Alle skjemaene har utkastkortet fra svarskjemaet. «Oppdater påberopelse» og ny sak går
  gjennom brevkontrollen. Korrigeringen har brevet ved siden av og sendes fra skjemaet, som i
  skissen, fordi brevet er kort og datoen er det eneste feltet.
- **B:** Alle skjemaene har utkastkortet og går gjennom brevkontrollen, også korrigeringen.
- **C:** Som A, men korrigeringen beholder utkastlinja uten ramme, som i skissen.

Anbefalt: A.

Svar 06.11, ordrett: «Forklar nærmere "Korrigeringen viser brevet ved siden av skjemaet og sendes rett fra skjemaet, som i skissen.". Hvor ser jeg dette? Gi meg evt. et skjermbilde. Hvorfor ikke korrigering gjennom brevkontroll? Er ikke grei UX at det er samme brukerflyt?»

Skjermbildet av `#korrigering` i skissen er sendt i økta. Oppfølgingen er S-4b.

**S-5. Hvor mye av brevstrukturen som bygges nå**

Bakgrunn: Brevet i Varden har avsender, mottaker, sak, Deres ref., Vår ref., dato, tittel og
teksten. Prototypen `godkjenning-vederlagssvar.html` har i tillegg logo, mottakerens
kontaktperson og adresse, saksbehandler, nummererte punkter med hjemmel, lagslinjer,
oversiktstabell, underskrifter, vedlegg og kopi, og «Dato, brevnummer og tidspunkt settes når
brevet sendes». Punktene, lagslinjene og tabellen i byggherrens svar står i #1433, som venter på
vedtak. Brevhodet etter Oslo-malen står i #1173 og trenger opplysninger serveren ikke har ennå.

- **A:** Nå bygges rammen for alle brev i Varden: hodet med opplysningene løsningen har, linja
  med vedlegg, avsenderen nederst og linja om dato og brevnummer i et brev som ikke er sendt.
  Påberopelsen får avsnittene etter S-3. Logo, kontaktperson, adresse og kopi venter på #1173, og
  punktene i byggherrens svar på #1433.
- **B:** Som A, og i tillegg punktene, lagslinjene og tabellen i byggherrens svar etter #1433,
  når vedtakene der er ført.
- **C:** Bare utkaststilen nå. Brevstrukturen bygges med #1173 og #1433.

Anbefalt: A. B venter på vedtakene i #1433 og ville holde igjen resten.

Svar 06.11: «5.A».

**S-6. Fordelingen av byggingen**

Bakgrunn: Grenen `claude/sleepy-pascal-z340j6` har `main` med #1631 og grenen til #1618 flettet
inn. Arbeidet har en del i kjernen (S-1–S-3 og låsen for endringsordren, G-3) og en del i Varden
(korrigeringen ved datoen, datoopplysningene, skjemaet for «Oppdater påberopelse», utkaststilen
og brevrammen). De to delene rører ulike filer.

- **A:** Denne økta fører svarene i bestillingene og vedtakene i en egen liten PR, og starter to
  byggeøkter: én for kjernen, med feilinnføring, og én for Varden. Varden-økta begynner med
  korrigeringen og skjemaet, og tar brevteksten fra kjernen når den er merget. PR-en fra denne
  grenen erstatter #1618, som lukkes.
- **B:** Denne økta bygger alt i én PR, i rekkefølge.
- **C:** Tre byggeøkter: kjernen, skjemaene i Varden, og brevrammen med utkaststilen for seg.

Anbefalt: A. Kjernen og Varden kan bygges samtidig, og hver PR får et review den kan bære.

Svar 06.11: «6. A».

## Oppfølgingen 06.11

Stilt oppdragsgiver i økta 06.11, etter svarene over, som en nummerert liste i tekst.

**S-4b. Korrigeringen gjennom brevkontrollen**

Bakgrunn: I skissen står skjemaet for korrigeringen til venstre og «Brevet slik det blir» til
høyre, og «Send korrigeringen» sender rett fra skjemaet. Ellers i Varden, i svaret på
vederlagskravet og i skjemaet for ny sak, viser «Se brevet før sending» hele brevet i
brevkontrollen, med virkningene og mottakeren, og brevet sendes derfra.

- **A:** Korrigeringen går gjennom brevkontrollen, som de andre skjemaene. Skjemaet har
  utkastkortet, datofeltet og forklaringen, og høyre kolonne har panelet med hovedlinjene og
  «Se brevet før sending». Brevet står ikke ved siden av mens totalentreprenøren skriver.
- **B:** Som skissen: brevet ved siden av og sending fra skjemaet.

Anbefalt: A. Samme flyt for alle brev, og brevkontrollen viser brevhodet og virkningene som i
de andre brevene. Skissen sparte ett klikk for et kort brev, og det veier mindre.

Svar 06.11, ordrett: «Korrigering går også gjennom brevkontrollen. Samme design og UX.»

**S-7. Innlegget i forholdet**

Bakgrunn: Når påberopelsen er sendt, står forholdet, hjemmelen, endringsordren og datoen
(MM-U52 punkt 10 og 14). En ny versjon av påberopelsen kan derfor bare endre friteksten, og et
innlegg er også fritekst (MM-U34 punkt 24, MM-U47). Forskjellen er virkningen i løsningen: etter
en ny versjon venter forholdet på nytt svar, og byggherrens svar på den tidligere versjonen kan
ikke godtas i løsningen (KA-U52 punkt 3). Et innlegg lar svaret stå, og det kan godtas.
Innlegget er ikke bygget (#1377).

NS 8407 kjenner ikke «ny versjon» eller «innlegg». Varselet etter punkt 32.2 gis én gang, og
senere brev om samme forhold er utdyping og argumentasjon. Løsningen avgjør ikke om et nytt brev
gir byggherren en ny svarplikt.

- **A:** «I forholdet sender totalentreprenøren en ny versjon av påberopelsen, ikke et innlegg.
  Innlegget gjelder vederlag og frist, og byggherrens senere begrunnelse.» Forhold: snevrer inn
  MM-U34 punkt 24 og MM-U47 for totalentreprenøren i forholdet; i tråd med KA-U52 punkt 2.
- **B:** «I forholdet sender totalentreprenøren et innlegg. Ny versjon av påberopelsen tilbys
  ikke, fordi den ikke kan endre noe som står fast.» Forhold: snevrer inn KA-U52 punkt 1 for
  forholdet. Primærhandlingen etter svaret blir innlegget.
- **C:** Begge beholdes, som i dag.

Anbefalt: A. Totalentreprenøren har én vei, og «Oppdater påberopelse» (06.11) står. Vil
totalentreprenøren godta svaret, er «Godta svaret» en egen handling.

Svar 06.11: «7 A».

**S-8. Brevteksten i en ny versjon av påberopelsen, samlet**

Bakgrunn: Brevet for seks tilfeller i tre former står i [BF-10-brevtekst.md](BF-10-brevtekst.md).

- **A:** Første setning viser til påberopelsen og eventuelt svaret: ‹Totalentreprenøren viser
  til påberopelsen i brev <merking> av <dato>[ og byggherrens svar i brev <merking> av
  <dato>].› Deretter står hva påberopelsen gjelder, med hjemmelen og datoen, i nåtid og uten å
  varsle på nytt. Brevet sier ikke at noe erstattes, og friteksten sier resten.
- **B:** Bare hva påberopelsen gjelder, med hjemmelen og datoen. Henvisningen står i brevhodet
  og i friteksten.
- **C:** Som i dag: hele teksten fra det første brevet og ‹Kravet erstatter …›.

Tittelen: samme som det første brevet, eller med «revisjon <n>».

Påminnelsen om å si standpunktet til svaret står som hjelpetekst ved feltet, ikke i brevet.

Anbefalt: A, samme tittel, og påminnelsen som hjelpetekst.

Svar 06.11, ordrett: «Punkt 8: Språk må være tydelig, men også forståelig. Klar språk. F.eks. i forslaget "Totalentreprenøren viser til påberopelsen i brev K201-KOE-017-01 av 1. oktober 2026. Påberopelsen gjelder irregulær endring (NS 8407 punkt 32.1) for «Flytting av ventilasjonskanaler etter pålegg på byggemøte» i sak KOE-17. Totalentreprenøren opplyser at pålegget ble mottatt 15. september 2026". Er det bedre med siste setning "Pålegget ble mottatt 15. september 2026"? Etter avslag: Mest naturlig å vise enten kun til siste svar fra BH - eller rett og slett ingenting. Opp til partene hvordan de ønsker å formulere seg mest naturlig. Brevene legges uansett i saken, så oversikten ligger der. Etter et svar om for sent varsel: Jeg heller også mot fritekst. Da slipper løsningen å tolke om det ble gitt avslag, eller BH mente frist ble fremsatt for sent, eller begge. Etter en korrigering av datoen: Her er det vel best å vise kun til brevet der opprinnelig dato, og evt. opprinnelig, og første korrigerte (hvis dette er korrigering nr. 2),. Øvrige forhold: Du kan vurdere baserrt på prinsippene og mønstrene jeg har vist til ovenfor.»

Forslaget etter svaret er S-8b.

## Oppfølgingen etter S-8

Stilt oppdragsgiver i økta 06.11, som en nummerert liste i tekst.

**S-8b. Brevteksten i en ny versjon av påberopelsen, etter svaret på S-8**

Bakgrunn: Svaret på S-8 sier at språket skal være klart, at henvisningen til svaret står i
friteksten etter partenes ønske, eller ikke i det hele tatt, og at brevet etter en korrigering
viser til brevet med den opprinnelige datoen. Hele brevet for hvert tilfelle står i
[BF-10-brevtekst.md](BF-10-brevtekst.md#forslaget-etter-svaret-på-s-8).

- **A:** «Den låste delen av brevet med en ny versjon av påberopelsen sier bare hva
  påberopelsen gjelder, og datoen. Endring, unntatt endringsordre: ‹Påberopelsen gjelder
  <forholdet> (NS 8407 punkt <hjemmel>) for «<tittel>» i sak <kode>. Pålegget ble mottatt
  <dato>.› Svikt og andre forhold: ‹Påberopelsen gjelder <forholdet> (NS 8407 punkt <hjemmel>,
  jf. punkt 33.1 <b/c> og 34.1.2) for «<tittel>» i sak <kode>. Totalentreprenøren ble klar over
  forholdet <dato>.› Endringsordre: ‹Påberopelsen gjelder endringsordre «<dato eller nummer>»
  fra byggherren (NS 8407 punkt 31.3) for «<tittel>» i sak <kode>.› Har totalentreprenøren
  korrigert datoen, legger brevet til: ‹Totalentreprenøren oppga tidligere <dato> i brev
  <merking> av <dato>.›, med hver tidligere dato og brevet den ble oppgitt i, den opprinnelige
  først. Brevet viser ikke til tidligere brev ellers, sier ikke at noe erstattes, og gjentar
  ikke varselet etter punkt 32.2. Henvisningen til byggherrens siste svar står under Deres ref.
  (LV-U50). Tittelen er den samme som i det første brevet. Friteksten står under. Endret tekst
  gjelder bare nye brev (MM-U9).» Forhold: endrer KA-U52 punkt 4, LV-U41 og LV-U52 for
  forholdet, og LV-U54 (samlet i MM-U52 punkt 10).
- **B:** Som A, men datoen står som i dag: ‹Totalentreprenøren opplyser at pålegget ble mottatt
  <dato>.›

Anbefalt: A. Brevet er fra totalentreprenøren, så setningen om datoen er totalentreprenørens
opplysning uten «Totalentreprenøren opplyser at».

Svar:

**S-8c. Setningen om datoen i det første brevet**

Bakgrunn: Det første brevet sier i dag ‹Totalentreprenøren opplyser at pålegget ble mottatt
<dato>.› (VS-U26). Med S-8b A får den nye versjonen ‹Pålegget ble mottatt <dato>.›

- **A:** Det første brevet får samme setning som den nye versjonen: ‹Pålegget ble mottatt
  <dato>.› og ‹Totalentreprenøren ble klar over forholdet <dato>.› Resten av det første brevet
  står. Endret tekst gjelder bare nye brev (MM-U9). Forhold: endrer VS-U26 (samlet i VS-U43).
- **B:** Det første brevet står som i dag.

Anbefalt: A. Samme opplysning står likt i begge brevene.

Svar:
