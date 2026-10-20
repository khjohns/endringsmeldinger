# Prompt til sparring: kritikk av vurderingen av målarkitekturen

Prompten hører til [vurderingen av målarkitekturen mot domenet](../../vurdering-maalarkitektur-mot-domenet-2026-10-20.md)
20.10. Den er selvstendig og har ingen saksdata, personnavn, nøkler eller
NS 8407-tekst. Svaret lagres ordrett ved siden av, som `svar-sparring.md`.

Alt under streken limes inn.

---

Du skal kritisere en arkitekturvurdering. Jeg har skrevet vurderingen selv og vil
at du finner svakhetene i den: antakelser som ikke holder, alternativer jeg har
oversett eller avvist for lett, og risikoer jeg har undervurdert. Ikke gjenta det
som er riktig, og ikke gi generelle råd om god arkitektur. Vær konkret og
uenig der du har grunn til det.

## Domenet

En webapp for kontraktsadministrasjon etter den norske totalentreprisestandarden
NS 8407. Den håndterer endringssaker mellom totalentreprenør (TE) og byggherre
(BH): krav om endring, varsler, svar, endringsordre og forsering (§ 33.8).

Det som skiller domenet:

- **Meldingene har juridisk vekt.** Et varsel som kommer for sent, kan føre til at
  kravet går tapt (preklusjon). Hva som ble sagt, av hvem, til hvem og når, kan
  bli bevis i en tvist flere år senere.
- **Tre spor går parallelt i hver sak:** grunnlag (ansvar), vederlag (penger) og
  frist (tid).
- **To parter, flere team.** Én kontraktsside kan bestå av flere organisasjoner,
  for eksempel byggherren og en ekstern rådgiver. Interne notater og utkast er
  skjermet per team, ikke per side.
- **Få saker, høy vekt.** Volumet er ikke tallfestet, men antas lavt: titalls til
  noen hundre saker per prosjekt, hver med mye penger og tid.
- **Et lite utviklingsteam** skal bygge og drifte det, i en kommunal virksomhet
  med egen IT-avdeling. Appen er ikke i produksjon og har ingen reelle data.

## Prinsipper som er vedtatt

Disse er vedtatt av oppdragsgiver og endres ikke av vurderingen. Du kan likevel
kritisere dem hvis de gjør arkitekturen dårligere.

1. Kontrakten først. En regel i koden begrunnes i en bestemmelse i NS 8407 eller
   et vedtak, og leser utsagnene partene har gitt. Ingen regel leser en status
   eller en oppsummering; status er bare en etikett i visningen.
2. Et sendt brev betyr det det sa da. Nye regler gjelder bare nye brev. Det
   avsenderen så da brevet ble sendt, fryses i brevet.
3. Det som binder, er teksten. Utsagn binder fra de er kommet fram, slik de sto.
   Det som ikke står i brevteksten, er ikke meddelt.
4. Appen avgjør ikke det kontrakten overlater til partene, en oppmann eller
   domstolene. Den sier aldri selv at et krav er prekludert eller avgjort.
   Vurderingen den viser, er et råd.
5. En hendelse appen ikke forstår, gjør saken «ikke forstått», og da godtas ingen
   bindende handling. Det appen ennå ikke kan håndtere, avvises og forenkles ikke.
6. Brukeren skal kunne se hva et svar betyr før det sendes, uten serverkall, og
   serveren regner det ut på nytt ved innsending.
7. Journalen er append-only. Arkivplikten går foran sletteplikten. En retting er
   et nytt utsagn.
8. Første versjon dekker bare saken om krav om endring med de tre sporene.
   Endringsordre som egen sak og forsering kommer senere.

## Målarkitekturen

1. **Journal og utsagnsmodell.** Hver sak har en append-only journal. Den har to
   hendelsestyper: «sak opprettet» og «dokument registrert». Hvert brev er ett
   dokument fra én part, med krav, svar og utsagn. Et svar gjelder én bestemt
   kravversjon, og et utsagn viser uttrykkelig til det det gjelder. Det finnes
   17 arter utsagn (rettidighet, grunnlag, beløp, metode, dager, varsel, aksept,
   bestridelse, innsigelse og andre). En ren funksjon folder journalen til
   predikater per spor, og visningen lager etiketter av dem.
