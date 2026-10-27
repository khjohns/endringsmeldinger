"""Vedtaks-ID-ene i kjerne/, server/ og src/ og kildene i docs/domenetabell/ mot
vedtaksregisteret (#452, punkt 2 i #451).

    python3 docs/verktoy/vedtakshenvisninger.py    # list henvisningene som ikke holder

To kontroller:

- En ID som ikke er et vedtak i registeret, er ukjent. En B-ID som står åpen i
  3.4 i hovedplanen, er kjent: den er en beslutning, men ennå ikke et vedtak. Det
  samme er en B-ID i listen over avgjorte beslutninger i 3.4, som viser til
  vedtakene som avgjorde den (#1020).
- En ID til et opphevet vedtak står ikke som eneste grunnlag. Samme henvisning må
  også vise til et vedtak som gjelder, eller stå i en test og være merket
  historisk med ordet «historisk». En henvisning er et avsnitt i en kommentar,
  der en tom kommentarlinje skiller avsnittene, ellers linjen.

ID-formene er `XX-U1` (alle seriene med U) og `B-01`. Funn-ID-er som `RV-07`,
føringene `AF-01`–`AF-06` i 3.2 og radene `P1`–`P7` i registeret leses ikke:
funnene er ikke vedtak, føringene står ikke i registeret, og `P1` er for kort
til å skilles fra annen tekst.

I JSON-filene i docs/domenetabell/, som bevis-sakene og brukerforløpene, er
henvisningen en liste eller en tekst under `kilde` eller `kilder`, og ID-ene leses som
i koden, også midt i en tekst som `B-14 (bevisgrunnlaget)`. Unntaket for en test merket
historisk gjelder ikke der, og `endringer` i et brukerforløp leses ikke, fordi den
fører hva som er endret og hvorfor.
"""

import json
import pathlib
import re
import sys

if "verktoy.laster" not in sys.modules:
    sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))
from verktoy.laster import last

vr = last("vedtaksregister")

MAPPER = ("kjerne", "server", "src")
KILDEMAPPE = "docs/domenetabell"
KILDEFELT = ("kilde", "kilder")
HOPP_OVER = {"node_modules", ".svelte-kit", "dist", "build"}
U_ID = r"[A-Z]{2,3}-U\d+"
B_ID = r"B-\d{2}"
HENVISNING = re.compile(rf"(?<![\w-])(?:{U_ID}|{B_ID})(?![\w-])")
B_FOERST = re.compile(rf"^{B_ID}\b")
AAPEN_B = re.compile(rf"^\| ({B_ID}) \|", re.MULTILINE)
# Et punkt i listen over avgjorte beslutninger: B-ID-en i fet skrift først, og «avgjort»
# i punktet, som kan gå over flere linjer.
AVGJORT_B = re.compile(rf"^- \*\*({B_ID})\b(?:(?!\n- |\n\n).)*?\bavgjort\b", re.MULTILINE | re.DOTALL)
HISTORISK = re.compile(r"(?<!ikke )\bhistorisk\b", re.IGNORECASE)
KOMMENTAR = re.compile(r"^\s*(//|/\*|\*|<!--|#(\s|$))")
MARKOERER = re.compile(r"/\*+|\*+/|//+|<!--|-->|^\s*\*+|^\s*#")
LUKKES = {"/*": "*/", "<!--": "-->"}


def vedtaks_ider(post: dict) -> set[str]:
    """ID-ene en post er vedtaket for: ankeret når det er en ID, og B-ID-ene i en etikett som begynner med en."""
    ider = set()
    if (a := vr.anker(post)) and HENVISNING.fullmatch(a.upper()):
        ider.add(a.upper())
    etikett = vr.etikett(post)
    if B_FOERST.match(etikett):
        ider.update(re.findall(B_ID, etikett))
    return ider


def vedtak(register: dict) -> tuple[set[str], set[str]]:
    """ID-ene til vedtakene i registeret og ID-ene til dem som er opphevet."""
    ider = [(p, vedtaks_ider(p)) for p in vr.poster(register)]
    etter_anker = {vr.anker(p): i for p, i in ider if vr.anker(p)}
    opphevet = set()
    for p, _ in ider:
        for f in p.get("forhold", []):
            if f["art"] == "opphever":
                if f["vedtak"].lower() not in etter_anker:
                    raise ValueError(
                        f"{f['vedtak']} i et forhold er ikke et anker i registeret"
                    )
                opphevet |= etter_anker[f["vedtak"].lower()]
    return set().union(*(i for _, i in ider)), opphevet


def _avsnitt_3_4(plan: str) -> str:
    start = re.search(r"^### 3\.4 ", plan, re.MULTILINE)
    if start is None:
        raise ValueError("Hovedplanen har ikke avsnittet «### 3.4».")
    slutt = re.compile(r"\n#{1,3} ").search(plan, start.end())
    return plan[start.start() : slutt.start() if slutt else None]


def aapne_beslutninger(plan: str) -> set[str]:
    """B-ID-ene i tabellen over åpne beslutninger, 3.4 i hovedplanen."""
    return set(AAPEN_B.findall(_avsnitt_3_4(plan)))


