"""DRF-03: sendedatoen for varselet om justerte enhetspriser (§ 34.3.3).

Skjemaet satte `justert_ep_varsel.dato_sendt` til datoen forholdet ble
oppdaget, og backend lagret den uendret. Etter oppdragsgivers valg 29.09
setter serveren datoen: den norske datoen i hendelsens `tidsstempel` den
første gangen TE krever justerte enhetspriser. En dato fra klienten avvises
av valideringen, som `/api/events`, `/api/events/batch` og godkjenningsflyten
kaller. Funnet står i `docs/kartlegging-domeneregler-frontend-2026-09-23.md`.
"""

from datetime import UTC, datetime

import pytest

from api.validators import ValidationError, validate_event_data
from models.events import SporType, VederlagData, VederlagEvent, VederlagsMetode
from services.timeline_service import TimelineService

KRAV = {
    "metode": "ENHETSPRISER",
    "belop_direkte": 250000,
    "begrunnelse": "Mengdene avviker vesentlig fra forutsetningene.",
    "krever_justert_ep": True,
}


def _krav(event_type, tidsstempel, krever_justert_ep=True):
    return VederlagEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type=event_type,
        spor=SporType.VEDERLAG,
        tidsstempel=tidsstempel,
        data=VederlagData(
            metode=VederlagsMetode.ENHETSPRISER,
            belop_direkte=250000,
            begrunnelse="Krav",
            krever_justert_ep=krever_justert_ep,
        ),
    )


def test_krav_om_justerte_enhetspriser_godtas_uten_dato_fra_klienten():
    validate_event_data("vederlag_krav_sendt", dict(KRAV))


@pytest.mark.parametrize("event_type", ["vederlag_krav_sendt", "vederlag_krav_oppdatert"])
def test_dato_fra_klienten_avvises(event_type):
    data = {**KRAV, "justert_ep_varsel": {"dato_sendt": "2026-09-01"}}
    with pytest.raises(ValidationError) as feil:
        validate_event_data(event_type, data)
    assert feil.value.field == "justert_ep_varsel"


def test_sendedatoen_er_norsk_dato_for_innsendingen():
    # 22.30 UTC 28.09 er 00.30 29.09 i Norge.
    krav = _krav("vederlag_krav_sendt", datetime(2026, 9, 28, 22, 30, tzinfo=UTC))

    vederlag = TimelineService().compute_state([krav]).vederlag

    assert vederlag.justert_ep_varsel["dato_sendt"] == "2026-09-29"


def test_oppdatert_krav_flytter_ikke_sendedatoen():
    forste = _krav("vederlag_krav_sendt", datetime(2026, 9, 10, 8, tzinfo=UTC))
    oppdatert = _krav("vederlag_krav_oppdatert", datetime(2026, 9, 20, 8, tzinfo=UTC))

    vederlag = TimelineService().compute_state([forste, oppdatert]).vederlag

    assert vederlag.justert_ep_varsel["dato_sendt"] == "2026-09-10"


def test_varselet_sendes_forst_nar_te_krever_justerte_enhetspriser():
    uten = _krav("vederlag_krav_sendt", datetime(2026, 9, 10, 8, tzinfo=UTC), False)
    med = _krav("vederlag_krav_oppdatert", datetime(2026, 9, 20, 8, tzinfo=UTC))

    tilstand = TimelineService().compute_state([uten])
    assert tilstand.vederlag.justert_ep_varsel is None

    vederlag = TimelineService().compute_state([uten, med]).vederlag
    assert vederlag.justert_ep_varsel["dato_sendt"] == "2026-09-20"
