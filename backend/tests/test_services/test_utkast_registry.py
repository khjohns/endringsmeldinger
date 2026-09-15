"""Teamavgrensede arbeidsutkast: avgrensning, revisjonsgrense og samtidighet.

Utkastet deles av organisasjonen, ikke av personen. Avgrensningen går på
Catenda-team-ID, samme grense som interne notater bruker — en kontraktsside kan
ha flere team, og byggherrens eksterne rådgiver skal ikke redigere byggherrens
tekst.

Registeret er fail-closed på team: uten en entydig organisasjon finnes det ikke
noe utkast å hente eller skrive. `AuthService.contract_membership` gir `None`
som team når brukeren treffer flere team på samme side, og den brukeren får da
ingen tilgang her.
"""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest

from services.utkast_registry import UtkastKonflikt, UtkastRegistry


@pytest.fixture
def registry(tmp_path):
    return UtkastRegistry(path=str(tmp_path / "utkast.sqlite"))


def _lagre(registry, **overstyr):
    argumenter = {
        "project": "p",
        "case_id": "S1",
        "spor": "grunnlag",
        "revisjon": 0,
        "team": "team-bh",
        "kontraktsside": "BH",
        "innhold": {"begrunnelseHtml": "<p>Utkast</p>"},
        "oppdatert_av": "alice@example.test",
        "forventet_versjon": None,
    }
    argumenter.update(overstyr)
    return registry.lagre(**argumenter)


def test_lagret_utkast_leses_tilbake_av_samme_team(registry):
    _lagre(registry)
    lagret = registry.hent("p", "S1", "grunnlag", 0, "team-bh")
    assert lagret["innhold"] == {"begrunnelseHtml": "<p>Utkast</p>"}
    assert lagret["versjon"] == 1
    assert lagret["oppdatert_av"] == "alice@example.test"


def test_kollega_i_samme_team_leser_og_skriver_samme_utkast(registry):
    """Samarbeidskravet: utkastet tilhører organisasjonen, ikke personen."""
    _lagre(registry)
    oppdatert = _lagre(
        registry,
        innhold={"begrunnelseHtml": "<p>Endret av kollega</p>"},
        oppdatert_av="bob@example.test",
        forventet_versjon=1,
    )
    assert oppdatert["versjon"] == 2
    assert registry.hent("p", "S1", "grunnlag", 0, "team-bh")["innhold"] == {
        "begrunnelseHtml": "<p>Endret av kollega</p>"
    }


def test_annet_team_paa_samme_kontraktsside_ser_ikke_utkastet(registry):
    """Rådgiveren sitter på byggherrens side, men er en annen organisasjon."""
    _lagre(registry, team="team-bh")
    assert registry.hent("p", "S1", "grunnlag", 0, "team-radgiver") is None


def test_motparten_ser_ikke_utkastet(registry):
    _lagre(registry, team="team-bh", kontraktsside="BH")
    assert registry.hent("p", "S1", "grunnlag", 0, "team-te") is None


def test_ukjent_team_gir_ikke_tilgang(registry):
    """`contract_membership` gir None som team ved flertydig organisasjon."""
    _lagre(registry)
    for tomt in (None, ""):
        with pytest.raises(ValueError):
            registry.hent("p", "S1", "grunnlag", 0, tomt)
        with pytest.raises(ValueError):
            _lagre(registry, team=tomt)


def test_utkast_er_avgrenset_til_sak_spor_og_revisjon(registry):
    _lagre(registry)
    assert registry.hent("p", "S2", "grunnlag", 0, "team-bh") is None
    assert registry.hent("p", "S1", "frist", 0, "team-bh") is None
    assert registry.hent("p", "S1", "grunnlag", 1, "team-bh") is None
    assert registry.hent("annet-prosjekt", "S1", "grunnlag", 0, "team-bh") is None


def test_ny_revisjon_lar_forrige_revisjon_staa_urort(registry):
    """Frosset grunnlag endres ikke av at noen skriver videre etter innsending."""
    _lagre(registry, revisjon=0, innhold={"begrunnelseHtml": "<p>Sendt</p>"})
    _lagre(registry, revisjon=1, innhold={"begrunnelseHtml": "<p>Nytt svar</p>"})
    assert registry.hent("p", "S1", "grunnlag", 0, "team-bh")["innhold"] == {
        "begrunnelseHtml": "<p>Sendt</p>"
    }


def test_samtidig_skriving_avvises_i_stedet_for_aa_overskrive(registry):
    """To redaktører leser versjon 1; den andre skrivingen taper ikke stille."""
    _lagre(registry)
    _lagre(registry, innhold={"begrunnelseHtml": "<p>Alice</p>"}, forventet_versjon=1)
    with pytest.raises(UtkastKonflikt) as konflikt:
        _lagre(
            registry,
            innhold={"begrunnelseHtml": "<p>Bob</p>"},
            oppdatert_av="bob@example.test",
            forventet_versjon=1,
        )
    assert konflikt.value.gjeldende["innhold"] == {"begrunnelseHtml": "<p>Alice</p>"}
    assert konflikt.value.gjeldende["versjon"] == 2


def test_forste_skriving_mot_eksisterende_utkast_avvises(registry):
    """En redaktør som tror utkastet er tomt, skal ikke slette kollegaens tekst."""
    _lagre(registry, innhold={"begrunnelseHtml": "<p>Kollega</p>"})
    with pytest.raises(UtkastKonflikt):
        _lagre(registry, innhold={"begrunnelseHtml": "<p>Min</p>"})


def test_skriving_mot_utkast_som_er_slettet_avvises(registry):
    with pytest.raises(UtkastKonflikt):
        _lagre(registry, forventet_versjon=1)


def test_sletting_fjerner_bare_eget_teams_utkast(registry):
    _lagre(registry, team="team-bh")
    _lagre(registry, team="team-te", kontraktsside="TE")
    registry.slett("p", "S1", "grunnlag", 0, "team-bh")
    assert registry.hent("p", "S1", "grunnlag", 0, "team-bh") is None
    assert registry.hent("p", "S1", "grunnlag", 0, "team-te") is not None


def test_sletting_av_utkast_som_ikke_finnes_er_stille(registry):
    registry.slett("p", "S1", "grunnlag", 0, "team-bh")


@pytest.mark.parametrize("finnes", [False, True])
def test_parallelle_skrivinger_har_bare_en_vinner(registry, monkeypatch, finnes):
    if finnes:
        _lagre(registry)
    start = Barrier(2)
    lest = Barrier(2)
    original = registry._hent

    def hent(db, *args):
        rad = original(db, *args)
        # Uten en eksplisitt transaksjon kan begge lese samme versjon før
        # noen skriver. En transaksjon må få fullføre uten denne testbarrieren.
        if not db.in_transaction:
            lest.wait(timeout=5)
        return rad

    monkeypatch.setattr(registry, "_hent", hent)

    def skriv(navn):
        start.wait(timeout=5)
        try:
            return _lagre(
                registry,
                innhold={"tekst": navn},
                forventet_versjon=1 if finnes else None,
            )
        except UtkastKonflikt:
            return None

    with ThreadPoolExecutor(max_workers=2) as pool:
        resultater = list(pool.map(skriv, ["Alice", "Bob"]))
    vinnere = [rad for rad in resultater if rad is not None]
    assert len(vinnere) == 1
    monkeypatch.setattr(registry, "_hent", original)
    assert registry.hent("p", "S1", "grunnlag", 0, "team-bh") == vinnere[0]
