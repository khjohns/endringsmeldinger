"""
pytest fixtures for integration testing

Provides:
- Flask test client
- Mock system instance
- Test data fixtures
"""

import os

# Import Flask app
import sys
import tempfile
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# CSRF håndheves i `require_auth`, som har sesjonen å sammenlikne mot. Det er
# ett håndhevingspunkt, og det kan ikke slås av her — tester som sender en
# mutasjon må sende `X-CSRF-Token` som samsvarer med sesjonens token, eller
# kjøre med DISABLE_AUTH.
from app import SystemContext
from app import app as flask_app
from repositories.csv_repository import CSVRepository

# Importen av `app` over kaller load_dotenv og legger backend/.env inn i miljøet.
# SUPABASE_URL og SUPABASE_SECRET_KEY blir dermed satt for hele testkjøringen,
# og en test som bygger en Supabase-klient treffer det konfigurerte prosjektet
# — også når utvikleren bare kjørte `pytest`. Tester som faktisk skal ut mot
# Supabase må derfor merkes `@pytest.mark.live` og bes om eksplisitt.
LIVE_SUPABASE_ENV = "RUN_LIVE_SUPABASE"

# Databasetestene kobler bare til en base de får oppgitt her, bygget av
# scripts/testbase/bygg_testbase.sh. Det finnes ingen standardverdi.
TESTBASE_ENV = "KOE_TESTBASE_URL"


def pytest_collection_modifyitems(config, items):
    """Hopp over `live`- og `database`-merkede tester uten eksplisitt miljø.

    Skippingen skjer i innsamlingen, ikke i en fixture, slik at verken klienter
    eller opprydding kjører: standard `pytest` skal ikke gjøre nettverkskall.
    """
    skip_live = pytest.mark.skip(
        reason=f"Live Supabase-test. Sett {LIVE_SUPABASE_ENV}=1 for å kjøre."
    )
    skip_database = pytest.mark.skip(
        reason=(
            f"Databasetest. Sett {TESTBASE_ENV} til en kastbar base bygget av "
            "scripts/testbase/bygg_testbase.sh for å kjøre."
        )
    )
    kjor_live = os.environ.get(LIVE_SUPABASE_ENV) == "1"
    kjor_database = bool(os.environ.get(TESTBASE_ENV))

    for item in items:
        if not kjor_live and item.get_closest_marker("live") is not None:
            item.add_marker(skip_live)
        if not kjor_database and item.get_closest_marker("database") is not None:
            item.add_marker(skip_database)


# Legacy constants for test fixtures (from deleted generated_constants.py)
SAK_STATUS = {
    "OPPRETTET": "100000000",
    "UNDER_VARSLING": "100000001",
    "SENDT": "100000002",
    "GODKJENT": "100000003",
}
KOE_STATUS = {"UTKAST": "100000000", "SENDT": "100000001", "GODKJENT": "100000002"}
BH_SVAR_STATUS = {"UTKAST": "100000000", "SENDT": "100000001", "GODKJENT": "100000002"}


@pytest.fixture
def app():
    """Create Flask app configured for testing"""
    flask_app.config.update(
        {
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,  # Disable CSRF for testing
        }
    )
    yield flask_app


@pytest.fixture
def client(app):
    """Create Flask test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create Flask CLI runner"""
    return app.test_cli_runner()


@pytest.fixture
def temp_data_dir():
    """Create temporary directory for test data"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def mock_repository(temp_data_dir):
    """Create real CSVRepository with temporary directory"""
    return CSVRepository(data_dir=temp_data_dir)


@pytest.fixture
def mock_catenda():
    """Create mock Catenda API client"""
    mock = MagicMock()
    mock.authenticate.return_value = True
    mock.create_comment.return_value = {"id": "comment-123"}
    mock.upload_document.return_value = {"id": "doc-123"}
    mock.create_document_reference.return_value = {"id": "ref-123"}
    mock.get_topic_details.return_value = {
        "id": "topic-123",
        "title": "Test Topic",
        "bimsync_creation_author": {
            "user": {"name": "Test User", "email": "test@example.com"}
        },
        "bimsync_custom_fields": [],
    }
    mock.get_topic_board_details.return_value = {"bimsync_project_id": "project-123"}
    mock.get_project_details.return_value = {"name": "Test Project"}
    mock.find_user_in_project.return_value = {
        "name": "Test User",
        "username": "test@example.com",
        "company": "Test Company",
    }
    return mock


@pytest.fixture
def mock_system(mock_repository, mock_catenda, temp_data_dir, monkeypatch):
    """Create mock SystemContext (replaces KOEAutomationSystem)"""
    config = {
        "catenda_client_id": "test-client-id",
        # Et lagret token gjør at SystemContext._authenticate tar token-grenen.
        # Med client_secret ville fixturen ha gjort et ekte kall til
        # api.catenda.com ved oppsett — enhetstester skal ikke ut på nettet.
        "catenda_access_token": "test-access-token",
        "catenda_project_id": "project-123",
        "catenda_library_id": "library-123",
        "data_dir": temp_data_dir,
        "react_app_url": "http://localhost:3000",
    }

    # Create mock magic link manager
    mock_mlm = MagicMock()
    mock_mlm.generate.return_value = "test-magic-token-123"
    mock_mlm.verify.return_value = (True, None, {"sak_id": "TEST-123"})

    # Create system with mocked catenda and magic link manager
    system = SystemContext(config, mock_mlm)
    system.catenda = mock_catenda

    # Patch the global system variable directly
    monkeypatch.setattr("app.system", system)

    yield system


@pytest.fixture
def test_sak_data():
    """Sample case data for testing"""
    return {
        "catenda_topic_id": "topic-abc-123",
        "catenda_project_id": "project-123",
        "catenda_board_id": "board-123",
        "sakstittel": "Test KOE Case",
        "status": SAK_STATUS["UNDER_VARSLING"],
        "byggherre": "Test Byggherre AS",
        "entreprenor": "Test Entreprenør AS",
        "prosjekt_navn": "Test Prosjekt",
    }


@pytest.fixture
def test_sak_with_data(mock_system, test_sak_data):
    """Create a test case with full data structure"""
    sak_id = mock_system.db.create_case(test_sak_data)

    # Get the created data
    data = mock_system.db.get_case(sak_id)

    return {"sak_id": sak_id, "data": data}


@pytest.fixture
def mock_magic_link_manager(monkeypatch):
    """Mock MagicLinkManager for tests that need it (not autouse)"""
    mock_mgr_class = MagicMock()
    mock_mgr_instance = MagicMock()
    mock_mgr_instance.generate.return_value = "test-magic-token-123"
    mock_mgr_instance.verify.return_value = (True, None, {"sak_id": "TEST-123"})

    mock_mgr_class.return_value = mock_mgr_instance

    # Patch magic_link module
    monkeypatch.setattr("lib.auth.magic_link.MagicLinkManager", mock_mgr_class)

    return mock_mgr_instance
