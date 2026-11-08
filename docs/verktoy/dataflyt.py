"""Dataflyten mellom tabellene og Catenda i docs/datamodell/dataflyt.toml (spor M, 1c).

Brukes av datamodell.py. Hver kodereferanse i en pil er et symbol deklarert på
toppnivå i en TS-fil i server/. Ingen kontroll her finner et kall til Catenda som
mangler en pil.
"""

import copy
import functools
import pathlib
import re
import sys

import tomllib

if "verktoy.laster" not in sys.modules:
    sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from verktoy.laster import last

ROT = pathlib.Path(__file__).resolve().parents[2]
REGISTER = ROT / "docs" / "datamodell" / "dataflyt.toml"

rel = last("relasjoner")

FLYTFELT = ("id", "navn", "retning", "utloses_av", "beskrivelse", "steg", "funn", "belegg")
VALGFRIE_FLYTFELT = ("drift",)
STEGFELT = ("fra", "til", "endepunkt", "kode", "data")
RETNINGER = ("inn", "ut", "inn og ut")
FLYT_ID = re.compile(r"^C\d{2}$")
FUNN_ID = re.compile(r"^[A-Z][A-Z0-9]*-\d{2}$")
KVITTERING = "catenda:svar"
KODEREFERANSE = re.compile(r"^(server/[\w/]+\.ts):([\w.$]+)$")
TS_DEKLARASJON = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+|abstract\s+)?"
    r"(?:function\s*\*\s*|(?:(?:const\s+)?enum|function|const|let|var|class|interface|type)\s+)"
    r"([\w$]+)",
    re.MULTILINE,
)


def _ts_kode(tekst: str) -> str:
    """TS-teksten med kommentarer, strenger og malstrenger byttet ut med mellomrom, så
    en linje som begynner med `const` i en SQL-mal, ikke leses som deklarasjon (#861).
    Linjeskiftene står, og koden i `${...}` beholdes. Regulære uttrykk kjennes ikke."""
    ut: list[str] = []
    maler: list[int] = []  # klammedybden i hver åpne `${...}`
    i, n = 0, len(tekst)

    def blankt(slutt: int) -> None:
        ut.append(re.sub(r"[^\n]", " ", tekst[i:slutt]))

    while i < n:
        c, to = tekst[i], tekst[i : i + 2]
        if to == "//":
            slutt = tekst.find("\n", i)
            slutt = n if slutt < 0 else slutt
        elif to == "/*":
            slutt = tekst.find("*/", i + 2)
            slutt = n if slutt < 0 else slutt + 2
        elif c in "'\"":
            m = re.compile(rf"{c}(?:\\.|[^{c}\\\n])*{c}?").match(tekst, i)
            slutt = m.end()
        elif c == "`" or (c == "}" and maler and maler[-1] == 0):
            if c == "}":
                maler.pop()
            m = re.compile(r"(?:\\.|[^`\\$]|\$(?!\{))*(`|\$\{)?").match(tekst, i + 1)
            slutt = m.end()
            if m.group(1) == "${":
                maler.append(0)
        else:
            if maler and c == "{":
                maler[-1] += 1
            elif maler and c == "}":
                maler[-1] -= 1
            ut.append(c)
            i += 1
            continue
        blankt(slutt)
        i = slutt
    return "".join(ut)


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as fil:
        return tomllib.load(fil)


@functools.cache
def definisjoner(relativ: str) -> frozenset[str]:
    """Navnene deklarert på toppnivå i en TS-fil (#713)."""
    return frozenset(TS_DEKLARASJON.findall(_ts_kode((ROT / relativ).read_text(encoding="utf-8"))))


def noder(katalog: dict, tabellregister: dict, register: dict) -> dict[str, str]:
    """Hver node en pil kan gå fra eller til, med visningsnavn."""
    resultat = {f"catenda:{r['id']}": f"Catenda: {r['navn']}" for r in register["catenda"]}
    for lag, _ in rel.LAGRINGER:
        resultat |= {t: t for t in katalog[lag]["tabeller"]}
    resultat |= {u["navn"]: u["navn"] for u in tabellregister.get("utenfor", [])}
    resultat["appen"] = "Appen, lagres ikke"
    return resultat


