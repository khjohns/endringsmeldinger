"""Outbound topic mappings update only the intended project's case."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from postgrest import SyncPostgrestClient

from lib.supabase.exceptions import NotFoundError
from models.sak_metadata import SakMetadata
from repositories.sak_metadata_repository import SakMetadataRepository
from repositories.supabase_sak_metadata_repository import SupabaseSakMetadataRepository


def mapping():
    return dict(
        sak_id="EO-1",
        prosjekt_id="p",
        topic_id="topic",
        board_id="board",
        catenda_project_id="catenda-project",
    )


def test_csv_mapping_roundtrip_and_project_boundary(tmp_path):
    repo = SakMetadataRepository(str(tmp_path / "metadata.csv"))
    repo.create(
        SakMetadata(
            sak_id="EO-1",
            prosjekt_id="p",
            created_by="BH",
            created_at=datetime.now(UTC),
        )
    )
    with pytest.raises(ValueError):
        repo.set_catenda_mapping(**{**mapping(), "prosjekt_id": "other"})
    assert repo.get("EO-1").catenda_topic_id is None
    repo.set_catenda_mapping(**mapping())
    saved = repo.get("EO-1")
    assert saved.catenda_topic_id == "topic"
    assert saved.catenda_board_id == "board"
    assert saved.catenda_project_id == "catenda-project"
    assert len(repo.list_all(prosjekt_id="p")) == 1


def test_supabase_mapping_query_filters_by_case_and_project():
    client = Mock()
    query = client.table.return_value
    query.update.return_value = query
    query.eq.return_value = query
    query.select.return_value = query
    query.execute.return_value = SimpleNamespace(data=[{"sak_id": "EO-1"}])
    repo = SupabaseSakMetadataRepository.__new__(SupabaseSakMetadataRepository)
    repo.client = client
    repo.set_catenda_mapping(**mapping())
    assert query.eq.call_args_list[0].args == ("sak_id", "EO-1")
    assert query.eq.call_args_list[1].args == ("prosjekt_id", "p")
    assert query.update.call_args.args[0] == {
        "catenda_topic_id": "topic",
        "catenda_board_id": "board",
        "catenda_project_id": "catenda-project",
    }
    query.execute.return_value = SimpleNamespace(data=[])
    query.execute.reset_mock()
    with pytest.raises(NotFoundError):
        repo.set_catenda_mapping(**mapping())
    query.execute.assert_called_once()


def test_mapping_uses_installed_postgrest_update_contract():
    """Exercise the real builder: update().select() is not supported by our SDK."""
    requests = []

    def respond(request):
        requests.append(request)
        return httpx.Response(200, json=[{"sak_id": "EO-1"}])

    with httpx.Client(transport=httpx.MockTransport(respond)) as http:
        client = SyncPostgrestClient("https://example.test/rest/v1", http_client=http)
        repo = SupabaseSakMetadataRepository.__new__(SupabaseSakMetadataRepository)
        repo.client = client
        repo.set_catenda_mapping(**mapping())
    assert len(requests) == 1
    assert requests[0].method == "PATCH"
    assert requests[0].url.params["sak_id"] == "eq.EO-1"
    assert requests[0].url.params["prosjekt_id"] == "eq.p"
