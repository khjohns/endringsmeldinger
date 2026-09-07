# Kontraktsbordet som hovedgrensesnitt

Den tidligere `/mockup`-visningen er nå saksgrensesnittet på
`/[prosjektId]/[sakId]`. Ansvarsgrunnlag, vederlag, frist og skjemaene deres vises
i samme kontrollrom. De har ikke egne sideimplementasjoner.

URL-parametrene `spor=ansvar|vederlag|frist`, `mode=form` og `rolle=BH|TE`
gjør at en visning kan åpnes direkte og gjenopprettes ved oppfriskning.
Utelatt `mode` betyr lesevisning. De tidligere skjemarutene omdirigerer til
den tilsvarende visningen i kontrollrommet. Ny sak bruker samme nye skjema
på `/<prosjektId>/ny`.

## Kode og datakilder

- `src/lib/components/kontraktsbord/`: det felles grensesnittet, flyttet fra
  `src/lib/mockup/`. Både hovedruten og scenarioverkstedet bruker disse komponentene.
- `src/lib/kontraktsbord/`: sakskontekst, URL-tilstand og innsending/kladdhjelpere.
- `src/lib/mockup/`: scenarioer og en demostore som opprettes per montering.
- `src/lib/queries/`: prosjektavgrensede API-spørringer. Ordinære ruter returnerer
  ikke lenger eksempeldata når backend mangler eller feiler.

`/mockup` er fortsatt et selvstendig scenarioverksted uten API-innsending.
Scenariovelgeren og nullstilling vises bare der. Hver sak får en egen kontekst;
komponentene importerer ikke en global sakstore.

## Lagring

De seks TE/BH-skjemaene bruker domenets eventbyggere og eksisterende events-API.
Live-konteksten oppgir prosjekt og forventet saksversjon, og henter saken på nytt
etter bekreftet lagring. En åpen redigering beholder versjonen den startet fra,
slik at bakgrunnsoppdateringer ikke skjuler versjonskonflikter. Mislykket innsending
beholder skjemaet og viser feilen. Hvis lagring lykkes, men oppdatering av visningen
feiler, blokkeres ny innsending inntil saken er hentet på nytt.

Skjemakladder lagres lokalt med prosjekt, sak, rolle, vurdering og kravrevisjon i
nøkkelen. De fjernes etter vellykket innsending. Ny sak opprettes i to API-kall;
etter bekreftet saksopprettelse beholdes ID og versjon i kladden dersom opprettelse
av ansvarsgrunnlaget feiler.

Tilbaketrekking sendes som event og bekreftes av backend før dialogen lukkes.
Intern godkjenning er ikke del av denne overgangen; BH-svar publiseres direkte
gjennom dagens respons-eventer.

## Varsler sammen med grunnlaget

Ny sak tilbyr fire uavhengige, valgfrie varsler: vederlagsjustering, særskilt
rigg/drift, særskilt produktivitetstap og fristforlengelse. Avkrysningene er tomme
som standard. Den faktiske varselteksten forhåndsvises og lagres i `varsler` på
`grunnlag_opprettet`, slik at grunnlaget og alle valgte varsler lagres og sendes
som én hendelse. Uavkrysset betyr bare ikke varslet i denne innsendingen.
Alle fire varsler er tilgjengelige uavhengig av kategori. Force majeure viser
veiledning om pkt. 33.3, men sperrer ikke varsling. Kategoribytte beholder valgene.
Begrunnelsen er dokumentert i [ADR-001](adr/001-varsling-og-kontraktsforhold.md).

Backend projiserer hvert varsel til riktig spor med tekst, hendelses-ID og
serverens tidsstempel. Opprinnelige varseldatoer beholdes ved senere
spesifisering. Varseltekstene følger også saks-PDF, hendelsesbrev og
Catenda-kommentar. Eksisterende integrasjon bestemmer om innsendingen kan
synkroniseres til Catenda.

Vederlagsskjemaet støtter senere ren varsling via `vederlag_krav_sendt` med
`varsel_type: "varsel"` og uten metode/beløp. Disse hendelsene endrer ikke et
allerede spesifisert krav eller kravets revisjonsnummer. Beregningshistorikk og
referanser til BH-svar skiller dem derfor fra spesifiserte krav. Fristsporet
bruker eksisterende varsling/spesifisering. Spor uten spesifisering viser
«Varslet – ikke spesifisert», og TE kan gå videre uten å vente på BHs svar.

## Registrerte mangler etter migreringen

Migreringen er gjennomført, men løsningen er fortsatt en prototype. At en knapp
vises, betyr ikke at handlingen er implementert. Følgende mangler ble registrert
ved kodegjennomgangen 5. september 2026:

