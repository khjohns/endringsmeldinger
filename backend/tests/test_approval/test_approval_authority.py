import pytest

from services.approval_authority import validate_authority

CHAIN = [{"role": "Prosjektleder"}]


def money(amount, subsidiary=None):
    return {
        "track": "vederlag",
        "data": {
            "total_godkjent_belop": amount,
            "subsidiaer_godkjent_belop": subsidiary,
        },
    }


def test_limit_inclusive_and_subsidiary_not_added_to_principal():
    assert validate_authority([money(200000, 190000)], CHAIN)["amount"] == "200000"
    with pytest.raises(ValueError, match="fullmakt"):
        validate_authority([money(200000.01)], CHAIN)
    with pytest.raises(ValueError, match="fullmakt"):
        validate_authority([money(0, 300000)], CHAIN)


def test_time_uses_server_rate_and_combines_exposure():
    days = {"track": "frist", "data": {"godkjent_dager": 5}}
    assert validate_authority([money(100000), days], CHAIN, 20000)["amount"] == "200000"
    with pytest.raises(ValueError, match="fullmakt"):
        validate_authority([money(100001), days], CHAIN, 20000)
    with pytest.raises(ValueError, match="dagmulktssats"):
        validate_authority([days], CHAIN)
    assert (
        validate_authority([{"track": "frist", "data": {"godkjent_dager": 0}}], CHAIN)[
            "amount"
        ]
        == "0"
    )


@pytest.mark.parametrize("amount", [-1, "NaN", "Infinity", "invalid"])
def test_invalid_exposure_is_rejected(amount):
    with pytest.raises(ValueError, match="Ugyldig"):
        validate_authority([money(amount)], CHAIN)


def test_unknown_role_does_not_grant_authority():
    with pytest.raises(ValueError, match="fullmakt"):
        validate_authority([money(1)], [{"role": "Prosjekteier"}])
    assert (
        validate_authority([money(6000000)], [{"role": "Adm.dir (daglig leder)"}])[
            "amount"
        ]
        == "6000000"
    )


def test_route_stops_at_the_decider_and_skips_approval_inside_own_authority():
    from decimal import Decimal

    from services.approval_authority import handler_identity, resolve_route

    sender = {"id": "pl", "role": "Prosjektleder"}
    chain = [
        {"id": "pd", "role": "Prosjektdirektør"},
        {"id": "al", "role": "Avdelingsleder"},
    ]
    assert resolve_route(Decimal(200000), sender, chain) == []
    assert [p["id"] for p in resolve_route(Decimal(200001), sender, chain)] == ["pd"]
    assert [p["id"] for p in resolve_route(Decimal(2930000), sender, chain)] == [
        "pd",
        "al",
    ]
    assert [p["id"] for p in resolve_route(None, sender, chain)] == ["pd", "al"]
    with pytest.raises(ValueError, match="fullmakt"):
        resolve_route(Decimal(3000001), sender, chain)
    policy = {"handlers": ["a@x", {"id": "B@x", "name": "B", "role": "Prosjektleder"}]}
    assert handler_identity(policy, "a@x") == {"id": "a@x", "name": "a@x"}
    assert handler_identity(policy, "b@x")["role"] == "Prosjektleder"
    assert handler_identity(policy, "c@x") is None


GODKJENT_ANSVAR = {"track": "grunnlag", "data": {"resultat": "godkjent"}}
KJEDE = [
    {"id": "pd", "role": "Prosjektdirektør"},
    {"id": "ad", "role": "Adm.dir (daglig leder)"},
]
PL = {"id": "pl", "role": "Prosjektleder"}


