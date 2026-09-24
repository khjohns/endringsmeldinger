"""Containeren for F0b punkt 2: én pool, og ferdig innkobling av lagrene.

RK-01 og RK-02 i docs/review-f0b-kjernen-2026-09-23.md.
"""

import sys
import threading
import time
import types

import pytest

import lib.db
from core.config import Settings
from core.container import POSTGRES_LAGRE, Container, LagerIkkeKonvertert, set_container


class FalskDatabase:
    def __init__(self):
        self.lukket = 0

    def lukk(self):
        self.lukket += 1


def postgres_container():
    container = Container(config=Settings(_env_file=None, datalag="postgres"))
    container._database = FalskDatabase()
    return container


@pytest.fixture
def falske_lagre(monkeypatch):
    """Et modul per oppføring i POSTGRES_LAGRE, med en klasse som husker databasen."""
    for modul, klasse in POSTGRES_LAGRE.values():
        m = types.ModuleType(modul)
        setattr(
            m,
            klasse,
            type(klasse, (), {"__init__": lambda self, db: setattr(self, "db", db)}),
        )
        monkeypatch.setitem(sys.modules, modul, m)


def test_samtidig_forste_oppslag_lager_en_pool(monkeypatch):
    opprettet = []

    def treg_opprett(innstillinger):
        time.sleep(0.2)
        database = FalskDatabase()
        opprettet.append(database)
        return database

    monkeypatch.setattr(lib.db, "opprett_database", treg_opprett)
    container = Container(config=Settings(_env_file=None))
    start = threading.Barrier(2, timeout=5)
    sett = []

    def hent():
        start.wait()
        sett.append(container.database)

    trader = [threading.Thread(target=hent) for _ in range(2)]
    for t in trader:
        t.start()
    for t in trader:
        t.join(5)

    assert len(opprettet) == 1
    assert sett == [opprettet[0], opprettet[0]]
    container.reset()
    assert opprettet[0].lukket == 1
    assert container._database is None


def test_hvert_lager_i_tabellen_er_en_property():
    for navn in POSTGRES_LAGRE:
        assert isinstance(getattr(Container, navn, None), property), navn


@pytest.mark.parametrize("navn", sorted(POSTGRES_LAGRE))
def test_postgres_lagre_faar_containerens_database(falske_lagre, navn):
    container = postgres_container()
    lager = getattr(container, navn)
    modul, klasse = POSTGRES_LAGRE[navn]
    assert type(lager).__name__ == klasse
    assert lager.db is container._database


def test_lager_som_ikke_er_konvertert_gir_tydelig_feil(monkeypatch):
    monkeypatch.setitem(
        POSTGRES_LAGRE, "event_repository", ("repositories.postgres.finnes_ikke", "X")
    )
    with pytest.raises(LagerIkkeKonvertert, match="event_repository"):
        _ = postgres_container().event_repository


def test_uten_datalag_brukes_dagens_lagre(monkeypatch):
    monkeypatch.setenv("EVENT_STORE_BACKEND", "json")
    container = Container(config=Settings(_env_file=None))
    assert not container.bruker_postgres
    assert container.relation_repository is None
    assert container._database is None


def test_ukjent_datalag_avvises():
    with pytest.raises(ValueError):
        Settings(_env_file=None, datalag="supabase")


@pytest.fixture
def postgres_som_standard(falske_lagre):
    container = postgres_container()
    set_container(container)
    yield container
    set_container(None)


def test_auth_service_henter_lageret_fra_containeren(postgres_som_standard):
    from services.auth_service import AuthService

    assert AuthService().repo.db is postgres_som_standard._database


@pytest.mark.parametrize(
    "modul", ["services.forsering_service", "services.endringsordre_service"]
)
def test_relasjonslageret_hentes_fra_containeren(postgres_som_standard, modul):
    import importlib

    lager = importlib.import_module(modul)._get_relation_repository()
    assert lager.db is postgres_som_standard._database


def test_catenda_registeret_hentes_fra_containeren(postgres_som_standard):
    from services.catenda_project_resolver_factory import build_project_resolver

    resolver = build_project_resolver(object(), backend="supabase")
    registre = [v for v in vars(resolver).values() if hasattr(v, "db")]
    assert [r.db for r in registre] == [postgres_som_standard._database]


