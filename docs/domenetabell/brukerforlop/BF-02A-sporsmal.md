# BF-02A: spørsmålene til oppdragsgiver

Spørsmålene i [bestillingen](BF-02A.md) for BF-02A, BF-02C og BF-02D, lagret ordrett før de ble
stilt, etter [vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md). Et svar som blir et
vedtak, føres i vedtaksregisteret av orkestratoren.

Stilt oppdragsgiver i økta 05.11, ordrett slik de ble lagt fram. Svarene føres under hvert
spørsmål.

**S-1. Totalentreprenørens forklaring i brevet med korrigeringen**

Bakgrunn: Brevet med korrigeringen har den vedtatte teksten i punkt 10 i samlevedtaket for
retting av sendt brev: ‹Totalentreprenøren oppgir nå at pålegget ble mottatt <dato>. I brev
<merking> av <dato> oppga totalentreprenøren <dato>.› Brevet sier ikke hvorfor datoen endres.
Kravet og svaret har en utdyping i fritekst under den låste teksten (KA-U31, KA-U33, GR-U15).
MM-U34 punkt 24 sier at totalentreprenørens utdyping sendes som innlegg, og innlegget er ennå
ikke bygget (#1377). Løsningen tolker ikke fritekst (KA-U16, MM-U47 punkt 4).

Kontrakten: NS 8407 regulerer ikke formen. Vår tolkning: byggherren trenger grunnen for å ta
stilling til den nye datoen etter punkt 11.

- **A:** «Brevet med korrigeringen etter punkt 10 i samlevedtaket for retting av sendt brev kan
  ha totalentreprenørens forklaring i fritekst under den vedtatte teksten. Forklaringen er
  valgfri, og løsningen tolker den ikke.» Forhold: presiserer punkt 10 og avgrenser MM-U34
  punkt 24 for korrigeringen.
- **B:** «Brevet med korrigeringen har bare den vedtatte teksten i punkt 10. Totalentreprenøren
  forklarer korrigeringen i et innlegg med henvisning til brevet (MM-U34 punkt 24).» Forhold:
  følger MM-U34 punkt 24.

Anbefalt: A. Byggherren ser grunnen i det samme brevet som den nye datoen, og totalentreprenøren
kan forklare seg før innlegget er bygget. Det A koster: kommandoen får et nytt valgfritt felt,
og fritekst kan si mer enn korrigeringen gjør. Det B koster: før #1377 kan totalentreprenøren
ikke forklare korrigeringen fra løsningen, og byggherren ser bare to datoer.
Valget styrer: kommandoen, skjemaet (U-2, U-3) og brevteksten.

**S-2. Tittelen på brevet med korrigeringen**

Bakgrunn: Hvert brev fra løsningen har en tittel med sakens kode (LV-U27), som
«Påberopelse av irregulær endring i sak KOE-17» og «Aksept av svaret i sak KOE-17». Brevet med
korrigeringen har ingen tittel i dag og står som «Brev» i tidslinjen (G-6).

- **A:** «Brevet med korrigeringen etter punkt 10 i samlevedtaket for retting av sendt brev har
  tittelen ‹Korrigering av datoen i sak <kode>›.»
- **B:** «Brevet med korrigeringen har tittelen ‹Korrigering av datoen pålegget ble mottatt i sak
  <kode>›, og i svikt og andre forhold ‹Korrigering av datoen totalentreprenøren ble klar over
  forholdet i sak <kode>›.»

Anbefalt: A. Tittelen er kort i tidslinjen og i arkivet, og brevteksten sier hvilken dato som
er korrigert. Det A koster: tittelen alene skiller ikke de to datoene. Det B koster: lange
titler.
Valget styrer: tittelen i kjernen (`kjerne/frosset/brevtittel.ts`) og én test av tittelen.

**S-3** Hvor handlingen står (U-1) er et designvalg og prøves på brukere, ikke som vedtak.
