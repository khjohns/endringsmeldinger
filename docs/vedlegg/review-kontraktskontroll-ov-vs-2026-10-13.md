# Kontraktskontroll av OV-U3–OV-U7 (#481) og VS-U17–VS-U21 (#476)

**Dato:** 13.10. **Kontrollert:** `main` 7032342 (kjernen, 3.1), #481 `dfee5ad`, #476 `8d8d530`.
**Kontrakt:** `../../../kontrakt/NS_8407.md` (bare korte utdrag her).
**Belegg:** **L** = lest i vedtak eller kode, **K** = kjørt og observert (to skript med
`node --experimental-strip-types` mot kjernen i minnet, [`kjerne/tester/kjoerer.ts`](../../kjerne/tester/kjoerer.ts); slettet).
Appen er ikke i produksjon og har ingen reelle data.

Vedtakslinjer viser til [`docs/vedtaksregister/vedtak.toml`](../vedtaksregister/vedtak.toml) på grenen: #481 = `dfee5ad`,
#476 = `8d8d530`. Kodelinjer viser til `main` 7032342.

## Sammendrag

| ID | Spørsmål | Klassifisering | Retting | Før merge? |
| --- | --- | --- | --- | --- |
| KK-01 | OV-U5 sperrer særskilt varsel etter § 34.1.3 fra appen etter vederlagskravet | Produktvalg med premiss som ikke holder for § 34.1.3 | (a) S1 | Ja, #481 (senest før § 34.1 bygges) |
| KK-02 | Appdato som ny frist, gjenoppliving | Ingen feil i vedtak eller kjerne; visningsrisiko | (b) #313, (c) | Nei |
| KK-03 | OV-U5 nevner ikke § 33.4 når fristkravet er første varsel med oppgitt eldre dato | Tolkningsspørsmål / utelatelse | (a) S2 | Ja, #481 |
| KK-04 | OV-U6: avgrenset endringsordre, pris og tid | Produktvalg, dekket av vedtaket | (b) skjema, (c) | Nei |
| KK-05 | «Alle fremsatte krav er avgjort» med eksterne krav som dokumentasjon | Representasjon; ordlyden misvisende | (a) S3 | Bør, kan vente til #313 |
| KK-06 | Kjernen viser «Avsluttet: oppgjort» og sperrer opplysning om varseldato etter lukking | Avvik fra OV-U3 (ikke bygget) | (b) #309 | Nei |
| KK-07 | Kjernen knytter § 33.4-påberopelsen til siste kravversjon, ikke varselet | Sikker feil mot VS-U20/OV-U5/HF-U1 (ikke bygget) | (b) #309, (c) | Nei |
| KK-08 | Kjernen gjør preklusjonen uavklart og sperrer TEs aksept (MM-U8) | Avvik fra OV-U5 (ikke bygget) | (b) #309 | Nei |
| KK-09 | VS-U20 mot § 39.2 | Utenfor vedtakets rekkevidde | (d) | Nei |
| KK-10 | VS-U21 strukturerer registrerte brev; feil subjekt i § 33.6.1 | Strider mot OV-U4/OV-U7; ordlyden er sikker feil | (a) S4 | Ja, #476 |
| KK-11 | VS-U19 gir registrert forespørsel virkning | Strider mot OV-U4 | (a) S5 | Ja, #476 |
| KK-12 | VS-U17, VS-U18 | Forenlig | (d) | Nei |

---

## 1. Sperren i OV-U5 og § 34.1.3

### KK-01: sperren hviler på en analogi som ikke holder for § 34.1.3

**Tekst (L).** OV-U5, #481 `dfee5ad`, vedtak.toml l. 3301: «Når TE har sendt
vederlagskravet, avvises et nytt varsel etter § 34.1.2 eller § 34.1.3 fra appen, slik
VS-U16 avviser et varsel etter § 33.4 når fristkravet er sendt; TE kan da oppgi datoen
for et tidligere varsel sendt utenfor appen.» Samme vedtak: TE kan oppgi datoen for et
varsel etter § 34.1.3 sendt utenfor appen «også etter et krav og etter byggherrens
svar», og «Datoen settes én gang, som etter SK-12». Spørsmål 9, som oppdragsgiver svarte
ja på, hadde anbefalingen «avvises, som VS-U16 gjør for § 33.4» (l. 3274).

**Kontrakten.** § 34.1.3 tredje ledd: TE må varsle særskilt «uten ugrunnet opphold etter
at han blir eller burde ha blitt klar over at utgifter ville påløpe». Rigg og drift
(første ledd) og nedsatt produktivitet (annet ledd) er to grunnlag. Fristen løper fra
kunnskap om utgiftene, ikke fra forholdet eller kravet. VS-U16 begrunnes med at et varsel
etter § 33.4 fra appen etter fristkravet «bare kan få en senere dato enn kravet». For
§ 33.4 og § 34.1.2 er kravet selv et varsel om forholdet, så et senere varsel tilfører
ingenting. For § 34.1.3 er det ikke slik: et krav om direkte kostnader er ikke et særskilt
varsel om rigg eller produktivitet, og et varsel etter kravet kan være det første og
rettidige.

**Kjernen (L).** Ikke bygget. `varsel` og `send_varsel` tar bare `hjemmel: '33.4'`
([`kjerne/kommandoer/kommando.ts`](../../kjerne/kommandoer/kommando.ts) l. 145, 155). Preklusjon etter § 34.1 og særskilte krav
avvises med «er ikke i kjernen ennå» ([`kjerne/frosset/standpunkt.ts`](../../kjerne/frosset/standpunkt.ts) l. 334–336).
Motstykket for § 33.4 er bygget: `FRISTKRAV_SENDT` ([`kjerne/kommandoer/forutsetninger.ts`](../../kjerne/kommandoer/forutsetninger.ts)
l. 215–221).

