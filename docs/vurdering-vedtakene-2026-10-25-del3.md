# Vurdering av vedtakene, del 3: innsigelser, poster og lag (E) og tall, beregning og fullmakt (F)

Arbeidsgrunnlag for spørsmålene til oppdragsgiver, ikke en vanlig audit. Ingen
produksjonskode, vedtak eller tester er endret.

- **Kontrollert commit:** `569666b` (main 25.10, etter PR #1281).
- **Kilder lest:** `AGENTS.md`; vedtaksskillen (#424 og «Still dem slik oppdragsgiver kan
  svare»); `.claude/rules/tester.md`; resonnering-skillen; hovedplanen 1.3;
  `.claude/rules/dokumentasjon.md`. Vedtakene i område E og F er hentet ordrett fra
  `docs/vedtaksregister/vedtak.toml` med status, `forhold` og `folge` (VS-U1, VS-U4, VS-U5,
  VS-U9, VS-U11, VS-U14, VS-U21, VS-U24, HF-U2, HF-U4, HF-U7, MP-U4–MP-U6, OV-U4, OV-U8,
  OV-U22, OV-U23, OV-U25–OV-U28, OV-U30–OV-U33, OV-U35, OV-U37, OV-U39, OV-U40, OV-U42,
  GR-U26, KA-U4, KA-U8, KA-U9, KA-U21, KA-U24, KA-U31, KA-U32, LV-U5, LV-U6, LV-U8, EO-U5,
  EO-U6, MM-U28, GFK-U2–GFK-U4, GFK-U7, GFK-U13–GFK-U15, FO-U3, FO-U6, LV-U15, VS-U28, HF-U16
  og B-13-postene uten anker: hovedvalget, «godkjent» til nærmeste krone, preklusjon,
  frist uten fremdriftshindring, svar når grunnlaget er avslått, avslag sammen med § 32.2,
  GFK-06 med presiseringen 24.09, ubegrenset fullmakt og API-et). Ingen av dem er opphevet.
  Kontraktsteksten er lest i `khjohns/kontrakt` (§ 5, § 32.2, § 33.1, § 33.4, § 33.6.1,
  § 34.1.2, § 34.1.3, § 34.2.2 og Del II pkt. B.2.16); her vises bare til bestemmelsene.
- **Kode lest (TS-stien):** `kjerne/frosset/standpunkt.ts` (hele), `kjerne/frosset/brevtekst.ts`
  (svarteksten, forbeholdet, beløpssetningene), `kjerne/kommandoer/standpunkter.ts`,
  `kjerne/kommandoer/skriving.ts` (`lagret`, `frysSvarene`), `kjerne/utledning/utled.ts`
  (`forskyvningIBrevet`, `gjeldendeSvar`, `standpunktetErSubsidiaert`,
  `dokumentasjonIBrevet`), `kjerne/utledning/visning.ts` (`vederlagssvaret`),
  `kjerne/format/format.ts` og `leser.ts` (kravformatet, standpunktene, rekkefølgekontrollen
  i vederlaget), `kjerne/regler/vederlag.ts`, `frist.ts`, `beloep.ts`, `server/fullmakt.ts`,
  `server/saksliste.ts`, `src/lib/kjernesak/vederlagssvar.ts`,
  `src/lib/components/kontraktsbord/VederlagForm.svelte` (resultatboksen),
  `Kontrollrommet.svelte` (hvilke skjemaer TS-saken bruker), `PositionExplanation.svelte`,
  `FristForm.svelte`.

Lagene merkes **O** kontraktens ordlyd, **T** vedtatt tolkning, **A** vedtatt
produktavgrensning, **I** implementasjonen, **V** min vurdering. Belegg: **K** kjørt og
observert 25.10, **L** lest i kode, **—** ikke kontrollert.

Forløpene er kjørt med en midlertidig vitest-fil i `kjerne/tester/` som brukte hjelperne i
`brevtekst.test.ts` (`sak`, `svar`, `laast`) og sendte kommandoene gjennom `forhaandsvis` og
`vurder`, som serveren gjør. Fila er slettet og ikke committet. Utdataene står ved hvert funn.

## Funnene

### VG-E-01: Forbeholdet sier at byggherren ikke har svart på grunnlaget, også når byggherren har registrert sitt eget svar sendt utenfor appen

- **Type:** vedtaksmotstrid (GR-U26 mot OV-U4), med misvisende budskap.
- **Hva og for hvem:** Byggherren har sendt et avslag på grunnlaget utenfor appen og
  registrert brevet i grunnlagssporet. Svarer byggherren deretter på vederlaget fra appen,
  sier brevet byggherren selv sender: «Byggherren har ennå ikke svart på grunnlaget i TEs krav
  i brev 2 …». Det er en faktisk opplysning i byggherrens eget brev som strider mot byggherrens
  eget registrerte brev, og TE kan lese det som at byggherren ikke lenger står på avslaget.
- **Vedtakene:** GR-U26 (forbeholdet når «gjeldende versjon av grunnlaget ikke er besvart»,
  med teksten ordrett) (**T/A**). OV-U4: et registrert brev er dokumentasjon, appen utleder
  ingenting av det, og «Partene tar brevet i betraktning når de svarer i appen»; skjemaet sier
  at et brev sendt utenfor appen ikke endrer det parten sender fra appen (**A**). Ingen av dem
  sier hva forbeholdet skal si når byggherrens eget svar ligger som dokumentasjon.
- **Kodestedet:** `forbeholdForGrunnlaget` i `kjerne/frosset/brevtekst.ts` (leser
  `saken.grunnlagssvar`), `gjeldendeSvar` i `kjerne/utledning/utled.ts` og
  `dokumentasjonIBrevet` (et registrert brev gir ikke noe gjeldende svar).
- **Forløpet:** TE sender grunnlag (brev 2), vederlag 125 000 kr (brev 3) og frist (brev 4).
  BH registrerer et eget brev i grunnlagssporet med beskrivelsen «Avslag på grunnlaget». BH
  sender svar på vederlaget fra appen, delvis 100 000 kr.
  *Etter vedtakene:* GR-U26 gir forbeholdet fordi appen ikke har noe svar på grunnlaget; OV-U4
  gir at det registrerte brevet ikke endrer det. Ingen av dem gir at brevet skal opplyse noe
  som er galt. *Observert (K):* «Byggherren har ennå ikke svart på grunnlaget i TEs krav i
  brev 2 av 2. oktober 2026. Standpunktene nedenfor gjelder under forutsetning av at
  grunnlaget for kravet foreligger. … Byggherren godkjenner 100 000 kr eks. mva. av de krevde
  125 000 kr eks. mva.»
- **Belegg:** K (forløpet over, I), L (`forbeholdForGrunnlaget`, I). At teksten kan leses som
  at avslaget er frafalt, er V.
- **Sikkerhet:** høy for atferden. Middels for den rettslige betydningen: andre setning er et
  vilkår som passer med et avslag, så skaden ligger i første setning. Ikke kontrollert om
  skjemaet viser OV-U4-meldingen akkurat i dette tilfellet.
- **Minste avklaring:** spørsmål 1. Teknisk følger det av svaret om forbeholdet får en ny
  ordlyd, eller om svaret sperres til grunnlaget er besvart i appen.

### VG-E-02: Lagtabellen i byggherrens skjema viser etiketten uten laget, så begrensningen og posten ser ut til å stå i samme lag

- **Type:** implementeringsavvik (OV-U32) med misvisende budskap.
- **Hva og for hvem:** For byggherren før brevet sendes. Med § 34.1.2 og § 34.1.3 påberopt og
  grunnlaget avslått får justeringen ellers, beløpet etter begrensningen og posten etter
  § 34.1.3 annet ledd alle etiketten «Videre subsidiært» i tabellen, selv om posten står i et
  senere lag enn begrensningen. Beløpene i tabellen kan da leses som tre beløp som gjelder
  samtidig, mens begrensningen og posten er alternativer. Preklusjonen etter § 34.1.2 og laget
  fra grunnlaget har ingen rad, så den første etiketten i tabellen kan være «Videre
  subsidiært».
- **Vedtakene:** OV-U32: «Standpunktene i samme lag står under én etikett …», «Lik etikett
  betyr ikke samme lag», og lagene flyttes ned med lagene grunnlaget opptar (**A**). OV-U27 og
  OV-U28: rekkefølgen og etikettene når begge er påberopt (**A**). OV-U33 (**A**).
- **Kodestedet:** `vederlagslag` i `src/lib/kjernesak/vederlagssvar.ts` (én `etikett` per rad,
  laget leveres ikke videre) og resultattabellen i `VederlagForm.svelte` (kolonnen «Lag» viser
  `rad.etikett`). Linjen over tabellen (`beslutningsgrunnlag.linje`) er riktig.
- **Forløpet (forløp 3):** Grunnlaget i kategorien svikt. TE krever 150 000 kr for justeringen
  ellers og 40 000 kr for posten etter annet ledd. BH avslår grunnlaget, påberoper § 34.1.2 og
  § 34.1.3, godkjenner 30 000 kr for justeringen ellers og 30 000 kr for posten, og oppgir
  30 000 kr etter begrensningen: like beløp i tre ulike lag.
  *Etter vedtakene:* brevet har lag 1 grunnlaget, lag 2 § 34.1.2, lag 3 justeringen ellers og
  begrensningen under én etikett, lag 4 posten (OV-U27, OV-U32).
  *Observert (K):* frosne lag `[§ 34.1.2: 1, metode: 2, justeringen: 2, § 34.1.3: 2, posten:
  3]` med forskyvning 1. Brevet: «Prinsipalt: byggherren avslår grunnlaget …», «Subsidiært: …
  § 34.1.2 … kom for sent», «Videre subsidiært: … 30 000 kr … for justeringen ellers. … § 34.1.3
  … Byggherren godkjenner 30 000 kr eks. mva. for dette kravet.», «Videre subsidiært: … 30 000
  kr … for særskilt justering …». Riktig. Postlisten i visningen gir `lag: 3`, `lag: 3` og
  `lag: 4`, alle med etiketten «videre subsidiært». Tabellen i skjemaet viser bare etiketten
  (L), så de tre radene får samme tekst i kolonnen «Lag».
- **Belegg:** K for lagene, etikettene og brevet (I). L for at `vederlagslag` regner etiketten
  på samme måte som postlisten, og for tabellen i skjemaet (I). Tabellen er ikke sett i
  nettleseren (—).
- **Sikkerhet:** middels til høy. Linjen over tabellen skiller lagene, så det byggherren ser
  samlet, er ikke feil, bare tvetydig i tabellen. Brevet er riktig.
- **Minste retting:** teknisk retting 1.

### VG-F-01: Kjernen godtar «godkjent» eller «avslått» sammen med et annet oppgitt beløp, og bruker et annet beløp enn det byggherren oppga, uten å avvise

- **Type:** implementeringsavvik.
- **Hva og for hvem:** For byggherren. Sender en klient vurderingen «godkjent» med et godkjent
  beløp på 50 000 kr for et krav på 125 000 kr, lagrer kjernen 125 000 kr og skriver
  «Byggherren godkjenner 125 000 kr eks. mva.» Med «avslått» og 50 000 kr lagres 0 kr.
  Byggherrens uttrykkelige tall blir borte uten melding. Skjemaet sender ikke slike par i dag,
  så det gjelder andre klienter og API-et.
- **Vedtakene:** B-13 hovedvalg: serveren regner resultatet av vurderingene, og «resultatet
  oppsummerer vurderingene og ikke uttrykker noen egen vilje» (**A**). `AGENTS.md`,
  Domenekjernen: det kjernen ikke kan, avvises og forenkles ikke (**A**). KA-U9 (**T**).
- **Kodestedet:** `beregnGodkjentBeloep` og `kontroller` i `kjerne/regler/vederlag.ts`
  (beløpet kontrolleres bare ved «delvis»); `vederlagsposter` i `kjerne/frosset/standpunkt.ts`.
- **Forløpet:** krav 125 000 kr. Vurderingene `{hovedkrav_vurdering: godkjent,
  hovedkrav_godkjent_belop: 50000}`. *Etter vedtakene:* motstridende vurderinger avvises, eller
  beløpet er en vurdering byggherren har gjort. *Observert (K):* utregningen gir `{resultat:
  godkjent, godkjent_beloep: 125000}`; brevet godtas og sier «Byggherren godkjenner 125 000 kr
  eks. mva.». Med `avslatt` og 50 000: `{resultat: avslaatt, godkjent_beloep: 0}`.
  `buildEventData` i `src/lib/domain/vederlagDomain.ts` sender det krevde beløpet ved
  «godkjent» (L).
- **Belegg:** K i kjernen (I), L i skjemaet (I).
- **Sikkerhet:** høy for atferden; lav konsekvens i dag, fordi skjemaet ikke sender slike par.
- **Minste retting:** teknisk retting 2.

### VG-F-02: Godkjenning «til nærmeste krone» gir enighet om byggherrens beløp i øre, og brevet sier «godkjenner» uten det krevde beløpet

- **Type:** uavklart valg (B-13 og HF-U7 mot LV-U4 punkt 5), med misvisende budskap.
- **Hva og for hvem:** For begge. Kravformatet tar beløp med øre. Krever TE 100 000,40 kr og
  godkjenner byggherren 99 999,60 kr, er resultatet «godkjent» fordi begge rundes til 100 000
  kr. Svaret gir da enighet uten aksept (sammenfall) om 99 999,60 kr, og brevet sier
  «Byggherren godkjenner 99 999,60 kr eks. mva.», i formen for full godkjenning, uten «av de
  krevde 100 000,40 kr». Forskjellen er under én krone, men det er uklart hvilket beløp
  partene er enige om, og brevet nevner et annet tall enn kravet i en setning som leses som
  full godkjenning.
- **Vedtakene:** B-13: «godkjent» bare når hele kravet er godkjent, «til nærmeste krone»
  (**A**). HF-U7: godkjenning bare når svaret stemmer med kravet «i kravets egen enhet:
  krone» (**T**). LV-U4 punkt 5 (via OV-U28): «godkjenner <y>» ved full godkjenning, der y
  er det krevde (**A**). MM-U3 og MM-U9: et sendt brev betyr det det sa (**T**).
- **Kodestedet:** `erBeloepetGodkjentFullt` i `kjerne/regler/vederlag.ts`;
  `godkjennerHeleKravet` og `utfall` i `kjerne/frosset/standpunkt.ts`; `case 'beloep'` og
  `verdi` i `kjerne/frosset/brevtekst.ts` (skriver det godkjente beløpet i formen for
  «godkjent»); `vederlag.beloep` i `kjerne/format/format.ts` (`exclusiveMinimum: 0`, ingen
  krav om hele kroner).
- **Forløpet (forløp 8):** krav 100 000,40 kr, svar «delvis» 99 999,60 kr, grunnlaget
  godkjent i samme brev. *Etter vedtakene:* «godkjent» til nærmeste krone (B-13), så
  sammenfall er riktig etter HF-U7; vedtakene sier ikke hvilket beløp enigheten gjelder.
  *Observert (K):* `resultat: godkjent`, `sammenfall: true`, enigheten `{beloep: 99999.6}`,
  linjen «godkjent med 99 999,60 kr», brevet «Byggherren godkjenner 99 999,60 kr eks. mva.»
- **Belegg:** K (I). At teksten leses som full godkjenning av kravet, er V.
- **Sikkerhet:** høy for atferden, lav for den økonomiske betydningen (høyst 0,99 kr).
- **Minste avklaring:** spørsmål 3.

### VG-F-03: Fullmakten regnes av det høyeste laget, men ingen vedtak sier hvilket beløp som gjelder når svaret har flere lag

- **Type:** uavklart valg.
- **Hva og for hvem:** For byggherren og godkjennerne. Et svar kan ha fire lag, for eksempel
  0 kr prinsipalt etter § 34.1.2 og 60 000 kr om ingen innsigelse fører fram. Hvilket beløp
  fullmakten regnes av, avgjør hvem som må godkjenne brevet.
- **Vedtakene:** GFK-06 med presiseringen 24.09: «Et spor som besvares i samme brev, har
  verdien i svaret» (**A**), uten å si hvilket lag. B-13 05.10 (svar når grunnlaget er
  avslått): «Brev og fullmakt sier «prinsipalt avslått (grunnlaget)» med det subsidiære
  resultatet» (**A**), som gjelder grunnlaget, ikke lagene i sporet. OV-U31: to totaler lagres
  (**A**).
- **Kodestedet:** `brevverdi` i `server/fullmakt.ts`: hovedstandpunktene og de subsidiære
  summeres hver for seg over sporene, og det største gjelder. Docstringen viser til GFK-06 og
  GFK-U3, som ikke sier dette. `brevverdi` har ingen kaller utenfor testene ennå (#818, #909).
- **Forløpet:** forløp 3 over: `brevverdi` = 60 000 kr (K). Fristsvar med § 33.4, ingen
  hindring og sen spesifisering, 10 dager i lag 3 og lag 4, sats 1 000 kr: 10 000 kr (K).
  Fordi postene og dagene er kontrollert mot hverandre (beløpet etter begrensningen er høyst
  posten, dagene byggherren måtte forstå er høyst de vurderte), er det siste laget alltid det
  høyeste i hvert spor (L), så summen av de subsidiære er alltid størst.
- **Belegg:** K og L (I). At valget er rimelig, er V.
- **Sikkerhet:** høy for atferden; valget er ikke vedtatt.
- **Minste avklaring:** spørsmål 2. Valget kan også føres som arbeidsvalg med henvisning til
  B-13 05.10, hvis oppdragsgiver mener det følger av prinsippet der.

### Resten, én linje hver

- **Lesemodellen gir hver beløpspost svarets samlede resultat.** `resultat` på et
  `beloep`-standpunkt i `kjerne/format/leser.ts` er `subsidiaert_resultat ?? resultat` for hele
  svaret, ikke postens. Ingen visning leser det per post i dag; sakslisten bruker det for
  svaret som helhet (K: `delvis_godkjent` for justeringen 150 000 godkjent og posten avslått).
  Feltet har ikke én betydning (I, L/K).
- **`utregning.resultat` er «godkjent» også når en påberopelse står i et lag.** Med
  begrensning lik posten (forløp 3b) og med dagene byggherren måtte forstå lik de krevde
  (forløp 8a) er `resultat: godkjent` mens `sammenfall: false`. Riktig etter HF-U7, fordi bare
  sammenfallet gir enighet, og ingen visning leser `resultat` (K, L). Navnet kan misforstås.
- **Python-stien:** `FristForm.svelte` sier at utmålingen ved sen spesifisering «begrenses til
  det åpenbare»; VS-U4 og § 33.6.1 sier det byggherren «måtte forstå». Skjemaet brukes bare i
  Python-stien (`Kontrollrommet.svelte`) (L). `PositionExplanation.svelte` kaller § 34.2.2
  «bestridt beregningsmetode».

## 1. Spørsmål til oppdragsgiver

1. **Forbeholdet når byggherren har sendt sitt svar på grunnlaget utenfor appen.**
   *Bakgrunn:* Når byggherren svarer på vederlag eller frist og grunnlaget ikke er besvart,
   sier brevet at byggherren ennå ikke har svart på grunnlaget (GR-U26). Et brev byggherren har
   sendt utenfor appen og registrert, er dokumentasjon som appen ikke leser innholdet i (OV-U4).
   Har byggherren sendt et avslag utenfor appen, sier byggherrens neste brev fra appen at
   byggherren ikke har svart. *Belegg:* GR-U26 og OV-U4; § 32.2 og § 32.3 om svaret på
   grunnlaget.
   - **A (anbefalt):** «Har byggherren registrert et eget brev i grunnlagssporet sendt utenfor
     appen, sier forbeholdet i stedet: «Byggherren har ikke svart på grunnlaget i TEs krav i
     brev <n> av <dato> i appen. Standpunktene nedenfor gjelder under forutsetning av at
     grunnlaget for kravet foreligger.» Appen tolker ikke det registrerte brevet. Presiserer
     GR-U26. Strider ikke mot OV-U4.»
   - **B:** «Har byggherren registrert et eget brev i grunnlagssporet sendt utenfor appen, kan
     byggherren ikke svare på vederlag eller frist fra appen før grunnlaget er besvart i appen.
     Snevrer inn GR-U26.»
   - **C:** «Teksten i GR-U26 står også når byggherren har registrert et eget brev i
     grunnlagssporet. Byggherren som vil gjenta avslaget, besvarer grunnlaget i samme brev.»
   - *Hva valget styrer:* teksten i byggherrens brev og om byggherren kan svare på vederlag og
     frist i en sak der grunnlaget er avslått utenfor appen. A endrer bare ordlyden; B gir en
     ny sperre; C er dagens atferd.

2. **Hvilket beløp fullmakten regnes av når byggherrens svar har flere lag.**
   *Bakgrunn:* Et svar kan ha et prinsipalt standpunkt, for eksempel preklusjon etter § 34.1.2,
   og flere subsidiære. Vedtakene sier at et spor som besvares, har «verdien i svaret»
   (GFK-06, presisert 24.09), og at fullmakten ved avslått grunnlag bruker det subsidiære
   resultatet (B-13, 05.10). De sier ikke hvilket lag som gjelder i sporet selv. *Belegg:*
   GFK-06, B-13 05.10, OV-U31, OV-U32.
   - **A (anbefalt):** «Fullmakten for et svar regnes av beløpet byggherren godtar om ingen av
     innsigelsene fører fram, i hvert spor, og fristdagene ganget med dagmulktssatsen. Det er
     det høyeste beløpet byggherren binder seg til i noe lag. Presiserer GFK-06 og følger B-13
     (05.10).»
   - **B:** «Fullmakten regnes av det prinsipale beløpet. Endrer B-13 (05.10) for fullmakten.»
   - *Hva valget styrer:* hvem som må godkjenne et brev med påberopelser. A er dagens
     beregning og forutsetter at det siste laget alltid er det høyeste, som kontrollene i dag
     sikrer.

3. **Beløp med øre når byggherren godkjenner «til nærmeste krone».**
   *Bakgrunn:* TE kan kreve et beløp med øre. Byggherrens beløp regnes som full godkjenning når
   begge rundes til samme krone (B-13, HF-U7). Da blir partene enige uten aksept om beløpet
   byggherren oppga, og brevet skriver det i formen for full godkjenning, uten det krevde
   beløpet. *Belegg:* B-13 «godkjent» til nærmeste krone, HF-U7, LV-U4 punkt 5.
   - **A (anbefalt):** «Er byggherrens beløp ikke likt det krevde til hele øre, sier brevet
     «byggherren godkjenner <x> av de krevde <y>», også når beløpene er like til nærmeste krone.
     Enigheten gjelder beløpet byggherren oppga. Presiserer LV-U4 punkt 5. Strider ikke mot
     B-13 eller HF-U7.»
   - **B:** «Beløpet i et krav og i byggherrens svar oppgis i hele kroner.»
   - **C:** «Brevet og enigheten står som i dag: full godkjenning med byggherrens beløp.»
   - *Hva valget styrer:* teksten i brevet og hvilket tall enigheten har. B endrer formatet før
     den første ekte saken.

## 2. Tekniske rettinger som følger av gjeldende vedtak

1. **Lagtabellen i byggherrens skjema (VG-E-02, OV-U32, OV-U33).** Grupper radene etter det
   fryste laget med etiketten én gang per lag, eller vis laget sammen med etiketten. Ta med
   preklusjonen etter § 34.1.2 og lagene fra grunnlaget som egne rader uten beløp, så den
   første etiketten i tabellen er den første i brevet. `vederlagslag` har laget og kan levere
   det videre.
2. **Motstridende vurderinger av beløpet (VG-F-01, B-13).** Avvis et godkjent beløp ved
   vurderingen «godkjent» når det ikke er likt det krevde, og ved «avslått» når det ikke er 0,
   med `UGYLDIG_VURDERING`, i `kontroller` i `kjerne/regler/vederlag.ts`. Det er en endring av
   regelsettet, så `REGELVERSJON` økes.

## 3. Kontrollert og riktig håndtert

- § 34.1.2 rammer hele kravet, også posten etter annet ledd; § 34.1.3 rammer bare posten
  (OV-U22, OV-U27): lagene i forløp 3 (K) og `vederlagsvirkninger` (L).
- Tap av hele kravet er skilt fra begrensningen: en virksom § 34.1.3 avviser aldri kravet
  prinsipalt; prinsipalt beløp er justeringen ellers pluss beløpet etter begrensningen (VS-U5):
  `avvisesPrinsipalt` (L), utregningen 40 000 og 60 000 i forløp 3c (K).
- Rekkefølgen grunnlag → § 34.1.2 → justeringen ellers og begrensningen → posten bevares i
  brev, linje og frosne lag, med grunnlagets lag foran (OV-U27, OV-U32, B-13 05.10) (K,
  forløp 3a). Leseren avviser en annen rekkefølge i vederlaget (`kontrollerVederlagsstandpunktene`, L).
- Flere standpunkter i samme lag står under én etikett i brevet og i linjen; lik etikett for
  lag 3 og lag 4 står som to etiketter (OV-U32) (K, forløp 3a og 3d).
- Laget lagres som tall fra 1, upåvirket og uten virkning hver for seg (OV-U32, HF-U2)
  (`lagret` i `skriving.ts`, L).
- «Upåvirket» brukes bare når § 34.1.3 er påberopt, § 34.1.2 ikke rammer, og grunnlaget
  verken er avslått eller prekludert (OV-U33); med frafall flyttes ikke lagene (L). Med
  ubesvart grunnlag står forbeholdet etter GR-U26 i brevet (K, forløp 3c).
- Når grunnlaget avslås etter vederlagssvaret, endres ikke brevet, og sporet får etiketten
  «subsidiaert» i visningen (GR-U26) (K, forløp 3c). Postlisten i visningen beholder etikettene
  brevet ga; den vises ikke i noe grensesnitt ennå (L).
- Frist med § 33.4, ingen hindring og sen spesifisering gir fire lag; dagene byggherren måtte
  forstå og de vurderte dagene står i hvert sitt lag også når tallet er det samme (B-13 05.10,
  VS-U4, OV-U32) (K, forløp 3d).
- Sen spesifisering med de samme dagene som kravet gir ikke sammenfall (HF-U7) (K, forløp 8a).
  Begrensning lik posten gir heller ikke sammenfall (HF-U7, VS-U5) (K, forløp 3b).
- En egen innsigelse står i brevet som partens utsagn etter § 5 tredje ledd, uten å bli en
  påberopelse når den ikke kan gjelde én bestemmelse (VS-U24) (`innsigelsenPaaberoper` og
  brevteksten, L).
- «Fører ikke frem» er ikke snevret inn: skjemaene bruker det om alle innsigelsene, og
  postlisten om «om ingen påberopelse fører fram» (L).
- OV-U31: prinsipalt og subsidiært beløp lagres i utregningen, beløpet for hver post og
  beløpet etter begrensningen på standpunktene, mellomlaget lagres ikke (K, forløp 3a).
- Beløpet etter begrensningen er høyst det byggherren godtar for posten, og ikke negativt;
  dagene byggherren måtte forstå er høyst de vurderte (L i `kontroller` og
  `kontrollerSpesifiseringen`; tester i `brevtekst.test.ts`).
- Krav på 0 kr eller 0 dager avvises av formatet (KA-U8) (L).
- Ingen BH-verdi fylles inn fra TE i kjernen; en manglende vurdering avvises (KA-U4) (L).
- Avrunding til hele øre er halv opp bort fra null og deles av utregningen, brevet og
  fullmakten (`beloep`, L).
- Klientens regelspeil for vederlaget har en paritetstest mot kjernen for begrensningen og
  § 34.1.2 med posten (`vederlagDomain.kjerne.test.ts`, 21 tester grønne, K).
- Forløp 8 med rigg og drift: hindret. Kravformatet avviser `saerskilt.rigg` (`UGYLDIG_FORM`),
  og en vurdering av rigg avvises med `VURDERING_UTENFOR_KJERNEN` (#1171) (K).

## 4. Verifikasjon og grenser

- Forløpene er kjørt i kjernen i minnet, ikke gjennom HTTP-serveren eller SQL Server.
  Lagtabellen i skjemaet er lest, ikke sett i nettleseren.
- § 32.2 og § 34.1.2 kan ikke prøves i samme sak: § 32.2 gjelder bare endringskategoriene og
  § 34.1.2 bare svikt og andre forhold, så forløpet med to lag fra grunnlaget og § 34.1.2 finnes
  ikke. To lag fra grunnlaget med § 34.1.3 er ikke prøvd.
- Rigg og drift (OV-U37, OV-U39, OV-U40), regnestykket, enhetene og avviket mellom TEs og
  byggherrens verdier er ikke i kjernen (#1171) og kunne ikke prøves.
- Negative beløp (KA-U9 for fradrag) er ikke i formatet; ikke prøvd.
- Fullmaktsflyten for TS-saken er ikke bygget (#818, #909); bare `brevverdi` er prøvd.
- `src/lib/domain/` er ikke sammenliknet linje for linje med kjernen ut over paritetstesten.
- Innsigelse fra TE mot byggherrens krav (VS-U14) og § 34.3.3 er utenfor første versjon og
  ikke prøvd.
- Sammenfall regnes av summen av postene, ikke post for post (HF-U7 «standpunkt for
  standpunkt»). Fordi hver post er høyst det krevde, kan de bare skille seg når summen og
  postene rundes ulikt til hele kroner, altså under én krone. Ikke prøvd med et forløp.
- FO-U3, HF-U16 og saksoversiktens nøkkeltall ut over vederlagssvaret er ikke kontrollert.