2. **Lagringsform.** Ett JSON-dokument per brev i en `nvarchar(max)`-kolonne med
   `ISJSON`-sjekk, og typede kolonner for det som spørres, skrankes eller
   nøkles. Append-only håndheves med triggere som avviser `UPDATE` og `DELETE`.
   Optimistisk samtidighet med unik (sak, versjon). Spørre- og rapporttabeller
   lages av journalen og brukes aldri til en bindende handling.
3. **TS-kjernen.** Domenereglene er ren TypeScript (om lag 6 500 linjer, 12 800
   linjer tester) og kjører både i nettleseren og på serveren. En arkitekturtest
   bruker TypeScript-kompilatoren til å håndheve at kjernen ikke importerer noe
   utenfra, at reglene aldri når visningen, og at hvert felt reglene leser, står i
   en hviteliste med en klasse (utsagn, relasjon, frosset, predikat). Det finnes
   et regelversjonsnummer og et projeksjonsversjonsnummer, med en CI-vakt som
   krever at de økes ved endring. Før produksjon står de på 23 og 37. Etter
   produksjon skal en regelendring kjøre alle saker med gamle og nye regler og
   rapportere hver sak der utfallet endres. Mutasjonstester (feilinnføringer)
   kjøres i CI.
4. **TS-serveren og Azure SQL.** En egen Node/TS-server (om lag 8 300 linjer), en
   statisk Svelte-frontend og Azure SQL Database. Lesing går rett mot tabellene,
   med radsikkerhet (`SECURITY POLICY` med filter- og blokkpredikater). Prosjekt,
   side og team settes i `SESSION_CONTEXT` fra serverens eget tilgangsoppslag,
   bundet til transaksjonen. Bindende skriving går bare gjennom lagrede prosedyrer
   som krever transaksjonen fra serveren. 57 T-SQL-migrasjoner på om lag 7 700
   linjer, 69 prosedyrer. Datalaget bruker interne deler av Node-driveren for SQL
   Server for å holde en forbindelse gjennom transaksjonen. Testene kjører mot
   SQL Server i Docker, ikke mot Azure SQL. Azure SQL er valgt fordi IT-avdelingen
   drifter den og den kan speiles til Microsoft Fabric for rapportering.
   Innlogging med Catenda OAuth og Entra ID.
5. **Jobbtabell og levering.** Leveringsoppdraget, med det frosne innholdet og en
   hash, skrives i samme transaksjon som hendelsen. En jobbtabell med lease
   (`READPAST, UPDLOCK`), eksponentiell backoff og parkering av usikre eller
   avviste utfall. Hvert steg avstemmes mot Catenda før det utføres, så et nytt
   forsøk ikke lager et nytt dokument. Den genererte PDF-en lagres før opplasting
   og gjenbrukes. Løkka går i serverprosessen og krever en instans som alltid
   kjører. Et brev regnes som sendt når det er lagret; leveringen kommer etter.
6. **Catenda som kanal og arkiv.** Catenda er prosjekthotellet partene allerede
   bruker. Hver sak blir en BCF-topic. Hvert brev blir en PDF i
   dokumentbiblioteket, med en dokumentreferanse fra topicen, og revideres aldri.
   En webhook med varig innboks tar imot nye topics. Brevene, den frosne teksten
   og PDF-bytene ligger også i egen base. Vedleggene ligger bare i Catenda: appen
   lagrer hash og ID og sletter sin kopi når Catenda har kvittert. Hva Catenda
   garanterer av bevaring, er ikke kontrollert, og bevaringskravene er ikke
   avgjort.

Dagens tilstand: en eldre Python/Flask-backend på om lag 45 000 linjer brukes
fortsatt av frontenden for sakslisten, endringsordre og forsering. Det er vedtatt
at den skal ut, og at TS-serveren tar over alt.

## Min vurdering

Kravene jeg måler mot:

- K1 Bevis: det som ble sagt, kan legges fram uendret år etter.
- K2 Frister: tidspunktet et varsel kom fram, avgjør om kravet er i behold. Appen
  viser grunnlaget, men avgjør ikke.
- K3 Parter og team: skjerming per team.
- K4 Lavt volum, høy vekt: korrekthet og etterprøvbarhet går foran ytelse.
- K5 Lite team: hver mekanisme skal kunne forstås, endres og driftes av få.
- K6 Uavhengig av appen: saken kan leses uten at appen kjører.

