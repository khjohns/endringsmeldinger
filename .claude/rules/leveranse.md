# Leveranse og vedlikehold

Gjelder implementering og refaktorering. For rene dokumentendringer brukes bare
de relevante kontrollene. Hovedplanen bestemmer målarkitektur, beslutninger og
rekkefølge; denne regelen bestemmer hvordan en avgrenset oppgave leveres.

## Før kode endres

- Les oppgaven, berørte vedtak i hovedplanen og aktuelle regler i `.claude/rules/`.
  Hvis oppgaven bygger på en uflettet PR, les den ved en konkret commit og angi
  avhengigheten i oppgaven/PR-en. Skill vedtatt retning fra implementert atferd;
  bruk ikke en eldre PR-beskrivelse foran et nyere vedtak.
- Skriv konkrete akseptkriterier i eksisterende issue eller, for en liten
  oppgave uten issue, i arbeidsplanen som senere tas med i PR-beskrivelsen.
  Beskriv input/forløp, forventet resultat eller avvisning og kilden til
  forventningen. «Tester grønne» er ikke et akseptkriterium alene.
- Navngi hvor den berørte domeneregelen eller kontrakten skal eies, og kartlegg
  kallere og innganger som berøres. Oppgi hva som skal fjernes, og hva som må
  bestå. For uendret atferd: si hvilke observerbare resultater som skal bevares.
  Ved begrepsendring: følg språkregelen i `AGENTS.md` og bruk oppgavens felles
  begrepsavklaring. Les `.claude/rules/dokumentasjon.md` for å avgjøre hva som
  trenger varig dokumentasjon, også når oppgaven starter uten endringer i `docs/`.
- Avklar bare uavklart tiltenkt atferd med oppdragsgiver. Tekniske arbeidsvalg
  innen oppgaven avgjøres selv. En uløst domenebeslutning blokkerer den berørte
  implementeringen, ikke uavhengig arbeid.

## Under implementering

- Hold én sammenhengende endring per PR. Skill atferdsendring fra rent mekanisk
  flytting der det gjør reviewet etterprøvbart. Unngå uvedkommende opprydding.
- Bruk regelens avtalte eier. Ikke legg en ny juridisk slutning i visning,
  brevtekst eller en adapter. Deling av kode erstatter ikke servervalidering
  eller tilgangskontroll. Nye pakker og abstraksjoner må ha et konkret behov
  i oppgaven; ikke bygg støtte for hypotetiske fremtidige forbrukere.
- Når en modulgrense etableres eller endres, håndhev de avtalte forbudte
  avhengighetene med lint eller en arkitekturtest i CI. Kontroller at minst ett
  representativt forbudt importforsøk gir feil, og fjern forsøket etterpå.
  Unngå en tekstvakt som bare gjenkjenner én stavemåte. Ikke utvid oppgaven til
  full ombygging av eksisterende grenser; en nødvendig utsatt kontroll får et
  issue og beskrives som uprøvd, ikke som håndhevet.
- En migrering har én autoritativ skrivesti per kommando. Fjern erstattet kode,
  utdaterte tester og konfigurasjon når de ikke lenger trengs, men bevar
  domenebevis og nødvendig historikkkompatibilitet. Midlertidig dobbeltkode eller
  adapter får et koblet issue med ansvarlig, berørte filer og et observerbart
  fjerningskriterium. «Ryddes senere» er ikke tilstrekkelig.

## Før en PR meldes klar

- Prøv akseptkriteriene med forventninger fra vedtak eller annen uttrykkelig
  kilde. Følg `.claude/rules/tester.md`; likhet mellom gammel og ny kode er
  ikke fasit der dagens atferd er en kjent feil.
- Ved endret domeneregel eller kontrakt: prøv de berørte inngangene, inkludert
  vanlig innsending, batch og godkjenning der de bruker regelen. Ved endret
  hendelsesdata eller serialisering: prøv faktisk lagring og gjenlesing. Vurder
  historiske data og gamle/nye lesere og skrivere når kompatibilitet berøres.
  Oppgi avgrensninger; en test i minnet beviser ikke lagringsstien.
- Kjør relevante eksisterende CI-sjekker. Kjør også `npm run build` når
  frontendkode, frontendavhengigheter eller byggoppsett endres. Andre berørte
  leveranseartefakter bygges med sine dokumenterte kommandoer. Dokumentendringer
  alene krever ikke applikasjonsbygg eller full testsuite.
- Gjennomfør uavhengig review etter `AGENTS.md`, med akseptkriteriene som
  grunnlag. Kontroller særlig ny duplisering, regelens eier og planlagt utfasing.
  Ikke svekk assertions, legg til skip/xfail eller utvid lint-unntak for å få
  grønt. Nye reproduksjoner av kjente feil følger testreglene.
- Fyll ut PR-malen med kjørt kommando, resultat og kontrollert commit/diff.
  Skill egne kjøringer fra historiske resultater. Ikke gjennomført eller
  utilgjengelig kontroll oppgis uttrykkelig; et påkrevd review eller en påkrevd
  sjekk som mangler, betyr at PR-en fortsatt er utkast. Restanser får issues
  etter `AGENTS.md`. Et issue alene gjør ikke et uoppfylt akseptkriterium oppfylt.
