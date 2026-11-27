# Handlingene og tilstandene

_Generert fra docs/datamodell/handlinger.toml av docs/verktoy/datamodell.py. Rett i registeret, ikke her._

Regelen er [OV-U97](../plans/vedtak.md#ov-u97), og statusen per handling [OV-U99](../plans/vedtak.md#ov-u99) og [OV-U101](../plans/vedtak.md#ov-u101). Portene og drøftingen står i [vurderingsfila](../vurdering-handlinger-og-tilstander-2026-11-15.md). En rad er en handling slik brukeren ser den, ikke en kommando.

Kolonnene for kjernen er handlingsnøklene (`noekkel` i [`forutsetninger.ts`](../../kjerne/kommandoer/forutsetninger.ts)) og kommandoene (`Kommando` i [`kommando.ts`](../../kjerne/kommandoer/kommando.ts)). Skjemaet er nøkkelen i `skjemaene` i [`Vardensak.svelte`](../../src/lib/components/varden/Vardensak.svelte).

## Grunnsettet

| ID | Handling | Part | Spor | Kilde | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Nøkler | Kommandoer | Skjema | Mangler |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | Påberopelse av forholdet, med ny sak og ny versjon | TE | forhold | punkt 32.1, punkt 32.2, GR-U40, OV-U97 | Ja. Varslingsfristen etter 32.2 og byggherrens svar etter 32.3 leser den. | Strukturert, egen. Ny versjon er en form av påberopelsen. | Nå. | Åpner «venter på svar». | `krav:forhold` | `krav` | `krav:forhold` | Ingen. |
| G2 | Varsel fra løsningen | TE | vederlag, frist | punkt 33.4, punkt 34.1.2, punkt 34.1.3, punkt 34.3.3, punkt 34.4, VS-U15, OV-U89, OV-U25, VS-U48, VS-U52, VS-U87 | Ja. Om kravet er varslet i tide, leses av varselet. | Strukturert, egen. Kan sendes før kravet. Flere varsler i ett spor i samme brev, hvert med arbeidet etter punkt 34.3.3 og 34.4 (VS-U87 punkt 27). | Nå. Virkningen avhenger av datoen. | Åpner «varslet». | `sende_varsel:frist`, `sende_varsel:vederlag`, `sende_varsel:34.1.3`, `sende_varsel:34.3.3`, `sende_varsel:34.4` | `send_varsel` | `sende_varsel:frist`, `sende_varsel:vederlag`, `sende_varsel:34.1.3`, `sende_varsel:34.3.3`, `sende_varsel:34.4` | Ingen. |
| G3 | Krav om vederlagsjustering eller fristforlengelse, med ny versjon | TE | vederlag, frist | GR-U40, KA-U52, OV-U115, OV-U99 | Ja. | Strukturert. Ny versjon, også trekk av en kravpost, er en form av kravet. | Nå. | Åpner «venter på svar». | `krav:vederlag`, `krav:frist` | `krav` | `krav:vederlag`, `krav:frist` | Ingen. |
| G4 | Svar i hvert spor, med frafall av pålegget og nytt svar | BH | forhold, vederlag, frist | punkt 32.3, KA-U1, HF-U29, OV-U99, OV-U101, VS-U79, VS-U87, OV-U89 | Ja. Enigheten leser svaret. | Strukturert. Nytt svar er en form av svaret, og brevet viser at et svar som står, erstattes. | Nå. | Åpner «byggherren har svart» og «pålegg frafalt», og lukker «venter på svar». | `svare:forhold`, `svare:vederlag`, `svare:frist`, `revidere:forhold`, `revidere:vederlag`, `revidere:frist`, `svare:*`, `revidere:*` | `brev`, `revisjon` | `svare:forhold`, `svare:vederlag`, `svare:frist`, `revidere:vederlag`, `revidere:frist`, `svare:*`, `revidere:*` | Skjemaet i Varden for nytt svar på kravet i forholdet. Nytt svar på kravet i vederlaget og fristen har skjema (`revidere:vederlag`, #2365, og `revidere:frist`, G-8 i BF-46). Svaret på et varsel etter punkt 34.3.3 eller 34.4 som står alene, og det nye svaret på det, har skjema (`svare:*`, `revidere:*`, VS-U79). Svaret på et varsel etter punkt 34.1.2 eller 34.1.3 som står alene (VS-U87 punkt 32) har skjema (#2409, #2447). Der saken gjelder en endring, tilbys ikke svaret på varselet etter punkt 34.1.2 (OV-U89 punkt 13, #2464), og Varden har fortsatt setningen og mangelen for det tilfellet (#2470). Svaret på et varsel etter punkt 33.4 som står alene, i svarskjemaet for fristen, er ikke bygget (#2456). Standpunktet om at begrunnelsen etter punkt 33.6.2 annet ledd b ikke er et svar (VS-U95) er bygget i kjernen, men ikke i skjemaet i Varden (#2462). |
| G5 | Innlegg i fritekst | TE og BH | saken | MM-U47, MM-U48, OV-U97, OV-U99 | Nei. Ingen regel leser det. | Innlegg. Tar det I1–I5 gjelder, og utdyping. | Nå. | Merket som innlegg etter siste brev. | `sende_innlegg` | `innlegg` | – | Skjemaet og visningen i Varden (G-15 i BF-03). |

## Utover grunnsettet, nå

| ID | Handling | Part | Spor | Kilde | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Nøkler | Kommandoer | Skjema | Mangler |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U1 | Aksept av svaret | TE | forhold, vederlag, frist | KA-U1, GR-U10, OV-U99 | Ja. «Enige» og sperren etter enighet leser den. | Strukturert, egen. Brevet sier hvilket svar som godtas. | Nå. Uten den er enighet ved sammenfall den eneste veien, og et innlegg leses ikke som aksept. | Åpner «enige» og lukker «byggherren har svart». | `godta:forhold`, `godta:vederlag`, `godta:frist` | `aksept` | `godta:forhold`, `godta:vederlag`, `godta:frist` | Ingen. Varden åpner aksepten i sporet, ikke fra `skjemaene`. |
| U2 | Trekk av påberopelsen eller hele kravet | TE | forhold, vederlag, frist | KA-U51, OV-U115, OV-U99 | Ja. Avkall som lukker sporet. | Strukturert, egen. Trekk av en kravpost er en form av G3. Brevet sier hva som trekkes, og at det er et avkall. | Nå. Ingen omvei. | Åpner «trukket», som er sluttilstand. | `trekke:forhold`, `trekke:vederlag`, `trekke:frist` | `trekk` | – | Skjemaet i Varden for trekket av hele kravet. |
| U3 | Forespørsel etter punkt 33.6.2, og svaret på den | TE og BH | frist | punkt 33.6.2, VS-U88, OV-U99 | Ja. Fristen leser den. | Strukturert, egen. Byggherren spør, og totalentreprenøren svarer. | Nå. Fristen løper fra forespørselen. | Åpner «spesifisert krav etterspurt», og svaret lukker den. | `sende_foresporsel:frist`, `svare_paa_foresporsel:*` | `foresporsel`, `foresporselssvar` | `svare_paa_foresporsel:*` | Skjemaet i Varden for forespørselen. Svaret på forespørselen åpner skjemaet for fristkravet, utenfor `skjemaene` (U-11 i BF-20). |
| U5 | Registrering som dokumentasjon | TE og BH | saken | OV-U79, OV-U98, OV-U99 | Ikke et utsagn med virkning. Korrespondansen hører til saken. | Strukturert, med retting av registreringen. | Nå. | Ingen. | `registrere_brev` | `registrert_brev`, `ikke_i_saken` | `registrere_brev` | Rettingen av registreringen (`retter`, `ikke_i_saken`) i Varden. Feltet for avsenderen i skjemaet, for korrespondanse motparten har sendt (#2334). |
| U6 | Registrering med virkning ved innleggingen | TE og BH | forhold, vederlag, frist | OV-U80, OV-U98, OV-U99, VS-U19, VS-U34, EO-U39, OV-U16, OV-U113 | Ja. Fristene regnes fra datoen brevet ble sendt. | Former av varsel, krav, svar, endringsordre som svar og aksept. En forespørsel etter punkt 33.6.2 sendt utenfor løsningen er dokumentasjon i første versjon (OV-U113, #1119). | Nå. Omveien, å sende på nytt fra løsningen, gir ny dato. | Som handlingen registreringen er en form av. | `varsle:vederlag`, `varsle:frist`, `varsle:32.2`, `varsle:34.1.3`, `varsle:34.3.3`, `varsle:34.4` | `varsel`, `krav`, `brev`, `revisjon`, `aksept` | `varsle:frist`, `varsle:vederlag`, `varsle:34.1.3`, `varsle:34.3.3`, `varsle:34.4` | Svaret på vederlag og frist og en ny versjon av påberopelsen lagt til, i Varden (#807). Krav, svar på forholdet og aksept legges til fra skjemaet for korrespondanse (`registrere_brev`). Varselet etter 32.2 godtas, men tilbys ikke (K3). Varslene etter punkt 34.3.3 og 34.4 står ikke blant handlingene i sporet. De sendes og legges til i skjemaet for vederlagskravet (`varsle:34.3.3`, `varsle:34.4`, U-1 i BF-37), og totalentreprenøren kan oppgi varselet for en kravpost i kravskjemaet (VS-U96 punkt 23). |
| U7 | Retting av datoene i et sendt brev | TE | forhold, vederlag, frist | MM-U59, OV-U98, OV-U99 | Delvis. Korrigeringen av datoen i påberopelsen (punkt 10) og kunnskapsdatoen etter punkt 34.1.3 (punkt 12) finnes. | Strukturert. Den manuelle korrigeringsprosessen tar andre rettinger. | Nå for datoene i beslutningsdelen i MM-U59. | En retting til en tidligere varseldato eller kravdato står som tilbud til byggherren har godtatt den i et svar (MM-U59 punkt 8, 18 og 20–23, designdelen). | `korrigere:*`, `oppgi_kunnskapsdato:*` | `korrigering`, `kunnskapsdato` | `korrigere:*`, `oppgi_kunnskapsdato:*` | Rettingen av varseldatoen (punkt 8) og kravdatoen (punkt 18), med aksepten i svaret: kjernen og skjemaene i Varden (BF-50, #1309). Korrigeringen av datoen i påberopelsen (punkt 10) og kunnskapsdatoen etter punkt 34.1.3 (punkt 12, VS-U82, #2424) er bygget, og Varden åpner skjemaene utenfor `skjemaene`. |
| U8 | Godkjenning med fullmakt | BH | saken | GFK-U2, GFK-U5, GFK-U14, OV-U80 | Ikke et utsagn til motparten. Byggherrens organisering av fullmakten. | Ingen. | Før første ekte sak etter gjeldende vedtak. | Ingen. | – | – | – | Ruten i serveren og skjemaet. Datalaget finnes (K5). |

## Venter

| ID | Handling | Part | Spor | Kilde | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Nøkler | Kommandoer | Skjema | Mangler |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| U4 | «Ingen krav» | TE | vederlag, frist | KA-U17, OV-U7, OV-U99 | Ja. Avkall. | Strukturert. | Senere. Tidspunktet betyr ingenting. | «Ingen krav» går ut. | `ingen_krav:vederlag`, `ingen_krav:frist` | `ingen_krav` | – | Ingen. Kjernen tilbyr den ikke, kommandoen avvises, og en journal med utsagnet er ikke forstått (#2016). |
| U9 | Interne notater | TE og BH | saken | OV-U99 | Ikke et utsagn til motparten. | Ingen. Notatet står i `koe.notat`, ikke i journalen. | Senere, og først ved et nytt vedtak. | Ingen. | – | – | – | Ingen. Tabellen finnes. |
| V1 | Det senere valget for korrespondanse som er lagt til som dokumentasjon | TE og BH | forhold, vederlag, frist | OV-U84, OV-U17, OV-U99 | Ja. Valget gir korrespondansen virkning. | En form av U6. | Senere. Til den er bygget, legger avsenderen korrespondansen til på nytt med valget. | Som U6. | – | – | – | Ingen nå. |
| V2 | Forsering | TE | frist | punkt 33.8, OV-U127, OV-U99, FO-U1 | Ja. | Egen sak. | Senere. | Ingen nå. | – | – | – | Ingen nå. |
| V3 | Endringsordre som egen sak | BH | saken | punkt 31.3, OV-U127, OV-U99 | Ja. | Egen sak. Endringsordren som svar i KOE-saken er en form av G4 og U6. | Senere. | Ingen nå. | – | – | – | Ingen nå. |
| V4 | Justering av enhetspriser etter punkt 34.3.3 | TE og BH | vederlag | punkt 34.3.3, OV-U127, OV-U99 | Ja. | Egen. | Senere. | Ingen nå. | – | – | – | Ingen nå. |

## Sendes som innlegg

| ID | Handling | Part | Spor | Kilde | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Nøkler | Kommandoer | Skjema | Mangler |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| I1 | Den egne innsigelsen etter punkt 5 | TE og BH | forhold, vederlag, frist | punkt 5, VS-U77, OV-U99, VS-U89 | Nei. Utsagn uten virkning på utfallet. | Standpunkt i svaret, innlegg eller «Forbehold» i et krav eller svar, varig (VS-U89). | Som G5. | Som G5. | – | – | – | Ingen. Kjernen har ingen kommando for den, og en lagret egen innsigelse gjør saken ikke forstått (VS-U94). |
| I2 | Protest mot en innsigelse | TE og BH | forhold, vederlag, frist | VS-U1, VS-U9, OV-U7, OV-U99 | Nei. | Innlegg. | Som G5. | Som G5. | – | – | – | Ingen. Kjernen har ingen kommando for den, og en lagret protest gjør saken ikke forstått (MM-U48, B-17). |
| I3 | Bestridelse | TE og BH | forhold, vederlag, frist | MM-U7, MM-U14, MM-U48, OV-U7, OV-U99 | Nei. | Innlegg. | Som G5. | Som G5. | – | – | – | Ingen. Kjernen har ingen kommando for den, og en lagret bestridelse gjør saken ikke forstått (MM-U48, B-17). |
| I4 | Påberopt passivitet | TE | forhold, vederlag, frist | VS-U90, OV-U99 | Nei. | Innlegg, varig (VS-U90). | Som G5. | Som G5. | – | – | – | Ingen. Kjernen har ingen kommando for den, og en lagret påberopelse gjør saken ikke forstått (VS-U94). |
| I5 | Byggherrens senere begrunnelse | BH | forhold, vederlag, frist | KA-U46, OV-U99 | Nei. | Innlegg. | Som G5. | Som G5. | – | – | – | Ingen. Kjernen har ingen kommando for den, og en lagret senere begrunnelse gjør saken ikke forstått (MM-U48, B-17). |

## Opphevet

| ID | Handling | Part | Spor | Kilde | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander | Nøkler | Kommandoer | Skjema | Mangler |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O1 | Merking av et registrert brev | TE og BH | forhold, vederlag, frist | KA-U45 | Nei. Sperrene er opphevet. | Ingen. Motpartens syn sendes som innlegg. | Aldri. | Ingen. | – | – | – | Ingen. Kommandoen er fjernet (#2019). |
| O2 | Avklaring av en merking | TE og BH | forhold, vederlag, frist | KA-U45 | Nei. Sperrene er opphevet. | Ingen. | Aldri. | Ingen. | – | – | – | Ingen. Kommandoen er fjernet (#2019). |
| O3 | Byggherrens bekreftelse av et svar gitt utenfor løsningen | BH | forhold, vederlag, frist | OV-U101, GR-U35, GR-U37, OV-U46 | Nei. Et svar lagt til med virkning dekker behovet. | Ingen. Svaret legges til etter U6. | Aldri. | Ingen. | – | – | – | Ingen. |

## Tilstandene (port 0)

Sporets betegnelse (`BETEGNELSER`) og sakens (`Saksbetegnelse`) i [`visning.ts`](../../kjerne/utledning/visning.ts). Status er `holder`, `endres`, `utgaar` eller `ny`.

| Betegnelse | Nivå | Hvem har sagt hva | Kilde | Status |
| --- | --- | --- | --- | --- |
| `trukket` | spor | TE har trukket. Sluttilstand. | KA-U51, OV-U97 | holder |
| `spesifisert_krav_etterspurt` | spor | BH har spurt etter punkt 33.6.2. TE står for tur. | VS-U88, OV-U97 | holder |
| `venter_paa_svar` | spor | TE har krevd. BH står for tur. | OV-U97 | holder |
| `paalegg_frafalt` | spor | BH har frafalt pålegget etter punkt 32.3 c. | punkt 32.3, OV-U97 | holder |
| `enige` | spor | TE har godtatt BHs svar, eller kravet og svaret sammenfaller. | KA-U1, GR-U10, OV-U97 | holder |
| `byggherren_har_svart` | spor | BH har et gjeldende svar i sporet, også i en lukket sak. Erstatter «svaret er ikke godtatt», som antydet et standpunkt TE ikke har tatt (#2017). | OV-U99, MM-U31 | holder |
| `krav_sendt` | spor | TE har godtatt et svar på påberopelsen som ikke avklarer forholdet, og kravet står uten enighet. Saken har alt sin betegnelse. | OV-U99 | utgaar |
| `ingen_krav` | spor | TE har sagt «ingen krav». Gikk ut med U4 (#2016). | OV-U7, OV-U99 | utgaar |
| `varslet` | spor | TE har varslet. TE står for tur med kravet. | OV-U97 | holder |
| `ingen_varsel_eller_krav` | spor | I et spor for vederlag eller frist har TE ikke sendt eller lagt til med virkning et varsel eller krav, eller oppgitt datoen for et varsel. Sier ikke hvem som står for tur. | OV-U125, OV-U97 | holder |
| `innlegg_etter_siste_brev` | spor | En part har sendt innlegg etter siste strukturerte handling. Merknad uten tolkning. | OV-U97, OV-U99 | ny |
| `ikke_forstaatt` | sak | Løsningen forstår ikke saken. | MM-U2, MM-U43 | holder |
| `avslaget_paa_forholdet_godtatt` | sak | TE har godtatt avslaget på forholdet. | MM-U22, OV-U97 | holder |
| `paaberopelsen_trukket` | sak | TE har trukket påberopelsen. | MM-U22, OV-U97 | holder |
| `kravene_avgjort` | sak | Predikatet i OV-U3. Teksten sier hva som har skjedd, ikke at kravene er avgjort (#2017). | OV-U3, OV-U99 | holder |

## Avvikene

Den lukkede listen: kjernen tilbyr handlingen mot statusen i raden. Avviket fjernes her i PR-en som retter kjernen.

| Nøkler | Handling | Funn | Issue |
| --- | --- | --- | --- |
