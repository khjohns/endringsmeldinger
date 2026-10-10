# Paragrafmatrisen for KOE-, endringsordre- og forseringssakene

**Formål.** Matrisen er arbeidsreferansen for å bygge ut TS-kjernen
([`kjerne/`](../kjerne/)) til hele domenet i KOE-, endringsordre- og
forseringssakene ([#309](https://github.com/khjohns/endringsmeldinger/issues/309),
[B-17](plans/2026-09-16-godkjenning-og-varig-levering.md#b-17)). For hver
bestemmelse i NS 8407 fører den:

- et kort ordrett utdrag;
- utsagnene: part, art og hva de gjelder (`gjelder`);
- predikatet som leses av utsagnene og relasjonene;
- det appen ikke avgjør;
- hva appen gjør med bestemmelsen (se «Tre måter» under);
- vedtakene i [hovedplanen, 3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger),
  med den merknaden som gjelder;
- hva kjernen har i dag, med fil og symbol.

**Hvordan den brukes.** Matrisen er levende. Hver byggedel av #309 oppdaterer
radene den bygger, i samme PR som koden. Forventet atferd per rad og
bevis-sakene står fortsatt i [domenetabellen](domenetabell/README.md), og
vedtakene står i hovedplanen. Matrisen gjentar dem ikke. Den viser til dem og
sier hvilken bestemmelse de hører til. Sier matrisen noe annet enn
hovedplanen, gjelder hovedplanen.

**Grunnlag.** Kartlagt 10.10 på `7460838`. Kjernens tilstand er lest i koden
(L), ikke kjørt, og `kjerne/` er uendret fram til `915ab32`. Utdragene er fra
NS 8407:2011. Vedtakene er lest i 3.1 på `915ab32`, med vedtakene fra runde 3. Begrepene utsagn, standpunkt, relasjon og predikat står i
[modellforslaget, 2.2](forslag-maalmodell-2026-10-09.md#22-byggeklossene) og i
[domenetabellen](domenetabell/README.md). Navnene i formatet står i
[designnotatet, 4.5](design-hendelsesformat-2026-10-09.md#45-navn-fra-kontrakten).

## Tre måter appen behandler en bestemmelse på

Måtene og hva de betyr, står i [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3), som også sier hvilke
bestemmelser som behandles på hvilken måte. Feltet «Appen» i hver rad viser til
det vedtaket.

| Måte | Eksempel |
| --- | --- |
| **Vurdere selv** | Om § 32.2 gjaldt for underkategorien ([GR-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u11), [GR-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u13)). Om byggherrens beløp er likt kravet («godkjent», B-13 og [KA-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u9)). § 33.6.2 fjerde ledd ([KA-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4)) |
| **Utlede** | Byggherren påberoper at varselet etter § 33.4 kom for sent (B-13 om preklusjon) |
| **Registrere og vise** | Passivitet og søksmålsfrist ([VS-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u2)). Innsigelse etter § 5 ([VS-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u1)) |

«Vurdere» er en vurdering etter appens regler, ikke en rettslig avgjørelse
([MM-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u12)).

## Status for kjernen

**Bygget** betyr at formatet, kommandoen og utledningen bærer utsagnet.
**Delvis** betyr at noe mangler, for eksempel at regelen finnes i
`kjerne/regler/`, men at kommandoen avviser verdien. **Ikke bygget** betyr at
verken formatet eller utledningen har det.

To trekk gjelder hele kjernen på `7460838`:

- Sakstypen er bare `standard` (KOE) ([`format.ts`](../kjerne/format.ts),
  `SAK_OPPRETTET`). Endringsordre- og forseringssaker finnes ikke.
- Frist- og vederlagsreglene i [`regler/frist.ts`](../kjerne/regler/frist.ts)
  og [`regler/vederlag.ts`](../kjerne/regler/vederlag.ts) er portert fra
  Python og har flere grener enn kjernen bruker. `regnUtSvar` i
  [`standpunkt.ts`](../kjerne/standpunkt.ts) låser inndataene: alltid fastpris,
  alltid spesifisert fristkrav, ingen rigg, produktivitet eller forespørsel.
  `utenforOmfanget` avviser resten med `VURDERING_UTENFOR_KJERNEN`
  ([#341](https://github.com/khjohns/endringsmeldinger/issues/341)).

## Første versjon av TS-stien

Hva første versjon omfatter, står i [OV-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u1). Tabellen fører
radene i matrisen etter det vedtaket. «Med» betyr at bestemmelsen hører til
første versjon. «Avvises» betyr at kommandoene avvises til den er bygget.

| Rad | Første versjon |
| --- | --- |
| § 32.1 og § 32.2, § 32.3 første ledd a–c, annet og tredje ledd, trekk og ny kravversjon | Med. En endringsordre som svar på grunnlaget følger [OV-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u2) |
| § 33.1, § 33.3, § 33.4, § 33.6.1, § 33.6.2 og § 33.7 | Med |
| § 33.8 | Avvises. Brev utenfor appen følger [OV-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u2) |
| § 34.1.1, § 34.1.2, § 34.1.3 og § 34.2 | Med |
| § 34.4 | Avgjøres i byggedelen for vederlag, når § 30 er lest (OV-U1, VS-U3) |
| § 34.3 | § 34.3.1 med. § 34.3.3 avvises |
| § 35.2 | Med |
| § 5 tredje ledd | Med |
| § 31.3, og endringsordre som svar på grunnlaget og etter frafall | Endringsordre som egen sak avvises. Brev utenfor appen og endringsordre som svar på grunnlaget følger [OV-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u2) |
| Kravversjon, aksept og enighet | Med, også for registrert korrespondanse |

Hvordan relasjoner mellom saker lagres (B-01 i 3.4), avgjøres i byggedelen for
endringsordre og forsering, etter [OV-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u1).

---

## § 32 Irregulær endring

### § 32.1 og § 32.2 — TEs varsel om endring og preklusjon

- **Utdrag:** § 32.2: «skal han uten ugrunnet opphold varsle byggherren dersom
  han vil påberope seg dette som en endring. Gjør han ikke det, taper han
  retten til å påberope seg at pålegget innebærer en endring.»
- **Utsagn:** TE: krav i grunnlagssporet (kategori, underkategori, beskrivelse),
  som kravversjon. BH: standpunkt `rettidighet` med hjemmel 32.2, `gjelder`
  grunnlagskravet, `i_tide` sann eller usann.
- **Predikat:** preklusjon er påberopt når BH har et standpunkt med `i_tide`
  usann og § 32.2 gjaldt for underkategorien da brevet ble sendt. Da er
  grunnlaget prinsipalt avslått, og et avslag i samme svar gjelder subsidiært.
- **Appen avgjør ikke:** om varselet faktisk kom «uten ugrunnet opphold», eller
  om forholdet er et pålegg etter § 32.1 a–c.
- **Appen:** *vurdere selv* om § 32.2 gjelder for underkategorien. *Utlede*
  virkningen av BHs standpunkt om rettidighet ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [GR-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u11)
  (09.10, uten merknad). B-13 om `grunnlag_varslet_i_tide` (24.09, merknaden
  05.10). Vedtakene 05.10 om svar når grunnlaget er avslått eller prekludert, og
  om avslag sammen med § 32.2. [GR-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u12),
  endret av GR-U13. [GR-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u13)
  (10.10): om § 32.2 gjaldt, fryses som appens vurdering, for registrerte brev
  endret av [MM-U17](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u17). [VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9): påberopelsen i svaret er
  innsigelsen etter § 5.
- **Kjernen i dag:** bygget. `rettidighet` med hjemmel `32.2`
  ([`typer.ts`](../kjerne/typer.ts), `Standpunkt`); `preklusjonPaaberopt` og
  `virkninger` i [`standpunkt.ts`](../kjerne/standpunkt.ts);
  `erEndringMedVarslingsplikt` i [`regler/grunnlag.ts`](../kjerne/regler/grunnlag.ts);
  frosset som `varslingsplikt` i beslutningsgrunnlaget. Delvis: kategoriene er
  fri tekst uten liste, og bare første underkategori leses
  (`foersteUnderkategori`). Kodene er [#335](https://github.com/khjohns/endringsmeldinger/issues/335).

### § 32.3 første ledd a–c — byggherrens svar

- **Utdrag:** «skal han besvare det ved enten å a) utstede endringsordre i
  henhold til 31.3, eller b) avslå totalentreprenørens krav på endringsordre,
  eller c) frafalle pålegget mot å utstede endringsordre for allerede utført
  arbeid.»
- **Utsagn:** BH: svar som `gjelder` grunnlagskravets gjeldende versjon, med
  standpunkt `grunnlag` (godkjent, avslått, frafalt). Revisjon `erstatter`
  forrige svar. TE: aksept som `gjelder` svaret.
- **Predikat:**
  - Enighet ved sammenfall: grunnlaget godkjent uten påberopt preklusjon.
  - Endringsordre etter § 32.3 a: sammenfall, § 32.2 gjaldt, og § 31.3 er
    oppfylt (ja, nei eller ikke avklart).
  - Frafall: avklart grunnlag uten enighet. TE kan ikke godta det, og BH kan
    revidere det.
  - Godtatt avslag: grunnlaget avvist, og saken lukket.
- **Appen avgjør ikke:** om et brev fra registrert korrespondanse oppfyller
  § 31.3. Det oppgir registratoren (GR-U13).
- **Appen:** *utlede* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)). For brev fra appen sørger appen
  for at § 31.3 er oppfylt (GR-U13).
- **Vedtak:** [GR-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u10),
  endret av [GR-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u13)
  (10.10). [GR-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u12),
  endret av GR-U13. [GR-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u9)
  (merknaden 09.10: til kravene er avgjort). [GR-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3)
  (merknaden 09.10). [GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7)
  (merknaden 10.10: forbehold avgjort av KA-U16; «avklart» etter MM-U13).
  [KA-U16](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u16): forbehold i svaret. [EO-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u6): endringsordre som svar på
  grunnlaget (raden for endringsordre som svar på grunnlaget).
  [GR-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u8).
  B-13 «frafalt» bare ved irregulær endring og valgrett (24.09, merknaden
  04.10). #235: frafall kan ikke kombineres med preklusjon (05.10). SK-01 og
  #213 (05.10). [MM-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u13)
  (merknaden 10.10: bygget).
- **Kjernen i dag:** bygget. `GRUNNLAGSRESULTATER` og `gyldigeResultater` i
  [`regler/grunnlag.ts`](../kjerne/regler/grunnlag.ts); `sammenfall` i
  beslutningsgrunnlaget; `endringsordre` i `Utledning` i
  [`utled.ts`](../kjerne/utled.ts) med opplysningen `endringsordre`;
  `FRAFALL_KAN_IKKE_GODTAS` og `GRUNNLAG_AVVIST` i
  [`forutsetninger.ts`](../kjerne/forutsetninger.ts). Ikke bygget: KA-U16 for
  et registrert brev med et forbehold appen ikke kan uttrykke. Kjent avvik: en lagret rad utenom kommandoene kan oppheve en
  enighet ([#326](https://github.com/khjohns/endringsmeldinger/issues/326)).

### § 32.3 annet ledd — passivitet

- **Utdrag:** «Dersom byggherren ikke uten ugrunnet opphold svarer i henhold
  til første ledd, anses pålegget å innebære en endring.»
- **Utsagn:** ingen fra BH. Opplysningen `mottatt` om TEs varsel gir datoen.
  TE kan påberope passiviteten (utsagnet er ikke i formatet).
- **Predikat:** ingen. Appen trekker ingen konklusjon.
- **Appen avgjør ikke:** om BH svarte i tide, og om pålegget dermed anses som
  en endring.
- **Appen:** *registrere og vise* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3), [VS-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u10)).
- **Vedtak:** [VS-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u2)
  (09.10, merknadene 10.10: VS-U3 og VS-U10). B-13 om passivitet (24.09,
  merknadene 09.10 og 10.10). [VS-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u10). [GR-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u11):
  passivitetsregelen følger henvisningen til § 32.2.
- **Kjernen i dag:** ikke bygget. [`visning.ts`](../kjerne/visning.ts) har
  etiketten `venter_paa_svar`, men ingen dato eller frist.

### § 32.3 tredje ledd — begrunnelse av avslag

- **Utdrag:** «Byggherren skal uten ugrunnet opphold etter at han har avslått
  kravet begrunne sitt avslag.»
- **Utsagn:** BH: begrunnelse som `gjelder` avslaget, i samme svar eller i et
  senere dokument.
- **Predikat:** ingen virkning på utfallet.
- **Appen avgjør ikke:** om begrunnelsen er tilstrekkelig, eller kom i tide.
- **Appen:** *registrere og vise* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)). Kravet til et brev fra
  appen og den senere begrunnelsen står i [KA-U18](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u18).
- **Vedtak:** [KA-U18](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u18). B-13 begrunnelsestekst (T-a, 24.09).
  [MM-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u12).
  [LV-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#lv-u1).
- **Kjernen i dag:** ikke bygget. Svaret har ikke noe felt for tekst (`SVAR`
  i [`format.ts`](../kjerne/format.ts) har `additionalProperties: false`). Bare
  den genererte `linje` i beslutningsgrunnlaget lagres.

### § 32 — trekk av grunnlaget og ny kravversjon

- **Utdrag:** ingen egen bestemmelse. Vedtakene bygger på § 31.3 annet ledd og
  § 34.2.2 første ledd.
- **Utsagn:** TE: `trekk` som `gjelder` gjeldende kravversjon. TE: ny kravversjon
  som `erstatter` forrige.
- **Predikat:**
  - Trekket av grunnlaget trekker alle krav i saken.
  - Det er sperret når godkjenningen er en endringsordre eller dette er ikke
    avklart, når TE har godtatt avslaget, og når kravene er avgjort.
  - En ny kravversjon åpner sporet, og svaret faller i tilstanden. Svar på
    vederlag og frist som var subsidiære, forblir det til sporet eller
    grunnlaget besvares igjen.
- **Appen avgjør ikke:** om pålegget, endringsordren eller utførelsesplikten
  består etter et trekk. Brev og visning sier ikke at de er bortfalt.
- **Appen:** *utlede.*
- **Vedtak:** [GR-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5)
  (merknaden 10.10: brevet sier tydelig at alle krav gis opp). [KA-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u13)
  (merknaden 10.10: presisert av KA-U14). [KA-U14](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u14).
  [GR-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1).
  [GR-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u2)
  (merknaden 09.10: «låst» er enighet). [GR-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4).
  SD-02 (05.10). B-13 endret underkategori (05.10).
- **Kjernen i dag:** bygget. `trekk` i `Utsagn`, `trekkAvGrunnlagetErSperret`
  i [`utled.ts`](../kjerne/utled.ts), `Krav.erstatter`. Delvis: svarene på
  vederlag og frist knyttes til grunnlagssvaret etter rekkefølgen i journalen
  (`tilNyttSvar` i `utled.ts`, [#342](https://github.com/khjohns/endringsmeldinger/issues/342)).
  Brevteksten for trekket er ikke bygget (#310).

---

## § 33 Fristforlengelse

### § 33.1 — fremdriftshindring

- **Utdrag:** «krav på fristforlengelse dersom fremdriften hindres som følge av
  a) endringer, […] b) forsinkelse eller svikt ved byggherrens ytelser […] eller
  c) andre forhold byggherren har risikoen for.»
- **Utsagn:** BH: standpunkt `hindring` (oppfylt eller ikke), `gjelder`
  fristkravet.
- **Predikat:** uten hindring er kravet prinsipalt avslått. Dagene BH har
  vurdert, står som et videre subsidiært standpunkt.
- **Appen avgjør ikke:** om fremdriften faktisk ble hindret.
- **Appen:** *utlede* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** B-13 om frist uten fremdriftshindring (05.10, merknaden 09.10: om
  en innsigelse kom i tide, avgjør ikke appen).
- **Kjernen i dag:** bygget. `hindring` i `STANDPUNKT` i
  [`format.ts`](../kjerne/format.ts); `virkninger` i
  [`standpunkt.ts`](../kjerne/standpunkt.ts).

### § 33.3 — force majeure

- **Utdrag:** «Partene har krav på fristforlengelse dersom fremdriften av deres
  forpliktelser hindres av forhold utenfor deres kontroll […]» Femte ledd:
  «Partene har ikke krav på justering av vederlaget som følge av
  fristforlengelse etter denne bestemmelsen.»
- **Utsagn:** TE: krav i grunnlagssporet med hovedkategorien force majeure, og
  krav i fristsporet. Varselet følger § 33.4, som viser til § 33.3.
- **Predikat:** ikke vedtatt. Ingen vedtak sier om et vederlagskrav i en sak om
  force majeure avvises (femte ledd).
- **Appen avgjør ikke:** om forholdet var utenfor partens kontroll, eller om
  parten burde ha tatt det i betraktning (tredje ledd).
- **Appen:** ikke vedtatt. [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3) sier at § 33.3 får en egen rad i
  matrisen, men ikke hvordan appen behandler den.
- **Vedtak:** [KA-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u13): trekket står i FORCE_MAJEURE.
- **Kjernen i dag:** ikke bygget. Hovedkategorien er fri tekst
  (`KRAVINNHOLD.grunnlag` i [`format.ts`](../kjerne/format.ts)), og ingen regel
  i kjernen skiller ut force majeure. Python har `er_force_majeure` i
  [`backend/constants/grunnlag_categories.py`](../backend/constants/grunnlag_categories.py),
  men ingen kaller den.

### § 33.4 — varsel om fristforlengelse

- **Utdrag:** «skal han varsle den andre parten uten ugrunnet opphold, selv om
  han ennå ikke kan fremsette et spesifisert krav […] Krav på fristforlengelse
  tapes dersom det ikke varsles innen utløpet av fristen.»
- **Utsagn:** TE: `varsel` med hjemmel 33.4, med opplysningen `sendt`. BH:
  `rettidighet` med hjemmel 33.4, som `gjelder` varselet, eller kravet når
  varselet er utledet av kravet. TE: «ingen krav» etter varselet.
- **Predikat:**
  - Preklusjon påberopt: BHs standpunkt med `i_tide` usann.
  - Registreres varselet etter at BH har påberopt preklusjon for det utledede
    varselet, er preklusjonen uavklart. TE kan ikke godta svaret før BH har
    svart på nytt.
  - Datoen settes én gang.
- **Appen avgjør ikke:** om varselet kom i tide, eller om det ble sendt eller
  mottatt. Det kan bestrides.
- **Appen:** *utlede* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** B-13 om preklusjon ut fra byggherrens egen vurdering (24.09).
  [MM-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1).
  [MM-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u8) (merknaden
  09.10: presiserer MM-U1, ikke MM-U4). SK-12 (05.10).
  [MM-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u7) (merknaden
  10.10: avvises når saken ikke er forstått). [KA-U15](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u15)
  og [KA-U17](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u17): «ingen krav». [VS-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u8): datoen for et varsel.
  [VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9): påberopelsen i svaret er innsigelsen etter § 5.
  [KA-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2): varselet er
  ikke en kravversjon.
- **Kjernen i dag:** bygget for varselet. `varsel` i `UTSAGN` og `sendt` i
  `OPPLYSNING` ([`format.ts`](../kjerne/format.ts)); `STANDPUNKT_UAVKLART` og
  `VARSEL_REGISTRERT` i [`forutsetninger.ts`](../kjerne/forutsetninger.ts).
  Delvis: `varsel_type` er låst til spesifisert krav, og
  `har_tidligere_varsel_i_tide` er alltid usann i `regnUtSvar`. «Ingen krav»
  leses (`ingen_krav`), men har ingen kommando.

### § 33.6.1 — spesifisert krav

- **Utdrag:** «skal han uten ugrunnet opphold angi og begrunne det antall dager
  han krever […] Gjør han ikke dette, har han bare krav på slik
  fristforlengelse som den andre parten måtte forstå at han hadde krav på.»
- **Utsagn:** TE: krav med dager (minst 1). BH: standpunkt om rettidigheten av
  spesifiseringen, med hjemmel 33.6.1, og standpunktet `dager`.
- **Predikat:** etter [VS-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u4): et prinsipalt og et subsidiært
  standpunkt om dagene.
- **Appen avgjør ikke:** hvor mange dager BH «måtte forstå», og om
  spesifiseringen kom i tide.
- **Appen:** *utlede* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [VS-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u4). [VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9): påberopelsen er innsigelsen
  etter § 5. [KA-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u8)
  (merknaden 09.10: presisert av KA-U12). [KA-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4)
  (merknaden 08.10). [MP-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u4)
  og [MP-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u5) (gjelder
  metodeprøven): påberopelsen er en innsigelse etter § 5, atskilt fra
  innsigelsen mot omfanget.
- **Kjernen i dag:** delvis. `beregnReduksjon` i
  [`regler/frist.ts`](../kjerne/regler/frist.ts) finnes og gir, som Python,
  bare en grunn og ett tall. `spesifisert_krav_ok` usann avvises (`utenforOmfanget`, #341). Ingen
  standpunktart for spesifiseringen. Dagene har ikke eget felt i
  standpunktet. De leses fra `utregning`, med `utregning.resultat` som reserve
  i `leser.ts` (rettelsen 10.10 i #309).

### § 33.6.2 — byggherrens forespørsel og TEs svar

- **Utdrag:** «kan byggherren be om at totalentreprenøren gjør dette.
  Byggherrens forespørsel skal sendes per brev, gi beskjed om at manglende svar
  fører til at kravet om fristforlengelse tapes […]» Annet ledd: TE skal «enten
  a) angi og begrunne det antall dager […] eller b) begrunne hvorfor grunnlaget
  for å beregne kravet ikke foreligger.» Tredje ledd: «Gjør ikke
  totalentreprenøren noen av delene, tapes kravet.» Fjerde ledd: «Byggherren kan
  da ikke påberope at fristen i 33.6.1 er oversittet.»
- **Utsagn:** BH: `foresporsel` som `gjelder` varselet eller fristsporet, med
  valgfri svarfrist. TE: svar etter bokstav a (et krav med dager, som
  `gjelder` forespørselen) eller bokstav b (en begrunnelse, uten dager).
- **Predikat:**
  - Har TE svart med dager på forespørselen, gjelder ikke spørsmålet etter
    § 33.6.1, og en påberopelse avvises (KA-U4).
  - Påberoper BH uttrykkelig at TE svarte for sent, utledes virkningen etter
    [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3). Svarer ikke TE, vises det bare.
  - Forespørselen gir ellers ingen virkning av seg selv.
- **Appen avgjør ikke:** om TE svarte i tide, og om kravet er tapt (tredje
  ledd).
- **Appen:** for tredje ledd *utlede* når BH påberoper at TE svarte for sent,
  ellers *registrere og vise*. *Vurdere selv* for fjerde ledd ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3) og [VS-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u2)
  (§ 33.6.2 tredje ledd). [KA-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4)
  og rad KA-18a i [domenetabellen](domenetabell/README.md) (fjerde ledd). Nøytralt fristvarsel, TFR-06 og DRF-01 (23.09,
  merknaden 04.10: svarfristen er valgfri og går utenom intern godkjenning).
  [MP-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u4) (gjelder
  metodeprøven). [VS-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u1):
  en innsigelse kan gjelde et svar etter bokstav b.
- **Kjernen i dag:** ikke bygget. Regelen har `er_svar_paa_foresporsel` og
  `foresporsel_svar_ok` i [`regler/frist.ts`](../kjerne/regler/frist.ts), men
  kjernen setter dem alltid usann, og usann `foresporsel_svar_ok` avvises.
  Python avviser påberopelsen etter fjerde ledd (`kontroller` i
  [`backend/regler/frist.py`](../backend/regler/frist.py)).
  Ingen utsagnsart. Feltene fra DRF-02 og SD-04 (#64, #76) og `begrunnelse_utsatt`
  uten dager (#237) hører hit.

### § 33.7 — svarplikt

- **Utdrag:** «skal svare uten ugrunnet opphold etter å ha mottatt et begrunnet
  krav med angivelse av antallet dager […] Innsigelser mot kravet tapes dersom
  de ikke fremsettes innen fristen.»
- **Utsagn:** BH: svar med `dager`, `hindring` og `rettidighet`. TE: innsigelse
  etter § 5 om at svaret kom for sent.
- **Predikat:** et svar med dager avvises til TE har spesifisert kravet. At
  innsigelser tapes, gir ingen predikat.
- **Appen avgjør ikke:** om svaret kom i tide, og om en innsigelse er tapt.
- **Appen:** *registrere og vise* for annet ledd ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3), [VS-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u10)).
  *Utlede* for standpunktene i svaret.
- **Vedtak:** [VS-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u2).
  Nøytralt fristvarsel (23.09). B-13 om frist uten fremdriftshindring (merknaden
  09.10). B-13 «godkjent» bare ved hele kravet (24.09, merknaden 04.10).
  [VS-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u1): TEs innsigelse mot et sent svar. [MP-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u5) og
  [MP-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u6) (gjelder
  metodeprøven).
- **Kjernen i dag:** bygget for svaret med dager og de subsidiære dagene
  (`UTREGNING.frist`, `beregnFrist`). Ikke bygget: frist og passivitet i
  visningen.

### § 33.8 — forsering ved uberettiget avslag

- **Utdrag:** «Hvis byggherren helt eller delvis avslår et berettiget krav på
  fristforlengelse, kan totalentreprenøren velge å anse avslaget som et pålegg
  om forsering gitt ved endringsordre.» Valgretten bortfaller hvis vederlaget
  for forseringen «må antas å ville overstige den dagmulkten som ville ha
  påløpt […] tillagt 30 %». Annet ledd: «Før forsering etter første ledd
  iverksettes, skal byggherren varsles med angivelse av hva forseringen antas å
  ville koste.»
- **Utsagn:**
  - TE, etter [FO-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u2): valget og varselet med antatt kostnad, i en
    forseringssak som `gjelder` BHs svar i fristsporet i KOE-saken; oppdatert
    kostnad og stopp; vederlagskrav for forseringen.
  - BH, etter [FO-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u3) og [FO-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u4): svar på forseringsvarselet,
    revidert fristsvar i KOE-saken og svar på vederlagskravet.
- **Predikat:** TE har valgrett når BH prinsipalt har avslått fristkravet helt
  eller delvis, også gjennom grunnlaget eller ved preklusjon, og TE ikke har
  godtatt avslaget. Valgretten gjelder de avslåtte dagene.
  TEs aksept av avslaget avvises etter [FO-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u5).
- **Appen avgjør ikke:** om kravet var berettiget, og om 30 %-grensen er
  overskredet.
- **Appen:** *utlede* valgretten. *Registrere og vise* 30 %-grensen
  ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3), [FO-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u3)).
