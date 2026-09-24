"""Kjør reviewet i en kastbar kopi av HEAD, mot eksplisitt lokal testbase."""

import argparse
import io
import json
import os
import runpy
import shutil
import subprocess
import sys
import tarfile
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

import psycopg
from psycopg.conninfo import conninfo_to_dict

VEDLEGG = Path(__file__).resolve().parent
ROT = VEDLEGG.parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mutasjoner", action="store_true")
    parser.add_argument("--resultater", type=Path, required=True)
    args = parser.parse_args()
    url = os.environ["KOE_TESTBASE_URL"]
    if conninfo_to_dict(url).get("host") not in ("localhost", "127.0.0.1", "::1"):
        raise SystemExit("Reviewet krever en lokal testbase")
    with psycopg.connect(url, autocommit=True) as conn:
        assert conn.info.server_version // 10000 == 17
        assert conn.execute(
            "SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname=current_database()"
        ).fetchone() == ("koe-kastbar-testbase",)

    args.resultater.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, RUN_LIVE_SUPABASE="0", PYTHONDONTWRITEBYTECODE="1")
    env.pop("PYTHONPATH", None)
    sammendrag = []
    with tempfile.TemporaryDirectory(prefix="koe-review-kopi-") as katalog:
        kopi = Path(katalog)
        arkiv = subprocess.check_output(["git", "archive", "HEAD", "backend"], cwd=ROT)
        with tarfile.open(fileobj=io.BytesIO(arkiv)) as tar:
            tar.extractall(kopi, filter="data")
        for navn in ("test_review.py", "test_fixture_avbrudd.py"):
            shutil.copyfile(VEDLEGG / navn, kopi / "backend/tests/test_database" / navn)
        sys.path.insert(0, str(kopi / "backend"))
        from tests.test_database.conftest import _rydd, les_frodata

        frodata = les_frodata(url)

        def kjor(navn, uttrykk="", review=False, fixture=False):
            junit = (args.resultater / f"{navn}.xml").resolve()
            kommando = [
                sys.executable,
                "-B",
                "-m",
                "pytest",
                "-q",
                "-p",
                "no:cacheprovider",
                "--junitxml",
                str(junit),
            ]
            if fixture:
                kommando += ["tests/test_database/test_fixture_avbrudd.py"]
            elif review:
                kommando += ["tests/test_database/test_review.py"]
            else:
                kommando += [
                    "tests/test_database/test_kjerne.py",
                    "tests/test_database/test_skrivbar_fixture.py",
                    "tests/test_database/test_katalog.py",
                ]
            if uttrykk:
                kommando += ["-k", uttrykk]
            med_logg = args.resultater / f"{navn}.log"
            with med_logg.open("w") as logg:
                svar = subprocess.run(
                    kommando,
                    cwd=kopi / "backend",
                    env=env,
                    stdout=logg,
                    stderr=subprocess.STDOUT,
                    timeout=90,
                    check=False,
                )
            rot = ET.parse(junit).getroot()
            feil = [
                t.attrib["name"]
                for t in rot.iter("testcase")
                if t.find("failure") is not None
            ]
            oppsett = [
                t.attrib["name"]
                for t in rot.iter("testcase")
                if t.find("error") is not None
            ]
            rad = {
                "navn": navn,
                "returkode": svar.returncode,
                "tester": len(list(rot.iter("testcase"))),
                "feil": feil,
                "oppsettsfeil": oppsett,
            }
            sammendrag.append(rad)
            print(json.dumps(rad, ensure_ascii=False), flush=True)
            return svar.returncode

        assert kjor("original") == 0
        assert kjor("review", review=True) == 0
        assert kjor("fixture-avbrudd", fixture=True) == 1
        assert sammendrag[-1]["feil"] == ["test_01_skriv_og_feil"]
        if args.mutasjoner:
            originale = runpy.run_path(
                str(ROT / "docs/vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py")
            )["MUTASJONER"]
            nye = [
                (
                    "RM01 reset overser krav",
                    "backend/lib/db/database.py",
                    "return rad == (True, True)",
                    "return rad[0]",
                    "",
                ),
                (
                    "RM02 reset overser rolle",
                    "backend/lib/db/database.py",
                    "return rad == (True, True)",
                    "return rad[1]",
                    "",
                ),
                (
                    "MC01 sesjonsnivaa uten reset",
                    "backend/lib/db/database.py",
                    'sql.SQL("SET LOCAL ROLE {}")',
                    'sql.SQL("SET ROLE {}")',
                    "test_kontekst_lekker_ikke",
                    (
                        '"SELECT set_config(%s, %s, true)"',
                        '"SELECT set_config(%s, %s, false)"',
                    ),
                    ("        reset=_sjekk_ved_retur,\n", ""),
                ),
            ]
            for navn, fil, gammel, ny, uttrykk, *ekstra in originale + nye:
                sti = kopi / fil
                original = sti.read_text()
                endret = original
                for fra, til in [(gammel, ny), *ekstra]:
                    assert fra in endret, navn
                    endret = endret.replace(fra, til, 1)
                try:
                    sti.write_text(endret)
                    kode = kjor(navn.split()[0], uttrykk)
                    assert kode == (0 if navn.startswith("RM") else 1), navn
                    if navn.startswith("RM"):
                        assert (
                            kjor(
                                navn.split()[0] + "-review",
                                "reset_kontrollerer",
                                review=True,
                            )
                            == 1
                        )
                    if navn.startswith("MC"):
                        assert (
                            kjor(
                                "MC01-neste", "neste_transaksjon_stempler", review=True
                            )
                            == 0
                        )
                finally:
                    sti.write_text(original)
                    _rydd(url, frodata)
    (args.resultater / "sammendrag.json").write_text(
        json.dumps(sammendrag, ensure_ascii=False, indent=2) + "\n"
    )
    if any(r["oppsettsfeil"] for r in sammendrag):
        raise SystemExit("Oppsettsfeil må undersøkes; de er ikke drepte mutasjoner")


if __name__ == "__main__":
    main()
