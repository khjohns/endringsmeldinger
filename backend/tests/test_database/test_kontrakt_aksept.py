"""Kontrakten for flyten i språkprøven ved HTTP-grensen (#272).

Kommandoene sendes gjennom `/api/events` og `/api/events/batch` med ekte
dekoratører og lagre mot testbasen. Den lagrede hendelsen leses som rad i
`hendelse`, og tilstanden fra ruta sammenliknes med tilstanden etter
gjenlesing. Skjemaet står i docs/domenetabell/kontrakt.json, og
forventningene i aksepten er KA-U1 og KA-U5 i hovedplanen.
"""

import uuid

import pytest

from models.events import parse_event
from tests.test_database.test_domenetabell_lagring import (
    AVVISNINGER,
    HEADERS,
    PROSJEKT,
    Batchbane,
    Rutebane,
)
from tests.test_domenetabell import kontrakt, korpus

pytestmark = pytest.mark.database

DELVIS = {"handling": "vederlagssvar", "vurdering": "delvis", "godkjent_belop": 60000}


@pytest.fixture(params=[Rutebane, Batchbane], ids=["events", "batch"])
def ny_bane(request, hendelsesklient, innlogging, container_mot_testbasen):
    lager = container_mot_testbasen.event_repository
    return lambda: request.param(hendelsesklient, innlogging, lager)


def _bane(ny_bane, *handlinger):
    bane = ny_bane()
    for h in korpus.KORPUS["prefikser"]["basis"] + list(handlinger):
        if not bane.send(h)[0]:
            pytest.fail(f"Forutsetning: {h['handling']} avvist")
    return bane


def _rader(testbase, sak_id) -> list[dict]:
    from psycopg.rows import dict_row

    return testbase.cursor(row_factory=dict_row).execute(
        "SELECT event_id::text AS event_id, sak_id, event_type, versjon, actorid, actorrole,"
        " actorteam, referstoid::text AS referstoid, data FROM hendelse WHERE sak_id = %s"
        " ORDER BY versjon",
        (sak_id,),
    ).fetchall()


def _send(bane, kommando, rolle="TE", expected_version=None):
    bane._som(rolle)
    nyttelast = bane._nyttelast(kommando)
    if expected_version is not None:
        nyttelast["expected_version"] = expected_version
    return bane.klient.post(bane.rute, json=nyttelast, headers=HEADERS)


def _aksept(referanse, spor="vederlag", **felt):
    kommando = {"event_type": "te_aksepterer_respons", "spor": spor, "data": {}, **felt}
    if referanse is not None:
        kommando["refererer_til_event_id"] = referanse
    return kommando


def _gjeldende(bane, spor="vederlag"):
    return bane.tilstand()[spor]["gjeldende_respons_event_id"]


def _godtatt_og_lik_gjenlesingen(bane, svar):
    if svar.status_code != 201:
        pytest.fail(f"Ventet 201: {svar.status_code} {svar.get_json()}")
    tilstand = svar.get_json()["state"]
    assert tilstand == bane.tilstand(), "Tilstanden fra ruta er ikke lik tilstanden etter gjenlesing"
    assert kontrakt.valider(tilstand, "tilstand") == []
    return tilstand


def test_aksept_av_gjeldende_svar_lagres_med_referansen(ny_bane, testbase):
    """KA-U1 og KA-U5: aksepten peker på svaret, og et godtatt delvis svar gir `godkjent`."""
    bane = _bane(ny_bane, DELVIS)
    svar_id = _gjeldende(bane)
    tilstand = _godtatt_og_lik_gjenlesingen(bane, _send(bane, _aksept(svar_id, data={"kommentar": "Enig"})))

    rad = _rader(testbase, bane.sak_id)[-1]
    assert kontrakt.valider(rad, "rad") == []
    assert kontrakt.valider(rad, "hendelse.te_aksepterer_respons") == []
    assert rad["referstoid"] == svar_id
    assert rad["data"] == {"spor": "vederlag", "kommentar": "Enig"}
    assert tilstand["vederlag"]["te_akseptert"] is True
    assert tilstand["vederlag"]["status"] == "godkjent"
    assert tilstand["vederlag"]["godkjent_belop"] == 60000


def _annen_sak(ny_bane, bane):
    annen = _bane(ny_bane, DELVIS)
    return _aksept(_gjeldende(annen)), None


def _annet_spor(ny_bane, bane):
    return _aksept(_gjeldende(bane, "grunnlag")), None