**Forløp.** TE krever 400 000 kr for ekstraarbeid 1.3. Arbeidet forstyrrer annet arbeid,
og TE blir klar over produktivitetstapet 20.4. Etter OV-U5 avviser appen varselet. TE må
sende det utenfor appen og så oppgi datoen i et brev fra appen. Brevet fra appen går
også til byggherren skriftlig, men bærer teksten «TE oppgir at varselet ble sendt …», ikke
selve varselet. Har TE alt oppgitt et varsel om rigg og drift, er det uklart om «datoen
settes én gang» stenger datoen for produktivitetsvarselet.

**Vurdering.** Ingen sikker kontraktsfeil: retten tapes ikke, fordi varselet kan sendes
utenfor appen og datoen oppgis (OV-U5). Men appen sperrer en handling som kan være
nødvendig etter kontrakten, og begrunnelsen i spørsmål 9 holder ikke for § 34.1.3.
Produktvalg som bør tas på riktig premiss. «Hindrer nødvendig varsling» (Codex) er for
sterkt; «tvinger nødvendig varsling ut av appen» er dekkende.

**Retting.** (a) S1. Avgjøres helst før #481 merges (nytt svar på punkt 9), senest før
§ 34.1 bygges i byggedel 3 av #309. Kontrollforløp (c) i #480: Codex' forløp 1.

---

## 2. Ekstern fremsettelse, mottak og frister

### KK-02: appdatoen blir ikke en ny kontraktsfrist i vedtakene eller kjernen

**Tekst (L).** OV-U4, følge (l. 3248–3250): «Et krav eller svar sendt utenfor appen får
ingen virkning i appen; skal det få virkning, sendes det fra appen og får appens dato.»
OV-U5 (l. 3301): «Kravet har datoen det sendes fra appen, og visningen sier «TE oppgir at
kravet ble sendt <dato>». Byggherren tar stilling til rettidigheten etter § 33.6.1 med
opplysningen som premiss.» På `main`: VS-U9 «gjenoppliver ikke en tapt innsigelse»; VS-U3
«ikke å fastslå at kravet er prekludert», og § 33.7 annet ledd «registrerer og viser»;
VS-U10 ingen fast frist; MM-U12.

**Kjernen (L).** Ingen fristberegning. [`kjerne/regler/frist.ts`](../../kjerne/regler/frist.ts) regner bare med
byggherrens sannhetsverdier (`frist_varsel_ok`, `spesifisert_krav_ok`), ingen datoer.
Datoer i kjernen er `tidsstempel` fra serveren ([`kjerne/kommandoer/skriving.ts`](../../kjerne/kommandoer/skriving.ts) l. 289) og
oppgitte `sendt`-datoer, som bare brukes i brevteksten ([`kjerne/frosset/brevtekst.ts`](../../kjerne/frosset/brevtekst.ts)
l. 226–233) og til SK-12-kontrollen ([`kjerne/kommandoer/nyttelast.ts`](../../kjerne/kommandoer/nyttelast.ts) l. 173–186).
Visningen etter VS-U10 («mottaksdatoen, antall dager siden») er ikke bygget.

**Kontrakten.** § 5 første ledd: e-post til avtalt adresse er skriftlig. § 33.7: svaret
skal gis «uten ugrunnet opphold etter å ha mottatt et begrunnet krav med angivelse av
antallet dager», og innsigelser «tapes dersom de ikke fremsettes innen fristen».

**Forløp.** BH mottar TEs krav på 20 dager på e-post 1.10. TE sender det fra appen 15.10
og oppgir 1.10 (OV-U5). BH svarer i appen 20.10 og påberoper for sent varsel. Kjernen
utleder virkningen på BHs premisser (VS-U3) og avgjør ikke om BHs innsigelse er tapt etter
§ 33.7. TE kan gjøre innsigelse etter § 5 mot svaret (VS-U1, VS-U14; bygges etter OV-U7).
Ingen regel leser 15.10 som utgangspunkt for en frist.

**Det som gjenstår, er visningen.** Fristveiledningen etter VS-U10 viser «mottaksdatoen».
For et krav med oppgitt eldre dato kan den, bygget naivt, vise 15.10 og «5 dager siden»
til BH, som da ser mindre tid gått enn kontrakten regner med. OV-U4 krever bare at
fristveiledningen viser at motparten har registrert brev; OV-U5 krever at visningen sier
«TE oppgir at kravet ble sendt <dato>».

**Byggherrens eldre svar utenfor appen.** BH som har svart utenfor appen 5.10, må svare på
nytt i appen (OV-U4), og svaret får 20.10. OV-U5 gir bare TE en datopremiss. Asymmetrien
er forsvarlig: i første versjon avhenger ingen utledning av datoen for BHs svar, fordi
§ 33.7 annet ledd bare vises (VS-U3) og TEs innsigelse er utsagn uten utledning (OV-U7).
Det eksterne svaret står som dokumentasjon med sin dato ved sporet.

**Klassifisering.** Ingen feil i vedtak eller kjerne. Representasjonsrisiko i visningen.
**Retting.** (b) i #313: fristveiledningen viser TEs oppgitte dato ved siden av datoen i
appen, uten å velge (innenfor OV-U5 og VS-U10). (c) i #480: Codex' forløp 2, også med et
eksternt BH-svar. (d) for nytt vedtak: VS-U9, VS-U3 og MM-U12 dekker allerede at appen
ikke gjenoppliver innsigelser eller fastsetter frister.