- **Vedtak:** [FO-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u1)
  (merknaden 10.10: presisert av FO-U5). [FO-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u2)–[FO-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#fo-u6).
  TFR-02 (23.09): forsering får aldri en lukket samlet status. «Forsering er
  utenfor godkjenningsflyten» (18.09, merknaden 10.10: endret av FO-U6).
  [OV-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u2): første versjon.
  [B-17](plans/2026-09-16-godkjenning-og-varig-levering.md#b-17)
  (merknaden 09.10: forsering går til TS).
- **Kjernen i dag:** ikke bygget. Ingen sakstype, regel eller utsagn. Strengen
  `forseringsrett_avslatt` i `SUBSIDIAERE_UTLOSERE`
  ([`regler/typer.ts`](../kjerne/regler/typer.ts)) er arvet og ubrukt.

---

## § 34 Vederlagsjustering

§ 34 og § 35 leses i sin helhet før vederlagsdelen bygges (#309). Det gjelder
også § 30 om regningsarbeid, som § 34.4 viser til.

### § 34.1.1 — vederlag ved endring

- **Utdrag:** «Partene har krav på justering av vederlaget dersom det foreligger
  en endring etter punkt 31 eller 32.»
- **Utsagn:** TE: vederlagskrav (metode og beløp) som kravversjon. BH: svar med
  standpunktet `beloep`. Grunnlaget avgjør om svaret er prinsipalt eller
  subsidiært.
- **Predikat:** «godkjent» når beløpene er like til nærmeste krone, «delvis»
  når BHs beløp er mindre gunstig for TE. Svaret er subsidiært når grunnlaget
  er avslått eller prekludert.
- **Appen avgjør ikke:** om forholdet er en endring.
- **Appen:** *vurdere selv* sammenlikningen av beløpene ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)). *Utlede*
  subsidiariteten.
- **Vedtak:** [KA-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u9).
  [KA-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u8). B-13 hovedvalg
  og «godkjent» (24.09, merknadene 04.10). B-13 om svar når grunnlaget er
  avslått (05.10). [GR-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4).
- **Kjernen i dag:** delvis. Ett hovedkrav med `FASTPRIS_TILBUD` og beløp over
  0 (`KRAVINNHOLD.vederlag` i [`format.ts`](../kjerne/format.ts)). Fortegn
  (fradrag) kan ikke uttrykkes, selv om [`regler/beloep.ts`](../kjerne/regler/beloep.ts)
  håndterer det. Standpunktet `beloep` har ikke eget felt; det leses fra
  `utregning`. Regelsettets kopier `grunnlag_resultat` og
  `grunnlag_varslet_i_tide` står i `KJENTE_AVVIK` i
  [`tester/arkitektur.test.ts`](../kjerne/tester/arkitektur.test.ts).

### § 34.1.2 — svikt i byggherrens ytelser og andre forhold

- **Utdrag:** «skal han uten ugrunnet opphold varsle byggherren når han blir
  eller burde ha blitt klar over forholdene […] Krav på vederlagsjustering
  tapes dersom det ikke varsles innen fristen.»
- **Utsagn:** TE: `varsel` med hjemmel 34.1.2 og datoen etter [VS-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u6) og
  [VS-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u8). BH: `rettidighet` med hjemmel 34.1.2.
- **Predikat:** preklusjon påberopt gir prinsipalt avslag med subsidiært beløp.
  Et varsel registrert etter svaret følger [VS-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u7).
- **Appen avgjør ikke:** når TE ble eller burde ha blitt klar over forholdet.
- **Appen:** *utlede* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** B-13 om preklusjon ut fra byggherrens egen vurdering (24.09,
  nevner § 34.1.2). [VS-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u6) (utvider SK-12). [VS-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u7) (utvider
  MM-U1 og MM-U8). [VS-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u8) (endrer DRF-03 for registrerte brev).
  [VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9).
- **Kjernen i dag:** delvis. `gjelderVarslingspliktenForVederlag` og
  `beregnPreklusjon` i [`regler/vederlag.ts`](../kjerne/regler/vederlag.ts).
  `hovedkrav_varslet_i_tide` er påkrevd for SVIKT og ANDRE, men usann avvises,
  og sann lagres ikke (#341).

### § 34.1.3 — særskilt varsel om rigg og drift og nedsatt produktivitet

- **Utdrag:** «må han varsle byggherren særskilt uten ugrunnet opphold etter at
  han blir eller burde ha blitt klar over at utgifter ville påløpe. Gir han
  ikke slikt varsel, taper han retten til å påberope seg påløpte utgifter som
  grunnlag for krav på vederlagsjustering.»
- **Utsagn:** TE: `varsel` med hjemmel 34.1.3 (rigg og drift, produktivitet),
  med opplysningen `sendt`. TE: særskilt krav (beløp per post). BH:
  `rettidighet` med hjemmel 34.1.3 og `beloep` per post.
- **Predikat:** påberopt sent varsel etter [VS-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u5): et prinsipalt og et
  subsidiært beløp. Datoen for et registrert varsel settes én gang (SK-12). Et
  varsel registrert etter svaret følger [VS-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u7).
- **Appen avgjør ikke:** hvilke utgifter som var påløpt før varselet.
- **Appen:** *utlede* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [VS-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u5) (endrer B-13 om preklusjon for § 34.1.3).
  SK-12 (05.10). [MM-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1),
  utvidet til § 34.1 av [VS-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u7). [VS-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u8). [VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9).
- **Kjernen i dag:** ikke bygget. Reglene for `rigg_*` og `produktivitet_*`
  finnes i [`regler/vederlag.ts`](../kjerne/regler/vederlag.ts), men
  `regnUtSvar` setter dem til `null`, og en vurdering avvises. Varselet etter
  § 34.1.3 fra #264 og feltene i SK-11 (#262) hører hit.

### § 34.2.1 og § 34.2.2 — tilbud og aksept av tilbud

- **Utdrag:** § 34.2.1: «Totalentreprenøren kan gi eller byggherren kan kreve at
  totalentreprenøren gir et spesifisert tilbud […] Byggherren skal ta stilling
  til tilbudet innen rimelig tid.» § 34.2.2: «Justering av vederlaget skal skje
  etter bestemmelsene i 34.3 og 34.4, med mindre byggherren har akseptert et
  tilbud fra totalentreprenøren om slik justering.»
- **Utsagn:** TE: vederlagskrav med metoden tilbud. BH: standpunkt til metoden
  (godtar eller avslår tilbudet som metode) og `beloep`. BH: forespørsel om
  tilbud (ikke i formatet).
- **Predikat:**
  - BH godkjenner hele tilbudet: enighet ved sammenfall. Et akseptert tilbud er
    avtalt vederlag.
  - BH avslår metoden: vederlaget justeres etter § 34.3 eller § 34.4.
- **Appen avgjør ikke:** om BH tok stilling «innen rimelig tid».
- **Appen:** *utlede* for § 34.2.2. *Registrere og vise* for § 34.2.1
  ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3). [KA-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u7)
  (merknaden 09.10). [GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7)
  om sammenfall. [KA-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u10)
  (merknaden 09.10: § 34.2.2 bærer ikke vedtaket alene).
- **Kjernen i dag:** delvis. `FASTPRIS_TILBUD` er eneste metode. `aksepterer_metode`
  er påkrevd, men usann avvises, og sann lagres ikke (#341).

### § 34.3 — enhetspriser og justerte enhetspriser

- **Utdrag:** § 34.3.1: «Gjelder kravet om vederlagsjustering forhold der
  kontraktens enhetspriser er anvendelige, skal disse benyttes.» § 34.3.3:
  «Unnlater han dette, har han bare krav på slik justering av enhetsprisen som
  den andre parten måtte forstå […] Dersom det ikke svares innen fristen,
  mister parten sine innsigelser mot kravet.»
- **Utsagn:** TE: vederlagskrav med metoden enhetspriser, eventuelt krav om
  justerte enhetspriser. Kravet om justering er varselet etter § 34.3.3, med
  datoen etter DRF-03 og [VS-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u8). BH: `rettidighet` med hjemmel 34.3.3 og
  `beloep`.
- **Predikat:** for første ledd etter [VS-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u4), som § 33.6.1. Annet ledd
  gir ingen predikat.
- **Appen avgjør ikke:** hva BH «måtte forstå», om svaret kom i tide, og om
  innsigelsene er tapt.
- **Appen:** *utlede* for første ledd. *Registrere og vise* for annet ledd
  ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [VS-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u4). DRF-03 (29.09, merknaden 10.10: endret av VS-U8).
  [VS-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u2)
  (§ 34.3.3 annet ledd).
- **Kjernen i dag:** ikke bygget. Metoden kan ikke kreves, og `krever_justert_ep`
  er alltid usann. Regelen `reduksjon_ep_justering` finnes i
  [`regler/vederlag.ts`](../kjerne/regler/vederlag.ts). `ep_justering_varslet_i_tide`
  fra DRF-02 (#64) og `ep_justering_akseptert` fra SK-11 (#262) hører hit.

### § 34.4 — regningsarbeid og fradrag

- **Utdrag:** «Hvis det ikke foreligger anvendelige enhetspriser, skal
  vederlagsjusteringen skje i samsvar med bestemmelsene om regningsarbeid i
  punkt 30. Byggherren skal varsles før regningsarbeidet igangsettes.» Annet
  ledd: «For fradrag skal det gjøres en reduksjon i vederlaget som tilsvarer den
  besparelsen fradraget har ført til […]»
- **Utsagn:** TE: vederlagskrav med metoden regningsarbeid og
  kostnadsoverslag, eventuelt med negativt beløp (fradrag). TE: varsel før
  igangsetting. BH: `beloep`, eventuelt tilbakeholdelse (§ 30.2).
- **Predikat:** standpunktet om beløp er et beløp med fortegn som ikke kan være
  gunstigere for TE enn kravet.
- **Appen avgjør ikke:** besparelsen ved et fradrag, og om regningsarbeidet ble
  varslet i tide.
- **Appen:** *vurdere selv* sammenlikningen med fortegn. Resten avgjøres når
  § 30 er lest ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [KA-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u9).
  [KA-U14](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u14): kan
  snevre inn KA-U6 der enigheten gir BH en rettighet, for eksempel et fradrag.
- **Kjernen i dag:** ikke bygget. Formatet krever beløp over 0, og
  `hold_tilbake` avvises. `kanHoldeTilbake` finnes i
  [`regler/vederlag.ts`](../kjerne/regler/vederlag.ts).

---

## § 35 Uenighet

### § 35.2 — totalentreprenørens søksmål

- **Utdrag:** TE må «a) kreve spørsmålet avgjort av en oppmann etter 50.3, før
  overtakelsen, eller b) ta de nødvendige skritt for å iverksette ordinær
  rettergang eller voldgift […] senest åtte måneder etter overtakelsen av hele
  kontraktsgjenstanden».
- **Utsagn:** ingen. Fristen regnes fra overtakelsen, som saken ikke kjenner.
- **Predikat:** ingen.
- **Appen avgjør ikke:** om fristen er overholdt, eller om kravet er tapt.
- **Appen:** *registrere og vise* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3). [VS-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u2).
- **Kjernen i dag:** ikke bygget.

