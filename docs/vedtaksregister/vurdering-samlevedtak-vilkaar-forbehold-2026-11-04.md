# Samlevedtak: vilkår og forbehold i byggherrens svar

Dato: 04.11.2026. Kontrollert commit: `3e96a11`. Del av #1534, steg 4, trinn 2 (runde 13 i #1065).

Fila er et forslag til samlet tilslutning til reglene for vilkår og forbehold i byggherrens
svar. Hver setning i forslaget viser vedtaket og eventuelt setningen den kommer fra. «s3» betyr
den tredje setningen i vedtaksteksten i [`vedtak.md`](../plans/vedtak.md) på commiten over. Det
som endrer innholdet i en eldre post, også en motsigelse forslaget løser, står i «Endret
innhold» (E1–E8), og oppdragsgiver tar stilling til hvert punkt. Spørsmålene står ordrett slik
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
  OV-U49, og KA-U19 også ved OV-U48. Det klassifiseringen sier om dem, stemmer ikke lenger.
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
og drift». Fordelingen av setningene i MM-U34 står under «Fordelingen».

- **MM-U34**: her samles eller oppheves bare punkt 25, delen «OV-U49 D2 (forslag om vilkår)» i
  punkt 18, kulepunktet om KA-U27 og KA-U30 i punkt 15 og setningen «Vilkåret i KA-U26 oppheves
  også.» i punkt 20. Punkt 9, 10, 12 og 16 er bare kilder. Kulepunktet om OV-U4 og OV-U7 i punkt
  15 hører til #1572 og kjeden for brev utenfor løsningen, og kulepunktet om OV-U38 til «Særskilt
  varsel». Punkt 4–8, 11 og 17 er kilder i #1573.
- **OV-U4**: #1572 samler setningen om en sak som ikke er forstått. Her er OV-U4 bare kilde.
- **OV-U61**: fordeles ikke hit. #1566 opphever den (foreslått MM-U45) og endrer den (MM-U46).
  Her er den ikke kilde.
- **OV-U80**: #1572 endrer setningen om en sak som ikke er forstått, og KA-U46 viser til
  begrunnelsen. Her fjernes bare forholdene til OV-U48 og OV-U49 (E2).
- **GR-U26, GR-U29, GR-U33**: forbeholdet i brevet når grunnlaget er ubesvart hører til kjeden
  «Svar på vederlag og frist mens grunnlaget er ubesvart». Her er GR-U26 s10 bare kilde.
