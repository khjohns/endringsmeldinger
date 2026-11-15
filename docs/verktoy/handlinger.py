"""Registeret over handlingene og tilstandene, docs/datamodell/handlinger.toml (#2003, OV-U97).

Brukes av datamodell.py, som skriver handlinger.md. Vakttesten
verktoy/tester/test_datamodell/test_handlinger.py prøver formen, kildene mot
vedtaksregisteret og at hvert skjema i Varden har en rad. At kjernens kommandoer,
handlingsnøkler og betegnelser har rad, og at kjernen ikke tilbyr en handling som venter,
sendes som innlegg eller er opphevet, prøves i kjerne/tester/ (steg 2 i #2003).
"""

import pathlib
import re
import tomllib

ROT = pathlib.Path(__file__).resolve().parents[2]
REGISTER = ROT / "docs" / "datamodell" / "handlinger.toml"
MARKDOWN = ROT / "docs" / "datamodell" / "handlinger.md"
VARDENSAK = ROT / "src" / "lib" / "components" / "varden" / "Vardensak.svelte"

HANDLINGSFELT = (
    "id", "navn", "part", "spor", "kilde", "finnes", "form", "naar", "tilstander",
    "status", "noekler", "kommandoer", "skjema", "mangler",
)
BETEGNELSESFELT = ("noekkel", "nivaa", "betydning", "kilde", "status")
AVVIKSFELT = ("noekler", "handling", "funn", "issue")
TEKSTFELT = ("navn", "finnes", "form", "naar", "tilstander", "mangler")
LISTEFELT = ("spor", "kilde", "noekler", "kommandoer", "skjema")

PARTER = ("TE", "BH", "TE og BH")
SPOR = ("forhold", "vederlag", "frist")
NIVAA = ("spor", "sak")
BETEGNELSESSTATUS = ("holder", "endres", "utgaar", "ny")
# Statusen hver ID-serie har: G er grunnsettet og U det som er utover det (OV-U97).
STATUS_FOR_SERIE = {
    "G": ("grunnsett",),
    "U": ("naa", "venter"),
    "V": ("venter",),
    "I": ("innlegg",),
    "O": ("opphevet",),
}
STATUSTEKST = {
    "grunnsett": "Grunnsettet",
    "naa": "Utover grunnsettet, nå",
    "venter": "Venter",
    "innlegg": "Sendes som innlegg",
    "opphevet": "Opphevet",
}
STATUSENE = tuple(STATUSTEKST)
IKKE_TILBUDT = ("venter", "innlegg", "opphevet")
ID = re.compile(r"[GUVIO][1-9][0-9]?")
NOEKKEL = re.compile(r"[a-z_]+(:([a-z]+|[0-9.]+|\*))?")

MERKNAD = (
    "Generert fra docs/datamodell/handlinger.toml av docs/verktoy/datamodell.py. "
    "Rett i registeret, ikke her."
)


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as f:
        return tomllib.load(f)


def _form(navn: str, o: dict, felt: tuple[str, ...]) -> list[str]:
    feil = [f"{navn}: mangler {f}" for f in felt if f not in o]
    return feil + [f"{navn}: ukjent felt {f}" for f in o if f not in felt]


def _handlingsfeil(h: dict) -> list[str]:
    navn = f"handling {h.get('id')}"
    feil = _form(navn, h, HANDLINGSFELT)
    if not ID.fullmatch(str(h.get("id", ""))):
        feil.append(f"{navn}: id er ikke på formen G1, U1, V1, I1 eller O1")
    feil += [f"{navn}: {f} er tom" for f in TEKSTFELT if not str(h.get(f, "")).strip()]
    for f in LISTEFELT:
        verdi = h.get(f, [])
        if not isinstance(verdi, list) or len(set(verdi)) != len(verdi):
            feil.append(f"{navn}: {f} er ikke en liste uten gjentakelser")
    if "kilde" in h and not h["kilde"]:
        feil.append(f"{navn}: kilde er tom")
    feil += [
        f"{navn}: skjema {s} er ikke en av nøklene i raden"
        for s in h.get("skjema", [])
        if s not in h.get("noekler", [])
    ]
    if h.get("part") not in PARTER:
        feil.append(f"{navn}: ukjent part {h.get('part')}")
    feil += [f"{navn}: ukjent spor {s}" for s in h.get("spor", []) if s not in SPOR]
    status = h.get("status")
    if status not in STATUSENE:
        feil.append(f"{navn}: ukjent status {status}")
    elif status not in STATUS_FOR_SERIE.get(str(h.get("id", ""))[:1], ()):
        feil.append(f"{navn}: status {status} passer ikke til serien")
    feil += [
        f"{navn}: noekkel {n} er ikke på formen type, type:spor, type:hjemmel eller type:*"
        for n in h.get("noekler", [])
        if not NOEKKEL.fullmatch(n)
    ]
    return feil