§ 35.1 (utførelsesplikt ved uenighet) er ikke i #309. KA-U14 sier at brev og
visning ikke fremstiller et trekk som at utførelsesplikten er bortfalt.

---

## § 5 Varsler og krav

### § 5 tredje ledd — innsigelse mot sent varsel eller svar

- **Utdrag:** «Hvis en part ønsker å gjøre gjeldende at den andre parten har
  varslet eller svart for sent, må han gjøre det skriftlig uten ugrunnet
  opphold etter å ha mottatt varsel eller svar. Gjør han ikke det, skal
  varselet eller svaret anses for å være gitt i tide.»
- **Utsagn:** begge parter: `innsigelse` med sendetid, som `gjelder` et varsel,
  et krav eller et svar fra motparten. Motparten: protest som `gjelder`
  innsigelsen.
- **Predikat:** ingen. BHs påberopelse i et svar er innsigelsen etter § 5
  ([VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9)).
- **Appen avgjør ikke:** om innsigelsen kom i tide, og dermed om varselet eller
  svaret anses gitt i tide.
- **Appen:** *registrere og vise* ([VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3), [VS-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u10)).
- **Vedtak:** [VS-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u1)
  (merknaden 10.10: presisert og utvidet av VS-U9). [VS-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u9). [VS-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u10).
  [MP-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u4)–[MP-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u7)
  (gjelder metodeprøven; MP-U6 tas inn i appen av VS-U9). Nøytralt fristvarsel,
  TFR-06 (23.09).
