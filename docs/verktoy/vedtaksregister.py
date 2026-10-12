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
import datetime
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
NY = {"id", "dato", "hvem", "kilde", "sporsmal", "alternativ", "valgt", "svar", "forhold", "folge", "sitat"}
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
    forkastet = [f"«{linje(a['tekst'])}»" for a in post["alternativ"] if a.get("forkastet")]
    if forkastet:
        tekst += " Forkastet: " + "; ".join(forkastet)
    return tekst


def vedtattcelle(post: dict) -> str:
    if not er_ny(post):
        return post["vedtatt"]
    return f"{_dato(post['dato'])}, {post['hvem']} ({', '.join(post['kilde'])})"


def folgecelle(post: dict, register: dict) -> str:
    alle = {anker(p): p for p in poster(register) if anker(p)}
    deler = [f"{f['art'].capitalize()} {_lenke(alle[f['vedtak']])}." for f in post.get("forhold", [])]
    senere = sorted(
        (p["dato"], f["art"], p)
        for p in poster(register)
        if er_ny(p)
        for f in p.get("forhold", [])
        if f["vedtak"] == anker(post)
    )
    deler += [f"{FORHOLD[art]} {_dato(dato)} av {_lenke(p)}." for dato, art, p in senere]
    if post.get("folge"):
        deler.append(linje(post["folge"]))
    return " ".join(deler)


def rad(post: dict, register: dict) -> str:
    return f"| {vedtakscelle(post)} | {vedtattcelle(post)} | {folgecelle(post, register)} |"


def markdown(register: dict) -> str:
    """Innholdet i 3.1, fra linjen etter overskriften til «### 3.2»."""
    tekst = register["innledning"]
    for g in register["gruppe"]:
        tekst += f"#### {g['tittel']}\n\n{TABELLHODE}"
        tekst += "".join(rad(p, register) + "\n" for p in g["vedtak"])
        tekst += "\n" + g.get("etter", "")
    return tekst


def plan_med(register: dict, plan: str) -> str:
    start, slutt = avsnitt(plan)
    return plan[:start] + markdown(register) + plan[slutt:]