### KK-03: OV-U5 gir ikke datopremissen for § 33.4 når fristkravet er det første varselet

**Tekst (L).** OV-U5, l. 3301: «Byggherren tar stilling til rettidigheten etter § 33.6.1
med opplysningen som premiss. Det samme gjelder rettidigheten etter § 32.2 når
grunnlagskravet er det første varselet appen kjenner, og rettidigheten etter § 34.1.2 og
§ 34.1.3 når vederlagskravet er det første varselet appen kjenner.» § 33.4 mangler, også i
versjonen før `dfee5ad` (diffen er lest). Samme vedtak: «Er ikke noe varsel etter § 33.4
registrert, viser skjemaet byggherren at det første fristkravet i sporet, i brev <n> av
<dato>, er det første varselet appen kjenner» — der `<dato>` er brevets dato i appen
(`brevet()` i [`kjerne/frosset/brevtekst.ts`](../../kjerne/frosset/brevtekst.ts) l. 226–233).

**Kontrakten.** § 33.4 andre ledd: kravet «tapes dersom det ikke varsles innen utløpet av
fristen». Er kravet selve varselet, er datoen kravet ble sendt også varseldatoen.

**Forløp.** TE sendte kravet på 20 dager på e-post 1.10, uten varsel før. TE sender det
fra appen 15.10 og oppgir 1.10. Skjemaet viser BH at «brev 3 av 15. oktober» er det første
varselet appen kjenner. BH vurderer § 33.6.1 med 1.10 som premiss, men § 33.4 med 15.10.
TE kan unngå det ved også å oppgi 1.10 som datoen for varselet etter § 33.4, med samme
dokument som vedlegg, men ingen regel sier at TE må gjøre det.

**Klassifisering.** Tolkningsspørsmål; trolig en utelatelse, siden § 32.2 og § 34.1 får
premissen i samme situasjon. Å bygge premissen for § 33.4 ville gå ut over listen i
vedtaket. **Retting.** (a) S2, før #481 merges. (c): Codex' forløp 3 i #480.

---

## 3. Endringsordren etter OV-U6

### KK-04: avgrenset endringsordre, pris og tid

**Tekst (L).** OV-U6, l. 3345: byggherren «velger «godkjent»», «Skjemaet gjør det tydelig
at godkjenningen er byggherrens valgte standpunkt, atskilt fra dokumentets øvrige
innhold. Registreringen er byggherrens godkjenning av grunnlaget …», «Partene er enige ved
sammenfall (GR-U10)», «Pris og tid i endringsordren vurderes ikke og gir ingen sperre;
vederlag og frist kreves og besvares i KOE-saken».

**Kontrakten.** § 31.3 første ledd: endringsordren skal gi beskjed om «hva endringen går
ut på». § 32.3 første ledd a: BH svarer på et varsel etter § 32.2 ved å utstede
endringsordre. § 34.2.2: justering etter § 34.3 og § 34.4 «med mindre byggherren har
akseptert et tilbud».

**Hva BH godkjenner (L).** Hele gjeldende kravversjon av grunnlaget. Grunnlaget har bare
`godkjent`, `avslaatt` og `paalegg_frafalt`; det finnes ingen delvis godkjenning
([`kjerne/frosset/standpunkt.ts`](../../kjerne/frosset/standpunkt.ts), `regnUtSvar`, og ingen vedtak om det). Et registrert brev
får ingen brevtekst (MM-U17; [`kjerne/frosset/brevtekst.ts`](../../kjerne/frosset/brevtekst.ts) l. 271–272), så det TE ser, er
etikettene: `enige`, `avklart` og `endringsordre_ifolge_BH` ([`kjerne/utledning/visning.ts`](../../kjerne/utledning/visning.ts)
l. 87–92, 128–131).

**Forløp A.** TEs krav gjelder omprosjektering av hele fasaden. BHs endringsordre gjelder
bare østfasaden. BH registrerer den etter OV-U6 og velger «godkjent». Appen viser enighet
om hele grunnlaget. BH har da i appen godkjent mer enn endringsordren, og kan ikke
revidere (GR-U10). Den andre veien er OV-U4: brevet registreres som dokumentasjon, og BH
svarer fra appen. Der er «godkjent» også en endringsordre for hele kravet (GR-U12, K: teksten
«byggherren krever at endringen utføres slik pålegget er beskrevet i TEs krav»), og
«avslått» underdriver. En avgrenset endringsordre kan ikke uttrykkes i første versjon.

**Forløp B.** Endringsordren sier at BH aksepterer TEs tilbud på 500 000 kr. Vederlagssporet
i appen er tomt. TE krever 500 000 kr i appen, og BH svarer 400 000 kr. Appen viser BHs
standpunkt; den setter ikke avtalen til side, men har heller ikke noe som viser motstriden
(merking er utsatt, OV-U7).

**Klassifisering.** Produktvalg, og vedtaket sier allerede det Codex ber om: at
godkjenningen er BHs eget standpunkt, atskilt fra dokumentet. Ikke en appavgjørelse. Risikoen
er at BH ikke forstår rekkevidden, og at enigheten vises bredere enn endringsordren.
**Retting.** (b) i #313: skjemaet sier at godkjenningen gjelder hele kravet i brev <n>,
ikke bare det endringsordren beskriver, og at en endringsordre for en del av kravet
registreres etter OV-U4; registreringen viser «Appen vurderer ikke innholdet» også for pris
og tid. (c) i #480: Codex' forløp 5, begge varianter. Ikke (a).

