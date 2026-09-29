"""Dataflyten mellom tabellene og Catenda i docs/datamodell/dataflyt.toml (spor M, 1c).

Brukes av datamodell.py. Kallene til Catenda finnes med AST, ikke med tekstsøk:
en metode i klientlaget som selv gjør et HTTP-kall, eller kaller en som gjør det,
er et Catenda-kall. Hvert sted utenfor klientlaget som kaller en slik metode,
skal stå som kode i en pil eller under [[uten_flyt]] med begrunnelse.
"""

import ast
import functools
import pathlib
import re

import tomllib

ROT = pathlib.Path(__file__).resolve().parents[2]
BACKEND = ROT / "backend"
REGISTER = ROT / "docs" / "datamodell" / "dataflyt.toml"

KLIENTLAG = (
    "backend/integrations/catenda/",
    "backend/lib/auth/catenda_oauth.py",
    "backend/services/catenda_service.py",
)
IKKE_KLIENTLAG = ("backend/integrations/catenda/_demo.py",)
HTTP_PRIMITIVER = frozenset({"_safe_request", "_make_request", "_request"})
UTENFOR_SKANNING = ("backend/tests/", "backend/venv/", "backend/.venv/")

FLYTFELT = ("id", "navn", "retning", "utloses_av", "beskrivelse", "steg", "funn", "belegg")
VALGFRIE_FLYTFELT = ("drift",)
STEGFELT = ("fra", "til", "endepunkt", "kode", "data")
RETNINGER = ("inn", "ut", "inn og ut")
FLYT_ID = re.compile(r"^C\d{2}$")
DATABASEFUNKSJON = "databasefunksjon:"
KODEREFERANSE = re.compile(r"^(backend/[\w/]+\.py):([\w.]+)$")


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as fil:
        return tomllib.load(fil)


def _relativ(fil: pathlib.Path) -> str:
    return fil.relative_to(ROT).as_posix()


def _python_filer():
    for fil in sorted(BACKEND.rglob("*.py")):
        relativ = _relativ(fil)
        if not relativ.startswith(UTENFOR_SKANNING):
            yield relativ, fil


def _i_klientlaget(relativ: str) -> bool:
    return relativ.startswith(KLIENTLAG) and relativ not in IKKE_KLIENTLAG


def _kallnavn(node: ast.AST) -> str | None:
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
        return node.func.attr
    return None


def _gjor_http(node: ast.AST) -> bool:
    for kall in ast.walk(node):
        if not isinstance(kall, ast.Call) or not isinstance(kall.func, ast.Attribute):
            continue
        if kall.func.attr in HTTP_PRIMITIVER:
            return True
        if isinstance(kall.func.value, ast.Name) and kall.func.value.id == "requests":
            return True
    return False


@functools.cache
def catenda_metoder() -> frozenset[str]:
    """Navnene på metodene i klientlaget som fører til et HTTP-kall."""
    funksjoner: dict[str, list[ast.AST]] = {}
    for relativ, fil in _python_filer():
        if not _i_klientlaget(relativ):
            continue
        for node in ast.walk(ast.parse(fil.read_text(encoding="utf-8"))):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not node.name.startswith("__"):
                funksjoner.setdefault(node.name, []).append(node)
    metoder = {navn for navn, noder in funksjoner.items() if any(_gjor_http(n) for n in noder)}
    metoder |= HTTP_PRIMITIVER
    endret = True
    while endret:
        endret = False
        for navn, noder in funksjoner.items():
            if navn in metoder:
                continue
            if any(_kallnavn(k) in metoder for n in noder for k in ast.walk(n)):
                metoder.add(navn)
                endret = True
    return frozenset(metoder)


class _Kallsteder(ast.NodeVisitor):
    def __init__(self, metoder: frozenset[str]):
        self.metoder = metoder
        self.sti: list[str] = []
        self.funnet: set[tuple[str, str]] = set()

    def _omslutt(self, node):
        self.sti.append(node.name)
        self.generic_visit(node)
        self.sti.pop()

    visit_ClassDef = _omslutt
    visit_FunctionDef = _omslutt
    visit_AsyncFunctionDef = _omslutt

    def visit_Call(self, node: ast.Call):
        navn = _kallnavn(node)
        if navn in self.metoder:
            self.funnet.add((".".join(self.sti) or "<modul>", navn))
        self.generic_visit(node)


def kallsteder(unntak: frozenset[str] = frozenset()) -> dict[str, set[str]]:
    """{'fil:funksjon': {metodene den kaller}} for hvert kall til Catenda."""
    metoder = catenda_metoder() - unntak
    resultat: dict[str, set[str]] = {}
    for relativ, fil in _python_filer():
        if _i_klientlaget(relativ):
            continue
        besøk = _Kallsteder(metoder)
        besøk.visit(ast.parse(fil.read_text(encoding="utf-8")))
        for funksjon, metode in besøk.funnet:
            resultat.setdefault(f"{relativ}:{funksjon}", set()).add(metode)
    return resultat


