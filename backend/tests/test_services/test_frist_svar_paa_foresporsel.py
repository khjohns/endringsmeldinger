"""§ 33.6.2 fjerde ledd i byggherrens svar på fristkravet (#172 punkt 1).

NS 8407 § 33.6.2 fjerde ledd: svarer TE på forespørselen med et spesifisert
krav, kan BH ikke påberope at kravet er for sent etter § 33.6.1. Serveren
avviser derfor `spesifisert_krav_ok=false` på kravet som besvarte
forespørselen. Sperren gjelder bare det kravet: en senere revisjon er en ny
angivelse av dagene, og § 33.6.1 gjelder den (oppdragsgiver 04.10, #63).

Reglene prøves mot `BusinessRuleValidator` og `TimelineService` uten lager, så
de kan flyttes når `JsonFileEventRepository` går ut i F0b. Testene mot
`/api/events` bruker oppsettet i BR-01-testene.
"""

from datetime import date

import pytest

from constants.frist_foresporsel import FAST_TEKST
from models.events import EventType, FristVarselType, SubsidiaerTrigger, parse_event
from regler import REGELVERSJON
from tests.test_security.test_beregningsresultat_br01_20260923 import (  # noqa: F401
    HEADERS,
    NOYTRALT_FRISTVARSEL,
    _brev,
    _lagret_tilstand,
    _opprett_sak,
    _svar,
    sak,
)
from tests.test_services.test_noytralt_fristvarsel import (
    _avvist_av,
    _foresporsel,
    _fullt_svar,
    _godtatt,
    _sak_med_godkjent_grunnlag,
    _varsel,
    regler,
    timeline,
)


def _bh_svar(krav_id, spesifisert_krav_ok, event_type=EventType.RESPONS_FRIST, dager=10):
    svar = _fullt_svar(krav_id, godkjent_dager=dager)
    triggere = None if spesifisert_krav_ok else [SubsidiaerTrigger.REDUKSJON_SPESIFISERT]
    data = svar.data.model_copy(
        update={"spesifisert_krav_ok": spesifisert_krav_ok, "subsidiaer_triggers": triggere}
    )
    return svar.model_copy(update={"data": data, "event_type": event_type})


def _endret_svar(forrige, spesifisert_krav_ok):
    svar = _bh_svar(None, spesifisert_krav_ok, EventType.RESPONS_FRIST_OPPDATERT)
    data = svar.data.model_copy(
        update={"original_respons_id": forrige.event_id, "frist_krav_id": None}
    )
    return svar.model_copy(update={"data": data})


def _spesifisert(dager=10, event_type=EventType.FRIST_KRAV_SPESIFISERT):
    return _varsel(
        varsel_type=FristVarselType.SPESIFISERT, antall_dager=dager, event_type=event_type
    )


def _spesifisert_etter_foresporsel():
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    spesifisert = _spesifisert()
    return hendelser + [varsel, _foresporsel(varsel.event_id), spesifisert], spesifisert


def test_33_6_1_avvises_paa_kravet_som_besvarte_foresporselen():
    hendelser, krav = _spesifisert_etter_foresporsel()
    resultat = regler.validate(
        _bh_svar(krav.event_id, False), timeline.compute_state(hendelser)
    )
    assert resultat.violated_rule == "ASSESSMENT_INVALID"
    assert "§ 33.6.2 fjerde ledd" in resultat.message


def test_svaret_godtas_uten_33_6_1():
    hendelser, krav = _spesifisert_etter_foresporsel()
    assert _godtatt(_bh_svar(krav.event_id, True), hendelser)


