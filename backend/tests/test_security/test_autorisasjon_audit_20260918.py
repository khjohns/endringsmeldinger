"""Sikkerhets- og autorisasjonsgjennomgang (Pass 2: Autorisasjon).

Testene her etterprøver funn i autorisasjonslaget:
- IDOR og kryssprosjektlekkasje i forseringstjenesten
- Lekkende aktivitetsstempel ved batch-innsending av interne notater
- Manglende metode og 500-krasj på metadata-repoet ved sakstype-filtrering

Alle testene kjører mot ekte ruter og dekoratører med testdobler for lagring.
"""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.events import (
    EventType,
    FristBeregningResultat,
    FristData,
    FristEvent,
    FristResponsData,
    ResponsEvent,
    SakOpprettetEvent,
    SporType,
)
from services.timeline_service import TimelineService

HEADERS_A = {"X-Project-ID": "project-a", "X-CSRF-Token": "csrf"}
HEADERS_B = {"X-Project-ID": "project-b", "X-CSRF-Token": "csrf"}


def _auth(role="member", contract=("TE", "team-b")):
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user-test", "email": "test@example.com", "name": "Tester"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = role
    auth.contract_role.return_value = contract[0]
    auth.contract_membership.return_value = contract
    return auth


def _client(monkeypatch, auth, *blueprints):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    for bp in blueprints:
        app.register_blueprint(bp)
    app.extensions["koe_auth"] = auth
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return client


# =============================================================================
# 1. Kryssprosjektlekkasje i GET /api/forsering/<sak_id>/valider-grunnlag
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="valider_forseringsgrunnlag sjekker ikke om referert sak tilhører autorisert prosjekt",
)
def test_valider_forseringsgrunnlag_evaluerer_sak_i_annet_prosjekt(monkeypatch):
    """GET /api/forsering/<sak>/valider-grunnlag må ikke evaluere eller lekke status

    for saker i andre prosjekter (utvider RV-07).
    Her refererer en forsering i project-b til en sak i project-a. Saken i
    project-a har fått sitt fristkrav godkjent av BH i project-a.
    En bruker i project-b kaller valider-grunnlag på sin egen forsering,
    og backend slår opp og røper kontraktstilstanden til saken i project-a.
    """
    from routes import forsering_routes
    from services.forsering_service import ForseringService

    # Sak A-1 i project-a: fristkrav ble godkjent
    a1_opprettet = SakOpprettetEvent(
        sak_id="A-1",
        sakstittel="Hemmelig sak A",
        aktor="te-a",
        aktor_rolle="TE",
        prosjekt_id="project-a",
    ).model_dump(mode="json")
    a1_krav = FristEvent(
        sak_id="A-1",
        aktor="te-a",
        aktor_rolle="TE",
        event_type=EventType.FRIST_KRAV_SENDT,
        data=FristData(krevd_dager=10, begrunnelse="Krav"),
    ).model_dump(mode="json")
    a1_respons = ResponsEvent(
        sak_id="A-1",
        aktor="bh-a",
        aktor_rolle="BH",
        event_type=EventType.RESPONS_FRIST,
        spor=SporType.FRIST,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.GODKJENT,
            godkjent_dager=10,
            begrunnelse="BH godkjenner i project-a",
        ),
    ).model_dump(mode="json")

    # Forsering B-F i project-b refererer til A-1
    bf_opprettet = SakOpprettetEvent(
        sak_id="B-F",
        sakstittel="Forsering B",
        aktor="te-b",
        aktor_rolle="TE",
        prosjekt_id="project-b",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["A-1"]},
    ).model_dump(mode="json")

    store = {"A-1": [a1_opprettet, a1_krav, a1_respons], "B-F": [bf_opprettet]}
    metadata = {
        "A-1": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None),
        "B-F": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
    }

    events = Mock()
    events.get_events.side_effect = lambda sak: (store.get(sak, []), len(store.get(sak, [])))

    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=None,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=None,
    )
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(monkeypatch, _auth(contract=("TE", "team-b")), forsering_routes.forsering_bp)

    response = client.get("/api/forsering/B-F/valider-grunnlag", headers=HEADERS_B)
    assert response.status_code == 200
    body = response.get_json()

    # Feiler i dag fordi A-1 fra project-a evalueres og returneres til project-b
    assert body.get("pavirket_sak_id") != "A-1", (
        f"Lekket saksstatus fra project-a til project-b: {body}"
    )


