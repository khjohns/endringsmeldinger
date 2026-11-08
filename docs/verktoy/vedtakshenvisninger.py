"""Vedtaks-ID-ene i kjerne/, server/ og src/, kildene i docs/domenetabell/ og dokumentene
der designet står, mot vedtaksregisteret (#452, punkt 2 i #451, steg 3b i #1534).

    python3 docs/verktoy/vedtakshenvisninger.py    # list henvisningene som ikke holder

Tre kontroller:

- En ID som ikke er et vedtak i registeret, er ukjent. En B-ID som står åpen i
  3.4 i hovedplanen, er kjent: den er en beslutning, men ennå ikke et vedtak. Det
  samme er en B-ID i listen over avgjorte beslutninger i 3.4, som viser til
  vedtakene som avgjorde den (#1020).
- En ID til et opphevet vedtak står sammen med posten som opphever det, lest av
  forholdet `opphever` i registeret. Det er ikke nok at samme henvisning viser til
  et annet vedtak som gjelder (oppdragsgiver 05.11, #1606). Unntaket er en test
  merket historisk med ordet «historisk». En henvisning er et avsnitt i en
  kommentar, der en tom kommentarlinje skiller avsnittene, ellers linjen.

ID-formene er `XX-U1` (alle seriene med U) og `B-01`. Funn-ID-er som `RV-07`,
føringene `AF-01`–`AF-06` i 3.2 og radene `P1`–`P7` i registeret leses ikke:
funnene er ikke vedtak, føringene står ikke i registeret, og `P1` er for kort
til å skilles fra annen tekst.

I JSON-filene i docs/domenetabell/, som bevis-sakene og brukerforløpene, er
henvisningen en liste eller en tekst under `kilde` eller `kilder`, og ID-ene leses som
i koden, også midt i en tekst som `B-14 (bevisgrunnlaget)`. Unntaket for en test merket
historisk gjelder ikke der, og `endringer` i et brukerforløp leses ikke, fordi den
fører hva som er endret og hvorfor.

Dokumentene er bestillingene for brukerforløpene (`BF-*.md`), `.interface-design/system.md`,
skillene og `AGENTS.md`, der designet fra registeret flyttes (svar 5 04.11 i #1534). Der er
henvisningen et avsnitt, et punkt i en liste, en tabellrad eller en overskrift, og ID-ene
kontrolleres som i koden, uten unntaket for en test merket historisk. Unntaket er
spørsmålsfilene i `HISTORISKE_DOKUMENTER`, som fører spørsmålene ordrett slik de ble stilt: der
kan en opphevet ID stå uten posten som opphever den, som i en test merket historisk (S2 A i
vedtaks-PR-en for samlevedtaket for endringsordren, #1534).

En post med klassen design er ikke eneste grunnlag i `kjerne/frosset/`, `kjerne/kommandoer/`
og `kjerne/regler/`, og heller ikke i `kilde` og `kilder` i bevis-sakene. Samme henvisning
må vise til vedtaket med den bindende setningen, og feilmeldingen foreslår vedtakene i
`bindende_i` (arbeidsvalget for kontroll 2 04.11 i #1534).
"""

