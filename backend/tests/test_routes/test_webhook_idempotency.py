"""
Retry/idempotens-tester for webhook-håndteringen (trinn 1b).

Formål: avdekke at dagens tidlige eventreservasjon mister retries når en
behandling feiler.

Dagens rute (catenda_webhook_routes.py) gjør:
    1.  is_duplicate_event(event_id)  -> reserverer event-ID FØR behandling
    2.  handle_new_topic_created(...)

Fordi reservasjonen skjer i steg 1 og aldri frigis ved feil i steg 2, går
retryer tapt: En levering som feiler under behandlingen får event-ID-en sin
permanent merket som "prosessert". En påfølgende retry fra Catenda blir avvist
med 202 already_processed - og de manglende sideeffektene (sak eller kommentar)
blir aldri utført.

Vi skiller bevisst mellom to feilklasser, som på sikt krever forskjellige
løsninger:

  A) Feil FØR lokal commit (f.eks. databasefeil i create_sak):
     Saken opprettes aldri. Retry bør kunne opprette saken.
     Krever inbox/UoW som markerer event fullført FØRST etter suksess-commit.

  B) Catenda-feil ETTER commit (f.eks. kommentarposting feiler):
     Saken er opprettet lokalt, men en Catenda-sideeffekt mangler.
     Retry må IKKE opprette duplikat-sak, men heller fullføre den manglende
     sideeffekten. Krever durable outbox.

Disse testene dokumenterer dagens tap av retry og skal revideres når
inbox/outbox-designet (trinn 2/3 i docs/catenda-dataflyt.md) implementeres.
"""

import json
import os
from unittest.mock import MagicMock

import pytest

from services.catenda_project_resolver import ResolvedProjectContext

FIXTURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "fixtures", "catenda_issue_created_anonymized.json"
)

VALID_SECRET = "test-secret-path"


@pytest.fixture(autouse=True)
def isolate_redis(monkeypatch):
    """Kjør idempotensen på den deterministiske in-memory-banen."""
    monkeypatch.delenv("REDIS_URL", raising=False)

    import lib.security.webhook_security as ws

    monkeypatch.setattr(ws, "_redis_client", None)
    monkeypatch.setattr(ws, "_redis_available", None)

    from lib.security.webhook_security import clear_processed_events

    clear_processed_events()
    yield


@pytest.fixture
def env_secret(monkeypatch):
    monkeypatch.setenv("WEBHOOK_SECRET_PATH", VALID_SECRET)
    yield


@pytest.fixture
def client_and_service(client, env_secret, monkeypatch):
    """Patch get_webhook_service og returner (client, mock_service)."""
    mock_service = MagicMock()
    monkeypatch.setattr(
        "routes.catenda_webhook_routes.get_webhook_service",
        lambda: mock_service,
    )
    return client, mock_service


def load_fixture() -> dict:
    with open(FIXTURE_PATH) as fh:
        return json.load(fh)


def post(client, event_id_override: str | None = None):
    payload = load_fixture()
    if event_id_override is not None:
        payload["event"]["id"] = event_id_override
    return client.post(
        f"/webhook/catenda/{VALID_SECRET}",
        data=json.dumps(payload),
        content_type="application/json",
    )


