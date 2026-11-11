# Vurdering av informasjonssikkerhetsrisiko før reell bruk

**Dato:** 11.11.2026. **Kontrollert commit:** `91cd3cd348a3f22a052488ee741d5fdc3949184b`.
**Formål:** knytte veilederen for risikovurdering til repoets tiltak og beslutningsgrunnlag.

## Konklusjon og avgrensning

Repoet har et godt teknisk grunnlag for risikovurderingen, men det undersøkte
grunnlaget dokumenterer ikke at risikoen ved reell bruk er akseptabel.
Veilederen er særlig relevant for å koble eksisterende tiltak til skadefølger,
driftsansvar og beslutning om restrisiko.

Foreslått første omfang er opprettelse, intern behandling, sending, levering og
senere gjenfinning av formelle varsler, inkludert tilgang, relevante integrasjoner,
lagring og brukernes rutiner. Dette er en første vurdering av grunnlaget, ikke en
fullstendig ROS, sikkerhetsaudit eller juridisk vurdering av varslenes rettsvirkning.

[Hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) eier funnstatus,
føringer og åpne beslutninger. [Vedtaksfila](plans/vedtak.md) eier vedtakene.
Notatet endrer ingen av disse og aksepterer ingen restrisiko.
Ifølge CLAUDE.md er løsningen ikke i produksjon og har ingen reelle data.

## Kildegrunnlag og metode

Oppdragsgiver gjenga følgende utdrag fra «Veileder risikovurdering infosikk v1.5»
i samtalen 11.11.2026:

- Kapittel 2: akseptkriterier, omfang og avgrensninger.
- Kapittel 3: verdivurdering, tabell 3 og konsekvens av utilgjengelighet.
- Avsnitt 5.1: beskrivelse av hendelsene.
- Avsnitt 5.2.1: sårbarhetsvurdering.

Den vedlagte filen kunne ikke åpnes som PDF; innholdet i utdragene er ikke
kontrollert mot originalen. Resten av veilederen er ikke lest. Veilederens
fulltekst og interne lenke gjengis ikke her.

Utdragene legger opp til å identifisere informasjonsverdier, beskrive konkrete
uønskede hendelser og vurdere tekniske, organisatoriske og menneskelige
sårbarheter sammen med eksisterende tiltak. Akseptkriteriene legger middels
risiko til virksomhetsleder, eventuelt delegert til systemeier, og høy risiko til
virksomhetsleder med rapportering til overordnet byrådsavdeling.
Det må avklares at disse kriteriene gjelder for innføringen, og hvem som har myndigheten.

Belegg følger hovedplanens skille: **L** betyr lest i kode; **K** betyr kjørt og
observert. Dokumentreferanser er dokumentert grunnlag, ikke kjørt verifikasjon.
Ingen K-belegg for produktets atferd er produsert i denne vurderingen.
Scenarioene RVG-01–RVG-05 er lokale analyse-ID-er, ikke nye bekreftede kodefunn.
Risikonivå er ikke satt: virksomhetens konsekvens- og sannsynlighetskriterier
og tilstrekkelig driftsgrunnlag er ikke undersøkt.

## Informasjonsverdier

| Verdi | Beskyttelsesbehov som bør vurderes |
| --- | --- |
| Sendte brev med dokumentasjon | Korrekt og fullstendig innhold, bevart betydning og senere gjenfinning |
| Aktør, kontraktsside, prosjekt og tidspunkt | Pålitelig dokumentasjon av hvem som handlet, i hvilken sammenheng og når |
| Interne notater og utkast | Skjerming mot andre team, også team på samme kontraktsside |
| Krav, svar og sammenhengen mellom dem | Korrekt grunnlag for partenes videre beslutninger |
| Sending, levering og kvitteringer | Skille mellom intern registrering og faktisk levering |

Dette er en innledende kartlegging, ikke en klassifisering etter konsekvensskalaen.
Interne notater er et beskyttelsesbehov i målomfanget; [tilgangsreglene](../.claude/rules/tilgang.md)
beskriver at TS-serverens innganger for notater mangler. Behovet er ikke belegg for
at hele funksjonen finnes eller er verifisert.

## Eksisterende tiltak

