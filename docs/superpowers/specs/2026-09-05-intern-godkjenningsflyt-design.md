# Intern godkjenningsflyt for BH-svar — domenespesifikasjon

## Dokumentstatus

- **Dato:** 2026-09-05
- **Status:** Beslutningsgrunnlag — ikke implementasjonsklar
- **Omfang:** Intern ferdigstilling, godkjenning og publisering av byggherrens svar
- **Neste steg:** Avklare punktene i «Åpne beslutninger», deretter utarbeide UI-spesifikasjon og implementasjonsplan

## 1. Formål

Byggherren (BH) behandler tre selvstendige vurderinger i en sak:

1. Ansvarsgrunnlag
2. Økonomi (vederlag)
3. Frist

Vurderingene kan ferdigstilles på ulike tidspunkt. Ett eller flere ferdigstilte svar skal kunne samles i en intern godkjenningspakke. Innholdet blir først tilgjengelig for totalentreprenøren (TE) når hele godkjenningskjeden er fullført og pakken er publisert.

Spesifikasjonen skal:

- bevare et etterprøvbart revisjons- og godkjenningsspor;
- hindre at innhold endres mens det godkjennes;
- støtte flere pakker og svarrunder i samme sak;
- passe inn i dagens event-baserte saksarkitektur;
- etablere en sikker grense mellom intern behandling og innhold som TE kan se.

## 2. Avgrensning

Dette dokumentet fastsetter domenemodellen og de viktigste overgangene. Det fastsetter ikke:

- endelig skjermdesign;
- konkrete beløpsgrenser eller organisasjonsroller;
- kanal og tekst for e-post-/Teams-varsler;
- detaljert API-kontrakt;
- regler for delegering og stedfortredere;
- endelig teknisk lagringsmodell.

Disse temaene er listet som videre arbeid.

## 3. Terminologi

| Begrep             | Betydning                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Sak                | Den overordnede endringsmeldingen (KOE).                                                   |
| Vurdering          | BHs logiske vurdering av ansvarsgrunnlag, økonomi eller frist.                             |
| Vurderingsrevisjon | En konkret, versjonert utgave av en vurdering med frosset innhold.                         |
| Kladd              | Redigerbart arbeidsinnhold som ikke er ferdigstilt.                                        |
| Ferdigstilt        | En vurderingsrevisjon som saksbehandler anser som komplett og klar for intern godkjenning. |
| Godkjenningspakke  | En frosset samling av én eller flere ferdigstilte vurderingsrevisjoner.                    |
| Godkjenningskjede  | Den ordnede listen over personer som må godkjenne pakken.                                  |
| Saksbehandler      | Ansvarlig person for å utarbeide og ferdigstille BHs vurderinger.                          |
| Godkjenner         | Person som kan godkjenne eller returnere pakken når eget steg er aktivt.                   |
| Publisering        | Opprettelse av BHs offentlige respons-eventer slik at svaret blir tilgjengelig for TE.     |

«Spor» kan fortsatt brukes som intern kodebetegnelse, men skal ikke eksponeres i brukergrensesnittet. UI bruker **Ansvarsgrunnlag**, **Økonomi** og **Frist**.

## 4. Førende arkitekturvalg

### 4.1 Intern behandling er ikke et offentlig BH-svar

Dagens `respons_grunnlag`, `respons_vederlag` og `respons_frist` projiseres direkte inn i `SakState`. De skal derfor ikke opprettes når saksbehandler bare ferdigstiller eller sender et utkast til intern godkjenning.

Eksisterende respons-eventer opprettes først ved publisering etter siste godkjenning.

### 4.2 Intern og ekstern hendelsesstrøm må ha en sikkerhetsgrense

Interne kladder, returkommentarer, godkjenningsbeslutninger og organisasjonsopplysninger må ikke kunne leses av TE gjennom sakens ordinære state-, timeline- eller historikk-endepunkter.

Foretrukket retning er en separat intern godkjenningsstrøm eller et separat approval-aggregat med egen autorisasjon. Dersom samme fysiske eventlager brukes, må synlighet være en eksplisitt og backend-håndhevet del av modellen. Filtrering kun i frontend er ikke tilstrekkelig.

