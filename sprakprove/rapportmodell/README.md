# Metodeprøve av rapportmodellen i #554

Historisk prøve mot commit `366988d4103e60144debdbde709221413c88febe`.
Checkout og sporede filer var uendret ved start. Alle nye filer ligger isolert
i denne mappen. Ingen domenekjerne, skrivesti, produksjonsskjema eller GitHub-data
er endret. Prøven er et lokalt beslutningsgrunnlag, ikke produksjonsrapportering.

Kjør fra repoets rot med de eksisterende avhengighetene:

```bash
node sprakprove/rapportmodell/kjoer.ts
npx tsc -p sprakprove/rapportmodell/tsconfig.json
npx vitest run --project=node sprakprove/rapportmodell/projektor.test.ts kjerne/tester/kjerne.test.ts kjerne/tester/brevtekst.test.ts --reporter=dot
npx vitest run --project=server server/tester/sakslinje.test.ts --reporter=dot
node sprakprove/rapportmodell/feilproeve.ts
```

Kjøringen skriver de syntetiske resultatfilene på nytt; dette er gjentakbare
prøveutgivelser med faste ID-er og datoer. Innen én kjøring fryses R1 **før F**,
og alle R1-filene leses og hashkontrolleres igjen etter I.
Brukt verktøykjede: Node 24.19.0, TypeScript 5.9.3, Vitest 3.2.4 (faktisk
installerte versjoner, ikke de deklarerte versjonsintervallene i package.json).
Kjernen bruker format/leserformat 1, regelversjon 24 og projeksjonsversjon 39.
Prøveprojektor og måleregler heter `prove-1`.

## Resultat og kilder

[Lesbare tabeller](resultat/tabeller.md) viser samtlige 10 saksversjoner i
hovedsaken, kontrollsakens 3 versjoner, kilde-ID-er, brevtekst, målinger og
porteføljeutvikling. [Trinnoversikten](resultat/trinn.json) inneholder de faktiske
kommandoene og event-ID-ene; CSV finnes ved siden av. Alle 13 kommandoer i de to
sakene og alle 10 i kontrollvarianten ble godtatt. Ingen dokumentrad er
håndskrevet. Saksopprettelsen bruker `opprettelse`, og prøvebanen stempler
hendelseskonvolutten som en server ville gjort. Resten bruker
`kommandoFor`, `forhaandsvis` og `vurder`. `radFor` brukes aldri.

| Kontrollpunkt | Hovedsak/kontroll | Kravsum    | Virksom enighet i vederlag |
| ------------- | ----------------- | ---------- | -------------------------- |
| C, før svar   | 5/3               | 350 000 kr | Ingen                      |
| E / R1        | 6/3               | 350 000 kr | Ingen                      |
| I / R2        | 10/3              | 350 000 kr | 120 000 kr                 |

De 350 000 er 150 000 i `svikt/grunnforhold` og 200 000 i
`svikt/prosjektering`. De erstattede 100 000 telles ikke. Summen bruker samme
avgrensning av stående krav som `server/saksliste.ts`: gjeldende krav som ikke
er trukket, i saker uten godtatt grunnlagsavslag eller trukket grunnlag.
Enigheten på 120 000 trekkes ikke fra kravsummen og overskriver ikke kravet.
Dette er ikke et mål på restkrav eller økonomisk eksponering. Ved R1 er BHs
120 000 subsidiært; ved R2 er beløpet ikke lenger subsidiært til grunnlaget.
Kravsum, BHs subsidiære tall og betinget/virksom enighet har egne felter.
Fristdager summeres aldri på tvers av saker.

## Presise domeneforventninger og observerte virkninger

Vedtakene finnes i [hovedplanen](../../docs/plans/2026-09-16-godkjenning-og-varig-levering.md).
Dette er anvendelse av eksisterende vedtak på syntetiske premisser:

