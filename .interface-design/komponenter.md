# Komponentene i Varden

_Generert av [`komponentkatalog.ts`](../src/lib/komponentkatalog.ts) fra hodekommentaren i hver
komponent. Rett hodekommentaren, ikke denne fila, og skriv fila på nytt med
`node src/lib/komponentkatalog.ts`._

En komponent i `src/lib/components/varden/` står her når to filer eller flere i `src/`
importerer den. Testene og komponentdemoen i `src/routes/demo/komponenter/` telles ikke.
Kolonnen til høyre er første setning i hodekommentaren. Beslutningene om hvordan et mønster
virker, står i [«Mønstre» i `system.md`](system.md#mønstre).

| Komponent | Importører | Hva den er |
| --- | ---: | --- |
| [`Arbeidsflate`](../src/lib/components/varden/Arbeidsflate.svelte) | 6 | Arbeidet i sporet (Varden, prinsipp 8): hovedkolonnen med det brukeren gjør nå, og høyre kolonne med det som støtter arbeidet. |
| [`Brev`](../src/lib/components/varden/Brev.svelte) | 5 | Brevet som lesespalte (Varden, skjerm C og D). |
| [`Brevkontroll`](../src/lib/components/varden/Brevkontroll.svelte) | 12 | Brevet før sending (Varden, skjerm C): den låste teksten kjernen lager for kommandoen som lesespalte, og sendepanelet med virkningen av brevet. |
| [`Brevlinje`](../src/lib/components/varden/Brevlinje.svelte) | 2 | Linja øverst i et skjema om brevet skjemaet følger opp, med lenken som åpner det. |
| [`Brevskjema`](../src/lib/components/varden/Brevskjema.svelte) | 3 | Skallet for et skjema som blir et brev (#2119): utkastkortet med linja for korrespondanse lagt til, oppsummeringen av det som mangler, spørsmålene, «Forkast utkast» nederst og høyre kolonne med panelet, sendeknappen og tidslinja, eller brevet ved siden av. |
| [`Brevtraad`](../src/lib/components/varden/Brevtraad.svelte) | 3 | Brevtråden, felles for sidene for forholdet, vederlaget og fristen (#1898, system.md «Brevene»): brevene nyest først, med parten i ringen, datoen, hva brevet er og brevnummeret, og en kortere rad for registrert korrespondanse (U-5 og U-8 i BF-44). |
| [`Datoer`](../src/lib/components/varden/Datoer.svelte) | 2 | Boksen med datoene ved spørsmålet om varselet i svarskjemaene: datoen totalentreprenøren oppgir, når kravet ble sendt og dagene mellom. |
| [`Datofelt`](../src/lib/components/varden/Datofelt.svelte) | 3 | Et datofelt i skjemaene, i rammen `Felt` (system.md, «Feltene står under hverandre», #2119). |
| [`Datolinjer`](../src/lib/components/varden/Datolinjer.svelte) | 2 | Datoene under et brev i tråden på siden for et krav: datoen TE oppgir og avstanden til varselet under brevet med varselet (U-8 i BF-44 og BF-45, uten vurdering av fristen, MM-U50), og akseptfristen over handlingene ved byggherrens svar (U-11, HF-U23 punkt 4). |
| [`Felt`](../src/lib/components/varden/Felt.svelte) | 3 | Rammen rundt et felt i skjemaene: labelen over, hjelpeteksten under labelen, feltet og feilmeldingen under (system.md, «Feltene står under hverandre», #2119). |
| [`Feltetikett`](../src/lib/components/varden/Feltetikett.svelte) | 2 | Labelen over et felt i skjemaene, med «Valgfri» til høyre på linja (system.md, «Feltene står under hverandre» og «Høyst tre nivåer av flater», #2059). |
| [`Filvalg`](../src/lib/components/varden/Filvalg.svelte) | 2 | Filvalget i Varden (F-7 i BF-05, #1037): nettleserens filvelger, som i skissen, med filene lastet opp etter hvert som de velges. |
| [`Forbeholdet`](../src/lib/components/varden/Forbeholdet.svelte) | 2 | Forbeholdet etter GR-U34 i kortet «Kravet og svaret», én gang: det svaret ble sendt med, og stillingen i forholdet nå (U-3 og D-3 i BF-44, D-11 i BF-45), med lenke til forholdet. |
| [`Forkastutkast`](../src/lib/components/varden/Forkastutkast.svelte) | 5 | «Forkast utkast» nederst i utkastet, med en dialog som spør først (oppdragsgiver 06.11 og 07.11, PR 1650). |
| [`Gjeldendefrist`](../src/lib/components/varden/Gjeldendefrist.svelte) | 2 | Gjeldende frist for én frist i fristtabellen (D-9, KA-U77): datoen i kontrakten med forlengelsene partene er enige om i andre saker, med lenker til sakene, eller hvorfor den ikke kan regnes (MM-U2, KA-U79). |
| [`Gjelderhvis`](../src/lib/components/varden/Gjelderhvis.svelte) | 3 | «Gjelder hvis» over et spørsmål i svaret: det i et foregående lag som rammer standpunktet, én forutsetning per linje i brevets rekkefølge (oppdragsgiver 30.10, #1391, #1400). |
| [`Hjemmel`](../src/lib/components/varden/Hjemmel.svelte) | 2 | Bestemmelsen i NS 8407 til høyre på linja med overskriften i et skjema, som dempet tekst og ikke som et merke (OV-U75, system.md, «Høyst tre nivåer av flater», #1925). |
| [`Hovedlinjer`](../src/lib/components/varden/Hovedlinjer.svelte) | 4 | Hovedlinjene i brevet (Varden, skjerm B): standpunktene og beløpene slik kjernen forhåndsviser brevet, i brevets rekkefølge og med laget. |
| [`Knapp`](../src/lib/components/varden/Knapp.svelte) | 23 | Knappen i Varden: pilleform, minst 44 px høy. |
| [`Korrespondansen`](../src/lib/components/varden/Korrespondansen.svelte) | 4 | Korrespondansen sendt utenfor løsningen: varselet i skjemaet for ny sak, fristkravet og vederlagskravet, og kravet, svaret eller aksepten som legges til (OV-U98). |
| [`Kravkort`](../src/lib/components/varden/Kravkort.svelte) | 3 | Kortet under tråden på siden for et krav: overskriften, brevene kortet leser av, og innholdet (U-2 i BF-44 og BF-45). |
| [`Lagttilmerknader`](../src/lib/components/varden/Lagttilmerknader.svelte) | 4 | Det kjernen sier om et krav, et svar eller en aksept lagt til, før det legges til: kravet eller svaret blir ikke gjeldende fordi det er sendt før det siste (OV-U102, OV-U103), og brevene det er sendt samme dag som (OV-U104). |
| [`Linjefelt`](../src/lib/components/varden/Linjefelt.svelte) | 5 | Et felt i skjemaene med labelen over, hjelpeteksten under labelen, feltet med enheten og feilmeldingen under (system.md, «Feltene står under hverandre», #1925). |
| [`Maalrad`](../src/lib/components/varden/Maalrad.svelte) | 2 | Én rad på målestokken i kortet «Kravet og svaret» (BF-44 og BF-45, U-2): navnet og verdien, og målet under, åpent for kravet og fylt for et lag i svaret. |
| [`Manglene`](../src/lib/components/varden/Manglene.svelte) | 2 | Oppsummeringen øverst i et krav- eller svarskjema av det som mangler før brevet kan lages, med en lenke til hvert felt (MM-U32). |
| [`Melding`](../src/lib/components/varden/Melding.svelte) | 9 | Meldingen om en feil fra serveren, en kvittering eller en melding om prøven: ikon og en kant i blekk på `--surface-inset`, ikke rosa eller grønt (`innlogging.html:306`, system.md, «En melding om prøven» og «Hver farge betyr én ting»). |
| [`NySak`](../src/lib/components/varden/NySak.svelte) | 2 | Skjemaet for ny sak (BF-05, #1481): TE velger forholdet, skriver tittelen og beskrivelsen, oppgir datoen og kontrollerer brevet før det sendes. |
| [`Postliste`](../src/lib/components/varden/Postliste.svelte) | 2 | Postene i et svar med én åpen post om gangen; de andre står som en leselinje med svaret slik det står i brevet (#1739, system.md). |
| [`Sendeknapp`](../src/lib/components/varden/Sendeknapp.svelte) | 4 | Primærknappen i et skjema, med sendehindringen under (system.md, «En knapp er aldri sperret», #2118). |
| [`Sitat`](../src/lib/components/varden/Sitat.svelte) | 2 | Et sitat fra et brev utenfor brevet, med etiketten for hva det er: utdraget i tråden og setningen om endringsordren i svarskjemaet for forholdet (#2035). |
| [`Spoersmaal`](../src/lib/components/varden/Spoersmaal.svelte) | 4 | Et spørsmål i et skjema: overskriften med bestemmelsen i NS 8407 som dempet tekst (OV-U75, «Høyst tre nivåer av flater» i `system.md`), feltene under (#1925, #2035). |
| [`Sporside`](../src/lib/components/varden/Sporside.svelte) | 2 | Kortet øverst på siden for et krav, med overskriften og hjemmelen dempet etter (U-1 i BF-44 og BF-45) og brevtråden under. |
| [`Svarskjema`](../src/lib/components/varden/Svarskjema.svelte) | 3 | Byggherrens svar på påberopelsen av forholdet og på et krav om vederlag eller frist, i skallet for brevskjemaene (`Brevskjema`, #1925, #2009, #2119): skjemaet vurderer, panelet viser hovedlinjene slik kjernen forhåndsviser svaret, og brevet viser alt (prinsipp 3). |
| [`Tekstomraade`](../src/lib/components/varden/Tekstomraade.svelte) | 7 | Et tekstfelt over flere linjer i skjemaene, i rammen `Felt` (system.md, «Feltene står under hverandre», #2119). |
| [`Tidslinje`](../src/lib/components/varden/Tidslinje.svelte) | 6 | Tidslinja i sporet (Varden, valget 27.10 i #1331): datoene partene har oppgitt (ring), brev som er sendt (fylt prikk) og brev som er registrert (firkant), med kilden for hver. |
| [`Utkastkort`](../src/lib/components/varden/Utkastkort.svelte) | 3 | Utkastkortet rundt et skjema som blir et brev (svaret på S-4 og S-4b i BF-10, oppdragsgiver 06.11): stiplet kant rundt hele kortet og et hode med «Utkast · ikke sendt», brevhodet når kjernen har laget det, og mottakeren («Utkastet sier det selv» i `system.md`). |
| [`Valg`](../src/lib/components/varden/Valg.svelte) | 8 | Valgkortene i Varden: ekte radioknapper i en `fieldset` med spørsmålet som `legend`, eller én avkrysning med samme form. |
| [`Valgfri`](../src/lib/components/varden/Valgfri.svelte) | 4 | Teksten i en label eller et spørsmål over et valgfritt felt, med «Valgfri» til høyre på linja (system.md, «Et valgfritt felt har «Valgfri» til høyre», oppdragsgiver 16.11). |
| [`Vardensak`](../src/lib/components/varden/Vardensak.svelte) | 3 | Varden: eksperimentell saksvisning (#1331, konseptet i docs/design/konsept-varden/). |
| [`Vardenskall`](../src/lib/components/varden/Vardenskall.svelte) | 2 | Skallet i Varden: panelet til venstre som et saksomslag, med innholdet kalleren gir øverst og avsenderen nederst (panel B i `vederlagsoversikt.html`, #1899), og arbeidsflaten med topplinja. |
| [`Varseldatoer`](../src/lib/components/varden/Varseldatoer.svelte) | 2 | Datoene ved spørsmålet om varselet i svarskjemaet: når TE ble klar over forholdet, når kravet ble sendt og avstanden mellom dem. |