### 4.3 Pakken fryser revisjoner, ikke bare vurderingsidentiteter

En pakke må referere til immutable vurderingsrevisjoner. En liste med bare `vurdering_ids` er ikke tilstrekkelig fordi den logiske vurderingen senere kan få nytt innhold.

### 4.4 Godkjenning og publisering er forskjellige overganger

Siste interne godkjenning betyr at pakken er **godkjent**, men ikke nødvendigvis at respons-eventene er lagret og gjort tilgjengelige for TE. Publisering skal være en egen, idempotent operasjon.

## 5. Anbefalt domenemodell

Modellen under er konseptuell. Feltnavn og lagring kan tilpasses ved implementasjon.

### 5.1 Logisk vurdering

```text
BhVurdering {
  id: string
  sak_id: string
  type: 'grunnlag' | 'vederlag' | 'frist'
  ansvarlig_saksbehandler: UserRef
  aktiv_arbeidsrevisjon_id: string | null
  opprettet_at: timestamp
}
```

`BhVurdering` er den stabile identiteten over tid. Historiske pakker kobles ikke direkte til denne, men til en bestemt revisjon.

### 5.2 Vurderingsrevisjon

```text
BhVurderingRevision {
  id: string
  vurdering_id: string
  revisjon: integer
  status:
    'kladd'
    | 'ferdigstilt'
    | 'til_godkjenning'
    | 'sendt'
    | 'erstattet'

  svarer_pa_te_event_id: string
  svarer_pa_te_versjon: integer
  payload: GrunnlagResponsData | VederlagResponsData | FristResponsData
  innhold_hash: string

  opprettet_at: timestamp
  opprettet_av: UserRef
  ferdigstilt_at: timestamp | null
  ferdigstilt_av: UserRef | null
}
```

Regler:

- En kladd kan oppdateres frem til ferdigstilling.
- Ved ferdigstilling fryses innholdet og `innhold_hash` beregnes.
- En ferdigstilt revisjon som inngår i en aktiv pakke er read-only.
- Ved retur beholdes den returnerte revisjonen uendret. Videre redigering skjer i en ny kladdrevisjon, normalt klonet fra den returnerte.
- En sendt revisjon endres aldri.

Begrepet `tom` bør være en avledet UI-tilstand når ingen vurdering eller kladd finnes, ikke nødvendigvis en lagret revisjon.

### 5.3 Godkjenningspakke

```text
Godkjenningspakke {
  id: string
  sak_id: string
  status:
    'til_godkjenning'
    | 'returnert'
    | 'godkjent'
    | 'sendt'
    | 'publisering_feilet'
    | 'trukket'

  opprettet_av: UserRef
  ansvarlig_saksbehandler: UserRef
  opprettet_at: timestamp

  godkjenningspolicy_id: string
  godkjenningspolicy_versjon: string
  godkjenningsgrunnlag: ApprovalBasis
  godkjenningskjede: ApprovalStep[]
  aktivt_steg_index: integer

  forrige_pakke_id: string | null
  returnert_kommentar: string | null
  returnert_av: UserRef | null
  returnert_at: timestamp | null
  godkjent_at: timestamp | null
  sendt_at: timestamp | null
}
```

`forrige_pakke_id` gjør det mulig å vise sammenheng mellom en returnert pakke og ny innsending uten å mutere historikken.

### 5.4 Pakkeelement

```text
PackageItem {
  pakke_id: string
  vurdering_revision_id: string
  type: 'grunnlag' | 'vederlag' | 'frist'
  svarer_pa_te_event_id: string
  svarer_pa_te_versjon: integer
  innhold_hash: string
  publisert_respons_event_id: string | null
}
```

Pakkens innhold er settet av `PackageItem`. Det skal ikke finnes ett enkelt historisk `pakke_id`-felt på den logiske vurderingen; forholdet er mange-til-mange over tid.

### 5.5 Godkjenningssteg

```text
ApprovalStep {
  indeks: integer
  rolle: string
  bruker: UserRef
  status: 'venter' | 'aktiv' | 'godkjent' | 'returnert'
  besluttet_at: timestamp | null
  kommentar: string | null
}
```

