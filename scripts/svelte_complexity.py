#!/usr/bin/env python3
"""
Syklomatisk kompleksitet per fil og per funksjon i SvelteKit-frontenden.

Måler beslutningspunkter (DD) i:
  - <script>-blokker: if, else if, for, while, switch case, ternary (?),
    logical operators (&&, ||, ??), catch, optional chaining (?.)
  - Svelte-templater: {#if}, {:else if}, {#each}, {#await}, {:catch}

Syklomatisk kompleksitet CC = 1 + antall beslutningspunkter.
Beregnes både per fil (samlet) og per funksjon (function, arrow, metode).
Svelte-template behandles som én logisk enhet (<template>).

Bruk:
  python scripts/svelte_complexity.py                 # alle filer
  python scripts/svelte_complexity.py --functions      # vis per-funksjon CC
  python scripts/svelte_complexity.py --threshold 10   # bare filer over grensen
  python scripts/svelte_complexity.py --json           # JSON-output
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).parent.parent
FRONTEND_SRC = ROOT / "src" / "frontend" / "src"

# ── Beslutningspunkter i JS/TS-kode ─────────────────────────────────────────

# Keyword-baserte: if, else if, for, while, switch case, catch, ternary ?
# Teller IKKE bare "else" (ikke et eget beslutningspunkt i standard CC)
JS_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("if",          re.compile(r'\bif\s*\(')),
    ("else if",     re.compile(r'\belse\s+if\s*\(')),
    ("for",         re.compile(r'\bfor\s*\(')),
    ("while",       re.compile(r'\bwhile\s*\(')),
    ("case",        re.compile(r'\bcase\s+.+:')),
    ("catch",       re.compile(r'\bcatch\s*[(\s]')),
    ("ternary",     re.compile(r'(?<![!<>=?])(?<!\?)(\?(?!\?))(?!=)')),  # ? men ikke ?? eller ?.
    ("&&",          re.compile(r'&&')),
    ("||",          re.compile(r'\|\|')),
    ("??",          re.compile(r'\?\?')),
]

# ── Svelte-template beslutningspunkter ──────────────────────────────────────

SVELTE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("{#if}",       re.compile(r'\{#if\b')),
    ("{:else if}",  re.compile(r'\{:else\s+if\b')),
    ("{#each}",     re.compile(r'\{#each\b')),
    ("{#await}",    re.compile(r'\{#await\b')),
    ("{:catch}",    re.compile(r'\{:catch\b')),
]


def _rating(cc: int) -> str:
    if cc <= 5:
        return "lav"
    if cc <= 10:
        return "moderat"
    if cc <= 20:
        return "høy"
    return "kritisk"


@dataclass
class FunctionResult:
    name: str
    line: int
    cc: int
    breakdown: dict[str, int] = field(default_factory=dict)

    @property
    def rating(self) -> str:
        return _rating(self.cc)


@dataclass
class FileResult:
    path: Path
    cc: int
    breakdown: dict[str, int] = field(default_factory=dict)
    lines: int = 0
    functions: list[FunctionResult] = field(default_factory=list)

    @property
    def relative_path(self) -> str:
        try:
            return str(self.path.relative_to(ROOT))
        except ValueError:
            return str(self.path)

    @property
    def rating(self) -> str:
        return _rating(self.cc)



def strip_comments(code: str) -> str:
    """Fjern linje- og blokk-kommentarer fra JS/TS-kode."""
    # Blokk-kommentarer
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    # Linje-kommentarer
    code = re.sub(r'//[^\n]*', '', code)
    return code


def strip_strings(code: str) -> str:
    """Fjern string-literals for å unngå falske treff."""
    # Template literals (grov tilnærming — ikke nøstet)
    code = re.sub(r'`[^`]*`', '""', code, flags=re.DOTALL)
    # Doble og enkle anførsels­tegn
    code = re.sub(r'"(?:[^"\\]|\\.)*"', '""', code)
    code = re.sub(r"'(?:[^'\\]|\\.)*'", "''", code)
    return code


def extract_script_blocks(svelte_src: str) -> str:
    """Hent ut innholdet i alle <script>-blokker fra en .svelte-fil."""
    blocks = re.findall(r'<script[^>]*>(.*?)</script>', svelte_src, flags=re.DOTALL)
    return '\n'.join(blocks)


def extract_template(svelte_src: str) -> str:
    """Fjern <script>- og <style>-blokker og returner ren template."""
    src = re.sub(r'<script[^>]*>.*?</script>', '', svelte_src, flags=re.DOTALL)
    src = re.sub(r'<style[^>]*>.*?</style>', '', src, flags=re.DOTALL)
    return src


def count_patterns(text: str, patterns: list[tuple[str, re.Pattern]]) -> dict[str, int]:
    return {name: len(pat.findall(text)) for name, pat in patterns}


# ── Funksjonsgrense-parsing ──────────────────────────────────────────────────

# Patterns som fanger starten av en funksjon og dens navn.
# Group 1 = funksjonsnavnet.
_FUNC_PATTERNS = [
    # function name(  /  async function name(  /  export function name(
    re.compile(r'(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+(\w+)\s*\('),
    # const/let/var name = (...) =>  /  = function(
    re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>'),
    re.compile(r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\('),
    # Class methods: name(  with optional modifiers (async/static/get/set/#)
    # Ekskluder JS-nøkkelord som if/for/while/switch/catch
    re.compile(r'^\s+(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?#?(?!if|for|while|switch|catch|return|throw|new|delete|typeof|void\b)(\w+)\s*\([^)]*\)\s*\{', re.MULTILINE),
]


def _find_brace_block(code: str, start: int) -> int | None:
    """Finn slutten av brace-blokken som starter ved (eller etter) `start`.

    Returnerer indeksen etter den avsluttende }. Håndterer nøstede blokker
    og hopper over strenger, template-literal-interpolasjoner og kommentarer.
    Regex-literals som inneholder { } kan gi feil — krever full AST å løse.
    """
    i = code.find('{', start)
    if i == -1:
        return None
    depth = 0
    n = len(code)
    # Stack for template literal nesting: True = inside `...` body, False = inside ${...}
    tpl_stack: list[bool] = []
    while i < n:
        ch = code[i]

        # Inside a template literal body — look for ` (end) or ${ (interpolation)
        if tpl_stack and tpl_stack[-1]:
            if ch == '\\':
                i += 2
                continue
            if ch == '`':
                tpl_stack.pop()
                i += 1
                continue
            if ch == '$' and i + 1 < n and code[i + 1] == '{':
                tpl_stack.append(False)  # enter interpolation
                i += 2
                continue
            i += 1
            continue

        # Regular string literals (single/double quotes)
        if ch in ('"', "'"):
            quote = ch
            i += 1
            while i < n and code[i] != quote:
                if code[i] == '\\':
                    i += 1
                i += 1
            i += 1  # skip closing quote
            continue

        # Template literal start
        if ch == '`':
            tpl_stack.append(True)
            i += 1
            continue

        # Comments
        if ch == '/' and i + 1 < n:
            if code[i + 1] == '/':
                nl = code.find('\n', i)
                i = nl + 1 if nl != -1 else n
                continue
            if code[i + 1] == '*':
                end = code.find('*/', i + 2)
                i = end + 2 if end != -1 else n
                continue

        # Braces — only count when not inside a template interpolation
        if ch == '{':
            depth += 1
        elif ch == '}':
            # If we're inside a ${...} interpolation, close it instead of decrementing depth
            if tpl_stack and not tpl_stack[-1]:
                tpl_stack.pop()
                i += 1
                continue
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None


@dataclass
class _FuncSpan:
    name: str
    line: int
    body: str


def extract_functions(code: str) -> list[_FuncSpan]:
    """Finn funksjoner i JS/TS-kode og returner navn, linjenummer og kropp."""
    # Samle alle treff med posisjon
    hits: list[tuple[int, str]] = []
    for pat in _FUNC_PATTERNS:
        for m in pat.finditer(code):
            hits.append((m.start(), m.group(1)))

    # Sorter etter posisjon, fjern duplikater (samme posisjon)
    hits.sort(key=lambda h: h[0])
    seen_pos: set[int] = set()
    unique: list[tuple[int, str]] = []
    for pos, name in hits:
        if pos not in seen_pos:
            seen_pos.add(pos)
            unique.append((pos, name))

    result: list[_FuncSpan] = []
    for pos, name in unique:
        end = _find_brace_block(code, pos)
        if end is None:
            continue
        body_start = code.find('{', pos)
        body = code[body_start:end]
        line = code[:pos].count('\n') + 1
        result.append(_FuncSpan(name=name, line=line, body=body))

    return result


def analyse_functions(code: str, patterns: list[tuple[str, re.Pattern]]) -> list[FunctionResult]:
    """Beregn CC per funksjon i koden."""
    spans = extract_functions(code)
    results: list[FunctionResult] = []
    for span in spans:
        clean = strip_strings(strip_comments(span.body))
        breakdown = count_patterns(clean, patterns)
        decisions = sum(breakdown.values())
        cc = 1 + decisions
        results.append(FunctionResult(
            name=span.name,
            line=span.line,
            cc=cc,
            breakdown=breakdown,
        ))
    return results


def analyse_svelte(path: Path) -> FileResult:
    src = path.read_text(encoding='utf-8')
    lines = src.count('\n') + 1

    # Script-blokker
    script = extract_script_blocks(src)
    script_clean = strip_strings(strip_comments(script))
    js_counts = count_patterns(script_clean, JS_PATTERNS)

    # Per-funksjon CC i script-blokker
    func_results = analyse_functions(script, JS_PATTERNS)

    # Template som én logisk enhet
    template = extract_template(src)
    tpl_counts = count_patterns(template, SVELTE_PATTERNS)
    tpl_decisions = sum(tpl_counts.values())
    if tpl_decisions > 0:
        func_results.append(FunctionResult(
            name="<template>",
            line=0,
            cc=1 + tpl_decisions,
            breakdown=tpl_counts,
        ))

    breakdown = {**js_counts, **tpl_counts}
    total_decisions = sum(breakdown.values())
    cc = 1 + total_decisions

    return FileResult(path=path, cc=cc, breakdown=breakdown, lines=lines, functions=func_results)


def analyse_ts(path: Path) -> FileResult:
    src = path.read_text(encoding='utf-8')
    lines = src.count('\n') + 1

    clean = strip_strings(strip_comments(src))
    breakdown = count_patterns(clean, JS_PATTERNS)

    # Per-funksjon CC
    func_results = analyse_functions(src, JS_PATTERNS)

    total_decisions = sum(breakdown.values())
    cc = 1 + total_decisions

    return FileResult(path=path, cc=cc, breakdown=breakdown, lines=lines, functions=func_results)


def analyse_file(path: Path) -> FileResult:
    if path.suffix == '.svelte':
        return analyse_svelte(path)
    return analyse_ts(path)


RATING_COLOR = {
    "lav":      "\033[32m",   # grønn
    "moderat":  "\033[33m",   # gul
    "høy":      "\033[91m",   # oransje/rød
    "kritisk":  "\033[31m",   # rød
}
RESET = "\033[0m"


def print_table(results: list[FileResult], show_breakdown: bool = False,
                 show_functions: bool = False) -> None:
    # Sorter høyest CC først
    results = sorted(results, key=lambda r: r.cc, reverse=True)

    col_path = max(len(r.relative_path) for r in results) + 2
    col_path = max(col_path, 40)

    header = f"{'Fil':<{col_path}}  {'CC':>4}  {'Linjer':>6}  Vurdering"
    print(header)
    print("─" * len(header))

    for r in results:
        color = RATING_COLOR.get(r.rating, "")
        cc_str = f"{r.cc:>4}"
        print(f"{r.relative_path:<{col_path}}  {color}{cc_str}{RESET}  {r.lines:>6}  {color}{r.rating}{RESET}")
        if show_breakdown:
            non_zero = {k: v for k, v in r.breakdown.items() if v > 0}
            if non_zero:
                detail = "  ".join(f"{k}={v}" for k, v in sorted(non_zero.items(), key=lambda x: -x[1]))
                print(f"  {'':>{col_path}}  └─ {detail}")
        if show_functions and r.functions:
            funcs = sorted(r.functions, key=lambda f: f.cc, reverse=True)
            for fn in funcs:
                fn_color = RATING_COLOR.get(fn.rating, "")
                fn_label = f"  ƒ {fn.name}() L{fn.line}"
                print(f"{fn_label:<{col_path}}  {fn_color}{fn.cc:>4}{RESET}")

    print()
    avg_cc = sum(r.cc for r in results) / len(results) if results else 0
    max_cc = max(r.cc for r in results) if results else 0

    # Funksjonsstatistikk
    all_funcs = [f for r in results for f in r.functions]
    if all_funcs:
        max_fn = max(all_funcs, key=lambda f: f.cc)
        avg_fn_cc = sum(f.cc for f in all_funcs) / len(all_funcs)
        fn_stats = f"  |  Funksjoner: {len(all_funcs)}  |  Snitt fn-CC: {avg_fn_cc:.1f}  |  Maks fn-CC: {max_fn.cc} ({max_fn.name})"
    else:
        fn_stats = ""

    print(f"Filer analysert: {len(results)}  |  Gjennomsnitt CC: {avg_cc:.1f}  |  Maks CC: {max_cc}{fn_stats}")
    print()
    print("Skala:  lav ≤5  |  moderat ≤10  |  høy ≤20  |  kritisk >20")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Mål syklomatisk kompleksitet i SvelteKit-frontend."
    )
    parser.add_argument(
        "--threshold", type=int, default=0,
        help="Vis kun filer med CC over denne grensen (default: vis alle)"
    )
    parser.add_argument(
        "--breakdown", action="store_true",
        help="Vis detaljert fordeling av beslutningspunkter per fil"
    )
    parser.add_argument(
        "--functions", action="store_true",
        help="Vis syklomatisk kompleksitet per funksjon"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Skriv ut som JSON"
    )
    parser.add_argument(
        "--src", type=Path, default=FRONTEND_SRC,
        help=f"Kildemappe (default: {FRONTEND_SRC})"
    )
    args = parser.parse_args()

    if not args.src.exists():
        print(f"Feil: Mappen {args.src} finnes ikke.", file=sys.stderr)
        sys.exit(1)

    files = sorted(
        list(args.src.rglob("*.svelte")) + list(args.src.rglob("*.ts"))
    )

    results = [analyse_file(f) for f in files]

    if args.threshold:
        results = [r for r in results if r.cc > args.threshold]

    if not results:
        print("Ingen filer matchet kriteriene.")
        return

    if args.json:
        output = [
            {
                "fil": r.relative_path,
                "cc": r.cc,
                "linjer": r.lines,
                "vurdering": r.rating,
                "beslutningspunkter": r.breakdown,
                "funksjoner": [
                    {
                        "navn": f.name,
                        "linje": f.line,
                        "cc": f.cc,
                        "vurdering": f.rating,
                        "beslutningspunkter": {k: v for k, v in f.breakdown.items() if v > 0},
                    }
                    for f in sorted(r.functions, key=lambda f: f.cc, reverse=True)
                ],
            }
            for r in sorted(results, key=lambda r: r.cc, reverse=True)
        ]
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print_table(results, show_breakdown=args.breakdown, show_functions=args.functions)


if __name__ == "__main__":
    main()