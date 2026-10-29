# Review av Varden mot skissene, 27.10.2026

Kontrollert: den bygde visningen i PR #1334, commit `a206ccd` på
`claude/varden-forloep-1331`. Referansen er skissene i [`skjermer/`](skjermer/) og
teksten i [README](README.md) ved commit `f46a03a` på `main`. Metoden er «Sammenligne en
bygget visning» i skillen `brukerforlop` (PR #1339). Bestillingen står i #1338.

Varden er kjørt i demoruta (`/demo/BF-01?visning=varden`) med
`demoruta.mjs --visning varden`, og fire tilstander til er tatt med et eget skript. Alle
bildene er 1440 px brede, som skissene. Bildene side om side står på grenen `skjermbilder`, lenket
under [«Bildene side om side»](#bildene-side-om-side).

**Situasjonen er ikke den samme.** Skissene viser sak E-021 med et hovedkrav og en post
for produktivitetstap (§ 34.1.3), der varselet om produktivitetstapet kom for sent.
Demoruta har brukerforløpet BF-01 med ett hovedkrav på 100 000 kr, der BH sier at varselet
etter § 34.1.2 kom for sent og godtar 60 000 kr subsidiært. Demoruta har ingen
prosjekter, partsnavn eller server. En forskjell som bare skyldes dette, er klassifisert
som «Ikke et designavvik» og står i en egen rad, så den kan kontrolleres med tilsvarende
data.

**Belegg:** **K** kjørt og observert i Chromium 27.10, **L** lest i koden på `a206ccd`.

## Avvikene

| ID | Skjerm | Avviket | Klassifisering | Belegg |
| --- | --- | --- | --- | --- |
| VK-01 | B, C, D | Toppfeltet har ikke logoen og kunden («Oslo kommune», «Oslobygg KF»). De andre delene av toppanelet står i VK-89–VK-95, merket og demolinja i VK-19 og VK-20 | Ikke gjennomført ennå | K |
| VK-02 | A, F, G, I; B, D og E | Venstre kolonne har bare sporene. Oversikt, Dokumenter, Hendelser og Notater for teamet finnes ikke, så A, F, G og I har ingen tilsvarende tilstand | Ikke gjennomført ennå | K, L (`Vardensak.svelte`) |
| VK-03 | B, D | Saksoverskriften har ikke saksnummeret «E-021» som merke foran tittelen. Prosjektet, kontrakten, partsnavnene og tittelen står i VK-85–VK-88, og brevhodet, datoene og rollen i VK-21–VK-23 og VK-47–VK-49 | Ikke et designavvik. Demoruta har ikke saksnummer | K |
| VK-04 | B, D, E | Utkasthodet mangler «Lagret» og «Utkastdetaljer», skjemaet mangler «Forkast utkastet», sporet mangler merket «Nytt brev» (D), og feiltilstanden «Utkastet er ikke lagret» finnes ikke (E) | Domenegap. Utkast er av for TS-saker (#718), og løsningen lagrer ikke hva brukeren har sett (PR #1334, «Åpne spørsmål») | K |
| VK-05 | B | Mens utkastet er åpent, står ikke «Skriv brev i sporet» med «Utkast åpent: svar på brev 4» over arbeidet | Uavklart | K |
| VK-06 | B | «Tidslinje i sporet» vises ikke under hovedlinjene mens BH skriver svaret, men koden legger den der (`Vederlagssvar.svelte`). Den står i D og etter sending | Uavklart. Årsaken er ikke undersøkt. README sier at det må prøves hvordan tidslinja nås | K, L |
| VK-07 | B | Én begrunnelse i et vanlig tekstfelt, som kommer etter standpunktene. Skissen har en begrunnelse ved hver vurdering, med punktet den kommer under i brevet, og en avsluttende begrunnelse med rik tekst | Ikke gjennomført ennå | K |
| VK-08 | B | Posten for produktivitetstap, med beløpet etter begrensningen og de to alternativene «ikke tillegg», er ikke prøvd. Varden sier at posten ikke kan besvares her | Ikke gjennomført ennå (PR #1334, «Utelatt i prøven») | K, L |
| VK-09 | B | Beløpsfeltet viser «60000» uten mellomrom for tusener. Skissen viser «10 000» | Ikke gjennomført ennå | K |
| VK-10 | B | Hovedlinjene merker standpunktene «Prinsipalt» og «Subsidiært» og skriver beløpet som en setning. Skissen har standpunktet og verdien i to kolonner, med det krevde beløpet dempet | Bevisst endring. Valgt i byggeøkta. Teksten formulerer standpunktet fra kjernen (`prototypetekst.ts`) | K, L |
| VK-11 | B | «Les brevet ved siden av» bytter ut hovedlinjene med kravbrevet i høyre kolonne. Skissen viser ikke leseflaten åpen | Uavklart | K |
| VK-12 | C, D | Brevet har ingen nummererte punkter, ingen tabell over post, krevd og godkjent, og ingen hilsen eller underskrift. Begrunnelsen står sist. Innledningen viser ikke til begge postene i brev 4 som i skissen, og den sier «kravet om justering av vederlaget i TEs krav i brev 4» | Domenegap. Brevteksten kommer fra kjernen (`kjernesak.brev`), ikke fra Varden | K, L |
| VK-13 | C | Sendepanelet mangler kopi, intern godkjenning, avsenderens navn og mottakerne under «Til» («TE prosjektledelse, 3 personer»), og det har ikke «Last ned som merket PDF-utkast». Organisasjonen i «Fra» står i VK-60 | Ikke gjennomført ennå | K, L (`Brevkontroll.svelte`) |
| VK-14 | C | Teksten om bindingen viser vedtaks-ID-en til brukeren: «også at varselet kom for sent (KA-U1)». Skissen har ikke ID-en | Uavklart. Linse A i `design-review` | K, L (`prototypetekst.ts`) |
| VK-15 | D | Virkningen av aksepten sier «beløpet dere er enige om i vederlagssporet 0 kr», mens brevet godtar 60 000 kr subsidiært. Skissen sier bare at det som står i brev 5, blir det partene er enige om | Uavklart. Beløpet kommer fra kjernen (`kjernesak.forhaandsvist`). **Spørsmål:** skal virkningen av aksepten nevne et beløp, og i så fall hvilket? | K, L |
| VK-16 | D | Brevlinja mangler «PDF» og «Kvittering». «Utdyp» og «Oppgi korrigert opplysning» står i VK-71 | Ikke gjennomført ennå | K |
| VK-17 | D, E | Menyen «Andre brev og handlinger» viser seks handlinger, med varslene etter § 34.1.2 og § 34.1.3 og innsigelsen etter § 5, og alle er merket «Bygges ikke i denne prøven». Skissen viser ny versjon av kravet og trekk, med virkningen | Bevisst endring. Valgt i byggeøkta. Handlingene kommer fra kjernen (PR #1334, «Åpne spørsmål») | K |
| VK-18 | E | Etter sending står én linje, «Brevet ditt er sendt.», øverst i midtpanelet. Kvitteringen i skissen har tiden, leveringen, mottakeren med team, dokumentet med versjon og knappene «Åpne brevet slik det ble sendt» og «PDF». I Varden står tiden bare i brevets fot. De andre tilstandene i E står i VK-75–VK-84 | Ikke gjennomført ennå. Demoruta sender ingenting til en server | K, L (`Vardensak.svelte`) |

Variantene i H er fulgt slik oppdragsgiver valgte 27.10: sporene i venstre kolonne,
tidslinja i høyre kolonne og den kompakte saksoverskriften.

## Tillegg 27.10: alle panelene

Tabellen over førte de vesentlige avvikene. Oppdragsgiver 27.10, ordrett: «Dette så jeg
raskt - kan være andre avvik.» (#1338). Tillegget sammenligner derfor skissene B–E med
Varden på `a206ccd` element for element, i toppanelet, saksoverskriften, venstre kolonne,
midtpanelet og høyrepanelet. Bildene, bredden, rollen og dataene er de samme som over.
VK-01–VK-18 er kontrollert på nytt og rettet i tabellen over. Nye forskjeller står under,
også de som skyldes data. Rene forskjeller i piksler og fargetoner som ikke endrer innhold
eller hierarki, er ikke tatt med.

E er ikke en saksskjerm, men et ark med tolv tilstandskort. Den har ingen toppanel eller
saksoverskrift, så avvikene i dem gjelder ikke E. For E sier kolonnen «Panel» hvor Varden
viser tilstanden. Hvert kort er sammenlignet med det Varden har for samme
tilstand.

### Kontrollen av VK-01–VK-18

- **Rettet:** VK-01 gjelder B, C og D, ikke E, og bare logoen og kunden. Hver av de andre
  delene av toppanelet har fått sin rad (VK-89–VK-95), og merket og demolinja er skilt ut
  (VK-19, VK-20). VK-03 gjelder bare saksnummeret. Prosjektet, kontrakten, partsnavnene og
  tittelen har fått hver sin rad (VK-85–VK-88), og brevhodet, datoene og rollen også
  (VK-21–VK-23 og VK-47–VK-49). VK-10 og VK-17 har etiketten «Bevisst endring». VK-06 sier nå at koden legger
  tidslinja under hovedlinjene i B, men at den ikke vises. I VK-18 står tiden i brevets
  fot, ikke i kvitteringen.
- **Delt:** VK-13, der organisasjonen i «Fra» skyldes data (VK-60). VK-16, der
  handlingene i tidslinja er skilt ut (VK-71). VK-18, der de andre tilstandene i E har
  fått hver sin rad (VK-75–VK-84).
- **Utvidet:** VK-02 og VK-04 gjelder også E. VK-04 gjelder også D. VK-12 tar også med
  innledningen. VK-13 tar også med mottakerne. VK-15 har spørsmålet merket.
- **Stemmer:** VK-05, VK-07–VK-11, VK-14 og VK-17.

### De nye avvikene

| ID | Skjerm | Panel | Avviket | Klassifisering | Belegg |
| --- | --- | --- | --- | --- | --- |
| VK-19 | B, C, D | Toppanel | Varden har merket «Varden · eksperimentell visning» over saksoverskriften. Skissen har det ikke | Bevisst endring. Prøven merkes som prototype (`SAKEN.prototype`, #1331) | K, L (`prototypetekst.ts`) |
| VK-20 | B, C, D | Toppanel | Demoruta legger «Demo · BF-01» nederst til høyre. I C dekker den delvis forklaringen under sendeknappen | Ikke et designavvik. Linja hører til demoruta | K |
| VK-21 | B, C, D | Saksoverskrift og datoer | Skissen skriver datoene kort («2. okt 2026», «siste 20. okt»). Varden skriver «1. oktober 2026» i saksoverskriften, sporhodet, brevlinja og «Svarer på», men «1. okt.» i «Svar på brev 4» | Uavklart | K |
| VK-22 | B–E | Alle | Skissen er sak E-021 med datoer fra 2. til 27. oktober. I BF-01 er alle brevene datert 1. oktober 2026 | Ikke et designavvik | K |
| VK-23 | B, C, D | Saksoverskrift | Varden har «Du er BH» eller «Du er TE» i metalinja. Skissen viser rollen bare i brukermenyen | Bevisst endring. Begrunnelse ikke funnet. Brukermenyen mangler (VK-01) | K |
| VK-24 | C | Saksoverskrift | Skissen har ingen saksoverskrift på C. Brevet står rett under brødsmulene. Varden har den kompakte saksoverskriften også her | Uavklart. H avgjør ikke om overskriften skal stå på C | K, L (`Vardensak.svelte`) |
| VK-25 | C | Venstre kolonne | Skissen har ingen venstre kolonne på C, så brevet og sendepanelet får hele bredden. Varden har sporene | Uavklart | K, L (`Vardensak.svelte`) |
| VK-26 | B, D | Venstre kolonne | Varden har en linje under hvert spor: «Siste: brev 3 fra BH» eller «Ingen brev». B og D har bare sporets navn | Bevisst endring etter variant b i H, som oppdragsgiver valgte 27.10 | K, L (`Vardensak.svelte`) |
| VK-27 | B, D | Venstre kolonne | Variant b i H viser antall brev og siste brev under sporet. Varden viser ikke antallet | Ikke gjennomført ennå | K, L |
| VK-28 | B, D | Midtpanel | Sporhodet har «2 brev» og «3 brev» i skissene, mot «1 brev» og «2 brev» i Varden | Ikke et designavvik | K |
| VK-29 | B | Midtpanel | Skissen merker utkastet «Utkast». Varden har «Utkast · ikke sendt» | Bevisst endring. Begrunnelse ikke funnet (`BREVKONTROLL.utkast`) | K, L (`prototypetekst.ts`) |
| VK-30 | B | Midtpanel | Skissen har «Bare synlig for Prosjektteam Nord». Varden har ikke teamnavnet | Ikke et designavvik. Demoruta har ikke team | K |
| VK-31 | B | Midtpanel | Varden føyer til «til det er sendt» i teksten om hvem som ser utkastet | Bevisst endring. Begrunnelse ikke funnet (`SKJEMA.synlig`) | K, L (`prototypetekst.ts`) |
| VK-32 | B | Midtpanel | Skissen spør om varselet om produktivitetstap etter § 34.1.3. Varden spør om varselet om kravet etter § 34.1.2 | Ikke et designavvik. Teksten i Varden er fast for § 34.1.2 (`SKJEMA.varselTittel`) | K, L (`prototypetekst.ts`) |
| VK-33 | B | Midtpanel | Skissen har spørsmålet «Kom varselet … i tide?» over boksen med datoene. Varden har det under | Uavklart | K |
| VK-34 | B | Midtpanel | Boksen med datoene har et kalenderikon i skissen. Varden har ikke ikonet | Uavklart | K |
| VK-35 | B | Midtpanel | Skissen viser at en dato er korrigert («brev 1 sa 3. oktober»). Varden har ingen korrigering | Ikke et designavvik. BF-01 har ingen korrigering. Det er ikke kontrollert om Varden kan vise en | K |
| VK-36 | B | Midtpanel | Skissen har «7 kalenderdager fra oppdagelsesdatoen til varselet». Varden har «16 kalenderdager fra datoen TE oppgir til kravet ble sendt.» | Bevisst endring i ordlyden. Begrunnelse ikke funnet (`SKJEMA.avstand`). Tallet skyldes dataene | K, L (`prototypetekst.ts`) |
| VK-37 | B | Midtpanel | Varden har en linje til under datoene: «Løsningen viser datoene. Om varselet kom i tide, avgjør partene.» | Bevisst endring. Begrunnelse ikke funnet i koden (`SKJEMA.datoGrense`) | K, L (`prototypetekst.ts`) |
| VK-38 | B | Midtpanel | Skissen spør «Godtar du fast sum?» med «Godtar fast sum» og «Godtar ikke fast sum». Varden spør «Godtar du det?» med «Godtar metoden» og «Godtar ikke metoden» | Bevisst endring. Begrunnelse ikke funnet. Teksten er den samme for alle metodene (`SKJEMA.metodeSpoersmaal`) | K, L (`prototypetekst.ts`) |
| VK-39 | B | Midtpanel | Skissen merker metoden «Ikke besvart». I Varden er metoden besvart, så merket vises ikke | Ikke et designavvik. Koden viser merket når metoden er ubesvart | K, L (`Vederlagssvar.svelte`) |
| VK-40 | B | Midtpanel | Varden spør videre ved «Godtar ikke metoden»: enhetspriser (§ 34.3) eller regningsarbeid (§ 34.4). Skissen viser ikke et slikt spørsmål | Uavklart | L (`Vederlagssvar.svelte`) |
| VK-41 | B | Midtpanel | Skissen har hovedkravet på 125 000 kr med «Hele beløpet» valgt. Varden har 100 000 kr, det subsidiære spørsmålet og «Deler av beløpet» valgt | Ikke et designavvik. Koden viser skissens spørsmål når varselet ikke påberopes som for sent | K, L (`Vederlagssvar.svelte`) |
| VK-42 | B | Midtpanel | Varden har etiketten «Beløpet du godtar» over beløpsfeltet. Skissen har ingen etikett | Bevisst endring. Begrunnelse ikke funnet | K |
| VK-43 | B | Midtpanel | Hjelpeteksten under beløpet sier i skissen hva beløpet gjelder («Utgiftene som ikke er rammet …»). Varden sier bare grensene: «Mer enn 0 kr og mindre enn 100 000 kr.» | Uavklart | K, L (`SKJEMA.belopHjelp`) |
| VK-44 | B | Midtpanel | Begrunnelsen er utfylt i Varden. Skissen viser plassholderen | Ikke et designavvik | K |
| VK-45 | C | Midtpanel | Skissen har «Tilbake til utkastet» øverst på siden, over brevet og panelet. Varden har lenken over brevet i midtkolonnen | Uavklart | K, L (`Brevkontroll.svelte`) |
| VK-46 | C | Midtpanel | Brevhodet har «Brev: 5, vederlag» i skissen. Varden har bare «5» | Ikke gjennomført ennå | K, L (`Brevkontroll.svelte`) |
| VK-47 | C, D | Midtpanel | Brevhodet har logo, «Oslobygg KF» og «Byggherre» i skissen. Varden har «Byggherren» og «BH» | Ikke et designavvik. Demoruta har ingen organisasjon (`PARTNAVN` i `Brev.svelte`) | K, L |
| VK-48 | C, D | Midtpanel | Feltet «Sak» i brevhodet har «E-021, Skolebygg Nord» i skissen. Varden har hele forløpets tittel | Ikke et designavvik. Koden bruker `saksbilde.tittel` | K, L (`Brevkontroll.svelte`, `Sporlesing.svelte`) |
| VK-49 | B, C, D, E | Midtpanel | Mottakeren heter «Totalentreprenør AS» i skissen og «Entreprenøren (TE)» i Varden | Ikke et designavvik. Demoruta har ikke partsnavn | K |
| VK-50 | C, D | Midtpanel | Brevet i Varden skriver «eks. mva.» ved beløpene. Skissen nevner ikke merverdiavgift | Uavklart. Teksten kommer fra kjernen | K |
| VK-51 | C | Midtpanel | Kolofonen i skissen sier også at PDF-en får A4-format, og at serveren setter nummer og tid. Varden har ikke disse opplysningene | Uavklart | K, L (`prototypetekst.ts`) |
| VK-52 | D, E | Midtpanel | Kolofonen i skissen har «Sendt gjennom Varden». Varden har «Sendt gjennom appen» | Bevisst endring etter designsystemet, [«Hva løsningen kalles»](../system.md#hva-løsningen-kalles) (oppdragsgiver 25.10) | K, L (`MOTTATT.sendt`) |
| VK-53 | D | Midtpanel | Kolofonen i skissen har «Levert samme minutt». Varden sier ikke noe om leveringen | Ikke gjennomført ennå. Demoruta leverer ikke | K |
| VK-54 | D | Midtpanel | Skissen har et blyantikon foran «Andre brev og handlinger». Varden har ikke ikonet | Uavklart | K |
| VK-55 | D | Midtpanel | Brevlinja har «mottatt 27. okt 2026 kl. 11.05» i skissen. Varden har ikke klokkeslettet. Teksten `MOTTATT.fra` med klokkeslett finnes, men brukes ikke | Ikke gjennomført ennå | K, L (`Sporlesing.svelte`) |
| VK-56 | D | Midtpanel | Skissen har «Svaret fra BH står i sin helhet under.». Varden har «Brevet fra BH …» | Bevisst endring. Begrunnelse ikke funnet (`MOTTATT.iSinHelhet`) | K, L (`prototypetekst.ts`) |
| VK-57 | D | Midtpanel | Skissen viser «Ta stilling til svaret» som trykket mens panelet er åpent. Varden har `aria-expanded`, men knappen ser lik ut åpen og lukket | Uavklart | K, L (`Sporlesing.svelte`) |
| VK-58 | B | Høyrepanel | Skissen har «Beregningsmetode · Ikke besvart» i hovedlinjene og sier at brevet kan ses, men ikke sendes. Varden sperrer «Se brevet før sending» så lenge et spørsmål hindrer brevet | Uavklart. **Spørsmål:** skal BH kunne se brevet før alle spørsmålene er besvart? | K, L (`Vederlagssvar.svelte`) |
| VK-59 | B, C | Høyrepanel | Skissen har «Byggherren er bundet av svaret når det er sendt.». Varden har tre setninger: virkningen regnes ut fra valgene, begrunnelsen tolkes ikke, og byggherren er bundet av svaret som sendes herfra | Bevisst endring. Teksten er delt med dagens visning (`$lib/kjernesak/bindingstekst`) | K, L |
| VK-60 | C | Høyrepanel | «Fra» i sendepanelet har «Oslobygg KF (BH)» i skissen og «Byggherren (BH)» i Varden | Ikke et designavvik. Demoruta har ingen organisasjon | K |
| VK-61 | B | Høyrepanel | Skissen viser det krevde beløpet dempet under posten, og at de to beløpene er alternativer. Varden viser merknaden om alternativer bare når flere lag har beløp | Ikke et designavvik. BF-01 har ett beløp | K, L (`Hovedlinjer.svelte`) |
| VK-62 | C | Høyrepanel | Skissen har teksten om låsingen i et merke og sier at brevet lages fra utkastet. Varden har en linje uten merke og sier at brevet lages fra valgene | Bevisst endring. Begrunnelse ikke funnet | K, L (`prototypetekst.ts`) |
| VK-63 | C | Høyrepanel | Varden begynner hvert punkt under «Dette sender du» med «Prinsipalt:» eller «Subsidiært:». Skissen har ikke slike merker | Bevisst endring. Samme grep som VK-10 | K, L (`Brevkontroll.svelte`) |
| VK-64 | C | Høyrepanel | Punktene under «Dette sender du» gjelder hovedkravet og produktivitetstapet i skissen, og varselet, metoden og hovedkravet i Varden | Ikke et designavvik | K |
| VK-65 | D | Høyrepanel | «Lukk» er en tekstlenke i skissen. Varden har ikonet × foran | Bevisst endring. Begrunnelse ikke funnet | K |
| VK-66 | D | Høyrepanel | Aksepten omfatter i skissen at varselet om produktivitetstap kom for sent, og i Varden at varselet etter § 34.1.2 kom for sent | Ikke et designavvik | K, L (`STILLING.omfatter`) |
| VK-67 | D | Høyrepanel | Skissen sier at virkningen er regnet ut fra brev 5 «slik det ble sendt 27. okt kl. 11.05». Varden har ikke tidspunktet | Ikke gjennomført ennå | K, L (`STILLING.kilde`) |
| VK-68 | D | Høyrepanel | Tidslinja har 5 oppføringer i skissen og 3 i Varden | Ikke et designavvik | K |
| VK-69 | D | Høyrepanel | Den lukkede tidslinja har en pil nedover i skissen. Varden har en pil mot høyre som dreies når tidslinja åpnes | Bevisst endring. Begrunnelse ikke funnet | K, L (`Tidslinje.svelte`) |
| VK-70 | E | Høyrepanel | Den kompakte linja nederst har statusen «1 spørsmål er ikke besvart» i skissen. Varden har de to knappene, men ikke statusen | Ikke gjennomført ennå. Ikke kjørt | L (`Vederlagssvar.svelte`) |
| VK-71 | D | Høyrepanel | TEs eget brev har ikke «Utdyp» eller «Oppgi korrigert opplysning» i tidslinja | Ikke gjennomført ennå | K (tidslinja utvidet, kjørt i #1341) |
| VK-72 | D, E | Meny | Skissen kaller valgene med substantiv («Ny versjon av kravet»), med en forklaring under hvert. Varden bruker verb («Send ny versjon av kravet»), og bare «Trekk kravet» har en forklaring | Bevisst endring. Begrunnelse ikke funnet (`BREVTYPER`) | K, L (`prototypetekst.ts`) |
| VK-73 | E | Meny | Skissen har en merknad nederst i menyen om at saken avgjør hvilke brevtyper som er mulige, og at lista ikke er en anbefaling. Varden har ikke merknaden | Ikke gjennomført ennå | K, L (`Brevtyper.svelte`) |
| VK-74 | E | Meny | E viser menyen som et løst kort. Varden åpner den som en nedtrekksliste ved overskriften for sporet | Bevisst endring. Begrunnelse ikke funnet. E tegner ikke plasseringen | K |
| VK-75 | E | Midtpanel | Etter sending viser Varden det sendte brevet med en gang. Skissen har knappen «Åpne brevet slik det ble sendt» i kvitteringen | Bevisst endring. Begrunnelse ikke funnet | K, L (`Sporlesing.svelte`) |
| VK-76 | E | Midtpanel | Skissen har «Brev 5 er sendt og levert». Varden har «Brevet ditt er sendt.» uten nummeret | Uavklart | K |
| VK-77 | E | Midtpanel | Skissen har tilstanden «Sendt, men ikke bekreftet levert», med «Kontroller leveringen igjen» og «Kontakt brukerstøtte». Varden har ingen slik tilstand | Uavklart. **Spørsmål:** skal løsningen skille mellom et sendt og et levert brev? | K, L |
| VK-78 | E | Høyrepanel | Skissen har tilstanden «Sendingen er stoppet» med det nye brevet fra TE og knappene «Se hva som er endret» og «Åpne utkastet igjen». Varden viser avvisningen som én feiltekst under sendeknappen | Ikke gjennomført ennå | L (`Brevkontroll.svelte`) |
| VK-79 | E | Midtpanel | I skissen åpner hjemmelen et lesepanel med kontraktens ordlyd, kilden, «Forklaring · vår tolkning» og «Tilbake til svaret». Hjemmelsmerkene i Varden åpner ingenting | Ikke gjennomført ennå | L (`Vederlagssvar.svelte`) |
| VK-80 | E | Meny | Skissen sier fra før skjemaet at brevtypen ikke kan sendes herfra, og tilbyr «Skriv utkast for eksport». Varden merker brevtypen «Bygges ikke i denne prøven. Bruk dagens visning.», uten knapp | Ikke gjennomført ennå | K, L (`Brevtyper.svelte`) |
| VK-81 | E | Høyrepanel | Skissen har en statuslinje mens brevet sendes, med forklaringen om at det ikke sendes to ganger, og starttiden. Varden bytter bare knappeteksten til «Sender …» | Ikke gjennomført ennå | L (`Brevkontroll.svelte`) |
| VK-82 | E | Høyrepanel | Skissen sier at et spor uten brev ikke har tidslinje. `Sporlesing.svelte` legger tidslinja inn også da | Uavklart. Ikke kjørt | L (`Sporlesing.svelte`) |
| VK-83 | E | Hele siden | Skissen har siden «Du har ikke tilgang til saken», med prosjektet saken tilhører og «Gå til prosjektene dine». Varden har ingen slik side | Ikke gjennomført ennå. Demoruta har ingen tilgangskontroll | K |
| VK-84 | E | Midtpanel | Skissen har et sammendrag for grunnlaget der partene er uenige, med standpunktene og beløpet med kilde. Varden har ikke et slikt sammendrag | Ikke gjennomført ennå | K |
| VK-85 | B, D | Saksoverskrift | Metalinja har prosjektet «Skolebygg Nord» i skissen. Varden har ikke prosjektet | Ikke et designavvik. Demoruta har ingen prosjekter | K |
| VK-86 | B, D | Saksoverskrift | Metalinja har kontrakten «NS 8407 totalentreprise» i skissen. Varden har ikke kontrakten | Ikke et designavvik. Demoruta har ingen kontrakt | K |
| VK-87 | B, D | Saksoverskrift | Metalinja har partsnavnene «BH Oslobygg KF» og «TE Totalentreprenør AS» i skissen. Varden har «BH byggherren» og «TE entreprenøren» | Ikke et designavvik. Demoruta har ikke partsnavn | K |
| VK-88 | B, D | Saksoverskrift | Tittelen er kort i skissen («Ny peling med produktivitetstap»). Varden har forløpets tittel, en hel setning om hva forløpet prøver | Ikke et designavvik. Tittelen er forløpets, ikke en sakstittel | K |
| VK-89 | B, C, D | Toppanel | Toppfeltet har produktnavnet og navigasjonen «Saker», «Prosjekter» og «Arkiv» i skissen. Varden har ingen av dem | Ikke gjennomført ennå | K |
| VK-90 | B, C, D | Toppanel | Toppfeltet har søket «Søk i saker og brev» med hurtigtast i skissen. Varden har ikke søket | Ikke gjennomført ennå | K |
| VK-91 | B, C, D | Toppanel | Toppfeltet har varselklokka med antall og hjelpen i skissen. Varden har ingen av dem | Ikke gjennomført ennå | K |
| VK-92 | B, C, D | Toppanel | Toppfeltet har brukermenyen med navnet, rollen og teamet i skissen. Varden har ikke brukermenyen | Ikke gjennomført ennå | K |
| VK-93 | B, C, D | Toppanel | Skissen har brødsmulene fra «Prosjekter» til saken, i C til «Brev 5, utkast». Varden har ingen brødsmuler | Ikke gjennomført ennå | K |
| VK-94 | B, D | Toppanel | Skissen har «Kopier lenke» og «Saken som PDF» ved brødsmulene. Varden har ingen av dem | Ikke gjennomført ennå | K |
| VK-95 | B, C, D | Toppanel | Skissen har bunnfeltet med versjonen, «Data lagres i Norge», tilgjengelighetserklæringen, personvernet og brukerstøtten. Varden har ikke bunnfeltet | Ikke gjennomført ennå | K |

### Bildene side om side

Skissen står til venstre og Varden til høyre, i 1440 px. Bildene er de samme som i #1341,
lagt på grenen `skjermbilder` for #1342.

- [B, BH skriver svaret](https://raw.githubusercontent.com/khjohns/endringsmeldinger/95a52592883c2fe5bf597fff4a059c8839487dfe/pr-1342/b-svar.png) og [B med «Les brevet ved siden av»](https://raw.githubusercontent.com/khjohns/endringsmeldinger/95a52592883c2fe5bf597fff4a059c8839487dfe/pr-1342/b-les-brevet.png)
- [C, brevet før sending](https://raw.githubusercontent.com/khjohns/endringsmeldinger/95a52592883c2fe5bf597fff4a059c8839487dfe/pr-1342/c-brevkontroll.png)
- [D, TE har mottatt svaret](https://raw.githubusercontent.com/khjohns/endringsmeldinger/95a52592883c2fe5bf597fff4a059c8839487dfe/pr-1342/d-mottatt-svar.png) og [D med menyen åpen](https://raw.githubusercontent.com/khjohns/endringsmeldinger/95a52592883c2fe5bf597fff4a059c8839487dfe/pr-1342/e-meny.png)
- [E, etter sending](https://raw.githubusercontent.com/khjohns/endringsmeldinger/95a52592883c2fe5bf597fff4a059c8839487dfe/pr-1342/e-sendt.png)

## Feil i #1334 funnet underveis

Når BH åpner «Les brevet ved siden av», kaster siden to ganger
`TypeError: Cannot read properties of null (reading 'offsetHeight')` fra `maal` i
`Vederlagssvar.svelte`, både fra `ResizeObserver` og fra lytteren på `resize`. Panelet
med hovedlinjene er da fjernet. Skjermbildet ble tatt likevel. Demoruta trykker ikke på
knappen, så kjøringen i #1334 fant ikke feilen. Feilen er meldt som kommentar i #1334.

## Verifikasjon og grenser

Kjørt og observert 27.10:

- `node .claude/skills/mockup-nettleser/demoruta.mjs --visning varden` på `a206ccd`:
  kontrollpunktene 02–10, uten JavaScript-feil.
- Et eget Playwright-skript på samme commit: leseflaten åpen for BH, menyen og panelet
  «Ta stilling til svaret» åpne for TE, og tidslinja utvidet.
- Skissene er bildene i [`bilder/`](bilder/), laget fra `skjermer/` med
  [`lag-bilder.mjs`](lag-bilder.mjs) på `f46a03a`.
- Tillegget 27.10 (#1342): fire subagenter har lest én skisse hver, bildene side om side
  og koden i `src/lib/components/varden/` på `a206ccd`. Varden er ikke kjørt på nytt.
  Rader med bare **L** er lest i koden og ikke sett i nettleseren.

Ikke kontrollert:

- Den kompakte linja nederst når hovedlinjene ikke får plass i vinduet (E).
- Smal skjerm mot skissene. Skissene finnes bare i 1440 px.
- Saksruta og TS-serveren. Varden er ikke koblet til dem.
- Om teksten er riktig etter vedtakene. Det gjøres med linse A i `design-review`.
