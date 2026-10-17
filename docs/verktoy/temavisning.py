"""Temavisningene: regelgrunnlaget per tema, generert fra vedtaksregisteret (#454, punkt 5 i #451).

    python3 docs/verktoy/temavisning.py           # kontroller temaene og skriv visningene
    python3 docs/verktoy/temavisning.py --sjekk   # bare kontroller, skriv ingenting

Temaene står i docs/vedtaksregister/temaer.toml. En visning samler vedtakene i
temaet ordrett, slik raden står i 3.1, med de forkastede alternativene merket,
forholdene mellom dem og henvisningene til regelradene og bevis-sakene som viser
til dem. Den lager ingen sammenslått gjeldende ordlyd. Avsnitt 3.1 i hovedplanen
er autoritativ, og visningen sier det.

Et tema har vedtakene oppdragsgiver har pekt ut (`kjerne`) og, transitivt, hvert
vedtak som endrer, utvider, snevrer inn, presiserer eller opphever et vedtak i
temaet etter `forhold` i registeret (arbeidsvalg A i #454). Temadefinisjonen
lister alle vedtakene; mangler ett, er det en feil. Forhold som Følge bare sier
med ord, uten lenke, står ikke i `forhold` og ses ikke.

Kontrollsummen er SHA-256 over utdraget av kildene visningen leser: postene i
temaet, etikettene til vedtakene den lenker til, regelradene og forløpene. En
endring andre steder i kildene endrer den ikke.
"""

import argparse
import hashlib
import importlib.util
import json
import os
import pathlib
import re
import sys

import tomllib

_spesifikasjon = importlib.util.spec_from_file_location(
    "vedtakshenvisninger", pathlib.Path(__file__).resolve().parent / "vedtakshenvisninger.py"
)
vh = importlib.util.module_from_spec(_spesifikasjon)
_spesifikasjon.loader.exec_module(vh)
vr = vh.vr

ROT = vr.ROT
TEMAER = ROT / "docs" / "vedtaksregister" / "temaer.toml"
MAPPE = ROT / "docs" / "vedtaksregister" / "temaer"
PLANMAPPE = vr.HOVEDPLAN.parent
REGLER = ROT / "docs" / "domenetabell" / "regler.json"
BEVIS = {
    "": ROT / "docs" / "domenetabell" / "bevis-saker.json",
    " (målmodellen)": ROT / "docs" / "domenetabell" / "bevis-saker-maalmodell.json",
}

TIL_PLANEN = "../../plans/2026-09-16-godkjenning-og-varig-levering.md"
TIL_TABELLEN = "../../domenetabell/README.md#tabellen"
LENKE = re.compile(r"\]\(#([^)\s]+)\)")
# Målet i en lenke i vedtaksteksten, også i vinkelparenteser og med tittel (#494, #604).
MAAL = re.compile(r"\]\(\s*(<[^<>\n]*>|[^)\s]+)((?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*)\)")
SKJEMA = re.compile(r"[a-z][a-z0-9+.-]*:", re.IGNORECASE)
# Et merke som begynner en setning i vedtaksteksten til en importert post: «Forkastet:»,
# formene med en avgrensning, som «Forkastet foreløpig:», og «Utsatt:».
MERKE = re.compile(r"(?<=[.»] )(?:Forkastet|Utsatt)[^:«]{0,60}?: ")


def les_temaer(sti: pathlib.Path = TEMAER) -> list[dict]:
    with sti.open("rb") as f:
        return tomllib.load(f)["tema"]


def les_kilder() -> dict:
    return {
        "register": vr.les(),
        "regler": json.loads(REGLER.read_text(encoding="utf-8")),
        "bevis": {merke: json.loads(sti.read_text(encoding="utf-8")) for merke, sti in BEVIS.items()},
    }


def _forhold(register: dict) -> list[tuple[str, str, str]]:
    """Forholdene i registeret som (fra, art, til), med ankrene. Også de importerte postene har `forhold` (#423)."""
    return [
        (vr.anker(p), f["art"], f["vedtak"])
        for p in vr.poster(register)
        for f in p.get("forhold", [])
    ]