`opprettet_av` er ikke et faktisk godkjenningssteg. UI kan prependere saksbehandleren som en fullført presentasjonsnode når hele forløpet vises.

## 6. Tilstandsmaskiner

### 6.1 Vurderingsrevisjon

```text
kladd -> ferdigstilt -> til_godkjenning -> sendt
                       |
                       +-> pakken returneres
                           gammel revisjon fryses
                           ny kladdrevisjon opprettes

ferdigstilt -> ny kladdrevisjon
               når saksbehandler velger «Revider» før pakkeinnsending
```

`til_godkjenning` kan lagres eller avledes fra medlemskap i en aktiv pakke. Det må finnes én autoritativ regel; status skal ikke kunne komme i konflikt med pakketilstanden.

### 6.2 Godkjenningspakke

```text
[ingen pakke]
    |
    +-- send til godkjenning --> til_godkjenning
                                      |
                                      +-- mellomsteg godkjent
                                      |       -> neste steg aktivt
                                      |
                                      +-- aktiv godkjenner returnerer
                                      |       -> returnert
                                      |
                                      +-- siste steg godkjenner
                                              -> godkjent
                                                   |
                                                   +-- publisering lykkes -> sendt
                                                   +-- publisering feiler -> publisering_feilet
```

`returnert`, `sendt` og `trukket` er terminale for den konkrete pakkeinstansen. En ny behandling oppretter en ny pakke med referanse til den forrige.

## 7. Kommandoer og overganger

### 7.1 Ferdigstill vurdering

Forutsetninger:

- brukeren er ansvarlig saksbehandler eller har delegert redigeringsrett;
- alle obligatoriske domenefelt er gyldige;
- vurderingen svarer på gjeldende TE-revisjon;
- revisjonen inngår ikke i en aktiv pakke.

Resultat:

- revisjonen får status `ferdigstilt`;
- innholdet fryses og hashes;
- vurderingen blir valgbar ved opprettelse av pakke.

### 7.2 Send pakke til godkjenning

Forutsetninger:

- minst én vurderingsrevisjon er ferdigstilt;
- alle valgte revisjoner tilhører samme sak;
- ingen valgt revisjon inngår i en annen aktiv pakke;
- TE-revisjonene som svarene gjelder, er fortsatt gjeldende;
- pakken passerer en samlet konsistenskontroll;
- godkjenningskjeden kan beregnes og inneholder gyldige brukere.

Resultat:

1. Pakkeelementene fryses.
2. Gjeldende godkjenningspolicy og beregnet kjede lagres som snapshot.
3. Første godkjenner blir aktiv.
4. Inkluderte revisjoner låses.
5. Første godkjenner varsles.

### 7.3 Godkjenn steg

Kun brukeren i aktivt steg kan godkjenne.

- Er steget ikke siste steg, aktiveres neste steg.
- Er steget siste steg, går pakken til `godkjent` og publiseringsprosessen startes.
- Samme kommando skal være idempotent og beskyttet av optimistisk låsing.

### 7.4 Returner pakke

Kun aktiv godkjenner kan returnere. Kommentar er obligatorisk.

Resultat:

- pakken får status `returnert`;
- alle inkluderte revisjoner forblir tilgjengelige som frosset historikk;
- saksbehandler får nye redigerbare kladder basert på de returnerte revisjonene;
- returkommentaren blir permanent synlig internt på saken;
- varsling går til `ansvarlig_saksbehandler`, ikke nødvendigvis den opprinnelige tekniske oppretteren dersom ansvar er overført.

Neste innsending oppretter en ny pakke og starter kjeden fra første steg.

### 7.5 Trekk pakke fra godkjenning

Anbefalt standardregel:

- Saksbehandler kan trekke pakken så lenge ingen godkjenner har besluttet noe.
- Tilbaketrekking logges som egen hendelse.
- Etter første godkjenning må pakken returneres av aktiv godkjenner eller håndteres gjennom en særskilt administrativ prosess.

### 7.6 Publiser til TE

Publisering skal:

