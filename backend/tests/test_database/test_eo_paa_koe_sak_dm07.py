"""DM-07: `eo_opprettet` på en eksisterende KOE-sak gjør den om til en endringsordresak.

`eo_opprettet` har ingen regel om sakstype, og behandleren setter sakstypen til
endringsordre uansett hvilken sak hendelsen kommer i. BH kan sende den gjennom
`POST /api/events` i et prosjekt uten godkjenningspolicy.

Kilden for forventningen er oppdragsgivers svar 29.09: en endringsordresak kan
følge av en KOE-sak, men ikke erstatte den, verken i historikken eller som en
egen hendelse i KOE-saken. Kontrollsaken sender samme `eo_opprettet` til en sak
som bare skiller seg i sakstypen, og viser at hendelsen og BHs tilgang er i
orden. Ruter, dekoratører, lagre og base er ekte; bare innloggingstjenesten er
byttet ut. Beskrevet i docs/gjennomforing-spor-m-1b-2026-09-29.md.
"""

from uuid import uuid4

import pytest

from tests.test_database.conftest import journalen

pytestmark = pytest.mark.database

PROSJEKT = "p-dm07"
HEADERS = {"X-Project-ID": PROSJEKT, "X-CSRF-Token": "csrf"}
EO_OPPRETTET = {
    "event_type": "eo_opprettet",
    "data": {"eo_nummer": "EO-1", "beskrivelse": "Endret fundamentering"},
}


def _ny_sak(hendelsesklient, innlogging, sakstype: str) -> str:
    """En sak med bare `sak_opprettet`, opprettet gjennom batch-ruta. BH sender videre."""
    sak_id = str(uuid4())
    innlogging.contract_membership.return_value = ("TE", "team-te")
    svar = hendelsesklient.post(
        "/api/events/batch",
        json={
            "sak_id": sak_id,
            "expected_version": 0,
            "sakstype": sakstype,
            "events": [{"event_type": "sak_opprettet", "sakstittel": "Fundament", "sakstype": sakstype}],
        },
        headers=HEADERS,
    )
    if svar.status_code != 201:
        pytest.fail(f"Saken ble ikke opprettet: {svar.status_code} {svar.get_json()}")
    innlogging.contract_membership.return_value = ("BH", "team-bh")
    return sak_id


def _send(hendelsesklient, sak_id: str):
    return hendelsesklient.post(
        "/api/events",
        json={"sak_id": sak_id, "expected_version": 1, "event": EO_OPPRETTET},
        headers=HEADERS,
    )


def test_dm07_kontroll_eo_opprettet_godtas_i_en_endringsordresak(
    hendelsesklient, innlogging, testbase_url
):
    sak_id = _ny_sak(hendelsesklient, innlogging, "endringsordre")

    svar = _send(hendelsesklient, sak_id)

    assert svar.status_code == 201, svar.get_json()
    assert journalen(testbase_url, sak_id) == ["sak_opprettet", "eo_opprettet"]


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DM-07: eo_opprettet godtas i en KOE-sak og gjør den til en endringsordresak",
)
def test_dm07_eo_opprettet_avvises_i_en_koe_sak(hendelsesklient, innlogging, testbase_url):
    sak_id = _ny_sak(hendelsesklient, innlogging, "standard")

    svar = _send(hendelsesklient, sak_id)
    if svar.status_code not in (201, 400):
        pytest.fail(f"Uventet svar {svar.status_code}: {svar.get_json()}")
    if svar.status_code == 400 and svar.get_json().get("error") != "BUSINESS_RULE_VIOLATION":
        pytest.fail(f"Avvist av en annen grunn enn forretningsreglene: {svar.get_json()}")

    assert svar.status_code == 400, svar.get_json()
    assert journalen(testbase_url, sak_id) == ["sak_opprettet"]