def feil(tema: dict, register: dict) -> list[str]:
    alle = {vr.anker(p) for p in vr.poster(register) if vr.anker(p)}
    medlemmer = {v.lower() for v in tema["vedtak"]}
    kjerne = {v.lower() for v in tema["kjerne"]}
    meldinger = [
        f"{tema['id']}: {v} er ikke et vedtak med anker i registeret"
        for v in [*tema["kjerne"], *tema["vedtak"]]
        if v.lower() not in alle
    ]
    meldinger += [
        f"{tema['id']}: {v} står i kjernen, men ikke i vedtakene"
        for v in tema["kjerne"]
        if v.lower() not in medlemmer
    ]
    if len(medlemmer) != len(tema["vedtak"]) or len(kjerne) != len(tema["kjerne"]):
        meldinger.append(f"{tema['id']}: et vedtak står mer enn én gang")
    meldinger += [
        f"{tema['id']}: {fra.upper()} {art} {til.upper()}, men står ikke i temaet"
        for fra, art, til in _forhold(register)
        if til in medlemmer and fra not in medlemmer
    ]
    return meldinger


def _medlemmer(tema: dict, register: dict) -> list[dict]:
    """Postene i temaet, i rekkefølgen i 3.1."""
    medlemmer = {v.lower() for v in tema["vedtak"]}
    return [p for p in vr.poster(register) if vr.anker(p) in medlemmer]


def _ider(poster: list[dict]) -> set[str]:
    """Vedtaks-ID-ene regelradene og bevis-sakene viser til, som «GR-U10» og «B-03»."""
    return set().union(*(vh.vedtaks_ider(p) for p in poster))


def _rader(ider: set[str], regler: dict) -> list[dict]:
    return [r for r in regler["rader"] if ider & set(r["kilder"])]


def _forlop_etter_vedtak(ider: set[str], bevis: dict) -> list[tuple[str, dict]]:
    return [
        (merke, f)
        for merke, korpus in bevis.items()
        for f in korpus["forlop"]
        if any(ider & set(k.get("kilde", [])) for k in f["kontroller"])
    ]


def _forlop_etter_rad(rad: str, bevis: dict) -> list[str]:
    return [f"{f['id']}{merke}" for merke, korpus in bevis.items() for f in korpus["forlop"] if rad in f["rader"]]


def utdrag(tema: dict, kilder: dict, ix: tuple[dict, dict] | None = None) -> dict:
    """Det visningen leser. Kontrollsummen tas over dette."""
    register = kilder["register"]
    medlemmer = _medlemmer(tema, register)
    ider = _ider(medlemmer)
    ankre = {vr.anker(p) for p in medlemmer}
    ix = ix or vr.indeks(register)
    rader = _rader(ider, kilder["regler"])
    radider = {r["id"] for r in rader}
    alle, _ = ix
    lenket = sorted(
        {m.group(1) for p in medlemmer for m in LENKE.finditer(vr.folgecelle(p, register, ix))}
        | {a for fra, _, til in _forhold(register) for a in (fra, til) if ankre & {fra, til}}
    )
    return {
        "tema": tema,
        "poster": medlemmer,
        "senere": [
            (vr.anker(p), p["dato"], f) for p in vr.poster(register) if vr.er_ny(p)
            for f in p.get("forhold", [])
            if f["vedtak"] in ankre
        ],
        "etiketter": {a: vr.etikett(alle[a]) for a in lenket if a in alle},
        "rader": rader,
        "forlop": [
            {"merke": merke, "id": f["id"], "rader": f["rader"], "kilder": [k.get("kilde", []) for k in f["kontroller"]]}
            for merke, korpus in kilder["bevis"].items()
            for f in korpus["forlop"]
            if radider & set(f["rader"]) or any(ider & set(k.get("kilde", [])) for k in f["kontroller"])
        ],
    }


