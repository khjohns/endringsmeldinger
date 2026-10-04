"""Regelmodulen for byggherrens svar på krav om fristforlengelse (BR-01, B-13, #63).

Oversatt fra `src/lib/domain/__tests__/fristDomain.test.ts`, som er
spesifikasjonen (B-13, hovedplanen 3.1). Hver test viser til testen i TS-fila
med `describe › it` og til bestemmelsen i NS 8407 der den finnes.

Fire forventninger skiller seg fra TS-fila, og alle viser til et vedtak:

- 99 %-terskelen utgår: «godkjent» bare når alle de krevde dagene er godkjent
  (B-13, 3.1, 24.09).
- 0 godkjente dager med fremdriftshindring er «avslått», prinsipalt og
  subsidiært, som 0 kr for vederlag (oppdragsgiver 04.10, #63).
- Det subsidiære standpunktet bærer de godkjente dagene. Skjemaet sender 0,
  fordi det bruker de prinsipale dagene, som er 0 når prinsipalt er avslått.
- Svaret må være helt, og § 33.6.2 fjerde ledd håndheves (#172 punkt 1).
  TS-fila har ingen tester for det.

Kravet slik saken står (`Fristkrav.fra_tilstand`, `deriveFristDomainConfig`)
skiller seg på tre punkter:

- Svaret på forespørselen er bare kravet som besvarte den. Frontenden bruker
  `har_bh_foresporsel` for hele sporet (oppdragsgiver 04.10, § 33.6.2 fjerde
  ledd).
- § 32.2 gjelder ikke formell endringsordre (B-13, 3.1, 24.09).
- Et tidligere svar finnes når `bh_respondert_versjon` ikke er `None`.
  Frontenden sammenlikner med `undefined`, og API-et sender `null`.

Ikke oversatt, fordi de er veiledning (gruppe 1 i kartleggingen) eller bygger
nyttelasten og ikke resultatet: `getDefaults`, portflaggene i `beregnAlt`, og i
`buildEventData` `frist_krav_id`, `krevd_dager`, `begrunnelse`,
`auto_begrunnelse` og `subsidiaer_begrunnelse`.
"""

import pytest

from models.events import (
    FristBeregningResultat,
    GrunnlagResponsResultat,
    SubsidiaerTrigger,
)
from models.sak_state import FristTilstand, GrunnlagTilstand, SakState
from regler import UgyldigVurdering
from regler.frist import (
    Fristkrav,
    Fristvurdering,
    beregn_frist,
    beregn_preklusjon,
    beregn_reduksjon,
    beregn_synlighet,
    prinsipalt_resultat,
    subsidiaer_triggers,
    subsidiaert_resultat,
)

GODKJENT = FristBeregningResultat.GODKJENT
DELVIS = FristBeregningResultat.DELVIS_GODKJENT
AVSLATT = FristBeregningResultat.AVSLATT
GRUNNLAG_AVSLATT = SubsidiaerTrigger.GRUNNLAG_AVSLATT
PREKLUSJON_VARSEL = SubsidiaerTrigger.PREKLUSJON_VARSEL
REDUKSJON = SubsidiaerTrigger.REDUKSJON_SPESIFISERT
INGEN_HINDRING = SubsidiaerTrigger.INGEN_HINDRING


def vurdering(**endringer) -> Fristvurdering:
    """Som `makeState` i TS-fila: alt i tide, hindring, 10 dager godkjent."""
    felt = {
        "frist_varsel_ok": True,
        "spesifisert_krav_ok": True,
        "foresporsel_svar_ok": True,
        "vilkar_oppfylt": True,
        "godkjent_dager": 10,
    }
    felt.update(endringer)
    return Fristvurdering(**felt)


def krav(**endringer) -> Fristkrav:
    """Som `makeConfig` i TS-fila: spesifisert krav på 10 dager uten tidligere varsel."""
    felt = {"varsel_type": "spesifisert", "krevd_dager": 10}
    felt.update(endringer)
    return Fristkrav(**felt)


# ---------------------------------------------------------------------------
# Synlighet: hvilke varselspørsmål svaret må ha
# ---------------------------------------------------------------------------


