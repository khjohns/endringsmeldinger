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

Svar:

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

Svar:

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

Svar:

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

Svar:

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

Svar:

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

Svar:
