"""Sikkerhets- og fullmaktsgjennomgang (Pass 4: Godkjenning og fullmakt).

Testene her etterprøver funn i godkjennings- og fullmaktslaget:
1. Fullmaktsomgåelse for fristdager i endringsordrer (order_exposure_floor mangler fristdager)
2. Fullmaktsomgåelse ved ny_sluttdato i KOE-fristrespons (exposure ignorerer ny_sluttdato)
3. RV-02 regresjon: reconcile() returnerer pakke under aktiv utstedelse, varig "returnert"
4. Forseringsrespons er blokkert i porten, men kan ikke godkjennes i ApprovalService
5. Uautorisert generering av formelle byggherrebrev som PDF via POST /api/letter/generate
"""

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from services.approval_authority import approval_route, resolve_route
from services.approval_service import ApprovalService
from services.business_rules import BusinessRuleValidator
from services.eo_approval_service import (
    EOApprovalService,
    order_exposure,
    order_exposure_floor,
)

# =============================================================================
# 1. Fullmaktsomgåelse for fristdager i endringsordrer (order_exposure_floor)
# =============================================================================


def test_eo_exposure_floor_mangler_fristdager():
    """order_exposure_floor må inkludere fristdager * dagmulktssats som minimumsfullmakt.

    Når en endringsordre inneholder en fristforlengelse (f.eks. 500 dager) og en ny
    sluttdato, returnerer order_exposure None (fordi ny_sluttdato krever full kjede).
    order_exposure_floor så tidligere KUN på kompensasjon_belop og fradrag_belop.
    Med kompensasjon_belop 0 ble floor 0, i resolve_route(amount=None, minimum=0)
    ble sjekken `minimum > 0` False, og kjeden ble returnert som den er — en
    Prosjektleder (grense 200 000 kr) kunne godkjenne en fristforlengelse verdt
    5 000 000 kr.

    Regresjonstest for GFK-01 etter at gulvet fikk daily_rate (rettet 2026-09-19).
    Signaturendringen er den vurderingen av auditfunnene foreskriver; påstanden
    under er uendret.
    """
    daily_rate = Decimal("10000")
    request = {
        "eo_nummer": "EO-100",
        "beskrivelse": "Fristforlengelse 500 dager",
        "kompensasjon_belop": 0,
        "fradrag_belop": 0,
        "frist_dager": 500,  # 500 * 10 000 = 5 000 000 kr
        "ny_sluttdato": "2028-01-01",
        "konsekvenser": {"fremdrift": True},
    }

    amount = order_exposure(request, daily_rate=daily_rate)
    assert amount is None, "order_exposure skal returnere None ved ny_sluttdato"

    floor = order_exposure_floor(request, daily_rate)
    assert floor >= Decimal("5000000"), (
        f"order_exposure_floor ignorerte fristdager og returnerte {floor} i stedet for minst 5000000"
    )

    # Selve sikkerhetsegenskapen, ikke bare aritmetikken: en kjede som ikke dekker
    # 5 000 000 skal avvises, ikke returneres som den er.
    for utilstrekkelig in (
        [{"role": "Prosjektleder"}],
        [{"role": "Prosjektleder"}, {"role": "Avdelingsleder"}],
    ):
        with pytest.raises(ValueError, match="tilstrekkelig fullmakt"):
            resolve_route(None, {"role": "Prosjektleder"}, utilstrekkelig, minimum=floor)

    # En kjede som dekker beløpet slipper gjennom, i sin helhet.
    dekkende = [{"role": "Prosjektleder"}, {"role": "Divisjonsdirektør"}]
    assert resolve_route(
        None, {"role": "Prosjektleder"}, dekkende, minimum=floor
    ) == dekkende


