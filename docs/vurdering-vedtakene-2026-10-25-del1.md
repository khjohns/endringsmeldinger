# Vurdering av vedtakene 25.10, del 1: partens utsagn, appens vurdering og brevet

Dette er del 1 av en kritisk gjennomgang av vedtakene, med kontroll mot TS-stien.
Den dekker kontrollspørsmålene A (partens utsagn og appens vurdering) og B (brev,
frosset beslutningsgrunnlag, aktuell visning og kontrollmeldinger), og forløp 1, 5
og 10. Rapporten er et arbeidsgrunnlag for spørsmålene til oppdragsgiver. Den er
ikke en vanlig audit, og den har ingen alvorlighetsgrad. Appen er ikke i
produksjon og har ingen reelle data.

- **Kontrollert commit:** `569666bd80cd8d261e63655e28b65e186424ed60` (`main`, 25.10).
- **Kildene:**
  - Vedtakene, lest i [vedtaksfila](plans/vedtak.md) og i
    [vedtaksregisteret](vedtaksregister/vedtak.toml), med «Følge» for hvert vedtak:
    VS-U2, VS-U3, VS-U4, VS-U5, VS-U13, VS-U18, VS-U25, HF-U1, HF-U2, HF-U4,
    HF-U7, HF-U9, HF-U11, HF-U13, KA-U4, KA-U10, KA-U16, KA-U19, KA-U20, KA-U24,
    KA-U26, KA-U41, GR-U7, GR-U8, GR-U13, GR-U14, GR-U25, GR-U26, MM-U1, MM-U2,
    MM-U3, MM-U8, MM-U9, MM-U10, MM-U11, MM-U12, MM-U13, MM-U15, MM-U16, MM-U17,
    MM-U21, MM-U22, MM-U23, MM-U25, MM-U26, MM-U28, MM-U30, MP-U7, OV-U4, OV-U5,
    OV-U6, OV-U10, OV-U17, OV-U19, OV-U21, LV-U2, LV-U7, LV-U21, LV-U31, LV-U32
    og RP-U1.
  - Koden: `kjerne/frosset/`, `kjerne/utledning/visning.ts`, `kjerne/utledning/utled.ts`
    (utdrag), `kjerne/kommandoer/forutsetninger.ts`, `src/lib/kjernesak/` og
    komponentene den ekte saksruta når. To subagenter kartla dem, og de bærende
    stedene leste jeg selv.
  - Issuene: #732, #1140, #1167, #1126, #1193 og #1260.
- **Lagene:** **O** kontraktens ordlyd · **T** vedtatt tolkning · **A** vedtatt
  produktavgrensning · **I** implementasjonen · **V** min egen vurdering.