---

## 4. Lukkingen og eksterne krav

### KK-05: «Alle fremsatte krav er avgjort» kan være feil når et krav er sendt utenfor appen

**Tekst (L).** OV-U3, l. 3199: «Visningen sier «Alle fremsatte krav er avgjort», og de
fremsatte kravene er kravene TE har sendt.» «Et spor der TE ikke har sendt et krav, hindrer
ikke». OV-U4, l. 3256: et brev sendt utenfor appen er «dokumentasjon». OV-U4, følge:
«Et krav … sendt utenfor appen får ingen virkning i appen».

**Kontrakten.** «Fremsette» er kontraktens ord for et krav som er gitt (§ 5 første ledd,
§ 39.2). Et krav på e-post til avtalt adresse er fremsatt.

**Forløp.** TE krever vederlag i appen og fristforlengelse på e-post, og registrerer
e-posten i fristsporet. BH godkjenner vederlaget i appen. Fristsporet har ikke noe krav
fra appen og hindrer ikke. Visningen sier «Alle fremsatte krav er avgjort», mens et
fremsatt fristkrav er ubesvart. OV-U4 viser registrerte brev ved «venter på svar», men
sporet venter ikke på svar i appen.

**Klassifisering.** Representasjon. Definisjonen i vedtaket gjør teksten riktig for den
som leser vedtaket, men etiketten bruker kontraktens ord i en snevrere betydning.
**Retting.** (a) S3. Billigst før #481 merges; kan vente til visningen bygges i #313.

### KK-06: kjernen viser i dag «oppgjort» og sperrer det OV-U3 godtar

**Kode (L, K).** [`kjerne/utledning/visning.ts`](../../kjerne/utledning/visning.ts) l. 36: `avsluttet_oppgjort: 'Avsluttet:
oppgjort'`, og l. 96: etiketten `oppgjort` for et spor med virksom enighet. Bevis-sakene har
samme verdi ([`docs/domenetabell/bevis-saker-maalmodell.json`](../domenetabell/bevis-saker-maalmodell.json), l. 370 og 459).
[`kjerne/kommandoer/forutsetninger.ts`](../../kjerne/kommandoer/forutsetninger.ts) l. 152 avviser enhver kommando uten `gjelder` med
`KRAVENE_AVGJORT`, også `varsel` med `sendt`.

**Observert (K).** Grunnlag, vederlag og frist godkjent: status «Avsluttet: oppgjort»,
etikettene `oppgjort`. TEs opplysning om et varsel sendt 1.9 avvises med `KRAVENE_AVGJORT`.
Med bare vederlag sendt og godkjent blir saken aldri avgjort («Under forhandling»), som
kartleggingen fant (AV-02).

**Kontrakt og vedtak.** OV-U3: visningen «sier ikke at saken er oppgjort», og «TEs
opplysning om varseldato etter OV-U5 godtas». «Oppgjør» leder tanken mot sluttoppgjøret
(§ 39), som appen ikke behandler.

**Klassifisering.** Kjent avvik fra et vedtak som ikke er bygget. **Retting.** (b) i #309,
med bevis-sakene. (c): Codex' forløp 6 og 7.

---

## 5. VS-U20: hvilket varsel, og § 39.2

### KK-07: kjernen knytter påberopelsen til siste kravversjon, ikke varselet

**Tekst (L).** VS-U20, #476 l. 2150: «gjelder påberopelsen varselet og står mot hver senere
kravversjon i samme sak, også når varselet var selve kravet.» OV-U5: «Svaret viser til
varselet det gjaldt (HF-U1).» HF-U1: «Hvert utsagn viser uttrykkelig til det det gjelder.»
SK-12 og kjernen: ett varsel etter § 33.4 per sak ([`kjerne/utledning/utled.ts`](../../kjerne/utledning/utled.ts) l. 681).

**Kode (L).** [`kjerne/kommandoer/skriving.ts`](../../kjerne/kommandoer/skriving.ts) l. 88: `gjelder: u.spor.frist.varsel?.id ??
krav.id`, der `krav` er kravversjonen svaret gjelder. `regnUtSvar` setter alltid
`varsel_type: 'spesifisert'` uten tidligere varsel ([`kjerne/frosset/standpunkt.ts`](../../kjerne/frosset/standpunkt.ts)
l. 405–411), så `frist_varsel_ok` er påkrevd i hvert fristsvar.

**Observert (K).** TE krever 20 dager (K-f1) uten varsel. BH svarer at varselet kom for
sent. TE sender 25 dager (K-f2). Et svar uten standpunkt om varselet avvises: «frist_varsel_ok:
mangler (§ 33.4)». Svarer BH igjen at varselet kom for sent, lagres standpunktet med
`gjelder: K-f2`, og brevet sier «svar på kravet om fristforlengelse i TEs krav i brev 5 …:
Prinsipalt: byggherren gjør gjeldende at varselet om fristforlengelse etter NS 8407 § 33.4
kom for sent», uten å si hvilket brev varselet er (AV-07).

**Kontrakten.** § 33.4: fristen løper fra forholdet, og varselet er det første skriftlige
som varsler kravet, her K-f1. Påberopelsen mot K-f2 gjelder et annet dokument enn det BH
vurderte i første svar, og K-f2 er ikke et varsel.