@functools.cache
def definisjoner(relativ: str) -> frozenset[str]:
    """Kvalifiserte navn på klassene og funksjonene i en fil."""
    tre = ast.parse((ROT / relativ).read_text(encoding="utf-8"))
    navn: set[str] = set()

    def besøk(node, forelder: str):
        for barn in ast.iter_child_nodes(node):
            if isinstance(barn, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                fullt = f"{forelder}.{barn.name}" if forelder else barn.name
                navn.add(fullt)
                besøk(barn, fullt)
            else:
                besøk(barn, forelder)

    besøk(tre, "")
    return frozenset(navn)


def udekkede_kallsteder(register: dict, steder: dict[str, set[str]]) -> list[str]:
    dekket = {k for f in register.get("flyt", []) for s in f.get("steg", []) for k in s.get("kode", [])}
    unntatt_fil = {u["fil"] for u in register.get("uten_flyt", []) if "funksjon" not in u}
    unntatt = {f"{u['fil']}:{u['funksjon']}" for u in register.get("uten_flyt", []) if "funksjon" in u}
    return sorted(
        f"{sted} kaller {', '.join(sorted(metoder))}"
        for sted, metoder in steder.items()
        if sted not in dekket and sted not in unntatt and sted.split(":")[0] not in unntatt_fil
    )


def noder(katalog: dict, tabellregister: dict, register: dict) -> dict[str, str]:
    """Hver node en pil kan gå fra eller til, med visningsnavn."""
    resultat = {f"catenda:{r['id']}": f"Catenda: {r['navn']}" for r in register["catenda"]}
    for lag in ("postgresql", "sqlite"):
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
    funksjoner = set(katalog["postgresql"]["funksjoner"])
    sett = set()
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
                if kode.startswith(DATABASEFUNKSJON):
                    if kode.removeprefix(DATABASEFUNKSJON) not in funksjoner:
                        feil.append(f"{hvor}: {kode} finnes ikke i katalogen")
                    continue
                treff = KODEREFERANSE.match(kode)
                if not treff:
                    feil.append(f"{hvor}: {kode!r} er ikke på formen backend/…/fil.py:Klasse.funksjon")
                elif not (ROT / treff[1]).exists():
                    feil.append(f"{hvor}: fila {treff[1]} finnes ikke")
                elif treff[2] not in definisjoner(treff[1]):
                    feil.append(f"{hvor}: {treff[2]} er ikke definert i {treff[1]}")
        for funn in flyt["funn"]:
            if funntekst is not None and not re.search(rf"\b{re.escape(funn)}\b", funntekst):
                feil.append(f"{fid}: {funn} står ikke i hovedplanens funnregister")
    for unntak in register.get("uten_flyt", []):
        if not {"fil", "begrunnelse"} <= set(unntak) <= {"fil", "funksjon", "begrunnelse"}:
            feil.append(f"uten_flyt {unntak}: feltene skal være fil, begrunnelse og eventuelt funksjon")
        elif not (ROT / unntak["fil"]).exists():
            feil.append(f"uten_flyt: fila {unntak['fil']} finnes ikke")
        elif "funksjon" in unntak and unntak["funksjon"] not in definisjoner(unntak["fil"]):
            feil.append(f"uten_flyt: {unntak['funksjon']} er ikke definert i {unntak['fil']}")
    for navn in register.get("autentisering", []):
        if navn not in catenda_metoder():
            feil.append(f"autentisering: {navn} er ikke en metode i klientlaget som kaller Catenda")
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
    """{tabell: {'fra': [flyt-ID-er inn fra Catenda], 'til': [ut til Catenda]}}."""
    resultat: dict[str, dict[str, list[str]]] = {}
    for pil in piler(register):
        fra, til, fid = pil["steg"]["fra"], pil["til"], pil["flyt"]["id"]
        if fra.startswith("catenda:") and not til.startswith("catenda:"):
            liste = resultat.setdefault(til, {"fra": [], "til": []})["fra"]
        elif til.startswith("catenda:") and not fra.startswith("catenda:"):
            liste = resultat.setdefault(fra, {"fra": [], "til": []})["til"]
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
    """`Klasse.funksjon` eller navnet på databasefunksjonen."""
    return kode.removeprefix(DATABASEFUNKSJON).rpartition(":")[2]


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
        "PostgreSQL": list(katalog["postgresql"]["tabeller"]),
        "SQLite": list(katalog["sqlite"]["tabeller"]),
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
    "Kode eller databasefunksjon",
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
    if kode.startswith(DATABASEFUNKSJON):
        return f"databasefunksjonen `{kode.removeprefix(DATABASEFUNKSJON)}`"
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
    return "Dataflyt: " + "; ".join(deler) + " (arket Dataflyt)."
