from models.sak_state import SakState
from services.follow_up_context import build_follow_up_context


def test_context_preserves_versions_and_zero_without_private_reasoning():
    state = SakState(sak_id="TEST-1", frist={
        "antall_versjoner": 2,
        "bh_respondert_versjon": 0,
        "krevd_dager": 0,
        "bh_resultat": "avslatt",
    })
    context = build_follow_up_context(state)
    assert context["sakstype"] == "standard"
    assert context["frist"]["antall_versjoner"] == 2
    assert context["frist"]["bh_respondert_versjon"] == 0
    assert context["frist"]["krevd_dager"] == 0
    assert context["frist"]["bh_resultat"] == "avslatt"
    assert "bh_begrunnelse" not in context["frist"]
    assert "sakstittel" not in context


def test_unanswered_context_does_not_fabricate_an_answer():
    context = build_follow_up_context(SakState(sak_id="TEST-2"))
    for track in ("grunnlag", "vederlag", "frist"):
        assert context[track]["bh_resultat"] is None
        assert context[track]["bh_respondert_versjon"] is None
