"""
Webhook-regresjons- og måltester for Catenda-payloaden.

Fixture: backend/tests/fixtures/catenda_issue_created_anonymized.json

Testene bekrefter:
  - HTTP 200 ved første levering
  - HTTP 202 already_processed ved duplikat event.id, og at duplikatet
    dispatcher nøyaktig én gang
  - HTTP 400 ved manglende obligatoriske payloadfelt (ingen sideeffekter)
  - Korrekte ID-er lagret (topic/board/project) via create_sak
  - Korrekt prosjektruting (trinn 2A): resolveren reader project.id og
    issue.boardId, kryssjekker mot boardets bimsync_project_id, og katastrofe
    ved mismatch / ukjent prosjekt / ikke-godkjent board uten sideeffekter

Alle tester er isolert fra Redis slik at idempotensen kjører på den
deterministiske in-memory-fall back-banen.
"""

import json
import os
from unittest.mock import MagicMock, patch

import pytest

from models.catenda_project_config import CatendaProjectConfig
from repositories.catenda_project_config_repository import (
    InMemoryCatendaProjectConfigRepository,
)
from services.catenda_project_resolver import (
    CatendaProjectResolver,
    TemporaryCatendaError,
)

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "fixtures", "catenda_issue_created_anonymized.json"
)

VALID_SECRET = "test-secret-path"

# Fixturens project.id. Board-mocken bruker samme verdi som bimsync_project_id
# slik at happy-path er konsistent; kun motstridstesten avviker bevisst.
FIXTURE_PROJECT_ID = "11111111111111111111111111111111"
FIXTURE_PROJECT_ID_DASHED = "11111111-1111-1111-1111-111111111111"
FIXTURE_BOARD_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
FIXTURE_TOPIC_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
FIXTURE_LIBRARY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


def make_resolver(
    *,
    catenda_project_id: str = FIXTURE_PROJECT_ID,
    internal_project_id: str = "oslobygg",
    board_bimsync_project: str | None = None,
    allowed_boards: list[str] | None = None,
) -> CatendaProjectResolver:
    """Bygg en resolver som matcher fixturen, med kontrollerbar adferd.

    Standard: boardet (boardId cccc...) hører til FIXTURE_PROJECT_ID og er
    godkjent. Konfigurer board_bimsync_project for å simulere mismatch eller
    allowed_boards for å simulere ikke-godkjent board.
    """
    if board_bimsync_project is None:
        board_bimsync_project = catenda_project_id

    config = CatendaProjectConfig(
        internal_project_id=internal_project_id,
        catenda_project_id=catenda_project_id,
        topic_board_ids=allowed_boards or [FIXTURE_BOARD_ID],
        library_id=FIXTURE_LIBRARY_ID,
        folder_id=None,
    )
    register = InMemoryCatendaProjectConfigRepository([config])

    def lookup(board_id: str) -> str | None:
        return board_bimsync_project

    return CatendaProjectResolver(register, lookup)


@pytest.fixture(autouse=True)
def isolate_redis(monkeypatch):
    """Isoler idempotetstestene fra Redis.

    webhook_security cacherer Redis-tilstanden i modul-globaler. For å få
    deterministiske tester tvinger vi in-memory-fall back uansett miljø:
    - Fjern REDIS_URL slik at lazy-init ikke kobler til Redis
    - Nullstill de module-globale Redis-flaggane
    - Tøm in-memory settet så events ikke lekker mellom tester
    """
    monkeypatch.delenv("REDIS_URL", raising=False)

    import lib.security.webhook_security as ws

    monkeypatch.setattr(ws, "_redis_client", None)
    monkeypatch.setattr(ws, "_redis_available", None)

    from lib.security.webhook_security import clear_processed_events

    clear_processed_events()
    yield


def load_fixture() -> dict:
    with open(FIXTURE_PATH) as fh:
        return json.load(fh)


def patch_webhook_service():
    """Return a (patcher, mock) tuple used to stub route-level dispatch.

    The route calls get_webhook_service() from routes.catenda_webhook_routes.
    We replace it so route-level HTTP status / side-effect logic is evaluated
    without real dependencies.
    """
    mock_service = MagicMock()

    return (
        patch(
            "routes.catenda_webhook_routes.get_webhook_service",
            return_value=mock_service,
        ),
        mock_service,
    )