# =============================================================================
# 2. Fullmaktsomgåelse ved ny_sluttdato i KOE-fristrespons
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="approval_authority.exposure() ignorerer ny_sluttdato i FristResponsData",
)
def test_koe_frist_ny_sluttdato_omgar_fullmakt():
    """KOE exposure() må ikke ignorere ny_sluttdato i FristResponsData.

    I EOApprovalService krever ny_sluttdato eksplisitt full godkjenningskjede fordi
    systemet ikke kjenner baseline-datoen.
    I approval_authority.exposure() (for vanlige KOE-brev) sjekkes KUN godkjent_dager.
    Dersom byggherren godkjenner en ny_sluttdato langt frem i tid uten å angi
    godkjent_dager (eller godkjent_dager=0), returnerer exposure 0 kr, og saksbehandler
    kan godkjenne brevet alene uten godkjenningskjede.
    """
    item = {
        "track": "frist",
        "data": {
            "beregnings_resultat": "godkjent",
            "ny_sluttdato": "2028-12-31",
            "godkjent_dager": 0,
            "begrunnelse": "Godkjenner 2 års forskyvning av sluttdato",
        },
    }

    sender = {"id": "pl", "role": "Prosjektleder"}
    chain = [{"id": "pd", "role": "Prosjektdirektør"}]

    auth, route = approval_route([item], chain, daily_rate=50000, sender=sender)

    # Feiler i dag fordi exposure() setter amount=0 og route=[]:
    assert len(route) > 0 or auth["amount"] is None, (
        f"Godkjenning av 2 års ny sluttdato ga tom godkjenningsrute og 0 kr eksponering: {auth}, {route}"
    )


# =============================================================================
# 3. RV-02 regresjon: reconcile() returnerer pakke midt under aktiv utstedelse
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="reconcile() mangler sjekk på aktiv utstedelses-lease; setter pakke til 'returnert'",
)
def test_rv02_reconcile_returnerer_pakke_under_aktiv_utstedelse(tmp_path):
    """reconcile() i EOApprovalService må ikke sette en pakke under aktiv utstedelse til returnert.

    Hvis en policy endres mens opprett_endringsordresak pågår, setter reconcile() pakken
    til 'returnert' og fjerner leasen (issuingAttempt).
    Utstedelsen fullfører i event-lageret, men kvitteringen forkastes.
    Pakken forblir varig som 'returnert' i stedet for 'utstedt'.
    """
    db_path = tmp_path / "approvals.sqlite"
    orders = Mock()
    created = set()

    def create(**kwargs):
        created.add(kwargs["sak_id"])
        return {"sak_id": kwargs["sak_id"], "catenda_synced": False}

    orders.opprett_endringsordresak.side_effect = create

    policy = {
        "handlers": [{"id": "pl@test", "role": "Prosjektleder"}],
        "chain": [{"id": "pd@test", "role": "Prosjektdirektør"}],
        "daily_rate": 10000,
    }

    service = EOApprovalService(db_path, orders, policy, issued=created.__contains__)

    # 1. Opprett en pakke
    service.command(
        "p1",
        "pl@test",
        {
            "action": "submit",
            "commandId": "c1",
            "expectedVersion": 0,
            "request": {
                "eo_nummer": "EO-001",
                "beskrivelse": "Test",
                "kompensasjon_belop": 100000,
                "konsekvenser": {"pris": True},
            },
        },
        "Kari",
    )

    # 2. Simuler at pakken er godkjent og står under aktiv utstedelse
    attempt_id = str(uuid4())
    with service.transaction("p1") as st:
        p = st["packages"][0]
        p["status"] = "godkjent"
        p["sakId"] = "EO-SAK-1"
        p["issuingAt"] = "2026-09-18T12:00:00Z"
        p["issuingAttempt"] = attempt_id

    # 3. Policy endres underveis (f.eks. dagmulktssats eller kjede)
    service.policy["chain"] = [{"id": "ny_pd@test", "role": "Prosjektdirektør"}]

    # 4. En annen tråd kaller read(), som kaller reconcile()
    service.read("p1", "pl@test")

    # Feiler i dag fordi reconcile() overstyrer status til 'returnert' og fjerner issuingAttempt
    with service.transaction("p1") as st:
        pkg = st["packages"][0]
        assert pkg.get("issuingAttempt") == attempt_id, (
            f"reconcile() slettet aktiv utstedelses-lease: issuingAttempt={pkg.get('issuingAttempt')}, status={pkg['status']}"
        )