def valider(register: dict) -> list[str]:
    """Feilene i formen på registeret, tomme når det er gyldig."""
    feil = []
    if register.get("format") != 1:
        feil.append("format: skal være 1")
    ukjente = set(register) - {"format", "innledning", "gruppe"}
    feil += [f"{s}: ukjent nøkkel" for s in sorted(ukjente)]
    ankre = {}
    for g in register.get("gruppe", []):
        for p in g.get("vedtak", []):
            navn = p.get("id") or p.get("anker") or linje(p.get("vedtak", ""))[:40]
            felt = set(p)
            if er_ny(p):
                feil += [f"{navn}: mangler {f}" for f in sorted(NY_PAAKREVD - felt)]
                feil += [f"{navn}: ukjent felt {f}" for f in sorted(felt - NY)]
                if "id" in p and not ID.fullmatch(p["id"]):
                    feil.append(f"{navn}: ID-en har ikke formen AB-U1")
                if "dato" in p and not isinstance(p["dato"], datetime.date):
                    feil.append(f"{navn}: dato skal være en TOML-dato, som 2026-10-12")
                if not isinstance(p.get("kilde", []), list) or not p.get("kilde"):
                    feil.append(f"{navn}: kilde skal være en liste med issue eller PR, som [\"#413\"]")
                navnene = [a.get("navn") for a in p.get("alternativ", [])]
                if len(set(navnene)) != len(navnene):
                    feil.append(f"{navn}: to alternativer har samme navn")
                if "valgt" in p and p["valgt"] not in navnene:
                    feil.append(f"{navn}: valgt «{p['valgt']}» er ikke et alternativ")
                for a in p.get("alternativ", []):
                    feil += [f"{navn}: alternativ {a.get('navn')}: ukjent felt {f}" for f in sorted(set(a) - {"navn", "tekst", "forkastet"})]
                    if a.get("navn") == p.get("valgt") and a.get("forkastet"):
                        feil.append(f"{navn}: det valgte alternativet er forkastet")
                for f in p.get("forhold", []):
                    if f.get("art") not in FORHOLD:
                        feil.append(f"{navn}: ukjent forhold «{f.get('art')}»; bruk {', '.join(FORHOLD)}")
                for s in p.get("sitat", []):
                    k = s.get("kilde", "")
                    if k not in SITATKILDER and not (ROT / k).is_file():
                        feil.append(f"{navn}: sitatkilden «{k}» er verken {' eller '.join(SITATKILDER)} eller en fil i treet")
            else:
                feil += [f"{navn}: ukjent felt {f} i en importert post" for f in sorted(felt - IMPORTERT)]
                feil += [f"{navn}: mangler {f}" for f in sorted({"vedtak", "vedtatt", "folge"} - felt)]
            a = anker(p) if not er_ny(p) or "id" in p else None
            if a:
                if a in ankre:
                    feil.append(f"{navn}: ankeret «{a}» står to ganger")
                ankre[a] = p
    if feil:
        return feil
    for p in poster(register):
        navn = anker(p) or linje(p["vedtak"])[:40]
        for f in p.get("forhold", []):
            if f["vedtak"] not in ankre:
                feil.append(f"{navn}: forholdet viser til «{f['vedtak']}», som ikke er ankeret til et vedtak")
            elif f["vedtak"] == anker(p):
                feil.append(f"{navn}: forholdet viser til vedtaket selv")
    if feil:
        return feil
    for p in poster(register):
        navn = anker(p) or linje(p["vedtak"])[:40]
        for celle in (vedtakscelle(p), vedtattcelle(p), folgecelle(p, register)):
            if re.search(r"(?<!\\)\|", celle):
                feil.append(f"{navn}: en celle har | uten \\; tabellen brytes")
            if "  " in celle or celle != celle.strip():
                feil.append(f"{navn}: en celle har dobbelt mellomrom eller mellomrom i kanten")
    return feil


def kodenavn(post: dict) -> list[str]:
    """Kodenavnene i vedtaksteksten til en ny post: det valgte alternativet og de forkastede."""
    tekster = [_valgt(post)["tekst"]] + [a["tekst"] for a in post["alternativ"] if a.get("forkastet")]
    return [f"{art}: {m.group(0)}" for t in tekster for monster, art in KODENAVN for m in monster.finditer(linje(t))]


# --------------------------------------------------------------------------
# Kildene sitatene og grunnlaget leses fra
# --------------------------------------------------------------------------