def kontrollsum(ut: dict) -> str:
    tekst = json.dumps(ut, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(tekst.encode("utf-8")).hexdigest()


def _fra_planen(maal: str, medlemmer: set[str]) -> str:
    """Et lenkemål i 3.1, skrevet om fra hovedplanen i docs/plans/ til mappen visningen ligger i.

    Et anker i planen går til overskriften i visningen når vedtaket er i temaet, også når
    lenken nevner filnavnet til planen. En sti med `/` først er relativ til roten av repoet.
    """
    if SKJEMA.match(maal):
        return maal
    fil, skille, fragment = maal.partition("#")
    if fil:
        sti = pathlib.Path(os.path.normpath(ROT / fil.lstrip("/") if fil.startswith("/") else PLANMAPPE / fil))
        if sti != vr.HOVEDPLAN:
            return pathlib.Path(os.path.relpath(sti, MAPPE)).as_posix() + skille + fragment
    if not skille:
        return TIL_PLANEN
    return f"#{fragment}" if fragment in medlemmer else f"{TIL_PLANEN}#{fragment}"


def _lenker(tekst: str, medlemmer: set[str]) -> str:
    """Lenkene i 3.1 er relative til hovedplanen: ankrene i den og filstiene fra docs/plans/.

    Et vedtak i temaet har sin egen overskrift i visningen. Resten går til planen, og
    filstiene skrives om til mappen visningen ligger i. Tittel og vinkelparenteser beholdes.
    """

    def skriv_om(m: re.Match) -> str:
        maal = m.group(1)
        if maal.startswith("<"):
            return f"](<{_fra_planen(maal[1:-1], medlemmer)}>{m.group(2)})"
        return f"]({_fra_planen(maal, medlemmer)}{m.group(2)})"

    return MAAL.sub(skriv_om, tekst)


def vedtak_og_forkastet(post: dict) -> tuple[str, list[tuple[str, str]]]:
    """Vedtaksteksten i 3.1, delt i vedtaket og de merkede delene etter det, som de forkastede alternativene.

    Hver del har merket sitt, som «Forkastet:» eller «Utsatt:». Satt sammen med ett
    mellomrom er delene lik teksten i 3.1.
    """
    if vr.er_ny(post):
        forkastet = [f"«{vr.linje(a['tekst'])}»" for a in post["alternativ"] if a.get("forkastet")]
        vedtak = f"{post['id']}: {vr.linje(vr._valgt(post)['tekst'])}"
        return vedtak, [("Forkastet:", "; ".join(forkastet))] if forkastet else []
    tekst = vr.linje(post["vedtak"])
    treff = list(MERKE.finditer(tekst))
    if not treff:
        return tekst, []
    deler = [
        (t.group(0).rstrip(), tekst[t.end() : neste.start() - 1 if neste else None])
        for t, neste in zip(treff, [*treff[1:], None])
    ]
    return tekst[: treff[0].start() - 1], deler


def _radanker(rad: str) -> str:
    return f"rad-{rad.lower()}"


def _vedtakslenke(anker: str, etiketter: dict, medlemmer: set[str]) -> str:
    maal = f"#{anker}" if anker in medlemmer else f"{TIL_PLANEN}#{anker}"
    return f"[{etiketter.get(anker, anker.upper())}]({maal})"


def visning(tema: dict, kilder: dict) -> str:
    register = kilder["register"]
    ix = vr.indeks(register)
    ut = utdrag(tema, kilder, ix)
    poster = ut["poster"]
    kjerne = {v.lower() for v in tema["kjerne"]}
    medlemmer = {vr.anker(p) for p in poster}
    etiketter = ut["etiketter"] | {vr.anker(p): vr.etikett(p) for p in poster}
    forhold = _forhold(register)
    bevis = kilder["bevis"]
    ider_for = {vr.anker(p): _ider([p]) for p in poster}

    def lenke(a: str) -> str:
        return _vedtakslenke(a, etiketter, medlemmer)

    tillagt = [vr.anker(p) for p in poster if vr.anker(p) not in kjerne]
    linjer = [
        f"# Regelgrunnlaget: {tema['tittel'][0].lower()}{tema['tittel'][1:]}",
        "",
        (
            "<!-- Generert av docs/verktoy/temavisning.py fra docs/vedtaksregister/temaer.toml. "
            "Rett ikke for hånd. -->"
        ),
        "",
        (
            f"**Avsnitt [3.1 i hovedplanen]({TIL_PLANEN}#31-vedtatte-premisser-og-beslutninger) "
            "er autoritativ.** Denne visningen er generert fra "
            "[vedtaksregisteret](../README.md) og er ikke et eget vedtaksgrunnlag. Den samler "
            "vedtakene ordrett, med forholdene mellom dem, og lager ingen sammenslått gjeldende "
            "ordlyd: hva som gjelder, leses av vedtakene sammen, etter forholdene."
        ),
        "",
        f"Temaet er {', '.join(lenke(v.lower()) for v in tema['kjerne'])} ({', '.join(tema['kilde'])}). "
        + (
            "I tillegg står vedtakene som endrer, utvider, snevrer inn, presiserer eller "
            f"opphever et vedtak i temaet: {', '.join(lenke(a) for a in tillagt)}. "
            if tillagt
            else ""
        )
        + "Vedtak som temaet viser til, står som lenke til 3.1.",
        "",
        "## Kildegrunnlaget",
        "",
        "- Vedtakene: [`docs/vedtaksregister/vedtak.toml`](../vedtak.toml)",
        "- Temaet: [`docs/vedtaksregister/temaer.toml`](../temaer.toml)",
        "- Regelradene: [`docs/domenetabell/regler.json`](../../domenetabell/regler.json)",
        (
            "- Bevis-sakene: [`docs/domenetabell/bevis-saker.json`](../../domenetabell/bevis-saker.json) "
            "og [`docs/domenetabell/bevis-saker-maalmodell.json`](../../domenetabell/bevis-saker-maalmodell.json)"
        ),
        "",
        f"Kontrollsum (SHA-256 over utdraget visningen leser): `{kontrollsum(ut)}`",
        "",
        "Lag visningen på nytt med `python3 docs/verktoy/temavisning.py`.",
        "",
        "## Kjeden",
        "",
        (
            "Forholdene etter `forhold` i registeret. Forhold som Følge bare sier med ord, står "
            "under Følge hos vedtaket."
        ),
        "",
        "| Vedtak | Viser til | Vist til av |",
        "| --- | --- | --- |",
    ]
    for p in poster:
        a = vr.anker(p)
        aktive = [f"{art.capitalize()} {lenke(til)}" for fra, art, til in forhold if fra == a]
        passive = [
            f"{vr.FORHOLD[art]} av {lenke(fra)}" for fra, art, til in forhold if til == a
        ]
        linjer.append(f"| {lenke(a)} | {'; '.join(aktive) or '—'} | {'; '.join(passive) or '—'} |")
    linjer += ["", "## Vedtakene", ""]
    for p in poster:
        ider = ider_for[vr.anker(p)]
        vedtak, forkastet = vedtak_og_forkastet(p)
        linjer += [f'### <a id="{vr.anker(p)}"></a>{vr.etikett(p)}', "", f"> {_lenker(vedtak, medlemmer)}", ""]
        for merke, tekst in forkastet:
            linjer += [f"**{merke}** {_lenker(tekst, medlemmer)}", ""]
        linjer += [
            f"**Vedtatt:** {_lenker(vr.vedtattcelle(p), medlemmer)}",
            "",
            f"**Følge:** {_lenker(vr.folgecelle(p, register, ix), medlemmer)}",
            "",
            "**Regelrader:** "
            + (", ".join(f"[{r['id']}](#{_radanker(r['id'])})" for r in _rader(ider, {"rader": ut["rader"]})) or "—"),
            "",
            "**Bevis-saker som viser til vedtaket:** "
            + (", ".join(f"{f['id']}{merke}" for merke, f in _forlop_etter_vedtak(ider, bevis)) or "—"),
            "",
        ]
    linjer += [
        "## Regelradene",
        "",
        (
            f"Radene i [domenetabellen]({TIL_TABELLEN}) som viser til et vedtak i temaet, med "
            "bevis-sakene for raden."
        ),
        "",
        "| Rad | Tilfelle | Vedtak i temaet | Bevis-saker |",
        "| --- | --- | --- | --- |",
    ]
    anker_for = {i: a for a, ider in ider_for.items() for i in ider}
    for r in ut["rader"]:
        i_temaet = ", ".join(lenke(anker_for[k]) for k in r["kilder"] if k in anker_for)
        tilfelle = r["tilfelle"].replace("|", "\\|")
        linjer.append(
            f'| <a id="{_radanker(r["id"])}"></a>{r["id"]} | {tilfelle} | {i_temaet} '
            f"| {', '.join(_forlop_etter_rad(r['id'], bevis)) or '—'} |"
        )
    return "\n".join(linjer) + "\n"


def sti(tema: dict) -> pathlib.Path:
    return MAPPE / f"{tema['id']}.md"


def foreldreloese(temaer: list[dict]) -> list[pathlib.Path]:
    """Visninger i mappen uten et tema i temaer.toml."""
    return sorted(set(MAPPE.glob("*.md")) - {sti(t) for t in temaer})


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--sjekk", action="store_true", help="bare kontroller, skriv ingenting")
    args = parser.parse_args()
    kilder = les_kilder()
    temaer = les_temaer()
    meldinger = [m for t in temaer for m in feil(t, kilder["register"])]
    meldinger += [f"{s.relative_to(ROT)} har ikke noe tema i temaer.toml" for s in foreldreloese(temaer)]
    if meldinger:
        print("\n".join(meldinger), file=sys.stderr)
        return 1
    utdatert = []
    for tema in temaer:
        tekst = visning(tema, kilder)
        if sti(tema).exists() and sti(tema).read_text(encoding="utf-8") == tekst:
            continue
        utdatert.append(sti(tema).relative_to(ROT))
        if not args.sjekk:
            sti(tema).parent.mkdir(parents=True, exist_ok=True)
            sti(tema).write_text(tekst, encoding="utf-8")
    for s in utdatert:
        print(f"{'utdatert' if args.sjekk else 'skrevet'}: {s}")
    return 1 if args.sjekk and utdatert else 0


if __name__ == "__main__":
    sys.exit(main())
