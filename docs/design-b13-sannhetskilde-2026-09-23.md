# Designnotat: hvem avgjør resultatet i byggherrens svar (B-13) — 2026-09-23

**Dato:** 2026-09-23. **Utgangspunkt:** `c708f95` på grenen `spor-d-domenefeil`
(PR #46, som bygger på PR #45). Ingen av dem er flettet til `main`.
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
B-13 i [3.4](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
og vedtakene 23.09 i [3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger).
[Kartleggingen av frontendens domeneregler](kartlegging-domeneregler-frontend-2026-09-23.md)
er grunnlaget. [Oppdraget](prompt-b13-backend-eier-reglene-2026-09-23.md), del 1.
**Status:** beslutningsgrunnlag. Notatet avgjør ingenting og endrer ingen kode.
B-13 er åpen.

Appen er ikke i produksjon og har ingen reelle data.

## Sammendrag

Frontenden regner ut resultatet av byggherrens svar: resultat, godkjent beløp
og dager, subsidiært standpunkt og grunnene til det. Backend lagrer det som
sendes, uten å kontrollere det (BR-01). B-13 spør hva som skal gjelde når
konklusjonen og vurderingene i samme svar spriker.

**Anbefalingen er alternativ (2) i streng form.** Backend får en egen
regelmodul som regner ut resultatet av vurderingene og kravet. Er klientens
konklusjon ikke lik serverens, avvises svaret, og feilmeldingen oppgir hva
serveren regnet ut. Journalen inneholder da bare verdier som klient og server
har regnet ut likt, og hendelsen får en regelversjon.

Hovedgrunnen er at en part aldri blir bundet av noe den ikke har sett.
Alternativ (1) kan lagre et annet resultat enn det byggherren så i skjemaet.
Alternativ (3) lagrer selvmotsigelsen for godt og svarer ikke på hva systemet
skal handle på.

Anbefalingen bygger på én premiss oppdragsgiver må godta eller forkaste:
**resultatfeltet oppsummerer vurderingene, det uttrykker ingen egen vilje.** Det
byggherren binder seg til, er vurderingen av hver post og tallene. Hvis det
skal være mulig å sette en konklusjon som vurderingene ikke gir, er (3) det
riktige valget. Da må regelen om hva systemet handler på, avgjøres i tillegg.

Begrunnelsesteksten er fortsatt partens egen formulering. Serveren kontrollerer
feltene, ikke prosaen (avsnitt 5). Kartleggingens spørsmål om sum mot poster
blir borte for nye hendelser under (1) og (2), fordi serveren regner summen
selv. Avsnitt 7 har sju valg for oppdragsgiver, hvert med konkrete
alternativer og en anbefaling.

## 1. Hva valget gjelder

B-13 gjelder gruppe 2 og 3 i kartleggingen. Det er verdiene som lagres med
rettsvirkning eller styrer hva systemet gjør:

- **Utregnet i skjemaet og sendt med svaret:** `beregnings_resultat`,
  `subsidiaer_resultat`, `subsidiaer_triggers`, `total_godkjent_belop`,
  `subsidiaer_godkjent_belop`, `godkjent_dager` og `subsidiaer_godkjent_dager`.
- **Byggherrens egne vurderinger:** om hver post er godkjent, delvis godkjent
  eller avslått, med beløp; om varslene kom i tide; om det foreligger
  fremdriftshindring.
- **Kravet det svares på:** krevde beløp per post, krevde dager og varseltype.
  Dette står i `SakState` (L).

BR-01 er ett eksempel: hovedkravet er avslått, 0 kr er godkjent, og
resultatet er satt til «godkjent». Sporet ble `GODKJENT`, saken `OMFORENT` og
en endringsordre utstedbar (K 23.09).

Veiledningen i gruppe 1 berøres ikke: hvilke spørsmål som vises,
standardverdier og hjelpetekst. Heller ikke den regelen backend allerede eier.
Et svar regnes som prinsipalt avslått når ansvarsgrunnlaget er avslått, eller
når grunnlaget er varslet for sent ved endring (`approval_authority.exposure`,
`approval_letter.decision_summary`).

## 2. Slik virker det i dag

Lest ut av koden 23.09 (L), unntatt der annet står.

**Skjemaet.** `FristForm.svelte` og `VederlagForm.svelte` regner ut
resultatet mens byggherren fyller ut, og viser det. Samtidig lager de en
begrunnelsestekst av de samme vurderingene
(`generateFristResponseBegrunnelse`, `generateVederlagResponseBegrunnelse`).
Den er låst, med etiketten «Hentet fra vurderingen», og har denne
forklaringen: «Beløp, dager og konklusjoner endres i valgene over»
(`GeneratedReasoning.svelte`). Byggherren kan skrive en «Utdypende begrunnelse»
etter den. Feltet `begrunnelse` inneholder begge delene. Gjennom
godkjenningsflyten sendes utdypningen i tillegg for seg, som
`tilleggs_begrunnelse`. Gjennom `/api/events` sendes den ikke for seg.

**Journalen** inneholder klientens verdier uendret. Tidslinjen gjør
`beregnings_resultat` om til sporstatus (BR-01, K 23.09).

**Brevet** settes sammen i `approval_letter.snapshot`. Hver vurdering får en
beslutningslinje fra `decision_summary`, som serveren formaterer av klientens
`beregnings_resultat`, totalbeløp og dager. Under linjen står
begrunnelsesteksten, gjort om til ren tekst. Pakken bygger på vurderingene
slik serveren har lagret dem, ikke på det klienten sender med pakken:
«Never trust client-provided decision copies» (`approval_service.command`,
`package`).

**Fullmakten.** `exposure` regner den ut av `total_godkjent_belop`,
`godkjent_dager` og de subsidiære tallene, slik klienten sendte dem.
Grunnlaget (`basis`) setter serveren selv. `validate_items` kjøres ved
`prepare`, `package`, ved godkjenning og ved `publish`. `stale` regner
fullmakten om av vurderingene i pakken hver gang den kjører.

**Versjonering.** Hendelsene har ingen regelversjon. Det nærmeste forbildet er
fullmaktsgrunnlaget. Der står matriseversjonen (`"matrix": "2026-01"`,
`"matrixVersion": "2026-01"`).

## 3. De tre alternativene

| | (1) Serveren regner ut, og det gjelder | (2) Serveren avviser et svar der konklusjonen ikke følger av vurderingene | (3) Begge lagres, og avviket vises |
| --- | --- | --- | --- |
| **Journalen** | Serverens verdier. Klientens verdier forkastes eller overskrives, som aktørfeltene | Klientens verdier, men bare når de er like serverens. I praksis det samme som (1) | Klientens konklusjon, serverens utregning og et avviksflagg, side om side |
| **Hva systemet handler på** | Serverens | Serverens, som er lik klientens | Må avgjøres i tillegg. Handler systemet på partens konklusjon, består BR-01. Handler det på serverens, er dette (1) med et ekstra felt |
| **Brevet** | Beslutningslinjen viser serverens resultat. Teksten er klientens og kan si noe annet hvis versjonene av reglene er ulike | Beslutningslinjen og teksten bygger på samme regelversjon, fordi et avvik stoppes før lagring | Må vise ett av resultatene, eller begge. Et brev med to konklusjoner er tvetydig, og det er avsenderen som bærer risikoen for tvetydigheten |
| **Partens egen formulering** | Kan si noe annet enn det serveren lagret | Kan bare si noe annet hvis klienten er endret eller har en feil. Da er feltene likevel kontrollert | Står uendret. Avviket vises ved siden av |
| **Frontenden** | Viser fortsatt forhåndsvisningen. Etter innsending kan det lagrede resultatet være et annet, uten at noen får vite det, med mindre grensesnittet sammenlikner selv | Viser fortsatt forhåndsvisningen. Ved avvik kommer en feilmelding med serverens verdi, for eksempel «Reglene er oppdatert. Serveren regner ut *delvis godkjent*. Last inn saken på nytt». `submission.error` viser den allerede | Viser forhåndsvisningen. Tidslinjen, sporkortet og brevet trenger en ny visning av avviket |
| **`/api/events` uten godkjenning** | Byggherren blir bundet av et resultat som ikke ble vist | Byggherren får en feilmelding. Ingenting lagres | Lagres med avvik |
| **Godkjenningsflyten** | Vurderingen lagres med serverens verdier ved `prepare`. Godkjennerne ser dem. Fullmakten regnes av dem | Avvises ved `prepare`, så en uverifisert konklusjon når aldri godkjennerne. Fullmakten regnes av serverens tall | Fullmakten må regnes av det høyeste av de to, ellers kan avviket brukes til å få en kortere rute |
| **Regelendring (B-10)** | Resultatet regnes ut når svaret skrives, og det lagres. Det regnes aldri om ved lesing | Som (1). Endres reglene mellom `prepare` og `publish`, avviser `validate_items` pakken, og den må ferdigstilles og godkjennes på nytt | Avviket må regnes ut og lagres når svaret skrives. Regnes det ut ved lesing, gir en ny regel nye avvik i gamle hendelser |
| **BR-01-testene** | Blir XPASS, fordi tilstanden viser resultatet vurderingene gir | Blir XPASS. Svaret avvises, og kontrollsaken viser at det er resultatet som er grunnen | Må skrives om (modulheaderen i testfila) |
| **Det som må bygges** | Regelmodul, overskriving i begge inngangene, regelversjon | Regelmodul, sammenlikning i validatoren som begge inngangene kaller, feilkode, regelversjon | Regelmodul, nye felt, visning av avviket i tre flater, regelen for hva systemet handler på |

(1) og (2) gir samme journal. Forskjellen er hva som skjer når klient og
server er uenige. (1) lagrer serverens svar uten at noen ser det. (2) stopper
og ber byggherren se på nytt. Uenighet oppstår i praksis når frontenden i
nettleseren har en annen regelversjon enn backend, eller når klienten har en
feil eller er endret. Det er de samme tilfellene kartleggingen pekte på som
risikoen ved BR-01.

## 4. Anbefaling: (2) i streng form

1. **Ingen blir bundet av noe de ikke har sett.** Gjennom `/api/events` finnes
   det ingen andre øyne på svaret før det lagres. Under (1) kan journalen få
   et resultat byggherren aldri så.
2. **Journalen blir aldri selvmotsigende.** En hendelse som først er lagret,
   kan ikke rettes, bare avløses av en ny. Under (3) blir selvmotsigelsen
   stående i journalen for alltid.
3. **Det finnes allerede mønster for det.** Klienten sender ikke `event_id`
   eller `tidsstempel`, og serveren setter aktørfeltene selv. Pakken bruker
   serverens kopi av vurderingene. Et beregnet resultat hører til samme type
   felt.
4. **Frontenden trenger nesten ingen endring.** Reglene blir der til
   forhåndsvisning. Et avvik vises i feltet for feilmeldinger som finnes fra
   før.
5. **BR-01-testene er skrevet for det.** De er nøytrale mellom (1) og (2), og
   en mutasjon som avviser svaret, gjorde dem til XPASS (K 23.09).

Kostnaden er en feilmelding som må håndteres. Den treffer bare en nettleser
med utdaterte regler, og der er feilmeldingen poenget.

**Hva «streng» betyr.** Serverens utregning er fasit. Klientens verdi må være
lik den, ikke bare forenlig med den. Sammenlikningen gjelder
`beregnings_resultat`, `subsidiaer_resultat`, `subsidiaer_triggers` som
mengde, og beløpene og dagene i listen over. Beløp sammenliknes til hele øre
etter avrunding, fordi klienten regner med flyttall og serveren bør regne
med `Decimal`.

**Delvise oppdateringer.** `respons_*_oppdatert` kopierer bare felt som ikke er
`None`. Utregningen må derfor gjøres på svaret slik det blir etter
flettingen, ikke på det som sendes alene. Skjemaene sender i dag hele svaret
(L).

**Regelversjon.** Serveren setter et felt, for eksempel `regelversjon`, i
hendelsen, på samme måte som den overskriver aktørfeltene. Projeksjonen leser
verdiene som ble lagret, og regner dem aldri om. Hendelser uten feltet er
skrevet før B-13, og verdiene deres gjelder som de står. Det finnes ingen
reelle data. Mer enn dette trenger ikke B-13 fra B-10, og B-10 avgjøres ikke
her.

**Fullmakten** regnes av regelmodulens utregning. Under (2) er den lik
klientens tall, men `exposure` bør ikke være avhengig av det. Da er
påstanden «fullmakten regnes av klientens sum» ikke lenger riktig.

**Preklusjon og passivitet.** B-13 spør også om rettslige konklusjoner skal
trekkes av systemet eller bare varsles. Her skilles det på hvem konklusjonen
bygger på:

- **Preklusjon ut fra byggherrens egen vurdering** («varslet for sent») er
  byggherrens standpunkt. Det gjøres gjeldende i svaret. Systemet trekker
  konklusjonen for byggherren, som skjemaet gjør i dag. Anbefalt: **trekkes**.
- **Passivitet (§ 32.3 annet ledd)** er en virkning mot byggherren. Den
  bygger på «uten ugrunnet opphold», som ikke er et fast antall dager.
  Anbefalt: **varsles** (valg 4).

## 5. Partens egen formulering

Den låste teksten inneholder standpunkter med rettsvirkning, for eksempel
«Innsigelsen om sen varsling fremsettes med dette svaret, jf. §5». Den lages
av de samme vurderingene som resultatet, i samme klient. Tre muligheter:

| | Hva det betyr | Kostnad | Risiko |
| --- | --- | --- | --- |
| **T-a** Teksten er partens, som i dag | Serveren kontrollerer feltene, ikke prosaen. Beslutningslinjen i brevet lages av de kontrollerte feltene og står over teksten | Ingen regler å flytte. Den låste delen og utdypningen bør lagres hver for seg i begge inngangene, så det synes hva som er generert | En endret klient eller en feil i klienten kan sende tekst som strider mot feltene. Byggherren er bundet av teksten fordi det er byggherren som sender den |
| **T-b** Serveren lager den låste delen | Klienten sender bare utdypningen. Serveren lager teksten av de samme vurderingene som resultatet | Den største posten i B-13. Grunnlaget er `fristBegrunnelse.ts`, `vederlagBegrunnelse.ts` og `shared.ts`, til sammen 861 linjer TypeScript. `forseringBegrunnelse.ts` (486) kalles ikke fra noen komponent (L, søk) | Forhåndsvisningen må enten ha en kopi av generatoren eller hente teksten fra serveren |
| **T-c** Serveren lager teksten og sammenlikner med klientens | Avvis hvis teksten ikke er lik | Som T-b | Skjør: formuleringer, HTML og tokens må være helt like. Anbefales ikke |

**Anbefalt: T-a nå.** Under (2) er feltene som styrer systemet, kontrollert, og
teksten kommer fra samme klient som har bestått kontrollen. Under (1) er T-a
svakere, fordi teksten kan bygge på en annen regelversjon enn resultatet.
T-b kan komme senere, hvis oppdragsgiver vil at teksten skal være systemets
formulering og ikke partens.

## 6. Hva som bygges etter beslutningen

Rekkefølgen står i oppdraget, del 2. Her bare det som følger av anbefalingen:

1. En regelmodul i backend, uten avhengighet til Flask og lagring, med
   frontendens testsett oversatt først (`vederlagDomain.test.ts`,
   `fristDomain.test.ts`, `grunnlagDomain.test.ts`: 206 tilfeller).
2. Sammenlikning i `validate_respons_event` eller i et eget steg som både
   `/api/events` og `ApprovalService.validate_items` går gjennom, med en egen
   feilkode.
3. `regelversjon` som serveren setter.
4. `exposure` regnet av modulens utregning.
5. De fire BR-01-testene blir XPASS, og gjøres om til ordinære tester.

Frist-delen av modulen bygger på vedtaket om nøytralt fristvarsel (3.1).
Forespørselen er ikke lenger et avslag, og dermed faller første linje i
`fristDomain.beregnPrinsipaltResultat` bort (`sendForesporsel` gir
`avslatt`). Modulen bør derfor komme etter TFR-06 og DRF-01, eller ta hensyn til
vedtaket fra starten.

Anslaget i kartleggingen står: 250–350 linjer Python for gruppe 2 og 3 uten
tekstene. Sammenlikningen og feilkoden kommer i tillegg, trolig under 100
linjer (skjønn, ikke målt).

## 7. Valg for oppdragsgiver

Kartleggingens spørsmål 3 (forespørselen) er avgjort 23.09 og er ikke med.

**Valg 1: hovedvalget i B-13.**

- (1) Serveren regner ut, og det gjelder.
- **(2) Serveren avviser et svar der konklusjonen ikke er lik serverens
  utregning (anbefalt).**
- (3) Begge lagres, og avviket vises. Velges dette, må det også avgjøres om
  systemet handler på partens konklusjon eller på serverens.

Premissen for anbefalingen er at resultatet oppsummerer vurderingene, og at
det ikke uttrykker noen egen vilje. Forkastes premissen, er (3) riktig.

**Valg 2: begrunnelsesteksten.**

- **T-a: teksten er partens, og serveren kontrollerer feltene (anbefalt).**
- T-b: serveren lager den låste delen.

**Valg 3: 99 %-terskelen** (kartleggingens spørsmål 1). I dag er et svar
«godkjent» når minst 99 % er godkjent, og for vederlag i tillegg uten endret
beregningsmetode.

- (a) Behold 99 % som systemets regel, eid av backend.
- **(b) «Godkjent» bare når alt er godkjent, til nærmeste krone eller dag
  (anbefalt).**
- (c) Terskel per prosjekt.

Grunn: et krav på 1 000 000 kr med 990 000 godkjent blir i dag `GODKJENT`.
Er de andre sporene også avgjort, blir saken `OMFORENT`, og
`_rule_case_not_closed` sperrer nye hendelser. Totalentreprenøren kan da ikke
forfølge de siste 10 000 kronene i saken (L, ikke kjørt). For frist betyr
terskelen noe bare ved 100 krevde dager eller mer, så lenge dagene er hele.

**Valg 4: passivitet etter § 32.3 annet ledd** (spørsmål 2).

- **(a) Systemet varsler når svaret drøyer, men trekker ingen konklusjon
  (anbefalt).**
- (b) Systemet trekker konklusjonen etter et fast antall dager.
- (c) Som (a), og totalentreprenøren kan i tillegg gjøre passiviteten
  gjeldende som en egen handling.

Grunn: «uten ugrunnet opphold» er ikke et fast antall dager. Et fast tall ville
bli systemets tolkning, men fremstå som kontraktens.

**Valg 5: `grunnlag_varslet_i_tide` utenfor § 32.2** (spørsmål 4).

- **(a) Backend avviser feltet når kategorien ikke er endring uten
  endringsordre (anbefalt).**
- (b) Feltet godtas, men påvirker ikke status.
- (c) Som i dag: feltet holder sporet åpent i alle kategorier.

Grunn: fullmakten og brevet bruker allerede regelen bare ved endring. I dag er
sporstatus uenig med dem.

**Valg 6: «frafalt» (§ 32.3 bokstav c)** (spørsmål 5).

- **(a) Backend avviser `frafalt` utenfor irregulær endring og valgrett
  (anbefalt).**
- (b) Som i dag: godtas for alle kategorier.

Grunn: bokstav c forutsetter et pålegg som kan frafalles. I andre kategorier
finnes det ikke noe pålegg å frafalle.

**Valg 7: sum eller poster** (spørsmål 6). Under (1) og (2) bortfaller
spørsmålet for nye hendelser. Serveren regner summen av postene, og en sum som
ikke er lik, avvises. Velges (3):

- **(a) Postene binder, og summen er en utregning (anbefalt).**
- (b) Summen binder.

## Verifikasjon og grenser

**Lest ut av koden (23.09):** `FristForm.svelte` og `VederlagForm.svelte`, hvordan
begrunnelsen settes sammen og sendes; `GeneratedReasoning.svelte`;
`fristDomain.buildEventData`, `vederlagDomain.buildEventData` og
`beregnPrinsipaltResultat` i begge; `approval_authority.py` og
`approval_letter.py` i sin helhet; `approval_service.py`, `basis`,
`validate_items`, `stale`, `prepare` og `package`; `submission.svelte.ts`,
utdrag; modulheaderen og hjelpefunksjonene i
`test_beregningsresultat_br01_20260923.py`; `tilleggs_begrunnelse` i modellene.
§ 5 og § 32 i den lokale kopien av NS 8407.

**Kjørt:** ingenting i denne runden. Det som er merket K, er kjørt i
kartleggingen og i spor D 23.09.

**Ikke kontrollert:**

- Påstanden i valg 3 om at saken sperres ved `OMFORENT` med 10 000 kr
  omtvistet, er lest, ikke kjørt.
- Hvordan godkjenningsgrensesnittet viser en pakke er ikke fulgt i frontenden.
  At godkjennerne ser serverens kopi, bygger på `package` i backend.
- Om en feilkode for avvik skal være 400 eller 409, og hvordan frontenden skiller
  den fra andre avvisninger.
- Linjeanslagene er skjønn. For T-b er det ikke gjort noe anslag i Python.
- Tolkningene av NS 8407 er ikke juridisk kvalitetssikret. Det gjelder særlig
  risikoen ved et tvetydig brev under (3) og lesningen av § 32.3 bokstav c i
  valg 6.
