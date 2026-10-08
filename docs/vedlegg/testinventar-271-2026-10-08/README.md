# Testinventar for spor D: Grunnlag for #271

**Dato:** 2026-10-08  
**Undersøkt commit:** `98a06534cb0b447b30fff00e4a9c84bc861e2c77` (`origin/main`)  
**Tilknyttet issue:** [#271](https://github.com/khjohns/endringsmeldinger/issues/271) (B-14: etabler domenetabell og språkuavhengige bevis-saker før ombygging)  
**Autoritativ plan for funn- og vedtaksstatus:** `docs/plans/2026-09-16-godkjenning-og-varig-levering.md`  

Dette dokumentet samler et etterprøvbart historisk testinventar over eksisterende reproduksjonstester fra strukturkartleggingen av spor D, som underlag for implementeringen av #271. Dokumentet er et historisk bevisgrunnlag og erstatter ikke løpende status i hovedplanen.

---

## 1. Omfang og opptelling

Analysen er avgrenset til de to etablerte reproduksjonsfilene fra strukturkartleggingen (PR #266, 2026-10-05):
1. `backend/tests/test_services/test_strukturkartlegging_spor_d.py`
2. `src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts`

Opptellingen er utført med skriptet `tell_tester.py` (inkludert i denne mappen), som benytter Python AST for backend og en linjebasert tekstparser for frontend. Resultatene er deretter kontrollert manuelt mot kildekoden.

### Oppsummering av testinventaret

| Kategori | Backend (`.py`) | Frontend (`.test.ts`) | Totalt |
|---|---|---|---|
| **Totalt antall tester / testblokker** | **9** | **6** | **15** |
| Tester med forventet feil (`xfail` / `it.fails`) | 9 | 4 | 13 |
| Ordinære kontroll- og forutsetningstester | 0 | 2 | 2 |
| Tester med `skip` | 0 | 0 | 0 |
| Parametriserte testtilfeller | 0 | 0 | 0 |
| **Nærstudert utvalg (krav/svar/aksept og låsing)** | **7** | **1** | **8** |
| Utenfor utvalget | 2 | 5 | 7 |

### Tester utenfor det nærstuderte utvalget
Følgende tester inngår i totalinventaret, men ble prioritert bort fra 8-testutvalget for å spisse kartleggingen mot kjerneområdene i #271:
- `backend/tests/test_services/test_strukturkartlegging_spor_d.py`:
  - `test_frafall_med_godtatte_avslag_gir_ikke_ukjent` (L370, SK-04 / issue #257: rollup for samlet sakstilstand).
  - `test_grunnlagsaarsaken_behandles_likt_i_vederlag_og_frist` (L397, issue #234: lagring av `subsidiaer_triggers` i responsdata).
- `src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts`:
  - `it.fails('viser det gamle fristsvaret som subsidiært, som serveren')` (L39, issue #250: fristvarianten av vederlagstesten i samme blokk).
  - `it('forutsetning: grunnlaget har ikke noe svar')` (L30, ordinær kontrolltest foran #250).
  - `it('forutsetning: samme sak som OMFORENT gir ingen oppgaver og står som lukket')` (L59, ordinær kontrolltest foran #229).
  - `it.fails('gir ingen oppfølgingsoppgaver i en sak backend har lukket')` (L64, issue #229: oppfølgingsoppgaver for `LUKKET_AVSLATT`).
  - `it.fails('står under «Avklarte og lukkede» i oversikten')` (L68, issue #229: saksoversiktsfiltrering for `LUKKET_AVSLATT`).

---

## 2. Nærstudert utvalg (8 tester)

Utvalget er prioritert etter kravene i #271: varsellåsing, kravets livssyklus, oppheving av aksept ved nytt krav, låsing av svar mot revisjon, aksept av § 32.2-preklusjon, samt svarkombinasjoner og tilstandsutledning.

Forventningens kilde skilles fra testens interne begrunnelse (som kun dokumenterer hva testforfatteren mente). Hver forventning viser til et konkret vedtak eller en bestemmelse i hovedplanen (avsnitt 3.1), og angir om tolkningen er avklart, foreløpig eller mangler grunnlag.

### Beleggsformer
Belegg merkes etter [hovedplanen §1.3](../../plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
- **K:** Kjørt og faktisk observert (med dato og referanse til `kjoringer.txt`).
- **L:** Lest ut av koden (forretningsregler og hendelsesforløp analysert uten separat kjøring).

Kilden til forventningen (vedtak i hovedplanen 3.1) står i kolonnen for funn-ID og issue. Den er ikke et belegg for testutfallet.

| # | Fil og eksakt symbolnavn | Belegg | Markering, strict og begrunnelse | Dokumentert funn-ID og issue | Konkret målassertion | Forutsetninger og kontrollpunkter | Hva som kan feile før målassertionen |
|---|---|---|---|---|---|---|---|
| **1** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_varseldatoen_kan_ikke_flyttes_av_et_senere_krav` (L461) | **K** (08.10) | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «SK-12: et senere fristkrav kan flytte datoen for varselet etter § 33.4» | **SK-12**<br>[Issue #264](https://github.com/khjohns/endringsmeldinger/issues/264)<br>(Vedtak 05.10, hovedplanen 3.1) | `assert not forlop.valider(flyttet).is_valid` (L479) | Sak med EO-grunnlag; varsel sendt 2026-09-02; kontrollpunkt på L474 bekrefter at uendret varseldato godtas; spesifisering med endret dato (2026-08-01) fremsettes. | `Forlop.legg_til` feiler; kontrollpunkt på L474 feiler med `pytest.fail("Kontrollsak: spesifiseringen avvises også med uendret varseldato")`. |
| **2** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar` (L271) | **K** (08.10) | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «SK-02: et oppdatert krav etter full godkjenning beholder status GODKJENT, og saken blir OMFORENT med et krav byggherren ikke har svart på» | **SK-02**<br>[Issue #256](https://github.com/khjohns/endringsmeldinger/issues/256)<br>(Vedtak 05.10, hovedplanen 3.1) | `assert sak.vederlag.status == SporStatus.SENDT` (L284)<br>*Ikke nådd i kjøring:*<br>`assert sak.overordnet_status != "OMFORENT"` (L285)<br>`assert sak.kan_utstede_eo is False` (L286) | Sak med godkjent grunnlag og fullt godkjent vederlag (100 000 kr); forutsetningskontroll L276 bekrefter `vederlag.status == GODKJENT`; TE sender oppdatert krav (250 000 kr); forutsetningskontroll L282 bekrefter nytt kravbeløp og godkjent frist. | `Forlop.legg_til` avviser hendelser underveis; kontroll på L276 eller L282 feiler med `pytest.fail`. |
| **3** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_oppdatert_krav_etter_aksept_opphever_aksepten` (L297) | **L** | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «SK-02: et oppdatert krav etter at TE har godtatt svaret, lar status GODKJENT og aksepten stå» | **SK-02**<br>[Issue #256](https://github.com/khjohns/endringsmeldinger/issues/256)<br>(Vedtak 05.10, hovedplanen 3.1) | `assert sak.vederlag.te_akseptert is False` (L308)<br>`assert sak.vederlag.status == SporStatus.SENDT` (L309) | Sak med delvis godkjent vederlag; TE aksepterer svaret; forutsetningskontroll L303 bekrefter at `te_akseptert == True`; TE sender oppdatert krav (80 000 kr). | Opprettelse/aksept avvises i `Forlop.legg_til`; kontroll på L303 feiler med `pytest.fail("Forutsetning: aksepten er ikke registrert")`. |
| **4** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_trukket_krav_kan_ikke_oppdateres` (L317) | **L** | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «SK-02: et trukket krav kan oppdateres, og sporet står som TRUKKET» | **SK-02**<br>[Issue #256](https://github.com/khjohns/endringsmeldinger/issues/256)<br>(Vedtak 05.10, hovedplanen 3.1) | `assert not forlop.valider(forlop.vederlagskrav(50000.0, oppdatert=True)).is_valid` (L339) | Sak med vederlagskrav; kontrollpunkt L325 bekrefter at oppdatering godtas før tilbaketrekking; krav trekkes (`WithdrawalEvent`); forutsetningskontroll L337 bekrefter `vederlag.status == TRUKKET`. | Kontrollpunkt L325 feiler med `pytest.fail("Kontrollsak: oppdateringen avvises også uten tilbaketrekking")`; tilbaketrekking avvises; kontroll L337 feiler med `pytest.fail`. |
| **5** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_byggherren_kan_ikke_revidere_et_godtatt_svar` (L347) | **L** | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «SK-03: byggherren kan revidere et svar TE har godtatt» | **SK-03**<br>[Issue #256](https://github.com/khjohns/endringsmeldinger/issues/256)<br>(Vedtak 05.10, hovedplanen 3.1) | `assert not forlop.valider(revisjon).is_valid` (L359) | Sak med delvis godkjent vederlagssvar; kontrollpunkt L354 bekrefter at revisjon godtas før aksept; TE aksepterer svaret; BH forsøker revisjon på nytt. | Hendelser avvises i `legg_til`; kontrollpunkt L354 feiler med `pytest.fail("Kontrollsak: revisjonen avvises også før aksepten")`; aksept avvises. |
| **6** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_godtatt_preklusjon_etter_32_2_er_godtatt_avslag` (L245) | **L** | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «SK-01: TE kan godta en § 32.2-preklusjon; grunnlaget blir GODKJENT, saken OMFORENT og EO kan utstedes mens vederlag og frist er subsidiære» | **SK-01** (og SK-05)<br>[Issue #255](https://github.com/khjohns/endringsmeldinger/issues/255)<br>(Vedtak 05.10, hovedplanen 3.1 & #213) | `assert sak.grunnlag.status == SporStatus.AVSLATT_AKSEPTERT` (L258)<br>`assert sak.overordnet_status == "LUKKET_AVSLATT"` (L259)<br>`assert sak.kan_utstede_eo is False` (L260) | Sak med IRREG-grunnlag; BH svarer GODKJENT, men `varslet_i_tide=False`; vederlag/frist godkjennes; forutsetningskontroll L253 bekrefter at grunnlag er `UNDER_FORHANDLING` og vederlag subsidiært; TE aksepterer grunnlagssvaret. | Hendelsesoppbygging feiler; forutsetningskontroll L253 feiler med `pytest.fail("Forutsetning: § 32.2-preklusjonen gir ikke tvist og subsidiært vederlag")`; aksept avvises. |
| **7** | `backend/tests/test_services/test_strukturkartlegging_spor_d.py`<br>`test_frafall_kan_ikke_kombineres_med_preklusjon_etter_32_2` (L423) | **L** | `@pytest.mark.xfail(strict=True, raises=AssertionError)`<br>Begrunnelse: «#235: frafall godtas sammen med at grunnlaget er varslet for sent (§ 32.2)» | **Uavklart SK-ID**<br>[Issue #235](https://github.com/khjohns/endringsmeldinger/issues/235)<br>(Vedtak 05.10 under B-14, hovedplanen 3.1) | `assert not forlop.valider(svar).is_valid` (L435) | Sak med IRREG-grunnlag og vederlagskrav; kontrollpunkt L432 bekrefter at frafall med `varslet_i_tide=True` godtas; respons konstrueres med `resultat=FRAFALT` og `varslet_i_tide=False`. | Hendelsesoppbygging feiler; kontrollpunkt L432 feiler med `pytest.fail("Kontrollsak: frafall avvises også når grunnlaget er varslet i tide")`. |
| **8** | `src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts`<br>`'viser det gamle vederlagssvaret som subsidiært, som serveren'` (L35) | **L** | `it.fails`<br>Begrunnelse: Dokumentert i describe-blokk: «#250: svar som var subsidiært da grunnlagssvaret falt» (jf. vedtak 05.10 under B-13 / #215) | **Uavklart SK-ID**<br>[Issue #250](https://github.com/khjohns/endringsmeldinger/issues/250)<br>(Hovedplanen 3.1) | `expect(svaretErSubsidiaert(sakDerGrunnlagssvaretHarFalt(), 'vederlag')).toBe(true)` (L36) | Mocktilstand fra `sakDerGrunnlagssvaretHarFalt()`: grunnlagets svar er fjernet (`bh_resultat = undefined`), vederlag har `bh_resultat = 'godkjent'` og `subsidiaert_til_nytt_svar = 'avslatt'`. *Merk:* Separat test på L30 kontrollerer oppsettet, men er ingen runtime-port som hindrer L35 i å kjøre. | Type- eller importfeil i Vitest; eventuelle endringer i mockstrukturen. |

---

## 3. Faktiske testkjøringer

To backend-reproduksjoner ble kjørt isolert i minnet mot nøyaktig node-ID. Kjøringene krever ingen database eller nettverkstilgang. Et bearbeidet kjørereferat med traceback-utdrag finnes i `kjoringer.txt`.

### Test 1: `test_varseldatoen_kan_ikke_flyttes_av_et_senere_krav` (SK-12)
- **Node-ID:** `tests/test_services/test_strukturkartlegging_spor_d.py::test_varseldatoen_kan_ikke_flyttes_av_et_senere_krav`
- **Normal kjøring:** Exitkode `0` (`1 xfailed`). **Med `--runxfail`:** Exitkode `1` (`1 failed`).
- **Forutsetninger:** Sak med EO-grunnlag. Varsel sendt 2026-09-02. Kontrollsaken (uendret varseldato) passeres.
- **Handlinger:** En spesifisering med endret varseldato (2026-08-01) fremsettes.
- **Forventet resultat:** Valideringen avviser spesifiseringen (skal returnere `is_valid=False`).
- **Observert avvik:** Spesifiseringen ble godkjent. Målassertion feilet på L479 med `AssertionError: assert not True` (hvor `True` er `is_valid`). **Observert reproduksjon.**

### Test 2: `test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar` (SK-02)
- **Node-ID:** `tests/test_services/test_strukturkartlegging_spor_d.py::test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar`
- **Normal kjøring:** Exitkode `0` (`1 xfailed`). **Med `--runxfail`:** Exitkode `1` (`1 failed`).
- **Forutsetninger:** Sak med godkjent grunnlag og fullt godkjent vederlag (100 000 kr, `SporStatus.GODKJENT`).
- **Handlinger:** TE sender et oppdatert krav på vederlag (250 000 kr).
- **Forventet resultat:** Vederlagsstatus går tilbake til `SENDT`. Saken er ikke lenger `OMFORENT`, og kan ikke utstede EO.
- **Observert avvik:** Vederlagsstatus forble `GODKJENT`. Første målassertion feilet på L284 med `AssertionError: assert <SporStatus.GODKJENT: 'godkjent'> == <SporStatus.SENDT: 'sendt'>`. Påstandene om overordnet status og `kan_utstede_eo` ble ikke nådd i kjøringen, og bygger på kodelesing.

---

## 4. Begrepsavklaring som grunnlag for domenetabellen (#271)

*Dette er en foreløpig og avgrenset oversikt. Definisjonene av krav, svar og sporstatus må ikke leses som autoritative gjennom dette inventaret. Særlig eksemplet med preklusjon etter § 32.2 må fremstå utelukkende som ett undersøkt tilfelle.*

En sentral årsak til feilene identifisert i reproduksjonene er uklar begrepsbruk i dagens kodebase. Domenetabellen i #271 eier definisjonen av disse begrepene:

| Begrep | Betydning i domenet | Eksempel på dagens sammenblanding |
|---|---|---|
| **Krav** | TEs formelle kravmelding (beløp, dager, beregningsmetode, underkategori). Bærer versjonsnummer. | I `TimelineService` behandles et nytt krav (`VEDERLAG_KRAV_OPPDATERT`) bare som en oppdatering av krevde verdier, uten å nullstille sporets standpunkt. |
| **Svar / Respons** | BHs formelle standpunkt til et konkret krav (godkjent, delvis, avslått, frafalt, prekludert etter § 32.2). | BHs vurderinger fra et *forrige svar* blir stående som gjeldende selv om TE har sendt et *nytt krav*. |
| **Aksept** | TEs bindende aksept av et svar fra BH. | Aksepten blir stående (`te_akseptert == True`) selv etter at TE fremsetter et nytt krav (SK-02). |
| **Sporstatus** | Sporets samlede tilstand (`SENDT`, `UNDER_FORHANDLING`, `GODKJENT`, `AVSLATT_AKSEPTERT`, `TRUKKET`, `FRAFALT`). | Sporet beholder status `GODKJENT` etter at nytt krav er sendt inn, fordi oppdateringen ikke overstyrer sporets status. |

Dette viser hvorfor begrepsavklaringen i #271 må etableres før ny logikk implementeres: logikken kan ikke skille mellom opphevet aksept og nytt svar uten at begrepene er entydig skilt i hendelses- og tilstandsmodellen.

---

## 5. Feilklasser og isolert feilinnføring

I tråd med prosjektets krav om at testbevis skal bekrefte testens følsomhet (jf. mutasjonskravet i issue #271), skal den som retter feilene, ikke bare gjøre disse testene ordinære (grønne) ved retting, men også etterprøve dem med **målrettet feilinnføring (mutasjon)** i en isolert arbeidskopi:

1. **Feilklasse 1 (Varsellåsing, SK-12):**
   - *Test:* `test_varseldatoen_kan_ikke_flyttes_av_et_senere_krav`.
   - *Feilinnføring etter retting:* Tillat at `frist_varsel.dato_sendt` i en spesifisering avviker fra det opprinnelige varselet uten å avvises.
   - *Forventet virkning:* Testen skal bli rød på L479.
2. **Feilklasse 2 (Kravets livssyklus og akseptopphevelse, SK-02):**
   - *Tester:* `test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar` og `test_oppdatert_krav_etter_aksept_opphever_aksepten`.
   - *Feilinnføring etter retting:* La `TimelineService` beholde status `GODKJENT` eller beholde `te_akseptert = True` ved innkommende `VEDERLAG_KRAV_OPPDATERT`.
   - *Forventet virkning:* Testene skal bli røde på henholdsvis L284 og L308.
3. **Feilklasse 3 (Låsing av trukket krav, SK-02):**
   - *Test:* `test_trukket_krav_kan_ikke_oppdateres`.
   - *Feilinnføring etter retting:* Fjern valideringsskranken som avviser oppdatering av et krav som står i status `TRUKKET`.
   - *Forventet virkning:* Testen skal bli rød på L339.
4. **Feilklasse 4 (Låsing av godtatt svar, SK-03):**
   - *Test:* `test_byggherren_kan_ikke_revidere_et_godtatt_svar`.
   - *Feilinnføring etter retting:* Tillat at BH sender revidert respons selv om TE har registrert aksept (`te_akseptert == True`).
   - *Forventet virkning:* Testen skal bli rød på L359.
5. **Feilklasse 5 (Godtatt preklusjon, SK-01):**
   - *Test:* `test_godtatt_preklusjon_etter_32_2_er_godtatt_avslag`.
   - *Feilinnføring etter retting:* Sett status blindt til `GODKJENT` ved aksept uten å sjekke om grunnlaget var prekludert etter § 32.2.
   - *Forventet virkning:* Testen skal bli rød på L258.
6. **Feilklasse 6 (Uforenlig svarkombinasjon, #235):**
   - *Test:* `test_frafall_kan_ikke_kombineres_med_preklusjon_etter_32_2`.
   - *Feilinnføring etter retting:* Tillat respons med `resultat=FRAFALT` kombinert med `grunnlag_varslet_i_tide=False`.
   - *Forventet virkning:* Testen skal bli rød på L435.
7. **Feilklasse 7 (Overgangstilstand i frontend, #250):**
   - *Test:* `'viser det gamle vederlagssvaret som subsidiært, som serveren'`.
   - *Feilinnføring etter retting:* La `svaretErSubsidiaert` i `derive.ts` kun sjekke `grunnlag.bh_resultat` og ignorere `subsidiaert_til_nytt_svar`.
   - *Forventet virkning:* Testen skal bli rød på L36.

---

## 6. Verifikasjon og grenser

- **Hva som er kontrollert ved faktisk kjøring (K):**
  - Standardkjøring og `--runxfail` for nøyaktig to backend-tester (`SK-12` og `SK-02`).
  - At modulimportene (`models`, `regler`, `services`) i Python faktisk ble løst fra den kontrollerte arbeidskopien.
  - Kjøring av analysekriptet `tell_tester.py` mot de to filene.
- **Hva som kun er kodelesing (L):**
  - De resterende 6 testene i tabellen (test 3, 4, 5, 6, 7 og 8).
  - Påstandene om `overordnet_status` og `kan_utstede_eo` i test 2 (kjøringen stoppet ved L284).
- **Hva som ikke er kontrollert:**
  - Ingen tester i Vitest er kjørt i denne runden.
  - Ingen databasetester eller ende-til-ende-flyter via `/api/events` er kjørt.
  - Ingen endringer i produksjonskode eller testkode er forsøkt eller verifisert.
