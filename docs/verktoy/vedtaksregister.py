"""Vedtaksregisteret, docs/vedtaksregister/vedtak.toml, og avsnitt 3.1 i hovedplanen (#413).

Registeret er kilden avsnitt 3.1 lages av. Hovedplanen er fortsatt autoritativ for
vedtakene; fordelingen står i docs/vedtaksregister/README.md.

    python3 docs/verktoy/vedtaksregister.py            # kontroller registeret og skriv 3.1
    python3 docs/verktoy/vedtaksregister.py --sjekk    # bare kontroller, skriv ingenting
    python3 docs/verktoy/vedtaksregister.py --importer # les 3.1 inn i registeret (#413)

Importen ble brukt én gang, da radene i 3.1 ble ført inn ordrett. Den nekter å
overskrive et register med en ny post, fordi spørsmålene og svarene i de nye
postene ikke står i 3.1.

Det er to former for poster. En importert post har cellene fra 3.1 ordrett:
`vedtak`, `vedtatt` og `folge`, og eventuelt `anker`. En ny post har `id`, `dato`,
`hvem`, `kilde`, `sporsmal`, alternativene, `valgt`, `svar` og eventuelt `forhold`,
`folge` og `sitat`; raden lages av dem. Kontrollene av kodenavn og sitater gjelder
de nye postene.
"""

import argparse
import collections
import datetime
import functools
import json
import os
import pathlib
import re
import subprocess
import sys

import tomllib

ROT = pathlib.Path(__file__).resolve().parents[2]
REGISTER = ROT / "docs" / "vedtaksregister" / "vedtak.toml"
HOVEDPLAN = ROT / "docs" / "plans" / "2026-09-16-godkjenning-og-varig-levering.md"
HOVEDPLAN_I_GIT = "docs/plans/2026-09-16-godkjenning-og-varig-levering.md"

OVERSKRIFT = "### 3.1 Vedtatte premisser og beslutninger\n"
NESTE = "### 3.2 "
TABELLHODE = "| Beslutning | Vedtatt | Følge |\n| --- | --- | --- |\n"
BREDDE = 88

# NS 8407-teksten ble tatt ut av treet i 507e2254 og skal ikke tilbake (#413).
# Sitatkontrollen leser den fra forelderen, 507e2254^.
NS_8407_COMMIT = "863f1470a9fb5ce49059b46e4e408d6b409ed3be"
NS_8407_STI = "docs/NS_8407.md"

FORHOLD = {
    "presiserer": "Presisert",
    "utvider": "Utvidet",
    "snevrer inn": "Snevret inn",
    "endrer": "Endret",
    "opphever": "Opphevet",
}
IMPORTERT = {"anker", "vedtak", "vedtatt", "folge"}
NY = {
    "id",
    "dato",
    "hvem",
    "kilde",
    "sporsmal",
    "alternativ",
    "valgt",
    "svar",
    "forhold",
    "folge",
    "sitat",
}
NY_PAAKREVD = {"id", "dato", "hvem", "kilde", "sporsmal", "alternativ", "valgt", "svar"}
SITATKILDER = ("ns8407", "hovedplanen")
ID = re.compile(r"[A-ZÆØÅ]+(-[A-Z0-9]+)+")
ANKER = re.compile(r'^<a id="([^"]+)"></a>')
KODENAVN = (
    (re.compile(r"`"), "backtick"),
    (re.compile(r"\b[a-zæøå][a-zæøå0-9]*_[a-zæøå0-9_]+\b"), "snake_case"),
    (re.compile(r"\b[a-zæøå]+[A-ZÆØÅ][A-Za-zÆØÅæøå0-9]*\b"), "camelCase"),
    (re.compile(r"\b[A-ZÆØÅ][A-ZÆØÅ0-9]*_[A-ZÆØÅ0-9_]+\b"), "STORE_BOKSTAVER"),
    (re.compile(r"\b\w+\(\)"), "funksjonskall"),
    (re.compile(r"\w\.(py|ts|toml|json|sql|svelte)\b"), "filnavn"),
)


# --------------------------------------------------------------------------
# Lesing av 3.1
# --------------------------------------------------------------------------


def avsnitt(plan: str) -> tuple[int, int]:
    """Start og slutt for innholdet i 3.1, uten overskriften."""
    start = plan.index(OVERSKRIFT) + len(OVERSKRIFT)
    return start, plan.index(NESTE, start)


def les_rad(linje: str) -> dict:
    if not (linje.startswith("| ") and linje.endswith(" |")):
        raise ValueError(f"ikke en tabellrad: {linje[:80]}")
    celler = linje[2:-2].split(" | ")
    if len(celler) != 3:
        raise ValueError(f"raden har {len(celler)} celler: {linje[:80]}")
    vedtak, vedtatt, folge = celler
    post = {}
    treff = ANKER.match(vedtak)
    if treff:
        post["anker"] = treff.group(1)
        vedtak = vedtak[treff.end() :]
    return post | {"vedtak": vedtak, "vedtatt": vedtatt, "folge": folge}


