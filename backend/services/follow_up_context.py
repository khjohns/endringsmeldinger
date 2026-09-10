"""Compact, current track state for the project work queue (not historical counts)."""
from models.sak_state import SakState


def build_follow_up_context(state: SakState) -> dict:
    common = {
        "status", "antall_versjoner", "bh_resultat", "bh_respondert_versjon",
        "te_akseptert",
    }
    return state.model_dump(mode="json", include={
        "sakstype": True,
        "overordnet_status": True,
        "grunnlag": common,
        "vederlag": common | {"metode"},
        "frist": common | {"varsel_type", "krevd_dager", "har_bh_foresporsel"},
    })
