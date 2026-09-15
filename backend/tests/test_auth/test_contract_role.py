import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from lib.auth.catenda_oauth import CatendaOAuth, CatendaUnavailable
from models.events import EventType
from services.auth_service import AuthService
from services.business_rules import BusinessRuleValidator

PROJECT = "11111111111111111111111111111111"
TE = "22222222222222222222222222222222"
BH = "33333333333333333333333333333333"
USER = "44444444444444444444444444444444"


@pytest.fixture
def service(monkeypatch):
    monkeypatch.setenv(
        "CATENDA_CONTRACT_TEAMS", json.dumps({"p": {"TE": [TE], "BH": [BH]}})
    )
    repo, oauth, client = Mock(), Mock(), Mock()
    repo.configs.return_value = [
        {"internal_project_id": "p", "catenda_project_id": PROJECT}
    ]
    repo.membership.return_value = {
        "active": True,
        "viewer_override": False,
        "catenda_subject": USER,
    }
    client.ensure_authenticated.return_value = True
    client.access_token = "integration-test-token"
    monkeypatch.setattr(
        "core.container.get_container", lambda: SimpleNamespace(catenda_client=client)
    )
    return AuthService(repo=repo, oauth=oauth)


@pytest.mark.parametrize(
    "sides,expected", [([TE], "TE"), ([BH], "BH"), ([TE, BH], None), ([], None)]
)
def test_only_unambiguous_current_team_membership_grants_authority(
    service, sides, expected
):
    service.oauth.team_members.side_effect = (
        lambda project, team, token: {USER} if team in sides else set()
    )
    assert service.contract_role("p", "internal-user") == expected
    assert service.oauth.team_members.call_count == 2


def test_team_removal_takes_effect_on_next_check(service):
    service.oauth.team_members.side_effect = [{USER}, set(), set(), set()]
    assert service.contract_role("p", "internal-user") == "TE"
    assert service.contract_role("p", "internal-user") is None


def test_missing_mapping_does_not_grant_role(service, monkeypatch):
    monkeypatch.delenv("CATENDA_CONTRACT_TEAMS")
    assert service.contract_role("p", "internal-user") is None
    service.oauth.team_members.assert_not_called()


@pytest.mark.parametrize(
    "mapping", [{"TE": [TE], "BH": [TE]}, {"TE": TE, "BH": [BH]}, {"TE": [TE]}]
)
def test_invalid_team_config_is_rejected(service, monkeypatch, mapping):
    monkeypatch.setenv("CATENDA_CONTRACT_TEAMS", json.dumps({"p": mapping}))
    with pytest.raises(ValueError):
        service.contract_role("p", "internal-user")


def test_partial_provider_failure_is_not_a_successful_snapshot(service):
    service.oauth.team_members.side_effect = [{USER}, CatendaUnavailable("unavailable")]
    with pytest.raises(CatendaUnavailable):
        service.contract_role("p", "internal-user")


def test_team_client_uses_project_and_team_ids_and_member_schema():
    oauth = CatendaOAuth("", "", "")
    oauth.collection = Mock(
        return_value=[{"role": "member", "user": {"type": "user", "id": USER}}]
    )
    assert oauth.team_members(PROJECT, TE, "token") == {USER}
    oauth.collection.assert_called_once_with(
        f"/v2/projects/{PROJECT}/teams/{TE}/members", "token"
    )
    oauth.collection.return_value = [{"user": {"type": "team", "id": TE}}]
    with pytest.raises(CatendaUnavailable):
        oauth.team_members(PROJECT, TE, "token")


@pytest.mark.parametrize(
    "event_type,wrong_role",
    [
        (EventType.RESPONS_GRUNNLAG_OPPDATERT, "TE"),
        (EventType.RESPONS_VEDERLAG_OPPDATERT, "TE"),
        (EventType.RESPONS_FRIST_OPPDATERT, "TE"),
        (EventType.FORSERING_RESPONS, "TE"),
        (EventType.FORSERING_VARSEL, "BH"),
        (EventType.FORSERING_STOPPET, "BH"),
        (EventType.FORSERING_KOSTNADER_OPPDATERT, "BH"),
    ],
)
def test_revisions_and_forsering_cannot_bypass_role_rules(event_type, wrong_role):
    result = BusinessRuleValidator().validate_actor_role(
        SimpleNamespace(event_type=event_type, aktor_rolle=wrong_role), None
    )
    assert not result.is_valid


# ============ ORGANISASJON (CATENDA-TEAM) ============

BH_RADGIVER = "55555555555555555555555555555555"


def test_contract_membership_gir_bade_rolle_og_team(service):
    """Teamet er organisasjonen; rollen er bare hvilken kontraktsside den er på."""
    service.oauth.team_members.side_effect = (
        lambda project, team, token: {USER} if team == BH else set()
    )
    assert service.contract_membership("p", "internal-user") == ("BH", BH)


def test_to_team_pa_samme_side_gir_rolle_men_ikke_entydig_organisasjon(
    service, monkeypatch
):
    """En kontraktsside kan ha flere team — byggherre og ekstern rådgiver.

    Rollen er da fortsatt entydig, men organisasjonen er det ikke. Dette er
    grunnen til at interne notater filtreres på team og ikke på TE/BH: et
    rollefilter ville latt rådgiveren lese byggherrens interne notater.
    """
    monkeypatch.setenv(
        "CATENDA_CONTRACT_TEAMS",
        json.dumps({"p": {"TE": [TE], "BH": [BH, BH_RADGIVER]}}),
    )
    service.oauth.team_members.side_effect = (
        lambda project, team, token: {USER} if team in {BH, BH_RADGIVER} else set()
    )

    rolle, team = service.contract_membership("p", "internal-user")

    assert rolle == "BH"
    assert team is None


def test_ukjent_medlemskap_gir_verken_rolle_eller_team(service):
    service.oauth.team_members.side_effect = lambda project, team, token: set()
    assert service.contract_membership("p", "internal-user") == (None, None)
