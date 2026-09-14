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