1. verifisere at pakkeelementer og innholdshasher fortsatt stemmer;
2. verifisere at svarene fortsatt gjelder forventede TE-revisjoner;
3. opprette alle inkluderte offentlige respons-eventer atomisk;
4. bruke `respons_*` for første svar og `respons_*_oppdatert` for senere svar;
5. lagre koblingen mellom pakkeelement og publisert respons-event;
6. opprette en idempotent outbox-jobb for eksterne varsler/integrasjoner;
7. markere pakken `sendt` når de offentlige respons-eventene er varig lagret.

Feil ved e-post eller Catenda-varsling skal kunne prøves på nytt uten å duplisere respons-eventene. Varselet er en sideeffekt av publiseringen, ikke selve juridiske responsen i appen.

## 8. Sikkerhet og rettigheter

| Handling                                        | Saksbehandler | Aktiv godkjenner |            Senere godkjenner |  TE |
| ----------------------------------------------- | ------------: | ---------------: | ---------------------------: | --: |
| Redigere kladd                                  |            Ja |              Nei |                          Nei | Nei |
| Ferdigstille vurdering                          |            Ja |              Nei |                          Nei | Nei |
| Revidere ferdigstilt vurdering uten aktiv pakke |            Ja |              Nei |                          Nei | Nei |
| Opprette og sende pakke                         |            Ja |              Nei |                          Nei | Nei |
| Se intern pakke                                 |            Ja |               Ja |        Anbefalt: lesetilgang | Nei |
| Godkjenne eller returnere                       |           Nei |               Ja |                          Nei | Nei |
| Se returkommentar                               |            Ja |               Ja | Internt etter tilgangspolicy | Nei |
| Se publisert svar                               |            Ja |               Ja |                           Ja |  Ja |

Supplerende regler:

- Backend må håndheve alle rettigheter; skjulte knapper er ikke tilgangskontroll.
- En godkjenner skal normalt ikke godkjenne egen pakke dersom samme person også er saksbehandler.
- Duplikate personer i kjeden må avvises eller normaliseres etter eksplisitt policy.
- Delegering, fravær og omfordeling må logges.

## 9. Forretningsregler og invarianter

1. Bare ferdigstilte vurderingsrevisjoner kan inngå i en pakke.
2. Pakken inneholder minst én vurderingsrevisjon.
3. Alle pakkeelementer tilhører samme sak.
4. En revisjon kan bare inngå i én aktiv pakke om gangen.
5. Pakkeinnhold, kjede, policyversjon og innholdshasher er frosset ved innsending.
6. Sendte og returnerte revisjoner muteres aldri.
7. Bare aktiv godkjenner kan beslutte pakken.
8. Retur krever kommentar.
9. Pakkesummer beregnes bare fra inkluderte vurderinger.
10. Ubehandlede eller utelatte vurderinger vises separat og inngår ikke i summer.
11. Offentlige BH-responser opprettes først etter siste godkjenning.
12. Alle offentlige respons-eventer i samme pakke publiseres atomisk.
13. Publisering og varsling er idempotent.
14. Interne data er aldri tilgjengelige gjennom TE-endepunkter.
15. Revisjonen må uttrykkelig referere til TE-eventet og TE-versjonen den besvarer.

## 10. Utdaterte svar og samtidighet

TE kan revidere ansvarsgrunnlag, vederlagskrav eller fristkrav mens BH arbeider eller mens en pakke ligger til godkjenning.

Anbefalt regel:

- Hvis TE reviderer et krav som en ferdigstilt eller innsendt BH-vurdering besvarer, merkes vurderingen og pakken som **utdatert**.
- Godkjennere kan fortsatt lese innholdet og årsaken til at det ble utdatert.
- Endelig godkjenning/publisering blokkeres til saksbehandler har kontrollert og ferdigstilt en vurderingsrevisjon mot den nye TE-versjonen.
- Det skal ikke skje en stille automatisk flytting av BH-svaret til den nye TE-versjonen.

Alle kommandoer bør bruke forventet aggregat-/streamversjon for å hindre dobbeltgodkjenning, godkjenning etter retur og andre kappløp.

