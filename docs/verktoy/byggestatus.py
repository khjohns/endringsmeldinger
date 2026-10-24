"""Byggestatusen til vedtakene, laget av koden og issuene (#1021).

    python3 docs/verktoy/byggestatus.py                # alle vedtakene med ID
    python3 docs/verktoy/byggestatus.py --avvik        # bare vedtakene med avvik
    python3 docs/verktoy/byggestatus.py --uten-issues  # uten nett; issuene står som ukjent

Oppdragsgiver 20.10, spørsmål 4: «Byggestatusen i registeret genereres av koden og
lukkede issues, ikke for hånd.» Visningen sjekkes ikke inn, fordi tilstanden til
issuene endrer seg uten en commit.

For hvert vedtak med ID viser den:

- produksjonsfilene i kjerne/, server/ og src/ som viser til ID-en, og testfilene for
  seg, med ID-formene og filutvalget i vedtakshenvisninger.py. En henvisning i koden
  sier at koden bygger på vedtaket, ikke at hele vedtaket er bygget;
- issuene og PR-ene Følge nevner, med tilstanden på GitHub;
- byggestatusen Følge sier for hånd, den siste i teksten.

To avvik merkes. Følge sier «Ikke bygget», men produksjonskoden viser til vedtaket.
Eller Følge sier «Ikke bygget», og alle issuene Følge nevner, er lukket. PR-ene
teller ikke i det andre, og ukjent tilstand heller ikke. Et avvik er noe å
kontrollere, ikke en dom.

Tilstanden hentes med `gh api` fra REST-grensesnittet, side for side, fordi
--paginate gir 403 i skyøktene. Feiler kallet, står tilstanden som ukjent.
"""

import argparse
import json
import pathlib
import re
import subprocess
import sys

if "verktoy.laster" not in sys.modules:
    sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from verktoy.laster import last

vh = last("vedtakshenvisninger")
vr = vh.vr

REPO = "khjohns/endringsmeldinger"
ISSUE = re.compile(r"(?<![\w&/])#(\d+)\b")
IKKE_BYGGET = re.compile(r"[Ii]kke bygget")
VIS_FILER = 3


def henvisninger_i_koden(rot: pathlib.Path = vr.ROT) -> dict[str, dict[str, list[str]]]:
    """Filene som viser til hver vedtaks-ID, delt i «kode» og «tester»."""
    funnet: dict[str, dict[str, list[str]]] = {}
    for sti, tekst in vh.filer(rot):
        del_ = "tester" if vh.er_test(sti) else "kode"
        for i in dict.fromkeys(vh.HENVISNING.findall(tekst)):
            funnet.setdefault(i, {"kode": [], "tester": []})[del_].append(sti)
    return funnet


def nevnte_issues(folge: str) -> list[int]:
    return list(dict.fromkeys(int(n) for n in ISSUE.findall(folge)))


