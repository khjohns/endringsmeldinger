"""Relasjonsregisteret i docs/datamodell/relasjoner.toml (spor M, fase 1c).

Brukes av datamodell.py. Fremmednøklene, nøklene og kolonnene hentes fra
katalog.json, så registeret beskriver bare det katalogen ikke kan svare på:
hva koblingen betyr, og koblingene basen ikke kjenner.
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
NØKKELKOLONNE = re.compile(r"(id|_by|_av|team|^project)$")
FUNN_ID = re.compile(r"^[A-Z][A-Z0-9]*-\d{2}$")


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as fil:
        return tomllib.load(fil)


def tekst(verdi) -> str:
    return " ".join(str(verdi).split())


def tabeller(katalog: dict) -> dict[str, dict]:
    """Alle tabellene, med lagringen lagt til."""
    resultat = {}
    for lag, navn in (("postgresql", "PostgreSQL"), ("sqlite", "SQLite")):
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


def fremmednøkler(katalog: dict) -> dict[tuple[str, str], str]:
    """{(fra, til): ved_sletting} for hver fremmednøkkel med én kolonne."""
    resultat = {}
    for tabell, innhold in tabeller(katalog).items():
        for fk in innhold["fremmednøkler"]:
            for fra, til in zip(fk["kolonner"], fk["til_kolonner"], strict=True):
                resultat[(f"{tabell}.{fra}", f"{fk['til']}.{til}")] = fk["ved_sletting"]
    return resultat


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
    for r in register.get("relasjon", []):
        hvor = f"{r.get('fra')} → {r.get('til')}"
        if not set(RELASJONSFELT) <= set(r) <= set(RELASJONSFELT + VALGFRIE_FELT):
            feil.append(f"{hvor}: feltene skal være {RELASJONSFELT}, og eventuelt {VALGFRIE_FELT}")
            continue
        nøkkel = (r["fra"], r["til"], r.get("json_sti"))
        if nøkkel in sett:
            feil.append(f"{hvor}: står to ganger")
        sett.add(nøkkel)
        if r["art"] not in ARTER:
            feil.append(f"{hvor}: art {r['art']!r} er ikke en av {ARTER}")
        if r["antall"] not in ANTALL:
            feil.append(f"{hvor}: antall {r['antall']!r} er ikke en av {ANTALL}")
        for felt in ("beskrivelse", "belegg"):
            if not tekst(r[felt]):
                feil.append(f"{hvor}: {felt} er tomt")
        er_fk = (r["fra"], r["til"]) in fk
        if r["art"] == "fremmednøkkel" and not er_fk:
            feil.append(f"{hvor}: står som fremmednøkkel, men katalogen har ingen slik")
        if r["art"] == "logisk" and er_fk:
            feil.append(f"{hvor}: står som logisk, men katalogen har en fremmednøkkel")
        for ende in ("fra", "til"):
            if er_fk and ende == "til":
                continue
            rad = kolonne(katalog, r[ende])
            if rad is None:
                feil.append(f"{hvor}: kolonnen {r[ende]} finnes ikke i katalogen")
        if "json_sti" in r and _json_ende(r) is None:
            feil.append(f"{hvor}: json_sti uten at noen ende er en av {JSON_KOLONNER}")
        for funn in r["funn"]:
            if not FUNN_ID.match(funn):
                feil.append(f"{hvor}: {funn!r} er ikke en funn-ID")
            elif funntekst is not None and not re.search(rf"\b{re.escape(funn)}\b", funntekst):
                feil.append(f"{hvor}: {funn} står ikke i hovedplanens funnregister")
    beskrevet = {(r["fra"], r["til"]) for r in register.get("relasjon", []) if r.get("art") == "fremmednøkkel"}
    for fra, til in sorted(set(fk) - beskrevet):
        feil.append(f"fremmednøkkelen {fra} → {til} i katalogen mangler oppføring")
    i_relasjon = {r[e] for r in register.get("relasjon", []) for e in ("fra", "til") if e in r}
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
        if r[ende].rpartition(".")[2] in JSON_KOLONNER:
            return ende
    return None


def _side(r: dict, ende: str) -> str:
    """«tabell.kolonne», med stien inne i JSON-kolonnen når den hører til denne enden."""
    if r.get("json_sti") and _json_ende(r) == ende:
        return f"{r[ende]} → {r['json_sti']}"
    return r[ende]


def _nøkler(innhold: dict) -> str:
    deler = []
    if innhold["primærnøkkel"]:
        deler.append(f"primærnøkkel ({', '.join(innhold['primærnøkkel'])})")
    deler += [f"unik ({', '.join(u)})" for u in innhold["unike"]]
    return "; ".join(deler) or "ingen"


def tabelltekst(register: dict, katalog: dict, tabell: str) -> str:
    """Kolonne 7 i tabellbeskrivelsen: nøkler og relasjoner, fra registeret og katalogen."""
    fk = fremmednøkler(katalog)
    innhold = tabeller(katalog)[tabell]
    ut = [r for r in register["relasjon"] if r["fra"].rpartition(".")[0] == tabell]
    inn = [
        r
        for r in register["relasjon"]
        if r["til"].rpartition(".")[0] == tabell and r["fra"].rpartition(".")[0] != tabell
    ]

    def art(r):
        if r["art"] == "fremmednøkkel":
            return f"fremmednøkkel, ON DELETE {fk[(r['fra'], r['til'])]}"
        return "uten fremmednøkkel"

    linjer = [f"Nøkler: {_nøkler(innhold)}."]
    if ut:
        linjer.append(
            "Viser til: "
            + "; ".join(f"{_side(r, 'fra').partition('.')[2]} → {_side(r, 'til')} ({art(r)})" for r in ut)
            + "."
        )
    if inn:
        linjer.append(
            "Vises til fra: "
            + "; ".join(f"{_side(r, 'fra')} ({art(r)})" for r in sorted(inn, key=lambda r: r["fra"]))
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
        fra_tabell, _, _ = r["fra"].rpartition(".")
        til_tabell, _, _ = r["til"].rpartition(".")
        rader.append(
            [
                fra_tabell,
                _side(r, "fra").removeprefix(fra_tabell + "."),
                til_tabell,
                _side(r, "til").removeprefix(til_tabell + "."),
                "Fremmednøkkel" if r["art"] == "fremmednøkkel" else "Uten fremmednøkkel",
                r["antall"],
                fk.get((r["fra"], r["til"]), ""),
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
    rad = kolonne(katalog, r["fra"])
    if venstre == "||" and (r["art"] == "logisk" or (rad and rad[2] == "NULL")):
        venstre = "|o"
    strek = "--" if r["art"] == "fremmednøkkel" else ".."
    etikett = _side(r, "fra").partition(".")[2]
    return (
        f"    {_entitet(r['til'].rpartition('.')[0])} {venstre}{strek}{høyre} "
        f"{_entitet(r['fra'].rpartition('.')[0])} : \"{etikett}\""
    )


def _attributter(register: dict, katalog: dict, tabell: str, med: set[str] | None) -> list[str]:
    """Nøkkelkolonnene og kolonnene i en relasjon; `med` begrenser til disse."""
    innhold = tabeller(katalog).get(tabell)
    fk = fremmednøkler(katalog)
    logiske = {r["fra"] for r in register["relasjon"] if r["art"] == "logisk"}
    i_relasjon = {r[e] for r in register["relasjon"] for e in ("fra", "til")}
    unike = {k for u in innhold["unike"] for k in u}
    fk_kolonner = {fra for fra, _ in fk}
    linjer = []
    for navn, type_, _ in innhold["kolonner"]:
        fullt = f"{tabell}.{navn}"
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
    """Mermaid. «PostgreSQL»: tabellene der og koblingene mellom dem.
    «SQLite»: SQLite-tabellene og koblingene fra og til dem, med tabellene i
    PostgreSQL de viser til."""
    alle = tabeller(katalog)

    def lag(referanse: str) -> str:
        return alle.get(referanse.rpartition(".")[0], {}).get("lagring", "PostgreSQL")

    if lagring == "PostgreSQL":
        relasjoner = [r for r in register["relasjon"] if lag(r["fra"]) == lag(r["til"]) == "PostgreSQL"]
        entiteter = {t: None for t, i in alle.items() if i["lagring"] == "PostgreSQL"}
    else:
        relasjoner = [r for r in register["relasjon"] if "SQLite" in (lag(r["fra"]), lag(r["til"]))]
        entiteter = {t: None for t, i in alle.items() if i["lagring"] == "SQLite"}
        for r in relasjoner:
            for ende in ("fra", "til"):
                tabell, _, navn = r[ende].rpartition(".")
                if alle[tabell]["lagring"] == "PostgreSQL":
                    entiteter.setdefault(tabell, set()).add(navn)
    linjer = ["erDiagram"]
    for tabell, med in entiteter.items():
        linjer.append(f"    {_entitet(tabell)} {{")
        linjer += _attributter(register, katalog, tabell, med)
        linjer.append("    }")
    for r in relasjoner:
        tabell, _, navn = r["til"].rpartition(".")
        if tabell not in alle:
            # Utenfor `public`; typen er den fremmednøkkelen har.
            type_ = _mermaidtype(kolonne(katalog, r["fra"])[1])
            linjer += [f"    {_entitet(tabell)} {{", f"        {type_} {navn} PK", "    }"]
    linjer += [_linje(r, katalog) for r in relasjoner]
    return "\n".join(linjer)
