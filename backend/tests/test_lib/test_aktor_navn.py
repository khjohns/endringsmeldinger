"""Navneoppslaget: den andre halvparten av MS-04.

Journalen bærer `aktor_id`. Navnet hører til visningen, og slås opp her. De to
egenskapene som betyr noe: oppslaget skal finne navnet når brukeren finnes, og
det skal aldri kunne velte visningen når den ikke gjør det — et brev som ikke
lar seg lese fordi en aktør er slettet, er verre enn et brev som viser
identiteten.
"""

import pytest

from lib.aktor_navn import CATENDA_PREFIKS, navn

BRUKER_ID = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"
SUBJECT = "catenda-subject-42"


class _Repo:
    def __init__(self, brukere=None, identiteter=None, feiler=False):
        self.brukere = brukere or {}
        self.identiteter = identiteter or {}
        self.feiler = feiler
        self.kall = 0

    def all_rows(self, tabell, kolonner="*", **filtre):
        self.kall += 1
        if self.feiler:
            raise RuntimeError("basen svarer ikke")
        assert tabell == "app_users"
        bruker_id = filtre["id"]
        if bruker_id not in self.brukere:
            return []
        return [{"id": bruker_id, "name": self.brukere[bruker_id]}]

    def user_id_for_subject(self, provider, subject):
        return self.identiteter.get((provider, subject))


@pytest.fixture
def med_repo(app):
    def sett(repo):
        app.extensions["koe_auth"] = type("T", (), {"repo": repo})()
        return repo

    yield sett
    app.extensions.pop("koe_auth", None)


def test_navnet_slaas_opp_for_en_kjent_bruker(app, med_repo):
    med_repo(_Repo(brukere={BRUKER_ID: "Kari Nordmann"}))
    with app.test_request_context():
        assert navn(BRUKER_ID) == "Kari Nordmann"


def test_ukjent_bruker_vises_med_identiteten(app, med_repo):
    """En slettet person er nettopp poenget: hendelsen består, navnet er borte."""
    med_repo(_Repo(brukere={}))
    with app.test_request_context():
        assert navn(BRUKER_ID) == BRUKER_ID


def test_lager_som_feiler_velter_ikke_visningen(app, med_repo):
    med_repo(_Repo(feiler=True))
    with app.test_request_context():
        assert navn(BRUKER_ID) == BRUKER_ID


def test_catenda_identitet_slaas_opp_via_app_identities(app, med_repo):
    med_repo(
        _Repo(
            brukere={BRUKER_ID: "Ola Nordmann"},
            identiteter={("catenda", SUBJECT): BRUKER_ID},
        )
    )
    with app.test_request_context():
        assert navn(f"{CATENDA_PREFIKS}{SUBJECT}") == "Ola Nordmann"


def test_catenda_forfatter_uten_konto_vises_med_identiteten(app, med_repo):
    med_repo(_Repo(brukere={}, identiteter={}))
    with app.test_request_context():
        ekstern = f"{CATENDA_PREFIKS}{SUBJECT}"
        assert navn(ekstern) == ekstern


def test_samme_aktor_slaas_opp_en_gang_per_forespørsel(app, med_repo):
    """En tidslinje viser de samme to–tre aktørene om og om igjen."""
    repo = med_repo(_Repo(brukere={BRUKER_ID: "Kari Nordmann"}))
    with app.test_request_context():
        for _ in range(5):
            assert navn(BRUKER_ID) == "Kari Nordmann"
    assert repo.kall == 1


def test_uten_app_kontekst_vises_identiteten():
    """Bakgrunnsjobber og rene domenetester har ingen sesjon å slå opp i."""
    assert navn(BRUKER_ID) == BRUKER_ID


def test_tom_aktor_gir_tom_streng():
    assert navn(None) == ""
    assert navn("") == ""
