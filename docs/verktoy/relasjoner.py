"""Relasjonsregisteret i docs/datamodell/relasjoner.toml (spor M, fase 1c).

Brukes av datamodell.py. Fremmednøklene, nøklene og kolonnene hentes fra
katalog.json, så registeret beskriver bare det katalogen ikke kan svare på:
hva koblingen betyr, og koblingene basen ikke kjenner.

`fra` og `til` er «tabell.kolonne», eller en liste av dem for en sammensatt
nøkkel: kolonnene i samme tabell og i samme rekkefølge som i fremmednøkkelen
(#590).
"""

import pathlib
import re

import tomllib

ROT = pathlib.Path(__file__).resolve().parents[2]
REGISTER = ROT / "docs" / "datamodell" / "relasjoner.toml"

RELASJONSFELT = ("fra", "til", "art", "antall", "beskrivelse", "funn", "belegg")
VALGFRIE_FELT = ("json_sti",)
ARTER = ("fremmednøkkel", "logisk")
ANTALL = ("mange til én", "én til én", "mange til mange")
# json_sti gjelder enden som er en av disse JSON-kolonnene; `fra` om begge er det.
JSON_KOLONNER = ("data", "body")
# Kolonner som ser ut som en nøkkel eller en personreferanse. Hver av dem skal
# være med i en relasjon eller stå under [[uten_relasjon]].
NØKKELKOLONNE = re.compile(r"(id|_by|_av|team|^project|email)$")
FUNN_ID = re.compile(r"^[A-Z][A-Z0-9]*-\d{2}$")


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as fil:
        return tomllib.load(fil)


def tekst(verdi) -> str:
    return " ".join(str(verdi).split())


# Delene i katalog.json og lagringen de er. Tabellene i SQL Server har navn
# kvalifisert med skjemaet, så de kolliderer ikke med PostgreSQL-tabellene (#558).
LAGRINGER = (("postgresql", "PostgreSQL"), ("sqlite", "SQLite"), ("sqlserver", "SQL Server"))


def tabeller(katalog: dict) -> dict[str, dict]:
    """Alle tabellene, med lagringen lagt til."""
    resultat = {}
    for lag, navn in LAGRINGER:
        for tabell, innhold in katalog[lag]["tabeller"].items():
            resultat[tabell] = {**innhold, "lagring": navn}
    return resultat


def kolonne(katalog: dict, referanse: str) -> list[str] | None:
    """[navn, type, nullbarhet] for «tabell.kolonne», eller None."""
    tabell, _, navn = referanse.rpartition(".")
    for rad in tabeller(katalog).get(tabell, {}).get("kolonner", []):
        if rad[0] == navn:
            return rad
    return None


Nøkkel = tuple[tuple[str, ...], tuple[str, ...]]


def kolonner(r: dict, ende: str) -> list[str]:
    """Kolonnene i enden, som «tabell.kolonne»; én for en vanlig nøkkel."""
    verdi = r[ende]
    return list(verdi) if isinstance(verdi, list) else [verdi]


def tabell(r: dict, ende: str) -> str:
    return kolonner(r, ende)[0].rpartition(".")[0]


def nøkkel(r: dict) -> Nøkkel:
    return tuple(kolonner(r, "fra")), tuple(kolonner(r, "til"))


def fremmednøkler(katalog: dict) -> dict[Nøkkel, str]:
    """{(fra-kolonnene, til-kolonnene): ved_sletting} for hver fremmednøkkel, også en sammensatt."""
    return {
        (
            tuple(f"{tabell}.{k}" for k in fk["kolonner"]),
            tuple(f"{fk['til']}.{k}" for k in fk["til_kolonner"]),
        ): fk["ved_sletting"]
        for tabell, innhold in tabeller(katalog).items()
        for fk in innhold["fremmednøkler"]
    }


def _referanse(referanser: tuple[str, ...] | list[str]) -> str:
    """«tabell.kolonne», eller «tabell.(a, b)» for en sammensatt nøkkel."""
    if len(referanser) == 1:
        return referanser[0]
    tabellnavn = referanser[0].rpartition(".")[0]
    return f"{tabellnavn}.({', '.join(r.rpartition('.')[2] for r in referanser)})"


