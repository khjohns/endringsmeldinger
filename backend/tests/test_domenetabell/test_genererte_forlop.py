"""De genererte forløpene i sprakprove/genererte-forlop.json mot Python (#274, P1-6).

Samme generator og samme handlinger som `sprakprove/tester/genererte.test.ts`;
invariantene prøves i hver implementasjon for seg. Gjenlesingen her er en
rundtur gjennom CloudEvents-formen i minnet; lagringen prøves i databasebanen.
"""

import json
import pathlib

import pytest

from lib.auth.event_visibility import public_state
from models.events import parse_event
from tests.test_domenetabell import korpus
from tests.test_domenetabell.test_kravversjon_og_aksept import Domenebane

OPPSETT = json.loads(
    (pathlib.Path(__file__).resolve().parents[3] / "sprakprove" / "genererte-forlop.json").read_text(
        encoding="utf-8"
    )
)
SPOR = ("grunnlag", "vederlag", "frist")


def lcg(seed: int):
    """x = (1103515245·x + 12345) mod 2^31, som `lcg` i TS."""
    x = seed
    while True:
        x = (1103515245 * x + 12345) % 2**31
        yield x


def forlopene() -> list[list[dict]]:
    tall = lcg(OPPSETT["seed"])
    handlinger = OPPSETT["handlinger"]
    return [
        [handlinger[(next(tall) >> 16) % len(handlinger)] for _ in range(OPPSETT["lengde"])]
        for _ in range(OPPSETT["antall"])
    ]


def _gjenlest(bane: Domenebane) -> dict:
    rader = json.loads(json.dumps([h.to_cloudevent() for h in bane.hendelser], default=str))
    hendelser = [
        parse_event(
            {
                **rad["data"],
                "event_id": rad["id"],
                "sak_id": rad["subject"],
                "event_type": rad["type"].removeprefix("no.oslo.koe."),
                "tidsstempel": rad["time"],
                "aktor_id": rad["actorid"],
                "aktor_rolle": rad["actorrole"],
                "aktor_team_id": rad.get("actorteam"),
                "refererer_til_event_id": rad.get("referstoid"),
                "data": rad["data"],
            }
            | ({"sakstittel": "Domenetabell", "prosjekt_id": "p"} if rad["type"].endswith("sak_opprettet") else {})
        )
        for rad in rader
    ]
    return public_state(bane.timeline.compute_state(hendelser), hendelser)


def test_forlopene_er_som_oppsettet():
    f = forlopene()
    assert len(f) == OPPSETT["antall"] and all(len(s) == OPPSETT["lengde"] for s in f)


@pytest.mark.parametrize(("nummer", "steg"), list(enumerate(forlopene())))
def test_genererte_forlop(nummer, steg):
    bane = Domenebane()
    for h in korpus.KORPUS["prefikser"][OPPSETT["start"]]:
        if not bane.send(h)[0]:
            pytest.fail(f"Forutsetning: prefikset avviste {h['handling']}")
    for n, h in enumerate(steg, start=1):
        hvor = f"seed {OPPSETT['seed']}, forløp {nummer}, steg {n} ({h['handling']})"
        for_ = bane.sak()
        journal_for = bane.journal()
        godtatt, _ = bane.send(h)
        if not godtatt:
            assert bane.journal() == journal_for, f"INV-AVVIST-UENDRET {hvor}"
        elif h["handling"] == "aksept":
            spor = h["spor"]
            assert bane.hendelser[-1].refererer_til_event_id == getattr(for_, spor).gjeldende_respons_event_id, (
                f"INV-AKSEPT-GJELDENDE {hvor}"
            )
            assert bane.tilstand()[spor]["te_akseptert"], f"INV-AKSEPT-GJELDENDE {hvor}"
        tilstand = bane.tilstand()
        venter = any(
            tilstand[s]["krav_event_id"] is not None and tilstand[s]["gjeldende_respons_event_id"] is None
            for s in SPOR
        )
        if venter:
            assert tilstand["overordnet_status"] != "OMFORENT", f"INV-UBESVART-IKKE-OMFORENT {hvor}"
        assert _gjenlest(bane) == tilstand, f"INV-GJENLESING {hvor}"