import collections
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
DOKUMENTER = (
    "docs/domenetabell/brukerforlop/BF-*.md",
    ".interface-design/system.md",
    ".claude/skills/**/*.md",
    "AGENTS.md",
)
HISTORISKE_DOKUMENTER = frozenset(
    {
        "docs/domenetabell/brukerforlop/BF-05-sporsmal.md",
        "docs/domenetabell/brukerforlop/BF-06-sporsmal.md",
    }
)
GRUNNLAGSMAPPER = ("kjerne/frosset/", "kjerne/kommandoer/", "kjerne/regler/")
BEVIS_SAKER = "docs/domenetabell/bevis-saker*.json"
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
# Det som begynner en ny henvisning i et dokument: en overskrift, et punkt i en liste og en
# tabellrad. En tom linje avslutter et avsnitt.
NY_I_DOKUMENT = re.compile(r"^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)")
AVVIKSISSUE = re.compile(r"#\d+(?:, steg \d+)?")
# En opphevet ID uten posten som opphever den, per fil, med antallet og issuet som skriver
# henvisningene om. Lista skal bare krympe.
KJENTE_AVVIK = (
    ("kjerne/kommandoer/nyttelast.ts", "KA-U24", 1, "#1433"),
    ("kjerne/kommandoer/nyttelast.ts", "KA-U32", 2, "#1433"),
    ("kjerne/tester/arkitektur.test.ts", "KA-U24", 1, "#1433"),
    ("kjerne/tester/arkitektur.test.ts", "KA-U32", 1, "#1433"),
    ("kjerne/tester/brevtekst.test.ts", "KA-U24", 3, "#1433"),
    ("kjerne/tester/brevtekst.test.ts", "KA-U32", 1, "#1433"),
    ("kjerne/tester/feilinnfoering.ts", "KA-U24", 4, "#1433"),
    ("kjerne/tester/feilinnfoering.ts", "KA-U32", 1, "#1433"),
    ("src/lib/components/varden/Vederlagssvar.svelte", "KA-U24", 1, "#1433"),
    ("src/lib/components/varden/__tests__/Varden.test.ts", "KA-U24", 1, "#1433"),
    ("kjerne/format/leser.ts", "KA-U34", 1, "#1377"),
    ("kjerne/frosset/brevtekst.ts", "KA-U34", 1, "#1377"),
    ("kjerne/kommandoer/kommando.ts", "KA-U34", 2, "#1377"),
    ("kjerne/kommandoer/kommando.ts", "KA-U35", 2, "#1377"),
    ("kjerne/kommandoer/nyttelast.ts", "KA-U38", 1, "#1433"),
    ("kjerne/kommandoer/skriving.ts", "KA-U35", 1, "#1377"),
    ("kjerne/tester/brevtekst.test.ts", "KA-U34", 1, "#1377"),
    ("kjerne/tester/klient.ts", "KA-U35", 1, "#1377"),
    ("kjerne/typer.ts", "KA-U34", 1, "#1377"),
    ("kjerne/utledning/utled.ts", "KA-U34", 1, "#1377"),
    ("server/saksliste.ts", "MM-U28", 2, "#1545"),
    ("server/saksliste.ts", "MM-U29", 2, "#1545"),
    ("server/tester/sakslinje.test.ts", "MM-U28", 2, "#1545"),
    ("server/tester/sakslinje.test.ts", "MM-U29", 2, "#1545"),
    ("kjerne/kommandoer/forutsetninger.ts", "OV-U8", 1, "#1576"),
    ("kjerne/tester/feilinnfoering.ts", "OV-U8", 1, "#1576"),
)
# En post med klassen design som eneste grunnlag i kjernen eller i en bevis-sak, i samme form
# som KJENTE_AVVIK. Henvisningene skrives om når designet flyttes i steg 4. Lista skal bare
# krympe.
KJENTE_DESIGNAVVIK = (
    ("docs/domenetabell/bevis-saker-maalmodell.json", "MM-U22", 2, "#1534, steg 4"),
    ("kjerne/frosset/forholdene.ts", "OV-U77", 1, "#1534, steg 4"),
    ("kjerne/frosset/forholdene.ts", "OV-U78", 1, "#1534, steg 4"),
)


def vedtaks_ider(post: dict) -> set[str]:
    """ID-ene en post er vedtaket for: ankeret når det er en ID, og B-ID-ene i en etikett som begynner med en."""
    ider = set()
    if (a := vr.anker(post)) and HENVISNING.fullmatch(a.upper()):
        ider.add(a.upper())
    etikett = vr.etikett(post)
    if B_FOERST.match(etikett):
        ider.update(re.findall(B_ID, etikett))
    return ider


