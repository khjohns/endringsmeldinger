# Samlevedtak: vilkår og forbehold i byggherrens svar

Dato: 04.11.2026. Kontrollert commit: `3e96a11`. Del av #1534, steg 4, trinn 2 (runde 13 i #1065).

Fila er et forslag til samlet tilslutning til reglene for vilkår og forbehold i byggherrens
svar. Hver setning i forslaget viser vedtaket og eventuelt setningen den kommer fra. «s3» betyr
den tredje setningen i vedtaksteksten i [`vedtak.md`](../plans/vedtak.md) på commiten over. Det
som endrer innholdet i en eldre post, også en motsigelse forslaget løser, står i «Endret
innhold» (E1–E7), og oppdragsgiver tar stilling til hvert punkt. Spørsmålene står ordrett slik
de sendes, og svarene føres inn her. Forslaget siterer ikke NS 8407.

Kjeden i [klassifiseringen](vurdering-klassifisering-2026-11-03.md#kjedene) har 25 poster:
GR-U26, KA-U16, KA-U19, KA-U20, KA-U26, KA-U27, KA-U28, KA-U29, KA-U30, KA-U45, LV-U32, MM-U33,
MM-U34, MM-U36, OV-U4, OV-U6, OV-U46, OV-U47, OV-U48, OV-U49, OV-U61, OV-U69, OV-U72, OV-U79 og
OV-U80. Gjennomgangen fant også en setning om vilkår i EO-U18. Den er tatt med som kilde.

## Det kartleggingen fant

Motsigelsene under
[«Motsigelsene i registeret»](vurdering-klassifisering-2026-11-03.md#motsigelsene-i-registeret)
er for det meste alt løst i innholdet. Bare forholdene står igjen:

- **OV-U80 og KA-U45 mot OV-U69.** EO-U18 (03.11) endret setningene «Spørsmålet i OV-U48 og
  OV-U49 stilles i svarskjemaet.» og «Svarer byggherren ja, står korrespondansen som
  dokumentasjon, merket ‹Svaret har forbehold skjemaet ikke kan uttrykke›.» i OV-U80, og setningen
  «Byggherrens forbehold i et registrert svar fanges etter OV-U48 og OV-U49.» i KA-U45. Følge i
  EO-U18 sier «OV-U69 står». Samlevedtaket for endringsordren, E11 i EO-U34, sier det samme:
  «forbehold spørres ikke om (designdelen)». Forholdene «Utvider OV-U48», «Utvider OV-U49» i
  OV-U80 og «Bygger på OV-U48», «Bygger på OV-U49» i KA-U45 står likevel. E2 fjerner dem.
- **OV-U80 og KA-U24.** Henvisningen «Utdypningen og begrunnelsen er unntatt (KA-U24).» gjelder
  samlevedtaket for byggherrens begrunnelse (KA-U46, punkt 6, E1 i
  [vurderingen](vurdering-samlevedtak-begrunnelse-2026-11-04.md)). Den er løst og tas ikke opp her.
- **Følge i GR-U26, KA-U16 og KA-U19** har alt merknaden «(opphevet 30.10 av OV-U69)» ved
  OV-U48 og OV-U49. Det klassifiseringen sier om dem, stemmer ikke lenger.
- **KA-U16 s6–s7** sier at et registrert brev med et forbehold løsningen ikke kan uttrykke, ikke
  regnes som en ubetinget godkjenning, og at handlinger som bygger på det, sperres til det er
  avklart. Etter KA-U45 finnes ingen merking eller avklaring, og etter EO-U18 stilles ingen
  spørsmål. Ingenting utløser eller opphever sperren. E1 avgjør det.
- **MM-U34** er ikke merket på punktnivå. Punkt 25 er bortfalt etter OV-U69, punkt 18 viser til
  OV-U49 D2, og kulepunktet om KA-U27 og KA-U30 i punkt 15 sier «KA-U30 står», som KA-U45 senere
  opphevet. E5 avgjør det.
- **OV-U72 mot OV-U69 og EO-U18.** OV-U72 (31.10) presiserte «i begrunnelsen eller i et innlegg»
  i OV-U69 til «i begrunnelsen for punktet eller under «Forbehold»». EO-U18 (03.11, *design*)
  gjentar «i begrunnelsen eller i et innlegg». Spørsmål 1 avgjør det.

**Koden**, lest av en subagent 04.11 (`kjerne/`, `server/`, `src/`):

- Det finnes ikke noe felt eller noen hendelse for vilkår, og ingen regel leser teksten i
  begrunnelsen. `src/lib/kjernesak/svarvirkning.ts` sier: «Vilkår og forbehold står i
  begrunnelsen og har ingen egen tekst (OV-U69).»
- Det eneste forbeholdet kjernen kjenner, er forbeholdet for ubesvart grunnlag etter GR-U26
  (`grunnlagetForSvaret` i `kjerne/regler/vederlagssvar.ts`). Enigheten får da vilkåret
  `forhold_avklart`, og `enighetensVirkning` i `kjerne/utledning/utled.ts` gir «betinget» til
  forholdet er avklart.
- Merkingen etter KA-U20 avvises med `IKKE_I_FOERSTE_VERSJON` i
  `kjerne/kommandoer/forutsetninger.ts`, med henvisning til OV-U7. Typene, kommandoskjemaet og
  brevteksten for merkingen står fortsatt (`kjerne/typer.ts`, `kjerne/kommandoer/kommando.ts`,
  `kjerne/frosset/brevtekst.ts`). Ingen kode viser til KA-U45.
- Ingen kode stiller et spørsmål om vilkår, avviser et svar med vilkår eller sperrer en
  endringsordre for uavklarte vilkår.

## Overlapp med andre samlevedtak i arbeid

Kontrollert 04.11 mot #1572 (saker løsningen ikke forstår), #1573 (revisjon av byggherrens svar),
#1566 (sakslisten og nøkkeltallene) og kartleggingen av «Særskilt varsel etter § 34.1.3 og rigg
og drift». Fordelingen av setningene i MM-U34 venter på svar fra orkestratoren (se «Fordelingen»).

- **MM-U34**: her samles eller oppheves bare punkt 25, delen «OV-U49 D2 (forslag om vilkår)» i
  punkt 18, kulepunktet om KA-U27 og KA-U30 i punkt 15 og setningen «Vilkåret i KA-U26 oppheves
  også.» i punkt 20. Punkt 9, 10, 12 og 16 er bare kilder. Kulepunktet om OV-U4 og OV-U7 i punkt
  15 hører til #1572 og kjeden for brev utenfor løsningen, og kulepunktet om OV-U38 til «Særskilt
  varsel». Punkt 4–8, 11 og 17 er kilder i #1573.
- **OV-U4**: #1572 samler setningen om en sak som ikke er forstått. Her er OV-U4 bare kilde.
- **OV-U61**: #1572 sier at OV-U61 samles i #1566. Her er s4 og s15 bare kilder, og spørsmål 2
  presiserer hva «betinget» betyr uten å samle OV-U61.
- **OV-U80**: #1572 endrer setningen om en sak som ikke er forstått, og KA-U46 viser til
  begrunnelsen. Her fjernes bare forholdene til OV-U48 og OV-U49 (E2).
- **GR-U26, GR-U29, GR-U33**: forbeholdet i brevet når grunnlaget er ubesvart hører til kjeden
  «Svar på vederlag og frist mens grunnlaget er ubesvart». Her er GR-U26 s4, s5 og s10 bare kilder.
- **OV-U6**: s5 («byggherren kan ikke revidere svaret») hører til #1573.

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder fortsatt
som «Samlet i samlevedtaket for vilkår og forbehold». «Opphever»: samlevedtaket løser en
motsigelse og endrer innholdet. «Endrer»: bare de navngitte setningene endres; resten av posten
står og hører til en annen kjede.

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| OV-U69 | vedtak med designdel | gjeldende | samler; s3 etter spørsmål 1 | E4 |
| OV-U72 | vedtak med designdel | gjeldende | samler | E4 |
| KA-U16 | vedtak | gjeldende | opphever (s6–s7 endres; s1–s5 samles) | E1 |
| KA-U19 | vedtak med designdel | gjeldende, endret 30.10 av OV-U69 | samler, med ordlyden OV-U69 ga s2–s3 | – |
| KA-U45 | vedtak | gjeldende, endret av EO-U18 og EO-U34 | samler s1 og s3; s2 gjelder ikke etter E11 i EO-U34; forholdene til OV-U48 og OV-U49 fjernes | E2 |
| KA-U20 | vedtak | gjeldende, snevret inn 01.11 av KA-U45 | endrer: setningene om merking, sperre og avklaring (s1, s3–s11) står opphevet; s2 («I første versjon registrerer hver side bare sine egne brev.») hører til kjeden for brev utenfor løsningen | E6 |
| KA-U27 | vedtak | gjeldende, endret av MM-U34, snevret inn av KA-U45 | samler delen om fradrag (beslutningsdel); delen om merket brev står opphevet | E6 |
| KA-U29 | vedtak | gjeldende, snevret inn av KA-U45 | endrer: «og merking etter KA-U20» står opphevet; resten hører til kjeden for godtatt avslag av grunnlaget | E6 |
| LV-U32 | vedtak | gjeldende, endret 30.10 av OV-U69 | samler s1, s3 og s4; s2 og s5 hører til brevtekstene for fast sum | – |
| MM-U34 | vedtak med designdel og beslutningsdel | gjeldende | opphever punkt 25 og de navngitte delene av punkt 15, 18 og 20 (venter på fordelingen); punkt 9, 10, 12 og 16 er kilder | E5 |
| OV-U80 | vedtak med designdel | gjeldende | ingen setning endres her; forholdene «Utvider OV-U48» og «Utvider OV-U49» fjernes | E2 |
| OV-U46 | vedtak med designdel | gjeldende, endret 30.10 av OV-U69 | samler setningen OV-U69 la til («Løsningen utleder virkningen av bekreftelsen …»); resten hører til kjeden for svar gitt utenfor løsningen | – |
| EO-U18 | design | gjeldende, samlet av EO-U34 | kilde for punkt 1; «eller i et innlegg» etter spørsmål 1 | E4 |
| KA-U26, KA-U28, KA-U30 | vedtak | opphevet 01.11 av KA-U45 | står opphevet | – |
| OV-U47, OV-U48, OV-U49 | vedtak | opphevet 30.10 av OV-U69 | står opphevet | – |
| MM-U33 | vedtak med designdel | gjeldende | står; kilde for punkt 3, 12 og spørsmål 1 (steg 2, 3 og 5) | – |
| MM-U36 | design | gjeldende, flyttet til BF-01 | står; kilde | – |
| GR-U26 | vedtak med designdel | gjeldende | står; s4, s5 og s10 er kilder for punkt 7 og 8 | – |
| OV-U61 | vedtak med designdel | gjeldende | står (samles i #1566); s4 og s15 er kilder for spørsmål 2 | E3 |
| OV-U4, OV-U6, OV-U79 | vedtak med designdel | gjeldende | står; hører til andre kjeder | – |

## Forslaget

Samlevedtaket for vilkår og forbehold i byggherrens svar. Hver setning har kilden i parentes.

### A. Hvor vilkår og forbehold står

1. Løsningen har ikke et eget spørsmål om vilkår eller forbehold i byggherrens svar, og ingen
   egne felt for særskilte vilkår, heller ikke når byggherren registrerer korrespondanse som svar
   eller en endringsordre. (OV-U69 s1; EO-U18 s1; KA-U16 s1)
2. Byggherren bruker standpunktene som finnes. (KA-U16 s2)
3. Vilkår og forbehold byggherren knytter til svaret, skrives i begrunnelsen for punktet de
   gjelder, eller under «Forbehold» når de gjelder hele svaret. (OV-U72 s4; OV-U69 s3 slik OV-U72
   presiserer den) *Et innlegg: etter spørsmål 1.*
4. Teksten under «Forbehold» står sist i brevet. Den oppfyller ikke kravet om begrunnelse i et
   punkt. (OV-U72 s1 og s3)
5. Vilkår og forbehold vises med svaret, tolkes ikke og sperrer ingenting, og partene følger dem
   opp selv. (OV-U69 s4; OV-U72 s2; KA-U19 s2 slik OV-U69 endret den)

### B. Virkningen

6. Løsningen utleder virkningen av svaret ut fra valgene og tolker ikke begrunnelsen. Den
   registrerer enighet ut fra valgene, også når begrunnelsen eller teksten under «Forbehold» har
   vilkår eller forbehold. (KA-U16 s3–s4; KA-U19 s1; OV-U69 s5) Det gjelder også et svar som er
   registrert med svarskjemaet. (OV-U80; E1)
7. Et vilkår eller forbehold i begrunnelsen eller under «Forbehold» gjør ikke enigheten betinget
   i løsningen. Enigheten er betinget bare under forbeholdet for ubesvart grunnlag, og byggherrens
   svar på grunnlaget avgjør om den er betinget eller virksom. (GR-U26 s4–s5; OV-U61 s15; E3)
   *Etter spørsmål 2.*
8. Registrert enighet er ikke en avgjørelse av om partene rettslig er enige eller om et vilkår
   er oppfylt (MM-U12). (OV-U69 s7; MM-U34 punkt 12; GR-U26 s10) Brevet er det autoritative
   uttrykket for partens standpunkt (B-03). (OV-U69 s8; KA-U16 s5; KA-U19 s4)
9. TEs aksept gjelder hele svaret slik det står i brevet, også begrunnelsen og teksten under
   «Forbehold». (OV-U69 s6; E7) Aksepten legger ikke inn frafall av krav eller innsigelser ut over
   det TE uttrykkelig godkjenner. (MM-U34 punkt 16)
10. Godkjenner byggherren oppgjør som fast sum, sier brevet: «Byggherren godkjenner oppgjør som
    fast sum med beløpet og forbeholdene som fremgår av svaret.» Brevet betegner ikke tilbudet som
    akseptert. Om partene er enige, følger av at svaret godkjenner hele kravet (GR-U7, HF-U7), ikke
    av setningen. (LV-U32 s1, s3 og s4; OV-U69 s13)
11. For et svar på grunnlaget som etter GR-U12 og GR-U13 er en endringsordre, står setningen i
    GR-U14 i brevet også når begrunnelsen har vilkår eller forbehold. (OV-U69 s15–s16)

### C. Registrerte brev og bekreftelse

12. Et registrert brev bevares med teksten. Løsningen merker ikke et registrert brev for et
    forbehold, og ingen handling sperres fordi et brev har et forbehold. (KA-U45 s1; KA-U16 s7;
    E1) Motpartens syn på et forbehold sendes som innlegg (MM-U33). (KA-U45 s3)
13. Bekrefter byggherren et svar gitt utenfor løsningen (OV-U46), utleder løsningen virkningen av
    bekreftelsen ut fra valgene, og et forbehold i det tidligere svaret tolkes ikke. (OV-U69 s12)

### Designdel

Skjemaet sier før sending at løsningen registrerer enighet ut fra valgene (OV-U69 s5).
Skjemaet for TEs aksept sier før sending at aksepten gjelder hele svaret slik det står i brevet,
også begrunnelsen, og at løsningen ikke tolker begrunnelsen (OV-U69 s6). Skjemaet viser setningen
i GR-U14 før sending og sier at den står i brevet også når begrunnelsen har vilkår eller
forbehold (OV-U69 s16). Svarskjemaet har feltet «Forbehold» for hele svaret (OV-U72 s1). Hjem:
BF-01, som klassifiseringen sier for OV-U69 og OV-U72.

### Beslutningsdel

Et trekk avvises når det gir byggherren et fradrag, fordi løsningen da ikke vet hva byggherren
har avtalt. Delen bygges når fradrag kan uttrykkes (KA-U9). (KA-U27 s1 slik MM-U34 punkt 15 og
KA-U45 snevret den inn; Følge i KA-U27)

## Endret innhold

**E1 Sperren for et registrert brev med forbehold (KA-U16 s6–s7).** Gammel tekst: KA-U16 «Et
registrert brev med et forbehold appen ikke kan uttrykke, bevares med teksten, men regnes ikke som
en ubetinget godkjenning, og bindende handlinger som bygger på det, sperres til det er avklart. Det
gjelder ethvert ekte registrert brev med noe appen ikke kan uttrykke: det bevares og forkastes
ikke, og bindende handlinger som bygger på det, sperres etter mønsteret i MM-U2.» Samlevedtaket:
brevet bevares med teksten, og ingenting sperres (punkt 12). Et svar registrert med svarskjemaet
leses ut fra valgene, som et svar sendt fra løsningen (punkt 6). Det KA-U16 forkastet foreløpig,
«at forbeholdet registreres uten virkning», er dermed regelen i løsningen. Løsningen avgjør ikke
om forbeholdet har virkning mellom partene (punkt 8). Hvorfor: KA-U45 «Merkingen og avklaringen
av registrerte brev oppheves med sperrene sine.»; EO-U18 «Spørsmålet om vilkår eller forbehold
stilles ikke, heller ikke når byggherren registrerer korrespondanse som svar eller en
endringsordre.»; OV-U80 «Krav og svar: kravskjemaet eller svarskjemaet åpnes i samme forløp, viser
til korrespondansen og fylles ut med de samme påkrevde feltene som for et krav eller svar sendt
fra løsningen.» Uten merking finnes det ikke noe som utløser eller opphever sperren.
Følgen i KA-U16 («Presisert 10.10 av KA-U19 for brev fra appen og av KA-U20 for registrerte brev:
sperren følger det som faktisk bygger på det appen ikke kan uttrykke.») gjelder ikke lenger.

**E2 Forholdene til opphevede poster (OV-U80, KA-U45).** Gammel tekst: Følge i OV-U80 «Utvider
OV-U48. Utvider OV-U49.»; Følge i KA-U45 «Bygger på OV-U48. Bygger på OV-U49.» Samlevedtaket:
forholdene fjernes. Innholdet endres ikke: setningene de bygger på, er endret av EO-U18 og E11 i
EO-U34. Hvorfor: OV-U69 «OV-U48 og OV-U49 oppheves, også spørsmålet ved registrering av en
endringsordre som svar på grunnlaget etter OV-U6»; EO-U34 E11 «forbehold spørres ikke om
(designdelen)».

**E3 Hva «betinget enighet» betyr.** Gammel tekst: OV-U61 «Betinget enighet vises særskilt.» og
«Byggherrens svar på grunnlaget avgjør om enigheten om et beløp er betinget eller virksom, også
når svaret er en endringsordre registrert etter OV-U6.» OV-U49 D1 hadde «enighet med særskilte
vilkår», og OV-U69 sier at endringene OV-U49 gjorde «i svaret 25.10 på spørsmål 8 om
nøkkeltallene», faller bort. Samlevedtaket, etter spørsmål 2: «betinget» gjelder bare forbeholdet
for ubesvart grunnlag (punkt 7). Det er en presisering. Koden gjør det slik i dag
(`enighetensVirkning`).

**E4 Forbehold i et innlegg.** Gammel tekst: OV-U69 «Vilkår, forbehold og andre betingelser
skriver parten i begrunnelsen eller i et innlegg (MM-U33 steg 2 og 3).»; EO-U18 «Vilkår, forbehold
og andre betingelser skriver parten i begrunnelsen eller i et innlegg.»; OV-U72 «Forhold:
presiserer OV-U69 («i begrunnelsen eller i et innlegg» blir «i begrunnelsen for punktet eller under
«Forbehold»»)». Samlevedtaket etter spørsmål 1.

**E5 MM-U34 punkt 15, 18, 20 og 25.** Gammel tekst: punkt 25 «Svarer byggherren ja på spørsmålet
om godkjenningen er avhengig av andre vilkår eller forbehold, avvises sendingen ikke. …»; punkt 18
«Særskilte forslag oppheves: OV-U49 D2 (forslag om vilkår) og forslaget om å rette betegnelsen i
OV-U55.»; punkt 15 «KA-U27: «når en enighet trekket rammer» strykes. Sperren ved fradrag og ved et
merket brev som ikke er avklart, står som en begrensning i løsningen, fordi løsningen da ikke vet
hva byggherren har avtalt. KA-U30 står.»; punkt 20 «Vilkåret i KA-U26 oppheves også.»
Samlevedtaket: punkt 25 og delen «OV-U49 D2 (forslag om vilkår)» i punkt 18 står opphevet; i punkt
15 står delen om fradrag (beslutningsdelen), og delen om merket brev og «KA-U30 står» er opphevet;
setningen i punkt 20 står, og KA-U26 er opphevet. Hvorfor: OV-U69 «MM-U34 punkt 25 faller bort»;
OV-U69 «OV-U48 og OV-U49 oppheves»; KA-U45 (01.11, etter MM-U34) «Forhold: opphever KA-U26,
KA-U28, KA-U30». Raden for MM-U34 sier det ikke på punktnivå. *Fordelingen av punktene venter på
orkestratoren.*

**E6 Setningene KA-U45 snevret inn (KA-U20, KA-U27, KA-U29).** KA-U45 sier «Snevrer inn KA-U20,
KA-U27, KA-U29», men ikke hvilke setninger. Samlevedtaket navngir dem: i KA-U20 alt om merking,
sperre og avklaring (s1 og s3–s11); i KA-U27 «eller bygger på et brev som er merket etter KA-U20 og
ikke avklart» og «Delen om merket brev gjelder fra første versjon.»; i KA-U29 «og merking etter
KA-U20». Innholdet endres ikke ut over KA-U45. Hvorfor: KA-U45 s1.

**E7 Aksepten omfatter teksten under «Forbehold».** OV-U69 s6 sier «hele svaret slik det står i
brevet, også begrunnelsen». OV-U72 kom etter og la til teksten under «Forbehold», som står i
brevet. Punkt 9 nevner den uttrykkelig. Det er vår slutning fra at teksten står i brevet (OV-U72
s1), ikke ordlyden i et vedtak.

## Fordelingen

Sendt til orkestratoren 04.11, før forslaget ble skrevet: punkt 25, delen om OV-U49 D2 i punkt
18, kulepunktet om KA-U27 og KA-U30 i punkt 15 og setningen om KA-U26 i punkt 20. Svaret føres
inn her.

## Prøvingen

*Føres inn etter kontrollen.*

## Spørsmålene til oppdragsgiver

Ordrett slik de sendes. Spørsmål 1 og 2 er juridiske og stilles i tekst.

**1. Et forbehold byggherren sender i et innlegg etter svaret (juridisk).**
Bakgrunn: Byggherren kan skrive vilkår og forbehold i begrunnelsen for hvert punkt i svaret, eller
i et eget felt «Forbehold» for hele svaret. Et vedtak fra 30.10 sa også «eller i et innlegg». Et
vedtak fra 31.10 presiserte det til begrunnelsen og feltet, men et vedtak fra 03.11 om
registrering gjentar «eller i et innlegg». Et innlegg er en egen melding etter svaret. Løsningen
tolker det ikke og endrer ikke standpunktene ut fra det. Totalentreprenørens aksept gjelder hele
svaret slik det står i brevet.
Belegg: OV-U69 «Vilkår, forbehold og andre betingelser skriver parten i begrunnelsen eller i et
innlegg (MM-U33 steg 2 og 3).»; OV-U72 «Vilkår og forbehold skrives i begrunnelsen for punktet de
gjelder, eller under «Forbehold» når de gjelder hele svaret.»; EO-U18 «Vilkår, forbehold og andre
betingelser skriver parten i begrunnelsen eller i et innlegg.»; MM-U33 steg 3 «Innlegget kan
uttrykke innsigelser, protester, presiseringer, endrede standpunkter, forbehold, særskilte og
subsidiære aksepter og forslag til enighet. Løsningen tolker ikke teksten og oppdaterer ikke
strukturerte standpunkter på grunnlag av den.»
- **A (anbefalt):** «Vilkår og forbehold byggherren knytter til svaret, skrives i svaret: i
  begrunnelsen for punktet de gjelder, eller under «Forbehold» når de gjelder hele svaret. Et
  innlegg kan uttrykke forbehold (MM-U33 steg 3), men endrer ikke svaret i løsningen, og løsningen
  avgjør ikke om et forbehold i et innlegg binder (MM-U12).» Forhold: samler OV-U72; endrer OV-U69
  og EO-U18 («eller i et innlegg» gjelder ikke vilkår byggherren knytter til svaret).
- **B:** «Vilkår og forbehold skrives i begrunnelsen for punktet, under «Forbehold» eller i et
  innlegg. Løsningen tolker ingen av dem.» Forhold: endrer OV-U72 (innlegget kommer tilbake som
  sted for vilkår til svaret); samler OV-U69 og EO-U18.
Anbefaling: A. Et forbehold i et senere innlegg står ikke i brevet totalentreprenøren godtar, og
med B kunne aksepten omfatte noe som ikke står i svaret. A tar ikke fra byggherren muligheten til
å sende forbeholdet; det står bare ikke som en del av svaret i løsningen. Om det binder, avgjør
partene.
Styrer: hva skjemaet for svar og aksept sier om forbehold, og om et innlegg etter svaret vises som
en del av svaret.

**2. Hva «betinget enighet» betyr i løsningen (juridisk).**
Bakgrunn: Løsningen registrerer enighet ut fra valgene i svaret og tolker ikke teksten. Oversikten
over vederlaget viser betinget enighet særskilt. I dag er enigheten betinget bare når byggherren
har svart på vederlaget under forbeholdet for ubesvart grunnlag; den blir virksom når grunnlaget er
avklart. Det opphevede vedtaket om særskilte vilkår brukte også «enighet med særskilte vilkår».
Belegg: OV-U61 «Betinget enighet vises særskilt.» og «Byggherrens svar på grunnlaget avgjør om
enigheten om et beløp er betinget eller virksom, også når svaret er en endringsordre registrert
etter OV-U6.»; GR-U26 «I appen er forbeholdet ikke et vilkår etter HF-U7: godkjenner byggherren
hele det krevde beløpet eller antallet dager, er partene enige om beløpet eller dagene uten
aksept (GR-U7).»; OV-U69 «Løsningen registrerer enighet ut fra valgene (MM-U33 steg 5), og
skjemaet sier det før sending.» og «Registrert enighet er ikke en avgjørelse av om partene
rettslig er enige eller om et vilkår er oppfylt (MM-U12, MM-U34 punkt 12).»
- **A (anbefalt):** «Et vilkår eller forbehold i begrunnelsen eller under «Forbehold» gjør ikke
  enigheten betinget i løsningen. Enigheten er betinget bare under forbeholdet for ubesvart
  grunnlag, og byggherrens svar på grunnlaget avgjør om den er betinget eller virksom.» Forhold:
  presiserer OV-U61 og OV-U69.
- **B:** «Byggherren kan i svaret angi at godkjenningen er betinget av vilkårene i teksten.
  Enigheten vises og telles da som betinget, uten at løsningen tolker vilkårene.» Forhold: endrer
  OV-U69 («ingen egne felt for særskilte vilkår» faller bort for dette valget) og utvider OV-U61.
Anbefaling: A. Med B ville byggherren få et valg som gjør enigheten betinget uten at noen kan se
i løsningen når vilkåret er oppfylt, og enigheten ble stående betinget til en part sendte noe nytt.
Det er det OV-U69 opphevet. Med A står et vilkår i teksten og vises med svaret, og løsningen
registrerer enigheten ut fra valgene. Totalentreprenøren ser vilkåret i brevet før aksepten.
Styrer: hva oversikten over vederlaget teller som betinget og som virksom enighet.

**3. Samlet tilslutning til forslaget (prosess).**
- **A (anbefalt):** forslaget i punkt 1–13 med designdelen og beslutningsdelen, og E1–E7, gjelder
  slik det står, med svarene på spørsmål 1 og 2 og rettelsene oppdragsgiver gir per punkt. De
  gamle ID-ene står som «Samlet i …» eller «Opphevet av …» etter tabellen «Postene i kjeden».
- **B:** forslaget legges fram på nytt etter rettelsene.
Styrer: om en ny økt kan skrive postene når svarene foreligger.

## Svarene

*Føres inn når de foreligger.*
