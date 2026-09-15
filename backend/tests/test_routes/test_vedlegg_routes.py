"""Vedleggsruter: mellomlagring, nedlasting, sletting og levering.

Vedlegget lastes ikke opp til Catenda når brukeren velger filen. Det ville
gjort dokumentet synlig for motparten før avsenderen hadde bestemt seg for å
sende noe. Bytene ligger hos oss til hendelsen som viser til vedlegget er
lagret; først da sendes det.

Tilgangskontrollen er vår egen: backend snakker med Catenda gjennom appens
tjenestekonto, så bibliotekets team-rettigheter begrenser ikke hva appen kan
lese.
"""

import io
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import vedlegg_routes
from services.vedlegg_registry import DELIVERED, STAGED, VedleggRegistry

CATENDA_ID = "3fa85f6457174562b3fc2c963f66afa6"
INNHOLD = b"%PDF-1.7 testinnhold"


@pytest.fixture
def api(monkeypatch, tmp_path):
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(vedlegg_routes.vedlegg_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "te@example.com", "name": "TE Bruker"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "TE"
    auth.contract_membership.return_value = ("TE", "team-te")
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="topic"
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    service = Mock()
    service.upload_document.return_value = {"id": CATENDA_ID}
    service.download_document.return_value = (INNHOLD, "fra-catenda.pdf")
    ctx = SimpleNamespace(
        service=service, project_id="cat-p", folder_id="mappe-1", library_id="lib-1"
    )
    monkeypatch.setattr(vedlegg_routes, "_catenda_context", lambda sak_id: ctx)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, service=service, auth=auth)


