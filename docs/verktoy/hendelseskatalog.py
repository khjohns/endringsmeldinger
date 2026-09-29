"""Hendelseskatalogen i docs/datamodell/hendelser.toml (spor M, fase 1b).

Brukes av datamodell.py, som skriver visningene. Feltene i `data` og
forretningsreglene hentes fra backend-koden, så verktøyet krever
backend-avhengighetene (venv-en i AGENTS.md).
"""

import enum
import pathlib
import re
import sys
import types
import typing
from datetime import date, datetime
from types import SimpleNamespace

import tomllib

ROT = pathlib.Path(__file__).resolve().parents[2]
BACKEND = ROT / "backend"
KATALOG = ROT / "docs" / "datamodell" / "hendelser.toml"
MARKDOWN = ROT / "docs" / "datamodell" / "hendelser.md"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from models import events
from pydantic import BaseModel, ValidationError
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService

HENDELSESFELT = (
    "navn",
    "beskrivelse",
    "avsender",
    "spor",
    "sakstype",
    "ns8407",
    "ns8407_kilde",
    "modell",
    "data",
    "lagres_i",
    "innsending",
    "tilstand",
    "behandler",
    "funn",
    "belegg",
)
KONVOLUTTFELT = ("felt", "kolonne", "beskrivelse")
AVSENDERE = ("TE", "BH", "TE eller BH")
SPOR = ("grunnlag", "vederlag", "frist", "valgt i hendelsen", "ingen")
SAKSTYPER = ("standard", "forsering", "endringsordre")
LAGRES_I = ("hendelse", "notat")
KILDER = ("vedtak:", "kode:", "oppdragsgiver", "ikke kontrollert")
FUNN_ID = re.compile(r"^[A-Z][A-Z0-9]*-\d{2}$")

TYPER_KOLONNER = [
    "Hendelsestype",
    "Beskrivelse",
    "Hvem sender",
    "Spor",
    "Sakstype",
    "Bestemmelse i NS 8407",
    "Kilde for bestemmelsen",
    "Virkning på status",
    "Lagres i",
]
FELT_KOLONNER = ["Hendelsestype", "Felt", "Type", "Påkrevd", "Beskrivelse"]

ENKLE_TYPER = {
    str: "tekst",
    int: "heltall",
    float: "tall",
    bool: "ja/nei",
    dict: "objekt",
    datetime: "tidspunkt",
    date: "dato",
    type(None): "null",
}


def les(sti: pathlib.Path = KATALOG) -> dict:
    with sti.open("rb") as fil:
        return tomllib.load(fil)


def tekst(verdi) -> str:
    if isinstance(verdi, list):
        return "; ".join(tekst(v) for v in verdi)
    return " ".join(str(verdi).split())


# ---------------------------------------------------------------------------
# Form og fullstendighet
# ---------------------------------------------------------------------------


def valider(katalog: dict, funntekst: str | None = None) -> list[str]:
    """Formkontroll av oppføringene. Kontrollen mot koden er `mot_koden`."""
    feil = []
    sett = set()
    for h in katalog.get("hendelse", []):
        navn = h.get("navn", "<uten navn>")
        ukjente = set(h) - set(HENDELSESFELT)
        mangler = [f for f in HENDELSESFELT if f not in h]
        if ukjente:
            feil.append(f"{navn}: ukjente felt {sorted(ukjente)}")
        if mangler:
            feil.append(f"{navn}: mangler {mangler}")
            continue
        if navn in sett:
            feil.append(f"{navn}: står to ganger")
        sett.add(navn)
        if h["avsender"] not in AVSENDERE:
            feil.append(f"{navn}: avsender {h['avsender']!r} er ikke en av {AVSENDERE}")
        if h["spor"] not in SPOR:
            feil.append(f"{navn}: spor {h['spor']!r} er ikke en av {SPOR}")
        if not h["sakstype"] or not set(h["sakstype"]) <= set(SAKSTYPER):
            feil.append(f"{navn}: sakstype må være en ikke-tom del av {SAKSTYPER}")
        if h["lagres_i"] not in LAGRES_I:
            feil.append(f"{navn}: lagres_i {h['lagres_i']!r} er ikke en av {LAGRES_I}")
        for felt in ("beskrivelse", "ns8407", "tilstand", "belegg", "innsending"):
            if not tekst(h[felt]):
                feil.append(f"{navn}: {felt} er tomt; skriv «ikke kontrollert» hvis det er svaret")
        for del_ in tekst(h["ns8407_kilde"]).split(";"):
            if not del_.strip().startswith(KILDER):
                feil.append(
                    f"{navn}: kilden {del_.strip()!r} må begynne med en av {KILDER}"
                )
        if tekst(h["ns8407"]).lower().startswith("ikke kontrollert") and tekst(
            h["ns8407_kilde"]
        ) != "ikke kontrollert":
            feil.append(f"{navn}: en bestemmelse som ikke er kontrollert, har ingen kilde")
        for funn in h["funn"]:
            if not FUNN_ID.match(funn):
                feil.append(f"{navn}: {funn!r} er ikke en funn-ID")
            elif funntekst is not None and not re.search(rf"\b{re.escape(funn)}\b", funntekst):
                feil.append(f"{navn}: {funn} står ikke i hovedplanens funnregister")
    for k in katalog.get("konvolutt", []):
        if set(k) != set(KONVOLUTTFELT):
            feil.append(f"konvolutt {k.get('felt')}: feltene skal være {KONVOLUTTFELT}")
    return feil


