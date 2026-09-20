"""Access tests exercise authentication and project guards without dev bypass."""

from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from flask import Flask, jsonify

from lib.auth.domain import referenced_case_ids
from lib.auth.project_access import require_project_access
from lib.auth.session import require_auth
from lib.project_context import init_project_context


def test_nested_event_references_are_authorized_too():
    assert referenced_case_ids(
        {
            "sak_id": "own",
            "events": [
                {"data": {"koe_sak_id": "other"}},
                {"data": {"relaterte_koe_saker": ["third"]}},
            ],
        }
    ) == {"own", "other", "third"}


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    service = Mock()
    service.repo.session.return_value = {
        "app_users": {"id": "user", "email": "u@example.com"},
        "csrf_token": "csrf",
    }
    app.extensions["koe_auth"] = service

    @app.get("/protected")
    @require_auth
    @require_project_access(min_role="member")
    def protected():
        return jsonify(ok=True)

    @app.get("/cases/<sak_id>")
    @require_auth
    @require_project_access()
    def case(sak_id):
        return jsonify(ok=True)

    client = app.test_client()
    # Respect environment's cookie naming without weakening the production tests.
    from lib.auth.session import cookie_name

    client.set_cookie(cookie_name(), "token")
    return client, service


@pytest.mark.parametrize(
    "role,status",
    [("member", 200), ("admin", 200), ("viewer", 403), (None, 403), ("unknown", 403)],
)
def test_minimum_role(api, role, status):
    client, service = api
    service.role.return_value = role
    assert client.get("/protected", headers={"X-Project-ID": "p"}).status_code == status


def test_foresporsel_uten_prosjekt_avvises_for_medlemskap_slas_opp(api):
    """Uten X-Project-ID finnes ingen autorisert prosjektkontekst.

    Tidligere fylte et fallback inn 'oslobygg' her, og medlemskapet ble slått
    opp mot det prosjektet. Da kunne en rad skrevet etterpå ikke i ettertid
    skilles fra en rad som virkelig hørte til Oslobygg. Nå avvises
    forespørselen før medlemskapet i det hele tatt konsulteres — en strengere
    grense enn den gamle testen beskrev.
    """
    client, service = api
    service.role.return_value = "admin"
    assert client.get("/protected").status_code == 403
    service.role.assert_not_called()


def test_access_source_failure_does_not_grant_access(api):
    # Headeren er nødvendig for å nå oppslaget i det hele tatt: uten prosjekt
    # avvises forespørselen tidligere, og da prøves ikke kildefeilen.
    client, service = api
    service.role.side_effect = RuntimeError("source unavailable")
    assert client.get("/protected", headers={"X-Project-ID": "p"}).status_code == 503


@pytest.mark.parametrize(
    "metadata,status",
    [
        (None, 403),
        (SimpleNamespace(prosjekt_id="other"), 403),
        (SimpleNamespace(prosjekt_id="p"), 200),
    ],
)
def test_case_must_belong_to_authorized_project(api, metadata, status):
    client, service = api
    service.role.return_value = "member"
    container = Mock()
    container.metadata_repository.get.return_value = metadata
    with patch("lib.auth.project_access.get_container", return_value=container):
        assert (
            client.get("/cases/case", headers={"X-Project-ID": "p"}).status_code
            == status
        )
