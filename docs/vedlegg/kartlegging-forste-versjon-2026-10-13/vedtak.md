# Klassifisering av domenevedtakene (13.10, commit 44bbb49)

Kilde: `docs/vedtaksregister/vedtak.toml` (avsnitt 3.1 i hovedplanen), lest i sin helhet for
gruppene i oppdraget. «I skjemaet i dag» er slått opp i `src/lib/components/kontraktsbord/`
(TE: `NewCaseForm`, `KonsekvensVarsler`, `TeGrunnlagForm`, `TeVederlagForm`, `TeFristForm`,
`WithdrawModal`; BH: `GrunnlagForm`, `VederlagForm`, `FristForm`, `FristVarselForm`).
Anbefalingen gjelder første versjon gitt premissene 1–6 i `premisser.md`.

## Lesemåte og to funn før tabellene

**Premiss 4 er lest strengt, med to unntak.** Et brev sendt utenfor appen og registrert i den
er dokumentasjon: det vises ved sporet med dato og vedlegg, og appen utleder ingenting av det
(ingen standpunkt, enighet, sperre eller «uavklart»). Unntakene jeg anbefaler å beholde, fordi
NS 8407 ellers gjør visningen misvisende:

- **(a) TEs eget varsel med dato** (§ 32.2, § 33.4, § 34.1.2, § 34.1.3). Et varsel sendt utenfor
  appen er gyldig etter § 5 første ledd. Uten datoen stiller skjemaet byggherren
  rettidighetsspørsmålet mot kravdatoen («utledet varsel», `kjerne/utledning/utled.ts`, MM-U1),
  som da er et premiss appen har valgt. Datoen er TEs opplysning om eget brev (premiss 1), vises
  for byggherren som premiss, og byggherren tar stilling i svaret. Den endrer ikke et svar som
  alt er gitt.
- **(b) Byggherrens egen endringsordre som svar på grunnlaget** (OV-U2). Etter § 32.3 første ledd
  a og § 31.3 annet ledd er TE bundet av en endringsordre. Står svaret bare som dokumentasjon,
  viser appen «venter på svar», passivitetsveiledning etter § 32.3 annet ledd, og lar TE trekke
  grunnlaget (KA-U13 får ingen utløser). Byggherren registrerer derfor sitt eget brev ved å velge
  «godkjent» og oppgi at brevet er en endringsordre etter § 31.3. Det er byggherrens valg i
  skjemaet, ikke en utledning av dokumentet. Pris og tid i endringsordren vurderes ikke.

**Premiss 5 bygger på en uriktig beskrivelse av Python-rollupen.** I Python blir vederlag og
frist `UTKAST` når grunnlaget sendes (`timeline_service.py`, `GRUNNLAG_OPPRETTET`), og
`overordnet_status` regner bare `IKKE_RELEVANT` som ferdig. Et usendt spor hindrer altså
`OMFORENT` i dag (TFR-05; testen `test_not_omforent_with_utkast_tracks` og regresjonstesten for
TFR-05: «Vederlagssporet er aldri sendt, så saken er ikke oppgjort»). Det er bare
`kan_utstede_eo` som ser bort fra usendte spor (DT-06). Kjernen følger KA-U11: et usendt spor
er ikke avgjort (`kraveneErAvgjort`). Premisset må derfor enten rettes (usendt spor hindrer, som
i dag), eller KA-U11 må endres. Jeg har lagt premisset til grunn og foreslår endringen i E1;
spørsmålet bør likevel stilles oppdragsgiver.

Forkortelser i tabellene: «skjema» = kontraktsbordet i dag. Hvem: TE, BH, begge eller appen
(appen utleder av partens valg der det står «appen (BHs valg)»). Opphevede vedtak står med
anbefalingen `utgår` og telles ikke.

## Krav, kravversjon og trekk

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SK-02/SK-03 (05.10) | Oppdatert krav åpner sporet; aksept av forrige svar faller; godtatt svar kan ikke revideres | produkt, kontrakt | appen | status, sperre | KA-U1, KA-U2, KA-U7 | delvis | behold | — |
| «Hver oppdatering …» (05.10) | Hver oppdatering av vederlag eller frist er ny kravversjon, også med like verdier | representasjon | appen | status | KA-U2, KA-U7 | ja | behold | — |
| «Et krav TE har trukket …» (05.10) | Trukket krav kan ikke oppdateres igjen; nytt krav i ny sak | produkt | TE | avvisning | KA-U14, KA-U22 | nei | behold | — |
| KA-U2 | Kravversjoner er grunnlags-, vederlags- og fristkravene, ikke varsel, trekk eller innsigelse | representasjon | appen | beregning | — | delvis | behold | — |
| KA-U3 | Etter at kravene er avgjort avvises ny kravversjon; nytt krav i ny sak | produkt | appen | avvisning | KA-U11, KA-U7 | ja | behold | Følger endret KA-U11 (E1). Et første krav i et usendt spor er ikke en ny kravversjon |
| KA-U8 | Krav på 0 dager eller 0 kr avvises | kontrakt, produkt | TE | avvisning | KA-U12 | delvis | behold | «Sender det ikke» betyr igjen bare at TE ikke sender (KA-U12 utsatt) |
| KA-U33 | TEs fristkrav fra appen må ha begrunnelse; tilstrekkeligheten vurderes ikke | kontrakt, produkt | TE | avvisning | KA-U24 | ja | behold | — |
| KA-U12 | TE kan si «ingen krav» i usendt spor; lukker sporet som et trekk | produkt, kontrakt, tolkning | TE | sperre, status, tekst | KA-U11, EO-U5, KA-U17, KA-U22 | nei | utsett | Kommandoen finnes ikke. Usendt spor hindrer ikke «alle fremsatte krav avgjort» (E1). Et avkall sendes utenfor appen og registreres som dokumentasjon uten virkning |
| KA-U15 | «Ingen krav» i fristsporet etter § 33.4-varsel; avvist før grunnlaget er sendt | produkt | TE | avvisning | KA-U12, KA-U2, KA-U16 | nei | utsett | Faller med KA-U12. Forbeholdsdelen er besvart av KA-U16 |
| KA-U17 | «Ingen krav» er avkall også for ukjente følger; appen avgjør ikke senere avskjæring | kontrakt, produkt | TE | tekst | KA-U12 | nei | utsett | Ingen avkallstekst. Setningen «appen avgjør ikke om et senere krav er avskåret» føres inn i E1 |
| KA-U22 | Faste brevtekster for trekk og «ingen krav», uten fritekst; trekk avvises når avtalte BH-rettigheter ikke kan bevares | kontrakt, produkt | TE | tekst, avvisning | KA-U14, KA-U9, GR-U5 | delvis | forenkle | Trekktekstene og sperren beholdes; teksten for «ingen krav» bygges ikke. Dagens valgfrie fritekst i trekkdialogen utgår |
| KA-U23 | Vederlag i force majeure som andre krav; § 33.3 femte ledd som veiledning; usendt spor hindrer til «ingen krav» | produkt, tolkning | TE, BH | tekst | KA-U11, KA-U12, VS-U13 | ja (veiledning) | forenkle | Ingen kategorilogikk (premiss 6). Delen om usendt spor og «ingen krav» utgår og følger E1 (endres, E5) |
| KA-U25 | «Ingen krav»-brevet sier at avkallet ikke omfatter forseringsvederlag | kontrakt, produkt | TE | tekst | KA-U12, FO-U2 | nei | utsett | Bortfaller med KA-U12; må inn før «ingen krav» bygges (MM-U9) |
| KA-U27 | Trekk avvises når rammet enighet gir BH fradrag eller bygger på merket, uavklart brev | produkt | appen | avvisning | KA-U9, KA-U20, KA-U22 | nei | forenkle | Fradragsdelen beholdes. Merkingsdelen utsettes med KA-U20 |
| KA-U30 | Merkingssperren for trekk gjelder bare sporene merkingen gjelder | produkt | appen | avvisning | KA-U27, KA-U26 | nei | utsett | Faller med merkingen |