## 11. Tverrgående konsistens

Ansvarsgrunnlag, økonomi og frist er selvstendige vurderinger, men resultatene kan ha tverrgående betydning, særlig ved subsidiære standpunkt.

Ved pakkeinnsending og før publisering skal systemet derfor kjøre en samlet preflight som blant annet kontrollerer:

- at økonomi- og fristvurderinger bruker korrekt prinsipalt/subsidiært standpunkt sett opp mot ansvarsgrunnlaget;
- at beløp og dager samsvarer med den revisjonen TE har sendt;
- at ingen inkluderte vurderinger er foreldet;
- at kombinasjonen kan representeres av dagens respons-eventtyper;
- at utelatte vurderinger ikke feilaktig påvirker pakkesummer eller formuleringer.

Backendens projiserte `SakState` skal fortsatt være sannhetskilden for offentlig saksstatus og subsidiær presentasjon etter publisering.

## 12. Godkjenningspolicy

Godkjenningskjeden bør beregnes ved pakkeinnsending og lagres som snapshot. Senere endring av prosjektets policy skal ikke endre en aktiv pakke.

Policyen kan på sikt vurdere:

- BHs godkjente beløp;
- prinsipalt og subsidiært økonomisk eksponeringsbeløp;
- kravets art eller resultat;
- prosjektspesifikke fullmakter;
- organisatorisk manager-kjede;
- særskilte roller ved frist eller prinsipielle avslag.

Det må avklares hvilket beløp som styrer fullmaktsnivået. `total_krevd` bør ikke bygges inn som eneste grunnlag uten en eksplisitt forretningsbeslutning.

Godkjenningspakken lagrer minst:

```text
ApprovalBasis {
  beregningsregel: string
  belop: number | null
  dager: number | null
  resultattyper: string[]
  forklaring: string
}
```

Dette gjør det mulig å forklare i ettertid hvorfor akkurat denne kjeden ble valgt.

## 13. Eventmodell

### 13.1 Interne godkjenningshendelser

Foreløpig navneforslag:

```text
bh_vurdering_ferdigstilt
godkjenningspakke_sendt
godkjenningssteg_godkjent
godkjenningspakke_returnert
godkjenningspakke_trukket
godkjenningspakke_godkjent
godkjenningspakke_publisering_feilet
godkjenningspakke_publisert
```

Kladde-autolagring trenger ikke nødvendigvis være domen events. Den kan lagres som arbeidsdata frem til ferdigstilling.

### 13.2 Offentlige hendelser

Ved vellykket publisering gjenbrukes eksisterende eventtyper:

```text
respons_grunnlag
respons_grunnlag_oppdatert
respons_vederlag
respons_vederlag_oppdatert
respons_frist
respons_frist_oppdatert
```

Payloaden bør få `godkjenningspakke_id` og `vurdering_revision_id` som revisjons-/auditreferanser dersom dette kan gjøres uten å bryte eksisterende konsumenter.

### 13.3 Aggregat og projeksjon

Godkjenningsflyten bør få en egen ren domenemodul, for eksempel `approvalPackageDomain`, og en egen backend-projektør/service. `SakState` skal ikke fylles med interne kladder eller returkommentarer som deretter må skjules for TE.

En begrenset, rollefiltrert approval-summary kan senere kobles på BHs saksvisning.

## 14. Foreløpig UI-mapping

Dette er bare en inventarliste for senere UI-utforskning.

| Situasjon                                        | Primærvisning                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Redigerer vurdering                              | Eksisterende BH-svarskjema med «Ferdigstill» i stedet for direkte sending      |
| Blanding av ferdigstilte og uferdige vurderinger | Saksoversikt med tydelig modenhet per vurdering                                |
| Oppretter pakke                                  | Bekreftelsesvisning med inkludert/utelatt innhold, summer og godkjenningskjede |
| Pakke til godkjenning                            | Read-only innhold, aktivt steg og status på kjeden                             |
| Pakke returnert                                  | Vedvarende returmelding og handling for å revidere                             |
| Pakke godkjent/publiseres                        | Kort mellomstatus; ingen redigering                                            |
| Pakke sendt                                      | Kvittering og kobling til de publiserte svarene                                |
| Godkjennerens visning                            | Pakkeorientert leseflate med «Godkjenn» og «Returner»                          |

