"""Løp b i F0b: saksmetadata, relasjoner og BIM over direkte tilkobling, mot ekte
PostgreSQL.

Oppdraget står i docs/prompt-f0b-fase2-repositorier-2026-09-24.md, og hvilke
regler som er prøvd røde, i docs/gjennomforing-f0b-lop-b-2026-09-24.md.
"""

from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from flask import Flask, g

from lib.db import ConflictError, NotFoundError, PermanentError, ValidationError
from models.bim_link import BimLinkCreate
from models.sak_metadata import SakMetadata
from repositories.postgres.bim import PostgresBimLinkRepository
from repositories.postgres.relasjon import PostgresRelationRepository
from repositories.postgres.sak_metadata import PostgresSakMetadataRepository

pytestmark = pytest.mark.database

PROSJEKT = "p-lop-b"
ANNET_PROSJEKT = "p-lop-b-annet"
T0 = datetime(2026, 9, 24, 8, 0, tzinfo=UTC)
UTEN_PROSJEKT = "uten autorisert prosjekt"

_app = Flask(__name__)


@contextmanager
def autorisert(prosjekt_id):
    with _app.app_context():
        g.project_id = prosjekt_id
        yield


def _sak(sak_id, prosjekt_id=PROSJEKT, **felt) -> SakMetadata:
    return SakMetadata(
        sak_id=sak_id,
        prosjekt_id=prosjekt_id,
        created_at=felt.pop("created_at", T0),
        created_by=felt.pop("created_by", "test"),
        **felt,
    )


def _sql(url, sporring, parametre=()):
    with psycopg.connect(url, autocommit=True) as c:
        return c.execute(sporring, parametre).fetchall()


@pytest.fixture
def metadata(skrivbar_base):
    return PostgresSakMetadataRepository(skrivbar_base)


@pytest.fixture
def relasjoner(skrivbar_base):
    return PostgresRelationRepository(skrivbar_base)


@pytest.fixture
def bim(skrivbar_base):
    return PostgresBimLinkRepository(skrivbar_base)


@pytest.fixture
def saker(metadata):
    for sak in (
        _sak("KOE-1"),
        _sak("KOE-2"),
        _sak("FORS-1", sakstype="forsering"),
        _sak("FREMMED-1", ANNET_PROSJEKT),
        _sak("FREMMED-FORS", ANNET_PROSJEKT, sakstype="forsering"),
    ):
        metadata.create(sak)


# ---------------------------------------------------------------------------
# Saksmetadata
# ---------------------------------------------------------------------------


def test_rundturen_bevarer_alle_feltene(metadata):
    sak = _sak(
        "SAK-'; DROP TABLE sak_metadata; --",
        catenda_topic_id="topic-1",
        catenda_board_id="board-1",
        catenda_project_id="cat-1",
        sakstype="endringsordre",
        cached_title="Tittel",
        cached_status="UNDER_BEHANDLING",
        last_event_at=T0 + timedelta(hours=1),
        cached_sum_krevd=1234.5,
        cached_sum_godkjent=1000.25,
        cached_dager_krevd=10,
        cached_dager_godkjent=7,
        cached_hovedkategori="ENDRING",
        cached_underkategori="IRREG",
        cached_forsering_paalopt=10.5,
        cached_forsering_maks=99.75,
    )
    metadata.create(sak)

    assert metadata.get(sak.sak_id) == sak


def test_tidspunkt_uten_sone_lagres_som_utc(metadata):
    metadata.create(_sak("SAK-1", created_at=datetime(2026, 9, 24, 8, 0)))

    assert metadata.get("SAK-1").created_at == T0


def test_ukjent_sak_gir_none(metadata):
    assert metadata.get("finnes-ikke") is None
    with autorisert(PROSJEKT):
        assert metadata.get_by_topic_id("finnes-ikke") is None


def test_samme_sak_to_ganger_er_en_permanent_konflikt(metadata):
    metadata.create(_sak("SAK-1"))

    with pytest.raises(ConflictError):
        metadata.create(_sak("SAK-1", ANNET_PROSJEKT))
    assert metadata.get("SAK-1").prosjekt_id == PROSJEKT


def test_sak_uten_prosjekt_avvises_av_basen(metadata, testbase_url):
    with pytest.raises(ValidationError):
        metadata.create(_sak("SAK-1", None))
    assert _sql(testbase_url, "SELECT count(*) FROM sak_metadata") == [(0,)]