- **Belegget** følger [hovedplanen 1.3](plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
  **K** kjørt og observert 25.10, **L** lest i kode, **—** ikke kontrollert.
- **Kontraktsteksten** er lest i det private repoet `khjohns/kontrakt` (commit
  `5540b60`), etter at første versjon av rapporten var pushet. Den omfatter NS 8407
  § 5, § 32.2, § 32.3, § 33.4, § 34.1.2, § 34.1.3, § 34.2.1 og § 34.2.2, og
  avtaleloven § 6 med kommentar. Rapporten viser bare til bestemmelsene, ikke til
  ordlyden. Laget O er kontrollert der funnet sier det.

Forløpene ble kjørt gjennom kjernen med `bygg` og `Kjoering` fra `kjerne/tester/`, i
en midlertidig vitest-fil som ikke er committet. Utdragene står ved funnene.

## Funnene

### VG-B-01: brevet viser til forbeholdene i svaret, mens appen regner svaret som full godkjenning

- **Type:** misvisende budskap, uavklart valg.
- **Hva og for hvem:** Byggherren godkjenner hele beløpet fra appen og skriver et
  vilkår i utdypningen. Den faste teksten sier at godkjenningen gjelder «med beløpet
  og forbeholdene som fremgår av svaret». Appen leser likevel svaret som sammenfall:
  partene regnes som enige, kravene som avgjort, og verken TE eller byggherren kan
  gjøre mer i sporet. Brevet peker leseren mot et forbehold, mens appen sier
  «partene er enige».
- **Vedtakene:**
  - LV-U32 bestemmer setningen også ved full godkjenning. Om partene er enige,
    «følger av at svaret godkjenner hele kravet (GR-U7, HF-U7), ikke av setningen».
  - KA-U16 og KA-U19: appen utleder virkningen av den faste teksten og tolker ikke
    utdypningen.
  - HF-U7 (T): et svar med vilkår er avslag i forening med nytt tilbud. Følge til
    HF-U7: «Et forbehold appen ikke kan uttrykke, følger KA-U16 og KA-U26, der et
    svar med forbehold kan gi sammenfall.» Dette er derfor ikke en motstrid mellom
    gjeldende vedtak.
  - GR-U8: TE kan ikke godta et svar som godkjenner hele kravet.
  - OV-U10 gir statusteksten.
  - MM-U23: appens vurdering merkes som appens, og appen sier aldri at et krav er
    avgjort.
- **Kodestedet:**
  - `kjerne/frosset/brevtekst.ts`: setningen etter LV-U31/LV-U32.
  - `kjerne/kommandoer/forutsetninger.ts` `hvorforAvgjort`.
  - `kjerne/utledning/visning.ts` `saksbetegnelse` og `STATUSTEKST`.
- **Forløpet (forløp 10, K):** Grunnlaget er godkjent. TE krever 100 000 kr som
  tilbud. Byggherren godkjenner 100 000 kr med utdypningen «Godkjent under
  forutsetning av at arbeidet er ferdig innen 1. desember; ellers avslås kravet.»
  - Vedtakene sier at appen ikke tolker utdypningen, at svaret gir sammenfall
    (HF-U7 med Følge, GR-U7), og at TEs aksept avvises (GR-U8).
  - Brevet sier: «Byggherren godkjenner oppgjør som fast sum med beløpet og
    forbeholdene som fremgår av svaret. Byggherren godkjenner 100 000 kr eks. mva.»
    Utdypningen står under.
  - Visningen gir `enighet = virksom` og statusen «Alle krav sendt i appen er
    avgjort».
  - TEs aksept og byggherrens revisjon avvises begge med `KRAVENE_AVGJORT`: «Alle
    krav sendt i appen er avgjort: byggherren har godkjent grunnlaget, partene er
    enige om svaret på kravet om justering av vederlaget.»
- **Belegg:**
  - K: brevteksten, utledningen og avvisningene.
  - L (I): `hvorforAvgjort`.
  - T: at sammenfallet er vedtatt.
  - O: Etter avtaleloven § 6 første ledd er et svar som framstår som aksept, men
    ikke stemmer med tilbudet, avslag i forening med nytt tilbud. Kommentaren til
    bestemmelsen nevner forbehold i aksepten som et slikt avvik. Etter NS 8407
    § 34.2.2 første ledd gjelder et avtalt vederlag bare når byggherren har akseptert
    tilbudet. Leses brevet som helhet (B-03), med setningen om forbeholdene og
    vilkåret i begrunnelsen, kan det etter dette være et avslag med nytt tilbud.
    Appen viser likevel at partene er enige.
  - V: at setningen i brevet og «partene er enige» sammen sier mer enn appen vet
    (HF-U13: «visningen påstår ikke mer enn appen vet»).
- **Sikkerhet:** høy for forløpet. Middels for at det er et problem. LV-U32 drøftet
  forbehold i utdypningen i et forkastet alternativ, men valgte setningen uten å si
  hva «forbeholdene» viser til når hele beløpet er godkjent. Det er usikkert om
  setningen var ment å vise til TEs forbehold i tilbudet eller til byggherrens.
- **Minste avklaring:** spørsmål 1.

### VG-A-01: beslutningslinja sier «prekludert» som byggherrens standpunkt

- **Type:** misvisende budskap.
- **Hva og for hvem:** Når byggherren sier at et varsel kom for sent, viser
  forhåndsvisningen i svarskjemaet og det frosne beslutningsgrunnlaget «Byggherrens
  standpunkt: prinsipalt prekludert (§ …)». Brevet sier «byggherren gjør gjeldende
  at varselet … kom for sent». Linja gjør partens påberopelse om til en rettsvirkning
  og legger den i byggherrens munn. «Prekludert» står bare når appen har regnet
  påberopelsen som virksom (`laget(p.virkning)`). Linja blander dermed byggherrens
  utsagn med appens vurdering under overskriften «Byggherrens standpunkt».
  Linja er lagret i beslutningsgrunnlaget, som etter RP-U1 skal holdes atskilt fra
  partsutsagnene i rapporteringen.
- **Vedtakene:**
  - MM-U23: appen sier aldri selv at et krav er prekludert. Partenes standpunkter
    står som for eksempel «BH: varslet for sent».
  - HF-U11: påberopelsen er partens utsagn, og appen trekker ikke slutningen.
  - HF-U2: at et standpunkt er uten virkning, er appens vurdering og vises ikke som
    noe byggherren sa. Det samme må gjelde det motsatte (V).
  - VS-U3: å utlede er ikke å fastslå preklusjon.
  - Ingen vedtak gir ordlyden i linja (søkt i vedtaksfila).
- **Kodestedet:** `kjerne/frosset/standpunkt.ts` `beslutningslinje`
  (`grunntekst.rettidighet`). Den lagres i `Beslutningsgrunnlag.linje`
  (`kjerne/typer.ts`) og vises i `VederlagForm.svelte` som `kjernelag.linje`, via
  `src/lib/kjernesak/vederlagssvar.ts` `vederlagslag`.
- **Forløpet (forløp 5, K):**
  - **Frist:** grunnlaget er godkjent, TE krever 20 dager, og byggherren svarer
    «varselet for sent». Vedtakene sier at linja skal gjengi påberopelsen som
    byggherrens utsagn. Brevet sier «Prinsipalt: byggherren gjør gjeldende at
    varselet om fristforlengelse etter NS 8407 § 33.4 i brev 4 av 20. september 2026
    kom for sent.» Linja sier «Byggherrens standpunkt: prinsipalt prekludert (§ 33.4),
    subsidiært godkjent med 20 dager.» Etter at TE har oppgitt et tidligere varsel
    (OV-U5), står linja uendret og sier fortsatt bare «prekludert (§ 33.4)», uten
    hvilket varsel det gjaldt.
  - **Vederlag:** med § 34.1.2 gir det samme: «prinsipalt prekludert (§ 34.1.2),
    subsidiært godkjent med 100 000 kr».
  - **Grunnlag:** med § 32.2 gir det samme: «prinsipalt prekludert (§ 32.2),
    subsidiært godkjent».
- **Belegg:**
  - K: linjene, observert i forløpene.
  - L (I): visningen i `VederlagForm`, gjennom kartleggingen og egen lesing av
    `vederlagssvar.ts`.
  - O: Etter NS 8407 § 5 tredje ledd er det å gjøre gjeldende at motparten har
    varslet for sent, en handling fra parten. Tapet av kravet følger av
    varslingsbestemmelsen selv (§ 32.2 første ledd, § 33.4 annet ledd, § 34.1.2
    annet ledd) når varselet faktisk kom for sent, ikke av at parten påberoper det.
    Kontrakten bruker ikke ordet «prekludert». Linja slår sammen partens handling og
    virkningen kontrakten knytter til et faktum appen ikke avgjør.
  - — : at linja når Fabric. Rapporteringen er ikke bygget.
- **Sikkerhet:** høy for teksten. Middels for virkningen: linja vises i dag bare for
  byggherren selv, før sending (kartleggingen fant den ikke i visningen etter
  sending). Den lagres likevel varig i brevets beslutningsgrunnlag.
- **Minste retting:** teknisk retting 1.

### VG-A-02: svarskjemaet sier ikke at appen ikke tolker utdypningen, og at parten er bundet av det hen sender

- **Type:** implementeringsavvik.
- **Hva og for hvem:** Byggherren skriver begrunnelsen i et felt med plassholderen
  «Begrunn byggherrens vurdering …». Skjemaet sier ikke at et forbehold der ikke
  endrer virkningen appen gir svaret. Det sier heller ikke at et forbehold appen ikke
  kan uttrykke, må sendes utenfor appen, eller at byggherren er bundet av det hen
  sender fra appen. Uten den teksten kan byggherren tro at et vilkår i begrunnelsen
  hindrer at svaret regnes som full godkjenning (VG-B-01).
- **Vedtakene:**
  - KA-U19: «Skjemaet sier det fast, uten å tolke teksten: appen beregner virkningen
    ut fra valgene …».
  - OV-U4 endret KA-U19 for sperren: skjemaet sier at et brev sendt utenfor appen
    ikke endrer det parten sender fra appen, og at parten er bundet av det hen
    sender fra appen.
  - KA-U41: utdypningen er bare byggherrens egen tekst.
  - Følge til KA-U19: «Skjemaet hører til #313».
- **Kodestedet:** `src/lib/components/kontraktsbord/VederlagForm.svelte` (feltet
  «Begrunnelse», `RichTextEditor`) og `src/lib/components/kjernesak/Brevkontroll.svelte`.
  Brevkontrollen sier bare «Teksten lages av appen fra valgene i skjemaet og kan
  ikke endres her.»
- **Forløpet (forløp 10, L):** byggherren åpner vederlagssvaret i TS-saken.
  - Vedtakene sier at skjemaet har den faste teksten etter KA-U19 og OV-U4.
  - Søket fant teksten verken i `VederlagForm.svelte`, i `Brevkontroll.svelte` eller
    i `src/lib/kjernesak/`. Søkeordene var «tolk», «utdyp», «bundet», «valgene» og
    «utenfor appen».
  - #313 er åpent. Beskrivelsen nevner ikke KA-U19.
- **Belegg:**
  - L (I): de to komponentene og grep i `src/lib`.
  - — : nettleseren.
  - Grunnlags- og fristsvaret fra byggherren nås ikke av TS-ruta i dag, etter
    kartleggingen (`visKjerneskjema` i `Kontrollrommet.svelte`).
- **Sikkerhet:** høy for at teksten mangler. Det er usikkert om den er planlagt i et
  annet issue enn #313.
- **Minste retting:** teknisk retting 2.

### VG-B-02: visningen viser ikke det GR-U26 og OV-U5 krever om et sendt svar, og TE godtar uten å se det

- **Type:** implementeringsavvik. Kjent (#732), med to nye forløp som viser at
  vedtakene alt har avgjort valget #732 lar stå åpent.
- **Hva og for hvem:**
  - **Forløp 5:** TE kan godta et svar der byggherren påberoper at varselet kom
    for sent, uten å få se at svaret gjaldt et annet varsel enn det TE senere har
    oppgitt. Godtar TE, er partene enige om at kravet ikke fører fram etter det
    svaret sier (HF-U9).
  - **Forløp 1:** sporet viser «Enige» uten at det framgår at enigheten er betinget
    av grunnlaget, eller at byggherrens standpunkt nå står som subsidiært. Etter at
    TE har godtatt avslaget på grunnlaget, viser vederlagssporet fortsatt «Enige»,
    mens enigheten er uten virkning og saken er «Avsluttet: avslått».
- **Vedtakene:**
  - OV-U5: «Visningen og skjemaet for TEs aksept viser hvilket varsel det var, og
    at TE senere har oppgitt et annet.»
  - GR-U26: «Visningen viser standpunktet sammen med det senere grunnlagssvaret: som
    avklart når grunnlaget er godkjent, og som subsidiært når grunnlaget er avslått.»
  - MM-U28: enighetens virkning merkes som appens lesing.
  - MM-U30: betegnelsen «Enige», med enighetens virkning i linja under.
  - #732 sier: «Det må avgjøres hvilke av de andre som skal vises». For
    `svaret_gjaldt_et_annet_varsel`, `subsidiaert`, `enige_betinget` og
    `enighet_uten_virkning` er det alt avgjort av vedtakene over.
- **Kodestedet:**
  - `kjerne/utledning/visning.ts` `etiketter`. Etikettene regnes ut riktig.
  - `src/lib/kjernesak/saksbilde.ts` `Sporbilde.etiketter`. Ingen komponent leser
    feltet, etter kartleggingen.
  - `kjerne/frosset/brevtekst.ts`: TEs aksept, `case 'aksept'`.
- **Forløpet (K):**
  - **Forløp 5:** grunnlaget er godkjent. TE krever 20 dager. Byggherren svarer med
    prinsipal preklusjon etter § 33.4 og subsidiært 20 dager. TE oppgir deretter et
    varsel sendt 2. september (OV-U5).
    - Vedtakene sier at svaret står (OV-U5), at TE kan godta det, og at visningen og
      akseptskjemaet viser hvilket varsel svaret gjaldt.
    - Kjernen gir etiketten `svaret_gjaldt_et_annet_varsel`, og TE har `godta:frist`.
    - Akseptteksten er «TE godtar byggherrens svar på kravet om fristforlengelse i
      brev 5 av 20. september 2026.» Den sier ikke noe om varselet.
    - Etiketten vises ikke i Kontrollrommet (L).
  - **Forløp 1:** TE sender grunnlag og vederlag (100 000 kr). Byggherren godkjenner
    100 000 kr uten å svare på grunnlaget.
    - Brevet har forbeholdet: «Byggherren har ennå ikke svart på grunnlaget i TEs
      krav i brev 2 …»
    - Etikettene er `["enige_betinget"]`.
    - Byggherren avslår deretter grunnlaget. Etikettene blir `["enige_betinget",
      "subsidiaert"]`, og den frosne virkningen og brevet er uendret, som GR-U26
      sier.
    - TE godtar avslaget. Etikettene blir `["enighet_uten_virkning", "subsidiaert"]`,
      og betegnelsen er fortsatt `enige`.
    - Statusteksten i sporet (`sporetsStatustekst`) viser bare betegnelsen «Enige»
      (L).
- **Belegg:**
  - K: utledningen, etikettene og akseptteksten.
  - L (I): at etikettene ikke vises. Det sa kartleggingen, og #732 sier det samme.
  - T: kravene i OV-U5 og GR-U26.
- **Sikkerhet:** høy. Det er usikkert om sakslista viser noe av dette. Den har
  `subsidiaert` per svar (`server/saksliste.ts`), etter kartleggingen.
- **Minste retting:** teknisk retting 3. #1260 dekker forbeholdet i beslutningslinja
  og i TEs aksept for forløp 1.

### VG-B-03: MP-U7 står som gjeldende, men strider mot OV-U4, OV-U5 og MM-U9

- **Type:** vedtaksmotstrid, i registeret.
- **Hva og for hvem:** MP-U7 sier at en senere dokumentert innsigelse mot premisset
  om at det ikke finnes noen virksom tidsinnsigelse, gir «uavklart: motstridende
  dokumentasjon», og at et sendt brev som avviker fra dagens utledning, merkes som
  utdatert. Senere vedtak sier det motsatte, uten at registeret fører forholdet:
  - Et registrert brev gir ikke noe «uavklart utfall» (OV-U4).
  - Et svar byggherren alt har gitt, står og blir ikke uavklart (OV-U5).
  - Et avvik vises som en merknad som oppfordrer til revisjon, og et avvik sperrer
    ikke aksepten (MM-U9).

  Leser en senere økt MP-U7 som gjeldende, kan den bygge en sperre eller en merking
  «utdatert» som endrer det TE og byggherren ser om et sendt brev.
- **Vedtakene:**
  - MP-U7 (08.10). Følge: «Tiltenkt atferd for prøven». Ingen senere vedtak er ført
    som presisering, endring eller oppheving.
  - OV-U4 og OV-U5 (13.10), MM-U9 (09.10), HF-U4 og HF-U11.
- **Kodestedet:** ingen. MP-U7 er ikke bygget, og søket etter «utdatert» og «MP-U7»
  i `kjerne/` og `src/lib/kjernesak/` fant ingen treff. Kartleggingen pekte på samme
  hull.
- **Forløpet (L, T):** byggherren har svart uten å påberope sen varsling. Deretter
  registrerer byggherren et brev sendt utenfor appen, som sier at varselet kom for
  sent.
  - MP-U7 gir «uavklart: motstridende dokumentasjon».
  - OV-U4 gir dokumentasjon uten virkning og uten uavklart utfall.
  - Sendes påberopelsen fra appen, avviser HF-U4 den hvis byggherren uttrykkelig
    har sagt «i tide».
- **Belegg:** T (vedtakene). L (I): ingen implementasjon. O: NS 8407 § 5 tredje
  ledd gjør en innsigelse om sen varsling til partens skriftlige handling, med en
  frist. Bestemmelsen sier ikke at en senere innsigelse gjør et gitt svar uavklart.
- **Sikkerhet:** middels. Følge til MP-U7 kan leses som at vedtaket bare gjaldt
  metodeprøven. Da er det ikke en motstrid, men et register som ikke sier det.
- **Minste avklaring:** spørsmål 2.

### Øvrige funn, én linje hver

- **VG-B-04 (misvisende budskap, L):** I `VederlagForm.svelte` står forbeholdet for
  ubesvart grunnlag uten «i TEs krav i brev <n> av <dato>», som brevet har (GR-U26).
  `AVSLAATT` og `PREKLUDERT` har også andre ord enn brevet («Vurderingen nedenfor
  gjelder dersom …»). Brevkontrollen viser den riktige teksten før sending, så dette
  er en ulikhet i ordlyd, ikke i innhold.
- **VG-A-03 (Python, ikke prioritert):** `FristOverview.svelte` («For sent —
  prekludert»), `VederlagOverview.svelte` («Prekludert») og `CenterRead.svelte`
  («Grunnlaget er prekludert (§ 32.2).») fastslår preklusjon (MM-U23). TS-ruta når
  dem ikke (`hasBhResponse = !store.erKjernesak && …`, `isSubsidiary: false`). Delvis
  kjent (#1268, #1234).

## 1. Spørsmål til oppdragsgiver

**1. Hva brevet sier når byggherren godkjenner hele beløpet i et tilbud (VG-B-01)**

- **Bakgrunn:**
  - Når byggherren godkjenner oppgjør som fast sum, sier brevet «Byggherren
    godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av
    svaret». Det gjelder også når hele beløpet er godkjent (LV-U32).
  - Godkjenner byggherren hele beløpet, regner appen partene som enige uten TEs
    aksept (GR-U7). Appen leser ikke byggherrens begrunnelse (KA-U16, KA-U19), og et
    svar med forbehold kan gi sammenfall (HF-U7, Følge).
  - Skriver byggherren et vilkår i begrunnelsen, viser brevet dermed til et
    forbehold. Appen sier samtidig «partene er enige», og «alle krav sendt i appen er
    avgjort». TE kan ikke godta svaret, og byggherren kan ikke revidere det.
  - Det er uklart om «forbeholdene» i setningen viser til TEs forbehold i tilbudet
    eller til byggherrens.
  - Etter avtaleloven § 6 første ledd er et svar med et forbehold som ikke stemmer
    med tilbudet, avslag i forening med nytt tilbud. Etter NS 8407 § 34.2.2 første
    ledd gjelder et avtalt vederlag bare når byggherren har akseptert tilbudet.
- **Alternativene:**
  - **A (anbefalt):** Når byggherren godkjenner hele det krevde beløpet og oppgjør
    som fast sum, sier brevet «Byggherren godkjenner oppgjør som fast sum med
    beløpet som fremgår av svaret.» Setningen med «og forbeholdene» brukes bare når
    beløpet eller øvrige vilkår avviker fra TEs tilbud (LV-U31). Skjemaet sier, som
    KA-U19 krever, at appen beregner virkningen ut fra valgene, og at et forbehold i
    begrunnelsen ikke hindrer at partene regnes som enige når hele beløpet er
    godkjent. Endrer LV-U32.
  - **B:** Setningen står som LV-U32 sier. «Forbeholdene som fremgår av svaret» er
    de byggherren har valgt i skjemaet, ikke det byggherren skriver i begrunnelsen.
    Skjemaet sier det. Presiserer LV-U32.
  - **C:** Setningen står som LV-U32 sier. Når byggherren har skrevet en begrunnelse
    til en full godkjenning, regnes svaret ikke som sammenfall, og TE må godta det.
    Endrer GR-U7 og HF-U7 for svar fra appen, og strider mot KA-U16 om at appen ikke
    tolker begrunnelsen.
- **Anbefaling:** A. Brevet sier da ikke mer enn appen gir virkning, og byggherren
  får vite det før sending. C ville la appen tolke begrunnelsen.
- **Hva valget styrer:** den faste setningen i vederlagssvaret ved full godkjenning,
  teksten i svarskjemaet, og om «partene er enige» kan stå uten forbehold i
  statusen og meldingene.

**2. Om vedtaket om motstridende dokumentasjon gjelder i appen (VG-B-03)**

- **Bakgrunn:**
  - Vedtaket 08.10 om motstridende dokumentasjon (MP-U7) sier at en senere
    dokumentert innsigelse mot premisset om at det ikke finnes noen virksom
    tidsinnsigelse, gir «uavklart: motstridende dokumentasjon», og at et sendt brev
    som avviker fra dagens utledning, merkes som utdatert.
  - Senere vedtak sier at et registrert brev ikke gir noe uavklart utfall (OV-U4),
    at et svar byggherren alt har gitt, står (OV-U5), og at et avvik vises som en
    merknad (MM-U9).
  - Registeret fører ikke at de senere vedtakene endrer MP-U7. MP-U7 sier selv at
    det er «tiltenkt atferd for prøven».
- **Alternativene:**
  - **A (anbefalt):** MP-U7 gjaldt metodeprøven 08.10. For saker i appen gjelder
    OV-U4, OV-U5 og MM-U9: en senere innsigelse gjør ikke utfallet uavklart, og et
    sendt brev merkes ikke som utdatert. Opphever MP-U7 for appen.
  - **B:** MP-U7 gjelder for innsigelser sendt fra appen. En innsigelse etter § 5
    tredje ledd fra appen, som strider mot premisset i et sendt svar, gir «uavklart:
    motstridende dokumentasjon» til en egen handling avgjør det. Registrerte brev
    følger OV-U4. Snevrer inn MP-U7 og utvider HF-U11.
- **Anbefaling:** A. B ville la appen trekke en slutning av en påberopelse, som
  HF-U11 sier at den ikke skal.
- **Hva valget styrer:** om en innsigelse eller et registrert brev kan endre det
  partene ser om et sendt svar, og om aksepten kan sperres av det.

## 2. Tekniske rettinger som følger av gjeldende vedtak

1. **VG-A-01:** Beslutningslinja gjengir påberopelsen slik brevet sier den, for
   eksempel «Byggherrens standpunkt: prinsipalt varselet etter § 33.4 kom for sent,
   subsidiært godkjent med 20 dager», og ikke «prekludert» (MM-U23, HF-U11, HF-U2).
   Endringen rører `kjerne/frosset/`, så både `REGELVERSJON` og `PROJEKSJONSVERSJON`
   må økes. Allerede frosne linjer står (MM-U9). Testene i
   `kjerne/tester/brevtekst.test.ts` som venter «prinsipalt prekludert (§ …)», og
   `docs/domenetabell/regler.json` og bevis-sakene med samme tekst, rettes.
2. **VG-A-02:** Svarskjemaet får den faste teksten etter KA-U19 slik OV-U4 endret den.
   Appen beregner virkningen ut fra valgene og tolker ikke begrunnelsen. Et forbehold
   appen ikke kan uttrykke, sendes utenfor appen. Byggherren er bundet av det hen
   sender fra appen. Teksten føres som krav i #313, eller i issuet for byggherrens
   svarskjema i TS.
3. **VG-B-02:** Visningen og akseptskjemaet viser `svaret_gjaldt_et_annet_varsel`
   (OV-U5). Ved et vederlags- eller fristsvar gitt under forbeholdet for ubesvart
   grunnlag viser de `enige_betinget` og `subsidiaert` (GR-U26). Linja under
   betegnelsen viser `enighet_uten_virkning`, merket som appens lesing (MM-U28,
   MM-U30). Det føres i #732 som avgjort av vedtakene, sammen med #1260.

## 3. Kontrollert og riktig håndtert

Brevet og frysingen:

- Brevteksten avsenderen ser i brevkontrollen, er den som fryses. `tekstavvik` i
  `skriving.ts` avviser et avvik med `ANNEN_BREVTEKST` (L). LV-U2.
- I forløp 1 frøs forbeholdet for ubesvart grunnlag i brevet. Det sto uendret etter
  grunnlagsavslaget, og de frosne virkningene ble ikke endret (K). GR-U26 og MM-U11.
- I forløp 1 ga full godkjenning under forbeholdet enighet om beløpet uten aksept,
  betinget av grunnlaget, og byggherren kunne ikke revidere (K). GR-U7 og GR-U26.
- I forløp 1, etter TEs aksept av avslaget, ble revisjonen av vederlagssvaret avvist
  (`GRUNNLAG_AVVIST`), og enigheten fikk ingen virkning (K). GR-U7 og SK-01.

En ny opplysning etter svaret:

- I forløp 5 sto svaret med virkningen det hadde, og TE kunne godta det. Etiketten
  `varsel_ikke_registrert` falt bort etter varselet (K). OV-U5.
- `regel_endret_*` slo ikke ut på en ny opplysning (OV-U5-varselet) i forløp 5, bare
  på en annen virkning etter dagens regler. Forskyvningen og `grunnlagskravFor` gir
  ingen falsk merknad (K, L). MM-U9.

Ordlyden om påberopelser og datoer:

- Brevteksten for påberopt sen varsling sier «byggherren gjør gjeldende at varselet
  … i brev <n> av <dato> kom for sent» (K). LV-U21 og HF-U11.
- Datoer fra partene vises som partens opplysning: «Sendt ifølge TE <dato>», «TE
  opplyser at pålegget ble mottatt …» (L). VS-U25 og OV-U5.
- Registrerte brev har «Appen vurderer ikke innholdet» per brev og som merknad for
  saken (L). OV-U4 og OV-U19.
- Innsigelsesdialogen gjengir regelen i § 5 som veiledning, uten å sammenlikne
  datoer (L). VS-U2 og HF-U11.

Annet:

- Ingen regel leser `visning`. Arkitekturtesten håndhever det (L, `visning.ts`
  modulheader). MM-U13.

## 4. Verifikasjon og grenser

- **Kontraktsteksten er lest for VG-B-01, VG-A-01 og VG-B-03** (se toppen). For
  VG-A-02, VG-B-02 og enlinjefunnene er laget O ikke kontrollert, fordi de gjelder
  appens egne vedtak om visning og skjema.
- **Forløpene ble kjørt i minnet, gjennom kjernens kommandoer** (`forhaandsvis` og
  `vurder`), ikke gjennom serveren eller nettleseren. Det som vises i Kontrollrommet,
  er lest (L), ikke sett i nettleseren.
- **Ikke prøvd:**
  - Forløp 5 med en opplysning om mottak, og med en bestridelse av sendingen.
  - Forløp 10 for fristsvaret og grunnlagssvaret. Byggherrens svarskjema for dem
    nås ikke av TS-ruta i dag, etter kartleggingen.
  - Registrerte brev (MM-U17) i forløpene.
  - Rettinger (MM-U21, MM-U26), som ikke er bygget.
  - En faktisk regelendring med `regelendring.ts`.
- **Kontrollspørsmålene om saksliste, buffer og «Oppdateres»** (MM-U15) ble bare
  lest i utdrag. `server/saksliste.ts` ble ikke gått gjennom.
- **Python-stien er ikke kontrollert**, utover at komponentene i VG-A-03 ikke nås av
  TS-ruta.
