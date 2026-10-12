"""Vedtaks-ID-ene i kjerne/, server/ og src/ mot vedtaksregisteret (#452, punkt 2 i #451).

    python3 docs/verktoy/vedtakshenvisninger.py    # list henvisningene som ikke holder

To kontroller:

- En ID som ikke er et vedtak i registeret, er ukjent. En B-ID som står åpen i
  3.4 i hovedplanen, er kjent: den er en beslutning, men ennå ikke et vedtak.
- En ID til et opphevet vedtak står ikke som eneste grunnlag. Samme henvisning må
  også vise til et vedtak som gjelder, eller stå i en test og være merket
  historisk med ordet «historisk». En henvisning er en sammenhengende
  kommentarblokk, ellers linjen.

ID-formene er `XX-U1` (alle seriene med U) og `B-01`. Funn-ID-er som `RV-07`,
føringene `AF-01`–`AF-06` i 3.2 og radene `P1`–`P7` i registeret leses ikke:
funnene er ikke vedtak, føringene står ikke i registeret, og `P1` er for kort
til å skilles fra annen tekst.
"""

import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import vedtaksregister as vr

MAPPER = ("kjerne", "server", "src")
HOPP_OVER = {"node_modules", ".svelte-kit", "dist", "build"}
U_ID = r"[A-Z]{2,3}-U\d+"
B_ID = r"B-\d{2}"
HENVISNING = re.compile(rf"(?<![\w-])(?:{U_ID}|{B_ID})(?![\w-])")
B_FOERST = re.compile(rf"^{B_ID}\b")
AAPEN_B = re.compile(rf"^\| ({B_ID}) \|", re.MULTILINE)
HISTORISK = re.compile(r"\bhistorisk", re.IGNORECASE)
KOMMENTAR = re.compile(r"^\s*(//|/\*|\*|<!--|#)")


def vedtak(register: dict) -> tuple[set[str], set[str]]:
    """ID-ene til vedtakene i registeret og ID-ene til dem som er opphevet."""
    kjente = set()
    opphevet = set()
    for p in vr.poster(register):
        if (a := vr.anker(p)) and (m := HENVISNING.match(a.upper())):
            kjente.add(m.group())
        etikett = vr.etikett(p)
        if B_FOERST.match(etikett):
            kjente.update(re.findall(B_ID, etikett))
        opphevet.update(
            f["vedtak"].upper() for f in p.get("forhold", []) if f["art"] == "opphever"
        )
    return kjente, opphevet


def aapne_beslutninger(plan: str) -> set[str]:
    """B-ID-ene i tabellen over åpne beslutninger, 3.4 i hovedplanen."""
    start = plan.index("### 3.4 ")
    slutt = plan.find("\n### ", start + 1)
    return set(AAPEN_B.findall(plan[start : slutt if slutt > 0 else None]))


def henvisninger(tekst: str) -> list[tuple[int, str]]:
    """Linjenummeret og teksten for hver kommentarblokk og hver annen linje."""
    blokker = []
    for nr, linje in enumerate(tekst.splitlines(), 1):
        if KOMMENTAR.match(linje) and blokker and blokker[-1][2]:
            blokker[-1][1].append(linje)
        else:
            blokker.append((nr, [linje], bool(KOMMENTAR.match(linje))))
    return [(nr, "\n".join(linjer)) for nr, linjer, _ in blokker]


def er_test(sti: str) -> bool:
    deler = pathlib.PurePosixPath(sti).parts
    return any(d in ("tester", "tests") for d in deler[:-1]) or bool(
        re.search(r"\.(test|spec)\.", deler[-1])
    )


def feil_i(
    sti: str, tekst: str, kjente: set[str], opphevet: set[str], aapne: set[str]
) -> list[str]:
    feil = []
    for nr, henvisning in henvisninger(tekst):
        ider = HENVISNING.findall(henvisning)
        for i in dict.fromkeys(ider):
            if i not in kjente and i not in aapne:
                feil.append(f"{sti}:{nr}: {i} er ikke et vedtak i registeret")
        gjeldende = [i for i in ider if i in kjente and i not in opphevet]
        historisk = er_test(sti) and HISTORISK.search(henvisning)
        if not gjeldende and not historisk:
            feil.extend(
                f"{sti}:{nr}: {i} er opphevet og står som eneste grunnlag"
                for i in dict.fromkeys(ider)
                if i in opphevet
            )
    return feil


def filer(rot: pathlib.Path = vr.ROT):
    for mappe in MAPPER:
        for sti in sorted((rot / mappe).rglob("*")):
            if sti.is_file() and not HOPP_OVER & set(sti.parts):
                try:
                    yield (
                        sti.relative_to(rot).as_posix(),
                        sti.read_text(encoding="utf-8"),
                    )
                except UnicodeDecodeError:
                    continue


def kontroller(register: dict, plan: str, rot: pathlib.Path = vr.ROT) -> list[str]:
    kjente, opphevet = vedtak(register)
    aapne = aapne_beslutninger(plan)
    return [
        f
        for sti, tekst in filer(rot)
        for f in feil_i(sti, tekst, kjente, opphevet, aapne)
    ]


def main() -> int:
    feil = kontroller(vr.les(), vr.HOVEDPLAN.read_text(encoding="utf-8"))
    if feil:
        print("Vedtakshenvisningene holder ikke:", *feil, sep="\n  ")
        return 1
    print("Vedtakshenvisningene i " + ", ".join(MAPPER) + " holder")
    return 0


if __name__ == "__main__":
    sys.exit(main())
