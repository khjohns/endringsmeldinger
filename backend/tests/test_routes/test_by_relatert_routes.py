"""By-relatert-rutene skiller «ingen koblinger» fra «kunne ikke hente» (#72).

Kilden for forventningen er oppdragsgivers beslutning 03.10 i #72: en
forbigående feil i datalaget gir 503, ikke 200 med tom liste. Dataene er
lagerdobler som kaster feilklassene fra kjernen, uavhengig av database.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.db.feil import PermanentError, TransientError
from lib.project_context import init_project_context
from models.events import SakOpprettetEvent
from routes import endringsordre_routes, forsering_routes
from services.forsering_service import ForseringService
from services.timeline_service import TimelineService

HEADERS = {"X-Project-ID": "p"}


def _forsering_event(sak_id: str, koe: str) -> dict:
    return SakOpprettetEvent(
        sak_id=sak_id,
        sakstittel="Forsering",
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": [koe], "dato_varslet": "2026-10-01"},
    ).model_dump(mode="json")


class Relasjonslager:
    def __init__(self, svar=None, feil=None):
        self.svar = svar or []
        self.feil = feil

    def get_containers_for_sak(self, target_sak_id, relation_type):
        if self.feil:
            raise self.feil
        return list(self.svar)


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(forsering_routes.forsering_bp)
    app.register_blueprint(endringsordre_routes.endringsordre_bp)
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user", "email": "te@example.com", "name": "TE"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_membership.return_value = ("TE", "team")
    app.extensions["koe_auth"] = auth

    metadata = {
        "KOE-1": SimpleNamespace(prosjekt_id="p"),
        "F-1": SimpleNamespace(prosjekt_id="p"),
        "KOE-X": SimpleNamespace(prosjekt_id="annet"),
    }
    events = Mock()
    store = {"F-1": [_forsering_event("F-1", "KOE-1")]}
    events.get_events.side_effect = lambda sak: (store.get(sak, []), 1)
    relasjoner = Relasjonslager(svar=["F-1"])
    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=None,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=relasjoner,
    )
    eo_service = Mock()
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr(
        endringsordre_routes, "_get_endringsordre_service", lambda: eo_service
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    client = app.test_client()
    client.set_cookie(cookie_name(), "token")
    return SimpleNamespace(
        client=client, events=events, relasjoner=relasjoner, eo_service=eo_service
    )


def test_forseringer_normal_sti_er_uendret(api):
    response = api.client.get("/api/forsering/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert [f["forsering_sak_id"] for f in body["forseringer"]] == ["F-1"]


def test_forseringer_ingen_koblinger_gir_tom_liste(api):
    api.relasjoner.svar = []
    response = api.client.get("/api/forsering/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 200
    assert response.get_json() == {"success": True, "forseringer": []}


def test_forbigaende_feil_i_relasjonslageret_gir_503(api):
    api.relasjoner.feil = TransientError("Databasen svarte ikke")
    response = api.client.get("/api/forsering/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 503
    body = response.get_json()
    assert body["success"] is False
    assert "forseringer" not in body


def test_forbigaende_feil_ved_lesing_av_forseringen_gir_503(api):
    api.events.get_events.side_effect = TransientError("Databasen svarte ikke")
    response = api.client.get("/api/forsering/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 503
    assert "forseringer" not in response.get_json()


def test_permanent_feil_gir_500_ikke_tom_liste(api):
    api.relasjoner.feil = PermanentError("SQLSTATE 42P01")
    response = api.client.get("/api/forsering/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 500
    assert "forseringer" not in response.get_json()


def test_sak_i_annet_prosjekt_avvises_fortsatt_med_403(api):
    api.relasjoner.feil = TransientError("skal ikke nås")
    response = api.client.get("/api/forsering/by-relatert/KOE-X", headers=HEADERS)
    assert response.status_code == 403


def test_endringsordrer_normal_sti_er_uendret(api):
    api.eo_service.finn_eoer_for_koe.return_value = [{"eo_sak_id": "EO-1"}]
    response = api.client.get("/api/endringsordre/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 200
    assert response.get_json() == {
        "success": True,
        "endringsordrer": [{"eo_sak_id": "EO-1"}],
    }


def test_endringsordrer_forbigaende_feil_gir_503(api):
    api.eo_service.finn_eoer_for_koe.side_effect = TransientError("nede")
    response = api.client.get("/api/endringsordre/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 503
    assert "endringsordrer" not in response.get_json()


def test_endringsordrer_sak_utenfor_prosjektet_gir_fortsatt_400(api):
    api.eo_service.finn_eoer_for_koe.side_effect = ValueError(
        "Saken finnes ikke i prosjektet"
    )
    response = api.client.get("/api/endringsordre/by-relatert/KOE-1", headers=HEADERS)
    assert response.status_code == 400