def avvik(katalog: dict, typer: set[str]) -> tuple[list[str], list[str]]:
    """Typer uten oppføring, og oppføringer uten type."""
    ført = {h["navn"] for h in katalog.get("hendelse", [])}
    return sorted(typer - ført), sorted(ført - typer)


def typene_i_koden() -> set[str]:
    return {t.value for t in events.EventType}


# ---------------------------------------------------------------------------
# Opplysninger hentet fra koden
# ---------------------------------------------------------------------------


def modell_i_koden(navn: str) -> str:
    """Klassen `parse_event` validerer typen mot.

    Tabellen i `parse_event` er lokal. En tom hendelse feiler valideringen i
    den klassen typen er knyttet til, og feilen bærer klassens navn.
    """
    try:
        events.parse_event({"event_type": navn})
    except ValidationError as feil:
        return feil.title
    raise AssertionError(f"{navn}: en tom hendelse ble godtatt")


def avsender_i_koden(navn: str) -> str:
    """Hvem rollekontrollen (ROLE_CHECK) slipper gjennom."""
    kontroll = BusinessRuleValidator()
    tillatt = [
        rolle
        for rolle in ("TE", "BH")
        if kontroll.validate_actor_role(
            SimpleNamespace(event_type=events.EventType(navn), aktor_rolle=rolle)
        ).is_valid
    ]
    return " eller ".join(tillatt) or "ingen"


def regler_i_koden(navn: str) -> list[str]:
    """Reglene `validate` kjører. Et notat lagres før de kjøres (MS-05)."""
    return [
        regel
        for regel, _ in BusinessRuleValidator()._get_rules_for_event(events.EventType(navn))
    ]


def _datatyper(klasse) -> list[type]:
    felt = klasse.model_fields.get("data")
    if felt is None:
        return []
    annotasjon = felt.annotation
    return list(typing.get_args(annotasjon)) or [annotasjon]


def mot_koden(katalog: dict) -> list[str]:
    """Avsender, modell, datamodell og behandler må stemme med koden.

    Det viser at katalogen beskriver koden, ikke at koden er riktig.
    """
    feil = []
    for h in katalog.get("hendelse", []):
        navn = h["navn"]
        if navn not in typene_i_koden():
            continue
        if (faktisk := avsender_i_koden(navn)) != h["avsender"]:
            feil.append(f"{navn}: katalogen sier avsender {h['avsender']}, rollekontrollen {faktisk}")
        if (faktisk := modell_i_koden(navn)) != h["modell"]:
            feil.append(f"{navn}: katalogen sier modell {h['modell']}, parse_event {faktisk}")
            continue
        klasse = getattr(events, h["modell"])
        datanavn = [t.__name__ for t in _datatyper(klasse)]
        if (h["data"] or None) not in (datanavn or [None]):
            feil.append(f"{navn}: data {h['data']!r} er ikke en av {datanavn or ['(ingen)']}")
        if not callable(getattr(TimelineService, h["behandler"], None)):
            feil.append(f"{navn}: TimelineService har ikke {h['behandler']}")
    return feil


# ---------------------------------------------------------------------------
# Feltene i `data`
# ---------------------------------------------------------------------------


def typenavn(annotasjon, funnet: dict | None = None) -> str:
    """Lesbar type. Delmodeller og verdilister samles i `funnet`."""
    opphav = typing.get_origin(annotasjon)
    argumenter = typing.get_args(annotasjon)
    if opphav is typing.Annotated:
        return typenavn(argumenter[0], funnet)
    if opphav in (typing.Union, types.UnionType):
        return " | ".join(typenavn(a, funnet) for a in argumenter if a is not type(None))
    if opphav is typing.Literal:
        return " | ".join(f"«{a}»" for a in argumenter)
    if opphav is list:
        return f"liste av {typenavn(argumenter[0], funnet)}" if argumenter else "liste"
    if opphav is dict:
        return "objekt"
    if isinstance(annotasjon, type) and issubclass(annotasjon, (BaseModel, enum.Enum)):
        if funnet is not None and annotasjon.__name__ not in funnet:
            funnet[annotasjon.__name__] = annotasjon
            if issubclass(annotasjon, BaseModel):
                modellfelt(annotasjon, funnet)
        return annotasjon.__name__
    return ENKLE_TYPER.get(annotasjon, getattr(annotasjon, "__name__", str(annotasjon)))


