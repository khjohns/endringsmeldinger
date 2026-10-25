# Vurdering av vedtakene 25.10, verifisering 1: del 1 og del 2

Kontroll av funnene og spørsmålene i del 1 og del 2 av den kritiske gjennomgangen av
vedtakene. Målet var å avkrefte dem. Ingen produksjonskode, vedtak eller tester er
endret. Appen er ikke i produksjon og har ingen reelle data.

- **Kontrollert commit:** `569666b` (`main`, «Merge pull request #1281»).
- **Delrapportene:** del 1 på grenen `claude/vurdering-vedtakene-del1`, commit `1d044a1`,
  og del 2 på grenen `claude/vurdering-vedtakene-del2`, commit `50b883f`. Del 3 (`a764db2`)
  og del 4 (`18284ed`) er bare lest for å finne duplikater.
- **Kontraktsrepoet** `khjohns/kontrakt` ble lagt til (commit `5540b60`). Påstandene om
  NS 8407 § 5, § 31.3, § 32.2, § 32.3, § 33.4, § 34.1.2, § 34.1.3 og § 34.2.1–34.2.2 og om
  avtaleloven § 6 med kommentar er kontrollert der. Rapporten viser bare til bestemmelsene.
- **Belegg:** **K** kjørt og observert 25.10, **L** lest i kode, **—** ikke kontrollert.
  Forløpene ble kjørt i minnet med `Kjoering` og `minnebane` fra `kjerne/tester/`, etter
  prefikset `krav_irreg`, i en prøvefil som er slettet.
- **Kjent-søket** dekket funnregisteret i hovedplanen og arkivet, de åpne issuene (også dem
  med etikettene `beslutning`, `venter-på-beslutning` og `review-oppfølging`) og de lukkede
  siden 10.10.

## Funnene

**VG-B-01: bekreftet med endring.** K: forløp 10 gir brevet med «… med beløpet og
forbeholdene som fremgår av svaret», enighet `virksom` og avvisning av TEs aksept, ny
kravversjon og revisjon. Avvisningskoden er `ENIGHET_I_SPORET` når fristen ikke er avgjort.
`KRAVENE_AVGJORT` er ikke prøvd. Funnet er ikke et uavklart valg. Spørsmålet til LV-U32
(24.10, `vedtak.toml`) nevner tilfellet med forbehold i utdypningen, og forkastet alternativ B
drøfter det. Svaret sier at teksten «fungerer også med subsidiære standpunkter og
forbeholdet etter GR-U26», og at registreringen av enighet følger GR-U7 og HF-U7.
«Forbeholdene» er altså byggherrens standpunkter i svaret. Atferden følger av gjeldende
vedtak (KA-U16, som forkastet «at et svar med forbehold ikke gir sammenfall», og GR-U7,
GR-U8 og MM-U30). Det eneste som mangler etter vedtakene, er teksten i skjemaet (VG-A-02).
Å endre setningen er et forslag om å endre LV-U32.
Registrering utenfor appen: nei. Funnet gjelder et brev fra appen og ville stått uendret om registrerte brev bare var dokumentasjon.

**VG-A-01: bekreftet.** L: `kjerne/frosset/standpunkt.ts` `beslutningslinje` skriver
`prekludert (§ …)` for en påberopelse med lag (`laget`). Testene `kjerne/tester/brevtekst.test.ts`
venter teksten flere steder. MM-U23 gjelder, og ingen senere vedtak gir ordlyden. Funnet er
delvis kjent i #492 (lukket): den rettingen la til «Byggherrens standpunkt:», men ordet
«prekludert» står igjen. Den minste rettingen er som foreslått i del 1, med `REGELVERSJON` og
`PROJEKSJONSVERSJON` økt.
Registrering utenfor appen: nei. Ordet i linja kommer ikke av registreringen, og funnet ville stått uendret. Bare tillegget om et tidligere varsel TE oppgir (OV-U5) i forløp 5 ville falt bort.

**VG-A-02: kjent (#313).** L: verken `VederlagForm.svelte`, `Brevkontroll.svelte` eller
`src/lib/kjernesak/` har teksten etter KA-U19 og OV-U4. Følge til KA-U19 sier
«Ikke bygget. Skjemaet hører til #313», men beskrivelsen av #313 nevner ikke kravet.
Den minste rettingen er å føre teksten etter KA-U19, slik OV-U4 endret den, som krav i #313.
VG-C-02 hører med.
Registrering utenfor appen: delvis. Teksten skjemaet mangler, kommer fra OV-U4 sin endring av KA-U19, men den gjelder grunnregelen og ikke unntakene. Funnet ville stått uendret.

**VG-B-02: kjent (#732), med endring.** K: forløp 5 gir `svaret_gjaldt_et_annet_varsel`, og
akseptteksten nevner ikke varselet. Forløp 1 gir `enige_betinget`, så `subsidiaert` og
`enighet_uten_virkning` med betegnelsen `enige` og statusen «Avsluttet: avslått». L: ingen
komponent i den ekte saksruta leser `etiketter`. Bare testsiden `[sakId]/kjerne/+page.svelte`
viser kodene rå. #732 punkt 1 nevner `enighet_uten_virkning` og `svaret_gjaldt_et_annet_varsel`,
og det er utsatt til #313 (18.10). `subsidiaert` og `enige_betinget` legges til, med OV-U5
og GR-U26 som kilde. OV-U5 krever varselet i visningen og akseptskjemaet, ikke i brevteksten.
Registrering utenfor appen: delvis. `svaret_gjaldt_et_annet_varsel` i forløp 5 kommer av unntaket i OV-U5 og ville falt bort. Forløp 1 med `enige_betinget`, `subsidiaert` og `enighet_uten_virkning` (GR-U26) ville stått.

**VG-B-03: bekreftet med endring.** Motstriden er en annen enn rapporten sier. Mot en
innsigelse sendt fra appen står VS-U9 (10.10): en innsigelse etter svaret «endrer ikke et
tidligere svar eller en enighet». Mot et registrert brev står OV-U4: «ingen … uavklart
utfall». OV-U5 gjelder TEs eget varsel, ikke byggherrens innsigelse. MM-U9 gjelder endrede
regler, ikke en ny opplysning. Begge støtter derfor bare indirekte. Registeret fører ingen
av forholdene, og Følge til VS-U1 sier «I tråd med MP-U5, MP-U7». Typen er et forhold som
ikke er ført i registeret. Belegg L: ingen implementasjon av MP-U7.
Registrering utenfor appen: delvis. Motstriden for et registrert brev står mot grunnregelen i OV-U4, som også gjelder uten unntakene. Motstriden for en innsigelse fra appen (VS-U9) er uavhengig av funksjonen. Funnet ville stått.

**VG-B-04: bekreftet.** L: `VederlagForm.svelte`, `FORBEHOLDET` og `AVSLAATT`/`PREKLUDERT`
har andre ord enn brevet. Brevkontrollen viser den låste teksten før sending, så skjemaet gir
ikke et feil resultat. Funnet avvises med én linje etter stoppregelen.
Registrering utenfor appen: nei. Funnet ville stått uendret.

**VG-A-03: bekreftet med endring.** L: i tillegg til de tre stedene i del 1 sier
`GrunnlagOverview.svelte` «Grunnlaget er prekludert (§ 32.2)», med `!store.erKjernesak` som
vakt, og valget «Nei, prekludert» står i `GrunnlagForm.svelte` og `FristForm.svelte`. Dette er
Python-stien, så DL-U2 gjelder. #1268 dekker bare `VederlagOverview` og rigg. Funnet meldes
som issue, men rettes ikke.
Registrering utenfor appen: nei. Funnet ville stått uendret.

**VG-C-01: duplikat av VG-B-01.** Det er samme forløp og samme vedtak. Om LV-U32 sier
dommen over VG-B-01 det samme. Funnet nevner i tillegg OV-U39 siste del, som også gjelder.
Registrering utenfor appen: nei. Funnet bruker merkingen av registrerte brev (KA-U20, KA-U26) bare som sammenlikning og ville stått uendret.

**VG-C-02: bekreftet med endring.** L: `VederlagForm.svelte` `kjerneresultat` gir bare
`Check` ved `kjernelag.sammenfall`. Funnet er ikke et uavklart valg. OV-U4, som endret
KA-U19, krever at skjemaet sier at parten er bundet av det hen sender fra appen. Funnet er
delvis samme mangel som VG-A-02, og den minste rettingen føres sammen med den i #313.
O må rettes: § 31.3 annet ledd sier at en endringsordre forplikter TE, ikke at et godkjent
krav binder byggherren. Ingen bestemmelse i NS 8407 gir en slik binding.
Registrering utenfor appen: nei. Funnet ville stått uendret.

**VG-D-01: bekreftet med endring.** K: en ny grunnlagsversjon med 19.09 eller 01.09 godtas,
og brevet viser bare den nye datoen. Grunnlagssvaret med «for sent» faller, og en ny versjon
etter enighet avvises med `ENIGHET_I_SPORET`. At påberopelsen faller med versjonen, følger
av HF-U8, som lar bare «i tide» og avkall stå. Det hører til #1127 og ikke til dette funnet.
Ingen vedtak avgjør om datoen etter VS-U26 kan endres i en ny versjon. OV-U11 og SK-12 gjelder
varseldatoen, og Følge til GR-U22 gjelder endringsordrens dato. Funnet er delvis kjent i
#1127, der svaret tillater datoen fra den gjeldende versjonen, men ikke sier noe om å vise
den tidligere.
Registrering utenfor appen: delvis. Funnet gjelder datoen i grunnlagskravet fra appen. Rettingsmodellen det sammenlikner med, har OV-U11 for varseldatoen etter unntaket i OV-U5, og den ville falt bort. Funnet ville stått, men sammenlikningen hviler da bare på MM-U21 og OV-U41.

**VG-D-02: avkreftet.** OV-U41 avgjør det. En supplering er «et nytt utsagn», og alle
datoene «beholdes og vises som TEs utsagn». Appen «beregner ikke rettidighet eller
preklusjonsvirkning av datoene», og «Et svar byggherren alt har gitt, står». Rettingsmodellen
gjelder bare når en tidligere opplysning erstattes, og en første dato erstatter ingenting.
Valget føres som arbeidsvalg i #1171 med henvisning til OV-U41.

**VG-D-03: avkreftet.** K: teksten er som rapporten sier. Svaret TE godtar, sier selv
«Prinsipalt: byggherren avslår grunnlaget», og etter GR-U1 forblir det subsidiært til
grunnlaget besvares igjen. Tillegget viser derfor til et standpunkt som finnes. Det strider
ikke mot svaret i #1260 («ikke … bare fordi grunnlaget er ubesvart: Det foreligger da ikke noe
slikt standpunkt»).

**VG-D-04: avkreftet.** K: `subsidiaer` er `['avslaatt']` og etiketten `subsidiaert` står
mens sporet venter på svar. Det følger GR-U1 («forblir subsidiært til sporet eller grunnlaget
besvares igjen») og kommentaren i `kjerne/utledning/utled.ts` (#342). Etiketten vises ikke
(VG-B-02). Hvordan den skal vises uten et gjeldende svar, avgjøres i #732.

Ingen funn er samme feil som et funn i del 3 eller del 4. VG-B-04 gjelder samme forbehold
(GR-U26) som VG-E-01 og VG-H-01, men en annen feil.

## Spørsmålene

**Del 1, spørsmål 1 (forbeholdene ved full godkjenning): holder med endring.** Spørsmålet
foreslår å endre LV-U32, som ble vedtatt dagen før, og det skal stå uttrykkelig.
Bakgrunnen må gjengi at tilfellet ble lagt fram 24.10 (forkastet B), og at svaret sier
«forbeholdene» viser til byggherrens standpunkter, med lag og forbeholdet etter GR-U26.

Alternativ A må beholde setningen når svaret står i et lag etter det første, eller under
forbeholdet etter GR-U26. Ellers faller nettopp det LV-U32 ble valgt for. A i vedtaksform:
«Godkjenner byggherren hele det krevde beløpet og oppgjør som fast sum i første lag, og
ikke under forbeholdet for ubesvart grunnlag, sier brevet: «Byggherren godkjenner oppgjør
som fast sum med beløpet som fremgår av svaret.» Ellers gjelder LV-U32. Endrer LV-U32.»

Skjemateksten er alt vedtatt i KA-U19 og OV-U4 og skal ut av alternativene. Alternativ B er
det LV-U32 alt sier, og blir «Som i dag (LV-U32)». C strider mot KA-U16 og GR-U8, som
spørsmålet sier.

**Del 1, spørsmål 2 (MP-U7): holder med endring.** VS-U9 og OV-U4 avgjør det. De er senere
og uttrykkelige, og etter innledningen i vedtaksfila gjelder et senere vedtak foran ordlyden.
Spørsmålet blir en bekreftelse: «MP-U7 er endret av VS-U9 og OV-U4 for saker i appen: en
innsigelse sendt etter svaret, eller et registrert brev, gjør ikke utfallet uavklart, og et
sendt brev merkes ikke som utdatert.»

Alternativ B strider mot VS-U9 («endrer ikke et tidligere svar») og må si «Endrer VS-U9 og
HF-U11», ikke «utvider HF-U11». Følge til VS-U1 («I tråd med … MP-U7») rettes samtidig.

**Del 2, spørsmål 1 (forbehold i begrunnelsen): nei.** Spørsmålet slås sammen med del 1,
spørsmål 1. Alternativ A får brevet til å si «uten forbehold», men appen leser ikke
utdypningen (KA-U16) og kan ikke vite det. Hele brevet er det autoritative (B-03), og
setningen ville stride mot LV-U32 for svar i et lag eller under forbeholdet etter GR-U26.
Appen har heller ikke noe standpunkt for en avgrensning av omfanget (KA-U16). Det er
derfor en endring av KA-U16 og LV-U32, ikke en innsnevring. Alternativ B endrer KA-U19
(«sendes utenfor appen og registreres»), ikke bare KA-U20 og KA-U26.

**Del 2, spørsmål 2 (opplysning til byggherren): nei.** Opplysningen følger av OV-U4, som
endret KA-U19 («parten er bundet av det hen sender fra appen»), og av GR-U7. Den føres som
arbeidsvalg i #313 sammen med VG-A-02. Ordlyden i A er feil på ett punkt. Avslår
byggherren grunnlaget senere, «står» ikke enigheten. Den blir betinget av ansvaret
(GR-U7, GR-U26).

**Del 2, spørsmål 3 (datoen i grunnlagskravet): holder med endring.** Bakgrunnen skal si at
påberopelsen av «for sent» faller med versjonen etter HF-U8 (#1127). Spørsmålet gjelder bare
datoen. Alternativ C må skrives i vedtaksform: «En ny grunnlagsversjon kan endre datoen
varslingsplikten løper fra. Den nye datoen gjelder straks som TEs opplysning, og brevet viser
bare den (GR-U22, VS-U26).» Forholdet i A er riktig.

**Del 2, spørsmål 4 (første kunnskapsdato): nei.** Det avgjøres av OV-U41 (se VG-D-02).
Teksten om § 34.1.3 tredje ledd står også mellom «Alternativer:» og alternativene.

## Egne funn

Ingen nye funn med forløp og belegg K eller L. Tillegget under VG-A-03 er ført der.

## Verifikasjon og grenser

- Forløpene er kjørt i minnet gjennom kjernens kommandoer, ikke gjennom serveren, testbasen
  eller nettleseren. Visningen i Kontrollrommet er lest (L), ikke sett.
- `KRAVENE_AVGJORT` i forløp 10 og fristsvaret og grunnlagssvaret i forløp 10 er ikke prøvd.
  Det samme gjelder rigg og drift, registrerte brev med forbehold og akseptfristen.
- Kjent-søket i issuene ble gjort av en subagent. #1260 er kontrollert selv.
- Ordlyden er kontrollert av en subagent mot `NS_8407.md` og avtaleloven § 6 med kommentar.
  Bestemmelsene vedtakene viser til utover dem i innledningen, er ikke kontrollert.
- Python-stien er bare lest for VG-A-03.