- **OV-U6**: s5 («byggherren kan ikke revidere svaret») hører til #1573.

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder fortsatt
som «Samlet i samlevedtaket for vilkår og forbehold». «Opphever»: samlevedtaket løser en
motsigelse og endrer innholdet i hele posten, og posten gjelder ikke lenger. «Endrer»: bare de
navngitte setningene eller punktene endres; resten av posten står, samlet her eller i en annen
kjede. Klassene er kontrollert uavhengig 04.11 (svar 8); se «Prøvingen».

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| OV-U69 | vedtak med designdel og beslutningsdel | gjeldende, presisert 31.10 av OV-U72 | samler; s1 står i beslutningsdelen og designdelen; s3 etter spørsmål 1 | E4 |
| OV-U72 | vedtak med designdel | gjeldende | samler | E4 |
| KA-U16 | vedtak med beslutningsdel | gjeldende | endrer s6–s7 (E1); s1–s5 samles | E1 |
| KA-U19 | vedtak med designdel | gjeldende, endret 30.10 av OV-U69, presisert 31.10 av OV-U72 | samler, med ordlyden OV-U69 ga s2–s3 | – |
| KA-U45 | vedtak | gjeldende, endret av EO-U18 og EO-U34 | samler s1 og s3; s2 gjelder ikke etter E11 i EO-U34; forholdene til OV-U48 og OV-U49 fjernes | E2 |
| KA-U20 | vedtak; det som står igjen, er beslutning | gjeldende, endret 01.11 av OV-U79, snevret inn 01.11 av KA-U45 | endrer: setningene om merking, sperre og avklaring (s1 og s4–s11) står opphevet; s2–s3 («I første versjon registrerer hver side bare sine egne brev.» og avgrensningen) hører til kjeden for brev utenfor løsningen | E6 |
| KA-U27 | vedtak; det som står igjen, er beslutning | gjeldende, endret av MM-U34, snevret inn av KA-U45 | samler delen om fradrag (beslutningsdel); delen om merket brev står opphevet | E6 |
| KA-U29 | vedtak | gjeldende, endret 01.11 av MM-U35, snevret inn av KA-U45 | endrer: «og merking etter KA-U20» står opphevet; resten hører til kjeden for godtatt avslag av grunnlaget | E6 |
| LV-U32 | vedtak | gjeldende, endret 30.10 av OV-U69 | samler s1, s3 og s4; s2 og s5 hører til brevtekstene for fast sum | – |
| MM-U34 | vedtak med designdel og beslutningsdel | gjeldende | endrer punkt 25 og de navngitte delene av punkt 15, 18 og 20 (etter fordelingen); punkt 9, 10, 12 og 16 er kilder | E5 |
| OV-U80 | vedtak med designdel | gjeldende, endret av EO-U18 og EO-U34, samlet 04.11 av MM-U41 | ingen setning endres her; forholdene «Utvider OV-U48» og «Utvider OV-U49» fjernes; samordnes med MM-U41, som samler posten | E2 |
| OV-U46 | vedtak med designdel | gjeldende, endret 30.10 av OV-U69 | samler setningen OV-U69 la til («Løsningen utleder virkningen av bekreftelsen …»); resten hører til kjeden for svar gitt utenfor løsningen | – |
| EO-U18 | design | gjeldende, samlet 04.11 av EO-U34 | kilde for designdelen; setningen står i designdelen i EO-U34, og «eller i et innlegg» der endres etter spørsmål 1 | E4 |
| KA-U26, KA-U28, KA-U30 | vedtak | opphevet 01.11 av KA-U45 | står opphevet | – |
| OV-U47, OV-U48, OV-U49 | vedtak | opphevet 30.10 av OV-U69 | står opphevet | – |
| MM-U33 | vedtak med designdel | gjeldende | står; kilde for punkt 10 og spørsmål 1 (steg 2, 3 og 5) | – |
| MM-U36 | design | gjeldende, flyttet til BF-01 | står; kilde | – |
| GR-U26 | vedtak med designdel | gjeldende | står; s10 er kilde for punkt 6 | – |
| OV-U61 | vedtak med designdel | gjeldende; foreslått opphevet i #1566 | står utenfor; nevnt i E3 som bakgrunn | E3 |
| HF-U7, KA-U1, MM-U35 | vedtak | gjeldende | står; HF-U7 presiseres (E8); KA-U1 og MM-U35 er kilder og belegg | E8 |
| OV-U4, OV-U6, OV-U79 | vedtak med designdel | gjeldende | står; hører til andre kjeder | – |

## Forslaget

Samlevedtaket for vilkår og forbehold i byggherrens svar. Hver setning har kilden i parentes.
Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Punkt 1 står etter svaret på
spørsmål 1.

### A. Hvor vilkår og forbehold står

1. Vilkår og forbehold skrives i begrunnelsen for punktet de gjelder, eller under «Forbehold»
   når de gjelder hele svaret. (OV-U72 s4; OV-U69 s3 slik OV-U72 presiserte den) *Ved spørsmål 1
   A står ordlyden i alternativ A her.*
2. Teksten under «Forbehold» oppfyller ikke kravet om begrunnelse i et punkt, og den sperrer
   ingenting. (OV-U72 s2–s3)
3. Vilkår og forbehold vises med svaret og tolkes ikke, og partene følger dem opp selv. (OV-U69
   s4; KA-U19 s2–s3 slik OV-U69 endret dem)

### B. Virkningen

4. Løsningen utleder virkningen av svaret ut fra valgene og tolker ikke begrunnelsen. Den
   registrerer enighet ut fra valgene. (KA-U16 s3–s4; KA-U19 s1; OV-U69 s5) Det gjelder også et
   svar som er registrert med svarskjemaet. (OV-U80, setningen «Krav og svar: …»; E1)
