# Design: lagringsformatet for hendelsene TS skriver (B-10, #273)

> **Merknad 2026-10-10:** formatet er vedtatt med
> [HF-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u1) og
> [HF-U2](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u2), og bygget i
> [`kjerne/`](../kjerne/) (#273, PR #340). Koden og navnetabellen i
> [domenetabellen](domenetabell/README.md) gjelder der de avviker fra forslaget
> her. Eksempler er `grunnlag` i stedet for `ansvar`, `beloep`, `virkninger`
> og `uten_virkning` (HF-U2). Notatet står som begrunnelse for valgene.

**Dato:** 2026-10-09. **Kontrollert commit:** `843ab2f`.
**Status:** forslag. Formatet er ikke vedtatt. Byggeøkta bygger det inn i
kjernemappa ([arbeidsvalget 09.10 i #273](https://github.com/khjohns/endringsmeldinger/issues/273#issuecomment-6087660542)).
Merknaden under B-10 i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
viser hit. Oppdragsgiver svarte 09.10 på tre domenespørsmål (avsnitt 8). Svarene
er vedtakene [MM-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u10), [KA-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u10) og [MM-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u11) i 3.1 i hovedplanen.

Dokumentet skiller tre ting:
- **Vedtatt**: et vedtak i hovedplanen, med ID og lenke.
- **Foreslått**: valget dette dokumentet gjør eller anbefaler.
- **Lest i koden (L 09.10)**: dagens form i målmodellen i
  [`sprakprove/maalmodell/`](https://github.com/khjohns/endringsmeldinger/blob/843ab2f/sprakprove/maalmodell/) på `843ab2f`.

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
- **Fryses i svaret.** Hvert svar har sitt beslutningsgrunnlag i
  dokumentraden, med virkningen hvert standpunkt hadde og om svaret godkjenner
  hele kravet (MM-U11). Utfallet i sporet og vilkåret for enigheten utledes av
  de frosne standpunktene og lagres ikke. Enigheten gjelder svaret med den
  virkningen brevet hadde, også ved aksept (KA-U10). Aksepten viser bare til
  svaret og regelversjonen TE fikk se, og har ingen kopi.
- **Ingen `null` og ingen tomme verdier i `data`.** Om et svar skapte enighet
  ved sammenfall, står som `true` eller `false`. Et felt som mangler, betyr
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
| [B-03](plans/2026-09-16-godkjenning-og-varig-levering.md#sendte-brev-regelendring-og-saker-kjernen-ikke-forstår) | Brevet er det autoritative uttrykket for partens standpunkt. «Ett spor» utgår etter MM-U10 |
| [Invariant 3](plans/2026-09-16-godkjenning-og-varig-levering.md#23-invarianter) og [FK](plans/2026-09-16-godkjenning-og-varig-levering.md#fk--koe--eo--og-forseringsdomenet-i-ts-b-17) | Et brev lagres med beslutningsgrunnlaget og leveringsintensjonen i samme transaksjon. Avbrudd før commit gir ingen endring |
| API-vedtaket 05.10, gjengitt i [`kontrakt.json`](domenetabell/kontrakt.json) (`$defs.rad`) | Et felt uten verdi utelates i `data`, «aldri `null`». Vedtaket gjelder API-et; formatet tar det med inn i journalen (4.4) |
| [MM-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u10), [KA-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u10) og [MM-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u11), svarene 09.10 (avsnitt 8) | Ett brev kan ha utsagn i flere spor. Enigheten gjelder svaret med virkningen i brevet, og aksepten lagrer svaret og regelversjonen. Beslutningsgrunnlaget fryser standpunktene og sammenfallet, ikke utfallet og vilkåret |
| [KA-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u11), [KA-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u12) og [EO-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u5) | Predikatene «kravene er avgjort» og «kan inngå i endringsordre» leses av utsagnene. TE kan si «ingen krav» i et spor som ikke er sendt |
| [KA-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u8) | En kravversjon på 0 dager eller 0 kr finnes ikke |
| [Invariant 6](plans/2026-09-16-godkjenning-og-varig-levering.md#23-invarianter) | Dokumentgrunnlaget fryses ved commit, og en retry leverer samme dokument |
| [Sikkerhetsinvariantene](../AGENTS.md#sikkerhetsinvarianter) | `event_id`, `tidsstempel` og aktørfeltene settes av serveren. En klientoppgitt relasjon utvider ikke tilgangen |

Begrepene er de i [modellforslaget, 2.2–2.5](forslag-maalmodell-2026-10-09.md#22-byggeklossene):
dokument, svar og utsagn med part, art, `gjelder` og `erstatter`. Modellforslaget
er ikke vedtatt som helhet.

## 3. Dagens form i målmodellen (L 09.10)

Målmodellen valgte ikke format. Den skriver dagens radform og legger nye felt
i `data`
([`skriving.ts`](https://github.com/khjohns/endringsmeldinger/blob/843ab2f/sprakprove/maalmodell/kjerne/skriving.ts),
[`leser.ts`](https://github.com/khjohns/endringsmeldinger/blob/843ab2f/sprakprove/maalmodell/kjerne/leser.ts)):

- **Ett brev blir én rad per svar.** Svarene bindes sammen med `dokument_id` i
  `data`. Atomisiteten kommer av at `leggTil` i
  [`lager.ts`](https://github.com/khjohns/endringsmeldinger/blob/fc19484/sprakprove/server/lager.ts) skriver alle radene i én
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
  [`regelsett.ts`](https://github.com/khjohns/endringsmeldinger/blob/843ab2f/sprakprove/maalmodell/kjerne/regelsett.ts).
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
| `svar` | Liste over svar: `id`, `spor`, `gjelder` (kravversjonen), `erstatter` (svaret det reviderer), `regelversjon`, `standpunkter`, `utregning` og `beslutningsgrunnlag` (4.3) | Når dokumentet har svar |
| `utsagn` | Liste over andre utsagn: `id`, `art`, `gjelder` og innholdet arten krever. Artene står i 4.5 | Når dokumentet har slike |
| `opplysninger` | Liste over opplysninger om dokumentet: `id`, `hva` (`sendt` eller `mottatt`) og `dato`, oppgitt av parten som registrerer | Når dokumentet er sendt utenfor appen |
| `dokumentasjon` | Vedleggs-ID-er som viser dokumentet, for eksempel e-posten | Når det finnes |

Et dokument har minst ett krav, ett svar eller ett utsagn. Et brev sendt i
appen har ingen opplysning om sending: sendt er registrert.

Etter MM-U10 kan et dokument ha utsagn i flere spor. Et
brev fra godkjenningspakken med svar i tre spor er én rad med tre svar, hvert
med sitt beslutningsgrunnlag. Hvordan brevet blir dokument i Catenda, er
[#321](https://github.com/khjohns/endringsmeldinger/issues/321) og påvirker
ikke formatet.

**Foreslått, leveringen.** I samme transaksjon som raden fryses hele
dokumentgrunnlaget med leveringsintensjonen, som viser til `event_id` (FK,
invariant 3 og 6). Dokumentgrunnlaget er teksten og innholdet i brevet slik det
leveres, for brev fra begge parter: BHs svar, innsigelser og forespørsler, og
TEs krav, varsler, aksepter og trekk. For en forespørsel etter § 33.6.2 første
ledd har det det bestemmelsen krever: at manglende svar fører til at kravet om
fristforlengelse tapes, og at TE eventuelt skal begrunne hvorfor grunnlaget for
å beregne kravet ikke foreligger. Python leverer bare det frosne
dokumentgrunnlaget. Det leser ikke raden i journalen og ikke `format`, og
tolker ingenting (B-17). En retry leverer samme dokument. Formen på
leveringsintensjonen hører til #310.

**Alternativer:**
- *Én rad per svar med `dokument_id`*, som i målmodellen. Atomisiteten må da
  være en garanti i lageret og ikke i formatet. Leseren må samle radene, og må
  avgjøre hva et dokument med bare noen av radene betyr. Forkastet, fordi
  én rad gjør det ugyldige tilfellet umulig å lagre.
- *Ett spor per brev*, etter ordlyden i B-03. Forkastet i MM-U10.
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

**«Ingen krav» ([KA-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u12)).** Utsagnet `{id, art: "ingen_krav", spor}`
har `spor` og ikke `gjelder`, fordi det ikke finnes noen kravversjon å vise
til. Leseregler for sporet: utsagnet teller som trukket i KA-U11 og som
oppgjort i EO-U5. Det er ikke et krav på 0 (KA-U8). Står det i et spor som
allerede har en kravversjon, eller står en kravversjon etter det i samme
spor, er saken ikke forstått.

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
håndheves før leseren får journalen. Relasjoner mellom saker, som en EO-sak
som viser til KOE-saken etter [KA-U12](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u12), står ikke i `data`. De går gjennom
`sak_relations` og avgjøres i #309.

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

**Vedtatt 09.10 ([KA-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u10), svaret på spørsmål 2).** Enigheten gjelder svaret med den
virkningen brevet hadde, slik beslutningsgrunnlaget fryser den. TE godtar det
BH skrev. Aksepten lagrer hvilket svar den gjelder og regelversjonen TE fikk
se. Innholdet leses fra beslutningsgrunnlaget, så det har ett hjem. MM-U3
leses slik at innholdet er brevets, slik det ble godtatt. Ved enighet ved
sammenfall er tidspunktet det samme.

**Vedtatt 09.10 ([MM-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u11), svaret på spørsmål 3).** Beslutningsgrunnlaget
fryser hvert standpunkt med virkningen det hadde, og om svaret godkjenner hele
kravet. Utfallet i sporet og vilkåret for enigheten utledes av de frosne
standpunktene, og ingen regel leser et lagret utfall.

**Foreslått, beslutningsgrunnlaget.** Hvert svar i dokumentraden har sitt
`beslutningsgrunnlag`. Det skrives av serveren i samme rad som svaret, så et
svar uten beslutningsgrunnlag kan ikke lagres (MM-U9). Det har:

| Felt | Innhold | Hvorfor det fryses |
| --- | --- | --- |
| `regelversjon` | Reglene virkningen er regnet med | MM-U9 |
| `standpunkter` | Nøyaktig ett innslag per standpunkt i svaret: standpunktets `id` og virkningen da brevet ble sendt (prinsipalt, subsidiært, preklusjon eller uten virkning) | Virkningen leses herfra og ikke av dagens regler (MM-U9, MM-U11) |
| `linje` | Brevlinjen | Brevet er det autoritative uttrykket (B-03) |
| `sammenfall` | `true` når svaret godkjenner hele kravet, ellers `false` | MM-U11. Se under |

«Godkjent eller avslått, beløp eller dager» i MM-U11 gjelder svaret som
helhet: standpunktene, `utregning` og `sammenfall`. Hva standpunktet sier,
godkjent eller avslått, står i standpunktet selv. Beløp og dager står i
`utregning` i samme svar. Begge er lagret i en rad som ikke endres, og er
dermed like frosne. Beslutningsgrunnlaget kopierer dem ikke, så de har ett
hjem.

**`sammenfall`.** Det betyr ulike ting etter sporet:
- *Grunnlaget:* byggherren har godkjent ansvaret uten å påberope preklusjon
  etter § 32.2 ([GR-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u10)). Svaret er da en endringsordre etter § 32.3
  første ledd a.
- *Vederlag og frist:* svaret godkjenner hele kravet ([GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7)). TE kan
  ikke godta et slikt svar ([GR-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u8)).
- *Et frafall etter § 32.3 første ledd c* er byggherrens standpunkt, ikke en
  enighet, og er aldri sammenfall ([GR-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u9)).

**Utledes og lagres ikke** (MM-U11): utfallet i sporet (beløp, dager, eller om
grunnlaget er godkjent, avslått eller frafalt) og vilkåret for enigheten. Det
utledes av de frosne standpunktene og deres virkning. Sammensetningen følger
§ 32.3 a–c og vedtakene om prinsipale og subsidiære standpunkter, som GR-U7.
Den følger gjeldende regler, også for sendte brev, som et unntak fra MM-U9.
Endres den, kan utfallet av et sendt brev endre seg. Den kostnaden er valgt i
MM-U11.

**Foreslått, enigheten.** Det finnes ikke noe eget enighetsgrunnlag i formatet:
- *Ved aksept* er det utsagnet `{id, art: "aksept", gjelder: <svar>, regelversjon}`
  i TEs dokument. `regelversjon` er den klienten regnet med, og serveren
  sammenlikner den med sin egen, slik den gjør for BHs svar (B-13). Kilden er
  aksepten, og innholdet er beslutningsgrunnlaget til svaret den gjelder.
- *Ved sammenfall* er det `sammenfall: true` i beslutningsgrunnlaget. Kilden er
  svaret selv.

Om enigheten er betinget, virksom eller uten virkning, utledes løpende (GR-U7,
merknaden til MM-U3). Det lagres ingen virkning for enigheten og ingen status.

**Alternativer:**
- *Et eget enighetsgrunnlag i aksepten*, frosset med reglene da aksepten ble
  registrert, slik målmodellen gjør. Forkastet i KA-U10.
- *Et enighetsgrunnlag i hvert svar*, med `null` når svaret ikke skapte enighet.
  Det foreslo innspillet fra #308. Med `sammenfall` i beslutningsgrunnlaget
  ville det vært et andre hjem for det samme, og `null` bryter regelen om
  fravær (4.4).
- *Utfallet per spor og vilkåret i beslutningsgrunnlaget.* Forkastet i
  MM-U11. `utfall.grunnlag` med `avklart` og `avvist` ville dessuten slått
  sammen § 32.3 første ledd a og c i en lukket mengde.
- *Ett beslutningsgrunnlag per dokument* med én del per svar. Det gir samme
  innhold, men en revisjon erstatter ett svar, ikke brevet. Med
  beslutningsgrunnlaget i svaret følger det svaret det gjelder.

**Avhenger av #308:** formen på virkningen og brevlinjen (4.7).

**Tjener:** forløp A, steg 2 og 4 (enighet ved sammenfall og ved aksept,
F-MM-A). Forløp C, 3b–3d (F-MM-C3b, F-MM-C3c, F-MM-C3d): brevet står etter en
regelendring, og en godtatt preklusjon regnes ikke om. F-MM-AC.

### 4.4 Fravær, tomhet og formatversjonen

**Foreslått, fravær og tomhet:**
1. `data` har ingen `null`. Et felt uten verdi utelates. Vedtaket 05.10 gjelder
   API-et, slik `kontrakt.json` gjengir det; formatet tar regelen inn i
   journalen. At `data` heller ikke har tom liste eller tom streng, er
   dette notatets eget forslag.
2. Et felt som mangler, betyr én av to ting, og arten avgjør hvilken: parten
   har ikke sagt det (en vurdering BH ikke har gjort, KA-U4), eller feltet
   hører ikke til arten.
3. Mangler et felt arten krever i formatet, er raden ikke forstått. Det samme
   gjelder et felt formatet ikke kjenner. En skriver kan ikke skrive en rad
   «uten feltet», så skillet målmodellen har mellom `enighetsgrunnlag: null`
   og et manglende felt faller bort. Om et svar skapte enighet ved
   sammenfall, står som `sammenfall` i beslutningsgrunnlaget (4.3).
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
tilbake, står i 4.8.

**Tekniske valg** ([kommentaren 09.10 i #273](https://github.com/khjohns/endringsmeldinger/issues/273#issuecomment-6083294289)):
- Kolonne, ikke `data`, fordi formatet må kunne leses før `data` tolkes. Med en
  kolonne kan en spørring liste sakene med en rad i et nyere format før en
  tilbakerulling (#316), og `data` holdes til domeneinnhold.
- Kostnaden er en migrasjon. Med den følger `docs/datamodell/katalog.json`,
  `tabeller.toml`, kolonnelisten i `sprakprove/server/lager.ts`,
  `sprakprove/kjerne/rad.ts` og `HENDELSE_KOLONNER` i
  `backend/tests/fixtures/supabase_dobbel.py`. `$defs.rad` i
  `docs/domenetabell/kontrakt.json` mangler også `format`. Det gjør byggeøkta.
- Alternativet `data.format` krever ingen migrasjon og er prøvd i målmodellen
  (`hendelsesformat`). Det blander metadata inn i domeneinnholdet og kan ikke
  leses uten at `data` tolkes.
- Bufferversjonene (projeksjonsversjon, regelversjon, høyeste format og
  saksversjon) står med bufferen, ikke i raden, slik `buffer.ts` gjør. De står i
  kolonnene `kjerne_*` i `sak_metadata` (4.8).

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
| `respons_grunnlag`, `respons_vederlag`, `respons_frist` | Et element i `svar` i `dokument_registrert` | § 32.3: «besvare». § 33.7: «svare» |
| `respons_*_oppdatert`, `original_respons_id` | `svar` med `erstatter` | Modellforslaget 2.2 |
| `refererer_til_event_id` / `referstoid`, `vederlag_krav_id`, `frist_krav_id`, `grunnlag_event_id` | `gjelder` | Modellforslaget 2.2 |
| `grunnlag_opprettet`, `grunnlag_oppdatert`, `vederlag_krav_sendt`, `vederlag_krav_oppdatert`, `frist_krav_sendt`, `frist_krav_oppdatert` | Et element i `krav`, med `erstatter` fra og med andre versjon | KA-U2. § 5: «krav» |
| `te_aksepterer_respons` | Utsagn med art `aksept` | KA-U1, KA-U10 |
| `grunnlag_trukket`, `vederlag_krav_trukket`, `frist_krav_trukket` | Utsagn med art `trekk` | KA-U6, GR-U5 |
| Finnes ikke | Utsagn med art `ingen_krav` og `spor` (`vederlag` eller `frist`) | KA-U12 |
| `frist_varsel` i kravet, `frist_varsel_registrert` | Utsagn med art `varsel` og `hjemmel`, med opplysningen `sendt` | § 33.4: «varsle». MM-U1 |
| `bestridelse_registrert` | Utsagn med art `bestridelse` | MM-U7 |
| `frist_foresporsel_sendt` | Utsagn med art `foresporsel` | § 33.6.2: «forespørsel». Endelig form i #309 |
| `frist_innsigelse_sendt` | Utsagn med art `innsigelse` | § 5 tredje ledd, VS-U1. Endelig form i #309 |
| `grunnlag_varslet_i_tide`, `frist_varsel_ok`, `spesifisert_krav_ok` | Standpunkt med art `rettidighet`, `gjelder`, `hjemmel` og `i_tide` | KA-U4. § 5 tredje ledd: «i tide» |
| `resultat` i grunnlagssvaret | Standpunkt med art `ansvar` | § 32.3 a–c |
| `vilkar_oppfylt` | Standpunkt med art `hindring`, `oppfylt` | § 33.1: «fremdriften hindres» |
| `beregnings_resultat`, `total_godkjent_belop`, `godkjent_dager` og de subsidiære feltene | `utregning` i svaret (B-13). Feltene formes av #308 | B-13 |
| `beslutningsgrunnlag` i hver svarhendelse | `beslutningsgrunnlag` i hvert svar i dokumentraden (4.3) | MM-U9 |
| `enighetsgrunnlag` i svaret | `sammenfall` i beslutningsgrunnlaget. Utfall og vilkår utledes | GR-U7, GR-U10, MM-U11 |
| `enighetsgrunnlag` i aksepten | Utgår. Aksepten har `gjelder` og `regelversjon` | KA-U10 |
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

**Foreslått,** etter [innspillet fra #308](https://github.com/khjohns/endringsmeldinger/issues/273#issuecomment-6087791850)
og KA-U10:

| Lagres | Utledes ved lesing |
| --- | --- |
| Utsagnene slik parten ga dem, med ID, art, `gjelder`, hjemmel og innhold: krav, svar med standpunkter, varsel, aksept, trekk, bestridelse, forespørsel og innsigelse | Gjeldende krav og gjeldende svar, etter `erstatter` |
| Relasjonene `gjelder` og `erstatter`, også de som er underforstått i dag: trekket til kravet, rettidigheten til varselet, bestridelsen til opplysningen | At hele svaret på vederlag eller frist er subsidiært til grunnlaget, av beslutningsgrunnlaget i grunnlagssvaret, også mens grunnlaget venter på nytt svar (vedtaket 05.10, GR-U1, MM-U9) |
| Opplysningene om sending og mottak | Om en preklusjon etter § 33.4 er uavklart, av om rettidigheten `gjelder` det registrerte varselet (MM-U8) |
| Serverens utregning etter B-13 (`utregning`) og regelversjonen i hvert svar | Om en enighet er betinget, virksom eller uten virkning, av vilkåret, grunnlaget og trekkene (GR-U7, MM-U3) |
| Beslutningsgrunnlaget i hvert svar, med virkningen, brevlinjen og sammenfallet (MM-U11) | Varselet utledet av et fristkrav når ikke noe varsel er registrert (MM-U1) |
| Regelversjonen klienten regnet med, i aksepten | Dagens utledning av et sendt svar, som bare vises som merknad (MM-U9) |
| Utsagnet «ingen krav» (KA-U12) | Utfallet i sporet og vilkåret for enigheten, av de frosne standpunktene (MM-U11) |
| | «Kravene er avgjort» ([KA-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u11)), trukket og oppgjort, status og etiketter |
| | Bufferen med de fire versjonene |

Det kjernen leser, er lagret (DM-06). Ingen regel leser høyre kolonne, og
høyre kolonne lagres ikke i raden.

**Avhenger av #308:** se 4.7.

**Tjener:** forløp B2 (trekk av grunnlaget skriver ingen nye hendelser,
F-MM-B2), forløp A5b (vilkåret blir oppfylt uten at enigheten endres,
F-MM-A5b), forløp C3b (subsidiariteten endres med reglene, F-MM-C3b) og
forløp D (MM-U8, F-MM-D).

### 4.7 Det byggeøkta og #308 må være enige om

Kjernemappa får sin form i #308. Byggeøkta bygger formatet på den. Disse
punktene må de to være enige om, ellers skriver kjernen noe formatet ikke har
plass til, eller formatet lagrer noe kjernen ikke leser:

1. **`Enighetsgrunnlag` utgår som lagret type,** og med den betydningen av
   `null` i svaret (KA-U10, MM-U11, 4.3 og 4.4). Om svaret godkjenner hele
   kravet, er `sammenfall: true` eller `false` i beslutningsgrunnlaget.
2. **Utfall og vilkår lagres ikke** (MM-U11). De utledes av de frosne
   standpunktene og virkningen deres.
3. **Predikatene som leser standpunktene** og ikke et lagret utfall:
   «avklart grunnlag» i [GR-U7](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), «kravene er avgjort» i
   [KA-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u11), «kan inngå i endringsordre» i [EO-U5](plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u5), og
   avvisningen av en aksept av et svar ved sammenfall i [GR-U8](plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u8).
   Alle leser de frosne standpunktene og `sammenfall`, og «ingen krav» etter
   KA-U12.
4. **Formen på `utregning`:** feltene for beløp og dager, også de
   subsidiære. Formatet krever bare at de står i svaret, ett sted (4.3), og at
   et krav på 0 ikke finnes (KA-U8).
5. **Formen på virkningen og brevlinjen** i beslutningsgrunnlaget.

### 4.8 Utrulling, tilbakerulling og kompatibilitetstesten (B-10, #316)

**Vedtatt** i [B-10](plans/2026-09-16-godkjenning-og-varig-levering.md#b-10)
10.10, og **bygget** i #316:

- Kjernen har to formatnumre: `FORMAT`, som den skriver, og `LESERFORMAT`, det
  høyeste den leser ([`kjerne/format/format.ts`](../kjerne/format/format.ts)). Et nytt format
  rulles ut i to utgivelser: først en som leser det, så en som skriver det. En
  tilbakerulling ett trinn stopper da ingen sak. Regelversjonsvakten
  (`.github/scripts/regelversjon.sh`) avviser en diff der `FORMAT` økes forbi
  `LESERFORMAT` slik det stod før.
- Bufferen står i `sak_metadata`: visningen i `kjerne_visning` og versjonene den
  er regnet med i `kjerne_projeksjonsversjon`, `kjerne_regelversjon`,
  `kjerne_leserformat` og `kjerne_saksversjon`. Den brukes bare når alle er like
  kjernens og sakens ([`kjerne/utledning/buffer.ts`](../kjerne/utledning/buffer.ts)).
- Kompatibilitetstesten er tabellstyrt
  ([`kjerne/tester/kompatibilitet.ts`](../kjerne/tester/kompatibilitet.ts)) og
  kjøres i minnet og mot testbasen. Tabellen har tre versjoner rundt et nytt
  format:

  | Versjon | Leser format | Skriver format |
  | --- | --- | --- |
  | v1 | 1 | 1 |
  | v2a | 1–2 | 1 |
  | v2b | 1–2 | 2 |

  Alle par av skriver og leser prøves, med utrulling og tilbakerulling. En
  leser forstår saken når skriverens format er høyst leserens `LESERFORMAT`;
  ellers stopper saken etter MM-U2, uten at noen rad hoppes over eller skrives
  om. Format 2 er her bare et høyere nummer på samme skjema. Ved en reell
  formatendring legges det nye formatet inn i tabellen, og utviklerne
  dokumenterer kompatibiliteten for den (B-10).

## 5. Når saken er forstått

**Foreslått.** Leseren for format 1 gjør ett av to for hver rad: leser den i
modellens form, eller merker den som ikke forstått med en grunn. Saken er ikke
forstått når minst én rad ikke er forstått (MM-U2). Grunnene er:
- `format` mangler eller er høyere enn kjernens;
- `event_type` eller en art er ukjent;
- `data` har et ukjent felt, `null`, en tom verdi, eller mangler et felt arten
  krever (4.4);
- en referanse bryter en av lesereglene i 4.2, også reglene for «ingen krav»;
- en kravversjon har 0 kr eller 0 dager (KA-U8).

Ingen grunn løses ved å gjette, og ingen rad hoppes over.

## 6. Det formatet ikke avgjør

- **Avsender som ikke er parten som registrerer.** I format 1 er avsenderen
  `actorrole`, og opplysningene i dokumentet er oppgitt av samme part. At en
  part registrerer et dokument fra motparten, for eksempel et brev mottatt i
  posten, er ikke vurdert. Det kan legges til i et senere format med et eget
  felt.
- **Utsagnene for endringsordre og forsering** og de endelige feltene for
  forespørsel og innsigelse. De hører til #309.
- **Formen på virkningen, brevlinjen og utregningen.** Den hører til #308.
- **Dokumentet i Catenda.** Om et brev med svar i flere spor blir ett dokument
  eller fordeles per part og spor, og dokumentnøkkel og navnestandard, står
  åpne under B-03 ([#321](https://github.com/khjohns/endringsmeldinger/issues/321)).
- **Utrulling, tilbakerulling og bufferen i `sak_metadata`.** Det hører til #316.
- **Registeret for hendelsestypene.** `docs/datamodell/hendelser.toml` er
  bundet til Pythons `EventType`, så TS-typene har ikke noe hjem der ennå.
  Meldt i [#320](https://github.com/khjohns/endringsmeldinger/issues/320).

## 7. Prøveplan for byggeøkta

Byggeøkta bygger formatet inn i kjernemappa og kjører prøvene mot testbasen
med `KOE_TESTBASE_URL`. Prøvene
skal vise til vedtakene i avsnitt 2, ikke til koden.

### 7.1 Lagring og gjenlesing for forløp A–E

1. Kjør hvert forløp i `bevis-saker-maalmodell.json` gjennom kommandoen,
   lageret og gjenlesingen. Utledningen etter gjenlesingen skal være lik
   utledningen i minnet, og kontrollene i bevis-sakene skal holde.
2. Kontroller hver lagret rad mot et skjema for format 1. Raden skal ha
   `format` satt, ingen `null` og ingen tomme verdier i `data`. Et dokument
   skal gi én rad, også brevet med tre svar i forløp A, og saksversjonen skal
   øke med én per dokument. Beløp og dager i en kravversjon skal være over 0;
   er de 0, er raden ikke forstått (KA-U8).
3. Skriv radene i forløp E (`"handling": "rad"`) på nytt i format 1, med
   feilene de prøver: et svar på en eldre kravversjon lagret senere (F-MM-E1),
   en referanse som ikke finnes (F-MM-E3), to svar uten `erstatter` (F-MM-E4),
   et svar som erstatter seg selv (F-MM-E6) og en ring (F-MM-E7). Legg til en
   rad med ukjent art og en rad med `format` 2 (F-MM-E5). Hver av dem skal gi
   en sak som ikke er forstått, og avvise alle bindende kommandoer.
4. Prøv at en referanse til et element i en annen sak gir en sak som ikke er
   forstått, og at innholdet i den andre saken ikke vises.

### 7.2 Feilinnføring som fjerner en referanse

Legg feilklassene i feilinnføringsfila for kjernen
([`kjerne/tester/feilinnfoering.ts`](../kjerne/tester/feilinnfoering.ts); på `843ab2f`
[`sprakprove/maalmodell/feilinnforing.ts`](https://github.com/khjohns/endringsmeldinger/blob/843ab2f/sprakprove/maalmodell/feilinnforing.ts)).
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
   men før `COMMIT`. Prøv både en kastende krok i lageret og en avbrutt
   forbindelse.
3. Journalen, saksversjonen, leveringsintensjonen og det frosne
   dokumentgrunnlaget skal være uendret. Ingen rad skal finnes for dokumentet.
4. Send samme kommando igjen. Den skal gi ett dokument med tre svar, hvert
   med sitt beslutningsgrunnlag, og ett frosset dokumentgrunnlag.
5. Lever dokumentet to ganger fra det frosne dokumentgrunnlaget, med en
   endring i journalen mellom. Begge leveransene skal være like (invariant 6).

Finnes ikke leveringsintensjonen i TS-stien ennå, skal prøven
si det, og kravet hører til #310.

### 7.4 Det byggeøkta også gjør

- Migrasjonen for `format`, og filene som følger med (4.4).
- Navnene i domenetabellen (4.5).
- Kontrollen av at en revisjon får eget beslutningsgrunnlag, og at en aksept
  uten `regelversjon` eller med et ukjent felt gir en sak som ikke er forstått.
- Kontrollen av «ingen krav»: et utsagn i et spor med kravversjon, og en
  kravversjon etter utsagnet, gir en sak som ikke er forstått (KA-U12).

## 8. Spørsmål til oppdragsgiver og svarene 09.10

Spørsmålene ble sendt gjennom orkestratoren 09.10, med alternativer, belegg og
anbefaling. Oppdragsgiver svarte samme dag. Spørsmål 1 og 2 er ført i #323,
spørsmål 3 i PR-en for dette notatet. Vedtakstekstene står ordrett under.

**Spørsmål 1: kan ett brev inneholde svar og andre utsagn i flere spor?**
Alternativene var (a) ja, og «ett spor» i B-03 utgår; (b) B-03 etter
ordlyden, så godkjenningsbrevet blir tre brev; (c) som (a) for BH, men ett spor
per brev fra TE. Belegg: § 5 første ledd krever skriftlighet, ikke ett skriv
per krav. § 33.6.2 første ledd: en forespørsel «skal sendes per brev». MP-U5:
flere innsigelser i ett brev. Anbefalt: (a).

*Vedtatt (a), [MM-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u10):* «et brev er fra én part og kan inneholde utsagn i flere spor. Byggherren kan i samme brev svare på grunnlag, vederlag og frist, gjøre innsigelser etter § 5 og sende en forespørsel etter § 33.6.2. TE kan i samme brev sende krav, varsel, aksept og trekk. Hvert svar gjelder én kravversjon, og en aksept gjelder ett svar (KA-U1). § 5 første ledd krever at varsler, krav og svar fremsettes skriftlig, ikke at hvert av dem står i et eget brev. Forkastet: ett spor per brev, som ordlyden i B-03, og flere spor per brev bare for byggherren»
Spørsmålet om dokumentet i Catenda er
[#321](https://github.com/khjohns/endringsmeldinger/issues/321).

**Spørsmål 2: hva fryser en enighet når reglene er endret mellom brevet og
aksepten?** MM-U3 sier: «virkningen av en enighet fastsettes når den inngås.
Har TE godtatt et svar, gjelder enigheten svaret med alle standpunktene slik
det ble godtatt (KA-U1), også når en senere regelendring ville gitt et
standpunkt i svaret en annen virkning.» Merknaden 09.10 til raden presiserer:
«innholdet i en enighet fastsettes når den inngås: svaret, standpunktene og
virkningen de hadde etter reglene da.» MM-U9 sier at et sendt brev beholder
virkningen det hadde da det ble sendt. Uklart var om «reglene da» er reglene
da brevet ble sendt eller da TE godtok det. Alternativene var (a) svaret med
virkningen brevet hadde, og aksepten viser bare til svaret og
regelversjonen; (b) virkningen etter reglene da aksepten ble registrert, som
en egen kopi i aksepten. Belegg: B-03 (brevet er det autoritative uttrykket),
KA-U1, MM-U3 og MM-U9. Spørsmålet og vedtaksteksten viser også til § 34.2.2
første ledd. Merknaden til KA-U10 sier at bestemmelsen gjelder byggherrens
aksept av TEs tilbud og ikke bærer vedtaket alene.
Anbefalt: (a).

*Vedtatt (a), [KA-U10](plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u10):* «godtar TE byggherrens svar, gjelder enigheten svaret med den virkningen brevet hadde da det ble sendt, slik beslutningsgrunnlaget i brevet uttrykker den (MM-U9). Det gjelder også når reglene er endret mellom brevet og aksepten. Aksepten viser til svaret og lagrer regelversjonen TE fikk se. Innholdet i enigheten leses fra beslutningsgrunnlaget og kopieres ikke. Ved enighet ved sammenfall (GR-U8, GR-U10) er brevet og enigheten samtidige. NS 8407 regulerer ikke appens regelversjoner, så valget er produktatferd; det følger B-03 (brevet er det autoritative uttrykket for partens standpunkt) og § 34.2.2 første ledd (et akseptert tilbud binder slik det sto). Forkastet: at enigheten fryser virkningen etter reglene da aksepten ble registrert, som en egen kopi i aksepten»

**Spørsmål 3: fryser beslutningsgrunnlaget også utfallet og vilkåret?**
Spørsmålet kom fra gjennomgangen av dette notatet, som hadde foreslått at
beslutningsgrunnlaget fryser utfallet per spor og vilkåret for enigheten.
Alternativene var bare standpunktene, eller standpunktene med utfall og
vilkår.

*Vedtatt «bare standpunktene», [MM-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u11):* «beslutningsgrunnlaget i byggherrens svar fryser hvert standpunkt med virkningen det hadde da brevet ble sendt: prinsipalt eller subsidiært, preklusjon, godkjent eller avslått, beløp eller dager. Det fryser også om svaret godkjenner hele kravet (sammenfall). Utfallet i sporet og vilkåret for en enighet utledes av de frosne standpunktene, og ingen regel leser et lagret utfall. Endres regelen som setter standpunktene sammen til et utfall, kan utfallet av et sendt brev endre seg. Sammensetningen følger § 32.3 a–c og vedtakene om prinsipale og subsidiære standpunkter, som GR-U7. Forkastet: at hvert svar i tillegg fryser utfallet per spor og vilkåret for enigheten»

## Verifikasjon og grenser

**Lest i koden (L 09.10, `843ab2f`):** `skriving.ts`, `leser.ts`, `typer.ts`,
`regelsett.ts` og `kommando.ts` i `sprakprove/maalmodell/kjerne/`;
`buffer.ts`; `leggTil` og kolonnelisten i `sprakprove/server/lager.ts`;
migrasjonen for `hendelse`; `$defs.rad` i `kontrakt.json`; toppen av
`docs/datamodell/hendelser.toml` og `test_hendelseskatalog.py`; forløpene i
`bevis-saker-maalmodell.json`.

**Innspill:** kommentaren fra økta for #308 i
[#273](https://github.com/khjohns/endringsmeldinger/issues/273#issuecomment-6087791850),
om hva som må lagres og hva som kan utledes. Den er fulgt, med to avvik:
sammenfallet står som `true` eller `false`, ikke som `null` (4.3), og utfall og
vilkår fryses ikke, etter MM-U11. Gjennomgangen av notatet 09.10 er fulgt; se
PR-en.

**Fra hovedplanen og modellforslaget:** vedtakene i avsnitt 2 og forløpene
A–E. NS 8407 er lest i teksten som ble fjernet fra repoet i `507e2254`,
§ 5, § 32.2–32.3, § 33.4–33.8 og § 34.1–34.2. Det er ikke gjort noen ny
juridisk vurdering ut over spørsmålene i avsnitt 8.

**Ikke kontrollert:** formatet er ikke implementert, ikke lagret og ikke lest
igjen. Ingen prøve er kjørt. At én rad per dokument passer med leveringen i
Python og Catenda, er ikke kontrollert. Det samme gjelder at feltene for
utregningen og beslutningsgrunnlaget dekker #308 (4.7).
