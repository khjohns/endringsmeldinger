"""Medlemskapet slås opp én gang per forespørsel, ikke én gang per dekoratør.

Tilgangslaget spør to ganger om det samme: `require_project_access` via
`role()`, og `require_contract_role` via `contract_membership()`. Begge leser
`repo.membership`. Det var usynlig da en skriving betydde «send inn en
hendelse», men utkastene lagres mens brukeren skriver, så kallfrekvensen er en
helt annen nå.

Memoet lever bare i forespørselens `g`. Autoriteten er derfor like fersk som
før — den leses én gang i stedet for to innenfor samme forespørsel, og aldri
på tvers av forespørsler.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.contract_role import require_contract_role
from lib.auth.project_access import require_project_access
from lib.auth.session import cookie_name, require_auth
from lib.project_context import init_project_context
from services.auth_service import AuthService

TEAM_TE = "11111111111111111111111111111111"
TEAM_BH = "22222222222222222222222222222222"
BRUKER = "33333333333333333333333333333333"


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.setenv(
        "CATENDA_CONTRACT_TEAMS",
        f'{{"p": {{"TE": ["{TEAM_TE}"], "BH": ["{TEAM_BH}"]}}}}',
    )

    repo = Mock()
    repo.session.return_value = {
        "app_users": {"id": "u", "email": "bh@example.test", "name": "BH"},
        "csrf_token": "csrf",
    }
    repo.membership.return_value = {
        "role": "member",
        "viewer_override": False,
        "active": True,
        "catenda_subject": BRUKER,
    }
    repo.configs.return_value = [
        {"internal_project_id": "p", "catenda_project_id": "cat-p"}
    ]
    repo.sync_state.return_value = {"synced_at": "2099-01-01T00:00:00Z"}

    oauth = Mock()
    oauth.team_members.side_effect = (
        lambda prosjekt, team, token: {BRUKER} if team == TEAM_BH else set()
    )

    service = AuthService(repo=repo, oauth=oauth)
    monkeypatch.setattr(service, "ensure_fresh", lambda project_id: True)

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.extensions["koe_auth"] = service

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="topic"
    )
    container.catenda_client.ensure_authenticated.return_value = True
    container.catenda_client.access_token = "token"
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    monkeypatch.setattr("core.container.get_container", lambda: container)

    @app.route("/proev", methods=["GET"])
    @require_auth
    @require_project_access()
    @require_contract_role()
    def proev():
        return {"ok": True}

    client = app.test_client()
    client.set_cookie(cookie_name(), "sesjon")
    return SimpleNamespace(client=client, repo=repo)


def test_begge_dekoratorene_deler_ett_medlemskapsoppslag(api):
    svar = api.client.get("/proev", headers={"X-Project-ID": "p"})

    assert svar.status_code == 200
    assert api.repo.membership.call_count == 1


def test_neste_forespoersel_leser_medlemskapet_paa_nytt(api):
    """Memoet er per forespørsel. Autoriteten skal ikke bli stående."""
    for _ in range(2):
        api.client.get("/proev", headers={"X-Project-ID": "p"})

    assert api.repo.membership.call_count == 2
