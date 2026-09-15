"""Mål ferske teamoppslag med eksisterende token, uten å endre tilgangsoppsett.

Kjør fra backend: venv/bin/python scripts/measure_catenda_membership.py
Dette måler Catenda-transporten, ikke hele Flask-ruten eller Supabase.
"""

import argparse
import logging
import os
import statistics
import sys
from pathlib import Path
from time import perf_counter

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

from lib.auth.catenda_oauth import CatendaOAuth
from scripts.setup_authentication import validate_token


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rounds", type=int, default=6, choices=range(1, 21))
    args = parser.parse_args()
    load_dotenv(BACKEND_ROOT / ".env")
    logging.disable(logging.CRITICAL)
    token = os.environ["CATENDA_ACCESS_TOKEN"]
    if validate_token(token) is None:
        raise RuntimeError("Forny token med scripts/setup_authentication.py")
    project = os.environ["CATENDA_PROJECT_ID"]
    oauth = CatendaOAuth("", "", "")
    teams = oauth.collection(f"/v2/projects/{project}/teams", token)
    # Prosjektets teamliste inneholder medlemsrader med teamet under `user`.
    users = [row["user"] for row in teams if row.get("user", {}).get("type") == "team"]
    standard = {"@BYGGHERRE", "@TE-(PL og PGL)"}
    selected = sorted(users, key=lambda user: user.get("name") not in standard)[:2]
    if len(selected) != 2:
        raise RuntimeError("Målingen krever to tilgjengelige team")
    print("Transportutvalg: to team; standardnavn:", sum(t.get("name") in standard for t in selected))
    print("CATENDA_CONTRACT_TEAMS konfigurert:", bool(os.getenv("CATENDA_CONTRACT_TEAMS")))
    calls = 0
    original = oauth._request

    def counted(*args, **kwargs):
        nonlocal calls
        calls += 1
        return original(*args, **kwargs)

    oauth._request = counted
    durations = []
    for index in range(args.rounds):
        before = calls
        start = perf_counter()
        sizes = [len(oauth.team_members(project, team["id"], token)) for team in selected]
        elapsed = round((perf_counter() - start) * 1000)
        durations.append(elapsed)
        print(f"Runde {index + 1}: {elapsed} ms, {calls - before} HTTP-kall, medlemstall {sizes}")
    print(f"Median {statistics.median(durations)} ms; maks {max(durations)} ms")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Ikke skriv provider-responser, URL-er, medlemsdata eller tokens.
        print(f"Målingen feilet: {type(error).__name__}", file=sys.stderr)
        raise SystemExit(1) from None