def mock_catenda_client(project_id: str = FIXTURE_PROJECT_ID) -> MagicMock:
    """Bygg en mock av CatendaClient med konsistent topic/board/prosjekt.

    Resolveren leser payload.project.id og kryssjekker det mot boardets
    bimsync_project_id. Begge mockes til samme prosjekt-ID for konsistent
    happy-path.
    """
    mock_client = MagicMock()
    mock_client.get_topic_details.return_value = {
        "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "title": "TEST-ANONYMISED-WEBHOOK",
        "topic_type": "Krav om endringsordre",
        "bimsync_creation_author": {
            "user": {"name": "Test User", "email": "test@example.invalid"}
        },
        "bimsync_custom_fields": [],
    }
    mock_client.get_topic_board_details.return_value = {
        "bimsync_project_id": project_id
    }
    mock_client.get_project_details.return_value = {"name": "TEST-PROJECT"}
    mock_client.create_comment.return_value = {"id": "comment-123"}
    return mock_client


class TestWebhookRoute:
    """HTTP-status- og strukturkontrakten på rutenivå."""

    @pytest.fixture
    def env_secret(self, monkeypatch):
        monkeypatch.setenv("WEBHOOK_SECRET_PATH", VALID_SECRET)
        yield

    def test_happy_path_first_delivery_returns_200(self, client, env_secret):
        mock_service = MagicMock()
        mock_service.handle_new_topic_created.return_value = {
            "success": True,
            "sak_id": "SAK-20260902-090000",
        }
        with patch(
            "routes.catenda_webhook_routes.get_webhook_service",
            return_value=mock_service,
        ):
            response = client.post(
                f"/webhook/catenda/{VALID_SECRET}",
                data=json.dumps(load_fixture()),
                content_type="application/json",
            )

        assert response.status_code == 200
        body = response.get_json()
        assert body["success"] is True
        assert body["sak_id"].startswith("SAK-")
        mock_service.handle_new_topic_created.assert_called_once()

    def test_duplicate_same_event_id_returns_202(self, client, env_secret):
        patcher, mock_service = patch_webhook_service()
        mock_service.handle_new_topic_created.return_value = {
            "success": True,
            "sak_id": "SAK-20260902-090000",
        }
        with patcher:
            first = client.post(
                f"/webhook/catenda/{VALID_SECRET}",
                data=json.dumps(load_fixture()),
                content_type="application/json",
            )
            second = client.post(
                f"/webhook/catenda/{VALID_SECRET}",
                data=json.dumps(load_fixture()),
                content_type="application/json",
            )

        assert first.status_code == 200
        # Andre levering med samme event.id er allerede prosessert
        assert second.status_code == 202
        assert second.get_json()["status"] == "already_processed"
        # Duplikatet må ikke dispatche en ny behandling: totalt én levering.
        mock_service.handle_new_topic_created.assert_called_once()

    def test_missing_event_object_returns_400(self, client, env_secret):
        mock_service = MagicMock()
        with patch(
            "routes.catenda_webhook_routes.get_webhook_service",
            return_value=mock_service,
        ):
            response = client.post(
                f"/webhook/catenda/{VALID_SECRET}",
                data=json.dumps({"issue": {"id": "x"}}),
                content_type="application/json",
            )

        assert response.status_code == 400
        assert "Invalid event structure" in response.get_json()["error"]
        # Ingen sideeffekter ved strukturfeil
        mock_service.handle_new_topic_created.assert_not_called()

    def test_missing_event_id_returns_400(self, client, env_secret):
        mock_service = MagicMock()
        with patch(
            "routes.catenda_webhook_routes.get_webhook_service",
            return_value=mock_service,
        ):
            response = client.post(
                f"/webhook/catenda/{VALID_SECRET}",
                data=json.dumps(
                    {"event": {"type": "issue.created"}, "issue": {"id": "x"}}
                ),
                content_type="application/json",
            )

        assert response.status_code == 400
        assert "event.id" in response.get_json()["detail"]
        mock_service.handle_new_topic_created.assert_not_called()

    def test_invalid_json_body_returns_400(self, client, env_secret):
        mock_service = MagicMock()
        with patch(
            "routes.catenda_webhook_routes.get_webhook_service",
            return_value=mock_service,
        ):
            response = client.post(
                f"/webhook/catenda/{VALID_SECRET}",
                data="not-json",
                content_type="application/json",
            )

        # Flask parser ugyldig JSON og returnerer 400 før rutekoden kjøres.
        assert response.status_code == 400
        mock_service.handle_new_topic_created.assert_not_called()

    def test_invalid_secret_path_returns_404(self, client):
        response = client.post(
            "/webhook/catenda/wrong-secret",
            data=json.dumps(load_fixture()),
            content_type="application/json",
        )

        assert response.status_code == 404


