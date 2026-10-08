"""Kontroller domenetabellen i docs/domenetabell/ og skriv tabellen i README.md.

Radene står i `regler.json`, bevis-sakene i `bevis-saker.json`. Tabellen i
README.md lages herfra og rettes ikke for hånd. Kjøring fra repoets rot:

    python3 docs/verktoy/domenetabell.py          # kontroller; 1 ved feil eller utdatert tabell
    python3 docs/verktoy/domenetabell.py --skriv  # skriv tabellen på nytt

`backend/tests/test_domenetabell/` kjører kontrollen i CI og bevis-sakene mot
Python-projeksjonen. Kontrollen viser at referansene henger sammen, ikke at
forventningene er riktige.
"""

import json
import pathlib
import re
import sys

ROT = pathlib.Path(__file__).resolve().parents[2]
KATALOG = ROT / "docs" / "domenetabell"
HOVEDPLAN = ROT / "docs" / "plans" / "2026-09-16-godkjenning-og-varig-levering.md"
README = KATALOG / "README.md"
START = "<!-- domenetabell:start -->"
SLUTT = "<!-- domenetabell:slutt -->"

RADFELT = (
    "id",
    "tilfelle",
    "forventet",
    "bh_standpunkt",
    "rettslig_virkning",
    "rettidighet",
    "tidsakse",
    "kilder",
    "tolkningsstatus",
)
TIDSAKSER = {"registrering": "registrering", "sendt_mottatt": "sendt/mottatt"}
ROLLER = {"forutsetning", "mal", "kontroll"}
HANDLINGER = {
    "grunnlag",
    "grunnlagssvar",
    "vederlagskrav",
    "vederlagskrav_ny_versjon",
    "konsekvensvarsel",
    "vederlagssvar",
    "vederlagssvar_revidert",
    "fristvarsel",
    "fristkrav",
    "fristkrav_spesifisert",
    "fristsvar",
    "foresporsel",
    "aksept",
    "trekk",
}
# Et forløps forventningsgrunnlag er den svakeste tolkningsstatusen blant radene det beviser.
STYRKE = {"avklart_tolkning": 3, "arbeidshypotese": 2, "modellkonvensjon": 1, "karakterisering": 0}


def les() -> tuple[dict, dict]:
    regler = json.loads((KATALOG / "regler.json").read_text(encoding="utf-8"))
    korpus = json.loads((KATALOG / "bevis-saker.json").read_text(encoding="utf-8"))
    return regler, korpus


def _avsnitt(plan: str, fra: str, til: str) -> str:
    start = plan.index(fra)
    return plan[start : plan.index(til, start)]


def _valider_kilder(regler: dict, plan: str) -> list[str]:
    feil = []
    vedtak = _avsnitt(plan, "### 3.1 Vedtatte premisser", "### 3.2 ")
    for kilde in regler["kilder"]:
        if kilde["type"] != "vedtak":
            continue
        if kilde["radetikett"] not in vedtak:
            feil.append(f"{kilde['id']}: radetiketten står ikke i hovedplanen 3.1")
        anker = kilde["ref"].partition("#")[2]
        if anker.startswith("ka-u") and f'<a id="{anker}"></a>' not in vedtak:
            feil.append(f"{kilde['id']}: ankeret #{anker} finnes ikke i hovedplanen 3.1")
    return feil


def _valider_rader(regler: dict) -> list[str]:
    feil, sett = [], set()
    kilder = {k["id"] for k in regler["kilder"]}
    for rad in regler["rader"]:
        navn = rad.get("id", "<uten id>")
        if set(rad) != set(RADFELT):
            feil.append(f"{navn}: feltene er {sorted(rad)}, ventet {sorted(RADFELT)}")
            continue
        if navn in sett:
            feil.append(f"{navn}: står to ganger")
        sett.add(navn)
        if rad["tolkningsstatus"] not in regler["tolkningsstatuser"]:
            feil.append(f"{navn}: ukjent tolkningsstatus {rad['tolkningsstatus']!r}")
        if rad["tidsakse"] not in TIDSAKSER:
            feil.append(f"{navn}: ukjent tidsakse {rad['tidsakse']!r}")
        if not rad["kilder"]:
            feil.append(f"{navn}: mangler kilde")
        feil += [f"{navn}: ukjent kilde {k}" for k in rad["kilder"] if k not in kilder]
    return feil