5. Et vilkår eller forbehold i begrunnelsen eller under «Forbehold» gjør ikke enigheten betinget
   i løsningen. (E3)
6. Registrert enighet er ikke en avgjørelse av om partene rettslig er enige eller om et vilkår
   er oppfylt (MM-U12). (OV-U69 s7; MM-U34 punkt 12; GR-U26 s10) Om et svar med et vilkår i teksten
   rettslig er en godkjenning eller et avslag med nytt tilbud, avgjør ikke løsningen. (HF-U7 s2
   og s5; E8) Brevet er det autoritative uttrykket for partens standpunkt (B-03). (OV-U69 s8;
   KA-U16 s5; KA-U19 s4) For et svar registrert med svarskjemaet er dokumentet partens meddelelse
   der skjemaet og dokumentet spriker. (OV-U80, setningen «Der skjemaet og dokumentet spriker, er
   dokumentet partens meddelelse.»)
7. TEs aksept gjelder hele det konkrete svaret byggherren har gitt, slik det står i brevet, også
   begrunnelsen og teksten under «Forbehold». (KA-U1 s1; OV-U69 s6; E7) Aksepten erklærer ikke
   frafall av andre krav eller av innsigelser. (MM-U34 punkt 16)
8. Godkjenner byggherren oppgjør som fast sum, sier brevet: «Byggherren godkjenner oppgjør som
   fast sum med beløpet og forbeholdene som fremgår av svaret.» Brevet betegner ikke tilbudet som
   akseptert. Om partene er enige, følger av at svaret godkjenner hele kravet (GR-U7, HF-U7), ikke
   av setningen. (LV-U32 s1, s3 og s4; OV-U69 s13)
9. For et svar på grunnlaget som etter GR-U12 og GR-U13 er en endringsordre, står setningen i
   GR-U14 i brevet også når begrunnelsen har vilkår eller forbehold. (OV-U69 s15–s16)

### C. Registrerte brev og bekreftelse

10. Et registrert brev bevares med teksten. Løsningen merker ikke et registrert brev for et
    forbehold, og ingen handling sperres fordi et brev har et forbehold. (KA-U45 s1; KA-U16 s6–s7;
    E1) Motpartens syn på et forbehold sendes som innlegg (MM-U33). (KA-U45 s3)
11. Bekrefter byggherren et svar gitt utenfor løsningen (OV-U46), utleder løsningen virkningen av
    bekreftelsen ut fra valgene, og et forbehold i det tidligere svaret tolkes ikke. (OV-U69 s12)

### Designdel

Skjemaet har ikke et eget spørsmål om vilkår eller forbehold i byggherrens svar, og ingen egne
felt for særskilte vilkår, heller ikke når byggherren registrerer korrespondanse som svar eller en
endringsordre. (OV-U69 s1; EO-U18 s1; KA-U16 s1) Skjemaet hjelper partene å svare med valgene
kontrakten gir, og byggherren bruker standpunktene som finnes. (OV-U69 s2; KA-U16 s2) Svarskjemaet
har feltet «Forbehold» for hele svaret, og teksten står sist i brevet. (OV-U72 s1) Skjemaet sier
før sending at løsningen registrerer enighet ut fra valgene. (OV-U69 s5) Skjemaet for TEs aksept
sier før sending at aksepten gjelder hele svaret slik det står i brevet, også begrunnelsen, og at
løsningen ikke tolker begrunnelsen. (OV-U69 s6) Det nevner også teksten under «Forbehold». (E7)
Skjemaet for svar og aksept viser innleggene fra begge parter som viser til brevene. (MM-U36 s1)
Skjemaet viser setningen i GR-U14 før sending og sier at den står i brevet også når begrunnelsen
har vilkår eller forbehold. (OV-U69 s16) Visningen av en registrert enighet viser at svaret har
tekst under «Forbehold», uten å tolke den. (Ny, fra prøvingen 04.11; design) Hjem: BF-01, som
klassifiseringen sier for OV-U69 og OV-U72.

### Beslutningsdel