def test_godkjent_ansvar_verdsettes_per_spor_etter_krav_eller_svar():
    """GFK-06: besvart spor har svarets verdi, ubesvart spor TEs krav."""
    from decimal import Decimal

    from services.approval_authority import approval_route

    krav = {"vederlag": 50_000_000, "frist": 20}
    alene, _ = approval_route([GODKJENT_ANSVAR], KJEDE, 10_000, PL, krav)
    assert Decimal(alene["amount"]) == 50_000_000 + 20 * 10_000
    med_svar, _ = approval_route(
        [GODKJENT_ANSVAR, money(30_000_000)], KJEDE, 10_000, PL, krav
    )
    assert Decimal(med_svar["amount"]) == 30_000_000 + 20 * 10_000


@pytest.mark.parametrize("resultat", ["avslatt", "frafalt"])
def test_avslatt_eller_frafalt_ansvar_verdsettes_til_null(resultat):
    from services.approval_authority import approval_route

    ansvar = {"track": "grunnlag", "data": {"resultat": resultat}}
    grunnlag, rute = approval_route(
        [ansvar], KJEDE, 10_000, PL, {"vederlag": 9e9, "frist": None}
    )
    assert grunnlag["amount"] == "0"
    assert rute == []


@pytest.mark.parametrize(
    "krav",
    [None, {"vederlag": None, "frist": 0}, {"vederlag": 100_000, "frist": None}],
)
def test_godkjent_ansvar_for_krav_som_ikke_er_tallfestet_krever_hele_kjeden(krav):
    from services.approval_authority import approval_route

    grunnlag, rute = approval_route([GODKJENT_ANSVAR], KJEDE, 10_000, PL, krav)
    assert grunnlag["amount"] is None
    assert rute == KJEDE


def test_ukjent_krav_krever_at_kjeden_dekker_det_som_er_verdsatt():
    from services.approval_authority import approval_route

    krav = {"vederlag": 2_000_000, "frist": None}
    grunnlag, _ = approval_route([GODKJENT_ANSVAR], KJEDE, 10_000, PL, krav)
    assert grunnlag["minimum"] == "2000000"
    with pytest.raises(ValueError, match="tilstrekkelig fullmakt"):
        approval_route([GODKJENT_ANSVAR], KJEDE[:1], 10_000, PL, krav)


def test_krevde_dager_uten_dagmulktssats_avvises_som_for_svar():
    """B-06 er ikke avgjort; atferden er den samme som for et fristsvar uten sats."""
    from services.approval_authority import approval_route

    with pytest.raises(ValueError, match="dagmulktssats"):
        approval_route([GODKJENT_ANSVAR], KJEDE, None, PL, {"vederlag": 0, "frist": 5})
    grunnlag, _ = approval_route(
        [GODKJENT_ANSVAR], KJEDE, None, PL, {"vederlag": 0, "frist": 0}
    )
    assert grunnlag["amount"] == "0"


def test_krav_fra_tilstand():
    from types import SimpleNamespace

    from models.events import SporStatus
    from models.sak_state import FristTilstand, VederlagTilstand
    from services.approval_service import krav_fra_tilstand

    def tilstand(vederlag, frist):
        return SimpleNamespace(
            vederlag=VederlagTilstand(**vederlag), frist=FristTilstand(**frist)
        )

    sendt = {
        "status": SporStatus.SENDT,
        "metode": "FASTPRIS_TILBUD",
        "belop_direkte": -100_000,
        "saerskilt_krav": {
            "rigg_drift": {"belop": 20_000},
            "produktivitet": {"belop": 5_000},
        },
    }
    assert krav_fra_tilstand(
        tilstand(sendt, {"status": SporStatus.SENDT, "krevd_dager": 7})
    ) == {"vederlag": 125_000, "frist": 7}
    assert krav_fra_tilstand(
        tilstand(
            {"status": SporStatus.UTKAST},
            {"status": SporStatus.TRUKKET, "krevd_dager": 7},
        )
    ) == {"vederlag": None, "frist": 0}
    noytralt = {"status": SporStatus.SENDT, "varsel_type": "varsel"}
    regning = {"status": SporStatus.SENDT, "metode": "REGNINGSARBEID"}
    assert krav_fra_tilstand(tilstand(regning, noytralt)) == {
        "vederlag": None,
        "frist": None,
    }
