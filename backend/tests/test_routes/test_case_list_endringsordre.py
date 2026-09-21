"""The shared register reads EO values from issued events, preserving unknowns."""

from datetime import UTC, datetime
from inspect import unwrap
from unittest.mock import Mock

import pytest
from flask import Flask

from models.events import EOOpprettetEvent, EOUtstedtEvent
from models.sak_metadata import SakMetadata
from routes import event_routes as routes
from services.timeline_service import TimelineService


@pytest.mark.parametrize(
    "amounts, estimate, expected_net, expected_days",
    [
        ({}, False, 0, 0),
        ({"konsekvenser": {"pris": True, "fremdrift": True}}, False, None, None),
        (
            {
                "kompensasjon_belop": 0,
                "frist_dager": 0,
                "oppgjorsform": "FASTPRIS_TILBUD",
            },
            True,
            0,
            0,
        ),
        (
            {
                "kompensasjon_belop": 100,
                "fradrag_belop": 250,
                "frist_dager": 4,
                "oppgjorsform": "FASTPRIS_TILBUD",
            },
            True,
            -150,
            4,
        ),
    ],
)
def test_list_preserves_order_numbers_links_and_unspecified_amounts(
    monkeypatch, amounts, estimate, expected_net, expected_days
):
    now = datetime(2026, 9, 13, tzinfo=UTC)
    fields = {
        "sak_id": "EO-1",
        "aktor_id": "Byggherre",
        "aktor_rolle": "BH",
        "tidsstempel": now,
    }
    data = {
        "eo_nummer": "EO-042",
        "beskrivelse": "Ny belysning",
        "relaterte_koe_saker": ["KOE-1", "KOE-2"],
    }
    events = [
        EOOpprettetEvent(**fields, data=data),
        EOUtstedtEvent(**fields, data={**data, **amounts, "er_estimat": estimate}),
    ]
    metadata = Mock()
    metadata.list_all.return_value = [
        SakMetadata(
            sak_id="EO-1",
            sakstype="endringsordre",
            created_at=now,
            created_by="Byggherre",
            cached_status="utstedt",
            cached_sum_krevd=999,
        )
    ]
    event_repo = Mock()
    event_repo.get_events.return_value = (
        [event.model_dump(mode="json") for event in events],
        2,
    )
    monkeypatch.setattr(routes, "_get_metadata_repo", lambda: metadata)
    monkeypatch.setattr(routes, "_get_event_repo", lambda: event_repo)
    monkeypatch.setattr(routes, "_get_timeline_service", TimelineService)

    with Flask(__name__).test_request_context("/api/cases"):
        response = unwrap(routes.list_cases)()
        assert response.status_code == 200
        case = response.get_json()["cases"][0]

    assert case["cached_sum_krevd"] == 999
    assert case["endringsordre_data"] == {
        "status": "utstedt",
        "eo_nummer": "EO-042",
        "relaterte_koe_saker": ["KOE-1", "KOE-2"],
        "netto_belop": expected_net,
        "frist_dager": expected_days,
        "er_estimat": estimate,
    }
    event_repo.get_events.assert_called_once_with("EO-1")