- **Kjernen i dag:** ikke bygget. `bestridelse` gjelder bare opplysninger om
  sending, mottak og endringsordre (MM-U7). `har_innsigelse_mot_varsel` i
  [`regler/frist.ts`](../kjerne/regler/frist.ts) er alltid usann.

---

## § 31.3 Endringsordre og endringsordresaken

### § 31.3 — endringsordren

- **Utdrag:** «En endringsordre skal være skriftlig og gi beskjed om at det
  kreves en endring, samt hva endringen går ut på. Endringsordren må være gitt
  av byggherrens representant […] eller av en person med skriftlig fullmakt til
  å utstede slike. Når totalentreprenøren mottar endringsordre i
  overensstemmelse med foregående ledd, blir han forpliktet til å utføre
  endringsarbeidet.»
- **Utsagn:** BH: endringsordre i en EO-sak (utstedt, deretter revidert), med
  pålegget og egne utsagn om pris og tid ([EO-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u8)). TE: aksept eller
  bestridelse av hver utgave, og av hvert utsagn for seg (EO-U8). BH: hvilke KOE-saker endringsordren
  omfatter, før utstedelse.
- **Predikat:**
  - En KOE-sak kan inngå i en endringsordre når grunnlaget er godkjent, minst
    ett av vederlag og frist har enighet, og ingen spor TE fortsatt kan sende,
    står åpent.
  - En KOE-sak inngår i høyst én endringsordre.
  - BH reviderer bare en bestridt endringsordre (EO-U4), og ikke en
    endringsordre som er svar på grunnlaget ([EO-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u9)). En akseptert
    endringsordre er endelig.