def vedtak(register: dict) -> tuple[set[str], dict[str, set[str]]]:
    """ID-ene til vedtakene i registeret, og hver opphevet ID med ID-ene til postene som
    opphever den.

    En ID er opphevet når hver post den er vedtaket for, er opphevet. B-13 er vedtaket for
    flere rader, og en opphevet rad gjør ikke B-13 opphevet (svar 14 i PR #1537)."""
    ider = [(p, vedtaks_ider(p)) for p in vr.poster(register)]
    ankrene = {vr.anker(p) for p, _ in ider if vr.anker(p)}
    oppheverne: dict[str, set[str]] = collections.defaultdict(set)
    for p, i in ider:
        for f in p.get("forhold", []):
            if f["art"] == "opphever":
                if f["vedtak"].lower() not in ankrene:
                    raise ValueError(
                        f"{f['vedtak']} i et forhold er ikke et anker i registeret"
                    )
                oppheverne[f["vedtak"].lower()] |= i
    poster_for = collections.defaultdict(list)
    for p, i in ider:
        for id_ in i:
            poster_for[id_].append(vr.anker(p))
    opphevet = {
        id_: set().union(*(oppheverne[a] for a in ankre))
        for id_, ankre in poster_for.items()
        if all(a in oppheverne for a in ankre)
    }
    return set(poster_for), opphevet


def design(register: dict) -> dict[str, list[str]]:
    """ID-ene der hver post er design, med ID-ene til vedtakene i `bindende_i` for dem."""
    alle = {vr.anker(p): p for p in vr.poster(register) if vr.anker(p)}
    klasser = collections.defaultdict(set)
    bindende = collections.defaultdict(list)
    for p in vr.poster(register):
        for id_ in vedtaks_ider(p):
            klasser[id_].add(p["klasse"])
            for a in p.get("bindende_i", []):
                bindende[id_] += sorted(vedtaks_ider(alle[a])) or [vr.etikett(alle[a])]
    return {
        id_: list(dict.fromkeys(bindende[id_]))
        for id_, k in klasser.items()
        if k == {"design"}
    }


def _designfeil(sted: str, ider: list[str], design_: dict[str, list[str]]) -> list[str]:
    feil = []
    for i in dict.fromkeys(ider):
        forslag = (
            f"vis også til {', '.join(design_[i])}"
            if design_[i]
            else "før vedtaket med den bindende setningen i bindende_i i registeret"
        )
        feil.append(f"{sted}: {i} er design og står som eneste grunnlag; {forslag}")
    return feil


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


def avsnitt(tekst: str) -> list[tuple[int, str]]:
    """Linjenummeret og teksten for hver henvisning i et dokument: et avsnitt, et punkt i en
    liste, en tabellrad eller en overskrift."""
    blokker: list[tuple[int, list[str]]] = []
    aapen = False
    for nr, linje in enumerate(tekst.splitlines(), 1):
        if not linje.strip():
            aapen = False
        elif aapen and not NY_I_DOKUMENT.match(linje):
            blokker[-1][1].append(linje)
        else:
            blokker.append((nr, [linje]))
            aapen = not linje.lstrip().startswith(("#", "|"))
    return [(nr, "\n".join(linjer)) for nr, linjer in blokker]


def er_dokument(sti: str) -> bool:
    return sti.endswith(".md")


def i_grunnlagsmappe(sti: str) -> bool:
    return sti.startswith(GRUNNLAGSMAPPER)


def er_test(sti: str) -> bool:
    deler = pathlib.PurePosixPath(sti).parts
    return any(d in ("tester", "tests", "__tests__") for d in deler[:-1]) or bool(
        re.search(r"\.(test|spec)\.", deler[-1])
    )