def hent_tilstander(repo: str = REPO) -> dict[int, dict] | None:
    """Nummer → {"lukket": bool, "pr": bool} for alle issuene og PR-ene, eller None
    når de ikke kan hentes."""
    tilstander = {}
    side = 1
    while True:
        try:
            svar = subprocess.run(
                [
                    "gh",
                    "api",
                    f"repos/{repo}/issues?state=all&per_page=100&page={side}",
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=60,
            )
            sider = json.loads(svar.stdout)
        except (OSError, subprocess.SubprocessError, json.JSONDecodeError):
            return None
        if not sider:
            return tilstander
        for i in sider:
            tilstander[i["number"]] = {
                "lukket": i["state"] == "closed",
                "pr": "pull_request" in i,
            }
        side += 1


def status(
    post: dict,
    koden: dict[str, dict[str, list[str]]],
    tilstander: dict[int, dict] | None,
) -> dict:
    """Byggestatusen til ett vedtak, med avvikene."""
    ider = sorted(vh.vedtaks_ider(post))
    kode = sorted({f for i in ider for f in koden.get(i, {}).get("kode", [])})
    tester = sorted({f for i in ider for f in koden.get(i, {}).get("tester", [])})
    folge = post.get("folge", "")
    for_haand = vr.byggestatus_i(folge)
    nevnt = [
        {"nummer": n} | ((tilstander or {}).get(n) or {}) for n in nevnte_issues(folge)
    ]
    ikke_bygget = bool(for_haand) and bool(IKKE_BYGGET.fullmatch(for_haand[-1]))
    issuene = [n for n in nevnt if not n.get("pr")]
    avvik = []
    if ikke_bygget and kode:
        avvik.append("Følge sier «Ikke bygget», men produksjonskoden viser til vedtaket")
    if (
        ikke_bygget
        and issuene
        and all(n.get("lukket") is True for n in issuene)
    ):
        avvik.append("Følge sier «Ikke bygget», og alle issuene Følge nevner, er lukket")
    return {
        "vedtak": vr.etikett(post),
        "ider": ider,
        "kode": kode,
        "tester": tester,
        "issues": nevnt,
        "for_haand": for_haand[-1] if for_haand else None,
        "avvik": avvik,
    }


def statuser(
    register: dict,
    koden: dict[str, dict[str, list[str]]],
    tilstander: dict[int, dict] | None,
) -> list[dict]:
    return [
        status(p, koden, tilstander)
        for p in vr.poster(register)
        if vh.vedtaks_ider(p)
    ]


def _filer(filer: list[str]) -> str:
    if not filer:
        return "–"
    vist = ", ".join(f"`{f}`" for f in filer[:VIS_FILER])
    return vist + (f" og {len(filer) - VIS_FILER} til" if len(filer) > VIS_FILER else "")


def _issue(n: dict) -> str:
    navn = f"PR #{n['nummer']}" if n.get("pr") else f"#{n['nummer']}"
    if "lukket" not in n:
        return f"{navn} ukjent"
    return f"{navn} {'lukket' if n['lukket'] else 'åpen'}"


def markdown(rader: list[dict], hentet: bool) -> str:
    linjer = [
        "# Byggestatus for vedtakene",
        "",
        (
            "Laget av docs/verktoy/byggestatus.py av koden og issuene (#1021). "
            "Byggestatusen i Følge er ført for hånd og kan være foreldet."
        ),
    ]
    if not hentet:
        linjer.append("")
        linjer.append("Tilstanden til issuene er ikke hentet og står som ukjent.")
    linjer += [
        "",
        f"{len(rader)} vedtak, {sum(bool(r['avvik']) for r in rader)} med avvik.",
        "",
        "| Vedtak | Koden | Testene | Issuene i Følge | Følge for hånd | Avvik |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for r in rader:
        linjer.append(
            f"| {r['vedtak']} | {_filer(r['kode'])} | {_filer(r['tester'])} "
            f"| {', '.join(map(_issue, r["issues"])) or '–'} "
            f"| {r['for_haand'] or '–'} | {'; '.join(r['avvik']) or '–'} |"
        )
    return "\n".join(linjer) + "\n"


def main() -> int:
    tolk = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    tolk.add_argument("--avvik", action="store_true", help="bare vedtakene med avvik")
    tolk.add_argument(
        "--uten-issues",
        action="store_true",
        help="hent ikke tilstanden til issuene; den står som ukjent",
    )
    valg = tolk.parse_args()
    tilstander = None if valg.uten_issues else hent_tilstander()
    if tilstander is None and not valg.uten_issues:
        print(
            "Tilstanden til issuene kunne ikke hentes med gh api; den står som ukjent.",
            file=sys.stderr,
        )
    rader = statuser(vr.les(), henvisninger_i_koden(), tilstander)
    if valg.avvik:
        rader = [r for r in rader if r["avvik"]]
    print(markdown(rader, tilstander is not None), end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