Første versjon har ikke et eget spørsmål om vilkår eller forbehold i byggherrens svar, og ingen
egne felt for særskilte vilkår. (OV-U69 s1; KA-U16 s1) Et trekk, også av grunnlaget, avvises når
det gir byggherren et fradrag, fordi løsningen da ikke vet hva byggherren har avtalt. Delen bygges
når fradrag kan uttrykkes (KA-U9). (KA-U27 s1 slik MM-U34 punkt 15 og KA-U45 snevret den inn;
Følge i KA-U27)

## Endret innhold

**E1 Sperren for et registrert brev med forbehold (KA-U16 s6–s7).** Gammel tekst: KA-U16 «Et
registrert brev med et forbehold appen ikke kan uttrykke, bevares med teksten, men regnes ikke som
en ubetinget godkjenning, og bindende handlinger som bygger på det, sperres til det er avklart. Det
gjelder ethvert ekte registrert brev med noe appen ikke kan uttrykke: det bevares og forkastes
ikke, og bindende handlinger som bygger på det, sperres etter mønsteret i MM-U2.» Samlevedtaket:
brevet bevares med teksten, og ingenting sperres (punkt 10). Et svar registrert med svarskjemaet
leses ut fra valgene, som et svar sendt fra løsningen (punkt 4). Det KA-U16 forkastet foreløpig,
«at forbeholdet registreres uten virkning», er dermed regelen i løsningen. Løsningen avgjør ikke
om forbeholdet har virkning mellom partene (punkt 6). Hvorfor: KA-U45 «Merkingen og avklaringen
av registrerte brev oppheves med sperrene sine.»; EO-U18 «Spørsmålet om vilkår eller forbehold
stilles ikke, heller ikke når byggherren registrerer korrespondanse som svar eller en
endringsordre.»; OV-U80 «Krav og svar: kravskjemaet eller svarskjemaet åpnes i samme forløp, viser
til korrespondansen og fylles ut med de samme påkrevde feltene som for et krav eller svar sendt
fra løsningen.» Uten merking finnes det ikke noe som utløser eller opphever sperren.
Følgen i KA-U16 («Presisert 10.10 av KA-U19 for brev fra appen og av KA-U20 for registrerte brev:
sperren følger det som faktisk bygger på det appen ikke kan uttrykke.») gjelder ikke lenger. Det
samme gjelder merknadene som bygger på KA-U16 s6: GR-U7 «Et registrert brev med et forbehold appen
ikke kan uttrykke, er ikke en ubetinget godkjenning.» og HF-U7 «Et forbehold appen ikke kan
uttrykke, følger KA-U16 og KA-U26, der et svar med forbehold kan gi sammenfall.»

**E2 Forholdene til opphevede poster (OV-U80, KA-U45).** Gammel tekst: Følge i OV-U80 «Utvider
OV-U48. Utvider OV-U49.»; Følge i KA-U45 «Bygger på OV-U48. Bygger på OV-U49.» Samlevedtaket:
forholdene fjernes. Innholdet endres ikke: setningene de bygger på, er endret av EO-U18 og E11 i
EO-U34. Hvorfor: OV-U69 «OV-U48 og OV-U49 oppheves, også spørsmålet ved registrering av en
endringsordre som svar på grunnlaget etter OV-U6»; EO-U34 E11 «forbehold spørres ikke om
(designdelen)».