class TestSynlighet:
    """fristDomain.test.ts › beregnVisibility."""

    def test_varsel(self):
        # 'shows fristVarselOk for varsel type'
        assert beregn_synlighet(krav(varsel_type="varsel")).frist_varsel_ok is True

    def test_spesifisert_uten_tidligere_varsel(self):
        # 'shows fristVarselOk for spesifisert without prior varsel'
        assert beregn_synlighet(krav()).frist_varsel_ok is True

    def test_spesifisert_med_tidligere_varsel_i_tide(self):
        # 'hides fristVarselOk for spesifisert with prior varsel i tide'
        s = beregn_synlighet(krav(har_tidligere_varsel_i_tide=True))
        assert s.frist_varsel_ok is False

    def test_spesifisert_krav_ok_ved_spesifisert(self):
        # 'shows spesifisertKravOk for spesifisert type'
        assert beregn_synlighet(krav()).spesifisert_krav_ok is True

    def test_spesifisert_krav_ok_skjult_ved_varsel(self):
        # 'hides spesifisertKravOk for varsel type'
        assert beregn_synlighet(krav(varsel_type="varsel")).spesifisert_krav_ok is False

    def test_spesifisert_krav_ok_skjult_ved_svar_paa_foresporsel(self):
        # 'hides spesifisertKravOk when svar pa foresporsel'
        s = beregn_synlighet(krav(er_svar_paa_foresporsel=True))
        assert s.spesifisert_krav_ok is False

    def test_foresporsel_svar_ok_ved_svar_paa_foresporsel(self):
        # 'shows foresporselSvarOk when svar pa foresporsel'
        s = beregn_synlighet(krav(er_svar_paa_foresporsel=True))
        assert s.foresporsel_svar_ok is True

    def test_begrunnelse_utsatt(self):
        # 'hides all controls for begrunnelse_utsatt'
        s = beregn_synlighet(krav(varsel_type="begrunnelse_utsatt"))
        assert (s.frist_varsel_ok, s.spesifisert_krav_ok, s.foresporsel_svar_ok) == (
            False,
            False,
            False,
        )


class TestInnsigelseOgForesporsel:
    """fristDomain.test.ts › innsigelse og forespørsel før spesifiseringen.
    Vedtaket om nøytralt fristvarsel (3.1, 23.09) og NS 8407 § 5 tredje ledd."""

    def test_33_4_spoersmaalet_ved_siden_av_svaret_paa_foresporselen(self):
        # 'viser § 33.4-spørsmålet ved siden av svaret på forespørselen'
        s = beregn_synlighet(
            krav(er_svar_paa_foresporsel=True, har_innsigelse_mot_varsel=True)
        )
        assert s.frist_varsel_ok is True
        assert s.foresporsel_svar_ok is True

    def test_prinsipalt_avslag_naar_varselet_er_for_sent(self):
        # 'gir prinsipalt avslag når varselet er for sent'
        r = beregn_frist(
            krav(er_svar_paa_foresporsel=True, har_innsigelse_mot_varsel=True),
            vurdering(frist_varsel_ok=False),
        )
        assert r.er_prekludert is True
        assert r.beregnings_resultat == AVSLATT

    def test_uten_innsigelse_er_spoersmaalet_skjult(self):
        # 'uten innsigelse er spørsmålet skjult som før'
        s = beregn_synlighet(krav(er_svar_paa_foresporsel=True))
        assert s.frist_varsel_ok is False


# ---------------------------------------------------------------------------
# Preklusjon og reduksjon, § 33.4, § 33.6.1 og § 33.6.2
# ---------------------------------------------------------------------------


class TestBeregnPreklusjon:
    """fristDomain.test.ts › beregnPreklusjon."""

    def test_varsel_for_sent(self):
        # 'returns true for varsel when fristVarselOk is false'
        assert beregn_preklusjon(vurdering(frist_varsel_ok=False), krav(varsel_type="varsel"))

    def test_varsel_i_tide(self):
        # 'returns false for varsel when fristVarselOk is true'
        assert not beregn_preklusjon(vurdering(), krav(varsel_type="varsel"))

    def test_spesifisert_uten_tidligere_varsel_for_sent(self):
        # 'returns true for spesifisert without prior varsel when fristVarselOk is false'
        assert beregn_preklusjon(vurdering(frist_varsel_ok=False), krav())

    def test_spesifisert_med_tidligere_varsel_i_tide(self):
        # 'returns false for spesifisert with prior varsel i tide'
        assert not beregn_preklusjon(
            vurdering(frist_varsel_ok=False), krav(har_tidligere_varsel_i_tide=True)
        )

    def test_svar_paa_foresporsel_for_sent(self):
        # 'returns true when foresporsel svar er for sent'. § 33.6.2 tredje ledd.
        assert beregn_preklusjon(
            vurdering(foresporsel_svar_ok=False), krav(er_svar_paa_foresporsel=True)
        )

    def test_begrunnelse_utsatt(self):
        # 'returns false for begrunnelse_utsatt'
        assert not beregn_preklusjon(
            vurdering(frist_varsel_ok=False), krav(varsel_type="begrunnelse_utsatt")
        )


