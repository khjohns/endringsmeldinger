"""Kontrollen av domenetabellen i `docs/verktoy/domenetabell.py`, med radene og
bevis-sakene den leser. Testene her prøver kontrollen, ikke en implementasjon av
reglene."""

import importlib.util
import pathlib

ROT = pathlib.Path(__file__).resolve().parents[3]


def _verktoy():
    spesifikasjon = importlib.util.spec_from_file_location(
        "domenetabell", ROT / "docs" / "verktoy" / "domenetabell.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


verktoy = _verktoy()
REGLER, KORPUS = verktoy.les()