**E3 Et vilkår i teksten gjør ikke enigheten betinget.** Gammel tekst: OV-U49 D1 hadde «enighet
med særskilte vilkår», og OV-U61 «Betinget enighet vises særskilt.» OV-U69 sier at endringene
OV-U49 gjorde «og svaret 25.10 på spørsmål 8 om nøkkeltallene», faller bort. Samlevedtaket for
sakslisten og nøkkeltallene i #1566 (foreslått som MM-U45 og MM-U46) opphever OV-U61, også
setningene om betinget enighet i summen. Samlevedtaket her: punkt 5. Det er en presisering og vår slutning, ikke
ordlyden i et vedtak: den følger av OV-U69 «Løsningen registrerer enighet ut fra valgene (MM-U33 steg 5)».
Når enigheten ellers er betinget, hører til kjeden «Svar på vederlag og frist mens grunnlaget er
ubesvart» (GR-U26). Koden gjør det slik i dag (`enighetensVirkning` i
`kjerne/utledning/utled.ts`). Spørsmålet om betinget enighet ble tatt ut 04.11 etter fordelingen
fra orkestratoren, fordi valget følger av OV-U69 og ikke lenger styrer noen sum.

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
hva byggherren har avtalt. KA-U30 står.»; punkt 20 «EO-U2, EO-U5, EO-U10, vilkåret i KA-U26 og «som oppgjort i EO-U5» i KA-U12 oppheves som
vilkår for endringsordre.» (bare leddet «vilkåret i KA-U26»)
Samlevedtaket: punkt 25 og delen «OV-U49 D2 (forslag om vilkår)» i punkt 18 står opphevet; i punkt
15 står delen om fradrag (beslutningsdelen), og delen om merket brev og «KA-U30 står» er opphevet;
leddet «vilkåret i KA-U26» i punkt 20 står, og KA-U26 er opphevet. Hvorfor: OV-U69 «MM-U34 punkt 25 faller bort»;
OV-U69 «OV-U48 og OV-U49 oppheves»; KA-U45 (01.11, etter MM-U34) «Forhold: opphever KA-U26,
KA-U28, KA-U30 og LV-U4 punkt 11 og 12.» Raden for MM-U34 sier det ikke på punktnivå.

**E6 Setningene KA-U45 snevret inn (KA-U20, KA-U27, KA-U29).** KA-U45 sier «Snevrer inn KA-U20,
KA-U27, KA-U29», men ikke hvilke setninger. Samlevedtaket navngir dem: i KA-U20 alt om merking,
sperre og avklaring (s1 og s4–s11); i KA-U27 «eller bygger på et brev som er merket etter KA-U20 og
ikke avklart» og «Delen om merket brev gjelder fra første versjon.»; i KA-U29 «og merking etter
KA-U20». Innholdet endres ikke ut over KA-U45. Hvorfor: KA-U45 s1.

**E7 Aksepten omfatter teksten under «Forbehold».** OV-U69 s6 sier «hele svaret slik det står i
brevet, også begrunnelsen». OV-U72 kom etter og la til teksten under «Forbehold», som står i
brevet. Punkt 7 og designdelen nevner den uttrykkelig. Det er vår slutning fra at teksten står i brevet (OV-U72
s1), ikke ordlyden i et vedtak.

**E8 Et vilkår i teksten og godkjenningen (HF-U7).** Gammel tekst: HF-U7 «Et svar som avviker,
også med et vilkår eller en påberopelse av preklusjon med subsidiært standpunkt, er avslag i
forening med nytt tilbud (avtaleloven § 6 første ledd).» Samlevedtaket: løsningen sammenligner
valgene med kravet, og et vilkår som bare står i teksten, gjør ikke svaret til et avvik i
løsningen (punkt 4). Om svaret rettslig er en godkjenning eller et avslag med nytt tilbud, avgjør
partene (punkt 6). Forhold: presiserer HF-U7 («vilkår» i s2 er i løsningen et vilkår uttrykt i
valgene). Hvorfor: OV-U69 (30.10) «Løsningen registrerer enighet ut fra valgene» og «Registrert
enighet er ikke en avgjørelse av om partene rettslig er enige eller om et vilkår er oppfylt»;
HF-U7 «Om et avvik er så lite at det likevel blir avtale (avtaleloven § 6 annet ledd), avgjør ikke
appen (MM-U12).»

## Fordelingen

Sendt til orkestratoren 04.11, før forslaget ble skrevet: punkt 25, delen om OV-U49 D2 i punkt
18, kulepunktet om KA-U27 og KA-U30 i punkt 15 og leddet om KA-U26 i punkt 20.

Svaret fra orkestratoren 04.11: «Ja til punkt 1–4 slik du foreslo. Det kolliderer ikke med
«Særskilt varsel», som har kulepunktet om OV-U38 i punkt 15 og bare viser til punkt 8 og 24.
Punktene 9, 10, 12 og 16 kan du bruke som kilde. OV-U61 blir ikke fordelt til deg.» OV-U61
oppheves i #1566 og er derfor ikke kilde her. Setningen i GR-U26 overlates til kjeden for svar
mens grunnlaget er ubesvart.

## Prøvingen