def modellfelt(
    modell, funnet: dict | None = None, utelat: frozenset = frozenset(), beregnede: bool = True
) -> list[dict]:
    rader = [
        {
            "felt": navn,
            "type": typenavn(felt.annotation, funnet),
            "pakrevd": "ja" if felt.is_required() else "nei",
            "beskrivelse": tekst(felt.description or ""),
        }
        for navn, felt in modell.model_fields.items()
        if navn not in utelat
    ]
    if beregnede:
        rader += [
            {
                "felt": navn,
                "type": typenavn(felt.return_type, funnet),
                "pakrevd": "beregnet",
                "beskrivelse": tekst(felt.description or "Beregnes av modellen og lagres med resten."),
            }
            for navn, felt in modell.model_computed_fields.items()
        ]
    return rader


def _konvoluttfelt() -> frozenset[str]:
    return frozenset(events.SakEvent.model_fields)


def datafelt(h: dict, funnet: dict | None = None) -> list[dict]:
    """Feltene slik de havner i `data` i journalen.

    `to_cloudevent` lagrer datamodellen med beregnede felt. Har hendelsen ingen
    datamodell, lagres toppnivåfeltene utenom konvolutten, og der hører
    `prosjekt_id` med. `spor` legges alltid inn i `data`.
    """
    klasse = getattr(events, h["modell"])
    if h["data"]:
        rader = modellfelt(getattr(events, h["data"]), funnet)
    else:
        rader = modellfelt(
            klasse, funnet, utelat=_konvoluttfelt() - {"prosjekt_id"}, beregnede=False
        )
    if "spor" in klasse.model_fields and h["data"]:
        felt = klasse.model_fields["spor"]
        rader.append(
            {
                "felt": "spor",
                "type": typenavn(felt.annotation, funnet),
                "pakrevd": "ja" if felt.is_required() else "nei",
                "beskrivelse": "Står på toppnivå i modellen og legges i `data` ved lagring.",
            }
        )
    return rader


def felt_som_ikke_lagres(h: dict) -> list[str]:
    """Toppnivåfelt i modellen som `to_cloudevent` ikke tar med (DM-06)."""
    if not h["data"]:
        return []
    klasse = getattr(events, h["modell"])
    return [
        navn
        for navn in klasse.model_fields
        if navn not in _konvoluttfelt() | {"data", "spor"}
    ]


def delmodeller(katalog: dict) -> dict:
    funnet: dict = {}
    for h in katalog.get("hendelse", []):
        datafelt(h, funnet)
    return dict(sorted(funnet.items()))


# ---------------------------------------------------------------------------
# Visningene
# ---------------------------------------------------------------------------


def typerader(katalog: dict) -> list[list[str]]:
    rader = [TYPER_KOLONNER]
    for h in katalog["hendelse"]:
        rader.append(
            [
                h["navn"],
                tekst(h["beskrivelse"]),
                h["avsender"],
                h["spor"],
                ", ".join(h["sakstype"]),
                tekst(h["ns8407"]),
                tekst(h["ns8407_kilde"]),
                tekst(h["tilstand"]),
                h["lagres_i"],
            ]
        )
    return rader


def feltrader(katalog: dict) -> list[list[str]]:
    rader = [FELT_KOLONNER]
    for h in katalog["hendelse"]:
        for f in datafelt(h):
            rader.append([h["navn"], f["felt"], f["type"], f["pakrevd"], f["beskrivelse"] or "—"])
    for navn, modell in delmodeller(katalog).items():
        if issubclass(modell, BaseModel):
            for f in modellfelt(modell):
                rader.append(
                    [f"Delmodell {navn}", f["felt"], f["type"], f["pakrevd"], f["beskrivelse"] or "—"]
                )
    return rader


def _celle(verdi: str) -> str:
    return verdi.replace("|", "\\|")


def _felttabell(rader: list[dict]) -> list[str]:
    if not rader:
        return ["Ingen felt.", ""]
    linjer = ["| Felt | Type | Påkrevd | Beskrivelse |", "| --- | --- | --- | --- |"]
    linjer += [
        f"| `{r['felt']}` | {_celle(r['type'])} | {r['pakrevd']} | {_celle(r['beskrivelse']) or '—'} |"
        for r in rader
    ]
    return linjer + [""]