## Svar og standpunkt

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B-13 hovedvalg | Serveren regner resultat, beløp, dager og subsidiært standpunkt av vurderingene; avvikende klientverdi avvises | produkt, representasjon | appen (BHs valg) | beregning, avvisning | — | ja | behold | — |
| B-13 regelversjon | Regelversjonen sendes, kontrolleres og lagres; lagrede resultater regnes ikke om | representasjon | appen | avvisning | MM-U9, MM-U11 | ja | behold | — |
| B-13 begrunnelsestekst (T-a) | Den låste teksten er partens, og parten er bundet av den | kontrakt, produkt | BH | tekst | LV-U2 | delvis | behold | — |
| KA-U18 | Avslag av grunnlaget fra appen må ha begrunnelse; senere begrunnelse er eget utsagn | kontrakt, produkt | BH | avvisning | KA-U24, KA-U34 | nei | behold | — |
| KA-U21 | Påberopt § 32.2-preklusjon behandles som avslag og krever begrunnelse, også ved subsidiær godkjenning | tolkning, produkt | BH | avvisning | KA-U18 | nei | behold | — |
| KA-U24 | Svar fra appen som er mindre gunstig enn kravet, må ha begrunnelse i alle spor | produkt | BH | avvisning | KA-U18, VS-U4, VS-U5, KA-U31 | delvis | behold | — |
| KA-U31 | Én begrunnelse per svar, ikke én per brev | produkt, representasjon | BH | tekst, avvisning | KA-U24, MM-U10 | ja | behold | — |
| KA-U32 | Frafall fra appen krever begrunnelse | tolkning, produkt | BH | avvisning | KA-U24 | nei | behold | — |
| B-13 «godkjent» | «Godkjent» bare når hele kravet godkjennes; 99 %-terskelen utgår | produkt | appen (BHs valg) | beregning | KA-U9 | ja | behold | — |
| KA-U9 | BHs beløp har fortegn, kan ikke være gunstigere enn kravet; samme regel for fradrag | kontrakt, produkt | appen (BHs valg) | beregning, avvisning | — | delvis | behold | — |
| B-13 preklusjon | Påberopt preklusjon (§ 33.4, § 34.1.2, § 34.1.3) gir prinsipalt avslag med subsidiært standpunkt | produkt, kontrakt | appen (BHs valg) | beregning, tekst | VS-U5, VS-U3 | ja | behold | — |
| B-13 frist uten hindring | Dagene BH vurderer står som videre subsidiært standpunkt, også ved preklusjon | kontrakt, produkt | BH | beregning, tekst | VS-U13 | ja | behold | — |
| KA-U4 | Rettidighet lagres som i tide, for sent eller ikke vurdert; ingen standardverdi | representasjon | appen | ingen | HF-U1 | delvis | behold | — |
| KA-U16 | Ingen forbeholdstype; virkningen av standpunktene; registrert brev med forbehold sperrer | produkt, tolkning | BH, appen | sperre, tekst | MM-U2, KA-U19, KA-U20 | nei | forenkle | «Ingen forbeholdstype, utdypningen tolkes ikke» beholdes. Registrert brev har ingen virkning og gir ingen sperre (E2) |
| KA-U19 | Brev fra appen: virkning av valgene; skjemaet sier at forbehold sendes utenfor appen | produkt | part | tekst | KA-U16 | delvis | forenkle | Leddet «det som bygger på forbeholdet, sperres» utgår (E2). Skjemaet sier at et brev utenfor appen ikke endrer svaret i appen |
| KA-U20 | Registrert brev med noe appen ikke kan uttrykke, merkes; hver side registrerer egne brev; sperre til avklaring | produkt | part | sperre, status | KA-U16, KA-U7, MM-U3, KA-U11 | nei | forenkle | «Hver side registrerer bare egne brev» beholdes. Merking, bestridelse av merking og sperre utsettes (E2) |
| KA-U26 | Merking sperrer aksept, inngåelse i EO og trekk av grunnlaget i merkede spor | produkt | part | sperre, status | KA-U20, EO-U5 | nei | utsett | Ingen merking; visningen viser det registrerte brevet ved sporet |
| KA-U34 | BH kan sende senere begrunnelse fra appen per spor; endrer ingen standpunkter | kontrakt, produkt | BH | tekst | KA-U18, KA-U24, KA-U11, LV-U4 | nei | utsett | Svar fra appen har alt begrunnelse (KA-U18, KA-U24). Supplerende begrunnelse sendes som brev og registreres som dokumentasjon |
| KA-U35 | Senere begrunnelse sendt utenfor appen registreres som eget utsagn uten tekst | produkt | BH | ingen | KA-U34, MM-U12 | nei | forenkle | Registreres som vanlig dokumentasjon ved sporet, ikke som egen utsagnstype (E2) |
| KA-U36 | Registrert begrunnelse med sendt-dato før svaret avvises | produkt | appen | avvisning | KA-U35 | nei | utsett | Ingen datokontroll; datoen vises som oppgitt |
| KA-U37 | Svar fra appen har appens registreringsdato i norsk tid i KA-U36-kontrollen | representasjon | appen | avvisning | KA-U36 | nei | utsett | Faller med KA-U36. «Brev <n> av <dato>» i LV-U4 står |
| KA-U38 | Registrert svar sammenliknes på sendt-dato, ikke mottatt-dato | representasjon | appen | avvisning | KA-U36 | nei | utsett | Faller med KA-U36 |
| KA-U39 | Bestridt dato på svaret endrer ikke KA-U36-kontrollen | produkt | appen | ingen | KA-U36, MM-U7 | nei | utsett | Faller med KA-U36 og MM-U7 |