def test_topic_slaas_opp_bare_i_det_autoriserte_prosjektet(metadata, saker):
    metadata.create(_sak("SAK-T", catenda_topic_id="topic-x"))
    metadata.create(_sak("FREMMED-T", ANNET_PROSJEKT, catenda_topic_id="topic-y"))

    with autorisert(PROSJEKT):
        assert metadata.get_by_topic_id("topic-x").sak_id == "SAK-T"
        assert metadata.get_by_topic_id("topic-y") is None
    with autorisert(ANNET_PROSJEKT):
        assert metadata.get_by_topic_id("topic-y").sak_id == "FREMMED-T"
    assert metadata.get_by_topic_id("topic-x") is None
    with autorisert(""):
        assert metadata.get_by_topic_id("topic-x") is None


def test_catenda_mapping_skrives_bare_i_sakens_prosjekt(metadata, saker):
    metadata.set_catenda_mapping("KOE-1", PROSJEKT, "t", "b", "c")
    oppdatert = metadata.get("KOE-1")
    assert (
        oppdatert.catenda_topic_id,
        oppdatert.catenda_board_id,
        oppdatert.catenda_project_id,
    ) == ("t", "b", "c")

    with pytest.raises(NotFoundError):
        metadata.set_catenda_mapping("FREMMED-1", PROSJEKT, "t", "b", "c")
    assert metadata.get("FREMMED-1").catenda_topic_id is None


def test_cachen_oppdaterer_bare_oppgitte_felt(metadata, saker):
    metadata.update_cache(
        "KOE-1",
        cached_title="Første",
        cached_status="SENDT",
        cached_sum_krevd=500.0,
        cached_dager_krevd=3,
    )
    metadata.update_cache(
        "KOE-1",
        cached_status="GODKJENT",
        last_event_at=datetime(2026, 9, 24, 9, 0),
        cached_forsering_maks=12.5,
    )

    sak = metadata.get("KOE-1")
    assert sak.cached_title == "Første"
    assert sak.cached_status == "GODKJENT"
    assert sak.cached_sum_krevd == 500.0
    assert sak.cached_dager_krevd == 3
    assert sak.cached_forsering_maks == 12.5
    assert sak.last_event_at == T0 + timedelta(hours=1)
    assert metadata.get("KOE-2").cached_status is None


def test_cache_for_ukjent_sak_gjor_ingenting(metadata, testbase_url):
    metadata.update_cache("finnes-ikke", cached_title="x")
    metadata.update_cache("finnes-ikke")

    assert _sql(testbase_url, "SELECT count(*) FROM sak_metadata") == [(0,)]


def test_listen_er_avgrenset_til_prosjektet(metadata, saker):
    metadata.update_cache("KOE-2", last_event_at=T0 + timedelta(days=2))
    metadata.update_cache("KOE-1", last_event_at=T0 + timedelta(days=1))

    assert [s.sak_id for s in metadata.list_all(PROSJEKT)] == [
        "KOE-2",
        "KOE-1",
        "FORS-1",
    ]
    with autorisert(ANNET_PROSJEKT):
        assert {s.sak_id for s in metadata.list_all()} == {
            "FREMMED-1",
            "FREMMED-FORS",
        }


def test_listen_uten_prosjekt_er_tom(metadata, saker):
    assert metadata.list_all() == []
    with autorisert(None):
        assert metadata.list_all() == []
    with autorisert(""):
        assert metadata.list_all() == []


def test_alle_prosjekter_maa_be_om_det_eksplisitt(metadata, saker):
    assert len(metadata.list_all(alle_prosjekter=True)) == 5
    with autorisert(PROSJEKT):
        assert len(metadata.list_all(alle_prosjekter=True)) == 3


def test_sakstype_er_avgrenset_til_prosjektet(metadata, saker):
    with autorisert(PROSJEKT):
        assert [s.sak_id for s in metadata.list_by_sakstype("forsering")] == ["FORS-1"]
    assert [
        s.sak_id for s in metadata.list_by_sakstype("forsering", ANNET_PROSJEKT)
    ] == ["FREMMED-FORS"]
    assert metadata.list_by_sakstype("forsering") == []


def test_sletting_gir_svar_om_noe_ble_slettet(metadata, saker):
    assert metadata.delete("KOE-1") is True
    assert metadata.get("KOE-1") is None
    assert metadata.delete("KOE-1") is False


def test_probe_svarer(metadata):
    metadata.probe()


# ---------------------------------------------------------------------------
# Relasjoner
# ---------------------------------------------------------------------------


def _relasjoner(url):
    return _sql(
        url,
        "SELECT source_sak_id, target_sak_id, relation_type, prosjekt_id"
        " FROM sak_relations ORDER BY 1, 2, 3",
    )