def avgjorte_beslutninger(plan: str) -> set[str]:
    """B-ID-ene i listen over avgjorte beslutninger i 3.4, med vedtakene som avgjorde dem."""
    return set(AVGJORT_B.findall(_avsnitt_3_4(plan)))


def henvisninger(tekst: str) -> list[tuple[int, str]]:
    """Linjenummeret og teksten for hvert avsnitt i en kommentar og hver annen linje.

    En tom kommentarlinje og slutten på en kommentar med */ eller --> skiller avsnitt.
    En linje som begynner med /* eller <!--, åpner en kommentar som varer til den
    lukkes. En slik kommentar etter kode på samme linje leses ikke som en kommentar.
    """
    blokker = []
    aapen = False
    lukker = None
    for nr, linje in enumerate(tekst.splitlines(), 1):
        kommentar = lukker is not None or bool(KOMMENTAR.match(linje))
        if lukker is None:
            for start, slutt in LUKKES.items():
                if linje.lstrip().startswith(start) and slutt not in linje:
                    lukker = slutt
                    kommentar = True
                    break
        elif lukker in linje:
            lukker = None
        if kommentar and not MARKOERER.sub("", linje).strip():
            aapen = False
        elif kommentar and aapen:
            blokker[-1][1].append(linje)
        else:
            blokker.append((nr, [linje]))
            aapen = kommentar
        if lukker is None and any(slutt in linje for slutt in LUKKES.values()):
            aapen = False
    return [(nr, "\n".join(linjer)) for nr, linjer in blokker]


def er_test(sti: str) -> bool:
    deler = pathlib.PurePosixPath(sti).parts
    return any(d in ("tester", "tests", "__tests__") for d in deler[:-1]) or bool(
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
            if sti.is_file() and not HOPP_OVER & set(sti.relative_to(rot).parts):
                try:
                    yield (
                        sti.relative_to(rot).as_posix(),
                        sti.read_text(encoding="utf-8"),
                    )
                except UnicodeDecodeError:
                    continue


def kildelister(data, sted: str = "") -> list[tuple[str, list[str]]]:
    """Stedet og innholdet for hver `kilde` eller `kilder` i en JSON-fil, som en liste.

    Stedet er nøklene på veien ned, med ID-en der det er en, som
    `BF-01/kontrollpunkter/te-har-mottatt-svaret/forstaaelse[2]/kilde`.
    """
    if isinstance(data, list):
        return [
            liste
            for i, v in enumerate(data)
            for liste in kildelister(
                v, sted if isinstance(v, dict) and "id" in v else f"{sted}[{i}]"
            )
        ]
    if not isinstance(data, dict):
        return []
    if isinstance(data.get("id"), str):
        sted = f"{sted}/{data['id']}"
    ut = []
    for noekkel, verdi in data.items():
        if noekkel in KILDEFELT and isinstance(verdi, (list, str)):
            kilder = [verdi] if isinstance(verdi, str) else verdi
            kilder = [k for k in kilder if isinstance(k, str)]
            ut.append((f"{sted}/{noekkel}".lstrip("/"), kilder))
        elif noekkel != "endringer":
            ut.extend(kildelister(verdi, f"{sted}/{noekkel}"))
    return ut


def kildefeil(
    sti: str, data, kjente: set[str], opphevet: set[str], aapne: set[str]
) -> list[str]:
    feil = []
    for sted, kilder in kildelister(data):
        ider = [i for k in kilder for i in HENVISNING.findall(k)]
        for i in dict.fromkeys(ider):
            if i not in kjente and i not in aapne:
                feil.append(f"{sti}: {sted}: {i} er ikke et vedtak i registeret")
        if not [i for i in ider if i in kjente and i not in opphevet]:
            feil.extend(
                f"{sti}: {sted}: {i} er opphevet og står som eneste grunnlag"
                for i in dict.fromkeys(ider)
                if i in opphevet
            )
    return feil


def kildefiler(rot: pathlib.Path = vr.ROT):
    for sti in sorted((rot / KILDEMAPPE).rglob("*.json")):
        data = json.loads(sti.read_text(encoding="utf-8"))
        yield sti.relative_to(rot).as_posix(), data


def kontroller(register: dict, plan: str, rot: pathlib.Path = vr.ROT) -> list[str]:
    kjente, opphevet = vedtak(register)
    aapne = aapne_beslutninger(plan) | avgjorte_beslutninger(plan)
    return [
        f
        for sti, tekst in filer(rot)
        for f in feil_i(sti, tekst, kjente, opphevet, aapne)
    ] + [
        f
        for sti, data in kildefiler(rot)
        for f in kildefeil(sti, data, kjente, opphevet, aapne)
    ]


def main() -> int:
    feil = kontroller(vr.les(), vr.HOVEDPLAN.read_text(encoding="utf-8"))
    if feil:
        print("Vedtakshenvisningene holder ikke:", *feil, sep="\n  ")
        return 1
    print("Vedtakshenvisningene i " + ", ".join((*MAPPER, KILDEMAPPE)) + " holder")
    return 0


if __name__ == "__main__":
    sys.exit(main())
