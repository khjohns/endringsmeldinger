"""Kontrakten i docs/domenetabell/kontrakt.json og en validator for den (#272).

Skjemaet er JSON Schema 2020-12, men bruker bare nøkkelordene i `NOKKELORD`.
Validatoren under kan akkurat dem, og et annet nøkkelord i skjemaet er en
feil, så skjemaet ikke kan vokse forbi det testene faktisk prøver. Annotasjoner
som begynner med `x-`, ignoreres.
"""

import json
import pathlib

ROT = pathlib.Path(__file__).resolve().parents[3]
SKJEMA = json.loads((ROT / "docs" / "domenetabell" / "kontrakt.json").read_text(encoding="utf-8"))
DEFS = SKJEMA["$defs"]

ANNOTASJONER = {"$schema", "$id", "$defs", "title", "description"}
NOKKELORD = {
    "type", "enum", "const", "properties", "required", "additionalProperties",
    "items", "anyOf", "$ref", "minimum", "minLength",
}
TYPER = {
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "null": lambda v: v is None,
}


def ukjente_nokkelord(skjema=SKJEMA, sti="#") -> list[str]:
    feil = []
    if isinstance(skjema, dict):
        for nokkel, verdi in skjema.items():
            if nokkel.startswith("x-"):
                continue
            if nokkel not in NOKKELORD | ANNOTASJONER:
                feil.append(f"{sti}: {nokkel}")
            if nokkel in ("properties", "$defs"):
                for navn, del_ in verdi.items():
                    feil += ukjente_nokkelord(del_, f"{sti}/{nokkel}/{navn}")
            elif nokkel in ("items", "additionalProperties") and isinstance(verdi, dict):
                feil += ukjente_nokkelord(verdi, f"{sti}/{nokkel}")
            elif nokkel == "anyOf":
                for i, del_ in enumerate(verdi):
                    feil += ukjente_nokkelord(del_, f"{sti}/anyOf/{i}")
    return feil


def oppslag(ref: str) -> dict:
    """`#/$defs/navn` eller en peker videre inn i en definisjon."""
    if not ref.startswith("#/"):
        raise ValueError(f"Bare lokale referanser: {ref}")
    del_ = SKJEMA
    for ledd in ref[2:].split("/"):
        del_ = del_[ledd]
    return del_


def feil_i(verdi, skjema, sti="$") -> list[str]:
    """Avvikene mellom verdien og skjemaet; tom liste når verdien holder."""
    feil = feil_i(verdi, oppslag(skjema["$ref"]), sti) if "$ref" in skjema else []
    if "anyOf" in skjema and all(feil_i(verdi, s, sti) for s in skjema["anyOf"]):
        feil.append(f"{sti}: {verdi!r} passer ingen av alternativene")
    if "type" in skjema:
        typer = skjema["type"] if isinstance(skjema["type"], list) else [skjema["type"]]
        if not any(TYPER[t](verdi) for t in typer):
            return [f"{sti}: {verdi!r} er ikke {'/'.join(typer)}"]
    if "const" in skjema and verdi != skjema["const"]:
        feil.append(f"{sti}: {verdi!r} er ikke {skjema['const']!r}")
    if "enum" in skjema and verdi not in skjema["enum"]:
        feil.append(f"{sti}: {verdi!r} er ikke en av {skjema['enum']}")
    if "minimum" in skjema and TYPER["number"](verdi) and verdi < skjema["minimum"]:
        feil.append(f"{sti}: {verdi} er under {skjema['minimum']}")
    if "minLength" in skjema and isinstance(verdi, str) and len(verdi) < skjema["minLength"]:
        feil.append(f"{sti}: er kortere enn {skjema['minLength']}")
    if isinstance(verdi, dict):
        egenskaper = skjema.get("properties", {})
        for navn in skjema.get("required", []):
            if navn not in verdi:
                feil.append(f"{sti}.{navn}: mangler")
        for navn, del_ in verdi.items():
            if navn in egenskaper:
                feil += feil_i(del_, egenskaper[navn], f"{sti}.{navn}")
            elif skjema.get("additionalProperties") is False:
                feil.append(f"{sti}.{navn}: ukjent felt")
    if isinstance(verdi, list) and "items" in skjema:
        for i, del_ in enumerate(verdi):
            feil += feil_i(del_, skjema["items"], f"{sti}[{i}]")
    return feil


def valider(verdi, definisjon: str) -> list[str]:
    return feil_i(verdi, DEFS[definisjon])


KOMMANDOER = sorted(n.removeprefix("kommando.") for n in DEFS if n.startswith("kommando."))
