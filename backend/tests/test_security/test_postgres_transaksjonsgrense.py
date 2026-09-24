"""RK-04: bare kjernen eier transaksjonsgrensen og databasekonteksten.

Tekstvakt for statisk SQL, ikke et vern mot dynamisk sammensatte kommandoer.
"""

import ast
import re
from pathlib import Path

import pytest

LAGRE = Path(__file__).resolve().parents[2] / "repositories" / "postgres"
SQL_KOMMENTAR_ELLER_VERDI = re.compile(r"'(?:''|[^'])*'|--[^\n]*|/\*.*?\*/", re.S)
FORBUDT = re.compile(
    r"\b(?:BEGIN|COMMIT|ROLLBACK|SET\s+(?:(?:LOCAL|SESSION)\s+)?ROLE|set_config)\b",
    re.I,
)


def _sql_tekster(fil):
    tekst = fil.read_text(encoding="utf-8")
    if fil.suffix == ".sql":
        return [(1, tekst)]
    tre = ast.parse(tekst, filename=str(fil))
    docstrings = set()
    for node in ast.walk(tre):
        if isinstance(node, ast.Module | ast.ClassDef | ast.FunctionDef | ast.AsyncFunctionDef):
            if node.body and isinstance(node.body[0], ast.Expr):
                verdi = node.body[0].value
                if isinstance(verdi, ast.Constant) and isinstance(verdi.value, str):
                    docstrings.add(verdi)
    return [
        (node.lineno, node.value)
        for node in ast.walk(tre)
        if isinstance(node, ast.Constant)
        and isinstance(node.value, str)
        and node not in docstrings
    ]


def _brudd_i(katalog):
    brudd = []
    for fil in sorted(katalog.rglob("*")):
        if fil.suffix not in {".py", ".sql"}:
            continue
        for linje, tekst in _sql_tekster(fil):
            sql = SQL_KOMMENTAR_ELLER_VERDI.sub(" ", tekst)
            for treff in FORBUDT.finditer(sql):
                brudd.append(f"{fil.relative_to(katalog)}:{linje}: {treff.group()}")
    return brudd


def test_postgres_lagre_styrer_ikke_transaksjon_eller_kontekst():
    assert LAGRE.is_dir()
    brudd = _brudd_i(LAGRE)
    assert not brudd, "SQL som bare kjernen skal sende:\n" + "\n".join(brudd)


@pytest.mark.parametrize(
    "sql",
    ["BEGIN", "commit", "RoLlBaCk", "SET ROLE koe", "SET LOCAL ROLE koe",
     "SET/*skille*/ROLE koe", "SELECT pg_catalog.set_config('koe.krav', '{}', true)"],
)
@pytest.mark.parametrize("filnavn", ["lager.py", "sporring.sql"])
def test_tekstvakt_fanger_forbudt_sql(tmp_path, sql, filnavn):
    innhold = f"conn.execute({sql!r})\n" if filnavn.endswith(".py") else sql
    (tmp_path / filnavn).write_text(innhold, encoding="utf-8")
    assert _brudd_i(tmp_path)


def test_tekstvakt_tillater_omtale_og_sql_verdier(tmp_path):
    (tmp_path / "lager.py").write_text(
        '\"\"\"Ikke send COMMIT eller SET ROLE.\"\"\"\n'
        '# BEGIN, ROLLBACK og set_config tilhører kjernen.\n'
        'conn.execute("SELECT \'COMMIT\', \'BEGIN\' /* ROLLBACK */ -- SET ROLE")\n',
        encoding="utf-8",
    )
    assert _brudd_i(tmp_path) == []
