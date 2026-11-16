"""Skanner kjøretidsavhengighetene i TS etter kjente sårbarheter (#269 punkt 3).

Leser utdataene fra `npm audit --omit=dev --json` på stdin. Feiler for en
sårbarhet med alvorlighet høy eller kritisk når minst én linje har en rettet versjon,
med mindre advisoryen står i unntakslisten. Om det finnes en rettet versjon,
leses av advisoryens sårbare område (`range`), ikke av `fixAvailable`, som bare sier
om `npm audit fix` når en retting gjennom dagens tre (#851). Et unntak som ikke treffer en
blokkerende sårbarhet, feiler, så ubrukte unntak ikke blir liggende (#1170), med mindre rapporten
ser ufullstendig ut. Utviklingsavhengigheter og Python
skannes i egne steg som bare rapporterer (DL-U2, avgjort 17.10 i #269).

Bruk: npm audit --omit=dev --json | python3 scripts/ci/skann_avhengigheter.py [unntaksliste]
"""

import json
import pathlib
import re
import sys

import tomllib

BLOKKERER = {"high", "critical"}
UNNTAKSLISTE = pathlib.Path(__file__).with_name("avhengighetsunntak.toml")
FELT = ("advisory", "pakke", "dato", "issue", "begrunnelse")


def les_unntak(sti: pathlib.Path) -> dict[tuple[str, str], dict]:
    """Unntakene etter (advisory, pakke). En post slipper bare advisoryen i sin egen pakke."""
    unntak = {}
    for post in tomllib.loads(sti.read_text(encoding="utf-8")).get("unntak", []):
        mangler = [f for f in FELT if not post.get(f)]
        if mangler:
            raise ValueError(f"Unntaket {post.get('advisory', '?')} mangler {', '.join(mangler)}.")
        nøkkel = (post["advisory"], post["pakke"])
        if nøkkel in unntak:
            raise ValueError(f"Unntaket {post['advisory']} for {post['pakke']} står to ganger.")
        unntak[nøkkel] = post
    return unntak


_JOKER = re.compile(r"[*xX](?:\.[*xX])*")
_GRENSE = re.compile(r"(>=|>|<=|<)v?(\d+)\.(\d+)\.(\d+)")

Versjon = tuple[int, int, int]
# (nedre, nedre er med, øvre eller None uten øvre grense, øvre er med)
Intervall = tuple[Versjon, bool, Versjon | None, bool]


def _intervall(alternativ: str) -> Intervall | None:
    """Alternativet som intervall, når det bare har jokere og grenser med hele versjoner
    (`>=1.0.0 <1.2.3`). Ellers None, også for et tomt alternativ."""
    ledd = re.sub(r"([<>]=?)\s+", r"\1", alternativ).split()
    if not ledd:
        return None
    nedre, med_nedre, øvre, med_øvre = (0, 0, 0), True, None, False
    for grense in ledd:
        if _JOKER.fullmatch(grense):
            continue
        treff = _GRENSE.fullmatch(grense)
        if not treff:
            return None
        tegn, versjon = treff[1], (int(treff[2]), int(treff[3]), int(treff[4]))
        med = tegn.endswith("=")
        if tegn.startswith(">") and (versjon, not med) > (nedre, not med_nedre):
            nedre, med_nedre = versjon, med
        elif tegn.startswith("<") and (øvre is None or (versjon, med) < (øvre, med_øvre)):
            øvre, med_øvre = versjon, med
    return nedre, med_nedre, øvre, med_øvre