def git_fil(commit: str, sti: str) -> str | None:
    """Fila slik den var i commiten, eller None når historikken mangler."""
    resultat = subprocess.run(
        ["git", "-C", str(ROT), "show", f"{commit}:{sti}"], capture_output=True, text=True, encoding="utf-8", check=False
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
    resultat = subprocess.run(["git", "-C", str(ROT), *kommando], capture_output=True, text=True, check=False)
    return resultat.stdout.strip() if resultat.returncode == 0 else None


def normaliser(tekst: str) -> str:
    return " ".join(tekst.split())


def sitatfeil(register: dict, plan: str, ns_8407: str | None) -> list[str]:
    """Sitater i de nye postene som ikke står ordrett i posten eller i kilden. NS 8407 hoppes over når teksten er None."""
    feil = []
    for p in poster(register):
        if not er_ny(p):
            continue
        i_posten = normaliser(" ".join([p["sporsmal"], p["svar"]] + [a["tekst"] for a in p["alternativ"]]))
        uten_raden = plan.replace(rad(p, register), "")
        for s in p.get("sitat", []):
            sitat = normaliser(s["tekst"])
            if sitat not in i_posten:
                feil.append(f"{p['id']}: sitatet «{sitat[:60]}» står ikke i spørsmålet, svaret eller et alternativ")
            if s["kilde"] == "ns8407":
                if ns_8407 is None:
                    continue
                kilde = ns_8407
            elif s["kilde"] == "hovedplanen":
                kilde = uten_raden
            else:
                kilde = (ROT / s["kilde"]).read_text(encoding="utf-8")
            if sitat not in normaliser(kilde):
                feil.append(f"{p['id']}: sitatet «{sitat[:60]}» står ikke ordrett i {s['kilde']}")
    return feil


def ankre_i(plan: str) -> list[str]:
    return re.findall(r'<a id="([^"]+)"></a>', plan)


def endrede_rader(gammel_plan: str, plan: str) -> list[str]:
    """Rader i 3.1 i den gamle planen der ankeret, vedtaket eller datoen ikke står uendret i den nye."""
    gamle = poster(les_avsnitt(gammel_plan[slice(*avsnitt(gammel_plan))]))
    nye = {(p.get("anker"), p["vedtak"], p["vedtatt"]) for p in poster(les_avsnitt(plan[slice(*avsnitt(plan))]))}
    return [
        f"{p.get('anker') or p['vedtak'][:60]}: vedtaket, ankeret eller vedtaksdatoen er endret eller fjernet"
        for p in gamle
        if (p.get("anker"), p["vedtak"], p["vedtatt"]) not in nye
    ]


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
    ut = [TOPP, f"format = {register['format']}", "", f"innledning = {_ordrett(register['innledning'])}"]
    for g in register["gruppe"]:
        ut += ["", "[[gruppe]]", f"tittel = {_streng(g['tittel'])}"]
        if "etter" in g:
            ut.append(f"etter = {_ordrett(g['etter'])}")
        for p in g["vedtak"]:
            ut += ["", "[[gruppe.vedtak]]"]
            if "anker" in p:
                ut.append(f"anker = {_streng(p['anker'])}")
            ut += [f"vedtak = {_brutt(p['vedtak'])}", f"vedtatt = {_streng(p['vedtatt'])}", f"folge = {_brutt(p['folge'])}"]
    return "\n".join(ut) + "\n"


# --------------------------------------------------------------------------


def main() -> int:
    tolk = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    tolk.add_argument("--sjekk", action="store_true", help="kontroller bare, skriv ingenting")
    tolk.add_argument("--importer", action="store_true", help="les 3.1 inn i registeret")
    valg = tolk.parse_args()
    plan = HOVEDPLAN.read_text(encoding="utf-8")

    if valg.importer:
        if REGISTER.exists() and any(er_ny(p) for p in poster(les())):
            print("Registeret har nye poster. Importen ville slettet spørsmålene og svarene deres.")
            return 1
        register = les_avsnitt(plan[slice(*avsnitt(plan))])
        REGISTER.parent.mkdir(exist_ok=True)
        REGISTER.write_text(toml(register), encoding="utf-8")
        if plan_med(les(), plan) != plan:
            print("Importen gjenskaper ikke 3.1 byte for byte.")
            return 1
        print(f"skrev {REGISTER.relative_to(ROT)}: {len(poster(register))} vedtak i {len(register['gruppe'])} grupper")
        return 0

    register = les()
    feil = valider(register)
    feil += [f"{p['id']}: kodenavn i vedtaksteksten, {k}" for p in poster(register) if er_ny(p) for k in kodenavn(p)]
    if feil:
        print("Registeret er ikke gyldig:", *feil, sep="\n  ")
        return 1
    ny = plan_med(register, plan)
    if ny == plan:
        print(f"3.1 er lik registeret: {len(poster(register))} vedtak")
        return 0
    if valg.sjekk:
        print("3.1 er ikke lik registeret. Kjør python3 docs/verktoy/vedtaksregister.py.")
        return 1
    HOVEDPLAN.write_text(ny, encoding="utf-8")
    print(f"skrev 3.1 i {HOVEDPLAN.relative_to(ROT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