## Aksept og enighet

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KA-U1 | TEs aksept gjelder hele svaret på gjeldende kravversjon og peker på det; ellers avvist | kontrakt, representasjon | TE | avvisning, status | KT-U1, FO-U5 | delvis (status vises, ingen godta-handling) | behold | Aksepten viser hvilket svar og brev den gjelder |
| KA-U5 | Godtatt delvis godkjenning gir enighet om BHs tall, oppgjort som full godkjenning | kontrakt, produkt | TE | status | GR-U7 | delvis | behold | — |
| GR-U7 | Aksept av vederlag og frist uavhengig av grunnlaget; oppgjort når grunnlaget er avklart; sammenfall uten aksept | kontrakt, tolkning, produkt | TE, BH | status, sperre | KA-U1, GR-U10, MM-U13 | delvis | behold | Visningen skiller enighet om beløpet fra enighet om ansvaret (LV-U4 punkt 6) |
| GR-U6 | Aksept av subsidiært svar avvist mens grunnlaget venter | — | — | — | — | — | utgår | Erstattet 08.10 av GR-U7 |
| GR-U8 | TE kan ikke godta et svar som godkjenner hele kravet | produkt | TE | avvisning | GR-U7 | ja | behold | — |
| KA-U6 | TE kan trekke krav med enighet til kravene er avgjort; enigheten faller | kontrakt, produkt | TE | status | KA-U11, KA-U13, KA-U14 | delvis | behold | — |
| KA-U7 | Enighet binder begge; ny kravversjon i spor med enighet avvises | kontrakt, produkt | begge | avvisning | KA-U1, KA-U6, KA-U13 | nei | behold | Delen om registrerte brev (MM-U19) går opp i E2 |
| MM-U3 | Enighetens innhold fastsettes ved inngåelsen; vilkåret for virkning utledes løpende | kontrakt, representasjon | appen | beregning | KA-U10, GR-U7, MM-U11 | nei | behold | — |
| KA-U10 | Enigheten gjelder virkningen brevet hadde da det ble sendt; aksepten lagrer regelversjonen | representasjon, produkt | appen | beregning | MM-U9, MM-U17 | nei | behold | — |
| KA-U11 | Kravene avgjort når grunnlag avklart, hvert krav avgjort og intet spor kan sendes; da avvises endrende kommandoer | produkt, tolkning | appen | sperre, status | GR-U7, KA-U7, KA-U12, MM-U7 | nei | forenkle | Endres (E1): «alle fremsatte krav avgjort»; usendt spor hindrer ikke; første krav i usendt spor godtas; det som var avgjort, forblir sperret |
| KA-U28 | Når kravene er avgjort, godtas avklaring av merking uten standpunktendring | produkt | avsender | sperre | KA-U11, KA-U20, KA-U26 | nei | utsett | Faller med merkingen |
| KA-U29 | Etter godtatt avslag godtas utsagn uten virkning: bestridelse, innsigelse, protest, passivitet, merking | produkt | begge | tilgjengelig handling | KA-U11, MM-U7, VS-U9, VS-U12 | nei | utsett | Etter godtatt avslag avvises alle kommandoer; registrering som dokumentasjon godtas (E2) |
| KA-U13 | Trekk av grunnlaget avvises når godkjenningen er endringsordre etter § 32.3 a | kontrakt, produkt | TE | avvisning | GR-U10, GR-U11, GR-U13 | nei | behold | — |
| KA-U14 | Trekk er bare avkall på eget krav og opphever ikke pålegg eller EO; registrert brev må avklares | kontrakt, produkt | TE | avvisning, tekst | KA-U13, GR-U13, GR-U5 | nei | forenkle | Avkallsprinsippet og sperren beholdes. Leddet om registrert korrespondanse erstattes av unntak (b) i E2 |
| «Aksept av avslag …» (19.09) | Godtatt avslag gir egen sporstatus | produkt | appen | status | KA-U1, SK-01 | ja | behold | Visningsetikett; ingen regel leser den |

## Grunnlag, frafall og trekk av grunnlaget

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GR-U1 | Ny grunnlagsversjon åpner sporet; forrige svar faller; subsidiære svar forblir subsidiære | produkt | appen | status | KA-U1, GR-U2 | nei | behold | — |
| GR-U2 | Godkjent grunnlag med enighet kan ikke endres, heller ikke underkategorien | kontrakt, produkt | TE | avvisning | GR-U10 | ja | behold | — |
| GR-U10 | Godkjenning uten påberopt preklusjon gir enighet ved sammenfall og er EO; frafall kan revideres | kontrakt, produkt | BH | status, sperre | GR-U11, GR-U13, MM-U11 | delvis | behold | — |
| GR-U3 | Etter frafall er saken omforent når vederlag og frist er oppgjort; EO for utført arbeid i egen sak | kontrakt, produkt | appen | status | EO-U1, OV-U2, KA-U11 | ja | forenkle | «Oppgjort» gjelder de fremsatte kravene (E1). EO-saken føres utenfor appen (OV-U2) |
| GR-U4 | BHs revisjon mens grunnlaget venter er prinsipal; blir subsidiær ved avslag | produkt | appen (BHs valg) | beregning | B-13 avslått grunnlag | ja | behold | — |
| GR-U5 | Trekk av grunnlaget trekker alle sendte krav, også godkjente | kontrakt, produkt | TE | status | KA-U13, KA-U14, KA-U22 | ja | behold | — |
| GR-U9 | TE kan ikke godta frafall; BH kan revidere det til kravene er avgjort | produkt, tolkning | TE, BH | avvisning | KA-U11, GR-U7 | nei | behold | — |
| GR-U11 | § 32.2 gjelder alle underkategorier under endring unntatt EO | kontrakt, tolkning | appen | beregning | — | ja | behold | — |
| GR-U12 | Godkjenning uten påberopt preklusjon der § 32.2 gjaldt er EO, også registrert; fryses; skjemaet varsler | kontrakt, produkt, representasjon | BH | tekst, status | GR-U11, GR-U13, MM-U11, MM-U17 | delvis | forenkle | Gjelder svar fra appen; «også registrert korrespondanse» utgår unntatt (b) i E2 |
| GR-U13 | Godkjenningen er EO bare når § 31.3 også er oppfylt; registrator oppgir det for registrerte brev | kontrakt, produkt, representasjon | BH | tekst, status | GR-U12, KA-U14, MM-U17 | nei | forenkle | Brevtekst og fullmakt for svar fra appen beholdes. Registratorens opplysning gjelder bare BHs egen EO (E2 b) |
| GR-U14 | Fast tekst for godkjenning som er EO, med sitat av TEs beskrivelse; variant for registrert TE-krav | produkt, kontrakt | BH | tekst | GR-U13, GR-U15, HF-U1 | nei | forenkle | Hovedteksten beholdes. Varianten for registrert krav får ingen utløser (et registrert krav er ikke et krav i appen) |
| GR-U15 | TEs § 32.2-varsel fra appen må beskrive pålegget | produkt | TE | avvisning | GR-U13, GR-U14 | delvis | behold | — |
| GR-U16 | Grunnlagskrav i underkategori EO må oppgi EO-dato eller -nummer, også ved registrering | produkt, representasjon | TE | avvisning, tekst | HF-U1, LV-U4 | nei | forenkle | Påkrevd i krav fra appen; kravet ved registrering utgår (registreringen har ingen virkning) |
| B-13 endret underkategori | Endret underkategori etter svar krever nytt svar; låsing og § 32.2-vurdering faller | produkt | appen | status | GR-U1, GR-U2 | ja | behold | — |
| B-13 avslått grunnlag | Svar på vederlag og frist er subsidiære når grunnlaget er avslått; utledes, lagres ikke | kontrakt, produkt | appen (BHs valg) | beregning, tekst | GR-U4 | ja | behold | — |
| B-13 grunnlag_varslet_i_tide | Rettidighet etter § 32.2 avvises utenfor § 32.2 | kontrakt, produkt | appen | avvisning | GR-U11 | ja | behold | — |
| B-13 «frafalt» | Frafall avvises utenfor irregulær endring og valgrett | kontrakt, produkt | appen | avvisning | GR-U11 | ja | behold | — |
| «Byggherren kan svare avslått …» (05.10) | Avslag og påberopt sen varsling samtidig; preklusjonen er hovedgrunnen | kontrakt, produkt | BH | tekst, beregning | — | ja | behold | — |
| #235 | Frafall kan ikke kombineres med påberopt sen varsling | kontrakt, produkt | BH | avvisning | — | nei | behold | — |
| «Frafall gir egen sporstatus» (05.10) | Frafall gir status «frafalt», regnet som avklart grunnlag | produkt | appen | status | GR-U3, MM-U13 | delvis | forenkle | Visningsetikett av standpunktet; reglene leser frafallet direkte (MM-U13) |
| SD-02 | Trekk av grunnlaget før vederlag og frist er sendt lukker saken; usendte spor regnes trukket | produkt, kontrakt | TE | status | GR-U5, KA-U22 | nei | behold | — |
| #213 | Godtatt avslag av grunnlaget lukker saken uansett vederlag og frist | kontrakt, produkt | TE | status, sperre | SK-01, KA-U29 | ja | behold | Uten KA-U29-unntakene |
| SK-01 | Godtatt § 32.2-preklusjon er godtatt avslag; saken lukket; EO kan ikke utstedes | kontrakt, produkt | TE | status, sperre | #213, KA-U1 | ja | behold | — |
| TFR-05 | Godkjent grunnlag der resten ikke er sendt, er under behandling | produkt | appen | status | KA-U11 | ja | behold | Forenlig med E1, som krever minst ett fremsatt krav |