def test_relasjonen_stemples_med_det_autoriserte_prosjektet(relasjoner, testbase_url):
    with autorisert(PROSJEKT):
        assert (
            relasjoner.add_relations_batch("FORS-1", ["KOE-1", "KOE-2"], "forsering")
            == 2
        )
        assert relasjoner.add_relation("EO-1", "KOE-1", "endringsordre") is True
        assert relasjoner.add_relations_batch("FORS-1", [], "forsering") == 0

    assert _relasjoner(testbase_url) == [
        ("EO-1", "KOE-1", "endringsordre", PROSJEKT),
        ("FORS-1", "KOE-1", "forsering", PROSJEKT),
        ("FORS-1", "KOE-2", "forsering", PROSJEKT),
    ]


@pytest.mark.parametrize("prosjekt", [None, ""])
def test_skriving_uten_autorisert_prosjekt_avvises(relasjoner, testbase_url, prosjekt):
    with autorisert(prosjekt):
        with pytest.raises(PermanentError, match=UTEN_PROSJEKT):
            relasjoner.add_relation("FORS-1", "KOE-1", "forsering")
        with pytest.raises(PermanentError, match=UTEN_PROSJEKT):
            relasjoner.add_relations_batch("FORS-1", ["KOE-1"], "forsering")
        with pytest.raises(PermanentError, match=UTEN_PROSJEKT):
            relasjoner.remove_relation("FORS-1", "KOE-1")
    with pytest.raises(PermanentError, match=UTEN_PROSJEKT):
        relasjoner.add_relation("FORS-1", "KOE-1", "forsering")

    assert _relasjoner(testbase_url) == []


def test_samme_relasjon_to_ganger_gir_en_rad(relasjoner, testbase_url):
    with autorisert(PROSJEKT):
        relasjoner.add_relations_batch("FORS-1", ["KOE-1"], "forsering")
        relasjoner.add_relations_batch("FORS-1", ["KOE-1", "KOE-1"], "forsering")

    assert len(_relasjoner(testbase_url)) == 1


def test_en_eksisterende_relasjon_flyttes_ikke_til_et_annet_prosjekt(
    relasjoner, testbase_url
):
    with autorisert(ANNET_PROSJEKT):
        relasjoner.add_relation("FREMMED-FORS", "KOE-1", "forsering")
    with autorisert(PROSJEKT):
        relasjoner.add_relation("FREMMED-FORS", "KOE-1", "forsering")
        assert relasjoner.get_containers_for_sak("KOE-1", "forsering") == []

    assert _relasjoner(testbase_url) == [
        ("FREMMED-FORS", "KOE-1", "forsering", ANNET_PROSJEKT)
    ]


def test_ukjent_relasjonstype_avvises_av_basen(relasjoner, testbase_url):
    with autorisert(PROSJEKT), pytest.raises(ValidationError):
        relasjoner.add_relation("FORS-1", "KOE-1", "noe_annet")

    assert _relasjoner(testbase_url) == []


def test_baklengs_oppslag_ser_bare_det_autoriserte_prosjektet(relasjoner):
    with autorisert(PROSJEKT):
        relasjoner.add_relations_batch("FORS-1", ["KOE-1"], "forsering")
        relasjoner.add_relation("EO-1", "KOE-1", "endringsordre")
    with autorisert(ANNET_PROSJEKT):
        relasjoner.add_relation("FREMMED-FORS", "KOE-1", "forsering")

    with autorisert(PROSJEKT):
        assert relasjoner.get_containers_for_sak("KOE-1", "forsering") == ["FORS-1"]
        assert relasjoner.get_containers_for_sak("KOE-1", "endringsordre") == ["EO-1"]
    with autorisert(ANNET_PROSJEKT):
        assert relasjoner.get_containers_for_sak("KOE-1", "forsering") == [
            "FREMMED-FORS"
        ]


@pytest.mark.parametrize("prosjekt", [None, ""])
def test_baklengs_oppslag_uten_prosjekt_er_tomt(relasjoner, prosjekt):
    with autorisert(PROSJEKT):
        relasjoner.add_relation("FORS-1", "KOE-1", "forsering")

    assert relasjoner.get_containers_for_sak("KOE-1", "forsering") == []
    with autorisert(prosjekt):
        assert relasjoner.get_containers_for_sak("KOE-1", "forsering") == []


