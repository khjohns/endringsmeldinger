# Forslag til målmodell: dokumenter, svar, utsagn og predikater

**Dato:** 2026-10-09. **Kodegrunnlag:** `32ff911`. **Issue:**
[#300](https://github.com/khjohns/endringsmeldinger/issues/300).
**Status:** forslag til oppdragsgiver, bearbeidet samme dag etter review.
Modellen som helhet er ikke vedtatt, og forslaget endrer ingen vedtatt atferd.
De tre domenevalgene i [avsnitt 5](#5-spørsmål-til-oppdragsgiver) ble avgjort
samme dag som [MM-U1–MM-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1). Spørsmålet som forløp C, steg 3d, reiste, ble avgjort som [MM-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u4).

> **Merknad 2026-10-09:** forløpene er kjørt i en avgrenset implementasjon av
> modellen i [`sprakprove/maalmodell/`](../sprakprove/maalmodell/) (#304), i
> minnet og mot testbasen. «Ikke kontrollert» under Verifikasjon og grenser
> gjelder slik dokumentet ble skrevet. Resultatet står i merknaden 09.10 til
> B-14 i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger).

Grunnlaget er B-14 i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger)
og anbefalingen i [arkitekturforslaget, avsnitt 7](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#anbefaling).
Forslaget er avgrenset til fem forløp som allerede har vedtak og åpne issues.
Det er et modellforslag, ikke en utredning. Modellen beskrives så langt
forløpene trenger, og forløpene er gjennomgått på papir. Ingen kode for modellen
er skrevet eller kjørt.

| Forløp | Vedtak og funn | Issue | Skillet forløpet prøver |
| --- | --- | --- | --- |
| [A](#forløp-a-enighet-om-beløp-mens-grunnlaget-er-avslått) Enighet om beløp mens grunnlaget er avslått, og et fullt godkjent svar som låses | [GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), SK-03, MM-U3 | [#298](https://github.com/khjohns/endringsmeldinger/issues/298) | Brevet og svarene i det. Hva enigheten gjelder, og vilkåret for at den får virkning |
| [B](#forløp-b-frafall-mot-trekk) Frafall mot trekk | Vedtaket om `FRAFALT` 05.10, [GR-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3), [GR-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5), SK-04 | [#257](https://github.com/khjohns/endringsmeldinger/issues/257) | To parters utsagn med motsatt virkning, og statusen som bare visning |
| [C](#forløp-c-ett-brev-med-preklusjon-og-avslag) Ett brev med preklusjon etter § 32.2 og avslag som subsidiær grunn | Vedtaket om avslag sammen med § 32.2 05.10, MM-U3 | [#220](https://github.com/khjohns/endringsmeldinger/issues/220) | Svaret og utsagnene i det. Historisk brev, dagens utledning, enighet og en regelendring |
| [D](#forløp-d-et-varsel-registrert-etter-et-senere-krav) Et varsel registrert etter at et senere krav er sendt | Vedtaket om SK-12 05.10, MM-U1 | [#264](https://github.com/khjohns/endringsmeldinger/issues/264) | Sendt, mottatt og registrert. Opplysning, dokumentasjon og bestridelse |
| [E](#forløp-e-en-hendelse-kjernen-ikke-kjenner-og-svaret-knyttet-til-referansen) En hendelse kjernen ikke kjenner, og svaret knyttet til referansen | B-10, SP-04, MM-U2 | [#273](https://github.com/khjohns/endringsmeldinger/issues/273) | Eksplisitte relasjoner ved lesing, også ved revisjon. Versjoner og stopp ved ukjent semantikk |

## 1. Kort fortalt

- **Journalen inneholder domenehendelser.** En hendelse som er kommunikasjon
  mellom partene, viser til et dokument. Dokumentet kan inneholde flere svar, og
  hvert svar har ett eller flere rettslige utsagn. Hvert utsagn viser
  uttrykkelig til det det gjelder.
- **Kjernen utleder predikater** av journalen og regelversjonen. Kommandoene,
  handlingene brukeren får tilbud om, og visningen leser de samme predikatene.
  Statusen er en avledet etikett i visningen. Ingen regel leser den.
- **Opplysninger, partenes standpunkter og enighet er egne dimensjoner.** De
  kan gjelde samtidig. Ord som «bestridt» og «ikke vurdert» er etiketter som
  avledes av dem.
- **En enighet har et frosset innhold og et vilkår som utledes løpende.**
  Innholdet lagres i hendelsen som skaper enigheten (MM-U3). Om vilkåret er
  oppfylt, kan endre seg (GR-U7).
- **Forstår ikke kjernen en hendelse på saken, er saken ikke forstått.**
  Journalen kan leses, men ingen bindende kommando godtas (MM-U2).
- **Et sendt brev fryser utledningen det bygget på.** Dagens utledning kan
  avvike etter en regelendring eller ny kunnskap. Brevet endres aldri.

## 2. Modellen

### 2.1 Journalen og hva den ikke inneholder

Journalen er saksjournalen i `hendelse`. Den inneholder domenehendelser i
saksversjonens rekkefølge. Noen er kommunikasjon mellom partene og viser til et
dokument: krav, varsel, svar, aksept, trekk og bestridelse. Andre er ikke det,
for eksempel `sak_opprettet` og koblingen mellom en KOE-sak og en EO-sak. Modellen
tvinger ikke slike hendelser inn i dokumentformen.

Godkjenningspakker fram til publisering, vedlegg, interne notater og
leveringskvitteringer har egne lagre og kontrakter
([MA-03](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#4-ma-03-sannhetskilder-og-offentlig-tilstand)).
Modellen endrer ikke det.

### 2.2 Byggeklossene

| Begrep | Hva det er | Identitet og relasjoner | Lagres | I dag |
| --- | --- | --- | --- | --- |
| **Domenehendelse** | Én rad i journalen | `event_id`, saksversjon. `aktor_id` er brukeren som registrerte den, satt av serveren | Ja | Én hendelse |
| **Dokument** | Ett brev eller én melding fra én part | Egen ID. *Avsender* er parten (TE eller BH), ikke brukeren som registrerer. Opplysningene om sending og mottak (2.4). *Dokumentasjon*: vedlegg som viser dokumentet, for eksempel e-posten | Ja, i hendelsen | Hendelsen er dokumentet. Brevet fra godkjenningspakken har ett punkt per spor (`snapshot` i `approval_letter.py`) |
| **Svar** | Byggherrens svar på én kravversjon, i ett dokument | Egen ID. `gjelder`: kravversjonen. `erstatter`: svaret det reviderer, på samme kravversjon. Regelversjon | Ja | `respons_*` med `refererer_til_event_id`, kravreferansen og `original_respons_id` ved revisjon |
| **Utsagn** | Ett rettslig utsagn i et svar eller et dokument | Egen ID, stabil også i et brev med flere svar. Art, `gjelder`, hjemmel og innhold | Ja | Felt i `data`, for eksempel `resultat` og `grunnlag_varslet_i_tide` i samme svar |
| **Enighetsgrunnlag** | Innholdet i en enighet, frosset når den oppstår (2.5) | `svar`, utsagnene med virkning, vilkår, regelversjon | Ja, i hendelsen som skaper enigheten | Finnes ikke. `enighet` og `oppgjort` utledes ved hver lesing (#297) |
| **Utledning** | Predikatene kjernen regner av journalen og regelversjonen | — | Nei. Kan bufres med versjon (2.7) | Status settes i behandlerne og rulles opp i `overordnet_status` |
| **Beslutningsgrunnlag** | Utledningen frosset da et brev ble sendt: utsagnene i rekkefølge, hovedgrunn, fullmaktsgrunnlag per spor, beslutningslinje og regelversjon | Viser til dokumentet | Ja, med kommandoen | `approval_letter.py` vurderer subsidiaritet selv når brevet lages (P2-4 i arkitekturforslaget) |

Tre relasjoner bærer modellen. Ingen av dem er «det siste»:

- **`gjelder`**: fra et svar til en kravversjon, og fra et utsagn til det det
  uttaler seg om: et krav, et varsel, et svar eller et annet utsagn.
- **`erstatter`**: fra en revisjon til svaret den reviderer. Gjeldende svar er
  svaret som gjelder gjeldende kravversjon og ikke er erstattet. Har to svar
  på samme kravversjon ingen slik relasjon mellom seg, er saken ikke forstått
  (2.7). Kjernen gjetter ikke.
- **`bestrider`**: fra en parts utsagn til motpartens utsagn eller opplysning.

**Et dokument kan inneholde flere svar.** Brevet fra godkjenningspakken gjør det
allerede. [KA-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1)
gjelder da det konkrete svaret: en aksept av svaret på vederlaget er ikke en
aksept av svaret på grunnlaget i samme brev. Hovedvalget under B-03 sier at
hvert brev gjelder ett spor. Den ordlyden passer ikke helt med
godkjenningsbrevet og bør presiseres. Modellen fungerer med begge.

### 2.3 Utsagnene forløpene trenger

Listen dekker de fem forløpene, ikke hele domenet. Forsering, endringsordre og
innsigelser etter § 5 må inn før de portes.

| Art | Part | Gjelder | Innhold | I dag |
| --- | --- | --- | --- | --- |
| krav | TE | Sporet, som ny kravversjon | Kategori, beløp eller dager | `grunnlag_*`, `vederlag_krav_*`, `frist_krav_*` |
| varsel | TE | Forholdet i ett spor, med hjemmel (§ 33.4, § 34.1.3) | Metode. Sending og mottak er opplysninger om dokumentet | Felt i kravet: `frist_varsel`, `rigg_drift_varsel`, `produktivitetstap_varsel` |
| trekk | TE | Et krav | — | `*_trukket` |
| aksept | TE | Ett svar, ikke hele dokumentet | Enighetsgrunnlaget og regelversjonen TE fikk vist | `te_aksepterer_respons`, med svaret i `refererer_til_event_id` og uten regelversjon |
| rettidighet | BH | Et varsel eller et krav, med hjemmel | I tide eller for sent ([KA-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4)) | `grunnlag_varslet_i_tide`, `frist_varsel_ok` m.fl. |
| ansvar | BH | Grunnlagskravet | Godkjent, avslått eller frafalt | `resultat` i `respons_grunnlag` |
| beløp, dager | BH | Et vederlags- eller fristkrav | Vurderingene og serverens utregning (B-13) | `respons_vederlag`, `respons_frist` |
| forespørsel | BH | Fristkravet (§ 33.6.2) | Valgfri svarfrist | `frist_foresporsel_sendt` |
| bestridelse | TE eller BH | Motpartens utsagn eller opplysning | Hva som bestrides, for eksempel at varselet ble mottatt | Finnes ikke. TE-protesten i [metodeprøven](vedlegg/metodeprove-frist-2026-10-08/README.md) (MP-U6) er nærmest |

At et utsagn er subsidiært, lagres ikke. Det utledes, slik vedtaket 05.10 om
svar når grunnlaget er avslått sier. Rekkefølgen mellom preklusjon og avslag
utledes også (vedtaket 05.10 om avslag sammen med § 32.2). Unntaket er
enighetsgrunnlaget, som fryser virkningen slik den var da enigheten oppsto.

**Journalformatet (SP-03).** En kommunikasjonshendelse bevarer dokumentet
(avsender, opplysningene om sending og mottak, dokumentasjon, regelversjon),
svarene med `gjelder` og `erstatter`, utsagnene (art, gjelder, hjemmel, innhold
og serverens lagrede utregning etter B-13) og et eventuelt enighetsgrunnlag. Den
bevarer ikke standardverdier fra modellen og ikke beløp som regnes av kravet,
som `vedlegg_ids: []`, `krevd_belop` og `netto_belop`. Dagens hendelser leses
gjennom én kompatibilitetsleser, som gjør hver lagret hendelse om til denne
formen. Lagrede hendelsesnavn beholdes; de er kontrakter. Et nytt lagringsformat
er et valg under B-10. Nytt innhold i en hendelse, som enighetsgrunnlaget, hører
hjemme i datamodellen og `docs/datamodell/hendelser.toml` når det bygges
(`AGENTS.md`).

### 2.4 Opplysninger, standpunkter og enighet er egne dimensjoner

For hvert spørsmål holder utledningen fire dimensjoner atskilt. Eksempler på
spørsmål er ansvaret, beløpet i en kravversjon og rettidigheten av ett varsel.

| Dimensjon | Innhold | Eksempel |
| --- | --- | --- |
| Opplysninger | Det partene oppgir som faktum, hver med hvem som oppga det, dokumentasjon og om motparten bestrider det | TE oppgir at varselet ble sendt 02.09 med e-post. BH bestrider at det ble mottatt |
| TEs standpunkt | TEs utsagn om spørsmålet, eller ingen | Kravet på 100 000 kr |
| BHs standpunkt | BHs utsagn om spørsmålet, eller ingen | 60 000 kr. Eller: varselet kom for sent |
| Enighet | Et enighetsgrunnlag som gjelder spørsmålet, eller ingen | Se 2.5 |

Tidspunktene for et dokument er tre opplysninger:
- *Sendt*, oppgitt av avsenderen.
- *Mottatt*, oppgitt av avsenderen eller mottakeren.
- *Registrert*, satt av serveren. Det er det eneste tidspunktet systemet selv
  vet.

En registrert opplysning om at noe ble sendt, er ikke det samme som at systemet
har fastslått at det ble sendt. Om sending eller mottak avgjør rettidigheten
etter en bestemmelse, er et juridisk spørsmål modellen ikke avgjør. Den holder
begge.

Visningen avleder etiketter av dimensjonene, og flere kan gjelde samtidig. I
eksempelet over er rettidigheten samtidig «BH påberoper for sent», «mottak
bestridt» og «mottaksdato mangler». Etikettene er ikke en status, og ingen regel
leser dem. At motparten ikke protesterer, gir ikke virkning av seg selv (MP-03
og U3 i metodeprøven). I dag finnes bare at BH ikke har vurdert et spørsmål, som
`null` etter KA-U4. Resten må leses ut av enkeltfelt.

### 2.5 Enighet: frosset innhold og løpende vilkår

```ts
// Frosset når enigheten oppstår, og lagret i hendelsen som skaper den:
// aksepten, eller svaret som godkjenner hele kravet.
interface Enighetsgrunnlag {
  spor: Spor;
  svar: string; // svaret, ikke hele dokumentet (KA-U1)
  kilde: 'aksept' | 'sammenfall';
  regelversjon: number; // reglene som ga standpunktene virkning da
  standpunkter: { utsagn: string; virkning: 'hovedgrunn' | 'subsidiær' | 'uten_virkning' }[];
  utfall: { belop?: number; dager?: number; grunnlag?: 'avklart' | 'avvist' };
  vilkar: 'grunnlag_avklart' | null; // GR-U7 for vederlag og frist, ingen for grunnlaget
}

// Utledet ved hver lesing:
type Virkning = 'betinget' | 'virksom' | 'uten_virkning';
```

Innholdet ligger fast; om vilkåret er oppfylt, utledes løpende
([MM-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u3), presisert
samme dag):
- **Betinget** så lenge grunnlaget ikke er avklart.
- **Virksom** når grunnlaget er avklart: godkjent uten virksom preklusjon etter
  § 32.2, eller frafalt. Sporet er da oppgjort.
- **Uten virkning** når grunnlaget er avvist eller trukket.

For grunnlaget har enighetsgrunnlaget ikke noe vilkår. Utfallet er da `avvist`
eller `avklart`, slik standpunktene i svaret virket etter regelversjonen da TE
godtok det. En senere regelendring endrer det ikke. Dagens utledning kan vise at
regelen er endret (forløp C).

Enighetsgrunnlaget lages der enigheten oppstår. Ved `aksept` er det TEs
aksepthendelse, med regelversjonen da aksepten ble registrert. Den kan være
nyere enn da byggherren sendte svaret, men bare når standpunktene har samme
virkning som i brevet (MM-U4). Beslutningsgrunnlaget i brevet dekker likevel
ikke aksepten, fordi enighetsgrunnlaget også bærer vilkåret og TEs side. Ved `sammenfall` er det svaret som
godkjenner hele kravet. Forkastet: å la gamle regelversjoner være kjørbare for å
regne ut virkningen på nytt. Eldre aksepter uten enighetsgrunnlag får det
utledet av kompatibilitetsleseren med gjeldende regler, merket som utledet.
Appen har ingen reelle data.

**Aksepten binder det TE fikk se.** Klienten regner ut enighetsgrunnlaget i
forhåndsvisningen og sender det med aksepten, sammen med regelversjonen.
Serveren regner det ut på nytt og avviser aksepten hvis regelversjonen eller
grunnlaget avviker. Det er samme kontroll som B-13 har for byggherrens svar
(`RULE_VERSION`, `RESULT_MISMATCH`). `expected_version` binder allerede
saksgrunnlaget: kom det en hendelse etter forhåndsvisningen, gir innsendingen
409. Etter en avvisning må TE få en ny forhåndsvisning før aksepten kan sendes
igjen. Uten sammenlikningen kunne serveren ha fryst et annet utfall enn TE så,
for eksempel når den er oppgradert mellom forhåndsvisningen og innsendingen, eller
når nettleseren kjører en eldre kjerne. Den smale kontrakten har i dag
svarreferansen, men ingen regelversjon eller enighetsgrunnlag i aksepten.

**Bare et svar som stemmer med dagens utledning, kan godtas
([MM-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u4)).** Har en
regelendring etter sendingen gitt et standpunkt i svaret en annen virkning enn
beslutningsgrunnlaget i brevet, avvises aksepten. Byggherren må da svare på nytt.
Brevet, svaret TE godtar, og reglene enighetsgrunnlaget fryses med, stemmer
dermed alltid overens.

En enighet låser svaret den gjelder. Byggherren kan ikke revidere det (SK-03).
Fordi `kilde` kan være `sammenfall`, følger låsingen av et fullt godkjent svar
(#298) av definisjonen, ikke av en egen regel. En ny kravversjon opphever
enigheten (SK-02). Feltene `enighet` og `oppgjort` fra #297 blir visningen av
`Virkning`.

### 2.6 Predikatene styrer kommandoer, handlinger og visning

| Predikat | Definisjon | Kommandoen | Handlingene | Visningen |
| --- | --- | --- | --- | --- |
| `forstått(sak)` | Kjernen kan tolke alle hendelsene på saken og løse alle relasjonene entydig (2.7) | Alle bindende kommandoer krever det | Ingen når det er usant | «Kan ikke utledes» |
| `gjeldendeKrav(spor)` | Sporets siste kravversjon | Et svar må vise til det | — | Versjonen |
| `gjeldendeSvar(spor)` | Svaret som *gjelder* gjeldende krav og ikke er *erstattet*. Etter relasjonene, ikke etter rekkefølgen (SP-04) | En aksept må vise til det ([KT-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#kt-u1)), og brevet må stemme med dagens utledning (MM-U4). En revisjon må erstatte det | BH: svare eller revidere. TE: godta, når brevet stemmer | Svaret og hva det gjelder |
| `enighet(spor)` | Et enighetsgrunnlag for gjeldende svar (2.5) | Revisjon avvises. Ny aksept avvises foreløpig; GR-25 er en arbeidshypotese (avsnitt 6) | Ingen «revider», ingen «godta» | «Enige om beløpet», med vilkåret |
| `grunnlagAvklart` | Godkjent uten virksom preklusjon, eller frafalt (GR-U7). Ved enighet: utfallet i enighetsgrunnlaget | — | — | «Ansvaret er avklart» |
| `grunnlagAvvist` | Enighetsgrunnlaget for grunnlaget har utfallet `avvist` (SK-01, #213) | Alle kommandoer på saken avvises | Ingen | «Avslått» |
| `trukket(spor)` | TE har trukket kravet, eller grunnlaget som bærer det (GR-U5) | Ny kravversjon avvises | Ingen i sporet | «Trukket» |
| `oppgjort(spor)` | Enigheten er virksom | — | — | «Oppgjort» |
| `avsluttet(sak)` | Grunnlaget er avvist, alt er trukket, eller grunnlaget er avklart og hvert sendt krav er oppgjort, uten spor TE fortsatt kan sende ([EO-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2)) | Erstatter `CASE_NOT_CLOSED` | Ingen | Samlet status |
| `kanInngåIEo(sak)` | EO-U2. Usant etter frafall (GR-U3) | EO-saken kontrollerer det | «Ta med i endringsordre» | — |

Kjernen eksponerer fire funksjoner. Alle tre forbrukerne leser samme utledning:

```ts
function utled(journal: Domenehendelse[], regler: Regelversjon): Utledning;
function avvisning(kommando: Kommando, u: Utledning): Avvisning | null; // kommandovalideringen
function handlinger(u: Utledning, side: Side): Handling[]; // pending_actions
function visning(u: Utledning): Visning; // etiketter og samlet status
```

Kommandovalideringen deles i to: *forutsetninger*, som bare leser utledningen,
og *nyttelastkontroll*, som referansene og serverens utregning etter B-13.
Invarianten er da prøvbar: en handling tilbys hvis og bare hvis forutsetningene
for kommandoen holder. Serveren legger til prosjekt, team, kontraktsside og
fullmakt; `capabilities` er handlingene som også er autorisert
([MA-04](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md#5-ma-04-autoritativ-server-og-kontraktsgrenser)).

I dag avviser `CASE_NOT_CLOSED` kommandoer ut fra samlet status i begge
implementasjoner, og samlet status bygges delvis av sporstatusene.

### 2.7 Versjoner, ukjente hendelser og gjenoppbygging (B-10)

| Versjon | Hva den angir | Hvor | I dag |
| --- | --- | --- | --- |
| Saksversjon | Rekkefølgen i saken. Grunnlag for `expected_version` | Hendelsen | Finnes |
| Hendelsesformat | Hvilken leser som forstår raden | Ny kolonne `format` på hendelsen, 1 for dagens form | Underforstått av `event_type` og modellen |
| Regelversjon | Reglene et svar ble regnet og kontrollert med, og reglene et enighetsgrunnlag ble frosset med | `data` i svaret og i enighetsgrunnlaget | Finnes for BH-svar (B-13) |
| Projeksjonsversjon | Versjonen av selve projeksjonskoden. Økes ved enhver endring som kan gi et annet resultat, også en feilretting uten ny regelversjon | Bufrede felt i `sak_metadata` | Finnes ikke |

Et bufret resultat bærer fire verdier: projeksjonsversjonen, regelversjonen,
høyeste format kjernen leser, og saksversjonen det er regnet fra. Kjernen bruker
resultatet bare når verdiene samsvarer med dens egne og sakens, eller er
uttrykkelig erklært kompatible. Det gjelder begge veier: etter en tilbakerulling
kan resultatet være *nyere* enn kjernen som leser det. I dag har `cached_status`
og de andre `cached_*`-kolonnene ingen av verdiene.

Reglene:
1. **Ikke forstått.** Saken er ikke forstått når en hendelse har en type eller
   et format kjernen ikke kjenner, når en referanse ikke finnes i saken, eller
   når to svar på samme kravversjon ikke har noen `erstatter`-relasjon. Da
   avvises alle bindende kommandoer, handlingene er tomme, og visningen viser
   journalen med en uttrykkelig begrensning. Bufrede felt oppdateres ikke
   (MM-U2).
2. **Buffer som ikke samsvarer.** Et bufret resultat som er eldre eller nyere
   enn kjernen, bygges om før bruk hvis kjernen forstår journalen. Forstår den
   ikke journalen, stopper saken etter regel 1. Saker der utledningen endres av
   en regelendring, listes før utrulling (B-13).
3. **Tilbakerulling.** Rader skrives aldri om.

   | Skrevet i | Gammel kjerne leser | Ny kjerne leser |
   | --- | --- | --- |
   | Format 1 | Ja | Ja |
   | Format 2 | Nei: saken er ikke forstått og stopper. Andre saker går | Ja |

4. **Frosset innhold.** Beslutningsgrunnlag, enighetsgrunnlag og sendte brev
   regnes ikke om. Gjenoppbygging leverer ingenting.

### 2.8 Overgangsgrensen

- TS-kjernen lager beslutningsgrunnlaget i kommandoens transaksjon, sammen med
  leveringsintensjonen. Python får bare beslutningsgrunnlaget og teksten,
  gjengir brevet og leverer det. En retry leverer det lagrede dokumentet.
- Python leser ikke journalen for å bestemme innhold. Vurderingen av
  subsidiaritet i `approval_letter.py` flyttes til kjernen.
- Hver skriver må forstå alle hendelser andre skrivere kan ha skrevet på samme
  sak (forløp E). Før en kommando flyttes til TS, må kjernen derfor lese alle
  hendelsestypene Python kan skrive i en KOE-sak. Ellers stopper TS-stien de
  sakene.

Grensen er en hypotese. Port 2 prøvde bare lesesiden av to skrivere på samme sak.

## 3. Forløpene

Notasjon: `D` er et dokument, `K-v1` er første kravversjon av vederlaget, `S-v1`
er svaret på den, og `E-v1` er et enighetsgrunnlag. Kolonnen «I dag» gjelder både
Python og kjernen i `sprakprove/kjerne/` når ikke annet står. «K 09.10» betyr
kjørt med [kontrollskriptet](vedlegg/maalmodell-2026-10-09/kontroll.ts) mot
kjernen. Det viser dagens atferd; modellkolonnene er gjennomgått på papir.

### Forløp A: enighet om beløp mens grunnlaget er avslått

[GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), SK-03, MM-U3,
#298. Rader GR-19–GR-25 i [domenetabellen](domenetabell/README.md).

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| 1 | D1 TE: krav K-g1, pålegg (IRREG). D2 TE: krav K-v1, 100 000 kr. D3 TE: krav K-f1, 20 dager | TE har standpunkter i alle tre spor. BH har ikke tatt stilling | BH: svare i hvert spor | Som modellen |
| 2 | D4 BH, ett brev fra godkjenningspakken med tre svar. S-g1 → K-g1: ansvar «avslått», rettidighet § 32.2 «i tide». S-v1 → K-v1: beløp 60 000 kr. S-f1 → K-f1: dager 20 | Ansvar og beløp: standpunktene strider. S-v1 og S-f1 er subsidiære med avslått ansvar som hovedgrunn. Dagene: enighet ved sammenfall. E-f1 fryses i D4: S-f1, 20 dager, subsidiært, vilkår avklart grunnlag. Betinget | TE: godta S-g1 eller S-v1, eller sende ny kravversjon. BH: revidere S-v1. BH kan ikke revidere S-f1 (#298). TE har ingenting å godta i fristen (GR-25) | Et fullt godkjent svar kan revideres (#298). Revisjonen passerer `RESPONSE_ACCEPTED` (K 09.10). Brevet har ett punkt per spor |
| 3 | D5 BH: S-v2 → K-v1, `erstatter` S-v1: beløp 70 000 kr | Gjeldende svar på K-v1 er S-v2. S-v1 er historikk | TE: godta S-v2. En aksept av S-v1 avvises | `original_respons_id` kontrolleres mot gjeldende svar ved innsending. Lesingen tar siste svar |
| 4 | D6 TE: aksept → S-v2 | Enighet om 70 000 kr. E-v1 fryses i D6 med regelversjonen da: S-v2, 70 000 kr, subsidiært, vilkår avklart grunnlag. Aksepten gjelder S-v2, ikke svarene på grunnlag og frist i D4 (KA-U1). Betinget, ikke oppgjort | BH kan ikke revidere S-v2 (SK-03) | Sporstatus `godkjent`, `enighet` sann, `oppgjort` usann, saken `UNDER_FORHANDLING` (K 09.10) |
| 5a | D7 TE: aksept → S-g1 | E-g1 fryses: utfall `avvist`. Grunnlaget er avvist, E-v1 og E-f1 er uten virkning, og saken er avsluttet som avslått | Ingen | `LUKKET_AVSLATT` (#213, rad GR-20) |
| 5b | D7 TE: krav K-g2, endret underkategori. D8 BH: S-g2 → K-g2, ansvar «godkjent» | Etter D7: S-g1 er ikke gjeldende, S-v2 er subsidiært til nytt svar (GR-U1), og enighetene står (GR-23). Etter D8: vilkåret er oppfylt. E-v1 og E-f1 er virksomme med uendret innhold, og saken er oppgjort | Etter D8: saken kan inngå i en endringsordre | `OMFORENT` (rad GR-21, GR-24) |

**Hva forløpet viser.** Ett brev kan ha tre svar, og en aksept gjelder bare ett
av dem. Enigheten har et innhold som ligger fast, og et vilkår som blir oppfylt
i 5b. Steg 2 og 4 gir enighet fra to kilder og låses derfor likt. I dag heter en
betinget enighet `godkjent` i sporstatusen, som om kravet var oppgjort. I
modellen kan visningen si «enige om 70 000 kr, ansvaret er omtvistet».

### Forløp B: frafall mot trekk

Vedtaket om `FRAFALT` 05.10, GR-U3, GR-U5, #235, SK-04. Rader GR-10–GR-17.
To saker med samme start som steg 1 i forløp A.

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| B1-2 | D4 BH: S-g1 → K-g1, ansvar «frafalt» (§ 32.3 c), rettidighet § 32.2 «i tide» | Grunnlaget avklart ved frafall. Svarene på vederlag og frist blir prinsipale (#235) | BH: svare på vederlag og frist. TE: ny kravversjon av grunnlaget (GR-U2) | Grunnlaget får status `trukket` (K 09.10; SK-04, rad GR-13) |
| B1-3 | D5 BH: beløp og dager «avslått», to svar. D6, D7 TE: aksept av hvert | E-v1 og E-f1, virksomme. Saken avsluttet som oppgjort. Kan ikke inngå i endringsordre fra KOE-saken (GR-U3) | Ingen i KOE-saken. Endringsordren for utført arbeid går i en egen EO-sak (#69) | `OMFORENT` (rad GR-15, etter #297) |
| B1-x | D4 med rettidighet «for sent» og frafall i samme svar | — | Avvises (#235, rad GR-17) | Godtas (#235) |
| B2-2 | D4 TE: trekk → K-g1 | Grunnlaget trukket. Vederlag og frist er trukket fordi grunnlaget bærer dem (GR-U5). Det utledes; ingen nye hendelser skrives. Saken avsluttet som trukket | Ingen. En ny kravversjon avvises, og et nytt krav går i en ny sak | `_handle_grunnlag_trukket` skriver `trukket` på vederlag og frist. `LUKKET_TRUKKET` |

**Hva forløpet viser.** Frafall og trekk er utsagn fra hver sin part med motsatt
virkning for ansvaret. Mengdene for «ferdig» og «inaktiv», som SK-04 fant ulike i
kaskadene, `kan_utstede_eo`, reaktiv EO og aksepten, blir predikater som
defineres én gang. `FRAFALT` blir en etikett i visningen. Den kan legges til uten
å endre forretningsreglene eller samlet status, fordi ingen av dem leser
sporstatusen. Advarselen i `AGENTS.md` om å utvide `SporStatus` gjelder da bare
visningen.

### Forløp C: ett brev med preklusjon og avslag

Vedtaket 05.10 om avslag sammen med § 32.2, SK-01, #213, #220, MM-U3. Rad
KA-10.

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| 1 | D1 TE: krav K-g1, pålegg. D2 TE: krav K-v1 | — | — | — |
| 2 | D3 BH: S-g1 → K-g1 med to utsagn. u1: rettidighet § 32.2 «for sent» → K-g1. u2: ansvar «avslått» → K-g1 | Hovedgrunn: preklusjonen (u1). Subsidiært: avslaget (u2). Et svar på vederlaget blir subsidiært med begge som årsaker. Beslutningsgrunnlaget fryser «prinsipalt prekludert (§ 32.2), subsidiært avslått» | TE: godta S-g1 | Ett svar med `resultat` og `grunnlag_varslet_i_tide`. Standpunktet for vederlag og frist har årsakene `prekludert` og `avslatt` (M1). Brevlinjen settes sammen i `approval_letter.py` |
| 3a | D4 TE: aksept → S-g1 | E-g1 fryses i D4: u1 hovedgrunn, u2 subsidiær, utfall `avvist`, regelversjon n. Grunnlaget avvist. Saken avsluttet som avslått | Ingen | Som modellen (SK-01) |
| 3b | Ingen ny hendelse. § 32.2 snevres inn i regelversjon n+1 (#220), og K-g1 har en underkategori som faller utenfor, for eksempel `SAMORD`. S-g1 er ikke godtatt | u1 er uten virkning etter n+1: hjemmelen gjelder ikke. Hovedgrunnen blir avslaget. D3 står uendret og merkes «avviker fra dagens utledning». Saker som endres, listes før utrulling (B-13) | Et nytt svar med u1 på `SAMORD` avvises | Samme regel brukes ved lesing og skriving. Endringen slår stille gjennom på gamle saker. Sendte brev merkes ikke |
| 3c | Som 3b, men S-g1 var «godkjent» med u1 «for sent», og TE godtok det i regelversjon n | Utledningen leser E-g1: utfallet er `avvist`, og saken forblir avslått (MM-U3). Visningen kan vise at u1 ikke ville hatt virkning etter n+1 | Ingen | Saken går fra `LUKKET_AVSLATT` til grunnlag `godkjent` og `UNDER_BEHANDLING` uten ny hendelse. Det skjer alt med en eldre hendelse ved EO (K 09.10) |
| 3d | Som 3c, men regelendringen kommer etter BHs svar og før TEs aksept. D3 ble sendt i regelversjon n. TE åpner aksepten i n+1 | Brevet avviker fra dagens utledning: etter n+1 er u1 uten virkning, mens beslutningsgrunnlaget sier «prinsipalt prekludert». Visningen viser avviket. S-g1 kan ikke godtas (MM-U4) | TE: ingen aksept av S-g1. BH: revidere S-g1 etter gjeldende regler, som ventende handling (GR-U4). Når BH har svart på nytt, kan TE godta det nye svaret | En aksept godtas, og utfallet regnes av gjeldende regler ved hver lesing. TE ser ikke at brevet avviker |

**Hva forløpet viser.** Et brev er ett dokument, men ikke én rettslig handling
(MP-04). Med utsagnene atskilt kan en regelendring treffe ett av dem og la det
andre stå. Hovedgrunnen er en utledning, ikke en lagret rekkefølge, så brevet
kan bevares mens dagens utledning endres. 3b og 3c skiller seg bare i at TE har
godtatt svaret. Enighetsgrunnlaget er det som gjør forskjellen synlig i dataene.
3d viser hvorfor en aksept må bygge på et brev som stemmer med dagens utledning.
Ellers ville TE godta noe annet enn det byggherren skrev (MM-U4).

### Forløp D: et varsel registrert etter et senere krav

Vedtaket om SK-12 05.10, MM-U1, B-13 om preklusjon etter § 33.4, B-16. Rader
KA-09 og KA-19.

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| 1 | Ingenting. TE sender varsel etter § 33.4 med e-post 02.09, utenfor appen | Ingen opplysning. At journalen er tom, beviser ikke at varselet ikke er sendt | — | Som modellen |
| 2 | D2 TE, registrert 20.09: krav K-f1, spesifisert, 20 dager, sendt 20.09 | Varselet etter § 33.4: ikke registrert. At det spesifiserte kravet også regnes som varsel, er en utledning, ikke et registrert varsel | BH: svare | `_handle_frist` setter `frist_varsel` lik `spesifisert_varsel` når varselet mangler |
| 3 | D3 BH, 25.09: S-f1 → K-f1. u1: rettidighet § 33.4 «for sent» → varselet utledet av K-f1. u2: dager 20 | Prinsipalt avslått, preklusjonen trukket av systemet (B-13). Subsidiært 20 dager. u1 gjelder varselet slik det var registrert 25.09 | TE: godta S-f1 | Som modellen |
| 4 | D4, registrert 28.09 av en bruker hos TE. Dokumentet er e-posten: avsender TE, sendt 02.09 oppgitt av TE, mottatt ikke oppgitt, e-posten som dokumentasjon. Utsagn v1: varsel § 33.4 | Varselet er registrert for første gang (MM-U1). Opplysninger: sendt 02.09 ifølge TE, mottak ukjent. BH har ikke tatt stilling til rettidigheten av v1. u1 gjelder et annet varsel, så preklusjonen er uavklart. D3 står uendret. Har TE godtatt S-f1 før D4, gjelder enighetsgrunnlaget (KA-U1) | BH: revidere S-f1, hvis det ikke er godtatt, eller bestride opplysningen | Varselet kan bare komme inn som felt i en ny kravversjon, og den overskriver varselet (SK-12). Bygges #264 slik issuet beskriver, avvises D4 fordi datoen avviker fra den utledede 20.09 |
| 5 | D5 BH, 30.09: b1 bestridelse → opplysningen om D4: «ikke mottatt» | Opplysninger: sendt 02.09 ifølge TE, mottak bestridt av BH. Systemet avgjør ikke hvem som har rett, og preklusjonen faller ikke av seg selv (MM-U1). Etiketter: «sendt ifølge TE», «mottak bestridt», «BH har ikke vurdert rettidigheten av varselet 02.09» | BH: revidere S-f1 med et standpunkt til v1. TE: legge fram mer dokumentasjon | Finnes ikke |
| 6 | D6 TE: varsel § 33.4, sendt 01.08 | — | Avvises: varselet er registrert (SK-12, rad KA-19). En feilregistrering rettes etter B-16 ([#276](https://github.com/khjohns/endringsmeldinger/issues/276)) | Godtas og flytter datoen (SK-12) |

**Hva forløpet viser.** Varselet er et eget utsagn i et eget dokument, ikke et
felt i kravet. Dokumentet skiller parten som sendte det, brukeren som
registrerte det, dokumentasjonen, og tidspunktene for sending, mottak og
registrering. Bestridelsen i steg 5 er et utsagn som viser til en opplysning,
ikke en endring av den. SK-12 låser det som er registrert (MM-U1).

### Forløp E: en hendelse kjernen ikke kjenner, og svaret knyttet til referansen

B-10, SP-04, MM-U2, #273. [Merknaden 07.10 til B-10](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger).

| Steg | Journal | Utledning etter steget | Handlinger | I dag |
| --- | --- | --- | --- | --- |
| E1-1 | D1 TE: krav K-v1, 100 000 kr. D2 TE: krav K-v2, 120 000 kr | Gjeldende krav: K-v2. Venter på svar | BH: svare på K-v2 | Som modellen |
| E1-2 | D3 BH: S-v1 → K-v1, lagret etter D2. Kilden er en eldre skriver i overgangen eller importert historikk | S-v1 gjelder K-v1 og er historikk. Vederlaget venter fortsatt på svar på K-v2 | BH: svare på K-v2. TE: ingen aksept | S-v1 knyttes til K-v2 og blir gjeldende svar, og en aksept av det godtas (K 09.10; SP-04). Python regner `bh_respondert_versjon` av antall kravversjoner |
| E1-3 | D3 viser til en kravversjon som ikke finnes i saken | Saken er ikke forstått | Ingen | Svaret knyttes til gjeldende krav |
| E1-4 | To svar på K-v2, ingen av dem `erstatter` det andre | Saken er ikke forstått. Kjernen velger ikke det siste | Ingen | Det siste svaret blir gjeldende |
| E2-1 | D4 BH, skrevet av Python: forespørsel etter § 33.6.2 (`frist_foresporsel_sendt`). Kjernen kjenner ikke typen | Saken er ikke forstått. Journalen kan leses, og D4 vises som «ikke tolket av denne versjonen». Status og handlinger utledes ikke | Ingen bindende kommandoer for noen part. Journalen og interne notater er tilgjengelige, og visningen sier at et varsel med frist må sendes utenfor appen (MM-U2) | Kjernen kaster `UkjentHendelse` (K 09.10), og prøveserveren svarer 422. Python avviser en ukjent typestreng i `parse_event` og hopper over en kjent type uten behandler i `compute_state` med en logglinje |
| E2-2 | Ny kjerne skriver format 2 på saken. Utrullingen rulles tilbake | Den gamle kjernen forstår ikke saken og stopper den. Andre saker går. Ingen rad skrives om. I saker med bare format 1 er bufferen skrevet av den nye kjernen, så den samsvarer ikke og bygges om | Ingen i saken | Ikke prøvd (#273) |
| E2-3 | Regelversjon eller projeksjonsversjon økes, uten nye hendelser | Bufrede resultater med eldre versjon bygges om. Endrede saker listes før utrulling. Beslutningsgrunnlag, enighetsgrunnlag og sendte brev står | — | De bufrede feltene har ingen versjon |

**Hva forløpet viser.** Kjernen kan ikke hoppe over forespørselen. Den utløser
TEs plikt etter § 33.6.2 og avgjør senere om spesifiseringen kom i tide (MP-01).
En kjerne som overså den, ville vurdert spesifiseringen på feil grunnlag. Med
`gjelder` og `erstatter` som relasjoner gir en eldre eller fremmed rad samme
resultat som en rad fra den kontrollerte skriveren, eller den stopper saken.
Den knyttes aldri til feil krav eller feil svar.

## 4. Hva modellen betyr for kjernen og bevisene

| Del av `sprakprove/kjerne/` | Vurdering |
| --- | --- |
| `regler/`, `belop.ts`, `sammenlikning.ts` | Kan gjenbrukes. De regner ut innholdet i ett utsagn |
| `kontrakt.ts` | Kan gjenbrukes for kommandoene |
| `godkjenning.ts` | Grensen kan gjenbrukes. Den lager beslutningsgrunnlaget |
| `sak.ts` | Formes på nytt. `Sportilstand` med ett svar per spor blir dokumenter, svar og utsagn med `gjelder` og `erstatter`. `anvend` bruker relasjonene. `sporstatus` og `samletStatus` flyttes til visningen |
| `forretningsregler.ts` | Formes på nytt. `sakIkkeLukket` erstattes av predikatene, og reglene deles i forutsetninger og nyttelastkontroll |
| `offentlig.ts` | Blir visningen av utledningen |

**Bevis-sakene.** Domeneforventningene i domenetabellen kan føres videre.
Feltstiene og adapterne må gjennomgås, og det samme må forventningene som MM-U1
og MM-U3 endrer:
- KA-19 må skille et registrert varsel fra et utledet.
- En ny rad trengs for et varsel registrert etter et senere krav (forløp D).
- En ny rad trengs for en godtatt preklusjon etter en regelendring (forløp C, 3c).

De genererte forløpene får ni nye invarianter:
1. En handling tilbys hvis og bare hvis forutsetningene for kommandoen holder.
2. Et svar gjelder kravet det viser til, også når raden er lagret senere.
3. Gjeldende svar følger `erstatter`, ikke rekkefølgen.
4. En sak med en ukjent hendelse eller en tvetydig relasjon godtar ingen
   bindende kommando.
5. En regelendring endrer ikke et beslutningsgrunnlag, et enighetsgrunnlag
   eller et sendt brev. Virkningen av en betinget enighet kan endres når
   vilkåret blir oppfylt.
6. En aksept gjelder ett svar, også når brevet har flere.
7. En aksept med en annen regelversjon eller et annet enighetsgrunnlag enn
   serverens utregning avvises, og journalen er uendret. Det samme gjelder en
   aksept av et svar der brevet avviker fra dagens utledning (MM-U4).
8. Et bufret resultat brukes bare når versjonene samsvarer, også etter en
   tilbakerulling.
9. Ingen forretningsregel leser statusen eller etikettene. Det håndheves med en
   arkitekturtest: reglene importerer ikke visningen.

Sju feilinnføringer hører til:
- reglene leser samlet status igjen;
- `anvend` knytter svaret til gjeldende krav;
- en ukjent hendelse hoppes over;
- virkningen av en godtatt preklusjon regnes på nytt etter en regelendring;
- serveren fryser sitt eget enighetsgrunnlag uten å sammenlikne med klientens;
- en aksept godtas selv om brevet avviker fra dagens utledning;
- et bufret resultat fra en nyere kjerne brukes etter en tilbakerulling.

## 5. Spørsmål til oppdragsgiver

Tre steder krevde modellen et domenevalg som ikke var vedtatt. Oppdragsgiver
valgte det anbefalte alternativet i alle tre 09.10. Vedtakene står i hovedplanen
som MM-U1, MM-U2 og MM-U3; teksten under er grunnlaget. MM-U3 ble presisert
samme dag etter review: innholdet i enigheten ligger fast, og om vilkåret er
oppfylt, utledes løpende. Steg 3d i forløp C ga MM-U4: et svar der brevet
avviker fra dagens utledning, kan ikke godtas før byggherren har svart på nytt.

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
regelendring som endrer gamle saker, krever eget vedtak. Spørsmålet var om
virkningen av en *enighet* er et avledet standpunkt i den forstand.

## 6. Hva forslaget ikke avgjør

- Om `sprakprove/kjerne/` blir produksjonskjernen, rekkefølgen for portering,
  og valget mellom serverlaget i SvelteKit, en egen backend og en Python-worker
  (B-14, 09.10).
- Omfanget av § 32.2 (#220) og korrigering av låste opplysninger (B-16, #276).
- Om sending eller mottak avgjør rettidigheten etter en bestemmelse, og hvordan
  en bestridt opplysning avklares. Modellen holder opplysningene og
  bestridelsen; den avgjør ikke hvem som har rett.
- Ordlyden i B-03 om ett spor per brev, sammenholdt med godkjenningsbrevet.
- Et nytt lagringsformat. Kolonnen `format`, projeksjonsversjonen og
  enighetsgrunnlaget som felt er forslag til B-10 (#273), ikke valgt.
- Utsagnene for forsering, endringsordre og innsigelser etter § 5.
- Hvordan et avvik mellom brev og utledning avgjøres for et svar uten lagret
  beslutningsgrunnlag, for eksempel registrert korrespondanse eller et eldre svar
  (MM-U4).
- GR-25, om en aksept av et fullt godkjent svar skal avvises eller godtas uten
  virkning. Modellen fungerer med begge, og avvisningen i 2.6 er foreløpig. En
  implementasjon skal ikke avgjøre spørsmålet.

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
`snapshot` i [services/approval_letter.py](../backend/services/approval_letter.py);
`cached_*`-kolonnene i migrasjonene.

**Fra hovedplanen og domenetabellen, ikke kjørt her:** Python-atferden i
forløpene, utfallet av radene i domenetabellen og funnstatusen for SK-04,
SK-12 og SP-04.

**Ikke kontrollert:** at modellen kan implementeres som beskrevet. Forløpene er
gjennomgått på papir, ikke kjørt i en implementasjon av modellen. Heller ikke
kontrollert: lagring og gjenlesing, utrulling og tilbakerulling, hvordan Python
leser en sak med en ukjent hendelsestype i lageret, og hele domenet utenfor de
fem forløpene. Det er ikke gjort noen ny juridisk vurdering av NS 8407.
Forventningene bygger på vedtakene som er nevnt.
