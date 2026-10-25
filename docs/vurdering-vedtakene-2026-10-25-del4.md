# Vurdering av vedtakene, del 4: saken og kontrakten samlet (G), eksterne brev og grensesnitt (H)

Dato 25.10.2026. Kontrollert commit `569666b` på `main`. Dette er et arbeidsgrunnlag for
spørsmålene til oppdragsgiver, ikke en audit. Appen er ikke i produksjon og har ingen
reelle data.

**Kilder lest:** `AGENTS.md`; vedtaksskillen, testreglene, resonneringsskillen og
dokumentasjonsreglene; hovedplanen 1.3; vedtakene i [vedtaksfila](plans/vedtak.md) for
G og H (KT-U8, OV-U3, OV-U4–OV-U7, OV-U10, OV-U12–OV-U14, OV-U16–OV-U21, OV-U25,
OV-U35–OV-U42, EO-U8, VS-U11, VS-U18, VS-U21–VS-U23, VS-U27, VS-U33, KA-U16, KA-U20,
KA-U23, KA-U26, KA-U28, KA-U30, KA-U34, MM-U17, MM-U19, MM-U24, MM-U25, MM-U28,
MM-U29, MM-U32, KT-U1, HF-U12, HF-U18, FO-U1, FO-U3, GR-U26, LV-U22–LV-U24, LV-U29,
DL-U14). Kontraktsteksten er lest i `khjohns/kontrakt`: NS 8407 § 34.2.1 og § 34.2.2,
og konkurransegrunnlaget Del II pkt. B.2.16. Issuene #818, #909, #1045 og #1171.

**Kode lest:** `kjerne/utledning/visning.ts` (hele), `kjerne/utledning/utled.ts`
(`RegistrertBrev`, `dokumentasjonIBrevet`, `utledSporene`), `kjerne/regler/vederlag.ts`
(`poster`, kontrollen av standpunktene), `server/saksliste.ts` (`noekkeltall`),
`src/lib/kjernesak/saksbilde.ts`, `arbeidsflate.svelte.ts` (`bhSkjema`),
`kontekst.svelte.ts` (`avvisningFoerBrevet`), `vederlagskrav.ts`,
`src/lib/components/kjernesak/Kjernejournal.svelte`,
`src/lib/components/saksoversikt/ProjectOverview.svelte`,
`src/lib/constants/kontraktsregler.ts` (§ 34.1.3) og `src/lib/mockup/scenarios.ts`.
To subagenter kartla skjemaene, hjelpetekstene og stien for registrerte brev i TS-saksruta.
Påstandene deres som bærer et funn, er lest på nytt.

**Lagene:** **O** kontraktens ordlyd · **T** vedtatt tolkning · **A** vedtatt
produktavgrensning · **I** implementasjonen · **V** egen vurdering. **Belegg:** **K** kjørt
og observert 25.10 · **L** lest i kode · **—** ikke kontrollert.

Prøvene ble lagt midlertidig nederst i `kjerne/tester/brevtekst.test.ts`, kjørt med
`npx vitest run kjerne/tester/brevtekst.test.ts -t <navn>` og fjernet. De gjenbruker
hjelperne i fila (`sakMedKrav`, `send`, `laast`, `svar`, `VEDERLAG_DELVIS`).

## Funnene

### VG-H-01 Svarbrevet sier at byggherren ikke har svart på grunnlaget, også når byggherren har svart utenfor appen