def les_avsnitt(tekst: str) -> dict:
    """Innholdet i 3.1 som register med importerte poster. Kaster ValueError ved ukjent form."""
    deler = re.split(r"^#### ", tekst, flags=re.MULTILINE)
    register = {"format": 1, "innledning": deler[0], "gruppe": []}
    for del_ in deler[1:]:
        tittel, _, kropp = del_.partition("\n")
        if not kropp.startswith("\n" + TABELLHODE):
            raise ValueError(f"gruppen «{tittel}» begynner ikke med tabellen")
        linjer = kropp[1 + len(TABELLHODE) :].split("\n")
        rader = []
        while linjer and linjer[0].startswith("|"):
            rader.append(les_rad(linjer.pop(0)))
        rest = "\n".join(linjer)
        if not rest.startswith("\n"):
            raise ValueError(f"gruppen «{tittel}» har ikke en tom linje etter tabellen")
        gruppe = {"tittel": tittel}
        if rest[1:]:
            gruppe["etter"] = rest[1:]
        gruppe["vedtak"] = rader
        register["gruppe"].append(gruppe)
    return register


# --------------------------------------------------------------------------
# Registeret
# --------------------------------------------------------------------------


def les(sti: pathlib.Path = REGISTER) -> dict:
    with sti.open("rb") as f:
        return tomllib.load(f)


def poster(register: dict) -> list[dict]:
    return [p for g in register["gruppe"] for p in g["vedtak"]]


def er_ny(post: dict) -> bool:
    return "vedtatt" not in post


def linje(tekst: str) -> str:
    """Teksten i registeret er brutt over flere linjer; i tabellen er den én."""
    return tekst.replace("\n", " ")


def anker(post: dict) -> str | None:
    return post["id"].lower() if er_ny(post) else post.get("anker")


def etikett(post: dict) -> str:
    """Det en lenke til vedtaket viser: teksten foran det første kolonet, som «KA-U1» eller «B-03, dokumentet»."""
    return post["id"] if er_ny(post) else linje(post["vedtak"]).split(": ", 1)[0]


def _dato(dato: datetime.date) -> str:
    return dato.strftime("%d.%m")


def _lenke(post: dict) -> str:
    return f"[{etikett(post)}](#{anker(post)})"


def _valgt(post: dict) -> dict:
    return next(a for a in post["alternativ"] if a["navn"] == post["valgt"])


def vedtakscelle(post: dict) -> str:
    if not er_ny(post):
        tekst = linje(post["vedtak"])
        return f'<a id="{post["anker"]}"></a>{tekst}' if "anker" in post else tekst
    tekst = f'<a id="{anker(post)}"></a>{post["id"]}: {linje(_valgt(post)["tekst"])}'
    forkastet = [
        f"«{linje(a['tekst'])}»" for a in post["alternativ"] if a.get("forkastet")
    ]
    if forkastet:
        tekst += " Forkastet: " + "; ".join(forkastet)
    return tekst


def vedtattcelle(post: dict) -> str:
    if not er_ny(post):
        return post["vedtatt"]
    return f"{_dato(post['dato'])}, {post['hvem']} ({', '.join(post['kilde'])})"


def indeks(register: dict) -> tuple[dict, dict]:
    """Vedtakene etter anker, og forholdene fra nye poster etter ankeret de viser til."""
    alle = {anker(p): p for p in poster(register) if anker(p)}
    senere = {}
    for p in poster(register):
        for f in p.get("forhold", []) if er_ny(p) else []:
            senere.setdefault(f["vedtak"], []).append((p["dato"], f["art"], p["id"], p))
    return alle, senere


def folgecelle(post: dict, register: dict, ix: tuple[dict, dict] | None = None) -> str:
    alle, senere = ix or indeks(register)
    deler = [
        f"{f['art'].capitalize()} {_lenke(alle[f['vedtak']])}."
        for f in post.get("forhold", [])
    ]
    deler += [
        f"{FORHOLD[art]} {_dato(dato)} av {_lenke(p)}."
        for dato, art, _, p in sorted(senere.get(anker(post), []), key=lambda t: t[:3])
    ]
    if post.get("folge"):
        deler.append(linje(post["folge"]))
    return " ".join(deler)


def rad(post: dict, register: dict, ix: tuple[dict, dict] | None = None) -> str:
    return f"| {vedtakscelle(post)} | {vedtattcelle(post)} | {folgecelle(post, register, ix)} |"


