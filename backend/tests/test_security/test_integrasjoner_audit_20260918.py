"""
Uavhengige audit-tester for eksterne integrasjoner (Catenda API, webhooks og vedlegg).
Dato: 2026-09-18.

Tester svakheter og avvik i:
- Webhook-autentisering og timing-lekkasje (INT-01)
- Idempotensreservasjon før behandling og svelging av feil med HTTP 200 (INT-02)
- Avvisning av gyldige BCF-event-typer i sikkerhetsvalidator (INT-03)
- Omgåelse av godkjenningsport: TE kan opprette Endringsordre via webhook (INT-04)
- Batch-hendelser dropper Catenda-levering og rapporterer 'clear' status (INT-05)
- Catenda-kontekst ignorerer prosjektregister og overstyrer med global .env (INT-06)
- CatendaCommentGenerator feilidentifiserer 'standard' sakstype (INT-07)
"""

import inspect
import json
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from core.config import settings
from models.events import SakOpprettetEvent
from models.sak_metadata import SakMetadata
from services.catenda_comment_generator import CatendaCommentGenerator
from services.catenda_delivery_status import CatendaDeliveryStatus

VALID_SECRET = "test-secret-path-12345"


@pytest.fixture(autouse=True)
def isolate_redis(monkeypatch):
    """Kjør idempotensen på deterministisk in-memory-bane."""
    monkeypatch.delenv("REDIS_URL", raising=False)
    import lib.security.webhook_security as ws

    monkeypatch.setattr(ws, "_redis_client", None)
    monkeypatch.setattr(ws, "_redis_available", None)
    from lib.security.webhook_security import clear_processed_events

    clear_processed_events()
    yield


@pytest.fixture
def webhook_env(monkeypatch):
    monkeypatch.setenv("WEBHOOK_SECRET_PATH", VALID_SECRET)
    yield


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="INT-01: catenda_webhook_routes.py:112 mangler hmac.compare_digest for secret_path og lekker tegn i logg",
)
def test_webhook_secret_verification_not_constant_time(webhook_env):
    """
    INT-01: catenda_webhook_routes.py:112 bruker ikke-konstanttids strengsammenlikning
    (`secret_path != expected_secret`) og mangler hmac.compare_digest.
    """
    import routes.catenda_webhook_routes as cwr

    src = inspect.getsource(cwr.webhook)
    # Kontroller at ruten faktisk bruker compare_digest
    assert "compare_digest" in src, (
        "catenda_webhook_routes.webhook bruker '!=' i stedet for "
        "hmac.compare_digest for validering av hemmelig webhook-sti."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="INT-02: catenda_webhook_routes.py svarer HTTP 200 ved feil og reserverer duplikat-ID slik at retries tapes",
)
def test_webhook_failure_swallowed_with_http_200_and_drops_retry(client, webhook_env, monkeypatch):
    """
    INT-02: Når webhook_service feiler, svarer ruten likevel HTTP 200,
    og event_id er reservert før behandling slik at retry avvises med 202 already_processed.
    """
    mock_service = MagicMock()
    mock_service.handle_new_topic_created.return_value = {
        "success": False,
        "error": "Database timeout under opprettelse",
    }
    monkeypatch.setattr(
        "routes.catenda_webhook_routes.get_webhook_service",
        lambda: mock_service,
    )

    payload = {
        "event": {"id": "evt-fail-123", "type": "issue.created"},
        "issue": {"id": "topic-fail-123", "boardId": "board-1"},
    }

    # Første innsending feiler under behandling
    resp1 = client.post(
        f"/webhook/catenda/{VALID_SECRET}",
        data=json.dumps(payload),
        content_type="application/json",
    )

    # Korrekt oppførsel ved feilet behandling er å returnere serverfeil (5xx)
    # slik at Catenda varsles om feilen og kan forsøke igjen.
    assert resp1.status_code in (500, 502, 503), (
        f"Webhook-endepunktet returnerte status {resp1.status_code} i stedet for 5xx "
        f"ved feilet behandling: {resp1.get_json()}"
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="INT-03: validate_webhook_event_structure avviser bcf.issue.created og bcf.comment.created med 400 Bad Request",
)
def test_bcf_event_types_blocked_by_security_validator(client, webhook_env, monkeypatch):
    """
    INT-03: catenda_webhook_routes.py:147 støtter eksplisitt 'bcf.issue.created',
    men validate_webhook_event_structure i webhook_security.py avviser den med HTTP 400.
    """
    mock_service = MagicMock()
    mock_service.handle_new_topic_created.return_value = {"success": True, "sak_id": "SAK-1"}
    monkeypatch.setattr(
        "routes.catenda_webhook_routes.get_webhook_service",
        lambda: mock_service,
    )

    payload = {
        "event": {"id": "evt-bcf-123", "type": "bcf.issue.created"},
        "issue": {"id": "topic-bcf-123", "boardId": "board-1"},
    }

    resp = client.post(
        f"/webhook/catenda/{VALID_SECRET}",
        data=json.dumps(payload),
        content_type="application/json",
    )

    # bcf.issue.created skal aksepteres av sikkerhetsvalidatoren når ruten eksplisitt støtter den
    assert resp.status_code == 200, (
        f"Forventet at 'bcf.issue.created' ble akseptert, men fikk HTTP {resp.status_code}: "
        f"{resp.get_json()}"
    )