- **Type:** vedtaksmotstrid.
- **Hva og for hvem:** Byggherren svarer på grunnlaget utenfor appen, for eksempel med et
  avslag. Når byggherren deretter svarer på vederlaget fra appen, slår den låste teksten fast at
  byggherren «ennå ikke» har svart på grunnlaget. Byggherren er bundet av det brevet sier
  (OV-U4). Dermed sier byggherren noe som ikke stemmer, og det står i motstrid til byggherrens
  eget brev. TE får to brev fra byggherren som sier ulike ting. I TS-saksruta i dag kan
  byggherren bare svare på vederlaget (#818). Svaret på grunnlaget må derfor sendes utenfor
  appen, og da får hvert svar på vederlaget denne teksten.
- **Vedtakene:**
  - GR-U26 gjelder «mens gjeldende versjon av grunnlaget ikke er besvart» og gir teksten
    «Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev <n> av <dato>.» (T).
  - Etter OV-U4 er et registrert brev dokumentasjon. Appen utleder ingenting av det, og
    «parten er bundet av det hen sender fra appen» (T).
  - Under OV-U4 er det riktig at appen ikke kjenner noe svar. Men GR-U26-teksten sier noe om
    korrespondansen i verden, ikke om appen. De to vedtakene gir derfor ulike svar på hva
    byggherrens brev sier om et svar sendt utenfor appen (V).
  - GR-U26 sier at byggherren kan unngå forbeholdet ved å svare på grunnlaget i samme brev.
    Den veien er ikke bygget i TS (A/I, #818).
- **Kodestedet:** `kjerne/frosset/brevtekst.ts` (forbeholdet etter GR-U26, linjen med «ennå
  ikke svart på grunnlaget») og `src/lib/kjernesak/arbeidsflate.svelte.ts` `bhSkjema`
  (bare vederlag).
- **Forløpet:**
  1. TE sender grunnlag, vederlag og frist (`sakMedKrav`, brev 2–4).
  2. Byggherren registrerer et brev sendt utenfor appen: `registrert_brev`, spor
     `grunnlag`, beskrivelsen «Byggherrens avslag på grunnlaget», sendt 5.10.
  3. Byggherren svarer delvis på vederlaget fra appen.

  Forventet etter vedtakene: OV-U4 gir ingen virkning av brevet, og det er riktig. Men brevet
  fra appen bør ikke si noe om byggherrens korrespondanse som ikke stemmer. Observert (K):

  > Byggherrens svar på kravet om justering av vederlaget i TEs krav i brev 3 av 3. oktober
  > 2026: Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev 2 av 2. oktober 2026.
  > Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger. …

  `gjeldendeSvar` for grunnlaget er `null`.
- **Belegg:** K for teksten (I). L for at byggherren ikke kan svare på grunnlaget i TS-saksruta
  (I, `bhSkjema`). Vedtakene T, motstriden V.
- **Sikkerhet:** høy for forløpet. Middels for at oppdragsgiver vil se det som motstrid og ikke
  som en akseptert følge av OV-U4. Uavklart: om et svar på grunnlaget kan sendes fra appen før
  første ekte sak (#818).
- **Minste retting eller avklaring:** spørsmål 1. Det enkleste er at teksten sier «i appen»,
  som OV-U10 gjorde med «Alle krav sendt i appen er avgjort».

### VG-H-02 TE kan bare sende vederlagskravet som tilbud, og brevet sier at kravet er et tilbud

- **Type:** implementeringsavvik og misvisende budskap.
- **Hva og for hvem:** TE som vil kreve oppgjør etter regningsarbeid, får bare valget tilbud i
  TS-skjemaet. Brevet sier da at kravet er et tilbud etter § 34.2.1. Etter § 34.2.2 første ledd
  skjer justeringen etter §§ 34.3 og 34.4, med mindre byggherren har akseptert et tilbud (O).
  Et krav sendt som tilbud kan altså gi et annet oppgjør enn TE mente å kreve. Skjemaet sier ikke
  at andre metoder ikke kan sendes fra appen.
- **Vedtakene:**
  - Etter OV-U14 avvises bare § 34.3.1, § 34.3.2 og § 34.3.3 i første versjon (A). Regningsarbeid
    etter § 34.4 skal altså kunne sendes. Vedtaket er ikke bygget (#909).
  - MM-U25 sier at appen bare viser handlingene parten kan gjøre nå (A).
- **Kodestedet:**
  - `src/lib/kjernesak/vederlagskrav.ts`: `metodeKanSendesTilKjernen` («Bare tilbud kan det i
    prøven») og meldingen «Metoden … kan ikke sendes for denne saken ennå. Velg tilbud.»
  - `TeVederlagForm.svelte` filtrerer metodene til tilbud, og standardvalget er
    `FASTPRIS_TILBUD`.
  - `kjerne/frosset/brevtekst.ts` lager «Kravet er et tilbud etter NS 8407 § 34.2.1.»
- **Forløpet:** TE åpner vederlagskravet i en TS-sak. Bare «Fast sum» kan velges. Brevet i
  prøven over: «TE krever justering av vederlaget med 130 000 kr eks. mva. Kravet er et tilbud
  etter NS 8407 § 34.2.1.» (K). Etter OV-U14 skulle regningsarbeid kunne velges. Skjemaet sier
  ikke hva TE gjør med et krav etter en annen metode (L).
- **Belegg:** K for brevteksten. L for filteret og meldingen (I). Vedtaket A. Virkningen etter
  § 34.2.2 er O og V.
- **Sikkerhet:** høy for at bare tilbud kan sendes. Middels for hvor mye det betyr: TE kan skrive
  en utdypning, men den låste teksten kaller kravet et tilbud.
- **Minste retting eller avklaring:**
  - Kjent som byggestatus (#909). Det nye er budskapet.
  - Inntil flere metoder er bygget, bør skjemaet si at bare tilbud kan sendes fra appen, og at
    et krav etter en annen metode sendes utenfor appen. «Velg tilbud» bør ikke stå som råd.
    Se spørsmål 5.

### VG-G-01 Regelsettet og demoen behandler kravet om rigg og drift som om det kan prekluderes etter § 34.1.3

- **Type:** implementeringsavvik. Latent i kjernen, synlig i demoen.
- **Hva og for hvem:** Kontraktsgrunnlaget fjerner den særskilte varslingsplikten for kravet
  etter § 34.1.3 første ledd (O, Del II pkt. B.2.16). Regelsettet i kjernen krever likevel et
  standpunkt om rettidig varsel for posten for rigg og drift. Ved påberopt preklusjon setter det
  posten til 0. Demosaken viser byggherren som påberoper at kravet om rigg og drift er varslet
  for sent. Demoen lærer brukerne en regel kontrakten ikke har. Bygges posten i #1171 uten at
  regelen rettes, kan byggherren få en preklusjon appen ikke skulle tilby.
- **Vedtakene:** OV-U25 med OV-U35: «Kravet etter første ledd har ingen særskilt
  varslingsplikt etter § 34.1.3.» (T).
- **Kodestedet:**
  - `kjerne/regler/vederlag.ts`:
    - kontrollen av standpunktene: `[harRigg(krav), 'rigg_varslet_i_tide', '§ 34.1.3']`;
    - `poster`: «Rigg og drift (#1171) har ingen begrensning og settes til 0 ved preklusjon»;
    - utløseren `preklusjon_rigg`.
  - `src/lib/mockup/scenarios.ts`, scenario 1: «Kravet om rigg og drift anses varslet for sent,
    men kr 280 000 godkjennes subsidiært.» med `subsidiaer_triggers: [..., 'preklusjon_rigg']`.
  - Bestemmelsespanelet i `src/lib/constants/kontraktsregler.ts` er riktig (L).
- **Forløpet:** I kjernen hindres det i dag av formatet. `kjerne/frosset/standpunkt.ts` avviser
  `rigg_varslet_i_tide === false` og en vurdering av rigg med «er ikke i kjernen ennå», og
  `vederlagskrav.ts` avviser et krav med rigg (L). I `/mockup` vises scenariet (L).
- **Belegg:** L (I). Vedtaket T. Kontraktsgrunnlaget O.
- **Sikkerhet:** høy for koden og demoen. Usikkert er om demoen vises for brukere før #1171 er
  bygget.
- **Minste retting eller avklaring:**
  - Teknisk retting 1 og 2.
  - I kjernen hører rettingen til byggingen av posten i #1171, med økt `REGELVERSJON`. Den bør
    stå som krav i #1171.

### VG-G-02 «Den nye overtakelsesdatoen» i posten for rigg og drift har ingen kilde i saken, og flere saker gir hver sin dato

- **Type:** uavklart valg. Ikke bygget, og bør avklares før #1171 bygges.
- **Hva og for hvem:**
  - OV-U37 sier at appen viser forlengelsen og «den nye overtakelsesdatoen som TEs premiss».
    OV-U39 gir ingen opplysning som en slik dato kan leses av: ingen opprinnelig og ingen ny
    overtakelsesdato, bare perioden med første og siste dag (T).
  - Forlengelsen i formelen for forlenget byggetid regnes mot den avtalte nye datoen for
    overtakelse for kontrakten (O, Del II pkt. B.2.16). Den er en størrelse for kontrakten
    samlet.
  - Viser hver sak sin egen «nye overtakelsesdato», kan to saker med overlappende forlengelse
    vise to ulike datoer for samme kontrakt. Ingen av dem er da kontraktens dato (V).
  - Det kan villede byggherren når hen tar stilling til beløpet. TE kan også komme til å sette
    datoen i saken som om den gjaldt kontrakten.
- **Vedtakene:**
  - OV-U37 og OV-U39 (T).
  - OV-U36: det som gjelder kontrakten samlet, føres utenfor appen (A).
  - OV-U37 og OV-U39 krever at TE begrunner avgrensningen mot andre saker (T).
- **Kodestedet:** ikke bygget. `kjerne/frosset/standpunkt.ts`: «Rigg og drift etter § 34.1.3
  første ledd er ikke i kjernen (#1171).» Ingen kode i TS-stien regner eller viser en
  overtakelsesdato (søkt etter `sluttfrist`, `sluttdato`, `overtakelse` i `kjerne/`, `server/`,
  `src/lib/kjernesak/` og `src/routes/[prosjektId]/`).
- **Forløpet (forløp 9, lest):**
  - Sak A krever 20 hverdager med perioden 1.3–28.3.
  - Sak B krever 15 hverdager med perioden 15.3–4.4.
  - Hver har en post for rigg og drift.
  - Etter OV-U37 viser hver sak «den nye overtakelsesdatoen» som TEs premiss. Hvilken dato det
    er, sier ikke vedtakene. Leses den som siste dag i perioden, viser sakene 28.3 og 4.4 for
    samme kontrakt.
  - Appen kontrollerer ikke overlappet (OV-U37), og det er vedtatt.
- **Belegg:** — for kjøring (ikke bygget). L for at ingen kode finnes. Vedtakene T, formelen O,
  vurderingen V.
- **Sikkerhet:** middels. Det kan finnes en lesning av OV-U37 som avklarer datoen, og den har
  jeg ikke funnet.
- **Minste retting eller avklaring:** spørsmål 2.

### VG-G-03 Fristkrav i flere saker for samme periode: ingen opplysning om at appen ikke ser de andre sakene

- **Type:** uavklart valg.
- **Hva og for hvem:**
  - To saker kan kreve fristforlengelse for samme periode, med parallelle eller sammenfallende
    forsinkelser.
  - Appen summerer ikke dagene på tvers av saker (EO-U8, og kommentaren i `noekkeltall`). Det er
    riktig.
  - Hverken fristkravet, hjelpeteksten eller brevet sier at appen ikke ser fristkrav i andre
    saker. Ingen tekst ber TE avgrense kravet mot dem.
  - For posten for rigg og drift har vedtakene en slik begrunnelse (OV-U37, OV-U39). For selve
    fristkravet har de det ikke.
  - Byggherren som svarer i to saker, får ingen påminnelse om sammenhengen. Svar på fristen er
    ikke bygget i TS ennå (#818).
- **Vedtakene:**
  - VS-U18: § 33.5 som veiledning. Appen sammenlikner bare TEs og byggherrens tall (T). Ikke
    bygget.
  - EO-U8: dagene i flere KOE-saker summeres ikke uten videre (T).
  - OV-U37 og OV-U39: avgrensningen gjelder bare posten for rigg og drift (T).
- **Kodestedet:** `TeFristForm.svelte` («Utmåling», § 33.5, med hjelpeteksten «Fristforlengelsen
  skal svare til den virkningen kontraktsforholdet har hatt eller vil få på fremdriften.»).
  `server/saksliste.ts` `noekkeltall` summerer ikke dagene. I TS-stien er det ingen relasjon
  mellom saker (L).
- **Forløpet (forløp 9, lest):**
  - TE sender i sak A et fristkrav på 20 dager og i sak B et på 15 dager, for delvis samme
    periode.
  - Hver sak utledes for seg. Nøkkeltallene viser «2 krav» og ingen dager, og ingen sak viser
    den andre.
  - Etter vedtakene er det riktig at appen ikke kontrollerer. Om avgrensningen skal være
    tydelig for partene, er ikke avgjort.
- **Belegg:** L (I). Vedtakene T. Vurderingen V.
- **Sikkerhet:** høy for koden. At det er et hull og ikke et bevisst valg, er V.
- **Minste retting eller avklaring:** spørsmål 3.

### VG-G-04 Nøkkeltallene «Krevd vederlag» og «Enighet om vederlag» sier ikke at de bare gjelder det som er sendt i appen

- **Type:** misvisende budskap.
- **Hva og for hvem:** Summene i prosjektoversikten tar med krav og enigheter fra appen.
  Følgende er ikke med:
  - krav og svar i registrerte brev (OV-U4);
  - kompensasjonen i uendret byggetid, som kreves utenfor appen (OV-U36).

  Krav i flere saker som gjelder samme kostnad, telles hver for seg (OV-U37: ingen kontroll av
  overlapp). Overskriftene sier «Krevd vederlag» og «Enighet om vederlag» uten avgrensning.
  OV-U10 endret statusteksten til «Alle krav sendt i appen er avgjort» for nettopp dette
  tilfellet (KK-05).
- **Vedtakene:** MM-U28: nøkkeltallene summerer krav og virksom enighet hver for seg, og ukjent er
  ikke 0 (T). Vedtakene OV-U10 og OV-U36 (T/A).
- **Kodestedet:** `server/saksliste.ts` `noekkeltall` og `ProjectOverview.svelte`
  («Krevd vederlag», «Enighet om vederlag», «Virksom enighet, etter appens lesing»).
- **Forløpet:** I sak A har byggherren registrert et brev med krav om 200 000 sendt utenfor
  appen. I sak B har TE sendt 100 000 fra appen. Oversikten viser «Krevd vederlag 100 000 kr»
  (L). Prøven over viser at et registrert brev ikke gir noe krav i sporet (K for utledningen).
- **Belegg:** L for summen og teksten (I). K for at et registrert brev ikke blir et krav (I).
  Vurderingen V.
- **Sikkerhet:** middels. Oversikten er en arbeidsflate, ikke et brev. Men byggherren kan bruke
  tallet i økonomioppfølgingen.
- **Minste retting eller avklaring:** spørsmål 4.

### VG-H-03 «Motparten har registrert brev» står også for byggherren, om byggherrens egne brev

- **Type:** misvisende budskap. Om TEs brev skal vises ved kravet for byggherren, er et uavklart
  valg.
- **Hva og for hvem:**
  - Ved et krav som venter på svar, viser journalen «<spor>: kravet venter på svar, og motparten
    har registrert brev.» med lista over brevene.
  - `brevVedKravet` tar bare byggherrens brev («Kravet er TEs»). Teksten er den samme uansett
    hvem som leser. Byggherren ser altså sine egne brev omtalt som motpartens.
  - TEs registrerte brev i sporet, for eksempel et revidert krav sendt utenfor appen, vises ikke
    ved kravet for byggherren som skal svare. Etter OV-U4 skal partene ta brevene i betraktning
    når de svarer.
  - Linja ved kravet gjengir beskrivelsen («Registrert brev fra BH, sendt …: <beskrivelse>»).
    Den sier ikke at beskrivelsen er avsenderens egne ord, og ikke «Appen vurderer ikke
    innholdet». Det sier merknaden for saken over og journalposten.
- **Vedtakene:**
  - OV-U20: «viser appen ved kravet motpartens registrerte brev» (T). «Motpartens» er ikke
    definert opp mot hvem som leser.
  - OV-U4: brevet vises med merknaden «Appen vurderer ikke innholdet» (T).
  - OV-U16: beskrivelsen er med egne ord (T).
- **Kodestedet:** `kjerne/utledning/visning.ts` `brevVedKravet`,
  `src/lib/kjernesak/saksbilde.ts` (`registrerteBrev` per spor) og
  `src/lib/components/kjernesak/Kjernejournal.svelte`.
- **Forløpet (forløp 7):**
  1. Byggherren registrerer et brev sendt utenfor appen i vederlagssporet, med beskrivelsen
     «Godkjenning av vederlaget». Brevet sier i realiteten at godkjenningen er betinget.
  2. Utledningen gir ingen standpunkt. Etiketten er `venter_paa_svar`, saken har merknaden
     `brev_utenfor_appen`, og brevet står ved kravet (K).
  3. TE kan sende en ny kravversjon, og byggherren kan svare fra appen (K, `handlinger`).
  4. Appen tillegger ikke brevet noe forbehold, og heller ingen godkjenning. Det er riktig etter
     OV-U4 (K).
  5. Det misvisende er bare formen: byggherren leser «motparten har registrert brev» om sitt eget
     brev. Linja ved kravet viser «Godkjenning av vederlaget» uten å si at det er byggherrens
     beskrivelse og at appen ikke har vurdert den (L).
- **Belegg:** K for utledningen og visningen i kjernen. L for teksten i komponenten (I).
- **Sikkerhet:** høy for teksten. Middels for hvor mye det betyr, fordi merknaden for saken står
  rett over.
- **Minste retting eller avklaring:** teknisk retting 3. Om TEs brev skal vises ved kravet for
  byggherren, er spørsmål 6.

## 1. Spørsmål til oppdragsgiver

Spørsmålene berører rettsregler og stilles ikke med spørsmålsverktøyet. Alternativene er
skrevet så de kan stå i vedtaksfila. Påstandene om koden er kontrollert i denne økta.
Alternativene er ikke prøvd mot vedtakene av en uavhengig subagent; det gjenstår før de
stilles (vedtaksskillen).

1. **Hva byggherrens svarbrev sier om grunnlaget når byggherren har svart utenfor appen
   (VG-H-01).**
   - **Bakgrunn:** Når byggherren svarer på vederlag eller frist uten å ha svart på
     grunnlaget i appen, sier brevet: «Byggherren har ennå ikke svart på grunnlaget i TEs krav
     i brev <n> av <dato>.» (GR-U26). Et svar på grunnlaget sendt utenfor appen er
     dokumentasjon, og appen leser det ikke som svar (OV-U4). Brevet fra appen sier da noe
     byggherren ikke mener, og byggherren er bundet av det brevet sier.
   - **A (anbefalt):** «Teksten i forbeholdet lyder: ‹Byggherren har ikke svart i appen på
     grunnlaget i TEs krav i brev <n> av <dato>. Standpunktene nedenfor gjelder under
     forutsetning av at grunnlaget for kravet foreligger.› Appen avgjør ikke om et brev sendt
     utenfor appen er et svar på grunnlaget. Presiserer GR-U26, i tråd med OV-U4 og OV-U10.»
   - **B:** «Har byggherren registrert et brev sendt utenfor appen i grunnlagssporet etter TEs
     gjeldende krav om grunnlaget, viser forbeholdet til brevet: ‹Byggherren har sendt brev om
     grunnlaget utenfor appen <dato>. Standpunktene nedenfor gjelder under forutsetning av at
     grunnlaget for kravet foreligger.› Appen vurderer ikke innholdet. Presiserer GR-U26.»
   - **C:** «Teksten i GR-U26 står.»
   - **Anbefaling:** A. Den er sann uten at appen må avgjøre hva det registrerte brevet er. B
     ville la sporet og datoen den som registrerte oppga, styre en låst setning.
   - **Valget styrer:** forbeholdsteksten i hvert svar på vederlag og frist så lenge byggherren
     ikke kan svare på grunnlaget i appen (#818), og senere når byggherren har svart utenfor
     appen.

2. **Hvilken overtakelsesdato saken viser i kravet om rigg og drift i forlenget byggetid
   (VG-G-02).**
   - **Bakgrunn:**
     - OV-U37 sier at appen viser «den nye overtakelsesdatoen som TEs premiss». OV-U39 har
       ingen slik opplysning, bare forlengelsen og perioden.
     - Etter kontraktsgrunnlaget (Del II pkt. B.2.16, forlenget byggetid) regnes forlengelsen
       mot den avtalte nye datoen for overtakelse for kontrakten.
     - Med flere saker kan hver sak vise sin egen dato.
   - **A (anbefalt):** «Saken viser ikke en ny overtakelsesdato. Den viser forlengelsen og
     perioden TE oppgir, som TEs premiss. Overtakelsesdatoen for kontrakten samlet føres ikke i
     appen. Presiserer OV-U37 og OV-U39, i tråd med OV-U36.»
   - **B:** «TE oppgir i posten den nye overtakelsesdatoen TE legger til grunn for kontrakten,
     og saken viser den som TEs premiss, ikke som avtalt. Appen sammenlikner ikke datoene i
     ulike saker. Utvider OV-U39.»
   - **Anbefaling:** A. Datoen gjelder kontrakten samlet, og B ville vise flere premisser for
     samme dato uten å si at de henger sammen.
   - **Valget styrer:** skjemaet og visningen av posten i #1171.

3. **Hva appen sier om fristkrav i flere saker for samme periode (VG-G-03).**
   - **Bakgrunn:** Appen ser ikke fristkrav i andre saker og summerer ikke dagene (EO-U8). For
     posten for rigg og drift begrunner TE avgrensningen mot andre saker (OV-U37, OV-U39). For
     fristkravet sier ingen tekst noe om andre saker.
   - **A (anbefalt):** «Veiledningen ved § 33.5 i fristkravet og fristsvaret sier at appen ikke
     ser fristkrav i andre saker, og at forlengelsen i flere saker ikke uten videre kan legges
     sammen. Appen krever ingen begrunnelse for avgrensningen og trekker ingen konklusjon.
     Utvider VS-U18, i tråd med EO-U8.»
   - **B:** «Som A, og i tillegg ber skjemaet TE begrunne hvordan kravet er avgrenset mot
     fristkrav i andre saker som gjelder samme periode, slik OV-U39 gjør for posten for rigg og
     drift. Begrunnelsen er ikke påkrevd. Utvider VS-U18.»
   - **C:** «Appen sier ingenting om andre saker i fristkravet.»
   - **Anbefaling:** A. Den avgrenser hva appen ikke kontrollerer, uten å be TE om mer enn
     § 33.6.1 krever.
   - **Valget styrer:** veiledningsteksten i fristskjemaene (VS-U18 er ikke bygget).

4. **Hva nøkkeltallene i prosjektoversikten sier om avgrensningen (VG-G-04).**
   - **A (anbefalt):** «Nøkkeltallene for vederlag sier at de gjelder krav og enigheter sendt
     i appen. Krav og svar i brev sendt utenfor appen og kompensasjonen for rigg og drift i
     uendret byggetid er ikke med. Krav i flere saker kan gjelde samme kostnad, og appen
     kontrollerer det ikke. Presiserer MM-U28, i tråd med OV-U10, OV-U36 og OV-U37.»
   - **B:** «Nøkkeltallene står som i MM-U28.»
   - **Anbefaling:** A, av samme grunn som OV-U10.
   - **Valget styrer:** overskriftene og teksten i oversikten.

5. **Hva skjemaet sier mens bare tilbud kan sendes som vederlagskrav (VG-H-02).**
   - **Bakgrunn:**
     - Etter OV-U14 skal bare enhetsprisene i § 34.3.1–§ 34.3.3 avvises i første versjon.
       Bygget er bare tilbud (#909).
     - Brevet sier «Kravet er et tilbud etter NS 8407 § 34.2.1.» Etter § 34.2.2 første ledd
       har et akseptert tilbud en annen virkning enn oppgjør etter §§ 34.3 og 34.4.
   - **A (anbefalt):** «Til andre metoder er bygget, sier skjemaet for vederlagskravet at
     kravet bare kan sendes fra appen som tilbud etter § 34.2.1, og at et krav etter en annen
     metode sendes utenfor appen. Skjemaet foreslår ikke at TE velger tilbud. Presiserer
     MM-U25 for OV-U14.»
   - **B:** «Regningsarbeid etter § 34.4 bygges før første ekte sak, som OV-U14 sier. Til da
     står skjemaet.»
   - **Anbefaling:** A nå og B før første ekte sak. Rekkefølgen er et arbeidsvalg i #909.
   - **Valget styrer:** meldingen og hjelpeteksten i TEs vederlagsskjema.

6. **Om TEs registrerte brev skal vises ved kravet for byggherren (VG-H-03).**
   - **Bakgrunn:** OV-U20 viser «motpartens registrerte brev» ved kravet som venter på svar.
     Koden leser det som byggherrens brev, fordi kravet er TEs. Byggherren som skal svare, ser
     ikke TEs registrerte brev ved kravet, bare i journalen.
   - **A (anbefalt):** «Ved kravet som venter på svar viser appen hver parts registrerte brev
     som hører til sporet eller saken og ikke er rettet, med avsenderen, beskrivelsen som
     avsenderens beskrivelse og merknaden ‹Appen vurderer ikke innholdet›. Presiserer
     OV-U20.»
   - **B:** «Bare byggherrens brev vises ved kravet, som i dag. Teksten sier ‹byggherren har
     registrert brev›.»
   - **Anbefaling:** A. Byggherren skal ta TEs brev i betraktning når hen svarer (OV-U4).
   - **Valget styrer:** `brevVedKravet` og teksten i journalen.

## 2. Tekniske rettinger som følger av gjeldende vedtak

1. Ta preklusjonsscenariet for rigg og drift ut av demosaken i `src/lib/mockup/scenarios.ts`
   (OV-U25, OV-U35).
2. Før kravet i #1171: posten for rigg og drift har ingen standpunkt om rettidig varsel etter
   § 34.1.3, og ingen utløser `preklusjon_rigg` (`kjerne/regler/vederlag.ts`, OV-U25, OV-U35).
   Påberopelsen etter § 34.1.2 gjelder fortsatt hele kravet (OV-U27).
3. Teksten ved kravet i `Kjernejournal.svelte` sier hvem som har registrert brevet, og ikke
   «motparten», så lenge `brevVedKravet` bare tar byggherrens brev. Linja for brevet får
   «Appen vurderer ikke innholdet» (OV-U4, OV-U20).

## 3. Kontrollert og riktig håndtert

- Et registrert brev gir ingen standpunkt, enighet, sperre eller forbehold i utledningen, og
  TE og byggherren kan fortsatt sende fra appen. Det gjelder også et eksternt svar med
  forbehold (OV-U4, KA-U16 endret av OV-U4, KA-U20 og KA-U26 utsatt av OV-U7). K.
- Ved «venter på svar» viser visningen byggherrens registrerte brev i sporet, og saken har
  merknaden etter OV-U19 (OV-U4, OV-U20). K.
- Appen tillegger ikke et registrert brev forbehold. Merkingen etter KA-U20 avvises av formatet
  (OV-U7). L.
- Et svar på en eldre kravversjon er skilt fra kravet som venter: svarbrevet viser til
  kravbrevet, og den nye versjonen sier «Kravet erstatter TEs krav i brev <n>». Etiketten blir
  `venter_paa_svar`, og arbeidsflaten viser ikke det eldre svaret som gjeldende (KT-U1,
  MM-U24). K for brevteksten, L for visningen. `eldreKravversjon` i
  `visning.ts` og `poster` i `saksbilde.ts` leses ikke av noen komponent, og det gir ingen
  feil i dag.
- Fristdagene summeres ikke på tvers av saker (EO-U8). L.
- Den kontraktsomfattende terskelen for rigg og drift i uendret byggetid regnes ikke i noen
  sak, og ingen tekst sier at TE må vente eller ikke trenger å varsle (OV-U36). L. At ingen tekst ennå
  sier at kravet kreves utenfor appen, er byggestatus: kjent (#1171).
- Bestemmelsespanelet for § 34.1.3 følger OV-U25 og OV-U35. L.
- En avvisning vises ved «Send» før brevkontrollen, med feltmeldingen ved feltet. Ingen avvisning
  oppdages først etter at brevet er kontrollert (MM-U32, #1254). L.
- Registrering av et varsel sendt utenfor appen har påkrevd dato og vedlegg, ingen fritekst og
  ingen brevkontroll, fordi appen ikke lager noe brev (OV-U5, MM-U17). L.
- En topic fra Catenda er ikke varsel eller krav, og et registrert brev blir ikke dokument i
  Catenda (KT-U6, KT-U7, LV-U11). L, gjennom subagentens sitater av `server/hendelser.ts` og
  `server/levering.ts`.
- Kjent og ikke ført på nytt:
  - registreringsskjemaet for brev sendt utenfor appen finnes ikke i TS-saksruta, selv om
    saksbildet sier at et varsel «registreres senere» (#807, #1045);
  - byggherren kan ikke svare på grunnlag eller frist i TS (#818, #909);
  - posten for rigg og drift og teksten etter OV-U36 er ikke bygget (#1171);
  - forsering, endringsordre og § 34.3 er utenfor TS (OV-U1, OV-U7, #310).

Python-stien: ikke vurdert.

## 4. Verifikasjon og grenser

- **Kjørt (K):**
  - forløpet i VG-H-01;
  - forløp 7 med et eksternt svar med forbehold registrert som dokumentasjon (visningen,
    handlingene og en ny kravversjon etter registreringen).
- **Forløp 9 er ikke kjørt.** Kjernen har ingen relasjon mellom saker. Funnene bygger på
  lesing av `noekkeltall` og fraværet av kode (L og —).
- **Ikke kontrollert i nettleseren.** `saksrute.ts` er ikke kjørt, så tekstene i komponentene er
  lest, ikke sett.
- **Ikke gjennomgått:** hjelpetekstene i kontraktsbordskjemaene én for én. Subagenten fant ingen
  ferdigutfylt standardtekst i utdypningen. To forhold er sett og ikke ført som funn:
  - En ny versjon av vederlagskravet fylles med forrige begrunnelse, så en gammel begrunnelse
    kan følge et nytt beløp. TE kontrollerer brevet før sending.
  - Et nytt grunnlagskrav krever endret tekst.
- **Ikke vurdert:** om byggherrens påkrevde svar om rettidig varsel tvinger fram en uttrykkelig
  setning («byggherren gjør ikke gjeldende …»), som byggherren kanskje ville latt være usagt.
  Brevtekstene er vedtatt (LV-U4).
- **Ikke kontrollert:**
  - § 35.2 uten dato (KT-U8);
  - EO-U8 og HF-U12 i en EO-sak, som ikke finnes i TS;
  - #1060 om kontraktens fravik fra standarden per prosjekt. VG-G-01 viser at fraviket i
    B.2.16 er bygget inn globalt, og #1060 dekker det.
- **Alternativene i spørsmålene** er ikke prøvd mot vedtaksfila av en uavhengig subagent.