def _valider_forlop(regler: dict, korpus: dict, funntekst: str) -> list[str]:
    feil, sett = [], set()
    rader = {r["id"]: r for r in regler["rader"]}
    bevist = set()

    def funnet(funn):
        return re.search(rf"^\| {re.escape(funn)} \|", funntekst, re.MULTILINE)

    for forlop in korpus["forlop"]:
        navn = forlop["id"]
        if navn in sett:
            feil.append(f"{navn}: står to ganger")
        sett.add(navn)
        if forlop["start"] is not None and forlop["start"] not in korpus["prefikser"]:
            feil.append(f"{navn}: ukjent start {forlop['start']!r}")
        ukjente = [r for r in forlop["rader"] if r not in rader]
        if ukjente or not forlop["rader"]:
            feil.append(f"{navn}: ukjente eller manglende rader {ukjente}")
            continue
        bevist.update(forlop["rader"])
        statuser = [rader[r].get("tolkningsstatus") for r in forlop["rader"]]
        if any(s not in STYRKE for s in statuser):
            continue  # Rapportert av _valider_rader.
        svakeste = min(statuser, key=STYRKE.__getitem__)
        if forlop.get("forventningsgrunnlag") != svakeste:
            feil.append(f"{navn}: forventningsgrunnlaget samsvarer ikke med radenes tolkningsstatus")
        handlinger = [s["handling"] for s in forlop["steg"]]
        handlinger += [k["prov"]["handling"] for k in forlop["kontroller"] if "prov" in k]
        feil += [f"{navn}: ukjent handling {h!r}" for h in handlinger if h not in HANDLINGER]
        for k in forlop["kontroller"]:
            if k["rolle"] not in ROLLER or not 0 <= k["etter"] <= len(forlop["steg"]):
                feil.append(f"{navn}: ugyldig kontroll {k}")
            if (k["rolle"] == "kontroll") != ("prov" in k):
                feil.append(f"{navn}: en kontrollsak har `prov`, og bare den")
        if not any(k["rolle"] == "mal" for k in forlop["kontroller"]):
            feil.append(f"{navn}: mangler målkontroll")
        avvik = forlop.get("kjent_avvik")
        if avvik and not funnet(avvik["funn"]):
            feil.append(f"{navn}: funnet {avvik['funn']} står ikke i hovedplanens funnregister")

    for inv in korpus["invarianter"]:
        feil += [f"{inv['id']}: ukjent rad {r}" for r in inv["rader"] if r not in rader]
        for avvik in inv["kjente_avvik"]:
            if avvik["forlop"] not in sett:
                feil.append(f"{inv['id']}: ukjent forløp {avvik['forlop']}")
            if not funnet(avvik["funn"]):
                feil.append(f"{inv['id']}: funnet {avvik['funn']} står ikke i funnregisteret")
    feil += [f"{r}: ingen bevis-sak" for r in rader if r not in bevist]
    return feil


def valider(regler: dict, korpus: dict, plan: str | None = None) -> list[str]:
    plan = plan if plan is not None else HOVEDPLAN.read_text(encoding="utf-8")
    if regler.get("formatversjon") != 1 or korpus.get("formatversjon") != 1:
        return ["formatversjonen er ikke 1"]
    funntekst = _avsnitt(plan, "## 4. Funnregister", "## 5. Arbeidspakker")
    return (
        _valider_kilder(regler, plan)
        + _valider_rader(regler)
        + _valider_forlop(regler, korpus, funntekst)
    )


def _celle(tekst: str) -> str:
    return tekst.replace("|", "\\|").replace("\n", " ")


def _kilde(kilde: dict) -> str:
    if kilde["type"] == "vedtak":
        return f"[{kilde['id']}]({kilde['ref']})"
    return f"NS {kilde['punkt']}"


def tabell(regler: dict, korpus: dict) -> str:
    kilder = {k["id"]: k for k in regler["kilder"]}
    bevis, avvik = {}, {}
    for forlop in korpus["forlop"]:
        for rad in forlop["rader"]:
            bevis.setdefault(rad, []).append(forlop["id"])
            if forlop.get("kjent_avvik"):
                avvik.setdefault(rad, set()).add(forlop["kjent_avvik"]["funn"])
    for inv in korpus["invarianter"]:
        for a in inv["kjente_avvik"]:
            for forlop in korpus["forlop"]:
                if forlop["id"] == a["forlop"]:
                    for rad in forlop["rader"]:
                        avvik.setdefault(rad, set()).add(a["funn"])
    hode = (
        "| ID | Tilfelle | Forventet | BHs standpunkt (B-13) | Rettslig virkning "
        "| Rettidighet | Tidsakse | Kilder | Tolkningsstatus | Bevis-saker | Kjent avvik |"
    )
    linjer = [hode, "|" + " --- |" * 11]
    for rad in regler["rader"]:
        celler = [
            rad["id"],
            _celle(rad["tilfelle"]),
            _celle(rad["forventet"]),
            _celle(rad["bh_standpunkt"]),
            _celle(rad["rettslig_virkning"]),
            _celle(rad["rettidighet"]),
            TIDSAKSER[rad["tidsakse"]],
            ", ".join(_kilde(kilder[k]) for k in rad["kilder"]),
            rad["tolkningsstatus"].replace("_", " "),
            ", ".join(bevis.get(rad["id"], [])) or "—",
            ", ".join(sorted(avvik.get(rad["id"], []))) or "—",
        ]
        linjer.append("| " + " | ".join(celler) + " |")
    return "\n".join(linjer)


def med_tabell(readme: str, regler: dict, korpus: dict) -> str:
    start = readme.index(START) + len(START)
    return readme[:start] + "\n" + tabell(regler, korpus) + "\n" + readme[readme.index(SLUTT) :]


def main() -> int:
    regler, korpus = les()
    feil = valider(regler, korpus)
    for linje in feil:
        print(f"feil: {linje}", file=sys.stderr)
    if feil:
        return 1
    readme = README.read_text(encoding="utf-8")
    ny = med_tabell(readme, regler, korpus)
    if "--skriv" in sys.argv[1:]:
        README.write_text(ny, encoding="utf-8")
    elif ny != readme:
        print("feil: tabellen i README.md er utdatert; kjør med --skriv", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