def markdown(register: dict) -> str:
    """Innholdet i 3.1, fra linjen etter overskriften til «### 3.2»."""
    ix = indeks(register)
    tekst = register["innledning"]
    for g in register["gruppe"]:
        tekst += f"#### {g['tittel']}\n\n{TABELLHODE}"
        tekst += "".join(rad(p, register, ix) + "\n" for p in g["vedtak"])
        tekst += "\n" + g.get("etter", "")
    return tekst


def plan_med(register: dict, plan: str) -> str:
    start, slutt = avsnitt(plan)
    return plan[:start] + markdown(register) + plan[slutt:]


TEKST = (str, "tekst")
TYPER_NY = {
    "id": TEKST,
    "hvem": TEKST,
    "sporsmal": TEKST,
    "valgt": TEKST,
    "svar": TEKST,
    "folge": TEKST,
    "kilde": (list, 'en liste med issue eller PR, som ["#413"]'),
    "alternativ": (list, "en liste med tabeller"),
    "forhold": (list, "en liste med tabeller"),
    "sitat": (list, "en liste med tabeller"),
}
DELER = {
    "alternativ": (
        {"navn": TEKST, "tekst": TEKST},
        {"forkastet": (bool, "true eller false")},
    ),
    "forhold": ({"art": TEKST, "vedtak": TEKST}, {}),
    "sitat": ({"kilde": TEKST, "tekst": TEKST}, {"utdrag": (bool, "true eller false")}),
}


def _typefeil(navn: str, o: dict, typer: dict) -> list[str]:
    return [
        f"{navn}: {f} skal være {forklaring}"
        for f, (type_, forklaring) in typer.items()
        if f in o and not isinstance(o[f], type_)
    ]


def _formfeil(p, navn: str) -> list[str]:
    """Felt og typer i én post. Semantikken prøves først når formen holder."""
    if not isinstance(p, dict):
        return [f"{navn}: posten er ikke en tabell"]
    felt = set(p)
    if not er_ny(p):
        feil = [
            f"{navn}: ukjent felt {f} i en importert post"
            for f in sorted(felt - IMPORTERT)
        ]
        feil += [
            f"{navn}: mangler {f}"
            for f in sorted({"vedtak", "vedtatt", "folge"} - felt)
        ]
        return feil + _typefeil(navn, p, dict.fromkeys(IMPORTERT, TEKST))
    feil = [f"{navn}: mangler {f}" for f in sorted(NY_PAAKREVD - felt)]
    feil += [f"{navn}: ukjent felt {f}" for f in sorted(felt - NY)]
    feil += _typefeil(navn, p, TYPER_NY)
    if "dato" in p and (
        not isinstance(p["dato"], datetime.date)
        or isinstance(p["dato"], datetime.datetime)
    ):
        feil.append(
            f"{navn}: dato skal være en TOML-dato uten klokkeslett, som 2026-10-12"
        )
    if isinstance(p.get("kilde"), list) and (
        not p["kilde"] or not all(isinstance(k, str) for k in p["kilde"])
    ):
        feil.append(
            f'{navn}: kilde skal være en liste med issue eller PR, som ["#413"]'
        )
    for liste, (paakrevd, valgfrie) in DELER.items():
        for i, o in enumerate(
            p.get(liste, []) if isinstance(p.get(liste), list) else [], 1
        ):
            if not isinstance(o, dict):
                feil.append(f"{navn}: {liste} {i} er ikke en tabell")
                continue
            feil += [
                f"{navn}: {liste} {i} mangler {f}"
                for f in sorted(set(paakrevd) - set(o))
            ]
            feil += [
                f"{navn}: {liste} {i}: ukjent felt {f}"
                for f in sorted(set(o) - set(paakrevd) - set(valgfrie))
            ]
            feil += _typefeil(f"{navn}: {liste} {i}", o, paakrevd | valgfrie)
    return feil


