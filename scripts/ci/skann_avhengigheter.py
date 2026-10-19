"""Skanner kjøretidsavhengighetene i TS etter kjente sårbarheter (#269 punkt 3).

Leser utdataene fra `npm audit --omit=dev --json` på stdin. Feiler for en
sårbarhet med alvorlighet høy eller kritisk når det finnes en rettet versjon,
med mindre advisoryen står i unntakslisten. Om det finnes en rettet versjon,
leses av advisoryens sårbare område (`range`), ikke av `fixAvailable`, som bare sier
om `npm audit fix` når en retting gjennom dagens tre (#851). Utviklingsavhengigheter og Python
skannes i egne steg som bare rapporterer (DL-U2, avgjort 17.10 i #269).

Bruk: npm audit --omit=dev --json | python3 scripts/ci/skann_avhengigheter.py [unntaksliste]
"""

import json
import pathlib
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


def har_rettet_versjon(område: str | None) -> bool:
    """Om advisoryen kan ha en rettet versjon: hvert alternativ i det sårbare området har
    en øvre grense. `*` og `>=1.0.0` har ingen. `<=1.2.3` regnes som rettet, fordi npm
    skriver et område med rettet versjon slik (`>=7.1.0 <=7.3.1` for vite, rettet i
    7.3.2); en advisory uten rettet versjon i den formen føres i unntakslisten. Mangler
    området, regnes versjonen som rettet, så funnet blokkerer."""
    if not område:
        return True
    return all("<" in del_ for del_ in område.split("||"))


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


def main(argumenter: list[str]) -> int:
    unntak = les_unntak(pathlib.Path(argumenter[0]) if argumenter else UNNTAKSLISTE)
    treff = funn(json.load(sys.stdin))
    brukt = [t for t in treff if t[:2] in unntak]
    blokkerende = [t for t in treff if t[:2] not in unntak]
    for advisory, pakke, alvorlighet, _ in brukt:
        post = unntak[(advisory, pakke)]
        print(f"UNNTAK ({post['dato']}, #{post['issue']}): {pakke} {advisory} {alvorlighet}")
    for advisory, pakke, alvorlighet, tittel in blokkerende:
        print(f"::error title=Sårbar kjøretidsavhengighet::{pakke} {advisory} ({alvorlighet}): {tittel}")
    for advisory, pakke in sorted(set(unntak) - {t[:2] for t in treff}):
        print(f"::warning title=Unntak uten treff::{advisory} i {pakke} treffer ikke lenger og kan fjernes fra listen.")
    print(f"blokkerende: {len(blokkerende)}; unntak brukt: {len(brukt)}")
    return 1 if blokkerende else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
