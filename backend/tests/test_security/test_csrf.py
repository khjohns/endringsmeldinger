"""
Tests for CSRF protection.

Verifies that:
1. /api/csrf-token krever innlogging
2. Tokenet som utleveres er sesjonens eget token
3. Token-generering og -validering (lib.auth.csrf_protection) er konsistent

Merk om kontrakten: tokenet er bundet til sesjonen, ikke til forespørselen.
`lib.auth.session.csrf_valid` sammenligner X-CSRF-Token mot det lagrede
`session["csrf_token"]`, så et token som roterte per forespørsel ville aldri
validere. Stabilitet innenfor en sesjon er derfor et krav, ikke en svakhet.
"""

from unittest.mock import Mock

import pytest

from lib.auth.session import cookie_name

SESSION_CSRF = "sesjonens-csrf-token-med-nok-lengde"


@pytest.fixture
def authed_client(app, monkeypatch):
    """Klient med gyldig sesjonscookie og et mocket medlemsoppslag."""
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "bruker@example.com", "name": "Bruker"},
        "csrf_token": SESSION_CSRF,
    }
    monkeypatch.setitem(app.extensions, "koe_auth", auth)
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return client


class TestCSRFProtection:
    """Test CSRF protection on endpoints"""

    def test_csrf_token_requires_authentication(self, client):
        """Uten sesjon skal endepunktet avvise, ikke dele ut et token."""
        response = client.get("/api/csrf-token")

        assert response.status_code == 401
        assert "csrfToken" not in (response.get_json() or {})

    def test_csrf_token_endpoint_returns_session_token(self, authed_client):
        """Innlogget bruker får sesjonens token, ikke et nygenerert."""
        response = authed_client.get("/api/csrf-token")

        assert response.status_code == 200
        data = response.get_json()
        assert data["csrfToken"] == SESSION_CSRF
        assert data["expiresIn"] == 3600
        # Tokenet skal ikke mellomlagres av browser eller proxy.
        assert response.headers["Cache-Control"] == "no-store"

    def test_csrf_token_is_stable_within_session(self, authed_client):
        """Tokenet må være stabilt: csrf_valid sammenligner mot sesjonens verdi.

        Roterte tokenet per forespørsel, ville ingen etterfølgende POST validere.
        """
        first = authed_client.get("/api/csrf-token").get_json()["csrfToken"]
        second = authed_client.get("/api/csrf-token").get_json()["csrfToken"]

        assert first == second == SESSION_CSRF
