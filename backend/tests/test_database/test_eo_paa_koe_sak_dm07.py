"""DM-07: `eo_opprettet` på en eksisterende KOE-sak gjør den om til en endringsordresak.

`eo_opprettet` har ingen regel om sakstype, og behandleren setter sakstypen til
endringsordre uansett hvilken sak hendelsen kommer i. BH kan sende den gjennom
`POST /api/events` i et prosjekt uten godkjenningspolicy.

Kilden for forventningen er oppdragsgivers svar 29.09: en endringsordresak kan
følge av en KOE-sak, men ikke erstatte den, verken i historikken eller som en
egen hendelse i KOE-saken. Kontrollen sender et BH-svar på grunnlaget i samme
sak og viser at BH har tilgang og at ruta tar imot BHs hendelser der. Ruter,
dekoratører, lagre og base er ekte; bare innloggingstjenesten er byttet ut.
Beskrevet i docs/gjennomforing-spor-m-1b-2026-09-29.md.
"""

from unittest.mock import Mock
from uuid import uuid4

import psycopg
import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context

pytestmark = pytest.mark.database

PROSJEKT = "p-dm07"
HEADERS = {"X-Project-ID": PROSJEKT, "X-CSRF-Token": "csrf"}
BRUKER = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"


@pytest.fixture
def innlogging():
    innlogging = Mock()
    innlogging.repo.session.return_value = {
        "app_users": {"id": BRUKER, "email": "part@example.com", "name": "Part"},
        "csrf_token": "csrf",
    }
    innlogging.role.return_value = "member"
    innlogging.contract_membership.return_value = ("TE", "team-te")
    return innlogging


@pytest.fixture
def klient(container_mot_testbasen, innlogging, monkeypatch):
    from routes import event_routes

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)
    app.extensions["koe_auth"] = innlogging
    klient = app.test_client()
    klient.set_cookie(cookie_name(), "session")
    return klient


@pytest.fixture
def koe_sak(klient, innlogging):
    """En KOE-sak med sendt grunnlag, opprettet av TE gjennom batch-ruta."""
    sak_id = str(uuid4())
    svar = klient.post(
        "/api/events/batch",
        json={
            "sak_id": sak_id,
            "expected_version": 0,
            "sakstype": "standard",
            "events": [
                {"event_type": "sak_opprettet", "sakstittel": "Fundament", "sakstype": "standard"},
                {
                    "event_type": "grunnlag_opprettet",
                    "data": {
                        "tittel": "Fundament",
                        "hovedkategori": "ENDRING",
                        "underkategori": "EO",
                        "beskrivelse": "Endret fundamentering",
                        "dato_oppdaget": "2026-09-01",
                    },
                },
            ],
        },
        headers=HEADERS,
    )
    if svar.status_code != 201:
        pytest.fail(f"KOE-saken ble ikke opprettet: {svar.status_code} {svar.get_json()}")
    innlogging.contract_membership.return_value = ("BH", "team-bh")
    return sak_id


def _journalen(url: str, sak_id: str) -> list[str]:
    with psycopg.connect(url, autocommit=True) as c:
        rader = c.execute(
            "SELECT event_type FROM hendelse WHERE sak_id = %s ORDER BY versjon", (sak_id,)
        ).fetchall()
    return [r[0] for r in rader]


def _grunnlagets_id(url: str, sak_id: str) -> str:
    with psycopg.connect(url, autocommit=True) as c:
        (event_id,) = c.execute(
            "SELECT event_id::text FROM hendelse WHERE sak_id = %s"
            " AND event_type = 'grunnlag_opprettet'",
            (sak_id,),
        ).fetchone()
    return event_id


def test_dm07_kontroll_bh_kan_svare_i_koe_saken(klient, koe_sak, testbase_url):
    svar = klient.post(
        "/api/events",
        json={
            "sak_id": koe_sak,
            "expected_version": 2,
            "event": {
                "event_type": "respons_grunnlag",
                "refererer_til_event_id": _grunnlagets_id(testbase_url, koe_sak),
                "data": {"resultat": "godkjent", "begrunnelse": "Enig i ansvaret"},
            },
        },
        headers=HEADERS,
    )

    assert svar.status_code == 201, svar.get_json()
    assert _journalen(testbase_url, koe_sak)[-1] == "respons_grunnlag"


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DM-07: eo_opprettet godtas i en KOE-sak og gjør den til en endringsordresak",
)
def test_dm07_eo_opprettet_avvises_i_en_koe_sak(klient, koe_sak, testbase_url):
    svar = klient.post(
        "/api/events",
        json={
            "sak_id": koe_sak,
            "expected_version": 2,
            "event": {
                "event_type": "eo_opprettet",
                "data": {"eo_nummer": "EO-1", "beskrivelse": "Endret fundamentering"},
            },
        },
        headers=HEADERS,
    )
    if svar.status_code not in (201, 400):
        pytest.fail(f"Uventet svar {svar.status_code}: {svar.get_json()}")

    assert svar.status_code == 400, svar.get_json()
    assert svar.get_json()["error"] == "BUSINESS_RULE_VIOLATION", svar.get_json()
    assert _journalen(testbase_url, koe_sak) == ["sak_opprettet", "grunnlag_opprettet"]