## Varsler, frister og innsigelser

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SK-12 | Dato og metode for TEs varsel settes én gang; senere annen dato avvises | produkt, representasjon | TE | avvisning | MM-U1, VS-U6 | nei (overskrives) | behold | — |
| MM-U1 | Utledet varsel låses ikke; TE kan registrere varselet senere med tidligere dato; BHs preklusjon blir uavklart | produkt, tolkning | TE, BH | status, sperre | SK-12, MM-U8, MM-U7 | nei | forenkle | Endres (E4): første registrering beholdes (unntak a); svaret står med virkningen; ingen «uavklart»; premisset vises |
| MM-U8 | Registrert varsel etter påberopt preklusjon: TE kan ikke godta før BH svarer på nytt | produkt | appen | sperre | MM-U1 | nei | utsett | Aksepten godtas. Visningen viser hvilket varsel BHs standpunkt gjaldt og datoen TE senere oppga |
| MM-U7 | Part kan bestride motpartens opplysning, også etter avsluttet sak; uten virkning | produkt | begge | ingen | KA-U11, MM-U14 | nei | utsett | BH tar stilling i svaret (rettidighet og begrunnelse); ellers brev registrert som dokumentasjon |
| VS-U6 | TEs § 34.1.2-varsel registreres som eget varsel med dato; BH vurderer varselet | kontrakt, representasjon | TE, BH | beregning | SK-12 | delvis | behold | — |
| VS-U7 | Senere registrert § 34.1-varsel gjør påberopt preklusjon eller begrensning uavklart | produkt | TE, appen | sperre, status | MM-U1, MM-U8, VS-U5 | nei | forenkle | Som MM-U1 (E4) |
| VS-U8 | Varsel fra appen får serverdato; registrert varsel får TEs dato, som BH kan bestride | representasjon, produkt | TE, BH | ingen | MM-U7, DRF-03 | nei (dagens dato) | forenkle | Datoreglene beholdes (unntak a). BH bestrider i svaret, ikke som eget utsagn (E2) |
| VS-U15 | TE kan sende eget § 33.4-varsel fra appen uten dager; grunnlagskravet er ikke varsel | kontrakt, produkt | TE | tekst | VS-U8, KA-U8 | ja | behold | — |
| VS-U16 | Etter fristkrav avvises nytt § 33.4-varsel fra appen | produkt | TE | avvisning | VS-U15, MM-U1 | delvis | behold | — |
| TFR-06/DRF-01 | BH kan sende § 5-innsigelse og § 33.6.2-forespørsel som egne handlinger | kontrakt, produkt | BH | avvisning, tilgjengelig handling | VS-U1 | ja | behold | — |
| VS-U1 | § 5-innsigelse mot ethvert varsel, krav eller svar; protest vises ved siden av | kontrakt, produkt | begge | ingen | VS-U9, MP-U6 | delvis | forenkle | BHs innsigelse som i dag og i svaret (VS-U9) beholdes. TEs innsigelse og protest utsettes; sendes som brev og registreres |
| VS-U9 | Påberopelsen i BHs svar er innsigelsen; egen innsigelse før og etter svar; protestregelen | tolkning, produkt | BH | tekst | VS-U1, VS-U11, MP-U6 | delvis | forenkle | «Påberopelsen er innsigelsen» og gjentakelsen beholdes. Egen innsigelse etter svaret og protestregelen utsettes |
| VS-U11 | BH kan uttrykkelig gi opp innsigelsen i senere svar fra appen; taust registrert svar leses med innsigelsen | produkt, kontrakt, tolkning | BH | tekst, beregning | VS-U9, GR-U12, GR-U13 | nei | forenkle | Gjelder svar fra appen. Leddene om registrerte svar utgår (E2) |
| VS-U14 | VS-U9 og VS-U11 gjelder også TE som mottaker; virkning først ved § 34.3.3 | produkt | TE | ingen | VS-U9, VS-U11, OV-U1 | nei | utsett | Ingen utløser i første versjon (§ 34.3.3 avvises) |
| B-13 passivitet | Passivitet etter § 32.3 annet ledd varsles uten konklusjon | kontrakt, produkt | appen | tekst | VS-U2, VS-U10 | delvis | behold | — |
| VS-U2 | Passivitet og søksmålsfrist vises som veiledning uten konklusjon | produkt | appen | tekst | VS-U10, VS-U3 | delvis | behold | Utgangspunktet er brev i appen; registrerte brev vises ved siden av (konflikt K6) |
| VS-U10 | «Uten ugrunnet opphold»: mottaksdato, dager siden og bestemmelsen, ingen fast frist | produkt | appen | tekst | VS-U2 | nei (fast 10 dager) | behold | — |
| VS-U12 | TE kan påberope BHs passivitet som eget utsagn uten virkning | produkt | TE | ingen | VS-U3, GR-U11 | nei | utsett | Påberopes i brev utenfor appen og registreres; veiledningen vises fortsatt |
| VS-U3 | Tre behandlingsmåter: utled av partens standpunkt, registrer og vis, appens vurdering der vedtatt | produkt, tolkning | appen | beregning, tekst | VS-U2, OV-U1 | delvis | behold | § 33.8 og § 34.3.3 følger OV-U1 |
| VS-U4 | Påberopt sen spesifisering: prinsipalt «måtte forstå», subsidiært ved rettidighet | kontrakt, produkt | BH | beregning | VS-U3, KA-U24 | ja | behold | § 34.3.3-delen følger OV-U1 |
| VS-U5 | For sent § 34.1.3-varsel: prinsipalt beløp etter begrensningen, subsidiært uten | kontrakt, produkt | BH | beregning | B-13 preklusjon, KA-U24 | delvis | behold | — |
| VS-U13 | Force majeure: BHs standpunkt om vilkårene i § 33.3 er avslag av grunnlaget; hindring som § 33.1 | tolkning, produkt | BH | beregning | VS-U3, HF-U2 | nei | behold | Forenlig med premiss 6: BH godkjenner eller avslår; ingen standpunkt per vilkår |
| DRF-03 | Sendedato for TEs § 34.3.3-varsel settes av serveren | representasjon | appen | ingen | VS-U8, OV-U1 | nei | utsett | § 34.3.3 avvises (OV-U1) |
| MP-U4 | I metodeprøven gjør sen punkt 5-innsigelse spesifiseringen rettidig, uten rekursjon | tolkning | — | ingen | — | nei | utsett | Gjelder prøven; ingen produksjonsregel |
| MP-U5 | Rettidighet vurderes per innsigelse i et brev | tolkning | — | ingen | — | nei | utsett | Gjelder prøven; appen vurderer ikke rettidighet (VS-U1) |
| MP-U6 | Protest uten skille gjelder alle innsigelsene i brevet | tolkning | — | ingen | VS-U9 | nei | utsett | Faller med protesten |
| MP-U7 | Senere dokumentert innsigelse gir «uavklart: motstridende dokumentasjon» | tolkning | appen | status | — | nei | utsett | Strider mot premiss 4; gjelder prøven |

