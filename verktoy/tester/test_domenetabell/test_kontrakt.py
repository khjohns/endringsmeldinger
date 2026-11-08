"""Validatoren for skjemaet i `docs/domenetabell/kontrakt.json` (#272). Den er
testenes eget verktøy, så den prøves mot kjente avvik."""

from test_domenetabell import kontrakt


def test_skjemaet_bruker_bare_noekkelordene_validatoren_kan():
    assert kontrakt.ukjente_nokkelord() == []


def test_validatoren_finner_avvik():
    """Validatoren er testens eget verktøy, så den prøves mot kjente avvik."""
    skjema = {
        "type": "object",
        "properties": {"a": {"type": ["string", "null"]}, "b": {"enum": [1, 2]}},
        "required": ["a"],
        "additionalProperties": False,
    }
    assert kontrakt.feil_i({"a": None, "b": 2}, skjema) == []
    assert kontrakt.feil_i({"b": 2}, skjema) == ["$.a: mangler"]
    assert kontrakt.feil_i({"a": 1}, skjema) == ["$.a: 1 er ikke string/null"]
    assert kontrakt.feil_i({"a": "x", "c": 1}, skjema) == ["$.c: ukjent felt"]
    assert kontrakt.feil_i({"a": "x", "b": 3}, skjema) == ["$.b: 3 er ikke en av [1, 2]"]
    assert kontrakt.ukjente_nokkelord({"pattern": "x"}) == ["#: pattern"]