Konklusjonen: **målbildet passer domenet, og ingen byggekloss bør byttes.** Per
byggekloss:

- **MD-01 Journal:** behold. Den er i praksis en journal av brev, ikke finkornet
  hendelseslogging. En tilstandsmodell med revisjonslogg gjør revisjonsloggen til
  bevis og tilstanden til sannhet, som er feil vei for K1. Event store-produkter
  gir ingenting ved dette volumet.
- **MD-02 Tekst mot utledning:** den juridiske vekten ligger i teksten, og
  tekstkjeden er prøvd: PDF-teksten leses tilbake og sammenliknes ordrett, med
  mutasjonstester. Utledningen er rådgivende. Ikke utvid utledningen før første
  ekte sak.
- **MD-03 Lagringsform:** behold. Normaliserte tabeller per utsagn ville gitt en
  migrasjon for hver endring i modellen, som endres nesten daglig. En
  dokumentdatabase gir ingenting Azure SQL ikke har.
- **MD-04 Kjernen:** behold, fordi prinsipp 6 krever den i nettleseren. Men
  versjonsnumrene endres ofte, og etter produksjon utløser hver regelendring en
  omregning og en rapport. Det trengs en praksis for å samle regelendringer i
  utgivelser. Hvitelisten kan forenkles når modellen har satt seg.
- **MD-05 Server og Azure SQL:** behold. Radsikkerheten i databasen passer fordi
  prosjektgrensen er brutt flere ganger i den eldre koden. Kostnaden er at
  tilgangsreglene står både i TS og T-SQL, og at datalaget er avhengig av
  driverens interne deler. Azure Database for PostgreSQL ville vært enklere, men
  et bytte koster mer enn det gir, og Azure SQL er valgt for drift og Fabric.
  Hold prosedyrene til bindende skriving.
- **MD-06 Levering:** behold jobbtabellen. En kø-tjeneste ville krevd en utboks i
  basen likevel. Men en levering som er parkert, vises for avsenderen som «ikke
  levert ennå», likt en som er underveis, og driften varsles ikke. Siden utsagn
  binder fra de er kommet fram, er det et kontraktsforhold.
- **MD-07 Catenda:** god kanal, uavklart arkiv. Vedleggene finnes bare i Catenda,
  og en hash beviser at en fil er uendret, ikke at den finnes. En uforanderlig
  kopi i Azure Blob Storage er billig, men krever at vedtaket om å slette kopien
  ses på nytt. Bør avgjøres før første ekte sak.
- **MD-08 Størrelse:** målet (om lag 22 000 linjer produksjonskode) er rimelig.
  Det er overgangen med Python ved siden av som gjør flaten for stor for et lite
  team.
- **MD-09 Null-alternativet:** strukturerte brevmaler levert til Catenda, uten
  regler og utledning, oppfyller K1, K3 og K6 og er enklest. Det taper
  forhåndsvisningen av hva et svar betyr, og bindingen av hvert svar til én
  kravversjon. Det er referansen hver regel skal forsvares mot.

## Det jeg ber om

Svar på norsk bokmål, i denne rekkefølgen:

1. **De tre største svakhetene i vurderingen**, rangert. For hver: hva jeg
   antar, hvorfor det kanskje ikke holder, og hva som ville vise at jeg tar feil.
2. **Per byggekloss (MD-01 til MD-07):** er det et alternativ jeg ikke har
   vurdert, eller har avvist for lett? Er det en risiko jeg ikke har nevnt? Si
   «ingen innvending» der du ikke har noen.
3. **Forenkling:** hvis du skulle fjerne én mekanisme for at et lite team skal
   klare å drifte dette, hvilken, og hva ville det koste i forhold til K1–K6?
4. **Domenet:** er det noe ved forløpene i NS 8407 (varsler, svarfrister,
   endringsordre, forsering, sluttoppgjør) som arkitekturen ikke tar høyde for?
   Vis til paragrafnummer og forklar med egne ord. Ikke siter standarden.
5. **Det du er usikker på:** skill mellom det du vet, det du antar, og det som
   avhenger av fakta du ikke har.

Ikke foreslå å endre prinsippene uten å si uttrykkelig at det er det du gjør, og
hva som går tapt.