def _formfeil(r: dict) -> str | None:
    lengder = []
    for ende in ("fra", "til"):
        verdi = r[ende]
        if isinstance(verdi, list):
            if len(verdi) < 2 or not all(isinstance(v, str) for v in verdi):
                return f"{ende} er en liste, men ikke av minst to kolonner"
            if len({v.rpartition(".")[0] for v in verdi}) != 1:
                return f"kolonnene i {ende} står i ulike tabeller"
        elif not isinstance(verdi, str):
            return f"{ende} er verken en kolonne eller en liste av kolonner"
        lengder.append(len(kolonner(r, ende)))
    if lengder[0] != lengder[1]:
        return "fra og til har ulikt antall kolonner"
    if "json_sti" in r and lengder[0] != 1:
        return "json_sti gjelder bare en nøkkel med én kolonne"
    return None


def _enkel_primærnøkkel(katalog: dict, referanse: str) -> bool:
    tabell, _, navn = referanse.rpartition(".")
    return tabeller(katalog).get(tabell, {}).get("primærnøkkel") == [navn]


def nøkkelkolonner(katalog: dict) -> list[str]:
    """Kolonnene som ser ut som nøkler, utenom en primærnøkkel på én kolonne."""
    return [
        f"{tabell}.{rad[0]}"
        for tabell, innhold in tabeller(katalog).items()
        for rad in innhold["kolonner"]
        if NØKKELKOLONNE.search(rad[0]) and innhold["primærnøkkel"] != [rad[0]]
    ]


def valider(register: dict, katalog: dict, funntekst: str | None = None) -> list[str]:
    feil = []
    fk = fremmednøkler(katalog)
    sett = set()
    gyldige = []
    for r in register.get("relasjon", []):
        hvor = f"{r.get('fra')} → {r.get('til')}"
        if not set(RELASJONSFELT) <= set(r) <= set(RELASJONSFELT + VALGFRIE_FELT):
            feil.append(f"{hvor}: feltene skal være {RELASJONSFELT}, og eventuelt {VALGFRIE_FELT}")
            continue
        if formfeil := _formfeil(r):
            feil.append(f"{hvor}: {formfeil}")
            continue
        gyldige.append(r)
        hvor = f"{_side(r, 'fra')} → {_side(r, 'til')}"
        identitet = (nøkkel(r), r.get("json_sti"))
        if identitet in sett:
            feil.append(f"{hvor}: står to ganger")
        sett.add(identitet)
        if r["art"] not in ARTER:
            feil.append(f"{hvor}: art {r['art']!r} er ikke en av {ARTER}")
        if r["antall"] not in ANTALL:
            feil.append(f"{hvor}: antall {r['antall']!r} er ikke en av {ANTALL}")
        for felt in ("beskrivelse", "belegg"):
            if not tekst(r[felt]):
                feil.append(f"{hvor}: {felt} er tomt")
        er_fk = nøkkel(r) in fk
        if r["art"] == "fremmednøkkel" and not er_fk:
            feil.append(f"{hvor}: står som fremmednøkkel, men katalogen har ingen slik")
        if r["art"] == "logisk" and any(set(zip(*nøkkel(r))) <= set(zip(*k)) for k in fk):
            feil.append(f"{hvor}: står som logisk, men katalogen har en fremmednøkkel")
        for ende in ("fra", "til"):
            if er_fk and ende == "til":
                continue
            for referanse in kolonner(r, ende):
                if kolonne(katalog, referanse) is None:
                    feil.append(f"{hvor}: kolonnen {referanse} finnes ikke i katalogen")
        if "json_sti" in r and _json_ende(r) is None:
            feil.append(f"{hvor}: json_sti uten at noen ende er en av {JSON_KOLONNER}")
        for funn in r["funn"]:
            if not FUNN_ID.match(funn):
                feil.append(f"{hvor}: {funn!r} er ikke en funn-ID")
            elif funntekst is not None and not re.search(rf"\b{re.escape(funn)}\b", funntekst):
                feil.append(f"{hvor}: {funn} står ikke i hovedplanens funnregister")
    beskrevet = {nøkkel(r) for r in gyldige if r["art"] == "fremmednøkkel"}
    for fra, til in sorted(set(fk) - beskrevet):
        feil.append(f"fremmednøkkelen {_referanse(fra)} → {_referanse(til)} i katalogen mangler oppføring")
    i_relasjon = {k for r in gyldige for e in ("fra", "til") for k in kolonner(r, e)}
    uten = {}
    for u in register.get("uten_relasjon", []):
        if set(u) != {"kolonne", "begrunnelse"} or not tekst(u.get("begrunnelse", "")):
            feil.append(f"uten_relasjon {u}: feltene skal være kolonne og begrunnelse")
            continue
        if kolonne(katalog, u["kolonne"]) is None:
            feil.append(f"uten_relasjon: kolonnen {u['kolonne']} finnes ikke i katalogen")
        if u["kolonne"] in i_relasjon:
            feil.append(f"uten_relasjon: {u['kolonne']} er med i en relasjon")
        uten[u["kolonne"]] = u
    for navn in nøkkelkolonner(katalog):
        if navn not in i_relasjon and navn not in uten:
            feil.append(f"{navn}: ser ut som en nøkkel, men har verken relasjon eller begrunnelse")
    return feil