@pytest.mark.parametrize(
    "modul", ["services.forsering_service", "services.endringsordre_service"]
)
def test_manglende_relasjonslager_er_hoyt_naar_postgres_er_valgt(monkeypatch, modul):
    """Uten PostgreSQL er relasjonslageret valgfritt. Med PostgreSQL valgt skal
    et lager som mangler, ikke bli et stille `None`."""
    import importlib

    monkeypatch.setitem(
        POSTGRES_LAGRE, "relation_repository", ("repositories.postgres.finnes_ikke", "X")
    )
    set_container(postgres_container())
    try:
        with pytest.raises(LagerIkkeKonvertert):
            importlib.import_module(modul)._get_relation_repository()
    finally:
        set_container(None)


@pytest.mark.parametrize("fabrikk", ["get_endringsordre_service", "get_forsering_service"])
@pytest.mark.parametrize("globalt_datalag", ["", "postgres"])
def test_tjenesten_bruker_sin_egen_database_for_relasjoner(
    falske_lagre, monkeypatch, fabrikk, globalt_datalag
):
    monkeypatch.setenv("EVENT_STORE_BACKEND", "json")
    standard = Container(config=Settings(_env_file=None, datalag=globalt_datalag))
    standard._database = FalskDatabase()
    lokal = postgres_container()
    lokal._catenda_client = object()
    monkeypatch.setattr("core.container._default_container", standard)

    tjeneste = getattr(lokal, fabrikk)()

    assert tjeneste.event_repository.db is lokal.database
    assert tjeneste.relation_repository.db is tjeneste.event_repository.db
    assert tjeneste.relation_repository.db is not standard.database


@pytest.mark.parametrize("fabrikk", ["get_endringsordre_service", "get_forsering_service"])
@pytest.mark.parametrize("gammelt_lager", ["json", "supabase"])
def test_tomt_relasjonslager_fra_egen_container_hentes_ikke_globalt(
    postgres_som_standard, monkeypatch, fabrikk, gammelt_lager
):
    monkeypatch.setenv("EVENT_STORE_BACKEND", gammelt_lager)
    lokal = Container(config=Settings(_env_file=None, datalag=""))
    lokal._event_repo = object()
    lokal._metadata_repo = object()
    lokal._catenda_client = object()

    def utilgjengelig():
        raise RuntimeError("Relasjonslageret er utilgjengelig")

    monkeypatch.setattr("repositories.create_relation_repository", utilgjengelig)

    tjeneste = getattr(lokal, fabrikk)()

    assert tjeneste.event_repository is lokal._event_repo
    assert tjeneste.relation_repository is None


@pytest.mark.parametrize("registervalg", ["legacy", "supabase"])
@pytest.mark.parametrize("eksplisitt", [False, True])
def test_postgres_overstyrer_catenda_registervalget(
    postgres_som_standard, monkeypatch, registervalg, eksplisitt
):
    from core.config import settings
    from services.catenda_project_resolver_factory import build_project_resolver

    monkeypatch.setattr(settings, "catenda_project_registry_backend", registervalg)
    for felt in ("catenda_project_id", "catenda_topic_board_id", "catenda_library_id"):
        monkeypatch.setattr(settings, felt, "11111111-1111-1111-1111-111111111111")
    resolver = build_project_resolver(
        object(), **({"backend": registervalg} if eksplisitt else {})
    )

    assert type(resolver._register).__name__ == "PostgresCatendaProjectConfigRepository"
    assert resolver._register.db is postgres_som_standard.database


@pytest.mark.parametrize("registervalg", ["legacy", "supabase"])
def test_manglende_postgres_register_avvises_uten_legacy_reserve(
    postgres_som_standard, monkeypatch, registervalg
):
    from core.config import settings
    from services.catenda_project_resolver_factory import (
        ProjectResolverConfigurationError,
        build_project_resolver,
    )

    monkeypatch.setattr(settings, "catenda_project_registry_backend", registervalg)
    for felt in ("catenda_project_id", "catenda_topic_board_id", "catenda_library_id"):
        monkeypatch.setattr(settings, felt, "11111111-1111-1111-1111-111111111111")
    monkeypatch.setitem(
        POSTGRES_LAGRE, "catenda_config_repository", ("repositories.postgres.finnes_ikke", "X")
    )

    with pytest.raises(ProjectResolverConfigurationError, match=r"\(postgres\)") as feil:
        build_project_resolver(object())

    assert isinstance(feil.value.__cause__, LagerIkkeKonvertert)
