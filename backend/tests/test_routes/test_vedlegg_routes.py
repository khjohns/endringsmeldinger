"""Vedleggsruter: opplasting, liste og nedlasting.

Tilgangskontrollen er vår egen. Backend snakker med Catenda gjennom appens
tjenestekonto, så bibliotekets team-rettigheter begrenser ikke hva appen kan
lese — hver forespørsel må autoriseres mot saken her.
"""

import io
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import vedlegg_routes
from services.vedlegg_registry import VedleggRegistry

VEDLEGG_ID = "3fa85f6457174562b3fc2c963f66afa6"
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
    service.upload_document.return_value = {"id": VEDLEGG_ID}
    service.download_document.return_value = (INNHOLD, "fra-catenda.pdf")
    ctx = SimpleNamespace(
        service=service, project_id="cat-p", folder_id="mappe-1", library_id="lib-1"
    )
    monkeypatch.setattr(vedlegg_routes, "_catenda_context", lambda sak_id: ctx)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, service=service, tmp_path=tmp_path)


def _last_opp(api, filnavn="rapport.pdf", innhold=INNHOLD, sak="S1"):
    return api.client.post(
        f"/api/cases/{sak}/vedlegg",
        data={"file": (io.BytesIO(innhold), filnavn)},
        content_type="multipart/form-data",
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


def test_opplasting_lagrer_og_registrerer(api):
    response = _last_opp(api)

    assert response.status_code == 201, response.get_data(as_text=True)
    body = response.get_json()
    assert body["id"] == VEDLEGG_ID
    assert body["navn"] == "rapport.pdf"
    assert body["storrelse"] == len(INNHOLD)
    api.service.upload_document.assert_called_once()


def test_opplastet_fil_ryddes_fra_disk(api, monkeypatch):
    """Kontraktsinnhold skal ikke bli liggende i /tmp (jf. PDF-03)."""
    sett = {}

    def fanger(project_id, file_path, filename=None, folder_id=None):
        sett["sti"] = file_path
        return {"id": VEDLEGG_ID}

    api.service.upload_document.side_effect = fanger
    assert _last_opp(api).status_code == 201

    import os

    assert not os.path.exists(sett["sti"])


def test_opplasting_rydder_ogsa_ved_feil(api):
    sett = {}

    def feiler(project_id, file_path, filename=None, folder_id=None):
        sett["sti"] = file_path
        raise RuntimeError("Catenda nede")

    api.service.upload_document.side_effect = feiler
    _last_opp(api)

    import os

    assert not os.path.exists(sett["sti"])


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
    api.service.upload_document.assert_not_called()


def test_stier_i_filnavn_saneres(api):
    """Et filnavn er et navn, ikke en sti."""
    assert _last_opp(api, "../../etc/passwd").status_code == 201
    assert "/" not in api.service.upload_document.call_args.kwargs["filename"]


def test_nedlasting_av_eget_vedlegg(api):
    _last_opp(api)

    response = api.client.get(
        f"/api/cases/S1/vedlegg/{VEDLEGG_ID}", headers={"X-Project-ID": "p"}
    )

    assert response.status_code == 200
    assert response.data == INNHOLD
    assert 'filename="rapport.pdf"' in response.headers["Content-Disposition"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_vedlegg_fra_annen_sak_gir_404(api):
    """Vedlegget hører til én sak. En annen sak i samme prosjekt får det ikke."""
    _last_opp(api, sak="S1")

    response = api.client.get(
        f"/api/cases/S2/vedlegg/{VEDLEGG_ID}", headers={"X-Project-ID": "p"}
    )

    assert response.status_code == 404
    api.service.download_document.assert_not_called()


def test_ukjent_vedlegg_gir_404_uten_catenda_kall(api):
    response = api.client.get(
        "/api/cases/S1/vedlegg/ukjent-id", headers={"X-Project-ID": "p"}
    )

    assert response.status_code == 404
    api.service.download_document.assert_not_called()


def test_listen_er_saksavgrenset(api):
    _last_opp(api, sak="S1")

    egen = api.client.get("/api/cases/S1/vedlegg", headers={"X-Project-ID": "p"})
    annen = api.client.get("/api/cases/S2/vedlegg", headers={"X-Project-ID": "p"})

    assert [v["id"] for v in egen.get_json()["vedlegg"]] == [VEDLEGG_ID]
    assert annen.get_json()["vedlegg"] == []


def test_registeret_skiller_prosjekter(tmp_path):
    """Samme sak-ID i to prosjekter skal ikke dele vedlegg."""
    registry = VedleggRegistry(str(tmp_path / "r.sqlite"))
    registry.record("p1", "S1", VEDLEGG_ID, "a.pdf", 10, "Ola", "TE")

    assert registry.belongs_to_case("p1", "S1", VEDLEGG_ID)
    assert not registry.belongs_to_case("p2", "S1", VEDLEGG_ID)
