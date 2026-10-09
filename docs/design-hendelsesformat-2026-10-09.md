# Design: lagringsformatet for hendelsene TS skriver (B-10, #273)

**Dato:** 2026-10-09. **Kontrollert commit:** `843ab2f`.
**Status:** forslag. Formatet er ikke vedtatt. Det bygges inn i kjernemappa
etter [#308](https://github.com/khjohns/endringsmeldinger/issues/308)
([arbeidsvalget 09.10 i #273](https://github.com/khjohns/endringsmeldinger/issues/273#issuecomment-6087660542)).
Strategivedtaket føres under B-10 i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
når oppdragsgiver har svart på spørsmålene i avsnitt 8.

Dokumentet skiller tre ting:
- **Vedtatt**: et vedtak i hovedplanen, med ID og lenke.
- **Foreslått**: valget dette dokumentet gjør eller anbefaler.
- **Lest i koden (L 09.10)**: dagens form i målmodellen i
  [`sprakprove/maalmodell/`](../sprakprove/maalmodell/) på `843ab2f`.

Versjonering, utrulling og tilbakerulling mellom TS-versjoner hører til
[#316](https://github.com/khjohns/endringsmeldinger/issues/316). Dette dokumentet
fastsetter bare hvordan formatversjonen står i raden.

## 1. Kort fortalt

**Foreslått:**
- **Én rad per dokument.** Hver melding fra én part er én rad i `hendelse`
  med typen `dokument_registrert`. Raden har kravene, svarene og utsagnene i
  dokumentet, og beslutningsgrunnlaget hvis den har svar. Et brev med flere
  svar lagres dermed med én `INSERT`, og saksversjonen øker med én.
- **Uttrykkelige referanser.** Serveren gir hvert krav, svar, utsagn og hver
  opplysning sin egen UUID. Relasjonene står som ID-er i `data`, med `gjelder`
  og `erstatter`. En referanse peker bakover i samme sak. En referanse som
  mangler, peker feil eller peker framover, gjør saken ikke forstått (MM-U2).
  Ingen leser går etter plassen i journalen.
- **Fryses i raden som skaper det.** Beslutningsgrunnlaget fryses i
  dokumentraden med svarene. Hva aksepten fryser, avhenger av spørsmål 2 i
  avsnitt 8.
- **Ingen `null` og ingen tomme verdier i `data`.** Et felt som mangler, betyr
  at parten ikke har sagt det, eller at det ikke hører til arten. Mangler et
  felt formatet krever, er raden ikke forstått. Formatversjonen står i en ny
  kolonne `format`.
- **Navn fra kontrakten:** svar, ikke respons. Tabellen over gamle og nye navn
  står i avsnitt 4.5, og byggeøkta fører den inn i domenetabellen.

Formatet lagrer utsagn og relasjoner. Det lagrer ingen status og ingen verdi
som oppsummerer et spor eller en sak.

## 2. Grunnlaget

**Vedtatt.** Formatet skal oppfylle disse vedtakene:

| Vedtak | Hva det krever av formatet |
| --- | --- |
| [B-17](plans/2026-09-16-godkjenning-og-varig-levering.md#b-17) og [merknaden til invariant 9](plans/2026-09-16-godkjenning-og-varig-levering.md#23-invarianter) | Formatet velges uten hensyn til Python-radene, og det bygges ingen kompatibilitetsleser. Kompatibiliteten gjelder mellom TS-versjoner |
| [B-10 med merknaden 07.10](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger) | Saksversjonen er atskilt fra versjonen som beregnet en projeksjon. Frosne brev og beslutninger beholdes. En ukjent rettslig relevant hendelse kan ikke hoppes over |
| [MM-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u2) | En hendelse kjernen ikke kan tolke, stopper bindende kommandoer i saken |
| [MM-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u9) | Virkningen av et sendt brev leses fra beslutningsgrunnlaget i brevet. Hvert svar TS skriver, også registrert korrespondanse, har beslutningsgrunnlag |
| [MM-U3](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u3) | Innholdet i en enighet fastsettes når den inngås. Om vilkåret er oppfylt, utledes løpende |
| [KA-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | Aksepten gjelder hele det konkrete svaret og viser til det |
| [KA-U4](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4) | En vurdering BH ikke har gjort, utelates i hendelsen. Ingen standardverdi |
| [KA-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u7) og [GR-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u10) | En enighet binder begge parter. En godkjenning av grunnlaget uten påberopt preklusjon er enighet ved sammenfall. Formatet må gjøre det mulig å se hvilket svar en enighet gjelder |
| [B-03](plans/2026-09-16-godkjenning-og-varig-levering.md#sendte-brev-regelendring-og-saker-kjernen-ikke-forstår) | Brevet er det autoritative uttrykket for partens standpunkt. Ordlyden «ett spor» er spørsmål 1 i avsnitt 8 |
| [Invariant 3](plans/2026-09-16-godkjenning-og-varig-levering.md#23-invarianter) og [FK](plans/2026-09-16-godkjenning-og-varig-levering.md#fk--koe--eo--og-forseringsdomenet-i-ts-b-17) | Et brev lagres med beslutningsgrunnlaget og leveringsintensjonen i samme transaksjon. Avbrudd før commit gir ingen endring |
| API-vedtaket 05.10, gjengitt i [`kontrakt.json`](domenetabell/kontrakt.json) (`$defs.rad`) | Et felt uten verdi utelates i `data`, «aldri `null`» |
| [Sikkerhetsinvariantene](../AGENTS.md#sikkerhetsinvarianter) | `event_id`, `tidsstempel` og aktørfeltene settes av serveren. En klientoppgitt relasjon utvider ikke tilgangen |

Begrepene er de i [modellforslaget, 2.2–2.5](forslag-maalmodell-2026-10-09.md#22-byggeklossene):
dokument, svar og utsagn med part, art, `gjelder` og `erstatter`. Modellforslaget
er ikke vedtatt som helhet.

## 3. Dagens form i målmodellen (L 09.10)

Målmodellen valgte ikke format. Den skriver dagens radform og legger nye felt
i `data`
([`skriving.ts`](../sprakprove/maalmodell/kjerne/skriving.ts),
[`leser.ts`](../sprakprove/maalmodell/kjerne/leser.ts)):

- **Ett brev blir én rad per svar.** Svarene bindes sammen med `dokument_id` i
  `data`. Atomisiteten kommer av at `leggTil` i
  [`lager.ts`](../sprakprove/server/lager.ts) skriver alle radene i én
  transaksjon. Det følger av én kommando og én `leggTil`, ikke av formatet.
- **Referanser.** Svaret på vederlag og frist viser til kravet i både
  `refererer_til_event_id` (kolonnen `referstoid`) og `vederlag_krav_id` eller
  `frist_krav_id`. Svaret på grunnlaget har ingen kravreferanse i `data`. En
  revisjon står som `original_respons_id`. Et trekk lagres som
  `{begrunnelse}` uten referanse.
- **Referanser leseren tar fra plassen i journalen.** Trekket knyttes til
  sporets siste krav (`sisteKrav`). Rettidigheten i et fristsvar knyttes til
  varselet som var registrert da raden ble lest (`fristvarsel`), ellers til
  varselet utledet av kravet.
- **Utsagns-ID-ene lages av leseren** som `<event_id>#rettidighet` og liknende.
  De er ikke lagret. `referstoid` er en UUID og kan ikke bære dem.
- **Frosset innhold.** `beslutningsgrunnlag` og `enighetsgrunnlag` fryses i
  hvert svar. `enighetsgrunnlag: null` betyr at svaret ikke skapte enighet. At
  feltet mangler, betyr at leseren skal utlede det. Aksepten fryser sitt eget
  `enighetsgrunnlag`.
- **Formatversjonen** står som `data.hendelsesformat`, og bare når formatet er
  over 1. Kjernens format står i `KJERNE.format` i
  [`regelsett.ts`](../sprakprove/maalmodell/kjerne/regelsett.ts).
- **Typene `frist_varsel_registrert` og `bestridelse_registrert`** finnes bare i
  målmodellen.

Tabellen `hendelse`
([migrasjonen](../supabase/migrations/20260920193558_hendelse_tabell.sql)):
`data` er `JSONB NOT NULL`. `event_type` har ingen `CHECK`. Det er én
`referstoid` (UUID uten fremmednøkkel), og `UNIQUE (sak_id, versjon)` gir
versjonskonflikten.

## 4. Forslaget

### 4.1 Raden og dokumentet: et brev med flere svar

**Foreslått.** Hvert dokument fra én part er én rad:

| Kolonne | Innhold i TS-formatet |
| --- | --- |
| `event_id` | Dokumentets ID. Satt av serveren |
| `event_type` | `dokument_registrert` for meldinger mellom partene. `sak_opprettet` for saken. Typene for EO- og forseringssakene velges i [#309](https://github.com/khjohns/endringsmeldinger/issues/309) |
| `versjon` | Saksversjonen. Ett dokument gir én versjon |
| `time` | *Registrert*, satt av serveren. Det eneste tidspunktet systemet selv vet ([2.4 i modellforslaget](forslag-maalmodell-2026-10-09.md#24-opplysninger-standpunkter-og-enighet-er-egne-dimensjoner)) |
| `actorid`, `actorteam` | Brukeren og teamet som registrerte dokumentet |
| `actorrole` | Parten. I format 1 er avsenderen alltid parten som registrerer (avsnitt 6) |
| `referstoid` | Ikke brukt. Relasjonene står i `data` (4.2) |
| `format` | Ny kolonne. Formatversjonen (4.4) |
| `data` | Innholdet under |

`data` i `dokument_registrert`, format 1:

| Felt | Innhold | Når |
| --- | --- | --- |
| `krav` | Liste over kravversjoner: `id`, `spor`, `erstatter` (forrige kravversjon i sporet) og innholdet i kravet | Når dokumentet har krav |
| `svar` | Liste over svar: `id`, `spor`, `gjelder` (kravversjonen), `erstatter` (svaret det reviderer), `regelversjon`, `standpunkter` og `utregning` | Når dokumentet har svar |
| `utsagn` | Liste over andre utsagn: `id`, `art`, `gjelder` og innholdet arten krever. Artene står i 4.5 | Når dokumentet har slike |
| `opplysninger` | Liste over opplysninger om dokumentet: `id`, `hva` (`sendt` eller `mottatt`) og `dato`, oppgitt av parten som registrerer | Når dokumentet er sendt utenfor appen |
| `dokumentasjon` | Vedleggs-ID-er som viser dokumentet, for eksempel e-posten | Når det finnes |
| `beslutningsgrunnlag` | Det som fryses for svarene (4.3) | Når og bare når dokumentet har svar |

Et dokument har minst ett krav, ett svar eller ett utsagn. Et brev sendt i
appen har ingen opplysning om sending: sendt er registrert.

Hvis spørsmål 1 besvares med (a), kan et dokument ha utsagn i flere spor. Et
brev fra godkjenningspakken med svar i tre spor er da én rad med tre svar og
ett beslutningsgrunnlag. Leveringsintensjonen skrives i samme transaksjon og
viser til `event_id` (FK, invariant 3).

**Alternativer:**
- *Én rad per svar med `dokument_id`*, som i målmodellen. Atomisiteten må da
  være en garanti i lageret og ikke i formatet. Leseren må samle radene, og må
  avgjøre hva et dokument med bare noen av radene betyr. Forkastet, fordi
  én rad gjør det ugyldige tilfellet umulig å lagre.
- *Én rad per spor* (spørsmål 1, (b)). Da blir godkjenningsbrevet tre dokumenter
  med tre leveranser, og B-03 kan stå som skrevet. Formatet ellers er det
  samme.
- *Én hendelsestype per dokumentart* (`svar_registrert`, `krav_registrert` og
  liknende). Et brev fra BH kan ha svar, innsigelser etter § 5 og en
  forespørsel samtidig ([MP-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#mp-u5)),
  og da finnes det ingen riktig type. Arten står derfor på utsagnet, ikke på
  raden. En art kjernen ikke kjenner, stopper saken på samme måte som en ukjent
  type (4.4).

**Tjener:** forløp A, steg 2 og 4. Ett brev har tre svar, og aksepten gjelder
ett av dem (F-MM-A, F-MM-A5a, F-MM-A5b). Forløp C, steg 2: ett svar har to
standpunkter (F-MM-C). Prøven av avbrudd før commit (7.3).

### 4.2 Referansene

**Foreslått.** Serveren gir hvert krav, svar, utsagn og hver opplysning en
UUID ved registreringen, på samme måte som `event_id`. En ID fra klienten for
et nytt element avvises (invariant 11). Klienten oppgir bare ID-er til
elementer som finnes, som `gjelder` og `erstatter`.

| Referanse | Fra | Til | Krav til målet |
| --- | --- | --- | --- |
| `krav.erstatter` | En kravversjon | Forrige kravversjon i sporet | Mangler bare på første versjon |
| `svar.gjelder` | Et svar | Kravversjonen det svarer på | Krav i samme spor. Gjelder også grunnlaget |
| `svar.erstatter` | En revisjon | Svaret den reviderer | Svar på samme kravversjon |
| `standpunkt.gjelder` (art `rettidighet`) | Et standpunkt om rettidighet | Et varsel, eller en kravversjon når standpunktet gjelder varselet utledet av kravet (MM-U1) | Arten bærer `hjemmel` |
| `utsagn.gjelder` (art `aksept`) | En aksept | Ett svar, ikke dokumentet (KA-U1) | Svar fra motparten |
| `utsagn.gjelder` (art `trekk`) | Et trekk | Gjeldende kravversjon i sporet | Krav fra samme part |
| `utsagn.gjelder` (art `bestridelse`) | En bestridelse | En opplysning eller et utsagn fra motparten ([MM-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u7)) | Fra motparten |

De andre standpunktene i et svar, ansvar, beløp, dager og hindring, gjelder
kravet svaret gjelder. De har ikke eget `gjelder`. Arten avgjør om feltet
finnes. Det er ikke fravær med en egen betydning.

**Leseregler.** Saken er ikke forstått når en referanse
- mangler der arten krever den;
- ikke finnes i saken, eller finnes i en annen sak;
- peker på et element av feil art eller i feil spor;
- peker på en rad med samme eller høyere saksversjon. Det utelukker at et
  svar erstatter seg selv (F-MM-E6), og ringer av revisjoner (F-MM-E7);
- eller når to kravversjoner eller to svar på samme kravversjon står uten
  `erstatter` mellom seg (forløp E1-4).

En referanse kan aldri gi tilgang til noe utenfor saken. Prosjektgrensen
håndheves før leseren får journalen.

**Alternativer:**
- *Referansen i `referstoid`.* Kolonnen er én UUID per rad. Den kan ikke bære
  flere referanser i ett dokument eller en referanse til et utsagn inne i en
  rad. Å bruke den for én referanse og `data` for resten gir to hjem.
- *Sammensatte ID-er (`<event_id>#<lokal>`).* Det kunne gjort dem lesbare, men
  da er ID-en til et utsagn avhengig av rekkefølgen i dokumentet. Kolonnen kan
  heller ikke bære dem.
- *Kravversjonen uten `erstatter`*, slik modellforslaget har det
  (`gjeldendeKrav` er sporets siste kravversjon). Det er en leser etter plassen
  i journalen, og en sent lagret kravversjon kan da bli gjeldende. Foreslått er
  å kjede kravversjonene som svarene. Det endrer ikke KA-U2, bare hvordan
  rekkefølgen leses.

**Tjener:** forløp E1-2 til E1-4 (F-MM-E1, F-MM-E3, F-MM-E4, F-MM-E6,
F-MM-E7): en sent lagret rad knyttes til kravet den sier, og stopper saken når
referansen ikke stemmer. Forløp D, steg 3–5 (F-MM-D, F-MM-D-godtatt): u1
gjelder varselet utledet av K-f1. Når varselet registreres i D4, gjelder u1
fortsatt det utledede varselet, og preklusjonen er uavklart
([MM-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u8)). Forløp A,
steg 3 (`erstatter`), og forløp B2 (trekket viser til K-g1, F-MM-B2).

### 4.3 Hva som fryses

**Foreslått, beslutningsgrunnlaget.** Det fryses i dokumentraden, i
`data.beslutningsgrunnlag`, med én del per svar som viser til svarets `id`.
Hver del har standpunktenes virkning slik brevet uttrykte dem, regelversjonen
og om svaret godkjenner hele kravet (sammenfall). Siden det står i samme rad
som svarene, finnes det ikke et svar uten beslutningsgrunnlag (MM-U9).
Innholdet i hver del formes av #308, der typen `Virkning` forsvinner. Formatet
fastsetter bare stedet, referansen til svaret, regelversjonen og at det er
skrevet av serveren.

**Foreslått, enigheten (avhenger av spørsmål 2).**
- Med (a) gjelder enigheten svaret med virkningen i beslutningsgrunnlaget.
  Aksepten er utsagnet `{id, art: "aksept", gjelder: <svar>, regelversjon}`.
  Regelversjonen er den TE fikk vist, og serveren kontrollerer den som for
  BHs svar (B-13). Innholdet leses fra beslutningsgrunnlaget til svaret
  aksepten gjelder, og har ett hjem. Ved sammenfall er det
  beslutningsgrunnlaget selv som sier at svaret godkjenner hele kravet. Det
  lagres ikke noe eget enighetsgrunnlag.
- Med (b) bærer aksepten i tillegg `enighetsgrunnlag`, frosset med reglene da
  aksepten ble registrert, slik målmodellen gjør i dag.

I begge tilfeller er det bare vilkåret som utledes løpende: at grunnlaget er
avklart for vederlag og frist (GR-U7, MM-U3). Det lagres ingen virkning
(`betinget`, `virksom`, `uten_virkning`) og ingen status.

**Alternativer:** et `enighetsgrunnlag` i hvert svar, slik målmodellen gjør
(`null` når svaret ikke skapte enighet). Etter MM-U9 er virkningen allerede
frosset i beslutningsgrunnlaget, så en kopi i svaret er et andre hjem.

**Avhenger av #308:** hvilke felt beslutningsgrunnlaget har, og om noe utover
regelversjonen må lagres i aksepten. Økta for #308 legger «hva som må lagres,
og hva som kan utledes» inn som kommentar i #273. Byggeøkta bruker den.

**Tjener:** forløp A, steg 2 og 4 (enighet ved sammenfall og ved aksept,
F-MM-A). Forløp C, 3b–3d (F-MM-C3b, F-MM-C3c, F-MM-C3d): brevet står etter en
regelendring, og en godtatt preklusjon regnes ikke om. F-MM-AC.

### 4.4 Fravær, tomhet og formatversjonen

**Foreslått, fravær og tomhet:**
1. `data` har ingen `null`, ingen tom liste og ingen tom streng. Det følger
   vedtaket 05.10 slik `kontrakt.json` gjengir det. Et felt uten verdi
   utelates.
2. Et felt som mangler, betyr én av to ting, og arten avgjør hvilken: parten
   har ikke sagt det (en vurdering BH ikke har gjort, KA-U4), eller feltet
   hører ikke til arten.
3. Mangler et felt arten krever i formatet, er raden ikke forstått. Det samme
   gjelder et felt formatet ikke kjenner. En skriver kan ikke skrive en rad
   «uten feltet», så skillet målmodellen har mellom `enighetsgrunnlag: null`
   og et manglende felt faller bort.
4. Standardverdier og verdier som regnes av andre lagrede verdier, lagres ikke.
   Eksempler er `vedlegg_ids: []`, `krevd_belop` og `netto_belop`
   ([SP-03 i modellforslaget, 2.3](forslag-maalmodell-2026-10-09.md#23-utsagnene-forløpene-trenger)).

**Foreslått, formatversjonen.** Den står i en ny kolonne `format`, et heltall
på minst 1, uten standardverdi. TS setter den på hver rad den skriver, lik
`format` i kjernen som skriver. Python setter den ikke, og en rad uten format
er ikke forstått av TS-kjernen (B-17).

En kjerne leser en rad bare når `format` er satt og ikke høyere enn kjernens.
Formatet økes når en eldre leser ellers ville lest en rad feil eller avvist
den: en ny art, et nytt felt, eller en endret betydning. Regel 3 betyr at
også et nytt valgfritt felt øker formatet. Hvordan økningen rulles ut og
tilbake, hører til #316.

**Tekniske valg** ([kommentaren 09.10 i #273](https://github.com/khjohns/endringsmeldinger/issues/273#issuecomment-6083294289)):
- Kolonne, ikke `data`, fordi formatet må kunne leses før `data` tolkes. Med en
  kolonne kan en spørring liste sakene med en rad i et nyere format før en
  tilbakerulling (#316), og `data` holdes til domeneinnhold.
- Kostnaden er en migrasjon. Med den følger `docs/datamodell/katalog.json`,
  `tabeller.toml`, kolonnelisten i `sprakprove/server/lager.ts`,
  `sprakprove/kjerne/rad.ts` og `HENDELSE_KOLONNER` i
  `backend/tests/fixtures/supabase_dobbel.py`. Det gjør byggeøkta.
- Alternativet `data.format` krever ingen migrasjon og er prøvd i målmodellen
  (`hendelsesformat`). Det blander metadata inn i domeneinnholdet og kan ikke
  leses uten at `data` tolkes.
- Bufferversjonene (projeksjonsversjon, regelversjon, høyeste format og
  saksversjon) står med bufferen, ikke i raden, slik `buffer.ts` gjør. Plasseringen
  i `sak_metadata` hører til #316.

**Tjener:** forløp E2-1 og E2-2 (F-MM-E5): en rad eller art kjernen ikke
kjenner, og en rad i et nyere format etter en tilbakerulling. Radene om
rettidighet som ikke er vurdert (KA-U4).

### 4.5 Navn fra kontrakten

**Foreslått.** Navnene følger «Språk» i [`AGENTS.md`](../AGENTS.md#språk) og
kontraktens ord: «svar», ikke «respons»; «varsel», «krav», «trekk»,
«innsigelse» og «forespørsel». Tabellen er forslaget. Navnetabellen i
[domenetabellen](domenetabell/README.md) eies av #308, og byggeøkta fører
navnene inn der.

| I dag (målmodellen og Python-epoken) | I TS-formatet | Grunnlag |
| --- | --- | --- |
| `respons_grunnlag`, `respons_vederlag`, `respons_frist` | Et element i `svar` i `dokument_registrert` | § 32.3, § 33.7: «svare» |
| `respons_*_oppdatert`, `original_respons_id` | `svar` med `erstatter` | Modellforslaget 2.2 |
| `refererer_til_event_id` / `referstoid`, `vederlag_krav_id`, `frist_krav_id`, `grunnlag_event_id` | `gjelder` | Modellforslaget 2.2 |
| `grunnlag_opprettet`, `grunnlag_oppdatert`, `vederlag_krav_sendt`, `vederlag_krav_oppdatert`, `frist_krav_sendt`, `frist_krav_oppdatert` | Et element i `krav`, med `erstatter` fra og med andre versjon | KA-U2. § 5: «krav» |
| `te_aksepterer_respons` | Utsagn med art `aksept` | KA-U1. § 34.2.2: «akseptert» |
| `grunnlag_trukket`, `vederlag_krav_trukket`, `frist_krav_trukket` | Utsagn med art `trekk` | KA-U6, GR-U5 |
| `frist_varsel` i kravet, `frist_varsel_registrert` | Utsagn med art `varsel` og `hjemmel`, med opplysningen `sendt` | § 33.4: «varsle». MM-U1 |
| `bestridelse_registrert` | Utsagn med art `bestridelse` | MM-U7 |
| `frist_foresporsel_sendt` | Utsagn med art `foresporsel` | § 33.6.2: «forespørsel». Endelig form i #309 |
| `frist_innsigelse_sendt` | Utsagn med art `innsigelse` | § 5 tredje ledd, VS-U1. Endelig form i #309 |
| `grunnlag_varslet_i_tide`, `frist_varsel_ok`, `spesifisert_krav_ok` | Standpunkt med art `rettidighet`, `gjelder`, `hjemmel` og `i_tide` | KA-U4. § 5 tredje ledd: «i tide» |
| `resultat` i grunnlagssvaret | Standpunkt med art `ansvar` | § 32.3 a–c |
| `vilkar_oppfylt` | Standpunkt med art `hindring`, `oppfylt` | § 33.1: «fremdriften hindres» |
| `beregnings_resultat`, `total_godkjent_belop`, `godkjent_dager` og de subsidiære feltene | `utregning` i svaret (B-13). Feltene formes av #308 | B-13 |
| `dokument_id` | `event_id` på dokumentraden | — |
| `hendelsesformat` i `data` | Kolonnen `format` | — |

Verdiene skrives med små bokstaver i `snake_case`, med æ, ø og å som ae, oe og
aa (`foresporsel`, `belop`). `sak_opprettet` beholdes.

**Alternativ:** `dokument` eller `melding` som hendelsestype.
`dokument_registrert` er valgt fordi raden er serverens registrering av
dokumentet, og fordi registrering, sending og mottak er tre ulike tidspunkter
(2.4 i modellforslaget). Typen følger formen `sak_opprettet`.

**Tjener:** alle forløpene. Bevis-sakene i
[`bevis-saker-maalmodell.json`](domenetabell/bevis-saker-maalmodell.json) bruker
handlinger (`krav`, `brev`, `aksept`) og ikke hendelsesnavn, unntatt
`"handling": "rad"` i forløp E. Der skrives radene på nytt i format 1 (7.1).

### 4.6 Hva som lagres og hva som utledes

**Foreslått:**

| Lagres | Utledes ved lesing |
| --- | --- |
| Utsagnene slik parten ga dem: krav, svar med standpunkter, varsel, aksept, trekk, bestridelse, forespørsel og innsigelse | Gjeldende krav og gjeldende svar, etter `erstatter` |
| Relasjonene `gjelder` og `erstatter` | At et svar er subsidiært fordi grunnlaget er avslått i et annet brev (merknaden 09.10 til regelversjon under B-13) |
| Opplysningene om sending og mottak, med hvem som oppga dem | Om vilkåret for en enighet er oppfylt: betinget, virksom eller uten virkning (MM-U3) |
| Serverens utregning etter B-13 (`utregning`) | Trukket, oppgjort og avsluttet, også at vederlag og frist er trukket når grunnlaget er trukket (GR-U5) |
| Beslutningsgrunnlaget per brev, og eventuelt enighetsgrunnlaget (spørsmål 2) | Status, etiketter og handlinger |
| Regelversjonen i hvert svar og i aksepten | Varselet utledet av et fristkrav når ikke noe varsel er registrert (MM-U1) |

Det kjernen leser, er lagret (DM-06). Ingen regel leser noe fra høyre kolonne
som er lagret. Høyre kolonne lagres heller ikke som buffer i raden.

**Avhenger av #308:** feltene i `utregning` og i beslutningsgrunnlaget, og om
noe annet enn det over må lagres for at én felles vurdering av svaret skal gi
samme resultat ved lesing.

**Tjener:** forløp B2 (trekk av grunnlaget skriver ingen nye hendelser,
F-MM-B2), forløp A5b (vilkåret blir oppfylt uten at enigheten endres,
F-MM-A5b) og forløp C3b (subsidiariteten endres med reglene, F-MM-C3b).

## 5. Når saken er forstått

**Foreslått.** Leseren for format 1 gjør ett av to for hver rad: leser den i
modellens form, eller merker den som ikke forstått med en grunn. Saken er ikke
forstått når minst én rad ikke er forstått (MM-U2). Grunnene er:
- `format` mangler eller er høyere enn kjernens;
- `event_type` eller en art er ukjent;
- `data` har et ukjent felt, `null`, en tom verdi, eller mangler et felt arten
  krever (4.4);
- en referanse bryter en av lesereglene i 4.2.

Ingen grunn løses ved å gjette, og ingen rad hoppes over.

## 6. Det formatet ikke avgjør

- **Avsender som ikke er parten som registrerer.** I format 1 er avsenderen
  `actorrole`, og opplysningene i dokumentet er oppgitt av samme part. At en
  part registrerer et dokument fra motparten, for eksempel et brev mottatt i
  posten, er ikke vurdert. Det kan legges til i et senere format med et eget
  felt.
- **Utsagnene for endringsordre og forsering** og de endelige feltene for
  forespørsel og innsigelse. De hører til #309.
- **Innholdet i beslutningsgrunnlaget og utregningen.** Det hører til #308.
- **Dokumentnøkkelen og navnestandarden i Catenda** står åpne under B-03.
- **Utrulling, tilbakerulling og bufferen i `sak_metadata`.** Det hører til #316.
- **Registeret for hendelsestypene.** `docs/datamodell/hendelser.toml` er
  bundet til Pythons `EventType`, så TS-typene har ikke noe hjem der ennå.
  Meldt i [#320](https://github.com/khjohns/endringsmeldinger/issues/320).

## 7. Prøveplan for byggeøkta

Byggeøkta kommer etter at #308 er flettet. Den bygger formatet inn i
kjernemappa og kjører prøvene mot testbasen med `KOE_TESTBASE_URL`. Prøvene
skal vise til vedtakene i avsnitt 2, ikke til koden.

### 7.1 Lagring og gjenlesing for forløp A–E

1. Kjør hvert forløp i `bevis-saker-maalmodell.json` gjennom kommandoen,
   lageret og gjenlesingen. Utledningen etter gjenlesingen skal være lik
   utledningen i minnet, og kontrollene i bevis-sakene skal holde.
2. Kontroller hver lagret rad mot et skjema for format 1. Raden skal ha
   `format` satt, ingen `null` og ingen tomme verdier i `data`. Et dokument
   skal gi én rad, også brevet med tre svar i forløp A, og saksversjonen skal
   øke med én per dokument.
3. Skriv radene i forløp E (`"handling": "rad"`) på nytt i format 1, med
   feilene de prøver: et svar på en eldre kravversjon lagret senere (F-MM-E1),
   en referanse som ikke finnes (F-MM-E3), to svar uten `erstatter` (F-MM-E4),
   et svar som erstatter seg selv (F-MM-E6) og en ring (F-MM-E7). Legg til en
   rad med ukjent art og en rad med `format` 2 (F-MM-E5). Hver av dem skal gi
   en sak som ikke er forstått, og avvise alle bindende kommandoer.
4. Prøv at en referanse til et element i en annen sak gir en sak som ikke er
   forstått, og at innholdet i den andre saken ikke vises.

### 7.2 Feilinnføring som fjerner en referanse

Legg feilklassene i feilinnføringsfila for kjernen (i dag
[`sprakprove/maalmodell/feilinnforing.ts`](../sprakprove/maalmodell/feilinnforing.ts)).
Innfør én om gangen, og vis at prøven i 7.1 feiler på virkningen, ikke på
oppsettet:

| Feilinnføring | Forventet rød prøve |
| --- | --- |
| Skriveren utelater `svar.gjelder` | Skjemakontrollen i 7.1.2, og gjenlesingen gir en sak som ikke er forstått |
| Skriveren utelater `gjelder` i et standpunkt om rettidighet | Forløp D: preklusjonen i u1 blir ikke uavklart etter D4 (MM-U8) |
| Skriveren utelater `gjelder` i aksepten | Forløp A, steg 4: enigheten gjelder ikke S-v2 |
| Skriveren utelater `gjelder` i trekket | Forløp B2 og F-MM-B3 |
| Skriveren utelater `svar.erstatter` eller `krav.erstatter` | Forløp A, steg 3, og E1-4: to svar uten `erstatter` stopper saken |
| Leseren faller tilbake til plassen i journalen når en referanse mangler | F-MM-E1 og F-MM-E3 |

### 7.3 Avbrudd før commit for et brev med flere svar

1. Send brevet i forløp A, steg 2, med tre svar.
2. Avbryt transaksjonen etter at raden og leveringsintensjonen er skrevet,
   men før `COMMIT`. Bruk en kastende krok i lageret og en avbrutt forbindelse.
3. Journalen, saksversjonen og leveringsintensjonen skal være uendret. Ingen
   rad skal finnes for dokumentet.
4. Send samme kommando igjen. Den skal gi ett dokument med tre svar og ett
   beslutningsgrunnlag.

Besvares spørsmål 1 med (b), blir det tre rader. Avbruddet prøves da også
etter andre rad. Finnes ikke leveringsintensjonen i TS-stien ennå, skal prøven
si det, og kravet hører til #310.

### 7.4 Det byggeøkta også gjør

- Migrasjonen for `format`, og filene som følger med (4.4).
- Navnene i domenetabellen (4.5).
- Strategivedtaket i hovedplanen under B-10, hvis det ikke er ført i runde 1.

## 8. Spørsmål til oppdragsgiver

Spørsmålene ble sendt til oppdragsgiver gjennom orkestratoren 09.10, med
alternativer, belegg og anbefaling. Svarene føres her og i hovedplanen.

**Spørsmål 1: kan ett brev inneholde svar og andre utsagn i flere spor?**
(a) Ja: et brev er fra én part, og hvert svar gjelder én kravversjon. «Ett
spor» i B-03 utgår. (b) Nei: B-03 etter ordlyden, og godkjenningsbrevet blir
tre brev. (c) Som (a) for BH, men ett spor per brev fra TE. Belegg: § 5 første
ledd krever skriftlighet, ikke ett skriv per krav. § 33.6.2 første ledd: en
forespørsel «skal sendes per brev». MP-U5: flere innsigelser i ett brev.
Anbefalt: (a). *Svar: venter.*

**Spørsmål 2: hva fryser en enighet når reglene er endret mellom brevet og
aksepten?** MM-U3 sier: «virkningen av en enighet fastsettes når den inngås. Har TE godtatt et svar, gjelder enigheten svaret med alle standpunktene slik det ble godtatt (KA-U1), også når en senere regelendring ville gitt et standpunkt i svaret en annen virkning.» Merknaden 09.10 til raden presiserer: «innholdet i en enighet fastsettes når den inngås: svaret, standpunktene og virkningen de hadde etter reglene da.» MM-U9 sier at et sendt brev beholder virkningen det hadde da det ble sendt. Uklart er om «reglene da» er reglene da brevet ble sendt eller da TE godtok det. (a) Svaret med virkningen brevet hadde (beslutningsgrunnlaget), og
aksepten viser bare til svaret og regelversjonen. (b) Virkningen etter reglene
da aksepten ble registrert, som en egen kopi i aksepten. Belegg: § 34.2.2
første ledd («akseptert et tilbud»), B-03 (brevet er det autoritative
uttrykket), KA-U1, MM-U3 og MM-U9. Anbefalt: (a). *Svar: venter.*

## Verifikasjon og grenser

**Lest i koden (L 09.10, `843ab2f`):** `skriving.ts`, `leser.ts`, `typer.ts`,
`regelsett.ts` og `kommando.ts` i `sprakprove/maalmodell/kjerne/`;
`buffer.ts`; `leggTil` og kolonnelisten i `sprakprove/server/lager.ts`;
migrasjonen for `hendelse`; `$defs.rad` i `kontrakt.json`; toppen av
`docs/datamodell/hendelser.toml` og `test_hendelseskatalog.py`; forløpene i
`bevis-saker-maalmodell.json`.

**Fra hovedplanen og modellforslaget:** vedtakene i avsnitt 2 og forløpene
A–E. NS 8407 er lest i teksten som ble fjernet fra repoet i `507e2254`,
§ 5, § 32.2–32.3, § 33.4–33.8 og § 34.1–34.2. Det er ikke gjort noen ny
juridisk vurdering ut over spørsmålene i avsnitt 8.

**Ikke kontrollert:** formatet er ikke implementert, ikke lagret og ikke lest
igjen. Ingen prøve er kjørt. At én rad per dokument passer med leveringen i
Python og Catenda, er ikke kontrollert. Det samme gjelder at feltene for
utregningen og beslutningsgrunnlaget dekker #308.