**Klassifisering.** Sikker feil mot VS-U20, OV-U5 og HF-U1, i et vedtak som ikke er
bygget (AV-06). Innsigelsen gjelder et annet varsel eller krav enn parten vurderte.
**Retting.** (b) i #309: standpunktet etter § 33.4 viser til det første fristkravet når
ikke noe varsel er registrert, og brevteksten sier hvilket brev det er. (c): Codex'
forløp 4. Ikke (a): VS-U20 og HF-U1 avgrenser allerede målet for påberopelsen.

**Til Codex' forslag om å avgrense «til krav som bygger på samme varslede forhold».**
En sak er ett forhold, og SK-12 gir ett varsel etter § 33.4 per sak. «I samme sak» er
derfor samme forhold og samme varsel i appens modell. Forslaget har ikke belegg ut over
det HF-U1 og OV-U5 sier.

### KK-08: kjernen gjør i dag preklusjonen uavklart når TE oppgir et varsel

**Observert (K).** I forløpet over registrerer TE etter svarene et varsel sendt 1.8.
Begge svarene får et uavklart standpunkt, og `godta:frist` er ikke blant TEs handlinger
(`STANDPUNKT_UAVKLART`, [`kjerne/kommandoer/forutsetninger.ts`](../../kjerne/kommandoer/forutsetninger.ts) l. 255–261;
[`kjerne/utledning/utled.ts`](../../kjerne/utledning/utled.ts) l. 703–740). Det er MM-U8 og VS-U7, som OV-U5 endrer: «Et svar
byggherren alt har gitt, står med virkningen det hadde og blir ikke uavklart.»

**Samspill VS-U20 og OV-U5.** Etter OV-U5 skal påberopelsen ikke føres over til det nye
varselet, og etter VS-U20 står den mot senere kravversjoner. De to er forenlige når
«varselet» i VS-U20 er det svaret viste til (HF-U1). Fordi fristsvaret fra appen alltid
krever et standpunkt til varselet, oppstår ikke et «taust» svar fra appen; skjemaet må vise
hvilket varsel det spør om.

**Retting.** (b) i #309 etter OV-U5. (c): Codex' forløp 4.

### KK-09: VS-U20 og § 39.2

**Kontrakten.** § 39.2 annet ledd: innsigelser byggherren har fremsatt tidligere, «skal
gjentas innen fristen dersom de opprettholdes». § 39.2 gjelder sluttoppstillingen etter
§ 39.1. At en innsigelse etter § 33.4 mot et fristkrav omfattes, er en tolkning (fristen er
ikke en post i sluttoppstillingen, men påvirker dagmulkten, som er BHs krav).

**Vedtaket.** VS-U20 gjelder «hver senere kravversjon i samme sak». En kravversjon er
definert i KA-U2 og er en hendelse i KOE-saken; sluttoppstillingen er ikke det.
Sluttoppgjøret er ikke i første versjon (OV-U1).

**Klassifisering.** VS-U20 rekker ikke til § 39.2 etter ordlyden, og strider ikke mot den.
Risikoen er at visningen «påberopelsen står» leses som at den ikke må gjentas.
**Retting.** (d) for vedtaket. Når sluttoppgjøret bygges, må veiledningen si at § 39.2
krever gjentakelse. Codex' presisering er riktig om kontrakten, men trengs ikke i VS-U20.

---

## 6. Samspillet § 33.4, § 33.6.1, § 33.6.2, § 33.7 og § 5

### KK-10: VS-U21 strukturerer registrerte brev, og ordlyden er feil om § 33.6.1

**Tekst (L).** VS-U21, #476 l. 2193: «Når et brev fra byggherren registreres, angir den som
registrerer, hva brevet påberoper: at varselet kom for sent etter § 33.4, at kravet ble
spesifisert for sent etter § 33.6.1, eller begge. … Sier brevet ikke hvor mange dager
byggherren mener TE måtte forstå, registreres påberopelsen etter § 33.6.1 uten tall, og
brevet kan merkes (KA-U16, KA-U20).»

**Mot OV-U4 og OV-U7.** OV-U4 (l. 3256): appen «utleder ingenting» av et registrert brev,
og alternativet «Å strukturere standpunkter, forbehold og bestridelser i registrerte brev i
første versjon» er forkastet. OV-U7 (l. 3385) utsetter merkingen i KA-U20. VS-U21 er nettopp
strukturering og merking. Strid i første versjon.

**Mot kontrakten.** § 33.6.1: TE har «bare krav på slik fristforlengelse som den andre
parten måtte forstå at han hadde krav på». Den andre parten er BH. «hvor mange dager
byggherren mener TE måtte forstå» bytter subjekt. VS-U4 på `main` har det riktig («oppgir
hen prinsipalt det hen måtte forstå»).

**Forløp.** BH registrerer et brev som sier «for sent». Etter VS-U21 velger BH «§ 33.6.1»,
og appen utleder en avgrensning etter VS-U4, av et brev OV-U4 sier er dokumentasjon.

**Klassifisering.** Strid mellom vedtak (produktavgrensning) og sikker feil i ordlyden om
kontrakten. **Retting.** (a) S4, før #476 merges.

### KK-11: VS-U19 gir en registrert forespørsel virkning

**Tekst (L).** VS-U19, #476 l. 2110: «En forespørsel sendt utenfor appen registreres alltid,
også etter et slikt krav, og vises med datoen. … Ved en registrert forespørsel avgjør ikke
appen om formkravene var oppfylt. Virkningen utledes bare når byggherren uttrykkelig
påberoper at TE svarte for sent (VS-U3)».

**Kontrakten.** § 33.6.2 tredje ledd: svarer ikke TE, «tapes kravet». Fjerde ledd: svarer
TE med dager, kan BH «ikke påberope at fristen i 33.6.1 er oversittet».

