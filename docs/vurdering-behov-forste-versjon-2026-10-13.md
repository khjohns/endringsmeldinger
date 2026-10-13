# Vurdering: behovet i første versjon av TS-kjernen

**Dato:** 13.10. **Kontrollert commit:** `44bbb49`.
**Spørsmål fra oppdragsgiver:** er vedtakene og reglene i TS-kjernen mer kompliserte enn første
versjon trenger, sammenliknet med det dagens skjemaer gir brukerne? Kartleggingen viser behovet
før noe kuttes.

Dokumentet er et beslutningsgrunnlag. Det endrer ingen vedtak. Vedtakene står i
[hovedplanen, 3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger).
Appen er ikke i produksjon og har ingen reelle data.

## Grunnlag

- **Premissene** er oppdragsgivers svar 13.10 etter en sparring med to modeller. De står i
  [premisser.md](vedlegg/kartlegging-forste-versjon-2026-10-13/premisser.md) og er ikke vedtak.
  Kort: appen erstatter dagens skjema og lover ikke mer enn det. Den viser partene hvilke valg
  de må ta, og regner ut virkningen av valgene. Den utleder ingenting av etterregistrert
  dokumentasjon. Force majeure blir en kategori av grunnlaget som andre.
- **Vedleggene** er fire kartlegginger på samme commit:
  - [skjema.md](vedlegg/kartlegging-forste-versjon-2026-10-13/skjema.md): hvert valg og felt i
    dagens skjemaer, med nyttelast og utregning;
  - [kjerne.md](vedlegg/kartlegging-forste-versjon-2026-10-13/kjerne.md): kommandoene,
    utsagnene og regelkodene i `kjerne/`, og hva kjernen avviser;
  - [virkninger.md](vedlegg/kartlegging-forste-versjon-2026-10-13/virkninger.md): steder der
    kjernen gir partenes handlinger en virkning de ikke har valgt (AV-01–AV-14);
  - [vedtak.md](vedlegg/kartlegging-forste-versjon-2026-10-13/vedtak.md): de 152
    domenevedtakene klassifisert etter art, virkning og anbefaling, med forslag til endret
    ordlyd (E1–E7).
- **Belegg** er merket som i hovedplanen, 1.3: **L** lest i koden, **K** kjørt og observert
  13.10. Vedleggene merker hver påstand.

## Sammendrag

1. **Kjernen er smalere enn skjemaet i vederlag og frist** (avsnitt 1). Grunnlaget er dekket.
   I vederlag mangler to av tre beregningsmetoder, rigg og drift, produktivitet og TEs varsel.
   BH kan ikke svare «nei» på § 34.1.2, § 34.2.2 eller § 33.6.1. Disse gapene er behovet,
   fordi appen skal erstatte skjemaet.
2. **Kjernen har 14 steder med automatiske virkninger** (avsnitt 2). De fleste løses ved å vise
   hvem som sa hva. Tre krever et valg fra oppdragsgiver: lukkingen av saken (AV-01, AV-02),
   varselet etter § 33.4 (AV-06, AV-07) og endringsordren som svar på grunnlaget (AV-11).
3. **Av 148 gjeldende domenevedtak foreslås 76 beholdt, 29 forenklet og 43 utsatt**
   (avsnitt 3). 18 av utsettelsene er endringsordre og forsering, som OV-U1 alt avviser.
   Resten er tre klynger: «ingen krav», virkningen av registrerte brev (merking, bestridelse,
   senere begrunnelse og datokontroller) og TEs påberopelse av passivitet og protest.
4. **Premiss 5 bygde på en uriktig lesning** (avsnitt 4). Et spor som ikke er sendt, hindrer
   også i dag at saken blir omforent. Spørsmålet om «ingen krav» må derfor stilles på nytt.

## 1. Gapet mellom skjemaet og kjernen

Kildene er avsnitt 3–11 i [skjema.md](vedlegg/kartlegging-forste-versjon-2026-10-13/skjema.md)
og avsnitt 3 i [kjerne.md](vedlegg/kartlegging-forste-versjon-2026-10-13/kjerne.md).