def _tidligere_kravversjon(ny_bane, bane):
    forrige = _gjeldende(bane)
    if not bane.send({"handling": "vederlagskrav_ny_versjon", "belop": 80000})[0]:
        pytest.fail("Forutsetning: ny kravversjon avvist")
    # Kontrollsaken trenger et svar på den nye versjonen.
    return _aksept(forrige), {"handling": "vederlagssvar", "vurdering": "delvis", "godkjent_belop": 70000}


def _revidert(ny_bane, bane):
    forste = _gjeldende(bane)
    if not bane.send({"handling": "vederlagssvar_revidert", "vurdering": "delvis", "godkjent_belop": 70000})[0]:
        pytest.fail("Forutsetning: revisjonen avvist")
    return _aksept(forste), None


def _uten_referanse(ny_bane, bane):
    return _aksept(None), None


def _ukjent_felt_i_data(ny_bane, bane):
    return _aksept(_gjeldende(bane), data={"begrunnelse": "Enig"}), None


def _ukjent_felt(ny_bane, bane):
    return _aksept(_gjeldende(bane), svar_id=_gjeldende(bane)), None


def _kommentar_paa_toppnivaa(ny_bane, bane):
    """`kommentar` finnes i `SakEvent`, men ikke i akseptkommandoen; den står i `data`."""
    return _aksept(_gjeldende(bane), kommentar="Enig"), None


@pytest.mark.parametrize(
    ("tilfelle", "avvisning"),
    [
        (_annen_sak, "CURRENT_RESPONSE"),
        (_annet_spor, "CURRENT_RESPONSE"),
        (_tidligere_kravversjon, "CURRENT_RESPONSE"),
        (_revidert, "CURRENT_RESPONSE"),
        (_uten_referanse, "vise til svaret"),
        (_ukjent_felt_i_data, "Ukjente felt: begrunnelse"),
        (_ukjent_felt, "Ukjente felt: svar_id"),
        (_kommentar_paa_toppnivaa, "Ukjente felt: kommentar"),
    ],
    ids=lambda v: v.__name__.lstrip("_") if callable(v) else None,
)
def test_aksept_som_ikke_gjelder_gjeldende_svar_avvises(ny_bane, testbase, tilfelle, avvisning):
    """KA-U1 og #272. Avvisningen gjelder referansen eller feltet: kontrollsaken
    er aksepten av gjeldende svar, uten det ukjente feltet, og den godtas."""
    bane = _bane(ny_bane, DELVIS)
    kommando, steg_for_kontroll = tilfelle(ny_bane, bane)
    for_ = _rader(testbase, bane.sak_id)

    svar = _send(bane, kommando)
    feil = svar.get_json() or {}
    if svar.status_code != 400 or feil.get("error") not in AVVISNINGER:
        pytest.fail(f"Ventet en avvisning: {svar.status_code} {feil}")
    assert avvisning in (feil.get("rule") or feil.get("message")), feil
    assert _rader(testbase, bane.sak_id) == for_, "Journalen endret seg"

    if steg_for_kontroll and not bane.send(steg_for_kontroll)[0]:
        pytest.fail("Forutsetning: steget før kontrollsaken avvist")
    _godtatt_og_lik_gjenlesingen(bane, _send(bane, _aksept(_gjeldende(bane))))


def test_aksept_med_foreldet_versjon_gir_konflikt(ny_bane, testbase):
    bane = _bane(ny_bane, DELVIS)
    for_ = _rader(testbase, bane.sak_id)
    svar = _send(bane, _aksept(_gjeldende(bane)), expected_version=len(for_) - 1)
    assert svar.status_code == 409
    assert svar.get_json()["error"] == "VERSION_CONFLICT"
    assert _rader(testbase, bane.sak_id) == for_
    _godtatt_og_lik_gjenlesingen(bane, _send(bane, _aksept(_gjeldende(bane))))


@pytest.mark.parametrize("spesifisering_i_tide", [True, False])
def test_fristsvar_lagrer_bare_vurderingene_som_er_gjort(ny_bane, testbase, spesifisering_i_tide):
    """KA-U4 og API-vedtaket 05.10, rad KA-18b og KA-18c: § 33.6.2 gjelder ikke
    et krav som ikke besvarer en forespørsel. Vurderingen er utelatt i
    hendelsen og `null` i tilstanden; de som er gjort, lagres med verdien."""
    bane = _bane(ny_bane)
    h = {"handling": "fristsvar", "varsel_i_tide": True, "spesifisering_i_tide": spesifisering_i_tide, "hindring": True}
    if not bane.send(h)[0]:
        pytest.fail("Forutsetning: fristsvaret avvist")
    rad = _rader(testbase, bane.sak_id)[-1]
    assert kontrakt.valider(rad, "hendelse.respons_frist") == []
    assert "foresporsel_svar_ok" not in rad["data"]
    assert rad["data"]["spesifisert_krav_ok"] is spesifisering_i_tide
    frist = bane.tilstand()["frist"]
    assert frist["foresporsel_svar_ok"] is None
    assert frist["spesifisert_krav_ok"] is spesifisering_i_tide


