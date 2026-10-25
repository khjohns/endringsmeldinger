# Vurdering av vedtakene, verifisering 2: del 3 (E og F) og del 4 (G og H)

Uavhengig prøving av funnene og spørsmålene i del 3 og del 4. Målet var å avkrefte dem.
Ingen produksjonskode, vedtak eller tester er endret.

- **Kontrollert commit:** `569666b` (main 25.10).
- **Delrapportene:** del 3 `docs/vurdering-vedtakene-2026-10-25-del3.md` på
  `claude/vurdering-vedtakene-del3`, commit `a764db2`. Del 4
  `docs/vurdering-vedtakene-2026-10-25-del4.md` på `claude/vurdering-vedtakene-del4`,
  commit `18284ed`. Del 1 (`1d044a1`) og del 2 (`50b883f`) er lest bare for duplikater.
- **Kontraktsrepoet:** `khjohns/kontrakt` ble lagt til og klonet. Lest: NS 8407 § 32.3,
  § 33.5, § 34.1.3, § 34.2.1, § 34.2.2 og kontraktsgrunnlaget Del II pkt. B.2.16. Her
  vises det bare til bestemmelsene.
- **Vedtakene** er slått opp i `docs/plans/vedtak.md`, generert fra
  `docs/vedtaksregister/vedtak.toml`, med «Følge»: GR-U7, GR-U26, OV-U2, OV-U4, OV-U10,
  OV-U14, OV-U16, OV-U19, OV-U20, OV-U25, OV-U32, OV-U35–OV-U37, OV-U39, HF-U7,
  MM-U23, MM-U25, MM-U28, EO-U8, VS-U18, GFK-U3, presiseringen 24.09 av GFK-06 og
  B-13 (24.09 og 05.10).
- **Issuene** er søkt etter etikett (`beslutning`, `venter-på-beslutning`,
  `review-oppfølging`, 54 åpne), og #818, #909, #1171, #1239, #1260 og #1268 er lest.

Belegg: **K** kjørt og observert 25.10, **L** lest i kode, **—** ikke kontrollert.
Forløpene er kjørt med en midlertidig kopi av `kjerne/tester/brevtekst.test.ts` med
hjelperne `sakMedKrav`, `send`, `rad`, `svar` og `laast`, og kommandoene gikk gjennom
`forhaandsvis` og `vurder`. Fila er slettet og ikke committet.

## Funnene

**Telling:** 12 funn i full form. 4 er bekreftet, 5 er bekreftet med endring, ingen er
avkreftet, 2 er kjent og 1 er duplikat.

### VG-E-01: bekreftet med endring

- **Belegg:** K. `forbeholdForGrunnlaget` i `kjerne/frosset/brevtekst.ts` gir teksten etter
  GR-U26 når BH har registrert et brev med beskrivelsen «Avslag på grunnlaget» i
  grunnlagssporet. Den gir samme tekst uten noen registrering. L: `bhSkjema` i
  `src/lib/kjernesak/arbeidsflate.svelte.ts` tilbyr BH bare vederlagssvaret.
- **Type:** ikke en vedtaksmotstrid. GR-U26 (24.10) er yngre enn OV-U4 (13.10). Vilkåret
  «ikke er besvart» oppfylles etter sin ordlyd når appen ikke har noe svar, og OV-U4 sier at
  appen ikke utleder noe av brevet. De to vedtakene gir samme atferd. Ny type: misvisende
  budskap i en vedtatt tekst, med et uavklart valg. Saken ble ikke drøftet i #1239.
