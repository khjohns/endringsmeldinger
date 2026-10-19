"""Fixturen i tests/conftest.py som holder TS-skrivestien av i testene (#692 punkt 1)."""

import os
import pathlib
import subprocess
import sys

from core.config import settings

BACKEND = pathlib.Path(__file__).resolve().parents[2]


def test_bryteren_er_av_i_en_test():
    assert settings.ts_skrivesti is False


def test_bryteren_er_av_selv_om_miljoet_slaar_den_paa():
    """Med TS_SKRIVESTI=true i miljøet, som i backend/.env, er bryteren likevel av i testen."""
    resultat = subprocess.run(
        [
            sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider",
            f"{pathlib.Path(__file__).relative_to(BACKEND)}::test_bryteren_er_av_i_en_test",
        ],
        cwd=BACKEND, env={**os.environ, "TS_SKRIVESTI": "true"}, capture_output=True, text=True,
    )
    assert resultat.returncode == 0, resultat.stdout[-2000:] + resultat.stderr[-2000:]
