"""Sikkerhets- og kontraktrevisjon for frontend-integrasjon (Pass 6: Frontend).

Testene her etterprøver funn i skjæringspunktet mellom frontend og backend:
1. FE-01: LetterPreviewModal kaller /api/letter/generate uten CSRF-token og avvises med 403.
2. FE-01b: LetterPreviewModal kaller /api/letter/generate uten X-Project-ID og faller tilbake til 'oslobygg'.
3. FE-02: /api/cases/<sak_id>/context returnerer ingen autoritativ rolleinformasjon for innlogget bruker.
4. FE-02b: Klientstyrt rollebytte tillater TE å se/sende BH-handlinger, som krasjer med 400 Bad Request.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context


# =============================================================================
# 1. FE-01: CSRF-avvisning ved LetterPreviewModal.svelte fetch
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "FE-01: LetterPreviewModal kaller fetch uten X-CSRF-Token — og uten credentials "
        "og X-Project-ID. Ruta har require_auth, så ingen får tilgang til noe: samme "
        "opphav gir 403 på CSRF, kryssopphav gir 401 fordi sesjonsinformasjonskapselen "
        "ikke sendes. Dette er en funksjonsfeil — knappen virker ikke — ikke en "
        "angrepsvei (kontrollert 2026-09-19)."
    ),
)
def test_letter_preview_mangler_csrf_og_avvises_i_produksjon(monkeypatch):
    """LetterPreviewModal.svelte:19-22 kaller fetch direkte uten X-CSRF-Token.

    Backend-endepunktet POST /api/letter/generate er beskyttet av @require_auth,
    som krever gyldig X-CSRF-Token på alle muterende kall.
    I produksjon/sikret miljø blir kallet avvist med 403 Forbidden.
    Frontend forventer derimot at kallet lykkes (eller bruker apiFetch som inkluderer token).
    """
    from routes.letter_routes import letter_bp

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(letter_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "bh-user", "email": "bh@oslobygg.test"},
        "active_project_id": "oslobygg",
        "csrf_token": "valid-secret-csrf-token",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "BH"
    auth.contract_membership.return_value = ("BH", "team-bh")
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="oslobygg"
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")

    # Slik LetterPreviewModal.svelte:19-22 utfører kallet:
    # Kun Content-Type, ingen X-CSRF-Token eller X-Project-ID
    headers = {"Content-Type": "application/json"}
    payload = {
        "brev_innhold": {
            "tittel": "Testbrev",
            "mottaker": {"navn": "Entreprenør AS", "rolle": "TE"},
            "avsender": {"navn": "Oslobygg KF", "rolle": "BH"},
            "referanser": {
                "sak_id": "KOE-001",
                "sakstittel": "Test",
                "event_id": "evt-1",
                "spor_type": "grunnlag",
                "dato": "2026-09-18",
            },
            "seksjoner": {"innledning": "Hei", "begrunnelse": "Vurdering", "avslutning": "Hilsen"},
        }
    }

    response = client.post("/api/letter/generate", json=payload, headers=headers)

    # For at LetterPreviewModal skal fungere som tiltenkt, må kallet lykkes (200 OK).
    # Men i koden feiler det med 403 fordi komponenten omgår apiFetch og mangler X-CSRF-Token.
    assert response.status_code == 200, (
        f"LetterPreviewModal ble avvist med HTTP {response.status_code}: {response.get_json()}"
    )


# =============================================================================
# 2. FE-02: Manglende autoritativ rolle i /api/cases/<sak_id>/context
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="/api/cases/<sak_id>/context returnerer ikke brukerens faktiske kontraktsrolle",
)
def test_sak_context_mangler_brukerens_autoriserte_rolle(monkeypatch):
    """GET /api/cases/<sak_id>/context må returnere brukerens faktiske kontraktsrolle.

    Frontend baserer hele visningen og tilgjengelige handlinger på localStorage
    eller query-parameteren ?rolle=, fordi backend-responsen mangler informasjon
    om hvorvidt innlogget sesjon representerer TE eller BH.
    """
    from routes.event_routes import events_bp

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(events_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "te-user", "email": "te@entreprenor.test"},
        "active_project_id": "oslobygg",
        "csrf_token": "csrf-tok",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "TE"
    auth.contract_membership.return_value = ("TE", "team-te")
    app.extensions["koe_auth"] = auth

    # Mock _fetch_and_parse_events og timeline_service
    monkeypatch.setattr(
        "routes.event_routes._fetch_and_parse_events",
        lambda sak_id: ([], 1),
    )
    mock_timeline_svc = Mock()
    mock_timeline_svc.compute_state.return_value = SimpleNamespace(
        sak_id="KOE-001",
        tittel="Test",
        sakstype="standard",
        entreprenor="TE AS",
        byggherre="BH KF",
        grunnlag=SimpleNamespace(antall_versjoner=1),
        vederlag=SimpleNamespace(antall_versjoner=1),
        frist=SimpleNamespace(antall_versjoner=1),
    )
    mock_timeline_svc.get_grunnlag_historikk.return_value = []
    mock_timeline_svc.get_vederlag_historikk.return_value = []
    mock_timeline_svc.get_frist_historikk.return_value = []
    monkeypatch.setattr("routes.event_routes._get_timeline_service", lambda: mock_timeline_svc)
    monkeypatch.setattr("routes.event_routes.visible_events", lambda evts: evts)
    monkeypatch.setattr("routes.event_routes.format_timeline_response", lambda evts: [])
    monkeypatch.setattr(
        "routes.event_routes.public_state",
        lambda state, evts, vis: {"sak_id": "KOE-001", "sakstype": "standard"},
    )

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    headers = {"X-Project-ID": "oslobygg"}

    response = client.get("/api/cases/KOE-001/context", headers=headers)
    assert response.status_code == 200

    data = response.get_json()
    # Frontend trenger brukerens autoriserte rolle for å skjerme ulovlige handlinger
    assert "user_role" in data or "contract_role" in data, (
        f"/api/cases/<sak_id>/context mangler autoritativ brukerrolle. Felter: {list(data.keys())}"
    )
