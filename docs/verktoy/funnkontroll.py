"""Kontrollerer tabellen «Funn og utfall» og avvikstabellen i en PR-beskrivelse (#1951).

Kjøres fra repo-roten:

    python3 docs/verktoy/funnkontroll.py --hendelse "$GITHUB_EVENT_PATH"
    python3 docs/verktoy/funnkontroll.py --tekst beskrivelse.md --pr 1234

Utfallene skriptet godtar, er de stoppregelen for funn i leveranseskillen
(«Review og funn») tillater. En rad i «Funn og utfall» holder når utfallet er

- rettet, med en commit som finnes i repoet;
- avvist, med en begrunnelse etter ordet;
- ført videre, med en henvisning til et issue eller en kommentar som finnes. Står
  det «krav i», må henvisningen være lenken til kommentaren;
- spørsmål, når «Åpne spørsmål» i beskrivelsen har innhold, eller når utfallet
  sier at oppdragsgiver har svart, med datoen.

En rad som begynner med «Ingen funn», er ikke et funn. Overleveringen er ikke noe
utfall. En henvisning til PR-en
selv, eller til et issue PR-en lukker, er ingen føring. En rad i avvikstabellen
(brukerforlop, «Sammenligne en bygget visning») holder med et issue eller en
godkjenning fra oppdragsgiver med dato, unntatt «Ikke et designavvik».

Skriptet kontrollerer formen og at henvisningene finnes, ikke at funnet står i
issuet med nok til å rettes. Det gjør agenten `funnkontroll`, for radene
`--fort-videre` skriver ut. Issuene og kommentarene slås opp i GitHub-API-et med
`GITHUB_TOKEN`, eller i en JSON-fil med `--oppslag` ({"issues": [n, ...],
"kommentarer": {"id": n}}). Commitene slås opp med git i arbeidstreet.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field

REPO = "khjohns/endringsmeldinger"

OVERSKRIFT = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
SKILLELINJE = re.compile(r"^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")
ISSUELENKE = re.compile(
    r"https://github\.com/(?P<repo>[\w.-]+/[\w.-]+)/(?:issues|pull)/(?P<nr>\d+)(?!/commits?/)"
    r"(?:#issuecomment-(?P<kommentar>\d+))?[^\s)\]>]*"
)
COMMITLENKE = re.compile(r"https://github\.com/[\w./-]*?/commits?/([0-9a-f]{7,40})\b")
MD_LENKE = re.compile(r"\[([^\]]*)\]\(\s*<?([^)\s>]*)>?\s*\)")
KORT_HENVISNING = re.compile(r"(?<![\w/&#])#(\d+)\b")
COMMIT = re.compile(r"(?<![\w/#-])([0-9a-f]{7,40})(?![\w-])")
DATO = re.compile(
    r"(?<![\d.])(?<!punkt )(?<!pkt\. )(?<!§ )(?P<dag>\d{1,2})\.\s?(?P<mnd>\d{1,2})\b(?!\.\d)"
)
LUKKER = re.compile(
    r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+"
    r"(?:khjohns/endringsmeldinger#|https://github\.com/khjohns/endringsmeldinger/issues/|#)"
    r"(\d+)",
    re.IGNORECASE,
)
IKKE_RETTET = re.compile(
    r"ikke rettet|prøvd rettet|tilbakeført|satt tilbake|rettes\b", re.IGNORECASE
)


@dataclass
class Henvisning:
    issue: int
    kommentar: int | None = None
    repo: str = REPO

    def __str__(self) -> str:
        if self.kommentar:
            return f"#{self.issue} (kommentar {self.kommentar})"
        return f"#{self.issue}"


@dataclass
class Rad:
    tabell: str
    linje: int
    celler: list[str]
    utfall: str

    @property
    def navn(self) -> str:
        tekst = re.sub(r"\s+", " ", self.celler[0]) if self.celler else ""
        return tekst if len(tekst) <= 80 else tekst[:77] + "…"


@dataclass
class Resultat:
    feil: list[str] = field(default_factory=list)
    fort_videre: list[dict] = field(default_factory=list)


def _celler(linje: str) -> list[str]:
    linje = linje.strip()
    linje = linje.removeprefix("|")
    if linje.endswith("|") and not linje.endswith("\\|"):
        linje = linje[:-1]
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", linje)]


def _uten_kodeblokker(tekst: str) -> list[str]:
    linjer = []
    i_blokk = False
    for linje in tekst.splitlines():
        if re.match(r"^\s*(```|~~~)", linje):
            i_blokk = not i_blokk
            linjer.append("")
            continue
        linjer.append("" if i_blokk else linje)
    return linjer


def tabeller(tekst: str) -> list[tuple[str, list[str], list[tuple[int, list[str]]]]]:
    """Tabellene i teksten: overskriften de står under, hodet og radene med linjenummer."""
    linjer = _uten_kodeblokker(tekst)
    resultat = []
    overskrift = ""
    i = 0
    while i < len(linjer):
        treff = OVERSKRIFT.match(linjer[i])
        if treff:
            overskrift = treff.group(2)
        if (
            linjer[i].lstrip().startswith("|")
            and i + 1 < len(linjer)
            and SKILLELINJE.match(linjer[i + 1].strip())
        ):
            hode = _celler(linjer[i])
            rader = []
            j = i + 2
            while j < len(linjer) and linjer[j].lstrip().startswith("|"):
                rader.append((j + 1, _celler(linjer[j])))
                j += 1
            resultat.append((overskrift, hode, rader))
            i = j
            continue
        i += 1
    return resultat


def seksjon(tekst: str, navn: str) -> str | None:
    """Teksten under overskriften `navn`, fram til neste overskrift på samme nivå eller over."""
    linjer = _uten_kodeblokker(tekst)
    start = None
    nivaa = 0
    for i, linje in enumerate(linjer):
        treff = OVERSKRIFT.match(linje)
        if not treff:
            continue
        if start is not None and len(treff.group(1)) <= nivaa:
            return "\n".join(tekst.splitlines()[start:i])
        if start is None and treff.group(2).strip().lower().startswith(navn.lower()):
            start = i + 1
            nivaa = len(treff.group(1))
    if start is None:
        return None
    return "\n".join(tekst.splitlines()[start:])


def henvisninger(tekst: str) -> list[Henvisning]:
    funnet: list[Henvisning] = []

    def ta(treff: re.Match) -> None:
        kommentar = treff.group("kommentar")
        ref = Henvisning(
            int(treff.group("nr")),
            int(kommentar) if kommentar else None,
            treff.group("repo"),
        )
        if ref not in funnet:
            funnet.append(ref)

    def lenke(treff: re.Match) -> str:
        maal = ISSUELENKE.match(treff.group(2))
        if maal:
            ta(maal)
            return " "
        return treff.group(1)

    rest = MD_LENKE.sub(lenke, tekst)
    for treff in ISSUELENKE.finditer(rest):
        ta(treff)
    rest = ISSUELENKE.sub(" ", rest)
    for treff in KORT_HENVISNING.finditer(rest):
        ref = Henvisning(int(treff.group(1)))
        if ref not in funnet:
            funnet.append(ref)
    return funnet


def commits(tekst: str) -> list[str]:
    fra_lenker = COMMITLENKE.findall(tekst)
    rest = COMMITLENKE.sub(" ", tekst)
    return fra_lenker + [
        c
        for c in COMMIT.findall(rest)
        if re.search(r"\d", c) and re.search(r"[a-f]", c)
    ]


def har_dato(tekst: str) -> bool:
    return any(
        1 <= int(t["dag"]) <= 31 and 1 <= int(t["mnd"]) <= 12
        for t in DATO.finditer(tekst)
    )


def _har_innhold(seksjonstekst: str | None) -> bool:
    if seksjonstekst is None:
        return False
    tekst = re.sub(r"<!--.*?-->", "", seksjonstekst, flags=re.DOTALL).strip()
    if not tekst:
        return False
    return not re.fullmatch(
        r"(?i)[*_]*(ingen|ingen funn|ingen åpne spørsmål|–|-)[.*_]*", tekst
    )


class GitHubOppslag:
    """Issuene og kommentarene i GitHub-API-et, med `GITHUB_TOKEN`."""

    def __init__(self, token: str, repo: str = REPO):
        self.token = token
        self.repo = repo
        self._issues: dict[int, str | None] = {}
        self._kommentarer: dict[int, int | None] = {}

    def _hent(self, sti: str) -> dict | None:
        foresporsel = urllib.request.Request(
            f"https://api.github.com/repos/{self.repo}/{sti}",
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "funnkontroll",
            },
        )
        try:
            with urllib.request.urlopen(foresporsel, timeout=30) as svar:
                return json.load(svar)
        except urllib.error.HTTPError as feil:
            if feil.code in (404, 410):
                return None
            raise

    def issue(self, nr: int) -> str | None:
        """«open» eller «closed», eller None når issuet ikke finnes."""
        if nr not in self._issues:
            data = self._hent(f"issues/{nr}")
            self._issues[nr] = data["state"] if data else None
        return self._issues[nr]

    def commit(self, sha: str) -> bool:
        try:
            return self._hent(f"commits/{sha}") is not None
        except urllib.error.HTTPError as feil:
            if feil.code == 422:
                return False
            raise

    def kommentar(self, kid: int) -> int | None:
        """Issuet kommentaren står i, eller None når den ikke finnes."""
        if kid not in self._kommentarer:
            data = self._hent(f"issues/comments/{kid}")
            self._kommentarer[kid] = (
                int(data["issue_url"].rsplit("/", 1)[1]) if data else None
            )
        return self._kommentarer[kid]


class FilOppslag:
    """Issuene og kommentarene fra en JSON-fil, for prøven og testene."""

    def __init__(self, data: dict):
        self.issues = {int(n) for n in data.get("issues", [])}
        self.lukkede = {int(n) for n in data.get("lukkede", [])}
        self.kommentarer = {
            int(k): int(v) for k, v in data.get("kommentarer", {}).items()
        }
        self.commits = list(data.get("commits", []))

    def commit(self, sha: str) -> bool:
        return any(c.startswith(sha) or sha.startswith(c) for c in self.commits)

    def issue(self, nr: int) -> str | None:
        if nr in self.lukkede:
            return "closed"
        return "open" if nr in self.issues else None

    def kommentar(self, kid: int) -> int | None:
        return self.kommentarer.get(kid)


def git_commit_finnes(sha: str) -> bool:
    svar = subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}"],
        check=False,
        capture_output=True,
        text=True,
    )
    return svar.returncode == 0


def commitoppslag(oppslag, git: bool):
    """Commiten finnes i arbeidstreet eller i GitHub. En økt som har rebaset, kan vise til
    commiten før rebasen; GitHub har den fortsatt, men klonen i CI har den ikke."""
    if not git and oppslag is None:
        return None

    def finnes(sha: str) -> bool:
        return (git and git_commit_finnes(sha)) or (
            oppslag is not None and oppslag.commit(sha)
        )

    return finnes


def _rad_feil(rad: Rad, tekst: str) -> str:
    return f"linje {rad.linje}, {rad.tabell}, «{rad.navn}»: {tekst}"


def _kontroller_henvisninger(
    rad: Rad,
    refs: list[Henvisning],
    pr: int | None,
    lukkes: set[int],
    oppslag,
    resultat: Resultat,
    aapen: bool = False,
) -> list[Henvisning]:
    """Henvisningene som holder. Med `aapen` må issuet være åpent, fordi et funn som føres
    i et lukket issue, ikke blir fulgt opp."""
    gyldige = []
    for ref in refs:
        if ref.repo.lower() != REPO:
            resultat.feil.append(
                _rad_feil(rad, f"{ref} viser til et annet repo ({ref.repo})")
            )
            continue
        if pr is not None and ref.issue == pr:
            resultat.feil.append(_rad_feil(rad, f"{ref} er PR-en selv, ikke en føring"))
            continue
        if ref.issue in lukkes:
            resultat.feil.append(
                _rad_feil(
                    rad,
                    f"{ref} lukkes av PR-en, så det som er ført der, blir lukket med den",
                )
            )
            continue
        if oppslag is not None:
            if ref.kommentar:
                issue = oppslag.kommentar(ref.kommentar)
                if issue is None:
                    resultat.feil.append(
                        _rad_feil(rad, f"kommentaren i {ref} finnes ikke")
                    )
                    continue
                if issue != ref.issue:
                    resultat.feil.append(
                        _rad_feil(
                            rad,
                            f"kommentaren i {ref} står i #{issue}, ikke i #{ref.issue}",
                        )
                    )
                    continue
            else:
                tilstand = oppslag.issue(ref.issue)
                if tilstand is None:
                    resultat.feil.append(_rad_feil(rad, f"{ref} finnes ikke"))
                    continue
                if aapen and tilstand != "open":
                    resultat.feil.append(
                        _rad_feil(
                            rad, f"{ref} er lukket, så funnet blir ikke fulgt opp"
                        )
                    )
                    continue
        gyldige.append(ref)
    return gyldige


def kontroller(
    tekst: str,
    pr: int | None = None,
    oppslag=None,
    commit_finnes=git_commit_finnes,
) -> Resultat:
    """Feilene i «Funn og utfall» og avvikstabellen, og radene som er ført videre.
    `oppslag` er None når henvisningene ikke skal slås opp, og `commit_finnes` None når
    commitene ikke skal det."""
    resultat = Resultat()
    tekst = tekst.replace("\r\n", "\n")
    lukkes = {
        int(n)
        for n in LUKKER.findall(re.sub(r"<!--.*?-->", "", tekst, flags=re.DOTALL))
    }
    aapne = _har_innhold(seksjon(tekst, "Åpne spørsmål"))

    funnseksjon = seksjon(tekst, "Funn og utfall")
    alle = [(o, [_kolonnenavn(c) for c in h], r) for o, h, r in tabeller(tekst)]
    i_seksjonen = [_kolonnenavn(h[0]) for _, h, _ in tabeller(funnseksjon or "")]
    funntabeller = [
        (o, h, r)
        for o, h, r in alle
        if "utfall" in h
        and (
            h[0].startswith("funn")
            or (funnseksjon is not None and _er_i(o, funnseksjon))
        )
    ]
    if funnseksjon is not None and _har_innhold(funnseksjon):
        if not i_seksjonen:
            resultat.feil.append(
                "«Funn og utfall» har tekst, men ingen tabell med én rad per funn"
            )
        elif not any(
            _er_i(o, funnseksjon) or h[0].startswith("funn") for o, h, _ in funntabeller
        ):
            resultat.feil.append(
                "tabellen under «Funn og utfall» har ingen kolonne «Utfall»"
            )

    for overskrift, hode, rader in funntabeller:
        kolonne = hode.index("utfall")
        for linje, celler in rader:
            if not any(celler):
                continue
            utfall = celler[kolonne] if kolonne < len(celler) else ""
            rad = Rad("«Funn og utfall»", linje, celler, utfall)
            _kontroller_funnrad(
                rad, pr, lukkes, aapne, oppslag, commit_finnes, resultat
            )

    for overskrift, hode, rader in alle:
        if not hode or "utfall" in hode:
            continue
        if not (
            hode[0].startswith("avvik") or "avvik fra prototypen" in overskrift.lower()
        ):
            continue
        for linje, celler in rader:
            if not any(celler):
                continue
            rad = Rad(
                "avvikstabellen", linje, celler, celler[-1] if len(celler) > 1 else ""
            )
            _kontroller_avviksrad(rad, pr, lukkes, oppslag, commit_finnes, resultat)
    return resultat


def _kolonnenavn(celle: str) -> str:
    return celle.strip(" *_`").lower()


def _er_i(overskrift: str, seksjonstekst: str) -> bool:
    """Tabellen står i seksjonen: overskriften den står under, er seksjonen eller en
    underoverskrift i den."""
    if overskrift.lower().startswith("funn og utfall"):
        return True
    return any(
        (t := OVERSKRIFT.match(linje)) and t.group(2) == overskrift
        for linje in seksjonstekst.splitlines()
    )


FORING = re.compile(r"oppfølging|krav i|ført|issue|delvis|^\[?#\d", re.IGNORECASE)


def _kontroller_funnrad(
    rad: Rad, pr, lukkes, aapne: bool, oppslag, commit_finnes, resultat: Resultat
) -> None:
    utfall = rad.utfall
    liten = utfall.lower().lstrip("*_ ")
    if not utfall:
        resultat.feil.append(_rad_feil(rad, "utfallet mangler"))
        return
    if liten.startswith("ingen funn"):
        return

    refs = henvisninger(utfall)
    shaer = commits(utfall)
    avvist = re.match(r"avvist\b", liten)
    rettet = bool(re.search(r"\brettet\b", liten)) and not IKKE_RETTET.search(liten)
    if avvist:
        begrunnelse = re.sub(r"^avvist[\s:.,;—–-]*", "", liten).strip(" *_")
        if not begrunnelse:
            resultat.feil.append(_rad_feil(rad, "«avvist» uten begrunnelse"))
        return

    if "overlevering" in liten:
        resultat.feil.append(
            _rad_feil(
                rad,
                "overleveringen er ikke noe utfall; før funnet som krav eller i et issue",
            )
        )
        return

    godkjent = False
    if refs and (FORING.search(liten) or not (rettet and shaer)):
        gyldige = _kontroller_henvisninger(
            rad, refs, pr, lukkes, oppslag, resultat, aapen=True
        )
        if re.search(r"\bkrav i\b", liten) and not any(r.kommentar for r in refs):
            resultat.feil.append(
                _rad_feil(
                    rad, "et krav i issue skal lenke til kommentaren der kravet står"
                )
            )
            return
        if gyldige:
            resultat.fort_videre.append(
                {
                    "linje": rad.linje,
                    "funn": rad.celler[0],
                    "utfall": utfall,
                    "henvisninger": [
                        {"issue": r.issue, "kommentar": r.kommentar} for r in gyldige
                    ],
                }
            )
        if len(gyldige) < len(refs):
            return
        godkjent = True

    if rettet:
        if not shaer:
            if not godkjent:
                resultat.feil.append(_rad_feil(rad, "«rettet» uten commit"))
            return
        if commit_finnes is not None:
            mangler = [s for s in shaer if not commit_finnes(s)]
            if mangler:
                resultat.feil.append(
                    _rad_feil(rad, f"commiten {', '.join(mangler)} finnes ikke")
                )
                return
        godkjent = True

    if "spørsmål" in liten or "oppdragsgiver" in liten:
        besvart = "oppdragsgiver" in liten and har_dato(liten)
        if besvart or aapne:
            godkjent = True
        elif not godkjent:
            resultat.feil.append(
                _rad_feil(
                    rad,
                    "utfallet er et spørsmål, men «Åpne spørsmål» er tom eller mangler",
                )
            )
            return

    if not godkjent:
        resultat.feil.append(
            _rad_feil(
                rad,
                "utfallet er ikke ett stoppregelen tillater (rettet med commit, krav i issue, "
                "oppfølgingsissue, spørsmål eller avvist med begrunnelse)",
            )
        )


def _godkjent(tekst: str, *ord: str) -> bool:
    return (
        any(o in tekst for o in ord)
        and har_dato(tekst)
        and not re.search(r"legges fram|skal legges|godkjennes|venter", tekst)
    )


def _kontroller_avviksrad(
    rad: Rad, pr, lukkes, oppslag, commit_finnes, resultat: Resultat
) -> None:
    if any("ikke et designavvik" in c.lower() for c in rad.celler):
        return
    tekst = rad.utfall.lower()
    shaer = commits(tekst)
    if re.search(r"\brettet\b", tekst) and shaer:
        mangler = [s for s in shaer if commit_finnes and not commit_finnes(s)]
        if mangler:
            resultat.feil.append(
                _rad_feil(rad, f"commiten {', '.join(mangler)} finnes ikke")
            )
        return
    if _godkjent(tekst, "oppdragsgiver") or any(
        _godkjent(c.lower(), "godkjent", "godtatt", "avgjort") for c in rad.celler
    ):
        return
    refs = henvisninger(rad.utfall)
    if refs:
        _kontroller_henvisninger(rad, refs, pr, lukkes, oppslag, resultat)
        return
    resultat.feil.append(
        _rad_feil(
            rad,
            "avviket har verken et issue eller en godkjenning fra oppdragsgiver med dato "
            "i siste kolonne",
        )
    )


def _les_hendelse(sti: str) -> tuple[str, int | None]:
    with open(sti, encoding="utf-8") as f:
        hendelse = json.load(f)
    pr = hendelse.get("pull_request") or {}
    return pr.get("body") or "", pr.get("number")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    kilde = parser.add_mutually_exclusive_group(required=True)
    kilde.add_argument(
        "--hendelse", help="hendelsesfila fra GitHub Actions (GITHUB_EVENT_PATH)"
    )
    kilde.add_argument("--tekst", help="en fil med PR-beskrivelsen")
    parser.add_argument("--pr", type=int, help="PR-nummeret, når --tekst brukes")
    parser.add_argument(
        "--oppslag", help="JSON-fil med issuene og kommentarene som finnes"
    )
    parser.add_argument(
        "--uten-oppslag",
        action="store_true",
        help="slå ikke opp issuene og kommentarene",
    )
    parser.add_argument(
        "--uten-git", action="store_true", help="slå ikke opp commitene"
    )
    parser.add_argument(
        "--fort-videre",
        action="store_true",
        help="skriv radene som er ført videre, som JSON",
    )
    args = parser.parse_args(argv)

    if args.hendelse:
        tekst, pr = _les_hendelse(args.hendelse)
    else:
        with open(args.tekst, encoding="utf-8") as f:
            tekst = f.read()
        pr = args.pr

    if args.uten_oppslag:
        oppslag = None
    elif args.oppslag:
        with open(args.oppslag, encoding="utf-8") as f:
            oppslag = FilOppslag(json.load(f))
    elif os.environ.get("GITHUB_TOKEN"):
        oppslag = GitHubOppslag(os.environ["GITHUB_TOKEN"])
    else:
        print(
            "funnkontroll: GITHUB_TOKEN, --oppslag eller --uten-oppslag trengs",
            file=sys.stderr,
        )
        return 2

    try:
        resultat = kontroller(
            tekst, pr, oppslag, commitoppslag(oppslag, not args.uten_git)
        )
    except (urllib.error.URLError, TimeoutError) as feil:
        print(
            f"funnkontroll: GitHub-API-et svarte ikke ({feil}). Kjør jobben på nytt.",
            file=sys.stderr,
        )
        return 2

    if args.fort_videre:
        print(json.dumps(resultat.fort_videre, ensure_ascii=False, indent=2))
    for feil in resultat.feil:
        print(f"funnkontroll: {feil}", file=sys.stderr)
    if resultat.feil:
        print(
            f"funnkontroll: {len(resultat.feil)} feil. Utfallene står i stoppregelen for funn "
            "i leveranseskillen, «Review og funn».",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
