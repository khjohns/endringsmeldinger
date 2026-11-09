# Designsystemet

Beslutningene for Varden, og hvorfor de er tatt. Fila gjelder bare Varden
(oppdragsgiver 06.11, #1646). Metoden står i
[interface-design-skillen](../.claude/skills/interface-design/SKILL.md).

**Verdiene står ikke her** (oppdragsgiver 23.10, #1080). Farger, flater, kanter og skrifter er definert i
[`theme.css`](../src/lib/components/kontraktsbord/theme.css), avstand og radius i
`@theme` i [`app.css`](../src/app.css). Fila nevner bare tokennavnene, og
[`designsystem.test.ts`](../src/lib/designsystem.test.ts) feiler når et token
som nevnes her, ikke finnes der. Det som betyr noe juridisk, står i
[vedtaksfila](../docs/plans/vedtak.md). Fila viser til vedtakene og gjengir dem ikke.

Språket i teksten står i [språkfila](../docs/sprak.md).

Fila har også design som er flyttet fra [vedtaksregisteret](../docs/vedtaksregister/README.md#klassen):
poster med klassen design, som viser hit med «Flyttet til» (svar 5 04.11 i
[#1534](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623211248)).
Den flyttede teksten har et anker med vedtakets ID i små bokstaver, som `<a id="mm-u22"></a>`,
og er skrevet etter språkfila.
Brukerprøven endrer det uten vedtak, men ikke noe et vedtak sier. En endring som ville endre
noe et vedtak sier, krever nytt vedtak ([vedtaksskillen](../.claude/skills/vedtak/SKILL.md)).

## Retningen

**Varden er visningen** (oppdragsgiver 28.10, #1338, runde 6).

**Blekk** (oppdragsgiver 29.10, #1391): «Blekk er kanskje et fint utgangspunkt – tvinger
oss til å jobbe godt med form og struktur. Jeg er ikke fremmed for mer farge senere.
Beholde inter som font.» Oslo-logoen er fast.

- **Svart blekk på kjølig grått.** Hierarkiet bygges med form, struktur, vekt og
  blekknivå, ikke med farge. Primærhandlingen er nesten svart (`--brand`).
- **Hver farge betyr én ting:**
  - `--brand` er handling: primærknappen og valgt svar. Valgt svar har også flaten
    `--surface-selected`. I det mørke panelet markeres valgt spor med `--sidebar-active`.
  - `--draft` er utkast: det som ikke er sendt og bare er synlig for teamet. Utkastet har
    stiplet kant rundt hele kortet og `--draft-bg` i hodet, så det aldri ser ut som et
    sendt brev. Ingenting annet er gult.
  - `--control-focus` er fokus og ingenting annet.
  - `--danger` er feil.
- **Subsidiært får ingen farge.** Det skilles med tekst og form (#197, oppdragsgiver 29.10).
  Over et subsidiært spørsmål står «Gjelder hvis» med én linje per innsigelse det bygger på,
  med en kantlinje til venstre, og spørsmålet selv står kort (oppdragsgiver 30.10, #1391).
  Hver linje lenker til feltet sitt. Lagene skal komme fra kjernen (#1400).
- **Demomerket** «Varden · eksperimentell visning» er nøytralt og bruker ikke utkastfargen.
- **Skriften er Inter** (`--font-sans`), som før. Varden bruker fem størrelser: 12, 14, 16,
  20 og 24 px, omtrent forholdet 1,2 fra 14 px. 12 px er etiketter og metadata, 14 px er
  brødtekst og hjelpetekst, og 20 px er overskriftene. Vekt og farge gjør resten av
  hierarkiet (oppdragsgiver 30.10, #198). Brevene har egne skrifter, under «Typografi».
- **Skallet** (oppdragsgiver 29.10): panelet til venstre er mørkt blekk
  (`--sidebar-bg`) over hele høyden, med byvåpenet og «Oslo kommune / Oslobygg KF» øverst,
  saken og sporene, og nederst prosjektet, kontraktsformen og partene under «Kontrakten». Etiketten
  står over verdien, som i «Prosjektet i korte trekk», så lange navn får plass. Et navn som
  mangler, står ikke der (oppdragsgiver 30.10, #1398). Topplinja står over arbeidsflaten, med rollen
  og handlingene som gjelder hele saken. Arbeidet i sporet begynner rett under.
- **Arbeidet er like bredt som et ark** (oppdragsgiver 30.10): hovedkolonnen er høyst
  `--varden-ark`, like bred som brevet, og panelet til høyre er `--varden-stoette` i lesingen,
  svaret og brevkontrollen. Er det plass til overs, står de samlet og midtstilt, og
  topplinja og meldingene følger de samme kantene (`--varden-arbeid`).
- **Et brev har samme bredde der det vises** (oppdragsgiver 30.10). Leses brevet ved siden
  av skjemaet, felles panelet til venstre inn, så begge kolonnene blir omtrent et ark, og
  høyst et ark. Panelet kommer tilbake når brevet lukkes.

Verdiene står i `.tema-varden` i `theme.css`, som Varden og showcasen bruker.
[`fargetokens.test.ts`](../src/lib/fargetokens.test.ts) prøver dem, også utkastfargen og
feltkanten fra #1258.

- **Flatene skifter bare i lyshet**: `--canvas` under, `--surface` for innhold,
  `--surface-warm` for hover og tabellhoder, og `--surface-inset` for felt og innfelte
  områder. Valgt har `--surface-selected`.
- **Fire nivåer blekk.** `--ink` for verdier og overskrifter, `--ink-2` for etiketter
  og støttetekst, `--ink-3` for metadata og `--ink-4` for dempet tekst. Alle fire nivåene
  holder 4,5:1 på flatene, så tekst dempes med et nivå og aldri med `opacity`.
  [`fargetokens.test.ts`](../src/lib/fargetokens.test.ts) feiler under kravet for
  flatene den lister i `FLATER`, ikke for andre flater eller lokale overstyringer.
- **Kanter, ikke skygger.** Strukturen tegnes med `--rule`, `--rule-subtle` og
  `--rule-strong`. Skygger (`--overlay-shadow-sm`) brukes bare på overlegg, som infotipset og
  lappen i sakslisten.

## Typografi

Skriftene ble valgt 07.11 (oppdragsgiver), etter en sammenligning av fire brevskrifter.

- `--font-sans` (Inter) for grensesnittet, 14 px med linjehøyde 1,5 som grunnlag. Inter
  lastes med optisk størrelse, så overskriftene strammes av seg selv. Overskriftene på 20 og
  24 px har i tillegg `--sperring-20` og `--sperring-24`, og vekten 600.
- **Tall i Inter med `tabular-nums`**: beløp, dager, datoer og ID-er i grensesnittet står
  under hverandre og flytter seg ikke. I brevet står de i brevskriften, også med
  `tabular-nums`. Varden bruker ikke en egen tallskrift.
- **Brevskriften følger avsenderen**, så partenes brev skiller seg fra appen og fra hverandre.
  Hele brevet står i avsenderens skrift: avsender, mottaker, referanser, tittel og tekst, med
  samme oppsett og vekter for begge parter. Stempelet «Sendt …» og linja under brevet er appens
  og står i Inter (oppdragsgiver 07.11, [LV-U26](../docs/plans/vedtak.md#lv-u26), [LV-U58](../docs/plans/vedtak.md#lv-u58) og
  [LV-U59](../docs/plans/vedtak.md#lv-u59)).
  - Byggherrens brev står i Oslo Sans (`--font-brev-bh`) i 11 pt. Det er
    Oslo kommunes skrift, og lisensen gjelder bare Oslo kommunes egen kommunikasjon. Den
    brukes derfor aldri i totalentreprenørens brev. Filene hentes fra
    `@oslokommune/punkt-assets` og sjekkes ikke inn.
  - Totalentreprenørens brev står i Source Serif 4 (`--font-brev`) i 16 px ([LV-U58](../docs/plans/vedtak.md#lv-u58)).
  - Tegn brevskriften mangler, står i Noto Sans og Noto Sans Math
    ([LV-U26](../docs/plans/vedtak.md#lv-u26)).
  - Tittelen i brevet er 20 px for begge parter. Den dempede tittelen, når brevet leses ved
    siden av et utkast, har brødtekstens størrelse og vekt 600 (oppdragsgiver 07.11, #1659).
  - Et sitat fra et brev utenfor brevet, som utdraget i tråden, står i avsenderens brevskrift
    og størrelse (oppdragsgiver 07.11, #1659).
  - Begge har linjehøyde 1,6. Oslo Sans i 11 pt, Source Serif 4 i 16 px og Inter i 14 px
    har nesten samme x-høyde (7,6–7,8 px), så brevene og grensesnittet ser like store ut.
  - PDF-en som sendes, skal ha samme skrift og størrelse som forhåndsvisningen (#1652).
- **Referansene i brevhodet står på faste plasser**, som i Oslo kommunes brevmal: to kolonner,
  også på smal skjerm, med Sak og Vår ref. under til venstre og Deres ref. og Dato under til
  høyre. Mangler et felt, står plassen tom, så Dato alltid står nederst til høyre
  (oppdragsgiver 07.11). Det fulle hodet er #1173.
- Hierarkiet bygges med vekt og blekknivå før størrelse.

## Avstand, mål og radius

- **4 px-rutenett** (`--spacing-1` til `--spacing-12`). Tett i sporoversikten og
  skjemaene, mer luft rundt brevteksten.
- **Smal skjerm:** støttekolonnen legges under arbeidet under 1180 px, og panelet over
  arbeidet under 860 px, som i prototypene (oppdragsgiver 01.11, #1461).
- **Radius betyr noe** (oppdragsgiver 01.11, #1402). Bare knappene er runde,
  som piller (`--r-knapp`), så en handling skiller seg fra alt annet. Kort og brev har
  samme radius, 12 px (`--r-kort`): det gir ro på store flater, og brevet ser ikke
  annerledes ut enn kortene ved siden av. Merker og stempler, som «Registrert»,
  «Inngår i EO-012» og «Sendt …», har 2 px (`--r-merke`), så de leses som merker på et
  dokument og ikke som knapper. Felt, valg og vedlegg har 4 px (`--r-felt`), og bokser
  inne i et kort 6 px (`--r-innfelt`). Tokenene står i `theme.css`.
- **Høyst tre nivåer av flater** (oppdragsgiver 09.11, #1663): seksjonen har nummer og
  overskrift uten ramme, elementet er en rad med hårlinje, og feltet har bare sin egen kant.
  Ingen kort i kort. Hjemmelen står som dempet tekst etter overskriften, ikke som et merke.
  Blekket går til innholdet, ikke til beholderne.

## Farge som betyr noe

Varden har ingen statusfarger utenom `--danger` for feil. En ny farge brukes bare der en
regel her eller et vedtak sier det. Den gjentar det teksten sier, og står aldri alene. Før
en ny farge prøves form og tekst (oppdragsgiver 06.11, #1646).

- **Utkast og interne ting** har `--draft`, `--draft-bg` og `--draft-border`, med
  stiplet kant. Det som ikke er sendt, skal aldri se sendt ut.
- **Fokus** vises med `--control-focus` og `--control-focus-ring`.
- **Svak rød i brevkontrollen** (`--danger-bg` med rød kant til venstre) står bare ved virkningen av
  en handling som ikke kan gjøres om, som «Trekk påberopelsen», og ikke ellers i flaten. Teksten
  sier selv at handlingen ikke kan gjøres om (`kanIkkeGjoeresOm` i `Brevkontroll`; oppdragsgiver
  06.11, #1615). Ingen brevkontroll i Varden bruker den ennå, fordi trekket ikke er bygget.
- **Rød knapp** (`variant="fare"`) står bare i dialogen som bekrefter en handling som ikke kan
  gjøres om, som «Forkast utkast» i den nye versjonen av påberopelsen (oppdragsgiver 07.11,
  PR 1650).
- **En farge sier aldri det appen ikke kan slutte.** Ingen rødt for «for sent» og
  ingen farge for alvorlighet ved en frist. Vedtakene i [vedtaksfila](../docs/plans/vedtak.md)
  avgjør hva visningen kan si.

## Knapper, skjemaer og feilmeldinger

Bygger på rådene i Punkt om [plassering av knapper](https://punkt.oslo.kommune.no/latest/god-praksis/plassering-av-knapper/),
[gode feilmeldinger](https://punkt.oslo.kommune.no/latest/god-praksis/gode-feilmeldinger/),
[skjemadesign](https://punkt.oslo.kommune.no/latest/god-praksis/skjemadesign/) og
[deaktiverte knapper](https://punkt.oslo.kommune.no/latest/god-praksis/disabled-states/),
med egne ord (#1187). Hvilke handlinger som vises, og når en knapp er inaktiv, står
i [MM-U25](#mm-u25) og [MM-U32](#mm-u32). Tilgjengeligheten kontrolleres etter
[`uu-sjekk`](../.claude/skills/uu-sjekk/SKILL.md).

- **Rekkefølgen er primær, sekundær, tertiær**, venstrestilt, også i dialoger og
  på smal skjerm. Den visuelle rekkefølgen er den samme som i DOM-en, så tab-rekkefølgen
  følger den. Handlinger av et annet slag, som «Slett utkastet», står ikke i samme
  gruppe.
- **Knappeteksten sier hva som skjer**, med et verb i imperativ og helst høyst tre
  ord: «Send svar», ikke «OK». «Avbryt» betyr at ingenting lagres eller endres.
- **Feltene står under hverandre**, med label over feltet og hjelpeteksten under
  labelen. Labelen har ikke kolon, og plassholdertekst bærer aldri mening. Ved to
  til seks alternativer vises alle, ikke en nedtrekksliste. En nedtrekksliste passer
  først når alternativene er for mange til å vises. En lang liste med grupper, som de
  17 forholdene, får en egen velger med søk og grupper (oppdragsgiver 02.11, #1492).
- **Bredden på feltet følger svaret det venter.** Et datofelt er om lag så bredt som
  en dato med kalenderikonet, og et nummer eller en dato for endringsordren har et
  kort felt. Løpende tekst, som en tittel eller en beskrivelse, har full bredde
  (oppdragsgiver 02.11, #1492).
- **Korte valg, som nei og ja, står ved siden av hverandre.** Om to eller tre får
  plass på én linje, vurderes i hvert tilfelle. Alternativer som ville brytes ujevnt
  ved siden av hverandre, står under hverandre i kort med lik bredde, så de leses som
  en liste (oppdragsgiver 02.11, #1492).
- **Valgfrie felt merkes «(valgfritt)»**, og obligatoriske felt har
  `aria-required="true"` uten synlig merke. Appen bruker bare denne ene merkingen.
- **Én leselinje til du åpner** (oppdragsgiver 09.11, #1663). En liste med redigerbare
  elementer, som kravpostene, svarene per post og de besvarte punktene i et skjema, vises som
  leselinjer med faste kolonner, og én leselinje viser det brevet kommer til å si om elementet.
  Ett element er åpent om gangen, som et skjema med etikett over felt og «Ferdig» i bunnen, og
  et ubesvart element står åpent til det er besvart. Lesing og redigering får hver sin form, og
  den rolige tilstanden er den som vises mest. Prototypen er
  [vederlagskrav-te-v3.html](../docs/design/prototyper/vederlagskrav-te-v3.html).
- **To vekter på et valg** (oppdragsgiver 09.11, #1663). Pillen med ramme står for et
  standpunkt på seksjonsnivå, som «Kom i tide» og «Kom for sent». Inne i et åpent element er
  valget radio og tekst, og bare det valgte svaret får flaten `--surface-selected`. Et valg med
  én forklaring per alternativ, som oppgjørsformen, står som kort under hverandre.
- **Normalsvaret er en setning, unntaket en lenke** (oppdragsgiver 09.11, #1663). Et spørsmål
  med et klart normalsvar stilles ikke som en radiogruppe. Setningen sier normalsvaret med
  hjemmelen, og en lenke åpner unntaket. Det første tilfellet er varslene etter punkt 34.3.3 og
  34.4 for en kravpost: «Dette kravet er varselet for P2», med lenken «Varselet for P2 er gitt
  før» ([VS-U49](../docs/plans/vedtak.md#vs-u49) og [VS-U50](../docs/plans/vedtak.md#vs-u50)
  sier hva TE kan oppgi, ikke hvordan spørsmålet stilles).
- **Leselinja for et svar med lag** (oppdragsgiver 09.11, #1663) viser standpunktet i det første
  laget som gjelder elementet, uten etiketten «Prinsipalt». Lagene under står som dempede linjer
  som begynner med vilkåret, med brevets ord: «Subsidiært, hvis fast sum legges til grunn:
  190 000 kr, godkjent delvis.» En innsigelse som rammer hele kravet, står én gang over
  tabellen og gjentas ikke per element. Summene per lag hører til panelet. Tabellen i brevet og
  panelet følger [OV-U73](../docs/plans/vedtak.md#ov-u73); leselinja er skjemaets.
- **Feilmeldingen står rett under feltet** og sier hva som hindrer (`AGENTS.md`,
  «Skriv etter hva teksten gjør»), med forslag til retting der appen kan gi det. Den
  forsvinner når feltet er rettet. Når kontrollen skjer, og hva som vises øverst i
  skjemaet, står i [MM-U32](#mm-u32). En feil fra serveren beklager og sier hva parten kan gjøre;
  en feil i utfyllingen går rett på sak. Ingen feilmelding i en egen dialog.

## Ordene i visningen

Ordene i brev og skjemaer står i [språkfila](../docs/sprak.md). Punktene her er flyttet fra
vedtaksregisteret (#1534).

- <a id="ov-u75"></a>**OV-U75** Visningen viser til bestemmelsene i NS 8407 med «punkt», for
  eksempel «punkt 33.4» og «jf. punkt 31.3». Der henvisningen står alene som merke, eller i en
  tabellcelle uten en setning rundt, står «pkt. 33.4». Skjermbredden avgjør ikke valget. Lover
  står med «§», for eksempel «avtaleloven § 4». Tekst parten skriver selv, endres ikke.
- <a id="ov-u87"></a>**OV-U87** Uttrykket «Kravet som gjelder» brukes ikke om forholdet. I
  oversiktene over vederlag og frist står det om den gjeldende versjonen av kravet. Hva forholdet
  heter i visningen, står i [U-9 i BF-05](../docs/domenetabell/brukerforlop/BF-05.md#u-9). Posten
  endrer ingen vedtak.
- **Visningen viser til et brev i saken i kortform**, med brevets nummer i saken: «brev 5»,
  «Siste: brev 5 fra BH». Merkingen og datoen står i brevhodet og i brevet selv, der brevteksten
  viser til et tidligere brev etter [LV-U53](../docs/plans/vedtak.md#lv-u53). Registrert
  korrespondanse uten nummer omtales som i brevteksten, med parten, typen og datoen (LV-U42).
  Tekstene står i `brevref` i `src/lib/components/varden/tekster.ts` (oppdragsgiver 05.11, #1631).

## Kravene, sporene og handlingene

Punktene her er flyttet fra vedtaksregisteret (#1534). Hvert punkt har ID-en fra registeret, og
i parentes vedtakene der den bindende setningen står, og de senere postene som har endret
punktet. Det juridiske står i vedtakene, ikke her.

- <a id="mm-u22"></a>**MM-U22** Hvert krav har én kort betegnelse fra en fast liste, som bare
  sier hvilket utsagn eller hvilken relasjon som foreligger, med partenes siste krav og svar og
  brevet under. Saken har ingen samlet betegnelse, unntatt når kravene er avgjort ([OV-U10](../docs/plans/vedtak.md#ov-u10)),
  avslaget på grunnlaget er godtatt (SK-01), grunnlaget er trukket ([GR-U5](../docs/plans/vedtak.md#gr-u5)) eller saken
  ikke er forstått ([MM-U2](../docs/plans/vedtak.md#mm-u2)). Lista står i [MM-U30](#mm-u30)
  (presiserer [OV-U3](../docs/plans/vedtak.md#ov-u3), OV-U10, GR-U5, MM-U2, [MM-U15](../docs/plans/vedtak.md#mm-u15) og [B-03 om dokumentet](../docs/plans/vedtak.md#b-03-dokument);
  snevret inn av [MM-U39](../docs/plans/vedtak.md#mm-u39)).
- <a id="mm-u30"></a>**MM-U30** Hvert spor har høyst én betegnelse, i denne rekkefølgen:
  «Trukket»; «Byggherren har bedt om spesifisert krav (punkt 33.6.2)» (bare frist, til
  forespørselen er besvart); «Svar ikke registrert»; «Byggherren har frafalt
  pålegget» (bare grunnlaget); «Enige»; «Svaret er ikke godtatt»; «Krav sendt» (TE har godtatt
  avslaget på grunnlaget, og sporet har verken enighet eller trekk); «Ingen krav»; «Varslet».
  Ingen betegnelse når ingenting er sendt. Byggherrens resultat, enighetens virkning,
  innsigelser, protester og passivitet står i linja under. Presiserer [MM-U22](#mm-u22) og
  [MM-U24](#mm-u24) (snevret inn av [MM-U31](#mm-u31) og [MM-U37](../docs/plans/vedtak.md#mm-u37); presisert av
  [OV-U43](../docs/plans/vedtak.md#ov-u43)).
- <a id="mm-u31"></a>**MM-U31** Betegnelsen gjelder til forespørselen er besvart, og bare så lenge saken ikke er lukket. Etter et godtatt
  avslag viser fristen det som ellers foreligger, for eksempel «Varslet». Snevrer inn
  [MM-U30](#mm-u30), i samme retning som [MM-U24](#mm-u24) og SK-01 (snevret inn av
  [MM-U37](../docs/plans/vedtak.md#mm-u37)).
- <a id="mm-u24"></a>**MM-U24** Ved kravet står det som foreligger: et krav uten registrert svar
  fra byggherren, et svar TE ikke har godtatt (med akseptfristen), eller en aksept etter fristen
  uten registrert svar fra byggherren. Betegnelsene sier ikke hvem som skal handle, etter føringen
  31.10 under «Handlingene i Varden» (oppdragsgiver 04.11, PR #1552). Fristveiledningen står ved kravet, regnet fra sendingen. Visningen
  sier ikke at en part har plikt, at en frist er oversittet, eller at TE ikke har flere krav
  (presiserer [VS-U2](../docs/plans/vedtak.md#vs-u2), [VS-U10](../docs/plans/vedtak.md#vs-u10), [HF-U5](../docs/plans/vedtak.md#hf-u5), [LV-U7](../docs/plans/vedtak.md#lv-u7) og [OV-U4](../docs/plans/vedtak.md#ov-u4); bindende i
  [LV-U9](../docs/plans/vedtak.md#lv-u9) og [HF-U11](../docs/plans/vedtak.md#hf-u11); endret av [MM-U34](../docs/plans/vedtak.md#mm-u34)).
- <a id="mm-u23"></a>**MM-U23** Ved kravet står partenes standpunkter med part, dato og
  henvisning til brevet, for eksempel «BH: varslet for sent», og hvert tall skal kunne finnes igjen
  i et brev. En vurdering løsningen gjør selv, vises bare der et vedtak krever det, og teksten
  sier da hva den bygger på, så den ikke leses som en parts standpunkt. At visningen aldri sier at
  et krav er prekludert, tapt eller avgjort, står i [VS-U3](../docs/plans/vedtak.md#vs-u3) og [HF-U11](../docs/plans/vedtak.md#hf-u11), og at løsningen
  ikke legger en vurdering i munnen på en part, i [MM-U33](../docs/plans/vedtak.md#mm-u33). Posten utvider [HF-U2](../docs/plans/vedtak.md#hf-u2) og
  presiserer [MM-U12](../docs/plans/vedtak.md#mm-u12) (opphevet av MM-U50) (lesningen 04.11 i
  [#1534](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623211248)).
- <a id="mm-u25"></a>**MM-U25** Visningen viser bare handlingene parten kan gjøre nå. Kan et krav
  ikke lenger endres, sier kravet det i én linje, med henvisning til utsagnet som hindrer. Der
  [OV-U2](../docs/plans/vedtak.md#ov-u2) og [MM-U2](../docs/plans/vedtak.md#mm-u2) krever det, sier saken at noe må sendes utenfor løsningen
  (presiserer [OV-U2](../docs/plans/vedtak.md#ov-u2) og MM-U2; presisert av [MM-U32](#mm-u32)).
- <a id="mm-u32"></a>**MM-U32** En handling parten kan gjøre nå, er alltid aktiv. Mangler noe i
  skjemaet, kontrolleres det når parten sender, og skjemaet sier ved feltet og øverst hva som
  mangler. En knapp er inaktiv bare mens en sending pågår (presiserer [MM-U25](#mm-u25)).
- <a id="mm-u40"></a>**MM-U40** Varden har ingen arbeidsliste. Siden for saken viser hvilke brev
  som er sendt, av hvem og når, og sier ikke hvem som skal handle (opphever [MM-U29](../docs/plans/vedtak.md#mm-u29)).
- <a id="gr-u30"></a>**GR-U30** TEs handling for å trekke påberopelsen av forholdet heter
  «Trekk påberopelsen».

## Mønstre

Et mønster står her når det brukes to ganger eller mer. Verdiene står i komponenten.

| Mønster | Komponent | Bruk |
| --- | --- | --- |
| Knapp | `varden/Knapp.svelte` | Primærhandlingen, sekundære handlinger og lenkeknapper |
| Utkastkort | `varden/Utkastkort.svelte` | Hodet på et brev som ikke er sendt, i hvert skjema |
| Brevkontroll | `varden/Brevkontroll.svelte` | Brevet ordrett før sending, med det parten sender og virkningen |
| Brevtråd | `varden/Brevtraad.svelte` | Brevene om forholdet, med partene og det løsningen sier under brevet |
| Handlingene | `varden/Brevtyper.svelte` | Radene i «Det du kan gjøre nå» |
| Tidslinje | `varden/Tidslinje.svelte` | Datoene i sporet, også dem parten fyller ut før sending |
| Melding | `varden/Melding.svelte` | Feil fra serveren, kvitteringen og det løsningen sier om saken |
| Infotips | `varden/Infotips.svelte` | Hvordan løsningen virker, når det trengs ved en tekst |

### Handlingene i Varden

Avgjort i designrunde 1 (oppdragsgiver 29.10, #1391). Komponentene står i
`src/lib/components/varden/`.

- **Visningen er handlingsorientert.** Det som ikke trengs for å sende et krav eller svare
  på det, står ikke der. Arbeidet har ingen overskrift med spornavnet: lesingen begynner
  med det siste brevet og menyen, og svaret med utkastkortet.
- **Visningen sier det løsningen vet, ikke hvem som skal handle.** Den viser hvilke brev
  som er sendt eller registrert, av hvem og når, og at et svar ikke er registrert. Den sier
  aldri hvem som skal gjøre neste handling, som «Venter på byggherren» eller «Neste steg»,
  fordi løsningen ikke vet det (oppdragsgiver 31.10, #1402).
- **Hvordan løsningen virker, forklares ikke ved feltene.** Setninger som «Teksten tolkes
  ikke» og «Innholdet vurderes ikke» står ikke i flaten. Slike forklaringer hører på en
  egen side om løsningen eller i et infotips (oppdragsgiver 01.11, #1402). Setninger om hva
  løsningen ikke avgjør, som «Om varselet kom i tide, avgjør partene», står ikke i appen i det
  hele tatt, heller ikke i et infotips (oppdragsgiver 08.11, #1663: «slik informasjon kan
  fjernes. Høres generelt ikke hjemme i appen»).
- **Én primærhandling per skjerm** (`Knapp` med `variant="primaer"`). I svaret er det
  «Se brevet før sending», bare i panelet med hovedlinjene og fast i bunnen av
  lesingen. Linjen nederst i vinduet vises bare når panelet er ute av syne.
- **Høyre kolonne i et skjema har panelet med hovedlinjene og tidslinja under.** Panelet
  sier hva brevet sier. Tidslinja har datoene, også dem parten fyller ut før brevet er
  sendt (`Tidslinje` med `utfylt`). Datoene står ikke i panelet. Panelet står fast. I
  skjemaet for ny sak står tidslinja også fast, rett under panelet, når begge får plass i
  vinduet. Ellers ruller den under panelet (oppdragsgiver 02.11, #1492).
- **Unntak: den nye versjonen av påberopelsen.** Arbeidsflaten har to roller (oppdragsgiver
  06.11, PR 1650):
  - En gul arbeidsrad med stiplet kant over begge kolonnene følger rullingen, unntatt på 640 px
    og smalere, der den ligger fast (oppdragsgiver 07.11, PR 1650) (`Utkastrad`):
    «Tilbake til forholdet», skilt fra resten med en linje, siden sakslisten er felt inn, «Utkast»
    med lås, brevet som skrives («Brev 3 · Oppdatert påberopelse») og mottakeren under, og
    «Forhåndsvis brevet» ytterst til høyre, så handlingen står ved brevet den gjelder. Det gule er
    raden, ikke utkastet. Raden står øverst, der «Tilbake til utkastet» står i brevkontrollen.
  - Utkastet står til venstre (`Brevutkast`, om lag 60 prosent): et hvitt kort med emnet,
    «Begrunnelse», som kreves og vokser med teksten, og «Forkast utkast» nederst under en linje
    (`Forkastutkast`). Mangler begrunnelsen, står beskjeden rett under feltet, uten lista øverst,
    siden feltet er alene (oppdragsgiver 07.11, PR 1650).
  - Brevene TE bygger på, står til høyre (om lag 40 prosent) og begynner på samme høyde som
    utkastet: «Tidligere brev om forholdet» som kompakt brevvalg med parten i en ring og ett brev
    åpent om gangen (svaret fra start), med brevhodet og tittelen ett hakk ned. Et langt brev
    ruller i rammen, og tidslinja står lagt sammen under.
  - Brevkontrollen heter «Kontroller og send» og har bare mottakeren, siden avsenderen er TE selv.
  - Mønsteret er oversikt › arbeidsflate › bekreft, og hvert område har bare det som trengs for
    formålet sitt: å velge handling, å skrive og å kontrollere brevet før sending. Det som står
    fast i en ny versjon, står på oversikten med veien til det som kan endre det: «Korriger
    datoen» ved datoen i brevtråden, og «Annen hjemmel eller endringsordre? Opprett ny sak →»
    under kortet «Det du kan gjøre nå», før tidslinja. At forholdet og endringsordren står fast,
    sier skjemaet for ny sak, der TE velger dem.
  - I brevkontrollen står virkningen under en egen overskrift, «Når du sender», når det er en.
- **En knapp er aldri sperret** ([MM-U32](#mm-u32)). Mangler noe, står det rett under feltet og i en
  liste øverst i skjemaet, med lenke til feltet, og fokus flyttes til lista. Beskjedene
  vises først når parten har prøvd, og forsvinner når feltet er rettet. Kjernens
  avvisning av et svar uten begrunnelse står ved begrunnelsen. `Knapp` er inaktiv bare
  mens en sending pågår.
- **«Forkast utkast»** er en lenkeknapp nederst i skjemaet, adskilt fra primærhandlingen.
  Den spør i skjemaet, med «Forkast» og «Behold utkastet», uten dialog. Unntaket er den nye
  versjonen av påberopelsen, der den spør i en dialog med «Behold utkastet» og en rød «Forkast
  utkast» (`Knapp` med `variant="fare"`). Rødt på en knapp står bare der handlingen ikke kan
  gjøres om, og teksten sier det (oppdragsgiver 07.11, PR 1650).
- **Utkastet sier det selv.** Hodet på utkastkortet sier «Utkast», og låselinja under sier at
  brevet bare er synlig for teamet til det er sendt. Sendepanelet i brevkontrollen, og panelet
  med punktene i et langt skjema, sier «Utkast» og «Ikke sendt» ved knappen, så statusen står i
  bildet også når hodet er rullet ut av det (oppdragsgiver 09.11, #1663). Merket «Utkast» i panelet til venstre vises bare når et
  annet spor er valgt, så statusen aldri står to steder samtidig.
- **Lesing ved siden av** er én lenkeknapp som veksler mellom «Les brevet ved siden av»
  og «Lukk brevet». Rammen følger brevet og er høyst like høy som vinduet, så et
  lengre brev ruller i den. Kolonnene er da like brede, og panelet til venstre er felt inn.
  På smal skjerm står brevet i skjemaet.
- **Kortet «Det du kan gjøre nå»** står øverst i høyre kolonne. Alle handlingene står synlige,
  uten panel (oppdragsgiver 06.11, #1631). Det har høyst én primærhandling, med en linje om hva
  den gjør. Primærhandlingen er svaret på motpartens siste brev når det ikke er besvart. Etter
  byggherrens svar er den TEs nye versjon («Oppdater påberopelse» i forholdet, «Revider krav»
  ellers). Ellers har kortet ingen primærhandling, også når TE har korrigert datoen (oppdragsgiver
  06.11, #1649). Demoruta og den ekte saksruta har samme primærhandling. Er den ikke bygget i
  Varden, sier den at den ikke er bygget (#1636). «Trekk påberopelsen» står sist. «Godta svaret» går rett til brevkontrollen, der virkningen av aksepten står før sendingen.
  Innsigelsen om at et brev kom for sent står ikke i kortet: den hører hjemme i svaret på
  brevet eller i et innlegg, som ikke er bygget (oppdragsgiver 06.11, PR 1650).
  Resten står under «Andre handlinger» som en åpen liste (`Brevtyper`), som i prototypen
  `grunnlagsoversikt.html`. Lista vises bare når kjernen tilbyr en handling
  ([MM-U25](#mm-u25)), og ikke mens et utkast er åpent. Hver rad har tittelen i halvfet, høyst to
  korte setninger om hva handlingen gjør med saken, pil og skillelinjer. En ny versjon av kravet sier hvilket brev den følger opp, og at svaret
  da ikke kan godtas (MM-U34 punkt 2). Korrigeringen av datoen står ved datoen i brevtråden, ikke i lista, som i skissen for
  BF-02A (#1615). En brevtype som ikke er bygget i Varden, har samme form og pil som de andre
  (oppdragsgiver 06.11, #1646).
- **Brevene om forholdet** står i en tråd. Partene skilles med form, ikke med farge: BH har
  fylt ring og TE åpen ring. Beskrivelsen og begrunnelsen kan være flere sider, så tråden viser
  de første tre linjene, og hele teksten står i brevet bak «Les brevet». Raden for et svar som ikke er registrert, har stiplet ring, fordi
  den ikke er et brev. Det løsningen sier om saken under et brev, som at svaret står
  som det ble sendt, har formen for en melding om
  prøven (`Melding`), ikke formen for metadata. Form og tekst prøves før en ny farge
  (oppdragsgiver 06.11, #1646).
- **Panelet til venstre** har sakens kode over tittelen, og sporene i to grupper:
  «Kontraktsforhold» med forholdet og «Krav» med vederlagsjusteringen og fristforlengelsen.
  Navnene står uten linje under; betegnelsen og siste brev står på siden for sporet
  (oppdragsgiver 06.11, #1631).
- **Topplinja** har stien «Varden › prosjektet › saken», med sakens kode, og den innloggede
  med initialene og navnet. Rollen står ikke der (oppdragsgiver 06.11, #1631).
- **En melding om prøven**, som at et svar ikke kan gis i Varden, har ikon og en kant i
  blekk (`--ink`) på `--surface-inset`. Den er ikke gul, fordi gult betyr utkast, og
  ikke rød, fordi den ikke er en feil.
