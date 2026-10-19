"""Verktøymodulene i docs/verktoy/ for testene, lastet med den felles lasteren
der (docs/verktoy/laster.py, #861). Hvert kall gir nye instanser, så to
testmoduler deler ikke modulene eller cachen i dem."""

import importlib.util
import pathlib
import sys

MAPPE = pathlib.Path(__file__).resolve().parents[2] / "docs" / "verktoy"


def last(*navn: str):
    if "verktoy.laster" not in sys.modules:
        spesifikasjon = importlib.util.spec_from_file_location(
            "verktoy.laster", MAPPE / "laster.py"
        )
        modul = importlib.util.module_from_spec(spesifikasjon)
        sys.modules["verktoy.laster"] = modul
        try:
            spesifikasjon.loader.exec_module(modul)
        except BaseException:
            for n in ("verktoy.laster", "laster"):
                if sys.modules.get(n) is modul:
                    del sys.modules[n]
            raise
    return sys.modules["verktoy.laster"].last(*navn)