To subagenter kontrollerte forslaget 04.11 på `c6519d7`, uavhengig av økta som skrev det.

**Kilder, sitater og alternativene mot vedtakene.** 26 funn. Rettet: punkt 1 bruker ordlyden i
OV-U72, ikke alternativ A; «første versjon» står i beslutningsdelen; «sperrer ingenting» gjelder
bare teksten under «Forbehold»; punkt 7 bruker ordlyden i MM-U34 punkt 16 og KA-U1 som kilde;
setningsnumrene i KA-U16, KA-U19 og KA-U20; «også av grunnlaget» i beslutningsdelen; sitatene fra
MM-U34 punkt 20, OV-U69 og KA-U45; merknaden om Følge i GR-U26 og KA-U16; forholdene i
spørsmål 1 (EO-U18 er samlet i EO-U34; A sier hva som gjelder for totalentreprenøren; B sier hva
aksepten omfatter); E1 tar med merknadene i GR-U7 og HF-U7; ny E8 presiserer HF-U7; «opphever» er
byttet til «endrer» for KA-U16 og MM-U34; statusene for OV-U80, KA-U19, KA-U20, KA-U29 og OV-U61.
Ikke tatt: at et forbehold byggherren kommer på etter aksept eller sammenfall bare kan stå i et
innlegg. MM-U34 punkt 9 lar byggherren sende et nytt svar også i et spor med registrert enighet,
fram til endringsordren.

**Klassene (svar 8) og forløpene.** Klassen *vedtak med designdel og beslutningsdel* for
samlevedtaket samsvarer. Rettet etter kontrollen: punkt 1 og 2 i det første utkastet (ingen egne
felt, standpunktene som finnes) og «står sist i brevet» er flyttet til designdelen, og «første
versjon» til beslutningsdelen. OV-U69 og KA-U16 har beslutningsinnhold («første versjon»), og det
som står igjen av KA-U20 og KA-U27, er beslutning; tabellen er rettet. KA-U19, KA-U45, KA-U29,
LV-U32, MM-U34, OV-U72 og OV-U46 samsvarer. Kontrollen mente beslutningsdelen om fradrag hører til
en kjede for trekk; den står her fordi KA-U27 er i denne kjeden i klassifiseringen. Resultatet
føres i #1534.

Forløpene for spørsmål 1 (fem forløp: vilkår under «Forbehold», forbehold glemt og sendt i et
innlegg, aksept før eller uten å ha lest innlegget, registrert svar med forbehold, aksept av et
svar med tekst under «Forbehold») fant ingen blindvei med A. Med B er det uklart om aksepten
omfatter innlegget, og totalentreprenøren kan bli holdt til tekst som ikke ble godtatt. Rettet etter
prøvingen: A sier at byggherren sender et nytt svar for et vilkår etter sendingen, og at innlegget
ikke inngår i aksepten; designdelen sier at skjemaet for aksept nevner teksten under «Forbehold»
og viser innleggene, og at visningen av en registrert enighet viser at svaret har slik tekst.
Prøvingen fant også at en byggherre som vil sette et vilkår uten at løsningen registrerer enighet,
kan velge et standpunkt som ikke godkjenner hele kravet. Det følger av OV-U69, ikke av
spørsmålet, og skjemaet sier før sending at enigheten registreres ut fra valgene.

## Spørsmålene til oppdragsgiver

Ordrett slik de sendes. Spørsmål 1 er juridisk og stilles i tekst.

