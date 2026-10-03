"""Kontrollen i scripts/category_drift.py skal finne kategoriene og melde ekte drift (#122)."""

import importlib.util
import re
from pathlib import Path

ROT = Path(__file__).resolve().parents[3]
TS_FIL = ROT / "src" / "lib" / "constants" / "categories.ts"
PY_FIL = ROT / "backend" / "constants" / "grunnlag_categories.py"

_spec = importlib.util.spec_from_file_location(
    "category_drift", ROT / "scripts" / "category_drift.py"
)
category_drift = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(category_drift)


def _sammenlign(ts_fil: Path) -> dict:
    return category_drift.compare_categories(
        category_drift.parse_typescript_categories(ts_fil),
        category_drift.parse_python_categories(PY_FIL),
    )


def test_frontend_og_backend_har_samme_kategorier():
    resultat = _sammenlign(TS_FIL)

    assert resultat["ts_categories_count"] == 4
    assert resultat["py_categories_count"] == 4
    assert resultat["findings"] == []


def test_manglende_hovedkategori_i_frontend_meldes(tmp_path):
    innhold = TS_FIL.read_text(encoding="utf-8")
    uten_force_majeure, antall = re.subn(
        r"\n  \{\n    kode: 'FORCE_MAJEURE'.*?\n  \},", "", innhold, flags=re.DOTALL
    )
    assert antall == 1
    kopi = tmp_path / "categories.ts"
    kopi.write_text(uten_force_majeure, encoding="utf-8")

    resultat = _sammenlign(kopi)

    assert resultat["ts_categories_count"] == 3
    assert [(f["type"], f["kode"]) for f in resultat["findings"]] == [
        ("hovedkategori_mangler", "FORCE_MAJEURE")
    ]


def test_manglende_hjemmel_i_frontend_meldes(tmp_path):
    innhold = TS_FIL.read_text(encoding="utf-8")
    uten_irreg, antall = re.subn(
        r"\n      \{\n        kode: 'IRREG'.*?\n      \},", "", innhold, flags=re.DOTALL
    )
    assert antall == 1
    kopi = tmp_path / "categories.ts"
    kopi.write_text(uten_irreg, encoding="utf-8")

    resultat = _sammenlign(kopi)

    assert [
        (f["type"], f["hovedkategori"], f["underkategori"])
        for f in resultat["findings"]
    ] == [("underkategori_mangler", "ENDRING", "IRREG")]