def _last_opp(api, filnavn="rapport.pdf", innhold=INNHOLD, sak="S1"):
    return api.client.post(
        f"/api/cases/{sak}/vedlegg",
        data={"file": (io.BytesIO(innhold), filnavn)},
        content_type="multipart/form-data",
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


def _id(response) -> str:
    return response.get_json()["id"]


def _tomme_hendelser(monkeypatch):
    from routes import event_routes

    repo = Mock()
    repo.get_events.return_value = ([], 0)
    monkeypatch.setattr(event_routes, "_get_event_repo", lambda: repo)
    return repo


# ============ MELLOMLAGRING ============


def test_opplasting_naar_ikke_catenda(api):
    """Kjernen i utsatt opplasting: filen forlater ikke appen ennå."""
    response = _last_opp(api)

    assert response.status_code == 201, response.get_data(as_text=True)
    assert response.get_json()["status"] == STAGED
    api.service.upload_document.assert_not_called()


def test_mellomlagret_vedlegg_kan_lastes_ned_uten_catenda(api):
    """Den som lastet opp må kunne kontrollere filen før den sendes."""
    vedlegg_id = _id(_last_opp(api))

    response = api.client.get(
        f"/api/cases/S1/vedlegg/{vedlegg_id}", headers={"X-Project-ID": "p"}
    )

    assert response.status_code == 200
    assert response.data == INNHOLD
    assert 'filename="rapport.pdf"' in response.headers["Content-Disposition"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    api.service.download_document.assert_not_called()


@pytest.mark.parametrize(
    "filnavn,innhold,status",
    [
        ("", INNHOLD, 400),
        ("..", INNHOLD, 400),
        ("tom.pdf", b"", 400),
        ("stor.pdf", b"x" * (15 * 1024 * 1024 + 1), 413),
    ],
)
def test_ugyldige_opplastinger_avvises(api, filnavn, innhold, status):
    assert _last_opp(api, filnavn, innhold).status_code == status


def test_stier_i_filnavn_saneres(api):
    """Et filnavn er et navn, ikke en sti."""
    assert _id(_last_opp(api, "../../etc/passwd"))
    liste = api.client.get("/api/cases/S1/vedlegg", headers={"X-Project-ID": "p"})
    assert "/" not in liste.get_json()["vedlegg"][0]["navn"]


# ============ INNHOLDSKONTROLL ============
# Dette er ikke virusskanning — se lib/vedlegg_innhold.py.


@pytest.mark.parametrize(
    "filnavn,innhold,hvorfor",
    [
        ("rapport.pdf", b"MZ\x90\x00 forkledd exe", "Windows-kjørbar som PDF"),
        ("notat.pdf", b"\x7fELF forkledd", "Linux-kjørbar som PDF"),
        ("kjor.pdf", b"#!/bin/sh\nrm -rf /", "skript som PDF"),
        ("rapport.pdf", b"dette er ikke en pdf", "feil innhold for endelsen"),
        ("bilde.png", b"%PDF-1.7", "PDF utgitt for PNG"),
    ],
)
def test_forkledd_innhold_avvises(api, filnavn, innhold, hvorfor):
    assert _last_opp(api, filnavn, innhold).status_code == 400, hvorfor


@pytest.mark.parametrize(
    "filnavn,innhold",
    [
        ("rapport.pdf", b"%PDF-1.7 innhold"),
        ("bilde.png", b"\x89PNG\r\n\x1a\n data"),
        ("ark.xlsx", b"PK\x03\x04 zip"),
        # Byggfag har mange legitime formater vi ikke kan liste uttømmende.
        ("modell.ifc", b"ISO-10303-21;"),
        ("tegning.dwg", b"AC1027 vilkarlig"),
    ],
)
def test_legitime_formater_slipper_gjennom(api, filnavn, innhold):
    assert _last_opp(api, filnavn, innhold).status_code == 201


# ============ SAKS- OG PROSJEKTGRENSER ============


def test_vedlegg_fra_annen_sak_gir_404(api):
    vedlegg_id = _id(_last_opp(api, sak="S1"))

    response = api.client.get(
        f"/api/cases/S2/vedlegg/{vedlegg_id}", headers={"X-Project-ID": "p"}
    )

    assert response.status_code == 404


def test_listen_er_saksavgrenset(api):
    vedlegg_id = _id(_last_opp(api, sak="S1"))

    egen = api.client.get("/api/cases/S1/vedlegg", headers={"X-Project-ID": "p"})
    annen = api.client.get("/api/cases/S2/vedlegg", headers={"X-Project-ID": "p"})

    assert [v["id"] for v in egen.get_json()["vedlegg"]] == [vedlegg_id]
    assert annen.get_json()["vedlegg"] == []


def test_registeret_skiller_prosjekter(tmp_path):
    registry = VedleggRegistry(str(tmp_path / "r.sqlite"))
    v = registry.stage("p1", "S1", "a.pdf", b"%PDF-", "Ola", "TE")

    assert registry.belongs_to_case("p1", "S1", v["id"])
    assert not registry.belongs_to_case("p2", "S1", v["id"])


# ============ SLETTING ============


def _slett(api, vedlegg_id, sak="S1"):
    return api.client.delete(
        f"/api/cases/{sak}/vedlegg/{vedlegg_id}",
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


def test_mellomlagret_vedlegg_kan_fjernes_sporlost(api, monkeypatch):
    """Hele poenget med utsatt opplasting: sletting uten at noe er delt."""
    _tomme_hendelser(monkeypatch)
    vedlegg_id = _id(_last_opp(api))

    assert _slett(api, vedlegg_id).status_code == 200
    # Ingenting ble noen gang sendt, så det er ingenting å rydde i Catenda.
    api.service.upload_document.assert_not_called()
    api.service.delete_document.assert_not_called()
    assert (
        api.client.get(
            f"/api/cases/S1/vedlegg/{vedlegg_id}", headers={"X-Project-ID": "p"}
        ).status_code
        == 404
    )


def test_levert_vedlegg_kan_ikke_fjernes(api, monkeypatch, tmp_path):
    _tomme_hendelser(monkeypatch)
    vedlegg_id = _id(_last_opp(api))
    VedleggRegistry().mark_delivered("p", "S1", vedlegg_id, CATENDA_ID)

    response = _slett(api, vedlegg_id)

    assert response.status_code == 409
    assert response.get_json()["error"] == "VEDLEGG_SENDT"


def test_referert_vedlegg_kan_ikke_fjernes_selv_om_levering_feilet(api, monkeypatch):
    """Feiler opplastingen etter commit, står vedlegget som mellomlagret.

    Saken viser likevel til det, så det må ikke kunne slettes.
    """
    vedlegg_id = _id(_last_opp(api))

    from routes import event_routes

    hendelse = {
        "event_type": "grunnlag_opprettet",
        "sak_id": "S1",
        "aktor": "TE",
        "aktor_rolle": "TE",
        "tidsstempel": "2026-09-15T08:00:00Z",
        "data": {
            "tittel": "K",
            "hovedkategori": "ENDRING",
            "underkategori": "IRREG",
            "beskrivelse": "B",
            "dato_oppdaget": "2026-09-13",
            "vedlegg_ids": [vedlegg_id],
        },
    }
    repo = Mock()
    repo.get_events.return_value = ([hendelse], 1)
    monkeypatch.setattr(event_routes, "_get_event_repo", lambda: repo)

    assert _slett(api, vedlegg_id).status_code == 409


def test_motparten_kan_ikke_slette(api, monkeypatch):
    """BH skal ikke kunne rydde i TEs dokumentasjon."""
    _tomme_hendelser(monkeypatch)
    vedlegg_id = _id(_last_opp(api))
    api.auth.contract_role.return_value = "BH"
    api.auth.contract_membership.return_value = ("BH", "team-bh")

    assert _slett(api, vedlegg_id).status_code == 403


def test_uleselig_hendelsesstrom_nekter_sletting(api, monkeypatch):
    """Kan vi ikke avgjøre om vedlegget er i bruk, sletter vi ikke."""
    vedlegg_id = _id(_last_opp(api))

    from routes import event_routes

    repo = Mock()
    repo.get_events.side_effect = RuntimeError("lager nede")
    monkeypatch.setattr(event_routes, "_get_event_repo", lambda: repo)

    assert _slett(api, vedlegg_id).status_code == 503


# ============ LEVERING VED INNSENDING ============


def _hendelse_med(vedlegg_ids):
    return SimpleNamespace(data=SimpleNamespace(vedlegg_ids=vedlegg_ids))


def test_levering_laster_opp_og_frigir_innholdet(api):
    vedlegg_id = _id(_last_opp(api))

    vedlegg_routes.lever_vedlegg_for_hendelse("p", "S1", _hendelse_med([vedlegg_id]))

    api.service.upload_document.assert_called_once()
    registry = VedleggRegistry()
    oppforing = registry.get("p", "S1", vedlegg_id)
    assert oppforing["status"] == DELIVERED
    assert oppforing["catenda_item_id"] == CATENDA_ID
    # Catenda holder dokumentet nå; vi beholder ingen kopi.
    assert registry.content("p", "S1", vedlegg_id) is None


def test_levert_vedlegg_hentes_fra_catenda(api):
    vedlegg_id = _id(_last_opp(api))
    vedlegg_routes.lever_vedlegg_for_hendelse("p", "S1", _hendelse_med([vedlegg_id]))

    response = api.client.get(
        f"/api/cases/S1/vedlegg/{vedlegg_id}", headers={"X-Project-ID": "p"}
    )

    assert response.status_code == 200
    assert response.data == INNHOLD
    api.service.download_document.assert_called_once()
    # Navnet er vårt registrerte, ikke Catendas.
    assert 'filename="rapport.pdf"' in response.headers["Content-Disposition"]


def test_vedlegg_som_ikke_refereres_blir_ikke_levert(api):
    """Et mellomlagret vedlegg hendelsen ikke viser til, sendes ikke."""
    vedlegg_id = _id(_last_opp(api))

    vedlegg_routes.lever_vedlegg_for_hendelse("p", "S1", _hendelse_med([]))

    api.service.upload_document.assert_not_called()
    assert VedleggRegistry().get("p", "S1", vedlegg_id)["status"] == STAGED


def test_feilet_levering_beholder_mellomlagringen(api):
    """Hendelsen er committet; vedlegget må kunne leveres på nytt senere."""
    vedlegg_id = _id(_last_opp(api))
    api.service.upload_document.side_effect = RuntimeError("Catenda nede")

    vedlegg_routes.lever_vedlegg_for_hendelse("p", "S1", _hendelse_med([vedlegg_id]))

    registry = VedleggRegistry()
    assert registry.get("p", "S1", vedlegg_id)["status"] == STAGED
    assert registry.content("p", "S1", vedlegg_id) == INNHOLD


def test_levering_rydder_tempfilen(api, monkeypatch):
    """Kontraktsinnhold skal ikke bli liggende i /tmp (jf. PDF-03)."""
    vedlegg_id = _id(_last_opp(api))
    sett = {}

    def fanger(project_id, file_path, filename=None, folder_id=None):
        sett["sti"] = file_path
        raise RuntimeError("feiler etter at filen er skrevet")

    api.service.upload_document.side_effect = fanger
    vedlegg_routes.lever_vedlegg_for_hendelse("p", "S1", _hendelse_med([vedlegg_id]))

    import os

    assert not os.path.exists(sett["sti"])