def valider(register: dict) -> list[str]:
    """Feilene i formen på registeret, tomme når det er gyldig."""
    feil = []
    if register.get("format") != 1:
        feil.append("format: skal være 1")
    ukjente = set(register) - {"format", "innledning", "gruppe"}
    feil += [f"{s}: ukjent nøkkel" for s in sorted(ukjente)]
    if not isinstance(register.get("innledning"), str):
        feil.append("innledning: skal være tekst")
    grupper = register.get("gruppe")
    if not isinstance(grupper, list) or not all(isinstance(g, dict) for g in grupper):
        return feil + ["gruppe: skal være en liste med tabeller"]
    for g in grupper:
        tittel = g.get("tittel")
        feil += [
            f"gruppe {tittel}: ukjent felt {f}"
            for f in sorted(set(g) - {"tittel", "etter", "vedtak"})
        ]
        feil += _typefeil(
            f"gruppe {tittel}",
            g,
            {"tittel": TEKST, "etter": TEKST, "vedtak": (list, "en liste")},
        )
        if "tittel" not in g:
            feil.append("en gruppe mangler tittel")
        for i, p in enumerate(
            g.get("vedtak", []) if isinstance(g.get("vedtak"), list) else [], 1
        ):
            feil += _formfeil(p, f"gruppe {tittel}, vedtak {i}")
    if feil:
        return feil

    ankre = {}
    for p in poster(register):
        navn = p.get("id") or p.get("anker") or linje(p["vedtak"])[:40]
        if er_ny(p):
            if not ID.fullmatch(p["id"]):
                feil.append(f"{navn}: ID-en har ikke formen AB-U1")
            navnene = [a["navn"] for a in p["alternativ"]]
            if len(set(navnene)) != len(navnene):
                feil.append(f"{navn}: to alternativer har samme navn")
            if p["valgt"] not in navnene:
                feil.append(f"{navn}: valgt «{p['valgt']}» er ikke et alternativ")
            if not re.search(rf"(?<!\w){re.escape(p['valgt'])}(?!\w)", p["svar"]):
                feil.append(
                    f"{navn}: svaret nevner ikke det valgte alternativet «{p['valgt']}»"
                )
            andre = [
                a["navn"]
                for a in p["alternativ"]
                if a["navn"] != p["valgt"]
                and re.search(rf"(?<!\w){re.escape(a['navn'])}(?!\w)", p["svar"])
            ]
            if andre:
                feil.append(
                    f"{navn}: svaret nevner også alternativ {', '.join(andre)}; "
                    "før svaret som et eget alternativ"
                )
            if any(
                a["navn"] == p["valgt"] and a.get("forkastet") for a in p["alternativ"]
            ):
                feil.append(f"{navn}: det valgte alternativet er forkastet")
            for f in p.get("forhold", []):
                if f["art"] not in FORHOLD:
                    feil.append(
                        f"{navn}: ukjent forhold «{f['art']}»; bruk {', '.join(FORHOLD)}"
                    )
            for s in p.get("sitat", []):
                k = s["kilde"]
                if k not in SITATKILDER and not _fil_i_treet(k):
                    feil.append(
                        f"{navn}: sitatkilden «{k}» er verken {' eller '.join(SITATKILDER)} eller en fil i treet"
                    )
        a = anker(p)
        if a:
            if a in ankre:
                feil.append(f"{navn}: ankeret «{a}» står to ganger")
            ankre[a] = p
    if feil:
        return feil
    for p in poster(register):
        navn = anker(p) or linje(p["vedtak"])[:40]
        for f in p.get("forhold", []) if er_ny(p) else []:
            if f["vedtak"] not in ankre:
                feil.append(
                    f"{navn}: forholdet viser til «{f['vedtak']}», som ikke er ankeret til et vedtak"
                )
            elif f["vedtak"] == anker(p):
                feil.append(f"{navn}: forholdet viser til vedtaket selv")
    if feil:
        return feil
    ix = indeks(register)
    for p in poster(register):
        navn = anker(p) or linje(p["vedtak"])[:40]
        for celle in (vedtakscelle(p), vedtattcelle(p), folgecelle(p, register, ix)):
            if re.search(r"(?<!\\)\|", celle):
                feil.append(f"{navn}: en celle har | uten \\; tabellen brytes")
            if "  " in celle or celle != celle.strip():
                feil.append(
                    f"{navn}: en celle har dobbelt mellomrom eller mellomrom i kanten"
                )
    return feil


def _fil_i_treet(sti: str) -> bool:
    """En relativ sti til en fil i repoet, ikke utenfor."""
    fil = (ROT / sti).resolve()
    return (
        not pathlib.PurePath(sti).is_absolute()
        and fil.is_relative_to(ROT)
        and fil.is_file()
    )


def kodenavn(post: dict) -> list[str]:
    """Kodenavnene i vedtaksteksten til en ny post: det valgte alternativet og de forkastede."""
    tekster = [_valgt(post)["tekst"]] + [
        a["tekst"] for a in post["alternativ"] if a.get("forkastet")
    ]
    return [
        f"{art}: {m.group(0)}"
        for t in tekster
        for monster, art in KODENAVN
        for m in monster.finditer(linje(t))
    ]


# --------------------------------------------------------------------------
# Kildene sitatene og grunnlaget leses fra
# --------------------------------------------------------------------------