def valider(
    register: dict,
    katalog: dict,
    tabellregister: dict,
    funntekst: str | None = None,
) -> list[str]:
    feil = []
    kjente = noder(katalog, tabellregister, register)
    sett = set()
    feil += [f"{seksjon}: ukjent seksjon" for seksjon in sorted(set(register) - {"catenda", "flyt"})]
    for ressurs in register.get("catenda", []):
        if set(ressurs) != {"id", "navn"}:
            feil.append(f"catenda-ressursen {ressurs}: feltene skal være id og navn")
    for flyt in register.get("flyt", []):
        fid = flyt.get("id", "<uten id>")
        if not set(FLYTFELT) <= set(flyt) <= set(FLYTFELT + VALGFRIE_FLYTFELT):
            feil.append(f"{fid}: feltene skal være {FLYTFELT} og eventuelt {VALGFRIE_FLYTFELT}, ikke {sorted(flyt)}")
            continue
        if not FLYT_ID.match(fid) or fid in sett:
            feil.append(f"{fid}: ID-en må være C og to sifre, og unik")
        sett.add(fid)
        if flyt["retning"] not in RETNINGER:
            feil.append(f"{fid}: retning {flyt['retning']!r} er ikke en av {RETNINGER}")
        if not flyt["steg"]:
            feil.append(f"{fid}: en flyt uten piler")
        for n, steg in enumerate(flyt["steg"], start=1):
            hvor = f"{fid}.{n}"
            if set(steg) != set(STEGFELT):
                feil.append(f"{hvor}: feltene skal være {STEGFELT}, ikke {sorted(steg)}")
                continue
            for ende in [steg["fra"], *steg["til"]]:
                if ende not in kjente:
                    feil.append(f"{hvor}: {ende!r} er verken en tabell, en Catenda-ressurs eller «appen»")
            if not any(e.startswith("catenda:") for e in [steg["fra"], *steg["til"]]):
                feil.append(f"{hvor}: en pil i dataflyten mot Catenda må gå fra eller til Catenda")
            if not steg["kode"]:
                feil.append(f"{hvor}: pilen viser ikke til koden som gjør kallet")
            for kode in steg["kode"]:
                treff = KODEREFERANSE.match(kode)
                if not treff:
                    feil.append(f"{hvor}: {kode!r} er ikke på formen server/…/fil.ts:symbol")
                elif not (ROT / treff[1]).exists():
                    feil.append(f"{hvor}: fila {treff[1]} finnes ikke")
                elif treff[2] not in definisjoner(treff[1]):
                    feil.append(f"{hvor}: {treff[2]} er ikke definert i {treff[1]}")
        for funn in flyt["funn"]:
            if not FUNN_ID.match(funn):
                feil.append(f"{fid}: {funn!r} er ikke en funn-ID")
            elif funntekst is not None and not re.search(rf"\b{re.escape(funn)}\b", funntekst):
                feil.append(f"{fid}: {funn} står ikke i hovedplanens funnregister")
    return feil


def piler(register: dict) -> list[dict]:
    """Én rad per pil: et steg med flere mål blir flere piler."""
    rader = []
    for flyt in register["flyt"]:
        for n, steg in enumerate(flyt["steg"], start=1):
            for til in steg["til"]:
                rader.append({"flyt": flyt, "nr": f"{flyt['id']}.{n}", "steg": steg, "til": til})
    return rader


def flyter_per_tabell(register: dict) -> dict[str, dict[str, list[str]]]:
    """{tabell: {'fra': [inn fra Catenda], 'til': [ut til Catenda], 'kvittering': [utfall av kall]}}.

    En pil fra «svar på kallene» er ikke data fra Catenda, bare hvordan kallene gikk.
    """
    tom = {"fra": [], "til": [], "kvittering": []}
    resultat: dict[str, dict[str, list[str]]] = {}
    for pil in piler(register):
        fra, til, fid = pil["steg"]["fra"], pil["til"], pil["flyt"]["id"]
        if fra == KVITTERING:
            liste = resultat.setdefault(til, copy.deepcopy(tom))["kvittering"]
        elif fra.startswith("catenda:") and not til.startswith("catenda:"):
            liste = resultat.setdefault(til, copy.deepcopy(tom))["fra"]
        elif til.startswith("catenda:") and not fra.startswith("catenda:"):
            liste = resultat.setdefault(fra, copy.deepcopy(tom))["til"]
        else:
            continue
        if fid not in liste:
            liste.append(fid)
    return resultat


# ---------------------------------------------------------------------------
# Visning
# ---------------------------------------------------------------------------


def tekst(verdi) -> str:
    return " ".join(str(verdi).split())


def kortnavn(kode: str) -> str:
    """Symbolet i `fil.ts:symbol`."""
    return kode.rpartition(":")[2]


def _node_id(navn: str) -> str:
    if navn.startswith("catenda:"):
        return "c_" + navn.removeprefix("catenda:")
    return "t_" + re.sub(r"\W", "_", navn)


