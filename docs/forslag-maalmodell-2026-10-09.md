# Forslag til målmodell: dokumenter, utsagn og predikater

**Dato:** 2026-10-09. **Kodegrunnlag:** `32ff911`. **Issue:**
[#300](https://github.com/khjohns/endringsmeldinger/issues/300).
**Status:** forslag til oppdragsgiver. Modellen som helhet er ikke vedtatt, og
forslaget endrer ingen vedtatt atferd. De tre domenevalgene i
[avsnitt 5](#5-spørsmål-til-oppdragsgiver) ble avgjort samme dag som
[MM-U1–MM-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1).

Grunnlaget er B-14 i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger)
og anbefalingen i [arkitekturforslaget, avsnitt 7](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#anbefaling).
Forslaget er avgrenset til fem forløp som allerede har vedtak og åpne issues.
Det er et modellforslag, ikke en utredning: modellen beskrives så langt
forløpene trenger, og prøves på dem.

| Forløp | Vedtak og funn | Issue | Skillet forløpet prøver |
| --- | --- | --- | --- |
| [A](#forløp-a-enighet-om-beløp-mens-grunnlaget-er-avslått) Enighet om beløp mens grunnlaget er avslått, og et fullt godkjent svar som låses | [GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), SK-03 | [#298](https://github.com/khjohns/endringsmeldinger/issues/298) | Hva enigheten gjelder, og vilkåret for at den får virkning |
| [B](#forløp-b-frafall-mot-trekk) Frafall mot trekk | Vedtaket om `FRAFALT` 05.10, [GR-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3), [GR-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5), SK-04 | [#257](https://github.com/khjohns/endringsmeldinger/issues/257) | To parters utsagn med motsatt virkning, og statusen som bare visning |
| [C](#forløp-c-ett-brev-med-preklusjon-og-avslag) Ett brev med preklusjon etter § 32.2 og avslag som subsidiær grunn | Vedtaket om avslag sammen med § 32.2 05.10 | [#220](https://github.com/khjohns/endringsmeldinger/issues/220) | Dokumentet og utsagnene i det. Historisk brev, dagens utledning og en regelendring |
| [D](#forløp-d-et-varsel-registrert-etter-et-senere-krav) Et varsel registrert etter at et senere krav er sendt | Vedtaket om SK-12 05.10 | [#264](https://github.com/khjohns/endringsmeldinger/issues/264) | Når noe skjedde, og når systemet fikk vite det. Ikke vurdert, påberopt og bestridt |
| [E](#forløp-e-en-hendelse-kjernen-ikke-kjenner-og-svaret-knyttet-til-referansen) En hendelse kjernen ikke kjenner, og svaret knyttet til referansen | B-10, SP-04 | [#273](https://github.com/khjohns/endringsmeldinger/issues/273) | Eksplisitte relasjoner ved lesing. Versjoner og stopp ved ukjent semantikk |

## 1. Kort fortalt

- **Journalen inneholder dokumenter.** Et dokument er én melding eller ett brev
  fra én part. Det har ett eller flere rettslige utsagn, og hvert utsagn viser
  uttrykkelig til det det gjelder.
- **Kjernen utleder predikater** av journalen og regelversjonen. Kommandoene,
  handlingene brukeren får tilbud om, og visningen leser de samme predikatene.
  Statusen er en oppsummering i visningen. Ingen regel leser den.
- **Enighet er et eget begrep** med gjenstand, kilde og vilkår for virkning.
  Sammenfallende standpunkter og en aksept gir samme enighet og låses likt.
- **Forstår ikke kjernen en hendelse på saken, er saken ikke forstått.**
  Journalen kan leses, men ingen bindende kommando godtas.
- **Et sendt brev fryser utledningen det bygget på.** Dagens utledning kan
  avvike etter en regelendring eller ny kunnskap. Brevet endres aldri.

## 2. Modellen

### 2.1 Byggeklossene

| Begrep | Hva det er | Lagres | I dag |
| --- | --- | --- | --- |
| **Dokument** | Én melding eller ett brev fra én part. Har aktør, *registrert* (serverens tidspunkt), *sendt* der parten oppgir det, og regelversjonen for et BH-svar | Ja, i journalen | Én hendelse |
| **Utsagn** | Ett rettslig utsagn i dokumentet: art, hva det gjelder, hjemmel og innhold | Ja, i dokumentet | Felt i `data`, for eksempel `resultat` og `grunnlag_varslet_i_tide` i samme svar |
| **Relasjon** | Utsagnets `gjelder`: en kravversjon, et svar, et varsel eller et annet utsagn. Aldri «det siste» | Ja, i utsagnet | `refererer_til_event_id` og kravreferansen. Lesingen bruker gjeldende krav i stedet (SP-04) |
| **Utledning** | Predikatene kjernen regner av journalen og regelversjonen: virkning, hovedgrunn, enighet, oppgjort, tillatte handlinger | Nei. Kan bufres med projeksjonsversjon (2.6) | Status settes i behandlerne og rulles opp i `overordnet_status` |
| **Beslutningsgrunnlag** | Utledningen frosset ved sending: utsagnene i rekkefølge, hovedgrunn, fullmaktsgrunnlag per spor, beslutningslinje og regelversjon | Ja, med kommandoen | `approval_letter.py` vurderer subsidiaritet selv når brevet lages (P2-4 i arkitekturforslaget) |

Et **svar** er fortsatt byggherrens dokument om én kravversjon, slik
[domenetabellen](domenetabell/README.md#begreper) definerer det. Forskjellen er
at svaret har flere utsagn i stedet for ett samlet resultat.

### 2.2 Utsagnene forløpene trenger

Listen dekker de fem forløpene, ikke hele domenet. Forsering, endringsordre og
innsigelser etter § 5 må inn før de portes.

| Art | Part | Gjelder | Innhold | I dag |
| --- | --- | --- | --- | --- |
| krav | TE | Sporet, som ny kravversjon | Kategori, beløp eller dager | `grunnlag_*`, `vederlag_krav_*`, `frist_krav_*` |
| varsel | TE | Forholdet i ett spor, med hjemmel (§ 33.4, § 34.1.3) | Sendt, metode | Felt i kravet: `frist_varsel`, `rigg_drift_varsel`, `produktivitetstap_varsel` |
| trekk | TE | Et krav | — | `*_trukket` |
| aksept | TE | Et svar | — | `te_aksepterer_respons` |
| rettidighet | BH | Et varsel eller et krav, med hjemmel | I tide eller for sent ([KA-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4)) | `grunnlag_varslet_i_tide`, `frist_varsel_ok` m.fl. |
| ansvar | BH | Grunnlagskravet | Godkjent, avslått eller frafalt | `resultat` i `respons_grunnlag` |
| beløp, dager | BH | Et vederlags- eller fristkrav | Vurderingene og serverens utregning (B-13) | `respons_vederlag`, `respons_frist` |
| forespørsel | BH | Fristkravet (§ 33.6.2) | Valgfri svarfrist | `frist_foresporsel_sendt` |

At et utsagn er subsidiært, lagres ikke. Det utledes, slik vedtaket 05.10 om
svar når grunnlaget er avslått sier. Rekkefølgen mellom preklusjon og avslag
utledes også (vedtaket 05.10 om avslag sammen med § 32.2).

**Journalformatet (SP-03).** En hendelse bevarer dokumentet (aktør, registrert,
sendt der parten oppgir det, regelversjon) og utsagnene (art, gjelder, hjemmel,
innhold og serverens lagrede utregning etter B-13). Den bevarer ikke
standardverdier fra modellen og ikke beløp som regnes av kravet, som
`vedlegg_ids: []`, `krevd_belop` og `netto_belop`. Dagens hendelser leses gjennom
én kompatibilitetsleser som gjør hver lagret hendelse om til et dokument med
utsagn. Lagrede hendelsesnavn beholdes; de er kontrakter. Et nytt lagringsformat
med en utsagnsliste per dokument er et valg under B-10, ikke noe modellen krever.

### 2.3 Opplysninger, vurderinger og utledning

Modellen holder tre slags innhold atskilt:
- **Partsopplysning:** det en part oppgir som faktum, for eksempel at et varsel
  ble sendt 02.09. Lagres som oppgitt, med hvem som oppga det.
- **Partsvurdering:** en parts rettslige standpunkt, for eksempel at varselet kom
  for sent.
- **Utledning:** det kjernen slutter med gitt regelversjon, for eksempel at
  preklusjonen er hovedgrunnen.

For hvert spørsmål, som ansvaret, beløpet eller rettidigheten av ett varsel,
gir utledningen én av fem tilstander:

| Tilstand | Betyr | Eksempel |
| --- | --- | --- |
| ikke vurdert | Ingen part har uttalt seg om spørsmålet | Rettidigheten av et varsel byggherren ikke har sett |
| ukjent | Opplysningen spørsmålet trenger, mangler | Det er ikke registrert noe varsel |
| påberopt | Én part har et standpunkt, den andre har ikke svart på det | BH sier at grunnlaget er varslet for sent |
| bestridt | Partenes standpunkter strider | TE krever 100 000 kr, BH godkjenner 60 000 kr |
| enige | Standpunktene faller sammen, eller TE har godtatt svaret | Se 2.4 |

«Påberopt» er ikke «avklart». At motparten ikke protesterer, gir ikke virkning av
seg selv (MP-03 og U3 i [metodeprøven](vedlegg/metodeprove-frist-2026-10-08/README.md)).
I dag finnes bare «ikke vurdert», som `null` etter KA-U4. Resten må leses ut av
enkeltfelt.

### 2.4 Enighet og betinget virkning

```ts
interface Enighet {
  spor: 'vederlag' | 'frist';
  svar: string; // svaret enigheten gjelder
  kilde: 'aksept' | 'sammenfall'; // TE har godtatt, eller svaret godkjenner hele kravet
  gjelder: 'beløp' | 'dager'; // og varslingen i sporet, ikke ansvaret (GR-U7)
  virkning: 'betinget' | 'virksom' | 'uten_virkning';
}
```

- **Betinget** så lenge grunnlaget ikke er avklart.
- **Virksom** når grunnlaget er avklart: godkjent uten virksom preklusjon etter
  § 32.2, eller frafalt. Sporet er da oppgjort.
- **Uten virkning** når TE har godtatt avslaget på grunnlaget, eller grunnlaget
  er trukket.

En enighet låser svaret den gjelder. Byggherren kan ikke revidere det (SK-03).
Fordi `kilde` kan være `sammenfall`, følger låsingen av et fullt godkjent svar
(#298) av definisjonen, ikke av en egen regel. En ny kravversjon opphever
enigheten (SK-02). Feltene `enighet` og `oppgjort` fra #297 blir visningen av
`virkning`.

For grunnlaget er enighet det samme som utfallet: en aksept av et avslag gir
*avvist*, og et godkjent eller frafalt grunnlag uten virksom preklusjon gir
*avklart*.

### 2.5 Predikatene styrer kommandoer, handlinger og visning

| Predikat | Definisjon | Kommandoen | Handlingene | Visningen |
| --- | --- | --- | --- | --- |
| `forstått(sak)` | Kjernen kan tolke alle dokumentene på saken (2.6) | Alle bindende kommandoer krever det | Ingen når det er usant | «Kan ikke utledes» |
| `gjeldendeKrav(spor)` | Sporets siste kravversjon | Et svar må vise til det | — | Versjonen |
| `gjeldendeSvar(spor)` | Svaret som *viser til* gjeldende krav. Etter referansen, ikke etter rekkefølgen (SP-04) | En aksept må vise til det ([KT-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#kt-u1)) | BH: svar. TE: godta | Svaret og hva det gjelder |
| `enighet(spor)` | Se 2.4 | Revisjon og ny aksept avvises | Ingen «revider», ingen «godta» | «Enige om beløpet», med vilkåret |
| `grunnlagAvklart` | Godkjent uten virksom preklusjon, eller frafalt (GR-U7) | — | — | «Ansvaret er avklart» |
| `grunnlagAvvist` | TE har godtatt et svar med avslag eller virksom preklusjon (SK-01, #213) | Alle kommandoer på saken avvises | Ingen | «Avslått» |
| `trukket(spor)` | TE har trukket kravet, eller grunnlaget som bærer det (GR-U5) | Ny kravversjon avvises | Ingen i sporet | «Trukket» |
| `oppgjort(spor)` | Enigheten er virksom | — | — | «Oppgjort» |
| `avsluttet(sak)` | Grunnlaget er avvist, alt er trukket, eller grunnlaget er avklart og hvert sendt krav er oppgjort, uten spor TE fortsatt kan sende ([EO-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2)) | Erstatter `CASE_NOT_CLOSED` | Ingen | Samlet status |
| `kanInngåIEo(sak)` | EO-U2. Usant etter frafall (GR-U3) | EO-saken kontrollerer det | «Ta med i endringsordre» | — |

Kjernen eksponerer fire funksjoner. Alle tre forbrukerne leser samme utledning:

```ts
function utled(journal: Dokument[], regler: Regelversjon): Utledning;
function avvisning(kommando: Kommando, u: Utledning): Avvisning | null; // kommandovalideringen
function handlinger(u: Utledning, side: Side): Handling[]; // pending_actions
function visning(u: Utledning): Visning; // status og etiketter
```

Kommandovalideringen deles i to: *forutsetninger*, som bare leser utledningen,
og *nyttelastkontroll*, som referansene og serverens utregning etter B-13.
Invarianten er da prøvbar: en handling tilbys hvis og bare hvis forutsetningene
for kommandoen holder. Serveren legger til prosjekt, team, kontraktsside og
fullmakt; `capabilities` er handlingene som også er autorisert
([MA-04](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#5-ma-04-autoritativ-server-og-kontraktsgrenser)).

I dag avviser `CASE_NOT_CLOSED` kommandoer ut fra samlet status i begge
implementasjoner, og samlet status bygges delvis av sporstatusene.

### 2.6 Versjoner, ukjente hendelser og gjenoppbygging (B-10)

| Versjon | Hva den angir | Hvor | I dag |
| --- | --- | --- | --- |
| Saksversjon | Rekkefølgen i saken. Grunnlag for `expected_version` | Hendelsen | Finnes |
| Hendelsesformat | Hvilken leser som forstår raden | Ny kolonne `format` på hendelsen, 1 for dagens form | Underforstått av `event_type` og modellen |
| Regelversjon | Reglene et BH-svar ble regnet og kontrollert med | `data` i BH-svar | Finnes (B-13) |
| Projeksjonsversjon | Kjernens regelversjon og høyeste format den leser | Bufrede felt i `sak_metadata` | Finnes ikke. `cached_status` og de andre `cached_*`-kolonnene har ingen versjon |

Reglene:
1. **Ikke forstått.** Saken er ikke forstått når et dokument har en type eller
   et format kjernen ikke kjenner, eller en referanse som ikke finnes i saken.
   Da avvises alle bindende kommandoer, handlingene er tomme, og visningen viser
   journalen med en uttrykkelig begrensning. Bufrede felt oppdateres ikke.
2. **Utdatert buffer.** Bufrede felt med eldre projeksjonsversjon bygges om før
   bruk. Saker der utledningen endres, listes før utrulling (B-13).
3. **Tilbakerulling.** Rader skrives aldri om.

   | Skrevet i | Gammel kjerne leser | Ny kjerne leser |
   | --- | --- | --- |
   | Format 1 | Ja | Ja |
   | Format 2 | Nei: saken er ikke forstått og stopper. Andre saker går | Ja |

4. **Frosset innhold.** Beslutningsgrunnlag og sendte brev regnes ikke om.
   Gjenoppbygging leverer ingenting.

### 2.7 Overgangsgrensen

- TS-kjernen lager beslutningsgrunnlaget i kommandoens transaksjon, sammen med
  leveringsintensjonen. Python får bare beslutningsgrunnlaget og teksten,
  gjengir brevet og leverer det. En retry leverer det lagrede dokumentet.
- Python leser ikke journalen for å bestemme innhold. Vurderingen av
  subsidiaritet i `approval_letter.py` flyttes til kjernen.
- Hver skriver må forstå alle dokumenter andre skrivere kan ha skrevet på samme
  sak (forløp E). Før en kommando flyttes til TS, må kjernen derfor lese alle
  hendelsestypene Python kan skrive i en KOE-sak. Ellers stopper TS-stien de
  sakene.

Grensen er en hypotese. Port 2 prøvde bare lesesiden av to skrivere på samme sak.

## 3. Forløpene

Notasjon: `D` er et dokument, `K-v1` er første kravversjon av vederlaget, `S-v1`
er svaret på den. Kolonnen «I dag» gjelder både Python og kjernen i
`sprakprove/kjerne/` når ikke annet står. «K 09.10» betyr kjørt med
[kontrollskriptet](vedlegg/maalmodell-2026-10-09/kontroll.ts) mot kjernen.

### Forløp A: enighet om beløp mens grunnlaget er avslått

[GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), SK-03, #298.
Rader GR-19–GR-25 i [domenetabellen](domenetabell/README.md).

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| 1 | D1 TE: krav K-g1, pålegg (IRREG). D2 TE: krav K-v1, 100 000 kr. D3 TE: krav K-f1, 20 dager | Ansvar, beløp og dager: ikke vurdert | BH: svare i hvert spor | Som modellen |
| 2 | D4 BH: ansvar «avslått» → K-g1. Rettidighet § 32.2 «i tide» → K-g1 | Ansvaret bestridt. Grunnlaget ikke avklart | TE: godta avslaget, eller ny kravversjon | Som modellen |
| 3 | D5 BH: beløp, 60 000 kr → K-v1 | Beløpet bestridt. Svaret er subsidiært, med avslått ansvar som hovedgrunn | TE: godta S-v1. BH: revidere S-v1 | Som modellen |
| 4 | D6 BH: dager, 20 → K-f1 | Enighet om dagene, kilde `sammenfall`, betinget | BH kan ikke revidere S-f1. TE har ingenting å godta (GR-25) | Et fullt godkjent svar kan revideres (#298). Revisjonen passerer `RESPONSE_ACCEPTED` (K 09.10) |
| 5 | D7 TE: aksept → S-v1 | Enighet om 60 000 kr, kilde `aksept`, betinget. Ikke oppgjort | BH kan ikke revidere S-v1 (SK-03) | Sporstatus `godkjent`, `enighet` sann, `oppgjort` usann, saken `UNDER_FORHANDLING` (K 09.10) |
| 6a | D8 TE: aksept → S-g1 | Grunnlaget avvist. Begge enighetene er uten virkning. Saken er avsluttet som avslått | Ingen | `LUKKET_AVSLATT` (#213, rad GR-20) |
| 6b | D8 TE: krav K-g2, endret underkategori. D9 BH: ansvar «godkjent» → K-g2 | Etter D8: S-g1 er ikke gjeldende, S-v1 er subsidiært til nytt svar (GR-U1), og enighetene står (GR-23). Etter D9: grunnlaget er avklart, begge enighetene er virksomme, og saken er oppgjort | Etter D9: saken kan inngå i en endringsordre | `OMFORENT` (rad GR-21, GR-24) |

**Hva forløpet viser.** Enigheten har en gjenstand og et vilkår. Steg 4 og 5 gir
samme enighet fra to kilder, og låses derfor likt. I dag heter en betinget
enighet `godkjent` i sporstatusen, som om kravet var oppgjort. I modellen leser
visningen `virkning` og kan si «enige om beløpet, ansvaret er omtvistet».

### Forløp B: frafall mot trekk

Vedtaket om `FRAFALT` 05.10, GR-U3, GR-U5, #235, SK-04. Rader GR-10–GR-17.
To saker med samme start som steg 1 i forløp A.

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| B1-2 | D4 BH: ansvar «frafalt» (§ 32.3 c) → K-g1. Rettidighet § 32.2 «i tide» | Grunnlaget avklart ved frafall. Svarene på vederlag og frist blir prinsipale (#235) | BH: svare på vederlag og frist. TE: ny kravversjon av grunnlaget (GR-U2) | Grunnlaget får status `trukket` (K 09.10; SK-04, rad GR-13) |
| B1-3 | D5, D6 BH: beløp og dager «avslått». D7, D8 TE: aksept av begge | Enighet i begge spor, virksom. Saken avsluttet som oppgjort. Kan ikke inngå i endringsordre fra KOE-saken (GR-U3) | Ingen i KOE-saken. Endringsordren for utført arbeid går i en egen EO-sak (#69) | `OMFORENT` (rad GR-15, etter #297) |
| B1-x | D4 med rettidighet «for sent» og frafall i samme svar | — | Avvises (#235, rad GR-17) | Godtas (#235) |
| B2-2 | D4 TE: trekk → K-g1 | Grunnlaget trukket. Vederlag og frist er trukket fordi grunnlaget bærer dem (GR-U5). Det utledes; ingen nye dokumenter skrives. Saken avsluttet som trukket | Ingen. En ny kravversjon avvises, og et nytt krav går i en ny sak | `_handle_grunnlag_trukket` skriver `trukket` på vederlag og frist. `LUKKET_TRUKKET` |

**Hva forløpet viser.** Frafall og trekk er utsagn fra hver sin part med motsatt
virkning for ansvaret. Mengdene for «ferdig» og «inaktiv», som SK-04 fant ulike i
kaskadene, `kan_utstede_eo`, reaktiv EO og aksepten, blir predikater som
defineres én gang. `FRAFALT` blir en
etikett i visningen. Den kan legges til uten å endre forretningsreglene eller
samlet status, fordi ingen av dem leser sporstatusen. Advarselen i `AGENTS.md`
om å utvide `SporStatus` gjelder da bare visningen.

### Forløp C: ett brev med preklusjon og avslag

Vedtaket 05.10 om avslag sammen med § 32.2, SK-01, #213, #220. Rad KA-10.

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| 1 | D1 TE: krav K-g1, pålegg. D2 TE: krav K-v1 | — | — | — |
| 2 | D3 BH, ett brev med to utsagn: u1 rettidighet § 32.2 «for sent» → K-g1, og u2 ansvar «avslått» → K-g1 | Hovedgrunn: preklusjonen (u1). Subsidiært: avslaget (u2). Et svar på vederlaget blir subsidiært med begge som årsaker. Beslutningsgrunnlaget fryser «prinsipalt prekludert (§ 32.2), subsidiært avslått» | TE: godta S-g1 | Ett svar med `resultat` og `grunnlag_varslet_i_tide`. Standpunktet for vederlag og frist har årsakene `prekludert` og `avslatt` (M1). Brevlinjen settes sammen i `approval_letter.py` |
| 3a | D4 TE: aksept → S-g1 | Aksepten gjelder begge utsagnene ([KA-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1)). Grunnlaget avvist. Saken avsluttet som avslått | Ingen | Som modellen (SK-01) |
| 3b | Ingen ny hendelse. § 32.2 snevres inn (#220), og K-g1 har en underkategori som faller utenfor, for eksempel `SAMORD`. S-g1 er ikke godtatt | u1 er uten virkning etter den nye regelversjonen: hjemmelen gjelder ikke. Hovedgrunnen blir avslaget. D3 står uendret og merkes «avviker fra dagens utledning». Saker som endres, listes før utrulling (B-13) | Et nytt svar med u1 på `SAMORD` avvises | Samme regel brukes ved lesing og skriving. Endringen slår stille gjennom på gamle saker. Sendte brev merkes ikke |
| 3c | Som 3b, men S-g1 var «godkjent» med u1 «for sent», og TE godtok det | Se [spørsmål 3](#spørsmål-3-gjelder-en-enighet-svaret-slik-det-ble-godtatt) | — | Saken går fra `LUKKET_AVSLATT` til grunnlag `godkjent` og `UNDER_BEHANDLING` uten ny hendelse. Det skjer alt med en eldre hendelse ved EO (K 09.10) |

**Hva forløpet viser.** Et brev er ett dokument, men ikke én rettslig handling
(MP-04). Med utsagnene atskilt kan en regelendring treffe ett av dem og la det
andre stå. Hovedgrunnen er en utledning, ikke en lagret rekkefølge. Derfor kan
brevet bevares uendret mens dagens utledning endres, og forskjellen kan vises.

### Forløp D: et varsel registrert etter et senere krav

Vedtaket om SK-12 05.10, B-13 om preklusjon etter § 33.4, B-16. Rader KA-09 og
KA-19.

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| 1 | Ingenting. TE sender varsel etter § 33.4 med e-post 02.09, utenfor appen | Ingen opplysning. At journalen er tom, beviser ikke at varselet ikke er sendt | — | Som modellen |
| 2 | D2 TE, registrert 20.09: krav K-f1, spesifisert, 20 dager, sendt 20.09 | Varselet etter § 33.4: ikke registrert. At det spesifiserte kravet også regnes som varsel, er en utledning, ikke et registrert varsel | BH: svare | `_handle_frist` setter `frist_varsel` lik `spesifisert_varsel` når varselet mangler |
| 3 | D3 BH, 25.09: dager med u1 rettidighet § 33.4 «for sent» → varselet i K-f1, og 20 dager | Prinsipalt avslått, preklusjonen trukket av systemet (B-13). Subsidiært 20 dager. u1 gjelder varselet slik det var registrert 25.09 | TE: godta S-f1 | Som modellen |
| 4 | D4 TE, registrert 28.09: varsel § 33.4, sendt 02.09, e-post | Se [spørsmål 1](#spørsmål-1-kan-te-registrere-et-tidligere-varsel-etter-et-senere-krav). Med anbefalingen: varselet er registrert for første gang, og begge tidsaksene vises. u1 gjelder ikke dette varselet. Rettidigheten av varselet 02.09 er ikke vurdert, og preklusjonen er uavklart til BH tar stilling. D3 står uendret. Har TE godtatt S-f1 før D4, står enigheten (KA-U1) | BH: revidere S-f1, hvis det ikke er godtatt | Varselet kan bare komme inn som felt i en ny kravversjon, og den overskriver varselet (SK-12). Bygges #264 slik issuet beskriver, avvises D4 fordi datoen avviker fra den utledede 20.09 |
| 5 | D5 TE: varsel § 33.4, sendt 01.08 | — | Avvises: varselet er registrert (SK-12, rad KA-19). En feilregistrering rettes etter B-16 ([#276](https://github.com/khjohns/endringsmeldinger/issues/276)) | Godtas og flytter datoen (SK-12) |

**Hva forløpet viser.** Varselet er et eget faktum med to tidsakser, ikke et felt
i kravet. Rettidigheten vurderes på aksen for sendt og mottatt, og rekkefølgen i
journalen på aksen for registrering. SK-12 låser det som er registrert. Om noe
som bare er utledet, også regnes som satt, er spørsmål 1. Svaret avgjør hvordan
#264 bygges.

### Forløp E: en hendelse kjernen ikke kjenner, og svaret knyttet til referansen

B-10, SP-04, #273. [Merknaden 07.10 til B-10](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger).

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| E1-1 | D1 TE: krav K-v1, 100 000 kr. D2 TE: krav K-v2, 120 000 kr | Gjeldende krav: K-v2. Venter på svar | BH: svare på K-v2 | Som modellen |
| E1-2 | D3 BH: beløp → K-v1, lagret etter D2. Kilden er en eldre skriver i overgangen eller importert historikk | D3 gjelder K-v1 og er historikk. Vederlaget venter fortsatt på svar på K-v2 | BH: svare på K-v2. TE: ingen aksept | D3 knyttes til K-v2 og blir gjeldende svar, og en aksept av D3 godtas (K 09.10; SP-04). Python regner `bh_respondert_versjon` av antall kravversjoner |
| E1-3 | D3 viser til en kravversjon som ikke finnes i saken | Saken er ikke forstått | Ingen | Svaret knyttes til gjeldende krav |
| E2-1 | D4 BH, skrevet av Python: forespørsel etter § 33.6.2 (`frist_foresporsel_sendt`). Kjernen kjenner ikke typen | Saken er ikke forstått. Journalen kan leses, og D4 vises som «ikke tolket av denne versjonen». Status og handlinger utledes ikke | Se [spørsmål 2](#spørsmål-2-hva-kan-partene-gjøre-i-en-sak-som-ikke-er-forstått) | Kjernen kaster `UkjentHendelse` (K 09.10), og prøveserveren svarer 422. Python avviser en ukjent typestreng i `parse_event` og hopper over en kjent type uten behandler i `compute_state` med en logglinje |
| E2-2 | Ny kjerne skriver format 2 på saken. Utrullingen rulles tilbake | Den gamle kjernen forstår ikke saken og stopper den. Andre saker går. Ingen rad skrives om | Ingen i saken | Ikke prøvd (#273) |
| E2-3 | Regelversjon 5 blir 6, uten nye hendelser | Bufrede felt med projeksjonsversjon 5 bygges om. Endrede saker listes før utrulling. Beslutningsgrunnlag og sendte brev står | — | De bufrede feltene har ingen versjon |

**Hva forløpet viser.** Kjernen kan ikke hoppe over forespørselen. Den utløser
TEs plikt etter § 33.6.2 og avgjør senere om spesifiseringen kom i tide (MP-01).
En kjerne som overså den, ville vurdert spesifiseringen på feil grunnlag. Med
referansen som relasjon gir en eldre eller fremmed rad samme resultat som en rad
fra den kontrollerte skriveren, eller den stopper saken. Den knyttes aldri til
feil krav.

## 4. Hva modellen betyr for kjernen og bevisene

| Del av `sprakprove/kjerne/` | Vurdering |
| --- | --- |
| `regler/`, `belop.ts`, `sammenlikning.ts` | Kan gjenbrukes. De regner ut innholdet i ett utsagn |
| `kontrakt.ts` | Kan gjenbrukes for kommandoene |
| `godkjenning.ts` | Grensen kan gjenbrukes. Den lager beslutningsgrunnlaget |
| `sak.ts` | Formes på nytt. `Sportilstand` med ett svar per spor blir dokumenter og utsagn. `anvend` bruker referansen. `sporstatus` og `samletStatus` flyttes til visningen |
| `forretningsregler.ts` | Formes på nytt. `sakIkkeLukket` erstattes av predikatene, og reglene deles i forutsetninger og nyttelastkontroll |
| `offentlig.ts` | Blir visningen av utledningen |

Bevis-sakene i domenetabellen kan brukes uendret. De genererte forløpene får fem
nye invarianter:
1. En handling tilbys hvis og bare hvis forutsetningene for kommandoen holder.
2. Et svar gjelder kravet det viser til, også når raden er lagret senere.
3. En sak med en ukjent hendelse godtar ingen bindende kommando.
4. En regelendring endrer ikke et beslutningsgrunnlag eller et sendt brev.
5. Ingen forretningsregel leser statusen. Det håndheves med en arkitekturtest:
   reglene importerer ikke visningen.

Tre feilinnføringer hører til: reglene leser samlet status igjen, `anvend`
knytter svaret til gjeldende krav, og en ukjent hendelse hoppes over.

## 5. Spørsmål til oppdragsgiver

Tre steder krevde modellen et domenevalg som ikke var vedtatt. Oppdragsgiver
valgte det anbefalte alternativet i alle tre 09.10. Vedtakene står i hovedplanen
som MM-U1, MM-U2 og MM-U3; teksten under er grunnlaget.

### Spørsmål 1: kan TE registrere et tidligere varsel etter et senere krav?

Forløp D, steg 4. Kravet ble spesifisert 20.09 uten registrert varsel etter
§ 33.4. TE registrerer 28.09 et varsel sendt 02.09.
- **(a) Ja, som første registrering av varselet.** Det utledede varselet var
  aldri satt. BHs svar står, og preklusjonen er uavklart til BH tar stilling.
  *Anbefalt.* SK-12 låser registrerte opplysninger, og BH beholder retten til
  å bestride at varselet ble sendt eller mottatt.
- **(b) Nei.** Det utledede varselet regnes som satt. Et tidligere varsel kan
  bare tas inn gjennom korrigeringen under B-16.
- **(c) Ja, og preklusjonen faller av seg selv.** Ikke anbefalt: systemet ville
  da avgjort rettidigheten ut fra en partsopplysning. MUT-DOK i metodeprøven
  viser samme feil.

### Spørsmål 2: hva kan partene gjøre i en sak som ikke er forstått?

Forløp E, steg E2-1. Stoppen varer til en kjerne som forstår hendelsen, er
rullet ut.
- **(a) Ingen bindende kommandoer for noen part.** Journalen og interne notater
  er tilgjengelige. Visningen sier at et varsel med frist må sendes utenfor
  appen og registreres senere (forløp D), og drift varsles. *Anbefalt.* Kjernen
  kan ikke vite hvilket spor en ukjent hendelse påvirker.
- **(b) Som (a), men TE kan sende varsler.** Et varsel trenger tilstanden for å
  kontrolleres, for eksempel SK-12, så kontrollen ville vært ufullstendig.

### Spørsmål 3: gjelder en enighet svaret slik det ble godtatt?

Forløp C, steg 3c. TE godtok et svar som var prinsipalt prekludert etter § 32.2
og subsidiært godkjent. Senere gjelder § 32.2 ikke lenger for kategorien.
- **(a) Ja.** Partene ble enige om svaret med alle standpunktene i det (KA-U1).
  Virkningen av en enighet fastsettes når den inngås, og saken forblir avslått.
  Dagens utledning kan vise at regelen er endret. *Anbefalt.*
- **(b) Nei.** Virkningen utledes på nytt. Preklusjonen faller, grunnlaget blir
  godkjent, og saken kan bli oppgjort uten ny hendelse.

B-13 sier at avledet standpunkt regnes med gjeldende regler, og at en
regelendring som endrer gamle saker, krever eget vedtak. Spørsmålet er om
virkningen av en *enighet* er et avledet standpunkt i den forstand.

## 6. Hva forslaget ikke avgjør

- Om `sprakprove/kjerne/` blir produksjonskjernen, rekkefølgen for portering,
  og valget mellom serverlaget i SvelteKit, en egen backend og en Python-worker
  (B-14, 09.10).
- Omfanget av § 32.2 (#220) og korrigering av låste opplysninger (B-16, #276).
- Et nytt lagringsformat. Kolonnen `format` og projeksjonsversjonen er forslag
  til B-10 (#273), ikke valgt.
- Utsagnene for forsering, endringsordre og innsigelser etter § 5.
- GR-25, om en aksept av et fullt godkjent svar skal avvises eller godtas uten
  virkning. Modellen fungerer med begge.

## Verifikasjon og grenser

**Kjørt og observert 09.10:**
[`kontroll.ts`](vedlegg/maalmodell-2026-10-09/kontroll.ts) med Node 22.22.0 mot
`sprakprove/kjerne/` på `32ff911`. Skriptet karakteriserer dagens atferd i
kjernen. Det er ikke en test av modellen:

```
A  vederlag: godkjent | enighet: true | oppgjort: false | sak: UNDER_FORHANDLING
A  revisjon av fullt godkjent svar, første brudd: RULE_VERSION
B  grunnlag etter frafall: trukket
C  IRREG: grunnlag: avslatt_akseptert | sak: LUKKET_AVSLATT
C  EO: grunnlag: godkjent | sak: UNDER_BEHANDLING
E  svaret knyttet til: v2 | gjeldende svar: s1 | aksept: godtas
E  ukjent hendelse: UkjentHendelse = true
```

Revisjonen i forløp A stopper først på regelversjonen fordi skriptets nyttelast
ikke har den. Det viser at `RESPONSE_ACCEPTED` ikke stoppet den.

**Lest ut av koden:** `sprakprove/kjerne/sak.ts`, `forretningsregler.ts`,
`offentlig.ts` og `regler/grunnlag.ts`; `parse_event` i
[models/events.py](../backend/models/events.py); `compute_state` og
`_handle_frist` i
[services/timeline_service.py](../backend/services/timeline_service.py);
`cached_*`-kolonnene i migrasjonene.

**Fra hovedplanen og domenetabellen, ikke kjørt her:** Python-atferden i
forløpene, utfallet av radene i domenetabellen og funnstatusen for SK-04,
SK-12 og SP-04.

**Ikke kontrollert:** at modellen kan implementeres som beskrevet, lagring og
gjenlesing, utrulling og tilbakerulling, hvordan Python leser en sak med en
ukjent hendelsestype i lageret, og hele domenet utenfor de fem forløpene.
Det er ikke gjort noen ny juridisk vurdering av NS 8407. Forventningene bygger
på vedtakene som er nevnt.