class TestBeregnReduksjon:
    """fristDomain.test.ts › beregnReduksjon. NS 8407 § 33.6.1."""

    def test_spesifisert_med_tidligere_varsel(self):
        # 'returns true when spesifisert with prior varsel and spesifisertKravOk is false'
        assert beregn_reduksjon(
            vurdering(spesifisert_krav_ok=False), krav(har_tidligere_varsel_i_tide=True)
        )

    def test_spesifisert_uten_tidligere_varsel(self):
        # 'returns true when spesifisert without prior varsel, fristVarselOk true, spesifisertKravOk false'
        assert beregn_reduksjon(vurdering(spesifisert_krav_ok=False), krav())

    def test_ved_siden_av_preklusjon_etter_33_4(self):
        # 'retains §33.6.1 as a subsidiary limitation when §33.4 is also precluded'
        assert beregn_reduksjon(
            vurdering(frist_varsel_ok=False, spesifisert_krav_ok=False), krav()
        )

    def test_svar_paa_foresporsel(self):
        # 'returns false for svar pa foresporsel'. § 33.6.2 fjerde ledd.
        assert not beregn_reduksjon(
            vurdering(spesifisert_krav_ok=False), krav(er_svar_paa_foresporsel=True)
        )

    def test_varsel(self):
        # 'returns false for varsel type'
        assert not beregn_reduksjon(vurdering(), krav(varsel_type="varsel"))


# ---------------------------------------------------------------------------
# Resultat, § 33.5
# ---------------------------------------------------------------------------


class TestPrinsipaltResultat:
    """fristDomain.test.ts › beregnPrinsipaltResultat."""

    @pytest.mark.parametrize(
        ("prekludert", "hindring", "krevd", "godkjent", "forventet"),
        [
            (False, True, 10, 10, GODKJENT),  # 'returns godkjent when all positive'
            (True, True, 10, 10, AVSLATT),  # 'returns avslatt when prekludert'
            (False, False, 10, 10, AVSLATT),  # 'returns avslatt when no hindring'
            (False, True, 10, 5, DELVIS),  # 'returns delvis_godkjent when godkjent < krevd'
            (False, True, 0, 0, GODKJENT),  # 'returns godkjent when krevdDager is 0'
        ],
    )
    def test_resultat(self, prekludert, hindring, krevd, godkjent, forventet):
        assert (
            prinsipalt_resultat(
                er_prekludert=prekludert,
                har_hindring=hindring,
                krevd_dager=krevd,
                godkjent_dager=godkjent,
            )
            == forventet
        )

    def test_99_prosent_er_delvis_godkjent(self):
        # 'returns godkjent when godkjent >= 99% of krevd' er snudd: B-13 (3.1, 24.09)
        # gir «godkjent» bare når alle dagene er godkjent.
        assert (
            prinsipalt_resultat(
                er_prekludert=False, har_hindring=True, krevd_dager=100, godkjent_dager=99
            )
            == DELVIS
        )

    def test_null_dager_med_hindring_er_avslatt(self):
        # Ingen TS-test. Oppdragsgiver 04.10: som 0 kr for vederlag.
        assert (
            prinsipalt_resultat(
                er_prekludert=False, har_hindring=True, krevd_dager=10, godkjent_dager=0
            )
            == AVSLATT
        )


