"""Den felles lasteren for verktøymodulene i docs/verktoy/ (#861, #752).

Mappa er ingen pakke, og skriptene kjøres med stien, så modulene lastes etter
navn med `last("dataflyt")`. Et kall utenfra åpner et omfang som varer til
modulen er lastet. Innenfor omfanget får hver modul som laster en annen, samme
instans, og en modul laster selv det den trenger, uten at kalleren har lastet
det først. Neste kall utenfra får nye instanser, så to testmoduler deler ikke
modulene eller cachen i dem.

Lasteren selv er felles for prosessen, fordi omfanget må være det. Den kan
ikke laste seg selv, og den finnes bare under navnet `verktoy.laster`, så et
annet toppnivånavn ikke kolliderer med den (#958). Lastes en modul av denne
lasteren eller av testene (`backend/tests/verktoy.py`), står `verktoy.laster`
allerede i `sys.modules`. Kjøres modulen som skript, også med `python -P` eller `-I`,
legger den `docs/` til i `sys.path` og importerer `verktoy.laster` derfra.
"""

import importlib.util
import pathlib
import types

MAPPE = pathlib.Path(__file__).resolve().parent

_omfang: list[dict[str, types.ModuleType]] = []

if __name__ != "verktoy.laster":
    raise ImportError(f"{__file__} må lastes som verktoy.laster, ikke som {__name__}")


def last(*navn: str):
    """Verktøymodulene `navn` i docs/verktoy/, lastet i samme omfang. Ett navn gir
    modulen, flere gir en tuppel i samme rekkefølge."""
    ytterst = not _omfang
    if ytterst:
        _omfang.append({})
    try:
        moduler = tuple(_last_en(n, _omfang[-1]) for n in navn)
    finally:
        if ytterst:
            _omfang.pop()
    return moduler[0] if len(moduler) == 1 else moduler


def _last_en(navn: str, lastet: dict[str, types.ModuleType]) -> types.ModuleType:
    if navn not in lastet:
        spesifikasjon = importlib.util.spec_from_file_location(
            f"verktoy.{navn}", MAPPE / f"{navn}.py"
        )
        modul = importlib.util.module_from_spec(spesifikasjon)
        lastet[navn] = modul
        try:
            spesifikasjon.loader.exec_module(modul)
        except BaseException:
            del lastet[navn]
            raise
    return lastet[navn]