| ID | Tema | Skjemaet i dag (L) | Kjernen i dag (L, K) |
| --- | --- | --- | --- |
| BV-01 | Beregningsmetode i vederlag (§ 34.2–§ 34.4) | TE velger enhetspriser, regningsarbeid eller fastpris. Regningsarbeid er forhåndsvalgt | Bare `tilbud` med beløp over 0 (`KRAVINNHOLD` i `format.ts`). Kravet heter alltid «tilbud etter § 34.2.1» i brevet (AV-10) |
| BV-02 | Rigg og drift og produktivitet (§ 34.1.3) | TE fører beløp per linje. BH svarer på rettidighet og vurderer hver linje | Avvises: `rigg_belop` er et ukjent felt, og BHs vurdering stoppes av `utenforOmfanget` |
| BV-03 | TEs varsel om vederlag (§ 34.1.2, § 34.1.3) | Avkrysning i ny sak og eget vederlagsvarsel. Serveren setter datoen | `varsel` tar bare hjemmel 33.4 |
| BV-04 | BH påberoper for sent varsel etter § 34.1.2 eller § 34.1.3, per linje | «Ja, i tide» eller «Nei, prekludert» per linje | Feltet er påkrevd for svikt og andre forhold, «nei» avvises, og «ja» lagres ikke (AV-08) |
| BV-05 | BH avslår metoden og velger en annen (§ 34.2.2) | Ja | `aksepterer_metode` er påkrevd, «nei» avvises, og svaret lagres ikke (AV-08) |
| BV-06 | BH påberoper at det spesifiserte kravet kom for sent (§ 33.6.1) | Ja, og utmålingen merkes subsidiær | `spesifisert_krav_ok` er påkrevd, «nei» avvises, og svaret lagres ikke (AV-08) |
| BV-07 | Forespørsel etter § 33.6.2 og TEs svar, også utsatt beregning | BH kan be om spesifisert krav med svarfrist. TE kan svare med krav eller utsatt beregning | Ingen kommando for forespørselen. `varsel_type` er alltid `spesifisert`, og «nei» på `foresporsel_svar_ok` avvises |
| BV-08 | Force majeure (§ 33.3) | Hovedkategori uten underkategori | Avvises fordi kategorien ikke har noen underkategori (#367). Premiss 6 løser det |
| BV-09 | BH svarer på et vederlagsvarsel uten metode | Nei, knappen er deaktivert | Nei |
| BV-10 | TE godtar et svar | Nei, finnes bare i backend | Ja (`aksept`). Forbedring, beholdes |

Tilbakeholdelse etter § 30.2 og justerte enhetspriser etter § 34.3.3 er alltid av i skjemaet
og avvises i kjernen. Det er ikke et gap. § 34.3.3 er utenfor første versjon (OV-U1).

**Funn i dagens skjema som TS-skjemaet (#313) bør unngå.** Dette er Python-epokens kode, som
ikke rettes (hovedplanen, 1.3). Funnene står i avsnitt 13 i
[skjema.md](vedlegg/kartlegging-forste-versjon-2026-10-13/skjema.md):

- Et spesifisert krav uten tidligere varsel blir varselet etter § 33.4, med dagens dato, uten
  at noen har valgt det (K1).
- Ved oppdatering får det spesifiserte kravet ny dato, satt av klienten. BH kan da få
  rettidighetsspørsmålet mot oppdateringsdatoen (K2).
- Skjemaet sender `varslet_for_oppstart: true` ved regningsarbeid uten et valg fra TE (K3).
- Knappeteksten «Nei, prekludert» og stempelet «Prekludert» er appens ordlyd, ikke partens
  (K7).
- Resultatoverskriften kan si «godkjenner prinsipalt» når grunnlaget er avslått og hele svaret
  er subsidiært (K8). Ikke kontrollert i nettleser.

## 2. Automatiske virkninger i kjernen

Kilden er [virkninger.md](vedlegg/kartlegging-forste-versjon-2026-10-13/virkninger.md), med
kodesitat og forslag til grep for hvert funn.

**To kontrollpunkter ga ingen funn.** Svar, aksept og revisjon bærer ID-en til kravet eller
svaret de gjelder, og avvises ved avvik. Subsidiære beløp og dager summeres ikke som om
forutsetningen var oppfylt.

**Krever et valg fra oppdragsgiver:**

- **AV-01, AV-02: lukkingen av saken.** «Kravene er avgjort» (KA-U11) er samtidig en etikett,
  en sperre for hele saken og et vilkår for om senere brev får virkning. Uten «ingen krav» blir
  en sak der TE bare krever vederlag, aldri avgjort. Se avsnitt 4.
- **AV-06, AV-07: varselet etter § 33.4.** BHs vurdering av rettidigheten knyttes automatisk
  til siste kravversjon, og brevet sier ikke hvilket dokument varselet er. Registrerer TE senere
  et eget varsel, blir preklusjonen uavklart og TEs aksept sperret (MM-U8). Med premiss 4 bør
  appen i stedet vise premisset: «kravet i brev n er det første varselet appen kjenner».
- **AV-11: endringsordren.** BHs godkjenning av grunnlaget blir automatisk en endringsordre
  (GR-U10, GR-U12–GR-U14). Når § 31.3 ikke er avklart, sperres TEs trekk, og ingen kommando
  kan løse sperren.

**Løses ved å vise hvem som sa hva, eller ved å snevre inn:**

- **AV-03:** et trekk sperrer hele sporet, mens brevet sier «dette kravet». Det er vedtatt
  (KA-U22); skjemaet bør si det.
- **AV-04:** at BH godkjenner hele kravet, blir «partene er enige» (GR-U7, KA-U7).
  Meldingene bør si at enigheten kommer av BHs godkjenning.
- **AV-05:** godtar TE et svar med preklusjon som hovedstandpunkt, lukkes saken som avslått,
  men aksepten sier bare «TE godtar …». Brevet bør si virkningen.
- **AV-12:** tillegget «TE er enig i antallet dager» er tvetydig når hovedstandpunktet gir 0
  dager (LV-U4 punkt 6).
- **AV-13:** etiketten «varsel ikke registrert» vises også når det ikke er sendt noe fristkrav,
  og følger med i leveringsoppdraget.
- **AV-14:** en innsigelse følger på tvers av kravversjonene og leses inn i et registrert svar
  som er taust om den (VS-U9, VS-U11). Det er vedtatt; visningen bør vise det.

**Følger av gapene i avsnitt 1:** AV-08 (påkrevde felt der bare «ja» godtas), AV-09 (ingen
kommando for å registrere et krav eller svar sendt utenfor appen) og AV-10 (vederlag er alltid
et tilbud).

## 3. Vedtakene

Kilden er [vedtak.md](vedlegg/kartlegging-forste-versjon-2026-10-13/vedtak.md). Hvert vedtak
er klassifisert etter art: `kontrakt`, `produkt`, `tolkning` og `representasjon`. Det er også
klassifisert etter hvem som tar stilling, maskinell virkning, avhengigheter og om skjemaet har
det i dag.

| Anbefaling | Antall |
| --- | --- |
| behold | 76 |
| forenkle | 29 |
| utsett | 43 |
| utgår (opphevet eller erstattet) | 4 |

**Det som beholdes**, er det som regner ut virkningen av partens egne valg. Eksempler er B-13,
KA-U1, KA-U9, GR-U4, GR-U7, VS-U4 og VS-U5. Representasjonen beholdes også: HF-U1, MM-U9–MM-U11
og LV-U1–LV-U3.

**Det som utsettes:**

- «Ingen krav»: KA-U12, KA-U15, KA-U17 og KA-U25.
- Merking og sperrer på registrerte brev: KA-U26–KA-U30 og merkingsdelen av KA-U20.
- Senere begrunnelse og datokontrollene: KA-U34 og KA-U36–KA-U39.
- Bestridelse: MM-U7 og MM-U14.
- Sperren når TE registrerer et varsel etter BHs svar: MM-U8.
- TEs påberopelse av passivitet og protest: VS-U12 og deler av VS-U1 og VS-U9.
- Endringsordre og forsering: 18 vedtak, som OV-U1 alt avviser.

**Unntak i unntak.** Den tydeligste kjeden er senere begrunnelse: KA-U34 → KA-U35 → KA-U36 →
KA-U37 og KA-U38 → KA-U39. Fire vedtak regulerer datoen for et utsagn som ikke endrer noe
utfall. Andre eksempler er KA-U28–KA-U30, MM-U14 og protesten i MP-U6.

**Endringer som trengs for at første versjon skal henge sammen.** Ordlyden står i vedlegget:

- **E1:** KA-U11 gjelder «alle fremsatte krav». Et spor som ikke er sendt, hindrer ikke, og
  taushet er ikke et avkall.
- **E2:** et nytt vedtak om at et registrert brev er dokumentasjon uten virkning, med to
  unntak. TE kan oppgi datoen for sitt eget varsel. BH kan registrere sin egen endringsordre som
  svar på grunnlaget. E2 endrer 13 vedtak for første versjon.
- **E3:** OV-U1 tar ut «ingen krav».
- **E4:** MM-U1 og VS-U7 viser premisset i stedet for å gjøre preklusjonen uavklart.
- **E5:** KA-U23 tar ut henvisningen til «ingen krav».
- **E6:** OV-U2 sier at pris og tid i endringsordren ikke gir noen sperre.

E7 retter premiss 5 og er ikke et vedtak.

**Der vedtaksklassifiseringen er uenig med premissene.** NS 8407 gjør premiss 4 for snevert på
to punkter:

- Et skriftlig varsel sendt utenfor appen er gyldig etter § 5 første ledd. Rettidigheten etter
  § 32.2, § 33.4 og § 34.1 må derfor kunne vurderes mot TEs faktiske varseldato. Det er unntak
  a i E2.
- En endringsordre binder TE etter § 32.3 første ledd a og § 31.3 annet ledd. Står den bare som
  dokument, viser appen «venter på svar» og veiledning om passivitet, og den lar TE trekke
  grunnlaget. Det er unntak b i E2.

## 4. Premiss 5 og Python-rollupen

Premiss 5 sa at et spor som ikke er sendt, ikke hindrer at saken blir omforent, «som i dagens
Python-rollup». Det stemmer ikke (L):

- Når grunnlaget sendes, setter Python vederlag og frist til `UTKAST` (`_handle_grunnlag` i
  [`timeline_service.py`](../backend/services/timeline_service.py)).
- `overordnet_status` i [`sak_state.py`](../backend/models/sak_state.py) godtar bare
  `IKKE_RELEVANT` som ferdig. Et spor i `UTKAST` gir `UNDER_BEHANDLING`. Testen
  `test_not_omforent_with_utkast_tracks` fastholder det.
- Bare `kan_utstede_eo` ser bort fra spor som ikke er sendt.

Dagens app har altså samme hull som kjernen: en sak der TE bare krever vederlag, blir aldri
omforent. «Ingen krav» lukker hullet med et avkall. E1 lukker det uten avkall, ved at visningen
sier «alle fremsatte krav er avgjort» og ikke at saken er oppgjort.

## Spørsmål til oppdragsgiver

1. **Lukkingen av saken (AV-01, AV-02, E1).** Skal et spor som ikke er sendt, hindre at
   saken er avgjort?
2. **TEs eget varsel sendt utenfor appen (unntak a, E4).** Skal TE kunne oppgi datoen
   strukturert, slik at BH får den som premiss i rettidighetsspørsmålet?
3. **BHs endringsordre som svar på grunnlaget (unntak b, E6).** Skal BH kunne registrere den
   som sitt svar på grunnlaget?
4. **Neste steg.** Skal E1–E7 føres som ett samlet vedtak om første versjon? Og skal PR #476
   vente? VS-U19 og VS-U21 i den PR-en regulerer innholdet i registrerte brev, mot premiss 4.

**Oppdragsgivers svar 13.10.** Svarene er ikke vedtak ennå. De føres i vedtaksregisteret etter
sparringen med Astra.

1. Fremsatte krav, som E1. Et spor som ikke er sendt, hindrer ikke, og «ingen krav» bygges ikke.
2. Ja. TE kan oppgi datoen strukturert, og BH får den som premiss (unntak a og E4).
3. Ja. BH registrerer endringsordren ved å velge «godkjent» (unntak b og E6).
4. Sammendraget går til Astra før noe føres.

## Verifikasjon og grenser

- **Kjørt og observert (K):** prøveskript mot kjernen på `44bbb49`, med en journal i minnet
  uten database og server. De viser avvisningene i avsnitt 1, de påkrevde feltene i AV-08,
  rettidigheten knyttet til siste kravversjon (AV-06) og at en sak med ett spor ikke blir
  avgjort (AV-02). Skriptene lå utenfor repoet og er ikke bevart. Hvert vedlegg sier hva som
  ble kjørt.
- **Lest ut av koden (L):** resten. Funnet om Python-rollupen i avsnitt 4 er kontrollert to
  ganger, i vedtaksklassifiseringen og i hovedøkta.
- **Ikke kontrollert:**
  - Skjemaene er ikke kjørt i nettleser.
  - Demomodusen og testsiden `/kjerne` er ikke kartlagt.
  - Bevis-sakene og testbasen er ikke kjørt.
  - Ingen har kontrollert om noen leser samlestatusen i leveringsoppdraget.
- **Tellingene** i avsnitt 3 er talt med et skript over tabellene i vedlegget. En rad kan ha
  flere arter. Klassifiseringen er én agents skjønn, gjennomgått i hovedøkta, men ikke
  uavhengig.
- **Klassifiseringen er ikke en kontraktstolkning.** Der den viser til NS 8407, er det en
  arbeidshypotese til oppdragsgiver har tatt stilling.