class TestSubsidiaertResultat:
    """fristDomain.test.ts › beregnSubsidiaertResultat."""

    @pytest.mark.parametrize(
        ("hindring", "krevd", "godkjent", "forventet"),
        [
            (True, 10, 10, GODKJENT),  # 'returns godkjent when hindring and full days'
            (False, 10, 10, AVSLATT),  # 'returns avslatt when no hindring (ignores preclusion)'
            (True, 10, 5, DELVIS),  # 'returns delvis_godkjent when partial days'
            (True, 0, 0, GODKJENT),  # 'returns godkjent when krevdDager is 0'
            (True, 100, 99, DELVIS),  # Ingen TS-test. B-13 (3.1, 24.09)
            (True, 10, 0, AVSLATT),  # Ingen TS-test. Oppdragsgiver 04.10
        ],
    )
    def test_resultat(self, hindring, krevd, godkjent, forventet):
        assert (
            subsidiaert_resultat(har_hindring=hindring, krevd_dager=krevd, godkjent_dager=godkjent)
            == forventet
        )


class TestSubsidiaerTriggers:
    """fristDomain.test.ts › beregnSubsidiaerTriggers."""

    def test_ingen(self):
        # 'returns empty when nothing triggers'
        assert (
            subsidiaer_triggers(
                er_grunnlag_subsidiaert=False, er_prekludert=False, har_hindring=True
            )
            == ()
        )

    def test_grunnlag_avslatt(self):
        # 'includes grunnlag_avslatt when erGrunnlagSubsidiaer'
        t = subsidiaer_triggers(
            er_grunnlag_subsidiaert=True, er_prekludert=False, har_hindring=True
        )
        assert GRUNNLAG_AVSLATT in t

    def test_preklusjon(self):
        # 'includes preklusjon_varsel when prekludert'
        t = subsidiaer_triggers(
            er_grunnlag_subsidiaert=False, er_prekludert=True, har_hindring=True
        )
        assert PREKLUSJON_VARSEL in t

    def test_ingen_hindring(self):
        # 'includes ingen_hindring when vilkar not met'
        t = subsidiaer_triggers(
            er_grunnlag_subsidiaert=False, er_prekludert=False, har_hindring=False
        )
        assert INGEN_HINDRING in t

    def test_reduksjon(self):
        # 'includes reduksjon_spesifisert when §33.6.1 is invoked'
        t = subsidiaer_triggers(
            er_grunnlag_subsidiaert=False,
            er_prekludert=True,
            er_redusert=True,
            har_hindring=True,
        )
        assert PREKLUSJON_VARSEL in t
        assert REDUKSJON in t

    def test_alle(self):
        # 'includes all triggers when all conditions met'
        t = subsidiaer_triggers(
            er_grunnlag_subsidiaert=True, er_prekludert=True, har_hindring=False
        )
        assert t == (GRUNNLAG_AVSLATT, PREKLUSJON_VARSEL, INGEN_HINDRING)


# ---------------------------------------------------------------------------
# Hele svaret: buildEventData og beregnAlt
# ---------------------------------------------------------------------------