| Tiltak | Belegg og grense |
| --- | --- |
| Samlet innlogging, prosjektkontroll og kontraktsrolle | **L:** [app.ts](../server/app.ts), `tilgangOgKropp`, og [autorisasjon.ts](../server/autorisasjon.ts). [register.test.ts](../server/tester/register.test.ts) inneholder HTTP-tester for blant annet sesjon, CSRF og feil prosjekt. Ingen ny kjøring. |
| Transaksjon, versjonskontroll og kommandokvittering | **L:** [kommandoer.ts](../server/kommandoer.ts). Hendelse og frosset leveringsoppdrag sendes til samme databaseprosedyre, og vedlegg bindes i transaksjonen. Databasevirkningen er ikke nyverifisert. |
| Frosset brev og leveringsgrunnlag | **L:** [levering.ts](../server/levering.ts) fryser blant annet aktør, tidspunkt, mål, versjoner og sjekksum. PDF-teksten kontrolleres mot frosset brevtekst. |
| Gjenfinning og gjenbruk ved levering | **L:** [jobber.ts](../server/jobber.ts) gjenfinner dokument/referanse, gjenbruker lagret PDF og kvitterer operasjoner separat. [levering.test.ts](../server/tester/levering.test.ts) bruker falsk Catenda; databasegruppen krever testbase. |

Tiltakene gir et konkret utgangspunkt for avsnitt 5.2.1. At en test finnes,
dokumenterer ikke siste grønne kjøring, produksjonskonfigurasjonen eller Catendas garantier.

## Scenarioer for første risikovurdering

### RVG-01: Et registrert varsel blir ikke levert eller fulgt opp tidsnok

Mulig skadefølge er oversittet frist, økonomisk tap eller svekket bevisgrunnlag,
avhengig av kontrakten og den konkrete situasjonen.

