"""Enhver hendelsestype må klassifiseres av den som legger den til.

forsering_respons lå utenfor godkjenningsporten fordi typenavnet ikke delte
respons_-prefikset, og ingen oppdaget det før en audit (RV-04). Denne testen er
mekanismen som gjør at den neste typen ikke kan falle utenfor i stillhet.
"""

import pytest

from models.events import (
    BH_BINDENDE_EVENTS,
    IKKE_BH_BINDENDE_EVENTS,
    EventType,
)
from services.approval_policy import public_event_block_reason

POLICY = {"handlers": ["bh@example.test"], "chain": []}


def test_alle_hendelsestyper_er_klassifisert():
    klassifisert = BH_BINDENDE_EVENTS | IKKE_BH_BINDENDE_EVENTS
    assert klassifisert == set(EventType), (
        "En ny hendelsestype er lagt til uten å bli klassifisert. Avgjør om den "
        "binder byggherren økonomisk, og før den opp i BH_BINDENDE_EVENTS eller "
        "IKKE_BH_BINDENDE_EVENTS i models/events.py."
    )
    assert not (BH_BINDENDE_EVENTS & IKKE_BH_BINDENDE_EVENTS)


@pytest.mark.parametrize("event_type", sorted(e.value for e in BH_BINDENDE_EVENTS))
def test_bindende_hendelser_sperres_av_porten(event_type):
    assert public_event_block_reason(POLICY, {"event_type": event_type})


@pytest.mark.parametrize("event_type", sorted(e.value for e in IKKE_BH_BINDENDE_EVENTS))
def test_ovrige_hendelser_slipper_gjennom(event_type):
    """Unntaket er saksopprettelse av en endringsordre, som avgjøres av sakstypen."""
    blokkert = public_event_block_reason(POLICY, {"event_type": event_type})
    if event_type == EventType.SAK_OPPRETTET.value:
        assert blokkert is None
        assert public_event_block_reason(
            POLICY, {"event_type": event_type, "sakstype": "endringsordre"}
        )
    else:
        assert blokkert is None


def test_uten_policy_er_porten_apen():
    for event_type in sorted(e.value for e in BH_BINDENDE_EVENTS):
        assert public_event_block_reason(None, {"event_type": event_type}) is None
