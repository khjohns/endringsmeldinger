"""Regelmodulen skal ikke avhenge av Flask eller lagring (B-13, designnotatet avsnitt 6, punkt 1)."""

import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]


def test_regelmodulen_laster_verken_flask_eller_lagring():
    kode = (
        "import sys, regler.vederlag, regler.grunnlag, regler.frist; "
        "forbudt = ('flask', 'repositories', 'services', 'routes', 'lib', 'core', 'supabase', 'psycopg'); "
        "print(sorted({m.split('.')[0] for m in sys.modules} & set(forbudt)))"
    )
    ut = subprocess.run(
        [sys.executable, "-c", kode], cwd=BACKEND, capture_output=True, text=True, check=True
    )
    assert ut.stdout.strip() == "[]"