- **Appen avgjør ikke:** om en endring er innenfor § 31.1 (sammenheng med
  kontrakten, 15 %-grensen).
- **Appen:** *utlede.* For brev fra appen sørger appen for § 31.3 (fullmakt i
  godkjenningsflyten, GFK-06).
- **Vedtak:** [EO-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u1).
  [EO-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2) (merknaden
  09.10: presisert av EO-U5). [EO-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u3).
  [EO-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) (merknaden
  10.10: presisert av EO-U8, endret av EO-U9).
  [EO-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u5). [EO-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u8).
  [EO-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u9). TFR-02
  (23.09). Vedtaket 29.09 om at en EO-sak kan følge av en KOE-sak, men ikke
  erstatte den. B-02 punkt 3 (23.09). GFK-06 (23.09 og 24.09).
  [GR-U13](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u13).
- **Kjernen i dag:** delvis. Kandidatkontrollen finnes som predikat
  (`kanInngaaIEo` i [`utled.ts`](../kjerne/utled.ts)), men kalles ikke av
  kjernen. Ikke bygget: EO-saken, livsløpet og tilknytningen mellom saker.

### Endringsordre som svar på grunnlaget og etter frafall

- **Utdrag:** § 32.3 a: «utstede endringsordre i henhold til 31.3». § 32.3 c:
  «mot å utstede endringsordre for allerede utført arbeid».
