"""Oversikt over tokenforbruket i skyøktene, fra lagrede svar fra list_sessions.

Bruk: python3 oversikt.py --fra 2026-10-15 --til 2026-10-22 side1.txt side2.txt ...

Skriver bare sammendraget, så rå-svarene aldri havner i konteksten.
"""

import argparse
import collections
import json
import re
from pathlib import Path


def les_okter(stier):
    okter = {}
    har_mer = True
    for sti in stier:
        tekst = Path(sti).read_text(encoding="utf-8")
        svar = json.loads(tekst[tekst.find("{") : tekst.rfind("}") + 1])
        svar = svar.get("ccr", svar)
        har_mer = svar.get("has_more", False)
        for okt in svar["data"]:
            okter[okt["id"]] = okt
    return okter, har_mer


def rolle(okt, foreldre):
    tittel = okt.get("title", "").lower()
    if okt["id"] in foreldre or re.search(r"orkestr|orchestr|planlegg", tittel):
        return "orkestrator"
    if "review" in tittel:
        return "review"
    return "bygg"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--fra", required=True, help="første dato, ÅÅÅÅ-MM-DD")
    p.add_argument("--til", required=True, help="dagen etter siste dato, ÅÅÅÅ-MM-DD")
    p.add_argument("--topp", type=int, default=10)
    p.add_argument("filer", nargs="+")
    a = p.parse_args()

    alle, har_mer = les_okter(a.filer)
    eldste = min(o["created_at"][:10] for o in alle.values())
    foreldre = {o.get("parent_session_id") for o in alle.values()}
    okter = [o for o in alle.values() if a.fra <= o["created_at"][:10] < a.til]

    def bruk(o):
        return o.get("usage") or o.get("external_metadata", {}).get("usage") or {}

    def kontekst(o):
        return (
            o.get("external_metadata", {}).get("context_usage", {}).get("used_tokens")
            or 0
        )

    print(
        f"{len(okter)} økter fra {a.fra} til {a.til} (eldste i sidene: {eldste}, has_more: {har_mer})"
    )
    if eldste >= a.fra and har_mer:
        print("ADVARSEL: sidene når ikke tilbake til --fra; hent flere sider")
    uten = [o for o in okter if not bruk(o)]
    if uten:
        print(f"{len(uten)} økter uten usage")
    print(f"sum USD {sum(bruk(o).get('cost_usd') or 0 for o in okter):.0f}")

    per_dag = collections.defaultdict(lambda: [0, 0.0])
    per_rolle = collections.defaultdict(lambda: [0, 0.0, 0])
    for o in okter:
        k = bruk(o).get("cost_usd") or 0
        per_dag[o["created_at"][:10]][0] += 1
        per_dag[o["created_at"][:10]][1] += k
        r = per_rolle[rolle(o, foreldre)]
        r[0] += 1
        r[1] += k
        r[2] += bruk(o).get("cache_read_tokens") or 0
    print("\nper dag:")
    for dag, (n, k) in sorted(per_dag.items()):
        print(f"  {dag}  {n:3} økter  {k:6.0f} USD")
    print("\nper rolle:")
    for navn, (n, k, cr) in sorted(per_rolle.items(), key=lambda x: -x[1][1]):
        print(
            f"  {navn:12} {n:3} økter  {k:6.0f} USD  snitt {k / n:5.1f}  cache_read {cr / 1e6:6.0f}M"
        )

    over = {
        g: sum(1 for o in okter if kontekst(o) > g) for g in (150_000, 300_000, 500_000)
    }
    print(
        "\nkontekst ved slutt over grensene: "
        + ", ".join(f">{g // 1000}k: {n}" for g, n in over.items())
    )

    print(f"\nde {a.topp} dyreste:")
    for o in sorted(okter, key=lambda o: -(bruk(o).get("cost_usd") or 0))[: a.topp]:
        b = bruk(o)
        print(
            f"  {b.get('cost_usd') or 0:6.1f} USD  kontekst {kontekst(o):>7}  "
            f"cache_read {(b.get('cache_read_tokens') or 0) / 1e6:5.1f}M  "
            f"{rolle(o, foreldre):11}  {o['id']}  {o.get('title', '')[:60]}"
        )


if __name__ == "__main__":
    main()
