# Vurdering av vedtakene, del 2: enighet, binding og revisjon (C) og grunnlag, kravversjoner og dokumentreferanser (D)

Arbeidsgrunnlag for spørsmålene til oppdragsgiver, 25.10.2026. Ikke en vanlig
audit, og ingen produksjonskode, vedtak eller tester er endret.

- **Kontrollert commit:** `569666b` (main, «Merge pull request #1281»).
- **Kildene:** `AGENTS.md`; vedtaksskillen (#424 og «Still dem slik oppdragsgiver kan
  svare»); `.claude/rules/tester.md`; resonnering-skillen; vedtakene i område C og D
  lest i `docs/vedtaksregister/vedtak.toml` med følge (HF-U1, HF-U4–HF-U10,
  HF-U13–HF-U15, HF-U21, HF-U22, GR-U1, GR-U4, GR-U7, GR-U8, GR-U10, GR-U11,
  GR-U22, GR-U26, KA-U1, KA-U7, KA-U10, KA-U11, KA-U16, KA-U24, KA-U26, KA-U31,
  KA-U40, MM-U3, MM-U11, MM-U12, MM-U17, MM-U21, OV-U3, OV-U5, OV-U11, OV-U34,
  OV-U37–OV-U41, LV-U31, LV-U32, SK-12, VS-U20, VS-U25, VS-U26); koden i
  `kjerne/frosset/standpunkt.ts` (`godkjennerHeleKravet`, `sammenfallStemmer`,
  `enighetsgrunnlag`, `regnUtSvar`), `kjerne/regler/vederlag.ts` (`kontroller`,
  `beregnVederlag`, `resultatAvBeloep`), `kjerne/utledning/innroemmelse.ts`,
  `kjerne/utledning/utled.ts` (subsidiariteten i `utledSporene`, `harSagtITide`,
  `grunnlagskravFor`, `venterPaaSvar`, `svarIkkeGodtatt`),
  `kjerne/kommandoer/nyttelast.ts` (`kontrollerSvar`), `kjerne/frosset/brevtekst.ts`
  (`utsagnstekst`), `kjerne/format/format.ts` (`KRAVINNHOLD`),
  `src/lib/kjernesak/vederlagskrav.ts` og `kjernelag`/`kjerneresultat` i
  `src/lib/components/kontraktsbord/VederlagForm.svelte`.
- **Kontraktsteksten er ikke lest.** `add_repo` for `khjohns/kontrakt` ble avvist av
  tillatelseskontrollen i økta. Bestemmelsene er oppgitt slik vedtakene oppgir dem.
  Ingen påstand under bygger på min lesing av ordlyden (lag O er derfor «—» overalt).
- **Forløpene** er kjørt i minnet med `Kjoering` fra `kjerne/tester/kjoerer.ts`, i en
  prøvefil som ikke er committet. Prefikset er `krav_irreg` fra bevis-sakene: grunnlag
  irregulær endring (pålegg mottatt 15.09), vederlag 100 000 kr, frist 20 dager.

Lagene: **O** kontraktens ordlyd · **T** vedtatt tolkning · **A** vedtatt
produktavgrensning · **I** implementasjonen · **V** min vurdering. Belegg: **K** kjørt
og observert, **L** lest i kode, **—** ikke kontrollert.

## Funnene

### VG-C-01 Et forbehold i begrunnelsen ved full godkjenning gir likevel «Enige» og stenger sporet for TE

- **Type:** misvisende budskap, med et uavklart valg.
- **Hva og for hvem:** Byggherren kan godkjenne hele beløpet fra appen og avgrense
  omfanget i begrunnelsen. Appen registrerer da enighet ved sammenfall, viser «Enige»
  og avviser TEs nye kravversjon, selv om TE aldri har godtatt avgrensningen. Den låste
  teksten sier i tillegg at byggherren godkjenner «med beløpet og forbeholdene som
  fremgår av svaret», så brevet selv tar forbeholdet inn i svaret. Begge parter kan
  tro at de er enige om noe forskjellig.
- **Vedtakene:** HF-U7 (godkjenning bare når svaret stemmer med kravet; et vilkår gir
  avslag og nytt tilbud, T). HF-U7 viser selv i følge til KA-U16 og KA-U26 «der et
  svar med forbehold kan gi sammenfall», så det er ikke motstrid mellom de to. KA-U16
  (appen tolker ikke utdypningen i et brev fra appen, A). OV-U39 siste del (appen
  tolker ikke begrunnelsen som avgrensning og avgjør ikke hva enigheten omfatter, A).
  LV-U32 (setningen gjelder også når hele beløpet er godkjent, A). KA-U7 og HF-U9 (en
  ny kravversjon i et spor med enighet avvises, T). KA-U20 og KA-U26 gir merking bare
  for et *registrert* brev, og de bygges ikke i første versjon (OV-U7).
- **Kodestedet:** `godkjennerHeleKravet` og `sammenfallStemmer` i
  `kjerne/frosset/standpunkt.ts` leser bare standpunktene. `kontrollerSvar` i
  `kjerne/kommandoer/nyttelast.ts` krever begrunnelse bare for en avgrensning som er et
  standpunkt (KA-U24). Merkelappen «Enige» står i
  `src/lib/components/case-list/presentation.ts`.
- **Forløpet (forløp 4 i oppdraget, K):** prefiks, så et brev fra byggherren: grunnlag
  godkjent, vederlag «godkjent» med begrunnelsen «Beløpet omfatter ikke rigg og
  drift.», og så et fristsvar på 10 av 20 dager.
  - Gjeldende vedtak sier (før kjøringen): etter KA-U16 og OV-U39 registrerer appen
    sammenfall og enighet, og etter KA-U7 avvises TEs nye kravversjon. Etter HF-U7, på
    tolkningslaget, er svaret ikke en godkjenning.
  - Observert: brevet sier «Byggherren godkjenner oppgjør som fast sum med beløpet og
    forbeholdene som fremgår av svaret. Byggherren godkjenner 100 000 kr eks. mva.»
    `enighet.vederlag` = finnes, virkning `virksom`. TEs nye kravversjon:
    `ENIGHET_I_SPORET` «Partene er enige om svaret. Kravet kan ikke endres.» TEs aksept:
    `ENIGHET_I_SPORET`. Byggherrens revisjon: `ENIGHET_I_SPORET`.
- **Belegg:** K for kjernen (I). L for «Enige» i saksoversikten (I). T for HF-U7, A for
  KA-U16/OV-U39/LV-U32. V for at visningen villeder.
- **Sikkerhet:** høy for atferden. Middels for at det er et problem som må løses i første
  versjon: valget er bevisst (KA-U16), men forløpet med begrunnelse og «forbeholdene
  som fremgår av svaret» i samme brev ser ikke ut til å ha vært vurdert. Berører
  #578 (MM-U3 mot MM-U11/HF-U9, enighetens rekkevidde), men det nye er forløpet med
  et brev *fra appen*, der TE ikke har noen merking.
- **Minste avklaring:** spørsmål 1.

### VG-C-02 Byggherren får ingen opplysning før et svar som binder hen uten TEs aksept

- **Type:** uavklart valg.
- **Hva og for hvem:** Godkjenner byggherren hele kravet, er partene enige straks, og
  byggherren kan ikke revidere svaret (GR-U7, GR-U10). Det gjelder også under
  forbeholdet for ubesvart grunnlag (GR-U26) og før fristen er avklart. TE skal få en
  uttrykkelig opplysning om bindingen før krav og aksept (OV-U38). Byggherren får bare
  et grønt ikon. En byggherre som mener at svaret er foreløpig eller subsidiært, kan
  binde seg uten å vite det.
- **Vedtakene:** GR-U7 (et svar som godkjenner hele kravet, er låst for revisjon som et
  godtatt svar, T/A), GR-U26 (enighet om beløpet under forbeholdet, grunnlaget
  uavklart, A), OV-U37 og OV-U39 (enighet om beløpet hindres ikke av avvikende
  beregningsverdier eller uavklart frist, A), OV-U38 (opplysningen til TE, A). Ingen
  vedtak om opplysning til byggherren.
- **Kodestedet:** `kjerneresultat` i `VederlagForm.svelte` (sammenfall gir bare ikonet
  `Check`). Jeg har ikke lest fristskjemaet eller den ekte saksruta.
- **Forløpet (forløp 2 i oppdraget, K):** prefiks, så byggherren: grunnlag avslått (i
  tide), vederlag delvis 60 000 kr (subsidiært). TE sender ny grunnlagsversjon (samme
  hjemmel) og nytt vederlagskrav på 120 000 kr. Byggherren svarer bare på vederlaget,
  «godkjent».
  - Gjeldende vedtak sier: brevet har forbeholdet i GR-U26, svaret er prinsipalt
    (GR-U4), partene er enige om 120 000 kr (GR-U7, GR-U26), grunnlaget venter, og en
    ny kravversjon i vederlag avvises (KA-U7).
  - Observert: «Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev 6 …
    Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet
    foreligger. … Byggherren godkjenner 120 000 kr eks. mva.» `sammenfall` = true,
    `enighet.vederlag` = finnes, `subsidiaer_aarsaker.vederlag` = [], grunnlaget
    venter på svar på K-g2, ny vederlagsversjon gir `ENIGHET_I_SPORET`. Avslår
    byggherren så grunnlaget, blir enigheten `betinget` (variant 2b). Alt stemmer med
    vedtakene. Det som mangler, er at byggherren ble fortalt hva svaret gjorde.
  - Forløp 4 gir det samme for byggherren: full godkjenning av vederlaget før
    fristsvaret låser beløpet, og et senere fristsvar på færre dager endrer det ikke.
- **Belegg:** K for kjernen (I). L for skjemaet, bare utsnittet over (I). V for at
  opplysningen trengs.
- **Sikkerhet:** middels. Usikkert om den ekte saksruta viser noe mer enn ikonet.
- **Minste avklaring:** spørsmål 2.

### VG-D-01 Datoen varslingsplikten løper fra i grunnlaget kan endres fritt i en ny grunnlagsversjon, og brevet sier ikke at den er endret

- **Type:** uavklart valg, med et misvisende budskap.
- **Hva og for hvem:** TE kan sende en ny grunnlagsversjon med en senere dato for
  mottatt pålegg (eller for når TE ble klar over forholdet). Datoen gjelder straks som
  premiss for byggherrens neste svar, byggherrens svar med «for sent» faller, og brevet
  sier bare «TE opplyser at pålegget ble mottatt 19. september 2026. Kravet erstatter
  TEs krav i brev 2 …», uten den datoen TE oppga før. For de andre datoene TE oppgir,
  gjelder rettingsmodellen: en retting til TEs fordel gjelder først når byggherren
  godtar den, og den tidligere opplysningen står og vises (MM-U21, OV-U11, OV-U41).
  Etter enighet om grunnlaget kan TE ikke rette datoen i det hele tatt, heller ikke til
  byggherrens fordel. En faktisk opplysning rettes altså bare gjennom en rettslig
  disposisjon, et nytt tilbud.
- **Vedtakene:** VS-U25 og VS-U26 (TE oppgir datoen i grunnlagskravet, brevteksten, A).
  GR-U22 (ny versjon med samme hjemmel er tillatt; følge: «Endringsordrens dato eller
  nummer kan rettes i en ny versjon med samme underkategori», A). HF-U8 (svaret faller
  bort ved ny kravversjon; «i tide» og avkall står, T). MM-U21 og OV-U11 (rettingen
  som eget utsagn med henvisning; fortegnet avgjør når den gjelder, T/A). OV-U41
  (samme modell for kunnskapsdatoen etter § 34.1.3, A). SK-12 og HF-U13 («datoen settes
  én gang») gjelder varselets dato, ikke datoen varslingsplikten løper fra. Ingen vedtak
  sier hvilken av modellene som gjelder for grunnlagsdatoen. Den delen der byggherrens
  påberopelse etter § 32.2 faller med versjonen, er kjent (#1127).
- **Kodestedet:** `KRAVINNHOLD.grunnlag` i `kjerne/format/format.ts` (`paalegg_mottatt`,
  `klar_over_forholdet`), brevteksten i `kjerne/frosset/brevtekst.ts`
  (`DATOEN_GJELDER`), og ingen kontroll mot forrige versjon i
  `kjerne/kommandoer/forutsetninger.ts` (bare `ANNEN_HJEMMEL`).
- **Forløpet (forløp 6 i oppdraget, K):** prefiks, så byggherren: grunnlag «godkjent»
  med «for sent» etter § 32.2 prinsipalt. TE sender K-g2 med samme underkategori og
  pålegg mottatt endret fra 15.09 til (a) 19.09 og (b) 01.09.
  - Gjeldende vedtak sier: ingen vedtak avgjør det. Etter rettingsmodellen ville (a)
    vært et tilbud som gjelder når byggherren godtar det, og (b) gjeldt straks; begge
    datoene ville stått.
  - Observert, (a) og (b) likt: K-g2 godtas, brevet viser bare den nye datoen,
    `gjeldende_svar.grunnlag` = null, `innsigelser` = [], og byggherren kan svare «i
    tide» på K-g2. Etter et godkjent grunnlag uten påberopelse (enighet, GR-U10) avvises
    K-g2 med `ENIGHET_I_SPORET`, også med en tidligere dato (variant 6b).
- **Belegg:** K (I). A for GR-U22/VS-U26. T for MM-U21/OV-U11. V for at modellene
  bør være like.
- **Sikkerhet:** høy for atferden. Middels for at det er utilsiktet: en ny versjon med
  endret dato kan være et bevisst valg etter GR-U22, men da bør brevet vise endringen.
- **Minste avklaring:** spørsmål 3.

### VG-D-02 Første gangs supplering av kunnskapsdatoen er ikke plassert i rettingsmodellen

- **Type:** uavklart valg (ikke bygget, #1171).
- **Hva og for hvem:** OV-U41 lar TE «supplere en dato som ikke ble oppgitt» og
  avgjør bare en *senere* eller *tidligere* dato enn den TE oppga før. En første dato
  har ikke noe å sammenlikne med. Oppgir TE den etter at byggherren har påberopt at det
  særskilte varselet kom for sent, kan den gi TE en fordel som ikke var meddelt da
  byggherren svarte. Uten et vedtak avgjør byggeøkta om den gjelder straks.
- **Vedtakene:** OV-U41 (supplering som nytt utsagn; fortegnet etter MM-U21; et svar
  byggherren alt har gitt, står med virkningen det hadde, A). MM-U21 (retting til
  avsenderens fordel gjelder når motparten godtar den, T). OV-U34 (kunnskapsdato og
  varseldato er forskjellige opplysninger, A).
- **Kodestedet:** ingen; kunnskapsdatoen etter § 34.1.3 finnes ikke i formatet.
- **Forløpet:** ikke kjørbart. Tenkt forløp: varsel etter § 34.1.3 uten kunnskapsdato →
  byggherren påberoper at varselet kom for sent → TE oppgir kunnskapsdatoen senere.
  Gjeldende vedtak sier at svaret står (OV-U41, OV-U5), men ikke om datoen er premiss
  for byggherrens neste svar før hen har godtatt den.
- **Belegg:** — (I). A og V.
- **Sikkerhet:** middels. Det kan være meningen at «står med virkningen det hadde» er
  nok vern.
- **Minste avklaring:** spørsmål 4, før #1171 bygger kunnskapsdatoen.

### Kortere funn

- **VG-D-03** (misvisende budskap, K): TE sender ny grunnlagsversjon etter et avslått
  grunnlag og godtar så det subsidiære vederlagssvaret. Akseptbrevet sier «TE er enig i
  beløpet, men ikke i byggherrens standpunkt til grunnlaget», selv om byggherren ennå
  ikke har tatt standpunkt til den gjeldende grunnlagsversjonen. Enigheten blir riktig
  `betinget` (GR-U1, GR-U7). Teksten kunne vise til grunnlaget i brevet svaret gjaldt.
- **VG-D-04** (misvisende budskap, K): Mens ny grunnlagsversjon og ny vederlagsversjon
  venter (variant 2c), er `subsidiaer_aarsaker.vederlag` = [«avslaatt»] fra svaret på
  første grunnlagsversjon. Det stemmer med GR-U1 for det gamle vederlagssvaret, men
  sporet har ikke noe gjeldende svar. Visningen bør ikke vise sporet som subsidiært
  avslått uten et svar å knytte det til. Ikke kontrollert i visningen.
- **Python** (én linje etter avgrensningen): ikke kontrollert i denne delen; SK-12,
  SP-02, SK-02 og DT-04 er kjent.

## 1. Spørsmål til oppdragsgiver

1. **Forbehold i begrunnelsen når byggherren godkjenner hele kravet.**
   Bakgrunn: Et svar fra appen som godkjenner hele beløpet, gir enighet uten TEs aksept
   (GR-U7), og appen leser ikke begrunnelsen (KA-U16, OV-U39). Byggherren kan likevel
   skrive en avgrensning i begrunnelsen, og den faste teksten sier «med beløpet og
   forbeholdene som fremgår av svaret» (LV-U32). Etter HF-U7 er et svar med et vilkår
   ikke en godkjenning. TE kan da ikke sende en ny kravversjon i saken (KA-U7), og har
   ingen merking som for et registrert brev (KA-U20, KA-U26).
   Alternativer:
   - **A (anbefalt):** «Godkjenner byggherren i et svar fra appen hele kravet, sier
     brevet at byggherren godkjenner kravet uten forbehold, og skjemaet sier før brevet
     sendes at partene da er enige og at svaret ikke kan revideres. Vil byggherren
     avgrense hva godkjenningen omfatter, gjør hen det med et standpunkt som ikke
     godkjenner hele kravet.» Snevrer inn KA-U16 for brev fra appen med sammenfall, og
     endrer LV-U32 for et svar som godkjenner hele kravet.
   - **B:** «TE kan også merke et brev fra appen som et svar med et forbehold appen ikke
     kan uttrykke, med virkningene i KA-U26.» Utvider KA-U20 og KA-U26. Bygges ikke i
     første versjon (OV-U7), så hullet står til da.
   - **C:** «Som i dag: appen registrerer enighet ved sammenfall uansett begrunnelsen, og
     brevet er det autoritative uttrykket for hva enigheten omfatter (B-03, KA-U16).»
   Valget styrer brevteksten ved full godkjenning, svarskjemaet og om «Enige» i
   visningen kan stå mot en avgrensning i samme brev.

2. **Opplysning til byggherren før et svar som binder uten TEs aksept.**
   Bakgrunn: TE får en uttrykkelig opplysning før krav og aksept når vederlaget har en
   post for rigg og drift (OV-U38). Byggherren binder seg straks ved å godkjenne hele
   kravet (GR-U7, GR-U10), også under forbeholdet for ubesvart grunnlag (GR-U26) og før
   fristen er avklart (OV-U37).
   Alternativer:
   - **A (anbefalt):** «Når byggherrens svar godkjenner hele kravet i et spor, sier
     skjemaet før brevet sendes at partene da er enige om beløpet eller dagene, og at
     byggherren ikke kan revidere svaret. Er grunnlaget ikke besvart, sier skjemaet også
     at enigheten står om byggherren senere avslår grunnlaget.» Presiserer GR-U7 og
     GR-U26.
   - **B:** «Skjemaet viser bare resultatet; bindingen følger av vedtakene.»
   Valget styrer svarskjemaene i alle tre spor.

3. **Retting av datoen varslingsplikten løper fra i grunnlagskravet.**
   Bakgrunn: TE oppgir datoen pålegget ble mottatt, eller datoen TE ble klar over
   forholdet (VS-U26). I dag kan TE endre den i en ny grunnlagsversjon (GR-U22), og den
   nye datoen gjelder straks, også når den er senere og altså til TEs fordel. Brevet
   viser ikke den tidligere datoen. For andre datoer TE oppgir, gjelder
   rettingsmodellen i MM-U21 (OV-U11, OV-U41).
   Alternativer:
   - **A (anbefalt):** «Datoen varslingsplikten løper fra settes én gang i
     grunnlagskravet. En ny grunnlagsversjon kan ikke endre den. TE retter den etter
     MM-U21 med henvisning til brevet med opplysningen: en tidligere dato gjelder straks,
     en senere dato gjelder når byggherren godtar rettingen. Alle datoene TE har oppgitt,
     vises som TEs utsagn, og et svar byggherren alt har gitt, står med virkningen det
     hadde.» Utvider MM-U21 og OV-U11 til datoen i VS-U26; snevrer inn GR-U22.
   - **B:** «En ny grunnlagsversjon kan endre datoen, men brevet sier da hvilken dato TE
     oppga i forrige versjon.» Presiserer GR-U22 og VS-U26.
   - **C:** «Som i dag.»
   Valget styrer formatet for grunnlagskravet, brevteksten og om TE kan rette datoen
   etter at partene er enige om grunnlaget.

4. **Første gangs kunnskapsdato etter byggherrens svar på rettidigheten.**
   Bakgrunn: OV-U41 lar TE supplere en kunnskapsdato som ikke ble oppgitt, og avgjør
   bare en senere eller tidligere dato enn den TE oppga før.
   Alternativer:
   - **A (anbefalt):** «Oppgir TE kunnskapsdatoen for første gang etter at byggherren
     har tatt stilling til rettidigheten av varselet, er opplysningen en retting til TEs
     fordel etter MM-U21 og gjelder som premiss for nye svar når byggherren godtar den.
     Oppgitt før byggherrens svar gjelder den straks.» Presiserer OV-U41.
   - **B:** «En første kunnskapsdato gjelder straks som TEs opplysning. Et svar
     byggherren alt har gitt, står med virkningen det hadde (OV-U41).»
   Valget styrer #1171.

## 2. Tekniske rettinger

Ingen av funnene er en retting som følger direkte av et gjeldende vedtak. VG-D-03 og
VG-D-04 er tekst- og visningsforbedringer som kan tas uten nytt vedtak når de
berørte delene endres.

## 3. Kontrollert og riktig håndtert

- Hva som må samsvare for sammenfall i vederlag: hvert delvis beløp er høyst det krevde
  per post (`kontroller`), metoden må være godtatt, og en begrensning etter § 34.1.3 i et
  lag gir ikke sammenfall (`godkjennerHeleKravet`). HF-U7 og HF-U14 holder (L).
- Et nytt forbehold kan ikke senke en innrømmelse i en revisjon: beløp per post, dager,
  hindring, metode og grunnlag sammenliknes (`senketInnroemmelse`), og en ny påberopelse
  etter et «i tide» avvises med `SAGT_I_TIDE` for alle hjemlene, også § 34.1.3 (L).
- Forløp 2: GR-U26-forbeholdet står i brevet, svaret er prinsipalt, sammenfall gir
  enighet om beløpet, og et senere grunnlagsavslag gjør enigheten betinget (K).
- Et tidligere grunnlagsavslag får ikke større rekkevidde: et vederlagssvar gitt mens ny
  grunnlagsversjon venter, er ikke subsidiært (`subsidiaer_aarsaker` = [], K), og
  subsidiariteten leses av `grunnlagskrav` og kravkjeden, ikke av rekkefølgen (L).
- Forløp 4: enighet om vederlaget før fristsvaret er virksom, og et senere fristsvar på
  færre dager endrer den ikke; TEs nye kravversjon, TEs aksept og byggherrens revisjon
  avvises (K), som KA-U7, GR-U7 og OV-U38 sier.
- Retting av datoen for et varsel (OV-U11) og av kunnskapsdatoen (OV-U41) har motsatt
  fortegn med samme modell; det er ikke motstrid, fordi en senere varseldato og en
  tidligere kunnskapsdato begge er til byggherrens fordel (T).
- OV-U38 lover ikke at et krav i en ny sak består: vedtaket sier at appen ikke avgjør
  om kravet er omfattet (A). Ikke prøvd i skjemaet, som ikke er bygget (#1171).
- En sen registrering av et tidligere varsel endrer ikke et sendt svar: testen «et svar
  står når TE registrerer et varsel» i `kjerne.test.ts` (L, ikke kjørt i denne økta).

## 4. Verifikasjon og grenser

- Kontraktsteksten er ikke lest (avvist `add_repo`). Ingen funn hviler på ordlyden, men
  vedtakenes henvisninger til bestemmelser er ikke kontrollert.
- Forløpene er kjørt i minnet gjennom `Kjoering`, ikke gjennom serveren, testbasen eller
  den ekte saksruta. Skjemaene i `src/` er bare lest i utsnitt (VG-C-02).
- Ikke prøvd: akseptfristen og aksept etter fristen (HF-U15–HF-U20, HF-U22, ikke bygget,
  #502); rigg og drift som post (OV-U37–OV-U40, ikke bygget, #1171); kunnskapsdatoen
  etter § 34.1.3 (#1171); merking og registrerte brev med forbehold (KA-U20, KA-U26,
  OV-U7); «kravene er avgjort» (KA-U11, OV-U3, #493); frafall og revisjon av frafall
  (GR-U9, GR-U17, GR-U20, GR-U23); forsering (FO-U5, FO-U7); fristsporet i forløp 2;
  dokumentdato i et vedlegg mot oppgitt dato.
- Python-stien er ikke kontrollert.

Prøvefilen (ikke committet) kjørte disse stegene etter prefikset `krav_irreg`:

```text
2:  brev[grunnlag avslaatt i tide; vederlag delvis 60000] → krav grunnlag K-g2 →
    krav vederlag 120000 → brev[vederlag godkjent]
2b: som 2, men delvis 80000 → aksept vederlag → brev[grunnlag K-g2 avslaatt]
2c: som 2 til og med krav vederlag 120000
2d: brev[grunnlag avslaatt; vederlag delvis 60000] → krav grunnlag K-g2 → aksept vederlag
4:  brev[grunnlag godkjent; vederlag godkjent, utdypning «Beløpet omfatter ikke rigg og
    drift.»] → brev[frist 10 dager] → prøv krav vederlag, revisjon, aksept
6:  brev[grunnlag godkjent, varslet_i_tide=false] → krav grunnlag K-g2 med
    paalegg_mottatt 2026-09-19 (a) eller 2026-09-01 (b) → prøv brev[grunnlag i tide]
6b: brev[grunnlag godkjent i tide] → prøv krav grunnlag K-g2 med paalegg_mottatt 2026-09-01
```