## Endringsordre og forsering

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EO-U1 | EO bare som EO-sak; EO-hendelse i KOE-sak avvises | representasjon, produkt | BH | avvisning | GR-U3, OV-U1 | nei | utsett | EO-sak avvises (OV-U1); KOE-saken viser at den ikke støttes |
| EO-U2 | KOE-sak kan inngå i EO når omforent og minst ett spor godkjent; sendbart spor hindrer | produkt | appen | status | EO-U5 | nei | utsett | Ingen EO-kandidat. Må endres etter E1 når EO bygges |
| EO-U3 | KOE-sak inngår i høyst én EO | produkt | appen | avvisning | EO-U2 | nei | utsett | Ingen EO-sak |
| EO-U4 | Strengt livsløp for EO-saken | produkt | BH, TE | avvisning | EO-U8, EO-U9 | nei | utsett | Ingen EO-sak |
| EO-U5 | KOE kan inngå i EO når grunnlaget er godkjent og ett spor har enighet; sendbart spor hindrer | produkt | appen | status | KA-U12, KA-U26 | nei | utsett | Visningen viser ikke «kan inngå i endringsordre». Må endres etter E1 når EO bygges |
| EO-U6 | EO i EO-sak som svar på grunnlaget lagrer grunnlagssvar i KOE-saken | representasjon, kontrakt | BH | status | KA-U12, GR-U13 | nei | utsett | Erstattes i første versjon av OV-U2 (E2 b) |
| EO-U7 | KOE-sak med EO som grunnlagssvar kan senere inngå i ny EO | produkt | appen | ingen | EO-U6, EO-U3 | nei | utsett | Ingen utløser |
| EO-U8 | EO kan inneholde egne utsagn om pris og tid, hver besvart for seg | kontrakt, representasjon | BH, TE | status | EO-U4, KA-U1 | nei | utsett | Pris og tid i en registrert EO vurderes ikke (E2 b) |
| EO-U9 | EO som svar på grunnlaget kan ikke revideres | produkt | BH | avvisning | EO-U6 | nei | utsett | Ingen EO-sak |
| «En endringsordresak kan følge …» (29.09) | EO-sak kan følge av, men ikke erstatte, en KOE-sak | representasjon | appen | ingen | — | nei | utsett | Ingen EO-sak |
| TFR-02 | Forsering får aldri lukket status; EO forhandles ikke | produkt | appen | status | — | nei | utsett | Sakstypene avvises |
| FO-U1 | TE kan anse prinsipalt fristavslag som pålegg om forsering for avslåtte dager | kontrakt, produkt | TE | tilgjengelig handling | OV-U1, FO-U5 | delvis (veiledning i BH-skjemaet) | utsett | Forsering varsles utenfor appen og registreres; veiledningen om § 33.8 i BH-skjemaet beholdes |
| FO-U2 | TE melder valget og antatt kostnad; vederlag kreves i forseringssaken | kontrakt, produkt | TE | handling | FO-U1 | nei | utsett | Utenfor appen (OV-U2) |
| FO-U3 | BH har ingen svarplikt etter § 33.8; 30 %-grensen vises betinget | kontrakt, produkt | BH | tekst | FO-U1 | nei | utsett | Utenfor appen |
| FO-U4 | Revidert fristsvar etter valgt forsering lar forseringssaken stå | produkt | BH | status | FO-U1 | nei | utsett | Utenfor appen |
| FO-U5 | TEs aksept av fristavslag avvises mens en forseringssak viser til det | produkt | appen | sperre | OV-U2 | nei | utsett | Ingen utløser; aksepten godtas (OV-U2) |
| FO-U6 | Fullmakt for forseringssvarene | produkt | BH | handling | FO-U3 | nei | utsett | Utenfor appen |
| «Forsering er utenfor godkjenningsflyten» (18.09) | Forsering går utenom intern godkjenning | produkt | BH | ingen | FO-U6 | nei | utsett | Utenfor appen |