# =============================================================================
# 2. Kryssprosjektlekkasje i GET /api/forsering/by-relatert/<sak_id>
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="finn_forseringer_for_sak filtrerer ikke på autorisert prosjekt",
)
def test_finn_forseringer_for_sak_lekker_forsering_fra_annet_prosjekt(monkeypatch):
    """GET /api/forsering/by-relatert/<sak_id> må ikke returnere forseringssaker

    fra andre prosjekter (utvider RV-07).
    Bruker i project-a spør om forseringer som refererer til sak A-1.
    En forseringssak B-F i project-b refererer til A-1.
    ForseringService skanner alle saker i repositoriet og returnerer B-F med
    sakstittel og status, uten å sjekke om B-F hører til project-a.
    """
    from routes import forsering_routes
    from services.forsering_service import ForseringService

    a1 = SakOpprettetEvent(
        sak_id="A-1",
        sakstittel="Sak i prosjekt A",
        aktor="te-a",
        aktor_rolle="TE",
        prosjekt_id="project-a",
    ).model_dump(mode="json")
    bf = SakOpprettetEvent(
        sak_id="B-F",
        sakstittel="Konfidensiell forsering i prosjekt B",
        aktor="te-b",
        aktor_rolle="TE",
        prosjekt_id="project-b",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["A-1"], "dato_varslet": "2026-09-18"},
    ).model_dump(mode="json")

    store = {"A-1": [a1], "B-F": [bf]}
    metadata = {
        "A-1": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None),
        "B-F": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
    }

    events = Mock()
    events.get_events.side_effect = lambda sak: (store.get(sak, []), len(store.get(sak, [])))
    events.list_all_sak_ids.return_value = ["A-1", "B-F"]

    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=None,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=None,
    )
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(monkeypatch, _auth(contract=("TE", "team-a")), forsering_routes.forsering_bp)

    response = client.get("/api/forsering/by-relatert/A-1", headers=HEADERS_A)
    assert response.status_code == 200
    body = response.get_json()

    # Feiler i dag fordi B-F fra project-b returneres til leser i project-a
    assert body["forseringer"] == [], (
        f"Lekket forseringssak fra project-b til project-a: {body['forseringer']}"
    )


# =============================================================================
# 3. Batch-innsending oppdaterer last_event_at for interne notater
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="submit_batch oppdaterer last_event_at ubetinget selv for interne notater",
)
def test_batch_innsending_lekker_internt_notat_i_last_event_at(monkeypatch):
    """POST /api/events/batch oppdaterer last_event_at ubetinget,

    også når batchen kun inneholder et internt notat (utvider RV-09).
    submit_event (linje 531) skjermer last_event_at, men submit_batch (linje 823)
    setter last_event_at=datetime.now(UTC) ubetinget, noe som røper internt
    notat i sakslisten for motparten.
    """
    from routes import event_routes

    sak_opprettet = {
        "event_type": "sak_opprettet",
        "sak_id": "case-1",
        "aktor": "System",
        "aktor_rolle": "TE",
        "tidsstempel": "2026-09-15T08:00:00Z",
        "sakstittel": "Sak 1",
        "prosjekt_id": "project-a",
    }

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="project-a", catenda_topic_id=None
    )
    container.event_repository.get_events.return_value = ([sak_opprettet], 1)
    container.event_repository.append_batch.return_value = 2
    container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(monkeypatch, _auth(contract=("TE", "team-a")), event_routes.events_bp)

    response = client.post(
        "/api/events/batch",
        json={
            "sak_id": "case-1",
            "expected_version": 1,
            "events": [
                {
                    "event_type": "internt_notat",
                    "data": {"tekst": "Konfidensielt internt notat", "spor": "grunnlag"},
                }
            ],
        },
        headers=HEADERS_A,
    )
    assert response.status_code == 201, response.get_data(as_text=True)

    # Feiler i dag fordi submit_batch ubetinget sender last_event_at != None
    assert container.metadata_repository.update_cache.called
    call_kwargs = container.metadata_repository.update_cache.call_args.kwargs
    assert call_kwargs.get("last_event_at") is None, (
        f"last_event_at ble satt ved batch med internt notat: {call_kwargs.get('last_event_at')}"
    )


# =============================================================================
# 4. SakMetadataRepository (CSV) mangler list_by_sakstype (500-krasj)
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SakMetadataRepository (CSV) mangler list_by_sakstype; /api/cases?sakstype= gir 500",
)
def test_sak_metadata_csv_repo_mangler_list_by_sakstype(tmp_path):
    """GET /api/cases?sakstype=standard krasjer med AttributeError på SakMetadataRepository.

    event_routes.py:992 kaller _get_metadata_repo().list_by_sakstype(sakstype).
    SakMetadataRepository (CSV/fil-implementasjonen) mangler denne metoden helt.
    """
    from repositories.sak_metadata_repository import SakMetadataRepository

    csv_path = tmp_path / "metadata.csv"
    repo = SakMetadataRepository(csv_path=csv_path)

    # Feiler i dag fordi metoden ikke finnes på CSV-implementasjonen
    assert hasattr(repo, "list_by_sakstype"), (
        "SakMetadataRepository mangler list_by_sakstype; /api/cases?sakstype=... krasjer med 500"
    )
