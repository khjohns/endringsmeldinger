"""Internt notat skal kun være synlig for forfatterens egen organisasjon.

Hendelsestypen er dokumentert som «kun synlig for egen organisasjon»
(models/events.py, src/lib/types/timeline.ts). Skillet går på Catenda-team, ikke
på kontraktsside: en side kan ha flere team, og byggherren og en ekstern
rådgiver er ulike organisasjoner selv om begge er BH. Testene her holder
lesesiden opp mot den regelen: andre skal verken se notatteksten eller at
notatet finnes.
"""

import json
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.events import InterntNotatData, InterntNotatEvent
from routes import event_routes
from services.timeline_service import TimelineService

NOTAT_TEKST = "Internt: vårt krav står svakt på årsakssammenheng."

TE_TEAM = "22222222222222222222222222222222"
BH_BYGGHERRE_TEAM = "33333333333333333333333333333333"
BH_RADGIVER_TEAM = "55555555555555555555555555555555"


def _notat(rolle: str, team: str) -> InterntNotatEvent:
    return InterntNotatEvent(
        sak_id="case",
        aktor="Notatskriver",
        aktor_rolle=rolle,
        aktor_team_id=team,
        tidsstempel=datetime(2026, 9, 15, 9, 0, tzinfo=UTC),
        data=InterntNotatData(tekst=NOTAT_TEKST, spor="grunnlag"),
    )


@pytest.fixture
def api(monkeypatch, tmp_path):
    """Ekte auth og ruteparsing; kun lager og providere er erstattet."""

    def build(leser_rolle, notat_rolle, leser_team, notat_team):
        monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
        monkeypatch.delenv("DISABLE_AUTH", raising=False)
        app = Flask(__name__)
        app.testing = True
        init_project_context(app)
        app.register_blueprint(event_routes.events_bp)

        auth = Mock()
        auth.repo.session.return_value = {
            "app_users": {"id": "u", "email": "leser@example.com", "name": "Leser"},
            "csrf_token": "csrf",
        }
        auth.role.return_value = "member"
        auth.contract_role.return_value = leser_rolle
        auth.contract_membership.return_value = (leser_rolle, leser_team)
        app.extensions["koe_auth"] = auth

        container = Mock()
        container.metadata_repository.get.return_value = SimpleNamespace(
            prosjekt_id="p", catenda_topic_id="topic"
        )
        container.event_repository.get_events.return_value = (
            [_notat(notat_rolle, notat_team).model_dump(mode="json")],
            1,
        )
        container.timeline_service = TimelineService()
        monkeypatch.setattr(event_routes, "_get_container", lambda: container)
        monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

        client = app.test_client()
        client.set_cookie(cookie_name(), "session")
        return client

    return build


def _get(client, path):
    return client.get(path, headers={"X-Project-ID": "p"})


def _body(response) -> str:
    """Serialiser uten ASCII-escaping slik at norske tegn kan sammenlignes."""
    return json.dumps(response.get_json(), ensure_ascii=False)


def _assert_skjult(response):
    assert response.status_code == 200, response.get_data(as_text=True)
    body = _body(response)
    assert NOTAT_TEKST not in body, "Notatteksten lekket"
    assert "internt_notat" not in body, "Notatets eksistens lekket"


@pytest.mark.parametrize("path", ["timeline", "context"])
def test_motpart_ser_ikke_internt_notat(api, path):
    """BH skal ikke få TEs interne notat fra lesepunktene."""
    client = api("BH", "TE", BH_BYGGHERRE_TEAM, TE_TEAM)
    _assert_skjult(_get(client, f"/api/cases/case/{path}"))


@pytest.mark.parametrize("path", ["timeline", "context"])
def test_samme_side_annet_team_ser_ikke_notatet(api, path):
    """Rådgiveren er på BH-siden, men er ikke byggherrens organisasjon.

    Dette er tilfellet et rent TE/BH-filter ikke fanger.
    """
    client = api("BH", "BH", BH_RADGIVER_TEAM, BH_BYGGHERRE_TEAM)
    _assert_skjult(_get(client, f"/api/cases/case/{path}"))


@pytest.mark.parametrize("path", ["timeline", "context"])
def test_eget_team_ser_eget_internt_notat(api, path):
    """Egen organisasjon skal fortsatt se notatet sitt."""
    client = api("TE", "TE", TE_TEAM, TE_TEAM)
    response = _get(client, f"/api/cases/case/{path}")

    assert response.status_code == 200, response.get_data(as_text=True)
    assert NOTAT_TEKST in _body(response)


@pytest.mark.parametrize("path", ["state", "context"])
def test_aktivitetstall_teller_ikke_skjulte_notater(api, path):
    """Teksten er skjult, men tellingen røper at notatet finnes, og når.

    Regelen i event_visibility er at selve eksistensen er skjermingsverdig, så
    antall_events og siste_aktivitet må utledes av det leseren faktisk ser
    (RV-09)."""
    client = api("BH", "TE", BH_BYGGHERRE_TEAM, TE_TEAM)
    response = _get(client, f"/api/cases/case/{path}")
    assert response.status_code == 200, response.get_data(as_text=True)
    state = response.get_json()["state"]
    assert state["antall_events"] == 0
    assert state["siste_aktivitet"] is None


@pytest.mark.parametrize("path", ["state", "context"])
def test_eget_team_ser_egen_aktivitet(api, path):
    client = api("TE", "TE", TE_TEAM, TE_TEAM)
    state = _get(client, f"/api/cases/case/{path}").get_json()["state"]
    assert state["antall_events"] == 1
    assert state["siste_aktivitet"] is not None