- **Utsagn:** BH: endringsordre i en EO-sak som *viser til* KOE-saken, som svar
  på grunnlaget når BH ikke har svart (KA-U12), med grunnlagssvaret i KOE-saken
  etter [EO-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u6). Det er ikke det samme som at KOE-saken *inngår* i
  endringsordren ([EO-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u7)). BH: endringsordre for utført arbeid etter
  frafall, i en egen EO-sak (GR-U3).
- **Predikat:** etter [EO-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u6), [EO-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u7) og [EO-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u9).
- **Appen avgjør ikke:** om endringsordren dekker det utførte arbeidet.
- **Appen:** *utlede* (§ 32.3 første ledd a og c, [VS-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#vs-u3)).
- **Vedtak:** [OV-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ov-u2): første versjon. [EO-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u6) (endrer vedtaket 23.09 om ubegrenset fullmakt for
  dette tilfellet). [EO-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u7). [EO-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u9).
  [KA-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u12)
  (merknadene 10.10: KA-U15, KA-U17, GR-U13 og EO-U6).
  [KA-U14](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u14).
  [GR-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3).
  [EO-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u3)–[EO-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u5).
  [EO-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u1) og vedtaket
  29.09: en endringsordrehendelse avvises i KOE-saken, så raden i KOE-saken kan
  bare være et grunnlagssvar. Lagringen av relasjoner mellom saker er B-01 i
  3.4 (se «Første versjon av TS-stien»).
- **Kjernen i dag:** ikke bygget.

---

## Kravversjon, aksept og enighet

- **Utsagn:** TE: krav med `erstatter`, `aksept` som `gjelder` ett svar med
  regelversjonen TE fikk se, `trekk`, «ingen krav» i et spor som ikke er sendt.
  BH: svar med `erstatter` ved revisjon, og beslutningsgrunnlaget med
  standpunktene og sammenfallet.
- **Predikat:**
  - Enighet ved aksept eller sammenfall. Den er betinget til grunnlaget er
    avklart, og deretter virksom.
  - En ny kravversjon i et spor med enighet avvises.
  - Kravene er avgjort når grunnlaget er avklart, hvert spor er trukket eller
    har en virksom enighet, og ingen spor kan sendes.
  - Et sendt brev beholder virkningen det hadde da det ble sendt. Utfallet
    utledes av de frosne standpunktene.
  - Et registrert brev med noe appen ikke kan uttrykke, sperrer bindende
    handlinger som bygger på det ([KA-U16](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u16)).
  - En regelendring og registrert korrespondanse følger [B-10](plans/2026-09-16-godkjenning-og-varig-levering.md#b-10),
    [MM-U16](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u16) og [MM-U17](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u17).
- **Appen avgjør ikke:** hva parten mener med et forbehold. Hva «ingen krav»
  gir avkall på, står i [KA-U17](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u17). Om et senere krav er avskåret, avgjør appen
  ikke.
- **Appen:** *utlede.*
- **Vedtak:**
  - [KA-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) (merknaden 09.10);
  - [KA-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2);
  - [KA-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u3) (merknaden 09.10);
  - [KA-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5) (merknaden 08.10);
  - [KA-U6](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u6) (merknaden 10.10: KA-U14);
  - [KA-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u7) (merknaden 09.10: KA-U13);
  - [KA-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u10) (merknaden 09.10: MM-U11);
  - [KA-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u11);
  - [KA-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u12) og [KA-U15](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u15) (merknadene 10.10: KA-U16 og KA-U17);
  - [KA-U16](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u16) og [KA-U17](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u17);
  - [GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7) (merknaden 10.10: KA-U16);
  - [GR-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u8) og [GR-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u10), endret av GR-U13;
  - [MM-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u3) (merknaden 09.10: KA-U10);
  - [MM-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u9), som opphever MM-U4–MM-U6 (merknadene 10.10: MM-U12 og MM-U17);
  - [MM-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u11) (merknadene 10.10: GR-U12, HF-U2 og MM-U12);
  - [MM-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u2) (merknaden 10.10) og [MM-U14](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u14);
  - [HF-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u1) og [HF-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u2);
  - [B-10](plans/2026-09-16-godkjenning-og-varig-levering.md#b-10) med [MM-U15](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u15)–[MM-U17](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u17).
- **Kjernen i dag:** bygget for aksept, sammenfall, betinget og virksom enighet,
  «avklart», trekk, revisjon, kravene avgjort og saker som ikke er forstått
  (`Enighet`, `enighetensVirkning`, `kraveneErAvgjort` i
  [`utled.ts`](../kjerne/utled.ts); `lesJournal` i [`leser.ts`](../kjerne/leser.ts)).
  «Ingen krav» leses, men har ingen kommando. Ikke bygget: KA-U16 for et
  registrert brev appen ikke kan uttrykke, B-10 utover versjonene i formatet
  ([#316](https://github.com/khjohns/endringsmeldinger/issues/316)), og kontrollen av at en lagret rad ikke bryter et vedtak om enighet (#326).

---

## Hvor oppfølgingen hører til

| Issue eller punkt | Bestemmelse |
| --- | --- |
| [#341](https://github.com/khjohns/endringsmeldinger/issues/341): vurderingene som godtas, men ikke lagres | `spesifisert_krav_ok`: § 33.6.1. `aksepterer_metode`: § 34.2.2. `hovedkrav_varslet_i_tide`: § 34.1.2 |
| [#342](https://github.com/khjohns/endringsmeldinger/issues/342): subsidiariteten etter rekkefølgen | § 32, trekk og ny kravversjon (GR-U1, GR-U4) |
| [#326](https://github.com/khjohns/endringsmeldinger/issues/326): en lagret rad som bryter et vedtak | Kravversjon, aksept og enighet |
| Grunnlagsfeltene i regelsettet (tillegget 10.10 i #309) | `Fristkrav`: § 33.7. `Vederlagskrav` og `GrunnlagForStandpunkt`: § 34.1 |
| Standpunktene `beloep` og `dager` uten egne felt (rettelsen 10.10 i #309) | § 33.6.1 og § 33.7, § 34.1.1 |
| Kodene ([#335](https://github.com/khjohns/endringsmeldinger/issues/335)) | § 32.1 og § 32.2 (kategoriene), § 34.2 (metodene), resultatverdiene |
| DRF-02 (#64), SD-04 (#76), #237 | § 33.6.2, § 34.3.3, § 32.3 annet ledd |
| SD-02 (#231), GR-17 (#235), KA-14, DT-02, GR-04 og GR-05 (#256) | § 32, trekk og ny kravversjon; § 32.3 c |
| SK-11 (#262), SK-12 for § 34.1.3 (#264) | § 34.1.3, § 34.2, § 34.3 |