def flytdiagram(register: dict, katalog: dict, tabellregister: dict, retning: str) -> str:
    """Mermaid. «inn»: pilene fra Catenda. «ut»: pilene til Catenda. Begge uten
    driftsflytene. «drift»: pilene i flytene drift utløser."""
    navn = noder(katalog, tabellregister, register)
    valgt = [
        p
        for p in piler(register)
        if (
            p["flyt"].get("drift", False)
            if retning == "drift"
            else not p["flyt"].get("drift", False)
            and (p["steg"]["fra"] if retning == "inn" else p["til"]).startswith("catenda:")
        )
    ]
    brukt = {p["steg"]["fra"] for p in valgt} | {p["til"] for p in valgt}
    grupper = {
        "Catenda": [n for n in navn if n.startswith("catenda:")],
        **{navn: list(katalog[lag]["tabeller"]) for lag, navn in rel.LAGRINGER},
        "Utenfor databasene": [u["navn"] for u in tabellregister.get("utenfor", [])],
    }
    linjer = ["flowchart LR"]
    for n, (gruppe, medlemmer) in enumerate(grupper.items()):
        med = [m for m in medlemmer if m in brukt]
        if not med:
            continue
        linjer.append(f'    subgraph g{n}["{gruppe}"]')
        linjer += [f'        {_node_id(m)}["{navn[m].removeprefix("Catenda: ")}"]' for m in med]
        linjer.append("    end")
    if "appen" in brukt:
        linjer.append(f'    t_appen(["{navn["appen"]}"])')
    for p in valgt:
        etikett = f"{p['nr']} {kortnavn(p['steg']['kode'][-1])}"
        linjer.append(f'    {_node_id(p["steg"]["fra"])} -->|"{etikett}"| {_node_id(p["til"])}')
    return "\n".join(linjer)


def _visningsnavn(navn: str, kjente: dict[str, str]) -> str:
    return kjente.get(navn, navn)


DATAFLYTKOLONNER = [
    "Pil",
    "Flyt",
    "Retning",
    "Utløses av",
    "Fra",
    "Til",
    "Catenda-endepunkt",
    "Kode",
    "Data",
]


def dataflytrader(register: dict, katalog: dict, tabellregister: dict) -> list[list[str]]:
    kjente = noder(katalog, tabellregister, register)
    rader = [DATAFLYTKOLONNER]
    for p in piler(register):
        flyt, steg = p["flyt"], p["steg"]
        rader.append(
            [
                p["nr"],
                f"{flyt['id']} {flyt['navn']}",
                flyt["retning"],
                tekst(flyt["utloses_av"]),
                _visningsnavn(steg["fra"], kjente),
                _visningsnavn(p["til"], kjente),
                tekst(steg["endepunkt"]),
                "; ".join(steg["kode"]),
                tekst(steg["data"]),
            ]
        )
    return rader


def _celle(verdi: str) -> str:
    return verdi.replace("|", "\\|")


def _kodelenke(kode: str) -> str:
    fil, _, symbol = kode.partition(":")
    return f"[`{symbol}`](../../{fil})"


def flytseksjoner(register: dict, katalog: dict, tabellregister: dict) -> list[str]:
    kjente = noder(katalog, tabellregister, register)
    linjer = []
    for flyt in register["flyt"]:
        linjer += [
            f"### {flyt['id']} {flyt['navn']}",
            "",
            f"**Retning:** {flyt['retning']}. **Utløses av:** {tekst(flyt['utloses_av'])}",
            "",
            tekst(flyt["beskrivelse"]),
            "",
            "| Pil | Fra | Til | Endepunkt | Kode | Data |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for n, steg in enumerate(flyt["steg"], start=1):
            linjer.append(
                "| "
                + " | ".join(
                    [
                        f"{flyt['id']}.{n}",
                        _celle(_visningsnavn(steg["fra"], kjente)),
                        _celle(", ".join(_visningsnavn(t, kjente) for t in steg["til"])),
                        _celle(tekst(steg["endepunkt"])),
                        _celle(" → ".join(_kodelenke(k) for k in steg["kode"])),
                        _celle(tekst(steg["data"])),
                    ]
                )
                + " |"
            )
        linjer += [
            "",
            f"**Funn:** {', '.join(flyt['funn']) or '—'}. **Belegg:** {tekst(flyt['belegg'])}",
            "",
        ]
    return linjer


def tabelltekst(register: dict, tabell: str) -> str:
    """Tillegget i kolonne 6: flytene som henter til eller sender fra tabellen."""
    flyter = flyter_per_tabell(register).get(tabell)
    if not flyter:
        return "Dataflyt: ingen kall til Catenda skriver eller leser tabellen."
    deler = []
    if flyter["fra"]:
        deler.append("fra Catenda i " + ", ".join(flyter["fra"]))
    if flyter["til"]:
        deler.append("til Catenda i " + ", ".join(flyter["til"]))
    if flyter["kvittering"]:
        deler.append("kvittering for kall til Catenda i " + ", ".join(flyter["kvittering"]))
    return "Dataflyt: " + "; ".join(deler) + " (arket Dataflyt)."