class TestBeregnFrist:
    """fristDomain.test.ts › buildEventData og › beregnAlt: feltene serveren regner ut."""

    def test_konsistent(self):
        # beregnAlt › 'computes all values consistently'
        r = beregn_frist(krav(), vurdering())
        assert r.er_prekludert is False
        assert r.beregnings_resultat == GODKJENT
        assert r.godkjent_dager == 10
        assert r.subsidiaer_resultat is None
        assert r.subsidiaer_godkjent_dager is None
        assert r.subsidiaer_triggers == ()

    def test_preklusjon_gjennom_alle_verdiene(self):
        # beregnAlt › 'reflects preclusion in all derived values'
        # buildEventData › 'includes subsidiaer_triggers when present'
        # buildEventData › 'sets godkjent_dager to 0 when avslatt'
        r = beregn_frist(krav(varsel_type="varsel"), vurdering(frist_varsel_ok=False))
        assert r.er_prekludert is True
        assert r.beregnings_resultat == AVSLATT
        assert r.godkjent_dager == 0
        assert r.subsidiaer_resultat == GODKJENT
        assert r.subsidiaer_triggers == (PREKLUSJON_VARSEL,)

    def test_subsidiaert_standpunkt_bærer_dagene(self):
        # Skiller seg fra skjemaet, som sender 0 her (se modulheaderen).
        r = beregn_frist(krav(varsel_type="varsel"), vurdering(frist_varsel_ok=False, godkjent_dager=7))
        assert r.subsidiaer_resultat == DELVIS
        assert r.subsidiaer_godkjent_dager == 7

    def test_subsidiaert_avslatt_har_ingen_dager(self):
        # buildEventData: `subsidiaer_godkjent_dager` utelates når subsidiært er avslått.
        r = beregn_frist(krav(), vurdering(vilkar_oppfylt=False))
        assert r.beregnings_resultat == AVSLATT
        assert r.subsidiaer_resultat == AVSLATT
        assert r.subsidiaer_godkjent_dager is None
        assert r.subsidiaer_triggers == (INGEN_HINDRING,)

    def test_ikke_subsidiaert_naar_prinsipalt_ikke_er_avslatt(self):
        # buildEventData › 'omits subsidiaer fields when prinsipalt is not avslatt'
        r = beregn_frist(krav(), vurdering(godkjent_dager=5))
        assert r.beregnings_resultat == DELVIS
        assert r.subsidiaer_resultat is None
        assert r.subsidiaer_godkjent_dager is None

    def test_begge_varselstadiene_for_sent(self):
        # beregnAlt › 'retains the §33.6.1 limitation when both notice stages are late'
        r = beregn_frist(krav(), vurdering(frist_varsel_ok=False, spesifisert_krav_ok=False))
        assert r.er_prekludert is True
        assert r.er_redusert is True
        assert PREKLUSJON_VARSEL in r.subsidiaer_triggers
        assert REDUKSJON in r.subsidiaer_triggers

    def test_null_dager_med_hindring(self):
        # Oppdragsgiver 04.10. Avslaget gjelder dagene selv, så det finnes ikke
        # noe subsidiært standpunkt (som `beregnAlt` etter #167).
        r = beregn_frist(krav(), vurdering(godkjent_dager=0))
        assert r.beregnings_resultat == AVSLATT
        assert r.godkjent_dager == 0
        assert r.subsidiaer_resultat is None
        assert r.subsidiaer_godkjent_dager is None
        assert r.subsidiaer_triggers == ()

    def test_null_dager_ved_preklusjon(self):
        r = beregn_frist(krav(varsel_type="varsel"), vurdering(frist_varsel_ok=False, godkjent_dager=0))
        assert r.subsidiaer_resultat == AVSLATT
        assert r.subsidiaer_godkjent_dager is None

    @pytest.mark.parametrize(
        ("grunnlag_avslatt", "prekludert_32_2", "forventet"),
        [(True, False, True), (False, True, True), (False, False, False)],
    )
    def test_hele_fristen_subsidiaer(self, grunnlag_avslatt, prekludert_32_2, forventet):
        r = beregn_frist(
            krav(
                er_grunnlag_subsidiaert=grunnlag_avslatt,
                er_hele_fristen_subsidiaer_pga_grunnlag=prekludert_32_2,
            ),
            vurdering(),
        )
        assert r.hele_fristen_subsidiaer is forventet
        assert (GRUNNLAG_AVSLATT in r.subsidiaer_triggers) is grunnlag_avslatt


# ---------------------------------------------------------------------------
# Hele svaret kreves, og § 33.6.2 fjerde ledd (#172 punkt 1)
# ---------------------------------------------------------------------------


class TestKontroll:
    @pytest.mark.parametrize(
        ("k", "felt"),
        [
            (krav(varsel_type="varsel"), "frist_varsel_ok"),
            (krav(), "frist_varsel_ok"),
            (krav(), "spesifisert_krav_ok"),
            (krav(er_svar_paa_foresporsel=True), "foresporsel_svar_ok"),
            (
                krav(er_svar_paa_foresporsel=True, har_innsigelse_mot_varsel=True),
                "frist_varsel_ok",
            ),
            (krav(), "vilkar_oppfylt"),
            (krav(), "godkjent_dager"),
        ],
    )
    def test_manglende_vurdering_avvises(self, k, felt):
        with pytest.raises(UgyldigVurdering) as feil:
            beregn_frist(k, vurdering(**{felt: None}))
        assert felt in feil.value.felt

    @pytest.mark.parametrize(
        ("k", "felt"),
        [
            (krav(har_tidligere_varsel_i_tide=True), "frist_varsel_ok"),
            (krav(varsel_type="varsel"), "spesifisert_krav_ok"),
            (krav(er_svar_paa_foresporsel=True), "frist_varsel_ok"),
            (krav(er_svar_paa_foresporsel=True), "spesifisert_krav_ok"),
            (krav(), "foresporsel_svar_ok"),
        ],
    )
    def test_spoersmaal_som_ikke_stilles_kreves_ikke(self, k, felt):
        beregn_frist(k, vurdering(**{felt: None}))

    def test_33_6_1_etter_svar_paa_foresporselen_avvises(self):
        # § 33.6.2 fjerde ledd: har TE svart på forespørselen med dager, kan BH
        # ikke påberope at kravet er for sent etter § 33.6.1.
        with pytest.raises(UgyldigVurdering) as feil:
            beregn_frist(
                krav(er_svar_paa_foresporsel=True), vurdering(spesifisert_krav_ok=False)
            )
        assert feil.value.felt == ("spesifisert_krav_ok",)
        assert "33.6.2 fjerde ledd" in str(feil.value)

    @pytest.mark.parametrize("dager", [-1, 11, 2.5, True])
    def test_ugyldige_dager_avvises(self, dager):
        with pytest.raises(UgyldigVurdering) as feil:
            beregn_frist(krav(), vurdering(godkjent_dager=dager))
        assert feil.value.felt == ("godkjent_dager",)