- **Forløpet:** registreringen er ikke vilkåret. Teksten blir feil hver gang BH har svart
  utenfor appen, også uten registrering. I TS-ruta i dag går ethvert svar på grunnlaget
  utenfor appen (#818). Utveien GR-U26 gir, å svare på grunnlaget i samme brev, finnes
  derfor ikke der. For underkategoriene med § 32.2 kan TE også lese setningen som at BH ikke
  har svart etter § 32.3 annet ledd (V).
- **Minste avklaring:** spørsmål 1 i del 4, med endringene under.
- **Registrering utenfor appen:** delvis. Feilen kommer av at et svar utenfor appen ikke blir noe svar i appen (OV-U4), men den oppstår også uten registrering. Uten unntakene ville funnet stått og blitt litt bredere: et svar på grunnlaget som er byggherrens endringsordre etter OV-U6, gir i dag et grunnlagssvar og ingen forbehold, og ville da også fått teksten.

### VG-H-01: duplikat av VG-E-01

Samme tekst, samme kodested og samme årsak: GR-U26 slik den lyder, og at OV-U4 ikke gir noe
svar fra et registrert brev. Del 4 sitt forslag om «i appen» passer begge.

- **Registrering utenfor appen:** delvis, som VG-E-01. Uten unntakene ville funnet stått og blitt litt bredere, som VG-E-01.

### VG-E-02: bekreftet med endring

- **Belegg:** L. `vederlagslag` i `src/lib/kjernesak/vederlagssvar.ts` gir hver rad
  `etikett(lag + forskyvning)`, så hvert lag fra 3 og oppover heter «videre subsidiært».
  Bare `beloep` og `rettidighet` etter § 34.1.3 med `begrenset` blir rader. Preklusjonen
  etter § 34.1.2 og lagene fra grunnlaget får ingen rad. Resultattabellen i
  `VederlagForm.svelte` viser `rad.etikett`.
- **Type:** OV-U32 gjelder brevet, og brevet er riktig. Tabellen er en forhåndsvisning i
  skjemaet som ingen vedtak regulerer. Ny type: misvisende budskap, ikke implementeringsavvik.
  Rettingen er et arbeidsvalg, ikke noe som følger av OV-U32.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-F-01: bekreftet med endring

- **Belegg:** K. Vurderingene `godkjent` med 50 000 kr og et tomt resultat avvises med
  `ANNET_RESULTAT`: «Serveren regner ut resultat=godkjent, godkjent_beloep=125000.» Svaret
  godtas bare når klienten selv sender resultatet 125 000 kr. Da lagres `beloep: 125000`
  på standpunktet, og 50 000 kr lagres ikke. `avslatt` med 50 000 kr gir det samme med 0 kr.
- **Forløpet:** «uten melding» holder ikke. Klienten får tallet i avvisningen og må selv
  bekrefte det. Det som består, er at kjernen godtar et internt motstridende vurderingsfelt
  og forkaster det uten avvisning. Konsekvensen er lav. Den tekniske rettingen i del 3 står.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-F-02: bekreftet

- **Belegg:** K. Krav 100 000,40 kr og «delvis» 99 999,60 kr gir `utregning {resultat:
  godkjent, godkjent_beloep: 99999.6}` og `sammenfall: true`. Brevet sier «Byggherren
  godkjenner 99 999,60 kr eks. mva.» L: `erBeloepetGodkjentFullt` sammenlikner `tilKrone`,
  og `vederlag.beloep` i `kjerne/format/format.ts` har ingen `multipleOf`.
- **Tillegg:** HF-U7 (15.10), som presiserer B-13, sier også at appen ikke avgjør om et avvik
  er så lite at det likevel blir avtale. Sammenfall ved et avvik i øre ligger nær nettopp det.
  Typen «uavklart valg» står. Se spørsmål 3 i del 3.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-F-03: bekreftet

- **Belegg:** L. `brevverdi` i `server/fullmakt.ts` summerer `godkjent_beloep` og
  `subsidiaert_godkjent_beloep ?? godkjent_beloep` hver for seg og tar det største. Funksjonen
  har ingen kaller utenfor testene. Docstringen viser til GFK-U3, men den gjelder bare
  dagmulktssatsen. Funnet står ikke i hovedplanen eller i et issue.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-H-02: kjent (#909)

- **Belegg:** L. Formatet i `kjerne/format/format.ts` har `metode: { const: 'tilbud' }`, så
  det er kjernen som bare tar imot tilbud, ikke bare skjemaet. Flere vederlagsmetoder og
  regningsarbeid er S-2a.3 i #909.
- **Endring:** meldingen «… Velg tilbud.» fra `vederlagskrav` i
  `src/lib/kjernesak/vederlagskrav.ts` kan ikke vises i praksis. `TeVederlagForm.svelte`
  filtrerer metodene til tilbud, og standardvalget er `FASTPRIS_TILBUD`. Det som gjenstår av
  budskapet, er at TE bare ser «Fast sum» uten å få vite at andre metoder ikke kan sendes. Det
  nye i funnet er en tekst til #909, ikke et eget funn.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-G-01: kjent (#1268, #1171)

Demoscenariet i `src/lib/mockup/scenarios.ts` står i #1268. Ifølge kommentaren på #1171 tas
de to stedene i kjernen, i `kjerne/regler/vederlag.ts` og `kjerne/frosset/standpunkt.ts`, ut
i #1171 med økt regelversjon og projeksjonsversjon. Ordlyden i Del II pkt. B.2.16 bekrefter
påstanden. De tekniske rettingene 1 og 2 i del 4 er derfor alt ført.

- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-G-02: bekreftet

- **Belegg:** — for kjøring, fordi posten ikke er bygget. Vedtakene er lest. OV-U37 krever at
  appen viser «den nye overtakelsesdatoen» som TEs premiss. OV-U39 lister det TE oppgir, og
  der er ingen overtakelsesdato, bare forlengelsen og perioden. Begge er fra 24.10.
- **Kontrakten:** etter Del II pkt. B.2.16 regnes forlengelsen mot den avtalte nye datoen for
  overtakelse i kontrakten. Hverken i vedtak.toml eller i kommentarene på #1171 sier noe hvor
  datoen kommer fra.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-G-03: bekreftet med endring

- **Belegg:** L for `TeFristForm.svelte`, som TS-ruta bruker fra `Kontrollrommet.svelte`, og
  for `noekkeltall`.
- **Vedtak og kontrakt:** EO-U8 gjelder en endringsordre med flere KOE-saker, ikke KOE-saker
  generelt. Det bærende belegget er § 33.5 første ledd annet punktum om den samlede virkningen
  av tidligere varslede forhold, sammen med VS-U18. Type: uavklart valg under VS-U18.
- **Registrering utenfor appen:** nei. Uten unntakene ville funnet stått uendret.

### VG-G-04: bekreftet

- **Belegg:** L. `noekkeltall` i `server/saksliste.ts` summerer bare krav og enighet som er
  utledet. Overskriftene i `ProjectOverview.svelte` er uten avgrensning, men oversikten viser
  «etter appens lesing» og «ikke forstått · telles ikke i tallene». Typen står.
- **Registrering utenfor appen:** delvis. Krav og svar i registrerte brev er ikke med i summene fordi de er dokumentasjon (OV-U4). Uten unntakene ville funnet stått uendret, fordi unntakene ikke gir noe beløp.

### VG-H-03: bekreftet med endring

- **Belegg:** L. `brevVedKravet` i `kjerne/utledning/visning.ts` tar bare brev med
  `avsender === 'BH'`. `Kjernejournal.svelte` skriver «… og motparten har registrert brev»
  til begge partene, og raden under sier «Registrert brev fra BH …». For BH står de to
  setningene altså mot hverandre.
- **Endring:** OV-U20 krever ved kravet beskrivelsen og datoen, ikke merknaden «Appen
  vurderer ikke innholdet». Den står ved journalposten (`registrertBrevTekst` i
  `src/lib/kjernesak/saksbilde.ts`). At merknaden mangler ved kravet, er derfor ikke et
  avvik. Funnet snevres inn til ordet «motparten» når BH leser. Om TEs brev skal vises, er
  spørsmål 6.
- **Registrering utenfor appen:** ja, årsak. Teksten gjelder visningen av registrerte brev ved kravet (OV-U20). Uten unntakene ville funnet stått uendret, fordi visningen gjelder brev registrert som dokumentasjon.

### De korte funnene i del 3

- **Lesemodellen gir hver beløpspost svarets resultat:** delvis sett i forløpet for VG-F-02
  (K). Standpunktet i `leser.ts` har `resultat: godkjent`. Ingen visning leser feltet per
  post. Avvises etter stoppregelen, fordi det ikke gir feil resultat nå.
- **`utregning.resultat` er «godkjent» uten sammenfall:** avvises. Bare navnet kan
  misforstås, og HF-U7 er fulgt.
- **Python-stien:** følger [DL-U2](plans/vedtak.md#dl-u2). `PositionExplanation.svelte` står
  alt i #1268.

## Spørsmålene

**Telling:** 9 spørsmål. 1 holder, 7 holder med endring, og 1 holder ikke.

### Del 3, spørsmål 1 (forbeholdet): nei, slås sammen med del 4, spørsmål 1

Alternativ A og B gjør teksten eller en sperre avhengig av at det finnes et registrert brev i
grunnlagssporet. Det er å utlede noe av brevet, og det forbyr OV-U4: «ingen standpunkt,
enighet, sperre eller uavklart utfall». B gir dessuten en sperre som OV-U4 sier uttrykkelig
at brevet ikke gir. B ville også stenge BH ute fra vederlagssvaret i TS-ruta, fordi
grunnlaget ikke kan besvares der (#818). Begge treffer heller ikke BH som har svart utenfor
appen uten å registrere. Skal A eller B stå, må alternativet si «Endrer OV-U4». C er dagens
atferd og står.

### Del 4, spørsmål 1 (forbeholdet): med endring

- A erstatter den vedtatte teksten i GR-U26. Forholdet er «Endrer ordlyden i GR-U26», ikke
  «Presiserer». OV-U10 kan nevnes som mønster.
- B gjør teksten avhengig av registrerte brev. Da må den si «Endrer OV-U4», eller strykes.
- Bakgrunnen bør si at forbeholdet i dag står i hvert vederlagssvar fra TS-ruta, fordi
  grunnlaget ikke kan besvares der (#818). Den bør også vise til § 32.3 annet ledd for
  underkategoriene der § 32.2 gjelder.
- A står alene i vedtaksform:
  «Når byggherren svarer på vederlag eller frist mens gjeldende versjon av grunnlaget ikke er
  besvart i appen, sier brevet: ‹Byggherren har ikke svart i appen på grunnlaget i TEs krav i
  brev <n> av <dato>. Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for
  kravet foreligger.› Appen avgjør ikke om et brev sendt utenfor appen er et svar på
  grunnlaget. Endrer ordlyden i GR-U26. I tråd med OV-U4 og OV-U10.»
- Anbefalingen A står.

### Del 3, spørsmål 2 (fullmakten og lagene): med endring

- A følger prinsippet i B-13 (05.10), der fullmakten bruker det subsidiære resultatet, og
  «verdien i svaret» i presiseringen 24.09 av GFK-06. Valget kan føres som arbeidsvalg med
  henvisning til dem. Spør bare hvis oppdragsgiver vil ha det som vedtak.
- B endrer B-13 (05.10) bare når grunnlaget er avslått. Ellers er forholdet «Endrer
  presiseringen 24.09 av GFK-06».

### Del 3, spørsmål 3 (øre): med endring

- A sier at enigheten gjelder byggherrens lavere beløp, uten TEs aksept. Etter HF-U7 er et
  svar som avviker, avslag med nytt tilbud, og appen avgjør ikke om avviket er så lite at det
  likevel blir avtale. A må derfor si «Endrer HF-U7», eller strykes.
- B fjerner problemet uten å endre et vedtak: sammenlikningen etter B-13 og HF-U7 er i hele
  kroner, og OV-U39 avrunder også til hele kroner. Forholdet er «Presiserer B-13 og HF-U7».
  B anbefales.
- Nytt alternativ for den som vil beholde øre:
  «Et svar er full godkjenning av beløpet bare når det er likt det krevde til hele øre. Endrer
  B-13 «til nærmeste krone».»

### Del 4, spørsmål 2 (overtakelsesdatoen): med endring

A fjerner det OV-U37 krever, å vise «den nye overtakelsesdatoen» som TEs premiss. Forholdet
er «Endrer OV-U37», ikke «Presiserer». B («Utvider OV-U39») stemmer. Anbefalingen A står og
er begrunnet i B.2.16 og OV-U36.

### Del 4, spørsmål 3 (fristkrav i flere saker): med endring

- Belegget bør være § 33.5 første ledd annet punktum og VS-U18, ikke EO-U8.
- VS-U18 krever allerede veiledning etter § 33.5. A er derfor «Presiserer VS-U18», ikke
  «Utvider», og kan føres som arbeidsvalg i issuet som bygger VS-U18.
- Bare B, som ber TE begrunne avgrensningen, er oppdragsgivers å avgjøre.

### Del 4, spørsmål 4 (nøkkeltallene): ja

Alternativene står alene i vedtaksform, og forholdet «Presiserer MM-U28» stemmer.

### Del 4, spørsmål 5 (bare tilbud): med endring

- Bakgrunnen bør si at «Velg tilbud» ikke vises (L), og at kjernen bare tar imot tilbud.
- Etter MM-U25 sier saken at noe må sendes utenfor appen der OV-U2 og MM-U2 krever det. A
  legger vederlagsmetodene til, så forholdet er «Utvider MM-U25», ikke «Presiserer».
- B er ikke et vedtak. OV-U14 står allerede, og rekkefølgen er et arbeidsvalg i #909. B bør
  tas ut. Da er A en tekst under byggingen i #909 og kan avgjøres der.

### Del 4, spørsmål 6 (TEs brev ved kravet): med endring

- A viser begge partenes brev til begge partene. Det går ut over «motpartens» i OV-U20, så
  forholdet er «Utvider OV-U20».
- Svaret på #1045 (kommentaren 6347120549) definerer ikke «motparten». Det er mer
  nærliggende å lese ordet ut fra den som leser. Nytt alternativ:
  «Ved kravet som venter på svar viser appen den som leser, motpartens registrerte brev som
  hører til sporet eller saken og ikke er rettet: TE ser byggherrens og byggherren ser TEs.
  Presiserer OV-U20.»
- B («Presiserer OV-U20») stemmer.

## Det jeg fant selv

Ingen nye funn med eget forløp. Det jeg fant, er ført under VG-E-01: forbeholdet treffer også
uten registrering, og i TS-ruta i dag i hvert vederlagssvar etter et svar på grunnlaget
utenfor appen.

## Verifikasjon og grenser

- **Kjørt i kjernen i minnet:** VG-E-01 med og uten registrering, VG-F-01 og VG-F-02. Ikke
  kjørt gjennom HTTP-serveren eller SQL Server, og ingenting er sett i nettleseren.
- **Ikke kjørt på nytt:** forløp 3 i del 3 (VG-E-02, VG-F-03) og forløp 7 i del 4 (VG-H-03).
  De er prøvd ved å lese koden.
- **Ikke kontrollert:** om skjemaet viser OV-U4-meldingen ved vederlagssvaret, og om TS-ruta
  har en vei til å registrere brev (del 4 viser til #807 og #1045).
- **Ikke vurdert rettslig:** virkningen etter § 32.3 annet ledd av byggherrens egen setning.
  Det er en vurdering (V), ikke prøvd mot rettspraksis.
- Søket i issuene dekker etikettene over og de issuene som er nevnt, ikke alle åpne issues.
