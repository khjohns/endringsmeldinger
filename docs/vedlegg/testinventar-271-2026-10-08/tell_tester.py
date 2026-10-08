#!/usr/bin/env python3
"""Tell og list markeringer og testtilfeller for strukturkartlegging spor D.

Avgrenset til to filer:
- backend/tests/test_services/test_strukturkartlegging_spor_d.py
- src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts

Bruker kun Python-standardbiblioteket (ast, re, pathlib, sys).

Begrensninger og former som ikke støttes av parseren:
- Dynamisk genererte tester (f.eks. pytest_generate_tests eller dynamiske generatorløkker).
- Egendefinerte hjelpedekoratører som pakker xfail/skip indirekte.
- Avanserte Vitest-konstruksjoner (f.eks. describe.each, it.concurrent, flerlinjers parametere).
- Frontend-analysen er en linjebasert tekstparser med kommentarfiltrering, ikke en full
  TypeScript-AST. Regex-treffene i frontend må derfor etterprøves manuelt mot kildekoden.
"""

import ast
import re
import sys
from pathlib import Path


def analyser_backend(py_path: Path):
    if not py_path.exists():
        print(f"Feil: Fant ikke backend-fil: {py_path}", file=sys.stderr)
        return

    with open(py_path, encoding="utf-8") as f:
        src = f.read()

    tree = ast.parse(src, filename=str(py_path))

    module_markers = []
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "pytestmark":
                    module_markers.append(ast.unparse(node))

    tester = []
    hjelpere = []

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            metoder = [m.name for m in node.body if isinstance(m, ast.FunctionDef)]
            hjelpere.append(f"Klasse {node.name} (L{node.lineno}), metoder: {metoder}")
        elif isinstance(node, ast.FunctionDef) and not node.name.startswith("test_"):
            hjelpere.append(f"Funksjon {node.name} (L{node.lineno})")
        elif isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
            markering = "ingen (standard test)"
            markering_detaljer = ""
            param_cases = 1
            is_param = False

            for dec in node.decorator_list:
                dec_src = ast.unparse(dec)
                if "xfail" in dec_src:
                    markering = "@pytest.mark.xfail"
                    markering_detaljer = dec_src
                elif "skip" in dec_src:
                    markering = "@pytest.mark.skip"
                    markering_detaljer = dec_src
                elif "parametrize" in dec_src:
                    is_param = True
                    if isinstance(dec, ast.Call) and len(dec.args) >= 2:
                        val_arg = dec.args[1]
                        if isinstance(val_arg, (ast.List, ast.Tuple)):
                            param_cases = len(val_arg.elts)

            tester.append({
                "navn": node.name,
                "linje": node.lineno,
                "markering": markering,
                "detaljer": markering_detaljer,
                "is_param": is_param,
                "cases": param_cases,
            })

    print(f"\n--- Backend: {py_path} ---")
    print(f"Modulmarkeringer: {len(module_markers)}")
    print(f"Testfunksjoner totalt: {len(tester)}")
    print(f"  - Tester med xfail: {sum(1 for t in tester if t['markering'] == '@pytest.mark.xfail')}")
    print(f"  - Tester med skip:  {sum(1 for t in tester if t['markering'] == '@pytest.mark.skip')}")
    print(f"  - Ordinære tester:  {sum(1 for t in tester if t['markering'] == 'ingen (standard test)')}")
    print(f"Parametriserte testfunksjoner: {sum(1 for t in tester if t['is_param'])}")
    print(f"Effektive testtilfeller: {sum(t['cases'] for t in tester)}")
    print(f"Testhjelpere ({len(hjelpere)}):")
    for h in hjelpere:
        print(f"  - {h}")
    print("\nTestliste:")
    for t in tester:
        param_str = f" [parametrisert: {t['cases']} tilfeller]" if t['is_param'] else ""
        print(f"  L{t['linje']:3d}: {t['navn']} -> {t['markering']}{param_str}")


def analyser_frontend(ts_path: Path):
    if not ts_path.exists():
        print(f"Feil: Fant ikke frontend-fil: {ts_path}", file=sys.stderr)
        return

    with open(ts_path, encoding="utf-8") as f:
        lines = f.readlines()

    tester = []
    hjelpere = []
    in_block_comment = False

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("/*"):
            in_block_comment = True
        if "*/" in stripped:
            in_block_comment = False
            continue
        if in_block_comment or stripped.startswith("//"):
            continue

        m_func = re.search(r"\bfunction\s+([A-Za-z0-9_]+)\s*\(", line)
        m_fails = re.search(r"\b(it|test)\.fails\s*\(\s*([`'\"])(.*?)\2", line)
        m_skip = re.search(r"\b(it|test)\.skip\s*\(\s*([`'\"])(.*?)\2", line)
        m_plain = re.search(r"\b(it|test)\s*\(\s*([`'\"])(.*?)\2", line)

        if m_func:
            hjelpere.append(f"Funksjon {m_func.group(1)} (L{i})")
        elif m_fails:
            tester.append({
                "navn": m_fails.group(3),
                "linje": i,
                "markering": f"{m_fails.group(1)}.fails",
                "is_param": False,
                "cases": 1,
            })
        elif m_skip:
            tester.append({
                "navn": m_skip.group(3),
                "linje": i,
                "markering": f"{m_skip.group(1)}.skip",
                "is_param": False,
                "cases": 1,
            })
        elif m_plain:
            tester.append({
                "navn": m_plain.group(3),
                "linje": i,
                "markering": f"{m_plain.group(1)} (standard test)",
                "is_param": False,
                "cases": 1,
            })

    print(f"\n--- Frontend: {ts_path} ---")
    print("Modulmarkeringer: 0")
    print(f"Testblokker totalt: {len(tester)}")
    print(f"  - Tester med .fails: {sum(1 for t in tester if '.fails' in t['markering'])}")
    print(f"  - Tester med .skip:  {sum(1 for t in tester if '.skip' in t['markering'])}")
    print(f"  - Ordinære tester:   {sum(1 for t in tester if 'standard' in t['markering'])}")
    print("Parametriserte testfunksjoner: 0")
    print(f"Effektive testtilfeller: {len(tester)}")
    print(f"Testhjelpere ({len(hjelpere)}):")
    for h in hjelpere:
        print(f"  - {h}")
    print("\nTestliste:")
    for t in tester:
        print(f"  L{t['linje']:3d}: '{t['navn']}' -> {t['markering']}")


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    py_rel = Path("backend/tests/test_services/test_strukturkartlegging_spor_d.py")
    ts_rel = Path("src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts")

    py_path = root / py_rel
    ts_path = root / ts_rel

    print(f"Analyserer testfiler i: {root.resolve()}")
    analyser_backend(py_path)
    analyser_frontend(ts_path)


if __name__ == "__main__":
    main()