## Sendte brev, regelendring og saker kjernen ikke forstår

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B-03 hovedvalg | Hver innsending får eget brev, som er det autoritative uttrykket for standpunktet | kontrakt, produkt | part | tekst | MM-U10, LV-U2 | ja | behold | — |
| B-03, dokumentet | Hvert brev blir ett Catenda-dokument, som ikke revideres | representasjon | appen | ingen | LV-U1, HF-U1 | nei | behold | — |
| MM-U9 | Sendt brev beholder virkningen; regelendring gjelder nye brev; avvik vises som merknad | representasjon, produkt | appen | beregning, tekst | MM-U11, MM-U12 | nei | behold | — |
| MM-U10 | Ett brev fra én part kan ha utsagn i flere spor | representasjon, kontrakt | part | ingen | B-03, KA-U1 | delvis | behold | — |
| MM-U11 | Standpunktene og sammenfallet fryses; utfallet utledes med gjeldende sammensetningsregel | representasjon | appen | beregning | MM-U9, MM-U13 | nei | behold | — |
| MM-U12 | Appens vurdering fryses, men er ingen rettslig avgjørelse; avklaring er nytt utsagn | representasjon, kontrakt | appen | ingen | MM-U9, MM-U17 | nei | forenkle | Gjelder brev fra appen; registratorens vurdering bare for unntak (b) |
| MM-U4 | Aksept avvist når brevet avviker fra dagens utledning | — | — | — | — | — | utgår | Opphevet 09.10 av MM-U9 |
| MM-U5 | Avvikende grunnlagssvar etter regelendring gir uavklart grunnlag | — | — | — | — | — | utgår | Opphevet 09.10 av MM-U9 |
| MM-U6 | Svar uten beslutningsgrunnlag kan ikke godtas | — | — | — | — | — | utgår | Opphevet 09.10 av MM-U9 |
| MM-U2 | Hendelse kjernen ikke kan tolke, stopper bindende kommandoer i saken | representasjon, produkt | appen | sperre | HF-U1, MM-U18 | nei | behold | — |
| MM-U14 | Bestridelse avvises når saken ikke er forstått | produkt | appen | avvisning | MM-U2, MM-U7 | nei | utsett | Faller med MM-U7 |
| MM-U18 | Hendelse i strid med enighet eller lukking gjør saken ikke forstått | representasjon | appen | sperre | MM-U2, KA-U7, KA-U11 | nei | forenkle | Kontrollen av journalen beholdes; leddene om registrerte brev går opp i E2 |
| MM-U19 | Registrert brev i strid med enighet bevares uten virkning | representasjon, produkt | appen | ingen | MM-U18, KA-U16 | nei | forenkle | Går opp i E2: ingen registrerte brev har virkning, så klassen trengs ikke |
| MM-U20 | Svar eller aksept i et trukket spor gjør saken ikke forstått | representasjon | appen | sperre | MM-U18 | nei | behold | — |
| HF-U1 | Brev lagres samlet; hvert utsagn viser til det det gjelder; manglende vurdering er ikke standpunkt | representasjon, kontrakt | appen | avvisning | MM-U2, VS-U2 | nei | behold | — |
| B-10 | Versjoner holdes atskilt; journalen skrives aldri om; lagret resultat bare med samme versjoner | representasjon | appen | ingen | MM-U15, MM-U16, MM-U17 | nei | forenkle | Journal, frosne brev og formatversjon beholdes. Regn saken fra journalen ved lesing til et lagret resultat trengs |
| MM-U15 | Utdatert lagret resultat regnes ut før visning; «Oppdateres» i oversikten | produkt | appen | status | B-10 | nei | utsett | Ingen lagret resultat å merke |
| MM-U16 | Før regelendring regnes alle saker med gamle og nye regler, med rapport | produkt | appen | tekst | MM-U11 | nei | utsett | Gjelder fra første regelendring etter at reelle saker finnes |
| MM-U17 | Registrert brev: appens vurdering fryses etter reglene ved registreringen | representasjon | appen | beregning | GR-U12, GR-U13, KA-U10, MM-U9 | nei | forenkle | Gjelder bare unntak (b), BHs egen registrerte EO |
| LV-U1 | Det som leveres, fryses i samme transaksjon; nye forsøk sender samme brev | representasjon | appen | ingen | B-03, B-19 | nei | behold | — |
| LV-U2 | Avsender godkjenner brevteksten appen lager; den fryses | produkt, kontrakt | part | tekst | LV-U1, LV-U3 | delvis | behold | — |
| LV-U3 | Hvert utsagn med virkning står i brevteksten; resten er ikke meddelt | kontrakt, produkt | part | tekst | LV-U2, LV-U4 | delvis | behold | — |
| LV-U4 | Ordlyden i brevtekstene, punkt 1–13 | produkt | part, appen | tekst | LV-U3, GR-U14, KA-U22 | delvis | forenkle | Punkt 1–7 og 13 bygges. Punkt 8 (protest), 9 (passivitet), 10 (bestridelse), 11 (merking) og 12 (avklaring) utsettes |
| LV-U5 | «I tide» og oppgivelsen nevner varselet de gjelder | produkt | BH | tekst | LV-U4 | delvis | behold | — |
| LV-U6 | «NS 8407» står også i klammen om § 33.4 | produkt | appen | tekst | LV-U4, LV-U5 | ja | behold | — |

## Kontrakt, API og saksopprettelse (domenevedtak)

KT-U2, API-vedtaket 05.10, det tilstandsløse endepunktet, B-15 og saksopprettelsen er tekniske
eller produktvalg uten domeneinnhold og er ikke tatt med.

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KT-U1 | Hvert spor har ID-en til svaret på gjeldende kravversjon; aksepten viser til den | representasjon | appen | avvisning | KA-U1 | delvis | behold | — |

## Arkitektur, språk og overgang (domenevedtak)

| ID | Påstand | Art | Hvem | Virkning | Avhengigheter | Skjema | Anbefaling | Atferd ved utsettelse eller forenkling |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OV-U1 | Første versjon: KOE med tre spor, aksept, trekk, «ingen krav», § 5, § 33.6.2 og registrering; forsering, EO-sak og § 34.3.3 avvises | produkt | appen | avvisning | B-17, OV-U2 | delvis | forenkle | Endres (E3): «ingen krav» tas ut; registrering er dokumentasjon med unntakene i E2 |
| OV-U2 | Forsering og EO-sak utenfor appen; EO som svar på grunnlaget registreres som BHs grunnlagssvar | produkt, kontrakt | BH, TE | status, tekst | FO-U5, GR-U13, KA-U16 | nei | forenkle | Endres (E6): BH velger selv «godkjent» og oppgir § 31.3; pris og tid vurderes ikke og gir ingen sperre |
| HF-U2 | Begrepene i hendelsene følger kontrakten; appens vurdering lagres atskilt | representasjon, kontrakt | appen | ingen | B-17, MM-U12 | delvis | behold | — |
| MM-U13 | Reglene stiller det presise kontraktsspørsmålet; ingen samlebetegnelse unntatt «avklart» | representasjon | appen | ingen | GR-U7, KA-U11, EO-U5 | nei (kjernen: ja) | behold | — |

## Oppsummering

152 rader, hvorav 4 opphevede eller erstattede (GR-U6, MM-U4, MM-U5, MM-U6). 148 rader har
anbefaling.

| Anbefaling | Antall |
| --- | --- |
| behold | 76 |
| forenkle | 29 |
| utsett | 43 |
| utgår (opphevet) | 4 |

| Art (en rad kan ha flere) | Antall rader |
| --- | --- |
| kontrakt | 58 |
| produkt | 117 |
| tolkning | 18 |
| representasjon | 38 |

Per gruppe (behold / forenkle / utsett): krav 7/3/5, svar 13/4/6, aksept 10/2/2 (1 utgår),
grunnlag 18/6/0, varsler 12/6/9, endringsordre og forsering 0/0/18, sendte brev 13/6/3 (3 utgår),
kontrakt 1/0/0, arkitektur 2/2/0.