**Mot OV-U4.** Den registrerte forespørselen blir et element som en påberopelse viser til,
og som avgjør om TEs neste krav er svar på forespørselen. I kjernen sperrer det BHs
påberopelse etter § 33.6.1 ([`kjerne/regler/frist.ts`](../../kjerne/regler/frist.ts), `kontroller`: «§ 33.6.1 kan ikke
påberopes når TE har svart på forespørselen»). Det er en sperre utledet av et registrert
brev, som OV-U4 utelukker uten et unntak, og OV-U5 og OV-U6 er de eneste unntakene. Delen om
forespørselen fra appen er forenlig med OV-U3, som alt godtar forespørselen i et spor uten
krav.

**Forløp.** BH sender forespørselen på e-post 1.9 og registrerer den. TE sender 20 dager
10.9. Leses kravet som svar på forespørselen, avviser appen BHs påberopelse etter § 33.6.1,
på grunnlag av et brev appen etter OV-U4 ikke skal vurdere.

**Kjernen (L).** Ingen kommando for forespørselen (`er_svar_paa_foresporsel` er alltid
`false`, [`kjerne/frosset/standpunkt.ts`](../../kjerne/frosset/standpunkt.ts) l. 408; BV-07). **Retting.** (a) S5, før #476 merges.

### KK-12: VS-U17 og VS-U18