def valider(register: dict) -> list[str]:
    """Feilene i formen på registeret, tomme når det er gyldig."""
    feil = []
    if register.get("format") != 1:
        feil.append("format: skal være 1")
    ukjente = set(register) - {"format", "handling", "betegnelse", "avvik"}
    feil += [f"{s}: ukjent seksjon" for s in sorted(ukjente)]
    handlinger = register.get("handling", [])
    for h in handlinger:
        feil += _handlingsfeil(h)
    for felt in ("id", "noekler", "skjema"):
        sett: dict[str, str] = {}
        for h in handlinger:
            for verdi in h.get(felt, []) if felt != "id" else [h.get("id")]:
                if verdi in sett:
                    feil.append(f"{felt} {verdi}: står i både {sett[verdi]} og {h.get('id')}")
                sett.setdefault(verdi, h.get("id"))
    eiere = {n: h.get("id") for h in handlinger for n in h.get("noekler", [])}
    for n, eier in eiere.items():
        type_, _, gjelder = n.partition(":")
        if gjelder == "*":
            feil += [
                f"noekler {annen}: står i {eiere[annen]}, mens {n} står i {eier}"
                for annen in eiere
                if annen != n and annen.partition(":")[0] == type_ and eiere[annen] != eier
            ]
    sett = set()
    for b in register.get("betegnelse", []):
        navn = f"betegnelse {b.get('noekkel')}"
        feil += _form(navn, b, BETEGNELSESFELT)
        if b.get("noekkel") in sett:
            feil.append(f"{navn}: står to ganger")
        sett.add(b.get("noekkel"))
        if b.get("nivaa") not in NIVAA:
            feil.append(f"{navn}: ukjent nivaa {b.get('nivaa')}")
        if b.get("status") not in BETEGNELSESSTATUS:
            feil.append(f"{navn}: ukjent status {b.get('status')}")
        if not str(b.get("betydning", "")).strip():
            feil.append(f"{navn}: betydning er tom")
        if not isinstance(b.get("kilde"), list) or not b.get("kilde"):
            feil.append(f"{navn}: kilde er ikke en liste med minst én kilde")
    radene = {h.get("id"): h for h in handlinger}
    i_avvik: set[str] = set()
    for a in register.get("avvik", []):
        navn = f"avvik {a.get('handling')}"
        feil += _form(navn, a, AVVIKSFELT)
        rad = radene.get(a.get("handling"))
        if not a.get("noekler"):
            feil.append(f"{navn}: noekler er tom")
        if rad is None or not set(a.get("noekler", [])) <= set(rad.get("noekler", [])):
            feil.append(f"{navn}: nøklene står ikke i handlingen {a.get('handling')}")
        elif rad.get("status") not in IKKE_TILBUDT:
            feil.append(f"{navn}: handlingen {a.get('handling')} har status {rad.get('status')}, ikke et avvik")
        feil += [f"{navn}: {n} står i et annet avvik" for n in a.get("noekler", []) if n in i_avvik]
        i_avvik |= set(a.get("noekler", []))
        if not isinstance(a.get("issue"), int):
            feil.append(f"{navn}: issue er ikke et nummer")
    return feil


