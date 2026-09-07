# ADR-001: Varsling er uavhengig av valgt kontraktsforhold

- **Dato:** 2026-09-07
- **Status:** Vedtatt
- **Område:** Juridisk begrunnet produktvalg – NS 8407, TE-varsling

## Problem

TE kan kjenne forholdet og forvente merkostnader eller forsinkelse før riktig
kontraktsmessig kategori og omfang er avklart. For eksempel kan manglende
tegningsunderlag først kategoriseres som endring og senere vurderes som svikt
i BHs ytelser. En kategori kan også være omtvistet eller valgt feil.

Hvis appen skjuler eller avviser varsler basert på kategorien, kan et slikt
valg hindre TE i å varsle. En automatisk kategoriendring må heller ikke fjerne
varsler brukeren allerede har valgt. Den første implementeringen skjulte og
avviste vederlagsvarsler ved force majeure; denne ADR-en dokumenterer hvorfor
den sperren fjernes.

## Kontraktsgrunnlag

Referanse: [NS 8407 i prosjektet](../NS_8407.md). Punktene nedenfor er et
sammendrag av standardteksten, ikke en vurdering av et konkret krav.

| Punkt | Relevant skille |
| --- | --- |
| 5 | Varsler skal meddeles skriftlig til partenes representanter eller avtalte adresser. |
| 32.2 | TE skal varsle dersom et pålegg påberopes som en endring. |
| 34.1.1 | Endringer etter 31 eller 32 gir grunnlag for vederlagsjustering; punktet har ikke samme særskilte varslingsregel som 34.1.2. |
| 34.1.2 | Ved svikt i BHs ytelser mv. må TE varsle krav om vederlagsjustering uten ugrunnet opphold; bestemmelsen knytter rettighetstap til manglende rettidig varsel. |
| 34.1.3 | Økte utgifter til kapitalytelser, rigg/drift og produktivitet/forstyrrelser omfattes av særskilte varslingskrav. |
| 33.3 | Fristforlengelse etter force majeure-bestemmelsen gir ikke i seg selv rett til vederlagsjustering. |
| 33.4 og 33.6 | Fristkrav skal varsles selv om antall dager ikke kan spesifiseres; spesifisering må følges opp når beregningsgrunnlaget foreligger. |
| 33.7 | Svarplikten etter dette punktet gjelder begrunnet fristkrav med antall dager. |

## Vurdering

Kategorien er partens foreløpige vurdering. Vi behandler den ikke som en
endelig juridisk klassifisering eller som grunnlag for å avgjøre om et varsel
kan sendes. Å tillate et varsel innebærer ikke at appen bekrefter materiell
rett til kravet, at varselet er tilstrekkelig eller at det er sendt i tide.

Et uttrykkelig vederlagsvarsel også ved kategorien «Endringer» reduserer
risikoen ved at forholdet senere vurderes etter 34.1.2. Det generelle varselet
bør derfor ikke automatisk avgrenses til 34.1.1 eller 34.1.2 ut fra et menyvalg.

Ved force majeure skal appen forklare begrensningen i 33.3. TE må likevel
kunne varsle dersom de mener det finnes et annet eller alternativt grunnlag
for vederlagsjustering for det beskrevne forholdet.

## Beslutning

1. Alle fire varsler er tilgjengelige ved innsending av grunnlaget, uavhengig
   av valgt kontraktsforhold: vederlag, særskilt rigg/drift, særskilt
   produktivitet/forstyrrelser og frist.
2. Valgene er uavhengige og ikke forhåndsavkrysset. Generelt vederlagsvarsel
   medfører ikke automatisk særskilte varsler. Uavkrysset betyr bare at
   varselet ikke inngår i denne innsendingen, ikke at kravet er frafalt.
3. Kategorien kan styre hjelpetekst, men ikke skjule, fjerne eller blokkere
   valgte varsler. Force majeure viser en merknad uten ekstra bekreftelseskrav.
4. Det generelle vederlagsvarselet viser til pkt. 34.1 og identifiserer det
   beskrevne forholdet og TEs hensikt om å kreve justering. Rigg/drift og
   produktivitet beholder særskilte erklæringer etter 34.1.3; frist viser til 33.4.
5. Varsling krever ikke beløp eller dager. Spesifisering skjer i egne skjema,
   og TE kan også varsle senere uten å vente på BHs svar på grunnlaget.
6. Grunnlag og valgte varsler lagres i samme hendelse. Hvert varsel får
   dokumentert tekst, hendelsesreferanse og tidspunkt på sitt spor. Senere
   spesifisering erstatter ikke opprinnelig varseltekst eller varseldato.
7. Rene varsler skal vises som «Varslet – ikke spesifisert» og ikke som
   tallfestede krav på null. BH skal ikke tildeles en beregningsoppgave som om
   et spesifisert krav forelå. Dette avgjør ikke øvrige varslings- eller
   innsigelsesplikter, herunder innsigelse om for sen varsling etter pkt. 5.

## Alternativer og konsekvenser

- **Filtrere etter kategori:** Gir færre valg, men kan hindre varsling på grunn
  av en feil eller omtvistet klassifisering. Forkastet.
- **Automatisk varsle alt:** Reduserer antall klikk, men sender erklæringer TE
  ikke aktivt har valgt. Forkastet.
- **Kreve separate innsendinger eller ferdige beregninger:** Øker terskelen
  for tidlig varsling. Separate skjema beholdes for senere oppfølging.

Alle varsler kan dermed sendes også når BH vil bestride grunnlaget. Appen
bevarer partenes erklæringer; realitetsvurderingen skjer i saksbehandlingen.
Registrert tidspunkt er hendelsens tidspunkt i systemet, ikke selvstendig
bevis for at korrekt mottaker har mottatt varselet. Faktisk oversendelse følger
integrasjonen og prosjektets avtalte kommunikasjonskanal.

Dette endrer ikke reglene for omkategorisering av et allerede innsendt
ansvarsgrunnlag. Eksisterende hendelser og deres paragrafhenvisninger skrives
ikke om. Prosjektspesifikke kontraktsavvik må vurderes særskilt; denne ADR-en
bygger på referanseteksten og er ikke en erklæring om juridisk kvalitetssikring.

## Implementering og kontroll

- [Varseltekst og valg](../../src/lib/domain/konsekvensVarsler.ts)
- [Felles varselkomponent](../../src/lib/components/kontraktsbord/KonsekvensVarsler.svelte)
- [Backend-regler](../../backend/services/business_rules.py)
- [Projisering og historikk](../../backend/services/timeline_service.py)
- [Tekst- og kategoritester](../../src/lib/domain/__tests__/konsekvensVarsler.test.ts)
- [Backendtester](../../backend/tests/test_services/test_konsekvensvarsler.py)

Regresjonskontrollen skal dekke at kategoribytte beholder valgte varsler og
forklaringer, at force majeure tillater både samlet og senere varsling,
og at generelt vederlagsvarsel ikke får en automatisk snevrere hjemmel.
Beslutningen vurderes på nytt ved relevante kontraktsavvik, endret rettslig
grunnlag eller endringer i hvordan erklæringer sendes og mottas.