def test_relasjon_til_sak_i_annet_prosjekt_utvider_ikke_tilgangen(
    container_mot_testbasen, saker
):
    """RV-07, AUT-01/02: klienten oppgir relasjonen. En forsering i et annet
    prosjekt som viser til KOE-1, kan være stemplet med vårt prosjekt om den ble
    skrevet i vår kontekst. Da er det `cases_in_project` over saksmetadataene i
    basen som stopper den."""
    from lib.auth.project_access import cases_in_project

    relasjoner = container_mot_testbasen.relation_repository
    assert isinstance(relasjoner, PostgresRelationRepository)
    with autorisert(PROSJEKT):
        relasjoner.add_relations_batch("FREMMED-FORS", ["KOE-1"], "forsering")
        relasjoner.add_relations_batch("FORS-1", ["KOE-1"], "forsering")

        funnet = relasjoner.get_containers_for_sak("KOE-1", "forsering")
        assert funnet == ["FORS-1", "FREMMED-FORS"]
        assert cases_in_project(funnet) == {"FORS-1"}
        assert cases_in_project(["FREMMED-1", "KOE-2", "finnes-ikke"]) == {"KOE-2"}
    with autorisert(ANNET_PROSJEKT):
        assert relasjoner.get_containers_for_sak("KOE-1", "forsering") == []


def test_fjerning_er_avgrenset_til_prosjektet(relasjoner, testbase_url):
    with autorisert(PROSJEKT):
        relasjoner.add_relation("FORS-1", "KOE-1", "forsering")
        relasjoner.add_relation("FORS-1", "KOE-1", "endringsordre")
        relasjoner.add_relation("FORS-1", "KOE-2", "forsering")
    with autorisert(ANNET_PROSJEKT):
        relasjoner.add_relation("FREMMED-FORS", "KOE-1", "forsering")
        assert relasjoner.remove_relation("FORS-1", "KOE-1") is False

    with autorisert(PROSJEKT):
        assert relasjoner.remove_relation("FREMMED-FORS", "KOE-1") is False
        assert relasjoner.remove_relation("FORS-1", "KOE-1", "forsering") is True
        assert relasjoner.remove_relation("FORS-1", "KOE-1", "forsering") is False
        assert relasjoner.remove_relation("FORS-1", "KOE-1") is True

    assert _relasjoner(testbase_url) == [
        ("FORS-1", "KOE-2", "forsering", PROSJEKT),
        ("FREMMED-FORS", "KOE-1", "forsering", ANNET_PROSJEKT),
    ]


def test_fjerning_uten_type_fjerner_alle_typer(relasjoner, testbase_url):
    with autorisert(PROSJEKT):
        relasjoner.add_relation("EO-1", "KOE-1", "forsering")
        relasjoner.add_relation("EO-1", "KOE-1", "endringsordre")
        assert relasjoner.remove_relation("EO-1", "KOE-1") is True

    assert _relasjoner(testbase_url) == []


# ---------------------------------------------------------------------------
# BIM
# ---------------------------------------------------------------------------


def _lenke(**felt) -> BimLinkCreate:
    return BimLinkCreate(**{"fag": "ARK", **felt})


def _lenker(url):
    return _sql(url, "SELECT sak_id, fag, model_id FROM sak_bim_links ORDER BY id")


def test_koblingen_kommer_tilbake_som_den_ble_lagret(bim, saker):
    ny = _lenke(
        model_id="m1",
        model_name="Modell",
        object_id=2**40,
        object_global_id="gid",
        object_name="Vegg",
        object_ifc_type="IfcWall",
        kommentar="Se her",
    )
    with autorisert(PROSJEKT):
        lagret = bim.create_link("KOE-1", ny, linked_by="te@example.com")
        assert bim.get_links_for_sak("KOE-1") == [lagret]

    assert lagret.id is not None
    assert lagret.sak_id == "KOE-1"
    assert lagret.linked_by == "te@example.com"
    assert lagret.linked_at.tzinfo is not None
    assert lagret.model_dump(include=set(BimLinkCreate.model_fields)) == ny.model_dump()


def test_koblingene_sorteres_paa_fag_og_modell(bim, saker):
    with autorisert(PROSJEKT):
        for fag, modell in [("RIB", "A"), ("ARK", "B"), ("ARK", None), ("ARK", "A")]:
            bim.create_link(
                "KOE-1", _lenke(fag=fag, model_id=modell, model_name=modell), "x"
            )
        rekkefolge = [(k.fag, k.model_name) for k in bim.get_links_for_sak("KOE-1")]

    assert rekkefolge == [("ARK", "A"), ("ARK", "B"), ("ARK", None), ("RIB", "A")]