def har_rettet_versjon(område: str | None) -> bool:
    """Om advisoryen har en rettet versjon på minst én linje (svar A 11.11 på spørsmål 9 i
    #1791, #925): en versjon over en sårbar versjon som ingen av alternativene i det
    sårbare området dekker. `*` og `>=1.0.0` har ingen øvre grense, og `* || <1.0.5` har
    derfor ingen rettet versjon. `<=1.2.3` regnes som rettet, fordi npm skriver et område
    med rettet versjon slik (`>=7.1.0 <=7.3.1` for vite, rettet i 7.3.2); en advisory uten
    rettet versjon i den formen føres i unntakslisten. Mangler området, eller har et
    alternativ en annen form enn jokere og grenser med hele versjoner, også et tomt
    alternativ, regnes versjonen som rettet, så funnet blokkerer."""
    if not område:
        return True
    intervaller = [_intervall(a) for a in område.split("||")]
    if any(i is None for i in intervaller):
        return True
    intervaller.sort(key=lambda i: (i[0], not i[1]))
    _, _, dekket, med = intervaller[0]
    for nedre, med_nedre, øvre, med_øvre in intervaller[1:]:
        if dekket is None:
            return False
        if nedre > dekket or (nedre == dekket and not (med or med_nedre)):
            return True
        if øvre is None or (øvre, med_øvre) > (dekket, med):
            dekket, med = øvre, med_øvre
    return dekket is not None


def funn(rapport: dict) -> list[tuple[str, str, str, str]]:
    """(advisory, pakke, alvorlighet, tittel) for hver blokkerende sårbarhet med rettet versjon."""
    if "vulnerabilities" not in rapport:
        raise ValueError(f"npm audit ga ingen rapport: {rapport.get('error', rapport)}")
    resultat = set()
    for pakke, sårbarhet in rapport["vulnerabilities"].items():
        for kilde in sårbarhet.get("via", []):
            if (
                isinstance(kilde, dict)
                and kilde.get("severity") in BLOKKERER
                and har_rettet_versjon(kilde.get("range"))
            ):
                advisory = kilde["url"].rsplit("/", 1)[-1]
                resultat.add((advisory, pakke, kilde["severity"], kilde.get("title", "")))
    return sorted(resultat)


def ufullstendig(rapport: dict) -> bool:
    """Om npm audit ga færre sårbare pakker enn sin egen oppsummering sier (#1170). Da kan en
    advisory mangle i svaret, og et unntak som ikke treffer, er ikke bevis for at det kan fjernes."""
    antall = (rapport.get("metadata") or {}).get("vulnerabilities", {}).get("total")
    return antall is not None and antall > len(rapport["vulnerabilities"])


def main(argumenter: list[str]) -> int:
    unntak = les_unntak(pathlib.Path(argumenter[0]) if argumenter else UNNTAKSLISTE)
    rapport = json.load(sys.stdin)
    treff = funn(rapport)
    brukt = [t for t in treff if t[:2] in unntak]
    blokkerende = [t for t in treff if t[:2] not in unntak]
    ubrukt = sorted(set(unntak) - {t[:2] for t in treff})
    for advisory, pakke, alvorlighet, _ in brukt:
        post = unntak[(advisory, pakke)]
        print(f"UNNTAK ({post['dato']}, #{post['issue']}): {pakke} {advisory} {alvorlighet}")
    for advisory, pakke, alvorlighet, tittel in blokkerende:
        print(f"::error title=Sårbar kjøretidsavhengighet::{pakke} {advisory} ({alvorlighet}): {tittel}")
    ufull = ufullstendig(rapport)
    if ufull and ubrukt:
        print(
            "::warning title=Ufullstendig rapport::npm audit ga færre sårbare pakker enn oppsummeringen, "
            "så ubrukte unntak feiler ikke denne gangen."
        )
    for advisory, pakke in ubrukt:
        melding = f"{advisory} i {pakke} treffer ingen blokkerende sårbarhet. Fjern posten fra avhengighetsunntak.toml."
        print(f"::{'warning' if ufull else 'error'} title=Unntak uten treff::{melding}")
    print(f"blokkerende: {len(blokkerende)}; unntak brukt: {len(brukt)}; unntak uten treff: {len(ubrukt)}")
    return 1 if blokkerende or (ubrukt and not ufull) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
