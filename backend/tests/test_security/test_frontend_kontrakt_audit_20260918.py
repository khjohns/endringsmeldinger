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


def test_letter_preview_mangler_csrf_og_avvises_i_produksjon(monkeypatch):
    """FE-01: LetterPreviewModal sender nå det ruta krever — og bare det.

    Komponenten kalte fetch direkte med kun Content-Type: ingen credentials,
    ingen X-CSRF-Token, intet X-Project-ID. Knappen virket derfor ikke i et
    sikret miljø. Rettet 2026-09-20: kallet kan ikke gå gjennom apiFetch, som
    parser JSON og ikke blob, så headerne settes eksplisitt i komponenten.

    Testen prøver begge halvdeler, fordi bare den ene er en retting:
    de nye headerne slipper gjennom, og de gamle avvises fortsatt. En variant
    som lot et CSRF-løst mutasjonskall lykke ville vært en svekkelse, ikke en
    retting — den opprinnelige reproduksjonen hevdet nettopp det (200), og er
    derfor erstattet framfor snudd.
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

    # Slik komponenten kaller i dag.
    nye_headere = {
        "Content-Type": "application/json",
        "X-CSRF-Token": "valid-secret-csrf-token",
        "X-Project-ID": "oslobygg",
    }
    svar = client.post("/api/letter/generate", json=payload, headers=nye_headere)
    assert svar.status_code == 200, (
        f"LetterPreviewModal ble avvist med HTTP {svar.status_code}: {svar.get_json()}"
    )

    # Og slik den kalte før: uten CSRF skal mutasjonen fortsatt avvises.
    gamle_headere = {"Content-Type": "application/json"}
    avvist = client.post("/api/letter/generate", json=payload, headers=gamle_headere)
    assert avvist.status_code == 403, (
        "Et muterende kall uten X-CSRF-Token skal avvises, ikke slippe gjennom. "
        f"Fikk HTTP {avvist.status_code}."
    )


# =============================================================================
# 2. FE-02: Manglende autoritativ rolle i /api/cases/<sak_id>/context
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="/api/cases/<sak_id>/context returnerer ikke brukerens faktiske kontraktsrolle",
)
def test_sak_context_mangler_brukerens_autoriserte_rolle(monkeypatch, tmp_path):
    """GET /api/cases/<sak_id>/context må returnere brukerens faktiske kontraktsrolle.

    Frontend baserer hele visningen og tilgjengelige handlinger på localStorage
    eller query-parameteren ?rolle=, fordi backend-responsen mangler informasjon
    om hvorvidt innlogget sesjon representerer TE eller BH.

    Merknad 2026-09-22 (T-3): oppsettet manglet saken i prosjektet, så
    `require_project_access` svarte 403 og testen nådde aldri assertionen om
    rolle. Bare oppsettet er rettet; testen feiler nå på målassertionen.
    """
    from routes.event_routes import events_bp

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
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

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="oslobygg"
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

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
