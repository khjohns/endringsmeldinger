"""Lagertester for interne notater (MS-05).

Notatene ligger i tabellen `notat`, ikke i journalen. Tre ting må holde uansett
hvilket lager som er i bruk:

- **Prosjektgrensen ligger i lageret**, ikke bare i ruta. `sak_id` alene ville
  latt en sak i ett prosjekt leses fra et annet.
- **Notatet kan slettes.** Det er forskjellen fra journalen, og hele grunnen
  til at tabellen finnes.
- **Rundturen bevarer `aktor_team_id`.** Faller det ut, er notatet usynlig for
  alle — også for forfatteren — og skjermingsregelen er fail-closed.

Supabase-klienten er erstattet av en tabell i minnet som avviser kolonner den
ikke kjenner. Kolonnesettet speiler migrasjonsfila, så en kolonne koden skriver
uten at skjemaet har den, blir fanget her. Merk at settet speiler repoet, ikke
den levende basen — det er katalogspørringen som er beviset på at en
skjemaendring har nådd fram.
"""

import tempfile

import pytest

from models.notat import Notat
from repositories.notat_repository import JsonFileNotatRepository
from repositories.supabase_notat_repository import SupabaseNotatRepository

from ..fixtures.supabase_dobbel import NOTAT_KOLONNER, FakeSupabaseClient

TE_TEAM = "22222222222222222222222222222222"
AKTOR_ID = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"
TEKST = "Internt: vi bør ikke spille ut fristkravet ennå."


def _notat(sak_id="KOE-001", prosjekt_id="p", notat_id=None) -> Notat:
    felter = {
        "sak_id": sak_id,
        "prosjekt_id": prosjekt_id,
        "aktor_id": AKTOR_ID,
        "aktor_rolle": "TE",
        "aktor_team_id": TE_TEAM,
        "tekst": TEKST,
        "spor": "grunnlag",
    }
    if notat_id:
        felter["notat_id"] = notat_id
    return Notat(**felter)


@pytest.fixture
def json_lager():
    with tempfile.TemporaryDirectory() as katalog:
        yield JsonFileNotatRepository(base_path=katalog)


@pytest.fixture
def supabase_lager(monkeypatch):
    klient = FakeSupabaseClient(kolonner=NOTAT_KOLONNER)
    monkeypatch.setattr(
        "repositories.supabase_notat_repository.create_client",
        lambda url, key: klient,
    )
    lager = SupabaseNotatRepository(
        url="https://notat.example.invalid", key="test-key"
    )
    return lager, klient


@pytest.fixture(params=["json", "supabase"])
def lager(request, json_lager, supabase_lager):
    return json_lager if request.param == "json" else supabase_lager[0]


def test_rundturen_bevarer_teamet(lager):
    """Uten team kan ingen lese notatet, heller ikke forfatteren."""
    lager.lagre(_notat())

    lest = lager.for_sak("KOE-001", "p")

    assert [n.aktor_team_id for n in lest] == [TE_TEAM]
    assert lest[0].tekst == TEKST
    assert lest[0].spor.value == "grunnlag"


def test_rundturen_gir_en_hendelse_tidslinjen_kjenner(lager):
    """Lesestien fletter notatet inn som hendelse; formen må holde."""
    lager.lagre(_notat())

    hendelse = lager.for_sak("KOE-001", "p")[0].til_hendelse()

    assert hendelse.event_type.value == "internt_notat"
    assert hendelse.aktor_team_id == TE_TEAM
    assert hendelse.data.tekst == TEKST


def test_annet_prosjekt_ser_ikke_notatet(lager):
    """Prosjektgrensen håndheves i lageret, ikke bare i ruta."""
    lager.lagre(_notat(prosjekt_id="p"))

    assert lager.for_sak("KOE-001", "annet") == []


def test_annen_sak_ser_ikke_notatet(lager):
    lager.lagre(_notat(sak_id="KOE-001"))

    assert lager.for_sak("KOE-002", "p") == []


def test_notatet_kan_slettes(lager):
    """Handlingen journalen ikke har og ikke skal ha."""
    notat = lager.lagre(_notat())

    assert lager.slett(notat.notat_id, "p") is True
    assert lager.for_sak("KOE-001", "p") == []


def test_sletting_fra_annet_prosjekt_gjor_ingenting(lager):
    notat = lager.lagre(_notat(prosjekt_id="p"))

    assert lager.slett(notat.notat_id, "annet") is False
    assert len(lager.for_sak("KOE-001", "p")) == 1


def test_hent_er_avgrenset_til_prosjektet(lager):
    notat = lager.lagre(_notat(prosjekt_id="p"))

    assert lager.hent(notat.notat_id, "p") is not None
    assert lager.hent(notat.notat_id, "annet") is None


def test_notatene_kommer_i_tidsrekkefolge(lager):
    """Tidslinjen fletter på tidsstempel og leser dem i denne rekkefølgen."""
    forste = _notat(notat_id="11111111-1111-1111-1111-111111111111")
    andre = _notat(notat_id="22222222-2222-2222-2222-222222222222")
    andre.opprettet = forste.opprettet.replace(year=forste.opprettet.year + 1)

    lager.lagre(andre)
    lager.lagre(forste)

    assert [n.notat_id for n in lager.for_sak("KOE-001", "p")] == [
        forste.notat_id,
        andre.notat_id,
    ]


def test_skriver_bare_kolonner_skjemaet_erklaerer(supabase_lager):
    """Dobbelen avviser ukjente kolonner; dette er vakten mot skjemadrift."""
    lager, klient = supabase_lager

    lager.lagre(_notat())

    rad = klient.tables["notat"][0]
    assert set(rad) <= NOTAT_KOLONNER
    assert rad["aktor_team_id"] == TE_TEAM


def test_notat_uten_team_avvises_av_modellen():
    """Basen har samme skranke; modellen skal ikke slippe raden dit i det hele tatt."""
    with pytest.raises(ValueError):
        Notat(
            sak_id="KOE-001",
            prosjekt_id="p",
            aktor_id=AKTOR_ID,
            aktor_rolle="TE",
            aktor_team_id="",
            tekst=TEKST,
        )