def feil_i(
    sti: str,
    tekst: str,
    kjente: set[str],
    opphevet: dict[str, set[str]],
    aapne: set[str],
    avvik: frozenset[tuple[str, str]] = frozenset(),
    truffet: collections.Counter | None = None,
    design_: dict[str, list[str]] | None = None,
    designavvik: frozenset[tuple[str, str]] = frozenset(),
    designtruffet: collections.Counter | None = None,
) -> list[str]:
    """`opphevet` er de opphevede ID-ene med ID-ene til postene som opphever dem. `avvik` er
    parene (fil, ID) i `KJENTE_AVVIK`, og `designavvik` dem i
    `KJENTE_DESIGNAVVIK`; hvert treff telles i `truffet` og `designtruffet`. `design_` er
    ID-ene til designpostene med vedtakene i `bindende_i`, og leses bare i GRUNNLAGSMAPPER."""
    feil = []
    deler = avsnitt(tekst) if er_dokument(sti) else henvisninger(tekst)
    for nr, henvisning in deler:
        ider = HENVISNING.findall(henvisning)
        for i in dict.fromkeys(ider):
            if i not in kjente and i not in aapne:
                feil.append(f"{sti}:{nr}: {i} er ikke et vedtak i registeret")
        gjeldende = [i for i in ider if i in kjente and i not in opphevet]
        if design_ and i_grunnlagsmappe(sti) and gjeldende and all(i in design_ for i in gjeldende):
            for i in dict.fromkeys(gjeldende):
                if (sti, i) in designavvik:
                    if designtruffet is not None:
                        designtruffet[(sti, i)] += 1
                else:
                    feil += _designfeil(f"{sti}:{nr}", [i], design_)
        historisk = sti in HISTORISKE_DOKUMENTER or (er_test(sti) and HISTORISK.search(henvisning))
        if not historisk:
            feil += _oppheverfeil(f"{sti}:{nr}", sti, ider, opphevet, avvik, truffet)
    return feil


def _oppheverfeil(
    sted: str,
    sti: str,
    ider: list[str],
    opphevet: dict[str, set[str]],
    avvik: frozenset[tuple[str, str]],
    truffet: collections.Counter | None,
) -> list[str]:
    """Feilene for hver opphevet ID i en henvisning der ingen av postene som opphever den, står."""
    feil = []
    for i in dict.fromkeys(ider):
        if i not in opphevet or opphevet[i] & set(ider):
            continue
        if (sti, i) in avvik:
            if truffet is not None:
                truffet[(sti, i)] += 1
            continue
        feil.append(
            f"{sted}: {i} er opphevet og står uten {' eller '.join(sorted(opphevet[i]))}, "
            "som opphever den"
        )
    return feil


def gyldig_rad(rad) -> bool:
    fil, i, antall, issue = rad
    return (
        bool(AVVIKSISSUE.fullmatch(issue))
        and bool(HENVISNING.fullmatch(i))
        and isinstance(antall, int)
        and antall > 0
        and not any(t in fil for t in "*?[]")
        and not fil.endswith("/")
    )


OPPHEVERAVVIK = ("står uten posten som opphever den", "posten som opphever den")
DESIGNAVVIK = ("står som eneste grunnlag", "et vedtak som gjelder")