**VS-U17** (#476 l. 2045): at BHs standpunkt om at begrunnelsen etter bokstav b ikke er et
svar, bare vises, er et produktvalg i tråd med MM-U12 og KA-U24 (appen vurderer ikke om en
begrunnelse er tilstrekkelig). Kontrakten gir ikke et mangelfullt svar svakere virkning
enn et sent. Vedtaket sier ikke at appen avgjør det, så det fremstiller ikke BHs standpunkt
som avgjørelse. «Registreres» må leses som et svar fra appen; et svar etter bokstav b sendt
utenfor appen følger OV-U4. (d), med en setning om det i #309.
**VS-U18:** forenlig med § 33.5 og MM-U12. (d). Codex' forslag til innhold i veiledningen
har støtte i § 33.5 første ledd («den samlede virkningen av tidligere varslede forhold») og
kan tas i #313.

**Gap i kjernen (L), kjent.** BH kan ikke påberope § 33.6.1 i dag: `spesifisert_krav_ok:
false` avvises ([`kjerne/frosset/standpunkt.ts`](../../kjerne/frosset/standpunkt.ts) l. 322–323; BV-06). Begge påberopelsene
samtidig (VS-U20 spørsmålet, VS-U4) kan derfor ikke uttrykkes ennå. (b) i #309.

---

## Spørsmål til oppdragsgiver

Hvert alternativ er prøvd mot 3.1 på `main` og mot OV-U3–OV-U7 og VS-U17–VS-U21 slik de
står på grenene.

### S1 (KK-01). Særskilt varsel om rigg og drift eller produktivitetstap etter vederlagskravet

Etter § 34.1.3 skal TE varsle særskilt «uten ugrunnet opphold etter at han blir eller burde
ha blitt klar over at utgifter ville påløpe». Det kan skje etter at kravet for selve
endringsarbeidet er sendt. Du svarte ja til at et varsel etter § 34.1.2 og § 34.1.3 avvises
fra appen når vederlagskravet er sendt, «som VS-U16 gjør for § 33.4». VS-U16 begrunnes med
at et senere varsel bare kan få senere dato enn kravet. For § 34.1.3 kan det senere varselet
være det første og rettidige. Hva skal gjelde?

- **A (anbefalt):** «Når TE har sendt vederlagskravet, avvises et nytt varsel etter § 34.1.2
  fra appen. Et særskilt varsel etter § 34.1.3 kan sendes fra appen også etter
  vederlagskravet, for rigg og drift og for produktivitetstap hver for seg, så lenge det ikke
  er sendt eller oppgitt et varsel om det samme fra før. Datoen for hvert av de to varslene
  settes én gang. Appen avgjør ikke når TE ble eller burde ha blitt klar over at utgiftene
  ville påløpe.»
  Forhold: snevrer inn OV-U5 (eller nytt svar på punkt 9 før merge); presiserer SK-12.
  Prøvd mot 3.1: SK-12 nevner «varslene om rigg/drift og produktivitetstap» i flertall og
  passer. VS-U16 gjelder § 33.4 og berøres ikke. OV-U3: når kravene er avgjort, avvises
  varselet fortsatt i et spor med krav, og opplysningen om datoen godtas. Ingen strid.
- **B:** «Når TE har sendt vederlagskravet, avvises et nytt varsel etter § 34.1.2 eller
  § 34.1.3 fra appen. Skjemaet sier at et særskilt varsel etter § 34.1.3 kan være påkrevd
  også etter kravet, at det da sendes utenfor appen, og at datoen kan oppgis i appen. Datoen
  settes én gang for rigg og drift og én gang for produktivitetstap.»
  Forhold: presiserer OV-U5 og SK-12. Prøvd mot 3.1: ingen strid.
- **C:** OV-U5 står uendret.
  Prøvd mot 3.1: ingen strid, men det er uavklart om «Datoen settes én gang» gir én dato for
  hele § 34.1.3 eller én per varsel.

Belegg: KK-01. Anbefaling A: den gir det dagens skjema gir, og fjerner en sperre uten
grunnlag. Avgjøres før #481 merges, senest før § 34.1 bygges.

### S2 (KK-03). Varseldatoen når fristkravet var det første varselet

TE kan oppgi at et krav sendt fra appen også ble sendt tidligere utenfor appen (OV-U5).
Byggherren får da den datoen som premiss for § 33.6.1, og for § 32.2 og § 34.1 når kravet
var det første varselet. § 33.4 er ikke nevnt. Er fristkravet det første varselet, viser
skjemaet byggherren datoen for brevet i appen. Hva skal gjelde?

- **A (anbefalt):** «Når fristkravet er det første varselet appen kjenner og TE har oppgitt at
  kravet ble sendt utenfor appen tidligere, tar byggherren også stilling til rettidigheten
  etter § 33.4 med den datoen som premiss. Skjemaet viser datoen TE oppgir, ved siden av
  datoen for brevet i appen. Opplysningen er ikke en registrering av et varsel etter § 33.4,
  og TE kan fortsatt oppgi datoen for et tidligere varsel.»
  Forhold: presiserer OV-U5. Prøvd mot 3.1: SK-12 og MM-U1 låser et registrert varsel, ikke
  et utledet; siste setning holder dem atskilt. VS-U16 berøres ikke. Ingen strid.
- **B:** «Opplysningen om kravets dato gjelder § 33.6.1. Skal datoen også gjelde § 33.4, oppgir
  TE den som datoen for varselet etter § 33.4, med samme dokument som vedlegg. Skjemaet for
  kravet sier det.»
  Forhold: presiserer OV-U5. Prøvd mot 3.1: varseldatoen låses etter SK-12. Ingen strid.

Belegg: KK-03. Anbefaling A: samme behandling som § 32.2 og § 34.1, og ett steg for TE.
Avgjøres før #481 merges.

### S3 (KK-05). Teksten når kravene er avgjort

Etter OV-U3 sier visningen «Alle fremsatte krav er avgjort», og de fremsatte kravene er
kravene TE har sendt. Et krav sendt på e-post er fremsatt etter kontrakten (§ 5), men er
dokumentasjon i appen (OV-U4). Saken kan da vise at alle fremsatte krav er avgjort mens et
fristkrav sendt på e-post er ubesvart. Hva skal visningen si?

- **A (anbefalt):** «Visningen sier «Alle krav sendt i appen er avgjort». Er det registrert
  brev i saken, sier den også «Saken har brev sendt utenfor appen. Appen vurderer ikke
  innholdet.»»
  Forhold: endrer visningsteksten i OV-U3. Prøvd mot 3.1: OV-U3 forbyr bare at visningen sier
  at saken er oppgjort; KA-U11 er alt endret av OV-U3; merknaden følger OV-U4. Ingen strid.
- **B:** «Visningen sier «Alle fremsatte krav er avgjort». Er det registrert brev i saken,
  sier den også «Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.»»
  Forhold: presiserer OV-U3. Prøvd mot 3.1: ingen strid.
- **C:** OV-U3 står uendret. Prøvd mot 3.1: ingen strid.

Belegg: KK-05, KK-06. Anbefaling A. Bør tas før #481 merges, kan vente til #313.

### S4 (KK-10). Registrerte brev som sier at TE var for sent

VS-U21 (12.10) sier at den som registrerer et brev fra byggherren, angir om brevet påberoper
§ 33.4, § 33.6.1 eller begge, og at brevet kan merkes. Dagen etter valgte du at registrerte
brev er dokumentasjon uten strukturert innhold (OV-U4), og at merking utsettes (OV-U7).
VS-U21 sier også «hvor mange dager byggherren mener TE måtte forstå»; etter § 33.6.1 er det
byggherren som «måtte forstå» hva TE hadde krav på. Hva skal gjelde?

- **A (anbefalt):** «I første versjon bygges ikke VS-U21: et brev fra byggherren sendt utenfor
  appen er dokumentasjon etter OV-U4. I et svar fra appen tar byggherren stilling til § 33.4
  og § 33.6.1 hver for seg. Når VS-U21 bygges, lyder delen om tall: «Sier brevet ikke hvor
  mange dager byggherren mener at byggherren måtte forstå at TE hadde krav på, registreres
  påberopelsen etter § 33.6.1 uten tall.»»
  Forhold: snevrer inn VS-U21 for første versjon, som OV-U7; retter ordlyden. Prøvd mot 3.1:
  følger OV-U4 og OV-U7; VS-U4 uendret. Ingen strid.
- **B:** VS-U21 tas ut av #476 og stilles på nytt når merking og strukturering bygges.
  Prøvd mot 3.1: ingen strid.
- **C:** VS-U21 føres som et unntak fra OV-U4, med rettet ordlyd.
  Prøvd mot 3.1: endrer OV-U4 (forkastet alternativ B) og OV-U7 (merking utsatt).

Belegg: KK-10. Anbefaling A. Avgjøres før #476 merges.

### S5 (KK-11). Forespørsel etter § 33.6.2 sendt utenfor appen

VS-U19 sier at en forespørsel sendt utenfor appen alltid registreres og vises med datoen,
og at virkningen utledes når byggherren påberoper at TE svarte for sent. Etter § 33.6.2
fjerde ledd kan byggherren ikke påberope § 33.6.1 når TE har svart med dager. Leser appen TEs
neste krav som svar på en registrert forespørsel, sperrer den byggherrens påberopelse ut fra
et brev appen etter OV-U4 ikke skal vurdere. Hva skal gjelde?

- **A:** «En forespørsel etter § 33.6.2 sendt utenfor appen er dokumentasjon etter OV-U4.
  Byggherren kan i et svar fra appen påberope at TE svarte for sent på den, med det registrerte
  brevet som henvisning; virkningen utledes på byggherrens premisser. Appen leser ikke TEs
  senere krav som svar på forespørselen og sperrer ikke byggherrens påberopelse etter
  § 33.6.1.»
  Forhold: presiserer VS-U19 og OV-U4. Prøvd mot 3.1: VS-U3 holder. HF-U1 nevner ikke et
  registrert dokument som noe et utsagn kan vise til, så representasjonen må avgjøres.
  Grensetilfelle mot «Appen utleder ingenting av det» i OV-U4.
- **B (anbefalt):** «I første versjon er en forespørsel etter § 33.6.2 sendt utenfor appen
  dokumentasjon etter OV-U4. Påberopelsen av at TE svarte for sent på den, sendes utenfor
  appen og registreres. Forespørselen fra appen følger VS-U19.»
  Forhold: snevrer inn VS-U19 for første versjon, som OV-U7. Prøvd mot 3.1: følger OV-U4 og
  OV-U7; VS-U3 gjelder forespørselen fra appen. Ingen strid.

Belegg: KK-11. Anbefaling B: følger retningen i OV-U4, og A kan komme med merkingen.
Avgjøres før #476 merges.

---

## Codex-anbefalinger uten belegg, eller med svakere belegg enn hevdet

- **#481 punkt 1:** at sperren «kan hindre nødvendig varsling». OV-U5 lar TE oppgi datoen
  for et varsel sendt utenfor appen «også etter et krav». Sperren tvinger varselet ut av
  appen; den hindrer det ikke. Resten har belegg (KK-01).
- **#481 punkt 2:** et nytt vedtak om at appdatoen gjelder handlingen i appen. VS-U3,
  VS-U9 («gjenoppliver ikke en tapt innsigelse»), VS-U10 og MM-U12 dekker det, og kjernen
  beregner ingen frister. Det som gjenstår, er visning (KK-02). At BHs eldre svar trenger
  samme datopremiss, har ikke belegg i første versjon: ingen utledning leser datoen for BHs svar.
- **#481 punkt 3:** en presisering av OV-U6. Vedtaket sier alt at godkjenningen er BHs
  valgte standpunkt, atskilt fra dokumentet, og at pris og tid «vurderes ikke». Det
  setter ingen avtale til side. Skjema og kontrollforløp holder (KK-04).
- **#476, VS-U19:** å knytte sperren til et spesifisert krav «fremfor ethvert dagtall eller
  anslag». Kjernen har ikke noe anslag: hvert fristkrav har dager over 0 (KA-U8) og brevet
  sier «(NS 8407 § 33.6.1)» (LV-U4 punkt 3). Å ta inn OV-U3 trengs ikke; OV-U3 godtar alt
  forespørselen i et spor uten krav.
- **#476, VS-U20:** å avgrense til «samme varslede forhold». En sak er ett forhold, og SK-12
  gir ett varsel per sak (KK-07). Presiseringen om § 39.2 er riktig om kontrakten, men VS-U20
  når ikke dit etter ordlyden (KK-09).
- **#476, VS-U17:** å presisere at det er et produktvalg. Riktig karakteristikk, men det
  endrer ikke noe i vedtaket (KK-12).

Med belegg: § 34.1.3-sperren som produktvalg på feil premiss (KK-01), ordlyden ved lukking
(KK-05), VS-U21 mot OV-U4 og OV-U7 og feilen i § 33.6.1 (KK-10), VS-U19 mot OV-U4 (KK-11),
og forløp 3 i #480, som avdekket at § 33.4 mangler i OV-U5 (KK-03).

## Rekkefølge

- **Før #481 merges:** S1 og S2. S3 bør tas samtidig, men kan vente til #313.
- **Før #476 merges:** S4 og S5. VS-U17, VS-U18 og VS-U20 kan merges som de står.
- **Kan vente til #309 (b):** KK-06, KK-07, KK-08 og gapet om § 33.6.1 i KK-12.
  Skjematekstene i KK-02 og KK-04 hører til #313.
- **#480 (c):** Codex' forløp 1–8, med presiseringene over. Forløp 2 med et eksternt svar fra
  BH, forløp 4 med en ny kravversjon (KK-07), og forløp 5 i begge varianter (KK-04).

## Verifikasjon og grenser

- **Kjørt og observert (K):** fire forløp mot kjernen på `main` 7032342 i minnet, gjennom
  `Kjoering` i [`kjerne/tester/kjoerer.ts`](../../kjerne/tester/kjoerer.ts): (1) kravet er varselet, ny kravversjon og et
  svar uten standpunkt om varselet (avvist), så et svar med standpunkt (`gjelder: K-f2`);
  (2) opplysning om et varsel etter svarene (uavklart, `godta:frist` borte); (3) bare
  vederlag sendt og godkjent («Under forhandling»); (4) alle spor godkjent, så varsel og nytt
  krav (`KRAVENE_AVGJORT`, «Avsluttet: oppgjort»). Skriptene lå i scratchpad og er slettet.
- **Lest (L):** resten. Kjernen ble lest i `forutsetninger.ts`, `kommando.ts`, `skriving.ts`,
  `utled.ts`, `visning.ts`, `frist.ts`, `standpunkt.ts` og `brevtekst.ts`.
- **Ikke kontrollert:** frontenden (`src/`, Python-epoken, erstattes i #313), testbasen,
  rettspraksis om § 34.1.3 og § 39.2. Om § 39.2 omfatter en innsigelse etter § 33.4 mot et
  fristkrav, er en tolkning som ikke er prøvd.
- Vurderingene av kontrakten er en arbeidshypotese til oppdragsgiver har tatt stilling.
