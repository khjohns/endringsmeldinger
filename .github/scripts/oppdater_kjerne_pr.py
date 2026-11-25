"""Oppdaterer grenen til en kjerne-PR mot `main` i én push (#2293, 1A+ i #2286).

To kjerne-PR-er som øker `REGELVERSJON` eller `PROJEKSJONSVERSJON` fra samme tall,
kolliderer i `kjerne/regler/regelsett.ts` og `kjerne/versjon.ts`, og den som merges
sist, blir rød i regelversjonsvakten. Skriptet gjør det orkestratoren ellers gjorde
for hånd:

1. fletter basen inn i grenen, i en egen worktree, så arbeidskopien ikke røres;
2. løser en konflikt bare når den gjelder linja med versjonskonstanten i de to
   versjonsfilene, eller en generert fil. Versjonslinja tar basens tall, og den
   genererte fila tar basens innhold og skrives på nytt i steg 4. En konflikt i
   feilinnføringslista (#2342) løses med basens liste og så grenens nye poster, og en
   ny post med en ID basen alt har, nummereres om. Endrer eller fjerner grenen en post
   som fantes i forfaren, stopper skriptet. Annen konflikt avbryter flettingen, og
   ingenting pushes;
3. øker hver versjon vakten krever for grenens egne endringer (`flytting.py`) til
   ett over basens tall, når den ikke alt er høyere;
4. skriver de genererte filene på nytt (`GENERATORER`);
5. kjører regelversjonsvakten mot basen med skriptene i den flettede worktreen, som
   CI gjør, og `--ankre` for feilinnføringene når steg 2 flettet lista, og stopper
   uten push når en av dem feiler;
6. pusher flettingen og økningen samlet, med `--push`, og fjerner worktreen. Uten
   `--push`, og når steg 3–5 stopper, blir worktreen stående, så resultatet kan ses.
   Skriptet skriver kommandoen som fjerner den.

Bruk, fra en klon av `main`, der `node_modules` er installert. Worktreen får en lenke
til den, for vakten og generatorene:

    python3 .github/scripts/oppdater_kjerne_pr.py <gren> [--base main] [--push]

`--lokal` bruker de lokale refene for grenen og basen uten `git fetch`, til prøver.
Utgangskoden er 0 når grenen er oppdatert eller alt var oppdatert, 1 når flettingen
eller vakten stopper, og 2 ved feil bruk.
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import NamedTuple

SKRIPTER = Path(__file__).resolve().parent

VERSJONSFILER = {
    "REGELVERSJON": "kjerne/regler/regelsett.ts",
    "PROJEKSJONSVERSJON": "kjerne/versjon.ts",
}

# Kommandoen og filene den skriver. En konflikt i en av filene løses med basens
# innhold, og kommandoen skriver fila på nytt etter økningen.
GENERATORER = [
    (
        ["node", "kjerne/tester/brukerforloep.ts", "--skriv"],
        [
            "docs/domenetabell/brukerforlop/dekning.md",
            "docs/domenetabell/brukerforlop/startjournaler.json",
        ],
    ),
]
GENERERTE = {fil for _, filer in GENERATORER for fil in filer}

# Lista over feilinnføringer, der to kjerne-PR-er legger nye poster til på slutten (#2342).
FEILINNFOERINGER = "kjerne/tester/feilinnfoering.ts"
LISTESTART = "const MUTASJONER: Mutasjon[] = [\n"
POST_ID = re.compile(r"^    id: '([^']*)',$", re.MULTILINE)
PLASSHOLDER = "  // oppdater_kjerne_pr.py: feilinnføringene flettes inn her\n"
ANKRE = ["node", FEILINNFOERINGER, "--ankre"]

KONFLIKT = re.compile(r"^<<<<<<< [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n", re.MULTILINE | re.DOTALL)


class Stopp(Exception):
    """Oppdateringen kan ikke fullføres uten en avgjørelse i økta som eier PR-en."""


def git(mappe: Path, *args: str, sjekk: bool = True) -> subprocess.CompletedProcess:
    svar = subprocess.run(["git", *args], cwd=mappe, capture_output=True, text=True, check=False)
    if sjekk and svar.returncode != 0:
        raise Stopp(f"git {' '.join(args)} feilet:\n{svar.stderr.strip()}")
    return svar


def versjonslinje(navn: str) -> re.Pattern:
    return re.compile(rf"^export const {navn} = (\d+);$", re.MULTILINE)


def les_versjon(innhold: str | None, navn: str) -> int | None:
    treff = versjonslinje(navn).search(innhold or "")
    return int(treff.group(1)) if treff else None


def los_versjonskonflikt(innhold: str, navn: str) -> str | None:
    """Teksten med basens versjonslinje i hver konflikt, eller None når en konflikt
    gjelder noe annet enn linja med `navn`."""
    linje = versjonslinje(navn)

    def bare_linja(del_: str) -> bool:
        return linje.fullmatch(del_.rstrip("\n")) is not None

    hunker = list(KONFLIKT.finditer(innhold))
    # Uten konfliktmarkører er konflikten en annen enn i innholdet, som en sletting.
    if not hunker or not all(bare_linja(m.group(1)) and bare_linja(m.group(2)) for m in hunker):
        return None
    lost = KONFLIKT.sub(lambda m: m.group(2), innhold)
    return None if re.search(r"^(<<<<<<<|=======|>>>>>>>)", lost, re.MULTILINE) else lost


class Liste(NamedTuple):
    """Feilinnføringsfila delt i teksten før lista, postene og teksten etter."""

    for_: str
    poster: list[tuple[str, str]]
    etter: str


def del_liste(innhold: str) -> Liste:
    """Postene i `MUTASJONER` som (ID, tekst). En post er linjene til og med `  },`,
    med kommentarene foran den."""
    start = innhold.find(LISTESTART)
    slutt = innhold.find("\n];\n", start)
    if start < 0 or slutt < 0:
        raise Stopp(f"Fant ikke `{LISTESTART.strip()}` … `];` i {FEILINNFOERINGER}.")
    start += len(LISTESTART)
    poster, linjer = [], []
    for linje in innhold[start : slutt + 1].splitlines(keepends=True):
        linjer.append(linje)
        if linje == "  },\n":
            tekst = "".join(linjer)
            ider = POST_ID.findall(tekst)
            if len(ider) != 1:
                raise Stopp(f"En post i {FEILINNFOERINGER} har ikke nøyaktig én `id`:\n{tekst}")
            poster.append((ider[0], tekst))
            linjer = []
    if "".join(linjer).strip():
        raise Stopp(f"Lista i {FEILINNFOERINGER} slutter ikke med `  }},`:\n{''.join(linjer)}")
    return Liste(innhold[:start], poster, innhold[slutt + 1 :])


def ny_id(gammel: str, brukt: set[str]) -> str:
    """Neste ledige ID: neste bokstav for samme issue (F2280a -> F2280b), eller én over
    det høyeste tallet for en ID med bare tall (F797 -> F815)."""
    treff = re.fullmatch(r"F(\d+)([a-z]*)", gammel)
    if not treff:
        raise Stopp(f"Feilinnføringen {gammel} kolliderer, og ID-en har ikke formen F<tall><bokstaver>.")
    if not treff.group(2):
        tall = [int(i[1:]) for i in brukt if re.fullmatch(r"F\d+", i)]
        return f"F{max(tall, default=0) + 1}"
    bokstaver = "abcdefghijklmnopqrstuvwxyz"
    for suffiks in [*bokstaver, *(a + b for a in bokstaver for b in bokstaver)]:
        if (kandidat := f"F{treff.group(1)}{suffiks}") not in brukt:
            return kandidat
    raise Stopp(f"Fant ingen ledig ID for {gammel}.")


def flett_feilinnfoeringer(forfar: str, gren: str, base: str) -> tuple[str, list[str]]:
    """Basens liste, så grenens poster som ikke finnes i forfaren. Teksten rundt lista
    flettes med `git merge-file`. Returnerer fila og omnummereringene."""
    lister = [del_liste(t) for t in (forfar, gren, base)]
    i_forfar, i_gren, i_base = (dict(liste.poster) for liste in lister)
    endret = sorted(i for i, tekst in i_forfar.items() if i_gren.get(i) != tekst)
    if endret:
        raise Stopp(
            f"Grenen endrer eller fjerner feilinnføringer som finnes i forfaren: {', '.join(endret)}. "
            "Skriptet fletter bare nye poster."
        )
    forfar_rundt, gren_rundt, base_rundt = (f"{liste.for_}{PLASSHOLDER}{liste.etter}" for liste in lister)
    rundt = flett_tekst(gren_rundt, forfar_rundt, base_rundt)
    brukt = set(i_base)
    poster = [tekst for _, tekst in lister[2].poster]
    omnummerert = []
    for id_, tekst in lister[1].poster:
        if id_ in i_forfar or i_base.get(id_) == tekst:
            continue
        if id_ in brukt:
            ny = ny_id(id_, brukt | set(i_gren))
            tekst = POST_ID.sub(f"    id: '{ny}',", tekst, count=1)
            omnummerert.append(f"{id_} -> {ny}")
            id_ = ny
        brukt.add(id_)
        poster.append(tekst)
    return rundt.replace(PLASSHOLDER, "".join(poster), 1), omnummerert


def flett_tekst(gren: str, forfar: str, base: str) -> str:
    with tempfile.TemporaryDirectory() as mappe:
        stier = []
        for navn, tekst in (("gren", gren), ("forfar", forfar), ("base", base)):
            (sti := Path(mappe) / navn).write_text(tekst)
            stier.append(str(sti))
        svar = subprocess.run(["git", "merge-file", "-p", *stier], capture_output=True, text=True, check=False)
    if svar.returncode != 0:
        raise Stopp(f"Grenen og basen endrer {FEILINNFOERINGER} utenfor lista over feilinnføringer.")
    return svar.stdout


def los_feilinnfoeringskonflikt(mappe: Path) -> list[str]:
    """Skriver den flettede feilinnføringsfila fra stegene i indeksen og returnerer
    omnummereringene. Konfliktmarkørene brukes ikke, fordi git legger hunkene midt i
    postene."""
    steg = []
    for nr in (1, 2, 3):
        svar = git(mappe, "show", f":{nr}:{FEILINNFOERINGER}", sjekk=False)
        if svar.returncode != 0:
            raise Stopp(f"{FEILINNFOERINGER} mangler på en av sidene i flettingen.")
        steg.append(svar.stdout)
    tekst, omnummerert = flett_feilinnfoeringer(*steg)
    (mappe / FEILINNFOERINGER).write_text(tekst)
    return omnummerert


def flett(mappe: Path, base: str, basenavn: str, gren: str) -> tuple[list[str], list[str]]:
    """Fletter basen inn og løser konfliktene skriptet kan løse. Returnerer filene
    som ble løst, og omnummereringene av feilinnføringer."""
    melding = f"flett {basenavn} inn i {gren}"
    svar = git(mappe, "-c", "merge.conflictStyle=merge", "merge", "--no-ff", "--no-edit", "-m", melding, base, sjekk=False)
    if svar.returncode == 0:
        return [], []
    konflikter = git(mappe, "-c", "core.quotePath=false", "diff", "--name-only", "--diff-filter=U").stdout.splitlines()
    if not konflikter:
        raise Stopp(f"git merge feilet uten konflikter:\n{svar.stdout}{svar.stderr}".strip())
    versjon_i = {fil: navn for navn, fil in VERSJONSFILER.items()}
    ulost, omnummerert, stopp = [], [], []
    for fil in konflikter:
        if fil in versjon_i:
            sti = mappe / fil
            lost = los_versjonskonflikt(sti.read_text(), versjon_i[fil]) if sti.is_file() else None
            if lost is None:
                ulost.append(fil)
                continue
            sti.write_text(lost)
        elif fil in GENERERTE:
            git(mappe, "checkout", "--theirs", "--", fil)
        elif fil == FEILINNFOERINGER:
            try:
                omnummerert = los_feilinnfoeringskonflikt(mappe)
            except Stopp as grunn:
                ulost.append(fil)
                stopp.append(str(grunn))
                continue
        else:
            ulost.append(fil)
            continue
        git(mappe, "add", "--", fil)
    if ulost:
        git(mappe, "merge", "--abort")
        raise Stopp(
            "Flettingen har konflikter skriptet ikke løser, og ingenting er endret på grenen:\n"
            + "\n".join(f"  {fil}" for fil in ulost)
            + "".join(f"\n{grunn}" for grunn in stopp)
            + "\nØkta som eier PR-en fletter for hånd."
        )
    if omnummerert:
        melding += f"\n\nOmnummererte feilinnføringer fra {gren}: " + ", ".join(omnummerert)
    git(mappe, "commit", "-q", "-m", melding)
    return konflikter, omnummerert


def skripter(mappe: Path) -> Path:
    """Vaktens skript slik de er etter flettingen, som CI kjører dem. En klon uten
    dem, som i testene, bruker skriptene ved siden av dette skriptet."""
    flettet = mappe / ".github/scripts"
    return flettet if (flettet / "regelversjon.sh").is_file() else SKRIPTER


def kreves(mappe: Path, base: str) -> set[str]:
    """Versjonene vakten krever for grenens egne endringer mot basen."""
    diff = git(
        mappe, "-c", "core.quotePath=false", "diff", "--name-status", "-M", base, "HEAD",
        "--", ":(glob)kjerne/**/*.ts", ":(exclude)kjerne/tester",
    ).stdout
    svar = subprocess.run(
        [sys.executable, str(skripter(mappe) / "flytting.py"), base], cwd=mappe, input=diff, capture_output=True, text=True, check=False,
    )
    if svar.returncode != 0:
        raise Stopp(f"flytting.py feilet:\n{svar.stderr.strip()}")
    return {linje.split("\t")[0] for linje in svar.stdout.splitlines()} & set(VERSJONSFILER)


def ok(mappe: Path, base: str, navn: str) -> str | None:
    """Øker versjonen til ett over basens tall når den ikke alt er høyere."""
    fil = VERSJONSFILER[navn]
    for_ = les_versjon(git(mappe, "show", f"{base}:{fil}", sjekk=False).stdout, navn) or 0
    sti = mappe / fil
    innhold = sti.read_text() if sti.exists() else None
    naa = les_versjon(innhold, navn)
    if naa is None:
        raise Stopp(f"Fant ikke `export const {navn} = <tall>;` i {fil}.")
    if naa > for_:
        return None
    sti.write_text(versjonslinje(navn).sub(f"export const {navn} = {for_ + 1};", innhold, count=1))
    return f"{navn} {naa} -> {for_ + 1} ({fil}, basen har {for_})"


def generer(mappe: Path) -> None:
    for kommando, _ in GENERATORER:
        if not (mappe / kommando[1]).exists():
            continue
        svar = subprocess.run(kommando, cwd=mappe, capture_output=True, text=True, check=False)
        if svar.returncode != 0:
            raise Stopp(f"{' '.join(kommando)} feilet:\n{(svar.stderr or svar.stdout).strip()}")


def vakt(mappe: Path, base: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(skripter(mappe) / "regelversjon.sh")], cwd=mappe, env={**_miljo(), "BASE": base},
        capture_output=True, text=True, check=False,
    )


def _miljo() -> dict[str, str]:
    return {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}


def oppdater(repo: Path, gren: str, basenavn: str, remote: str, lokal: bool, push: bool, mappe: Path) -> int:
    if lokal:
        grenref, baseref = gren, basenavn
    else:
        git(repo, "fetch", "-q", remote, basenavn, gren)
        grenref, baseref = f"{remote}/{gren}", f"{remote}/{basenavn}"
    base = git(repo, "rev-parse", "--verify", f"{baseref}^{{commit}}").stdout.strip()
    tupp = git(repo, "rev-parse", "--verify", f"{grenref}^{{commit}}").stdout.strip()
    if git(repo, "merge-base", "--is-ancestor", base, tupp, sjekk=False).returncode == 0:
        print(f"{gren} har alt {basenavn} ({base[:9]}). Ingenting å gjøre.")
        return 0

    git(repo, "worktree", "add", "-q", "--detach", str(mappe), tupp)
    try:
        lost, omnummerert = flett(mappe, base, basenavn, gren)
    except Stopp:
        fjern(repo, mappe)
        raise
    # Vakten fjerner kommentarene med typescript, og generatorene kan importere pakker.
    if (repo / "node_modules").is_dir():
        (mappe / "node_modules").symlink_to(repo / "node_modules")
    print(f"Flettet {basenavn} ({base[:9]}) inn i {gren} ({tupp[:9]}).")
    if lost:
        print("Løste konflikter i: " + ", ".join(lost))
    for linje in omnummerert:
        print(f"Omnummererte feilinnføringen {linje} ({FEILINNFOERINGER}).")
    try:
        ny = ok_og_kontroller(mappe, base, basenavn, ankre=FEILINNFOERINGER in lost)
    except Stopp as stopp:
        raise Stopp(f"{stopp}\nIngenting er pushet. Worktreen står igjen: {mappe}\nFjern den med {fjerning(mappe)}") from None

    if not push:
        print(f"Ikke pushet. Ny tupp {ny}, i worktreen {mappe}.\nFjern den med {fjerning(mappe)}, og kjør med --push for å pushe.")
        return 0
    git(mappe, "push", "-q", remote, f"HEAD:refs/heads/{gren}")
    fjern(repo, mappe)
    print(f"Pushet {gren}: {tupp[:9]} -> {ny}. Bruk {ny} som expectedHeadSha.")
    return 0


def ok_og_kontroller(mappe: Path, base: str, basenavn: str, ankre: bool = False) -> str:
    """Øker versjonene, skriver de genererte filene, committer og kjører vakten, og
    `--ankre` når skriptet har flettet feilinnføringslista. Returnerer den nye tuppen."""
    okninger = [linje for navn in sorted(kreves(mappe, base)) if (linje := ok(mappe, base, navn))]
    generer(mappe)
    status = ("-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=no")
    if git(mappe, *status).stdout.strip():
        git(mappe, "add", "--", *(f for f in [*VERSJONSFILER.values(), *GENERERTE] if (mappe / f).exists()))
        rest = git(mappe, *status).stdout.splitlines()
        if any(not linje.startswith(("M ", "A ")) for linje in rest):
            raise Stopp("Andre filer enn versjonsfilene og de genererte er endret:\n" + "\n".join(rest))
        tekst = "\n".join(okninger) or "Ingen versjon økt."
        git(mappe, "commit", "-q", "-m", f"øk versjonene og skriv de genererte filene etter fletting med {basenavn}\n\n{tekst}")
        if not okninger:
            print("Skrev de genererte filene på nytt.")
    for linje in okninger:
        print("Økte " + linje)

    kontroll = vakt(mappe, base)
    print(kontroll.stdout.rstrip())
    if kontroll.returncode != 0:
        print(kontroll.stderr.rstrip(), file=sys.stderr)
        raise Stopp(f"Regelversjonsvakten feiler mot {basenavn}.")
    if ankre:
        svar = subprocess.run(ANKRE, cwd=mappe, env=_miljo(), capture_output=True, text=True, check=False)
        if svar.returncode != 0:
            raise Stopp(f"{' '.join(ANKRE)} feiler etter flettingen:\n{(svar.stderr or svar.stdout).strip()}")
        print(svar.stdout.rstrip())
    return git(mappe, "rev-parse", "HEAD").stdout.strip()


def fjerning(mappe: Path) -> str:
    return f"git worktree remove --force {mappe}"


def fjern(repo: Path, mappe: Path) -> None:
    git(repo, "worktree", "remove", "--force", str(mappe), sjekk=False)


def main(argv: list[str] | None = None) -> int:
    tolker = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    tolker.add_argument("gren", help="grenen til PR-en")
    tolker.add_argument("--base", default="main")
    tolker.add_argument("--remote", default="origin")
    tolker.add_argument("--lokal", action="store_true", help="bruk lokale refer, uten git fetch")
    tolker.add_argument("--push", action="store_true", help="push resultatet til grenen")
    tolker.add_argument("--mappe", type=Path, help="worktreen (standard: en ny mappe i tmp)")
    valg = tolker.parse_args(argv)
    repo = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").stdout.strip())
    mappe = valg.mappe or Path(tempfile.mkdtemp(prefix="oppdater-kjerne-")) / "tre"
    try:
        return oppdater(repo, valg.gren, valg.base, valg.remote, valg.lokal, valg.push, mappe)
    except Stopp as stopp:
        print(f"Stopp: {stopp}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
