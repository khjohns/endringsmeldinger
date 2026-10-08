"""Kontrakten for flyten i språkprøven (#272), i minnet.

Skjemaet står i docs/domenetabell/kontrakt.json. Her prøves at skjemaet er
konsistent med modellene, at korpusets kommandoer, de lagrede dataene og den
offentlige tilstanden i flyten holder skjemaet, og aksepten etter KA-U1 uten
HTTP. Grensene gjennom ruta og testbasen prøves i
`tests/test_database/test_kontrakt_aksept.py`.
"""

import importlib
import uuid

import pytest
from pydantic import ValidationError as PydanticValidationError

from lib.cloudevents.schemas import EVENT_TYPE_TO_DATA_MODEL
from models.events import parse_event, parse_event_from_request
from models.sak_state import FristTilstand, GrunnlagTilstand, SakState, VederlagTilstand
from services.timeline_service import TimelineService
from tests.test_domenetabell import kontrakt, korpus
from tests.test_domenetabell.test_kravversjon_og_aksept import Domenebane

SPORMODELLER = {"grunnlag": GrunnlagTilstand, "vederlag": VederlagTilstand, "frist": FristTilstand}
FLYTEN = [
    f for f in korpus.KORPUS["forlop"] if set(f["rader"]) <= set(kontrakt.SKJEMA["x-rader"])
]


def _felt(modell) -> set[str]:
    return set(modell.model_fields) | set(modell.model_computed_fields)


# ---------- skjemaet ----------


def test_skjemaet_bruker_bare_noekkelordene_validatoren_kan():
    assert kontrakt.ukjente_nokkelord() == []


def test_validatoren_finner_avvik():
    """Validatoren er testens eget verktøy, så den prøves mot kjente avvik."""
    skjema = {
        "type": "object",
        "properties": {"a": {"type": ["string", "null"]}, "b": {"enum": [1, 2]}},
        "required": ["a"],
        "additionalProperties": False,
    }
    assert kontrakt.feil_i({"a": None, "b": 2}, skjema) == []
    assert kontrakt.feil_i({"b": 2}, skjema) == ["$.a: mangler"]
    assert kontrakt.feil_i({"a": 1}, skjema) == ["$.a: 1 er ikke string/null"]
    assert kontrakt.feil_i({"a": "x", "c": 1}, skjema) == ["$.c: ukjent felt"]
    assert kontrakt.feil_i({"a": "x", "b": 3}, skjema) == ["$.b: 3 er ikke en av [1, 2]"]
    assert kontrakt.ukjente_nokkelord({"pattern": "x"}) == ["#: pattern"]


def test_enumene_i_skjemaet_er_modellens():
    for navn, definisjon in kontrakt.DEFS.items():
        if "x-python" not in definisjon:
            continue
        modul, klasse = definisjon["x-python"].rsplit(".", 1)
        verdier = [v.value for v in getattr(importlib.import_module(modul), klasse)]
        assert definisjon["enum"] == verdier, navn


def test_tilstandsfeltene_finnes_i_sakstilstanden():
    sak = kontrakt.DEFS["tilstand"]["properties"]
    assert set(sak) <= _felt(SakState)
    for spor, modell in SPORMODELLER.items():
        assert set(kontrakt.DEFS[f"tilstand.{spor}"]["properties"]) <= _felt(modell), spor


def test_tilstanden_krever_alle_feltene_den_beskriver():
    """API-vedtaket 05.10: et felt i tilstanden finnes alltid, eventuelt som null."""
    for navn in ["tilstand", *(f"tilstand.{s}" for s in SPORMODELLER)]:
        definisjon = kontrakt.DEFS[navn]
        assert set(definisjon["required"]) == set(definisjon["properties"]), navn


def test_kommandoenes_data_finnes_i_datamodellen():
    for hendelsestype in kontrakt.KOMMANDOER:
        data = kontrakt.DEFS[f"kommando.{hendelsestype}"]["properties"]["data"]
        while "$ref" in data and "properties" not in data:
            data = kontrakt.oppslag(data["$ref"])
        if "$ref" in data:
            data = {**kontrakt.oppslag(data["$ref"]), **data}
        modell = EVENT_TYPE_TO_DATA_MODEL[hendelsestype]
        assert set(data["properties"]) <= set(modell.model_fields), hendelsestype


# ---------- flyten i korpuset ----------


def test_flyten_er_dekket_av_korpuset():
    """Hver rad kontrakten dekker, har et forløp som bare bruker kontraktens kommandoer."""
    dekket = {r for f in FLYTEN for r in f["rader"]}
    assert dekket == set(kontrakt.SKJEMA["x-rader"])