# ---------------------------------------------------------------------------
# Tekst til tabellbeskrivelsen og arket «Relasjoner»
# ---------------------------------------------------------------------------


def _json_ende(r: dict) -> str | None:
    for ende in ("fra", "til"):
        if any(k.rpartition(".")[2] in JSON_KOLONNER for k in kolonner(r, ende)):
            return ende
    return None


def _side(r: dict, ende: str) -> str:
    """«tabell.kolonne» eller «tabell.(a, b)», med stien inne i JSON-kolonnen når den
    hører til denne enden."""
    referanse = _referanse(kolonner(r, ende))
    if r.get("json_sti") and _json_ende(r) == ende:
        return f"{referanse} → {r['json_sti']}"
    return referanse


def _kolonneside(r: dict, ende: str) -> str:
    """Som `_side`, uten tabellen; tabellnavnet i SQL Server har selv et punktum."""
    return _side(r, ende).removeprefix(tabell(r, ende) + ".")


def _nøkler(innhold: dict) -> str:
    deler = []
    if innhold["primærnøkkel"]:
        deler.append(f"primærnøkkel ({', '.join(innhold['primærnøkkel'])})")
    deler += [f"unik ({', '.join(u)})" for u in innhold["unike"]]
    deler += [f"unik indeks {u}" for u in innhold.get("unike_indekser", [])]
    return "; ".join(deler) or "ingen"


def tabelltekst(register: dict, katalog: dict, navn: str) -> str:
    """Kolonne 7 i tabellbeskrivelsen: nøkler og relasjoner, fra registeret og katalogen."""
    fk = fremmednøkler(katalog)
    innhold = tabeller(katalog)[navn]
    ut = [r for r in register["relasjon"] if tabell(r, "fra") == navn]
    inn = [r for r in register["relasjon"] if tabell(r, "til") == navn and tabell(r, "fra") != navn]

    def art(r):
        if r["art"] == "fremmednøkkel":
            return f"fremmednøkkel, ON DELETE {fk[nøkkel(r)]}"
        return "uten fremmednøkkel"

    linjer = [f"Nøkler: {_nøkler(innhold)}."]
    if ut:
        linjer.append(
            "Viser til: "
            + "; ".join(f"{_kolonneside(r, 'fra')} → {_side(r, 'til')} ({art(r)})" for r in ut)
            + "."
        )
    if inn:
        linjer.append(
            "Vises til fra: "
            + "; ".join(f"{_side(r, 'fra')} ({art(r)})" for r in sorted(inn, key=lambda r: kolonner(r, "fra")))
            + "."
        )
    if not ut and not inn:
        linjer.append("Ingen relasjoner til andre tabeller.")
    return " ".join(linjer)


RELASJONSKOLONNER = [
    "Fra tabell",
    "Fra kolonne",
    "Til tabell",
    "Til kolonne",
    "Art",
    "Antall",
    "Ved sletting",
    "Beskrivelse",
]


def relasjonsrader(register: dict, katalog: dict) -> list[list[str]]:
    fk = fremmednøkler(katalog)
    rader = [RELASJONSKOLONNER]
    for r in register["relasjon"]:
        rader.append(
            [
                tabell(r, "fra"),
                _kolonneside(r, "fra"),
                tabell(r, "til"),
                _kolonneside(r, "til"),
                "Fremmednøkkel" if r["art"] == "fremmednøkkel" else "Uten fremmednøkkel",
                r["antall"],
                fk.get(nøkkel(r), ""),
                tekst(r["beskrivelse"]),
            ]
        )
    return rader


# ---------------------------------------------------------------------------
# ER-diagrammet
# ---------------------------------------------------------------------------


def _entitet(navn: str) -> str:
    return re.sub(r"\W", "_", navn)


def _mermaidtype(type_: str) -> str:
    return re.sub(r"\W+", "_", type_).strip("_") or "ukjent"


