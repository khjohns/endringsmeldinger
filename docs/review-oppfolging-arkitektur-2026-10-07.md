# Reviewoppfølging av målarkitektur og gjennomføring

**Dato:** 2026-10-07. **Kodegrunnlag:** `68ca0ea5b593808c4513dc84ab908baf12739cdb`.
**Dokumentgrunnlag:** [PR #266](https://github.com/khjohns/endringsmeldinger/pull/266)
ved `4c8860a84a4aa9f388818b38471593e5592fcfb8` og
[PR #270](https://github.com/khjohns/endringsmeldinger/pull/270)
ved `d0a7853376404ed9adf8d76e0871c268e5605b21`.
**Forrige ledd:** [strukturkartleggingen](kartlegging-struktur-spor-d-2026-10-05.md)
og [arkitekturforslaget](forslag-maalarkitektur-og-beslutningsproeve-2026-10-07.md).
**Kilde til vedtak:** Oppdragsgiver tilsluttet seg reviewets justeringer i
samtalen 07.10 og ba deretter uttrykkelig om dokumentasjons-PR og issues,
inkludert dokumentasjon av verktøybegrensninger. Vedtak og rekkefølge står i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md), ikke her.

Dette er dokumentoppfølging, ikke en ny kodeaudit eller gjennomført prototype.
Ingen produksjonskode, tester, pakker, database eller hosting endres.
ID-ene RO-01–RO-06 nedenfor identifiserer reviewpunktene; de er ikke nye
sikkerhetsfunn eller erstatninger for SK-/B-ID-ene.

| ID | Presisering fra reviewet | Klassifisering | Autoritativ kobling | Arbeidsissue |
| --- | --- | --- | --- | --- |
| RO-01 | Brukerens akseptreferanse og hele sporets livsløp | Planpresisering, ingen ny alvorlighet | B-14, M2 | [#271](https://github.com/khjohns/endringsmeldinger/issues/271), eksisterende [#256](https://github.com/khjohns/endringsmeldinger/issues/256) |
| RO-02 | Smal kommando-/API-grense før typegenerering | Planpresisering, ingen ny alvorlighet | B-14, M3/M5 | [#272](https://github.com/khjohns/endringsmeldinger/issues/272), eksisterende [#265](https://github.com/khjohns/endringsmeldinger/issues/265) |
| RO-03 | Versjonen som beregnet projeksjonen, gjenoppbygging og kompatibilitet | Beviskrav, ingen ny alvorlighet | B-10, F2/F5 | [#273](https://github.com/khjohns/endringsmeldinger/issues/273) |
| RO-04 | Tidligere språkprøve med to porter og konkret Python-baseline | Beslutningsgrunnlag, ingen ny alvorlighet | B-14; B-15 for ekstra alternativ | [#274](https://github.com/khjohns/endringsmeldinger/issues/274), [#275](https://github.com/khjohns/endringsmeldinger/issues/275) |
| RO-05 | Invarianter utover de kjente reproduksjonene | Beviskrav, ingen ny alvorlighet | B-14 | [#271](https://github.com/khjohns/endringsmeldinger/issues/271) |
| RO-06 | Korrigering av feilregistrerte, låste opplysninger | Åpent domenespørsmål, ingen ny alvorlighet | B-16, F5 | [#276](https://github.com/khjohns/endringsmeldinger/issues/276) |

## RO-01: aksept og livsløp

**Fil og symbol:** `TEAkseptererResponsData` i
[hendelsesmodellene](../backend/models/events.py), `_handle_te_aksepterer_respons`
og `_svaret_faller_bort` i [projeksjonen](../backend/services/timeline_service.py),
og `claims` / `validate_items` i
[godkjenningsflyten](../backend/services/approval_service.py).

M2s referanser løser en viktig del av feilformen, men brukerens konkrete
svarreferanse må følge hele kommando- og lagringsstien. Livsløpstabellen må
også dekke tilbaketrekking, frafall, låsing og grunnlagsavhengighet. Dagens
godkjenningsflyt har sin egen navnebaserte klassifisering av gjeldende krav.
Den må omfattes av den samme definisjonen som projeksjonen. Det opprinnelige
utsagnet i kartleggingen om nesten ingen frontendendring er merket som
erstattet for denne kontrakten. Nye domenetolkninger avgjøres separat før
tilhørende bevis-sak og implementering.

## RO-02: kontrakt før generator

**Fil og symbol:** `public_state` i
[event_visibility.py](../backend/lib/auth/event_visibility.py), `parse_event`
og `parse_event_from_request` i [events.py](../backend/models/events.py).

Den offentlige serialiserte kontrakten er grunnlag for genererte typer.
Automatisk eksport av hele internmodellen ville koblet nye interne felt til
API-et. Kommando, lagret hendelse og offentlig lesemodell har ulike krav til
validering og kompatibilitet. Dette innebærer en smal tidlig kontraktsgrense,
ikke en full DTO-kopi eller ny endepunktstruktur. Eksisterende #265 beholder
ansvaret for å samle lesepunktene; #272 eier kontrakten før generatorarbeidet.

## RO-03: projeksjoner og utrulling

**Fil og symbol:** `submit_event` i
[event_routes.py](../backend/routes/event_routes.py), `compute_state` i
[timeline_service.py](../backend/services/timeline_service.py), og
`replace` i [sakskonteksten](../src/lib/kontraktsbord/context.svelte.ts).

Ny regel kan gi nytt avledet standpunkt uten ny hendelse. Saksversjon alene
beskriver derfor ikke hvilken beregning en lagret oversikt bygger på.
B-10 skal konkretisere hvordan foreldet projeksjon oppdages og gjenoppbygges,
med bevis i F2 og eksplisitt kontroll i F5. Frosne brev og beslutninger
beholdes. Kompatibilitetsbeviset omfatter også rollback etter nye hendelser,
og hva en leser som ikke kjenner semantikken, kan tillate av nye kommandoer.
Ingen generell oppgraderingsmotor er påkrevd uten et konkret formatbehov.

## RO-04: sammenlikn språk etter samme modellforbedring

**Fil og symbol:** [backend/regler](../backend/regler/) og
[frontendens domenemoduler](../src/lib/domain/), med servergrensene i
`ApprovalService.validate_items` og `submit_event`.

Prøven skiller semantikk og spart dobbeltarbeid fra server-/integrasjonskostnad.
Forbedret Python må være konkret nok til at M1/M2-gevinsten ikke feilaktig
tilskrives TS. Samme modul må faktisk kjøres på klient og server før delt
autoritet kan hevdes. Manglende bevis ved stopp kan gi et uavklart resultat.
Å undersøke serverbasert forhåndsvurdering tidligere enn vedtatt, krever
B-15-vedtak og er ikke en skjult del av prøven. Kostnadsbildet inkluderer
godkjenning, sikkerhetsbevis, integrasjoner, lagring og drift.

## RO-05: prøv invarianten bak feilene

**Fil og symbol:** [backend-reproduksjonene fra #266](../backend/tests/test_services/test_strukturkartlegging_spor_d.py)
og [frontend-reproduksjonene](../src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts),
med vanlig innsending, batch og `validate_items` som separate innganger.

De kjente feilforløpene beholdes, med skille mellom observert feil og vedtatt
forventning. Et lite sett genererte hendelsesforløp prøver de samme
invariantene på flere rekkefølger. Forventningene kommer fra vedtakene,
ikke fra at to implementasjoner tilfeldigvis er enige. Lagring/gjenlesing
inngår fordi modeller i minnet alene ikke beviser journalens innhold.

## RO-06: korrigering uten omskriving

**Fil og symbol:** `VarselInfo` i [events.py](../backend/models/events.py),
`_handle_frist` og `_handle_vederlag` i
[timeline_service.py](../backend/services/timeline_service.py).

SK-12s låsing består. Reviewet fant ikke en konkret korrigeringsprosess i de
to forslagene. B-16 skal avklare registreringsrettelse, rettslig virkning,
aktørrettigheter og motpartsinnsyn. En manuell prosess kan være et alternativ;
det er ikke vedtatt at en ny hendelsestype skal bygges. Avklaringen er tatt
inn som produksjonskrav og blokkerer ikke selve varsel-låsingen.

## GitHub-verktøy og korrigering av metadata

**Observert 07.10, fulgt opp i [#277](https://github.com/khjohns/endringsmeldinger/issues/277):**

- Issue-verktøyene kan opprette/oppdatere issues, sette eksisterende etiketter
  og tilordne kjent milepælnummer. Ingen callable funksjon for opprettelse av
  milepæler/etiketter eller native issue-avhengigheter ble funnet.
- Fetch av `/milestones` og `/labels` ble avvist med HTTP 400 fordi
  endepunktene ikke var tillatt av verktøyet. Dette påviser ikke manglende
  rettigheter i selve GitHub-repoet.
- Metadata i issue-uttrekket bekreftet milepæl 1 (F0b), 2 (F1) og 3
  (Opprydding etter AF-06). F2/F5 kunne ikke bekreftes; de kan finnes uten
  å være representert i uttrekket. Ingen milepæler ble opprettet eller gjettet.
- Shell-tilgang var ingen fungerende omvei: `git ls-remote` feilet ved
  tilkobling til den konfigurerte proxyen, før GitHub ble kontaktet.
- #271–#276 bruker eksisterende `spor-d` og `review-oppfølging`. B-10-saken
  og de åpne B-15/B-16 bruker `beslutning`; B-15/B-16 har også
  `venter-på-beslutning`. #277 bruker `papercut` og `review-oppfølging`.

**Korrigeringsgrunnlag:** Bekreft F2-milepæl i GitHub UI eller et egnet verktøy,
gjenbruk den hvis den finnes og opprett den bare dersom den mangler. Tilordne
#273 til F2. F5 er beviskontroll i hovedplanen, ikke en ekstra implementasjon
av samme oppgave. Spor D trenger etter repoets arbeidsdeling ikke en ny
milepæl. Tekstlige avhengigheter og lenker er lagt i issuene; native
avhengigheter kan legges til senere. Løpende status og utførte korrigeringer
føres i #277, ikke som en ny statusliste her.

## Sammenstilt grunnlag og PR-håndtering

Ved opprettelsen var #266 og #270 åpne mot samme `main`-commit. Et separat
grunnlag, `codex/grunnlag-266-270`, kombinerer de to kontrollerte headene,
inkludert begge bidrag til dokumentindeksen. Foreldre er bevart i Git;
ingen av de opprinnelige grenene eller `main` er endret.

Oppfølgingsgrenen er `codex/review-arkitektur-oppfolging`. PR-en åpnes som
utkast mot det sammenstilte grunnlaget, slik at reviewdiffen bare viser nye
dokumentendringer. Etter at #266/#270 er flettet til `main`, skal PR-en rettes
mot `main` og diffen kontrolleres på nytt. Ved squash-fletting eller endrede
forutsetninger må grenen først rebaseres eller flettes med `main`, med
konflikter løst mot gjeldende vedtak. Prerequisittenes kode/tester skal ikke
stå igjen som nye endringer i denne dokumentasjons-PR-en. Den praktiske
oppfølgingen står i PR-beskrivelsen og #277.

## Verifikasjon og grenser

**Kjørt og observert i dokumentoppfølgingen:** PR-headene og repoets filtrær
ble hentet via GitHub-verktøyet. Åpne issues ble søkt for gjenbruk, og
issue-uttrekk ble brukt til å bekrefte eksisterende etiketter/milepæler.
De nye issue-svarene bekreftet opprettelse og etiketter. `git diff --check`
er ren. 260 lokale lenker/ankre i de fem berørte dokumentene er kontrollert
uten feil, med filtilstedeværelse fra Git-treet og ankermål hentet ved
kontrollert ref. Kildelinjeankre og eksterne nettsiders innhold er ikke prøvd.

**Lest ut av koden i reviewet:** De navngitte modellene, projeksjonen,
forretningsreglene, innsendingen, godkjenningsflyten, `public_state`,
regelversjonsvakten og frontendens sakskontekst. Domeneforventninger er hentet
fra hovedplanen. Historiske testresultater i #266/#270 er ikke nye kjøringer.

**Ikke kontrollert:** Full testsuite, en ny reproduksjon, faktisk språkprøve,
live databasekatalog, eksterne integrasjoner, utrulling/rollback, juridisk
tolkning utover de dokumenterte vedtakene eller komplett milepælkatalog.
Dokumentendringen lukker ingen implementeringsfunn. B-14s dokumentasjon
kan fullføres uten at språk, B-15 eller B-16 dermed avgjøres.
