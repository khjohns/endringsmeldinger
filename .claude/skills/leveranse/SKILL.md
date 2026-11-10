---
name: leveranse
description: Leveranseprosedyren for implementering og refaktorering, med reglene for review og stoppregelen for funn. Brukes når en kodeoppgave starter, før akseptkriteriene skrives, og igjen før en PR meldes klar. Rene dokumentendringer bruker bare de relevante kontrollene.
---

# Leveranse og vedlikehold

Hovedplanen bestemmer målarkitektur, beslutninger og rekkefølge. Denne
prosedyren bestemmer hvordan en avgrenset oppgave leveres. Den brukes to ganger:
før kode endres, og før en PR meldes klar.

## Når en endring regnes som vesentlig

To krav har hver sin utløser. Filområdet er et eksempel, ikke utløseren.

- **Feilinnføring** (se `.claude/rules/tester.md`) kreves når endringen gir en
  endret tilgangsavgjørelse, statusovergang, beregningsregel, serialisering
  eller transaksjonsgaranti. Typiske steder, i begge språk, er tilgangslaget,
  serverinngangene, reglene og utledningen i kjernen, hendelsesmodellene og
  lagrene. En
  kommentarendring eller ren flytting der utfallet er det samme, utløser det ikke.
- **Beslutningsansvar** kreves når tiltenkt atferd, en tolkning av NS 8407 eller
  godtatt restrisiko endres. En omstrukturering som beholder atferden, utløser
  det ikke.

## Før kode endres

- Les oppgaven, berørte vedtak i vedtaksfila og aktuelle regler i `.claude/rules/`.
  Bygger oppgaven på en uflettet PR: les den ved en bestemt commit, og oppgi
  avhengigheten i oppgaven eller PR-en. Skill vedtatt retning fra implementert
  atferd. En eldre PR-beskrivelse veier ikke tyngre enn et nyere vedtak.
- Les `.claude/rules/tester.md` **før** akseptkriteriene skrives, også om ingen
  testfil er åpnet ennå. Regelen lastes ellers først når en testfil åpnes.