def test_internt_notat_flytter_ikke_delt_aktivitetsstempel(submit_api):
    """last_event_at ligger i en delt metadatacache som sakslisten sorterer på."""
    response = submit_api.client.post(
        "/api/events",
        json={
            "sak_id": "case",
            "expected_version": 1,
            "event": {
                "event_type": "internt_notat",
                "data": {"tekst": NOTAT_TEKST, "spor": "grunnlag"},
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )
    assert response.status_code == 201, response.get_data(as_text=True)
    assert submit_api.container.metadata_repository.update_cache.called
    assert (
        submit_api.container.metadata_repository.update_cache.call_args.kwargs[
            "last_event_at"
        ]
        is None
    )


# ============ UTGÅENDE CATENDA-LEVERING ============


@pytest.fixture
def submit_api(monkeypatch, tmp_path):
    """Innsendingsrute med ekte forretningsregler; Catenda er slått på."""
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)

    # settings leses ved import; feltet settes derfor direkte.
    from core.config import settings

    monkeypatch.setattr(settings, "catenda_enabled", "true")

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "te@example.com", "name": "TE Bruker"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "TE"
    auth.contract_membership.return_value = ("TE", TE_TEAM)
    app.extensions["koe_auth"] = auth

    sak_opprettet = {
        "event_type": "sak_opprettet",
        "sak_id": "case",
        "aktor": "System",
        "aktor_rolle": "TE",
        "tidsstempel": "2026-09-15T08:00:00Z",
        "sakstittel": "Testsak",
        "catenda_topic_id": "owned-topic",
    }

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="owned-topic"
    )
    container.event_repository.get_events.return_value = ([sak_opprettet], 1)
    container.event_repository.append.return_value = 2
    container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    # Catenda-preflight og -levering erstattes: testen måler om levering forsøkes.
    monkeypatch.setattr(event_routes, "_ensure_catenda_auth", lambda *a, **k: None)
    post_spy = Mock(return_value=(True, "server", []))
    monkeypatch.setattr(event_routes, "_post_to_catenda", post_spy)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(
        client=client,
        container=container,
        post_to_catenda=post_spy,
        appended=lambda: container.event_repository.append.call_args.args[0],
    )


def test_internt_notat_gir_ingen_catenda_levering(submit_api):
    """Et internt notat skal ikke nå den delte Catenda-topicen.

    Dagens leveringshjelper laster opp en servergenerert saksrapport og poster
    en kommentar for enhver hendelsestype. For et internt notat ville det vise
    motparten både at notatet finnes og hele sakens innhold som vedlegg.
    """
    response = submit_api.client.post(
        "/api/events",
        json={
            "sak_id": "case",
            "expected_version": 1,
            "event": {
                "event_type": "internt_notat",
                "data": {"tekst": NOTAT_TEKST, "spor": "grunnlag"},
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert response.status_code == 201, response.get_data(as_text=True)
    submit_api.post_to_catenda.assert_not_called()
    assert response.get_json()["catenda_skipped_reason"] == "internal_note"


def test_vanlig_hendelse_leveres_fortsatt(submit_api):
    """Kontroll: filteret må ikke stanse ordinær Catenda-levering."""
    response = submit_api.client.post(
        "/api/events",
        json={
            "sak_id": "case",
            "expected_version": 1,
            "event": {
                "event_type": "grunnlag_opprettet",
                "data": {
                    "tittel": "Krav",
                    "hovedkategori": "ENDRING",
                    "underkategori": "IRREG",
                    "beskrivelse": "Beskrivelse",
                    "dato_oppdaget": "2026-09-13",
                },
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert response.status_code == 201, response.get_data(as_text=True)
    submit_api.post_to_catenda.assert_called_once()


def test_team_stemples_av_serveren_ikke_av_klienten(submit_api):
    """Organisasjonen på hendelsen må komme fra medlemsoppslaget.

    Kunne klienten oppgi aktor_team_id selv, ville den kunne adressere notatet
    til en annen organisasjon — eller gi seg selv innsyn i andres notater.
    """
    response = submit_api.client.post(
        "/api/events",
        json={
            "sak_id": "case",
            "expected_version": 1,
            "event": {
                "event_type": "internt_notat",
                "aktor_team_id": "forfalsket-team",
                "data": {"tekst": NOTAT_TEKST, "spor": "grunnlag"},
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert response.status_code == 201, response.get_data(as_text=True)
    lagret = submit_api.appended()
    assert lagret.aktor_team_id == TE_TEAM


def test_notat_avvises_uten_entydig_organisasjon(monkeypatch, tmp_path):
    """Er leseren med i to team på samme side, kan notatet ikke skrives.

    Et notat uten entydig organisasjon ville vært ulesbart for alle — også for
    forfatteren — så det avvises i stedet for å bli lagret som død data.
    """
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "te@example.com", "name": "TE Bruker"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "BH"
    # Medlem i to BH-team: rollen er entydig, organisasjonen er det ikke.
    auth.contract_membership.return_value = ("BH", None)
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="topic"
    )
    container.event_repository.get_events.return_value = ([], 0)
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")

    response = client.post(
        "/api/events",
        json={
            "sak_id": "case",
            "expected_version": 0,
            "event": {
                "event_type": "internt_notat",
                "data": {"tekst": NOTAT_TEKST, "spor": "grunnlag"},
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert response.status_code == 403, response.get_data(as_text=True)
    assert "teamtilknytning" in response.get_json()["message"]
    container.event_repository.append.assert_not_called()