| Område | Mangel i grensesnittet | API-status og videre arbeid |
| --- | --- | --- |
| TE godtar BH-svar | «Godta svar», «Bekreft enighet» og «Aksepter byggherrens standpunkt» i `ActionBar.svelte` mangler klikkhandling. | Backend støtter allerede `te_aksepterer_respons`. Koble knappene til innsending, feilhåndtering og oppdatering av saken. |
| Vedlegg | Filvisningen bruker fortsatt demomodellen. «Last opp nytt vedlegg» i sidepanelet gjør ingenting. Opplastingsfeltet er skjult ved opprettelse av en live-sak. | Catenda-dokumenthåndtering finnes, men gjennomgangen identifiserte ikke et dedikert frontend-endepunkt for denne opplastingsflyten. Avklar API-kontrakten for opplasting, listing og åpning av vedlegg. |
| Interne notater | «Nytt notat» gjør ingenting. Notatvisningen bruker scenariodata. | Ingen ferdig notat-API ble funnet i de gjennomgåtte rutene. Lagring og backend-håndhevet synlighet må avklares før funksjonen kobles på. |
| Kladder | Skjemaene lagres lokalt, men kladdindikatorene i oversikten er ikke koblet til denne lagringen. | Ingen serverlagring er koblet på. Kladder følger ikke brukeren mellom enheter. Koble først oversiktsindikatorene til faktisk lokal kladdstatus. |
| Innlogging og roller | Rollevelgeren og aktøridentiteten følger utviklingsoppsettet. Frontend mangler en ferdig innloggingsflyt. | Backend har autentisering og prosjekttilgang. Frontend må kobles til dette og til en endelig rollemodell. |
| Brev/PDF | Nedlasting bruker direkte `fetch`, og feil skjules. Endringer i brevredigeringen lagres ikke varig. | `/api/letter/generate` finnes. Avklar felles API-håndtering for PDF-nedlasting, vis feil, og avklar om redigerte brev skal lagres. |

Relevante kodepunkter:

- [ActionBar.svelte](../src/lib/components/kontraktsbord/ActionBar.svelte): TE-aksept.
- [RightSidebar.svelte](../src/lib/components/kontraktsbord/RightSidebar.svelte): vedlegg og notater.
- [submission.svelte.ts](../src/lib/kontraktsbord/submission.svelte.ts) og
  [context.svelte.ts](../src/lib/kontraktsbord/context.svelte.ts): lokal kladdlagring og separat oversiktstilstand.
- [LetterPreviewModal.svelte](../src/lib/components/kontraktsbord/LetterPreviewModal.svelte): PDF-nedlasting og lokal brevredigering.
- [NewCaseForm.svelte](../src/lib/components/kontraktsbord/NewCaseForm.svelte): saksopprettelse i to kall.

### Saksopprettelse og nettverksbrudd

Ny sak opprettes gjennom separate `sak_opprettet`- og `grunnlag_opprettet`-eventer.
Dette er ikke en atomisk operasjon. Etter bekreftet saksopprettelse beholdes ID og
versjon ved feil i andre kall, men nettverksbrudd etter serverlagring og før klienten
mottar bekreftelsen er ikke ferdig håndtert. Undersøk gjenopptakelse og idempotens,
slik at et nytt forsøk ikke oppretter en ekstra sak eller gjentar en lagret handling.

## Videre arbeid og verifisering

Anbefalt funksjonsrekkefølge er TE-aksept og kladdindikatorer først, deretter
vedlegg og synlig PDF-feilhåndtering. Intern godkjenning er bevisst utsatt og
skal ikke innføres som del av denne oppryddingen.

Ordinære ruter trenger en tilgjengelig backend med gyldig tilgang eller prosjektets
eksisterende lokale testoppsett. `/mockup` fungerer fortsatt uten backend.
Backend var ikke tilgjengelig lokalt under migreringen; reell innsending ble derfor
ikke verifisert ende til ende. Automatiske tester dekker deler av integrasjonen,
men dokumenterer ikke at hele arbeidsflyten fungerer mot en kjørende backend.

Kontroller koden med `npm run check:error`, `npm test` og `npm run build`.
Før videre funksjonsutvidelse bør grunnlag–vederlag–frist-flyten prøves mot backend,
inkludert oppfriskning etter lagring, revisjoner, tilbaketrekking, versjonskonflikter
og nettverksbrudd ved saksopprettelse.

Prosjektoversikten og showcase beholder foreløpig sitt eksisterende utseende.
Gamle, ikke-rutede UI-komponenter kan ryddes bort i en separat gjennomgang;
de brukes ikke som alternative sakssider.