**Belegg:** Leveringsvernene over (**L**). Headeren i [jobber.ts](../server/jobber.ts)
beskriver behov for alltid kjørende instans og manuell oppfølging av parkerte jobber.
[Hovedplanens åpne beslutninger](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
fører driftsverdier og ansvar under B-09.

Vurderingen må fastsette hvor lenge et varsel kan ligge uten bekreftet levering,
deteksjons- og reaksjonstid, hvem som følger opp, og alternativ fremgangsmåte.
[Catenda-grunnlaget](plans/2026-09-16-godkjenning-og-varig-levering.md#7-catenda-leveringsgarantier)
skiller lokale feiltester fra eksterne garantier. Et GUID-felt eller et negativt
oppslag er ikke alene bevis for sikker gjentakelse.

### RVG-02: Tilgangsvernet stopper legitim bruk når Catenda ikke svarer

Mulig skadefølge er at en bruker ikke får lest tidligere brev eller forberedt en
fristkritisk handling.

**Belegg L:** [autorisasjon.ts](../server/autorisasjon.ts), `oppdaterMedlemslisten`,
`lesKontraktsside` og `kontraktsside`. Foreldet medlemskap oppdateres fra
Catenda; kontraktstilknytning krever oppslag der. Uavklart tilgang avvises.
Dette er en beskyttelse og samtidig en tilgjengelighetsavhengighet. Virkningen
avhenger av den konkrete inngangen og rollen; det er ikke påstått at ethvert
Catenda-avbrudd stopper all bruk.

Vurderingen må omfatte nødvendige lese- og skriveoperasjoner under avbrudd.
Veilederens avveining mellom konfidensialitet, integritet og tilgjengelighet
gir ikke i seg selv grunnlag for å svekke tilgangskontrollen.

### RVG-03: En godkjenning fremstår som legitim etter at serveren er overtatt

Mulig skadefølge er en uautorisert handling og tvist om hvem som godkjente den.

**Dokumentert grunnlag:** B-02 punkt 3 under
[fullmakt og intern godkjenning](plans/vedtak.md#fullmakt-og-intern-godkjenning)
beskriver restrisiko ved overtatt kjøretid og krever ny vurdering i ROS før
produksjon. Dette er en designforutsetning, ikke et påvist angrep eller en
nyverifisert omgåelse i dagens kode.

Scenarioet trenger vurdert sannsynlighet og konsekvens, relevante tiltak og
aksept fra riktig myndighetsnivå. Et designvalg dokumenterer ikke alene
risikoaksept etter veilederens kriterier.

### RVG-04: En sak kan ikke dokumenteres tilstrekkelig etter datatap, tvist eller avvikling

Mulig skadefølge er tapt eller svekket bevisgrunnlag.

**Belegg:** Frosne brev og sjekksummer (**L**, over).
[F4](plans/2026-09-16-godkjenning-og-varig-levering.md#f4--domene-bevis-og-bevaring)
stiller egne krav til eksport uten appen, dokumentversjoner, leveringskvitteringer
og tydelig angivelse av manglende materiale. B-05 og B-11 står i hovedplanens
åpne beslutninger. [F5](plans/2026-09-16-godkjenning-og-varig-levering.md#f5--produksjonsport)
krever gjenopprettingsøvelse med dokumentert RPO/RTO uten blind ny levering.

Vurderingen må omfatte hele bevisgrunnlaget, akseptabelt datatap og
gjenopprettingstid, bevaring, tidskilde og håndtering når systemets fremstilling
bestrides. Kravene er ikke belegg for at øvelsen eller eksporten er verifisert.

### RVG-05: Feilregistrerte opplysninger blir bevart, men håndteres feil

Mulig skadefølge er beslutninger på feil grunnlag eller uklarhet om hva som er
rettet og hvilken betydning rettingen har.

**Dokumentert grunnlag:** B-16 i
[hovedplanens åpne beslutninger](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
og korrigeringskravet i F5. Planen beskriver avklaringer om aktørrettigheter,
godkjenning og motpartsinnsyn, og krever prosessen før første ekte sak.

Uforanderlighet beskytter historikken, men sikrer ikke at opplysningen var riktig
ved registrering. Vurderingen må derfor omfatte brukerfeil, opplæring og
korrigeringsrutiner. Notatet fastsetter ingen ny korrigeringsregel.

## Anbefalt bruk av vurderingen

Bruk scenarioene som et første avgrenset underlag, ikke en uttømmende trusselliste.
For hvert scenario bør vurderingen samle:

1. Informasjonsverdi, berørte arbeidsoperasjoner og konkret skadefølge.
2. Trussel eller årsak, sårbarheter og eksisterende tiltak med verifikasjonsbelegg.
3. Konsekvens, sannsynlighet og usikkerhet etter virksomhetens kriterier.
4. Supplerende tiltak, ansvarlig og forventet virkning.
5. Restrisiko, hvem som kan akseptere den og når den skal vurderes på nytt.

Prioriter avklaring av driftsoppfølging, fristkritiske avbrudd, alternativ varsling,
korrigering og bevisbevaring. F5 sier at status for de organisatoriske prosessene
ikke er innhentet. Det er manglende avklart grunnlag i repoet, ikke bevis på at
virksomheten mangler prosessene. Innhent eksisterende dokumentasjon før nye
tiltak bestilles. Oppfølging hører til hovedplanens eksisterende beslutninger og
arbeidspakker og [første ekte sak, #1065](https://github.com/khjohns/endringsmeldinger/issues/1065).

## Verifikasjon og grenser

- Lest: CLAUDE.md, relevante arbeidsregler, hovedplanens avgrensninger, åpne
  beslutninger og F4/F5, relevant beslutning om godkjenning, samt utvalgt
  tilgangs-, kommando- og leveringskode og tester.
- Én subagent undersøkte levering, bevisverdi og gjenoppretting. Dette er
  arbeidsdeling, ikke ekstern sikkerhetsrevisjon.
- Produktets tester er ikke kjørt. Databasekatalog, produksjonsoppsett,
  siste CI-resultat, levende Catenda og virksomhetens driftsrutiner er ikke kontrollert.
- Historiske Python-, SQLite- og PostgreSQL-funn er ikke brukt som belegg for
  dagens sårbarheter; se [funnregisterets avgrensning](plans/2026-09-16-godkjenning-og-varig-levering.md#4-funnregister).
- Ingen risikonivåer, nye domenevedtak eller aksept av restrisiko er fastsatt.