def test_webhook_utleder_kontraktsside_fra_topic_forfatteren(monkeypatch):
    """INT-04: aktor_rolle skal følge forfatterens lagmedlemskap, ikke antas.

    Rettet 2026-09-19. Webhooken hardkodet `aktor_rolle="TE"` med kommentaren
    «Assume TE created the case». Catenda oppgir forfatterens bruker-ID i
    `bimsync_creation_author.user.ref` — samme subjekt `contract_membership`
    matcher mot prosjektets TE/BH-lag — så antakelsen var unødvendig.

    **Den opprinnelige reproduksjonen er erstattet.** Den påsto at en EO opprettet
    av TE omgår godkjenningskravet. Vurderingen av auditfunnene avviste den
    rammingen: dette er saksopprettelse, ikke utstedelse, og godkjenningsporten
    dekker de bindende hendelsene. Beslutningen som ble tatt var å utlede siden
    framfor å gjøre opprettelse BH-forbeholdt, så testen prøver nå det.
    """
    from services.catenda_project_resolver import ResolvedProjectContext
    from services.catenda_webhook_service import WebhookService

    mock_client = MagicMock()
    mock_client.get_topic_details.return_value = {
        "id": "topic-eo-1",
        "title": "Pålegg om endring",
        "topic_type": "Endringsordre",
        "bimsync_creation_author": {
            "user": {
                "name": "Kari Byggherre",
                "email": "kari@bh.no",
                "ref": "524809076a694255b989d236517a55da",
            }
        },
    }
    mock_client.get_project_details.return_value = {"name": "Testprosjekt"}

    mock_resolver = MagicMock()
    mock_resolver.resolve.return_value = ResolvedProjectContext(
        internal_project_id="oslobygg",
        catenda_project_id="11111111-1111-1111-1111-111111111111",
        board_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        topic_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
        library_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    )

    saved_events = []
    mock_creation = MagicMock()

    def capture_creation(**kwargs):
        events = kwargs.get("events", [])
        saved_events.extend(events)
        res = MagicMock()
        res.success = True
        return res

    mock_creation.create_sak.side_effect = capture_creation
    monkeypatch.setattr(
        "services.sak_creation_service.get_sak_creation_service",
        lambda: mock_creation,
    )

    service = WebhookService(
        event_repository=MagicMock(),
        catenda_client=mock_client,
        resolver=mock_resolver,
        config={},
    )

    payload = {
        "event": {"id": "evt-eo-1", "type": "issue.created"},
        "issue": {"id": "dddddddd-dddd-dddd-dddd-dddddddddddd", "boardId": "cccccccc-cccc-cccc-cccc-cccccccccccc"},
        "project": {"id": "11111111111111111111111111111111"},
    }

    # Forfatteren sitter i byggherrens lag. Oppslaget går gjennom det ekte
    # _contract_side, så kallet fra webhooken til AuthService er også dekket.
    monkeypatch.setattr(
        "services.auth_service.AuthService.__init__", lambda self: None
    )
    monkeypatch.setattr(
        "services.auth_service.AuthService.contract_membership_for_subject",
        lambda self, project_id, subject: ("BH", "team-bh"),
    )

    result = service.handle_new_topic_created(payload)
    assert result["success"] is True

    assert len(saved_events) == 1
    event = saved_events[0]
    assert event.sakstype == "endringsordre"
    assert event.aktor_rolle == "BH", (
        f"aktor_rolle ble '{event.aktor_rolle}', men forfatteren sitter i "
        "byggherrens lag. Rollen skal følge medlemskapet, ikke antas."
    )