# =============================================================================
# 4. Forseringsrespons er blokkert i porten, men kan ikke godkjennes
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="ApprovalService mangler støtte for forsering; kaster 'Ugyldig vurderingstype.'",
)
def test_forsering_respons_mangler_godkjenningsstotte(tmp_path):
    """ApprovalService må støtte forsering_respons når ruten blokkeres av approval policy.

    services/approval_policy.py:106 blokkerer forsering_respons med 403:
    'Svar på forseringsvarsel må publiseres gjennom intern godkjenning.'
    Men ApprovalService.command(action='prepare') kaster ValueError('Ugyldig vurderingstype.')
    fordi TRACKS kun er ('grunnlag', 'vederlag', 'frist').
    Byggherren er dermed fullstendig avskåret fra å svare på forsering.
    """
    events = Mock()
    events.get_events.return_value = ([], 0)
    timeline = Mock()
    service = ApprovalService(
        tmp_path / "app.sqlite",
        events,
        timeline,
        BusinessRuleValidator(),
        authority_policy={
            "handlers": [{"id": "bh@test", "role": "Prosjektleder"}],
            "chain": [],
        },
    )

    try:
        service.command(
            "p1",
            "case-1",
            "bh@test",
            [],
            True,
            {
                "action": "prepare",
                "commandId": "c1",
                "expectedVersion": 0,
                "item": {
                    "track": "forsering",
                    "eventType": "forsering_respons",
                    "data": {"aksepterer": True},
                },
            },
        )
    except ValueError as exc:
        assert "Ugyldig vurderingstype" not in str(exc), (
            f"ApprovalService støtter ikke forsering: {exc}"
        )


# =============================================================================
# 5. Uautorisert generering av formelle byggherrebrev som PDF
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="POST /api/letter/generate tillater TE å generere offisielle BH-brev som PDF",
)
def test_te_bruker_kan_generere_bh_brev_pdf(monkeypatch):
    """POST /api/letter/generate må ikke tillate at TE genererer offisielle BH-brev.

    letter_routes.py mangler @require_contract_role('BH') og validering av avsender.
    En innlogget TE-bruker kan generere en offisiell Oslobygg KF PDF med godkjent krav.
    """
    from routes.letter_routes import letter_bp

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(letter_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "te-user", "email": "te@contractor.test"},
        "active_project_id": "oslobygg",
        "csrf_token": "csrf",
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

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")

    response = client.post(
        "/api/letter/generate",
        json={
            "brev_innhold": {
                "tittel": "Forliksavtale",
                "mottaker": {"navn": "Entreprenør AS", "rolle": "TE"},
                "avsender": {"navn": "Oslobygg KF", "rolle": "BH"},
                "referanser": {
                    "sak_id": "KOE-123",
                    "sakstittel": "Krav",
                    "event_id": "evt-1",
                    "spor_type": "vederlag",
                    "dato": "2026-09-18",
                },
                "seksjoner": {
                    "innledning": "Vi bekrefter...",
                    "begrunnelse": "Godkjent 50 millioner.",
                    "avslutning": "Hilsen Byggherren",
                },
            }
        },
        headers={"X-Project-ID": "oslobygg", "X-CSRF-Token": "csrf"},
    )

    # Feiler i dag fordi TE mottar 200 OK og en gyldig PDF utstedt av BH
    assert response.status_code in (400, 403), (
        f"TE-bruker fikk generert formelt BH-brev: status={response.status_code}"
    )