def git_fil(commit: str, sti: str) -> str | None:
    """Fila slik den var i commiten, eller None når historikken mangler."""
    resultat = subprocess.run(
        ["git", "-C", str(ROT), "show", f"{commit}:{sti}"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    return resultat.stdout if resultat.returncode == 0 else None


def grunnlag() -> str | None:
    """Commiten radene sammenliknes med, eller None når historikken mangler.

    VEDTAK_GRUNNLAG velger den. I CI er sjekket ut en flettecommit, og grunnlaget er
    forelderen på main. Ellers er det der grenen gikk ut fra origin/main.
    """
    if valgt := os.environ.get("VEDTAK_GRUNNLAG"):
        kommando = ["rev-parse", "--verify", f"{valgt}^{{commit}}"]
    elif os.environ.get("GITHUB_BASE_REF"):
        kommando = ["rev-parse", "--verify", "HEAD^1^{commit}"]
    else:
        kommando = ["merge-base", "HEAD", "origin/main"]
    resultat = subprocess.run(
        ["git", "-C", str(ROT), *kommando], capture_output=True, text=True, check=False
    )
    return resultat.stdout.strip() if resultat.returncode == 0 else None


def normaliser(tekst: str) -> str:
    return " ".join(tekst.split())


def uten_rad(plan: str, anker_: str) -> str:
    """Planen uten raden med ankeret, så et vedtak ikke er kilde for sitatene i seg selv."""
    return "\n".join(
        rad
        for rad in plan.split("\n")
        if not rad.startswith(f'| <a id="{anker_}"></a>')
    )


def sitatfeil(register: dict, hent, merget: frozenset = frozenset()) -> list[str]:
    """Sitater i de nye postene som ikke står ordrett i posten eller i kilden.

    `hent(kilde)` gir teksten sitatet prøves mot: NS 8407 for «ns8407», ellers
    fila slik den er på main, og en tom tekst når fila ikke finnes der. Gir den
    None, mangler historikken, og bare sitatet i posten prøves. Postene i `merget`
    er prøvd da de ble ført; kilden kan endres senere, og sitatet kan ikke.
    """
    feil = []
    for p in poster(register):
        if not er_ny(p) or p["id"] in merget:
            continue
        i_posten = normaliser(
            " ".join([p["sporsmal"], p["svar"]] + [a["tekst"] for a in p["alternativ"]])
        )
        for s in p.get("sitat", []):
            sitat = normaliser(s["tekst"])
            if sitat not in i_posten:
                feil.append(
                    f"{p['id']}: sitatet «{sitat[:60]}» står ikke i spørsmålet, svaret eller et alternativ"
                )
            kilde = hent(s["kilde"])
            if kilde is None:
                continue
            if s["kilde"] == "hovedplanen":
                kilde = uten_rad(kilde, anker(p))
            tekst = setningstekst(kilde)
            if sitat not in tekst:
                feil.append(
                    f"{p['id']}: sitatet «{sitat[:60]}» står ikke ordrett i {s['kilde']} på main"
                )
            elif not s.get("utdrag") and not hele_setninger(sitat, tekst):
                feil.append(
                    f"{p['id']}: sitatet «{sitat[:60]}» er ikke hele setninger i {s['kilde']}; "
                    "ta med hele setningen, eller sett utdrag = true"
                )
    return feil


SETNINGSSTART = ".!?«|:;¶"
SETNINGSSLUTT = ".!?»|¶"


def setningstekst(kilde: str) -> str:
    """Kilden med mellomrom normalisert. Avsnitt, overskrifter og punkter blir ¶, så de teller
    som setningsgrenser; et sitatmerke (>) i starten av en linje fjernes."""
    tekst = re.sub(r"(?m)^\s*>\s*$", "", kilde)
    tekst = re.sub(r"(?m)^\s*>\s?", "", tekst)
    tekst = re.sub(r"(?m)^\s*#+\s+(.*)$", r" ¶ \1 ¶ ", tekst)
    tekst = re.sub(r"(?m)^\s*(?:[-*]|\d+\.)\s+", " ¶ ", tekst)
    return normaliser(re.sub(r"\n\s*\n", " ¶ ", tekst))


# Det som står mellom en grense og setningen uten å være tekst: fet skrift og et anker.
FORMATERING = re.compile(r'(?:\*\*|<a id="[^"]*"></a>|\s)+$')
FORMATERING_ETTER = re.compile(r"^(?:\*\*|\s)+")


def hele_setninger(sitat: str, tekst: str) -> bool:
    """Sitatet begynner ved setningsstart, «, kolon, semikolon eller en cellegrense, og slutter
    ved punktum, », eller en cellegrense, et sted i teksten. Fet skrift og et anker mellom
    grensen og sitatet hoppes over."""
    start = 0
    while (i := tekst.find(sitat, start)) >= 0:
        foer = FORMATERING.sub("", tekst[:i])
        etter = FORMATERING_ETTER.sub("", tekst[i + len(sitat) :])
        if (not foer or foer[-1] in SETNINGSSTART or sitat[0] == "«") and (
            not etter or sitat[-1] in SETNINGSSLUTT or etter[0] in SETNINGSSLUTT
        ):
            return True
        start = i + 1
    return False


def kilder_paa(commit: str | None):
    """Sitatkildene: NS 8407 fra 507e2254^, og hovedplanen og filene slik de er i commiten."""

    @functools.cache
    def hent(kilde: str) -> str | None:
        if kilde == "ns8407":
            return git_fil(NS_8407_COMMIT, NS_8407_STI)
        if commit is None:
            return None
        return (
            git_fil(commit, HOVEDPLAN_I_GIT if kilde == "hovedplanen" else kilde) or ""
        )

    return hent


def ankre_i(plan: str) -> list[str]:
    return re.findall(r'<a id="([^"]+)"></a>', plan)


def doble_ankre(plan: str) -> list[str]:
    ankre = collections.Counter(ankre_i(plan))
    return sorted(
        f"ankeret «{a}» står {n} ganger i hovedplanen"
        for a, n in ankre.items()
        if n > 1
    )


def _rader(plan: str) -> list[dict]:
    return poster(les_avsnitt(plan[slice(*avsnitt(plan))]))


def _noekkel(p: dict) -> tuple:
    return (p.get("anker"), linje(p["vedtak"]), p["vedtatt"])


def endrede_rader(gammel_plan: str, plan: str) -> list[str]:
    """Rader i 3.1 i den gamle planen der ankeret, vedtaket eller datoen ikke står uendret i den nye."""
    mangler = collections.Counter(
        map(_noekkel, _rader(gammel_plan))
    ) - collections.Counter(map(_noekkel, _rader(plan)))
    return [
        f"{a or v[:60]}: vedtaket, ankeret eller vedtaksdatoen er endret eller fjernet"
        for (a, v, _), n in mangler.items()
        for _ in range(n)
    ]


LENKE = re.compile(r"\[[^\]]+\]\(#[^)]+\)")


def _avsnittene(tekst: str) -> list[str]:
    return re.split(r"\n(?:[ \t]*>)?[ \t]*\n", tekst)


def _bare_lagt_til(gammel: str, ny: str) -> bool:
    """Hvert avsnitt i den gamle teksten står uendret i den nye, i samme rekkefølge, så ny
    tekst er hele nye avsnitt. Et avsnitt i en merknad skilles med en linje med bare >."""
    avsnitt_ = iter(_avsnittene(ny))
    return all(any(g == n for n in avsnitt_) for g in _avsnittene(gammel))


HENVISNINGER = re.compile(
    r"^(?:(?:Presisert|Utvidet|Snevret inn|Endret|Opphevet) \d{2}\.\d{2} av "
    r"\[[^\]]+\]\(#[^)]+\)\.(?: |$))*"
)


def folge_bare_lagt_til(gammel: str, ny: str) -> bool:
    """Følge i en importert rad: henvisningene verktøyet setter først, kan bli flere, og
    resten står ordrett, eventuelt med tekst lagt til etter."""
    gamle_h = HENVISNINGER.match(gammel).group(0)
    nye_h = HENVISNINGER.match(ny).group(0)
    if collections.Counter(LENKE.findall(gamle_h)) - collections.Counter(
        LENKE.findall(nye_h)
    ):
        return False
    rest_gammel, rest_ny = gammel[len(gamle_h) :], ny[len(nye_h) :]
    tillegg = rest_ny[len(rest_gammel) :]
    return rest_ny.startswith(rest_gammel) and (not tillegg or not tillegg[0].isalnum())


def endret_rundt_vedtakene(
    gammel_plan: str, plan: str, nye_ankre: frozenset = frozenset()
) -> list[str]:
    """Det som bærer vedtaksinnhold rundt radene i 3.1: innledningen, teksten etter tabellene
    og gruppetitlene kan bare få hele avsnitt lagt til, en rad blir i gruppen sin, lenkene i
    Følge blir stående, og Følge i en importert rad får bare tekst lagt til. Radene med
    ankrene i `nye_ankre` er nye poster; der lages Følge av `folge`, som kan endres."""
    gammel = les_avsnitt(gammel_plan[slice(*avsnitt(gammel_plan))])
    ny = les_avsnitt(plan[slice(*avsnitt(plan))])
    feil = []
    if not _bare_lagt_til(gammel["innledning"], ny["innledning"]):
        feil.append("innledningen til 3.1: tekst er endret eller fjernet")
    nye_grupper = {g["tittel"]: g for g in ny["gruppe"]}
    for g in gammel["gruppe"]:
        if g["tittel"] not in nye_grupper:
            feil.append(f"gruppen «{g['tittel']}» er fjernet eller har fått ny tittel")
        elif not _bare_lagt_til(
            g.get("etter", ""), nye_grupper[g["tittel"]].get("etter", "")
        ):
            feil.append(
                f"teksten etter gruppen «{g['tittel']}»: tekst er endret eller fjernet"
            )
    gruppe_naa = {
        _noekkel(p): (g["tittel"], p) for g in ny["gruppe"] for p in g["vedtak"]
    }
    for g in gammel["gruppe"]:
        for p in g["vedtak"]:
            if _noekkel(p) not in gruppe_naa:
                continue
            navn = p.get("anker") or p["vedtak"][:60]
            tittel, naa = gruppe_naa[_noekkel(p)]
            if tittel != g["tittel"]:
                feil.append(f"{navn}: raden er flyttet fra gruppen «{g['tittel']}»")
            borte = collections.Counter(
                LENKE.findall(p["folge"])
            ) - collections.Counter(LENKE.findall(naa["folge"]))
            feil += [f"{navn}: lenken {lenke} er fjernet fra Følge" for lenke in borte]
            if p.get("anker") not in nye_ankre and not folge_bare_lagt_til(
                p["folge"], naa["folge"]
            ):
                feil.append(
                    f"{navn}: Følge er endret; i en importert rad kan bare tekst legges til"
                )
    return feil


def mot_grunnlag(
    register: dict, gammel_plan: str, gammel_register: dict | None
) -> list[str]:
    """Det en ny post ikke kan gjøre mot main: føres i importert form, ta en ID som er i bruk,
    eller endre spørsmålet, alternativene eller svaret til en post som er merget."""
    feil = []
    importerte = collections.Counter(
        _noekkel(p) for p in poster(register) if not er_ny(p)
    )
    for (a, v, _), n in (
        importerte - collections.Counter(map(_noekkel, _rader(gammel_plan)))
    ).items():
        feil += [
            f"{a or v[:60]}: en importert post som ikke står i 3.1 på main; et nytt vedtak føres som ny post"
        ] * n
    gamle_nye = {
        p["id"]: p for p in poster(gammel_register or {"gruppe": []}) if er_ny(p)
    }
    for p in poster(register):
        if (
            er_ny(p)
            and p["id"] not in gamle_nye
            and re.search(rf"(?<![\w-]){re.escape(p['id'])}(?![\w-])", gammel_plan)
        ):
            feil.append(f"{p['id']}: ID-en står i hovedplanen på main fra før")
    naa = {p["id"]: p for p in poster(register) if er_ny(p)}
    for id_, gammel in gamle_nye.items():
        if id_ not in naa:
            feil.append(f"{id_}: posten er fjernet fra registeret")
        elif {k: v for k, v in gammel.items() if k != "folge"} != {
            k: v for k, v in naa[id_].items() if k != "folge"
        }:
            feil.append(
                f"{id_}: spørsmålet, alternativene, svaret eller et annet felt enn folge er endret etter merge"
            )
    return feil


def historiske_feil(register: dict, plan: str, commit: str | None) -> list[str]:
    """Kontrollene av planen og registeret, mot main når commiten finnes. Tom når alt holder.

    Uten commit prøves bare de doble ankrene og at sitatene står i posten.
    """
    gammel_plan = git_fil(commit, HOVEDPLAN_I_GIT) if commit else None
    if gammel_plan is None:
        return doble_ankre(plan) + sitatfeil(register, kilder_paa(None))
    gammel_tekst = git_fil(commit, REGISTER.relative_to(ROT).as_posix())
    gammel_register = tomllib.loads(gammel_tekst) if gammel_tekst else None
    merget = frozenset(
        p["id"] for p in poster(gammel_register or {"gruppe": []}) if er_ny(p)
    )
    return (
        doble_ankre(plan)
        + endrede_rader(gammel_plan, plan)
        + endret_rundt_vedtakene(
            gammel_plan, plan, frozenset(anker(p) for p in poster(register) if er_ny(p))
        )
        + mot_grunnlag(register, gammel_plan, gammel_register)
        + sitatfeil(register, kilder_paa(commit), merget)
    )


# --------------------------------------------------------------------------
# Skriving av registeret (importen)
# --------------------------------------------------------------------------


def _streng(verdi: str) -> str:
    return json.dumps(verdi, ensure_ascii=False)


def _ordrett(verdi: str) -> str:
    if "'''" in verdi:
        raise ValueError("teksten har ''' og kan ikke stå som TOML-literal")
    return "'''\n" + verdi + "'''"


def _brutt(verdi: str) -> str:
    """En celle brutt ved mellomrom; linje() setter den sammen igjen byte for byte."""
    if "\n" in verdi:
        raise ValueError("en celle har linjeskift")
    linjer, naa = [], ""
    for ord_ in verdi.split(" "):
        if naa and len(naa) + 1 + len(ord_) > BREDDE:
            linjer.append(naa)
            naa = ord_
        else:
            naa = f"{naa} {ord_}" if naa else ord_
    linjer.append(naa)
    return _ordrett("\n".join(linjer))


TOPP = """\
# Vedtaksregisteret (#413). Kilden avsnitt 3.1 i hovedplanen lages av.
#
# Rett her, ikke i 3.1, og kjør python3 docs/verktoy/vedtaksregister.py.
# Hovedplanen er autoritativ for vedtakene; se README.md i denne mappa.
# Testene i backend/tests/test_vedtaksregister/ feiler når 3.1 ikke er lik det
# verktøyet lager, når et vedtak, et anker eller en vedtaksdato er endret,
# og når en ny post bryter reglene i README.md.
#
# Postene med «vedtatt» er importert ordrett fra 3.1 12.10. En tekst brutt over
# flere linjer er én linje i tabellen.
"""


def toml(register: dict) -> str:
    """Registeret som TOML. Brukes av importen; nye poster skrives for hånd."""
    if any(er_ny(p) for p in poster(register)):
        raise ValueError("toml() skriver bare importerte poster")
    ut = [
        TOPP,
        f"format = {register['format']}",
        "",
        f"innledning = {_ordrett(register['innledning'])}",
    ]
    for g in register["gruppe"]:
        ut += ["", "[[gruppe]]", f"tittel = {_streng(g['tittel'])}"]
        if "etter" in g:
            ut.append(f"etter = {_ordrett(g['etter'])}")
        for p in g["vedtak"]:
            ut += ["", "[[gruppe.vedtak]]"]
            if "anker" in p:
                ut.append(f"anker = {_streng(p['anker'])}")
            ut += [
                f"vedtak = {_brutt(p['vedtak'])}",
                f"vedtatt = {_streng(p['vedtatt'])}",
                f"folge = {_brutt(p['folge'])}",
            ]
    return "\n".join(ut) + "\n"


# --------------------------------------------------------------------------


def main() -> int:
    tolk = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    tolk.add_argument(
        "--sjekk", action="store_true", help="kontroller bare, skriv ingenting"
    )
    tolk.add_argument(
        "--importer", action="store_true", help="les 3.1 inn i registeret"
    )
    valg = tolk.parse_args()
    plan = HOVEDPLAN.read_text(encoding="utf-8")

    if valg.importer:
        if REGISTER.exists() and any(er_ny(p) for p in poster(les())):
            print(
                "Registeret har nye poster. Importen ville slettet spørsmålene og svarene deres."
            )
            return 1
        register = les_avsnitt(plan[slice(*avsnitt(plan))])
        REGISTER.parent.mkdir(exist_ok=True)
        REGISTER.write_text(toml(register), encoding="utf-8")
        if plan_med(les(), plan) != plan:
            print("Importen gjenskaper ikke 3.1 byte for byte.")
            return 1
        print(
            f"skrev {REGISTER.relative_to(ROT)}: {len(poster(register))} vedtak i {len(register['gruppe'])} grupper"
        )
        return 0

    register = les()
    feil = valider(register)
    if not feil:
        feil += [
            f"{p['id']}: kodenavn i vedtaksteksten, {k}"
            for p in poster(register)
            if er_ny(p)
            for k in kodenavn(p)
        ]
    if feil:
        print("Registeret er ikke gyldig:", *feil, sep="\n  ")
        return 1
    ny = plan_med(register, plan)
    commit = grunnlag()
    if commit is None or git_fil(commit, HOVEDPLAN_I_GIT) is None:
        commit = None
        print(
            "Kontrollene mot main er hoppet over: historikken mangler. Kjør git fetch --unshallow origin main."
        )
    elif git_fil(NS_8407_COMMIT, NS_8407_STI) is None:
        print(
            "Sitatene fra NS 8407 er hoppet over: 507e2254^ mangler. Kjør git fetch --unshallow origin main."
        )
    feil = historiske_feil(register, ny, commit)
    if feil:
        print("Registeret eller planen holder ikke:", *feil, sep="\n  ")
        return 1
    if ny == plan:
        print(f"3.1 er lik registeret: {len(poster(register))} vedtak")
        return 0
    if valg.sjekk:
        print(
            "3.1 er ikke lik registeret. Kjør python3 docs/verktoy/vedtaksregister.py."
        )
        return 1
    HOVEDPLAN.write_text(ny, encoding="utf-8")
    print(f"skrev 3.1 i {HOVEDPLAN.relative_to(ROT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