Venstrepanelet har to hovedmodi:

- **Vurderingsmodus:** Navigasjon mellom Ansvarsgrunnlag, Økonomi og Frist.
- **Pakkemodus:** Inkludert/utelatt innhold, summer, saksbehandler og godkjenningskjede.

Modus skal avledes fra rolle og domenetilstand, ikke fra en separat UI-only status.

### UI-spørsmål som må utforskes senere

- Hvordan vise flere samtidige eller historiske pakker uten å gjøre saken uoversiktlig?
- Hvordan kommunisere at én vurdering er sendt mens andre fortsatt er kladd?
- Skal returkommentaren kunne målrettes mot én vurdering i tillegg til obligatorisk samlet kommentar?
- Hvordan sammenligne returnert og revidert innhold?
- Hvordan vise en utdatert pakke etter ny TE-revisjon?
- Hvordan presentere fullmaktsgrunnlag og godkjenningskjede uten å eksponere unødvendige personopplysninger?
- Hvordan fungerer pakkegodkjenning på liten skjerm og med tastatur/skjermleser?

## 15. Åpne beslutninger

Disse må avklares før implementasjonsplanen skrives.

| Tema                               | Foreløpig anbefaling                                                      | Status   |
| ---------------------------------- | ------------------------------------------------------------------------- | -------- |
| Fast eller dynamisk kjede          | Prosjektkonfigurert og dynamisk, snapshot ved innsending                  | Åpen     |
| Beløpsgrunnlag for fullmakt        | Bruk eksplisitt eksponering/godkjent beløp, ikke automatisk TEs krav      | Åpen     |
| Ny runde etter retur               | Ny pakke fra første godkjenner, med referanse til forrige                 | Anbefalt |
| Flere pakker per sak               | Ja                                                                        | Anbefalt |
| Tilbaketrekking før behandling     | Tillat frem til første beslutning                                         | Åpen     |
| Revisjon etter sending             | Ny vurderingsrevisjon, ny pakke, deretter `respons_*_oppdatert`           | Anbefalt |
| Senere godkjenneres innsyn         | Read-only fra innsending, handling først når aktiv                        | Åpen     |
| Returkommentar                     | Én obligatorisk samlet kommentar; vurder valgfri målretting per vurdering | Åpen     |
| TE reviderer under godkjenning     | Blokker publisering og krev ny BH-revisjon                                | Anbefalt |
| Delegering/stedfortreder           | Må støttes og auditeres                                                   | Åpen     |
| Saksbehandler slutter/bytter rolle | Returner til nåværende ansvarlig saksbehandler                            | Åpen     |
| Tom godkjenningskjede              | Må ha eksplisitt prosjektpolicy; ikke anta automatisk sending             | Åpen     |

## 16. Test- og akseptansekriterier

Før produksjonssetting skal minst følgende dokumenteres med domenetester og integrasjonstester:

1. Kladd og tom vurdering kan ikke legges i pakke.
2. Pakke med én, to og tre vurderinger fungerer.
3. Utelatte vurderinger påvirker ikke summer.
4. Pakkeelementenes innhold kan ikke endres etter innsending.
5. Kun aktiv godkjenner kan godkjenne eller returnere.
6. Godkjenningsrekkefølgen tåler duplikate/idempotente kall.
7. Retur uten kommentar avvises.
8. Retur bevarer gammel revisjon og oppretter ny redigerbar arbeidsrevisjon.
9. Ny innsending etter retur starter korrekt kjede og bevarer koblingen til forrige pakke.
10. TE-revisjon under godkjenning gjør berørte elementer utdaterte og blokkerer publisering.
11. Siste godkjenning publiserer alle offentlige respons-eventer atomisk.
12. Retry etter publiseringsfeil dupliserer ikke respons-eventer.
13. Varslingsfeil kan prøves på nytt uten å endre juridisk svarstatus.
14. Revisjon etter tidligere sendt svar bruker korrekt `respons_*_oppdatert`.
15. TE kan ikke hente interne pakke-events, kommentarer, kladder eller kjedeinformasjon.
16. Policyendring påvirker ikke allerede innsendt pakke.
17. Optimistisk låsing hindrer godkjenning etter at pakken er returnert eller trukket.
18. Prinsipale og subsidiære resultater blir konsistente i publisert `SakState`.

