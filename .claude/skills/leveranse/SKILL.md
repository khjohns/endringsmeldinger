---
name: leveranse
description: Leveranseprosedyren for implementering og refaktorering. Brukes når en kodeoppgave starter, før akseptkriteriene skrives, og igjen før en PR meldes klar. Rene dokumentendringer bruker bare de relevante kontrollene.
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
  lagrene; i Python også `services/business_rules.py` og `SporStatus`. En
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
- Bygger oppgaven frontend mot TS-kjernen, er den gamle frontenden for samme
  flyt utgangspunktet (oppdragsgiver 20.10). Kartlegg hva den viser og lar
  brukeren gjøre, og skriv i akseptkriteriene hva som skal med, hva som gjøres
  annerledes og hva som utelates, med vedtaket eller issuet som grunn. Reglene
  hentes fra kjernen og prøves mot vedtakene og bevis-sakene, ikke mot den gamle
  koden.
- Endrer oppgaven visningen, følg [interface-design-skillen](../interface-design/SKILL.md) og
  [systemfila](../../../docs/design/system.md). Ryddingen og reviewet av visningen
  står i `AGENTS.md`, «Arbeidsform».
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
- Legg regelen der den er avtalt å eies. Ingen ny juridisk slutning i visning,
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
  rester utenfor oppdraget føres i issuet som eier dem. Python-stien ryddes etter
  DL-U2 (oppdragsgiver 28.10, #1338).

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
- En PR som bygger frontend mot TS-kjernen, sammenlikner med den gamle
  frontenden for samme flyt: hva den nye mangler, gjør annerledes eller
  utelater, og hvorfor (oppdragsgiver 20.10). En mangel som ikke løses i
  PR-en, får et issue. Det som står i egne issues som forbedringer av den
  gamle frontenden, er ikke mangler.
- Fører PR-en et vedtak, er det en ny post i
  [vedtaksregisteret](../../../docs/vedtaksregister/README.md), og raden i
  vedtaksfila er skrevet av `docs/verktoy/vedtaksregister.py`, ikke for hånd. CI har ikke
  NS 8407-teksten. Kjør derfor `python docs/verktoy/vedtaksregister.py --sjekk`
  og `pytest tests/test_vedtaksregister` fra `backend/` med klonen av
  `khjohns/kontrakt` på plass ([kildene](../../../docs/vedtaksregister/README.md#vakttestene)),
  og før resultatet i PR-en. Meldingen «Sitatene fra NS 8407 er hoppet over»
  betyr at kontrollen ikke er kjørt.
  [Vakttestene](../../../docs/vedtaksregister/README.md#vakttestene) erstatter
  kontrollrundene av vedtaksteksten. Det som krever skjønn, og kontrollen av
  `folge` og merknadene mot svarene, står i
  [vedtaksskillen](../vedtak/SKILL.md).
- Gjennomfør uavhengig review etter `AGENTS.md`, med akseptkriteriene som
  grunnlag. Se særlig etter ny duplisering, om regelen ligger der den skal eies,
  og om utfasingen er planlagt. Funn om dette følger stoppregelen for funn i
  `AGENTS.md`. Leveransen skal kunne forklares og etterprøves
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
  PR-en fortsatt utkast. Restanser får issues etter `AGENTS.md`. Et issue gjør
  ikke et uoppfylt akseptkriterium oppfylt.
