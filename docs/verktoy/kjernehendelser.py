"""Registeret over hendelsestypene TS-kjernen skriver, docs/datamodell/kjernehendelser.toml (#320).

Brukes av datamodell.py, som skriver kjernehendelser.md. Her prøves formen på
registeret. At typene, artene og feltene er de kjernen eksporterer, prøver
vitest-vakta kjerne/tester/register.test.ts, fordi kjernen er TypeScript.
"""

import pathlib

import tomllib

ROT = pathlib.Path(__file__).resolve().parents[2]
REGISTER = ROT / "docs" / "datamodell" / "kjernehendelser.toml"
MARKDOWN = ROT / "docs" / "datamodell" / "kjernehendelser.md"

SEKSJONER = {
    "hendelse": ("navn", ("navn", "beskrivelse", "felt", "grunnlag")),
    "krav": ("spor", ("spor", "beskrivelse", "felt", "grunnlag")),
    "svar": ("spor", ("spor", "beskrivelse", "felt", "grunnlag")),
    "standpunkt": ("art", ("art", "spor", "beskrivelse", "felt", "grunnlag")),
    "utsagn": ("art", ("art", "avsender", "beskrivelse", "felt", "grunnlag")),
    "del": ("navn", ("navn", "spor", "beskrivelse", "felt", "grunnlag")),
    "opplysning": ("hva", ("hva", "beskrivelse", "felt", "grunnlag")),
}
VALGFRIE = {("del", "spor")}
SPOR = ("grunnlag", "vederlag", "frist")
AVSENDERE = ("TE", "BH", "TE eller BH")

MERKNAD = (
    "Generert fra docs/datamodell/kjernehendelser.toml av docs/verktoy/datamodell.py. "
    "Rett i registeret, ikke her."
)


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as f:
        return tomllib.load(f)


def valider(register: dict) -> list[str]:
    """Feilene i formen på registeret, tomme når det er gyldig."""
    feil = []
    if register.get("format") != 1:
        feil.append("format: skal være 1")
    ukjente = set(register) - set(SEKSJONER) - {"format"}
    feil += [f"{s}: ukjent seksjon" for s in sorted(ukjente)]
    for seksjon, (noekkel, felt) in SEKSJONER.items():
        sett = set()
        for o in register.get(seksjon, []):
            navn = f"{seksjon} {o.get(noekkel)}"
            mangler = [f for f in felt if f not in o and (seksjon, f) not in VALGFRIE]
            feil += [f"{navn}: mangler {f}" for f in mangler]
            feil += [f"{navn}: ukjent felt {f}" for f in o if f not in felt]
            for f in ("beskrivelse", "grunnlag"):
                if not str(o.get(f, "")).strip():
                    feil.append(f"{navn}: {f} er tom")
            if not o.get("felt") or len(set(o.get("felt", []))) != len(o.get("felt", [])):
                feil.append(f"{navn}: felt er tom eller har et felt to ganger")
            spor = o.get("spor", [])
            for s in spor if isinstance(spor, list) else [spor]:
                if s not in SPOR:
                    feil.append(f"{navn}: ukjent spor {s}")
            if "avsender" in o and o["avsender"] not in AVSENDERE:
                feil.append(f"{navn}: ukjent avsender {o['avsender']}")
            identitet = (o.get(noekkel), o.get("spor") if seksjon == "del" else None)
            if identitet in sett:
                feil.append(f"{navn}: står to ganger")
            sett.add(identitet)
    return feil


def _tekst(verdi: str) -> str:
    return " ".join(verdi.split())


def _felt(o: dict) -> str:
    return ", ".join(f"`{f}`" for f in o["felt"])


def markdown(register: dict) -> str:
    linjer = [
        "# Hendelsene TS-kjernen skriver",
        "",
        f"_{MERKNAD}_",
        "",
        f"Format {register['format']}. Formen er skjemaene i "
        "[`kjerne/format.ts`](../../kjerne/format.ts), og designet står i "
        "[designnotatet](../design-hendelsesformat-2026-10-09.md). Pythons hendelsestyper "
        "står i [hendelser.md](hendelser.md).",
        "",
        "Hver rad har kolonnen `format`. `data` har ingen `null`, ingen tom liste og ingen "
        "tom streng, og et ukjent felt eller en ukjent art gjør saken ikke forstått "
        "(MM-U2). Hvert element har en `id` satt av serveren, og relasjonene står som "
        "`gjelder` og `erstatter`.",
        "",
        "## Typene",
        "",
        "| Type | Innhold | Felt i `data` | Grunnlag |",
        "| --- | --- | --- | --- |",
    ]
    linjer += [
        f"| `{h['navn']}` | {_tekst(h['beskrivelse'])} | {_felt(h)} | {_tekst(h['grunnlag'])} |"
        for h in register["hendelse"]
    ]
    for seksjon, tittel, noekkel in (
        ("krav", "Krav", "spor"),
        ("svar", "Svar", "spor"),
        ("standpunkt", "Standpunkter i et svar", "art"),
        ("utsagn", "Andre utsagn", "art"),
        ("opplysning", "Opplysninger om dokumentet", "hva"),
    ):
        ekstra = {"standpunkt": "Spor", "utsagn": "Avsender"}.get(seksjon)
        linjer += [
            "",
            f"## {tittel}",
            "",
            f"| {noekkel.capitalize()} | Innhold |{f' {ekstra} |' if ekstra else ''} Felt | Grunnlag |",
            f"| --- | --- |{' --- |' if ekstra else ''} --- | --- |",
        ]
        for o in register[seksjon]:
            verdi = o.get("spor") if seksjon == "standpunkt" else o.get("avsender")
            kolonne = f" {', '.join(verdi) if isinstance(verdi, list) else verdi} |" if ekstra else ""
            linjer.append(
                f"| `{o[noekkel]}` | {_tekst(o['beskrivelse'])} |{kolonne} {_felt(o)} | {_tekst(o['grunnlag'])} |"
            )
    linjer += ["", "## Delene", "", "| Del | Spor | Innhold | Felt | Grunnlag |", "| --- | --- | --- | --- | --- |"]
    linjer += [
        f"| `{d['navn']}` | {d.get('spor', 'alle')} | {_tekst(d['beskrivelse'])} | {_felt(d)} | {_tekst(d['grunnlag'])} |"
        for d in register["del"]
    ]
    return "\n".join(linjer) + "\n"
