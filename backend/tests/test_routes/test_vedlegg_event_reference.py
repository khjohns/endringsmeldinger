"""Et `vedlegg_ids` på en hendelse må peke på et vedlegg som hører til saken.

VED-01 strammet formen (UUID, maks 50). Det er ikke den egentlige regelen:
en gyldig UUID kan fortsatt peke på et dokument i et annet prosjekt, eller på
ingenting. Nå som vedlegg registreres per sak, kan referansen kontrolleres.

Hendelsene inngår i formelle brev, og vedleggslisten vises til BH-godkjenner.
En referanse som ikke er kontrollert er et beslutningsgrunnlag ingen har sjekket.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import event_routes
from services.timeline_service import TimelineService
from services.vedlegg_registry import VedleggRegistry

UKJENT_VEDLEGG = "11111111-1111-4111-8111-111111111111"


@pytest.fixture
def api(monkeypatch, tmp_path):
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)

    # Ett vedlegg hører til saken, ett hører til en annen sak i samme prosjekt.
    registry = VedleggRegistry()
    eget = registry.stage("p", "case", "eget.pdf", b"%PDF-", "TE Bruker", "TE")
    fremmed = registry.stage("p", "annen-sak", "fremmed.pdf", b"%PDF-", "Andre", "TE")

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
    auth.contract_membership.return_value = ("TE", "team-te")
    app.extensions["koe_auth"] = auth

    sak_opprettet = {
        "event_type": "sak_opprettet",
        "sak_id": "case",
        "aktor": "System",
        "aktor_rolle": "TE",
        "tidsstempel": "2026-09-15T08:00:00Z",
        "sakstittel": "Testsak",
    }
    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id=None
    )
    container.event_repository.get_events.return_value = ([sak_opprettet], 1)
    container.event_repository.append.return_value = 2
    container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(
        client=client,
        container=container,
        eget=eget["id"],
        fremmed=fremmed["id"],
    )


def _send(api, vedlegg_ids):
    return api.client.post(
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
                    "vedlegg_ids": vedlegg_ids,
                },
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


def test_vedlegg_fra_annen_sak_avvises(api):
    """En gyldig UUID er ikke nok — vedlegget må høre til denne saken."""
    response = _send(api, [api.fremmed])

    assert response.status_code == 400, response.get_data(as_text=True)
    assert "vedlegg" in response.get_json()["message"].lower()
    api.container.event_repository.append.assert_not_called()


def test_ukjent_vedlegg_avvises(api):
    """En UUID som ikke er registrert noe sted skal heller ikke godtas."""
    response = _send(api, [UKJENT_VEDLEGG])

    assert response.status_code == 400
    api.container.event_repository.append.assert_not_called()


def test_eget_vedlegg_godtas(api):
    """Kontroll: sakens eget vedlegg skal fortsatt kunne refereres."""
    response = _send(api, [api.eget])

    assert response.status_code == 201, response.get_data(as_text=True)
    lagret = api.container.event_repository.append.call_args.args[0]
    assert lagret.data.vedlegg_ids == [api.eget]


def test_ingen_vedlegg_er_fortsatt_lovlig(api):
    assert _send(api, []).status_code == 201


def test_kompakt_og_dashet_form_er_samme_vedlegg(api):
    """Vedleggs-ID-en er en UUID; begge skriveformer skal treffe samme rad.

    Registeret lagrer den dashede formen, men en klient kan sende den kompakte.
    """
    from uuid import UUID

    assert _send(api, [UUID(api.eget).hex]).status_code == 201


def test_batchinnsending_leverer_vedlegg(api, monkeypatch):
    """Batch bruker append_batch og må levere vedlegg som enkeltinnsending.

    Uten dette ville saken vist til et vedlegg som aldri nådde Catenda.
    """
    levert = []
    monkeypatch.setattr(
        "routes.vedlegg_routes.lever_vedlegg_for_hendelser",
        lambda p, s, hendelser: levert.extend(hendelser),
    )
    api.container.event_repository.append_batch.return_value = 3

    response = api.client.post(
        "/api/events/batch",
        json={
            "sak_id": "case",
            "expected_version": 1,
            "events": [
                {
                    "event_type": "grunnlag_opprettet",
                    "data": {
                        "tittel": "Krav",
                        "hovedkategori": "ENDRING",
                        "underkategori": "IRREG",
                        "beskrivelse": "Beskrivelse",
                        "dato_oppdaget": "2026-09-13",
                        "vedlegg_ids": [api.eget],
                    },
                }
            ],
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert response.status_code in (200, 201), response.get_data(as_text=True)
    assert [h.data.vedlegg_ids for h in levert] == [[api.eget]]
