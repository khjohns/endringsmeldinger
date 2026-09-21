"""ForseringService skal håndheve de samme reglene som den generiske ruten.

De dedikerte /api/forsering/*-rutene bruker ForseringService, som tidligere
skrev rett til hendelseslageret. Samme hendelse kunne dermed bli avvist av
/api/events og godtatt av forseringsruten. Testene her holder de to veiene like.
"""

from unittest.mock import MagicMock

import pytest

from models.events import (
    ForseringVarselData,
    ForseringVarselEvent,
    SakOpprettetEvent,
)
from services.forsering_service import ForseringService
from services.timeline_service import TimelineService


def _service(events: list) -> tuple[ForseringService, MagicMock]:
    event_repository = MagicMock()
    event_repository.get_events.return_value = (
        [e.model_dump(mode="json") for e in events],
        len(events),
    )
    event_repository.append.return_value = len(events) + 1
    service = ForseringService(
        event_repository=event_repository,
        timeline_service=TimelineService(),
    )
    return service, event_repository


def _sak_opprettet() -> SakOpprettetEvent:
    return SakOpprettetEvent(
        sak_id="FORS-002",
        aktor_id="te-bruker",
        aktor_rolle="TE",
        sakstittel="Forseringssak",
        sakstype="forsering",
    )


def _varsel() -> ForseringVarselEvent:
    return ForseringVarselEvent(
        sak_id="FORS-002",
        aktor_id="te-bruker",
        aktor_rolle="TE",
        data=ForseringVarselData(
            frist_krav_id="frist-1",
            respons_frist_id="respons-1",
            estimert_kostnad=100_000,
            begrunnelse="Avslått fristforlengelse",
            bekreft_30_prosent=True,
            dato_iverksettelse="2026-09-15",
            avslatte_dager=10,
            dagmulktsats=50_000,
        ),
    )


def test_stopp_uten_varsel_avvises_av_tjenesten():
    """En forsering som aldri er varslet kan ikke stoppes via forseringsruten."""
    service, event_repository = _service([_sak_opprettet()])

    with pytest.raises(ValueError, match="ikke varslet"):
        service.stopp_forsering(
            sak_id="FORS-002",
            begrunnelse="Stoppet uten varsel",
            paalopte_kostnader=5_000,
            aktor_id="te-bruker",
            expected_version=1,
        )

    event_repository.append.assert_not_called()


def test_stopp_etter_varsel_lagres():
    """Kontroll: en varslet forsering kan fortsatt stoppes."""
    service, event_repository = _service([_sak_opprettet(), _varsel()])

    service.stopp_forsering(
        sak_id="FORS-002",
        begrunnelse="Forseringen er fullført",
        paalopte_kostnader=5_000,
        aktor_id="te-bruker",
        expected_version=2,
    )

    event_repository.append.assert_called_once()
    lagret = event_repository.append.call_args.args[0]
    assert lagret.event_type.value == "forsering_stoppet"


def test_kostnader_uten_varsel_avvises_av_tjenesten():
    """Påløpte kostnader forutsetter et varslet forseringskrav."""
    service, event_repository = _service([_sak_opprettet()])

    with pytest.raises(ValueError, match="ikke varslet"):
        service.oppdater_kostnader(
            sak_id="FORS-002",
            paalopte_kostnader=25_000,
            kommentar="Delvis påløpt",
            aktor_id="te-bruker",
            expected_version=1,
        )

    event_repository.append.assert_not_called()
