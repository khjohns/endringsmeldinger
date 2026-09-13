"""Analytics must not fall back to unscoped event tables."""

from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import pytest

from routes import analytics_routes as routes


def test_batch_queries_only_authorized_project_cases():
    container = Mock()
    query = container.event_repository.client.table.return_value
    query.select.return_value = query
    query.in_.return_value = query
    query.order.return_value = query
    query.range.return_value = query
    query.execute.return_value.data = []
    metadata = Mock()
    metadata.list_all.return_value = [SimpleNamespace(sak_id="allowed-case")]
    with (
        patch.object(routes, "_get_container", return_value=container),
        patch.object(routes, "_get_metadata_repo", return_value=metadata),
    ):
        assert routes._get_all_events_batch() == []
    assert query.in_.call_args_list == [call("sak_id", ["allowed-case"])] * 3


@pytest.mark.parametrize(
    "function", [routes._get_all_events_n_plus_one, routes._compute_all_states]
)
def test_metadata_outage_never_uses_global_case_ids(function):
    metadata, events = Mock(), Mock()
    metadata.list_all.side_effect = RuntimeError("unavailable")
    with (
        patch.object(routes, "_get_metadata_repo", return_value=metadata),
        patch.object(routes, "_get_event_repo", return_value=events),
    ):
        with pytest.raises(RuntimeError, match="Project metadata unavailable"):
            function()
    events.get_all_sak_ids.assert_not_called()
