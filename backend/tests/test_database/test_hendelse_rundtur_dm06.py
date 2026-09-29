"""DM-06: felt projeksjonen leser, men som journalen ikke lagrer.

`to_cloudevent` lagrer bare `data` når hendelsen har en datamodell. Toppnivåfelt
utenfor konvolutten forsvinner, og `eo_utstedt` har fem slike utgåtte felt.
Projeksjonen leser to av dem når en endringsordre lukker en KOE-sak. Ruta
regner tilstanden, og `sak_metadata`-cachen, av hendelsen i minnet; senere
lesinger regner den av det som ble lagret.

Kilden for forventningen er invariant 9 i hovedplanen: tilstand beregnes fra
hendelser alene. Da må den være lik før og etter lagring. Kontrollsaken sender
samme beløp i `data.vederlag` og viser at avviket gjelder toppnivåfeltet.
Beskrevet i docs/gjennomforing-spor-m-1b-2026-09-29.md.
"""

import psycopg
import pytest

from models.events import (
    EOUtstedtData,
    EOUtstedtEvent,
    GrunnlagData,
    GrunnlagEvent,
    SakOpprettetEvent,
    VederlagData,
    VederlagEvent,
    VederlagKompensasjon,
    VederlagsMetode,
    parse_event,
)
from repositories.postgres.hendelse import PostgresEventRepository
from services.timeline_service import TimelineService

pytestmark = pytest.mark.database

PROSJEKT = "p-dm06"
SAK = "SAK-DM06"
KONTROLLSAK = "SAK-DM06-KONTROLL"
TE = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"
BH = "0b6c1d8e-3f2a-4c5b-8d7e-6a5f4e3d2c1b"
BELOP = 100_000.0


@pytest.fixture
def journal(testbase_url, skrivbar_base, monkeypatch):
    with psycopg.connect(testbase_url) as c, c.transaction():
        for sak_id in (SAK, KONTROLLSAK):
            c.execute(
                "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_at, created_by)"
                " VALUES (%s, %s, now(), 'test')",
                (sak_id, PROSJEKT),
            )
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: PROSJEKT)
    return PostgresEventRepository(skrivbar_base)


def _saken(sak_id: str, endringsordre: EOUtstedtEvent) -> list:
    return [
        SakOpprettetEvent(sak_id=sak_id, sakstittel="Fundament", aktor_id=TE, aktor_rolle="TE"),
        GrunnlagEvent(
            sak_id=sak_id,
            aktor_id=TE,
            aktor_rolle="TE",
            data=GrunnlagData(
                tittel="Fundament",
                hovedkategori="ENDRING",
                beskrivelse="Endret fundamentering",
                dato_oppdaget="2026-09-01",
            ),
        ),
        VederlagEvent(
            sak_id=sak_id,
            aktor_id=TE,
            aktor_rolle="TE",
            data=VederlagData(
                metode=VederlagsMetode.ENHETSPRISER,
                belop_direkte=BELOP,
                begrunnelse="Merarbeid",
            ),
        ),
        endringsordre,
    ]


def _for_og_etter(journal, sak_id: str, hendelser: list):
    for_lagring = TimelineService().compute_state(hendelser)
    journal.append_batch(hendelser, expected_version=0)
    lagret, _ = journal.get_events(sak_id)
    etter_lagring = TimelineService().compute_state([parse_event(e) for e in lagret])
    return for_lagring, etter_lagring


def test_dm06_kontroll_belop_i_data_overlever_lagringen(journal):
    endringsordre = EOUtstedtEvent(
        sak_id=KONTROLLSAK,
        aktor_id=BH,
        aktor_rolle="BH",
        data=EOUtstedtData(
            eo_nummer="EO-1",
            beskrivelse="Endret fundamentering",
            vederlag=VederlagKompensasjon(
                metode=VederlagsMetode.ENHETSPRISER, belop_direkte=BELOP
            ),
        ),
    )
    for_lagring, etter_lagring = _for_og_etter(
        journal, KONTROLLSAK, _saken(KONTROLLSAK, endringsordre)
    )
    assert for_lagring.vederlag.godkjent_belop == BELOP
    assert etter_lagring.vederlag.godkjent_belop == BELOP


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DM-06: endelig_vederlag leses av projeksjonen, men lagres ikke",
)
def test_dm06_tilstanden_er_lik_for_og_etter_lagring(journal):
    endringsordre = EOUtstedtEvent(
        sak_id=SAK,
        aktor_id=BH,
        aktor_rolle="BH",
        endelig_vederlag=BELOP,
        data=EOUtstedtData(eo_nummer="EO-1", beskrivelse="Endret fundamentering"),
    )
    for_lagring, etter_lagring = _for_og_etter(journal, SAK, _saken(SAK, endringsordre))
    if for_lagring.vederlag.godkjent_belop != BELOP:
        pytest.fail("Forutsetningen holder ikke: projeksjonen leser ikke endelig_vederlag")

    assert etter_lagring.vederlag.godkjent_belop == for_lagring.vederlag.godkjent_belop