- Viser issuet til en bestilling fra designsløyfa, er bestillingen akseptkriteriene, og
  et avvik fra den vises som uferdig arbeid eller et nytt valg
  ([brukerforlop](../brukerforlop/SKILL.md#overgangen-til-bygging)).
- Skriv konkrete akseptkriterier i det eksisterende issuet. En liten oppgave uten
  issue får dem i arbeidsplanen, og de tas med i PR-beskrivelsen. Hvert kriterium
  beskriver input eller forløp, forventet resultat eller avvisning, kilden til
  forventningen og testlaget som skal bevise det. «Tester grønne» er ikke nok
  som akseptkriterium.
- Avgjør hvor den berørte domeneregelen eller kontrakten skal eies, og kartlegg
  kallerne og inngangene som berøres. Skriv hva som skal fjernes og hva som må
  bestå. Skal atferden være uendret, skriv hvilke observerbare resultater som
  skal bevares. Ved begrepsendring: følg språkregelen i `AGENTS.md`. Les
  `.claude/rules/dokumentasjon.md` for å avgjøre hva som trenger varig
  dokumentasjon.
- Bygger oppgaven frontend mot TS-kjernen, er brukerforløpet for flyten
  utgangspunktet, ikke den gamle frontenden (oppdragsgiver 30.10, #1065).
  Skriv i akseptkriteriene hvilket forløp og hvilke steg oppgaven bærer. Finnes
  det ikke noe forløp for flyten, skriver du hva brukeren skal kunne gjøre, med
  vedtaket eller issuet som grunn. Reglene hentes fra kjernen og prøves mot
  vedtakene og bevis-sakene, ikke mot den gamle koden.
- Endrer oppgaven visningen, følg [interface-design-skillen](../interface-design/SKILL.md) og
  [systemfila](../../../.interface-design/system.md). Ryddingen og reviewet av visningen
  står i «Review og funn» under.
- Avklar bare uavklart tiltenkt atferd med oppdragsgiver. Tekniske valg innenfor
  oppgaven avgjør du selv. En uløst domenebeslutning blokkerer bare den
  implementeringen den gjelder.
- Utløser endringen beslutningsansvar: oppgi GitHub-brukeren eller den entydig
  ansvarlige rollen som kan godkjenne tiltenkt atferd og godta restrisikoen, i
  oppgaven eller PR-en. Det er et menneskelig ansvar. Modulens tekniske eier eller
  agentrevieweren kan ikke bære det. Gjeldende vedtak og fullmakter gjelder, og
  arbeid som allerede er autorisert, trenger ingen ny godkjenning.

## Under implementering

- Én sammenhengende endring per PR. Skill atferdsendring fra mekanisk flytting
  der det gjør reviewet lettere å etterprøve. Ingen uvedkommende opprydding.
- Legg regelen der den er avtalt å eies, og bare der: én regel har ett hjem i koden,
  ikke en kopi eller en annen form i et annet lag. Ingen ny juridisk slutning i visning,
  brevtekst eller adapter. Felles kode erstatter ikke servervalidering eller
  tilgangskontroll. Nye pakker og abstraksjoner krever et konkret behov i
  oppgaven, ikke hypotetiske framtidige brukere.
- Når en modulgrense etableres eller endres: håndhev de forbudte avhengighetene
  med lint eller en arkitekturtest i CI. Vis at minst ett representativt forbudt
  importforsøk gir feil, og fjern forsøket etterpå. En tekstvakt som bare
  kjenner igjen én stavemåte, er ikke nok. Må kontrollen utsettes, får den et
  issue og omtales som uprøvd, ikke som håndhevet.
- En migrering har én autoritativ skrivesti per kommando. Fjern erstattet kode,
  utdaterte tester og konfigurasjon når de ikke trengs lenger, men behold
  domenebevis og nødvendig bakoverkompatibilitet med historikken (for sakene TS
  tar over, ikke med Python-radene; B-17). Midlertidig
  dobbeltkode eller adapter får et koblet issue med ansvarlig, berørte filer og et
  observerbart fjerningskriterium. «Ryddes senere» holder ikke.
- Oppheves, endres eller snevres et vedtak inn, fjernes koden som bare fantes for
  den gamle regelen: grenen, feilkoden, meldingen, hjelpefunksjonen, feltet i
  `LESBART`, testene og bevis-sakene som bare beviser den, og radene i
  domenetabellen. Bevisene for det som fortsatt gjelder, beholdes. Vakten for
  vedtakshenvisninger finner bare en ID til et opphevet vedtak, ikke kode uten ID
  og ikke et vedtak som er endret. Søk derfor etter atferden, koden og tekstene,
  og skriv i PR-en hvilke søk du gjorde og hva som ble fjernet. Synlig tekst og
  rester utenfor oppdraget føres i issuet som eier dem.

- Data uten type leses gjennom én typet tilgang, ikke med en typekonvertering hos hver
  kaller. En type eller en union utledes av én kilde, ikke skrevet på nytt ved siden av.

## Refaktorering

Gjelder når kode flyttes eller deles uten at atferden skal endres (#1695).

- Ren flytting i egen PR, adskilt fra ny logikk. Delingen gjøres først, så diffen for den
  nye logikken bare viser logikken.
- Del flyttingen i commits som er grønne hver for seg, med de samme sjekkene som for
  PR-en. En typeendring eller annen omskriving kommer i en egen commit etter flyttingen,
  eller i en egen PR når den er mer enn en typeendring.
- Bevis uendret atferd: testene er grønne uten endrede forventninger, og de
  representative feilinnføringene for koden som er flyttet, oppdager fortsatt feilen.
  Snapshots og genererte filer som endres, endres bare der versjonen står.
- Oppdater importene hos kallerne i stedet for å eksportere på nytt fra den gamle
  modulen. Gir delingen en sirkel i importene, flyttes funksjonen til den eneste
  kalleren, eller blir der den brukes.
- En funksjon med mange grener deles etter art (sporet, kommandotypen) bak samme
  signatur. Rekkefølgen på kontroller som kan kaste, beholdes, fordi feltet i feilen kan
  være synlig for brukeren.
- Skriv i PR-en hvor hver flyttet funksjon står nå, og avvikene fra planen i issuet.

## Vedlikeholds- og driftsverktøy

- Et nytt eller vesentlig endret verktøy har et konkret formål, en ansvarlig for
  vedlikeholdet, dokumenterte avhengigheter, kjørekommando, forventet resultat og
  egnet verifikasjon. Bruk den eksisterende oppskriften eller verktøyets
  hjelpetekst. Det trengs ingen egen rapport.
- Kontroller som kan gjentas, kjører i CI med både et gyldig tilfelle og et
  representativt avvik. Et verktøy mot ekstern drift trenger ikke kjøres mot det
  levende systemet i CI. Prøv kontrollogikken isolert, og skriv hva bare en
  autorisert driftskjøring kan bevise.
- Et engangsverktøy fjernes når oppgaven er avsluttet, eller merkes som historisk
  bevis med formål og hva det ble kontrollert mot. Migrasjoner som er tatt i
  bruk, og nødvendige gjenopprettingsverktøy beholdes. Et eksisterende skript
  vurderes etter bruk og verifikasjon, ikke etter alder. Kontroller behov og
  konsumenter før sletting. Et verktøy for død kode gir kandidater, ikke bevis
  for at noe kan slettes.

## Review og funn

**Uavhengig review før en PR meldes klar er `/code-review` på egen diff** (`AGENTS.md`), på
nivå `high` når diffen rører serverinngangene, tilgang, CSRF, lagring, journalen
eller migrasjonene, uansett språk, ellers `medium`. For en diff som bare rører
`docs/`, skillene og `AGENTS.md`, avgjør orkestratoren om `/code-review` er verdt
det, og begrunner valget i én linje i PR-en (oppdragsgiver 27.10, #1338). Endrer diffen utledningen eller reglene i domenet, kommer i
tillegg en review av samspillet mellom reglene, i ny kontekst og med reglene og
bevis-sakene samlet, én gang per PR. Reviewet og rettingene kjøres i en ny økt,
ikke i byggeøkta, når vilkårene i
[arbeidsøkt-skillen, «Review i ny økt»](../arbeidsokt/SKILL.md#tid-og-kontekst), er
oppfylt.
`/simplify` kjøres når oppdragsgiver ber om det eller godkjenner orkestratorens
forslag, og da før `/code-review`, slik at reviewet ser den endelige koden.
**Endrer diffen visningen** (`.svelte`- eller CSS-filer i `src/`, synlig), rydder
byggeøkta egen diff med kommandoen `/design-deslop` og lar PR-en stå som utkast.
Etter `/design-deslop` legger byggeøkta (eller rettingsøkta) skjermbildene i PR-en og stopper.
`/design-review` kjøres i en ny økt, før `/code-review`, først når oppdragsgiver har sett over
skjermbildene og sagt fra. Det gjelder også under om lag 200 endrede linjer i `.svelte`- og
CSS-filer, der byggeøkta ellers kunne kjørt den selv. Alvorligheten settes av
`/design-review`; hva som rettes i PR-en, følger stoppregelen for funn under
(oppdragsgiver 23.10, #1080, og 29.10; oppdragsgiver 02.11, #1492).

En diff i `src/routes/[prosjektId]/` eller `src/lib/kjernesak/` krever også at den
ekte saksruta kjøres med `saksrute.ts` før PR-en meldes klar, og skjermbildene legges
i PR-en fra grenen `skjermbilder`, slik
[mockup-nettleser](../mockup-nettleser/SKILL.md#skjermbildene-i-pr-en) sier
(oppdragsgiver 23.10, #1222).

**Stoppregelen for funn.** I PR-en rettes bare funn som gir feil resultat nå, eller
som bryter et vedtak eller kontrakten. Et funn som ikke rettes, får ett av tre utfall:

- Det avvises med én linje under «Åpne spørsmål» i PR-beskrivelsen, når det verken
  kan gi feil resultat senere eller er et krav til noe som skal bygges.
- Er det et krav til en inngang eller del som ikke finnes ennå, føres kravet som
  kommentar i issuet for den inngangen eller delen.
- Resten samles i ett oppfølgingsissue per PR, med etiketten `review-oppfølging`
  og en sjekkliste. Ett issue per funn lages ikke.

(oppdragsgiver 16.10, #649)

**Hva som føres i oppfølgingsissuet** (oppdragsgiver 20.10, etter en gjennomgang
der 60 % av de åpne punktene var pirk):

- **Testkode, verktøy, hooks og dokumentasjon.** Et funn her føres bare når det
  kan gjøre en test grønn for feil atferd i produktkoden, eller skjule en feil der.
  Ellers avvises det med én linje.
- **Feil ved en senere endring.** Et funn regnes som «kan gi feil resultat
  senere» bare når endringen er planlagt i et issue eller et vedtak.
- **Avvises alltid:** duplisering, docstringer og ytelse uten måling.
- **Søk før du fører.** Søk i de åpne `review-oppfølging`-issuene først. Står
  punktet der alt, skriver du en kommentar der i stedet for et nytt punkt.

Oppfølgingsissuet får samme milepæl
eller sporetikett som PR-en det kommer fra. En PR som løser punkter, skriver
«Del av #n». Orkestratoren krysser av punktene når PR-en er merget, og lukker
issuet når alle er krysset av. PR-ene krysser ikke av selv, og ingen skriver
`Closes` for et oppfølgingsissue.

Kontrollen av rettingene gjelder bare rettingsdiffen, på nivå `high` når rettingene
rører serverinngangene, tilgang, CSRF, lagring, journalen eller migrasjonene, ellers
`medium` (oppdragsgiver 14.10, #484 og #490).

## Før en PR meldes klar

- Prøv akseptkriteriene mot forventninger fra et vedtak eller en annen uttrykkelig
  kilde, etter `.claude/rules/tester.md`. Der dagens atferd er en kjent feil, er
  likhet mellom gammel og ny kode ikke fasit. Utløser endringen feilinnføring:
  vis at de representative testene oppdager relevante feil. For kjernen er beviset
  CI-kjøringen med etiketten `feilinnfoering`; en skyøkt kjører ikke hele samlingen
  lokalt (oppdragsgiver 28.10). For serveren er beviset den målrettede lokale
  kjøringen med ID-ene etter stien, mot en kopi av arbeidstreet; CI kjører bare
  `--ankre` der (oppdragsgiver 28.10).
- Ved endret domeneregel eller kontrakt: prøv de berørte inngangene, også vanlig
  innsending, batch og godkjenning der de bruker regelen. Ved endret
  hendelsesdata eller serialisering: prøv faktisk lagring og gjenlesing. Vurder
  historiske data og gamle og nye lesere og skrivere når kompatibiliteten
  berøres, med samme unntak (B-17). Oppgi begrensningene. En test i minnet
  beviser ikke lagringsstien.
- Kjør de relevante CI-sjekkene, også typesjekken av TS-koden utenfor `src/`
  (kommandoen står i [miljø-skillen](../miljo/SKILL.md)). Før hver push som rører
  `kjerne/`: `node kjerne/tester/feilinnfoering.ts --ankre`, så en endret linje
  ikke stopper feilinnføringene i CI før de har begynt (#430). Kjør også `npm run build` når
  frontendkode, frontendavhengigheter eller byggoppsettet endres. Andre berørte
  artefakter bygges med sine dokumenterte kommandoer. Dokumentendringer alene
  krever ikke applikasjonsbygg eller full testsuite.
- En PR som bygger frontend mot TS-kjernen, viser hvilke steg i
  brukerforløpet som er prøvd, og
  [dekningsoversikten](../../../docs/domenetabell/brukerforlop/dekning.md) er
  generert på nytt når forløpet er endret (oppdragsgiver 30.10, #1065). En
  mangel som ikke løses i PR-en, får et issue.
- Fører PR-en et vedtak, er det en ny post i
  [vedtaksregisteret](../../../docs/vedtaksregister/README.md), og raden i
  vedtaksfila er skrevet av `docs/verktoy/vedtaksregister.py`, ikke for hånd. CI har ikke
  NS 8407-teksten. Kjør derfor `python docs/verktoy/vedtaksregister.py --sjekk`
  og `pytest test_vedtaksregister` fra `verktoy/tester/` med klonen av
  `khjohns/kontrakt` på plass ([kildene](../../../docs/vedtaksregister/README.md#vakttestene)),
  og før resultatet i PR-en. Meldingen «Sitatene fra NS 8407 er hoppet over»
  betyr at kontrollen ikke er kjørt.
  [Vakttestene](../../../docs/vedtaksregister/README.md#vakttestene) erstatter
  kontrollrundene av vedtaksteksten. Det som krever skjønn, og kontrollen av
  `folge` og merknadene mot svarene, står i
  [vedtaksskillen](../vedtak/SKILL.md).
- Gjennomfør uavhengig review etter «Review og funn», med akseptkriteriene som
  grunnlag. Se særlig etter ny duplisering, om regelen ligger der den skal eies,
  og om utfasingen er planlagt. Funn om dette følger stoppregelen for funn.
  Leveransen skal kunne forklares og etterprøves
  fra kode, tester og varige referanser uten den opprinnelige chatten. At
  agenter er enige, er ikke testbevis og erstatter ikke det menneskelige
  beslutningsansvaret.
- **Brukerforløpene følger feilene og vedtakene** (#1330). Avdekker en feil eller et
  nytt vedtak en brukerhistorie som mangler i
  [brukerforløpene](../../../docs/domenetabell/brukerforlop/README.md), utvides de i
  samme arbeid. Endres et forventet resultat i et forløp, får forløpet en linje i
  `endringer` med dato og vedtak eller issue.
- Svekk ikke assertions, og legg ikke til skip/xfail eller nye lint-unntak for å
  få grønt. Nye reproduksjoner av kjente feil følger testreglene.
- Fyll ut [PR-malen](../../../.github/pull_request_template.md) med kjørt
  kommando, resultat og kontrollert commit eller diff. Skill egne kjøringer fra
  historiske resultater. Kontroller som ikke er gjennomført eller ikke var
  tilgjengelige, oppgis uttrykkelig. Mangler en påkrevd sjekk eller review, er
  PR-en fortsatt utkast. Restanser får issues etter `AGENTS.md`, «Hvor hva står». Et issue gjør
  ikke et uoppfylt akseptkriterium oppfylt.