def test_null_i_en_vurdering_lagres_som_utelatt(ny_bane, testbase):
    """KA-U4: `null` og utelatt betyr begge «ikke vurdert», og hendelsen får ikke feltet."""
    bane = _bane(ny_bane)
    _, kommando = korpus.foresporsel(
        {"handling": "fristsvar", "varsel_i_tide": True, "spesifisering_i_tide": True, "hindring": True},
        bane.sak(),
        bane.sak_id,
    )
    kommando["data"]["foresporsel_svar_ok"] = None
    assert kontrakt.valider(kommando, "kommando.respons_frist") == []
    _godtatt_og_lik_gjenlesingen(bane, _send(bane, kommando, rolle="BH"))
    assert "foresporsel_svar_ok" not in _rader(testbase, bane.sak_id)[-1]["data"]
    assert bane.tilstand()["frist"]["foresporsel_svar_ok"] is None


def test_ukjent_felt_i_en_tolerant_kommando_forkastes(ny_bane, testbase):
    """Kravene i flyten er ikke nye kommandoer og er tolerante (#272): feltet lagres ikke."""
    bane = _bane(ny_bane)
    _, kommando = korpus.foresporsel({"handling": "vederlagskrav_ny_versjon", "belop": 80000}, None, bane.sak_id)
    kommando["data"]["ukjent_felt"] = "x"
    _godtatt_og_lik_gjenlesingen(bane, _send(bane, kommando))
    assert "ukjent_felt" not in _rader(testbase, bane.sak_id)[-1]["data"]


def test_lagret_aksept_uten_referanse_leses_som_foer(hendelsesklient, innlogging, container_mot_testbasen, testbase):
    """Kompatibel historikklesing: en aksept lagret før #272 har `referstoid` null."""
    lager = container_mot_testbasen.event_repository
    bane = Rutebane(hendelsesklient, innlogging, lager)
    for h in korpus.KORPUS["prefikser"]["basis"] + [DELVIS]:
        bane.send(h)
    gammel = parse_event(
        {
            "event_id": str(uuid.uuid4()),
            "sak_id": bane.sak_id,
            "event_type": "te_aksepterer_respons",
            "tidsstempel": "2026-10-01T10:00:00+00:00",
            "aktor_id": innlogging.repo.session.return_value["app_users"]["id"],
            "aktor_rolle": "TE",
            "data": {"spor": "vederlag"},
        }
    )
    with bane.lesing():
        lager.append(gammel, len(bane.journal()))
    assert _rader(testbase, bane.sak_id)[-1]["referstoid"] is None

    bane._som("TE")
    svar = hendelsesklient.get(f"/api/cases/{bane.sak_id}/state", headers={"X-Project-ID": PROSJEKT})
    assert svar.status_code == 200, svar.get_json()
    vederlag = svar.get_json()["state"]["vederlag"]
    assert vederlag["te_akseptert"] is True
    assert vederlag["status"] == "godkjent"


FLYTEN = [f for f in korpus.KORPUS["forlop"] if set(f["rader"]) <= set(kontrakt.SKJEMA["x-rader"])]


@pytest.mark.parametrize("forlop", FLYTEN, ids=[f["id"] for f in FLYTEN])
def test_raden_og_tilstanden_i_flyten_holder_kontrakten(forlop, hendelsesklient, innlogging, container_mot_testbasen, testbase):
    """Hver lagret rad og hver tilstand etter et godtatt steg i flyten, gjennom `/api/events`."""
    bane = Rutebane(hendelsesklient, innlogging, container_mot_testbasen.event_repository)
    prefiks, steg = korpus.steg_med_prefiks(forlop)
    for h in prefiks + steg:
        antall = len(bane.journal())
        if not bane.send(h)[0]:
            continue
        rader = _rader(testbase, bane.sak_id)
        assert len(rader) == antall + 1
        assert kontrakt.valider(rader[-1], "rad") == [], h
        hendelse = f"hendelse.{rader[-1]['event_type'].removesuffix('_oppdatert')}"
        if hendelse in kontrakt.DEFS:
            assert kontrakt.valider(rader[-1], hendelse) == [], h
        assert kontrakt.valider(bane.tilstand(), "tilstand") == [], h