Av de 29 `forenkle`-radene endres 19 av E1–E6 (6 direkte, 13 gjennom det nye vedtaket i E2);
resten forenkles ved at en del av vedtaket ikke bygges. 18 av de 43 utsettelsene er endringsordre og forsering, som OV-U1
alt avviser.

Hovedbildet: det som regner ut virkningen av partens egne valg (B-13, KA-U9, GR-U4, VS-U4,
VS-U5, GR-U7, KA-U1), og representasjonen (HF-U1, MM-U9–MM-U11, LV-U1–LV-U3) beholdes. Det
som utsettes, er nesten bare tre klynger: «ingen krav» (premiss 5), virkning av registrerte
brev med merking, bestridelse og datokontroller (premiss 4), og EO-sak og forsering (allerede
avvist i OV-U1).

## Unntak i unntak

Vedtak som bare utløses av et annet utsagn som selv er uten virkning på utfallet (eller som ikke
finnes i første versjon):

1. **Kjeden fra senere begrunnelse:** KA-U34 (begrunnelse uten virkning) → KA-U35 (registrering
   av den) → KA-U36 (datokontroll av registreringen) → KA-U37 og KA-U38 (hvilken dato) → KA-U39
   (bestridelse uten virkning av datoen i kontrollen). Fire vedtak om kontrollen av en
   registrering som ikke endrer noe.
2. **KA-U28:** avklaring av en merking når kravene er avgjort, der merkingen selv ikke kan endre
   utfallet (Følge i KA-U28).
3. **KA-U29:** unntak fra lukkingen for utsagn som alle er uten virkning (bestridelse, innsigelse,
   protest, passivitet, merking).
4. **KA-U30:** innsnevring av merkingsdelen av trekksperren i KA-U27, som selv bare utløses av
   merking.
5. **KA-U20, bestridelse av merkingen** (MM-U7): et utsagn uten virkning om et utsagn som bare
   sperrer.
6. **MM-U14:** avvisning av bestridelsen (uten virkning) når saken ikke er forstått.
7. **MP-U6 i VS-U9:** rekkevidden av en protest som registreres uten virkning (VS-U1).
8. **VS-U11, leddet om registrerte svar:** et taust registrert svar «leses med innsigelsen», men et
   registrert svar har ingen virkning etter premiss 4.
9. **GR-U16, registreringsdelen:** en registrering avvises når et felt mangler, selv om
   registreringen ikke har virkning.
10. **Uten utløser i første versjon:** KA-U25 (tekst i «ingen krav» om forsering), KA-U15
    (vilkår for «ingen krav»), VS-U14 (TEs påberopelse ved § 34.3.3), FO-U5 (sperre ved
    forseringssak i appen, jf. OV-U2), EO-U7 og GR-U14-varianten for registrert krav.

## Konflikter: behold som bygger på utsett

Kontrollert for hver `behold`-rad mot `utsett`-radene og de utsatte delene av `forenkle`-radene.

- **K1 (reell): KA-U11 som vedtatt + KA-U12 utsatt.** KA-U11 krever at et usendt spor lukkes med
  trekk eller «ingen krav». Uten «ingen krav» blir en sak der TE aldri sender fristkrav, aldri
  avgjort, og et usendt spor kan ikke trekkes. Det strider også mot premiss 5. Løses med E1.
- **K2 (reell, løses av unntak b): KA-U13, KA-U6 og GR-U5 + GR-U13/KA-U14 for registrerte brev.**
  Er byggherrens endringsordre bare dokumentasjon, tillater appen trekk av grunnlaget og viser
  saken som trukket, mens TE er bundet etter § 31.3 annet ledd. Utledningen er bare riktig når
  det ikke finnes en endringsordre utenfor appen. Løses ved å beholde OV-U2 som unntak (E2 b,
  E6) og teksten i KA-U22 om at trekket ikke opphever en endringsordre.
- **K3 (betinget): GR-U10 og GR-U7 (sammenfall og enighet) + merking utsatt (KA-U20, KA-U26).**
  Appen sier at partene er enige også om avsenderen samtidig har sendt et forbehold utenfor
  appen. Det holder bare fordi avsenderen er bundet av det den sendte fra appen (KA-U19, MM-U17s
  prinsipp). Krever at skjemaet (KA-U19) sier at et brev utenfor appen ikke endrer svaret, og at
  visningen viser registrerte brev ved sporet.
- **K4 (betinget): KA-U1 aksept + MM-U8 og VS-U7 utsatt.** TE kan godta et svar der byggherrens
  preklusjon gjaldt kravet som varsel, etter å ha registrert et tidligere varsel. Enigheten er
  TEs valg og riktig, men bare hvis aksepten viser hvilket varsel standpunktet gjaldt. Ellers
  godtar TE på et misvisende premiss (kontrollpunktet om hvilket objekt handlingen gjelder).
- **K5 (betinget): KA-U3 og endret KA-U11 + KA-U12 utsatt.** Avvises et første krav i et usendt
  spor når «alle fremsatte krav» er avgjort, tillegges taushet virkning. E1 godtar derfor et
  første krav i et usendt spor.
- **K6 (betinget): VS-U2, VS-U10 og «venter på svar» + registrerte brev uten virkning.**
  Veiledningen «N dager siden mottak» og «venter på svar» er bare riktige når motparten ikke har
  svart utenfor appen. Visningen må vise registrerte brev fra motparten i sporet ved siden av
  veiledningen (E2).
- **K7 (betinget): kravet som varsel etter § 33.4 (MM-U1, `utled.ts`) + forenklet MM-U1.**
  Rettidighetsspørsmålet stilles mot kravdatoen når ikke noe varsel er registrert. Det er en
  tolkning appen gjør, og skjemaet må vise premisset (E4).
- **Ingen konflikt:** B-13 preklusjon og VS-U3 + TEs protest og innsigelse etter svaret utsatt.
  Utledningen er på byggherrens premisser og var aldri avhengig av protesten (VS-U1: registreres
  uten virkning). EO-U5 er utsatt, og ingen `behold`-rad bygger på den; visningen må likevel ikke
  vise «kan inngå i endringsordre» (`kanInngaaIEo` finnes i kjernen).

## Vedtak som må endres for at første versjon skal henge sammen

**E1. KA-U11 (premiss 5).** Forslag:
«KA-U11 (første versjon): alle fremsatte krav i saken er avgjort når grunnlaget er avklart etter
GR-U7, minst ett vederlags- eller fristkrav er fremsatt, og hvert fremsatt vederlags- og
fristkrav er trukket eller har en virksom enighet. Et spor TE ikke har sendt, hindrer ikke.
Visningen sier «Alle fremsatte krav er avgjort», ikke at saken er oppgjort eller at TE ikke har
flere krav, og taushet tillegges ikke virkning som avkall. Når alle fremsatte krav er avgjort,
avvises hver kommando som kan endre utfallet i grunnlaget og de fremsatte kravene: trekk, ny
kravversjon og byggherrens revisjon, også av et frafall. Et første krav eller varsel i et spor
TE ikke har sendt, godtas; sperren gjelder fortsatt for det som var avgjort. Appen avgjør ikke om
et senere krav er avskåret.» Endrer KA-U11, gjør KA-U12 overflødig for lukkingen og må tas inn i
GR-U3, EO-U2 og EO-U5 når EO bygges. Spørsmål til oppdragsgiver først: premiss 5 beskriver
Python-rollupen feil (se funnet øverst). Alternativet er å beholde KA-U11 og rette premisset.

