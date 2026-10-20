# Svar fra sparringen 20.10

Svaret på [prompten](prompt-sparring.md), limt inn i økta av oppdragsgiver 20.10 og
lagret ordrett under streken. Det gjelder først når oppdragsgiver slutter seg til
det, og det er ikke prøvd mot vedtakene i 3.1 eller mot koden. Lenkene er
sparringens egne og er ikke kontrollert.

---

Konklusjonen «ingen byggekloss bør byttes» er sterkere enn begrunnelsen din. Du har vurdert mekanismene hver for seg, men flere av de største risikoene ligger i samspillet mellom dem: journalføring og levering, regelmodell og faktisk kommunikasjon, tilgangskontroll og eksterne kopier.

De tre største svakhetene er disse, rangert:

1. **Du behandler forskjellen mellom lagret og kommet fram som et leveringsproblem. Den kan være et problem i selve domenemodellen.**

   **Antakelsen din:** Brevet kan registreres som sendt og inngå i journalen før levering, uten at dette påvirker hvordan senere handlinger vurderes.

   **Hvorfor den kanskje ikke holder:** Journalen inneholder da både meddelte og ennå ikke meddelte utsagn. Hvis foldingen bruker begge, kan et svar eller en aksept bygge på noe motparten aldri har mottatt. Hvis foldingen filtrerer på levering, må leveringsgrunnlaget være en historisert del av regelgrunnlaget. Beskrivelsen viser ikke hvor dette hører hjemme mellom de to hendelsestypene.

   Opplasting, opprettelse av dokumentreferanse, tilgjengelighet for riktig mottaker og kontraktsmessig fremkomst er dessuten forskjellige forhold. En API-kvittering avgjør ikke alene det siste.

   **Hva som ville vise at antakelsen er feil:** Lag et krav, parker leveringen, og send deretter et svar eller en ny kravversjon. La første brev bli levert sist. Hvis råd, svarreferanser eller fristgrunnlag blir feil, er problemet større enn manglende driftsvarsling. Gjenta med et eksternt brev som registreres flere dager etter mottak: registreringsrekkefølge må ikke bli en skjult påstand om kommunikasjonsrekkefølge.

2. **Du antar at en ufullstendig domenemodell kan sperre handlinger uten å skade rettighetene modellen skal beskytte.**

   **Antakelsen din:** Prinsipp 5 er et konservativt sikkerhetstiltak, og avgrensningen i prinsipp 8 gjør første versjon håndterbar.

   **Hvorfor den kanskje ikke holder:** Motparten kan sende et sammensatt brev med delvis aksept, forbehold, en endringsordre og henvisninger til flere tidligere krav. Det kan være en helt ordinær kontraktshandling selv om modellen ikke forstår den. Sperrer appen deretter svar, gjør den modellens begrensning til partens problem.

   Dette er en praktisk konflikt med prinsipp 4: Appen sier kanskje ikke at et krav er tapt, men kan hindre handlingen som skulle bevare det. Lavt volum reduserer ikke denne risikoen.

   **Hva som ville vise at antakelsen er feil:** Spill gjennom avsluttede, anonymiserte prosjektforløp med originale brev og møtereferater. Ett legitimt og tidskritisk svar som krever at utviklerne først utvider utsagnsmodellen, falsifiserer antakelsen om at sperren er trygg.

   **Her foreslår jeg uttrykkelig en prinsippendring:** Endre prinsipp 5 slik at ukjent innhold sperrer automatisk vurdering, men tillater en uttrykkelig manuell brevutsendelse. Det krever også et avgrenset unntak fra prinsipp 6: Brukeren får se brevet, men ikke en beregnet betydning. Det dere mister, er garantien om at appen forstår alle bindende handlinger før sending. Hvis prinsippene beholdes, må en avtalt ekstern kanal og etterregistrering håndtere disse situasjonene.