@pytest.mark.parametrize("forlop", FLYTEN, ids=[f["id"] for f in FLYTEN])
def test_forloepet_holder_kontrakten(forlop):
    """Kommandoen, dataene journalen får, og tilstanden etter hvert godtatt steg."""
    bane = Domenebane()
    prefiks, steg = korpus.steg_med_prefiks(forlop)
    for h in prefiks + steg:
        sak = bane.sak()
        _, foresporsel = korpus.foresporsel(h, sak, bane.sak_id)
        hendelsestype = foresporsel["event_type"]
        assert hendelsestype in kontrakt.KOMMANDOER, f"{h['handling']}: {hendelsestype} er utenfor kontrakten"
        brudd = kontrakt.valider(foresporsel, f"kommando.{hendelsestype}")
        konvolutt = {"sak_id": bane.sak_id, "expected_version": len(bane.journal()), "event": foresporsel}
        assert kontrakt.valider(konvolutt, "konvolutt") == []
        godtatt = bane.send(h)[0]
        # GR-03: grunnlagssvaret har falt, så korpuset har ikke noe svar å vise til.
        assert not (brudd and godtatt), f"{h['handling']} bryter kontrakten, men ble godtatt: {brudd}"
        if not godtatt:
            continue
        lagret = bane.hendelser[-1].to_cloudevent()
        definisjon = f"hendelse.{hendelsestype.removesuffix('_oppdatert')}"
        if definisjon in kontrakt.DEFS:
            rad = {
                "event_type": hendelsestype,
                "actorrole": lagret["actorrole"],
                "referstoid": lagret.get("referstoid"),
                "data": lagret["data"],
            }
            assert kontrakt.valider(rad, definisjon) == [], h
        assert kontrakt.valider(bane.tilstand(), "tilstand") == [], h


# ---------- gjeldende svar og aksept (KA-U1) ----------


def _bane(*handlinger, start="basis"):
    bane = Domenebane()
    for h in korpus.KORPUS["prefikser"][start] + list(handlinger):
        if not bane.send(h)[0]:
            pytest.fail(f"Forutsetning: {h['handling']} avvist")
    return bane


DELVIS = {"handling": "vederlagssvar", "vurdering": "delvis", "godkjent_belop": 60000}


def test_gjeldende_svar_er_null_uten_svar():
    assert _bane().tilstand()["vederlag"]["gjeldende_respons_event_id"] is None


def test_gjeldende_svar_er_svaret_paa_gjeldende_kravversjon():
    bane = _bane(DELVIS)
    vederlag = bane.tilstand()["vederlag"]
    assert vederlag["gjeldende_respons_event_id"] == bane.hendelser[-1].event_id


def test_gjeldende_svar_er_null_naar_sporet_venter_paa_svar_paa_ny_versjon():
    """KA-U1: svaret på forrige versjon står i `respons_event_id`, men er ikke gjeldende."""
    bane = _bane(DELVIS, {"handling": "vederlagskrav_ny_versjon", "belop": 80000})
    vederlag = bane.tilstand()["vederlag"]
    if vederlag["respons_event_id"] is None:
        pytest.fail("Forutsetning: svaret på forrige versjon står i tilstanden")
    assert vederlag["gjeldende_respons_event_id"] is None


def test_gjeldende_svar_er_revisjonen():
    bane = _bane(DELVIS)
    forste = bane.hendelser[-1].event_id
    if not bane.send({"handling": "vederlagssvar_revidert", "vurdering": "delvis", "godkjent_belop": 70000})[0]:
        pytest.fail("Forutsetning: revisjonen avvist")
    gjeldende = bane.tilstand()["vederlag"]["gjeldende_respons_event_id"]
    assert gjeldende == bane.hendelser[-1].event_id != forste


def test_gjeldende_grunnlagssvar_er_null_etter_endret_underkategori():
    bane = _bane(
        {"handling": "grunnlagssvar", "resultat": "avslatt"},
        {"handling": "grunnlag_ny_versjon", "underkategori": "IRREG"},
        start="krav_eo",
    )
    assert bane.tilstand()["grunnlag"]["gjeldende_respons_event_id"] is None


def _aksept(**felt):
    foresporsel = {
        "sak_id": "S-1",
        "event_type": "te_aksepterer_respons",
        "spor": "vederlag",
        "refererer_til_event_id": str(uuid.uuid4()),
        "aktor_id": "te",
        "aktor_rolle": "TE",
        "data": {},
    }
    return {**foresporsel, **felt}


def test_ny_aksept_maa_vise_til_svaret():
    """KA-U1. Kontrollsaken er samme aksept med referanse."""
    parse_event_from_request(_aksept())
    with pytest.raises(PydanticValidationError, match="vise til svaret"):
        parse_event_from_request(_aksept(refererer_til_event_id=None))


@pytest.mark.parametrize(
    "felt",
    [{"data": {"begrunnelse": "x"}}, {"svar_id": "x"}],
    ids=["i-data", "i-kommandoen"],
)
def test_ny_aksept_med_ukjent_felt_avvises(felt):
    """#272: en ny kommando er streng, også i `data`."""
    with pytest.raises(PydanticValidationError, match="Ukjente felt"):
        parse_event_from_request(_aksept(**felt))


def test_lagret_aksept_uten_referanse_leses_som_foer():
    """Kompatibel historikklesing: en aksept lagret før #272 har ingen referanse."""
    bane = _bane({"handling": "vederlagssvar", "vurdering": "avslatt"})
    gammel = {
        "event_id": str(uuid.uuid4()),
        "sak_id": bane.sak_id,
        "event_type": "te_aksepterer_respons",
        "tidsstempel": "2026-10-01T10:00:00+00:00",
        "aktor_id": "te",
        "aktor_rolle": "TE",
        "refererer_til_event_id": None,
        "data": {"spor": "vederlag", "ukjent": "fra en eldre klient"},
    }
    hendelse = parse_event(gammel)
    assert hendelse.refererer_til_event_id is None
    tilstand = TimelineService().compute_state(bane.hendelser + [hendelse])
    assert tilstand.vederlag.te_akseptert is True
    assert tilstand.vederlag.status.value == "avslatt_akseptert"