| Valg / trinn | Forventning og kilde                                                                                                                                                                                                                 | Observasjon                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A            | VS-U26, setningene om svikt: TE oppgir dato for kjennskap; grunnlagskravet er ikke et frist-/vederlagsvarsel. GR-U22: kategoriparet står.                                                                                            | `svikt/grunnforhold`, kjennskap 15.09, kjent fra versjon 2.                                                                                                           |
| D, grunnlag  | BH avslår ansvaret. Ingen § 32.2-vurdering legges inn i svikt.                                                                                                                                                                       | Avslag, ingen enighet om grunnlaget.                                                                                                                                  |
| D, vederlag  | BH påberoper ikke sen varsling etter § 34.1.2, aksepterer tilbudets beregningsmåte og vurderer 120 000. Dette er uttrykkelige partsvalg, ikke en fastslått rettidighet. GR-U7 og MM-U28 skiller ansvar, subsidiært beløp og enighet. | 120 000 subsidiært til avslått grunnlag, mot krav 150 000.                                                                                                            |
| D, frist     | BH påberoper sen varsling etter § 33.4 om det første fristkravet appen kjenner, godtar hindring, påberoper ikke sen spesifisering og vurderer 10 av 20 dager. VS-U3: virkningen utledes på partens premisser.                        | Prinsipalt fristavslag i sporet, subsidiært 10 dager; hele svaret er dessuten subsidiært til grunnlaget.                                                              |
| F            | OV-U5, avsnittet «Et svar byggherren alt har gitt, står …»: verken endret svar, ny vurdering av det senere oppgitte varselet eller sperret aksept.                                                                                   | Varseldato 18.09 blir først kjent ved versjon 7. Svaret gjelder fortsatt elementet i brev 4. `gjaldtEtAnnetVarsel` får en kildehenvisning.                            |
| G            | GR-U7, de første tre setningene: enighet gjelder sporets spørsmål, også varsling, ikke ansvaret. KA-U10 og HF-U9, setningene om godtatt avslag/preklusjon: aksepten gjelder svaret slik det står.                                    | Vederlag: 120 000 betinget ved versjon 8. Frist: **0 dager betinget** ved versjon 9, med 10 fortsatt som subsidiært BH-standpunkt. Grunnlagsavslaget er ikke godtatt. |
| H            | GR-U7: enigheten får virkning når grunnlaget avklares. MM-U9/MM-U11: brevene og standpunktene står; utfallet utledes.                                                                                                                | Grunnlaget godkjennes ved sammenfall. 120 000 og 0 dager blir virksom enighet. Ingen nye vederlags- eller fristsvar er laget.                                         |

Det er dermed ikke grunnlag for å forvente virksom enighet om 10 dager i
hovedprøven. Akseptens genererte tekst sier «enig i antallet dager», men
aksepten viser til hele svaret, som også påberoper sen varsling. Tallet 10 i
BHs subsidiære vurdering er atskilt fra enighetens utledede 0 dager.
Dette følger særlig HF-U9s setning om aksept av preklusjon sammenholdt med
OV-U5 og KA-U10; det følger ikke av en ny regel i prøveprojektoren.

[Kontrollvarianten](resultat/alternativ.json) kjører hele A–I med ett endret
partsvalg ved D: `varsel_i_tide=true` om det første appkjente fristvarselet.
Alle andre valg, også F, G og H, er de samme. Forventningen etter GR-U7 og
HF-U9 er da enighet om 10 dager, betinget ved G og virksom ved H. Dette er
observert. Varianten er ikke en etterfølgende endring av hovedprøvens brev,
og den erklærer ikke eksterne varsler rettidige.