## 17. Foreslått implementasjonsrekkefølge

### Fase 0 — Forretningsavklaringer

- Avklar godkjenningspolicy og fullmaktsgrunnlag.
- Avklar delegering, innsyn og administrativ overstyring.
- Beslutt returkommentarens granularitet.
- Beslutt nøyaktig regel ved ny TE-revisjon.

### Fase 1 — Ren domenemodell

- Definer typer og statsmaskiner.
- Implementer valideringsfunksjoner og preflight.
- Skriv domenetester for alle overganger og invarianter.

### Fase 2 — Intern lagring og autorisasjon

- Etabler approval-aggregat/intern hendelsesstrøm.
- Implementer rolle- og organisasjonsgrense.
- Implementer revisjoner, pakkeelementer og optimistisk låsing.

### Fase 3 — Publiseringsadapter

- Oversett godkjente vurderingsrevisjoner til eksisterende respons-eventer.
- Implementer atomisk batch, idempotens og outbox.
- Verifiser eksisterende `SakState`-projeksjon.

### Fase 4 — UI-spesifikasjon og prototype

- Utforsk saksbehandler-, godkjenner- og returflyt.
- Avklar venstrepanel, pakkeoppsummering og historikk.
- Test de viktigste tilstandene visuelt før full implementasjon.

### Fase 5 — Integrasjoner og drift

- Varsling i app/e-post/Teams.
- Manager-/organisasjonsoppslag.
- Retry, observability og administrativ feilretting.

## 18. Sjekkliste når arbeidet gjenopptas

1. Les dette dokumentet og kontroller om åpne beslutninger er avklart.
2. Gå gjennom dagens `EventType`, responsmodeller og `TimelineService`; de kan ha endret seg.
3. Verifiser dagens tilgangsmodell for BH og TE før intern eventlagring designes.
4. Kartlegg hvordan godkjenningskjeden faktisk skal hentes og fryses.
5. Bestem transaksjonsgrensen mellom approval-lagring, offentlige responseventer og outbox.
6. Lag en liten UI-prototype som dekker minst: delvis ferdig sak, pakkeinnsending, aktiv godkjenner, retur, utdatert pakke og delvis sendt sak.
7. Skriv en separat implementasjonsplan med migrering, endepunkter og teststrategi.

## 19. Relevante deler av dagens kodebase

Ved senere implementasjon bør minst disse delene vurderes på nytt:

- `backend/models/events.py` — eksisterende eventtyper og respons-payloads
- `backend/models/sak_state.py` — offentlig, projisert saksstatus
- `backend/services/timeline_service.py` — hvordan respons-eventer påvirker `SakState`
- `backend/services/business_rules.py` — overgangs- og rollevalidering
- `backend/routes/event_routes.py` — publisering, batch, versjonering og tilgang
- `backend/repositories/supabase_event_repository.py` — lagring og transaksjonsmuligheter
- `src/lib/types/timeline.ts` — frontendens event- og statekontrakter
- `src/lib/domain/grunnlagDomain.ts`
- `src/lib/domain/vederlagDomain.ts`
- `src/lib/domain/fristDomain.ts`

## 20. Kort oppsummering

```text
VURDERING
  redigerbar kladd
      -> ferdigstilt, immutable revisjon
      -> inkludert i frosset godkjenningspakke
      -> sendt etter godkjenning og publisering

RETUR
  gammel revisjon og pakke bevares
      -> ny kladdrevisjon
      -> ny pakke
      -> hele kjeden starter på nytt

PAKKE
  til_godkjenning
      -> returnert
      -> godkjent -> sendt
                    -> publisering_feilet -> retry

SYNLIGHET
  intern behandling er BH-intern
  TE ser først eksisterende respons-eventer etter publisering
```
