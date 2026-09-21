"""MS-05: notatet ligger utenfor journalen, og versjonen teller bare journalen.

Skjermingen dekkes av `test_internt_notat_confidentiality.py`. Her står de tre
tingene flyttingen skulle gi, og som ingen test fanget før:

1. Notatet skrives ikke til den append-only journalen.
2. Versjonstelleren — den optimistiske låsen på kontraktshandlinger — står
   stille, så et notat ikke lenger tvinger motparten til å hente saken på nytt.
3. Notatet kan slettes. Det er hele hensikten med at det ligger for seg.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.notat import Notat
from repositories.notat_repository import JsonFileNotatRepository
from routes import event_routes
from services.timeline_service import TimelineService

TE_TEAM = "22222222222222222222222222222222"
ANNET_TEAM = "33333333333333333333333333333333"
TEKST = "Internt: vurder om vi bør trekke kravet."

SAK_OPPRETTET = {
    "event_type": "sak_opprettet",
    "sak_id": "case",
    "aktor_id": "system",
    "aktor_rolle": "TE",
    "tidsstempel": "2026-09-15T08:00:00Z",
    "sakstittel": "Testsak",
    "catenda_topic_id": "topic",
}


@pytest.fixture
def api(monkeypatch, tmp_path):
    """Innsendings- og leseruter med ekte notatlager; journalen er en dobbel."""
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "te@example.com", "name": "TE Bruker"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "TE"
    auth.contract_membership.return_value = ("TE", TE_TEAM)
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="topic"
    )
    container.event_repository.get_events.return_value = ([SAK_OPPRETTET], 1)
    container.event_repository.append.return_value = 2
    container.timeline_service = TimelineService()
    notat_lager = JsonFileNotatRepository(str(tmp_path / "notater"))
    container.notat_repository = notat_lager
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, container=container, notat_lager=notat_lager)


def _send_notat(api, sak_id="case", expected_version=1, prosjekt="p"):
    return api.client.post(
        "/api/events",
        json={
            "sak_id": sak_id,
            "expected_version": expected_version,
            "event": {
                "event_type": "internt_notat",
                "data": {"tekst": TEKST, "spor": "grunnlag"},
            },
        },
        headers={"X-Project-ID": prosjekt, "X-CSRF-Token": "csrf"},
    )


def test_notatet_skrives_ikke_til_journalen(api):
    """Journalen er append-only. Et notat som havner der, kan aldri slettes."""
    assert _send_notat(api).status_code == 201

    api.container.event_repository.append.assert_not_called()
    api.container.event_repository.append_batch.assert_not_called()

    lagret = api.notat_lager.for_sak("case", "p")
    assert [n.tekst for n in lagret] == [TEKST]


def test_versjonen_staar_stille(api):
    """Notatet er ingen kontraktshandling og skal ikke flytte den optimistiske låsen.

    Før MS-05 økte notatet sakens versjon. Motparten fikk da versjonskonflikt på
    en innsending som ikke kolliderte med noe, av et notat vedkommende ikke har
    lov til å se.
    """
    _, versjon_for = api.container.event_repository.get_events("case")

    svar = _send_notat(api)

    assert svar.status_code == 201
    assert svar.get_json()["new_version"] == versjon_for


def test_notatet_hindrer_ikke_neste_innsending(api):
    """Samme expected_version skal fortsatt gjelde etter at et notat er skrevet."""
    assert _send_notat(api).status_code == 201

    svar = api.client.post(
        "/api/events",
        json={
            "sak_id": "case",
            "expected_version": 1,
            "event": {
                "event_type": "grunnlag_opprettet",
                "data": {
                    "tittel": "Krav",
                    "hovedkategori": "ENDRING",
                    "underkategori": "IRREG",
                    "beskrivelse": "Beskrivelse",
                    "dato_oppdaget": "2026-09-13",
                },
            },
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert svar.status_code == 201, svar.get_data(as_text=True)


def test_notat_mot_ukjent_sak_avvises(api):
    """Uten saken finnes det ingen fremmednøkkel å henge notatet på."""
    api.container.event_repository.get_events.return_value = ([], 0)

    svar = _send_notat(api, sak_id="finnes-ikke", expected_version=0)

    assert svar.status_code == 404, svar.get_data(as_text=True)
    assert api.notat_lager.for_sak("finnes-ikke", "p") == []


def test_notatet_kommer_i_tidsrekkefolge_i_tidslinjen(api):
    """Tidslinjen fletter to kilder og må sortere dem som én strøm."""
    assert _send_notat(api).status_code == 201

    svar = api.client.get("/api/cases/case/timeline", headers={"X-Project-ID": "p"})

    assert svar.status_code == 200, svar.get_data(as_text=True)
    typer = [hendelse["type"] for hendelse in svar.get_json()["events"]]
    assert typer == ["no.oslo.koe.sak_opprettet", "no.oslo.koe.internt_notat"]


def test_forfatteren_kan_slette_sitt_notat(api):
    """Handlingen journalen ikke har, og som er hele grunnen til flyttingen."""
    notat_id = _send_notat(api).get_json()["event_id"]

    svar = api.client.delete(
        f"/api/cases/case/notater/{notat_id}",
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert svar.status_code == 200, svar.get_data(as_text=True)
    assert api.notat_lager.for_sak("case", "p") == []
    api.container.event_repository.append.assert_not_called()


def test_en_annen_forfatter_kan_ikke_slette(api):
    """Teamet alene ville latt en kollega fjerne en annens vurdering."""
    api.notat_lager.lagre(
        Notat(
            notat_id="11111111-1111-1111-1111-111111111111",
            sak_id="case",
            prosjekt_id="p",
            aktor_id="en-annen",
            aktor_rolle="TE",
            aktor_team_id=TE_TEAM,
            tekst=TEKST,
        )
    )

    svar = api.client.delete(
        "/api/cases/case/notater/11111111-1111-1111-1111-111111111111",
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert svar.status_code == 404, svar.get_data(as_text=True)
    assert len(api.notat_lager.for_sak("case", "p")) == 1


def test_notat_i_annet_prosjekt_kan_ikke_slettes(api):
    """Prosjektgrensen håndheves ved oppslaget, ikke bare ved lesingen."""
    api.notat_lager.lagre(
        Notat(
            notat_id="22222222-2222-2222-2222-222222222222",
            sak_id="case",
            prosjekt_id="annet-prosjekt",
            aktor_id="u",
            aktor_rolle="TE",
            aktor_team_id=TE_TEAM,
            tekst=TEKST,
        )
    )

    svar = api.client.delete(
        "/api/cases/case/notater/22222222-2222-2222-2222-222222222222",
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )

    assert svar.status_code == 404, svar.get_data(as_text=True)
    assert len(api.notat_lager.for_sak("case", "annet-prosjekt")) == 1
