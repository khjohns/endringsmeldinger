"""Sikkerhets- og fullmaktsgjennomgang (Pass 4: Godkjenning og fullmakt).

Testene her etterprøver funn i godkjennings- og fullmaktslaget:
1. Fullmaktsomgåelse for fristdager i endringsordrer (order_exposure_floor mangler fristdager)
2. Fullmaktsomgåelse ved ny_sluttdato i KOE-fristrespons (GFK-02, rettet 2026-09-23)
3. RV-02 regresjon: reconcile() returnerer pakke under aktiv utstedelse, varig "returnert"
4. Forseringsrespons er blokkert i porten, men kan ikke godkjennes i ApprovalService
5. Uautorisert generering av formelle byggherrebrev som PDF via POST /api/letter/generate
6. Godkjenning av ansvarsgrunnlaget alene verdsettes til 0 kr (GFK-06)
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


def test_koe_frist_ny_sluttdato_omgar_fullmakt():
    """KOE-fullmakten må ikke ignorere ny_sluttdato i FristResponsData.

    Regresjonstest for GFK-02 (rettet 2026-09-23). Som for endringsordrer kan en
    ny sluttdato ikke verdsettes uten kontraktens sluttdato, og hele kjeden
    kreves.
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

    assert len(route) > 0 or auth["amount"] is None, (
        f"Godkjenning av 2 års ny sluttdato ga tom godkjenningsrute og 0 kr eksponering: {auth}, {route}"
    )


def _ny_sluttdato(godkjent_dager):
    return {
        "track": "frist",
        "data": {
            "beregnings_resultat": "godkjent",
            "ny_sluttdato": "2028-12-31",
            "godkjent_dager": godkjent_dager,
        },
    }


PL = {"id": "pl", "role": "Prosjektleder"}


@pytest.mark.parametrize("daily_rate", [50000, None])
def test_ny_sluttdato_krever_hele_kjeden(daily_rate):
    """Uten dager å verdsette trengs ingen sats, men datoen krever likevel kjeden."""
    chain = [{"id": "pd", "role": "Prosjektdirektør"}, {"id": "sl", "role": "Seksjonsleder"}]
    auth, route = approval_route([_ny_sluttdato(0)], chain, daily_rate, sender=PL)
    assert auth["amount"] is None
    assert auth["minimum"] == "0"
    assert route == chain


def test_ny_sluttdato_krever_at_kjeden_dekker_de_verdsatte_dagene():
    """11 dager à 50 000 kr er 550 000 kr, over prosjektdirektørens 500 000."""
    utilstrekkelig = [{"id": "pd", "role": "Prosjektdirektør"}]
    with pytest.raises(ValueError, match="tilstrekkelig fullmakt"):
        approval_route([_ny_sluttdato(11)], utilstrekkelig, 50000, sender=PL)

    dekkende = [{"id": "pd", "role": "Prosjektdirektør"}, {"id": "sl", "role": "Seksjonsleder"}]
    auth, route = approval_route([_ny_sluttdato(11)], dekkende, 50000, sender=PL)
    assert auth["minimum"] == "550000"
    assert route == dekkende


def test_ny_sluttdato_uten_dagmulktssats_gir_aldri_svakere_rute_enn_kjeden():
    """B-06 er åpen: hva som kreves uten sats, avgjøres ikke her.

    Påstanden er bare at en ny sluttdato med dager aldri gir kortere rute enn
    hele kjeden, uansett hvordan B-06 avgjøres.
    """
    chain = [{"id": "pd", "role": "Prosjektdirektør"}]
    try:
        _, route = approval_route([_ny_sluttdato(10)], chain, None, sender=PL)
    except ValueError:
        return
    assert route == chain


def test_ny_sluttdato_kan_ikke_godkjennes_av_saksbehandler_alene():
    """Heller ikke med ubegrenset egen fullmakt, som for endringsordrer."""
    adm = {"id": "ad", "role": "Adm.dir (daglig leder)"}
    chain = [{"id": "pd", "role": "Prosjektdirektør"}]
    _, route = approval_route([_ny_sluttdato(0)], chain, 50000, sender=adm)
    assert route == chain


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


# =============================================================================
# 6. Godkjenning av ansvarsgrunnlaget alene verdsettes til 0 kr (GFK-06)
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "GFK-06: en pakke som bare godkjenner ansvarsgrunnlaget verdsettes til 0 kr, "
        "så en prosjektleder godkjenner ansvaret for et krav på 50 mill. alene. Ikke "
        "rettet: hvordan en slik godkjenning skal verdsettes, er en fullmaktsbeslutning"
    ),
)
def test_godkjent_grunnlag_alene_krever_ingen_godkjenner(tmp_path):
    from models.events import parse_event_from_request
    from repositories.event_repository import JsonFileEventRepository
    from services.timeline_service import TimelineService

    def hendelse(event_type, data):
        return parse_event_from_request(
            {
                "sak_id": "S",
                "event_type": event_type,
                "aktor_id": "te",
                "aktor_rolle": "TE",
                "data": data,
            }
        )

    lager = JsonFileEventRepository(str(tmp_path / "events"))
    grunnlag = hendelse(
        "grunnlag_opprettet",
        {
            "tittel": "Uforutsette grunnforhold",
            "hovedkategori": "SVIKT",
            "underkategori": "GRUNNFORHOLD",
            "beskrivelse": "Fjell der det skulle være løsmasser.",
            "dato_oppdaget": "2026-09-01",
        },
    )
    lager.append(grunnlag, 0)
    lager.append(
        hendelse(
            "vederlag_krav_sendt",
            {"metode": "FASTPRIS_TILBUD", "belop_direkte": 50_000_000, "begrunnelse": "Krav"},
        ),
        1,
    )
    saksbehandler = "pl@example.test"
    kjede = [
        {"id": "pd@example.test", "role": "Prosjektdirektør"},
        {"id": "adm@example.test", "role": "Adm.dir (daglig leder)"},
    ]
    tjeneste = ApprovalService(
        tmp_path / "private.sqlite",
        lager,
        TimelineService(),
        BusinessRuleValidator(),
        authority_policy={"handlers": [{"id": saksbehandler, "role": "Prosjektleder"}]},
    )

    def kommando(action, **felt):
        versjon = tjeneste.read("p1", "S")["version"]
        return tjeneste.command(
            "p1",
            "S",
            saksbehandler,
            kjede,
            True,
            {"action": action, "expectedVersion": versjon, "commandId": str(uuid4()), **felt},
            team="bh-team",
        )

    vurdering = kommando(
        "prepare",
        item={
            "track": "grunnlag",
            "eventType": "respons_grunnlag",
            "claimId": grunnlag.event_id,
            "data": {
                "grunnlag_event_id": grunnlag.event_id,
                "resultat": "godkjent",
                "begrunnelse": "Byggherren godtar ansvaret.",
            },
        },
    )["items"][-1]
    pakke = kommando(
        "package",
        letter={
            "title": "Svar på ansvarsgrunnlag",
            "caseId": "S",
            "caseTitle": "Uforutsette grunnforhold",
            "sender": "BH",
            "recipient": "TE",
            "date": "23. september 2026",
            "introduction": "Innledning",
            "closing": "Hilsen",
            "items": [{"id": vurdering["id"]}],
        },
    )["packages"][-1]

    assert pakke["steps"], (
        f"Godkjenning av ansvaret for et krav på 50 mill. ble godkjent ved innsending: "
        f"status={pakke['status']}, fullmaktsgrunnlag={pakke['authority']}"
    )