def test_kobling_til_sak_utenfor_prosjektet_avvises(bim, saker, testbase_url):
    with autorisert(PROSJEKT):
        with pytest.raises(NotFoundError):
            bim.create_link("FREMMED-1", _lenke(), "x")
        with pytest.raises(NotFoundError):
            bim.create_link("finnes-ikke", _lenke(), "x")
    for prosjekt in (None, ""):
        with autorisert(prosjekt), pytest.raises(PermanentError, match=UTEN_PROSJEKT):
            bim.create_link("KOE-1", _lenke(), "x")
    with pytest.raises(PermanentError, match=UTEN_PROSJEKT):
        bim.create_link("KOE-1", _lenke(), "x")

    assert _lenker(testbase_url) == []


def test_koblinger_leses_bare_i_sakens_prosjekt(bim, saker):
    with autorisert(ANNET_PROSJEKT):
        bim.create_link("FREMMED-1", _lenke(), "x")
        assert len(bim.get_links_for_sak("FREMMED-1")) == 1

    with autorisert(PROSJEKT):
        assert bim.get_links_for_sak("FREMMED-1") == []
    assert bim.get_links_for_sak("FREMMED-1") == []
    with autorisert(""):
        assert bim.get_links_for_sak("FREMMED-1") == []


def test_lik_kobling_to_ganger_er_en_konflikt(bim, saker):
    with autorisert(PROSJEKT):
        bim.create_link("KOE-1", _lenke(model_id="m1"), "x")
        with pytest.raises(ConflictError):
            bim.create_link("KOE-1", _lenke(model_id="m1"), "y")
        assert len(bim.get_links_for_sak("KOE-1")) == 1


def test_sletting_er_avgrenset_til_sak_og_prosjekt(bim, saker, testbase_url):
    with autorisert(ANNET_PROSJEKT):
        fremmed = bim.create_link("FREMMED-1", _lenke(), "x")
    with autorisert(PROSJEKT):
        egen = bim.create_link("KOE-1", _lenke(), "x")

        assert bim.delete_link(fremmed.id, sak_id="KOE-1") is False
        assert bim.delete_link(fremmed.id) is False
        assert bim.delete_link(egen.id, sak_id="KOE-2") is False
        assert bim.delete_link(egen.id, sak_id="KOE-1") is True
        assert bim.delete_link(egen.id, sak_id="KOE-1") is False
    with autorisert(None), pytest.raises(PermanentError, match=UTEN_PROSJEKT):
        bim.delete_link(fremmed.id)

    assert _lenker(testbase_url) == [("FREMMED-1", "ARK", None)]


def test_uten_sak_slettes_kobling_i_prosjektet(bim, saker):
    with autorisert(PROSJEKT):
        egen = bim.create_link("KOE-1", _lenke(), "x")
        assert bim.delete_link(egen.id) is True


def test_modellcachen_er_avgrenset_til_prosjektet(bim, testbase_url):
    with psycopg.connect(testbase_url) as c, c.cursor() as cur:
        cur.executemany(
            "INSERT INTO catenda_models_cache"
            " (prosjekt_id, catenda_project_id, model_id, model_name, fag)"
            " VALUES (%s, %s, %s, %s, %s)",
            [
                (PROSJEKT, "c1", "m2", "B", "ARK"),
                (PROSJEKT, "c1", "m1", "A", "RIB"),
                (PROSJEKT, "c1", "m3", "A", "ARK"),
                (ANNET_PROSJEKT, "c2", "m9", "X", "ARK"),
            ],
        )

    modeller = bim.get_cached_models(PROSJEKT)
    assert [(m.fag, m.model_id) for m in modeller] == [
        ("ARK", "m3"),
        ("ARK", "m2"),
        ("RIB", "m1"),
    ]
    assert all(m.prosjekt_id == PROSJEKT and m.id for m in modeller)
    assert bim.get_cached_models("") == []
    assert bim.get_cached_models(None) == []


# ---------------------------------------------------------------------------
# Innkoblingen
# ---------------------------------------------------------------------------


def test_containeren_gir_lagrene_over_samme_database(container_mot_testbasen):
    c = container_mot_testbasen
    assert isinstance(c.metadata_repository, PostgresSakMetadataRepository)
    assert isinstance(c.relation_repository, PostgresRelationRepository)
    assert isinstance(c.bim_link_repository, PostgresBimLinkRepository)
    for lager in (c.metadata_repository, c.relation_repository, c.bim_link_repository):
        assert lager._db is c.database


def test_sakslisten_per_sakstype_gaar_gjennom_containeren(
    container_mot_testbasen, saker
):
    """AUT-04, TST-01: /api/cases?sakstype= kaller list_by_sakstype, som
    CSV-lageret mangler."""
    with autorisert(PROSJEKT):
        funnet = container_mot_testbasen.metadata_repository.list_by_sakstype(
            "forsering"
        )
    assert [s.sak_id for s in funnet] == ["FORS-1"]
