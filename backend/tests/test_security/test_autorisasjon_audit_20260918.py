"""Sikkerhets- og autorisasjonsgjennomgang (Pass 2: Autorisasjon).

Testene her etterprøver funn i autorisasjonslaget:
- IDOR og kryssprosjektlekkasje i forseringstjenesten
- Lekkende aktivitetsstempel ved batch-innsending av interne notater
- Manglende metode og 500-krasj på metadata-repoet ved sakstype-filtrering

Alle testene kjører mot ekte ruter og dekoratører med testdobler for lagring.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.events import (
    EventType,
    FristBeregningResultat,
    FristData,
    FristEvent,
    FristResponsData,
    ResponsEvent,
    SakOpprettetEvent,
    SporType,
)
from services.timeline_service import TimelineService

HEADERS_A = {"X-Project-ID": "project-a", "X-CSRF-Token": "csrf"}
HEADERS_B = {"X-Project-ID": "project-b", "X-CSRF-Token": "csrf"}


def _auth(role="member", contract=("TE", "team-b")):
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user-test", "email": "test@example.com", "name": "Tester"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = role
    auth.contract_role.return_value = contract[0]
    auth.contract_membership.return_value = contract
    return auth


def _client(monkeypatch, auth, *blueprints):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    for bp in blueprints:
        app.register_blueprint(bp)
    app.extensions["koe_auth"] = auth
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return client


# =============================================================================
# 1. Kryssprosjektlekkasje i GET /api/forsering/<sak_id>/valider-grunnlag
# =============================================================================


def test_valider_forseringsgrunnlag_evaluerer_sak_i_annet_prosjekt(monkeypatch):
    """GET /api/forsering/<sak>/valider-grunnlag må ikke evaluere eller lekke status

    for saker i andre prosjekter (utvider RV-07).
    Her refererer en forsering i project-b til en sak i project-a. Saken i
    project-a har fått sitt fristkrav godkjent av BH i project-a.
    En bruker i project-b kaller valider-grunnlag på sin egen forsering,
    og backend slo tidligere opp og røpet kontraktstilstanden til saken i
    project-a. Regresjonstest for AUT-01 siden grunnlaget filtreres gjennom
    tillatte_saker (rettet 2026-09-19).
    """
    from routes import forsering_routes
    from services.forsering_service import ForseringService

    # Sak A-1 i project-a: fristkrav ble godkjent
    a1_opprettet = SakOpprettetEvent(
        sak_id="A-1",
        sakstittel="Hemmelig sak A",
        aktor="te-a",
        aktor_rolle="TE",
        prosjekt_id="project-a",
    ).model_dump(mode="json")
    a1_krav = FristEvent(
        sak_id="A-1",
        aktor="te-a",
        aktor_rolle="TE",
        event_type=EventType.FRIST_KRAV_SENDT,
        data=FristData(krevd_dager=10, begrunnelse="Krav"),
    ).model_dump(mode="json")
    a1_respons = ResponsEvent(
        sak_id="A-1",
        aktor="bh-a",
        aktor_rolle="BH",
        event_type=EventType.RESPONS_FRIST,
        spor=SporType.FRIST,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.GODKJENT,
            godkjent_dager=10,
            begrunnelse="BH godkjenner i project-a",
        ),
    ).model_dump(mode="json")

    # Forsering B-F i project-b refererer til A-1
    bf_opprettet = SakOpprettetEvent(
        sak_id="B-F",
        sakstittel="Forsering B",
        aktor="te-b",
        aktor_rolle="TE",
        prosjekt_id="project-b",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["A-1"]},
    ).model_dump(mode="json")

    store = {"A-1": [a1_opprettet, a1_krav, a1_respons], "B-F": [bf_opprettet]}
    metadata = {
        "A-1": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None),
        "B-F": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
    }

    events = Mock()
    events.get_events.side_effect = lambda sak: (store.get(sak, []), len(store.get(sak, [])))

    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=None,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=None,
    )
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(monkeypatch, _auth(contract=("TE", "team-b")), forsering_routes.forsering_bp)

    response = client.get("/api/forsering/B-F/valider-grunnlag", headers=HEADERS_B)
    assert response.status_code == 200
    body = response.get_json()

    # A-1 hører til project-a og skal ikke evalueres for en leser i project-b
    assert body.get("pavirket_sak_id") != "A-1", (
        f"Lekket saksstatus fra project-a til project-b: {body}"
    )


# =============================================================================
# 2. Kryssprosjektlekkasje i GET /api/forsering/by-relatert/<sak_id>
# =============================================================================


def test_finn_forseringer_for_sak_lekker_forsering_fra_annet_prosjekt(monkeypatch):
    """GET /api/forsering/by-relatert/<sak_id> må ikke returnere forseringssaker

    fra andre prosjekter (utvider RV-07).
    Bruker i project-a spør om forseringer som refererer til sak A-1.
    En forseringssak B-F i project-b refererer til A-1.
    ForseringService skannet tidligere alle saker i repositoriet og returnerte
    B-F med sakstittel og status, uten å sjekke om B-F hører til project-a.
    Regresjonstest for AUT-02 siden kandidatene avgrenses før state leses
    (rettet 2026-09-19).
    """
    from routes import forsering_routes
    from services.forsering_service import ForseringService

    a1 = SakOpprettetEvent(
        sak_id="A-1",
        sakstittel="Sak i prosjekt A",
        aktor="te-a",
        aktor_rolle="TE",
        prosjekt_id="project-a",
    ).model_dump(mode="json")
    bf = SakOpprettetEvent(
        sak_id="B-F",
        sakstittel="Konfidensiell forsering i prosjekt B",
        aktor="te-b",
        aktor_rolle="TE",
        prosjekt_id="project-b",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["A-1"], "dato_varslet": "2026-09-18"},
    ).model_dump(mode="json")

    store = {"A-1": [a1], "B-F": [bf]}
    metadata = {
        "A-1": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None),
        "B-F": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
    }

    events = Mock()
    events.get_events.side_effect = lambda sak: (store.get(sak, []), len(store.get(sak, [])))
    events.list_all_sak_ids.return_value = ["A-1", "B-F"]

    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=None,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=None,
    )
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(monkeypatch, _auth(contract=("TE", "team-a")), forsering_routes.forsering_bp)

    response = client.get("/api/forsering/by-relatert/A-1", headers=HEADERS_A)
    assert response.status_code == 200
    body = response.get_json()

    # Feiler i dag fordi B-F fra project-b returneres til leser i project-a
    assert body["forseringer"] == [], (
        f"Lekket forseringssak fra project-b til project-a: {body['forseringer']}"
    )


# =============================================================================
# 2b. Kryssprosjektlekkasje i GET /api/forsering/<sak_id>/relaterte
# =============================================================================


def test_relaterte_saker_lekker_ikke_topic_fra_annet_prosjekt(monkeypatch):
    """GET /api/forsering/<sak>/relaterte må ikke røpe saker i andre prosjekter.

    Funnet 2026-09-19 ved å søke etter mønsteret bak AUT-01/AUT-02 framfor etter
    fila. Ruta leser relasjoner fra Catenda gjennom BaseSakService, og
    topic_board_id er en global innstilling — ikke forespørselens prosjekt. Flere
    prosjekt_id kan derfor dele ett board. Kontekstruta filtrerte allerede denne
    datakilden gjennom tillatte_saker (RV-07); denne ruta gjorde det ikke.

    Merk at EO-sidens /relaterte aldri var utsatt: EndringsordreService
    overstyrer hent_relaterte_saker med en hendelsesbasert variant.
    """
    from routes import forsering_routes
    from services.forsering_service import ForseringService

    af = SakOpprettetEvent(
        sak_id="A-F",
        sakstittel="Forsering i prosjekt A",
        aktor="te-a",
        aktor_rolle="TE",
        prosjekt_id="project-a",
        sakstype="forsering",
    ).model_dump(mode="json")

    store = {"A-F": [af]}
    metadata = {
        "A-F": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None),
        "B-9": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
    }

    events = Mock()
    events.get_events.side_effect = lambda sak: (
        store.get(sak, []),
        len(store.get(sak, [])),
    )
    # Catenda kjenner relasjonen; den lokale oppslagsveien gir sak_id B-9
    events.find_sak_id_by_catenda_topic.side_effect = lambda guid: (
        "B-9" if guid == "guid-b9" else None
    )

    catenda = Mock()
    catenda.list_related_topics.return_value = [{"related_topic_guid": "guid-b9"}]
    catenda.get_topic_details.return_value = {"title": "Konfidensiell sak i prosjekt B"}

    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=catenda,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=None,
    )
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(
        monkeypatch, _auth(contract=("TE", "team-a")), forsering_routes.forsering_bp
    )

    response = client.get("/api/forsering/A-F/relaterte", headers=HEADERS_A)
    assert response.status_code == 200
    body = response.get_json()

    lekkasje = [
        r
        for r in body.get("relaterte_saker", [])
        if r.get("relatert_sak_id") == "B-9"
        or "prosjekt B" in (r.get("relatert_sak_tittel") or "")
    ]
    assert not lekkasje, f"Lekket sak fra project-b til en leser i project-a: {body}"

# =============================================================================
# 3. Batch-innsending oppdaterer last_event_at for interne notater
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="submit_batch oppdaterer last_event_at ubetinget selv for interne notater",
)
def test_batch_innsending_lekker_internt_notat_i_last_event_at(monkeypatch):
    """POST /api/events/batch oppdaterer last_event_at ubetinget,

    også når batchen kun inneholder et internt notat (utvider RV-09).
    submit_event (linje 531) skjermer last_event_at, men submit_batch (linje 823)
    setter last_event_at=datetime.now(UTC) ubetinget, noe som røper internt
    notat i sakslisten for motparten.
    """
    from routes import event_routes

    sak_opprettet = {
        "event_type": "sak_opprettet",
        "sak_id": "case-1",
        "aktor": "System",
        "aktor_rolle": "TE",
        "tidsstempel": "2026-09-15T08:00:00Z",
        "sakstittel": "Sak 1",
        "prosjekt_id": "project-a",
    }

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="project-a", catenda_topic_id=None
    )
    container.event_repository.get_events.return_value = ([sak_opprettet], 1)
    container.event_repository.append_batch.return_value = 2
    container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = _client(monkeypatch, _auth(contract=("TE", "team-a")), event_routes.events_bp)

    response = client.post(
        "/api/events/batch",
        json={
            "sak_id": "case-1",
            "expected_version": 1,
            "events": [
                {
                    "event_type": "internt_notat",
                    "data": {"tekst": "Konfidensielt internt notat", "spor": "grunnlag"},
                }
            ],
        },
        headers=HEADERS_A,
    )
    assert response.status_code == 201, response.get_data(as_text=True)

    # Feiler i dag fordi submit_batch ubetinget sender last_event_at != None
    assert container.metadata_repository.update_cache.called
    call_kwargs = container.metadata_repository.update_cache.call_args.kwargs
    assert call_kwargs.get("last_event_at") is None, (
        f"last_event_at ble satt ved batch med internt notat: {call_kwargs.get('last_event_at')}"
    )


# =============================================================================
# 4. SakMetadataRepository (CSV) mangler list_by_sakstype (500-krasj)
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SakMetadataRepository (CSV) mangler list_by_sakstype; /api/cases?sakstype= gir 500",
)
def test_sak_metadata_csv_repo_mangler_list_by_sakstype(tmp_path):
    """GET /api/cases?sakstype=standard krasjer med AttributeError på SakMetadataRepository.

    event_routes.py:992 kaller _get_metadata_repo().list_by_sakstype(sakstype).
    SakMetadataRepository (CSV/fil-implementasjonen) mangler denne metoden helt.
    """
    from repositories.sak_metadata_repository import SakMetadataRepository

    csv_path = tmp_path / "metadata.csv"
    repo = SakMetadataRepository(csv_path=csv_path)

    # Feiler i dag fordi metoden ikke finnes på CSV-implementasjonen
    assert hasattr(repo, "list_by_sakstype"), (
        "SakMetadataRepository mangler list_by_sakstype; /api/cases?sakstype=... krasjer med 500"
    )


# =============================================================================
# 4. Prosjektgrensen for saksoversikten, i begge lag
# =============================================================================


def test_cases_uten_prosjektheader_lister_ikke_andre_leietakere(monkeypatch, tmp_path):
    """GET /api/cases skal ikke røpe andre leietakeres saker uten prosjekt.

    To lag prøves, fordi de svarer på hvert sitt spørsmål:

    1. **Ruta.** `/api/cases` har `require_project_access`, som avviser med 403
       når prosjektet er ukjent. Det er den faktiske grensen.
    2. **Lageret.** CSV-repoet hoppet over prosjektfilteret når `pid` var tomt,
       og returnerte da alle leietakeres saker. Rettet 2026-09-20. Dette er
       dybdeforsvar — ruta nådde aldri hit uten prosjekt — men de to
       lagerimplementasjonene ville ellers oppført seg ulikt på samme kall,
       og et lager skal ikke gi alt fordi en kaller glemte filteret.
    """
    from datetime import UTC, datetime

    from models.sak_metadata import SakMetadata
    from repositories.sak_metadata_repository import SakMetadataRepository
    from routes import event_routes

    repo = SakMetadataRepository(csv_path=tmp_path / "metadata.csv")
    for sak_id, prosjekt in (("A-1", "project-a"), ("B-1", "project-b")):
        repo.create(
            SakMetadata(
                sak_id=sak_id,
                prosjekt_id=prosjekt,
                catenda_topic_id=None,
                catenda_project_id=None,
                created_at=datetime.now(UTC),
                created_by="seed",
                cached_title=f"Sak i {prosjekt}",
            )
        )

    # Lag 2: lageret gir ingenting uten prosjekt, og bare eget med.
    assert repo.list_all() == []
    assert [m.sak_id for m in repo.list_all(prosjekt_id="project-a")] == ["A-1"]

    monkeypatch.setattr(event_routes, "_get_metadata_repo", lambda: repo)
    events = Mock()
    events.get_events.return_value = ([], 0)
    monkeypatch.setattr(event_routes, "_get_event_repo", lambda: events)

    client = _client(
        monkeypatch, _auth(contract=("TE", "team-a")), event_routes.events_bp
    )

    # Lag 1: uten prosjekt avvises forespørselen, den svarer ikke tomt.
    uten_header = client.get("/api/cases", headers={"X-CSRF-Token": "csrf"})
    assert uten_header.status_code == 403, (
        "Uten X-Project-ID skal ruta avvise, ikke svare. Fikk "
        f"HTTP {uten_header.status_code}."
    )

    # Med prosjekt: bare det prosjektets sak.
    med_header = client.get("/api/cases", headers=HEADERS_A)
    assert med_header.status_code == 200
    ider = [s.get("sak_id") for s in med_header.get_json().get("cases", [])]
    assert ider == ["A-1"], f"Forventet kun A-1, fikk {ider}"
