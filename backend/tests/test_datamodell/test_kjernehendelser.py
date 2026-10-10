"""Registeret over hendelsene TS-kjernen skriver, docs/datamodell/kjernehendelser.toml (#320).

Her prøves formen på registeret og at kjernehendelser.md er generert. At typene,
artene og feltene er de kjernen eksporterer i kjerne/format.ts, prøver
kjerne/tester/register.test.ts.
"""

import copy

import pytest

from tests.test_datamodell.test_tabellregister import dm

kh = dm.kh


@pytest.fixture(scope="module")
def register():
    return kh.les()


def test_registeret_er_gyldig(register):
    assert kh.valider(register) == []


@pytest.mark.parametrize(
    ("endring", "melding"),
    [
        (lambda r: r["utsagn"][0].pop("beskrivelse"), "mangler beskrivelse"),
        (lambda r: r["standpunkt"][0].update(hjemmel="32.2"), "ukjent felt hjemmel"),
        (lambda r: r["krav"].append(copy.deepcopy(r["krav"][0])), "står to ganger"),
        (lambda r: r["svar"][0].update(spor="pris"), "ukjent spor pris"),
        (lambda r: r["utsagn"][0]["felt"].append("id"), "et felt to ganger"),
        (lambda r: r.update(arter=[]), "ukjent seksjon"),
    ],
)
def test_vakta_melder_feil_i_formen(register, endring, melding):
    endret = copy.deepcopy(register)
    endring(endret)
    assert any(melding in feil for feil in kh.valider(endret)), kh.valider(endret)


def test_markdown_er_generert_fra_registeret(register):
    assert kh.MARKDOWN.read_text(encoding="utf-8") == kh.markdown(register), (
        "kjernehendelser.md er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )
