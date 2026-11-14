# Vurdering: konkret ordlyd i vedtakene

14.11.2026. Kontrollert commit: `66a5d60` på `main`. Del av #1534. Oppdragsgiver 14.11, ordrett:
«Foresten: noe viktig: flere vedtak angir ordlyd for frontend. Det mener jeg blir feil - det er
design eller beslutninger. Vedtak må angi budskapet - men ikke konkret ordlyd.» Prinsippet står
i [vedtaksskillen](../../.claude/skills/vedtak/SKILL.md), «Ordlyden i visningen og brevene»
(PR #1917).

Fila er et forslag til klassen per post. Ingen post er endret. Omklassifiseringen følger
bestillingen i #1534, og klassen kontrolleres uavhengig før den føres
(vedtaksskillen, «Hvem som retter klassen»).

## Utvalget

Et skript plukket ut de 78 gjeldende postene der vedtaksteksten har en sitert brevtekst (‹…›)
eller ordene «lyder», «heter», «knappen», «overskriften», «etiketten», «brevteksten»,
«lagslinjen», «ledeteksten» eller «teksten». Fire samlevedtak med siterte brevtekster i
punktene (EO-U39, MM-U52, VS-U47 og HF-U29) kom i tillegg. To subagenter vurderte hver sin
del etter testen i vedtaksskillen. Utvalget fanger ikke ordlyd uten disse tegnene. Fire
samlevedtak med ordlyd i punktene er ikke vurdert (se «Ikke vurdert»).

## Tellingen

| Forslag | LV | Andre | Sum |
| --- | --- | --- | --- |
| Vedtak med designdel | 9 | 10 | 19 |
| Vedtak med designdel og beslutningsdel | 1 | 1 | 2 |
| Design | 9 | 1 | 10 |
| Uendret (ingen ordlyd, eller alt design eller samlet) | 9 | 37 | 46 |
| Punkter i samlevedtak der brevteksten blir designdel | — | 3 | 3 |

Ingen post blir beslutning som helhet.

## LV-postene

Vurdert 14.11 etter testen i vedtaksskillen, «Hva et vedtak er» og «Ordlyden i visningen og brevene». Postene er ikke endret. «Klasse nå» er det `vedtaksregister.py --vis` viser. Hjemmet er forslag; BF-postene er funnet med `grep -l` på post-ID-en.

| Post | Klasse nå | Ordlyd (kort, hvor i teksten) | Budskapet som står som vedtak | Forslag | Hjem | Grensetilfelle |
| --- | --- | --- | --- | --- | --- | --- |
| LV-U41 | vedtak | Hele posten: de åtte brevsetningene i ‹›, og leseregelen ‹grunnlaget› → ‹forholdet› | Ved svikt og andre forhold er byggherrens svar på forholdet et standpunkt til om byggherren har risikoen for forholdet (punkt 34.1.2), ikke en godkjenning; brevene omtaler det totalentreprenøren påberoper, som forholdet og påberopelsen | vedtak med designdel | BF-05 (første brev), BF-10 (ny versjon), BF-08 (svaret); regelen «Godkjenner og godtar» i `docs/sprak.md` | ja (G1) |
| LV-U35 | vedtak med designdel | Hele posten: partene skrives fullt ut i brevene, ‹TE› leses ‹totalentreprenøren›. Designdelen tar bare BH og TE i visningen | Ingen bindende setning | design | `docs/sprak.md` (står der alt, se CLAUDE.md) | nei |
| LV-U39 | vedtak | Hele posten: ‹NS 8407 punkt 33.4›, ikke ‹§› eller ‹pkt.›; lov med ‹§› | Ingen bindende setning; at henvisningen viser til riktig bestemmelse, står i hver post med hjemmelen | design | `docs/sprak.md`, «Punkt og pkt.» (viser alt til posten) | ja (G2) |
| LV-U56 | vedtak med designdel | De fire setningene i ‹› for den låste delen. Designdelen tar alt tittelen og friteksten | Brevet med en ny versjon av påberopelsen sier hva påberopelsen gjelder og datoen (mottatt / klar over), med hver tidligere oppgitt dato og brevet den sto i; det sier ikke at noe erstattes, og gjentar ikke varselet etter punkt 32.2 | vedtak med designdel (setningene i ‹› legges til designdelen) | BF-10 (BF-10-brevtekst), BF-02A | ja (G3) |
| LV-U40 | vedtak | Hele posten: ‹ovenfor› om brevets egne punkter, ‹NS 8407› foran ett nummer | Ingen bindende setning; at et subsidiært standpunkt er betinget av punktet det viser til, står i LV-U34 | design | `docs/sprak.md`, «Punkt og pkt.» (viser alt til posten) | nei |
| LV-U53 | vedtak | Henvisningsformen ‹brev K201-KOE-017-03 av <dato>› og at den gjelder ordlyden i de eldre postene | Ingen ny bindende setning; at brevene merkes etter pkt. D.1.2.5, står i LV-U44, og korrespondanse med egen merking i LV-U45 | design, bindende i LV-U44 og LV-U45 | BF-07 (Deres ref.), `docs/sprak.md` | ja (G4) |
| LV-U54 | vedtak (samlet i MM-U52) | Begge setningene i ‹› for en ny grunnlagsversjon etter korrigering | Ingen ny bindende setning; at den nye versjonen nevner den korrigerte datoen og brevet, står i MM-U52 punkt 10 og LV-U56 | design, bindende i MM-U52 | BF-10 (BF-10-brevtekst), BF-02A | nei |
| LV-U57 | design (bindende i VS-U43) | ‹Pålegget ble mottatt <dato>.› og ‹Totalentreprenøren ble klar over forholdet <dato>.› i det første brevet | Står i VS-U43 | uendret (mangler `flyttet_til`) | BF-05 | nei |
| LV-U33 | vedtak | ‹Byggherren godkjenner etter dette ikke noe beløp …›; at tabellen viser 0 kr og punktet ikke gjentar beløpet | I laget der byggherren gjør gjeldende at varselet etter punkt 34.1.2 kom for sent, godkjenner byggherren 0 kr for postene påberopelsen rammer | vedtak med designdel | BF-14 (svar per post), BF-44 (stillingen) | nei |
| LV-U37 | vedtak | Hele posten: etikettene i lagslinjen, ‹eks. mva.› bare i innledningen | Ingen bindende setning; at beløpet er uten merverdiavgift, står i LV-U4 punkt 2 | design | BF-44, `docs/sprak.md` | nei |
| LV-U38 | vedtak | ‹Byggherren godkjenner etter dette ikke noe beløp for vederlagsjusteringen eller den særskilte vederlagsjusteringen.› | Uten tabell sier brevet følgen for hver post varselet etter punkt 34.1.2 rammer, og bare for postene kravet har | vedtak med designdel | BF-14, BF-44 | nei |
| LV-U42 | vedtak | Henvisningsformen ‹totalentreprenørens e-post av <dato>› | Ingen bindende setning; at registrert korrespondanse uten merking ikke får nummer, står i LV-U45 | design, bindende i LV-U45 | BF-07, BF-14 | ja (G4) |
| LV-U43 | design (bindende i LV-U41, flyttet til BF-05 U-8) | Brevsetningen når navnet er likt sakstittelen | Står i LV-U41 | uendret | BF-05 U-8 (alt flyttet) | nei |
| LV-U44 | vedtak med designdel | Henvisningsformen ‹brev <n> i sak KOE-17 av <dato>› (endret av LV-U53) og ‹i sak KOE-17› (Q1 i Følge). Designdelen tar bare kontraktsforkortelsen | Saken får kode KOE-nn eller EO-nn etter pkt. D.1.2.5, og hvert brev i saken merkes med sakens kode og brevets nummer i saken | vedtak med designdel (henvisningsformen legges til designdelen) | BF-06, BF-07 | ja (G5) |
| LV-U45 | vedtak med designdel og beslutningsdel | Henvisningsformen ‹brev <n> i sak KOE-17 av <dato>› | Korrespondanse som avsenderen har merket etter pkt. D.1.2.5, står med avsenderens nummer, og brevene viser til den med den merkingen | vedtak med designdel og beslutningsdel (henvisningsformen legges til designdelen) | BF-07, BF-14 | nei |
| LV-U52 | vedtak | ‹TEs standpunkt til BHs svar i brev … fremgår av begrunnelsen.› | Har byggherren svart på kravversjonen som erstattes, sier den nye kravversjonen hvilket svar (det siste, LV-U51) totalentreprenøren tar standpunkt til, og at standpunktet står i begrunnelsen | vedtak med designdel | BF-03, BF-07, BF-10 | ja (G6) |
| LV-U55 | design (bindende i LV-U27) | Tittelen ‹Korrigering av datoen i sak <kode>› | Står i LV-U27 | uendret (mangler `flyttet_til`) | BF-02A | nei |
| LV-U73 | beslutning (bindende i HF-U29) | Eksempelet ‹Dette er byggherrens nye svar …› og «uten ‹erstatter›»; posten sier selv at ordlyden avgjøres i byggingen | Står i HF-U29 (det nye svaret er byggherrens siste svar, uten totalentreprenørens aksept) | uendret | BF for revisjon av svaret; `docs/sprak.md` | nei |
| LV-U2 | vedtak med beslutningsdel | Nei | – | uendret | – | nei |
| LV-U3 | vedtak | Nei | – | uendret | – | nei |
| LV-U4 | vedtak | Hele posten: alle brevtekstene i punkt 1–13, «Prinsipalt:», «Subsidiært:», ‹§› | Grunnlagskravet gjengir kontraktens kategori og hjemmel; vederlagskravet er et tilbud etter punkt 34.2.1, med beløp uten merverdiavgift; frafallet lover endringsordre for allerede utført arbeid (punkt 32.3 c); aksepten av et subsidiært svar sier at totalentreprenøren er enig i beløpet eller dagene, men ikke i standpunktet til grunnlaget (GR-U7); trekket er avkall, også på det godkjente; hvert standpunkt og hver innsigelse, protest, passivitet, bestridelse, merking og avklaring nevner brevet og forholdet den gjelder | vedtak med designdel | BF-05, BF-08, BF-01, BF-14; formene i `docs/sprak.md` | ja (G7) |
| LV-U5 | vedtak | ‹Byggherren gjør ikke gjeldende at TEs varsel etter NS 8407 § 32.2 … kom for sent.› og setningen etter en innsigelse | Standpunktet «i tide» og oppgivelsen av en innsigelse nevner varselet de gjelder, slik at de ikke kan leses som at byggherren gir opp en påberopelse om et annet varsel | vedtak med designdel | BF-08 | ja (G8) |
| LV-U6 | vedtak | Hele posten: ‹NS 8407› i klammen | Ingen bindende setning | design | `docs/sprak.md` | nei |
| LV-U8 | vedtak | ‹Byggherren gjør ikke gjeldende at varselet kom for sent› og «Teksten står» | Standpunktet om at byggherren ikke gjør gjeldende at varselet kom for sent, er et uttrykkelig «i tide» etter HF-U4 | vedtak med designdel | BF-08 | ja (G9) |
| LV-U36 | vedtak | At setningen i GR-U14 beholder hjemmelen når den står i overskriften | Ingen ny bindende setning hvis overskriften er en del av brevteksten; setningen om endringsordren står i GR-U14 | design, bindende i GR-U14 | BF-06, BF-08 | ja (G10) |
| LV-U70 | beslutning | Nei (lagrede navn, ikke synlig tekst) | – | uendret | – | nei |
| LV-U71 | beslutning | Nei (lagret navn, ikke synlig tekst) | – | uendret | – | nei |
| LV-U72 | beslutning | Nei (strukturen og tidspunktet, ikke ordlyd) | – | uendret | – | nei |

### Grensetilfellene i LV-postene

**G1, LV-U41.** «Byggherren har risikoen for forholdet» mot «godkjenner forholdet» er valgt ordlyd, men det forkastede alternativet viser at valget gjaldt hva svaret er etter punkt 34.1.2: et standpunkt til risikoen. Det avgjør at budskapet står som vedtak og bare setningene blir designdel. Samme setning er også endret av KA-U46 (E2), så bare deler av posten virker.

**G2, LV-U39.** Formen «punkt» mot «§» er ordlyd, men det er en henvisningsform som skal identifisere bestemmelsen i NS 8407 riktig. Det avgjørende er om formen kan endre hvilken bestemmelse brevet viser til. Den gjør ikke det, så posten er design.

**G3, LV-U56.** «Sier ikke at noe erstattes» og «gjentar ikke varselet etter punkt 32.2» er formulert som ordlyd, men de styrer virkningen: en ny versjon er ikke et nytt varsel, og den sier ikke noe om byggherrens svar. Det avgjørende er at de to setningene sier hva brevet meddeler (LV-U3), så de står i budskapet.

**G4, LV-U53 og LV-U42.** Henvisningsformen er ordlyd, men den skal identifisere korrespondansen etter merkingen i pkt. D.1.2.5. Det avgjørende er om merkingen er et krav i kontraktsgrunnlaget som brevene må gjengi. Er den det, står den bindende setningen i LV-U44 og LV-U45, og LV-U53 og LV-U42 er design.

**G5, LV-U44.** Merkingen `K201-KOE-17-03` ser ut som et format, men den bygger på pkt. D.1.2.5 og avgjør hvilket nummer et brev har i saken. Det avgjørende er at posten tolker kontraktsgrunnlaget. Derfor står merkingen i budskapet, og bare henvisningsfrasen blir designdel.

**G6, LV-U52.** Setningen «standpunkt … fremgår av begrunnelsen» hindrer at den nye kravversjonen leses som aksept av svaret eller som taushet om det. Det avgjørende er om det er en virkning eller bare en henvisning. Jeg har lagt budskapet i vedtaket. LV-U56 har endret posten for forholdet ved å si at brevet ikke viser til tidligere brev. Da gjelder LV-U52 bare vederlaget og fristen, og det bør kontrolleres.

**G7, LV-U4.** Flere setninger er ordlyden i NS 8407 brukt bevisst, for eksempel «frafaller pålegget mot å utstede endringsordre» (punkt 32.3 c), «tilbud etter punkt 34.2.1» og «avkall». Her er det ordlyden som gjør utsagnet til den rettslige handlingen. Det avgjørende er at budskapet må nevne handlingen og hjemmelen, mens setningsbygningen kan være designdel. Lagslinjene «Prinsipalt:» og «Subsidiært:» er design (#1433).

**G8, LV-U5.** At setningen nevner varselet, er ordlyd. Men begrunnelsen i Følge er at en ordlyd uten varselet kan leses som at byggherren gir opp påberopelsen etter punkt 32.2. Det avgjørende er at entydigheten har rettslig virkning, så kravet om å nevne varselet står i budskapet.

**G9, LV-U8.** Posten tolker en bestemt setning som et uttrykkelig «i tide» etter HF-U4. Det avgjørende er at tolkningen må følge setningen hvis designet endrer den. Budskapet bør derfor være at standpunktet «gjør ikke gjeldende at varselet kom for sent» er uttrykkelig, uansett ordlyd.

**G10, LV-U36.** Om hjemmelen står i setningen eller bare i overskriften, er ordlyd. Det avgjørende er om overskriften er en del av den låste brevteksten som gjør svaret til en endringsordre etter punkt 31.3. Er den det, er posten design. Er den det ikke, må setningen selv bære hjemmelen, og da er det budskap.


Vurdert 14.11 mot `docs/vedtaksregister/vedtak.toml` i worktreen `.ordlyd`. Testen er punktene «Hva et vedtak er» og
«Ordlyden i visningen og brevene» i vedtaksskillen. Postene er ikke endret. «Samlet» betyr at posten er samlet i et
samlevedtak, og at samlevedtaket er kontrollert for om det tar ordlyden. Lest fra registeret (`--vis`, feltene
`designdel`, `beslutningsdel` og `flyttet_til`), ikke kjørt.

## De andre postene

| Post | Klasse nå | Ordlyd (kort, hvor i teksten) | Budskapet som står som vedtak | Forslag | Hjem | Grensetilfelle |
| --- | --- | --- | --- | --- | --- | --- |
| OV-U82 | vedtak med beslutningsdel | Nei. Lesingen av ordene i vedtakene, ingen tekst i visningen eller brevene | – | uendret | – | |
| OV-U74 | vedtak med designdel (ordet i skjemaet) | Ja, hele posten: ‹vederlagsjustering› og ‹særskilt vederlagsjustering› i brevet og skjemaet, og de nye ordene i OV-U28 | Ingen egen bindende setning. At kravet etter § 34.1.3 annet ledd er et eget krav, må stå i et annet vedtak (OV-U28 og OV-U89) | design | `docs/sprak.md` (ordene i brevene og skjemaene) | ja |
| MM-U34 | vedtak med designdel og beslutningsdel | Ja. Pkt. 1 brevtekstene og påminnelsen (tatt av KA-U52 pkt. 4). Pkt. 12 ‹Registrert enighet om alle fremsatte krav›. Pkt. 16 brevteksten ‹Aksepten gjelder ikke byggherrens standpunkt til grunnlaget.› og D-1. Pkt. 19 ‹Avsluttet med EO› (erstattet av merket i EO-U39, designdel). Pkt. 24 (tatt av MM-U47 pkt. 2). Pkt. 26 stryker tekst og fastsetter ingen | Pkt. 12: registrert enighet vises som opplysning og fremstilles ikke som rettslig avgjørelse. Pkt. 16: aksepten gjelder hele svaret, og den gjelder ikke byggherrens standpunkt til grunnlaget | vedtak med designdel (designdelen utvides med teksten i pkt. 12 og brevteksten i pkt. 16. Påminnelsen i pkt. 16 og D-1 står alt i designdelen) | BF-03 (D-1), BF-01 | ja (pkt. 16) |
| OV-U75 | design, flyttet til system.md | Ja, tatt (flyttet) | – | uendret | `.interface-design/system.md#ov-u75` | |
| GR-U29 | vedtak | Samlet i GR-U34, som tar ordlyden i pkt. 3 (se merknaden) | – | uendret | – | |
| MM-U37 | design | Samlet i MM-U45. Designdelen der tar etikettene | – | uendret | BF-01, BF-06 | |
| EO-U22 | vedtak | Ja: den faste teksten ‹Endringsordren gjelder også ‹sak› … Den innebærer ikke at byggherren mener forholdet er en endring.›. EO-U39 pkt. 19 viser til «den faste teksten i EO-U22» og tar den ikke | Omfatter endringsordren en sak om svikt eller et annet forhold som ikke er en endring, sier den uttrykkelig hvilke spor den gjelder for i saken, og at den ikke innebærer at byggherren mener forholdet er en endring | vedtak med designdel | BF-06 | ja |
| OV-U76 | design, flyttet til BF-05 U-9 | Ja, tatt | – | uendret | BF-05 U-9 | |
| OV-U77 | design, flyttet til BF-05 U-10 | Ja, tatt (gruppene med kontraktens henvisning) | – | uendret | BF-05 U-10 | |
| GR-U32 | vedtak | Ja: standpunkttekstene ‹Byggherren er enig i at pålegget innebærer en endring.›, ‹… er en endringsordre (NS 8407 punkt 31.3).›, ‹… er force majeure (NS 8407 punkt 33.3).› | Svaret uttrykker byggherrens godkjenning med kontraktens vurdering i hvert tilfelle: der punkt 32.2 gjaldt og preklusjon påberopes, at pålegget innebærer en endring; ved forholdet endringsordre, at forholdet er en endringsordre etter punkt 31.3; ved force majeure, at forholdet er force majeure etter punkt 33.3 | vedtak med designdel | BF-06, BF-08. Ordet «er enig i» i `docs/sprak.md` («Godkjenner og godtar») | ja |
| GR-U35 | vedtak | Ja: innledningen ‹Byggherren bekrefter sitt svar …› og punktet ved påberopt preklusjon | Bekreftelsen er byggherrens bekreftelse av eget svar gitt utenfor løsningen, med dokumentet og datoen. Utsteder byggherren endringsordren nå, er brevet et svar og ikke en bekreftelse | vedtak med designdel | BF-08 | ja |
| KT-U10 | vedtak med designdel (navnene på handlingene) | Ja, tatt av designdelen | Bare totalentreprenøren oppretter en KOE-sak, og bare byggherren en EO-sak | uendret | BF-05 | |
| OV-U45 | vedtak med designdel | Samlet i GR-U34, som tar spørsmålet og brevtekstene i pkt. 3 og 6 | – | uendret | – | |
| OV-U69 | vedtak med designdel | Samlet i KA-U49. Brevteksten om fast sum står i KA-U49 pkt. 8 | – | uendret | – | |
| OV-U78 | design, flyttet til BF-05 U-11 | Ja, tatt | – | uendret | BF-05 U-11 | |
| GR-U36 | vedtak med designdel (bare skjemalinjen) | Ja: ‹Byggherren viste i brev <merking> av <dato> til …›, og at ‹Svaret erstatter …› ikke står | Brevet gjengir hver henvisning byggherren har sendt for versjonen, og stiller ikke det nye svaret over det tidligere | vedtak med designdel (utvidet til brevteksten) | BF-08 | ja |
| EO-U15 | design | Ja: knappene ‹Send svaret og endringsordren nå› og ‹Send svaret nå, endringsordren senere›. Samlet i EO-U39, som ikke tar knappene | Allerede design. Siste setning (svaret er en endringsordre etter punkt 32.3 første ledd a, jf. punkt 31.3) står i GR-U12 og GR-U13 | uendret (mangler `flyttet_til`) | BF-06 | |
| OV-U46 | vedtak med designdel | Brevtekstene er endret av GR-U35, som tar dem, og posten er samlet i KA-U49 | – | uendret (vurdert under GR-U35) | – | |
| GR-U30 | design, flyttet til system.md | Ja, tatt | – | uendret | `.interface-design/system.md#gr-u30` | |
| GR-U33 | vedtak | Samlet i GR-U34, som tar ordlyden i pkt. 3 | – | uendret | – | |
| VS-U39 | vedtak med designdel (hjelpeteksten) | Ja, tatt av designdelen: opplysningen fra kapittel B | Løsningen avgjør ikke om varselet oppfyller kravene i kontrakten. Spørsmålet stilles bare der punkt 32.2 gjelder | uendret | BF-05 | ja |
| EO-U13 | vedtak med designdel (merket) | Ja, tatt av designdelen. Også samlet i EO-U39, som har merket i designdelen | – | uendret | BF-06, BF-01 | |
| MM-U35 | vedtak med designdel og beslutningsdel | Samlet i MM-U47, som tar ‹<Part> viser til brev …› i pkt. 2 | – | uendret | – | |
| OV-U54 | vedtak med designdel og beslutningsdel | Samlet i KA-U52, som tar brevteksten i pkt. 4. Egen brevtekst endret av MM-U34 pkt. 1 | – | uendret | – | |
| OV-U57 | vedtak med designdel (teksten i skjemaet) | Ja, tatt av designdelen | Den nye saken endrer ikke krav, svar eller enigheter i den tidligere saken | uendret | BF-05, BF-10 | |
| OV-U62 | design, flyttet til BF-01 U-13 | Ja, tatt | – | uendret | BF-01 U-13 | |
| OV-U84 | vedtak med designdel | Nei. ‹Skjemaet er ikke fylt ut› brukes om et merke som finnes, og fastsettes ikke | – | uendret | – | |
| OV-U86 | design | Ja, hele posten: merknaden ‹Saken har dokumentasjon som er registrert, men ikke sendt herfra.› | Allerede design | uendret (mangler `flyttet_til`) | BF-01 eller `.interface-design/system.md` | |
| OV-U87 | design, flyttet til system.md | Ja, tatt | – | uendret | `.interface-design/system.md#ov-u87` | |
| KA-U25 | vedtak | Ja: brevteksten «Avkallet omfatter ikke vederlag for forsering etter NS 8407 § 33.8.» | Brevet for «ingen krav» i vederlagssporet sier uttrykkelig at avkallet ikke omfatter vederlag for forsering | vedtak med designdel | Brukerforløpet for «ingen krav» når det skrives (utsatt, OV-U7). Til da står teksten i designdelen | ja |
| KA-U18 | vedtak | Nei | – | uendret | – | |
| KA-U16 | vedtak | Nei. Nevner «den faste teksten», men fastsetter den ikke | – | uendret | – | |
| KA-U19 | vedtak med designdel | Nei. Sier hva skjemaet sier, ikke ordlyden. Samlet i KA-U49 | – | uendret | – | |
| KA-U43 | vedtak med designdel (feltet) | Nei | – | uendret | – | |
| GR-U26 | vedtak med designdel | Samlet i GR-U34, som tar brevteksten i pkt. 3 | – | uendret | – | |
| GR-U31 | vedtak med designdel (handlingen ‹Svar›) | Ja: brevnavnet ‹Påberopelse av <forholdet>›, handlingen ‹Svar› og ‹påberopelsen av <forholdet>› i brevteksten | Totalentreprenørens første brev påberoper forholdet. Der punkt 32.2 gjelder, sier brevet i tillegg at totalentreprenøren varsler etter punkt 32.2 | vedtak med designdel (utvidet til brevnavnet og brevteksten) | BF-05 | ja |
| VS-U15 | vedtak med beslutningsdel | Ja: brevteksten «TE varsler etter NS 8407 § 33.4 at TE vil kreve fristforlengelse som følge av forholdet i sak …» | Varselet etter § 33.4 er et eget utsagn uten dager. Det sier at totalentreprenøren vil kreve fristforlengelse etter § 33.4 som følge av det faktiske forholdet i saken | vedtak med designdel og beslutningsdel | BF-20 | ja |
| VS-U22 | beslutning | Nei. Sitatet er en regeltekst, ikke tekst i visningen. Samlet i VS-U47 pkt. 11 | – | uendret | – | |
| HF-U13 | vedtak med designdel | Nei | – | uendret | – | |
| VS-U35 | beslutning | Nei. Viser bare til brevtekstene i LV-U4 | – | uendret | – | |
| MM-U33 | vedtak med designdel (skjemateksten) | Ja, i steg 6: etiketten «Avsluttet med EO». EO-U13 og EO-U39 (designdel) har erstattet den med merket ‹Inngår i EO-<nummer>› | Saken er lukket i arbeidsflyten, også når uenigheten består. Det betyr ikke at noe er rettslig avgjort eller at TE har godtatt endringsordren. Ingen regel leser etiketten | vedtak med designdel (setningene om etiketten blir designdel) | BF-06 | |
| MM-U53 | vedtak med designdel | Nei | – | uendret | – | |
| KT-U9 | vedtak med beslutningsdel (navnene på sakstypene) | Navnene på sakstypene er tatt av beslutningsdelen | Navnet på sakstypen endrer ikke brevteksten | uendret | – | |
| OV-U5 | vedtak med designdel («TE oppgir at varselet ble sendt») | Ja: «TE oppgir at varselet ble sendt <dato>» (tatt) og «TE oppgir at kravet ble sendt <dato>» (ikke nevnt i designdelen) | Datoen er totalentreprenørens opplysning. Løsningen kontrollerer den ikke, og byggherren tar stilling med opplysningen som premiss | vedtak med designdel (utvidet til «TE oppgir at kravet ble sendt») | BF-05, BF-14 | |
| OV-U7 | beslutning | Nei | – | uendret | – | |
| HF-U2 | beslutning med designdel | Nei. Begrepene i hendelsene, ikke tekst i visningen | – | uendret | – | ja |
| OV-U72 | vedtak med designdel (feltet «Forbehold») | Ja: punktet «Forbehold» sist i brevet. Samlet i KA-U49 og KA-U50, som tar det | – | uendret | – | |
| OV-U73 | vedtak | Ikke ordlyd, men oppsettet i brevet: tabellen, radene, sumraden og plasseringen før «Forbehold» | Tabellen er en del av brevteksten og fryses med den. Beløpene er de samme som i punktene, og en post uten fast beløp regnes ikke med | vedtak med designdel (oppsettet og plasseringen) | BF-01, BF-14 | |
| B-13 begrunnelsestekst | vedtak med designdel og beslutningsdel | Nei. «Merkingen i skjemaet skal si at teksten er byggherrens» er budskap og fastsetter ingen ordlyd | – | uendret | – | |

## Punktene i samlevedtakene

Punktene er lest i samlevedtakets tekst i `vedtak.toml` (avsnittet med ankeret `samlevedtak-*`). Der vurderingsfila
avviker, er det sagt.

| Post | Klasse nå | Ordlyd (kort, hvor i teksten) | Budskapet som står som vedtak | Forslag | Hjem | Grensetilfelle |
| --- | --- | --- | --- | --- | --- | --- |
| EO-U39 pkt. 36 | vedtak med designdel og beslutningsdel | Nei. ‹endringsordre› er forholdet, ikke en tekst | – | uendret | – | |
| EO-U39 pkt. 50 | vedtak med designdel og beslutningsdel | Ja: ‹Svaret er byggherrens nye svar på påberopelsen av forholdet. Byggherrens tidligere svar på påberopelsen er endringsordren i <brevet …>.› | Brevet sier at svaret er byggherrens nye svar, og at det tidligere svaret er endringsordren i brevet. Det sier ikke at endringsordren er erstattet eller har falt bort, og løsningen avgjør ikke om det nye svaret er virksomt mot den | vedtak, med brevteksten i designdelen | BF-08, BF-06 | ja |
| EO-U39 Designdel | samme | ‹Inngår i EO-<nummer>›, tatt av designdelen | – | uendret | BF-06 | |
| EO-U39 Endret innhold | samme | Nei. Sitatene er forhold og gammel tekst | – | uendret | – | |
| MM-U52 pkt. 10 | vedtak med designdel og beslutningsdel | Ja: korrigeringen ‹Totalentreprenøren oppgir nå at … I brev <merking> av <dato> oppga totalentreprenøren <dato>.›, og i en ny grunnlagsversjon ‹Totalentreprenøren opplyser at … slik totalentreprenøren oppga i brev …› | Korrigeringsbrevet gir den nye datoen og den tidligere, med henvisning til brevet. En ny grunnlagsversjon gjengir den siste opplysningen med henvisning til brevet med korrigeringen | vedtak, med brevtekstene i designdelen | BF-02A, BF-02C, BF-05 (designdelen viser alt dit) | |
| MM-U52 Designdel | samme | ‹Svaret erstatter byggherrens svar i brev <merking> av <dato>.›, tatt av designdelen | – | uendret | – | |
| MM-U52 Endret innhold (E5) | samme | Nei. Gammel og ny tekst som forhold | – | uendret | – | |
| VS-U47 | vedtak med beslutningsdel | Nei. Gjeldende punkter har ingen sitert tekst. ‹Skjemaet er ikke fylt ut› i pkt. 11 i vurderingsfila hører til svar 3 B, men 3 A ble valgt | – | uendret | – | |
| HF-U29 pkt. 2 | vedtak med designdel og beslutningsdel | Ja: ‹Svaret erstatter byggherrens svar i brev <n> av <dato>.› (LV-U34). Designdelen tar pkt. 8 og 9, ikke pkt. 2 | Det nye svaret erstatter det tidligere som byggherrens siste svar i løsningen, uten totalentreprenørens aksept. Er det tidligere svaret en endringsordre registrert som svar, gjelder EO-U39 pkt. 50 | vedtak, med brevteksten i designdelen | BF-08 | ja |

## Ikke vurdert

Når de samlede postene over har overlatt ordlyden til et samlevedtak, står ordlyden nå i et punkt der. Punktene under
trenger samme behandling, men er ikke vurdert her:

- GR-U34 pkt. 3 og 6. Forbeholdet og henvisningen, fra GR-U26, GR-U29, GR-U33 og OV-U45.
- KA-U49 pkt. 8. Brevteksten om fast sum, fra OV-U69 og LV-U32.
- MM-U47 pkt. 2. ‹<Part> viser til brev …›, fra MM-U35 og MM-U34 pkt. 24.
- KA-U52 pkt. 4. Brevtekstene for en ny kravversjon, fra MM-U34 pkt. 1 og OV-U54.

## Grensetilfellene i de andre postene

- **OV-U74.** Posten er bare ord, men ordet «særskilt» skiller et eget krav etter § 34.1.3 annet ledd. Det som avgjør, er om
  et annet gjeldende vedtak sier at det er et eget krav (OV-U28 og OV-U89). Gjør det det, blir OV-U74 design.
- **MM-U34 pkt. 16.** Brevsetningen avgrenser hva totalentreprenøren godtar, og et sendt brev betyr det det sa (MM-U50).
  Det som avgjør, er om budskapet «aksepten gjelder ikke standpunktet til grunnlaget» står som vedtak. Da kan ordlyden
  flyttes.
- **EO-U22.** Den faste teksten avgrenser byggherrens erkjennelse. Det som avgjør, er om de to elementene står som
  budskap: hvilke spor endringsordren gjelder for, og at den ikke innebærer at byggherren mener forholdet er en endring.
- **GR-U32.** Det som avgjør, er om ordene beskriver standpunktet eller er standpunktet. «Er enig i at pålegget innebærer
  en endring» gjengir vurderingen i punkt 32.3 a. Er innholdet bundet til bestemmelsen i vedtaket, er ordet design
  (forkastet var «godkjenner forholdet»).
- **GR-U35.** Ordet «bekrefter» avgjør om brevet leses som en bekreftelse eller som en endringsordre utstedt nå. Det som
  avgjør, er om budskapet «utsteder byggherren endringsordren nå, er brevet ikke en bekreftelse» står som vedtak. Da er
  ordet design.
- **GR-U36.** Begrunnelsen for at ‹Svaret erstatter …› ikke står, er rettslig: løsningen har ikke noe svar å erstatte, og
  det nye svaret stilles ikke over det tidligere. Det budskapet blir stående. Selve setningen er ordlyd.
- **VS-U39.** Opplysningen gjengir kapittel B («En e-post alene eller et møtereferat er ikke nok»), og det er en tolkning av
  kontraktsgrunnlaget. Det som avgjør, er om tolkningen står i et vedtak (OV-U79). Gjør den det, er teksten ved spørsmålet
  bare design.
- **KA-U25.** Hvor langt avkallet rekker, følger av hva brevet sa (MM-U9 og MM-U50). Budskapet «brevet sier uttrykkelig
  at avkallet ikke omfatter forseringsvederlaget» må stå som vedtak. Ordene er design.
- **GR-U31.** Det forkastede alternativet viser at navnet på brevet kan leses som varsel («Varsel om …»). Det som
  avgjør, er om navnet på brevet virker inn på om brevet er et varsel etter punkt 33.4 eller 34.1.2. Budskapet
  «påberopelsen er ikke et varsel etter de bestemmelsene, men et varsel etter punkt 32.2 der den gjelder» står. Navnet
  er design.
- **VS-U15.** Brevet er selve varselet etter § 33.4. Det som avgjør, er at elementene varselet må ha, er budskap:
  bestemmelsen, at totalentreprenøren vil kreve fristforlengelse, og forholdet. Formuleringen er design.
- **HF-U2.** Oppdragsgiver brukte «Prinsipalt» som eksempel på ordlyd (13.11). HF-U2 sier hva begrepet betyr i
  hendelsene, ikke at brevet har lagslinjen. Posten fastsetter derfor ikke ordlyd.
- **EO-U39 pkt. 50.** Det forkastede alternativet B ble avvist nettopp fordi «erstatter» i brevet sier noe om virkningen.
  Det som avgjør, er at budskapet («sier ikke at endringsordren er erstattet eller har falt bort») står i punktet. Da kan
  setningen flyttes.
- **HF-U29 pkt. 2.** Det motsatte tilfellet: «erstatter» sier at det nye svaret går foran det tidligere, mens løsningen
  ikke avgjør om endringen er virksom (MM-U50 pkt. 8). Budskapet «brevet sier at det nye svaret erstatter det tidligere
  som byggherrens siste svar» bør stå som vedtak. Ordene er design.

## Spørsmålet til oppdragsgiver

Grensetilfellene over har én ting felles: ordlyden i brevet er det som gjør brevet til en
bestemt rettslig handling, eller avgrenser den. Eksempler er at byggherren ‹bekrefter› et svar
byggherren alt har gitt utenfor løsningen, og ikke utsteder en endringsordre nå (GR-U35), er ‹enig i at pålegget innebærer en endring›
(GR-U32), eller hvor langt et avkall rekker (KA-U25, LV-U4). Spørsmålet er stilt slik:

> **1. Ordlyd som bærer en rettslig handling.** Når ordlyden i et brev er det som gjør brevet
> til en bestemt rettslig handling eller avgrenser den:
>
> - **A.** Vedtaket sier hva brevet skal meddele: handlingen, virkningen og avgrensningen, for
>   eksempel at byggherren bekrefter et svar byggherren alt har gitt, og ikke utsteder en
>   endringsordre nå. Den konkrete ordlyden er design eller beslutning, som i LV-U73. En ny
>   ordlyd må meddele det samme, og en ordlyd som ville endre handlingen, virkningen eller
>   avgrensningen, krever nytt vedtak. En ny ordlyd for en slik setning tas i bruk først når
>   en uavhengig kontroll har prøvd den mot budskapet i vedtaket. Kontrollen føres i issuet,
>   og er det tvil om budskapet er det samme, stilles det som spørsmål. En ny ordlyd gjelder
>   bare nye brev. Et sendt brev står slik det ble sendt (MM-U50). Forhold: presiserer
>   prinsippet 14.11 i vedtaksskillen. Ingen post endres av svaret.
> - **B.** Ordlyden står i vedtaket når den selv bærer den rettslige handlingen, og endres bare
>   med nytt vedtak. Et sendt brev står slik det ble sendt (MM-U50). Forhold: snevrer inn
>   prinsippet 14.11 for disse tilfellene.
>
> **Anbefaling: A.** Den følger prinsippet 14.11 og testen i vedtaksskillen, der en endring
> som ville endre noe et vedtak sier, krever nytt vedtak. Med A beholder budskapet sin
> rettslige presisjon uten at ordene låses, og kontrollen hindrer at et brev sier mindre eller
> noe annet enn virkningen løsningen regner (MM-U50, KA-U16). B gir to slags ordlyd i registeret og krever en
> avgjørelse per post om ordene «bærer» handlingen.
>
> **Valget styrer** forslaget for de 22 grensetilfellene: med A blir budskapet stående som
> vedtak og ordlyden designdel; med B blir ordlyden stående i vedtaksteksten.

Svaret føres her og i vedtaksskillen, ikke som en post i registeret, fordi det gjelder hvordan
testen for klassen leses.

## Svaret

Oppdragsgiver 14.11, ordrett: «Ja», altså A, det anbefalte alternativet
([kommentaren i #1534](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6874501642),
spørsmål 1). Svaret er ført i vedtaksskillen under «Ordlyden i visningen og brevene». Ingen
post er endret.

## Verifikasjon og grenser

- Kjørt: utvalget med et skript over registeret på `main`, og `vedtaksregister.py --vis` for hver
  post. Tabellene er subagentenes vurdering, lest ut av postene og ikke kontrollert uavhengig.
  Klassen kontrolleres uavhengig før den føres. Spørsmålet er prøvd én gang mot vedtakene av en
  egen subagent. Den fant tre feil, og alle er rettet: gjengivelsen av GR-U35, kontrollen av en
  ny ordlyd i A og setningen om et sendt brev i A og B.
- Ikke vurdert: de fire samlevedtakene under «Ikke vurdert», og ordlyd uten tegnene utvalget
  leter etter.
- LV-U55, LV-U57, EO-U15 og OV-U86 er alt design, men mangler `flyttet_til`. Det rettes i
  omklassifiseringen.