**E2. Nytt vedtak om registrerte brev i første versjon (premiss 4).** Forslag:
«I første versjon er et brev sendt utenfor appen og registrert i den dokumentasjon. Det vises ved
sporet det gjelder, med datoen avsenderen oppgir og brevet som vedlegg, og merknaden «Appen
vurderer ikke innholdet». Appen utleder ingenting av det: ingen standpunkt, enighet, sperre eller
uavklart utfall. Partene tar det i betraktning når de svarer i appen. Hver side registrerer bare
sine egne brev. Registreringen godtas også når kravene er avgjort. Visningen viser registrerte
brev fra motparten ved «venter på svar» og fristveiledningen. Unntak: (a) TE kan oppgi datoen
for sitt eget varsel etter § 32.2, § 33.4, § 34.1.2 eller § 34.1.3 sendt utenfor appen. Datoen
settes én gang (SK-12), vises for byggherren som premiss i rettidighetsspørsmålet, og byggherren
tar stilling i svaret. (b) Byggherren kan registrere sin egen endringsordre som svar på
grunnlaget ved å velge «godkjent» og oppgi at brevet er en endringsordre etter § 31.3 (OV-U2).»
Endrer for første versjon KA-U16 og KA-U19 (registrert forbehold og sperre), KA-U20 (merking),
KA-U14 og GR-U13 (registratorens opplysning, unntatt b), GR-U12, GR-U14 og GR-U16
(registrerte brev), KA-U35, MM-U17 (bare b), MM-U19, VS-U8 (bestridelsen) og VS-U11 (registrerte
svar). Utsetter KA-U26–KA-U30, KA-U36–KA-U39, MM-U7 og MM-U14.

**E3. OV-U1.** Forslag: stryk «“ingen krav”» fra listen, og erstatt «registrering av brev sendt
utenfor appen» med «registrering av brev sendt utenfor appen etter [E2]».

**E4. MM-U1 og VS-U7.** Forslag: «TE kan registrere sitt eget varsel etter § 33.4 eller § 34.1
med datoen det ble sendt, også etter et krav. Det er første registrering (SK-12). Er varselet
registrert etter byggherrens svar, står svaret med virkningen det hadde. Visningen viser at
byggherrens standpunkt gjaldt kravet i brev <n> som varsel, og datoen TE senere har oppgitt, og
byggherren kan revidere svaret (GR-U4). Er ikke noe varsel registrert, viser skjemaet byggherren
at kravet i brev <n> av <dato> er det første varselet appen kjenner, og byggherren tar stilling
med det som premiss.» Utsetter MM-U8.

**E5. KA-U23.** Forslag: «TE kan kreve vederlag i en sak med hovedkategorien force majeure, og
byggherren svarer som på andre vederlagskrav. Appen viser § 33.3 femte ledd som veiledning og
trekker ingen konklusjon. Et vederlagsspor som ikke er sendt, behandles som i andre saker
(KA-U11).» Fjerner henvisningen til «ingen krav».

**E6. OV-U2.** Forslag til siste del: «En endringsordre som er svar på grunnlaget, registrerer
byggherren som sitt svar på grunnlaget i KOE-saken ved å velge «godkjent» og oppgi at brevet er en
endringsordre etter § 31.3 (GR-U13). Pris og tid i endringsordren vurderes ikke og gir ingen
sperre; vederlag og frist kreves og besvares i KOE-saken.» Erstatter henvisningen til KA-U16.

**E7. Premiss 5 (ikke et vedtak).** Parentesen «som i dagens Python-rollup» bør rettes til «som
`kan_utstede_eo` i Python i dag», eller premisset bør bytte retning; se E1.

Ikke nødvendig å endre, bare å la være å bygge: KA-U22 («ingen krav»-teksten), LV-U4 punkt 8–12,
KA-U8s presisering til «ingen krav» og VS-U13 (forenlig med premiss 6).

## Der jeg er uenig med premissene

- **Premiss 4 trenger to unntak av hensyn til NS 8407.** § 5 første ledd: et skriftlig varsel
  utenfor appen er gyldig, så rettidighetsspørsmålet etter § 32.2, § 33.4, § 34.1.2 og § 34.1.3
  må kunne stilles mot TEs faktiske varseldato (unntak a). § 32.3 første ledd a og § 31.3 annet
  ledd: byggherrens endringsordre binder TE, så den må kunne bli byggherrens svar i appen
  (unntak b). Ellers viser appen «venter på svar» og passivitetsveiledning etter § 32.3 annet
  ledd for et svar som er gitt, og tillater trekk som strider mot endringsordren.
- **Premiss 5** er god arbeidsflyt, men bygger på en uriktig beskrivelse av Python. NS 8407
  krever verken «ingen krav» eller lukking; taushet kan likevel prekludere etter kontrakten
  (§ 33.6.1, § 34.1.2), og det skal appen ikke uttrykke. Det er modellering, ikke kontraktskrav.
- **Premiss 6** er forenlig med VS-U13 slik det står: byggherren godkjenner eller avslår, og
  vilkårene får ingen egne standpunkter. At § 32.2 og frafall ikke gjelder force majeure
  (GR-U11), følger av kontrakten og er ikke egen logikk for vilkårene.
- **KA-U18** er kontraktskrav (§ 32.3 tredje ledd). KA-U21, KA-U24, KA-U32 og KA-U33 er produktvalg;
  KA-U33 har støtte i § 33.6.1 («angi og begrunne»).

## Kontroll av tellingen

Antallene over er telt med et skript over anbefalingskolonnen og artkolonnen i tabellene i
denne fila. Rader uten ID er identifisert med gruppen og de første ordene i vedtaksteksten.

## Verifikasjon og grenser

- Lest: hele vedtaksteksten, alternativene, svaret og Følge for hver post i gruppene, i
  `vedtak.toml` på commit 44bbb49.
- Slått opp i koden: skjemaene i `src/lib/components/kontraktsbord/` (begrunnelseskrav,
  trekk, varseltyper, innsigelse og forespørsel, forseringsveiledning, force majeure-veiledning,
  ingen godta-handling, ingen registrering), Python-rollupen i `backend/models/sak_state.py` og
  `backend/services/timeline_service.py`, og `kraveneErAvgjort` og MM-U1 i `kjerne/`.
- Ikke kontrollert: kjerneruten `/[prosjektId]/[sakId]/kjerne` og paragrafmatrisen; om
  `TeFristForm` avviser 0 dager (KA-U8 står som «delvis»); fullmaktsvedtakene, plattform og
  tilgang (utenfor oppdraget).
- «I skjemaet i dag» gjelder kontraktsbordet, ikke Python-API-et; aksept og flere statuser finnes
  i API-et uten skjema.
