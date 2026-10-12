"""Kontroller domenetabellen i docs/domenetabell/ og skriv tabellen i README.md.

Radene står i `regler.json`, bevis-sakene i `bevis-saker.json`. Bevis-sakene for
målmodellen (#304, #308) står i `bevis-saker-maalmodell.json` og kjøres bare mot
TS-kjernen i `kjerne/`, i minnet og gjennom testbasen (`sprakprove/kjernelagring/`).
Tabellen i README.md lages herfra og rettes ikke for hånd. Kjøring fra repoets rot:

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
    "grunnlag_ny_versjon",
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
    "eo_utkast",
    "eo_utstedelse",
    "eo_aksept",
    "eo_bestridelse",
    "eo_revisjon",
    "eo_tilknytning",
    "eo_frakobling",
}
# Handlingene i bevis-sakene for målmodellen. `regelendring` bytter regelsettet, og
# `rad` er en hendelse fra en annen skriver; ingen av dem er en kommando.
MAALMODELL_HANDLINGER = {
    "krav", "brev", "revisjon", "aksept", "trekk", "varsel", "bestridelse", "regelendring", "rad",
    "ingen_krav", "innsigelse", "protest", "passivitet", "merking", "avklaring", "begrunnelse",
}
# Kilder en kontroll i målmodellen kan ha utenom regler.json: akseptkriteriet i issuet.
MAALMODELL_KILDER = {"#304"}
SAKSTYPER = {"standard", "endringsordre"}
HOVED = "hoved"
# Felt `korpus.py` leser uten standardverdi.
PAKREVD = {"eo_tilknytning": {"koe"}, "eo_frakobling": {"koe"}, "eo_revisjon": {"revisjon"}}
# Et forløps forventningsgrunnlag er den svakeste tolkningsstatusen blant radene det beviser.
STYRKE = {"avklart_tolkning": 3, "arbeidshypotese": 2, "modellkonvensjon": 1, "karakterisering": 0}


def les() -> tuple[dict, dict]:
    regler = json.loads((KATALOG / "regler.json").read_text(encoding="utf-8"))
    korpus = json.loads((KATALOG / "bevis-saker.json").read_text(encoding="utf-8"))
    return regler, korpus


def les_maalmodell() -> dict:
    return json.loads((KATALOG / "bevis-saker-maalmodell.json").read_text(encoding="utf-8"))


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
        if anker != "31-vedtatte-premisser-og-beslutninger" and f'<a id="{anker}"></a>' not in vedtak:
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


def _sakreferanser(verdi) -> list[str]:
    """`$navn` i en handling eller forventning viser til en sak i forløpet."""
    if isinstance(verdi, str):
        return [verdi[1:]] if verdi.startswith("$") else []
    if isinstance(verdi, list):
        return [r for v in verdi for r in _sakreferanser(v)]
    if isinstance(verdi, dict):
        return [r for v in verdi.values() for r in _sakreferanser(v)]
    return []


def _valider_saker(navn: str, forlop: dict) -> list[str]:
    """Hovedsaken heter `hoved`; de andre står i `saker` med sakstype."""
    feil = []
    saker = {HOVED: forlop.get("sakstype", "standard"), **forlop.get("saker", {})}
    if forlop.get("saker", {}).get(HOVED):
        feil.append(f"{navn}: `hoved` er hovedsaken og står ikke i `saker`")
    feil += [f"{navn}: ukjent sakstype {t!r}" for t in saker.values() if t not in SAKSTYPER]
    if forlop["start"] is not None and saker["hoved"] != "standard":
        feil.append(f"{navn}: prefikset gjelder bare en KOE-sak")
    for del_ in forlop["steg"] + forlop["kontroller"]:
        brukt = [del_.get("sak", HOVED)] + _sakreferanser({k: v for k, v in del_.items() if k != "sak"})
        feil += [f"{navn}: ukjent sak {s!r}" for s in brukt if s not in saker]
    for k in forlop["kontroller"]:
        if "sak" in k.get("prov", {}):
            feil.append(f"{navn}: `sak` står på kontrollen, ikke i `prov`")
        # `avvist` gjelder steget som nettopp ble sendt, og skal leses i samme sak.
        if "avvist" in k["forventet"] and k["rolle"] != "kontroll" and 1 <= k["etter"] <= len(forlop["steg"]):
            steg = forlop["steg"][k["etter"] - 1]
            if steg.get("sak", HOVED) != k.get("sak", HOVED):
                feil.append(f"{navn}: `avvist` etter steg {k['etter']} leses i en annen sak enn steget ble sendt til")
    for del_ in forlop["steg"] + [k["prov"] for k in forlop["kontroller"] if "prov" in k]:
        mangler = PAKREVD.get(del_["handling"], set()) - set(del_)
        feil += [f"{navn}: {del_['handling']} mangler {f!r}" for f in sorted(mangler)]
        koe = del_.get("koe", [])
        for s in _sakreferanser(koe):
            if saker.get(s) != "standard":
                feil.append(f"{navn}: `koe` viser til {s!r}, som ikke er en KOE-sak")
        if koe and not _sakreferanser(koe):
            feil.append(f"{navn}: `koe` må vise til en sak med `$navn`")
    return feil


def _valider_forlop(regler: dict, korpus: dict, funntekst: str, vedtak: str, maalmodell: set[str]) -> list[str]:
    feil, sett = [], set()
    rader = {r["id"]: r for r in regler["rader"]}
    bevist = set(maalmodell)

    def funnet(avvik):
        """Et avvik uten funn-ID er et vedtatt issue (#235); da er `funn` issuenummeret,
        og issuet har en vedtaksrad i hovedplanen 3.1."""
        if avvik["funn"].startswith("#"):
            return avvik["funn"] == f"#{avvik.get('issue')}" and f"| {avvik['funn']}:" in vedtak
        return re.search(rf"^\| {re.escape(avvik['funn'])} \|", funntekst, re.MULTILINE)

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
        feil += _valider_saker(navn, forlop)
        for k in forlop["kontroller"]:
            if k["rolle"] not in ROLLER or not 0 <= k["etter"] <= len(forlop["steg"]):
                feil.append(f"{navn}: ugyldig kontroll {k}")
            if (k["rolle"] == "kontroll") != ("prov" in k):
                feil.append(f"{navn}: en kontrollsak har `prov`, og bare den")
        if not any(k["rolle"] == "mal" for k in forlop["kontroller"]):
            feil.append(f"{navn}: mangler målkontroll")
        avvik = forlop.get("kjent_avvik")
        if avvik and not funnet(avvik):
            feil.append(f"{navn}: funnet {avvik['funn']} står ikke i hovedplanens funnregister eller 3.1")

    for inv in korpus["invarianter"]:
        feil += [f"{inv['id']}: ukjent rad {r}" for r in inv["rader"] if r not in rader]
        for avvik in inv["kjente_avvik"]:
            if avvik["forlop"] not in sett:
                feil.append(f"{inv['id']}: ukjent forløp {avvik['forlop']}")
            if not funnet(avvik):
                feil.append(f"{inv['id']}: funnet {avvik['funn']} står ikke i funnregisteret")
    feil += [f"{r}: ingen bevis-sak" for r in rader if r not in bevist]
    return feil


def valider(regler: dict, korpus: dict, plan: str | None = None, maalmodell: dict | None = None) -> list[str]:
    plan = plan if plan is not None else HOVEDPLAN.read_text(encoding="utf-8")
    maalmodell = maalmodell if maalmodell is not None else les_maalmodell()
    if any(d.get("formatversjon") != 1 for d in (regler, korpus, maalmodell)):
        return ["formatversjonen er ikke 1"]
    funntekst = _avsnitt(plan, "## 4. Funnregister", "## 5. Arbeidspakker")
    vedtak = _avsnitt(plan, "### 3.1 Vedtatte premisser", "### 3.2 ")
    return (
        _valider_kilder(regler, plan)
        + _valider_rader(regler)
        + _valider_forlop(regler, korpus, funntekst, vedtak, _bevist(maalmodell))
        + _valider_maalmodell(regler, korpus, maalmodell)
    )


def _bevist(maalmodell: dict) -> set[str]:
    return {r for forlop in maalmodell["forlop"] for r in forlop["rader"]}


def _valider_maalmodell(regler: dict, korpus: dict, maal: dict) -> list[str]:
    """Bevis-sakene for målmodellen: radene finnes, hver kontroll har en kilde, og
    forventningsgrunnlaget er det svakeste blant radene, som i hovedkorpuset."""
    feil = []
    rader = {r["id"]: r for r in regler["rader"]}
    kilder = {k["id"] for k in regler["kilder"]} | set(rader) | MAALMODELL_KILDER
    sett = {f["id"] for f in korpus["forlop"]}
    for forlop in maal["forlop"]:
        navn = forlop["id"]
        if navn in sett:
            feil.append(f"{navn}: står to ganger")
        sett.add(navn)
        if forlop["start"] is not None and forlop["start"] not in maal["prefikser"]:
            feil.append(f"{navn}: ukjent start {forlop['start']!r}")
        ukjente = [r for r in forlop["rader"] if r not in rader]
        if ukjente or not forlop["rader"]:
            feil.append(f"{navn}: ukjente eller manglende rader {ukjente}")
            continue
        statuser = [rader[r]["tolkningsstatus"] for r in forlop["rader"]]
        if all(s in STYRKE for s in statuser) and forlop.get("forventningsgrunnlag") != min(
            statuser, key=STYRKE.__getitem__
        ):
            feil.append(f"{navn}: forventningsgrunnlaget samsvarer ikke med radenes tolkningsstatus")
        handlinger = [s["handling"] for s in forlop["steg"]]
        handlinger += [k["prov"]["handling"] for k in forlop["kontroller"] if "prov" in k]
        feil += [f"{navn}: ukjent handling {h!r}" for h in handlinger if h not in MAALMODELL_HANDLINGER]
        for k in forlop["kontroller"]:
            if k["rolle"] not in ROLLER or not 0 <= k["etter"] <= len(forlop["steg"]):
                feil.append(f"{navn}: ugyldig kontroll {k}")
            if k["rolle"] == "kontroll" and "prov" not in k:
                feil.append(f"{navn}: en kontrollsak har `prov`")
            if not k.get("kilde"):
                feil.append(f"{navn}: kontrollen etter steg {k['etter']} mangler kilde")
            feil += [f"{navn}: ukjent kilde {q}" for q in k.get("kilde", []) if q not in kilder]
        if not any(k["rolle"] == "mal" for k in forlop["kontroller"]):
            feil.append(f"{navn}: mangler målkontroll")
    for prefiks in maal["prefikser"].values():
        feil += [f"prefiks: ukjent handling {h['handling']!r}" for h in prefiks if h["handling"] not in MAALMODELL_HANDLINGER]
    return feil


def _celle(tekst: str) -> str:
    return tekst.replace("|", "\\|").replace("\n", " ")


def _kilde(kilde: dict) -> str:
    if kilde["type"] == "vedtak":
        return f"[{kilde['id']}]({kilde['ref']})"
    return f"NS {kilde['punkt']}"


def tabell(regler: dict, korpus: dict, maalmodell: dict | None = None) -> str:
    maalmodell = maalmodell if maalmodell is not None else les_maalmodell()
    kilder = {k["id"]: k for k in regler["kilder"]}
    bevis, avvik = {}, {}
    for forlop in korpus["forlop"]:
        for rad in forlop["rader"]:
            bevis.setdefault(rad, []).append(forlop["id"])
            if forlop.get("kjent_avvik"):
                avvik.setdefault(rad, set()).add(forlop["kjent_avvik"]["funn"])
    for forlop in maalmodell["forlop"]:
        for rad in forlop["rader"]:
            bevis.setdefault(rad, []).append(f"{forlop['id']} (målmodellen)")
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