def avviksfeil(
    rader, truffet: collections.Counter, navn: str = "KJENTE_AVVIK", tekst=OPPHEVERAVVIK
) -> list[str]:
    """Feilene i en liste over kjente avvik: en rad med feil form, og et par (fil, ID) der antallet
    treff avviker fra summen av radene for paret. Et par kan ha én rad per issue."""
    feil = []
    tillatt: dict[tuple[str, str], int] = collections.Counter()
    issuer: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    for rad in rader:
        fil, i, antall, issue = rad
        if not gyldig_rad(rad):
            feil.append(
                f"{navn}: raden ({fil}, {i}, {antall}, {issue}) må ha én fil, én ID, antallet og issuet"
            )
        else:
            tillatt[(fil, i)] += antall
            issuer[(fil, i)].append(issue)
    for (fil, i), antall in tillatt.items():
        n = truffet[(fil, i)]
        radene = f"raden ({issuer[(fil, i)][0]})" if len(issuer[(fil, i)]) == 1 else (
            f"radene ({', '.join(issuer[(fil, i)])})"
        )
        if n > antall:
            feil.append(
                f"{navn}: {i} {tekst[0]} {n} ganger i {fil}, og {radene} "
                f"tillater {antall}; en ny henvisning må vise til {tekst[1]}"
            )
        elif n < antall:
            feil.append(
                f"{navn}: {i} {tekst[0]} {n} ganger i {fil}, og {radene} "
                f"sier {antall}; rett antallet eller fjern raden"
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


def dokumenter(rot: pathlib.Path = vr.ROT):
    stier = {sti for monster in DOKUMENTER for sti in rot.glob(monster) if sti.is_file()}
    for sti in sorted(stier):
        yield sti.relative_to(rot).as_posix(), sti.read_text(encoding="utf-8")


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


def er_bevis_sak(sti: str) -> bool:
    return pathlib.PurePosixPath(sti).match(BEVIS_SAKER)


def kildefeil(
    sti: str,
    data,
    kjente: set[str],
    opphevet: dict[str, set[str]],
    aapne: set[str],
    design_: dict[str, list[str]] | None = None,
    designavvik: frozenset[tuple[str, str]] = frozenset(),
    designtruffet: collections.Counter | None = None,
    avvik: frozenset[tuple[str, str]] = frozenset(),
    truffet: collections.Counter | None = None,
) -> list[str]:
    """Som `feil_i`, for kildelistene i en JSON-fil. `design_` leses bare i bevis-sakene."""
    feil = []
    for sted, kilder in kildelister(data):
        ider = [i for k in kilder for i in HENVISNING.findall(k)]
        for i in dict.fromkeys(ider):
            if i not in kjente and i not in aapne:
                feil.append(f"{sti}: {sted}: {i} er ikke et vedtak i registeret")
        gjeldende = [i for i in ider if i in kjente and i not in opphevet]
        if design_ and er_bevis_sak(sti) and gjeldende and all(i in design_ for i in gjeldende):
            for i in dict.fromkeys(gjeldende):
                if (sti, i) in designavvik:
                    if designtruffet is not None:
                        designtruffet[(sti, i)] += 1
                else:
                    feil += _designfeil(f"{sti}: {sted}", [i], design_)
        feil += _oppheverfeil(f"{sti}: {sted}", sti, ider, opphevet, avvik, truffet)
    return feil


def kildefiler(rot: pathlib.Path = vr.ROT):
    for sti in sorted((rot / KILDEMAPPE).rglob("*.json")):
        data = json.loads(sti.read_text(encoding="utf-8"))
        yield sti.relative_to(rot).as_posix(), data


def kontroller(
    register: dict,
    plan: str,
    rot: pathlib.Path = vr.ROT,
    rader=KJENTE_AVVIK,
    designrader=KJENTE_DESIGNAVVIK,
) -> list[str]:
    kjente, opphevet = vedtak(register)
    design_ = design(register)
    aapne = aapne_beslutninger(plan) | avgjorte_beslutninger(plan)
    avvik = frozenset((rad[0], rad[1]) for rad in rader if gyldig_rad(rad))
    designavvik = frozenset((rad[0], rad[1]) for rad in designrader if gyldig_rad(rad))
    truffet: collections.Counter = collections.Counter()
    designtruffet: collections.Counter = collections.Counter()
    feil = [
        f
        for sti, tekst in (*filer(rot), *dokumenter(rot))
        for f in feil_i(
            sti, tekst, kjente, opphevet, aapne, avvik, truffet,
            design_, designavvik, designtruffet,
        )
    ]
    feil += [
        f
        for sti, data in kildefiler(rot)
        for f in kildefeil(
            sti, data, kjente, opphevet, aapne, design_, designavvik, designtruffet,
            avvik=avvik, truffet=truffet,
        )
    ]
    return (
        feil
        + avviksfeil(rader, truffet)
        + avviksfeil(designrader, designtruffet, "KJENTE_DESIGNAVVIK", DESIGNAVVIK)
    )


def main() -> int:
    feil = kontroller(vr.les(), vr.HOVEDPLAN.read_text(encoding="utf-8"))
    if feil:
        print("Vedtakshenvisningene holder ikke:", *feil, sep="\n  ")
        return 1
    print(
        "Vedtakshenvisningene i "
        + ", ".join((*MAPPER, KILDEMAPPE, *DOKUMENTER))
        + " holder"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