_KARDINALITET = {
    # til-siden først, så fra-siden, som i «til ||--o{ fra».
    "mange til én": ("||", "o{"),
    "én til én": ("||", "o|"),
    "mange til mange": ("}o", "o{"),
}


def _linje(r: dict, katalog: dict) -> str:
    venstre, høyre = _KARDINALITET[r["antall"]]
    rader = [kolonne(katalog, k) for k in kolonner(r, "fra")]
    if venstre == "||" and (r["art"] == "logisk" or any(rad and rad[2] == "NULL" for rad in rader)):
        venstre = "|o"
    strek = "--" if r["art"] == "fremmednøkkel" else ".."
    etikett = _kolonneside(r, "fra")
    return (
        f"    {_entitet(tabell(r, 'til'))} {venstre}{strek}{høyre} "
        f"{_entitet(tabell(r, 'fra'))} : \"{etikett}\""
    )


def _attributter(
    relasjoner: list[dict], katalog: dict, fk: dict, entitet: str, med: set[str] | None
) -> list[str]:
    """Nøkkelkolonnene og kolonnene i en tegnet relasjon; `med` begrenser til disse."""
    innhold = tabeller(katalog).get(entitet)
    logiske = {k for r in relasjoner if r["art"] == "logisk" for k in kolonner(r, "fra")}
    i_relasjon = {k for r in relasjoner for e in ("fra", "til") for k in kolonner(r, e)}
    unike = {k for u in innhold["unike"] for k in u}
    fk_kolonner = {k for fra, _ in fk for k in fra}
    linjer = []
    for navn, type_, _ in innhold["kolonner"]:
        fullt = f"{entitet}.{navn}"
        merker = []
        if navn in innhold["primærnøkkel"]:
            merker.append("PK")
        if fullt in fk_kolonner:
            merker.append("FK")
        if navn in unike:
            merker.append("UK")
        if not merker and fullt not in i_relasjon:
            continue
        if med is not None and navn not in med:
            continue
        deler = [_mermaidtype(type_), navn]
        if merker:
            deler.append(", ".join(merker))
        if fullt in logiske and "FK" not in merker:
            deler.append('"uten fremmednøkkel"')
        linjer.append("        " + " ".join(deler))
    return linjer


def er_diagram(register: dict, katalog: dict, lagring: str) -> str:
    """Mermaid. «PostgreSQL» og «SQL Server»: tabellene der og koblingene mellom dem.
    «SQLite»: SQLite-tabellene og koblingene fra og til dem, med tabellene i
    PostgreSQL de viser til."""
    alle = tabeller(katalog)

    def lag(r: dict, ende: str) -> str:
        return alle.get(tabell(r, ende), {}).get("lagring", "PostgreSQL")

    if lagring != "SQLite":
        relasjoner = [r for r in register["relasjon"] if lag(r, "fra") == lag(r, "til") == lagring]
        entiteter = {t: None for t, i in alle.items() if i["lagring"] == lagring}
    else:
        relasjoner = [r for r in register["relasjon"] if "SQLite" in (lag(r, "fra"), lag(r, "til"))]
        entiteter = {t: None for t, i in alle.items() if i["lagring"] == "SQLite"}
        for r in relasjoner:
            for ende in ("fra", "til"):
                if lag(r, ende) == "PostgreSQL":
                    entiteter.setdefault(tabell(r, ende), set()).update(
                        k.rpartition(".")[2] for k in kolonner(r, ende)
                    )
    fk = fremmednøkler(katalog)
    linjer = ["erDiagram"]
    for navn, med in entiteter.items():
        linjer.append(f"    {_entitet(navn)} {{")
        linjer += _attributter(relasjoner, katalog, fk, navn, med)
        linjer.append("    }")
    ytre: dict[str, dict[str, str]] = {}
    for r in relasjoner:
        if tabell(r, "til") not in alle:
            # Utenfor `public`; typen er den fremmednøkkelen har.
            for til, fra in zip(kolonner(r, "til"), kolonner(r, "fra"), strict=True):
                ytre.setdefault(tabell(r, "til"), {})[til.rpartition(".")[2]] = _mermaidtype(
                    kolonne(katalog, fra)[1]
                )
    for navn, typer in ytre.items():
        linjer.append(f"    {_entitet(navn)} {{")
        linjer += [f"        {type_} {k} PK" for k, type_ in typer.items()]
        linjer.append("    }")
    linjer += [_linje(r, katalog) for r in relasjoner]
    return "\n".join(linjer)