class TestWebhookRuntimeWiring:
    """The Flask factory must select the permanent resolver through its factory."""

    def test_get_webhook_service_uses_selected_resolver_factory(self, monkeypatch):
        import app
        from routes import catenda_webhook_routes
        from services import catenda_project_resolver_factory

        client = MagicMock()
        resolver = MagicMock()
        service_type = MagicMock()
        event_repository = MagicMock()
        magic_links = MagicMock()

        monkeypatch.setattr(app, "get_magic_link_manager", lambda: magic_links)
        monkeypatch.setattr(catenda_webhook_routes, "get_catenda_client", lambda: client)
        monkeypatch.setattr(
            catenda_webhook_routes,
            "create_event_repository",
            lambda: event_repository,
        )
        monkeypatch.setattr(catenda_webhook_routes, "WebhookService", service_type)
        monkeypatch.setattr(
            catenda_project_resolver_factory,
            "build_project_resolver",
            lambda supplied_client: resolver,
        )

        catenda_webhook_routes.get_webhook_service()

        service_type.assert_called_once()
        assert service_type.call_args.kwargs["resolver"] is resolver
        assert service_type.call_args.kwargs["catenda_client"] is client


class TestWebhookServiceCreation:
    """Tjenestenivå: ID-lagring og sideeffektkontroll i handle_new_topic_created."""

    @pytest.fixture
    def enabled_catenda(self, monkeypatch):
        from core.config import settings

        monkeypatch.setattr(settings, "catenda_enabled", "true")
        monkeypatch.setattr(settings, "catenda_client_id", "test-client")
        monkeypatch.setattr(settings, "catenda_client_secret", "test-secret")
        yield

    @pytest.fixture
    def service(self, enabled_catenda, monkeypatch):
        """Build a WebhookService with injected mocks and patched internals.

        Bruker monkeypatch (ikke with-patch) slik at patch-objektene vedvarer
        gjennom hele testen og treffer WebhookService sine lazy imports ved
        kalletiden.
        """
        from services.catenda_webhook_service import WebhookService

        mock_client = mock_catenda_client()

        mock_creation = MagicMock()
        mock_creation.create_sak.return_value = MagicMock(
            success=True,
            error=None,
        )

        # Board-filtrering er en separat bekymring med egne tester
        # (test_filtering_config.py). Her mockes den til å akseptere, slik at
        # regresjonstesten fokuserer på ID-håndtering og sideeffekter.
        mock_filter = MagicMock()
        mock_filter.return_value = (True, "")

        monkeypatch.setattr(
            "services.catenda_webhook_service.create_metadata_repository",
            lambda: MagicMock(),
        )
        monkeypatch.setattr(
            "services.sak_creation_service.get_sak_creation_service",
            lambda: mock_creation,
        )
        monkeypatch.setattr(
            "utils.filtering_config.should_process_topic",
            mock_filter,
        )

        svc = WebhookService(
            event_repository=MagicMock(),
            catenda_client=mock_client,
            config={"react_app_url": "http://localhost:3000"},
            magic_link_generator=MagicMock(),
            resolver=make_resolver(),
        )

        return svc, mock_client, mock_creation, mock_filter

    def test_create_case_with_correct_ids(self, service):
        svc, mock_client, mock_creation, _ = service
        payload = load_fixture()

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is True
        # create_sak kalles med board- og prosjekt-ID fra resolved kontekst.
        create_call = mock_creation.create_sak.call_args
        kwargs = create_call.kwargs
        assert kwargs["catenda_topic_id"] == "dddddddd-dddd-dddd-dddd-dddddddddddd"
        assert kwargs["catenda_board_id"] == "cccccccc-cccc-cccc-cccc-cccccccccccc"
        # Resolveren normaliserer GUID-ene -> dashed catenda_project_id.
        assert kwargs["catenda_project_id"] == FIXTURE_PROJECT_ID_DASHED
        # Med resolver injisert brukes intern prosjekt-ID som appens prosjekt_id.
        assert kwargs["prosjekt_id"] == "oslobygg"
        # Kommentar postes til Catenda
        mock_client.create_comment.assert_called_once()
        # Board-detaljene er allerede kontrollert av resolveren og skal ikke
        # hentes en gang til i WebhookService.
        mock_client.get_topic_board_details.assert_not_called()
        assert mock_client.create_comment.call_args[0][0] == (
            "dddddddd-dddd-dddd-dddd-dddddddddddd"
        )

    def test_missing_project_id_returns_error(self, service):
        svc, mock_client, mock_creation, _ = service
        payload = load_fixture()
        payload["project"]["id"] = None

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert "project.id mangler" in result["error"]
        assert result["error_code"] == "missing_input_id"
        assert result["retryable"] is False
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_missing_board_id_returns_error(self, service):
        svc, mock_client, mock_creation, _ = service
        payload = load_fixture()
        payload["issue"]["boardId"] = None

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert result["error_code"] == "missing_input_id"
        assert result["retryable"] is False
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_missing_topic_id_returns_error(self, service):
        svc, mock_client, mock_creation, _ = service
        payload = load_fixture()
        payload["issue"]["id"] = None

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert result["error_code"] == "missing_input_id"
        assert result["retryable"] is False
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_comment_failure_does_not_rollback_case(self, service):
        svc, mock_client, mock_creation, _ = service
        mock_client.create_comment.side_effect = RuntimeError("Catenda nede")

        result = svc.handle_new_topic_created(load_fixture())

        # Kommentarfeil skal ikke rulle tilbake saksopprettelsen
        assert result["success"] is True
        mock_creation.create_sak.assert_called_once()

    def test_filter_rejects_unknown_topic_type(self, service):
        svc, mock_client, mock_creation, mock_filter = service
        mock_filter.return_value = (False, "Ukjent topic type")

        result = svc.handle_new_topic_created(load_fixture())

        assert result["success"] is True
        assert result["action"] == "ignored_due_to_filter"
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    @pytest.mark.parametrize(
        "change",
        [
            {"modification": {"event": "status_updated", "value": "Closed"}},
            {"comment": {"comment": "Kommentar opprettet av appen"}},
        ],
    )
    def test_topic_modification_echo_does_not_create_domain_side_effects(
        self, service, change
    ):
        svc, mock_client, mock_creation, _ = service
        svc.metadata_repo.get_by_topic_id.return_value = MagicMock(
            sak_id="SAK-existing"
        )
        payload = {"issue": {"id": FIXTURE_TOPIC_ID}, **change}

        result = svc.handle_topic_modification(payload)

        assert result["success"] is True
        assert result["action"] == "logged"
        assert svc.event_repo.method_calls == []
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()