def test_kontrollsak_uten_foresporsel_kan_paaberope_33_6_1():
    """Skiller seg bare i forespørselen, så avvisningen over gjelder den."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    krav = _spesifisert()
    assert _godtatt(_bh_svar(krav.event_id, False), hendelser + [varsel, krav])


def test_gjelder_ogsaa_et_endret_svar():
    hendelser, krav = _spesifisert_etter_foresporsel()
    hendelser.append(_bh_svar(krav.event_id, True))
    assert _avvist_av(_endret_svar(hendelser[-1], False), hendelser) == "ASSESSMENT_INVALID"


def test_en_senere_revisjon_kan_moetes_med_33_6_1():
    """Oppdragsgiver 04.10: sperren gjelder bare kravet som besvarte forespørselen."""
    hendelser, krav = _spesifisert_etter_foresporsel()
    hendelser.append(_bh_svar(krav.event_id, True))
    revisjon = _spesifisert(dager=40, event_type=EventType.FRIST_KRAV_OPPDATERT)
    hendelser.append(revisjon)
    assert timeline.compute_state(hendelser).frist.kravet_besvarer_foresporselen is False
    assert _godtatt(_bh_svar(revisjon.event_id, False, dager=40), hendelser)


def test_et_svar_etter_bokstav_b_er_ikke_svaret_paa_foresporselen():
    """§ 33.6.2 annet ledd b gir ingen dager, så fjerde ledd gjelder ikke det
    spesifiserte kravet som kommer etter; det følger § 33.6.1."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    utsatt = _varsel(
        varsel_type=FristVarselType.BEGRUNNELSE_UTSATT,
        event_type=EventType.FRIST_KRAV_SPESIFISERT,
    )
    krav = _spesifisert()
    hendelser += [varsel, _foresporsel(varsel.event_id), utsatt, krav]
    assert timeline.compute_state(hendelser).frist.kravet_besvarer_foresporselen is False
    assert _godtatt(_bh_svar(krav.event_id, False), hendelser)


@pytest.mark.parametrize("spesifisert_krav_ok", [True, False])
def test_kontrollen_endrer_ikke_tilstanden(spesifisert_krav_ok):
    hendelser, krav = _spesifisert_etter_foresporsel()
    tilstand = timeline.compute_state(hendelser)
    for_svaret = tilstand.model_dump()
    regler.validate(_bh_svar(krav.event_id, spesifisert_krav_ok), tilstand)
    assert tilstand.model_dump() == for_svaret


# =============================================================================
# Gjennom /api/events, med nyttelasten FristForm sender
# =============================================================================


def _som_te(sak):  # noqa: F811
    auth = sak.client.application.extensions["koe_auth"]
    auth.contract_role.return_value = "TE"
    auth.contract_membership.return_value = ("TE", "te-team")


def _som_bh(sak):  # noqa: F811
    auth = sak.client.application.extensions["koe_auth"]
    auth.contract_role.return_value = "BH"
    auth.contract_membership.return_value = ("BH", "bh-team")


def _besvart_foresporsel(sak, sak_id):  # noqa: F811
    varsel = _opprett_sak(sak.lager, sak_id, fristkrav=NOYTRALT_FRISTVARSEL).frist
    foresporsel = _svar(
        sak,
        sak_id,
        "frist_foresporsel_sendt",
        varsel.event_id,
        {
            "frist_krav_id": varsel.event_id,
            "begrunnelse": FAST_TEKST,
            "brev": _brev(sak_id, FAST_TEKST),
            "svarfrist": "2026-10-20",
        },
    )
    assert foresporsel.status_code == 201, foresporsel.get_json()
    _som_te(sak)
    _, versjon = sak.lager.get_events(sak_id)
    spesifisert = sak.client.post(
        "/api/events",
        json={
            "sak_id": sak_id,
            "expected_version": versjon,
            "event": {
                "event_type": "frist_krav_spesifisert",
                "data": {
                    "varsel_type": "spesifisert",
                    "antall_dager": 10,
                    "begrunnelse": "Råbygget er forsinket ti dager.",
                    "spesifisert_varsel": {
                        "dato_sendt": "2026-10-04",
                        "metode": ["digital_oversendelse"],
                    },
                    "er_svar_pa_foresporsel": True,
                },
            },
        },
        headers=HEADERS,
    )
    assert spesifisert.status_code == 201, spesifisert.get_json()
    _som_bh(sak)
    frist = _lagret_tilstand(sak, sak_id).frist
    assert frist.kravet_besvarer_foresporselen is True
    return frist.krav_event_id


def _skjemaets_svar(krav_id, **endringer):
    """`fristDomain.buildEventData` når spørsmålet om § 33.6.1 er skjult:
    `spesifisert_krav_ok` er `undefined` og faller bort i JSON."""
    return {
        "regelversjon": REGELVERSJON,
        "frist_krav_id": krav_id,
        "foresporsel_svar_ok": True,
        "vilkar_oppfylt": True,
        "godkjent_dager": 10,
        "beregnings_resultat": "godkjent",
        "begrunnelse": "Godkjent.",
        **endringer,
    }