Eksisterende belegg som også er kjørt:
[OV-U5/KA-20-testene](../../kjerne/tester/kjerne.test.ts#L1059) og
[GR-U7-testen av aksepttekst](../../kjerne/tester/brevtekst.test.ts#L1343).
De prøver henholdsvis at et svar står etter sen registrering, og at aksept
av subsidiært svar ikke er aksept av grunnlagsavslag. Hovedplanens merknad
15.10 til FK om PR #495 dokumenterer implementert OV-U5/KK-08; eldre
«Ikke bygget» i vedtaksraden er ikke brukt som byggestatus. MM-U28/MM-U29 har
implementasjon i dagens `server/saksliste.ts`, som er avstemt i prøven.
HF-U3s rapporttabeller er fortsatt forslag; denne prøven vedtar dem ikke.

Et avgrenset gap i brevformen er synlig ved F: OV-U5 sier «TE oppgir datoen
i et brev fra appen, med varselet som vedlegg». Dagens `varsel`-kommando i
`kjerne/kommandoer/skriving.ts` produserer et dokument med varselutsagn,
sendt-opplysning og vedlegg, **uten `brevtekst`**. Opplysningen uten `gjelder`
gjør at `erRegistrert` i `kjerne/format/leser.ts` leser det som registrert
korrespondanse, og `brevtekstFor` lager ingen apptekst. Utledningen og
registreringsversjonen er prøvd; full gjennomføring av OV-U5s appbrev er
ikke bevist. Prøven bevarer kommandoutdataene og lager ingen erstatningstekst.
Dette gapet avgrenses her og rettes ikke som sidearbeid.

## Tidsmål og historikk

Alle fire mål er **prøvekonvensjoner**, med full regeltekst i
`R1/rapport.json` og `R2/rapport.json` under `maaleregel`. Kalenderdager er
forskjellen mellom UTC-kalenderdatoene. Ingen timer eller rettslig frist
beregnes. En åpen måling har `dager=null`, med separat `observerte_dager` ved
prefiksets siste syntetiske registrering. Registrering beviser ikke levering
eller mottak. Datokilder har felt, betydning, presisjon, oppgiver, element/brev
og første kjente saksversjon. Det finnes ingen skjult datofallback.

| Mål i hovedsaken                            | R1                                            | R2                                                    |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Svartid på vederlagskrav 100 000            | Ubesvart, erstattet; ingen svartid            | Samme                                                 |
| Svartid på kravversjon 150 000              | 23.–26.09: 3 kalenderdager                    | Samme                                                 |
| Ventetid fra første ubesvarte vederlagskrav | 21.–26.09: 5 dager                            | Samme                                                 |
| Tid uavklart, vederlag                      | Åpent, 5 observerte dager                     | 21.09–02.10: 11 dager                                 |
| Kjennskap til relevant appkjent fristvarsel | 15.–22.09: 7 dager, partsdato til apphandling | 15.–18.09: 3 dager, to partsdatoer, kjent først ved F |

Det siste målet velger uttrykkelig første fristkrav før et eksternt varsel er
oppgitt, i tråd med hva OV-U5 sier appen kjenner. Etter F velger målet TEs
oppgitte eksterne varsel. Målet endrer ikke hva BHs tidligere svar gjaldt.
Vi måler ikke vederlagsvarsling med fristvarselet.

`maalt_forloep` har stabil `forloep_id` og historiske rader med
`kjent_fra_versjon` inklusive / `kjent_til_versjon` eksklusive. Endret
datagrunnlag eller tilstand gir ny rad. Et oppslag ved versjon 6 viser
fortsatt 7 dager etter at versjon 7 finnes. En tidligere frosset rapport
beholder også sin daværende åpne kjent-til-grense.
[Moteksemplet til én enkel rad](resultat/enkel-modell-moteksempel.json)
viser at en oppdatert rad med bare start-/sluttversjon enten lekker de
senere 3 dagene inn ved E, eller utelater hele målingen ved E. Formen har
ikke bevart det tidligere grunnlaget på 7 dager.

## Filer, frysing og avstemming

- [R1](resultat/R1/rapport.json), [manifest](resultat/R1/manifest.json) og
  [grunnlag](resultat/R1/grunnlag.json): hovedsak 6, kontrollsak 3, måledato 26.09.
- [R2](resultat/R2/rapport.json), [manifest](resultat/R2/manifest.json) og
  [grunnlag](resultat/R2/grunnlag.json): hovedsak 10, uendret kontrollsak 3, måledato 02.10.
- Hver rapport har egne CSV-er for `sak`, `brev`, `element`, typede `krav`,
  `svar`, `standpunkt`, `utsagn`, `opplysning`, `brevavsnitt`,
  `vedleggsbinding`, `sporhistorikk`, `maalt_forloep`, `maaleregel` og `portefolje`.
  Eksempel: [krav.csv](resultat/R2/krav.csv), [sporhistorikk.csv](resultat/R2/sporhistorikk.csv).
- [Utgitt rapport](resultat/utgitt_rapport.json) samler manifestene med
  filtre, versjoner, kodehasher, måleregler, begrensninger og hasher av resultat
  og grunnlag. Vedleggets syntetiske UTF-8-innhold og hash er med i R2s grunnlag.
- [Kontroller](resultat/kontroller.json) viser uendret R1-mappe ved E/I,
  lik rekonstruksjon av R1 fra samme prefiks og identisk R2/aktuell rekonstruksjon.
  [Porteføljehistorikk](resultat/portefoljehistorikk.json) bruker historikken,
  med kontrollsakens faktisk kjente prefiks ved hvert tidspunkt.

JSON/CSV viser forslag til analytiske felter; sammensatte referanser og
frosne grunnlag beholdes som JSON-celler i CSV. Nullpolitikken er et uttrykkelig
prøveforslag, ikke en avklart fysisk kontrakt. Tallene 0 og ukjent holdes atskilt.
Siste tilstand er avstemt mot eksisterende `sakslinje` og `noekkeltall`.
Dette er samsvar med samme kjerne, ikke uavhengig juridisk verifikasjon.

Kjørte kontroller: 10 egne tester og 362 tester i de to kjernetestfilene,
samt 13 eksisterende tester for sakslinje/nøkkeltall: **385 bestått**.
Typesjekken av prøven er grønn. [To isolerte feilinnføringer](resultat/feilproever.json)
ble oppdaget ved målassertionene: 450 000 mot forventet 350 000 ved
dobbelttelling, og 3 mot forventet 7 dager ved historisk datolekkasje.
Den uendrede kontrollkopiens 10 tester passerer. Domenekoden ble aldri mutert.

Første forsøk med repoets dokumenterte `--reporter=agent` stoppet før tester
fordi reporterpakken ikke finnes i den installerte verktøykjeden. Kommandoene
over bruker innebygd `dot`. Et første oppstartsforsøk på prøvekoden brukte en
TS-parameter-property som Node ikke stripper; den er erstattet med vanlige
felt. Dette var oppsettsfeil, ikke avviste domenetrinn.

Prøven beviser ikke Azure SQL, RLS, fysisk lagring i appen, reell levering,
mottak eller Fabric. Ren minnebane erstatter ikke serverens kontrakter.
Regelbytte, frafall, nye grunnlagsversjoner, overføring, bestridelse og
§ 33.6.2 er ikke prøvd. Frafall må fortsatt kunne avklare grunnlaget etter
GR-U7/GR-U23; projektoren innfører ingen kontroll av `grunnlag_status=godkjent`.
MM-U16 er begrunnelsen for versjonsmerking, ikke en testet regelendring her.

## Hva et senere rapportskjema må kunne uttrykke

Dette er forslag avdekket av prøven, ingen migrasjon eller nye produktvedtak:

1. Kravets originale tall, BHs tall og enighetens utfall/virkning må ha egne
   felter og enheter. Beløp og dager kan ikke dele en umerket verdikolonne.
   Tilstand og kilde må skille fravær, ukjent og faktisk 0.
2. Elementer, også standpunkter og opplysninger, trenger brevankre og bevarte
   `gjelder`, `erstatter` og `grunnlagskrav`. Frosne virkninger må kunne ses
   atskilt fra aktuell subsidiaritet. Vedleggsreferanser binder ID, filnavn og hash.
3. Sporhistorikk trenger sak/spor/faktisk versjon/**beregningssett** som nøkkel.
   Målehistorikk trenger stabil forløpsidentitet, kjente versjonsintervaller,
   versjonert regel og eksplisitte datokilder. Én sluttversjon er utilstrekkelig.
4. Utgitte rapporter trenger frosset resultat **og** datagrunnlag, med manifest
   og integritetskontroll. Nye beregninger må kunne leve ved siden av tidligere
   utgivelser. Utvikling krever historiske rader i perioden, ikke bare siste sakslinje.

To åpne produktspørsmål til eventuell senere bygging:

1. Skal et offisielt varslingstidsmål bruke første appkjente varsel, første
   partsoppgitte eksterne varsel eller flere parallelle mål? Prøven viser begge
   grunnlag over tid uten å fastslå faktisk sending.
2. Skal «tid uavklart» offisielt slutte ved virksom enighet, eller skal det
   finnes egne mål for besvart, enighet om tall og avklart ansvar? Prøven velger
   virksom enighet og viser de andre tilstandene separat.

Ansvar og formål: engangsbevis for oppdragsgiver i #554. Dette er ikke et
vedlikeholdt rapportprodukt eller en mal for produksjonens tabellnavn.