# ---------------------------------------------------------------------------
# Kravet slik saken står, speilet av `deriveFristDomainConfig`
# ---------------------------------------------------------------------------


def sak(frist: dict | None = None, grunnlag: dict | None = None) -> SakState:
    return SakState(
        sak_id="SAK-1",
        frist=FristTilstand(**{"varsel_type": "spesifisert", "krevd_dager": 10, **(frist or {})}),
        grunnlag=GrunnlagTilstand(**(grunnlag or {})),
    )


class TestFraTilstand:
    def test_spesifisert_krav(self):
        assert Fristkrav.fra_tilstand(sak()) == Fristkrav(krevd_dager=10, varsel_type="spesifisert")

    def test_svar_paa_foresporsel_etter_innsigelse(self):
        k = Fristkrav.fra_tilstand(
            sak(
                {
                    "har_bh_foresporsel": True,
                    "krav_event_id": "krav-2",
                    "foresporsel_besvart_krav_id": "krav-2",
                    "frist_varsel_ok": False,
                }
            )
        )
        assert k.er_svar_paa_foresporsel is True
        assert k.har_innsigelse_mot_varsel is True
        assert k.har_tidligere_varsel_i_tide is False

    def test_en_revisjon_er_ikke_svaret_paa_foresporselen(self):
        # Oppdragsgiver 04.10: § 33.6.2 fjerde ledd gjelder kravet som besvarte
        # forespørselen. Frontenden bruker `har_bh_foresporsel` for hele sporet.
        k = Fristkrav.fra_tilstand(
            sak(
                {
                    "har_bh_foresporsel": True,
                    "krav_event_id": "krav-3",
                    "foresporsel_besvart_krav_id": "krav-2",
                }
            )
        )
        assert k.er_svar_paa_foresporsel is False

    @pytest.mark.parametrize(
        ("frist", "forventet"),
        [
            ({"frist_varsel_ok": True}, True),
            ({"bh_respondert_versjon": 0}, True),
            ({"bh_respondert_versjon": 0, "frist_varsel_ok": False}, False),
            ({}, False),
        ],
    )
    def test_tidligere_varsel_i_tide(self, frist, forventet):
        assert Fristkrav.fra_tilstand(sak(frist)).har_tidligere_varsel_i_tide is forventet

    def test_grunnlaget(self):
        k = Fristkrav.fra_tilstand(
            sak(
                grunnlag={
                    "bh_resultat": GrunnlagResponsResultat.AVSLATT,
                    "hovedkategori": "ENDRING",
                    "underkategori": ["IRREG"],
                    "grunnlag_varslet_i_tide": False,
                }
            )
        )
        assert k.er_grunnlag_subsidiaert is True
        assert k.er_hele_fristen_subsidiaer_pga_grunnlag is True

    def test_formell_endringsordre_er_utenfor_32_2(self):
        # B-13 (3.1, 24.09): `grunnlag_varslet_i_tide` gjelder bare § 32.2, endring
        # som ikke er formell endringsordre. Frontenden ser bare på feltet.
        k = Fristkrav.fra_tilstand(
            sak(
                grunnlag={
                    "hovedkategori": "ENDRING",
                    "underkategori": "EO",
                    "grunnlag_varslet_i_tide": False,
                }
            )
        )
        assert k.er_hele_fristen_subsidiaer_pga_grunnlag is False