**1. Et forbehold byggherren sender i et innlegg etter svaret (juridisk).**
Bakgrunn: Byggherren kan skrive vilkår og forbehold i begrunnelsen for hvert punkt i svaret, eller
i et eget felt «Forbehold» for hele svaret. Et vedtak fra 30.10 sa «i begrunnelsen eller i et
innlegg». Et vedtak fra 31.10 presiserte det til begrunnelsen og feltet, men et vedtak fra 03.11
om registrering, som nå står i samlevedtaket for endringsordren, gjentar «i begrunnelsen eller i
et innlegg». Et innlegg er en egen melding etter svaret. Løsningen tolker det ikke og endrer ikke
standpunktene ut fra det. Totalentreprenørens aksept gjelder hele det konkrete svaret byggherren
har gitt, slik det står i brevet. Byggherren kan sende et nytt svar fram til endringsordren, også i
et spor med registrert enighet. Et forbehold byggherren kommer på etter endringsordren, kan bare stå
i et innlegg utenfor svaret.
Belegg: OV-U69 «Vilkår, forbehold og andre betingelser skriver parten i begrunnelsen eller i et
innlegg (MM-U33 steg 2 og 3).»; OV-U72 «Vilkår og forbehold skrives i begrunnelsen for punktet de
gjelder, eller under «Forbehold» når de gjelder hele svaret.»; EO-U18 «Vilkår, forbehold og andre
betingelser skriver parten i begrunnelsen eller i et innlegg.»; MM-U33 steg 3 «Innlegget kan
uttrykke innsigelser, protester, presiseringer, endrede standpunkter, forbehold, særskilte og
subsidiære aksepter og forslag til enighet. Løsningen tolker ikke teksten og oppdaterer ikke
strukturerte standpunkter på grunnlag av den.»; KA-U1 «TEs aksept gjelder hele det konkrete
svaret byggherren har gitt på gjeldende kravversjon i sporet, med alle standpunktene i det:
preklusjon, vilkår, beløp eller dager og subsidiære standpunkter.»; MM-U34 punkt 9 «Fram til
endringsordren kan TE sende en ny kravversjon og byggherren et nytt svar også i et spor med
registrert enighet.»
- **A (anbefalt):** «Vilkår og forbehold byggherren knytter til svaret, skrives i svaret: i
  begrunnelsen for punktet de gjelder, eller under «Forbehold» når de gjelder hele svaret. Vil
  byggherren knytte et vilkår eller forbehold til svaret etter at det er sendt, sender byggherren
  et nytt svar så lenge det kan sendes. Et innlegg kan uttrykke forbehold (MM-U33 steg 3), men
  endrer ikke svaret i løsningen og inngår ikke i det TE godtar ved aksept. Løsningen avgjør ikke
  om et forbehold i et innlegg binder (MM-U12). Hva som gjelder for totalentreprenørens vilkår og
  forbehold, endres ikke.» Forhold: samler OV-U72 og OV-U69 s3 slik OV-U72 presiserte den; endrer
  designdelen i samlevedtaket for endringsordren («eller i et innlegg» gjelder ikke vilkår
  byggherren knytter til svaret); i tråd med KA-U1 og MM-U35.
- **B:** «Vilkår og forbehold skrives i begrunnelsen for punktet, under «Forbehold» eller i et
  innlegg. Løsningen tolker ingen av dem. TEs aksept gjelder svaret slik det står i brevet, og et
  vilkår i et innlegg står utenfor aksepten i løsningen.» Forhold: endrer OV-U72 (innlegget kommer
  tilbake som sted for vilkår); samler designdelen i samlevedtaket for endringsordren.
Anbefaling: A. Et forbehold i et senere innlegg står ikke i brevet totalentreprenøren godtar. Med
B sier løsningen at et vilkår kan settes i et innlegg, men aksepten omfatter det ikke, så
byggherren kan tro at vilkåret er en del av svaret når totalentreprenøren godtar. A tar ikke fra
byggherren muligheten til å sende forbeholdet; det står bare ikke som en del av svaret i
løsningen, og om det binder, avgjør partene. Prøvingen med forløpene fant ingen blindvei med A.
Styrer: hva skjemaet for svar og aksept sier om forbehold, og om et innlegg etter svaret vises som
en del av svaret.

**2. Samlet tilslutning til forslaget (prosess).**
- **A (anbefalt):** forslaget i punkt 1–11 med designdelen og beslutningsdelen, og E1–E8, gjelder
  slik det står, med svaret på spørsmål 1 og rettelsene oppdragsgiver gir per punkt. De
  gamle ID-ene står som «Samlet i …» eller «Opphevet av …» etter tabellen «Postene i kjeden».
- **B:** forslaget legges fram på nytt etter rettelsene.
Styrer: om en ny økt kan skrive postene når svarene foreligger.

## Svarene

*Føres inn når de foreligger.*