class TestWebhookProjectRouting:
    """Måltester for prosjektruting (trinn 2A).

    Tjenesten mottar resolved prosjektkontekst fra resolveren. Ved korrekt
    ruting brukes internal_project_id som appens prosjekt; ved mismatch / ukjent
    prosjekt skal det IKKE oppstå noen sideeffekter (create_sak og kommentar
    kalles ikke).
    """

    @pytest.fixture
    def enabled_catenda(self, monkeypatch):
        from core.config import settings

        monkeypatch.setattr(settings, "catenda_enabled", "true")
        monkeypatch.setattr(settings, "catenda_client_id", "test-client")
        monkeypatch.setattr(settings, "catenda_client_secret", "test-secret")
        yield

    def build_service(self, resolver, monkeypatch):
        """Bygg en WebhookService med gitt resolver og patchet interne avhengigheter."""
        from services.catenda_webhook_service import WebhookService

        mock_client = mock_catenda_client()
        mock_creation = MagicMock()
        mock_creation.create_sak.return_value = MagicMock(success=True, error=None)
        mock_filter = MagicMock()
        mock_filter.return_value = (True, "")

        monkeypatch.setattr(
            "services.catenda_webhook_service.create_metadata_repository",
            lambda: MagicMock(),
        )
        monkeypatch.setattr(
            "services.sak_creation_service.get_sak_creation_service",
            lambda: mock_creation,
        )
        monkeypatch.setattr(
            "utils.filtering_config.should_process_topic",
            mock_filter,
        )

        svc = WebhookService(
            event_repository=MagicMock(),
            catenda_client=mock_client,
            config={"react_app_url": "http://localhost:3000"},
            magic_link_generator=MagicMock(),
            resolver=resolver,
        )
        return svc, mock_client, mock_creation

    def test_none_resolver_is_rejected_at_construction(self, monkeypatch):
        from services.catenda_webhook_service import WebhookService

        with pytest.raises(ValueError, match="krever en CatendaProjectResolver"):
            WebhookService(
                event_repository=MagicMock(),
                catenda_client=MagicMock(),
                resolver=None,
            )

    def test_conflict_project_vs_board_has_no_side_effects(
        self, enabled_catenda, monkeypatch
    ):
        """Payload.project.id som ikke stemmer med boardets bimsync_project_id.

        Kryssjekken i resolveren skal fange opp mismatchet og avvise FØR noen
        sideeffekter. En feil project.id i payloaden (motstrid med boardets
        bimsync_project) skal IKKE kunne opprette sak eller poste kommentar.
        """
        conflicting = "99999999999999999999999999999999"
        # Konfig-en er for prosjektet `conflicting` (payload.project.id), men
        # boardets bimsync_project_id peker på FIXTURE_PROJECT_ID (et annet
        # prosjekt). Kryssjekken skal fange dette som et prosjekt-mismatch.
        resolver = make_resolver(
            catenda_project_id=conflicting,
            board_bimsync_project=FIXTURE_PROJECT_ID,
        )
        svc, mock_client, mock_creation = self.build_service(resolver, monkeypatch)

        payload = load_fixture()
        payload["project"]["id"] = conflicting

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert "tilhører bimsync_prosjektet" in result["error"]
        assert result["error_code"] == "project_board_mismatch"
        assert result["retryable"] is False
        # Ingen sideeffekter ved mismatch
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_unknown_project_has_no_side_effects(self, enabled_catenda, monkeypatch):
        """Ukjent prosjekt (uten registerpost / feil catenda_project_id)."""
        unknown = "99999999999999999999999999999999"
        # Konfigens catenda_project_id er FIXTURE_PROJECT_ID, ikke unknown.
        resolver = make_resolver(catenda_project_id=FIXTURE_PROJECT_ID)
        svc, mock_client, mock_creation = self.build_service(resolver, monkeypatch)

        payload = load_fixture()
        payload["project"]["id"] = unknown

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert "Ingen prosjektkonfigurasjon" in result["error"]
        assert result["error_code"] == "unknown_project"
        assert result["retryable"] is False
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_board_not_belonging_to_project_has_no_side_effects(
        self, enabled_catenda, monkeypatch
    ):
        """Board som ikke hører til det resolvede prosjektet (ikke-godkjent)."""
        foreign_board = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
        resolver = make_resolver(
            allowed_boards=[FIXTURE_BOARD_ID], board_bimsync_project=FIXTURE_PROJECT_ID
        )
        svc, mock_client, mock_creation = self.build_service(resolver, monkeypatch)

        payload = load_fixture()
        # boardId fra payload er cccc...; endrer til et board som ikke er
        # godkjent. Mockens get_topic_details svarer uansett, men resolveren
        # avviser før sak opprettes.
        payload["issue"]["boardId"] = foreign_board

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert "hører ikke til prosjekt" in result["error"]
        assert result["error_code"] == "unknown_board"
        assert result["retryable"] is False
        mock_client.get_topic_board_details.assert_not_called()
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_global_board_cannot_override_resolved_board(
        self, enabled_catenda, monkeypatch
    ):
        """Payloadens/boardets board er autoritativt, aldri globalt board.

        boards tilhører prosjektet; selv om en konfigurert board-ID skulle finnes
        i globale innstillinger, grep boardet fra payloaden/resolveren.
        """
        resolver = make_resolver(
            internal_project_id="oslobygg",
            allowed_boards=[FIXTURE_BOARD_ID],
        )
        svc, mock_client, mock_creation = self.build_service(resolver, monkeypatch)

        result = svc.handle_new_topic_created(load_fixture())

        assert result["success"] is True
        kwargs = mock_creation.create_sak.call_args.kwargs
        # Board-ID-en i create_sak kommer fra payloaden/resolved board,
        # ikke fra et globalt board-valg.
        assert kwargs["catenda_board_id"] == FIXTURE_BOARD_ID

    @pytest.mark.parametrize(
        ("field_path", "expected_field"),
        [
            (("project", "id"), "project.id"),
            (("issue", "boardId"), "issue.boardId"),
            (("issue", "id"), "issue.id"),
        ],
    )
    def test_invalid_payload_id_has_stable_error_contract(
        self, enabled_catenda, monkeypatch, field_path, expected_field
    ):
        svc, mock_client, mock_creation = self.build_service(
            make_resolver(), monkeypatch
        )
        payload = load_fixture()
        payload[field_path[0]][field_path[1]] = "x" * 32

        result = svc.handle_new_topic_created(payload)

        assert result["success"] is False
        assert result["error_code"] == "invalid_input_id"
        assert result["retryable"] is False
        assert expected_field in result["error"]
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()

    def test_temporary_catenda_error_is_marked_retryable(
        self, enabled_catenda, monkeypatch
    ):
        resolver = MagicMock()
        resolver.resolve.side_effect = TemporaryCatendaError("Catenda timeout")
        svc, mock_client, mock_creation = self.build_service(resolver, monkeypatch)

        result = svc.handle_new_topic_created(load_fixture())

        assert result == {
            "success": False,
            "error": "Catenda timeout",
            "error_code": "temporary_catenda_error",
            "retryable": True,
        }
        mock_creation.create_sak.assert_not_called()
        mock_client.create_comment.assert_not_called()