class TestRetryLostBeforeCommit:
    """Feilkasse A: feil FØR lokal commit.

    Tester at dagens reservasjon av event-ID før behandling gjør at en
    levering som feiler underveis (saken opprettes aldri) likevel blir ansett
    som "prosessert" - dermed går retryen tapt.
    """

    def test_db_failure_reserves_id_and_loses_retry(self, client_and_service):
        """Saken opprettes aldri på første levering, men retry blir avvist.

        Det riktige utfallet (med inbox/UoW) er at retry dispatchtes og
        oppretter saken. Dagens atferd mister den.

        TODO (trinn 2/3): når inbox/UoW markerer event fullført FØRST etter
        suksess-commit, skal retry i stedet gi 200 {"success": true, "sak_id"}.
        """
        client, mock_service = client_and_service
        dispatch_count = {"count": 0}

        def flaky(payload):
            dispatch_count["count"] += 1
            # Feil FØR commit: saken opprettes aldri.
            return {"success": False, "error": "DB-feil, sak ikke opprettet"}

        mock_service.handle_new_topic_created.side_effect = flaky

        first = post(client)
        second = post(client)  # retry fra Catenda, samme event.id

        # Første levering feilet (ingen sak ble skapt)...
        assert first.status_code == 200
        assert first.get_json()["success"] is False
        # ...men retryen avvises som duplikat, så saken-forblir-uopprettet.
        assert second.status_code == 202
        assert second.get_json()["status"] == "already_processed"
        # Retry ble ALDRI dispensert: behandlingen kjørte kun én gang,
        # selv om den feilet. Dette er tapet av retry-testen skal avdekke.
        assert dispatch_count["count"] == 1

    def test_failed_event_id_remains_reserved(self, client_and_service):
        """Etter en feilet levering er event-ID-en fortsatt merket prosessert.

        Dette er roten til at retryen går tapt: reservasjonen er ikke
        betinget av at behandlingen faktisk lyktes.

        TODO (trinn 2/3): event-ID skal først betraktes som prosessert etter
        en vellykket commit.
        """
        client, mock_service = client_and_service
        mock_service.handle_new_topic_created.return_value = {
            "success": False,
            "error": "feil",
        }

        post(client)
        duplicate = post(client)

        assert duplicate.status_code == 202
        assert duplicate.get_json()["status"] == "already_processed"
        assert mock_service.handle_new_topic_created.call_count == 1


class TestRetryLostAfterCommit:
    """Feilkasse B: Catenda-feil ETTER lokal commit.

    Når saken er opprettet lokalt men en Catenda-sideeffekt (kommentaren)
    feiler, veileder handle_new_topic_created feilen og returnerer likevel
    {"success": true}. Ruten svarer derfor 200, og Catenda vil aldri retry.
    Den manglende kommentaren blir stående ufullført.
    """

    def test_missing_comment_has_no_durable_retry(self, monkeypatch):
        """Kommentarfeil etter commit etterlater ingen fullførbar oppgave.

        Bruker en ekte WebhookService: saken "opprettes" via mock, men
        create_comment feiler. Tjenesten svelger feilen og returnerer success.
        Det finnes ingen fastholdt jobb (outbox) som senere kan poste den
        manglende kommentaren.

        TODO (trinn 2/3): en durable outbox skal registrere kommentarposten
        som en gjenværende sideeffekt og fullføre den uavhengig av webhooken.
        """
        from services.catenda_webhook_service import WebhookService

        # Simuler Catenda-feil etter at saken er commit't lokalt.
        mock_client = MagicMock()
        mock_client.get_topic_details.return_value = {
            "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
            "title": "T",
            "topic_type": "Krav om endringsordre",
            "bimsync_creation_author": {
                "user": {"name": "U", "email": "u@example.invalid"}
            },
            "bimsync_custom_fields": [],
        }
        mock_client.get_topic_board_details.return_value = {
            "bimsync_project_id": "11111111111111111111111111111111"
        }
        mock_client.get_project_details.return_value = {"name": "P"}
        mock_client.create_comment.side_effect = RuntimeError("Catenda nede")

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
            resolver=MagicMock(
                resolve=MagicMock(
                    return_value=ResolvedProjectContext(
                        internal_project_id="oslobygg",
                        catenda_project_id="11111111-1111-1111-1111-111111111111",
                        board_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
                        topic_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
                        library_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    )
                )
            ),
            config={"react_app_url": "http://localhost:3000"},
            magic_link_generator=MagicMock(),
        )

        result = svc.handle_new_topic_created(load_fixture())

        # Saken er opprettet, men kommentaren tok aldri.
        mock_creation.create_sak.assert_called_once()
        mock_client.create_comment.assert_called_once()

        # Tjenesten rapporterer success (feilen er bare logget), så en retry
        # fra Catenda vil aldri utløses for å fullføre kommentaren.
        assert result["success"] is True
