# Gjennomføring: innsigelse og forespørsel på et nøytralt fristvarsel — 2026-10-04

**Dato:** 2026-10-04. **Grunnlag:** `afec017` (`main`). **Forrige ledd:**
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md), vedtaket om
nøytralt fristvarsel i 3.1 og radene TFR-06 og DRF-01 i 4.2;
[oppdraget for B-13](prompt-b13-backend-eier-reglene-2026-09-23.md), del 2
punkt 3; [gjennomføringen av spor D](gjennomforing-spor-d-2026-09-23.md#tfr-06-fullt-svar-på-et-nøytralt-fristvarsel);
[kartleggingen av frontendens domeneregler](kartlegging-domeneregler-frontend-2026-09-23.md#drf-01-forespørselen-etter--3362-når-ikke-journalen).
Issue #62.

Appen er ikke i produksjon og har ingen reelle data. Status for hvert funn står
i hovedplanen, med en datert merknad i raden.

## Utfall

| ID | Utfall | Belegg |
| --- | --- | --- |
| TFR-06 | Rettet. Et svar med dager avvises til kravet har dager | K 2026-10-04 |
| DRF-01 | Rettet. Forespørselen er en egen hendelse med brev | K 2026-10-04 |

## Oppdragsgivers svar 2026-10-04

Oppdragsgiver ga ordlyden i NS 8407 §§ 5, 33.4–33.8 og svarte på tre
spørsmål:

1. **To hendelsestyper**, `frist_innsigelse_sendt` og
   `frist_foresporsel_sendt`, hver med eget brev. Vil BH begge deler, sendes de
   etter hverandre.
2. **Svarfristen i forespørselen er valgfri.** Uten den gjelder «uten ugrunnet
   opphold» (§ 33.6.2 annet ledd).
3. **Ingen intern godkjenning.** Handlingene binder ikke byggherren økonomisk
   og hører til `IKKE_BH_BINDENDE_EVENTS`.

## Hva som er bygget

**Når er kravet spesifisert?** Når det har antall dager
(`FristTilstand.kravet_er_spesifisert`, `krevd_dager is not None`). § 33.7 knytter
svarplikten til «et begrunnet krav med angivelse av antallet dager». Det
omfatter også `begrunnelse_utsatt`, TEs svar etter § 33.6.2 annet ledd bokstav
b, der § 33.6.1 fortsatt gjelder.

**Forretningsreglene** (`services/business_rules.py`):

- `CLAIM_SPECIFIED` på `respons_frist` og `respons_frist_oppdatert`: avvist
  uten dager. Godkjenningsflyten bruker samme validator.
- `CLAIM_UNSPECIFIED` på begge handlingene: bare et sendt krav uten dager
  («så lenge totalentreprenøren ikke har fremmet krav etter 33.6.1»).
- `CLAIM_REFERENCE`: handlingen må gjelde gjeldende TE-hendelse.
- `NOT_ALREADY_OBJECTED`: innsigelsen sendes én gang.
- `REQUEST_PENDING`: en ny forespørsel først når TE har svart på den forrige
  (`foresporsel_krav_id` lik `krav_event_id`). Etter et svar etter bokstav b
  kan BH spørre igjen.
- Begge er BH-handlinger (`ROLE_CHECK`).

**Tilstanden.** Innsigelsen setter `frist_varsel_ok=false` og
`begrunnelse_varsel`. Forespørselen setter `har_bh_foresporsel`,
`dato_bh_foresporsel`, `foresporsel_krav_id` og `frist_for_spesifisering`
(svarfristen). Ingen av dem rører `status`, `bh_resultat` eller
`respons_event_id`, så `ForseringService`, som leser
`frist.bh_resultat == "avslatt"`, åpner ikke forsering. `SporStatus` er ikke
utvidet.

`overordnet_status` og `neste_handling` bruker nå `kravet_er_spesifisert`
framfor `varsel_type == "varsel"`. Følgen er at et krav med
`begrunnelse_utsatt` gir `UNDER_BEHANDLING` og TEs tur, ikke
`VENTER_PAA_SVAR`: BH kan ikke svare før det har dager. En ventende
forespørsel gir «Svar på forespørselen om spesifisert fristkrav (§ 33.6.2)».

**Brevet.** Forespørselen skal sendes per brev (§ 33.6.2 første ledd), så
`FristForesporselData.brev` er påkrevd. Skjemaet bygger brevet med samme
kontrollsteg som TEs krav (`claimReview`, nå med avsenderrolle).
Hovedteksten er fast og sier det første ledd krever: at manglende svar fører
til at kravet tapes, og at TE eventuelt skal begrunne hvorfor grunnlaget
mangler (`fristVarselDomain.foresporselTekst`). Serveren stempler
`eventId` og `sakId` i brevreferansene for de to typene, slik den gjør for TE.

**Skjemaet.** BH får `FristVarselForm` når kravet ikke har dager, i stedet for
`FristForm`. `send_foresporsel` er fjernet fra `FristForm`, `fristDomain` og
begrunnelsesgeneratoren. Brevkontrollen sier «Send til entreprenøren» når
mottakeren er TE.

**Innsigelsen i det fulle svaret.** Har BH gjort innsigelse og sendt
forespørsel, og TE så spesifiserer, skjulte skjemaet § 33.4-spørsmålet fordi
kravet er et svar på forespørselen, og svaret ble prinsipalt godkjent mens
tilstanden sa at varselet kom for sent. Funnet i code-review av PR #174.
`FristDomainConfig.harInnsigelseMotVarsel` viser nå spørsmålet og fyller inn
innsigelsen som standpunkt.

**Code-review på nivå high** fant i tillegg, rettet i samme PR:
TEs svar etter § 33.6.2 annet ledd bokstav b ble avvist av API-validatoren,
som krevde dager for `frist_krav_spesifisert` (reprodusert med test før
rettingen); `dato_bh_foresporsel` var UTC-dato framfor norsk dato; skjemaet ble
skjult for BH uten godkjenningsrett og førte etter sending til
godkjenningsvisningen; skjemaet ble vist når sporet ikke hadde et sendt varsel;
tidslinjen manglet oppsummering for de to hendelsene; og stemplingen av
brevreferanser følger nå klassifiseringen (`BH_BINDENDE_EVENTS`) framfor en egen
liste. Ett funn er avvist: å slå sammen referanseregelen for de nye hendelsene
med `_rule_response_reference`, som også håndterer `original_respons_id`.

**Ellers:** tidslinjehistorikken (`innsigelse`, `foresporsel`), etikettene i
backend og frontend, Catenda-kommentaren (egen tittel, og en linje om
forespørselen og svarfristen), CloudEvents-skjemaet og hendelseskatalogen.

## Tester

- `backend/tests/test_services/test_noytralt_fristvarsel.py`, 24 tester mot
  regler, tilstand, historikk, Catenda og `/api/events` med
  godkjenningspolicy. Hver viser til vedtaket eller bestemmelsen.
- TFR-06 (`test_fullt_fristsvar_paa_noytralt_varsel`) er ordinær test,
  assertion uendret.
- DRF-01 (`test_foresporsel_om_spesifisering_fra_skjemaet_registreres`) er
  ordinær test. Payloaden er den skjemaet nå sender; assertionene om 201 og
  `har_bh_foresporsel` er uendret, og to nye fastslår at sporet ikke får
  resultat og forblir `SENDT`.
- `test_sak_state_computed.py::TestVisningsstatusFrist::test_sendt` fikk
  `krevd_dager=10` i oppsettet. Testen gjelder et krav som venter på BH, og
  uten dager venter ingenting på BH etter § 33.7.
- Frontend: `fristVarselDomain.test.ts` og `FristVarselForm.test.ts` (skjemaet
  sender `frist_foresporsel_sendt` med brev og uten resultat). Tre tester i
  `fristDomain.test.ts` om `sendForesporsel` er fjernet sammen med
  funksjonaliteten.

## Verifikasjon og grenser

**Kjørt og observert:** hele backend-suiten med testbasen i PostgreSQL 17,
`ruff check backend/`, `npm test` og `npm run check:error`.
`docs/verktoy/datamodell.py` er kjørt, og hendelseskatalogen er i takt med
koden.

**Ikke kontrollert eller ikke bygget:**

- **Innholdet i brevet håndheves ikke av serveren.** Serveren krever et brev,
  men kontrollerer ikke at teksten sier det § 33.6.2 første ledd krever.
  Skjemaet legger den faste teksten først, og den kan ikke redigeres der, men
  en annen klient kan sende et brev uten den.
- **§ 5 etter spesifiseringen.** Sendte ikke BH innsigelse før TE spesifiserte,
  kan BH fortsatt sette `frist_varsel_ok=false` i det fulle svaret. Om
  innsigelsen da kom for sent, er et skjønn, og serveren tar ikke stilling.
- **§ 33.6.2 fjerde ledd** (BH kan ikke påberope § 33.6.1 når TE har svart på
  forespørselen med dager) håndheves bare av skjemaet, som skjuler
  spørsmålet. Det hører til frist-delen av B-13.
- **Innsigelse mot et sent svar etter bokstav b** kan ikke registreres: begge
  handlingene gjelder varselet, og et fullt svar avvises til kravet har dager.
- `FristForm` og begrunnelsesgeneratoren har fortsatt grener for `varsel` og
  `begrunnelse_utsatt` som skjemaet ikke lenger når.
- Catenda-leveransen av brev-PDF-en er ikke kjørt mot Catenda; den går gjennom
  samme sti som andre hendelser med frosset brev.
- Testene mot `/api/events` går mot `JsonFileEventRepository` gjennom
  oppsettet i BR-01-testene. Regel- og tilstandstestene har ingen lageravhengighet.

Oppfølgingen står i #172 og #173.
