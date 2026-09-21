"""MG-02: journalen bærer én identitetsform, og webhooken er den siste veien inn.

`_aktor_id` falt tidligere tilbake på `catenda:<subject>` når forfatteren ikke
fantes som bruker hos oss. Samme person kunne dermed stå som UUID i én hendelse
og som `catenda:<sub>` i en annen — i en append-only journal der det ikke kan
rettes — avhengig av om vedkommende tilfeldigvis hadde logget inn da webhooken
kom.

Tre egenskaper avgjør at formen er entydig, og hver av dem har en test her:

1. Identiteten løses gjennom `koe_resolve_identity`, samme funksjon som
   innloggingen og medlemssynkroniseringen bruker.
2. Issueren er identisk med innloggingens. En annen verdi ville gitt samme
   person to brukerrader.
3. Subjektet normaliseres til den formen `app_identities` lagrer. Et `ref` med
   bindestreker ville ellers bommet på oppslaget.

Og når identiteten ikke lar seg avgjøre, opprettes ingen sak — samme
fail-closed-regel som for kontraktssiden (audit INT-04).
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from lib.auth.catenda_oauth import CatendaOAuth
from services.catenda_project_resolver import ResolvedProjectContext
from services.catenda_webhook_service import WebhookService

SUBJECT_MED_BINDESTREKER = "52480907-6a69-4255-b989-d236517a55da"
SUBJECT_HEX = "524809076a694255b989d236517a55da"
BRUKER_ID = "11111111-2222-3333-4444-555555555555"
TOPIC_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"


def _service(monkeypatch, ref, identity=None, lagrede=None):
    """WebhookService med ekte `_aktor_id`; bare identitetsfunksjonen er stubbet."""
    klient = MagicMock()
    klient.get_topic_details.return_value = {
        "id": "topic-1",
        "title": "Pålegg om endring",
        "topic_type": "Endringsordre",
        "bimsync_creation_author": {"user": {"name": "Kari", "ref": ref}},
    }
    klient.get_project_details.return_value = {"name": "Testprosjekt"}

    resolver = MagicMock()
    resolver.resolve.return_value = ResolvedProjectContext(
        internal_project_id="oslobygg",
        catenda_project_id="11111111-1111-1111-1111-111111111111",
        board_id="cccccccc-cccc-cccc-cccc-cccccccccccc",
        topic_id=TOPIC_ID,
        library_id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    )

    opprettelse = MagicMock()

    def fang(**kwargs):
        if lagrede is not None:
            lagrede.extend(kwargs.get("events", []))
        return MagicMock(success=True, error=None)

    opprettelse.create_sak.side_effect = fang
    monkeypatch.setattr(
        "services.sak_creation_service.get_sak_creation_service", lambda: opprettelse
    )
    monkeypatch.setattr(
        "services.catenda_webhook_service.create_metadata_repository",
        lambda: MagicMock(),
    )
    monkeypatch.setattr("services.auth_service.AuthService.__init__", lambda self: None)
    monkeypatch.setattr(
        "services.auth_service.AuthService.contract_membership_for_subject",
        lambda self, project_id, subject: ("BH", "team-bh"),
    )
    monkeypatch.setattr(
        "services.auth_service.AuthService.repo",
        SimpleNamespace(identity=identity or (lambda *a, **k: BRUKER_ID)),
        raising=False,
    )

    return WebhookService(
        event_repository=MagicMock(),
        catenda_client=klient,
        resolver=resolver,
        config={},
    )


def _payload():
    return {
        "event": {"id": "evt-1", "type": "issue.created"},
        "issue": {"id": TOPIC_ID, "boardId": "cccccccc-cccc-cccc-cccc-cccccccccccc"},
        "project": {"id": "11111111111111111111111111111111"},
    }


def test_journalen_far_app_bruker_id_og_ikke_et_prefiks(monkeypatch):
    """Hendelsen skal bære `app_users.id`, uansett om forfatteren har logget inn."""
    lagrede = []
    service = _service(monkeypatch, SUBJECT_HEX, lagrede=lagrede)

    resultat = service.handle_new_topic_created(_payload())

    assert resultat["success"] is True, resultat
    assert len(lagrede) == 1
    assert lagrede[0].aktor_id == BRUKER_ID
    assert not lagrede[0].aktor_id.startswith("catenda:")


def test_issueren_er_den_samme_som_innloggingens(monkeypatch):
    """En annen issuer ville gitt samme person to brukerrader."""
    kall = []
    service = _service(
        monkeypatch,
        SUBJECT_HEX,
        identity=lambda *a, **k: (kall.append(a), BRUKER_ID)[1],
    )

    assert service.handle_new_topic_created(_payload())["success"] is True

    provider, issuer, subject, *_ = kall[0]
    assert provider == "catenda"
    assert issuer == CatendaOAuth.BASE


@pytest.mark.parametrize("ref", [SUBJECT_HEX, SUBJECT_MED_BINDESTREKER])
def test_subjektet_normaliseres_til_lagret_form(monkeypatch, ref):
    """`app_identities` og medlemskapene lagrer 32 heksadesimaler uten bindestreker.

    Kom refen med bindestreker og gikk urørt videre, ville oppslaget bommet —
    og fallbacket ville gitt en tredje verdiform i journalen.
    """
    kall = []
    service = _service(
        monkeypatch, ref, identity=lambda *a, **k: (kall.append(a), BRUKER_ID)[1]
    )

    assert service.handle_new_topic_created(_payload())["success"] is True

    assert kall[0][2] == SUBJECT_HEX


def test_ingen_sak_uten_entydig_identitet(monkeypatch):
    """Fail-closed, som for kontraktssiden (INT-04).

    En hendelse med en aktør vi ikke kan navngi, har ingen bevisverdi — og
    journalen kan ikke rettes i ettertid.
    """
    lagrede = []

    def feiler(*a, **k):
        raise RuntimeError("basen svarer ikke")

    service = _service(monkeypatch, SUBJECT_HEX, identity=feiler, lagrede=lagrede)

    resultat = service.handle_new_topic_created(_payload())

    assert resultat["success"] is False
    assert resultat["error"] == "UKJENT_FORFATTER"
    assert lagrede == [], "En sak ble opprettet uten kjent forfatter"


def test_ref_som_ikke_er_en_catenda_id_avvises(monkeypatch):
    """En ref som ikke lar seg normalisere, er ikke en identitet vi kan bruke."""
    lagrede = []
    service = _service(monkeypatch, "john@doe.com", lagrede=lagrede)

    resultat = service.handle_new_topic_created(_payload())

    assert resultat["success"] is False
    assert lagrede == []
