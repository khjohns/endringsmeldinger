from routes.event_routes import _events_to_hendelser


def test_activity_retains_id_and_actual_role_in_both_event_formats():
    result = _events_to_hendelser([
        {"id": "e1", "type": "no.oslo.koe.grunnlag_opprettet",
         "actorrole": "TE", "time": "2026-09-09T12:00:00Z"},
        {"event_id": "e2", "event_type": "respons_frist",
         "aktor_rolle": "BH", "tidsstempel": "2026-09-10T12:00:00Z"},
        {"event_type": "grunnlag_oppdatert", "aktor_rolle": "unknown"},
    ])
    assert result[0]["id"] == "e1"
    assert result[0]["rolle"] == "TE"
    assert result[1]["id"] == "e2"
    assert result[1]["rolle"] == "BH"
    assert result[1]["type"] == "F"
    assert "rolle" not in result[2]
