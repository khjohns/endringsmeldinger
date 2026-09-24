"""RK-04: bare kjernen eier transaksjonsgrensen og databasekonteksten.

Statisk vakt for SQL og Python-kall, ikke et vern mot dynamisk kode.
"""

import ast
import re
from pathlib import Path

import pytest

LAGRE = Path(__file__).resolve().parents[2] / "repositories" / "postgres"
SQL_KOMMENTAR_ELLER_VERDI = re.compile(r"'(?:''|[^'])*'|--[^\n]*|/\*.*?\*/", re.S)
FORBUDT = re.compile(
    r"\b(?:BEGIN|COMMIT|ROLLBACK|set_config)\b",
    re.I,
)
FORBUDT_KOMMANDO = re.compile(
    r"(?:\A|;)\s*(?P<kommando>"
    r"(?:END|ABORT|START\s+TRANSACTION|SAVEPOINT|RELEASE(?:\s+SAVEPOINT)?|"
    r"SET\s+(?:(?:LOCAL|SESSION)\s+)?(?:ROLE|SESSION\s+AUTHORIZATION)|"
    r"RESET\s+(?:ROLE|ALL)|DISCARD\s+ALL)\b|"
    r'SET\s+(?:(?:LOCAL|SESSION)\s+)?(?:koe\s*\.|"koe\.))',
    re.I,
)
FORBUDTE_METODER = {"commit", "rollback", "transaction", "set_autocommit"}


def _sql_tekster(tre):
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


def _python_brudd(tre):
    for node in ast.walk(tre):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr in FORBUDTE_METODER
        ):
            yield node.lineno, f".{node.func.attr}()"
        if (
            isinstance(node, ast.Attribute)
            and isinstance(node.ctx, ast.Store)
            and node.attr == "autocommit"
        ):
            yield node.lineno, ".autocommit ="


def _brudd_i(katalog):
    brudd = []
    for fil in sorted(katalog.rglob("*")):
        if fil.suffix not in {".py", ".sql"}:
            continue
        tekst = fil.read_text(encoding="utf-8")
        funn = []
        if fil.suffix == ".py":
            tre = ast.parse(tekst, filename=str(fil))
            funn.extend(_python_brudd(tre))
            sql_tekster = _sql_tekster(tre)
        else:
            sql_tekster = [(1, tekst)]
        for linje, tekst in sql_tekster:
            sql = SQL_KOMMENTAR_ELLER_VERDI.sub(" ", tekst)
            for treff in FORBUDT.finditer(sql):
                funn.append((linje, treff.group()))
            for treff in FORBUDT_KOMMANDO.finditer(sql):
                funn.append((linje, treff.group("kommando")))
        brudd.extend(
            f"{fil.relative_to(katalog)}:{linje}: {form}" for linje, form in funn
        )
    return brudd


def test_postgres_lagre_styrer_ikke_transaksjon_eller_kontekst():
    assert LAGRE.is_dir()
    brudd = _brudd_i(LAGRE)
    assert not brudd, "Transaksjons- og kontekststyring forbeholdt kjernen:\n" + "\n".join(brudd)


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


@pytest.mark.parametrize(
    ("sql", "forventet"),
    [
        ("END", "END"),
        ("abort", "abort"),
        ("START TRANSACTION", "START TRANSACTION"),
        ("SAVEPOINT forsok", "SAVEPOINT"),
        ("RELEASE SAVEPOINT forsok", "RELEASE SAVEPOINT"),
        ("SET SESSION AUTHORIZATION postgres", "SET SESSION AUTHORIZATION"),
        ("RESET ROLE", "RESET ROLE"),
        ("RESET ALL", "RESET ALL"),
        ("DISCARD ALL", "DISCARD ALL"),
        ("SET koe.krav = '{}'", "SET koe."),
        ("SET LOCAL koe.krav = '{}'", "SET LOCAL koe."),
        ('SET SESSION "koe.krav" = \'{}\'', 'SET SESSION "koe.'),
    ],
)
@pytest.mark.parametrize("filnavn", ["lager.py", "sporring.sql"])
@pytest.mark.parametrize("prefiks", ["", "SELECT 1; -- neste kommando\n"])
def test_tekstvakt_fanger_sql_aliaser(tmp_path, sql, forventet, filnavn, prefiks):
    sql = prefiks + sql
    innhold = f"conn.execute({sql!r})\n" if filnavn.endswith(".py") else sql
    (tmp_path / filnavn).write_text(innhold, encoding="utf-8")
    assert _brudd_i(tmp_path) == [f"{filnavn}:1: {forventet}"]


@pytest.mark.parametrize(
    ("kode", "forventet"),
    [
        ("conn.commit()", ".commit()"),
        ("conn.rollback()", ".rollback()"),
        ("conn.autocommit = True", ".autocommit ="),
        ("with conn.transaction():\n    pass", ".transaction()"),
        ("conn.set_autocommit(True)", ".set_autocommit()"),
    ],
)
@pytest.mark.parametrize("forbindelse", ["conn", "forbindelse", "self.db.connection"])
def test_tekstvakt_fanger_python_styring(tmp_path, kode, forventet, forbindelse):
    (tmp_path / "lager.py").write_text(kode.replace("conn", forbindelse), encoding="utf-8")
    assert _brudd_i(tmp_path) == [f"lager.py:1: {forventet}"]


def test_tekstvakt_tillater_omtale_og_sql_verdier(tmp_path):
    (tmp_path / "lager.py").write_text(
        '\"\"\"Ikke send COMMIT eller SET ROLE.\"\"\"\n'
        '# BEGIN, ROLLBACK og set_config tilhører kjernen.\n'
        'conn.execute("SELECT \'COMMIT\', \'BEGIN\' /* ROLLBACK */ -- SET ROLE")\n'
        '# conn.commit(); conn.rollback(); conn.autocommit = True; conn.transaction()\n'
        'conn.execute("SELECT CASE WHEN true THEN \'END\' ELSE \'ABORT\' END")\n'
        'conn.execute("SELECT \'START TRANSACTION\', \'SAVEPOINT\', \'RESET ROLE\'")\n'
        'conn.execute("SELECT \'DISCARD ALL\', \'SET SESSION AUTHORIZATION\', \'SET koe.krav\'")\n',
        encoding="utf-8",
    )
    assert _brudd_i(tmp_path) == []