def test_skjemaets_svar_paa_et_besvart_krav_lagres(sak):  # noqa: F811
    sak_id = "KOE-172-skjema"
    krav_id = _besvart_foresporsel(sak, sak_id)
    svar = _svar(sak, sak_id, "respons_frist", krav_id, _skjemaets_svar(krav_id))
    assert svar.status_code == 201, svar.get_json()


def test_33_6_1_avvises_gjennom_ruta(sak):  # noqa: F811
    sak_id = "KOE-172-rute"
    krav_id = _besvart_foresporsel(sak, sak_id)
    svar = _svar(
        sak,
        sak_id,
        "respons_frist",
        krav_id,
        _skjemaets_svar(krav_id, spesifisert_krav_ok=False),
    )
    assert svar.status_code == 400, svar.get_json()
    assert "§ 33.6.2 fjerde ledd" in svar.get_json()["message"]
    assert _lagret_tilstand(sak, sak_id).frist.bh_resultat is None


@pytest.mark.parametrize(
    "felt",
    [
        {"har_bh_foresporsel": False},
        {"dato_bh_foresporsel": "2026-01-01"},
        {"frist_for_spesifisering": None},
        {"frist_for_spesifisering": "2026-12-24"},
    ],
)
def test_fristsvaret_kan_ikke_endre_foresporselen(sak, felt):  # noqa: F811
    """#182, #238: forespørselen settes bare av `frist_foresporsel_sendt`, med brev."""
    sak_id = f"KOE-182-{next(iter(felt))}-{next(iter(felt.values()))}"
    krav_id = _besvart_foresporsel(sak, sak_id)
    for_svaret = _lagret_tilstand(sak, sak_id).frist

    svar = _svar(sak, sak_id, "respons_frist", krav_id, _skjemaets_svar(krav_id, **felt))

    assert svar.status_code == 400, svar.get_json()
    assert "settes av forespørselen" in svar.get_json()["message"]
    frist = _lagret_tilstand(sak, sak_id).frist
    assert frist.har_bh_foresporsel is True
    assert frist.dato_bh_foresporsel == for_svaret.dato_bh_foresporsel
    assert frist.frist_for_spesifisering == for_svaret.frist_for_spesifisering == "2026-10-20"


def test_et_lagret_fristsvar_med_foresporselsfeltene_kan_leses():
    """#182 gjelder nye svar. Et lagret svar leses, og feltene overses."""
    hendelser = _sak_med_godkjent_grunnlag()
    varsel = _varsel()
    foresporsel = _foresporsel(varsel.event_id, svarfrist=date(2026, 10, 20))
    spesifisert = _varsel("spesifisert", 10, EventType.FRIST_KRAV_SPESIFISERT)
    svar = _fullt_svar(spesifisert.event_id).model_dump(mode="json")
    svar["data"]["har_bh_foresporsel"] = False
    svar["data"]["frist_for_spesifisering"] = None

    frist = timeline.compute_state(
        hendelser + [varsel, foresporsel, spesifisert, parse_event(svar)]
    ).frist

    assert frist.har_bh_foresporsel is True
    assert frist.frist_for_spesifisering == "2026-10-20"


# =============================================================================
# spesifisert_krav_ok kreves der § 33.6.1-spørsmålet stilles
# =============================================================================


def _uten_spesifisert_krav_ok(svar):
    data = svar.data.model_dump(exclude={"spesifisert_krav_ok"}, exclude_unset=True)
    return svar.model_copy(update={"data": type(svar.data)(**data)})


def test_manglende_33_6_1_vurdering_avvises_paa_et_vanlig_krav():
    """Uten feltet setter modellen `true`, og journalen ville si at BH har
    vurdert kravet som i tide (§ 33.6.1)."""
    hendelser = _sak_med_godkjent_grunnlag()
    krav = _spesifisert(event_type=EventType.FRIST_KRAV_SENDT)
    svar = _uten_spesifisert_krav_ok(_bh_svar(krav.event_id, True))
    assert svar.data.spesifisert_krav_ok is True
    resultat = regler.validate(svar, timeline.compute_state(hendelser + [krav]))
    assert resultat.violated_rule == "ASSESSMENT_INVALID"
    assert "spesifisert_krav_ok: mangler" in resultat.message


def test_33_6_1_vurdering_kreves_ikke_paa_svaret_paa_foresporselen():
    hendelser, krav = _spesifisert_etter_foresporsel()
    assert _godtatt(_uten_spesifisert_krav_ok(_bh_svar(krav.event_id, True)), hendelser)