3. **Du bruker lokal uforanderlighet som for sterk støtte for K1 og K6.**

   **Antakelsen din:** Append-only journal, frosne PDF-er og hash gir et tilstrekkelig bevisgrunnlag; vedleggsbevaring er et avgrenset restpunkt.

   **Hvorfor den kanskje ikke holder:** Et brev kan være uendret, men likevel uforståelig uten vedlegget, den konkrete tegningsrevisjonen eller brevet det svarer på. K6 krever også lesbare referanser og sammenheng, ikke bare at hver PDF kan åpnes.

   Triggere beskytter dessuten mot bestemte databaseoperasjoner under bestemte rettigheter. De dokumenterer ikke alene at en privilegert operatør aldri har endret materialet; SQL Server tillater at triggere deaktiveres med tilstrekkelige rettigheter. Dette gjør ikke materialet verdiløst som bevis, men begrenser hva mekanismen underbygger. [Microsoft om deaktivering av triggere](https://learn.microsoft.com/en-us/sql/t-sql/statements/disable-trigger-transact-sql).

   **Hva som ville vise at antakelsen er feil:** Eksporter en sak, steng tilgangen til appen og Catenda, og la en annen person rekonstruere hvem som meddelte hva, hvilke vedlegg det omfattet, og hvilket mottaksgrunnlag som finnes. Manglende filer, uoppløselige ID-er eller behov for dagens regelmotor viser at K1/K6 ikke er oppfylt slik vurderingen forutsetter.

For MD-01 til MD-07 har jeg følgende innvendinger:

- **MD-01 – Journal:** Avvisningen av «tilstandsmodell med revisjonslogg» bygger på en falsk motsetning. Et alternativ er uforanderlige dokumenter som bevisgrunnlag, kombinert med en ordinær tilstandstabell som kan bygges opp igjen. Tilstanden trenger ikke være autoritativ for bindende handlinger.

  Den viktigere risikoen er kravet om ett bestemt svarmål. Et brev kan besvare flere kravversjoner, og et svar på en eldre versjon kan fortsatt være relevant. Det må skilles mellom dokumentversjon, identiteten til kravet og hvilke deler svaret gjelder. En global saksversjon løser ikke dette.

- **MD-02 – Tekst mot utledning:** Tilbakelesing av PDF beviser bare en bestemt likhet. Hvis både forventet tekst og PDF bygger på samme feilaktige mal, passerer feilen. Uttrekt tekst kan også være korrekt selv om leseren ser feil tabellplassering eller avkuttet innhold.

  En oversett modell er å skille det mottatte originaldokumentet fra appens senere, kildehenviste tolkning. Da kan tolkningen korrigeres uten at dere later som avsenderen har fremsatt et nytt utsagn. Prinsipp 7 må ikke gjøre en retting av appens klassifiseringsfeil til en ny partsmeddelelse.

  Jeg er også uenig i «ikke utvid utledningen før første ekte sak» dersom manglende utledning sperrer handlinger. Da blir første bruker samtidig test av modellens dekningsgrad.

- **MD-03 – Lagringsform:** Normalisering krever ikke en migrasjon for hver ny utsagnsart. Et stabilt relasjonelt lag for dokumenter, avsendere, mottakere og referanser kan kombineres med versjonerte JSON-payloads. Dette alternativet er avvist for bredt.

  Risikoen er uenighet mellom JSON og de typede kolonnene. Hvis beløp, team eller kravreferanse finnes begge steder, må én verdi være autoritativ og samsvaret håndheves. `ISJSON` validerer ikke domeneskjemaet og kontrollerer heller ikke unike nøkler på samme nivå. [Microsoft om ISJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/isjson-transact-sql?view=sql-server-ver15).

  Unik `(sak, versjon)` gir heller ikke nødvendigvis idempotent innsending. Etter timeout kan samme brukerhandling bli registrert på nytt med neste versjon dersom den mangler en stabil operasjonsidentitet.

- **MD-04 – Kjernen:** Prinsipp 6 krever lokal beregning, men begrunner ikke automatisk hele kontrollapparatet rundt den. Hvitelisten kan kontrollere hvilke felt som leses; den beviser ikke at et felt faktisk representerer et meddelt utsagn eller at regelen tolker det riktig.

  Det mangler også en forklaring på blandede regelversjoner. Et nytt svar kan gjelde et gammelt kravbrev. Hvordan kombineres gammel dokumentbetydning med nye regler for svaret? En rapport fra «alle gamle regler» mot «alle nye regler» prøver ikke nødvendigvis denne kombinasjonen.

  Ved innsending må serveren dessuten kontrollere at brukeren godkjente samme innhold og relevante saksgrunnlag som serveren nå vurderer. Ny beregning alene hindrer ikke at et brev sendes med en annen betydning enn forhåndsvisningen viste.

- **MD-05 – Server og Azure SQL:** Du behandler driverinternals som en nødvendig kostnad uten å vise nødvendigheten. `node-mssql` dokumenterer et offentlig `Transaction`-API som reserverer én forbindelse gjennom transaksjonen. Hvis dette ikke dekker behovet deres, må den konkrete mangelen beskrives. [Driverens dokumentasjon](https://github.com/tediousjs/node-mssql#transaction).

  «SESSION_CONTEXT … bundet til transaksjonen» trenger også presisering. Dette er sesjonskontekst; transaksjonsbindingen må komme fra deres egen protokoll. Test feil, avbrudd og gjenbruk av forbindelser mellom team. RLS blir heller ikke uavhengig kontroll av identiteten når den stoler på konteksten samme server setter. [Microsoft om sesjonskontekst](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-set-session-context-transact-sql?view=sql-server-ver17).

  **Fabric er en konkret oversett K3-risiko:** Kildens detaljerte tilgangskontroll følger ikke automatisk med speilingen. Hvis interne notater eller utkast speiles, oppstår en egen tilgangsflate som vurderingen ikke dekker. [Microsoft om sikkerhet ved Azure SQL-speiling](https://learn.microsoft.com/en-us/fabric/mirroring/azure-sql-database-how-to-data-security).

  Påstanden om at PostgreSQL ville være enklere, er heller ikke underbygd. Men antall eksisterende migrasjoner er ikke i seg selv et argument mot omlegging før produksjon.

- **MD-06 – Levering:** Du avviser køtjeneste med feil kriterium. Den ville fortsatt trenge en utboks, men kunne overta deler av kjøring, oppvåkning og drift. Et mindre alternativ er samme jobbtabell med en separat arbeider, slik at levering ikke avhenger av webserverens livssyklus.

  «Avstem før hvert steg» garanterer ikke at et steg skjer én gang. En arbeider kan miste leasen mens en ekstern operasjon fortsatt pågår. En annen kan deretter finne «ikke opprettet» før første operasjon blir synlig. Det avgjørende er Catendas konkrete støtte for entydig operasjonsidentitet og gjenfinning etter ukjent utfall.

  Docker-testene er dessuten utilstrekkelige uten samsvarende databaseinnstillinger: Azure SQL har normalt `READ_COMMITTED_SNAPSHOT` aktivert, og `READPAST` har begrensninger under denne innstillingen. [Microsoft om isolasjon](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver17), [tabellhint](https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table?view=azuresqldb-current).

- **MD-07 – Catenda:** «God kanal» er foreløpig en hypotese. At partene bruker prosjekthotellet, dokumenterer ikke hvilken publisering som utgjør avtalt varsling, eller hvem som faktisk har tilgang.

  Webhook for *nye topics* dekker heller ikke i seg selv nye svar, kommentarer eller dokumenter i eksisterende saker. Hvis partene kan kommunisere der, kan appens journal bli ufullstendig samtidig som regelmotoren opptrer som om den kjenner saken.

  Alternativet er Catenda som distribusjonsflate med en selvstendig bevaringspakke. Den må omfatte vedleggsrevisjoner, referanser og leveringsgrunnlag. En ekstra blob med PDF-en alene løser ikke dette. Det krever uttrykkelig omgjøring av vedtaket om å slette vedleggskopien.

Hvis jeg skulle fjerne **én mekanisme**, ville jeg fjernet den egenutviklede forbindelseshåndteringen som bruker driverens interne deler, og brukt et dokumentert transaksjons-API.

Det er en konkret forenkling i en sikkerhetskritisk del av løsningen. Kostnaden mot K1–K6 er:

| Krav | Konsekvens |
|---|---|
| K1 Bevis | Ingen nødvendig svekkelse; samme atomiske journalskriving beholdes. |
| K2 Frister | Ingen nødvendig svekkelse; leveringssemantikken må løses uansett. |
| K3 Teamskjerming | Omleggingen må verifisere korrekt kontekst ved feil og forbindelsesgjenbruk. |
| K4 Korrekthet | Ingen tilsiktet funksjonsreduksjon; mindre avhengighet av udokumentert oppførsel. |
| K5 Lite team | Færre særegne mekanismer å feilsøke og vedlikeholde. |
| K6 Uavhengig lesing | Ingen påvirkning. |

Dette endrer ingen vedtatte prinsipper. Forbeholdet er konkret: Jeg kjenner ikke driveren, versjonen eller behovet som førte til internals. Hvis et offentlig API faktisk ikke dekker behovet, må dette demonstreres før mekanismen fjernes.

Når det gjelder NS 8407-forløpene, ville jeg utfordret modellen med følgende. Henvisningene gjelder standardens punkter; avtalte avvik må vurderes særskilt.

- **Varsling, mottakere og møtereferater – punkt 5, 9 og 4.2.** Varsler er ikke begrenset til brev produsert av appen. Standarden omfatter bestemte mottakere/adresser og varsler i byggherremøtereferater. [NS 8407:2011, punkt 5](https://innsyn.lofoten.nu/Vagan/innsyn/wfdocument.ashx?dokid=1871449&journalpostid=2021143270&variant=A&versjon=1).

  Modellen trenger derfor plass til originalkilde, mottaksgrunnlag og usikker tolkning. Innlogging og teammedlemskap dokumenterer heller ikke alene fullmakt til å binde parten.

- **Krav om endring glir over i endringsordre – punkt 32.2–32.3 og 31.3.** BHs svarmuligheter omfatter å utstede endringsordre, avslå eller frafalle pålegget med håndtering av allerede utført arbeid. Avslag og etterfølgende begrunnelse er heller ikke nødvendigvis samme meddelelse. [Lippestads gjennomgang av varslingsreglene](https://advokatlippestad.no/wp-content/uploads/2019/06/varslingsregler-22082019.pdf).

  Å utsette *endringsordre som egen sakstype* kan fungere. Å utsette enhver representasjon av endringsordren kan bryte et normalt forløp i første versjon. Et generisk «akseptert»-utsagn er ikke automatisk tilstrekkelig.

- **Nøytralt fristvarsel, spesifisering og svarplikt er forskjellige handlinger – punkt 33.4, 33.6.1–33.6.2 og 33.7.** Svarplikten etter 33.7 knytter seg til et begrunnet krav med antall dager, ikke på samme måte til det innledende varselet. BHs forespørsel etter 33.6.2 har særskilte innholdskrav; TE kan også begrunne hvorfor kravet ennå ikke kan beregnes. [Lippestad](https://advokatlippestad.no/wp-content/uploads/2019/06/varslingsregler-22082019.pdf).

  Modellen må derfor skille «ikke tallfestet ennå» fra null dager, fra intet krav og fra manglende svar. Ellers blir versjoneringsmodellen misvisende.

- **Innsigelse mot sen varsling har et eget forløp – punkt 5.** Også innsigelsen om at motparten varslet eller svarte for sent, må fremmes uten ugrunnet opphold; bestemmelsen har særregler ved sluttoppgjøret. [NS 8407:2011, punkt 5](https://innsyn.lofoten.nu/Vagan/innsyn/wfdocument.ashx?dokid=1871449&journalpostid=2021143270&variant=A&versjon=1).

  En generell boolsk «rettidig»-verdi blir for fattig. Appen må bevare partenes posisjoner og grunnlaget for fristvurderingen. Fravær av registrert svar må samtidig ikke forveksles med dokumentert fravær av svar.

- **Vederlagssporet inneholder flere varslingsforløp – punkt 34.1.3.** Økte utgifter til rigg/drift og produktivitetsforstyrrelser har særskilte varslingskrav. [NESO om varsling og frister](https://www.neso.no/juridiske-tjenester-1/vare-fagomrader/entrepriserett/varsling-og-frister).

  Ett samlet beløp og én kravversjon kan skjule at forskjellige deler har forskjellig grunnlag og varslingshistorikk. Det trengs ikke flere hovedspor, men sannsynligvis flere identifiserbare delkrav innen vederlag.

- **Forsering kobler tid og penger – punkt 33.8.** Avslag på et berettiget fristkrav kan utløse et valg om defensiv forsering, innenfor en økonomisk begrensning. Forseringskostnader kan også omfatte ineffektiv drift som skyldes forseringen. [Wiersholm om HR-2023-534-A og tilsvarende bestemmelse i NS 8407](https://wiersholm.no/nyhetsbrev/ny-hoyesterettsdom-om-defensiv-forsering-i-entreprisekontrakter/).

  Varsel før iverksettelse skal angi forventet kostnad. [NS 8407:2011, punkt 33.8](https://innsyn.lofoten.nu/Vagan/innsyn/wfdocument.ashx?dokid=1871449&journalpostid=2021143270&variant=A&versjon=1).

  Arkitekturen må kunne knytte forseringen til bestemte avslag, tidskrav og kostnadsanslag. Tre spor kan vises parallelt, men kan ikke behandles som uavhengige.

- **Sluttoppgjør er en ny meddelelse på tvers av sakene – punkt 39.1–39.2.** Sluttoppstillingen skal omfatte krav som opprettholdes, også tidligere avviste krav. BH må som utgangspunkt gjenta tidligere innsigelser og krav som opprettholdes. [NS 8407:2011, punkt 39](https://innsyn.lofoten.nu/Vagan/innsyn/wfdocument.ashx?dokid=1871449&journalpostid=2021143270&variant=A&versjon=1).

  En rapport over «åpne saker» er derfor ikke nok. Dere trenger en frosset angivelse av hvilke krav og innsigelser sluttoppgjørsbrevet omfatter. Rettspraksis viser også at en samlet henvisning til tidligere avslag kan ha betydning; én eksplisitt kravversjonsreferanse per svar er ikke hele virkeligheten. [Ryger om innsigelser til sluttoppstillingen](https://ryger.no/sluttoppgjor-i-entreprisekontrakter-saerlig-om-byggherrens-innsigelser-til-sluttoppstillingen/).

- **Avslag har et liv etter saksbehandlingen – punkt 35.2.** Bestemmelsen omfatter oppmann før overtakelse eller nødvendige rettslige skritt innen fristen knyttet til overtakelse av hele kontraktsgjenstanden. Høyesterett har også avklart nødvendig oppfølging etter innstilt forliksrådsbehandling. [DLA Piper om HR-2023-766-A](https://norway.dlapiper.com/no/nyhet/forliksklage-ma-folges-opp-med-stevning-innen-ett-ar-fra-forliksradets-innstiling-avbryte).

  En journal per endringssak trenger dermed tilgang til kontraktsomfattende hendelser: overtakelse, avtalte fristforlengelser og tvisteløsningsskritt. De er ikke nødvendigvis nye kravversjoner.

Til slutt er usikkerheten min fordelt slik:

- **Det jeg vet:** Beskrivelsen lar journalføring komme før levering, lar uforståtte hendelser sperre handlinger og lar vedlegg bevares bare hos Catenda. Dokumentasjonen bekrefter innvendingene om Fabric og det offentlige transaksjons-API-et.
- **Det jeg antar:** At blandede brev, ekstern kommunikasjon og svar på tvers av kravversjoner forekommer i prosjektene deres. Det bør undersøkes med historiske prosjektmapper.
- **Det jeg ikke har grunnlag for å avgjøre:** Om koden allerede håndterer disse forholdene, Catendas faktiske leverings- og bevaringsgarantier, kontraktenes avvik fra NS 8407, eller kommunens konkrete bevaringskrav. Jeg har vurdert arkitekturbeskrivelsen, ikke implementasjonen. Derfor er innvendingene dels påviste svakheter i begrunnelsen, dels konkrete hypoteser som må prøves.
