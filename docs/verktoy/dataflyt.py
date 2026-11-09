"""Dataflyten mellom tabellene og Catenda i docs/datamodell/dataflyt.toml (spor M, 1c).

Brukes av datamodell.py. Hver kodereferanse i en pil er et symbol deklarert på
toppnivå i en TS-fil i server/, og hvert kall til Catenda i server/ har en pil med
samme metode og sti (`kall_uten_pil`, #1718).
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
# Kallene til Catenda i server/ (#1718)
# ---------------------------------------------------------------------------

CATENDAKLIENT = "server/catenda.ts"
KLIENTKALL = re.compile(r"(?<![\w$.#])forespoersel\b")
FUNKSJON = re.compile(
    r"^[ \t]*(?:export\s+)?(?:static\s+)?(?:async\s+)?(?:function\s*\*?\s*)?(#?[A-Za-z_$][\w$]*)\s*\(",
    re.MULTILINE,
)
IKKE_FUNKSJON = {"if", "for", "while", "switch", "catch", "return", "await", "throw", "new", "typeof"}
PIL_ENDEPUNKT = re.compile(r"^([A-Z]+(?: og [A-Z]+)*) (/[^\s?]+)")
FETCH = re.compile(r"(?<![\w$])fetch\b(?!\s*\??:)")
# Filene i server/ som bruker `fetch` mot en annen tjeneste enn Catenda: Entra ID og HR-dataene.
ANDRE_TJENESTER = frozenset({"server/entra.ts", "server/hrdata.ts"})


class UkjentSti(ValueError):
    """Stien i et kall til Catenda kan ikke avgjøres ut av koden."""


def _serverfiler() -> dict[str, str]:
    return {
        str(sti.relative_to(ROT)): sti.read_text(encoding="utf-8")
        for sti in sorted((ROT / "server").rglob("*.ts"))
        if "tester" not in sti.relative_to(ROT / "server").parts
    }


def _slutt(kode: str, start: int, aapne: str, lukke: str) -> int:
    """Posisjonen etter klammen som lukker den som står på `start`."""
    dybde = 0
    for i in range(start, len(kode)):
        if kode[i] == aapne:
            dybde += 1
        elif kode[i] == lukke:
            dybde -= 1
            if dybde == 0:
                return i + 1
    raise UkjentSti(f"klammen ved {start} lukkes ikke")


def _argumenter(kode: str, raa: str, start: int) -> list[str]:
    """Argumentene i kallet som åpner med parentesen på `start`, fra den rå teksten."""
    slutt = _slutt(kode, start, "(", ")") - 1
    deler, dybde, fra = [], 0, start + 1
    for i in range(start + 1, slutt):
        if kode[i] in "([{":
            dybde += 1
        elif kode[i] in ")]}":
            dybde -= 1
        elif kode[i] == "," and dybde == 0:
            deler.append(raa[fra:i].strip())
            fra = i + 1
    deler.append(raa[fra:slutt].strip())
    return [d for d in deler if d]


class _Fil:
    """Én TS-fil: funksjonene og metodene med parametrene og kroppen."""

    def __init__(self, navn: str, raa: str):
        self.navn, self.raa, self.kode = navn, raa, _ts_kode(raa)
        self.funksjoner: list[dict] = []
        # `{ … }` i import og eksport, også over flere linjer.
        self.navnelister = [
            m.span(1) for m in re.finditer(r"\b(?:import|export)\s*(?:type\s*)?(\{[^{}]*\})", self.kode)
        ]
        for m in FUNKSJON.finditer(self.kode):
            if m[1] in IKKE_FUNKSJON:
                continue
            parentes = m.end() - 1
            etter = _slutt(self.kode, parentes, "(", ")")
            # Kroppen åpner med klammen som avslutter linja, etter en eventuell returtype.
            kropp = re.compile(r"[ \t]*(?::[^\n]*)?\{[ \t]*\n").match(self.kode, etter)
            if not kropp:
                continue
            start = self.kode.rindex("{", 0, kropp.end())
            parametre = [
                (re.match(r"[\s{\[.]*(?:readonly\s+)?([\w$]*)", p) or [None, ""])[1]
                for p in _argumenter(self.kode, raa, parentes)
            ]
            self.funksjoner.append(
                {
                    "navn": m[1],
                    "parametre": parametre,
                    "start": start,
                    "slutt": _slutt(self.kode, start, "{", "}"),
                    # Innrykket: en metode i en klasse, kalt som `x.navn(`.
                    "metode": m[0][:1] in " \t",
                }
            )

    def rundt(self, pos: int) -> dict | None:
        inni = [f for f in self.funksjoner if f["start"] < pos < f["slutt"]]
        return min(inni, key=lambda f: f["slutt"] - f["start"]) if inni else None

    def funksjon(self, navn: str) -> dict | None:
        return next((f for f in self.funksjoner if f["navn"] == navn and not f["metode"]), None)


class _Kallgraf:
    def __init__(self, filer: dict[str, str]):
        self.filer = {navn: _Fil(navn, raa) for navn, raa in filer.items()}

    def stier(self, fil: _Fil, uttrykk: str, rundt: dict | None, dybde: int = 0) -> set[str]:
        """Stiene `uttrykk` kan ha, med `{}` for hver verdi koden setter inn."""
        if dybde > 20:
            raise UkjentSti(uttrykk)
        u = uttrykk.strip()
        if m := re.fullmatch(r"'([^'\\]*)'|\"([^\"\\]*)\"", u):
            return {m[1] if m[1] is not None else m[2]}
        if u.startswith("`") and u.endswith("`"):
            return self._mal(fil, u[1:-1], rundt, dybde)
        if m := re.fullmatch(r"([A-Za-z_$][\w$]*)\s*\((.*)\)", u, re.DOTALL):
            hjelper = fil.funksjon(m[1])
            if not hjelper:
                raise UkjentSti(u)
            return self._returnerer(fil, hjelper, dybde)
        if re.fullmatch(r"[A-Za-z_$][\w$]*", u) and rundt:
            # Navnet må ha én binding i funksjonen, så en annen blokk eller en pilfunksjon
            # ikke kan gi det en annen verdi.
            b = _bindinger(fil.kode[rundt["start"] : rundt["slutt"]], u)
            if b["annen"] or b["pil"] or b["tilordning"]:
                raise UkjentSti(f"{u} bindes flere steder i {rundt['navn']}")
            if u in rundt["parametre"] and not b["const"]:
                return self._fra_kallerne(fil, rundt, rundt["parametre"].index(u), dybde)
            if b["const"] == 1 and u not in rundt["parametre"] and (verdi := self._konstant(fil, u, rundt)):
                return self.stier(fil, verdi, rundt, dybde + 1)
        raise UkjentSti(u)

    def _mal(self, fil: _Fil, mal: str, rundt: dict | None, dybde: int) -> set[str]:
        resultat = {""}
        i = 0
        while i < len(mal):
            j = mal.find("${", i)
            if j < 0:
                resultat = {r + mal[i:] for r in resultat}
                break
            dybden, k = 0, j + 1
            while True:
                dybden += {"{": 1, "}": -1}.get(mal[k], 0)
                k += 1
                if dybden == 0:
                    break
            try:
                deler = self.stier(fil, mal[j + 2 : k - 1], rundt, dybde + 1)
                if not all(d.startswith("/") for d in deler):
                    deler = {"{}"}
            except UkjentSti:
                deler = {"{}"}
            resultat = {r + mal[i:j] + d for r in resultat for d in deler}
            i = k
        return resultat

    def _konstant(self, fil: _Fil, navn: str, rundt: dict) -> str | None:
        m = re.search(rf"\bconst\s+{re.escape(navn)}\s*(?::[^=]+)?=", fil.kode[rundt["start"] : rundt["slutt"]])
        if not m:
            return None
        fra = rundt["start"] + m.end()
        slutt = fra
        dybde = 0
        while slutt < rundt["slutt"]:
            c = fil.kode[slutt]
            if c in "([{":
                dybde += 1
            elif c in ")]}":
                dybde -= 1
            elif c == ";" and dybde == 0:
                break
            slutt += 1
        return fil.raa[fra:slutt]

    def _returnerer(self, fil: _Fil, hjelper: dict, dybde: int) -> set[str]:
        resultat: set[str] = set()
        kropp = fil.kode[hjelper["start"] : hjelper["slutt"]]
        for m in re.finditer(r"\breturn\b", kropp):
            fra = hjelper["start"] + m.end()
            slutt = fil.kode.find(";", fra)
            resultat |= self.stier(fil, fil.raa[fra:slutt], hjelper, dybde + 1)
        if not resultat:
            raise UkjentSti(hjelper["navn"])
        return resultat

    def _fra_kallerne(self, fil: _Fil, funksjon: dict, nr: int, dybde: int) -> set[str]:
        """Stiene i argument nr. `nr` hos hver kaller av funksjonen, i hele server/."""
        navn = re.escape(funksjon["navn"])
        moenster = re.compile(rf"\.{navn}\b" if funksjon["metode"] else rf"(?<![\w$.#]){navn}\b")
        resultat: set[str] = set()
        for annen in self.filer.values():
            for m in moenster.finditer(annen.kode):
                kaller = annen.rundt(m.start())
                if _er_definisjon(annen.kode, m.start()):
                    continue
                if any(fra < m.start() < til for fra, til in annen.navnelister):
                    if re.compile(r"\s+as\b").match(annen.kode, m.end()):
                        raise UkjentSti(f"{annen.navn}: {funksjon['navn']} importeres med et annet navn")
                    continue
                if not re.compile(r"\s*\(").match(annen.kode, m.end()):
                    # Funksjonen brukes som verdi, så kallerne kan ikke finnes.
                    raise UkjentSti(f"{annen.navn}: {funksjon['navn']} brukes uten å kalles")
                if kaller is funksjon:
                    continue
                argumenter = _argumenter(annen.kode, annen.raa, annen.kode.index("(", m.end()))
                if nr >= len(argumenter):
                    raise UkjentSti(f"{annen.navn}: kallet til {funksjon['navn']} mangler argument {nr + 1}")
                resultat |= self.stier(annen, argumenter[nr], kaller, dybde + 1)
        if not resultat:
            raise UkjentSti(f"ingen kaller av {funksjon['navn']}")
        return resultat


def _er_definisjon(kode: str, pos: int) -> bool:
    return re.search(r"function\s*\*?\s*$", kode[max(0, pos - 40) : pos]) is not None


def _bindinger(kode: str, navn: str) -> dict[str, int]:
    """Hvor mange ganger `navn` bindes i `kode`: med const, med let eller var, som parameter
    i en pilfunksjon og ved tilordning."""
    n = re.escape(navn)
    pilparametre = [
        m[1] if m[1] is not None else m[2]
        for m in re.finditer(r"\(([^()]*)\)\s*(?::[^=;]*?)?=>|(?<![\w$.])([A-Za-z_$][\w$]*)\s*=>", kode)
    ]
    return {
        "const": len(re.findall(rf"\bconst\s+{n}\b", kode)),
        "annen": len(re.findall(rf"\b(?:let|var)\s+{n}\b|\b(?:const|let|var)\s*[{{\[][^=;]*\b{n}\b", kode)),
        "pil": sum(bool(re.search(rf"(?<![\w$.]){n}\b", p)) for p in pilparametre),
        "tilordning": len(re.findall(rf"(?<![\w$.]){n}\s*(?:[-+*/?|&]{{0,2}})=(?![=>])", kode))
        - len(re.findall(rf"\b(?:const|let|var)\s+{n}\s*(?::[^=;]*)?=", kode)),
    }


def _normalisert(sti: str) -> str:
    return re.sub(r"\{[^{}]*\}", "{}", sti)


def catendakall(filer: dict[str, str] | None = None) -> tuple[set[tuple[str, str, str]], list[str]]:
    """Kallene til Catenda i server/ som (metode, sti, fil:funksjon), og det vakta ikke kan avgjøre.

    Hvert kall går gjennom `forespoersel(this.#oppsett, metode, sti, …)` i server/catenda.ts.
    En sti som er en parameter, følges til hver kaller i server/, også utenfor fila. Hver
    verdi koden setter inn i stien, blir `{}`. `fetch` i en annen fil enn dem i
    `ANDRE_TJENESTER`, et kall til `forespoersel` utenfor klienten og en sti som ikke kan
    avgjøres, gir en feil. Det gjør også et navn i stien som bindes mer enn én gang i
    funksjonen, en funksjon med stien som brukes uten å kalles, og en import med `as`.

    Lesingen er tekstlig. Den ser ikke et kall gjennom en navnerommsimport (`c.raa(`), en
    metode kalt med hakeparentes eller fra en destrukturering, en parameter som får ny verdi
    ved destrukturerende tilordning eller i `catch`, og andre HTTP-klienter enn `fetch`.
    """
    filer = _serverfiler() if filer is None else filer
    graf = _Kallgraf(filer)
    kall: set[tuple[str, str, str]] = set()
    feil: list[str] = []
    for navn, fil in graf.filer.items():
        for m in FETCH.finditer(fil.kode):
            rundt = fil.rundt(m.start())
            if navn in ANDRE_TJENESTER or (
                navn == CATENDAKLIENT and rundt and rundt["navn"] == "forespoersel" and re.compile(r"\s*\(").match(fil.kode, m.end())
            ):
                continue
            feil.append(f"{navn}: fetch utenfor forespoersel i {CATENDAKLIENT} og utenfor ANDRE_TJENESTER")
        for m in KLIENTKALL.finditer(fil.kode):
            if _er_definisjon(fil.kode, m.start()):
                continue
            rundt = fil.rundt(m.start())
            hvor = f"{navn}:{rundt['navn'] if rundt else '?'}"
            parentes = re.compile(r"\s*\(").match(fil.kode, m.end())
            if navn != CATENDAKLIENT:
                # Klienten eksporterer ikke funksjonen, så navnet er et annet her, men et
                # kall med samme navn kan være en kopi av den.
                if parentes:
                    feil.append(f"{hvor}: forespoersel utenfor {CATENDAKLIENT}")
                continue
            if not parentes:
                feil.append(f"{hvor}: forespoersel brukes uten å kalles")
                continue
            argumenter = _argumenter(fil.kode, fil.raa, parentes.end() - 1)
            metode = re.fullmatch(r"'([A-Z]+)'", argumenter[1]) if len(argumenter) > 2 else None
            if not metode:
                feil.append(f"{hvor}: metoden i kallet kan ikke avgjøres")
                continue
            try:
                stier = graf.stier(fil, argumenter[2], rundt)
            except UkjentSti as e:
                feil.append(f"{hvor}: stien {argumenter[2]!r} kan ikke avgjøres ({e})")
                continue
            kall |= {(metode[1], _normalisert(s), hvor) for s in stier}
    return kall, feil


def pilkall(register: dict) -> set[tuple[str, str]]:
    """(metode, sti) for hver pil med et kall som endepunkt, med `{}` for plassholderne."""
    resultat = set()
    for flyt in register["flyt"]:
        for steg in flyt["steg"]:
            if m := PIL_ENDEPUNKT.match(tekst(steg["endepunkt"])):
                resultat |= {(metode, _normalisert(m[2])) for metode in m[1].split(" og ")}
    return resultat


def piler_uten_kall(register: dict, filer: dict[str, str] | None = None) -> list[str]:
    """Hver pil med et kall som endepunkt, uten et kall med samme metode og sti i server/."""
    kall = {(metode, sti) for metode, sti, _ in catendakall(filer)[0]}
    return sorted(f"{metode} {sti}" for metode, sti in pilkall(register) - kall)


def kall_uten_pil(register: dict, filer: dict[str, str] | None = None) -> list[str]:
    """Hvert kall til Catenda i server/ uten en pil med samme metode og sti, og det vakta
    ikke kan avgjøre (#1718)."""
    kall, feil = catendakall(filer)
    piler_ = pilkall(register)
    feil += sorted(
        f"{hvor}: {metode} {sti} har ingen pil i dataflyt.toml"
        for metode, sti, hvor in kall
        if (metode, sti) not in piler_
    )
    return feil


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