def _regler(h: dict) -> str:
    if h["lagres_i"] == "notat":
        return "Kjøres ikke: notatet lagres før reglene"
    return ", ".join(regler_i_koden(h["navn"]))


def _feltnavn(felt: str) -> str:
    return felt if felt.startswith("(") else f"`{felt}`"


def markdown(katalog: dict, merknad: str) -> str:
    linjer = [
        "# Hendelseskatalogen",
        "",
        f"> {merknad}",
        "",
        (
            "Hver hendelsestype i `EventType`: hvem som sender den, spor, bestemmelse "
            "i NS 8407, feltene og hva den gjør med status. Hendelsene ligger i "
            "tabellen [`hendelse`](tabeller.md#hendelse), med innholdet i `data`; "
            "interne notater ligger i [`notat`](tabeller.md#notat). Sakens samlede "
            "status (`overordnet_status`) regnes av sporstatusene i `models/sak_state.py`."
        ),
        "",
        (
            "Hvem som sender, modellen, forretningsreglene og feltene er hentet fra "
            "koden, og testene i `backend/tests/test_datamodell/` holder dem like. "
            "Det viser at katalogen beskriver koden, ikke at koden er riktig. "
            "Beskrivelsen, bestemmelsen og virkningen på status er skrevet for hånd, "
            "med belegg."
        ),
        "",
        "## Bestemmelsene og kildene",
        "",
        "| Kilde | Betyr |",
        "| --- | --- |",
        "| vedtak | Et vedtak i hovedplanen (3.1) eller en ADR |",
        "| kode | Koden oppgir bestemmelsen. Ikke kontrollert mot standardteksten, som ikke ligger i repoet |",
        "| oppdragsgiver | Oppdragsgivers svar, med dato |",
        "| ikke kontrollert | Ingen har kontrollert det |",
        "",
        "## Felles for alle hendelser",
        "",
        "Konvolutten, som `to_cloudevent` legger i egne kolonner, ikke i `data`.",
        "",
        "| Felt i modellen | Kolonne | Innhold |",
        "| --- | --- | --- |",
    ]
    linjer += [
        f"| {_feltnavn(k['felt'])} | `{k['kolonne']}` | {_celle(tekst(k['beskrivelse']))} |"
        for k in katalog.get("konvolutt", [])
    ]
    linjer += [
        "",
        "## Oversikt",
        "",
        "| Hendelsestype | Hvem sender | Spor | Sakstype | Lagres i |",
        "| --- | --- | --- | --- | --- |",
    ]
    linjer += [
        f"| [`{h['navn']}`](#{h['navn']}) | {h['avsender']} | {h['spor']} | "
        f"{', '.join(h['sakstype'])} | `{h['lagres_i']}` |"
        for h in katalog["hendelse"]
    ]
    linjer.append("")
    for h in katalog["hendelse"]:
        modell = f"`{h['modell']}`" + (f", data `{h['data']}`" if h["data"] else ", feltene på toppnivå")
        linjer += [
            f"### `{h['navn']}`",
            "",
            tekst(h["beskrivelse"]),
            "",
            "| | |",
            "| --- | --- |",
            f"| Hvem sender | {h['avsender']} |",
            f"| Spor | {h['spor']} |",
            f"| Sakstype | {', '.join(h['sakstype'])} |",
            f"| NS 8407 | {_celle(tekst(h['ns8407']))} |",
            f"| Kilde for bestemmelsen | {_celle(tekst(h['ns8407_kilde']))} |",
            f"| Modell | {modell} |",
            f"| Lagres i | `{h['lagres_i']}` |",
            f"| Sendes fra | {_celle(tekst(h['innsending']))} |",
            f"| Forretningsregler | {_regler(h)} |",
            f"| Virkning på status | {_celle(tekst(h['tilstand']))} |",
            f"| Behandler | `TimelineService.{h['behandler']}` |",
            f"| Funn | {', '.join(h['funn']) or '—'} |",
            f"| Belegg | {_celle(tekst(h['belegg']))} |",
            "",
            "Feltene i `data`:",
            "",
        ]
        linjer += _felttabell(datafelt(h))
        if ikke_lagret := felt_som_ikke_lagres(h):
            linjer += [
                "Toppnivåfelt i modellen som ikke lagres: "
                + ", ".join(f"`{f}`" for f in ikke_lagret)
                + ".",
                "",
            ]
    linjer += ["## Delmodeller og verdilister", ""]
    for navn, modell in delmodeller(katalog).items():
        linjer += [f"### {navn}", ""]
        if issubclass(modell, enum.Enum):
            linjer += [", ".join(f"`{v.value}`" for v in modell), ""]
        else:
            linjer += _felttabell(modellfelt(modell))
    return "\n".join(linjer).rstrip() + "\n"