def test_webhook_oppretter_ingen_sak_uten_entydig_kontraktsside(monkeypatch):
    """INT-04, fail-closed: uten entydig kontraktsside opprettes ingen sak.

    Å skrive en formell hendelse med en gjettet avsender er verre enn å ikke
    skrive den. Gjelder også når Catenda er utilgjengelig, siden lagmedlemskapet
    da ikke kan slås opp.
    """
    from services.catenda_project_resolver import ResolvedProjectContext
    from services.catenda_webhook_service import WebhookService

    mock_client = MagicMock()
    mock_client.get_topic_details.return_value = {
        "id": "topic-eo-2",
        "title": "Pålegg om endring",
        "topic_type": "Endringsordre",
        "bimsync_creation_author": {
            "user": {
                "name": "Ukjent",
                "email": "ukjent@example.invalid",
                "ref": "524809076a694255b989d236517a55da",
            }
        },
    }
    mock_client.get_project_details.return_value = {"name": "Testprosjekt"}

    mock_resolver = MagicMock()
    mock_resolver.resolve.return_value = ResolvedProjectContext(
        internal_project_id="oslobygg",
        catenda_project_id="11111111-1111-1111-1111-111111111111",
        board_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        topic_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
        library_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    )

    mock_creation = MagicMock()
    monkeypatch.setattr(
        "services.sak_creation_service.get_sak_creation_service",
        lambda: mock_creation,
    )
    # Verken TE eller BH — eller treff i begge, som gir samme utfall.
    monkeypatch.setattr(
        "services.auth_service.AuthService.__init__", lambda self: None
    )
    monkeypatch.setattr(
        "services.auth_service.AuthService.contract_membership_for_subject",
        lambda self, project_id, subject: (None, None),
    )

    service = WebhookService(
        event_repository=MagicMock(),
        catenda_client=mock_client,
        resolver=mock_resolver,
        config={},
    )

    result = service.handle_new_topic_created(
        {
            "event": {"id": "evt-eo-2", "type": "issue.created"},
            "issue": {
                "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
                "boardId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
            },
            "project": {"id": "11111111111111111111111111111111"},
        }
    )

    assert result["success"] is False
    assert result["action"] == "rejected_unknown_contract_side"
    mock_creation.create_sak.assert_not_called()


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="INT-05: POST /api/events/batch dropper Catenda-levering og CatendaDeliveryStatus rapporterer feilaktig 'clear'",
)
def test_batch_events_skips_catenda_delivery_and_reports_clear(client, monkeypatch, tmp_path):
    """
    INT-05: POST /api/events/batch committer formelle hendelser uten å kalle Catenda-levering,
    og skriver ingen kvittering i delivery_status, så banneret feilaktig viser 'clear'.
    """
    from repositories.event_repository import JsonFileEventRepository
    from repositories.sak_metadata_repository import SakMetadataRepository

    sak_id = "SAK-BATCH-TEST"
    project_id = "oslobygg"

    # Sett opp isolerte repositories
    event_repo = JsonFileEventRepository(base_path=str(tmp_path / "events"))
    meta_repo = SakMetadataRepository(csv_path=str(tmp_path / "metadata.csv"))
    delivery_db = str(tmp_path / "delivery.sqlite3")
    monkeypatch.setenv("BH_APPROVAL_DB", delivery_db)
    delivery_status = CatendaDeliveryStatus(path=delivery_db)

    monkeypatch.setattr("routes.event_routes._get_event_repo", lambda: event_repo)
    monkeypatch.setattr("routes.event_routes._get_metadata_repo", lambda: meta_repo)
    container = MagicMock()
    container.metadata_repository = meta_repo
    container.event_repository = event_repo
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    # Opprett sak med metadata
    initial_event = SakOpprettetEvent(
        sak_id=sak_id,
        sakstittel="Batch Test Sak",
        aktor="TE Bruker",
        aktor_rolle="TE",
        prosjekt_id=project_id,
        catenda_topic_id="topic-batch-1",
    )
    event_repo.append(initial_event, expected_version=0)
    meta_repo.create(
        SakMetadata(
            sak_id=sak_id,
            prosjekt_id=project_id,
            created_at=datetime.now(UTC),
            created_by="TE Bruker",
            catenda_topic_id="topic-batch-1",
            catenda_board_id="board-1",
        )
    )

    # Mock sesjon for TE via appens koe_auth extension
    from lib.auth.session import cookie_name

    auth = MagicMock()
    auth.repo.session.return_value = {
        "app_users": {"id": "te-user", "email": "te@example.com", "name": "TE Saksbehandler"},
        "csrf_token": "csrf-test-token",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "TE"
    auth.contract_membership.return_value = ("TE", "team-te-1")
    client.application.extensions["koe_auth"] = auth
    client.set_cookie(cookie_name(), "session")

    # Mock at Catenda er aktivert
    monkeypatch.setattr(settings, "catenda_enabled", "true")

    batch_payload = {
        "sak_id": sak_id,
        "expected_version": 1,
        "events": [
            {
                "event_type": "grunnlag_opprettet",
                "sak_id": sak_id,
                "aktor": "TE Saksbehandler",
                "aktor_rolle": "TE",
                "data": {
                    "tittel": "Grunnlag for krav",
                    "beskrivelse": "Beskrivelse av kravet",
                    "dato_oppdaget": "2026-09-18",
                    "hovedkategori": "ENDRING",
                    "underkategori": "IRREG",
                    "begrunnelse": "Formelt krav oversendes",
                },
            }
        ],
    }

    resp = client.post(
        "/api/events/batch",
        data=json.dumps(batch_payload),
        content_type="application/json",
        headers={"X-CSRF-Token": "csrf-test-token", "X-Project-ID": project_id},
    )
    assert resp.status_code == 201, f"submit_batch feilet med {resp.status_code}: {resp.get_json()}"

    batch_event_id = resp.get_json()["event_ids"][0]

    # Sjekk både direkte summary og via /context-endepunktet:
    # Formell hendelse er sendt, men mangler Catenda-levering.
    # Status skal være 'pending' eller 'failed', IKKE 'clear'.
    summary = delivery_status.summary(project_id, sak_id, [batch_event_id])
    assert summary["status"] != "clear", (
        f"Batch-innsending leverte aldri til Catenda, men delivery_status.summary "
        f"rapporterer '{summary['status']}'. Brukeren varsles ikke om manglende levering."
    )

    ctx_resp = client.get(
        f"/api/cases/{sak_id}/context",
        headers={"X-Project-ID": project_id},
    )
    assert ctx_resp.status_code == 200
    catenda_sync = ctx_resp.get_json().get("catenda_sync", {})
    assert catenda_sync.get("status") != "clear", (
        f"/context rapporterer '{catenda_sync.get('status')}' for sak med uleverte batch-hendelser."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="INT-06: _prepare_catenda_context ignorerer sakens faktiske CatendaProjectConfig og overstyres av global .env",
)
def test_catenda_context_ignores_project_specific_catenda_config(monkeypatch):
    """
    INT-06: routes/event_routes.py:_prepare_catenda_context henter project_id og library_id
    utelukkende fra global settings.get_catenda_config(), og ignorerer sakens faktiske
    CatendaProjectConfig i flerprosjektmiljøer.
    """
    from routes.event_routes import _prepare_catenda_context

    sak_id = "SAK-PROJ-B"
    project_b_internal = "prosjekt-b"
    project_b_catenda = "22222222-2222-2222-2222-222222222222"
    project_b_library = "lib-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    project_b_board = "board-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

    # Mock metadata for saken i prosjekt B
    mock_meta_repo = MagicMock()
    mock_meta_repo.get.return_value = SakMetadata(
        sak_id=sak_id,
        prosjekt_id=project_b_internal,
        created_at=datetime.now(UTC),
        created_by="Bruker B",
        catenda_topic_id="topic-b-1",
        catenda_board_id=project_b_board,
        catenda_project_id=project_b_catenda,
    )
    monkeypatch.setattr("routes.event_routes._get_metadata_repo", lambda: mock_meta_repo)

    # Mock global settings med prosjekt A
    global_config = {
        "catenda_project_id": "11111111-1111-1111-1111-111111111111",
        "catenda_library_id": "lib-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    }
    monkeypatch.setattr(
        "core.config.Settings.get_catenda_config", lambda self: global_config
    )

    # Mock get_catenda_service
    mock_catenda_svc = MagicMock()
    monkeypatch.setattr("routes.event_routes.get_catenda_service", lambda: mock_catenda_svc)

    ctx = _prepare_catenda_context(sak_id)
    assert ctx is not None

    # Konteksten skal peke på prosjekt B sitt bibliotek og Catenda-prosjekt, ikke global .env
    assert ctx.project_id == project_b_catenda, (
        f"_prepare_catenda_context brukte global project_id '{ctx.project_id}' "
        f"i stedet for sakens prosjekt-ID '{project_b_catenda}'."
    )
    assert ctx.library_id == project_b_library, (
        f"_prepare_catenda_context brukte global library_id '{ctx.library_id}' "
        f"i stedet for sakens bibliotek-ID '{project_b_library}'."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="INT-07: CatendaCommentGenerator slår opp 'koe' i stedet for 'standard' og gir generisk fallback-tekst",
)
def test_catenda_comment_generator_sakstype_standard_returns_generic_fallback():
    """
    INT-07: CatendaCommentGenerator slår opp 'koe' i stedet for 'standard',
    og genererer derfor 'Ny Sak opprettet' og 'Se sak for detaljer' for standard KOE-saker.
    """
    generator = CatendaCommentGenerator()
    comment = generator.generate_creation_comment(
        sak_id="SAK-2026-001",
        sakstype="standard",
        project_name="Oslo Storbylegevakt",
    )

    # For standard KOE skal kommentaren angi 'Krav om endringsordre', ikke 'Sak'
    assert "Ny Krav om endringsordre opprettet" in comment, (
        f"generate_creation_comment returnerte generisk fallback for sakstype='standard':\n{comment}"
    )
    assert "Entreprenør sender varsel (grunnlag)" in comment, (
        f"generate_creation_comment ga generisk neste steg for sakstype='standard':\n{comment}"
    )