# En streng, en malstreng eller en kommentar, så klammene i dem ikke telles.
_HOPP = re.compile(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`|//[^\n]*|/\*.*?\*/", re.DOTALL)
_NOEKKEL_I_TABELLEN = re.compile(r"\s*:")
_NAVN = re.compile(r"[A-Za-z_$][\w$]*")


def skjemaene_i_varden(sti: pathlib.Path = VARDENSAK) -> set[str]:
    """Nøklene øverst i objektet `const skjemaene` i Vardensak.svelte, lest som tekst.

    En nøkkel er en streng eller et navn som står etter `{` eller `,` og foran `:`.
    Feiler når objektet ikke finnes eller ikke lukkes, så vakttesten ikke blir grønn av
    en lesing som ikke fant noe."""
    tekst = sti.read_text(encoding="utf-8")
    start = re.search(r"const skjemaene\b[^\n]*?=\s*\{", tekst)
    if not start:
        raise ValueError(f"{sti} har ingen `const skjemaene`")
    noekler, dybde, i, forrige = set(), 1, start.end(), "{"
    while dybde:
        if i >= len(tekst):
            raise ValueError(f"`const skjemaene` i {sti} lukkes ikke")
        if tekst[i].isspace():
            i += 1
            continue
        ord_ = _HOPP.match(tekst, i) or _NAVN.match(tekst, i)
        if ord_ and ord_.group().startswith(("//", "/*")):
            i = ord_.end()
            continue
        if ord_:
            if dybde == 1 and forrige in "{," and _NOEKKEL_I_TABELLEN.match(tekst, ord_.end()):
                noekler.add(ord_.group().strip("'\"`"))
            i, forrige = ord_.end(), ord_.group()[-1]
            continue
        dybde += {"{": 1, "}": -1}.get(tekst[i], 0)
        i, forrige = i + 1, tekst[i]
    return noekler


def _tekst(verdi: str) -> str:
    return " ".join(verdi.split()).replace("|", "\\|")


def _kode(verdier: list[str]) -> str:
    return ", ".join(f"`{v}`" for v in verdier) or "–"


def markdown(register: dict) -> str:
    linjer = [
        "# Handlingene og tilstandene",
        "",
        f"_{MERKNAD}_",
        "",
        "Regelen er [OV-U97](../plans/vedtak.md#ov-u97), og statusen per handling "
        "[OV-U99](../plans/vedtak.md#ov-u99) og [OV-U101](../plans/vedtak.md#ov-u101). "
        "Portene og drøftingen står i "
        "[vurderingsfila](../vurdering-handlinger-og-tilstander-2026-11-15.md). "
        "En rad er en handling slik brukeren ser den, ikke en kommando.",
        "",
        "Kolonnene for kjernen er handlingsnøklene (`noekkel` i "
        "[`forutsetninger.ts`](../../kjerne/kommandoer/forutsetninger.ts)) og kommandoene "
        "(`Kommando` i [`kommando.ts`](../../kjerne/kommandoer/kommando.ts)). Skjemaet er "
        "nøkkelen i `skjemaene` i "
        "[`Vardensak.svelte`](../../src/lib/components/varden/Vardensak.svelte).",
    ]
    for status in STATUSENE:
        rader = [h for h in register["handling"] if h["status"] == status]
        linjer += [
            "",
            f"## {STATUSTEKST[status]}",
            "",
            "| ID | Handling | Part | Spor | Kilde | 1 Finnes? | 2 Form | 3 Når | 4 Tilstander "
            "| Nøkler | Kommandoer | Skjema | Mangler |",
            "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
        linjer += [
            f"| {h['id']} | {_tekst(h['navn'])} | {h['part']} | {', '.join(h['spor']) or 'saken'} "
            f"| {', '.join(h['kilde'])} | {_tekst(h['finnes'])} | {_tekst(h['form'])} "
            f"| {_tekst(h['naar'])} | {_tekst(h['tilstander'])} | {_kode(h['noekler'])} "
            f"| {_kode(h['kommandoer'])} | {_kode(h['skjema'])} | {_tekst(h['mangler'])} |"
            for h in rader
        ]
    linjer += [
        "",
        "## Tilstandene (port 0)",
        "",
        "Sporets betegnelse (`BETEGNELSER`) og sakens (`Saksbetegnelse`) i "
        "[`visning.ts`](../../kjerne/utledning/visning.ts). Status er `holder`, `endres`, "
        "`utgaar` eller `ny`.",
        "",
        "| Betegnelse | Nivå | Hvem har sagt hva | Kilde | Status |",
        "| --- | --- | --- | --- | --- |",
    ]
    linjer += [
        f"| `{b['noekkel']}` | {b['nivaa']} | {_tekst(b['betydning'])} | {', '.join(b['kilde'])} "
        f"| {b['status']} |"
        for b in register["betegnelse"]
    ]
    linjer += [
        "",
        "## Avvikene",
        "",
        "Den lukkede listen: kjernen tilbyr handlingen mot statusen i raden. Avviket fjernes "
        "her i PR-en som retter kjernen.",
        "",
        "| Nøkler | Handling | Funn | Issue |",
        "| --- | --- | --- | --- |",
    ]
    linjer += [
        f"| {_kode(a['noekler'])} | {a['handling']} | {a['funn']} "
        f"| [#{a['issue']}](https://github.com/khjohns/endringsmeldinger/issues/{a['issue']}) |"
        for a in register.get("avvik", [])
    ]
    return "\n".join(linjer) + "\n"
